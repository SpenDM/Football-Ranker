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
web/        SvelteKit (Svelte 5) static site → deployed as a Cloudflare Worker (static assets + Firebase sign-in proxy)
firestore.rules, firebase.json   Firebase Auth (Google) + Firestore for per-user data
```

- **Every action is saved to localStorage** under `ffr:v1:*` keys: active framework, placements per framework, preset edits, custom frameworks, and editor state.
- **Signed-in users** also get their custom frameworks synced to Firestore (`users/{uid}`, max 5, enforced by the security rules).
  - Frameworks created while signed out are merged into the account on login.
  - Signing out removes the account's frameworks from the browser.
- **Firebase config** lives in `web/src/lib/firebase-config.ts`, which is committed; the values are public identifiers. While its `apiKey` is empty, login is disabled and everything else still works.

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
cp .env.example .env        # optional: toggles the local Firebase emulators
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
Sign-in is optional and stays off until `web/src/lib/firebase-config.ts` is filled in. One-time setup:

1. In the [Firebase console](https://console.firebase.google.com/), create a project and add a **Web app**. Copy its config into `web/src/lib/firebase-config.ts` and commit it; the values are public identifiers, not secrets.
2. Turn on **Authentication → Sign-in method → Google**.
3. Create a **Firestore** database (production mode). Then deploy the rules (the project id comes from `.firebaserc`):
   `cd web && npx firebase deploy --only firestore:rules --config ../firebase.json`
4. Under **Authentication → Settings → Authorized domains**, add `football.ranker.page` and `localhost`.
5. **Sign-in on browsers that block third-party storage (Safari, Firefox, Chrome with those cookies blocked):**
   - `authDomain` in `firebase-config.ts` is the site's own domain (`football.ranker.page`), not `<projectId>.firebaseapp.com`.
   - The Worker (`web/src/worker.ts`) forwards `/__/auth/*` to `<projectId>.firebaseapp.com`, so the Google popup is served from the site's own domain.
   - In [Google Cloud console → Credentials](https://console.cloud.google.com/apis/credentials), open the project's *Web client (auto created by Google Service)* OAuth client and add `https://football.ranker.page/__/auth/handler` to **Authorized redirect URIs**.

   This is option 3 in Firebase's [redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices).

### Cloudflare Worker
The site is deployed as a Worker, configured in `web/wrangler.jsonc`:
- Cloudflare serves `web/build` as static assets, with `/power-rankings` → `power-rankings.html`, `404.html` for unknown pages, and the cache rules in `static/_headers`.
- Only `/__/auth/*` runs the Worker script (`web/src/worker.ts`), which forwards Firebase's sign-in helper.

Connect this GitHub repo under **Workers & Pages → Create → Import a repository** (Workers Builds), then set:
- Root directory: `web`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: `npx wrangler versions upload` (gives PRs preview URLs)

The Worker name, `football-tools`, comes from `wrangler.jsonc` and must match the Worker name in the dashboard. Attach the domain under the Worker's **Settings → Domains & Routes → Add → Custom domain**: `football.ranker.page`. CI (`.github/workflows/ci.yml`) runs lint, unit, rules and e2e tests, with the e2e tests served through `wrangler dev`, and validates the Worker config with a deploy dry run.

## Data and trademarks
Team colors and logo URLs come from [nflverse](https://github.com/nflverse). NFL team names and logos are trademarks of their owners. Using them is fine for a personal, non-commercial project; revisit before monetizing.
