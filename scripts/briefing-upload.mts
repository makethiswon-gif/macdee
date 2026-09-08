// 대표 전용 심층 브리핑 업로드 — 비공개 Storage 버킷(owner-briefings)에 저장.
// 브리핑 내용은 공개 리포에 커밋하지 않는다. 읽기는 관리자 API만 가능.
// 실행: npx tsx scripts/briefing-upload.mts <briefing.json 경로>
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env: Record<string, string> = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
}
const file = process.argv[2];
if (!file) { console.error("사용법: npx tsx scripts/briefing-upload.mts <briefing.json>"); process.exit(1); }
const body = readFileSync(file, "utf8");
JSON.parse(body); // 형식 검증 — 깨진 JSON을 올리지 않는다

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = "owner-briefings";

const { error: bucketError } = await db.storage.createBucket(BUCKET, { public: false });
if (bucketError && !/already exists/i.test(bucketError.message)) {
    console.error("버킷 생성 실패:", bucketError.message); process.exit(1);
}
const { error } = await db.storage.from(BUCKET).upload("strategy/latest.json", Buffer.from(body, "utf8"), {
    contentType: "application/json; charset=utf-8", upsert: true,
});
if (error) { console.error("업로드 실패:", error.message); process.exit(1); }
console.log(`✓ ${BUCKET}/strategy/latest.json 업로드 완료 (${Buffer.byteLength(body).toLocaleString()} bytes, 비공개)`);
