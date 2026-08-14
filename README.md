# Currently On

Mobile-first PWA to track Music, TV, Movies, Podcasts, and Books, plus a Friends recommendation feed. v1 uses a demo catalog and `localStorage` (no live APIs or accounts yet).

## Run locally

```bash
npm install
npm run dev
```

Open the site on your phone (same Wi-Fi) or Chrome DevTools device mode.

## Install as an app

- **Android Chrome:** a banner may prompt Install, or use the browser menu → Install app / Add to Home screen.
- **iOS Safari:** Share → **Add to Home Screen**. iOS does not show a custom install prompt.

The app runs standalone (`display: standalone`) with its own icon and theme.

## Stack

Next.js (App Router) + TypeScript + Tailwind. Hosted on Vercel. Content catalogs live in `src/lib/catalog.ts` so TMDb / Google Books / etc. can replace the seed data later.

## Checks (GitHub Actions)

Same scope as the Nashville Oktoberfest / Bolt Farm Next.js suite:

| Workflow | What it does |
| --- | --- |
| `CI` | Changed-file ESLint, `next build`, `tsc --noEmit`, npm audit (critical blocks; high advisory), vitest ×4 shards |
| `Security` | gitleaks secret scan on PR/push + weekly |
| `Claude Code Review` | Optional AI PR review when `ANTHROPIC_API_KEY` is set |
| `E2E Smoke` | Playwright against production every 6h / on demand (not a PR gate) |

```bash
npm run check   # tsc --noEmit
npm test        # vitest
npm run test:e2e  # needs `npx playwright install chromium`
```

## Demo data

Tracked lists, ratings, notes, diary, notifications, and the friends feed persist in the browser. Clearing site data resets the demo.

## Next steps / cloud handoff

See [HANDOFF.md](./HANDOFF.md) for what shipped, file map, and the ordered backlog (Supabase, live catalogs, social, push). Use that file when continuing this repo in a Cursor cloud agent.
