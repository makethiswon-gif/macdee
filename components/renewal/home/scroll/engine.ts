// 스크롤 홈 — 스크롤 엔진. 스크롤 위치 하나로 (1) 3D '1'의 자세, (2) 뒤 판 색, (3) 글 덩어리의 등장·퇴장, (4) 고정 구역 연출을 모두 정한다.
// 요소는 data-* 속성으로 찾는다(home-scroll.module.css 의 클래스 이름은 빌드 때 바뀐다).
import { createOne, type OneApi, type OneTarget } from "./one3d";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (t: number) => t * t * (3 - 2 * t);
const ramp = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pad3 = (n: number) => String(n).padStart(3, "0");
const TAU = Math.PI * 2;
const COL: Record<string, number[]> = { b: [0, 74, 173], w: [255, 255, 255], p: [241, 241, 234] };

// '1'의 자세표. s = 구역 id, f = 그 구역 안에서의 진행(0~1, 고정 구역은 0.1~0.9 가 고정된 동안)
// d = 넓은 화면 [가로, 세로(-1~1, 화면 중심 기준), 키(화면 높이 대비)], m = 좁은 화면 [가로, 세로, 너비(화면 너비 대비)]
interface Key { s: string; f: number; d: number[]; m: number[]; ry: number; rx?: number; rz?: number; ex?: number; op?: number }
const K: Key[] = [
    { s: "home", f: 0.5, d: [0.52, -0.02, 0.78], m: [0.06, 0.0, 0.5], ry: -0.5, rx: 0.05 },                          // 첫 화면: 오른쪽에 서 있다
    { s: "home", f: 1.0, d: [0.46, 0, 0.7], m: [0, -0.2, 0.46], ry: 0.15, rx: 0.08 },
    { s: "one", f: 0.1, d: [0.42, -0.02, 0.64], m: [0, -0.46, 0.4], ry: 0.6, rx: 0.1, ex: 0.08 },                    // 하나로: 여섯 조각으로 흩어진다
    { s: "one", f: 0.3, d: [0.5, -0.02, 0.47], m: [0, -0.5, 0.3], ry: 1.5, rx: 0.16, ex: 1 },
    { s: "one", f: 0.52, d: [0.5, -0.02, 0.47], m: [0, -0.5, 0.3], ry: 2.5, rx: 0.12, ex: 1 },
    { s: "one", f: 0.74, d: [0.42, -0.02, 0.68], m: [0, -0.48, 0.4], ry: TAU - 0.55, rx: 0.05 },                     // 다시 하나로 모인다
    { s: "one", f: 0.9, d: [0.44, -0.02, 0.72], m: [0, -0.48, 0.42], ry: TAU - 0.4, rx: 0.05 },
    { s: "scope", f: 0.14, d: [0.66, -0.44, 1.22], m: [0.55, -0.4, 1.0], ry: TAU + 0.3 },                             // 워크플로우: 가까이 다가가 위에서 아래로 훑는다
    { s: "scope", f: 0.9, d: [0.66, 0.44, 1.22], m: [0.55, 0.4, 1.0], ry: TAU + 1.7 },
    { s: "cases", f: 0.1, d: [0.7, -0.04, 0.9], m: [0.5, -0.56, 0.46], ry: TAU + 2.6, rx: 0.1, rz: 0.2 },             // 기록: 한 건마다 돌아선다
    { s: "cases", f: 0.9, d: [0.7, -0.04, 0.9], m: [0.5, -0.56, 0.46], ry: TAU * 2 + 1.6, rx: 0.1, rz: -0.16 },
    { s: "system", f: 0.3, d: [0.8, 0.1, 1.3], m: [0.66, 0.2, 0.9], ry: TAU * 2 + 2.6, rz: -0.5, op: 0.8 },           // 구조: 기울어진 큰 덩어리
    { s: "system", f: 0.85, d: [0.78, -0.2, 1.22], m: [0.66, -0.2, 0.85], ry: TAU * 2 + 3.6, rz: -0.8, op: 0.8 },
    { s: "clients", f: 0.3, d: [0.1, -0.7, 0.72], m: [0, -0.74, 0.46], ry: TAU * 2 + 4.6, rz: -TAU / 4 },             // 이름: 누워서 구른다
    { s: "clients", f: 0.85, d: [0.32, -0.7, 0.72], m: [0.1, -0.74, 0.46], ry: TAU * 3 + 2.2, rz: -TAU / 4 },
    { s: "team", f: 0.3, d: [0.74, 0, 0.84], m: [0.62, 0, 0.6], ry: TAU * 3 + 3.2, rx: 0.05 },                        // 사람: 다시 일어선다
    { s: "team", f: 0.9, d: [0.74, -0.08, 0.9], m: [0.62, -0.1, 0.6], ry: TAU * 3 + 4.6, rx: 0.05 },
    { s: "plans", f: 0.45, d: [0.82, 0, 1.2], m: [0.7, 0, 0.9], ry: TAU * 4 - 1.0, rz: 0.12 },                        // 비용: 오른쪽 가장자리
    { s: "insights", f: 0.5, d: [0.82, -0.08, 0.95], m: [0.7, -0.3, 0.7], ry: TAU * 4 + 0.9, rz: -0.14, op: 0.9 },    // 매거진
    { s: "contact", f: 0.45, d: [0.5, 0.02, 0.84], m: [0.3, -0.36, 0.5], ry: TAU * 5 - 0.5, rx: 0.05 },               // 문의: 첫 화면 자세로 돌아온다
    { s: "contact", f: 1.0, d: [0.5, 0.02, 0.84], m: [0.3, -0.36, 0.5], ry: TAU * 5 - 0.4, rx: 0.05 },
];

interface Sec { el: HTMLElement; i: number; id: string; top: number; h: number; pin: boolean; light: number; col: number[] }
interface Fx { el: HTMLElement; kind: string; top: number; h: number; e: number; x: number; gh: HTMLElement | null; svc: number }
interface Pose { x: number; y: number; k: number; ry: number; rx: number; rz: number; ex: number; op: number }

export function startHomeScroll(root: HTMLElement): () => void {
    const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
    const qa = <T extends HTMLElement = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
    const html = document.documentElement, body = document.body;
    const w = window as unknown as { __hsUp?: boolean };
    const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mq = window.matchMedia("(max-width: 860px)");

    const bg = q("[data-hs-bg]"), glow = q("[data-hs-glow]"), gb = q("[data-hs-gb]"), gl = q("[data-hs-gl]");
    const cv = q<HTMLCanvasElement>("canvas[data-hs-c3d]");
    const side = qa("[data-hs-side] a"), pct = q("[data-hs-pct]"), pctB = q("[data-hs-pct] b"), preB = q("[data-hs-pre]"), labs = qa("[data-hs-lab]");
    const oneL = q("[data-hs-one]"), before = q("[data-hs-before]"), afters = qa("[data-hs-after] li");
    const recH = q("[data-hs-rech]"), track = q("[data-hs-track]"), recN = q("[data-hs-recn]"), recBar = q("[data-hs-recbar]"), recF = q("[data-hs-recf]");
    const labV = labs.map(() => -1);

    let vh = 0, vw = 0, narrow = false, docH = 1, secs: Sec[] = [], fx: Fx[] = [], recMax = 0, recCount = 3;
    let keys: (Key & { at: number })[] = [];
    let sy = window.scrollY, last = performance.now(), time = 0, navOn = -1, ui = "", lastPct = -1, waited = 0, raf = 0, stopped = false;
    let one: OneApi | null = null, oneFailed = false;
    let lastRgb = "";
    root.dataset.on = "true";   // 움직임이 붙었음 — 구역 바탕색을 걷고 고정 뒤 판 하나로 칠한다

    // 인트로: 서버가 넣은 짧은 스크립트가 html 에 hs-intro 를 붙였을 때만(세션 첫 방문) 튼다
    w.__hsUp = true;
    let intro = html.classList.contains("hs-intro") && window.scrollY < 10 && !REDUCED ? 0 : 1, shown = intro >= 1, skip = false;
    if (intro >= 1) html.classList.remove("hs-intro"); else window.scrollTo(0, 0);
    const blockScroll = (e: Event) => { if (intro < 1 && e.cancelable) e.preventDefault(); };
    const blockKeys = (e: KeyboardEvent) => { if (intro < 1 && [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"].includes(e.key)) e.preventDefault(); };
    const skipIntro = () => { skip = true; };
    if (intro < 1) {
        window.addEventListener("wheel", blockScroll, { passive: false });
        window.addEventListener("touchmove", blockScroll, { passive: false });
        window.addEventListener("keydown", blockKeys);
        window.addEventListener("pointerdown", skipIntro);
    }
    const endIntro = () => {
        window.removeEventListener("wheel", blockScroll); window.removeEventListener("touchmove", blockScroll);
        window.removeEventListener("keydown", blockKeys); window.removeEventListener("pointerdown", skipIntro);
        html.classList.remove("hs-intro");
        try { sessionStorage.setItem("hs-intro", "1"); } catch { /* 저장소를 못 쓰는 환경 */ }
    };

    if (cv) createOne(cv, () => !stopped).then((api) => { if (stopped) { api?.dispose(); return; } if (api) one = api; else { oneFailed = true; cv.style.display = "none"; if (glow) glow.style.display = "none"; } });
    else oneFailed = true;

    function docTop(el: HTMLElement | null) { let y = 0; while (el) { y += el.offsetTop; el = el.offsetParent as HTMLElement | null; } return y; }
    function measure() {
        vh = window.innerHeight; vw = window.innerWidth; narrow = mq.matches;
        if (!vh) return;
        docH = html.scrollHeight;
        secs = qa("[data-hs-sec]").map((el, i) => ({ el, i, id: el.id, top: docTop(el), h: el.offsetHeight, pin: el.hasAttribute("data-pin"), light: el.dataset.tone === "b" ? 0 : 1, col: COL[el.dataset.tone || "b"] || COL.b }));
        fx = REDUCED ? [] : qa("[data-fx]").map((el) => ({ el, kind: el.dataset.fx || "up", top: docTop(el), h: el.offsetHeight, e: -1, x: -1, gh: el.querySelector<HTMLElement>("[data-gh]"), svc: el.dataset.svc === undefined ? -1 : Number(el.dataset.svc) }));
        recMax = track ? Math.max(0, track.scrollWidth - track.clientWidth) : 0;
        recCount = track ? Math.max(1, track.children.length) : 1;
        keys = [];
        for (const k of K) { const s = secs.find((x) => x.id === k.s); if (s) keys.push({ ...k, at: s.i + k.f }); }
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!stopped) measure(); });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(root);

    // 스크롤 위치 → 구역 좌표
    function coord(y: number) {
        const c = y + vh / 2;
        for (const s of secs) {
            if (c < s.top + s.h || s.i === secs.length - 1) {
                if (!s.pin) return s.i + clamp((c - s.top) / s.h);
                const pq = (y - s.top) / (s.h - vh);
                if (pq < 0) return s.i + 0.1 * clamp((c - s.top) / (vh / 2));
                if (pq > 1) return s.i + 0.9 + 0.1 * clamp((y - (s.top + s.h - vh)) / (vh / 2));
                return s.i + 0.1 + 0.8 * pq;
            }
        }
        return 0;
    }
    // 구역 좌표 → '1'의 자세
    function pose(p: number): Pose {
        if (keys.length < 2) return { x: 0.5, y: 0, k: 0.7, ry: -0.5, rx: 0, rz: 0, ex: 0, op: 1 };
        let i = 0; while (i < keys.length - 2 && p > keys[i + 1].at) i++;
        const a = keys[i], b = keys[i + 1], lin = clamp((p - a.at) / (b.at - a.at)), t = ss(lin);
        const A = narrow ? a.m : a.d, B = narrow ? b.m : b.d;
        let k = lerp(A[2], B[2], t); if (narrow) k = (k * vw * 1.625) / vh;
        return { x: lerp(A[0], B[0], t), y: lerp(A[1], B[1], t), k, ry: lerp(a.ry, b.ry, lin), rx: lerp(a.rx || 0, b.rx || 0, t), rz: lerp(a.rz || 0, b.rz || 0, t), ex: lerp(a.ex || 0, b.ex || 0, t), op: lerp(a.op ?? 1, b.op ?? 1, t) };
    }
    const pinQ = (id: string) => { const s = secs.find((x) => x.id === id); return s ? (sy - s.top) / (s.h - vh) : -9; };

    function frame(now: number) {
        if (stopped) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
        if (window.innerHeight !== vh || window.innerWidth !== vw) measure();
        if (!vh || !secs.length) return;

        sy += (window.scrollY - sy) * (REDUCED ? 1 : 1 - Math.exp(-dt * 10));
        if (Math.abs(window.scrollY - sy) < 0.1) sy = window.scrollY;
        const p = coord(sy);

        // 뒤 판 색: 구역 경계가 화면 가운데를 지날 때 뒤집힌다
        const c = sy + vh * 0.5;
        let col = secs[0].col, light = secs[0].light;
        for (let i = 1; i < secs.length; i++) {
            const t = ss(ramp(c, secs[i].top - vh * 0.16, secs[i].top + vh * 0.16));
            if (t <= 0) break;
            const to = secs[i].col;
            col = col.map((v, k) => lerp(v, to[k], t)); light = lerp(light, secs[i].light, t);
        }
        const rgb = col.map(Math.round).join(",");
        if (rgb !== lastRgb) { lastRgb = rgb; if (bg) bg.style.backgroundColor = `rgb(${rgb})`; root.style.setProperty("--bgc", rgb); }
        if (gb) gb.style.opacity = (1 - light).toFixed(3);
        if (gl) gl.style.opacity = light.toFixed(3);
        const u = light > 0.5 ? "w" : "b";
        if (u !== ui) { ui = u; root.dataset.ui = u; body.dataset.hsUi = u; }

        // 글 덩어리: 아래에서 떠오르고, 위로 지나가며 사라진다
        const pops = [0, 0, 0, 0, 0, 0];
        for (const f of fx) {
            const t = f.top - sy;
            if (f.svc >= 0 && f.svc < 6) { const d = Math.abs(t + Math.min(f.h, vh * 0.5) * 0.5 - vh * 0.5); pops[5 - f.svc] = ss(clamp(1 - d / (vh * 0.33))); }
            const e = f.kind === "out" ? 1 : ss(ramp(vh * 0.98 - t, 0, vh * 0.26));
            const x = ss(ramp(t + f.h - vh * 0.02, 0, vh * 0.2));
            if (f.gh && e * x > 0) f.gh.style.transform = `translate3d(0,${(((t + f.h / 2 - vh / 2) / vh) * 70).toFixed(1)}px,0)`;
            if (e === f.e && x === f.x) continue;
            f.e = e; f.x = x;
            const st = f.el.style; st.opacity = (e * x).toFixed(3);
            if (f.kind === "title") st.transform = `translate3d(0,${((1 - e) * 44 - (1 - x) * 26).toFixed(1)}px,0) scale(${(lerp(1.2, 1, e) * lerp(0.95, 1, x)).toFixed(4)})`;
            else if (f.kind === "out") st.transform = `translate3d(0,${(-(1 - x) * 46).toFixed(1)}px,0) scale(${lerp(0.96, 1, x).toFixed(4)})`;
            else if (f.kind === "l" || f.kind === "r") st.transform = `translate3d(${((f.kind === "l" ? -1 : 1) * (1 - e) * vw * 0.1).toFixed(1)}px,${(-(1 - x) * 30).toFixed(1)}px,0)`;
            else st.transform = `translate3d(0,${((1 - e) * 48 - (1 - x) * 30).toFixed(1)}px,0)`;
        }

        // 고정 구역 1 — 하나로
        const q1 = pinQ("one");
        if (oneL && q1 > -0.6 && q1 < 1.6) {
            const i1 = ss(ramp(q1, -0.14, 0)), o1 = ss(ramp(q1, 0.95, 1.07));
            oneL.style.opacity = (i1 * (1 - o1)).toFixed(3);
            oneL.style.transform = `translate3d(0,${((1 - i1) * 44 - o1 * 40).toFixed(1)}px,0)`;
            if (before) { before.style.setProperty("--s", ss(ramp(q1, 0.52, 0.68)).toFixed(3)); before.style.setProperty("--o", lerp(1, 0.5, ramp(q1, 0.6, 0.76)).toFixed(3)); }
            afters.forEach((el, i) => el.style.setProperty("--a", ss(ramp(q1, 0.66 + i * 0.05, 0.76 + i * 0.05)).toFixed(3)));
        }
        // 고정 구역 2 — 기록
        const q2 = pinQ("cases");
        if (recH && track && q2 > -0.6 && q2 < 1.6) {
            const i2 = ss(ramp(q2, -0.14, 0)), o2 = ss(ramp(q2, 0.95, 1.07)), v = (i2 * (1 - o2)).toFixed(3), tp = ramp(q2, 0.06, 0.92);
            recH.style.opacity = v; recH.style.transform = `translate3d(0,${((1 - i2) * 44 - o2 * 40).toFixed(1)}px,0)`;
            track.style.opacity = v; track.style.transform = `translate3d(${(-tp * recMax + (1 - i2) * vw * 0.12).toFixed(1)}px,0,0)`;
            if (recF) recF.style.opacity = v;
            if (recBar) recBar.style.setProperty("--p", tp.toFixed(3));
            const n = "0" + (1 + Math.min(recCount - 1, Math.floor(tp * (recCount - 0.001) + 0.3)));
            if (recN && recN.textContent !== n) recN.textContent = n;
        }

        // 왼쪽 내비 · 진행률
        const idx = clamp(Math.floor(p + 0.0001), 0, secs.length - 1);
        if (idx !== navOn) { navOn = idx; const id = secs[idx].id; side.forEach((a) => { a.dataset.on = a.getAttribute("href") === `#${id}` ? "true" : "false"; }); }
        const pc = Math.round(clamp(window.scrollY / Math.max(1, docH - vh)) * 100);
        if (pc !== lastPct) { lastPct = pc; if (pctB) pctB.textContent = pad3(pc); pct?.style.setProperty("--p", (pc / 100).toFixed(2)); }

        // 3D '1'
        let target: Pose = pose(p), rate = 6;
        if (intro < 1) {
            // 인트로: 흩어진 여섯 조각이 1 로 모이고, 첫 화면 자리로 옮겨 간다
            if (one || oneFailed || (waited += dt) > 2.5) intro = Math.min(1, intro + (dt / 2.8) * (skip ? 5 : 1));
            const hp = pose(coord(0)), e = ss(ramp(intro, 0.1, 0.76)), mv = ss(ramp(intro, 0.6, 1));
            target = { x: lerp(0, hp.x, mv), y: lerp(0.02, hp.y, mv), k: lerp(hp.k * 0.8, hp.k, mv), ry: hp.ry - (1 - ss(intro)) * 3.6, rx: hp.rx + (1 - e) * 0.3, rz: 0, ex: 1 - e, op: 1 };
            rate = 14;
            if (preB) preB.textContent = pad3(Math.round(ss(ramp(intro, 0, 0.88)) * 100));
            if (intro >= 0.84 && !shown) { shown = true; html.classList.remove("hs-intro"); }
            if (intro >= 1) endIntro();
        }
        if (one) {
            const t: OneTarget = { ...target, tone: light, pops };
            one.frame(t, dt, time, REDUCED ? 60 : rate);
            const cur = one.cur;
            if (glow) {
                if (!glow.dataset.on) glow.dataset.on = "true";
                const size = cur.k * vh * 1.55 * (1 + cur.ex * 0.5);
                glow.style.transform = `translate3d(${(((cur.x + 1) / 2) * vw - 50).toFixed(1)}px,${(((1 - cur.y) / 2) * vh - 50).toFixed(1)}px,0) scale(${(size / 100).toFixed(3)})`;
            }
            // 흩어진 조각의 이름표
            const lv = intro >= 1 && q1 > -0.4 && q1 < 1.2 ? ss(ramp(cur.ex, 0.45, 0.85)) : 0;
            labs.forEach((el, i) => {
                if (lv < 0.004) { if (labV[i] !== 0) { el.style.opacity = "0"; labV[i] = 0; } return; }
                const pr = one!.proj[5 - i]; labV[i] = lv; el.style.opacity = lv.toFixed(3);
                el.style.transform = `translate3d(${pr.x.toFixed(1)}px,${pr.y.toFixed(1)}px,0) translate(-50%,-50%)`;
            });
        }
    }
    raf = requestAnimationFrame(frame);

    // 왼쪽 내비·이 페이지 안 주소(#구역): 부드럽게 이동
    const onClick = (e: MouseEvent) => {
        const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
        if (!a || !root.contains(a)) return;
        const s = secs.find((x) => x.id === a.getAttribute("href")!.slice(1)); if (!s) return;
        e.preventDefault();
        window.scrollTo({ top: s.i === 0 ? 0 : s.top + 2, behavior: REDUCED ? "auto" : "smooth" });
    };
    root.addEventListener("click", onClick);

    return () => {
        stopped = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", measure); window.removeEventListener("load", measure);
        window.removeEventListener("wheel", blockScroll); window.removeEventListener("touchmove", blockScroll);
        window.removeEventListener("keydown", blockKeys); window.removeEventListener("pointerdown", skipIntro);
        root.removeEventListener("click", onClick);
        ro?.disconnect();
        one?.dispose(); one = null;
        html.classList.remove("hs-intro");
        delete body.dataset.hsUi;
        delete root.dataset.on;
    };
}
