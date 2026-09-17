import type { EditorialProfile } from "./card-types";

export interface ContactAction { label: string; display: string; href: string }
export function contactActions(profile: Pick<EditorialProfile, "phone" | "website">): ContactAction[] {
    const actions: ContactAction[] = [];
    // ProfileManager stores the representative number first, then comma-separated optional numbers.
    // Match the manuscript footer; never concatenate several numbers or retain URI parameters.
    const phone = profile.phone.split(",")[0].trim().replace(/^(?:대표\s*(?:전화\s*)?번호|대표\s*전화|대표|변호사\s*직통|직통|상담\s*(?:전화|번호)|전화|TEL)\s*[:：]?\s*/i, "");
    if (/^\+?[\d\s().-]+$/.test(phone)) {
        const digits = phone.replace(/[^\d+]/g, "");
        if (/^\+?\d{7,15}$/.test(digits)) actions.push({ label: "전화 상담 문의", display: phone, href: `tel:${digits}` });
    }
    const website = profile.website.trim();
    if (website) {
        try {
            const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
            if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password && url.hostname.includes(".") && !/[\s<>]/.test(website)) {
                actions.push({ label: "홈페이지에서 상담 안내 확인", display: website, href: url.href });
            }
        } catch { /* Invalid links are never turned into a CTA. */ }
    }
    return actions;
}

export function contactReadiness(profile: Pick<EditorialProfile, "phone" | "website" | "profileImages">): string[] {
    return [!profile.profileImages[0] ? "변호사 사진" : "", !contactActions(profile).length ? "전화번호 또는 유효한 홈페이지 주소" : ""].filter(Boolean);
}
