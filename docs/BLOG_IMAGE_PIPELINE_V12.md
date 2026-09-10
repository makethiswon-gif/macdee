# Blog Production V12

Verified 2026-09-10. Scope: blog-publish, blog-images, and their shared factory path.

## Production Route

1. Preflight registered contact, portrait decoding, font files and private storage.
   Fresh manuscript creation also checks image-model access before spending Claude tokens.
2. Claude Opus 5 writes the manuscript once. The raw response and selected approved
   strengths are stored before parsing. No GPT second-pass polishing.
3. Claude Opus 5 plans four complementary images with constrained JSON output.
   A flat transport schema is normalized to the existing infographic union, then
   exact manuscript evidence, owner and source hash are validated.
4. GPT Image 2.5 Sunburst (`gpt-image-2.5-sunburst-2026-09-08`) generates scene assets.
   The default High control maps to `xhigh`. `BLOG_IMAGE_MODEL` can explicitly
   override the model, subject to account access and compatible quality settings.
5. Server-side typography, diagrams, authentic portrait/logo and contact details
   create 1200px-wide PNGs. Six publication families provide distinct geometry.
   Informational cards do not need image-model calls. No Claude finished-image review.
6. Private signed files bypass Vercel JSON size limits. The client checks SHA-256.
   Publication attachment sends a production ID and signed release, not base64.
   Optimistic `updated_at` checks prevent another tab from overwriting a newer draft.
7. Naver export includes readable text, contextual image placement, alt descriptions,
   an explanatory AI-image caption where applicable, and the registered `tel:` link.
   A PNG itself cannot be a clickable telephone link.

## Paid Request Safety

- `owner-briefings/blog-paid-operations/{id}/claim.json` is an atomic, immutable claim.
- `response.json` preserves provider status, raw response, request ID, duration and usage
  before validation or rendering. Cached reads log `reused: true`, not duplicate usage.
- Storage-write retries never dispatch another model request. Storage outages fail closed.
- A timeout or lost response does not expire/unlock itself. Never delete claims to
  resolve an ambiguous request. A fresh paid attempt requires an explicit confirmation.
- Font, layout, download and upload retries reuse saved results. An art index preserves
  a source-matched scene across typography and profile-layout changes.
- A separately confirmed alternate cover is optional. Merely viewing the page does
  not create a second candidate or charge for a new plan.
- Saved drafts can be reopened. A successful explicitly selected replan becomes the
  default recoverable plan without deleting previous plans.

## Verification

Offline regression commands (no model calls):

```powershell
npm run test:blog-images
node scripts/test-blog-image-quality.cjs
node scripts/test-blog-image-layout.cjs
node scripts/test-blog-publish-api.cjs
node scripts/test-blog-phone-contact.cjs
node scripts/test-blog-strengths.cjs
node scripts/test-blog-naver-html.cjs
npx tsc --noEmit --incremental false
```

Browser tests use a local server and mocked APIs:
`scripts/test-blog-publish.cjs` and `scripts/test-blog-images-ui.cjs`.
The layout suite checks 240 family/style/card combinations.

Explicit live acceptance used one saved manuscript, one successful Claude plan,
one Sunburst scene, two deterministic diagrams and an authentic contact card.
All four PNGs passed layout checks and were recovered after a deployment with
identical production IDs and file hashes. No extra model calls were made for recovery.
An initial nested-union schema was rejected by the provider before generation;
the flat schema then succeeded. The successful plan took 112 seconds at the provider,
which exceeded the previous 100-second timeout.

Live verification tooling is opt-in, credentials are environment-only, and private
artifacts remain in excluded `tmp/`. Do not commit environment files, portraits,
manuscripts, signed URLs or raw provider responses. Do not publish acceptance drafts.

## Limits

Provider availability and future legal/model outputs cannot be guaranteed. The system
prevents silent repeated billing; it cannot refund past calls or reconstruct responses
lost before durable storage was introduced. Legal assertions and final Naver posting
still require editorial approval. Real Naver editor paste/publish was not performed
by this acceptance test; local rich-copy and contenteditable round trips were tested.
Image count, colour changes and random noise are not ranking guarantees.
