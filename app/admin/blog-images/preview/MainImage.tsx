"use client";
import { S, FONT, TS, ML_ALL, getContrastColor, isLightColor } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";

interface P { config: GenerationConfig; profile: BlogProfile; }

export default function MainImage({ config, profile }: P) {
    const v = config.mainVariant % ML_ALL.length;
    const accent = profile.brandColor || config.accentColor;
    const a2 = config.secondaryAccent || accent;
    const oImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
    const pImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const op = config.overlayOpacity;
    const t = config.postTitle;
    const tags = profile.specialty || [];
    const nm = profile.lawyerName;
    const of = profile.officeName;
    const logo = profile.logoImage;
    const ts = Math.round(42 * ML_ALL[v].titleScale);

    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: `linear-gradient(160deg, #0C0C0C 0%, ${accent}25 100%)` };
    const abs0: React.CSSProperties = { position: "absolute", inset: 0 };
    // Accent-tinted gradient overlay — always shows the palette color
    const bgPhoto = <>{oImg && <div style={{ ...abs0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}<div style={{ ...abs0, background: `linear-gradient(180deg,${accent}55 0%,rgba(0,0,0,0.6) 50%,${accent}30 100%)` }} /></>;
    const nameTag = <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>;
    const logoEl = logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 60, objectFit: "contain", opacity: 0.7 }} />;
    const tagEls = tags.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 14px", borderRadius: 4, background: accent, color: getContrastColor(accent), fontSize: 13, fontWeight: 700, textShadow: isLightColor(accent) ? "none" : TS }}>{t}</span>)}</div>;
    // Circular profile photo helper - face-focused
    const circleProfile = (size: number) => pImg ? <img src={pImg} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", objectPosition: "top", border: `4px solid ${accent}`, boxShadow: `0 4px 20px rgba(0,0,0,0.5)` }} /> : null;


    if (v === 0) { // Full photo bg + accent gradient bottom
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: `linear-gradient(0deg, ${accent} 0%, transparent 100%)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", textShadow: TS, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 1) { // Photo bg + centered huge text
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ ...abs0, background: `linear-gradient(180deg,${accent}15 0%,rgba(0,0,0,0.85) 100%)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.04em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 24, padding: "6px 20px", borderRadius: 6, background: `${accent}30`, color: "#fff", fontSize: 14, fontWeight: 600, textShadow: TS }}>{nm} 변호사</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 2) { // Split: accent left panel / photo right
        return <div id="blog-main-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 55%", position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 50px 60px 70px", background: `linear-gradient(180deg, ${accent} 0%, ${a2} 100%)` }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ width: 4, height: 36, background: "#111", borderRadius: 2, marginBottom: 20 }} />
                    <span style={{ color: "#111", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12, display: "block", opacity: 0.7 }}>{tags[0] || "법률 전문"}</span>
                    <h1 style={{ color: "#111", fontSize: ts, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>{t}</h1>
                    <div style={{ marginTop: 24 }}><span style={{ color: "rgba(0,0,0,0.6)", fontSize: 15 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
                </div>
            </div>
            <div style={{ flex: "0 0 45%", position: "relative" }}>
                {(pImg || oImg) ? <img src={pImg || oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /> : <div style={{ width: "100%", height: "100%", background: "#161616" }} />}
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,${accent} 0%,transparent 25%)` }} />
            </div>{logoEl}
        </div>;
    }
    if (v === 3) { // Photo bg + white text box overlay
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
                <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 20, padding: "50px 60px", maxWidth: 750, textAlign: "center", color: "#111" }}>
                    {tags.length > 0 && <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>{tags.map((t, i) => <span key={i} style={{ padding: "4px 12px", borderRadius: 4, background: `${accent}15`, color: accent, fontSize: 12, fontWeight: 600 }}>{t}</span>)}</div>}
                    <h1 style={{ fontSize: ts - 4, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{t}</h1>
                    <p style={{ color: "#666", fontSize: 14, marginTop: 16 }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 4) { // Accent bg circles + left text + circular profile
        return <div id="blog-main-image" style={{ ...base, background: `linear-gradient(150deg, ${accent} 0%, ${a2} 100%)` }}>
            <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
            <div style={{ position: "absolute", bottom: -60, left: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
            <div style={{ position: "absolute", top: "40%", left: "55%", width: 200, height: 200, borderRadius: "50%", background: "rgba(0,0,0,0.06)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px 60px 90px" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 14px", borderRadius: 4, background: "rgba(0,0,0,0.15)", color: "#111", fontSize: 13, fontWeight: 700 }}>{t}</span>)}</div>
                <h1 style={{ color: "#111", fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 700 }}>{t}</h1>
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 16 }}>
                    {circleProfile(50)}
                    <span style={{ color: "rgba(0,0,0,0.65)", fontSize: 15 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 5) { // Diagonal accent gradient + bottom text
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ ...abs0, background: `linear-gradient(135deg,${accent}90 0%,transparent 45%,${a2}60 100%)` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px 80px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 16px", borderRadius: 20, background: accent, color: "#111", fontSize: 12, fontWeight: 700 }}>{t}</span>)}</div>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 6) { // Top photo strip + accent bottom
        return <div id="blog-main-image" style={{ ...base, background: accent }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", overflow: "hidden" }}>
                {oImg ? <img src={oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: a2 }} />}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: `linear-gradient(180deg,transparent,${accent})` }} />
            </div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                <div style={{ width: 4, height: 30, background: "#111", borderRadius: 2, marginBottom: 16 }} />
                <h1 style={{ color: "#111", fontSize: ts, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20 }}><span style={{ color: "rgba(0,0,0,0.6)", fontSize: 15 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
            </div>{logoEl}
        </div>;
    }
    if (v === 7) { // Centered text + accent horizontal band
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", top: "42%", left: 0, right: 0, height: 160, background: `${accent}CC` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 20, textShadow: TS }}>{tags.join(" · ") || "법률 전문"}</span>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.04em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ width: 50, height: 4, background: "#fff", borderRadius: 2, margin: "24px auto 16px" }} />
                {nameTag}
            </div>{logoEl}
        </div>;
    }
    if (v === 8) { // Photo bg + pill tags + bottom
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 16px", borderRadius: 20, background: accent, color: "#fff", fontSize: 12, fontWeight: 700 }}>{t}</span>)}</div>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, textShadow: TS, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 9) { // Photo bg + grid pattern + left aligned + circular profile
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ ...abs0, backgroundImage: `radial-gradient(circle,${accent}10 1px,transparent 1px)`, backgroundSize: "30px 30px" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 800, textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(44)}
                    <div style={{ width: 4, height: 24, background: accent, borderRadius: 2 }} />
                    {nameTag}
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 10) { // Center poster — accent circle bg
        const topTxt = tags[0] || (of ? `${of} 칼럼` : "법률 칼럼");
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: `${accent}60` }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 450, height: 450, borderRadius: "50%", background: `${accent}40` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                {circleProfile(80)}
                <p style={{ color: "rgba(255,255,255,0.9)", fontSize: Math.round(ts * 0.45), fontWeight: 700, marginBottom: 12, marginTop: 20, textShadow: TS }}>{topTxt}</p>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: Math.round(ts * 0.5), fontWeight: 800, marginTop: 30, textShadow: TS }}>{nm} 변호사</p>
            </div>{logoEl}
        </div>;
    }
    if (v === 11) { // Newspaper style
        return <div id="blog-main-image" style={{ ...base, background: "#F4F4F4", border: "10px solid #F4F4F4" }}>
            <div style={{ height: "100%", border: "1px solid #222", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "16px 0", borderBottom: "1px solid #222", textAlign: "center" }}>
                    <span style={{ color: "#111", fontSize: 28, fontWeight: 900, fontFamily: "serif", fontStyle: "italic" }}>{of || nm}</span>
                </div>
                <div style={{ flex: 1, position: "relative", padding: "20px 20px 0 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: "100%", height: "80%", background: "#ccc", position: "relative", border: "1px solid #222" }}>
                        {oImg && <img src={oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(30%)" }} />}
                    </div>
                    <div style={{ position: "absolute", bottom: 50, width: "88%", background: "rgba(255,255,255,0.95)", border: "2px solid #111", padding: "34px 40px" }}>
                        <h1 style={{ color: "#111", fontSize: Math.round(ts * 0.8), fontWeight: 800, lineHeight: 1.4, wordBreak: "keep-all", textAlign: "center" }}>
                            {t.split(" ").map((word, i) => (
                                i === 0 || i === 1 ? <span key={i} style={{ background: `linear-gradient(180deg,transparent 55%,${accent}40 55%)`, marginRight: "0.25em" }}>{word}</span> : <span key={i}>{word} </span>
                            ))}
                        </h1>
                    </div>
                </div>
            </div>{logoEl && <div style={{ position: "absolute", bottom: 36, right: 40, filter: "invert(1)" }}><img src={logo} alt="" style={{ height: 60, opacity: 0.8 }} /></div>}
        </div>;
    }
    if (v === 12) { // Strikethrough marker
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                <div style={{ background: accent, color: "#111", padding: "6px 14px", borderRadius: 4, alignSelf: "flex-start", fontSize: 13, fontWeight: 800, marginBottom: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                    {tags[0] || of || "법률정보"}
                </div>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.45, wordBreak: "keep-all", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                    {t.split(" ").map((word, i) => (
                        i < 2 ? <span key={i} style={{ background: `linear-gradient(transparent 50%, ${accent} 50%, ${accent} 75%, transparent 75%)`, marginRight: "0.25em" }}>{word}</span> : <span key={i}>{word} </span>
                    ))}
                </h1>
                <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(44)}
                    {nameTag}
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 13) {
        // v===13: Cafe / bottom text typography
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "60px 70px 50px", textAlign: "center" }}>
                <h1 style={{ color: "#FCFBEA", fontSize: ts, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <p style={{ color: "rgba(252,251,234,0.7)", fontSize: Math.round(ts * 0.4), fontWeight: 600, marginTop: 18, textShadow: TS }}>{tags.join(" · ") || nm + " 변호사"}</p>
                {of && <p style={{ color: accent, fontSize: 18, fontWeight: 900, marginTop: 44, letterSpacing: "0.15em", textShadow: TS }}>{of.toUpperCase()}</p>}
            </div>{logoEl}
        </div>;
    }
    if (v === 14) { // Highlighter Block (Ref 1/3)
        // Wraps specific words in a solid accent background box
        const words = t.split(" ");
        const firstHalf = words.slice(0, Math.ceil(words.length / 2)).join(" ");
        const secondHalf = words.slice(Math.ceil(words.length / 2)).join(" ");
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 70px", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 18, fontWeight: 600, marginBottom: 20 }}>{nm} 변호사 {of && `· ${of}`}</p>
                <h1 style={{ color: "#111", fontSize: ts, fontWeight: 900, lineHeight: 1.45, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>
                    <span style={{ background: accent, padding: "0 10px", display: "inline-block", lineHeight: 1.2, marginBottom: "8px" }}>{firstHalf}</span><br />
                    <span style={{ background: a2, padding: "0 10px", display: "inline-block", lineHeight: 1.2 }}>{secondHalf}</span>
                </h1>
                {tags.length > 0 && <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 40 }}>{tags.map((t, i) => <span key={i} style={{ padding: "6px 18px", borderRadius: 20, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>{t}</span>)}</div>}
            </div>{logoEl}
        </div>;
    }
    // v===15: Serif + Badge (Ref 5)
    return <div id="blog-main-image" style={{ ...base, fontFamily: "'Nanum Myeongjo', 'Gowun Batang', serif" }}>
        {bgPhoto}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)" }} />
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px", alignItems: "flex-start" }}>
            <div style={{ background: accent, color: getContrastColor(accent), padding: "4px 10px", fontSize: 14, fontWeight: 800, fontFamily: FONT, letterSpacing: "0.05em", marginBottom: 20 }}>{of || nm + " 변호사"}</div>
            <h1 style={{ color: "#fff", fontSize: ts + 10, fontWeight: 800, lineHeight: 1.4, letterSpacing: "-0.05em", wordBreak: "keep-all", textShadow: TS }}>
                {t.split(" ").map((word, i) => (
                    <span key={i} style={{ display: "inline-block", marginRight: "0.3em", position: "relative" }}>
                        {word}
                        {i % 2 === 1 && <span style={{ position: "absolute", bottom: "15%", left: "-10%", right: "-10%", height: "2px", background: accent, transform: "rotate(-2deg)" }} />}
                    </span>
                ))}
            </h1>
            <div style={{ marginTop: 50, display: "flex", gap: 16 }}>
                {tags.map((t, i) => <span key={i} style={{ color: "rgba(255,255,255,0.7)", fontFamily: FONT, fontSize: 13, border: "1px solid rgba(255,255,255,0.3)", padding: "4px 12px", borderRadius: 20 }}>{t}</span>)}
            </div>
        </div>{logoEl}
    </div>;
}
