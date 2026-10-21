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

export function getPlan(id: string): MtoPlan | null {
    return PRICING_PLANS.find((p) => p.id === id) || null;
}
