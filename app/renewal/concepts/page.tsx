import type { Metadata } from "next";
import Link from "next/link";
import { absUrl, path } from "@/data/renewal/site";
import { renewalRobots } from "../flags";
import { CONCEPTS } from "@/components/renewal/concepts/concepts";
import { ConceptNavigation } from "@/components/renewal/concepts/ConceptReview";
import s from "@/components/renewal/concepts/concepts.module.css";

export const metadata: Metadata = {
    title: "Renewal V2 — 디자인 콘셉트 비교",
    alternates: { canonical: absUrl("/concepts") },
    robots: renewalRobots(),
};

export default function ConceptsPage() {
    return <div className={s.reviewPage}><ConceptNavigation /><section className={s.gallery}>
        <p className={s.reviewEyebrow}>MAKETHIS1 / DESIGN EXPLORATION / STAGE 01</p>
        <h1>같은 선언.<br />전혀 다른 세 가지 문법.</h1>
        <p className={s.galleryLead}>확정된 카피와 여섯 업무는 그대로. 로펌의 마케팅 본부를 어떤 인상으로 보여줄지 비교하는 히어로 코드 프로토타입입니다.</p>
        <div className={s.galleryCards}>{CONCEPTS.map(concept => <article key={concept.slug}>
            <Link href={path(`/concepts/${concept.slug}`)} className={`${s.sample} ${s[`sample_${concept.slug}`]}`} aria-label={`${concept.letter}. ${concept.ko} 시안 열기`}>
                <span className={s.sampleName}>{concept.name}</span><strong aria-hidden>1</strong><span className={s.sampleNumber}>{concept.letter} <span aria-hidden>↗</span></span>
            </Link>
            <h2>{concept.letter}. {concept.ko}</h2><p>{concept.definition}</p><p className={s.galleryRisk}><b>위험</b> {concept.risk}</p>
            <Link className={s.reviewBack} href={path(`/concepts/${concept.slug}`)}>실제 코드 시안 보기 →</Link>
        </article>)}</div>
        <p className={s.galleryFoot}>비교 기준: 콘텐츠 대행 업체인가, 로펌의 마케팅 본부인가?<br />히어로 제목과 버튼은 애니메이션을 기다리지 않고 읽고 사용할 수 있습니다. 이 화면의 설명은 검토용이며, 홈페이지 카피 변경안이 아닙니다.</p>
    </section></div>;
}
