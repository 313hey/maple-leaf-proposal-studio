# Maple Leaf Proposal Studio

Maple Leaf Proposal Studio is a browser-based tool for creating bilingual study-tour proposals. It supports project editing, itinerary spreadsheet import/export, attraction and class-template libraries, quote clauses, and PDF/Word export.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

## Deploy to GitHub Pages

The `main` branch is built and deployed by `.github/workflows/deploy.yml`. In the repository settings, enable Pages with **GitHub Actions** as the build and deployment source. The Vite base path is configured for `/maple-leaf-proposal-studio/`.

## Cloud synchronization

The app can use Supabase as a shared backend while keeping IndexedDB as a local cache. Projects, attraction records, class templates, and their images are stored as JSON records in Supabase Postgres. Realtime changes are enabled for the three tables.

This repository's `supabase/schema.sql` intentionally grants **anyone on the internet** read, create, update, and delete access without signing in. That matches the requested public collaboration mode. Do not use it for customer-confidential proposals or private business data. Anyone can modify or delete records; export regular backups.

To enable cloud sync:

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. In the GitHub repository, add Actions variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project's URL and public anon/publishable key. Do not use a service-role or secret key.
3. Deploy the `main` branch. The Studio's **Settings → Shared Cloud → Upload local data** action adds records from the current browser. Matching IDs already in the cloud are skipped, never overwritten.

The first sync is a deliberate user action. When configured, normal project, attraction, and class-template edits are saved to the shared cloud and updates are broadcast to other open browsers.

## Local data and backups

Without the Supabase variables above, projects, attraction records, images, and class templates remain in the current browser's IndexedDB. In cloud mode, IndexedDB remains as a cache and the shared records live in Supabase.

Before moving to a different browser or computer:

1. In the existing browser, export a complete project backup from **Settings → Project Backup & Restore**.
2. Export the attraction-library backup from **Content Library → Attractions & Experiences → More → Backup**.
3. Export class-template data separately from **Content Library → Class Schedule Templates → More → Backup**.
4. Keep the downloaded backup files in a secure location. Open the Pages website in the destination browser and use the matching restore action for each backup.

Restoring project, attraction, and class-template data are separate actions. Avoid selecting replacement/overwrite options unless that is intended.

## Public sharing notice

The Pages website and Supabase endpoint are public. In cloud mode, all records and images are readable and editable by any visitor. Never add service-role keys to the website or repository.
