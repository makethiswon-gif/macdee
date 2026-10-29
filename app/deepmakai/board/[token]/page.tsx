import { notFound } from "next/navigation";
import { checkBoardToken } from "@/lib/deepmakai/ad-contract-server";
import AdContractLinks from "../../contract/AdContractLinks";
import RevenueShareLinks from "../../share/RevenueShareLinks";

export const dynamic = "force-dynamic";

// 로그인 없이 보는 계약 링크 모음(2026-10-29 대표 지시). 주소의 토큰은 저장소(공개)에 두지 않고 비공개 보관함 board-token.json 과 맞춘다.
// 서명 링크와 출연자 계좌가 다 보이므로 주소를 다른 사람에게 보내지 않는다.
export default async function DeepmakaiBoard({ params }: { params: Promise<{ token: string }> }) {
    if (!(await checkBoardToken((await params).token))) notFound();
    return (
        <main className="mx-auto max-w-3xl px-4 py-10">
            <p className="text-[12px] font-semibold tracking-[0.18em] text-black/50">DEEP MAKAI · 대표 전용</p>
            <h1 className="mt-1 text-[24px] font-bold">광고 계약</h1>
            <AdContractLinks />
            <h1 className="mt-12 text-[24px] font-bold">광고 수익 배분 약정 (5인)</h1>
            <RevenueShareLinks />
            <p className="mt-10 text-[12px] text-black/45">이 주소에서는 서명 링크와 정산 계좌가 모두 보입니다. 다른 사람에게 보내지 마세요.</p>
        </main>
    );
}
