"use client";
import { S, FONT, TS, BL_ALL } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";
interface P { config: GenerationConfig; profile: BlogProfile; }

export default function BrandImage({ config, profile }: P) {
    const v = config.brandVariant % BL_ALL.length;
    const a1 = profile.brandColor || config.accentColor;
    const a2 = config.secondaryAccent || a1;
    const { lawyerName: nm, officeName: of, logoImage: logo, specialty: tags, brandLines: bl } = profile;
    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT };
    const logoEl = (w = 120) => logo ? <img src={logo} alt="" style={{ height: w, objectFit: "contain" }} /> : null;
    const tagLine = tags?.join(" · ") || "법률 전문";
    const lines = (bl || []).slice(0, 3);
    const linesEl = lines.length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16, textAlign: "center" }}>
        {lines.map((l, i) => <p key={i} style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5 }}>{l}</p>)}
    </div> : null;

    if (v === 0) { // Logo on accent gradient
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(160deg,${a1},${a2})`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "rgba(255,255,255,0.2)" }} />
            {logoEl(120)}
            <h2 style={{ color: "#fff", fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em", textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>{nm} 변호사</h2>
            {of && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>{of}</p>}
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, letterSpacing: "0.12em" }}>{tagLine}</p>
            {linesEl && <div style={{ color: "rgba(255,255,255,0.8)" }}>{linesEl}</div>}
        </div>;
    }
    if (v === 1) { // Bold name on accent bg
        return <div id="blog-brand-image" style={{ ...base, background: a1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 20 }}>{of || tagLine}</p>
            <h1 style={{ color: "#fff", fontSize: 80, fontWeight: 900, letterSpacing: "-0.05em", textShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>{nm}</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, fontWeight: 600, marginTop: 8 }}>변호사</p>
            <div style={{ width: 50, height: 3, background: "rgba(255,255,255,0.4)", borderRadius: 2, marginTop: 24 }} />
            {logo && <div style={{ marginTop: 30 }}>{logoEl(80)}</div>}
            {linesEl && <div style={{ color: "rgba(255,255,255,0.7)" }}>{linesEl}</div>}
        </div>;
    }
    if (v === 2) { // Minimal dark + accent accent line
        return <div id="blog-brand-image" style={{ ...base, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                {logoEl(100)}
                <div style={{ width: 2, height: 50, background: a1, margin: "20px auto" }} />
                <h2 style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{nm} 변호사</h2>
                {of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 }}>{of}</p>}
                <p style={{ color: a1, fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", marginTop: 16 }}>{tagLine}</p>
                {linesEl && <div style={{ color: "rgba(255,255,255,0.6)" }}>{linesEl}</div>}
            </div>
        </div>;
    }
    if (v === 3) { // Full gradient bg with tags
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(135deg,${a1},${a2})`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            {logoEl(100)}
            <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>{nm} 변호사</h2>
            {of && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}>{of}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>{(tags || []).map((t, i) => <span key={i} style={{ padding: "5px 16px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 12, fontWeight: 600 }}>{t}</span>)}</div>
            {linesEl && <div style={{ color: "rgba(255,255,255,0.8)" }}>{linesEl}</div>}
        </div>;
    }
    if (v === 4) { // Accent stripe left on dark
        return <div id="blog-brand-image" style={{ ...base, background: "#111" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: "100%", background: a1 }} />
            <div style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 100, background: `${a1}25` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {logoEl(100)}
                <h2 style={{ color: "#fff", fontSize: 34, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>{of}</p>}
            </div>
        </div>;
    }
    if (v === 5) { // Accent circle bg
        return <div id="blog-brand-image" style={{ ...base, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: `${a1}30` }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 350, height: 350, borderRadius: "50%", background: `${a1}20` }} />
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                {logoEl(100)}
                <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 900, marginTop: 16 }}>{nm}</h2>
                <p style={{ color: a1, fontSize: 14, fontWeight: 600, marginTop: 8 }}>변호사{of ? ` · ${of}` : ""}</p>
            </div>
        </div>;
    }
    if (v === 6) { // Split: accent left, dark right
        return <div id="blog-brand-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 50%", background: a1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <h1 style={{ color: "#fff", fontSize: 56, fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>{nm}</h1>
            </div>
            <div style={{ flex: "0 0 50%", background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {logoEl(80)}
                <p style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>변호사</p>
                {of && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{of}</p>}
                <p style={{ color: a1, fontSize: 12, letterSpacing: "0.1em", marginTop: 8 }}>{tagLine}</p>
            </div>
        </div>;
    }
    if (v === 7) { // Accent dot pattern
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(180deg,${a1}60,#111)` }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle,rgba(255,255,255,0.08) 1px,transparent 1px)`, backgroundSize: "24px 24px" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
                {logoEl(100)}
                <h2 style={{ color: "#fff", fontSize: 38, fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>{nm} 변호사</h2>
                {of && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15 }}>{of}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>{(tags || []).slice(0, 3).map((t, i) => <span key={i} style={{ padding: "4px 14px", borderRadius: 6, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, fontWeight: 600 }}>{t}</span>)}</div>
                {linesEl && <div style={{ color: "rgba(255,255,255,0.7)" }}>{linesEl}</div>}
            </div>
        </div>;
    }
    if (v === 8) { // Light warm bg
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(135deg,${a1}60,${a2}80,#F5F0EB)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                {logo && <div style={{ marginBottom: 20 }}>{logoEl(100)}</div>}
                <h2 style={{ color: "#222", fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: "#666", fontSize: 15, marginTop: 8 }}>{of}</p>}
                <div style={{ width: 40, height: 3, background: a1, borderRadius: 2, margin: "20px auto 16px" }} />
                <p style={{ color: "#888", fontSize: 13, letterSpacing: "0.08em" }}>{tagLine}</p>
                {linesEl && <div style={{ color: "#555" }}>{linesEl}</div>}
            </div>
        </div>;
    }
    // v===9: Accent corner gradients
    return <div id="blog-brand-image" style={{ ...base, background: "#111" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 400, height: 400, background: `linear-gradient(225deg,${a1}80,transparent)` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 300, height: 300, background: `linear-gradient(45deg,${a2}60,transparent)` }} />
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
            {logoEl(100)}
            <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
            {of && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>{of}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <div style={{ width: 24, height: 2, background: a1 }} />
                <span style={{ color: a1, fontSize: 13, fontWeight: 600, letterSpacing: "0.1em" }}>{tagLine}</span>
                <div style={{ width: 24, height: 2, background: a1 }} />
            </div>
            {linesEl && <div style={{ color: "rgba(255,255,255,0.6)" }}>{linesEl}</div>}
        </div>
    </div>;
}
