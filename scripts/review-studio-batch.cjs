const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const folder = path.resolve("tmp/lawyer-studio-batch-20260911");
const manifest = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

(async () => {
    const sections = [], report = [];
    for (const owner of manifest.owners) {
        const jobs = manifest.jobs.filter((j) => j.profileId === owner.id && j.renderedFile && fs.existsSync(j.renderedFile));
        if (!jobs.length) continue;
        const tiles = [];
        for (const [index, job] of jobs.entries()) {
            const meta = await sharp(job.renderedFile).metadata();
            const stats = await sharp(job.renderedFile).stats();
            if (!meta.width || !meta.height || stats.channels[0].stdev < 8) throw new Error(`Blank or invalid image: ${job.renderedFile}`);
            const bytes = await sharp(job.renderedFile).resize(400, 500, { fit: "contain", background: "#202020" }).toBuffer();
            tiles.push({ input: bytes, left: index * 400, top: 0 });
            report.push({ name: owner.name, shot: job.key, width: meta.width, height: meta.height, bytes: fs.statSync(job.renderedFile).size, luminanceMean: Math.round(stats.channels[0].mean), luminanceDeviation: Math.round(stats.channels[0].stdev), status: job.asset.status, model: job.asset.model, usage: job.asset.usage, file: job.renderedFile });
        }
        await sharp({ create: { width: 400 * tiles.length, height: 500, channels: 3, background: "#202020" } }).composite(tiles).jpeg({ quality: 94 }).toFile(path.join(folder, `${owner.id}-generated-review.jpg`));
        sections.push(`<section id="${esc(owner.id)}"><h2>${esc(owner.name)} <span>${jobs.length} / 4</span></h2><div class="grid">${jobs.map((job) => `<figure><a href="photos/${encodeURIComponent(path.basename(job.renderedFile))}"><img src="photos/${encodeURIComponent(path.basename(job.renderedFile))}" alt="${esc(owner.name)} ${esc(job.label)}" loading="lazy"></a><figcaption><strong>${esc(job.label)}</strong><a href="photos/${encodeURIComponent(path.basename(job.originalFile))}">원본 PNG</a></figcaption></figure>`).join("")}</div></section>`);
    }
    const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>변호사 스튜디오 · 촬영 검토</title><style>*{box-sizing:border-box;letter-spacing:0}body{margin:0;background:#f5f6f7;color:#161718;font:15px/1.6 "Malgun Gothic",sans-serif}header{padding:30px 32px 24px;background:#fff;border-bottom:1px solid #d6d9db}h1{font-size:26px;margin:0 0 8px}p{margin:0;color:#5a6164}nav{display:flex;gap:20px;flex-wrap:wrap;margin-top:18px}a{color:inherit}main{max-width:1800px;margin:auto;padding:0 32px 40px}section{padding-top:30px}h2{font-size:20px;margin:0 0 16px}h2 span{font-size:14px;font-weight:400;color:#687073;margin-left:12px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}figure{margin:0;min-width:0}img{display:block;width:100%;aspect-ratio:4/5;object-fit:contain;background:#202020}figcaption{padding:10px 0;display:flex;gap:8px;justify-content:space-between;align-items:baseline;flex-wrap:wrap;font-size:12px}figcaption strong{font-size:13px;font-weight:600}@media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}main,header{padding-left:16px;padding-right:16px}h1{font-size:23px}}@media(max-width:440px){.grid{grid-template-columns:minmax(0,1fr)}} </style><header><h1>변호사 스튜디오 · 촬영 검토</h1><p>${report.length}장 · 승인 대기 · AI 연출 사진</p><nav>${manifest.owners.map((o) => `<a href="#${esc(o.id)}">${esc(o.name)}</a>`).join("")}</nav></header><main>${sections.join("")}</main></html>`;
    fs.writeFileSync(path.join(folder, "index.html"), html);
    fs.writeFileSync(path.join(folder, "verification.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(folder, "prompts.json"), JSON.stringify(manifest.jobs.filter((j) => j.frozenJob).map((j) => ({ name: j.name, shot: j.key, prompt: j.frozenJob.prompt, options: j.frozenJob.options, model: j.frozenJob.model })), null, 2));
    console.log(JSON.stringify({ count: report.length, gallery: path.join(folder, "index.html"), verification: path.join(folder, "verification.json") }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
