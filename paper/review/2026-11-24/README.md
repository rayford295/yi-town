# Version 2 Check (24 November 2026)

What was verified for version 2 of the manuscript, and how. The 29 October review in
`../2026-10-29/` remains the record for version 1.

## Software

Run at commit `c1303f4` (version 1.24.0):

- `npm test`: 263 tests in 45 files passed.
- `npm run build`: the strict TypeScript check for the site and the Worker passed; main chunk
  126.76 kB (46.58 kB gzip); precache 51 entries, 363.49 KiB.
- The gate in a real browser (Chromium, 390 px wide): the old remembered pass is ignored, the
  short spellings and a wrong date are refused, a deep link without the password shows the gate,
  the password opens it and is remembered after a reload.
- `src/core/quest.ts` and `src/core/sync.ts` are unchanged since `55440ae`, so the enumeration of
  1,024 progress codes from the first review was not repeated.
- The answering pipeline (`mailflow/`) has no unit tests. On 24 November its parts were exercised
  by hand: IMAP and SMTP login; the DKIM rule against the delivered emails and seven constructed
  headers (a pass inside a comment, inside a quoted string, on another method, for a lookalike
  domain, a failing result); the local models on one real attachment and one constructed hostile
  request; the hosted model's permissions under the scheduler's environment; the outgoing
  message as a dry run. One real request arrived that evening and was stopped at the scope step.
  No request has completed the whole path.

## References

All 44 entries of `references.bib` (41 cited) were checked on 24 November 2026.

- **31 entries with a DOI** were compared with their Crossref records
  (`crossref-check.json`): title, year, author family names in order, and pages where Crossref
  gives them. All agree. The script reported eight differences, each read by hand: accented
  names written in LaTeX (Höök, Hallnäs, Redström, Preguiça); Crossref's own spelling "Griwsold"
  for Griswold and its family name "Crystal Jiang" for L. Crystal Jiang; the article-number page
  form `30:1--30:19`; an HTML entity in one title; and two records for which Crossref holds no
  author or no year (the NIST standard and a thesis).
- **Two arXiv entries** were compared with the arXiv API. `lugaresi2019mediapipe` was missing
  its twelfth author, Wei Hua, in version 1; this is corrected. `zhang2020hands` agrees.
- **RFC 6376** was compared with the RFC Editor's text: title, date, and the three names, which
  the RFC lists as editors; the entry says so.
- **Eleven entries without a DOI** (books, standards, a W3C report) were not re-verified here;
  their status is as recorded in `../2026-10-29/audit/BIBLIOGRAPHY-AUDIT.md`.

`bazarevsky2020blazepose`, added with the technical section, was compared with the arXiv API
(title, year, six authors in order) and agrees.

The five references added in version 2 are `bazarevsky2020blazepose`, `hancock2020aimc`, `jakesch2019aimc`,
`greshake2023injection` and `rfc6376`. A matching record shows that a work exists as cited; it
does not show that the sentence citing it is fair to it. Those sentences were written from
the papers' own abstracts and should be read against them by the authors.

## Privacy

The manuscript, this folder and the commit messages were searched for anything that says what
the recipient's requests are about. The manuscript says that requests were sent and says nothing
of their content.

## The Technical Section (Section 7)

Section 7 was written from the source at commit `fc11108` (and MotionMirror at `80c4fd8`), not
from the READMEs. Three read-throughs produced fact sheets with file and line references, one
for the infirmary, the trip page, the dashboard and the service worker; one for the request
page, the Worker and the mail flow; one for MotionMirror. Constants quoted in the paper were
then checked against the files by hand for the day-phase function, the note draw, the trip's
phase and day rules, the cache settings, and MotionMirror's three detection thresholds, its
tracker constants, the auto-zoom trigger and the scoring rule. Every other constant in the
section rests on the fact sheets and should be spot-checked before a camera-ready version.

MotionMirror's repository states its test count as 28 in its changelog; counting test functions
gives 59, and the paper reports 59. Its tests were not run for this check.
