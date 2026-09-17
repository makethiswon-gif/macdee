// ─── 반복 지문(指紋) 방지 ───
// 실측(2026-09-17, 46편): 프롬프트의 예시 문장이 그대로 복제되어
// "솔직히 말씀드리면" 70%, "~계신다면 방향은 맞습니다" 62%, "여기까지는 ~입니다" 41%로 8개 블로그에 반복됐다.
// 추가 모델 호출 없이, 이미 읽어 둔 최근 원고에서 '이미 쓴 것'을 뽑아 다음 글에서 피하게 한다.

/** 어느 글에서든 쓰지 않는 상투 구절. 자동 검수(reviewBlogEditorial)도 같은 목록을 쓴다. */
export const FINGERPRINT_PHRASES: Array<{ label: string; pattern: RegExp }> = [
    { label: "솔직히 말씀드리면", pattern: /솔직히\s*(?:말씀|말하)/ },
    { label: "방향은 맞습니다/정확합니다", pattern: /(?:방향|순서)[은는이가]\s*(?:맞습니다|정확합니다)/ },
    { label: "여기까지는 ~입니다", pattern: /여기까지[는가]\s/ },
    { label: "결론부터/답부터 말씀드리면", pattern: /(?:결론|답)부터\s*(?:말씀|드리|말하)/ },
    { label: "생각보다 빨리/짧습니다", pattern: /생각보다\s*(?:빨리|짧)/ },
    { label: "가상의 예시입니다(고정 고지문)", pattern: /(?:이해를 돕기 위한|실제 사건이 아니라)[^.\n]{0,20}가상/ },
];

const stripFooter = (body: string) => body.split(/\n---+[ \t]*\r?\n/)[0].replace(/^\[전화 상담[^\n]*$/gm, "").trimEnd();
const firstSentence = (text: string) => (text.replace(/[*_=#>]/g, "").trim().match(/^[^.?!\n]{8,80}[.?!]?/) || [""])[0].trim();

export interface RecentPost { title?: string | null; body?: string | null }

/** 최근 글에서 이미 쓴 마무리·소제목·제목 어미를 프롬프트용 지시문으로 만든다. 없으면 빈 문자열. */
export function repetitionAvoidDirective(recent: RecentPost[], take = 6): string {
    const closers: string[] = [], lastHeadings: string[] = [], titleEndings: string[] = [];
    for (const post of recent.slice(0, take)) {
        const core = stripFooter(post.body || "");
        if (core) {
            const paragraphs = core.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !/^#{1,6}\s/.test(p) && !/^\s*(?:[-*]|\d+\.)\s/.test(p));
            const closer = firstSentence(paragraphs[paragraphs.length - 1] || "");
            if (closer) closers.push(closer);
            const headings = [...core.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].replace(/['"‘’“”]/g, "").trim());
            if (headings.length) lastHeadings.push(headings[headings.length - 1]);
        }
        const title = (post.title || "").replace(/[?？!.\s]+$/g, "");
        if (title.length >= 4) titleEndings.push(title.slice(-4));
    }
    const uniq = (list: string[]) => [...new Set(list)].slice(0, take);
    const lines: string[] = [];
    if (closers.length) lines.push(`- 최근 글의 마지막 문단 첫 문장: ${uniq(closers).map((c) => `"${c}"`).join(" / ")}`);
    if (lastHeadings.length) lines.push(`- 최근 글의 마지막 소제목: ${uniq(lastHeadings).map((h) => `"${h}"`).join(" / ")}`);
    if (titleEndings.length) lines.push(`- 최근 제목의 끝말: ${uniq(titleEndings).map((t) => `"~${t}"`).join(" / ")}`);
    if (!lines.length) return "";
    return `[이 블로그가 최근에 이미 쓴 것 — 같은 표현, 같은 문형, 같은 끝맺음을 되풀이하지 마세요]
${lines.join("\n")}
같은 블로그의 글이 매번 같은 말로 끝나면 독자는 기계가 썼다고 느낍니다. 위와 다른 말과 다른 방식으로 쓰세요. 제목의 끝말도 위와 겹치지 않게 합니다.`;
}
