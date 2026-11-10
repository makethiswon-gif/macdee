import { postPage } from "@/lib/junil-site/pages";

// 성공사례 글 한 편 (/junil-site/cases/{주소 또는 글 번호})
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    return postPage("case", req, (await params).slug);
}
