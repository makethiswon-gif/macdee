"use client";

import { useEffect, useRef } from "react";
import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import ScrollHint from "../ScrollHint";
import { useScrollProgress } from "../useScrollProgress";
import { BEFORE_AFTER } from "@/data/renewal/site";

// 맡기기 전 / 메이크디스원과 일하면 (LAB Concept 01 수렴 시네마 이식).
//
// 흩어져 표류하던 업체 조각들이 스크롤 진행(--p)에 따라 궤도로 끌려 들어오고,
// 파란 선으로 이어진 뒤, 하나의 파란 점(MAKETHIS1)으로 붕괴한다.
// EVERYTHING → ONE — 이 섹션의 서사(여러 업체 → 하나의 팀) 그 자체다.
//
// 구현: 캔버스는 장식(aria-hidden). 모든 상태가 --p 의 함수라 역스크롤 역재생,
// 빠른 스크롤 즉시 반영, 이탈 후 최종 상태(점 + MAKETHIS1) 유지.
// reduced-motion / JS 실패: --p=1 → 최종 프레임 / 캔버스 미표시. 카피는 DOM 텍스트.
// rAF 는 화면에 보일 때만 돈다(IntersectionObserver).

const VENDORS = ["광고대행사", "블로그 업체", "홈페이지 제작사", "SEO 업체", "보고서 4건", "연락 창구 5개"];
const RESULTS = ["담당 창구 하나", "운영 계획 하나", "성과표 하나"];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const seed = (n: number) => ((Math.sin(n * 127.1) * 43758.5453) % 1 + 1) % 1;

function ConvergenceCanvas({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const stageEl = stageRef.current;
        if (!canvas || !stageEl) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const DPR = Math.min(devicePixelRatio || 1, 1.5);
        let W = 0, H = 0;
        const fit = () => {
            const r = canvas.getBoundingClientRect();
            W = r.width; H = r.height;
            canvas.width = W * DPR; canvas.height = H * DPR;
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            ctx.fillStyle = "#07111d"; ctx.fillRect(0, 0, W, H); // 트레일 베이스
        };
        fit();

        const BG = "rgba(7,17,29,0.28)", INK = "#fbfaf8", GRAY = "#8794a6", AC = "#8ab4f8";
        let time = 0, raf = 0, visible = false, last = 0;

        const draw = (p: number, dt: number) => {
            time += dt;
            ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); // 트레일 페이드
            const cx = W / 2, cy = H / 2, R0 = Math.min(W, H);

            const pull = easeOut(seg(p, 0.1, 0.45));   // 산개 → 궤도
            const link = seg(p, 0.4, 0.6);              // 연결선
            const collapse = easeOut(seg(p, 0.55, 0.8)); // 궤도 → 점
            const fin = seg(p, 0.8, 1);                  // MAKETHIS1

            const N = VENDORS.length;
            const pts: { x: number; y: number }[] = [];
            for (let i = 0; i < N; i++) {
                // 산개 위치: 시드 기반 표류
                const sx = W * (0.12 + seed(i * 3 + 1) * 0.76) + Math.sin(time * 0.5 + i * 2.1) * 14 * (1 - pull);
                const sy = H * (0.14 + seed(i * 7 + 2) * 0.72) + Math.cos(time * 0.42 + i * 1.7) * 12 * (1 - pull);
                // 궤도 위치
                const ang = (i / N) * Math.PI * 2 - Math.PI / 2 + time * 0.18 * (1 - collapse);
                const rad = R0 * 0.34 * (1 - collapse);
                const ox = cx + Math.cos(ang) * rad * 1.25;
                const oy = cy + Math.sin(ang) * rad * 0.8;
                pts.push({ x: lerp(sx, ox, pull), y: lerp(sy, oy, pull) });
            }

            // 연결선 — 궤도에 들어온 뒤 이웃끼리 이어진다
            if (link > 0 && collapse < 1) {
                ctx.strokeStyle = `rgba(138,180,248,${0.5 * link * (1 - collapse)})`;
                ctx.lineWidth = 1;
                for (let i = 0; i < N; i++) {
                    const a = pts[i], b = pts[(i + 1) % N];
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                }
            }
            // 중심으로 빨려드는 선
            if (collapse > 0 && collapse < 1) {
                ctx.strokeStyle = `rgba(138,180,248,${0.35 * (1 - collapse)})`;
                pts.forEach((pt) => { ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(cx, cy); ctx.stroke(); });
            }

            // 업체 노드
            const nodeA = 1 - collapse;
            if (nodeA > 0.01) {
                pts.forEach((pt, i) => {
                    ctx.globalAlpha = nodeA;
                    ctx.fillStyle = INK;
                    ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.5, 0, 7); ctx.fill();
                    ctx.font = "500 12px Pretendard, sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillStyle = GRAY;
                    ctx.fillText(VENDORS[i], pt.x, pt.y - 12);
                    ctx.globalAlpha = 1;
                });
            }

            // 중심 점 — 전부를 삼킨 하나
            const coreR = 3 + collapse * 5 + Math.sin(time * 2.5) * (0.6 + fin);
            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46);
            glow.addColorStop(0, `rgba(138,180,248,${0.5 + collapse * 0.4})`);
            glow.addColorStop(1, "rgba(138,180,248,0)");
            ctx.fillStyle = glow; ctx.fillRect(cx - 46, cy - 46, 92, 92);
            ctx.fillStyle = AC; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, 7); ctx.fill();

            // 최종 — MAKETHIS1 + 세 개의 결과 라벨
            if (fin > 0) {
                ctx.globalAlpha = fin;
                ctx.textAlign = "center";
                ctx.font = "600 20px 'Noto Serif KR', serif";
                ctx.fillStyle = INK;
                ctx.fillText("MAKETHIS1", cx, cy + 42);
                ctx.font = "500 12.5px Pretendard, sans-serif";
                RESULTS.forEach((r, i) => {
                    const t = seg(fin, 0.3 + i * 0.2, 0.55 + i * 0.2);
                    if (t <= 0) return;
                    ctx.globalAlpha = fin * t;
                    ctx.fillStyle = GRAY;
                    ctx.fillText(r, cx + (i - 1) * Math.min(150, W * 0.24), cy + 70);
                });
                ctx.globalAlpha = 1;
            }
        };

        const readP = () => {
            const v = parseFloat(stageEl.style.getPropertyValue("--p"));
            return Number.isNaN(v) ? 0 : v;
        };

        if (reduced) {
            // 정적 최종 프레임 한 번
            ctx.fillStyle = "#07111d"; ctx.fillRect(0, 0, W, H);
            draw(1, 0);
            return;
        }

        draw(readP(), 0.016); // 첫 프레임 즉시 — IO 콜백 전 빈 캔버스 방지

        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            const dt = Math.min(33, t - last) / 1000 || 0.016; last = t;
            if (visible) draw(readP(), dt);
        };
        const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? false; }, { rootMargin: "80px" });
        io.observe(canvas);
        addEventListener("resize", fit, { passive: true });
        raf = requestAnimationFrame(frame);
        return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener("resize", fit); };
    }, [stageRef]);

    return <canvas ref={canvasRef} className="mt-conv-canvas" aria-hidden="true" />;
}

function Column({
    label,
    items,
    accent = false,
    index = 0,
}: {
    label: string;
    items: string[];
    accent?: boolean;
    index?: number;
}) {
    return (
        <Reveal index={index}>
            <div
                className="h-full px-7 py-9 md:px-9 md:py-11"
                style={{
                    background: "var(--mt-dark-bg)",
                    border: `1px solid ${accent ? "var(--mt-accent)" : "var(--mt-line)"}`,
                }}
            >
                <p className="mt-en mt-label" style={{ color: accent ? "var(--mt-accent)" : "var(--mt-gray)" }}>
                    {label}
                </p>
                <ul className="mt-7 flex flex-col gap-5">
                    {items.map((it) => (
                        <li key={it} className="flex gap-3 text-[14.5px] leading-[1.7]">
                            <span aria-hidden style={{ color: accent ? "var(--mt-accent)" : "var(--mt-gray)" }}>
                                {accent ? "―" : "×"}
                            </span>
                            <span style={{ color: accent ? "var(--mt-bg)" : "var(--mt-gray)" }}>{it}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </Reveal>
    );
}

export default function ProblemSection() {
    const stageRef = useScrollProgress<HTMLDivElement>("enter");

    return (
        <section
            data-clause="BEFORE · AFTER"
            className="mt-dark-glow py-[88px] md:py-[140px]"
            style={{
                background: "var(--mt-dark-bg)",
                color: "var(--mt-bg)",
                ["--mt-gray" as string]: "var(--mt-dark-gray)",
                ["--mt-line" as string]: "var(--mt-dark-line)",
                ["--mt-ink" as string]: "var(--mt-bg)",
                ["--mt-accent" as string]: "var(--mt-accent-on-dark)",
            }}
        >
            <div ref={stageRef} className="mt-stage">
                <Container>
                    <SectionHeader
                        eyebrow="Before · After"
                        serif
                        title={BEFORE_AFTER.title.map((line, i) => (
                            <span key={line} className={i > 0 ? "block" : undefined}>
                                {line}
                            </span>
                        ))}
                    />

                    <div className="mt-8">
                        <ScrollHint>아래로 스크롤하면, 흩어진 업체들이 하나로 모입니다</ScrollHint>
                    </div>

                    {/* ── ONE 수렴 시네마 ── */}
                    <div className="mt-6">
                        <ConvergenceCanvas stageRef={stageRef} />
                    </div>

                    {/* 전환 문장 */}
                    <p
                        className="mt-pi mt-10 text-center mt-serif text-[clamp(1.05rem,1.8vw,1.35rem)] font-semibold leading-[1.7]"
                        style={{ color: "var(--mt-bg)", ["--a" as string]: 0.45, ["--w" as string]: 0.15 }}
                    >
                        여러 업체를 관리하던 구조에서
                        <br className="sm:hidden" /> 하나의 팀이 운영하는 구조로.
                    </p>

                    <div className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Column label={BEFORE_AFTER.before.label} items={BEFORE_AFTER.before.items} />
                        <Column label={BEFORE_AFTER.after.label} items={BEFORE_AFTER.after.items} accent index={1} />
                    </div>
                </Container>
            </div>
        </section>
    );
}
