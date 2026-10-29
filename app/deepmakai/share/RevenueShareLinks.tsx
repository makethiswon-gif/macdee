import { shareCode } from "@/lib/deepmakai/ad-contract-codes";
import { SHARE, type SharePerson } from "@/lib/deepmakai/revenue-share";
import { loadShareFinal, loadShareSigns } from "@/lib/deepmakai/revenue-share-server";
import { kstDateTime } from "@/lib/makethisone/contract";

// 광고 수익 배분 약정의 다섯 당사자 링크와 서명 상태, 출연자 정산 계좌(약정서에는 넣지 않는다).
// 관리자 화면과 비밀 주소 링크 모음(/deepmakai/board/<토큰>)이 같이 쓴다.
export default async function RevenueShareLinks() {
    const base = "https://www.makethis1.com/deepmakai/share/";
    const [fin, live] = await Promise.all([loadShareFinal(), loadShareSigns()]);
    const signs = fin?.signs || live;
    return (
        <>
            <p className="mt-1 text-[14px] text-black/60">링크를 각자에게 보내 주세요. 순서는 상관없고, 다섯 명이 모두 서명하면 약정서 PDF가 이메일을 적은 사람 모두에게 갑니다.</p>
            <p className="mt-3 rounded-xl bg-white px-4 py-3 text-[14px]">
                {fin ? `전원 서명 완료 · ${kstDateTime(new Date(fin.completedAt))}${fin.emailedAt ? ` · 메일 발송: ${fin.emailedTo?.join(", ")}` : fin.emailError ? ` · 메일 실패: ${fin.emailError}` : ""}` : `서명 ${signs.length}/${SHARE.members.length}`}
            </p>
            <section className="mt-4 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white text-[14px]">
                {SHARE.members.map((m) => {
                    const s = signs.find((x) => x.role === m.role);
                    const url = base + shareCode(m.role);
                    const person = s && m.role !== "mto" ? (s.party as SharePerson) : null;
                    return (
                        <div key={m.role} className="p-5">
                            <p className="font-bold">{m.name} <span className="font-normal text-black/50">{m.rate}</span></p>
                            <a className="mt-1 block break-all underline" href={url}>{url}</a>
                            <p className="mt-1 text-black/50">{s ? `서명 완료 · ${kstDateTime(new Date(s.signedAt))}${s.party.email ? ` · ${s.party.email}` : ""}` : "서명 전"}</p>
                            {person && <p className="mt-1 text-black/70">연락처 {person.phone} · 정산 계좌 {person.account}</p>}
                        </div>
                    );
                })}
            </section>
        </>
    );
}
