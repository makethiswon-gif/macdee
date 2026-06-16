// 일회성(단건) 콘텐츠 크레딧 팩 정의.
// 구독 없이 'N건권'을 한 번 결제해서 사용. 금액은 예시이니 자유롭게 수정하세요.
// 콘텐츠 1건당 100,000원
export const CREDIT_PACKS = {
    pack10: { id: "pack10", name: "콘텐츠 10건권", credits: 10, price: 1000000 },
    pack30: { id: "pack30", name: "콘텐츠 30건권", credits: 30, price: 3000000 },
    pack50: { id: "pack50", name: "콘텐츠 50건권", credits: 50, price: 5000000 },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;

export function getCreditPack(id: string) {
    return (CREDIT_PACKS as Record<string, { id: string; name: string; credits: number; price: number }>)[id] || null;
}
