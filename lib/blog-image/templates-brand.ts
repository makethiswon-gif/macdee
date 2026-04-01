import type { SKRSContext2D } from "@napi-rs/canvas";
import { type RenderInput, type Assets } from "./renderer";
import { renderAnyTemplate } from "./slot-hub";

export function renderBrandTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    renderAnyTemplate('brand', ctx, input, assets);
}
