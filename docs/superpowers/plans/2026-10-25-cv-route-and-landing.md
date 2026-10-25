# CV route + landing page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the CV to `/cv`, the services page to `/services`, and put a minimal two-door landing page with live, parallaxing previews at `/`.

**Architecture:** Plain static files on GitHub Pages (no build step yet; the Actions deploy arrives in design task 4). The landing page is one `index.html` plus `assets/landing/landing.css` and `landing.js` (vanilla JS, no libraries), with two pre-captured preview images. Real `<a href>` links underneath so it works with JS off.

**Tech Stack:** HTML/CSS/vanilla JS; Python 3 `unittest` for static routing checks; the desktop app's built-in browser for captures and visual checks.

**Spec:** `docs/superpowers/specs/2026-10-25-site-revamp-design.md` (design tasks 1 and 2; design tasks 3–5 get their own plans later).

## Global Constraints

- Branches: `feat/cv-route` from `main`; `feat/landing` from `feat/cv-route`. Local only; no push, no merge to `main` (single merge after design task 5).
- Design task 1 is pre-approved by Saad (commit freely). **Design task 2: nothing is committed until Saad approves it in the browser.**
- `/sb` is deleted with no redirect; `/service-growth` is not created.
- Idle background `#E4E2EC`; the two buttons together span 60vw × 40vh.
- Labels: **CV** / "AI/ML engineer · agents in production"; **Services** / "Websites & systems for small businesses".
- CV hover: amber on near-black, Silkscreen label, scanlines, blinking block cursor, stepped pixel border. Services hover: liquid glass (SVG displacement refraction in Chromium; blur + rim fallback elsewhere).
- Parallax up to ~18° tilt, ~6% translate, preview scaled ~1.35×; drift loop + spring bounce-in; reduced motion: no drift or bounce, tilt ≤ 3°.
- Click: ~500 ms zoom-through, then navigate; modified clicks and keyboard behave like normal links.
- Mobile: stacked; tap previews ~0.6 s then navigates; gyro parallax where permitted, never blocking navigation.

## Review Focus

1. Root URL with a hash (`/#work`) → must land on `/cv/#work`, not the landing page. Test: `test_root_forwards_hash`.
2. Back button after the zoom-through (bfcache) → idle state, not a frozen zoom. Handled in `landing.js` via `pageshow`; checked in the browser.
3. Ctrl/Cmd/middle-click or keyboard Enter on a button → normal link behaviour, no animation hijack. Checked in the browser.
4. JS disabled → two working plain links. Test: `test_landing_links_without_js`.
5. Moving straight from one button to the other → previews crossfade with no flash of lavender or a stuck theme. Checked in the browser.

---

### Task 1: CV to `/cv`, services to `/services` (`feat/cv-route`)

**Files:**
- Move: `index.html` → `cv/index.html`; `content.txt` → `cv/content.txt` (first commit of it); `sb/` → `services/`
- Create: `index.html` (temporary redirect to `/cv/`, keeps the hash), `tests/test_site.py`
- Modify: `tools/check_text.py:18`, `tools/preview.py:31` (`SITE` → repo/`cv`), `tools/test_cli.py` (`make_site` writes into `cv/`), `tools/README.md` (paths), `.github/workflows/check-text.yml` (`paths:` → `cv/**`), `.gitignore` (add `Gemfile`, `Gemfile.lock`, `vendor/`, `_site/`, `.bundle/`)
- Outside repo (edit, not committed): `../build/{build.sh,extract.py,check.sh,bundle.py,shell_browser_check.mjs,browser_check.mjs}` paths → `fe_design_complete/cv/…`
- Commit the design doc and this plan here too.

- [ ] **Step 1: Write `tests/test_site.py`** with `test_cv_moved` (`cv/index.html` and `cv/content.txt` exist; root `index.html` is not the bundle), `test_services_moved` (`services/index.html` exists, `sb/` does not), `test_root_forwards_hash` (root contains a script that sets `location` to `'/cv/' + location.hash` when the hash is non-empty).
- [ ] **Step 2: Run** `python3 -m unittest discover -s tests -v`. Expected: FAIL.
- [ ] **Step 3: Do the moves and path edits listed above.** Temporary root: `<meta http-equiv="refresh" content="0;url=/cv/">` plus the hash-forwarding script.
- [ ] **Step 4: Run** `python3 -m unittest discover -s tests -v`, `python3 tools/check_text.py`, `(cd tools && python3 -m unittest -q test_textfile test_cli)`. Expected: all pass, "content.txt is OK".
- [ ] **Step 5: Browser check.** Serve the repo root and open `/cv/`, `/services/` and `/#work`. The CV loads with text from `cv/content.txt` (network request 200) and services renders.
- [ ] **Step 6: Commit** on `feat/cv-route`: "Move CV to /cv and services to /sb→/services; commit content.txt tooling".

### Task 2: Landing page (`feat/landing`, from `feat/cv-route`)

**Files:**
- Create: `assets/landing/cv.webp`, `assets/landing/services.webp` (2560 px wide captures), `assets/landing/landing.css`, `assets/landing/landing.js`
- Replace: `index.html` (the landing page)
- Modify: `tests/test_site.py`

**Interfaces:**
- `index.html` markup contract used by CSS/JS: `<main class="doors">` containing two `<a class="door" data-door="cv|services" href="/cv/|/services/">`, each with `<span class="door-title">` and `<span class="door-sub">`; `<div class="stage"><div class="preview" data-for="cv|services"></div>…</div>` behind the doors; one inline `<svg>` holding `<filter id="glass">` (feTurbulence/feImage → feDisplacementMap).
- `landing.js` toggles `body[data-active="cv|services|"]` and `body.leaving`, and writes CSS custom properties `--rx`, `--ry`, `--tx`, `--ty` on `.stage`. All visuals key off those in CSS.

- [ ] **Step 1: Capture previews.** In the built-in browser, emulate a 2560×1440 viewport.
  - CV: open `/cv/`, press Escape, click the power button, wait for the hero to settle, then capture.
  - Services: capture `/services/` at the top of the page.
  - Save as WebP (quality ~82) under `assets/landing/`. Compare the CV capture with Saad's reference: name, tagline, pixel portrait, "PRESS ANY KEY".
- [ ] **Step 2: Extend `tests/test_site.py`.**
  - `test_landing_links_without_js`: exactly two `a.door`, hrefs `/cv/` and `/services/`.
  - `test_landing_labels`: the exact title and sub copy from the Global Constraints.
  - `test_preview_assets_exist`: both WebP files exist, and each is ≥ 1600 px wide (read with PIL).
  - `test_root_forwards_hash` still passes.
- [ ] **Step 3: Run the tests.** Expected: the new tests FAIL.
- [ ] **Step 4: Build `index.html` and `landing.css`.**
  - **Idle state:** lavender `#E4E2EC`, doors in a flex row, 60vw × 40vh total with a gap, soft radius, calm surface.
  - **Previews:** `.stage` fixed full-viewport with `perspective`. Each `.preview` is `background-size: cover`, `scale(1.35)`, opacity 0 until active.
  - **Motion:** a drift keyframe loop on the preview wrapper and a spring bounce-in on activation.
  - **CV retro theme:** follow the constraint above. Pull Silkscreen and JetBrains Mono from Google Fonts with `display=swap`.
  - **Services glass theme:**
    - Chromium: `backdrop-filter: url(#glass) blur(2px) saturate(1.6)`.
    - Fallback, behind `@supports not` or a JS feature flag: `blur(14px) saturate(1.8)`.
    - Both get an inset specular rim built from gradients and box-shadows.
  - **Mobile:** a `@media (max-width: 760px), (hover: none)` block stacks the doors.
  - **Reduced motion:** a `prefers-reduced-motion` block caps everything per the constraints.
- [ ] **Step 5: Build `landing.js`.**
  - **Pointer tracking:** pointer enter/move/leave on each door. Map the pointer position within the door (−1…1) to the target `rx`/`ry`/`tx`/`ty`, and run a spring-smoothed `requestAnimationFrame` loop with the reduced-motion cap.
  - **Focus:** focus/blur sets the active state without parallax.
  - **Click:** a plain left click (no modifier, button 0) calls `preventDefault`, adds `body.leaving` (zoom-through), then `location.href = href` after 500 ms.
  - **Back button:** `pageshow` with `persisted` clears `leaving` and `active`.
  - **Touch:** on `pointerType === 'touch'` or when there's no hover, a tap activates the preview and navigates after 600 ms. Device orientation drives the parallax where it's available without a permission prompt. On iOS, request permission inside the tap, but navigate whatever the answer.
  - **Glass detection:** check whether `backdrop-filter: url()` is supported (`CSS.supports` plus a Chromium check) and set `html.glass-svg`.
  - **Preloading:** the previews preload on the first `pointermove` or `requestIdleCallback`.
- [ ] **Step 6: Run the tests.** Expected: all pass.
- [ ] **Step 7: Browser check** at desktop (1440×900) and mobile (375×812) sizes:
  - idle state
  - hover on each door, including the parallax
  - crossfade between the doors
  - click zoom-through, then Back
  - Ctrl-click
  - keyboard Tab and Enter
  - reduced motion
  - JS off
  - glass in Chromium

  Fix anything off.
- [ ] **Step 8: Stop for Saad's local approval.** Serve on localhost, send him the URL and screenshots. **Do not commit until he approves.** Then commit on `feat/landing`: "Add two-door landing page at /".
