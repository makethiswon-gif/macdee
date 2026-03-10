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
    mainVariant: number;
    summaryVariant: number;
    contactVariant: number;
    brandVariant: number;
    profileImageIndex: number;
    officeImageIndex: number;
    overlayOpacity: number;
    createdAt: number;
}

// 2025 Trend Color Palettes — soft, professional
export const COLOR_PALETTES = [
    // Soft Neutral
    ["#D6C6AF", "#C9B79C", "#B8A48A"],
    ["#F5E9DA", "#E8DCC8", "#D6C6AF"],
    // Warm Brown (2025 핵심 트렌드)
    ["#C49A6C", "#B37A4C", "#9C5F3A"],
    ["#B37A4C", "#7A4B2E", "#5C3822"],
    // Modern Green
    ["#A8C3A0", "#7FAE8C", "#5E8F73"],
    ["#7FAE8C", "#3F6F5A", "#2F5446"],
    // Soft Pastel
    ["#F4B7C3", "#E9A8D4", "#E6E2F3"],
    ["#BFD8F3", "#CDE7D8", "#E6E2F3"],
    // Mixed Warm
    ["#C49A6C", "#A8C3A0", "#F4B7C3"],
    ["#D6C6AF", "#7FAE8C", "#BFD8F3"],
];
// Flat list for backward compat
export const ACCENT_COLORS = COLOR_PALETTES.map(p => p[0]);

export const MAIN_VARIANT_COUNT = 14;
export const SUMMARY_VARIANT_COUNT = 10;
export const CONTACT_VARIANT_COUNT = 10;
export const BRAND_VARIANT_COUNT = 10;

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
        accentColor: palette[0],
        secondaryAccent: palette[1] || palette[0],
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
