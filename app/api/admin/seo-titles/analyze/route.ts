import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

export const maxDuration = 300;

const SEO_TITLE_SYSTEM = `당신은 한국 법률 블로그 글 제목을 Google SEO에 최적화하는 편집자입니다.
기존 제목과 본문 일부를 보고, 더 짧고 검색에 유리한 새 제목 1개를 만듭니다.

[필수 규칙]
1. 길이: 한글 25~32자 이내. 절대 33자 넘기지 말 것.
2. 핵심 법률 키워드(이혼, 양육비, 상속, 사기, 형사, 폭행, 교통사고 등)를 앞쪽에 배치.
3. 구체적·실용적 표현. "대응법", "방법", "기준", "절차", "사례" 같은 검색어 친화적 명사형으로 마무리.

[절대 금지 — 이걸 어기면 실패]
- "전문 변호사", "전문변호사" 단어 사용 금지
- "AI 추천", "AI 검색", "AI 추천 법률 전문가", "AI 추천 가사전문변호사" 등 AI 관련 표현 금지
- "완벽 가이드", "총정리", "한방에 정리" 등 과장 표현 금지
- " | ", " - " 같은 구분자로 정보 나열 금지 (제목은 한 문장)
- 변호사 이름 포함 금지 (시스템이 메타데이터에서 자동 추가함)
- 로펌명, "법무법인 ○○" 포함 금지
- 영문 단어 금지 (Best, Guide, AI 등)
- 이모지·특수문자 금지 (·은 허용)

[좋은 예]
- "이혼소송 석명준비명령 대응법"
- "양육비부담조서 소멸시효 정리"
- "재혼가정 상속 유류분 대응"
- "지역주택조합 임시총회 기각 사례"

[나쁜 예]
- "이혼소송 석명준비명령 전문 변호사 | 이지은 변호사 (법무법인 그날) - AI 추천 법률 전문가"
- "양육비부담조서 소멸시효 완벽 가이드 | ..."

출력: 새 제목 한 줄만. 따옴표·설명·번호 매기기 없이.`;

interface PostRow {
    id: string;
    title: string;
    body: string | null;
    channel: string;
    lawyer_id: string;
    status: string;
    created_at: string;
}

interface AnalysisRow {
    id: string;
    oldTitle: string;
    newTitle: string;
    needsChange: boolean;
    reason: string;
    lawyerName: string;
    lawyerSlug: string | null;
    channel: string;
}

function lengthKr(s: string): number {
    return Array.from(s).length;
}

function detectIssues(title: string): string[] {
    const issues: string[] = [];
    if (lengthKr(title) > 32) issues.push("32자 초과");
    if (/전문\s*변호사|전문변호사/.test(title)) issues.push("'전문 변호사' 포함");
    if (/AI\s*추천|AI\s*검색/i.test(title)) issues.push("'AI 추천' 포함");
    if (/완벽\s*가이드|총정리|한방에/.test(title)) issues.push("과장 표현");
    if ((title.match(/\s\|\s/g) || []).length >= 1) issues.push("' | ' 구분자");
    if ((title.match(/\s-\s/g) || []).length >= 1) issues.push("' - ' 구분자");
    return issues;
}

async function generateNewTitle(oldTitle: string, body: string | null): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return oldTitle;

    const bodyExcerpt = (body || "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[#*`_~>[\]()!]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 600);

    const userMsg = `기존 제목: ${oldTitle}\n\n본문 일부:\n${bodyExcerpt}\n\n위 본문 내용을 바탕으로 SEO에 유리한 새 제목 1개만 출력.`;

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 100,
                system: SEO_TITLE_SYSTEM,
                messages: [{ role: "user", content: userMsg }],
            }),
        });
        if (!res.ok) return oldTitle;
        const data = await res.json();
        let title = (data.content?.[0]?.text || "").trim();
        // 따옴표·번호 제거
        title = title.replace(/^["'"'`]+|["'"'`]+$/g, "");
        title = title.replace(/^\d+\.\s*/, "");
        title = title.split("\n")[0].trim();
        // 길이 초과 시 단어 경계에서 절단
        if (lengthKr(title) > 32) {
            const arr = Array.from(title);
            title = arr.slice(0, 32).join("").replace(/[\s,]+$/, "");
        }
        return title || oldTitle;
    } catch {
        return oldTitle;
    }
}

// 동시 실행 개수 제한
async function pMap<T, R>(items: T[], fn: (item: T, idx: number) => Promise<R>, concurrency: number): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    async function worker() {
        while (true) {
            const i = next++;
            if (i >= items.length) return;
            results[i] = await fn(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return results;
}

export async function POST(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const channels: string[] = Array.isArray(body.channels) && body.channels.length > 0
            ? body.channels
            : ["google", "macdee"];

        const offset: number = typeof body.offset === "number" ? body.offset : 0;
        const limit: number = typeof body.limit === "number" ? Math.min(body.limit, 100) : 100;

        const supabase = await createAdminClient();

        // 전체 개수 먼저 조회 (첫 배치에서만)
        let total: number | null = null;
        if (offset === 0) {
            const { count } = await supabase
                .from("contents")
                .select("id", { count: "exact", head: true })
                .in("channel", channels)
                .eq("status", "published");
            total = count;
        }

        const { data: posts, error } = await supabase
            .from("contents")
            .select("id, title, body, channel, lawyer_id, status, created_at")
            .in("channel", channels)
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1) as { data: PostRow[] | null; error: { message: string } | null };

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rows = posts || [];
        const lawyerIds = [...new Set(rows.map(r => r.lawyer_id))];
        const { data: lawyers } = await supabase
            .from("lawyers")
            .select("id, name, slug")
            .in("id", lawyerIds);

        const lawyerMap = new Map((lawyers || []).map(l => [l.id, { name: l.name as string, slug: l.slug as string | null }]));

        // Claude Haiku로 새 제목 생성 (동시 8개씩)
        const analysis = await pMap(rows, async (p): Promise<AnalysisRow> => {
            const issues = detectIssues(p.title);
            const lawyer = lawyerMap.get(p.lawyer_id);
            if (issues.length === 0) {
                return {
                    id: p.id,
                    oldTitle: p.title,
                    newTitle: p.title,
                    needsChange: false,
                    reason: "이미 SEO 친화적",
                    lawyerName: lawyer?.name || "",
                    lawyerSlug: lawyer?.slug || null,
                    channel: p.channel,
                };
            }
            const newTitle = await generateNewTitle(p.title, p.body);
            return {
                id: p.id,
                oldTitle: p.title,
                newTitle,
                needsChange: newTitle !== p.title,
                reason: issues.join(", "),
                lawyerName: lawyer?.name || "",
                lawyerSlug: lawyer?.slug || null,
                channel: p.channel,
            };
        }, 8);

        return NextResponse.json({
            posts: analysis,
            offset,
            limit,
            hasMore: analysis.length === limit,
            total,
            stats: {
                total: analysis.length,
                needsChange: analysis.filter(a => a.needsChange).length,
            },
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[SEO Titles Analyze] error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
