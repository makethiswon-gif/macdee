import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { extractClaudeText } from "@/lib/ai/claude-text";
import { loadStrengthLibrary } from "@/lib/blog-strengths-store";
import { eligibleStrengths, publicStrength } from "@/lib/blog-strengths";

export const maxDuration = 60;
const responseHeaders = { "Cache-Control": "private, no-store" };

// 블로그 하나에 맞는 주제 후보를 여러 개 뽑는다. 관리자가 그중 하나를 골라 원고를 만든다.
//
// 두 가지를 지킨다.
//  1. 프로필의 담당 분야(fields) 밖으로 나가지 않는다 — 8개 블로그가 같은 주제를 쓰는 걸 구조적으로 막는다.
//  2. 이미 쓴 주제와 겹치지 않는다 — 같은 블로그 안에서의 반복을 막는다.

interface TopicCandidate {
    topic: string;
    field: string;
    angle: string;
    titleIdea: string;
    reason: string;
}

const fallbackAngles = [
    {
        topic: "상담 전에 사실관계를 시간순으로 정리해야 하는 이유",
        angle: "처음 설명한 내용과 객관 자료의 시간 순서가 어디서 어긋나는지에 따라 필요한 대응이 달라집니다.",
        title: "상담 전 시간순 정리가 중요한 이유",
        reason: "초기 상담에서 반복되는 준비 질문",
    },
    {
        topic: "상대방 연락을 받은 직후 먼저 확인할 사항",
        angle: "답변 시점보다 상대방 요구의 근거와 보유 증거를 먼저 구분해야 대응 방향을 판단할 수 있습니다.",
        title: "상대방 연락 직후 확인할 것",
        reason: "초기 대응을 고민하는 검색 수요",
    },
    {
        topic: "증거를 모을 때 놓치기 쉬운 부분",
        angle: "자료의 양보다 작성 시점과 원본 보존 여부가 입증 가능성을 가르는 지점을 설명합니다.",
        title: "증거 수집에서 놓치기 쉬운 점",
        reason: "상담 전 증거 준비 수요",
    },
    {
        topic: "합의서에 서명하기 전 확인해야 할 문구",
        angle: "금액만 볼 것이 아니라 지급 시기와 추가 청구 제한 문구가 실제 권리관계에 미치는 영향을 살핍니다.",
        title: "합의서 서명 전 확인할 문구",
        reason: "결정 직전 상담 전환 가능성이 높은 주제",
    },
    {
        topic: "혼자 대응하다 상담 시기를 놓치기 쉬운 순간",
        angle: "법정 기간과 증거 소실 가능성 중 어느 위험이 먼저 생기는지에 따라 상담 시급성이 달라집니다.",
        title: "상담 시기를 놓치기 쉬운 순간",
        reason: "상담 필요성을 판단하는 검색 수요",
    },
    {
        topic: "첫 상담 때 준비하면 판단이 빨라지는 자료",
        angle: "주장 요약보다 계약서·대화·송금 내역처럼 서로 대조할 수 있는 자료가 판단에 미치는 차이를 설명합니다.",
        title: "첫 상담 전에 준비할 자료",
        reason: "상담 예약 직전의 준비 검색 수요",
    },
    {
        topic: "기한을 넘기기 전에 확인해야 할 날짜",
        angle: "분쟁이 시작된 날과 통지를 받은 날 중 어떤 시점이 법적 대응 기간의 기준이 되는지 구분합니다.",
        title: "대응 기한을 정하는 날짜 확인법",
        reason: "법정 기간을 걱정하는 긴급 검색 수요",
    },
    {
        topic: "문자와 통화녹음 중 먼저 보존할 증거",
        angle: "내용 자체뿐 아니라 상대방과의 관계, 작성 경위와 원본 보존 여부가 증거 가치를 가르는 지점을 살핍니다.",
        title: "문자와 녹음 증거 보존 순서",
        reason: "휴대전화 증거 확보 관련 반복 질문",
    },
    {
        topic: "절차를 시작하기 전 비용과 실익을 따져보는 기준",
        angle: "청구 가능성만이 아니라 회수 가능성과 소요 기간까지 함께 봐야 실제 대응의 실익을 판단할 수 있습니다.",
        title: "절차 전 비용과 실익 판단 기준",
        reason: "의뢰 결정 직전의 비교 검색 수요",
    },
    {
        topic: "상대방 주장과 내 기억이 다를 때 정리하는 방법",
        angle: "기억의 정확성을 다투기 전에 당시 작성된 자료와 이후 행동이 어느 주장을 뒷받침하는지 대조합니다.",
        title: "서로 다른 주장 정리하는 방법",
        reason: "사실관계 충돌로 불안한 상담 수요",
    },
] as const;

const clip = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const compact = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\s·ㆍ/(),.\-–—:]/g, "");

function matchingField(candidate: Partial<TopicCandidate>, fields: string[]): string | null {
    const raw = clip(candidate.field, 100);
    const exact = fields.find((field) => field === raw) || fields.find((field) => compact(field) === compact(raw));
    if (exact) return exact;

    const content = compact(`${raw} ${clip(candidate.topic, 200)} ${clip(candidate.angle, 300)}`);
    return [...fields]
        .sort((a, b) => compact(b).length - compact(a).length)
        .find((field) => {
            const normalized = compact(field);
            return normalized.length >= 2 && content.includes(normalized);
        }) || null;
}

function normalizeCandidate(candidate: Partial<TopicCandidate>, fields: string[]): TopicCandidate | null {
    const topic = clip(candidate.topic, 45);
    const field = matchingField(candidate, fields);
    if (!topic || !field) return null;
    return {
        topic,
        field,
        angle: clip(candidate.angle, 120) || `${field} 사건에서 사실관계와 자료의 어느 지점이 판단을 가르는지 설명합니다.`,
        titleIdea: clip(candidate.titleIdea, 30) || topic.slice(0, 30),
        reason: clip(candidate.reason, 50) || "담당 분야의 상담 전 검색 수요",
    };
}

function fallbackCandidates(fields: string[], written: string[], existing: string[], count: number): TopicCandidate[] {
    const recent = new Set(written.map((value) => compact(String(value))));
    const emitted = new Set(existing.map((value) => compact(String(value))));
    const candidates: TopicCandidate[] = [];
    const start = Number(kstToday().replaceAll("-", "")) % fallbackAngles.length;

    for (const avoidRecent of [true, false]) {
        for (let i = 0; candidates.length < count && i < fields.length * fallbackAngles.length; i += 1) {
            const field = fields[i % fields.length];
            const template = fallbackAngles[(start + Math.floor(i / fields.length)) % fallbackAngles.length];
            const topic = clip(`${field} ${template.topic}`, 45);
            const key = compact(topic);
            if (emitted.has(key) || (avoidRecent && recent.has(key))) continue;
            emitted.add(key);
            candidates.push({ topic, field, angle: template.angle, titleIdea: template.title, reason: template.reason });
        }
    }
    return candidates;
}

function kstToday(): string {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`;
}

export async function POST(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { profileId, count } = await request.json();
        if (!profileId) return NextResponse.json({ error: "변호사를 선택해주세요." }, { status: 400 });

        const supabase = await createAdminClient();

        const { data: profile, error: pErr } = await supabase
            .from("blog_profiles")
            .select("id, lawyer_name, office_name, specialty, fields")
            .eq("id", profileId)
            .single();

        if (pErr || !profile) {
            return NextResponse.json({ error: "변호사 정보를 찾을 수 없습니다." }, { status: 404 });
        }

        // 담당 분야가 비어 있으면 기존 specialty로 대신한다.
        const rawFields: string[] = (profile.fields as string[] | null)?.length
            ? (profile.fields as string[])
            : ((profile.specialty as string[] | null) || []);
        const fields = rawFields.map((f) => String(f).trim()).filter(Boolean);

        if (fields.length === 0) {
            return NextResponse.json(
                { error: "이 변호사의 담당 분야가 비어 있습니다. 설정에서 먼저 지정해주세요." },
                { status: 400 }
            );
        }

        // 이미 쓴 주제 — 중복 회피용
        const { data: past } = await supabase
            .from("blog_posts")
            .select("title, topic")
            .eq("profile_id", profileId)
            .order("created_at", { ascending: false })
            .limit(40);

        const written = (past || [])
            .map((p) => p.topic || p.title)
            .filter(Boolean)
            .slice(0, 40);

        const lawyerName = String(profile.lawyer_name || "").split("||")[0] || "변호사";
        let approved: ReturnType<typeof publicStrength>[] = [];
        let strengthUnavailable = false;
        try {
            approved = eligibleStrengths(await loadStrengthLibrary(profileId))
                .filter((claim) => Array.isArray(claim.fields) && claim.fields.some((field) => fields.includes(field)))
                .map(publicStrength);
        } catch (error) {
            strengthUnavailable = true;
            console.error("[Blog topic suggestions] optional strength context unavailable:", error instanceof Error ? error.message : error);
        }
        const wantCount = Math.max(3, Math.min(10, Number(count) || 6));

        const system = `당신은 한국 변호사 블로그의 콘텐츠 전략가입니다.
'${lawyerName}' 변호사(${profile.office_name || ""})의 블로그에 올릴 주제 후보 ${wantCount}개를 제안합니다.

[반드시 지킬 것]
- 담당 분야를 벗어나지 마세요. 이 블로그가 다루는 분야는 다음뿐입니다: ${fields.join(", ")}
- field 값은 위 담당 분야 중 하나를 그대로 반환하세요. 포괄적인 '형사'로 바꾸지 마세요.
- 공개 승인 강점: ${JSON.stringify(approved)}
- 위 강점을 독자의 준비·판단 질문과 연결하되, 전문 분야를 넓히거나 미확인 실제 수임 경험·새 경력을 만들지 마세요. 승인 자료가 없으면 일반 정보형 주제를 제안하세요.
- 주제는 '키워드'가 아니라 '상황'입니다. "이혼 재산분할" 같은 큰 키워드는 금지. 의뢰인이 밤에 실제로 검색할 문장 단위로 좁히세요.
- angle은 '결과'가 아니라 '판단 근거'여야 합니다. 어떤 결론이 나왔는지가 아니라, 사실관계의 어느 지점에서 결론이 갈리는지를 잡으세요.
- 확인되지 않은 판례 번호(사건번호)는 쓰지 마세요.
- 과장, 승소 보장 금지.
- ${wantCount}개가 서로 충분히 달라야 합니다. 같은 쟁점을 표현만 바꿔 반복하지 마세요.

[길이 제한]
topic 45자 이내, angle 2문장·120자 이내, titleIdea 30자 이내, reason 50자 이내.

JSON만 반환하세요.`;

        const avoid = written.length
            ? `\n\n[이미 쓴 주제 — 겹치지 마세요]\n${written.map((w) => `- ${w}`).join("\n")}`
            : "";

        const user = `오늘(KST): ${kstToday()}
담당 분야: ${fields.join(", ")}${avoid}

아래 JSON으로만 반환:
{"topics":[{"topic":"상황 문장","field":"담당 분야 중 하나","angle":"판단 근거 관점","titleIdea":"제목안","reason":"왜 지금 이 주제인지"}]}`;

        let topics: TopicCandidate[] = [];
        let aiUnavailable = false;
        try {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) throw new Error("ANTHROPIC_API_KEY is unavailable");
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
                signal: AbortSignal.timeout(45_000),
                body: JSON.stringify({
                    model: "claude-sonnet-5",
                    max_tokens: 4000,
                    // 정형 JSON 출력이라 thinking이 필요 없다. 켜두면 max_tokens를 먹고 JSON이 잘린다.
                    thinking: { type: "disabled" },
                    system,
                    messages: [{ role: "user", content: user }],
                }),
            });
            if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
            const raw = extractClaudeText(await res.json())
                .replace(/^\s*```(?:json)?/i, "")
                .replace(/```\s*$/, "")
                .trim();
            const start = raw.indexOf("{");
            const end = raw.lastIndexOf("}");
            if (start < 0 || end <= start) throw new Error("No JSON object found");
            const parsed = JSON.parse(raw.slice(start, end + 1)) as { topics?: TopicCandidate[] };
            topics = (parsed.topics || []).flatMap((candidate) => {
                const normalized = normalizeCandidate(candidate, fields);
                return normalized ? [normalized] : [];
            });
        } catch (error) {
            aiUnavailable = true;
            console.error("[Blog topic suggestions] Claude response unavailable:", error instanceof Error ? error.message : error);
        }

        const unique = topics.filter((topic, index, all) => all.findIndex((candidate) => compact(candidate.topic) === compact(topic.topic)) === index).slice(0, wantCount);
        const backfilled = unique.length < wantCount;
        if (backfilled) unique.push(...fallbackCandidates(fields, written, unique.map((topic) => topic.topic), wantCount - unique.length));
        const notice = aiUnavailable
            ? "AI 추천 응답이 지연되어 담당 분야 기준 주제로 대신 제안했습니다. 다시 추천받으면 새 후보를 요청합니다."
            : backfilled
                ? "일부 후보는 담당 분야와 최근 원고를 기준으로 보완했습니다."
                : strengthUnavailable
                    ? "공개 강점 자료를 잠시 연결하지 못해 담당 분야와 최근 원고를 기준으로 추천했습니다."
                : "";

        return NextResponse.json({
            topics: unique,
            fields,
            avoided: written.length,
            notice,
        }, { headers: responseHeaders });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
