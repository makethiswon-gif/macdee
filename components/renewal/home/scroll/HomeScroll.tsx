import Link from "next/link";
import type { CSSProperties } from "react";
import type { InsightItem } from "@/lib/renewal/magazine";
import { formatKstDate } from "@/lib/renewal/magazine-display";
import { CASES } from "@/data/renewal/cases";
import {
    BEFORE_AFTER, COMPANY, CORPORATE_CLIENTS, FOUNDER, HERO_BEFORE, HERO_BODY, HERO_OVERLINE, JOURNEY_CHAIN, JOURNEY_NOTE,
    LAW_FIRM_PARTNERS, PLANS, PLANS_FAQ, PLANS_FOOTNOTE, PRIMARY_CTA, PROOF_STATS, SERVICES, TEAM, path,
} from "@/data/renewal/site";
import HomeScrollEngine from "./HomeScrollEngine";
import s from "./home-scroll.module.css";

/* 스크롤 홈(2026-11-15 대표 선택) — 내용은 서버에서 그대로 그리고(검색 엔진이 읽는다),
   움직임은 HomeScrollEngine(engine.ts · one3d.ts)이 data-* 속성으로 요소를 찾아 입힌다.
   구역 id 는 다른 페이지에서 걸어 둔 주소(/#system, /#plans)와 맞춘다. */

const pad = (n: number) => String(n).padStart(2, "0");
const row = (i: number): CSSProperties => ({ gridRow: `${i + 1} / span 2` });
const len = (v: string) => ({ "--len": v }) as CSSProperties;

// 왼쪽 점 내비(구역 순서 그대로)
const NAV: [string, string][] = [
    ["home", "Home"], ["one", "하나로"], ["scope", "워크플로우"], ["cases", "기록"], ["system", "구조"],
    ["clients", "함께한 이름"], ["team", "사람"], ["plans", "비용"], ["insights", "매거진"], ["contact", "문의"],
];
// 흩어진 여섯 조각의 이름표 — 한 팀으로 모이기 전의 모습
const ORDERS = ["광고대행사", "블로그 업체", "홈페이지 제작사", "SEO 업체", "보고서 4건", "연락 창구 5개"];

// 사례의 큰 숫자: 결과 가운데 "A → B" 꼴인 첫 줄을 쓴다
function bigOf(result: { metric: string; change: string }[]) {
    const r = result.find((x) => x.change.includes("→"));
    if (!r) return null;
    const [was, now] = r.change.split("→").map((t) => t.trim().replace(/^변호사\s*/, ""));
    return { was, now };
}

// 인트로를 틀 때만(세션 첫 방문 · 주소에 # 없음 · 움직임 줄이기 아님) 내용이 먼저 번쩍이지 않게 숨긴다
const INTRO_GATE = "try{if(!sessionStorage.getItem('hs-intro')&&!location.hash&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('hs-intro');setTimeout(function(){if(!window.__hsUp)document.documentElement.classList.remove('hs-intro')},6000)}}catch(e){}";

export default function HomeScroll({ insights, total }: { insights: InsightItem[]; total: number }) {
    const clients: [string, string][] = [...LAW_FIRM_PARTNERS.map((n): [string, string] => [n, ""]), ...CORPORATE_CLIENTS.map((n): [string, string] => [n, "기업 고객"])];
    const rows: [string, string][][] = [];
    for (let i = 0; i < clients.length; i += 3) rows.push(clients.slice(i, i + 3));
    const cases = CASES.slice(0, 3);
    const tel = `tel:${COMPANY.phone.replace(/[^0-9+]/g, "")}`;
    const cta = path(PRIMARY_CTA.href);

    return (
        <div className={s.root} data-hs>
            <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
            <div className={s.bg} data-hs-bg aria-hidden="true" />
            <div className={s.glow} data-hs-glow aria-hidden="true"><i className={s.gb} data-hs-gb /><i className={s.gl} data-hs-gl /></div>
            <canvas className={s.c3d} data-hs-c3d aria-hidden="true" />
            <div className={s.veil} aria-hidden="true" />
            <div className={s.labels} aria-hidden="true">
                {ORDERS.map((t, i) => <span key={t} className={s.plab} data-hs-lab><b>{pad(i + 1)}</b>{t}</span>)}
            </div>

            <nav className={s.side} data-hs-side aria-label="이 페이지의 구역">
                {NAV.map(([id, t]) => <a key={id} href={`#${id}`}><i /><span>{t}</span></a>)}
            </nav>
            <Link className={s.cta} href={cta}><i aria-hidden="true">→</i><span>{PRIMARY_CTA.label}</span></Link>
            <div className={s.pct} data-hs-pct aria-hidden="true"><b>000</b><i /></div>
            <div className={s.pre} aria-hidden="true"><b data-hs-pre>000</b><span>MAKE THIS ONE</span></div>

            <div className={s.main}>
                {/* 00 첫 화면 */}
                <section className={`${s.sec} ${s.tb} ${s.home}`} id="home" data-hs-sec data-tone="b">
                    <div className={s.hero}>
                        <div className={s.heroT}>
                            <p className={s.lab} data-fx="out">{HERO_OVERLINE}</p>
                            <h1 data-fx="out">로펌 마케팅에 <br />필요한 모든 것. <br /><em>메이크디스원 하나로</em></h1>
                        </div>
                        <div className={s.heroB} data-fx="out">
                            <p className={s.sub}>{HERO_BODY}</p>
                            <Link className={`${s.pill} ${s.fill}`} href={cta}>{PRIMARY_CTA.label} <i aria-hidden="true">↗</i></Link>
                            <ul className={s.stats}>
                                {PROOF_STATS.map((p) => <li key={p.label}><i className={s.rg} aria-hidden="true" /><p><b>{p.value}{p.suffix}</b><span>{p.label}</span></p></li>)}
                            </ul>
                        </div>
                    </div>
                    <p className={s.hint} data-fx="out" aria-hidden="true"><i />SCROLL</p>
                </section>

                {/* 01 하나로 — 고정 구역: 여섯 조각이 흩어졌다가 1 로 모인다 */}
                <section className={`${s.sec} ${s.tb} ${s.pin}`} id="one" data-hs-sec data-pin data-tone="b" style={len("360vh")}>
                    <div className={s.stage}>
                        <div className={s.oneL} data-hs-one>
                            <p className={s.lab}><b>01</b>ONE TEAM</p>
                            <h2>여러 업체 대신, <br />메이크디스원 하나로</h2>
                            <p className={s.ds}>광고대행사·블로그 업체·홈페이지 제작사·SEO 업체로 나뉘던 일을 한 팀이 맡습니다. 연락도, 계획도, 성과표도 하나입니다.</p>
                            <div className={s.ba}>
                                <div className={s.before}><p className={s.lab}>BEFORE</p><ul data-hs-before>{BEFORE_AFTER.before.items.map((t) => <li key={t}>{t}</li>)}</ul></div>
                                <div className={s.after}><p className={s.lab}>AFTER</p><ul data-hs-after>{BEFORE_AFTER.after.items.map((t) => <li key={t}>{t}</li>)}</ul></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 02 워크플로우 — 여섯 항목이 두 줄로 엇갈려 지나가고, 해당 조각이 1 에서 밀려 나온다 */}
                <section className={`${s.sec} ${s.tw}`} id="scope" data-hs-sec data-tone="w">
                    <div className={s.top}>
                        <h2 data-fx="title">메이크디스원 <br />워크플로우.</h2>
                        <p className={s.sideNote} data-fx>변호사법·대한변협 광고 규정을 준수하며, 법률 표현은 법학 전공자가 검수합니다.</p>
                    </div>
                    <div className={s.cols}>
                        {SERVICES.map((v, i) => (
                            <article key={v.no} className={s.it} data-fx data-svc={i} style={row(i)}>
                                <span className={s.gh} data-gh aria-hidden="true">{v.no}</span>
                                <p className={s.lab}>{v.en}</p>
                                <h3>{v.ko}</h3>
                                <p className={s.ds}>{v.summary}</p>
                                <ul className={s.pts}>{v.items.map((it) => <li key={it.label}>{it.label}{it.badge && <em>{it.badge}</em>}</li>)}</ul>
                                <Link className={s.more} href={path(v.href)}>{v.ko} 자세히 <span aria-hidden="true">→</span></Link>
                            </article>
                        ))}
                    </div>
                    <p className={s.foot} data-fx>운영 범위는 상품에 따라 다릅니다. 조건부 항목은 확정 서비스가 아니며, 필요성·광고 허용 여부에 따라 검토합니다.</p>
                </section>

                {/* 03 기록 — 고정 구역: 세 건이 가로로 지나간다 */}
                <section className={`${s.sec} ${s.tb} ${s.pin}`} id="cases" data-hs-sec data-pin data-tone="b" style={len("430vh")}>
                    <div className={`${s.stage} ${s.rec}`}>
                        <div className={s.recH} data-hs-rech>
                            <h2>약속 대신 <br />기록.</h2>
                            <p className={`${s.lab} ${s.recN}`}><b data-hs-recn>01</b>/ {pad(cases.length)}</p>
                        </div>
                        <div className={s.track} data-hs-track>
                            {cases.map((c, i) => {
                                const big = bigOf(c.result);
                                return (
                                    <article key={c.id} className={s.rc}>
                                        <p className={s.lab}><b>RECORD {pad(i + 1)}</b>{c.field}</p>
                                        {big && <p className={s.big}><span className={s.was}>{big.was}</span><i aria-hidden="true">→</i><span>{big.now}</span></p>}
                                        <ul className={s.res}>{c.result.map((r) => <li key={r.metric}><span>{r.metric}</span><b>{r.change}</b></li>)}</ul>
                                        {c.note && <p className={s.note}><b>덧붙임</b>{c.note}</p>}
                                    </article>
                                );
                            })}
                        </div>
                        <div className={s.recF} data-hs-recf>
                            <div className={s.recBar} data-hs-recbar><i /></div>
                            <Link className={s.more} href={path("/work")}>운영 사례 자세히 <span aria-hidden="true">→</span></Link>
                        </div>
                    </div>
                </section>

                {/* 04 구조 — 다른 페이지의 '운영 방식'(/#system) 이 여기로 온다 */}
                <section className={`${s.sec} ${s.tw}`} id="system" data-hs-sec data-tone="p">
                    <div className={s.top}>
                        <p className={s.lab} data-fx>WHY MAKETHIS1</p>
                        <h2 data-fx="title">기록이 <br />나오는 구조.</h2>
                        <p className={s.sideNote} data-fx>글 한 편, 광고 하나로 생긴 결과가 아닙니다. 네 가지가 같이 돌아갑니다.</p>
                    </div>
                    <div className={s.cols}>
                        <article className={s.it} data-fx style={row(0)}>
                            <span className={s.gh} data-gh aria-hidden="true">01</span><p className={s.lab}>ONE TEAM</p>
                            <h3>여러 업체 대신, <br />메이크디스원 하나로</h3>
                            <p className={s.ds}>광고대행사·블로그 업체·홈페이지 제작사·SEO 업체로 나뉘던 일을 한 팀이 맡습니다. 연락도, 계획도, 성과표도 하나입니다.</p>
                            <div className={s.g}>{HERO_BEFORE.map((v) => <s key={v}>{v}</s>)}<i aria-hidden="true">→</i><b>MAKETHIS1</b></div>
                        </article>
                        <article className={s.it} data-fx style={row(1)}>
                            <span className={s.gh} data-gh aria-hidden="true">02</span><p className={s.lab}>LEGAL</p>
                            <h3>법을 아는 사람이 <br />쓰고 검수합니다.</h3>
                            <p className={s.ds}>기자·방송작가 출신이 쓰고, 법학 전공자가 검수합니다. 변호사법·대한변협 광고 규정을 준수합니다.</p>
                            <div className={s.g}><s>국내 최고</s><s>승소 보장</s><s>만족도 최상</s></div>
                            <small>광고 규정에 걸리는 표현은 발행 전에 걸러 냅니다 · 검수 예시</small>
                        </article>
                        <article className={s.it} data-fx style={row(2)}>
                            <span className={s.gh} data-gh aria-hidden="true">03</span><p className={s.lab}>CONVERSION</p>
                            <h3>상담부터 수임까지 <br />디테일하게</h3>
                            <p className={s.ds}>상담이 들어온 경로와 비용을 비교해 다음 달 예산을 조정합니다. 조회수가 아니라 상담을 기준으로 봅니다.</p>
                            <div className={`${s.g} ${s.g3}`}><span>{JOURNEY_CHAIN[0]}</span><i aria-hidden="true" /><span>{JOURNEY_CHAIN[1]}</span><i aria-hidden="true" /><b>{JOURNEY_CHAIN[2]}</b></div>
                            <small>{JOURNEY_NOTE}</small>
                        </article>
                        <article className={s.it} data-fx style={row(3)}>
                            <span className={s.gh} data-gh aria-hidden="true">04</span><p className={s.lab}>AI SEARCH</p>
                            <h3>이제는 AI가 <br />먼저 소개합니다.</h3>
                            <p className={s.ds}>AI가 읽을 수 있도록 로펌 정보와 글을 정리합니다. 운영 중인 로펌의 네이버 블로그는 네이버 공식 통계에서 법률 블로그 중 AI 인용 횟수 최다 기록이 확인됐습니다.</p>
                            <div className={`${s.g} ${s.g4}`}><em>AI 검색이 광주·전라 지역 변호사 질문에 이 로펌을 소개합니다.</em></div>
                            <small>RECORD 01 · 2026년 8월 기준</small>
                        </article>
                    </div>
                </section>

                {/* 05 함께한 이름 */}
                <section className={`${s.sec} ${s.tb} ${s.names}`} id="clients" data-hs-sec data-tone="b">
                    <div className={s.top}>
                        <h2 data-fx="title">함께한 <br />이름.</h2>
                        <p className={`${s.sideNote} ${s.lab}`} data-fx>SELECTED CLIENTS — 법무법인 · 법률사무소 {LAW_FIRM_PARTNERS.length} / 기업 고객 {CORPORATE_CLIENTS.length}</p>
                    </div>
                    <div className={s.rows}>
                        {rows.map((r, k) => (
                            <ul key={k} className={s.row} data-fx={k % 2 ? "r" : "l"}>
                                {r.map(([n, tag], j) => <li key={n}><span>{pad(k * 3 + j + 1)}</span><b>{n}</b>{tag && <em>{tag}</em>}</li>)}
                            </ul>
                        ))}
                    </div>
                </section>

                {/* 06 사람 */}
                <section className={`${s.sec} ${s.tw}`} id="team" data-hs-sec data-tone="w">
                    <div className={s.top}>
                        <h2 data-fx="title">로펌 마케팅을 <br />맡는 사람들.</h2>
                        <p className={s.sideNote} data-fx>기자·방송작가 출신이 쓰고, 법학 전공자가 검수합니다.</p>
                    </div>
                    <div className={s.fd} data-fx>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <div className={`${s.ph} ${s.fp}`}><img src={FOUNDER.photo} alt={`${FOUNDER.name} 대표`} width="480" height="480" loading="lazy" decoding="async" /></div>
                        <div>
                            <p className={s.lab}>Founder · {FOUNDER.role} · {FOUNDER.name}</p>
                            <blockquote>“{FOUNDER.lead}”</blockquote>
                            <div className={s.fb}>
                                <div><p className={s.lab}>LEGAL</p><ul>{FOUNDER.career.legal.map((t) => <li key={t}>{t}</li>)}</ul></div>
                                <div><p className={s.lab}>MARKETING</p><ul>{FOUNDER.career.marketing.map((t) => <li key={t}>{t}</li>)}</ul></div>
                            </div>
                        </div>
                    </div>
                    <div className={`${s.cols} ${s.people}`}>
                        {TEAM.map((m, i) => (
                            <article key={m.name} className={s.it} data-fx style={row(i)}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <div className={s.ph}><img src={m.photo} alt="" width="380" height="380" loading="lazy" decoding="async" /></div>
                                <div><p className={s.lab}>{m.role}</p><h3>{m.name}</h3><p className={s.ds}>{m.background}</p></div>
                            </article>
                        ))}
                    </div>
                    <p className={s.foot} data-fx><Link className={s.more} href={path("/about")}>팀 소개 자세히 <span aria-hidden="true">→</span></Link></p>
                </section>

                {/* 07 비용 — 다른 페이지의 '비용'(/#plans) 이 여기로 온다 */}
                <section className={`${s.sec} ${s.tw}`} id="plans" data-hs-sec data-tone="p">
                    <div className={s.top}>
                        <h2 data-fx="title">세 가지 <br />전략.</h2>
                        <p className={s.sideNote} data-fx>광고 매체비는 별도입니다. 운영 범위는 성과와 목표에 따라 늘리거나 줄일 수 있습니다.</p>
                    </div>
                    <ul className={s.plans}>
                        {PLANS.map((p) => (
                            <li key={p.key} data-fx>
                                <div><p className={s.lab}>{p.en}{p.badge && <em>{p.badge}</em>}</p><h3>{p.ko}</h3></div>
                                <p className={s.ds}>{p.desc}<small>{p.includesLabel} {p.includes.join(" · ")}</small></p>
                                <p className={s.pr}><b>{p.price}</b><span>{p.priceNote}</span></p>
                            </li>
                        ))}
                    </ul>
                    <p className={s.foot} data-fx>{PLANS_FOOTNOTE}</p>
                    <div className={s.faq} data-fx>
                        <p className={s.lab}>자주 묻는 질문</p>
                        {PLANS_FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
                    </div>
                </section>

                {/* 08 매거진 */}
                {insights.length > 0 && (
                    <section className={`${s.sec} ${s.tw}`} id="insights" data-hs-sec data-tone="w">
                        <div className={s.top}>
                            <p className={s.lab} data-fx>INSIGHTS{total > 0 && <em>발행 {total}편</em>}</p>
                            <h2 data-fx="title">법무법인 마케팅, <br />먼저 읽어볼 글.</h2>
                        </div>
                        <ul className={s.ins}>
                            {insights.map((it) => (
                                <li key={it.id} data-fx>
                                    <Link href={path(`/magazine/${it.slug}`)}>
                                        <p className={s.lab}>{it.category && <span>{it.category}</span>}<time>{formatKstDate(it.published_at)}</time></p>
                                        <h3>{it.title}</h3>
                                        <i aria-hidden="true">→</i>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <p className={s.insF} data-fx><Link className={s.more} href={path("/magazine")}>마케팅 매거진 전체 보기 <span aria-hidden="true">↗</span></Link></p>
                    </section>
                )}

                {/* 09 문의 */}
                <section className={`${s.sec} ${s.tb} ${s.contact}`} id="contact" data-hs-sec data-tone="b">
                    <p className={s.lab} data-fx><b>RECORD 04</b>다음 기록은 변호사님의 로펌입니다</p>
                    <h2 data-fx="title">사건에 집중하세요. <br /><em>마케팅은 맡기세요.</em></h2>
                    <div className={s.ctB} data-fx>
                        <p>예산과 목표에 맞는 운영안을 제안합니다.</p>
                        <Link className={`${s.pill} ${s.fill}`} href={cta}>{PRIMARY_CTA.label} <i aria-hidden="true">↗</i></Link>
                        <a className={s.tel} href={tel}>전화 상담 — {COMPANY.phone}</a>
                    </div>
                </section>
            </div>

            <HomeScrollEngine />
        </div>
    );
}
