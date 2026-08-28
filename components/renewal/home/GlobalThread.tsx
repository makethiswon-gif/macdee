"use client";

import { useEffect, useRef } from "react";

// ONE BLUE THREAD — 전역 진행 레일 (데스크톱 전용, 장식).
//
// 화면 우측의 아주 얇은 세로 선이 스크롤에 따라 파란색으로 채워지고
// 현재 섹션의 조 번호를 보여준다. aria-hidden + pointer-events:none —
// 콘텐츠와 버튼을 절대 가리지 않는다. 모바일에서는 렌더하지 않는다(CSS).
// rAF 로 묶은 단일 스크롤 리스너 하나만 쓴다.

export default function GlobalThread() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            el.style.setProperty("--gp", "1");
            return;
        }

        const labelEl = el.querySelector<HTMLElement>(".label");
        let sections: { top: number; label: string }[] = [];

        const collect = () => {
            sections = [...document.querySelectorAll<HTMLElement>("[data-clause]")]
                .map((s) => ({
                    top: s.getBoundingClientRect().top + window.scrollY,
                    label: s.dataset.clause || "",
                }))
                .sort((a, b) => a.top - b.top);
        };

        let frame = 0;
        const update = () => {
            frame = 0;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const p = max > 0 ? Math.min(1, window.scrollY / max) : 1;
            el.style.setProperty("--gp", p.toFixed(4));
            const y = window.scrollY + window.innerHeight * 0.35;
            let cur = sections[0]?.label ?? "";
            for (const s of sections) if (y >= s.top) cur = s.label;
            if (labelEl && labelEl.textContent !== cur) labelEl.textContent = cur;
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        const onResize = () => {
            collect();
            onScroll();
        };

        collect();
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onResize);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div ref={ref} className="mt-rail-global" aria-hidden="true">
            <span className="label" />
            <div className="bar">
                <span className="fill" />
            </div>
        </div>
    );
}
