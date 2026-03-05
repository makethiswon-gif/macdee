// ─── Supabase Storage Utility ───
import { createClient as createAdminClientFn } from "@supabase/supabase-js";

const BUCKET_NAME = "card-covers";

/**
 * Supabase Storage에 커버 이미지를 업로드합니다.
 * 
 * @param lawyerId - 변호사 ID
 * @param contentId - 콘텐츠 ID
 * @param imageBase64 - base64 인코딩된 이미지 데이터
 * @returns public URL 또는 null
 */
export async function uploadCoverImage(
    lawyerId: string,
    contentId: string,
    imageBase64: string,
): Promise<string | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("[Storage] Missing Supabase credentials");
        return null;
    }

    const supabase = createAdminClientFn(supabaseUrl, serviceRoleKey);

    try {
        // Convert base64 to buffer
        const buffer = Buffer.from(imageBase64, "base64");
        const fileName = `${lawyerId}/${contentId}-cover.png`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, buffer, {
                contentType: "image/png",
                upsert: true,
            });

        if (uploadError) {
            console.error("[Storage] Upload error:", uploadError);
            return null;
        }

        // Get public URL
        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        console.log(`[Storage] Cover image uploaded: ${data.publicUrl}`);
        return data.publicUrl;
    } catch (err) {
        console.error("[Storage] Upload failed:", err);
        return null;
    }
}
