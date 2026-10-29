import { notFound } from "next/navigation";
import { findDeal } from "@/lib/deepmakai/ad-contract";
import { loadAdContract } from "@/lib/deepmakai/ad-contract-server";
import ContractSign from "./ContractSign";

export const dynamic = "force-dynamic";

export default async function AdContractPage({ params }: { params: Promise<{ code: string }> }) {
    const deal = findDeal((await params).code);
    if (!deal) notFound();
    const rec = await loadAdContract(deal).catch(() => null);
    return <ContractSign deal={deal} signed={rec ? { at: rec.signedAt, company: rec.party.company } : null} />;
}
