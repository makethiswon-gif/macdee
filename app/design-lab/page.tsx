import type { Metadata } from "next";
import Link from "next/link";
import { absUrl, path } from "@/data/renewal/site";
import { renewalRobots } from "@/app/renewal/flags";
import { DIRECTIONS } from "@/components/renewal/concepts/round-three/directions";
import { StudyHeader } from "@/components/renewal/concepts/round-three/ReviewChrome";
import s from "@/components/renewal/concepts/round-three/review.module.css";

export const metadata: Metadata = { title: "첫 화면 — 세 가지 디자인 방향", alternates: { canonical: absUrl("/design-lab") }, robots: renewalRobots() };

export default function DesignLabPage() {
    return <><StudyHeader /><main className={s.gallery}>
        <div className={s.galleryIntro}><div><p>MAKETHIS1 / DESIGN EXPLORATION 03</p><h1>첫 장면부터<br />다시.</h1></div><p>활자. 공간. 결과물.<br />브랜드를 기억하게 만드는 세 가지 시작.<br />각 시안을 열고 움직임까지 비교해 보세요.</p></div>
        <div className={s.cards}>{DIRECTIONS.map(item => <article className={s.card} key={item.slug}>
            <Link href={path(`/design-lab/${item.slug}`)} aria-label={`${item.letter} ${item.ko} 시안 열기`}>
                <div className={`${s.preview} ${s[`${item.slug}Preview`]}`} aria-hidden="true"><small>DIRECTION {item.letter}</small>
                    {item.slug === "type" && <strong>모든<i>것.</i></strong>}
                    {item.slug === "space" && <div>{[0,1,2,3].map(i => <i key={i} style={{["--i" as string]:i}} />)}<strong>1</strong></div>}
                    {item.slug === "edition" && <><strong>MAKE<br />THIS1.</strong><i>§</i><i>1</i></>}
                    <span>{item.name}<b>↗</b></span>
                </div>
                <h2>{item.letter}. {item.ko}</h2>
            </Link><p>{item.definition}</p><Link className={s.open} href={path(`/design-lab/${item.slug}`)}>움직이는 첫 화면 <span aria-hidden>↗</span></Link>
        </article>)}</div>
        <div className={s.galleryFoot}><p>세 안 모두 실제 코드로 만든 첫 화면입니다.<br />포인터를 움직이고 스크롤해 보세요. 아래 비교 메뉴로 바로 전환할 수 있습니다.</p><p>브랜드 블루 #004AAD · 기존 확정 카피 적용<br />로컬 디자인 검토용 · 실제 홈페이지 교체 전</p></div>
    </main></>;
}
