import { NextResponse } from "next/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

export const maxDuration = 120;

type FieldId = "divorce" | "criminal" | "real-estate" | "construction" | "inheritance" | "bankruptcy" | "civil";

interface NewsRef {
    title: string;
    url: string;
    source?: string;
    publishedAt?: string;
}

interface TopicSuggestion {
    fieldId: FieldId;
    fieldLabel: string;
    topic: string;
    keyword: string;
    intent: string;
    angle: string;
    titleIdeas: string[];
    talkingPoints: string[];
    conversionPoint: string;
    newsRefs: NewsRef[];
    score: number;
}

interface TopicResponse {
    date: string;
    generatedAt: string;
    fields: Array<{
        id: FieldId;
        label: string;
        topics: TopicSuggestion[];
    }>;
}

const LEGAL_FIELDS: Array<{ id: FieldId; label: string; queries: string[] }> = [
    { id: "divorce", label: "이혼", queries: ["이혼 재산분할 양육권 상간소송", "가정법원 이혼 소송 양육비"] },
    { id: "criminal", label: "형사", queries: ["형사 고소 경찰조사 스토킹 보이스피싱", "대법원 형사 사건 성범죄 음주운전"] },
    { id: "real-estate", label: "부동산", queries: ["전세보증금 반환 명도소송 임대차 분쟁", "부동산 계약 해제 손해배상"] },
    { id: "construction", label: "건설", queries: ["공사대금 하자보수 지체상금 건설 분쟁", "건설 공사 계약 손해배상"] },
    { id: "inheritance", label: "상속", queries: ["상속 유류분 한정승인 상속포기", "상속재산분할 유언 분쟁"] },
    { id: "bankruptcy", label: "회생/파산", queries: ["개인회생 개인파산 면책 채무조정", "법인회생 법인파산 채무 변제계획"] },
    { id: "civil", label: "민사", queries: ["대여금 손해배상 내용증명 민사소송", "민사 소송 가압류 지급명령"] },
];

let memoryCache: TopicResponse | null = null;

function getKstDateKey(date = new Date()): string {
    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function decodeEntities(text: string): string {
    return text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

function pickTag(item: string, tag: string): string {
    const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return match ? decodeEntities(match[1]) : "";
}

function unwrapGoogleNewsUrl(url: string): string {
    try {
        const parsed = new URL(url);
        const target = parsed.searchParams.get("url");
        return target || url;
    } catch {
        return url;
    }
}

async function fetchNewsForField(field: { id: FieldId; label: string; queries: string[] }): Promise<NewsRef[]> {
    const refs: NewsRef[] = [];

    for (const query of field.queries) {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:10d`)}&hl=ko&gl=KR&ceid=KR:ko`;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            let xml = "";
            try {
                const res = await fetch(rssUrl, {
                    headers: { "User-Agent": "Mozilla/5.0 macdee topic monitor" },
                    signal: controller.signal,
                    cache: "no-store",
                });
                if (!res.ok) continue;
                xml = await res.text();
            } finally {
                clearTimeout(timeout);
            }

            const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
                .slice(0, 4)
                .map((match) => match[1]);

            for (const item of items) {
                const title = pickTag(item, "title").replace(/\s+-\s+[^-]+$/, "").trim();
                const url = unwrapGoogleNewsUrl(pickTag(item, "link"));
                const source = pickTag(item, "source");
                const publishedAt = pickTag(item, "pubDate");
                if (!title || !url) continue;
                refs.push({ title, url, source, publishedAt });
            }
        } catch {
            // News is an input signal only; fallback topics still keep the admin flow usable.
        }
    }

    const seen = new Set<string>();
    return refs.filter((ref) => {
        const key = ref.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 8);
}

function extractJson(text: string): unknown {
    const stripped = text.replace(/^[\s]*```(?:json)?\s*/i, "").replace(/\s*```[\s]*$/, "").trim();
    try {
        return JSON.parse(stripped);
    } catch {
        const start = stripped.indexOf("{");
        const end = stripped.lastIndexOf("}");
        if (start !== -1 && end > start) {
            return JSON.parse(stripped.slice(start, end + 1));
        }
        throw new Error("No JSON object found");
    }
}

function normalizeTopic(raw: Partial<TopicSuggestion>, fieldId: FieldId, fieldLabel: string, newsRefs: NewsRef[], index: number): TopicSuggestion {
    const fallbackTopics: Record<FieldId, string[]> = {
        divorce: ["재산분할에서 특유재산이 나뉘는 경우", "양육권 다툼에서 생활환경이 중요한 이유", "상간소송 증거를 모을 때 조심할 점"],
        criminal: ["경찰조사 전 진술서를 혼자 쓰면 위험한 이유", "스토킹 고소 후 합의가 가능한 시점", "보이스피싱 전달책 조사를 받을 때 대응법"],
        "real-estate": ["전세보증금 반환이 늦어질 때 바로 할 일", "명도소송 전에 내용증명을 보내는 이유", "부동산 계약 해제와 계약금 반환 분쟁"],
        construction: ["공사대금 미지급 때 남겨야 할 증거", "하자보수와 손해배상 청구의 차이", "지체상금이 전액 인정되지 않는 경우"],
        inheritance: ["유류분 청구 전 증여 내역을 확인해야 하는 이유", "상속포기와 한정승인을 헷갈리면 생기는 문제", "상속재산분할 협의가 깨졌을 때 소송 흐름"],
        bankruptcy: ["개인회생 신청 전 통장거래를 정리해야 하는 이유", "개인파산과 면책이 기각될 수 있는 경우", "사업자 채무가 있을 때 회생과 파산 중 무엇을 선택할까"],
        civil: ["차용증 없이 빌려준 돈을 받는 방법", "손해배상 청구에서 입증자료가 부족한 경우", "내용증명을 무시당한 뒤 다음 단계"],
    };
    const topic = raw.topic || fallbackTopics[fieldId][index] || `${fieldLabel} 상담 전 꼭 확인할 쟁점`;
    const titleIdeas = Array.isArray(raw.titleIdeas) && raw.titleIdeas.length > 0
        ? raw.titleIdeas.slice(0, 3)
        : [`${topic}, 상담 전에 확인할 점`, `${fieldLabel} 사건에서 자주 놓치는 부분`];

    return {
        fieldId,
        fieldLabel,
        topic,
        keyword: raw.keyword || topic.split(" ")[0] || fieldLabel,
        intent: raw.intent || "내 상황에서 바로 상담이 필요한지 판단하려는 검색 의도",
        angle: raw.angle || "최근 이슈와 실무상 자주 생기는 오해를 연결해 설명",
        titleIdeas,
        talkingPoints: Array.isArray(raw.talkingPoints) && raw.talkingPoints.length > 0
            ? raw.talkingPoints.slice(0, 5)
            : ["초기 대응 시점", "혼자 처리할 때의 위험", "상담 전 준비자료"],
        conversionPoint: raw.conversionPoint || "기간과 증거를 놓치기 전에 상담을 유도",
        newsRefs: Array.isArray(raw.newsRefs) && raw.newsRefs.length > 0 ? raw.newsRefs.slice(0, 2) : newsRefs.slice(0, 2),
        score: Math.max(1, Math.min(100, Number(raw.score) || 80)),
    };
}

function fallbackResponse(newsByField: Record<FieldId, NewsRef[]>): TopicResponse {
    const date = getKstDateKey();
    return {
        date,
        generatedAt: new Date().toISOString(),
        fields: LEGAL_FIELDS.map((field) => ({
            id: field.id,
            label: field.label,
            topics: [0, 1, 2].map((index) => normalizeTopic({}, field.id, field.label, newsByField[field.id] || [], index)),
        })),
    };
}

async function generateTopics(newsByField: Record<FieldId, NewsRef[]>): Promise<TopicResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return fallbackResponse(newsByField);

    const newsBrief = LEGAL_FIELDS.map((field) => {
        const refs = (newsByField[field.id] || [])
            .map((ref, index) => `${index + 1}. ${ref.title} (${ref.source || "뉴스"}, ${ref.publishedAt || "날짜 미상"}) ${ref.url}`)
            .join("\n");
        return `## ${field.label}\n${refs || "최근 뉴스 신호 없음"}`;
    }).join("\n\n");

    const system = `당신은 한국 변호사 블로그의 전환율을 높이는 SEO 콘텐츠 전략가입니다.
오늘 수집한 법률 뉴스 신호를 참고하되, 뉴스 요약이 아니라 변호사 블로그에 올리면 상담 전환이 잘 날 주제를 추천합니다.

규칙:
- 분야별로 정확히 3개씩 추천합니다. 분야는 이혼, 형사, 부동산, 건설, 상속, 회생/파산, 민사입니다.
- 각 분야 3개는 1) 최근 뉴스/제도/판례 신호 기반 1개, 2) 꾸준한 검색 수요형 1개, 3) 상담 전환형 불안 해소 주제 1개로 구성합니다.
- 선정 기준은 검색 의도, 긴급성, 증거/기간 리스크, 상담 유도 가능성입니다.
- 과장, 승소 보장, 확인되지 않은 판례 번호는 금지합니다.
- 출력은 JSON만 반환합니다.`;

    const user = `오늘 날짜(KST): ${getKstDateKey()}

[최근 뉴스 신호]
${newsBrief}

아래 JSON 형식으로만 반환하세요.
{
  "fields": [
    {
      "id": "divorce",
      "label": "이혼",
      "topics": [
        {
          "topic": "주제",
          "keyword": "핵심 키워드",
          "intent": "의뢰인 검색 의도",
          "angle": "글에서 잡을 관점",
          "titleIdeas": ["제목1", "제목2", "제목3"],
          "talkingPoints": ["본문 쟁점1", "본문 쟁점2", "본문 쟁점3"],
          "conversionPoint": "상담 전환 포인트",
          "newsRefs": [{"title":"참고한 뉴스/자료 제목","url":"URL","source":"출처"}],
          "score": 85
        }
      ]
    }
  ]
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-opus-4-8",
            max_tokens: 12000,
            thinking: { type: "adaptive" },
            system,
            messages: [{ role: "user", content: user }],
        }),
    });

    if (!res.ok) {
        console.error("[Claude Topic Suggestions] Claude error:", await res.text());
        return fallbackResponse(newsByField);
    }

    const data = await res.json();
    const rawText = (data.content || []).find((block: { type: string; text?: string }) => block.type === "text")?.text || "";
    const parsed = extractJson(rawText) as { fields?: Array<{ id?: FieldId; label?: string; topics?: Partial<TopicSuggestion>[] }> };

    return {
        date: getKstDateKey(),
        generatedAt: new Date().toISOString(),
        fields: LEGAL_FIELDS.map((field) => {
            const generatedField = parsed.fields?.find((item) => item.id === field.id || item.label === field.label);
            const generatedTopics = generatedField?.topics || [];
            return {
                id: field.id,
                label: field.label,
                topics: [0, 1, 2].map((index) => normalizeTopic(
                    generatedTopics[index] || {},
                    field.id,
                    field.label,
                    newsByField[field.id] || [],
                    index,
                )),
            };
        }),
    };
}

export async function GET(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "1";
    const today = getKstDateKey();
    if (!force && memoryCache?.date === today) {
        return NextResponse.json({ ...memoryCache, cached: true });
    }

    const newsEntries = await Promise.all(
        LEGAL_FIELDS.map(async (field) => [field.id, await fetchNewsForField(field)] as const),
    );
    const newsByField = Object.fromEntries(newsEntries) as Record<FieldId, NewsRef[]>;

    try {
        memoryCache = await generateTopics(newsByField);
    } catch (err) {
        console.error("[Claude Topic Suggestions] Error:", err);
        memoryCache = fallbackResponse(newsByField);
    }

    return NextResponse.json({ ...memoryCache, cached: false });
}
