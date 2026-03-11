"use client";
import { S, FONT, TS, ML_ALL, getContrastColor, getSubContrastColor, isLightColor } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";

interface P { config: GenerationConfig; profile: BlogProfile; }

export default function MainImage({ config, profile }: P) {
    const v = config.mainVariant % ML_ALL.length;
    const accent = profile.brandColor || config.accentColor;
    const a2 = config.secondaryAccent || accent;
    const oImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
    const pImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const t = config.postTitle;
    const nm = profile.lawyerName;
    const of = profile.officeName;
    const logo = profile.logoImage;
    const ts = Math.min(Math.round(42 * ML_ALL[v].titleScale), 72); // cap at 72px
    const bg = config.backgroundColor || "#111";
    const tc = "#FFFFFF";
    const isDark = true;
    const tShadow = TS;

    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: bg };
    const abs0: React.CSSProperties = { position: "absolute", inset: 0 };

    // Cinematic office background: photo + color grading + dark overlay + vignetting + film grain
    const bgPhoto = <>
        {oImg && <div style={{ ...abs0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
        <div style={{ ...abs0, background: "linear-gradient(180deg, rgba(0,30,60,0.3) 0%, rgba(20,10,5,0.35) 100%)", mixBlendMode: "multiply" as const }} />
        <div style={{ ...abs0, background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.35) 100%)" }} />
        <div style={{ ...abs0, background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)" }} />
        <svg style={{ position: "absolute", inset: "0", width: "100%", height: "100%", opacity: 0.1, pointerEvents: "none" } as React.CSSProperties}><filter id="filmGrain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /></filter><rect width="100%" height="100%" filter="url(#filmGrain)" /></svg>
    </>;
    const nameTag = <span style={{ color: `${tc}CC`, fontSize: 15, fontWeight: 500, letterSpacing: "0.01em", textShadow: tShadow }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>;
    const logoEl = logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 28, right: 32, height: 56, objectFit: "contain", opacity: 0.9 }} />;
    const circleProfile = (size: number) => pImg ? <img src={pImg} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", objectPosition: "top", border: `3px solid ${accent}`, flexShrink: 0 }} /> : null;

    // ── v0: Full photo bg + bold gradient bottom ──
    if (v === 0) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: `linear-gradient(0deg, rgba(0,0,0,0.92) 0%, transparent 100%)` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 56px" }}>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.03em", textShadow: TS, wordBreak: "keep-all", marginBottom: 18 }}>{t}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{circleProfile(40)}{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    // ── v1: Photo bg + dark scrim + centered title ──
    if (v === 1) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ ...abs0, background: "rgba(0,0,0,0.55)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                <div style={{ width: 48, height: 3, background: accent, marginBottom: 28, borderRadius: 2 }} />
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.04em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 28 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    // ── v2: Split — accent left / photo right ──
    if (v === 2) {
        return <div id="blog-main-image" style={{ ...base, display: "flex" }}>
            {bgPhoto}
            <div style={{ flex: "0 0 52%", position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 50px 60px 70px", background: `linear-gradient(160deg, ${accent}CC 0%, ${a2}CC 100%)`, zIndex: 1 }}>
                <div style={{ width: 4, height: 40, background: getContrastColor(accent), borderRadius: 2, marginBottom: 24, opacity: 0.6 }} />
                <h1 style={{ color: getContrastColor(accent), fontSize: ts, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 10 }}>
                    {circleProfile(40)}
                    <span style={{ color: getSubContrastColor(accent), fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>
            {logoEl}
        </div>;
    }
    // ── v3: Photo bg + floating white card ──
    if (v === 3) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 56 }}>
                <div style={{ background: "rgba(255,255,255,0.96)", borderRadius: 20, padding: "44px 52px", maxWidth: 760, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
                    <div style={{ width: 40, height: 4, background: accent, borderRadius: 2, marginBottom: 20 }} />
                    <h1 style={{ fontSize: ts - 4, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", color: "#111" }}>{t}</h1>
                    <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, paddingTop: 16, borderTop: "1px solid #E5E7EB" }}>
                        {pImg && <img src={pImg} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />}
                        <p style={{ color: "#555", fontSize: 14, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v4: Accent gradient + stacked cards + profile badge ──
    if (v === 4) {
        return <div id="blog-main-image" style={{ ...base, background: `linear-gradient(160deg, ${accent} 0%, ${a2} 100%)` }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 60, right: 60, width: 280, height: 180, borderRadius: 20, background: "rgba(255,255,255,0.07)", transform: "rotate(-3deg)" }} />
            <div style={{ position: "absolute", top: 80, right: 80, width: 280, height: 180, borderRadius: 20, background: "rgba(255,255,255,0.05)", transform: "rotate(2deg)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "rgba(0,0,0,0.15)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <div style={{ background: "rgba(0,0,0,0.12)", borderRadius: 10, padding: "8px 18px", alignSelf: "flex-start", marginBottom: 24 }}>
                    <span style={{ color: getContrastColor(accent), fontSize: 12, fontWeight: 800, letterSpacing: "0.1em" }}>{of || "법률 전문"}</span>
                </div>
                <h1 style={{ color: getContrastColor(accent), fontSize: ts + 4, fontWeight: 900, lineHeight: 1.22, letterSpacing: "-0.04em", wordBreak: "keep-all", maxWidth: 700 }}>{t}</h1>
                <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(52)}
                    <div><span style={{ color: getContrastColor(accent), fontSize: 16, fontWeight: 700, display: "block" }}>{nm} 변호사</span>
                    {of && <span style={{ color: getSubContrastColor(accent), fontSize: 12 }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v5: Photo bg + diagonal accent overlay ──
    if (v === 5) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ ...abs0, background: `linear-gradient(125deg,${accent}95 0%,transparent 50%)` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 60px" }}>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.03em", wordBreak: "keep-all", textShadow: TS, marginBottom: 18 }}>{t}</h1>
                {nameTag}
            </div>{logoEl}
        </div>;
    }
    // ── v6: Top photo strip + solid accent bg ──
    if (v === 6) {
        return <div id="blog-main-image" style={{ ...base, background: accent }}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 60px" }}>
                <div style={{ width: 4, height: 32, background: "#fff", borderRadius: 2, marginBottom: 18, opacity: 0.6 }} />
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 20 }}><span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
            </div>{logoEl}
        </div>;
    }
    // ── v7: Editorial — § icon block + gradient mesh bg + profile card ──
    if (v === 7) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 15% 85%, ${accent}18 0%, transparent 50%), radial-gradient(ellipse at 85% 15%, ${a2}12 0%, transparent 45%)` }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${accent}, ${a2}, transparent)` }} />
            <div style={{ position: "absolute", bottom: 60, right: 70, fontSize: 280, fontWeight: 900, color: `${accent}08`, lineHeight: 0.8, fontFamily: "'Georgia',serif", userSelect: "none" }}>§</div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px 60px 80px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: getContrastColor(accent), fontSize: 20, fontWeight: 900, fontFamily: "'Georgia',serif" }}>§</span>
                    </div>
                    <span style={{ color: accent, fontSize: 13, fontWeight: 800, letterSpacing: "0.12em" }}>{of || "법률 칼럼"}</span>
                </div>
                <h1 style={{ color: tc, fontSize: ts + 6, fontWeight: 900, lineHeight: 1.22, letterSpacing: "-0.04em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(44)}
                    <div><span style={{ color: tc, fontSize: 15, fontWeight: 700, display: "block" }}>{nm} 변호사</span>
                    {of && <span style={{ color: `${tc}66`, fontSize: 12 }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v8: Photo bg + bottom gradient ──
    if (v === 8) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 56px" }}>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.25, textShadow: TS, wordBreak: "keep-all", marginBottom: 18 }}>{t}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{circleProfile(42)}{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    // ── v9: Bold dot grid + accent left border ──
    if (v === 9) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ ...abs0, backgroundImage: `radial-gradient(circle,${accent}30 2px,transparent 2px)`, backgroundSize: "32px 32px" }} />
            <div style={{ position: "absolute", left: 0, top: 0, width: 8, height: "100%", background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px 60px 48px" }}>
                <h1 style={{ color: "#fff", fontSize: ts + 2, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 800, textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(46)}
                    <div><span style={{ color: "#fff", fontSize: 15, fontWeight: 700, display: "block", textShadow: TS }}>{nm} 변호사</span>
                    {of && <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, textShadow: TS }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v10: Lookbook — 프로필 히어로 오른쪽 + 볼드 타이틀 왼쪽 ──
    if (v === 10) {
        return <div id="blog-main-image" style={{ ...base, display: "flex" }}>
            {bgPhoto}
            {/* 왼쪽: 타이포그래피 영역 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px", position: "relative", zIndex: 2 }}>
                {logo ? <img src={logo} alt="" style={{ height: 28, objectFit: "contain", marginBottom: 24, alignSelf: "flex-start", opacity: 0.9 }} />
                    : <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 24 }}>{of || ""}</span>}
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 12 }}>{of || "법률 전문"}</span>
                <h1 style={{ color: "#fff", fontSize: Math.min(ts + 14, 76), fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.05em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(48)}
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>
        </div>;
    }
    // ── v11: Newspaper editorial style ──
    if (v === 11) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 16, border: "2px solid rgba(255,255,255,0.5)", zIndex: 1 }} />
            <div style={{ position: "absolute", inset: 22, border: "1px solid rgba(255,255,255,0.2)", zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", padding: "30px 40px" }}>
                <div style={{ paddingBottom: 16, borderBottom: "2px solid rgba(255,255,255,0.5)", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 900, fontFamily: "serif", letterSpacing: "0.08em", textShadow: TS }}>{of || nm}</span>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em" }}>LAW COLUMN</span>
                </div>
                <h1 style={{ color: "#fff", fontSize: Math.min(ts - 2, 52), fontWeight: 900, lineHeight: 1.35, wordBreak: "keep-all", fontFamily: "serif", flex: 1, textShadow: TS }}>{t}</h1>
                <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, textShadow: TS }}>{nm} 변호사</span>
                    <div style={{ display: "flex", gap: 3 }}>{[...Array(3)].map((_, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? accent : `${accent}40` }} />)}</div>
                </div>
            </div>
        </div>;
    }
    // ── v12: Strikethrough highlighter style ──
    if (v === 12) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                <div style={{ background: accent, color: getContrastColor(accent), padding: "6px 16px", borderRadius: 4, alignSelf: "flex-start", fontSize: 13, fontWeight: 800, marginBottom: 24, letterSpacing: "0.04em" }}>
                    {of || "법률정보"}
                </div>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.45, wordBreak: "keep-all", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
                    {t.split(" ").map((word, i) => (
                        i < 2 ? <span key={i} style={{ background: `linear-gradient(transparent 55%, ${accent} 55%, ${accent} 78%, transparent 78%)`, marginRight: "0.25em" }}>{word}</span>
                            : <span key={i}>{word} </span>
                    ))}
                </h1>
                <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(42)}{nameTag}
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v13: Warm dark + bottom-aligned ──
    if (v === 13) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ ...abs0, background: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0.9) 100%)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 70px 56px", textAlign: "center" }}>
                <h1 style={{ color: "#FDFBE9", fontSize: ts, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.02em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ width: 40, height: 2, background: accent, margin: "20px auto 14px", borderRadius: 1 }} />
                <p style={{ color: "rgba(253,251,233,0.65)", fontSize: 14, fontWeight: 500 }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
                {of && <p style={{ color: accent, fontSize: 12, fontWeight: 800, marginTop: 12, letterSpacing: "0.16em" }}>{of.toUpperCase()}</p>}
            </div>{logoEl}
        </div>;
    }
    // ── v14: Highlight block title ──
    if (v === 14) {
        const words = t.split(" ");
        const firstHalf = words.slice(0, Math.ceil(words.length / 2)).join(" ");
        const secondHalf = words.slice(Math.ceil(words.length / 2)).join(" ");
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ ...abs0, background: "rgba(0,0,0,0.35)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 70px", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, marginBottom: 20, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
                <h1 style={{ color: getContrastColor(accent), fontSize: ts, fontWeight: 900, lineHeight: 1.45, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>
                    <span style={{ background: accent, padding: "2px 12px", display: "inline", boxDecorationBreak: "clone", lineHeight: 1.7 }}>{firstHalf}</span>
                    {secondHalf && <><br /><span style={{ background: a2, padding: "2px 12px", display: "inline", boxDecorationBreak: "clone", lineHeight: 1.7 }}>{secondHalf}</span></>}
                </h1>
            </div>{logoEl}
        </div>;
    }
    // ── v15: Serif dark editorial ──
    if (v === 15) {
        return <div id="blog-main-image" style={{ ...base, fontFamily: "'Nanum Myeongjo', 'Gowun Batang', serif" }}>
            {bgPhoto}
            <div style={{ ...abs0, background: "rgba(0,0,0,0.65)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                <div style={{ background: accent, color: getContrastColor(accent), padding: "5px 14px", fontSize: 13, fontWeight: 800, fontFamily: FONT, letterSpacing: "0.06em", marginBottom: 24, alignSelf: "flex-start" }}>
                    {of || nm + " 변호사"}
                </div>
                <h1 style={{ color: "#fff", fontSize: ts + 6, fontWeight: 800, lineHeight: 1.4, letterSpacing: "-0.04em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 36, display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 40, height: 2, background: accent, borderRadius: 1 }} />
                    <span style={{ color: "rgba(255,255,255,0.6)", fontFamily: FONT, fontSize: 14 }}>{nm} 변호사</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v16: Photo bg + bold accent highlight blocks ──
    if (v === 16) {
        const words = t.split(" ");
        const line1 = words.slice(0, Math.ceil(words.length * 0.6)).join(" ");
        const line2 = words.slice(Math.ceil(words.length * 0.6)).join(" ");
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "80px 70px" }}>
                <h1 style={{ fontSize: Math.round(ts * 1.05), fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.03em", wordBreak: "keep-all" }}>
                    <span style={{ background: accent, color: getContrastColor(accent), padding: "3px 14px", display: "inline", lineHeight: 1.7 }}>{line1}</span>
                    {line2 && <><br /><span style={{ background: accent, color: getContrastColor(accent), padding: "3px 14px", display: "inline", lineHeight: 1.7 }}>{line2}</span></>}
                </h1>
                <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginTop: 24, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
            </div>{logoEl}
        </div>;
    }
    // ── v17: White bg + grayscale top photo ──
    if (v === 17) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accent, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 60px" }}>
                <span style={{ color: accent, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 14 }}>{of || "법률 전문"}</span>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.03em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, marginTop: 16, textShadow: TS }}>{nm} 변호사</p>
            </div>
            {logoEl}
        </div>;
    }
    // ── v18: White bg + circular profile + accent circle ──
    if (v === 18) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 56, right: 72, width: 380, height: 380, borderRadius: "50%", background: `${accent}20`, zIndex: 1 }} />
            <div style={{ position: "absolute", top: 76, right: 92, width: 340, height: 340, borderRadius: "50%", overflow: "hidden", zIndex: 1 }}>
                {pImg ? <img src={pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    : <div style={{ width: "100%", height: "100%", background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100, fontWeight: 900, color: `${accent}50` }}>{nm[0]}</div>}
            </div>
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "60px 70px" }}>
                {logo ? <img src={logo} alt="" style={{ height: 38, objectFit: "contain", marginBottom: 80, opacity: 0.9 }} />
                    : <p style={{ color: "#fff", fontSize: 14, fontWeight: 900, letterSpacing: "0.1em", marginBottom: 80, textShadow: TS }}>{of || ""}</p>}
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{of || "법률 칼럼"}</span>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 500, textShadow: TS }}>{t}</h1>
                <p style={{ color: accent, fontSize: 15, fontWeight: 700, marginTop: 18, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
            </div>
        </div>;
    }
    // ── v19: Dark editorial + portrait right ──
    if (v === 19) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "60px 70px" }}>
                {logo ? <img src={logo} alt="" style={{ height: 34, objectFit: "contain", marginBottom: 56 }} />
                    : of ? <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 56 }}>{of}</p> : <div style={{ marginBottom: 56 }} />}
                <h1 style={{ color: tc, fontSize: Math.round(ts * 1.05), fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 560, textShadow: isDark ? TS : "none" }}>{t}</h1>
                <div style={{ marginTop: "auto", paddingBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 2, background: accent, borderRadius: 1 }} />
                        <span style={{ color: accent, fontSize: 14, fontWeight: 700, fontStyle: "italic", fontFamily: "'Georgia', serif" }}>{of || "Legal Insight"}</span>
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
                    <div style={{ marginTop: 12 }}>{circleProfile(48)}</div>
                </div>
            </div>
        </div>;
    }
    // ── v20: Dark + portrait + accent corner block ──
    if (v === 20) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "50%", height: "36%", background: accent }} />
            <div style={{ position: "relative", zIndex: 3, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "64px 70px" }}>
                {logo && <img src={logo} alt="" style={{ height: 30, objectFit: "contain", position: "absolute", top: 40, right: 56 }} />}
                <span style={{ color: `${tc}77`, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{of || "법률 전문"}</span>
                <h1 style={{ color: tc, fontSize: ts, fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 520, textShadow: isDark ? TS : "none" }}>{t}</h1>
                <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(52)}
                    <div>
                        <p style={{ color: getContrastColor(accent), fontSize: 15, fontWeight: 800 }}>{nm} 변호사</p>
                        {of && <p style={{ color: getContrastColor(accent), fontSize: 12, marginTop: 4, opacity: 0.75 }}>{of}</p>}
                    </div>
                </div>
            </div>
        </div>;
    }
    // ── v21: Bold serif editorial — accent horizontal stripe + serif title + divider ──
    if (v === 21) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: "44%", left: 0, right: 0, height: 100, background: `linear-gradient(90deg, ${accent}25, ${accent}10, transparent)` }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                <span style={{ color: accent, fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", marginBottom: 20 }}>{of || "법률 칼럼"}</span>
                <h1 style={{ color: tc, fontSize: ts + 8, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.05em", wordBreak: "keep-all", fontFamily: "'Nanum Myeongjo','Georgia',serif" }}>{t}</h1>
                <div style={{ width: 60, height: 4, background: accent, borderRadius: 2, margin: "32px auto 18px" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    {circleProfile(40)}
                    <span style={{ color: `${tc}88`, fontSize: 14, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v22: Bold accent sidebar + watermark initial ──
    if (v === 22) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", left: 0, top: 0, width: 16, height: "100%", background: `linear-gradient(180deg, ${accent}, ${a2})` }} />
            <div style={{ position: "absolute", bottom: -40, right: 40, fontSize: 400, fontWeight: 900, color: `${accent}06`, lineHeight: 0.8, fontFamily: "serif", userSelect: "none" }}>{nm[0]}</div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 60px 60px 56px" }}>
                <h1 style={{ color: tc, fontSize: ts + 4, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.03em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${tc}12`, display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(46)}
                    <div><span style={{ color: tc, fontSize: 16, fontWeight: 700 }}>{nm} 변호사</span>{of && <span style={{ color: `${tc}66`, fontSize: 12, marginLeft: 8 }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v23: Gradient corner + right-aligned text ──
    if (v === 23) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 0, left: 0, width: "55%", height: "55%", background: `linear-gradient(135deg,${accent}75,transparent)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-end", padding: "0 70px 60px", textAlign: "right" }}>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", textShadow: TS, maxWidth: 700 }}>{t}</h1>
                <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>{nm} 변호사</span>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent }} />
                    <span style={{ color: accent, fontSize: 14, fontWeight: 700 }}>{of || ""}</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v24: Magazine — accent top-right band ──
    if (v === 24) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 0, right: 0, width: 280, height: 72, background: accent, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                <span style={{ color: getContrastColor(accent), fontSize: 13, fontWeight: 800, letterSpacing: "0.12em" }}>{of || "법률 전문"}</span>
            </div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 60px" }}>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.28, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ width: 52, height: 4, background: accent, borderRadius: 2, marginTop: 22, marginBottom: 12 }} />
                {nameTag}
            </div>{logoEl}
        </div>;
    }
    // ── v25: Gradient overlay + frosted glass info bar ──
    if (v === 25) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: `linear-gradient(180deg, transparent, ${accent}CC 40%, ${accent})` }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60%", background: `linear-gradient(180deg, ${bg}DD, transparent)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 70px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 4, background: accent, borderRadius: 2 }} />
                    <span style={{ color: accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>{of || "법률 전문"}</span>
                </div>
                <div>
                    <h1 style={{ color: "#fff", fontSize: ts + 2, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all", textShadow: TS, marginBottom: 24 }}>{t}</h1>
                    <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", borderRadius: 14, padding: "18px 24px", display: "inline-flex", alignItems: "center", gap: 14 }}>
                        {circleProfile(42)}
                        <div><span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{nm} 변호사</span>
                        {of && <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, display: "block", marginTop: 2 }}>{of}</span>}</div>
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v26: Glass morphism card ──
    if (v === 26) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "68px 70px" }}>
                <div style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(16px)", borderRadius: 18, border: "1px solid rgba(255,255,255,0.14)", padding: "40px 48px", maxWidth: 720 }}>
                    <div style={{ width: 36, height: 3, background: accent, borderRadius: 2, marginBottom: 20 }} />
                    <h1 style={{ color: "#fff", fontSize: ts - 2, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                    <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
                        {circleProfile(38)}{nameTag}
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v27: Layered geometry — accent rectangles + pill tag ──
    if (v === 27) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 60, right: 50, width: 300, height: 180, background: `${accent}12`, borderRadius: 20, transform: "rotate(-3deg)" }} />
            <div style={{ position: "absolute", top: 100, right: 90, width: 220, height: 140, background: `${accent}08`, borderRadius: 16, transform: "rotate(1deg)" }} />
            <div style={{ position: "absolute", bottom: 80, left: 60, width: 160, height: 100, background: `${a2}08`, borderRadius: 14 }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${accent}, ${a2})` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <div style={{ display: "inline-flex", marginBottom: 24 }}>
                    <div style={{ padding: "6px 18px", borderRadius: 8, background: `${accent}18`, border: `1px solid ${accent}25` }}>
                        <span style={{ color: accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em" }}>{of || "법률 전문"}</span>
                    </div>
                </div>
                <h1 style={{ color: tc, fontSize: ts + 4, fontWeight: 900, lineHeight: 1.22, wordBreak: "keep-all", maxWidth: 700 }}>{t}</h1>
                <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(48)}
                    <div><span style={{ color: tc, fontSize: 16, fontWeight: 700 }}>{nm} 변호사</span>
                    {of && <span style={{ color: `${tc}55`, fontSize: 12, display: "block", marginTop: 2 }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v28: Quote bar left + bottom accent strip ──
    if (v === 28) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: accent, zIndex: 2 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 80px" }}>
                <div style={{ borderLeft: `5px solid ${accent}`, paddingLeft: 28 }}>
                    <span style={{ color: accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", display: "block", marginBottom: 14 }}>{of || "법률 칼럼"}</span>
                    <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.35, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                </div>
                <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 12, paddingLeft: 33 }}>
                    {circleProfile(38)}{nameTag}
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v29: Accent gradient + frosted glass card centered ──
    if (v === 29) {
        return <div id="blog-main-image" style={{ ...base, background: `linear-gradient(160deg,${accent},${a2})` }}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 70px" }}>
                <div style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(20px)", borderRadius: 24, padding: "52px 60px", maxWidth: 720, border: "1px solid rgba(255,255,255,0.1)" }}>
                    <h1 style={{ color: "#fff", fontSize: ts + 6, fontWeight: 900, lineHeight: 1.22, wordBreak: "keep-all", textShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>{t}</h1>
                    <div style={{ width: 52, height: 3, background: "rgba(255,255,255,0.35)", borderRadius: 2, margin: "28px auto 20px" }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                        {circleProfile(40)}
                        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v30: Clean white — accent top bar + profile left + bold title ──
    if (v === 30) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${accent}, ${a2})`, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                    {circleProfile(56)}
                    <div>
                        <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, textShadow: TS }}>{nm} 변호사</span>
                        {of && <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, display: "block", marginTop: 2 }}>{of}</span>}
                    </div>
                </div>
                <h1 style={{ color: "#fff", fontSize: ts + 6, fontWeight: 900, lineHeight: 1.28, wordBreak: "keep-all", letterSpacing: "-0.03em", textShadow: TS }}>{t}</h1>
                <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
                    <div style={{ width: 48, height: 4, borderRadius: 2, background: accent }} />
                    <div style={{ width: 16, height: 4, borderRadius: 2, background: `${accent}40` }} />
                </div>
            </div>
            {logoEl}
        </div>;
    }
    // ── v31: Photo + diagonal accent split ──
    if (v === 31) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg,${accent}DD 0%,${accent}DD 38%,transparent 38%)`, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                <h1 style={{ color: getContrastColor(accent), fontSize: ts, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", maxWidth: 480 }}>{t}</h1>
                <div style={{ marginTop: 22 }}><span style={{ color: getSubContrastColor(accent), fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
            </div>{logoEl}
        </div>;
    }
    // ── v32: Thick accent sidebar + name watermark + structured layout ──
    if (v === 32) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", left: 0, top: 0, width: 18, height: "100%", background: `linear-gradient(180deg, ${accent}, ${a2})` }} />
            <div style={{ position: "absolute", top: 50, right: 50, fontSize: 360, fontWeight: 900, color: `${accent}05`, lineHeight: 0.8, userSelect: "none" }}>{nm[0]}</div>
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px 60px 60px" }}>
                <span style={{ color: accent, fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", marginBottom: 26 }}>{of || "LAW"}</span>
                <h1 style={{ color: tc, fontSize: ts + 8, fontWeight: 900, lineHeight: 1.18, letterSpacing: "-0.04em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 36, paddingTop: 24, borderTop: `1px solid ${tc}10`, display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(44)}
                    <div><span style={{ color: tc, fontSize: 15, fontWeight: 700 }}>{nm} 변호사</span>
                    {of && <span style={{ color: `${tc}55`, fontSize: 12, display: "block", marginTop: 2 }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v33: Photo left / text right split ──
    if (v === 33) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                <span style={{ color: accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", marginBottom: 16 }}>{of || "법률 전문"}</span>
                <h1 style={{ color: tc, fontSize: ts, fontWeight: 900, lineHeight: 1.35, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ width: 36, height: 3, background: accent, borderRadius: 2, marginTop: 22, marginBottom: 14 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(42)}
                    <span style={{ color: `${tc}99`, fontSize: 13 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v34: Profile spotlight — centered photo + gradient top accent ──
    if (v === 34) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120, background: `linear-gradient(180deg, ${accent}, ${accent}00)` }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${accent}08 0%, transparent 70%)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                {pImg ? <img src={pImg} alt="" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", objectPosition: "top", border: `4px solid ${accent}40`, marginBottom: 24, boxShadow: `0 8px 32px ${accent}15` }} />
                    : <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, border: `4px solid ${accent}25` }}><span style={{ fontSize: 36, fontWeight: 900, color: accent }}>{nm[0]}</span></div>}
                <h1 style={{ color: tc, fontSize: ts + 2, fontWeight: 900, lineHeight: 1.28, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 2, background: `${accent}50` }} />
                    <span style={{ color: `${tc}88`, fontSize: 14, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                    <div style={{ width: 24, height: 2, background: `${accent}50` }} />
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v35: Photo bg + legal §§ watermark ──
    if (v === 35) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", bottom: -60, right: -20, fontSize: 440, fontWeight: 900, color: `${accent}15`, lineHeight: 1, zIndex: 1, fontFamily: "serif", userSelect: "none" }}>§</div>
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 56px" }}>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.28, wordBreak: "keep-all", textShadow: TS, marginBottom: 18 }}>{t}</h1>
                {nameTag}
            </div>{logoEl}
        </div>;
    }
    // ── v36: Rich gradient mesh + subtle grid + centered bold ──
    if (v === 36) {
        return <div id="blog-main-image" style={{ ...base, background: `radial-gradient(ellipse at 20% 80%,${accent}45,transparent 55%),radial-gradient(ellipse at 80% 20%,${a2}35,transparent 48%),${bg}` }}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${tc}04 1px, transparent 1px), linear-gradient(90deg, ${tc}04 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: accent }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 80px" }}>
                <div style={{ background: `${tc}08`, backdropFilter: "blur(8px)", borderRadius: 20, padding: "48px 56px", maxWidth: 760, border: `1px solid ${tc}08` }}>
                    <h1 style={{ color: tc, fontSize: ts + 6, fontWeight: 900, lineHeight: 1.22, wordBreak: "keep-all" }}>{t}</h1>
                    <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                        {circleProfile(40)}
                        <span style={{ color: `${tc}88`, fontSize: 15, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v37: Accent shadow card — centered with layered shadow ──
    if (v === 37) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 80%, ${accent}10, transparent 50%), radial-gradient(ellipse at 70% 20%, ${a2}08, transparent 40%)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "70px" }}>
                <div style={{ background: `${tc}05`, borderRadius: 24, padding: "52px 60px", maxWidth: 780, boxShadow: `0 0 0 1px ${tc}06, 0 20px 60px ${accent}10, 0 8px 24px rgba(0,0,0,0.08)` }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 28 }}>
                        <div style={{ width: 32, height: 4, borderRadius: 2, background: accent }} />
                        <div style={{ width: 12, height: 4, borderRadius: 2, background: `${accent}50` }} />
                        <div style={{ width: 6, height: 4, borderRadius: 2, background: `${accent}25` }} />
                    </div>
                    <span style={{ color: accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em" }}>{of || "법률 전문"}</span>
                    <h1 style={{ color: tc, fontSize: ts + 2, fontWeight: 900, lineHeight: 1.28, wordBreak: "keep-all", marginTop: 16 }}>{t}</h1>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 28, paddingTop: 20, borderTop: `1px solid ${tc}08` }}>
                        {circleProfile(38)}
                        <span style={{ color: `${tc}88`, fontSize: 14 }}>{nm} 변호사</span>
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v38: 시네마틱 인용구 — 다크 bg + 원형 프로필 크롭 + 큰 인용문 ──
    if (v === 38) {
        return <div id="blog-main-image" style={{ ...base, background: "#0A0A0A" }}>
            {bgPhoto}
            {/* 브랜드명 좌상단 */}
            {logo ? <img src={logo} alt="" style={{ position: "absolute", top: 36, left: 44, height: 24, objectFit: "contain", opacity: 0.7, zIndex: 3 }} />
                : of ? <span style={{ position: "absolute", top: 36, left: 44, color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", zIndex: 3 }}>{of}</span> : null}
            {/* 원형 프로필 크롭 — 우상단 오프셋 */}
            <div style={{ position: "absolute", top: 60, right: 80, width: 380, height: 380, borderRadius: "50%", overflow: "hidden", zIndex: 1 }}>
                {pImg ? <img src={pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", filter: "brightness(0.85) contrast(1.1)" }} />
                    : oImg ? <img src={oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.7)" }} />
                    : <div style={{ width: "100%", height: "100%", background: `radial-gradient(circle, ${accent}30, ${accent}10)` }} />}
            </div>
            {/* 장식 따옴표 */}
            <div style={{ position: "absolute", top: 490, left: 44, fontSize: 64, fontWeight: 300, color: "rgba(255,255,255,0.2)", lineHeight: 1, fontFamily: "Georgia,serif", zIndex: 2 }}>"</div>
            <div style={{ position: "absolute", bottom: 120, right: 300, fontSize: 64, fontWeight: 300, color: "rgba(255,255,255,0.15)", lineHeight: 1, fontFamily: "Georgia,serif", zIndex: 2, transform: "rotate(180deg)" }}>"</div>
            {/* 큰 인용구 스타일 제목 */}
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 60px 80px 44px" }}>
                <h1 style={{ color: "#fff", fontSize: Math.min(ts + 12, 68), fontWeight: 800, lineHeight: 1.3, wordBreak: "keep-all", maxWidth: 600, letterSpacing: "-0.02em" }}>{t}</h1>
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 2, background: accent, borderRadius: 1 }} />
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>{nm} 변호사</span>
                </div>
            </div>
        </div>;
    }
    // ── v39: Corner brackets frame + radial glow + bold centered ──
    if (v === 39) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${accent}08 0%, transparent 70%)` }} />
            <div style={{ position: "absolute", top: 36, left: 36, width: 64, height: 64, borderTop: `3px solid ${accent}`, borderLeft: `3px solid ${accent}` }} />
            <div style={{ position: "absolute", top: 36, right: 36, width: 64, height: 64, borderTop: `3px solid ${accent}`, borderRight: `3px solid ${accent}` }} />
            <div style={{ position: "absolute", bottom: 36, left: 36, width: 64, height: 64, borderBottom: `3px solid ${accent}`, borderLeft: `3px solid ${accent}` }} />
            <div style={{ position: "absolute", bottom: 36, right: 36, width: 64, height: 64, borderBottom: `3px solid ${accent}`, borderRight: `3px solid ${accent}` }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "80px 100px" }}>
                <span style={{ color: accent, fontSize: 13, fontWeight: 800, letterSpacing: "0.16em", marginBottom: 28 }}>{of || "법률 칼럼"}</span>
                <h1 style={{ color: tc, fontSize: ts + 6, fontWeight: 900, lineHeight: 1.22, wordBreak: "keep-all", letterSpacing: "-0.03em" }}>{t}</h1>
                <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(42)}
                    <span style={{ color: `${tc}88`, fontSize: 14, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v40: Full photo + initial letter watermark ──
    if (v === 40) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", top: -60, left: -20, fontSize: 540, fontWeight: 900, color: `${accent}14`, lineHeight: 1, zIndex: 1, fontFamily: "serif", userSelect: "none" }}>{nm[0]}</div>
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 56px" }}>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all", textShadow: TS, marginBottom: 18 }}>{t}</h1>
                {nameTag}
            </div>{logoEl}
        </div>;
    }
    // ── v41: Magazine cover — bottom accent band + editorial layout ──
    if (v === 41) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${accent}12 0%, transparent 25%, transparent 75%, ${accent}08 100%)` }} />
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 1, height: 100, background: `${accent}30` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />
                    <span style={{ color: `${tc}66`, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>{of || "LEGAL COLUMN"}</span>
                </div>
                <h1 style={{ color: tc, fontSize: ts + 8, fontWeight: 900, lineHeight: 1.18, wordBreak: "keep-all", letterSpacing: "-0.04em", maxWidth: 760 }}>{t}</h1>
                <div style={{ position: "absolute", bottom: 22, left: 80, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(36)}
                    <span style={{ color: getContrastColor(accent), fontSize: 14, fontWeight: 700 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v42: Photo collage top + gradient fade + structured text ──
    if (v === 42) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", overflow: "hidden" }}>
                {oImg ? <img src={oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} /> : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${accent}30, ${a2}20)` }} />}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "70%", background: `linear-gradient(180deg,transparent,${bg})` }} />
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accent }} />
            </div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 56px" }}>
                <span style={{ color: accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 16 }}>{of || "법률 전문"}</span>
                <h1 style={{ color: tc, fontSize: ts + 2, fontWeight: 900, lineHeight: 1.28, wordBreak: "keep-all", marginBottom: 24 }}>{t}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(44)}
                    <div><span style={{ color: tc, fontSize: 15, fontWeight: 700 }}>{nm} 변호사</span>
                    {of && <span style={{ color: `${tc}55`, fontSize: 12, display: "block", marginTop: 2 }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v43: Bold accent sidebar + vertical branding + profile ──
    if (v === 43) {
        return <div id="blog-main-image" style={{ ...base, display: "flex" }}>
            {bgPhoto}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 40px 60px 70px" }}>
                <span style={{ color: accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 20 }}>{of || "법률 전문"}</span>
                <h1 style={{ color: tc, fontSize: ts + 2, fontWeight: 900, lineHeight: 1.28, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(44)}
                    <div><span style={{ color: tc, fontSize: 15, fontWeight: 700 }}>{nm} 변호사</span>
                    {of && <span style={{ color: `${tc}55`, fontSize: 12, display: "block", marginTop: 2 }}>{of}</span>}</div>
                </div>
            </div>
            <div style={{ width: 180, background: `linear-gradient(180deg, ${accent}, ${a2})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "20px 0" }}>
                {logo && <img src={logo} alt="" style={{ height: 52, objectFit: "contain", filter: isLightColor(accent) ? "brightness(0.1)" : "brightness(1)", opacity: 0.85 }} />}
                <div style={{ width: 40, height: 2, background: `${getContrastColor(accent)}30`, borderRadius: 1 }} />
                <span style={{ color: getContrastColor(accent), fontSize: 14, fontWeight: 800, writingMode: "vertical-rl", letterSpacing: "0.25em" }}>{of || nm}</span>
            </div>
        </div>;
    }
    // ── v44: Photo bg + title in accent box ──
    if (v === 44) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "60px 70px" }}>
                <div style={{ background: `${accent}F0`, padding: "28px 36px", borderRadius: 14, maxWidth: 700, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                    <h1 style={{ color: getContrastColor(accent), fontSize: ts - 4, fontWeight: 900, lineHeight: 1.35, wordBreak: "keep-all" }}>{t}</h1>
                </div>
                <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(42)}
                    <div><span style={{ color: "#fff", fontSize: 15, fontWeight: 700, textShadow: TS }}>{nm} 변호사</span>{of && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, display: "block", textShadow: TS }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v45: Accent gradient + dot texture + glass overlay card ──
    if (v === 45) {
        return <div id="blog-main-image" style={{ ...base, background: `linear-gradient(160deg,${accent},${a2})` }}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)`, backgroundSize: "28px 28px" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "rgba(0,0,0,0.12)" }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 70px", position: "relative", zIndex: 1 }}>
                <div style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(16px)", borderRadius: 22, padding: "48px 56px", maxWidth: 740, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <h1 style={{ color: "#fff", fontSize: ts + 6, fontWeight: 900, lineHeight: 1.22, letterSpacing: "-0.03em", wordBreak: "keep-all", textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>{t}</h1>
                    <div style={{ width: 52, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2, margin: "28px auto 20px" }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                        {circleProfile(40)}
                        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v46: 에디토리얼 오버레이 — 풀 포토 + 줄별 다른 스타일 텍스트 ──
    if (v === 46) {
        const titleLines = t.split(/(?<=.{8,})/g).slice(0, 3); // 제목을 8자+ 단위로 분리
        const styles = [
            { fontSize: Math.min(ts + 10, 64), fontWeight: 900, color: "#fff", background: "none", padding: "0" },
            { fontSize: Math.min(ts + 6, 52), fontWeight: 800, color: accent, background: `rgba(255,255,255,0.92)`, padding: "4px 14px", borderRadius: "6px", display: "inline" },
            { fontSize: Math.min(ts + 10, 64), fontWeight: 900, color: "#fff", background: "none", padding: "0" },
        ];
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            {/* 텍스트 레이어 */}
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {titleLines.map((line, i) => (
                        <div key={i} style={{ lineHeight: 1.35, wordBreak: "keep-all", letterSpacing: "-0.03em", textShadow: styles[i % 3].background === "none" ? TS : "none", ...(styles[i % 3] as React.CSSProperties) }}>{line}</div>
                    ))}
                </div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, marginTop: 28, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
            </div>{logoEl}
        </div>;
    }
    // ── v47: Clean white editorial — accent bar group + profile + border bottom ──
    if (v === 47) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${accent}, ${a2})`, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>
                    <div style={{ width: 48, height: 6, background: accent, borderRadius: 3 }} />
                    <div style={{ width: 16, height: 6, background: `${accent}50`, borderRadius: 3 }} />
                    <div style={{ width: 8, height: 6, background: `${accent}25`, borderRadius: 3 }} />
                </div>
                <h1 style={{ color: "#fff", fontSize: ts + 4, fontWeight: 900, lineHeight: 1.28, wordBreak: "keep-all", letterSpacing: "-0.03em", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(48)}
                    <div><span style={{ color: "#fff", fontSize: 15, fontWeight: 700, textShadow: TS }}>{nm} 변호사</span>
                    {of && <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, display: "block", marginTop: 2 }}>{of}</span>}</div>
                </div>
            </div>
            {logoEl}
        </div>;
    }
    // ── v48: 볼드 컬러 스플릿 — 2톤 배경 + 흑백 프로필 + 큰 따옴표 ──
    if (v === 48) {
        return <div id="blog-main-image" style={{ ...base, background: isDark ? bg : "#1A1A2E" }}>
            {bgPhoto}
            {/* 하단 accent 영역 */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "42%", background: accent }} />
            {/* 장식 큰따옴표 */}
            <div style={{ position: "absolute", top: 50, left: 50, fontSize: 140, fontWeight: 900, color: "rgba(255,255,255,0.1)", lineHeight: 1, fontFamily: "Georgia,serif", zIndex: 1 }}>"</div>
            {/* 원형 프로필 */}
            <div style={{ position: "absolute", top: "12%", right: "12%", zIndex: 2 }}>
                {circleProfile(140)}
            </div>
            {/* 하단 텍스트 영역 */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3, padding: "32px 60px 48px" }}>
                <h1 style={{ color: getContrastColor(accent), fontSize: Math.min(ts + 8, 66), fontWeight: 900, lineHeight: 1.2, wordBreak: "keep-all", letterSpacing: "-0.03em", maxWidth: 700 }}>{t}</h1>
                <p style={{ color: getSubContrastColor(accent), fontSize: 14, fontWeight: 600, marginTop: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
            </div>
            {/* 로고/사무소명 좌상단 */}
            {logo ? <img src={logo} alt="" style={{ position: "absolute", top: 36, left: 44, height: 28, objectFit: "contain", opacity: 0.8, zIndex: 3 }} />
                : of ? <span style={{ position: "absolute", top: 36, left: 44, color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", zIndex: 3 }}>{of}</span> : null}
        </div>;
    }
    // ── v49: Portrait spotlight — centered profile + radial glow ──
    if (v === 49) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(circle, ${accent}10 0%, transparent 70%)` }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 80px" }}>
                {pImg ? <div style={{ width: 100, height: 100, borderRadius: "50%", overflow: "hidden", border: `3px solid ${accent}35`, marginBottom: 24, boxShadow: `0 8px 32px ${accent}15` }}>
                    <img src={pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                </div> : <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, border: `3px solid ${accent}25` }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: accent }}>{nm[0]}</span>
                </div>}
                <h1 style={{ color: tc, fontSize: ts + 2, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all", maxWidth: 720 }}>{t}</h1>
                <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 2, background: `${accent}50` }} />
                    <span style={{ color: `${tc}77`, fontSize: 14, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                    <div style={{ width: 24, height: 2, background: `${accent}50` }} />
                </div>
            </div>{logoEl}
        </div>;
    }
    // ── v50: fallback — professional gradient mesh + accent top + structured ──
    return <div id="blog-main-image" style={{ ...base, background: bg }}>
        {bgPhoto}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 20% 80%, ${accent}15 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, ${a2}10 0%, transparent 45%)` }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
            <span style={{ color: accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", marginBottom: 26 }}>{of || "법률 칼럼"}</span>
            <h1 style={{ color: tc, fontSize: ts + 6, fontWeight: 900, lineHeight: 1.22, letterSpacing: "-0.04em", wordBreak: "keep-all" }}>{t}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 32 }}>
                {circleProfile(44)}
                <div><span style={{ color: tc, fontSize: 15, fontWeight: 700, display: "block" }}>{nm} 변호사</span>
                {of && <span style={{ color: `${tc}55`, fontSize: 12 }}>{of}</span>}</div>
            </div>
        </div>{logoEl}
    </div>;
}
