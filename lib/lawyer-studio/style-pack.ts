import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { StudioError, type StudioOptions } from "./types";

// User-supplied art direction. Kept outside public/ and served only through authenticated snapshots.
export const EDITORIAL_REFERENCES = {
    window: { file: "b01a4f847fa6ce1731ae51527ff502ed.jpg", direction: "Directional window daylight, diagonal shadows, warm wood against cooler city glass; a relaxed standing figure grounded in architectural space." },
    architecture: { file: "cc3bfdcda836423db7dfc9f0e755a063.jpg", direction: "Large quiet architectural planes, generous negative space, asymmetrical figure placement, matte gray surfaces and a restrained distinct clothing color." },
    stairs: { file: "df1b886b186dfefc45fd9d8e0d9b6406.jpg", direction: "Diagonal rail and stair geometry, layered white planes, soft directional daylight and an unforced pause within the architecture." },
    office: { file: "f2887dab72869ae41969eb0d72017b60.jpg", direction: "Tall cool daylight windows, a seated working figure and layered desk foreground, restrained suit color, observational rather than corporate-advertising light." },
    work: { file: "dc630d2746c6955633d6e6b1e5d306df.jpg", direction: "Tactile wood and cotton, lateral daylight, a working gesture with believable shoulders and arms; natural warm materials balanced by cool shadows." },
    night: { file: "472ce55bfaf249c85c88b70f5a0403ec.jpg", direction: "A wide workroom with small human presence, readable shadow structure, sparse highlights, tactile film texture. Borrow luminance structure, not the literal black-and-white treatment." },
    lounge: { file: "51ee8490bb7cf046d4b7dc926b58fcc3.jpg", direction: "Deep office space, window grids, hard daylight across floor and furniture, dense blacks with readable faces and subtle film texture. Borrow luminance structure, not monochrome or the number of people." },
    seated: { file: "5996de124c9e585ebd6156592192a9f5.jpg", direction: "Cool blue-gray daylight, a full seated gesture, quiet negative space and a restrained soft foreground edge, gentle tonal transitions and real fabric texture." },
    depth: { file: "c39f10206536fb2765c0a6ea51455cdb.jpg", direction: "Layered foreground framing, a clear subject within receding architecture, muted steel and natural skin color. Use an architectural foreground edge instead of copying the crowd or elevator scene." },
    portrait: { file: "e21c98ccd4649d340dbc813360122c7f.jpg", direction: "Unretouched skin texture, motivated side light, warm practical light against cool neutral shadows and a thoughtful moment. Adapt the close-up to the selected framing rather than copying the face or pose." },
} as const;
type ReferenceId = keyof typeof EDITORIAL_REFERENCES;
const SCENE_REFERENCES: Record<StudioOptions["scene"], readonly ReferenceId[]> = {
    window: ["window", "office"], desk: ["work", "office", "night"], stairs: ["stairs", "architecture"],
    lounge: ["seated", "lounge", "depth"], studio: ["seated", "architecture", "portrait"], forbes: ["portrait", "architecture", "work"],
};

export function selectEditorialReferences(profileId: string, scene: StudioOptions["scene"]) {
    const pool = SCENE_REFERENCES[scene];
    const index = createHash("sha256").update(`editorial-pack-v1:${profileId}:${scene}`).digest().readUInt32BE(0) % pool.length;
    return [pool[index], pool[(index + 1) % pool.length]].map((id) => ({ id, ...EDITORIAL_REFERENCES[id] }));
}

export async function readEditorialReference(file: string) {
    if (!Object.values(EDITORIAL_REFERENCES).some((ref) => ref.file === file)) throw new StudioError("화보 참고 사진을 확인해주세요.");
    try { return await readFile(path.join(process.cwd(), "lib/lawyer-studio/style-references", file)); }
    catch { throw new StudioError("화보 참고 사진을 불러오지 못했습니다. 유료 생성 전 중단했습니다.", 503); }
}
