import { contactActions, type ContactAction } from "./blog-images/contact-details";

export function blogPhoneContact(storedPhone: string | null | undefined): ContactAction | null {
    // ProfileManager stores the main number first, followed by optional numbers.
    const mainPhone = (storedPhone || "").split(",")[0].trim().replace(/^(?:대표\s*(?:전화\s*)?번호|대표\s*전화|대표|전화|TEL)\s*[:：]?\s*/i, "");
    return contactActions({ phone: mainPhone, website: "" })[0] || null;
}

export function appendBlogPhoneContact(body: string, contact: ContactAction | null): string {
    if (!body.trim() || !contact) return body;
    const line = `[전화 상담 · 대표번호 ${contact.display}](${contact.href})`;
    if (body.includes(line)) return body;

    const footer = /^---+[ \t]*\r?\n[ \t]*\*\*기준일\*\*/m.exec(body);
    if (footer) {
        return `${body.slice(0, footer.index).trimEnd()}\n\n${line}\n\n${body.slice(footer.index)}`;
    }
    return `${body.trimEnd()}\n\n${line}`;
}
