/** Complete raster output: preview, download and publishing use the same pixels. */
export const BLOG_CARD_TYPES = ["thumbnail", "illustration", "info", "contact"] as const;
export type BlogCardType = typeof BLOG_CARD_TYPES[number];
export type BlogImageQuality = "medium" | "high";
export type BlogPhotoSource = "ai" | "office";

export interface BlogImageCard {
    type: BlogCardType;
    name: string;
    imageDataUrl: string;
    width: number;
    height: number;
    altText: string;
    placement: string;
    model?: string;
    warnings: string[];
    designVersion: "editorial-v6";
}

export const CARD_LABELS: Record<BlogCardType, string> = {
    thumbnail: "메인 썸네일", illustration: "본문 자료사진", info: "정보 정리", contact: "요약·안내",
};

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
    profileImages: string[];
    officeImages: string[];
    logoImage: string;
}

export interface EditorialCopy {
    heading: string;
    points: string[];
}

/** Avoid sending every uploaded photo on each card request (Vercel body limit). */
export function cardRequestProfile(p: Partial<EditorialProfile>, type: string, photoSource: BlogPhotoSource = "ai") {
    return { id: p.id, lawyerName: p.lawyerName, officeName: p.officeName, jobTitle: p.jobTitle,
        phone: p.phone, website: p.website, brandColor: p.brandColor, logoImage: p.logoImage,
        profileImages: type === "contact" ? p.profileImages?.slice(0, 1) : [],
        officeImages: photoSource === "office" ? p.officeImages?.slice(0, 1) : [] };
}
