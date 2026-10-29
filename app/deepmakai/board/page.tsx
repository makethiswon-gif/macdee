import { cookies } from "next/headers";
import { BOARD_COOKIE, boardSessionOk } from "@/lib/deepmakai/board-auth";
import AdContractLinks from "../contract/AdContractLinks";
import RevenueShareLinks from "../share/RevenueShareLinks";
import BoardLogin from "./BoardLogin";

export const dynamic = "force-dynamic";

// 관리자 로그인 없이 비밀번호로 보는 계약 링크 모음(2026-10-29 대표 지시). 비밀번호는 비공개 보관함 board-pass.json(lib/deepmakai/board-auth.ts).
// 서명 링크와 출연자 계좌가 다 보이므로 비밀번호를 다른 사람에게 알려 주지 않는다.
export default async function DeepmakaiBoard() {
    if (!(await boardSessionOk((await cookies()).get(BOARD_COOKIE)?.value || ""))) return <BoardLogin />;
    return (
        <main className="mx-auto max-w-3xl px-4 py-10">
            <p className="text-[12px] font-semibold tracking-[0.18em] text-black/50">DEEP MAKAI · 대표 전용</p>
            <h1 className="mt-1 text-[24px] font-bold">광고 계약</h1>
            <AdContractLinks />
            <h1 className="mt-12 text-[24px] font-bold">광고 수익 배분 약정 (5인)</h1>
            <RevenueShareLinks />
            <p className="mt-10 text-[12px] text-black/45">이 화면에서는 서명 링크와 정산 계좌가 모두 보입니다. 비밀번호를 다른 사람에게 알려 주지 마세요.</p>
        </main>
    );
}
