"use client";

import { useEffect, useRef } from "react";

// 인트로 — "여섯 개의 실이 하나의 실이 된다" (ONE BLUE THREAD 의 탄생).
//
// 어둠 속에서 여섯 개의 빛 실(광고·블로그·검색·AI 검색·홈페이지·상담 데이터)이
// 제각각의 궤적을 그리며 배회한다. 진행에 따라 서로 다른 색·서로 다른 리듬이
// 하나의 궤도로 동기화되고(색도 브랜드 블루로 수렴), 여섯 머리가 한 점으로
// 합쳐진 뒤, 그 하나의 실이 화면 중앙에 조용히 한 획을 긋는다 —
// "따로 하던 마케팅을 한 팀으로. MAKETHIS1." 이 획이 페이지 전체를 관통하는
// 파란 실의 시작이다.
//
// 진행 엔진: 자동으로도 짧게 끝나고(약 7초), 스크롤을 내리면 가속·역스크롤 역행.
// 클릭/키/건너뛰기 = 즉시 스킵. 같은 세션에서는 한 번만 재생.
// 재생 여부는 HeroSection 의 프리페인트 스크립트(html[data-intro="play"],
// reduced-motion 제외)가 정한다. 아래 홈은 인트로와 무관하게 항상 완성 상태다.
//
// 렌더링: 트레일은 반투명 덮기(잔광), 곡선은 고정 시간步(1/120s) 서브스텝으로
// 이어 그린다 — rAF 가 스로틀되는 환경에서도 궤적이 끊기지 않는다.

const BG = "#050a12";
const AC = { r: 138, g: 180, b: 248 }; // 브랜드 블루(다크 위)

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fract = (n: number) => n - Math.floor(n);
const rnd = (i: number, a: number) => fract(Math.sin(i * 127.3 + a * 311.7) * 43758.5453);

const THREADS = [
    { label: "광고", color: { r: 224, g: 160, b: 150 } },
    { label: "블로그", color: { r: 200, g: 178, b: 120 } },
    { label: "네이버·Google 검색", color: { r: 140, g: 210, b: 190 } },
    { label: "AI 검색", color: { r: 170, g: 150, b: 224 } },
    { label: "홈페이지", color: { r: 150, g: 196, b: 220 } },
    { label: "상담 데이터", color: { r: 190, g: 190, b: 200 } },
];
// 배회 중심 오프셋 — 라벨이 서로 겹치지 않게 화면을 나눠 가진다
const CENTERS = [
    { x: -0.26, y: -0.2 },
    { x: 0.24, y: -0.24 },
    { x: -0.3, y: 0.12 },
    { x: 0.3, y: 0.1 },
    { x: -0.06, y: 0.26 },
    { x: 0.08, y: -0.02 },
];

const FADE_MS = 900;
const AUTO_SECONDS = 7; // 손대지 않았을 때 총 길이
const SCROLL_TOTAL = 1100; // 이만큼 스크롤하면 즉시 100%
const H_STEP = 1 / 120; // 궤적 적분 시간步

export default function IntroScreen() {
    const layerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const html = document.documentElement;
        const layer = layerRef.current;
        const canvas = canvasRef.current;
        if (html.getAttribute("data-intro") !== "play" || !layer || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            html.removeAttribute("data-intro");
            return;
        }

        const fin = layer.querySelector<HTMLElement>(".mt-iflow-fin");
        const hint = layer.querySelector<HTMLElement>(".mt-ione-skip");

        const DPR = Math.min(devicePixelRatio || 1, 2);
        let W = innerWidth;
        let H = innerHeight;
        let small = W < 768;
        const fit = () => {
            W = innerWidth;
            H = innerHeight;
            small = W < 768;
            canvas.width = W * DPR;
            canvas.height = H * DPR;
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, W, H);
        };
        fit();

        const N = THREADS.length;
        // 스레드별 배회 파라미터(시드 고정 — 리사이즈에도 궤적 성격 유지)
        const P = THREADS.map((_, i) => ({
            a1: 0.35 + rnd(i, 1) * 0.4,
            a2: 0.7 + rnd(i, 2) * 0.6,
            b1: 0.3 + rnd(i, 3) * 0.4,
            b2: 0.8 + rnd(i, 4) * 0.5,
            p1: rnd(i, 5) * 6.283,
            p2: rnd(i, 6) * 6.283,
            q1: rnd(i, 7) * 6.283,
            q2: rnd(i, 8) * 6.283,
        }));

        // 배회 위치 — 서로 다른 리듬의 리사주 곡선
        const chaos = (i: number, t: number) => {
            const p = P[i];
            const cx = W * (0.5 + CENTERS[i].x * (small ? 0.8 : 1));
            const cy = H * (0.5 + CENTERS[i].y * (small ? 0.9 : 1));
            return {
                x: cx + W * 0.13 * Math.sin(p.a1 * t + p.p1) + W * 0.055 * Math.sin(p.a2 * t + p.p2),
                y: cy + H * 0.11 * Math.sin(p.b1 * t + p.q1) + H * 0.05 * Math.sin(p.b2 * t + p.q2),
            };
        };
        // 공동 궤도 — merge 가 진행되면 위상차가 0 으로 줄어 한 점이 된다
        const orbit = (i: number, t: number, m: number) => {
            const th = t * 1.1 + (i / N) * 6.283 * (1 - m);
            const Rx = W * (small ? 0.3 : 0.24);
            const Ry = H * (small ? 0.13 : 0.2);
            return { x: W / 2 + Rx * Math.cos(th), y: H / 2 + Ry * Math.sin(th) };
        };

        let F = 0;
        let simT = 0;
        let done = false;
        let finishing = false;
        let raf = 0;
        let last = performance.now();
        const start = last;
        const TAIL = 200; // 꼬리 길이(서브스텝 수) ≈ 1.7초
        const hist: number[][] = Array.from({ length: N }, () => []);
        const timers: ReturnType<typeof setTimeout>[] = [];

        const cleanup = () => {
            cancelAnimationFrame(raf);
            timers.forEach(clearTimeout);
            layer.removeEventListener("wheel", onWheel);
            layer.removeEventListener("touchstart", onTouchStart);
            layer.removeEventListener("touchmove", onTouchMove);
            layer.removeEventListener("pointerdown", onDown);
            removeEventListener("keydown", onKey);
            removeEventListener("resize", fit);
        };

        const fadeOut = () => {
            layer.classList.add("mt-ione-out");
            timers.push(setTimeout(() => html.removeAttribute("data-intro"), FADE_MS));
        };
        const skip = () => {
            if (done) return;
            done = true;
            cleanup();
            fadeOut();
        };
        const finish = () => {
            if (finishing) return;
            finishing = true;
            fin?.classList.add("mt-iflow-fin-on");
            // 획이 남은 채 카피를 읽을 시간을 준 뒤 페이드
            timers.push(
                setTimeout(() => {
                    done = true;
                    cleanup();
                    fadeOut();
                }, 1700)
            );
        };

        const add = (px: number) => {
            if (finishing) return;
            F = clamp(F + px / SCROLL_TOTAL, 0, 1);
        };
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            add(e.deltaY);
        };
        let touchY = 0;
        const onTouchStart = (e: TouchEvent) => {
            touchY = e.touches[0]?.clientY ?? 0;
        };
        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            const y = e.touches[0]?.clientY ?? touchY;
            add((touchY - y) * 1.8);
            touchY = y;
        };
        const onDown = (e: Event) => {
            if ((e.target as HTMLElement).closest?.(".mt-ibrk-skip")) return;
            skip();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") skip();
        };

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            const dtWall = (now - last) / 1000;
            last = now;
            // 진행(F)은 벽시계 그대로 — rAF 가 수 초 간격으로 스로틀돼도
            // 인트로는 실시간(약 7초)에 끝난다. 궤적 적분만 2초 상한.
            const dt = Math.min(2, dtWall);
            const t = (now - start) / 1000;
            if (t > 0.4 && !finishing) F = clamp(F + Math.min(8, dtWall) / AUTO_SECONDS, 0, 1);
            if (hint) {
                // 등장 keyframe(fill:both)이 인라인 opacity 를 이기므로 함께 끈다
                if (F > 0.2) {
                    hint.style.animation = "none";
                    hint.style.opacity = "0";
                } else {
                    hint.style.animation = "";
                    hint.style.opacity = "";
                }
            }

            const strokeP = easeInOut(seg(F, 0.84, 0.98));
            const m = easeInOut(seg(F, 0.55, 0.76)); // 위상 동기화(합체)
            const glide = easeInOut(seg(F, 0.76, 0.84)); // 궤도 → 획 시작점
            const L = small ? W * 0.74 : Math.min(560, W * 0.56);
            const sx = W / 2 - L / 2;
            const ex = W / 2 + L / 2;
            const cy = H / 2;

            // 서브스텝 적분 — 위치를 링버퍼(꼬리)에 쌓는다. 렌더는 매 프레임
            // 전체를 다시 그린다: 잔광 길이가 프레임레이트와 무관하게 항상 같고
            // (스로틀 환경 = 실기기 동일), 누적-페이드의 8비트 라운딩 잔상도 없다.
            const steps = Math.max(1, Math.min(240, Math.round(dt / H_STEP)));
            for (let s = 0; s < steps; s++) {
                simT += H_STEP;
                for (let i = 0; i < N; i++) {
                    const e = easeInOut(seg(F, 0.14 + i * 0.045, 0.42 + i * 0.045));
                    const c = chaos(i, simT);
                    const o = orbit(i, simT, m);
                    let x = lerp(c.x, o.x, e);
                    let y = lerp(c.y, o.y, e);
                    if (glide > 0) {
                        x = lerp(x, sx, glide);
                        y = lerp(y, cy, glide);
                    }
                    if (strokeP > 0) {
                        x = lerp(sx, ex, strokeP);
                        y = cy;
                    }
                    const h = hist[i];
                    h.push(x, y);
                    if (h.length > TAIL * 2) h.splice(0, h.length - TAIL * 2);
                }
            }

            // ── 렌더 — 전체 클리어 후 꼬리를 머리쪽으로 밝아지게 다시 그린다 ──
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = "lighter"; // 실은 빛 — 겹칠수록 밝다
            ctx.lineCap = "round";
            for (let i = 0; i < N; i++) {
                const e = easeInOut(seg(F, 0.14 + i * 0.045, 0.42 + i * 0.045));
                const col = {
                    r: Math.round(lerp(THREADS[i].color.r, AC.r, e)),
                    g: Math.round(lerp(THREADS[i].color.g, AC.g, e)),
                    b: Math.round(lerp(THREADS[i].color.b, AC.b, e)),
                };
                const h = hist[i];
                const n2 = h.length / 2;
                for (let k = 1; k < n2; k++) {
                    const w = k / n2; // 0(꼬리끝) → 1(머리)
                    ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${w * w * (0.5 + e * 0.2)})`;
                    ctx.lineWidth = 0.6 + w * (1.3 + e * 0.5);
                    ctx.beginPath();
                    ctx.moveTo(h[(k - 1) * 2], h[(k - 1) * 2 + 1]);
                    ctx.lineTo(h[k * 2], h[k * 2 + 1]);
                    ctx.stroke();
                }
            }

            // 라벨·헤드·획 — 정확한 색이 필요하니 일반 합성으로 돌아온다
            ctx.globalCompositeOperation = "source-over";

            // 라벨 — 실 머리를 따라다니다 동기화되며 흩어진다
            ctx.textAlign = "left";
            for (let i = 0; i < N; i++) {
                const e = easeInOut(seg(F, 0.14 + i * 0.045, 0.42 + i * 0.045));
                const a = Math.min(1, t * 1.6) * (1 - e);
                if (a <= 0.01) continue;
                const h = hist[i];
                if (h.length < 2) continue;
                const hx = h[h.length - 2];
                const hy = h[h.length - 1];
                ctx.globalAlpha = a * 0.9;
                ctx.font = `500 ${small ? 11.5 : 12.5}px Pretendard, sans-serif`;
                ctx.fillStyle = "#aab6c6";
                ctx.fillText(THREADS[i].label, hx + 12, hy - 10);
                ctx.globalAlpha = 1;
            }

            // 합쳐진 머리의 발광 코어
            const h0 = hist[0];
            const head = h0.length >= 2 ? { x: h0[h0.length - 2], y: h0[h0.length - 1] } : { x: W / 2, y: cy };
            const coreA = m * (1 - strokeP * 0.3);
            if (coreA > 0.02) {
                const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 30);
                g.addColorStop(0, `rgba(138,180,248,${0.55 * coreA})`);
                g.addColorStop(1, "rgba(138,180,248,0)");
                ctx.fillStyle = g;
                ctx.fillRect(head.x - 30, head.y - 30, 60, 60);
                ctx.fillStyle = "#fbfaf8";
                ctx.beginPath();
                ctx.arc(head.x, head.y, 2.2 + m * 1.4, 0, 7);
                ctx.fill();
            }

            // 한 획 — 지나간 자리에 또렷한 실선이 남는다
            if (strokeP > 0) {
                ctx.strokeStyle = `rgba(138,180,248,0.95)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(sx, cy);
                ctx.lineTo(lerp(sx, ex, strokeP), cy);
                ctx.stroke();
            }

            if (F >= 1) finish();
        };
        raf = requestAnimationFrame(frame);

        layer.addEventListener("wheel", onWheel, { passive: false });
        layer.addEventListener("touchstart", onTouchStart, { passive: true });
        layer.addEventListener("touchmove", onTouchMove, { passive: false });
        layer.addEventListener("pointerdown", onDown);
        addEventListener("keydown", onKey);
        addEventListener("resize", fit, { passive: true });

        const skipBtn = layer.querySelector<HTMLButtonElement>(".mt-ibrk-skip");
        const onSkipClick = (e: Event) => {
            e.stopPropagation();
            skip();
        };
        skipBtn?.addEventListener("click", onSkipClick);

        return () => {
            done = true;
            cleanup();
            skipBtn?.removeEventListener("click", onSkipClick);
            html.removeAttribute("data-intro");
        };
    }, []);

    return (
        <div ref={layerRef} className="mt-ione" role="presentation">
            <canvas ref={canvasRef} className="mt-iflow-canvas" aria-hidden="true" />

            {/* 마지막 카피 — 한 획(파란 실)을 사이에 두고 나타난다.
                "○○의 모든 것" 계열(토스)의 범주 전체 선언 + 수렴 서사의 "하나로". */}
            <div className="mt-iflow-fin" aria-hidden="true">
                <p className="mt-serif mt-iflow-fin-h">
                    로펌에 필요한 모든 마케팅,
                    <br className="sm:hidden" /> 하나로.
                </p>
                <p className="mt-serif mt-iflow-fin-b">
                    MAKETHIS1<span style={{ color: "#8ab4f8" }}>.</span>
                </p>
            </div>

            <button type="button" className="mt-ibrk-skip mt-en">
                건너뛰기 →
            </button>
            <p className="mt-ione-skip" aria-hidden="true">
                <span className="mt-ibrk-arr" aria-hidden>
                    ↓
                </span>
                스크롤하면 빨라집니다 · 클릭하면 건너뜁니다
            </p>
        </div>
    );
}
