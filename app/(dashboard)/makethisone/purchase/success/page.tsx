"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function OneTimePurchaseSuccess() {
    const router = useRouter();
    const [state, setState] = useState<"loading" | "ok" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentKey = params.get("paymentKey");
        const orderId = params.get("orderId");
        const amount = params.get("amount");

        if (!paymentKey || !orderId || !amount) {
            setState("error");
            setMessage("결제 정보가 올바르지 않습니다.");
            return;
        }

        fetch("/api/payments/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (res.ok) {
                    setState("ok");
                    setMessage(`${data.pack} 결제가 완료되었습니다. 콘텐츠 ${data.credits}건이 곧 계정에 반영됩니다.`);
                } else {
                    setState("error");
                    setMessage(data.error || "결제 승인에 실패했습니다.");
                }
            })
            .catch(() => {
                setState("error");
                setMessage("결제 승인 중 오류가 발생했습니다.");
            });
    }, []);

    return (
        <div className="max-w-md mx-auto py-24 text-center">
            {state === "loading" && (
                <>
                    <Loader2 size={40} className="mx-auto text-[#3563AE] animate-spin mb-6" />
                    <p className="text-white/70">결제를 확인하는 중입니다…</p>
                </>
            )}
            {state === "ok" && (
                <>
                    <CheckCircle2 size={48} className="mx-auto text-green-400 mb-6" />
                    <h1 className="text-xl font-bold text-white mb-3">결제 완료</h1>
                    <p className="text-[#9CA3B0] leading-relaxed mb-8">{message}</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-6 py-3 rounded-xl bg-[#3563AE] text-white text-sm font-bold hover:bg-[#2A4F8A] transition-colors"
                    >
                        대시보드로 이동
                    </button>
                </>
            )}
            {state === "error" && (
                <>
                    <XCircle size={48} className="mx-auto text-red-400 mb-6" />
                    <h1 className="text-xl font-bold text-white mb-3">결제 확인 실패</h1>
                    <p className="text-[#9CA3B0] leading-relaxed mb-8">{message}</p>
                    <button
                        onClick={() => router.push("/makethisone/subscribe")}
                        className="px-6 py-3 rounded-xl bg-white/[0.06] text-white text-sm font-bold hover:bg-white/[0.1] transition-colors"
                    >
                        다시 시도
                    </button>
                </>
            )}
        </div>
    );
}
