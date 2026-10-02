# Pink Wall

A responsive Pink October solidarity experience, implemented from the supplied
[Niara Designs Figma file](https://www.figma.com/design/O9xr3jjfnJob3LRVH6Y17F/Niara-Designs?node-id=453-267).
React + TypeScript + Vite, a Canvas ribbon, Netlify Functions, and Supabase PostgreSQL.

## Run locally

Use Node 22.14 or newer (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. With no environment file, local development uses
**explicitly labeled demo data**: 120 example messages and browser-local
contributions. Demo reports are simulated; demo messages are not sent to a server.
Local storage retains your demo messages. Remove `pink-wall-demo-v1` from local
storage to reset them.

```sh
npm run build
npm run preview
npm test
npx playwright install chromium
npm run test:e2e
```

To develop against the real API, copy `.env.example` to `.env`, configure its
server variables, set `VITE_DATA_MODE=api`, and run:

```sh
npm run dev:api
```

Open http://localhost:8888. The dev:api command downloads the pinned Netlify CLI on demand; it is not an application dependency. Functions need Netlify Dev; the plain Vite server
serves the frontend only. Production defaults to the real API when the frontend
mode is unset; it never silently falls back to demo on an API error.

## Assets needed

**Only licensed Gilroy webfonts still need to be supplied.** The Figma image,
vectors, title lettering, arrow icon, and original textured background are
already downloaded. No temporary Figma URLs are referenced by the application.

| Asset | Exact expected path | Use |
| --- | --- | --- |
| Gilroy Regular, WOFF2 | `public/fonts/Gilroy-Regular.woff2` | Body and paragraph text |
| Gilroy Medium, WOFF2 | `public/fonts/Gilroy-Medium.woff2` | Hero “But … has no season.” |
| Gilroy SemiBold, WOFF2 | `public/fonts/Gilroy-SemiBold.woff2` | Buttons and form labels |
| Gilroy Heavy, WOFF2 | `public/fonts/Gilroy-Heavy.woff2` | Decorative PINK OCTOBER text |
| Gilroy SemiBold Italic, WOFF2 | `public/fonts/Gilroy-SemiBoldItalic.woff2` | Closing emphasized paragraph |

Provide files licensed for web embedding. Drop them at those paths and restart
`npm run dev` or run `npm run build`; the preparation script activates each
available face automatically. Until then, the documented body fallback is
Century Gothic / Trebuchet MS; heavy decorations use Arial Black.
**Typography cannot exactly match Figma until Gilroy is supplied.**
Cormorant Infant Bold and Bold Italic are included with their Open Font License. Compressed Latin WOFF2 files serve the designed English text; full TTF files are available for other supported characters.
A 3.3 KB Noto Color Emoji WOFF2 subset renders the four symbols, including the
pink heart on systems without a suitable native emoji font; its license is included.

Downloaded assets:

| Asset | Local path | Design size / placement |
| --- | --- | --- |
| Hand and flower photograph | `public/assets/images/hand-flower.png` | Original raster; Figma crop in a 460 × 559 box |
| Textured hero background | `public/assets/images/hero-texture.png` | Export of Figma background node 454:379, 1282 × 762 |
| October title lettering | `public/assets/vectors/hero-title.svg` | 935.616 × 73.932; hero title |
| Support oval highlight | `public/assets/vectors/support-highlight.svg` | 236.909 × 103.346; around “support” |
| Hero flower backdrop | `public/assets/vectors/hero-flower-backdrop.svg` | 507 × 480; behind the photograph |
| Arrow icon | `public/assets/icons/arrow-up-right.svg` | 42 × 42; hero action |
| Closing leaves | `public/assets/vectors/closing-leaves.svg` | 410 × 410; closing illustration |
| Closing flower | `public/assets/vectors/closing-flower.svg` | 264.632 square, rotated −45°; closing illustration |

SVG files retain their intrinsic root dimensions; composed artwork scales in
wrappers. The hero background is an asset export, not a screenshot of the page.
Hero and closing desktop layouts follow Figma; mobile layout is inferred because
no mobile frames were provided. Closing copy and the spelling “Ribon” are
preserved from the supplied design.

## Environment variables

| Variable | Where | Value |
| --- | --- | --- |
| `VITE_DATA_MODE` | Local / Netlify build | `api` for shared production data; `demo` only for deliberate demos |
| `SUPABASE_URL` | Functions / local Netlify Dev | Your project URL, e.g. https://PROJECT.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions only | Supabase service role key; never put it in a VITE variable |
| `RATE_LIMIT_SECRET` | Functions only | Random secret of at least 32 characters for hashing visitor IPs |
| `MESSAGE_MODERATION_MODE` | Functions only | `published` (default) or `pending` |

No anonymous Supabase key is required: restricted server endpoints serve all data.
Never commit `.env` or expose server secrets to frontend builds.

Generate the rate-limit secret locally:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Supabase setup

1. Create a dedicated Supabase project.
2. Open the SQL Editor and apply
   [001_pink_wall.sql](supabase/migrations/001_pink_wall.sql) **once**.
3. Keep the Data API enabled for the public schema.
4. Copy the project URL and service role key into the server environment.

The migration includes:
- Messages, reports, and compact hourly rate-limit counters.
- Bounds and length checks, a unique request ID, and a partial unique index that
  prevents two pending/published messages from occupying the same dot.
- A published-dot index for occupancy reads.
- RLS on every table, with **no anonymous/authenticated table policies or grants**.
  This intentionally denies direct browser access.
- Explicit service role grants and revocation of PUBLIC/anonymous RPC execution.
- `create_support_message`: transaction-safe allocation plus idempotency.
- `report_support_message`: deduplicated reports and its own abuse quota.

The server role bypasses RLS by design and must remain private. The browser never
chooses a dot or supplies moderation status. All endpoints return plain text data;
React escapes visitor content instead of rendering HTML.

### Moderation

`published` gives the intended instant contribution animation.
`pending` reserves a dot but does not display it; the author sees a review notice.
Use the Supabase Table Editor to review messages and reports. Publish or reject
with a targeted update, for example:

```sql
update public.messages set status = 'published' where id = 'MESSAGE-UUID';
update public.messages set status = 'rejected' where id = 'MESSAGE-UUID';
```

Rejected messages release their spot. A partial unique constraint prevents
accidentally republishing an old rejected message after another message takes
that dot. There is no admin dashboard in this MVP.

Occupancy IDs can remain in the CDN for up to roughly three minutes; message
content is checked against published status on every new API read. Already-open
browser sessions retain previously loaded text in their session cache.
Reports do not automatically hide a message: review them in Supabase.

### Abuse controls and maintenance

Messages are limited to 5 per visitor hash per UTC hour; reports to 10.
HMAC hashing uses Netlify's trusted `context.ip`; raw IPs are never stored.
Quota counters are updated in the database transaction, so limits persist across
serverless instances. A honeypot, payload limits, field normalization, symbol
allowlist, link rejection, and unique idempotency keys add basic protection.
This is an MVP abuse baseline; enable pending review for premoderation.

Periodically clean stale counters (manually or with a Supabase scheduled job):

```sql
delete from public.rate_limits where window_start < now() - interval '7 days';
```

Set a retention policy for reports according to your needs. No realtime
subscription or database polling is enabled.

## Netlify deployment

The committed `netlify.toml` configures:
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node 22, SPA fallback, static asset caching, and browser security headers.

1. Finish Supabase setup and supply the licensed Gilroy font files.
2. Push this project to a repository.
3. Import that repository in Netlify, using the committed configuration.
4. Set `VITE_DATA_MODE=api` in the Build environment.
5. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_SECRET`, and
   `MESSAGE_MODERATION_MODE` with Functions scope. Use a separate Supabase
   project for deploy previews if they should not write to production.
6. Deploy and open the site over HTTPS.
7. Verify the endpoints below, submit a message, then reload and select its dot.
8. Test a report and confirm it appears in `message_reports`.

Changing VITE variables requires a rebuild. Do not deploy `VITE_DATA_MODE=demo`
for the public shared ribbon.

Verification paths:
- `GET /.netlify/functions/occupancy`: 200 and only IDs/count.
- `GET /.netlify/functions/message?dot_id=ribbon-v1-XXXXX`: 200 for a published
  occupied dot, 404 for an unoccupied/unpublished dot.
- `POST /.netlify/functions/submit`: 201 plus confirmed message/dot; retry the
  same request UUID and payload and confirm the same message ID is returned.
- `POST /.netlify/functions/report`: 200 for a valid published message ID.

Use the browser form for the first submission. The request fields are
`message`, `author_name`, `symbol`, `website` (empty), and `request_id`
(UUID v4). Both POST endpoints require JSON and reject cross-origin submissions.

A cached occupancy response may briefly lag after another person's submission;
the current contributor appears immediately from the confirmed API result.
There is no requirement to wait for another occupancy fetch.

## Architecture

- `src/components/Sections.tsx`: Figma hero, closing section, minimal footer.
- `src/data/ribbonGeometry.ts`: deterministic ribbon-v1 with **2,054** dots.
  Three sampled cubic Bezier segments define a stroked awareness ribbon;
  a row-major hex lattice is clipped to that stroke. IDs are assigned in that
  fixed order. Geometry has a fingerprint test; introduce v2 for future changes.
- `src/hooks/useRibbonCanvas.ts`: a batched Canvas path and view transforms.
  Drawing uses requestAnimationFrame; device pixel ratio is capped at 2.
  Pointer hit testing stays independent of React DOM nodes.
- `src/components/Ribbon.tsx`: occupancy, selection, lazy message loading.
  Initial API reads request only dot IDs. Server pagination handles Supabase's
  default 1,000-row cap. Occupancy is deduplicated per browser session and cached
  at the Netlify CDN; there are no per-dot initial reads.
- `src/lib/repository.ts`: interchangeable demo/API repositories and a session
  message cache. Hover is delayed; concurrent reads for one dot are deduplicated.
  Only selection/intentional hover requests full content; revisits reuse it.
- `src/components/MessageForm.tsx`: native modal dialog, validation, optional
  name/symbol, UUID retry key, honeypot, no account.
- On confirmed submission, local occupancy and message cache update immediately.
  The view travels to the exact returned dot; the outline fills, and the author's
  message is displayed. Reduced motion uses an immediate view change and fill.
- SQL allocation takes a short transaction advisory lock and scans for the first
  available candidate from a random starting ID. The unique index protects the
  invariant. Only actual messages occupy database rows; no empty-dot rows exist.
- Server functions use native fetch against Supabase REST/RPC; no Supabase SDK or
  privileged credentials ship to the frontend.

Desktop: drag, Ctrl/Command + wheel or trackpad pinch, and zoom/reset controls.
Regular wheel scrolling continues down the page. Touch: normal page scrolling by
default, explicit Explore / Done for pan and pinch. Taps open messages. Keyboard:
zoom buttons, Read a message, Next/Previous, Escape, and canvas +/−, arrows, Home,
Enter. The accessible reader complements Canvas rather than exposing thousands
of focus stops.

## Validation and limits

See [VERIFICATION.md](VERIFICATION.md) for completed checks and remaining limitations.

Unit/integration checks use embedded PostgreSQL (PGlite) for schema, allocation,
idempotency, quotas, and privileges. This does not simulate separate PostgreSQL
connections: the advisory lock and unique constraint are the concurrency
protection; verify live API connectivity and concurrent submissions after
configuring Supabase.

Browser checks cover desktop/mobile assets, overflow, reading, zoom/reset,
submission and persistence, Escape, reduced motion, and leaving touch exploration.
`node scripts/inspect.mjs` creates desktop/tablet/mobile inspection screenshots
in `artifacts/`.

Supabase/Netlify accounts and live secrets were not provided. The production
wiring and migration are included; live deployment/connectivity must be verified
after they are configured. No public deployment has been performed.

References: [Netlify Functions](https://docs.netlify.com/build/functions/overview/),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
