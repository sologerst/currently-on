# Currently On — cloud handoff

Use this file when continuing in a **Cursor cloud agent** (or any agent) on [sologerst/currently-on](https://github.com/sologerst/currently-on).

## What shipped (v1)

Mobile-first Next.js PWA. Full UI from the product breakdown: home 2×3 tiles, five media categories, Friends, Diary, Calendar, search, On Deck ticker, in-app notifications, PWA install.

- **Repo:** https://github.com/sologerst/currently-on
- **Production:** https://currently-on.vercel.app
- **Vercel team:** `timthinkswellcs-projects` (thinkswell account), project `currently-on`
- **Local path:** `/Users/timothygerst/Projects/currently-on`

## What shipped (auth + Supabase)

- **Supabase project:** `currently-on` (`itmxzrilzvhymbefnwgd`, us-east-1)
- **Dashboard:** https://supabase.com/dashboard/project/itmxzrilzvhymbefnwgd
- Schema + RLS: `profiles`, `tracked_items`, `diary_entries`, `notifications`, `recommendations`, `recommendation_reactions`, `recommendation_comments`
- App: `@supabase/ssr` clients, `src/proxy.ts` session refresh, `/auth/confirm`, magic link + OTP on Friends
- Signed-in users persist via Supabase behind `useTracker()`; guests still use demo `localStorage`

### One-time dashboard / Vercel setup

1. **Supabase Auth URL config** → https://supabase.com/dashboard/project/itmxzrilzvhymbefnwgd/auth/url-configuration
   - Site URL: `https://currently-on.vercel.app`
   - Redirect URLs: `http://localhost:3000/auth/confirm`, `https://currently-on.vercel.app/auth/confirm`
2. **Vercel env** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL=https://itmxzrilzvhymbefnwgd.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` (from project API keys; publishable key preferred)
3. Local: copy `.env.example` → `.env.local` (gitignored).

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
| Seed catalog (non-live kinds + TMDb fallback) | `src/lib/catalog.ts` |
| TMDb provider (server) | `src/lib/providers/tmdb.ts` |
| Open Library provider (server) | `src/lib/providers/open-library.ts` |
| MusicBrainz provider (server) | `src/lib/providers/musicbrainz.ts` |
| Catalog API | `src/app/api/catalog/route.ts` |
| Catalog client helpers | `src/lib/catalog-client.ts` |
| Category colors / tabs | `src/lib/categories.ts` |
| Client store | `src/lib/tracker.tsx` (`currently-on-v1` localStorage for guests; Supabase when signed in) |
| Supabase remote helpers | `src/lib/tracker-remote.ts` |
| Supabase clients | `src/lib/supabase/*` |
| Schema SQL | `supabase/migrations/` |
| Shell / PWA | `src/components/AppShell.tsx`, `InstallBanner.tsx`, `public/sw.js`, `public/manifest.webmanifest` |
| Screens | `src/components/*Screen.tsx` + `src/app/**/page.tsx` |

Design: light cool paper (`#EEF1F4`), Syne / Figtree / JetBrains Mono. Native shell with glass top bar + bottom tabs. Category accents: Music `#1AAA6E`, TV `#E23B45`, Movies `#2F6BFF`, Podcasts `#0D9488`, Books `#D97706`, Friends `#EAB308`.

Do **not** show IMDb / Rotten Tomatoes marks. Keep generic “Look it up” web search.

## Next work (in order)

### 1. Finish auth ops (manual)

Confirm Site URL + redirect URLs + Vercel env, then smoke-test magic link / OTP on Friends.

### 2. Live catalogs

- **TV / Movies (TMDb):** shipped via `src/lib/providers/tmdb.ts` + `/api/catalog`. Server-only env: `TMDB_READ_ACCESS_TOKEN` (preferred) and/or `TMDB_API_KEY`.
- **Books (Open Library):** shipped via `src/lib/providers/open-library.ts` — no API key required.
- **Music (MusicBrainz):** shipped via `src/lib/providers/musicbrainz.ts` — no API key; albums browse with Cover Art Archive fronts; artist detail pulls a primary album cover. User-Agent + cached requests (≤1 req/sec policy).
- Still todo:
  - Podcasts: iTunes Search (no key) or Podcast Index
  - Optional later: Watchmode / Streaming Availability for “where to watch”

Keep seed `src/lib/catalog.ts` for non-live kinds. Keys stay off the client.

### 3. Friends realtime polish

Shared feed already hits Postgres. Add Supabase Realtime subscriptions for new recommendations / reactions / comments.

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
