// Browser regression against localhost with synthetic API fixtures; no production writes.
const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const JSZip = require("jszip");
const out = path.resolve(process.argv[2] || "C:/클로드/blog-images-qa");
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(out, `${name}.json`), "utf8")).card;
const profile = { id: "fixture", lawyerName: "검수용", officeName: "디자인 검수용 사무소", phone: "", website: "",
    jobTitle: "변호사", brandColor: "#31594E", profileImages: [], officeImages: [], logoImage: "" };
const responses = { thumbnail: { ...fixture(fs.existsSync(path.join(out, "live-thumbnail.json")) ? "live-thumbnail" : "checklist"), type: "thumbnail", name: "메인 썸네일" },
    info: fixture("checklist"), contact: fixture("contact") };

async function main() {
    const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        let infoCalls = 0; let generations = 0;
        await page.route("**/api/admin/**", async (route) => {
            const url = new URL(route.request().url());
            assert.equal(url.hostname, "127.0.0.1");
            const send = (json, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
            if (url.pathname === "/api/admin/auth") return send({ authenticated: true });
            if (url.pathname === "/api/admin/blog-profiles") return send(url.searchParams.has("id") ? { profile } : { profiles: [profile] });
            if (url.pathname.endsWith("/blog-images/posts")) return send({ posts: [] });
            if (url.pathname.endsWith("/generate-design")) {
                generations++;
                const body = route.request().postDataJSON();
                assert.equal(body.profile.id, "fixture");
                if (body.cardType === "info" && infoCalls++ === 0) return send({ error: "검수용 일시 오류" }, 503);
                return send({ card: responses[body.cardType] });
            }
            throw new Error(`Unexpected admin API request: ${url.pathname}`);
        });
        await page.goto("http://127.0.0.1:3100/admin/blog-images", { waitUntil: "networkidle" });
        await page.getByRole("combobox").first().selectOption("fixture");
        await page.getByLabel("제목", { exact: true }).fill("전세보증금 반환을 준비하며 확인할 자료");
        await page.getByRole("textbox").nth(1).fill("검수용 가상 원고. 계약서, 입금 내역, 대화 기록을 정리합니다.");
        await page.getByRole("button", { name: "3장 이미지 만들기", exact: true }).click();
        await page.getByRole("button", { name: "2장 ZIP 저장", exact: true }).waitFor();
        assert.equal(generations, 3);
        await page.getByRole("button", { name: "다시 시도", exact: true }).click();
        await page.getByRole("button", { name: "3장 ZIP 저장", exact: true }).waitFor();
        assert.equal(generations, 4, "Retry only requests the failed image");
        await page.screenshot({ path: path.join(out, "admin-desktop.png"), fullPage: true });
        const image = page.getByRole("button", { name: "정보 정리 크게 보기", exact: true });
        await image.click();
        await page.getByRole("dialog").waitFor();
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("dialog").count(), 0);
        const downloadEvent = page.waitForEvent("download");
        await page.getByRole("button", { name: "PNG 저장", exact: true }).first().click();
        const png = await downloadEvent;
        assert.deepEqual(fs.readFileSync(await png.path()), Buffer.from(responses.thumbnail.imageDataUrl.split(",")[1], "base64"), "Download must equal preview pixels byte for byte");
        const zipEvent = page.waitForEvent("download");
        await page.getByRole("button", { name: "3장 ZIP 저장", exact: true }).click();
        const archive = await JSZip.loadAsync(fs.readFileSync(await (await zipEvent).path()));
        assert.equal(Object.keys(archive.files).length, 4);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: path.join(out, "admin-mobile.png"), fullPage: true });
        const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, main: document.querySelector("main").clientWidth, mainScroll: document.querySelector("main").scrollWidth }));
        console.log("Mobile dimensions", sizes);
        assert.ok(sizes.document <= sizes.viewport + 1 && sizes.mainScroll <= sizes.main + 1 && sizes.main >= 360, "Mobile editor must use the full viewport without horizontal clipping");
        assert.deepEqual(errors, []);
        console.log("PASS: input → partial failure → single retry → preview → exact PNG → ZIP; desktop and 390px mobile.");
    } finally { await browser.close(); }
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
