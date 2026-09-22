// 원고별 작업 상태(단계·AI 사용량·사실 확인·본문 이력·표지 브리프).
// blog_posts 테이블에 열을 추가하는 대신 비공개 저장소의 JSON 한 장으로 둔다 — 이 프로젝트의 마이그레이션은 손으로 적용되고,
// 유료 응답·구성안·제작 체크포인트도 같은 저장소에 있다. 원고 본문은 여기 두지 않는다(DB 가 원본).
import { createServiceClient } from "@/lib/supabase/server";
import { retryStorage, ImageProductionError } from "@/lib/blog-images/production-store";
import type { UsageEntry } from "@/lib/blog-usage";
import type { CoverBrief } from "@/lib/blog-cover-brief";

const BUCKET = "owner-briefings";
export type PostStage = "draft" | "review" | "confirmed" | "images" | "done";
export type FactStatus = "unverified" | "verified" | "corrected" | "stale";
export interface FactCheck {
    claim: string;
    status: FactStatus;
    note?: string;
    sourceUrl?: string;
    checkedAt?: string;
    /** 확인 당시 본문 해시. 본문이 바뀌면 확인 상태를 stale 로 내린다. */
    bodyHashAtCheck?: string;
}
export interface BodyVersion { at: string; title: string; body: string; reason: string }
export interface PostState {
    postId: string;
    stage: PostStage;
    updatedAt: string;
    aiUsage: UsageEntry[];
    factChecks: FactCheck[];
    bodyVersions: BodyVersion[];
    coverBrief?: CoverBrief | null;
    /** 브리프를 만든 원고의 본문 해시(참고용). 브리프는 주제에 대한 것이라 본문이 조금 바뀌어도 쓴다. */
    coverBriefBodyHash?: string;
    /** 원고 출처: 추천 주제 / 붙여넣은 글의 재창작 */
    source?: { kind: "topic" | "rewrite"; label: string };
    question?: string;
    thesis?: string;
}

export const validPostId = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(v);
const path = (postId: string) => {
    if (!validPostId(postId)) throw new ImageProductionError("원고 ID를 확인해주세요.", 400);
    return `blog-post-state/${postId}.json`;
};

export function emptyPostState(postId: string): PostState {
    return { postId, stage: "draft", updatedAt: new Date(0).toISOString(), aiUsage: [], factChecks: [], bodyVersions: [] };
}

export async function loadPostState(postId: string): Promise<PostState> {
    const storage = createServiceClient().storage.from(BUCKET);
    const file = path(postId);
    const check = await storage.exists(file);
    if (!check.data) {
        const e = check.error as unknown as { statusCode?: string; originalError?: { status?: number } } | null;
        if (check.error && ![400, 404].includes(Number(e?.statusCode || e?.originalError?.status))) throw new ImageProductionError("원고 작업 상태 저장소에 연결하지 못했습니다.");
        return emptyPostState(postId);
    }
    const { data, error } = await retryStorage(() => storage.download(file));
    if (error || !data || data.size > 5_000_000) throw new ImageProductionError("원고 작업 상태를 읽지 못했습니다.");
    try {
        const saved = JSON.parse(await data.text()) as Partial<PostState>;
        return { ...emptyPostState(postId), ...saved, postId, aiUsage: saved.aiUsage || [], factChecks: saved.factChecks || [], bodyVersions: saved.bodyVersions || [] };
    } catch { return emptyPostState(postId); }
}

/** 읽고-고치고-쓰기. 관리자 한 사람이 쓰는 화면이라 잠금은 두지 않는다. 본문 이력은 최근 20개만 남긴다. */
export async function updatePostState(postId: string, mutate: (state: PostState) => void): Promise<PostState> {
    const state = await loadPostState(postId);
    mutate(state);
    state.postId = postId;
    state.updatedAt = new Date().toISOString();
    state.bodyVersions = state.bodyVersions.slice(-20);
    state.aiUsage = state.aiUsage.slice(-200);
    const { error } = await retryStorage(() => createServiceClient().storage.from(BUCKET)
        .upload(path(postId), JSON.stringify(state), { contentType: "application/json", upsert: true, cacheControl: "0" }));
    if (error) throw new ImageProductionError("원고 작업 상태를 저장하지 못했습니다.");
    return state;
}

/** 유료 호출 뒤 사용량을 원고에 붙인다. 기록 실패가 발행을 막지는 않는다(경고만). */
export async function appendUsage(postId: unknown, entries: UsageEntry[]): Promise<void> {
    if (!validPostId(postId) || !entries.length) return;
    try { await updatePostState(postId, (s) => { s.aiUsage.push(...entries); }); }
    catch (e) { console.warn("[BlogUsage] not recorded:", e instanceof Error ? e.message : "unknown"); }
}
