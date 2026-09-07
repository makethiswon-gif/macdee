import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/renewal/primitives";
import { COMPANY, path, absUrl, ogImage } from "@/data/renewal/site";
import { STANDARD_OFFER, UPGRADE_SERVICES, UPGRADE_EXTRAS, UPGRADE_FAQ } from "@/data/renewal/upgrade";
import { breadcrumbJsonLd, graph, organizationId } from "@/lib/renewal/schema";
import { renewalRobots } from "../flags";
import ConnectionArt from "./ConnectionArt";
import styles from "./upgrade.module.css";

const URL = absUrl("/upgrade");
const TITLE = "기존 고객 통합 상품 전환 안내 | MAKETHIS1";
const DESC = "월 250만원. 블로그 월 20회에 SEO·GEO, 홈페이지 연결, 키워드 광고, 상담 분석, 쓰레드·인스타그램 운영을 더합니다. 광고 매체비 별도.";
const REQUEST = "/diagnose?plan=standard#form";

export const metadata: Metadata = {
    title: { absolute: TITLE }, description: DESC,
    alternates: { canonical: URL }, robots: renewalRobots(),
    openGraph: { title: TITLE, description: DESC, url: URL, type: "website", locale: "ko_KR", images: [ogImage()] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const jsonLd = graph(
    { "@type": "WebPage", "@id": `${URL}#webpage`, url: URL, name: TITLE, description: DESC, inLanguage: "ko-KR", about: { "@id": organizationId() } },
    breadcrumbJsonLd([{ name: "홈", path: "/" }, { name: "기존 고객 전환 안내", path: "/upgrade" }]),
    { "@type": "FAQPage", mainEntity: UPGRADE_FAQ.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
);

export default function UpgradePage() {
    return (
        <div className={styles.page}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <section className={styles.hero} aria-labelledby="upgrade-title">
                <Container>
                    <p className={styles.eyebrow}>기존 고객을 위한 통합 운영 안내</p>
                    <div className={styles.heroGrid}>
                        <div>
                            <h1 id="upgrade-title" className={styles.title}>블로그는 이어가고.<br />마케팅은 넓히고.</h1>
                            <p className={styles.lead}>블로그 월 {STANDARD_OFFER.blogPosts}회에<br />검색·SNS·광고·상담 분석을 더합니다.</p>
                            <div className={styles.actions}>
                                <Link href={path(REQUEST)} className={styles.lightButton}>전환 상담하기 <span aria-hidden="true">↗</span></Link>
                                <Link href={path("/upgrade#included")} className={styles.textLink}>포함 업무 보기 <span aria-hidden="true">↓</span></Link>
                            </div>
                        </div>
                        <div className={styles.priceSheet}>
                            <p className={styles.sheetLabel}>STANDARD <span>통합 운영</span></p>
                            <p className={styles.price}><span className={styles.priceNumber}>{STANDARD_OFFER.monthlyPrice}</span><span>만원 / 월</span></p>
                            <div className={styles.sheetFoot}>
                                <p>블로그 월 {STANDARD_OFFER.blogPosts}회 포함</p>
                                <p>{STANDARD_OFFER.priceNote}</p>
                            </div>
                        </div>
                    </div>
                    <ConnectionArt />
                </Container>
            </section>

            <section className={styles.chapter} id="included" aria-labelledby="included-title">
                <Container>
                    <div className={styles.sectionTop}><span>01 / 포함 업무</span><span>한 팀에서 함께 운영합니다.</span></div>
                    <h2 id="included-title" className={styles.heading}>블로그를 중심으로.<br />필요한 채널을 함께.</h2>
                    <div className={styles.scopeGrid}>
                        <div className={styles.blogStatement}>
                            <p>매월, 블로그</p>
                            <div className={styles.postCount}>{STANDARD_OFFER.blogPosts}<span>회</span></div>
                            <p>기획 → 원고·이미지 → 검수 → 발행</p>
                            <p className={styles.small}>월 20회는 블로그 포스팅 기준입니다.<br />SNS 발행 횟수는 별도로 정합니다.</p>
                        </div>
                        <div className={styles.services}>
                            {UPGRADE_SERVICES.map((item, i) => (
                                <article key={item.title} className={styles.service}>
                                    <span className={styles.number} aria-hidden="true">0{i + 1}</span>
                                    <div><h3>{item.title}</h3><p>{item.text}</p></div>
                                    <Link href={path(item.href)} aria-label={item.label} className={styles.serviceLink}>↗</Link>
                                </article>
                            ))}
                        </div>
                    </div>
                    <div className={styles.extras}>
                        <p className={styles.extrasLabel}>이런 관리도 <br />함께합니다.</p>
                        {UPGRADE_EXTRAS.map(item => <div key={item.title}><h3>{item.title}</h3><p>{item.text}</p></div>)}
                    </div>
                </Container>
            </section>

            <section className={styles.connection} id="records" aria-labelledby="connection-title">
                <Container>
                    <div className={styles.sectionTop}><span>02 / 상담·사례 공유</span><span>월 1회 모아서 올려도 됩니다.</span></div>
                    <h2 id="connection-title" className={styles.heading}>현장의 기록이,<br />다음 광고의 기준으로.</h2>
                    <ol className={styles.flow}>
                        <li><span className={styles.flowLabel}>로펌에서</span><h3>간단히 올리고</h3><p>상담 내역·승소사례를 전용 자료함에.<br />제목과 핵심만 적거나 붙여넣으세요.</p></li>
                        <li><span className={styles.flowLabel}>메이크디스원이</span><h3>함께 분석하고</h3><p>실제 문의와 사건 결과를 살펴<br />집중할 분야와 로펌의 강점을 찾습니다.</p></li>
                        <li><span className={styles.flowLabel}>다음 운영에</span><h3>전략으로 반영</h3><p>광고 검색어·예산·콘텐츠 주제를 조정하고,<br />다음 운영 결과를 함께 확인합니다.</p></li>
                    </ol>
                    <p className={styles.connectionNote}>별도 보고서는 필요 없습니다. 상담은 ‘사건 분야·주요 질문·결과’, 승소사례는 ‘쟁점·대응·결과’ 정도면 됩니다.</p>
                    <p className={styles.connectionNote}>의뢰인 이름·연락처·사건번호 등 식별정보는 빼고 올려 주세요. 자료가 자동으로 공개되지는 않으며, 사례 콘텐츠 활용은 로펌과 먼저 확인합니다.</p>
                </Container>
            </section>

            <section className={styles.chapter} id="estimate" aria-labelledby="estimate-title">
                <Container>
                    <div className={styles.sectionTop}><span>03 / 비용과 범위</span><span>시작 전에 분명하게.</span></div>
                    <div className={styles.estimateGrid}>
                        <div><h2 id="estimate-title" className={styles.heading}>맡길 일은 넓게.<br />비용은 명확하게.</h2><Link href={path("/#plans")} className={styles.darkLink}>세 가지 상품 비교 <span aria-hidden="true">↗</span></Link></div>
                        <div className={styles.estimate}>
                            <div className={styles.total}><span>월 운영비</span><strong>{STANDARD_OFFER.monthlyPrice}<span>만원</span></strong></div>
                            <dl>
                                <div><dt>포함</dt><dd>블로그 월 20회와 위의 통합 운영 업무</dd></div>
                                <div><dt>광고 매체비</dt><dd>별도 · 집행 예산은 사전 협의</dd></div>
                                <div><dt>홈페이지</dt><dd>기존 사이트 연결 기준<br />신규 제작·대규모 개편은 별도</dd></div>
                                <div><dt>자료 공유</dt><dd>상담 내역·승소사례 간단 입력<br />월 1회 취합 가능 · 광고 전략에 반영</dd></div>
                                <div><dt>SNS</dt><dd>채널별 콘텐츠와 필요한 운영 활동<br />발행 횟수·활동 범위는 사전 합의</dd></div>
                                <div><dt>부가세</dt><dd>포함 여부는 최종 견적서에서 확인</dd></div>
                            </dl>
                        </div>
                    </div>
                </Container>
            </section>

            <section className={styles.transition} aria-labelledby="transition-title">
                <Container>
                    <div className={styles.sectionTop}><span>04 / 전환 순서</span><span>현재 운영부터 확인합니다.</span></div>
                    <h2 id="transition-title" className={styles.heading}>상의하고,<br />준비되면 시작합니다.</h2>
                    <ol className={styles.steps}>
                        <li><span>01</span><h3>현재 운영 확인</h3><p>기존 발행량·사이트·광고·SNS 계정을 함께 봅니다.</p></li>
                        <li><span>02</span><h3>범위와 시작일 합의</h3><p>필요한 채널과 예산, 검수 방식, 시작일을 서면으로 정합니다.</p></li>
                        <li><span>03</span><h3>통합 운영 시작</h3><p>합의한 일정으로 운영하고, 월간 성과와 다음 계획을 공유합니다.</p></li>
                    </ol>
                    <p className={styles.transitionNote}>이 안내만으로 기존 계약이나 요금이 자동 변경되지는 않습니다.</p>
                </Container>
            </section>

            <section className={styles.chapter} aria-labelledby="faq-title">
                <Container>
                    <div className={styles.faqGrid}>
                        <h2 id="faq-title" className={styles.heading}>궁금하실 점.</h2>
                        <div className={styles.faqs}>{UPGRADE_FAQ.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
                    </div>
                </Container>
            </section>

            <section className={styles.closing} aria-labelledby="closing-title">
                <Container>
                    <p className={styles.eyebrow}>블로그부터, 마케팅 전체까지.</p>
                    <h2 id="closing-title" className={styles.heading}>함께 넓혀볼까요?</h2>
                    <div className={styles.actions}>
                        <Link href={path(REQUEST)} className={styles.lightButton}>전환 상담하기 <span aria-hidden="true">↗</span></Link>
                        <a href={`tel:${COMPANY.phone.replace(/-/g, "")}`} className={styles.textLink}>{COMPANY.phone}</a>
                    </div>
                </Container>
            </section>
        </div>
    );
}
