# Ask Yifan

Route: `/ask`, the fourth card on the dashboard. Jingyi writes what she needs, attaches files
(the paperclip, drag and drop, or a pasted screenshot) and sends. One email with the files
reaches Yifan's inbox, and he helps from there. It is one way on purpose: his answer comes over
WeChat or as the thing done. Only the gate stands in front of it; no player is needed.

The site has no server, so the email is sent by a small Cloudflare Worker: see
`worker/README.md`. The page posts to `config.ask.url`; `VITE_ASK_URL` points a dev server at a
stub.

What she sent stays on her device as bubbles (`localStorage`, the newest 50; file contents are
not kept). A send that fails keeps its text and files in the composer and offers **Send again**.
One send carries at most 10 files and 18 MB, the limit of one email; photos over 1.5 MB are
scaled to 2400 px first.

| File | What |
|---|---|
| `ask.ts`, `ask.css` | The page: bubbles, composer, chips, drag and drop, paste |
| `core.ts`, `core.test.ts` | Caps, history, the request; shared with the Worker |
| `shrink.ts`, `shrink.test.ts` | Scaling large photos down before they are attached |
| `../../../scripts/ask-card.py` | Draws the dashboard card, `public/media/dashboard/ask.png` |
