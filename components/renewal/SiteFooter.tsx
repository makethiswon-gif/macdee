import Link from "next/link";
import { Container } from "./primitives";
import { COMPANY, NAV, path } from "@/data/renewal/site";

export default function SiteFooter() {
    const whatWeDo = NAV.find((n) => n.children)?.children ?? [];

    return (
        <footer
            style={{
                background: "var(--mt-dark-bg)",
                color: "var(--mt-bg)",
                ["--mt-gray" as string]: "var(--mt-dark-gray)",
                ["--mt-line" as string]: "var(--mt-dark-line)",
            }}
        >
            <Container className="py-20 md:py-28">
                <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-12 lg:gap-10">
                    <div>
                        <p className="mt-en text-[16px] font-semibold" style={{ letterSpacing: "0.06em" }}>
                            {COMPANY.brand}
                        </p>
                        <p className="mt-body mt-5 max-w-[300px] text-[14px] leading-[1.75]">
                            로펌은 사건에 집중하십시오.
                            <br />
                            마케팅은 하나의 팀이 끝까지 관리합니다.
                        </p>
                    </div>

                    <nav>
                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                            What we do
                        </p>
                        <ul className="flex flex-col gap-3">
                            {whatWeDo.map((c) => (
                                <li key={c.href}>
                                    <Link
                                        href={path(c.href)}
                                        className="text-[13.5px] transition-opacity hover:opacity-60"
                                    >
                                        {c.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <nav>
                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                            Company
                        </p>
                        <ul className="flex flex-col gap-3">
                            {[
                                { label: "회사 소개", href: "/about" },
                                { label: "Case Study", href: "/work" },
                                { label: "Insights", href: "/magazine" },
                                { label: "마케팅 진단", href: "/diagnose" },
                                { label: "문의", href: "/contact" },
                            ].map((l) => (
                                <li key={l.href}>
                                    <Link
                                        href={path(l.href)}
                                        className="text-[13.5px] transition-opacity hover:opacity-60"
                                    >
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div>
                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                            Contact
                        </p>
                        <a
                            href={`tel:${COMPANY.phone.replace(/-/g, "")}`}
                            className="mt-num text-[17px] font-medium tracking-tight transition-opacity hover:opacity-60"
                        >
                            {COMPANY.phone}
                        </a>
                        <p className="mt-body mt-4 text-[13px] leading-relaxed">{COMPANY.address}</p>
                    </div>
                </div>

                <div
                    className="mt-16 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
                    style={{ borderTop: "1px solid var(--mt-line)" }}
                >
                    <p className="text-[12px]" style={{ color: "var(--mt-gray)" }}>
                        © {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.
                    </p>

                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="text-[12px] transition-opacity hover:opacity-60" style={{ color: "var(--mt-gray)" }}>
                            이용약관
                        </Link>
                        <Link href="/refund" className="text-[12px] transition-opacity hover:opacity-60" style={{ color: "var(--mt-gray)" }}>
                            환불정책
                        </Link>
                        {/* 기존 구독자 로그인 경로 존치(R9). 마케팅 동선에서는 빼되 끊지는 않는다. */}
                        <Link href="/login" className="text-[12px] transition-opacity hover:opacity-60" style={{ color: "var(--mt-gray)" }}>
                            고객 로그인
                        </Link>
                    </div>
                </div>
            </Container>
        </footer>
    );
}
