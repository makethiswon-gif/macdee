import { notFound } from "next/navigation";
import { resolveShareCode } from "@/lib/deepmakai/ad-contract-codes";
import { loadShareFinal, loadShareSigns } from "@/lib/deepmakai/revenue-share-server";
import ShareSign, { type SignedView } from "./ShareSign";

export const dynamic = "force-dynamic";

// 당사자마다 링크 코드가 다르다. 화면에는 다른 사람의 연락처·계좌를 넘기지 않는다(서명 여부와 시각만).
export default async function RevenueSharePage({ params }: { params: Promise<{ code: string }> }) {
    const code = (await params).code;
    const role = resolveShareCode(code);
    if (!role) notFound();
    const [fin, live] = await Promise.all([loadShareFinal().catch(() => null), loadShareSigns().catch(() => [])]);
    const signs = fin?.signs || live;
    const mine = signs.find((s) => s.role === role);
    const signed: SignedView[] = signs.map((s) => ({ role: s.role, signedAt: s.signedAt }));
    return <ShareSign code={code} role={role} signed={signed} mine={mine ? { party: mine.party, signature: mine.signature } : null} completedAt={fin?.completedAt || null} />;
}
