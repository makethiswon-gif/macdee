// ─── 네이버 블로그 로컬 발행기 ───
//
// 사장님 PC에서만 돈다. 서버는 이 코드를 실행하지 않는다.
// 로그인은 하지 않는다 — 이미 로그인된 크롬 프로필을 그대로 열어 쓴다.
// 세션은 몇 달 유지되므로 로그인을 자동화해봐야 얻는 게 거의 없고,
// 로그인은 네이버가 가장 촘촘히 보는 지점이라 8개 계정을 한꺼번에 걸게 된다.
//
// 사용법
//   node publisher/publish.mjs list                     발행 대기 목록
//   node publisher/publish.mjs inspect <postId>         편집기 구조 확인 (선택자 찾기용)
//   node publisher/publish.mjs run <postId>             한 건 발행
//   node publisher/publish.mjs run <postId> --dry       발행 버튼 직전까지만
//
// 전제: 대상 크롬 프로필로 열려 있는 크롬 창을 먼저 닫아야 한다.
//       크롬이 프로필 디렉터리를 잠그기 때문이다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
// playwright-core는 브라우저를 내려받지 않는다. 사장님 PC에 설치된 크롬을 그대로 쓴다.
// list 명령은 브라우저가 필요 없으므로 쓸 때만 불러온다.

// ── 설정 ──────────────────────────────────────────────────────────

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");
const CHROME_USER_DATA = path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data");
const BASE_URL = process.env.MACDEE_URL || "https://www.makethis1.com";

function loadEnv() {
    const f = path.join(ROOT, ".env.local");
    if (!fs.existsSync(f)) return;
    for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Za-z_0-9]+)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
}

// 관리자 쿠키를 직접 만든다. 서버의 generateToken과 같은 형식이다.
function adminCookie() {
    const id = process.env.ADMIN_ID || "macdee";
    const secret = process.env.ADMIN_TOKEN_SECRET;
    if (!secret) throw new Error("ADMIN_TOKEN_SECRET이 .env.local에 없습니다.");
    const payload = `${id}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
    const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return `admin_token=${Buffer.from(`${payload}:${sig}`).toString("base64url")}`;
}

async function api(pathname, init = {}) {
    const res = await fetch(BASE_URL + pathname, {
        ...init,
        headers: { "Content-Type": "application/json", Cookie: adminCookie(), ...(init.headers || {}) },
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`${pathname} 응답을 읽지 못했습니다: ${text.slice(0, 200)}`);
    }
    if (res.status === 401) {
        throw new Error(
            [
                "관리자 인증에 실패했습니다.",
                "  .env.local의 ADMIN_ID / ADMIN_TOKEN_SECRET이 Vercel 프로덕션 값과 달라서입니다.",
                "  Vercel → macdee → Settings → Environment Variables 에서 두 값을 확인해",
                "  .env.local에 같은 값으로 맞춰주세요.",
            ].join("\n")
        );
    }
    if (!res.ok) throw new Error(data.error || `${pathname} ${res.status}`);
    return data;
}

// ── 원고 → 네이버 HTML ────────────────────────────────────────────
// lib/blog-naver-html.ts와 같은 규칙이다. 붙여넣기 테스트로 확인한 것만 쓴다.
//   <p>는 문단 간격이 죽는다 → 간격은 <br>로 직접
//   <blockquote>는 따옴표형으로 바뀐다 → border-left를 직접 지정
//   <mark>는 배경이 사라진다 → background-color를 직접 지정

const HIGHLIGHT = "#CFE8F5";
const headingStyle = (px) =>
    `border-left:4px solid #000000;padding-left:14px;font-weight:700;font-size:${px}px;`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inline = (s) =>
    esc(s)
        .replace(/==(.+?)==/g, `<span style="background-color:${HIGHLIGHT};">$1</span>`)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, "<u>$1</u>");

function toNaverHtml(body, title, imageUrls = []) {
    const out = [];
    const gap = (n) => {
        if (!out.length) return;
        let have = 0;
        while (have < out.length && out[out.length - 1 - have] === "<br>") have++;
        for (let i = have; i < n; i++) out.push("<br>");
    };

    if (title) out.push(`<p style="${headingStyle(20)}">${inline(title)}</p>`);

    // 첫 이미지는 도입부 위에 (썸네일 역할)
    if (imageUrls[0]) {
        gap(1);
        out.push(`<p><img src="${imageUrls[0]}" style="max-width:100%;" /></p>`);
    }

    const lines = body.replace(/\r\n/g, "\n").split("\n");
    let para = [];
    let listType = null;
    let imgIdx = 1;

    const flushPara = () => {
        if (!para.length) return;
        gap(2);
        out.push(para.map(inline).join("<br>"));
        para = [];
    };
    const closeList = () => {
        if (listType) {
            out.push(`</${listType}>`);
            listType = null;
        }
    };

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) {
            flushPara();
            closeList();
            continue;
        }
        if (/^---+$/.test(line)) {
            flushPara();
            closeList();
            gap(2);
            out.push("<hr>");
            continue;
        }
        const h = line.match(/^#{2,3}\s+(.*)$/);
        if (h) {
            flushPara();
            closeList();
            // 소제목 앞에 남은 카드 이미지를 하나씩 끼워 넣는다
            if (imageUrls[imgIdx]) {
                gap(2);
                out.push(`<p><img src="${imageUrls[imgIdx]}" style="max-width:100%;" /></p>`);
                imgIdx++;
            }
            gap(2);
            out.push(`<p style="${headingStyle(18)}">${inline(h[1])}</p>`);
            gap(1);
            continue;
        }
        const ol = line.match(/^\d+\.\s+(.*)$/);
        const ul = line.match(/^[-·]\s+(.*)$/);
        if (ol || ul) {
            flushPara();
            const want = ol ? "ol" : "ul";
            if (listType !== want) {
                closeList();
                gap(1);
                out.push(`<${want}>`);
                listType = want;
            }
            out.push(`<li>${inline(ol ? ol[1] : ul[1])}</li>`);
            continue;
        }
        if (listType) closeList();
        para.push(line);
    }
    flushPara();
    closeList();

    // 남은 이미지는 글 끝에
    for (; imgIdx < imageUrls.length; imgIdx++) {
        gap(2);
        out.push(`<p><img src="${imageUrls[imgIdx]}" style="max-width:100%;" /></p>`);
    }

    return out.join("\n");
}

// ── 크롬 ──────────────────────────────────────────────────────────

async function openProfile(profileDir) {
    const { chromium } = await import("playwright-core");
    const full = path.join(CHROME_USER_DATA, profileDir);
    if (!fs.existsSync(full)) {
        throw new Error(`크롬 프로필을 찾을 수 없습니다: ${full}`);
    }
    // Playwright는 User Data 루트를 받고, 프로필은 인자로 고른다.
    return chromium.launchPersistentContext(CHROME_USER_DATA, {
        channel: "chrome",
        headless: false,
        viewport: null,
        args: [`--profile-directory=${profileDir}`],
    });
}

async function gotoWritePage(page, blogId) {
    const url = blogId
        ? `https://blog.naver.com/${blogId}?Redirect=Write`
        : "https://blog.naver.com/GoBlogWrite.naver";
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
}

// ── 명령 ──────────────────────────────────────────────────────────

async function cmdList() {
    const { posts } = await api("/api/admin/blog-posts?status=ready");
    if (!posts.length) return console.log("발행 대기 중인 원고가 없습니다.");
    console.log(`발행 대기 ${posts.length}건\n`);
    for (const p of posts) {
        console.log(`  ${p.id}`);
        console.log(`    ${p.title}`);
        console.log(`    카드 ${(p.card_images || []).length}장 · ${p.field || "-"}\n`);
    }
}

async function loadJob(postId) {
    const { posts } = await api(`/api/admin/blog-posts?`);
    const post = posts.find((p) => p.id === postId);
    if (!post) throw new Error(`원고를 찾을 수 없습니다: ${postId}`);

    const { profiles } = await api("/api/admin/blog-settings");
    const profile = profiles.find((p) => p.id === post.profile_id);
    if (!profile) throw new Error("변호사 설정을 찾을 수 없습니다.");
    if (!profile.chromeProfile) {
        throw new Error(`${profile.lawyerName}에 크롬 프로필이 지정되지 않았습니다. 발행 설정에서 먼저 지정하세요.`);
    }
    return { post, profile };
}

async function cmdInspect(postId) {
    const { profile } = await loadJob(postId);
    console.log(`프로필 ${profile.chromeProfile} (${profile.lawyerName}) 로 엽니다…`);

    const ctx = await openProfile(profile.chromeProfile);
    const page = ctx.pages()[0] || (await ctx.newPage());
    await gotoWritePage(page, profile.naverBlogId);

    // 편집기가 iframe 안에 있는지, 어떤 요소가 입력 대상인지 훑는다
    const report = await page.evaluate(() => {
        const frames = [...document.querySelectorAll("iframe")].map((f) => ({
            id: f.id,
            name: f.name,
            src: (f.src || "").slice(0, 120),
        }));
        const editable = [...document.querySelectorAll('[contenteditable="true"]')].map((e) => ({
            tag: e.tagName,
            cls: (e.className || "").toString().slice(0, 90),
        }));
        const buttons = [...document.querySelectorAll("button, a[role=button]")]
            .map((b) => (b.innerText || "").trim())
            .filter((t) => t && t.length < 12)
            .slice(0, 40);
        return { url: location.href, title: document.title, frames, editable, buttons };
    });

    console.log("\n── 페이지 ──");
    console.log(report.url);
    console.log(report.title);
    console.log("\n── iframe ──");
    report.frames.forEach((f) => console.log(`  #${f.id || "-"} name=${f.name || "-"} ${f.src}`));
    console.log("\n── contenteditable ──");
    report.editable.forEach((e) => console.log(`  <${e.tag}> ${e.cls}`));
    console.log("\n── 버튼 ──");
    console.log("  " + report.buttons.join(" | "));
    console.log("\n창을 열어두었습니다. 확인 후 직접 닫으세요.");
}

async function cmdRun(postId, dry) {
    const { post, profile } = await loadJob(postId);
    const html = toNaverHtml(post.body, post.title, (post.card_images || []).map((c) => c.url));

    console.log(`${profile.lawyerName} · ${profile.chromeProfile}`);
    console.log(`제목: ${post.title}`);
    console.log(`카드: ${(post.card_images || []).length}장`);
    console.log(`HTML: ${html.length}자\n`);

    await api("/api/admin/blog-posts", {
        method: "PATCH",
        body: JSON.stringify({ id: post.id, status: "publishing" }),
    });

    const ctx = await openProfile(profile.chromeProfile);
    try {
        const page = ctx.pages()[0] || (await ctx.newPage());
        await gotoWritePage(page, profile.naverBlogId);

        // 클립보드에 서식 있는 HTML을 싣고 편집기에 붙여넣는다.
        // 붙여넣기가 서식과 이미지를 모두 살린다는 것은 실제 테스트로 확인했다.
        await ctx.grantPermissions(["clipboard-read", "clipboard-write"], {
            origin: "https://blog.naver.com",
        });
        await page.evaluate(async (h) => {
            const item = new ClipboardItem({
                "text/html": new Blob([h], { type: "text/html" }),
                "text/plain": new Blob([h.replace(/<[^>]+>/g, "")], { type: "text/plain" }),
            });
            await navigator.clipboard.write([item]);
        }, html);

        console.log("클립보드에 원고를 실었습니다.");
        console.log("편집기 선택자가 아직 확정되지 않아 여기서 멈춥니다.");
        console.log("→ 열린 창의 본문에 커서를 두고 Ctrl+V 해보세요. 서식이 그대로 들어가면 성공입니다.");
        console.log("→ inspect 결과를 알려주시면 이 뒤(카테고리 지정·발행 클릭)를 채웁니다.\n");

        if (dry) {
            console.log("--dry 이므로 발행하지 않습니다. 창은 열어둡니다.");
            return;
        }

        // TODO: inspect 결과가 나오면 아래를 채운다
        //   1) 제목 입력칸 클릭 후 title 입력
        //   2) 본문 클릭 후 Ctrl+V
        //   3) 발행 버튼 → 카테고리 선택 → 확인
        //   4) 발행된 URL 회수
        console.log("발행 단계는 아직 비어 있습니다. 상태를 ready로 되돌립니다.");
        await api("/api/admin/blog-posts", {
            method: "PATCH",
            body: JSON.stringify({ id: post.id, status: "ready" }),
        });
    } catch (e) {
        await api("/api/admin/blog-posts", {
            method: "PATCH",
            body: JSON.stringify({ id: post.id, status: "failed", error: String(e.message || e) }),
        });
        throw e;
    }
}

// ── 진입점 ────────────────────────────────────────────────────────

loadEnv();
const [cmd, arg] = process.argv.slice(2);
const dry = process.argv.includes("--dry");

try {
    if (cmd === "list") await cmdList();
    else if (cmd === "inspect" && arg) await cmdInspect(arg);
    else if (cmd === "run" && arg) await cmdRun(arg, dry);
    else {
        console.log("사용법:");
        console.log("  node publisher/publish.mjs list");
        console.log("  node publisher/publish.mjs inspect <postId>");
        console.log("  node publisher/publish.mjs run <postId> [--dry]");
    }
} catch (e) {
    console.error("\n오류:", e.message || e);
    process.exit(1);
}
