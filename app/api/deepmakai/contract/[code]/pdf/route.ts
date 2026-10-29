import { resolveCode } from "@/lib/deepmakai/ad-contract-codes";
import { loadAdContract, loadAdContractPdf } from "@/lib/deepmakai/ad-contract-server";

export const dynamic = "force-dynamic";

// GET ?id=<계약 번호>: 서명 직후 화면에서 계약서 PDF 내려받기. 주소 코드와 계약 번호를 둘 다 알아야 한다.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
    const hit = resolveCode((await params).code);
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!hit || hit.role !== "gap" || !/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
    const deal = hit.deal;
    const rec = await loadAdContract(deal);
    if (!rec || rec.id !== id) return new Response("Not found", { status: 404 });
    const pdf = await loadAdContractPdf(rec);
    if (!pdf) return new Response("Not found", { status: 404 });
    const name = encodeURIComponent(`딥마카이_광고계약서_${rec.party.company}.pdf`);
    return new Response(Buffer.from(pdf), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename*=UTF-8''${name}`, "Cache-Control": "no-store" },
    });
}
