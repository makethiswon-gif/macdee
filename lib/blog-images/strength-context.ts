import { createServiceClient } from "@/lib/supabase/server";
import { blogPhoneContact } from "@/lib/blog-contact";
import { loadStrengthLibrary, signStrengthSelection, verifyStrengthSelection, StrengthStoreError } from "@/lib/blog-strengths-store";
import { eligibleStrengths, normalizedClaim, reviewStrengths, selectStrengths } from "@/lib/blog-strengths";
import type { EditorialProfile } from "./card-types";

/** Rehydrate registered identity; request bodies cannot supply new public credentials. */
export async function imageStrengthContext(input: Partial<EditorialProfile>, title: string, body: string, token?: unknown) {
    if (!input.id) throw new StrengthStoreError("저장된 변호사 프로필을 선택해주세요.", 400);
    const db = createServiceClient();
    const { data: row, error } = await db.from("blog_profiles").select("*").eq("id", input.id).single();
    if (error || !row) throw new StrengthStoreError("변호사 프로필을 확인하지 못했습니다.", 404);
    const library = await loadStrengthLibrary(input.id, db);
    const phoneContact = blogPhoneContact(row.phone);
    const manuscriptPhones = [...body.matchAll(/\]\((tel:\+?[\d-]+)\)/g)].map((m) => m[1].replace(/-/g, ""));
    if (manuscriptPhones.some((href) => href !== phoneContact?.href)) throw new StrengthStoreError("원고의 전화 링크가 현재 등록된 대표번호와 다릅니다. 연락처를 확인해주세요.", 409);
    let selection = await verifyStrengthSelection(token, input.id, title, body);
    if (!selection) {
        // Standalone images may use only approved wording already present in this manuscript.
        const matched = eligibleStrengths(library).filter((c) => normalizedClaim(body).includes(normalizedClaim(c.articleText))).slice(0, 2);
        selection = selectStrengths(library, `${title} ${body} ${matched.flatMap((c) => c.fields).join(" ")}`, [], matched.map((c) => c.id));
    }
    if (reviewStrengths(body, selection).issues.length) throw new StrengthStoreError("선택한 강점의 원고 문구를 확인해주세요. 누락·중복 상태에서는 이미지를 생성하지 않습니다.", 422);
    const [lawyerName, jobTitle] = String(row.lawyer_name || "").split("||");
    const portrait = Array.isArray(row.profile_images) ? row.profile_images : [];
    const office = Array.isArray(row.office_images) ? row.office_images : [];
    const registeredChoice = (choices: string[], asked: string[] | undefined) => asked?.[0] && choices.includes(asked[0]) ? [asked[0]] : choices.slice(0, 1);
    const profile: EditorialProfile = { id: row.id, lawyerName, jobTitle: jobTitle || "변호사", officeName: row.office_name || "",
        phone: phoneContact?.display || "", website: row.website || "", brandColor: row.brand_color || "", dnaSalt: row.dna_salt || "",
        profileImages: registeredChoice(portrait, input.profileImages), officeImages: registeredChoice(office, input.officeImages), logoImage: row.logo_image || "",
        career: selection.claims.map((c) => c.imageText), designFamily: library.designFamily,
        specialty: Array.isArray(row.specialty) ? row.specialty.filter((s: unknown): s is string => typeof s === "string") : [] };
    return { profile, selection, token: signStrengthSelection(selection, title, body) };
}
