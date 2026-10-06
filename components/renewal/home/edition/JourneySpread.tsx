import Link from "next/link";
import { JOURNEY, path } from "@/data/renewal/site";
import s from "./opening-spreads.module.css";

/** The paper journey is illustrative; complete journey copy stays in flow. */
export default function JourneySpread() {
    return (
        <section id="system" data-edition-section="journey" className={`${s.section} ${s.journey}`} aria-labelledby="edition-journey-title">
            <header className={`${s.sectionHeading} ${s.journeyHeading}`}>
                <p className={s.eyebrow}>Client Journey <span>SEARCH TO CONSULTATION</span></p>
                <h2 id="edition-journey-title"><span>검색부터</span><span>상담까지.</span></h2>
                <p className={s.demoLabel}>화면 구성 예시 · 읽기 전용</p>
            </header>
            <div className={`${s.storyTrack} ${s.journeyTrack}`} data-edition-scene="journey" data-edition-range="story">
                <div className={`${s.storyPin} ${s.journeyPin}`}>
                    <div className={s.journeyCanvas} aria-hidden="true">
                        <div className={s.journeyRule}><span>ONE CLIENT JOURNEY</span><span>01 → 02 → 03</span></div>
                        <div className={s.journeyPapers}>
                            <div className={`${s.journeyPaper} ${s.searchPaper}`}>
                                <div className={s.paperRunningHead}><span>01 / SEARCH</span><span>검색</span></div>
                                <p className={s.searchMasthead}>Search.</p>
                                <div className={s.printQuery}><span>내 상황과 비슷한<br />법률 문제</span><span>↗</span></div>
                                <p className={s.searchChannels}>광고 · 일반 검색 · AI 검색</p>
                                <div className={s.searchResult}><span>우리 로펌</span><strong>사건 경험 · 전문 콘텐츠</strong><div className={s.printLines}><i /><i /><i /></div></div>
                                <div className={s.paperFooter}><span>검색에서 만나고</span><b>→</b></div>
                            </div>
                            <div className={`${s.journeyPaper} ${s.experiencePaper}`}>
                                <div className={s.paperRunningHead}><span>02 / EXPERIENCE</span><span>로펌 경험</span></div>
                                <p className={s.firmMasthead}>우리 로펌</p>
                                <div className={s.firmNavigation}><span>변호사 소개</span><span>사건 경험</span><span>상담 안내</span></div>
                                <div className={s.firmCover}><span>사건 경험 · 전문 콘텐츠</span><b>§</b><span>변호사 소개</span></div>
                                <div className={s.firmContents}><span>사건 경험</span><span>전문 콘텐츠</span><span>자주 묻는 질문</span></div>
                                <div className={s.paperFooter}><span>경험을 확인하고</span><b>→</b></div>
                            </div>
                            <div className={`${s.journeyPaper} ${s.consultationPaper}`}>
                                <div className={s.paperRunningHead}><span>03 / CONSULTATION</span><span>상담</span></div>
                                <p className={s.consultationTitle}>상담<br />안내<span>↗</span></p>
                                <div className={s.consultationRoutes}><span>전화</span><span>카카오</span><span>상담폼</span></div>
                                <p className={s.routeCaption}>상담 경로 확인</p>
                                <div className={s.printLines}><i /><i /></div>
                                <div className={s.paperFooter}><span>상담으로 이어지도록</span><b>↗</b></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ol className={s.journeySteps}>
                {JOURNEY.map(step => (
                    <li key={step.no}>
                        <span className={s.stepNumber}>{step.no}</span>
                        <h3>{step.title}</h3>
                        <p>{step.desc}</p>
                        <ul>{step.labels.map(label => <li key={label}>{label}</li>)}</ul>
                    </li>
                ))}
            </ol>
            <div className={s.conversionSpread}>
                <div className={s.conversionMain}>
                    <p className={s.eyebrow}>성과 확인</p>
                    <div className={s.conversionChain}><span>전화 · 카카오 · 폼</span><b aria-hidden="true">→</b><span>상담</span><b aria-hidden="true">→</b><span>수임</span></div>
                    <p className={s.conversionNote}>수임 결과는 로펌이 제공한 범위에서 연결</p>
                    <p className={s.conversionBody}>상담이 들어온 경로와 비용을 비교해 다음 달 예산을 조정합니다.</p>
                    <div className={s.feedbackChain}>{["유입 확인", "유효상담 분석", "다음 달 예산 조정"].map((label, index) => <span key={label}>{index > 0 && <b aria-hidden="true">→</b>}<span>{label}</span></span>)}</div>
                    <Link className={s.textLink} href={path("/conversion")}>상담·수임 분석 보기 <span aria-hidden="true">↗</span></Link>
                </div>
                <div className={s.routeExample}>
                    <p>상담 경로 예시</p>
                    <dl>{[["유입 채널", "검색광고"], ["사건 분야", "이혼"], ["문의 경로", "전화"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                </div>
            </div>
        </section>
    );
}
