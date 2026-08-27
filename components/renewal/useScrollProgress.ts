"use client";

import { useEffect, useRef } from "react";

// 스크롤 연동 진행도를 CSS 변수 --p (0→1) 로 내보낸다.
//
// 설계 원칙
//  - 스크롤 핸들러에서 계산하지 않는다. rAF 안에서 rect 를 한 번만 읽는다.
//  - JS 는 숫자 하나만 쓴다. 실제 애니메이션은 전부 CSS 의 transform/opacity 다.
//    → 레이아웃 재계산이 없고, 새 애니메이션 라이브러리도 필요 없다.
//  - 값이 안 바뀌면 DOM 을 건드리지 않는다(소수점 3자리에서 비교).
//  - prefers-reduced-motion 이면 즉시 1 로 고정하고 관찰을 멈춘다.
//    → 정보가 애니메이션 없이 전부 보이는 상태가 된다.
//
// 반환한 ref 를 "스크롤되는 동안 진행도를 만들 구간"에 붙인다.
// 보통 sticky 자식을 가진 큰 wrapper 다.

// mode
//   "pin"   구간이 뷰포트보다 크다(sticky 무대). 구간을 통과하는 동안 0→1.
//   "enter" 구간이 뷰포트보다 작다. 화면에 들어와 지나갈 때까지 0→1.
export function useScrollProgress<T extends HTMLElement>(mode: "pin" | "enter" = "pin") {
    const ref = useRef<T>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (reduce.matches) {
            el.style.setProperty("--p", "1");
            return;
        }

        let frame = 0;
        let last = -1;
        let visible = false;

        const measure = () => {
            frame = 0;
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight || 1;

            let p: number;
            const total = rect.height - vh;

            if (mode === "pin" && total > 0) {
                // 시작: 구간 상단이 뷰포트 상단에 닿을 때
                // 끝  : 구간 하단이 뷰포트 하단에 닿을 때
                p = -rect.top / total;
            } else {
                // 요소가 화면 아래 3/4 지점에 닿으면 시작해서,
                // 요소 하단이 화면 중앙을 지날 때 끝난다.
                const start = vh * 0.82;
                const span = rect.height * 0.55 + vh * 0.24;
                p = (start - rect.top) / span;
            }

            const clamped = p < 0 ? 0 : p > 1 ? 1 : p;

            const rounded = Math.round(clamped * 1000) / 1000;
            if (rounded !== last) {
                last = rounded;
                el.style.setProperty("--p", String(rounded));
            }
        };

        const onScroll = () => {
            if (!visible || frame) return;
            frame = requestAnimationFrame(measure);
        };

        // 화면 밖에서는 아무 것도 계산하지 않는다
        const io = new IntersectionObserver(
            (entries) => {
                visible = entries[0]?.isIntersecting ?? false;
                if (visible) onScroll();
            },
            { rootMargin: "120px 0px" }
        );

        io.observe(el);
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        measure();

        return () => {
            io.disconnect();
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [mode]);

    return ref;
}

// 데스크톱/모바일 분기는 JS 로 하지 않는다.
// sticky 여부와 레이아웃은 CSS 미디어쿼리로 전환한다(renewal.css 의 .mt-stage).
// JS 로 판정하면 하이드레이션 전후가 달라져 CLS 가 생긴다.
