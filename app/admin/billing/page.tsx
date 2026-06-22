"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, Trash2, Zap } from "lucide-react";

interface Item {
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    plan: string | null;
    billing_key: string;
    customer_key: string;
    amount: number;
    status: string;
    next_charge_date: string;
    last_charged_at: string | null;
}

export default function AdminBillingPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [charging, setCharging] = useState<string | null>(null);

    // 등록 폼 (5/18 결제 고객 기본값 — 빌링키만 토스 전체값으로 교체)
    const [form, setForm] = useState({
        customer_name: "",
        customer_email: "",
        plan: "메이크디스원 베이직",
        billing_key: "",
        customer_key: "mto_1779071276716_k8pgbbn",
        amount: "1200000",
        next_charge_date: "2026-06-18",
    });
    const [saving, setSaving] = useState(false);
    const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const load = () => {
        setLoading(true);
        fetch("/api/admin/billing", { credentials: "include" })
            .then((r) => r.json())
            .then((d) => setItems(d.items || []))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const register = async () => {
        if (!form.billing_key.trim()) { alert("토스 빌링키(bill_...) 전체 값을 입력하세요."); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/admin/billing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ...form, amount: Number(form.amount) }),
            });
            const d = await res.json();
            if (!res.ok) { alert("등록 실패: " + (d.error || "")); return; }
            setForm((p) => ({ ...p, billing_key: "" }));
            load();
        } finally { setSaving(false); }
    };

    const chargeNow = async (it: Item) => {
        if (!confirm(`${it.customer_name || it.customer_key} 에게 ${it.amount.toLocaleString()}원을 지금 청구합니다.\n실제 카드 청구됩니다. 진행할까요?`)) return;
        setCharging(it.id);
        try {
            const res = await fetch("/api/admin/billing/charge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id: it.id }),
            });
            const d = await res.json();
            if (res.ok) alert(`✅ 청구 완료: ${it.amount.toLocaleString()}원`);
            else alert(`❌ 청구 실패: ${d.error || ""}`);
            load();
        } finally { setCharging(null); }
    };

    const remove = async (id: string) => {
        if (!confirm("이 정기결제 등록을 삭제할까요? (자동청구 중단)")) return;
        await fetch(`/api/admin/billing?id=${id}`, { method: "DELETE", credentials: "include" });
        load();
    };

    return (
        <div className="max-w-5xl">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#3563AE]/15 flex items-center justify-center">
                    <CreditCard size={18} className="text-[#3563AE]" />
                </div>
                <h1 className="text-xl font-bold text-white">정기결제 관리</h1>
            </div>
            <p className="text-[13px] text-[#6B7280] mb-7">토스 빌링키를 등록하면 매일 크론이 청구일에 자동청구합니다. "지금 청구"로 밀린 건을 즉시 받을 수 있습니다.</p>

            {/* 등록 폼 */}
            <div className="bg-[#0F1320] border border-[#1A2035] rounded-xl p-5 mb-7">
                <p className="text-[13px] font-semibold text-white mb-4">정기결제 등록</p>
                <div className="grid md:grid-cols-2 gap-3">
                    <F label="고객명" v={form.customer_name} on={(v) => set("customer_name", v)} ph="예: OO법무법인" />
                    <F label="이메일(선택)" v={form.customer_email} on={(v) => set("customer_email", v)} ph="email@example.com" />
                    <F label="플랜" v={form.plan} on={(v) => set("plan", v)} />
                    <F label="금액(원)" v={form.amount} on={(v) => set("amount", v)} />
                    <F label="고객키 (mto_...)" v={form.customer_key} on={(v) => set("customer_key", v)} />
                    <F label="다음 청구일 (YYYY-MM-DD)" v={form.next_charge_date} on={(v) => set("next_charge_date", v)} />
                </div>
                <div className="mt-3">
                    <label className="block text-[12px] font-medium text-[#9CA3B0] mb-1.5">토스 빌링키 (bill_... 전체값) <span className="text-red-400">*</span></label>
                    <input value={form.billing_key} onChange={(e) => set("billing_key", e.target.value)}
                        placeholder="토스 대시보드에서 복사한 bill_ 로 시작하는 전체 값"
                        className="w-full px-3.5 py-2.5 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[14px] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE]" />
                </div>
                <button onClick={register} disabled={saving}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#3563AE] hover:bg-[#2A4F8A] disabled:opacity-50 text-white text-[14px] font-medium rounded-lg">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : null} 등록
                </button>
            </div>

            {/* 목록 */}
            {loading ? (
                <div className="flex items-center gap-2 text-[#6B7280] text-sm py-6"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
            ) : items.length === 0 ? (
                <div className="bg-[#0F1320] border border-[#1A2035] rounded-xl p-8 text-center text-[#6B7280] text-sm">등록된 정기결제가 없습니다.</div>
            ) : (
                <div className="bg-[#0F1320] border border-[#1A2035] rounded-xl overflow-hidden">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="text-[#6B7280] text-[11px] uppercase tracking-wider border-b border-[#1A2035]">
                                <th className="text-left font-medium px-4 py-3">고객 / 플랜</th>
                                <th className="text-left font-medium px-4 py-3">금액</th>
                                <th className="text-left font-medium px-4 py-3">다음 청구일</th>
                                <th className="text-left font-medium px-4 py-3">상태</th>
                                <th className="text-left font-medium px-4 py-3">최근 청구</th>
                                <th className="text-right font-medium px-4 py-3">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it) => (
                                <tr key={it.id} className="border-b border-[#1A2035]/60">
                                    <td className="px-4 py-3">
                                        <div className="text-white font-medium">{it.customer_name || "(이름없음)"}</div>
                                        <div className="text-[#6B7280] text-[11px]">{it.plan}</div>
                                    </td>
                                    <td className="px-4 py-3 text-white">{it.amount.toLocaleString()}원</td>
                                    <td className="px-4 py-3 text-[#9CA3B0]">{it.next_charge_date}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${it.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                                            {it.status === "active" ? "정상" : it.status === "past_due" ? "청구실패" : it.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#6B7280]">{it.last_charged_at ? new Date(it.last_charged_at).toLocaleDateString("ko-KR") : "-"}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => chargeNow(it)} disabled={charging === it.id}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#3563AE] hover:bg-[#2A4F8A] disabled:opacity-50 text-white text-[12px] rounded-lg mr-2">
                                            {charging === it.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} 지금 청구
                                        </button>
                                        <button onClick={() => remove(it.id)} className="inline-flex items-center p-1.5 text-[#6B7280] hover:text-red-400 rounded-lg">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function F({ label, v, on, ph }: { label: string; v: string; on: (v: string) => void; ph?: string }) {
    return (
        <div>
            <label className="block text-[12px] font-medium text-[#9CA3B0] mb-1.5">{label}</label>
            <input value={v} onChange={(e) => on(e.target.value)} placeholder={ph}
                className="w-full px-3.5 py-2.5 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[14px] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE]" />
        </div>
    );
}
