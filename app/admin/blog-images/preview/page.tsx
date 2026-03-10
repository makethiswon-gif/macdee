"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Shuffle, Palette } from "lucide-react";
import {
    getGenerationById, generateConfig, saveGeneration,
    ACCENT_COLORS, MAIN_VARIANT_COUNT, SUMMARY_VARIANT_COUNT, CONTACT_VARIANT_COUNT,
    type GenerationConfig, type BlogProfile,
} from "../themes";

/* ─── Shared Styles ──────────────────────────────────── */
const textShadow = "0 2px 8px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)";
const IMG_W = 900;

/* ─── MAIN IMAGE (Thumbnail 900×500) ─── 5 variants ─── */
function MainImage({ data, profile, config }: Props) {
    const v = config.mainVariant;
    const accent = profile.brandColor || config.accentColor;
    const officeImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
    const profileImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const opacity = config.overlayOpacity;
    const title = config.postTitle;
    const tags = profile.specialty || [];
    const name = profile.lawyerName;
    const office = profile.officeName;
    const logo = profile.logoImage;

    const base: React.CSSProperties = {
        width: IMG_W, height: 500, position: "relative", overflow: "hidden",
        fontFamily: "'Pretendard', 'Inter', sans-serif", background: "#0C0C0C",
    };

    // Variant 0: Bold center on dark bg
    if (v === 0) {
        return (
            <div id="blog-main-image" style={base}>
                {officeImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${officeImg})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 1 - opacity }} />}
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,${opacity - 0.1}) 0%, rgba(0,0,0,${opacity + 0.1}) 100%)` }} />
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                        {tags.map((t, i) => (
                            <span key={i} style={{ padding: "4px 14px", borderRadius: 4, background: `${accent}20`, color: accent, fontSize: 13, fontWeight: 600 }}>{t}</span>
                        ))}
                    </div>
                    <h1 style={{ color: "#fff", fontSize: title.length > 20 ? 40 : 48, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.03em", textShadow, wordBreak: "keep-all", maxWidth: 750 }}>
                        {title}
                    </h1>
                    <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 4, height: 28, background: accent, borderRadius: 2 }} />
                        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 600, textShadow }}>{name} 변호사{office ? ` · ${office}` : ""}</span>
                    </div>
                    {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 20, right: 24, height: 28, objectFit: "contain", opacity: 0.7 }} />}
                </div>
            </div>
        );
    }

    // Variant 1: Highlight keyword box (like ref image 핀터레스트)
    if (v === 1) {
        const words = title.split(" ");
        const highlightIdx = Math.min(1, words.length - 1);
        return (
            <div id="blog-main-image" style={{ ...base, background: "#000" }}>
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px" }}>
                    <div style={{ marginBottom: 16 }}>
                        <span style={{ padding: "3px 10px", background: accent, color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: 3 }}>
                            {tags[0] || "법률 전문"}
                        </span>
                    </div>
                    <h1 style={{ color: "#fff", fontSize: title.length > 20 ? 42 : 52, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 750 }}>
                        {words.map((w, i) => (
                            <span key={i}>
                                {i === highlightIdx ? (
                                    <span style={{ background: accent, padding: "2px 8px", borderRadius: 4, color: "#fff" }}>{w}</span>
                                ) : w}
                                {i < words.length - 1 ? " " : ""}
                            </span>
                        ))}
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 20, fontWeight: 400, textShadow }}>
                        {name} 변호사{office ? ` | ${office}` : ""}
                    </p>
                    {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 20, right: 24, height: 28, objectFit: "contain", opacity: 0.7 }} />}
                </div>
            </div>
        );
    }

    // Variant 2: Full photo background with heavy overlay + centered text
    if (v === 2) {
        const bgImg = officeImg || profileImg;
        return (
            <div id="blog-main-image" style={base}>
                {bgImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${bgImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,${opacity}) 50%, rgba(0,0,0,0.9) 100%)` }} />
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 60px 50px" }}>
                    <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>{tags.join(" · ") || "법률 상담"}</p>
                    <h1 style={{ color: "#fff", fontSize: title.length > 20 ? 38 : 46, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", textShadow, wordBreak: "keep-all" }}>
                        {title}
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 16, textShadow }}>{name} 변호사{office ? ` · ${office}` : ""}</p>
                    {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 20, right: 24, height: 28, objectFit: "contain", opacity: 0.7 }} />}
                </div>
            </div>
        );
    }

    // Variant 3: Split — text left, profile photo right
    if (v === 3) {
        return (
            <div id="blog-main-image" style={{ ...base, display: "flex" }}>
                <div style={{ flex: "0 0 62%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 50px 50px 60px", background: "#0C0C0C" }}>
                    <span style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>{tags[0] || "전문 상담"}</span>
                    <h1 style={{ color: "#fff", fontSize: title.length > 20 ? 34 : 40, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>
                        {title}
                    </h1>
                    <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 3, height: 24, background: accent, borderRadius: 2 }} />
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500 }}>{name} 변호사{office ? ` · ${office}` : ""}</span>
                    </div>
                    {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 20, left: 60, height: 24, objectFit: "contain", opacity: 0.6 }} />}
                </div>
                <div style={{ flex: "0 0 38%", position: "relative" }}>
                    {profileImg ? (
                        <img src={profileImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <div style={{ width: "100%", height: "100%", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 64 }}>⚖</div>
                    )}
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, #0C0C0C 0%, transparent 30%)` }} />
                </div>
            </div>
        );
    }

    // Variant 4: Decorative accent circle + bold text
    return (
        <div id="blog-main-image" style={{ ...base, background: "#0C0C0C" }}>
            <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", border: `2px solid ${accent}20` }} />
            <div style={{ position: "absolute", bottom: -50, left: -50, width: 200, height: 200, borderRadius: "50%", background: `${accent}08` }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: 5, height: "100%", background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px 50px 80px" }}>
                <h1 style={{ color: "#fff", fontSize: title.length > 20 ? 42 : 52, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 700 }}>
                    {title}
                </h1>
                <div style={{ marginTop: 30, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tags.map((t, i) => (
                        <span key={i} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${accent}40`, color: accent, fontSize: 13, fontWeight: 500 }}>{t}</span>
                    ))}
                </div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 20 }}>{name} 변호사{office ? ` · ${office}` : ""}</p>
                {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 30, height: 28, objectFit: "contain", opacity: 0.6 }} />}
            </div>
        </div>
    );
}

/* ─── SUMMARY IMAGE (900×600) ─── 5 variants ─── */
function SummaryImage({ data, profile, config }: Props) {
    const v = config.summaryVariant;
    const accent = profile.brandColor || config.accentColor;
    const profileImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const lines = config.postSummary.split("\n").map((l) => l.trim()).filter(Boolean);
    const name = profile.lawyerName;
    const office = profile.officeName;
    const tags = profile.specialty || [];
    const title = config.postTitle;
    const logo = profile.logoImage;

    const base: React.CSSProperties = {
        width: IMG_W, height: 600, position: "relative", overflow: "hidden",
        fontFamily: "'Pretendard', 'Inter', sans-serif", background: "#0C0C0C",
    };

    // Variant 0: Numbered columns (like BACKGROUND 01 02 03 reference)
    if (v === 0) {
        return (
            <div id="blog-summary-image" style={base}>
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "50px 60px" }}>
                    <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>핵심 포인트</p>
                    <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 40, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>{title}</h2>
                    <div style={{ display: "flex", gap: 20, flex: 1 }}>
                        {lines.map((line, i) => (
                            <div key={i} style={{ flex: 1, padding: "28px 24px", borderRadius: 16, background: "#161616", border: "1px solid #222" }}>
                                <span style={{ color: accent, fontSize: 36, fontWeight: 900, lineHeight: 1 }}>0{i + 1}</span>
                                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.7, marginTop: 16, wordBreak: "keep-all" }}>{line}</p>
                            </div>
                        ))}
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 24 }}>{name} 변호사{office ? ` · ${office}` : ""}</p>
                </div>
            </div>
        );
    }

    // Variant 1: Profile photo left + numbered list right
    if (v === 1) {
        return (
            <div id="blog-summary-image" style={{ ...base, display: "flex" }}>
                <div style={{ flex: "0 0 280px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, background: "#111" }}>
                    {profileImg ? (
                        <img src={profileImg} alt="" style={{ width: 180, height: 220, objectFit: "cover", borderRadius: 12, border: `2px solid ${accent}30` }} />
                    ) : (
                        <div style={{ width: 180, height: 220, borderRadius: 12, background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, color: "#333" }}>⚖</div>
                    )}
                    <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginTop: 16 }}>{name} 변호사</p>
                    {office && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>{office}</p>}
                    <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
                        {tags.map((t, i) => <span key={i} style={{ padding: "3px 10px", borderRadius: 10, background: `${accent}15`, color: accent, fontSize: 11, fontWeight: 600 }}>{t}</span>)}
                    </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 50px" }}>
                    <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>핵심 포인트</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {lines.map((line, i) => (
                            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                                <span style={{ color: accent, fontSize: 28, fontWeight: 900, lineHeight: 1, minWidth: 36 }}>0{i + 1}</span>
                                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{line}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Variant 2: Card grid on dark background
    if (v === 2) {
        return (
            <div id="blog-summary-image" style={base}>
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "50px 60px" }}>
                    <h2 style={{ color: "#fff", fontSize: 28, fontWeight: 800, marginBottom: 10, wordBreak: "keep-all" }}>알아두셔야 할 사항</h2>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 30 }}>{name} 변호사{office ? ` · ${office}` : ""}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1 }}>
                        {lines.map((line, i) => (
                            <div key={i} style={{ padding: "24px 28px", borderRadius: 16, background: "#161616", border: "1px solid #222", display: "flex", flexDirection: "column" }}>
                                <span style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>포인트 {String(i + 1).padStart(2, "0")}</span>
                                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 1.7, marginTop: 12, flex: 1, wordBreak: "keep-all" }}>{line}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Variant 3: Full width numbered points with decorative line
    if (v === 3) {
        return (
            <div id="blog-summary-image" style={base}>
                <div style={{ position: "absolute", left: 52, top: 120, bottom: 80, width: 2, background: `${accent}20` }} />
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "50px 60px" }}>
                    <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>핵심 포인트</p>
                    <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingLeft: 20 }}>
                        {lines.map((line, i) => (
                            <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, marginTop: 6, marginLeft: -24, position: "relative", zIndex: 2 }} />
                                <div>
                                    <span style={{ color: accent, fontSize: 13, fontWeight: 700 }}>0{i + 1}</span>
                                    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 1.7, marginTop: 4, wordBreak: "keep-all" }}>{line}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: "auto" }}>{name} 변호사{office ? ` · ${office}` : ""}</p>
                </div>
            </div>
        );
    }

    // Variant 4: Light card on dark background
    return (
        <div id="blog-summary-image" style={base}>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                <div style={{ width: "100%", maxWidth: 780, background: "#FAFAFA", borderRadius: 20, padding: "44px 48px", color: "#111" }}>
                    <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>핵심 포인트</p>
                    <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 28, wordBreak: "keep-all" }}>{title}</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {lines.map((line, i) => (
                            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                                <div style={{ minWidth: 28, height: 28, borderRadius: 8, background: `${accent}15`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginTop: 1 }}>{i + 1}</div>
                                <p style={{ fontSize: 15, lineHeight: 1.7, color: "#333", wordBreak: "keep-all" }}>{line}</p>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 12 }}>
                        {profileImg && <img src={profileImg} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />}
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 700 }}>{name} 변호사</p>
                            {office && <p style={{ fontSize: 11, color: "#999" }}>{office}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── CONTACT IMAGE (900×500) ─── 5 variants ─── */
function ContactImage({ data, profile, config }: Props) {
    const v = config.contactVariant;
    const accent = profile.brandColor || config.accentColor;
    const profileImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const officeImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
    const opacity = config.overlayOpacity;
    const { lawyerName: name, officeName: office, phone, address, website, logoImage: logo } = profile;

    const base: React.CSSProperties = {
        width: IMG_W, height: 500, position: "relative", overflow: "hidden",
        fontFamily: "'Pretendard', 'Inter', sans-serif", background: "#0C0C0C",
    };

    const contactItems = [
        phone && { icon: "📞", label: "전화", value: phone },
        address && { icon: "📍", label: "주소", value: address },
        website && { icon: "🌐", label: "웹사이트", value: website },
    ].filter(Boolean) as { icon: string; label: string; value: string }[];

    // Variant 0: Dark centered layout
    if (v === 0) {
        return (
            <div id="blog-contact-image" style={base}>
                {officeImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${officeImg})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.08 }} />}
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ textAlign: "center" }}>
                        {profileImg && <img src={profileImg} alt="" style={{ width: 100, height: 120, objectFit: "cover", borderRadius: 14, margin: "0 auto 20px", border: `2px solid ${accent}30` }} />}
                        <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>상담 안내</p>
                        <h2 style={{ color: "#fff", fontSize: 32, fontWeight: 900, marginBottom: 6 }}>{name} 변호사</h2>
                        {office && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 28 }}>{office}</p>}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                            {contactItems.map((c, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                                    <span>{c.icon}</span>
                                    <span style={{ fontWeight: 500 }}>{c.value}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 28, background: accent, color: "#fff", padding: "14px 36px", borderRadius: 12, fontSize: 15, fontWeight: 700, display: "inline-block" }}>
                            무료 상담 예약
                        </div>
                        {logo && <img src={logo} alt="" style={{ height: 24, objectFit: "contain", marginTop: 16, opacity: 0.7 }} />}
                    </div>
                </div>
            </div>
        );
    }

    // Variant 1: Office photo background + info overlay
    if (v === 1) {
        return (
            <div id="blog-contact-image" style={base}>
                {officeImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${officeImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, rgba(0,0,0,${opacity}) 0%, rgba(0,0,0,${opacity - 0.15}) 100%)` }} />
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", padding: "0 70px", gap: 50 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                        {profileImg && <img src={profileImg} alt="" style={{ width: 130, height: 160, objectFit: "cover", borderRadius: 14, border: `2px solid ${accent}30`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} />}
                        <div style={{ background: accent, color: "#fff", padding: "12px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700, textAlign: "center" }}>무료 상담 예약</div>
                    </div>
                    <div>
                        <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>상담 안내</p>
                        <h2 style={{ color: "#fff", fontSize: 30, fontWeight: 900, textShadow, marginBottom: 6 }}>{name} 변호사</h2>
                        {office && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24, textShadow }}>{office}</p>}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {contactItems.map((c, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{c.icon}</div>
                                    <div>
                                        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{c.label}</p>
                                        <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, textShadow }}>{c.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Variant 2: Light card on dark background
    if (v === 2) {
        return (
            <div id="blog-contact-image" style={base}>
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                    <div style={{ width: "100%", maxWidth: 700, background: "#FAFAFA", borderRadius: 20, padding: "40px 48px", display: "flex", gap: 36, alignItems: "center" }}>
                        <div style={{ flex: "0 0 auto", textAlign: "center" }}>
                            {profileImg ? (
                                <img src={profileImg} alt="" style={{ width: 120, height: 150, objectFit: "cover", borderRadius: 14 }} />
                            ) : (
                                <div style={{ width: 120, height: 150, borderRadius: 14, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, color: "#9CA3AF" }}>⚖</div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ color: "#111", fontSize: 26, fontWeight: 900, marginBottom: 4 }}>{name} 변호사</h2>
                            {office && <p style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>{office}</p>}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {contactItems.map((c, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#333" }}>
                                        <span style={{ color: accent }}>{c.icon}</span>
                                        <span style={{ fontWeight: 500 }}>{c.value}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 20, background: accent, color: "#fff", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, display: "inline-block" }}>무료 상담 예약</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Variant 3: Split layout — profile left, info right
    if (v === 3) {
        return (
            <div id="blog-contact-image" style={{ ...base, display: "flex" }}>
                <div style={{ flex: "0 0 40%", background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                    {profileImg ? (
                        <img src={profileImg} alt="" style={{ width: 160, height: 200, objectFit: "cover", borderRadius: 14, border: `2px solid ${accent}20` }} />
                    ) : (
                        <div style={{ width: 160, height: 200, borderRadius: 14, background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, color: "#333" }}>⚖</div>
                    )}
                    <p style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>{name} 변호사</p>
                    {office && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{office}</p>}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 50px" }}>
                    <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 24 }}>상담 안내</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        {contactItems.map((c, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>
                                <div>
                                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>{c.label}</p>
                                    <p style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{c.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 32, background: accent, color: "#fff", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700, textAlign: "center" }}>무료 상담 예약</div>
                </div>
            </div>
        );
    }

    // Variant 4: Minimal grid
    return (
        <div id="blog-contact-image" style={base}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 60px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                    {profileImg && <img src={profileImg} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover" }} />}
                    <div>
                        <h2 style={{ color: "#fff", fontSize: 28, fontWeight: 900 }}>{name} 변호사</h2>
                        {office && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{office}</p>}
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {contactItems.map((c, i) => (
                        <div key={i} style={{ padding: "20px 24px", borderRadius: 14, background: "#161616", border: "1px solid #222" }}>
                            <span style={{ fontSize: 20 }}>{c.icon}</span>
                            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 8 }}>{c.label}</p>
                            <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 4 }}>{c.value}</p>
                        </div>
                    ))}
                    <div style={{ padding: "20px 24px", borderRadius: 14, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>무료 상담 예약 →</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Types ─── */
interface Props {
    data: GenerationConfig;
    profile: BlogProfile;
    config: GenerationConfig;
}

/* ─── Preview Content (with Suspense boundary) ─── */
function PreviewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");
    const [config, setConfig] = useState<GenerationConfig | null>(null);
    const [profile, setProfile] = useState<BlogProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) { setLoading(false); return; }
        const gen = getGenerationById(id);
        if (!gen) { setLoading(false); return; }
        setConfig(gen);

        fetch(`/api/admin/blog-profiles?id=${gen.profileId}`)
            .then((r) => r.json())
            .then((d) => { setProfile(d.profile); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" /></div>;

    if (!config || !profile) {
        return (
            <div className="text-center py-20">
                <p className="text-[#6B7280] mb-4">이미지 데이터를 찾을 수 없습니다</p>
                <button onClick={() => router.push("/admin/blog-images")} className="px-4 py-2 text-sm text-white bg-[#3563AE] rounded-lg">돌아가기</button>
            </div>
        );
    }

    // Re-randomize design only (keep same content)
    const handleRedesign = () => {
        if (!config || !profile) return;
        const newConfig: GenerationConfig = {
            ...config,
            accentColor: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
            mainVariant: Math.floor(Math.random() * MAIN_VARIANT_COUNT),
            summaryVariant: Math.floor(Math.random() * SUMMARY_VARIANT_COUNT),
            contactVariant: Math.floor(Math.random() * CONTACT_VARIANT_COUNT),
            profileImageIndex: Math.floor(Math.random() * Math.max(1, profile.profileImages?.length || 0)),
            officeImageIndex: Math.floor(Math.random() * Math.max(1, profile.officeImages?.length || 0)),
            overlayOpacity: 0.55 + Math.random() * 0.3,
        };
        setConfig(newConfig);
        // Update in localStorage
        const items = JSON.parse(localStorage.getItem("macdee_blog_generations") || "[]");
        const idx = items.findIndex((i: GenerationConfig) => i.id === config.id);
        if (idx >= 0) { items[idx] = newConfig; localStorage.setItem("macdee_blog_generations", JSON.stringify(items)); }
    };

    // Create entirely new generation with same content
    const handleRegenerate = () => {
        if (!config || !profile) return;
        const newGen = generateConfig(
            config.profileId, config.postTitle, config.postSummary,
            profile.profileImages?.length || 0, profile.officeImages?.length || 0,
        );
        saveGeneration(newGen);
        setConfig(newGen);
        window.history.replaceState(null, "", `/admin/blog-images/preview?id=${newGen.id}`);
    };

    const props: Props = { data: config, profile, config };

    return (
        <div className="max-w-[1000px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/admin/blog-images")} className="p-2 rounded-lg hover:bg-[#1A1F2E] text-[#6B7280] hover:text-white transition-colors"><ArrowLeft size={18} /></button>
                    <div>
                        <h1 className="text-xl font-bold text-white">이미지 미리보기</h1>
                        <p className="text-xs text-[#6B7280] mt-0.5">{profile.lawyerName} · 스크린샷(Win+Shift+S)으로 캡쳐하세요</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRedesign}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#8B5CF6] bg-[#8B5CF6]/10 rounded-lg hover:bg-[#8B5CF6]/20 transition-colors">
                        <Palette size={14} /> 디자인 변경
                    </button>
                    <button onClick={handleRegenerate}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#10B981] bg-[#10B981]/10 rounded-lg hover:bg-[#10B981]/20 transition-colors">
                        <Shuffle size={14} /> 새로 생성
                    </button>
                    <button onClick={() => router.push("/admin/blog-images")}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#3563AE] bg-[#3563AE]/10 rounded-lg hover:bg-[#3563AE]/20 transition-colors">
                        <ArrowLeft size={14} /> 돌아가기
                    </button>
                </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                <p className="text-xs text-[#9CA3B0]">💡 <strong className="text-white">캡쳐 방법:</strong> Win+Shift+S로 원하는 이미지 영역을 선택하여 캡쳐 후 네이버 블로그에 붙여넣으세요.</p>
            </div>

            <div className="space-y-10">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#3563AE]/20 text-[#3563AE] text-[10px] font-bold flex items-center justify-center">1</span>메인 이미지 (썸네일)
                        </h3>
                        <span className="text-[10px] text-[#4B5563]">900 × 500px</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-[#1F2937] shadow-lg shadow-black/20 inline-block"><MainImage {...props} /></div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] text-[10px] font-bold flex items-center justify-center">2</span>중간 요약 이미지
                        </h3>
                        <span className="text-[10px] text-[#4B5563]">900 × 600px</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-[#1F2937] shadow-lg shadow-black/20 inline-block"><SummaryImage {...props} /></div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold flex items-center justify-center">3</span>상담 안내 이미지
                        </h3>
                        <span className="text-[10px] text-[#4B5563]">900 × 500px</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-[#1F2937] shadow-lg shadow-black/20 inline-block"><ContactImage {...props} /></div>
                </div>
            </div>
        </div>
    );
}

export default function PreviewPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" /></div>}>
            <PreviewContent />
        </Suspense>
    );
}
