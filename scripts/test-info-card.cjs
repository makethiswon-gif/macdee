// 2번 '핵심 정리' 카드(2026-10-24) 검사 — 원고 응답 파서 → 구성안 → 카드 조판. 모델 호출·네트워크·운영 저장소 없음.
//   node scripts/test-info-card.cjs [PNG를 저장할 폴더]
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
process.env.ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
global.fetch = async () => { throw new Error("No network allowed"); };
const sharp = require("sharp");
const { parseInfoBrief, infoBriefFromWire, isSentenceHeading, INFO_MARKER } = require("../lib/blog-images/info-brief.ts");
const { readManuscriptResponse } = require("../lib/blog-manuscript-response.ts");
const { planEditorialThreeFromBrief, asEditorialThree, withInfoCard } = require("../lib/blog-images/three-card-plan.ts");
const { renderEditorialThree } = require("../lib/blog-images/three-card-renderer.ts");
const { signImageProof } = require("../lib/blog-images/proof-selection.ts");
const { sourceHash, validateVisualPlan } = require("../lib/blog-images/visual-planner.ts");
const { isShareableCard } = require("../lib/blog-images/shared-cards.ts");
const { editorialStudioPhotoMissing, imageReady } = require("../lib/blog-images/quality-policy.ts");
const OUT = process.argv[2];

const title = "의사인데 교통사고로 금고형 집행유예를 받으면 면허가 취소되나요";
const article = `가령 내과 전문의가 퇴근길 교차로에서 보행자를 쳐 12주 진단의 상처를 입혔다고 해 봅시다.

## 의료법과 상관없는 죄도 결격사유가 될까

2023년 개정 의료법부터는 그렇습니다. 이제는 죄의 종류를 묻지 않고, 금고 이상의 형이면 결격사유에 해당합니다.

결격사유가 생기면 면허 취소는 재량이 아니라 의무가 됩니다.

## 형량이 가벼우면 면허는 지킬 수 있을까

형량보다 형의 종류가 먼저입니다. 벌금형으로 끝나면 이 결격사유에는 해당하지 않습니다.

## 집행유예가 끝나면 결격에서도 벗어날까

유예기간이 끝나도 2년이 더 남습니다.

---
**기준일** 2026년 10월 23일 작성`;
const coverBrief = { heading: "퇴근길 사고로\n면허까지 잃을까", kicker: "의사 면허", emphasis: "", subject: "병원 주차장의 의사", scene: "병원 주차장에서 흰 가운을 팔에 걸친 의사가 자기 차 문을 여는 뒷모습을 중원거리에서 찍는다. 저녁 무렵.",
    message: "일상의 사고가 면허로 이어지는 순간", avoid: ["법봉"], alternateScene: "", question: "교통사고 금고형이면 면허가 취소되나", thesis: "금고 이상이면 취소, 벌금이면 아니다.", layoutRecipe: "column-pair", family: "story" };
const profile = { id: "mmlhi2x25zu2h", lawyerName: "오승준", officeName: "법무법인 액시스 (구 BHSN)", jobTitle: "대표 변호사", phone: "02-2038-9185", website: "", brandColor: "#2755C9",
    profileImages: [], officeImages: [], logoImage: "" };
const hash = sourceHash(title, article);
const proof = { profileId: profile.id, firmId: "", lawyerId: profile.id, revision: 0, sourceHash: hash, mode: "basic", claims: [] };

const responses = {
    compare: `kind: compare
heading: 벌금형과 금고형 집행유예 / 의사 면허의 차이
kicker: 의사 면허 · 금고 집행유예
note: 교도소에 가지 않아도 '금고 이상의 형을 선고받은 사람'이라는 지위는 그대로 남습니다.
after: 형량이 가벼우면 면허는 지킬 수 있을까
item: 열 | 벌금형 | 금고형 집행유예
item: 결격사유 | 해당 없음 | 해당 · 의료법 제8조 제5호
item: 면허 | 유지 | 반드시 취소 · 제65조 제1항
item: 결격 기간 | — | 유예기간이 끝난 뒤 2년까지
item: 예외 | — | 의료행위 중 업무상과실치사상`,
    flow: `kind: flow
heading: 스토킹 고소 뒤 / 형사 절차 4단계
kicker: 층간소음 · 스토킹 고소
note: 한 번의 방문은 처벌 대상이 아니지만, 거절의 뜻을 안 뒤의 방문은 반복으로 쌓입니다.
after: 없는 소제목
item: 피의자 조사 | 고소 후 몇 주에서 한두 달 안에 출석 요구가 옵니다
item: 경찰 결정 | 조사 뒤 한두 달에서 몇 달 사이 송치·불송치가 정해집니다
item: 검찰 처분 | 혐의없음 · 기소유예 · 약식명령 청구 · 정식 기소 중 하나
item: 약식명령 | 고지받은 다음 날부터 7일 안에 정식재판을 청구할 수 있습니다`,
    checklist: `kind: checklist
heading: 보험 재산분할 / 판단 기준 네 가지
kicker: 재산분할 · 해약환급금
note:
item: 해약환급금으로 값을 매긴다 | 사망보험금과 앞으로 받을 연금 총액은 목록에 오르지 않습니다
item: 계약자가 누구인지 본다 | 피보험자·수익자가 아니라 계약자 쪽 재산으로 셉니다
item: 결혼 전 쌓인 몫은 뺀다 | 결혼 무렵의 환급금을 확인해 그 금액을 빼는 방식이 자주 쓰입니다
item: 어느 날의 금액인지 정한다 | 재판상 이혼은 변론종결일, 협의이혼 뒤 청구는 이혼신고일 기준`,
    timeline: `kind: timeline
heading: 유류분 반환청구 / 기한 계산
kicker: 유류분 · 소멸시효
note: 기간이 토요일·공휴일로 끝나면 그다음 날로 넘어갑니다.
item: 사망일 | 상속 개시 | 10년 기간이 이날부터 흐릅니다
item: 처음 안 날 | 반환할 증여를 앎 | 1년 기간이 이날부터 흐릅니다
item: 1년 안 | 반환청구 의사표시 | 내용증명으로 뜻을 전하면 시효가 멈춥니다`,
    numbers: `kind: numbers
heading: 유류분 반환청구 기한 / 1년과 10년
kicker: 유류분 · 소멸시효
note: 민법 제1117조 · 1년 안에 반환청구의 뜻을 전하면 시효는 멈춥니다.
item: 1 | 년 | 안 날부터 | 상속개시와 돌려받을 증여를 모두 안 날부터 셉니다
item: 10 | 년 | 상속개시부터 | 돌아가신 날 이미 출발한 기간입니다`,
    statement: `kind: statement
heading: 중고거래 사기 피해금을 / 돌려받는 세 가지 길
kicker: 중고거래 사기 · 배상명령
note: 사기죄는 친고죄도 반의사불벌죄도 아니라서, 고소를 취하해도 수사와 재판은 계속될 수 있습니다.
item: 안내 | 고소장만으로 돈이 돌아오지는 않습니다. 돈은 아래 셋 중 하나로 옵니다
item: 합의 | 판매자가 돈을 돌려주고 고소 취하를 청할 때 | 돈이 들어온 것을 확인한 뒤 처벌불원서에 서명합니다
item: 배상명령 | 정식 공판에서 유죄와 함께 배상을 명할 때 | 첫 공판 전에 배상신청서를 내 두면 기회를 놓치지 않습니다
item: 민사소송 | 불송치·약식명령으로 재판이 열리지 않을 때 | 3천만 원 이하는 소액사건으로 간이한 절차를 밟습니다`,
};

(async () => {
    // ── 1. 파서 ──
    for (const [kind, block] of Object.entries(responses)) {
        const r = parseInfoBrief(`===TITLE===\n제목\n===BODY===\n본문\n===FACTS===\n- 사실\n===COVER===\nheading: x\n${INFO_MARKER}\n${block}\n`);
        assert.ok(r.brief, `${kind}: ${r.issues.join(", ")}`);
        assert.equal(r.brief.infographic.kind, kind);
        assert.ok(!r.brief.infographic.heading.includes(" / "), "두 행은 줄바꿈으로");
        assert.deepEqual(infoBriefFromWire(JSON.parse(JSON.stringify(r.brief))), r.brief, `${kind}: 화면 왕복`);
    }
    // 대표 지적(2026-10-24): 서술형 축약 제목은 받지 않는다.
    for (const bad of ["벌금이냐 금고냐가\n면허를 가릅니다", "고소 뒤 절차는 이 순서로 흘러갑니다", "두 기간 중 하나만 지나도 유류분은 사라집니다", "면허까지 잃을까"]) assert.ok(isSentenceHeading(bad), bad);
    for (const ok of ["벌금형과 금고형 집행유예\n의사 면허의 차이", "스토킹 고소 뒤 형사 절차 4단계", "유류분 반환청구 기한 1년과 10년", "임시양육자 지정 요건", "사건 개요", "피해자"]) assert.ok(!isSentenceHeading(ok), ok);
    const sentence = parseInfoBrief(`${INFO_MARKER}\n${responses.compare.replace("벌금형과 금고형 집행유예 / 의사 면허의 차이", "벌금이냐 금고냐가 / 면허를 가릅니다")}`);
    assert.equal(sentence.brief, null); assert.match(sentence.issues.join(), /명사형/);
    assert.equal(parseInfoBrief(`${INFO_MARKER}\n${responses.flow.replace("검찰 처분", "승소 보장")}`).brief, null, "광고 규정 위험 표현");
    assert.equal(parseInfoBrief("===TITLE===\nx\n===BODY===\ny").brief, null, "블록이 없으면 null");
    assert.equal(parseInfoBrief(`${INFO_MARKER}\nkind: flow\nheading: 절차 정리\nitem: 하나뿐 | 설명`).brief, null, "항목 2개 미만");

    // ── 2. 원고 응답: 핵심 정리 블록이 사실 목록에 섞이지 않는다 ──
    const msg = { stop_reason: "end_turn", content: [{ type: "text", text: `===TITLE===\n제목\n===BODY===\n본문 문단입니다.\n===FACTS===\n- 의료법 제8조 제5호\n===COVER===\nheading: 표지\n${INFO_MARKER}\n${responses.compare}` }] };
    const read = readManuscriptResponse(msg);
    assert.deepEqual(read.facts, ["의료법 제8조 제5호"]);
    assert.ok(parseInfoBrief(read.raw).brief, "원본 응답에서 브리프를 다시 읽는다");

    // ── 3. 구성안: 소제목 자리·검증·재사용 금지 ──
    const brief = (kind) => parseInfoBrief(`${INFO_MARKER}\n${responses[kind]}`).brief;
    let plan = planEditorialThreeFromBrief(title, article, profile, proof, coverBrief, [], brief("compare"));
    plan.proofToken = signImageProof(proof);
    const info = plan.cards.find((c) => c.type === "info");
    assert.equal(info.infographic.kind, "compare");
    assert.equal(info.afterHeading, "형량이 가벼우면 면허는 지킬 수 있을까");
    const paragraphs = plan.paragraphs;
    assert.match(paragraphs.find((p) => p.id === info.afterParagraphId).text, /벌금형으로 끝나면/, "그 소제목 절의 마지막 문단 뒤");
    plan = validateVisualPlan(JSON.parse(JSON.stringify(plan)), title, article); // 화면 왕복
    assert.equal(plan.cards.find((c) => c.type === "info").infographic.kind, "compare");
    assert.equal(isShareableCard(plan, "info"), false, "글마다 다른 카드는 재사용하지 않는다");
    assert.equal(isShareableCard(plan, "contact"), true);
    const flowPlan = withInfoCard(asEditorialThree(plan, profile, proof, title, article), profile && brief("flow"), title, article);
    const flowCard = flowPlan.cards.find((c) => c.type === "info");
    assert.equal(flowCard.infographic.kind, "flow"); assert.equal(flowCard.afterHeading, undefined, "없는 소제목이면 본문 중반");
    assert.equal(asEditorialThree(plan, profile, proof, title, article).cards[1].infographic.kind, "compare", "저장된 구성안의 데이터를 지킨다");
    assert.throws(() => validateVisualPlan({ ...JSON.parse(JSON.stringify(plan)), cards: plan.cards.map((c) => c.type === "info" ? { ...c, infographic: { kind: "flow", heading: "x", steps: [] } } : c) }, title, article), /핵심 정리/);

    // ── 4. 조판: 여섯 형식 모두 검사 통과, 2000px, 사진 없음 ──
    for (const kind of Object.keys(responses)) {
        const p = withInfoCard(plan, brief(kind), title, article);
        const card = await renderEditorialThree({ plan: p, card: p.cards.find((c) => c.type === "info"), profile });
        assert.equal(card.layoutChecks.passed, true, `${kind}: ${card.layoutChecks.issues.join(" ")}`);
        assert.equal(card.infoKind, kind); assert.equal(card.aiGenerated, false); assert.equal(card.name, "핵심 정리");
        const meta = await sharp(Buffer.from(card.imageDataUrl.split(",")[1], "base64")).metadata();
        assert.equal(meta.width, 2000); assert.equal(meta.height, 2000);
        assert.equal(editorialStudioPhotoMissing(card), false, "사진 승인 검사에서 막지 않는다");
        assert.equal(imageReady({ ...card, releaseToken: "x", setId: "y" }), true);
        if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `info-${kind}.png`), Buffer.from(card.imageDataUrl.split(",")[1], "base64")); }
    }
    // 항목이 많아 넘치면 글자를 줄이고, 그래도 안 되면 검사 실패(글자를 잘라 저장하지 않는다)
    const long = withInfoCard(plan, brief("flow"), title, article);
    const steps = Array.from({ length: 6 }, (_, i) => ({ label: `단계 ${i + 1} 이름이 조금 긴 경우`, note: "설명이 아주 길어서 두 줄 세 줄로 넘어가는 경우를 일부러 만들어 지면이 넘치는지 확인합니다. ".repeat(2).slice(0, 130) }));
    const crowded = await renderEditorialThree({ plan: long, card: { ...long.cards[1], infographic: { kind: "flow", heading: "절차 6단계", steps } }, profile });
    assert.equal(crowded.layoutChecks.passed, false, "넘치는 지면은 발행 서명을 받지 못한다");
    console.log("test-info-card: 모두 통과");
})().catch((e) => { console.error(e); process.exit(1); });
