import sharp from "sharp";

/** Prepare a render-only copy. Never overwrite or redraw the registered brand asset. */
export async function prepareMagazineLogo(input: Buffer): Promise<{ bytes: Buffer; lightInk: boolean }> {
    const { data, info } = await sharp(input, { limitInputPixels: 24_000_000 }).rotate()
        .resize(1200, 600, { fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const visited = new Uint8Array(w * h), queue = new Int32Array(w * h);
    let head = 0, tail = 0;
    const add = (i: number) => {
        if (visited[i]) return;
        visited[i] = 1;
        const p = i * 4;
        // Only edge-connected transparent / near-white matte. Enclosed white letterforms stay intact.
        if (data[p + 3] > 8 && Math.min(data[p], data[p + 1], data[p + 2]) < 240) return;
        queue[tail++] = i;
    };
    for (let x = 0; x < w; x++) { add(x); add((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { add(y * w); add(y * w + w - 1); }
    // Already-transparent assets must retain white foreground artwork (e.g. a reversed logo).
    const opaqueEdge = Array.from({ length: w }, (_, x) => data[x * 4 + 3] > 248 && data[((h - 1) * w + x) * 4 + 3] > 248).filter(Boolean).length > w * 0.9;
    if (opaqueEdge) {
        while (head < tail) {
            const i = queue[head++], x = i % w, y = Math.floor(i / w);
            data[i * 4 + 3] = 0;
            if (x) add(i - 1); if (x + 1 < w) add(i + 1);
            if (y) add(i - w); if (y + 1 < h) add(i + w);
        }
    }
    let left = w, right = -1, top = h, bottom = -1, luminance = 0, count = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 32) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        luminance += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; count++;
    }
    if (!count) throw new Error("로고에서 표시할 문양을 찾지 못했습니다.");
    return { bytes: await sharp(data, { raw: { width: w, height: h, channels: 4 } })
        .extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer(),
        lightInk: luminance / count > 190 };
}
