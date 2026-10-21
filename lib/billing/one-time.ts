// 일회성(단건) 콘텐츠 크레딧 팩 정의.
// 구독 없이 'N건권'을 한 번 결제해서 사용. 금액은 예시이니 자유롭게 수정하세요.
// 콘텐츠 1건당 100,000원
// - hidden: 결제 화면에서 뺀 상품(예전 주문 기록이 가리키는 id 라 정의는 남겨 둔다).
// - months·monthlyPrice: 여러 달 계약을 한 번에 결제하는 상품(2026-10-21 대표 지시: 월 220만 원 부가세 포함 6개월 일시 결제).
// - id 에는 '_' 를 쓰지 않는다(주문번호 otp_{id}_{시각}_{난수}에서 '_'로 나눠 읽는다).
export interface CreditPack {
    id: string;
    name: string;
    credits: number;
    price: number;
    hidden?: boolean;
    months?: number;
    monthlyPrice?: number;
    vatIncluded?: boolean;
}

export const CREDIT_PACKS: Record<string, CreditPack> = {
    pack10: { id: "pack10", name: "콘텐츠 10건권", credits: 10, price: 1000000, hidden: true },
    pack30: { id: "pack30", name: "콘텐츠 30건권", credits: 30, price: 3000000 },
    pack45: { id: "pack45", name: "콘텐츠 45건권", credits: 45, price: 4500000 },
    halfyear120: { id: "halfyear120", name: "6개월 계약 120회", credits: 120, price: 13200000, months: 6, monthlyPrice: 2200000, vatIncluded: true },
};

export type CreditPackId = keyof typeof CREDIT_PACKS;

export function getCreditPack(id: string): CreditPack | null {
    return CREDIT_PACKS[id] || null;
}

/** 결제 화면에 보일 상품 — 숨긴 상품을 빼고 싼 것부터. */
export function visibleCreditPacks(): CreditPack[] {
    return Object.values(CREDIT_PACKS).filter((p) => !p.hidden).sort((a, b) => a.price - b.price);
}
