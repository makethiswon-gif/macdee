import type { Metadata } from "next";
import { Container, Section, Eyebrow, Button, ArrowLink } from "@/components/renewal/primitives";
import Reveal from "@/components/renewal/Reveal";
import { COMPANY, PRIMARY_CTA, path, absUrl, ogImage } from "@/data/renewal/site";
import { breadcrumbJsonLd, graph, organizationId } from "@/lib/renewal/schema";
import { renewalRobots } from "../flags";

// 문의.
//
// 폼을 두 개 두지 않는다. 리드 경로가 갈라지면 어느 쪽에서 왔는지 세기 어렵고,
// 상담 담당도 두 곳을 봐야 한다. 상세 요청은 전부 /renewal/diagnose 로 보낸다.
// 여기는 "바로 통화하고 싶은 사람"을 위한 페이지다.

const URL = absUrl("/contact");
const TITLE = "문의 | MAKETHIS1";
const DESC = "로펌 마케팅 관련 문의와 제안 요청을 받습니다. 전화 또는 진단 요청 양식으로 연락 주십시오.";

export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESC,
    alternates: { canonical: URL },
    robots: renewalRobots(),
    openGraph: { title: TITLE, description: DESC, url: URL, type: "website", locale: "ko_KR", images: [ogImage()] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const jsonLd = graph(
    {
        "@type": "ContactPage",
        "@id": `${URL}#webpage`,
        url: URL,
        name: TITLE,
        description: DESC,
        inLanguage: "ko-KR",
        about: { "@id": organizationId() },
    },
    breadcrumbJsonLd([
        { name: "홈", path: "/" },
        { name: "문의", path: "/contact" },
    ])
);

export default function Page() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <section className="mt-k-masthead" data-page="contact">
                <Container>
                    <Reveal>
                        <Eyebrow>Contact</Eyebrow>
                    </Reveal>
                    <Reveal index={1}>
                        <h1 className="mt-h1 mt-7 max-w-[18ch]">편하게 문의하세요.</h1>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body-lg mt-8 max-w-[560px]">
                            상담을 남기거나, 바로 전화 주세요.
                        </p>
                    </Reveal>
                </Container>
            </section>

            <Section tight>
                <Container>
                    <div
                        className="mt-k-contact-grid pt-12 grid grid-cols-1 md:grid-cols-2 gap-px"
                        style={{ borderTop: "1px solid var(--mt-line)", background: "var(--mt-line)" }}
                    >
                        <Reveal>
                            <div className="px-7 py-10 md:px-9 md:py-14 h-full" style={{ background: "var(--mt-bg)" }}>
                                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                    마케팅 상담
                                </p>
                                <h2 className="mt-h3 mt-5">지금 필요한 일부터.</h2>
                                <p className="mt-body mt-5 text-[14px]">
                                    광고·블로그·홈페이지를 확인하고 개선할 곳을 알려드립니다.
                                </p>
                                <div className="mt-9">
                                    <Button href={path(PRIMARY_CTA.href)} variant="primary">
                                        {PRIMARY_CTA.label} <span aria-hidden>→</span>
                                    </Button>
                                </div>
                            </div>
                        </Reveal>

                        <Reveal index={1}>
                            <div className="px-7 py-10 md:px-9 md:py-14 h-full" style={{ background: "var(--mt-bg)" }}>
                                <p className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                                    직접 연락
                                </p>

                                <div className="mt-8 flex flex-col gap-8">
                                    <div>
                                        <p className="text-[12.5px] mb-2" style={{ color: "var(--mt-gray)" }}>
                                            전화
                                        </p>
                                        <a
                                            href={`tel:${COMPANY.phone.replace(/-/g, "")}`}
                                            className="mt-k-phone mt-num text-[22px] font-medium tracking-tight hover:opacity-60"
                                        >
                                            {COMPANY.phone}
                                        </a>
                                    </div>

                                    <div>
                                        <p className="text-[12.5px] mb-2" style={{ color: "var(--mt-gray)" }}>
                                            주소
                                        </p>
                                        <p className="mt-body text-[14px]">{COMPANY.address}</p>
                                    </div>

                                    <div>
                                        <p className="text-[12.5px] mb-2" style={{ color: "var(--mt-gray)" }}>
                                            회사
                                        </p>
                                        <p className="mt-body text-[14px]">
                                            {COMPANY.legalName} · {COMPANY.brand}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <ArrowLink href={path("/about")}>회사와 팀 보기</ArrowLink>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </Container>
            </Section>
        </>
    );
}
