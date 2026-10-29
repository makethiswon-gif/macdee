"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BIZNO_RE } from "@/lib/deepmakai/ad-contract";
import { BIRTH_RE, PHONE_RE, SHARE, buildShareContract, memberOf, type ShareParty, type ShareRole, type ShareSignView } from "@/lib/deepmakai/revenue-share";
import { COMPANY, isValidEmail, kstDateTime } from "@/lib/makethisone/contract";

export type SignedView = { role: ShareRole; signedAt: string };

// 서명 전 → 약정 내용 + 입력 + 서명. 내 서명 뒤 → 다른 사람 기다림(다시 서명 가능). 전원 서명 뒤 → 완료와 PDF.
export default function ShareSign({ code, role, signed, mine, completedAt }: { code: string; role: ShareRole; signed: SignedView[]; mine: { party: ShareParty; signature: string } | null; completedAt: string | null }) {
    const me = memberOf(role);
    const isCo = role === "mto";
    const mode: "complete" | "waiting" | "form" = completedAt ? "complete" : mine ? "waiting" : "form";

    const [c, setC] = useState({ company: COMPANY.name, ceo: COMPANY.ceo, bizNo: COMPANY.bizNo, address: COMPANY.address, email: "ceo@lawnald.com", signer: "" });
    const [q, setQ] = useState({ name: me.name, birth: "", phone: "", email: "", address: "", account: "" });
    const [agree, setAgree] = useState(false);
    const [hasInk, setHasInk] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const canvas = useRef<HTMLCanvasElement>(null);

    // 다른 사람은 서명 여부·시각만 보인다. 내 칸은 입력 중인 값(서명 뒤에는 서명한 값)을 보여 준다.
    const paper = useMemo(() => {
        const views: ShareSignView[] = signed.filter((s) => s.role !== role).map((s) => ({ role: s.role, party: {}, signedAt: new Date(s.signedAt) }));
        const minePaper: ShareSignView = mine
            ? { role, party: mine.party, signedAt: new Date(signed.find((s) => s.role === role)!.signedAt) }
            : { role, party: isCo ? c : q, signedAt: null };
        return buildShareContract([...views, minePaper]);
    }, [signed, role, mine, isCo, c, q]);

    const setCo = (k: keyof typeof c) => (ev: React.ChangeEvent<HTMLInputElement>) => setC((s) => ({ ...s, [k]: ev.target.value }));
    const setPe = (k: keyof typeof q) => (ev: React.ChangeEvent<HTMLInputElement>) => setQ((s) => ({ ...s, [k]: ev.target.value }));

    // 서명 패드: 광고 계약서 서명 화면과 같은 방식(포인터 이벤트, 화면 밀도 반영).
    useEffect(() => {
        const el = canvas.current;
        if (!el) return;
        const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const rect = el.getBoundingClientRect();
        el.width = Math.round(rect.width * ratio);
        el.height = Math.round(rect.height * ratio);
        const ctx = el.getContext("2d")!;
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
        let drawing = false;
        const pos = (ev: PointerEvent) => { const r = el.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top] as const; };
        const down = (ev: PointerEvent) => { drawing = true; el.setPointerCapture(ev.pointerId); const [x, y] = pos(ev); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); setHasInk(true); };
        const move = (ev: PointerEvent) => { if (!drawing) return; const [x, y] = pos(ev); ctx.lineTo(x, y); ctx.stroke(); };
        const up = () => { drawing = false; };
        el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
        return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
    }, [mode]);

    const clearInk = () => {
        const el = canvas.current;
        if (!el) return;
        el.getContext("2d")!.clearRect(0, 0, el.width, el.height);
        setHasInk(false);
    };

    const problem = isCo
        ? (c.company.trim().length < 2 ? "상호를 입력해 주세요." :
            c.ceo.trim().length < 2 ? "대표자 성명을 입력해 주세요." :
            !BIZNO_RE.test(c.bizNo.trim()) ? "사업자등록번호 10자리를 입력해 주세요." :
            c.address.trim().length < 5 ? "주소를 입력해 주세요." :
            c.email.trim() && !isValidEmail(c.email) ? "이메일을 확인해 주세요." :
            c.signer.trim().length < 2 ? "서명하는 분의 성명을 입력해 주세요." : "")
        : (q.name.trim().length < 2 ? "성명을 입력해 주세요." :
            !BIRTH_RE.test(q.birth.trim()) ? "생년월일을 1990-01-01 처럼 입력해 주세요." :
            !PHONE_RE.test(q.phone.trim()) ? "휴대폰 번호를 확인해 주세요." :
            q.email.trim() && !isValidEmail(q.email) ? "이메일을 확인해 주세요." :
            q.account.replace(/\D/g, "").length < 8 ? "정산받을 계좌(은행, 계좌번호)를 입력해 주세요." : "");
    const blocker = problem || (!hasInk ? "서명란에 서명해 주세요." : !agree ? "약정 내용에 동의해 주세요." : "");

    const submit = async () => {
        if (blocker) { setErr(blocker); return; }
        setBusy(true); setErr("");
        try {
            const signature = canvas.current!.toDataURL("image/png");
            const res = await fetch(`/api/deepmakai/share/${code}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...(isCo ? c : q), signature, agree }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || "서명을 저장하지 못했습니다.");
            window.location.reload();
        } catch (ex) {
            setErr(ex instanceof Error ? ex.message : "서명을 저장하지 못했습니다.");
            setBusy(false);
        }
    };

    const resign = async () => {
        if (!window.confirm("내 서명을 지우고 다시 서명할까요?")) return;
        const res = await fetch(`/api/deepmakai/share/${code}`, { method: "DELETE" });
        if (res.ok) window.location.reload();
        else setErr((await res.json()).error || "지우지 못했습니다.");
    };

    const field = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-black/50";
    const contact = "문의: 딥마카이 PD 김원영 · ceo@lawnald.com · 010-8935-3010";
    const signedCount = signed.length;

    return (
        <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
            <header className="mb-6">
                <p className="text-[12px] font-semibold tracking-[0.18em] text-black/50">DEEP MAKAI</p>
                <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[30px]">광고 수익 배분 전자 약정서</h1>
                {mode === "form" && <p className="mt-2 text-[14px] text-black/60">{me.name}{isCo ? "" : " 님"} 서명 화면입니다. 약정 내용을 확인하고 정보를 넣은 뒤 서명해 주세요. 다섯 명이 모두 서명하면 약정서 PDF가 이메일로 발송됩니다.</p>}
            </header>

            <section className="mb-6 rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] font-bold">{mode === "complete" ? "다섯 명 모두 서명 완료" : `서명 ${signedCount}/${SHARE.members.length}`}</p>
                    {mode === "waiting" && <button type="button" onClick={resign} className="text-[13px] text-black/60 underline">내 서명 다시 하기</button>}
                </div>
                <ul className="mt-3 grid gap-2 text-[14px] sm:grid-cols-5">
                    {SHARE.members.map((m) => {
                        const s = signed.find((x) => x.role === m.role);
                        return (
                            <li key={m.role} className={`rounded-xl px-3 py-2 ${s ? "bg-emerald-50 text-emerald-900" : "bg-black/[0.04] text-black/60"}`}>
                                <span className="block font-semibold">{m.name}{m.role === role ? " (나)" : ""}</span>
                                <span className="block text-[12px]">{m.rate} · {s ? "서명함" : "서명 전"}</span>
                            </li>
                        );
                    })}
                </ul>
                {mode === "waiting" && <p className="mt-3 text-[13px] text-black/60">내 서명은 끝났습니다({kstDateTime(new Date(signed.find((s) => s.role === role)!.signedAt))}). 나머지 분들이 서명하면 약정서 PDF가 {mine?.party.email ? <b>{mine.party.email}</b> : "이메일을 적은 분들"}로 발송됩니다.</p>}
                {mode === "complete" && (
                    <div className="mt-4">
                        <p className="text-[13px] text-black/60">{kstDateTime(new Date(completedAt!))}에 마지막 서명이 들어와 약정이 성립했습니다.</p>
                        <a href={`/api/deepmakai/share/${code}/pdf`} className="mt-3 inline-flex rounded-lg bg-[#16171A] px-4 py-2.5 text-[14px] font-semibold text-white">약정서 PDF 내려받기</a>
                    </div>
                )}
                {mode === "waiting" && err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700">{err}</p>}
            </section>

            <section className="mb-6 rounded-2xl border border-black/10 bg-white">
                <div className="max-h-[52vh] overflow-y-auto px-5 py-6 text-[14px] leading-[1.75] sm:px-8">
                    <h2 className="mb-4 text-center text-[19px] font-bold">{paper.title}</h2>
                    <p className="mb-4">{paper.preamble}</p>
                    <p className="mb-4 text-center">다 음</p>
                    {paper.articles.map((a) => (
                        <div key={a.heading} className="mb-4">
                            <p className="font-bold">{a.heading}</p>
                            {a.lines.length > 1
                                ? <ol className="list-decimal pl-5">{a.lines.map((l) => <li key={l}>{l}</li>)}</ol>
                                : <p>{a.lines[0]}</p>}
                        </div>
                    ))}
                    <div className="mt-6 border-t border-black/10 pt-4">
                        <Rows title="배분 예시 (광고비 170만 원일 때)" rows={paper.example} />
                        <p className="mt-4 font-bold">{paper.dateLine}</p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            {paper.parties.map((pt) => (
                                <div key={pt.role}>
                                    <Rows title={pt.title} rows={pt.rows} />
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {pt.role === role && mine && <img src={mine.signature} alt="내 서명" className="mt-2 h-14 w-auto" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {mode === "form" && (
                <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
                    {isCo ? (
                        <>
                            <h2 className="text-[17px] font-bold">메이크디스원 사업자 정보</h2>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <L label="상호 *"><input className={field} value={c.company} onChange={setCo("company")} /></L>
                                <L label="대표자 *"><input className={field} value={c.ceo} onChange={setCo("ceo")} /></L>
                                <L label="사업자등록번호 *"><input className={field} value={c.bizNo} onChange={setCo("bizNo")} inputMode="numeric" /></L>
                                <L label="약정서 받을 이메일"><input className={field} value={c.email} onChange={setCo("email")} type="email" /></L>
                                <L label="주소 *" wide><input className={field} value={c.address} onChange={setCo("address")} /></L>
                                <L label="서명하는 분 성명 *"><input className={field} value={c.signer} onChange={setCo("signer")} placeholder="대표자 또는 위임받은 사람" /></L>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-[17px] font-bold">내 정보</h2>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <L label="성명 *"><input className={field} value={q.name} onChange={setPe("name")} autoComplete="name" /></L>
                                <L label="생년월일 *"><input className={field} value={q.birth} onChange={setPe("birth")} placeholder="1990-01-01" inputMode="numeric" /></L>
                                <L label="휴대폰 *"><input className={field} value={q.phone} onChange={setPe("phone")} placeholder="010-0000-0000" inputMode="tel" autoComplete="tel" /></L>
                                <L label="약정서 받을 이메일"><input className={field} value={q.email} onChange={setPe("email")} type="email" autoComplete="email" /></L>
                                <L label="주소" wide><input className={field} value={q.address} onChange={setPe("address")} autoComplete="street-address" /></L>
                                <L label="정산받을 계좌 * (본인 명의)" wide><input className={field} value={q.account} onChange={setPe("account")} placeholder="은행 이름, 계좌번호" /></L>
                            </div>
                            <p className="mt-2 text-[12px] leading-relaxed text-black/50">계좌는 정산용으로 메이크디스원만 보며 약정서에는 들어가지 않습니다. 원천징수 신고에 필요한 주민등록번호는 여기 적지 말고 따로 알려 주세요.</p>
                        </>
                    )}

                    <h2 className="mt-7 text-[17px] font-bold">서명</h2>
                    <div className="mt-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-black/60">아래 칸에 손가락이나 마우스로 서명해 주세요 *</span>
                            <button type="button" onClick={clearInk} className="text-[13px] text-black/50 underline">지우기</button>
                        </div>
                        <canvas ref={canvas} className="mt-1.5 h-[160px] w-full touch-none rounded-lg border border-dashed border-black/25 bg-[#FBFBFA]" />
                    </div>

                    <label className="mt-5 flex items-start gap-2.5 text-[14px] leading-snug">
                        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agree} onChange={(ev) => setAgree(ev.target.checked)} />
                        <span>위 약정 내용을 모두 확인했으며, 전자서명으로 약정을 체결하는 데 동의합니다.</span>
                    </label>

                    {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700">{err}</p>}
                    <button type="button" onClick={submit} disabled={busy}
                        className="mt-5 w-full rounded-xl bg-[#16171A] py-3.5 text-[16px] font-bold text-white disabled:opacity-50">
                        {busy ? "서명 저장 중…" : "동의하고 서명하기"}
                    </button>
                    <p className="mt-3 text-[12px] leading-relaxed text-black/45">서명 시각, 접속 IP와 입력한 정보가 약정 기록으로 보관됩니다. {contact}</p>
                </section>
            )}
            {mode !== "form" && <p className="text-center text-[13px] text-black/50">{contact}</p>}
        </main>
    );
}

function Rows({ title, rows }: { title: string; rows: [string, string][] }) {
    return (
        <div>
            <p className="mb-1 font-bold">{title}</p>
            <dl className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5 text-[13px]">
                {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-black/50">{k}</dt><dd>{v}</dd></div>)}
            </dl>
        </div>
    );
}

function L({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
    return (
        <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
            <span className="mb-1 block text-[13px] text-black/60">{label}</span>
            {children}
        </label>
    );
}
