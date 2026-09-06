"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

// 스크롤 진입 시 한 번만 나타난다. 되감기 없음 — 스크롤을 올릴 때마다 다시
// 사라지는 연출은 읽는 사람을 방해한다.
//
// 효과는 내용에 맞춰 고른다. 전부 아래에서 올라오게 하지 않는다.
//   rise  기본. 문단·카드
//   mask  큰 제목. 글자가 아래에서 밀려 올라온다
//   line  구분선·강조선. 좌에서 우로 그어진다
//   fade  사진·큰 블록. 위치 이동 없음
//   scale 이미지. 살짝 줄어든 상태에서 제자리로
//
// 실제 트랜지션은 전부 renewal.css 에 있다. 여기서는 data 속성만 토글한다.
// JS 가 없으면 hidden 상태가 아예 적용되지 않아 본문이 그대로 보인다.

export type RevealVariant = "rise" | "mask" | "line" | "fade" | "scale";

interface RevealProps {
    children: ReactNode;
    /** 같은 그룹 안에서 순차 등장. 인덱스 × stagger */
    index?: number;
    /** 기본 70ms. 큰 연출은 늘린다 */
    stagger?: number;
    variant?: RevealVariant;
    as?: ElementType;
    className?: string;
}

export default function Reveal({
    children,
    index = 0,
    stagger = 70,
    variant = "rise",
    as: Tag = "div",
    className = "",
}: RevealProps) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    el.setAttribute("data-in", "1");
                    io.unobserve(el);
                }
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0 }
        );

        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <Tag
            ref={ref}
            data-reveal={variant}
            style={{ transitionDelay: `${index * stagger}ms` }}
            className={className}
        >
            {/* mask 는 안쪽 요소를 밀어 올리므로 래퍼가 하나 더 필요하다 */}
            {variant === "mask" ? <span>{children}</span> : children}
        </Tag>
    );
}
