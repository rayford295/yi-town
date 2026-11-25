# Our Album

Route: `/photos`, the sixth card on the dashboard. Both of us add photos from the phone or the
computer. A vision model reads each photo once, as it arrives, and writes a sentence in Chinese,
one in English, and six to ten tags in both languages. The page finds photos by any of those
words, by a range of days and by who added them. It shows them as a grid by month, or as a
travel map: one pin per place, a dotted line through each trip, and a list of trips that narrows
the grid to one of them. Only the gate stands in front of the page; no player is needed.

## Where the Photos Live

The site is static and its gate is a hash in a public bundle, so private photos cannot sit
behind it. They are kept by a Worker at `photos.jingyifan.love` (`worker/src/photos/`): the
pictures in R2, one row per photo in D1. Every request carries the **album key**, a random
secret that only the Worker and our two devices know. A device gets it once, from a pairing link
`https://jingyifan.love/photos#key=…` (the page takes the key and wipes it from the address bar)
or by pasting it. Pictures are fetched with the key and shown as `blob:` URLs, so no photo has a
public address.

## One Photo, From the Phone to the Album

1. `prepare.ts` reads the EXIF first (`exifr`): when it was taken and where. Drawing on a canvas
   drops the EXIF, so this has to come first. A photo with no camera date takes the file's date
   and says so; either can be corrected by hand in the viewer.
2. It names the photo by the SHA-256 of the original file, so the same photo added twice is kept
   once, and draws two JPEGs: 2400 px for the viewer and 480 px for the grid and the map.
3. The Worker stores both, asks Workers AI to read the small one, and asks OpenStreetMap's
   Nominatim for the city. If the model fails, the photo is kept with no words, and **Look
   again** in the viewer tries once more.

Uploads run one at a time and keep going while the page is redrawn (the language button).

| File | What |
|---|---|
| `photos.ts`, `photos.css` | The page: key panel, toolbar, grid, map, viewer |
| `core.ts`, `core.test.ts` | The photo type, filtering, months, tags, trips, reading the model's reply; shared with the Worker |
| `api.ts` | The album key, calls to the Worker, pictures as `blob:` URLs |
| `prepare.ts` | EXIF, the hash, the two sizes |
| `../../../worker/src/photos/` | The Worker: `handle.ts`, its tests, `schema.sql` |
| `../../../scripts/photos-card.py` | Draws the dashboard card, `public/media/dashboard/photos.png` |

## Trips

`groupTrips` (in `core.ts`) takes the photos that carry a place, oldest first, and starts a new
trip whenever two in a row are more than `TRIP_GAP_HOURS` (72) apart. Distance alone never
splits a trip, since a long hop within a day is a flight. Change the number to taste.
