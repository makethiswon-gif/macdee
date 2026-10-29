import { resolveShareCode } from "@/lib/deepmakai/ad-contract-codes";
import { loadShareFinal, loadSharePdf } from "@/lib/deepmakai/revenue-share-server";

export const dynamic = "force-dynamic";

// GET: 전원 서명이 끝난 약정서 PDF. 당사자 누구의 링크 코드로든 받을 수 있다.
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
    if (!resolveShareCode((await params).code)) return new Response("Not found", { status: 404 });
    const fin = await loadShareFinal();
    const pdf = fin && (await loadSharePdf(fin));
    if (!pdf) return new Response("Not found", { status: 404 });
    const name = encodeURIComponent("딥마카이_광고수익배분약정서.pdf");
    return new Response(Buffer.from(pdf), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename*=UTF-8''${name}`, "Cache-Control": "no-store" },
    });
}
