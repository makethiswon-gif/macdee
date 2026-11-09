// 메이크디스원 대행 상품(정기결제 요금제). 결제 화면·전자계약서·결제 승인 서버가 같은 값을 쓴다.
// 단건·기간 일시결제 상품은 lib/billing/one-time.ts 의 CREDIT_PACKS.
// 2026-10-21 대표: 모든 요금은 부가세 별도로 표시하고, 카드 결제는 부가세를 더한 금액(price)으로 받는다.
// 이미 가입한 정기결제는 recurring_billing.amount(가입 때 금액)로 청구되므로 여기 값을 바꿔도 달라지지 않는다.
export interface MtoPlan {
    id: string;
    name: string;
    desc: string;
    /** 월 콘텐츠 횟수 */
    perMonth: number;
    /** 월 카드 결제 금액(부가세 포함) */
    price: number;
    /** 월 공급가(부가세 별도로 보여 주는 금액) */
    supplyPrice: number;
    vat: number;
    features: string[];
    popular: boolean;
    /** 기간이 정해진 정기결제(예: 3개월 동안 매월 결제 후 자동 종료). 없으면 해지할 때까지 매월. */
    months?: number;
    /** 특정 고객 전용 조건(lib/makethisone/offers.ts 의 id). 전용 결제 페이지에서만 판다. */
    offer?: string;
}

export const PRICING_PLANS: MtoPlan[] = [
    {
        id: "basic",
        name: "베이직",
        desc: "월 12회 관리",
        perMonth: 12,
        supplyPrice: 1200000,
        vat: 120000,
        price: 1320000,
        features: [
            "월 12회 블로그 원고 기획 및 작성",
            "AI 맥디 무제한 이용가능",
            "기본 키워드 분석 및 매칭",
            "월간 성과 리포트 제공",
            "전담 매니저 배정",
        ],
        popular: false,
    },
    {
        id: "standard",
        name: "스탠다드",
        desc: "월 20회 관리",
        perMonth: 20,
        supplyPrice: 2000000,
        vat: 200000,
        price: 2200000,
        features: [
            "월 20회 블로그 원고 기획 및 작성",
            "AI 맥디 무제한 이용가능",
            "심화 키워드 확장 및 경쟁사 분석",
            "블로그 스킨 및 프로필 디자인 1회",
            "월간 성과 리포트 및 화상 미팅",
            "전담 디렉터 배정",
        ],
        popular: true,
    },
    {
        id: "premium",
        name: "프리미엄",
        desc: "월 30회 관리",
        perMonth: 30,
        supplyPrice: 4000000,
        vat: 400000,
        price: 4400000,
        features: [
            "월 30회 블로그 원고 기획 및 작성",
            "파워플랜 · 파워링크(검색광고) 관리 프로그램 포함 (월 100만원)",
            "인스타그램 릴스/피드 맞춤 기획",
            "프리미엄 로컬 SEO 및 노출 최적화",
            "브랜드 블로그 전면 리뉴얼 (연 1회)",
            "주간 성과 점검 및 밀착 컨설팅",
            "수석 디렉터 배정 및 우선 대응",
        ],
        popular: false,
    },
];

// 특정 고객 전용 정기결제(공개 요금표에는 보이지 않음). 전용 결제 페이지(/pay/<코드>)에서만 판다.
export const OFFER_PLANS: MtoPlan[] = [
    {
        // 2026-11-09 법률사무소 준일: 첫 3개월만 월 40회 스탠다드 250만 원(부가세 별도). 매월 결제를 고르면 3회 결제 후 자동 종료.
        id: "junil-monthly",
        name: "준일 3개월 (매월 결제)",
        desc: "월 40회 · 3개월",
        perMonth: 40,
        supplyPrice: 2500000,
        vat: 250000,
        price: 2750000,
        features: [],
        popular: false,
        months: 3,
        offer: "junil",
    },
];

export function getPlan(id: string): MtoPlan | null {
    return PRICING_PLANS.find((p) => p.id === id) || OFFER_PLANS.find((p) => p.id === id) || null;
}

/** 정기결제 기록(recurring_billing.plan = "메이크디스원 " + 요금제 이름)으로 기간 약정 개월 수를 찾는다. 기간 없는 요금제는 null. */
export function fixedTermMonthsByLabel(label: string | null | undefined): number | null {
    const all = [...PRICING_PLANS, ...OFFER_PLANS];
    const plan = all.find((p) => `메이크디스원 ${p.name}` === (label || "").trim());
    return plan?.months || null;
}
