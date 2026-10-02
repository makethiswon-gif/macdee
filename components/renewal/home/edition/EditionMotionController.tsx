"use client";

import { useEffect, useRef, useState } from "react";
import { editionHeroProgress, editionProgress } from "./edition-motion-state";
import s from "./edition-home.module.css";

/** One event-driven scheduler; no animation frame loop when the page is idle. */
export default function EditionMotionController() {
    const ref = useRef<HTMLDivElement>(null);
    const paused = useRef(false);
    const synchronize = useRef(() => {});
    const [off, setOff] = useState(false);
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const control = ref.current;
        const root = control?.closest<HTMLElement>("[data-edition-root]");
        if (!root || !control) return;
        const targets = [...root.querySelectorAll<HTMLElement>("[data-edition-scene]")];
        const hero = root.querySelector<HTMLElement>("[data-home-edition-hero]");
        const visible = new Set<HTMLElement>();
        const focused = new Set<HTMLElement>();
        const media = matchMedia("(prefers-reduced-motion: reduce)");
        const short = matchMedia("(max-height: 540px) and (min-width: 700px)");
        let frame = 0;
        let disposed = false;
        let heroVisible = true;
        let mouseX = 0;
        let mouseY = 0;
        const stopped = () => paused.current || media.matches;
        const complete = (el: HTMLElement) => {
            el.style.setProperty("--ep", "1");
            el.dataset.editionStep = "2";
        };
        const paint = () => {
            frame = 0;
            if (disposed || document.hidden) return;
            const viewport = Math.max(1, window.innerHeight);
            // Every layout read happens before any CSS-variable write.
            const readings = [...visible].map(el => {
                // The estimate's heading can be tall; animate when its actual sheets enter.
                const anchor = el.dataset.editionScene === "estimate-fan" ? el.querySelector(".grid") || el : el;
                return { el, rect: anchor.getBoundingClientRect() };
            });
            const heroBox = heroVisible ? hero?.getBoundingClientRect() : null;
            for (const { el, rect } of readings) {
                const progress = stopped() || short.matches || focused.has(el) || el.querySelector("details[open]")
                    ? 1 : editionProgress(rect.top, rect.height, viewport, el.dataset.editionRange === "story");
                el.style.setProperty("--ep", String(progress));
                el.dataset.editionStep = String(Math.min(2, Math.floor(progress * 3)));
                el.dataset.editionReady = "true";
            }
            if (hero && heroBox) {
                hero.style.setProperty("--scroll", String(stopped() ? 0 : editionHeroProgress(heroBox.top, heroBox.height)));
                hero.style.setProperty("--mx", String(stopped() ? 0 : mouseX));
                hero.style.setProperty("--my", String(stopped() ? 0 : mouseY));
            }
        };
        const request = () => {
            if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(paint);
        };
        const sync = () => {
            cancelAnimationFrame(frame); frame = 0;
            root.dataset.motionPaused = String(paused.current);
            root.dataset.reducedMotion = String(media.matches);
            root.dataset.shortViewport = String(short.matches);
            setReduced(media.matches);
            if (stopped() || short.matches) targets.forEach(complete);
            if (hero) {
                hero.dataset.playing = String(!stopped() && !document.hidden && heroVisible);
                if (stopped()) {
                    hero.style.setProperty("--scroll", "0");
                    hero.style.setProperty("--mx", "0");
                    hero.style.setProperty("--my", "0");
                }
            }
            request();
        };
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const el = entry.target as HTMLElement;
                if (el === hero) { heroVisible = entry.isIntersecting; continue; }
                if (entry.isIntersecting) visible.add(el);
                else { visible.delete(el); if (entry.boundingClientRect.top < 0) complete(el); }
            }
            sync();
        }, { rootMargin: "80px 0px" });
        const pointer = (event: PointerEvent) => {
            if (!hero || event.pointerType !== "mouse" || stopped()) return;
            const box = hero.getBoundingClientRect();
            mouseX = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
            mouseY = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
            request();
        };
        const leave = () => { mouseX = 0; mouseY = 0; request(); };
        const focus = (event: FocusEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const scene = target.closest<HTMLElement>("[data-edition-scene]");
            if (scene && root.contains(scene)) { focused.add(scene); complete(scene); }
        };
        const blur = (event: FocusEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const scene = target.closest<HTMLElement>("[data-edition-scene]");
            if (scene && !(event.relatedTarget instanceof Node && scene.contains(event.relatedTarget))) {
                focused.delete(scene); request();
            }
        };
        targets.forEach(el => observer.observe(el));
        if (hero) {
            observer.observe(hero);
            hero.dataset.ready = "true";
            hero.addEventListener("pointermove", pointer);
            hero.addEventListener("pointerleave", leave);
        }
        media.addEventListener("change", sync);
        short.addEventListener("change", sync);
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request, { passive: true });
        document.addEventListener("visibilitychange", sync);
        root.addEventListener("focusin", focus);
        root.addEventListener("focusout", blur);
        root.addEventListener("toggle", request, true);
        synchronize.current = sync;
        control.dataset.ready = "true";
        root.dataset.editionReady = "true";
        sync();
        return () => {
            disposed = true; cancelAnimationFrame(frame); observer.disconnect();
            media.removeEventListener("change", sync); short.removeEventListener("change", sync);
            window.removeEventListener("scroll", request); window.removeEventListener("resize", request);
            document.removeEventListener("visibilitychange", sync);
            root.removeEventListener("focusin", focus); root.removeEventListener("focusout", blur);
            root.removeEventListener("toggle", request, true);
            hero?.removeEventListener("pointermove", pointer); hero?.removeEventListener("pointerleave", leave);
            targets.forEach(el => {
                el.style.removeProperty("--ep");
                delete el.dataset.editionReady; delete el.dataset.editionStep;
            });
            delete root.dataset.editionReady;
            delete root.dataset.motionPaused; delete root.dataset.reducedMotion; delete root.dataset.shortViewport;
            delete control.dataset.ready;
            if (hero) {
                delete hero.dataset.ready; hero.dataset.playing = "false";
                ["--scroll", "--mx", "--my"].forEach(property => hero.style.removeProperty(property));
            }
            synchronize.current = () => {};
        };
    }, []);

    return <div ref={ref} className={s.controls}>
        <button type="button" disabled={reduced} aria-pressed={off || reduced} onClick={() => {
            paused.current = !paused.current; setOff(paused.current); synchronize.current();
        }}><span aria-hidden>{off || reduced ? "▷" : "Ⅱ"}</span>{reduced ? "모션 감소 적용" : off ? "모션 켜기" : "모션 끄기"}</button>
    </div>;
}
