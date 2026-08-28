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
            <section className="pt-[120px] md:pt-[168px] pb-14 md:pb-20">
                <Container>
                    <Reveal>
                        <Eyebrow>Contact</Eyebrow>
                    </Reveal>
                    <Reveal index={1}>
                        <h1 className="mt-h1 mt-7 max-w-[18ch]">편하신 방법으로 연락 주십시오.</h1>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body-lg mt-8 max-w-[560px]">
                            현재 상황을 먼저 알려주시면 통화가 짧아집니다. 급하시면 바로 전화 주셔도 됩니다.
                        </p>
                    </Reveal>
                </Container>
            </section>

            <Section tight>
                <Container>
                    <div
                        className="pt-12 grid grid-cols-1 md:grid-cols-2 gap-px"
                        style={{ borderTop: "1px solid var(--mt-line)", background: "var(--mt-line)" }}
                    >
                        <Reveal>
                            <div className="px-7 py-10 md:px-9 md:py-14 h-full" style={{ background: "var(--mt-bg)" }}>
                                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                    진단 요청
                                </p>
                                <h2 className="mt-h3 mt-5">현재 운영 상태부터 보여드립니다.</h2>
                                <p className="mt-body mt-5 text-[14px]">
                                    광고·블로그·홈페이지를 함께 확인해 어디에서 고객이 빠져나가는지 먼저
                                    말씀드립니다. 제안서는 그다음입니다.
                                </p>
                                <div className="mt-9">
                                    <Button href={path(PRIMARY_CTA.href)} variant="primary">
                                        진단 요청하기 <span aria-hidden>→</span>
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
                                            className="mt-num text-[22px] font-medium tracking-tight hover:opacity-60"
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
