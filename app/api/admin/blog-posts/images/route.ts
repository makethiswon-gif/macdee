import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { createHash } from "node:crypto";
import { BLOG_CARD_TYPES, PROFILE_CARD_TYPES, PROFILE_SET_FORMAT, EDITORIAL_SET_FORMAT } from "@/lib/blog-images/card-types";
import { verifyImageProof } from "@/lib/blog-images/proof-selection";
import { loadStrengthLibrary, StrengthStoreError } from "@/lib/blog-strengths-store";
import { hasCompleteCardSet } from "@/lib/blog-publish-workflow";
import { verifyImageRelease, digest, loadImageProduction, retryStorage } from "@/lib/blog-images/production-store";
import { sourceHash } from "@/lib/blog-images/visual-planner";
import { resolveStudioPhotos, resolveEditorialStudioPhoto } from "@/lib/lawyer-studio/blog";
import { STUDIO_FORMAT, StudioError, StudioPhotoRequiredError } from "@/lib/lawyer-studio/types";
import { editorialStudioPhotoMissing } from "@/lib/blog-images/quality-policy";

// 브라우저에서 만든 카드 PNG를 받아 Storage에 올리고 원고에 붙인다.
// 이미지가 서버에 남아야 발행기가 집어갈 수 있다.

const BUCKET = "blog-cards";

interface IncomingImage {
    type: string;
    dataUrl: string;
    productionId?: string;
    releaseToken?: string;
    setId?: string;
}

// 요청 본문 상한(Vercel 4.5MB)을 넘지 않도록 한 장씩 받는 경로를 연다.
//
// 전에는 카드 4장의 base64 PNG 를 한 요청에 전부 담았다. 4:5 판형에
// pixelRatio 2 면 장당 1600x2000 이라 네 장이면 한계를 넘고,
// 서버가 JSON 이 아닌 "Request Entity Too Large" 를 돌려줘
// 화면에는 "Unexpected token 'R'" 이라는 엉뚱한 에러가 떴다.
//
// 한 장씩 받을 때는 기존 card_images 와 병합한다 — 덮어쓰면 앞 장이 사라진다.
export const maxDuration = 60;

export async function POST(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = (await request.json()) as {
            postId?: string;
            images?: IncomingImage[];
            image?: IncomingImage;
            index?: number;
            total?: number;
            requiredTypes?: string[];
            setFormat?: string;
        };
        const { postId, image, index, total, requiredTypes } = payload;

        // 한 장씩(image) 또는 한꺼번에(images) 둘 다 받는다
        const images = payload.images ?? (image ? [image] : []);
        const single = !payload.images && Boolean(image);

        if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });
        if (!Array.isArray(images) || images.length === 0) {
            return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });
        }
        const profileSet = Array.isArray(requiredTypes) && requiredTypes.length === PROFILE_CARD_TYPES.length
            && PROFILE_CARD_TYPES.every((type) => requiredTypes.includes(type));
        const editorialSet = payload.setFormat === EDITORIAL_SET_FORMAT;
        if (editorialSet && (!profileSet || images.some(img => !img.productionId))) return NextResponse.json({ error: "신뢰 이미지 세트는 보존된 3장 제작 작업으로 저장해주세요." }, { status: 422 });
        const format = profileSet ? { setFormat: editorialSet ? EDITORIAL_SET_FORMAT : PROFILE_SET_FORMAT } : {};
        if (requiredTypes !== undefined && !profileSet && (!Array.isArray(requiredTypes) || requiredTypes.length !== BLOG_CARD_TYPES.length
            || !BLOG_CARD_TYPES.every((type) => requiredTypes.includes(type)))) {
            return NextResponse.json({ error: "현재 구성안의 필수 이미지 종류를 확인해주세요." }, { status: 400 });
        }
        // New editors transfer only IDs. Read already-paid, signed bytes on the server.
        // Large PNGs and portraits never travel back through a Vercel request body.
        for (const img of images) if (img.productionId) {
            const saved = await loadImageProduction(img.productionId);
            if (!saved.card || saved.card.type !== img.type || saved.card.setId !== img.setId || saved.card.releaseToken !== img.releaseToken) {
                return NextResponse.json({ error: "보존된 이미지와 저장 요청이 일치하지 않습니다." }, { status: 422 });
            }
            if (editorialStudioPhotoMissing(saved.card)) throw new StudioPhotoRequiredError();
            if (saved.card.setFormat === STUDIO_FORMAT || saved.card.studioPhotos?.length === 2) await resolveStudioPhotos(saved.profileId, saved.card.studioPhotos);
            else if (saved.card.studioPhotos?.length) await resolveEditorialStudioPhoto(saved.profileId, saved.card.studioPhotos);
            if (saved.card.setFormat === EDITORIAL_SET_FORMAT) {
                if (!editorialSet) return NextResponse.json({ error: "새 3장 구성의 형식이 누락됐습니다." }, { status: 422 });
                verifyImageProof(saved.card.proofToken, saved.card.proofSelection, await loadStrengthLibrary(saved.profileId), saved.sourceHash);
            }
            img.dataUrl = saved.card.imageDataUrl;
        }
        if (images.some((img) => !/^[a-z][a-z0-9_-]*$/i.test(img.type) || !String(img.dataUrl).startsWith("data:image/png;base64,"))) {
            return NextResponse.json({ error: "유효한 PNG 이미지가 필요합니다." }, { status: 400 });
        }

        const supabase = await createAdminClient();
        const { data: row, error: readError } = await supabase.from("blog_posts").select("card_images,profile_id,title,body,updated_at").eq("id", postId).single();
        if (readError || !row) return NextResponse.json({ error: "저장된 원고를 찾지 못했습니다." }, { status: 404 });
        const hashOfSource = sourceHash(row.title || "", row.body || "");
        const saved: { type: string; url: string; releaseToken?: string; pngHash?: string; setId?: string; productionId?: string }[] = [];
        const setId = images[0].setId;
        // Validate the whole incoming set before uploading any bytes.
        if (requiredTypes && images.some((img) => !verifyImageRelease(img.releaseToken, { profileId: row.profile_id, sourceHash: hashOfSource,
            type: img.type, pngHash: digest(Buffer.from(img.dataUrl.split(",")[1], "base64")), setId: setId || "", ...format }) || img.setId !== setId)) {
            return NextResponse.json({ error: "저장 가능한 이미지가 아니거나 원고·변호사가 변경되었습니다. 현재 구성으로 다시 처리해주세요." }, { status: 422 });
        }

        const kept = single ? ((row.card_images as typeof saved | null) || []).filter(x => (!requiredTypes || (requiredTypes.includes(x.type) && x.setId === setId)) && !images.some(img => img.type === x.type)) : [];
        // Recheck retained studio provenance too, before any storage upload.
        for (const img of kept.filter(x => editorialSet && x.type === "info" && x.productionId)) {
            const prior = await loadImageProduction(img.productionId!);
            if (!prior.card || prior.card.type !== "info" || prior.profileId !== row.profile_id || prior.sourceHash !== hashOfSource
                || prior.card.releaseToken !== img.releaseToken || prior.card.setFormat !== EDITORIAL_SET_FORMAT
                || editorialStudioPhotoMissing(prior.card)) throw new StudioPhotoRequiredError();
            await resolveEditorialStudioPhoto(row.profile_id, prior.card.studioPhotos);
        }

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const base64 = String(img.dataUrl || "").split(",")[1];
            if (!base64) return NextResponse.json({ error: "빈 이미지입니다." }, { status: 400 });

            const bytes = Buffer.from(base64, "base64");
            // 한 장씩 올릴 때는 클라이언트가 준 순번을 쓴다(파일명 충돌 방지)
            const seq = single && typeof index === "number" ? index : i;
            const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
            const path = `${postId}/${String(seq + 1).padStart(2, "0")}-${img.type}-${hash}.png`;

            // 2026-09-17 운영 로그: 저장소가 빈 메시지의 일시 오류를 돌려줘 두 번째 카드만 빠진 원고가 생겼다.
            // 같은 경로·같은 바이트의 upsert 라 재시도가 안전하다. 이미 만든 이미지를 다시 생성하지 않는다.
            const { error } = await retryStorage(() => supabase.storage
                .from(BUCKET)
                .upload(path, bytes, { contentType: "image/png", upsert: true }));

            if (error) {
                console.error("[BlogCards] 업로드 실패(3회 시도):", path, error.message || "(빈 메시지)", bytes.length);
                return NextResponse.json({ error: `이미지 저장소가 일시적으로 응답하지 않았습니다. 생성된 이미지는 보존돼 있으니 '미완료 카드 재시도'만 눌러주세요.${error.message ? ` (${error.message})` : ""}` }, { status: 503 });
            }

            const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
            saved.push({ type: img.type, url: data.publicUrl, ...(requiredTypes ? { releaseToken: img.releaseToken, pngHash: digest(bytes), setId, productionId: img.productionId } : {}) });
        }

        // 한 장씩 받을 때는 기존 목록과 병합한다. 덮어쓰면 앞 장이 사라진다.
        let merged = saved;
        if (single) {
            // Old three-card uploads did not retain provenance. Rebind the second photo before completing a new upload.
            merged = [...kept.filter(x => !editorialSet || x.type !== "info" || x.productionId), ...saved];
        }

        // 다 모였을 때만 발행 대기로 올린다
        const done = requiredTypes ? hasCompleteCardSet(merged.filter((img) => verifyImageRelease(img.releaseToken, {
            profileId: row.profile_id, sourceHash: hashOfSource, type: img.type, pngHash: img.pngHash || "", setId: setId || "", ...format,
        })), requiredTypes)
            : !single || (typeof total === "number" ? merged.length >= total : true);

        let update = supabase
            .from("blog_posts")
            .update({
                card_images: merged,
                ...(done ? { status: "ready" } : requiredTypes ? { status: "draft" } : {}),
                updated_at: new Date().toISOString(),
            })
            .eq("id", postId);
        // A second tab or manuscript edit must not overwrite a newer card set.
        if (row.updated_at) update = update.eq("updated_at", row.updated_at);
        const { data: changed, error: upErr } = await update.select("id");
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
        if (!changed?.length) return NextResponse.json({ error: "다른 창에서 원고나 이미지가 변경됐습니다. 생성 결과는 보존했습니다. 이미지 저장만 다시 시도해주세요." }, { status: 409 });

        return NextResponse.json({ images: merged, done });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: err instanceof StrengthStoreError || err instanceof StudioError ? err.status : 500 });
    }
}
