// Real handlers and Sharp, durable in-memory storage, no paid network calls.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), crypto = require("node:crypto"), sharp = require("sharp");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
process.env.ADMIN_ID = "studio-fixture"; process.env.ADMIN_TOKEN_SECRET = "local-studio-test-secret"; process.env.OPENAI_API_KEY = "local-test-never-sent";
const objects = new Map(); let publicBucket = false, failedPath = "", providerMode = "success", calls = 0, profilePhoto = "", lastForm;
const owner = "mqaaoypk621p6", other = "mmlhi2x25zu2h";
const client = { from: () => ({ select: () => ({ eq: (_, id) => ({ single: async () => ({ data: [owner, other].includes(id) ? { id, lawyer_name: "김정웅", office_name: "법률사무소", profile_images: [profilePhoto], phone: "062-223-7877", website: "" } : null, error: null }) }) }) }),
    storage: { getBucket: async () => ({ data: { public: publicBucket }, error: null }), from: () => ({
        exists: async (p) => ({ data: objects.has(p), error: null }),
        download: async (p) => ({ data: objects.has(p) ? new Blob([objects.get(p)]) : null, error: null }),
        upload: async (p, bytes, options) => { if (failedPath && p.includes(failedPath)) return { error: { statusCode: "503", message: "fixture outage" } }; if (objects.has(p) && !options?.upsert) return { error: { statusCode: "409" } }; objects.set(p, bytes); return { error: null }; },
        list: async (p, options) => ({ data: [...objects.keys()].filter((key) => key.startsWith(p + "/") && !key.slice(p.length + 1).includes("/")).map((key) => ({ name: key.slice(p.length + 1), created_at: "2026-09-11T00:00:00Z" })).sort((a, b) => b.name.localeCompare(a.name)).slice(0, options?.limit || 100), error: null }),
    }) } };
const moduleLoad = Module._load;
Module._load = function(name, ...args) { if (name === "@/lib/supabase/server") return { createServiceClient: () => client }; return moduleLoad.call(this, name, ...args); };
const types = require("../lib/lawyer-studio/types.ts"), store = require("../lib/lawyer-studio/store.ts");
const generation = require("../lib/lawyer-studio/generation.ts"), finishing = require("../lib/lawyer-studio/finishing.ts"), blog = require("../lib/lawyer-studio/blog.ts");
const { createStudioBackground } = require("../lib/lawyer-studio/backgrounds.ts");
const { createStudioPose } = require("../lib/lawyer-studio/poses.ts");
const batches = require("../lib/lawyer-studio/batch.ts"), batchRoute = require("../app/api/admin/lawyer-studio/batch/route.ts");
const referenceProcessing = require("../lib/lawyer-studio/reference-processing.ts"), { prepareReferences } = require("../lib/lawyer-studio/references.ts");
const stylePack = require("../lib/lawyer-studio/style-pack.ts");
const previewRoute = require("../app/api/admin/lawyer-studio/reference-preview/route.ts");
const proportions = require("../lib/lawyer-studio/proportions.ts");
const anatomy = require("../lib/lawyer-studio/anatomy.ts");
const route = require("../app/api/admin/lawyer-studio/route.ts"), renderRoute = require("../app/api/admin/lawyer-studio/render/route.ts"), assetRoute = require("../app/api/admin/lawyer-studio/asset/route.ts"), generateRoute = require("../app/api/admin/lawyer-studio/generate/route.ts"), referenceRoute = require("../app/api/admin/lawyer-studio/references/route.ts");
const { validateVisualPlan, sourceHash } = require("../lib/blog-images/visual-planner.ts");
const { cardTypesFor } = require("../lib/blog-images/card-types.ts");
const { digest } = require("../lib/blog-images/production-store.ts");
const payload = "studio-fixture:local-test", cookie = "admin_token=" + Buffer.from(payload + ":" + crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(payload).digest("hex")).toString("base64url");
const req = (body, auth = true, origin = "http://localhost") => new Request("http://localhost/api/admin/lawyer-studio", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...(auth ? { cookie } : {}) }, body: JSON.stringify(body) });
const get = (query, auth = true) => new Request("http://localhost/api/admin/lawyer-studio/asset?" + new URLSearchParams(query), { headers: auth ? { cookie } : {} });
const input = () => ({ profileId: owner, requestId: crypto.randomUUID(), options: types.DEFAULT_OPTIONS, profileImageIndices: [0], referenceIds: [], consent: true, paidConfirmed: true });
const ok = async (response) => { const data = await response.json(); assert.equal(response.status, 200, JSON.stringify(data)); return data; };
(async () => {
    const texture = Buffer.alloc(800 * 1000 * 3);
    for (let y = 0; y < 1000; y++) for (let x = 0; x < 800; x++) {
        const i = (y * 800 + x) * 3; texture[i] = 146 + Math.floor(x / 40) % 2 * 15; texture[i + 1] = 164 + Math.floor(y / 40) % 2 * 15; texture[i + 2] = 198;
    }
    const original = await sharp(texture, { raw: { width: 800, height: 1000, channels: 3 } }).png().toBuffer();
    profilePhoto = "data:image/png;base64," + original.toString("base64");
    await assert.rejects(referenceProcessing.isolateHeads(original, 1), /얼굴 0개/, "Real local detector rejects a non-face before any paid request");
    const measuredStyle = await referenceProcessing.describeStyle(original);
    assert.match(measuredStyle, /measured tonal tendencies/); assert.doesNotMatch(measuredStyle, /window|desk|stairs/);
    assert.equal(types.DEFAULT_OPTIONS.mood, "documentary");
    assert.equal(types.studioRecoveryAction(new types.StudioPhotoRequiredError(6).message), "블로그 연결 설정");
    assert.equal(types.studioRecoveryAction(new types.StudioPhotoRequiredError().message), "스튜디오 사진 승인하기");
    assert.equal(types.studioRecoveryAction("Storage unavailable"), undefined);
    assert.equal(types.studioLibraryUrl(other), `/admin/lawyer-studio?profileId=${other}&view=library`);
    assert.equal(types.studioFiltersForMood("documentary").saturation, 0.9);
    assert.equal(types.studioFiltersForMood("monochrome").saturation, 0);
    assert.equal(anatomy.reviewFaceScale([0.06], 1, false).state, 'measured');
    assert.equal(anatomy.reviewFaceScale([0.1], 1, false).state, 'review');
    assert.equal(anatomy.reviewFaceScale([0.1], 1, true).state, 'measured', 'Cover framing uses its own size guide');
    assert.equal(anatomy.reviewFaceScale([0.06, 0.1], 2, false).state, 'review', 'Each face in a pair is checked');
    assert.equal(anatomy.reviewFaceScale([0.06], 2, false).state, 'unmeasured');
    const bigFace = { x: 420, y: 350, width: 100, height: 100 };
    const balance = anatomy.initialHeadBalance([bigFace], 1000, 1200, types.DEFAULT_OPTIONS);
    assert.equal(balance.length, 1); assert.equal(balance[0].scaleX, 96); assert.equal(balance[0].scaleY, 96);
    assert.equal(anatomy.initialHeadBalance([bigFace], 1000, 1200, types.DEFAULT_OPTIONS, 'gentle-head-balance-v1')[0].scaleX, 90, 'Frozen jobs retain their original finishing policy');
    assert.equal(anatomy.initialHeadBalance([{ ...bigFace, width: 140, height: 140 }], 1000, 1200, types.DEFAULT_OPTIONS)[0].scaleX, 96, 'A larger detected head never increases the new 4% correction');
    assert.deepEqual(types.parseProportions(balance), balance);
    assert.deepEqual(anatomy.initialHeadBalance([bigFace], 1000, 1600, types.DEFAULT_OPTIONS), [], 'Normal heads remain untouched');
    assert.deepEqual(anatomy.initialHeadBalance([bigFace], 1000, 1200, { ...types.DEFAULT_OPTIONS, scene: 'forbes' }), [], 'Prominent cover framing is allowed');
    assert.deepEqual(anatomy.initialHeadBalance([{ ...bigFace, y: 0 }], 1000, 1200, types.DEFAULT_OPTIONS), [], 'Clipped correction boundaries are not warped');
    assert.deepEqual(anatomy.initialHeadBalance([bigFace, { ...bigFace, x: 500 }], 1000, 1200, { ...types.DEFAULT_OPTIONS, subjectCount: 2 }), [], 'Overlapping people remain review-only');
    assert.deepEqual(anatomy.initialHeadBalance([bigFace], 1000, 1200, { ...types.DEFAULT_OPTIONS, subjectCount: 2 }), [], 'Ambiguous detection cannot warp a person');
    assert.deepEqual(anatomy.initialHeadBalance([{ ...bigFace, height: 300 }], 1000, 1200, types.DEFAULT_OPTIONS), [], 'Unexpected closeups stay review-only');
    assert.equal((await anatomy.checkStudioFaceScale(original, types.DEFAULT_OPTIONS)).state, 'unmeasured', 'Undetectable faces are not falsely certified or automatically regenerated');
    for (const reference of Object.values(stylePack.EDITORIAL_REFERENCES)) {
        const bytes = await stylePack.readEditorialReference(reference.file);
        const meta = await sharp(bytes).metadata();
        assert.ok(meta.width >= 256 && meta.height >= 256);
        const normalized = await referenceProcessing.normalizeReference(bytes), normalizedMeta = await sharp(normalized).metadata();
        assert.ok(Math.abs(meta.width / meta.height - normalizedMeta.width / normalizedMeta.height) < 0.002, "Reference geometry is not stretched or cropped");
    }
    await assert.rejects(stylePack.readEditorialReference("../secret"));
    for (const scene of Object.keys(types.SCENES)) {
        const refs = stylePack.selectEditorialReferences(owner, scene);
        assert.equal(new Set(refs.map(r => r.file)).size, 2);
        assert.deepEqual(refs, stylePack.selectEditorialReferences(owner, scene));
    }
    let faceCalls = 0, failFaces = false;
    referenceProcessing.isolateHeads = async (bytes, people) => {
        faceCalls++;
        if (failFaces) throw new types.StudioError("fixture face detection failed", 422);
        const crop = await sharp(bytes).resize(256, 320).png().toBuffer();
        return Array.from({ length: people }, () => crop);
    };
    global.fetch = async (url, options) => {
        assert.ok(String(url).startsWith("https://api.openai.com/"), "No other network allowed");
        if (String(url).includes("/models/")) return Response.json({ id: types.STUDIO_MODEL });
        assert.equal(url, "https://api.openai.com/v1/images/edits"); calls++; lastForm = options.body;
        if (providerMode === "lost") throw new Error("fixture network loss");
        if (providerMode === "rejected") return Response.json({ error: "fixture rejection" }, { status: 429 });
        return Response.json({ data: [{ b64_json: original.toString("base64") }], usage: { total_tokens: 123 } }, { headers: { "x-request-id": "fixture-request" } });
    };
    assert.throws(() => types.parseOptions({ ...types.DEFAULT_OPTIONS, scene: "toString" }));
    assert.throws(() => types.parseOptions({ ...types.DEFAULT_OPTIONS, shootStyle: "toString" }));
    assert.equal(types.parseOptions({ ...types.DEFAULT_OPTIONS, scene: "studio", shootStyle: "gq" }).shootStyle, "gq");
    assert.equal(types.parseOptions({ ...types.DEFAULT_OPTIONS, scene: "forbes" }).scene, "forbes");
    const legacyOptions = { scene: "window", wardrobe: "suit", mood: "monochrome", quality: "xhigh", notes: "" };
    assert.deepEqual(types.parseOptions(legacyOptions), legacyOptions, "Old frozen option hashes stay valid");
    for (const scene of Object.keys(types.SCENES)) {
        for (const people of [1, 2]) {
            const recent = [], options = { ...types.DEFAULT_OPTIONS, scene, subjectCount: people };
            for (let i = 0; i < 36; i++) {
                const pose = createStudioPose(owner, `shoot-${i}`, options, recent);
                assert.deepEqual(pose, createStudioPose(owner, `shoot-${i}`, options, recent));
                assert.ok(!recent.slice(0, 3).some((p) => p.poseId === pose.poseId));
                assert.ok(!recent.slice(0, 3).some((p) => p.cameraId === pose.cameraId && p.gazeId === pose.gazeId && p.compositionId === pose.compositionId));
                assert.match(pose.direction, /Build a new body pose from scratch/);
                assert.doesNotMatch(pose.direction, /above eye level|top-down|raised viewpoint/);
                if (people === 2) assert.match(pose.direction, /Do not mirror poses/);
                if (scene === "forbes") assert.doesNotMatch(pose.direction, /20%|80%|across the room/);
                else assert.match(pose.direction, /20% combined person area and 80% environment/);
                const bg = createStudioBackground(owner, `shoot-${i}`, scene, [], pose.direction);
                assert.ok(bg.direction.includes(pose.direction));
                recent.unshift(pose);
            }
        }
        const history = [];
        for (let i = 0; i < 32; i++) {
            const background = createStudioBackground(owner, `sample-${i}`, scene, history);
            assert.deepEqual(background, createStudioBackground(owner, `sample-${i}`, scene, history));
            assert.ok(!history.slice(0, 3).some((previous) => previous.settingId === background.settingId), "Recent room structures do not repeat");
            assert.match(background.direction, /NEW physical location/);
            assert.match(background.direction, /COMPOSITION:/); assert.match(background.direction, /LIGHTING:/);
            if (scene !== "forbes") assert.doesNotMatch(background.direction, /three-quarter|equal visual weight|40-50%/i);
            for (const shootStyle of Object.keys(types.SHOOT_STYLES)) for (const subjectCount of [1, 2]) for (const styleCount of [0, 1]) {
                const options = { ...types.DEFAULT_OPTIONS, scene, shootStyle, subjectCount, notes: scene === "forbes" ? "Place the person tiny and distant in the room." : "Please zoom in for a close-up." };
                for (const brief of [background, undefined]) {
                    const prompt = generation.portraitPrompt(options, subjectCount, styleCount, brief);
                    assert.match(prompt, /BODY-FIRST CONSTRUCTION/);
                    assert.match(prompt, /7-7.5 crown-to-chin head lengths/);
                    assert.match(prompt, /shoulder span should read around 2.5-3 head widths/);
                    assert.match(prompt, /For a seated person retain those SAME anatomical lengths/);
                    assert.match(prompt, /FINAL COLOR PRIORITY: Deliver a COLOR photograph/);
                    if (scene === "forbes") {
                        assert.match(prompt, /Forbes-inspired business-magazine main portrait/);
                        assert.match(prompt, /no Forbes logo, masthead, cover lines, rankings, award badges/);
                        assert.match(prompt, /roughly 75-85% of frame height/);
                        assert.match(prompt, /14-17% of frame height/);
                        assert.doesNotMatch(prompt, /Use a prominent waist-up|eye-level waist-up|dominant visual subject in a waist-up/);
                        assert.match(prompt, /explicit person-led cover exception/);
                        assert.doesNotMatch(prompt, /approximately 20%|approximately 80%|full standing or seated figure visible/);
                        if (subjectCount === 2) assert.match(prompt, /both people at comparable scale/);
                    } else {
                        assert.match(prompt, /approximately 20% of the total image area \(target 15-25%\); approximately 80%/);
                        assert.match(prompt, /image AREA ratio, NOT 20% of image height/);
                        assert.match(prompt, /full standing or seated figure visible/);
                        assert.match(prompt, /9-10.5% of frame height/);
                        assert.match(prompt, /7-10 metres/);
                        if (subjectCount === 2) assert.match(prompt, /BOTH lawyers COMBINED, not each person separately/);
                        else assert.match(prompt, /The single lawyer, including their clothing/);
                    }
                    assert.doesNotMatch(prompt, /60-75%|35-55%|equal visual weight/);
                    assert.ok(prompt.lastIndexOf("FINAL FRAMING PRIORITY:") > prompt.indexOf(options.notes), "Final scale rule also applies to conflicting user notes");
                    assert.ok(prompt.lastIndexOf("FINAL ANATOMY PRIORITY:") > prompt.lastIndexOf("FINAL FRAMING PRIORITY:"), 'Natural anatomy wins over exact area targets');
                }
            }
            history.unshift(background);
        }
        const a = createStudioBackground(owner, "sample-a", scene), b = createStudioBackground(owner, "sample-b", scene);
        assert.notEqual(a.seed, b.seed); assert.notEqual(a.direction, b.direction, "New requests vary actual scene instructions, not only an ID");
        assert.notEqual(a.seed, createStudioBackground(other, "sample-a", scene).seed, "Different owners do not share a shoot seed");
    }
    const studioPrompt = generation.portraitPrompt({ ...types.DEFAULT_OPTIONS, scene: "studio", shootStyle: "gq" }, 2, 1);
    assert.match(studioPrompt, /GQ-inspired Korean fashion/); assert.match(studioPrompt, /single motivated studio key/); assert.match(studioPrompt, /Preserve their exact facial proportions/);
    assert.match(generation.portraitPrompt({ ...types.DEFAULT_OPTIONS, subjectCount: 2 }, 2, 0), /NEVER blend their faces/);
    assert.throws(() => types.parseOptions({ ...types.DEFAULT_OPTIONS, subjectCount: 3 }));
    assert.throws(() => types.parseFilters({ ...types.FILTER_PRESETS.original.filters, exposure: NaN }));
    assert.throws(() => types.parseFilters({ ...types.FILTER_PRESETS.original.filters, longEdge: 9000 }));
    const head = { kind: "head", x: 0.25, y: 0.1, width: 0.3, height: 0.3, scaleX: 90, scaleY: 90 };
    const bodyRegion = { kind: "body", x: 0.2, y: 0.3, width: 0.5, height: 0.65, scaleX: 95, scaleY: 105 };
    assert.deepEqual(types.parseProportions(undefined), []);
    for (const invalid of [null, {}, Array(5).fill(head), [{ ...head, x: NaN }], [{ ...head, width: 0 }], [{ ...head, x: 0.9 }], [{ ...head, scaleX: 99 }], [{ ...bodyRegion, scaleY: 109 }]]) assert.throws(() => types.parseProportions(invalid));
    assert.strictEqual(await proportions.reshapeStudioPixels(texture, 800, 1000, []), texture, "Legacy photos bypass all geometric processing");
    assert.strictEqual(await proportions.reshapeStudioPixels(texture, 800, 1000, [{ ...head, scaleX: 100, scaleY: 100 }]), texture, "Neutral controls are an exact no-op");
    const warped = await proportions.reshapeStudioPixels(texture, 800, 1000, [head, bodyRegion]);
    assert.notEqual(digest(warped), digest(texture));
    assert.equal(digest(warped), digest(await proportions.reshapeStudioPixels(texture, 800, 1000, [head, bodyRegion])));
    assert.deepEqual(warped.subarray(0, 800 * 3), texture.subarray(0, 800 * 3), "The top boundary stays pixel-identical");
    for (let y = 0; y < 1000; y++) assert.deepEqual(warped.subarray((y * 800 + 780) * 3, (y * 800 + 800) * 3), texture.subarray((y * 800 + 780) * 3, (y * 800 + 800) * 3), "Unselected people/background remain unchanged");
    for (const scale of [85, 115]) {
        let previous = -1;
        for (let i = 0; i <= 1000; i++) { const [x] = proportions.proportionSourcePoint(i / 1000, 0.25, [{ ...head, scaleX: scale, scaleY: scale }]); assert.ok(x > previous, "Restricted scaling does not fold over"); previous = x; }
    }
    assert.deepEqual([...finishing.tonePixels(Uint8Array.from([20, 80, 200]), 1, 1, types.FILTER_PRESETS.original.filters, 7)], [20, 80, 200]);
    const bw = finishing.tonePixels(Uint8Array.from([20, 80, 200]), 1, 1, { ...types.FILTER_PRESETS.original.filters, saturation: 0 }, 7); assert.equal(bw[0], bw[1]); assert.equal(bw[1], bw[2]);
    const f1 = await finishing.finishStudioPhoto(original, types.FILTER_PRESETS.documentary.filters, "a".repeat(64)), f2 = await finishing.finishStudioPhoto(original, types.FILTER_PRESETS.documentary.filters, "a".repeat(64));
    assert.equal(digest(f1), digest(f2)); assert.notEqual(digest(f1), digest(await finishing.finishStudioPhoto(original, types.FILTER_PRESETS.muted.filters, "a".repeat(64))));
    const stats = await sharp(f1).stats(); assert.ok(stats.channels[0].mean < 150, "Film exposure darkens the original"); assert.ok(stats.channels[0].stdev > 1, "Grain is present");
    assert.equal((await route.GET(get({ profileId: owner }, false))).status, 401);
    assert.equal((await route.POST(req(input(), true, "https://evil.example"))).status, 403);
    assert.equal((await generateRoute.POST(req({ profileId: owner, jobId: "a".repeat(64) }, false))).status, 401);
    await assert.rejects(generation.prepareStudioJob({ ...input(), consent: false }));
    await assert.rejects(generation.prepareStudioJob({ ...input(), profileImageIndices: [] }));
    publicBucket = true; await assert.rejects(generation.prepareStudioJob(input())); publicBucket = false;
    const form = new FormData(); form.set("profileId", owner); form.set("role", "style"); form.set("file", new File([original], "reference.png", { type: "image/png" }));
    const reference = await ok(await referenceRoute.POST(new Request("http://localhost/api/admin/lawyer-studio/references", { method: "POST", headers: { cookie }, body: form })));
    await assert.rejects(generation.prepareStudioJob({ ...input(), profileId: other, referenceIds: [reference.referenceId] }), /참고 사진/);
    const request = { ...input(), referenceIds: [reference.referenceId] }, job = await generation.prepareStudioJob(request);
    assert.deepEqual(job.inputs.map(i => i.role), ["body", "identity", "style"]); assert.match(job.prompt, /VISUAL EDITORIAL REFERENCES/); assert.match(job.prompt, /Korean/);
    assert.notEqual(digest(await store.readStudioBytes(job.inputs[1].path)), digest(original), "Identity detail follows the full context instead of setting the initial framing");
    const normalizedSource = await referenceProcessing.normalizeReference(original);
    assert.equal(digest(await store.readStudioBytes(job.inputs[0].path)), digest(normalizedSource), "The first reference supplies actual build without geometric edits");
    assert.equal(digest(await store.readStudioBytes(job.inputs[2].path)), digest(normalizedSource), "Selected style pixels really reach the provider");
    assert.equal(job.referencePolicy, "body-first-references-v3"); assert.equal(job.anatomyPolicy, 'natural-scale-v3'); assert.match(job.prompt, /isolated HEAD CROPS/); assert.ok(job.prompt.includes(job.pose.direction));
    assert.match(job.prompt, /NEW BACKGROUND BRIEF/); assert.match(job.prompt, /PERSON ONLY/);
    assert.match(job.prompt, /Images 1-1: BODY BUILD REFERENCES/);
    assert.match(job.prompt, /Images 2-2: isolated HEAD CROPS/);
    assert.match(job.prompt, /Images 3-3: VISUAL EDITORIAL REFERENCES/);
    assert.doesNotMatch(job.prompt, /No full source portrait or style image is provided|STYLE ATTRIBUTES ONLY/);
    assert.ok(job.prompt.includes(job.background.direction));
    assert.match(job.prompt, /FINAL FRAMING PRIORITY:.*approximately 20%/);
    assert.doesNotMatch(job.prompt, /Korean mid-rise office buildings outside/);
    assert.equal((await generation.prepareStudioJob(request)).id, job.id, "Same request reuses frozen job");
    const beforeFaceCache = faceCalls;
    assert.equal((await previewRoute.POST(req({ ...input(), subjectCount: 1 }, false))).status, 401);
    assert.equal((await previewRoute.POST(req({ ...input(), subjectCount: 1 }, true, "https://evil.example"))).status, 403);
    const facePreview = await ok(await previewRoute.POST(req({ ...request, subjectCount: 1 })));
    assert.equal(facePreview.faces.length, 1); assert.equal(facePreview.styleCount, 1); assert.equal(faceCalls, beforeFaceCache, "Paid preparation and preview reuse free analysis");
    assert.equal(facePreview.bodies.length, 1); assert.equal(facePreview.styles.length, 1);
    assert.equal((await previewRoute.POST(req({ ...request, scene: "toString" }))).status, 400);
    const defaultPreview = await ok(await previewRoute.POST(req({ ...input(), scene: "stairs" })));
    const builtInRefs = await prepareReferences(owner, [0], [], 1, "stairs");
    assert.equal(defaultPreview.styles.length, 2);
    const selectedBuiltIns = stylePack.selectEditorialReferences(owner, "stairs");
    for (const [i, ref] of builtInRefs.inputs.filter(r => r.role === "style").entries()) {
        assert.equal(digest(await store.readStudioBytes(ref.path)), digest(await referenceProcessing.normalizeReference(await stylePack.readEditorialReference(selectedBuiltIns[i].file))));
    }
    const previewQuery = Object.fromEntries(new URL(facePreview.faces[0], "http://localhost").searchParams);
    assert.equal((await assetRoute.GET(get(previewQuery, false))).status, 401);
    assert.equal((await assetRoute.GET(get(previewQuery))).status, 200);
    assert.equal((await assetRoute.GET(get({ ...previewQuery, profileId: other }))).status, 404);
    assert.equal((await assetRoute.GET(get({ ...previewQuery, inputId: "../x" }))).status, 400);
    failFaces = true;
    await assert.rejects(generation.prepareStudioJob({ ...input(), options: { ...types.DEFAULT_OPTIONS, subjectCount: 2 } }), /detection failed/);
    assert.equal(calls, 0, "Failed separation never sends a paid request");
    failFaces = false;
    const pair = await generation.prepareStudioJob({ ...input(), options: { ...types.DEFAULT_OPTIONS, subjectCount: 2 } });
    assert.deepEqual(pair.inputs.map(i => i.role), ["body", "identity", "identity", "style", "style"]);
    assert.match(pair.prompt, /Each consecutive pair/); assert.match(pair.prompt, /SAME TWO distinct lawyers/);
    const cachePath = [...objects.keys()].find((key) => key.includes("reference-analysis") && JSON.parse(objects.get(key)).inputs.length === 3);
    const validCache = objects.get(cachePath); objects.set(cachePath, JSON.stringify({ inputs: [], style: "" }));
    await assert.rejects(prepareReferences(owner, [0], [], 2), /캐시/); objects.set(cachePath, validCache);
    await assert.rejects(generation.prepareStudioJob({ ...request, options: { ...types.DEFAULT_OPTIONS, scene: "stairs" } }), /설정/);
    assert.equal((await assetRoute.GET(get({ profileId: other, referenceId: reference.referenceId }))).status, 404);
    assert.equal((await generateRoute.POST(req({ profileId: other, jobId: job.id }))).status, 404);
    assert.equal(calls, 0);
    failedPath = "/renders/";
    await assert.rejects(generation.generateStudioPhoto(owner, job.id), /저장/); assert.equal(calls, 1);
    failedPath = "";
    const generated = await generation.generateStudioPhoto(owner, job.id); assert.equal(calls, 1, "Storage failure recovers paid response without a model call");
    assert.equal(lastForm.get("model"), types.STUDIO_MODEL); assert.equal(lastForm.get("quality"), "xhigh"); assert.equal(lastForm.get("size"), "1536x1920"); assert.equal(lastForm.get("n"), "1"); assert.equal(lastForm.getAll("image[]").length, 3);
    for (const [i, file] of lastForm.getAll("image[]").entries()) {
        assert.equal(file.name, `${i + 1}-${job.inputs[i].role}.png`);
        assert.equal(digest(Buffer.from(await file.arrayBuffer())), digest(await store.readStudioBytes(job.inputs[i].path)));
    }
    assert.equal(generated.asset.proportions, undefined, "Undetected anatomy is never auto-warped");
    assert.equal(generated.asset.headBalancePolicy, 'gentle-head-balance-v2');
    const colorStats = await sharp(await store.readStudioBytes(generated.asset.renderedPath)).stats();
    assert.ok(Math.abs(colorStats.channels[0].mean - colorStats.channels[2].mean) > 15, "New output retains visible color");
    assert.equal(generated.asset.status, "draft"); assert.equal(generated.asset.usage.total_tokens, 123);
    assert.equal(generated.asset.anatomyPolicy, 'natural-scale-v3');
    assert.equal(generated.asset.framingReview.state, 'unmeasured', 'A free size warning never discards a paid result');
    assert.deepEqual(generated.asset.background, job.background); assert.equal(lastForm.get("prompt"), job.prompt);
    assert.deepEqual(generated.asset.pose, job.pose); assert.equal(generated.asset.referencePolicy, job.referencePolicy);
    assert.equal(digest(await store.readStudioBytes(generated.asset.originalPath)), digest(original), "Provider original is preserved byte for byte");
    await generation.generateStudioPhoto(owner, job.id); assert.equal(calls, 1);
    const secondJob = await generation.prepareStudioJob({ ...input(), options: { ...types.DEFAULT_OPTIONS, scene: "forbes" } }), second = await generation.generateStudioPhoto(owner, secondJob.id); assert.equal(calls, 2);
    assert.equal(second.asset.scene, "forbes"); assert.equal(lastForm.get("prompt"), secondJob.prompt);
    assert.match(lastForm.get("prompt"), /person-led cover exception/);
    assert.doesNotMatch(lastForm.get("prompt"), /approximately 20%/);
    assert.notEqual(secondJob.background.settingId, job.background.settingId);
    assert.notEqual(secondJob.prompt, job.prompt);
    assert.deepEqual((await generation.prepareStudioJob(request)).background, job.background, "Recovery keeps the original background after history changes");
    const legacyRequest = input(), legacyJob = await generation.prepareStudioJob(legacyRequest);
    delete legacyJob.background; delete legacyJob.pose; delete legacyJob.referencePolicy; delete legacyJob.styleDirection; delete legacyJob.anatomyPolicy; delete legacyJob.headBalancePolicy;
    legacyJob.inputs.push({ role: "style", path: reference.library.references[0].path }); legacyJob.prompt = "Saved legacy portrait prompt";
    objects.set(`lawyer-studio/${owner}/jobs/${legacyJob.id}.json`, JSON.stringify(legacyJob));
    assert.deepEqual(await generation.prepareStudioJob(legacyRequest), legacyJob, "Existing frozen jobs are not re-briefed or migrated");
    const forbesRequest = { ...input(), options: { ...types.DEFAULT_OPTIONS, scene: "forbes" } };
    const forbesJob = await generation.prepareStudioJob(forbesRequest);
    assert.equal(forbesJob.background.scene, "forbes");
    assert.match(forbesJob.prompt, /person-led cover exception/);
    assert.doesNotMatch(forbesJob.prompt, /approximately 20%/);
    assert.deepEqual(await generation.prepareStudioJob(forbesRequest), forbesJob, "Forbes jobs freeze their own composition for recovery");
    let library = await store.loadStudioLibrary(owner);
    const change = async (body) => { const data = await ok(await route.POST(req({ profileId: owner, revision: library.revision, ...body }))); library = data.library; return data; };
    assert.equal((await route.POST(req({ profileId: owner, revision: library.revision, action: "status", assetId: job.id, status: "approved" }))).status, 400);
    await change({ action: "status", assetId: job.id, status: "approved", approvalConfirmed: true });
    await change({ action: "blog", enabled: true });
    const single = await blog.editorialStudioPhoto(owner, "single-approved");
    assert.equal(single.selections.length, 1);
    assert.equal(single.selections[0].assetId, job.id);
    assert.deepEqual((await blog.editorialStudioPhoto(owner, "single-approved", "contact")).selections, single.selections);
    assert.equal(digest(single.bytes), digest(await store.readStudioBytes(library.assets.find(a=>a.id===job.id).renderedPath)), "The approved finish is used, not the sharper original");
    assert.throws(()=>blog.selectStudioPhotos(library,"legacy"), /2장/, "Old four-card plans still need two distinct photos");
    await change({ action: "status", assetId: second.asset.id, status: "approved", approvalConfirmed: true });
    await change({ action: "blog", enabled: true });
    const selection = blog.selectStudioPhotos(library, "article"); assert.deepEqual(selection, blog.selectStudioPhotos(library, "article")); assert.notEqual(selection[0].assetId, selection[1].assetId);
    assert.notEqual((await blog.editorialStudioPhoto(owner, "edition", "info")).selections[0].assetId, (await blog.editorialStudioPhoto(owner, "edition", "contact")).selections[0].assetId);
    await assert.rejects(blog.resolveStudioPhotos(other, selection));
    const body = "상담 전에 계약서와 거래 내역을 정리합니다.\n\n질문은 미리 정리해주세요.";
    const plan = validateVisualPlan({ version: "visual-plan-v11", sourceHash: sourceHash("자료", body), setFormat: types.STUDIO_FORMAT, studioPhotos: selection, publicationEdition: "fixture", question: "어떤 자료?", thesis: "자료 정리", cards: [{ type: "thumbnail", heading: "자료 정리", purpose: "자료", deck: "", evidence: [{ paragraphId: "p1", quote: "상담 전에 계약서와 거래 내역을 정리합니다." }], afterParagraphId: "p1", art: { medium: "photograph", subject: "자료", scene: "서류 정리", message: "확인", avoid: [] } }, { type: "illustration" }, { type: "info" }, { type: "contact" }] }, "자료", body);
    assert.equal(cardTypesFor(plan).length, 4); assert.equal(plan.cards[1].art, undefined); assert.equal(plan.cards[2].infographic, undefined);
    const profile = { id: owner, lawyerName: "김정웅", officeName: "법률사무소", phone: "062-223-7877", website: "", profileImages: [] };
    for (const type of ["illustration", "info", "contact"]) { const card = await blog.renderStudioBlogCard({ profile, plan, card: plan.cards.find((c) => c.type === type) }); assert.equal(card.layoutChecks.passed, true); assert.equal(card.aiGenerated, true); if (type === "contact") assert.equal(card.contactActions[0].href, "tel:0622237877"); }
    assert.equal(calls, 2, "Approved blog portraits and CTA do not call an image model");
    const rendered = await renderRoute.POST(req({ profileId: owner, assetId: job.id, filters: types.FILTER_PRESETS.muted.filters })); assert.equal(rendered.status, 200); assert.equal(rendered.headers.get("content-type"), "image/jpeg"); assert.equal(calls, 2);
    assert.equal((await route.POST(req({ profileId: owner, assetId: job.id, revision: library.revision - 1, action: "save", filters: types.FILTER_PRESETS.muted.filters }))).status, 409);
    await change({ action: "save", assetId: job.id, filters: types.FILTER_PRESETS.muted.filters });
    assert.equal(library.assets.find((a) => a.id === job.id).status, "draft"); assert.equal(library.blogEnabled, true, "The other approved photo remains usable");
    await assert.rejects(blog.resolveStudioPhotos(owner, selection));
    assert.equal((await assetRoute.GET(get({ profileId: owner, assetId: job.id, version: "1" }))).status, 409);
    assert.equal((await assetRoute.GET(get({ profileId: other, assetId: job.id }))).status, 404);
    assert.equal((await assetRoute.GET(get({ profileId: owner, assetId: job.id, version: "2", download: "1" }))).headers.get("content-type"), "image/jpeg");
    await change({ action: "status", assetId: job.id, status: "approved", approvalConfirmed: true });
    await change({ action: "blog", enabled: true });
    const beforeProportions = calls;
    const invalidProportionRender = await renderRoute.POST(req({ profileId: owner, assetId: job.id, filters: types.FILTER_PRESETS.muted.filters, proportions: [{ ...head, scaleX: 1 }] })); assert.equal(invalidProportionRender.status, 400);
    await change({ action: "save", assetId: job.id, filters: types.FILTER_PRESETS.muted.filters, proportions: [head, bodyRegion] });
    let reshapedAsset = library.assets.find((a) => a.id === job.id);
    assert.deepEqual(reshapedAsset.proportions, [head, bodyRegion]); assert.equal(reshapedAsset.status, "draft"); assert.equal(library.blogEnabled, true); assert.equal(reshapedAsset.version, 3);
    assert.equal(digest(await store.readStudioBytes(reshapedAsset.originalPath)), digest(original));
    const implicit = await renderRoute.POST(req({ profileId: owner, assetId: job.id, filters: types.FILTER_PRESETS.muted.filters }));
    const explicit = await renderRoute.POST(req({ profileId: owner, assetId: job.id, filters: types.FILTER_PRESETS.muted.filters, proportions: [head, bodyRegion] }));
    assert.equal(digest(Buffer.from(await implicit.arrayBuffer())), digest(Buffer.from(await explicit.arrayBuffer())), "Old clients preserve saved proportions");
    await change({ action: "save", assetId: job.id, filters: types.FILTER_PRESETS.muted.filters });
    reshapedAsset = library.assets.find((a) => a.id === job.id); assert.deepEqual(reshapedAsset.proportions, [head, bodyRegion]); assert.equal(reshapedAsset.version, 3);
    await change({ action: "save", assetId: job.id, filters: types.FILTER_PRESETS.muted.filters, proportions: [] });
    const resetAsset = library.assets.find((a) => a.id === job.id);
    assert.equal(digest(await store.readStudioBytes(resetAsset.renderedPath)), digest(await finishing.finishStudioPhoto(original, types.FILTER_PRESETS.muted.filters, job.id)), "Reset reproduces the pre-reshape rendering");
    assert.equal(calls, beforeProportions, "Reshaping and restoration never use a paid model");
    await change({ action: "status", assetId: second.asset.id, status: "rejected" });
    assert.equal(library.blogEnabled, false, "Linking turns off when the last approval is removed");
    await assert.rejects(blog.editorialStudioPhoto(owner, "edition"), error => error.code === "studio_approval_required");
    assert.equal(await blog.editorialStudioPhoto(owner, "edition", "contact"), undefined, "Only contact may use registered fallback");
    for (const mode of ["lost", "rejected"]) { providerMode = mode; const j = await generation.prepareStudioJob(input()); const before = calls; await assert.rejects(generation.generateStudioPhoto(owner, j.id)); await assert.rejects(generation.generateStudioPhoto(owner, j.id)); assert.equal(calls, before + 1, "Uncertain/rejected paid requests never retry dispatch"); }
    providerMode = 'success';
    const analyze = anatomy.analyzeStudioAnatomy;
    anatomy.analyzeStudioAnatomy = async () => ({ review: anatomy.reviewFaceScale([0.0833], 1, false), proportions: balance });
    const balancedJob = await generation.prepareStudioJob(input()), countBeforeBalance = calls;
    assert.equal(balancedJob.headBalancePolicy, 'gentle-head-balance-v2');
    const balancedAsset = (await generation.generateStudioPhoto(owner, balancedJob.id)).asset;
    anatomy.analyzeStudioAnatomy = analyze;
    assert.deepEqual(balancedAsset.proportions, balance); assert.equal(balancedAsset.status, 'draft');
    assert.equal(digest(await store.readStudioBytes(balancedAsset.originalPath)), digest(original), 'Automatic balance preserves the paid original');
    assert.equal(digest(await store.readStudioBytes(balancedAsset.renderedPath)), digest(await finishing.finishStudioPhoto(original, balancedJob.filters, balancedJob.id, false, balance)));
    await generation.generateStudioPhoto(owner, balancedJob.id);
    assert.equal(calls, countBeforeBalance + 1, 'Initial balancing and recovery never add a model call');
    const beforeBatch = calls, batchInput = { ...input(), count: 5, options: { ...types.DEFAULT_OPTIONS, scene: "forbes", shootStyle: "gq" } };
    assert.equal((await batchRoute.POST(req(batchInput, false))).status, 401);
    assert.equal((await batchRoute.POST(req(batchInput, true, "https://untrusted.invalid"))).status, 403);
    assert.equal((await batchRoute.POST(req({ ...batchInput, count: 1 }))).status, 400);
    assert.equal((await batchRoute.POST(req({ ...batchInput, paidConfirmed: false }))).status, 400);
    const beforeAssets = structuredClone((await store.loadStudioLibrary(owner)).assets);
    const batch = (await ok(await batchRoute.POST(req(batchInput)))).batch;
    assert.equal(batch.shots.length, 5); assert.equal(batch.shots[0].scene, "forbes");
    for (const key of ["jobId", "scene"]) assert.equal(new Set(batch.shots.map(s => s[key])).size, 5);
    assert.equal(new Set(batch.shots.map(s => s.background.settingId)).size, 5);
    assert.equal(new Set(batch.shots.map(s => s.pose.compositionId)).size, 5);
    assert.equal(new Set(batch.shots.map(s => s.pose.cameraId)).size, 5);
    for (const shot of batch.shots) {
        const frozen = await store.loadStudioJob(owner, shot.jobId);
        assert.deepEqual(frozen.pose, shot.pose); assert.deepEqual(frozen.background, shot.background);
        assert.equal(frozen.options.scene, shot.scene); assert.equal(frozen.options.shootStyle, "gq");
        assert.equal(frozen.headBalancePolicy, "gentle-head-balance-v2");
        assert.match(frozen.prompt, /FINAL COLOR PRIORITY: Deliver a COLOR photograph/);
        assert.ok(frozen.prompt.includes(shot.pose.direction));
    }
    assert.equal(calls, beforeBatch, "Preparing all five sets of real reference inputs is free");
    assert.deepEqual((await ok(await batchRoute.POST(req(batchInput)))).batch, batch);
    assert.equal((await batchRoute.POST(req({ ...batchInput, options: { ...batchInput.options, quality: "max" } }))).status, 409);
    assert.equal((await batchRoute.POST(req({ profileId: other, batchId: batch.id }))).status, 404);
    assert.equal((await ok(await batchRoute.GET(get({ profileId: owner })))).batches.length, 1);
    for (const [i, shot] of batch.shots.entries()) {
        if (i === 2) {
            failedPath = "/renders/";
            assert.equal((await generateRoute.POST(req({ profileId: owner, jobId: shot.jobId }))).status, 503);
            failedPath = "";
            assert.deepEqual(await batches.prepareStudioBatch({ profileId: owner, batchId: batch.id }), batch);
        }
        const result = await ok(await generateRoute.POST(req({ profileId: owner, jobId: shot.jobId })));
        assert.equal(result.asset.status, "draft");
        assert.equal(calls, beforeBatch + i + 1, "One model call per shot, including saved-response recovery");
    }
    for (const shot of batch.shots) await generation.generateStudioPhoto(owner, shot.jobId);
    assert.equal(calls, beforeBatch + 5, "Reopening a finished set cannot generate another five images");
    const afterBatchLibrary = await store.loadStudioLibrary(owner);
    assert.deepEqual(afterBatchLibrary.assets.filter(a => !batch.shots.some(s => s.jobId === a.id)), beforeAssets, "Prior photos and approvals are unchanged");
    assert.equal(afterBatchLibrary.blogEnabled, false);
    const failedPreparation = { ...input(), count: 5 };
    failedPath = "/jobs/";
    assert.equal((await batchRoute.POST(req(failedPreparation))).status, 503);
    failedPath = "";
    const recoveredBatch = (await ok(await batchRoute.POST(req(failedPreparation)))).batch;
    assert.equal(recoveredBatch.shots.length, 5); assert.equal(calls, beforeBatch + 5);
    for (const scene of Object.keys(types.SCENES)) {
        assert.equal(types.studioSetScenes(scene)[0], scene);
        assert.equal(new Set(types.studioSetScenes(scene)).size, 5);
    }
    console.log("PASS five-shot sets: distinct scenes/cameras/compositions, frozen prompts, explicit five-call consent, free preparation recovery, one call per image, preserved approvals and owner isolation.");
    console.log("PASS studio: auth, CSRF, owner isolation, reference snapshots, model payload, immutable originals, bounded initial head balance, deterministic finishing, approval/version conflicts, four-card rendering and paid retry protection.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
