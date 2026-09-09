/** Editorial warnings, not a Naver ranking score or a legal accuracy guarantee. */
export function reviewBlogEditorial(title: string, body: string, recentBodies: string[] = []): string[] {
    const warnings: string[] = [];
    const normalized = (v: string) => v.replace(/[\s*_#=]/g, "");
    const paragraphs = body.split(/\n\s*\n/).filter((p) => p.length >= 60 && !/기준일|\]\(tel:/.test(p));
    if (paragraphs.some((p) => recentBodies.filter((previous) => normalized(previous).includes(normalized(p))).length >= 2)) warnings.push("최근 원고 두 편 이상과 동일한 긴 문단이 있습니다. 이번 독자 상황에 맞는 정보를 확인해주세요.");
    if (/제가\s*(?:맡았던|수임한|담당한|승소한)|저희가\s*(?:승소|해결)한/.test(body)) warnings.push("실제 수임 경험으로 읽히는 표현이 있습니다. 제공·검수된 사례인지 확인해주세요.");
    if (/무조건|100\s*%\s*승소|승소\s*보장|반드시\s*승소/.test(title + body)) warnings.push("사건 결과를 보장하는 것으로 읽힐 수 있는 표현이 있습니다.");
    if (title.trim() && body.split(/\n/).filter((p) => normalized(p) === normalized(title)).length > 1) warnings.push("제목을 본문에서 반복하고 있습니다. 각 문단의 질문과 답을 구분해주세요.");
    return warnings;
}
