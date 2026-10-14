# Phase 2 import validation

Generated 2026-10-14 by `npm run etl`. Overall: ✅ all hard checks pass

| Check | Expected | Actual | |
|---|---|---|---|
| Verses (KJV versification) | 31102 | 31102 | ✅ |
| OT verses | 23145 | 23145 | ✅ |
| NT verses | 7957 | 7957 | ✅ |
| Books | 66 | 66 | ✅ |
| KJV verses with text | ≥ 31,000 of 31102 | 31102 | ✅ |
| BSB verses with text | ≥ 31,000 of 31102 | 31086 | ✅ |
| WEB verses with text | ≥ 31,000 of 31102 | 31095 | ✅ |
| YLT verses with text | ≥ 31,000 of 31102 | 31102 | ✅ |
| ASV verses with text | ≥ 31,000 of 31102 | 31086 | ✅ |
| DARBY verses with text | ≥ 31,000 of 31102 | 31099 | ✅ |
| Every source has license + attribution | 0 | 0 | ✅ |
| Every token references a source | 0 | 0 | ✅ |
| OT verses with Hebrew text | 23145 | 23145 | ✅ |
| NT verses with Greek text | ≥ 7,940 | 7942 | ✅ |
| Tokens whose lemma is missing | ≤ 0.1% | 0 (0.000%) | ✅ |
| Occurrences of H2617A | 240–250 | 245 | ✅ |
| Occurrences of G0026 | 115–118 | 116 | ✅ |
| Hebrew Mal 3:19 maps to English | Mal.4.1 | Mal.4.1 | ✅ |

## Notes

- **Tokens:** 443,081 (Hebrew 305,492, Greek 137,589)
- **Lemmas:** 22,717; Hebrew roots 2,028; lemmas linked to a root 6,443
- **Morphology codes:** 2565
- **Hebrew/English versification differences:** 1974
- **Tokens re-pointed to a sibling sense (sense code absent from brief lexicon):** 696
- **Hebrew words skipped by type (X = LXX-only additions, V = duplicate variants):** {'X': 152, 'V': 4}
- **NT verses without SBLGNT text (later manuscripts)** (15): Mat.17.21, Mat.18.11, Mat.23.14, Mrk.7.16, Mrk.9.44, Mrk.9.46, Mrk.11.26, Mrk.15.28, Luk.17.36, Luk.23.17, Jhn.5.4, Act.8.37, Act.15.34, Act.24.7, Act.28.29
- **NT verses shown from NA28 (STEP data lacks SBL marks)** (27): Mrk.16.9, Mrk.16.10, Mrk.16.11, Mrk.16.12, Mrk.16.13, Mrk.16.14, Mrk.16.15, Mrk.16.16, Mrk.16.17, Mrk.16.18, Mrk.16.19, Mrk.16.20, Jhn.7.53, Jhn.8.1, Jhn.8.2, Jhn.8.3, Jhn.8.4, Jhn.8.5, Jhn.8.6, Jhn.8.7, Jhn.8.8, Jhn.8.9, Jhn.8.10, Jhn.8.11, Rom.16.25, Rom.16.26, Rom.16.27
- **Cross references:** {'cross_references': 344794, 'skipped': 5}
- **Proper names:** {'names': 4250}
- **Church Fathers excerpts (public-domain translations only):** {'kept': 31169, 'excluded_not_public_domain': 59034, 'unmatched_refs': 24}
- **LXX bridge pairs (Abbott-Smith notes):** {'pairs': 4608}
- **Editorial content:** {'people': 50, 'works': 52, 'entries': 0, 'blocks': 0}
- **English source verses outside KJV versification (not imported)** (3): web:Rom.14.24, web:Rom.14.25, web:Rom.14.26
