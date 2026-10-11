// 맥디 블로그 자동 발행 — 대상 변호사·시간표·검색 의도(2026-10-11 대표 지시).
//
// "6곳 맥디 블로그에 매일 2편씩, 각 변호사 주력 분야 글, 로펌 영업에 도움 되는 키워드, AI 인용, 검수 없이 자동 발행, 사진은 생성 이미지."
// 변호사는 lawyers.slug 로 찾는다(이름·사무소는 데이터베이스 값을 쓴다). 주력 분야는 2026-10-11 공개 블로그의 최근 글 주제를 보고 정했다.
// 한 명을 멈추려면 그 줄의 paused 를 true 로, 전체를 멈추려면 Vercel 환경변수 MACDEE_AUTOPOST_DISABLED=true.

export interface AutopostFocus {
    /** 글에 붙는 분야 이름(태그·프롬프트). */
    field: string;
    /** 이 분야에서 의뢰인이 변호사를 찾기 직전에 검색하는 말의 씨앗. 주제는 여기서 고르되 그대로 베끼지 않는다. */
    seeds: string[];
}

export interface AutopostLawyer {
    /** 발행 기록(uploads.file_url)에 들어가는 고정 키. 바꾸면 그날 발행 수를 다시 센다. */
    key: string;
    /** 맥디 블로그 주소의 변호사 부분(lawyers.slug). */
    slug: string;
    /** 기록·로그용 이름. 화면과 원고에는 데이터베이스의 이름·사무소를 쓴다. */
    label: string;
    /** 지역 키워드. 비우면 lawyers.region. */
    area?: string;
    /** 의뢰인 쪽이 아닌 경우의 독자 설명(예: 의료기관 측). */
    audience?: string;
    focus: AutopostFocus[];
    paused?: boolean;
}

const DIVORCE_SEEDS = [
    "협의이혼 절차와 숙려기간", "재판이혼 사유와 기간", "재산분할 기여도", "퇴직금·연금 재산분할", "부동산 재산분할",
    "양육권·친권 지정", "양육비 산정과 미지급 대응", "면접교섭", "이혼 위자료", "상간소송 위자료", "상간자 소장 받았을 때",
    "사실혼 해소", "혼인 전 재산과 특유재산", "이혼 조정", "가정폭력 이혼과 보호명령", "이혼소송 증거 수집",
];
const CRIMINAL_SEEDS = [
    "경찰 피의자 조사 출석", "고소장 접수 후 절차", "명예훼손·모욕 고소", "스토킹처벌법 위반", "폭행·상해 합의",
    "사기 고소와 대응", "기소유예·선고유예", "구속영장 실질심사", "형사 합의금", "집행유예 기준",
];

export const AUTOPOST_LAWYERS: AutopostLawyer[] = [
    {
        key: "kara-yujieun", slug: "86jinsong-pq4c", label: "유지은 변호사 · 법률사무소 카라",
        focus: [{ field: "이혼/가사", seeds: DIVORCE_SEEDS }],
    },
    {
        key: "jeongeum", slug: "lawandlow-5zyc", label: "강윤석 변호사 · 법무법인 정음", area: "천안",
        focus: [
            { field: "이혼/가사", seeds: DIVORCE_SEEDS },
            { field: "상속", seeds: ["상속포기와 한정승인", "특별한정승인", "유류분 반환청구", "상속재산분할 협의·심판", "유언장 효력", "부모님 빚 상속", "증여 재산과 유류분"] },
            { field: "형사", seeds: CRIMINAL_SEEDS },
        ],
    },
    {
        key: "yangyoung-jeonghun", slug: "ddrzzangna-xb35", label: "김정웅 변호사 · 법무법인 양영앤정훈",
        focus: [
            { field: "파산/회생", seeds: ["개인회생 신청 자격", "개인회생 변제금과 기간", "개인파산 면책", "법인파산 대표 책임", "법인회생 절차", "회생 중 재산 압류", "특별면책", "보증채무와 회생"] },
            { field: "형사", seeds: ["형사 항소심", "스토킹 기소유예", "성범죄 무고 대응", "범죄수익 몰수·추징", "경찰 조사 대응", "전과기록과 수사경력"] },
            { field: "민사·부동산", seeds: ["보증금 반환 소송", "공정증서 무효", "명도소송과 강제집행", "부동산 가압류", "지급명령 이의"] },
        ],
    },
    {
        key: "il-leejeongdo", slug: "jdnlaw-89mn", label: "이정도 변호사 · 법무법인 아이엘",
        focus: [
            { field: "음주운전·교통형사", seeds: ["음주운전 초범 처벌", "음주운전 재범 실형", "음주측정 거부", "음주운전 면허취소 구제", "숙취운전", "무면허 운전", "음주 사고 형사합의", "위험운전치상"] },
            { field: "스토킹·교제폭력", seeds: ["스토킹처벌법 처벌 기준", "스토킹 잠정조치", "교제폭력 신고와 처벌", "스토킹 피해 합의금", "접근금지 명령"] },
            { field: "형사", seeds: CRIMINAL_SEEDS },
        ],
    },
    {
        key: "geunal-leejieun", slug: "whileaway-w32s", label: "이지은 변호사 · 법무법인 그날",
        focus: [{ field: "이혼/가사", seeds: DIVORCE_SEEDS }],
    },
    {
        key: "ohseungjun", slug: "wonillaw-fe0n", label: "오승준 변호사(의료)",
        audience: "병의원 원장·의료인·의료기관 운영자(환자 측이 아니라 의료기관 측 자문·변호)",
        focus: [
            { field: "의료기관 현지조사·환수", seeds: ["건강보험 현지조사 대응", "요양급여 환수처분", "업무정지·과징금", "현지조사 자료 제출", "부당청구 소명"] },
            { field: "의료법 위반·행정처분", seeds: ["사무장병원 명의대여", "의료인 면허정지", "의료광고 심의와 위반", "진료기록부 작성 의무", "리베이트 처벌", "비급여 고지"] },
            { field: "의료분쟁(의료기관 측)", seeds: ["의료사고 설명의무", "의료분쟁 조정 신청 받았을 때", "의료사고 합의 대응", "업무상과실치상 고소", "진료 거부 정당 사유"] },
        ],
    },
];

/** 하루 두 편: 오전 칸과 오후 칸. 변호사 순서대로 40분씩 어긋나게 연다(09:00~12:20, 15:00~18:20 KST). */
export const SLOTS_PER_DAY = 2;
const SLOT_START_MIN = [9 * 60, 15 * 60];
const STAGGER_MIN = 40;

/** 그 변호사·칸이 열리는 시각(KST 자정부터 분). */
export function slotOpensAt(lawyerIndex: number, slot: number): number {
    return SLOT_START_MIN[slot] + lawyerIndex * STAGGER_MIN;
}

/** 검색 의도 — 칸마다 돌려 같은 분야라도 글의 각도가 겹치지 않게 한다. */
export const SEARCH_INTENTS = [
    "비용·기간: 얼마나 걸리고 무엇에 따라 비용이 달라지는지(구체 금액 단정 없이 결정 요소로)",
    "절차: 지금 단계에서 다음에 무슨 일이 일어나는지 순서대로",
    "결과·처벌 수위: 결론이 어떻게 갈리는지와 그 기준",
    "증거·서류: 무엇을 남기고 무엇을 준비해야 하는지",
    "흔한 실수: 혼자 대응하다 불리해지는 행동",
    "요건·판단 기준: 법원·기관이 실제로 보는 요소",
    "상황별 대처: '이런 연락·서류를 받았을 때' 바로 할 일",
    "비교: 비슷해 보이는 두 제도·선택지의 차이",
] as const;

/** 날짜(KST)·변호사·칸으로 정해지는 의도. 같은 날 같은 변호사의 두 편은 서로 다른 의도다. */
export function intentFor(dayNumber: number, lawyerIndex: number, slot: number): string {
    return SEARCH_INTENTS[(dayNumber * SLOTS_PER_DAY + slot + lawyerIndex * 3) % SEARCH_INTENTS.length];
}

/** 날짜·칸으로 이번 글의 분야를 고른다(분야가 여럿인 변호사는 번갈아). */
export function focusFor(lawyer: AutopostLawyer, dayNumber: number, slot: number): AutopostFocus {
    return lawyer.focus[(dayNumber * SLOTS_PER_DAY + slot) % lawyer.focus.length];
}
