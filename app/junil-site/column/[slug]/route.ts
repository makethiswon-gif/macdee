import { postPage } from "@/lib/junil-site/pages";

// 법률칼럼 글 한 편 (/junil-site/column/{주소 또는 글 번호})
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    return postPage("column", req, (await params).slug);
}
