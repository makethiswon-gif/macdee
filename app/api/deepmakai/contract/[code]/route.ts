import { NextResponse } from "next/server";
import { getClientIp, rateLimitOk, tooManyRequests } from "@/lib/ratelimit";
import { isValidEmail } from "@/lib/makethisone/contract";
import { BIZNO_RE, findDeal } from "@/lib/deepmakai/ad-contract";
import { loadAdContract, signAdContract } from "@/lib/deepmakai/ad-contract-server";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// GET: 서명 여부(서명 화면이 이미 끝난 건인지 알기 위해). 상호와 서명 시각만 돌려준다.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const deal = findDeal((await params).code);
    if (!deal) return NextResponse.json({ error: "계약을 찾지 못했습니다." }, { status: 404 });
    const rec = await loadAdContract(deal);
    return NextResponse.json(rec ? { signed: true, signedAt: rec.signedAt, company: rec.party.company } : { signed: false });
}

// POST: 광고주 전자서명(2026-10-29). body: { company, ceo, bizNo, address, manager?, email, phone?, signer, signature(dataURL png), agree }
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
    const deal = findDeal((await params).code);
    if (!deal) return NextResponse.json({ error: "계약을 찾지 못했습니다." }, { status: 404 });
    const ip = getClientIp(request);
    if (!(await rateLimitOk("dm-ad-contract", ip, 10, "1 m"))) return tooManyRequests();
    let b: Record<string, unknown>;
    try { b = await request.json(); } catch { return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 }); }

    const party = {
        company: clean(b.company, 80), ceo: clean(b.ceo, 40), bizNo: clean(b.bizNo, 20), address: clean(b.address, 160),
        manager: clean(b.manager, 40), email: clean(b.email, 120), phone: String(b.phone ?? "").replace(/[^\d\-+ ]/g, "").trim().slice(0, 20),
        signer: clean(b.signer, 40),
    };
    const signature = String(b.signature ?? "");
    if (party.company.length < 2) return NextResponse.json({ error: "상호를 입력해 주세요." }, { status: 400 });
    if (party.ceo.length < 2) return NextResponse.json({ error: "대표자 성명을 입력해 주세요." }, { status: 400 });
    if (!BIZNO_RE.test(party.bizNo)) return NextResponse.json({ error: "사업자등록번호 10자리를 확인해 주세요." }, { status: 400 });
    if (party.address.length < 5) return NextResponse.json({ error: "주소를 입력해 주세요." }, { status: 400 });
    if (!isValidEmail(party.email)) return NextResponse.json({ error: "계약서를 받을 이메일 주소를 확인해 주세요." }, { status: 400 });
    if (party.signer.length < 2) return NextResponse.json({ error: "서명하는 분의 성명을 입력해 주세요." }, { status: 400 });
    if (!signature.startsWith("data:image/png;base64,") || signature.length < 1500 || signature.length > 400_000) return NextResponse.json({ error: "서명란에 서명해 주세요." }, { status: 400 });
    if (b.agree !== true) return NextResponse.json({ error: "계약 내용에 동의해 주세요." }, { status: 400 });

    try {
        const out = await signAdContract(deal, {
            party: { ...party, manager: party.manager || undefined, phone: party.phone || undefined },
            signature, ip, userAgent: request.headers.get("user-agent") || "",
        });
        if (out === "signed") return NextResponse.json({ error: "이미 서명이 끝난 계약입니다." }, { status: 409 });
        if (out === "not-ready") return NextResponse.json({ error: "아직 계약서가 준비되지 않았습니다. 딥마카이 담당자에게 문의해 주세요." }, { status: 409 });
        return NextResponse.json({ ok: true, id: out.rec.id, email: out.rec.party.email, mailed: out.mailed, signedAt: out.rec.signedAt });
    } catch (e) {
        console.error("[AdContract] sign error:", e);
        return NextResponse.json({ error: "계약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
    }
}
