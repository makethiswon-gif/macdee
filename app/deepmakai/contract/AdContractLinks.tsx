import { listDeals } from "@/lib/deepmakai/ad-contract";
import { dealCode } from "@/lib/deepmakai/ad-contract-codes";
import { loadAdContract, loadEul } from "@/lib/deepmakai/ad-contract-server";
import { kstDateTime, won } from "@/lib/makethisone/contract";

// 계약 건마다 을 서명 링크와 광고주 서명 링크, 서명 상태. 관리자 화면과 비밀 주소 링크 모음(/deepmakai/board/<토큰>)이 같이 쓴다.
export default async function AdContractLinks() {
    const base = "https://www.makethis1.com/deepmakai/contract/";
    const rows = await Promise.all(listDeals().map(async (deal) => {
        const [rec, eul] = await Promise.all([loadAdContract(deal).catch(() => null), loadEul(deal).catch(() => null)]);
        return { deal, eulUrl: base + dealCode(deal, "eul"), gapUrl: base + dealCode(deal, "gap"), rec, eul };
    }));
    return (
        <>
            <p className="mt-1 text-[14px] text-black/60">을이 먼저 을 링크에서 서명한 뒤, 광고주 링크를 광고주에게 보냅니다.</p>
            {rows.map(({ deal, eulUrl, gapUrl, rec, eul }) => (
                <section key={deal.id} className="mt-4 rounded-2xl border border-black/10 bg-white p-5 text-[14px]">
                    <p className="text-[16px] font-bold">{deal.brand} · {won(deal.supplyPrice)} <span className="font-normal text-black/50">(부가세 별도)</span></p>
                    <p className="mt-0.5 text-black/60">{deal.episode}</p>
                    <dl className="mt-4 grid grid-cols-[88px_1fr] gap-x-3 gap-y-3">
                        <dt className="text-black/50">을 링크</dt>
                        <dd className="break-all"><a className="underline" href={eulUrl}>{eulUrl}</a><br /><span className="text-black/50">{eul ? `서명 완료 · ${eul.party.company} ${eul.party.signer} · ${kstDateTime(new Date(eul.signedAt))}` : "을 서명 전"}</span></dd>
                        <dt className="text-black/50">광고주 링크</dt>
                        <dd className="break-all"><a className="underline" href={gapUrl}>{gapUrl}</a><br /><span className="text-black/50">{rec ? `서명 완료 · ${rec.party.company} ${rec.party.signer} · ${kstDateTime(new Date(rec.signedAt))}${rec.emailedAt ? " · 메일 발송됨" : rec.emailError ? ` · 메일 실패: ${rec.emailError}` : ""}` : eul ? "광고주 서명 전" : "을 서명 뒤에 보내세요"}</span></dd>
                    </dl>
                </section>
            ))}
        </>
    );
}
