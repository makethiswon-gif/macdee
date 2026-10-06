import Link from "next/link";
import type { ReactNode } from "react";
import { Container, Section, Eyebrow, Button, ArrowLink } from "./primitives";
import Reveal from "./Reveal";
import RelatedInsights from "./RelatedInsights";
import { COMPANY, PRIMARY_CTA, path, absUrl } from "@/data/renewal/site";
import { GUIDES_UPDATED_AT, type GuideBlock, type GuideContent } from "@/data/renewal/guides";
import { breadcrumbJsonLd, organizationId } from "@/lib/renewal/schema";

// 키워드 가이드 공용 템플릿 (/lawyer-marketing, /lawyer-advertising).
// 서비스 페이지(ServicePage)가 "우리가 하는 일"이라면, 가이드는 "검색한 사람이 궁금한 것"에 먼저 답한다.
// 본문은 서버 HTML 로 전부 렌더한다 — Reveal 은 장식이고, JS 가 없어도 내용이 보인다.

/* ── 인라인 표기: [글](경로) 링크, **굵게** ── */
function Inline({ text }: { text: string }) {
    const parts: ReactNode[] = [];
    const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        const [, label, href, bold] = match;
        if (bold) {
            parts.push(<strong key={match.index}>{bold}</strong>);
        } else if (/^https?:\/\//.test(href)) {
            parts.push(<a key={match.index} href={href} target="_blank" rel="noopener noreferrer">{label}</a>);
        } else {
            parts.push(<Link key={match.index} href={path(href)}>{label}</Link>);
        }
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return <>{parts}</>;
}

function Block({ block }: { block: GuideBlock }) {
    if ("p" in block) return <p><Inline text={block.p} /></p>;
    if ("ul" in block) return <ul>{block.ul.map((li) => <li key={li}><Inline text={li} /></li>)}</ul>;
    if ("ol" in block) return <ol>{block.ol.map((li) => <li key={li}><Inline text={li} /></li>)}</ol>;
    if ("note" in block) return <blockquote><p><Inline text={block.note} /></p></blockquote>;
    return (
        <div className="mt-guide-table" role="region" aria-label={block.table.caption} tabIndex={0}>
            <table>
                <caption>{block.table.caption}</caption>
                <thead>
                    <tr>{block.table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
                </thead>
                <tbody>
                    {block.table.rows.map((row) => (
                        <tr key={row[0]}>
                            {row.map((cell, i) => i === 0
                                ? <th key={i} scope="row"><Inline text={cell} /></th>
                                : <td key={i}><Inline text={cell} /></td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function GuidePage({ guide }: { guide: GuideContent }) {
    return (
        <>
            {/* ── HERO ── */}
            <section className="mt-k-masthead" data-guide={guide.slug}>
                <Container>
                    <Reveal>
                        <nav aria-label="현재 위치" className="mb-8">
                            <ol className="flex flex-wrap items-center gap-2 text-[11.5px]" style={{ color: "var(--mt-gray)" }}>
                                <li><Link href={path("/")} className="hover:opacity-60">홈</Link></li>
                                <li aria-hidden>/</li>
                                <li style={{ color: "var(--mt-ink)" }}>{guide.name}</li>
                            </ol>
                        </nav>
                    </Reveal>
                    <Reveal index={1}>
                        <Eyebrow>{guide.name}</Eyebrow>
                    </Reveal>
                    <Reveal index={2}>
                        <h1 className="mt-h1 mt-7 max-w-[20ch]">{guide.h1}</h1>
                    </Reveal>
                    <Reveal index={3}>
                        <p className="mt-body-lg mt-8 max-w-[640px]">{guide.lead}</p>
                    </Reveal>
                    <Reveal index={4}>
                        <p className="mt-8 text-[12.5px]" style={{ color: "var(--mt-gray)" }}>
                            최종 업데이트 <time dateTime={GUIDES_UPDATED_AT}>{GUIDES_UPDATED_AT}</time> · 작성 MAKETHIS1 편집팀
                        </p>
                    </Reveal>
                </Container>
            </section>

            {/* ── 목차 + 본문 ── */}
            <Section tight>
                <Container>
                    <div
                        className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,720px)] gap-10 lg:gap-20 pt-12"
                        style={{ borderTop: "1px solid var(--mt-line)" }}
                    >
                        <nav aria-labelledby={`${guide.slug}-toc`} className="lg:sticky lg:top-28 lg:self-start">
                            <p id={`${guide.slug}-toc`} className="mt-en mt-label mb-4" style={{ color: "var(--mt-gray)" }}>
                                목차
                            </p>
                            <ol className="flex flex-col gap-2.5 text-[13.5px]">
                                {guide.sections.map((s, i) => (
                                    <li key={s.id} className="flex gap-3">
                                        <span className="mt-num shrink-0" style={{ color: "var(--mt-accent)" }}>
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        <a href={`#${s.id}`} className="hover:opacity-60" style={{ color: "var(--mt-ink)" }}>
                                            {s.heading}
                                        </a>
                                    </li>
                                ))}
                                <li className="flex gap-3">
                                    <span className="mt-num shrink-0" style={{ color: "var(--mt-accent)" }}>Q</span>
                                    <a href="#faq" className="hover:opacity-60" style={{ color: "var(--mt-ink)" }}>자주 묻는 질문</a>
                                </li>
                            </ol>
                        </nav>

                        <article className="mt-article mt-guide min-w-0">
                            {guide.sections.map((s) => (
                                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
                                    <h2 id={`${s.id}-h`}>{s.heading}</h2>
                                    {s.blocks.map((b, i) => <Block key={i} block={b} />)}
                                </section>
                            ))}

                            {guide.disclaimer && (
                                <blockquote><p>{guide.disclaimer}</p></blockquote>
                            )}

                            {guide.sources && guide.sources.length > 0 && (
                                <section aria-labelledby={`${guide.slug}-sources`}>
                                    <h2 id={`${guide.slug}-sources`}>출처</h2>
                                    <ul>
                                        {guide.sources.map((s) => (
                                            <li key={s.href}>
                                                <a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </article>
                    </div>
                </Container>
            </Section>

            {/* ── FAQ ── */}
            <Section id="faq">
                <Container>
                    <h2 className="mt-h2 max-w-[820px]">자주 묻는 질문</h2>
                    <div className="mt-12 max-w-[880px]">
                        {guide.faq.map((f) => (
                            <details key={f.q} className="mt-svc-details" style={{ borderTop: "1px solid var(--mt-line)" }}>
                                <summary className="py-6 cursor-pointer font-semibold">{f.q}</summary>
                                <p className="mt-body pb-6">{f.a}</p>
                            </details>
                        ))}
                        <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                    </div>
                </Container>
            </Section>

            <RelatedInsights serviceSlug={guide.slug} />

            {/* ── 함께 보는 페이지 · CTA ── */}
            <Section dark tight>
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-20 lg:items-end">
                        <div>
                            <Eyebrow>함께 보는 페이지</Eyebrow>
                            <ul className="mt-6 flex flex-col gap-4">
                                {guide.related.map((r) => (
                                    <li key={r.href}>
                                        <ArrowLink href={path(r.href)}>
                                            <span style={{ color: "var(--mt-bg)" }}>{r.label}</span>
                                        </ArrowLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Reveal>
                            <div className="shrink-0">
                                <Button href={path(PRIMARY_CTA.href)} variant="outline">
                                    {PRIMARY_CTA.label} <span aria-hidden>→</span>
                                </Button>
                            </div>
                        </Reveal>
                    </div>
                </Container>
            </Section>
        </>
    );
}

/* Article + FAQPage + BreadcrumbList. 화면에 보이는 내용만 담는다. */
export function guideJsonLd(guide: GuideContent, url: string) {
    const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": `${url}#article`,
                headline: guide.h1,
                name: guide.metaTitle,
                description: guide.metaDescription,
                url,
                inLanguage: "ko-KR",
                datePublished: GUIDES_UPDATED_AT,
                dateModified: GUIDES_UPDATED_AT,
                author: { "@type": "Organization", name: "MAKETHIS1 편집팀", url: absUrl("/about") },
                publisher: { "@type": "Organization", "@id": organizationId(), name: COMPANY.brand, url: COMPANY.site },
                mainEntityOfPage: url,
                isPartOf: { "@id": `${absUrl("/")}#website` },
                articleSection: guide.sections.map((s) => s.heading),
            },
            {
                "@type": "FAQPage",
                "@id": `${url}#faq`,
                mainEntity: guide.faq.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: plain(f.a) },
                })),
            },
            breadcrumbJsonLd([
                { name: "홈", path: "/" },
                { name: guide.name, path: `/${guide.slug}` },
            ]),
        ],
    };
}
