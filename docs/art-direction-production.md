# Art Direction Production

Revision 22 connects the approved story-editorial and colour-campaign prototypes to the three-card production path. All three final PNGs remain 2000 x 2000. Revision 21 remained a protected candidate: actual generation revealed pale-background contrast and authored-line-wrap issues, corrected before promotion.

- Lawyer editions are stable, including when the previous article used the same recipe. New articles do not rotate layouts automatically.
- The planner writes a small topic kicker, a short semantic headline and an optional exact-substring emphasis. The same geometric direction feeds the photo generator and compositor. Printed decks, generic CTA paragraphs and decorative English remain absent.
- Story covers combine a candid photographic subject, dark natural lower space, two type weights and one highlighted word. Campaign covers combine tactile pale surfaces, dimensional objects, contrasting natural colour and oversized short type.
- From revision 23 the second image exclusively uses the current approved studio finish, regardless of grain or softness. There is no registered portrait or office fallback, with or without career overlays. The original is not retouched or stretched.
- Without a linked approved studio asset, preflight and planning stop before paid image work. Manuscript writing and saving still finish, with an approval link in both editors. Draft photos are never auto-approved. Old registered second-image checkpoints cannot pass client readiness or upload validation.
- Contact uses another currently approved studio photograph when there are two or more. With one approved photo it may reuse that photo; with none it uses the registered office, then a registered portrait. No contact image-model call occurs.
- Reviewed registered assets are content-matched within their owning profile, not selected by mutable array index. Approved studio assets always take precedence.
- Approval, owner and version are rechecked before cached results and again before publication. New photo selection enters the production cache key.
- New uploaded images retain their production ID. A later contact/cover upload rechecks the retained second image too; provenance-free old second images must be rebound before a newly uploaded set can become ready. Existing published posts are not rewritten.
- Existing paid originals, old plans and four-card sets remain recoverable. The layout revision does not change a paid operation ID. Recovery never silently issues a new paid request.

## Acceptance

`scripts/preview-art-direction-production.cjs` produces six-lawyer comparison layouts from two preserved photo plates. Those comparisons are not new articles. `scripts/test-editorial-quality-gallery.cjs` checks real 2000px output at 1440, 390 and 320px. `scripts/test-art-direction-typography.cjs` checks actual font bounds and intact copy.

End-to-end candidate acceptance used two new plans and three cover plates in total: one Kim cover, one Yang cover rejected for incomplete anatomy, and one corrected Yang cover. Typography revisions reused paid originals. Existing manuscripts, posts and approvals were not modified. No manuscript polishing or paid completed-image critic has been added.

The verified revision-22 deployment is `dpl_CrrGjwS83VCRkDbv4jzXAuQSLN9j`, built from `.vercel/releases/editorial-three-1789307357421`. Unrelated pending public-blog SEO edits were excluded from that snapshot. The local six-lawyer comparison and real two-manuscript acceptance galleries passed desktop and 390/320px screenshots and nonblank pixel checks.

Revision 23 was promoted as `dpl_8A9H3Jd8XhVMymxGhU1fkGrzYoEW`, from `.vercel/releases/editorial-three-1789308726315`. Both protected and live production returned the same approved Yang studio pixels with the new provenance policy. Preflight was checked with and without career overlays; missing linked approvals stop before paid planning. Local tests cover stale registered checkpoints, retained uploaded-photo revocation, three/four-card compatibility and manuscript-preserving UI recovery at 1440/390/320px. This policy change required no model calls or post/approval writes. Earlier local acceptance galleries remain historical snapshots, not newly generated revision-23 sets.

Photographic quality still depends on registered assets and stochastic generation. A lawyer without approved studio photographs is not falsely presented as having an approved fashion photoshoot. Newly approved assets are picked up without requiring a new paid cover.

## Logo Typography (Revision 24)

- Cover headlines, topic labels and contact numbers now use the registered logo's dominant ink instead of a shared white/gold palette. A coloured symbol takes precedence over neutral wordmark lettering; transparent/reversed and monochrome marks retain their own palette. If a logo cannot be read, the registered `brandColor` is used, then a neutral default. Invalid logos never block image generation.
- Asset loading uses the existing bounded public-storage/data-image reader. No arbitrary URL requests, AI colour extraction, cross-lawyer cache, source-logo edits or photography recolouring are introduced.
- Each text run samples its actual photographic footprint in linear sRGB. Exact logo colour is preferred; poor contrast first uses a same-hue tint/shade, then a restrained shadow and, only where still necessary, a thin opposite-luminance edge. The local target is 4.5:1 at the lower contrast decile because large originals are read at mobile width. This is a raster heuristic, not a claim of universal accessibility compliance.
- The photo-only second image stays text-free. Career layouts use the same logo colour for name and labels. Saved original artwork, geometry and paid-operation IDs remain unchanged. Revision 24 invalidates rendered checkpoints only; typography recovery reuses saved artwork without an image-model call. Already published PNGs are not rewritten.
- `node scripts/test-blog-brand-typography.cjs` covers local logo extraction, safe fallback, tone/effect selection and actual contrast pixels across six layouts. Add `--gallery` to render the three preserved owner fixtures into `tmp/blog-brand-typography/review.html`. No network, paid generation or publication is used by either mode.
