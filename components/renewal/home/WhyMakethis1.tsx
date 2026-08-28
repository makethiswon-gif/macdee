import Image from "next/image";
import { Container, Section, SectionHeader, ArrowLink } from "../primitives";
import Reveal from "../Reveal";
import Founder from "../Founder";
import { TEAM, DISCIPLINES, path } from "@/data/renewal/site";

// 첨부 1 — 왜 MAKETHIS1인가 (ONE BLUE THREAD, 1회 실행형).
//
// 다섯 직능이 얇은 파란 선으로 중앙의 ONE TEAM 에 연결된다(화면 진입 시 1회).
// 팀 사진은 문서 마스크가 열리듯 clip-path 로 공개되고,
// 흑백에서 정상 채도로 돌아온 뒤 이름·직함이 나타난다.
// 데이터·이력은 무수정. 확대·회전 없음.

// 5열 그리드의 각 칼럼 중심(%) — 연결선 시작점
const COL_X = [10, 30, 50, 70, 90];

export default function WhyMakethis1() {
    return (
        <Section data-clause="첨부 2">
            <Container>
                <SectionHeader
                    number="첨부 2"
                    eyebrow="Why MAKETHIS1"
                    serif
                    title={
                        <>
                            법률·콘텐츠·광고·검색을 아는 사람들이
                            <br />
                            하나의 팀으로
                        </>
                    }
                    lead="기자와 방송작가가 글을 쓰고, 법학 전공자가 검수하고, 퍼포먼스 담당이 예산을 조정합니다."
                />

                {/* 5개 직능 → ONE TEAM 연결 (1회 실행) */}
                <Reveal variant="fade">
                    <div className="mt-14 md:mt-20">
                        <div
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px"
                            style={{ background: "var(--mt-line)" }}
                        >
                            {DISCIPLINES.map((d) => (
                                <div key={d.en} className="px-6 py-8 h-full" style={{ background: "var(--mt-bg)" }}>
                                    <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                        {d.en}
                                    </p>
                                    <p className="mt-body mt-3 text-[13px]">{d.ko}</p>
                                </div>
                            ))}
                        </div>

                        {/* 연결선 — 각 직능에서 내려와 하나의 버스로 모인다 (데스크톱) */}
                        <div className="hidden lg:block" aria-hidden="true">
                            <svg
                                className="mt-team-lines w-full"
                                height="56"
                                viewBox="0 0 100 56"
                                preserveAspectRatio="none"
                            >
                                {COL_X.map((x) => (
                                    <path
                                        key={x}
                                        d={`M ${x} 0 L ${x} 28 L 50 28 L 50 56`}
                                        fill="none"
                                        stroke="var(--mt-accent)"
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        pathLength={1}
                                        opacity="0.6"
                                    />
                                ))}
                            </svg>
                        </div>
                        <div className="mt-team-node flex justify-center lg:-mt-1">
                            <span
                                className="mt-en text-[11px] font-medium px-4 pt-[8px] pb-[7px] rounded-[2px]"
                                style={{ border: "1px solid var(--mt-accent)", color: "var(--mt-accent)" }}
                            >
                                One Team
                            </span>
                        </div>
                    </div>
                </Reveal>

                {/* 대표 — 팀 그리드에 섞지 않는다 */}
                <div className="mt-16 md:mt-24">
                    <Founder />
                </div>

                {/* 팀 — 사진이 문서 마스크처럼 열린다 */}
                <div className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-12">
                    {TEAM.map((m, i) => (
                        <Reveal key={m.name} index={i % 3}>
                            <figure>
                                <div
                                    className="mt-photo-reveal relative w-full aspect-[3/4] overflow-hidden"
                                    style={{ background: "var(--mt-line)", ["--md" as string]: `${(i % 3) * 120}ms` }}
                                >
                                    <Image
                                        src={m.photo}
                                        alt={`${m.name} 프로필`}
                                        fill
                                        sizes="(max-width: 768px) 45vw, (max-width: 1024px) 30vw, 16vw"
                                        className="object-cover"
                                    />
                                </div>
                                <figcaption className="mt-photo-cap mt-4" style={{ ["--md" as string]: `${(i % 3) * 120}ms` }}>
                                    <p className="mt-en text-[9.5px] font-medium" style={{ color: "var(--mt-gray-light)" }}>
                                        {m.role}
                                    </p>
                                    <p className="mt-2 text-[15px] font-semibold" style={{ color: "var(--mt-ink)" }}>
                                        {m.name}
                                    </p>
                                    <p className="mt-body mt-2 text-[12px] leading-[1.65]">{m.background}</p>
                                </figcaption>
                            </figure>
                        </Reveal>
                    ))}
                </div>

                <Reveal index={1}>
                    <div className="mt-14">
                        <ArrowLink href={path("/about")}>팀과 회사 소개 보기</ArrowLink>
                    </div>
                </Reveal>
            </Container>
        </Section>
    );
}
