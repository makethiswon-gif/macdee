import Link from "next/link";
import { formatKstDate } from "@/lib/renewal/magazine-display";
import {
    CHANNEL_LEDGER,
    COMPANY,
    LEDGER_FOOTNOTE,
    NEW_CHANNEL_BODY,
    NEW_CHANNEL_TITLE,
    PRIMARY_CTA,
    path,
} from "@/data/renewal/site";
import type { InsightItem } from "../InsightsPreview";
import PlansSection from "../PlansSection";
import s from "./closing-spreads.module.css";

/** A new insert remains conditional, including in the completed artwork. */
export function ChannelEdition() {
    return (
        <section className={`${s.scene} ${s.channels}`} data-edition-section="CHANNELS">
            <div className={s.container}>
                <div className={s.channelSpread}>
                    <div className={s.channelCopy}>
                        <p className={s.eyebrow}>New Channels</p>
                        <h2 className={s.heading}>{NEW_CHANNEL_TITLE[0]}<br />{NEW_CHANNEL_TITLE[1]}</h2>
                        <p className={s.body}>{NEW_CHANNEL_BODY}</p>
                        <div className={s.channelEditionMark} aria-hidden="true"><span>ONE TEAM</span><b>＋</b></div>
                    </div>
                    <div className={`${s.scene} ${s.insertStage}`} data-edition-scene="channel-insert" aria-hidden="true">
                        <div className={s.existingEdition}>
                            <span>MAKETHIS1</span>
                            <strong>1</strong>
                            <div><span>광고</span><span>검색</span><span>콘텐츠</span></div>
                        </div>
                        <div className={s.insertPaper}>
                            <div className={s.paperTop}><span>NEW CHANNELS</span><span>＋</span></div>
                            <span className={s.insertPlus}>＋</span>
                            <strong>새 광고 채널</strong>
                            <div className={s.reviewLine}><span>허용 여부</span><span>필요성 검토</span></div>
                            <div className={s.insertCondition}>검토 후 편입</div>
                            <p>필요한 채널만<br /><b>같은 팀에서.</b></p>
                        </div>
                        <span className={s.insertRule} />
                    </div>
                </div>

                <details className={s.ledger}>
                    <summary>채널별 운영 현황 보기<span aria-hidden="true">＋</span></summary>
                    <div className={s.ledgerTable}>
                        <table>
                            <thead><tr>{["채널", "상태", "비고"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
                            <tbody>
                                {CHANNEL_LEDGER.map(row => (
                                    <tr key={row.channel}>
                                        <th scope="row">{row.channel}</th>
                                        <td><span className={s.status} data-active={row.status === "운영 중" ? "true" : undefined}>{row.status}</span></td>
                                        <td>{row.note ?? ""}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className={s.ledgerFootnote}>{LEDGER_FOOTNOTE}</p>
                </details>
            </div>
        </section>
    );
}

function ArticleMeta({ item }: { item: InsightItem }) {
    return <div className={s.articleMeta}>
        {item.category && <span>{item.category}</span>}
        <time>{formatKstDate(item.published_at)}</time>
    </div>;
}

/** The press crosses only the cover; the article name and link stay available. */
function PrintedCover({ item, compact = false }: { item: InsightItem; compact?: boolean }) {
    return (
        <div className={`${s.scene} ${s.cover} ${compact ? s.compactCover : ""}`} data-edition-scene="article-press" aria-hidden="true">
            {item.cover_image_url ? (
                // Existing editorial images can come from more than one host.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.cover_image_url} alt="" loading="lazy" decoding="async" width="800" height="500" />
            ) : <span className={s.typeCover}>INSIGHTS</span>}
            <span className={s.pressBlank} />
            <span className={s.inkRoller}><i /><i /><i /></span>
            <span className={s.coverRegistration} />
        </div>
    );
}

export function InsightEdition({ items, total }: { items: InsightItem[]; total?: number }) {
    if (!items.length) return null;
    const [lead, ...rest] = items;

    return (
        <section className={`${s.scene} ${s.insights}`} data-edition-scene="insights" data-edition-section="INSIGHTS">
            <div className={s.container}>
                <div className={s.insightMasthead} aria-hidden="true">INSIGHTS<span>↙</span></div>
                <div className={s.insightHeading}>
                    <div>
                        <div className={s.insightLabels}>
                            <p className={s.eyebrow}>Insights</p>
                            {typeof total === "number" && total > 0 && <span>발행 {total}편</span>}
                        </div>
                        <h2 className={s.heading}>법무법인 마케팅,<br />먼저 읽어볼 글.</h2>
                    </div>
                    <Link className={s.textLink} href={path("/magazine")}>마케팅 매거진 전체 보기 <span aria-hidden="true">↗</span></Link>
                </div>

                <div className={s.articleSpread}>
                    <article className={s.leadArticle}>
                        <Link href={path(`/magazine/${lead.slug}`)}>
                            <PrintedCover item={lead} />
                            <div className={s.leadCopy}>
                                <ArticleMeta item={lead} />
                                <h3>{lead.title}</h3>
                                <span className={s.readLink}>읽기 <span aria-hidden="true">→</span></span>
                            </div>
                        </Link>
                    </article>
                    <ul className={s.articleList}>
                        {rest.map(item => (
                            <li key={item.id}>
                                <Link href={path(`/magazine/${item.slug}`)}>
                                    <PrintedCover item={item} compact />
                                    <div><ArticleMeta item={item} /><h3>{item.title}</h3></div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

/** Reuse the authoritative estimate, including every price, condition and FAQ. */
export function PlanEdition() {
    return <div className={`${s.scene} ${s.plans}`} data-edition-scene="estimate-fan">
        <div className={s.estimateRunningHead} aria-hidden="true"><span>MAKETHIS1</span><span>SAMPLE ESTIMATE</span><span>01 / 02 / 03</span></div>
        <PlansSection homeMotion={false} />
    </div>;
}

/** Paper curtains reveal a single blue field; the contact controls never move. */
export function ContactEdition() {
    return (
        <section className={`${s.scene} ${s.contact}`} data-edition-scene="contact-curtain" data-edition-section="CONTACT">
            <div className={s.contactArtwork} aria-hidden="true">
                <span className={s.contactOne}>1</span>
                <div className={s.curtainLeft}><span>MAKE</span></div>
                <div className={s.curtainRight}><span>THIS1.</span></div>
            </div>
            <div className={`${s.container} ${s.contactContent}`}>
                <div className={s.contactTopline}><span>MAKETHIS1</span><span aria-hidden="true">↙</span></div>
                <div className={s.contactCopy}>
                    <p className={s.eyebrow}>Contact</p>
                    <h2><span>사건에 집중하세요.</span><span>마케팅은 맡기세요.</span></h2>
                    <p className={s.contactBody}>예산과 목표에 맞는 운영안을 제안합니다.</p>
                    <div className={s.contactActions}>
                        <Link className={s.primaryAction} href={path(PRIMARY_CTA.href)}>{PRIMARY_CTA.label}<span aria-hidden="true">→</span></Link>
                        <Link className={s.secondaryAction} href={path("/contact")}>연락처 보기</Link>
                        <Link className={s.costAction} href={path("/#plans")}>비용 다시 보기</Link>
                    </div>
                    <p className={s.phone}>전화 상담&nbsp;— <a href={`tel:${COMPANY.phone.replace(/-/g, "")}`}>{COMPANY.phone}</a></p>
                </div>
                <div className={s.contactColophon} aria-hidden="true"><span>MAKE THIS1.</span><span>LAW FIRM MARKETING</span></div>
            </div>
        </section>
    );
}
