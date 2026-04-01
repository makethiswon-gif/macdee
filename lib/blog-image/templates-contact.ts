import type { SKRSContext2D } from "@napi-rs/canvas";
import { type RenderInput, type Assets } from "./renderer";
import { renderAnyTemplate } from "./slot-hub";

export function renderContactTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets, canvasSize: number = 1024) {
    renderAnyTemplate('contact', ctx, input, assets, canvasSize);
}
