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
    // v===9: Grid pattern + left aligned
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
