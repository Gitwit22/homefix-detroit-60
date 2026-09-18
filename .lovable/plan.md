# HomeFix 313 — Neighborhood Blueprint Prototype

## Goal
Build a polished, responsive, fully clickable HomeFix 313 prototype using synthetic Detroit resident, repair, program, and partner data. No authentication, database, AI, payments, external APIs, or procurement logic will be added.

## Experience
- Establish the Neighborhood Blueprint system: warm stone canvas, charcoal structure, muted teal actions, brick accents, amber priority states, editorial headings, blueprint lines, and restrained motion.
- Add shared navigation with a prominent Resident View / Partner View switcher, simple resident tabs, desktop partner sidebar, mobile partner navigation, demo-data labels, and a consistent disclaimer.
- Keep the house and address as the central visual anchor; use full-width bands, information rails, dossier layouts, and selective corners instead of nested dashboard cards.

## Resident Journey
- Landing page with editorial property-file composition and Report → Assess → Match → Repair process.
- Five-step intake at `/intake`: Property, Household, Repair, Photos, Review. Form choices and mock uploads remain in browser state while progressing.
- Assessment at `/assessment` with a prominent mock repair photo area, findings, follow-up questions, and safety guidance.
- Digital property dossier at `/passport` with property, household, repair, document readiness, and assistance summaries.
- Visual repair coverage map at `/coverage`, including 67% coverage and the strongest next action.
- Reusable program page at `/programs/$programId` plus `/status` repair timeline.

## Partner Journey
- `/partner` command center with major demand and unmet-need figures, repair-category analysis, Detroit ZIP demand visualization, program capacity, and high-priority cases.
- `/partner/unmet-needs`, `/partner/cases`, `/partner/cases/$caseId`, `/partner/programs`, and `/partner/analytics` for complete navigation and demo workflows.
- `/partner/overflow` and `/partner/overflow/$jobId` as clearly labeled future/demo contractor-capacity dossiers with nonfunctional mock actions.

## Reusable Building Blocks
- App shell, view switcher, resident navigation, partner sidebar, page headers, buttons, status and priority labels.
- Progress rail, repair-category selector, photo uploader, document checklist, timeline, program match rows, coverage meter, property dossier, metrics, tables, alerts, next-action panels, and empty states.
- Centralized typed demo data for residents, repairs, programs, cases, ZIP demand, and overflow jobs.

## Validation
- Verify the priority pitch flow: Landing → Intake → Photos → Assessment → Passport → Coverage → Partner Dashboard → Unmet Needs.
- Check keyboard controls, labels, focus states, touch targets, contrast, reduced motion, narrow-phone layouts, and wide desktop dashboards.
- Confirm every route has unique HomeFix metadata and that all visible navigation/actions lead somewhere meaningful or are clearly marked demo-only.
