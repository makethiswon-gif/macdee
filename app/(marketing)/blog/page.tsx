import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLink, Container, Eyebrow } from "@/components/renewal/primitives";
import { COMPANY, SITE_BASE, ogImage, path } from "@/data/renewal/site";
import { formatKstDate } from "@/lib/renewal/magazine-display";
import { insightJsonLd } from "@/lib/renewal/magazine";
import { breadcrumbJsonLd } from "@/lib/renewal/schema";
import { getLawyerBlogDirectory, groupByRegion, groupBySpecialty, type BlogDirectoryEntry, type BlogPostLink } from "@/lib/lawyer-blog";
import { lawyerBlogTags, tagLawyerBlogPage } from "@/lib/lawyer-blog-cache";

// 변호사 블로그 목록(2026-10-08). 변호사 블로그(/blog/{변호사})는 회사 사이트 구글 유입의 대부분을 만드는데,
// 메인 사이트 어디에서도 링크가 없어 구글이 사이트맵으로만 찾았다(율빛 269편은 한 번도 크롤링되지 않음).
// 푸터·/lawfirm-blog 에서 이 페이지로, 이 페이지에서 각 블로그 홈과 최근 글로 잇는다.
// 대상: 공개 slug(isPublicLawyerSlug)이고 발행된 공개 글이 1편 이상인 변호사. 1시간 캐시, 글이 바뀌면 바로 비운다.
export const revalidate = 3600;

const PAGE_URL = `${SITE_BASE}/blog`;
const TITLE = "변호사 블로그 · 지역·분야별 법률 칼럼 | 메이크디스원";
const DESCRIPTION = "메이크디스원이 운영을 돕는 변호사 블로그를 지역과 분야별로 모았습니다. 변호사마다 최근 법률 칼럼을 바로 읽어 보세요.";

export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: PAGE_URL },
    robots: { index: true, follow: true },
    openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website", locale: "ko_KR", siteName: COMPANY.brand, images: [ogImage("lawfirm-blog")] },
};

const blogHref = (slug: string) => `/blog/${slug}`;
const postHref = (slug: string, post: BlogPostLink) => `/blog/${slug}/${post.slug || post.id}`;
const postTitle = (title: string) => title.replace(/\s*-\s*(google|macdee|blog|instagram)\s*$/i, "").trim();

function LawyerBlogCard({ entry }: { entry: BlogDirectoryEntry }) {
    const fields = entry.specialty.filter((field) => field !== "기타").join(" · ");
    return (
        <div className="py-8">
            <div className="flex flex-wrap items-center gap-3">
                <span className="mt-label" style={{ color: "var(--mt-accent)" }}>{entry.region || "기타 지역"}</span>
                <span className="mt-num text-[11.5px]" style={{ color: "var(--mt-gray-light)" }}>
                    글 {entry.postCount.toLocaleString("ko-KR")}편{entry.latestAt ? ` · 최근 ${formatKstDate(entry.latestAt)}` : ""}
                </span>
            </div>
            <h3 className="mt-4 text-[18px] font-semibold leading-[1.45] tracking-tight">
                <Link href={blogHref(entry.slug)} className="group">
                    <span className="mt-underline">{entry.name} 변호사 블로그</span>
                </Link>
            </h3>
            {(entry.officeName || fields) && (
                <p className="mt-body mt-2 text-[13.5px]">{[entry.officeName, fields].filter(Boolean).join(" · ")}</p>
            )}
            {entry.recent.length > 0 && (
                <ul className="mt-5 flex flex-col gap-2.5" aria-label={`${entry.name} 변호사 최근 글`}>
                    {entry.recent.map((post) => (
                        <li key={post.id} className="flex gap-3">
                            <span aria-hidden style={{ color: "var(--mt-gray-light)" }}>—</span>
                            <Link href={postHref(entry.slug, post)} className="text-[14px] leading-[1.6] line-clamp-1 transition-opacity hover:opacity-60" style={{ color: "var(--mt-ink)" }}>
                                {postTitle(post.title)}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-6">
                <ArrowLink href={blogHref(entry.slug)}>블로그 보기</ArrowLink>
            </div>
        </div>
    );
}

export default async function LawyerBlogsPage() {
    // 읽지 못하면 예외(5xx, 캐시 안 됨) — 빈 목록을 1시간 동안 굳히지 않는다.
    const entries = await getLawyerBlogDirectory();
    await tagLawyerBlogPage(lawyerBlogTags.hub);
    const regions = groupByRegion(entries);
    const specialties = groupBySpecialty(entries);
    const totalPosts = entries.reduce((sum, entry) => sum + entry.postCount, 0);

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": `${PAGE_URL}#webpage`,
                url: PAGE_URL,
                name: "변호사 블로그",
                description: DESCRIPTION,
                inLanguage: "ko-KR",
                publisher: { "@type": "Organization", name: COMPANY.brand, url: SITE_BASE },
                mainEntity: {
                    "@type": "ItemList",
                    numberOfItems: entries.length,
                    itemListElement: entries.map((entry, i) => ({
                        "@type": "ListItem",
                        position: i + 1,
                        name: `${entry.name} 변호사 블로그`,
                        url: `${SITE_BASE}/blog/${encodeURIComponent(entry.slug)}`,
                    })),
                },
            },
            breadcrumbJsonLd([
                { name: "홈", path: "/" },
                { name: "변호사 블로그", path: "/blog" },
            ]),
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: insightJsonLd(jsonLd) }} />
            <section className="mt-k-masthead" data-page="lawyer-blogs">
                <Container>
                    <div className="max-w-[820px]">
                        <Eyebrow className="mt-hero-in">Lawyer Blogs</Eyebrow>
                        <h1 className="mt-h1 mt-6 mt-hero-in" style={{ ["--mt-hero-delay" as string]: "60ms" }}>
                            변호사 블로그,<br />지역과 분야로.
                        </h1>
                        <p className="mt-body-lg mt-7 max-w-[560px] mt-hero-in" style={{ ["--mt-hero-delay" as string]: "120ms" }}>
                            메이크디스원이 운영을 돕는 변호사 블로그입니다.<br />
                            블로그 {entries.length}곳의 법률 칼럼 {totalPosts.toLocaleString("ko-KR")}편을 지역과 분야로 찾아 읽어 보세요.
                        </p>
                        <Link href={path("/lawfirm-blog")} className="mt-7 inline-block text-[14px] underline underline-offset-4">변호사 블로그 마케팅 서비스 →</Link>
                    </div>
                </Container>
            </section>

            <section className="mt-section mt-k-insights">
                <Container>
                    {regions.length > 1 && (
                        <nav
                            className="flex flex-wrap items-center gap-x-6 gap-y-5 py-5"
                            style={{ borderTop: "1px solid var(--mt-ink)", borderBottom: "1px solid var(--mt-line)" }}
                            aria-label="지역별 변호사 블로그"
                        >
                            {regions.map((group, i) => (
                                <a
                                    key={group.region}
                                    href={`#region-${i + 1}`}
                                    className="mt-label inline-block py-2.5 -my-2.5 transition-opacity hover:opacity-60"
                                    style={{ color: "var(--mt-ink)", fontWeight: 500 }}
                                >
                                    {group.region}
                                    <span className="mt-num ml-1.5" style={{ color: "var(--mt-gray-light)" }}>{group.entries.length}</span>
                                </a>
                            ))}
                        </nav>
                    )}

                    {!entries.length && <p className="mt-body py-20 text-center">아직 공개된 변호사 블로그가 없습니다.</p>}

                    {regions.map((group, i) => (
                        <section key={group.region} id={`region-${i + 1}`} aria-labelledby={`region-${i + 1}-title`} className="pt-14 md:pt-16 scroll-mt-24">
                            <h2 id={`region-${i + 1}-title`} className="mt-h3">{group.region}</h2>
                            <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-16">
                                {group.entries.map((entry) => (
                                    <li key={entry.id} style={{ borderTop: "1px solid var(--mt-line)" }}>
                                        <LawyerBlogCard entry={entry} />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}

                    {specialties.length > 0 && (
                        <section aria-labelledby="specialty-title" className="pt-20 md:pt-24">
                            <h2 id="specialty-title" className="mt-h3">분야별로 찾기</h2>
                            <dl className="mt-6">
                                {specialties.map(({ specialty, entries: lawyers }) => (
                                    <div
                                        key={specialty}
                                        className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-x-10 gap-y-3 py-5"
                                        style={{ borderTop: "1px solid var(--mt-line)" }}
                                    >
                                        <dt className="text-[14.5px] font-semibold" style={{ color: "var(--mt-ink)" }}>{specialty}</dt>
                                        <dd className="flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
                                            {lawyers.map((entry) => (
                                                <Link key={entry.id} href={blogHref(entry.slug)} className="underline underline-offset-4 transition-opacity hover:opacity-60">
                                                    {entry.name} 변호사
                                                </Link>
                                            ))}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                        </section>
                    )}
                </Container>
            </section>
        </>
    );
}
