import type { CSSProperties } from "react";
import type { CaseStudy } from "@/data/renewal/cases";
import s from "./case-growth.module.css";

/** A diagram of the published case, not a simulated dashboard or new evidence.
 * The full growth account and attribution remain ordinary text outside the art. */
export default function CaseGrowthScene({ caseStudy }: { caseStudy: CaseStudy }) {
    const stages = ["BUILD", "REACH", "EXPAND"].map(en => caseStudy.growth?.find(step => step.en === en));
    if (caseStudy.isSample || stages.some(stage => !stage)) return null;

    const build = stages[0]!;
    const reach = stages[1]!;
    const expand = stages[2]!;
    // Labels must already occur in this case's published account. This artwork
    // cannot introduce clients, outcomes or new practice areas as data changes.
    const contentLabels = ["법률칼럼", "뉴스 게시판"].filter(label => build.desc.includes(label));
    const channelLabels = ["네이버 블로그", "SEO"].filter(label => build.desc.includes(label));
    const reachLabels = ["언론 소개", "법률칼럼"].filter(label => reach.desc.includes(label));
    const practiceLabels = ["회생·파산", "상속", "선거법"].filter(label => expand.desc.includes(label));

    return (
        <div className={s.track} data-home-motion="case-growth-story" data-motion-range="story" aria-hidden="true">
            <div className={s.frame}>
                <div className={s.topline}><span>{caseStudy.label} · GROWTH PATH</span><span>{caseStudy.field}</span></div>
                <div className={s.stages}>
                    {stages.map((stage, i) => <div key={stage!.en} className={s.stage} style={{ "--stage": i } as CSSProperties}>
                        <span className={s.stageRule} />
                        <span className={s.stageName}>{stage!.en}</span>
                        <span className={s.stageTitle}>{stage!.title}</span>
                    </div>)}
                </div>

                <div className={s.diagram}>
                    <svg className={s.connections} viewBox="0 0 1200 550" preserveAspectRatio="none" focusable="false">
                        <path className={s.reachWire} d="M 540 158 H 910" pathLength="1" />
                        <path className={s.expandWire} d="M 930 208 V 345 H 600 M 345 290 V 345 H 600 M 215 448 V 345 H 985 V 448 M 600 345 V 448" pathLength="1" />
                        <circle className={s.junction} cx="600" cy="345" r="11" />
                    </svg>

                    <div className={s.website}>
                        <div className={s.browserBar}><span /><span /><span /><b>홈페이지</b></div>
                        <div className={s.websiteBody}>
                            <div className={s.siteMasthead}><i /><span /><span /></div>
                            <div className={s.postGrid}>
                                {contentLabels.map((label, i) => <div key={label} className={s.post} style={{ "--post": i } as CSSProperties}>
                                    <div className={s.postArtwork}><span /><span /><span /></div>
                                    <strong>{label}</strong><i /><i />
                                </div>)}
                            </div>
                            <div className={s.channelStrip}>{channelLabels.map(label => <span key={label}>{label}</span>)}</div>
                        </div>
                    </div>

                    <div className={s.search}>
                        <div className={s.searchField}><span>검색</span><i /></div>
                        <div className={s.searchResults}>{reachLabels.map((label, i) => <div key={label} className={s.searchResult} style={{ "--result": i } as CSSProperties}>
                            <span className={s.resultMark} /><div><strong>{label}</strong><i /><i /></div>
                        </div>)}</div>
                    </div>

                    <div className={s.practicePages}>
                        {practiceLabels.map((label, i) => <div key={label} className={s.practice} style={{ "--practice": i } as CSSProperties}>
                            <div className={s.practiceTab}><span /><span /></div>
                            <strong>{label}</strong>
                            <div className={s.practiceContent}><i /><i /><i /></div>
                            <span className={s.practiceFooter}>콘텐츠 · 광고 · 검색</span>
                        </div>)}
                    </div>
                </div>

                <div className={s.caption}><span>BUILD → REACH → EXPAND</span><span>{expand.title}</span></div>
            </div>
        </div>
    );
}
