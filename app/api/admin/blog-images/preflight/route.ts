import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { imageStrengthContext } from "@/lib/blog-images/strength-context";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyPhotoModel, BLOG_PHOTO_MODEL } from "@/lib/blog-images/photo-generator";
import { selectImageProof, verifyImageProof } from "@/lib/blog-images/proof-selection";
import { sourceHash } from "@/lib/blog-images/visual-planner";
import { prepareEditorialThree } from "@/lib/blog-images/three-card-renderer";
import { EDITORIAL_SET_FORMAT } from "@/lib/blog-images/card-types";
import { editorialStudioPhoto } from "@/lib/lawyer-studio/blog";
import { StudioPhotoRequiredError } from "@/lib/lawyer-studio/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const body = await request.json();
        const context = await imageStrengthContext({ id: body.profileId }, "", "", undefined, true);
        if (body.proofSelection || body.proofToken) {
            verifyImageProof(body.proofToken, body.proofSelection, context.library, sourceHash(String(body.title || ""), String(body.content || "")));
            return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
        }
        const topic = typeof body.topic === "string" ? body.topic.slice(0, 40_180) : "";
        const proof = selectImageProof(context.library, topic, "preflight", body.basicProfile !== false);
        for (const name of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "ADMIN_TOKEN_SECRET"]) if (!process.env[name] || process.env[name] === "[SENSITIVE]") throw new Error(`${name} 설정을 확인해주세요. 유료 생성을 시작하지 않았습니다.`);
        const db = createServiceClient();
        const { data, error } = await db.storage.getBucket("owner-briefings");
        if (error || !data || data.public) throw new Error("이미지 비공개 저장소를 확인해주세요. 유료 생성을 시작하지 않았습니다.");
        const photo = await editorialStudioPhoto(context.profile.id, `${EDITORIAL_SET_FORMAT}:${context.profile.id}`);
        const contactPhoto = await editorialStudioPhoto(context.profile.id, `${EDITORIAL_SET_FORMAT}:${context.profile.id}`, "contact");
        const dimensions = await prepareEditorialThree(context.profile, proof, topic.slice(0, 180), photo, contactPhoto);
        if (body.checkModel === true) await verifyPhotoModel();
        return NextResponse.json({ ok: true, model: BLOG_PHOTO_MODEL, setFormat: EDITORIAL_SET_FORMAT, count: 3,
            dimensions, proof: proof.claims, basicProfile: proof.mode === "basic" }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "제작 준비를 확인하지 못했습니다.",
            ...(e instanceof StudioPhotoRequiredError ? { code: e.code } : {}) }, { status: 422 });
    }
}
