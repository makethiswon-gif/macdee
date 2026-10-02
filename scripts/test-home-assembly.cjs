/* Synthetic controller tests: no browser, network, credentials or production writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const directory = path.resolve(__dirname, '../components/renewal/home');
const compile = filename => ts.transpileModule(fs.readFileSync(path.join(directory, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const math = { exports: {} };
vm.runInNewContext(compile('assembly-motion-state.ts'), { exports: math.exports });
const { clampUnit, assemblyEase, assemblyScrollProgress, ASSEMBLY_DURATION_MS } = math.exports;
assert.equal(ASSEMBLY_DURATION_MS, 2800);
for (const [value, expected] of [[-1, 0], [0, 0], [.5, .5], [2, 1], [NaN, 0], [Infinity, 0]]) assert.equal(clampUnit(value), expected);
assert.equal(assemblyEase(0), 0);
assert.equal(assemblyEase(1), 1);
assert.equal(assemblyScrollProgress(100, 500), 0);
assert.equal(assemblyScrollProgress(-275, 500), 1);
assert(Number.isFinite(assemblyScrollProgress(-10, 0)));
for (let i = 1; i <= 100; i++) assert(assemblyEase(i / 100) >= assemblyEase((i - 1) / 100));

function events(initial = {}) {
    const handlers = new Map();
    return Object.assign(initial, {
        handlers,
        addEventListener: (name, fn) => handlers.set(name, fn),
        removeEventListener: (name, fn) => { if (handlers.get(name) === fn) handlers.delete(name); },
        emit: (name, value) => handlers.get(name)?.(value),
    });
}
function mount(reducedAtStart = false) {
    const effects = [], refs = [], frames = new Map(), styles = new Map();
    let frameId = 0, observer;
    const reduced = events({ matches: reducedAtStart });
    const fine = events({ matches: true });
    const document = events({ hidden: false });
    const window = events({ matchMedia: query => query.includes('reduced') ? reduced : fine });
    const artwork = { getBoundingClientRect: () => ({ top: 120, height: 500 }) };
    const stage = events({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }) });
    const hero = {
        dataset: {},
        querySelector: selector => selector === '[data-assembly-stage]' ? stage : artwork,
        style: { setProperty: (key, value) => styles.set(key, value), removeProperty: key => styles.delete(key) },
    };
    const react = {
        useRef: value => { const ref = { current: value }; refs.push(ref); return ref; },
        useEffect: fn => effects.push(fn),
        useState: value => [value, () => {}],
    };
    const output = { exports: {} };
    vm.runInNewContext(compile('AssemblyMotion.tsx'), {
        exports: output.exports, window, document,
        requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
        cancelAnimationFrame: id => frames.delete(id),
        IntersectionObserver: class {
            constructor(callback) { observer = this; this.callback = callback; }
            observe(target) { this.target = target; }
            disconnect() { this.disconnected = true; }
        },
        require: name => {
            if (name === 'react') return react;
            if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
            if (name.endsWith('.css')) return { default: {} };
            if (name === './assembly-motion-state') return math.exports;
            throw new Error(`Unexpected import ${name}`);
        },
    });
    const tree = output.exports.default();
    refs[0].current = { closest: () => hero };
    const cleanup = effects[0]();
    const frame = time => {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach(fn => fn(time));
    };
    return {
        styles, hero, stage, artwork, frames, observer, reduced, fine, document, window, frame, cleanup,
        visible: value => observer.callback([{ isIntersecting: value, intersectionRatio: value ? .8 : 0 }]),
        pause: tree.props.children[0].props.onClick,
        replay: tree.props.children[1].props.onClick,
    };
}

const m = mount();
assert.equal(m.observer.target, m.artwork, 'Observe art, not above-the-fold mobile text');
assert.equal(m.frames.size, 0, 'No intro before art enters viewport');
m.visible(true); m.frame(0); m.frame(1400);
assert.equal(m.styles.get('--assembly'), '0.8750');
m.pause(); assert.equal(m.hero.dataset.motionState, 'paused');
assert.equal(m.frames.size, 0);
m.stage.emit('pointermove', { pointerType: 'mouse', clientX: 1000, clientY: 600 });
assert.equal(m.frames.size, 0, 'Pause also stops parallax');
m.pause(); m.frame(10000); m.frame(11400);
assert.equal(m.styles.get('--assembly'), '1.0000');
assert.equal(m.frames.size, 0, 'No endless RAF after assembly');
m.replay(); m.frame(12000); m.frame(14800);
assert.equal(m.styles.get('--assembly'), '1.0000', 'Long active frame still finishes in wall-clock time');
m.replay(); m.frame(15000); m.frame(15700);
m.document.hidden = true; m.document.emit('visibilitychange');
assert.equal(m.frames.size, 0);
m.document.hidden = false; m.document.emit('visibilitychange'); m.frame(30000);
assert.equal(m.styles.get('--assembly'), assemblyEase(.25).toFixed(4), 'Hidden time is excluded');
m.visible(false); assert.equal(m.frames.size, 0);
m.reduced.matches = true; m.reduced.emit('change');
assert.equal(m.styles.get('--assembly'), '1.0000');
assert.equal(m.styles.get('--pointer-x'), '0.000');
assert.equal(m.hero.dataset.motionState, 'reduced');
m.replay(); assert.equal(m.frames.size, 0, 'Reduced motion cannot replay');
m.cleanup();
assert.equal(m.frames.size, 0);
assert.equal(m.styles.size, 0);
assert.equal(m.observer.disconnected, true);
for (const obj of [m.window, m.document, m.reduced, m.fine, m.stage]) assert.equal(obj.handlers.size, 0);
const r = mount(true); r.visible(true); assert.equal(r.frames.size, 0); assert.equal(r.styles.get('--assembly'), '1.0000'); r.cleanup();

const heroSource = fs.readFileSync(path.join(directory, 'AssemblyHero.tsx'), 'utf8');
assert.equal((heroSource.match(/<h1\b/g) || []).length, 1);
assert(heroSource.includes('path(PRIMARY_CTA.href)'));
assert(heroSource.includes('path("/#plans")'));
assert(heroSource.includes('path(service.href)'));
const css = fs.readFileSync(path.join(directory, 'assembly-hero.module.css'), 'utf8');
assert(css.includes('--assembly: 1;'), 'SSR is a completed composition');
assert(css.includes('@media (prefers-reduced-motion: reduce)'));
assert(css.includes('overflow-x: clip'));
console.log('PASS: progress math, viewport start, pause/resume, finite timing, replay, hidden/offscreen suspension, reduced-motion, cleanup, SSR/link contracts');
