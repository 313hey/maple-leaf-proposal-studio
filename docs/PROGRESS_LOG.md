# Progress Log

## 2026-11-25

### Product experience

- Verified friction: from a proposal preview, locating a title or itinerary field required leaving preview, finding the chapter, and finding the field. Click-to-edit reduces that route to one preview-content click; browser test confirmed the editor opened on the corresponding field. Before/after screenshots were captured in the local browser on the same fictional Shenzhen proposal.
- Added direct editing for cover/overview text, itinerary topic and activity, and attraction name, description, image, and display highlights. The selected preview content and editor control receive a Maple Leaf red focus outline. A persistent “返回全案预览” action provides a clear route back.
- Browser check: on an isolated localhost origin, clicked a Day 1 morning activity from full preview, verified the matching day/detail controls and focus, changed its text, and confirmed the full preview immediately reflected the change. Clicked the cover title and verified focus on the project-name field. No production data was accessed.
- Efficiency: preview-to-field is one click in the new flow versus three navigation/search actions in the previous workflow; this is a control-path count, not a time benchmark.

### Technical reliability

- Added pure mapping regression tests for cover, overview, day and attraction target keys. Existing project data, images, persistence, and export components are unchanged.
- Validation after implementation: TypeScript check passed; automated tests passed 65/65; production build passed. Browser testing used fictional IndexedDB data on localhost.
- Limitation: the embedded browser uses a narrow viewport, so split mode is disabled there. It verified editor routing and return-to-preview; desktop split highlighting is implemented but was not visually checked at a wide browser viewport. PDF/Word files were not exported because no proposal-page layout or export code changed.
- Draft PR: https://github.com/313hey/maple-leaf-proposal-studio/pull/6 (implementation commit 55d57a6ebb02c05108a4bd928f3d136c2519cdfa). No merge, deployment, or production data change.

## 2026-11-24

### Product experience

- No new interface problem was verified during this documentation-only update. The first scheduled full browser workflow is still pending.
- The daily cycle now records task friction separately from technical failures and requires before/after visual evidence for any UI change.

### Technical reliability

- Audited project loading, cloud synchronization, and complete backup behavior on the latest `main`.
- Identified that a cloud read error blocks the existing full project backup despite cached IndexedDB projects.
- Added an explicit local recovery export path and a regression test for pending edits, cached images, and remotely deleted records.
- Validation: TypeScript passed; 61/61 automated tests passed; production build passed. A local browser with an intentionally unavailable test cloud showed the fallback and exported one cached proposal.
- Draft PR: https://github.com/313hey/maple-leaf-proposal-studio/pull/3 (`codex/offline-backup-clarity`). No production data was accessed, and the PR is unmerged.
- Open risk: the browser check used a test cloud and one local cached project; production Supabase behavior should be checked before approving deployment.
- Special follow-up cycle: reproduced a backup race with 50 queued local saves (immediate backup saw 0; settled backup saw 50). Updated both backup paths to wait for queued writes and added a regression test. TypeScript passed, 62/62 automated tests passed, and production build passed. PR #3 remains draft and unmerged.

### Product process

- Product ownership update: expanded the existing daily 09:00 automation to require an isolated browser walkthrough from fictional customer brief through PDF export, separate UX and technical findings, weekly public-product research, and before/after evidence for UI changes. Added root `AGENTS.md`; revised vision and roadmap around the brief + cost sheet + itinerary goal. No product UI or production data changed in this documentation update.
- Validation of this documentation update: typecheck passed, 62/62 tests passed, and the production build passed. The first scheduled end-to-end browser walkthrough has not run yet.
