// 한글 제목 → SEO 친화적 URL slug 생성
// 한글 키워드를 그대로 살려 구글 한글 검색에 유리하게. 고유성은 id 앞자리로 보장.

/**
 * 제목으로 URL slug를 만든다.
 * 예: "이혼소송 위자료 3천만원 받은 실제 사례" → "이혼소송-위자료-3천만원-받은-실제-사례-a1b2c3"
 *
 * @param title  글 제목
 * @param id     해당 글의 UUID (고유성 suffix 용)
 */
export function makeSlug(title: string, id: string): string {
    const suffix = (id || "").replace(/-/g, "").slice(0, 6) || "post";

    let s = (title || "")
        .replace(/\*\*/g, "")
        // 한글·영문·숫자·공백·하이픈만 남김
        .replace(/[^가-힣a-zA-Z0-9\s-]/g, " ")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    // 길이 제한 (한글 기준 약 40자) — 너무 긴 URL 방지
    s = Array.from(s).slice(0, 40).join("").replace(/-+$/g, "");

    if (!s) return suffix;
    return `${s}-${suffix}`;
}
