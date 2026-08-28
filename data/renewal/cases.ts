// Case Study 데이터
//
// ⚠️ §42 — 가짜 수치·가짜 사례를 절대 만들지 않는다.
//
// CASES는 "실제 데이터가 확인된 사례"만 담는다. 지금은 비어 있고,
// 비어 있으면 홈의 Case Study 섹션은 렌더되지 않는다.
//
// SAMPLE_CASES는 데모에서 레이아웃을 확인하기 위한 것이며,
// isSample: true 가 붙어 화면에 "샘플 — 실제 데이터 아님" 경고가 강제로 뜬다.
// 실서비스 전환 시 이 배열은 삭제한다.

export interface CaseStudy {
    id: string;
    /** 분야 — 로펌 실명은 동의를 받은 경우에만 */
    field: string;
    label: string;
    before: string[];
    strategy: string[];
    /** 실제로 측정된 값만. 없으면 빈 배열 */
    result: { metric: string; change: string }[];
    /** 성과 해석에 필요한 정직한 맥락 한 줄 (§42) */
    note?: string;
    isSample?: boolean;
}

// CASE 01 — 대표 구술 기반(2026-08-28), 로펌 실명은 밝히지 않는다.
// 매출 성장을 마케팅 단독 성과처럼 쓰지 않는다 — note 에 맥락을 명시한다.
export const CASES: CaseStudy[] = [
    {
        id: "honam-01",
        field: "호남 지역 종합 로펌",
        label: "CASE 01",
        before: [
            "연 매출 10억대의 지역 중소 로펌",
            "형사·이혼 중심의 한정된 사건 분야",
            "지역 소개 중심의 수임 구조",
        ],
        strategy: [
            "광고 운영 전면 위임 — 검색광고 재구성",
            "분야 확장과 광고를 함께 설계: 회생·파산 → 상속 → 선거법",
            "분야별 콘텐츠와 상담 유입 경로 구축",
            "유입·상담 데이터 기준의 예산 재배분",
        ],
        result: [
            { metric: "연 매출", change: "10억대 → 100억대" },
            { metric: "사건 분야", change: "2개 → 6개 분야" },
            { metric: "사무소", change: "본원 외 지사 3곳" },
        ],
        note: "이 성장에는 부장판사 출신 변호사 영입과 법인 개편 등 로펌 자체의 결정이 함께 있었습니다. 마케팅은 각 분야가 열릴 때마다 발견과 유입을 맡았습니다. 로펌 동의 범위에서 익명으로 공개합니다.",
    },
];

export const SAMPLE_CASES: CaseStudy[] = [
    {
        id: "sample-01",
        field: "지역 종합 로펌",
        label: "CASE 01",
        before: ["블로그 중심 마케팅", "홈페이지 검색 유입 부족", "광고 전환 추적 부재"],
        strategy: [
            "광고 계정 재구성",
            "홈페이지 개편",
            "SEO 구조 설계",
            "콘텐츠 클러스터 구축",
            "랜딩페이지 개선",
            "상담 경로 측정",
        ],
        result: [
            { metric: "검색 유입", change: "—" },
            { metric: "상담 건수", change: "—" },
            { metric: "CPA", change: "—" },
            { metric: "전환율", change: "—" },
        ],
        isSample: true,
    },
    {
        id: "sample-02",
        field: "형사 전문 법률사무소",
        label: "CASE 02",
        before: ["파워링크 단독 운영", "야간 상담 유실", "블로그 방치"],
        strategy: ["키워드 재설계", "상담 경로 단순화", "사례 콘텐츠 구축", "AI 검색 인용 구조 정비"],
        result: [
            { metric: "검색 유입", change: "—" },
            { metric: "상담 건수", change: "—" },
            { metric: "CPA", change: "—" },
        ],
        isSample: true,
    },
];
