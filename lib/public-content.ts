const NON_PUBLIC_SLUG_PREFIXES = ["test", "demo", "sample", "dev", "qa"];

export function isPublicLawyerSlug(slug: string | null | undefined): slug is string {
    if (!slug) return false;
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return false;

    return !NON_PUBLIC_SLUG_PREFIXES.some((prefix) => (
        normalized === prefix || normalized.startsWith(`${prefix}-`)
    ));
}
