require('dotenv').config();

async function run() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("Key starts with:", apiKey?.substring(0, 10));
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
                messages: [{ role: "user", content: "ai 미래와 결부한 변호사 광고시장 분석" }],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("API Error Response:", err);
        } else {
            console.log("Success! Request works.");
        }
    } catch (e) {
        console.error("Network error:", e);
    }
}

run();
