# See You in New York (纽约见)

Route `/trip`; the third card on the dashboard. Not a level and no player is needed: it opens
for whoever is looking, straight from the front page.

Jingyi's ticket, booked 2026-11-08: Cathay Pacific CX830, Hong Kong T1 → New York JFK T8 on
2027-02-04 (09:30 → 12:00 local, 15 h 30), and CX831 back on 2027-02-14, Valentine's Day
(13:40 → 18:55 the next day, 16 h 15). Both legs live in `src/core/config.ts` (`config.trip`),
with the AAG Annual Meeting dates; `config.nextMeeting` is the outbound leg as the home page's
countdown and the Love Map's gold line read it.

| File | Role |
|---|---|
| `plan.ts` | `tripState(now)`: which phase we are in (`before`, `out`, `together`, `back`, `after`), what to count down to, and which day of the stay it is by New York's calendar; `legHours`, `arrivesNextDay`; `tripStatus` for the dashboard card |
| `trip.ts` | `renderTrip(root) => cleanup`; the live clock, two boarding passes, the plan; ticks once a second |
| `itinerary.ts` | `ITINERARY`: one entry a day from her landing to her landing back home, each with an optional title and note (zh + en) and its photos from `public/media/trip/` |
| `trip.css` | styles for this page only |

- The clock counts down to boarding, then to landing, then (during the stay) says "day N of 11"
  and counts down to the flight home, then to her landing in Hong Kong. After that it rests.
- Times on the passes are local to each airport; the flight home shows "+1 day".
- The plan is the itinerary, one row a day: the days gone by are dimmed, today wears a heart (New
  York's date), and a day not yet written says "still growing" in a dashed box. Photos under a
  day scroll sideways. The test fails if a listed photo is missing, a day is skipped, or a title
  or note is in one language only.
- The hand-drawn ticket from our first Zoom (CYF925) stays where it was: in the Moments, in the
  level 1 quiz, and in one of the infirmary's notes.

**To write a day:** fill in its `title` and `note` in `itinerary.ts`, in both languages. **To add
photos:** put the JPEGs in `public/media/trip/` (`<date>-<n>.jpg`, at most 1600 px) and list
them under that day. The resting line after the trip (`trip.now.after` in `src/core/i18n.ts`) is
a draft for Yifan to rewrite.
