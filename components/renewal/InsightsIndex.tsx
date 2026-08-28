"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { path } from "@/data/renewal/site";

// INSIGHTS 목록 — 카테고리 필터 + 리드 기사 + 목록.
//
// 필터는 클라이언트에서만 돈다. searchParams 로 하면 페이지가 동적 렌더링이
// 되어 ISR 캐시(전환기 안정성 대책)가 깨진다. 60편 텍스트 메타는 가볍다.
//
// 필터 전환 시 리스트에 리빌 애니메이션을 걸지 않는다 — 탭을 누를 때마다
// 화면이 출렁이는 것은 §18(절제)에 어긋난다. 등장 연출은 페이지 헤더만 갖는다.

export interface InsightListItem {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
    cover_image_url: string | null;
    published_at: string | null;
    author: string | null;
}

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

export default function InsightsIndex({ items }: { items: InsightListItem[] }) {
    const [active, setActive] = useState<string | null>(null);

    // 카테고리는 글 수 내림차순. 한 편뿐인 카테고리도 그대로 보여준다 —
    // 실제 발행 현황이 곧 목차다.
    const categories = useMemo(() => {
        const count = new Map<string, number>();
        for (const it of items) {
            if (!it.category) continue;
            count.set(it.category, (count.get(it.category) ?? 0) + 1);
        }
        return [...count.entries()].sort((a, b) => b[1] - a[1]);
    }, [items]);

    const filtered = active ? items.filter((it) => it.category === active) : items;
    const [lead, ...rest] = filtered;

    return (
        <div>
            {/* ── 필터 ── */}
            {categories.length > 1 && (
                <div
                    className="flex flex-wrap items-center gap-x-6 gap-y-3 py-5"
                    style={{ borderTop: "1px solid var(--mt-ink)", borderBottom: "1px solid var(--mt-line)" }}
                    role="group"
                    aria-label="카테고리 필터"
                >
                    <button
                        onClick={() => setActive(null)}
                        aria-pressed={active === null}
                        className="mt-en mt-label transition-opacity hover:opacity-60"
                        style={{ color: active === null ? "var(--mt-ink)" : "var(--mt-gray-light)" }}
                    >
                        All
                        <span className="mt-num ml-1.5" style={{ color: "var(--mt-gray-light)" }}>
                            {items.length}
                        </span>
                    </button>
                    {categories.map(([cat, n]) => (
                        <button
                            key={cat}
                            onClick={() => setActive(active === cat ? null : cat)}
                            aria-pressed={active === cat}
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
                        </button>
                    ))}
                </div>
            )}

            {!filtered.length && (
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
        </div>
    );
}
