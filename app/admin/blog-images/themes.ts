// Blog Image Generator v2 — Design System
// Reference: PlusX dark bold Korean typography, photo overlays, accent highlights

export interface BlogProfile {
    id: string;
    lawyerName: string;
    officeName: string;
    phone: string[];
    address: string;
    website: string;
    specialty: string[];
    profileImages: string[];
    officeImages: string[];
    logoImage: string;
    brandColor: string;
    brandLines: string[];
    profileImageCount?: number;
    officeImageCount?: number;
    hasLogo?: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface GenerationConfig {
    id: string;
    profileId: string;
    postTitle: string;
    postSummary: string;
    accentColor: string;
    secondaryAccent: string;
    backgroundColor: string;
    textColor: string;
    mainVariant: number;
    summaryVariant: number;
    contactVariant: number;
    brandVariant: number;
    profileImageIndex: number;
    officeImageIndex: number;
    overlayOpacity: number;
    createdAt: number;
    aiImageUrl?: string;
}

// 50 Color Palettes — background / text / accent
export interface ColorPalette { bg: string; text: string; accent: string; }
export const COLOR_PALETTES: ColorPalette[] = [
    // ── Professional Blue & White (1-5) ──
    { bg: "#FFFFFF", text: "#1A1A2E", accent: "#2B4C7E" },
    { bg: "#F7F9FC", text: "#1B2A4A", accent: "#3A6EA5" },
    { bg: "#EDF2F9", text: "#1E3050", accent: "#1A5276" },
    { bg: "#FFFFFF", text: "#2C3E50", accent: "#2980B9" },
    { bg: "#F0F4F8", text: "#1A1A2E", accent: "#34495E" },
    // ── Classic Navy on Light (6-10) ──
    { bg: "#FAFBFD", text: "#0D1B2A", accent: "#1B3A5C" },
    { bg: "#F5F7FA", text: "#1A2B45", accent: "#415A77" },
    { bg: "#FFFFFF", text: "#1A1A2E", accent: "#0A2647" },
    { bg: "#F8F9FA", text: "#212529", accent: "#1E3D59" },
    { bg: "#EEF1F5", text: "#1A2744", accent: "#5B7FA8" },
    // ── Elegant Gray & Gold (11-15) ──
    { bg: "#F5F5F5", text: "#1A1A1A", accent: "#8B7355" },
    { bg: "#FAFAFA", text: "#222222", accent: "#A67C52" },
    { bg: "#F7F7F7", text: "#1A1A1A", accent: "#7A6652" },
    { bg: "#F2F2F2", text: "#1F1F1F", accent: "#8C7851" },
    { bg: "#EEEEEE", text: "#2A2A2A", accent: "#96785A" },
    // ── Warm Cream & Brown (16-20) ──
    { bg: "#FAF7F2", text: "#1A1A1A", accent: "#DDB892" },
    { bg: "#F5E9DA", text: "#1A1A1A", accent: "#C49A6C" },
    { bg: "#F3EFE6", text: "#1A1A1A", accent: "#A98467" },
    { bg: "#F8F4EC", text: "#1A1A1A", accent: "#7FAE8C" },
    { bg: "#F0EFEA", text: "#1B1B1B", accent: "#B37A4C" },
    // ── Soft Blue-Gray (21-25) ──
    { bg: "#E8EDF2", text: "#1A2744", accent: "#3B7DD8" },
    { bg: "#DDE5EE", text: "#1B2A4A", accent: "#4A90D9" },
    { bg: "#E5ECF4", text: "#1E3050", accent: "#2C6FBB" },
    { bg: "#DBE4EF", text: "#1A2744", accent: "#5B8DB5" },
    { bg: "#D4DFE9", text: "#1B2A4A", accent: "#376CA5" },
    // ── Dark Navy Premium (26-30) ──
    { bg: "#0F172A", text: "#FFFFFF", accent: "#60A5FA" },
    { bg: "#111827", text: "#F9FAFB", accent: "#93C5FD" },
    { bg: "#1E293B", text: "#FFFFFF", accent: "#38BDF8" },
    { bg: "#0B132B", text: "#FFFFFF", accent: "#C49A6C" },
    { bg: "#020617", text: "#F8FAFC", accent: "#D4AF37" },
    // ── Charcoal & Gold (31-35) ──
    { bg: "#1C1C1C", text: "#FFFFFF", accent: "#B08968" },
    { bg: "#2D2D2D", text: "#FFFFFF", accent: "#C49A6C" },
    { bg: "#262626", text: "#FFFFFF", accent: "#C8A96B" },
    { bg: "#383838", text: "#FFFFFF", accent: "#E6B89C" },
    { bg: "#121212", text: "#FFFFFF", accent: "#D4AF37" },
    // ── Forest Green (36-40) ──
    { bg: "#1B4332", text: "#FFFFFF", accent: "#D8C3A5" },
    { bg: "#344E41", text: "#FFFFFF", accent: "#EAD7BB" },
    { bg: "#2F3E46", text: "#FFFFFF", accent: "#DDB892" },
    { bg: "#F8F4EC", text: "#1A1A1A", accent: "#3F6F5A" },
    { bg: "#EDEDE9", text: "#1A1A1A", accent: "#588157" },
    // ── Sophisticated Pastel (41-45) ──
    { bg: "#F0F5FF", text: "#1A2744", accent: "#4361EE" },
    { bg: "#FFF8F0", text: "#3D2B1F", accent: "#E07A5F" },
    { bg: "#F5FFF5", text: "#1A3A1A", accent: "#2D6A4F" },
    { bg: "#FFF5F5", text: "#4A1A1A", accent: "#C0392B" },
    { bg: "#F5F0FF", text: "#2A1A4A", accent: "#6C5CE7" },
    // ── Modern Slate & Accent (46-50) ──
    { bg: "#F8FAFC", text: "#0F172A", accent: "#6366F1" },
    { bg: "#FEFCE8", text: "#422006", accent: "#CA8A04" },
    { bg: "#ECFDF5", text: "#064E3B", accent: "#059669" },
    { bg: "#FDF2F8", text: "#831843", accent: "#DB2777" },
    { bg: "#F0FDFA", text: "#134E4A", accent: "#14B8A6" },
];
// Flat list for backward compat
export const ACCENT_COLORS = COLOR_PALETTES.map(p => p.accent);

export const MAIN_VARIANT_COUNT = 51;
export const SUMMARY_VARIANT_COUNT = 42;
export const CONTACT_VARIANT_COUNT = 40;
export const BRAND_VARIANT_COUNT = 45;

/** Lighten (positive) or darken (negative) a hex color */
export function adjustColor(hex: string, amount: number): string {
    const h = hex.replace("#", "");
    const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h.slice(0, 6);
    const r = Math.max(0, Math.min(255, parseInt(f.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(f.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(f.slice(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function generateConfig(
    profileId: string,
    postTitle: string,
    postSummary: string,
    profileImageCount: number,
    officeImageCount: number
): GenerationConfig {
    const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        profileId,
        postTitle,
        postSummary,
        accentColor: palette.accent,
        secondaryAccent: adjustColor(palette.accent, -25),
        backgroundColor: palette.bg,
        textColor: palette.text,
        mainVariant: Math.floor(Math.random() * MAIN_VARIANT_COUNT),
        summaryVariant: Math.floor(Math.random() * SUMMARY_VARIANT_COUNT),
        contactVariant: Math.floor(Math.random() * CONTACT_VARIANT_COUNT),
        brandVariant: Math.floor(Math.random() * BRAND_VARIANT_COUNT),
        profileImageIndex: Math.floor(Math.random() * Math.max(1, profileImageCount)),
        officeImageIndex: Math.floor(Math.random() * Math.max(1, officeImageCount)),
        overlayOpacity: 0.55 + Math.random() * 0.3,
        createdAt: Date.now(),
    };
}

// localStorage helpers for generated images (24h auto-delete)
const GEN_KEY = "macdee_blog_generations";

export function saveGeneration(config: GenerationConfig): void {
    if (typeof window === "undefined") return;
    const items = getAllGenerations();
    items.push(config);
    localStorage.setItem(GEN_KEY, JSON.stringify(items));
}

export function getAllGenerations(): GenerationConfig[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(GEN_KEY);
    if (!raw) return [];
    try {
        const items: GenerationConfig[] = JSON.parse(raw);
        const now = Date.now();
        const valid = items.filter((i) => now - i.createdAt < 24 * 60 * 60 * 1000);
        if (valid.length !== items.length) {
            localStorage.setItem(GEN_KEY, JSON.stringify(valid));
        }
        return valid;
    } catch {
        return [];
    }
}

export function getGenerationById(id: string): GenerationConfig | null {
    return getAllGenerations().find((i) => i.id === id) || null;
}

export function deleteGeneration(id: string): void {
    if (typeof window === "undefined") return;
    const items = getAllGenerations().filter((i) => i.id !== id);
    localStorage.setItem(GEN_KEY, JSON.stringify(items));
}

export function updateGeneration(id: string, partial: Partial<GenerationConfig>): GenerationConfig | null {
    if (typeof window === "undefined") return null;
    const items = getAllGenerations();
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return null;
    items[idx] = { ...items[idx], ...partial };
    localStorage.setItem(GEN_KEY, JSON.stringify(items));
    return items[idx];
}
