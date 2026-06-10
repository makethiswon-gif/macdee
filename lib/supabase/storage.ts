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

/**
 * 매거진 커버 이미지를 Supabase Storage에 업로드합니다.
 * base64를 DB에 직접 넣지 않고 스토리지 URL로 저장하기 위함.
 *
 * @param key - 파일 식별자 (예: magazine id 또는 slug)
 * @param imageBase64 - base64 인코딩된 이미지 데이터 (data URI 접두사 없이)
 * @returns public URL 또는 null
 */
export async function uploadMagazineCover(
    key: string,
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
        const buffer = Buffer.from(imageBase64, "base64");
        // 파일명에 안전하지 않은 문자 제거
        const safeKey = key.replace(/[^a-zA-Z0-9가-힣_-]/g, "").slice(0, 80) || `mag-${Date.now()}`;
        const fileName = `magazine/${safeKey}.png`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, buffer, {
                contentType: "image/png",
                upsert: true,
            });

        if (uploadError) {
            console.error("[Storage] Magazine cover upload error:", uploadError);
            return null;
        }

        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return data.publicUrl;
    } catch (err) {
        console.error("[Storage] Magazine cover upload failed:", err);
        return null;
    }
}
