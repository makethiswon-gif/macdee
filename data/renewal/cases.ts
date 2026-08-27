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
    isSample?: boolean;
}

export const CASES: CaseStudy[] = [];

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
