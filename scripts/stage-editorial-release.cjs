// Assemble an isolated release while leaving unrelated pending SEO changes in the workspace.
const fs = require("node:fs"), path = require("node:path"), cp = require("node:child_process"), crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const destination = path.join(root, ".vercel/releases", `editorial-three-${Date.now()}`);
if (fs.existsSync(destination)) throw new Error("Release folder already exists");
const names = cp.execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, maxBuffer: 20 * 1024 * 1024 }).toString().split("\0");
const excluded = /^(?:tmp\/|\.env|\.git\/|\.vercel\/|\.next\/|node_modules\/|\.firm-research\/|coverage\/|scripts\/test-blog-pagination-seo\.cjs$)/;
const manifest = [];
for (const name of new Set(names)) {
    if (!name || excluded.test(name)) continue;
    const source = path.join(root, name);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
    const target = path.resolve(destination, name);
    if (!target.startsWith(destination + path.sep)) throw new Error("Unsafe release path");
    const bytes = name === "app/blog/[slug]/page.tsx" ? cp.execFileSync("git", ["show", `HEAD:${name}`], { cwd: root }) : fs.readFileSync(source);
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
    manifest.push({ name, hash: crypto.createHash("sha256").update(bytes).digest("hex") });
}
fs.mkdirSync(path.join(destination, ".vercel"), { recursive: true });
fs.copyFileSync(path.join(root, ".vercel/project.json"), path.join(destination, ".vercel/project.json"));
fs.writeFileSync(path.join(root, ".vercel/editorial-release-manifest.json"), JSON.stringify({ destination, files: manifest }, null, 2));
console.log(JSON.stringify({ destination, files: manifest.length, excludedPendingSeo: true }));
