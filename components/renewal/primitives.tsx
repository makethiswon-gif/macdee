import Link from "next/link";
import type { ReactNode } from "react";

/* ═══════════════ CONTAINER ═══════════════ */

export function Container({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`w-full mx-auto px-6 md:px-10 lg:px-16 ${className}`} style={{ maxWidth: "var(--mt-max)" }}>
            {children}
        </div>
    );
}

/* ═══════════════ SECTION ═══════════════
   상하 패딩 88 / 140. 다크 모드는 토큰을 반전시킨다. */

export function Section({
    children,
    id,
    dark = false,
    className = "",
    tight = false,
}: {
    children: ReactNode;
    id?: string;
    dark?: boolean;
    className?: string;
    tight?: boolean;
}) {
    return (
        <section
            id={id}
            className={`${tight ? "py-16 md:py-24" : "py-[88px] md:py-[140px]"} ${className}`}
            style={
                dark
                    ? {
                          background: "var(--mt-dark-bg)",
                          color: "var(--mt-bg)",
                          // 다크 구간 안에서 회색/선 토큰을 재정의해 하위 컴포넌트가
                          // 조건 분기 없이 그대로 동작하게 한다.
                          ["--mt-gray" as string]: "var(--mt-dark-gray)",
                          ["--mt-line" as string]: "var(--mt-dark-line)",
                          ["--mt-ink" as string]: "var(--mt-bg)",
                      }
                    : undefined
            }
        >
            {children}
        </section>
    );
}

/* ═══════════════ EYEBROW ═══════════════ */

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={`mt-en mt-label inline-block ${className}`}
            style={{ color: "var(--mt-gray)" }}
        >
            {children}
        </span>
    );
}

/* ═══════════════ SECTION HEADER ═══════════════ */

export function SectionHeader({
    number,
    eyebrow,
    title,
    lead,
    align = "left",
    className = "",
}: {
    number?: string;
    eyebrow?: string;
    title: ReactNode;
    lead?: ReactNode;
    align?: "left" | "center";
    className?: string;
}) {
    return (
        <div
            className={`${align === "center" ? "text-center mx-auto max-w-[720px]" : "max-w-[820px]"} ${className}`}
        >
            {(number || eyebrow) && (
                <div className={`flex items-center gap-3 mb-6 ${align === "center" ? "justify-center" : ""}`}>
                    {number && (
                        <span
                            className="mt-en mt-label mt-num"
                            style={{ color: "var(--mt-accent)" }}
                        >
                            {number}
                        </span>
                    )}
                    {number && eyebrow && (
                        <span className="w-6 h-px" style={{ background: "var(--mt-line-strong)" }} />
                    )}
                    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                </div>
            )}

            <h2 className="mt-h2" style={{ color: "var(--mt-ink)" }}>
                {title}
            </h2>

            {lead && (
                <p className={`mt-body-lg mt-7 ${align === "center" ? "mx-auto" : ""} max-w-[640px]`}>{lead}</p>
            )}
        </div>
    );
}

/* ═══════════════ BUTTON ═══════════════
   라운드 2px. 큰 라운드는 SaaS 신호다(§13). */

type ButtonVariant = "primary" | "outline" | "ghost";

const buttonBase =
    "inline-flex items-center justify-center gap-2 h-[52px] px-7 text-[14px] font-medium transition-colors duration-200 rounded-[2px]";

function buttonStyle(variant: ButtonVariant) {
    if (variant === "primary") {
        return {
            background: "var(--mt-ink)",
            color: "var(--mt-bg)",
            border: "1px solid var(--mt-ink)",
        };
    }
    if (variant === "outline") {
        return {
            background: "transparent",
            color: "var(--mt-ink)",
            border: "1px solid var(--mt-line-strong)",
        };
    }
    return {
        background: "transparent",
        color: "var(--mt-ink)",
        border: "1px solid transparent",
    };
}

export function Button({
    href,
    children,
    variant = "primary",
    className = "",
    external = false,
}: {
    href: string;
    children: ReactNode;
    variant?: ButtonVariant;
    className?: string;
    external?: boolean;
}) {
    const cls = `${buttonBase} ${variant === "primary" ? "hover:opacity-85" : "hover:border-[var(--mt-ink)]"} ${className}`;

    if (external) {
        return (
            <a href={href} className={cls} style={buttonStyle(variant)} rel="noopener">
                {children}
            </a>
        );
    }

    return (
        <Link href={href} className={cls} style={buttonStyle(variant)}>
            {children}
        </Link>
    );
}

/* ═══════════════ ARROW LINK ═══════════════ */

export function ArrowLink({
    href,
    children,
    className = "",
}: {
    href: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Link
            href={href}
            className={`group inline-flex items-center gap-2 text-[14px] font-medium transition-colors ${className}`}
            style={{ color: "var(--mt-ink)" }}
        >
            <span className="border-b border-current pb-0.5">{children}</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </Link>
    );
}

/* ═══════════════ STAT ═══════════════
   검증 가능한 수치만 넣는다(§42). 컴포넌트는 값을 만들지 않는다. */

export function Stat({
    value,
    suffix,
    label,
}: {
    value: string;
    suffix?: string;
    label: string;
}) {
    return (
        <div>
            <div className="flex items-baseline gap-0.5">
                <span
                    className="mt-num text-[clamp(2rem,4vw,3rem)] font-semibold leading-none tracking-tight"
                    style={{ color: "var(--mt-ink)" }}
                >
                    {value}
                </span>
                {suffix && (
                    <span className="text-[1.125rem] font-medium" style={{ color: "var(--mt-accent)" }}>
                        {suffix}
                    </span>
                )}
            </div>
            <p className="mt-body mt-3 text-[13px]">{label}</p>
        </div>
    );
}
