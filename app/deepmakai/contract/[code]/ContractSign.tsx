"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildAdContract, vatOf, BIZNO_RE, type AdDeal } from "@/lib/deepmakai/ad-contract";
import { isValidEmail, kstDateTime, won } from "@/lib/makethisone/contract";

type Done = { id: string; email: string; mailed: boolean; signedAt: string };

export default function ContractSign({ deal, signed }: { deal: AdDeal; signed: { at: string; company: string } | null }) {
    const [f, setF] = useState({
        company: deal.prefill.company || "", ceo: deal.prefill.ceo || "", bizNo: "", address: deal.prefill.address || "",
        manager: deal.prefill.manager || "", email: deal.prefill.email || "", phone: "", signer: "",
    });
    const [agree, setAgree] = useState(false);
    const [hasInk, setHasInk] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [done, setDone] = useState<Done | null>(null);
    const canvas = useRef<HTMLCanvasElement>(null);

    const paper = useMemo(() => buildAdContract(deal, f, null), [deal, f]);
    const vat = vatOf(deal.supplyPrice), total = deal.supplyPrice + vat;
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

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
        const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
        const down = (e: PointerEvent) => { drawing = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); setHasInk(true); };
        const move = (e: PointerEvent) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); };
        const up = () => { drawing = false; };
        c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move);
        c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
        return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up); };
    }, [signed, done]);

    const clearInk = () => {
        const c = canvas.current;
        if (!c) return;
        c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
        setHasInk(false);
    };

    const problem =
        f.company.trim().length < 2 ? "상호를 입력해 주세요." :
        f.ceo.trim().length < 2 ? "대표자 성명을 입력해 주세요." :
        !BIZNO_RE.test(f.bizNo.trim()) ? "사업자등록번호 10자리를 입력해 주세요." :
        f.address.trim().length < 5 ? "주소를 입력해 주세요." :
        !isValidEmail(f.email) ? "계약서를 받을 이메일을 확인해 주세요." :
        f.signer.trim().length < 2 ? "서명하는 분의 성명을 입력해 주세요." :
        !hasInk ? "서명란에 서명해 주세요." :
        !agree ? "계약 내용에 동의해 주세요." : "";

    const submit = async () => {
        if (problem) { setErr(problem); return; }
        setBusy(true); setErr("");
        try {
            const res = await fetch(`/api/deepmakai/contract/${deal.code}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...f, signature: canvas.current!.toDataURL("image/png"), agree }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || "서명을 저장하지 못했습니다.");
            setDone(j);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            setErr(e instanceof Error ? e.message : "서명을 저장하지 못했습니다.");
        } finally {
            setBusy(false);
        }
    };

    const field = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-black/50";

    return (
        <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
            <header className="mb-6">
                <p className="text-[12px] font-semibold tracking-[0.18em] text-black/50">DEEP MAKAI × {deal.brand}</p>
                <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[30px]">유튜브 광고(PPL) 전자계약서</h1>
                <p className="mt-2 text-[14px] text-black/60">아래 계약 내용을 확인하고 광고주 정보를 입력한 뒤 서명해 주세요. 서명하면 계약서 PDF가 입력한 이메일로 발송됩니다.</p>
            </header>

            {(signed || done) ? (
                <section className="rounded-2xl border border-black/10 bg-white p-6">
                    <p className="text-[13px] font-semibold text-emerald-700">서명 완료</p>
                    <h2 className="mt-1 text-[20px] font-bold">{done ? "계약서 서명이 끝났습니다" : "이미 서명이 끝난 계약입니다"}</h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-black/70">
                        {done
                            ? <>{kstDateTime(new Date(done.signedAt))}에 서명했습니다. {done.mailed ? <>계약서 PDF를 <b>{done.email}</b>로 보냈습니다.</> : <>계약서 PDF는 아래에서 내려받을 수 있습니다.</>}</>
                            : <>{signed!.company} · {kstDateTime(new Date(signed!.at))} 서명. 계약서는 서명 때 입력한 이메일로 발송되었습니다.</>}
                    </p>
                    {done && (
                        <a href={`/api/deepmakai/contract/${deal.code}/pdf?id=${done.id}`} className="mt-4 inline-flex rounded-lg bg-[#16171A] px-4 py-2.5 text-[14px] font-semibold text-white">계약서 PDF 내려받기</a>
                    )}
                    <p className="mt-4 text-[13px] text-black/50">문의: 딥마카이 PD 김원영 · ceo@lawnald.com · 010-8935-3010</p>
                </section>
            ) : (
                <>
                    <section className="mb-6 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-3">
                        <div><p className="text-[12px] text-black/50">게재 콘텐츠</p><p className="mt-0.5 text-[14px] font-semibold leading-snug">{deal.episode.replace(/^‘딥캐스트’ /, "딥캐스트 ")}</p></div>
                        <div><p className="text-[12px] text-black/50">일정</p><p className="mt-0.5 text-[14px] font-semibold leading-snug">{deal.shootDate} 촬영 · 11월 첫째 주 공개</p></div>
                        <div><p className="text-[12px] text-black/50">광고비 (부가세 별도)</p><p className="mt-0.5 text-[14px] font-semibold leading-snug">{won(deal.supplyPrice)} <span className="font-normal text-black/50">· 합계 {won(total)}</span></p></div>
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
                                <Rows title="광고 수행자(을)" rows={paper.eul} />
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
                        <h2 className="text-[17px] font-bold">광고주(갑) 정보</h2>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <L label="상호 *"><input className={field} value={f.company} onChange={set("company")} autoComplete="organization" /></L>
                            <L label="대표자 *"><input className={field} value={f.ceo} onChange={set("ceo")} /></L>
                            <L label="사업자등록번호 *"><input className={field} value={f.bizNo} onChange={set("bizNo")} placeholder="000-00-00000" inputMode="numeric" /></L>
                            <L label="담당자"><input className={field} value={f.manager} onChange={set("manager")} /></L>
                            <L label="주소 *" wide><input className={field} value={f.address} onChange={set("address")} autoComplete="street-address" /></L>
                            <L label="계약서 받을 이메일 *"><input className={field} value={f.email} onChange={set("email")} type="email" autoComplete="email" /></L>
                            <L label="연락처"><input className={field} value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" /></L>
                        </div>

                        <h2 className="mt-7 text-[17px] font-bold">서명</h2>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <L label="서명하는 분 성명 *"><input className={field} value={f.signer} onChange={set("signer")} placeholder="대표자 또는 위임받은 담당자" /></L>
                        </div>
                        <div className="mt-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] text-black/60">아래 칸에 손가락이나 마우스로 서명해 주세요 *</span>
                                <button type="button" onClick={clearInk} className="text-[13px] text-black/50 underline">지우기</button>
                            </div>
                            <canvas ref={canvas} className="mt-1.5 h-[160px] w-full touch-none rounded-lg border border-dashed border-black/25 bg-[#FBFBFA]" />
                        </div>

                        <label className="mt-5 flex items-start gap-2.5 text-[14px] leading-snug">
                            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                            <span>위 계약 내용을 모두 확인했으며, 전자서명으로 계약을 체결하는 데 동의합니다.</span>
                        </label>

                        {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700">{err}</p>}
                        <button type="button" onClick={submit} disabled={busy}
                            className="mt-5 w-full rounded-xl bg-[#16171A] py-3.5 text-[16px] font-bold text-white disabled:opacity-50">
                            {busy ? "서명 저장 중…" : "동의하고 서명하기"}
                        </button>
                        <p className="mt-3 text-[12px] leading-relaxed text-black/45">서명 시각, 접속 IP와 입력한 정보가 계약 기록으로 보관됩니다. 문의: 딥마카이 PD 김원영 · ceo@lawnald.com · 010-8935-3010</p>
                    </section>
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
