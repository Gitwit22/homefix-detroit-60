# HomeFix Detroit (60)

Build a polished responsive civic-tech web application called HomeFix 313.

Product Purpose

HomeFix 313 helps Detroit residents identify serious home repair needs, build a reusable Home Repair Passport, discover home-repair assistance programs they may qualify for, and understand which repair needs are covered or still unfunded.

The long-term vision is a connected home-repair ecosystem that can move a resident from:

Report → Assess → Qualify → Fund → Repair → Verify

For this first build, focus only on:

Application structure

Navigation

User experience

Responsive UI

Reusable components

Mock/demo data

A complete clickable resident journey

A city/program administrator dashboard

A light mockup of the future contractor overflow system

Do not build authentication, database logic, AI integrations, payment systems, or real external APIs yet.

BRAND & VISUAL DIRECTION

HomeFix 313 should feel:

Trustworthy

Modern

Civic

Detroit-focused

Accessible

Professional

Community-centered

Simple enough for nontechnical residents

It should not look like:

A contractor marketplace

A generic SaaS dashboard

A luxury real-estate application

An official City of Detroit website

Use a clean civic-tech design with:

Large readable typography

Strong accessibility contrast

Rounded cards

Clear status chips

Progress indicators

Large mobile tap targets

Plenty of whitespace

Simple icons

Responsive layouts

Use Tailwind and shadcn/ui components.

Design mobile-first, but make the desktop admin experience strong.

PRIMARY BRAND MESSAGE

HomeFix 313

Snap the problem. Build your Repair Passport. Find a path to getting it fixed.

Supporting copy:

HomeFix helps Detroit residents understand home repair needs, find possible assistance programs, organize required information, and track a path toward repair.

Primary CTA:

Find Repair Help

Secondary CTA:

View Demo Repair Passport

Include a visible disclaimer:

HomeFix provides preliminary guidance and potential program matches. It does not replace a licensed professional inspection or guarantee eligibility, funding, or approval.

APPLICATION STRUCTURE

Create two major application areas:

1. Resident Experience

Main resident navigation:

Home

My Repair

Repair Passport

Coverage Plan

Case Status

Keep resident navigation very simple.

2. Partner / Admin Experience

Admin sidebar:

Overview

Repair Cases

Unmet Needs

Programs

Overflow Jobs

Analytics

Include an easy Demo View Switcher in the header:

Resident View | Partner View

This will be used during a live pitch.

PAGE 1 — LANDING PAGE

Create a polished public landing page.

Hero

HomeFix 313

Snap the problem. Build your Repair Passport. Find a path to getting it fixed.

Buttons:

Find Repair Help

View Demo Passport

Include a visual showing the HomeFix process:

Report → Assess → Match → Repair

Benefit Section

Three cards:

Understand the Problem

Describe the repair and upload photos to receive a preliminary repair assessment.

Find Possible Help

Compare your situation with available home-repair assistance programs.

Keep Everything Together

Build a reusable Home Repair Passport containing repair needs, documents, matches, and progress.

How HomeFix Works

Four visual steps:

Tell us about your home

Describe or photograph the repair

Review possible assistance

Track your repair plan

Include a final CTA:

Start My Repair Assessment

PAGE 2 — RESIDENT INTAKE WIZARD

Create a multi-step wizard with a visible progress bar.

Progress:

Property → Household → Repair → Photos → Review

Step 1 — Property

Fields:

Detroit street address

ZIP code

Owner or renter

Primary residence? Yes/No

Years living at property

Step 2 — Household

Fields:

Household size

Household income range

Primary applicant age

Senior household? Yes/No

Children in household? Yes/No

Accessibility or disability-related repair needs? Yes/No

Keep financial questions clear and non-intimidating.

Step 3 — Repair

Repair categories displayed as selectable cards:

Roof / Water Intrusion

Furnace / HVAC

Plumbing

Electrical

Windows / Doors

Accessibility

Lead / Environmental

Structural

Other

Fields:

Describe the problem

When did it start?

Is the home currently safe to occupy?

Has the issue gotten worse recently?

Step 4 — Photos

Large drag-and-drop / mobile camera upload interface.

Allow multiple mock images.

Show image previews.

Primary CTA:

Analyze My Repair

PAGE 3 — REPAIR ASSESSMENT

Create a strong visual results screen using mock data.

Example assessment:

Possible Repair Category

Roof / Water Intrusion

Priority badge:

HIGH PRIORITY

Preliminary finding:

Visible ceiling water damage may indicate active roof or exterior water intrusion.

Show:

Possible repair category

Priority

Observed concerns

Safety considerations

Recommended next step

Include three mock follow-up questions:

Does water enter only during rainfall?

Is the ceiling sagging or soft?

Is electrical wiring near the affected area?

Make it clear:

Preliminary AI-assisted assessment — professional inspection may still be required.

CTA:

Build My Repair Plan

PAGE 4 — HOMEFIX REPAIR PASSPORT

This should be one of the strongest visual screens.

Header:

HomeFix Passport

Example property:

123 Main Street
Detroit, MI 482XX

Show cards for:

Property

Owner occupied

Primary residence

Detroit property

Years occupied

Household

Household size

Senior household

Income range

Accessibility needs

Active Repair Needs

Roof / Water Intrusion

High Priority

Furnace

Moderate Priority

Document Readiness

Progress bar:

80% Ready

Checklist:

Proof of identity ✓

Proof of ownership ✓

Income verification ✓

Property tax documentation Needed

Repair photos ✓

Assistance

3 Potential Program Matches

Buttons:

View Coverage Plan

Update Passport

Include:

Last updated date

Passport ID

Case status

PAGE 5 — REPAIR COVERAGE PLAN

This is the core HomeFix product screen.

Header:

Your Repair Coverage Plan

Supporting text:

HomeFix compares each repair need with potential assistance resources so you can see what may be covered and where gaps still exist.

Create an overall coverage meter:

Estimated Repair Coverage: 67%

Use a table/cards:

Roof / Water Intrusion

Program:
Detroit Home Repair Program A

Status:
Strong Match

Action:
Review eligibility requirements

Furnace

Program:
Energy Assistance Program B

Status:
Potential Match

Action:
Upload income verification

Lead

Program:
LeadSafe Detroit

Status:
Verification Needed

Action:
Complete household eligibility questions

Electrical

Program:
None identified

Status:
Funding Gap

Action:
Notify me when assistance becomes available

Use clear visual statuses:

Strong Match

Potential Match

Verification Needed

Application Closed

Waitlisted

Funding Gap

Next Best Action

Prominent card:

Upload your property tax documentation to complete your strongest potential repair-program match.

Button:

Upload Document

PAGE 6 — PROGRAM DETAIL

Create a reusable program detail page.

Display:

Program name

Organization

Application status

Repair types covered

General eligibility

Income requirements

Homeownership requirement

Geographic restrictions

Required documents

Application dates

Estimated next steps

Create a section:

Why HomeFix Matched You

Example:

Your property, household, and repair information appear to meet several initial program requirements.

Show:

Potential Match

Include disclaimer:

Final eligibility and funding approval are determined by the individual program.

Button:

Start Next Step

PAGE 7 — CASE STATUS

Create a timeline view.

Header:

Repair Journey

Timeline:

Assessment Created

Complete

Repair Passport Created

Complete

Potential Programs Identified

Complete

Documents Needed

Current Step

Program Referral

Pending

Program Review

Pending

Repair Scheduled

Pending

Repair Completed

Pending

Also show:

Assigned program

Current next action

Last update

Documents outstanding

PAGE 8 — PARTNER / ADMIN DASHBOARD

This should feel like a professional government/nonprofit operations dashboard.

Clearly display:

Synthetic Demo Data

Top metric cards:

148 Demo Households

224 Repair Needs

38 High-Priority Repairs

162 Potential Program Matches

47 Unmatched Repair Needs

Create charts/cards for:

Repair Needs by Category

Roof

HVAC

Plumbing

Electrical

Accessibility

Structural

Lead

Repair Demand by Detroit ZIP Code

Create a visual ZIP-code demand panel or map-style visualization.

Do not require a real map API yet.

High Priority Cases

Create table:

Property

Repair

Priority

Program Match

Case Status

Program Capacity

Show programs with:

Open

Limited

Waitlist

Closed

Unmet Need

Prominent panel:

47 repair needs currently have no identified assistance resource.

Break down:

Electrical: 16

Structural: 12

Roof: 9

Accessibility: 6

Other: 4

Make this section visually important because it demonstrates how HomeFix provides planning intelligence to Detroit organizations.

PAGE 9 — REPAIR CASE DETAIL FOR ADMIN

Create a detailed admin case screen.

Show:

Property

Resident summary

Repair needs

Uploaded photos

Assessment results

Priority

Program matches

Missing documents

Case history

Current next action

Include mock admin actions:

Request Information

Refer to Program

Mark for Review

Create Overflow Job

The buttons do not need backend logic yet.

PAGE 10 — OVERFLOW JOBS — STRETCH FEATURE MOCKUP

This is a future capacity-management feature.

Create a tab called:

Overflow Jobs

Purpose:

When approved repair programs have more work than available contractor capacity, eligible jobs may be prepared for qualified contractors to assess or bid on.

Do not build procurement logic.

Create a table:

Property

Repair Type

Priority

Program

Job Status

Responses

Example:

123 Main St | Roof | High | Program A | Open | 3 Responses

456 Dexter | Furnace | Critical | Program B | Assessment Needed | 1 Response

789 Grandmont | Electrical | High | Program A | Open | 0 Responses

Clicking a job opens a Job Package.

PAGE 11 — OVERFLOW JOB PACKAGE

Show:

Repair Information

Repair category

Priority

Property neighborhood / ZIP

Photos

Preliminary assessment

Proposed scope

Desired completion period

Program Information

Funding program

Administrator

Procurement status

Contractor Actions

Buttons:

Request Site Assessment

Submit Estimate / Bid

Display disclaimer:

Contractor participation would be limited to organizations meeting applicable program and procurement requirements.

This entire section should remain clearly labeled as:

Future / Demo Feature

DEMO DATA

Seed the frontend with realistic synthetic Detroit demo cases.

Example resident:

Name:
Denise Carter

Property:
123 Main Street, Detroit, MI

Household:
3 people

Senior:
Yes

Reported issues:

Roof / Water Intrusion — High

Furnace — Moderate

Electrical — Moderate

Program matches:

Roof Program — Strong Match

Furnace Assistance — Potential Match

LeadSafe — Verification Needed

Electrical — Funding Gap

Clearly mark all resident and dashboard information:

Synthetic Demo Data

UI COMPONENTS TO CREATE

Build reusable components for:

App header

Resident navigation

Admin sidebar

Demo view switcher

Progress wizard

Repair category cards

Status badges

Priority badges

Program match cards

Repair need cards

Document checklist

Timeline

Metric cards

Coverage progress meter

Repair Passport card

Admin data tables

Empty states

Alert banners

Photo upload component

Next Best Action card

RESPONSIVE BEHAVIOR

Mobile resident experience is highest priority.

The intake should work comfortably on a phone.

Cards should stack vertically on smaller screens.

Admin dashboards should become scrollable/responsive while remaining optimized for desktop.

ACCESSIBILITY

Use:

Semantic form labels

Keyboard accessible controls

Clear validation states

Strong color contrast

Icons plus text rather than color alone

Plain-language instructions

Large buttons and tap areas

IMPORTANT DEVELOPMENT RULES

For this initial build:

DO:

Create all pages

Create complete routing

Use mock data

Create reusable components

Make the resident journey fully clickable

Make the admin journey clickable

Make the application presentation-ready

DO NOT:

Add authentication yet

Add Supabase/database tables yet

Add AI API integrations yet

Implement actual eligibility algorithms yet

Build payments

Build contractor verification

Connect government APIs

Build real procurement

Overengineer the contractor feature

The goal is to finish with a polished clickable prototype whose architecture can later accept real data and backend services without redesigning the UI.

The most important demo flow is:

Landing → Intake → Repair Photo → Assessment → Repair Passport → Coverage Plan → Admin Dashboard → Unmet Needs

Build that flow first and ensure every step works before spending time on secondary pages.

Here are the home repair programs
ProgramCurrent statusMain requirementsHow to get into the pipelineCity of Detroit Critical Home RepairOPEN NOW — deadline Sept. 22, 2026 at 5 PMOwn and occupy a single-family Detroit home for at least 1 year; property taxes current or on a payment plan; no City home-repair grant in past 5 years; household must include a child under 18, person 62+, or person with documented disability; income limits apply. 2026 limit is $44,040 for 1 person, $62,880 for 4, $83,040 for 8. Covers serious roofs, plumbing, heating, electrical and accessibility problems. Create a Neighborly account → find Detroit Home Repair Programs → submit the pre-application. The City prioritizes the most critical repair needs. Detroit LeadSafe HousingOPEN NOW — deadline Sept. 22, 2026 at 5 PMOwner, qualifying landlord, or renter applying through the owner; eligible Detroit ZIP code; child under 6 living/regularly visiting or pregnant resident; taxes current/payment plan; no recent City home-repair grant; income limits apply. Example: $58,700 for 1 person, $83,850 for 4. Uses the same Detroit Home Repair Neighborly application. Lead testing/documentation may also be required. Private Sewer Repair ProgramAccepting applicationsHousehold at or below 80% AMI; residential property of 1–4 units; must demonstrate impact from the June 25–26, 2021 flood; property must be in one of the designated impacted Detroit neighborhoods; cannot be in a floodplain; no duplicate benefits for the same repair. Owner-occupants can receive grant assistance; eligible landlords receive forgivable assistance. Apply through the City's online Private Sewer Repair application/Neighborly system. Wayne Metro Weatherization Assistance ProgramOPEN / accepting applicationsLow-income owner or renter; government ID for adults; income documentation or qualifying assistance such as SNAP, TANF, SER or SSI; access to attic/basement. Home generally cannot have been weatherized within the previous 15 years. Serious roof damage, mold, asbestos, knob-and-tube wiring, standing water, etc. can cause a deferral until corrected. Apply through Wayne Metro or call 313-388-9799. This is mainly insulation, air sealing, furnace evaluation and energy-efficiency work—not general structural repair. Habitat for Humanity Detroit – Critical Home RepairLimited openings by neighborhoodOwner-occupied; generally ≤80% AMI; property taxes current/payment plan; qualifying health/safety repair. Repairs can include roofs, siding, gutters, HVAC, windows/doors and accessibility work. Sweat equity may be required. Habitat currently shows Boynton & Oakwood Heights accepting applications, while several other categories are closed. Submit their intake form or call 313-521-6691. Detroit 0% Interest Home Repair LoanProgram is in transition — verify before relying on itTraditionally: own/occupy Detroit home at least 6 months; minimum 560 credit score; taxes current/payment plan; homeowner's insurance or quote; debt-to-income ≤45%; housing ratio ≤35%; ability to repay. Loans traditionally range $5,000–$25,000 at 0%.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/19519d65-f3c6-411d-9650-309ca30ad331).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
