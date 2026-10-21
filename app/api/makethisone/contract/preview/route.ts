import { getClientIp, rateLimitOk, tooManyRequests } from "@/lib/ratelimit";
import { isValidEmail, kstDate, resolveProduct } from "@/lib/makethisone/contract";
import { renderContractPdf } from "@/lib/makethisone/contract-server";

// POST: 결제 전 계약서 PDF 미리보기 내려받기(2026-10-21 대표 지시). 저장·메일 없이 입력값으로 PDF 만 만들어 돌려준다.
//   body: { kind: "plan" | "pack", productId, name?, email?, phone? } — 비어 있는 칸은 빈칸 표시로 찍는다.
export async function POST(request: Request) {
    const ip = getClientIp(request);
    if (!(await rateLimitOk("mto-contract-preview", ip, 20, "1 m"))) return tooManyRequests();
    let body: { kind?: unknown; productId?: unknown; name?: unknown; email?: unknown; phone?: unknown };
    try { body = await request.json(); } catch { return Response.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 }); }

    const product = resolveProduct(String(body.kind || ""), String(body.productId || ""));
    if (!product) return Response.json({ error: "선택한 상품을 찾지 못했습니다." }, { status: 400 });
    const name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const rawEmail = String(body.email || "").trim().slice(0, 120);
    const email = isValidEmail(rawEmail) ? rawEmail : "";
    const phone = String(body.phone || "").replace(/[^\d\-+ ]/g, "").trim().slice(0, 20);
    const now = new Date();

    try {
        const pdf = await renderContractPdf({
            id: "preview", status: "signed", product,
            party: { name, email, ...(phone ? { phone } : {}) },
            agreedAt: now.toISOString(), ip, userAgent: "",
        }, { preview: true });
        const filename = `광고업무대행계약서_미리보기_${kstDate(now).replace(/\s/g, "")}.pdf`;
        return new Response(Buffer.from(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="contract-preview.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
                "Cache-Control": "no-store",
            },
        });
    } catch (e) {
        console.error("[Contract] preview error:", e);
        return Response.json({ error: "계약서 PDF 를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
    }
}
