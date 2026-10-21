// 일회성(단건) 콘텐츠 상품 정의.
// 구독 없이 'N회'를 한 번 결제해서 사용.
// 2026-10-21 대표: 모든 상품은 부가세 별도로 표시하고, 카드 결제는 부가세를 더한 금액(price)으로 받는다.
// - price: 실제 카드 결제 금액(원). 결제 승인 서버는 이 값으로만 승인한다.
// - supplyPrice·vat: '부가세 별도'로 보여 주는 공급가와 부가세(price = supplyPrice + vat).
// - hidden: 결제 화면에서 뺀 상품(예전 주문 기록이 가리키는 id 라 정의는 남겨 둔다).
// - months·monthlyPrice: 여러 달 치를 한 번에 결제하는 상품(monthlyPrice 는 공급가 기준).
// - id 에는 '_' 를 쓰지 않는다(주문번호 otp_{id}_{시각}_{난수}에서 '_'로 나눠 읽는다).
export interface CreditPack {
    id: string;
    name: string;
    credits: number;
    price: number;
    supplyPrice?: number;
    vat?: number;
    hidden?: boolean;
    months?: number;
    monthlyPrice?: number;
}

export const CREDIT_PACKS: Record<string, CreditPack> = {
    pack10: { id: "pack10", name: "콘텐츠 10회", credits: 10, price: 1000000, hidden: true },
    pack30: { id: "pack30", name: "콘텐츠 30회", credits: 30, price: 3300000, supplyPrice: 3000000, vat: 300000 },
    pack45: { id: "pack45", name: "콘텐츠 45회", credits: 45, price: 4950000, supplyPrice: 4500000, vat: 450000 },
    // 6개월 계약, 콘텐츠 120회, 1,200만 원(부가세 별도) → 카드 결제 1,320만 원
    halfyear120: { id: "halfyear120", name: "콘텐츠 120회", credits: 120, price: 13200000, supplyPrice: 12000000, vat: 1200000, months: 6, monthlyPrice: 2000000 },
};

export type CreditPackId = keyof typeof CREDIT_PACKS;

export function getCreditPack(id: string): CreditPack | null {
    return CREDIT_PACKS[id] || null;
}

/** 결제 화면에 보일 상품 — 숨긴 상품을 빼고 싼 것부터. */
export function visibleCreditPacks(): CreditPack[] {
    return Object.values(CREDIT_PACKS).filter((p) => !p.hidden).sort((a, b) => a.price - b.price);
}
