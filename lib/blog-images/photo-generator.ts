import type { BlogImageQuality } from "./card-types";

// Official model and Images API verified 2026-09-06. Scoped to blog insertion cards.
export const BLOG_PHOTO_MODEL = "gpt-image-2";

export function editorialPhotoPrompt(content: string, title: string): string {
    const source = `${title} ${content.slice(0, 3000)}`;
    const scenes: [RegExp, string][] = [
        [/임대|전세|보증금|부동산|명도/, "An ordinary lived-in Korean apartment entryway, house keys resting on a small wooden shelf, shoes below, a sliver of the empty room visible. No luxury staging."],
        [/교통|음주운전|자동차|보험/, "A parked compact car in an ordinary Korean residential parking area after rain, muted pavement and overcast daylight, no collision or damage."],
        [/이혼|양육|면접교섭|상간/, "An empty everyday apartment dining table beside a window, two slightly mismatched ceramic cups and a closed notebook, understated surroundings without symbolic broken objects."],
        [/상속|유언|유류분/, "A well-used wooden sideboard in an ordinary home, an unmarked closed archive box and old keys, quiet natural daylight, no photographs of people."],
        [/근로|해고|퇴직|산재|노동|임금/, "An empty small office at the end of a working day, one chair, a closed laptop and an ordinary work bag, everyday materials, no dramatic sunset."],
        [/의료|수술|진료|병원/, "A modest empty clinic waiting area with neutral chairs and a frosted window, no visible signs, ordinary ambient daylight, clean but not pristine or futuristic."],
        [/형사|고소|경찰|수사|피의|폭행|사기/, "An everyday desk at home with one closed manila folder and a plain sealed envelope, a pen slightly off centre, realistic paper texture, no official emblems or readable documents."],
    ];
    const scene = scenes.find(([match]) => match.test(source))?.[1]
        || "An empty modest consultation room, a pale wooden table and two ordinary chairs by a window, everyday office surroundings without decorations or staged props.";
    return `Create one editorial reference photograph for a Korean legal blog. ${scene}
An illustrative fictional scene, not a photograph of a real client, lawyer, office or incident.
Natural perspective, believable scale and materials, restrained neutral colours, subtle wear, soft ambient daylight. Show the surroundings as well as the subject. Landscape 3:2 composition; keep the main subject understandable when lightly cropped.
Avoid stock-ad perfection, cinematic lighting, excessive blur, glossy 3D renders, vector illustrations, gradients, dramatic symbolism and floating objects.
No people, faces, hands, body parts, gavel, justice scales, statues, court seals, logos, watermarks, text, letters or numbers. No fake legal forms. Fully present opaque backdrop, never an isolated cut-out or transparent background.
Do not add a title or graphic layout: Korean text is typeset separately by the application.`;
}

export async function generateEditorialPhoto(content: string, title: string, quality: BlogImageQuality = "high"): Promise<Buffer> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("GPT Image 2를 사용하려면 서버에 OPENAI_API_KEY 설정이 필요합니다.");
    let res: Response;
    try {
        res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            signal: AbortSignal.timeout(135_000),
            body: JSON.stringify({ model: BLOG_PHOTO_MODEL, prompt: editorialPhotoPrompt(content, title),
                n: 1, size: "1536x1024", quality, background: "opaque", output_format: "png" }),
        });
    } catch {
        // An automatic retry after an ambiguous timeout may bill twice.
        throw new Error("사진 생성 응답이 지연되거나 연결이 끊겼습니다. 자동 재요청하지 않았습니다. 잠시 후 사진 카드만 다시 시도해 주세요.");
    }
    if (!res.ok) {
        console.error("[BlogEditorialPhoto] upstream status", res.status);
        if (res.status === 401 || res.status === 403) throw new Error("OpenAI API 키 또는 GPT Image 2 이용 권한을 확인해 주세요.");
        if (res.status === 429) throw new Error("OpenAI 사용 한도 또는 요청 속도 제한입니다. 잠시 후 사진 카드만 다시 시도해 주세요.");
        throw new Error(`GPT Image 2 사진 생성에 실패했습니다 (${res.status}). 빈 배경으로 대체하지 않았습니다.`);
    }
    const data = await res.json();
    const b64: unknown = data.data?.[0]?.b64_json;
    if (typeof b64 !== "string" || !b64.length || b64.length > 30_000_000) throw new Error("사진 모델에서 정상적인 이미지 파일을 받지 못했습니다.");
    return Buffer.from(b64, "base64");
}
