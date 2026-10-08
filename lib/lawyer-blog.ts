import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { isPublicLawyerSlug, PUBLIC_BLOG_CHANNELS } from "@/lib/public-content";
import { queryDeadline, readPublished } from "@/lib/public-read";

// 변호사 공개 블로그(/blog, /blog/{변호사}, /blog/{변호사}/{글}) 읽기 — 2026-10-08.
//
// 있음 → 값 / 정말 없음 → null(404) / 읽지 못함 → 예외(lib/public-read.ts).
// 예전에는 `const { data } = await ....single()` 뒤 데이터가 없으면 notFound() 라서, 2026-10-03~05 데이터베이스 장애 동안
// 살아 있는 글도 404 로 나갔고 구글이 그 404 를 기록했다(서치콘솔 404 표본 8개 중 5개). 예외는 5xx 가 되고 캐시되지 않는다.
// 같은 렌더링 안의 generateMetadata 와 페이지는 react cache() 로 같은 조회를 한 번만 한다.

export const BLOG_PAGE_SIZE = 10;
/** 블로그 홈 아래 "최근 글 더보기"에 싣는 글 수(11번째부터) — 오래된 글로 가는 내부 링크. */
const ARCHIVE_SIZE = 60;

const LAWYER_FIELDS = "id, name, slug, specialty, region, bio, profile_image_url, office_name, office_address, experience_years, brand_color, website_url, phone";
const LIST_FIELDS = "id, slug, title, body, meta_description, tags, channel, created_at, status";

export interface BlogLawyer {
    id: string;
    name: string;
    slug: string;
    specialty: string[] | null;
    region: string | null;
    bio: string | null;
    profile_image_url: string | null;
    office_name: string | null;
    office_address: string | null;
    experience_years: number | null;
    brand_color: string | null;
    website_url: string | null;
    phone: string | null;
}

export interface BlogListPost {
    id: string;
    slug: string | null;
    title: string;
    body: string;
    meta_description: string | null;
    tags: string[] | null;
    channel: string;
    created_at: string;
    status: string;
}

export interface BlogPostLink {
    id: string;
    slug: string | null;
    title: string;
    created_at: string;
}

export interface BlogPost {
    id: string;
    upload_id: string | null;
    lawyer_id: string;
    channel: string;
    title: string;
    body: string | null;
    meta_description: string | null;
    tags: string[] | null;
    schema_markup: Record<string, unknown> | null;
    status: string;
    slug: string | null;
    created_at: string;
    updated_at: string | null;
    published_at?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isPostUuid = (value: string) => UUID_RE.test(value);

/** 주소 조각을 푼다. 깨진 퍼센트 인코딩은 null — 정말 없는 주소(404)다. */
export function decodePathPart(raw: string): string | null {
    try {
        return decodeURIComponent(raw);
    } catch {
        return null;
    }
}

/** 주소의 변호사 부분 → 공개 블로그 slug. 시험용·내부 ID 같은 비공개 slug 도 null(404). */
export function publicLawyerSlugFromPath(raw: string): string | null {
    const slug = decodePathPart(raw);
    return isPublicLawyerSlug(slug) ? slug : null;
}

/** 프로필 사진은 대부분 data: URL 이라 공유 이미지·구조화 데이터에 쓸 수 없다(주소가 아님). http(s) 주소일 때만. */
export function publicImageUrl(value: string | null | undefined): string | undefined {
    return value && /^https?:\/\//i.test(value) ? value : undefined;
}

function publicPosts<Fields extends string>(fields: Fields, options?: { count: "exact" }) {
    return createServiceClient()
        .from("contents")
        .select(fields, options)
        .in("channel", [...PUBLIC_BLOG_CHANNELS])
        .eq("status", "published");
}

export const getBlogLawyer = cache(async (slug: string): Promise<BlogLawyer | null> =>
    readPublished<BlogLawyer>("변호사 블로그: 변호사", () => createServiceClient()
        .from("lawyers")
        .select(LAWYER_FIELDS)
        .eq("slug", slug)
        .abortSignal(queryDeadline())
        .maybeSingle<BlogLawyer>()));

/** 글 목록 한 쪽 + 전체 편수. 쪽이 편수를 넘으면 posts 가 비고 total 은 그대로(또는 0) — 페이지가 404 로 처리한다. */
export const getBlogListPage = cache(async (lawyerId: string, page: number): Promise<{ posts: BlogListPost[]; total: number }> => {
    const start = (page - 1) * BLOG_PAGE_SIZE;
    const result = await readPublished<{ posts: BlogListPost[]; total: number }>("변호사 블로그: 글 목록", async () => {
        const { data, count, error } = await publicPosts(LIST_FIELDS, { count: "exact" })
            .eq("lawyer_id", lawyerId)
            .order("created_at", { ascending: false })
            .range(start, start + BLOG_PAGE_SIZE - 1)
            .abortSignal(queryDeadline());
        // 편수보다 뒤쪽을 달라고 하면 PostgREST 가 416(PGRST103)으로 답한다. 장애가 아니라 "그런 쪽은 없음"이다.
        if (error?.code === "PGRST103") return { data: { posts: [], total: 0 }, error: null };
        return { data: error ? null : { posts: (data ?? []) as BlogListPost[], total: count ?? 0 }, error };
    });
    return result ?? { posts: [], total: 0 };
});

/** 블로그 홈 아래 "최근 글 더보기"(11~70번째 글 제목). */
export const getBlogArchive = cache(async (lawyerId: string): Promise<BlogPostLink[]> =>
    (await readPublished<BlogPostLink[]>("변호사 블로그: 지난 글", () => publicPosts("id, slug, title, created_at")
        .eq("lawyer_id", lawyerId)
        .order("created_at", { ascending: false })
        .range(BLOG_PAGE_SIZE, BLOG_PAGE_SIZE + ARCHIVE_SIZE - 1)
        .abortSignal(queryDeadline()))) ?? []);

/** 글 한 편 — 주소의 글 부분(slug, 예전 주소는 UUID)으로 찾는다. 발행된 공개 채널 글만. */
export const getBlogPost = cache(async (lawyerId: string, postSlug: string): Promise<BlogPost | null> =>
    readPublished<BlogPost>("변호사 블로그: 글", () => publicPosts("*")
        .eq("lawyer_id", lawyerId)
        .eq(isPostUuid(postSlug) ? "id" : "slug", postSlug)
        .abortSignal(queryDeadline())
        .maybeSingle()));

/** 글 주소 끝 6자 = 글 ID(하이픈 뺀) 앞 6자(lib/slug.ts makeSlug). 제목이 바뀌어 slug 가 새로 만들어져도 이 6자는 그대로다. */
export function postIdPrefixFromSlug(postSlug: string): string | null {
    return /(?:^|-)([0-9a-f]{6})$/i.exec(postSlug)?.[1].toLowerCase() ?? null;
}

/**
 * slug 로 못 찾은 옛 글 주소 → 지금 글(2026-10-08).
 * SEO 제목 적용(app/api/admin/seo-titles/apply)이 제목과 함께 slug 도 새로 만들어, 이미 색인된 옛 주소가 404 가 됐다.
 * 같은 변호사의 발행된 공개 글 중 ID 가 주소 끝 6자로 시작하는 글이 정확히 1편이면 그 글, 0편·2편 이상이면 null(404).
 * uuid 열은 like 가 안 되므로 ID 범위로 찾는다(앞 6자는 ID 첫 묶음 8자 안에 있다).
 */
export const getMovedBlogPost = cache(async (lawyerId: string, postSlug: string): Promise<Pick<BlogPost, "id" | "slug"> | null> => {
    const prefix = postIdPrefixFromSlug(postSlug);
    if (!prefix) return null;
    const rows = await readPublished<Pick<BlogPost, "id" | "slug">[]>("변호사 블로그: 옛 글 주소", () => publicPosts("id, slug")
        .eq("lawyer_id", lawyerId)
        .gte("id", `${prefix}00-0000-0000-0000-000000000000`)
        .lte("id", `${prefix}ff-ffff-ffff-ffff-ffffffffffff`)
        .limit(2)
        .abortSignal(queryDeadline()));
    return rows?.length === 1 ? rows[0] : null;
});

/**
 * 글 아래 "○○ 변호사의 다른 글" 4편 — 이 글 바로 앞뒤에 쓴 글(새 글 2편 + 이전 글로 채움).
 * 예전에는 모든 글이 같은 최신 4편만 가리켜 오래된 글로 가는 링크가 없었다. 앞뒤 글을 이으면 글에서 글로 전체 글을 다 거쳐 갈 수 있다.
 * 못 읽으면 빈 목록 — 본문은 그대로 낸다.
 */
export async function getNeighbourPosts(post: Pick<BlogPost, "id" | "lawyer_id" | "created_at">, limit = 4): Promise<BlogPostLink[]> {
    try {
        const window = limit + 2; // 같은 시각에 쓴 글(옮겨 온 글은 날짜만 있다)이 여럿이어도 앞뒤가 비지 않게 넉넉히 읽는다
        const [newer, older] = await Promise.all([
            readPublished<BlogPostLink[]>("변호사 블로그: 앞뒤 글", () => publicPosts("id, slug, title, created_at")
                .eq("lawyer_id", post.lawyer_id)
                .gte("created_at", post.created_at)
                .order("created_at", { ascending: true })
                .limit(window)
                .abortSignal(queryDeadline())),
            readPublished<BlogPostLink[]>("변호사 블로그: 앞뒤 글", () => publicPosts("id, slug, title, created_at")
                .eq("lawyer_id", post.lawyer_id)
                .lte("created_at", post.created_at)
                .order("created_at", { ascending: false })
                .limit(window)
                .abortSignal(queryDeadline())),
        ]);
        return pickNeighbours(post.id, newer ?? [], older ?? [], limit);
    } catch (error) {
        console.error("[LawyerBlog] neighbour posts unavailable:", error instanceof Error ? error.message : error);
        return [];
    }
}

/** 새 글 쪽에서 최대 절반, 나머지는 이전 글로 채운다. 한쪽이 모자라면 다른 쪽에서 더 가져온다. 최신순으로 돌려준다. */
export function pickNeighbours(selfId: string, newerAsc: BlogPostLink[], olderDesc: BlogPostLink[], limit = 4): BlogPostLink[] {
    const seen = new Set([selfId]);
    const take = (list: BlogPostLink[]) => list.filter((p) => !seen.has(p.id) && seen.add(p.id));
    const newer = take(newerAsc);
    const older = take(olderDesc);
    const newerCount = Math.min(newer.length, Math.max(Math.ceil(limit / 2), limit - older.length));
    const picked = [...newer.slice(0, newerCount), ...older.slice(0, limit - newerCount)];
    return picked.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

/** 같은 원고에서 만든 인스타그램 카드뉴스(있으면 글 아래에 보여 준다). 못 읽으면 없는 것으로. */
export async function getCardNews(uploadId: string | null): Promise<{ slides: { slide: number; text: string }[]; coverImage: string | null }> {
    const empty = { slides: [], coverImage: null };
    if (!uploadId) return empty;
    try {
        const row = await readPublished<{ body: string | null; card_news_data: { coverImageUrl?: string } | null }>("변호사 블로그: 카드뉴스", () => createServiceClient()
            .from("contents")
            .select("body, card_news_data")
            .eq("upload_id", uploadId)
            .eq("channel", "instagram")
            .limit(1)
            .abortSignal(queryDeadline())
            .maybeSingle());
        let slides: { slide: number; text: string }[] = [];
        if (row?.body) {
            try {
                const parsed = JSON.parse(row.body);
                slides = Array.isArray(parsed) ? parsed : [];
            } catch { /* 카드뉴스 본문이 JSON 이 아니면 보여 주지 않는다 */ }
        }
        return { slides, coverImage: row?.card_news_data?.coverImageUrl || null };
    } catch (error) {
        console.error("[LawyerBlog] card news unavailable:", error instanceof Error ? error.message : error);
        return empty;
    }
}

/* ───────────── /blog — 변호사 블로그 목록 ───────────── */

export interface BlogDirectoryEntry {
    id: string;
    name: string;
    slug: string;
    region: string | null;
    specialty: string[];
    officeName: string | null;
    postCount: number;
    latestAt: string | null;
    recent: BlogPostLink[];
}

/** 공개 slug 이고 발행된 공개 글이 1편 이상인 변호사만, 글이 많은 순. 최근 글 3편과 편수를 함께 읽는다. */
export async function getLawyerBlogDirectory(recentCount = 3): Promise<BlogDirectoryEntry[]> {
    const db = createServiceClient();
    const lawyers = (await readPublished<{ id: string; name: string; slug: string | null; region: string | null; specialty: string[] | null; office_name: string | null }[]>(
        "변호사 블로그 목록", () => db.from("lawyers")
            .select("id, name, slug, region, specialty, office_name")
            .order("created_at", { ascending: true })
            .abortSignal(queryDeadline()))) ?? [];
    const candidates = lawyers.filter((lawyer) => isPublicLawyerSlug(lawyer.slug));

    const entries: BlogDirectoryEntry[] = [];
    // 변호사마다 한 번(최근 글 + 편수). 데이터베이스를 한꺼번에 누르지 않게 4명씩.
    for (let offset = 0; offset < candidates.length; offset += 4) {
        const batch = await Promise.all(candidates.slice(offset, offset + 4).map(async (lawyer): Promise<BlogDirectoryEntry | null> => {
            const listed = await readPublished<{ posts: BlogPostLink[]; total: number }>("변호사 블로그 목록", async () => {
                const { data, count, error } = await publicPosts("id, slug, title, created_at", { count: "exact" })
                    .eq("lawyer_id", lawyer.id)
                    .order("created_at", { ascending: false })
                    .limit(recentCount * 2) // 같은 원고의 google·macdee 두 판이 같은 제목으로 나란히 있을 수 있어 넉넉히 읽고 제목이 겹치면 하나만
                    .abortSignal(queryDeadline());
                return { data: error ? null : { posts: (data ?? []) as BlogPostLink[], total: count ?? 0 }, error };
            });
            if (!listed || listed.total < 1) return null;
            const titles = new Set<string>();
            const recent = listed.posts.filter((post) => {
                const key = post.title.replace(/\s*-\s*(google|macdee|blog|instagram)\s*$/i, "").trim();
                return !titles.has(key) && !!titles.add(key);
            }).slice(0, recentCount);
            return {
                id: lawyer.id,
                name: lawyer.name,
                slug: lawyer.slug as string,
                region: lawyer.region?.trim() || null,
                specialty: (lawyer.specialty || []).filter(Boolean),
                officeName: lawyer.office_name?.trim() || null,
                postCount: listed.total,
                latestAt: listed.posts.length ? listed.posts[0].created_at : null,
                recent,
            };
        }));
        entries.push(...batch.filter((entry): entry is BlogDirectoryEntry => !!entry));
    }
    return entries.sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name, "ko"));
}

/** 지역 표시 순서 — 수도권 → 충청 → 호남 → 영남 → 강원·제주. 목록에 없는 값은 뒤에 가나다순. */
const REGION_ORDER = ["서울", "경기", "인천", "대전", "세종", "충남", "충북", "광주", "전남", "전북", "부산", "대구", "울산", "경남", "경북", "강원", "제주"];

export function groupByRegion(entries: BlogDirectoryEntry[]): { region: string; entries: BlogDirectoryEntry[] }[] {
    const groups = new Map<string, BlogDirectoryEntry[]>();
    for (const entry of entries) {
        const region = entry.region || "기타 지역";
        groups.set(region, [...(groups.get(region) || []), entry]);
    }
    const rank = (region: string) => {
        const index = REGION_ORDER.indexOf(region);
        return index === -1 ? REGION_ORDER.length : index;
    };
    return [...groups.entries()]
        .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, "ko"))
        .map(([region, list]) => ({ region, entries: list }));
}

/** 분야별 변호사(분야를 고른 변호사가 많은 순). "기타"는 찾는 데 도움이 안 돼 뺀다. */
export function groupBySpecialty(entries: BlogDirectoryEntry[]): { specialty: string; entries: BlogDirectoryEntry[] }[] {
    const groups = new Map<string, BlogDirectoryEntry[]>();
    for (const entry of entries) {
        for (const specialty of new Set(entry.specialty)) {
            if (specialty === "기타") continue;
            groups.set(specialty, [...(groups.get(specialty) || []), entry]);
        }
    }
    return [...groups.entries()]
        .sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b, "ko"))
        .map(([specialty, list]) => ({ specialty, entries: list }));
}
