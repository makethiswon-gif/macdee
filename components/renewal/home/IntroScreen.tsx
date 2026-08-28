"use client";

import { useEffect, useRef } from "react";

// 인트로 — "따로 하던 마케팅을 한 팀으로."
//
// 여섯 개의 마케팅 요소(광고·블로그·검색·AI 검색·홈페이지·상담 데이터)가
// 어둠 속에서 제각각 표류한다. 진행에 따라 하나의 운영 라인 위로 끌려와
// 정렬되고, 파란 펄스가 라인을 관통해 여섯 개를 하나의 흐름으로 꿰면
// "따로 하던 마케팅을 한 팀으로. MAKETHIS1" — 페이드, 완성된 홈.
//
// 진행 엔진: 자동으로도 짧게 끝나고(약 6초), 스크롤을 내리면 가속된다.
// 클릭/키/건너뛰기 = 즉시 스킵. 같은 세션에서는 한 번만 재생.
// 재생 여부는 HeroSection 의 프리페인트 스크립트(html[data-intro="play"],
// reduced-motion 제외)가 정한다. 아래 홈은 인트로와 무관하게 항상 완성 상태다.

const INK = "#fbfaf8";
const GRAY = "#8794a6";
const AC = "#8ab4f8";

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fract = (n: number) => n - Math.floor(n);
const rnd = (i: number, a: number) => fract(Math.sin(i * 127.3 + a * 311.7) * 43758.5453);

const ELEMENTS = ["광고", "블로그", "네이버·Google 검색", "AI 검색", "홈페이지", "상담 데이터"];

const FADE_MS = 900;
const AUTO_RATE = 0.16; // 초당 진행 — 손대지 않아도 ~6초에 끝난다
const SCROLL_TOTAL = 1000; // 이만큼 스크롤하면 즉시 100%

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

        const chips = Array.from(layer.querySelectorAll<HTMLElement>(".mt-iflow-chip"));
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
        };
        fit();

        // 목표 위치 — 데스크톱: 가로 운영 라인, 모바일: 세로 흐름
        const target = (i: number) => {
            const n = ELEMENTS.length;
            if (small) {
                const top = H * 0.24;
                const gap = (H * 0.44) / (n - 1);
                return { x: W / 2, y: top + i * gap };
            }
            const left = W * 0.16;
            const gap = (W * 0.68) / (n - 1);
            return { x: left + i * gap, y: H * 0.46 };
        };
        // 산개 위치 — 시드 기반, 화면 안쪽
        const scatter = (i: number) => ({
            x: W * (0.14 + rnd(i, 1) * 0.72),
            y: H * (0.16 + rnd(i, 2) * 0.6),
        });

        let F = 0;
        let done = false;
        let raf = 0;
        let last = performance.now();
        const start = last;
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
            if (done) return;
            done = true;
            cleanup();
            fin?.classList.add("mt-iflow-fin-on");
            timers.push(setTimeout(fadeOut, 1600));
        };

        const add = (px: number) => {
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
            // 건너뛰기 버튼은 자체 클릭 핸들러가 처리한다
            if ((e.target as HTMLElement).closest?.(".mt-ibrk-skip")) return;
            skip();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") skip();
        };

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            // 실제 경과 시간 기준(상한 2s) — rAF 가 스로틀되는 환경(백그라운드 탭·
            // 절전)에서도 인트로가 실시간 속도로 끝난다
            const dt = Math.min(2, (now - last) / 1000);
            last = now;
            const t = (now - start) / 1000;

            // 자동 진행 + 스크롤 가속 — 손대지 않아도 짧게 끝난다
            if (t > 0.6) F = clamp(F + dt * AUTO_RATE, 0, 1);
            if (hint) hint.style.opacity = F > 0.25 ? "0" : "";

            ctx.clearRect(0, 0, W, H);

            const n = ELEMENTS.length;
            const pts: { x: number; y: number; lock: number }[] = [];
            for (let i = 0; i < n; i++) {
                const th = 0.08 + (i / n) * 0.5;
                const lock = easeInOut(seg(F, th, th + 0.3));
                const s = scatter(i);
                const g = target(i);
                const driftX = Math.sin(t * 0.7 + i * 2.3) * 16 * (1 - lock);
                const driftY = Math.cos(t * 0.6 + i * 1.7) * 12 * (1 - lock);
                const x = s.x + (g.x - s.x) * lock + driftX;
                const y = s.y + (g.y - s.y) * lock + driftY;
                pts.push({ x, y, lock });
                const el = chips[i];
                if (el) {
                    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
                    el.style.opacity = String(0.5 + lock * 0.5);
                    el.style.borderColor = lock > 0.98 ? "rgba(138,180,248,0.7)" : "rgba(135,148,166,0.35)";
                }
            }

            // 연결선 — 정렬된 이웃 사이에만 그어진다
            const lineA = seg(F, 0.3, 0.85);
            if (lineA > 0) {
                ctx.strokeStyle = `rgba(138,180,248,${0.55 * lineA})`;
                ctx.lineWidth = 1;
                for (let i = 0; i < n - 1; i++) {
                    const a = pts[i];
                    const b = pts[i + 1];
                    const w = Math.min(a.lock, b.lock);
                    if (w < 0.9) continue;
                    ctx.globalAlpha = (w - 0.9) * 10 * lineA;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            // 파란 펄스 — 완성된 라인을 관통하며 여섯 개를 하나로 꿴다
            const pulse = seg(F, 0.86, 1);
            if (pulse > 0) {
                const p = easeOut(pulse) * (n - 1);
                const i0 = Math.min(n - 2, Math.floor(p));
                const frac = p - i0;
                const a = pts[i0];
                const b = pts[i0 + 1];
                const px = a.x + (b.x - a.x) * frac;
                const py = a.y + (b.y - a.y) * frac;
                const g = ctx.createRadialGradient(px, py, 0, px, py, 26);
                g.addColorStop(0, "rgba(138,180,248,0.7)");
                g.addColorStop(1, "rgba(138,180,248,0)");
                ctx.fillStyle = g;
                ctx.fillRect(px - 26, py - 26, 52, 52);
                ctx.fillStyle = AC;
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, 7);
                ctx.fill();
                // 지나간 구간은 실선이 굵어진다
                ctx.strokeStyle = AC;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i <= i0; i++) ctx.lineTo(pts[i].x, pts[i].y);
                ctx.lineTo(px, py);
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

            <div aria-hidden="true">
                {ELEMENTS.map((label) => (
                    <span key={label} className="mt-iflow-chip">
                        {label}
                    </span>
                ))}
            </div>

            {/* 마지막 카피 — 라인이 완성되면 나타난다 */}
            <div className="mt-iflow-fin" aria-hidden="true">
                <p className="mt-serif mt-iflow-fin-h">따로 하던 마케팅을 한 팀으로.</p>
                <p className="mt-serif mt-iflow-fin-b">
                    MAKETHIS1<span style={{ color: AC }}>.</span>
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
