async function run() {
    try {
        const res = await fetch("http://localhost:3000/api/admin/magazines/generate", {
            method: "POST",
            headers: {
                "Cookie": "admin_token=bWFjZGVlX2FkbWluX3NlY3JldA==",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: "ai 미래와 결부한 변호사 광고시장 분석",
                category: "법률정보"
            })
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (e) {
        console.error(e);
    }
}
run();
