"use client";

import { useEffect } from "react";

// 인트로 감독 — JS 는 "끝내는 일"만 한다.
//
// 재생 여부는 HeroSection 의 프리페인트 인라인 스크립트가 이미 결정했다
// (html[data-intro="play"], sessionStorage 'renewalIntroSeen').
// 애니메이션은 전부 CSS 타임라인이라 여기서는 타이머와 스킵만 관리한다.
//
// 스킵/종료 = 속성 제거. 기본 스타일이 곧 최종 상태이므로
// 속성이 사라지는 순간 어떤 시점에서든 즉시 최종 히어로가 된다.
// 포커스를 잡지 않는다 — 오버레이는 aria-hidden + pointer-events:none 이고
// 좌측 CTA 는 클릭(=스킵) 즉시 나타난다.

const TOTAL_MS = 7200; // 데스크톱 타임라인(~6.6s, --iT:2) + 여유. 모바일은 그보다 먼저 끝난다.

export default function HeroIntro() {
    useEffect(() => {
        const html = document.documentElement;
        if (html.getAttribute("data-intro") !== "play") return;

        const end = () => {
            html.removeAttribute("data-intro");
            clearTimeout(timer);
            window.removeEventListener("scroll", end);
            window.removeEventListener("pointerdown", end);
            window.removeEventListener("keydown", end);
        };

        const timer = setTimeout(end, TOTAL_MS);
        window.addEventListener("scroll", end, { passive: true });
        window.addEventListener("pointerdown", end, { passive: true });
        window.addEventListener("keydown", end);

        return end; // 라우트 이탈 시에도 속성이 남지 않게
    }, []);

    return null;
}
