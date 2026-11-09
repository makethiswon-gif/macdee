"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

// 전용 결제 페이지(/pay/<코드>)에서 토스 결제창을 마치고 돌아오는 곳.
//   mode=monthly: 카드 등록(빌링) → /api/makethisone/issue 가 첫 달 결제·정기결제 등록·계약서 메일
//   mode=lump:    한 번 결제 → /api/payments/confirm 이 결제 승인·계약서 메일
const C = { accent: "#004AAD", ink: "#071526", gray: "#485971", surface: "#F1F5FB", line: "#C9D5E6" };

function Done() {
    const search = useSearchParams();
    const { code } = useParams<{ code: string }>();
    const [state, setState] = useState<"processing" | "success" | "error">("processing");
    const [message, setMessage] = useState("");
    const [contractEmail, setContractEmail] = useState<string | null>(null);
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        const mode = search.get("mode");
        const contractId = search.get("contract") || "";
        const doneKey = `mto-paid:${contractId}`;
        // 새로 고침해도 같은 결제를 두 번 승인하지 않는다
        try {
            const saved = sessionStorage.getItem(doneKey);
            if (saved) {
                const d = JSON.parse(saved);
                setContractEmail(d.contractEmail || null);
                setMessage(d.message || "");
                setState("success");
                return;
            }
        } catch { /* 저장소를 못 쓰면 그냥 진행 */ }

        let req: { url: string; body: Record<string, unknown> } | null = null;
        if (mode === "monthly") {
            const authKey = search.get("authKey"), customerKey = search.get("customerKey"), plan = search.get("plan");
            if (authKey && customerKey && plan) req = { url: "/api/makethisone/issue", body: { authKey, customerKey, plan, contractId } };
        } else if (mode === "lump") {
            const paymentKey = search.get("paymentKey"), orderId = search.get("orderId"), amount = search.get("amount");
            if (paymentKey && orderId && amount) req = { url: "/api/payments/confirm", body: { paymentKey, orderId, amount: Number(amount), contractId } };
        }
        if (!req) {
            setState("error");
            setMessage("결제 정보가 없습니다. 결제 페이지에서 다시 진행해 주세요.");
            return;
        }
        fetch(req.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) })
            .then(async (res) => {
                const d = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(d.error || "결제를 처리하지 못했습니다.");
                const msg = mode === "monthly" ? "첫 달 결제와 카드 등록을 마쳤습니다. 다음 달부터 같은 날 자동 결제됩니다." : "한 번에 결제를 마쳤습니다. 자동 결제는 없습니다.";
                setContractEmail(d.contractEmail || null);
                setMessage(msg);
                setState("success");
                try { sessionStorage.setItem(doneKey, JSON.stringify({ contractEmail: d.contractEmail || null, message: msg })); } catch { /* 무시 */ }
            })
            .catch((e) => {
                setState("error");
                setMessage(e instanceof Error ? e.message : "결제를 처리하지 못했습니다.");
            });
    }, [search]);

    return (
        <div className="max-w-md w-full rounded-2xl border bg-white p-8 text-center" style={{ borderColor: C.line }}>
            {state === "processing" && (
                <>
                    <Loader2 size={44} className="animate-spin mx-auto" style={{ color: C.accent }} />
                    <h1 className="mt-5 text-xl font-bold">결제를 확인하고 있습니다</h1>
                    <p className="mt-2 text-sm" style={{ color: C.gray }}>창을 닫지 말고 잠시만 기다려 주세요.</p>
                </>
            )}
            {state === "success" && (
                <>
                    <CheckCircle2 size={48} className="mx-auto" style={{ color: C.accent }} />
                    <h1 className="mt-5 text-2xl font-bold">계약과 결제가 끝났습니다</h1>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray }}>
                        {message}
                        <br />
                        {contractEmail ? <>계약서 PDF 를 {contractEmail}로 보냈습니다.</> : <>계약서 PDF 는 담당 디렉터가 따로 보내 드립니다.</>}
                    </p>
                    <p className="mt-6 text-sm font-semibold">메이크디스원 담당 디렉터가 곧 착수 일정을 연락드립니다.</p>
                </>
            )}
            {state === "error" && (
                <>
                    <XCircle size={48} className="mx-auto text-red-600" />
                    <h1 className="mt-5 text-xl font-bold">결제가 끝나지 않았습니다</h1>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray }}>{message}</p>
                    <a href={`/pay/${code}`} className="mt-6 inline-block rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ background: C.accent }}>결제 페이지로 돌아가기</a>
                </>
            )}
        </div>
    );
}

export default function DonePage() {
    return (
        <main className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: C.surface, color: C.ink }}>
            <Suspense fallback={<Loader2 size={40} className="animate-spin" style={{ color: C.accent }} />}>
                <Done />
            </Suspense>
        </main>
    );
}
