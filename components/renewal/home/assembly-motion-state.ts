/** A finite assembly, not an always-running ticker. Values are unitless. */
export const ASSEMBLY_DURATION_MS = 2800;

export function clampUnit(value: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function assemblyEase(progress: number): number {
    const p = clampUnit(progress);
    return 1 - Math.pow(1 - p, 3);
}

/** Scrolling can finish the intro early, but never pulls an assembled sheet apart. */
export function assemblyScrollProgress(top: number, height: number): number {
    return assemblyEase(clampUnit(-top / Math.max(1, height * 0.55)));
}
