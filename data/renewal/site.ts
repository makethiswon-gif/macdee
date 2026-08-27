// MAKETHIS1 리뉴얼 — 사이트 공통 데이터
//
// 여기 들어간 사실은 전부 검증 가능한 것이어야 한다(§42).
// 팀 6명·파트너 17곳·업력 수치는 현재 /makethisone 정적 페이지에서 이미 대외
// 공표 중인 값을 그대로 가져온 것이다. 새 수치를 만들지 않는다.

/* ═══════════════ 경로 ═══════════════
   데모 기간에는 /renewal 접두어가 붙는다. 교체 시 DEMO_BASE만 ""로 바꾸면
   전 페이지 링크가 최종 URL로 정렬된다. */

export const DEMO_BASE = "/renewal";

export function path(p: string): string {
    if (p.startsWith("http") || p.startsWith("#")) return p;

    // "/#system" 처럼 앵커가 붙은 경로도 데모 베이스를 타야 한다
    const hash = p.indexOf("#");
    const base = hash === -1 ? p : p.slice(0, hash);
    const frag = hash === -1 ? "" : p.slice(hash);

    // 라이브 페이지(매거진 등)는 데모에서도 실제 URL을 그대로 쓴다
    if (LIVE_PATHS.some((l) => base === l || base.startsWith(l + "/"))) return base + frag;

    return `${DEMO_BASE}${base === "/" ? "" : base}${frag}`;
}

// 데모 안에서도 실제 URL 을 그대로 써야 하는 라이브 페이지.
//
// ⚠️ /diagnose 를 여기 넣지 말 것.
//    /diagnose 는 "블로그 URL 넣으면 AI가 1분 만에 무료 진단" 하는 맥디 제품 화면이다.
//    리뉴얼의 "마케팅 진단 요청"과는 전혀 다른 경험이라 톤이 무너진다.
//    리뉴얼 CTA 는 /renewal/diagnose (로펌 마케팅 구조 진단) 로 간다.
const LIVE_PATHS = ["/magazine", "/terms", "/refund", "/login"];

/* ═══════════════ 네비게이션 ═══════════════ */

export interface NavChild {
    label: string;
    href: string;
    desc: string;
}

export interface NavItem {
    label: string;
    href: string;
    children?: NavChild[];
}

export const NAV: NavItem[] = [
    {
        label: "WHAT WE DO",
        href: "/lawfirm-marketing",
        children: [
            { label: "Paid Media", href: "/naver-ads", desc: "네이버 파워링크 · Google Ads" },
            { label: "SEO", href: "/lawfirm-seo", desc: "네이버 · 구글 검색 노출" },
            { label: "AI Search / GEO", href: "/geo", desc: "AI 검색이 이해하는 구조" },
            { label: "Content", href: "/lawfirm-blog", desc: "블로그 · 사례 · 칼럼" },
            { label: "Website", href: "/lawfirm-website", desc: "홈페이지 · 랜딩페이지" },
            { label: "Data & Conversion", href: "/conversion", desc: "상담 전환 · 수임 분석" },
        ],
    },
    { label: "OUR SYSTEM", href: "/#system" },
    { label: "WORK", href: "/work" },
    { label: "INSIGHTS", href: "/magazine" },
    { label: "ABOUT", href: "/about" },
];

export const PRIMARY_CTA = { label: "마케팅 진단 요청", href: "/diagnose" }; // path() 가 /renewal/diagnose 로 바꾼다

/* ═══════════════ HERO 채널 ═══════════════ */

export const HERO_CHANNELS = [
    "NAVER",
    "GOOGLE",
    "CHATGPT",
    "YOUTUBE",
    "SEO",
    "GEO",
    "CONTENT",
    "WEB",
];

/* ═══════════════ SECTION 02 — 흩어진 대행사 ═══════════════ */

export const SCATTERED_AGENCIES = [
    { channel: "NAVER ADS", agency: "Agency A" },
    { channel: "BLOG", agency: "Agency B" },
    { channel: "WEBSITE", agency: "Agency C" },
    { channel: "SEO", agency: "Agency D" },
    { channel: "VIDEO", agency: "Agency E" },
    { channel: "GOOGLE ADS", agency: "Agency F" },
];

/* ═══════════════ SECTION 03 — 마케팅 시스템 ═══════════════ */

export interface SystemStep {
    no: string;
    en: string;
    title: string;
    desc: string;
    tags: string[];
}

export const SYSTEM_STEPS: SystemStep[] = [
    {
        no: "01",
        en: "DISCOVERY",
        title: "발견됩니다.",
        desc: "고객이 필요한 순간, 로펌이 검색되고 발견되도록 만듭니다.",
        tags: ["NAVER", "GOOGLE", "CHATGPT", "GEMINI", "NAVER AI SEARCH", "YOUTUBE"],
    },
    {
        no: "02",
        en: "ACQUISITION",
        title: "고객을 데려옵니다.",
        desc: "유료 광고로 즉시 고객 접점을 만듭니다. 새로운 AI 광고 채널이 법률서비스를 허용하는 시점부터 같은 시스템 안으로 편입합니다.",
        tags: ["NAVER POWERLINK", "GOOGLE ADS", "YOUTUBE ADS", "PERFORMANCE", "RETARGETING"],
    },
    {
        no: "03",
        en: "TRUST",
        title: "선임할 이유를 만듭니다.",
        desc: "찾아온 사람이 왜 이 로펌이어야 하는지 스스로 납득하게 만드는 근거를 쌓습니다.",
        tags: ["BLOG", "WEBSITE", "CASE STUDY", "LEGAL CONTENT", "VIDEO", "FAQ", "BRANDING"],
    },
    {
        no: "04",
        en: "CONVERSION",
        title: "방문자를 상담으로 바꿉니다.",
        desc: "들어온 트래픽이 어디에서 이탈하는지 찾아내고, 상담까지 가는 경로를 다시 설계합니다.",
        tags: ["LANDING PAGE", "PHONE", "KAKAO", "FORM", "UX", "CRO"],
    },
    {
        no: "05",
        en: "REVENUE",
        title: "클릭이 아니라 사건을 봅니다.",
        desc: "노출과 클릭이 아니라, 실제로 상담이 잡히고 사건이 들어왔는지를 성과로 봅니다.",
        tags: ["LEAD", "QUALIFIED LEAD", "CONSULTATION", "CASE", "CPA", "ROAS"],
    },
    {
        no: "06",
        en: "OPTIMIZATION",
        title: "데이터가 다시 전략이 됩니다.",
        desc: "성과 데이터를 광고·콘텐츠·검색 전략·랜딩페이지·예산에 되돌려 계속 고쳐 나갑니다.",
        tags: ["ANALYTICS", "BUDGET", "KEYWORD", "CONTENT PLAN", "A/B TEST"],
    },
];

/* ═══════════════ SECTION 04 — 채널 그리드 ═══════════════ */

export interface ChannelCategory {
    key: string;
    en: string;
    title: string;
    desc: string;
    items: string[];
    href: string;
}

export const CHANNELS: ChannelCategory[] = [
    {
        key: "paid",
        en: "PAID MEDIA",
        title: "오늘 고객을 확보합니다.",
        desc: "검색량이나 클릭수가 아니라 실제 상담 성과를 기준으로 광고 예산을 조정합니다.",
        items: [
            "NAVER Powerlink",
            "NAVER Ads",
            "Google Ads",
            "YouTube Ads",
            "Retargeting",
            "Performance Campaign",
        ],
        href: "/naver-ads",
    },
    {
        key: "search",
        en: "SEARCH",
        title: "검색할 때 발견되게 만듭니다.",
        desc: "광고를 끄면 사라지는 노출이 아니라, 남는 검색 자산을 만듭니다.",
        items: [
            "NAVER SEO",
            "Google SEO",
            "Technical SEO",
            "Local SEO",
            "Content Cluster",
            "Internal Linking",
            "Site Architecture",
        ],
        href: "/lawfirm-seo",
    },
    {
        key: "ai",
        en: "AI SEARCH",
        title: "AI가 로펌을 이해할 수 있는 구조를 만듭니다.",
        desc: "AI가 로펌의 전문성과 정보를 이해하고 발견하기 쉬운 구조를 설계합니다.",
        items: [
            "로펌 정보 일관성",
            "사건·인물·분야 정보 구조",
            "질문형 콘텐츠와 FAQ",
            "AI 답변 언급 모니터링",
            "검색환경 변화 대응",
        ],
        href: "/geo",
    },
    {
        key: "content",
        en: "CONTENT",
        title: "경험을 검색 자산으로 만듭니다.",
        desc: "몇 건을 썼는지가 아니라, 어떤 검색 의도를 해결하고 어디로 연결되는지를 봅니다.",
        items: [
            "NAVER Blog",
            "Case Content",
            "Legal Column",
            "FAQ",
            "Legal Guide",
            "Video",
            "Short Form",
        ],
        href: "/lawfirm-blog",
    },
    {
        key: "website",
        en: "WEBSITE",
        title: "홈페이지를 영업사원으로 만듭니다.",
        desc: "보기 좋은 홈페이지가 아니라, 상담 전화가 오는 홈페이지를 만듭니다.",
        items: [
            "Website Design",
            "Landing Page",
            "Mobile UX",
            "SEO Structure",
            "GEO Structure",
            "CRO",
            "Content Management",
        ],
        href: "/lawfirm-website",
    },
];

/* ═══════════════ 운영 기반 — Data & Conversion ═══════════════
   이건 여섯 번째 서비스가 아니다. 위 네 영역 전부를 판단하게 해주는 기반이라
   카드 하나로 늘어놓지 않고 별도 섹션으로 격상한다(LeadToCase).
   메뉴에는 남겨둔다 — 찾는 사람이 있기 때문이다. */

export const LEAD_TO_CASE = {
    en: "Lead to Case",
    title: "광고·검색·콘텐츠·홈페이지의 성과를 상담과 수임 데이터에 연결합니다.",
    lead: "이 연결이 없으면 어느 채널이 잘 돌아가는지 판단할 근거가 없고, 예산을 어디로 옮겨야 하는지도 알 수 없습니다.",
    href: "/conversion",
    chain: [
        { en: "CHANNEL", ko: "광고 · 검색 · 콘텐츠 · 홈페이지" },
        { en: "VISIT", ko: "유입" },
        { en: "LEAD", ko: "전화 · 카카오 · 폼" },
        { en: "CONSULTATION", ko: "상담" },
        { en: "CASE", ko: "수임" },
    ],
    points: [
        "전화·카카오·폼이 각각 어느 채널에서 왔는지 구분됩니다",
        "상담·유효 상담·수임의 정의를 하나로 맞춥니다",
        "채널별 비용과 상담 기여를 같은 표에서 봅니다",
        "그 표를 근거로 다음 달 예산을 옮깁니다",
    ],
};

/* ═══════════════ SECTION 06 — 팀 ═══════════════
   사진은 /makethisone/team/*.webp 에 이미 있다. */

/* ── 대표 ──
   기존 /makethisone 의 founder-spotlight 에 이미 공개돼 있던 이력 그대로.
   법률사무소 실무와 대기업 마케팅을 둘 다 거친 이력이 이 회사의 성립 근거라
   팀 목록 안에 섞지 않고 앞에 따로 세운다. */

export const FOUNDER = {
    name: "김원영",
    role: "CEO",
    photo: "/makethisone/ceo.webp",
    lead: "법률사무소 안에서 사건이 어떻게 들어오는지 보고, 대기업에서 마케팅을 배웠습니다.",
    career: {
        legal: ["법무법인 혜안", "법무법인 고구려", "JY법률사무소"],
        marketing: ["삼성메디슨 영업 · 마케팅", "KT 유통 · 영업 · 마케팅"],
    },
};

export interface TeamMember {
    name: string;
    role: string;
    badge: string;
    background: string;
    photo: string;
}

export const TEAM: TeamMember[] = [
    {
        name: "김나빈",
        role: "Director",
        badge: "해외 마케팅",
        background: "Boston University Marketing · 글로벌 마케팅 전략",
        photo: "/makethisone/team/kimnabin.webp",
    },
    {
        name: "임유진",
        role: "General Manager",
        badge: "경제학 전공",
        background: "아주대학교 경제학과 · 파트너 파트 마케팅 총괄",
        photo: "/makethisone/team/imyujin.webp",
    },
    {
        name: "임미영",
        role: "Manager",
        badge: "KBS 작가 출신",
        background: "KBS 방송작가 출신 · 스토리텔링 기반 콘텐츠",
        photo: "/makethisone/team/immiyoung.webp",
    },
    {
        name: "문희원",
        role: "Assistant Manager",
        badge: "MBC 기자 출신",
        background: "지역 MBC 기자 출신 · 취재 기반 콘텐츠 기획",
        photo: "/makethisone/team/munheewon.webp",
    },
    {
        name: "정경재",
        role: "Editor",
        badge: "법학 전공",
        background: "아주대학교 법학과 · 법률 전문 콘텐츠 편집",
        photo: "/makethisone/team/jungkyungjae.webp",
    },
    {
        name: "신재선",
        role: "Editor",
        badge: "영문학 전공",
        background: "중앙대학교 영문과 · 법률 콘텐츠 기획/작성",
        photo: "/makethisone/team/shinjaeseon.webp",
    },
];

/* ── 운영 체계 ──
   "하나의 마케팅팀"이라는 약속의 실체.
   누가 전체를 책임지고 무엇이 나뉘어 있는지 보여준다.

   ⚠️ 실제 담당자가 없는 역할을 만들지 않는다.
      owners 는 확인된 사람만 넣는다. 확인 안 된 역할은 아예 넣지 않는다.
      Design/CRO 와 Data 담당은 아직 확인되지 않아 여기 없다 —
      대표 확인 후 추가한다. */

export interface OperatingRole {
    en: string;
    ko: string;
    scope: string;
    owners: string[];
}

export const OPERATING_ROLES: OperatingRole[] = [
    {
        en: "Account Strategy",
        ko: "전체 전략과 예산을 한 사람이 책임집니다",
        scope: "채널별 담당자가 각자 판단하지 않습니다. 어디에 얼마를 쓸지, 무엇을 멈출지 한 곳에서 정합니다.",
        owners: ["김원영 · CEO"],
    },
    {
        en: "Marketing Operation",
        ko: "집행과 성과 관리",
        scope: "광고 계정 운영, 예산 배분 실행, 성과 정리. 로펌과 직접 소통하는 창구이기도 합니다.",
        owners: ["김나빈 · Director", "임유진 · General Manager"],
    },
    {
        en: "Editorial",
        ko: "쓰는 사람과 검수하는 사람이 다릅니다",
        scope: "기자·방송작가 출신이 쓰고, 법학 전공자가 법률 표현을 확인합니다. 한 사람이 쓰고 스스로 검수하지 않습니다.",
        owners: ["임미영 · KBS 작가 출신", "문희원 · MBC 기자 출신", "정경재 · 법학 전공", "신재선 · 콘텐츠 기획"],
    },
];

export const DISCIPLINES = [
    { en: "LEGAL", ko: "법률 콘텐츠 이해" },
    { en: "EDITORIAL", ko: "기자 · 방송작가 출신 제작" },
    { en: "PERFORMANCE", ko: "검색광고 · 데이터 분석" },
    { en: "DESIGN", ko: "홈페이지 · 브랜드 · 크리에이티브" },
    { en: "SEARCH", ko: "SEO · GEO · 검색 전략" },
];

/* ═══════════════ SECTION 09 — 파트너 ═══════════════
   현재 /makethisone 에 실명으로 공개 중인 목록 그대로. */

export const PARTNERS = [
    "법무법인 BHSN",
    "법무법인 아이엘",
    "법무법인 양영&정훈",
    "법무법인 새록",
    "법무법인 오른",
    "법무법인 해밀",
    "법무법인 세안",
    "법무법인 율빛",
    "법무법인 류현",
    "법무법인 그날",
    "법무법인 안세",
    "HANEUM Law",
    "법률사무소 로앤탑",
    "카라 법률사무소",
    "이정도 변호사",
    // 대표 확인(2026-08-28): 두 곳 모두 소규모 마케팅 대행을 실제로 수행한 고객사다.
    // 대표 근무경력에도 같은 이름이 있어 한때 근무처로만 오해했으나, 고객사가 맞다.
    "Samsung Medison",
    "KT",
];

// 이미 대외 공표 중인 수치만. 새로 만들지 않는다.
export const PROOF_STATS = [
    { value: "20", suffix: "+", label: "파트너 로펌" },
    { value: "100", suffix: "+", label: "완료 프로젝트" },
    { value: "7", suffix: "년+", label: "업력" },
];

/* ═══════════════ 회사 정보 ═══════════════ */

export const COMPANY = {
    brand: "MAKETHIS1",
    legalName: "메이크디스원",
    phone: "010-8935-3010",
    address: "서울특별시 동대문구 왕산로5길 13",
    site: "https://www.makethis1.com",
};
