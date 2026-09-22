import { NextResponse } from "next/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getWritingDNA } from "@/lib/blog-writing-dna";
import { validProfileId } from "@/lib/blog-strengths";
import { paidAttempt, paidId, paidJsonRequest, PaidOperationError } from "@/lib/blog-images/paid-operation";
import { usageFromProvider } from "@/lib/blog-usage";
import { appendUsage } from "@/lib/blog-post-state";
import { resolveEditScope, applyEdit, type EditScope } from "@/lib/blog-edit-scope";
import { BLOG_WRITING_MODEL } from "@/app/api/admin/claude-blog-write/route";

// 부분 수정 — 원고 전체를 다시 쓰지 않고 지정한 구간만 고친다(2026-09-22 재설계 §4).
// 모델에는 고칠 구간 + 앞뒤 문맥 + 문체 요약만 보낸다(입력 1~2천 토큰). 사고 수준은 medium: 문장 손질에 깊은 추론은 필요 없다.
export const maxDuration = 120;
const KINDS = ["title", "intro", "section", "paragraph", "closing"];

export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "요청 형식을 확인해주세요." }, { status: 400 }); }
    const title = typeof body.title === "string" ? body.title.trim() : "", text = typeof body.body === "string" ? body.body : "";
    const instruction = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 1500) : "";
    const scope = body.scope as EditScope | undefined;
    if (!title || !text || text.length > 60_000 || !instruction || !scope || !KINDS.includes(scope.kind) || (scope.index != null && !Number.isInteger(scope.index))) {
        return NextResponse.json({ error: "수정할 범위와 지시를 확인해주세요." }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    try {
        const target = scope.kind === "title" ? { label: "제목", start: 0, end: 0, target: title, before: "", after: text.slice(0, 700) } : resolveEditScope(text, scope);
        if (!target) return NextResponse.json({ error: "지정한 범위를 원고에서 찾지 못했습니다." }, { status: 400 });
        let styleLine = "";
        if (validProfileId(body.profileId)) {
            const db = await createAdminClient();
            const { data: profile } = await db.from("blog_profiles").select("id, dna_salt").eq("id", body.profileId).single();
            if (profile) {
                const dna = getWritingDNA(profile.id as string, (profile.dna_salt as string) || "", title);
                styleLine = `- 이 블로그의 문체 "${dna.voice.name}": ${dna.voice.spec}\n- 온도 "${dna.temperature.name}": ${dna.temperature.spec}\n- 소제목 형식 "${dna.heading.name}": ${dna.heading.spec}`;
            }
        }
        const system = `당신은 법률 정보 글을 다듬는 편집자입니다. 변호사 블로그 원고의 지정된 구간만 지시에 따라 고칩니다.
[규칙]
- 지정된 구간만 새로 씁니다. 앞뒤 문맥은 참고용이며 출력하지 않습니다.
- 사실·조문·수치·기한은 구간 안에 있던 것만 씁니다. 새 사실을 보태거나 결론을 바꾸지 않습니다. 지시가 사실을 바꾸라는 것이면 문장은 고치되 FACTS 확인이 필요하다고 마지막 줄에 "[확인 필요] …"로 적습니다.
- 마크다운 규칙 유지: ## 소제목, ==형광펜==, __밑줄__, **굵게** 는 원래 구간에 있던 만큼만. 구간이 소제목으로 시작했으면 소제목으로 시작합니다.
- 분량은 지시가 없으면 원래와 비슷하게. 경어체(~합니다). "결론적으로", "여러분", "~에 대해 알아보겠습니다" 같은 상투어 금지.
- 변호사의 경력·실적·수임 경험, 전화번호, 기준일 줄은 쓰지 않습니다.
${styleLine ? `[문체]\n${styleLine}\n` : ""}[출력 형식] 아래 구분자 사이에 바뀐 구간의 텍스트만. 다른 말은 한마디도 붙이지 않습니다.
===TEXT===
(바뀐 구간)
===END===`;
        const user = `[제목] ${title}\n\n[지시]\n${instruction}\n\n[수정할 범위: ${target.label}]\n${target.target}${target.before ? `\n\n[앞 문맥 — 출력하지 않음]\n${target.before}` : ""}${target.after ? `\n\n[뒤 문맥 — 출력하지 않음]\n${target.after}` : ""}`;
        const attempt = paidAttempt(body.attemptId, body.confirmPaid);
        const operationId = paidId("blog-edit-v1", { title, target: target.target, instruction, scope, attempt });
        const { data, reused, elapsedMs } = await paidJsonRequest(operationId, "부분 수정", BLOG_WRITING_MODEL, () => fetch("https://api.anthropic.com/v1/messages", {
            method: "POST", signal: AbortSignal.timeout(100_000),
            headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model: BLOG_WRITING_MODEL, max_tokens: 6000, thinking: { type: "adaptive" }, output_config: { effort: "medium" }, system, messages: [{ role: "user", content: user }] }),
        }));
        const usage = usageFromProvider("edit", "부분 수정", BLOG_WRITING_MODEL, data, { operationId, reused, elapsedMs });
        await appendUsage(body.postId, [usage]);
        if (data.stop_reason === "max_tokens") throw new PaidOperationError("수정 응답이 중간에 끊겼습니다. 응답은 보존했으며 자동으로 다시 요청하지 않습니다.", operationId, "incomplete_response");
        const raw = ((data.content || []) as { type: string; text?: string }[]).find((b) => b.type === "text")?.text || "";
        const m = raw.match(/===TEXT===\s*([\s\S]*?)\s*(?:===END===|$)/);
        const replacement = (m ? m[1] : raw).trim();
        if (!replacement || replacement.includes("===") || /\*\*기준일\*\*|\]\(tel:/.test(replacement)) throw new PaidOperationError("수정 결과 형식이 올바르지 않습니다. 응답은 보존했습니다.", operationId, "invalid_response", 422);
        const warnings: string[] = [];
        const ratio = replacement.replace(/\s/g, "").length / Math.max(1, target.target.replace(/\s/g, "").length);
        if (scope.kind !== "title" && (ratio < 0.5 || ratio > 2)) warnings.push(`분량이 ${ratio < 1 ? "크게 줄었" : "크게 늘었"}습니다(${Math.round(ratio * 100)}%).`);
        if (/\[확인 필요\]/.test(replacement)) warnings.push("모델이 사실 확인이 필요하다고 표시했습니다. 적용 전 확인해주세요.");
        const cleaned = replacement.replace(/\n?\[확인 필요\][^\n]*$/m, "").trim();
        const nextTitle = scope.kind === "title" ? cleaned.split("\n")[0].slice(0, 120) : title;
        const nextBody = scope.kind === "title" ? text : applyEdit(text, target, cleaned);
        return NextResponse.json({ replacement: cleaned, label: target.label, target: target.target, title: nextTitle, body: nextBody, warnings, usage, operationId },
            { headers: { "Cache-Control": "private, no-store" } });
    } catch (err) {
        if (err instanceof PaidOperationError) return NextResponse.json({ error: err.message, operationId: err.operationId, code: err.code }, { status: err.status });
        console.error("[Claude Blog Edit] Error:", err instanceof Error ? err.name : "UnknownError");
        return NextResponse.json({ error: err instanceof Error ? err.message : "부분 수정에 실패했습니다." }, { status: 500 });
    }
}
