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
    const op = config.overlayOpacity;
    const t = config.postTitle;
    const tags = profile.specialty || [];
    const nm = profile.lawyerName;
    const of = profile.officeName;
    const logo = profile.logoImage;
    const ts = Math.round(42 * ML_ALL[v].titleScale);
    const bg = config.backgroundColor || "#111";
    const tc = config.textColor || "#fff";

    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: `linear-gradient(160deg, ${bg} 0%, ${accent}25 100%)` };
    const abs0: React.CSSProperties = { position: "absolute", inset: 0 };
    // Accent-tinted gradient overlay — always shows the palette color
    const bgPhoto = <>{oImg && <div style={{ ...abs0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}<div style={{ ...abs0, background: `linear-gradient(180deg,${accent}55 0%,${bg}CC 50%,${accent}30 100%)` }} /></>;
    const nameTag = <span style={{ color: `${tc}CC`, fontSize: 15, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>;
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
                    <div style={{ width: 4, height: 36, background: getContrastColor(accent), borderRadius: 2, marginBottom: 20 }} />
                    <span style={{ color: getContrastColor(accent), fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12, display: "block", opacity: 0.7 }}>{tags[0] || "법률 전문"}</span>
                    <h1 style={{ color: getContrastColor(accent), fontSize: ts, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>{t}</h1>
                    <div style={{ marginTop: 24 }}><span style={{ color: getSubContrastColor(accent), fontSize: 15 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
                </div>
            </div>
            <div style={{ flex: "0 0 45%", position: "relative" }}>
                {(pImg || oImg) ? <img src={pImg || oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /> : <div style={{ width: "100%", height: "100%", background: bg }} />}
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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 14px", borderRadius: 4, background: "rgba(0,0,0,0.15)", color: getContrastColor(accent), fontSize: 13, fontWeight: 700 }}>{t}</span>)}</div>
                <h1 style={{ color: getContrastColor(accent), fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 700 }}>{t}</h1>
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 16 }}>
                    {circleProfile(50)}
                    <span style={{ color: getSubContrastColor(accent), fontSize: 15 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
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
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 16px", borderRadius: 20, background: accent, color: getContrastColor(accent), fontSize: 12, fontWeight: 700 }}>{t}</span>)}</div>
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
                <div style={{ width: 4, height: 30, background: getContrastColor(accent), borderRadius: 2, marginBottom: 16 }} />
                <h1 style={{ color: getContrastColor(accent), fontSize: ts, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20 }}><span style={{ color: getSubContrastColor(accent), fontSize: 15 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
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
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 16px", borderRadius: 20, background: accent, color: getContrastColor(accent), fontSize: 12, fontWeight: 700 }}>{t}</span>)}</div>
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
                <div style={{ background: accent, color: getContrastColor(accent), padding: "6px 14px", borderRadius: 4, alignSelf: "flex-start", fontSize: 13, fontWeight: 800, marginBottom: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
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
                <h1 style={{ color: getContrastColor(accent), fontSize: ts, fontWeight: 900, lineHeight: 1.45, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>
                    <span style={{ background: accent, padding: "0 10px", display: "inline-block", lineHeight: 1.2, marginBottom: "8px" }}>{firstHalf}</span><br />
                    <span style={{ background: a2, padding: "0 10px", display: "inline-block", lineHeight: 1.2 }}>{secondHalf}</span>
                </h1>
                {tags.length > 0 && <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 40 }}>{tags.map((t, i) => <span key={i} style={{ padding: "6px 18px", borderRadius: 20, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>{t}</span>)}</div>}
            </div>{logoEl}
        </div>;
    }
    // v===15: Serif + Badge (Ref 5)
    if (v === 15) {
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

    // v===16: Photo BG + Bold Colored Highlight Blocks (New Ref 1)
    // Full photo background with large colored block highlights behind title text
    if (v === 16) {
        const words = t.split(" ");
        const line1 = words.slice(0, Math.ceil(words.length * 0.6)).join(" ");
        const line2 = words.slice(Math.ceil(words.length * 0.6)).join(" ");
        const tc = getContrastColor(accent);
        return <div id="blog-main-image" style={base}>
            {oImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "80px 70px" }}>
                <h1 style={{ fontSize: Math.round(ts * 1.1), fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.03em", wordBreak: "keep-all" }}>
                    <span style={{ background: accent, color: tc, padding: "4px 14px", display: "inline", boxDecorationBreak: "clone", lineHeight: 1.7 }}>{line1}</span>
                    {line2 && <><br /><span style={{ background: accent, color: tc, padding: "4px 14px", display: "inline", boxDecorationBreak: "clone", lineHeight: 1.7 }}>{line2}</span></>}
                </h1>
                <p style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginTop: 30, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
                {tags.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    {tags.map((t, i) => <span key={i} style={{ padding: "4px 12px", borderRadius: 4, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 13, fontWeight: 600 }}>{t}</span>)}
                </div>}
            </div>{logoEl}
        </div>;
    }

    // v===17: White BG + Grayscale Profile Top + Accent Tags (New Ref 2)
    // Clean white background, grayscale profile photo centered at top, bold black title, accent-colored tag labels  
    if (v === 17) {
        return <div id="blog-main-image" style={{ ...base, background: "#fff" }}>
            {/* Grayscale profile photo area - top portion */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", display: "flex", justifyContent: "center", alignItems: "flex-end", overflow: "hidden" }}>
                {pImg ? <img src={pImg} alt="" style={{ height: "100%", objectFit: "cover", objectPosition: "top", filter: "grayscale(100%)", maxWidth: "80%" }} />
                    : oImg ? <img src={oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} />
                        : <div style={{ width: "100%", height: "100%", background: "#E8E8E8" }} />}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", background: "linear-gradient(180deg, transparent, #fff)" }} />
            </div>
            {/* Accent bar at top */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: accent }} />
            {/* Text content at bottom */}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                <span style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 12 }}>{of || "법률 전문"}</span>
                <h1 style={{ color: "#111", fontSize: ts, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.03em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ display: "flex", gap: 12, marginTop: 24, alignItems: "center" }}>
                    {tags.map((t, i) => <span key={i} style={{ color: accent, fontSize: 16, fontWeight: 800 }}>{t}</span>)}
                    {tags.length > 1 && tags.slice(0, -1).map((_, i) => <span key={`s${i}`} style={{ color: "#ccc", fontSize: 16 }}>|</span>).flatMap((el, i) => i < tags.length - 1 ? [el] : [])}
                </div>
                <p style={{ color: "#888", fontSize: 14, fontWeight: 600, marginTop: 12 }}>{nm} 변호사</p>
            </div>
            {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 50, objectFit: "contain", filter: "brightness(0.2)", opacity: 0.5 }} />}
        </div>;
    }

    // v===18: White BG + Circular Portrait with Accent Circle Behind (New Ref 3)
    // White/light background, large circular portrait with accent circle, bold black title text
    if (v === 18) {
        return <div id="blog-main-image" style={{ ...base, background: "#fff" }}>
            {/* Accent circle behind profile photo - positioned top right */}
            <div style={{ position: "absolute", top: 60, right: 80, width: 380, height: 380, borderRadius: "50%", background: accent }} />
            {/* Circular profile photo, slightly offset from accent circle */}
            <div style={{ position: "absolute", top: 80, right: 100, width: 340, height: 340, borderRadius: "50%", overflow: "hidden" }}>
                {pImg ? <img src={pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    : <div style={{ width: "100%", height: "100%", background: "#E8E8E8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, fontWeight: 900, color: "#ccc" }}>{nm[0]}</div>}
            </div>
            {/* Office name / brand at top-left */}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "60px 70px" }}>
                {logo ? <img src={logo} alt="" style={{ height: 40, objectFit: "contain", filter: "brightness(0.2)", marginBottom: 80 }} />
                    : <p style={{ color: "#111", fontSize: 16, fontWeight: 900, letterSpacing: "0.1em", marginBottom: 80 }}>{of || ""}</p>}
                <span style={{ color: "#666", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{tags[0] || of || "법률 칼럼"}</span>
                <h1 style={{ color: "#111", fontSize: ts, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 520 }}>{t}</h1>
                <p style={{ color: accent, fontSize: 16, fontWeight: 700, marginTop: 16 }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
            </div>
        </div>;
    }

    // v===19: Dark Editorial + Large Portrait Right + Curved Accent Lines (New Ref 4)
    // Dark charcoal background, large portrait on right side, bold white title on left, decorative curved accent lines
    if (v === 19) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {/* Curved decorative accent line */}
            <svg style={{ position: "absolute", top: "25%", left: "30%", width: 500, height: 500, opacity: 0.2, zIndex: 1 }} viewBox="0 0 500 500" fill="none">
                <ellipse cx="250" cy="250" rx="200" ry="220" stroke={accent} strokeWidth="1.5" />
            </svg>
            {/* Large portrait on right */}
            <div style={{ position: "absolute", right: 0, bottom: 0, width: "55%", height: "85%", overflow: "hidden" }}>
                {pImg ? <img src={pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    : oImg ? <img src={oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", background: "#2a2a2a" }} />}
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${bg} 0%, transparent 30%)` }} />
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${bg} 0%, transparent 15%)` }} />
            </div>
            {/* Brand at top */}
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "60px 70px" }}>
                {logo ? <img src={logo} alt="" style={{ height: 36, objectFit: "contain", marginBottom: 60 }} />
                    : of ? <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 60 }}>{of}</p> : <div style={{ marginBottom: 60 }} />}
                <h1 style={{ color: tc, fontSize: Math.round(ts * 1.1), fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 580, textShadow: isLightColor(bg) ? "none" : TS }}>{t}</h1>
                <div style={{ marginTop: "auto", paddingBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 30, height: 2, background: accent }} />
                        <span style={{ color: accent, fontSize: 18, fontWeight: 800, fontStyle: "italic", fontFamily: "'Georgia', serif" }}>{tags[0] || "Legal Insight"}</span>
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
                </div>
            </div>
        </div>;
    }

    // v===20: Black/Accent Split + Portrait Overlap (New Ref 5)
    if (v === 20) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "55%", height: "40%", background: accent }} />
            <svg style={{ position: "absolute", top: "15%", left: "10%", width: 600, height: 600, opacity: 0.15, zIndex: 1 }} viewBox="0 0 600 600" fill="none">
                <ellipse cx="300" cy="300" rx="250" ry="280" stroke={accent} strokeWidth="1.5" />
                <ellipse cx="320" cy="280" rx="200" ry="230" stroke={accent} strokeWidth="1" />
            </svg>
            <div style={{ position: "absolute", right: 40, bottom: 0, width: "50%", height: "80%", zIndex: 2 }}>
                {pImg ? <img src={pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    : oImg ? <img src={oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : null}
            </div>
            <div style={{ position: "relative", zIndex: 3, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "70px 70px" }}>
                {logo && <img src={logo} alt="" style={{ height: 32, objectFit: "contain", position: "absolute", top: 40, right: 60 }} />}
                <span style={{ color: `${tc}99`, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{tags[0] || of || "법률 전문"}</span>
                <h1 style={{ color: tc, fontSize: ts, fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 550, textShadow: isLightColor(bg) ? "none" : TS }}>{t}</h1>
                <div style={{ marginTop: "auto", paddingBottom: 20 }}>
                    <p style={{ color: getContrastColor(accent), fontSize: 16, fontWeight: 800 }}>{tags.length > 1 ? tags.slice(0, 3).join(" · ") : nm + " 변호사"}</p>
                    <p style={{ color: getContrastColor(accent), fontSize: 14, fontWeight: 500, marginTop: 4, opacity: 0.7 }}>{of || ""}</p>
                </div>
            </div>
        </div>;
    }

    // v===21: Minimal horizontal band + large serif title
    if (v === 21) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 200, background: `${accent}25`, transform: "translateY(-50%)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                <span style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 24 }}>{tags[0] || "법률 칼럼"}</span>
                <h1 style={{ color: tc, fontSize: ts + 6, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.04em", wordBreak: "keep-all", fontFamily: "'Nanum Myeongjo','Georgia',serif" }}>{t}</h1>
                <div style={{ width: 50, height: 3, background: accent, borderRadius: 2, margin: "28px auto 16px" }} />
                <span style={{ color: `${tc}99`, fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
            </div>{logoEl}
        </div>;
    }
    // v===22: Vertical accent bar left + large title
    if (v === 22) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 12, height: "100%", background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 60px 60px 80px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{tags.map((tg, i) => <span key={i} style={{ padding: "4px 12px", borderRadius: 20, background: `${accent}20`, color: accent, fontSize: 12, fontWeight: 700 }}>{tg}</span>)}</div>
                <h1 style={{ color: tc, fontSize: ts + 4, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.03em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(44)}
                    <div><span style={{ color: tc, fontSize: 15, fontWeight: 700 }}>{nm} 변호사</span>{of && <span style={{ color: `${tc}88`, fontSize: 12, marginLeft: 8 }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===23: Gradient corner + text bottom right
    if (v === 23) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 0, left: 0, width: "60%", height: "60%", background: `linear-gradient(135deg,${accent}80,transparent)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-end", padding: "60px 70px", textAlign: "right" }}>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all", textShadow: TS, maxWidth: 700 }}>{t}</h1>
                <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: accent, fontSize: 14, fontWeight: 700 }}>{tags[0] || ""}</span>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>{nm} 변호사</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===24: Magazine cover with top-right accent block
    if (v === 24) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            {bgPhoto}
            <div style={{ position: "absolute", top: 0, right: 0, width: 300, height: 80, background: accent, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                <span style={{ color: getContrastColor(accent), fontSize: 14, fontWeight: 800, letterSpacing: "0.1em" }}>{tags[0] || "법률 전문"}</span>
            </div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                <h1 style={{ color: "#fff", fontSize: ts + 2, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ width: 60, height: 4, background: accent, borderRadius: 2, marginTop: 24, marginBottom: 12 }} />
                {nameTag}
            </div>{logoEl}
        </div>;
    }
    // v===25: Two-tone background (dark + accent bottom)
    if (v === 25) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                {tagEls}
                <h1 style={{ color: tc, fontSize: ts + 2, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 32 }}>
                    <span style={{ color: getContrastColor(accent), fontSize: 15, fontWeight: 700 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===26: Photo bg + glass morphism card top
    if (v === 26) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "70px 70px" }}>
                <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.2)", padding: "40px 48px", maxWidth: 700 }}>
                    {tagEls}
                    <h1 style={{ color: "#fff", fontSize: ts - 2, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                    <div style={{ marginTop: 20 }}>{nameTag}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===27: Asymmetric accent shapes
    if (v === 27) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: -50, right: -80, width: 450, height: 300, background: accent, borderRadius: "50%", opacity: 0.6, transform: "rotate(-15deg)" }} />
            <div style={{ position: "absolute", bottom: -30, left: -60, width: 350, height: 250, background: a2, borderRadius: "50%", opacity: 0.4, transform: "rotate(10deg)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <span style={{ color: accent, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 16 }}>{tags[0] || "법률 전문"}</span>
                <h1 style={{ color: tc, fontSize: ts + 4, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", maxWidth: 700 }}>{t}</h1>
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
                    {circleProfile(48)}
                    {nameTag}
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===28: Bottom accent bar + typing style title
    if (v === 28) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 10, background: accent, zIndex: 2 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 80px" }}>
                <div style={{ borderLeft: `5px solid ${accent}`, paddingLeft: 24 }}>
                    <span style={{ color: accent, fontSize: 13, fontWeight: 800, letterSpacing: "0.1em" }}>{tags[0] || of || "법률 칼럼"}</span>
                    <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.35, wordBreak: "keep-all", marginTop: 12, textShadow: TS }}>{t}</h1>
                </div>
                <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(40)}
                    {nameTag}
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===29: Full accent bg + white bold text + circle deco
    if (v === 29) {
        return <div id="blog-main-image" style={{ ...base, background: `linear-gradient(135deg,${accent},${a2})` }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 800, borderRadius: "50%", border: `2px solid ${getContrastColor(accent)}20` }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", border: `1px solid ${getContrastColor(accent)}15` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 80px" }}>
                <h1 style={{ color: getContrastColor(accent), fontSize: ts + 6, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ width: 60, height: 4, background: `${getContrastColor(accent)}40`, borderRadius: 2, margin: "24px auto" }} />
                <span style={{ color: getSubContrastColor(accent), fontSize: 16, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
            </div>{logoEl}
        </div>;
    }
    // v===30: Minimalist white + accent underline on title
    if (v === 30) {
        return <div id="blog-main-image" style={{ ...base, background: "#fff" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: accent }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <span style={{ color: "#999", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 20 }}>{tags[0] || "법률 칼럼"}</span>
                <h1 style={{ color: "#111", fontSize: ts + 4, fontWeight: 900, lineHeight: 1.4, wordBreak: "keep-all" }}>
                    {t.split(" ").map((w, i) => <span key={i} style={i < 2 ? { background: `linear-gradient(180deg,transparent 60%,${accent}30 60%)`, marginRight: "0.2em" } : { marginRight: "0.2em" }}>{w}</span>)}
                </h1>
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(40)}
                    <span style={{ color: "#555", fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>
            {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 50, objectFit: "contain", filter: "brightness(0.2)", opacity: 0.4 }} />}
        </div>;
    }
    // v===31: Photo + diagonal split with accent
    if (v === 31) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg,${accent}DD 0%,${accent}DD 40%,transparent 40%)`, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                {tagEls}
                <h1 style={{ color: getContrastColor(accent), fontSize: ts, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", maxWidth: 500 }}>{t}</h1>
                <div style={{ marginTop: 24 }}><span style={{ color: getSubContrastColor(accent), fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
            </div>{logoEl}
        </div>;
    }
    // v===32: Dark minimal + accent dot accent
    if (v === 32) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 80, right: 80, width: 20, height: 20, borderRadius: "50%", background: accent }} />
            <div style={{ position: "absolute", bottom: 120, left: 100, width: 12, height: 12, borderRadius: "50%", background: `${accent}60` }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <span style={{ color: accent, fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 20 }}>{tags[0] || of || "LAW"}</span>
                <h1 style={{ color: tc, fontSize: ts + 8, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.04em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 2, background: accent }} />
                    <span style={{ color: `${tc}AA`, fontSize: 14, fontWeight: 600 }}>{nm} 변호사</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===33: Photo left half + text right half
    if (v === 33) {
        return <div id="blog-main-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 45%", position: "relative", overflow: "hidden" }}>
                {(pImg || oImg) ? <img src={pImg || oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /> : <div style={{ width: "100%", height: "100%", background: a2 }} />}
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(270deg,${bg},transparent 30%)` }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px" }}>
                <span style={{ color: accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 16 }}>{tags[0] || "법률 전문"}</span>
                <h1 style={{ color: tc, fontSize: ts - 2, fontWeight: 900, lineHeight: 1.35, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ width: 40, height: 3, background: accent, borderRadius: 2, marginTop: 20, marginBottom: 16 }} />
                <span style={{ color: `${tc}AA`, fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
            </div>{logoEl}
        </div>;
    }
    // v===34: Accent top strip + centered column
    if (v === 34) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                {circleProfile(90)}
                <h1 style={{ color: tc, fontSize: ts, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", marginTop: 28 }}>{t}</h1>
                <div style={{ display: "flex", gap: 8, marginTop: 20 }}>{tags.map((tg, i) => <span key={i} style={{ padding: "4px 14px", borderRadius: 20, background: `${accent}30`, color: accent, fontSize: 12, fontWeight: 700 }}>{tg}</span>)}</div>
                <span style={{ color: `${tc}AA`, fontSize: 14, marginTop: 16 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
            </div>{logoEl}
        </div>;
    }
    // v===35: Photo bg + large number watermark
    if (v === 35) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", bottom: -40, right: -20, fontSize: 400, fontWeight: 900, color: `${accent}20`, lineHeight: 1, zIndex: 1 }}>§</div>
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    // v===36: Gradient mesh bg + center text
    if (v === 36) {
        return <div id="blog-main-image" style={{ ...base, background: `radial-gradient(ellipse at 20% 80%,${accent}60,transparent 60%),radial-gradient(ellipse at 80% 20%,${a2}50,transparent 50%),${bg}` }}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 80px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{tags.map((tg, i) => <span key={i} style={{ padding: "4px 14px", borderRadius: 4, background: `${accent}40`, color: tc, fontSize: 12, fontWeight: 700 }}>{tg}</span>)}</div>
                <h1 style={{ color: tc, fontSize: ts + 4, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 28 }}><span style={{ color: `${tc}AA`, fontSize: 15 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
            </div>{logoEl}
        </div>;
    }
    // v===37: Double border frame + centered
    if (v === 37) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", inset: 24, border: `1px solid ${accent}40`, borderRadius: 16 }} />
            <div style={{ position: "absolute", inset: 40, border: `1px solid ${accent}20`, borderRadius: 12 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "80px 100px" }}>
                <span style={{ color: accent, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 24 }}>{tags[0] || "법률 전문"}</span>
                <h1 style={{ color: tc, fontSize: ts + 2, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 28 }}>
                    <div style={{ width: 24, height: 2, background: accent }} />
                    <span style={{ color: `${tc}99`, fontSize: 14 }}>{nm} 변호사</span>
                    <div style={{ width: 24, height: 2, background: accent }} />
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===38: Photo bg + bottom card strip
    if (v === 38) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `${accent}EE`, padding: "32px 70px", zIndex: 2 }}>
                <h1 style={{ color: getContrastColor(accent), fontSize: ts - 6, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: getSubContrastColor(accent), fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                    {tags[0] && <span style={{ padding: "2px 10px", borderRadius: 10, background: `${getContrastColor(accent)}20`, color: getContrastColor(accent), fontSize: 11, fontWeight: 700 }}>{tags[0]}</span>}
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===39: Stacked horizontal bars accent
    if (v === 39) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 180, left: 0, right: 0, height: 4, background: `${accent}30` }} />
            <div style={{ position: "absolute", top: 195, left: 0, right: "40%", height: 4, background: accent }} />
            <div style={{ position: "absolute", bottom: 180, left: 0, right: 0, height: 4, background: `${accent}30` }} />
            <div style={{ position: "absolute", bottom: 165, left: "40%", right: 0, height: 4, background: accent }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                {tagEls}
                <h1 style={{ color: tc, fontSize: ts + 4, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(40)}
                    <span style={{ color: `${tc}AA`, fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===40: Full photo + large accent letter watermark
    if (v === 40) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", top: -60, left: -30, fontSize: 500, fontWeight: 900, color: `${accent}18`, lineHeight: 1, zIndex: 1, fontFamily: "serif" }}>{nm[0]}</div>
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts + 2, fontWeight: 900, lineHeight: 1.2, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    // v===41: Accent gradient top left corner + text center
    if (v === 41) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "50%", background: `linear-gradient(135deg,${accent}80,transparent)` }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "30%", height: "30%", background: `linear-gradient(315deg,${a2}50,transparent)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <h1 style={{ color: tc, fontSize: ts + 4, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                    {tags.map((tg, i) => <span key={i} style={{ padding: "4px 14px", borderRadius: 4, border: `1px solid ${accent}60`, color: accent, fontSize: 12, fontWeight: 700 }}>{tg}</span>)}
                </div>
                <div style={{ marginTop: 20 }}><span style={{ color: `${tc}99`, fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
            </div>{logoEl}
        </div>;
    }
    // v===42: Horizontal 3-column photo strip top
    if (v === 42) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%", display: "flex" }}>
                {[oImg, pImg, oImg].map((img, i) => <div key={i} style={{ flex: 1, overflow: "hidden" }}>{img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} /> : <div style={{ width: "100%", height: "100%", background: `${accent}30` }} />}</div>)}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: `linear-gradient(180deg,transparent,${bg})` }} />
            </div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                {tagEls}
                <h1 style={{ color: tc, fontSize: ts, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20 }}><span style={{ color: `${tc}AA`, fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span></div>
            </div>{logoEl}
        </div>;
    }
    // v===43: Accent sidebar right with text
    if (v === 43) {
        return <div id="blog-main-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 50px 60px 70px" }}>
                {tagEls}
                <h1 style={{ color: tc, fontSize: ts, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(40)}
                    <span style={{ color: `${tc}AA`, fontSize: 14 }}>{nm} 변호사</span>
                </div>
            </div>
            <div style={{ width: 180, background: accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <span style={{ color: getContrastColor(accent), fontSize: 14, fontWeight: 800, writingMode: "vertical-rl", letterSpacing: "0.2em" }}>{of || nm}</span>
            </div>{logoEl}
        </div>;
    }
    // v===44: Photo bg + title in accent box
    if (v === 44) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "60px 70px" }}>
                <div style={{ background: accent, padding: "28px 36px", borderRadius: 12, maxWidth: 700 }}>
                    <h1 style={{ color: getContrastColor(accent), fontSize: ts - 4, fontWeight: 900, lineHeight: 1.35, wordBreak: "keep-all" }}>{t}</h1>
                </div>
                <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                    {circleProfile(44)}
                    <div><span style={{ color: "#fff", fontSize: 15, fontWeight: 700, textShadow: TS }}>{nm} 변호사</span>{of && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, display: "block", textShadow: TS }}>{of}</span>}</div>
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===45: Bold stacked text on accent gradient
    if (v === 45) {
        const words = t.split(" ");
        return <div id="blog-main-image" style={{ ...base, background: `linear-gradient(180deg,${accent},${a2})` }}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                {words.map((w, i) => <h1 key={i} style={{ color: getContrastColor(accent), fontSize: ts + 10, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.04em", opacity: i < 2 ? 1 : 0.6 }}>{w}</h1>)}
                <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 30, height: 2, background: getContrastColor(accent) }} />
                    <span style={{ color: getSubContrastColor(accent), fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===46: Photo bg + rounded corners inner card
    if (v === 46) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", inset: 30, borderRadius: 24, border: `2px solid ${accent}60`, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 80px" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    // v===47: Minimal white + large accent line above title
    if (v === 47) {
        return <div id="blog-main-image" style={{ ...base, background: "#FAFAFA" }}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>
                <div style={{ width: 80, height: 6, background: accent, borderRadius: 3, marginBottom: 24 }} />
                <h1 style={{ color: "#111", fontSize: ts + 2, fontWeight: 900, lineHeight: 1.35, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>{tags.map((tg, i) => <span key={i} style={{ padding: "4px 14px", borderRadius: 4, background: `${accent}15`, color: accent, fontSize: 12, fontWeight: 700 }}>{tg}</span>)}</div>
                <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: "#666", fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>
            {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 50, objectFit: "contain", filter: "brightness(0.2)", opacity: 0.4 }} />}
        </div>;
    }
    // v===48: Photo bg + accent bar across center
    if (v === 48) {
        return <div id="blog-main-image" style={base}>
            {bgPhoto}
            <div style={{ position: "absolute", top: "40%", left: 0, right: 0, height: 140, background: accent, zIndex: 1, opacity: 0.9 }} />
            <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                <h1 style={{ color: getContrastColor(accent), fontSize: ts + 2, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{t}</h1>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 24, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
            </div>{logoEl}
        </div>;
    }
    // v===49: Four quadrant grid bg
    if (v === 49) {
        return <div id="blog-main-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "50%", background: `${accent}15` }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "50%", height: "50%", background: `${accent}15` }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "50%", background: `${a2}10` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "50%", height: "50%", background: `${a2}10` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 80px" }}>
                {circleProfile(80)}
                <h1 style={{ color: tc, fontSize: ts, fontWeight: 900, lineHeight: 1.3, wordBreak: "keep-all", marginTop: 24 }}>{t}</h1>
                <div style={{ display: "flex", gap: 8, marginTop: 20 }}>{tags.map((tg, i) => <span key={i} style={{ padding: "4px 12px", borderRadius: 20, background: accent, color: getContrastColor(accent), fontSize: 12, fontWeight: 700 }}>{tg}</span>)}</div>
                <span style={{ color: `${tc}99`, fontSize: 14, marginTop: 12 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
            </div>{logoEl}
        </div>;
    }

    // v===50 fallback: Simple dark with accent line
    return <div id="blog-main-image" style={{ ...base, background: bg }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 2, height: 100, background: accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 80px" }}>
            <span style={{ color: accent, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 24 }}>{tags[0] || "법률 칼럼"}</span>
            <h1 style={{ color: tc, fontSize: ts + 4, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{t}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 28 }}>
                {circleProfile(40)}
                <span style={{ color: `${tc}AA`, fontSize: 14 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
            </div>
        </div>{logoEl}
    </div>;
}
