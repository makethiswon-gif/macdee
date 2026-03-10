// Blog Image Generator v2 — Design System
// Reference: PlusX dark bold Korean typography, photo overlays, accent highlights

export interface BlogProfile {
    id: string;
    lawyerName: string;
    officeName: string;
    phone: string;
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
    mainVariant: number;
    summaryVariant: number;
    contactVariant: number;
    profileImageIndex: number;
    officeImageIndex: number;
    overlayOpacity: number;
    createdAt: number;
}

// 8 curated accent colors
export const ACCENT_COLORS = [
    "#FF3B30", // Red
    "#00C9A7", // Teal
    "#FF6B35", // Coral
    "#7B61FF", // Purple
    "#3B82F6", // Blue
    "#FFB800", // Gold
    "#E91E8C", // Magenta
    "#34D399", // Emerald
];

export const MAIN_VARIANT_COUNT = 10;
export const SUMMARY_VARIANT_COUNT = 10;
export const CONTACT_VARIANT_COUNT = 10;

export function generateConfig(
    profileId: string,
    postTitle: string,
    postSummary: string,
    profileImageCount: number,
    officeImageCount: number
): GenerationConfig {
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        profileId,
        postTitle,
        postSummary,
        accentColor: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
        mainVariant: Math.floor(Math.random() * MAIN_VARIANT_COUNT),
        summaryVariant: Math.floor(Math.random() * SUMMARY_VARIANT_COUNT),
        contactVariant: Math.floor(Math.random() * CONTACT_VARIANT_COUNT),
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
