/* Execute the actual Edition controller and progress helpers in a synthetic DOM.
   No browser, network, server, build, or generated test artifacts are required.
   These checks cover scheduling/state, not browser layout or visual fidelity. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const directory = path.resolve(__dirname, '../components/renewal/home/edition');
const compile = filename => ts.transpileModule(fs.readFileSync(path.join(directory, filename), 'utf8'), {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
    },
}).outputText;
const stateModule = { exports: {} };
vm.runInNewContext(compile('edition-motion-state.ts'), { exports: stateModule.exports });
const { editionProgress, editionHeroProgress } = stateModule.exports;
const controllerSource = compile('EditionMotionController.tsx');
const results = [];

function test(name, run) {
    try {
        run();
        results.push({ name, passed: true });
        console.log(`PASS: ${name}`);
    } catch (error) {
        results.push({ name, passed: false });
        console.error(`FAIL: ${name}\n  ${error.message}`);
    }
}

function events(initial = {}) {
    const handlers = new Map();
    return Object.assign(initial, {
        handlers,
        addEventListener(name, callback, options) {
            const capture = options === true || Boolean(options && options.capture);
            const listeners = handlers.get(name) || [];
            listeners.push({ callback, capture });
            handlers.set(name, listeners);
        },
        removeEventListener(name, callback, options) {
            const capture = options === true || Boolean(options && options.capture);
            const remaining = (handlers.get(name) || []).filter(listener => listener.callback !== callback || listener.capture !== capture);
            if (remaining.length) handlers.set(name, remaining);
            else handlers.delete(name);
        },
        emit(name, event = {}) {
            for (const listener of [...(handlers.get(name) || [])]) listener.callback(event);
        },
    });
}

function mount({ reducedAtStart = false, shortAtStart = false, heroPresent = true, rootPresent = true } = {}) {
    const effects = [], refs = [], states = [], frames = new Map(), operations = [];
    let frameId = 0, observer;

    class MockNode {
        constructor() { this.parentNode = null; }
        contains(node) {
            for (let current = node; current; current = current.parentNode) if (current === this) return true;
            return false;
        }
    }

    class MockElement extends MockNode {
        constructor(id) {
            super();
            this.id = id;
            this.styles = new Map();
            this.dataset = new Proxy({}, {
                set: (object, key, value) => {
                    operations.push(`write:${id}:data-${String(key)}`);
                    object[key] = value;
                    return true;
                },
                deleteProperty: (object, key) => {
                    operations.push(`delete:${id}:data-${String(key)}`);
                    return Reflect.deleteProperty(object, key);
                },
            });
            this.style = {
                setProperty: (key, value) => {
                    operations.push(`write:${id}:${key}`);
                    this.styles.set(key, value);
                },
                removeProperty: key => {
                    operations.push(`delete:${id}:${key}`);
                    this.styles.delete(key);
                },
            };
            this.rect = { top: 1400, bottom: 2000, left: 0, width: 1200, height: 600 };
            this.openDetails = false;
            events(this);
        }
        getBoundingClientRect() {
            operations.push(`read:${this.id}`);
            return this.rect;
        }
        closest(selector) {
            assert(['[data-edition-root]', '[data-edition-scene]'].includes(selector), `Unexpected selector ${selector}`);
            const key = selector === '[data-edition-root]' ? 'editionRoot' : 'editionScene';
            for (let current = this; current; current = current.parentNode) {
                if (current.dataset && key in current.dataset) return current;
            }
            return null;
        }
        querySelector(selector) {
            assert.equal(selector, 'details[open]');
            return this.openDetails ? new MockElement(`${this.id}-details`) : null;
        }
    }

    const root = new MockElement('root');
    root.dataset.editionRoot = '';
    const elements = Array.from({ length: 4 }, (_, index) => {
        const element = new MockElement(`scene-${index}`);
        element.dataset.editionScene = `scene-${index}`;
        element.parentNode = root;
        element.rect.top += index * 500;
        element.rect.bottom += index * 500;
        return element;
    });
    const hero = new MockElement('hero');
    hero.parentNode = root;
    hero.rect = { top: 0, bottom: 850, left: 0, width: 1200, height: 850 };
    root.querySelectorAll = selector => {
        assert.equal(selector, '[data-edition-scene]');
        return elements;
    };
    root.querySelector = selector => {
        assert.equal(selector, '[data-home-edition-hero]');
        return heroPresent ? hero : null;
    };
    const control = new MockElement('control');
    control.parentNode = rootPresent ? root : null;
    const media = events({ matches: reducedAtStart });
    const short = events({ matches: shortAtStart });
    const document = events({ hidden: false });
    const matchMedia = query => {
        if (query === '(prefers-reduced-motion: reduce)') return media;
        assert.equal(query, '(max-height: 540px) and (min-width: 700px)');
        return short;
    };
    const window = events({ innerHeight: 1000, matchMedia });
    const react = {
        useRef: value => { const ref = { current: value }; refs.push(ref); return ref; },
        useEffect: callback => effects.push(callback),
        useState: value => {
            const index = states.push(value) - 1;
            return [value, next => { states[index] = next; }];
        },
    };
    const output = { exports: {} };
    vm.runInNewContext(controllerSource, {
        exports: output.exports,
        window, document, matchMedia,
        HTMLElement: MockElement,
        Node: MockNode,
        requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
        cancelAnimationFrame: id => frames.delete(id),
        IntersectionObserver: class {
            constructor(callback, options) {
                observer = this;
                this.callback = callback;
                this.options = options;
                this.targets = [];
            }
            observe(target) { this.targets.push(target); }
            disconnect() { this.disconnected = true; }
        },
        require: name => {
            if (name === 'react') return react;
            if (name === 'react/jsx-runtime') return {
                jsx: (type, props) => ({ type, props }),
                jsxs: (type, props) => ({ type, props }),
            };
            if (name.endsWith('.css')) return { default: {} };
            if (name === './edition-motion-state') return stateModule.exports;
            throw new Error(`Unexpected import ${name}`);
        },
    });
    const tree = output.exports.default();
    refs[0].current = control;
    operations.length = 0;
    const cleanup = effects[0]();
    return {
        elements, hero, root, control, media, short, document, window,
        frames, operations, states, observer, cleanup,
        frame() {
            const pending = [...frames.values()];
            frames.clear();
            pending.forEach(callback => callback(0));
        },
        intersect(...entries) {
            observer.callback(entries.map(([target, visible]) => {
                const element = target === 'hero' ? hero : elements[target];
                return { target: element, isIntersecting: visible, boundingClientRect: element.rect };
            }));
        },
        child(parent) {
            const element = new MockElement('child');
            element.parentNode = parent;
            return element;
        },
        toggle: tree.props.children.props.onClick,
    };
}

const complete = m => m.elements.every(element => element.styles.get('--ep') === '1' && element.dataset.editionStep === '2');

test('entry, story and hero progress use the expected landmarks and safe invalid-input defaults', () => {
    for (const [top, expected] of [[1200, 0], [960, 0], [685, .5], [410, 1], [-500, 1]]) {
        assert.equal(editionProgress(top, 800, 1000, false), expected);
    }
    for (const [top, expected] of [[160, 0], [-280, .5], [-720, 1]]) {
        assert.equal(editionProgress(top, 1700, 1000, true), expected);
    }
    for (const [top, expected] of [[84, 0], [-266, .5], [-616, 1]]) {
        assert.equal(editionHeroProgress(top, 1000), expected);
    }
    for (const invalid of [NaN, Infinity, -Infinity]) {
        assert.equal(editionProgress(invalid, 100, 1000, false), 1);
        assert.equal(editionProgress(100, invalid, 1000, true), 1);
        assert.equal(editionProgress(100, 100, invalid, true), 1);
        assert.equal(editionHeroProgress(invalid, 100), 0);
        assert.equal(editionHeroProgress(100, invalid), 0);
    }
    for (const invalid of [0, -1]) {
        assert.equal(editionProgress(100, invalid, 1000, true), 1);
        assert.equal(editionProgress(100, 100, invalid, false), 1);
        assert.equal(editionHeroProgress(100, invalid), 0);
    }
});

test('all progress remains finite, bounded and monotonic across mobile, landscape and desktop geometry', () => {
    for (const viewport of [320, 375, 390, 667, 844, 1000, 1800]) {
        for (const height of [100, viewport, viewport * 1.4, viewport * 3]) {
            for (const story of [false, true]) {
                let previous = 0;
                for (let position = 150; position >= -300; position--) {
                    const progress = editionProgress(viewport * position / 100, height, viewport, story);
                    assert(Number.isFinite(progress) && progress >= 0 && progress <= 1);
                    assert(progress >= previous, 'Upward scrolling must not reverse progress');
                    previous = progress;
                }
            }
            let previous = 0;
            for (let top = viewport; top >= -height; top -= 10) {
                const progress = editionHeroProgress(top, height);
                assert(Number.isFinite(progress) && progress >= previous && progress <= 1);
                previous = progress;
            }
        }
    }
});

test('initialization observes each scene and hero but does not read or write offscreen scenes', () => {
    const m = mount();
    assert.equal(m.observer.targets.length, 5);
    assert.equal(m.observer.options.rootMargin, '80px 0px');
    assert.equal(m.root.dataset.editionReady, 'true');
    assert.equal(m.control.dataset.ready, 'true');
    assert.equal(m.frames.size, 1);
    m.frame();
    assert(m.elements.every(element => element.styles.size === 0));
    assert(!m.operations.some(operation => operation.startsWith('read:scene-')));
    assert.equal(m.frames.size, 0, 'No perpetual animation loop');
    m.cleanup();
});

test('one frame batches all visible geometry before CSS and dataset writes', () => {
    const m = mount();
    m.elements[0].rect.top = 800;
    m.elements[1].rect.top = 685;
    m.intersect([0, true], [1, true]);
    m.operations.length = 0;
    m.frame();
    assert.deepEqual(m.operations.filter(operation => operation.startsWith('read:')), ['read:scene-0', 'read:scene-1', 'read:hero']);
    const lastRead = m.operations.reduce((last, operation, index) => operation.startsWith('read:') ? index : last, -1);
    const firstWrite = m.operations.findIndex(operation => operation.startsWith('write:'));
    assert(lastRead < firstWrite, m.operations.join(', '));
    assert.equal(m.elements[0].styles.get('--ep'), String(editionProgress(800, 600, 1000, false)));
    assert.equal(m.elements[1].styles.get('--ep'), '0.5');
    assert.equal(m.elements[1].dataset.editionStep, '1');
    assert.equal(m.elements[1].dataset.editionReady, 'true');
    assert.equal(m.elements[2].styles.size, 0);
    assert.equal(m.frames.size, 0);
    m.cleanup();
});

test('scroll and resize bursts coalesce into one finite animation frame', () => {
    const m = mount();
    m.frame();
    for (let event = 0; event < 100; event++) {
        m.window.emit('scroll');
        m.window.emit('resize');
    }
    assert.equal(m.frames.size, 1);
    m.frame();
    assert.equal(m.frames.size, 0);
    m.cleanup();
});

test('leaving the viewport removes scene and hero geometry work; skipped scenes above settle', () => {
    const m = mount();
    m.intersect([0, true], [1, true]);
    m.frame();
    m.elements[0].rect.top = -500;
    m.intersect([0, false], [2, false], ['hero', false]);
    assert.equal(m.elements[0].styles.get('--ep'), '1');
    assert.equal(m.elements[0].dataset.editionStep, '2');
    assert.equal(m.elements[2].styles.size, 0, 'A scene below the viewport should not be falsely completed');
    assert.equal(m.hero.dataset.playing, 'false');
    m.operations.length = 0;
    m.frame();
    assert.deepEqual(m.operations.filter(operation => operation.startsWith('read:')), ['read:scene-1']);
    m.cleanup();
});

test('hidden tabs cancel queued work and resume with exactly one current-state frame', () => {
    const m = mount();
    m.document.hidden = true;
    m.document.emit('visibilitychange');
    assert.equal(m.frames.size, 0);
    assert.equal(m.hero.dataset.playing, 'false');
    m.window.emit('scroll');
    m.window.emit('resize');
    m.intersect([0, true]);
    assert.equal(m.frames.size, 0);
    m.document.hidden = false;
    m.document.emit('visibilitychange');
    assert.equal(m.frames.size, 1);
    assert.equal(m.hero.dataset.playing, 'true');
    m.frame();
    assert.equal(m.frames.size, 0);
    m.cleanup();
});

test('pause settles every scene and resets hero motion; resume uses current geometry', () => {
    const m = mount();
    m.elements[0].rect.top = 685;
    m.intersect([0, true]);
    m.frame();
    m.toggle();
    assert.equal(m.root.dataset.motionPaused, 'true');
    assert.equal(m.states[0], true);
    assert(complete(m));
    assert.equal(m.hero.dataset.playing, 'false');
    for (const property of ['--scroll', '--mx', '--my']) assert.equal(m.hero.styles.get(property), '0');
    m.window.emit('scroll');
    m.frame();
    assert(complete(m));
    assert.equal(m.frames.size, 0);
    m.toggle();
    m.frame();
    assert.equal(m.root.dataset.motionPaused, 'false');
    assert.equal(m.states[0], false);
    assert.equal(m.elements[0].styles.get('--ep'), '0.5');
    m.cleanup();
});

test('initial and changing reduced-motion preferences immediately complete visible and offscreen scenes', () => {
    const m = mount({ reducedAtStart: true });
    assert.equal(m.root.dataset.reducedMotion, 'true');
    assert.equal(m.states[1], true);
    assert(complete(m));
    m.elements[0].rect.top = 685;
    m.intersect([0, true]);
    m.frame();
    assert(complete(m));
    m.media.matches = false;
    m.media.emit('change');
    m.frame();
    assert.equal(m.root.dataset.reducedMotion, 'false');
    assert.equal(m.states[1], false);
    assert.equal(m.elements[0].styles.get('--ep'), '0.5');
    m.media.matches = true;
    m.media.emit('change');
    assert(complete(m));
    m.frame();
    assert(complete(m));
    m.cleanup();
});

test('short landscape preference completes the page and can return to ordinary progress', () => {
    const m = mount({ shortAtStart: true });
    assert.equal(m.root.dataset.shortViewport, 'true');
    assert(complete(m));
    m.elements[0].rect.top = 685;
    m.intersect([0, true]);
    m.frame();
    assert(complete(m));
    m.short.matches = false;
    m.short.emit('change');
    m.frame();
    assert.equal(m.root.dataset.shortViewport, 'false');
    assert.equal(m.elements[0].styles.get('--ep'), '0.5');
    m.short.matches = true;
    m.short.emit('change');
    assert(complete(m));
    m.cleanup();
});

test('story scenes use their full track and step range without an autonomous frame loop', () => {
    const m = mount();
    m.elements[0].dataset.editionRange = 'story';
    m.elements[0].rect = { top: -280, height: 1700, bottom: 1420 };
    m.intersect([0, true]);
    m.frame();
    assert.equal(m.elements[0].styles.get('--ep'), '0.5');
    assert.equal(m.elements[0].dataset.editionStep, '1');
    m.elements[0].rect.top = -720;
    m.window.emit('scroll');
    m.frame();
    assert.equal(m.elements[0].styles.get('--ep'), '1');
    assert.equal(m.elements[0].dataset.editionStep, '2');
    assert.equal(m.frames.size, 0);
    m.cleanup();
});

test('keyboard focus completes a scene and remains readable while focus moves within it', () => {
    const m = mount();
    m.elements[0].rect.top = 900;
    const first = m.child(m.elements[0]);
    const second = m.child(m.elements[0]);
    m.intersect([0, true]);
    m.frame();
    m.root.emit('focusin', { target: first });
    assert.equal(m.elements[0].styles.get('--ep'), '1');
    m.window.emit('scroll');
    m.frame();
    assert.equal(m.elements[0].styles.get('--ep'), '1');
    m.root.emit('focusout', { target: first, relatedTarget: second });
    m.window.emit('scroll');
    m.frame();
    assert.equal(m.elements[0].styles.get('--ep'), '1');
    m.root.emit('focusout', { target: second, relatedTarget: m.control });
    m.frame();
    assert.equal(m.elements[0].styles.get('--ep'), String(editionProgress(900, 600, 1000, false)));
    m.root.emit('focusin', { target: {} });
    const outside = m.child(null);
    outside.dataset.editionScene = 'outside';
    m.root.emit('focusin', { target: outside });
    assert.equal(outside.styles.size, 0, 'Focus outside this root is ignored');
    m.cleanup();
});

test('focus arriving before intersection still makes the destination scene fully readable', () => {
    const m = mount();
    m.root.emit('focusin', { target: m.child(m.elements[3]) });
    assert.equal(m.elements[3].styles.get('--ep'), '1');
    assert.equal(m.elements[3].dataset.editionStep, '2');
    m.intersect([3, true]);
    m.frame();
    assert.equal(m.elements[3].styles.get('--ep'), '1');
    m.cleanup();
});

test('opening details completes its scene; captured toggle events schedule a current-state update', () => {
    const m = mount();
    m.elements[0].rect.top = 900;
    m.intersect([0, true]);
    m.frame();
    assert.equal(m.root.handlers.get('toggle')[0].capture, true);
    m.elements[0].openDetails = true;
    m.root.emit('toggle');
    assert.equal(m.frames.size, 1);
    m.frame();
    assert.equal(m.elements[0].styles.get('--ep'), '1');
    m.elements[0].openDetails = false;
    m.root.emit('toggle');
    m.frame();
    assert.equal(m.elements[0].styles.get('--ep'), String(editionProgress(900, 600, 1000, false)));
    m.cleanup();
});

test('mouse offsets are bounded, reset on exit, and ignore touch or paused pointer events', () => {
    const m = mount();
    m.frame();
    m.operations.length = 0;
    m.hero.emit('pointermove', { pointerType: 'touch', clientX: 300, clientY: 200 });
    assert.equal(m.frames.size, 0);
    assert.equal(m.operations.length, 0);
    m.hero.emit('pointermove', { pointerType: 'mouse', clientX: 2400, clientY: -1000 });
    m.frame();
    assert.equal(m.hero.styles.get('--mx'), '1');
    assert.equal(m.hero.styles.get('--my'), '-1');
    m.hero.emit('pointerleave');
    m.frame();
    assert.equal(m.hero.styles.get('--mx'), '0');
    assert.equal(m.hero.styles.get('--my'), '0');
    m.toggle();
    m.frame();
    m.operations.length = 0;
    m.hero.emit('pointermove', { pointerType: 'mouse', clientX: 300, clientY: 200 });
    assert.equal(m.frames.size, 0);
    assert.equal(m.operations.length, 0);
    m.cleanup();
});

test('cleanup cancels pending work, disconnects observers, and removes all event listeners', () => {
    const m = mount();
    assert.equal(m.frames.size, 1);
    m.cleanup();
    assert.equal(m.frames.size, 0);
    assert.equal(m.observer.disconnected, true);
    for (const target of [m.window, m.document, m.media, m.short, m.root, m.hero]) {
        assert.equal(target.handlers.size, 0, `${target.id || 'event source'} retained listeners`);
    }
    m.window.emit('scroll');
    m.window.emit('resize');
    m.document.emit('visibilitychange');
    m.media.emit('change');
    m.root.emit('toggle');
    m.hero.emit('pointerleave');
    assert.equal(m.frames.size, 0);
    m.toggle();
    assert.equal(m.frames.size, 0, 'A stale control callback cannot restart a disposed effect');
});

test('cleanup removes scene progress and controller-owned scene state', () => {
    const m = mount();
    m.intersect([0, true]);
    m.frame();
    m.toggle();
    m.cleanup();
    for (const element of m.elements) {
        assert.equal(element.styles.size, 0);
        assert.equal(element.dataset.editionReady, undefined);
        assert.equal(element.dataset.editionStep, undefined);
        assert.equal(element.dataset.editionScene, element.id, 'Author-provided metadata is preserved');
    }
});

test('cleanup removes root/control flags and hero offsets while leaving hero animation stopped', () => {
    const m = mount();
    m.frame();
    m.toggle();
    m.cleanup();
    for (const key of ['editionReady', 'motionPaused', 'reducedMotion', 'shortViewport']) {
        assert.equal(m.root.dataset[key], undefined, `Root retained ${key}`);
    }
    assert.equal(m.root.dataset.editionRoot, '', 'Author-provided root marker is preserved');
    assert.equal(m.control.dataset.ready, undefined);
    assert.equal(m.hero.dataset.ready, undefined);
    assert.equal(m.hero.dataset.playing, 'false');
    for (const property of ['--scroll', '--mx', '--my']) assert.equal(m.hero.styles.has(property), false);
});

test('the effect safely handles an absent root or hero', () => {
    const missingRoot = mount({ rootPresent: false });
    assert.equal(missingRoot.cleanup, undefined);
    assert.equal(missingRoot.observer, undefined);
    assert.equal(missingRoot.frames.size, 0);
    const missingHero = mount({ heroPresent: false });
    assert.equal(missingHero.observer.targets.length, 4);
    missingHero.intersect([0, true]);
    missingHero.frame();
    assert(!missingHero.operations.includes('read:hero'));
    missingHero.cleanup();
});

const failed = results.filter(result => !result.passed);
console.log(`\nEdition motion: ${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) process.exitCode = 1;
