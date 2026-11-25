# The Workers

Two small Cloudflare Workers sit behind the static site. **Ask** (`wrangler.toml`, `src/`) sends
one email per request and stores nothing. **The album** (`photos.toml`, `src/photos/`) keeps our
photos; it is described at the end of this file.

# The Ask Worker

The server half of `/ask` (see `src/features/ask/README.md`). The site is static, and a browser
cannot send an email with attachments, so this Cloudflare Worker at `ask.jingyifan.love` takes
one `POST /send` (`multipart/form-data`: `text`, `player`, `lang`, `files`) and sends one email
to Yifan through the `send_email` binding. Nothing is stored.

What happens to that email afterwards is in `mailflow/README.md`. The mail flow trusts an email
only when it carries this domain's DKIM signature, which this Worker's sends do.

| File | What |
|---|---|
| `src/handle.ts`, `handle.test.ts` | The request handler: origin, caps, the email |
| `src/index.ts` | The entry Wrangler deploys |
| `wrangler.toml` | Name, custom domain, the `EMAIL` binding, `ASK_FROM` |

## Checks

Only two, by Yifan's decision (2026-11-23): the `Origin` must be `https://jingyifan.love` (or
the dev server), and a send carries at most 10 files and 18 MB, the same caps the page enforces
(`src/features/ask/core.ts`). There is no key, rate limit or CAPTCHA. The Worker can only write
to Yifan's inbox, so the worst case is junk mail to him; add a limit then.

## Settings

- `ASK_TO` (secret): the inbox. Set once with
  `npx wrangler secret put ASK_TO -c worker/wrangler.toml`. The repository is public, so the
  address is never written in it.
- `ASK_FROM` (var, in `wrangler.toml`): `ask@jingyifan.love`.

On the free Workers plan the binding sends only to *verified destination addresses*, which is
this use exactly: the inbox is verified once under **Compute → Email Service → Email Routing →
Destination Addresses**.

## Deploy

`npm run ask:deploy` (after `npx wrangler login`). The site's own deploy does not touch the
Worker, and the Worker's does not touch the site.

## Cloudflare Docs This Was Built Against

Read 2026-11-23:

- Email Sending Workers API, <https://developers.cloudflare.com/email-service/api/send-emails/workers-api/>
  (modified 2026-11-17): `env.EMAIL.send({ to, from, subject, text, attachments })`; an
  attachment is `{ filename, type, disposition, content }` with `content` an `ArrayBuffer`; at
  most 32 attachments and 25 MiB per message; errors are thrown with a `code`.
- Send bindings, <https://developers.cloudflare.com/email-service/configuration/send-bindings/>
  (modified 2026-11-17): the `[[send_email]]` block.
- Pricing, <https://developers.cloudflare.com/email-service/platform/pricing/> (modified
  2026-06-09): free accounts send to verified destination addresses only.

# The Album Worker (photos.jingyifan.love)

The server half of `/photos` (see `src/features/photos/README.md`). Everything is in D1 and
nothing in R2: R2 needs a card on the account, even inside its free tier (Yifan, 2026-11-25).
One row per photo in the database `yi-photos` (`src/photos/schema.sql`). The pictures, one row
per size in a `pictures` table (`src/photos/pictures.sql`), are spread over **shelves**:
`yi-photos` itself, then `yi-photos-shelf-1` to `-4`, bound as `DB` and `SHELF1`–`SHELF4`. On the
free plan a database holds 500 MB and a row 2 MB, so a shelf is filled to 480 MB and a picture is
at most 1.9 MB. Five shelves hold about 2.4 GB, some 4,000 photos. Captions and tags come from a
vision model on Workers AI (`VISION_MODEL` in `photos.toml`), the city from OpenStreetMap's
Nominatim at upload.

| Route | What |
|---|---|
| `GET /photos` | Every photo, newest first |
| `POST /photos` | One photo: `meta` (JSON), `full`, `thumb`, onto the first shelf with room. A photo already there is answered with `duplicate: true`; all shelves full is `507` |
| `GET /photos/:id/full`, `/thumb` | The picture, cached privately for a year (an id never changes content) |
| `PATCH /photos/:id` | Correct `takenAt`, `captionZh`, `captionEn` or `tags` |
| `POST /photos/:id/describe` | Ask the model again |
| `DELETE /photos/:id` | The row and both pictures |

**Access.** Unlike Ask, this Worker stores private things, so every request carries
`Authorization: Bearer <the site's password>`. The Worker hashes it and compares it with the
gate's `ANSWERS` (`src/core/gate.ts`), so there is no secret to set, and changing the gate's
password changes the album's. Ten wrong tries from one address lock it out for fifteen minutes
(the `attempts` table). CORS answers only `https://jingyifan.love` and the dev servers.

This is Yifan's choice (2026-11-25), made knowing its limit: the gate's hash is in the public
bundle, and eight digits can be found from it offline in seconds, so anyone who does that can
open the album. A long random key, given to each device once, would close that; the lock only
stops guessing against the Worker itself.

**Deploy** (the five databases and their tables already exist): `npm run photos:deploy`. The
first deploy creates `photos.jingyifan.love`. A device that has passed the gate since this
version remembers the password for the album; one that passed it earlier is asked once on the
album page.

**Adding a shelf** when the album says it is full: `npx wrangler d1 create yi-photos-shelf-5`,
apply `pictures.sql` to it (below), add a `[[d1_databases]]` block with binding `SHELF5` to
`photos.toml`, and deploy. The free plan allows ten databases per account.

The tables, if a database is ever made again:
`npx wrangler d1 execute yi-photos --remote --file worker/src/photos/schema.sql -c worker/photos.toml`, and
`npx wrangler d1 execute <each shelf> --remote --file worker/src/photos/pictures.sql -c worker/photos.toml`.
