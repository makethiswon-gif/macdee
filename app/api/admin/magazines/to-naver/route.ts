import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { extractClaudeText } from "@/lib/ai/claude-text";
import { getWritingDNA, dnaDirective } from "@/lib/blog-writing-dna";
import { polishBlogBody } from "@/lib/ai/blog-polish";

// 매거진 글을 네이버용 원고로 다시 쓴다.
//
// 복사가 아니라 재작성이다. 매거진 원문은 이미 makethis1.com/magazine에 공개돼 있어서,
// 같은 텍스트를 네이버에 올리면 유사문서로 묶이고 자기 글끼리 검색에서 경쟁한다.
// 소재만 가져오고 글은 새로 쓰되, 끝에 원문 링크를 걸어 매거진으로 유입을 보낸다.

export const maxDuration = 300;

const MACDEE_PROFILE = "macdee-magazine";
const SITE = "https://www.makethis1.com";

function parseDelimited(raw: string): { title: string; body: string } {
    const t = raw.split("===BODY===");
    return {
        title: (t[0] || "").replace("===TITLE===", "").trim().split("\n")[0] || "",
        body: (t[1] || "").trim(),
    };
}

export async function POST(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { magazineId, save } = await request.json();

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY가 없습니다." }, { status: 500 });

        const supabase = await createAdminClient();

        // 대상 매거진 — 지정이 없으면 아직 네이버로 안 보낸 최신 글
        let query = supabase
            .from("magazines")
            .select("id, title, slug, excerpt, body, category")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(1);

        if (magazineId) query = supabase
            .from("magazines")
            .select("id, title, slug, excerpt, body, category")
            .eq("id", magazineId)
            .limit(1);

        const { data: rows, error: mErr } = await query;
        if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
        const mag = rows?.[0];
        if (!mag) return NextResponse.json({ error: "매거진 글을 찾지 못했습니다." }, { status: 404 });

        // 이미 보낸 글인지 확인 (같은 소재를 두 번 쓰지 않는다)
        const { data: dup } = await supabase
            .from("blog_posts")
            .select("id, title")
            .eq("profile_id", MACDEE_PROFILE)
            .eq("topic", mag.slug)
            .limit(1);

        if (dup?.length && !magazineId) {
            return NextResponse.json(
                { error: `최신 매거진은 이미 네이버용으로 만들었습니다: ${dup[0].title}` },
                { status: 409 }
            );
        }

        const { data: profile } = await supabase
            .from("blog_profiles")
            .select("id, dna_salt")
            .eq("id", MACDEE_PROFILE)
            .single();

        const dna = getWritingDNA(MACDEE_PROFILE, (profile?.dna_salt as string) || "", mag.slug);
        const sourceUrl = `${SITE}/magazine/${mag.slug}`;

        const systemPrompt = `당신은 법률 산업 전문 매체의 에디터입니다.
자사 매거진에 실린 글을 네이버 블로그용으로 다시 씁니다.

[가장 중요 — 복사가 아니라 재작성입니다]
원문은 이미 웹에 공개돼 있습니다. 문장을 그대로 옮기면 유사문서로 묶여 둘 다 손해입니다.
같은 사실과 논지를 쓰되, 문장·구성·도입을 처음부터 새로 쓰세요.
원문의 표현을 그대로 가져오지 마세요. 인용이 필요하면 따옴표로 명시하세요.

[독자]
매거진 독자는 변호사입니다. 네이버에서 이 글을 읽을 사람도 변호사·법률사무소 실무자입니다.
의뢰인용 글이 아닙니다. 사건 상담을 유도하지 마세요.

[구성]
- 첫 문단에서 이 글이 답하는 것을 먼저 제시합니다.
- ## 소제목 3~5개.
- 사실과 숫자는 원문에서 정확히 가져오되, 문장은 새로 씁니다.
- 마지막에는 이 변화가 실무에서 무엇을 바꾸는지로 닫습니다.

[강조 표기 — 네이버에서 형광펜·밑줄·굵게로 바뀝니다]
- ==형광펜== : 이 글의 핵심 판단. ${dna.emphasis.highlight[0]}~${dna.emphasis.highlight[1]}곳.
- __밑줄__ : 근거가 되는 사실·수치·제도. ${dna.emphasis.underline[0]}~${dna.emphasis.underline[1]}곳.
- **굵게** : 날짜·수치 등 눈으로 집을 값. ${dna.emphasis.bold}곳 이내.

[⛔ 금지]
"~에 대해 알아보겠습니다", "이번 글에서는", "결론적으로", "마무리하며",
"~하는 것이 중요합니다", "~라고 할 수 있습니다", "여러분"

${dnaDirective(dna)}

[분량] 본문 공백 포함 ${dna.targetLength - 200}~${dna.targetLength + 200}자.

[출력 형식] 아래 구분자만 지키고 다른 말은 붙이지 마세요.
===TITLE===
(제목 한 줄. 변호사가 실제로 검색하거나 궁금해할 문장으로. 원문 제목을 그대로 쓰지 마세요)
===BODY===
(마크다운 본문. ## 소제목과 ==형광펜== __밑줄__ **굵게** 사용)

본문 맨 끝에 아래 두 줄을 그대로 붙입니다. (분량 계산에서 제외)

---
**원문** 이 글은 맥디 매거진에 실린 글을 네이버용으로 다시 쓴 것입니다.
전문은 여기서 보실 수 있습니다 → ${sourceUrl}`;

        const userMessage = `[원문 제목] ${mag.title}
[분류] ${mag.category || ""}

[원문]
${String(mag.body || "").substring(0, 12000)}`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
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
            return NextResponse.json({ error: `재작성 실패: ${err.substring(0, 200)}` }, { status: 500 });
        }

        const { title, body: draftBody } = parseDelimited(extractClaudeText(await res.json()));
        if (!title || !draftBody) {
            return NextResponse.json({ error: "재작성 결과를 읽지 못했습니다." }, { status: 500 });
        }

        // 원고와 같은 2차 윤문을 태운다
        const polish = await polishBlogBody(draftBody);

        let postId: string | null = null;
        if (save !== false) {
            const { data, error } = await supabase
                .from("blog_posts")
                .insert({
                    profile_id: MACDEE_PROFILE,
                    title,
                    body: polish.text,
                    draft_body: draftBody,
                    field: mag.category || null,
                    topic: mag.slug, // 같은 매거진을 두 번 보내지 않기 위한 열쇠
                    status: "draft",
                })
                .select("id")
                .single();

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            postId = data.id;
        }

        return NextResponse.json({
            postId,
            magazine: { id: mag.id, title: mag.title, slug: mag.slug },
            title,
            body: polish.text,
            polished: polish.polished,
            sourceUrl,
            dna: { voice: dna.voice.name, heading: dna.heading.name, structure: dna.structure.name },
        });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
