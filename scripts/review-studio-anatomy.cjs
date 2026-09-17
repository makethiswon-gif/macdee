// Replays the application's free finishing pipeline on the two authorized originals.
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript"), assert = require("node:assert/strict");
process.chdir(path.resolve(__dirname, ".."));
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const { analyzeStudioAnatomy } = require("../lib/lawyer-studio/anatomy.ts"), { finishStudioPhoto } = require("../lib/lawyer-studio/finishing.ts");
const out = path.resolve("tmp/studio-proportions-audit");
(async () => {
    const records = [];
    for (const key of ["kim", "yu"]) {
        const state = JSON.parse(fs.readFileSync(`.vercel/studio-anatomy-v3/${key}.json`, "utf8"));
        assert.equal(state.state, "complete-draft");
        const bytes = fs.readFileSync(path.join(out, `${key}-v3-original.png`));
        const analysis = await analyzeStudioAnatomy(bytes, state.options);
        assert.equal(analysis.proportions.length, 1); assert.equal(analysis.proportions[0].scaleX, 96);
        fs.writeFileSync(path.join(out, `${key}-balanced.jpg`), await finishStudioPhoto(bytes, state.asset.filters, state.asset.id, false, analysis.proportions));
        fs.writeFileSync(path.join(out, `${key}-balance.json`), JSON.stringify(analysis, null, 2));
        records.push({ key, name: key === "kim" ? "김정웅" : "유지은", scale: analysis.proportions[0].scaleX });
        console.log(JSON.stringify({ key, review: analysis.review, proportions: analysis.proportions }));
    }
    fs.writeFileSync(path.join(out, "review.html"), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>스튜디오 비율 비교</title><style>*{box-sizing:border-box}body{margin:0;background:#161818;color:#f1f3f1;font:16px/1.5 system-ui,sans-serif;letter-spacing:0}main{max-width:1560px;margin:auto;padding:32px 24px}h1{font-size:26px;margin:0 0 8px}h2{font-size:21px;margin:28px 0 12px}p{color:#bfc9c5;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}figure{margin:0}img{width:100%;aspect-ratio:4/5;object-fit:contain;display:block;background:#222}figcaption{padding:8px 0;font-size:14px}a{color:#a7d4c0}@media(max-width:700px){main{padding:24px 16px}.grid{grid-template-columns:1fr}h1{font-size:24px}}</style><main><h1>스튜디오 비율 비교</h1><p>김정웅 · 유지은 / 컬러 / 신규 2장 / 승인 대기</p>${records.map(r => `<section><h2>${r.name}</h2><div class="grid">${[["before", "기존 사진"], ["v3", "새 생성본 · 보정 전"], ["balanced", `새 생성본 · 머리 ${r.scale}%`]].map(([suffix, label]) => `<figure><a href="${r.key}-${suffix}.jpg" target="_blank"><img src="${r.key}-${suffix}.jpg" alt="${r.name} ${label}"></a><figcaption>${label}</figcaption></figure>`).join("")}</div></section>`).join("")}<p>원본과 기존 승인 상태는 보존했습니다. 비율 보정은 유료 재생성이 아니며 승인 전 목·머리·배경 경계를 확인해야 합니다.</p></main></html>`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
