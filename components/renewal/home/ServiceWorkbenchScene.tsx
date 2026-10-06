"use client";

import { useId, useState } from "react";
import { SERVICES } from "@/data/renewal/site";
import s from "./service-journey-scenes.module.css";

function ServiceIcon({ kind }: { kind: number }) {
    const drawings = [
        <g key="ads"><path d="M8 21h10l21-10v30L18 31H8z" /><path d="m16 32 4 12h7l-4-10M43 17l5-3M44 26h6M43 35l5 3" /></g>,
        <g key="search"><circle cx="24" cy="24" r="15" /><path d="m35 35 13 13M17 23h14M17 29h9" /></g>,
        <g key="ai"><path d="m28 6 6 15 16 7-16 6-6 16-6-16-16-6 16-7z" /><path d="m45 7 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></g>,
        <g key="content"><path d="M11 8h27l9 9v31H11zM37 8v10h10M18 25h21M18 32h21M18 39h13" /></g>,
        <g key="site"><rect x="6" y="10" width="44" height="34" rx="3" /><path d="M6 20h44M12 15h1M18 15h1M24 15h1M14 27h13v10H14M33 28h10M33 35h10" /></g>,
        <g key="analysis"><path d="M9 10v37h40M17 36V26M28 36V19M39 36V12" /><path d="m16 18 11-8 12-4" /></g>,
    ];
    return <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">{drawings[kind]}</svg>;
}

function SearchResult({ ai = false }: { ai?: boolean }) {
    return (
        <div className={`${s.resultPaper} ${s.workbenchObject}`}>
            <div className={s.queryField}><span className={s.searchGlass} /><span>내 상황과 비슷한 법률 문제</span></div>
            <div className={s.resultMeta}>{ai ? "AI 검색" : "일반 검색"}<span>우리 로펌</span></div>
            <div className={s.resultLines}><i /><i /><i /></div>
            <div className={s.resultCard}><span>{ai ? "로펌·변호사 정보 연결" : "사건별 검색어·관련 글 구성"}</span><b>우리 로펌 <span>↗</span></b><i /><i /></div>
            <div className={s.sourceTiles}>
                {(ai ? ["로펌 정보", "전문 콘텐츠", "사건 경험"] : ["네이버", "구글", "지역 검색"]).map(label => <span key={label}>{label}</span>)}
            </div>
        </div>
    );
}

function AdsGraphic() {
    return (
        <div className={s.adsLayout}>
            <div className={`${s.platformStack} ${s.workbenchObject}`}>
                {["네이버 광고", "구글 광고", "유튜브 광고"].map((label, i) => <div key={label} style={{ ["--object" as string]: i }}><span className={s.platformMark}>{["N", "G", "▶"][i]}</span><b>{label}</b><span>↗</span></div>)}
            </div>
            <div className={`${s.budgetPaper} ${s.workbenchObject}`}>
                <span className={s.paperLabel}>PAID MEDIA</span><strong>광고 운영</strong>
                <div className={s.adPreview}><span>광고</span><b>우리 로펌</b><i /><i /></div>
                <div className={s.budgetControl}><span>예산 관리</span><div><i /></div></div>
                <div className={s.budgetControl}><span>유입 확인</span><div><i /></div></div>
            </div>
        </div>
    );
}

function ContentGraphic() {
    return (
        <div className={s.contentLayout}>
            <div className={`${s.articlePaper} ${s.workbenchObject}`}>
                <span className={s.paperLabel}>LEGAL CONTENT</span><strong>법률 콘텐츠</strong>
                <div className={s.articleHero}><span>실제 사건·사례</span><div className={s.articleGlyph}>§</div></div>
                <div className={s.articleColumns}><div><i /><i /><i /></div><div><i /><i /><i /></div></div>
                <span className={s.contentProof}>법률 표현 검수 <b>✓</b></span>
            </div>
            <div className={`${s.videoPaper} ${s.workbenchObject}`}><span>영상 기획·재가공</span><div className={s.videoPlay}>▶</div><div className={s.videoTimeline}><i /><i /><i /><i /></div></div>
        </div>
    );
}

function WebsiteGraphic() {
    return (
        <div className={s.websiteLayout}>
            <div className={`${s.websitePaper} ${s.workbenchObject}`}>
                <div className={s.miniChrome}><i /><i /><i /><span>우리 로펌</span></div>
                <div className={s.siteHero}><span>변호사 소개</span><strong>우리 로펌</strong><div className={s.siteColumns}><i /><i /><i /></div></div>
                <div className={s.siteTiles}><span>사건 경험</span><span>전문 콘텐츠</span><span>자주 묻는 질문</span></div>
                <div className={s.siteContact}>상담 안내 <b>↗</b></div>
            </div>
            <div className={`${s.mobilePaper} ${s.workbenchObject}`}><i /><span>우리 로펌</span><div /><div /><b>상담 안내 ↗</b></div>
        </div>
    );
}

function AnalysisGraphic() {
    return (
        <div className={s.analysisLayout}>
            <div className={`${s.routeStack} ${s.workbenchObject}`}>
                {["전화", "카카오톡", "상담폼"].map((label, i) => <div key={label}><span>{["↗", "···", "≡"][i]}</span><b>{label}</b><i /></div>)}
            </div>
            <div className={`${s.analysisPaper} ${s.workbenchObject}`}>
                <span className={s.paperLabel}>LEAD TO CASE</span><strong>상담·수임 분석</strong>
                <div className={s.analysisFlow}><span>유입 확인</span><b>↓</b><span>유효상담 분석</span><b>↓</b><span>다음 달 예산 조정</span></div>
                <div className={s.recordRow}><span>상담 기록</span><span>수임 기록</span></div>
            </div>
        </div>
    );
}

function SelectedGraphic({ selected }: { selected: number }) {
    if (selected === 0) return <AdsGraphic />;
    if (selected === 1) return <SearchResult />;
    if (selected === 2) return <SearchResult ai />;
    if (selected === 3) return <ContentGraphic />;
    if (selected === 4) return <WebsiteGraphic />;
    return <AnalysisGraphic />;
}

/** Service choice is deliberate; scrolling assembles only the selected work. */
export default function ServiceWorkbenchScene() {
    const [selected, setSelected] = useState(0);
    const sceneId = useId();
    const service = SERVICES[selected];

    return (
        <div className={`${s.storyTrack} ${s.serviceTrack}`} data-home-motion="service-story" data-motion-range="story">
            <div className={s.storyPin}>
                <div className={s.workbenchFrame}>
                    <div className={s.workbenchChrome}><span>MAKE THIS ONE</span><span>SERVICE SYSTEM <i /></span></div>
                    <div className={s.serviceSelector} role="group" aria-label="서비스 그래픽 선택">
                        {SERVICES.map((item, index) => <button type="button" key={item.no} aria-pressed={selected === index} aria-controls={sceneId} onClick={() => setSelected(index)}><span>{item.no}</span><span>{item.ko}</span><i aria-hidden="true">↗</i></button>)}
                    </div>
                    <div className={s.serviceLegend} aria-hidden="true">{SERVICES.map(item => <span key={item.no}><b>{item.no}</b>{item.ko}</span>)}</div>
                    <div id={sceneId} className={s.workbenchCanvas} aria-hidden="true" data-service={selected}>
                        <div className={s.workbenchGrid} />
                        <div className={s.serviceIdentity}><span>{service.no}</span><div><ServiceIcon kind={selected} /></div><b>{service.en}</b></div>
                        <svg className={s.workbenchRoutes} viewBox="0 0 900 460" preserveAspectRatio="none"><path d="M160 90H240Q280 90 280 130V180Q280 225 330 225H780M160 360H240Q280 360 280 320V270Q280 225 330 225" pathLength="1" /><circle cx="160" cy="90" r="9" /><circle cx="160" cy="360" r="9" /><circle cx="780" cy="225" r="9" /></svg>
                        <div key={selected} className={s.selectedGraphic}><SelectedGraphic selected={selected} /></div>
                        <div className={s.workbenchStamp}><span>ONE TEAM</span><b>↗</b></div>
                    </div>
                    <div className={s.workbenchCaption} aria-live="polite" aria-atomic="true"><span>{service.en}</span><p>{service.summary}</p></div>
                </div>
            </div>
        </div>
    );
}
