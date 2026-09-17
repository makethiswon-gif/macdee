# Editorial Quality Revision 19

## Scope

Three 2000 x 2000 blog images: subject-led cover, approved lawyer photograph (optional approved credentials), and contact. Existing four-image sets, studio originals, manuscripts, and published posts are preserved. No GPT prose polishing or paid Claude finished-image review has been added.

## Reference Review

References were studied for hierarchy, photographic scale, pacing, and the relationship between image and text. Reference photography, branding, and copy are not redistributed in generated cards.

- [Pentagram: Citizen](https://www.pentagram.com/work/citizen): flexible grid, room for photography and deliberately varied photographic texture. The project text was accessible; some full-size image CDN requests were blocked.
- [Chanel Beauty Book, Morgane Perrot](https://morgane-perrot.com/projets/chanel-beauty-book): viewed cover and multiple spreads. A strong image, controlled type hierarchy, and small supporting details rather than equal-weight text boxes.
- [Pinterest: commercial editorial campaign series](https://www.pinterest.com/pin/343751384066911560/): viewed the four-spread photographic series. Image-led and information-led pages have different pacing within one visual identity.
- [Pinterest: product detail composition](https://www.pinterest.com/pin/8655424282366863/): inspected in the product-editorial search grid. Dominant product image, restrained rules, aligned secondary details.
- [Pinterest: editorial typography collection](https://www.pinterest.com/suziedee/editorial-typography/): compared multiple typographic/color studies. Decorative complexity alone was not adopted.
- [Pinterest: Film Magazine](https://www.pinterest.com/pin/283163895300138385/): inspected the spread. Distinct compositions can share a consistent identity; its dense red collage language was not adopted for legal articles.

## Problems Addressed

1. Sharpness was being mistaken for suitability: larger office photos could displace an approved-looking portrait. Registered order and portrait intent now win; approved studio photos use their exact current rendered version.
2. The studio connection required two approved photographs even though the new second card uses one. One approval is sufficient for the three-card workflow. The old four-card workflow still requires two different photos.
3. Saved studio libraries were disconnected, including three profiles with approved assets. Enabling reuse must not approve drafts, alter filters, or change asset versions.
4. A small picture under a large title produced weak hierarchy. Six saved cover recipes now have explicit image-led geometries; contact has two deliberate compositions tied to the lawyer edition.
5. Narrow headlines were balanced by line length in ways that split natural phrases. The narrow photographic layout now keeps the original word groups; headline prompting asks for one short question, not a long parallel sentence.
6. Heavy serif titles dominated the photo. New three-card serif headings use the existing 400-weight editorial face. Legacy templates retain their original fonts.
7. Horizontal source pictures could lose the meaningful subject when cropped into a vertical column. Existing horizontal originals use a horizontal composition; new facing-page art is requested in portrait format.
8. Manuscript and image phone parsers disagreed on comma-separated representative/direct numbers. Both now use the stored first-number convention and the same strict URL validation.
9. A deployment that changes the image prompt must not turn an unresolved old request into a new paid job. Recovery of an existing production can read a preserved response but cannot dispatch a new provider request.
10. A 320px screenshot review exposed tiny supporting copy despite passing geometric checks. Supporting copy now uses larger type and, where necessary, a full-width area rather than a narrow caption column.

## Acceptance Criteria

- Final PNGs are exactly 2000 x 2000; no face/body stretch and no enhancement filter is applied to approved studio assets.
- Photo-only second cards have no career, nameplate, or other text overlay.
- Current approval, rendered version, owner, and blog connection are validated again before upload. Cached files cannot bypass revocation.
- Covers show the subject at a meaningful size; unrelated window-gazing is not an all-purpose visual answer.
- Titles, deck, and representative number survive 320px and 390px viewing without overlap or clipping.
- A layout or heading edit reuses preserved artwork. Contact rendering never calls an image model.
- Layout checks are geometric checks, not an aesthetic quality score. Human visual review of real images is required before production promotion.

## Test Artifacts

- `tmp/editorial-quality/approved/`: current approved finished photographs, downloaded read-only from authenticated studio routes.
- `tmp/editorial-quality/index.html`: three lawyer layout compositions; non-Yu rows are explicitly labeled layout tests, not published posts.
- `tmp/editorial-quality/pipeline/`: a separate review title using the existing Yu manuscript, generated through the application's own plan/image routes. No blog post is created or published. One paid plan and one paid cover are the bounded acceptance budget. Subsequent composition/heading changes are render-only.
- `tmp/editorial-quality/existing/`: the original saved article re-composed from its paid original with no new generation.

The review sample's headline is shortened with the existing free heading override. Its paid source image is not replaced. A single example cannot guarantee the aesthetic quality of every future image; keeping strong input material, a short specific brief, and explicit approval remains essential.
