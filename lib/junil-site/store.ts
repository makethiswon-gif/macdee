import crypto from "crypto";
import { revalidateTag, unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import seedPosts from "./seed.json";
import shell from "./shell.json";
import { bodyText, sanitizeBody } from "./sanitize";
import { BOARD_KEYS, LIMITS, MEDIA_PREFIX, slugify, todayKst, type BoardKey, type Post, type PostMeta, type PostStatus } from "./shared";

// ---------- 저장 ----------
// DB 테이블을 새로 만들지 않도록 Supabase Storage 비공개 버킷 하나에 둔다(아이디어 창고와 같은 방식).
//   boards/{게시판}.json   목록(본문 제외)
//   posts/{id}.json        글 한 편(본문 포함)
//   media/YYYY/MM/{이름}   올린 이미지 — /junil-site/media/… 라우트가 내려 준다
// 목록 파일이 아직 없으면 seed.json(공식 FAQ 를 묶은 첫 글)으로 시작하고, 처음 쓸 때 그 글들도 저장한다.

const BUCKET = "junil-site";
// 개발 서버도 같은 Supabase 를 보므로, 시험 데이터는 dev/ 아래에 따로 둔다.
const DIR = process.env.NODE_ENV === "production" ? "" : "dev/";
const SEED = seedPosts as Post[];
const CATEGORIES: string[] = shell.categories;
const LAWYER_IDS = Object.keys(shell.lawyers).map(Number);

type Index = { version: number; posts: PostMeta[] };
type Loaded = Index & { fresh: boolean };

const indexFile = (board: BoardKey) => `${DIR}boards/${board}.json`;
const postFile = (id: string) => `${DIR}posts/${id}.json`;
export const boardTag = (board: BoardKey) => `junil-site:${board}`;

let bucketReady = false;
async function ensureBucket() {
    if (bucketReady) return;
    const db = createServiceClient();
    const { data } = await db.storage.getBucket(BUCKET);
    if (!data) {
        const { error } = await db.storage.createBucket(BUCKET, { public: false });
        if (error && !/already exists/i.test(error.message)) throw new Error(`버킷을 만들지 못했습니다: ${error.message}`);
    } else if (data.public) {
        throw new Error("준일 게시판 버킷이 공개 상태입니다. 비공개로 바꿔 주세요.");
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

function metaOf(post: Post): PostMeta {
    const meta: Partial<Post> = { ...post };
    delete meta.body;
    return meta as PostMeta;
}

/** 파일을 읽는다. 정말 없을 때만 null — 네트워크 오류면 던져서 빈 값으로 덮어쓰는 일을 막는다. */
async function readJson<T>(path: string): Promise<T | null> {
    await ensureBucket();
    const storage = createServiceClient().storage.from(BUCKET);
    const { data, error } = await storage.download(`${path}?t=${Date.now()}`);
    if (error || !data) {
        const exists = await storage.exists(path);
        if (!exists.data) return null;
        throw new Error(`읽지 못했습니다(${path}): ${error?.message ?? "빈 응답"}`);
    }
    return JSON.parse(await data.text()) as T;
}

async function writeJson(path: string, value: unknown) {
    const storage = createServiceClient().storage.from(BUCKET);
    const opts = { contentType: "application/json", upsert: true, cacheControl: "0" };
    const { error } = await retry(() => storage.upload(path, JSON.stringify(value), opts));
    if (error) throw new Error(`저장하지 못했습니다(${path}): ${error.message}`);
}

async function loadIndex(board: BoardKey): Promise<Loaded> {
    const doc = await readJson<Index>(indexFile(board));
    if (!doc) return { version: 0, posts: SEED.filter((p) => p.board === board).map(metaOf), fresh: true };
    return { version: doc.version || 0, posts: Array.isArray(doc.posts) ? doc.posts : [], fresh: false };
}

const byNewest = (a: PostMeta, b: PostMeta) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

// 같은 서버 인스턴스 안에서는 쓰기를 한 줄로 세운다(읽고-고치고-쓰기 사이 끼어들기 방지).
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(board: BoardKey, fn: (index: Loaded) => T | Promise<T>): Promise<T> {
    const run = queue.then(async () => {
        const index = await loadIndex(board);
        if (index.fresh) {
            // 처음 쓰는 순간: 첫 글들도 파일로 남겨 관리자 화면에서 고치고 지울 수 있게 한다.
            for (const post of SEED.filter((p) => p.board === board)) await writeJson(postFile(post.id), post);
        }
        const result = await fn(index);
        await writeJson(indexFile(board), { version: index.version + 1, posts: index.posts });
        // 하루치 목록 사본(실패해도 본 저장은 그대로)
        await writeJson(`${DIR}backups/${board}-${todayKst()}.json`, { version: index.version + 1, posts: index.posts }).catch(() => undefined);
        return result;
    });
    queue = run.catch(() => undefined);
    return run.then((result) => {
        refreshBoard(board);
        return result;
    });
}

/** 글이 바뀐 뒤 공개 페이지가 바로 새 내용을 내도록 캐시를 비운다. */
function refreshBoard(board: BoardKey) {
    try {
        revalidateTag(boardTag(board), { expire: 0 });
    } catch (error) {
        console.error("[junil-site] revalidate failed:", error);
    }
}

// ---------- 읽기 ----------

/** 관리자용: 모든 글(임시 저장 포함), 바로 읽기 */
export async function listAllPosts(board: BoardKey): Promise<PostMeta[]> {
    return (await loadIndex(board)).posts.sort(byNewest);
}

export async function getPost(id: string): Promise<Post | null> {
    if (!/^[\w-]{1,64}$/.test(id)) return null;
    const post = await readJson<Post>(postFile(id));
    return post ?? SEED.find((p) => p.id === id) ?? null;
}

/** 공개 페이지용: 발행된 글만, 1시간 캐시(글을 쓰면 바로 비워진다) */
export function listPublished(board: BoardKey): Promise<PostMeta[]> {
    return unstable_cache(
        async () => (await loadIndex(board)).posts.filter((p) => p.status === "published").sort(byNewest),
        ["junil-site-list", DIR, board],
        { tags: [boardTag(board)], revalidate: 3600 },
    )();
}

export function getPublishedBySlug(board: BoardKey, slug: string): Promise<Post | null> {
    return unstable_cache(
        async () => {
            const meta = (await loadIndex(board)).posts.find((p) => p.slug === slug && p.status === "published");
            if (!meta) return null;
            const post = await getPost(meta.id);
            // 목록의 값이 기준(발행 상태·주소가 어긋나지 않게)
            return post ? { ...post, ...meta } : null;
        },
        ["junil-site-post", DIR, board, slug],
        { tags: [boardTag(board)], revalidate: 3600 },
    )();
}

// ---------- 쓰기 ----------

export class PostNotFound extends Error {}
export class BadInput extends Error {}

export type PostInput = Partial<Pick<Post, "title" | "category" | "lawyerId" | "date" | "summary" | "thumb" | "slug" | "status" | "body">>;

/** 들어온 값을 검사해 고칠 필드만 돌려준다. 잘못된 값은 버린다. */
export function cleanInput(body: Record<string, unknown>): PostInput {
    const out: PostInput = {};
    if (typeof body.title === "string") out.title = body.title.replace(/\s+/g, " ").trim().slice(0, LIMITS.title);
    if (typeof body.category === "string") out.category = CATEGORIES.includes(body.category) ? body.category : "";
    if (body.lawyerId === null || body.lawyerId === "") out.lawyerId = null;
    else if (body.lawyerId !== undefined && LAWYER_IDS.includes(Number(body.lawyerId))) out.lawyerId = Number(body.lawyerId);
    if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) out.date = body.date;
    if (typeof body.summary === "string") out.summary = body.summary.replace(/\s+/g, " ").trim().slice(0, LIMITS.summary);
    if (typeof body.thumb === "string") out.thumb = body.thumb.startsWith(MEDIA_PREFIX) && /^[\w./-]+$/.test(body.thumb) && !body.thumb.includes("..") ? body.thumb : "";
    if (typeof body.slug === "string") out.slug = slugify(body.slug);
    if (body.status === "draft" || body.status === "published") out.status = body.status as PostStatus;
    if (typeof body.body === "string") {
        if (body.body.length > LIMITS.body) throw new BadInput("본문이 너무 깁니다.");
        out.body = sanitizeBody(body.body);
    }
    return out;
}

function uniqueSlug(posts: PostMeta[], wanted: string, selfId: string): string {
    const base = wanted || selfId;
    let slug = base;
    for (let n = 2; posts.some((p) => p.slug === slug && p.id !== selfId); n++) slug = `${base}-${n}`;
    return slug;
}

function newId(): string {
    return Date.now().toString(36) + crypto.randomBytes(3).toString("hex");
}

export async function createPost(board: BoardKey, input: PostInput): Promise<Post> {
    if (!BOARD_KEYS.includes(board)) throw new BadInput("없는 게시판입니다.");
    if (!input.title) throw new BadInput("제목을 적어 주세요.");
    const now = new Date().toISOString();
    const id = newId();
    return mutate(board, async (index) => {
        const body = input.body ?? "";
        const post: Post = {
            id,
            board,
            slug: uniqueSlug(index.posts, input.slug || slugify(input.title!), id),
            title: input.title!,
            category: input.category ?? "",
            lawyerId: input.lawyerId ?? null,
            date: input.date || todayKst(),
            summary: input.summary || bodyText(body).slice(0, 140),
            thumb: input.thumb ?? "",
            status: input.status ?? "draft",
            createdAt: now,
            updatedAt: now,
            body,
        };
        await writeJson(postFile(id), post);
        index.posts.push(metaOf(post));
        return post;
    });
}

export async function updatePost(board: BoardKey, id: string, input: PostInput): Promise<Post> {
    return mutate(board, async (index) => {
        const at = index.posts.findIndex((p) => p.id === id);
        const current = at === -1 ? null : await getPost(id);
        if (!current) throw new PostNotFound();
        const next: Post = { ...current, ...index.posts[at], ...input, id, board, updatedAt: new Date().toISOString() };
        if (!next.title) throw new BadInput("제목을 적어 주세요.");
        if (input.slug !== undefined || !next.slug) next.slug = uniqueSlug(index.posts, input.slug || slugify(next.title), id);
        if (!next.summary) next.summary = bodyText(next.body).slice(0, 140);
        await writeJson(postFile(id), next);
        index.posts[at] = metaOf(next);
        return next;
    });
}

export async function deletePost(board: BoardKey, id: string): Promise<void> {
    await mutate(board, async (index) => {
        const before = index.posts.length;
        index.posts = index.posts.filter((p) => p.id !== id);
        if (index.posts.length === before) throw new PostNotFound();
        // 글 파일은 지우되, 실패해도 목록에서는 이미 빠졌으므로 넘어간다.
        await createServiceClient().storage.from(BUCKET).remove([postFile(id)]).catch(() => undefined);
    });
}

// ---------- 이미지 ----------

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

/** 이미지를 올리고 공개 주소(/junil-site/media/…)를 돌려준다. */
export async function saveImage(file: File): Promise<string> {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) throw new BadInput("JPG·PNG·WEBP·GIF 이미지만 올릴 수 있습니다.");
    if (file.size > LIMITS.image) throw new BadInput("이미지는 8MB 까지 올릴 수 있습니다.");
    await ensureBucket();
    const [y, m] = todayKst().split("-");
    const name = `${y}/${m}/${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await retry(() =>
        createServiceClient().storage.from(BUCKET).upload(`${DIR}media/${name}`, bytes, { contentType: file.type, cacheControl: "31536000" }),
    );
    if (error) throw new Error(`이미지를 올리지 못했습니다: ${error.message}`);
    return MEDIA_PREFIX + name;
}

/** /junil-site/media/{path} 로 내려 줄 이미지 */
export async function readImage(path: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
    if (!/^\d{4}\/\d{2}\/[a-z0-9]+\.(jpg|png|webp|gif)$/.test(path)) return null;
    const { data, error } = await createServiceClient().storage.from(BUCKET).download(`${DIR}media/${path}`);
    if (error || !data) return null;
    const ext = path.split(".").pop()!;
    const type = Object.entries(IMAGE_TYPES).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
    return { bytes: await data.arrayBuffer(), type };
}
