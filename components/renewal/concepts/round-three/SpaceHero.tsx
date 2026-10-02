import type { CSSProperties } from "react";
import Link from "next/link";
import {
    HERO_BODY,
    HERO_OVERLINE,
    PRIMARY_CTA,
    SERVICES,
    path,
} from "@/data/renewal/site";
import s from "./space-hero.module.css";

type Point = readonly [number, number, number];
type Outline = readonly (readonly [number, number])[];

const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Point, b: Point): Point => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
const normalize = (a: Point): Point => {
    const length = Math.hypot(...a);
    return [a[0] / length, a[1] / length, a[2] / length];
};

// A single camera projects every face, floor joint, and cast shadow.
// Keeping the geometry in world space gives the apertures real thickness.
const camera: Point = [13, 3, 22];
const forward = normalize(subtract([0, 1, -22], camera));
const right = normalize(cross(forward, [0, 1, 0]));
const up = cross(right, forward);

function project(point: Point): [number, number] {
    const relative = subtract(point, camera);
    const depth = dot(relative, forward);
    return [
        1040 + (1450 * dot(relative, right)) / depth,
        260 - (1450 * dot(relative, up)) / depth,
    ];
}

function polygon(points: readonly Point[]) {
    return points.map(point => project(point).map(value => value.toFixed(2)).join(",")).join(" ");
}

function rectangle(x0: number, x1: number, y0: number, y1: number, z: number) {
    return polygon([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]);
}

function Beam({ x0, x1, y0, y1, z }: {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    z: number;
}) {
    const back = z - 1.35;
    return <g>
        <polygon points={rectangle(x0, x1, y0, y1, back)} fill="#002358" />
        <polygon points={polygon([[x0, y0, z], [x0, y0, back], [x0, y1, back], [x0, y1, z]])} fill="url(#blue-room-edge-left)" />
        <polygon points={polygon([[x1, y0, z], [x1, y0, back], [x1, y1, back], [x1, y1, z]])} fill="url(#blue-room-edge-right)" />
        <polygon points={polygon([[x0, y1, z], [x1, y1, z], [x1, y1, back], [x0, y1, back]])} fill="#4c86d4" />
        <polygon points={polygon([[x0, y0, z], [x1, y0, z], [x1, y0, back], [x0, y0, back]])} fill="#001a43" />
        <polygon points={rectangle(x0, x1, y0, y1, z)} fill="url(#blue-room-face)" />
        <polyline points={polygon([[x0, y1, z], [x1, y1, z], [x1, y0, z]])} fill="none" stroke="#8ab8ee" strokeOpacity=".26" strokeWidth=".8" />
    </g>;
}

const slab: Outline = [
    [-2.8, 2.7], [-.2, 5.2], [2.2, 5.2], [2.2, -3.1],
    [3.1, -3.1], [3.1, -4.4], [-2.2, -4.4], [-2.2, -3.1],
    [-.9, -3.1], [-.9, 2.4], [-2.8, .6],
];
// Align the sculpture with the camera's clear sightline through all six frames.
// Its back-right edge stays inside the nearest pillar, including its thickness.
const slabOffsetX = -5;
const slabPoint = (x: number, y: number, z: number): Point => [x + slabOffsetX, y, z];

function OneSlab() {
    const z = -27;
    return <g className={s.slab}>
        {slab.map((point, index) => {
            const next = slab[(index + 1) % slab.length];
            return <polygon key={index} points={polygon([
                slabPoint(point[0], point[1], z), slabPoint(next[0], next[1], z),
                slabPoint(next[0], next[1], z - 1.8), slabPoint(point[0], point[1], z - 1.8),
            ])} fill={next[1] > point[1] ? "#91accc" : "#c3d3e6"} />;
        })}
        <polygon points={polygon(slab.map(([x, y]) => slabPoint(x, y, z)))} fill="url(#blue-room-white)" />
        <polyline points={polygon([slabPoint(-2.8, 2.7, z), slabPoint(-.2, 5.2, z), slabPoint(2.2, 5.2, z), slabPoint(2.2, -3.1, z)])} stroke="white" strokeWidth="1.1" fill="none" />
    </g>;
}

function BlueRoom() {
    return <div className={s.architecture} aria-hidden="true">
        <div className={s.camera}>
            <svg className={s.room} viewBox="0 0 1600 900" fill="none" preserveAspectRatio="xMidYMid slice" focusable="false">
                <defs>
                    <linearGradient id="blue-room-atmosphere" x1="160" y1="120" x2="1350" y2="880" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#00327d" /><stop offset=".57" stopColor="#004aad" /><stop offset="1" stopColor="#003b8b" />
                    </linearGradient>
                    <linearGradient id="blue-room-floor" x1="950" y1="340" x2="510" y2="890" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#266cc4" /><stop offset=".4" stopColor="#004aad" /><stop offset="1" stopColor="#003881" />
                    </linearGradient>
                    <linearGradient id="blue-room-face" x1="150" y1="10" x2="1270" y2="700" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#135ec2" /><stop offset=".45" stopColor="#004aad" /><stop offset="1" stopColor="#00337f" />
                    </linearGradient>
                    <linearGradient id="blue-room-edge-left" x1="0" y1="0" x2="1" y2=".35">
                        <stop stopColor="#001639" /><stop offset="1" stopColor="#003784" />
                    </linearGradient>
                    <linearGradient id="blue-room-edge-right" x1="0" y1="0" x2="1" y2="0">
                        <stop stopColor="#0d60cc" /><stop offset="1" stopColor="#3b7dd0" />
                    </linearGradient>
                    <linearGradient id="blue-room-white" x1="870" y1="150" x2="1050" y2="445" gradientUnits="userSpaceOnUse">
                        <stop stopColor="white" /><stop offset=".66" stopColor="#f2f6fc" /><stop offset="1" stopColor="#c3d5ea" />
                    </linearGradient>
                    <linearGradient id="blue-room-shadow" x1="1100" y1="400" x2="640" y2="920" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#00132f" stopOpacity=".9" /><stop offset="1" stopColor="#001c4b" stopOpacity="0" />
                    </linearGradient>
                </defs>

                <path fill="url(#blue-room-atmosphere)" d="M0 0h1600v900H0z" />
                <path d="M0 412 1100 320 1600 409V900H0Z" fill="url(#blue-room-floor)" />
                <g stroke="#b6d5fb" strokeOpacity=".11" strokeWidth=".8">
                    {[-22, -17, -12, -7, -2].map(z => <polyline key={z} points={polygon([[-32, -4.4, z], [32, -4.4, z]])} />)}
                    {[-16, -8, 0, 8, 16].map(x => <polyline key={x} points={polygon([[x, -4.4, -35], [x, -4.4, 10]])} />)}
                </g>

                <g className={s.shadows}>
                    {[2, -3, -8, -13, -18, -23].map(z => <g key={z}>
                        <polygon points={polygon([[-8.4, -4.4, z], [-7.45, -4.4, z], [-18.6, -4.4, z + 11], [-21, -4.4, z + 11]])} fill="#001d4b" opacity=".28" />
                        <polygon points={polygon([[7.45, -4.4, z], [8.4, -4.4, z], [-1, -4.4, z + 12], [-3.5, -4.4, z + 12]])} fill="#001d4b" opacity=".38" />
                    </g>)}
                    <polygon points={polygon([slabPoint(-2.2, -4.4, -27), slabPoint(3.1, -4.4, -27), slabPoint(-6, -4.4, 6), slabPoint(-12.4, -4.4, 6)])} fill="url(#blue-room-shadow)" />
                </g>

                <OneSlab />

                {[...SERVICES].reverse().map((service, reverseIndex) => {
                    const index = SERVICES.length - reverseIndex - 1;
                    const z = 2 - index * 5;
                    const label = project([-7.91, 2.3, z + .015]);
                    return <g key={service.no} className={s.aperture} style={{ "--frame": index } as CSSProperties}>
                        <Beam x0={-8.4} x1={-7.45} y0={-4.4} y1={7.4} z={z} />
                        <Beam x0={7.45} x1={8.4} y0={-4.4} y1={7.4} z={z} />
                        <Beam x0={-7.45} x1={7.45} y0={6.45} y1={7.4} z={z} />
                        <g transform={`translate(${label[0].toFixed(2)} ${label[1].toFixed(2)}) rotate(-90)`} fill="#d5e6fc" opacity={.62 - index * .055}>
                            <text fontSize={12 - index * .7} letterSpacing="2.8" fontFamily="Arial, sans-serif">{service.no} / {service.en}</text>
                        </g>
                    </g>;
                })}

                <path className={s.lightCut} d="m1267 0 51 0-131 439-8-2Z" fill="white" opacity=".09" />
            </svg>
        </div>
    </div>;
}

export default function SpaceHero() {
    return <section className={s.hero} aria-labelledby="blue-room-title" data-space-hero>
        <BlueRoom />
        <div className={s.topline}>
            <p className={s.overline}>{HERO_OVERLINE}</p>
            <p className={s.roomCaption}><span>BLUE ROOM</span><span>하나의 마케팅팀.</span></p>
        </div>

        <div className={s.foreground}>
            <div className={s.copy}>
                <h1 id="blue-room-title" className={s.title} data-locked-title>
                    <span className={s.promise}>로펌 마케팅에 필요한 모든 것.</span>{" "}
                    <span className={s.brand}>메이크디스원 하나로</span>
                </h1>
                <div className={s.bottomCopy}>
                    <p className={s.body} data-locked-body>{HERO_BODY}</p>
                    <div className={s.actions} data-locked-actions>
                        <Link className={s.primary} href={path(PRIMARY_CTA.href)}>{PRIMARY_CTA.label}<span aria-hidden="true">↗</span></Link>
                        <Link className={s.secondary} href={path("/#plans")}>서비스·비용 보기<span aria-hidden="true">→</span></Link>
                    </div>
                </div>
            </div>
            <nav className={s.disciplines} aria-label="메이크디스원이 맡는 일">
                {SERVICES.map(service => <Link key={service.no} href={path(service.href)}>
                    <span className={s.serviceNumber} aria-hidden="true">{service.no}</span>
                    <span>{service.ko}</span><span className={s.serviceArrow} aria-hidden="true">↗</span>
                </Link>)}
            </nav>
        </div>
    </section>;
}
