import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { DESIGN_FAMILIES, eligibleStrengths, parseStrength, plain, publicStrength, validProfileId, type StrengthLibrary, type StrengthSelection, type BlogStrength } from "./blog-strengths";

const BUCKET = "owner-briefings";
type Db = ReturnType<typeof createServiceClient>;
export class StrengthStoreError extends Error {
    constructor(message: string, public status = 503) { super(message); }
}
export function emptyLibrary(profileId: string): StrengthLibrary {
    return { profileId, firmId: "", lawyerId: "", revision: 0, updatedAt: "", designFamily: "auto", claims: [] };
}
const folder = (profileId: string) => {
    if (!validProfileId(profileId)) throw new StrengthStoreError("변호사 ID를 확인해주세요.", 400);
    return `blog-strengths/${profileId}`;
};
export async function loadStrengthLibrary(profileId: string, db: Db = createServiceClient()): Promise<StrengthLibrary> {
    const prefix = folder(profileId);
    const { data: files, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1, sortBy: { column: "name", order: "desc" } });
    if (error) throw new StrengthStoreError("공개 강점 저장소를 불러오지 못했습니다.");
    if (!files?.length) return emptyLibrary(profileId);
    const name = files[0].name;
    if (!/^v\d{8}\.json$/.test(name)) throw new StrengthStoreError("강점 버전 파일을 확인해주세요.");
    const { data, error: readError } = await db.storage.from(BUCKET).download(`${prefix}/${name}`);
    if (readError || !data || data.size > 200_000) throw new StrengthStoreError("강점 버전을 읽지 못했습니다.");
    const library = JSON.parse(await data.text()) as StrengthLibrary;
    if (library.profileId !== profileId || library.revision !== Number(name.slice(1, 9)) || !Array.isArray(library.claims)) throw new StrengthStoreError("강점 소유자 또는 버전이 일치하지 않습니다.");
    return library;
}

/** Immutable numbered objects provide conflict detection without a database migration. */
export async function saveStrengthLibrary(value: unknown, db: Db = createServiceClient()): Promise<StrengthLibrary> {
    if (!value || typeof value !== "object") throw new StrengthStoreError("저장 형식을 확인해주세요.", 400);
    const v = value as StrengthLibrary;
    if (typeof v.firmId !== "string" || v.firmId.length > 100) throw new StrengthStoreError("로펌 ID를 확인해주세요.", 400);
    folder(v.profileId);
    if (!Number.isInteger(v.revision) || v.revision < 0 || v.revision >= 99_999_999 || !DESIGN_FAMILIES.includes(v.designFamily) || !Array.isArray(v.claims) || v.claims.length > 40) throw new StrengthStoreError("버전·디자인·강점 개수를 확인해주세요.", 400);
    const { data: profile, error: profileError } = await db.from("blog_profiles").select("id,lawyer_id").eq("id", v.profileId).single();
    if (profileError || !profile) throw new StrengthStoreError("변호사 프로필을 찾을 수 없습니다.", 404);
    if (v.firmId) {
        const { data: firm, error } = await db.from("portal_firms").select("id").eq("id", v.firmId).maybeSingle();
        if (error || !firm) throw new StrengthStoreError("연결할 로펌 ID를 확인해주세요.", 400);
    }
    let claims: BlogStrength[];
    try { claims = v.claims.map(parseStrength); } catch (e) { throw new StrengthStoreError(e instanceof Error ? e.message : "강점 검증 실패", 400); }
    if (new Set(claims.map((c) => c.id)).size !== claims.length || claims.some((c) => c.scope === "firm" && c.status === "approved" && !v.firmId)) throw new StrengthStoreError("강점 ID가 중복되었거나 로펌 연결이 필요합니다.", 400);
    const current = await loadStrengthLibrary(v.profileId, db);
    if (current.revision !== v.revision) throw new StrengthStoreError("다른 창에서 변경됐습니다. 새로고침 후 다시 저장해주세요.", 409);
    // Changing an owner invalidates every prior approval, not merely the visible selection.
    if (current.firmId !== v.firmId && current.revision && claims.some((c) => c.status === "approved")) throw new StrengthStoreError("로펌 연결 변경 시 강점을 확인 필요 상태로 먼저 변경해주세요.", 400);
    const { data: bucket, error: bucketError } = await db.storage.getBucket(BUCKET);
    if (bucketError || !bucket || bucket.public) throw new StrengthStoreError("비공개 owner-briefings 저장소 설정을 확인해주세요.");
    const next: StrengthLibrary = { profileId: v.profileId, firmId: v.firmId || "", lawyerId: profile.lawyer_id || "", revision: v.revision + 1,
        updatedAt: new Date().toISOString(), designFamily: v.designFamily, claims };
    const { error } = await db.storage.from(BUCKET).upload(`${folder(v.profileId)}/v${String(next.revision).padStart(8, "0")}.json`, JSON.stringify(next), {
        contentType: "application/json", cacheControl: "0", upsert: false,
    });
    if (error) throw new StrengthStoreError("저장하지 못했습니다. 다른 창의 변경 여부를 새로고침으로 확인해주세요.", String(error.statusCode) === "409" || error.message === "The resource already exists" ? 409 : 503);
    return next;
}

export async function researchCandidates(firmId: string, db: Db = createServiceClient()) {
    const { data, error } = await db.from("portal_firm_research").select("report,generated_at").eq("firm_id", firmId).maybeSingle();
    if (error) throw new StrengthStoreError("저장된 로펌 리서치를 읽지 못했습니다.");
    const report = data?.report as { strengths?: string[]; sources?: string[] } | undefined;
    return { generatedAt: data?.generated_at || "", sources: (report?.sources || []).filter((s) => typeof s === "string"),
        candidates: (report?.strengths || []).filter((s) => typeof s === "string").map((fact, i) => ({ fact, sourceRef: `portal_firm_research/${firmId}/strengths/${i}` })) };
}

// Tokens carry public projection only; raw sources, quotes, caveats and private notes never enter generation requests.
export interface StrengthEnvelope { selection: StrengthSelection; title: string; bodyHash: string; issuedAt: string }
export const strengthBodyHash = (body: string) => createHash("sha256").update(body).digest("hex");
function signingKey(): string {
    const secret = process.env.ADMIN_TOKEN_SECRET;
    if (!secret) throw new StrengthStoreError("강점 버전 서명 설정을 확인해주세요.");
    return secret;
}
export function signStrengthSelection(selection: StrengthSelection, title: string, body: string): string {
    const payload = Buffer.from(JSON.stringify({ selection, title, bodyHash: strengthBodyHash(body), issuedAt: new Date().toISOString() } satisfies StrengthEnvelope)).toString("base64url");
    return `${payload}.${createHmac("sha256", signingKey()).update(`blog-strengths:${payload}`).digest("hex")}`;
}
export async function verifyStrengthSelection(token: unknown, profileId: string, title: string, body: string): Promise<StrengthSelection | null> {
    if (!token) return null;
    if (typeof token !== "string" || token.length > 20_000) throw new StrengthStoreError("강점 버전 서명이 올바르지 않습니다.", 400);
    const [payload, sig, extra] = token.split(".");
    const expected = createHmac("sha256", signingKey()).update(`blog-strengths:${payload}`).digest("hex");
    if (extra || !/^[a-f0-9]{64}$/.test(sig || "") || !timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) throw new StrengthStoreError("강점 정보가 변경됐습니다. 원고를 다시 확인해주세요.", 400);
    const envelope = JSON.parse(Buffer.from(payload, "base64url").toString()) as StrengthEnvelope;
    if (envelope.selection.profileId !== profileId || envelope.title !== title || envelope.bodyHash !== strengthBodyHash(body)) throw new StrengthStoreError("원고·변호사가 바뀌었습니다. 강점을 다시 확인해주세요.", 409);
    const library = await loadStrengthLibrary(profileId);
    const allowed = eligibleStrengths(library);
    if (library.firmId !== envelope.selection.firmId || library.designFamily !== envelope.selection.designFamily || envelope.selection.claims.some((claim) => !allowed.some((c) => JSON.stringify(publicStrength(c)) === JSON.stringify(claim)))) throw new StrengthStoreError("강점이나 디자인이 변경·만료·철회됐습니다. 새 버전을 확인해주세요.", 409);
    return envelope.selection;
}

export async function recordStrengthUse(profileId: string, postId: string, selection: StrengthSelection, db: Db = createServiceClient(), manuscript?: { title: string; bodyHash: string }) {
    if (!validProfileId(postId) || selection.profileId !== profileId) throw new StrengthStoreError("원고 이력 ID가 일치하지 않습니다.", 400);
    const digest = strengthBodyHash(JSON.stringify({ selection, manuscript }));
    const { error } = await db.storage.from(BUCKET).upload(`blog-strength-usage/${postId}/${digest}.json`, JSON.stringify({ profileId, postId, selection, manuscript, recordedAt: new Date().toISOString() }), { contentType: "application/json", cacheControl: "0", upsert: false });
    if (error && String(error.statusCode) !== "409" && error.message !== "The resource already exists") throw new StrengthStoreError("강점 사용 이력을 저장하지 못했습니다.");
}

export async function briefingCandidates(db: Db = createServiceClient()) {
    const { data, error } = await db.storage.from(BUCKET).download("strategy/latest.json");
    if (error || !data) return [];
    if (data.size > 2_000_000) throw new StrengthStoreError("심층 브리핑 크기를 확인해주세요.");
    const briefing = JSON.parse(await data.text()) as { generatedAt?: string; firms?: { name: string; strengths?: string[] }[] };
    return (briefing.firms || []).map((firm, index) => ({ name: plain(firm.name, 100),
        candidates: (firm.strengths || []).filter((s) => typeof s === "string").map((fact, i) => ({ fact: plain(fact, 400), sourceRef: `strategy/${briefing.generatedAt || "latest"}/firms/${index}/strengths/${i}` })) }));
}

export function legacyCandidates(profile: Record<string, unknown>) {
    const career = String(profile.lawyer_name || "").split("||")[2]?.split(/\n|\\n/) || [];
    return [...career, ...(Array.isArray(profile.brand_lines) ? profile.brand_lines : [])].filter((s): s is string => typeof s === "string" && !!s.trim())
        .map((fact, i) => ({ fact: plain(fact, 400), sourceRef: `blog_profiles/${profile.id}/legacy/${i}` }));
}
