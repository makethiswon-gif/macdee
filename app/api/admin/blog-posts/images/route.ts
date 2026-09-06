import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

// 브라우저에서 만든 카드 PNG를 받아 Storage에 올리고 원고에 붙인다.
// 이미지가 서버에 남아야 발행기가 집어갈 수 있다.

const BUCKET = "blog-cards";

interface IncomingImage {
    type: string;
    dataUrl: string;
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
        };
        const { postId, image, index, total } = payload;

        // 한 장씩(image) 또는 한꺼번에(images) 둘 다 받는다
        const images = payload.images ?? (image ? [image] : []);
        const single = !payload.images && Boolean(image);

        if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });
        if (!Array.isArray(images) || images.length === 0) {
            return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });
        }

        const supabase = await createAdminClient();
        const saved: { type: string; url: string }[] = [];

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const base64 = String(img.dataUrl || "").split(",")[1];
            if (!base64) continue;

            const bytes = Buffer.from(base64, "base64");
            // 한 장씩 올릴 때는 클라이언트가 준 순번을 쓴다(파일명 충돌 방지)
            const seq = single && typeof index === "number" ? index : i;
            const path = `${postId}/${String(seq + 1).padStart(2, "0")}-${img.type}.png`;

            const { error } = await supabase.storage
                .from(BUCKET)
                .upload(path, bytes, { contentType: "image/png", upsert: true });

            if (error) {
                console.error("[BlogCards] 업로드 실패:", path, error.message);
                return NextResponse.json({ error: `이미지 업로드 실패: ${error.message}` }, { status: 500 });
            }

            const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
            saved.push({ type: img.type, url: data.publicUrl });
        }

        // 한 장씩 받을 때는 기존 목록과 병합한다. 덮어쓰면 앞 장이 사라진다.
        let merged = saved;
        if (single) {
            const { data: row } = await supabase
                .from("blog_posts")
                .select("card_images")
                .eq("id", postId)
                .single();
            const prev = (row?.card_images as { type: string; url: string }[] | null) || [];
            // 같은 type 은 새 것으로 교체(재생성 대비)
            merged = [...prev.filter((x) => !saved.some((n) => n.type === x.type)), ...saved];
        }

        // 다 모였을 때만 발행 대기로 올린다
        const done = !single || (typeof total === "number" ? merged.length >= total : true);

        const { error: upErr } = await supabase
            .from("blog_posts")
            .update({
                card_images: merged,
                ...(done ? { status: "ready" } : {}),
                updated_at: new Date().toISOString(),
            })
            .eq("id", postId);

        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

        return NextResponse.json({ images: merged, done });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
