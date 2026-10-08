import type { Metadata } from "next";
import { blogHomeMetadata, renderBlogHome } from "./blog-home";

// 변호사 블로그 홈(1쪽). 예전에는 force-dynamic + searchParams 라 요청마다 데이터베이스를 4~6번 읽었다(응답 1.5~3초, no-store).
// 이제 1시간 캐시(ISR)하고 글이 바뀌면 바로 비운다(lib/lawyer-blog-cache.ts). ?page=N 은 미들웨어가 ./p/[page] 로 넘긴다.
export const revalidate = 3600;

// 빈 배열 + 기본 dynamicParams(true) = 방문된 변호사 블로그만 그때 만들어 캐시한다(매거진 글과 같은 방식).
export function generateStaticParams(): { slug: string }[] {
    return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    return blogHomeMetadata(slug, 1);
}

export default async function BlogPage({ params }: Props) {
    const { slug } = await params;
    return renderBlogHome(slug, 1);
}
