"use client";

import { useEffect, useRef } from "react";
import { CONTRACT_SCOPE } from "@/data/renewal/site";

// ONE 인트로 화면 — LAB Concept 01 "ONE → EVERYTHING → ONE" 이식.
//
// 어둠 속 점 하나(=계약)가 숨을 쉬다 여섯 직능으로 찢어져 빛 꼬리를 끌며
// 궤도를 돌고, 나선으로 다시 하나로 붕괴한다. 점은 파란색이 되어
// "MAKE THIS ONE" 문장의 마침표가 된다. 그리고 페이드 — 완성된 홈이 드러난다.
//
// 시간 기반 캔버스 시네마. 재생 여부는 HeroSection 의 프리페인트 스크립트가
// 정한다(html[data-intro="play"], 매 전체 페이지 로드, reduced-motion 제외).
// 스킵(클릭/키/휠/스크롤) = 즉시 페이드. 종료 = data-intro 제거.
// 아래 홈페이지는 인트로와 무관하게 처음부터 완성 상태다.

const BG = "#050a12";
const TRAIL = "rgba(5,10,18,0.22)"; // 매 프레임 반투명 덮기 → 모션 트레일
const INK = "#fbfaf8";
const GRAY = "#8794a6";

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// 탄성 오버슛 — 분열이 "찢어지는" 느낌을 만든다
const back = (t: number) => {
    const c = 1.9;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

const ROLES = CONTRACT_SCOPE.map((a) => a.en);
const T_END = 8.2; // 본편(초). 이후 CSS 페이드 0.9s
const FADE_MS = 950;

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

        const DPR = Math.min(devicePixelRatio || 1, 2);
        let W = 0;
        let H = 0;
        const fit = () => {
            W = innerWidth;
            H = innerHeight;
            canvas.width = W * DPR;
            canvas.height = H * DPR;
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, W, H);
        };
        fit();

        let raf = 0;
        let done = false;
        let endTimer: ReturnType<typeof setTimeout> | undefined;
        const start = performance.now();

        const end = () => {
            if (done) return;
            done = true;
            cancelAnimationFrame(raf);
            removeEventListener("pointerdown", end);
            removeEventListener("keydown", end);
            removeEventListener("wheel", end);
            removeEventListener("scroll", end);
            removeEventListener("resize", fit);
            layer.classList.add("mt-ione-out");
            endTimer = setTimeout(() => html.removeAttribute("data-intro"), FADE_MS);
        };

        const draw = (t: number) => {
            // 텍스트 장면에서는 잔상을 빠르게 걷어 화면을 정리한다
            ctx.fillStyle = t > 6.0 ? "rgba(5,10,18,0.55)" : TRAIL;
            ctx.fillRect(0, 0, W, H);
            const cx = W / 2;
            const cy = H / 2;
            const R = Math.min(W, H) * 0.3;
            const N = ROLES.length;
            const small = W < 640;

            // ── 타임라인 ──
            const su = seg(t, 1.5, 2.6); // 분열
            const split = su === 0 ? 0 : back(easeOut(su));
            const lab = seg(t, 2.3, 2.9) * (1 - seg(t, 4.6, 5.1)); // 직능 라벨
            const col = easeInOut(seg(t, 4.7, 5.9)); // 붕괴(나선)
            const blue = seg(t, 5.9, 6.5); // 파란색 전환
            const txt = seg(t, 6.2, 6.9); // MAKE THIS ONE
            const sub = seg(t, 6.7, 7.4); // ONE CONTRACT …

            // 오프닝 타이포 — O N E
            const oneA = seg(t, 0.35, 0.95) * (1 - seg(t, 1.5, 1.9));
            if (oneA > 0) {
                ctx.globalAlpha = oneA;
                ctx.fillStyle = GRAY;
                ctx.font = "500 13px 'IBM Plex Mono', monospace";
                ctx.textAlign = "center";
                ctx.fillText("O   N   E", cx, cy + 46);
                ctx.globalAlpha = 1;
            }

            // 직능 궤도 — 빛 꼬리는 트레일 배경이 만든다
            const rad = R * split * (1 - col);
            if (rad > 0.5) {
                const baseAng = t * 0.55 + easeIn(col) * 2.8; // 붕괴 시 나선 가속
                for (let i = 0; i < N; i++) {
                    const ang = baseAng + (i / N) * Math.PI * 2 - Math.PI / 2;
                    const x = cx + Math.cos(ang) * rad * 1.18;
                    const y = cy + Math.sin(ang) * rad * 0.82;
                    const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
                    g.addColorStop(0, `rgba(138,180,248,${0.45 * (1 - col)})`);
                    g.addColorStop(1, "rgba(138,180,248,0)");
                    ctx.fillStyle = g;
                    ctx.fillRect(x - 26, y - 26, 52, 52);
                    ctx.fillStyle = INK;
                    ctx.beginPath();
                    ctx.arc(x, y, 2.6 + (1 - col) * 1.1, 0, 7);
                    ctx.fill();
                    if (lab > 0) {
                        ctx.globalAlpha = lab;
                        ctx.font = `500 ${small ? 9 : 11}px 'IBM Plex Mono', monospace`;
                        ctx.textAlign = "center";
                        ctx.fillStyle = GRAY;
                        ctx.fillText(ROLES[i], x, y - 14);
                        ctx.globalAlpha = 1;
                    }
                }
            }

            // 헤드라인 지오메트리 — 점이 이 문장의 마침표가 된다
            const fs = small ? Math.max(W * 0.062, 21) : Math.min(W * 0.05, 52);
            ctx.font = `600 ${fs}px 'Noto Serif KR', serif`;
            const headline = "MAKE THIS ONE";
            const hw = ctx.measureText(headline).width;
            const baseY = cy + fs * 0.3;
            const px = cx + hw / 2 + fs * 0.22; // 마침표 자리
            const g2 = easeInOut(txt);

            if (txt > 0) {
                ctx.globalAlpha = txt;
                ctx.fillStyle = INK;
                ctx.textAlign = "center";
                ctx.fillText(headline, cx, baseY);
                ctx.globalAlpha = 1;
            }
            if (sub > 0) {
                ctx.globalAlpha = sub;
                ctx.font = `500 ${small ? 9.5 : 11.5}px 'IBM Plex Mono', monospace`;
                ctx.fillStyle = GRAY;
                ctx.textAlign = "center";
                ctx.fillText("ONE CONTRACT · ONE TEAM · EVERYTHING YOU NEED", cx, baseY + fs * 0.85);
                ctx.globalAlpha = 1;
            }

            // 중심 점 — 계약. 분열 동안 사라졌다가 붕괴로 돌아온다
            const centerA = Math.max(1 - seg(t, 1.5, 1.9), seg(t, 5.2, 5.8));
            if (centerA > 0.01) {
                const dx = cx + (px - cx) * g2;
                const dy = cy + (baseY - fs * 0.06 - cy) * g2;
                const coreR =
                    3 +
                    Math.sin(t * 2.6) * 0.9 * (1 - su) + // 숨쉬기
                    easeOut(seg(t, 5.2, 6.4)) * 1.6 - // 전부를 삼킨 뒤 조금 커진다
                    g2 * 1.4; // 마침표가 되며 활자 크기로 수렴
                const cr = Math.round(251 + (138 - 251) * blue);
                const cg = Math.round(250 + (180 - 250) * blue);
                if (blue > 0) {
                    const gr = 22 - g2 * 8; // 마침표가 될수록 글로우도 조여든다
                    const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, gr);
                    g.addColorStop(0, `rgba(138,180,248,${0.38 * blue * centerA})`);
                    g.addColorStop(1, "rgba(138,180,248,0)");
                    ctx.fillStyle = g;
                    ctx.fillRect(dx - gr, dy - gr, gr * 2, gr * 2);
                }
                ctx.globalAlpha = centerA;
                ctx.fillStyle = `rgb(${cr},${cg},248)`;
                ctx.beginPath();
                ctx.arc(dx, dy, coreR, 0, 7);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        };

        const frame = (now: number) => {
            if (done) return;
            const t = (now - start) / 1000;
            draw(t);
            if (t >= T_END) {
                end();
                return;
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        addEventListener("pointerdown", end, { passive: true });
        addEventListener("keydown", end);
        addEventListener("wheel", end, { passive: true });
        addEventListener("scroll", end, { passive: true });
        addEventListener("resize", fit, { passive: true });

        return () => {
            done = true;
            cancelAnimationFrame(raf);
            clearTimeout(endTimer);
            removeEventListener("pointerdown", end);
            removeEventListener("keydown", end);
            removeEventListener("wheel", end);
            removeEventListener("scroll", end);
            removeEventListener("resize", fit);
            html.removeAttribute("data-intro");
        };
    }, []);

    return (
        <div ref={layerRef} className="mt-ione" aria-hidden="true">
            <canvas ref={canvasRef} />
            <p className="mt-ione-skip">아무 곳이나 누르면 건너뜁니다</p>
        </div>
    );
}
