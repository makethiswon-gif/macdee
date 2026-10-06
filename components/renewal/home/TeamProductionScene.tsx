import { DISCIPLINES } from "@/data/renewal/site";
import s from "./team-production.module.css";

/** Decorative working layers; the matching discipline copy stays in the legend. */
function DisciplineArtwork({ discipline }: { discipline: string }) {
    if (discipline === "LEGAL") {
        return (
            <svg viewBox="0 0 220 300" fill="none">
                <path d="M30 18H146L190 62V280H30V18Z" fill="white" stroke="currentColor" strokeWidth="3" />
                <path d="M146 18V62H190" stroke="currentColor" strokeWidth="3" />
                <path d="M54 91H139M54 112H163M54 133H163M54 154H119" stroke="currentColor" strokeWidth="7" />
                <rect x="53" y="181" width="111" height="72" fill="currentColor" />
                <path d="M77 215L95 233L140 196" stroke="white" strokeWidth="9" />
            </svg>
        );
    }
    if (discipline === "EDITORIAL") {
        return (
            <svg viewBox="0 0 400 135" fill="none">
                <rect x="18" y="15" width="78" height="105" fill="currentColor" />
                <path d="M120 30H370M120 55H337" stroke="currentColor" strokeWidth="14" />
                <path d="M120 85H370M120 103H300" stroke="currentColor" strokeWidth="5" />
            </svg>
        );
    }
    if (discipline === "PERFORMANCE") {
        return (
            <svg viewBox="0 0 260 170" fill="none">
                <path d="M24 19V144H241" stroke="currentColor" strokeWidth="3" />
                <rect x="45" y="91" width="36" height="52" fill="currentColor" />
                <rect x="103" y="65" width="36" height="78" fill="currentColor" opacity=".65" />
                <rect x="161" y="26" width="36" height="117" fill="currentColor" />
                <path d="M47 59L106 36L168 12H231" stroke="currentColor" strokeWidth="5" />
            </svg>
        );
    }
    if (discipline === "DESIGN") {
        return (
            <svg viewBox="0 0 400 270" fill="none">
                <rect x="18" y="18" width="364" height="234" stroke="currentColor" strokeWidth="3" />
                <path d="M112 70L216 30H287V238H214V99L136 129L112 70Z" fill="currentColor" />
                <rect x="33" y="194" width="94" height="43" fill="currentColor" />
                <circle cx="335" cy="64" r="25" fill="currentColor" />
                <path d="M303 155H366M334 124V187" stroke="currentColor" strokeWidth="5" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 260 225" fill="none">
            <rect x="18" y="20" width="224" height="57" stroke="currentColor" strokeWidth="3" />
            <circle cx="48" cy="45" r="12" stroke="currentColor" strokeWidth="4" />
            <path d="M57 54L66 63M85 45H216" stroke="currentColor" strokeWidth="4" />
            <rect x="19" y="101" width="36" height="36" fill="currentColor" />
            <path d="M73 109H215M73 128H178" stroke="currentColor" strokeWidth="6" />
            <rect x="19" y="161" width="36" height="36" fill="currentColor" />
            <path d="M73 169H215M73 188H163" stroke="currentColor" strokeWidth="6" />
        </svg>
    );
}

/** Server-rendered labels with a scroll-driven, decorative production board. */
export default function TeamProductionScene() {
    return (
        <figure className={s.track} data-home-motion="team-story" data-motion-range="story" aria-labelledby="team-production-title">
            <div className={s.pin}>
                <div className={s.frame}>
                    <div className={s.caption}>
                        <span id="team-production-title" className={s.teamTitle}>ONE TEAM</span>
                        <span className={s.captionRule} aria-hidden="true" />
                        <span className={s.brand}>MAKETHIS1</span>
                    </div>

                    <div className={s.board} aria-hidden="true">
                        <div className={s.boardGrid} />
                        <div className={s.workspace}>
                            <div className={s.browserBar}>
                                <span /><span /><span />
                                <span className={s.browserName}>MAKETHIS1</span>
                            </div>
                            <div className={s.workspaceRule} />
                        </div>
                        <span className={s.boardWord}>MAKE<br />THIS 1</span>
                        {DISCIPLINES.map((discipline) => (
                            <div key={discipline.en} className={`${s.layer} ${s[discipline.en.toLowerCase()]}`}>
                                <span className={s.layerTab}>{discipline.en}</span>
                                <div className={s.layerArt}>
                                    <DisciplineArtwork discipline={discipline.en} />
                                </div>
                            </div>
                        ))}
                        <div className={s.outputLabel}>DOCUMENT / CREATIVE / WEBSITE</div>
                    </div>

                    <ul className={s.legend}>
                        {DISCIPLINES.map((discipline) => (
                            <li key={discipline.en}>
                                <span className={s.disciplineName}>{discipline.en}</span>
                                <span className={s.disciplineCopy}>{discipline.ko}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </figure>
    );
}
