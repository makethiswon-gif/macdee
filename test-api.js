fetch("http://localhost:3000/api/admin/blog-profiles", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Cookie": "admin_token=bWFjZGVlOm1hY2RlZV9hZG1pbl9zZWNyZXQ="
    },
    body: JSON.stringify({
        action: "create",
        lawyerName: "Test 2",
        officeName: "Test Law 2",
        phone: "010-1234-5678",
        address: "Seoul",
        website: "https://test.com",
        specialty: ["Test"]
    })
}).then(r => r.json().then(data => ({ status: r.status, data })))
    .then(console.log)
    .catch(console.error);
