"use client";

import { useEffect, useRef, useState } from "react";
import { ASSEMBLY_DURATION_MS, assemblyEase, assemblyScrollProgress, clampUnit } from "./assembly-motion-state";
import s from "./assembly-hero.module.css";

export default function AssemblyMotion() {
    const control = useRef<HTMLDivElement>(null);
    const pausedRef = useRef(false);
    const actions = useRef({ sync: () => {}, replay: () => {} });
    const [ready, setReady] = useState(false);
    const [paused, setPaused] = useState(false);
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const hero = control.current?.closest<HTMLElement>("[data-assembly-hero]");
        const stage = hero?.querySelector<HTMLElement>("[data-assembly-stage]");
        const artwork = hero?.querySelector<HTMLElement>("[data-assembly-viewport]");
        if (!hero || !stage || !artwork) return;

        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
        let inView = false;
        let frame = 0;
        let elapsed = 0;
        let previousTime: number | null = null;
        let assembly = 0;
        let pointerX = 0;
        let pointerY = 0;
        let disposed = false;

        const paint = () => {
            hero.style.setProperty("--assembly", assembly.toFixed(4));
            hero.style.setProperty("--pointer-x", pointerX.toFixed(3));
            hero.style.setProperty("--pointer-y", pointerY.toFixed(3));
        };
        const canMove = () => !disposed && inView && !document.hidden && !media.matches && !pausedRef.current;
        const suspend = () => {
            cancelAnimationFrame(frame);
            frame = 0;
            previousTime = null;
        };
        const draw = (now: number) => {
            frame = 0;
            if (!canMove()) return;
            if (previousTime !== null) elapsed += Math.max(0, now - previousTime);
            previousTime = now;
            const rect = artwork.getBoundingClientRect();
            assembly = Math.max(assembly, assemblyEase(elapsed / ASSEMBLY_DURATION_MS), assemblyScrollProgress(rect.top, rect.height));
            paint();
            hero.dataset.motionState = assembly >= 1 ? "complete" : "running";
            if (assembly < 1) frame = requestAnimationFrame(draw);
            else previousTime = null;
        };
        function request() {
            if (!frame && canMove()) frame = requestAnimationFrame(draw);
        }
        const sync = () => {
            if (disposed) return;
            setReduced(media.matches);
            suspend();
            if (media.matches) {
                assembly = 1;
                pointerX = pointerY = 0;
                paint();
                hero.dataset.motionState = "reduced";
            } else if (pausedRef.current) {
                hero.dataset.motionState = "paused";
            } else if (!inView || document.hidden) {
                hero.dataset.motionState = "suspended";
            } else {
                hero.dataset.motionState = assembly >= 1 ? "complete" : "running";
                request();
            }
        };
        const pointer = (event: PointerEvent) => {
            if (!canMove() || !finePointer.matches || event.pointerType !== "mouse") return;
            const rect = stage.getBoundingClientRect();
            pointerX = clampUnit((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointerY = clampUnit((event.clientY - rect.top) / rect.height) * 2 - 1;
            request();
        };
        const leave = () => {
            if (!canMove()) return;
            pointerX = pointerY = 0;
            request();
        };
        const pointerMode = () => {
            pointerX = pointerY = 0;
            if (canMove()) { paint(); request(); }
        };
        const replay = () => {
            if (media.matches || disposed) return;
            suspend();
            pausedRef.current = false;
            setPaused(false);
            elapsed = 0;
            assembly = 0;
            pointerX = pointerY = 0;
            paint();
            sync();
        };
        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
            sync();
        }, { threshold: [0, 0.15] });

        // SSR is the complete, readable composition. Only the art is enhanced.
        paint();
        observer.observe(artwork);
        actions.current = { sync, replay };
        media.addEventListener("change", sync);
        finePointer.addEventListener("change", pointerMode);
        document.addEventListener("visibilitychange", sync);
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request);
        stage.addEventListener("pointermove", pointer, { passive: true });
        stage.addEventListener("pointerleave", leave);
        setReady(true);
        sync();

        return () => {
            disposed = true;
            suspend();
            observer.disconnect();
            media.removeEventListener("change", sync);
            finePointer.removeEventListener("change", pointerMode);
            document.removeEventListener("visibilitychange", sync);
            window.removeEventListener("scroll", request);
            window.removeEventListener("resize", request);
            stage.removeEventListener("pointermove", pointer);
            stage.removeEventListener("pointerleave", leave);
            actions.current = { sync: () => {}, replay: () => {} };
            hero.style.removeProperty("--assembly");
            hero.style.removeProperty("--pointer-x");
            hero.style.removeProperty("--pointer-y");
            hero.dataset.motionState = "static";
        };
    }, []);

    return <div className={s.controls} ref={control} data-ready={ready} data-assembly-controls>
        <button type="button" aria-controls="home-assembly-art"
            disabled={!ready || reduced} onClick={() => {
                pausedRef.current = !pausedRef.current;
                setPaused(pausedRef.current);
                actions.current.sync();
            }}>{reduced ? "모션 감소 적용" : paused ? "모션 재생" : "모션 멈추기"}</button>
        <button type="button" aria-controls="home-assembly-art" disabled={!ready || reduced}
            onClick={() => actions.current.replay()}>다시 보기 <span aria-hidden>↻</span></button>
    </div>;
}
