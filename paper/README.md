# Paper and Report

The current manuscript is **version 2** (24 November 2026) of **MERIDIAN: Memory-Encoded Rituals for Intimacy across Distance in an Interactive, Asynchronous Neighbourhood**, by Jingyi Chen and Yifan Yang (corresponding author: yifan@jingyifan.love).

Version 1 (30 October 2026) is on arXiv as [arXiv:2610.41776](https://arxiv.org/abs/2610.41776) (cs.HC and cs.CY; CC BY 4.0). Version 2 is prepared here and **has not yet been submitted to arXiv as a replacement**; both authors need to read and approve it first.

The paper reports a design case. It does not report a recipient evaluation or a measured effect on intimacy. Version 2 extends the record by four weeks: the dashboard and everything on it (the infirmary, the trip page, the request box with its server and its answering pipeline, the MotionMirror card and the seed tile), how the site is updated while in use, and what these do to the first version's claims. Its Section 7 describes each of these systems technically: data, rules, data flows and tests. It reports that the recipient sent requests and nothing of what they contain. Its last section lists the changes.

```bibtex
@misc{chen2026meridian,
  title         = {{MERIDIAN}: Memory-Encoded Rituals for Intimacy across Distance in an Interactive, Asynchronous Neighbourhood},
  author        = {Chen, Jingyi and Yang, Yifan},
  year          = {2026},
  eprint        = {2610.41776},
  archivePrefix = {arXiv},
  primaryClass  = {cs.HC},
  url           = {https://arxiv.org/abs/2610.41776}
}
```

| File | Contents |
|---|---|
| [meridian.pdf](meridian.pdf) | Version 2: 27 pages, 25 figures, 11 tables and 42 cited references. |
| [meridian.tex](meridian.tex), [references.bib](references.bib) | Canonical manuscript and bibliography. Edit these files for subsequent revisions. |
| [review/2026-10-29/](review/2026-10-29/) | The 29 October review report, its evidence and change record, and the figures the manuscript uses. |
| [review/2026-11-24/](review/2026-11-24/) | Version 2: what was re-verified, and the check of every reference against its primary record. |
| [versions/](versions/) | One folder per version: the PDF and the arXiv source archive as fixed, with checksums and the steps to submit. |
| [arxiv/](arxiv/) | Generated standalone source, bibliography, preview PDF, upload archive and metadata. |
| `report-zh.pdf`, `report-zh.html` | Original Chinese feature report and its source; not updated by the manuscript review. |
| `figures/` | Original figures used by the Chinese report. Reviewed figures are stored separately. |

## Rebuild the Manuscript

With a TeX installation containing `acmart`, `CJKutf8` and the Arphic fonts, run from `paper/`:

```bash
pdflatex meridian
bibtex meridian
pdflatex meridian
pdflatex meridian
```

The existing TinyTeX installation may require adding its `bin/universal-darwin` directory to `PATH`.

## Rebuild the arXiv Draft

```bash
python3 arxiv/make_arxiv.py
cd arxiv
pdflatex meridian
bibtex meridian
pdflatex meridian
pdflatex meridian
cp meridian.pdf meridian-preview.pdf
python3 make_arxiv.py --pack
```

The generator copies the canonical text and only referenced reviewed figures. It does not restore the former manuscript through text substitutions. The source archive includes both `.bib` and `.bbl`; arXiv currently supports bibliography processing from `.bib` and accepts a matching pre-generated `.bbl`.

Compilation here uses TeX Live 2026. Read [ARXIV.md](arxiv/ARXIV.md) and inspect the complete generated PDF before uploading.
