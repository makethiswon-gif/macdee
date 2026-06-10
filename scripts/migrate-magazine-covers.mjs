// 기존 매거진 커버(base64 data URI)를 Supabase Storage로 1회 이전하는 스크립트.
// 실행: node scripts/migrate-magazine-covers.mjs
//   --dry  : 변경 없이 대상 개수만 출력
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// .env.local 파싱
function loadEnv() {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const env = {};
    for (const line of text.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error("Supabase 자격증명 없음 (.env.local)");
    process.exit(1);
}

const dryRun = process.argv.includes("--dry");
const BUCKET = "card-covers";
const supabase = createClient(url, key);

const { data: rows, error } = await supabase
    .from("magazines")
    .select("id, slug, cover_image_url")
    .like("cover_image_url", "data:%");

if (error) {
    console.error("조회 실패:", error.message);
    process.exit(1);
}

console.log(`base64 커버를 가진 매거진: ${rows.length}건`);
if (dryRun) {
    rows.forEach((r) => console.log(` - ${r.id} (${r.slug})`));
    process.exit(0);
}

let ok = 0;
let fail = 0;
for (const row of rows) {
    try {
        const m = row.cover_image_url.match(/^data:(image\/\w+);base64,(.+)$/s);
        if (!m) {
            console.warn(`건너뜀(형식불일치): ${row.id}`);
            fail++;
            continue;
        }
        const buffer = Buffer.from(m[2], "base64");
        const fileName = `magazine/${row.id}.png`;

        const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(fileName, buffer, { contentType: "image/png", upsert: true });
        if (upErr) {
            console.error(`업로드 실패 ${row.id}:`, upErr.message);
            fail++;
            continue;
        }

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
        const { error: updErr } = await supabase
            .from("magazines")
            .update({ cover_image_url: pub.publicUrl })
            .eq("id", row.id);
        if (updErr) {
            console.error(`DB 갱신 실패 ${row.id}:`, updErr.message);
            fail++;
            continue;
        }

        ok++;
        console.log(`✓ ${row.id} → ${pub.publicUrl}`);
    } catch (e) {
        console.error(`오류 ${row.id}:`, e.message);
        fail++;
    }
}

console.log(`\n완료: 성공 ${ok}건 / 실패 ${fail}건`);
