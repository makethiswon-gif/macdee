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
}

// 30 Color Palettes — background / text / accent
export interface ColorPalette { bg: string; text: string; accent: string; }
export const COLOR_PALETTES: ColorPalette[] = [
    // Soft Neutral (1-5)
    { bg: "#F5E9DA", text: "#1A1A1A", accent: "#C49A6C" },
    { bg: "#E8DCC8", text: "#222222", accent: "#9C5F3A" },
    { bg: "#D6C6AF", text: "#1F1F1F", accent: "#7A4B2E" },
    { bg: "#C9B79C", text: "#111111", accent: "#5C3822" },
    { bg: "#F0EFEA", text: "#1B1B1B", accent: "#B37A4C" },
    // Dark Navy (6-10)
    { bg: "#0F172A", text: "#FFFFFF", accent: "#C49A6C" },
    { bg: "#111827", text: "#F9FAFB", accent: "#E5B76E" },
    { bg: "#1E293B", text: "#FFFFFF", accent: "#C8A96B" },
    { bg: "#020617", text: "#F8FAFC", accent: "#D4AF37" },
    { bg: "#0B132B", text: "#FFFFFF", accent: "#C49A6C" },
    // Forest Green (11-15)
    { bg: "#1B4332", text: "#FFFFFF", accent: "#D8C3A5" },
    { bg: "#344E41", text: "#FFFFFF", accent: "#EAD7BB" },
    { bg: "#2F3E46", text: "#FFFFFF", accent: "#DDB892" },
    { bg: "#283618", text: "#FFFFFF", accent: "#E9C46A" },
    { bg: "#3A5A40", text: "#FFFFFF", accent: "#F2CC8F" },
    // Light Green (16-20)
    { bg: "#F8F4EC", text: "#1A1A1A", accent: "#7FAE8C" },
    { bg: "#EEE8DF", text: "#1A1A1A", accent: "#3F6F5A" },
    { bg: "#EDEDE9", text: "#1A1A1A", accent: "#588157" },
    { bg: "#F7F7F7", text: "#222222", accent: "#4A7C59" },
    { bg: "#EFEAE4", text: "#1A1A1A", accent: "#6B705C" },
    // Charcoal/Dark (21-25)
    { bg: "#1C1C1C", text: "#FFFFFF", accent: "#B08968" },
    { bg: "#2D2D2D", text: "#FFFFFF", accent: "#C49A6C" },
    { bg: "#383838", text: "#FFFFFF", accent: "#E6B89C" },
    { bg: "#262626", text: "#FFFFFF", accent: "#C8A96B" },
    { bg: "#121212", text: "#FFFFFF", accent: "#D4AF37" },
    // Warm Neutral (26-30)
    { bg: "#FAF7F2", text: "#1A1A1A", accent: "#DDB892" },
    { bg: "#F3EFE6", text: "#1A1A1A", accent: "#A98467" },
    { bg: "#F1EDE5", text: "#1A1A1A", accent: "#6F4E37" },
    { bg: "#EFE6DD", text: "#1A1A1A", accent: "#9C6644" },
    { bg: "#EDE0D4", text: "#1A1A1A", accent: "#7F5539" },
];
// Flat list for backward compat
export const ACCENT_COLORS = COLOR_PALETTES.map(p => p.accent);

export const MAIN_VARIANT_COUNT = 21;
export const SUMMARY_VARIANT_COUNT = 12;
export const CONTACT_VARIANT_COUNT = 10;
export const BRAND_VARIANT_COUNT = 15;

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
