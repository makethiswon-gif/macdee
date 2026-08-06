"use client";

import { useEffect, useState } from "react";
import { Receipt, Loader2, ExternalLink, Copy, Check } from "lucide-react";

interface Payment {
    id: string;
    order_id: string;
    payment_key: string | null;
    amount: number;
    order_name: string | null;
    customer_name: string | null;
    customer_email: string | null;
    payment_type: string | null;
    receipt_url: string | null;
    status: string | null;
    credits: number | null;
    fulfilled: boolean | null;
    paid_at: string | null;
    created_at: string;
}

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
    credit: { label: "단건", cls: "bg-amber-500/15 text-amber-400" },
    subscription: { label: "구독 최초", cls: "bg-emerald-500/15 text-emerald-400" },
    subscription_recurring: { label: "정기 자동", cls: "bg-blue-500/15 text-blue-400" },
};

export default function AdminPaymentsPage() {
    const [items, setItems] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/payments", { credentials: "include" })
            .then((r) => r.json())
            .then((d) => setItems(d.items || []))
            .finally(() => setLoading(false));
    }, []);

    const copy = async (id: string, url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(id);
            setTimeout(() => setCopied(null), 1500);
        } catch { /* ignore */ }
    };

    const kw = q.trim().toLowerCase();
    const filtered = kw
        ? items.filter((it) =>
            [it.order_name, it.customer_name, it.customer_email, it.order_id, String(it.amount)]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(kw)),
        )
        : items;

    return (
        <div className="max-w-6xl">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#3563AE]/15 flex items-center justify-center">
                    <Receipt size={18} className="text-[#3563AE]" />
                </div>
                <h1 className="text-xl font-bold text-white">결제 · 영수증</h1>
            </div>
            <p className="text-[13px] text-[#6B7280] mb-6">모든 결제(단건·구독·정기 자동청구) 내역과 토스 영수증(매출전표) 링크입니다. 고객이 영수증을 요청하면 여기서 링크를 복사해 보내세요.</p>

            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="상품명·고객명·이메일·주문번호·금액 검색"
                className="w-full max-w-md mb-5 px-3 py-2 rounded-lg bg-[#0F1320] border border-[#1A2035] text-sm text-white placeholder:text-[#4B5563] outline-none focus:border-[#3563AE]"
            />

            {loading ? (
                <div className="flex items-center gap-2 text-[#6B7280] text-sm py-10"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
            ) : filtered.length === 0 ? (
                <div className="text-[#6B7280] text-sm py-10">결제 내역이 없습니다.{items.length === 0 && " (payments 테이블 마이그레이션 011 실행 여부를 확인하세요)"}</div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-[#1A2035]">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="bg-[#0F1320] text-[#6B7280] text-left">
                                <th className="px-3 py-2.5 font-medium whitespace-nowrap">결제일</th>
                                <th className="px-3 py-2.5 font-medium whitespace-nowrap">유형</th>
                                <th className="px-3 py-2.5 font-medium">상품</th>
                                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">금액</th>
                                <th className="px-3 py-2.5 font-medium">고객</th>
                                <th className="px-3 py-2.5 font-medium whitespace-nowrap">영수증</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((it) => {
                                const t = TYPE_LABEL[it.payment_type || "credit"] || { label: it.payment_type || "-", cls: "bg-white/10 text-white/60" };
                                return (
                                    <tr key={it.id} className="border-t border-[#1A2035] hover:bg-white/[0.02]">
                                        <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{(it.paid_at || it.created_at)?.slice(0, 10)}</td>
                                        <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${t.cls}`}>{t.label}</span></td>
                                        <td className="px-3 py-2.5 text-white/80">{it.order_name || "-"}{it.credits ? <span className="text-[#6B7280]"> · {it.credits}건</span> : null}</td>
                                        <td className="px-3 py-2.5 text-white font-semibold tabular-nums text-right whitespace-nowrap">{it.amount.toLocaleString()}원</td>
                                        <td className="px-3 py-2.5 text-white/60">{it.customer_name || "-"}{it.customer_email ? <span className="block text-[11px] text-[#4B5563]">{it.customer_email}</span> : null}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            {it.receipt_url ? (
                                                <div className="flex items-center gap-1.5">
                                                    <a href={it.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#3563AE]/15 text-[#6B94E0] text-[12px] font-medium hover:bg-[#3563AE]/25">
                                                        <ExternalLink size={12} /> 열기
                                                    </a>
                                                    <button onClick={() => copy(it.id, it.receipt_url!)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] text-white/60 text-[12px] font-medium hover:bg-white/[0.1]">
                                                        {copied === it.id ? <><Check size={12} className="text-green-400" /> 복사됨</> : <><Copy size={12} /> 복사</>}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[#4B5563] text-[12px]">없음</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
