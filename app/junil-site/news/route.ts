import { listPage } from "@/lib/junil-site/pages";

// 법률사무소 준일 홈페이지 — 준일소식 목록 (/junil-site/news)
export const dynamic = "force-dynamic";

export function GET() {
    return listPage("news");
}
