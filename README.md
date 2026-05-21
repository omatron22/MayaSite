# Maya Database

Personal research project consolidating Mayan hieroglyph data into one searchable web app. Live at [mayasite.vercel.app](https://mayasite.vercel.app).

Pulls together sign catalogs, block transcriptions, grapheme annotations, photographic concordances, and AI-assisted inference on uploaded images. Built to make cross-referencing across published Mayanist sources less painful.

## Stack

- Vite + React 19 + TypeScript
- React Router (SPA)
- Tailwind via classnames
- Turso (libSQL) database, accessed through Vercel Serverless Functions in `api/`
- Roboflow-hosted inference model for the `/scanner` upload tool

## Local dev

```bash
npm install
npm run dev
# → http://localhost:5173
```

Requires `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (or the `VITE_*` variants) in `.env.local` to talk to the live DB.

## Layout

- `src/` — Vite/React app (search UI, detail pages, scanner)
- `api/` — Vercel serverless functions backing the SPA
- `scripts/` — One-off data import / migration / scraping scripts (run with `tsx`). Not part of the deployed app.
- `docs/` — Architecture notes and the ML pipeline overview

## Data sources

This is a research synthesis, not an original dataset. Source attribution lives in the relevant import scripts and on `/about`.
