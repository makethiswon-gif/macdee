import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { MEDIA_PREFIX } from "./shared";

// 관리자 편집기에서 온 본문 HTML 을 저장하기 전에 정리한다.
// 허용한 태그·속성만 남기고 나머지는 벗겨 낸다(공개 페이지에 그대로 들어가므로 서버에서 한 번 더 거른다).

const KEEP = new Set(["p", "h2", "h3", "strong", "em", "u", "s", "blockquote", "ul", "ol", "li", "a", "img", "br", "hr", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td"]);
const RENAME: Record<string, string> = { b: "strong", i: "em", h1: "h2", h4: "h3", h5: "h3", h6: "h3", strike: "s", del: "s", div: "p" };
const DROP = new Set(["script", "style", "iframe", "object", "embed", "form", "input", "button", "select", "textarea", "svg", "math", "link", "meta", "head", "title", "noscript", "template", "video", "audio", "canvas"]);
const BLOCK = new Set(["p", "h2", "h3", "blockquote", "ul", "ol", "figure", "table", "hr"]);

function safeHref(raw: string | undefined): string | null {
    const v = (raw || "").trim();
    if (!v) return null;
    if (/^(https?:\/\/|mailto:|tel:)/i.test(v)) return v.slice(0, 1000);
    // 사이트 안 링크(about.html, column/…, /junil-site/…)
    if (/^[\w가-힣./#?=&%-]+$/.test(v) && !/^\/\//.test(v)) return v.slice(0, 1000);
    return null;
}

function safeSrc(raw: string | undefined): string | null {
    const v = (raw || "").trim();
    if (v.startsWith(MEDIA_PREFIX) && /^[\w./-]+$/.test(v) && !v.includes("..")) return v;
    if (/^https:\/\/[^\s"'<>]+$/i.test(v)) return v.slice(0, 1000);
    return null;
}

export function sanitizeBody(html: string): string {
    const $ = cheerio.load(`<div id="__root">${html || ""}</div>`, null, false);
    const root = $("#__root");

    const walk = (node: AnyNode) => {
        if (node.type === "comment" || node.type === "directive" || node.type === "cdata") {
            $(node).remove();
            return;
        }
        if (node.type !== "tag" && node.type !== "script" && node.type !== "style") return;
        const el = node as Element;
        let name = el.name.toLowerCase();
        if (DROP.has(name) || node.type !== "tag") {
            $(el).remove();
            return;
        }
        for (const child of [...el.children]) walk(child);

        if (RENAME[name]) {
            name = RENAME[name];
            el.name = name;
        }
        if (!KEEP.has(name)) {
            // 모르는 태그는 내용만 남긴다(span, font, section …)
            $(el).replaceWith($(el).contents());
            return;
        }
        const attribs = el.attribs || {};
        const next: Record<string, string> = {};
        if (name === "a") {
            const href = safeHref(attribs.href);
            if (!href) {
                $(el).replaceWith($(el).contents());
                return;
            }
            next.href = href;
            if (/^https?:\/\//i.test(href)) {
                next.target = "_blank";
                next.rel = "noopener noreferrer";
            }
        } else if (name === "img") {
            const src = safeSrc(attribs.src);
            if (!src) {
                $(el).remove();
                return;
            }
            next.src = src;
            next.alt = (attribs.alt || "").slice(0, 200);
            next.loading = "lazy";
        } else if ((name === "td" || name === "th") && /^\d{1,2}$/.test(attribs.colspan || "")) {
            next.colspan = attribs.colspan;
        }
        el.attribs = next;
    };
    for (const child of [...root.contents().toArray()]) walk(child);

    // 문단 안에 문단·제목이 들어간 경우(div → p 로 바꾸며 생김)는 바깥 문단을 푼다.
    root.find("p").each((_, p) => {
        if ($(p).children().toArray().some((c) => c.type === "tag" && BLOCK.has((c as Element).name))) $(p).replaceWith($(p).contents());
    });
    // 맨 바깥에 떠 있는 글자·인라인 요소는 문단으로 감싼다.
    for (const node of root.contents().toArray()) {
        if (node.type === "text") {
            if ($(node).text().trim()) $(node).wrap("<p></p>");
            else $(node).remove();
        } else if (node.type === "tag" && !BLOCK.has((node as Element).name)) {
            if ((node as Element).name === "img") $(node).wrap("<figure></figure>");
            else if ((node as Element).name === "br") $(node).remove();
            else $(node).wrap("<p></p>");
        }
    }
    // 비어 있는 문단·제목 지우기
    root.find("p,h2,h3,blockquote,li").each((_, el) => {
        if (!$(el).text().trim() && !$(el).find("img").length) $(el).remove();
    });
    return (root.html() || "").trim();
}

/** 본문에서 글자만 뽑는다(요약 자동 채우기·검색용). */
export function bodyText(html: string): string {
    // 문단·제목 사이가 붙지 않게 닫는 태그 뒤에 빈칸을 넣고 글자만 뽑는다.
    const spaced = (html || "").replace(/<\/(p|h2|h3|li|blockquote|figcaption|td|th|tr)>|<br\s*\/?>/gi, "$& ");
    return cheerio.load(`<div>${spaced}</div>`, null, false).text().replace(/\s+/g, " ").trim();
}
