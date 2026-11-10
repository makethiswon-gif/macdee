import { listPage } from "@/lib/junil-site/pages";

// 법률사무소 준일 홈페이지 — 법률칼럼 목록 (/junil-site/column)
export const dynamic = "force-dynamic";

export function GET() {
    return listPage("column");
}
