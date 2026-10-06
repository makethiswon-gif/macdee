/** A section settles while its heading reaches the upper third of the viewport. */
export function sectionProgress(top: number, viewport: number): number {
    if (!Number.isFinite(top) || !Number.isFinite(viewport) || viewport <= 0) return 1;
    return Math.round(Math.min(1, Math.max(0, (viewport * .94 - top) / (viewport * .62))) * 1000) / 1000;
}

/** Long graphic tracks run while the complete frame is pinned in view. */
export function storyProgress(top: number, height: number, viewport: number): number {
    if (![top, height, viewport].every(Number.isFinite) || height <= 0 || viewport <= 0) return 1;
    const span = Math.max(viewport * .65, height - viewport * .8);
    return Math.round(Math.min(1, Math.max(0, (viewport * .18 - top) / span)) * 1000) / 1000;
}
