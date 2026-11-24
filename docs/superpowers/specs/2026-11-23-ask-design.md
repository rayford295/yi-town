# Ask Yifan (`/ask`): Design

Date: 2026-11-23. Status: awaiting approval.

## Intent

Jingyi writes what she needs in a chat-style box, attaches files, and presses send. The message
and its files arrive in Yifan's inbox (the address is kept in the Worker's settings, outside
this public repository), and he helps her remotely. The page replaces the "下一个 / 还在种" seed
card's promise with a real fourth product; the seed card stays as the last card.

## Goals

- A composer like Codex or Claude Code: a text box, a paperclip, drag and drop, paste a
  screenshot, attachment chips with a remove button, Enter to send (Shift+Enter for a new line).
- One email per send, with the text as the body and the files as real attachments.
- Her sent requests stay visible on her device as chat bubbles with a state: sending, sent,
  failed (with a retry button). A failed send never loses her text or files.
- Bilingual (zh/en) through `i18n.ts`, in the town's existing look.

## Non-Goals

- Replies shown on the page. Yifan answers over WeChat or by doing the task. The bubble layout
  leaves room for a reply thread later.
- An AI that answers her.
- Files larger than one email can carry (see Constraints).

## Anti-Goals

- Any secret, or Yifan's address, in the repository or the built bundle.
- A send that looks successful to her and never arrives.

## Constraints

- The site is static (GitHub Pages); the gate is checked only in the browser. Email with
  attachments needs a server-side piece, and that piece must defend itself.
- The repository is public.
- One email carries at most 25 MB after encoding, so the page caps a send at 18 MB of files and
  says so before sending. Photos are downscaled in the browser (long edge 2400 px) first.

## Approaches

1. **Cloudflare Worker with the `send_email` binding (chosen).** The domain is already at
   Cloudflare. Email Routing is switched on for `jingyifan.love`, Yifan's address is verified as
   a destination, and the Worker builds a MIME message and sends it. No third-party account and
   no API key exists to leak. Cost: free. Trade-off: it can only send to verified addresses,
   which is exactly this use.
2. **Cloudflare Worker with Resend.** The same Worker calls Resend's API. One more account and
   one secret; the free tier is enough. This is the fallback if tamu.edu's filter rejects
   mail from approach 1.
3. **A hosted form service (Web3Forms, Formspree) with no Worker.** Rejected: attachments are a
   paid feature, and the access key would sit in public source with no way to limit abuse.

## Design

**Page** (`src/features/ask/`, route `/ask`, a line in `products.ts`, strings in `i18n.ts`):
a scrolling list of her past requests above a composer pinned to the bottom. History (text,
file names, time, state) is kept in `localStorage` through `core/storage.ts`; file contents are
not kept after a successful send. Pure logic (size budget, history, payload building) sits in
`ask/core.ts` with tests; `ask.ts` holds the DOM.

**Worker** (`worker/`, deployed with Wrangler to `ask.jingyifan.love`; a `workers.dev`
address is unreliable from mainland China): one `POST /send` taking `multipart/form-data` (text,
player, language, files). It answers CORS for `https://jingyifan.love` only, enforces the size
cap, and sends through the
`send_email` binding's structured `send()` (no MIME library). Subject:
`[仪见小镇] 静仪：<first 30 characters>`. It replies `{ok:true}` or `{ok:false, reason}`, and the
page maps each reason to a sentence she can act on.

**Abuse defence** (Yifan's decision, 2026-11-23): none beyond the allowed origin and the size
caps. This is a small private feature and the endpoint can only write to Yifan's own inbox, so
the worst case is junk mail to him. If that ever happens, a key or a rate limit goes in then.

**What Yifan does once by hand** (about ten minutes, guided): onboard `jingyifan.love` for
email sending and verify his address in the Cloudflare dashboard, then `wrangler login`.

## Left to the Builder

Card picture and copy, bubble styling, the exact failure sentences, and whether history is capped (proposed: the last 50).
