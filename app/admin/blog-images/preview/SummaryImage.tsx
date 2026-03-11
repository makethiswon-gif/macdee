"use client";
import { S, FONT, TS, SL_ALL, getContrastColor, getSubContrastColor, isLightColor } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";
interface P { config: GenerationConfig; profile: BlogProfile; }

export default function SummaryImage({ config, profile }: P) {
    const v = config.summaryVariant % SL_ALL.length;
    const a1 = profile.brandColor || config.accentColor;
    const a2 = config.secondaryAccent || a1;
    const pImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const lines = config.postSummary.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 5);
    const nm = profile.lawyerName;
    const of = profile.officeName;
    const title = config.postTitle;
    const logo = profile.logoImage;
    const bg = config.backgroundColor || "#111";
    const tc = config.textColor || "#fff";
    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: bg };
    const isDark = !isLightColor(bg);
    const logoEl = logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 60, objectFit: "contain", opacity: 0.7, filter: isDark ? "none" : "brightness(0.2)" }} />;
    const nameEl = <span style={{ fontSize: 14, fontWeight: 600 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>;

    if (v === 0) { // Warm bg + accent number badges
        const tc = getContrastColor(a1); const sc = getSubContrastColor(a1);
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(160deg,${a1} 0%,${a2} 100%)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <span style={{ color: sc, fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 10 }}>핵심 포인트</span>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 46, height: 46, borderRadius: 12, background: `${tc}15`, display: "flex", alignItems: "center", justifyContent: "center", color: tc, fontSize: 18, fontWeight: 900 }}>0{i + 1}</div>
                    <p style={{ color: tc, fontSize: 17, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 8, fontWeight: 600 }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: sc }}>{nameEl}</div>
        </div><div style={{ filter: isLightColor(a1) ? "brightness(0.1)" : "brightness(1)" }}>{logoEl}</div></div>;
    }
    if (v === 1) { // Accent cards on accent gradient
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(160deg, ${a1}40, ${a2}30, ${bg})` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 10, wordBreak: "keep-all" }}>{title}</h2>
            <p style={{ color: `${tc}BB`, marginBottom: 30 }}>{nameEl}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ padding: "28px 28px", borderRadius: 16, background: i === 0 ? a1 : i === 1 ? a2 : `${a1}80`, color: "#fff" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7 }}>포인트 0{i + 1}</span>
                    <p style={{ fontSize: 16, lineHeight: 1.7, marginTop: 12, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
        </div>{logoEl}</div>;
    }
    if (v === 2) { // Accent left panel + right content
        return <div id="blog-summary-image" style={{ ...base, display: "flex", background: bg }}><div style={{ flex: "0 0 320px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, background: a1 }}>
            {pImg ? <img src={pImg} alt="" style={{ width: 200, height: 240, objectFit: "cover", borderRadius: 14, border: "3px solid rgba(255,255,255,0.3)" }} /> : <div style={{ width: 200, height: 240, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 800 }}>{nm[0]}</div>}
            <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 16, textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>{nm} 변호사</p>
            {of && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 }}>{of}</p>}
        </div><div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px" }}>
                <span style={{ color: a1, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>핵심 포인트</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <span style={{ color: a1, fontSize: 32, fontWeight: 900, lineHeight: 1, minWidth: 40 }}>0{i + 1}</span>
                        <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{l}</p>
                    </div>)}
                </div>
            </div>{logoEl}</div>;
    }
    if (v === 3) { // White card on colored bg
        return <div id="blog-summary-image" style={{ ...base, background: a1 }}><div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 50 }}>
            <div style={{ width: "100%", maxWidth: 820, background: "rgba(255,255,255,0.95)", borderRadius: 20, padding: "50px 56px", color: "#111", boxShadow: "0 10px 40px rgba(0,0,0,0.15)" }}>
                <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>핵심 포인트</span>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 8, marginBottom: 30, wordBreak: "keep-all", color: "#111" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 32, height: 32, borderRadius: 8, background: a1, color: getContrastColor(a1), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{i + 1}</div>
                        <p style={{ fontSize: 16, lineHeight: 1.7, color: "#333", wordBreak: "keep-all" }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 12 }}>
                    {pImg && <img src={pImg} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />}
                    <div><p style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{nm} 변호사</p>{of && <p style={{ fontSize: 11, color: "#999" }}>{of}</p>}</div>
                </div>
            </div>
        </div><div style={{ filter: isLightColor(a1) ? "brightness(0.1)" : "brightness(1)" }}>{logoEl}</div></div>;
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
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(180deg, ${a1}35 0%, ${bg} 100%)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>핵심 포인트</span>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", gap: 20, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "18px 24px", background: i === 0 ? a1 : i === 1 ? a2 : `${a1}AA`, color: getContrastColor(a1) }}>
                        <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>0{i + 1}</span>
                    </div>
                    <div style={{ padding: "24px 24px", background: `${tc}06`, height: "100%" }}>
                        <p style={{ color: `${tc}DD`, fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: `${tc}BB` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    if (v === 6) { // Accent border left cards on photo bg
        const oImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
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
                <div style={{ marginTop: 20, color: "rgba(255,255,255,0.75)" }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    if (v === 7) { // Horizontal accent bars
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(135deg, ${a1}30 0%, ${bg} 60%, ${a2}25 100%)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", alignItems: "stretch", gap: 0, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ width: 65, background: i === 0 ? a1 : i === 1 ? a2 : `${a1}CC`, display: "flex", alignItems: "center", justifyContent: "center", color: getContrastColor(a1), fontSize: 22, fontWeight: 900 }}>0{i + 1}</div>
                    <div style={{ flex: 1, padding: "20px 24px", background: `${tc}06` }}><p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p></div>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: `${tc}BB` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    if (v === 8) { // Big accent numbers
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(135deg,${bg} 0%,${a1}50 100%)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
            <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>핵심 포인트</span>
            <h2 style={{ color: tc, fontSize: 24, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", maxWidth: 700 }}>
                {lines.map((l, i) => <div key={i} style={{ textAlign: "left", display: "flex", gap: 20, alignItems: "flex-start" }}>
                    <span style={{ color: a1, fontSize: 72, fontWeight: 900, lineHeight: 0.8, minWidth: 70 }}>{i + 1}</span>
                    <p style={{ color: `${tc}DD`, fontSize: 17, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 8 }}>{l}</p>
                </div>)}
            </div>
        </div>{logoEl}</div>;
    }

    if (v === 10) { // Horizontal Process Timeline
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(180deg, ${bg} 0%, ${a1}30 50%, ${bg} 100%)`, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, padding: "70px 60px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>{of || "핵심 매뉴얼"}</span>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 50, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", flex: 1, marginTop: 10 }}>
                    <div style={{ position: "absolute", top: 12, left: 20, right: 20, height: 2, background: `${tc}15` }} />
                    <div style={{ position: "absolute", top: 12, left: 20, width: "40%", height: 2, background: a1 }} />
                    {lines.map((l, i) => (
                        <div key={i} style={{ position: "relative", width: "30%", zIndex: 1 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: i === 0 ? a1 : `${bg}DD`, border: `4px solid ${i === 0 ? bg : `${tc}15`}`, margin: "0 auto", boxShadow: i === 0 ? `0 0 0 2px ${a1}` : "none" }} />
                            <div style={{ marginTop: 24, textAlign: "center" }}>
                                <span style={{ color: i === 0 ? a1 : `${tc}AA`, fontSize: 13, fontWeight: 800, letterSpacing: "0.05em" }}>STEP 0{i + 1}</span>
                                <p style={{ color: i === 0 ? tc : `${tc}99`, fontSize: 15, lineHeight: 1.6, wordBreak: "keep-all", marginTop: 8 }}>{l}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ padding: "0 60px 40px", color: `${tc}BB` }}>{nameEl}</div>
            {logoEl}
        </div>;
    }

    if (v === 11) { // Giant Colored Numbers Cards
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(160deg, ${bg} 0%, ${a1}25 100%)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <div style={{ alignSelf: "center", background: a1, color: getContrastColor(a1), padding: "6px 20px", borderRadius: 20, fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 30 }}>핵심 요약</div>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, textAlign: "center", wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", gap: 24, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ flex: 1, background: `${tc}04`, borderRadius: 16, padding: "30px 24px", border: `1px solid ${tc}08` }}>
                    <span style={{ color: i === 0 ? a1 : i === 1 ? a2 : `${a1}AA`, fontSize: 48, fontWeight: 900, lineHeight: 1, display: "block", marginBottom: 16 }}>0{i + 1}</span>
                    <p style={{ color: `${tc}CC`, fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: `${tc}BB`, textAlign: "center" }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }

    // v===9: Light warm background
    if (v === 9) {
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(150deg,${a1},${a2},#F5F0EB)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 6, height: 24, background: tc, borderRadius: 3 }} />
                <span style={{ color: tc, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>핵심 포인트</span>
            </div>
            <h2 style={{ color: "#111", fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.75)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: tc, color: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                    <p style={{ color: "#111", fontSize: 16, lineHeight: 1.8, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                {pImg && <img src={pImg} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #111" }} />}
                <div><p style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{nm} 변호사</p>{of && <p style={{ fontSize: 11, color: "#555" }}>{of}</p>}</div>
            </div>
        </div>{logoEl}</div>;
    }

    // v===12: Accent sidebar + content area
    if (v === 12) {
        return <div id="blog-summary-image" style={{ ...base, display: "flex" }}>
            <div style={{ width: 80, background: a1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {lines.map((_, i) => <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800 }}>{i + 1}</div>)}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 60px" }}>
                <h2 style={{ color: tc, fontSize: 24, fontWeight: 800, marginBottom: 32, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {lines.map((l, i) => <div key={i} style={{ paddingLeft: 16, borderLeft: `3px solid ${i === 0 ? a1 : `${a1}60`}` }}>
                        <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 24, color: `${tc}AA` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===13: Floating cards on gradient
    if (v === 13) {
        return <div id="blog-summary-image" style={{ ...base, background: `radial-gradient(ellipse at 30% 70%,${a1}40,transparent 60%),radial-gradient(ellipse at 70% 30%,${a2}30,transparent 50%),${bg}` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ padding: "20px 24px", borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <span style={{ color: a1, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>0{i + 1}</span>
                        <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 2 }}>{l}</p>
                    </div>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: `${tc}AA` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===14: Centered list with accent dot markers
    if (v === 14) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
            <span style={{ color: a1, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 20 }}>핵심 포인트</span>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 700 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", textAlign: "left" }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: a1, marginTop: 6, flexShrink: 0 }} />
                    <p style={{ color: `${tc}DD`, fontSize: 17, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 28, color: `${tc}88` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===15: Accent frame with corner squares
    if (v === 15) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 20, left: 20, width: 30, height: 30, background: a1 }} />
            <div style={{ position: "absolute", bottom: 20, right: 20, width: 30, height: 30, background: a1 }} />
            <div style={{ position: "absolute", inset: 30, border: `1px solid ${a1}30` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "70px 80px" }}>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 36, height: 36, borderRadius: 8, background: `${a1}${i === 0 ? '' : '60'}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800 }}>{i + 1}</div>
                        <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===16: White card grid on dark bg
    if (v === 16) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 8, wordBreak: "keep-all" }}>{title}</h2>
            <p style={{ color: `${tc}88`, fontSize: 13, marginBottom: 28 }}>{nameEl}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ padding: "24px 24px", borderRadius: 14, background: `${tc}08`, border: `1px solid ${tc}10` }}>
                    <span style={{ color: a1, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em" }}>POINT 0{i + 1}</span>
                    <p style={{ color: `${tc}CC`, fontSize: 15, lineHeight: 1.7, marginTop: 10, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
        </div>{logoEl}</div>;
    }
    // v===17: Full accent bg + white outlined numbers
    if (v === 17) {
        const cTc = getContrastColor(a1); const cSc = getSubContrastColor(a1);
        return <div id="blog-summary-image" style={{ ...base, background: a1 }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: cTc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 46, height: 46, borderRadius: "50%", border: `2px solid ${cTc}40`, display: "flex", alignItems: "center", justifyContent: "center", color: cTc, fontSize: 18, fontWeight: 900 }}>{i + 1}</div>
                    <p style={{ color: cTc, fontSize: 17, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 8 }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: cSc }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===18: Accent underline per point
    if (v === 18) {
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(180deg,${bg},${a1}20)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>핵심 요약</span>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ paddingBottom: 16, borderBottom: `2px solid ${i === 0 ? a1 : `${a1}40`}` }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span style={{ color: a1, fontSize: 16, fontWeight: 900 }}>0{i + 1}</span>
                        <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>
                </div>)}
            </div>
            <div style={{ marginTop: 20, color: `${tc}AA` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===19: Vertical timeline with accent nodes
    if (v === 19) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", left: 90, top: 170, bottom: 120, width: 2, background: `${a1}40` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingLeft: 50 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: i === 0 ? a1 : `${a1}80`, marginLeft: -29, marginTop: 4, boxShadow: i === 0 ? `0 0 0 4px ${a1}30` : "none" }} />
                        <div>
                            <span style={{ color: a1, fontSize: 12, fontWeight: 800 }}>STEP 0{i + 1}</span>
                            <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", marginTop: 4 }}>{l}</p>
                        </div>
                    </div>)}
                </div>
                <div style={{ marginTop: "auto", color: `${tc}88` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===20: Magazine style 2-column text
    if (v === 20) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 3, background: a1 }} />
                <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>핵심 포인트</span>
            </div>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", gap: 24, flex: 1 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                    {lines.slice(0, 2).map((l, i) => <div key={i} style={{ padding: "20px 20px", borderRadius: 12, background: `${tc}06` }}>
                        <span style={{ color: a1, fontSize: 28, fontWeight: 900 }}>0{i + 1}</span>
                        <p style={{ color: `${tc}CC`, fontSize: 15, lineHeight: 1.7, marginTop: 8, wordBreak: "keep-all" }}>{l}</p>
                    </div>)}
                </div>
                {lines[2] && <div style={{ flex: 1 }}>
                    <div style={{ padding: "20px 20px", borderRadius: 12, background: `${a1}20`, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <span style={{ color: a1, fontSize: 28, fontWeight: 900 }}>03</span>
                        <p style={{ color: `${tc}CC`, fontSize: 15, lineHeight: 1.7, marginTop: 8, wordBreak: "keep-all" }}>{lines[2]}</p>
                    </div>
                </div>}
            </div>
            <div style={{ marginTop: 24, color: `${tc}88` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===21: Accent top bar + stacked cards
    if (v === 21) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: a1 }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "70px 70px" }}>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", alignItems: "stretch", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ width: 56, background: i === 0 ? a1 : `${a1}${i === 1 ? '99' : '60'}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 900 }}>{i + 1}</div>
                        <div style={{ flex: 1, padding: "18px 24px", background: `${tc}06` }}>
                            <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                        </div>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===22: Circular icons on gradient
    if (v === 22) {
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(160deg,${bg},${a1}30)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 80px", textAlign: "center" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", gap: 24, width: "100%" }}>
                {lines.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: i === 0 ? a1 : `${a1}60`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#fff", fontSize: 24, fontWeight: 900 }}>{i + 1}</div>
                    <p style={{ color: `${tc}CC`, fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 32, color: `${tc}88` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===23: Profile photo left + summary right
    if (v === 23) {
        return <div id="blog-summary-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 300px", background: `linear-gradient(180deg,${a1},${a2})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
                {pImg ? <img src={pImg} alt="" style={{ width: 180, height: 220, objectFit: "cover", objectPosition: "top", borderRadius: 14, border: "3px solid rgba(255,255,255,0.3)" }} /> : <div style={{ width: 180, height: 220, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 800, color: "rgba(255,255,255,0.5)" }}>{nm[0]}</div>}
                <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginTop: 16 }}>{nm} 변호사</p>
                {of && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 }}>{of}</p>}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 50px" }}>
                <span style={{ color: a1, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 12 }}>핵심 포인트</span>
                <h2 style={{ color: tc, fontSize: 22, fontWeight: 800, marginBottom: 28, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span style={{ color: a1, fontSize: 28, fontWeight: 900, lineHeight: 1, minWidth: 32 }}>0{i + 1}</span>
                        <p style={{ color: `${tc}CC`, fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{l}</p>
                    </div>)}
                </div>
            </div>{logoEl}
        </div>;
    }
    // v===24: Diagonal accent + dark text cards
    if (v === 24) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", background: `linear-gradient(135deg,transparent 30%,${a1}25 100%)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ padding: "20px 24px", borderRadius: 12, background: `${tc}06`, borderLeft: `4px solid ${i === 0 ? a1 : `${a1}60`}` }}>
                        <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===25: White bg + accent numbered list
    if (v === 25) {
        return <div id="blog-summary-image" style={{ ...base, background: "#FAFAFA" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: a1 }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <span style={{ color: "#999", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>핵심 포인트</span>
                <h2 style={{ color: "#111", fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 36, height: 36, borderRadius: 8, background: a1, display: "flex", alignItems: "center", justifyContent: "center", color: getContrastColor(a1), fontSize: 14, fontWeight: 800 }}>{i + 1}</div>
                        <p style={{ color: "#333", fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
                    {pImg && <img src={pImg} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />}
                    <span style={{ color: "#666", fontSize: 13 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                </div>
            </div>
            {logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 20, right: 24, height: 40, objectFit: "contain", filter: "brightness(0.2)", opacity: 0.3 }} />}
        </div>;
    }
    // v===26: Large title bg overlay + text
    if (v === 26) {
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(135deg,${a1},${a2})` }}>
            <div style={{ position: "absolute", inset: 30, background: "rgba(0,0,0,0.4)", borderRadius: 20, backdropFilter: "blur(4px)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "80px 90px" }}>
                <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 14 }}>
                        <span style={{ color: "#fff", fontSize: 18, fontWeight: 900, opacity: 0.5, minWidth: 28 }}>0{i + 1}</span>
                        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, color: "rgba(255,255,255,0.6)" }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===27: Alternating left-right layout
    if (v === 27) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all", textAlign: "center" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", flexDirection: i % 2 === 0 ? "row" : "row-reverse", textAlign: i % 2 === 0 ? "left" : "right" }}>
                    <div style={{ minWidth: 40, height: 40, borderRadius: "50%", background: a1, display: "flex", alignItems: "center", justifyContent: "center", color: getContrastColor(a1), fontSize: 16, fontWeight: 900 }}>{i + 1}</div>
                    <div style={{ flex: 1, padding: "16px 20px", borderRadius: 12, background: `${tc}06` }}>
                        <p style={{ color: `${tc}CC`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>
                </div>)}
            </div>
            <div style={{ marginTop: 20, textAlign: "center", color: `${tc}88` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===28: Accent gradient left border + minimal
    if (v === 28) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 8, height: "100%", background: `linear-gradient(180deg,${a1},${a2})` }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 60px 60px 80px" }}>
                <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>핵심 요약</span>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
                    {lines.map((l, i) => <div key={i}>
                        <span style={{ color: a1, fontSize: 14, fontWeight: 800 }}>Point {i + 1}</span>
                        <p style={{ color: `${tc}CC`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", marginTop: 4 }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===29: Photo bg + floating cards
    if (v === 29) {
        const oImgSrc = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
            {oImgSrc && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImgSrc})`, backgroundSize: "cover", opacity: 0.12 }} />}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,${bg}EE,${bg}CC)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ padding: "20px 24px", borderRadius: 14, background: `${tc}08`, border: `1px solid ${tc}10`, backdropFilter: "blur(8px)" }}>
                        <div style={{ display: "flex", gap: 12 }}>
                            <span style={{ color: a1, fontSize: 24, fontWeight: 900 }}>0{i + 1}</span>
                            <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 2 }}>{l}</p>
                        </div>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===30: Accent bg + white text with dividers
    if (v === 30) {
        const cTc = getContrastColor(a1); const cSc = getSubContrastColor(a1);
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(180deg,${a1},${a2})` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: cTc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ padding: "20px 0", borderBottom: i < lines.length - 1 ? `1px solid ${cTc}20` : "none" }}>
                    <div style={{ display: "flex", gap: 14 }}>
                        <span style={{ color: cTc, fontSize: 16, fontWeight: 900, opacity: 0.5 }}>0{i + 1}</span>
                        <p style={{ color: cTc, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>
                </div>)}
            </div>
            <div style={{ marginTop: 20, color: cSc }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===31: Three row emphasis layout
    if (v === 31) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "50px 70px 30px", borderBottom: `1px solid ${tc}10` }}>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, wordBreak: "keep-all" }}>{title}</h2>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {lines.map((l, i) => <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 70px", borderBottom: i < lines.length - 1 ? `1px solid ${tc}08` : "none", background: i === 0 ? `${a1}10` : "transparent" }}>
                    <span style={{ color: a1, fontSize: 32, fontWeight: 900, marginRight: 24, opacity: i === 0 ? 1 : 0.5 }}>0{i + 1}</span>
                    <p style={{ color: `${tc}CC`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
            <div style={{ padding: "20px 70px", color: `${tc}88` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===32: Zigzag accent blocks
    if (v === 32) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 32, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", marginLeft: i % 2 === 0 ? 0 : 60, marginRight: i % 2 === 0 ? 60 : 0 }}>
                    <div style={{ width: 50, background: i === 0 ? a1 : i === 1 ? a2 : `${a1}80`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 900 }}>{i + 1}</div>
                    <div style={{ flex: 1, padding: "18px 24px", background: `${tc}06` }}>
                        <p style={{ color: `${tc}CC`, fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>
                </div>)}
            </div>
            <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===33: Big accent quote + numbered list
    if (v === 33) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 40, left: 50, fontSize: 200, fontWeight: 900, color: `${a1}15`, lineHeight: 1 }}>"</div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 14 }}>
                        <span style={{ color: a1, fontSize: 20, fontWeight: 900, minWidth: 28 }}>{i + 1}.</span>
                        <p style={{ color: `${tc}CC`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===34: Process flow with arrows
    if (v === 34) {
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(180deg,${bg},${a1}15)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 70px" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all", textAlign: "center" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 650 }}>
                {lines.map((l, i) => <><div key={i} style={{ padding: "20px 28px", borderRadius: 14, background: `${tc}06`, border: `1px solid ${a1}${i === 0 ? '40' : '20'}`, display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: a1, display: "flex", alignItems: "center", justifyContent: "center", color: getContrastColor(a1), fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                    <p style={{ color: `${tc}CC`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 2 }}>{l}</p>
                </div>
                    {i < lines.length - 1 && <div key={`a${i}`} style={{ textAlign: "center", color: `${a1}60`, fontSize: 20 }}>↓</div>}
                </>)}
            </div>
            <div style={{ marginTop: 28, color: `${tc}88` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===35: Stacked accent bars with text overlay
    if (v === 35) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
            {lines.map((_, i) => <div key={i} style={{ position: "absolute", top: 280 + i * 120, left: 0, right: 0, height: 90, background: `${a1}${i === 0 ? '20' : i === 1 ? '15' : '10'}` }} />)}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>SUMMARY</span>
                <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 40, wordBreak: "keep-all" }}>{title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16 }}>
                        <span style={{ color: a1, fontSize: 40, fontWeight: 900, lineHeight: 0.9, minWidth: 40 }}>{i + 1}</span>
                        <p style={{ color: `${tc}CC`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 4 }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===36: Clean card on accent gradient
    if (v === 36) {
        return <div id="blog-summary-image" style={{ ...base, background: `linear-gradient(135deg,${a1},${a2})` }}>
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 50 }}>
                <div style={{ width: "100%", maxWidth: 800, background: "rgba(255,255,255,0.95)", borderRadius: 20, padding: "48px 56px", boxShadow: "0 10px 40px rgba(0,0,0,0.15)" }}>
                    <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>핵심 포인트</span>
                    <h2 style={{ color: "#111", fontSize: 24, fontWeight: 800, marginTop: 8, marginBottom: 28, wordBreak: "keep-all" }}>{title}</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <div style={{ minWidth: 28, height: 28, borderRadius: 6, background: a1, color: getContrastColor(a1), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{i + 1}</div>
                            <p style={{ color: "#333", fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                        </div>)}
                    </div>
                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 10 }}>
                        {pImg && <img src={pImg} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />}
                        <span style={{ color: "#666", fontSize: 13 }}>{nm} 변호사{of ? ` · ${of}` : ""}</span>
                    </div>
                </div>
            </div>
            <div style={{ filter: isLightColor(a1) ? "brightness(0.1)" : "brightness(1)" }}>{logoEl}</div>
        </div>;
    }
    // v===37: Icon-style numbered blocks on dark
    if (v === 37) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 3, background: a1 }} />
                <span style={{ color: a1, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>KEY POINTS</span>
            </div>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ flex: 1, borderRadius: 16, padding: "28px 24px", background: `${tc}06`, border: `1px solid ${tc}10`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${a1}20`, display: "flex", alignItems: "center", justifyContent: "center", color: a1, fontSize: 20, fontWeight: 900, marginBottom: 16 }}>{i + 1}</div>
                    <p style={{ color: `${tc}CC`, fontSize: 15, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: `${tc}88`, textAlign: "center" }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===38: Horizontal cards with accent top
    if (v === 38) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ height: 6, background: i === 0 ? a1 : i === 1 ? a2 : `${a1}80` }} />
                    <div style={{ padding: "20px 20px", background: `${tc}06`, height: "100%" }}>
                        <span style={{ color: a1, fontSize: 14, fontWeight: 800 }}>0{i + 1}</span>
                        <p style={{ color: `${tc}CC`, fontSize: 15, lineHeight: 1.7, marginTop: 12, wordBreak: "keep-all" }}>{l}</p>
                    </div>
                </div>)}
            </div>
            <div style={{ marginTop: 24, color: `${tc}88` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }
    // v===39: Two-tone split with accent divider
    if (v === 39) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", background: `${a1}15` }} />
            <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translateX(-50%)", width: 60, height: 3, background: a1 }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <span style={{ color: a1, fontSize: 13, fontWeight: 800, letterSpacing: "0.12em" }}>핵심 포인트</span>
                    <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginTop: 8, wordBreak: "keep-all" }}>{title}</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                    {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <span style={{ color: a1, fontSize: 22, fontWeight: 900, minWidth: 28 }}>{i + 1}.</span>
                        <p style={{ color: `${tc}CC`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                    </div>)}
                </div>
                <div style={{ marginTop: 20, textAlign: "center", color: `${tc}88` }}>{nameEl}</div>
            </div>{logoEl}
        </div>;
    }
    // v===40: Checklist style
    if (v === 40) {
        return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
            <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "18px 24px", borderRadius: 12, background: `${tc}06` }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${a1}`, background: `${a1}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        <span style={{ color: a1, fontSize: 14, fontWeight: 900 }}>✓</span>
                    </div>
                    <p style={{ color: `${tc}DD`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all" }}>{l}</p>
                </div>)}
            </div>
            <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
        </div>{logoEl}</div>;
    }

    // v===41 fallback: Simple dark + accent number
    return <div id="blog-summary-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "60px 70px" }}>
        <h2 style={{ color: tc, fontSize: 26, fontWeight: 800, marginBottom: 36, wordBreak: "keep-all" }}>{title}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
            {lines.map((l, i) => <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ color: a1, fontSize: 48, fontWeight: 900, lineHeight: 0.9, minWidth: 40 }}>{i + 1}</span>
                <p style={{ color: `${tc}CC`, fontSize: 16, lineHeight: 1.7, wordBreak: "keep-all", paddingTop: 6 }}>{l}</p>
            </div>)}
        </div>
        <div style={{ marginTop: 20, color: `${tc}88` }}>{nameEl}</div>
    </div>{logoEl}</div>;
}
