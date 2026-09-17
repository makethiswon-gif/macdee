import { createHash } from "node:crypto";
import type { StudioOptions, StudioPose } from "./types";

type Pose = readonly [label: string, action: string];
const POSES: Record<StudioOptions["scene"], readonly Pose[]> = {
    window: [
        ["창가 · 가벼운 걸음", "Walk slowly parallel to the window, captured between steps; arms relaxed."],
        ["창가 · 소매 정리", "Stand a short distance from the window, torso turned a quarter away, lightly adjusting one shirt cuff."],
        ["창가 · 앉은 사색", "Sit upright on a plain low seat near the opening, feet on the floor and hands apart on the thighs."],
        ["창가 · 돌아선 순간", "Stand facing into the room, turning the head back naturally toward the light."],
        ["창가 · 무게 이동", "Stand with weight on the back foot, one hand resting loosely in a trouser pocket, the other relaxed."],
        ["창가 · 가벼운 기댐", "Rest a shoulder lightly against the window reveal, feet uncrossed and hands relaxed at the sides."],
    ],
    desk: [
        ["서류 · 앉아서 검토", "Sit at the table, one hand gently lifting an unmarked sheet and the other resting on the tabletop."],
        ["서류 · 서서 검토", "Stand beside the table, lean slightly from the hips with both hands resting apart on the table edge."],
        ["서류 · 자리에서 돌아봄", "Sit sideways to the table, torso turning away from the papers, forearms relaxed on the thighs."],
        ["서류 · 페이지 넘김", "Stand upright at the end of the table, turning a single page in a slim unmarked folder held at waist level."],
        ["서류 · 잠시 멈춤", "Sit upright with a capped pen held loosely above a closed folder; shoulders relaxed and feet grounded."],
        ["서류 · 테이블 옆 걸음", "Walk beside the worktable carrying a closed slim folder in one lowered hand."],
    ],
    stairs: [
        ["계단 · 오르는 순간", "Walk up one shallow step naturally, weight grounded and one hand near the balustrade."],
        ["계단 · 내려오는 순간", "Walk down one shallow step, shoulders level and arms hanging naturally."],
        ["계단 · 난간 옆 정지", "Stand alongside the landing parapet with one hand resting lightly on its top, body a quarter turned."],
        ["계단 · 돌아본 순간", "Pause on the flat landing, body facing along the passage, head turning gently back toward the camera side."],
        ["계단 · 두 손을 낮게", "Stand on the landing with hands loosely joined at waist level, feet naturally separated."],
        ["계단 · 재킷 정리", "Stand clear of the stair edge, briefly adjusting the jacket hem with one hand, the other resting loosely."],
    ],
    lounge: [
        ["라운지 · 좌석 앞쪽", "Sit upright near the front of the seat, pelvis grounded and thighs clearly visible; hands resting separately without thrusting the head toward the lens."],
        ["라운지 · 등받이에 기댐", "Sit back comfortably, feet grounded, one forearm supported and the other hand relaxed on the thigh."],
        ["라운지 · 옆으로 앉음", "Sit at a gentle diagonal with ankles loosely crossed and both hands relaxed on the lap."],
        ["라운지 · 좌석 옆 정지", "Stand beside the seat, one hand lightly touching its back or upper edge, torso turned into the room."],
        ["라운지 · 자리에서 일어남", "Capture the controlled moment of rising from the seat, both feet planted and hands free."],
        ["라운지 · 좌석을 지나감", "Walk slowly past the lounge seating, one hand in a pocket and the other relaxed."],
    ],
    studio: [
        ["스튜디오 · 비대칭 스탠딩", "Stand with weight shifted onto one leg, one hand in a pocket and the other hanging naturally."],
        ["스튜디오 · 낮은 좌석", "Sit upright on a simple studio seat, feet set apart and hands resting separately on the thighs. Keep the full rib cage above the pelvis, without hunching the shoulders or pushing the head forward."],
        ["스튜디오 · 측면 회전", "Stand at a gentle quarter turn, shoulders and face on a similar plane toward the camera, hands loosely joined below the waist. Keep the rib cage and shoulder width visible."],
        ["스튜디오 · 이동 중", "Take a measured step across the physical set, jacket moving subtly, arms naturally counterbalancing."],
        ["스튜디오 · 소매 디테일", "Stand with shoulders relaxed while adjusting a single cuff at waist level; no arms folded across the chest."],
        ["스튜디오 · 앉은 회전", "Sit diagonally on a plain seat with torso turned slightly back, one hand resting on the knee and the other beside the hip."],
    ],
    forbes: [
        ["표지 · 편안한 스탠딩", "Stand with relaxed upright posture, one hand in a pocket and the other visible at waist level."],
        ["표지 · 앉은 정면", "Sit upright on a restrained portrait chair, hands resting separately, shoulders gently angled."],
        ["표지 · 테이블 옆", "Stand beside a small plain table with one hand resting lightly at its edge, the other relaxed."],
        ["표지 · 앉은 사선", "Sit diagonally with one forearm resting on a knee, torso gently returning toward the camera."],
        ["표지 · 소매 정리", "Stand during a small cuff-adjusting gesture, hands kept low and posture composed."],
        ["표지 · 낮은 손 모음", "Stand at a quarter turn, hands loosely meeting near the waist, not crossed over the chest."],
    ],
};
const CAMERAS = [
    "Camera at lower-chest height, level sensor, square to the main architectural plane, from sufficient distance.",
    "Camera at waist height, level sensor at a gentle oblique angle to the set; never looking down at the head.",
    "Camera at lower-chest height from across the room, straight architectural verticals and natural short-telephoto perspective.",
    "Camera at waist height from the other side of the architectural axis, using receding diagonal lines without tilting down.",
];
const GAZES = ["Eyes calmly meet the lens.", "Eyes look just off-camera toward the light, not down.", "Eyes turn gently into the room, maintaining a readable three-quarter face."];
const COMPOSITIONS = ["Place the figure or pair left of center with more open space on the right.", "Place the figure or pair right of center with more open space on the left.", "Use a quiet central axis with slightly asymmetric architecture."];
const SET_VIEWS = [
    ["좌측 배치 · 정면", "Square-on architectural view; figure on the left third, open depth on the right."],
    ["우측 배치 · 사선", "Oblique view along receding lines; figure on the right third, open depth on the left."],
    ["중앙 배치 · 대칭", "Frontal central-axis composition with balanced architectural lines and clear floor around the figure."],
    ["공간 속 인물 · 프레임", "View through a real doorway or foreground architectural edge, figure off-center in the middle distance; do not obscure the face or limbs."],
    ["측면 공간 · 깊이", "View from the opposite side of the room axis, layered foreground on one side and figure in the opposite middle-ground; show a readable three-quarter face."],
] as const;

export function createStudioPose(profileId: string, jobId: string, options: StudioOptions, history: StudioPose[] = [], setIndex?: number): StudioPose {
    const seed = createHash("sha256").update(`independent-shot-v1:${profileId}:${jobId}`).digest();
    const people = options.subjectCount || 1, scene = options.scene;
    const recent = history.filter((p) => p.scene === scene && p.people === people).slice(0, 3);
    const poses = POSES[scene].map((value, i) => ({ value, id: `${scene}-${i}` })).filter((p) => !recent.some((r) => r.poseId === p.id));
    const pose = poses[seed.readUInt32BE(0) % poses.length];
    const gazes = scene === "forbes" ? GAZES.slice(0, 1) : GAZES;
    const cameras = scene === "forbes" ? CAMERAS.map((_, i) => `Camera at upper-chest height with a level sensor, 85-105mm-equivalent perspective from at least 3 metres, ${["square to the main architectural plane", "gently oblique to the set", "with straight architectural verticals", "from the other side of the architectural axis"][i]}; no head enlargement.`) : CAMERAS;
    const views = cameras.flatMap((camera, c) => gazes.flatMap((gaze, g) => COMPOSITIONS.map((composition, f) => ({ camera, gaze, composition, c: String(c), g: String(g), f: String(f) }))));
    const available = views.filter((v) => !recent.some((r) => r.cameraId === v.c && r.gazeId === v.g && r.compositionId === v.f));
    const selected = available[seed.readUInt32BE(4) % available.length];
    const setView = setIndex === undefined ? undefined : SET_VIEWS[setIndex];
    const view = setView ? { ...selected, c: `set-${setIndex}`, f: `set-${setIndex}`,
        camera: `${scene === "forbes" ? "Level upper-chest camera, 85-105mm equivalent, at least 3 metres away." : "Level camera at the subject's waist-to-lower-chest height, 70-85mm equivalent from across the room; lower the camera when seated."} ${setView[1]}`,
        composition: "Preserve natural body scale, intact limbs and the selected scene's full-figure or knee-up framing." } : selected;
    return {
        version: "independent-shot-v1", scene, people, poseId: pose.id, cameraId: view.c, gazeId: view.g, compositionId: view.f,
        label: pose.value[0] + (setView ? ` / ${setView[0]}` : ""),
        direction: `INDEPENDENT SHOT PLAN: Build a new body pose from scratch, not an edited or outpainted source photograph. ${pose.value[1]} ${people === 2 ? "Both referenced people remain visible at comparable scale. Stage one in the main action and the other in a complementary relaxed position beside them, with different hand placement and a small natural depth offset. Do not mirror poses or occlude either face. Add a second seat only when needed." : "Only the single referenced person is present."} ${view.camera} ${view.gaze} ${view.composition} ${scene === "forbes" ? "Prominent knee-up cover scale; keep head, torso, hips and hands fully within the frame." : "Full figure including feet from across the room, approximately 20% combined person area and 80% environment. For a seated action lower the camera to the seated subject's abdomen-to-lower-chest height; do not look down from a standing viewpoint."} Adapt small props to the physical location but retain this action and camera brief. Do not copy the reference head tilt, gaze, shoulder angle, hand gesture or cropping; preserve facial identity in the NEW orientation.`,
    };
}
