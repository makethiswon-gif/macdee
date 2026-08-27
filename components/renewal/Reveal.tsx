"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

// 스크롤 진입 시 한 번만 나타난다. 되감기 없음 — 스크롤을 올릴 때마다 다시
// 사라지는 연출은 읽는 사람을 방해한다.
//
// framer-motion을 쓰지 않는 이유: 이 동작에 필요한 건 IntersectionObserver
// 하나뿐이고, 새 마케팅 페이지에 애니메이션 라이브러리를 얹으면 §40 번들 목표가
// 무너진다. 실제 트랜지션은 renewal.css의 [data-reveal] 두 줄이 담당한다.

interface RevealProps {
    children: ReactNode;
    /** 같은 그룹 안에서 순차 등장. 인덱스 × 70ms */
    index?: number;
    as?: ElementType;
    className?: string;
}

export default function Reveal({ children, index = 0, as: Tag = "div", className = "" }: RevealProps) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // 관찰 전에 이미 화면 안이면(새로고침·앵커 진입) 즉시 표시
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    el.setAttribute("data-reveal", "in");
                    io.unobserve(el);
                }
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
        );

        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <Tag
            ref={ref}
            data-reveal=""
            style={{ transitionDelay: `${index * 70}ms` }}
            className={className}
        >
            {children}
        </Tag>
    );
}
