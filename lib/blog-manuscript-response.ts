import { COVER_MARKER } from "./blog-cover-brief";

type Message = { stop_reason?: string | null; content?: Array<{ type: string; text?: string }> };

/** A closed BODY can survive a truncated FACTS/COVER tail; an open BODY cannot. */
export function readManuscriptResponse(data: Message) {
    const raw = (data.content || []).filter((block) => block.type === "text").map((block) => block.text || "").join("");
    const markers = [...raw.matchAll(/^===(TITLE|BODY|FACTS|COVER)===[ \t]*\r?$/gm)];
    const ordered = markers.map((marker) => marker[1]);
    const closedBody = ordered[0] === "TITLE" && ordered[1] === "BODY" && ordered[2] === "FACTS";
    const truncated = data.stop_reason === "max_tokens";
    const text = raw.split(COVER_MARKER)[0];
    const titleMarker = "===TITLE===", bodyMarker = "===BODY===", factsMarker = "===FACTS===";
    const factsIdx = text.indexOf(factsMarker);
    const factsComplete = !truncated || ordered[3] === "COVER";
    const facts = factsIdx === -1 || !factsComplete ? [] : text.substring(factsIdx + factsMarker.length).split(/\r?\n/)
        .map((line) => line.replace(/^\s*[-·*]\s*/, "").trim()).filter((line) => line.length >= 4).slice(0, 40);
    const main = factsIdx === -1 ? text : text.substring(0, factsIdx);
    const titleIdx = main.indexOf(titleMarker), bodyIdx = main.indexOf(bodyMarker);
    let title = "", body = "";
    if (titleIdx !== -1 && bodyIdx > titleIdx) {
        title = main.substring(titleIdx + titleMarker.length, bodyIdx).trim();
        body = main.substring(bodyIdx + bodyMarker.length).trim();
    } else if (!truncated) {
        const lines = main.trim().split("\n");
        title = (lines[0] || "").replace(/^#+\s*/, "").trim();
        body = lines.slice(1).join("\n").trim();
    }
    const complete = !!title && !!body && (data.stop_reason === "end_turn" || (truncated && closedBody));
    const warning = complete && truncated
        ? factsComplete
            ? "원고 본문과 사실 확인 목록은 완성됐지만 표지 기획이 응답 한도에서 끊겼습니다. 원고는 복구했으며 추가 AI 호출은 하지 않았습니다. 이미지 확정 시 별도 기획 비용이 발생합니다."
            : "원고 본문은 완성됐지만 사실 확인 목록과 표지 기획이 응답 한도에서 끊겼습니다. 본문만 복구했으며 법률 근거를 직접 검수해주세요. 추가 AI 호출은 하지 않았습니다. 이미지 확정 시 별도 기획 비용이 발생할 수 있습니다."
        : "";
    return { raw, title, body, facts, complete, truncated, warning };
}
