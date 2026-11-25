# Version 2: What to Give arXiv

Status: built, not yet submitted. Both authors approve the text before it is replaced.

## Steps

1. Sign in at arxiv.org, open the listing for 2610.41776 under "Articles You Own", choose **Replace**.
2. Upload `meridian-v2-arxiv-source.tar.gz` (delete the files of the previous version first if
   arXiv shows them). It holds `meridian.tex`, `references.bib`, `meridian.bbl`, `README.txt`
   and `figures/`; the processor is pdfLaTeX.
3. Check arXiv's own PDF against `meridian-v2.pdf`: 24 pages, the Chinese text, the new figures
   (10, 11, 17 and 18), the eleven tables, and the 42 references.
4. Title and authors are unchanged. Replace the abstract and the comments with the text below.
5. Categories (cs.HC, cs.CY) and the licence (CC BY 4.0) stay as they are.

## Abstract

How can shared memories become playable structures for partners who live in different time zones, and what becomes of such a gift once it is in use? We present MERIDIAN, a design case of Yi Town, a bilingual browser game developed by one member of a long-distance couple as a gift for the other. Nine levels translate personally meaningful events, places and cultural references into tasks within a navigable pixel town, framed by a birthday prologue and a fictional wedding. This second version extends the record by four weeks. Drawing on research through design, we reconstruct seven design changes from 152 commits, 36 changelog versions and four design specifications. In those weeks the site gained three products that are not levels: an infirmary for the days after a quarrel, which began with a remark by the recipient; a page for her booked flight, which replaces a symbolic ticket with a real one; and a request box whose messages are answered, while the designer sleeps, by a pipeline of a local language model and a hosted one. The request box ends the first version's claim of no author-operated backend, and we trace where her files now travel. An audit reproduced 263 passing unit tests; the progress model is unchanged and keeps its exhaustive check of 1,024 codes. The answering pipeline was tested in parts, and it began to receive real requests on the night it was built. No recipient evaluation or relationship outcome is reported. The contribution is an inspectable account of design decisions and their trade-offs: between authoring a gift and leaving the recipient free to decline or reshape it, and between being reachable across thirteen hours and answering in person. The site is at https://jingyifan.love and its source is public at https://github.com/rayford295/yi-town.

## Comments

24 pages, 18 figures, 11 tables. v2: adds four weeks of record and a technical description of every system on the site (the dashboard, three further products, a server, an automated answering pipeline, the service worker, and a separate pose-analysis program), corrects the claim of no author-operated backend, updates the audit; see the section "Changes in Version 2". Design case; no recipient evaluation reported.

## What Changed since Version 1

- New: Section 5 (the dashboard and everything on it: the infirmary, the trip page, the request
  box, the MotionMirror card, the seed tile); Section 7, a technical description of every one of these
  systems (data, rules, data flows, tests), including the request page's states, the server's
  checks, the answering pipeline's authentication and sandbox, the service worker and caches,
  and MotionMirror's pose pipeline and detection rules; a discussion of answers prepared by a machine; three more
  reconstructed decisions; four figures; six tables; five references.
- Corrected: "no author-operated backend" now holds for progress only; the privacy section
  follows a request's files through the outside parties they reach. One reference of version 1
  lacked an author (MediaPipe, Wei Hua).
- Updated: corpus (147 commits, 36 versions), audit (263 tests), the entry gate, the abstract.
