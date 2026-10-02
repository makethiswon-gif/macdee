import type { CSSProperties } from "react";
import { BEFORE_AFTER, NEW_CHANNEL_BODY } from "@/data/renewal/site";
import s from "./operations-scenes.module.css";

const VENDORS = ["광고대행사", "블로그 업체", "홈페이지 제작사", "SEO 업체", "보고서 4건", "연락 창구 5개"];
const PLACEMENTS = [
    { x: -140, y: -90, r: -12 }, { x: 15, y: -110, r: 7 }, { x: 150, y: -55, r: 13 },
    { x: -155, y: 65, r: 9 }, { x: -5, y: 95, r: -7 }, { x: 155, y: 85, r: -10 },
];

/** The moving objects are an explanation; the real comparison stays below. */
export function OperationsScene() {
    return <div className={s.track} data-home-motion="operations-story" data-motion-range="story">
        <div className={s.pin}>
            <div className={s.operations} aria-hidden="true">
                <div className={s.coordinate}><span>BEFORE → AFTER</span><span>MAKETHIS1</span></div>
                <svg className={s.wires} viewBox="0 0 1000 600" preserveAspectRatio="none" focusable="false">
                    {["M 140 120 L 800 440 L 220 410 L 820 160", "M 500 80 L 160 400 L 780 130 L 500 500", "M 820 400 L 220 140 L 500 500 L 160 400"].map(d =>
                        <path key={d} className={s.tangledWire} d={d} />)}
                    <path className={s.cleanWire} pathLength={1} d="M 140 490 H 860 M 320 420 V 490 M 500 420 V 490 M 680 420 V 490" />
                </svg>
                {VENDORS.map((label, i) => <div key={label} className={s.vendor} style={{
                    "--vx": `${PLACEMENTS[i].x}%`, "--vy": `${PLACEMENTS[i].y}%`, "--vr": `${PLACEMENTS[i].r}deg`,
                } as CSSProperties}>
                    <div className={s.vendorTop}><i /><i /><i /><span>0{i + 1}</span></div>
                    <strong>{label}</strong><div className={s.vendorLines}><i /><i /><i /></div>
                </div>)}
                <div className={s.unified}>
                    <div className={s.boardHeader}><span>MAKETHIS1</span><span>ONE TEAM</span></div>
                    <div className={s.boardBody}>
                        <div className={s.boardNav}><i /><i /><i /><i /></div>
                        <div className={s.boardContents}>
                            <div className={s.boardTitle}><strong>한 팀이면<br />됩니다.</strong><span>1</span></div>
                            <div className={s.boardJobs}>{["광고 운영", "블로그·콘텐츠", "홈페이지"].map(word => <div key={word}><i /><span>{word}</span></div>)}</div>
                            <div className={s.boardOutputs}>{BEFORE_AFTER.after.items.map((word, i) => <div key={word}><span>0{i + 1}</span><strong>{word}</strong><i /></div>)}</div>
                        </div>
                    </div>
                </div>
                <div className={s.operationSteps}><span>맡기기 전</span><span>메이크디스원과 함께</span></div>
                <div className={s.progress}><i /></div>
            </div>
        </div>
    </div>;
}

/** A generic reviewed module never claims a pending platform is operating. */
export function ChannelExpansionScene() {
    return <div className={`${s.track} ${s.channelTrack}`} data-home-motion="channels-story" data-motion-range="story">
        <div className={s.pin}>
            <div className={s.channels}>
                <div className={s.coordinate} aria-hidden="true"><span>NEW CHANNELS</span><span>ONE TEAM</span></div>
                <div className={s.channelCanvas} aria-hidden="true">
                    <div className={s.moduleRail}><i /><i /><i /><i /><i /></div>
                    <div className={s.hq}>
                        <span className={s.hqNumber}>1</span><strong>MAKETHIS1</strong>
                        <div className={s.hqSlots}>{["광고", "검색", "콘텐츠"].map(word => <span key={word}><i />{word}</span>)}</div>
                    </div>
                    <div className={s.reviewGate}><span>허용 여부</span><span>필요성 검토</span><i /></div>
                    <div className={s.newModule}>
                        <span>＋</span><strong>새 광고 채널</strong><small>검토 후 편입</small><i /><i />
                    </div>
                    <div className={s.connectedModule}><span>＋</span><strong>필요한 채널만</strong><small>같은 팀에서.</small></div>
                    <svg className={s.channelWire} viewBox="0 0 1000 520" preserveAspectRatio="none" focusable="false"><path pathLength={1} d="M 395 260 H 760" /></svg>
                </div>
                <p className={s.channelCondition}>{NEW_CHANNEL_BODY}</p>
                <div className={s.progress} aria-hidden="true"><i /></div>
            </div>
        </div>
    </div>;
}
