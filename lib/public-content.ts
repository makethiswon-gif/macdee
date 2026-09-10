const NON_PUBLIC_SLUG_PREFIXES = ["test", "demo", "sample", "dev", "qa"];
const OPAQUE_INTERNAL_SLUG = /^[a-f0-9]{8,64}$/;
export const SITE_SYNC_CHANNEL = "macdee" as const;
export const PUBLIC_BLOG_CHANNELS = ["google", SITE_SYNC_CHANNEL] as const;

export function isPublicLawyerSlug(slug: string | null | undefined): slug is string {
    if (!slug) return false;
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return false;
    if (OPAQUE_INTERNAL_SLUG.test(normalized)) return false;

    return !NON_PUBLIC_SLUG_PREFIXES.some((prefix) => (
        normalized === prefix || normalized.startsWith(`${prefix}-`)
    ));
}

export function compactSeoDescription(value: string, maxLength = 160): string {
    const clean = value.replace(/<[^>]*>/g, " ").replace(/[#*_`~]/g, "").replace(/\s+/g, " ").trim();
    if (clean.length <= maxLength) return clean;
    const clipped = clean.slice(0, Math.max(1, maxLength - 1)).trimEnd();
    const wordBreak = clipped.lastIndexOf(" ");
    const text = wordBreak >= Math.floor(maxLength * 0.75) ? clipped.slice(0, wordBreak) : clipped;
    return `${text}…`;
}
