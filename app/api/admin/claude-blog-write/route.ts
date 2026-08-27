import { NextResponse } from "next/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { polishBlogBody } from "@/lib/ai/blog-polish";
import { createAdminClient } from "@/lib/supabase/server";
import { getWritingDNA, dnaDirective } from "@/lib/blog-writing-dna";

// Opus 5 + adaptive thinking으로 한 편을 길게 뽑으므로 넉넉히
export const maxDuration = 300;

// 본문 하단 '기준일' 표기용 (KST)
function getKstDateLabel(): string {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
}

// POST: 관리자가 입력한 정보를 받아 변호사 블로그용 법률 콘텐츠 생성
export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { content, field, profileId, topic } = await request.json();
        if (!content || !content.trim()) {
            return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
        }

        // 변호사가 지정되면 그 블로그의 글쓰기 DNA로 문체·분량·강조를 덮어쓴다.
        // 없으면 기존 기본값 그대로 (단독 사용 시 동작 유지).
        let dnaBlock = "";
        let lengthRule = "본문은 공백 포함 3,000~3,500자를 반드시 지킵니다.";
        let emphasisRule = `  · ==형광펜== : 이 글의 결론, 결론이 갈리는 경계선. 글 전체에서 **2~3곳만**. 가장 아껴 쓰는 강조입니다.
  · __밑줄__ : 판단의 근거가 되는 법조문·기준. 글 전체에서 **5~7곳**.
  · **굵게** : 수치·기한·금액 등 눈으로 집어야 할 값. 글 전체에서 **10곳 이내**.`;

        if (profileId) {
            try {
                const supabase = await createAdminClient();
                const { data: profile } = await supabase
                    .from("blog_profiles")
                    .select("id, dna_salt")
                    .eq("id", profileId)
                    .single();

                if (profile) {
                    const dna = getWritingDNA(profile.id as string, (profile.dna_salt as string) || "", topic || "");
                    dnaBlock = dnaDirective(dna);
                    lengthRule = `본문은 공백 포함 ${dna.targetLength - 200}~${dna.targetLength + 200}자를 반드시 지킵니다.`;
                    emphasisRule = `  · ==형광펜== : 이 글의 결론, 결론이 갈리는 경계선. 글 전체에서 **${dna.emphasis.highlight[0]}~${dna.emphasis.highlight[1]}곳만**.
  · __밑줄__ : 판단의 근거가 되는 법조문·기준. 글 전체에서 **${dna.emphasis.underline[0]}~${dna.emphasis.underline[1]}곳**.
  · **굵게** : 수치·기한·금액 등 눈으로 집어야 할 값. 글 전체에서 **${dna.emphasis.bold}곳 이내**.`;
                    console.log(`[Blog Write] DNA ${profileId}: ${dna.voice.name} / ${dna.heading.name} / ${dna.structure.name} / ${dna.targetLength}자`);
                }
            } catch (e) {
                console.warn("[Blog Write] DNA 조회 실패, 기본값 사용:", e);
            }
        }

        const todayLabel = getKstDateLabel();
        const systemPrompt = `당신은 대한민국 최고의 법률 콘텐츠 카피라이터입니다. 변호사 블로그에 올릴 글을, 의뢰인이 읽고 '지금 이 변호사에게 상담 전화를 걸어야겠다'고 결심하게 만드는 한 편의 완결된 글로 써냅니다.

[입력 처리 — 가장 중요]
사용자가 주는 정보는 깔끔하게 요약된 것일 수도, 두서없이 흩어진 메모 조각일 수도 있습니다. 어떤 형태로 들어오든 핵심을 정확히 파악해, 처음부터 끝까지 매끄럽게 읽히는 하나의 글로 재구성하세요. 정보가 비어 있는 부분은 해당 분야의 일반적이고 정확한 법률 지식으로 자연스럽게 메우되, 사실관계나 판례 번호를 확신 없이 지어내 단정하지는 마세요.

[이 글의 목적 — 조회수가 아니라 '상담 전화']
아래 네 가지를 글 속에 자연스럽게 녹여내세요. 절대 목록처럼 나열하지 말고, 사례와 설명의 흐름 안에 스며들게 하세요.
1. 구체적인 사실관계가 담긴 사례 — 실명·지명·날짜 등 개인정보는 반드시 가명과 세부 변경으로 비식별화하되, 읽는 사람이 '이건 딱 내 상황이다' 싶을 만큼 생생하고 구체적인 장면을 묘사합니다. (이 중 상담 전환에 가장 강력한 요소입니다.)
2. 시간의 압박 — "고소장 접수 후 OO일", "공소시효", "항소 기간 OO일" 등 구체적인 기한을 사실로 짚어, 미루면 불리해진다는 점을 담담하게 전합니다.
3. 혼자 대응할 때의 위험 — 의뢰인이 스스로 처리하려다 일을 그르치게 되는 지점을, 겁주기가 아니라 차분한 사실 전달로 보여줍니다.
4. 상담 절차의 사전 안내 — 상담 때 무엇을 준비해 오면 되는지, 어떻게 진행되는지 미리 알려 전화를 거는 일의 심리적 문턱을 낮춥니다.

비용·착수금 액수는 글에서 언급하지 마세요. (사무소마다 다르고, 섣부른 금액 제시는 오히려 부담을 줍니다.)

[결과가 아니라 '판단 근거'를 쓰세요 — 이 글의 가장 큰 차별점]
"이런 사건에서 이런 형이 나왔다"는 결과 정보는 앞으로 누구나 얻을 수 있게 됩니다. 남는 가치는 '왜 그렇게 갈렸는가'입니다. 글 안에 반드시 다음을 담으세요.
- 사실관계의 어느 지점이 결론을 바꿨는지 짚습니다. (예: 같은 수치라도 측정 시점과 운전 거리에서 갈린다)
- 반대 결론이 난 사건과 무엇이 달랐는지 대조합니다. 결론이 뒤집히는 경계선을 보여주세요.
- 실제로 해본 사람만 알 수 있는 판단의 결을 담습니다. "사안에 따라 다릅니다" 같은 일반론으로 뭉개지 마세요. 무엇에 따라 어떻게 다른지까지 씁니다.

[법조문·판례 인용 규칙 — 반드시 지킬 것]
- 근거 법조문은 정확한 조문 번호로 명시합니다. (예: 도로교통법 제44조 제1항, 형법 제268조) 조문을 인용할 때는 그 조문이 이 사안에서 왜 적용되는지까지 한 문장으로 붙여 근거를 탄탄히 하세요.
- 조문 번호에 확신이 없으면 번호를 쓰지 말고 제도·규정의 이름으로만 서술합니다. 틀린 조문 번호는 없느니만 못합니다.
- 판례 번호(사건번호)는 쓰지 마세요. 판례는 사건번호 없이 '실무에서 이런 사정이 있으면 이렇게 갈린다'는 판단 흐름으로만 서술합니다.
- 구체적인 수치와 기한은 정확하게 씁니다. 신뢰는 글의 길이가 아니라 이 디테일에서 나옵니다.

[AI가 인용하기 좋은 형태로 쓰세요]
앞으로 유입의 상당 부분은 AI 답변 안에서의 언급으로 옵니다. 인용되는 글의 조건입니다.
- 첫 문단에서 독자가 궁금해하는 답을 먼저 줍니다. 상황 묘사로 열되, 첫 문단을 넘기기 전에 핵심 결론·판단 기준을 한 번 제시하세요. 뜸 들이지 마세요.
- 각 ## 소제목은 그 아래 문단이 답하는 질문에 대응하게 씁니다. 소제목만 읽어도 글의 논지가 보이게.
- 떼어내서 그대로 인용해도 뜻이 통하는 '독립된 덩어리'를 최소 1개 포함합니다: 핵심 개념을 규정하는 정의 문단, A와 B를 나란히 놓는 비교(표 또는 대조 문단), 또는 단계별 절차. 앞뒤 맥락 없이 읽혀도 완결되게 쓰세요.

[문체 — 반드시 '사람이 직접 쓴 글'처럼]
- 1인칭 변호사 시점으로 씁니다. ("제가 맡았던 사건 중에…", "실무에서 보면…", "상담을 와서 가장 많이 하시는 말씀이…")
- 경어체(~합니다/~입니다). 따뜻하지만 단정적이고 신뢰감 있는 어조.
- 짧은 문장과 긴 문장을 섞어 리듬감을 줍니다. 한 문단은 2~4문장, 문단 사이는 빈 줄로 분리.
- ## 소제목 4~6개로 구조화합니다.
- 강조는 세 종류를 구분해 씁니다. 네이버 블로그에서 각각 형광펜·밑줄·굵게로 바뀝니다. 아래 개수를 넘기지 마세요. 과한 강조는 오히려 신뢰도를 떨어뜨립니다.
${emphasisRule}
- 한 문단에 강조가 두 종류 넘게 들어가지 않게 하세요. 강조가 없는 문단이 있어도 괜찮습니다.
- 도입부는 독자가 처한 상황으로 곧장 들어갑니다. 용어의 사전적 정의로 시작하지 마세요. 다만 상황 묘사만으로 첫 문단을 다 쓰지 말고, 그 안에서 답을 먼저 주세요.
- 마지막은 '이런 경우라면 이렇게 준비하시라'는 신뢰형 안내로 닫습니다. '지금 전화하세요' 같은 노골적 광고성 CTA·강압 표현은 쓰지 마세요.

[네이버 블로그 최적화 — 특히 주의]
- 제목과 본문 소제목은 서로 다르게 쓰되, 톤과 흐름은 일관되게 합니다. 제목·소제목·핵심 문구를 똑같이 반복하지 마세요.
- 큰 키워드를 기계적으로 반복하거나, 과도하게 자극적·낚시성인 문구를 쓰지 마세요.
- 제목은 '키워드'가 아니라 '질문'입니다. 자세한 규칙은 아래 [제목] 항목을 따르세요.
- 본문 중간에 '정보형 요소'(단계별 절차 3~5단계 / 실무 체크리스트 / A vs B 비교) 중 하나 이상을 반드시, 실질 정보로 자연스럽게 포함합니다. 독자가 스크롤하다 "정리돼 있네" 하고 느끼게. (단, 끝맺음용 기계적 나열은 금지)
- 사례성·실무성·체크리스트형 콘텐츠를 강화합니다.

[⛔ 절대 사용 금지 — AI 티가 나는 순간 실패입니다]
아래 표현이 하나라도 등장하면 실패로 간주합니다:
- "~에 대해 알아보겠습니다 / ~을 살펴보겠습니다"
- "이번 글에서는 / 지금까지 ~에 대해 / 오늘은 ~"
- "결론적으로 / 마무리하며 / 종합해보면"
- "~하는 것이 중요합니다 / ~할 필요가 있습니다"
- "~라고 할 수 있습니다 / ~라는 점에서 주목할 만합니다"
- "여러분", 과도한 물음표 반복("왜일까요? 무엇일까요?")
- 글을 형식적인 'FAQ'·'Q&A 정리' 나열로 마무리하는 것 (정보형 요소는 본문 흐름 속에 녹이되, 끝맺음용 기계적 나열은 금지)
- 똑같은 문장 구조의 기계적인 반복, 의미 없는 병렬 나열

[제목 — 의뢰인이 실제로 던질 질문 그대로]
제목은 이 글이 답하는 질문입니다. 의뢰인이 새벽에 검색창이나 AI에게 실제로 입력할 법한 자연어 문장으로 쓰세요.
- 본문이 실제로 답하는 질문이어야 합니다. 본문에 없는 내용을 제목으로 걸지 마세요.
- 의뢰인이 쓰는 말로 쓰세요. "공연성" "유책배우자" 같은 법률 용어 대신 "단톡방에서 한 말" "먼저 바람피운 쪽"처럼 당사자가 실제로 쓰는 표현으로.
- 큰 키워드형 제목("음주운전 처벌기준", "이혼 재산분할")은 금지입니다. 그런 질문은 이미 AI가 더 잘 답합니다.
- 25~35자. 물음표는 붙여도 되고 안 붙여도 됩니다.
- 어미를 찍어내지 마세요. "~되나요?"만 반복하면 기계가 쓴 티가 납니다. 아래처럼 형태를 달리하세요.
  · 상황 + 물음 : "회식하고 대리 불렀는데 주차장에서 200m 옮긴 것도 음주운전인가요"
  · 조건 + 결과 : "초범이고 사고도 없는데 벌금이 700만원 나왔습니다"
  · 판단 요청   : "단톡방 12명한테 한 얘기, 명예훼손 되는 건가요"
  · 절차 물음   : "경찰 조사 전에 진술서를 미리 써가도 되나요"
- 위 네 개는 형태 견본일 뿐입니다. 그대로 쓰지 말고 이번 사건에 맞게 새로 지으세요.
- 낚시성·과장·단정("무조건", "100%")은 금지입니다.

[분량] ${lengthRule} 모자라면 사례와 설명을 더 깊게, 넘치면 군더더기를 덜어내 범위 안에 맞추세요.

${dnaBlock}

[출력 형식] 아래 구분자 형식을 정확히 지키고, 그 외의 말은 한마디도 붙이지 마세요. JSON이 아닙니다.
===TITLE===
(제목 한 줄. 아래 [제목] 규칙을 따릅니다)
===BODY===
(마크다운 본문. ## 소제목과 ==형광펜==·__밑줄__·**굵게**를 위 개수 규칙대로 사용. 정보형 요소(단계·체크리스트·비교)에는 번호목록(1. 2. 3.)이나 불릿(-)을 써도 됩니다. 공백 포함 3,000~3,500자)

본문 맨 끝에는 아래 두 줄을 그대로 붙입니다. (이 두 줄은 분량 계산에서 제외)

---
**기준일** ${todayLabel} 작성 · 이후 법령이 개정되면 이 글을 갱신합니다.
**작성** [변호사명] 변호사 · 취급 분야: [취급 분야]`;

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
                model: "claude-opus-5",
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
        const draftBody = parsed.body;

        // 2차 윤문: 다른 모델(OpenAI)에 한 번 더 통과시켜 AI 문체의 지문을 흐린다.
        // 실패하거나 검증에 걸리면 초안이 그대로 돌아온다 — 생성 자체가 깨지지 않는다.
        const polish = await polishBlogBody(draftBody);
        const body = polish.text;
        const charCount = body.replace(/\s/g, "").length; // 공백 제외 글자 수

        return NextResponse.json({
            title,
            body,
            charCount,
            draftBody,                       // 원문 비교용
            polished: polish.polished,
            polishModel: polish.model,
            polishReason: polish.reason ?? null,
        });
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
