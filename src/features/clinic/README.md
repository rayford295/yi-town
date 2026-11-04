# The Infirmary (树洞)

Route `/clinic`; a product on the dashboard and a small pink house with a red cross by the
square's north-west corner of the town. Not a level: no lock, no flag, nothing to clear.

Jingyi, 2026-11-03: "以后我受伤了我就不跟你说话了，我就躲进去." This is the place to hide. Whoever
checks in is the patient; the other one is the doctor on duty, and only the doctor's words are
shown.

- **Check-in** asks what hurts: a fight, a hurt, missing them without wanting to go first, or
  just tired. Each check-in is counted on this device (`visits.ts`).
- **Three breaths** (4 s in, 4 s hold, 6 s out), skippable, and skipped under reduced motion.
- **The prescription** is the doctor's letter for that hurt (`prescriptions.ts`), with a "hear
  it" button when `public/media/clinic/<hurt>-<doctor>.m4a` exists.
- **The cabinet** draws one-line notes at random, never the same one twice in a row.
- **The chart** is a private notebook: lines written here are kept in localStorage on this
  device and never sent anywhere.

Both sides are written: four letters and eighteen notes from each of us, as drafts in each one's
voice (2026-11-04), for each of us to rewrite in our own words in `prescriptions.ts`. The test
fails if either patient lacks a letter for any hurt, if a prescription has a different number of
paragraphs in the two languages, or if any line is empty in either.
