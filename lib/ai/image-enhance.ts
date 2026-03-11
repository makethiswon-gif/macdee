import type Sharp from "sharp";

// ─────────────────────────────────────────
// Film Preset Types
// ─────────────────────────────────────────
export type FilmPreset =
    | "none"
    | "fuji-classic"      // 후지 클래식 크롬 — 차분한 색감, 틸 그림자, 따뜻한 하이라이트
    | "leica-warm"         // 라이카 M — 골든 톤, 깊은 명암, 빈티지 감성
    | "kodak-portra"       // 코닥 포트라 400 — 부드러운 피부톤, 파스텔, 저채도
    | "cinematic"          // 시네마틱 틸&오렌지 — 할리우드 컬러그레이딩
    | "bw-classic"         // 클래식 흑백 — 풍부한 톤 레인지, 깊은 흑
    | "vsco-c1"            // VSCO C1 — 매트한 하이라이트, 페이드 블랙, 따뜻한 톤
    | "fuji-pro400h";      // 후지 PRO400H — 쿨톤 파스텔, 부드러운 그린

export interface FilmPresetInfo {
    id: FilmPreset;
    name: string;
    nameKo: string;
    description: string;
}

export const FILM_PRESETS: FilmPresetInfo[] = [
    { id: "none", name: "Original", nameKo: "원본", description: "보정 없이 원본 사용" },
    { id: "fuji-classic", name: "Fuji Classic Chrome", nameKo: "후지 클래식", description: "차분한 색감에 따뜻한 하이라이트" },
    { id: "leica-warm", name: "Leica M Warm", nameKo: "라이카 웜", description: "골든 톤의 깊은 빈티지 감성" },
    { id: "kodak-portra", name: "Kodak Portra 400", nameKo: "코닥 포트라", description: "부드러운 피부톤, 파스텔 하이라이트" },
    { id: "cinematic", name: "Cinematic T&O", nameKo: "시네마틱", description: "틸 그림자 + 오렌지 하이라이트" },
    { id: "bw-classic", name: "B&W Classic", nameKo: "클래식 흑백", description: "풍부한 톤의 모노크롬" },
    { id: "vsco-c1", name: "VSCO C1", nameKo: "VSCO C1", description: "매트한 페이드 + 따뜻한 톤" },
    { id: "fuji-pro400h", name: "Fuji PRO400H", nameKo: "후지 프로", description: "쿨톤 파스텔, 소프트 그린" },
];

// ─────────────────────────────────────────
// Sharp Film Presets (서버사이드, 비용 0)
// ─────────────────────────────────────────

/**
 * 필름 프리셋을 이미지에 적용합니다.
 * Sharp만 사용하므로 API 비용이 발생하지 않습니다.
 */
export async function applyFilmPreset(base64: string, preset: FilmPreset): Promise<string> {
    if (preset === "none") return base64;

    const sharp = (await import("sharp")).default;
    const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
    if (!match) return base64;

    try {
        const buf = Buffer.from(match[1], "base64");
        let pipeline = sharp(buf);

        switch (preset) {
            case "fuji-classic":
                pipeline = applyFujiClassic(pipeline);
                break;
            case "leica-warm":
                pipeline = applyLeicaWarm(pipeline);
                break;
            case "kodak-portra":
                pipeline = applyKodakPortra(pipeline);
                break;
            case "cinematic":
                pipeline = applyCinematic(pipeline);
                break;
            case "bw-classic":
                pipeline = applyBWClassic(pipeline);
                break;
            case "vsco-c1":
                pipeline = applyVscoC1(pipeline);
                break;
            case "fuji-pro400h":
                pipeline = applyFujiPro400H(pipeline);
                break;
        }

        const result = await pipeline.webp({ quality: 85 }).toBuffer();
        return `data:image/webp;base64,${result.toString("base64")}`;
    } catch (err) {
        console.error("[ImageEnhance] Film preset failed:", err);
        return base64;
    }
}

// ── 후지 클래식 크롬 ──
// 차분하게 잠긴 색감, 틸(청록) 그림자, 따뜻한 하이라이트, 살짝 들린 블랙
function applyFujiClassic(s: Sharp.Sharp): Sharp.Sharp {
    return s
        .recomb([
            [1.06, 0.04, -0.04],   // 약간 따뜻한 레드
            [-0.01, 1.0, 0.07],    // 그린에 틸 가미
            [-0.05, 0.1, 0.88],    // 블루 억제 + 틸 쉬프트
        ])
        .modulate({ saturation: 0.82, brightness: 1.03 })
        .gamma(1.15)                // 그림자 약간 들어올림 (lifted blacks)
        .linear(1.08, -6)          // 약간의 컨트라스트
        .sharpen({ sigma: 0.8 });
}

// ── 라이카 M 웜 ──
// 골든 톤, 풍부한 명암, 약간 디새츄레이션, 깊은 그림자
function applyLeicaWarm(s: Sharp.Sharp): Sharp.Sharp {
    return s
        .recomb([
            [1.12, 0.06, -0.06],   // 강한 골든 레드
            [0.02, 1.02, -0.02],   // 자연스러운 그린
            [-0.08, 0.02, 0.92],   // 블루 억제 → 따뜻함
        ])
        .modulate({ saturation: 0.88, brightness: 1.01 })
        .gamma(0.95)                // 약간 어두운 그림자 (깊은 블랙)
        .linear(1.12, -12)         // 높은 컨트라스트
        .sharpen({ sigma: 1.0 });
}

// ── 코닥 포트라 400 ──
// 부드러운 피부톤, 파스텔 하이라이트, 낮은 컨트라스트, 따뜻한 핑크
function applyKodakPortra(s: Sharp.Sharp): Sharp.Sharp {
    return s
        .recomb([
            [1.05, 0.08, -0.02],   // 따뜻한 레드 + 스킨톤 보정
            [0.01, 1.0, 0.02],     // 자연스러운 그린
            [-0.02, 0.04, 0.96],   // 약간의 블루 유지
        ])
        .modulate({ saturation: 0.78, brightness: 1.06 })
        .gamma(1.2)                 // 크게 들린 그림자 (소프트)
        .linear(0.95, 8)           // 낮은 컨트라스트 + 밝기 보정
        .sharpen({ sigma: 0.5 });
}

// ── 시네마틱 틸 & 오렌지 ──
// 할리우드 컬러그레이딩, 틸 그림자 + 오렌지 하이라이트, 높은 명암
function applyCinematic(s: Sharp.Sharp): Sharp.Sharp {
    return s
        .recomb([
            [1.15, 0.05, -0.08],   // 강한 오렌지 레드
            [-0.05, 1.05, 0.08],   // 틸 그린
            [-0.05, 0.12, 0.85],   // 블루 → 틸 쉬프트
        ])
        .modulate({ saturation: 0.92, brightness: 0.98 })
        .gamma(0.9)                 // 깊은 그림자
        .linear(1.18, -18)         // 매우 높은 컨트라스트
        .sharpen({ sigma: 1.2 });
}

// ── 클래식 흑백 ──
// 풍부한 톤 레인지, 깊은 블랙, 밝은 화이트
function applyBWClassic(s: Sharp.Sharp): Sharp.Sharp {
    return s
        .grayscale()
        .recomb([
            [0.35, 0.50, 0.15],   // 커스텀 B&W 믹스 (레드 강조)
            [0.35, 0.50, 0.15],
            [0.35, 0.50, 0.15],
        ])
        .gamma(0.92)
        .linear(1.15, -10)         // 높은 컨트라스트
        .sharpen({ sigma: 1.0 });
}

// ── VSCO C1 ──
// 매트한 하이라이트, 페이드된 블랙, 따뜻한 톤, 저채도
function applyVscoC1(s: Sharp.Sharp): Sharp.Sharp {
    return s
        .recomb([
            [1.08, 0.06, -0.03],   // 따뜻한 레드
            [0.01, 0.98, 0.04],    // 약간 억제된 그린
            [-0.03, 0.06, 0.93],   // 블루 살짝 빠짐
        ])
        .modulate({ saturation: 0.72, brightness: 1.04 })
        .gamma(1.25)                // 많이 들린 블랙 (매트 페이드)
        .linear(0.92, 12)          // 낮은 컨트라스트 + 밝게
        .sharpen({ sigma: 0.6 });
}

// ── 후지 PRO400H ──
// 쿨톤 파스텔, 부드러운 그린/시안, 밝고 에어리한 느낌
function applyFujiPro400H(s: Sharp.Sharp): Sharp.Sharp {
    return s
        .recomb([
            [0.96, 0.02, 0.02],   // 약간 억제된 레드
            [0.02, 1.06, 0.04],   // 그린 부스트
            [0.01, 0.06, 0.98],   // 시안 틴트
        ])
        .modulate({ saturation: 0.75, brightness: 1.08 })
        .gamma(1.18)                // 들린 그림자
        .linear(0.94, 10)          // 소프트 컨트라스트
        .sharpen({ sigma: 0.5 });
}


// ─────────────────────────────────────────
// AI 배경 제거 (API 비용 발생)
// ─────────────────────────────────────────

/**
 * 프로필 사진에서 배경을 제거합니다.
 * remove.bg API → Replicate rembg 폴백 체인
 *
 * 환경변수:
 * - REMOVE_BG_API_KEY: remove.bg API 키 (우선)
 * - REPLICATE_API_TOKEN: Replicate API 토큰 (폴백)
 */
export async function removeBackground(base64: string): Promise<{ result: string; method: string }> {
    const match = base64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return { result: base64, method: "none" };

    const rawBase64 = match[2];

    // 1차: remove.bg API
    const removeBgKey = process.env.REMOVE_BG_API_KEY;
    if (removeBgKey) {
        try {
            console.log("[ImageEnhance] Trying remove.bg...");
            const res = await fetch("https://api.remove.bg/v1.0/removebg", {
                method: "POST",
                headers: {
                    "X-Api-Key": removeBgKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    image_file_b64: rawBase64,
                    size: "regular",        // 최대 625x400 (무료) / auto (유료)
                    type: "person",          // 인물 최적화
                    format: "png",
                    bg_color: "",            // 투명 배경
                }),
            });

            if (res.ok) {
                const resultBuf = Buffer.from(await res.arrayBuffer());
                const resultBase64 = `data:image/png;base64,${resultBuf.toString("base64")}`;
                console.log("[ImageEnhance] remove.bg success");
                return { result: resultBase64, method: "remove.bg" };
            } else {
                const errText = await res.text();
                console.error("[ImageEnhance] remove.bg error:", res.status, errText);
            }
        } catch (err) {
            console.error("[ImageEnhance] remove.bg failed:", err);
        }
    }

    // 2차: Replicate rembg
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (replicateToken) {
        try {
            console.log("[ImageEnhance] Trying Replicate rembg...");
            const dataUri = `data:image/${match[1]};base64,${rawBase64}`;

            const createRes = await fetch("https://api.replicate.com/v1/predictions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${replicateToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    version: "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
                    input: { image: dataUri },
                }),
            });

            if (createRes.ok) {
                const prediction = await createRes.json();
                let resultUrl = prediction.output;

                // Poll if not completed yet
                if (!resultUrl && prediction.urls?.get) {
                    for (let i = 0; i < 30; i++) {
                        await new Promise(r => setTimeout(r, 2000));
                        const pollRes = await fetch(prediction.urls.get, {
                            headers: { "Authorization": `Bearer ${replicateToken}` },
                        });
                        if (pollRes.ok) {
                            const pollData = await pollRes.json();
                            if (pollData.status === "succeeded") {
                                resultUrl = pollData.output;
                                break;
                            }
                            if (pollData.status === "failed") break;
                        }
                    }
                }

                if (resultUrl) {
                    const imgRes = await fetch(resultUrl);
                    if (imgRes.ok) {
                        const imgBuf = Buffer.from(await imgRes.arrayBuffer());
                        const resultBase64 = `data:image/png;base64,${imgBuf.toString("base64")}`;
                        console.log("[ImageEnhance] Replicate rembg success");
                        return { result: resultBase64, method: "replicate" };
                    }
                }
            }
        } catch (err) {
            console.error("[ImageEnhance] Replicate rembg failed:", err);
        }
    }

    console.warn("[ImageEnhance] No background removal API available");
    return { result: base64, method: "none" };
}


// ─────────────────────────────────────────
// 프로필 사진 배경제거 후 단색/그라데이션 배경 합성
// ─────────────────────────────────────────

/**
 * 배경 제거 후 새로운 배경색으로 합성합니다.
 * 프로필 사진을 더 깔끔하게 만들어줍니다.
 */
export async function removeAndReplaceBg(
    base64: string,
    bgColor?: string,  // 예: "#f0f0f0" 또는 undefined (투명 유지)
): Promise<string> {
    const { result: noBgBase64, method } = await removeBackground(base64);
    if (method === "none") return base64;

    if (!bgColor) return noBgBase64;

    try {
        const sharp = (await import("sharp")).default;
        const match = noBgBase64.match(/^data:image\/\w+;base64,(.+)$/);
        if (!match) return noBgBase64;

        const buf = Buffer.from(match[1], "base64");
        const metadata = await sharp(buf).metadata();
        const w = metadata.width || 400;
        const h = metadata.height || 500;

        // 새 배경 생성
        const bgBuf = await sharp({
            create: { width: w, height: h, channels: 4, background: bgColor },
        }).png().toBuffer();

        // 합성
        const result = await sharp(bgBuf)
            .composite([{ input: buf, gravity: "center" }])
            .webp({ quality: 88 })
            .toBuffer();

        return `data:image/webp;base64,${result.toString("base64")}`;
    } catch (err) {
        console.error("[ImageEnhance] Background replace failed:", err);
        return noBgBase64;
    }
}


// ─────────────────────────────────────────
// 종합 보정: 필름 프리셋 + 배경 제거 + 리사이즈
// ─────────────────────────────────────────

export interface EnhanceOptions {
    filmPreset?: FilmPreset;
    removeBg?: boolean;
    bgColor?: string;          // 배경 제거 시 대체 배경색
    maxWidth?: number;
    maxHeight?: number;
}

/**
 * 이미지 종합 보정 파이프라인
 * 1. (선택) 배경 제거
 * 2. (선택) 필름 프리셋 적용
 * 3. 리사이즈 & 압축
 */
export async function enhanceImage(base64: string, options: EnhanceOptions): Promise<{
    result: string;
    bgRemoved: boolean;
    filmApplied: FilmPreset;
}> {
    let current = base64;
    let bgRemoved = false;

    // Step 1: 배경 제거
    if (options.removeBg) {
        const { result, method } = await removeBackground(current);
        current = result;
        bgRemoved = method !== "none";

        // 배경색으로 대체
        if (bgRemoved && options.bgColor) {
            current = await removeAndReplaceBg(base64, options.bgColor);
        }
    }

    // Step 2: 필름 프리셋
    const preset = options.filmPreset || "none";
    if (preset !== "none") {
        current = await applyFilmPreset(current, preset);
    }

    // Step 3: 리사이즈
    if (options.maxWidth || options.maxHeight) {
        const sharp = (await import("sharp")).default;
        const match = current.match(/^data:image\/\w+;base64,(.+)$/);
        if (match) {
            try {
                const buf = Buffer.from(match[1], "base64");
                const resized = await sharp(buf)
                    .resize(options.maxWidth || undefined, options.maxHeight || undefined, { fit: "cover" })
                    .webp({ quality: 82 })
                    .toBuffer();
                current = `data:image/webp;base64,${resized.toString("base64")}`;
            } catch { /* 실패 시 원본 유지 */ }
        }
    }

    return { result: current, bgRemoved, filmApplied: preset };
}
