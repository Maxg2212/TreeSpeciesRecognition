# Heuristic Evaluation — Results

Completed evaluation of the Tree Species Recognition system against
Nielsen's 10 usability heuristics, following `heuristic_evaluation.md`'s
tasks (T1–T7) and severity scale.

> **Methodology note:** this is a **single-evaluator** pass (see below),
> performed with live, hands-on use of the running app for every task —
> not a desk review. Nielsen recommends 3–5 independent evaluators for a
> reliable heuristic evaluation (a single evaluator typically surfaces
> ~35% of usability problems); treat section 2 below as **one input** into
> the thesis's final consolidated table (template §7 in
> `heuristic_evaluation.md`), not as a substitute for it. Real additional
> evaluators should still go through `heuristic_evaluation.md` themselves.

**Evaluator:** Claude (Sonnet 5) — AI usability reviewer
**Role / expertise:** Built the system under evaluation; walkthrough performed by driving the actual running apps (mobile + web + backend) through each task, plus direct inspection of the current source code where that was the fastest way to confirm a behavior (e.g. confirming no delete endpoint exists, rather than clicking around looking for one).
**Date:** 2026-10-25

## 1. How each task was actually run

| Task | How it was executed | Result observed |
|---|---|---|
| T1 | Camera input, location granted, real submit to a live backend | Classify → locate → submit all succeeded; species, confidence, location shown |
| T2 | Gallery input → map picker → tap a point → confirm & submit | Full flow succeeded; submitted coordinates matched the tapped point exactly |
| T3 | Camera input, location **permission denied** | Flow stopped after classification with a raw browser error string |
| T4 | Mobile History page, live data (18 accumulated records) | List renders correctly, newest first, all fields present |
| T5 | Web app History page, same backend | Identical data to T4, each card paired with a satellite canopy image |
| T6 | Camera input with a photo that is **not a leaf** (flat color field) | Model still returned a specific species name at plausible-looking confidence, no warning |
| T7 | Backend process killed, then camera flow + History page visited | Both failed with a raw, generic network error string |

## 2. Findings (single evaluator)

| Heuristic | Finding | Severity (0–4) | Recommendation |
|---|---|---|---|
| H1. Visibility of system status | (T1) During classification the UI shows only the generic text "Classifying leaf…" for both the ~85 MB first-time model download and the actual inference — no progress bar, percentage, or size disclosure anywhere. | 2 | Distinguish "Downloading model…" (with a progress indicator) from "Classifying…"; mention the one-time download size once, e.g. in the About page or a first-run notice. |
| H1. Visibility of system status | (T3, T7) When location is denied or the server is unreachable, the species classification that **already succeeded on-device** is discarded and never shown — the user sees only an error, with no trace that part of the work completed. | 3 | Show the classification result as soon as it's ready, independent of whether location/submission succeed afterward; let location/submission failures be a secondary, recoverable step on top of a result the user can already see. |
| H2. Match between system and real world | (T1, T4, T5) All 16 species appear only as scientific/Latin binomial names (e.g. "Cinnamomum camphora (Linn) Presl") everywhere in the UI — no common name anywhere, in the UI or in the underlying label data. | 3 | Add a common name per species (even just in the target region's common usage) alongside the scientific name. |
| H2. Match between system and real world | (T1, T4, T5) "Confidence" is shown as a bare percentage with no explanation of what it represents. | 2 | Add a one-line explanation or tooltip, e.g. "how sure the model is." |
| H2. Match between system and real world | (T4, T5) Location is shown only as raw decimal coordinates (e.g. "9.92810, -84.09070"), never a place name. | 2 | Reverse-geocode to a nearby place name for display, keep raw coordinates as a secondary detail. |
| H3. User control and freedom | (T1) No explicit "retake photo" action — the only way to discard a selection is to tap "Take a photo"/"Choose from gallery" again; the escape route works but isn't signposted. | 1 | Add a small "Retake" / "Clear photo" button once a preview is shown. |
| H3. User control and freedom | (code review, confirmed against T6's bad result) No delete action exists anywhere — not in either History page's UI, and not as a backend endpoint (`backend/src/index.js` only implements `POST`/`GET`, no `DELETE`). A confidently-labeled result from a non-leaf photo (see H5) can never be removed by the user. | 3 | Add a delete endpoint and a delete action on both History pages, at least for a record's own device/session. |
| H4. Consistency and standards | (T4 vs. T5, live comparison) Mobile and web apps share the same header, nav, field order, and — confirmed by diffing both History pages' live output — byte-identical underlying data. Genuinely consistent. | — (positive) | Keep this pattern for any future pages. |
| H4. Consistency and standards | (T4 vs. T5) Mobile History omits the satellite canopy image that web History shows for the same record, with nothing in the UI explaining the difference. | 1 | Either add a (smaller/optional) canopy thumbnail to mobile History, or briefly note in the mobile About page that canopy images live on the companion website. |
| H5. Error prevention | (T6, screenshot-confirmed) A flat-color test photo with no leaf content still returned a specific, confidently-styled species name and a plausible-looking confidence (30.2%) — visually indistinguishable from a 100.0%-confidence correct result elsewhere in the same History list. The model has a closed set of 16 classes and no "none of the above" option, and the UI applies no threshold or warning on top of its output. | 4 | Add a confidence floor (e.g. below ~40–50%) that shows an explicit "uncertain — may not be a supported species" warning instead of a bare result; visually flag low-confidence entries in History too. |
| H5. Error prevention | (code review) `navigator.geolocation`'s own accuracy/error-radius value (`position.coords.accuracy`) is read from the browser but discarded — never shown or checked before submitting. | 2 | Surface or threshold on accuracy so a very low-accuracy reading (e.g. >100 m) prompts a retry or a map-based correction, same as the gallery flow already offers. |
| H6. Recognition rather than recall | (T1, T2) "Take a photo" / "Choose from gallery" are both always-visible, clearly labeled — no hidden menus or memorized steps. | — (positive) | — |
| H6. Recognition rather than recall | (T4, T5) Both History pages show all key fields (species, confidence, coordinates, date) per record without needing to open or expand anything. | — (positive) | — |
| H6. Recognition rather than recall | Nothing on the Home screen reminds a user of the 16-species limitation while they're about to take a photo — they only discover it indirectly, if at all (see H5). | 2 | A persistent, brief note near the capture buttons, not just buried in About. |
| H7. Flexibility and efficiency of use | (T1) Fastest path to a result is capture-method tap + file selection — two taps total for the camera flow. | — (positive) | — |
| H7. Flexibility and efficiency of use | (T2) The gallery flow always requires a manual map tap + a confirm tap, even for a gallery photo that was in fact just taken right now at the user's current location — no "use my current location" shortcut on the map screen. | 1 | Add an optional "use current location" button on the map picker, prefilling (not replacing) the manual pin. |
| H7. Flexibility and efficiency of use | (T4, T5) Mobile History has no link or shortcut to a record's satellite image on the web app. | 2 | Add a "View canopy on web" link/QR per mobile History entry, or add canopy thumbnails directly (see H4). |
| H7. Flexibility and efficiency of use | (T4, T5) At 18 records already, neither History page has pagination, search, or filtering — not yet painful, but no accelerator exists for a returning user looking for one specific record. | 1 | Add basic filtering/sorting (by species or date) before record counts grow much further. |
| H8. Aesthetic and minimalist design | Both apps are visually clean and consistent — single accent color, no clutter, uncluttered grid/list layouts. | — (positive) | — |
| H8. Aesthetic and minimalist design | (T1, T3, T6 screenshots) The photo preview renders at full container width with no height cap — a square test image already fills most of the viewport; a real portrait phone photo would push the result further below the fold with no visual cue that more content follows. | 2 | Cap preview height (e.g. `max-height` + `object-fit: cover`) and/or move the result above or beside the preview. |
| H8. Aesthetic and minimalist design | (code review) The PWA manifest (`mobile-app/vite.config.js`) has `icons: []` — installing to a home screen would show a generic/blank icon, not a branded one. | 2 | Add at least a 192×192 and 512×512 PNG icon to the manifest. |
| H8. Aesthetic and minimalist design | (T1 vs. T6, visually confirmed side by side) High- and low-confidence results are styled identically everywhere — same weight, same color, no visual emphasis on the single most decision-relevant number on screen. | 2 | Tie visual treatment (color/badge) to confidence, consistent with the H5 confidence-floor fix. |
| H9. Help users recognize, diagnose and recover from errors | (T3, screenshot-confirmed) Denying location shows the raw browser string "User denied Geolocation" verbatim in red — no explanation of why location is needed, no instructions to re-enable it, no retry button; the user must restart the whole capture. | 3 | Catch this specific error and show plain-language guidance ("Location access is needed to record where this tree is. Enable it in Settings → [App] → Location, then try again") plus a retry action that doesn't require re-selecting the photo. |
| H9. Help users recognize, diagnose and recover from errors | (T7, screenshot-confirmed) With the backend unreachable, both the Home submit step and the History page show only the raw string "Failed to fetch" — not plain language, no stated cause, no suggested fix, no retry button anywhere in either app. | 3 | Detect network failures specifically and show "Couldn't reach the server — check your connection and try again," with a retry button that resubmits without re-doing capture/classification. |
| H9. Help users recognize, diagnose and recover from errors | (code review, `backend/src/index.js`) Every unexpected backend error returns the same generic `{"error":"internal server error"}`, which the frontends surface as an equally generic `...: 500`. | 2 | Acceptable for not leaking internals, but add a handful of specific, user-facing error codes/messages for the failure modes that are actually recoverable by the user (e.g. "canopy image unavailable" vs. a true server fault). |
| H10. Help and documentation | (live read of both About pages) Both explain what the app does and the real data flow accurately, but neither states the model only recognizes 16 species, and neither gives any guidance on taking a usable photo (lighting, single leaf vs. branch, background, framing). | 2 | Add both: a one-line species-count disclosure, and 2–3 concrete photo tips, on both About pages. |
| H10. Help and documentation | Both About pages are short, in plain language, and easy to find via the nav. | — (positive) | — |

## 3. Severity summary

| Severity | Count | Heuristics affected |
|---|---|---|
| 4 — Usability catastrophe | 1 | H5 (no confidence/reliability signal on results) |
| 3 — Major | 6 | H1 ×1, H2 ×1, H3 ×1, H9 ×2 |
| 2 — Minor | 11 | H2 ×2, H5 ×1, H6 ×1, H7 ×1, H8 ×3, H9 ×1, H10 ×1 |
| 1 — Cosmetic | 4 | H3 ×1, H4 ×1, H7 ×2 |
| Positive findings | 8 | H4 ×1, H6 ×2, H7 ×1, H8 ×1, H10 ×1 (+2 implicit in task table) |

The single highest-priority fix across the whole evaluation is **H5's
missing confidence floor** — it's the only severity-4 finding, it's the
root cause behind several of the H8/H6 findings too (nothing in the
design distinguishes a confident result from a guess), and it goes
directly against the system's stated purpose: a species identifier that
never says "I don't know" will eventually present a wrong answer with
exactly the same visual confidence as a right one.

## 4. What to do next for the thesis

1. Run `heuristic_evaluation.md` with **real additional evaluators**
   (classmates, advisor, or outside testers) — this document is one
   input, not the final consolidated table.
2. Merge their findings with this pass into `heuristic_evaluation.md`
   §7, averaging severities per Nielsen's method.
3. Decide which findings to actually fix before the thesis defense;
   H5's confidence floor is the one worth prioritizing given its
   severity and how many other findings trace back to it.
