import { cookies } from "next/headers";
import { isJunilAdmin } from "@/lib/junil-site/auth";
import { BOARD_CATEGORIES, LAWYER_OPTIONS } from "@/lib/junil-site/render";
import JunilAdmin from "./JunilAdmin";
import JunilLogin from "./JunilLogin";

export const dynamic = "force-dynamic";

// 법률사무소 준일 홈페이지 관리자 모드 (/junil-site/admin) — 게시판 글 쓰기·고치기·지우기
export default async function JunilAdminPage() {
    const jar = await cookies();
    if (!isJunilAdmin((name) => jar.get(name)?.value)) return <JunilLogin />;
    return <JunilAdmin categories={BOARD_CATEGORIES} lawyers={LAWYER_OPTIONS} />;
}
