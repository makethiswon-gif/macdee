import Image from "next/image";
import { Eyebrow } from "./primitives";
import Reveal from "./Reveal";
import { FOUNDER } from "@/data/renewal/site";

// 대표.
//
// 팀 그리드 안에 6명 중 하나로 섞지 않는다.
// "법률을 아는 마케팅 회사"라는 주장의 근거가 이 사람의 이력에 그대로 있기 때문이다.
// 법무법인 세 곳과 대기업 마케팅 두 곳 — 지어낸 것이 아니라 기존 홈에 이미 있던 이력이다.

export default function Founder({ compact = false }: { compact?: boolean }) {
    const { name, role, photo, lead, career } = FOUNDER;

    return (
        <Reveal>
            <div
                className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 md:gap-12 lg:gap-16 pt-12"
                style={{ borderTop: "1px solid var(--mt-line)" }}
            >
                <div
                    className="relative w-[160px] md:w-full aspect-[3/4] overflow-hidden"
                    style={{ background: "var(--mt-line)" }}
                >
                    <Image
                        src={photo}
                        alt={`${name} 대표 프로필`}
                        fill
                        sizes="(max-width: 768px) 160px, 220px"
                        className="object-cover"
                        style={{ filter: "grayscale(100%)" }}
                    />
                </div>

                <div>
                    <Eyebrow>Founder</Eyebrow>

                    <div className="mt-5 flex items-baseline gap-3">
                        <h3 className="text-[22px] font-semibold tracking-tight">{name}</h3>
                        <span
                            className="mt-en text-[10px] font-medium"
                            style={{ color: "var(--mt-gray-light)" }}
                        >
                            {role}
                        </span>
                    </div>

                    <p className="mt-body-lg mt-6 max-w-[520px]">{lead}</p>

                    {!compact && (
                        <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8 max-w-[560px]">
                            <div>
                                <p
                                    className="mt-en mt-label mb-4"
                                    style={{ color: "var(--mt-gray)" }}
                                >
                                    Legal
                                </p>
                                <ul className="flex flex-col gap-2">
                                    {career.legal.map((c) => (
                                        <li key={c} className="mt-body text-[13.5px]">
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p
                                    className="mt-en mt-label mb-4"
                                    style={{ color: "var(--mt-gray)" }}
                                >
                                    Marketing
                                </p>
                                <ul className="flex flex-col gap-2">
                                    {career.marketing.map((c) => (
                                        <li key={c} className="mt-body text-[13.5px]">
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Reveal>
    );
}
