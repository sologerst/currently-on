# Currently On — cloud handoff

Use this file when continuing in a **Cursor cloud agent** (or any agent) on [sologerst/currently-on](https://github.com/sologerst/currently-on).

## What shipped (v1)

Mobile-first Next.js PWA. Full UI from the product breakdown: home 2×3 tiles, five media categories, Friends, Diary, Calendar, search, On Deck ticker, in-app notifications, PWA install.

- **Repo:** https://github.com/sologerst/currently-on
- **Production:** https://currently-on.vercel.app
- **Vercel team:** `timthinkswellcs-projects` (thinkswell account), project `currently-on`
- **Local path:** `/Users/timothygerst/Projects/currently-on`

Data is **demo catalogs + `localStorage`**. No live APIs, no real accounts, no OS push.

## GitHub checks

Workflows under `.github/workflows/` mirror the Nashville Oktoberfest / Bolt Farm Next.js suite:

- `ci.yml` — quality (lint changed files, build, tsc, audit) + vitest
- `security.yml` — gitleaks
- `claude-review.yml` — optional (`ANTHROPIC_API_KEY` repo secret)
- `e2e-smoke.yml` — Playwright vs `https://currently-on.vercel.app` (schedule / manual)

Optional: mark CI + Security as required status checks on `main` in GitHub branch protection.

## Stack and map

| Area | Where |
| --- | --- |
| Types | `src/lib/types.ts` |
| Seed catalog (swap for APIs) | `src/lib/catalog.ts` |
| Category colors / tabs | `src/lib/categories.ts` |
| Client store | `src/lib/tracker.tsx` (`currently-on-v1` in localStorage) |
| Shell / PWA | `src/components/AppShell.tsx`, `InstallBanner.tsx`, `public/sw.js`, `public/manifest.webmanifest` |
| Screens | `src/components/*Screen.tsx` + `src/app/**/page.tsx` |

Design: light theme, Baloo 2 / Inter / IBM Plex Mono. Colors: Music `#2FAE66`, TV `#E5473F`, Movies `#3E7BFA`, Podcasts `#8B5FBF`, Books `#E0872D`, Friends `#F2B705`.

Do **not** show IMDb / Rotten Tomatoes marks. Keep generic “Look it up” web search.

## Next work (in order)

### 1. Auth + backend (Supabase)

Replace `localStorage` with a real user:

- Auth (email/magic link or OAuth)
- Tables: profiles (display name), tracked items, diary, notifications, recommendations / reactions / comments
- Keep the same UI; swap `useTracker()` internals behind the existing API in `src/lib/tracker.tsx`

### 2. Live catalogs

Keep `getCatalog` / `searchCatalog` / `getItem` as the interface. Wire:

- TV / Movies: TMDb
- Books: Google Books or Open Library
- Podcasts: Podcast Index or Listen Notes
- Music: Spotify or MusicBrainz
- Optional later: Watchmode / Streaming Availability for “where to watch”

Cache server-side (Route Handlers or Vercel) so keys stay off the client.

### 3. Friends as a real social layer

Shared feed, reactions, comments, “add to my list” against Postgres + realtime (Supabase Realtime). First-time display name stays, but it must be tied to an account.

### 4. Push (after data is server-side)

In-app bell already exists. Add Web Push (and later APNs/FCM if native). Scheduled job: upcoming releases vs each user’s tracked list.

## Out of scope until asked

Custom domain, dark mode, React Native rewrite, trademarked review badges.

## How to run

```bash
npm install
npm run dev
```

`npm run build` must stay green before merging.

## Cloud agent notes

- Work on a branch; open a PR into `main` (Vercel auto-deploys `main` to production).
- Do not commit secrets. Put API keys in Vercel env + `.env.local` (gitignored).
- Product spec source: Tim’s “Currently On App Breakdown” doc (Desktop). This file is the engineering continuation of that spec.
