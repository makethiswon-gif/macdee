const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const cli = process.env.VERCEL_CLI_PATH;
if (!cli || !fs.existsSync(cli)) throw new Error("Set VERCEL_CLI_PATH to the installed Vercel CLI.");
const privateFile = path.resolve(".vercel/studio-preview-auth.json");
const auth = fs.existsSync(privateFile) ? JSON.parse(fs.readFileSync(privateFile, "utf8")) : {
    adminId: "studio-preview-admin", secret: crypto.randomBytes(48).toString("hex"), password: crypto.randomBytes(32).toString("base64url"),
};
fs.writeFileSync(privateFile, JSON.stringify(auth, null, 2), { mode: 0o600 });
if (auth.url && !process.argv.includes("--redeploy")) {
    console.log(JSON.stringify({ url: auth.url, message: "Existing preview preserved" }));
    process.exit(0);
}
const args = [cli, "deploy", "--yes", "--target", "preview", "--json"];
for (const [key, value] of Object.entries({ ADMIN_ID: auth.adminId, ADMIN_TOKEN_SECRET: auth.secret, ADMIN_PW: auth.password })) {
    args.push("--env", `${key}=${value}`, "--build-env", `${key}=${value}`);
}
console.log("Deploying protected preview; production domains are not changed.");
const result = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 900000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
// Keep CLI output private: deployment metadata can contain environment values.
fs.writeFileSync(path.resolve(".vercel/studio-preview-deploy-result.json"), JSON.stringify({ stdout: result.stdout, stderr: result.stderr, status: result.status }), { mode: 0o600 });
if (result.status !== 0) {
    console.error("Preview deployment failed; inspect the private deployment log with secrets redacted.");
    process.exit(1);
}
let data;
try { data = JSON.parse(result.stdout); } catch { /* Some CLI versions emit the URL without JSON. */ }
const url = data?.url || data?.deployment?.url || result.stdout?.match(/https:\/\/[a-z0-9-]+\.vercel\.app\b/)?.[0];
if (!url) throw new Error("Deployment completed but URL could not be parsed; inspect private log.");
auth.url = url.startsWith("https://") ? url : `https://${url}`;
auth.deploymentId = data?.id || data?.deployment?.id;
fs.writeFileSync(privateFile, JSON.stringify(auth, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ url: auth.url, deploymentId: auth.deploymentId, target: "preview" }));
