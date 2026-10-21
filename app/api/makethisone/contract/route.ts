import { NextResponse } from "next/server";
import { getClientIp, rateLimitOk, tooManyRequests } from "@/lib/ratelimit";
import { isValidEmail, resolveProduct } from "@/lib/makethisone/contract";
import { createContract } from "@/lib/makethisone/contract-server";

// POST: 결제 전 전자계약 동의 기록(2026-10-21). 결제 승인 뒤 이 계약 번호로 PDF 를 만들어 결제자 이메일로 보낸다.
//   body: { kind: "plan" | "pack", productId, name, email, phone? }
export async function POST(request: Request) {
    const ip = getClientIp(request);
    if (!(await rateLimitOk("mto-contract", ip, 10, "1 m"))) return tooManyRequests();
    let body: { kind?: unknown; productId?: unknown; name?: unknown; email?: unknown; phone?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 }); }

    const product = resolveProduct(String(body.kind || ""), String(body.productId || ""));
    if (!product) return NextResponse.json({ error: "선택한 상품을 찾지 못했습니다." }, { status: 400 });
    const name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const email = String(body.email || "").trim().slice(0, 120);
    const phone = String(body.phone || "").replace(/[^\d\-+ ]/g, "").trim().slice(0, 20);
    if (name.length < 2) return NextResponse.json({ error: "광고주(사무소명 또는 성명)를 입력해 주세요." }, { status: 400 });
    if (!isValidEmail(email)) return NextResponse.json({ error: "계약서를 받을 이메일 주소를 확인해 주세요." }, { status: 400 });

    try {
        const rec = await createContract({ product, party: { name, email, ...(phone ? { phone } : {}) }, ip, userAgent: request.headers.get("user-agent") || "" });
        return NextResponse.json({ contractId: rec.id });
    } catch (e) {
        console.error("[Contract] create error:", e);
        return NextResponse.json({ error: "계약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
    }
}
