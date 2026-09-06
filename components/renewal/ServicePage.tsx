import Link from "next/link";
import { Container, Section, SectionHeader, Eyebrow, Button, ArrowLink } from "./primitives";
import Reveal from "./Reveal";
import { PRIMARY_CTA, path } from "@/data/renewal/site";
import { getService, SERVICES_UPDATED_AT, type ServiceContent } from "@/data/renewal/services";

// 서비스 상세 공용 템플릿.
// RENEWAL_PLAN §7 의 GEO 구조를 그대로 따른다 —
// 정의 → 대상 → 문제 → 프로세스 → 지표 → FAQ → 갱신일 → 관련.
// 8개 페이지가 같은 뼈대를 쓰므로 여기를 고치면 전부 바뀐다.

export default function ServicePage({ service }: { service: ServiceContent }) {
    const related = service.related.map(getService).filter(Boolean) as ServiceContent[];

    return (
        <>
            {/* ── HERO ── */}
            <section className="mt-k-masthead" data-service={service.slug}>
                <Container>
                    <Reveal>
                        <nav aria-label="현재 위치" className="mb-8">
                            <ol className="flex items-center gap-2 text-[11.5px]" style={{ color: "var(--mt-gray)" }}>
                                <li>
                                    <Link href={path("/")} className="hover:opacity-60">
                                        홈
                                    </Link>
                                </li>
                                <li aria-hidden>/</li>
                                <li>
                                    <Link href={path("/lawfirm-marketing")} className="hover:opacity-60">
                                        서비스
                                    </Link>
                                </li>
                                <li aria-hidden>/</li>
                                <li style={{ color: "var(--mt-ink)" }}>{service.en}</li>
                            </ol>
                        </nav>
                    </Reveal>

                    <Reveal index={1}>
                        <Eyebrow>{service.en}</Eyebrow>
                    </Reveal>

                    <Reveal index={2}>
                        <h1 className="mt-h1 mt-7 max-w-[20ch]">{service.h1}</h1>
                    </Reveal>

                    <Reveal index={3}>
                        <p className="mt-body-lg mt-8 max-w-[600px]">{service.lead}</p>
                    </Reveal>
                </Container>
            </section>

            {/* ── 정의 · 대상 ── */}
            <Section tight>
                <Container>
                    <div
                        className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20 pt-12"
                        style={{ borderTop: "1px solid var(--mt-line)" }}
                    >
                        <Reveal>
                            <div>
                                <p className="mt-en mt-label mb-6" style={{ color: "var(--mt-gray)" }}>
                                    서비스 소개
                                </p>
                                <p className="mt-body-lg">{service.definition}</p>
                            </div>
                        </Reveal>

                        <Reveal index={1}>
                            <div>
                                <p className="mt-en mt-label mb-6" style={{ color: "var(--mt-gray)" }}>
                                    이런 로펌에 필요합니다
                                </p>
                                <ul className="flex flex-col gap-4">
                                    {service.forWhom.map((w) => (
                                        <li key={w} className="mt-body flex gap-3">
                                            <span aria-hidden style={{ color: "var(--mt-accent)" }}>
                                                —
                                            </span>
                                            <span>{w}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>
                    </div>
                </Container>
            </Section>

            {/* ── 문제 ── */}
            <Section dark tight>
                <Container>
                    <SectionHeader eyebrow="Check" title="이런 문제를 해결합니다." />
                    <ul className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12">
                        {service.problems.map((p, i) => (
                            <Reveal key={p} as="li" index={i % 2}>
                                <div className="py-6" style={{ borderTop: "1px solid var(--mt-line)" }}>
                                    <p className="text-[15px] leading-[1.7]" style={{ color: "var(--mt-bg)" }}>
                                        {p}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </ul>
                </Container>
            </Section>

            {/* ── 프로세스 ── */}
            <Section>
                <Container>
                    <SectionHeader eyebrow="Process" title="진행 순서" />
                    <ol className="mt-14">
                        {service.process.map((s, i) => (
                            <Reveal key={s.step} as="li" index={i % 3}>
                                <div
                                    className="mt-k-process grid grid-cols-1 md:grid-cols-[72px_280px_1fr] gap-x-8 gap-y-3 py-8"
                                    style={{ borderTop: "1px solid var(--mt-line)" }}
                                >
                                    <span
                                        className="mt-en mt-num text-[12px] font-medium pt-1"
                                        style={{ color: "var(--mt-accent)" }}
                                    >
                                        {s.step}
                                    </span>
                                    <h3 className="mt-h3">{s.title}</h3>
                                    <p className="mt-body max-w-[520px]">{s.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </ol>
                    <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                </Container>
            </Section>

            {/* ── 측정 지표 ── */}
            <Section tight>
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12 lg:gap-20">
                        <Reveal>
                            <div>
                                <Eyebrow>What we measure</Eyebrow>
                                <h2 className="mt-h3 mt-5">확인하는 성과</h2>
                            </div>
                        </Reveal>
                        <Reveal index={1}>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                                {service.metrics.map((m) => (
                                    <li
                                        key={m}
                                        className="py-4 text-[14.5px]"
                                        style={{ borderTop: "1px solid var(--mt-line)", color: "var(--mt-ink)" }}
                                    >
                                        {m}
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                    </div>
                </Container>
            </Section>

            {/* ── FAQ ── */}
            <Section>
                <Container>
                    <SectionHeader eyebrow="FAQ" title="자주 묻는 질문" />
                    <div className="mt-12 max-w-[880px]">
                        {service.faq.map((f, i) => (
                            <Reveal key={f.q} index={i % 3}>
                                <details className="mt-svc-details" style={{ borderTop: "1px solid var(--mt-line)" }}>
                                    <summary className="py-6 cursor-pointer font-semibold">{f.q}</summary>
                                    <p className="mt-body pb-6">{f.a}</p>
                                </details>
                            </Reveal>
                        ))}
                        <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                    </div>

                    <p className="mt-8 text-[12px]" style={{ color: "var(--mt-gray-light)" }}>
                        최종 업데이트 {SERVICES_UPDATED_AT} · 작성 MAKETHIS1 편집팀
                    </p>
                </Container>
            </Section>

            {/* ── 관련 · CTA ── */}
            <Section dark tight>
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-20 lg:items-end">
                        <div>
                            <Eyebrow>함께 보는 영역</Eyebrow>
                            <ul className="mt-6 flex flex-col gap-4">
                                {related.map((r) => (
                                    <li key={r.slug}>
                                        <ArrowLink href={path("/" + r.slug)}>
                                            <span style={{ color: "var(--mt-bg)" }}>{r.h1}</span>
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

/* FAQPage 스키마 — 서비스 페이지에만 붙인다(§22 남발 금지) */
export function serviceJsonLd(service: ServiceContent, url: string) {
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": `${url}#webpage`,
                url,
                name: service.metaTitle,
                description: service.metaDescription,
                inLanguage: "ko-KR",
                dateModified: SERVICES_UPDATED_AT,
            },
            {
                "@type": "FAQPage",
                "@id": `${url}#faq`,
                mainEntity: service.faq.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
            },
            // 화면의 breadcrumb nav 와 동일한 경로. url 에서 잘라내므로
            // 데모(/renewal/*)와 최종(/*) 어느 쪽에서도 맞는다.
            {
                "@type": "BreadcrumbList",
                "@id": `${url}#breadcrumb`,
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "홈",
                        item: url.replace(/\/[^/]+$/, "") || url,
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: "로펌 통합 마케팅",
                        item: `${url.replace(/\/[^/]+$/, "")}/lawfirm-marketing`,
                    },
                    { "@type": "ListItem", position: 3, name: service.metaTitle, item: url },
                ],
            },
        ],
    };
}
