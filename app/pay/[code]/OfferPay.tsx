"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { Check, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildContract, isValidEmail, resolveProduct, won } from "@/lib/makethisone/contract";
import type { ClientOffer, offerPrices } from "@/lib/makethisone/offers";

type Prices = ReturnType<typeof offerPrices>;
type Mode = "monthly" | "lump";

// 메이크디스원 공식 홈페이지 색(app/renewal/kinetic.css 의 --mt-*)
const C = { accent: "#004AAD", accentSub: "#00377F", ink: "#071526", gray: "#485971", surface: "#F1F5FB", line: "#C9D5E6" };

export default function OfferPay({ code, offer, prices }: { code: string; offer: ClientOffer; prices: Prices }) {
    const search = useSearchParams();
    const [mode, setMode] = useState<Mode | null>(null);
    const [name, setName] = useState(offer.client);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [toss, setToss] = useState<any>(null);

    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();
        if (key) loadTossPayments(key).then(setToss).catch(console.error);
    }, []);

    // 결제창에서 돌아온 실패·취소
    useEffect(() => {
        if (search.get("fail")) {
            const msg = search.get("message");
            toast.error(msg ? `결제가 완료되지 않았습니다: ${msg}` : "결제가 완료되지 않았습니다. 다시 시도해 주세요.");
        }
    }, [search]);

    const kind = mode === "monthly" ? "plan" : "pack";
    const productId = mode === "monthly" ? prices.monthly.id : prices.lump.id;
    const product = mode ? resolveProduct(kind, productId) : null;
    const party = { name: name.trim(), email: email.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) };
    const paper = useMemo(() => (product ? buildContract({ product, party, agreedAt: new Date() }) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [mode, party.name, party.email, party.phone]);
    const emailOk = isValidEmail(email);
    const ready = !!mode && name.trim().length >= 2 && emailOk && agreed;
    const payAmount = mode === "monthly" ? prices.monthly.price : mode === "lump" ? prices.lump.price : 0;

    const body = () => JSON.stringify({ kind, productId, name, email, phone, offerCode: code });

    const downloadPdf = async () => {
        if (!mode) return;
        setDownloading(true);
        try {
            const res = await fetch("/api/makethisone/contract/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: body() });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                toast.error(d.error || "계약서 PDF 를 만들지 못했습니다.");
                return;
            }
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = `광고업무대행계약서_${offer.client}_미리보기.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch {
            toast.error("계약서 PDF 를 내려받지 못했습니다.");
        } finally {
            setDownloading(false);
        }
    };

    const pay = async () => {
        if (!ready || !mode) return;
        if (!toss) {
            toast.error("결제 모듈을 불러오는 중입니다. 잠시 후 다시 눌러 주세요.");
            return;
        }
        setBusy(true);
        // 1) 전자계약 동의 기록 — 결제가 끝나면 이 계약서를 PDF 로 이메일에 보낸다
        let contractId = "";
        try {
            const res = await fetch("/api/makethisone/contract", { method: "POST", headers: { "Content-Type": "application/json" }, body: body() });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.contractId) throw new Error(d.error || "계약을 저장하지 못했습니다.");
            contractId = String(d.contractId);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "계약을 저장하지 못했습니다.");
            setBusy(false);
            return;
        }
        // 2) 결제창
        const origin = window.location.origin;
        const failUrl = `${origin}/pay/${code}?fail=1`;
        const onError = (err: any) => {
            setBusy(false);
            if (err?.code === "USER_CANCEL") toast.info("결제를 취소했습니다.");
            else toast.error(`결제 오류: ${err?.message || "알 수 없는 오류"}`);
        };
        if (mode === "monthly") {
            const customerKey = `mto_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            toss.requestBillingAuth("카드", {
                customerKey,
                successUrl: `${origin}/pay/${code}/done?mode=monthly&plan=${prices.monthly.id}&customerKey=${customerKey}&contract=${contractId}`,
                failUrl,
            }).catch(onError);
        } else {
            const orderId = `otp_${prices.lump.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            toss.requestPayment("카드", {
                amount: prices.lump.price,
                orderId,
                orderName: `메이크디스원 ${offer.client} ${offer.months}개월`,
                customerName: name.trim(),
                customerEmail: email.trim(),
                successUrl: `${origin}/pay/${code}/done?mode=lump&contract=${contractId}`,
                failUrl,
            }).catch(onError);
        }
    };

    const monthlySupply = offer.monthlySupply;
    const supplyMan = Math.round(monthlySupply / 10000);

    return (
        <main className="min-h-screen" style={{ background: C.surface, color: C.ink }}>
            {/* 머리 */}
            <header style={{ background: C.accent }} className="text-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pt-14 sm:pb-20">
                    <p className="text-xs sm:text-sm font-bold tracking-[0.2em] text-[#D4E3F8]">MAKETHIS1 · 전용 결제</p>
                    <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">{offer.client}</h1>
                    <p className="mt-3 text-base sm:text-lg text-[#E1EBFA]">{offer.headline}</p>
                    <div className="mt-8 flex items-end gap-2">
                        <span className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-none">{supplyMan}</span>
                        <span className="text-xl sm:text-2xl font-bold mb-1">만원 / 월</span>
                    </div>
                    <p className="mt-3 text-sm text-[#E1EBFA]">부가세 별도 · 랜딩페이지 제작비와 유튜브 편집비는 받지 않습니다</p>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 pb-24 space-y-5">
                {/* 1. 결제 방식 */}
                <Card step="1" title="결제 방식 고르기">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Choice
                            active={mode === "monthly"}
                            onClick={() => { setMode("monthly"); setAgreed(false); }}
                            title="매월 결제"
                            price={`월 ${won(prices.monthly.price)}`}
                            lines={[
                                `오늘 첫 달분을 결제하고, 매월 같은 날 자동 결제`,
                                `${prices.monthly.count}회 결제 뒤 자동 결제 끝`,
                                `공급가 월 ${won(prices.monthly.supply)} + 부가세 ${won(prices.monthly.vat)}`,
                            ]}
                        />
                        <Choice
                            active={mode === "lump"}
                            onClick={() => { setMode("lump"); setAgreed(false); }}
                            title={`${offer.months}개월 한 번에`}
                            price={won(prices.lump.price)}
                            lines={[
                                `${offer.months}개월분을 오늘 한 번에 결제`,
                                "자동 결제 없음",
                                `공급가 ${won(prices.lump.supply)} + 부가세 ${won(prices.lump.vat)}`,
                            ]}
                        />
                    </div>
                    <p className="mt-3 text-xs" style={{ color: C.gray }}>두 방식 모두 {offer.months}개월 합계 금액은 같습니다(부가세 포함 {won(prices.lump.price)}).</p>
                </Card>

                {/* 포함 업무 */}
                <Card title="포함 업무">
                    <ul className="space-y-2.5">
                        {offer.items.map((it) => (
                            <li key={it} className="flex gap-2.5 text-sm leading-relaxed">
                                <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.accent }} />
                                <span>{it}</span>
                            </li>
                        ))}
                    </ul>
                </Card>

                {/* 2. 계약자 정보 */}
                <Card step="2" title="계약자 정보">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="광고주(사무소명)" required className="sm:col-span-2">
                            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputCls} />
                        </Field>
                        <Field label="계약서를 받을 이메일" required>
                            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} placeholder="name@example.com" className={inputCls} />
                            {email.trim() && !emailOk && <span className="block text-xs text-red-600 mt-1">이메일 주소를 다시 확인해 주세요.</span>}
                        </Field>
                        <Field label="연락처(선택)">
                            <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="010-0000-0000" className={inputCls} />
                        </Field>
                    </div>
                </Card>

                {/* 3. 전자계약 */}
                <Card step="3" title="계약서 확인·동의">
                    {!paper ? (
                        <p className="text-sm" style={{ color: C.gray }}>위에서 결제 방식을 고르면 그 방식에 맞는 계약서가 여기에 나옵니다.</p>
                    ) : (
                        <>
                            <div className="rounded-xl border bg-white p-4 sm:p-5 h-72 overflow-y-auto text-[13px] leading-relaxed space-y-3" style={{ borderColor: C.line, color: C.gray }}>
                                <p className="text-center text-base font-bold" style={{ color: C.ink }}>{paper.title}</p>
                                <p style={{ color: C.ink }}>{paper.preamble}</p>
                                {paper.articles.map((a) => (
                                    <div key={a.heading}>
                                        <p className="font-semibold mb-1" style={{ color: C.ink }}>{a.heading}</p>
                                        {a.lines.length === 1 ? <p>{a.lines[0]}</p> : (
                                            <ol className="space-y-1">
                                                {a.lines.map((l, i) => <li key={i} className="flex gap-1.5"><span className="flex-shrink-0">{i + 1}.</span><span>{l}</span></li>)}
                                            </ol>
                                        )}
                                    </div>
                                ))}
                                <p className="pt-2 border-t" style={{ borderColor: C.line }}>{paper.dateLine}</p>
                            </div>
                            <button type="button" onClick={downloadPdf} disabled={downloading}
                                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold disabled:opacity-50" style={{ color: C.accent }}>
                                {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} 계약서 PDF 미리 받기
                            </button>
                            <label className="mt-4 flex items-start gap-3 rounded-xl border bg-white p-4 cursor-pointer" style={{ borderColor: agreed ? C.accent : C.line }}>
                                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#004AAD]" />
                                <span className="text-sm leading-relaxed">위 계약서 내용을 확인했고 동의합니다. 결제를 마치면 계약이 성립하고, 계약서 PDF 를 입력한 이메일로 받습니다.</span>
                            </label>
                        </>
                    )}
                </Card>

                {/* 4. 결제 */}
                <div className="pt-2">
                    <button type="button" onClick={pay} disabled={!ready || busy}
                        className="w-full rounded-2xl py-4 text-base sm:text-lg font-bold text-white transition-opacity disabled:opacity-40"
                        style={{ background: C.accent }}>
                        {busy ? <span className="inline-flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> 결제창을 여는 중</span>
                            : mode ? `계약하고 ${won(payAmount)} 결제하기` : "결제 방식을 먼저 골라 주세요"}
                    </button>
                    <p className="mt-3 text-center text-xs leading-relaxed" style={{ color: C.gray }}>
                        {mode === "monthly"
                            ? `카드를 등록하면 오늘 ${won(prices.monthly.price)}이 결제되고, 다음 달부터 같은 날 자동 결제됩니다(총 ${prices.monthly.count}회).`
                            : mode === "lump" ? `${won(prices.lump.price)}이 한 번 결제되고 자동 결제는 없습니다.` : "토스페이먼츠 카드 결제"}
                    </p>
                </div>

                <footer className="pt-8 text-center text-xs" style={{ color: C.gray }}>
                    메이크디스원 · 대표 김정환 · 사업자등록번호 431-11-01233 · 서울특별시 동대문구 왕산로5길 13
                </footer>
            </div>
        </main>
    );
}

const inputCls = "w-full rounded-xl border border-[#C9D5E6] bg-white px-3.5 py-3 text-[15px] text-[#071526] placeholder:text-[#90A7C6] focus:outline-none focus:border-[#004AAD]";

function Card({ step, title, children }: { step?: string; title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(7,21,38,0.04)]" style={{ borderColor: C.line }}>
            <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold">
                {step && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm text-white" style={{ background: C.accent }}>{step}</span>}
                {title}
            </h2>
            {children}
        </section>
    );
}

function Choice({ active, onClick, title, price, lines }: { active: boolean; onClick: () => void; title: string; price: string; lines: string[] }) {
    return (
        <button type="button" onClick={onClick} aria-pressed={active}
            className="text-left rounded-xl border-2 p-4 sm:p-5 transition-colors"
            style={{ borderColor: active ? C.accent : C.line, background: active ? "#F1F5FB" : "#FFFFFF" }}>
            <div className="flex items-center justify-between">
                <span className="font-bold">{title}</span>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: active ? C.accent : C.line, background: active ? C.accent : "transparent" }}>
                    {active && <Check size={12} className="text-white" strokeWidth={3} />}
                </span>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: C.accent }}>{price}</p>
            <ul className="mt-2 space-y-1 text-[13px] leading-relaxed" style={{ color: C.gray }}>
                {lines.map((l) => <li key={l}>· {l}</li>)}
            </ul>
        </button>
    );
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
    return (
        <label className={`block ${className || ""}`}>
            <span className="mb-1.5 block text-sm font-semibold">{label} {required && <span style={{ color: C.accent }}>*</span>}</span>
            {children}
        </label>
    );
}
