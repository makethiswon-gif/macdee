"use client";

import { useEffect, useRef, useState } from "react";
import { sectionProgress, storyProgress } from "./home-motion-state";
import s from "./home-motion.module.css";

/** One event-driven frame for all home-only sections. Nothing polls at rest. */
export default function HomeMotionController() {
    const ref = useRef<HTMLDivElement>(null);
    const paused = useRef(false);
    const syncRef = useRef(() => {});
    const [off, setOff] = useState(false);
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const control = ref.current;
        const root = control?.closest<HTMLElement>("[data-home-motion-root]");
        if (!root) return;
        const targets = [...root.querySelectorAll<HTMLElement>("[data-home-motion]")];
        const hero = root.querySelector<HTMLElement>("[data-assembly-hero]");
        const visible = new Set<HTMLElement>();
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        let frame = 0;
        let disposed = false;
        const stopped = () => media.matches || paused.current;
        const paint = () => {
            frame = 0;
            if (disposed || document.hidden) return;
            // Read all geometry first, then write: no interleaved forced layout.
            const readings = [...visible].map(el => ({ el, rect: el.getBoundingClientRect() }));
            const away = hero ? hero.getBoundingClientRect().bottom < 90 : false;
            const height = Math.max(1, window.innerHeight);
            for (const { el, rect } of readings) {
                const progress = stopped() ? 1 : el.dataset.motionRange === "story"
                    ? storyProgress(rect.top, rect.height, height) : sectionProgress(rect.top, height);
                el.style.setProperty("--section-progress", String(progress));
                el.dataset.motionStep = String(Math.min(2, Math.floor(progress * 3)));
                el.dataset.motionReady = "true";
            }
            if (control) control.dataset.away = String(away);
        };
        const request = () => {
            if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(paint);
        };
        const sync = () => {
            cancelAnimationFrame(frame); frame = 0;
            root.dataset.motionPaused = String(paused.current);
            root.dataset.reducedMotion = String(media.matches);
            setReduced(media.matches);
            if (stopped()) targets.forEach(el => {
                el.style.setProperty("--section-progress", "1");
                el.dataset.motionStep = "2";
                el.dataset.motionReady = "true";
            });
            request();
        };
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const el = entry.target as HTMLElement;
                if (entry.isIntersecting) visible.add(el);
                else {
                    visible.delete(el);
                    // A fast jump past a section must leave completed artwork behind.
                    if (entry.boundingClientRect.top < 0) {
                        el.style.setProperty("--section-progress", "1");
                        el.dataset.motionStep = "2";
                        el.dataset.motionReady = "true";
                    }
                }
            }
            request();
        }, { rootMargin: "100px 0px" });
        targets.forEach(el => observer.observe(el));
        syncRef.current = sync;
        media.addEventListener("change", sync);
        document.addEventListener("visibilitychange", sync);
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request, { passive: true });
        if (control) control.dataset.ready = "true";
        sync();
        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            observer.disconnect();
            media.removeEventListener("change", sync);
            document.removeEventListener("visibilitychange", sync);
            window.removeEventListener("scroll", request);
            window.removeEventListener("resize", request);
            targets.forEach(el => { el.style.removeProperty("--section-progress"); delete el.dataset.motionReady; delete el.dataset.motionStep; });
            delete root.dataset.motionPaused;
            delete root.dataset.reducedMotion;
            if (control) delete control.dataset.ready;
            syncRef.current = () => {};
        };
    }, []);

    return <div ref={ref} className={s.motionControl} data-away="false">
        <button type="button" disabled={reduced} onClick={() => {
            paused.current = !paused.current;
            setOff(paused.current);
            syncRef.current();
        }}>{reduced ? "모션 감소 적용" : off ? "본문 모션 켜기" : "본문 모션 끄기"}<span aria-hidden>{off || reduced ? "▷" : "Ⅱ"}</span></button>
    </div>;
}
