import Link from "next/link";
import { path } from "@/data/renewal/site";
import { insightIndexHref, type InsightItem } from "@/lib/renewal/magazine";

// INSIGHTS 목록 — 카테고리 필터 + 리드 기사 + 목록.
//
// Category and page navigation use actual links so the entire archive is
// reachable in the original HTML, including when JavaScript is disabled.
export type InsightListItem = InsightItem;

function formatDate(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function Meta({ item, accent = false }: { item: InsightListItem; accent?: boolean }) {
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

export default function InsightsIndex({ items, categories, active, total, page, totalPages }: {
    items: InsightListItem[];
    categories: [string, number][];
    active: string | null;
    total: number;
    page: number;
    totalPages: number;
}) {
    const [lead, ...rest] = items;

    return (
        <div>
            {/* ── 필터 ── */}
            {categories.length > 1 && (
                <nav
                    className="flex flex-wrap items-center gap-x-6 gap-y-3 py-5"
                    style={{ borderTop: "1px solid var(--mt-ink)", borderBottom: "1px solid var(--mt-line)" }}
                    aria-label="매거진 카테고리"
                >
                    <Link
                        href={insightIndexHref()}
                        aria-current={active === null ? "page" : undefined}
                        className="mt-en mt-label transition-opacity hover:opacity-60"
                        style={{ color: active === null ? "var(--mt-ink)" : "var(--mt-gray-light)" }}
                    >
                        전체
                        <span className="mt-num ml-1.5" style={{ color: "var(--mt-gray-light)" }}>
                            {total}
                        </span>
                    </Link>
                    {categories.map(([cat, n]) => (
                        <Link
                            key={cat}
                            href={insightIndexHref(1, cat)}
                            aria-current={active === cat ? "page" : undefined}
                            className="mt-label transition-opacity hover:opacity-60"
                            style={{
                                color: active === cat ? "var(--mt-ink)" : "var(--mt-gray-light)",
                                fontWeight: 500,
                            }}
                        >
                            {cat}
                            <span className="mt-num ml-1.5" style={{ color: "var(--mt-gray-light)" }}>
                                {n}
                            </span>
                        </Link>
                    ))}
                </nav>
            )}

            {!items.length && (
                <p className="mt-body py-20 text-center">이 카테고리에는 아직 발행된 글이 없습니다.</p>
            )}

            {/* ── 리드 기사 ── */}
            {lead && (
                <Link
                    href={path(`/magazine/${lead.slug}`)}
                    className="group grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-16 py-12 md:py-16 items-center"
                >
                    <div>
                        <Meta item={lead} accent />
                        <h2 className="mt-6 text-[clamp(1.5rem,2.8vw,2.2rem)] font-semibold leading-[1.32] tracking-tight">
                            <span className="mt-underline">{lead.title}</span>
                        </h2>
                        {lead.excerpt && (
                            <p className="mt-body mt-6 line-clamp-3 max-w-[52ch]">{lead.excerpt}</p>
                        )}
                        <span
                            className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium"
                            style={{ color: "var(--mt-ink)" }}
                        >
                            읽기
                            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                        </span>
                    </div>
                    {lead.cover_image_url && (
                        <div
                            className="overflow-hidden rounded-[4px] order-first lg:order-none"
                            style={{ border: "1px solid var(--mt-line)" }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={lead.cover_image_url}
                                alt=""
                                className="w-full aspect-[16/10] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                            />
                        </div>
                    )}
                </Link>
            )}

            {/* ── 목록 ── */}
            {rest.length > 0 && (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-16">
                    {rest.map((a) => (
                        <li key={a.id} style={{ borderTop: "1px solid var(--mt-line)" }}>
                            <Link href={path(`/magazine/${a.slug}`)} className="group block py-8">
                                <Meta item={a} />
                                <h3 className="mt-4 text-[16.5px] font-semibold leading-[1.5] tracking-tight">
                                    <span className="mt-underline">{a.title}</span>
                                </h3>
                                {a.excerpt && (
                                    <p className="mt-body mt-3 text-[13.5px] line-clamp-2">{a.excerpt}</p>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {totalPages > 1 && (
                <nav aria-label="매거진 페이지" className="mt-14 flex flex-wrap items-center justify-center gap-2 border-t pt-8" style={{ borderColor: "var(--mt-line)" }}>
                    {page > 1 && (
                        <Link href={insightIndexHref(page - 1, active)} rel="prev" className="px-3 py-3 text-[13px]">← 이전</Link>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                        <Link key={number} href={insightIndexHref(number, active)} aria-label={`${number}페이지`} aria-current={page === number ? "page" : undefined}
                            className="mt-num flex h-11 min-w-11 items-center justify-center text-[13px]"
                            style={{ background: page === number ? "var(--mt-ink)" : undefined, color: page === number ? "var(--mt-bg)" : "var(--mt-ink)" }}>
                            {number}
                        </Link>
                    ))}
                    {page < totalPages && (
                        <Link href={insightIndexHref(page + 1, active)} rel="next" className="px-3 py-3 text-[13px]">다음 →</Link>
                    )}
                </nav>
            )}
        </div>
    );
}
