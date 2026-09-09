import { contactActions } from "./blog-images/contact-details";

// Clipboard HTML has no shared stylesheet. Repeat typography on each block and
// use one explicit empty line for spacing, even if an editor drops CSS margins.
const TYPE = "font-family:'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif;letter-spacing:0;text-align:left;word-break:keep-all;overflow-wrap:anywhere;";
const BODY = `${TYPE}margin:0;padding:0;font-size:17px;line-height:1.85;font-weight:400;color:#292d32;`;
const HIGHLIGHT = "#fff1b8";
const headingStyle = (level: number) => `${TYPE}margin:0;padding:0;font-weight:700;line-height:1.5;color:#18282b;`
    + `font-size:${level === 1 ? 26 : level === 2 ? 22 : level === 3 ? 19 : 18}px;`
    + (level === 2 ? "border-left:3px solid #28635f;padding-left:12px;" : "");

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function emphasis(s: string): string {
    return escapeHtml(s)
        .replace(/==(.+?)==/g, `<span style="background-color:${HIGHLIGHT};color:#292d32;">$1</span>`)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, '<u style="text-decoration-thickness:1px;text-underline-offset:3px;">$1</u>');
}

function inline(s: string): string {
    const links = /\[([^\]\n]+)\]\(tel:(\+?[\d .-]+)\)/g;
    let html = "", offset = 0;
    for (const match of s.matchAll(links)) {
        const contact = contactActions({ phone: match[2], website: "" })[0];
        if (!contact) continue;
        html += emphasis(s.slice(offset, match.index));
        html += `<a href="${contact.href}" style="color:#1663c7;text-decoration:underline;text-underline-offset:3px;">${emphasis(match[1])}</a>`;
        offset = match.index + match[0].length;
    }
    return html + emphasis(s.slice(offset));
}

type Block =
    | { kind: "heading"; text: string; level: number }
    | { kind: "para"; lines: string[] }
    | { kind: "list"; ordered: boolean; items: string[]; start: number }
    | { kind: "rule" };

function parse(body: string): Block[] {
    const blocks: Block[] = [];
    let para: string[] = [];
    let adjacentList = false;
    const flushPara = () => {
        if (para.length) {
            blocks.push({ kind: "para", lines: para });
            para = [];
        }
    };

    for (const raw of body.replace(/\r\n?/g, "\n").split("\n")) {
        const line = raw.trim();
        if (!line) {
            flushPara(); adjacentList = false;
            continue;
        }
        if (/^---+$/.test(line)) {
            flushPara(); adjacentList = false;
            blocks.push({ kind: "rule" });
            continue;
        }
        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            flushPara(); adjacentList = false;
            blocks.push({ kind: "heading", text: heading[2].replace(/\s+#+$/, ""), level: Math.max(2, heading[1].length) });
            continue;
        }
        const ordered = line.match(/^(\d{1,9})\.\s+(.*)$/);
        const bullet = line.match(/^[-·*]\s+(.*)$/);
        if (ordered || bullet) {
            flushPara();
            const isOrdered = Boolean(ordered), item = ordered ? ordered[2] : bullet![1];
            const last = blocks[blocks.length - 1];
            if (adjacentList && last?.kind === "list" && last.ordered === isOrdered) last.items.push(item);
            else blocks.push({ kind: "list", ordered: isOrdered, items: [item], start: ordered ? Number(ordered[1]) : 1 });
            adjacentList = true;
            continue;
        }
        para.push(line); adjacentList = false;
    }
    flushPara();
    return blocks;
}

export interface NaverImage {
    type: string;
    url: string;
    altText?: string;
    afterText?: string;
}

const attribute = (s: string) => escapeHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const normalized = (s: string) => s.trim().replace(/^(?:#{1,6}|\d+\.|[-·*])\s+/, "").replace(/\s+/g, " ");
const blockLines = (block: Block): string[] => block.kind === "para" ? [...block.lines, block.lines.join("\n")]
    : block.kind === "list" ? block.items : block.kind === "heading" ? [block.text] : [];

/** Formats presentation only: never rewrites legal claims or adds SEO keywords. */
export function toNaverHtml(body: string, title?: string, images: NaverImage[] = []): string {
    const out: string[] = [];
    const blocks = parse(body);
    // Do not print an AI-echoed title twice; all other manuscript text is retained.
    if (title?.trim() && blocks[0]?.kind === "heading" && normalized(blocks[0].text) === normalized(title)) blocks.shift();
    const safeImages = images.filter((image) => {
        try {
            const url = new URL(image.url);
            return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
        } catch { return false; }
    });
    type LayoutKind = Block["kind"] | "title" | "image" | "contact" | "footer";
    let previous: LayoutKind | undefined;
    const emit = (kind: LayoutKind, html: string) => {
        if (previous) {
            const space = previous === "heading" ? 12
                : kind === "contact" && previous === "image" ? 12
                : kind === "heading" ? 32
                : kind === "image" || previous === "image" || previous === "title" ? 24
                : kind === "footer" || previous === "rule" ? 12 : 18;
            out.push(`<p style="${TYPE}margin:0;padding:0;font-size:${space}px;line-height:1;"><br></p>`);
        }
        out.push(html); previous = kind;
    };
    const insertImage = (image: NaverImage) => {
        emit("image", `<p style="margin:0;padding:0;line-height:0;"><img src="${attribute(image.url)}" alt="${attribute(image.altText || "")}" style="display:block;width:100%;max-width:100%;height:auto;border:0;"></p>`);
    };
    const contacts = safeImages.filter((image) => image.type === "contact");
    const contactIndex = blocks.findIndex((block) => block.kind === "para" && block.lines.length === 1
        && /^\[전화 상담 · 대표번호 [^\]]+\]\(tel:\+?[\d .-]+\)$/.test(block.lines[0]));
    const footerIndex = blocks.findIndex((block, index) => block.kind === "rule"
        && blocks[index + 1]?.kind === "para" && blockLines(blocks[index + 1])[0]?.startsWith("**기준일**"));
    const contactAt = contactIndex >= 0 ? contactIndex : footerIndex >= 0 ? footerIndex : blocks.length;
    const contentEnd = Math.max(1, contactAt);
    const anchors = new Map<number, NaverImage[]>();
    safeImages.filter((image) => !["thumbnail", "contact"].includes(image.type)).forEach((image) => {
        let index = image.afterText ? blocks.findIndex((block) => blockLines(block).some((line) => normalized(line) === normalized(image.afterText!))) : -1;
        if (index < 0) index = Math.min(contentEnd - 1, Math.floor(contentEnd * (image.type === "info" ? 0.75 : 0.4)));
        while (index < blocks.length - 1 && blocks[index].kind === "heading") index++;
        anchors.set(index, [...(anchors.get(index) || []), image]);
    });

    if (title?.trim()) emit("title", `<h1 style="${headingStyle(1)}">${inline(title.trim())}</h1>`);
    safeImages.filter((image) => image.type === "thumbnail").forEach(insertImage);

    for (const [index, block] of blocks.entries()) {
        if (index === contactAt) contacts.forEach(insertImage);
        switch (block.kind) {
            case "heading":
                emit("heading", `<h${block.level} style="${headingStyle(block.level)}">${inline(block.text)}</h${block.level}>`);
                break;
            case "para": {
                const footer = footerIndex >= 0 && index > footerIndex
                    && block.lines.every((line) => /^\*\*(?:기준일|작성)\*\*/.test(line));
                const kind = index === contactIndex ? "contact" : footer ? "footer" : "para";
                emit(kind, `<p style="${BODY}${footer ? "font-size:14px;line-height:1.7;color:#62686d;" : ""}">${block.lines.map(inline).join("<br>")}</p>`);
                break;
            }
            case "list": {
                const tag = block.ordered ? "ol" : "ul";
                emit("list", `<${tag}${block.ordered ? ` start="${block.start}"` : ""} style="${BODY}padding-left:28px;list-style-type:${block.ordered ? "decimal" : "disc"};">`
                    + block.items.map((item, i) => `<li style="${BODY}${i ? "padding-top:8px;" : ""}">${inline(item)}</li>`).join("") + `</${tag}>`);
                break;
            }
            case "rule":
                emit("rule", '<hr style="margin:0;padding:0;border:0;border-top:1px solid #dce2e2;">');
                break;
        }
        anchors.get(index)?.forEach(insertImage);
    }
    if (!blocks.length) anchors.get(0)?.forEach(insertImage);
    if (contactAt === blocks.length) contacts.forEach(insertImage);

    return out.length ? `<div lang="ko" style="${BODY}background-color:#ffffff;max-width:740px;">${out.join("\n")}</div>` : "";
}
