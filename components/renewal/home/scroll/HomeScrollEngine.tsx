"use client";

import { useEffect, useRef } from "react";
import { startHomeScroll } from "./engine";

/** 스크롤 홈의 움직임을 켠다. 화면에는 아무것도 그리지 않고, 가장 가까운 [data-hs] 뿌리를 찾아 엔진을 붙인다. */
export default function HomeScrollEngine() {
    const mark = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const root = mark.current?.closest<HTMLElement>("[data-hs]");
        if (!root) return;
        return startHomeScroll(root);
    }, []);
    return <span ref={mark} hidden />;
}
