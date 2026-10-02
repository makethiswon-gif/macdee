import Link from "next/link";
import { HERO_BODY, HERO_OVERLINE, PRIMARY_CTA, SERVICES, path } from "@/data/renewal/site";
import s from "./edition-hero.module.css";

function ContentPrint() {
    return <div className={`${s.sheetMount} ${s.contentMount}`}>
        <div className={`${s.sheetEntry} ${s.contentEntry}`}>
            <div className={`${s.sheet} ${s.contentPrint}`}>
                <div className={s.printTop}><span>MAKETHIS1</span><span>CONTENT STUDY / 01</span></div>
                <div className={s.newspaperName}>The One.</div>
                <div className={s.printRule}><span>WORDS. IDEAS. PERSPECTIVES.</span><span>01</span></div>
                <p className={s.newspaperTitle}>이야기를<br />발견하는 방식.</p>
                <div className={s.editorialColumns}>
                    <div className={s.columnOne}>
                        <svg className={s.columnMark} viewBox="0 0 180 226" fill="none">
                            <path d="M5 216V87C5 42 41 6 86 6C131 6 167 42 167 87V216" stroke="currentColor" strokeWidth="11" />
                            <path d="M28 216V91C28 58 54 32 86 32C118 32 144 58 144 91V216" stroke="currentColor" strokeWidth="9" />
                            <path d="M51 216V94C51 74 67 58 86 58C105 58 121 74 121 94V216" stroke="currentColor" strokeWidth="7" />
                            <path d="M75 216V95C75 88 80 83 86 83C92 83 97 88 97 95V216" stroke="currentColor" strokeWidth="5" />
                        </svg>
                        <span className={s.caption}>A NEW PERSPECTIVE</span>
                        <p>{SERVICES[3].summary}</p>
                    </div>
                    <div className={s.columnTwo}>
                        <span className={s.columnLabel}>{SERVICES[3].en}</span>
                        <p className={s.columnHeading}>읽히는 말,<br />하나의 인상.</p>
                        <p>{HERO_BODY}</p>
                        <div className={s.columnDivider} />
                        <span className={s.columnLabel}>{SERVICES[4].en}</span>
                        <p>{SERVICES[4].summary}</p>
                        <p>{SERVICES[1].summary}</p>
                    </div>
                </div>
                <div className={s.printBottom}><span>LAW FIRM MARKETING</span><span>CONCEPT PRINT</span></div>
            </div>
        </div>
    </div>;
}

function CampaignPrint() {
    return <div className={`${s.sheetMount} ${s.campaignMount}`}>
        <div className={`${s.sheetEntry} ${s.campaignEntry}`}>
            <div className={`${s.sheet} ${s.campaignPrint}`}>
                <div className={s.campaignTop}><span>MAKE<br />THIS1.</span><span>CAMPAIGN<br />STUDY — 02</span></div>
                <svg className={s.oneMark} viewBox="0 0 360 420" fill="none">
                    <path d="M23 153L143 53H190V112L23 252V153Z" fill="currentColor" opacity=".28" />
                    <path d="M62 145L182 45H229V104L62 244V145Z" fill="currentColor" opacity=".55" />
                    <path d="M103 137L223 37H303V391H203V179L103 262V137Z" fill="currentColor" />
                    <path d="M203 315H303M203 332H303M203 349H303M203 366H303" stroke="#004aad" strokeWidth="2" />
                    <path d="M23 292L165 173M23 314L165 195M23 336L165 217" stroke="currentColor" strokeWidth="2" />
                    <path d="M318 19H337M328 10V29M318 402H337M328 392V412" stroke="currentColor" strokeWidth="1" />
                </svg>
                <p className={s.campaignStatement}>ALL THE PARTS.<br /><span>ONE DIRECTION.</span></p>
                <div className={s.campaignBottom}><span>INTEGRATED BY MAKETHIS1</span><span>02</span></div>
            </div>
        </div>
    </div>;
}

function MotionPrint() {
    return <div className={`${s.sheetMount} ${s.motionMount}`}>
        <div className={`${s.sheetEntry} ${s.motionEntry}`}>
            <div className={`${s.sheet} ${s.motionPrint}`}>
                <div className={s.filmPerforations} />
                <div className={s.motionFrame}>
                    <svg viewBox="0 0 480 270" fill="none" className={s.motionStill}>
                        <defs>
                            <radialGradient id="edition-sphere" cx=".28" cy=".2" r=".84">
                                <stop stopColor="#a8c6ef" />
                                <stop offset=".39" stopColor="#1c6acb" />
                                <stop offset=".77" stopColor="#004aad" />
                                <stop offset="1" stopColor="#002e6f" />
                            </radialGradient>
                            <linearGradient id="edition-paper-fold" x1="300" y1="46" x2="449" y2="215" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#fff" />
                                <stop offset="1" stopColor="#c6c9c9" />
                            </linearGradient>
                        </defs>
                        <path d="M0 0H480V270H0Z" fill="#e8e9e3" />
                        <path d="M0 212L480 153V270H0Z" fill="#d9dcd8" />
                        <ellipse cx="261" cy="213" rx="130" ry="19" fill="#004aad" opacity=".11" />
                        <path d="M268 207L316 42L426 76L375 229L268 207Z" fill="url(#edition-paper-fold)" />
                        <path d="M316 42L333 205L375 229L426 76L316 42Z" fill="#fff" opacity=".65" />
                        <circle cx="214" cy="140" r="84" fill="url(#edition-sphere)" />
                        <path d="M150 194L160 196L302 119L292 117L150 194Z" fill="#fff" opacity=".95" />
                        <path d="M155 204L164 206L307 129L297 127L155 204Z" fill="#fff" opacity=".8" />
                        <path d="M160 214L170 216L312 139L302 137L160 214Z" fill="#fff" opacity=".6" />
                        <path d="M30 27H42M36 21V33M438 243H450M444 237V249" stroke="#004aad" />
                    </svg>
                    <div className={s.frameWord}>A NEW<br /><i>point of view.</i></div>
                </div>
                <div className={s.motionCaption}><span>MOTION STUDY</span><span>MAKETHIS1 — 03</span></div>
            </div>
        </div>
    </div>;
}

export default function EditionHero() {
    return <section className={s.hero} aria-labelledby="edition-hero-title" data-edition-hero>
        <div className={s.canvas}>
            <div className={s.masthead} aria-hidden="true"><span>MAKE</span><span>THIS1<span className={s.mastheadDot}>.</span></span></div>
            <div className={s.artwork} aria-hidden="true">
                <div className={s.pressLabel}><span>LIVE EDITION</span><span>IDEAS INTO FORM ↙</span></div>
                <div className={s.printStack}>
                    <ContentPrint />
                    <CampaignPrint />
                    <MotionPrint />
                </div>
                <span className={s.artNote}>MAKETHIS1 / CONCEPT PRINTS</span>
            </div>
            <div className={s.copy}>
                <p className={s.overline}>{HERO_OVERLINE}</p>
                <h1 className={s.title} id="edition-hero-title" data-locked-title>
                    <span>로펌 마케팅에 필요한 모든 것.</span>{" "}<strong>메이크디스원 하나로</strong>
                </h1>
                <p className={s.body} data-locked-body>{HERO_BODY}</p>
                <div className={s.actions} data-locked-actions>
                    <Link className={s.primary} href={path(PRIMARY_CTA.href)}>{PRIMARY_CTA.label}<span aria-hidden="true">↗</span></Link>
                    <Link className={s.secondary} href={path("/#plans")}>서비스·비용 보기<span aria-hidden="true">↗</span></Link>
                </div>
            </div>
        </div>
        <div className={s.colophon}>
            <p className={s.indexLabel}><span>THE FULL PICTURE</span><strong>하나의 팀, 연결되는 일.</strong></p>
            <nav className={s.serviceNav} aria-label="메이크디스원 서비스">
                {SERVICES.map(service => <Link href={path(service.href)} key={service.no}><sup>{service.no}</sup><span>{service.ko}</span></Link>)}
            </nav>
            <span className={s.scrollCue} aria-hidden="true">SCROLL<br /><span>↓</span></span>
        </div>
    </section>;
}
