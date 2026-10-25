# saad-dev.com revamp — design

Date: 2026-10-25 · Owner: Saad Waseem · Repo: `fe_design_complete` (GitHub Pages, CNAME `saad-dev.com`)

## Why

saad-dev.com currently opens straight into the retro CV, and the small-business services page hides at `/sb`.
Saad sells to two different audiences (people hiring an AI/ML engineer, and small businesses buying websites,
systems and automations), so the root should let each visitor pick their door in one move. Separately, the site
is close to invisible to search engines and AI assistants: the CV is a packed bundle whose crawlable HTML is the
title "Bundled Page" and the text "This page requires JavaScript to display". The services page's "future" font
(Moonhouse) is hard to read. This work fixes all three: routing, readability, discoverability.

## Process rules (from Saad — binding)

- Five tasks, each on its own branch. Task 1 branches from `main`; each later task branches from the previous
  task's branch (checkpoint chain): `main → feat/cv-route → feat/landing → feat/services-readability → feat/seo → feat/ai-visibility`.
- **Stop after every task and wait for Saad's approval** before starting the next.
- Task 2 is approved **locally in the browser before any commit** on its branch.
- **Go-live: one merge at the end.** Approval of a task only unlocks the next one. After task 5 is approved, the
  chain is merged into `main` once; nothing is public before that (so `/sb` removal and the temporary root never
  go live on their own). Branches stay local unless Saad asks to push.
- Untracked files: `content.txt`, `tools/` and `.github/workflows/check-text.yml` **are committed in task 1** (see
  there). `Gemfile*`, `vendor/`, `_site/`, `.bundle/` are local Jekyll tooling and are not committed (add to
  `.gitignore`).
- Manual steps Saad must do himself are delivered as Markdown in chat.

## Goals, non-goals, anti-goals

Goals
- Root is a minimal two-door landing page; CV at `/cv`, services at `/services`.
- The hover experience feels alive and physical (strong 3D parallax, motion, themed buttons).
- Services text readable without losing the past→future concept.
- Google and AI assistants can read, understand and quote who Saad is, what he sells and for how much.

Non-goals
- Redesigning the CV or the services page beyond what is listed here.
- Analytics, cookies, consent banners.
- A blog.
- Marketplace profiles (Upwork/Fiverr/Contra) — explicitly skipped.

Anti-goals (a failure even if it "works")
- The CV or services page looking different after the move or the unbundle.
- A landing page that feels busy: anything beyond the two buttons in the idle state.
- Any claim about Saad that isn't already public on the CV (no client names, results or testimonials; Maiden
  Century's AI Reports only as "lead developer" role, never as an endorsement).
- Hidden-text / cloaking SEO tricks.

---

## Task 1 — CV moves to `/cv` (`feat/cv-route`, from `main`)

- `index.html` (root) → `cv/index.html`, unchanged otherwise.
- The CV fetches `content.txt` by relative path, so from `/cv/` it requests `/cv/content.txt`. **Commit
  `content.txt` as `cv/content.txt`** (Saad's decision: the CV goes live with his latest edited text, and
  github.com editing works as documented in `tools/README.md`). Builder verifies every relative reference in the
  bundle (fetches, fonts, images, links) still resolves from `/cv/` and fixes any that don't.
- `sb/` → `services/` (git mv). `/sb` is **deleted** — no redirect (Saad's explicit choice, knowing sent links 404).
  `/service-growth` is not created either.
- Root temporarily becomes a tiny page that forwards to `/cv` (replaced in task 2), so the branch is deployable.
- Hash forwarding (kept permanently in task 2): if the root URL has a hash (`saad-dev.com/#work`), replace
  location with `/cv` + same hash. Bare root shows the landing page.
- Update any absolute URLs inside the pages (canonical, `og:url`, internal links to `/sb`) to the new paths.
- Commit `tools/` and `.github/workflows/check-text.yml` too, with paths updated to `cv/index.html` and
  `cv/content.txt` (code, README and workflow `paths:`); the check must pass. The external `../build/` harness
  (`bundle.py`, `extract.py`, `check.sh`, browser checks) hard-codes `fe_design_complete/index.html` and
  `fe_design_complete/content.txt`: update those paths so it keeps working (it lives outside the repo; edit in
  place, not committed here).

## Task 2 — Landing page at `/` (`feat/landing`, from `feat/cv-route`)

Idle state
- Background: soft lavender-grey `#E4E2EC`, nothing else on the page except the two buttons.
- Two side-by-side rectangular buttons with soft corners. **Together** they span 60% of the viewport width and
  40% of its height, centred, with a modest gap.
- Labels (word + one-line sub; copy is the builder's, Saad may tweak):
  - **CV** — "AI/ML engineer · agents in production"
  - **Services** — "Websites & systems for small businesses"
- Idle button styling is the builder's call, but must be calm and match the soft background (e.g. slightly
  lighter/darker lavender surface, soft shadow, dark grey text).

Hover — background
- The page background becomes a full-bleed screenshot of the hovered button's destination, filling the entire
  viewport (`cover`, scaled ~1.35× so edges never show while moving).
- "Alive": a slow continuous drift/zoom loop (Ken-Burns-like), plus a springy bounce-in when the hover starts.
- **Very strong 3D parallax** driven by cursor position while over the button: preview tilts up to ~18° in X/Y and
  translates ~6% of viewport against the cursor, with eased/springy follow. Perspective on the container.
- Crossfade between previews when moving from one button straight to the other; back to lavender on leave.
- `prefers-reduced-motion`: same states, but no drift loop, no bounce, tilt ≤ 3°, short fades.

Hover — buttons
- **CV → retro**, matching the CV's own terminal UI: amber on near-black, Silkscreen pixel font for the label
  (sub-line may use JetBrains Mono like the CV), scanlines, blinking block cursor, chunky stepped pixel border.
- **Services → liquid glass**: very transparent, background visibly refracted at the edges, specular rim
  highlight. Chromium: SVG `feDisplacementMap` via `backdrop-filter: url(#…)`. Safari/Firefox: graceful
  fallback of strong `backdrop-filter: blur()` + saturation + specular rim + inner edge shading. Must still look
  deliberate in the fallback.

Click
- Zoom-through (~500 ms): preview scales up to fill/settle, buttons fade, then navigate. Must not block
  middle-click / ctrl-click / keyboard Enter (real `<a href>` underneath; animation only on plain left click).
- Back-button (bfcache) return must restore the idle state, not a frozen mid-transition.

Mobile / touch (no hover)
- Buttons stack vertically (each full available width, sensible height).
- Tap: show that button's preview + themed style for ~0.6 s, then navigate.
- Parallax driven by device orientation where permitted (iOS needs a permission prompt — builder decides whether
  to request it on first tap or skip gyro on iOS; never block navigation on it). Static preview otherwise.

Preview images
- **CV**: capture at 2560 px wide with a real browser: open `/cv`, press Escape, click the power button, wait for
  the hero to settle (Saad's reference screenshot: name "SAAD WASEEM", "I ship agents. Not notebooks.", pixel
  portrait, "PRESS ANY KEY"). Show the capture to Saad before using it.
- **Services**: the hero, top of page, as it first loads, same width.
- Ship as optimised WebP (with JPEG fallback if cheap) under `assets/landing/`; preload on first pointer movement
  or idle so the first hover isn't blank.

Accessibility / basics
- Real links, visible focus states (focus triggers the same themed state, without parallax), sensible `<title>`
  and meta description (SEO details finalised in task 4), works with JS off as two plain links.

Approval
- Run locally (static server), Saad reviews in the browser; only after his OK is anything committed on this branch.

## Task 3 — Readable `/services` (`feat/services-readability`, from `feat/landing`)

- Replace **only Moonhouse** (the "future" font, `MF` in `services/site/type5.js` and the `@font-face`). Zaslia
  stays.
- Selection: build a throwaway comparison showing the same real section set in 3–4 candidates — Michroma,
  Unbounded, Syncopate, Lexend Exa (builder may swap one for a better match). Saad picks. Self-host the chosen
  font (woff2) rather than adding another Google Fonts dependency at runtime, unless already loaded.
- Retune the per-role size multipliers / stroke / letter-spacing in `type5.js` (`K.m`, `SW.m`, `LS.m`) for the new
  font so layout doesn't jump on the swap.
- Colors: **contrast only, same palette.** Body text ≥ 4.5:1, large text ≥ 3:1 (WCAG AA) in both "past" and
  "future" states; strengthen headings within existing hues.
- The word-by-word flicker swap stays exactly as is.

## Task 4 — Google SEO (`feat/seo`, from `feat/services-readability`)

Audiences, all four: US small businesses; startups/tech hiring an AI/agent developer; Pakistan/local clients;
recruiters searching Saad's name.

Unbundle the CV
- **Source = the newest `../build/work/template.html`** (Saad's decision), unpacked into real files inside the
  repo: `cv/index.html` with the actual markup, CSS and JS as separate files, assets as files. From then on those
  in-repo files are the source of truth and are edited directly; `build/bundle.py seal` is retired, and the
  `../build/` test harness is repointed at the unpacked files so its suites still pass. Must render identically
  to the current shipped CV (compare screenshots of key states before/after; any differences that come from
  template.html being newer are listed for Saad) and keep every interaction and the `content.txt` mechanism
  working.
- **Keeping baked text in step with `content.txt`: GitHub Actions build.** Switch Pages to deploy via a GitHub
  Actions workflow that, on every push to `main`, bakes `cv/content.txt` into the served CV HTML, the case-study
  pages and `llms-full.txt`, then deploys. Editing `content.txt` on github.com keeps working with no local step.
  The bake script also runs locally for previews. Manual step for Saad: Settings → Pages → Source: GitHub
  Actions (Markdown in chat). The runtime `content.txt` fetch stays as-is.
- Real `<title>`, description, canonical, OG/Twitter tags. All CV text present in the served HTML or a
  semantic, visible-on-request equivalent (e.g. the F4 PLAIN view rendered server-side in the markup) — no hidden
  text.

New pages (theme follows the area they belong to)
- Mapping to the existing six cards on `/services` (titles unchanged; each card gains a small "from $X" line and a
  link to its page): 01 Websites → Websites & online stores · 02 Business systems → Business systems · 03 AI
  assistant → Claude for Small Business setup · 04 Automations → AI automations & custom agents · 05 Mobile control
  → Mobile control panel / app · 06 Growth → Growth & marketing automation.
- Six service pages under `/services/…`, in the `/services` visual theme, each with what it is, who it's for,
  what's included, "from" price, process (free 20-min audit → fixed quote → 50% up front / 50% on delivery → 2
  months support), and a booking CTA:
  - Websites & online stores — from $200
  - Business systems (CRM / invoicing / assets on your own computer) — from $600
  - Claude for Small Business setup — from $250
  - AI automations & custom agents — from $400
  - Mobile control panel / app — from $600
  - Growth & marketing automation — from $300
- Case-study pages under `/cv/work/…`, in the CV's retro theme, one per CV WORK card. Sources: the CV text plus
  the **public README of each linked GitHub repo** (architecture, stack, tests). Still no client names, results or
  testimonials beyond what those public sources state. Link to the repos.
- Both sets reachable by normal links from their parent page.

Technical
- Per-page titles/descriptions targeting the audiences above; `sitemap.xml`; `robots.txt`; canonical URLs; OG
  images; JSON-LD basics (WebSite, Service + Offer on service pages, CreativeWork/Article on case studies,
  BreadcrumbList); image sizing and lazy loading; font-display; no render-blocking where avoidable.
- Jekyll: GitHub Pages runs Jekyll; add `.nojekyll` or `_config.yml` excludes as appropriate so source/tooling
  folders aren't published unintentionally.
- No analytics.

Manual steps for Saad (Markdown in chat): Google Search Console (DNS verification, sitemap submit, URL inspection
for key pages), Bing Webmaster Tools (import from GSC, sitemap, IndexNow optional), and a note on Google Business
Profile eligibility.

## Task 5 — AI-assistant visibility (`feat/ai-visibility`, from `feat/seo`)

- `robots.txt`: explicitly allow GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot,
  Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, plus `*`.
- `/llms.txt` (concise index: who, what, prices, links) and `/llms-full.txt` (full plain-text of key pages).
- JSON-LD `Person` (Saad Waseem, Lahore, Pakistan; jobTitle; knowsAbout: LangGraph, MCP, Claude agents, RAG,
  automation…) and `ProfessionalService` with `sameAs`: github.com/s-wasim, linkedin.com/in/s-waseem only; email
  saad@saad-dev.com. One consistent one-line positioning statement reused verbatim across site, llms.txt and
  the suggested bios.
- FAQ blocks (visible, with `FAQPage` markup) on the services hub, inside the CV's **F4 PLAIN view** (which is
  baked into the HTML; the terminal look is untouched), and on the `/cv/work/…` case pages, answering questions
  assistants get,
  e.g. "How much does an AI automation for a small business cost?", "Who is an independent AI agent developer
  I can hire?".
- Manual steps for Saad (Markdown in chat): matching LinkedIn headline/About and GitHub bio + profile README text,
  and where to get credible third-party mentions.
- Claim rules from the anti-goals apply.

## Left to the builder

Exact copy (within the claim rules), idle button styling, easing curves, animation libraries (GSAP is already
used on `/services`), file layout for the landing assets, image formats, the throwaway font comparison page,
JSON-LD shapes, and how to unbundle (as long as the result looks and behaves identically).

## Builder calls (settled without Saad; flag if wrong)

- Local Jekyll tooling (`Gemfile*`, `vendor/`, `_site/`, `.bundle/`) goes in `.gitignore`.
- With the Actions deploy, Jekyll is not used for publishing; the workflow uploads the built static site.
- The temporary task-1 root page is a plain redirect to `/cv` (never public, given the single merge).

## Open questions

None. The builder check's questions were answered by Saad on 2026-10-25 and are folded in above.
