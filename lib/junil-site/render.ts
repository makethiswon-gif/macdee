import shellJson from "./shell.json";
import { kdate, type Post, type PostMeta } from "./shared";

// 공개 페이지(목록·글)를 완성된 HTML 문자열로 만든다.
// 틀은 build.py 가 정적 페이지와 같은 함수(head·header·FOOT…)로 만든 shell.json — 그래서 머리 띠·바닥·스타일이 한 벌이다.

const BASE = "/junil-site/";
type Lawyer = { name: string; role: string; img: string; short: string };
const LAWYERS = shellJson.lawyers as Record<string, Lawyer>;
export const CATEGORIES: string[] = shellJson.categories;
export const LAWYER_OPTIONS = Object.entries(LAWYERS).map(([id, l]) => ({ id: Number(id), name: l.name, role: l.role }));

/** 틀 안의 상대 경로(kit.css, img/…, about.html)를 /junil-site/ 기준 절대 경로로 바꾼다. */
function absolutize(html: string): string {
    return html
        .replace(/\b(href|src)="(?!https?:|\/|#|tel:|mailto:|data:|javascript:)/g, `$1="${BASE}`)
        .replace(/url\((?!["']?(?:https?:|\/|data:))/g, `url(${BASE}`);
}

const T = {
    list: absolutize(shellJson.list),
    post: absolutize(shellJson.post),
    missing: absolutize(shellJson.missing),
    card: absolutize(shellJson.card),
    thumb: shellJson.thumb,
    thumbNone: shellJson.thumbNone,
    by: absolutize(shellJson.by),
    byFirm: shellJson.byFirm,
    who: absolutize(shellJson.who),
    related: absolutize(shellJson.related),
    empty: shellJson.empty,
    banner: shellJson.banner,
};

export function esc(s: string): string {
    return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** %%이름%% 자리를 채운다. 값은 이미 안전한 HTML 이어야 한다(글자는 esc 로 감싸 넘길 것). */
function fill(template: string, values: Record<string, string>): string {
    return template.replace(/%%([A-Z_]+)%%/g, (_, key: string) => values[key] ?? "");
}

const chip = (category: string) => (category ? `<span class="chip">${esc(category)}</span>` : "<span></span>");

function card(p: PostMeta, reveal = false): string {
    const lawyer = p.lawyerId ? LAWYERS[String(p.lawyerId)] : null;
    return fill(T.card, {
        SLUG: encodeURIComponent(p.slug),
        CAT: esc(p.category),
        LID: p.lawyerId ? String(p.lawyerId) : "",
        Q: esc(p.title.toLowerCase()),
        RV: reveal ? " data-rv" : "",
        THUMB: p.thumb ? fill(T.thumb, { SRC: esc(p.thumb) }) : fill(T.thumbNone, { CAT: esc(p.category || "칼럼") }),
        CHIP: chip(p.category),
        DATE: kdate(p.date),
        TITLE: esc(p.title),
        SUMMARY: esc(p.summary),
        BY: lawyer ? fill(T.by, { IMG: esc(lawyer.img), NAME: esc(lawyer.name) }) : T.byFirm,
    });
}

export function renderList(posts: PostMeta[]): string {
    const counts = new Map<string, number>();
    for (const p of posts) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    const filters =
        `<button data-f="all" class="on">전체<b>${posts.length}</b></button>` +
        CATEGORIES.filter((c) => counts.has(c)).map((c) => `<button data-f="${esc(c)}">${esc(c)}<b>${counts.get(c)}</b></button>`).join("");
    return fill(T.list, {
        COUNT: String(posts.length),
        FILTERS: filters,
        CARDS: posts.map((p) => card(p)).join(""),
        EMPTY: posts.length ? "" : T.empty,
    });
}

type PostPageOptions = {
    /** 사이트 주소(https://www.makethis1.com) — 정식 주소·공유 이미지에 쓴다 */
    origin: string;
    /** 같은 게시판의 발행 글 목록(이전·다음, 함께 볼 글) */
    siblings: PostMeta[];
    /** 관리자 미리보기면 상태 문구 */
    preview?: string;
};

export function renderPost(post: Post, { origin, siblings, preview }: PostPageOptions): string {
    const lawyer = post.lawyerId ? LAWYERS[String(post.lawyerId)] : null;
    const url = `${origin}${BASE}column/${encodeURIComponent(post.slug)}`;
    const image = post.thumb ? origin + post.thumb : `${origin}${BASE}img/og.jpg`;
    const desc = post.summary || post.title;

    const at = siblings.findIndex((p) => p.id === post.id);
    const newer = at > 0 ? siblings[at - 1] : null;
    const older = at !== -1 && at + 1 < siblings.length ? siblings[at + 1] : null;
    const link = (p: PostMeta, label: string) => `<a href="${BASE}column/${encodeURIComponent(p.slug)}"><small>${label}</small><b>${esc(p.title)}</b></a>`;
    const prevNext = newer || older ? `<div class="pn2">${newer ? link(newer, "← 다음 글") : "<span></span>"}${older ? link(older, "이전 글 →") : "<span></span>"}</div>` : "";

    const others = siblings.filter((p) => p.id !== post.id);
    const related = [...others.filter((p) => post.category && p.category === post.category), ...others.filter((p) => !post.category || p.category !== post.category)].slice(0, 3);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: desc,
        image: [image],
        datePublished: `${post.date}T09:00:00+09:00`,
        dateModified: post.updatedAt,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: lawyer
            ? { "@type": "Person", name: `${lawyer.name} ${lawyer.role}`, url: `${origin}${BASE}lawyer-${post.lawyerId}.html` }
            : { "@type": "Organization", name: "법률사무소 준일", url: `${origin}${BASE}` },
        publisher: { "@type": "Organization", name: "법률사무소 준일", logo: { "@type": "ImageObject", url: `${origin}${BASE}img/og.jpg` } },
        ...(post.category ? { articleSection: post.category } : {}),
    };

    let html = fill(T.post, {
        TITLE: esc(post.title),
        DESC: esc(desc),
        BANNER: preview ? fill(T.banner, { STATE: esc(preview) }) : "",
        CRUMB_CAT: post.category ? ` / ${esc(post.category)}` : "",
        CHIP: post.category ? `<span class="chip" style="margin-top:20px">${esc(post.category)}</span>` : "",
        DATE: kdate(post.date),
        BYLINE: lawyer ? `<span>글 <a href="${BASE}lawyer-${post.lawyerId}.html">${esc(lawyer.name)} ${esc(lawyer.role)}</a></span>` : "<span>법률사무소 준일</span>",
        LEAD: post.thumb ? `<figure class="lead"><img src="${esc(post.thumb)}" alt="${esc(post.title)}"></figure>` : "",
        SUMMARY: post.summary ? `<div class="summ" data-rv><small>요약</small><p>${esc(post.summary)}</p></div>` : "",
        BODY: absolutize(post.body),
        PREVNEXT: prevNext,
        WHO: lawyer ? fill(T.who, { ID: String(post.lawyerId), IMG: esc(lawyer.img), NAME: esc(lawyer.name), ROLE: esc(lawyer.role), SHORT: esc(lawyer.short) }) : "",
        RELATED: related.length ? fill(T.related, { CARDS: related.map((p) => card(p, true)).join("") }) : "",
    });

    // 글 한 편에 맞는 공유 정보·정식 주소·구조화 데이터
    html = html
        .replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">')
        .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}">`)
        .replace(
            "</head>",
            `<link rel="canonical" href="${esc(url)}">\n<meta property="og:url" content="${esc(url)}">\n<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>\n</head>`,
        );
    return html;
}

export function renderMissing(): string {
    return T.missing;
}

export function htmlResponse(html: string, init: { status?: number; cache?: string } = {}): Response {
    return new Response(html, {
        status: init.status ?? 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            // 응답은 캐시하지 않는다(글을 고치면 바로 보이게). 느린 부분인 저장소 읽기는 store.ts 가 1시간 캐시한다.
            "Cache-Control": init.cache ?? "public, max-age=0, must-revalidate",
            // 미리보기 단계: 검색 색인 금지(정식 주소로 옮길 때 build.py 의 noindex 와 함께 뺀다)
            "X-Robots-Tag": "noindex, nofollow",
        },
    });
}
