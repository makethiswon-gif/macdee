"use client";
import { S, FONT, TS, CL_ALL } from "./designs";
import type { GenerationConfig, BlogProfile } from "../themes";
interface P { config: GenerationConfig; profile: BlogProfile; }

export default function ContactImage({ config, profile }: P) {
    const v = config.contactVariant % CL_ALL.length;
    const accent = profile.brandColor || config.accentColor;
    const a2 = config.secondaryAccent || accent;
    const pImg = profile.profileImages?.[config.profileImageIndex] || profile.profileImages?.[0];
    const oImg = profile.officeImages?.[config.officeImageIndex] || profile.officeImages?.[0];
    const { lawyerName: nm, officeName: of, phone, address, website, logoImage: logo } = profile;
    const bg = config.backgroundColor || "#111";
    const tc = config.textColor || "#fff";
    const base: React.CSSProperties = { width: S, height: S, position: "relative", overflow: "hidden", fontFamily: FONT, background: bg };
    const logoEl = logo && <img src={logo} alt="" style={{ position: "absolute", bottom: 24, right: 28, height: 60, objectFit: "contain", opacity: 0.7 }} />;
    const phones = Array.isArray(phone) ? phone.filter(Boolean).slice(0, 3) : (phone ? [phone] : []);
    const IconTel = <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
    const IconPin = <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
    const IconWeb = <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
    const ci = [...phones.map((p, i) => ({ icon: IconTel, label: phones.length > 1 ? `전화 ${i + 1}` : "전화", value: p })), address && { icon: IconPin, label: "주소", value: address }, website && { icon: IconWeb, label: "웹사이트", value: website }].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];
    // Face-focused profile photo
    const profImg = (w: number, h: number, r = 16) => pImg ? <img src={pImg} alt="" style={{ width: w, height: h, objectFit: "cover", objectPosition: "top", borderRadius: r }} /> : null;

    if (v === 0) { // Accent bg centered
        return <div id="blog-contact-image" style={{ ...base, background: `linear-gradient(160deg,${accent},${a2})` }}>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    {profImg(130, 160, 16) && <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>{profImg(130, 160, 16)}</div>}
                    <p style={{ color: "rgba(0,0,0,0.6)", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8 }}>상담 안내</p>
                    <h2 style={{ color: "#111", fontSize: 36, fontWeight: 900, marginBottom: 6 }}>{nm} 변호사</h2>
                    {of && <p style={{ color: "rgba(0,0,0,0.6)", fontSize: 15, marginBottom: 32 }}>{of}</p>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                        {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, color: "#111", fontSize: 15 }}><span>{c.icon}</span><span style={{ fontWeight: 600 }}>{c.value}</span></div>)}
                    </div>
                </div>
            </div><div style={{ filter: "brightness(0.1)" }}>{logoEl}</div>
        </div>;
    }
    if (v === 1) { // Office bg + accent overlay
        return <div id="blog-contact-image" style={{ ...base, background: bg }}>
            {oImg && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg})`, backgroundSize: "cover" }} />}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,${accent}EE,${a2}CC)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", padding: "0 80px", gap: 50 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    {profImg(150, 190, 16) && <div style={{ border: "3px solid rgba(0,0,0,0.2)", borderRadius: 16, overflow: "hidden" }}>{profImg(150, 190, 16)}</div>}
                </div>
                <div>
                    <p style={{ color: "rgba(0,0,0,0.6)", fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 10 }}>상담 안내</p>
                    <h2 style={{ color: "#111", fontSize: 32, fontWeight: 900, marginBottom: 6 }}>{nm} 변호사</h2>
                    {of && <p style={{ color: "rgba(0,0,0,0.6)", fontSize: 14, marginBottom: 28 }}>{of}</p>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>
                            <div><p style={{ color: "rgba(0,0,0,0.6)", fontSize: 11, fontWeight: 700 }}>{c.label}</p><p style={{ color: "#111", fontSize: 16, fontWeight: 700 }}>{c.value}</p></div>
                        </div>)}
                    </div>
                </div>
            </div><div style={{ filter: "brightness(0.1)" }}>{logoEl}</div>
        </div>;
    }
    if (v === 2) { // Accent left split
        return <div id="blog-contact-image" style={{ ...base, display: "flex" }}>
            <div style={{ flex: "0 0 42%", background: accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {profImg(180, 220, 16) || <div style={{ width: 180, height: 220, borderRadius: 16, background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 700, color: "rgba(0,0,0,0.4)" }}>{nm[0]}</div>}
                <p style={{ color: "#111", fontSize: 22, fontWeight: 900 }}>{nm} 변호사</p>
                {of && <p style={{ color: "rgba(0,0,0,0.6)", fontSize: 13, fontWeight: 700 }}>{of}</p>}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 60px", background: bg }}>
                <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 28 }}>상담 안내</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 14, background: `${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{c.icon}</div>
                        <div><p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginBottom: 2 }}>{c.label}</p><p style={{ color: "#fff", fontSize: 17, fontWeight: 600 }}>{c.value}</p></div>
                    </div>)}
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 3) { // White card on accent bg
        return <div id="blog-contact-image" style={{ ...base, background: accent }}><div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 50 }}>
            <div style={{ width: "100%", maxWidth: 750, background: "#fff", borderRadius: 20, padding: "48px 56px", display: "flex", gap: 40, alignItems: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.15)" }}>
                <div style={{ flex: "0 0 auto", textAlign: "center" }}>
                    {profImg(140, 170, 16) || <div style={{ width: 140, height: 170, borderRadius: 16, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, color: "#9CA3AF", fontWeight: 700 }}>{nm[0]}</div>}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ color: "#111", fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{nm} 변호사</h2>
                    {of && <p style={{ color: "#666", fontSize: 14, marginBottom: 24, fontWeight: 600 }}>{of}</p>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#222" }}><span style={{ color: accent }}>{c.icon}</span><span style={{ fontWeight: 600 }}>{c.value}</span></div>)}
                    </div>
                </div>
            </div>
        </div><div style={{ filter: "brightness(0.1)" }}>{logoEl}</div></div>;
    }
    if (v === 4) { // Accent colored info cards
        return <div id="blog-contact-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: accent }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 70px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
                    {profImg(60, 60, 30)}
                    <div><h2 style={{ color: "#fff", fontSize: 30, fontWeight: 900 }}>{nm} 변호사</h2>{of && <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>{of}</p>}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {ci.map((c, i) => <div key={i} style={{ padding: "24px 28px", borderRadius: 16, background: i === 0 ? accent : `${accent}99`, color: "#111" }}>
                        <span style={{ fontSize: 22 }}>{c.icon}</span>
                        <p style={{ fontSize: 12, marginTop: 10, opacity: 0.8, fontWeight: 700 }}>{c.label}</p>
                        <p style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{c.value}</p>
                    </div>)}
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 5) { // Horizontal with accent divider
        return <div id="blog-contact-image" style={{ ...base, background: bg }}><div style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 70px", gap: 40 }}>
            <div style={{ flex: "0 0 auto", textAlign: "center" }}>
                {profImg(160, 200, 16) && <div style={{ border: `3px solid ${accent}`, borderRadius: 16, overflow: "hidden" }}>{profImg(160, 200, 16)}</div>}
                <p style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 14 }}>{nm}</p>
                <p style={{ color: accent, fontSize: 12, fontWeight: 600, marginTop: 4 }}>변호사</p>
            </div>
            <div style={{ width: 3, height: 200, background: accent, borderRadius: 2 }} />
            <div style={{ flex: 1 }}>
                <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 20 }}>상담 안내</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {ci.map((c, i) => <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <span style={{ fontSize: 20, width: 24, textAlign: "center" }}>{c.icon}</span>
                        <div><p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>{c.label}</p><p style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{c.value}</p></div>
                    </div>)}
                </div>
            </div>
        </div>{logoEl}</div>;
    }
    if (v === 6) { // Photo bg with accent overlay centered
        return <div id="blog-contact-image" style={{ ...base, background: bg }}>
            {(oImg || pImg) && <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${oImg || pImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,${accent}EE,${a2}DD)` }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <p style={{ color: "rgba(0,0,0,0.6)", fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 12 }}>상담 안내</p>
                    <h2 style={{ color: "#111", fontSize: 38, fontWeight: 900 }}>{nm} 변호사</h2>
                    {of && <p style={{ color: "rgba(0,0,0,0.6)", fontSize: 15, marginTop: 8, marginBottom: 28 }}>{of}</p>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                        {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, color: "#111", fontSize: 16 }}><span>{c.icon}</span><span style={{ fontWeight: 700 }}>{c.value}</span></div>)}
                    </div>
                </div>
            </div><div style={{ filter: "brightness(0.1)" }}>{logoEl}</div>
        </div>;
    }
    if (v === 7) { // Accent stripe left
        return <div id="blog-contact-image" style={{ ...base, background: bg }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: "100%", background: accent }} />
            <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 70px 50px 90px" }}>
                <p style={{ color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>상담 안내</p>
                <h2 style={{ color: "#fff", fontSize: 34, fontWeight: 900, marginBottom: 6 }}>{nm} 변호사</h2>
                {of && <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginBottom: 32 }}>{of}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>
                        <div><p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>{c.label}</p><p style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{c.value}</p></div>
                    </div>)}
                </div>
            </div>{logoEl}
        </div>;
    }
    if (v === 8) { // Light warm bg
        return <div id="blog-contact-image" style={{ ...base, background: `linear-gradient(135deg,${accent}60,${a2}80,#F5F0EB)` }}><div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "50px 70px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
                {profImg(56, 56, 28)}
                <div><h2 style={{ color: "#222", fontSize: 30, fontWeight: 900 }}>{nm} 변호사</h2>{of && <p style={{ color: "#666", fontSize: 14 }}>{of}</p>}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {ci.map((c, i) => <div key={i} style={{ padding: "18px 24px", borderRadius: 14, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <div><p style={{ color: "#999", fontSize: 11 }}>{c.label}</p><p style={{ color: "#111", fontSize: 16, fontWeight: 600 }}>{c.value}</p></div>
                </div>)}
            </div>
        </div>{logoEl}</div>;
    }
    // v===9: Big name + accent gradient
    return <div id="blog-contact-image" style={{ ...base, background: `linear-gradient(135deg,${accent},${a2})` }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 350, height: 350, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)" }} />
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            {profImg(120, 150, 16) && <div style={{ marginBottom: 20 }}>{profImg(120, 150, 16)}</div>}
            <h2 style={{ color: "#fff", fontSize: 44, fontWeight: 900, marginBottom: 4, textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>{nm}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>변호사{of ? ` · ${of}` : ""}</p>
            <div style={{ width: 40, height: 3, background: "rgba(255,255,255,0.4)", borderRadius: 2, margin: "16px auto 24px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {ci.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontSize: 15 }}><span>{c.icon}</span><span style={{ fontWeight: 500 }}>{c.value}</span></div>)}
            </div>
        </div>{logoEl}
    </div>;
}
