import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

// 변호사 공개 블로그(/blog, /blog/{변호사}, /blog/{변호사}/{글})의 페이지 캐시(ISR) 규칙 — 2026-10-08.
//
// 예전에는 force-dynamic 이라 요청마다 데이터베이스를 4~6번 읽었고 응답이 1.5~3초였다(cache-control: no-store).
// 이제 페이지를 1시간 캐시하고(각 page.tsx 의 revalidate), 글을 발행·수정·삭제·비공개로 돌리는 곳에서
// refreshLawyerBlog() 로 바뀐 페이지만 바로 비운다. 비우지 못한 곳(PC 발행기처럼 Next 밖에서 쓰는 경우)도 1시간 안에 따라온다.
//
// 글 주소(slug)는 전부 한글이라 경로(revalidatePath)로 비우면 퍼센트 인코딩 표기에 따라 빗나갈 수 있다.
// 그래서 페이지마다 ID 로 만든 태그를 달고 태그로 비운다.

const ALL = "lawyer-blog";

export const lawyerBlogTags = {
    /** 모든 블로그 페이지 */
    all: ALL,
    /** 변호사 블로그 목록(/blog) */
    hub: "lawyer-blog-hub",
    /** 그 변호사의 모든 페이지 — 이름·소개·사진처럼 모든 글에 보이는 정보가 바뀔 때 */
    lawyer: (lawyerId: string) => `lawyer-blog:${lawyerId}`,
    /** 그 변호사의 글 목록(블로그 홈·?page=N)과 아직 없는 글 주소(404) — 글이 생기거나 빠질 때 */
    list: (lawyerId: string) => `lawyer-blog-list:${lawyerId}`,
    /** 글 한 편 */
    post: (postId: string) => `lawyer-blog-post:${postId}`,
};

/**
 * 지금 만드는 페이지(ISR)에 무효화 태그를 단다. 데이터는 캐시하지 않는다 —
 * 값 없는 unstable_cache 를 한 번 불러 그 태그가 이 페이지의 캐시 항목에 함께 저장되게 한다.
 */
export async function tagLawyerBlogPage(...tags: string[]): Promise<void> {
    const all = [ALL, ...tags];
    try {
        await unstable_cache(async () => true, ["lawyer-blog-page-tags", ...all], { tags: all })();
    } catch (error) {
        // 태그를 못 달아도 페이지는 낸다. 이 페이지는 revalidate(1시간) 뒤 다시 만들어진다.
        console.error("[LawyerBlog] page tag failed:", error);
    }
}

/**
 * 글·변호사 정보를 바꾼 뒤 부른다(라우트 핸들러 안에서). 다음 방문부터 바로 새 내용이 나가게 한다.
 * - 글 발행·수정·삭제·비공개: lawyerId + postIds → 그 글 페이지, 그 변호사 글 목록, /blog, sitemap.xml, rss.xml
 * - 이름·소개·사진 등 변호사 정보, 글 일괄 변경: whole → 그 변호사의 모든 페이지
 * 실패해도 예외를 던지지 않는다 — 저장은 이미 끝났고, 실패처럼 보이면 다시 누르게 된다.
 */
export function refreshLawyerBlog({ lawyerId, postIds = [], whole = false }: {
    lawyerId?: string | null;
    postIds?: (string | null | undefined)[];
    whole?: boolean;
}): void {
    try {
        // 라우트 핸들러에서는 "다음 방문 때 새로 만들기"(stale-while-revalidate)가 아니라 바로 만료시킨다.
        // 그래야 비공개로 돌린 글이 한 번 더 보이거나, 새 글이 404 로 한 번 더 나가지 않는다.
        if (lawyerId) revalidateTag(whole ? lawyerBlogTags.lawyer(lawyerId) : lawyerBlogTags.list(lawyerId), { expire: 0 });
        for (const postId of new Set(postIds.filter((id): id is string => !!id))) {
            revalidateTag(lawyerBlogTags.post(postId), { expire: 0 });
        }
        revalidateTag(lawyerBlogTags.hub, { expire: 0 });
        revalidatePath("/sitemap.xml");
        revalidatePath("/rss.xml");
    } catch (error) {
        console.error("[LawyerBlog] cache refresh failed:", error);
    }
}
