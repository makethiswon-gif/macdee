// AI가 ```json {title, body, ...} 형태로 낸 출력을 견고하게 파싱.
// 문자열 내부의 raw 줄바꿈/탭을 이스케이프해 JSON.parse 성공률을 높이고,
// 그래도 실패하면 정규식으로 title/body를 추출한다.

export interface AiContent {
    title?: string;
    body?: string;
    meta_description?: string;
    keywords?: string[];
    faq?: unknown;
    schema_markup?: unknown;
}

/** 문자열 내부의 제어문자(줄바꿈/탭)를 이스케이프해 깨진 JSON을 복구 */
function repairJson(raw: string): string {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s === -1 || e === -1 || e <= s) return raw;
    const j = raw.substring(s, e + 1).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    let out = "";
    let inStr = false;
    let esc = false;
    for (const ch of j) {
        if (esc) { out += ch; esc = false; continue; }
        if (ch === "\\" && inStr) { out += ch; esc = true; continue; }
        if (ch === '"') { inStr = !inStr; out += ch; continue; }
        if (inStr && ch === "\n") { out += "\\n"; continue; }
        if (inStr && ch === "\r") continue;
        if (inStr && ch === "\t") { out += "\\t"; continue; }
        out += ch;
    }
    return out.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
}

function unescape(s: string): string {
    return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\\\\/g, "\\");
}

/**
 * AI 출력 문자열에서 구조화 콘텐츠를 추출. 실패하면 null.
 * 4단계: 직접 파싱 → 코드블록 제거 후 파싱 → 복구 후 파싱 → 정규식 추출.
 */
export function parseAiContent(raw: string): AiContent | null {
    if (!raw || typeof raw !== "string") return null;

    // 1. 그대로 파싱
    try { return JSON.parse(raw); } catch { /* next */ }

    // 2. 코드블록 래퍼 제거 후
    const stripped = raw.replace(/^[\s]*```(?:json)?\s*\n?/i, "").replace(/\n?\s*```[\s]*$/, "").trim();
    try { return JSON.parse(stripped); } catch { /* next */ }

    // 3. 문자열 내부 줄바꿈 복구 후
    try { return JSON.parse(repairJson(raw)); } catch { /* next */ }

    // 4. 정규식 fallback
    const title = raw.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
    let body: string | undefined;
    const bodyStart = raw.match(/"body"\s*:\s*"/);
    if (bodyStart && bodyStart.index !== undefined) {
        let b = raw.slice(bodyStart.index + bodyStart[0].length);
        // 다음 JSON 필드 또는 닫는 중괄호/코드블록 앞에서 자른다
        const cut = b.search(/"\s*,\s*"(?:meta_description|keywords|faq|schema_markup|tags)"\s*:|"\s*\}\s*(?:```)?\s*$/);
        if (cut !== -1) b = b.slice(0, cut);
        // 끝에 남은 닫는 따옴표 제거
        b = b.replace(/"\s*$/, "");
        body = unescape(b).trim();
    }
    if (title || body) return { title: title ? unescape(title) : undefined, body };
    return null;
}

/**
 * 본문 문자열이 아직 JSON/코드블록 형태로 남아있으면 그 안의 body만 추출.
 * 정상 마크다운이면 그대로 반환. (표시 시점 방어용)
 */
export function cleanBody(body: string): string {
    if (!body) return body;
    const t = body.trimStart();
    if (t.startsWith("```") || t.startsWith("{")) {
        const parsed = parseAiContent(body);
        if (parsed?.body && parsed.body.trim()) return parsed.body;
    }
    return body;
}
