// Run the real Next UI with mocked browser APIs; no production credentials are sent to the server.
const { spawn, spawnSync } = require("node:child_process"), path = require("node:path");
const root = path.resolve(__dirname, "..");
process.loadEnvFile(path.join(root, ".vercel/.env.studio-preview.local"));
const env = { ...process.env, NODE_OPTIONS: "", BLOG_PUBLISH_TEST_URL: "http://127.0.0.1:3118" };
for (const key of ["ADMIN_ID", "ADMIN_PW", "ADMIN_TOKEN_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]) delete env[key];
const server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3118"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let logs = ""; server.stdout.on("data", data => { logs += data; }); server.stderr.on("data", data => { logs += data; });
const run = (file, extra = {}) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, file)], { cwd: root, env: { ...env, ...extra }, stdio: "inherit", windowsHide: true });
    child.on("error", reject); child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`)));
});
(async () => {
    try {
        for (let i = 0; i < 90; i++) {
            if (server.exitCode !== null) throw new Error(`Next exited: ${logs.slice(-2000)}`);
            if (logs.includes("Ready in")) break;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (process.argv.includes("--lawyer-studio")) await run("scripts/test-lawyer-studio-ui.cjs", { STUDIO_TEST_URL: env.BLOG_PUBLISH_TEST_URL });
        else {
            await run("scripts/test-blog-three-cards-ui.cjs");
            await run("scripts/test-blog-three-cards-ui.cjs", { BLOG_CARD_TEST_STUDIO: "1" });
        }
    } finally {
        if (server.exitCode === null) {
            const ended = new Promise(resolve => server.once("exit", resolve));
            if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
            else server.kill("SIGTERM");
            await ended;
        }
    }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
