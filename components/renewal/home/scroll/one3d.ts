/* eslint-disable @typescript-eslint/no-explicit-any */
// 스크롤 홈 — 3D '1'. 여섯 조각(기둥 넷 + 머리 + 깃)을 쌓아 만든 조형.
// 스크롤 엔진(engine.ts)이 프레임마다 목표 상태를 넘기면, 여기서 부드럽게 따라가며 그린다.
// three.js 는 묶음에 넣지 않고 public/vendor 의 정적 파일을 첫 화면이 뜬 뒤에 불러온다(다른 페이지에는 싣지 않는다).

export interface OneTarget { x: number; y: number; k: number; ry: number; rx: number; rz: number; ex: number; tone: number; op: number; pops: number[] }
export interface OneApi {
    /** t: 목표 상태. x·y 는 화면 중심 기준 -1~1, k 는 화면 높이 대비 키, ex 는 흩어짐, tone 은 0 파란 판 · 1 밝은 판 */
    frame(t: OneTarget, dt: number, time: number, rate?: number): void;
    proj: { x: number; y: number }[];
    cur: { x: number; y: number; k: number; ex: number };
    dispose(): void;
}

const THREE_URL = "/vendor/three-r170.module.min.js";
let threeLoad: Promise<any> | null = null;
function loadThree(): Promise<any> {
    if (threeLoad) return threeLoad;
    threeLoad = new Promise((resolve, reject) => {
        const w = window as any;
        if (w.__HS_THREE) { resolve(w.__HS_THREE); return; }
        window.addEventListener("hs-three", () => resolve(w.__HS_THREE), { once: true });
        const el = document.createElement("script");
        el.type = "module";
        el.textContent = `import * as T from "${THREE_URL}"; window.__HS_THREE = T; window.dispatchEvent(new Event("hs-three"));`;
        document.head.appendChild(el);
        setTimeout(() => { if (!w.__HS_THREE) reject(new Error("three.js 를 불러오지 못했습니다")); }, 20000);
    });
    return threeLoad;
}

/** alive: 라이브러리를 기다리는 사이 화면이 이미 치워졌으면(false) 아무것도 만들지 않는다 */
export async function createOne(cv: HTMLCanvasElement, alive: () => boolean = () => true): Promise<OneApi | null> {
    let THREE: any;
    try { THREE = await loadThree(); } catch { return null; }
    if (!alive()) return null;
    let renderer: any = null;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: "high-performance" }); } catch { return null; }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const ease = (t: number) => t * t * (3 - 2 * t);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    const FOV = 24, DIST = 14;
    const cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    cam.position.set(0, 0, DIST);

    // 촬영장 환경: 파란 둥근 벽 + 밝은 조명판 몇 장 → 금속 면에 파란 바탕과 흰 줄이 비친다
    const env = new THREE.Scene();
    const gc = document.createElement("canvas"); gc.width = 4; gc.height = 256;
    const g2 = gc.getContext("2d")!, gr = g2.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "#2f7fe8"); gr.addColorStop(0.45, "#0a52ba"); gr.addColorStop(1, "#012a6e");
    g2.fillStyle = gr; g2.fillRect(0, 0, 4, 256);
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ map: gt, side: THREE.BackSide })));
    const panel = (w: number, h: number, pos: number[], color: string, power: number) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
        m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(10, 10, [-11, 9, 9], "#ffffff", 4.5);    // 왼쪽 위 큰 조명
    panel(1.6, 18, [12, 1, -4], "#ffffff", 11);    // 오른쪽 뒤 세로 줄
    panel(1.3, 16, [-13, 0, -6], "#cfe4ff", 8);    // 왼쪽 뒤 세로 줄
    panel(14, 3.2, [0, 14, 2], "#ffffff", 3);      // 머리 위
    panel(18, 3, [0, -11, 9], "#6fb0ff", 2.2);     // 아래 채움
    panel(5, 5, [9, -3, 11], "#9cc8ff", 1.6);      // 오른쪽 앞 채움
    const pm = new THREE.PMREMGenerator(renderer);
    const envRT = pm.fromScene(env, 0.035);
    scene.environment = envRT.texture;

    const key = new THREE.DirectionalLight(0xffffff, 1); key.position.set(-5, 7, 9); scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd8ff, 0.6); rim.position.set(7, 2, -6); scene.add(rim);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xa6cdf8, 0.2); scene.add(hemi);

    // 조각 여섯: 기둥 넷(아래부터 0~3), 머리(4), 깃(5). 크기는 가로 1.6 × 세로 2.6 × 두께 0.72
    const GAP = 0.013, D = 0.72, BV = 0.036, SL = 0.475;
    const polys: number[][][] = [];
    for (let j = 0; j < 4; j++) polys.push([[0, j * SL + GAP], [0.8, j * SL + GAP], [0.8, (j + 1) * SL - GAP], [0, (j + 1) * SL - GAP]]);
    polys.push([[0, 1.9 + GAP], [0.8, 1.9 + GAP], [0.8, 2.6], [0, 2.6]]);
    polys.push([[-GAP * 2, 2.6], [-0.8, 2.0], [-0.8, 1.35], [-GAP * 2, 1.9]]);
    // 흩어졌을 때의 자리(화면 기준)·기울기
    const EX = [
        { p: [1.3, -1.2, 0.5], r: [0.5, 0.9, -0.45] }, { p: [-1.2, -0.95, -0.4], r: [-0.6, -0.5, 0.5] },
        { p: [1.65, -0.02, -0.3], r: [0.3, 1.2, 0.25] }, { p: [-1.5, 0.12, 0.6], r: [0.9, -0.7, -0.3] },
        { p: [1.2, 1.12, 0.3], r: [-0.4, 0.6, 0.6] }, { p: [-1.0, 1.25, -0.2], r: [0.5, -1.0, -0.6] },
    ];
    const group = new THREE.Group(); scene.add(group);
    const pieces = polys.map((pts) => {
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - cx, y - cy)));
        const depth = D - BV * 2;
        const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelOffset: -BV, bevelSegments: 5, steps: 1 });
        geo.translate(0, 0, -depth / 2);
        const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.2, clearcoat: 0, clearcoatRoughness: 0.14 });
        const mesh = new THREE.Mesh(geo, mat);
        const home = new THREE.Vector3(cx, cy - 1.3, 0);
        mesh.position.copy(home); group.add(mesh);
        return { mesh, mat, geo, home };
    });

    const cur: Record<string, number> = { x: 0, y: 0, k: 0.6, ry: 0, rx: 0, rz: 0, ex: 1, tone: 0, op: 1 };
    const KEYS = Object.keys(cur);
    const pops = [0, 0, 0, 0, 0, 0];
    let first = true, W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0, lastOp = -1, dead = false;
    const onMove = (e: PointerEvent) => { if (e.pointerType === "mouse") { tmx = (e.clientX / window.innerWidth) * 2 - 1; tmy = (e.clientY / window.innerHeight) * 2 - 1; } };
    window.addEventListener("pointermove", onMove, { passive: true });
    const cMetal = new THREE.Color("#d6e4ff"), cPearl = new THREE.Color("#f6f9ff"), cHi = new THREE.Color("#4f97f2"), tmp = new THREE.Color();
    const v3 = new THREE.Vector3(), qInv = new THREE.Quaternion();
    const proj: { x: number; y: number }[] = pieces.map(() => ({ x: 0, y: 0 }));

    function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        if ((w === W && h === H) || !w || !h) return;
        W = w; H = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }

    const api: OneApi = {
        proj,
        cur: cur as unknown as OneApi["cur"],
        frame(t, dt, time, rate = 6) {
            if (dead) return;
            resize(); if (!W) return;
            const src = t as unknown as Record<string, number>;
            const a = first ? 1 : 1 - Math.exp(-dt * rate);
            for (const k of KEYS) cur[k] += (src[k] - cur[k]) * a;
            const pa = first ? 1 : 1 - Math.exp(-dt * 7);
            for (let i = 0; i < 6; i++) pops[i] += ((t.pops[i] || 0) - pops[i]) * pa;
            const ma = 1 - Math.exp(-dt * 3); mx += (tmx - mx) * ma; my += (tmy - my) * ma;
            first = false;

            const hh = Math.tan((FOV * Math.PI) / 360) * DIST, hw = hh * cam.aspect;
            group.scale.setScalar((cur.k * 2 * hh) / 2.6);
            group.position.set(cur.x * hw, cur.y * hh + Math.sin(time * 0.8) * 0.035 * cur.k * hh, 0);
            group.rotation.set(cur.rx + my * 0.07, cur.ry + mx * 0.16 + Math.sin(time * 0.45) * 0.035, cur.rz, "ZXY");
            qInv.copy(group.quaternion).invert();

            const tone = clamp(cur.tone);
            pieces.forEach((p, i) => {
                const e = ease(clamp(cur.ex * 1.3 - i * 0.05)), x = EX[i], pop = pops[i];
                const bob = Math.sin(time * 0.9 + i * 1.7) * 0.07;
                // 흩어진 자리는 화면 기준(1 이 돌아도 조각끼리 겹치지 않게)
                v3.set(x.p[0], x.p[1] + bob, x.p[2]).applyQuaternion(qInv);
                p.mesh.position.set(lerp(p.home.x, v3.x, e) + pop * 0.2, lerp(p.home.y, v3.y, e), lerp(p.home.z, v3.z, e) + pop * 0.14);
                p.mesh.rotation.set(x.r[0] * e + Math.sin(time * 0.5 + i) * 0.18 * e, x.r[1] * e + Math.cos(time * 0.4 + i * 2) * 0.22 * e, x.r[2] * e);
                tmp.copy(cMetal).lerp(cPearl, tone).lerp(cHi, pop * tone);
                p.mat.color.copy(tmp);
                p.mat.metalness = 1 - tone;
                p.mat.roughness = lerp(0.17, 0.3, tone);
                p.mat.clearcoat = tone;
                p.mat.envMapIntensity = lerp(1.15, 0.3, tone);
            });
            key.intensity = lerp(0.5, 1.9, tone); rim.intensity = lerp(0.9, 0.25, tone); hemi.intensity = lerp(0.15, 1.5, tone);
            const op = Math.round(cur.op * 100) / 100;
            if (op !== lastOp) { cv.style.opacity = String(op); lastOp = op; }
            renderer.render(scene, cam);

            for (let i = 0; i < 6; i++) {
                pieces[i].mesh.getWorldPosition(v3).project(cam);
                proj[i].x = ((v3.x + 1) / 2) * W; proj[i].y = ((1 - v3.y) / 2) * H;
            }
        },
        dispose() {
            if (dead) return;
            dead = true;
            window.removeEventListener("pointermove", onMove);
            pieces.forEach((p) => { p.geo.dispose(); p.mat.dispose(); });
            envRT.dispose(); pm.dispose(); gt.dispose();
            renderer.dispose();
            // 캔버스가 화면에서 이미 빠졌을 때만 그래픽 자원을 바로 놓는다.
            // (개발 모드는 같은 캔버스에 엔진을 두 번 붙였다 떼므로, 붙어 있는 캔버스의 자원을 끊으면 다음 엔진이 못 그린다)
            if (!cv.isConnected) { try { renderer.forceContextLoss(); } catch { /* 이미 사라진 경우 */ } }
        },
    };
    return api;
}
