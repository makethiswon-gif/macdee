"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { NAV, PRIMARY_CTA, path } from "@/data/renewal/site";

export default function SiteHeader() {
    const [scrolled, setScrolled] = useState(false);
    const [openMenu, setOpenMenu] = useState(false);
    const [openDrop, setOpenDrop] = useState<string | null>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // 모바일 메뉴가 열린 동안 배경 스크롤 잠금
    useEffect(() => {
        document.body.style.overflow = openMenu ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [openMenu]);

    // 모바일 메뉴는 Escape 로 닫는다(포커스 트랩은 두지 않는다).
    useEffect(() => {
        if (!openMenu) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpenMenu(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [openMenu]);

    return (
        <header
            className="fixed top-0 inset-x-0 z-50 transition-colors duration-300"
            style={{
                background: scrolled || openMenu ? "var(--mt-bg)" : "transparent",
                borderBottom: `1px solid ${scrolled && !openMenu ? "var(--mt-line)" : "transparent"}`,
            }}
        >
            <div
                className="w-full mx-auto px-6 md:px-10 lg:px-16"
                style={{ maxWidth: "var(--mt-max)" }}
            >
                <div className="flex items-center justify-between h-[72px] md:h-[84px]">
                    <Link
                        href={path("/")}
                        aria-label="MAKETHIS1 홈"
                        style={{ color: "var(--mt-ink)" }}
                        onClick={() => setOpenMenu(false)}
                    >
                        <Logo size={18} />
                    </Link>

                    {/* ── Desktop ── */}
                    <nav className="hidden lg:flex items-center gap-9">
                        {NAV.map((item) => {
                            if (!item.children) {
                                return (
                                    <div key={item.label} className="relative">
                                        <Link
                                            href={path(item.href)}
                                            className="mt-en mt-label py-3 inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
                                            style={{ color: "var(--mt-ink)" }}
                                        >
                                            {item.label}
                                        </Link>
                                    </div>
                                );
                            }

                            const open = openDrop === item.label;
                            const dropId = `nav-drop-${item.label.toLowerCase().replace(/\s+/g, "-")}`;

                            return (
                                <div
                                    key={item.label}
                                    className="relative"
                                    // 마우스 hover 로 열되, 키보드 포커스가 안쪽에 있으면 mouseleave 로 닫지 않는다.
                                    onMouseEnter={() => setOpenDrop(item.label)}
                                    onMouseLeave={(e) => {
                                        if (!e.currentTarget.contains(document.activeElement)) {
                                            setOpenDrop(null);
                                        }
                                    }}
                                    // 포커스가 그룹에 들어오면 열고, 그룹 밖으로 나가면 닫는다.
                                    onFocus={() => setOpenDrop(item.label)}
                                    onBlur={(e) => {
                                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                            setOpenDrop(null);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape" && open) {
                                            const trigger = e.currentTarget.querySelector("a");
                                            setOpenDrop(null);
                                            trigger?.focus();
                                        }
                                    }}
                                >
                                    <Link
                                        href={path(item.href)}
                                        className="mt-en mt-label py-3 inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
                                        style={{ color: "var(--mt-ink)" }}
                                        aria-haspopup="true"
                                        aria-expanded={open}
                                        aria-controls={dropId}
                                    >
                                        {item.label}
                                        <span className="text-[8px] opacity-50" aria-hidden>
                                            ▾
                                        </span>
                                    </Link>

                                    {open && (
                                        <div
                                            id={dropId}
                                            className="absolute left-0 top-full pt-3"
                                            style={{ minWidth: 300 }}
                                        >
                                            <div
                                                style={{
                                                    background: "var(--mt-surface)",
                                                    border: "1px solid var(--mt-line)",
                                                }}
                                                className="rounded-[2px] py-2"
                                            >
                                                {item.children.map((c) => (
                                                    <Link
                                                        key={c.href}
                                                        href={path(c.href)}
                                                        className="block px-5 py-3 transition-colors hover:bg-[var(--mt-bg)]"
                                                    >
                                                        <span
                                                            className="block text-[14px] font-medium"
                                                            style={{ color: "var(--mt-ink)" }}
                                                        >
                                                            {c.label}
                                                        </span>
                                                        <span
                                                            className="block text-[12px] mt-0.5"
                                                            style={{ color: "var(--mt-gray)" }}
                                                        >
                                                            {c.desc}
                                                        </span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link
                            href={path(PRIMARY_CTA.href)}
                            className="hidden sm:inline-flex items-center h-[42px] px-5 text-[13px] font-medium rounded-[2px] transition-colors hover:opacity-85"
                            style={{ background: "var(--mt-ink)", color: "var(--mt-bg)" }}
                        >
                            {PRIMARY_CTA.label}
                        </Link>

                        <button
                            className="lg:hidden w-10 h-10 -mr-2 flex flex-col items-center justify-center gap-[5px]"
                            onClick={() => setOpenMenu((v) => !v)}
                            aria-label={openMenu ? "메뉴 닫기" : "메뉴 열기"}
                            aria-expanded={openMenu}
                            aria-controls="mobile-nav"
                        >
                            <span
                                className="block w-[18px] h-px transition-transform duration-200"
                                style={{
                                    background: "var(--mt-ink)",
                                    transform: openMenu ? "translateY(3px) rotate(45deg)" : "none",
                                }}
                            />
                            <span
                                className="block w-[18px] h-px transition-transform duration-200"
                                style={{
                                    background: "var(--mt-ink)",
                                    transform: openMenu ? "translateY(-3px) rotate(-45deg)" : "none",
                                }}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Mobile ── */}
            {openMenu && (
                <div
                    id="mobile-nav"
                    className="lg:hidden fixed inset-x-0 top-[72px] bottom-0 overflow-y-auto"
                    style={{ background: "var(--mt-bg)" }}
                >
                    <div className="px-6 py-8">
                        {NAV.map((item) => (
                            <div key={item.label} className="py-4" style={{ borderBottom: "1px solid var(--mt-line)" }}>
                                <Link
                                    href={path(item.href)}
                                    className="mt-en text-[13px] font-medium"
                                    style={{ color: "var(--mt-ink)" }}
                                    onClick={() => setOpenMenu(false)}
                                >
                                    {item.label}
                                </Link>
                                {item.children && (
                                    <div className="mt-4 flex flex-col gap-3 pl-1">
                                        {item.children.map((c) => (
                                            <Link
                                                key={c.href}
                                                href={path(c.href)}
                                                className="text-[14px]"
                                                style={{ color: "var(--mt-gray)" }}
                                                onClick={() => setOpenMenu(false)}
                                            >
                                                {c.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        <Link
                            href={path(PRIMARY_CTA.href)}
                            className="mt-8 w-full inline-flex items-center justify-center h-[52px] text-[14px] font-medium rounded-[2px]"
                            style={{ background: "var(--mt-ink)", color: "var(--mt-bg)" }}
                            onClick={() => setOpenMenu(false)}
                        >
                            {PRIMARY_CTA.label}
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
