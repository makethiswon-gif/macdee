"use client";

import { useEffect, useRef } from "react";

// 인트로 — LAB Concept 03 "조각 조립" (자동 재생판, 대표 지시 2026-08-29).
//
// 리뉴얼 홈의 조각들(헤드라인·서비스·실제 사례·성과 수치)이 흩어진 채
// 글리치 상태로 시작하고, 스크롤 없이 저절로 하나씩 제자리에 박힌다.
// 100% 정렬되면 스위스 그리드 포스터가 완성되고 MAKETHIS1. 스탬프 —
// 잠시 보여준 뒤 페이드, 완성된 리뉴얼 홈이 드러난다.
// "따로 놀던 마케팅이 하나로 모인다"를 몸으로 보여주는 장면이다.
//
// 조각의 내용은 전부 실제 사이트 카피·데이터다(§42 — 지어내지 않는다).
// 자동 진행은 벽시계 기준 — rAF 스로틀 환경에서도 실시간(~6초)에 끝난다.
// 스킵: 아무 곳 클릭 / ESC / 건너뛰기 버튼. 같은 세션 1회, 앵커 진입 시
// 미재생, reduced-motion 미재생 (HeroSection 의 프리페인트 부트가 결정).

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fract = (n: number) => n - Math.floor(n);
const rnd = (i: number, a: number) => fract(Math.sin(i * 127.3 + a * 311.7) * 43758.5453);

const AC = "#8ab4f8";
const FADE_MS = 900;
const HOLD_BROKEN = 0.7; // 흩어진 상태를 보여주는 시간(초)
const DURATION = 4.4; // 정렬에 걸리는 시간(초)
const HOLD_DONE = 1400; // 완성 포스터를 보여주는 시간(ms)

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

export default function IntroScreen() {
    const layerRef = useRef<HTMLDivElement>(null);
    const noiseRef = useRef<HTMLCanvasElement>(null);
    const meterRef = useRef<HTMLDivElement>(null);
    const readRef = useRef<HTMLParagraphElement>(null);
    const stampRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const html = document.documentElement;
        const layer = layerRef.current;
        const noise = noiseRef.current;
        if (html.getAttribute("data-intro") !== "play" || !layer || !noise) return;
        const nctx = noise.getContext("2d");

        let W = innerWidth;
        let H = innerHeight;
        let small = W < 1024;
        const fit = () => {
            W = innerWidth;
            H = innerHeight;
            small = W < 1024;
            noise.width = W;
            noise.height = H;
            place();
        };

        const all = Array.from(layer.querySelectorAll<HTMLElement>(".mt-ibrk-frag"));
        const frags = all.filter((f) => getComputedStyle(f).display !== "none");
        const N = frags.length;
        const B = frags.map((f, i) => ({
            el: f,
            dx: (rnd(i, 1) - 0.5) * W * (small ? 0.5 : 0.7),
            dy: (rnd(i, 2) - 0.5) * H * (small ? 0.45 : 0.7),
            rot: (rnd(i, 3) - 0.5) * (small ? 28 : 46),
            sk: (rnd(i, 4) - 0.5) * (small ? 12 : 26),
            th: 0.04 + (i / N) * 0.78, // 위에서부터 차례로 정렬
        }));

        const place = () => {
            frags.forEach((f) => {
                const x = small ? f.dataset.mx ?? f.dataset.x : f.dataset.x;
                const y = small ? f.dataset.my ?? f.dataset.y : f.dataset.y;
                f.style.left = `${x}%`;
                f.style.top = `${y}%`;
            });
        };
        fit();

        // 장식 프레임 — 다크 도트 + 파란 스파크라인 (1회 드로우)
        layer.querySelectorAll<HTMLCanvasElement>(".mt-ibrk-cv").forEach((cv) => {
            const w = cv.width;
            const h = cv.height;
            const x = cv.getContext("2d");
            if (!x) return;
            for (let k = 0; k < 380; k++) {
                x.fillStyle = Math.random() < 0.06 ? AC : "#1a2230";
                x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
            x.strokeStyle = AC;
            x.beginPath();
            x.moveTo(10, h - 14);
            x.lineTo(w * 0.6, h * 0.35);
            x.lineTo(w - 12, h * 0.6);
            x.stroke();
        });

        let raf = 0;
        let done = false;
        let finishing = false;
        let lastPct = -1;
        let last = performance.now();
        const start = last;
        const timers: ReturnType<typeof setTimeout>[] = [];

        const cleanup = () => {
            cancelAnimationFrame(raf);
            timers.forEach(clearTimeout);
            layer.removeEventListener("pointerdown", onDown);
            layer.removeEventListener("wheel", onWheel);
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
            B.forEach((b) => {
                b.el.style.transform = "none";
                b.el.style.filter = "none";
                b.el.style.textShadow = "none";
                b.el.style.opacity = "1";
            });
            if (meterRef.current) meterRef.current.style.width = "100%";
            if (readRef.current) readRef.current.textContent = "하나로 정렬 완료 — 100%";
            nctx?.clearRect(0, 0, W, H);
            cancelAnimationFrame(raf);
            stampRef.current?.classList.add("mt-ibrk-stamp-on");
            timers.push(
                setTimeout(() => {
                    done = true;
                    cleanup();
                    fadeOut();
                }, HOLD_DONE)
            );
        };

        const onDown = (e: Event) => {
            if ((e.target as HTMLElement).closest?.(".mt-ibrk-skip")) return;
            skip();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") skip();
        };
        // 자동 재생이라 스크롤이 필요 없다 — 스크롤 제스처는 "빨리 넘어가자"로 읽고
        // 스킵한다(뒤 페이지가 몰래 스크롤되는 것도 막는다)
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            skip();
        };

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            last = now;
            // 자동 진행 — 벽시계 기준(스로틀 무관). easeInOut: 흩어진 광경을
            // 한 박자 보여주고 → 몰아치듯 정렬 → 마지막 조각이 살며시 안착
            const t = (now - start) / 1000;
            const F = easeInOut(clamp((t - HOLD_BROKEN) / DURATION, 0, 1));

            const pct = Math.floor(F * 100);
            if (pct !== lastPct) {
                lastPct = pct;
                if (meterRef.current) meterRef.current.style.width = `${F * 100}%`;
                if (readRef.current)
                    readRef.current.textContent =
                        pct === 0
                            ? "따로 놀던 마케팅 — 조각이 흩어져 있습니다"
                            : `하나로 모으는 중 — ${String(pct).padStart(2, "0")}%`;
            }

            B.forEach((b) => {
                const lf = easeOut(seg(F, b.th, b.th + 0.14));
                const inv = 1 - lf;
                const j = inv > 0.02 ? inv * 4 : 0;
                const jx = (Math.random() - 0.5) * j;
                const jy = (Math.random() - 0.5) * j;
                b.el.style.transform = `translate(${b.dx * inv + jx}px, ${b.dy * inv + jy}px) rotate(${b.rot * inv}deg) skewX(${b.sk * inv}deg)`;
                if (!small) b.el.style.filter = inv > 0.02 ? `blur(${inv * 1.4}px)` : "none";
                b.el.style.textShadow =
                    inv > 0.02
                        ? `${inv * 5}px 0 rgba(138,180,248,0.85), ${-inv * 5}px 0 rgba(35,211,194,0.7)`
                        : "none";
                b.el.style.opacity = String(0.35 + lf * 0.65);
            });

            if (nctx) {
                nctx.clearRect(0, 0, W, H);
                const amt = (1 - F) * (small ? 32 : 70);
                for (let k = 0; k < amt; k++) {
                    nctx.fillStyle = Math.random() < 0.08 ? AC : "#2a3242";
                    nctx.globalAlpha = Math.random() * 0.45;
                    nctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * 60, 1);
                }
                nctx.globalAlpha = 1;
            }

            if (F >= 1) finish();
        };
        raf = requestAnimationFrame(frame);

        layer.addEventListener("pointerdown", onDown);
        layer.addEventListener("wheel", onWheel, { passive: false });
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
            <canvas ref={noiseRef} className="mt-ibrk-noise" aria-hidden="true" />

            {/* ── 흩어진 조각들 — 정렬되면 리뉴얼 홈의 포스터가 된다.
                내용은 전부 실제 사이트 카피·데이터 ── */}
            <div aria-hidden="true">
                <p className="mt-ibrk-frag" data-x="6" data-y="7" data-mx="6" data-my="8" style={{ ...mono, fontSize: 10, letterSpacing: "0.28em", color: "#8794a6" }}>
                    MAKETHIS1 — LAW FIRM MARKETING
                </p>
                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="70" data-y="7" style={{ ...mono, fontSize: 10, letterSpacing: "0.18em", color: "#8794a6" }}>
                    SERVICES&nbsp;&nbsp;CASES&nbsp;&nbsp;PRICING
                </p>
                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="52" data-y="5" style={{ width: 90, height: 1, background: "rgba(135,148,166,0.5)" }} />

                <p className="mt-ibrk-frag mt-serif" data-x="6" data-y="14" data-mx="6" data-my="14" style={{ fontSize: "clamp(40px,7.5vw,92px)", fontWeight: 600, lineHeight: 1.05, color: "#fbfaf8" }}>
                    로펌에 필요한
                </p>
                <p className="mt-ibrk-frag mt-serif" data-x="6" data-y="26" data-mx="6" data-my="23" style={{ fontSize: "clamp(40px,7.5vw,92px)", fontWeight: 600, lineHeight: 1.05, color: "#fbfaf8" }}>
                    모든 마케팅, <span style={{ color: AC }}>하나로.</span>
                </p>

                <div className="mt-ibrk-frag mt-ibrk-desk mt-ibrk-frame" data-x="66" data-y="20">
                    <canvas className="mt-ibrk-cv" width={220} height={150} />
                </div>
                <div className="mt-ibrk-frag mt-ibrk-desk mt-ibrk-frame" data-x="81" data-y="50">
                    <canvas className="mt-ibrk-cv" width={150} height={200} />
                </div>

                {/* Services 섹션 카피 — 홈 01~06 섹션과 같은 문장 */}
                <p className="mt-ibrk-frag mt-en" data-x="6" data-y="42" data-mx="6" data-my="36" style={{ ...mono, fontSize: 9.5, letterSpacing: "0.22em", color: AC }}>
                    SERVICES
                </p>
                <p className="mt-ibrk-frag mt-serif" data-x="6" data-y="47" data-mx="6" data-my="41" style={{ fontSize: "clamp(19px,2.2vw,29px)", fontWeight: 600, lineHeight: 1.3, color: "#fbfaf8" }}>
                    광고의 처음부터 끝, 모두 준비했습니다.
                </p>
                <p className="mt-ibrk-frag" data-x="6" data-y="54" data-mx="6" data-my="48" style={{ fontSize: small_css(14, 12.5), color: "#aab6c6" }}>
                    채널별로 업체를 나누지 마세요.
                </p>
                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="6" data-y="58.5" style={{ fontSize: 14, color: "#aab6c6" }}>
                    로펌의 목표와 예산에 맞춰 필요한 영역을 한 팀이 함께 운영합니다.
                </p>

                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="6" data-y="66" style={{ width: 180, height: 1, background: "rgba(135,148,166,0.5)" }} />

                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="6" data-y="70" style={{ ...mono, fontSize: 11.5, letterSpacing: "0.04em", color: "#d5dae2" }}>
                    01 광고 운영&nbsp;&nbsp;02 네이버·Google 검색&nbsp;&nbsp;03 AI 검색&nbsp;&nbsp;04 법률 콘텐츠&nbsp;&nbsp;05 홈페이지&nbsp;&nbsp;06 상담·수임 분석
                </p>
                <p className="mt-ibrk-frag lg:hidden" data-x="6" data-y="70" data-mx="6" data-my="56" style={{ ...mono, fontSize: 10.5, letterSpacing: "0.02em", color: "#d5dae2" }}>
                    광고 · 검색 · AI 검색 · 콘텐츠 · 홈페이지 · 상담 분석
                </p>

                <p className="mt-ibrk-frag" data-x="6" data-y="78" data-mx="6" data-my="66" style={{ ...mono, fontSize: 10.5, letterSpacing: "0.06em", color: "#8794a6" }}>
                    20+ 파트너 로펌&nbsp;&nbsp;·&nbsp;&nbsp;100+ 완료 프로젝트&nbsp;&nbsp;·&nbsp;&nbsp;7년+ 업력
                </p>

                <p className="mt-ibrk-frag" data-x="6" data-y="86" data-mx="6" data-my="79" style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", color: "#8794a6" }}>
                    ONE TEAM · MAKETHIS1
                </p>
                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="90" data-y="86" style={{ ...mono, fontSize: 10, color: "#8794a6" }}>
                    P.01
                </p>
            </div>

            {/* ── 시스템 UI ── */}
            <div ref={meterRef} className="mt-ibrk-meter" aria-hidden="true" />
            <p ref={readRef} className="mt-ibrk-read" aria-hidden="true">
                따로 놀던 마케팅 — 조각이 흩어져 있습니다
            </p>
            <button type="button" className="mt-ibrk-skip mt-en">
                건너뛰기 →
            </button>
            <p className="mt-ione-skip" aria-hidden="true">
                클릭하면 건너뜁니다
            </p>

            {/* ── 100% 스탬프 ── */}
            <div ref={stampRef} className="mt-ibrk-stamp mt-serif" aria-hidden="true">
                MAKETHIS1<span style={{ color: AC }}>.</span>
            </div>
        </div>
    );
}

// SSR 시 뷰포트를 모르므로 clamp 로 처리 — 헬퍼로 가독성만 확보
function small_css(desktop: number, mobile: number): string {
    return `clamp(${mobile}px, 1.6vw, ${desktop}px)`;
}
