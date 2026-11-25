# Product Decisions

## 2026-11-24 — Explicit local recovery export

Cloud failure must not prevent a user from backing up projects already stored in this browser. The normal **Back up all projects** operation continues to read cloud and local data. If that read fails, it reports that no complete backup was made and offers a separately named **local-only** export. The local export includes full cached records and images, including recoverable copies hidden after remote deletion. It does not claim to include proposals that were never cached on this device.

This is a UI and read-path change only. The backup format and restore conflict policies are unchanged. No Supabase schema change or production data mutation is required.

Both backup paths wait for local writes that were already queued when the user starts an export. A 50-project reproduction showed that reading IndexedDB immediately could return zero records while those writes were still in progress. Waiting at the backup boundary protects the export without changing the autosave pipeline.

## 2026-11-24 — Product-led daily review

The daily cycle now starts with a complete browser walkthrough using fictional customer data in an isolated environment. Product experience findings and technical defects are recorded separately and ranked together by user value. Visual changes require before/after screenshots and measured task steps or time. Weekly research informs design choices, while independent draft PRs and explicit merge/deploy approval remain the release boundary. This shifts prioritization beyond maintenance without placing test data in the shared production library.

## 2026-11-25 — Click proposal content to edit

Common preview content (cover and overview titles/text, itinerary day topics and activities, and attraction name, description, image, and display highlights) now maps to existing editor controls. A click switches to the matching chapter/day, focuses and highlights the control, and outlines the corresponding preview content. The preview remains live in split mode; a clear action returns to full proposal preview. This is navigation only: proposal data, persistence, and export structures are unchanged. Browser testing uses fictional local data; there is no production data access or migration.
