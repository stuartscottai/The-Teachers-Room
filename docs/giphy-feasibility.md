# GIPHY feasibility for The Teachers Room

Reviewed 18 October 2026. Research only: no GIPHY account, API key, provider
integration or production setting was created or changed.

## Recommendation

Technically feasible for covers and question illustrations. Add a separate GIFs
tab beside Photos, starting with teacher-selected GIFs. Prototype with a beta
key before deciding whether production pricing is acceptable. Keep photographs
as the default for automatic selection and let teachers explicitly request GIFs.

## Cost and access

GIPHY currently offers free beta keys limited to 100 API calls per hour. Production
upgrades cost money, with pricing discussed after application. This is not a
promise of unlimited free production use. A lookup for a saved GIF also consumes
API access; using IDs does not eliminate the viewing cost.

Create an account at [GIPHY Developers](https://developers.giphy.com/dashboard/),
choose Create an App and API, then obtain the appropriate web integration keys.
The account owner should own these keys. No account credentials were supplied
or needed for this investigation.

Source: [GIPHY pricing FAQ](https://support.giphy.com/hc/en-us/articles/10389869671322-Is-there-a-fee-for-using-GIPHY-s-API),
[key setup](https://support.giphy.com/hc/en-us/articles/360035158412--Do-I-need-to-obtain-an-API-Key-to-get-started-playing-with-the-GIPHY-API).

## Integration rules

Standard integrations must request API and media directly from the browser,
retain returned URLs unchanged, and avoid storing/proxying media without approval.
Search grids cannot mix providers or reorder/filter GIPHY's results. Attribution
is required. The API supports G-rated searches, single/batch ID lookups and
multiple animation formats. These requirements rule out simply passing GIPHY
through our current Pexels proxy and ranking system.

Sources: [official API documentation](https://developers.giphy.com/docs/api/),
[API terms](https://support.giphy.com/hc/en-us/articles/360028134111-GIPHY-API-Terms-of-Service).

## How this fits the existing code

Question images already save a provider-specific `stockId`; storage removes
temporary URLs in `utils/gameUtils.ts`. `utils/gameImage.ts` currently resolves
those IDs through the site's own image proxy. Covers also carry provider IDs,
but their existing configuration keeps additional display information.

A GIPHY implementation should preserve the useful ID approach with a reference
such as `giphy:<id>`, plus an animation/static preference and accessible
description. Fetch current allowed media information when opening a game. Do
not construct a guessed permanent media URL or copy GIF files into our storage.
Missing/deleted/restricted GIFs need a clean replacement prompt or fallback.
Saved GIPHY references need their own resolver rather than the stock-image proxy.

Rendering needs one shared animation-aware component usable by covers, question
cards, previews, enlargement, live quiz screens and student practice. It should
support an animated rendition, pause/static mode, reduced-motion preferences,
small previews and loading only near the screen. The cover editor's current
photo cropping assumptions also need review for animated content.

The website enforces strict cross-origin browser security. A sample GIPHY media
response returned HTTP 200, `Access-Control-Allow-Origin: *` and
`Cross-Origin-Resource-Policy: cross-origin`. The sample animation also loaded
successfully in the actual site browser while its strict security policy was
active. A real key-based API flow still needs verification. One media URL is
not a guarantee for every rendition.

## Automatic AI selection

The existing AI search planner can turn lesson content into a short GIF search
phrase. Its query can be sent from the browser and a candidate proposed for
teacher review. For example, present-continuous practice might suggest
“person running”, while a game cover might suggest “space exploration”.

The current automatic photo selector filters, scores and rearranges provider
results. That mechanism should not be reused unchanged. Confirm the intended
automatic selection workflow with GIPHY before implementing it; don't assume
that a technically possible integration is approved. A rating is not a check
that a GIF is relevant, avoids giving away an answer, or suits a specific class.

For initial development, teacher choice offers a useful feature without relying
on an unconfirmed automatic-selection policy. Covers and question images can
share that picker, saved-reference format and renderer. The production work
also needs a review of provider disclosure in the existing privacy information,
because media loads go directly from visitors' browsers to GIPHY.
