# Changelog

Versions are tags of feeling more than of code; the site deploys on every push.

## 1.25.0 (2026-11-25)

- **Our Album** (`/photos`), the sixth card on the dashboard. Both of us add photos; a vision
  model on Workers AI reads each one and writes a sentence in Chinese and in English and tags in
  both. The page finds photos by those words, by a range of days and by who added them, as a grid
  by month or on a travel map with one dotted line per trip. When and where come from the EXIF,
  read in the browser before the photo is shrunk.
- The photos are kept by a second Worker at `photos.jingyifan.love` (R2 for the pictures, D1 for
  the rows). It is the first part of the site with real access control: a random album key,
  given to each device once by a pairing link, since the gate's hash is in a public bundle.
- 292 unit tests.

## 1.24.0 (2026-11-24)

- The front door is a password now. It used to ask which day we met and took the date in several
  spellings, the two short ones included. It now takes only the full eight digits, typed into a
  password field, and every device is asked again once (`src/core/gate.ts`, key `yi.gate.2`).
  This keeps a passer-by out; the site is static, so it is still not access control.
- The mail flow gives the model less to work with. It can read and write files and run one
  script, which must carry the system's immutable flag or the flow refuses to start; it has no
  `cp` or `mkdir` and, unattended, no web search. The DKIM result is now parsed by method, with
  comments and quoted strings removed, in place of a substring match.
- The mail flow's model now works inside the one request's folder; the rule files it reads and
  the script it may run must all be locked (`chflags uchg`), and the script checks its arguments.
  The DKIM header is read in a single pass that tracks quotes and comments together.
- The paper has a second version (`paper/`, 24 November): the infirmary, the trip page, the
  request box and its answering pipeline, the corrected claim about a backend, 16 pages. One
  reference of the first version was missing an author and is corrected. Not yet sent to arXiv.
- 263 unit tests.

## 1.23.0 (2026-11-24)

- The mail flow (`mailflow/`): what happens after an Ask Yifan email arrives. A job on Yifan's
  Mac runs every ten minutes: it fetches new requests over IMAP into one folder each, a local
  model (Ollama) reads the screenshots and sorts the request, headless Claude does the work,
  and the finished files go back to Jingyi by email. It runs unattended, also while he sleeps.
- A request is accepted only when Gmail recorded a passing DKIM result for `jingyifan.love`,
  and one that asks for anything but the work itself stops and waits for Yifan. The recipient
  is fixed in a local file; automatic sends are capped per day.
- Addresses and local paths live in `mailflow/config_local.py`, which is not in the repository.
- The README is rewritten around the dashboard: the five products as cards, how a message
  becomes an answer, and what each folder holds. The houses moved into a collapsed section.

## 1.22.1 (2026-11-24)

Ask Yifan, the findings of the review of 1.22.0, each with a test that failed first:

- The page's state moved out of the page into `src/features/ask/session.ts`. A send now finishes
  and is written down whatever happens to the page meanwhile: pressing the language button or
  leaving mid-send used to leave the redrawn page on "sending", lose the bubble and invite a
  second send. What she types or attaches while a send is out stays in the composer.
- Photos still being scaled down show as one chip ("Getting 2 ready…") and the send button waits
  for them; sending in that moment used to leave them behind without a word.
- A request that stalls is given up after three minutes and says so, in place of "sending" for
  ever.
- "Send again" after a reload now sends: the first click brings the text back and asks for the
  files, the second sends. A new send no longer removes other failed bubbles; only the one it
  retries gives way.
- In Safari on macOS, the Enter that confirms a pinyin candidate no longer sends.
- Smaller: a damaged history entry no longer breaks the page; a paste from Word or Excel pastes
  its text, not a picture of it; a portrait photo keeps its rotation when scaled; the Worker
  strips C1 controls and U+2028/2029 from file names, and a `player` of `constructor` no longer
  reaches the subject line.
- The card and the page are now called 找小杨 in Chinese (owner); the English stays Ask Yifan.
- The email's subject names 静仪 when no player is picked (owner): the page is hers.
- 261 unit tests.

## 1.22.0 (2026-11-24)

- Ask Yifan (`/ask`, `src/features/ask/`): the fourth card on the dashboard. Jingyi writes what
  she needs, attaches files (the paperclip, drag and drop, or a pasted screenshot) and sends;
  one email with the files reaches Yifan's inbox and he helps from there. What she sent stays on
  her phone as bubbles; a send that fails keeps its text and files and offers "send again". One
  send carries at most 10 files and 18 MB, and large photos are scaled down first.
- The site's first server-side piece: a Cloudflare Worker at `ask.jingyifan.love` (`worker/`)
  that turns the request into the email through Cloudflare's `send_email` binding. It stores
  nothing, and the inbox address is a Worker secret, not in this repository. Deployed by hand
  with `npm run ask:deploy`; see `docs/DEPLOY.md`.
- `scripts/ask-card.py` draws the card's pixel picture: an envelope sealed with a heart and a
  paper plane leaving it.
- 231 unit tests.

## 1.21.0 (2026-11-08)

- Jingyi's ticket is booked, and the site knows it: Cathay Pacific CX830, Hong Kong T1 → New
  York JFK T8 on 2027-02-04 (09:30 → 12:00 local), and CX831 home on 2027-02-14, Valentine's
  Day (13:40 → 18:55 the next day). Both legs live in `config.trip`; `config.nextMeeting` now
  reads the outbound leg, so the home page's countdown and the Love Map's gold line follow it
  (the gold line now leaves from Hong Kong). The hand-drawn CYF925 stays in the Moments, the
  level 1 quiz and one infirmary note as the memory it is.
- See You in New York (`/trip`, `src/features/trip/`): the third card on the dashboard, with a
  live line ("88 days to go", then "day 3 of 11", then "on the way home"). The page has a clock
  that knows where in the trip we are, both legs as boarding passes with local times, and the
  itinerary: one row a day from her landing to her landing back home, written as we go
  (`itinerary.ts`), with photos under each day from `public/media/trip/`. No player needed.
- `scripts/trip-card.py` draws the card's pixel picture: Hong Kong, New York, a dotted route and
  a small plane.
- 189 unit tests.

## 1.20.0 (2026-11-04)

- The infirmary's letter opens with what the one who wrote it is doing right now, from the clock
  in their city ("it is 03:12 where Yifan is, and he is asleep"), and "tell them I am out" hands
  the phone's share sheet one line with how long the visit was. Nothing is sent by itself.
- `python3 scripts/record-rx.py fight yifan` records a prescription read aloud straight into
  `public/media/clinic/`; the "hear it" button appears by itself.
- Rayford knows where the infirmary is and walks you to its door.
- A new version of the site is offered on a bar at the bottom of the page and taken with one tap,
  instead of reloading underneath someone half-way through a level; the check runs when the tab
  comes back into view and hourly (`src/core/update.ts`, service worker in `prompt` mode).
- The deploy job waits out a stuck GitHub Pages deployment and retries twice before failing.
- 167 unit tests.

## 1.19.0 (2026-11-04)

- The infirmary (`/clinic`, `src/features/clinic/`): the second product on the dashboard and a
  pink house with a red cross by the square's north-west corner of the town. Jingyi, 2026-11-03:
  "以后我受伤了我就不跟你说话了，我就躲进去." Check in with what hurts (a fight, a hurt, missing
  them, just tired), breathe three times, read the letter the other one wrote in advance for that
  hurt, draw a one-line note from the cabinet, and write on a private chart that never leaves the
  phone. A "hear it" button appears when `public/media/clinic/<hurt>-<doctor>.m4a` exists. Four
  letters and eighteen notes from each of us, drafted in each one's voice for each to rewrite.
- Not a level: no lock, no cat guards it, nothing to clear; the door is always open.
- 165 unit tests.

## 1.18.0 (2026-10-30)

- The birthday letter is now the real one: Yifan's handwritten card (dated 10.31.2026) is shown at
  the end of the Love Map story, with the same words typed beneath it in Chinese and rendered in
  English (`src/features/birthday-map/letter.ts`, `public/media/letter/birthday-card.jpg`).
- The last letter and what follows it open for a player as soon as they have cleared the ring;
  the other player no longer has to have arrived on the same device. Rayford, the partner by the
  fountain, the journey map and the portal all agree.
- A full rehearsal run of the town, recorded by Yifan, is on YouTube: <https://youtu.be/C0-oPjvNzZk>.
- The README no longer names the prologue or the finale; the town tells you when you get there.
- The last letter (`/letter`) is written: it ends, on purpose, with “to be continued”.
- A LICENSE: the code is MIT; the photos, letters, voice notes and other personal material in the
  repository are not, and stay ours. Preparation for making the repository public.

## 1.17.0 (2026-10-28)

- The ring level is cleared by the try-on photo, not by the reveal: put it on, take the picture.
- A hole in time by house 9 leads to the wedding; the baker in the prologue is Yifan.
- The jukebox plays our six songs through the YouTube player; no audio files are hosted.
- The epilogue has its own letter (`src/features/letter/text.ts`, a draft to rewrite); the
  birthday letter counts the days live.
- In-level progress (gomoku, songs, stars, poems, moments, map hearts) survives a language toggle
  or a reload (`yi.live.*` in sessionStorage; cleared when the level is cleared or reset).
- Songs and Love Map quizzes re-deal the options after a wrong pick; Songs waits for the passage
  to be heard before the options unlock.
- The front page shows only this player's count; the town is taller on narrow phones; a voice note
  dropped in `public/media/voice/notes/` is listed by `npm run notes` (or recorded with
  `scripts/record-note.py`).

## 1.16.0 (2026-10-28)

- A review pass over the whole site. The gate's placeholder no longer spells the answer; the
  progress code's check character is ISO 7064 MOD 37,36 (a one-character typo can no longer pass,
  so codes made before today are invalid: share a new one); Google Fonts no longer block the first
  paint (they do not load from mainland China); a chunk missing after a deploy reloads once instead
  of a blank page; media is refreshed in the background when a file changes under the same name;
  the ring page frees its WebGL context; the try-on turns the camera off if the hand model fails.
- Levels: Poems remembers a solved line when you go back; Gomoku's tenth answer counts even if
  you leave at once; Stars works from the keyboard; the cleared card closes with Escape.
- Phones: the town's talk box sits under a short map instead of being cut off; captions on the
  grass are cream, not mauve; the jukebox pill hides during a cutscene and stays off the map's
  zoom buttons; the ring's try-on buttons no longer overlap; text buttons are finger-sized.
- Cutscenes: skipping the wedding before the vows does not marry anyone; "I don't" is not "I do";
  an "I do" button stays on screen while the mic listens; the certificate saves through the share
  sheet on phones; the baker is named Yifan.
- After the ring, a hole in time opens on the grass by house 9; it leads to the wedding and waits
  for the other player. Rayford walks you to it.

## 1.15.0 (2026-10-28)

- The birthday prologue (`/birthday`): before the town opens, Yifan bakes Jingyi's cake against
  the Shenzhen-midnight clock, with the whisk, the ten-strawberry heart, nine candles, the song,
  a wish and the candles blown out by breath. Plays once per player; replay from the town footer.
- The wedding (`/wedding`): after the last letter, Rayford officiates in the fountain garden;
  the Wedding March, vows spoken or pressed, Coffee brings the Meridian rings, bells, doves and
  a certificate to keep. The town then dresses the two as bride and groom.
- Rayford, the town and the sync page no longer mention the ring before it is reached; a test
  (`src/features/guide/secret.test.ts`) keeps it that way.

## 1.14.0 (2026-10-27)

- `jingyifan.love/` is now a dashboard: one card per thing we build, with each player's level
  count on the town's card. The town moved to `/town`; the brand in the top bar leads to the
  dashboard, the avatar and "Journey" to the town. Same domain and same repository, so every
  save stays where it was. New products: a folder in `src/features/`, routes in `main.ts`, a
  line in `src/features/dashboard/products.ts`.

## 1.13.0 (2026-10-27)

- Rayford, the town's guide: Yifan in a suit, standing just south of the fountain. He explains
  what Yi Town is, lists the levels, tells you about the cats, mailbox and signposts, says where
  to go next with a hint for that level, and can walk you to its door. He also gives the
  first-visit welcome. All lines are written in advance, in both languages.

## 1.12.4 (2026-10-27)

- Gomoku: the ten gold stones now form a heart you can actually see (two lobes, the dip, the
  sides, the tip), drawn in order as the puzzles are solved, and the finished heart glows on
  its own for a few seconds before the "level cleared" card appears.
- Ring: Mendelssohn's Wedding March plays under the reveal (public-domain recording).

## 1.12.3 (2026-10-27)

- Renamed the repository from `YI` to `yi-town`, after the pixel town the site opens on (the
  old address redirects). The installed app is now titled "Yi Town". Test badge corrected to
  113.

## 1.12.2 (2026-10-26)

Check-up (a fresh-eyes review plus a scripted play-through of all nine levels and a sweep of
every route at 320, 390 and 1280 px in both languages):

- Fixed: the map's found hearts were shared between players in one tab, so the second player
  could find the quiz gone and the level unclearable; now per player.
- Fixed: Our Songs counted a song answered twice after Prev/Next and could clear early; it now
  tracks which songs were named.
- Fixed: Gomoku left a stray stone when two wrong taps came within half a second.
- Fixed: the jukebox kept playing under the Songs level; it now pauses when the level opens.
- Fixed: a speech result arriving after leaving level 1 could open the cleared card elsewhere.
- Fixed: the Songs players overflowed a 320 px screen; the 330 px player now scales to the card.
- Tattoo: the saved picture carries an explicit size (Safari drew it blank), a failed save says
  so, and a second finger no longer swallows the first stroke.
- One shared `shuffle`; a duplicate homophone dropped; an unused export removed.

## 1.12.1 (2026-10-26)

- Level 1: typing the line is offered alongside the microphone from the start (owner).

## 1.12.0 (2026-10-26)

- Levels 3 and 4 merged (owner): **Moments** now asks for the days in order and then the
  portrait puzzle, in one house. The freed third house is **Tattoo**: handwrite a tattoo for
  the other one on an arm or a shoulder and ink it; kept on the device, exportable as a PNG.

## 1.11.0 (2026-10-26)

- Gomoku (owner): ten positions instead of three, one stone each; every answer stays on the
  board in gold and the tenth completes a heart. Positions are generated from three patterns
  around the heart's points and checked to have exactly one winning point.

## 1.10.0 (2026-10-26)

- Level 1 gains its second half (owner): after the question, the vow. Wedding vows rewritten
  as the vow of becoming each other's boyfriend and girlfriend once more, then one line to say
  to the phone: Yifan "我爱你，陈静仪，我愿意", Jingyi "我爱你，杨一帆，我愿意". The browser's
  speech recogniser listens (Mandarin; homophones of the names count); where it cannot listen,
  or after a few misses, the line can be typed. The level clears only once the line is said.

## 1.9.0 (2026-10-26)

- Level 2 rebuilt (owner): six places, a heart in each. A street-level photo comes first; name
  the place and its heart appears on the map to pick up. Texas (his PhD), Los Angeles (his
  master's), Japan (a place she loves), Shenzhen (where she is), Hong Kong (her master's), New
  York (where we may meet). Free Commons photos with credits; the map refreshes its size when
  the card changes the layout.

## 1.8.0 (2026-10-26)

- Level 7 is now **Libra and Scorpius** (owner: the computed sky "wasn't much fun"): our two
  signs at their real star positions, side by side; tap two stars to draw each line of both
  figures, 20 in all. A note tells that Libra's brightest stars are still the Scorpion's claws.
  The astronomy library and the star catalogue are gone.

## 1.7.2 (2026-10-26)

- Our Songs: a second source, the official YouTube embed (official or auto-generated "Topic"
  uploads), covered except a hole over its play button. Jingyi gets QQ Music by default, Yifan
  YouTube, and either can switch on the page (`yi.songs.source`): QQ Music plays only from
  mainland China, YouTube only outside it.

## 1.7.1 (2026-10-26)

- Our Songs plays through the official QQ Music out-chain player (song ids in
  `src/features/songs/list.ts`) under masks that hide its title and cover; the local-file path
  remains for a song without an id. The jukebox is hidden on that page. Singers added for
  天下第一好 (李小眼) and 直到你降临 (阿肆).

## 1.7.0 (2026-10-26)

Two levels rebuilt so one person on one phone can clear them (owner, 2026-10-26):

- **Gomoku** is now three endgame positions. The player sees their own colour to move and taps
  the one stone that makes five; a wrong stone fades, the right line lights up. The third
  position has the other side one move from winning. The full two-player game, the tally and
  the saved game are gone.
- **Pictionary** is replaced by **Our Songs** (`/songs`, level id `songs`): six of our songs, a
  passage each; pick the title from four. The jukebox now plays the same six files whole and
  turns itself off when none of them is there yet. The files are the owner's to add.

## 1.6.0 (2026-10-26)

- A ninth level, **Us, in Old Verse** (`/poems`), now the eighth house: five classical lines
  about love with their second half taken out, put back character by character from a bank with
  decoys. The poems are the owner's (Su Wu, Guan Daosheng, Li Shangyin, the *Yutai xinyong*
  birds, one anonymous couplet). The ring is the ninth house: nine levels for 九九.

## 1.5.1 (2026-10-26)

Repository check-up (a fresh-eyes review plus a page sweep at 320, 390 and 1280 px):

- Fixed: a `/sync?c=…` link opened on a phone with no player picked lost its code at the picker.
- Fixed: "Start over" in the town left a second engine, its key handlers and timers running
  behind every later page; the list view stacked listeners the same way.
- Fixed: a "level cleared" card could outlive its page (browser back); it now goes with the page,
  and it takes keyboard focus when it opens.
- Fixed: the epilogue opened once the ring was merely unlocked; it now needs the ring cleared, as
  the docs and the partner say.
- Fixed: the ring reveal kept running on the body after leaving the page; the try-on countdown
  could render on a disposed renderer; a cat photo in the day pages sat above the words.
- The jukebox and the toast respect the phone's home-indicator inset; the gate's answer box gets
  focus on Safari; the sync page no longer overflows a 320 px screen.
- Service worker: direct links to `/media/…` are no longer answered with the app shell.
- Removed dead strings, CSS and exports; two stray `.blend1` files dropped from the repository;
  CI runs on pushes to `main` only; docs brought in line (tests count, portraits, both days).

## 1.5.0 (2026-10-26)

- Fixed: the ring's reveal showed the 3D card instead of the rose (the card's own entrance
  animation kept it visible above the veil).

- Both days corrected by the owner: Yifan drives (Southside gym, Dr. Zou's office, golf, the Rec
  gym, the pool, grocery); Jingyi drives her Tesla, and the Shenzhen Bay stop carries the
  "buy it and I'll marry you" line.

- A jukebox in the corner of every page for Chinese songs (`public/media/music/`, listed in
  `tracks.ts`; hidden until there is one), remembered per device.
- A red mailbox by the fountain: the other one's voice notes (`public/media/voice/notes/`,
  listed in `notes.ts`), newest first, with play buttons.

## 1.4.0 (2026-10-26)

- A day of Jingyi's (`/sz`): Shenzhen on its own clock, Tencent's tower, the metro, lunch,
  Shenzhen Bay, and Coffee and Duoduo waiting by the door of home. A second signpost at the
  west edge of the town leads there. The day page now draws any `Day` (`src/features/days/`).
- Tapping a stop where the person is standing walks you up to them instead of failing.

## 1.3.1 (2026-10-26)

- The tab and home-screen icon is now the two of us in pixels, drawn from the sprites
  (`npm run icon`), instead of the ring.

- The puzzle is always a face: Jingyi pieces Yifan together (5 photos), Yifan pieces Jingyi
  (7 photos); `public/media/portraits/`, more welcome.

## 1.3.0 (2026-10-26)

- Every level is entered on foot: the cleared card now says "step out and walk to the next
  house", the top bar and the list view no longer link to levels, the game tabs are gone, and a
  level address reached any other way goes back to the town (`src/core/door.ts`).

## 1.2.1 (2026-10-26)

- Clean addresses: `jingyifan.love/cs` instead of `jingyifan.love/#/cs`. A `404.html` copy of
  the app shell lets GitHub Pages open any path; links sent with `#/` still work.

## 1.2.0 (2026-10-26)

- A Day in College Station (`#/cs`): a second map of Yifan's day, seven stops with hours and
  stories, a strip that lights the current stop, and Yifan's sprite standing wherever the clock
  there puts him. The engine now takes any map; road and basketball-court tiles; controls shared.
- A signpost in the town square leads there.

## 1.1.0 (2026-10-26)

- Progress codes (`#/sync`): carry progress between our two phones as a short code or link, so
  the partner by the fountain knows how far you got and the letter can open for both.
- The whole site stands on the town's meadow with the time-of-day wash; every heading is a sign.
- Live at <https://jingyifan.love/> from a private repository.

## 1.0.0 (2026-10-26)

- Yi Town: the home is a walkable pixel town with eight houses, Coffee and Duoduo, flags,
  name plates, roof numbers, sounds, a living pond, day and night, an iris into each house.
- Eight levels and the epilogue, the gate, the PWA, the README with a gameplay GIF.

## 0.1.0 (2026-10-24)

- First complete site: home, love map, moments, gomoku, pictionary.
