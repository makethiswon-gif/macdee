import { listPage } from "@/lib/junil-site/pages";

// 법률사무소 준일 홈페이지 — 성공사례 목록 (/junil-site/cases)
export const dynamic = "force-dynamic";

export function GET() {
    return listPage("case");
}
