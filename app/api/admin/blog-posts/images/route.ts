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

export async function POST(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { postId, images } = (await request.json()) as { postId?: string; images?: IncomingImage[] };

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
            const path = `${postId}/${String(i + 1).padStart(2, "0")}-${img.type}.png`;

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

        // 이미지까지 붙었으면 발행 대기 상태로 올린다
        const { error: upErr } = await supabase
            .from("blog_posts")
            .update({ card_images: saved, status: "ready", updated_at: new Date().toISOString() })
            .eq("id", postId);

        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

        return NextResponse.json({ images: saved });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
