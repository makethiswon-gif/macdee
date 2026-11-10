import { postPage } from "@/lib/junil-site/pages";

// 준일소식 글 한 편 (/junil-site/news/{주소 또는 글 번호})
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    return postPage("news", req, (await params).slug);
}
