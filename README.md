# Currently On

Mobile-first PWA to track Music, TV, Movies, Podcasts, and Books, plus a Friends recommendation feed. Guests use a demo catalog and `localStorage`; signed-in users persist to Supabase.

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

## Auth

Friends requires a Supabase account (magic link or email OTP). Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`).

## Demo / guest data

Without signing in, tracked lists, ratings, notes, diary, notifications, and the friends feed persist in the browser. Clearing site data resets the guest demo. Signed-in data lives in Supabase.

## Next steps / cloud handoff

See [HANDOFF.md](./HANDOFF.md) for what shipped, file map, and the ordered backlog (auth ops, live catalogs, realtime, push). Use that file when continuing this repo in a Cursor cloud agent.
