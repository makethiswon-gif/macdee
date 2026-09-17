/** Complete raster output: preview, download and publishing use the same pixels. */
export const BLOG_CARD_TYPES = ["thumbnail", "illustration", "info", "contact"] as const;
export const PROFILE_CARD_TYPES = ["thumbnail", "info", "contact"] as const;
export const PROFILE_SET_FORMAT = "profile-three-v1" as const;
export const EDITORIAL_SET_FORMAT = "editorial-three-v1" as const;
export function cardTypesFor(value?: { setFormat?: string } | null): readonly BlogCardType[] {
    return value?.setFormat === PROFILE_SET_FORMAT || value?.setFormat === EDITORIAL_SET_FORMAT ? PROFILE_CARD_TYPES : BLOG_CARD_TYPES;
}
export type BlogCardType = typeof BLOG_CARD_TYPES[number];
export type BlogImageQuality = "medium" | "high" | "xhigh";
export type BlogPhotoSource = "ai" | "office";
// Layout upgrades reuse the paid production checkpoint and original artwork.
export const BLOG_LAYOUT_REVISION = 13;
export const EDITORIAL_LAYOUT_REVISION = 24;
export const EDITORIAL_IMAGE_SIZE = 2000;

export interface BlogImageCard {
    type: BlogCardType;
    name: string;
    imageDataUrl: string;
    imageUrl?: string;
    imageHash?: string;
    candidate?: "primary" | "alternate";
    caption?: string;
    aiGenerated?: boolean;
    width: number;
    height: number;
    altText: string;
    placement: string;
    model?: string;
    warnings: string[];
    designVersion: "editorial-v6" | "editorial-v7" | "editorial-v8" | "editorial-v9" | "editorial-v10" | "editorial-v11";
    layoutRevision?: number;
    brandTypography?: { primary: string; source: "logo" | "profile" | "fallback"; protectedRuns: number };
    layoutRecipe?: import("./layout-recipes").LayoutRecipe;
    setFormat?: typeof PROFILE_SET_FORMAT | typeof EDITORIAL_SET_FORMAT | "studio-four-v1";
    proofSelection?: import("./visual-plan-types").ProofSelection;
    proofToken?: string;
    studioPhotos?: import("../lawyer-studio/types").StudioSelection[];
    publicationEdition?: string;
    /** Historical checkpoint metadata only; new images do not receive an AI review. */
    designReview?: { status: "pass" | "revise" | "unavailable"; model: string; score?: number; summary: string; issues: string[];
        repair?: "none" | "layout" | "art" | "content"; attempts?: number };
    releaseToken?: string;
    productionId?: string;
    setId?: string;
    layoutChecks?: { passed: boolean; issues: string[]; textBlocks: number };
    photoChecks?: { source: "art" | "portrait" | "office" | "studio"; width: number; height: number; areaRatio: number; upscale: number };
    contactActions?: { label: string; display: string; href: string }[];
    // Optional, compressed original art permits typography/layout changes without image-model calls.
    artDataUrl?: string;
    artSourceHash?: string;
    artReview?: string;
    sourceParagraphId?: string;
    purpose?: string;
    layout?: "paper" | "contrast";
}

export const CARD_LABELS: Record<BlogCardType, string> = {
    thumbnail: "메인 썸네일", illustration: "본문 시각물", info: "정보 정리", contact: "변호사·상담 안내",
};
export function cardLabel(type: BlogCardType, value?: { setFormat?: string } | null) {
    if (value?.setFormat === EDITORIAL_SET_FORMAT) return ({ thumbnail: "메인 표지", info: "변호사·로펌 신뢰", contact: "상담 연락", illustration: "이전 본문 이미지" })[type];
    if (value?.setFormat === "studio-four-v1") return ({ thumbnail: "메인 표지", illustration: "스튜디오 사진 1", info: "스튜디오 사진 2", contact: "사진·상담 연락" })[type];
    if (value?.setFormat === PROFILE_SET_FORMAT) return type === "info" ? "대표 강점·경력" : type === "thumbnail" ? "메인 표지" : "상담 연락 안내";
    return CARD_LABELS[type];
}

export const CARD_PLACEMENTS: Record<BlogCardType, string> = {
    thumbnail: "제목 아래, 도입 문단 앞",
    illustration: "상황을 설명하는 문단 다음",
    info: "관련 절차·준비사항을 설명한 문단 다음",
    contact: "본문 마지막 요약 다음",
};

export interface EditorialProfile {
    id: string;
    lawyerName: string;
    officeName: string;
    jobTitle: string;
    phone: string;
    website: string;
    brandColor: string;
    /** 두 변호사의 지면 조합이 겹칠 때 관리화면(dna_salt)에서 넣는 조정값.
        같은 사람은 salt 가 같으므로 결정론은 유지된다. */
    dnaSalt?: string;
    designFamily?: import("../blog-strengths").BlogDesignFamily;
    specialty?: string[];
    /** 등록 경력(자랑 경력이 앞에 온다) — 상담 카드에 상위 1~2줄을 표기한다. */
    career?: string[];
    credentialProof?: import("./profile-editions").CredentialProof;
    profileImages: string[];
    officeImages: string[];
    logoImage: string;
}

export interface EditorialCopy {
    heading: string;
    points: string[];
}

/** Avoid sending every uploaded photo on each card request (Vercel body limit). */
export function cardRequestProfile(p: Partial<EditorialProfile>, type: string) {
    return { id: p.id, lawyerName: p.lawyerName, officeName: p.officeName, jobTitle: p.jobTitle,
        phone: p.phone, website: p.website, brandColor: p.brandColor, logoImage: "",
        dnaSalt: p.dnaSalt, designFamily: p.designFamily,
        // 자랑 경력은 상담 카드에만 얹는다 — 심층리서치가 채운 상위 2줄.
        career: type === "contact" ? (p.career || []).filter(Boolean).slice(0, 2) : [],
        // The server reloads registered assets by profile ID. Never shuttle large
        // base64 portraits/logos through each Vercel request.
        profileImages: [], officeImages: [] };
}
