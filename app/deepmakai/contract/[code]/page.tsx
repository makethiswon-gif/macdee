import { notFound } from "next/navigation";
import { resolveCode } from "@/lib/deepmakai/ad-contract-codes";
import { loadAdContract, loadDealConfig, loadEul } from "@/lib/deepmakai/ad-contract-server";
import ContractSign from "./ContractSign";

export const dynamic = "force-dynamic";

// 같은 계약 건이라도 광고주(갑) 링크와 을(딥마카이, 김승연 서명) 링크의 코드가 다르다.
export default async function AdContractPage({ params }: { params: Promise<{ code: string }> }) {
    const code = (await params).code;
    const hit = resolveCode(code);
    if (!hit) notFound();
    const [rec, eul, config] = await Promise.all([loadAdContract(hit.deal).catch(() => null), loadEul(hit.deal).catch(() => null), loadDealConfig(hit.deal).catch(() => ({} as { account?: string }))]);
    return (
        <ContractSign
            deal={hit.deal}
            code={code}
            role={hit.role}
            account={config.account || ""}
            signed={rec ? { at: rec.signedAt, company: rec.party.company } : null}
            eul={eul ? { party: eul.party, signedAt: eul.signedAt, signature: eul.signature } : null}
        />
    );
}
