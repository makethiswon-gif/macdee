import Link from "next/link";
import { SERVICES, path } from "@/data/renewal/site";
import s from "./opening-spreads.module.css";

/** A single six-fold brochure holds the real service content and links. */
export default function ServiceSpread() {
    return (
        <section id="scope" data-edition-section="services" className={`${s.section} ${s.services}`} aria-labelledby="edition-services-title">
            <header className={s.sectionHeading}>
                <p className={s.eyebrow}>Services <span>01—06 / THE FULL EDITION</span></p>
                <h2 id="edition-services-title">우리가 맡는 일.</h2>
            </header>
            <div className={`${s.storyTrack} ${s.serviceTrack}`} data-edition-scene="services" data-edition-range="story">
                <div className={`${s.storyPin} ${s.servicePin}`}>
                    <div className={s.brochure}>
                        {SERVICES.map(service => (
                            <article className={s.serviceLeaf} key={service.no}>
                                <div className={s.leafTop}><span>{service.en}</span><span>MAKETHIS1</span></div>
                                <div className={s.serviceIdentity}>
                                    <span className={s.serviceNumber} aria-hidden="true">{service.no}</span>
                                    <h3><Link href={path(service.href)}><span>{service.ko}</span><span aria-hidden="true">↗</span></Link></h3>
                                </div>
                                <p className={s.serviceSummary}>{service.summary}</p>
                                <details className={s.serviceDetails}>
                                    <summary>세부 업무 보기 <span aria-hidden="true">+</span></summary>
                                    <ul>
                                        {service.items.map(item => (
                                            <li key={item.label}>
                                                <span>{item.label}</span>
                                                {item.badge && <span className={s.condition}>{item.badge}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            </article>
                        ))}
                    </div>
                    <div className={s.brochureFoot} aria-hidden="true"><span>SIX DISCIPLINES. ONE TEAM.</span><span>MAKE THIS ONE ↗</span></div>
                </div>
            </div>
            <div className={s.serviceNotes}>
                <div>
                    <p>운영 범위는 상품에 따라 다릅니다. 조건부 항목은 확정 서비스가 아니며, 필요성·광고 허용 여부에 따라 검토합니다.</p>
                    <p>변호사법·대한변협 광고 규정을 준수하며, 법률 표현은 법학 전공자가 검수합니다.</p>
                </div>
                <Link className={s.textLink} href={path("/lawfirm-marketing")}>전체 업무 보기 <span aria-hidden="true">↗</span></Link>
            </div>
        </section>
    );
}
