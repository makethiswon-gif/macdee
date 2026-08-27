import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { extractClaudeText } from "@/lib/ai/claude-text";

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

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY가 없습니다." }, { status: 500 });

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
        const wantCount = Math.max(3, Math.min(10, Number(count) || 6));

        const system = `당신은 한국 변호사 블로그의 콘텐츠 전략가입니다.
'${lawyerName}' 변호사(${profile.office_name || ""})의 블로그에 올릴 주제 후보 ${wantCount}개를 제안합니다.

[반드시 지킬 것]
- 담당 분야를 벗어나지 마세요. 이 블로그가 다루는 분야는 다음뿐입니다: ${fields.join(", ")}
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

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-sonnet-5",
                max_tokens: 4000,
                // 정형 JSON 출력이라 thinking이 필요 없다. 켜두면 max_tokens를 먹고 JSON이 잘린다.
                thinking: { type: "disabled" },
                system,
                messages: [{ role: "user", content: user }],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: `주제 생성 실패: ${err.substring(0, 200)}` }, { status: 500 });
        }

        const raw = extractClaudeText(await res.json())
            .replace(/^\s*```(?:json)?/i, "")
            .replace(/```\s*$/, "")
            .trim();

        let topics: TopicCandidate[] = [];
        try {
            const start = raw.indexOf("{");
            const end = raw.lastIndexOf("}");
            const parsed = JSON.parse(raw.slice(start, end + 1)) as { topics?: TopicCandidate[] };
            topics = (parsed.topics || []).filter((t) => t?.topic);
        } catch {
            return NextResponse.json({ error: "주제 응답을 읽지 못했습니다. 다시 시도해주세요." }, { status: 500 });
        }

        // 담당 분야 밖으로 새어나간 항목은 버린다
        const inScope = topics.filter((t) => !t.field || fields.some((f) => t.field.includes(f) || f.includes(t.field)));

        return NextResponse.json({
            topics: inScope.length ? inScope : topics,
            fields,
            avoided: written.length,
        });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
