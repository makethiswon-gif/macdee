import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifyAdminTokenValue } from "@/lib/admin-auth";
import { findDeal } from "@/lib/deepmakai/ad-contract";
import { loadAdContract, loadEul } from "@/lib/deepmakai/ad-contract-server";
import ContractSign from "./ContractSign";

export const dynamic = "force-dynamic";

export default async function AdContractPage({ params }: { params: Promise<{ code: string }> }) {
    const deal = findDeal((await params).code);
    if (!deal) notFound();
    const isAdmin = verifyAdminTokenValue((await cookies()).get("admin_token")?.value || "");
    const [rec, eul] = await Promise.all([loadAdContract(deal).catch(() => null), loadEul(deal).catch(() => null)]);
    return (
        <ContractSign
            deal={deal}
            signed={rec ? { at: rec.signedAt, company: rec.party.company } : null}
            eul={eul ? { party: eul.party, signedAt: eul.signedAt, signature: eul.signature } : null}
            isAdmin={isAdmin}
        />
    );
}
