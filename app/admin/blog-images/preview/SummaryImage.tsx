"use client";
import { S, FONT, TS, SL_ALL } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";
interface P { config: GenerationConfig; profile: BlogProfile; }

export default function SummaryImage({ config, profile }: P) {
    const v = config.summaryVariant % SL_ALL.length;
    const accent = profile.brandColor || config.accentColor;
    const pImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const lines = config.postSummary.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 3);
    const nm = profile.lawyerName;
    const of = profile.officeName;
    const title = config.postTitle;
    const logo = profile.logoImage;
    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: "#0C0C0C" };
    const logoEl = logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 60, objectFit: "contain", opacity: 0.7 }} />;
    const nameEl = <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>;

    if (v === 0) { // Numbered vertical list
        return <div id="blog-summary-image" style={base}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <span style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>핵심 포인트</span>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                    <span style={{ color: accent, fontSize: 42, fontWeight: 900, lineHeight: 1, minWidth: 50 }}>0{i + 1}</span>
                    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 17, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 8 }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 24 }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    if (v === 1) { // Card grid
        return <div id="blog-summary-image" style={base}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 10, wordBreak: "keep-all" }}>{title}</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 30 }}>{nameEl}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ padding: "28px 28px", borderRadius: 16, background: "#161616", border: "1px solid #222" }}>
                    <span style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>포인트 0{i + 1}</span>
                    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 1.7, marginTop: 12, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
        </div>{logoEl}</div>;
    }
    if (v === 2) { // Profile left + list right
        return <div id="blog-summary-image" style={{ ...base, display: "flex" }}><div style={{ flex: "0 0 320px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, background: "#111" }}>
            {pImg ? <img src={pImg} alt="" style={{ width: 200, height: 240, objectFit: "cover", borderRadius: 14, border: `2px solid ${accent}30` }} /> : <div style={{ width: 200, height: 240, borderRadius: 14, background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, color: "#333" }}>⚖</div>}
            <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 16 }}>{nm} 변호사</p>
            {of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>{of}</p>}
        </div><div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px" }}>
                <span style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>핵심 포인트</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <span style={{ color: accent, fontSize: 32, fontWeight: 900, lineHeight: 1, minWidth: 40 }}>0{i + 1}</span>
                        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{l}</p>
                    </div>)}
                </div>
            </div>{logoEl}</div>;
    }
    if (v === 3) { // Light card
        return <div id="blog-summary-image" style={base}><div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 50 }}>
            <div style={{ width: "100%", maxWidth: 820, background: "#FAFAFA", borderRadius: 20, padding: "50px 56px", color: "#111" }}>
                <span style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>핵심 포인트</span>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 8, marginBottom: 30, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 30, height: 30, borderRadius: 8, background: `${accent}15`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{i + 1}</div>
                        <p style={{ fontSize: 16, lineHeight: 1.7, color: "#333", wordBreak: "keep-all" }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 12 }}>
                    {pImg && <img src={pImg} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />}
                    <div><p style={{ fontSize: 14, fontWeight: 700 }}>{nm} 변호사</p>{of && <p style={{ fontSize: 11, color: "#999" }}>{of}</p>}</div>
                </div>
            </div>
        </div>{logoEl}</div>;
    }
    if (v === 4) { // Timeline
        return <div id="blog-summary-image" style={base}>
            <div style={{ position: "absolute", left: 62, top: 140, bottom: 100, width: 2, background: `${accent}20` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <span style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>핵심 포인트</span>
                <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingLeft: 24 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: accent, marginTop: 6, marginLeft: -30, position: "relative", zIndex: 2 }} />
                        <div><span style={{ color: accent, fontSize: 14, fontWeight: 700 }}>0{i + 1}</span>
                            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 17, lineHeight: 1.7, marginTop: 4, wordBreak: "keep-all" }}>{l}</p></div>
                    </div>)}
                </div>
                <div style={{ marginTop: "auto" }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 5) { // 3 Columns
        return <div id="blog-summary-image" style={base}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <span style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>핵심 포인트</span>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", gap: 20, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ flex: 1, padding: "30px 28px", borderRadius: 16, background: "#161616", border: "1px solid #222" }}>
                    <span style={{ color: accent, fontSize: 40, fontWeight: 900, lineHeight: 1 }}>0{i + 1}</span>
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 1.7, marginTop: 16, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 24 }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    if (v === 6) { // Photo bg + overlay cards
        const oImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
        return <div id="blog-summary-image" style={base}>
            {oImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", opacity: 0.15 }} />}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 30, textShadow: TS, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ padding: "24px 28px", borderRadius: 14, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <span style={{ color: accent, fontSize: 28, fontWeight: 900 }}>0{i + 1}</span>
                            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{l}</p>
                        </div>
                    </div>)}
                </div>
                <div style={{ marginTop: 20 }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 7) { // Horizontal bars
        return <div id="blog-summary-image" style={base}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", alignItems: "stretch", gap: 0, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ width: 60, background: accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 900 }}>0{i + 1}</div>
                    <div style={{ flex: 1, padding: "20px 24px", background: "#161616" }}><p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p></div>
                </div>)}
            </div>
            <div style={{ marginTop: 24 }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    if (v === 8) { // Big number emphasis
        return <div id="blog-summary-image" style={base}><div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
            <span style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>핵심 포인트</span>
            <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", maxWidth: 700 }}>
                {lines.map((l, i) => <div key={i} style={{ textAlign: "left", display: "flex", gap: 20, alignItems: "flex-start" }}>
                    <span style={{ color: `${accent}30`, fontSize: 72, fontWeight: 900, lineHeight: 0.8, minWidth: 70 }}>{i + 1}</span>
                    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 17, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 8 }}>{l}</p>
                </div>)}
            </div>
        </div>{logoEl}</div>;
    }
    // v===9: Minimal light
    return <div id="blog-summary-image" style={{ ...base, background: "#FAFAFA" }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
        <span style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>핵심 포인트</span>
        <h2 style={{ color: "#111", fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
            {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, marginTop: 8, flexShrink: 0 }} />
                <p style={{ color: "#333", fontSize: 16, lineHeight: 1.8, wordBreak: "keep-all" }}>{l}</p>
            </div>)}
        </div>
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
            {pImg && <img src={pImg} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />}
            <div><p style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{nm} 변호사</p>{of && <p style={{ fontSize: 11, color: "#999" }}>{of}</p>}</div>
        </div>
    </div>{logoEl}</div>;
}
