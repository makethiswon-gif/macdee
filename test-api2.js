const http = require("http");

async function run() {
    const res = await fetch("http://localhost:3000/api/admin/blog-profiles", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Cookie": "admin_token=bWFjZGVlOm1hY2RlZV9hZG1pbl9zZWNyZXQ="
        },
        body: JSON.stringify({
            action: "create",
            lawyerName: "이지은",
            officeName: "법무법인 그날",
            phone: "02-1234-5678",
            address: "서울시 강남구 ...",
            website: "https://example.com",
            specialty: ["이혼"]
        })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
}
run();
