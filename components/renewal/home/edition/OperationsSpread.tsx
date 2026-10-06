import type { CSSProperties } from "react";
import { BEFORE_AFTER } from "@/data/renewal/site";
import s from "./opening-spreads.module.css";

const PAPER_JOBS = [
    { label: "광고대행사", x: "-15vw", y: "-5vw", turn: "-13deg" },
    { label: "블로그 업체", x: "4vw", y: "-9vw", turn: "8deg" },
    { label: "홈페이지 제작사", x: "13vw", y: "-4vw", turn: "14deg" },
    { label: "SEO 업체", x: "-12vw", y: "7vw", turn: "7deg" },
    { label: "보고서 4건", x: "1vw", y: "9vw", turn: "-9deg" },
    { label: "연락 창구 5개", x: "14vw", y: "6vw", turn: "-12deg" },
];

/** Entry progress gathers loose jobs into one large blue operating spread. */
export default function OperationsSpread() {
    return (
        <section data-edition-section="operations" className={`${s.section} ${s.operations}`} aria-labelledby="edition-operations-title">
            <header className={s.sectionHeading}>
                <p className={s.eyebrow}>Before · After <span>ONE OPERATING EDITION</span></p>
                <h2 id="edition-operations-title">{BEFORE_AFTER.title.map(line => <span key={line}>{line}</span>)}</h2>
            </header>
            <div className={s.operationsScene} data-edition-scene="operations">
                <div className={s.operationsCanvas} aria-hidden="true">
                    <div className={s.operationsRunningHead}><span>BEFORE → AFTER</span><span>운영 구조 예시 · 읽기 전용</span></div>
                    <div className={s.blueSpread}>
                        <div className={s.blueMasthead}><span>MAKE<br />THIS1.</span><span>ONE TEAM<br />ONE PLAN</span></div>
                        <span className={s.bigOne}>1</span>
                        <div className={s.unifiedStatement}><span>광고 운영 · 블로그·콘텐츠 · 홈페이지</span><strong>한 팀이면<br />됩니다.</strong></div>
                        <div className={s.blueOutputs}>{BEFORE_AFTER.after.items.map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}</div>
                    </div>
                    <div className={s.jobPapers}>
                        {PAPER_JOBS.map((job, index) => <div className={s.jobPaper} key={job.label} style={{ "--job-x": job.x, "--job-y": job.y, "--job-turn": job.turn } as CSSProperties}>
                            <span>WORK ORDER / 0{index + 1}</span><strong>{job.label}</strong><div className={s.printLines}><i /><i /></div>
                        </div>)}
                    </div>
                    <div className={s.operationsCaption}><span>맡기기 전</span><span>메이크디스원과 함께 ↗</span></div>
                </div>
            </div>
            <div className={s.comparisonSpread}>
                <div className={s.comparisonBefore}>
                    <h3>{BEFORE_AFTER.before.label}</h3>
                    <ul>{BEFORE_AFTER.before.items.map(item => <li key={item}><span aria-hidden="true">×</span>{item}</li>)}</ul>
                </div>
                <div className={s.comparisonAfter}>
                    <h3>{BEFORE_AFTER.after.label}</h3>
                    <ul>{BEFORE_AFTER.after.items.map(item => <li key={item}><span aria-hidden="true">↗</span>{item}</li>)}</ul>
                </div>
            </div>
        </section>
    );
}
