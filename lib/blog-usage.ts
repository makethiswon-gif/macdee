// 블로그 발행 파이프라인의 AI 사용량 기록.
// 유료 응답 자체는 blog-paid-operations/{id}/response.json 에 보존되지만 어느 원고의 것인지 연결이 없었다(2026-09-22 이전).
// 여기서는 응답의 usage 를 한 가지 형태로 정리해 원고별로 붙인다. 재사용(reused)은 새 과금이 아니므로 금액 0으로 적는다.
import { estimateUsd } from "@/lib/ai/pricing";

export type UsageKind = "manuscript" | "cover-plan" | "cover-art" | "edit" | "topics";
export interface UsageEntry {
    at: string;
    kind: UsageKind;
    stage: string;
    model: string;
    operationId?: string;
    /** 저장된 응답을 다시 쓴 경우. 새 과금이 없다. */
    reused: boolean;
    /** 제공자 응답 상태. 2xx 가 아니면 과금 여부를 단정할 수 없다. */
    status?: number;
    input: number;
    cacheRead: number;
    cacheWrite: number;
    output: number;
    thinking: number;
    imageOutput: number;
    elapsedMs: number;
    /** 단가표 기준 추정 USD. 단가 미확인 모델은 null. 재사용·구독은 0. */
    estimatedUsd: number | null;
    /** 클로드 구독(대표 PC 작업기)으로 처리한 호출. API 청구가 없다(2026-09-29). */
    engine?: "subscription";
    note?: string;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Anthropic(messages)과 OpenAI(images) 응답의 usage 를 한 형태로. */
export function usageFromProvider(kind: UsageKind, stage: string, model: string, data: unknown,
    meta: { operationId?: string; reused: boolean; elapsedMs?: number; status?: number; note?: string; engine?: "api" | "subscription" }): UsageEntry {
    const u = (data && typeof data === "object" ? (data as { usage?: Record<string, unknown> }).usage : undefined) || {};
    // 요청한 모델이 아니라 응답이 알려 주는 실제 모델을 쓴다: 모델을 바꾼 뒤 저장된 옛 응답을 재사용해도 기록이 맞다.
    // (OpenAI 이미지 응답에는 model 필드가 없어 전달받은 값을 그대로 쓴다.)
    const answered = data && typeof data === "object" ? (data as { model?: unknown }).model : undefined;
    if (typeof answered === "string" && /^claude-/.test(answered)) model = answered;
    const outDetails = (u.output_tokens_details as Record<string, unknown> | undefined) || {};
    const entry: UsageEntry = {
        at: new Date().toISOString(), kind, stage, model, operationId: meta.operationId, reused: meta.reused, status: meta.status,
        input: num(u.input_tokens), cacheRead: num(u.cache_read_input_tokens), cacheWrite: num(u.cache_creation_input_tokens),
        output: num(u.output_tokens), thinking: num(outDetails.thinking_tokens), imageOutput: num(outDetails.image_tokens),
        elapsedMs: num(meta.elapsedMs), estimatedUsd: null, ...(meta.note ? { note: meta.note } : {}),
        ...(meta.engine === "subscription" ? { engine: "subscription" as const } : {}),
    };
    entry.estimatedUsd = meta.reused || entry.engine === "subscription" ? 0 : estimateUsd(model, entry);
    return entry;
}

export interface UsageSummary {
    count: number; paidCount: number; reusedCount: number;
    /** 클로드 구독으로 처리한 호출 수 — 토큰은 합산하지만 금액은 0. */
    subscriptionCount: number;
    input: number; output: number; thinking: number; imageOutput: number;
    /** 단가를 아는 호출의 합. */
    estimatedUsd: number;
    /** 단가 미확인(이미지 모델 등) 유료 호출 수 — 금액에 빠져 있다. */
    unpricedCount: number;
    byKind: Record<string, { count: number; paidCount: number; estimatedUsd: number }>;
}

export function summarizeUsage(entries: UsageEntry[]): UsageSummary {
    const s: UsageSummary = { count: 0, paidCount: 0, reusedCount: 0, subscriptionCount: 0, input: 0, output: 0, thinking: 0, imageOutput: 0, estimatedUsd: 0, unpricedCount: 0, byKind: {} };
    for (const e of entries) {
        s.count++;
        const k = (s.byKind[e.kind] = s.byKind[e.kind] || { count: 0, paidCount: 0, estimatedUsd: 0 });
        k.count++;
        if (e.reused) { s.reusedCount++; continue; }
        if (e.engine === "subscription") s.subscriptionCount++;
        else { s.paidCount++; k.paidCount++; }
        s.input += e.input + e.cacheRead + e.cacheWrite; s.output += e.output; s.thinking += e.thinking; s.imageOutput += e.imageOutput;
        if (e.estimatedUsd == null) s.unpricedCount++;
        else { s.estimatedUsd += e.estimatedUsd; k.estimatedUsd += e.estimatedUsd; }
    }
    s.estimatedUsd = Math.round(s.estimatedUsd * 10_000) / 10_000;
    return s;
}

export const USAGE_KIND_LABELS: Record<UsageKind, string> = { manuscript: "원고 작성", "cover-plan": "표지 기획", "cover-art": "표지 원본", edit: "부분 수정", topics: "주제 추천" };
