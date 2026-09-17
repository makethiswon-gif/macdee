import { createHash } from "node:crypto";
import type { StudioBackground, StudioOptions } from "./types";

type Setting = readonly [id: string, label: string, direction: string];
const SETTINGS: Record<StudioOptions["scene"], readonly Setting[]> = {
    window: [
        ["courtyard", "중정 · 깊은 창", "A low-rise Korean courtyard room: deep narrow window reveals, rough pale masonry, a gravel courtyard outside and a built-in bench. No skyline."],
        ["ribbon", "수평창 · 낮은 지붕", "A long horizontal ribbon window above low Korean neighborhood rooftops, a maple bench and restrained plaster walls. No floor-to-ceiling grid glazing."],
        ["reeded", "요철 유리 · 확산광", "A corner alcove of reeded translucent glass with metal framing, matte terrazzo floor and one unupholstered chair. The exterior is not visible."],
        ["lightwell", "높은 창 · 콘크리트", "A double-height concrete room beside a tall recessed lightwell window. Strong vertical void, raw construction texture, a narrow timber ledge; no city view."],
        ["brick", "벽돌 · 깊은 창턱", "A renovated Korean brick building, a single deep-set square window and a broad stone sill, exposed ceiling beam and a woven chair. No corporate office furniture."],
        ["river", "강변 · 넓은 개구부", "A modest Korean riverside meeting alcove: one broad unsegmented opening, low parapet, distant riverside paths and a simple flat bench. No landmark or tower skyline."],
        ["screens", "가동 스크린 · 창가", "A contemporary Korean interior with sliding perforated metal sun screens across a wide window, shallow wall niches and a concrete ledge. Avoid a conventional window-grid office."],
        ["curtain", "얇은 커튼 · 목재", "A quiet Korean upper-floor room with tall linen curtains, a narrow oak-framed opening and pale timber floor; layered translucent fabric is the main background geometry."],
    ],
    desk: [
        ["maple", "메이플 테이블 · 회벽", "A long pale maple worktable crossing an off-white lime-plaster room, exposed ceiling joists and a bare wall. No bookshelves, desk lamp or skyline."],
        ["archive", "자료실 · 수납장", "A compact Korean archive workroom with waist-high flat-file cabinets, a small rectangular writing table and a high clerestory strip. Closed plain cabinets, no certificates or readable labels."],
        ["glass", "원형 테이블 · 유리 파티션", "A circular dark meeting table inside a translucent glass-partitioned room, metal uprights and a pale terrazzo floor. No executive desk or bookcase."],
        ["timber", "긴 테이블 · 목재 패널", "A narrow Korean meeting room with vertical timber panels, an elongated oval table and a single recessed side opening. Low-key intimate scale, no window skyline."],
        ["steel", "스틸 작업대 · 콘크리트", "A simple brushed-steel worktable in a repurposed Korean concrete studio, exposed lintel and acoustic wall strips. Keep papers minimal, no engineering plans or industrial machinery."],
        ["freestanding", "독립 책상 · 넓은 벽", "A freestanding compact writing desk seen diagonally in a spacious room with an uninterrupted matte wall and a narrow door opening well behind the subject. No shelves or city view."],
        ["terrazzo", "낮은 천장 · 테라조", "An intimate low-ceiling Korean consultation room, a square table with rounded corners, terrazzo wainscot and a curtain divider. No other people or identifying client material."],
        ["coffer", "미팅룸 · 격자 천장", "A restrained Korean meeting room with deep ceiling coffers, an offset rectangular table and three unoccupied simple chairs receding behind. Background defined by ceiling rhythm, not a bookshelf."],
    ],
    stairs: [
        ["curved", "곡선 계단 · 회벽", "A curved plaster stair in a plausible contemporary Korean cultural building, a continuous solid balustrade and a high rooflight. No steel handrail or tower-window backdrop."],
        ["brick", "벽돌 · 철제 계단", "An indoor steel stair landing in a renovated Korean brick building, dark perforated treads and exposed brick piers. Restrained real architecture, not a Western fire escape."],
        ["concrete", "노출 콘크리트 · 계단실", "A raw concrete dog-leg stairwell with a deep overhead lightwell and thick solid concrete parapet. Generous geometry, no office skyline or slim silver railing."],
        ["courtyard", "야외 석재 · 중정 계단", "A low Korean courtyard staircase of rough stone with a broad masonry wall and subdued urban planting beyond. Ordinary contemporary scale, no palace or foreign monumental steps."],
        ["mesh", "메시 난간 · 복층", "An interior mezzanine landing with expanded-metal mesh balustrade, layered structural uprights and a distant sawtooth roof. A renovated Korean workspace, not a factory scene."],
        ["terrazzo", "넓은 테라조 · 계단", "Wide shallow terrazzo stairs in a Korean civic-style interior, offset landings and a thick plaster sidewall. Frame the broad horizontal stair rhythm; no glass grid."],
        ["timber", "목재 벽 · 판형 난간", "A compact architectural stair with vertical timber wall lining, a matte solid metal balustrade and a slit skylight. Background surfaces feel constructed and tactile."],
        ["gallery", "슬릿 창 · 계단 갤러리", "A Korean contemporary gallery stair landing with staggered wall openings, a wide flat ledge and a single narrow light slot. No artworks, signs, conventional office window or chrome handrail."],
    ],
    lounge: [
        ["alcove", "곡면 벽 · 패브릭 체어", "A curved plaster alcove, one low wool-upholstered armchair and an inset circular side table in a modest Korean office lounge. No city window or bookshelf."],
        ["sunken", "낮은 벤치 · 목재 라운지", "A shallow sunken seating area with timber-clad walls, a broad built-in bench and a high horizontal opening; contemporary Korean architecture, quiet human scale."],
        ["glass", "리넨 체어 · 반투명 유리", "Two upright linen chairs with ample separation beside a tall etched-glass partition, a thin black side table and pale stone floor. Only the referenced subjects are present."],
        ["concrete", "노출 콘크리트 · 각진 소파", "A raw concrete lounge with a slatted ceiling and an angular fabric sofa set perpendicular to a long blank wall. No view through a gridded window."],
        ["court", "벽돌 중정 · 코너 좌석", "A low-rise Korean brick courtyard vestibule with a corner seat, a cork side table and a deep shaded doorway. No rooftop skyline or executive-office decor."],
        ["tile", "타일 벽 · 긴 벤치", "An understated Korean entrance lounge with a long padded bench against vertically stacked matte ceramic tiles and a shallow architrave. No hotel luxury styling."],
        ["paper", "종이 질감 · 커튼 라운지", "A quiet Korean reading lounge with paper-textured acoustic panels, a soft fabric divider and a timber-frame chair. Keep it book-free and free of stereotyped traditional props."],
        ["colonnade", "기둥 · 긴 가죽 벤치", "A long narrow Korean office colonnade with a dark leather bench, repeated square piers and indirect side daylight. Frame the receding columns, no visible clients or city view."],
    ],
    studio: [
        ["cove", "넓은 호리존 · 그림자", "A real Korean photography studio with a broad off-white cyclorama sweep and one low rectangular plinth. Visible floor-to-wall curve, expansive empty space, no office furnishings."],
        ["blackflat", "검은 플랫 · 수직 패널", "A matte black studio with one tall off-white flat set perpendicular to the background, a simple low chair and visible floor edge. Sculptural physical set, no smooth gray office wall."],
        ["muslin", "드레이프 · 거친 패브릭", "A studio backdrop made of heavy unbleached muslin hanging in irregular full-height folds with a plain timber box seat. Tangible cloth and floor texture, no seamless gray wall."],
        ["paper", "아치형 페이퍼 · 스툴", "A real studio with an oversized curved paper backdrop suspended above a visibly rough floor and a narrow stool. The arc and shadow define the set, not a digital gradient."],
        ["panels", "엇갈린 벽 · 패널 세트", "A physical studio arrangement of three offset freestanding matte flats of unequal width forming shallow recesses, with a small dark bench. No office decor or generic flat background."],
        ["metal", "주름 금속 · 매트한 질감", "A photography studio with a broad vertically ribbed matte metal surface and a simple fabric chair, narrow floor reveal and tangible joints. Not a reflective futuristic CGI set."],
        ["plaster", "회벽 세트 · 긴 벤치", "A hand-troweled plaster studio set with a deep rectangular niche, one broad timber bench and a textured mineral floor. Strong material relief, not a plain charcoal seamless."],
        ["portal", "좁은 포털 · 검은 플랫", "Two tall black studio flats form an asymmetric narrow portal against a light rear surface, with one cubic seat partly inside the opening. All elements physically built, no composited office."],
    ],
    forbes: [
        ["stone", "석재 로비 · 수직선", "A contemporary Korean office lobby with honed gray stone piers, a deep recessed doorway and a dark timber bench. Precise vertical lines and restrained material contrast, no corporate logos."],
        ["boardroom", "미팅룸 · 목재 패널", "An understated Korean boardroom with warm timber wall panels, a matte oval table receding behind the lawyer and soft lateral daylight. No clients, nameplates or certificates."],
        ["concrete", "콘크리트 벽 · 측면광", "A Korean editorial studio with a tactile concrete wall, one dark leather chair and a broad strip of side light. Real surface imperfections, no CGI gradient or executive-office stock scenery."],
        ["city", "한국 도심 · 창틀", "A modern Korean high-floor meeting room with one deep window reveal and an understated view of Korean mid-rise office buildings. A single charcoal chair, no foreign landmarks or panoramic luxury penthouse."],
        ["plaster", "회벽 · 검은 가죽 체어", "A real Korean portrait studio with a hand-finished pale plaster wall, a black leather chair and a low stone ledge. Restrained tactile geometry and clear separation of person and background."],
        ["glass", "반투명 유리 · 겹친 면", "A quiet Korean professional workspace with layered reeded-glass partitions, brushed-metal door frames and a pale terrazzo floor. No open-plan staff, screens, brands or futuristic reflections."],
        ["library", "자료실 · 정돈된 수납", "A contemporary Korean legal research room with low closed oak cabinets and a few anonymous reference volumes in a recessed shelf. No Western mahogany law library, awards, readable book titles or fake qualifications."],
        ["graphite", "흑연색 세트 · 패널", "A physical Korean photography studio with offset graphite-colored painted flats and a simple dark upholstered seat. Sculptural surface relief and a narrow warm-neutral side panel, no blank digital gradient."],
    ],
};
const COVER_FRAMING = [
    "An upper-chest-level knee-up business-cover portrait with the lawyer prominent near the central axis, shoulders relaxed and eyes meeting the camera. Keep modest space above the head, clear lateral breathing room and the complete torso visible.",
    "A confident seated three-quarter portrait cropped just above the knees, the lawyer prominent in the foreground and the room receding behind. Show the hands naturally resting, without cutting through fingers or joints.",
    "A slightly off-center knee-up editorial portrait, torso turned subtly and gaze returned to the camera. Keep the face undistorted, the shoulders and hips clear and the background secondary.",
    "A standing knee-up executive portrait with upright relaxed posture and deliberate asymmetry. The lawyer is large in frame, framed by restrained architectural lines, not a distant full-figure long shot.",
];
const FRAMING = [
    "A distant full-figure environmental portrait from across the space, subject left of center; the surrounding architecture dominates the composition.",
    "A distant full-figure environmental portrait from a waist-height oblique viewpoint with a level sensor, subject on the right third and broad open space above, below and beside them; keep facial perspective natural.",
    "A lower-chest-level long portrait with a strong central architectural axis, subject subtly off-axis and a broad visible floor plane. Use a short-telephoto perspective, not a headshot crop.",
    "A layered composition seen past the edge of a near wall or backdrop flat, with the subject in the middle distance; keep the face unobstructed and the setting readable.",
    "A low but restrained camera viewpoint with strong vertical geometry and ample headroom; show the full environment and avoid wide-angle distortion of the face.",
    "An oblique across-the-room composition, architecture running diagonally behind the subject; balance a large quiet surface against the figure, head and hands fully visible.",
];
const NATURAL_LIGHT = [
    "Broad soft overcast daylight from camera-left, clear local contrast and no theatrical sunbeam.",
    "Low directional daylight from camera-right across tactile surfaces, with deep readable shadows and restrained highlights.",
    "High indirect daylight grazing the rear architecture, subtle reflected fill on the face and no glowing skin.",
    "Filtered daylight forming fine broken shadow rhythms in the environment; keep the face evenly recognizable.",
    "Late-afternoon cross-light separating foreground and background planes, with natural dark-side detail.",
    "A soft motivated side source beyond the frame with strong negative fill, subdued background and gentle facial highlights.",
];
const STUDIO_LIGHT = [
    "A single motivated studio key: large softbox camera-left with strong negative fill and a soft-edged shadow on the set.",
    "A single motivated studio key: broad side softbox camera-right feathered across the face and backdrop, black flags outside frame.",
    "A single motivated studio key: elevated diffused source creating a long floor shadow and delicate reflected fill on the face.",
    "A single motivated studio key: bounced side light with deep sculptural dark-side tones; retain realistic skin texture.",
    "A single motivated studio key: a narrow soft source grazing the physical set and subject, without ring-light catchlights.",
    "A single motivated studio key: a distant gridded softbox with controlled falloff and readable, textured background planes.",
];

export function createStudioBackground(profileId: string, jobId: string, scene: StudioOptions["scene"], history: StudioBackground[] = [], shotDirection?: string, excludedSettings: string[] = []): StudioBackground {
    const bytes = createHash("sha256").update(`studio-background-v1:${profileId}:${jobId}`).digest();
    const recent = new Set(history.filter((b) => b.scene === scene).slice(0, 3).map((b) => b.settingId));
    const available = SETTINGS[scene].filter(([id]) => !recent.has(id) && !excludedSettings.includes(id));
    const [settingId, label, setting] = available[bytes.readUInt32BE(0) % available.length];
    const framings = scene === "forbes" ? COVER_FRAMING : FRAMING;
    const framing = shotDirection || framings[bytes.readUInt32BE(4) % framings.length];
    const lights = scene === "studio" || scene === "forbes" ? STUDIO_LIGHT : NATURAL_LIGHT;
    const lighting = lights[bytes.readUInt32BE(8) % lights.length];
    return {
        version: "fresh-background-v1", scene, settingId, label, seed: bytes.toString("hex"),
        direction: `Invent a NEW physical location for this shoot, not a recoloring of a shared set. ${setting}\nCOMPOSITION: ${framing}\nLIGHTING: ${lighting} Use this as a fallback; when visual style references are supplied, adapt their dominant light direction, shadow density and highlight rolloff to this physical set.\nVary the dimensions, surface wear, opening proportions and placement of objects for this shot. Borrow negative-space rhythm, depth layers and architectural lines from the style reference while retaining the new action and selected framing. Do not reconstruct an exact reference room or pose. Discard scenery from the identity and body-build references. The space must look plausibly Korean, never like an overseas law office.`,
    };
}
