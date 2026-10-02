import Link from "next/link";
import { Container } from "../primitives";
import { JOURNEY, path } from "@/data/renewal/site";
import JourneyBrowserScene from "./JourneyBrowserScene";
import s from "./service-journey-scenes.module.css";

/** The browser supplies the visual story; all service information remains static. */
export default function ClientJourney() {
    return (
        <section id="system" data-clause="JOURNEY" data-home-motion="journey" className={s.journey}>
            <Container>
                <div className="mt-section-heading max-w-[820px]">
                    <p className="mt-en mt-label mb-6" style={{ color: "var(--mt-gray)" }}>Client Journey</p>
                    <h2 className="mt-h2 mt-serif" style={{ color: "var(--mt-ink)" }}><span className="block">검색부터</span><span className="block">상담까지.</span></h2>
                </div>

                <JourneyBrowserScene />

                <ol className={s.journeySteps}>
                    {JOURNEY.map(step => (
                        <li key={step.no}>
                            <span className={s.journeyStepNumber}>{step.no}</span>
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                            <ul>{step.labels.map(label => <li key={label}>{label}</li>)}</ul>
                        </li>
                    ))}
                </ol>

                <div className={s.conversionPanel}>
                    <div>
                        <span className={s.conversionEyebrow}>성과 확인</span>
                        <div className={s.conversionChain}><span>전화 · 카카오 · 폼</span><b aria-hidden="true">→</b><span>상담</span><b aria-hidden="true">→</b><span>수임</span></div>
                        <p className={s.conversionNote}>수임 결과는 로펌이 제공한 범위에서 연결</p>
                        <p className={s.conversionBody}>상담이 들어온 경로와 비용을 비교해 다음 달 예산을 조정합니다.</p>
                        <div className={s.feedbackChain}>{["유입 확인", "유효상담 분석", "다음 달 예산 조정"].map((label, i) => <span key={label}>{i > 0 && <b aria-hidden="true">→</b>}<span>{label}</span></span>)}</div>
                        <Link href={path("/conversion")} className={s.conversionLink}>상담·수임 분석 보기 <span aria-hidden="true">↗</span></Link>
                    </div>
                    <div className={s.journeyExample}>
                        <p>상담 경로 예시</p>
                        <dl>{[["유입 채널", "검색광고"], ["사건 분야", "이혼"], ["문의 경로", "전화"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                    </div>
                </div>
            </Container>
        </section>
    );
}
