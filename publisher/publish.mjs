// ─── 네이버 블로그 로컬 발행기 ───
//
// 사장님 PC에서만 돈다. 서버는 이 코드를 실행하지 않는다.
// 로그인은 하지 않는다 — 이미 로그인된 크롬 프로필을 그대로 열어 쓴다.
//
// 사용법
//   node publisher/publish.mjs list                 발행 대기 목록
//   node publisher/publish.mjs run <postId>         발행
//   node publisher/publish.mjs run <postId> --dry   발행 버튼 직전까지만
//   node publisher/publish.mjs inspect <postId>     편집기 구조 덤프 (실패 시 진단용)
//   node publisher/publish.mjs watch                상주 모드 — 승인(approved)된 원고를
//                                                   자동으로 집어가 발행한다 (블로그 공장)
//
// watch 환경변수
//   PUBLISH_HOURS=9-18     발행 허용 시간대 (기본 9-18, KST)
//   PUBLISH_GAP_MIN=5-15   발행 간 간격(분, 랜덤 범위 — 계정 보호)
//
// 전제: 대상 크롬 프로필 창을 먼저 닫아야 한다. 크롬이 프로필을 잠근다.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ── 설정 ──────────────────────────────────────────────────────────

const ROOT = path.resolve(
    path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"),
    ".."
);
const CHROME_USER_DATA = path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data");

function loadEnv() {
    const f = path.join(ROOT, ".env.local");
    if (!fs.existsSync(f)) throw new Error(".env.local을 찾을 수 없습니다: " + f);
    for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Za-z_0-9]+)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
}

// Supabase를 직접 읽고 쓴다. 관리자 토큰이 필요 없어 프로덕션 값과 맞출 일이 없다.
function db(pathname, init = {}) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase 설정이 .env.local에 없습니다.");
    return fetch(url + "/rest/v1/" + pathname, {
        ...init,
        headers: {
            apikey: key,
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
    }).then(async (r) => {
        const text = await r.text();
        if (!r.ok) throw new Error(`DB ${r.status}: ${text.slice(0, 200)}`);
        return text ? JSON.parse(text) : null;
    });
}

// ── 원고 → 네이버 HTML ────────────────────────────────────────────
// lib/blog-naver-html.ts와 같은 규칙. 붙여넣기 테스트로 확인한 것만 쓴다.
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

function toNaverHtml(body, imageUrls = []) {
    const out = [];
    const gap = (n) => {
        if (!out.length) return;
        let have = 0;
        while (have < out.length && out[out.length - 1 - have] === "<br>") have++;
        for (let i = have; i < n; i++) out.push("<br>");
    };

    let imgIdx = 0;
    if (imageUrls[0]) {
        out.push(`<p><img src="${imageUrls[0]}" style="max-width:100%;" /></p>`);
        imgIdx = 1;
    }

    let para = [];
    let listType = null;
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

    for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
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
    if (!fs.existsSync(full)) throw new Error(`크롬 프로필을 찾을 수 없습니다: ${full}`);

    try {
        return await chromium.launchPersistentContext(CHROME_USER_DATA, {
            channel: "chrome",
            headless: false,
            viewport: null,
            args: [`--profile-directory=${profileDir}`],
        });
    } catch (e) {
        if (/lock|in use|ProcessSingleton/i.test(String(e))) {
            throw new Error(
                `크롬이 실행 중이라 프로필을 열 수 없습니다.\n  ${profileDir} 프로필로 열려 있는 크롬 창을 모두 닫고 다시 실행하세요.`
            );
        }
        throw e;
    }
}

// 스마트에디터는 iframe 안에 있다. 모든 프레임에서 후보를 찾는다.
async function findEditor(page) {
    for (let attempt = 0; attempt < 20; attempt++) {
        for (const frame of page.frames()) {
            const found = await frame
                .evaluate(() => {
                    const pick = (els) =>
                        els
                            .map((e) => ({ e, r: e.getBoundingClientRect() }))
                            .filter((x) => x.r.width > 200 && x.r.height > 60)
                            .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]?.e;

                    const editables = [...document.querySelectorAll('[contenteditable="true"]')];
                    const body = pick(editables);
                    // 제목은 보통 본문보다 위에 있는 작은 편집 영역이거나 placeholder에 '제목'이 있다
                    const titleEl =
                        document.querySelector('input[placeholder*="제목"], textarea[placeholder*="제목"]') ||
                        editables.find((e) => {
                            const t = (e.getAttribute("data-placeholder") || e.textContent || "").trim();
                            return /제목/.test(t);
                        }) ||
                        editables.find((e) => e !== body && e.getBoundingClientRect().top < (body?.getBoundingClientRect().top ?? 1e9));

                    if (!body) return null;
                    body.setAttribute("data-mcd-body", "1");
                    if (titleEl) titleEl.setAttribute("data-mcd-title", "1");
                    return { hasTitle: !!titleEl };
                })
                .catch(() => null);

            if (found) return { frame, hasTitle: found.hasTitle };
        }
        await page.waitForTimeout(1000);
    }
    return null;
}

async function findPublishButton(page) {
    for (const frame of page.frames()) {
        const handle = await frame
            .evaluateHandle(() => {
                const cands = [...document.querySelectorAll('button, a, [role="button"]')];
                return (
                    cands.find((b) => /^\s*발행\s*$/.test(b.innerText || "")) ||
                    cands.find((b) => /발행/.test(b.innerText || "")) ||
                    null
                );
            })
            .catch(() => null);
        if (handle) {
            const el = handle.asElement();
            if (el) return { frame, el };
        }
    }
    return null;
}

// ── 작업 ──────────────────────────────────────────────────────────

async function loadJob(postId) {
    const posts = await db(`blog_posts?id=eq.${postId}&select=*`);
    const post = posts?.[0];
    if (!post) throw new Error(`원고를 찾을 수 없습니다: ${postId}`);

    // lawyer_id 는 마이그레이션 014 이후에만 있다 — 없으면 빼고 다시 읽는다
    const profSelect = "id,lawyer_name,chrome_profile,naver_blog_id,naver_category";
    const profs = await db(
        `blog_profiles?id=eq.${post.profile_id}&select=${profSelect},lawyer_id`
    ).catch(() => db(`blog_profiles?id=eq.${post.profile_id}&select=${profSelect}`));
    const profile = profs?.[0];
    if (!profile) throw new Error("변호사 설정을 찾을 수 없습니다.");
    if (!profile.chrome_profile) {
        throw new Error(
            `${String(profile.lawyer_name).split("||")[0]}에 크롬 프로필이 지정되지 않았습니다.\n  /admin/blog-settings 에서 먼저 지정하세요.`
        );
    }
    return { post, profile };
}

const setStatus = (id, patch) =>
    db(`blog_posts?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(patch) });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 맥디 변호사 블로그 반영 (블로그 공장 4단계) ──────────────────
// app/api/admin/blog-posts/sync-site 와 같은 규칙. 발행 성공 직후 호출된다.
// 프로필에 lawyer_id 매핑이 없으면 조용히 건너뛴다(관리 화면에서 연결).

const toSiteMarkdown = (body) =>
    body.replace(/==(.+?)==/g, "**$1**").replace(/__(.+?)__/g, "**$1**");

async function syncSite(post, profile) {
    if (!profile.lawyer_id) return false;
    const excerptSrc = post.body.replace(/[#*_=`>-]/g, "").replace(/\s+/g, " ").trim();
    const row = {
        lawyer_id: profile.lawyer_id,
        channel: "blog",
        title: post.title,
        slug: "bp-" + String(post.id).replace(/-/g, "").slice(0, 12),
        body: toSiteMarkdown(post.body),
        meta_description: excerptSrc.length > 155 ? excerptSrc.slice(0, 154) + "…" : excerptSrc,
        tags: post.field ? [post.field] : [],
        status: "published",
        source_post_id: post.id,
        updated_at: new Date().toISOString(),
    };
    const existing = await db(`contents?source_post_id=eq.${post.id}&select=id`).catch(() => null);
    if (existing && existing[0]) {
        await db(`contents?id=eq.${existing[0].id}`, { method: "PATCH", body: JSON.stringify(row) });
    } else {
        await db("contents", {
            method: "POST",
            body: JSON.stringify(row),
            headers: { Prefer: "return=minimal" },
        });
    }
    await setStatus(post.id, { site_synced_at: new Date().toISOString() });
    return true;
}

async function cmdList() {
    const posts = await db(
        "blog_posts?status=in.(draft,ready,approved)&select=id,title,status,field,card_images,profile_id&order=created_at.desc&limit=30"
    );
    if (!posts.length) return console.log("발행 대기 중인 원고가 없습니다.");
    const profs = await db("blog_profiles?select=id,lawyer_name,chrome_profile");
    const byId = Object.fromEntries(profs.map((p) => [p.id, p]));

    console.log(`대기 ${posts.length}건\n`);
    for (const p of posts) {
        const pr = byId[p.profile_id] || {};
        console.log(`  ${p.id}  [${p.status}]`);
        console.log(`    ${p.title}`);
        console.log(
            `    ${String(pr.lawyer_name || "?").split("||")[0]} · ${pr.chrome_profile || "프로필 미지정"} · 카드 ${(p.card_images || []).length}장\n`
        );
    }
}

async function cmdRun(postId, dry) {
    const { post, profile } = await loadJob(postId);
    const images = (post.card_images || []).map((c) => c.url);
    const html = toNaverHtml(post.body, images);
    const lawyer = String(profile.lawyer_name).split("||")[0];

    console.log(`${lawyer} · ${profile.chrome_profile}`);
    console.log(`제목: ${post.title}`);
    console.log(`카드: ${images.length}장 · HTML ${html.length}자\n`);

    await setStatus(post.id, { status: "publishing" });
    const ctx = await openProfile(profile.chrome_profile);

    try {
        const page = ctx.pages()[0] || (await ctx.newPage());
        await ctx.grantPermissions(["clipboard-read", "clipboard-write"], {
            origin: "https://blog.naver.com",
        });

        const writeUrl = profile.naver_blog_id
            ? `https://blog.naver.com/${profile.naver_blog_id}?Redirect=Write`
            : "https://blog.naver.com/GoBlogWrite.naver";
        console.log("글쓰기 페이지 여는 중…");
        await page.goto(writeUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(4000);

        // 이어쓰기 안내 팝업이 뜨면 취소
        for (const label of ["취소", "아니오"]) {
            const btn = page.locator(`button:has-text("${label}")`).first();
            if (await btn.isVisible().catch(() => false)) {
                await btn.click().catch(() => {});
                await page.waitForTimeout(800);
            }
        }

        console.log("편집기 찾는 중…");
        const editor = await findEditor(page);
        if (!editor) {
            throw new Error(
                "편집기를 찾지 못했습니다.\n  node publisher/publish.mjs inspect " +
                    postId +
                    " 을 실행해 구조를 확인하세요."
            );
        }
        console.log(`  찾음 (제목칸 ${editor.hasTitle ? "있음" : "없음"})`);

        // 제목
        if (editor.hasTitle) {
            const t = editor.frame.locator("[data-mcd-title]").first();
            await t.click();
            await page.waitForTimeout(300);
            await page.keyboard.type(post.title, { delay: 15 });
            console.log("제목 입력 완료");
        } else {
            console.log("⚠ 제목칸을 못 찾아 본문 맨 위에 제목을 넣습니다.");
        }

        // 본문 — 클립보드에 서식 있는 HTML을 싣고 붙여넣는다
        const bodyHtml = editor.hasTitle
            ? html
            : `<p style="${headingStyle(20)}">${inline(post.title)}</p>\n<br>\n${html}`;

        await page.evaluate(async (h) => {
            const item = new ClipboardItem({
                "text/html": new Blob([h], { type: "text/html" }),
                "text/plain": new Blob([h.replace(/<[^>]+>/g, " ")], { type: "text/plain" }),
            });
            await navigator.clipboard.write([item]);
        }, bodyHtml);

        const b = editor.frame.locator("[data-mcd-body]").first();
        await b.click();
        await page.waitForTimeout(500);
        await page.keyboard.press("Control+V");
        console.log("본문 붙여넣기 완료. 이미지 업로드를 기다립니다…");
        await page.waitForTimeout(Math.max(6000, images.length * 4000));

        if (dry) {
            console.log("\n--dry 이므로 발행하지 않습니다. 창을 열어두니 확인해보세요.");
            await setStatus(post.id, { status: "ready" });
            return;
        }

        // 발행
        console.log("발행 버튼 찾는 중…");
        const pub = await findPublishButton(page);
        if (!pub) {
            throw new Error("발행 버튼을 찾지 못했습니다. --dry 로 확인 후 알려주세요.");
        }
        await pub.el.click();
        await page.waitForTimeout(2500);

        // 발행 설정 창에서 카테고리 선택 (있을 때만)
        if (profile.naver_category) {
            const cat = page.locator(`text="${profile.naver_category}"`).first();
            if (await cat.isVisible().catch(() => false)) {
                await cat.click().catch(() => {});
                await page.waitForTimeout(600);
                console.log(`카테고리 지정: ${profile.naver_category}`);
            }
        }

        // 최종 발행 확인
        const confirm = await findPublishButton(page);
        if (confirm) {
            await confirm.el.click();
            console.log("발행 클릭. 결과를 기다립니다…");
        }

        await page.waitForTimeout(8000);
        const finalUrl = page.url();
        const published = /blog\.naver\.com\/[^/]+\/\d+/.test(finalUrl);

        if (published) {
            await setStatus(post.id, {
                status: "published",
                naver_url: finalUrl,
                published_at: new Date().toISOString(),
                error: null,
            });
            console.log(`\n✔ 발행 완료\n  ${finalUrl}`);

            // 맥디 변호사 블로그에도 반영 — 실패해도 발행 결과는 유지한다
            try {
                const synced = await syncSite(post, profile);
                console.log(synced ? "✔ 맥디 블로그 반영 완료" : "· 맥디 변호사 미연결 — 반영 건너뜀");
            } catch (e) {
                console.error("⚠ 맥디 블로그 반영 실패: " + (e.message || e));
            }
        } else {
            await setStatus(post.id, { status: "ready" });
            console.log(`\n발행 여부를 확인하지 못했습니다. 창에서 직접 확인해주세요.\n  현재 주소: ${finalUrl}`);
        }
    } catch (e) {
        await setStatus(post.id, { status: "failed", error: String(e.message || e).slice(0, 500) });
        throw e;
    }
}

async function cmdInspect(postId) {
    const { profile } = await loadJob(postId);
    const ctx = await openProfile(profile.chrome_profile);
    const page = ctx.pages()[0] || (await ctx.newPage());
    const url = profile.naver_blog_id
        ? `https://blog.naver.com/${profile.naver_blog_id}?Redirect=Write`
        : "https://blog.naver.com/GoBlogWrite.naver";
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    for (const frame of page.frames()) {
        const r = await frame
            .evaluate(() => ({
                url: location.href.slice(0, 100),
                editable: [...document.querySelectorAll('[contenteditable="true"]')].map((e) => {
                    const b = e.getBoundingClientRect();
                    return `${e.tagName}.${(e.className || "").toString().split(" ")[0]} ${Math.round(b.width)}x${Math.round(b.height)} ph="${e.getAttribute("data-placeholder") || ""}"`;
                }),
                inputs: [...document.querySelectorAll("input,textarea")]
                    .map((e) => `${e.tagName} ph="${e.placeholder || ""}"`)
                    .slice(0, 10),
                buttons: [...document.querySelectorAll('button,a,[role="button"]')]
                    .map((b) => (b.innerText || "").trim())
                    .filter((t) => t && t.length < 12)
                    .slice(0, 30),
            }))
            .catch(() => null);
        if (!r || (!r.editable.length && !r.buttons.length)) continue;
        console.log(`\n── 프레임 ${r.url}`);
        if (r.editable.length) console.log("  편집영역: " + r.editable.join(" | "));
        if (r.inputs.length) console.log("  입력칸  : " + r.inputs.join(" | "));
        if (r.buttons.length) console.log("  버튼    : " + r.buttons.join(" | "));
    }
    console.log("\n창을 열어두었습니다. 확인 후 직접 닫으세요.");
}

// ── watch — 승인된 원고를 상주하며 자동 발행 (블로그 공장) ───────

function parseRange(str, defA, defB) {
    const m = String(str || "").match(/^(\d+)\s*-\s*(\d+)$/);
    return m ? [Number(m[1]), Number(m[2])] : [defA, defB];
}

async function cmdWatch() {
    const [h0, h1] = parseRange(process.env.PUBLISH_HOURS, 9, 18);
    const [g0, g1] = parseRange(process.env.PUBLISH_GAP_MIN, 5, 15);
    console.log(`watch 시작 — 발행 시간대 ${h0}~${h1}시(KST), 발행 간격 ${g0}~${g1}분`);
    console.log("승인(approved)된 원고를 오래된 것부터 하나씩 발행합니다. Ctrl+C 로 종료.\n");

    for (;;) {
        const kstHour = new Date(Date.now() + 9 * 3600e3).getUTCHours();
        if (kstHour < h0 || kstHour >= h1) {
            await sleep(5 * 60e3);
            continue;
        }

        const posts = await db(
            "blog_posts?status=eq.approved&select=id,title&order=created_at.asc&limit=1"
        ).catch((e) => {
            console.error("조회 실패: " + (e.message || e));
            return null;
        });

        if (!posts || posts.length === 0) {
            await sleep(30e3);
            continue;
        }

        console.log(`\n[watch] 발행 시작: ${posts[0].title}`);
        try {
            await cmdRun(posts[0].id, false);
        } catch (e) {
            // cmdRun 이 이미 failed 로 기록했다 — 다음 건으로 넘어간다
            console.error("[watch] 실패: " + (e.message || e));
        }

        const gap = (g0 + Math.random() * Math.max(0, g1 - g0)) * 60e3;
        console.log(`[watch] 다음 발행까지 ${(gap / 60000).toFixed(1)}분 대기 (계정 보호)`);
        await sleep(gap);
    }
}

// ── 진입점 ────────────────────────────────────────────────────────

loadEnv();
const [cmd, arg] = process.argv.slice(2);
const dry = process.argv.includes("--dry");

try {
    if (cmd === "list") await cmdList();
    else if (cmd === "run" && arg) await cmdRun(arg, dry);
    else if (cmd === "inspect" && arg) await cmdInspect(arg);
    else if (cmd === "watch") await cmdWatch();
    else {
        console.log("사용법:");
        console.log("  node publisher/publish.mjs list");
        console.log("  node publisher/publish.mjs run <postId> [--dry]");
        console.log("  node publisher/publish.mjs inspect <postId>");
        console.log("  node publisher/publish.mjs watch");
    }
} catch (e) {
    console.error("\n오류: " + (e.message || e));
    process.exit(1);
}
