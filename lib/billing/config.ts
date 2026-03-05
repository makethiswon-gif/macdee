// Toss Payments billing configuration
export const TOSS_API_URL = "https://api.tosspayments.com/v1";

export const PLANS = {
    free: { name: "무료 체험", price: 0, uploads: 5, label: "Free" },
    "30": { name: "월 30건", price: 49000, uploads: 30, label: "30건" },
    "50": { name: "월 50건", price: 69000, uploads: 50, label: "50건" },
    "100": { name: "월 100건", price: 119000, uploads: 100, label: "100건" },
    unlimited: { name: "무제한", price: 179000, uploads: null, label: "무제한" },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getTossAuthHeader() {
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) throw new Error("TOSS_SECRET_KEY is not set");
    const encoded = Buffer.from(`${secretKey}:`).toString("base64");
    return `Basic ${encoded}`;
}
