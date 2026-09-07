// ─── 블로그 원고 2차 윤문 (OpenAI) ───
// Claude가 뽑은 초안을 다른 모델에 한 번 더 통과시켜 AI 문체의 지문을 흐린다.
// 원칙: 사실·구조·분량을 건드리면 실패다. 의심스러우면 초안을 그대로 쓴다.

const POLISH_MODEL = "gpt-5.6-sol";

const POLISH_SYSTEM = `
당신은 20년차 한국어 교열자입니다. AI가 쓴 티가 남아 있는 변호사 블로그 원고를, 사람이 직접 쓴 글로 다듬습니다. 새로 쓰는 게 아니라 결을 바꾸는 작업입니다.

[절대 바꾸지 말 것 — 사실이 틀어지면 실패입니다]
- 법조문 번호, 수치, 기한, 금액, 사건 경과는 한 글자도 바꾸지 마세요.
- 마크다운 구조를 유지하세요: ## 소제목의 개수와 위치, 그리고 ==형광펜==, __밑줄__, **굵게** 표시. 강조 표시는 개수도 위치도 바꾸지 말고 감싼 범위 그대로 두세요. 새로 추가하지도 마세요.
- 맨 끝 --- 아래의 기준일·작성 블록은 그대로 두세요.
- 판례 사건번호를 새로 지어 넣지 마세요.
- 분량을 유지하세요(공백 포함 3,000~3,500자). 문단을 통째로 지워 줄이지 마세요.

[지울 것 — AI 티가 나는 지점]
- "~에 대해 알아보겠습니다", "~을 살펴보겠습니다"
- "이번 글에서는", "지금까지 ~에 대해", "오늘은 ~"
- "결론적으로", "마무리하며", "종합해보면"
- "~하는 것이 중요합니다", "~할 필요가 있습니다"
- "~라고 할 수 있습니다", "~라는 점에서 주목할 만합니다"
- "여러분", 반복되는 물음표
- 같은 구조의 문장이 줄줄이 이어지는 리듬
- 모든 문단이 비슷한 길이로 떨어지는 균질함
- 뜻 없이 붙는 부사("과연", "결국", "사실상", "실제로")의 남발
- 마지막에 붙는 요약형 마무리

[할 것]
- 문장을 쪼개지 마세요. 원문의 문장 수를 그대로 두는 것이 기본이고, 늘어나도 10%를 넘기지 마세요. 긴 문장은 긴 채로 두고 어색한 부분만 손봅니다.
- 원문에 이미 있는 긴 문장과 짧은 문장의 낙차를 유지하세요. 모든 문장을 비슷한 길이로 고르는 것이 가장 AI 같은 결과입니다.
- 문장을 합치지 마세요. 특히 "40대 직장인 A씨."처럼 짧게 독립한 문장은 그대로 두세요. 앞뒤에 붙이면 리듬이 죽습니다.
- 명사로 끝나는 문장("~가버린 상황.", "~200m.")은 그대로 두세요. 경어체로 바꾸지 마세요. 이런 종결의 불규칙함이 사람이 쓴 흔적입니다.
- 종결어미를 통일하지 마세요. 원문이 "~것이죠", "~겁니다", "~입니다"를 섞어 쓰고 있으면 섞인 채로 두세요.
- 특히 ~죠/~했죠, ~인데요, ~거든요 같은 구어형 어미는 이 글의 온도 설계입니다. 지우거나 ~습니다로 바꾸지 마세요.
- 정보가 없는 짧은 숨 고르기 문장("많이들 놀라시는 대목입니다" 류)도 설계입니다. 군더더기로 보고 삭제하지 마세요.
- 고칠 이유가 분명한 문장만 손대세요. 멀쩡한 문장을 매끄럽게 만드는 것은 개선이 아니라 평탄화입니다. 손대지 않고 두는 것도 선택지입니다.
- 조사를 덜어내거나 어순을 바꿔 말맛을 넣되, 경어체(~합니다/~입니다)는 유지합니다.
- 변호사 1인칭 시점을 유지하세요.
- 추상적인 설명이 있으면 원문에 이미 있는 사실을 끌어와 구체적으로 바꾸세요. 없는 사실을 만들지는 마세요.

[새로 만들어 넣지 말 것 — 흔한 실패]
- 위 [지울 것] 목록의 표현을 결과물에 새로 넣지 마세요.
- 격식만 높인 표현으로 바꾸는 것은 개악입니다. "말씀드립니다"를 "적어보겠습니다"로, "이렇습니다"를 "다음과 같습니다"로, "짚어드립니다"를 "짚어보겠습니다"로 바꾸지 마세요. "~보겠습니다" 계열은 대표적인 AI 문체입니다.
- 따옴표는 원문 그대로 직선 따옴표(")를 쓰세요. 곡선 따옴표로 바꾸지 마세요.

[출력]
다듬은 원고 전문만 출력하세요. 머리말, 설명, 코드블록 금지.
`;

interface PolishResult {
    text: string;
    polished: boolean;
    model: string;
    reason?: string;
}

// 초안이 지키고 있던 것을 결과물도 지키는지 검사한다. 하나라도 깨지면 초안을 쓴다.
function validate(draft: string, out: string): string | null {
    if (!out || out.length < 200) return "출력이 비었거나 너무 짧음";

    const count = (t: string, re: RegExp) => (t.match(re) || []).length;

    if (count(out, /^## /gm) !== count(draft, /^## /gm)) return "소제목 개수 변경";
    if (count(out, /제\s?\d+조(?:의\d+)?/g) < count(draft, /제\s?\d+조(?:의\d+)?/g)) return "법조문 인용 유실";
    if (/\d{4}도\d+|\d{4}\s?[가-힣]{1,3}\s?\d{3,}/.test(out)) return "판례 사건번호 생성";
    if (/기준일/.test(draft) && !/기준일/.test(out)) return "기준일 블록 유실";
    if (/보겠습니다|다음과 같습니다/.test(out)) return "AI 문체 재유입";

    // 강조 표시가 유실되거나 짝이 깨지면 네이버 변환이 무너진다
    for (const [name, re] of [["형광펜", /==/g], ["밑줄", /__/g], ["굵게", /\*\*/g]] as const) {
        const before = count(draft, re);
        const after = count(out, re);
        if (after % 2 !== 0) return `${name} 표시 짝이 안 맞음`;
        if (Math.abs(after - before) > 2) return `${name} 표시 개수 변경 (${before / 2} → ${after / 2})`;
    }

    const ratio = out.length / draft.length;
    if (ratio < 0.85 || ratio > 1.2) return `분량 이탈 (${Math.round(ratio * 100)}%)`;

    // 온도(어미 변주)가 윤문에서 다림질되면 "AI 티 제거" 작업이 통째로 무효가 된다.
    // 초안이 ~죠/~인데요/~거든요를 쓰고 있었다면 절반 이상은 살아남아야 한다.
    const warmth = /(죠[.!?]|인데요[.,!?]|거든요[.,!?])/g;
    const warmBefore = count(draft, warmth);
    const warmAfter = count(out, warmth);
    if (warmBefore >= 3 && warmAfter < Math.ceil(warmBefore / 2)) {
        return `어미 변주 유실 (${warmBefore} → ${warmAfter})`;
    }

    return null;
}

export async function polishBlogBody(draft: string): Promise<PolishResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { text: draft, polished: false, model: "", reason: "OPENAI_API_KEY 없음" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
            body: JSON.stringify({
                model: POLISH_MODEL,
                max_completion_tokens: 16000,
                messages: [
                    { role: "system", content: POLISH_SYSTEM },
                    { role: "user", content: `다음 원고를 다듬어주세요.\n\n${draft}` },
                ],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[BlogPolish] OpenAI 실패:", res.status, err.substring(0, 200));
            return { text: draft, polished: false, model: POLISH_MODEL, reason: `OpenAI ${res.status}` };
        }

        const data = await res.json();
        const out = (data.choices?.[0]?.message?.content || "").trim();

        const problem = validate(draft, out);
        if (problem) {
            console.warn(`[BlogPolish] 검증 실패 → 초안 사용: ${problem}`);
            return { text: draft, polished: false, model: POLISH_MODEL, reason: problem };
        }

        console.log(`[BlogPolish] ${POLISH_MODEL} 완료 (${draft.length} → ${out.length}자)`);
        return { text: out, polished: true, model: POLISH_MODEL };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[BlogPolish] 예외 → 초안 사용:", msg);
        return { text: draft, polished: false, model: POLISH_MODEL, reason: msg };
    } finally {
        clearTimeout(timer);
    }
}
