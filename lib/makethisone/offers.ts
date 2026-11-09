// 특정 고객 전용 조건(전용 결제 페이지 /pay/<코드>). 공개 요금표에는 보이지 않는다.
// 결제 방식 두 가지를 고를 수 있다: 매월 결제(정기결제 OFFER_PLANS, 정해진 횟수 뒤 자동 종료) / 한 번에 결제(CREDIT_PACKS 의 offer 상품).
// 주소 코드(비밀)는 서버 전용 lib/makethisone/offer-codes.ts 에 둔다 — 이 파일은 브라우저에서도 쓰므로 코드를 넣지 않는다.
import { getCreditPack } from "@/lib/billing/one-time";
import { getPlan } from "@/lib/makethisone/products";

export interface ClientOffer {
    id: string;
    /** 계약서 광고주 칸에 미리 넣는 이름 */
    client: string;
    /** 결제 화면 머리 문구 */
    headline: string;
    months: number;
    perMonth: number;
    /** 월 공급가(부가세 별도) */
    monthlySupply: number;
    monthlyPlanId: string;
    lumpPackId: string;
    /** 계약서 제4조(광고 상세 품목)와 결제 화면 '포함 업무'에 같은 문구를 쓴다 */
    items: string[];
    /** 계약서 제6조(계약 기간) 끝에 붙는 문장 */
    termNote?: string;
}

export const OFFERS: Record<string, ClientOffer> = {
    // 2026-11-09 대표 미팅: 첫 3개월만 월 40회, 스탠다드 월 250만 원(부가세 별도).
    // 3분야 랜딩페이지 제작·유튜브 편집 무료·그 밖의 스탠다드 업무 전부. 매월/한 번에 결제는 준일이 고른다.
    junil: {
        id: "junil",
        client: "법률사무소 준일",
        headline: "첫 3개월 · 월 40회 · 스탠다드",
        months: 3,
        perMonth: 40,
        monthlySupply: 2500000,
        monthlyPlanId: "junil-monthly",
        lumpPackId: "junil3m",
        items: [
            "월 40회 법률 콘텐츠 기획·작성 및 포스팅(3개월 총 120회): 네이버 블로그 포스팅, 맥디 블로그 윤문 포스팅, 분야별 랜딩페이지 법률정보 포스팅",
            "분야별 랜딩페이지 3개 제작(분야는 착수 미팅에서 정한다)",
            "로날드(LAWNALD) 법률자문 기사 월 3회",
            "언론사 기사 송출 월 1회",
            "유튜브 영상 편집 무료 제공(편수는 촬영 일정에 맞춰 협의한다)",
            "AI 맥디 무제한 이용",
            "심화 키워드 확장 및 경쟁사 분석",
            "블로그 스킨 및 프로필 디자인 1회",
            "월간 성과 리포트 및 화상 미팅",
            "전담 디렉터 배정",
        ],
        termNote: "4개월째부터의 구성과 비용은 첫 3개월 성과 리포트를 바탕으로 “갑”과 “을”이 다시 정한다.",
    },
};

export function getOffer(id: string | null | undefined): ClientOffer | null {
    return (id && OFFERS[id]) || null;
}

/** 전용 결제 화면에 보여 줄 두 결제 방식의 금액 */
export function offerPrices(offer: ClientOffer) {
    const plan = getPlan(offer.monthlyPlanId);
    const pack = getCreditPack(offer.lumpPackId);
    if (!plan || !pack) throw new Error(`전용 조건 ${offer.id} 의 상품 정의가 없습니다.`);
    return {
        monthly: { id: plan.id, supply: plan.supplyPrice, vat: plan.vat, price: plan.price, count: plan.months || offer.months },
        lump: { id: pack.id, supply: pack.supplyPrice || pack.price, vat: pack.vat || 0, price: pack.price },
    };
}
