// 맥디 블로그 자동 발행 엔진(2026-10-11 대표 지시: 6곳 × 하루 2편, 검수 없이, 생성 이미지).
//
// 크론(app/api/cron/macdee-autopost)이 10분마다 부르고, 한 번 부를 때 일 하나만 한다.
//   1단계 쓰기: 열린 칸 하나를 맡아(uploads 에 표식) 원고를 쓰고 contents 에 비공개(draft)로 저장한다. Sonnet 5.5 high, 보통 3~7분.
//   2단계 검수·발행: 자동 검수자가 광고 규정·사실 위험을 고치거나 보류하고, 기계 점검을 통과하면 표지 사진을 만들어 공개한다.
// 두 단계를 나눈 이유: 함수 한 번의 한도(800초) 안에서 원고(high)와 검수·이미지를 함께 끝내지 못할 수 있다.
//
// 발행 기록은 uploads 한 줄(type memo)이다 — 마이그레이션 없이 기존 표를 쓴다.
//   file_url = "autopost:{변호사 키}:{KST 날짜}:{칸 0|1}:{시도 1|2}"  ← 같은 칸을 두 번 맡지 않게 하는 표식
//   status   = processing(쓰는 중·검수 중) / ready(검수 대기 또는 발행 끝) / failed(실패·보류)
//   structured_data.autopost = 단계·주제·비용·문제 기록
// 공개 글은 contents(channel google — 맥디 블로그 공개 채널, 자주 묻는 질문은 schema_markup 배열 → FAQPage)다.
// 표지 사진 주소는 card_news_data.coverImageUrl(콘텐츠 표지의 기존 자리)에 둔다.

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createServiceClient } from "@/lib/supabase/server";
import { claudeDispatch } from "@/lib/ai/claude-engine";
import { extractClaudeText } from "@/lib/ai/claude-text";
import { SONNET_MODEL, WRITING_EFFORT } from "@/lib/ai/models";
import { estimateUsd } from "@/lib/ai/pricing";
import { makeSlug } from "@/lib/slug";
import { refreshLawyerBlog } from "@/lib/lawyer-blog-cache";
import { submitIndexNow } from "@/lib/indexnow";
import { AUTOPOST_LAWYERS, SLOTS_PER_DAY, focusFor, intentFor, slotOpensAt, type AutopostLawyer } from "./roster";
import {
    ARTICLE_SCHEMA, REVIEW_SCHEMA, REVIEWER_SYSTEM, WRITER_SYSTEM, reviewerUserMessage, writerUserMessage,
    type ReviewResult, type WrittenArticle,
} from "./prompt";

type Db = ReturnType<typeof createServiceClient>;

export interface AutopostDeps {
    db: Db;
    /** Anthropic Messages 요청 → 최종 메시지 JSON 응답(스트리밍은 모아서). */
    claude: (stage: string, body: Record<string, unknown>, timeoutMs: number) => Promise<Response>;
    /** 장면 설명 → 표지 사진(webp). */
    image: (scene: string) => Promise<Buffer>;
    /** 사진 저장 → 공개 주소. */
    upload: (db: Db, lawyerId: string, contentId: string, bytes: Buffer) => Promise<string>;
    refresh: (lawyerId: string, postId: string) => void;
    ping: (urls: string[]) => Promise<unknown>;
    now: () => Date;
    baseUrl: string;
}

export interface RunOptions {
    /** 상태만 보고 아무것도 하지 않는다. */
    dryRun?: boolean;
    /** 이 변호사만, 칸이 열리는 시각을 기다리지 않고(수동 실행·시험). 하루 2편·시도 2번 제한은 그대로다. */
    onlyKey?: string;
}

const MARKER = "autopost";
/** 단계가 이보다 오래 멈춰 있으면 함수가 죽은 것으로 본다(함수 한도 800초 + 여유). */
const STALE_MS = 15 * 60_000;
/** 한 칸에 원고를 몇 번까지 쓰는가(첫 원고가 보류·실패하면 새 주제로 한 번 더). */
const MAX_ATTEMPTS = 2;
/** 검수 호출이 일시 오류로 실패하면 같은 원고로 몇 번까지 다시 검수하는가. */
const MAX_REVIEW_RETRIES = 2;
const QUIET_START = 22 * 60, QUIET_END = 8 * 60;
const WRITER_TIMEOUT_MS = 700_000;
const REVIEWER_TIMEOUT_MS = 300_000;
const MIN_BODY_CHARS = 1_500;

/**
 * 자동 발행은 Sonnet 5.5(원고 high·검수 medium). 화면의 블로그 발행(Opus 5.5 xhigh)과 따로 둔다:
 * 하루 12편이라 비용이 절반이고, 원고가 함수 한도(800초) 안에 여유 있게 끝난다. 시험 원고(이혼 증거)로 품질을 확인했다.
 */
const AUTOPOST_MODEL = SONNET_MODEL;

const KST_MS = 9 * 3_600_000;

export function kstNow(now: Date) {
    const k = new Date(now.getTime() + KST_MS);
    return {
        date: k.toISOString().slice(0, 10),
        minutes: k.getUTCHours() * 60 + k.getUTCMinutes(),
        dayNumber: Math.floor(k.getTime() / 86_400_000),
        label: `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`,
    };
}

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const marker = (key: string, date: string, slot: number, attempt: number) => `${MARKER}:${key}:${date}:${slot}:${attempt}`;

function parseMarker(fileUrl: string | null): { key: string; date: string; slot: number; attempt: number } | null {
    const m = /^autopost:([^:]+):(\d{4}-\d{2}-\d{2}):(\d):(\d)$/.exec(fileUrl || "");
    return m ? { key: m[1], date: m[2], slot: Number(m[3]), attempt: Number(m[4]) } : null;
}

type Stage = "writing" | "written" | "reviewing" | "published" | "held" | "failed";

interface AutopostMeta {
    stage: Stage;
    stageAt: string;
    key: string;
    slot: number;
    attempt: number;
    field: string;
    intent: string;
    contentId?: string;
    primaryKeyword?: string;
    imageScene?: string;
    imageAlt?: string;
    problems?: string[];
    fixesApplied?: number;
    usage?: { stage: string; input: number; output: number; usd: number | null }[];
    error?: string;
    imageError?: string;
    /** 검수 호출이 일시 오류로 실패한 횟수(원고는 그대로 두고 다시 검수한다). */
    reviewRetries?: number;
    url?: string;
}

interface UploadRow {
    id: string;
    lawyer_id: string;
    file_url: string;
    status: string;
    structured_data: { autopost?: AutopostMeta } | null;
    created_at: string;
}

interface LawyerRow {
    id: string;
    name: string;
    slug: string;
    region: string | null;
    office_name: string | null;
}

interface Resolved {
    index: number;
    config: AutopostLawyer;
    lawyer: LawyerRow | null;
}

const meta = (row: UploadRow): AutopostMeta | null => row.structured_data?.autopost ?? null;
const isStale = (m: AutopostMeta | null, now: Date) => !m || now.getTime() - new Date(m.stageAt).getTime() > STALE_MS;

/* ───────────── 상태 ───────────── */

export type SlotState = "waiting" | "writing" | "reviewing" | "published" | "retrying" | "gave-up";

export interface SlotStatus {
    slot: number;
    opensAt: string;
    state: SlotState;
    attempts: number;
    title?: string;
    url?: string;
    problems?: string[];
    error?: string;
}

/** 한 칸의 상태. 발행됨 > 진행 중 > 재시도 가능 > 포기 > 대기 순으로 본다. */
function slotState(rows: UploadRow[], now: Date): { state: SlotState; nextAttempt: number | null; row?: UploadRow } {
    const published = rows.find((r) => meta(r)?.stage === "published");
    if (published) return { state: "published", nextAttempt: null, row: published };
    const live = rows.find((r) => {
        const m = meta(r);
        if (r.status === "ready" && m?.stage === "written") return true;
        return r.status === "processing" && !isStale(m, now);
    });
    if (live) return { state: meta(live)?.stage === "writing" ? "writing" : "reviewing", nextAttempt: null, row: live };
    // 멈춘 검수(원고는 있음)는 다시 검수하면 되므로 진행 중으로 본다.
    const stuckReview = rows.find((r) => r.status === "processing" && meta(r)?.stage === "reviewing" && meta(r)?.contentId);
    if (stuckReview) return { state: "reviewing", nextAttempt: null, row: stuckReview };
    if (!rows.length) return { state: "waiting", nextAttempt: 1 };
    const used = Math.max(...rows.map((r) => parseMarker(r.file_url)?.attempt ?? 0));
    const last = rows.find((r) => parseMarker(r.file_url)?.attempt === used);
    return used >= MAX_ATTEMPTS ? { state: "gave-up", nextAttempt: null, row: last } : { state: "retrying", nextAttempt: used + 1, row: last };
}

async function loadToday(db: Db, date: string): Promise<UploadRow[]> {
    const { data, error } = await db.from("uploads")
        .select("id, lawyer_id, file_url, status, structured_data, created_at")
        .like("file_url", `${MARKER}:%:${date}:%`);
    if (error) throw new Error(`오늘 발행 기록을 읽지 못했습니다: ${error.message}`);
    return (data ?? []) as UploadRow[];
}

async function resolveLawyers(db: Db): Promise<Resolved[]> {
    const slugs = AUTOPOST_LAWYERS.map((l) => l.slug);
    const { data, error } = await db.from("lawyers").select("id, name, slug, region, office_name").in("slug", slugs);
    if (error) throw new Error(`변호사 정보를 읽지 못했습니다: ${error.message}`);
    const rows = (data ?? []) as LawyerRow[];
    return AUTOPOST_LAWYERS.map((config, index) => ({ index, config, lawyer: rows.find((r) => r.slug === config.slug) ?? null }));
}

const postUrl = (baseUrl: string, lawyerSlug: string, postSlug: string) => `${baseUrl}/blog/${lawyerSlug}/${encodeURIComponent(postSlug)}`;

/* ───────────── 실행 ───────────── */

export interface RunResult {
    date: string;
    time: string;
    did: string;
    detail?: Record<string, unknown>;
    lawyers: { key: string; label: string; found: boolean; paused: boolean; slots: SlotStatus[] }[];
}

export async function runAutopost(deps: AutopostDeps, options: RunOptions = {}): Promise<RunResult> {
    const now = deps.now();
    const k = kstNow(now);
    const [resolved, today] = await Promise.all([resolveLawyers(deps.db), loadToday(deps.db, k.date)]);

    const status = async () => {
        const contentIds = today.map((r) => meta(r)?.contentId).filter((id): id is string => !!id);
        const titles = new Map<string, { title: string; slug: string | null }>();
        if (contentIds.length) {
            const { data } = await deps.db.from("contents").select("id, title, slug").in("id", contentIds);
            for (const row of (data ?? []) as { id: string; title: string; slug: string | null }[]) titles.set(row.id, row);
        }
        return resolved.map(({ index, config, lawyer }) => ({
            key: config.key,
            label: lawyer ? `${lawyer.name} 변호사 · ${lawyer.office_name || "사무소 미등록"}` : config.label,
            found: !!lawyer,
            paused: !!config.paused,
            slots: Array.from({ length: SLOTS_PER_DAY }, (_, slot): SlotStatus => {
                const rows = today.filter((r) => { const p = parseMarker(r.file_url); return p?.key === config.key && p.slot === slot; });
                const s = slotState(rows, now);
                const m = s.row ? meta(s.row) : null;
                const content = m?.contentId ? titles.get(m.contentId) : undefined;
                return {
                    slot, opensAt: hhmm(slotOpensAt(index, slot)), state: s.state, attempts: rows.length,
                    ...(content ? { title: content.title } : {}),
                    ...(m?.url ? { url: m.url } : {}),
                    ...(m?.problems?.length ? { problems: m.problems } : {}),
                    ...(m?.error ? { error: m.error } : {}),
                };
            }),
        }));
    };
    const finish = async (did: string, detail?: Record<string, unknown>): Promise<RunResult> =>
        ({ date: k.date, time: hhmm(k.minutes), did, ...(detail ? { detail } : {}), lawyers: await status() });

    if (options.dryRun) return finish("dry-run");
    if (process.env.MACDEE_AUTOPOST_DISABLED === "true") return finish("disabled");
    if (!options.onlyKey && (k.minutes >= QUIET_START || k.minutes < QUIET_END)) return finish("quiet-hours");

    const eligible = resolved.filter((r) => r.lawyer && !r.config.paused && (!options.onlyKey || r.config.key === options.onlyKey));
    if (options.onlyKey && !eligible.length) return finish("unknown-or-unavailable-lawyer", { key: options.onlyKey });

    // ① 검수·발행이 남은 원고부터 끝낸다(쓴 지 오래된 것부터).
    const pending = today
        .filter((r) => eligible.some((e) => e.config.key === parseMarker(r.file_url)?.key))
        .filter((r) => {
            const m = meta(r);
            if (!m?.contentId) return false;
            return (r.status === "ready" && m.stage === "written") || (r.status === "processing" && m.stage === "reviewing" && isStale(m, now));
        })
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const row of pending) {
        const target = eligible.find((e) => e.config.key === parseMarker(row.file_url)?.key)!;
        const claimed = await claim(deps.db, row, "reviewing", now);
        if (!claimed) continue;
        const detail = await reviewAndPublish(deps, target, claimed, k);
        return finish("review-publish", detail);
    }

    // ② 멈춘 쓰기는 실패로 정리한다(그 칸은 다음 시도로 넘어간다).
    for (const row of today) {
        const m = meta(row);
        if (row.status === "processing" && m?.stage === "writing" && isStale(m, now)) {
            await setMeta(deps.db, row, { ...m, stage: "failed", stageAt: now.toISOString(), error: m.error || "쓰기 단계가 시간 안에 끝나지 않았습니다." }, "failed");
            row.status = "failed";
            row.structured_data = { autopost: { ...m, stage: "failed" } };
        }
    }

    // ③ 열린 칸 중 가장 먼저 열린 칸 하나에 원고를 쓴다.
    const candidates: { target: Resolved; slot: number; attempt: number; opensAt: number }[] = [];
    for (const target of eligible) {
        for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
            const opensAt = slotOpensAt(target.index, slot);
            if (!options.onlyKey && k.minutes < opensAt) continue;
            const rows = today.filter((r) => { const p = parseMarker(r.file_url); return p?.key === target.config.key && p.slot === slot; });
            const s = slotState(rows, now);
            if (s.nextAttempt) candidates.push({ target, slot, attempt: s.nextAttempt, opensAt });
        }
    }
    candidates.sort((a, b) => a.opensAt - b.opensAt || a.target.index - b.target.index);
    const next = candidates[0];
    if (!next) return finish("nothing-due");

    const detail = await writeDraft(deps, next.target, next.slot, next.attempt, k, now);
    return finish("write", detail);
}

/* ───────────── 단계 공통 ───────────── */

async function setMeta(db: Db, row: Pick<UploadRow, "id">, m: AutopostMeta, status?: string) {
    const { error } = await db.from("uploads").update({ structured_data: { autopost: m }, ...(status ? { status } : {}) }).eq("id", row.id);
    if (error) throw new Error(`발행 기록을 고치지 못했습니다: ${error.message}`);
}

/** 다음 단계를 맡는다. 다른 실행이 먼저 맡았으면 null. */
async function claim(db: Db, row: UploadRow, stage: Stage, now: Date): Promise<UploadRow | null> {
    const m = meta(row);
    if (!m) return null;
    const next: AutopostMeta = { ...m, stage, stageAt: now.toISOString() };
    const { data, error } = await db.from("uploads")
        .update({ status: "processing", structured_data: { autopost: next } })
        .eq("id", row.id)
        .eq("status", row.status)
        .select("id");
    if (error || !data || !(data as unknown[]).length) return null;
    return { ...row, status: "processing", structured_data: { autopost: next } };
}

interface Usage { stage: string; input: number; output: number; usd: number | null }

async function askJson<T>(deps: AutopostDeps, stage: string, system: string, user: string, schema: object, effort: string, maxTokens: number, timeoutMs: number): Promise<{ data: T; usage: Usage }> {
    const response = await deps.claude(stage, {
        model: AUTOPOST_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { effort, format: { type: "json_schema", schema } },
    }, timeoutMs);
    const json = await response.json().catch(() => null) as { stop_reason?: string; usage?: Record<string, number>; error?: { message?: string } } | null;
    if (!response.ok || !json) throw new Error(`${stage} 호출 실패(${response.status}): ${json?.error?.message || "응답 없음"}`);
    if (json.stop_reason === "refusal") throw new Error(`${stage}: 모델이 이 주제의 작성을 거절했습니다.`);
    if (json.stop_reason === "max_tokens") throw new Error(`${stage}: 출력 한도에서 끊겼습니다.`);
    const u = json.usage || {};
    const usage: Usage = {
        stage,
        input: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0),
        output: u.output_tokens || 0,
        usd: estimateUsd(AUTOPOST_MODEL, { input: u.input_tokens || 0, cacheRead: u.cache_read_input_tokens || 0, cacheWrite: u.cache_creation_input_tokens || 0, output: u.output_tokens || 0 }),
    };
    const text = extractClaudeText(json as Parameters<typeof extractClaudeText>[0]).trim();
    try {
        return { data: JSON.parse(text) as T, usage };
    } catch {
        throw new Error(`${stage}: JSON 이 아닌 응답입니다.`);
    }
}

/* ───────────── 1단계: 쓰기 ───────────── */

async function writeDraft(deps: AutopostDeps, target: Resolved, slot: number, attempt: number, k: ReturnType<typeof kstNow>, now: Date): Promise<Record<string, unknown>> {
    const lawyer = target.lawyer!;
    const focus = focusFor(target.config, k.dayNumber + attempt - 1, slot);
    const intent = intentFor(k.dayNumber + attempt - 1, target.index, slot);
    const fileUrl = marker(target.config.key, k.date, slot, attempt);
    const base: AutopostMeta = { stage: "writing", stageAt: now.toISOString(), key: target.config.key, slot, attempt, field: focus.field, intent };

    // 칸을 먼저 맡는다(같은 칸을 두 실행이 쓰지 않게). 같은 표식이 둘이면 먼저 만든 쪽만 남는다.
    const { data: inserted, error: insertError } = await deps.db.from("uploads").insert({
        lawyer_id: lawyer.id, type: "memo", title: `[자동 발행] ${focus.field}`, file_url: fileUrl, raw_text: intent, status: "processing",
        structured_data: { autopost: base },
    }).select("id, created_at").single();
    if (insertError || !inserted) throw new Error(`칸을 맡지 못했습니다: ${insertError?.message || "알 수 없음"}`);
    const row = { id: (inserted as { id: string }).id };
    const { data: twins } = await deps.db.from("uploads").select("id, created_at").eq("file_url", fileUrl);
    const first = ((twins ?? []) as { id: string; created_at: string }[]).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))[0];
    if (first && first.id !== row.id) {
        await deps.db.from("uploads").delete().eq("id", row.id);
        return { skipped: "다른 실행이 같은 칸을 먼저 맡았습니다.", key: target.config.key, slot };
    }

    try {
        const { data: recent } = await deps.db.from("contents").select("title").eq("lawyer_id", lawyer.id).order("created_at", { ascending: false }).limit(120);
        const recentTitles = [...new Set(((recent ?? []) as { title: string }[]).map((r) => r.title).filter(Boolean))];

        const { data: article, usage } = await askJson<WrittenArticle>(deps, "자동 발행 원고", WRITER_SYSTEM, writerUserMessage({
            lawyerName: lawyer.name, officeName: lawyer.office_name || "", area: target.config.area || lawyer.region || "",
            field: focus.field, seeds: focus.seeds, intent, audience: target.config.audience, recentTitles, todayLabel: k.label,
        }), ARTICLE_SCHEMA, WRITING_EFFORT, 64_000, WRITER_TIMEOUT_MS);
        const problem = articleProblem(article, recentTitles);
        if (problem) throw new Error(problem);

        const contentId = randomUUID();
        const draft = composeContent(article, k.label);
        const { error: contentError } = await deps.db.from("contents").insert({
            id: contentId, upload_id: row.id, lawyer_id: lawyer.id, channel: "google",
            title: draft.title, slug: makeSlug(draft.title, contentId), body: draft.body, meta_description: draft.meta,
            tags: draft.tags, schema_markup: draft.faq, status: "draft",
            card_news_data: { imagePrompt: article.image_scene, coverAlt: article.image_alt },
        });
        if (contentError) throw new Error(`원고를 저장하지 못했습니다: ${contentError.message}`);

        await setMeta(deps.db, row, {
            ...base, stage: "written", stageAt: deps.now().toISOString(), contentId, primaryKeyword: article.primary_keyword,
            imageScene: article.image_scene, imageAlt: article.image_alt, usage: [usage],
        }, "ready");
        return { key: target.config.key, slot, attempt, field: focus.field, title: draft.title, contentId, usd: usage.usd };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await setMeta(deps.db, row, { ...base, stage: "failed", stageAt: deps.now().toISOString(), error: message.slice(0, 500) }, "failed").catch(() => {});
        return { key: target.config.key, slot, attempt, error: message };
    }
}

const norm = (s: string) => s.replace(/[\s?!.,·:'"“”‘’()\-]/g, "").toLowerCase();

/** 저장 전에 거르는 형식 문제. 문제가 있으면 그 설명, 없으면 null. */
export function articleProblem(a: WrittenArticle, recentTitles: string[]): string | null {
    if (!a || typeof a.title !== "string" || typeof a.body !== "string") return "원고 형식이 맞지 않습니다.";
    if (!a.title.trim() || !a.answer_summary?.trim()) return "제목이나 요약이 비었습니다.";
    if (a.body.replace(/\s/g, "").length < MIN_BODY_CHARS) return `본문이 너무 짧습니다(공백 제외 ${a.body.replace(/\s/g, "").length}자).`;
    if ((a.body.match(/^## /gm) || []).length < 3) return "소제목(##)이 3개 미만입니다.";
    if (recentTitles.some((t) => norm(t) === norm(a.title))) return "이미 있는 글과 제목이 같습니다.";
    return null;
}

/** 원고 JSON → 맥디 블로그 글(요약 → 본문 → 자주 묻는 질문 → 기준일). */
export function composeContent(a: WrittenArticle, todayLabel: string) {
    const cleanBody = a.body
        .replace(/\r\n/g, "\n")
        .replace(/==(.+?)==/g, "**$1**")
        .replace(/__(.+?)__/g, "$1")
        .split("\n")
        .filter((line) => !/^#\s/.test(line) && !/^\s*[-*_]{3,}\s*$/.test(line) && !/^!\[/.test(line))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const faq = (a.faq || []).filter((f) => f?.q?.trim() && f?.a?.trim()).slice(0, 5).map((f) => ({ q: f.q.trim(), a: f.a.trim() }));
    const body = [
        a.answer_summary.trim(),
        cleanBody,
        ...(faq.length ? ["## 자주 묻는 질문", ...faq.map((f) => `### ${f.q}\n${f.a}`)] : []),
        `*${todayLabel} 기준 법령과 실무를 바탕으로 한 일반 정보입니다. 구체적인 사건은 사실관계에 따라 결론이 달라질 수 있습니다.*`,
    ].join("\n\n");
    const tags = [...new Set([a.primary_keyword, ...(a.keywords || [])].map((t) => (t || "").trim()).filter((t) => t && t.length <= 30))].slice(0, 8);
    const meta = (a.meta_description || "").trim().slice(0, 155);
    return { title: a.title.trim(), body, meta, tags, faq };
}

/* ───────────── 2단계: 검수·발행 ───────────── */

/** 사람이 보지 않으므로, 검수자 뒤에도 남으면 공개하지 않는 표현(변호사 광고 규정). */
const AD_RISK: { label: string; pattern: RegExp }[] = [
    { label: "'전문' 표기", pattern: /전문\s*(?:변호사|로펌|법무법인|법률사무소)|(?:변호사|로펌|법무법인|사무소)(?:는|가|이|의)?\s*[^\s.\n]{0,8}\s*전문(?:입니다|으로|가|분야)/ },
    { label: "결과 보장", pattern: /승소\s*(?:보장|확률|율)|무조건\s*(?:승소|이깁|해결|무죄)|100\s*%\s*(?:승소|보장|해결|무죄)|반드시\s*(?:승소|이깁|무죄)/ },
    { label: "비교·최상급", pattern: /업계\s*(?:1위|최고)|최고의\s*(?:변호사|로펌)|국내\s*(?:1위|유일)|유일한\s*(?:변호사|로펌)/ },
    { label: "무료·할인", pattern: /무료\s*(?:상담|법률\s*상담)|수임료\s*할인|착수금\s*\d|수임료\s*\d|성공보수\s*\d/ },
    { label: "실제 사례·후기", pattern: /실제\s*(?:의뢰인|수임)\s*사례|의뢰인\s*후기|제가\s*(?:맡았던|수임한|승소한)/ },
];

export function adRisks(text: string): string[] {
    return AD_RISK.filter((r) => r.pattern.test(text)).map((r) => r.label);
}

/** 검수자의 고침을 그대로 적용한다. 원문에 없는 before 는 건너뛴다. */
export function applyFixes(fields: { title: string; meta: string; body: string; faq: { q: string; a: string }[] }, fixes: ReviewResult["fixes"]) {
    let applied = 0, hit = false;
    const replace = (text: string, before: string, after: string) => {
        if (!before || !text.includes(before)) return text;
        hit = true;
        return text.split(before).join(after);
    };
    let { title, meta, body } = fields;
    let faq = fields.faq.map((f) => ({ ...f }));
    for (const fix of fixes || []) {
        const before = fix?.before ?? "", after = fix?.after ?? "";
        if (!before.trim()) continue;
        hit = false;
        title = replace(title, before, after);
        meta = replace(meta, before, after);
        body = replace(body, before, after);
        faq = faq.map((f) => ({ q: replace(f.q, before, after), a: replace(f.a, before, after) }));
        if (hit) applied++;
    }
    body = body.replace(/\n{3,}/g, "\n\n");
    return { title: title.trim(), meta: meta.trim(), body, faq: faq.filter((f) => f.q.trim() && f.a.trim()), applied };
}

async function reviewAndPublish(deps: AutopostDeps, target: Resolved, row: UploadRow, k: ReturnType<typeof kstNow>): Promise<Record<string, unknown>> {
    const lawyer = target.lawyer!;
    const m = meta(row)!;
    const contentId = m.contentId!;
    // 보류·실패한 원고는 공개하지 않는다(status failed — 관리 화면에서 사유와 함께 볼 수 있다).
    const fail = async (stage: "held" | "failed", message: string, extra: Partial<AutopostMeta> = {}) => {
        await deps.db.from("contents").update({ status: "failed", updated_at: deps.now().toISOString() }).eq("id", contentId);
        await setMeta(deps.db, row, { ...m, ...extra, stage, stageAt: deps.now().toISOString(), error: message.slice(0, 500) }, "failed").catch(() => {});
        return { key: target.config.key, slot: m.slot, contentId, [stage]: message };
    };

    const { data: content, error } = await deps.db.from("contents").select("id, title, body, meta_description, tags, schema_markup, card_news_data").eq("id", contentId).maybeSingle();
    if (error || !content) return fail("failed", `원고를 읽지 못했습니다: ${error?.message || "없음"}`);
    const c = content as { title: string; body: string; meta_description: string | null; tags: string[] | null; schema_markup: { q: string; a: string }[] | null; card_news_data: Record<string, unknown> | null };

    // 검수자는 요약·본문을 나눠 받는다(요약은 본문 첫 문단). 자주 묻는 질문은 schema_markup 에서.
    const faq = Array.isArray(c.schema_markup) ? c.schema_markup : [];
    const [summary, ...rest] = c.body.split("\n\n");
    const review = await askJson<ReviewResult>(deps, "자동 발행 검수", REVIEWER_SYSTEM, reviewerUserMessage(
        `${lawyer.name} 변호사 · ${lawyer.office_name || ""} · ${target.config.area || lawyer.region || ""}`, k.label,
        { title: c.title, meta_description: c.meta_description || "", answer_summary: summary, body: rest.join("\n\n"), faq, primary_keyword: m.primaryKeyword || "", keywords: c.tags || [], image_scene: m.imageScene || "", image_alt: m.imageAlt || "" },
    ), REVIEW_SCHEMA, "medium", 16_000, REVIEWER_TIMEOUT_MS).catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));
    if ("error" in review) {
        const retries = (m.reviewRetries || 0) + 1;
        if (retries > MAX_REVIEW_RETRIES) return fail("failed", review.error);
        await setMeta(deps.db, row, { ...m, stage: "written", stageAt: deps.now().toISOString(), reviewRetries: retries, error: review.error.slice(0, 500) }, "ready");
        return { key: target.config.key, slot: m.slot, contentId, retryReview: review.error };
    }

    const usage = [...(m.usage || []), review.usage];
    const problems = (review.data.problems || []).slice(0, 12);
    if (review.data.verdict === "hold") return fail("held", `검수 보류: ${problems.join(" / ") || "사유 없음"}`, { usage, problems });

    // 자주 묻는 질문은 본문 끝에도 같은 글자로 있으므로 함께 고쳐진다.
    const fixed = applyFixes({ title: c.title, meta: c.meta_description || "", body: c.body, faq }, review.data.fixes);
    const risks = adRisks([fixed.title, fixed.meta, fixed.body].join("\n"));
    if (risks.length) return fail("held", `광고 규정 위험 표현이 남았습니다: ${risks.join(", ")}`, { usage, problems, fixesApplied: fixed.applied });
    if (fixed.body.replace(/\s/g, "").length < MIN_BODY_CHARS) return fail("held", "검수 후 본문이 너무 짧아졌습니다.", { usage, problems, fixesApplied: fixed.applied });

    // 표지 사진 — 실패해도 글은 발행한다(사진 없이).
    let coverImageUrl: string | undefined, imageError: string | undefined;
    if (m.imageScene) {
        try {
            const bytes = await deps.image(m.imageScene);
            coverImageUrl = await deps.upload(deps.db, lawyer.id, contentId, bytes);
        } catch (e) {
            imageError = (e instanceof Error ? e.message : String(e)).slice(0, 300);
        }
    }

    const publishedAt = deps.now().toISOString();
    const slug = makeSlug(fixed.title, contentId);
    const { error: publishError } = await deps.db.from("contents").update({
        title: fixed.title, slug, body: fixed.body, meta_description: fixed.meta, schema_markup: fixed.faq,
        status: "published", created_at: publishedAt, updated_at: publishedAt,
        card_news_data: { ...(c.card_news_data || {}), ...(coverImageUrl ? { coverImageUrl } : {}) },
    }).eq("id", contentId);
    if (publishError) return fail("failed", `발행하지 못했습니다: ${publishError.message}`, { usage, problems });

    const url = postUrl(deps.baseUrl, lawyer.slug, slug);
    await setMeta(deps.db, row, { ...m, stage: "published", stageAt: publishedAt, usage, problems, fixesApplied: fixed.applied, url, ...(imageError ? { imageError } : {}) }, "ready");
    deps.refresh(lawyer.id, contentId);
    await deps.ping([url]).catch(() => {});
    return { key: target.config.key, slot: m.slot, contentId, published: url, fixesApplied: fixed.applied, problems, ...(imageError ? { imageError } : {}) };
}

/* ───────────── 실제 의존성 ───────────── */

const COVER_STYLE = "Style: plain documentary still life photograph, even diffused daylight, everything in focus, no bokeh, muted natural colors, " +
    "uncluttered Korean office or domestic setting, landscape 3:2 composition with calm empty space. " +
    "STRICT: no people, no faces, no hands, no body parts. No gavel, no scales of justice, no courtroom. No readable text, letters, numbers, or logos.";

async function openAiCover(scene: string): Promise<Buffer> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY 가 없습니다.");
    const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        signal: AbortSignal.timeout(180_000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        // medium: 글 폭(약 720px)에서 high 와 차이가 작고 비용은 몇 분의 1이다. 하루 12장.
        body: JSON.stringify({ model: "gpt-image-2", prompt: `Photograph this scene: ${scene}\n\n${COVER_STYLE}`, n: 1, size: "1536x1024", quality: "medium", output_format: "png" }),
    });
    if (!res.ok) throw new Error(`이미지 생성 실패(${res.status}): ${(await res.text()).slice(0, 200)}`);
    const data = await res.json() as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error("이미지 응답이 비었습니다.");
    // 1200px webp 로 줄여 글 첫 화면(LCP)을 가볍게. 다른 블로그 표지와 같은 톤 보정.
    return sharp(Buffer.from(b64, "base64"), { limitInputPixels: 24_000_000 })
        .resize({ width: 1200, withoutEnlargement: true })
        .modulate({ saturation: 0.88 })
        .linear(1.05, -6)
        .webp({ quality: 80 })
        .toBuffer();
}

async function storageCover(db: Db, lawyerId: string, contentId: string, bytes: Buffer): Promise<string> {
    const path = `autopost/${lawyerId}/${contentId}.webp`;
    const { error } = await db.storage.from("card-covers").upload(path, bytes, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
    if (error) throw new Error(`사진 저장 실패: ${error.message}`);
    return db.storage.from("card-covers").getPublicUrl(path).data.publicUrl;
}

export function defaultDeps(): AutopostDeps {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
    return {
        db: createServiceClient(),
        claude: (stage, body, timeoutMs) => claudeDispatch("api", body as unknown as Parameters<typeof claudeDispatch>[1], { stage, timeoutMs, stream: true })(),
        image: openAiCover,
        upload: storageCover,
        refresh: (lawyerId, postId) => refreshLawyerBlog({ lawyerId, postIds: [postId] }),
        ping: (urls) => submitIndexNow(urls, baseUrl),
        now: () => new Date(),
        baseUrl,
    };
}
