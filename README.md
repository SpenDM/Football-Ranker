# Football-Ranker
Web App for Fantasy Football Tools

| Tool | Status |
| --- | --- |
| **Power Rankings**: drag and drop all 32 teams into a 1–32 ranking, letter-grade tiers, or up to 5 saved custom frameworks | Live |
| **Fantasy Roster Manager**: weekly start/sit help (top/bottom offenses and defenses) | Placeholder |
| **Fantasy Draft Manager**: build a draft big board from NFL rosters | Placeholder |

## Architecture

```
pipeline/   Python data pipeline → generates static data/assets for the site
web/        SvelteKit (Svelte 5) static site → deployed as a Cloudflare Worker (static assets)
firestore.rules, firebase.json   Firebase Auth (Google) + Firestore for per-user data
```

- **Every action is saved to localStorage** under `ffr:v1:*` keys: active framework, placements per framework, preset edits, custom frameworks, and editor state.
- **Signed-in users** also get their custom frameworks synced to Firestore (`users/{uid}`, max 5, enforced by the security rules).
  - Frameworks created while signed out are merged into the account on login.
  - Signing out removes the account's frameworks from the browser.
- **Firebase is optional** at build time: without the `VITE_FIREBASE_*` env vars, login is disabled and everything else still works.

## Development

### Python pipeline
```sh
cd pipeline
uv sync
uv run python -m football_pipeline.teams   # regenerates web/src/lib/data/teams.json + web/static/logos
uv run pytest && uv run ruff check .
```

### Web app
```sh
cd web
cp .env.example .env        # optional: fill in Firebase config
npm install
npm run dev                 # http://localhost:5173
npm run check               # svelte-check / TypeScript
npm test                    # Vitest unit tests
npm run test:e2e            # Playwright (uses installed Chrome locally)
npm run test:rules          # Firestore rules tests on the emulator (needs JDK 21+)
npm run emulators           # Auth + Firestore emulators; set VITE_FIREBASE_USE_EMULATORS=true
npm run preview:worker      # build and serve through the Worker locally (wrangler dev)
npm run deploy              # build and deploy with wrangler (needs `npx wrangler login`)
```

## One-time setup

### Firebase
1. Create a project at https://console.firebase.google.com and add a **Web app**. Copy its config into `web/.env` and into the Worker's build variables.
2. Turn on **Authentication → Sign-in method → Google**.
3. Create a **Firestore** database (production mode).
4. Put your project id in `.firebaserc`, then deploy the rules: `cd web && npx firebase deploy --only firestore:rules --config ../firebase.json`.
5. Under **Authentication → Settings → Authorized domains**, add your `football-tools.<account>.workers.dev` domain and any custom domain.

### Cloudflare Worker
The site is deployed as an assets-only Worker, configured in `web/wrangler.jsonc`. It has no Worker script: Cloudflare serves `web/build` directly, with `/power-rankings` → `power-rankings.html`, `404.html` for unknown pages, and the cache rules in `static/_headers`.

Connect this GitHub repo under **Workers & Pages → Create → Import a repository** (Workers Builds), then set:
- Root directory: `web`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: `npx wrangler versions upload` (gives PRs preview URLs)
- **Build variables** (Settings → Build → Variables and secrets): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. These are baked in at build time, so they must be build variables, not runtime variables.

The Worker name, `football-tools`, comes from `wrangler.jsonc` and must match the Worker name in the dashboard. CI (`.github/workflows/ci.yml`) runs lint, unit, rules and e2e tests, with the e2e tests served through `wrangler dev`, and validates the Worker config with a deploy dry run.

## Data and trademarks
Team colors and logo URLs come from [nflverse](https://github.com/nflverse). NFL team names and logos are trademarks of their owners. Using them is fine for a personal, non-commercial project; revisit before monetizing.
