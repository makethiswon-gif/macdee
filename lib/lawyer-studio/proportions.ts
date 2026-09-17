import { parseProportions, type StudioProportion } from "./types";
import { openCv } from "./opencv";

type OpenCv = typeof import("@techstark/opencv-js");

/** Inverse maps keep every destination pixel filled; feathering fixes the outer boundary. */
export function proportionSourcePoint(x: number, y: number, regions: StudioProportion[]): [number, number] {
    let px = x, py = y;
    for (let i = regions.length - 1; i >= 0; i--) {
        const r = regions[i], cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        const dx = px - cx, dy = py - cy;
        const distance = Math.hypot(dx / (r.width / 2), dy / (r.height / 2));
        if (distance >= 1 || (r.scaleX === 100 && r.scaleY === 100)) continue;
        const t = Math.max(0, (distance - 0.35) / 0.65);
        const weight = 1 - t * t * (3 - 2 * t);
        px = cx + dx / (1 + (r.scaleX / 100 - 1) * weight);
        py = cy + dy / (1 + (r.scaleY / 100 - 1) * weight);
    }
    return [px, py];
}

export async function reshapeStudioPixels(data: Buffer, width: number, height: number, input: StudioProportion[]) {
    const regions = parseProportions(input).filter((r) => r.scaleX !== 100 || r.scaleY !== 100);
    if (!regions.length) return data;
    const { cv } = await openCv();
    const allocated: InstanceType<OpenCv["Mat"]>[] = [];
    try {
        const source = new cv.Mat(height, width, cv.CV_8UC3); allocated.push(source); source.data.set(data);
        const map = new cv.Mat(height, width, cv.CV_32FC2); allocated.push(map);
        const empty = new cv.Mat(); allocated.push(empty);
        const result = new cv.Mat(); allocated.push(result);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const [sx, sy] = proportionSourcePoint(x / (width - 1), y / (height - 1), regions);
            const index = (y * width + x) * 2;
            map.data32F[index] = sx * (width - 1); map.data32F[index + 1] = sy * (height - 1);
        }
        cv.remap(source, result, map, empty, cv.INTER_LINEAR, cv.BORDER_REFLECT_101);
        return Buffer.from(result.data);
    } finally { for (const mat of allocated.reverse()) mat.delete(); }
}
