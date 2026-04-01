import type { SKRSContext2D } from "@napi-rs/canvas";
import { type RenderInput, type Assets } from "./renderer";
import { renderAnyTemplate } from "./slot-hub";

export function renderCareerTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    renderAnyTemplate('career', ctx, input, assets);
}
