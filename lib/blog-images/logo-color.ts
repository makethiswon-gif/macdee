// 로고 이미지에서 대표 채도 색상을 추출.
// Sharp으로 raw 픽셀을 읽고 투명·흰색·검정·저채도(회색)를 제외한 뒤
// 32단계로 binning해서 가장 빈도 높은 색상의 평균을 반환.

import sharp from "sharp";

const cache = new Map<string, string | null>();

interface ColorBin {
    rSum: number;
    gSum: number;
    bSum: number;
    count: number;
}

function rgbToHex(r: number, g: number, b: number): string {
    const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export async function extractLogoColor(logoUrl: string): Promise<string | null> {
    if (cache.has(logoUrl)) return cache.get(logoUrl)!;

    try {
        const res = await fetch(logoUrl, { cache: "no-store" });
        if (!res.ok) {
            console.warn(`[LogoColor] fetch failed (${res.status}) for ${logoUrl}`);
            cache.set(logoUrl, null);
            return null;
        }
        const buffer = Buffer.from(await res.arrayBuffer());

        // 작게 리사이즈하고 raw RGBA 픽셀 추출
        const { data } = await sharp(buffer)
            .resize(120, 120, { fit: "inside" })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // 채도 있는 픽셀만 binning
        const bins = new Map<string, ColorBin>();
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // 투명 픽셀 제외
            if (a < 200) continue;

            // 흰색 계열 제외 (배경)
            if (r > 240 && g > 240 && b > 240) continue;
            // 검정 계열 제외 (대부분 윤곽선)
            if (r < 25 && g < 25 && b < 25) continue;

            // 저채도(회색) 제외
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            if (saturation < 0.20) continue;

            // 5-bit binning (32단계, 32^3 = 32768 bins 가능)
            const key = `${r >> 5}_${g >> 5}_${b >> 5}`;
            const cur = bins.get(key);
            if (cur) {
                cur.rSum += r;
                cur.gSum += g;
                cur.bSum += b;
                cur.count++;
            } else {
                bins.set(key, { rSum: r, gSum: g, bSum: b, count: 1 });
            }
        }

        if (bins.size === 0) {
            console.warn(`[LogoColor] no saturated pixels found in ${logoUrl}`);
            cache.set(logoUrl, null);
            return null;
        }

        // 가장 빈도 높은 bin
        let top: ColorBin | null = null;
        for (const entry of bins.values()) {
            if (!top || entry.count > top.count) top = entry;
        }
        if (!top) {
            cache.set(logoUrl, null);
            return null;
        }

        const hex = rgbToHex(top.rSum / top.count, top.gSum / top.count, top.bSum / top.count);
        console.log(`[LogoColor] extracted ${hex} from ${logoUrl} (${top.count} pixels)`);
        cache.set(logoUrl, hex);
        return hex;
    } catch (err) {
        console.error("[LogoColor] extraction failed:", err instanceof Error ? err.message : err);
        cache.set(logoUrl, null);
        return null;
    }
}
