"use client";
import { useEffect, useRef, useState } from "react";
import s from "./bold.module.css";

export default function BoldMotion() {
    const control = useRef<HTMLDivElement>(null);
    const [paused, setPaused] = useState(false);
    const [reduced, setReduced] = useState(false);
    const [ready, setReady] = useState(false);
    const manualPause = useRef(false);
    const syncRef = useRef<() => void>(() => {});
    useEffect(() => {
        const hero = control.current?.closest<HTMLElement>("[data-bold-hero]");
        if (!hero) return;
        const media = matchMedia("(prefers-reduced-motion: reduce)");
        let inView = true;
        let frame = 0;
        let px = 0, py = 0;
        const sync = () => {
            setReduced(media.matches);
            hero.dataset.motionState = media.matches ? "reduced" : manualPause.current ? "paused" : !inView || document.hidden ? "suspended" : "running";
            if (hero.dataset.motionState !== "running") {
                cancelAnimationFrame(frame); frame = 0;
                if (media.matches) {
                    hero.style.setProperty("--progress", "0");
                    hero.style.setProperty("--mx", "0");
                    hero.style.setProperty("--my", "0");
                }
            } else request();
        };
        const draw = () => {
            frame = 0;
            const rect = hero.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height * .8)));
            hero.style.setProperty("--progress", progress.toFixed(4));
            hero.style.setProperty("--mx", px.toFixed(3));
            hero.style.setProperty("--my", py.toFixed(3));
        };
        function request() { if (!frame && hero?.dataset.motionState === "running") frame = requestAnimationFrame(draw); }
        const pointer = (event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            const rect = hero.getBoundingClientRect();
            px = ((event.clientX - rect.left) / rect.width - .5) * 2;
            py = ((event.clientY - rect.top) / rect.height - .5) * 2;
            request();
        };
        const leave = () => { px = 0; py = 0; request(); };
        const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0 });
        observer.observe(hero.querySelector('[data-motion-viewport]') || hero);
        syncRef.current = sync;
        media.addEventListener("change", sync);
        document.addEventListener("visibilitychange", sync);
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request);
        hero.addEventListener("pointermove", pointer, { passive: true });
        hero.addEventListener("pointerleave", leave);
        setReady(true); sync();
        return () => {
            cancelAnimationFrame(frame); observer.disconnect();
            media.removeEventListener("change", sync);
            document.removeEventListener("visibilitychange", sync);
            window.removeEventListener("scroll", request);
            window.removeEventListener("resize", request);
            hero.removeEventListener("pointermove", pointer);
            hero.removeEventListener("pointerleave", leave);
            hero.dataset.motionState = "static";
        };
    }, []);
    return <div className={s.motionControl} ref={control} data-motion-control>
        <span className={s.motionDot} aria-hidden />
        <button type="button" disabled={!ready || reduced} aria-pressed={paused} onClick={() => {
            manualPause.current = !manualPause.current;
            setPaused(manualPause.current); syncRef.current();
        }}>
            <span className={s.controlRunning}>모션 멈추기</span>
            <span className={s.controlPaused}>모션 재생</span>
            <span className={s.controlReduced}>모션 감소 적용</span>
        </button>
    </div>;
}
