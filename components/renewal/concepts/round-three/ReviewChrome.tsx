import Image from "next/image";
import Link from "next/link";
import { path } from "@/data/renewal/site";
import { DIRECTIONS, type DirectionSlug } from "./directions";
import s from "./review.module.css";

export function StudyHeader({ current }: { current?: DirectionSlug }) {
    return <header className={`${s.header} ${current === "space" ? s.darkHeader : ""}`}>
        <Link className={s.logo} href={path("/design-lab")} aria-label="세 시안 비교"><Image src="/brand/makethis1-white-v1.png" alt="MAKETHIS1" width={108} height={52} priority /></Link>
        <span className={s.headerLabel}>FIRST IMPRESSION / 03 DIRECTIONS</span>
        <Link className={s.currentHome} href={path("/")}>현재 홈페이지 <span aria-hidden>↗</span></Link>
    </header>;
}

export function StudyDock({ current }: { current: DirectionSlug }) {
    return <nav className={s.dock} aria-label="첫 화면 시안 비교">
        <Link href={path("/design-lab")} className={s.overview}>비교</Link>
        {DIRECTIONS.map(item => <Link key={item.slug} href={path(`/design-lab/${item.slug}`)} aria-current={current === item.slug ? "page" : undefined} aria-label={`${item.letter} ${item.ko}`}><b>{item.letter}</b><span>{item.name}</span></Link>)}
    </nav>;
}

export function DirectionNotes({ current }: { current: DirectionSlug }) {
    const direction = DIRECTIONS.find(item => item.slug === current)!;
    return <section className={s.notes} aria-labelledby="direction-title">
        <div className={s.noteEyebrow}>DESIGN DIRECTION {direction.letter} <span>검토용 설명</span></div>
        <div className={s.notesGrid}>
            <div><h2 id="direction-title">{direction.ko}</h2><p className={s.definition}>{direction.definition}</p><p>{direction.motion}</p></div>
            <ol>{direction.principles.map(principle => <li key={principle}>{principle}</li>)}</ol>
        </div>
        <p className={s.risk}>선택할 때 볼 점 <span>{direction.risk}</span></p>
        <Link href={path("/design-lab")}>세 가지 방향 비교하기 ↗</Link>
    </section>;
}
