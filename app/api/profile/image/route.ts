import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

// POST: Upload and normalize profile image to 400x400
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        const formData = await request.formData();
        const file = formData.get("file") as File;
        if (!file) return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });

        // Read file buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Normalize: resize to 400x400, center crop, output as WebP for quality + small size
        const normalized = await sharp(buffer)
            .resize(400, 400, {
                fit: "cover",
                position: "top",     // Focus on face (top portion)
            })
            .webp({ quality: 85 })
            .toBuffer();

        // Convert to base64 data URL (no external storage dependency)
        const base64 = normalized.toString("base64");
        const dataUrl = `data:image/webp;base64,${base64}`;

        // Try Supabase Storage first, fall back to data URL
        let imageUrl = dataUrl;
        try {
            const fileName = `${lawyer.id}/profile.webp`;
            const { error: uploadError } = await supabase.storage
                .from("profile-images")
                .upload(fileName, normalized, {
                    contentType: "image/webp",
                    upsert: true,
                });

            if (!uploadError) {
                const { data: publicUrl } = supabase.storage
                    .from("profile-images")
                    .getPublicUrl(fileName);
                if (publicUrl?.publicUrl) {
                    imageUrl = publicUrl.publicUrl;
                }
            }
        } catch {
            // Storage not available, use data URL
            console.log("[Profile Image] Storage unavailable, using data URL");
        }

        // Update lawyer profile with image URL
        const { error: updateError } = await supabase
            .from("lawyers")
            .update({ profile_image_url: imageUrl })
            .eq("id", lawyer.id);

        if (updateError) {
            return NextResponse.json({ error: "프로필 이미지 저장 실패" }, { status: 500 });
        }

        return NextResponse.json({ profile_image_url: imageUrl }, { status: 200 });
    } catch (err) {
        console.error("[Profile Image] Error:", err);
        return NextResponse.json({ error: "이미지 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
