import Link from "next/link";
import { path } from "@/data/renewal/site";
import { CONCEPTS, type ConceptSlug } from "./concepts";
import s from "./concepts.module.css";

export function ConceptNavigation({ current }: { current?: ConceptSlug }) {
    return <nav className={s.reviewNav} aria-label="디자인 시안 비교">
        <Link href={path("/concepts")}>DESIGN STUDY <span>01—03</span></Link>
        <div>{CONCEPTS.map(concept => <Link key={concept.slug} href={path(`/concepts/${concept.slug}`)} aria-current={current === concept.slug ? "page" : undefined}>
            <b>{concept.letter}</b><span>{concept.ko}</span>
        </Link>)}<Link href={path("/")}>기존 홈 ↗</Link></div>
    </nav>;
}

export function ConceptReview({ concept }: { concept: typeof CONCEPTS[number] }) {
    return <section className={s.reviewNotes} aria-labelledby="review-title">
        <p className={s.reviewEyebrow}>검토용 메모 · 홈페이지 카피가 아닙니다</p>
        <div className={s.reviewGrid}><div><h2 id="review-title">{concept.letter}. {concept.name}</h2><p className={s.definition}>{concept.definition}</p><p className={s.signature}>{concept.signature}</p></div>
            <ol>{concept.principles.map(principle => <li key={principle}>{principle}</li>)}</ol></div>
        <p className={s.risk}><strong>선택 전 확인할 위험</strong>{concept.risk}</p>
        <p className={s.reviewScope}>이번 시안은 홈 히어로만 다룹니다. 기존 홈·서비스·가격·회사 소개는 변경하지 않았습니다. 한 방향을 선택한 뒤에만 나머지 페이지로 확장합니다.</p>
        <Link className={s.reviewBack} href={path("/concepts")}>세 콘셉트 비교로 돌아가기 →</Link>
    </section>;
}
