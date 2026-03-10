"use client";
import { S, FONT, TS, ML_ALL } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";

interface P { config: GenerationConfig; profile: BlogProfile; }

export default function MainImage({ config, profile }: P) {
    const v = config.mainVariant % ML_ALL.length;
    const accent = profile.brandColor || config.accentColor;
    const oImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
    const pImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const op = config.overlayOpacity;
    const t = config.postTitle;
    const tags = profile.specialty || [];
    const nm = profile.lawyerName;
    const of = profile.officeName;
    const logo = profile.logoImage;
    const ts = Math.round(42 * ML_ALL[v].titleScale);

    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: "#0C0C0C" };
    const abs0: React.CSSProperties = { position: "absolute", inset: 0 };
    const grad = (d: string, o1: number, o2: number) => `linear-gradient(${d},rgba(0,0,0,${o1}),rgba(0,0,0,${o2}))`;
    const nameTag = <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, textShadow: TS }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>;
    const logoEl = logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 30, objectFit: "contain", opacity: 0.7 }} />;
    const tagEls = tags.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 14px", borderRadius: 4, background: `${accent}22`, color: accent, fontSize: 13, fontWeight: 600 }}>{t}</span>)}</div>;

    if (v === 0) { // Full photo bg + bottom text
        return <div id="blog-main-image" style={base}>
            {oImg && <div style={{ ...abs0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ ...abs0, background: grad("180deg", 0.1, 0.85) }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", textShadow: TS, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 1) { // Dark centered huge text
        return <div id="blog-main-image" style={base}>
            <div style={{ ...abs0, background: accent, height: 5 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.04em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 24, padding: "6px 20px", borderRadius: 6, background: `${accent}18`, color: accent, fontSize: 14, fontWeight: 600 }}>{nm} 변호사</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 2) { // Split text left / photo right
        return <div id="blog-main-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 55%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 50px 60px 70px", background: "#0C0C0C" }}>
                <div style={{ width: 4, height: 36, background: accent, borderRadius: 2, marginBottom: 20 }} />
                <span style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>{tags[0] || "법률 전문"}</span>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 24 }}>{nameTag}</div>
            </div>
            <div style={{ flex: "0 0 45%", position: "relative" }}>
                {(pImg || oImg) ? <img src={pImg || oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: "#161616" }} />}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#0C0C0C 0%,transparent 25%)" }} />
            </div>{logoEl}
        </div>;
    }
    if (v === 3) { // Photo bg + white text box overlay
        return <div id="blog-main-image" style={base}>
            {(oImg || pImg) && <div style={{ ...abs0, backgroundImage: `url(${oImg || pImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ ...abs0, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
                <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 20, padding: "50px 60px", maxWidth: 750, textAlign: "center", color: "#111" }}>
                    {tagEls && <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>{tags.map((t, i) => <span key={i} style={{ padding: "4px 12px", borderRadius: 4, background: `${accent}15`, color: accent, fontSize: 12, fontWeight: 600 }}>{t}</span>)}</div>}
                    <h1 style={{ fontSize: ts - 4, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{t}</h1>
                    <p style={{ color: "#666", fontSize: 14, marginTop: 16 }}>{nm} 변호사{of ? ` · ${of}` : ""}</p>
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 4) { // Dark + decorative circles
        return <div id="blog-main-image" style={base}>
            <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", border: `2px solid ${accent}15` }} />
            <div style={{ position: "absolute", bottom: -60, left: -60, width: 250, height: 250, borderRadius: "50%", background: `${accent}08` }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: 5, height: "100%", background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px 60px 90px" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 800 }}>{t}</h1>
                <div style={{ marginTop: 28 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 5) { // Dark + diagonal accent stripe
        return <div id="blog-main-image" style={base}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: `linear-gradient(135deg,${accent}10 0%,transparent 50%,${accent}05 100%)` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px 80px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 16px", borderRadius: 20, border: `1px solid ${accent}40`, color: accent, fontSize: 12, fontWeight: 600 }}>{t}</span>)}</div>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 6) { // Top photo strip + bottom text
        return <div id="blog-main-image" style={base}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", overflow: "hidden" }}>
                {(oImg || pImg) ? <img src={oImg || pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: "#161616" }} />}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,transparent,#0C0C0C)" }} />
            </div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                <div style={{ width: 4, height: 30, background: accent, borderRadius: 2, marginBottom: 16 }} />
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 7) { // Full dark + accent stripe horizontal
        return <div id="blog-main-image" style={{ ...base, background: `linear-gradient(180deg,#0C0C0C 0%,#111 50%,#0C0C0C 100%)` }}>
            <div style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 120, background: `${accent}08` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                <span style={{ color: accent, fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 20 }}>{tags.join(" · ") || "법률 전문"}</span>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.04em", wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ width: 40, height: 3, background: accent, borderRadius: 2, margin: "24px auto 16px" }} />
                {nameTag}
            </div>{logoEl}
        </div>;
    }
    if (v === 8) { // Photo bg + bottom gradient + pill tags
        return <div id="blog-main-image" style={base}>
            {oImg && <div style={{ ...abs0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ ...abs0, background: grad("180deg", 0.2, op + 0.15) }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 70px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>{tags.map((t, i) => <span key={i} style={{ padding: "5px 16px", borderRadius: 20, background: accent, color: "#fff", fontSize: 12, fontWeight: 700 }}>{t}</span>)}</div>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, textShadow: TS, wordBreak: "keep-all" }}>{t}</h1>
                <div style={{ marginTop: 20 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 9) { // Grid pattern + left aligned
        return <div id="blog-main-image" style={base}>
            <div style={{ ...abs0, backgroundImage: `radial-gradient(circle,${accent}08 1px,transparent 1px)`, backgroundSize: "30px 30px" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                {tagEls}
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.03em", wordBreak: "keep-all", maxWidth: 800 }}>{t}</h1>
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 4, height: 24, background: accent, borderRadius: 2 }} />
                    {nameTag}
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 10) { // Center poster
        const topTxt = tags[0] || (of ? `${of} 칼럼` : "법률 칼럼");
        return <div id="blog-main-image" style={base}>
            {(oImg || pImg) && <div style={{ ...abs0, backgroundImage: `url(${oImg || pImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ ...abs0, background: grad("180deg", 0.1, 0.95) }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.9)", fontSize: Math.round(ts * 0.45), fontWeight: 700, marginBottom: 20, textShadow: TS }}>{topTxt}</p>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.2, wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: Math.round(ts * 0.5), fontWeight: 800, marginTop: 30, textShadow: TS }}>{nm} 변호사</p>
            </div>{logoEl}
        </div>;
    }
    if (v === 11) { // Newspaper
        const topTxt = nm || "LAW NEWS";
        return <div id="blog-main-image" style={{ ...base, background: "#F4F4F4", border: "10px solid #F4F4F4" }}>
            <div style={{ height: "100%", border: "1px solid #222", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "16px 0", borderBottom: "1px solid #222", textAlign: "center" }}>
                    <span style={{ color: "#111", fontSize: 28, fontWeight: 900, fontFamily: "serif", fontStyle: "italic" }}>{topTxt}</span>
                </div>
                <div style={{ flex: 1, position: "relative", padding: "20px 20px 0 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: "100%", height: "80%", background: "#ccc", position: "relative", border: "1px solid #222" }}>
                        {(pImg || oImg) && <img src={pImg || oImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(30%)" }} />}
                    </div>
                    <div style={{ position: "absolute", bottom: 50, width: "88%", background: "rgba(255,255,255,0.95)", border: "2px solid #111", padding: "34px 40px" }}>
                        <h1 style={{ color: "#111", fontSize: Math.round(ts * 0.8), fontWeight: 800, lineHeight: 1.4, wordBreak: "keep-all", textAlign: "center" }}>
                            {t.split(" ").map((word, i) => (
                                i === 0 || i === 1 ? <span key={i} style={{ background: `linear-gradient(180deg,transparent 55%,${accent}40 55%)`, marginRight: "0.25em" }}>{word}</span> : <span key={i}>{word} </span>
                            ))}
                        </h1>
                    </div>
                </div>
            </div>{logoEl && <div style={{ position: "absolute", bottom: 36, right: 40, filter: "invert(1)" }}><img src={logo} alt="" style={{ height: 30, opacity: 0.8 }} /></div>}
        </div>;
    }
    if (v === 12) { // Strikethrough marker
        return <div id="blog-main-image" style={base}>
            {(oImg || pImg) && <div style={{ ...abs0, backgroundImage: `url(${oImg || pImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ ...abs0, background: "rgba(0,0,0,0.55)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 70px" }}>
                <div style={{ background: accent, color: "#fff", padding: "6px 14px", borderRadius: 4, alignSelf: "flex-start", fontSize: 13, fontWeight: 700, marginBottom: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
                    {tags[0] || of || "법률정보"}
                </div>
                <h1 style={{ color: "#fff", fontSize: ts, fontWeight: 900, lineHeight: 1.45, wordBreak: "keep-all", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                    {t.split(" ").map((word, i) => (
                        i < 2 ? <span key={i} style={{ background: `linear-gradient(transparent 50%, ${accent} 50%, ${accent} 75%, transparent 75%)`, marginRight: "0.25em" }}>{word}</span> : <span key={i}>{word} </span>
                    ))}
                </h1>
                <div style={{ marginTop: 40 }}>{nameTag}</div>
            </div>{logoEl}
        </div>;
    }
    // v===13: Cafe / bottom text typography
    return <div id="blog-main-image" style={base}>
        {(pImg || oImg) && <div style={{ ...abs0, backgroundImage: `url(${pImg || oImg})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.9)" }} />}
        <div style={{ ...abs0, background: grad("0deg", 0.95, 0.1) }} />
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "60px 70px 50px", textAlign: "center" }}>
            <h1 style={{ color: "#FCFBEA", fontSize: ts, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", wordBreak: "keep-all", textShadow: TS }}>{t}</h1>
            <p style={{ color: "rgba(252,251,234,0.7)", fontSize: Math.round(ts * 0.4), fontWeight: 600, marginTop: 18, textShadow: TS }}>{tags.join(" · ") || nm + " 변호사"}</p>
            {of && <p style={{ color: accent, fontSize: 18, fontWeight: 900, marginTop: 44, letterSpacing: "0.15em", textShadow: TS }}>{of.toUpperCase()}</p>}
        </div>{logoEl}
    </div>;
}
