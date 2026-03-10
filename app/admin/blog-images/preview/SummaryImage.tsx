"use client";
import { S, FONT, TS, SL_ALL } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";
interface P { config: GenerationConfig; profile: BlogProfile; }

export default function SummaryImage({ config, profile }: P) {
    const v = config.summaryVariant % SL_ALL.length;
    const a1 = profile.brandColor || config.accentColor;
    const a2 = config.secondaryAccent || a1;
    const pImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const lines = config.postSummary.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 3);
    const nm = profile.lawyerName;
    const of = profile.officeName;
    const title = config.postTitle;
    const logo = profile.logoImage;
    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT };
    const logoEl = logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 60, objectFit: "contain", opacity: 0.7 }} />;
    const nameEl = <span style={{ fontSize: 14, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>;

    if (v === 0) { // Warm bg + accent number badges
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(160deg,${a1} 0%,${a2} 100%)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <span style={{ color: "rgba(0,0,0,0.6)", fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 10 }}>핵심 포인트</span>
            <h2 style={{ color: "#111", fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 46, height: 46, borderRadius: 12, background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#111", fontSize: 18, fontWeight: 900 }}>0{i + 1}</div>
                    <p style={{ color: "#111", fontSize: 17, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 8, fontWeight: 600 }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: "rgba(0,0,0,0.6)" }}>{nameEl}</div>
        </div><div style={{ filter: "brightness(0.1)" }}>{logoEl}</div></div>;
    }
    if (v === 1) { // Accent cards on dark
        return <div id="blog-summary-image" style={{ ...base, background: "#111" }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 10, wordBreak: "keep-all" }}>{title}</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 30 }}>{nameEl}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ padding: "28px 28px", borderRadius: 16, background: i === 0 ? a1 : i === 1 ? a2 : `${a1}80`, color: "#fff" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7 }}>포인트 0{i + 1}</span>
                    <p style={{ fontSize: 16, lineHeight: 1.7, marginTop: 12, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
        </div>{logoEl}</div>;
    }
    if (v === 2) { // Accent left panel + right content
        return <div id="blog-summary-image" style={{ ...base, display: "flex", background: "#111" }}><div style={{ flex: "0 0 320px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, background: a1 }}>
            {pImg ? <img src={pImg} alt="" style={{ width: 200, height: 240, objectFit: "cover", borderRadius: 14, border: "3px solid rgba(255,255,255,0.3)" }} /> : <div style={{ width: 200, height: 240, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>⚖</div>}
            <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 16, textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>{nm} 변호사</p>
            {of && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 }}>{of}</p>}
        </div><div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px" }}>
                <span style={{ color: a1, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>핵심 포인트</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <span style={{ color: a1, fontSize: 32, fontWeight: 900, lineHeight: 1, minWidth: 40 }}>0{i + 1}</span>
                        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{l}</p>
                    </div>)}
                </div>
            </div>{logoEl}</div>;
    }
    if (v === 3) { // White card on colored bg
        return <div id="blog-summary-image" style={{ ...base, background: a1 }}><div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 50 }}>
            <div style={{ width: "100%", maxWidth: 820, background: "#fff", borderRadius: 20, padding: "50px 56px", color: "#111", boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
                <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>핵심 포인트</span>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 8, marginBottom: 30, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 32, height: 32, borderRadius: 8, background: a1, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{i + 1}</div>
                        <p style={{ fontSize: 16, lineHeight: 1.7, color: "#333", wordBreak: "keep-all" }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 12 }}>
                    {pImg && <img src={pImg} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />}
                    <div><p style={{ fontSize: 14, fontWeight: 700 }}>{nm} 변호사</p>{of && <p style={{ fontSize: 11, color: "#999" }}>{of}</p>}</div>
                </div>
            </div>
        </div><div style={{ filter: "brightness(0.1)" }}>{logoEl}</div></div>;
    }
    if (v === 4) { // Timeline on warm gradient
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(180deg,${a1} 0%,${a2} 100%)` }}>
            <div style={{ position: "absolute", left: 62, top: 140, bottom: 100, width: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8, opacity: 0.8 }}>핵심 포인트</span>
                <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all", textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingLeft: 24 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", marginTop: 4, marginLeft: -33, position: "relative", zIndex: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }} />
                        <div><span style={{ color: "#fff", fontSize: 15, fontWeight: 700, opacity: 0.8 }}>0{i + 1}</span>
                            <p style={{ color: "#fff", fontSize: 17, lineHeight: 1.7, marginTop: 4, wordBreak: "keep-all", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>{l}</p></div>
                    </div>)}
                </div>
                <div style={{ marginTop: "auto", color: "rgba(255,255,255,0.7)" }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 5) { // 3 Columns with accent colored headers
        return <div id="blog-summary-image" style={{ ...base, background: "#111" }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>핵심 포인트</span>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", gap: 20, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "18px 24px", background: i === 0 ? a1 : i === 1 ? a2 : `${a1}AA`, color: "#fff" }}>
                        <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>0{i + 1}</span>
                    </div>
                    <div style={{ padding: "24px 24px", background: "rgba(255,255,255,0.06)", height: "100%" }}>
                        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: "rgba(255,255,255,0.5)" }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    if (v === 6) { // Accent border left cards on photo bg
        const oImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
        return <div id="blog-summary-image" style={{ ...base, background: "#111" }}>
            {oImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", opacity: 0.15 }} />}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,${a1}40 0%,rgba(0,0,0,0.8) 100%)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 30, textShadow: TS, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ padding: "24px 28px", borderRadius: 14, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", borderLeft: `5px solid ${a1}` }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <span style={{ color: a1, fontSize: 28, fontWeight: 900 }}>0{i + 1}</span>
                            <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{l}</p>
                        </div>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, color: "rgba(255,255,255,0.5)" }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 7) { // Horizontal accent bars
        return <div id="blog-summary-image" style={{ ...base, background: "#111" }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", alignItems: "stretch", gap: 0, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ width: 65, background: i === 0 ? a1 : i === 1 ? a2 : `${a1}CC`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 900 }}>0{i + 1}</div>
                    <div style={{ flex: 1, padding: "20px 24px", background: "rgba(255,255,255,0.06)" }}><p style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p></div>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: "rgba(255,255,255,0.5)" }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    if (v === 8) { // Big accent numbers
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(135deg,#111 0%,${a1}50 100%)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
            <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>핵심 포인트</span>
            <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", maxWidth: 700 }}>
                {lines.map((l, i) => <div key={i} style={{ textAlign: "left", display: "flex", gap: 20, alignItems: "flex-start" }}>
                    <span style={{ color: a1, fontSize: 72, fontWeight: 900, lineHeight: 0.8, minWidth: 70 }}>{i + 1}</span>
                    <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 17, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 8 }}>{l}</p>
                </div>)}
            </div>
        </div>{logoEl}</div>;
    }

    if (v === 10) { // Horizontal Process Timeline (Ref 4)
        return <div id="blog-summary-image" style={{ ...base, background: "#0F1115", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, padding: "70px 60px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>{of || "핵심 매뉴얼"}</span>
                <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 50, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", flex: 1, marginTop: 10 }}>
                    <div style={{ position: "absolute", top: 12, left: 20, right: 20, height: 2, background: "rgba(255,255,255,0.15)" }} />
                    <div style={{ position: "absolute", top: 12, left: 20, width: "40%", height: 2, background: a1 }} />
                    {lines.map((l, i) => (
                        <div key={i} style={{ position: "relative", width: "30%", zIndex: 1 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: i === 0 ? a1 : "#222", border: `4px solid ${i === 0 ? "#0F1115" : "rgba(255,255,255,0.15)"}`, margin: "0 auto", boxShadow: i === 0 ? `0 0 0 2px ${a1}` : "none" }} />
                            <div style={{ marginTop: 24, textAlign: "center" }}>
                                <span style={{ color: i === 0 ? a1 : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 800, letterSpacing: "0.05em" }}>STEP 0{i + 1}</span>
                                <p style={{ color: i === 0 ? "#fff" : "rgba(255,255,255,0.6)", fontSize: 15, lineHeight: 1.6, wordBreak: "keep-all", marginTop: 8 }}>{l}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ padding: "0 60px 40px", color: "rgba(255,255,255,0.4)" }}>{nameEl}</div>
            {logoEl}
        </div>;
    }

    if (v === 11) { // Giant Colored Numbers Cards (Ref 2)
        return <div id="blog-summary-image" style={{ ...base, background: "#111" }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <div style={{ alignSelf: "center", background: a1, color: "#fff", padding: "6px 20px", borderRadius: 20, fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 30 }}>PROJECT GOAL</div>
            <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 40, textAlign: "center", wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", gap: 24, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "30px 24px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: i === 0 ? a1 : i === 1 ? a2 : `${a1}AA`, fontSize: 48, fontWeight: 900, lineHeight: 1, display: "block", marginBottom: 16 }}>0{i + 1}</span>
                    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }

    // v===9: Light warm background
    return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(150deg,${a1}40,${a2}60,#F5F0EB)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 6, height: 24, background: a1, borderRadius: 3 }} />
            <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>핵심 포인트</span>
        </div>
        <h2 style={{ color: "#222", fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
            {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.6)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: a1, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                <p style={{ color: "#333", fontSize: 16, lineHeight: 1.8, wordBreak: "keep-all" }}>{l}</p>
            </div>)}
        </div>
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
            {pImg && <img src={pImg} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid ${a1}` }} />}
            <div><p style={{ fontSize: 13, fontWeight: 700, color: "#222" }}>{nm} 변호사</p>{of && <p style={{ fontSize: 11, color: "#888" }}>{of}</p>}</div>
        </div>
    </div>{logoEl}</div>;
}
