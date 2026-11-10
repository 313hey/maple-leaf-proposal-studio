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

## Local data and backups

Projects, attraction records, images, and class templates are saved in the current browser's IndexedDB. Publishing this static website does not upload or synchronize that information. Each computer/browser profile has its own data.

Before moving to a different browser or computer:

1. In the existing browser, export a complete project backup from **Settings → Project Backup & Restore**.
2. Export the attraction-library backup from **Content Library → Attractions & Experiences → More → Backup**.
3. Export class-template data separately from **Content Library → Class Schedule Templates → More → Backup**.
4. Keep the downloaded backup files in a secure location. Open the Pages website in the destination browser and use the matching restore action for each backup.

Restoring project, attraction, and class-template data are separate actions. Avoid selecting replacement/overwrite options unless that is intended.

## Privacy note

This is a static public website. Any text and images included in the published source or build can be viewed by visitors. Do not put customer-specific data, credentials, or confidential material in the repository. User-created proposal data stays in that user's browser unless the user exports and shares a backup.
