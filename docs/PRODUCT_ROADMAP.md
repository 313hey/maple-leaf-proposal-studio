# Product Roadmap

## North star

A study tour specialist uploads client requirements, a costing spreadsheet, and an itinerary; the Studio extracts structured facts, assembles a professional editable proposal from trusted content and layouts, and leaves a clear human review before export. Accuracy of prices, dates, inclusions, and client promises takes precedence over generation speed.

## Priorities by user value

| Priority | Product outcome | Delivery focus | Evidence to advance |
| --- | --- | --- | --- |
| Now | Turn costing workbooks into reliable proposal inputs. | Define a canonical cost model (currency, per-person/group costs, quantities, inclusions, exclusions, assumptions, source cell/file). Build deterministic Excel import with sheet/header detection, field mapping, validation, preview, and explicit confirmation. Keep source values and user overrides traceable. | Representative anonymized workbooks; correct totals and currency; invalid/missing values surfaced; no silent change to current quotations; export and restore compatibility. |
| Next | Convert client requirements and itinerary into a complete draft structure. | Add structured brief intake and improve itinerary intake; map extracted requirements, days, destinations, group size, learning goals, and constraints to editable proposal sections. Assemble selected attraction/course content and reusable layouts using deterministic rules first. | Side-by-side source-to-proposal traceability; human acceptance/edit rate; completion time versus current manual workflow; PDF/Word visual review. |
| Later | Add AI assistance where it materially reduces writing work. | Consider extraction of unstructured documents and bilingual drafting after the deterministic pipeline works. Keep price arithmetic, dates, and commitments rule-based. Add source citations, review gates, privacy controls, provider choice, usage limits, and cost estimates before any external model call. | Accuracy on representative held-out files; privacy/security review; measured editing burden; approved API budget and explicit product-owner approval. |
| Ongoing | Keep the Studio dependable and straightforward for real staff. | Run fictional end-to-end browser walkthroughs; fix high-impact usability and reliability problems; maintain backup, offline recovery, and export compatibility. Prioritize these fixes by impact and frequency, not by novelty. | Task success, steps/time, recoverability, and no regression in existing proposal data. |

## Immediate next improvement

Start with a no-AI costing workbook intake specification and prototype. Collect representative, anonymized workbook shapes; inventory sheet names, headers, formulas, totals, currencies, and common exceptions. Then create an import preview that maps cells to the canonical cost model and blocks ambiguous or invalid totals until the user resolves them. Do not upload customer files to an external service or replace existing quote fields automatically.

## Product guardrails

- Keep every imported value linked to its source workbook and sheet/cell where practical; distinguish extracted values, calculated values, and user-confirmed overrides.
- Existing projects remain editable and restorable. New intake must be additive and backward compatible.
- AI is optional assistance, never the authority for arithmetic or client commitments. No paid AI service, production data migration, merge, or deployment without the required approval.
- At least weekly, review current public product examples from mature SaaS, Canva, and professional itinerary tools. Record the verified interaction lesson and the Studio problem it addresses.
