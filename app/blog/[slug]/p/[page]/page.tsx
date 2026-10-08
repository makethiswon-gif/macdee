import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogHomeMetadata, renderBlogHome } from "../../blog-home";

// 변호사 블로그 글 목록 2쪽부터. 공개 주소는 그대로 /blog/{변호사}?page=N 이고, 미들웨어가 이 경로로 넘긴다(middleware.ts).
// searchParams 를 읽는 페이지는 캐시되지 않으므로 쪽 번호를 경로로 받아 1쪽과 똑같이 1시간 캐시(ISR)한다.
// 이 경로로 직접 들어오면 미들웨어가 ?page=N 주소로 돌려보낸다.
export const revalidate = 3600;

export function generateStaticParams(): { slug: string; page: string }[] {
    return [];
}

type Props = { params: Promise<{ slug: string; page: string }> };

/** 2쪽부터. 1쪽은 블로그 홈이다. */
function listPage(raw: string): number | null {
    return /^[1-9]\d{0,5}$/.test(raw) && Number(raw) >= 2 ? Number(raw) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, page } = await params;
    const number = listPage(page);
    if (!number) return { title: "페이지를 찾을 수 없습니다", robots: { index: false, follow: false } };
    return blogHomeMetadata(slug, number);
}

export default async function BlogListPage({ params }: Props) {
    const { slug, page } = await params;
    const number = listPage(page);
    if (!number) notFound();
    return renderBlogHome(slug, number);
}
