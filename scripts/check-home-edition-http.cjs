/*
 * Local production-preview checks only. Every HTTP request is a GET to the
 * supplied local origin; redirects cannot escape it. No forms or API writes.
 * Usage after starting the preview: node scripts/check-home-edition-http.cjs http://127.0.0.1:3114
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cheerio = require('cheerio');
const ts = require('typescript');

const base = new URL(process.argv[2] || 'http://127.0.0.1:3114');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Local preview only');
assert(['http:', 'https:'].includes(base.protocol), 'HTTP(S) preview required');
assert(!base.username && !base.password, 'Do not pass credentials in the preview URL');
assert(base.pathname === '/' && !base.search && !base.hash, 'Pass the preview origin, without a path or query');

// Read the unchanged, authoritative content modules without a build or TS hook.
// Only these three local data modules may be evaluated or required.
const dataCache = new Map();
function dataModule(name) {
    assert(['site', 'upgrade', 'cases'].includes(name), `Unsupported data module: ${name}`);
    if (dataCache.has(name)) return dataCache.get(name);
    const filename = path.join(__dirname, '..', 'data', 'renewal', `${name}.ts`);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: filename,
    }).outputText;
    const exports = {};
    dataCache.set(name, exports);
    vm.runInNewContext(output, {
        exports,
        require(request) {
            assert.equal(request, './upgrade', `Unexpected import in ${name}: ${request}`);
            return dataModule('upgrade');
        },
    }, { filename, timeout: 5000 });
    return exports;
}

const site = dataModule('site');
const { CASES } = dataModule('cases');
const normalize = value => String(value).normalize('NFC').replace(/\s+/g, '');
const responses = new Map();

async function localGet(input) {
    const initial = new URL(input, base);
    initial.hash = '';
    assert.equal(initial.origin, base.origin, `Nonlocal request blocked: ${initial.href}`);
    if (responses.has(initial.href)) return responses.get(initial.href);
    const pending = (async () => {
        let current = initial;
        for (let redirects = 0; redirects <= 8; redirects += 1) {
            assert.equal(current.origin, base.origin, `Nonlocal redirect blocked: ${current.href}`);
            assert(!current.username && !current.password, 'Redirect credentials blocked');
            assert(!current.pathname.startsWith('/api/'), `API route is outside page QA: ${current.pathname}`);
            const response = await fetch(current, {
                method: 'GET',
                redirect: 'manual',
                headers: { 'User-Agent': 'ChatGPT-User' },
                signal: AbortSignal.timeout(30000),
            });
            const html = await response.text();
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                const location = response.headers.get('location');
                assert(location, `${current.pathname}: redirect has no Location`);
                current = new URL(location, current);
                current.hash = '';
                continue;
            }
            return { status: response.status, html, headers: response.headers, finalUrl: current.href };
        }
        throw new Error(`${initial.pathname}: too many redirects`);
    })();
    responses.set(initial.href, pending);
    return pending;
}

function documentText(selection) {
    const copy = selection.clone();
    // Copy must be in actual SSR content, not hydration/JSON-LD or duplicate art.
    copy.find('script, style, template, noscript, [aria-hidden="true"]').remove();
    return normalize(copy.text());
}

function assertCopy(selection, expected, context) {
    const actual = documentText(selection);
    for (const text of expected.filter(value => typeof value === 'string' && value.length)) {
        assert(actual.includes(normalize(text)), `${context}: missing SSR copy: ${text}`);
    }
}

function assertCount(selection, count, context) {
    assert.equal(selection.length, count, `${context}: expected ${count}, received ${selection.length}`);
}

async function main() {
    const response = await localGet(base);
    assert.equal(response.status, 200, 'Homepage HTTP status');
    const $ = cheerio.load(response.html);
    const root = $('[data-edition-root]');
    assertCount(root, 1, 'Edition root');
    assertCount($('[data-home-motion-root]'), 0, 'Previous home controller removed');
    assertCount($('[data-home-edition-hero]'), 1, 'Edition hero');
    assertCount($('main'), 1, 'SSR main landmark');
    assertCount(root.parents('main'), 1, 'Edition content belongs to main');
    assertCount($('h1'), 1, 'Single h1');
    assert.equal(normalize($('h1').text()), normalize('로펌 마케팅에 필요한 모든 것. 메이크디스원 하나로'), 'Exact hero h1');
    assertCount($('link[rel="canonical"]'), 1, 'Canonical link');
    assert.equal($('link[rel="canonical"]').attr('href'), 'https://www.makethis1.com', 'Canonical URL');
    assert(!/noindex|none/i.test($('meta[name="robots"]').map((_, node) => $(node).attr('content') || '').get().join(',')), 'General robots meta must allow indexing');
    assert(!/noindex|none/i.test(response.headers.get('x-robots-tag') || ''), 'X-Robots-Tag must not block the page');

    const section = name => root.find(`[data-edition-section="${name}"]`);
    const scene = name => root.find(`[data-edition-scene="${name}"]`);
    for (const name of ['services', 'journey', 'operations', 'clients', 'cases', 'team']) {
        assertCount(section(name), 1, `Section ${name}`);
    }
    for (const name of ['services', 'journey', 'operations', 'partner-roster', 'channel-insert', 'founder-spread', 'estimate-fan', 'contact-curtain']) {
        assertCount(scene(name), 1, `Scene ${name}`);
    }
    assertCount(root.find('[data-edition-range="story"]'), 2, 'Only services and journey have story tracks');
    for (const name of ['services', 'journey']) assert.equal(scene(name).attr('data-edition-range'), 'story', `${name} story range`);
    assert.equal(scene('operations').attr('data-edition-range'), undefined, 'Operations uses entry progress');
    assertCount(scene('team-portrait'), site.TEAM.length, 'All team portraits');
    assertCount(scene('case-gatefold'), CASES.some(item => !item.isSample) ? 1 : 0, 'Featured case gatefold');
    assertCount(scene('case-spread'), CASES.length - scene('case-gatefold').length, 'Remaining cases');
    assertCount(scene('case-account'), CASES[0]?.growth?.length || 0, 'First-case growth account only');

    assertCopy(root, [site.HERO_OVERLINE, site.HERO_BODY, site.HERO_CARD_TITLE, site.HERO_CARD_FOOT, ...site.HERO_BEFORE], 'Hero');
    for (const stat of site.PROOF_STATS) {
        const term = root.find('dt').filter((_, node) => normalize($(node).text()) === normalize(stat.label));
        assertCount(term, 1, `Proof label ${stat.label}`);
        assertCopy(term.parent(), [`${stat.value}${stat.suffix}`], `Proof ${stat.label}`);
    }

    assertCopy(section('services'), [
        '우리가 맡는 일.',
        '운영 범위는 상품에 따라 다릅니다. 조건부 항목은 확정 서비스가 아니며, 필요성·광고 허용 여부에 따라 검토합니다.',
        '변호사법·대한변협 광고 규정을 준수하며, 법률 표현은 법학 전공자가 검수합니다.',
        '전체 업무 보기',
    ], 'Service notes');
    assertCount(section('services').find('article'), site.SERVICES.length, 'Six real service leaves');
    assertCount(section('services').find('details'), site.SERVICES.length, 'Six native service disclosures');
    for (const service of site.SERVICES) {
        const article = section('services').find('article').filter((_, node) => $(node).find('h3 a').attr('href') === site.path(service.href));
        assertCount(article, 1, `Service link ${service.ko}`);
        assertCopy(article, [service.ko, service.en, service.summary, '세부 업무 보기'], `Service ${service.no}`);
        for (const item of service.items) {
            const row = article.find('details li').filter((_, node) => documentText($(node)).includes(normalize(item.label)));
            assert(row.length > 0, `${service.ko}: missing detail ${item.label}`);
            if (item.badge) assertCopy(row, [item.badge], `${service.ko}: conditional badge for ${item.label}`);
        }
    }

    assertCopy(section('journey'), ['검색부터 상담까지.', '화면 구성 예시 · 읽기 전용'], 'Journey heading');
    const steps = section('journey').find('ol').first().children('li');
    assertCount(steps, site.JOURNEY.length, 'Three journey steps');
    site.JOURNEY.forEach((step, index) => assertCopy(steps.eq(index), [step.no, step.title, step.desc, ...step.labels], `Journey ${step.no}`));
    assertCopy(section('journey'), [
        '성과 확인', '전화 · 카카오 · 폼', '상담', '수임',
        '수임 결과는 로펌이 제공한 범위에서 연결',
        '상담이 들어온 경로와 비용을 비교해 다음 달 예산을 조정합니다.',
        '유입 확인', '유효상담 분석', '다음 달 예산 조정', '상담·수임 분석 보기',
        '상담 경로 예시', '유입 채널', '검색광고', '사건 분야', '이혼', '문의 경로', '전화',
    ], 'Journey conversion');
    assertCopy(section('operations'), [
        ...site.BEFORE_AFTER.title, site.BEFORE_AFTER.before.label, ...site.BEFORE_AFTER.before.items,
        site.BEFORE_AFTER.after.label, ...site.BEFORE_AFTER.after.items,
    ], 'Before / after');
    assertCopy(section('clients'), ['Selected Clients', '법무법인 · 법률사무소', '기업 고객', ...site.LAW_FIRM_PARTNERS, ...site.CORPORATE_CLIENTS], 'Partner names');

    assertCopy(section('cases'), ['이렇게 운영했습니다.', '전체 사례 보기'], 'Cases heading');
    const caseArticles = section('cases').find('article');
    assertCount(caseArticles, CASES.length, 'All published case documents');
    CASES.forEach((item, index) => {
        assertCopy(caseArticles.eq(index), [item.label, item.field, ...item.before, ...item.strategy, ...item.result.flatMap(result => [result.metric, result.change]), item.note], `Case ${item.id}`);
        if (index === 0) assertCopy(caseArticles.eq(index), (item.growth || []).flatMap(step => [step.en, step.title, step.desc]), `Growth ${item.id}`);
    });

    assertCopy(section('team'), ['로펌 마케팅을 맡는 사람들.', '기자·방송작가 출신이 쓰고, 법학 전공자가 검수합니다.', '팀과 회사 소개 보기'], 'Team heading');
    site.TEAM.forEach(member => assertCopy(section('team'), [member.name, member.role, member.background], `Team ${member.name}`));
    site.DISCIPLINES.forEach(item => assertCopy(section('team'), [item.en, item.ko], `Discipline ${item.en}`));
    assertCopy(scene('founder-spread'), [site.FOUNDER.name, site.FOUNDER.role, site.FOUNDER.lead, ...site.FOUNDER.career.legal, ...site.FOUNDER.career.marketing], 'Founder');
    const channelSection = root.find('[data-edition-section="CHANNELS"]');
    assertCopy(channelSection, [...site.NEW_CHANNEL_TITLE, site.NEW_CHANNEL_BODY, site.LEDGER_FOOTNOTE, '채널별 운영 현황 보기'], 'Channel conditions');
    site.CHANNEL_LEDGER.forEach(row => assertCopy(channelSection, [row.channel, row.status, row.note], `Channel ${row.channel}`));

    const plans = scene('estimate-fan').find('.mt-plan');
    assertCount(plans, 3, 'Three price estimates');
    assert.deepEqual(plans.find('.mt-plan-price').map((_, node) => $(node).text().trim()).get(), ['월 250만원', '월 500만원', '월 1,300만원부터'], 'Exact approved prices');
    site.PLANS.forEach((plan, index) => {
        assertCopy(plans.eq(index), [plan.en, plan.ko, plan.price, plan.priceNote, plan.desc, plan.includesLabel, ...plan.includes, plan.badge], `Plan ${plan.key}`);
        assert.equal(plans.eq(index).find('a.mt-plan-cta').attr('href'), site.path(`/diagnose?plan=${plan.key}#form`), `Plan ${plan.key} consultation URL`);
        assertCount(plans.eq(index).find('ul li'), plan.includes.length, `Plan ${plan.key} SSR scope rows`);
    });
    assertCopy(scene('estimate-fan'), [site.PLANS_FOOTNOTE, '변호사 마케팅 비용과 서비스', '필요한 범위에 맞춰 선택하세요.', '이미 블로그를 맡기고 계신가요?', '블로그에서, 마케팅 전체로.', '통합 상품 전환 안내', ...site.PLANS_FAQ.flatMap(item => [item.q, item.a])], 'Plan conditions and FAQ');
    assertCopy(scene('contact-curtain'), ['사건에 집중하세요.', '마케팅은 맡기세요.', '예산과 목표에 맞는 운영안을 제안합니다.', site.PRIMARY_CTA.label, '연락처 보기', '비용 다시 보기', site.COMPANY.phone], 'Contact');

    // The magazine may be absent when the existing database read is unavailable.
    assert(scene('insights').length <= 1, 'At most one insights section');
    const articleLinks = scene('insights').find('a[href^="/magazine/"]');
    assertCount(scene('article-press'), articleLinks.length, 'One press scene per actual article link');
    if (scene('insights').length) {
        assert(articleLinks.length > 0, 'Visible insights requires articles');
        assertCopy(scene('insights'), ['법무법인 마케팅, 먼저 읽어볼 글.', '마케팅 매거진 전체 보기'], 'Insights heading');
        articleLinks.each((_, node) => assert($(node).find('h3').text().trim(), 'Each article has an SSR title'));
        const archive = await localGet(new URL('/magazine', base));
        assert.equal(archive.status, 200, 'Latest article archive');
        const archiveDom = cheerio.load(archive.html);
        const collection = archiveDom('script[type="application/ld+json"]').toArray()
            .map(node => JSON.parse(archiveDom(node).text()))
            .find(value => value['@type'] === 'CollectionPage');
        assert(collection?.mainEntity?.itemListElement, 'Archive exposes ordered published articles');
        const expectedLatest = collection.mainEntity.itemListElement.slice(0, 3)
            .map(item => decodeURI(new URL(item.url).pathname));
        assert.deepEqual(articleLinks.map((_, node) => decodeURI($(node).attr('href'))).get(), expectedLatest,
            'Homepage must show the same newest three articles as the archive');
    }

    const targets = new Set();
    for (const href of $('a[href]').map((_, node) => $(node).attr('href')).get()) {
        if (!href || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) continue;
        const url = new URL(href, base);
        if (['www.makethis1.com', 'makethis1.com'].includes(url.hostname)) {
            targets.add(new URL(`${url.pathname}${url.search}`, base).href);
        } else if (url.origin === base.origin) {
            url.hash = '';
            targets.add(url.href);
        }
    }
    assert(targets.size > 0, 'Homepage exposes real internal links');
    const queue = [...targets];
    const linkFailures = [];
    await Promise.all(Array.from({ length: 4 }, async () => {
        while (queue.length) {
            const url = queue.shift();
            try {
                const result = await localGet(url);
                assert.equal(result.status, 200, `${new URL(url).pathname}${new URL(url).search}: expected HTTP 200`);
            } catch (error) { linkFailures.push(error.message); }
        }
    }));
    assert.equal(linkFailures.length, 0, `Internal-link failures:\n${linkFailures.join('\n')}`);

    for (const route of ['/work', '/about', '/upgrade', '/lawfirm-marketing', '/admin']) {
        const result = await localGet(new URL(route, base));
        assert.equal(result.status, 200, `${route}: HTTP 200`);
        const other = cheerio.load(result.html);
        assertCount(other('[data-edition-root]'), 0, `${route}: edition root must not leak`);
        assertCount(other('[data-edition-scene], [data-edition-section], [data-home-edition-hero]'), 0, `${route}: edition content must not leak`);
    }

    console.log(`PASS: edition root/sections/scenes, exactly 2 story tracks, single h1/canonical/robots, authoritative SSR copy and approved prices, ${targets.size} internal destinations HTTP 200, 5 non-home routes isolated`);
}

main().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
