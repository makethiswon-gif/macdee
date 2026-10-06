import EditionHero from "@/components/renewal/concepts/round-three/EditionHero";
import { HERO_BEFORE, HERO_CARD_TITLE, HERO_CARD_FOOT, PROOF_STATS } from "@/data/renewal/site";
import s from "./edition-home.module.css";

export default function HomeEditionHero() {
    return <div className={s.cover}>
        <EditionHero home />
        <div className={s.imprint}>
            <div className={s.imprintCopy}><p>{HERO_CARD_TITLE}</p><p>{HERO_CARD_FOOT}</p>
                <p className={s.before}>{HERO_BEFORE.map((word,i) => <span key={word}>{i > 0 && <i aria-hidden> · </i>}<s>{word}</s></span>)}<b aria-hidden> → </b><strong>MAKETHIS1.</strong></p>
            </div>
            <dl className={s.proof}>{PROOF_STATS.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}<span>{stat.suffix}</span></dd></div>)}</dl>
        </div>
    </div>;
}
