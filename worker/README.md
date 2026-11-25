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

The server half of `/photos` (see `src/features/photos/README.md`). Pictures in the R2 bucket
`yi-photos` (`full/<id>.jpg`, `thumb/<id>.jpg`), one row per photo in the D1 database
`yi-photos` (`src/photos/schema.sql`), captions and tags from a vision model on Workers AI
(`VISION_MODEL` in `photos.toml`), and the city from OpenStreetMap's Nominatim at upload.

| Route | What |
|---|---|
| `GET /photos` | Every photo, newest first |
| `POST /photos` | One photo: `meta` (JSON), `full`, `thumb`. A photo already there is answered with `duplicate: true` |
| `GET /photos/:id/full`, `/thumb` | The picture, cached privately for a year (an id never changes content) |
| `PATCH /photos/:id` | Correct `takenAt`, `captionZh`, `captionEn` or `tags` |
| `POST /photos/:id/describe` | Ask the model again |
| `DELETE /photos/:id` | The row and both pictures |

**Access.** Unlike Ask, this Worker stores private things, so it checks a secret on every
request: `Authorization: Bearer <PHOTOS_KEY>`, compared in constant time. A secret shorter than
16 characters opens nothing. CORS answers only `https://jingyifan.love` and the dev servers.

**Set up once** (the D1 database and its table already exist):

```bash
# 1. Cloudflare dashboard → R2 → enable R2 (free up to 10 GB; asks for a card once), then:
npx wrangler r2 bucket create yi-photos
# 2. The album key: a long random string, kept out of the repository.
openssl rand -hex 24 | tee /dev/tty | npx wrangler secret put PHOTOS_KEY -c worker/photos.toml
# 3. Deploy; the first deploy creates photos.jingyifan.love.
npm run photos:deploy
```

Then open `https://jingyifan.love/photos#key=<the key>` on each of our devices once (send it to
Jingyi over WeChat). To change the key, put a new secret; every device is asked again.

The schema, if the database is ever made again:
`npx wrangler d1 execute yi-photos --remote --file worker/src/photos/schema.sql -c worker/photos.toml`.
