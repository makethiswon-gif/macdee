import type { SKRSContext2D } from "@napi-rs/canvas";
import { type RenderInput, type Assets, SIZE } from "./renderer";
import { getResolvedStyle, drawPhotos, drawTexts, drawDecorations } from "./slot-renderer";
import { STYLE_PRESETS, MAIN_TEMPLATE, SUMMARY_TEMPLATE, BRAND_TEMPLATE, CAREER_TEMPLATE, CONTACT_TEMPLATE, type ImageTypeId } from "./templates-config";

function getTemplate(id: ImageTypeId) {
    switch (id) {
        case 'main': return MAIN_TEMPLATE;
        case 'summary': return SUMMARY_TEMPLATE;
        case 'brand': return BRAND_TEMPLATE;
        case 'career': return CAREER_TEMPLATE;
        case 'contact': return CONTACT_TEMPLATE;
    }
}

export function renderAnyTemplate(typeId: ImageTypeId, ctx: SKRSContext2D, input: RenderInput, assets: Assets, canvasSize: number) {
    let styleId = input.designStyle as string;
    // 하위 호환성 (Legacy 맵핑)
    if (styleId === 'trendy') styleId = 'young';
    if (styleId === 'cool') styleId = 'criminal';
    if (styleId === 'warm') styleId = 'family';
    if (styleId === 'traditional') styleId = 'mature';

    let preset = STYLE_PRESETS[styleId as keyof typeof STYLE_PRESETS];
    if (!preset) preset = STYLE_PRESETS.classic;

    const logoExtracted = assets.rawBrandColor ? {
        primary: assets.rawBrandColor,
        luminance: 0.5 
    } : undefined;

    const style = getResolvedStyle(preset, logoExtracted);
    
    // Draw Background First
    if (style.colors.bg.gradient) {
        const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
        grad.addColorStop(0, style.colors.bg.gradient.from);
        grad.addColorStop(1, style.colors.bg.gradient.to);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
    } else {
        ctx.fillStyle = style.colors.bg.primary;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
    }

    const tpl = getTemplate(typeId);
    if (!tpl) return;
    const layout = tpl.layouts[styleId as keyof typeof tpl.layouts];
    if (!layout) return;

    // Build Data Map
    const dataObj: Record<string, any> = {
        'post.title': input.title || '',
        'post.category': input.category || '',
        'post.keypoints': input.summaryPoints || [],
        'profile.firm': input.profile.officeName || '',
        'profile.name': input.profile.lawyerName || '',
        'profile.title': input.profile.jobTitle || '',
        'profile.phone1': input.profile.phone ? input.profile.phone.split(',')[0]?.trim() || '' : '',
        'profile.phone2': input.profile.phone ? input.profile.phone.split(',')[1]?.trim() || '' : '',
        'profile.address': input.profile.address || '',
        'profile.specialties': (input.profile.specialty || []).join(', '),
        'profile.credentials': input.profile.career || [],
        'profile.slogan': input.profile.brandLines?.[0] || `${input.profile.officeName || ''} 대표변호사 ${input.profile.lawyerName || ''}`,
    };

    drawPhotos(ctx, layout.photos, assets, style, canvasSize);
    drawDecorations(ctx, layout.decos, style, canvasSize);
    drawTexts(ctx, layout.texts, dataObj, style, canvasSize);
}
