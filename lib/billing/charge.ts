import { TOSS_API_URL, getTossAuthHeader } from "./config";

export interface ChargeResult {
    ok: boolean;
    paymentKey?: string;
    orderId?: string;
    status?: string;
    approvedAt?: string;
    error?: string;
    code?: string;
}

/**
 * 토스 빌링키로 정기결제를 실행한다. (서버 전용 — process.env.TOSS_SECRET_KEY 사용)
 */
export async function chargeBilling(opts: {
    billingKey: string;
    customerKey: string;
    amount: number;
    orderName: string;
    customerEmail?: string | null;
}): Promise<ChargeResult> {
    const orderId = `rb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
        const res = await fetch(`${TOSS_API_URL}/billing/${opts.billingKey}`, {
            method: "POST",
            headers: {
                Authorization: getTossAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                customerKey: opts.customerKey,
                amount: opts.amount,
                orderId,
                orderName: opts.orderName,
                ...(opts.customerEmail ? { customerEmail: opts.customerEmail } : {}),
            }),
        });
        const data = await res.json();
        if (!res.ok) {
            return { ok: false, error: data.message || "결제 실패", code: data.code };
        }
        return { ok: true, paymentKey: data.paymentKey, orderId, status: data.status, approvedAt: data.approvedAt };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "unknown" };
    }
}

/** 다음 청구일 = 기준일 + 1개월 (YYYY-MM-DD) */
export function addOneMonth(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 10);
}
