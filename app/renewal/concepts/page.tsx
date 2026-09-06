import type { Metadata } from "next";
import Link from "next/link";
import { absUrl, path } from "@/data/renewal/site";
import { renewalRobots } from "../flags";
import { CONCEPTS } from "@/components/renewal/concepts/concepts";
import { BOLD_CONCEPTS } from "@/components/renewal/concepts/bold-concepts";
import StudyFont from "@/components/renewal/concepts/StudyFont";
import b from "@/components/renewal/concepts/bold.module.css";

export const metadata: Metadata = {
    title: "Renewal V2 — 두 번째 디자인 실험",
    alternates: { canonical: absUrl("/concepts") },
    robots: renewalRobots(),
};

export default function ConceptsPage() {
    return <><StudyFont /><div className={b.boldGallery}>
        <header className={b.galleryIntro}>
            <p>MAKETHIS1 / DESIGN EXPLORATION / ROUND 02</p>
            <h1>판을 다시.<br />움직임까지 새롭게.</h1>
            <div className={b.galleryLead}><span>같은 카피. 다른 장면.</span><p>활자가 공간이 되고, 여섯 궤도가 함께 돌고, 거대한 빛의 틈이 열립니다. 색이 아니라 화면의 구조와 움직이는 방식을 다시 설계한 세 가지 코드 시안입니다.</p></div>
        </header>
        <div className={b.galleryCards}>{BOLD_CONCEPTS.map(concept => <article key={concept.slug}>
            <Link href={path(`/concepts/${concept.slug}`)} className={`${b.galleryVisual} ${b[`preview_${concept.slug}`]}`} aria-label={`${concept.letter}. ${concept.ko} 시안 열기`}>
                {concept.slug === "kinetic" && <strong aria-hidden>모든<br />것.</strong>}
                {concept.slug === "orbit" && <div className={b.previewOrbits} aria-hidden><i /><i /><i /></div>}
                <span className={b.visualTop}>{concept.letter} <span>↗</span></span><span className={b.visualName}>{concept.name}</span>
            </Link>
            <h2>{concept.letter}. {concept.ko}</h2><p>{concept.definition}</p>
            <Link className={b.galleryLink} href={path(`/concepts/${concept.slug}`)}>움직이는 시안 열기 <span aria-hidden>↗</span></Link>
        </article>)}</div>
        <p className={b.galleryNote}>각 시안에서 스크롤하고, 그래픽 위로 포인터를 움직여 보세요. 움직임은 ‘모션 멈추기’로 정지할 수 있습니다.<br />확정 카피와 실제 업무 데이터는 유지했습니다. 이 비교 화면의 설명은 홈페이지 카피 변경안이 아닙니다.</p>
        <section className={b.archive}><h2>첫 번째 시안과 비교</h2><div>{CONCEPTS.map(concept => <Link key={concept.slug} href={path(`/concepts/${concept.slug}`)}>{concept.letter}. {concept.ko} <span aria-hidden>↗</span></Link>)}</div></section>
    </div></>;
}
