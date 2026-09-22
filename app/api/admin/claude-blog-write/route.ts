import { NextResponse } from "next/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getWritingDNA, dnaDirective } from "@/lib/blog-writing-dna";
import { appendBlogPhoneContact, blogPhoneContact } from "@/lib/blog-contact";
import { validProfileId } from "@/lib/blog-strengths";
import { StrengthStoreError } from "@/lib/blog-strengths-store";
import { reviewBlogEditorial } from "@/lib/blog-editorial-review";
import { repetitionAvoidDirective } from "@/lib/blog-repetition";
import { paidAttempt, paidId, paidJsonRequest, PaidOperationError } from "@/lib/blog-images/paid-operation";

// Sonnet 5 + adaptive thinking(effort high). 2026-09-22 12:02 운영에서 xhigh 가 thinking 에 14,994토큰을 써 본문이 1,006토큰에서 잘렸다(상한 16,000).
// 그래서 effort 는 high, 상한은 20,000, 대기는 Vercel 300초 안에서 285초. 잘린 응답이 같은 요청 해시로 재사용되지 않게 paidId 를 v15 로 올렸다.
export const maxDuration = 300;
export const BLOG_WRITING_MODEL = "claude-sonnet-5";

// 본문 하단 '기준일' 표기용 (KST)
function getKstDateLabel(): string {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
}

// POST: 관리자가 입력한 정보를 받아 변호사 블로그용 법률 콘텐츠 생성
export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { content, field, profileId, topic, attemptId, confirmPaid } = await request.json();
        if (typeof content !== "string" || !content.trim() || content.length > 40000) {
            return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
        }

        if ((field != null && (typeof field !== "string" || field.length > 200)) || (topic != null && (typeof topic !== "string" || topic.length > 1000))) {
            return NextResponse.json({ error: "분야와 주제의 형식 또는 길이를 확인해주세요." }, { status: 400 });
        }
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
        }

        // 변호사가 지정되면 그 블로그의 글쓰기 DNA로 문체·분량·강조를 덮어쓴다.
        // 없으면 기존 기본값 그대로 (단독 사용 시 동작 유지).
        let dnaBlock = "";
        let trustBlock = "";
        let recentBodies: string[] = [];
        let recentTitles: string[] = [];
        let avoidBlock = "";
        let authorLine = "";
        if (profileId) {
            if (!validProfileId(profileId)) {
                return NextResponse.json({ error: "변호사 선택을 확인해주세요." }, { status: 400 });
            }
            const db = await createAdminClient();
            const { data: recent, error } = await db.from("blog_posts").select("title, body").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(20);
            if (error) throw new StrengthStoreError("최근 원고를 읽지 못했습니다.");
            recentBodies = (recent || []).map((p) => p.body || "");
            recentTitles = (recent || []).map((p) => p.title || "");
            // 같은 블로그가 매번 같은 말로 끝나지 않게, 이미 쓴 끝맺음·소제목·제목 어미를 피하게 한다(추가 모델 호출 없음).
            avoidBlock = repetitionAvoidDirective(recent || []);
        }
        let phoneContact: ReturnType<typeof blogPhoneContact> = null;
        let dnaInfo: { voice: string; heading: string; structure: string; imageCount: number } | null = null;
        // 발행 화면이 공백 제외로 표시하므로 같은 단위로 지시한다.
        let lengthRule = "본문은 공백 제외 2,700~3,100자입니다. 소제목(##) 6~7개, 소제목마다 문단 4~5개, 문단은 3~4문장, 전체 문장 70개 안팎으로 설계하면 이 분량이 됩니다.";
        let emphasisRule = `  · ==형광펜== : 이 글의 결론, 결론이 갈리는 경계선. 글 전체에서 **2~3곳만**. 가장 아껴 쓰는 강조입니다.
  · __밑줄__ : 판단의 근거가 되는 법조문·기준. 글 전체에서 **5~7곳**.
  · **굵게** : 수치·기한·금액 등 눈으로 집어야 할 값. 글 전체에서 **10곳 이내**.`;

        if (profileId) {
            try {
                const supabase = await createAdminClient();
                const { data: profile, error: profileError } = await supabase
                    .from("blog_profiles")
                    .select("id, dna_salt, lawyer_name, office_name, specialty, brand_lines, phone")
                    .eq("id", profileId)
                    .single();
                if (profileError || !profile) throw new StrengthStoreError("변호사 프로필을 확인하지 못했습니다.", 404);

                if (profile) {
                    phoneContact = blogPhoneContact(profile.phone as string | null);
                    const [name, title] = ((profile.lawyer_name as string) || "").split("||");
                    const specialty = ((profile.specialty as string[]) || []).filter(Boolean);
                    if (name) {
                        trustBlock = `
[이 변호사의 신뢰 신호 — 실제 등록 프로필입니다. 여기 있는 사실만 쓰고, 없는 경력·수상·직책은 절대 만들지 마세요]
- 이름·직함: ${name} ${title || "변호사"}${profile.office_name ? ` (${profile.office_name})` : ""}
${specialty.length ? `- 취급 분야(전문등록 자격 표기가 아님): ${specialty.join(", ")}` : ""}
활용 규칙:
- 경력과 강점은 아래 공개 승인 자료에 있는 문구만 사용합니다. 기존 프로필의 자유 입력이나 사용자 메모는 공개 승인 근거가 아닙니다.
- 자기소개·광고 반복보다 독자의 질문에 대한 답과 판단 기준을 우선합니다.`;
                    }
                    // 맨 끝 '작성' 줄은 서버가 조립한다. 모델에 맡기면 취급 분야 전체가 나열되거나(최대 260자) 이름이 빠졌다(실측 5/46편).
                    const shownFields = (typeof field === "string" && field.trim() ? [field.trim().slice(0, 40)] : specialty.slice(0, 2)).join(", ");
                    // 프로필의 '이름'이 사무소명인 경우(법인 명의 블로그)에는 직함을 붙이지 않고, 사무소명과 겹치면 한 번만 쓴다.
                    const office = ((profile.office_name as string) || "").trim();
                    const cleanName = (name || "").trim();
                    const isFirmName = /^(?:법무법인|법률사무소|합동법률)/.test(cleanName);
                    const byline = !cleanName ? "" : isFirmName || /변호사$/.test(cleanName) ? cleanName : title && title.trim() !== office ? `${cleanName} ${title.trim()}` : `${cleanName} 변호사`;
                    const who = [...new Set([byline, office].filter(Boolean))].filter((part, _i, all) => !all.some((other) => other !== part && other.includes(part))).join(" · ");
                    if (who) authorLine = `**작성** ${who}${shownFields ? ` · 취급 분야: ${shownFields}` : ""}`;
                    const dna = getWritingDNA(profile.id as string, (profile.dna_salt as string) || "", topic || "");
                    dnaBlock = dnaDirective(dna);
                    dnaInfo = { voice: dna.voice.name, heading: dna.heading.name, structure: dna.structure.name, imageCount: dna.imageCount };
                    lengthRule = `본문은 공백 제외 ${dna.targetNoSpace - 150}~${dna.targetNoSpace + 150}자입니다. 아래 [분량 설계]의 구조로 맞춥니다.`;
                    emphasisRule = `  · ==형광펜== : 이 글의 결론, 결론이 갈리는 경계선. 글 전체에서 **${dna.emphasis.highlight[0]}~${dna.emphasis.highlight[1]}곳만**.
  · __밑줄__ : 판단의 근거가 되는 법조문·기준. 글 전체에서 **${dna.emphasis.underline[0]}~${dna.emphasis.underline[1]}곳**.
  · **굵게** : 수치·기한·금액 등 눈으로 집어야 할 값. 글 전체에서 **${dna.emphasis.bold}곳 이내**.`;
                    console.log(`[Blog Write] DNA ${profileId}: ${dna.voice.name} / ${dna.heading.name} / ${dna.structure.name} / ${dna.closing.name} / 공백 제외 ${dna.targetNoSpace}자`);
                }
            } catch (e) {
                if (e instanceof StrengthStoreError) throw e;
                throw new StrengthStoreError("변호사 프로필 조회에 실패했습니다. 다시 시도해주세요.");
            }
        }

        const todayLabel = getKstDateLabel();
        const systemPrompt = `당신은 법률을 정확히 알고, 글을 잘 쓰는 사람입니다. 변호사 블로그에 실릴 법률 정보 글 한 편을 씁니다. 독자는 법을 모르고, 지금 자기 일로 불안한 사람입니다.

[이 글이 해야 하는 일 — 위에서부터 우선합니다]
1. 정확해야 합니다. 법률 정보 글은 틀린 문장 하나로 전부 무너집니다. 확신이 없는 조문·기한·수치는 쓰지 않습니다.
2. 독자의 질문에 답해야 합니다. 글을 다 읽은 독자는 자기 사안이 어디쯤 있는지, 무엇이 결론을 가르는지, 다음에 무엇을 하면 되는지를 알게 됩니다.
3. 잘 쓴 글이어야 합니다. 아래 [글쓰기]를 지키는 데 가장 많은 공을 들이세요.
4. 상담은 목적이 아니라 결과입니다. 정확하고 잘 쓴 글을 읽은 독자는 이 변호사를 믿게 되고, 그 믿음이 전화로 이어집니다. 겁을 주거나, 서두르게 하거나, 혼자 하면 위험하다고 되풀이하는 설득 장치는 쓰지 않습니다.

[입력 처리]
사용자가 주는 정보는 깔끔한 요약일 수도, 두서없는 메모 조각일 수도 있습니다. 어떤 형태든 핵심 질문 하나를 찾아내고, 그 질문에 답하는 한 편으로 재구성하세요. 비어 있는 부분은 해당 분야의 일반적이고 정확한 법률 지식으로 메우되, 사실관계나 판례를 지어내 단정하지 마세요.

[법률 정보 글의 본질 — 결과가 아니라 '판단 기준'을 씁니다]
"이런 사건에서 이런 결과가 나왔다"는 정보는 누구나 얻습니다. 남는 가치는 '왜 그렇게 갈렸는가'입니다.
- 요건과 효과를 분명히 합니다. 어떤 사실이 갖춰지면 어떤 법적 효과가 생기는지, 그 연결을 독자가 따라올 수 있게 씁니다.
- 결론이 갈리는 경계선을 보여 줍니다. 같은 상황에서 반대 결론이 나오는 조건, 예외, 흔한 오해를 하나 이상 다룹니다.
- 단정할 것과 조건부인 것을 구분해서 씁니다. 법이 정한 것은 단정하고, 법원의 재량이나 사안에 따라 달라지는 것은 무엇에 따라 달라지는지를 밝힙니다. 모든 문장을 "~할 수 있습니다"로 흐리지 마세요.
- 기한은 정보로서 정확히 씁니다. 며칠인지, 어느 날부터 세는지. 독자를 재촉하는 장치로 쓰지 않습니다.
- 절차를 다룰 때는 단계마다 걸리는 기간과 그 단계에서 흔한 실수까지 내려갑니다. 서류는 그 절차의 핵심일 때만 본문 안에서 3개 이내로, 없어도 상담은 시작된다는 말과 함께 씁니다.
- 최신성: 최근 개정이나 헌법재판소 결정처럼 기준이 바뀐 부분이 있으면 시점과 함께 씁니다. 확신이 없으면 쓰지 않습니다.
- 일반 정보의 한계는 상투적인 면책 문구가 아니라 이 글의 맥락 안에서, 어떤 사정이 있으면 위 설명이 달라지는지로 한 번 말합니다.
- 예시는 가정입니다. 실제 수임·상담·승소 경험을 만들어내거나 가명 처리한 실화처럼 쓰지 않습니다. 가정이라는 점이 문장 안에서 자연스럽게 드러나게 쓰고(가정법 도입, 숫자를 넣어 보는 계산 등), 매번 같은 고지 문구를 붙이지 않습니다.
- 비용·착수금 액수는 언급하지 않습니다.
${profileId ? "- 상담용 전화번호와 tel: 링크는 서버가 등록된 대표번호로 따로 붙입니다. 본문에는 사무소 전화번호나 전화 링크를 직접 만들거나 입력에서 복사하지 마세요. 맨 끝의 기준일·작성 줄도 서버가 붙이므로 쓰지 않습니다." : "- 맨 끝의 기준일 줄은 서버가 붙입니다. 본문에 쓰지 마세요."}

[법조문·판례 인용 규칙]
- 근거 법조문은 정확한 조문 번호로 명시하고, 그 조문이 이 사안에 왜 적용되는지를 한 문장으로 붙입니다.
- 조문 번호에 확신이 없으면 번호를 쓰지 말고 제도·규정의 이름으로만 서술합니다. 틀린 조문 번호는 없느니만 못합니다.
- 판례 번호(사건번호)는 쓰지 않습니다. 판례는 '법원은 이런 사정이 있으면 이렇게 본다'는 판단 흐름으로만 서술합니다.
- 수치와 기한은 정확하게 씁니다. 신뢰는 글의 길이가 아니라 이 디테일에서 나옵니다.

[글쓰기 — 이 글의 품질은 여기서 결정됩니다]
- 한 편은 한 질문에 답합니다. 글의 모든 구간이 그 질문으로 돌아와야 합니다. 관련은 있지만 질문에 답하지 않는 내용은 버립니다.
- 독자가 아는 말에서 출발해 법률 용어로 데려갑니다. 용어는 처음 나올 때 당사자의 말로 풀어 주고, 그다음부터 용어를 씁니다.
- 추상보다 구체가 먼저입니다. 기준을 말하기 전에 그 기준이 작동하는 장면을 보여 주고, 숫자가 나오면 계산 과정을 따라가게 합니다.
- 문단 하나는 논점 하나입니다. 문단의 첫 문장이 그 논점을 말하고, 나머지 문장이 근거와 의미를 댑니다. 주장, 근거, 그래서 독자에게 무슨 뜻인지. 이 셋이 갖춰지지 않은 문단은 다시 씁니다.
- 문단과 문단 사이는 논리로 잇습니다. 다음 문단이 앞 문단의 어떤 물음에 답하는지가 보여야 합니다. 접속사만 바꿔 끼우지 마세요.
- 문장은 주어와 서술어를 가깝게 두고, 피동과 명사화를 줄입니다. 수식어 대신 사실을 씁니다. '매우 중요한 기한'이 아니라 '14일'이라고 씁니다.
- 짧은 문장과 긴 문장을 섞습니다. 같은 어미가 세 번 연달아 오지 않게 합니다. 경어체(~합니다/~입니다)를 기본으로, 단정적이되 따뜻하게 씁니다.
- 공감은 한두 번, 사실로 합니다. 독자의 처지를 길게 위로하지 말고, 그 처지에서 무엇이 궁금한지를 정확히 아는 것으로 공감을 보여 주세요.
- 독자를 가르치려 들지 말고, 옆에서 설명하는 사람의 높이로 씁니다.
- 도입부는 독자가 처한 상황으로 곧장 들어가되, 첫 문단을 넘기기 전에 핵심 답이나 판단 기준을 한 번 줍니다. 용어의 사전적 정의로 시작하지 않습니다. 본문 첫 줄은 소제목이 아니라 문단으로 시작합니다.
- 변호사가 독자에게 설명하는 목소리로 씁니다. 확인되지 않은 '제가 맡았던 사건', 실적·경력·승소 경험을 만들지 않습니다.
- 다 쓴 뒤 출력하기 전에 스스로 퇴고하세요(퇴고 과정은 출력하지 않습니다). 빼도 뜻이 통하는 문장을 지우고, 소제목마다 독자가 몰랐을 정보가 하나 이상 있는지, 같은 말을 다른 문장으로 되풀이한 곳은 없는지, 끝 문단이 앞의 내용을 요약하는 대신 글을 닫고 있는지 확인합니다.

[깊이 — 요약본이 아니라 조사한 사람의 글이어야 합니다]
- 모든 핵심 주장에 근거를 붙입니다. "처벌될 수 있습니다"가 아니라 "몇 조에 따라 어느 범위"까지.
- 아래 가운데 이 주제에 맞는 것을 두 가지 이상 본문에 넣습니다.
  · 상대방의 움직임: 상대 당사자·수사기관·보험사·행정청이 이 단계에서 통상 어떻게 나오는지와 그에 대한 판단
  · 옆 사례: 독자가 자기 일로 착각하기 쉽지만 결론이 다른 상황 하나
  · 시간표: 시작부터 끝까지 단계별로 통상 걸리는 기간
  · 되묻는 질문: 설명을 들은 독자가 바로 되물을 질문 한두 개를 FAQ 나열이 아니라 본문 문단으로
  · 끝난 뒤의 일: 결과 이후에 따라오는 절차나 불이익(면허, 기록, 등기, 세금 등)
- 소제목 하나당 독자가 몰랐을 실질 정보가 최소 하나. 아는 말을 늘려 분량을 채우지 않습니다.

[AI가 인용하기 좋은 형태]
- 각 ## 소제목은 그 아래 문단이 답하는 질문에 대응합니다. 소제목만 읽어도 글의 논지가 보이게.
- 떼어내서 그대로 인용해도 뜻이 통하는 '독립된 덩어리'를 최소 1개 포함합니다: 핵심 개념을 규정하는 정의 문단, A와 B를 나란히 놓는 대조, 또는 단계별 절차.

[강조]
네이버 블로그에서 각각 형광펜·밑줄·굵게로 바뀝니다. 아래 개수를 넘기지 마세요. 과한 강조는 신뢰를 떨어뜨립니다.
${emphasisRule}
- 한 문단에 강조가 두 종류 넘게 들어가지 않게 하세요. 강조가 없는 문단이 있어도 괜찮습니다. 한 구절에 강조를 중첩하거나 소제목·문단 전체를 형광펜 처리하지 않습니다.

[마무리]
- 아래 DNA의 [마무리 방식]이 있으면 그 방식으로, 없으면 독자가 지금 앉은 자리에서 할 수 있는 가벼운 행동 하나로 닫습니다.
- 마지막 구간에 서류·증거·준비물 목록을 두지 않습니다. '상담 전 준비', '챙겨 오실 것' 같은 소제목도 쓰지 않습니다. 서류가 많아 보이면 독자는 상담을 미룹니다. 상담은 자료 없이 시작된다는 것이 기본 태도입니다.
- 마지막 문단은 2~4문장, 목록 없이. '지금 전화하세요' 같은 노골적 CTA·강압 표현은 쓰지 않습니다.

[⛔ 쓰지 않는 표현]
- "~에 대해 알아보겠습니다 / ~을 살펴보겠습니다", "이번 글에서는 / 지금까지 ~에 대해 / 오늘은 ~"
- "결론적으로 / 마무리하며 / 종합해보면", "~하는 것이 중요합니다 / ~할 필요가 있습니다"
- "~라고 할 수 있습니다 / ~라는 점에서 주목할 만합니다", "여러분", 물음표 연속("왜일까요? 무엇일까요?")
- "솔직히 말씀드리면", "결론부터 말씀드리면", "답부터 드리면", "~하고 계신다면 방향은 맞습니다", "여기까지는 ~입니다", "생각보다 빨리 지나갑니다"
- "혼자 대응하다 보면", "혼자 준비하실 때" 같은 위험 강조의 되풀이
- 글을 형식적인 'FAQ'·'Q&A 정리' 나열로 끝내는 것, 똑같은 문장 구조의 기계적 반복, 의미 없는 병렬 나열
${avoidBlock ? `\n${avoidBlock}\n` : ""}
[제목 — 의뢰인이 실제로 던질 질문 그대로]
제목은 이 글이 답하는 질문입니다. 의뢰인이 새벽에 검색창이나 AI에게 실제로 입력할 법한 자연어 문장으로 쓰세요.
- 본문이 실제로 답하는 질문이어야 합니다. 본문에 없는 내용을 제목으로 걸지 마세요.
- 의뢰인이 쓰는 말로 씁니다. "공연성" "유책배우자" 같은 법률 용어 대신 당사자가 실제로 쓰는 표현으로.
- 큰 키워드형 제목("음주운전 처벌기준", "이혼 재산분할")은 금지입니다. 그런 질문은 이미 AI가 더 잘 답합니다.
- 25~35자. 물음표는 붙여도 되고 안 붙여도 됩니다.
- 형태를 달리하세요: 상황+물음 / 조건+결과의 진술 / 판단 요청 / 절차 물음 / 통보를 받은 사실의 진술. "~나요"로 끝나는 제목이 가장 흔하므로, 다른 끝맺음을 먼저 검토합니다.
- 낚시성·과장·단정("무조건", "100%")은 금지입니다. 제목과 본문 소제목을 똑같이 반복하지 않습니다.

[분량] ${lengthRule} 모자라면 논점과 근거를 더 깊게, 넘치면 군더더기를 덜어냅니다.

${dnaBlock}
[네이버 복사용 지면 편집]
- 위 변호사별 문체와 소제목 스타일은 유지하되, 각 소제목 아래 첫 문단은 그 구간의 답이나 판단 기준을 먼저 제시합니다. 제목을 본문 첫 줄에 다시 적지 않습니다.
- 문단 사이와 소제목 앞뒤에는 빈 줄을 정확히 한 줄만 둡니다. 조건과 예외를 함께 읽어야 할 문장은 억지로 나누지 않습니다.
- 글자 수에 맞춘 강제 줄바꿈, 문장 중간 개행, 연속 빈 줄, 공백 들여쓰기, HTML 태그는 사용하지 않습니다.
- ## 는 주요 소제목, ### 는 같은 주제 안의 하위 항목에만 사용합니다. 소제목은 짧고 구체적으로, 키워드를 반복해 채우지 않습니다.
- 절차는 1. 2. 3. 번호목록으로 정리합니다. 목록 항목은 한두 문장, 항목 사이에 빈 줄을 넣지 않습니다. 비교는 짧은 대조 문단이나 목록으로 쓰고, 가로로 넓은 마크다운 표는 쓰지 않습니다. 목록은 글 전체에서 두 곳을 넘기지 않습니다. 설명은 문장으로 합니다.
- 큰 키워드를 기계적으로 반복하거나 자극적·낚시성 문구를 쓰지 않습니다. 이미지가 없어도 글만으로 이해되게 씁니다.
${trustBlock}
[경력·실적] 변호사의 경력·자격·수임 실적은 이 글에 쓰지 않습니다. 확인되지 않은 경험을 만들지 않고, 글의 신뢰는 법률 설명의 정확성으로만 얻습니다.

[출력 형식] 아래 구분자 형식을 정확히 지키고, 그 외의 말은 한마디도 붙이지 마세요. JSON이 아닙니다.
===TITLE===
(제목 한 줄)
===BODY===
(마크다운 본문. 첫 줄은 문단으로 시작. 기준일·작성 줄·전화번호는 쓰지 않습니다)
===FACTS===
(본문에 쓴 사실 주장 가운데 사람이 확인해야 할 것을 한 줄에 하나씩, "- "로 시작해 적습니다: 조문 번호와 그 내용, 기한과 기산점, 금액·비율·점수 등 수치, 개정·결정의 시점. 본문 문장을 그대로 옮기지 말고 확인 가능한 명제로 짧게. 이 블록은 독자에게 보이지 않고 검수자에게만 보입니다)`;

        const userMessage = field && field.trim()
            ? `[분야/사건 유형] ${field.trim()}\n\n[작성할 내용]\n${content.trim()}`
            : content.trim();

        const attempt = paidAttempt(attemptId, confirmPaid);
        const operationId = paidId("blog-manuscript-v15", { content: content.trim(), field, profileId, topic, attempt });
        const { data } = await paidJsonRequest(operationId, "블로그 원고", BLOG_WRITING_MODEL, () => fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            signal: AbortSignal.timeout(285_000),
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: BLOG_WRITING_MODEL,
                max_tokens: 20000,
                thinking: { type: "adaptive" },
                output_config: { effort: "high" },
                system: systemPrompt,
                messages: [{ role: "user", content: userMessage }],
            }),
        }));
        if (data.stop_reason === "max_tokens") throw new PaidOperationError("원고 응답이 중간에 끊겼습니다. 응답은 보존했으며 자동으로 다시 생성하지 않습니다.", operationId, "incomplete_response", 422);
        // adaptive thinking을 켜면 content 배열에 thinking 블록이 먼저 올 수 있으므로 text 블록을 찾는다
        const blocks: Array<{ type: string; text?: string }> = data.content || [];
        const rawContent = blocks.find((b) => b.type === "text")?.text || "";

        const parsed = parseDelimiterFormat(rawContent);
        const title = parsed.title;
        const rawDraftBody = parsed.body;
        if (!title.trim() || !rawDraftBody.trim()) throw new PaidOperationError("완성된 원고를 받지 못했습니다. 응답은 보존했으며 자동 재생성하지 않습니다.", operationId, "incomplete_response", 422);

        // 기준일·작성 줄은 서버가 조립한다. 모델이 습관적으로 붙인 꼬리는 걷어낸다.
        const manuscript = rawDraftBody.replace(/\n---+[ \t]*\r?\n[ \t]*\*\*기준일\*\*[\s\S]*$/, "").trimEnd();
        const footer = `---\n**기준일** ${todayLabel} 작성 · 이후 법령이 개정되면 이 글을 갱신합니다.${authorLine ? `\n${authorLine}` : ""}`;
        // Keep Claude's final wording and append only the registered contact details.
        const body = appendBlogPhoneContact(`${manuscript}\n\n${footer}`, phoneContact);
        const draftBody = body;
        const charCount = body.replace(/\s/g, "").length; // 공백 제외 글자 수
        return NextResponse.json({
            editorialWarnings: reviewBlogEditorial(title, body, recentBodies, recentTitles),
            factChecklist: parsed.facts,     // 검수자 확인용 사실 목록 (본문에는 포함되지 않는다)
            title,
            body,
            charCount,
            draftBody,                       // 원문 비교용
            polished: false,
            polishModel: null,
            polishReason: null,
            dna: dnaInfo,
            contactWarning: profileId && !phoneContact
                ? "대표번호를 확인하지 못해 전화 링크를 넣지 않았습니다. 변호사 프로필의 대표 전화번호 1(메인)을 확인해주세요."
                : null,
        });
    } catch (err) {
        if (err instanceof PaidOperationError) return NextResponse.json({ error: err.message, operationId: err.operationId, code: err.code }, { status: err.status });
        if (err instanceof StrengthStoreError) return NextResponse.json({ error: err.message }, { status: err.status });
        console.error("[Claude Blog Write] Error:", err instanceof Error ? err.name : "UnknownError");
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// ─── ===TITLE=== / ===BODY=== / ===FACTS=== 구분자 파싱 ───
function parseDelimiterFormat(text: string): { title: string; body: string; facts: string[] } {
    const titleMarker = "===TITLE===";
    const bodyMarker = "===BODY===";
    const factsMarker = "===FACTS===";
    const factsIdx = text.indexOf(factsMarker);
    const facts = factsIdx === -1 ? [] : text.substring(factsIdx + factsMarker.length).split(/\r?\n/)
        .map((line) => line.replace(/^\s*[-·*]\s*/, "").trim()).filter((line) => line.length >= 4).slice(0, 40);
    const main = factsIdx === -1 ? text : text.substring(0, factsIdx);
    const titleIdx = main.indexOf(titleMarker);
    const bodyIdx = main.indexOf(bodyMarker);

    if (titleIdx !== -1 && bodyIdx !== -1) {
        const title = main.substring(titleIdx + titleMarker.length, bodyIdx).trim();
        const body = main.substring(bodyIdx + bodyMarker.length).trim();
        return { title, body, facts };
    }

    // 구분자가 없으면 첫 줄을 제목으로, 나머지를 본문으로 처리 (안전망)
    const lines = main.trim().split("\n");
    const title = (lines[0] || "제목 없음").replace(/^#+\s*/, "").trim();
    const body = lines.slice(1).join("\n").trim() || main.trim();
    return { title, body, facts };
}
