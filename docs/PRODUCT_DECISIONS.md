# Product Decisions

## 2026-11-24 — Explicit local recovery export

Cloud failure must not prevent a user from backing up projects already stored in this browser. The normal **Back up all projects** operation continues to read cloud and local data. If that read fails, it reports that no complete backup was made and offers a separately named **local-only** export. The local export includes full cached records and images, including recoverable copies hidden after remote deletion. It does not claim to include proposals that were never cached on this device.

This is a UI and read-path change only. The backup format and restore conflict policies are unchanged. No Supabase schema change or production data mutation is required.
