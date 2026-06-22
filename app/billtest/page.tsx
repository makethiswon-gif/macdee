"use client";

import { useEffect, useState } from "react";
import { loadTossPayments } from "@tosspayments/payment-sdk";

// 빌링 검증용 임시 테스트 페이지 (1,000원). 검증 후 삭제 예정.
export default function BillTestPage() {
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);

    // 토스에서 돌아오면(authKey) 발급+청구 확정
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const authKey = p.get("authKey");
        const customerKey = p.get("customerKey");
        if (authKey && customerKey) {
            setBusy(true);
            setMsg("결제/빌링키 발급 확인 중…");
            fetch("/api/billtest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ authKey, customerKey }),
            })
                .then((r) => r.json())
                .then((d) => {
                    if (d.success) setMsg(`✅ 성공! 1,000원 청구 + 빌링키 저장 완료 (paymentKey: ${d.paymentKey}). 이제 관리자 정기결제 관리에 '[테스트] 빌링 검증'이 떴습니다.`);
                    else setMsg(`❌ 실패 [${d.step || ""}] ${d.error || ""} ${d.code ? "(" + d.code + ")" : ""}`);
                })
                .catch(() => setMsg("❌ 네트워크 오류"))
                .finally(() => setBusy(false));
        }
    }, []);

    const start = async () => {
        setBusy(true);
        setMsg("토스 결제창 여는 중…");
        try {
            const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!.trim();
            const sdk = await loadTossPayments(clientKey);
            const customerKey = `billtest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await sdk.requestBillingAuth("카드", {
                customerKey,
                successUrl: `${window.location.origin}/billtest`,
                failUrl: `${window.location.origin}/billtest`,
            });
        } catch (e: unknown) {
            setBusy(false);
            setMsg("오류: " + (e instanceof Error ? e.message : String(e)));
        }
    };

    return (
        <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "sans-serif" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>빌링 검증 테스트 (1,000원)</h1>
            <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                본인 카드로 1,000원 빌링을 등록·청구해 결제 파이프라인을 검증합니다.<br />
                검증 후 토스에서 환불하고 이 페이지는 삭제합니다.
            </p>
            <button onClick={start} disabled={busy}
                style={{ padding: "12px 20px", background: "#3563AE", color: "#fff", border: 0, borderRadius: 10, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}>
                1,000원 빌링 테스트 시작
            </button>
            {msg && <p style={{ marginTop: 20, fontSize: 14, color: "#222", whiteSpace: "pre-wrap" }}>{msg}</p>}
        </div>
    );
}
