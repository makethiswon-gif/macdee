/** A section settles while its heading reaches the upper third of the viewport. */
export function sectionProgress(top: number, viewport: number): number {
    if (!Number.isFinite(top) || !Number.isFinite(viewport) || viewport <= 0) return 1;
    return Math.round(Math.min(1, Math.max(0, (viewport * .94 - top) / (viewport * .62))) * 1000) / 1000;
}
