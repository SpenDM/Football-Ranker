# Football-Ranker
Web App for Fantasy Football Tools

| Tool | Status |
| --- | --- |
| **Power Rankings**: drag and drop all 32 teams into a 1–32 ranking, letter-grade tiers, or up to 5 saved custom formats | Live |
| **Fantasy Roster Manager**: Team mode ranks the top and bottom 10 offenses and defenses (overall, rushing, passing), refreshed weekly. Player mode is next | Live (Team mode) |
| **Fantasy Draft Manager**: build a draft big board from NFL rosters | Placeholder |

## Architecture

```
pipeline/   Python data pipeline → generates static data/assets for the site
web/        SvelteKit (Svelte 5) static site → deployed as a Cloudflare Worker (static assets + Firebase sign-in proxy)
firestore.rules, firebase.json   Firebase Auth (Google) + Firestore for per-user data
```

- **Every action is saved to localStorage** under `ffr:v1:*` keys: active format, placements per format, preset edits, and custom formats.
- **Signed-in users** also get their custom formats synced to Firestore (`users/{uid}`, max 5, enforced by the security rules).
  - Formats created while signed out are merged into the account on login.
  - Signing out removes the account's formats from the browser.
- **Firebase config** lives in `web/src/lib/firebase-config.ts`, which is committed; the values are public identifiers. While its `apiKey` is empty, login is disabled and everything else still works.
 
## Development

### Python pipeline
```sh
cd pipeline
uv sync
uv run python -m football_pipeline.teams   # regenerates web/src/lib/data/teams.json + web/static/logos
uv run python -m football_pipeline.fantasy # regenerates the fantasy data (see below)
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

### Fantasy data
`football_pipeline.fantasy` pulls nflverse's weekly [team](https://github.com/nflverse/nflverse-data/releases/tag/stats_team) and [player](https://github.com/nflverse/nflverse-data/releases/tag/stats_player) stats, plus final scores from the [schedule](https://github.com/nflverse/nfldata/blob/master/data/games.csv). It writes two files:
- `web/src/lib/data/fantasy-teams.json`: Team mode scores, bundled into the app.
- `web/static/data/fantasy-players.json`: weekly PPR points for every QB/RB/WR/TE, for Player mode.

Only regular-season games with a final score count, and every score is per game played, so byes don't count against a team:

| Ranking | Score |
| --- | --- |
| Offense overall | (passing + rushing yards + 10 × points scored) / games |
| Offense rushing / passing | (rushing or passing yards + 10 × that phase's TD and 2-pt points) / games |
| Defense overall | Standard DST fantasy points / games: sack 1; INT, fumble recovery, safety and blocked kick 2; TD 6; points allowed 10/7/4/1/0/−1/−4 |
| Defense rushing / passing | PPR points allowed to opposing rushers, or to passers plus receivers / games (fewer is better) |

`.github/workflows/fantasy-data.yml` runs the pipeline on Tuesdays from September through January and commits any changes to `main`, which redeploys the site:
- **00:00 ET** (04:00 UTC): the midnight run.
- **~07:00 ET** (11:00 UTC): a catch-up run, because nflverse doesn't publish Monday night stats until after midnight.

The sidebar notes when the latest week is still missing games. To refresh by hand, run the workflow from the Actions tab.

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
Team colors, logo URLs and game stats come from [nflverse](https://github.com/nflverse). NFL team names and logos are trademarks of their owners. Using them is fine for a personal, non-commercial project; revisit before monetizing.
