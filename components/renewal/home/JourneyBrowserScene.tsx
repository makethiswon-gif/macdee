import s from "./service-journey-scenes.module.css";

/** One result becomes the firm's page, then stays beside the consultation routes. */
export default function JourneyBrowserScene() {
    return (
        <div className={`${s.storyTrack} ${s.journeyTrack}`} data-home-motion="journey-story" data-motion-range="story">
            <div className={s.storyPin}>
                <div className={s.journeyFrame} aria-hidden="true">
                    <div className={s.journeyFrameTitle}><span>ONE CLIENT JOURNEY</span><span>SEARCH TO CONSULTATION <i /></span></div>
                    <div className={s.journeyStageLabels}>
                        <span className={s.searchStage}><b>01</b> 검색</span><i />
                        <span className={s.experienceStage}><b>02</b> 로펌 경험</span><i />
                        <span className={s.consultationStage}><b>03</b> 상담</span>
                    </div>
                    <div className={s.journeyBrowser}>
                        <div className={s.browserChrome}><div><i /><i /><i /></div><span><i />우리 로펌</span><b>↗</b></div>
                        <div className={s.journeyViewport}>
                            <div className={s.journeyQuery}><span>Search</span><div><i className={s.searchGlass} /><b>내 상황과 비슷한 법률 문제</b><span>↗</span></div><p>광고 <span>·</span> 일반 검색 <span>·</span> AI 검색</p></div>
                            <div className={s.firmNavigation}><strong>우리 로펌</strong><span>변호사 소개</span><span>사건 경험</span><span>상담 안내</span></div>
                            <div className={s.journeySharedFirm}>
                                <div className={s.firmResultLabel}><span>우리 로펌</span><b>↗</b></div>
                                <div className={s.firmHero}><span>변호사 소개</span><strong>우리 로펌</strong><p>사건 경험 · 전문 콘텐츠</p><div className={s.firmHeroMark}>§</div></div>
                                <div className={s.firmContentTiles}><div><span>사건 경험</span><i /><i /></div><div><span>전문 콘텐츠</span><i /><i /></div><div><span>자주 묻는 질문</span><i /><i /></div></div>
                                <div className={s.firmConsultation}><span>상담 안내</span><b>↗</b></div>
                            </div>
                            <div className={s.journeyOtherResults}><span /><span /><span /></div>
                            <div className={s.journeyConsultationForm}>
                                <span className={s.paperLabel}>CONSULTATION</span><strong>상담</strong>
                                <div className={s.consultationRoutes}><span><b>↗</b>전화</span><span><b>···</b>카카오</span><span><b>≡</b>상담폼</span></div>
                                <div className={s.consultationRecord}><span>유입 채널</span><b>검색광고</b></div>
                                <div className={s.consultationRecord}><span>사건 분야</span><b>이혼</b></div>
                                <div className={s.consultationRecord}><span>문의 경로</span><b>전화</b></div>
                                <div className={s.consultationComplete}><span>상담 경로 확인</span><b>✓</b></div>
                            </div>
                            <span className={s.clientCursor}><svg viewBox="0 0 24 29" fill="currentColor"><path d="M2 1v23l6-6 5 10 5-2-5-10h9z" /></svg><b>의뢰인</b></span>
                            <div className={s.journeyViewportGrid} />
                        </div>
                    </div>
                    <div className={s.journeyFrameFooter}><span>검색에서 만나고</span><b>→</b><span>경험을 확인하고</span><b>→</b><span>상담으로 이어지도록</span></div>
                </div>
            </div>
        </div>
    );
}
