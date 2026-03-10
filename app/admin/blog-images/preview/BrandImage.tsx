"use client";
import { S, FONT, TS, BL_ALL } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";
interface P { config: GenerationConfig; profile: BlogProfile; }

export default function BrandImage({ config, profile }: P) {
    const v = config.brandVariant % BL_ALL.length;
    const accent = profile.brandColor || config.accentColor;
    const { lawyerName: nm, officeName: of, logoImage: logo, specialty: tags } = profile;
    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: "#0C0C0C" };
    const logoEl = (w = 120) => logo ? <img src={logo} alt="" style={{ height: w, objectFit: "contain" }} /> : null;
    const tagLine = tags?.join(" · ") || "법률 전문";

    if (v === 0) { // Logo centered
        return <div id="blog-brand-image" style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accent }} />
            {logoEl(120)}
            <h2 style={{ color: "#fff", fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em" }}>{nm} 변호사</h2>
            {of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>{of}</p>}
            <p style={{ color: accent, fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", marginTop: 8 }}>{tagLine.toUpperCase()}</p>
        </div>;
    }
    if (v === 1) { // Name bold fullscreen
        return <div id="blog-brand-image" style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <p style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 20 }}>{of || tagLine}</p>
            <h1 style={{ color: "#fff", fontSize: 80, fontWeight: 900, letterSpacing: "-0.05em" }}>{nm}</h1>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 18, fontWeight: 600, marginTop: 8 }}>변호사</p>
            <div style={{ width: 50, height: 3, background: accent, borderRadius: 2, marginTop: 24 }} />
            {logo && <div style={{ marginTop: 30 }}>{logoEl(80)}</div>}
        </div>;
    }
    if (v === 2) { // Minimal with line
        return <div id="blog-brand-image" style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                {logoEl(100)}
                <div style={{ width: 1, height: 50, background: "#333", margin: "20px auto" }} />
                <h2 style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{nm} 변호사</h2>
                {of && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 8 }}>{of}</p>}
                <p style={{ color: accent, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", marginTop: 16 }}>{tagLine}</p>
            </div>
        </div>;
    }
    if (v === 3) { // Gradient bg
        return <div id="blog-brand-image" style={{ ...base, background: `linear-gradient(135deg,#0C0C0C 0%,${accent}15 50%,#0C0C0C 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            {logoEl(100)}
            <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
            {of && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>{of}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>{(tags || []).map((t, i) => <span key={i} style={{ padding: "5px 16px", borderRadius: 20, border: `1px solid ${accent}40`, color: accent, fontSize: 12, fontWeight: 600 }}>{t}</span>)}</div>
        </div>;
    }
    if (v === 4) { // Accent stripe
        return <div id="blog-brand-image" style={base}>
            <div style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 100, background: `${accent}10` }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: 5, height: "100%", background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {logoEl(100)}
                <h2 style={{ color: "#fff", fontSize: 34, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>{of}</p>}
            </div>
        </div>;
    }
    if (v === 5) { // Circle accent
        return <div id="blog-brand-image" style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", border: `2px solid ${accent}15` }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 350, height: 350, borderRadius: "50%", border: `1px solid ${accent}08` }} />
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                {logoEl(100)}
                <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 900, marginTop: 16 }}>{nm}</h2>
                <p style={{ color: accent, fontSize: 14, fontWeight: 600, marginTop: 8 }}>변호사{of ? ` · ${of}` : ""}</p>
            </div>
        </div>;
    }
    if (v === 6) { // Split tone
        return <div id="blog-brand-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <h1 style={{ color: "#fff", fontSize: 56, fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{nm}</h1>
            </div>
            <div style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {logoEl(80)}
                <p style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>변호사</p>
                {of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{of}</p>}
                <p style={{ color: accent, fontSize: 12, letterSpacing: "0.1em", marginTop: 8 }}>{tagLine}</p>
            </div>
        </div>;
    }
    if (v === 7) { // Pattern
        return <div id="blog-brand-image" style={base}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle,${accent}06 1px,transparent 1px)`, backgroundSize: "24px 24px" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
                {logoEl(100)}
                <h2 style={{ color: "#fff", fontSize: 38, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>{of}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>{(tags || []).slice(0, 3).map((t, i) => <span key={i} style={{ padding: "4px 14px", borderRadius: 6, background: `${accent}15`, color: accent, fontSize: 12, fontWeight: 600 }}>{t}</span>)}</div>
            </div>
        </div>;
    }
    if (v === 8) { // Light clean
        return <div id="blog-brand-image" style={{ ...base, background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                {logo && <div style={{ marginBottom: 20 }}>{logoEl(100)}</div>}
                <h2 style={{ color: "#111", fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
                {of && <p style={{ color: "#666", fontSize: 15, marginTop: 8 }}>{of}</p>}
                <div style={{ width: 40, height: 3, background: accent, borderRadius: 2, margin: "20px auto 16px" }} />
                <p style={{ color: "#999", fontSize: 13, letterSpacing: "0.08em" }}>{tagLine}</p>
            </div>
        </div>;
    }
    // v===9: Dark accent corner
    return <div id="blog-brand-image" style={base}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 300, height: 300, background: `linear-gradient(225deg,${accent}20,transparent)` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 200, height: 200, background: `linear-gradient(45deg,${accent}10,transparent)` }} />
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
            {logoEl(100)}
            <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 900 }}>{nm} 변호사</h2>
            {of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>{of}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <div style={{ width: 24, height: 2, background: accent }} />
                <span style={{ color: accent, fontSize: 13, fontWeight: 600, letterSpacing: "0.1em" }}>{tagLine}</span>
                <div style={{ width: 24, height: 2, background: accent }} />
            </div>
        </div>
    </div>;
}
