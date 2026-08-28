import { getPreprocessor, getContentGenerator } from "./ai/providers";

// Client Portal 의 AI 3역.
//   digestRecord    — 로펌 자료(상담기록·수임내역·판결문)를 구조화(DB화). Haiku.
//   organizeWorklog — 대표의 거친 업무 메모를 정돈된 항목으로. Haiku.
//   dailyAdvice     — 자료·업무일지를 근거로 오늘의 전략 조언 + 할 일. Sonnet.
//
// 원칙: 조언에도 §42 를 적용한다 — 보장·과장 표현 금지, 근거 없는 수치 금지.

function parseJson<T>(raw: string): T {
    // 모델이 코드펜스로 감싸는 경우 대비
    const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("AI 응답에서 JSON을 찾지 못했습니다");
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/* ── 1. 자료 구조화 ── */

export interface RecordStructured {
    요약: string;
    분야: string;
    사건유형: string;
    유입경로: string;
    키워드: string[];
    마케팅_시사점: string[];
    콘텐츠_소재: string[];
}

export async function digestRecord(input: {
    type: string;
    title: string;
    content: string;
}): Promise<RecordStructured> {
    const ai = getPreprocessor();
    const res = await ai.generate(
        [
            {
                role: "system",
                content: `당신은 로펌 마케팅 회사 MAKETHIS1 의 데이터 분석가입니다.
로펌이 올린 자료(상담기록/수임내역/판결문)를 마케팅 전략 수립에 쓸 수 있게 구조화합니다.

규칙:
- 개인정보(이름·연락처·주민번호·구체적 지명 등)는 절대 결과에 포함하지 않는다. 일반화한다.
- 자료에 없는 사실을 만들지 않는다. 알 수 없으면 "미상" 이라고 쓴다.
- 반드시 아래 JSON 형식으로만 응답한다. 다른 텍스트 금지.

{
  "요약": "2~3문장 요약",
  "분야": "예: 이혼, 형사, 회생·파산, 상속, 미상",
  "사건유형": "더 구체적인 유형 또는 미상",
  "유입경로": "자료에서 확인되면(검색광고/블로그/소개/전화 등), 아니면 미상",
  "키워드": ["마케팅에 쓸 검색 키워드 3~6개"],
  "마케팅_시사점": ["이 자료가 말해주는 전략적 시사점 2~4개"],
  "콘텐츠_소재": ["이 자료로 만들 수 있는 콘텐츠 아이디어 2~4개 (개인정보 없이)"]
}`,
            },
            {
                role: "user",
                content: `자료 유형: ${input.type}\n제목: ${input.title}\n\n내용:\n${input.content.slice(0, 12000)}`,
            },
        ],
        { maxTokens: 1500 }
    );
    return parseJson<RecordStructured>(res.content);
}

/* ── 2. 업무일지 정돈 ── */

export interface WorklogItem {
    area: string; // 광고 / 콘텐츠 / SEO / GEO / 홈페이지 / 데이터 / 소통 / 기타
    title: string;
    detail: string;
}

export async function organizeWorklog(rough: string): Promise<WorklogItem[]> {
    const ai = getPreprocessor();
    const res = await ai.generate(
        [
            {
                role: "system",
                content: `마케팅 담당자의 거친 업무 메모를 클라이언트(로펌 대표)에게 보여줄 수 있는
정돈된 업무 항목으로 바꿉니다.

규칙:
- 메모에 없는 일을 만들지 않는다.
- 항목별 area 는 다음 중 하나: 광고, 콘텐츠, SEO, GEO, 홈페이지, 데이터, 소통, 기타
- title 은 15자 내외의 명사형, detail 은 로펌 대표가 이해할 수 있는 1~2문장.
- 반드시 JSON 만: {"items":[{"area":"","title":"","detail":""}]}`,
            },
            { role: "user", content: rough.slice(0, 6000) },
        ],
        { maxTokens: 1500 }
    );
    return parseJson<{ items: WorklogItem[] }>(res.content).items ?? [];
}

/* ── 3. 오늘의 조언 ── */

export interface AdviceResult {
    summary: string;
    recommendations: { title: string; why: string; area: string }[];
    todos: { task: string; owner: "MAKETHIS1" | "로펌"; priority: "높음" | "보통" }[];
}

export async function dailyAdvice(context: {
    firmName: string;
    date: string;
    records: string[]; // 최근 자료 구조화 요약들
    worklogs: string[]; // 최근 업무일지 요약들
}): Promise<AdviceResult> {
    const ai = getContentGenerator();
    const res = await ai.generate(
        [
            {
                role: "system",
                content: `당신은 로펌 전문 마케팅 회사 MAKETHIS1 의 전략 책임자입니다.
클라이언트 로펌의 최근 자료와 진행된 작업을 근거로 오늘의 마케팅 조언을 만듭니다.

원칙:
- 근거는 제공된 자료에서만. 자료에 없는 수치·사실을 만들지 않는다.
- "보장", "1위 약속" 같은 표현 금지. 담백하고 단정적인 전문가 어투.
- 추천은 실행 가능한 것만, 우선순위가 분명하게.
- todos 의 owner: MAKETHIS1 이 할 일과 로펌이 해줘야 할 일(자료 제공·승인 등)을 구분.
- 반드시 JSON 만:
{
  "summary": "오늘의 핵심 판단 2~3문장",
  "recommendations": [{"title":"","why":"근거 1~2문장","area":"광고|콘텐츠|SEO|GEO|홈페이지|데이터"}],
  "todos": [{"task":"","owner":"MAKETHIS1|로펌","priority":"높음|보통"}]
}
recommendations 2~4개, todos 3~6개.`,
            },
            {
                role: "user",
                content: `로펌: ${context.firmName}
날짜: ${context.date}

[최근 로펌 자료 — AI 구조화 요약]
${context.records.length ? context.records.join("\n---\n") : "(아직 등록된 자료 없음)"}

[최근 MAKETHIS1 업무일지]
${context.worklogs.length ? context.worklogs.join("\n---\n") : "(아직 업무일지 없음)"}`,
            },
        ],
        { maxTokens: 2500 }
    );
    return parseJson<AdviceResult>(res.content);
}
