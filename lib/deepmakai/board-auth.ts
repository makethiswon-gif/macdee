// 딥마카이 계약 링크 모음(/deepmakai/board) 비밀번호 잠금(서버 전용, 2026-10-29 대표 지시: 관리자 로그인 대신 비밀번호).
// 비밀번호는 저장소(공개)에 두지 않고 비공개 보관함 board-pass.json 에 scrypt 해시로 둔다.
// 숫자 6자리라 IP당 10분 5회(Upstash)에 더해, 보관함에 시간당 실패 횟수를 세어 30회가 넘으면 그 시간 동안 모두 막는다.
// 맞히면 30일짜리 서명 쿠키를 준다. 비밀번호를 바꾸면(해시가 바뀌면) 이전 쿠키는 모두 무효가 된다.
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { BUCKET, DIR, ensureBucket } from "@/lib/deepmakai/ad-contract-server";

export const BOARD_COOKIE = "dm_board";
export const BOARD_DAYS = 30;
const MAX_FAILS_PER_HOUR = 30;

async function readJson<T>(file: string): Promise<T | null> {
    await ensureBucket();
    const { data, error } = await createServiceClient().storage.from(BUCKET).download(`${DIR}${file}?t=${Date.now()}`);
    if (error || !data) return null;
    try { return JSON.parse(await data.text()) as T; } catch { return null; }
}

const loadPass = () => readJson<{ salt: string; hash: string }>("board-pass.json");

function sign(exp: number, hash: string): string {
    const s = process.env.DEEPMAKAI_CONTRACT_SECRET || process.env.ADMIN_TOKEN_SECRET || "";
    return createHmac("sha256", s).update(`deepmakai-board:${exp}:${hash.slice(0, 16)}`).digest("base64url");
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** 비밀번호 확인. 맞으면 쿠키 값, 틀리면 "wrong", 시간당 실패가 많으면 "locked", 비밀번호가 설정되지 않았으면 "unset". */
export async function boardLogin(password: string): Promise<{ cookie: string } | "wrong" | "locked" | "unset"> {
    const pass = await loadPass();
    if (!pass) return "unset";
    const hour = new Date().toISOString().slice(0, 13);
    const fails = await readJson<{ hour: string; count: number }>("board-fails.json");
    const count = fails?.hour === hour ? fails.count : 0;
    if (count >= MAX_FAILS_PER_HOUR) return "locked";
    const got = scryptSync(String(password).slice(0, 64), pass.salt, 32).toString("hex");
    if (!same(got, pass.hash)) {
        await createServiceClient().storage.from(BUCKET).upload(`${DIR}board-fails.json`, JSON.stringify({ hour, count: count + 1 }), { contentType: "application/json", upsert: true, cacheControl: "0" });
        return "wrong";
    }
    const exp = Date.now() + BOARD_DAYS * 86400_000;
    return { cookie: `${exp}.${sign(exp, pass.hash)}` };
}

/** 쿠키가 유효한지(기한 안, 현재 비밀번호로 서명). */
export async function boardSessionOk(cookie: string): Promise<boolean> {
    const [expRaw, mac] = (cookie || "").split(".");
    const exp = Number(expRaw);
    if (!exp || !mac || exp < Date.now()) return false;
    const pass = await loadPass();
    return !!pass && same(mac, sign(exp, pass.hash));
}
