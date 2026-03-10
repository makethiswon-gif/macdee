"use client";
import { S, FONT, TS, CL_ALL } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";
interface P { config: GenerationConfig; profile: BlogProfile; }

export default function ContactImage({ config, profile }: P) {
    const v = config.contactVariant % CL_ALL.length;
    const accent = profile.brandColor || config.accentColor;
    const pImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const oImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
    const { lawyerName: nm, officeName: of, phone, address, website, logoImage: logo } = profile;
    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: "#0C0C0C" };
    const logoEl = logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 60, objectFit: "contain", opacity: 0.7 }} />;
    const phones = Array.isArray(phone) ? phone.filter(Boolean).slice(0, 3) : (phone ? [phone] : []);
    const ci = [...phones.map((p, i) => ({ icon: "📞", label: phones.length > 1 ? `전화 ${i + 1}` : "전화", value: p })), address && { icon: "📍", label: "주소", value: address }, website && { icon: "🌐", label: "웹사이트", value: website }].filter(Boolean) as { icon: string; label: string; value: string }[];

    if (v === 0) { // Centered profile + info
        return <div id="blog-contact-image" style={base}>
            {oImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg})`, backgroundSize: "cover", opacity: 0.06 }} />}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    {pImg && <img src={pImg} alt="" style={{ width: 130, height: 160, objectFit: "cover", borderRadius: 16, margin: "0 auto 20px", border: `2px solid ${accent}30` }} />}
                    <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>상담 안내</p>
                    <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 900, marginBottom: 6 }}>{nm} 변호사</h2>
                    {of && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginBottom: 32 }}>{of}</p>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                        {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(255,255,255,0.7)", fontSize: 15 }}><span>{c.icon}</span><span style={{ fontWeight: 500 }}>{c.value}</span></div>)}
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 1) { // Office bg + overlay
        return <div id="blog-contact-image" style={base}>
            {oImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg})`, backgroundSize: "cover" }} />}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,rgba(0,0,0,0.8),rgba(0,0,0,0.65))` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", padding: "0 80px", gap: 50 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    {pImg && <img src={pImg} alt="" style={{ width: 150, height: 190, objectFit: "cover", borderRadius: 16, border: `2px solid ${accent}30`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} />}
                </div>
                <div>
                    <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>상담 안내</p>
                    <h2 style={{ color: "#fff", fontSize: 32, fontWeight: 900, textShadow: TS, marginBottom: 6 }}>{nm} 변호사</h2>
                    {of && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 28, textShadow: TS }}>{of}</p>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>
                            <div><p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{c.label}</p><p style={{ color: "#fff", fontSize: 16, fontWeight: 600, textShadow: TS }}>{c.value}</p></div>
                        </div>)}
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 2) { // Split
        return <div id="blog-contact-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 42%", background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {pImg ? <img src={pImg} alt="" style={{ width: 180, height: 220, objectFit: "cover", borderRadius: 16, border: `2px solid ${accent}20` }} /> : <div style={{ width: 180, height: 220, borderRadius: 16, background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, color: "#333" }}>⚖</div>}
                <p style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>{nm} 변호사</p>
                {of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{of}</p>}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px" }}>
                <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 28 }}>상담 안내</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 14, background: `${accent}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{c.icon}</div>
                        <div><p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>{c.label}</p><p style={{ color: "#fff", fontSize: 17, fontWeight: 600 }}>{c.value}</p></div>
                    </div>)}
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 3) { // Light card
        return <div id="blog-contact-image" style={base}><div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 50 }}>
            <div style={{ width: "100%", maxWidth: 750, background: "#FAFAFA", borderRadius: 20, padding: "48px 56px", display: "flex", gap: 40, alignItems: "center" }}>
                <div style={{ flex: "0 0 auto", textAlign: "center" }}>
                    {pImg ? <img src={pImg} alt="" style={{ width: 140, height: 170, objectFit: "cover", borderRadius: 16 }} /> : <div style={{ width: 140, height: 170, borderRadius: 16, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, color: "#9CA3AF" }}>⚖</div>}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ color: "#111", fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{nm} 변호사</h2>
                    {of && <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>{of}</p>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#333" }}><span style={{ color: accent }}>{c.icon}</span><span style={{ fontWeight: 500 }}>{c.value}</span></div>)}
                    </div>
                </div>
            </div>
        </div>{logoEl}</div>;
    }
    if (v === 4) { // Grid cards
        return <div id="blog-contact-image" style={base}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 70px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
                    {pImg && <img src={pImg} alt="" style={{ width: 60, height: 60, borderRadius: 16, objectFit: "cover" }} />}
                    <div><h2 style={{ color: "#fff", fontSize: 30, fontWeight: 900 }}>{nm} 변호사</h2>{of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>{of}</p>}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {ci.map((c, i) => <div key={i} style={{ padding: "24px 28px", borderRadius: 16, background: "#161616", border: "1px solid #222" }}>
                        <span style={{ fontSize: 22 }}>{c.icon}</span>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 10 }}>{c.label}</p>
                        <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginTop: 4 }}>{c.value}</p>
                    </div>)}
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 5) { // Horizontal layout
        return <div id="blog-contact-image" style={base}><div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 70px", gap: 40 }}>
            <div style={{ flex: "0 0 auto", textAlign: "center" }}>
                {pImg && <img src={pImg} alt="" style={{ width: 160, height: 200, objectFit: "cover", borderRadius: 16, border: `2px solid ${accent}20` }} />}
                <p style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 14 }}>{nm}</p>
                <p style={{ color: accent, fontSize: 12, fontWeight: 600, marginTop: 4 }}>변호사</p>
            </div>
            <div style={{ width: 1, height: 200, background: "#222" }} />
            <div style={{ flex: 1 }}>
                <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 20 }}>상담 안내</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {ci.map((c, i) => <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <span style={{ fontSize: 20 }}>{c.icon}</span>
                        <div><p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{c.label}</p><p style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{c.value}</p></div>
                    </div>)}
                </div>
            </div>
        </div>{logoEl}</div>;
    }
    if (v === 6) { // Photo bg centered
        return <div id="blog-contact-image" style={base}>
            {(oImg || pImg) && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg || pImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>상담 안내</p>
                    <h2 style={{ color: "#fff", fontSize: 38, fontWeight: 900, textShadow: TS }}>{nm} 변호사</h2>
                    {of && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 8, marginBottom: 28, textShadow: TS }}>{of}</p>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                        {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(255,255,255,0.75)", fontSize: 16 }}><span>{c.icon}</span><span style={{ fontWeight: 500, textShadow: TS }}>{c.value}</span></div>)}
                    </div>
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 7) { // Accent stripe
        return <div id="blog-contact-image" style={base}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 6, height: "100%", background: accent }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 70px 50px 90px" }}>
                <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>상담 안내</p>
                <h2 style={{ color: "#fff", fontSize: 34, fontWeight: 900, marginBottom: 6 }}>{nm} 변호사</h2>
                {of && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 32 }}>{of}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>
                        <div><p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{c.label}</p><p style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{c.value}</p></div>
                    </div>)}
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 8) { // Light formal
        return <div id="blog-contact-image" style={{ ...base, background: "#FAFAFA" }}><div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 70px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
                {pImg && <img src={pImg} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover" }} />}
                <div><h2 style={{ color: "#111", fontSize: 30, fontWeight: 900 }}>{nm} 변호사</h2>{of && <p style={{ color: "#666", fontSize: 14 }}>{of}</p>}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {ci.map((c, i) => <div key={i} style={{ padding: "18px 24px", borderRadius: 14, background: "#fff", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <div><p style={{ color: "#999", fontSize: 11 }}>{c.label}</p><p style={{ color: "#111", fontSize: 16, fontWeight: 600 }}>{c.value}</p></div>
                </div>)}
            </div>
        </div>{logoEl}</div>;
    }
    // v===9: Big name + gradient
    return <div id="blog-contact-image" style={{ ...base, background: `linear-gradient(135deg,#0C0C0C 0%,#1A1A2E 100%)` }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 350, height: 350, borderRadius: "50%", border: `2px solid ${accent}10` }} />
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            {pImg && <img src={pImg} alt="" style={{ width: 120, height: 150, objectFit: "cover", borderRadius: 16, marginBottom: 20, border: `2px solid ${accent}25` }} />}
            <h2 style={{ color: "#fff", fontSize: 44, fontWeight: 900, marginBottom: 4 }}>{nm}</h2>
            <p style={{ color: accent, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>변호사{of ? ` · ${of}` : ""}</p>
            <div style={{ width: 40, height: 3, background: accent, borderRadius: 2, margin: "16px auto 24px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.7)", fontSize: 15 }}><span>{c.icon}</span><span style={{ fontWeight: 500 }}>{c.value}</span></div>)}
            </div>
        </div>{logoEl}
    </div>;
}
