# Profile-only closing card and logo compositing (2026-09-07)

- Closing PNG now contains only registered portrait, name/title, office/logo and contact details, with a small contact label. No article headline, summary, checklist or legal copy.
- Existing plans are normalized to the same profile-only closing card. Old copy and heading overrides cannot affect rendered pixels or alt text. The UI no longer offers a closing-card headline editor.
- Canvas layout and source-relevance review are aligned with this profile-only role. Existing actual contact links remain available outside the non-clickable PNG.
- Removed explicit white logo plates. An edge-connected near-white matte is removed from a render-only copy; enclosed white letterforms and original colours are preserved. Transparent reversed logos retain their white artwork and use a continuous dark brand rail. Registered source files are never rewritten.
- Conservative scope: coloured/complex logo backgrounds are not blindly removed. Existing portraits are neither generated nor retouched.

Validation: source/bounds/overlap/payload tests, logo matte/internal-white/colour/reversed-logo cases, identical closing PNG despite changed article copy, actual AXIS logo and registered portrait render, TypeScript/build/ESLint and 1440/390/360px UI tests. No customer records changed or blog posts published.
