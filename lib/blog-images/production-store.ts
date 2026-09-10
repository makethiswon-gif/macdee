import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import type { ArticleVisualPlan } from "./visual-plan-types";
import type { BlogImageCard } from "./card-types";
import type { VisualBrief } from "./visual-plan-types";

const BUCKET = "owner-briefings";
export class ImageProductionError extends Error {
    constructor(message: string, public status = 503) { super(message); this.name = "ImageProductionError"; }
}
export const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function key() {
    if (!process.env.ADMIN_TOKEN_SECRET) throw new ImageProductionError("이미지 저장 서명 설정을 확인해주세요.");
    return process.env.ADMIN_TOKEN_SECRET;
}
interface Release { version: 11; profileId: string; sourceHash: string; type: string; pngHash: string; setId: string }
export function signImageRelease(card: BlogImageCard, profileId: string, sourceHash: string): string {
    if (!card.layoutChecks?.passed || !card.setId) throw new ImageProductionError("레이아웃 검사를 통과하지 않은 이미지는 저장할 수 없습니다.", 422);
    const payload = Buffer.from(JSON.stringify({ version: 11, profileId, sourceHash, type: card.type,
        pngHash: digest(Buffer.from(card.imageDataUrl.split(",")[1], "base64")), setId: card.setId } satisfies Release)).toString("base64url");
    return `${payload}.${createHmac("sha256", key()).update(`blog-image-release:${payload}`).digest("hex")}`;
}
export function verifyImageRelease(token: unknown, expected: Omit<Release, "version">): boolean {
    if (typeof token !== "string" || token.length > 2048) return false;
    const [payload, sig, extra] = token.split(".");
    if (extra || !/^[a-f0-9]{64}$/.test(sig || "")) return false;
    const signature = createHmac("sha256", key()).update(`blog-image-release:${payload}`).digest();
    if (!timingSafeEqual(signature, Buffer.from(sig, "hex"))) return false;
    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as Release;
        return data.version === 11 && Object.entries(expected).every(([k, v]) => data[k as keyof Release] === v);
    } catch { return false; }
}

export interface ProductionCheckpoint {
    id: string;
    profileId: string;
    sourceHash: string;
    state: "started" | "art" | "rendered" | "complete";
    artDataUrl?: string;
    card?: BlogImageCard;
    updatedAt: string;
    pipelineVersion?: number;
}
const path = (id: string) => {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new ImageProductionError("제작 작업 ID를 확인해주세요.", 400);
    return `blog-image-production/${id}.json`;
};

/** Acquire before a paid call. A lost response cannot silently start a second paid job. */
export async function loadImageProduction(id: string): Promise<ProductionCheckpoint> {
    const { data, error } = await createServiceClient().storage.from(BUCKET).download(path(id));
    if (error || !data || data.size > 30_000_000) throw new ImageProductionError("보존된 이미지 작업을 읽지 못했습니다.");
    const saved = JSON.parse(await data.text()) as ProductionCheckpoint;
    if (saved.id !== id) throw new ImageProductionError("제작 작업이 일치하지 않습니다.");
    return saved;
}
export async function beginImageProduction(id: string, profileId: string, sourceHash: string, resume?: { unpaid: boolean }): Promise<{ checkpoint: ProductionCheckpoint; existing: boolean }> {
    key();
    const db = createServiceClient();
    const { data: bucket, error: bucketError } = await db.storage.getBucket(BUCKET);
    if (bucketError || !bucket || bucket.public) throw new ImageProductionError("이미지 원본용 비공개 저장소를 확인해주세요.");
    const checkpoint: ProductionCheckpoint = { id, profileId, sourceHash, state: "started", updatedAt: new Date().toISOString(), ...(resume ? { pipelineVersion: 12 } : {}) };
    const { error } = await db.storage.from(BUCKET).upload(path(id), JSON.stringify(checkpoint), { contentType: "application/json", upsert: false, cacheControl: "0" });
    if (!error) return { checkpoint, existing: false };
    if (String(error.statusCode) !== "409" && error.message !== "The resource already exists") throw new ImageProductionError("제작 작업을 저장하지 못했습니다. 유료 이미지 요청은 시작하지 않았습니다.");
    const saved = await loadImageProduction(id);
    if (saved.profileId !== profileId || saved.sourceHash !== sourceHash) throw new ImageProductionError("제작 작업의 소유자 또는 원고가 다릅니다.", 409);
    if (saved.state === "started" && !(resume && (resume.unpaid || saved.pipelineVersion === 12))) throw new ImageProductionError("이전 이미지 요청의 응답이 불확실합니다. 새 유료 생성은 차단했습니다. 보존된 작업을 먼저 확인해주세요.", 409);
    return { checkpoint: saved, existing: true };
}
export async function saveImageProduction(checkpoint: ProductionCheckpoint) {
    const { error } = await createServiceClient().storage.from(BUCKET).upload(path(checkpoint.id), JSON.stringify({ ...checkpoint, updatedAt: new Date().toISOString() }), {
        contentType: "application/json", upsert: true, cacheControl: "0",
    });
    if (error) throw new ImageProductionError("생성 결과의 보존에 실패했습니다. 추가 유료 요청은 중단했습니다.");
}

/** Large finished files bypass Vercel JSON response/request limits. */
export async function imageTransport(card: BlogImageCard): Promise<BlogImageCard> {
    if (!card.productionId || !/^[a-f0-9]{64}$/.test(card.productionId)) throw new ImageProductionError("이미지 작업 ID가 없습니다.");
    const bytes = Buffer.from(card.imageDataUrl.split(",")[1], "base64");
    const file = `blog-image-output/${card.productionId}/${digest(bytes)}.png`;
    const storage = createServiceClient().storage.from(BUCKET);
    const { error } = await storage.upload(file, bytes, { contentType: "image/png", upsert: true });
    if (error) throw new ImageProductionError("완성 이미지를 전달할 준비가 되지 않았습니다. 재생성 없이 다시 복구해주세요.");
    const { data, error: signError } = await storage.createSignedUrl(file, 3600);
    if (signError || !data?.signedUrl) throw new ImageProductionError("이미지 다운로드 주소를 확인하지 못했습니다. 다시 복구해주세요.");
    return { ...card, imageDataUrl: "", imageUrl: data.signedUrl, imageHash: digest(bytes), artDataUrl: undefined, designReview: undefined, artReview: undefined };
}

function artReferencePath(profileId: string, sourceHash: string, type: string, art: VisualBrief) {
    const scene = { medium: art.medium, subject: art.subject, scene: art.scene, message: art.message, avoid: art.avoid };
    // Layout, phone, palette and typeface changes do not invalidate an existing scene.
    return `blog-art-index/${digest(JSON.stringify({ profileId, sourceHash, type, scene }))}.json`;
}
export async function preservedArt(profileId: string, sourceHash: string, type: string, art: VisualBrief): Promise<ProductionCheckpoint | null> {
    const storage = createServiceClient().storage.from(BUCKET);
    const file = artReferencePath(profileId, sourceHash, type, art);
    const check = await storage.exists(file);
    if (!check.data) {
        const e = check.error as unknown as { statusCode?: string; originalError?: { status?: number } } | null;
        if (check.error && ![400, 404].includes(Number(e?.statusCode || e?.originalError?.status))) throw new ImageProductionError("기존 원본의 저장 상태를 확인하지 못했습니다. 새 유료 생성은 중단했습니다.");
        return null;
    }
    const { data, error } = await storage.download(file);
    if (error || !data) throw new ImageProductionError("기존 시각물 참조를 읽지 못했습니다. 재생성하지 않고 중단했습니다.");
    const index = JSON.parse(await data.text());
    const saved = await loadImageProduction(index.productionId);
    if (saved.profileId !== profileId || saved.sourceHash !== sourceHash || !saved.artDataUrl) throw new ImageProductionError("보존된 시각물의 소유자 또는 원고가 일치하지 않습니다.");
    return saved;
}
export async function indexPreservedArt(checkpoint: ProductionCheckpoint, type: string, art: VisualBrief) {
    if (!checkpoint.artDataUrl) return;
    const { error } = await createServiceClient().storage.from(BUCKET).upload(artReferencePath(checkpoint.profileId, checkpoint.sourceHash, type, art),
        JSON.stringify({ productionId: checkpoint.id }), { contentType: "application/json", upsert: true, cacheControl: "0" });
    if (error) throw new ImageProductionError("원본 복구 참조를 저장하지 못했습니다. 원본은 보존했으며 다시 복구할 수 있습니다.");
}

export interface VisualHistory { sourceHash: string; motif: string; concept: string; cards: { type: string; treatment?: string; diagram?: string; subject?: string }[] }
const historyFolder = (profileId: string) => {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(profileId)) throw new ImageProductionError("변호사 ID를 확인해주세요.", 400);
    return `blog-visual-history/${profileId}`;
};
export async function recentVisualHistory(profileId: string): Promise<VisualHistory[]> {
    const storage = createServiceClient().storage.from(BUCKET), folder = historyFolder(profileId);
    const { data: files, error } = await storage.list(folder, { limit: 6, sortBy: { column: "name", order: "desc" } });
    if (error) throw new ImageProductionError("최근 이미지 구성 이력을 읽지 못했습니다.");
    const result: VisualHistory[] = [];
    for (const file of files || []) {
        if (!/^\d+-[a-f0-9]+\.json$/.test(file.name)) continue;
        const { data, error: readError } = await storage.download(`${folder}/${file.name}`);
        if (readError || !data || data.size > 20_000) throw new ImageProductionError("이전 이미지 구성의 내용이 확인되지 않습니다.");
        result.push(JSON.parse(await data.text()) as VisualHistory);
    }
    return result;
}
export async function recordVisualPlan(profileId: string, plan: ArticleVisualPlan) {
    const value: VisualHistory = { sourceHash: plan.sourceHash, motif: plan.direction?.motif || "", concept: plan.direction?.concept || "",
        cards: plan.cards.map((c) => ({ type: c.type, treatment: c.treatment, diagram: c.infographic?.kind, subject: c.art?.subject })) };
    const { error } = await createServiceClient().storage.from(BUCKET).upload(`${historyFolder(profileId)}/${Date.now()}-${plan.sourceHash.slice(0, 16)}.json`, JSON.stringify(value), { contentType: "application/json", upsert: false });
    if (error) throw new ImageProductionError("이미지 구성 이력을 저장하지 못했습니다.");
}

export async function cachedVisualPlan(id: string): Promise<ArticleVisualPlan | null> {
    const db = createServiceClient();
    const { data: bucket, error: bucketError } = await db.storage.getBucket(BUCKET);
    if (bucketError || !bucket || bucket.public) throw new ImageProductionError("이미지 구성안의 비공개 저장소를 확인해주세요.");
    if (!/^[a-f0-9]{64}$/.test(id)) throw new ImageProductionError("구성안 ID가 올바르지 않습니다.", 400);
    const storage = db.storage.from(BUCKET);
    const file = `blog-image-plans/${id}.json`;
    // Supabase Storage 2.98 reports a missing private object as an opaque
    // StorageUnknownError with HTTP 400. HEAD/exists is the only reliable
    // distinction between a normal first run and a real cache outage.
    let exists: boolean;
    try {
        const check = await storage.exists(file);
        exists = check.data;
        const error = check.error as unknown as { status?: number; statusCode?: string; originalError?: { status?: number } } | null;
        const status = Number(error?.statusCode || error?.status || error?.originalError?.status);
        if (check.error && ![400, 404].includes(status)) throw check.error;
    }
    catch { throw new ImageProductionError("기존 구성안의 저장 상태를 확인하지 못했습니다. 중복 제작을 막기 위해 잠시 중단합니다."); }
    if (!exists) return null;
    const { data, error } = await storage.download(file);
    if (error || !data || data.size > 200_000) throw new ImageProductionError("기존 구성안을 확인하지 못했습니다. 중복 제작을 막기 위해 잠시 중단합니다.");
    try { return JSON.parse(await data.text()) as ArticleVisualPlan; }
    catch { throw new ImageProductionError("저장된 이미지 구성안이 손상되어 자동 재제작을 중단했습니다."); }
}
export async function saveVisualPlan(id: string, plan: ArticleVisualPlan) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new ImageProductionError("구성안 ID가 올바르지 않습니다.", 400);
    // The caller supplies the manuscript again on recovery; do not duplicate it in storage.
    const { error } = await createServiceClient().storage.from(BUCKET).upload(`blog-image-plans/${id}.json`, JSON.stringify({ ...plan, paragraphs: [], strengthToken: undefined }), {
        contentType: "application/json", cacheControl: "0", upsert: true,
    });
    if (error) throw new ImageProductionError("구성안 복구 정보를 저장하지 못했습니다.");
}
