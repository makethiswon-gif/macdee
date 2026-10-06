import type { CSSProperties } from "react";
import { Container } from "../primitives";
import { PRIMARY_CTA, COMPANY, path } from "@/data/renewal/site";
import s from "./home-motion.module.css";

/** Bookend to SIX → ONE. Only the six decorative sheets assemble, not the CTA. */
export default function FinalCTA() {
    return <section data-clause="CONTACT" className={`mt-dark-glow ${s.final}`}>
        <div className="py-[88px] md:py-[140px]">
            <Container>
                <div className={s.finalGrid}>
                    <div className={s.finalCopy}>
                        <p className="mt-en mt-label" style={{color:"var(--mt-gray)"}}>Contact</p>
                        <h2 className="mt-serif mt-h1 mt-8" style={{color:"#fff"}}>
                            <span className="block">사건에 집중하세요.</span>
                            <span className="block">마케팅은 맡기세요.</span>
                        </h2>
                        <p className="mt-8 text-[15px] leading-[1.8] max-w-[560px]" style={{color:"var(--mt-gray)"}}>
                            예산과 목표에 맞는 운영안을 제안합니다.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row sm:items-center flex-wrap gap-4">
                            <a href={path(PRIMARY_CTA.href)} className="inline-flex items-center justify-center gap-2 min-h-[52px] px-7 text-[14px] font-medium" style={{background:"#fff",color:"#004aad"}}>
                                {PRIMARY_CTA.label} <span aria-hidden>→</span>
                            </a>
                            <a href={path("/contact")} className="inline-flex items-center justify-center gap-2 min-h-[52px] px-7 text-[14px] font-medium" style={{border:"1px solid #ffffff80",color:"#fff"}}>연락처 보기</a>
                            <a href={path("/#plans")} className="inline-block py-2.5 text-[13.5px] font-medium underline-offset-4 hover:underline" style={{color:"var(--mt-gray)"}}>비용 다시 보기</a>
                        </div>
                        <p className="mt-8 text-[13.5px]" style={{color:"var(--mt-gray)"}}>
                            전화 상담&nbsp;—{" "}<a href={`tel:${COMPANY.phone.replace(/-/g, "")}`} className="mt-num font-semibold underline-offset-4 hover:underline" style={{color:"#fff"}}>{COMPANY.phone}</a>
                        </p>
                    </div>
                    <div className={s.finalArt} data-home-motion="closing-assembly" aria-hidden="true">
                        <span className={s.finalFrame}/>
                        <div className={s.finalSheets}>
                            {Array.from({length:6},(_,i) => <span key={i} className={s.finalSheet} style={{"--i":i} as CSSProperties}/>)}
                            <span className={s.finalLogo}>1</span>
                        </div>
                        <div className={s.finalCaption}><span>SIX → ONE</span><span>MAKETHIS1</span></div>
                    </div>
                </div>
                <div className={s.finalRule} data-home-motion="closing-rule" aria-hidden="true"/>
            </Container>
        </div>
    </section>;
}
