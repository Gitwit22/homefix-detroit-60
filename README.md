Sprint 2 — Friday: Data + Real Resident Intake
Goal: replace mock data with persistent records.
Architecture to lock first
HomeFix Frontend
↓
Supabase/Postgres
↓
HomeFix Domain Model
↓
n8n later for AI/orchestration
For contest speed, use the HomeFix frontend with Supabase instead of introducing another backend.
Core tables:
residents
homes
repair_cases
repair_needs
repair_photos
repair_assessments

programs
program_rules
program_repair_types
program_matches

documents
case_events
Reserve—but don't build yet:
contractors
work_orders
bids
job_assignments
Friday build sequence
1. Create the database schema
   IDs and timestamps
   resident → home
   home → repair case
   repair case → repair needs
   repair need → photos/assessment
   case → program matches
2. Wire the HomeFix intake to the database
   Make these persist:
   address
   household
   income range
   ownership
   repair description
   repair category
   safety questions
   photos
3. Make the Passport real
   The HomeFix Passport should now load actual database information instead of demo constants.
4. Seed the verified Detroit repair-program inventory
   Store structured fields:
   name
   organization
   repair_types
   ownership_required
   income_rule
   age/senior_rule
   geography
   application_status
   documents_required
   source_url
   last_verified_at
   Keep current programs, closed or transitioning programs, and funding layers distinct.
   Friday Definition of Done
   You can:
   Start intake → submit → refresh browser → reopen the case → see the same information in the Passport.
   If that doesn't work, do not start AI yet.

Sprint 3 — Saturday: Intelligence + The Ringer
Goal: make HomeFix actually think.
This is your most important sprint.
Feature 1 — Photo + Description Triage
Flow:
Repair submitted
↓
n8n webhook
↓
AI vision/text analysis
↓
Structured response
↓
Save repair assessment
↓
Return results to HomeFix
AI response should be JSON, not free-form text:
{
"repairCategory": "roof_water_intrusion",
"urgency": "high",
"observations": [
"Visible ceiling staining",
"Possible active moisture intrusion"
],
"safetyFlags": [],
"followUpQuestions": [
"Does water enter during rainfall?",
"Is the ceiling sagging?"
]
}
Architecture rule
AI can say:
“This appears consistent with possible water intrusion.”
It should not say:
“Your roof definitely needs replacement.”
Professional inspection remains separate.

Feature 2 — Eligibility Engine
Do not let AI decide eligibility.
Create deterministic rules.
Example:
Program Rule

Owner occupied = required
Detroit address = required
Income <= 80% AMI
Repair category = roof
Application = open
Engine:
Resident/Home
   +
Repair
   +
Program Rules
↓
Strong Match
Potential Match
Verification Needed
Not Eligible
Then AI can explain why.
That distinction will strengthen your pitch:
Rules determine eligibility. AI helps residents understand it.

Feature 3 — Repair Coverage Engine
This is the differentiator.
Don't merely return programs.
Calculate:
Roof
→ Strong Match

Furnace
→ Potential Match

Electrical
→ No resource

Accessibility
→ Verification Needed
Then calculate something like:
67% Repair Coverage
And identify:
Funding Gap
That feeds both the resident experience and government analytics.

Feature 4 — HomeFix Passport
Now make the Passport assemble:
Property
+
Household
+
Repair Needs
+
Assessment
+
Documents
+
Program Matches
+
Coverage
The Passport should persist beyond an individual application.

Saturday Definition of Done
You should be able to demo:
Upload repair → HomeFix analyzes it → eligibility rules run → programs appear → Coverage Plan updates → Passport updates.
That's the core HomeFix demo.
If you reach this point Saturday night, you're in good shape.

Sprint 4 — Sunday Morning: Partner Intelligence
Goal: demonstrate value beyond one resident.
Now build the organizational side.
Generate synthetic demo cases.
Maybe 100–200.
Clearly label them:
Synthetic Demonstration Data
Generate fields like:
ZIP
repair type
priority
program match
coverage status
unmet need
case status
Then calculate:
Partner Dashboard
Total Homes
Repair Needs
High-Priority Repairs
Potentially Covered Repairs
Unmatched Needs
Most Important View
WHERE HELP IS MISSING
Example:
Electrical 16
Structural 12
Roof 9
Accessibility 6
HVAC 4
Also show demand by ZIP code.
This is the part that changes HomeFix from:
“an app residents use”
into:
a home-repair intelligence system.

Sprint 5 — Sunday Afternoon: Overflow Network
P2 / Stretch Sprint
Only start this if everything above works.
Build the smallest possible version.
Admin
Case:
Roof Repair
Program Approved
Contractor Capacity: FULL
Button:
Create Overflow Job
Creates:
work_order
repair_case_id
repair_type
scope
priority
program
status
Contractor Demo View
HF-00182

Roof / Water Intrusion
48205

HIGH PRIORITY

Program Funded

[View Job Package]

[Submit Assessment / Bid]
Contractor enters:
Estimated price
Estimated duration
Notes
Admin sees submitted bid.
That's it.
Don't build
contractor payments
contractor onboarding
licensing verification
background checks
contracts
real government procurement
scheduling
invoicing
Those belong after the competition.

Sprint 6 — Sunday Evening: Freeze + Demo Hardening
At this point:
STOP BUILDING FEATURES.
Run the exact pitch flow repeatedly.
Test Case
Use one fictional resident consistently:
Denise Carter
Detroit homeowner.
Problems:
leaking roof
furnace issue
electrical issue
Demo:
1. Landing
2. Start assessment
3. Enter Denise
4. Upload roof image
5. AI analyzes image
6. HomeFix finds potential programs
7. Passport generated
8. Coverage Plan = 67%
9. Electrical = Funding Gap
10. Partner Dashboard
11. Show aggregate unmet demand
    If Overflow works:
12. Approved roof case
13. Program overloaded
14. Create Overflow Job
15. Contractor submits bid
    If Overflow misbehaves:
    do not show it.
    Mention it verbally as Phase 2.

Sunday QA Checklist
Before you stop:
Intake works on phone.
Intake data persists.
Images upload.
AI failure has fallback handling.
Program matching returns deterministic results.
Passport loads.
Coverage Plan loads.
Dashboard loads.
Demo data clearly says synthetic.
No dead buttons in the primary demo.
No console-breaking errors.
Refreshing pages doesn't destroy the demo.
Demo route does not require you to manually modify the database.
AI has a fallback demo response if the external call fails.
That last one matters.
Build a demo fallback
If the AI provider dies during judging:
if AI_REQUEST_FAILED:
load_saved_demo_assessment
Your pitch should never depend on a live AI call succeeding.

Monday Morning — Submission Only
Monday should contain zero feature development.
Do:
Final smoke test
↓
Production deploy
↓
Verify URL
↓
Submit
↓
Screenshots/video backup
↓
Pitch prep

Deployment
----------

The frontend deploys as a static Cloudflare Pages site. The standalone API
deploys to Render and is the only service with database credentials.

### Render API

Create a Render Blueprint from `render.yaml`, then set:

- `DATABASE_URL` to the HomeFix Postgres connection string.
- `CORS_ORIGINS` to the comma-separated frontend origins allowed to submit
  intake data, such as `https://homefix-detroit-60.pages.dev`.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and
   `R2_BUCKET_NAME` to a private Cloudflare R2 bucket and an object read/write
   API token.

Render supplies `PORT`; do not set it manually. The service health check is
`/health` and intake submissions use `POST /api/v1/intakes`.

Partner intelligence uses deterministic synthetic demonstration data:

- `GET /api/v1/partner-analytics` returns calculated demand, coverage, gap,
  case, ZIP, and modeled-capacity metrics.
- `GET /api/v1/partner-cases/:caseId` returns a generated synthetic case
  dossier or `404` when the ID is outside the current dataset.

These endpoints use `HOMEFIX_DEMO_SEED` (default `3132026`) and do not read
from or write to Neon. Replacing the synthetic fact loader with normalized
resident-case facts does not require changing the dashboard response shape.

### Cloudflare Pages

Create a Pages project from this repository with:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node version: `22.12.0`

Set `VITE_HOMEFIX_API_URL` as a Pages build variable using the Render service
origin, for example `https://homefix-api.onrender.com`. This value is public by
design; do not add `DATABASE_URL` to Cloudflare.

```sh
npm ci
npm run build
```

For local development, use separate terminals:

```sh
npm run dev:api
npm run dev
```

### Sprint 2–3 local setup

Copy `.env.example` to `.env.local` and configure Neon, Cloudflare R2, and the public API URL. Then initialize the database before starting the API:

```sh
npm run db:deploy
npm run dev:api
npm run dev
```

`db:deploy` applies additive Drizzle migrations and idempotently seeds 18 managed Detroit-area records: nine current resident-facing programs, seven closed or transitioning programs, and two non-application funding layers. Program application windows change frequently: verify every official `sourceUrl`, `applicationStatus`, rule threshold, and `lastVerifiedAt` value before a public demonstration. Only records explicitly marked `matchable` enter eligibility and coverage; closed programs, inquiry-only programs, and funding layers remain visible without producing matches.

Repair photos are uploaded through the Render API to a private Cloudflare R2 bucket. Accepted formats are JPEG, PNG, and WebP, with a maximum of five files per repair and 10 MB per file. The API returns short-lived signed image URLs; R2 credentials belong only on Render or in the local API environment and must never use a `VITE_*` prefix. Existing Cloudinary-backed database records continue using their stored URLs, but new uploads are written only to R2.

Import `n8n/homefix-triage.workflow.json` into n8n, set `N8N_HOMEFIX_SECRET`, `OPENAI_API_KEY`, and optionally `HOMEFIX_AI_MODEL`, then set the production webhook URL as `N8N_TRIAGE_WEBHOOK_URL` on Render. HomeFix validates the structured response and uses a conservative category-specific saved assessment if n8n is unavailable, times out, or returns invalid JSON. Eligibility and coverage remain deterministic database services and never depend on AI output.

Run the Sprint 2–3 verification gate with:

```sh
npm run test:sprints
npm run build:api
npm run build
npm run lint
```

Priority hierarchy
Priority
Capability
P0
Persistent resident intake
P0
Repair case + photos
P0
AI preliminary assessment
P0
Rule-based eligibility
P0
Program matching
P0
HomeFix Passport
P0
Repair Coverage Plan
P1
Partner dashboard
P1
Unmet-need analytics
P2
Overflow work order
P2
Contractor bid
P3
Everything else

The kill rule stays simple:
If a P0 feature is unstable, stop all P2 work.
The build sequence is therefore:
HomeFix UI → Data → Intake → AI Triage → Rules → Matching → Passport → Coverage → Intelligence → Overflow → Freeze.

