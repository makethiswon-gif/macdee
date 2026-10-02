#!/usr/bin/env node
// 클로드 구독 작업기 — makethis1.com 블로그 발행 화면의 'AI 실행: 클로드 구독'을 처리한다(2026-09-29).
//
// 웹 서버는 구독 로그인을 쓸 수 없으므로 작업을 Supabase 비공개 저장소(owner-briefings/claude-subscription/)에 넣는다.
// 이 작업기는 대표 PC 에서 돌면서 작업을 가져가, 이 PC 에 로그인된 Claude Code(`claude -p`)로 처리하고 결과를 돌려놓는다.
// 서버 쪽 규약은 lib/ai/subscription-relay.ts 에 있다.
//
// 안전 장치
//  - Claude Code 는 도구 없이(--tools "") 안전 모드(--safe-mode)로 실행한다. 붙여넣은 글에 지시가 섞여 있어도
//    이 PC 의 파일·명령에 손대지 못한다. 개인 CLAUDE.md·메모리·스킬·MCP 도 섞이지 않는다.
//  - ANTHROPIC_API_KEY 는 자식 프로세스에 넘기지 않는다. 넘기면 구독이 아니라 API 로 과금된다.
//  - 같은 PC 에서 두 개가 동시에 돌지 않게 잠금 파일을 둔다.
//  - 원고 본문은 로그에 남기지 않는다(단계·시간·토큰 수만).
//
// 실행: node claude-subscription-worker.mjs --env <macdee .env.local 경로> [--concurrency 2] [--claude <claude.exe 경로>]
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, appendFileSync } from "node:fs";
import { hostname, homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WORKER_VERSION = "1.0.0";
const BUCKET = "owner-briefings";
const PREFIX = "claude-subscription";
const POLL_MS = 2_000;
const BEAT_MS = 15_000;
const JOB_HARD_LIMIT_MS = 12 * 60_000;
const STALE_JOB_MS = 15 * 60_000;
const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

// ── 설정 ─────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = arg("env") || process.env.MACDEE_ENV_FILE || path.resolve(here, "../.env.local");
const fileEnv = {};
if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m) fileEnv[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
}
// Supabase 두 값만 읽는다. 파일의 다른 키(특히 ANTHROPIC_API_KEY)는 이 프로세스 환경에 올리지 않는다.
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || "";
const CONCURRENCY = Math.max(1, Math.min(4, Number(arg("concurrency")) || 2));
const WORK_DIR = path.join(process.env.LOCALAPPDATA || path.join(homedir(), ".local", "share"), "macdee-claude-worker");
mkdirSync(WORK_DIR, { recursive: true });

function findClaude() {
    const explicit = arg("claude") || process.env.CLAUDE_BIN;
    if (explicit) return explicit;
    if (process.platform === "win32") {
        const candidates = [
            process.env.APPDATA && path.join(process.env.APPDATA, "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"),
            path.join(homedir(), ".local", "bin", "claude.exe"),
        ].filter(Boolean);
        const found = candidates.find((p) => existsSync(p));
        if (found) return found;
        try { return execFileSync("where", ["claude.exe"], { encoding: "utf8" }).split(/\r?\n/)[0].trim(); } catch { return ""; }
    }
    return "claude";
}
const CLAUDE = findClaude();

// ── 표시 ─────────────────────────────────────────────
const LOG_FILE = path.join(WORK_DIR, "worker.log");
const stamp = () => new Date().toLocaleTimeString("ko-KR", { hour12: false, timeZone: "Asia/Seoul" });
function log(message) {
    const line = `[${stamp()}] ${message}`;
    console.log(line);
    try { appendFileSync(LOG_FILE, `${new Date().toISOString()} ${message}\n`); } catch { /* 로그 실패는 무시 */ }
}
const seconds = (ms) => ms < 60_000 ? `${Math.round(ms / 1000)}초` : `${Math.floor(ms / 60_000)}분 ${Math.round((ms % 60_000) / 1000)}초`;

// ── 저장소(REST) ─────────────────────────────────────
const headers = (extra = {}) => ({ Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, ...extra });
const objectUrl = (p) => `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${p.split("/").map(encodeURIComponent).join("/")}`;
async function list(folder, limit = 50) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, { method: "POST", headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ prefix: folder, limit, offset: 0, sortBy: { column: "name", order: "asc" } }) });
    if (!res.ok) throw new Error(`목록 조회 실패 ${res.status}`);
    return (await res.json()).filter((o) => o.id); // 폴더 항목 제외
}
async function move(from, to) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/move`, { method: "POST", headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ bucketId: BUCKET, sourceKey: from, destinationKey: to }) });
    return res.ok;
}
async function download(p) {
    const res = await fetch(objectUrl(p), { headers: headers() });
    if (!res.ok) throw new Error(`내려받기 실패 ${res.status}`);
    return res.text();
}
/** upsert=false 에서 이미 있으면 false. */
async function upload(p, body, upsert) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(objectUrl(p), { method: "POST", headers: headers({ "Content-Type": "application/json", "x-upsert": upsert ? "true" : "false", "cache-control": "no-cache" }), body });
            if (res.ok) return true;
            const text = await res.text();
            if (res.status === 409 || /exists|Duplicate/i.test(text)) return false;
            if (res.status < 500) throw new Error(`올리기 실패 ${res.status}: ${text.slice(0, 120)}`);
        } catch (e) { if (attempt === 2) throw e; }
        await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)));
    }
    throw new Error("올리기 실패");
}
async function remove(paths) {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, { method: "DELETE", headers: headers({ "Content-Type": "application/json" }), body: JSON.stringify({ prefixes: paths }) }).catch(() => undefined);
}

// ── 결과 기록 ────────────────────────────────────────
async function writeResult(job, status, payload, elapsedMs) {
    const text = JSON.stringify(payload);
    await upload(`${PREFIX}/results/${job.id}.json`, JSON.stringify({ status, text, jobId: job.id, elapsedMs }), true);
    // 유료 작업이면 보존 응답도 남긴다. 서버 함수가 먼저 끝났어도 화면의 '저장된 응답 복구(무료)'로 받을 수 있다.
    if (job.operationId && /^[a-f0-9]{64}$/.test(job.operationId)) {
        await upload(`blog-paid-operations/${job.operationId}/response.json`,
            JSON.stringify({ status, text, requestId: `subscription:${job.id}`, elapsedMs }), false).catch((e) => log(`  보존 응답 기록 실패: ${e.message}`));
    }
}
const errorPayload = (type, message) => ({ type: "error", error: { type, message } });

// ── Claude Code 실행 ─────────────────────────────────
function childEnv(maxTokens) {
    const env = { ...process.env };
    for (const key of ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_SSE_PORT"]) delete env[key];
    env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = String(maxTokens);
    env.DISABLE_AUTOUPDATER = "1";
    return env;
}
const active = new Map(); // 대기열 파일 이름 → { child, stage }
let lastError = null;
let claudeVersion = "";

function runClaude(job, slot) {
    const r = job.request;
    const systemFile = path.join(WORK_DIR, `system-${job.id}.txt`);
    writeFileSync(systemFile, r.system, "utf8");
    const args = ["-p", "--safe-mode", "--tools", "", "--system-prompt-file", systemFile, "--no-session-persistence",
        "--output-format", "json", "--model", r.model, "--effort", r.effort];
    if (r.jsonSchema) args.push("--json-schema", JSON.stringify(r.jsonSchema));
    return new Promise((resolve) => {
        const child = spawn(CLAUDE, args, { cwd: WORK_DIR, env: childEnv(r.maxTokens), windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
        slot.child = child;
        let stdout = "", stderr = "";
        child.stdout.on("data", (d) => { stdout += d; });
        child.stderr.on("data", (d) => { stderr += d; });
        const timer = setTimeout(() => child.kill(), JOB_HARD_LIMIT_MS);
        child.on("error", (e) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: `${stderr}\n${e.message}` }); });
        child.on("close", (code) => { clearTimeout(timer); try { unlinkSync(systemFile); } catch { /* 이미 없음 */ } resolve({ code, stdout, stderr }); });
        child.stdin.end(r.user, "utf8");
    });
}

function limitMessage(text) {
    // Claude Code 는 한도에 걸리면 "...limit reached|<초기화 epoch>" 형태를 돌려준다.
    const epoch = Number((text.match(/\|(\d{10})\b/) || [])[1]);
    const when = epoch ? new Date(epoch * 1000).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    return `구독 사용 한도에 걸렸습니다${when ? ` — ${when}에 초기화` : ""}`;
}

/** Claude Code 결과 → Anthropic Messages 응답 모양. 서버는 API 응답과 같은 코드로 읽는다. */
function toMessage(job, cc) {
    const r = job.request;
    const u = cc.usage || {};
    let text = typeof cc.result === "string" ? cc.result : "";
    if (r.jsonSchema) {
        if (cc.structured_output == null) return { status: 502, payload: errorPayload("structured_output_missing", "구조화 응답(JSON)을 받지 못했습니다.") };
        text = JSON.stringify(cc.structured_output);
    }
    return { status: 200, payload: {
        id: `msg_subscription_${job.id}`, type: "message", role: "assistant", model: r.model,
        content: [{ type: "text", text }],
        stop_reason: cc.stop_reason || "end_turn", stop_sequence: null,
        usage: { input_tokens: u.input_tokens || 0, output_tokens: u.output_tokens || 0,
            cache_read_input_tokens: u.cache_read_input_tokens || 0, cache_creation_input_tokens: u.cache_creation_input_tokens || 0 },
        subscription: { worker: WORKER_VERSION, claudeVersion, durationMs: cc.duration_ms, numTurns: cc.num_turns, notionalUsd: cc.total_cost_usd },
    } };
}

function validJob(job) {
    const r = job?.request;
    return job?.version === 1 && typeof job.id === "string" && /^[a-f0-9-]{36}$/.test(job.id) && r
        && typeof r.model === "string" && /^claude-[a-z0-9.-]+$/.test(r.model) && EFFORTS.has(r.effort)
        && typeof r.system === "string" && typeof r.user === "string" && r.user.length > 0 && r.user.length < 200_000 && r.system.length < 200_000
        && Number.isInteger(r.maxTokens) && r.maxTokens > 0 && r.maxTokens <= 64_000
        && (r.jsonSchema == null || (typeof r.jsonSchema === "object" && JSON.stringify(r.jsonSchema).length < 25_000));
}

async function processJob(name, slot) {
    const runningPath = `${PREFIX}/running/${name}`;
    const started = Date.now();
    let job;
    try { job = JSON.parse(await download(runningPath)); }
    catch (e) { log(`작업 파일을 읽지 못했습니다(${name}): ${e.message}`); await remove([runningPath]); return; }
    if (!validJob(job)) {
        log(`형식이 맞지 않는 작업을 건너뜁니다(${name}).`);
        if (typeof job?.id === "string" && /^[a-f0-9-]{36}$/.test(job.id)) await writeResult(job, 400, errorPayload("invalid_job", "작업 형식이 올바르지 않습니다."), 0).catch(() => undefined);
        await remove([runningPath]); return;
    }
    const short = job.id.slice(0, 8);
    slot.stage = job.stage;
    try {
        if (started - Date.parse(job.createdAt) > STALE_JOB_MS) {
            log(`오래된 작업은 처리하지 않습니다: ${job.stage} (${short})`);
            await writeResult(job, 504, errorPayload("stale_job", "작업이 너무 오래 대기해 처리하지 않았습니다."), 0);
            return;
        }
        log(`시작: ${job.stage} (${short}) · ${job.request.model} · 사고 ${job.request.effort}`);
        const run = await runClaude(job, slot);
        const elapsed = Date.now() - started;
        if (stopping) {
            await writeResult(job, 503, errorPayload("worker_stopped", "작업기를 종료해 작업이 중단됐습니다."), elapsed);
            log(`중단: ${job.stage} (${short}) — 작업기 종료`);
            return;
        }
        let cc = null;
        try { cc = JSON.parse(run.stdout.trim().split(/\r?\n/).filter(Boolean).pop() || ""); } catch { /* 아래에서 처리 */ }
        if (!cc || cc.type !== "result") {
            const detail = (run.stderr || run.stdout).trim().slice(-300);
            const limited = /limit/i.test(detail);
            lastError = limited ? limitMessage(detail) : `Claude Code 실행 실패(종료 코드 ${run.code})`;
            await writeResult(job, limited ? 429 : 502, errorPayload(limited ? "subscription_limit" : "claude_code_failed", limited ? lastError : `${lastError}: ${detail}`), elapsed);
            log(`실패: ${job.stage} (${short}) — ${lastError}${limited ? "" : ` · ${detail.replace(/\s+/g, " ").slice(0, 160)}`}`);
            return;
        }
        if (cc.is_error) {
            const detail = String(cc.result || cc.subtype || "").slice(0, 300);
            const limited = cc.api_error_status === 429 || /limit/i.test(detail);
            const auth = cc.api_error_status === 401 || /log ?in|auth/i.test(detail);
            lastError = limited ? limitMessage(detail) : auth ? "Claude Code 로그인이 필요합니다(터미널에서 claude 실행 후 /login)" : `Claude Code 오류: ${detail}`;
            await writeResult(job, limited ? 429 : auth ? 401 : 502, errorPayload(limited ? "subscription_limit" : auth ? "claude_code_auth" : "claude_code_error", lastError), elapsed);
            log(`실패: ${job.stage} (${short}) — ${lastError}`);
            return;
        }
        const { status, payload } = toMessage(job, cc);
        await writeResult(job, status, payload, elapsed);
        lastError = status === 200 ? null : payload.error.message;
        const u = cc.usage || {};
        log(`${status === 200 ? "완료" : "실패"}: ${job.stage} (${short}) · ${seconds(elapsed)} · 입력 ${(u.input_tokens || 0).toLocaleString()} / 출력 ${(u.output_tokens || 0).toLocaleString()} 토큰${cc.stop_reason && cc.stop_reason !== "end_turn" ? ` · 종료 사유 ${cc.stop_reason}` : ""}`);
    } catch (e) {
        lastError = e.message;
        log(`오류: ${job.stage} (${short}) — ${e.message}`);
        await writeResult(job, 502, errorPayload("worker_error", `작업기 오류: ${e.message}`), Date.now() - started).catch(() => undefined);
    } finally {
        await remove([runningPath]);
    }
}

// ── 생존 신호·대기열 ─────────────────────────────────
let lastBeat = 0;
async function beat(force = false) {
    if (!force && Date.now() - lastBeat < BEAT_MS) return;
    lastBeat = Date.now();
    await upload(`${PREFIX}/worker.json`, JSON.stringify({ lastSeen: new Date().toISOString(), host: hostname(), running: active.size, version: WORKER_VERSION, claudeVersion, lastError, pid: process.pid }), true)
        .catch((e) => log(`생존 신호 기록 실패: ${e.message}`));
}

async function claimJobs() {
    if (stopping || active.size >= CONCURRENCY) return;
    const jobs = await list(`${PREFIX}/jobs`, 20);
    for (const job of jobs) {
        if (active.size >= CONCURRENCY) break;
        // move 는 한 번만 성공한다. 서버가 먼저 회수했으면 실패하고 넘어간다.
        if (await move(`${PREFIX}/jobs/${job.name}`, `${PREFIX}/running/${job.name}`)) {
            const slot = { child: null, stage: "가져오는 중" };
            active.set(job.name, slot);
            void processJob(job.name, slot).finally(() => { active.delete(job.name); void beat(true); });
            await beat(true);
        }
    }
}

let lastCleanup = 0;
async function cleanup() {
    if (Date.now() - lastCleanup < 60 * 60_000) return;
    lastCleanup = Date.now();
    try {
        const old = (await list(`${PREFIX}/results`, 200)).filter((o) => Date.now() - Date.parse(o.created_at) > 24 * 3600_000);
        if (old.length) await remove(old.map((o) => `${PREFIX}/results/${o.name}`));
    } catch { /* 다음에 다시 */ }
}

/** 이전 작업기가 처리 중에 꺼졌다면 그 작업은 끝나지 않는다. 기다리는 쪽에 확정 실패를 알린다. */
async function recoverInterrupted() {
    for (const o of await list(`${PREFIX}/running`, 100)) {
        const p = `${PREFIX}/running/${o.name}`;
        try {
            const job = JSON.parse(await download(p));
            if (typeof job?.id === "string" && /^[a-f0-9-]{36}$/.test(job.id)) await writeResult(job, 502, errorPayload("worker_restarted", "작업기가 처리 중에 꺼져 작업이 중단됐습니다. 다시 요청해 주세요."), 0);
            log(`이전에 중단된 작업을 실패로 정리했습니다: ${job?.stage || o.name}`);
        } catch { /* 읽지 못해도 지운다 */ }
        await remove([p]);
    }
}

// ── 시작 ─────────────────────────────────────────────
let stopping = false;
const LOCK = path.join(WORK_DIR, "worker.pid");
function takeLock() {
    if (existsSync(LOCK)) {
        const pid = Number(readFileSync(LOCK, "utf8"));
        try { if (pid && pid !== process.pid) { process.kill(pid, 0); return false; } } catch { /* 죽은 프로세스의 잠금 */ }
    }
    writeFileSync(LOCK, String(process.pid));
    return true;
}

async function main() {
    console.log("클로드 구독 작업기 — makethis1 블로그 발행");
    if (!SUPABASE_URL || !SERVICE_KEY) { console.error(`Supabase 설정을 찾지 못했습니다. --env 로 macdee .env.local 경로를 지정해 주세요. (읽은 파일: ${envFile})`); process.exit(1); }
    if (!CLAUDE || (CLAUDE !== "claude" && !existsSync(CLAUDE))) { console.error("Claude Code(claude.exe)를 찾지 못했습니다. --claude 로 경로를 지정해 주세요."); process.exit(1); }
    if (!takeLock()) { console.error("이 PC 에서 작업기가 이미 실행 중입니다. 이 창은 닫아도 됩니다."); process.exit(0); }
    try { claudeVersion = execFileSync(CLAUDE, ["--version"], { encoding: "utf8", env: childEnv(1000), windowsHide: true }).trim(); } catch { claudeVersion = "확인 실패"; }
    try {
        const auth = JSON.parse(execFileSync(CLAUDE, ["auth", "status"], { encoding: "utf8", env: childEnv(1000), windowsHide: true }));
        if (!auth.loggedIn || auth.authMethod !== "claude.ai") {
            lastError = "Claude Code 가 구독(claude.ai) 로그인이 아닙니다";
            console.error(`경고: ${lastError}. 터미널에서 claude 를 실행해 /login 으로 구독 계정에 로그인해 주세요.`);
        } else log(`Claude Code ${claudeVersion} · ${auth.subscriptionType || "구독"} 로그인 확인 (${auth.email || "계정"})`);
    } catch { log("로그인 상태를 확인하지 못했습니다(작업 시 다시 확인됩니다)."); }
    log(`동시 처리 ${CONCURRENCY}건 · 작업 폴더 ${WORK_DIR}`);
    await recoverInterrupted().catch((e) => log(`중단 작업 정리 실패: ${e.message}`));
    await beat(true);
    log("대기 중 — 이 창을 켜 두면 블로그 발행 화면에서 '클로드 구독'을 쓸 수 있습니다.");
    let failures = 0;
    while (!stopping) {
        try { await beat(); await claimJobs(); await cleanup(); failures = 0; }
        catch (e) { if (++failures === 1 || failures % 30 === 0) log(`저장소 연결 오류(${failures}회): ${e.message}`); }
        await new Promise((r) => setTimeout(r, POLL_MS));
    }
}

async function shutdown() {
    if (stopping) process.exit(1);
    stopping = true;
    log(`종료 중… 처리 중인 작업 ${[...active.values()].filter((a) => a.child).length}건을 중단 처리합니다.`);
    for (const a of active.values()) a.child?.kill();
    const deadline = Date.now() + 8_000;
    while (active.size && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
    // 꺼졌다는 것을 바로 알린다(화면 표시가 45초 기다리지 않게).
    await upload(`${PREFIX}/worker.json`, JSON.stringify({ lastSeen: new Date(0).toISOString(), host: hostname(), running: 0, version: WORKER_VERSION, claudeVersion, lastError: "작업기 종료", pid: process.pid }), true).catch(() => undefined);
    try { if (Number(readFileSync(LOCK, "utf8")) === process.pid) unlinkSync(LOCK); } catch { /* 없음 */ }
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGBREAK", shutdown);
process.on("SIGHUP", shutdown); // 창을 닫을 때(Windows)

main().catch((e) => { console.error(e); process.exit(1); });
