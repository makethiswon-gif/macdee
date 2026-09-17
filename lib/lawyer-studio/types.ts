export const STUDIO_MODEL = "gpt-image-2.5-sunburst-2026-09-08";
export const STUDIO_FORMAT = "studio-four-v1";
export const SCENES = { window: "한국 도심 · 창가", desk: "업무 공간 · 서류 검토", stairs: "건축 · 계단", lounge: "라운지 · 사색", studio: "스튜디오 · 인물 촬영", forbes: "포브스 · 잡지 메인" } as const;
export const SHOOT_STYLES = { editorial: "에디토리얼", gq: "GQ 패션화보" } as const;
export const WARDROBES = { suit: "차콜 수트", shirt: "화이트 셔츠", knit: "재킷 · 니트" } as const;
export const MOODS = { documentary: "자연스러운 컬러", muted: "저채도 컬러", monochrome: "흑백 화보" } as const;
export interface StudioOptions {
    scene: keyof typeof SCENES;
    wardrobe: keyof typeof WARDROBES;
    mood: keyof typeof MOODS;
    quality: "xhigh" | "max";
    shootStyle?: keyof typeof SHOOT_STYLES;
    subjectCount?: 1 | 2;
    notes: string;
}
export const DEFAULT_OPTIONS: StudioOptions = { scene: "window", wardrobe: "suit", mood: "documentary", quality: "xhigh", shootStyle: "editorial", notes: "" };
export const STUDIO_SET_SIZE = 5;
export function studioSetScenes(first: StudioOptions["scene"]): StudioOptions["scene"][] {
    return [first, ...(["studio", "window", "desk", "stairs", "lounge", "forbes"] as const).filter(scene => scene !== first)].slice(0, STUDIO_SET_SIZE);
}
export interface StudioBatch {
    id: string; profileId: string; createdAt: string; requestHash: string;
    options: StudioOptions; profileImageIndices: number[]; referenceIds: string[];
    shots: { requestId: string; jobId: string; scene: StudioOptions["scene"]; pose: StudioPose; background: StudioBackground }[];
}
export interface StudioFilters {
    exposure: number; contrast: number; saturation: number; grain: number;
    softness: number; highlights: number; vignette: number; longEdge: number; jpegQuality: number;
}
export interface StudioProportion {
    kind: "head" | "body";
    x: number; y: number; width: number; height: number;
    scaleX: number; scaleY: number;
}
export const PROPORTION_LIMITS = { head: [85, 115], bodyWidth: [90, 110], bodyHeight: [92, 108] } as const;
export const MAX_PROPORTION_REGIONS = 4;
export const FILTER_LIMITS: Record<keyof StudioFilters, readonly [number, number, number]> = {
    exposure: [-1.5, 0.5, 0.05], contrast: [0.8, 1.5, 0.02], saturation: [0, 1.2, 0.05], grain: [0, 30, 1],
    softness: [0, 1.2, 0.1], highlights: [0, 0.65, 0.05], vignette: [0, 0.35, 0.01], longEdge: [1000, 2000, 100], jpegQuality: [75, 96, 1],
};
export const FILTER_PRESETS: Record<string, { label: string; filters: StudioFilters }> = {
    original: { label: "원본", filters: { exposure: 0, contrast: 1, saturation: 1, grain: 0, softness: 0, highlights: 0, vignette: 0, longEdge: 2000, jpegQuality: 96 } },
    color: { label: "컬러 에디토리얼", filters: { exposure: -0.15, contrast: 1.06, saturation: 0.9, grain: 9, softness: 0.2, highlights: 0.15, vignette: 0.04, longEdge: 1600, jpegQuality: 90 } },
    documentary: { label: "흑백 다큐", filters: { exposure: -0.4, contrast: 1.2, saturation: 0, grain: 12, softness: 0.3, highlights: 0.2, vignette: 0.08, longEdge: 1600, jpegQuality: 88 } },
    muted: { label: "저채도 필름", filters: { exposure: -0.2, contrast: 1.08, saturation: 0.7, grain: 10, softness: 0.2, highlights: 0.15, vignette: 0.05, longEdge: 1600, jpegQuality: 90 } },
};
export const studioFiltersForMood = (mood: StudioOptions["mood"]) => FILTER_PRESETS[mood === "monochrome" ? "documentary" : mood === "muted" ? "muted" : "color"].filters;
export type StudioReferencePolicy = "isolated-references-v1" | "editorial-references-v2" | "body-first-references-v3";
export type StudioHeadBalancePolicy = "gentle-head-balance-v1" | "gentle-head-balance-v2";
export interface StudioFramingReview {
    policy: "natural-scale-v3";
    state: "unmeasured" | "review" | "measured";
    faceHeightRatios: number[];
    issues: string[];
}
export interface StudioReference { id: string; role: "identity" | "style"; name: string; path: string }
export interface StudioBackground {
    version: "fresh-background-v1"; scene: StudioOptions["scene"]; settingId: string;
    label: string; seed: string; direction: string;
}
export interface StudioPose {
    version: "independent-shot-v1"; scene: StudioOptions["scene"]; people: 1 | 2;
    poseId: string; cameraId: string; gazeId: string; compositionId: string;
    label: string; direction: string;
}
export interface StudioAsset {
    id: string; createdAt: string; model: string; quality: StudioOptions["quality"]; scene: StudioOptions["scene"];
    originalPath: string; renderedPath: string; filters: StudioFilters; status: "draft" | "approved" | "rejected";
    version: number; width: number; height: number; requestId: string | null; usage?: Record<string, unknown>;
    aiGenerated: true;
    shootStyle?: StudioOptions["shootStyle"];
    subjectCount?: StudioOptions["subjectCount"];
    background?: StudioBackground;
    proportions?: StudioProportion[];
    pose?: StudioPose;
    referencePolicy?: StudioReferencePolicy;
    anatomyPolicy?: "natural-scale-v3";
    framingReview?: StudioFramingReview;
    headBalancePolicy?: StudioHeadBalancePolicy;
}
export interface StudioLibrary { profileId: string; revision: number; updatedAt: string; references: StudioReference[]; assets: StudioAsset[]; blogEnabled: boolean }
export interface StudioJob {
    id: string; profileId: string; createdAt: string; model: typeof STUDIO_MODEL; options: StudioOptions;
    requestHash: string; prompt: string; inputs: { role: "identity" | "body" | "style"; path: string }[];
    filters: StudioFilters;
    background?: StudioBackground;
    pose?: StudioPose;
    referencePolicy?: StudioReferencePolicy;
    styleDirection?: string;
    anatomyPolicy?: "natural-scale-v3";
    headBalancePolicy?: StudioHeadBalancePolicy;
}
export interface StudioSelection { assetId: string; version: number }
export class StudioError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
export const STUDIO_INFO_REQUIRED_MESSAGE = "두 번째 이미지에는 승인된 스튜디오 사진이 필요합니다. 스튜디오 사진 생성기에서 사진을 승인하고 블로그 연결을 켜주세요.";
export const STUDIO_BLOG_DISABLED_MESSAGE = "스튜디오 사진의 블로그 연결이 꺼져 있습니다.";
export const studioLibraryUrl = (profileId: string) => `/admin/lawyer-studio?profileId=${encodeURIComponent(profileId)}&view=library`;
export function studioRecoveryAction(message: string): string | undefined {
    if (message.includes(STUDIO_BLOG_DISABLED_MESSAGE)) return "블로그 연결 설정";
    if (message.includes("승인된 스튜디오 사진이 필요합니다")) return "스튜디오 사진 승인하기";
}
export class StudioPhotoRequiredError extends StudioError {
    readonly code: "studio_approval_required" | "studio_blog_disabled";
    constructor(approvedCount = 0) {
        super(approvedCount > 0 ? `승인된 사진은 ${approvedCount}장 있습니다. ${STUDIO_BLOG_DISABLED_MESSAGE} 스튜디오 사진 생성기 > 사진함에서 '블로그 발행에 승인 사진 사용'을 켜주세요. 사진을 다시 생성하거나 재승인할 필요는 없습니다.` : STUDIO_INFO_REQUIRED_MESSAGE, 422);
        this.code = approvedCount > 0 ? "studio_blog_disabled" : "studio_approval_required";
    }
}
export function parseOptions(value: unknown): StudioOptions {
    if (!value || typeof value !== "object") throw new StudioError("촬영 설정을 확인해주세요.");
    const v = value as StudioOptions;
    if (!Object.hasOwn(SCENES, v.scene) || !Object.hasOwn(WARDROBES, v.wardrobe) || !Object.hasOwn(MOODS, v.mood)
        || (v.shootStyle !== undefined && !Object.hasOwn(SHOOT_STYLES, v.shootStyle))
        || (v.subjectCount !== undefined && ![1, 2].includes(v.subjectCount))
        || !["xhigh", "max"].includes(v.quality) || typeof v.notes !== "string" || v.notes.length > 1200) throw new StudioError("촬영 설정이나 요청 길이를 확인해주세요.");
    // Omit absent style on old requests, preserving their frozen request hash.
    return { scene: v.scene, wardrobe: v.wardrobe, mood: v.mood, quality: v.quality, notes: v.notes.trim(), ...(v.shootStyle !== undefined ? { shootStyle: v.shootStyle } : {}), ...(v.subjectCount !== undefined ? { subjectCount: v.subjectCount } : {}) };
}
export function parseFilters(value: unknown): StudioFilters {
    if (!value || typeof value !== "object") throw new StudioError("보정 설정을 확인해주세요.");
    const result = {} as StudioFilters;
    for (const key of Object.keys(FILTER_LIMITS) as (keyof StudioFilters)[]) {
        const n = (value as StudioFilters)[key], [min, max] = FILTER_LIMITS[key];
        if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max) throw new StudioError(`보정 범위를 확인해주세요: ${key}`);
        result[key] = Math.round(n * 1000) / 1000;
    }
    result.longEdge = Math.round(result.longEdge); result.jpegQuality = Math.round(result.jpegQuality);
    return result;
}
export function studioAssetUrl(profileId: string, assetId: string, version: number, original = false) {
    return `/api/admin/lawyer-studio/asset?profileId=${encodeURIComponent(profileId)}&assetId=${encodeURIComponent(assetId)}&version=${version}${original ? "&original=1" : ""}`;
}
export function parseProportions(value: unknown): StudioProportion[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > MAX_PROPORTION_REGIONS) throw new StudioError("비율 보정 영역은 최대 4개입니다.");
    return value.map((item) => {
        if (!item || typeof item !== "object" || !["head", "body"].includes(item.kind)) throw new StudioError("비율 보정 영역을 확인해주세요.");
        const v = item as StudioProportion;
        for (const key of ["x", "y", "width", "height", "scaleX", "scaleY"] as const) {
            if (typeof v[key] !== "number" || !Number.isFinite(v[key])) throw new StudioError("비율 보정 수치를 확인해주세요.");
        }
        if (v.x < 0 || v.y < 0 || v.width < 0.03 || v.height < 0.03 || v.x + v.width > 1.000001 || v.y + v.height > 1.000001) throw new StudioError("보정 영역은 사진 안에서 지정해주세요.");
        const sx = v.kind === "head" ? PROPORTION_LIMITS.head : PROPORTION_LIMITS.bodyWidth;
        const sy = v.kind === "head" ? PROPORTION_LIMITS.head : PROPORTION_LIMITS.bodyHeight;
        if (v.scaleX < sx[0] || v.scaleX > sx[1] || v.scaleY < sy[0] || v.scaleY > sy[1] || (v.kind === "head" && v.scaleX !== v.scaleY)) throw new StudioError("얼굴·신체 비율 보정 범위를 확인해주세요.");
        return { kind: v.kind, x: v.x, y: v.y, width: v.width, height: v.height, scaleX: v.scaleX, scaleY: v.scaleY };
    });
}
