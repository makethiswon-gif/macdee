import type { Metadata } from "next";
import { Container, Section, Eyebrow, Button } from "@/components/renewal/primitives";
import Reveal from "@/components/renewal/Reveal";
import DiagnoseForm from "@/components/renewal/DiagnoseForm";
import { absUrl, ogImage } from "@/data/renewal/site";
import { breadcrumbJsonLd, graph, organizationId } from "@/lib/renewal/schema";
import { renewalRobots } from "../flags";

// P0-1 — 리뉴얼의 메인 CTA 목적지.
//
// 기존 /diagnose (맥디 무료 AI 진단) 와는 완전히 분리한다.
// 그쪽은 "블로그 URL 넣으면 AI가 1분 만에 무료 진단"하는 제품 화면이고,
// 여기는 사람이 광고·검색·홈페이지 구조를 보고 회신하는 요청 창구다.
// 자동·즉시·무료를 앞세우지 않는다.

const URL = absUrl("/diagnose");
const TITLE = "로펌 마케팅 구조 진단 | MAKETHIS1";
const DESC =
    "현재 운영 중인 광고, 블로그, 홈페이지를 함께 분석해 어디에서 고객이 빠져나가고 있는지 먼저 확인합니다.";

export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESC,
    alternates: { canonical: URL },
    robots: renewalRobots(),
    openGraph: { title: TITLE, description: DESC, url: URL, type: "website", locale: "ko_KR", images: [ogImage()] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const WHAT_WE_LOOK_AT = [
    {
        no: "01",
        title: "지금 어디에서 발견되고 있는가",
        desc: "검색광고, 자연 검색, 지도, 블로그 중 실제로 사람이 들어오는 경로를 확인합니다.",
    },
    {
        no: "02",
        title: "들어온 사람이 어디에서 사라지는가",
        desc: "홈페이지와 랜딩페이지에서 상담까지 가는 길이 끊기는 지점을 찾습니다.",
    },
    {
        no: "03",
        title: "상담이 어느 채널에서 왔는지 알 수 있는가",
        desc: "전화·카카오·폼이 각각 어디서 왔는지 구분되고 있는지 봅니다.",
    },
    {
        no: "04",
        title: "예산이 성과가 나는 곳에 가 있는가",
        desc: "클릭이 아니라 상담을 기준으로 예산 배분이 맞는지 확인합니다.",
    },
];

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
        { name: "마케팅 진단", path: "/diagnose" },
    ])
);

export default function Page() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <section className="mt-k-masthead" data-page="diagnose">
                <Container>
                    <Reveal>
                        <Eyebrow>Marketing Diagnosis</Eyebrow>
                    </Reveal>
                    <Reveal index={1}>
                        <h1 className="mt-h1 mt-7 max-w-[19ch]">
                            어디에서 고객이
                            <br />
                            빠져나가는지부터 봅니다.
                        </h1>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body-lg mt-8 max-w-[620px]">
                            제안서를 먼저 드리지 않습니다. 현재 운영 중인 광고, 블로그, 홈페이지를 함께
                            확인해 지금 무엇이 새고 있는지 먼저 말씀드립니다.
                        </p>
                    </Reveal>
                    {/* 긴 페이지 상단에서 곧바로 요청 폼으로 내려가는 경로 */}
                    <Reveal index={3}>
                        <div className="mt-10">
                            <Button href="#form">
                                진단 요청하기 <span aria-hidden>↓</span>
                            </Button>
                        </div>
                    </Reveal>
                </Container>
            </section>

            {/* 무엇을 보는가 */}
            <Section tight>
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 lg:gap-20">
                        <Reveal>
                            <div>
                                <Eyebrow>What we look at</Eyebrow>
                                <h2 className="mt-h3 mt-5">네 가지를 봅니다.</h2>
                                <p className="mt-body mt-5 text-[13.5px]">
                                    자동으로 점수를 매기는 리포트가 아닙니다. 담당자가 직접 확인하고
                                    설명드립니다.
                                </p>
                            </div>
                        </Reveal>

                        <ol>
                            {WHAT_WE_LOOK_AT.map((w, i) => (
                                <Reveal key={w.no} as="li" index={i % 3}>
                                    <div
                                        className="grid grid-cols-1 md:grid-cols-[60px_1fr] gap-x-6 gap-y-2 py-7"
                                        style={{ borderTop: "1px solid var(--mt-line)" }}
                                    >
                                        <span
                                            className="mt-en mt-num text-[12px] font-medium pt-1"
                                            style={{ color: "var(--mt-accent)" }}
                                        >
                                            {w.no}
                                        </span>
                                        <div>
                                            <h3 className="mt-h3">{w.title}</h3>
                                            <p className="mt-body mt-3 max-w-[520px]">{w.desc}</p>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                            <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                        </ol>
                    </div>
                </Container>
            </Section>

            {/* 폼 */}
            <Section id="form">
                <Container>
                    <div className="mb-12">
                        <Eyebrow>Request</Eyebrow>
                        <h2 className="mt-h2 mt-6">진단 요청</h2>
                        <p className="mt-body mt-6 max-w-[560px]">
                            아는 만큼만 채우셔도 됩니다. 비워두신 항목은 확인 과정에서 함께 여쭙습니다.
                        </p>
                    </div>
                    <DiagnoseForm />
                </Container>
            </Section>
        </>
    );
}
