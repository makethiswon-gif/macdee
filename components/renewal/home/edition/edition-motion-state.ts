const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Resolve entry art before the reader reaches its copy. */
export function editionProgress(top: number, height: number, viewport: number, story: boolean): number {
    if (![top, height, viewport].every(Number.isFinite) || viewport <= 0 || height <= 0) return 1;
    const value = story
        ? (viewport * .16 - top) / Math.max(viewport * .38, height - viewport * .82)
        : (viewport * .96 - top) / (viewport * .55);
    return Math.round(clamp(value) * 1000) / 1000;
}

export function editionHeroProgress(top: number, height: number): number {
    if (!Number.isFinite(top) || !Number.isFinite(height) || height <= 0) return 0;
    return Math.round(clamp((84 - top) / (height * .7)) * 1000) / 1000;
}
