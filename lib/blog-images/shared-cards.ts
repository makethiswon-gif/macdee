// 2·3번 카드(신뢰 사진·상담 연락) 재사용 — 2026-09-28 대표 지시("1번만 생성하고 2,3번은 돌려써도").
//
// 두 카드는 원고 내용과 무관하게 변호사 등록 정보·승인 스튜디오 사진·지면 규격으로만 그려진다.
// 운영 3장 세트 31편 실측: 신뢰 카드는 변호사마다 사실상 1종, 상담 카드는 제목 단어(이혼·형사·재산분할…)에 따라 2~5종이었다.
// 그런데도 원고마다 다시 그리고, 제작 기록(수 MB)과 공개 PNG(장당 1.7~2.2MB)를 새로 저장했다.
//
// 여기서는 그리는 데 쓰이는 입력 전체를 지문(fingerprint)으로 삼는다. 같은 지문이면 처음 만든 PNG 를 그대로 다시 쓰고,
// 처음 나오는 지문(새 제목 단어, 바뀐 전화번호·사진·지면 규격)일 때만 한 번 그린다.
// PNG 는 공개 버킷의 내용 주소(shared/{profileId}/{type}-{pngHash}.png)에 한 번만 올리고 지우지 않는다 — 옛 원고의 링크가 계속 산다.
// 원고별 발행 서명(release)은 매번 새로 발급한다. 원고·세트에 묶인 저장 검증 규칙은 그대로다.
import { createServiceClient } from "@/lib/supabase/server";
import { digest, retryStorage, signImageReleaseForHash, ImageProductionError } from "./production-store";
import { EDITORIAL_IMAGE_SIZE, EDITORIAL_LAYOUT_REVISION, EDITORIAL_SET_FORMAT, type BlogCardType, type BlogImageCard, type EditorialProfile } from "./card-types";
import type { ArticleVisualPlan, PlannedCard } from "./visual-plan-types";
import type { StudioSelection } from "../lawyer-studio/types";
import { editorialContactCopy } from "./three-card-renderer";

/** 지문 규칙이나 카드 메타데이터 형식을 바꾸면 올린다(지면 디자인 변경은 EDITORIAL_LAYOUT_REVISION 이 따로 반영한다). */
export const SHARED_CARD_VERSION = 1;
export type SharedCardType = "info" | "contact";
const PRIVATE = "owner-briefings", PUBLIC = "blog-cards";

export interface SharedCardRecord {
    version: typeof SHARED_CARD_VERSION;
    fingerprint: string;
    profileId: string;
    type: SharedCardType;
    setFormat: typeof EDITORIAL_SET_FORMAT;
    pngHash: string;
    /** 공개 버킷 경로(내용 주소) */
    path: string;
    url: string;
    createdAt: string;
    /** 원고마다 달라지는 값(서명·세트·근거 문단 등)을 뺀 카드 정보 */
    card: Omit<BlogImageCard, "imageDataUrl" | "imageUrl" | "imageHash" | "releaseToken" | "setId" | "productionId" | "artDataUrl" | "artSourceHash"
        | "proofSelection" | "proofToken" | "purpose" | "sourceParagraphId" | "sharedAsset">;
}

const validProfile = (id: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(id);
const recordPath = (profileId: string, name: string) => {
    if (!validProfile(profileId)) throw new ImageProductionError("변호사 ID를 확인해주세요.", 400);
    return `blog-shared-cards/${profileId}/${name}.json`;
};
export const sharedPublicPath = (profileId: string, type: SharedCardType, pngHash: string) => `shared/${profileId}/${type}-${pngHash}.png`;

/** 재사용 대상: 새 3장 세트의 신뢰·상담 카드, 승인 경력 문구가 없는(사진만) 구성. 경력 문구가 들어간 옛 구성은 원고마다 그린다. */
export function isShareableCard(plan: Pick<ArticleVisualPlan, "setFormat" | "proofSelection">, type: BlogCardType): type is SharedCardType {
    return plan.setFormat === EDITORIAL_SET_FORMAT && (type === "info" || type === "contact")
        && plan.proofSelection?.mode === "basic" && !(plan.proofSelection?.claims?.length);
}

export interface SharedCardInput {
    type: SharedCardType;
    profile: EditorialProfile;
    plan: Pick<ArticleVisualPlan, "layoutRecipe" | "publicationEdition" | "proofSelection" | "question" | "cards">;
    card: Pick<PlannedCard, "heading">;
    style?: string;
    /** 승인 스튜디오 사진 선택. 상담 카드에 스튜디오 사진이 없으면 null(등록 사진을 쓴다). */
    selection: StudioSelection[] | null;
}

/** 카드의 픽셀을 결정하는 입력 전체. 원고 본문·해시·발행 서명은 넣지 않는다 — 그래야 원고가 달라도 같은 카드가 된다. */
export function sharedCardFingerprint(input: SharedCardInput): string {
    const { type, plan, card, style, selection } = input;
    // 경력(career)·고정 경력 증빙은 3장 세트에 그리지 않는다. 나머지 등록 정보(이름·사무소·직함·전화·홈페이지·색·로고·등록 사진)는 모두 넣는다.
    const { career: _career, credentialProof: _proof, ...drawn } = input.profile;
    void _career; void _proof;
    return digest(JSON.stringify({
        v: SHARED_CARD_VERSION, type, format: EDITORIAL_SET_FORMAT, layout: EDITORIAL_LAYOUT_REVISION, size: EDITORIAL_IMAGE_SIZE,
        profile: drawn, recipe: plan.layoutRecipe || "photo-open", edition: plan.publicationEdition || "", style: style || "",
        proof: { mode: plan.proofSelection?.mode || "", claims: plan.proofSelection?.claims || [] },
        photo: selection,
        ...(type === "contact" ? { copy: editorialContactCopy(plan, card) } : {}),
    }));
}

async function readJson<T>(file: string): Promise<T | null> {
    const storage = createServiceClient().storage.from(PRIVATE);
    const check = await storage.exists(file);
    if (!check.data) {
        const e = check.error as unknown as { statusCode?: string; status?: number; originalError?: { status?: number } } | null;
        if (check.error && ![400, 404].includes(Number(e?.statusCode || e?.status || e?.originalError?.status))) throw new ImageProductionError("재사용 이미지 기록을 확인하지 못했습니다.");
        return null;
    }
    const { data, error } = await retryStorage(() => storage.download(file));
    if (error || !data || data.size > 200_000) throw new ImageProductionError("재사용 이미지 기록을 읽지 못했습니다.");
    try { return JSON.parse(await data.text()) as T; } catch { return null; }
}

async function publicObjectExists(path: string): Promise<boolean> {
    const { data, error } = await createServiceClient().storage.from(PUBLIC).exists(path);
    if (data === true) return true;
    const e = error as unknown as { statusCode?: string; status?: number; originalError?: { status?: number } } | null;
    if (!error || [400, 404].includes(Number(e?.statusCode || e?.status || e?.originalError?.status))) return false;
    throw new ImageProductionError("재사용 이미지 파일을 확인하지 못했습니다.");
}

function validRecord(record: SharedCardRecord | null, profileId: string, type?: SharedCardType): record is SharedCardRecord {
    return !!record && record.version === SHARED_CARD_VERSION && record.profileId === profileId && record.setFormat === EDITORIAL_SET_FORMAT
        && (!type || record.type === type) && /^[a-f0-9]{64}$/.test(record.pngHash) && record.path === sharedPublicPath(profileId, record.type, record.pngHash)
        && record.card?.layoutChecks?.passed === true && record.card?.designVersion === "editorial-v11";
}

/** 같은 지문의 카드가 있고 공개 파일도 남아 있으면 그 기록. 파일이 지워졌으면 null(다시 그린다). */
export async function findSharedCard(profileId: string, fingerprint: string, type: SharedCardType): Promise<SharedCardRecord | null> {
    if (!/^[a-f0-9]{64}$/.test(fingerprint)) return null;
    const index = await readJson<{ pngHash: string }>(recordPath(profileId, `fp-${fingerprint}`));
    if (!index?.pngHash || !/^[a-f0-9]{64}$/.test(index.pngHash)) return null;
    const record = await readJson<SharedCardRecord>(recordPath(profileId, index.pngHash));
    if (!validRecord(record, profileId, type) || record.fingerprint !== fingerprint) return null;
    return await publicObjectExists(record.path) ? record : null;
}

/** 저장 단계용: 발행 서명에 들어 있는 PNG 해시로 기록을 찾는다(클라이언트가 따로 알려 줄 필요가 없다). */
export async function sharedCardByHash(profileId: string, pngHash: string, type: string): Promise<SharedCardRecord | null> {
    if (!/^[a-f0-9]{64}$/.test(pngHash) || (type !== "info" && type !== "contact")) return null;
    const record = await readJson<SharedCardRecord>(recordPath(profileId, pngHash));
    return validRecord(record, profileId, type) ? record : null;
}

/** 방금 그린 카드를 재사용 기록으로 남긴다. 같은 바이트면 같은 경로라 여러 번 불려도 결과가 같다. */
export async function saveSharedCard(profileId: string, fingerprint: string, card: BlogImageCard): Promise<SharedCardRecord> {
    const type = card.type;
    if (type !== "info" && type !== "contact") throw new ImageProductionError("재사용할 수 없는 이미지 종류입니다.", 400);
    if (!card.layoutChecks?.passed || !card.imageDataUrl?.startsWith("data:image/png;base64,")) throw new ImageProductionError("검사를 통과한 PNG만 재사용 기록으로 남깁니다.", 422);
    const bytes = Buffer.from(card.imageDataUrl.split(",")[1], "base64");
    const pngHash = digest(bytes), path = sharedPublicPath(profileId, type, pngHash);
    const db = createServiceClient();
    const uploaded = await retryStorage(() => db.storage.from(PUBLIC).upload(path, bytes, { contentType: "image/png", upsert: true, cacheControl: "31536000" }));
    if (uploaded.error) throw new ImageProductionError("재사용 이미지를 저장하지 못했습니다. 이번 원고용 이미지는 그대로 쓸 수 있습니다.");
    const { data } = db.storage.from(PUBLIC).getPublicUrl(path);
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const { imageDataUrl, imageUrl, imageHash, releaseToken, setId, productionId, artDataUrl, artSourceHash, proofSelection, proofToken, purpose, sourceParagraphId, sharedAsset, ...kept } = card;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const record: SharedCardRecord = { version: SHARED_CARD_VERSION, fingerprint, profileId, type, setFormat: EDITORIAL_SET_FORMAT, pngHash, path, url: data.publicUrl,
        createdAt: new Date().toISOString(), card: kept };
    const storage = db.storage.from(PRIVATE);
    for (const [file, body] of [[recordPath(profileId, pngHash), record], [recordPath(profileId, `fp-${fingerprint}`), { pngHash, createdAt: record.createdAt }]] as const) {
        const { error } = await retryStorage(() => storage.upload(file, JSON.stringify(body), { contentType: "application/json", upsert: true, cacheControl: "0" }));
        if (error) throw new ImageProductionError("재사용 이미지 기록을 저장하지 못했습니다. 이번 원고용 이미지는 그대로 쓸 수 있습니다.");
    }
    return record;
}

/** 재사용 기록 → 이 원고의 카드. 픽셀은 같고, 서명·세트·근거 문단만 이 원고 것으로 붙인다. */
export function sharedCardForPost(record: SharedCardRecord, post: { profileId: string; sourceHash: string; setId: string; plan: Pick<ArticleVisualPlan, "proofSelection" | "proofToken">;
    planned: Pick<PlannedCard, "purpose" | "afterParagraphId">; reused: boolean }): BlogImageCard {
    return { ...record.card, type: record.type, imageDataUrl: "", imageUrl: record.url, imageHash: record.pngHash,
        setId: post.setId, releaseToken: signImageReleaseForHash(record.pngHash, { profileId: post.profileId, sourceHash: post.sourceHash, type: record.type, setId: post.setId, setFormat: EDITORIAL_SET_FORMAT }),
        proofSelection: post.plan.proofSelection, proofToken: post.plan.proofToken, purpose: post.planned.purpose, sourceParagraphId: post.planned.afterParagraphId,
        sharedAsset: { fingerprint: record.fingerprint, reused: post.reused } };
}

/** 재사용 카드의 PNG 바이트(비자산 전송이나 검증용). */
export async function sharedCardBytes(record: Pick<SharedCardRecord, "path" | "pngHash">): Promise<Buffer> {
    const { data, error } = await retryStorage(() => createServiceClient().storage.from(PUBLIC).download(record.path));
    if (error || !data) throw new ImageProductionError("재사용 이미지 파일을 읽지 못했습니다.");
    const bytes = Buffer.from(await data.arrayBuffer());
    if (digest(bytes) !== record.pngHash) throw new ImageProductionError("재사용 이미지 파일이 기록과 다릅니다. 이미지를 다시 처리해주세요.");
    return bytes;
}
