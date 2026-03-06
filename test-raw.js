const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/ANTHROPIC_API_KEY=([^\n]+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

async function run() {
    if (!apiKey) return;
    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 4096,
                system: "You are an assistant.",
                messages: [{ role: "user", content: "Test" }],
            }),
        });
        const text = await res.text();
        fs.writeFileSync("out.txt", text);
        console.log("Wrote out.txt");
    } catch (e) {
        console.error(e);
    }
}
run();
