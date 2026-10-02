/* Synthetic homepage-controller tests: no browser, network or production writes.
   Complements real viewport screenshots/SSR checks; it does not simulate layout. */
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
vm.runInNewContext(compile('home-motion-state.ts'), { exports: math.exports });
const { sectionProgress } = math.exports;

for (const [top, height, expected] of [
    [1000, 1000, 0], [940, 1000, 0], [630, 1000, .5], [320, 1000, 1], [-1000, 1000, 1],
    [NaN, 1000, 1], [Infinity, 1000, 1], [0, NaN, 1], [0, Infinity, 1], [0, 0, 1], [0, -1, 1],
]) assert.equal(sectionProgress(top, height), expected, `Progress at top=${top}, height=${height}`);
for (const height of [320, 667, 812, 1000, 2000]) {
    let previous = 0;
    for (let step = 120; step >= -20; step--) {
        const value = sectionProgress(height * step / 100, height);
        assert(Number.isFinite(value) && value >= 0 && value <= 1, 'Progress stays bounded');
        assert(value >= previous, 'Progress increases as the section travels upward');
        previous = value;
    }
}

function events(initial = {}) {
    const handlers = new Map();
    return Object.assign(initial, {
        handlers,
        addEventListener: (name, fn) => handlers.set(name, fn),
        removeEventListener: (name, fn) => { if (handlers.get(name) === fn) handlers.delete(name); },
        emit: (name, value) => handlers.get(name)?.(value),
    });
}

function mount({ reducedAtStart = false } = {}) {
    const effects = [], refs = [], states = [], frames = new Map(), operations = [];
    let frameId = 0, observer;
    const dataset = id => new Proxy({}, {
        set: (object, key, value) => { operations.push(`write:${id}:data-${String(key)}`); object[key] = value; return true; },
        deleteProperty: (object, key) => { operations.push(`delete:${id}:data-${String(key)}`); return Reflect.deleteProperty(object, key); },
    });
    const elements = Array.from({ length: 4 }, (_, index) => {
        const id = `section-${index}`, styles = new Map();
        return {
            id, styles, dataset: dataset(id), rect: { top: 1300 + index * 500, height: 600, bottom: 1900 + index * 500 },
            getBoundingClientRect() { operations.push(`read:${id}`); return this.rect; },
            style: {
                setProperty: (key, value) => { operations.push(`write:${id}:${key}`); styles.set(key, value); },
                removeProperty: key => { operations.push(`delete:${id}:${key}`); styles.delete(key); },
            },
        };
    });
    const media = events({ matches: reducedAtStart });
    const document = events({ hidden: false });
    const window = events({ innerHeight: 1000, matchMedia: query => {
        assert.equal(query, '(prefers-reduced-motion: reduce)');
        return media;
    } });
    const hero = {
        rect: { bottom: 800 },
        getBoundingClientRect() { operations.push('read:hero'); return this.rect; },
    };
    const root = {
        dataset: dataset('root'),
        querySelectorAll: selector => { assert.equal(selector, '[data-home-motion]'); return elements; },
        querySelector: selector => { assert.equal(selector, '[data-assembly-hero]'); return hero; },
    };
    const control = {
        dataset: dataset('control'),
        closest: selector => { assert.equal(selector, '[data-home-motion-root]'); return root; },
    };
    const react = {
        useRef: value => { const ref = { current: value }; refs.push(ref); return ref; },
        useEffect: callback => effects.push(callback),
        useState: value => { const index = states.push(value) - 1; return [value, next => { states[index] = next; }]; },
    };
    const output = { exports: {} };
    vm.runInNewContext(compile('HomeMotionController.tsx'), {
        exports: output.exports, window, document,
        requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
        cancelAnimationFrame: id => frames.delete(id),
        IntersectionObserver: class {
            constructor(callback, options) { observer = this; this.callback = callback; this.options = options; this.targets = []; }
            observe(target) { this.targets.push(target); }
            disconnect() { this.disconnected = true; }
        },
        require: name => {
            if (name === 'react') return react;
            if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
            if (name.endsWith('.css')) return { default: {} };
            if (name === './home-motion-state') return math.exports;
            throw new Error(`Unexpected import ${name}`);
        },
    });
    const tree = output.exports.default();
    refs[0].current = control;
    const cleanup = effects[0]();
    return {
        elements, operations, frames, states, observer, media, document, window, root, control, hero, cleanup,
        frame: () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); },
        intersect: (...entries) => observer.callback(entries.map(([index, visible]) => ({
            target: elements[index], isIntersecting: visible, boundingClientRect: elements[index].rect,
        }))),
        toggle: tree.props.children.props.onClick,
    };
}

const m = mount();
assert.equal(m.observer.targets.length, 4);
assert.equal(m.observer.options.rootMargin, '100px 0px');
assert.equal(m.control.dataset.ready, 'true', 'Control becomes available after initialization');
assert.equal(m.frames.size, 1, 'Initialization schedules one frame');
m.frame();
assert.equal(m.frames.size, 0, 'Initialization never creates a perpetual RAF');
assert(m.elements.every(element => element.styles.size === 0), 'No offscreen target geometry/styles are touched by initial paint');

m.elements[0].rect.top = 800;
m.elements[1].rect.top = 500;
m.intersect([0, true], [1, true]);
m.operations.length = 0;
m.frame();
const reads = m.operations.filter(operation => operation.startsWith('read:'));
assert.deepEqual(reads, ['read:section-0', 'read:section-1', 'read:hero'], 'Paint reads only observed-visible targets and control geometry');
const lastRead = m.operations.reduce((last, operation, index) => operation.startsWith('read:') ? index : last, -1);
const firstWrite = m.operations.findIndex(operation => operation.startsWith('write:'));
assert(lastRead < firstWrite, `All geometry must be read before any style/dataset writes: ${m.operations.join(', ')}`);
assert.equal(m.elements[0].styles.get('--section-progress'), String(sectionProgress(800, 1000)));
assert.equal(m.elements[1].styles.get('--section-progress'), String(sectionProgress(500, 1000)));
assert.equal(m.elements[0].dataset.motionReady, 'true');
assert.equal(m.elements[2].styles.size, 0, 'Unobserved/offscreen sections stay untouched');
assert.equal(m.frames.size, 0, 'Painting never self-schedules');

for (let event = 0; event < 50; event++) { m.window.emit('scroll'); m.window.emit('resize'); }
assert.equal(m.frames.size, 1, 'Scroll and resize events coalesce into one RAF');
m.hero.rect.bottom = 50;
m.frame();
assert.equal(m.control.dataset.away, 'true', 'Body motion control tracks leaving hero');
assert.equal(m.frames.size, 0);

m.elements[0].rect.top = -100;
m.intersect([0, false], [2, false]);
assert.equal(m.elements[0].styles.get('--section-progress'), '1', 'Fast jump past a section settles its artwork');
m.operations.length = 0;
m.frame();
assert(!m.operations.includes('read:section-0') && !m.operations.includes('read:section-2'), 'Leaving observation stops geometry reads');
assert.equal(m.elements[2].styles.size, 0, 'Offscreen below viewport is not falsely marked complete');

m.window.emit('scroll');
assert.equal(m.frames.size, 1);
m.document.hidden = true;
m.document.emit('visibilitychange');
assert.equal(m.frames.size, 0, 'Hiding the document cancels the pending frame');
m.window.emit('scroll'); m.window.emit('resize'); m.intersect([3, true]);
assert.equal(m.frames.size, 0, 'Hidden tab events do not queue RAF work');
m.document.hidden = false;
m.document.emit('visibilitychange');
assert.equal(m.frames.size, 1, 'Visibility resumes with a single current-state frame');
m.frame();
assert.equal(m.frames.size, 0);

m.media.matches = true;
m.media.emit('change');
assert.equal(m.root.dataset.reducedMotion, 'true');
assert.equal(m.states[1], true, 'Reduced-motion control state updates');
assert(m.elements.every(element => element.styles.get('--section-progress') === '1'), 'Reduced mode settles ALL targets, including offscreen');
m.frame();
assert(m.elements.every(element => element.styles.get('--section-progress') === '1'));
assert.equal(m.frames.size, 0);
m.media.matches = false;
m.media.emit('change');
m.frame();
assert.equal(m.root.dataset.reducedMotion, 'false');
assert.equal(m.elements[1].styles.get('--section-progress'), String(sectionProgress(500, 1000)), 'Dynamic reduced-mode exit returns to visible geometry');

m.toggle();
assert.equal(m.root.dataset.motionPaused, 'true');
assert.equal(m.states[0], true);
assert(m.elements.every(element => element.styles.get('--section-progress') === '1'), 'Global off settles all target art');
m.window.emit('scroll'); m.frame();
assert(m.elements.every(element => element.styles.get('--section-progress') === '1'), 'Scrolling cannot move disabled section art');
assert.equal(m.frames.size, 0);
m.toggle(); m.frame();
assert.equal(m.root.dataset.motionPaused, 'false');
assert.equal(m.elements[1].styles.get('--section-progress'), String(sectionProgress(500, 1000)));

m.window.emit('scroll');
m.cleanup();
assert.equal(m.frames.size, 0, 'Cleanup cancels a pending frame');
assert.equal(m.observer.disconnected, true);
assert.equal(m.root.dataset.motionPaused, undefined);
assert.equal(m.root.dataset.reducedMotion, undefined);
assert.equal(m.control.dataset.ready, undefined);
for (const element of m.elements) {
    assert.equal(element.styles.size, 0, 'Cleanup removes inline progress');
    assert.equal(element.dataset.motionReady, undefined);
}
for (const target of [m.window, m.document, m.media]) assert.equal(target.handlers.size, 0, 'Cleanup removes event subscriptions');
m.window.emit('scroll'); m.document.emit('visibilitychange'); m.media.emit('change');
assert.equal(m.frames.size, 0, 'Post-cleanup events cannot restart the controller');

const r = mount({ reducedAtStart: true });
assert.equal(r.root.dataset.reducedMotion, 'true');
assert(r.elements.every(element => element.styles.get('--section-progress') === '1'), 'Initial reduced motion is immediately complete without scrolling');
r.intersect([0, true], [1, true]); r.frame();
assert(r.elements.every(element => element.styles.get('--section-progress') === '1'));
assert.equal(r.frames.size, 0);
r.cleanup();

console.log('PASS: bounded progress, batched geometry, visible-only work, coalesced finite RAF, hidden resume, initial/dynamic reduced motion, global off/on, fast-scroll settling, cleanup');
