"use client";

import { useEffect } from "react";

/** Progressive enhancement: only decorative geometry changes; no text is hidden.
 * No continuous animation loop, no scroll hijack, and live motion preference support.
 */
export default function ConceptMotion() {
    useEffect(() => {
        const hero = document.querySelector<HTMLElement>("[data-concept-hero]");
        if (!hero) return;
        const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
        let frame = 0;
        let visible = true;
        const render = () => {
            frame = 0;
            if (preference.matches) {
                hero.style.removeProperty("--travel");
                return;
            }
            const rect = hero.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
            hero.style.setProperty("--travel", progress.toFixed(3));
        };
        const request = () => {
            if (visible && !frame) frame = requestAnimationFrame(render);
        };
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) request();
        });
        observer.observe(hero);
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request);
        preference.addEventListener("change", render);
        render();
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("scroll", request);
            window.removeEventListener("resize", request);
            preference.removeEventListener("change", render);
            hero.style.removeProperty("--travel");
        };
    }, []);
    return null;
}
