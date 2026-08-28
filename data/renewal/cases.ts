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
    /** 어떻게 성과로 이어졌는지 — 단계별 성장 경로 */
    growth?: { en: string; title: string; desc: string }[];
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
            "구식 홈페이지 — 변호사·로펌 소개 페이지가 전부",
        ],
        strategy: [
            "광고 운영 전면 위임 — 검색광고 재구성",
            "법률칼럼·뉴스 게시판 신설 + 네이버 블로그 연계 발행",
            "홈페이지 SEO 구조 작업",
            "분야 확장과 광고를 함께 설계: 회생·파산 → 상속 → 선거법",
        ],
        result: [
            { metric: "연 매출", change: "10억대 → 100억대" },
            { metric: "사건 분야", change: "2개 → 6개 분야" },
            { metric: "사무소", change: "본원 외 지사 3곳" },
        ],
        // 어떻게 매출로 이어졌는가 — 콘텐츠 시스템이 발견을 만들고,
        // 분야를 열 때마다 같은 시스템이 유입을 재현한 구조.
        growth: [
            {
                en: "BUILD",
                title: "콘텐츠 기반부터 다시 세웠습니다",
                desc: "소개 페이지뿐이던 홈페이지에 법률칼럼과 뉴스 게시판을 새로 만들고, 네이버 블로그와 연계해 주기적으로 발행했습니다. 홈페이지는 SEO 구조까지 손봤습니다.",
            },
            {
                en: "REACH",
                title: "노출이 시작됐습니다",
                desc: "언론 소개와 법률칼럼 연재가 이어졌고, 콘텐츠 한 편이 조회수 1,000회를 넘기 시작했습니다. 검색에서 로펌이 발견되기 시작한 시점입니다.",
            },
            {
                en: "EXPAND",
                title: "새 분야마다 같은 시스템을 돌렸습니다",
                desc: "회생·파산, 상속, 선거법 — 분야를 열 때마다 콘텐츠·광고·검색을 같은 구조로 붙여 유입을 재현했습니다. 매출은 이 반복에서 나왔습니다.",
            },
            {
                en: "NOW",
                title: "이제는 AI가 먼저 소개합니다",
                desc: "AI 검색이 광주·전라 지역 변호사 질문에 이 로펌을 소개하고, 네이버 블로그는 AI 인용 횟수 최다를 기록 중이며, 구글 상위 노출 콘텐츠도 다수입니다. (2026년 8월 기준 관측)",
            },
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
