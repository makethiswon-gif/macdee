import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/ratelimit";
import { isValidEmail } from "@/lib/makethisone/contract";
import { BIZNO_RE } from "@/lib/deepmakai/ad-contract";
import { resolveShareCode } from "@/lib/deepmakai/ad-contract-codes";
import { BIRTH_RE, PHONE_RE, type ShareParty } from "@/lib/deepmakai/revenue-share";
import { deleteShareSign, saveShareSign } from "@/lib/deepmakai/revenue-share-server";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// POST: 광고 수익 배분 약정 서명 — 당사자마다 다른 링크 코드로(2026-10-29). 다섯 명이 다 서명하기 전까지는 다시 서명할 수 있다.
//   메이크디스원 body: { company, ceo, bizNo, address, email?, signer, signature, agree }
//   출연자 body: { name, birth, phone, email?, address?, account, signature, agree }
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
    const role = resolveShareCode((await params).code);
    if (!role) return NextResponse.json({ error: "약정서를 찾지 못했습니다." }, { status: 404 });
    let b: Record<string, unknown>;
    try { b = await request.json(); } catch { return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 }); }

    const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
    const email = clean(b.email, 120);
    if (email && !isValidEmail(email)) return bad("이메일 주소를 확인해 주세요.");
    let party: ShareParty;
    if (role === "mto") {
        const c = { company: clean(b.company, 80), ceo: clean(b.ceo, 40), bizNo: clean(b.bizNo, 20), address: clean(b.address, 160), signer: clean(b.signer, 40) };
        if (c.company.length < 2) return bad("상호를 입력해 주세요.");
        if (c.ceo.length < 2) return bad("대표자 성명을 입력해 주세요.");
        if (!BIZNO_RE.test(c.bizNo)) return bad("사업자등록번호 10자리를 확인해 주세요.");
        if (c.address.length < 5) return bad("주소를 입력해 주세요.");
        if (c.signer.length < 2) return bad("서명하는 분의 성명을 입력해 주세요.");
        party = { ...c, ...(email ? { email } : {}) };
    } else {
        const q = { name: clean(b.name, 40), birth: clean(b.birth, 20), phone: clean(b.phone, 20), address: clean(b.address, 160), account: clean(b.account, 80) };
        if (q.name.length < 2) return bad("성명을 입력해 주세요.");
        if (!BIRTH_RE.test(q.birth)) return bad("생년월일을 1990-01-01 처럼 입력해 주세요.");
        if (!PHONE_RE.test(q.phone)) return bad("휴대폰 번호를 확인해 주세요.");
        if (q.account.replace(/\D/g, "").length < 8) return bad("정산받을 계좌(은행, 계좌번호)를 입력해 주세요.");
        party = { name: q.name, birth: q.birth, phone: q.phone, account: q.account, ...(email ? { email } : {}), ...(q.address ? { address: q.address } : {}) };
    }
    const signature = String(b.signature ?? "");
    if (!signature.startsWith("data:image/png;base64,") || signature.length < 1500 || signature.length > 400_000) return bad("서명란에 서명해 주세요.");
    if (b.agree !== true) return bad("약정 내용에 동의해 주세요.");

    try {
        const r = await saveShareSign({ role, party, signature, signedAt: new Date().toISOString(), ip: getClientIp(request), userAgent: (request.headers.get("user-agent") || "").slice(0, 300) });
        if (r === "final") return NextResponse.json({ error: "다섯 분 모두 서명을 마친 약정이라 바꿀 수 없습니다." }, { status: 409 });
        return NextResponse.json({ ok: true, complete: !!r.complete, mailed: !!r.complete?.emailedAt });
    } catch (e) {
        console.error("[RevenueShare] sign error:", e);
        return NextResponse.json({ error: "서명을 저장하지 못했습니다." }, { status: 500 });
    }
}

// DELETE: 내 서명 지우기(정보를 고쳐 다시 서명하려고). 다섯 명이 다 서명한 뒤에는 막는다.
export async function DELETE(_request: Request, { params }: { params: Promise<{ code: string }> }) {
    const role = resolveShareCode((await params).code);
    if (!role) return NextResponse.json({ error: "약정서를 찾지 못했습니다." }, { status: 404 });
    if (!(await deleteShareSign(role))) return NextResponse.json({ error: "다섯 분 모두 서명을 마친 약정이라 바꿀 수 없습니다." }, { status: 409 });
    return NextResponse.json({ ok: true });
}
