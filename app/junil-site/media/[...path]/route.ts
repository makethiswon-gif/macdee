import { readImage } from "@/lib/junil-site/store";

// 관리자 모드에서 올린 이미지 (/junil-site/media/YYYY/MM/이름.jpg) — 비공개 버킷에서 꺼내 내려 준다.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const image = await readImage(path.join("/"));
    if (!image) return new Response("Not found", { status: 404 });
    return new Response(image.bytes, {
        headers: {
            "Content-Type": image.type,
            // 파일 이름이 올릴 때마다 새로 정해지므로 오래 캐시해도 된다.
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    });
}
