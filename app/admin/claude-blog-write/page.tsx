"use client";

import { useEffect, useMemo, useState } from "react";
import { toNaverHtml } from "@/lib/blog-naver-html";
import { PenLine, Sparkles, Copy, Check, Loader2, RefreshCw, Lightbulb, ExternalLink } from "lucide-react";

interface TopicSuggestion {
    fieldId: string;
    fieldLabel: string;
    topic: string;
    keyword: string;
    intent: string;
    angle: string;
    titleIdeas: string[];
    talkingPoints: string[];
    conversionPoint: string;
    newsRefs: Array<{ title: string; url: string; source?: string }>;
    score: number;
}

interface TopicResponse {
    date: string;
    generatedAt: string;
    cached?: boolean;
    fields: Array<{
        id: string;
        label: string;
        topics: TopicSuggestion[];
    }>;
}

const TOPIC_CACHE_VERSION = "v3";

const FALLBACK_TOPIC_FIELDS: TopicResponse["fields"] = [
    {
        id: "divorce",
        label: "이혼",
        topics: [
            {
                fieldId: "divorce",
                fieldLabel: "이혼",
                topic: "재산분할에서 특유재산이 실제로 나뉘는 경우",
                keyword: "이혼 재산분할 특유재산",
                intent: "결혼 전 재산이나 부모님 지원금도 나눠야 하는지 확인하려는 검색 의도",
                angle: "특유재산이라도 유지·증식 기여가 있으면 다툼이 생긴다는 점을 사례형으로 설명",
                titleIdeas: ["특유재산도 재산분할 대상이 될까", "이혼 재산분할, 결혼 전 재산도 나뉘나"],
                talkingPoints: ["특유재산과 공동재산의 구분", "기여도 입증자료", "초기 재산목록 정리의 중요성"],
                conversionPoint: "재산 흐름 자료를 놓치기 전에 상담을 유도",
                newsRefs: [],
                score: 88,
            },
            {
                fieldId: "divorce",
                fieldLabel: "이혼",
                topic: "양육권 다툼에서 법원이 실제로 보는 생활환경",
                keyword: "양육권 친권 면접교섭",
                intent: "아이를 누가 키우게 될지 불안해하는 부모의 상담 전 검색 의도",
                angle: "소득보다 실제 돌봄, 주거, 양육 계획이 중요하다는 점을 설명",
                titleIdeas: ["양육권 소송에서 법원이 보는 기준", "아이를 키우고 싶다면 먼저 준비할 자료"],
                talkingPoints: ["주양육자 자료", "아이 생활 안정성", "면접교섭 계획"],
                conversionPoint: "감정싸움 전 양육자료 정리가 필요하다는 메시지",
                newsRefs: [],
                score: 86,
            },
            {
                fieldId: "divorce",
                fieldLabel: "이혼",
                topic: "상간소송 증거로 카톡과 사진을 쓸 때 조심할 점",
                keyword: "상간소송 증거",
                intent: "이미 확보한 증거가 소송에서 쓸 수 있는지 확인하려는 검색 의도",
                angle: "증거능력과 불법수집 위험을 함께 짚어 상담 필요성을 높임",
                titleIdeas: ["상간소송 카톡 증거, 그대로 내도 될까", "불륜 증거 모을 때 하면 안 되는 행동"],
                talkingPoints: ["합법 증거와 불법 증거", "위자료 산정 요소", "소장 전 증거 정리"],
                conversionPoint: "증거를 더 모으기 전에 불법 리스크 점검 상담 유도",
                newsRefs: [],
                score: 90,
            },
        ],
    },
    {
        id: "criminal",
        label: "형사",
        topics: [
            {
                fieldId: "criminal",
                fieldLabel: "형사",
                topic: "경찰 조사 전 진술서를 혼자 준비하면 위험한 사건",
                keyword: "경찰조사 진술서",
                intent: "첫 조사 전에 무엇을 말해야 할지 불안한 피의자·피고소인의 검색 의도",
                angle: "첫 진술이 이후 사건 방향을 좌우한다는 점을 실무형으로 설명",
                titleIdeas: ["경찰조사 전 진술서, 혼자 쓰면 위험한 이유", "첫 경찰조사 전에 준비해야 할 것"],
                talkingPoints: ["첫 진술의 중요성", "불리한 표현", "변호인 동석 필요성"],
                conversionPoint: "조사 일정 전 긴급 상담을 유도",
                newsRefs: [],
                score: 92,
            },
            {
                fieldId: "criminal",
                fieldLabel: "형사",
                topic: "스토킹·데이트폭력 고소 후 합의가 가능한 시점",
                keyword: "스토킹 고소 합의",
                intent: "고소 후 처벌 수위와 합의 가능성을 확인하려는 검색 의도",
                angle: "접근금지, 피해자 보호, 합의 전략을 균형 있게 설명",
                titleIdeas: ["스토킹 고소 후 합의, 언제 가능할까", "데이트폭력 고소 뒤 바로 해야 할 일"],
                talkingPoints: ["잠정조치", "합의 시점", "2차 가해 위험"],
                conversionPoint: "연락 방식 하나도 문제가 될 수 있어 상담 유도",
                newsRefs: [],
                score: 87,
            },
            {
                fieldId: "criminal",
                fieldLabel: "형사",
                topic: "보이스피싱 전달책으로 조사받을 때 무죄 주장 포인트",
                keyword: "보이스피싱 전달책",
                intent: "억울하게 가담자로 몰렸다고 느끼는 피의자의 검색 의도",
                angle: "고의 인식 여부와 객관 자료의 중요성을 설명",
                titleIdeas: ["보이스피싱 전달책, 몰랐다는 말만으로 부족합니다", "보이스피싱 가담 혐의 대응 방법"],
                talkingPoints: ["고의성 판단", "구인공고·대화내역", "초기 조사 대응"],
                conversionPoint: "휴대폰 자료 보존과 조사 전 상담 유도",
                newsRefs: [],
                score: 91,
            },
        ],
    },
    {
        id: "real-estate",
        label: "부동산",
        topics: [
            {
                fieldId: "real-estate",
                fieldLabel: "부동산",
                topic: "전세보증금 반환이 늦어질 때 바로 해야 할 조치",
                keyword: "전세보증금 반환",
                intent: "집주인이 돈을 안 줄 때 당장 무엇을 해야 하는지 찾는 검색 의도",
                angle: "내용증명, 임차권등기, 지급명령 순서를 구체적으로 설명",
                titleIdeas: ["전세보증금 못 받을 때 바로 해야 할 일", "이사 전 임차권등기 꼭 해야 할까"],
                talkingPoints: ["임차권등기명령", "보증보험", "지연손해금"],
                conversionPoint: "이사 전 권리 보전 상담 유도",
                newsRefs: [],
                score: 94,
            },
            {
                fieldId: "real-estate",
                fieldLabel: "부동산",
                topic: "명도소송 전에 내용증명을 보내야 하는 이유",
                keyword: "명도소송 내용증명",
                intent: "임차인 퇴거 문제를 빠르게 해결하려는 임대인의 검색 의도",
                angle: "해지 통보와 점유관계 정리가 소송기간에 영향을 준다는 점을 설명",
                titleIdeas: ["명도소송 전 내용증명, 왜 먼저 보내야 할까", "임차인이 안 나갈 때 명도소송 순서"],
                talkingPoints: ["계약해지 통보", "점유자 특정", "강제집행 준비"],
                conversionPoint: "무리한 자력구제 방지와 소송 설계 상담 유도",
                newsRefs: [],
                score: 86,
            },
            {
                fieldId: "real-estate",
                fieldLabel: "부동산",
                topic: "매매계약 해제와 계약금 반환 분쟁",
                keyword: "부동산 계약해제 계약금",
                intent: "계약금을 돌려받거나 지켜야 하는 상황에서 검색하는 의도",
                angle: "해제 사유, 위약금, 중도금 지급 여부를 중심으로 설명",
                titleIdeas: ["부동산 계약 해제, 계약금 돌려받을 수 있을까", "매매계약 파기 전 꼭 확인할 것"],
                talkingPoints: ["해약금과 위약금", "중도금 지급 후 해제", "문자·계약서 증거"],
                conversionPoint: "해제 통보 전 문구 검토 상담 유도",
                newsRefs: [],
                score: 84,
            },
        ],
    },
    {
        id: "construction",
        label: "건설",
        topics: [
            {
                fieldId: "construction",
                fieldLabel: "건설",
                topic: "공사대금 미지급 때 증거로 남겨야 할 자료",
                keyword: "공사대금 미지급",
                intent: "공사를 끝냈는데 돈을 못 받은 시공자의 검색 의도",
                angle: "계약서가 부족해도 기성고와 추가공사 자료로 입증하는 흐름 설명",
                titleIdeas: ["공사대금 못 받았을 때 필요한 증거", "계약서 없어도 공사대금 청구 가능할까"],
                talkingPoints: ["견적서·세금계산서", "현장 사진", "추가공사 승인"],
                conversionPoint: "자료가 사라지기 전 증거 정리 상담 유도",
                newsRefs: [],
                score: 89,
            },
            {
                fieldId: "construction",
                fieldLabel: "건설",
                topic: "하자보수 청구와 손해배상 청구의 차이",
                keyword: "건설 하자보수 손해배상",
                intent: "하자 때문에 수리비나 배상을 받을 수 있는지 확인하려는 검색 의도",
                angle: "감정, 하자 범위, 보수비 산정을 쉽게 설명",
                titleIdeas: ["하자보수와 손해배상, 무엇을 청구해야 할까", "건설 하자 분쟁에서 감정이 중요한 이유"],
                talkingPoints: ["하자 감정", "보수비 산정", "담보책임 기간"],
                conversionPoint: "현장 보존과 감정 전 상담 유도",
                newsRefs: [],
                score: 85,
            },
            {
                fieldId: "construction",
                fieldLabel: "건설",
                topic: "지체상금 약정이 있어도 전액 인정되지 않는 경우",
                keyword: "공사지연 지체상금",
                intent: "공사가 늦어졌거나 지체상금을 청구받은 당사자의 검색 의도",
                angle: "귀책사유와 공기연장 사유가 핵심이라는 점 설명",
                titleIdeas: ["공사지연 지체상금, 전액 내야 할까", "지체상금 분쟁에서 꼭 보는 자료"],
                talkingPoints: ["공기연장 사유", "발주자 귀책", "지체상금 감액"],
                conversionPoint: "공정표와 현장 기록 검토 상담 유도",
                newsRefs: [],
                score: 83,
            },
        ],
    },
    {
        id: "inheritance",
        label: "상속",
        topics: [
            {
                fieldId: "inheritance",
                fieldLabel: "상속",
                topic: "유류분 청구 전에 증여 내역을 확인해야 하는 이유",
                keyword: "유류분 반환청구",
                intent: "형제 중 누가 더 많이 받았는지 다투는 상속인의 검색 의도",
                angle: "생전증여와 특별수익 자료가 결과를 바꾼다는 점을 설명",
                titleIdeas: ["유류분 청구 전 증여 내역부터 확인하세요", "상속에서 생전증여가 문제 되는 경우"],
                talkingPoints: ["특별수익", "금융거래내역", "청구 기간"],
                conversionPoint: "기간 도과 전 자료 추적 상담 유도",
                newsRefs: [],
                score: 90,
            },
            {
                fieldId: "inheritance",
                fieldLabel: "상속",
                topic: "상속포기와 한정승인을 헷갈리면 생기는 문제",
                keyword: "상속포기 한정승인",
                intent: "빚이 많은 상속을 어떻게 처리해야 하는지 찾는 검색 의도",
                angle: "3개월 기간과 선택별 효과 차이를 명확히 설명",
                titleIdeas: ["상속포기와 한정승인, 선택을 잘못하면 생기는 일", "상속 빚이 많을 때 3개월 안에 해야 할 일"],
                talkingPoints: ["숙려기간", "채무 확인", "후순위 상속인"],
                conversionPoint: "3개월 기한 전 긴급 상담 유도",
                newsRefs: [],
                score: 93,
            },
            {
                fieldId: "inheritance",
                fieldLabel: "상속",
                topic: "상속재산분할 협의가 깨졌을 때 소송 흐름",
                keyword: "상속재산분할심판",
                intent: "가족 간 협의가 안 될 때 다음 절차를 찾는 검색 의도",
                angle: "협의, 조정, 심판 절차와 부동산 분할 방식을 설명",
                titleIdeas: ["상속재산분할 협의가 안 될 때 다음 단계", "상속 부동산을 나누는 현실적인 방법"],
                talkingPoints: ["상속인 확정", "재산목록", "기여분·특별수익"],
                conversionPoint: "감정싸움 전에 재산표 정리 상담 유도",
                newsRefs: [],
                score: 85,
            },
        ],
    },
    {
        id: "bankruptcy",
        label: "회생/파산",
        topics: [
            {
                fieldId: "bankruptcy",
                fieldLabel: "회생/파산",
                topic: "개인회생 신청 전 통장거래를 정리해야 하는 이유",
                keyword: "개인회생 통장거래",
                intent: "개인회생을 준비하면서 최근 입출금 내역이 문제가 될지 걱정하는 채무자의 검색 의도",
                angle: "재산 은닉 오해, 편파변제, 소득 입증 문제가 변제계획에 영향을 줄 수 있다는 점을 설명",
                titleIdeas: ["개인회생 전 통장거래, 왜 먼저 봐야 할까", "개인회생 신청 전에 하면 안 되는 이체"],
                talkingPoints: ["최근 입출금 내역", "편파변제 위험", "소득과 생계비 입증"],
                conversionPoint: "신청 전 통장내역을 정리해 기각·보정 리스크 상담 유도",
                newsRefs: [],
                score: 92,
            },
            {
                fieldId: "bankruptcy",
                fieldLabel: "회생/파산",
                topic: "개인파산과 면책이 기각될 수 있는 경우",
                keyword: "개인파산 면책 기각",
                intent: "파산 신청을 해도 빚이 없어지지 않을까 봐 불안한 채무자의 검색 의도",
                angle: "면책불허가 사유와 최근 소비·채무 발생 경위를 중심으로 설명",
                titleIdeas: ["개인파산 면책, 이런 경우 기각될 수 있습니다", "파산 신청 전 꼭 확인해야 할 면책불허가 사유"],
                talkingPoints: ["면책불허가 사유", "도박·투자 채무", "재산 처분 내역"],
                conversionPoint: "신청 가능성 판단과 자료 보완 상담 유도",
                newsRefs: [],
                score: 90,
            },
            {
                fieldId: "bankruptcy",
                fieldLabel: "회생/파산",
                topic: "사업자 채무가 있을 때 회생과 파산 중 무엇을 선택할까",
                keyword: "사업자 회생 파산",
                intent: "매출은 줄고 채무는 늘어난 자영업자·법인 대표의 검색 의도",
                angle: "영업 지속 가능성, 채권자 대응, 보증채무를 기준으로 절차 선택을 설명",
                titleIdeas: ["사업자 채무, 회생과 파산 중 무엇이 맞을까", "자영업자 빚 문제에서 절차 선택 기준"],
                talkingPoints: ["영업 계속 가능성", "보증채무와 세금", "채권자 독촉 대응"],
                conversionPoint: "독촉·압류 전 절차 선택 상담 유도",
                newsRefs: [],
                score: 89,
            },
        ],
    },
    {
        id: "civil",
        label: "민사",
        topics: [
            {
                fieldId: "civil",
                fieldLabel: "민사",
                topic: "차용증 없이 빌려준 돈을 받을 수 있는 방법",
                keyword: "대여금 소송 차용증",
                intent: "차용증은 없지만 계좌이체나 카톡이 있는 채권자의 검색 의도",
                angle: "돈을 빌려준 사실과 변제 약속을 어떻게 입증하는지 설명",
                titleIdeas: ["차용증 없어도 빌려준 돈 받을 수 있을까", "대여금 소송에서 카톡 증거가 중요한 이유"],
                talkingPoints: ["계좌이체 내역", "카톡·문자", "지급명령"],
                conversionPoint: "상대가 재산을 빼기 전 보전처분 상담 유도",
                newsRefs: [],
                score: 91,
            },
            {
                fieldId: "civil",
                fieldLabel: "민사",
                topic: "손해배상 청구에서 입증자료가 부족한 경우",
                keyword: "손해배상 입증",
                intent: "피해는 있는데 어떤 자료를 내야 할지 모르는 사람의 검색 의도",
                angle: "손해 발생, 인과관계, 금액 입증을 분리해 설명",
                titleIdeas: ["손해배상 청구, 증거가 부족하면 어떻게 될까", "피해를 입증하려면 어떤 자료가 필요할까"],
                talkingPoints: ["손해액 산정", "인과관계", "진단서·견적서"],
                conversionPoint: "자료 보완 가능성 상담 유도",
                newsRefs: [],
                score: 84,
            },
            {
                fieldId: "civil",
                fieldLabel: "민사",
                topic: "내용증명을 보냈는데도 상대가 무시할 때 다음 단계",
                keyword: "내용증명 다음 단계",
                intent: "내용증명 이후 소송·지급명령 여부를 고민하는 검색 의도",
                angle: "내용증명은 시작일 뿐이고 이후 절차 선택이 중요하다는 점 설명",
                titleIdeas: ["내용증명 무시당했을 때 다음 단계", "내용증명 후 바로 소송해야 할까"],
                talkingPoints: ["지급명령", "소장 제출", "가압류 검토"],
                conversionPoint: "소송 전 절차 선택 상담 유도",
                newsRefs: [],
                score: 87,
            },
        ],
    },
    {
        id: "medical",
        label: "의료",
        topics: [
            {
                fieldId: "medical",
                fieldLabel: "의료",
                topic: "의료과실을 입증하려면 확보해야 할 진료기록",
                keyword: "의료과실 진료기록",
                intent: "치료 후 문제가 생겨 과실인지 확인하려는 환자·보호자의 검색 의도",
                angle: "진료기록 사본·영상자료 확보와 의료감정의 중요성을 설명",
                titleIdeas: ["의료사고, 진료기록부터 확보해야 하는 이유", "의료과실 입증에 꼭 필요한 자료"],
                talkingPoints: ["진료기록 사본 청구", "의료감정", "인과관계 입증"],
                conversionPoint: "기록이 변경·폐기되기 전 확보 상담 유도",
                newsRefs: [],
                score: 88,
            },
            {
                fieldId: "medical",
                fieldLabel: "의료",
                topic: "요양급여 환수처분을 받았을 때 대응 절차",
                keyword: "요양급여 환수 처분",
                intent: "건보공단 환수·업무정지 처분을 받은 의료기관의 검색 의도",
                angle: "행정처분 절차와 이의신청·행정소송 대응을 설명",
                titleIdeas: ["요양급여 환수처분, 이의신청부터 준비하세요", "환수·업무정지 처분 대응 순서"],
                talkingPoints: ["처분 사유 검토", "이의신청 기한", "행정소송·집행정지"],
                conversionPoint: "처분 통지 후 기한 내 대응 상담 유도",
                newsRefs: [],
                score: 86,
            },
            {
                fieldId: "medical",
                fieldLabel: "의료",
                topic: "의료분쟁 조정과 소송 중 무엇을 선택할까",
                keyword: "의료분쟁 조정 소송",
                intent: "의료분쟁조정중재원 조정과 민사소송 사이에서 고민하는 검색 의도",
                angle: "조정과 소송의 기간·비용·입증 부담 차이를 비교",
                titleIdeas: ["의료분쟁, 조정과 소송 어떻게 다를까", "의료소송 전에 조정을 고려해야 하는 경우"],
                talkingPoints: ["조정 신청 절차", "감정 부담", "소송 전환 시점"],
                conversionPoint: "사안에 맞는 절차 선택 상담 유도",
                newsRefs: [],
                score: 85,
            },
        ],
    },
];

export default function ClaudeBlogWritePage() {
    const [field, setField] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [polishedBody, setPolishedBody] = useState("");
    const [draftBody, setDraftBody] = useState("");
    const [polished, setPolished] = useState(false);
    const [polishReason, setPolishReason] = useState<string | null>(null);
    const [showingDraft, setShowingDraft] = useState(false);
    // 보고 있는 쪽을 편집한다 (윤문본/초안 각각 수정 내용이 유지됨)
    const body = showingDraft ? draftBody : polishedBody;
    const setBody = showingDraft ? setDraftBody : setPolishedBody;
    const [copied, setCopied] = useState(false);
    const [styledCopied, setStyledCopied] = useState(false);
    const [topicsData, setTopicsData] = useState<TopicResponse | null>(null);
    const [topicsLoading, setTopicsLoading] = useState(false);
    const [topicsError, setTopicsError] = useState("");
    const [selectedField, setSelectedField] = useState("divorce");

    const todayKey = useMemo(() => new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date()), []);

    const loadTopics = async (force = false) => {
        setTopicsLoading(true);
        setTopicsError("");
        try {
            const cacheKey = `macdee:claude-blog-topics:${TOPIC_CACHE_VERSION}:${todayKey}`;
            if (!force) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached) as TopicResponse;
                    if (parsed.fields?.some((item) => item.id === "medical")) {
                        setTopicsData(parsed);
                        setTopicsLoading(false);
                        return;
                    }
                }
            }

            const res = await fetch(`/api/admin/claude-blog-write/topics${force ? "?force=1" : ""}`, {
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) {
                setTopicsError(data.error || "추천 주제를 불러오지 못했습니다.");
                return;
            }
            setTopicsData(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
            setTopicsError("추천 주제를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setTopicsLoading(false);
        }
    };

    useEffect(() => {
        loadTopics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 공백 제외 글자 수 (목표 3000~3500)
    const charCount = body.replace(/\s/g, "").length;
    const inRange = charCount >= 3000 && charCount <= 3500;

    const handleGenerate = async () => {
        if (!content.trim()) {
            setError("작성할 내용을 입력해주세요.");
            return;
        }
        setLoading(true);
        setError("");
        setCopied(false);
        try {
            const res = await fetch("/api/admin/claude-blog-write", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ content, field }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "생성에 실패했습니다.");
                return;
            }
            setTitle(data.title || "");
            setPolishedBody(data.body || "");
            setDraftBody(data.draftBody || data.body || "");
            setPolished(!!data.polished);
            setPolishReason(data.polishReason || null);
            setShowingDraft(false);
        } catch {
            setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    // 네이버에 서식 그대로 붙여넣기 위한 리치 텍스트 복사.
    // 숨긴 div에 HTML을 넣고 선택 → execCommand("copy")로 클립보드에 text/html을 싣는다.
    // (Clipboard API는 브라우저·권한에 따라 막히는 경우가 있어 이 방식이 더 안전하다)
    const handleCopyStyled = async () => {
        const html = toNaverHtml(body, title);
        const holder = document.createElement("div");
        holder.setAttribute("style", "position:fixed;left:-9999px;top:0;white-space:normal;");
        holder.innerHTML = html;
        document.body.appendChild(holder);

        try {
            const range = document.createRange();
            range.selectNodeContents(holder);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);

            const ok = document.execCommand("copy");
            sel?.removeAllRanges();
            if (!ok) throw new Error("execCommand 실패");

            setStyledCopied(true);
            setTimeout(() => setStyledCopied(false), 2000);
        } catch {
            try {
                const item = new ClipboardItem({
                    "text/html": new Blob([html], { type: "text/html" }),
                    "text/plain": new Blob([holder.innerText], { type: "text/plain" }),
                });
                await navigator.clipboard.write([item]);
                setStyledCopied(true);
                setTimeout(() => setStyledCopied(false), 2000);
            } catch {
                setError("서식 복사에 실패했습니다. 브라우저를 Chrome으로 열어보세요.");
            }
        } finally {
            document.body.removeChild(holder);
        }
    };

    const handleCopy = async () => {
        const text = title ? `${title}\n\n${body}` : body;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError("복사에 실패했습니다.");
        }
    };

    const handleUseTopic = (topic: TopicSuggestion) => {
        setField(topic.fieldLabel);
        setContent([
            `[추천 주제] ${topic.topic}`,
            `[핵심 키워드] ${topic.keyword}`,
            `[검색 의도] ${topic.intent}`,
            `[글의 관점] ${topic.angle}`,
            `[본문에 반드시 넣을 쟁점]`,
            ...topic.talkingPoints.map((point, index) => `${index + 1}. ${point}`),
            `[상담 전환 포인트] ${topic.conversionPoint}`,
            topic.newsRefs.length > 0
                ? `[참고 뉴스/자료]\n${topic.newsRefs.map((ref) => `- ${ref.title}${ref.source ? ` (${ref.source})` : ""}: ${ref.url}`).join("\n")}`
                : "",
        ].filter(Boolean).join("\n\n"));
        setTitle("");
        setBody("");
        setError("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const topicFields = topicsData?.fields?.length ? topicsData.fields : FALLBACK_TOPIC_FIELDS;
    const selectedTopics = topicFields.find((item) => item.id === selectedField)?.topics || [];

    return (
        <div className="max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#3563AE]/15 flex items-center justify-center">
                    <PenLine size={18} className="text-[#3563AE]" />
                </div>
                <h1 className="text-xl font-bold text-white">클로드 블로그 글쓰기</h1>
            </div>
            <p className="text-[13px] text-[#6B7280] mb-7 leading-relaxed">
                쓰고 싶은 내용을 요약해서 넣거나, 두서없이 떠오르는 대로 적어도 됩니다. 현존 최고 글쓰기 모델(Claude Opus 5)이
                의뢰인이 상담 전화를 결심하도록 설계된 3,000~3,500자 법률 콘텐츠로 다듬어 줍니다.
            </p>

            <div className="mb-6 bg-[#0F1320] border border-[#1A2035] rounded-xl p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                            <Lightbulb size={16} className="text-amber-300" />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-semibold text-white">오늘의 추천 주제</h2>
                            <p className="text-[11px] text-[#6B7280]">
                                {topicsData ? `${topicsData.date} 기준` : "분야별 3개씩 자동 추천"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => loadTopics(true)}
                        disabled={topicsLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1A2035] hover:bg-[#222a44] disabled:opacity-50 text-[#9CA3B0] hover:text-white text-[12px] rounded-lg transition-colors"
                    >
                        <RefreshCw size={13} className={topicsLoading ? "animate-spin" : ""} />
                        새로고침
                    </button>
                </div>

                {topicsError && <p className="text-[13px] text-red-400 mb-3">{topicsError}</p>}

                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
                    {topicFields.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedField(item.id)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${selectedField === item.id
                                ? "bg-[#3563AE] text-white"
                                : "bg-[#0B0F1A] border border-[#1A2035] text-[#9CA3B0] hover:text-white"
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {topicsLoading && !topicsData && (
                    <div className="flex items-center gap-2 text-[12px] text-[#9CA3B0] mb-3">
                        <Loader2 size={14} className="animate-spin" />
                        최신 뉴스 기반 추천을 불러오는 중입니다. 먼저 기본 추천 주제를 표시합니다.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {selectedTopics.map((topic) => (
                            <div key={`${topic.fieldId}-${topic.topic}`} className="bg-[#0B0F1A] border border-[#1A2035] rounded-lg p-4">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="text-[14px] font-semibold text-white leading-snug">{topic.topic}</h3>
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 shrink-0">
                                        {topic.score}
                                    </span>
                                </div>
                                <p className="text-[12px] text-[#9CA3B0] leading-relaxed mb-3">{topic.intent}</p>
                                <div className="space-y-1.5 mb-3">
                                    {topic.titleIdeas.slice(0, 2).map((idea) => (
                                        <p key={idea} className="text-[12px] text-[#D1D5DE] leading-relaxed">“{idea}”</p>
                                    ))}
                                </div>
                                {topic.newsRefs[0] && (
                                    <a
                                        href={topic.newsRefs[0].url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-[#6B94E0] hover:text-[#8AB4F8] mb-3 max-w-full"
                                    >
                                        <ExternalLink size={11} />
                                        <span className="truncate">{topic.newsRefs[0].source || "참고자료"}</span>
                                    </a>
                                )}
                                <button
                                    onClick={() => handleUseTopic(topic)}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1A2035] hover:bg-[#3563AE] text-[#D1D5DE] hover:text-white text-[12px] rounded-lg transition-colors"
                                >
                                    <PenLine size={13} />
                                    이 주제로 쓰기
                                </button>
                            </div>
                    ))}
                </div>
            </div>

            {/* Input */}
            <div className="bg-[#0F1320] border border-[#1A2035] rounded-xl p-5 space-y-4">
                <div>
                    <label className="block text-[12px] font-medium text-[#9CA3B0] mb-1.5">
                        분야 / 사건 유형 <span className="text-[#4B5563]">(선택)</span>
                    </label>
                    <input
                        type="text"
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        placeholder="예: 이혼·재산분할 / 형사 성범죄 / 상속 유류분 / 교통사고"
                        className="w-full px-3.5 py-2.5 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[14px] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-[12px] font-medium text-[#9CA3B0] mb-1.5">
                        작성할 내용 <span className="text-red-400">*</span>
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={9}
                        placeholder={
                            "사건 개요, 쟁점, 결과, 강조하고 싶은 점 등을 자유롭게 적어주세요.\n\n예) 음주운전 2회 적발된 의뢰인. 면허취소에 형사처벌까지 걱정. 초범 아니라 실형 가능성. 결국 벌금형으로 마무리함. 빨리 변호사 선임한 게 컸음. 양형자료 준비가 핵심이었다는 점 강조하고 싶음."
                        }
                        className="w-full px-3.5 py-3 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[14px] text-white placeholder-[#4B5563] leading-relaxed focus:outline-none focus:border-[#3563AE] transition-colors resize-y"
                    />
                </div>

                {error && (
                    <p className="text-[13px] text-red-400">{error}</p>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3563AE] hover:bg-[#2A4F8A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-lg transition-colors"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            글을 쓰는 중… (최대 1~2분)
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            글 생성하기
                        </>
                    )}
                </button>
            </div>

            {/* Output */}
            {(title || body) && (
                <div className="mt-6 bg-[#0F1320] border border-[#1A2035] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-[13px] font-medium text-white">생성 결과</span>
                            <span
                                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${inRange
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-amber-500/15 text-amber-400"
                                    }`}
                            >
                                공백 제외 {charCount.toLocaleString()}자
                                {inRange ? " · 적정" : " · 3,000~3,500 권장"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {polished ? (
                                <>
                                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-sky-500/15 text-sky-400">
                                        2차 윤문 완료
                                    </span>
                                    <button
                                        onClick={() => setShowingDraft((v) => !v)}
                                        className="px-2.5 py-1 bg-[#1A2035] hover:bg-[#222a44] text-[#9CA3B0] hover:text-white text-[11px] rounded-lg transition-colors"
                                    >
                                        {showingDraft ? "윤문본 보기" : "초안 보기"}
                                    </button>
                                </>
                            ) : (
                                <span
                                    className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#1A2035] text-[#6B7280]"
                                    title={polishReason || undefined}
                                >
                                    윤문 미적용
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyStyled}
                                title="소제목·형광펜·밑줄이 적용된 상태로 네이버에 붙여넣어집니다"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3563AE] hover:bg-[#2d559a] text-white text-[12px] rounded-lg transition-colors"
                            >
                                {styledCopied ? <Check size={13} /> : <Copy size={13} />}
                                {styledCopied ? "복사됨" : "네이버용 복사 (서식 포함)"}
                            </button>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A2035] hover:bg-[#222a44] text-[#9CA3B0] hover:text-white text-[12px] rounded-lg transition-colors"
                            >
                                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                {copied ? "복사됨" : "원문 복사"}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-[#6B7280] mb-1.5">제목</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 mb-4 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[15px] font-semibold text-white focus:outline-none focus:border-[#3563AE] transition-colors"
                        />

                        <label className="block text-[11px] font-medium text-[#6B7280] mb-1.5">본문 (수정 가능){polished ? (showingDraft ? " · Claude 초안" : " · OpenAI 윤문본") : ""}</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={24}
                            className="w-full px-3.5 py-3 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[14px] text-[#D1D5DE] leading-[1.8] focus:outline-none focus:border-[#3563AE] transition-colors resize-y"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
