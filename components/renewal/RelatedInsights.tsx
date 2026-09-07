import Link from "next/link";
import { path } from "@/data/renewal/site";
import { getRelatedInsights } from "@/lib/renewal/magazine";
import { Container, Section, Eyebrow, ArrowLink } from "./primitives";

// 서버 HTML에 실제 발행글 링크를 제공한다. 주제가 맞는 글이 없으면 섹션을 생략한다.
export default async function RelatedInsights({ serviceSlug }: { serviceSlug: string }) {
    const articles = await getRelatedInsights(serviceSlug, 3);
    if (!articles.length) return null;

    return (
        <Section tight>
            <Container>
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <Eyebrow>Insights</Eyebrow>
                        <h2 className="mt-h3 mt-5">이 서비스를 이해하는 데 도움이 되는 글</h2>
                    </div>
                    <ArrowLink href={path("/magazine")}>마케팅 매거진</ArrowLink>
                </div>
                <ul className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6" data-related-insights={serviceSlug}>
                    {articles.map(article => (
                        <li key={article.slug} style={{ borderTop: "1px solid var(--mt-line)" }}>
                            <Link href={path(`/magazine/${article.slug}`)} className="group block py-6">
                                <p className="text-[11px]" style={{ color: "var(--mt-gray)" }}>{article.category || "마케팅 인사이트"}</p>
                                <h3 className="mt-3 text-[17px] leading-relaxed font-semibold">
                                    <span className="mt-underline">{article.title}</span>
                                </h3>
                                <span className="inline-block mt-5 text-[13px]">글 읽기 <span aria-hidden>↗</span></span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </Container>
        </Section>
    );
}
