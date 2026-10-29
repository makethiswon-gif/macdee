import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { getClientIp } from "@/lib/ratelimit";
import { isValidEmail } from "@/lib/makethisone/contract";
import { BIZNO_RE, findDeal } from "@/lib/deepmakai/ad-contract";
import { deleteEul, saveEul } from "@/lib/deepmakai/ad-contract-server";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// POST: 을(딥마카이 사업자) 서명 — makethis1.com 관리자 로그인(admin_token) 필요. 광고주가 서명하기 전까지는 다시 서명할 수 있다.
//   body: { company, ceo, bizNo, address, email?, signer, signature(dataURL png) }
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
    const deal = findDeal((await params).code);
    if (!deal) return NextResponse.json({ error: "계약을 찾지 못했습니다." }, { status: 404 });
    let b: Record<string, unknown>;
    try { b = await request.json(); } catch { return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 }); }

    const party = { company: clean(b.company, 80), ceo: clean(b.ceo, 40), bizNo: clean(b.bizNo, 20), address: clean(b.address, 160), email: clean(b.email, 120), signer: clean(b.signer, 40) };
    const signature = String(b.signature ?? "");
    if (party.company.length < 2) return NextResponse.json({ error: "상호를 입력해 주세요." }, { status: 400 });
    if (party.ceo.length < 2) return NextResponse.json({ error: "대표자 성명을 입력해 주세요." }, { status: 400 });
    if (!BIZNO_RE.test(party.bizNo)) return NextResponse.json({ error: "사업자등록번호 10자리를 확인해 주세요." }, { status: 400 });
    if (party.address.length < 5) return NextResponse.json({ error: "주소를 입력해 주세요." }, { status: 400 });
    if (party.email && !isValidEmail(party.email)) return NextResponse.json({ error: "이메일 주소를 확인해 주세요." }, { status: 400 });
    if (party.signer.length < 2) return NextResponse.json({ error: "서명하는 분의 성명을 입력해 주세요." }, { status: 400 });
    if (!signature.startsWith("data:image/png;base64,") || signature.length < 1500 || signature.length > 400_000) return NextResponse.json({ error: "서명란에 서명해 주세요." }, { status: 400 });

    try {
        const ok = await saveEul(deal, {
            party: { ...party, email: party.email || undefined }, signature,
            signedAt: new Date().toISOString(), ip: getClientIp(request), userAgent: (request.headers.get("user-agent") || "").slice(0, 300),
        });
        if (!ok) return NextResponse.json({ error: "광고주가 이미 서명한 계약이라 바꿀 수 없습니다." }, { status: 409 });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("[AdContract] eul sign error:", e);
        return NextResponse.json({ error: "을 서명을 저장하지 못했습니다." }, { status: 500 });
    }
}

// DELETE: 을 서명 지우기(정보를 고쳐 다시 서명하려고). 광고주가 서명한 뒤에는 막는다.
export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
    const deal = findDeal((await params).code);
    if (!deal) return NextResponse.json({ error: "계약을 찾지 못했습니다." }, { status: 404 });
    if (!(await deleteEul(deal))) return NextResponse.json({ error: "광고주가 이미 서명한 계약이라 바꿀 수 없습니다." }, { status: 409 });
    return NextResponse.json({ ok: true });
}
