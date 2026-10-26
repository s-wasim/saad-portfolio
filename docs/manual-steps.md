# Manual steps (things only Saad can do)

Do them in this order. Each one takes 5–15 minutes.

## 1. Go live: merge, then switch Pages to the workflow

1. Merge the branch chain into `main` (Claude can do this after your final review; it is one merge of `feat/ai-visibility`).
2. GitHub → **s-wasim/<this repo>** → **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
3. **Actions → Publish site → Run workflow** (only needed the first time; after that every push to `main` publishes).
4. Still in **Settings → Pages**: custom domain `saad-dev.com`, **Enforce HTTPS** ticked.
5. Check: https://saad-dev.com/, /cv/, /services/, /services/faq/, /llms.txt, /robots.txt, /sitemap.xml all load.

From then on, editing `cv/content.txt` on github.com republishes the site by itself (about 1–2 minutes). A red ✗ on the commit means the text check failed and the old version stays live.

## 2. Google Search Console

1. https://search.google.com/search-console → **Add property → Domain** → `saad-dev.com`.
2. Copy the TXT record it shows, add it at your domain registrar's DNS settings, click **Verify** (DNS can take a few minutes to an hour).
3. **Sitemaps** → submit `https://saad-dev.com/sitemap.xml`.
4. **URL inspection** → paste each of these and click **Request indexing**:
   `https://saad-dev.com/`, `/cv/`, `/services/`, `/services/faq/`, `/services/ai-assistant/`, `/services/automations/`, `/services/websites/`, `/cv/work/`.

## 3. Bing Webmaster Tools (feeds ChatGPT search and Copilot)

1. https://www.bing.com/webmasters → sign in → **Import from Google Search Console** (fastest; brings the site and sitemap over).
2. If you skip the import: add `https://saad-dev.com`, verify with the DNS option, submit the sitemap.

## 4. LinkedIn (linkedin.com/in/s-waseem)

Assistants match people across sites by name plus a consistent description. Use the same words everywhere.

- **Headline:** `AI/ML and Data Engineer · Production AI agents (LangGraph, MCP, Claude) · Websites & AI automation for small businesses`
- **About (first paragraph, verbatim):** `I'm Saad Waseem, an independent AI/ML and data engineer in Lahore, Pakistan. I build production AI agents (LangGraph, MCP, Claude) for tech teams, and websites, business systems and AI automations for small businesses.`
- **About (second paragraph):** `Lead developer of AI Reports at Maiden Century: Claude agents over 100GB+ of financial data, three report tiers in production. Six of my agent and data projects are public, each with a case study: saad-dev.com/cv/work`
- **Website field:** `https://saad-dev.com`
- **Featured:** add links to `https://saad-dev.com/services/` and `https://saad-dev.com/cv/work/`.

## 5. GitHub (github.com/s-wasim)

- **Profile → Edit profile:** bio `AI/ML and Data Engineer · production AI agents (LangGraph, MCP, Claude) · Lahore, Pakistan`; website `https://saad-dev.com`; location `Lahore, Pakistan`.
- **Profile README:** create a public repo named `s-wasim` with a `README.md`:

  ```markdown
  # Saad Waseem
  Independent AI/ML and data engineer in Lahore, Pakistan. I build production AI agents (LangGraph, MCP, Claude)
  for tech teams, and websites, business systems and AI automations for small businesses.

  - CV and case studies: https://saad-dev.com/cv/
  - Services for small businesses (fixed prices from $200): https://saad-dev.com/services/
  - Email: saad@saad-dev.com
  ```
- **Pin** the six repos from the CV's WORK channel.
- On each of those repos: **About (gear icon) → Website** = its case page, e.g. `https://saad-dev.com/cv/work/document-pipeline/`, and add topics such as `ai-agents`, `langgraph`, `claude`, `mcp`, `human-in-the-loop`.

## 6. Google Business Profile (optional)

Only worth it for being found in Lahore: you can register as a service-area business there. It does not help US searches, so skip it unless local Pakistani clients matter now.

## 7. Get mentioned elsewhere (the biggest lever for AI chats)

Assistants recommend people that other sites talk about. A few a month is enough:

- Turn each case study into a short post (LinkedIn article, dev.to or Medium) that links to its page on saad-dev.com.
- When a client is happy, ask for a review on LinkedIn (and on Google, if you set up step 6).
- Answer questions where your buyers ask them (LangGraph/MCP communities, small-business forums), linking to the relevant page when it genuinely helps.
- Keep the one-line description identical everywhere (step 4).

## 8. Check in 2–4 weeks

- Search Console → **Pages** (indexed?) and **Performance** (which searches show you).
- Ask ChatGPT, Claude and Perplexity things like "independent AI agent developer in Pakistan", "who can set up Claude for my small business", "AI automation for small business cost". Note what they say and where they got it.
