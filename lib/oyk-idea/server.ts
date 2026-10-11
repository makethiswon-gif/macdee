import crypto from "crypto";
import { verifyAdminTokenValue } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { LIMITS, STATUS_KEYS, normalizeTags, todayKst, type Idea, type IdeaLink, type Status } from "./shared";

// ---------- 로그인 ----------
// 대표 한 사람만 쓰는 창고 — 관리자 계정(ADMIN_ID/ADMIN_PW)으로 들어오고, 컴퓨터마다 한 번 로그인하면 180일 유지.
// 이미 /admin 에 로그인한 브라우저(admin_token)도 그대로 통과.

export const IDEA_COOKIE = "oyk_idea";
export const IDEA_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
const SECRET = process.env.ADMIN_TOKEN_SECRET ?? "";
const ADMIN_ID = process.env.ADMIN_ID ?? "macdee";
const ADMIN_PW = process.env.ADMIN_PW ?? "";

const sign = (payload: string) => crypto.createHmac("sha256", SECRET).update(`oyk-idea|${payload}`).digest("hex");

export function issueIdeaToken(): string {
    const payload = `${ADMIN_ID}:${Date.now()}:${crypto.randomBytes(12).toString("hex")}`;
    return Buffer.from(`${payload}:${sign(payload)}`).toString("base64url");
}

function verifyIdeaToken(token: string | undefined): boolean {
    if (!token || !SECRET) return false;
    try {
        const decoded = Buffer.from(token, "base64url").toString();
        const cut = decoded.lastIndexOf(":");
        if (cut === -1) return false;
        const payload = decoded.slice(0, cut);
        const sig = Buffer.from(decoded.slice(cut + 1), "hex");
        const expected = Buffer.from(sign(payload), "hex");
        if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return false;
        const [id, issued] = payload.split(":");
        return id === ADMIN_ID && Date.now() - Number(issued) < IDEA_COOKIE_MAX_AGE * 1000;
    } catch {
        return false;
    }
}

/** 쿠키 값 읽기 함수(next/headers cookies().get 또는 요청 헤더)를 받아 판단한다. */
export function isIdeaAuthed(read: (name: string) => string | undefined): boolean {
    if (verifyIdeaToken(read(IDEA_COOKIE))) return true;
    const admin = read("admin_token");
    return !!admin && verifyAdminTokenValue(admin);
}

export function requestCookies(req: Request) {
    const header = req.headers.get("cookie") || "";
    return (name: string) => header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
}

export function checkPassword(id: string, pw: string): boolean {
    if (!ADMIN_PW || !SECRET) return false;
    const a = Buffer.from(`${id}\n${pw}`);
    const b = Buffer.from(`${ADMIN_ID}\n${ADMIN_PW}`);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- 저장 ----------
// DB 테이블을 새로 만들지 않도록 Supabase Storage 비공개 버킷에 JSON 한 파일로 둔다(개인용이라 수백 건 규모).
// 쓸 때마다 그날 날짜 사본(backups/YYYY-MM-DD.json)도 덮어써 하루 단위로 되돌릴 수 있다.

const BUCKET = "oyk-ideas";
// 개발 서버도 같은 Supabase 를 보므로, 시험 데이터는 dev/ 아래에 따로 둔다.
const DIR = process.env.NODE_ENV === "production" ? "" : "dev/";
const FILE = `${DIR}ideas.json`;
type Doc = { version: number; ideas: Idea[] };

let bucketReady = false;
async function ensureBucket() {
    if (bucketReady) return;
    const db = createServiceClient();
    const { data } = await db.storage.getBucket(BUCKET);
    if (!data) {
        const { error } = await db.storage.createBucket(BUCKET, { public: false });
        if (error && !/already exists/i.test(error.message)) throw new Error(`버킷을 만들지 못했습니다: ${error.message}`);
    } else if (data.public) {
        throw new Error("아이디어 버킷이 공개 상태입니다. 비공개로 바꿔 주세요.");
    }
    bucketReady = true;
}

async function retry<T extends { error: unknown }>(run: () => Promise<T>, tries = 3): Promise<T> {
    let result = await run();
    for (let i = 1; i < tries && result.error; i++) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** (i - 1)));
        result = await run();
    }
    return result;
}

async function readDoc(): Promise<Doc> {
    await ensureBucket();
    const storage = createServiceClient().storage.from(BUCKET);
    const { data, error } = await storage.download(`${FILE}?t=${Date.now()}`);
    if (error || !data) {
        // 파일이 정말 없을 때(400/404)만 빈 창고로 시작한다. 네트워크 오류면 exists 가 던져서
        // 빈 목록으로 기존 파일을 덮어쓰는 일이 없다. (?t= 는 CDN 캐시를 피하는 쿼리)
        const exists = await storage.exists(FILE);
        if (!exists.data) return { version: 0, ideas: [] };
        throw new Error(`아이디어를 읽지 못했습니다: ${error?.message ?? "빈 응답"}`);
    }
    const doc = JSON.parse(await data.text()) as Doc;
    return { version: doc.version || 0, ideas: Array.isArray(doc.ideas) ? doc.ideas : [] };
}

async function writeDoc(doc: Doc) {
    const storage = createServiceClient().storage.from(BUCKET);
    const body = JSON.stringify(doc);
    const opts = { contentType: "application/json", upsert: true, cacheControl: "0" };
    const { error } = await retry(() => storage.upload(FILE, body, opts));
    if (error) throw new Error(`아이디어를 저장하지 못했습니다: ${error.message}`);
    // 하루치 사본은 실패해도 본 저장을 막지 않는다.
    await storage.upload(`${DIR}backups/${todayKst()}.json`, body, opts).catch(() => undefined);
}

// 같은 서버 인스턴스 안에서는 쓰기를 한 줄로 세운다(읽고-고치고-쓰기 사이 끼어들기 방지).
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (doc: Doc) => T | Promise<T>): Promise<T> {
    const run = queue.then(async () => {
        const doc = await readDoc();
        const result = await fn(doc);
        doc.version += 1;
        await writeDoc(doc);
        return result;
    });
    queue = run.catch(() => undefined);
    return run;
}

export async function listIdeas(): Promise<Idea[]> {
    const { ideas } = await readDoc();
    return ideas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export class IdeaNotFound extends Error {}

export type IdeaInput = Partial<Pick<Idea, "title" | "memo" | "tags" | "status" | "star" | "due" | "links">>;

/** 들어온 값을 검사해 고칠 필드만 돌려준다. 잘못된 값은 버린다. */
export function cleanInput(body: Record<string, unknown>): IdeaInput {
    const out: IdeaInput = {};
    if (typeof body.title === "string") out.title = body.title.trim().slice(0, LIMITS.title);
    if (typeof body.memo === "string") out.memo = body.memo.slice(0, LIMITS.memo);
    if (body.tags !== undefined) out.tags = normalizeTags(body.tags);
    if (typeof body.status === "string" && STATUS_KEYS.includes(body.status as Status)) out.status = body.status as Status;
    if (typeof body.star === "boolean") out.star = body.star;
    if (body.due === null || body.due === "") out.due = null;
    else if (typeof body.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due)) out.due = body.due;
    if (Array.isArray(body.links)) {
        out.links = body.links
            .map((l) => (typeof l === "string" ? { url: l } : (l as IdeaLink)))
            .filter((l) => l && typeof l.url === "string" && /^https?:\/\//i.test(l.url) && l.url.length <= LIMITS.url)
            .slice(0, LIMITS.links)
            .map((l) => ({
                url: l.url,
                ...(l.title ? { title: String(l.title).slice(0, 300) } : {}),
                ...(l.image && /^https?:\/\//i.test(String(l.image)) ? { image: String(l.image).slice(0, LIMITS.url) } : {}),
                ...(l.site ? { site: String(l.site).slice(0, 80) } : {}),
            }));
    }
    return out;
}

export async function createIdea(input: IdeaInput): Promise<Idea> {
    const now = new Date().toISOString();
    const idea: Idea = {
        id: crypto.randomUUID(),
        title: input.title || input.links?.[0]?.title || input.links?.[0]?.url || "제목 없음",
        memo: input.memo ?? "",
        links: input.links ?? [],
        tags: input.tags ?? [],
        status: input.status ?? "seed",
        star: input.star ?? false,
        due: input.due ?? null,
        createdAt: now,
        updatedAt: now,
    };
    await mutate((doc) => { doc.ideas.push(idea); });
    return idea;
}

export async function updateIdea(id: string, input: IdeaInput): Promise<Idea> {
    return mutate((doc) => {
        const idea = doc.ideas.find((i) => i.id === id);
        if (!idea) throw new IdeaNotFound();
        Object.assign(idea, input, { updatedAt: new Date().toISOString() });
        if (!idea.title) idea.title = "제목 없음";
        return idea;
    });
}

export async function addLinkToIdea(id: string, link: IdeaLink): Promise<Idea> {
    const [clean] = cleanInput({ links: [link] }).links ?? [];
    if (!clean) throw new Error("bad link");
    return mutate((doc) => {
        const idea = doc.ideas.find((i) => i.id === id);
        if (!idea) throw new IdeaNotFound();
        if (!idea.links.some((l) => l.url === clean.url)) idea.links = [...idea.links, clean].slice(0, LIMITS.links);
        idea.updatedAt = new Date().toISOString();
        return idea;
    });
}

export async function deleteIdea(id: string): Promise<void> {
    await mutate((doc) => {
        const before = doc.ideas.length;
        doc.ideas = doc.ideas.filter((i) => i.id !== id);
        if (doc.ideas.length === before) throw new IdeaNotFound();
    });
}

// ---------- 링크 미리보기 ----------
// 붙여 넣은 링크의 제목·대표 이미지·사이트 이름을 가져온다. 실패해도 링크만으로 저장한다.

function youtubeId(url: URL): string | null {
    const h = url.hostname.replace(/^www\.|^m\./, "");
    if (h === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
    if (h === "youtube.com" || h === "music.youtube.com") {
        if (url.searchParams.get("v")) return url.searchParams.get("v");
        const m = url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{6,})/);
        return m?.[1] ?? null;
    }
    return null;
}

function privateHost(host: string): boolean {
    return /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd])/i.test(host) || host.endsWith(".local") || host.endsWith(".internal");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
function decodeEntities(s: string): string {
    return s.replace(/&(#x?[\da-f]+|\w+);/gi, (m, e: string) => {
        if (e[0] === "#") {
            const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : m;
        }
        return ENTITIES[e.toLowerCase()] ?? m;
    }).replace(/\s+/g, " ").trim();
}

function metaContent(html: string, keys: string[]): string | undefined {
    for (const key of keys) {
        const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
        const tag = html.match(re)?.[0];
        const content = tag?.match(/content=["']([^"']*)["']/i)?.[1] ?? tag?.match(/content=([^\s>]+)/i)?.[1];
        if (content) return decodeEntities(content);
    }
    return undefined;
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
        return await fetch(url, { ...init, signal: ctrl.signal, redirect: "follow", cache: "no-store" });
    } finally {
        clearTimeout(timer);
    }
}

export async function previewLink(raw: string): Promise<IdeaLink> {
    let url: URL;
    try { url = new URL(raw); } catch { return { url: raw }; }
    if (!/^https?:$/.test(url.protocol) || privateHost(url.hostname)) return { url: raw };

    const yt = youtubeId(url);
    if (yt) {
        const link: IdeaLink = { url: raw, site: "YouTube", image: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` };
        try {
            const res = await fetchWithTimeout(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${yt}`)}`, 4000);
            if (res.ok) {
                const o = (await res.json()) as { title?: string; author_name?: string };
                if (o.title) link.title = o.title;
                if (o.author_name) link.site = `YouTube · ${o.author_name}`;
            }
        } catch { /* 제목 없이 저장 */ }
        return link;
    }

    try {
        const res = await fetchWithTimeout(url.href, 6000, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
            },
        });
        const type = res.headers.get("content-type") || "";
        if (!res.ok || !/html|xml/i.test(type)) return { url: raw, site: hostOfUrl(url) };

        // 앞부분(최대 600KB)만 읽는다 — <head> 안의 메타면 충분.
        const reader = res.body?.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (reader && size < 600_000) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            size += value.length;
            if (new TextDecoder().decode(value).includes("</head>")) break;
        }
        reader?.cancel().catch(() => undefined);
        const bytes = Buffer.concat(chunks);
        const charset = type.match(/charset=([\w-]+)/i)?.[1]
            ?? bytes.subarray(0, 4000).toString("latin1").match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
            ?? "utf-8";
        let html: string;
        try { html = new TextDecoder(charset.toLowerCase()).decode(bytes); } catch { html = new TextDecoder().decode(bytes); }

        const base = res.url || url.href;
        const title = metaContent(html, ["og:title", "twitter:title"]) ?? decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");
        const image = metaContent(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]);
        const site = metaContent(html, ["og:site_name", "application-name"]) ?? hostOfUrl(new URL(base));
        const link: IdeaLink = { url: raw, site: site.slice(0, 80) };
        if (title) link.title = title.slice(0, 300);
        if (image) {
            try { link.image = new URL(image, base).href; } catch { /* 이미지 없이 */ }
        }
        return link;
    } catch {
        return { url: raw, site: hostOfUrl(url) };
    }
}

function hostOfUrl(url: URL) {
    return url.hostname.replace(/^www\.|^m\./, "");
}
