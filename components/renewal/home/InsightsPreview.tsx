import Link from "next/link";
import { Container, Section, SectionHeader, ArrowLink } from "../primitives";
import Reveal from "../Reveal";

// SECTION 08 — Insights.
// 기존 매거진(91편)을 그대로 쓴다. URL은 /magazine 유지, 라벨만 INSIGHTS.
// 매거진이 없으면 섹션을 숨긴다.

export interface InsightItem {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
    published_at: string | null;
}

function formatDate(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function InsightsPreview({ items }: { items: InsightItem[] }) {
    if (!items.length) return null;

    return (
        <Section>
            <Container>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                    <SectionHeader
                        number="07"
                        eyebrow="Insights"
                        title="검색과 광고가 어떻게 움직이는지 계속 봅니다."
                    />
                    <Reveal index={1}>
                        <ArrowLink href="/magazine">전체 보기</ArrowLink>
                    </Reveal>
                </div>

                <div className="mt-14 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: "var(--mt-line)" }}>
                    {items.map((a, i) => (
                        <Reveal key={a.id} index={i}>
                            <Link
                                href={`/magazine/${a.slug}`}
                                className="group flex flex-col h-full px-7 py-9 md:px-8 md:py-11 transition-colors"
                                style={{ background: "var(--mt-bg)" }}
                            >
                                <div className="flex items-center gap-3">
                                    {a.category && (
                                        <span
                                            className="mt-en mt-label"
                                            style={{ color: "var(--mt-accent)" }}
                                        >
                                            {a.category}
                                        </span>
                                    )}
                                    <span
                                        className="mt-num text-[11.5px]"
                                        style={{ color: "var(--mt-gray-light)" }}
                                    >
                                        {formatDate(a.published_at)}
                                    </span>
                                </div>

                                <h3 className="mt-5 text-[16.5px] font-semibold leading-[1.5] tracking-tight">
                                    {a.title}
                                </h3>

                                {a.excerpt && (
                                    <p className="mt-body mt-4 text-[13.5px] line-clamp-3">{a.excerpt}</p>
                                )}

                                <span
                                    className="mt-auto pt-9 inline-flex items-center gap-1.5 text-[13px] font-medium"
                                    style={{ color: "var(--mt-ink)" }}
                                >
                                    읽기
                                    <span className="transition-transform duration-200 group-hover:translate-x-1">
                                        →
                                    </span>
                                </span>
                            </Link>
                        </Reveal>
                    ))}
                </div>
            </Container>
        </Section>
    );
}
