# Blog images: balanced latency fix (2026-09-07)

Scope: admin blog-image planning/generation only. V9 canvas typography, layouts, registered portraits/contact details and publication safety gates are unchanged.

## Changes

- Planning: Claude Fable 5.1/high -> Claude Opus 5/low adaptive; compact output, 10,000-token ceiling, 100-second upstream deadline.
- Image art: keep GPT Image 2, default to medium quality; JPEG at quality 90 before existing normalization. Final deliverable remains opaque PNG. High quality remains selectable.
- Review: one Claude Opus 5 finished-pixel check per card (thinking disabled, low effort, 1,800-token ceiling, 35-second deadline). It checks both source relevance and design, replacing raw-art review followed by GPT-6 Astra.
- Review failure/timeout returns the generated PNG and reusable art with `designReview.status=unavailable`; never treat it as passed or auto-regenerate. Blog factory/publish still block non-passed cards.
- Planning timeout is translated into a stage-specific Korean message. No automatic paid retries. Operational logs contain stage/model/duration only.
- Generate-design now requires an existing source-matched plan, preventing planning and generation deadlines from accumulating in one request. All three current UI callers already supply this. Refresh an old open admin tab before use.

## Verification

- Mechanical regression includes injected timeout before headers and during body consumption, no hidden retry, retained artwork, source checks, bounds/overlap, all palettes/typefaces and PNG payload size.
- Production build, targeted ESLint and desktop/mobile UI regression (1440/390/360px) pass.
- Actual local upstream test, synthetic housing manuscript: fresh planning 32.0s; cover generation/composition/review 43.1s, including review 10.0s. Single sample, not a latency guarantee or comparison benchmark.
- The real cover was returned with `revise` (73/100): reviewer requested clearer passbook cues and layout refinements. This is not a timeout; it verifies that faster processing does not suppress review findings. Synthetic info/contact images also rendered successfully.

Limits: provider outages and image-generation timeouts can still happen; an image that the provider has not returned cannot be recovered. Browser results are not durable across a page refresh. Automatic publishing and customer data were not exercised or changed.
