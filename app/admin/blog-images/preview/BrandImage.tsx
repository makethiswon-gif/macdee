"use client";
import { S, FONT, TS, BL_ALL, getContrastColor, getSubContrastColor, isLightColor } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";
interface P { config: GenerationConfig; profile: BlogProfile; }

export default function BrandImage({ config, profile }: P) {
    const v = config.brandVariant % BL_ALL.length;
    const a1 = profile.brandColor || config.accentColor;
    const a2 = config.secondaryAccent || a1;
    const { lawyerName: nm, officeName: of, logoImage: logo, specialty: tags, brandLines: bl, officeImages, profileImages } = profile;
    const bg = config.backgroundColor || "#111";
    const tc = config.textColor || "#fff";
    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: bg };
    const logoEl = (w = 120) => logo ? <img src={logo} alt="" style={{ height: w, objectFit: "contain" }} /> : null;
    const tagLine = ""; // specialty tags disabled per user request
    const lines = (bl || []).slice(0, 3);
    const linesEl = lines.length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16, textAlign: "center" }}>
        {lines.map((l, i) => <p key={i} style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5 }}>{l}</p>)}
    </div> : null;
    const oImg = officeImages?.[config.officeImageIndex] || officeImages?.[0];
    const pImg = profileImages?.[config.profileImageIndex] || profileImages?.[0];
    const profImg = (w: number, h: number, r: number) => pImg ? <img src={pImg} alt="" style={{ width: w, height: h, borderRadius: r, objectFit: "cover", objectPosition: "top" }} /> : null;

    if (v === 0) { // Logo on accent gradient
        const tc = getContrastColor(a1); const sc = getSubContrastColor(a1);
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(160deg,${a1},${a2})`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "rgba(0,0,0,0.1)" }} />
            {logo && <div style={{ filter: isLightColor(a1) ? "brightness(0.2)" : "brightness(1)" }}>{logoEl(120)}</div>}
            <h2 style={{ color: tc, fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em" }}>{nm} 변호사</h2>
            {of && <p style={{ color: sc, fontSize: 16 }}>{of}</p>}
            <p style={{ color: sc, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em" }}>{tagLine}</p>
            {linesEl && <div style={{ color: sc }}>{linesEl}</div>}
        </div>;
    }
    if (v === 1) { // Bold name on accent bg
        const tc = getContrastColor(a1); const sc = getSubContrastColor(a1);
        return <div id="blog-brand-image" style={{ ...base, background: a1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <p style={{ color: sc, fontSize: 14, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 20 }}>{of || tagLine}</p>
            <h1 style={{ color: tc, fontSize: 80, fontWeight: 900, letterSpacing: "-0.05em" }}>{nm}</h1>
            <p style={{ color: sc, fontSize: 18, fontWeight: 700, marginTop: 8 }}>변호사</p>
            <div style={{ width: 50, height: 3, background: `${tc}30`, borderRadius: 2, marginTop: 24 }} />
            {logo && <div style={{ marginTop: 30, filter: isLightColor(a1) ? "brightness(0.2)" : "brightness(1)" }}>{logoEl(80)}</div>}
            {linesEl && <div style={{ color: sc }}>{linesEl}</div>}
        </div>;
    }
    if (v === 2) { // Frosted glass card on accent gradient
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(180deg, ${a1} 0%, ${a2} 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", background: "rgba(255,255,255,0.85)", borderRadius: 24, padding: "50px 60px", maxWidth: 700, boxShadow: "0 10px 40px rgba(0,0,0,0.15)" }}>
                {logo && <div style={{ filter: "brightness(0.2)", marginBottom: 16 }}>{logoEl(80)}</div>}
                <div style={{ width: 2, height: 40, background: a1, margin: "0 auto 16px" }} />
                <h2 style={{ color: "#111", fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em" }}>{nm} 변호사</h2>
                {of && <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>{of}</p>}
                <p style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginTop: 16 }}>{tagLine}</p>
                {linesEl && <div style={{ color: "#444" }}>{linesEl}</div>}
            </div>
        </div>;
    }
    if (v === 3) { // Full gradient bg with tags
        const tc = getContrastColor(a1); const sc = getSubContrastColor(a1);
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(135deg,${a1},${a2})`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            {logo && <div style={{ filter: isLightColor(a1) ? "brightness(0.1)" : "brightness(1)" }}>{logoEl(100)}</div>}
            <h2 style={{ color: tc, fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
            {of && <p style={{ color: sc, fontSize: 15 }}>{of}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>{(tags || []).map((t, i) => <span key={i} style={{ padding: "5px 16px", borderRadius: 20, border: `1px solid ${tc}30`, color: tc, fontSize: 12, fontWeight: 700 }}>{t}</span>)}</div>
            {linesEl && <div style={{ color: sc }}>{linesEl}</div>}
        </div>;
    }
    if (v === 4) { // Accent stripe left on accent-tinted bg
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(135deg, ${bg} 0%, ${a1}30 100%)` }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: "100%", background: a1 }} />
            <div style={{ position: "absolute", top: "46%", left: 0, right: 0, height: 120, background: `${a1}35` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {logoEl(100)}
                <h2 style={{ color: tc, fontSize: 34, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: `${tc}CC`, fontSize: 14 }}>{of}</p>}
            </div>
        </div>;
    }
    if (v === 5) { // Accent circles on accent-tinted bg
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(180deg, ${bg} 0%, ${a1}30 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: `${a1}40` }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 350, height: 350, borderRadius: "50%", background: `${a1}30` }} />
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                {logoEl(100)}
                <h2 style={{ color: tc, fontSize: 36, fontWeight: 900, marginTop: 16 }}>{nm}</h2>
                <p style={{ color: a1, fontSize: 14, fontWeight: 600, marginTop: 8 }}>변호사{of ? ` · ${of}` : ""}</p>
            </div>
        </div>;
    }
    if (v === 6) { // Split: accent left, dark right
        const tc = getContrastColor(a1);
        return <div id="blog-brand-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 50%", background: a1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <h1 style={{ color: tc, fontSize: 56, fontWeight: 900 }}>{nm}</h1>
            </div>
            <div style={{ flex: "0 0 50%", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {logoEl(80)}
                <p style={{ color: tc, fontSize: 18, fontWeight: 700 }}>변호사</p>
                {of && <p style={{ color: `${tc}CC`, fontSize: 13 }}>{of}</p>}
                <p style={{ color: a1, fontSize: 12, letterSpacing: "0.1em", marginTop: 8 }}>{tagLine}</p>
            </div>
        </div>;
    }
    if (v === 7) { // Frosted card on accent dot pattern
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(180deg,${a1}80,${a2})` }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle,rgba(255,255,255,0.12) 1px,transparent 1px)`, backgroundSize: "24px 24px" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
                <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 20, padding: "40px 56px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                    {logo && <div style={{ filter: "brightness(0.2)", marginBottom: 12 }}>{logoEl(80)}</div>}
                    <h2 style={{ color: "#111", fontSize: 34, fontWeight: 900 }}>{nm} 변호사</h2>
                    {of && <p style={{ color: "#666", fontSize: 14, marginTop: 6 }}>{of}</p>}
                    <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>{(tags || []).slice(0, 3).map((t, i) => <span key={i} style={{ padding: "4px 14px", borderRadius: 6, background: `${a1}30`, color: "#333", fontSize: 12, fontWeight: 600 }}>{t}</span>)}</div>
                    {linesEl && <div style={{ color: "#444" }}>{linesEl}</div>}
                </div>
            </div>
        </div>;
    }
    if (v === 8) { // Light warm bg
        const tc = getContrastColor(a1); const sc = getSubContrastColor(a1);
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(135deg,${a1},${a2},#F5F0EB)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                {logo && <div style={{ marginBottom: 20, filter: isLightColor(a1) ? "brightness(0.2)" : "brightness(1)" }}>{logoEl(100)}</div>}
                <h2 style={{ color: tc, fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: sc, fontSize: 15, marginTop: 8 }}>{of}</p>}
                <div style={{ width: 40, height: 3, background: `${tc}30`, borderRadius: 2, margin: "20px auto 16px" }} />
                <p style={{ color: sc, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>{tagLine}</p>
                {linesEl && <div style={{ color: sc }}>{linesEl}</div>}
            </div>
        </div>;
    }
    // v===9: Accent corner gradients
    if (v === 9) {
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(180deg, ${bg} 0%, ${a1}20 50%, ${bg} 100%)` }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 400, height: 400, background: `linear-gradient(225deg,${a1}80,transparent)` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 300, height: 300, background: `linear-gradient(45deg,${a2}60,transparent)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
                {logoEl(100)}
                <h2 style={{ color: tc, fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: `${tc}CC`, fontSize: 15 }}>{of}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <div style={{ width: 24, height: 2, background: a1 }} />
                    <span style={{ color: a1, fontSize: 13, fontWeight: 600, letterSpacing: "0.1em" }}>{tagLine}</span>
                    <div style={{ width: 24, height: 2, background: a1 }} />
                </div>
                {linesEl && <div style={{ color: "rgba(255,255,255,0.7)" }}>{linesEl}</div>}
            </div>
        </div>;
    }

    // v===10: Office photo bg + centered firm name + taglines (SERAJ LAW style)
    if (v === 10) {
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            {/* Office photo background with dark warm overlay */}
            {oImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(30,20,10,0.4) 0%, rgba(30,20,10,0.7) 40%, rgba(30,20,10,0.5) 100%)" }} />
            {/* Content */}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                {/* Top tagline */}
                <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: 600, lineHeight: 1.6, letterSpacing: "0.15em", marginBottom: 60, textTransform: "uppercase", textShadow: TS }}>
                    {lines[0] || `${tagLine}`}
                </p>
                {/* Large centered firm name */}
                {logo ? <div style={{ marginBottom: 60 }}>{logoEl(80)}</div>
                    : <h1 style={{ color: "#fff", fontSize: 70, fontWeight: 900, letterSpacing: "0.08em", textShadow: TS, marginBottom: 60 }}>{of || nm}</h1>}
                {/* Bottom taglines */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                    {lines.slice(0, 2).map((l, i) => <p key={i} style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", textShadow: TS }}>{l}</p>)}
                    {!lines.length && <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 700, letterSpacing: "0.12em", textShadow: TS }}>{nm} 변호사</p>}
                </div>
            </div>
        </div>;
    }

    // v===11: Dark warm bg + serif italic quote + brackets (Alexandra Rocha style)
    if (v === 11) {
        const quote = lines[0] || `${nm} 변호사와 함께하는 법률 상담`;
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            {/* Partial portrait on right - subtle */}
            {pImg && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "40%", overflow: "hidden" }}>
                <img src={pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "left top", opacity: 0.4 }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #2a1f1a 0%, transparent 50%)" }} />
            </div>}
            {/* Name + specialty in top corners */}
            <div style={{ position: "absolute", top: 50, left: 60, zIndex: 2 }}>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>{nm} 변호사</p>
                {of && <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4 }}>{of}</p>}
            </div>
            <div style={{ position: "absolute", top: 50, right: 60, textAlign: "right", zIndex: 2 }}>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>{tags?.[0] || "법률 전문"}</p>
                {tags?.[1] && <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4 }}>{tags[1]}</p>}
            </div>
            {/* Centered serif italic quote with bracket decoration */}
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
                <div style={{ position: "relative", maxWidth: 600, padding: "30px 40px" }}>
                    {/* Bracket corners */}
                    <div style={{ position: "absolute", top: 0, left: 0, width: 20, height: 20, borderTop: "2px solid rgba(255,255,255,0.4)", borderLeft: "2px solid rgba(255,255,255,0.4)" }} />
                    <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: "2px solid rgba(255,255,255,0.4)", borderRight: "2px solid rgba(255,255,255,0.4)" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, width: 20, height: 20, borderBottom: "2px solid rgba(255,255,255,0.4)", borderLeft: "2px solid rgba(255,255,255,0.4)" }} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderBottom: "2px solid rgba(255,255,255,0.4)", borderRight: "2px solid rgba(255,255,255,0.4)" }} />
                    <p style={{ color: "#fff", fontSize: 30, fontWeight: 300, fontStyle: "italic", fontFamily: "'Nanum Myeongjo', 'Georgia', serif", lineHeight: 1.6, wordBreak: "keep-all" }}>{quote}</p>
                </div>
            </div>
            {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", height: 50, objectFit: "contain", opacity: 0.5 }} />}
        </div>;
    }

    // v===12: Office photo bg + bold text + accent highlight blocks (Borges & Pontes style)
    if (v === 12) {
        const tc = getContrastColor(a1);
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            {oImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                <h1 style={{ color: "#fff", fontSize: 54, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.02em", wordBreak: "keep-all", textShadow: TS, marginBottom: 12 }}>
                    {nm}
                    {tags?.[0] && <><br /><span style={{ background: a1, color: tc, padding: "2px 12px", display: "inline-block" }}>{tags[0]}</span></>}
                </h1>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 20, fontWeight: 500, textShadow: TS, marginBottom: 8 }}>변호사{of ? ` · ${of}` : ""}</p>
                {tags && tags.length > 1 && <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                    {tags.slice(1, 4).map((t, i) => <span key={i} style={{ padding: "6px 16px", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", borderRadius: 4, color: "#fff", fontSize: 14, fontWeight: 600 }}>{t}</span>)}
                </div>}
                {lines[0] && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 24, fontWeight: 500, maxWidth: 500, lineHeight: 1.6, textShadow: TS }}>{lines[0]}</p>}
            </div>
            {logo && <div style={{ position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)", zIndex: 2, background: "rgba(255,255,255,0.9)", padding: "8px 24px", borderRadius: 8 }}>{logoEl(40)}</div>}
        </div>;
    }

    // v===13: Blurred office photo + frosted glass card (Projetura style)
    if (v === 13) {
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            {oImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(6px) brightness(0.5)", transform: "scale(1.05)" }} />}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 30%, ${a1}30 100%)` }} />
            {/* Main frosted glass card */}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 70px" }}>
                <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.2)", padding: "50px 56px", maxWidth: 650, width: "100%" }}>
                    {/* Accent tabs at top-left */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                        <div style={{ width: 24, height: 8, borderRadius: 2, background: a1, opacity: 0.6 }} />
                        <div style={{ width: 24, height: 8, borderRadius: 2, background: a1 }} />
                    </div>
                    {of && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, fontStyle: "italic", marginBottom: 12 }}>{of}</p>}
                    <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all" }}>{nm} 변호사</h2>
                    {lines[0] && <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 18, fontWeight: 500, marginTop: 12, lineHeight: 1.5 }}>{lines[0]}</p>}
                </div>
                {/* Accent sub-card */}
                <div style={{ background: a1, borderRadius: 14, padding: "16px 32px", marginTop: -10, marginLeft: 40, alignSelf: "flex-start", maxWidth: 400 }}>
                    <p style={{ color: getContrastColor(a1), fontSize: 20, fontWeight: 700 }}>{tagLine}</p>
                </div>
            </div>
        </div>;
    }

    // v===14: Full photo bg + speech bubble brand lines
    if (v === 14) {
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            {(pImg || oImg) && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${pImg || oImg})`, backgroundSize: "cover", backgroundPosition: "center top" }} />}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)" }} />
            <svg style={{ position: "absolute", top: "10%", right: "10%", width: 300, height: 300, opacity: 0.15, zIndex: 1 }} viewBox="0 0 300 300" fill="none">
                <path d="M 150 20 Q 280 80, 260 200 Q 240 300, 100 280" stroke={a1} strokeWidth="1.5" />
                <path d="M 130 40 Q 250 100, 230 220 Q 210 320, 80 300" stroke={a1} strokeWidth="1" />
            </svg>
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                {lines[0] && <div style={{ position: "relative", background: "rgba(50,50,50,0.85)", backdropFilter: "blur(8px)", borderRadius: 16, padding: "20px 28px", maxWidth: 450, marginBottom: 20, alignSelf: "flex-end" }}>
                    <p style={{ color: "#fff", fontSize: 18, fontWeight: 600, lineHeight: 1.5 }}>{lines[0]}</p>
                    <div style={{ position: "absolute", bottom: -10, right: 40, width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "12px solid rgba(50,50,50,0.85)" }} />
                </div>}
                <div style={{ marginTop: 20 }}>
                    <h2 style={{ color: "#fff", fontSize: 32, fontWeight: 900, lineHeight: 1.4, textShadow: TS, wordBreak: "keep-all" }}>
                        {nm} 변호사{of ? `\n${of}` : ""}
                    </h2>
                    {lines[1] && <p style={{ color: "#fff", fontSize: 22, fontWeight: 300, marginTop: 8, textShadow: TS, lineHeight: 1.5 }}>{lines[1]}</p>}
                    {tags?.[0] && <p style={{ color: "#fff", fontSize: 40, fontWeight: 900, marginTop: 4, textShadow: TS }}>{tags[0]}...</p>}
                </div>
            </div>
            {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 50, objectFit: "contain", opacity: 0.6 }} />}
        </div>;
    }
    // v===15: Centered name + brand line + accent circle
    if (v === 15) {
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", border: `1px solid ${a1}20` }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 80px" }}>
                {profImg(100, 120, 60) && <div style={{ marginBottom: 20 }}>{profImg(100, 120, 60)}</div>}
                <h2 style={{ color: tc, fontSize: 40, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: `${tc}AA`, fontSize: 15, marginTop: 4 }}>{of}</p>}
                <div style={{ width: 50, height: 3, background: a1, borderRadius: 2, margin: "24px auto" }} />
                {lines[0] && <p style={{ color: `${tc}CC`, fontSize: 20, fontWeight: 600, lineHeight: 1.5, wordBreak: "keep-all" }}>{lines[0]}</p>}
                {tagLine && <p style={{ color: a1, fontSize: 16, fontWeight: 700, marginTop: 12 }}>{tagLine}</p>}
            </div>{logoEl()}
        </div>;
    }
    // v===16: Accent gradient bg + serif title
    if (v === 16) {
        const cTc = getContrastColor(a1);
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(135deg,${a1},${a2})` }}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 80px" }}>
                <h2 style={{ color: cTc, fontSize: 44, fontWeight: 900, fontFamily: "'Nanum Myeongjo','Georgia',serif", letterSpacing: "-0.02em" }}>{nm}</h2>
                <p style={{ color: `${cTc}CC`, fontSize: 16, fontWeight: 600, marginTop: 4 }}>변호사{of ? ` · ${of}` : ""}</p>
                <div style={{ width: 60, height: 3, background: `${cTc}40`, borderRadius: 2, margin: "28px auto" }} />
                {lines[0] && <p style={{ color: cTc, fontSize: 22, fontWeight: 600, lineHeight: 1.5, wordBreak: "keep-all" }}>{lines[0]}</p>}
                {tagLine && <p style={{ color: `${cTc}99`, fontSize: 15, marginTop: 16 }}>{tagLine}</p>}
            </div>{logoEl()}
        </div>;
    }
    // v===17: Photo left + text right split
    if (v === 17) {
        return <div id="blog-brand-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 42%", position: "relative", overflow: "hidden" }}>
                {(pImg || oImg) ? <img src={pImg || oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /> : <div style={{ width: "100%", height: "100%", background: `linear-gradient(180deg,${a1},${a2})` }} />}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px" }}>
                <span style={{ color: a1, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 16 }}>BRAND</span>
                <h2 style={{ color: tc, fontSize: 34, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: `${tc}88`, fontSize: 14, marginTop: 4 }}>{of}</p>}
                <div style={{ width: 40, height: 3, background: a1, borderRadius: 2, marginTop: 20, marginBottom: 16 }} />
                {lines[0] && <p style={{ color: `${tc}CC`, fontSize: 18, lineHeight: 1.6, wordBreak: "keep-all" }}>{lines[0]}</p>}
                {tagLine && <p style={{ color: a1, fontSize: 15, fontWeight: 700, marginTop: 12 }}>{tagLine}</p>}
            </div>{logoEl()}
        </div>;
    }
    // v===18: White card on dark + accent bar
    if (v === 18) {
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 8, height: "100%", background: `linear-gradient(180deg,${a1},${a2})` }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 60px 60px 80px" }}>
                {profImg(80, 80, 40) && <div style={{ marginBottom: 20 }}>{profImg(80, 80, 40)}</div>}
                <h2 style={{ color: tc, fontSize: 38, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: `${tc}AA`, fontSize: 14, marginTop: 4 }}>{of}</p>}
                <div style={{ marginTop: 24 }}>
                    {lines[0] && <p style={{ color: `${tc}CC`, fontSize: 20, lineHeight: 1.6, wordBreak: "keep-all" }}>{lines[0]}</p>}
                    {tagLine && <p style={{ color: a1, fontSize: 16, fontWeight: 700, marginTop: 12 }}>{tagLine}</p>}
                </div>
            </div>{logoEl()}
        </div>;
    }
    // v===19: Accent box over photo
    if (v === 19) {
        return <div id="blog-brand-image" style={base}>
            {(pImg || oImg) && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${pImg || oImg})`, backgroundSize: "cover", backgroundPosition: "center top" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.7))" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                <div style={{ background: a1, borderRadius: 14, padding: "24px 32px", maxWidth: 500, marginBottom: 20 }}>
                    {lines[0] && <p style={{ color: getContrastColor(a1), fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{lines[0]}</p>}
                </div>
                <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 900, textShadow: TS }}>{nm} 변호사</h2>
                {of && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 }}>{of}</p>}
                {tagLine && <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, fontWeight: 600, marginTop: 12, textShadow: TS }}>{tagLine}</p>}
            </div>{logoEl()}
        </div>;
    }
    // v===20: Minimalist white + accent highlight
    if (v === 20) {
        return <div id="blog-brand-image" style={{ ...base, background: "#FAFAFA" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: a1 }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <h2 style={{ color: "#111", fontSize: 40, fontWeight: 900 }}>{nm}</h2>
                <p style={{ color: "#666", fontSize: 16, marginTop: 4 }}>변호사{of ? ` · ${of}` : ""}</p>
                <div style={{ width: 60, height: 4, background: a1, borderRadius: 2, marginTop: 24, marginBottom: 20 }} />
                {lines[0] && <p style={{ color: "#333", fontSize: 20, lineHeight: 1.6, wordBreak: "keep-all" }}>{lines[0]}</p>}
                {tagLine && <p style={{ color: a1, fontSize: 16, fontWeight: 700, marginTop: 16 }}>{tagLine}</p>}
            </div>
            {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 20, right: 24, height: 40, objectFit: "contain", filter: "brightness(0.2)", opacity: 0.3 }} />}
        </div>;
    }
    // v===21: Glass card centered on gradient
    if (v === 21) {
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(135deg,${a1}40,${a2}30,${bg})` }}>
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 50 }}>
                <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(16px)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.15)", padding: "50px 56px", maxWidth: 650, width: "100%", textAlign: "center" }}>
                    {profImg(80, 80, 40) && <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>{profImg(80, 80, 40)}</div>}
                    <h2 style={{ color: tc, fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
                    {of && <p style={{ color: `${tc}99`, fontSize: 14, marginTop: 4 }}>{of}</p>}
                    <div style={{ width: 40, height: 3, background: a1, borderRadius: 2, margin: "20px auto" }} />
                    {lines[0] && <p style={{ color: `${tc}CC`, fontSize: 18, lineHeight: 1.5, wordBreak: "keep-all" }}>{lines[0]}</p>}
                    {tagLine && <p style={{ color: a1, fontSize: 14, fontWeight: 700, marginTop: 12 }}>{tagLine}</p>}
                </div>
            </div>{logoEl()}
        </div>;
    }
    // v===22: Big letter watermark + name
    if (v === 22) {
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: -80, left: -40, fontSize: 500, fontWeight: 900, color: `${a1}12`, lineHeight: 1, fontFamily: "serif" }}>{nm[0]}</div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                {profImg(90, 110, 14) && <div style={{ marginBottom: 20 }}>{profImg(90, 110, 14)}</div>}
                <h2 style={{ color: tc, fontSize: 42, fontWeight: 900, letterSpacing: "-0.02em" }}>{nm} 변호사</h2>
                {of && <p style={{ color: `${tc}88`, fontSize: 14, marginTop: 4 }}>{of}</p>}
                <div style={{ marginTop: 24 }}>
                    {lines[0] && <p style={{ color: `${tc}CC`, fontSize: 20, lineHeight: 1.6, wordBreak: "keep-all" }}>{lines[0]}</p>}
                    {tagLine && <p style={{ color: a1, fontSize: 15, fontWeight: 700, marginTop: 12 }}>{tagLine}</p>}
                </div>
            </div>{logoEl()}
        </div>;
    }
    // v===23: Double frame + centered brand
    if (v === 23) {
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", inset: 24, border: `1px solid ${a1}40`, borderRadius: 16 }} />
            <div style={{ position: "absolute", inset: 40, border: `1px solid ${a1}20`, borderRadius: 12 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 100px" }}>
                <h2 style={{ color: tc, fontSize: 42, fontWeight: 900 }}>{nm}</h2>
                <p style={{ color: `${tc}AA`, fontSize: 16, marginTop: 4 }}>변호사{of ? ` · ${of}` : ""}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0" }}><div style={{ width: 24, height: 2, background: a1 }} /><span style={{ color: a1, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>BRAND</span><div style={{ width: 24, height: 2, background: a1 }} /></div>
                {lines[0] && <p style={{ color: `${tc}CC`, fontSize: 18, lineHeight: 1.5, wordBreak: "keep-all" }}>{lines[0]}</p>}
            </div>{logoEl()}
        </div>;
    }
    // v===24: Bold stacked name on dark
    if (v === 24) {
        return <div id="blog-brand-image" style={{ ...base, background: bg }}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <span style={{ color: a1, fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 20 }}>ATTORNEY</span>
                <h2 style={{ color: tc, fontSize: 56, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em" }}>{nm}</h2>
                <p style={{ color: `${tc}88`, fontSize: 18, marginTop: 8 }}>변호사{of ? ` · ${of}` : ""}</p>
                <div style={{ width: 50, height: 3, background: a1, borderRadius: 2, marginTop: 24, marginBottom: 20 }} />
                {lines[0] && <p style={{ color: `${tc}CC`, fontSize: 20, lineHeight: 1.6, wordBreak: "keep-all", maxWidth: 600 }}>{lines[0]}</p>}
                {tagLine && <p style={{ color: a1, fontSize: 15, fontWeight: 700, marginTop: 16 }}>{tagLine}</p>}
            </div>{logoEl()}
        </div>;
    }
    // v===25: Accent right sidebar + brand
    if (v === 25) {
        return <div id="blog-brand-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 50px 60px 70px" }}>
                {profImg(80, 100, 12) && <div style={{ marginBottom: 20 }}>{profImg(80, 100, 12)}</div>}
                <h2 style={{ color: tc, fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: `${tc}88`, fontSize: 14, marginTop: 4 }}>{of}</p>}
                <div style={{ marginTop: 24 }}>
                    {lines[0] && <p style={{ color: `${tc}CC`, fontSize: 18, lineHeight: 1.6, wordBreak: "keep-all" }}>{lines[0]}</p>}
                    {tagLine && <p style={{ color: a1, fontSize: 15, fontWeight: 700, marginTop: 12 }}>{tagLine}</p>}
                </div>
            </div>
            <div style={{ width: 160, background: a1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: getContrastColor(a1), fontSize: 14, fontWeight: 800, writingMode: "vertical-rl", letterSpacing: "0.2em" }}>{of || nm}</span>
            </div>{logoEl()}
        </div>;
    }
    // v===26-44: Parametric brand variants
    if (v >= 26 && v <= 44) {
        const layouts: Array<{ bg: string; centered: boolean; hasPhoto: boolean; accentPos: string }> = [
            { bg: `linear-gradient(135deg,${bg},${a1}25)`, centered: false, hasPhoto: true, accentPos: "top" }, // 26
            { bg, centered: true, hasPhoto: false, accentPos: "circle" }, // 27
            { bg: `linear-gradient(180deg,${a1},${a2})`, centered: true, hasPhoto: true, accentPos: "none" }, // 28
            { bg, centered: false, hasPhoto: true, accentPos: "left" }, // 29
            { bg: `radial-gradient(ellipse at 30% 70%,${a1}50,transparent 60%),${bg}`, centered: false, hasPhoto: false, accentPos: "bottom" }, // 30
            { bg, centered: true, hasPhoto: false, accentPos: "frame" }, // 31
            { bg: `linear-gradient(160deg,${bg},${a2}30)`, centered: false, hasPhoto: true, accentPos: "top" }, // 32
            { bg: a1, centered: true, hasPhoto: true, accentPos: "none" }, // 33
            { bg, centered: false, hasPhoto: false, accentPos: "left" }, // 34
            { bg: `linear-gradient(135deg,${a2},${a1})`, centered: true, hasPhoto: false, accentPos: "none" }, // 35
            { bg, centered: false, hasPhoto: true, accentPos: "bottom" }, // 36
            { bg: `linear-gradient(180deg,${bg},${a1}20)`, centered: true, hasPhoto: false, accentPos: "circle" }, // 37
            { bg, centered: false, hasPhoto: false, accentPos: "top" }, // 38
            { bg: `linear-gradient(135deg,${a1}60,${bg})`, centered: true, hasPhoto: true, accentPos: "none" }, // 39
            { bg, centered: false, hasPhoto: true, accentPos: "left" }, // 40
            { bg: `linear-gradient(180deg,${a1},${bg})`, centered: false, hasPhoto: false, accentPos: "bottom" }, // 41
            { bg, centered: true, hasPhoto: false, accentPos: "frame" }, // 42
            { bg: `${a2}`, centered: true, hasPhoto: true, accentPos: "none" }, // 43
            { bg, centered: false, hasPhoto: false, accentPos: "circle" }, // 44
        ];
        const idx = v - 26;
        const layout = layouts[idx];
        const isAccentBg = v === 28 || v === 33 || v === 35 || v === 43;
        const fgColor = isAccentBg ? getContrastColor(a1) : tc;
        const subColor = isAccentBg ? getSubContrastColor(a1) : `${tc}AA`;

        return <div id="blog-brand-image" style={{ ...base, background: layout.bg }}>
            {layout.accentPos === "top" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: a1 }} />}
            {layout.accentPos === "left" && <div style={{ position: "absolute", left: 0, top: 0, width: 8, height: "100%", background: `linear-gradient(180deg,${a1},${a2})` }} />}
            {layout.accentPos === "bottom" && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: a1 }} />}
            {layout.accentPos === "circle" && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", border: `1px solid ${a1}20` }} />}
            {layout.accentPos === "frame" && <div style={{ position: "absolute", inset: 24, border: `1px solid ${a1}30`, borderRadius: 16 }} />}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: layout.centered ? "column" : "column", alignItems: layout.centered ? "center" : "flex-start", justifyContent: "center", textAlign: layout.centered ? "center" : "left", padding: layout.accentPos === "left" ? "60px 70px 60px 80px" : "60px 80px" }}>
                {layout.hasPhoto && profImg(80, layout.centered ? 80 : 100, layout.centered ? 40 : 12) && <div style={{ marginBottom: 20 }}>{profImg(80, layout.centered ? 80 : 100, layout.centered ? 40 : 12)}</div>}
                <h2 style={{ color: fgColor, fontSize: 38, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: subColor, fontSize: 14, marginTop: 4 }}>{of}</p>}
                <div style={{ width: 50, height: 3, background: isAccentBg ? `${fgColor}40` : a1, borderRadius: 2, margin: layout.centered ? "20px auto" : "20px 0" }} />
                {lines[0] && <p style={{ color: isAccentBg ? fgColor : `${tc}CC`, fontSize: 18, lineHeight: 1.6, wordBreak: "keep-all" }}>{lines[0]}</p>}
                {tagLine && <p style={{ color: isAccentBg ? `${fgColor}99` : a1, fontSize: 15, fontWeight: 700, marginTop: 12 }}>{tagLine}</p>}
            </div>{logoEl()}
        </div>;
    }

    // v===44 fallback: Simple dark brand
    return <div id="blog-brand-image" style={{ ...base, background: bg }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 2, height: 100, background: a1 }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 80px" }}>
            {profImg(80, 80, 40) && <div style={{ marginBottom: 20 }}>{profImg(80, 80, 40)}</div>}
            <h2 style={{ color: tc, fontSize: 40, fontWeight: 900 }}>{nm} 변호사</h2>
            {of && <p style={{ color: `${tc}AA`, fontSize: 15, marginTop: 4 }}>{of}</p>}
            <div style={{ width: 40, height: 3, background: a1, borderRadius: 2, margin: "20px auto" }} />
            {lines[0] && <p style={{ color: `${tc}CC`, fontSize: 20, lineHeight: 1.5, wordBreak: "keep-all" }}>{lines[0]}</p>}
            {tagLine && <p style={{ color: a1, fontSize: 15, fontWeight: 700, marginTop: 12 }}>{tagLine}</p>}
        </div>{logoEl()}
    </div>;
}

