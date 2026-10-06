import type { CSSProperties } from "react";
import Link from "next/link";
import {
    HERO_OVERLINE, HERO_BODY, HERO_BEFORE, HERO_CARD_TITLE, HERO_CARD_FOOT,
    PRIMARY_CTA, PROOF_STATS, SERVICES, path,
} from "@/data/renewal/site";
import AssemblyMotion from "./AssemblyMotion";
import s from "./assembly-hero.module.css";

const planes = [
    { x: -34, y: -32, z: 100, turn: -13 },
    { x: 28, y: -17, z: 40, turn: 10 },
    { x: -36, y: -3, z: 80, turn: -8 },
    { x: 24, y: 13, z: 45, turn: 12 },
    { x: -22, y: 28, z: 60, turn: -8 },
    { x: 30, y: 42, z: 95, turn: 10 },
];

export default function AssemblyHero() {
    return (
        <section className={s.hero} data-assembly-hero data-motion-state="static" aria-labelledby="home-assembly-title">
            <AssemblyMotion />
            <div className={s.stage} data-assembly-stage>
                <div className={s.copy}>
                    <p className={s.overline}>{HERO_OVERLINE}</p>
                    <h1 id="home-assembly-title" className={s.title} data-locked-title>
                        <span className={s.lead}>로펌 마케팅에 필요한&nbsp;</span>
                        <strong>모든&nbsp;것.</strong>
                        <span className={s.brandLine}>메이크디스원 하나로</span>
                    </h1>
                    <p className={s.body} data-locked-body>{HERO_BODY}</p>
                    <div className={s.actions} data-locked-actions>
                        <Link href={path(PRIMARY_CTA.href)} className={s.primary}>{PRIMARY_CTA.label}<span aria-hidden>↗</span></Link>
                        <Link href={path("/#plans")} className={s.secondary}>서비스·비용 보기<span aria-hidden>→</span></Link>
                    </div>
                </div>

                {/* Decorative duplicates only. Real service links below never move. */}
                <div className={s.machine} id="home-assembly-art" data-assembly-viewport aria-hidden="true">
                    <span className={s.corner} />
                    <span className={s.axisX} />
                    <span className={s.axisY} />
                    <div className={s.perspective}>
                        <div className={s.planes} data-assembly-planes>
                            {SERVICES.map((service, i) => (
                                <div key={service.no} className={s.plane} style={{
                                    "--index": i, "--dx": planes[i].x, "--dy": planes[i].y,
                                    "--dz": planes[i].z, "--turn": planes[i].turn,
                                } as CSSProperties} data-assembly-plane>
                                    <span>{service.ko}</span><small>{service.no}</small>
                                </div>
                            ))}
                        </div>
                    </div>
                    <span className={s.artLabel}>SIX → ONE</span>
                    <span className={s.artWordmark}>MAKETHIS1</span>
                </div>
            </div>

            <div className={s.scope}>
                <div className={s.scopeHeading}><h2>{HERO_CARD_TITLE}</h2><p>{HERO_CARD_FOOT}</p></div>
                <ul className={s.services}>
                    {SERVICES.map(service => <li key={service.no} data-service={service.no}>
                        <Link href={path(service.href)}><small>{service.no}</small><span>{service.ko}</span><span aria-hidden>↗</span></Link>
                    </li>)}
                </ul>
            </div>

            <div className={s.bottom}>
                <p className={s.before}>{HERO_BEFORE.map((word, i) => <span key={word}>{i > 0 && <i aria-hidden> · </i>}<s>{word}</s></span>)}<b aria-hidden>→</b><strong>MAKETHIS1.</strong></p>
                <dl className={s.proof}>{PROOF_STATS.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}<span>{stat.suffix}</span></dd></div>)}</dl>
            </div>
        </section>
    );
}
