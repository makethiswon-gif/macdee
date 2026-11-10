import shellJson from "./shell.json";
import { BOARDS, BOARD_KEYS, kdate, type BoardKey, type Post, type PostMeta } from "./shared";

// 공개 페이지(목록·글)를 완성된 HTML 문자열로 만든다.
// 틀은 build.py 가 정적 페이지와 같은 함수(head·header·FOOT…)로 만든 shell.json — 그래서 머리 띠·바닥·스타일이 한 벌이다.
// 게시판마다(법률칼럼·성공사례·준일소식) 틀과 문구가 따로 있다.

const BASE = "/junil-site/";
type Lawyer = { name: string; role: string; img: string; short: string };
const LAWYERS = shellJson.lawyers as Record<string, Lawyer>;
export const LAWYER_OPTIONS = Object.entries(LAWYERS).map(([id, l]) => ({ id: Number(id), name: l.name, role: l.role }));
export const BOARD_CATEGORIES = Object.fromEntries(BOARD_KEYS.map((key) => [key, shellJson.boards[key].categories])) as Record<BoardKey, string[]>;

/** 틀 안의 상대 경로(kit.css, img/…, about.html)를 /junil-site/ 기준 절대 경로로 바꾼다. */
function absolutize(html: string): string {
    return html
        .replace(/\b(href|src)="(?!https?:|\/|#|tel:|mailto:|data:|javascript:|%%)/g, `$1="${BASE}`)
        .replace(/url\((?!["']?(?:https?:|\/|data:))/g, `url(${BASE}`);
}

type Labels = { bylinePrefix: string; bylineRole: boolean; bylineNone: string; summary: string; newer: string; older: string; schema: string; leadThumb: boolean };
type Templates = {
    path: string; list: string; post: string; missing: string; card: string; relCard: string; thumb: string; thumbNone: string;
    by: string; byNone: string; who: string; related: string; relatedInside: boolean; empty: string;
    galleryWrap: string; galleryItem: string; coverFallback: string; categories: string[]; labels: Labels;
};
const STRING_KEYS = ["list", "post", "missing", "card", "relCard", "thumb", "thumbNone", "by", "byNone", "who", "related", "empty", "galleryWrap", "galleryItem"] as const;

const T = Object.fromEntries(BOARD_KEYS.map((key) => {
    const raw = shellJson.boards[key] as Templates;
    const t = { ...raw };
    // %%토큰%% 으로 시작하는 주소(이미지 등)는 값이 이미 절대 경로라 건드리지 않는다.
    for (const k of STRING_KEYS) t[k] = absolutize(raw[k]);
    t.coverFallback = raw.coverFallback ? BASE + raw.coverFallback : "";
    return [key, t];
})) as Record<BoardKey, Templates>;
const BANNER = shellJson.banner;

export function esc(s: string): string {
    return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** %%이름%% 자리를 채운다. 값은 이미 안전한 HTML 이어야 한다(글자는 esc 로 감싸 넘길 것). */
function fill(template: string, values: Record<string, string>): string {
    return template.replace(/%%([A-Z_]+)%%/g, (_, key: string) => values[key] ?? "");
}

const chip = (category: string) => (category ? `<span class="chip">${esc(category)}</span>` : "<span></span>");
/** 옮겨 온 글의 이미지는 사이트 안 경로(/junil-site/img/…), 새로 올린 것은 /junil-site/media/… — 둘 다 절대 경로다. */
const lawyerImg = (l: Lawyer) => esc(BASE + l.img);

function card(board: BoardKey, p: PostMeta, { reveal = false, related = false } = {}): string {
    const t = T[board];
    const lawyer = p.lawyerIds?.[0] ? LAWYERS[String(p.lawyerIds[0])] : null;
    const cover = p.cover || "";
    return fill(related && t.relCard ? t.relCard : t.card, {
        SLUG: encodeURIComponent(p.slug),
        CAT: esc(p.category),
        CATTEXT: p.category ? ` · ${esc(p.category)}` : "",
        LID: (p.lawyerIds ?? []).join(" "),
        Q: esc(p.title.toLowerCase()),
        RV: reveal ? " data-rv" : "",
        THUMB: cover ? fill(t.thumb, { SRC: esc(cover) }) : fill(t.thumbNone, { CAT: esc(p.category || BOARDS[board].label) }),
        COVER: esc(cover || t.coverFallback),
        CHIP: chip(p.category),
        DATE: kdate(p.date),
        TITLE: esc(p.title),
        SUMMARY: esc(p.summary),
        BY: lawyer ? fill(t.by, { IMG: lawyerImg(lawyer), NAME: esc(lawyer.name) }) : t.byNone,
    });
}

export function renderList(board: BoardKey, posts: PostMeta[]): string {
    const t = T[board];
    const counts = new Map<string, number>();
    for (const p of posts) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    const filters =
        `<button data-f="all" class="on">전체<b>${posts.length}</b></button>` +
        t.categories.filter((c) => counts.has(c)).map((c) => `<button data-f="${esc(c)}">${esc(c)}<b>${counts.get(c)}</b></button>`).join("");
    return fill(t.list, {
        COUNT: String(posts.length),
        FILTERS: filters,
        CARDS: posts.map((p) => card(board, p)).join(""),
        EMPTY: posts.length ? "" : t.empty,
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
    const board = post.board;
    const t = T[board];
    const L = t.labels;
    const lawyers = (post.lawyerIds ?? []).map((id) => ({ id, ...LAWYERS[String(id)] })).filter((l) => l.name);
    const first = lawyers[0];
    const url = `${origin}${BASE}${t.path}/${encodeURIComponent(post.slug)}`;
    const image = post.cover ? origin + post.cover : `${origin}${BASE}img/og.jpg`;
    const desc = post.summary || post.title;
    const href = (p: PostMeta) => `${BASE}${t.path}/${encodeURIComponent(p.slug)}`;

    const at = siblings.findIndex((p) => p.id === post.id);
    const newer = at > 0 ? siblings[at - 1] : null;
    const older = at !== -1 && at + 1 < siblings.length ? siblings[at + 1] : null;
    const link = (p: PostMeta, label: string) => `<a href="${href(p)}"><small>${label}</small><b>${esc(p.title)}</b></a>`;
    const prevNext = L.newer && (newer || older) ? `<div class="pn2">${newer ? link(newer, L.newer) : "<span></span>"}${older ? link(older, L.older) : "<span></span>"}</div>` : "";

    const others = siblings.filter((p) => p.id !== post.id);
    const picks = [...others.filter((p) => post.category && p.category === post.category), ...others.filter((p) => !post.category || p.category !== post.category)].slice(0, 3);
    const related = picks.length ? fill(t.related, { CARDS: picks.map((p) => card(board, p, { reveal: !t.relatedInside, related: true })).join("") }) : "";

    const names = lawyers.map((l) => `<a href="${BASE}lawyer-${l.id}.html">${esc(l.name)}${L.bylineRole ? ` ${esc(l.role)}` : ""}</a>`).join(" · ");
    const gallery = t.galleryItem && post.images?.length
        ? fill(t.galleryWrap, { ITEMS: post.images.map((src, i) => fill(t.galleryItem, { SRC: esc(src), N: String(i + 1) })).join("") })
        : "";
    // 본문 이미지는 눌러서 크게 볼 수 있게(site.js 의 [data-zoom])
    const body = absolutize(post.body).replace(/<figure><img src="([^"]+)"/g, '<figure data-zoom="$1"><img src="$1"');

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": L.schema,
        headline: post.title,
        description: desc,
        image: [image],
        datePublished: `${post.date}T09:00:00+09:00`,
        dateModified: post.updatedAt,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: lawyers.length
            ? lawyers.map((l) => ({ "@type": "Person", name: `${l.name} ${l.role}`, url: `${origin}${BASE}lawyer-${l.id}.html` }))
            : { "@type": "Organization", name: "법률사무소 준일", url: `${origin}${BASE}` },
        publisher: { "@type": "Organization", name: "법률사무소 준일", logo: { "@type": "ImageObject", url: `${origin}${BASE}img/og.jpg` } },
        ...(post.category ? { articleSection: post.category } : {}),
    };

    let html = fill(t.post, {
        TITLE: esc(post.title),
        DESC: esc(desc.slice(0, 150)),
        BANNER: preview ? fill(BANNER, { STATE: esc(preview) }) : "",
        CRUMB_CAT: post.category && board !== "news" ? ` / ${esc(post.category)}` : "",
        CHIP: post.category ? `<span class="chip" style="margin-top:20px">${esc(post.category)}</span>` : "",
        DATE: kdate(post.date),
        BYLINE: names ? `<span>${L.bylinePrefix} ${names}</span>` : L.bylineNone,
        LEAD: L.leadThumb && post.thumb ? `<figure class="lead"><img src="${esc(post.thumb)}" alt="${esc(post.title)}"></figure>` : "",
        GALLERY: gallery,
        SUMMARY: L.summary && post.summary ? `<div class="summ" data-rv><small>${L.summary}</small><p>${esc(post.summary)}</p></div>` : "",
        BODY: body,
        PREVNEXT: prevNext,
        WHO: first && t.who ? fill(t.who, { ID: String(first.id), IMG: lawyerImg(first), NAME: esc(first.name), ROLE: esc(first.role), SHORT: esc(first.short) }) : "",
        RELATED_IN: t.relatedInside ? related : "",
        RELATED: t.relatedInside ? "" : related,
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

export function renderMissing(board: BoardKey): string {
    return T[board].missing;
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
