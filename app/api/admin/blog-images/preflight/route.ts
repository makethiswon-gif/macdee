import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { imageStrengthContext } from "@/lib/blog-images/strength-context";
import { contactReadiness } from "@/lib/blog-images/contact-details";
import { readBrandAsset } from "@/lib/blog-images/editorial-renderer";
import { magazineFonts } from "@/lib/blog-images/magazine-design";
import { createServiceClient } from "@/lib/supabase/server";
import sharp from "sharp";
import { verifyPhotoModel, BLOG_PHOTO_MODEL } from "@/lib/blog-images/photo-generator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const body = await request.json();
        const { profile } = await imageStrengthContext({ id: body.profileId }, "", "");
        const missing = contactReadiness(profile);
        if (missing.length) throw new Error(`사진·로고 관리에서 ${missing.join("과 ")}을 먼저 등록해주세요. 유료 생성을 시작하지 않았습니다.`);
        magazineFonts();
        await sharp(await readBrandAsset(profile.profileImages[0]), { limitInputPixels: 24_000_000 }).metadata();
        for (const name of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "ADMIN_TOKEN_SECRET"]) if (!process.env[name] || process.env[name] === "[SENSITIVE]") throw new Error(`${name} 설정을 확인해주세요. 유료 생성을 시작하지 않았습니다.`);
        const db = createServiceClient();
        const { data, error } = await db.storage.getBucket("owner-briefings");
        if (error || !data || data.public) throw new Error("이미지 비공개 저장소를 확인해주세요. 유료 생성을 시작하지 않았습니다.");
        if (body.checkModel === true) await verifyPhotoModel();
        return NextResponse.json({ ok: true, model: BLOG_PHOTO_MODEL }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "제작 준비를 확인하지 못했습니다." }, { status: 422 });
    }
}
