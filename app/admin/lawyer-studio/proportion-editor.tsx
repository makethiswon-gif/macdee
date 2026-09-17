"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ScanFace, PersonStanding, RotateCcw, Trash2, X, Loader2 } from "lucide-react";
import { MAX_PROPORTION_REGIONS, PROPORTION_LIMITS, type StudioProportion } from "@/lib/lawyer-studio/types";
import s from "./studio.module.css";

type Point = { x: number; y: number };
type Props = {
    src: string; alt: string; width: number; height: number;
    value: StudioProportion[]; onChange: (value: StudioProportion[]) => void;
    disabled: boolean; original: boolean; previewing: boolean;
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const kindLabel = (kind: StudioProportion["kind"]) => kind === "head" ? "머리" : "신체";
const regionStyle = (r: Pick<StudioProportion, "x" | "y" | "width" | "height">) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` });

export default function ProportionEditor({ src, alt, width, height, value, onChange, disabled, original, previewing }: Props) {
    const stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLDivElement>(null);
    const drag = useRef<{ start: Point; index?: number; initial?: StudioProportion; before: StudioProportion[] } | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [tool, setTool] = useState<StudioProportion["kind"] | null>(null), [selected, setSelected] = useState(0);
    const [draft, setDraft] = useState<Pick<StudioProportion, "x" | "y" | "width" | "height"> | null>(null);
    const active = value[selected], locked = disabled || original;
    useEffect(() => {
        const element = stage.current;
        if (!element) return;
        const observer = new ResizeObserver(() => {
            const ratio = width / height, w = Math.min(element.clientWidth, element.clientHeight * ratio);
            setSize({ width: w, height: w / ratio });
        });
        observer.observe(element); return () => observer.disconnect();
    }, [width, height]);

    const point = (event: PointerEvent): Point => {
        const rect = canvas.current!.getBoundingClientRect();
        return { x: clamp((event.clientX - rect.left) / rect.width, 0, 1), y: clamp((event.clientY - rect.top) / rect.height, 0, 1) };
    };
    const change = (patch: Partial<StudioProportion>) => onChange(value.map((r, i) => i === selected ? { ...r, ...patch } : r));
    const startDraw = (event: PointerEvent<HTMLDivElement>) => {
        if (locked || !tool || value.length >= MAX_PROPORTION_REGIONS || event.button !== 0) return;
        const start = point(event); drag.current = { start, before: value }; setDraft({ ...start, width: 0, height: 0 });
        event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
    };
    const move = (event: PointerEvent<HTMLDivElement>) => {
        const state = drag.current; if (!state || locked) return;
        const p = point(event);
        if (state.initial && state.index !== undefined) {
            const r = state.initial;
            onChange(value.map((region, i) => i === state.index ? { ...region, x: clamp(r.x + p.x - state.start.x, 0, 1 - r.width), y: clamp(r.y + p.y - state.start.y, 0, 1 - r.height) } : region));
        } else setDraft({ x: Math.min(state.start.x, p.x), y: Math.min(state.start.y, p.y), width: Math.abs(p.x - state.start.x), height: Math.abs(p.y - state.start.y) });
    };
    const finish = (event: PointerEvent<HTMLDivElement>) => {
        const state = drag.current;
        if (!state) return;
        if (tool && !state.initial && !locked && value.length < MAX_PROPORTION_REGIONS) {
            const p = point(event), w = Math.abs(p.x - state.start.x), h = Math.abs(p.y - state.start.y);
            const area = w >= 0.03 && h >= 0.03 ? { x: Math.min(p.x, state.start.x), y: Math.min(p.y, state.start.y), width: w, height: h }
                : { x: clamp(p.x - (tool === "head" ? 0.1 : 0.2), 0, tool === "head" ? 0.8 : 0.6), y: clamp(p.y - (tool === "head" ? 0.12 : 0.25), 0, tool === "head" ? 0.76 : 0.5), width: tool === "head" ? 0.2 : 0.4, height: tool === "head" ? 0.24 : 0.5 };
            onChange([...value, { kind: tool, ...area, scaleX: 100, scaleY: 100 }]); setSelected(value.length); setTool(null);
        }
        drag.current = null; setDraft(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };

    return <>
        <div className={s.photoStage} ref={stage}>
            <div className={s.proportionCanvas} ref={canvas} role="group" aria-label="비율 보정 사진" data-drawing={!!tool && !locked}
                style={size} onPointerDown={startDraw} onPointerMove={move} onPointerUp={finish}
                onPointerCancel={() => { if (drag.current?.initial) onChange(drag.current.before); drag.current = null; setDraft(null); }}>
                <img src={src} alt={alt} draggable={false} />
                {!original && value.map((r, i) => <button key={i} type="button" className={s.proportionRegion} style={regionStyle(r)}
                    aria-label={`${kindLabel(r.kind)} 영역 ${i + 1}`} aria-pressed={i === selected} disabled={disabled}
                    title={`${kindLabel(r.kind)} 보정 영역 이동`} onClick={() => { setSelected(i); }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") { setTool(null); return; }
                        const moves: Record<string, [number, number]> = { ArrowLeft: [-0.005, 0], ArrowRight: [0.005, 0], ArrowUp: [0, -0.005], ArrowDown: [0, 0.005] };
                        const delta = moves[event.key]; if (!delta) return; event.preventDefault();
                        onChange(value.map((region, index) => index === i ? { ...region, x: clamp(r.x + delta[0], 0, 1 - r.width), y: clamp(r.y + delta[1], 0, 1 - r.height) } : region));
                    }} onPointerDown={(event) => {
                        if (tool || locked || event.button !== 0) return;
                        event.stopPropagation(); event.preventDefault(); setSelected(i);
                        drag.current = { start: point(event), index: i, initial: r, before: value };
                        canvas.current!.setPointerCapture(event.pointerId);
                    }}><span>{kindLabel(r.kind)} {i + 1}</span></button>)}
                {!original && draft && <div className={s.proportionDraft} style={regionStyle(draft)} />}
            </div>
            {previewing && !original && <span className={s.previewBusy}><Loader2 className={s.spin} size={16} />보정 중</span>}
        </div>
        <section className={s.proportionControls} aria-label="얼굴·신체 비율">
            <h2>얼굴·신체 비율 <span>{value.length} / {MAX_PROPORTION_REGIONS}</span></h2>
            <div className={s.proportionToolbar}>
                <button type="button" aria-pressed={tool === "head"} disabled={locked || value.length >= MAX_PROPORTION_REGIONS} onClick={() => setTool(tool === "head" ? null : "head")} title="사진에서 머리 보정 영역 지정"><ScanFace size={16} />머리 영역</button>
                <button type="button" aria-pressed={tool === "body"} disabled={locked || value.length >= MAX_PROPORTION_REGIONS} onClick={() => setTool(tool === "body" ? null : "body")} title="사진에서 신체 보정 영역 지정"><PersonStanding size={16} />신체 영역</button>
                {tool && <button type="button" disabled={locked} title="영역 지정 취소" aria-label="영역 지정 취소" onClick={() => { setTool(null); setDraft(null); }}><X size={16} /></button>}
                <button type="button" title="모든 비율 보정 초기화" aria-label="모든 비율 보정 초기화" disabled={locked || !value.length} onClick={() => { onChange([]); setSelected(0); setTool(null); }}><RotateCcw size={16} /></button>
            </div>
            <p className={s.proportionStatus} role="status">{original ? "생성 원본 비교 중" : tool ? `${kindLabel(tool)} 영역 지정 중` : !value.length ? "보정 영역 미지정" : "선택 영역만 보정 · 추가 AI 과금 없음"}</p>
            {value.length > 0 && <div className={s.proportionToolbar} aria-label="보정 영역 선택">{value.map((r, i) => <button type="button" key={i} disabled={locked} aria-pressed={selected === i} onClick={() => { setSelected(i); setTool(null); }}>{kindLabel(r.kind)} {i + 1}</button>)}</div>}
            {active && <fieldset disabled={locked} className={s.proportionFields}>
                <div className={s.proportionToolbar}><strong>{kindLabel(active.kind)} {selected + 1}</strong>
                    <button type="button" title="선택 영역 비율 초기화" aria-label="선택 영역 비율 초기화" onClick={() => change({ scaleX: 100, scaleY: 100 })}><RotateCcw size={15} /></button>
                    <button type="button" title="선택 보정 영역 삭제" aria-label="선택 보정 영역 삭제" onClick={() => { onChange(value.filter((_, i) => i !== selected)); setSelected(Math.max(0, selected - 1)); }}><Trash2 size={15} /></button>
                </div>
                {active.kind === "head" ? <label className={s.slider}><span>머리 크기<output>{active.scaleX}%</output></span><input aria-label="머리 크기" type="range" min={PROPORTION_LIMITS.head[0]} max={PROPORTION_LIMITS.head[1]} step={1} value={active.scaleX} onChange={(e) => change({ scaleX: Number(e.target.value), scaleY: Number(e.target.value) })} /></label>
                    : <>{(["scaleX", "scaleY"] as const).map((key) => <label className={s.slider} key={key}><span>{key === "scaleX" ? "신체 폭" : "신체 길이"}<output>{active[key]}%</output></span><input aria-label={key === "scaleX" ? "신체 폭" : "신체 길이"} type="range" min={PROPORTION_LIMITS[key === "scaleX" ? "bodyWidth" : "bodyHeight"][0]} max={PROPORTION_LIMITS[key === "scaleX" ? "bodyWidth" : "bodyHeight"][1]} step={1} value={active[key]} onChange={(e) => change({ [key]: Number(e.target.value) })} /></label>)}</>}
                <div className={s.proportionBounds}>{(["x", "y", "width", "height"] as const).map((key) => {
                    const label = { x: "영역 가로 위치", y: "영역 세로 위치", width: "영역 너비", height: "영역 높이" }[key];
                    return <label key={key}>{label} (%)<input type="number" aria-label={label} min={key === "x" || key === "y" ? 0 : 3} max={100} step={1} value={Math.round(active[key] * 10000) / 100} onChange={(e) => {
                        if (e.target.value === "") return; const n = Number(e.target.value) / 100;
                        if (!Number.isFinite(n)) return;
                        if (key === "x") change({ x: clamp(n, 0, 1 - active.width) });
                        else if (key === "y") change({ y: clamp(n, 0, 1 - active.height) });
                        else if (key === "width") { const w = clamp(n, 0.03, 1); change({ width: w, x: Math.min(active.x, 1 - w) }); }
                        else { const h = clamp(n, 0.03, 1); change({ height: h, y: Math.min(active.y, 1 - h) }); }
                    }} /></label>;
                })}</div>
            </fieldset>}
        </section>
    </>;
}
