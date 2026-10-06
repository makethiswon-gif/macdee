// 네이버 블로그 글을 맥디 변호사 블로그로 옮기기 위한 읽기 도구(2026-10-06).
// - 전체 글 목록: RSS 는 최근 30~50편만 주므로 PostTitleListAsync(30편씩 쪽 넘김)로 끝까지 읽는다.
// - 본문: 모바일 페이지의 스마트에디터(SE3) 구성 요소를 순서대로 읽어 텍스트만 마크다운으로 만든다.
//   사진·동영상·지도·스티커·링크 카드는 버리고, 소제목은 ##, 인용은 >, 목록은 -, 표는 줄 단위 항목으로 옮긴다.
import * as cheerio from "cheerio";

export interface NaverPostSummary {
    logNo: string;
    title: string;
    /** ISO 시각(한국 시간 오전 9시 기준). 상대 표기("3시간 전")는 지금으로 둔다. */
    date: string | null;
    categoryNo: number;
    categoryName: string;
}
export interface NaverPostText {
    url: string;
    title: string;
    /** 마크다운 본문(텍스트만). */
    body: string;
    /** 원문 글자 수(공백 제외) — 윤문이 내용을 줄이지 않았는지 비교할 때 쓴다. */
    chars: number;
}

const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36";
const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
type Fetch = typeof fetch;

/** "lawandlow", "https://blog.naver.com/lawandlow", "https://m.blog.naver.com/lawandlow/2234…" → "lawandlow". */
export function parseBlogId(input: string): string | null {
    const value = (input || "").trim();
    const fromUrl = value.match(/blog\.naver\.com\/(?:PostList\.naver\?blogId=|PostView\.naver\?blogId=)?([A-Za-z0-9_-]{2,40})/);
    const id = fromUrl ? fromUrl[1] : value;
    return /^[A-Za-z0-9_-]{2,40}$/.test(id) && !/^(PostView|PostList)$/i.test(id) ? id : null;
}

export const naverPostUrl = (blogId: string, logNo: string) => `https://blog.naver.com/${blogId}/${logNo}`;

/** "2026. 10. 1." → 그날 09:00 KST, "3시간 전"·"방금 전" → now, "어제" → 하루 전. 모르면 null. */
export function parseNaverDate(value: string, now = new Date()): string | null {
    const text = (value || "").trim();
    const m = text.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0)).toISOString(); // 09:00 KST
    if (/방금|분\s*전|시간\s*전/.test(text)) return now.toISOString();
    if (/어제/.test(text)) return new Date(now.getTime() - 86_400_000).toISOString();
    const days = text.match(/(\d+)\s*일\s*전/);
    if (days) return new Date(now.getTime() - Number(days[1]) * 86_400_000).toISOString();
    return null;
}

async function readCategoryNames(blogId: string, fetchImpl: Fetch): Promise<Record<number, string>> {
    try {
        const r = await fetchImpl(`https://blog.naver.com/WidgetListAsync.naver?blogId=${blogId}&listNumVisitor=5&isVisitorOpen=false&isBuddyOpen=false&selectCategoryNo=&skinId=0&skinType=C&isCategoryOpen=true&isEnglish=true&listNumComment=5&areaCode=11&weatherType=0&currencySign=ALL&enableWidgetKeys=category`,
            { headers: { "User-Agent": DESKTOP_UA, Referer: `https://blog.naver.com/${blogId}` }, signal: AbortSignal.timeout(15_000) });
        const text = await r.text();
        const names: Record<number, string> = {};
        for (const m of text.matchAll(/categoryNo=(\d+)[^>]*>\s*([^<]{1,60})</g)) {
            const no = Number(m[1]), name = m[2].replace(/\s+/g, " ").trim();
            if (name && !names[no]) names[no] = name;
        }
        return names;
    } catch {
        return {}; // 이름을 못 읽어도 목록은 쓴다
    }
}

/** 블로그의 모든 글(공개 목록 기준). 쪽마다 짧게 쉬어 네이버에 부담을 주지 않는다. */
export async function listNaverPosts(blogId: string, options: { fetchImpl?: Fetch; delayMs?: number; maxPages?: number; now?: Date } = {}): Promise<{ posts: NaverPostSummary[]; total: number; categories: Record<number, string> }> {
    const fetchImpl = options.fetchImpl ?? fetch, delayMs = options.delayMs ?? 250, maxPages = options.maxPages ?? 200;
    const categories = await readCategoryNames(blogId, fetchImpl);
    const posts: NaverPostSummary[] = [];
    let total = 0;
    for (let page = 1; page <= maxPages; page++) {
        const r = await fetchImpl(`https://blog.naver.com/PostTitleListAsync.naver?blogId=${blogId}&viewdate=&currentPage=${page}&categoryNo=0&parentCategoryNo=&countPerPage=30`,
            { headers: { "User-Agent": DESKTOP_UA, Referer: `https://blog.naver.com/${blogId}` }, signal: AbortSignal.timeout(20_000) });
        if (!r.ok) throw new Error(`네이버 글 목록을 읽지 못했습니다(${r.status}).`);
        const raw = (await r.text()).replace(/\\'/g, "'");
        let data: { totalCount?: string | number; postList?: { logNo: string; title: string; addDate: string; categoryNo: string | number }[] };
        try { data = JSON.parse(raw); } catch { throw new Error("네이버 글 목록 형식을 읽지 못했습니다. 블로그 주소가 맞는지, 글이 공개인지 확인해 주세요."); }
        total = Number(data.totalCount || total || 0);
        const list = data.postList || [];
        for (const p of list) {
            let title = String(p.title || "");
            try { title = decodeURIComponent(title.replace(/\+/g, " ")); } catch { /* 그대로 */ }
            const categoryNo = Number(p.categoryNo || 0);
            posts.push({ logNo: String(p.logNo), title: title.trim(), date: parseNaverDate(p.addDate, options.now), categoryNo, categoryName: categories[categoryNo] || `카테고리 ${categoryNo}` });
        }
        if (!list.length || posts.length >= total) break;
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return { posts, total, categories };
}

const clean = (value: string) => value.replace(/[​ ﻿]/g, " ").replace(/[ \t]+/g, " ").trim();
const SKIP = ".se-image, .se-imageStrip, .se-imageGroup, .se-sticker, .se-video, .se-oglink, .se-map, .se-placesMap, .se-file, .se-oembed, .se-material, .se-schedule, .se-code, .se-audio";
// 문장이 끝나지 않은 줄(네이버식 줄바꿈)은 다음 줄과 잇는다.
const ENDS_SENTENCE = /[.!?…"'”’」』)\]:]$|[다요죠까네음함임됨]$/;

/** 스마트에디터 HTML → 텍스트 마크다운. 시험에서 HTML 만으로 부를 수 있게 따로 둔다. */
export function naverHtmlToMarkdown(html: string): { title: string; body: string } {
    const $ = cheerio.load(html);
    const title = clean($(".se-title-text").first().text()) || clean($('meta[property="og:title"]').attr("content") || "");
    const blocks: string[] = [];
    const container = $(".se-main-container").first();
    container.find(".se-component").each((_, el) => {
        const c = $(el);
        if (c.hasClass("se-documentTitle") || c.is(SKIP)) return;
        if (c.hasClass("se-horizontalLine")) { if (blocks.length && blocks[blocks.length - 1] !== "---") blocks.push("---"); return; }
        if (c.hasClass("se-sectionTitle")) { const t = clean(c.text()); if (t) blocks.push(`## ${t}`); return; }
        if (c.hasClass("se-quotation")) {
            const lines = c.find(".se-quote .se-text-paragraph, .se-quote").first().find(".se-text-paragraph").map((_, p) => clean($(p).text())).get().filter(Boolean);
            const text = lines.length ? lines : [clean(c.find(".se-quote").text() || c.text())].filter(Boolean);
            if (text.length) blocks.push(text.map((l) => `> ${l}`).join("\n"));
            return;
        }
        if (c.hasClass("se-table")) {
            c.find("tr").each((_, tr) => {
                const cells = $(tr).find("td, th").map((_, td) => clean($(td).text())).get().filter(Boolean);
                // 칸이 하나뿐인 표는 강조 상자로 쓴 것 — 목록이 아니라 문단으로 둔다
                if (cells.length === 1) blocks.push(cells[0]);
                else if (cells.length) blocks.push(`- ${cells.join(" — ")}`);
            });
            return;
        }
        // 일반 텍스트: 빈 문단은 문단 경계, 목록 항목은 "- ", 끝나지 않은 줄은 이어 붙인다.
        let paragraph = "";
        const flush = () => { if (paragraph) { blocks.push(paragraph); paragraph = ""; } };
        c.find(".se-text-paragraph").each((_, p) => {
            const t = clean($(p).text());
            if (!t) { flush(); return; }
            if ($(p).closest("li").length || $(p).hasClass("se-text-paragraph-list")) { flush(); blocks.push(`- ${t}`); return; }
            paragraph = paragraph ? `${paragraph}${ENDS_SENTENCE.test(paragraph) ? "\n\n" : " "}${t}` : t;
        });
        flush();
    });
    let body = blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    // 목록 항목끼리는 붙여 쓴다
    body = body.replace(/(^- .*)\n\n(?=- )/gm, "$1\n");
    return { title, body };
}

export async function fetchNaverPostText(blogId: string, logNo: string, options: { fetchImpl?: Fetch } = {}): Promise<NaverPostText> {
    const fetchImpl = options.fetchImpl ?? fetch;
    const r = await fetchImpl(`https://m.blog.naver.com/${blogId}/${logNo}`, { headers: { "User-Agent": MOBILE_UA }, signal: AbortSignal.timeout(25_000) });
    if (!r.ok) throw new Error(`글을 읽지 못했습니다(${r.status}).`);
    const { title, body } = naverHtmlToMarkdown(await r.text());
    if (!body) throw new Error("본문 텍스트를 찾지 못했습니다(예전 편집기이거나 비공개 글).");
    return { url: naverPostUrl(blogId, logNo), title, body, chars: body.replace(/[\s#>\-—]/g, "").length };
}

/** 법률 글이 아닌 것으로 보이는 카테고리(소개·오시는 길·면책공고·공지·인사 등). 화면의 기본 제외값. */
export const NON_LEGAL_CATEGORY = /소개|오시는\s*길|찾아오시는|면책|공지|인사말|채용|이벤트|일상/;
