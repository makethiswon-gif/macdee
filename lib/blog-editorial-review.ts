import { FINGERPRINT_PHRASES } from "./blog-repetition";

/** Editorial warnings, not a Naver ranking score or a legal accuracy guarantee. */
export function reviewBlogEditorial(title: string, body: string, recentBodies: string[] = [], recentTitles: string[] = []): string[] {
    const warnings: string[] = [];
    const normalized = (v: string) => v.replace(/[\s*_#=]/g, "");
    const paragraphs = body.split(/\n\s*\n/).filter((p) => p.length >= 60 && !/기준일|\]\(tel:/.test(p));
    if (paragraphs.some((p) => recentBodies.filter((previous) => normalized(previous).includes(normalized(p))).length >= 2)) warnings.push("최근 원고 두 편 이상과 동일한 긴 문단이 있습니다. 이번 독자 상황에 맞는 정보를 확인해주세요.");
    if (/제가\s*(?:맡았던|수임한|담당한|승소한)|저희가\s*(?:승소|해결)한/.test(body)) warnings.push("실제 수임 경험으로 읽히는 표현이 있습니다. 제공·검수된 사례인지 확인해주세요.");
    if (/무조건|100\s*%\s*승소|승소\s*보장|반드시\s*승소/.test(title + body)) warnings.push("사건 결과를 보장하는 것으로 읽힐 수 있는 표현이 있습니다.");
    if (title.trim() && body.split(/\n/).filter((p) => normalized(p) === normalized(title)).length > 1) warnings.push("제목을 본문에서 반복하고 있습니다. 각 문단의 질문과 답을 구분해주세요.");

    // ── 2026-09-17 추가: 분량·마무리·반복 지문·근거 ──
    const core = body.split(/\n---+[ \t]*\r?\n/)[0].replace(/^\[전화 상담[^\n]*$/gm, "").trimEnd();
    const chars = core.replace(/\s/g, "").length;
    if (chars >= 800 && chars < 2500) warnings.push(`본문이 공백 제외 ${chars.toLocaleString()}자입니다. 목표(2,700자 이상)보다 짧습니다. 빠진 논점이 없는지 확인해주세요.`);

    if (chars > 3500) warnings.push(`본문이 공백 제외 ${chars.toLocaleString()}자입니다. 목표 상한(3,200자 안팎)을 넘었습니다. 질문에 답하지 않는 구간을 덜어내 주세요.`);

    const lastIndex = core.lastIndexOf("\n## ");
    if (lastIndex >= 0) {
        const last = core.slice(lastIndex);
        const lastHeading = (last.match(/^\n## (.+)$/m) || ["", ""])[1];
        const docWords = (last.match(/서류|준비물|지참|챙겨|가져오|증명서|등본|내역서/g) || []).length;
        const listLines = (last.match(/^\s*(?:[-*]|\d+\.)\s/gm) || []).length;
        if (/상담\s*(?:전|때|갈|오실)|준비물|챙겨|준비할/.test(lastHeading) || (docWords >= 2 && listLines >= 2)) warnings.push("마지막 구간이 상담 준비 서류 목록으로 끝납니다. 서류가 많아 보이면 독자가 상담을 미룹니다. 가벼운 한 걸음으로 닫아주세요.");
    }

    const found = FINGERPRINT_PHRASES.filter((p) => p.pattern.test(core)).map((p) => p.label);
    if (found.length) warnings.push(`여러 블로그에 반복되던 상투 구절이 있습니다: ${found.join(", ")}. 다른 말로 바꿔주세요.`);

    if (chars >= 800 && !/제\s?\d+조/.test(core)) warnings.push("근거 조문이 하나도 없습니다. 판단 기준의 법적 근거를 확인해주세요.");

    const ending = (t: string) => t.replace(/[?？!.\s]+$/g, "").slice(-2);
    if (title.trim() && recentTitles.slice(0, 5).filter((t) => ending(t) === ending(title)).length >= 3) warnings.push(`최근 제목 다섯 편 중 세 편 이상이 "~${ending(title)}"로 끝납니다. 제목의 끝말을 달리해주세요.`);

    const author = (body.match(/\*\*작성\*\*[^\n]*/) || [""])[0];
    if (author.length > 110) warnings.push("맨 끝 '작성' 줄의 취급 분야가 너무 깁니다. 이 글과 관련된 분야만 남겨주세요.");
    return warnings;
}
