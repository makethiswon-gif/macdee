"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import s from "./review.module.css";

/** Bounded pointer/scroll updates; CSS owns the finite entrance choreography. */
export default function SceneStage({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [paused, setPaused] = useState(false);
    const [reduced, setReduced] = useState(false);
    const [replay, setReplay] = useState(0);

    useEffect(() => {
        const stage = ref.current;
        if (!stage) return;
        const media = matchMedia("(prefers-reduced-motion: reduce)");
        let raf = 0;
        let x = 0;
        let y = 0;
        let inView = true;
        const paint = () => {
            raf = 0;
            if (paused || media.matches || document.hidden || !inView) return;
            const box = stage.getBoundingClientRect();
            stage.style.setProperty("--mx", x.toFixed(3));
            stage.style.setProperty("--my", y.toFixed(3));
            stage.style.setProperty("--scroll", Math.min(1, Math.max(0, -box.top / Math.max(1, box.height * .8))).toFixed(3));
        };
        const request = () => { if (!raf) raf = requestAnimationFrame(paint); };
        const pointer = (event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            const box = stage.getBoundingClientRect();
            x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
            y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
            request();
        };
        const leave = () => { x = 0; y = 0; request(); };
        const sync = () => {
            setReduced(media.matches);
            stage.dataset.playing = String(!paused && !media.matches && !document.hidden && inView);
            if (media.matches) {
                stage.style.setProperty("--mx", "0"); stage.style.setProperty("--my", "0");
                stage.style.setProperty("--scroll", "0");
            }
            request();
        };
        const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0 });
        observer.observe(stage);
        stage.dataset.ready = "true";
        stage.addEventListener("pointermove", pointer);
        stage.addEventListener("pointerleave", leave);
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request, { passive: true });
        document.addEventListener("visibilitychange", sync);
        media.addEventListener("change", sync);
        sync();
        return () => {
            cancelAnimationFrame(raf); observer.disconnect();
            stage.removeEventListener("pointermove", pointer); stage.removeEventListener("pointerleave", leave);
            window.removeEventListener("scroll", request); window.removeEventListener("resize", request);
            document.removeEventListener("visibilitychange", sync); media.removeEventListener("change", sync);
        };
    }, [paused, replay]);

    return <>
        <div ref={ref} data-design-scene data-playing="false" className={s.stage}>
            <div key={replay} className={s.sceneContents}>{children}</div>
        </div>
        <div className={s.motionControls}>
            <button type="button" disabled={reduced} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{reduced ? "모션 감소 적용" : paused ? "재생 ▷" : "멈춤 Ⅱ"}</button>
            <button type="button" disabled={reduced} onClick={() => { setPaused(false); setReplay(value => value + 1); }}>다시 보기 ↻</button>
        </div>
    </>;
}
