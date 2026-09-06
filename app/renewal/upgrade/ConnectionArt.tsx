"use client";

import { useScrollProgress } from "@/components/renewal/useScrollProgress";
import styles from "./upgrade.module.css";

// Decorative only: the six separated tracks converge as the reader scrolls.
// All pricing and service copy stays server-rendered, static and outside this art.
export default function ConnectionArt() {
    const ref = useScrollProgress<HTMLDivElement>("enter");
    return <div ref={ref} className={styles.art} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map(i => <span key={i} style={{ "--track": i } as React.CSSProperties} />)}
    </div>;
}
