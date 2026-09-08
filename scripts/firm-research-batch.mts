// 등록 로펌 심층리서치 일괄 실행 — 대표 지시(2026-09-08).
// 프로덕션 API를 관리자 쿠키로 호출한다. 보고서는 stdout + 로컬 파일(비공개).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const env: Record<string, string> = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
}

const BASE = "https://www.makethis1.com";
const mode = process.argv[2] || "list";

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function listFirms() {
    const { data, error } = await db.from("portal_firms").select("id,name").order("name");
    if (error) throw new Error(error.message);
    return data as { id: string; name: string }[];
}

async function adminCookie(): Promise<string> {
    const res = await fetch(`${BASE}/api/admin/auth`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: env.ADMIN_ID, password: env.ADMIN_PW }),
    });
    if (!res.ok) throw new Error(`관리자 로그인 실패 ${res.status}`);
    const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    if (!cookie.includes("admin_token")) throw new Error("admin_token 쿠키 없음");
    return cookie;
}

if (mode === "list") {
    const firms = await listFirms();
    console.log(`등록 로펌 ${firms.length}곳:`);
    for (const f of firms) console.log(`- ${f.name} (${f.id})`);
} else if (mode === "run") {
    // 데모 로펌은 실존하지 않는다 — 웹 리서치하면 남의 로펌과 혼동된다. 제외.
    const firms = (await listFirms()).filter((f) => !f.name.includes("데모"));
    const cookie = await adminCookie();
    mkdirSync(".firm-research", { recursive: true });
    for (const firm of firms) {
        const outFile = join(".firm-research", `${firm.name.replace(/[\\/:*?"<>|\s]/g, "_")}.json`);
        if (existsSync(outFile)) { console.log(`\n■ ${firm.name} — 이미 완료, 건너뜀`); continue; }
        console.log(`\n■ ${firm.name} 리서치 시작…`);
        const started = Date.now();
        try {
            const res = await fetch(`${BASE}/api/admin/firm-research`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: cookie, Origin: BASE },
                body: JSON.stringify({ firmId: firm.id }),
                signal: AbortSignal.timeout(310_000),
            });
            const text = await res.text();
            let data: Record<string, unknown> = {};
            try { data = JSON.parse(text); } catch { /* keep raw */ }
            if (!res.ok) {
                console.log(`  ✗ 실패 (${res.status}) ${(data.error as string) || text.slice(0, 200)}`);
                continue;
            }
            const research = data.research as { report: Record<string, unknown>; brand_color: string | null; applied_profiles: { name: string }[] };
            const rpt = research.report as { practiceAreas?: string[]; strengths?: string[]; homepage?: { url?: string }; sources?: string[]; lawyers?: unknown[] };
            const file = join(".firm-research", `${firm.name.replace(/[\\/:*?"<>|\s]/g, "_")}.json`);
            writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
            console.log(`  ✓ 완료 ${Math.round((Date.now() - started) / 1000)}초 · 저장 ${data.saved} · 색 ${research.brand_color || "-"} (${data.brandColorSource || "-"})`);
            console.log(`    변호사 ${rpt.lawyers?.length ?? 0}명 · 분야 ${(rpt.practiceAreas || []).join(",") || "-"}`);
            console.log(`    프로필 반영: ${research.applied_profiles.map((p) => p.name).join(", ") || "일치 프로필 없음"}`);
            console.log(`    홈페이지: ${rpt.homepage?.url || "-"} · 출처 ${rpt.sources?.length ?? 0}건 · 파일 ${file}`);
        } catch (e) {
            console.log(`  ✗ 오류: ${e instanceof Error ? e.message : e}`);
        }
    }
}
