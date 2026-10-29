"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildAdContract, vatOf, BIZNO_RE, type AdDeal, type EulParty } from "@/lib/deepmakai/ad-contract";
import { isValidEmail, kstDateTime, won } from "@/lib/makethisone/contract";

type Done = { id: string; email: string; mailed: boolean; signedAt: string };
export type EulView = { party: EulParty; signedAt: string; signature: string };

// 을 링크: 을 서명 → (서명 뒤) 을 서명 완료. 광고주 링크: 을 서명 전 '준비 중' → 광고주 서명 → 완료.
export default function ContractSign({ deal, code, role, account, signed, eul }: { deal: AdDeal; code: string; role: "gap" | "eul"; account: string; signed: { at: string; company: string } | null; eul: EulView | null }) {
    const [done, setDone] = useState<Done | null>(null);
    const mode: "done" | "eul" | "eulDone" | "pending" | "gap" = signed || done ? "done" : role === "eul" ? (eul ? "eulDone" : "eul") : eul ? "gap" : "pending";

    const [g, setG] = useState({
        company: deal.prefill.company || "", ceo: deal.prefill.ceo || "", bizNo: "", address: deal.prefill.address || "",
        manager: deal.prefill.manager || "", email: deal.prefill.email || "", phone: "", signer: "",
    });
    const [e, setE] = useState({ company: deal.eulPrefill.company || "", ceo: deal.eulPrefill.ceo || "", bizNo: deal.eulPrefill.bizNo || "", address: deal.eulPrefill.address || "", email: deal.eulPrefill.email || "", signer: "" });
    const [agree, setAgree] = useState(false);
    const [hasInk, setHasInk] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const canvas = useRef<HTMLCanvasElement>(null);

    const paper = useMemo(() => buildAdContract(deal, g, null,
        eul ? { party: eul.party, signedAt: new Date(eul.signedAt) } : mode === "eul" ? { party: e, signedAt: null } : null, { account }), [deal, g, e, eul, mode, account]);
    const vat = vatOf(deal.supplyPrice), total = deal.supplyPrice + vat;
    const setGap = (k: keyof typeof g) => (ev: React.ChangeEvent<HTMLInputElement>) => setG((s) => ({ ...s, [k]: ev.target.value }));
    const setEul = (k: keyof typeof e) => (ev: React.ChangeEvent<HTMLInputElement>) => setE((s) => ({ ...s, [k]: ev.target.value }));

    // 서명 패드: 화면 밀도에 맞춰 캔버스 크기를 잡고, 마우스·터치를 같은 포인터 이벤트로 받는다.
    useEffect(() => {
        const c = canvas.current;
        if (!c) return;
        const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const rect = c.getBoundingClientRect();
        c.width = Math.round(rect.width * ratio);
        c.height = Math.round(rect.height * ratio);
        const ctx = c.getContext("2d")!;
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
        let drawing = false;
        const pos = (ev: PointerEvent) => { const r = c.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top] as const; };
        const down = (ev: PointerEvent) => { drawing = true; c.setPointerCapture(ev.pointerId); const [x, y] = pos(ev); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); setHasInk(true); };
        const move = (ev: PointerEvent) => { if (!drawing) return; const [x, y] = pos(ev); ctx.lineTo(x, y); ctx.stroke(); };
        const up = () => { drawing = false; };
        c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move);
        c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
        return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up); };
    }, [mode]);

    const clearInk = () => {
        const c = canvas.current;
        if (!c) return;
        c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
        setHasInk(false);
    };

    const problem = mode === "eul"
        ? (e.company.trim().length < 2 ? "상호를 입력해 주세요." :
            e.ceo.trim().length < 2 ? "대표자 성명을 입력해 주세요." :
            !BIZNO_RE.test(e.bizNo.trim()) ? "사업자등록번호 10자리를 입력해 주세요." :
            e.address.trim().length < 5 ? "주소를 입력해 주세요." :
            e.email.trim() && !isValidEmail(e.email) ? "이메일을 확인해 주세요." :
            e.signer.trim().length < 2 ? "서명하는 분의 성명을 입력해 주세요." :
            !hasInk ? "서명란에 서명해 주세요." : "")
        : (g.company.trim().length < 2 ? "상호를 입력해 주세요." :
            g.ceo.trim().length < 2 ? "대표자 성명을 입력해 주세요." :
            !BIZNO_RE.test(g.bizNo.trim()) ? "사업자등록번호 10자리를 입력해 주세요." :
            g.address.trim().length < 5 ? "주소를 입력해 주세요." :
            !isValidEmail(g.email) ? "계약서를 받을 이메일을 확인해 주세요." :
            g.signer.trim().length < 2 ? "서명하는 분의 성명을 입력해 주세요." :
            !hasInk ? "서명란에 서명해 주세요." :
            !agree ? "계약 내용에 동의해 주세요." : "");

    const submit = async () => {
        if (problem) { setErr(problem); return; }
        setBusy(true); setErr("");
        try {
            const signature = canvas.current!.toDataURL("image/png");
            const res = await fetch(`/api/deepmakai/contract/${code}${mode === "eul" ? "/eul" : ""}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mode === "eul" ? { ...e, signature } : { ...g, signature, agree }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || "서명을 저장하지 못했습니다.");
            if (mode === "eul") { window.location.reload(); return; }
            setDone(j);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (ex) {
            setErr(ex instanceof Error ? ex.message : "서명을 저장하지 못했습니다.");
        } finally {
            setBusy(false);
        }
    };

    const resetEul = async () => {
        if (!window.confirm("을 서명을 지우고 다시 서명할까요? 광고주에게는 다시 서명할 때까지 '준비 중'으로 보입니다.")) return;
        const res = await fetch(`/api/deepmakai/contract/${code}/eul`, { method: "DELETE" });
        if (res.ok) window.location.reload();
        else setErr((await res.json()).error || "지우지 못했습니다.");
    };

    const field = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-black/50";
    const contact = "문의: 딥마카이 PD 김원영 · ceo@lawnald.com · 010-8935-3010";

    return (
        <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
            <header className="mb-6">
                <p className="text-[12px] font-semibold tracking-[0.18em] text-black/50">DEEP MAKAI × {deal.brand}</p>
                <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[30px]">유튜브 광고(PPL) 전자계약서</h1>
                {mode === "gap" && <p className="mt-2 text-[14px] text-black/60">아래 계약 내용을 확인하고 광고주 정보를 입력한 뒤 서명해 주세요. 서명하면 계약서 PDF가 입력한 이메일로 발송됩니다.</p>}
                {mode === "eul" && <p className="mt-2 text-[14px] text-black/60">을 서명 화면입니다. 계약 내용을 확인하고 사업자 정보를 넣은 뒤 서명해 주세요. 을이 서명해야 광고주가 서명할 수 있습니다.</p>}
            </header>

            {mode === "eulDone" && (
                <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-600/30 bg-emerald-50 px-5 py-4 text-[14px]">
                    <span>을 서명 완료({eul!.party.signer} · {kstDateTime(new Date(eul!.signedAt))}). 이제 광고주가 서명할 수 있습니다.</span>
                    <button type="button" onClick={resetEul} className="text-[13px] text-black/60 underline">을 서명 다시 하기</button>
                </section>
            )}
            {mode === "eulDone" && err && <p className="mb-6 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700">{err}</p>}

            {mode === "done" ? (
                <section className="rounded-2xl border border-black/10 bg-white p-6">
                    <p className="text-[13px] font-semibold text-emerald-700">서명 완료</p>
                    <h2 className="mt-1 text-[20px] font-bold">{done ? "계약서 서명이 끝났습니다" : "이미 서명이 끝난 계약입니다"}</h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-black/70">
                        {done
                            ? <>{kstDateTime(new Date(done.signedAt))}에 서명했습니다. {done.mailed ? <>양측이 서명한 계약서 PDF를 <b>{done.email}</b>로 보냈습니다.</> : <>계약서 PDF는 아래에서 내려받을 수 있습니다.</>}</>
                            : <>{signed!.company} · {kstDateTime(new Date(signed!.at))} 서명. 계약서는 서명 때 입력한 이메일로 발송되었습니다.</>}
                    </p>
                    {done && <a href={`/api/deepmakai/contract/${code}/pdf?id=${done.id}`} className="mt-4 inline-flex rounded-lg bg-[#16171A] px-4 py-2.5 text-[14px] font-semibold text-white">계약서 PDF 내려받기</a>}
                    <p className="mt-4 text-[13px] text-black/50">{contact}</p>
                </section>
            ) : mode === "pending" ? (
                <section className="rounded-2xl border border-black/10 bg-white p-6">
                    <h2 className="text-[20px] font-bold">계약서를 준비하고 있습니다</h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-black/70">딥마카이 쪽 서명이 끝나면 이 주소에서 계약 내용을 확인하고 서명하실 수 있습니다.</p>
                    <p className="mt-4 text-[13px] text-black/50">{contact}</p>
                </section>
            ) : (
                <>
                    <section className="mb-6 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-3">
                        <div><p className="text-[12px] text-black/50">게재 콘텐츠</p><p className="mt-0.5 text-[14px] font-semibold leading-snug">{deal.episodeShort || deal.episode.replace(/^‘딥캐스트’ /, "딥캐스트 ")}</p></div>
                        <div><p className="text-[12px] text-black/50">일정</p><p className="mt-0.5 text-[14px] font-semibold leading-snug">{deal.shootDate} 촬영 · 11월 첫째 주 공개</p></div>
                        <div><p className="text-[12px] text-black/50">광고비 (부가세 별도)</p><p className="mt-0.5 text-[14px] font-semibold leading-snug">{won(deal.supplyPrice)} <span className="font-normal text-black/50">· 합계 {won(total)}</span>{deal.secondUse && deal.adPrice && <span className="block text-[12px] font-normal text-black/50">회차 {won(deal.adPrice)} + 2차 활용 {won(deal.secondUse.price)}</span>}</p></div>
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
                            <div className="mt-6 grid gap-4 border-t border-black/10 pt-4 sm:grid-cols-2">
                                <Rows title="광고비" rows={paper.money} />
                                <div>
                                    <Rows title="광고 수행자(을)" rows={paper.eul} />
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {eul && <img src={eul.signature} alt="을 서명" className="mt-2 h-14 w-auto" />}
                                </div>
                            </div>
                        </div>
                    </section>

                    {mode !== "eulDone" && <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
                        {mode === "eul" ? (
                            <>
                                <h2 className="text-[17px] font-bold">을 사업자 정보</h2>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <L label="상호 *"><input className={field} value={e.company} onChange={setEul("company")} /></L>
                                    <L label="대표자 *"><input className={field} value={e.ceo} onChange={setEul("ceo")} /></L>
                                    <L label="사업자등록번호 *"><input className={field} value={e.bizNo} onChange={setEul("bizNo")} placeholder="000-00-00000" inputMode="numeric" /></L>
                                    <L label="계약서 사본 받을 이메일"><input className={field} value={e.email} onChange={setEul("email")} type="email" /></L>
                                    <L label="주소 *" wide><input className={field} value={e.address} onChange={setEul("address")} /></L>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-[17px] font-bold">광고주(갑) 정보</h2>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <L label="상호 *"><input className={field} value={g.company} onChange={setGap("company")} autoComplete="organization" /></L>
                                    <L label="대표자 *"><input className={field} value={g.ceo} onChange={setGap("ceo")} /></L>
                                    <L label="사업자등록번호 *"><input className={field} value={g.bizNo} onChange={setGap("bizNo")} placeholder="000-00-00000" inputMode="numeric" /></L>
                                    <L label="담당자"><input className={field} value={g.manager} onChange={setGap("manager")} /></L>
                                    <L label="주소 *" wide><input className={field} value={g.address} onChange={setGap("address")} autoComplete="street-address" /></L>
                                    <L label="계약서 받을 이메일 *"><input className={field} value={g.email} onChange={setGap("email")} type="email" autoComplete="email" /></L>
                                    <L label="연락처"><input className={field} value={g.phone} onChange={setGap("phone")} inputMode="tel" autoComplete="tel" /></L>
                                </div>
                            </>
                        )}

                        <h2 className="mt-7 text-[17px] font-bold">서명</h2>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {mode === "eul"
                                ? <L label="서명하는 분 성명 *"><input className={field} value={e.signer} onChange={setEul("signer")} placeholder="대표자 또는 위임받은 사람" /></L>
                                : <L label="서명하는 분 성명 *"><input className={field} value={g.signer} onChange={setGap("signer")} placeholder="대표자 또는 위임받은 담당자" /></L>}
                        </div>
                        <div className="mt-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] text-black/60">아래 칸에 손가락이나 마우스로 서명해 주세요 *</span>
                                <button type="button" onClick={clearInk} className="text-[13px] text-black/50 underline">지우기</button>
                            </div>
                            <canvas ref={canvas} className="mt-1.5 h-[160px] w-full touch-none rounded-lg border border-dashed border-black/25 bg-[#FBFBFA]" />
                        </div>

                        {mode === "gap" && (
                            <label className="mt-5 flex items-start gap-2.5 text-[14px] leading-snug">
                                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agree} onChange={(ev) => setAgree(ev.target.checked)} />
                                <span>위 계약 내용을 모두 확인했으며, 전자서명으로 계약을 체결하는 데 동의합니다.</span>
                            </label>
                        )}

                        {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700">{err}</p>}
                        <button type="button" onClick={submit} disabled={busy}
                            className="mt-5 w-full rounded-xl bg-[#16171A] py-3.5 text-[16px] font-bold text-white disabled:opacity-50">
                            {busy ? "서명 저장 중…" : mode === "eul" ? "을로 서명하기" : "동의하고 서명하기"}
                        </button>
                        <p className="mt-3 text-[12px] leading-relaxed text-black/45">서명 시각, 접속 IP와 입력한 정보가 계약 기록으로 보관됩니다. {contact}</p>
                    </section>}
                </>
            )}
        </main>
    );
}

function Rows({ title, rows }: { title: string; rows: [string, string][] }) {
    return (
        <div>
            <p className="mb-1 font-bold">{title}</p>
            <dl className="grid grid-cols-[96px_1fr] gap-x-2 gap-y-0.5 text-[13px]">
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
