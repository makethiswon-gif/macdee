import Link from "next/link";
import {
  HERO_BODY,
  HERO_OVERLINE,
  PRIMARY_CTA,
  SERVICES,
  path,
} from "@/data/renewal/site";
import styles from "./type-hero.module.css";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {diagonal ? (
        <path d="M7 25 25 7M7 7h18v18" />
      ) : (
        <path d="M4 16h23M17 6l10 10-10 10" />
      )}
    </svg>
  );
}

export default function TypeHero() {
  return (
    <section className={styles.poster} aria-labelledby="type-hero-title">
      <div className={styles.stencil} aria-hidden="true">
        <span>1</span>
      </div>
      <div className={styles.inkCut} aria-hidden="true" />

      <div className={styles.edition}>
        <p>{HERO_OVERLINE}</p>
        <span aria-hidden="true">ALL → ONE</span>
      </div>

      <div className={styles.composition}>
        <h1
          id="type-hero-title"
          className={styles.title}
          aria-label="로펌 마케팅에 필요한 모든 것. 메이크디스원 하나로"
        >
          <span className={styles.visibleTitle} aria-hidden="true">
            <span className={styles.prelude}>로펌 마케팅에 필요한</span>
            <span className={styles.displayLine}>
              <span className={styles.everything}>모든</span>
              <span className={styles.thing}>것<span className={styles.period}>.</span></span>
            </span>
            <span className={styles.resolution}>
              <span className={styles.brand}>메이크디스원</span>
              <span className={styles.one}>하나로</span>
            </span>
          </span>
        </h1>

        <div className={styles.brief}>
          <span className={styles.briefRule} aria-hidden="true" />
          <p>{HERO_BODY}</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={path(PRIMARY_CTA.href)}>
              <span>{PRIMARY_CTA.label}</span>
              <Arrow diagonal />
            </Link>
            <Link className={styles.secondary} href={path("/#plans")}>
              비용 보기 <Arrow />
            </Link>
          </div>
        </div>
      </div>

      <nav className={styles.services} aria-label="마케팅 서비스">
        {SERVICES.map((service) => (
          <Link key={service.no} href={path(service.href)}>
            <span className={styles.serviceNumber} aria-hidden="true">{service.no}</span>
            <span>{service.ko}</span>
            <span className={styles.serviceArrow} aria-hidden="true">↗</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
