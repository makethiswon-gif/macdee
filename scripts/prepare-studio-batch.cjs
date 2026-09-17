// Prepare an immutable, reviewable shot list. This command never generates or bills.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const folder = path.resolve("tmp/lawyer-studio-batch-20260911"), target = path.join(folder, "manifest.json");
if (fs.existsSync(target)) { console.log("Existing batch preserved: " + target); process.exit(0); }
const profiles = JSON.parse(fs.readFileSync(path.join(folder, "profiles.json"), "utf8"));
const owners = [
    { id: "mqaaoypk621p6", name: "김정웅", indices: [1, 2], notes: "Keep the actual round eyeglasses, short black hairstyle, face shape and age. No younger substitute." },
    { id: "mse8rx0bkl9f0", name: "양영희", indices: [0], notes: "Retain the mature male lawyer's silver-gray hair, actual age, mature facial features and natural skin. Do not de-age or make the hair black." },
    { id: "mmlg8fcm9bdgl", name: "이지은", indices: [0, 1, 3], notes: "Retain the female lawyer's short warm-brown bob, face shape and natural mature features. Modest sharply tailored professional clothing, no beauty retouching." },
    { id: "mmlk8qh6gqq9l", name: "유지은", indices: [3, 4, 9], notes: "Retain the female lawyer's short dark hair, distinctive smile and facial proportions. Professional understated styling, no younger fashion-model face." },
    { id: "mrvn35u3cxprq", name: "정음", indices: [0, 1], subjectCount: 2, notes: "Both of the referenced lawyers together: the man with rectangular black glasses and the woman with long dark hair. Treat each as a separate identity. Equal professional presence, non-romantic interaction, clear separation of bodies and hands." },
    { id: "mmkfnvun052ja", name: "이정도", indices: [2, 1], notes: "Keep the lawyer's slim oval face, round metal glasses, short black hair and actual age. No face averaging with other lawyers." },
];
const shots = [
    { key: "window", label: "창가 · 관찰형 화보", scene: "window", wardrobe: "shirt", shootStyle: "editorial", notes: "A quiet pause at the window, looking slightly off-camera. Camera at seated eye level from across the room. Strong architectural window shadows, realistic Korean city context. Natural hands resting separately." },
    { key: "desk", label: "업무 공간 · 서류 검토", scene: "desk", wardrobe: "suit", shootStyle: "editorial", notes: "A three-quarter angle while checking a few blank pages at a simple desk. Observational, not staged toward the camera. Keep both hands legible. Use a modest Korean office interior with rich dark tones and a believable lamp." },
    { key: "studio-gq", label: "스튜디오 · GQ 패션화보", scene: "studio", wardrobe: "suit", shootStyle: "gq", notes: "A sculptural seated pose on a simple dark stool or chair. Body turned 30 degrees, head naturally toward camera, relaxed shoulders, hands resting separately. Charcoal seamless wall, soft side key, controlled deep shadows. Understated high-end tailoring, no props or decorative sets." },
    { key: "architecture-gq", label: "건축 · GQ 패션화보", scene: "stairs", wardrobe: "knit", shootStyle: "gq", notes: "A standing or gently leaning architectural portrait on a Korean building stair landing. Camera slightly below eye level, straight verticals, one hand on the railing, clean negative space. Fashion-editorial geometry without a theatrical pose. The wall and space should feel real, not a computer-rendered set." },
];
const manifest = { id: "studio-20260911-editorial-v1", createdAt: new Date().toISOString(), model: "gpt-image-2.5-sunburst-2026-09-08", quality: "max", count: owners.length * shots.length, state: "awaiting-preview-approval", styleReference: "F:/캡쳐/51ee8490bb7cf046d4b7dc926b58fcc3.jpg", owners: [], jobs: [] };
for (const owner of owners) {
    const profile = profiles.find((p) => p.id === owner.id);
    if (!profile || !owner.indices.every((i) => profile.photos.some((p) => p.index === i))) throw new Error("Missing inspected reference for " + owner.name);
    manifest.owners.push({ ...owner, office: profile.office });
    for (const shot of shots) manifest.jobs.push({ profileId: owner.id, name: owner.name, label: shot.label, key: shot.key, requestId: crypto.randomUUID(), profileImageIndices: owner.indices,
        useStyleReference: ["window", "desk"].includes(shot.key), referenceIds: [],
        options: { scene: shot.scene, wardrobe: shot.wardrobe, mood: "monochrome", quality: "max", shootStyle: shot.shootStyle, subjectCount: owner.subjectCount || 1, notes: owner.notes + " " + shot.notes }, state: "prepared-locally" });
}
fs.writeFileSync(target, JSON.stringify(manifest, null, 2), { flag: "wx" });
console.log(`${manifest.count} shots prepared without billing: ${target}`);
