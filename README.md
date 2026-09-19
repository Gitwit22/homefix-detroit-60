Sprint 2 — Friday: Data + Real Resident Intake
Goal: replace mock data with persistent records.
Architecture to lock first
Lovable Frontend
      ↓
Supabase/Postgres
      ↓
HomeFix Domain Model
      ↓
n8n later for AI/orchestration
For contest speed, I would use Lovable + Supabase instead of introducing another backend.
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
2. Wire the Lovable intake to the database
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
4. Seed 5–8 verified Detroit repair programs
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
Don't build 30 programs.
Five accurate programs are enough for the demo.
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
Electrical       16
Structural       12
Roof              9
Accessibility     6
HVAC              4
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

Cloudflare deployment
----------------------

This project deploys as a Cloudflare Worker using TanStack Start's Nitro
Cloudflare output. The Vite configuration already targets Cloudflare; Wrangler
publishes the generated Worker and static assets from `wrangler.toml`.

```sh
bun install
bun run build
bun run deploy:cloudflare
```

For local Worker testing after a build:

```sh
bun run preview:cloudflare
```

In Cloudflare's dashboard, set the same `VITE_*` variables used locally as
build-time variables. Keep private credentials out of `VITE_*` variables; use
Worker secrets instead:

```sh
bunx wrangler secret put SECRET_NAME
```

The deployment entry point is `.output/server/index.mjs`, and static assets are
served from `.output/public`. Do not configure this as a Pages-only static site,
because the app uses TanStack Start server rendering and server functions.

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
Lovable UI → Data → Intake → AI Triage → Rules → Matching → Passport → Coverage → Intelligence → Overflow → Freeze.

