// Pointer QA changes only local browser state; no requests are submitted.
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const origin = process.argv[2] || 'http://localhost:3101';
const out = process.argv[3] || 'C:/클로드/renewal-pointer-qa';
fs.mkdirSync(out, { recursive: true });
const hero = '[data-bold-hero="kinetic"]';
const art = '[data-motion-part="kinetic-perspective"]';
let browser;
(async () => {
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await c.newPage();
    await p.goto(origin + '/renewal', { waitUntil: 'networkidle' });
    await p.waitForFunction(() => document.querySelector('[data-bold-hero]').dataset.motionState === 'running');
    const title = await p.locator('h1').boundingBox();
    const read = () => p.locator(art).evaluate(e => {
        const h = e.closest('[data-bold-hero]'); const m = new DOMMatrix(getComputedStyle(e).transform);
        return { x: m.m41, y: m.m42, mx: +h.style.getPropertyValue('--mx'), my: +h.style.getPropertyValue('--my'), transform: getComputedStyle(e).transform };
    });
    await p.mouse.move(110, 320); await p.waitForTimeout(120); const left = await read();
    await p.screenshot({ path: path.join(out, 'desktop-left.png') });
    await p.mouse.move(1330, 710); await p.waitForTimeout(120); const right = await read();
    await p.screenshot({ path: path.join(out, 'desktop-right.png') });
    for (const state of [left, right]) {
        assert.ok(Math.abs(state.x - state.mx * 64) < .02, '64px horizontal range');
        assert.ok(Math.abs(state.y - state.my * 34) < .02, '34px vertical range');
    }
    assert.ok(right.x - left.x > 100, 'Pointer sweep visibly moves the ribbons');
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Large pointer displacement stays clipped');
    assert.deepEqual(await p.locator('h1').boundingBox(), title, 'Title stays static');
    await p.getByRole('button', { name: '모션 멈추기', exact: true }).click();
    await p.waitForTimeout(120); const paused = await read();
    await p.mouse.move(150, 480); await p.waitForTimeout(120);
    assert.equal((await read()).transform, paused.transform, 'Manual pause freezes pointer response');
    await p.getByRole('button', { name: '모션 재생', exact: true }).click();
    await p.mouse.move(720, 420); await p.waitForTimeout(120);
    await p.locator(hero).dispatchEvent('pointerleave', { pointerType: 'mouse' });
    await p.waitForTimeout(120); const reset = await read();
    assert.equal(reset.mx, 0); assert.equal(reset.my, 0);
    await p.emulateMedia({ reducedMotion: 'reduce' }); await p.waitForTimeout(120);
    assert.equal(await p.locator(art).evaluate(e => getComputedStyle(e).transform), 'none');
    assert.equal(await p.locator(hero).evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length), 0);
    await c.close();
    const m = await browser.newContext({ viewport: { width: 375, height: 900 }, isMobile: true, hasTouch: true });
    const mp = await m.newPage(); await mp.goto(origin + '/renewal', { waitUntil: 'networkidle' });
    const mobileBefore = await mp.locator(art).evaluate(e => getComputedStyle(e).transform);
    await mp.locator(hero).dispatchEvent('pointermove', { pointerType: 'touch', clientX: 320, clientY: 420 }); await mp.waitForTimeout(120);
    assert.equal(await mp.locator(art).evaluate(e => getComputedStyle(e).transform), mobileBefore, 'Touch unchanged');
    assert.equal(await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mp.screenshot({ path: path.join(out, 'mobile.png') }); await m.close();
    const report = { left, right, horizontalTravel: right.x - left.x, staticTitle: true, pause: true, leaveReset: true, reduced: true, touchUnchanged: true };
    fs.writeFileSync(path.join(out, 'pointer-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2)); await browser.close();
})().catch(async e => { console.error(e); await browser?.close(); process.exitCode = 1; });
