# Three-Image Editorial Pipeline

Deployed 2026-09-13 to `https://www.makethis1.com`.
Initial three-card deployment: `dpl_GQttwaumUzPCF7EByuoecmoaP8BP` (READY).
Square-output production deployment: `dpl_FepEev1mo2X3FggcYVby4dpqjivY` (READY).
Photo-only/recovery production deployment: `dpl_6HbN9J6sxCcuoEj2sCqr2bNUiekh` (READY).
All three current cards rasterize at 2000x2000 (layout revision 15).
Protected preflight passed for Kim Jeong-ung, Yang Young-hee, and Lee Ji-eun;
live preflight and the production alias were verified after promotion.
Existing artwork was reused in local rendering tests; no paid images were generated.
Build, typecheck, focused lint, route/render tests and desktop/mobile UI fixtures passed.
Authenticated production preflight confirmed native photos/fonts and three-card output;
the live publish screen was also checked in the existing admin browser session.
No new paid AI calls or manuscript publication were performed for acceptance testing.
Unrelated pending SEO edits were excluded from the isolated deployment and kept locally.

Photo recovery acceptance (2026-09-13): all 12 profiles with registered photos passed
native photo-only and contact rendering against current registered assets. The magazine
and two test profiles have no registered photos and were not given fabricated substitutes.
Yu Ji-eun's padded 400x500 photo and Baek Chang-hyup's labeled direct phone number passed
both protected-deployment and live preflight, with the career option on and off.
Publish/image-editor UI fixtures passed at 1440/390/320px, including photo/storage failure,
saved-manuscript preservation, image-only recovery, legacy four-card handling and stale
export clearing. Native render, API/billing/security, phone, studio regression, typecheck
and focused lint checks passed. Acceptance used no paid AI calls or production post writes.

The separate public-strength libraries checked for Kim Jeong-ung, Yang Young-hee,
and Lee Ji-eun were empty. Their existing research was not deleted or auto-approved.
New images default to photo-only mode. Approved facts can be explicitly enabled in
either editor; missing/inapplicable approvals fall back to photo-only, never invented
credentials. Naver's actual mobile paste behavior has not been verified by this deployment.

New plans use `editorial-three-v1`: cover, approved trust profile, contact.
The studio portrait generator is independent. Existing studio/legacy four-card
plans can still be recovered explicitly; new plans never select that format.

## Production

- `/admin/blog-publish`, `/admin/blog-images`, and the factory share the plan's manifest.
- Cover: one paid art request, then 2000x2000 Korean typesetting.
- Trust: registered portrait/office photograph only by default, 2000x2000, no text overlays or paid generation. Approved careers are optional.
- Contact: topic-safe hook and registered phone, 2000x2000, no paid generation.
- All three square layouts rasterize text/vectors directly on a 2000x2000 canvas; photos preserve aspect ratio. This is not a stretch of the old portrait/landscape PNGs. Cover artwork/model settings and studio-portrait dimensions are unchanged.
- Naver clipboard HTML places a real `tel:` link beneath the contact image.
- No second GPT manuscript polish or Claude completed-image review.

`proofSelection` is independent of manuscript strengths. It includes only current
publicly approved, field-compatible facts. Its signature binds the article hash,
profile, lawyer, firm, revision, scope, and exact wording. Generation, upload, and
editor export recheck it. Private research is not treated as public approval.
If there are no applicable approved claims, the photo-only layout prints no claims.
Registered portraits are tried in order (preferring a higher-resolution original), then
registered office photos. Missing/corrupt first images do not hide later originals.
The whole photo retains its aspect ratio and padding. The previous post-trim
400/220-pixel hard gate is removed; lower resolution is a non-blocking warning.
Trivial placeholders, unsupported/untrusted sources and unreadable files still fail.
The two photo groups have bounded read deadlines; failed photos never start paid art.
Image preflight failures no longer prevent manuscript creation/storage in the publish
or factory workflow. The saved manuscript can resume image work without being rewritten.
The separate editor clears stale image exports when the profile/manuscript changes.

## Recovery

The new plan cache has its own format key. Legacy plans and source artwork stay
unchanged. Conversion reuses the old paid planning operation and artwork index.
The publish editor creates a new manuscript copy when converting a saved four-card
post. Old image files are not deleted. Network ambiguity never triggers an automatic
paid retry. Layout repair uses the same art and does not rewrite factual copy.

Square layout revision 15 applies only to `editorial-three-v1`; legacy/studio layouts
retain revision 13. A generation request for an older three-card checkpoint recomposes
its saved art at 2000x2000 without changing the paid operation ID or calling the model
again. Existing published PNG URLs are not rewritten. Download/upload use the same
signed output bytes; asset transport and server-side checkpoint upload avoid sending
large PNGs through Vercel request bodies. Preflight reports actual rendered dimensions.

## Verification

Run `node scripts/test-three-card-editorial.cjs`,
`node scripts/test-blog-image-quality.cjs`, and
`node scripts/test-blog-publish-api.cjs` for proof, rendering, API and billing guards.
`node scripts/run-blog-ui-fixtures.cjs` uses the existing private preview environment
for public configuration and mocks all browser APIs. It tests both editors at
1440, 390, and 320 pixels, including explicit basic-profile opt-in.
It does not publish to Naver or prove that Naver preserves clipboard links.

`scripts/test-blog-photo-context.cjs` checks server-owned fallback assets and isolation.
`scripts/verify-blog-photo-profiles.cjs` reads registered profiles and renders photo-only
and contact layouts locally without production writes or paid calls. The registered
`변호사직통` contact prefix is recognized; URI injection and ambiguous numbers remain rejected.

`node scripts/preview-editorial-three.cjs` is a read-only production-library check
using existing local images. Its private previews are not approved client deliverables.

## Planning Response Recovery

Internal `question`/`thesis` notes are not printed copy. Their bounded limits are
1000/4000 characters, with prompt targets of 160/300; complete conditions are retained,
never sliced. Printed headings, decks, source quotations and artwork constraints remain
strict. Provider schema descriptions carry length guidance because string `maxLength`
is not supported by the provider's constrained output format.

Both editors expose saved-response recovery separately from a confirmed paid replan.
The plan API's `recoverOnly` flag prohibits a provider dispatch even on a cache miss;
it revalidates the original paid response under the same operation ID. In blog publish,
successful recovery continues unfinished images, which may still incur their normal
image-generation cost. In blog images, recovery only opens the plan for inspection.
Unit and browser fixtures cover oversized notes, unchanged legal evidence checks,
missing responses without claims or billing, and resume without manuscript regeneration.
