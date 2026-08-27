import Link from "next/link";
import { Container, Section, Eyebrow, ArrowLink } from "../primitives";
import Reveal from "../Reveal";

// SECTION 07 — Insights.
//
// 카드 세 장을 나란히 두면 앞뒤 섹션과 똑같은 그리드가 또 반복된다.
// 매거진처럼 보이게 비대칭으로 짠다 — 왼쪽에 큰 기사 하나, 오른쪽에 목록 둘.
// URL 은 /magazine 그대로다. 라벨만 INSIGHTS.

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

function Meta({ item, accent = false }: { item: InsightItem; accent?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            {item.category && (
                <span
                    className="mt-en mt-label"
                    style={{ color: accent ? "var(--mt-accent)" : "var(--mt-gray)" }}
                >
                    {item.category}
                </span>
            )}
            <span className="mt-num text-[11.5px]" style={{ color: "var(--mt-gray-light)" }}>
                {formatDate(item.published_at)}
            </span>
        </div>
    );
}

export default function InsightsPreview({ items }: { items: InsightItem[] }) {
    if (!items.length) return null;

    const [lead, ...rest] = items;

    return (
        <Section>
            <Container>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <span className="mt-en mt-label mt-num" style={{ color: "var(--mt-accent)" }}>
                                07
                            </span>
                            <span className="w-6 h-px" style={{ background: "var(--mt-line-strong)" }} />
                            <Eyebrow>Insights</Eyebrow>
                        </div>
                        <Reveal variant="mask">
                            <h2 className="mt-h2">검색과 광고가 어떻게 움직이는지 계속 봅니다.</h2>
                        </Reveal>
                    </div>
                    <Reveal variant="rise" index={1}>
                        <ArrowLink href="/magazine">전체 보기</ArrowLink>
                    </Reveal>
                </div>

                <div className="mt-14 md:mt-18 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-20">
                    {/* 큰 기사 */}
                    <Reveal variant="rise">
                        <Link
                            href={`/magazine/${lead.slug}`}
                            className="group block pt-9"
                            style={{ borderTop: "2px solid var(--mt-ink)" }}
                        >
                            <Meta item={lead} accent />
                            <h3 className="mt-6 text-[clamp(1.35rem,2.3vw,1.85rem)] font-semibold leading-[1.38] tracking-tight">
                                <span className="mt-underline">{lead.title}</span>
                            </h3>
                            {lead.excerpt && (
                                <p className="mt-body mt-6 text-[14.5px] line-clamp-4 max-w-[46ch]">
                                    {lead.excerpt}
                                </p>
                            )}
                            <span
                                className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium"
                                style={{ color: "var(--mt-ink)" }}
                            >
                                읽기
                                <span className="transition-transform duration-200 group-hover:translate-x-1">
                                    →
                                </span>
                            </span>
                        </Link>
                    </Reveal>

                    {/* 목록 */}
                    <ul>
                        {rest.map((a, i) => (
                            <Reveal key={a.id} as="li" variant="rise" index={i + 1}>
                                <Link
                                    href={`/magazine/${a.slug}`}
                                    className="group block py-8"
                                    style={{ borderTop: "1px solid var(--mt-line)" }}
                                >
                                    <Meta item={a} />
                                    <h3 className="mt-4 text-[16px] font-semibold leading-[1.5] tracking-tight">
                                        <span className="mt-underline">{a.title}</span>
                                    </h3>
                                    {a.excerpt && (
                                        <p className="mt-body mt-3 text-[13px] line-clamp-2">{a.excerpt}</p>
                                    )}
                                </Link>
                            </Reveal>
                        ))}
                        <li style={{ borderTop: "1px solid var(--mt-line)" }} />
                    </ul>
                </div>
            </Container>
        </Section>
    );
}
