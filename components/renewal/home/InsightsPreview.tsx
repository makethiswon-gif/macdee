import Link from "next/link";
import { formatKstDate } from "@/lib/renewal/magazine-display";
import { Container, Section, Eyebrow, ArrowLink } from "../primitives";
import { path } from "@/data/renewal/site";
import styles from "./editorial-motion.module.css";

// SECTION 07 — Insights.
//
// 카드 세 장을 나란히 두면 앞뒤 섹션과 똑같은 그리드가 또 반복된다.
// 매거진처럼 보이게 비대칭으로 짠다 — 왼쪽에 큰 기사 하나, 오른쪽에 목록 둘.
// URL 은 /magazine 그대로다. 라벨만 INSIGHTS. 데모에서는 path() 가
// 리스킨(/renewal/magazine)으로 보낸다.

export interface InsightItem {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
    published_at: string | null;
    cover_image_url?: string | null;
}

const formatDate = formatKstDate;

// Real, already-published cover art only. Articles without an asset retain an
// editorial type cover, never an invented photo or a generated case illustration.
function EditorialCover({ item, compact = false }: { item: InsightItem; compact?: boolean }) {
    return (
        <div className={`${styles.cover} ${compact ? styles.compactCover : ""}`} aria-hidden="true">
            {item.cover_image_url ? (
                // Existing magazine assets are not restricted to one image host.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.cover_image_url} alt="" loading="lazy" decoding="async" width="800" height="500" />
            ) : (
                <span className={styles.typeCover}>INSIGHTS</span>
            )}
            <span className={styles.coverRule} />
            <span className={styles.coverShutter} />
            <span className={styles.coverShutter} />
            <span className={styles.coverShutter} />
        </div>
    );
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

export default function InsightsPreview({ items, total }: { items: InsightItem[]; total?: number }) {
    if (!items.length) return null;

    const [lead, ...rest] = items;

    return (
        <Section data-clause="INSIGHTS" className={styles.magazineSection}>
            <Container>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <Eyebrow>Insights</Eyebrow>
                            {/* 규모 신호 — DB 실측값이라 항상 참(§42) */}
                            {typeof total === "number" && total > 0 && (
                                <>
                                    <span className="w-6 h-px" style={{ background: "var(--mt-line-strong)" }} />
                                    <span className="mt-en mt-label mt-num" style={{ color: "var(--mt-accent)" }}>
                                        발행 {total}편
                                    </span>
                                </>
                            )}
                        </div>
                        <h2 className="mt-h2">법무법인 마케팅, 먼저 읽어볼 글.</h2>
                    </div>
                    <div>
                        <ArrowLink href={path("/magazine")}>마케팅 매거진 전체 보기</ArrowLink>
                    </div>
                </div>

                <div className="mt-14 md:mt-18 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-20">
                    {/* The cover moves, not the title or its clickable target. */}
                    <div className={styles.magazineCard} data-home-motion="magazine-cover">
                        <Link
                            href={path(`/magazine/${lead.slug}`)}
                            className={`group block ${styles.leadLink}`}
                        >
                            <EditorialCover item={lead} />
                            <div className={styles.leadCopy}>
                                <Meta item={lead} accent />
                                <h3 className="mt-6 text-[clamp(1.35rem,2.3vw,1.85rem)] font-semibold leading-[1.38] tracking-tight">
                                    <span className="mt-underline">{lead.title}</span>
                                </h3>
                                <span
                                    className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium"
                                    style={{ color: "var(--mt-ink)" }}
                                >
                                    읽기
                                    <span className="transition-transform duration-200 group-hover:translate-x-1">
                                        →
                                    </span>
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* 목록 */}
                    <ul>
                        {rest.map((a) => (
                            <li key={a.id} className={styles.magazineCard} data-home-motion="magazine-cover">
                                <Link
                                    href={path(`/magazine/${a.slug}`)}
                                    className={`group py-8 ${styles.articleLink}`}
                                    style={{ borderTop: "1px solid var(--mt-line)" }}
                                >
                                    <div>
                                        <Meta item={a} />
                                        <h3 className="mt-4 text-[16px] font-semibold leading-[1.5] tracking-tight">
                                            <span className="mt-underline">{a.title}</span>
                                        </h3>
                                    </div>
                                    <EditorialCover item={a} compact />
                                </Link>
                            </li>
                        ))}
                        <li style={{ borderTop: "1px solid var(--mt-line)" }} />
                    </ul>
                </div>
            </Container>
        </Section>
    );
}
