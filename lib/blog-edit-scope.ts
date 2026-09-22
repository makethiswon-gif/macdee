// 부분 수정의 범위 계산 — 원고를 통째로 보내지 않고 고칠 구간과 앞뒤 문맥만 보낸다.
// 서버가 조립하는 꼬리(--- **기준일** … 전화 링크)는 편집 대상에서 뺀다.

export type EditScopeKind = "title" | "intro" | "section" | "paragraph" | "closing";
export interface EditScope { kind: EditScopeKind; index?: number }
export interface EditScopeOption { kind: EditScopeKind; index?: number; label: string; preview: string }
export interface EditTarget { label: string; start: number; end: number; target: string; before: string; after: string }

const FOOTER = /\n---+[ \t]*\r?\n[ \t]*\*\*기준일\*\*[\s\S]*$/;
export function splitFooter(body: string): { main: string; footer: string } {
    const m = body.match(FOOTER);
    if (!m || m.index == null) return { main: body, footer: "" };
    return { main: body.slice(0, m.index), footer: body.slice(m.index) };
}

interface Block { start: number; end: number; text: string; heading: boolean }
function blocks(main: string): Block[] {
    const out: Block[] = [];
    const re = /[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g; // 빈 줄로 나뉜 문단
    let m: RegExpExecArray | null;
    while ((m = re.exec(main))) out.push({ start: m.index, end: m.index + m[0].length, text: m[0], heading: /^#{2,3}\s/.test(m[0]) });
    return out;
}

/** 화면의 범위 선택 목록. 도입부 / 각 소제목 섹션 / 마지막 문단 / 문단 n. */
export function editScopeOptions(body: string): EditScopeOption[] {
    const { main } = splitFooter(body);
    const bs = blocks(main);
    const options: EditScopeOption[] = [{ kind: "title", label: "제목", preview: "" }];
    const firstHeading = bs.findIndex((b) => b.heading);
    const intro = bs.slice(0, firstHeading === -1 ? bs.length : firstHeading).filter((b) => !b.heading);
    if (intro.length) options.push({ kind: "intro", label: "도입부 (첫 소제목 전)", preview: intro[0].text.slice(0, 40) });
    let section = 0;
    for (const b of bs) if (b.heading) options.push({ kind: "section", index: section++, label: `소제목: ${b.text.replace(/^#+\s*/, "").slice(0, 30)}`, preview: "" });
    const closing = [...bs].reverse().find((b) => !b.heading);
    if (closing) options.push({ kind: "closing", label: "마무리 문단", preview: closing.text.slice(0, 40) });
    bs.filter((b) => !b.heading).forEach((b, i) => options.push({ kind: "paragraph", index: i, label: `문단 ${i + 1}`, preview: b.text.slice(0, 40) }));
    return options;
}

/** 범위 → 실제 문자 구간과 앞뒤 문맥. 제목은 본문이 아니라 별도로 다룬다. */
export function resolveEditScope(body: string, scope: EditScope, context = 600): EditTarget | null {
    const { main } = splitFooter(body);
    const bs = blocks(main);
    let start = -1, end = -1, label = "";
    if (scope.kind === "intro") {
        const firstHeading = bs.findIndex((b) => b.heading);
        const intro = bs.slice(0, firstHeading === -1 ? bs.length : firstHeading).filter((b) => !b.heading);
        if (!intro.length) return null;
        start = intro[0].start; end = intro[intro.length - 1].end; label = "도입부";
    } else if (scope.kind === "section") {
        const headings = bs.map((b, i) => (b.heading ? i : -1)).filter((i) => i >= 0);
        const at = headings[scope.index ?? -1];
        if (at == null) return null;
        const next = headings[(scope.index ?? 0) + 1];
        const last = next == null ? bs[bs.length - 1] : bs[next - 1];
        start = bs[at].start; end = last.end; label = `소제목 "${bs[at].text.replace(/^#+\s*/, "")}" 구간`;
    } else if (scope.kind === "closing") {
        const closing = [...bs].reverse().find((b) => !b.heading);
        if (!closing) return null;
        start = closing.start; end = closing.end; label = "마무리 문단";
    } else if (scope.kind === "paragraph") {
        const paras = bs.filter((b) => !b.heading);
        const p = paras[scope.index ?? -1];
        if (!p) return null;
        start = p.start; end = p.end; label = `문단 ${(scope.index ?? 0) + 1}`;
    } else return null;
    return { label, start, end, target: main.slice(start, end), before: main.slice(Math.max(0, start - context), start).trim(), after: main.slice(end, end + context).trim() };
}

/** 구간을 새 텍스트로 바꾼 본문. 꼬리는 그대로. */
export function applyEdit(body: string, target: EditTarget, replacement: string): string {
    const { main, footer } = splitFooter(body);
    return main.slice(0, target.start) + replacement.trim() + main.slice(target.end) + footer;
}
