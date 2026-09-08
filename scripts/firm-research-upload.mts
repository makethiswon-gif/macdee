// 로컬 .firm-research/*.json 보고서를 portal_firm_research 로 업서트한다.
// 마이그레이션 019 적용 후 한 번 실행 — 리서치를 다시 돌리지 않고 보존.
// 실행: npx tsx scripts/firm-research-upload.mts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const env: Record<string, string> = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const dir = ".firm-research";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const { research } = JSON.parse(readFileSync(join(dir, file), "utf8"));
    if (!research?.firm_id) { console.log(`- ${file}: research 필드 없음, 건너뜀`); continue; }
    const { error } = await db.from("portal_firm_research").upsert({
        firm_id: research.firm_id, report: research.report, model: research.model,
        brand_color: research.brand_color, applied_profiles: research.applied_profiles,
        generated_at: research.generated_at, updated_at: new Date().toISOString(),
    }, { onConflict: "firm_id" });
    console.log(error ? `✗ ${file}: ${error.message}` : `✓ ${file}`);
}
