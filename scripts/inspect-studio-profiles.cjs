// Export only the requested registered portraits for local, read-only batch review.
const fs = require("node:fs"), path = require("node:path"), sharp = require("sharp"), { createClient } = require("@supabase/supabase-js");
const names = ["김정웅", "양영희", "이지은", "유지은", "정음", "이정도"];
const out = path.resolve("tmp/lawyer-studio-batch-20260911");
async function main() {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await client.from("blog_profiles").select("id,lawyer_name,office_name,naver_blog_id,fields,profile_images");
    if (error) throw new Error("Profile inspection failed: " + error.code);
    const selected = data.filter((p) => names.some((name) => p.lawyer_name.split("||")[0].trim() === name || p.office_name.includes(name)));
    fs.mkdirSync(out, { recursive: true });
    const manifest = [];
    for (const profile of selected) {
        const folder = path.join(out, "references", profile.id); fs.mkdirSync(folder, { recursive: true });
        const photos = [];
        for (const [index, source] of (profile.profile_images || []).entries()) {
            let bytes;
            if (/^data:image\/(png|jpe?g|webp);base64,/.test(source)) bytes = Buffer.from(source.split(",")[1], "base64");
            else {
                const url = new URL(source);
                if (url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin || !url.pathname.startsWith("/storage/v1/object/public/")) throw new Error("Untrusted registered image origin");
                const response = await fetch(url, { redirect: "error" }); if (!response.ok) throw new Error("Reference download failed"); bytes = Buffer.from(await response.arrayBuffer());
            }
            const file = path.join(folder, `${index}.png`);
            await sharp(bytes, { limitInputPixels: 24_000_000 }).rotate().png().toFile(file);
            photos.push({ index, file });
        }
        const cols = Math.min(photos.length, 5), rows = Math.ceil(photos.length / cols), cellW = 240, cellH = 320;
        if (photos.length) {
            const tiles = [];
            for (const photo of photos) {
                const thumb = await sharp(photo.file).resize(cellW - 8, cellH - 8, { fit: "contain", background: "#eeeeee" }).png().toBuffer();
                tiles.push({ input: thumb, left: (photo.index % cols) * cellW + 4, top: Math.floor(photo.index / cols) * cellH + 4 });
            }
            await sharp({ create: { width: cols * cellW, height: rows * cellH, channels: 3, background: "#666666" } }).composite(tiles).png().toFile(path.join(out, `${profile.id}-references.png`));
        }
        manifest.push({ id: profile.id, name: profile.lawyer_name.split("||")[0].trim(), office: profile.office_name, blog: profile.naver_blog_id, fields: profile.fields, photos });
    }
    fs.writeFileSync(path.join(out, "profiles.json"), JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify(manifest.map(({ photos, ...p }) => ({ ...p, photoCount: photos.length })), null, 2));
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
