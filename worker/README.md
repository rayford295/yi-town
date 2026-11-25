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
