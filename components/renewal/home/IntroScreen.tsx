"use client";

import { useEffect, useRef } from "react";

// BROKEN WEBSITE 인트로 — LAB Concept 03 이식.
//
// 사이트가 처음부터 고장나 있다: 헤드라인·케이스·프레임이 산산이 흩어져
// 글리치(색수차·지터·노이즈) 상태로 표류한다. 방문자가 스크롤을 내리면
// 그만큼 조각들이 제자리에 "딸깍" 박히고, 100%가 되는 순간 스위스 그리드
// 포스터로 스냅 — MAKE THIS ONE. 직인 후 페이드, 완성된 홈이 드러난다.
// "WE FIX BRANDS"를 설명하지 않고 몸으로 겪게 한다.
//
// 진행은 오직 스크롤(휠/스와이프/방향키)량의 함수 — 역스크롤 = 시간 역행.
// 조각을 직접 탭하면 그 조각이 즉시 수리된다(보너스). 스킵: 건너뛰기 버튼/ESC.
// 재생 여부는 HeroSection 의 프리페인트 스크립트(html[data-intro="play"],
// 매 전체 페이지 로드, reduced-motion 제외)가 정한다. 아래 홈은 항상 완성 상태.
//
// 모바일: 조각 수 축소(mt-ibrk-desk 미표시)·산개 반경 축소·필요 스크롤량 단축·
// blur 필터 생략(성능)·두꺼운 미터. 스와이프가 곧 수리 에너지다.

const INK = "#fbfaf8";
const GRAY = "#8794a6";
const AC = "#8ab4f8";
const ERR = "#c97b6a";

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const fract = (n: number) => n - Math.floor(n);
const rnd = (i: number, a: number) => fract(Math.sin(i * 127.3 + a * 311.7) * 43758.5453);

const FADE_MS = 950;

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

export default function IntroScreen() {
    const layerRef = useRef<HTMLDivElement>(null);
    const noiseRef = useRef<HTMLCanvasElement>(null);
    const meterRef = useRef<HTMLDivElement>(null);
    const readRef = useRef<HTMLParagraphElement>(null);
    const stampRef = useRef<HTMLDivElement>(null);
    const hintRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const html = document.documentElement;
        const layer = layerRef.current;
        const noise = noiseRef.current;
        if (html.getAttribute("data-intro") !== "play" || !layer || !noise) return;
        const nctx = noise.getContext("2d");

        const small = innerWidth < 1024;
        const TOTAL = small ? 1600 : 2800; // 수리에 필요한 스크롤량(px)
        const DPR = 1; // 노이즈는 저해상도로 충분

        let W = innerWidth;
        let H = innerHeight;
        const fit = () => {
            W = innerWidth;
            H = innerHeight;
            noise.width = W * DPR;
            noise.height = H * DPR;
            place();
        };

        // 조각 수집 — 모바일에서 display:none 인 것은 제외
        const all = Array.from(layer.querySelectorAll<HTMLElement>(".mt-ibrk-frag"));
        const frags = all.filter((f) => getComputedStyle(f).display !== "none");
        const N = frags.length;
        const B = frags.map((f, i) => ({
            el: f,
            dx: (rnd(i, 1) - 0.5) * W * (small ? 0.5 : 0.7),
            dy: (rnd(i, 2) - 0.5) * H * (small ? 0.45 : 0.7),
            rot: (rnd(i, 3) - 0.5) * (small ? 28 : 50),
            sk: (rnd(i, 4) - 0.5) * (small ? 12 : 28),
            th: 0.03 + (i / N) * 0.78, // 잠금 임계 — 위에서부터 차례로 수리된다
        }));

        // 좌표 배치 — data-x/y(데스크톱), data-mx/my(모바일)
        const place = () => {
            frags.forEach((f) => {
                const x = small ? f.dataset.mx ?? f.dataset.x : f.dataset.x;
                const y = small ? f.dataset.my ?? f.dataset.y : f.dataset.y;
                f.style.left = `${x}%`;
                f.style.top = `${y}%`;
            });
        };
        fit();

        // 데스크톱 장식 프레임 — 다크 도트 + 파란 스파크라인 (1회 드로우)
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

        let F = 0; // 목표 진행(스크롤 누적)
        let Fd = 0; // 표시 진행(부드럽게 따라감)
        let raf = 0;
        let done = false;
        let cleaned = false;
        let lastPct = -1;
        let last = performance.now();
        const timers: ReturnType<typeof setTimeout>[] = [];

        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            cancelAnimationFrame(raf);
            timers.forEach(clearTimeout);
            layer.removeEventListener("wheel", onWheel);
            layer.removeEventListener("touchstart", onTouchStart);
            layer.removeEventListener("touchmove", onTouchMove);
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
            // 스냅 순간 — 전 조각 정렬 + 직인
            B.forEach((b) => {
                b.el.style.transform = "none";
                b.el.style.filter = "none";
                b.el.style.textShadow = "none";
                b.el.style.opacity = "1";
            });
            if (meterRef.current) meterRef.current.style.width = "100%";
            if (readRef.current) readRef.current.textContent = "SYSTEM ALIGNED — 100%";
            // 수리가 끝났으니 에러 칩은 사라진다
            layer.querySelectorAll<HTMLElement>(".mt-ibrk-err").forEach((e) => {
                e.style.transition = "opacity 0.4s ease";
                e.style.opacity = "0";
            });
            nctx?.clearRect(0, 0, W, H);
            cancelAnimationFrame(raf);
            stampRef.current?.classList.add("mt-ibrk-stamp-on");
            timers.push(setTimeout(fadeOut, 1250));
        };

        const add = (px: number) => {
            if (done) return;
            F = clamp(F + px / TOTAL, 0, 1);
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
            add((touchY - y) * 1.6); // 스와이프 업 = 수리
            touchY = y;
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                skip();
                return;
            }
            if (["ArrowDown", "PageDown", " "].includes(e.key)) {
                e.preventDefault();
                add(140);
            } else if (["ArrowUp", "PageUp"].includes(e.key)) {
                e.preventDefault();
                add(-140);
            }
        };

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            const dt = Math.min(50, now - last) / 1000;
            last = now;
            Fd += (F - Fd) * Math.min(1, dt * 9);
            if (F >= 1 && Fd > 0.995) {
                finish();
                return;
            }

            // 미터 + 리드아웃
            const pct = Math.floor(Fd * 100);
            if (pct !== lastPct) {
                lastPct = pct;
                if (meterRef.current) meterRef.current.style.width = `${Fd * 100}%`;
                if (readRef.current)
                    readRef.current.textContent =
                        pct === 0
                            ? "SYSTEM CORRUPTED — 브랜드가 파편화되었습니다"
                            : `REBUILDING — 브랜드 수리 중 ${String(pct).padStart(2, "0")}%`;
                if (hintRef.current) {
                    // 등장 keyframe(fill:both)이 인라인 opacity 를 이기므로 함께 끈다
                    if (Fd > 0.08) {
                        hintRef.current.style.animation = "none";
                        hintRef.current.style.opacity = "0";
                    } else {
                        hintRef.current.style.animation = "";
                        hintRef.current.style.opacity = "";
                    }
                }
            }

            // 조각 — 전부 Fd 의 순수 함수(역스크롤 = 역재생)
            B.forEach((b) => {
                const lf = easeOut(seg(Fd, b.th, b.th + 0.12));
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

            // 노이즈 스캔라인 — 고장의 잔향
            if (nctx) {
                nctx.clearRect(0, 0, W, H);
                const amt = (1 - Fd) * (small ? 36 : 80);
                for (let k = 0; k < amt; k++) {
                    nctx.fillStyle = Math.random() < 0.08 ? AC : "#2a3242";
                    nctx.globalAlpha = Math.random() * 0.45;
                    nctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * 60, 1);
                }
                nctx.globalAlpha = 1;
            }
        };
        raf = requestAnimationFrame(frame);

        // 조각 탭 = 그 조각 즉시 수리 + 전체 진행 가산
        const onFragDown = (e: Event) => {
            const t = (e.target as HTMLElement).closest?.(".mt-ibrk-frag") as HTMLElement | null;
            if (!t || done) return;
            const b = B.find((x) => x.el === t);
            if (b && Fd < b.th) {
                b.th = 0;
                F = clamp(F + 0.03, 0, 1);
            }
        };
        layer.addEventListener("pointerdown", onFragDown);

        layer.addEventListener("wheel", onWheel, { passive: false });
        layer.addEventListener("touchstart", onTouchStart, { passive: true });
        layer.addEventListener("touchmove", onTouchMove, { passive: false });
        addEventListener("keydown", onKey);
        addEventListener("resize", fit, { passive: true });

        const skipBtn = layer.querySelector<HTMLButtonElement>(".mt-ibrk-skip");
        skipBtn?.addEventListener("click", skip);

        return () => {
            cleanup();
            layer.removeEventListener("pointerdown", onFragDown);
            skipBtn?.removeEventListener("click", skip);
            html.removeAttribute("data-intro");
        };
    }, []);

    return (
        <div ref={layerRef} className="mt-ione" role="presentation">
            <canvas ref={noiseRef} className="mt-ibrk-noise" aria-hidden="true" />

            {/* ── 깨진 페이지 조각들 (수리되면 스위스 그리드 포스터가 된다) ── */}
            <div aria-hidden="true">
                <p className="mt-ibrk-frag" data-x="6" data-y="8" data-mx="6" data-my="9" style={{ ...mono, fontSize: 10, letterSpacing: "0.28em", color: GRAY }}>
                    MAKETHIS1 — LAW FIRM MARKETING
                </p>
                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="70" data-y="8" style={{ ...mono, fontSize: 10, letterSpacing: "0.18em", color: GRAY }}>
                    SCOPE&nbsp;&nbsp;JOURNEY&nbsp;&nbsp;CONTACT
                </p>
                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="52" data-y="6" style={{ width: 90, height: 1, background: "rgba(135,148,166,0.5)" }} />

                <p className="mt-ibrk-frag mt-serif" data-x="6" data-y="15" data-mx="6" data-my="12" style={{ fontSize: "clamp(46px,9vw,108px)", fontWeight: 600, lineHeight: 1, color: INK }}>
                    WE FIX
                </p>
                <p className="mt-ibrk-frag mt-serif" data-x="6" data-y="30" data-mx="6" data-my="22" style={{ fontSize: "clamp(46px,9vw,108px)", fontWeight: 600, lineHeight: 1, color: INK }}>
                    BRANDS<span style={{ color: AC }}>.</span>
                </p>

                <div className="mt-ibrk-frag mt-ibrk-desk mt-ibrk-frame" data-x="63" data-y="21">
                    <canvas className="mt-ibrk-cv" width={220} height={150} />
                </div>
                <div className="mt-ibrk-frag mt-ibrk-desk mt-ibrk-frame" data-x="80" data-y="50">
                    <canvas className="mt-ibrk-cv" width={150} height={200} />
                </div>

                <p className="mt-ibrk-frag mt-ibrk-err" data-x="63" data-y="12" data-mx="56" data-my="34" style={{ ...mono, color: ERR }}>
                    ERR_BRAND_FRACTURED_0x07
                </p>
                <p className="mt-ibrk-frag mt-ibrk-desk mt-ibrk-err" data-x="32" data-y="44" style={{ ...mono, color: ERR }}>
                    MISSING_ASSET: strategy.one
                </p>

                <p className="mt-ibrk-frag mt-serif" data-x="42" data-y="56" data-mx="6" data-my="42" style={{ fontSize: "clamp(15px,1.8vw,24px)", fontWeight: 600, lineHeight: 1.4, color: INK, maxWidth: 320 }}>
                    깨진 조각 전부가
                    <br />
                    하나의 계약으로 돌아옵니다.
                </p>

                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="6" data-y="54" style={{ width: 180, height: 1, background: "rgba(135,148,166,0.5)" }} />

                <div className="mt-ibrk-frag" data-x="6" data-y="61" data-mx="6" data-my="57">
                    <p style={{ ...mono, fontSize: 11, letterSpacing: "0.08em", color: INK }}>01 — 호남 지역 종합 로펌</p>
                    <p style={{ ...mono, fontSize: 10, marginTop: 4, color: GRAY }}>콘텐츠 시스템 재건 — 연 매출 10억대 → 100억대</p>
                </div>
                <div className="mt-ibrk-frag" data-x="6" data-y="72" data-mx="6" data-my="67">
                    <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.06em", color: GRAY }}>20+ 파트너 로펌&nbsp;&nbsp;·&nbsp;&nbsp;100+ 완료 프로젝트&nbsp;&nbsp;·&nbsp;&nbsp;7년+ 업력</p>
                </div>

                <p className="mt-ibrk-frag" data-x="6" data-y="86" data-mx="6" data-my="78" style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", color: GRAY }}>
                    ONE CONTRACT · ONE TEAM
                </p>
                <p className="mt-ibrk-frag mt-ibrk-desk" data-x="90" data-y="86" style={{ ...mono, fontSize: 10, color: GRAY }}>
                    P.01
                </p>
            </div>

            {/* ── 시스템 UI ── */}
            <div ref={meterRef} className="mt-ibrk-meter" aria-hidden="true" />
            <p ref={readRef} className="mt-ibrk-read" aria-hidden="true">
                SYSTEM CORRUPTED — 브랜드가 파편화되었습니다
            </p>
            <button type="button" className="mt-ibrk-skip mt-en">
                건너뛰기 →
            </button>
            <p ref={hintRef} className="mt-ione-skip" aria-hidden="true">
                <span className="mt-ibrk-arr" aria-hidden>
                    ↓
                </span>
                아래로 스크롤하면 사이트가 수리됩니다
            </p>

            {/* ── 100% 직인 ── */}
            <div ref={stampRef} className="mt-ibrk-stamp mt-serif" aria-hidden="true">
                MAKE THIS ONE<span style={{ color: AC }}>.</span>
            </div>
        </div>
    );
}
