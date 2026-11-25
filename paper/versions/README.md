# Versions of the Paper

One folder per version of *MERIDIAN*, each holding the PDF and the source archive that was, or is
to be, uploaded to arXiv. The working copy is `../meridian.tex`; nothing in this folder is edited
after its version is fixed. Each version also has a git tag.

| Version | Date | Software inspected | Tag | arXiv | Pages |
|---|---|---|---|---|---|
| [v1](v1-2026-10-30/) | 30 October 2026 | 1.17.0, commit `55440ae` | `paper-v1` | [2610.41776v1](https://arxiv.org/abs/2610.41776v1), announced | 13 |
| [v2](v2-2026-11-24/) | 24 November 2026 | 1.24.0, commit `fc11108`; MotionMirror 0.2.0 | `paper-v2` | not yet submitted | 24 |

## Files

| File | SHA-256 (first 16) |
|---|---|
| `v1-2026-10-30/meridian-v1.pdf` | `279789df1645688b` |
| `v1-2026-10-30/meridian-v1-arxiv-source.tar.gz` | `b49f474f844cd4e7` |
| `v2-2026-11-24/meridian-v2.pdf` | `46b2587163e7decb` |
| `v2-2026-11-24/meridian-v2-arxiv-source.tar.gz` | `12a24a2675fd8bf3` |

The v1 files are the ones in the repository at commit `d007e17`, when the arXiv identifier was
recorded. What changed between the versions is listed in the paper's own section "Changes in
Version 2" and in `v2-2026-11-24/SUBMISSION.md`.

## Adding a Version

1. Edit `../meridian.tex` and `../references.bib`; rebuild as `../README.md` describes, including
   the arXiv archive.
2. Make `vN-YYYY-MM-DD/`, copy in `../meridian.pdf` as `meridian-vN.pdf` and
   `../arxiv/meridian-arxiv.tar.gz` as `meridian-vN-arxiv-source.tar.gz`, and write a
   `SUBMISSION.md` with the abstract and the comments line.
3. Add a row and the checksums above, commit, and tag the commit `paper-vN`.
4. After arXiv announces it, record the identifier in the table.
