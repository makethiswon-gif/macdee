import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

// POST: Upload and process logo image
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

        // Normalize: resize width to max 800px if larger, preserve transparency
        const normalized = await sharp(buffer)
            .resize(800, null, {
                withoutEnlargement: true,
            })
            .png({ quality: 90 }) // Use PNG to preserve transparency
            .toBuffer();

        // Convert to base64 data URL as fallback
        const base64 = normalized.toString("base64");
        const dataUrl = `data:image/png;base64,${base64}`;

        // Try Supabase Storage first, fall back to data URL
        let imageUrl = dataUrl;
        try {
            const fileName = `${lawyer.id}/logo.png`;
            const { error: uploadError } = await supabase.storage
                .from("profile-images")
                .upload(fileName, normalized, {
                    contentType: "image/png",
                    upsert: true,
                });

            if (!uploadError) {
                const { data: publicUrl } = supabase.storage
                    .from("profile-images")
                    .getPublicUrl(fileName);
                if (publicUrl?.publicUrl) {
                    // Add timestamp to bust cache in browser
                    imageUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;
                }
            }
        } catch {
            // Storage not available, use data URL
            console.log("[Logo Image] Storage unavailable, using data URL");
        }

        // Update lawyer profile with image URL
        const { error: updateError } = await supabase
            .from("lawyers")
            .update({ logo_url: imageUrl })
            .eq("id", lawyer.id);

        if (updateError) {
            return NextResponse.json({ error: "로고 이미지 저장 실패" }, { status: 500 });
        }

        return NextResponse.json({ logo_url: imageUrl }, { status: 200 });
    } catch (err) {
        console.error("[Logo Image] Error:", err);
        return NextResponse.json({ error: "이미지 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
