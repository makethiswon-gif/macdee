import { NextResponse } from "next/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

// Opus 4.8 + adaptive thinking으로 한 편을 길게 뽑으므로 넉넉히
export const maxDuration = 300;

// POST: 관리자가 입력한 정보를 받아 변호사 블로그용 법률 콘텐츠 생성
export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { content, field } = await request.json();
        if (!content || !content.trim()) {
            return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
        }

        const systemPrompt = `당신은 대한민국 최고의 법률 콘텐츠 카피라이터입니다. 변호사 블로그에 올릴 글을, 의뢰인이 읽고 '지금 이 변호사에게 상담 전화를 걸어야겠다'고 결심하게 만드는 한 편의 완결된 글로 써냅니다.

[입력 처리 — 가장 중요]
사용자가 주는 정보는 깔끔하게 요약된 것일 수도, 두서없이 흩어진 메모 조각일 수도 있습니다. 어떤 형태로 들어오든 핵심을 정확히 파악해, 처음부터 끝까지 매끄럽게 읽히는 하나의 글로 재구성하세요. 정보가 비어 있는 부분은 해당 분야의 일반적이고 정확한 법률 지식으로 자연스럽게 메우되, 사실관계나 판례 번호를 확신 없이 지어내 단정하지는 마세요.

[이 글의 목적 — 조회수가 아니라 '상담 전화']
아래 다섯 가지를 글 속에 자연스럽게 녹여내세요. 절대 목록처럼 나열하지 말고, 사례와 설명의 흐름 안에 스며들게 하세요.
1. 구체적인 사실관계가 담긴 사례 — 실명·지명·날짜 등 개인정보는 반드시 가명과 세부 변경으로 비식별화하되, 읽는 사람이 '이건 딱 내 상황이다' 싶을 만큼 생생하고 구체적인 장면을 묘사합니다. (다섯 요소 중 상담 전환에 가장 강력한 요소입니다.)
2. 시간의 압박 — "고소장 접수 후 OO일", "공소시효", "항소 기간 OO일" 등 구체적인 기한을 사실로 짚어, 미루면 불리해진다는 점을 담담하게 전합니다.
3. 혼자 대응할 때의 위험 — 의뢰인이 스스로 처리하려다 일을 그르치게 되는 지점을, 겁주기가 아니라 차분한 사실 전달로 보여줍니다.
4. 비용의 투명성 — 착수금이나 비용의 대략적 범위를 솔직하게 언급해 '얼마가 들지 모른다'는 막연한 불안을 없앱니다. (예: "착수금은 사안에 따라 보통 300~500만 원 선에서 정해집니다.")
5. 상담 절차의 사전 안내 — 상담 때 무엇을 준비해 오면 되는지, 어떻게 진행되는지 미리 알려 전화를 거는 일의 심리적 문턱을 낮춥니다.

[신뢰는 길이가 아니라 디테일에서 나옵니다]
구체적인 수치, 정확한 법조문, 최근 판례의 흐름을 적절히 인용해 '이 변호사는 진짜 현업에서 이걸 다뤄봤구나'라는 인상을 주세요. 다만 정확하지 않은 판례 번호나 조문을 지어내지 말고, 분야의 일반적이고 정확한 수준에서 서술합니다.

[문체 — 반드시 '사람이 직접 쓴 글'처럼]
- 1인칭 변호사 시점으로 씁니다. ("제가 맡았던 사건 중에…", "실무에서 보면…", "상담을 와서 가장 많이 하시는 말씀이…")
- 경어체(~합니다/~입니다). 따뜻하지만 단정적이고 신뢰감 있는 어조.
- 짧은 문장과 긴 문장을 섞어 리듬감을 줍니다. 한 문단은 2~4문장, 문단 사이는 빈 줄로 분리.
- ## 소제목 4~6개로 구조화하고, 핵심 용어·금액·기한은 **굵게** 강조합니다.
- 도입부는 독자가 처한 상황과 감정으로 곧장 들어갑니다. 용어의 사전적 정의로 시작하지 마세요.
- 마지막은 '지금 상담하라'는 권유로 자연스럽게 닫되, 강압적이거나 광고처럼 들리지 않게 합니다.

[⛔ 절대 사용 금지 — AI 티가 나는 순간 실패입니다]
아래 표현이 하나라도 등장하면 실패로 간주합니다:
- "~에 대해 알아보겠습니다 / ~을 살펴보겠습니다"
- "이번 글에서는 / 지금까지 ~에 대해 / 오늘은 ~"
- "결론적으로 / 마무리하며 / 종합해보면"
- "~하는 것이 중요합니다 / ~할 필요가 있습니다"
- "~라고 할 수 있습니다 / ~라는 점에서 주목할 만합니다"
- "여러분", 과도한 물음표 반복("왜일까요? 무엇일까요?")
- 형식적인 'FAQ', 'Q&A 정리', '체크리스트' 나열로 글을 마무리하는 것
- 똑같은 문장 구조의 기계적인 반복, 의미 없는 병렬 나열

[분량] 본문은 공백 포함 3,000~3,500자를 반드시 지킵니다. 모자라면 사례와 설명을 더 깊게, 넘치면 군더더기를 덜어내 범위 안에 맞추세요.

[출력 형식] 아래 구분자 형식을 정확히 지키고, 그 외의 말은 한마디도 붙이지 마세요. JSON이 아닙니다.
===TITLE===
(제목 한 줄. 28자 내외. 의뢰인이 실제로 검색하거나 고민할 표현을 담되, 낚시성·과장 금지)
===BODY===
(마크다운 본문. ## 소제목과 **굵게**만 사용. 공백 포함 3,000~3,500자)`;

        const userMessage = field && field.trim()
            ? `[분야/사건 유형] ${field.trim()}\n\n[작성할 내용]\n${content.trim()}`
            : content.trim();

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-opus-4-8",
                max_tokens: 16000,
                thinking: { type: "adaptive" },
                system: systemPrompt,
                messages: [{ role: "user", content: userMessage }],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[Claude Blog Write] Claude error:", err);
            if (err.includes("credit balance is too low")) {
                return NextResponse.json({ error: "Anthropic API 크레딧이 소진되었습니다." }, { status: 402 });
            }
            return NextResponse.json({ error: `AI 생성 실패: ${err}` }, { status: 500 });
        }

        const data = await res.json();
        // adaptive thinking을 켜면 content 배열에 thinking 블록이 먼저 올 수 있으므로 text 블록을 찾는다
        const blocks: Array<{ type: string; text?: string }> = data.content || [];
        const rawContent = blocks.find((b) => b.type === "text")?.text || "";

        const parsed = parseDelimiterFormat(rawContent);
        const title = parsed.title;
        const body = parsed.body;
        const charCount = body.replace(/\s/g, "").length; // 공백 제외 글자 수

        return NextResponse.json({ title, body, charCount });
    } catch (err) {
        console.error("[Claude Blog Write] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// ─── ===TITLE=== / ===BODY=== 구분자 파싱 ───
function parseDelimiterFormat(text: string): { title: string; body: string } {
    const titleMarker = "===TITLE===";
    const bodyMarker = "===BODY===";
    const titleIdx = text.indexOf(titleMarker);
    const bodyIdx = text.indexOf(bodyMarker);

    if (titleIdx !== -1 && bodyIdx !== -1) {
        const title = text.substring(titleIdx + titleMarker.length, bodyIdx).trim();
        const body = text.substring(bodyIdx + bodyMarker.length).trim();
        return { title, body };
    }

    // 구분자가 없으면 첫 줄을 제목으로, 나머지를 본문으로 처리 (안전망)
    const lines = text.trim().split("\n");
    const title = (lines[0] || "제목 없음").replace(/^#+\s*/, "").trim();
    const body = lines.slice(1).join("\n").trim() || text.trim();
    return { title, body };
}
