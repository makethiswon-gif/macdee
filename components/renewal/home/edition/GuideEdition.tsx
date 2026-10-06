import Link from "next/link";
import { path } from "@/data/renewal/site";
import { HOME_GUIDE_LINKS, HOME_KEYWORD_FAQ } from "@/data/renewal/guides";
import s from "./closing-spreads.module.css";

/** 검색으로 들어온 사람이 먼저 묻는 것 — 가이드 세 개와 짧은 답.
    움직이지 않는 정적 지면이다(data-edition-scene 없음). 답은 서버 HTML 에 그대로 있다. */
export function GuideEdition() {
    return (
        <section className={`${s.scene} ${s.guides}`} aria-labelledby="home-guide-heading">
            <div className={s.container}>
                <div className={s.guideHeading}>
                    <div>
                        <p className={s.eyebrow}>Guide &amp; FAQ</p>
                        <h2 id="home-guide-heading" className={s.heading}>
                            변호사 마케팅·변호사 광고,<br />먼저 알아둘 것.
                        </h2>
                    </div>
                    <p className={s.guideLead}>법무법인 마케팅을 맡기기 전에 많이 묻는 질문과, 규정·채널·비용을 정리한 가이드입니다.</p>
                </div>

                <ul className={s.guideCards}>
                    {HOME_GUIDE_LINKS.map((g) => (
                        <li key={g.href}>
                            <Link href={path(g.href)}>
                                <span>{g.en}</span>
                                <strong>{g.title}</strong>
                                <p>{g.desc}</p>
                                <b aria-hidden="true">↗</b>
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className={s.guideFaq}>
                    <p className={s.eyebrow}>FAQ</p>
                    <div>
                        {HOME_KEYWORD_FAQ.map((f) => (
                            <details key={f.q}>
                                <summary>{f.q}<span aria-hidden="true">+</span></summary>
                                <p>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
