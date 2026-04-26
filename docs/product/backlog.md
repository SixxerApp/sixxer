# Sixxer Linear Roadmap Index

Linear is now the live source of truth for implementation status, assignees,
issue ownership, and prioritization. This document is the repo-local roadmap
index and original issue seed so AI coding sessions can understand product
intent without rediscovering the dogfood findings.

Live Linear project:

- [Sixxer Product Roadmap](https://linear.app/sixxer/project/sixxer-product-roadmap-c6d950123166)

Use this file when:

- A task does not include a Linear issue but clearly maps to this roadmap.
- A Linear issue needs original product context or acceptance criteria.
- Linear is unavailable and an agent needs a compact roadmap reference.

Do not use this file as the live status tracker. If this document and Linear
disagree on current status, Linear wins.

## Linear Issues

- [SIX-5](https://linear.app/sixxer/issue/SIX-5/p0-fix-admin-visibility-model) - P0: Fix admin visibility model.
- [SIX-6](https://linear.app/sixxer/issue/SIX-6/p0-improve-direct-route-loading-states) - P0: Improve direct route loading states.
- [SIX-7](https://linear.app/sixxer/issue/SIX-7/p1-build-admin-command-center) - P1: Build admin command center.
- [SIX-8](https://linear.app/sixxer/issue/SIX-8/p1-add-event-edit-and-lifecycle-controls) - P1: Add event edit and lifecycle controls.
- [SIX-9](https://linear.app/sixxer/issue/SIX-9/p1-payment-management-v2) - P1: Payment management v2.
- [SIX-10](https://linear.app/sixxer/issue/SIX-10/p1-squad-selection-v1) - P1: Squad selection v1.
- [SIX-11](https://linear.app/sixxer/issue/SIX-11/p1-invite-link-flow) - P1: Invite link flow.
- [SIX-12](https://linear.app/sixxer/issue/SIX-12/p1-player-cricket-profiles) - P1: Player cricket profiles.
- [SIX-13](https://linear.app/sixxer/issue/SIX-13/p1-notifications-v2) - P1: Notifications v2.
- [SIX-14](https://linear.app/sixxer/issue/SIX-14/p2-posts-and-announcements-v2) - P2: Posts and announcements v2.
- [SIX-15](https://linear.app/sixxer/issue/SIX-15/p2-season-and-fixtures-foundation) - P2: Season and fixtures foundation.
- [SIX-16](https://linear.app/sixxer/issue/SIX-16/p2-club-onboarding-checklist) - P2: Club onboarding checklist.
- [SIX-17](https://linear.app/sixxer/issue/SIX-17/p2-calendar-subscription-polish) - P2: Calendar subscription polish.

## Priority Guide

- `P0`: Blocks trust in core workflows.
- `P1`: High-value product capability for captains/admins/players.
- `P2`: Important polish or expansion after the core loop is reliable.

## Linear Task Template

```md
## Problem

What user pain or product gap this solves.

## User Story

As a ..., I want ..., so that ...

## Scope

What should be changed.

## Out Of Scope

What should not be included in this task.

## Acceptance Criteria

- Observable behavior 1.
- Observable behavior 2.
- Tests or validation.

## Validation

Manual and automated checks.
```

---

## P0: Fix Admin Visibility Model

### Problem

Admins can manage team events and payments, but admin home/calendar may not show
the same events visible in team tabs. This undermines trust in the app as the
source of truth.

### User Story

As a captain/admin, I want home and calendar to show all relevant teams I
administer, so I can manage match week without opening every team manually.

### Scope

- Audit queries that power admin home, calendar, team lists, and team event tabs.
- Ensure admin-visible teams are included consistently.
- Preserve player behavior.
- Preserve Supabase RLS expectations.
- Add or update tests for admin visibility.

### Out Of Scope

- New dashboard design.
- New role types.
- Payment collection.

### Acceptance Criteria

- `admin@sixxer.test` sees upcoming events on `/home` when those events appear
  in the administered team Events tab.
- `admin@sixxer.test` sees those same upcoming events on `/calendar`.
- Player home/calendar behavior is unchanged.
- Existing e2e tests pass, with new coverage where appropriate.

### Validation

- Log in as `admin@sixxer.test`.
- Compare `/home`, `/calendar`, and `/groups/:teamId/events`.
- Log in as `player1@sixxer.test` and confirm player views still work.

---

## P0: Improve Direct Route Loading States

### Problem

Some direct or refreshed routes briefly render only the bottom nav or an empty
shell while data loads. Users may interpret this as a broken page.

### User Story

As a user opening a shared link or notification, I want a clear loading state, so
I know the app is working.

### Scope

- Add route-level skeletons/loading states for:
  - Team shell and subroutes.
  - Payment detail.
  - Calendar.
  - Notifications.
- Avoid showing empty states until loading is complete.
- Ensure direct navigation and refresh behave cleanly.

### Out Of Scope

- Data model changes.
- Full redesign of layouts.

### Acceptance Criteria

- Directly opening `/groups/:teamId/events` shows a team/page skeleton before
  content.
- Directly opening `/payments/:paymentId` shows a payment skeleton before
  content.
- Calendar does not flash an incorrect empty state before events load.
- Notifications does not show a misleading empty state while loading.

### Validation

- Refresh each target route while signed in.
- Test on admin and player accounts.
- Add e2e checks for direct route rendering where feasible.

---

## P1: Build Admin Command Center

### Problem

Admin home currently feels passive. Captains need a focused view of what needs
attention before match day.

### User Story

As a captain/admin, I want a command center of urgent team actions, so I can
quickly chase the right people and keep match week moving.

### Scope

- Add an admin-specific section to `/home`.
- Show:
  - Upcoming administered events.
  - Unanswered RSVP counts.
  - Events with low confirmed player counts.
  - Pending payment confirmations.
  - Overdue/unpaid payment counts.
- Link each item to the relevant event or payment detail page.

### Out Of Scope

- Automated recommendations.
- New notification delivery.
- Full analytics dashboard.

### Acceptance Criteria

- Admin home surfaces at least one actionable card when seeded data has pending
  RSVPs or payments.
- Player home remains focused on player actions.
- Action cards link to the correct detail pages.
- Empty admin state guides the admin to create an event, invite players, or
  create a payment request.

### Validation

- Log in as `admin@sixxer.test`.
- Confirm pending RSVP/payment data appears.
- Confirm player account does not see admin-only command cards.

---

## P1: Add Event Edit And Lifecycle Controls

### Problem

Admins can create and cancel events, but cannot clearly edit event details or
manage recurring series after creation.

### User Story

As an admin, I want to edit event details and manage recurring events, so I can
keep fixtures accurate after schedules change.

### Scope

- Add edit entry point from event detail for admins.
- Allow editing one-off event fields:
  - Title.
  - Opponent.
  - Home/away.
  - Start/end/meetup time.
  - Location and map link.
  - Live scoring link.
  - Notes.
- Clarify recurring event behavior:
  - Edit this instance.
  - Future-series editing can be a follow-up if too large.
- Improve cancel/restore confirmation UX.

### Out Of Scope

- Full league fixture import.
- Complex recurrence rule editor.

### Acceptance Criteria

- Admin can edit a one-off event and see the updated detail page.
- Player sees updated event details.
- Existing RSVP data remains attached to the event.
- Cancel/restore flows are clearly confirmed.

### Validation

- Create or use a test event.
- Edit key fields as admin.
- Verify player view reflects changes.
- Run relevant e2e smoke tests.

---

## P1: Payment Management V2

### Problem

Payment requests currently go to all current team members and lack reusable
templates or export support.

### User Story

As a treasurer/admin, I want to create targeted and reusable payment requests,
so I can manage match fees and subs without manual tracking.

### Scope

- Add recipient selection when creating a payment request.
- Add fee category:
  - Match fee.
  - Subs.
  - Kit.
  - Fine.
  - Other.
- Add payment templates for common fees.
- Add CSV export for payment assignments/status.
- Rename player detail label from `Squad` to payment-specific language.

### Out Of Scope

- Real online payment processing.
- Refunds.
- Ledger/accounting system.

### Acceptance Criteria

- Admin can select which team members receive a payment request.
- Admin can choose a category.
- Admin can create from or save a reusable template.
- Admin can export payment status as CSV.
- Player payment detail no longer uses `Squad` as the section label.

### Validation

- Create a payment for selected members only.
- Confirm only selected players see the request.
- Export CSV and inspect columns.

---

## P1: Squad Selection V1

### Problem

Admins can select players and announce a squad, but the workflow does not yet
model cricket match selection deeply.

### User Story

As a captain/selector, I want to build a match squad from available players, so
I can announce a clear team and track who has been selected.

### Scope

- Add selected squad and reserves.
- Mark captain and wicketkeeper.
- Add optional player role notes for the match.
- Show selected status to players.
- Preserve existing announce-squad notification behavior.

### Out Of Scope

- Batting order.
- Bowling plan.
- Selection analytics.
- Player confirmation after selection.

### Acceptance Criteria

- Admin can select squad members and reserves separately.
- Admin can mark captain and wicketkeeper.
- Player can see whether they are selected or reserve.
- Announcement includes selected/reserve status.

### Validation

- Use `admin@sixxer.test` to select a squad.
- Log in as selected and unselected players to verify visibility.

---

## P1: Invite Link Flow

### Problem

Invite codes work, but cricket teams commonly share links in WhatsApp. Codes add
friction and can be mistyped.

### User Story

As an admin, I want to share an invite link, so players can join from WhatsApp in
one tap.

### Scope

- Generate invite links from active invite codes.
- Add copy/share link action.
- Route invite links to join flow.
- Pre-fill or resolve invite code from URL.
- Keep manual code entry as fallback.

### Out Of Scope

- Public club pages.
- Deep native app links beyond current web routing.

### Acceptance Criteria

- Admin can copy an invite link from Members.
- Opening the link as a signed-out user leads through auth and then joins the
  correct team.
- Opening the link as a signed-in user joins the correct team directly.
- Expired or invalid links show a clear error.

### Validation

- Test signed-in and signed-out invite paths.
- Test invalid code path.

---

## P1: Player Cricket Profiles

### Problem

Team members are mostly names today. Captains need cricket-specific information
to select balanced squads.

### User Story

As a captain, I want player cricket profiles, so I can select teams based on
roles and skills.

### Scope

- Add profile fields:
  - Batting style.
  - Bowling style.
  - Primary role.
  - Wicketkeeper flag.
  - Preferred formats or availability notes.
- Display useful profile summary in member list/detail.
- Allow players to edit their own cricket profile.

### Out Of Scope

- Private admin notes.
- Medical/emergency details.
- Stats tracking.

### Acceptance Criteria

- Player can update cricket profile fields.
- Admin can view cricket profile fields.
- Member list or member detail surfaces role information.

### Validation

- Update a player profile.
- Confirm admin sees it.
- Confirm another player only sees intended public fields.

---

## P1: Notifications V2

### Problem

Notifications exist in-app, but the product needs reliable delivery and user
control.

### User Story

As a player, I want important team updates to reach me reliably, so I do not
miss match-week actions.

### Scope

- Store push notification tokens where supported.
- Add push permission onboarding at the right moment.
- Add notification preferences:
  - Event changes.
  - RSVP reminders.
  - Squad announcements.
  - Payments.
  - Posts/polls.
- Improve notification empty state and detail copy.

### Out Of Scope

- SMS delivery.
- Email digest.
- Read receipts.

### Acceptance Criteria

- User can opt into push where supported.
- User can configure notification categories.
- Existing in-app notifications remain visible.
- Push open routes to the relevant app screen.

### Validation

- Test web fallback.
- Test native path when available.
- Confirm preferences are respected.

---

## P2: Posts And Announcements V2

### Problem

Posts are useful but too lightweight for important team communication.

### User Story

As an admin, I want important announcements to stay visible, so players do not
miss key team updates.

### Scope

- Add admin announcement type.
- Allow pinned posts.
- Add optional link attachment.
- Add read receipt foundation for announcements.

### Out Of Scope

- Full chat.
- Comments.
- Media uploads.

### Acceptance Criteria

- Admin can create a pinned announcement.
- Pinned announcement appears above normal posts.
- Players can open and mark/read announcement.
- Read count is visible to admins if read receipts are included.

### Validation

- Create pinned announcement as admin.
- View as player.

---

## P2: Season And Fixtures Foundation

### Problem

Events exist individually, but clubs operate by season, competition, division,
and fixture list.

### User Story

As a club admin, I want to organize fixtures by season, so team history and
operations stay structured.

### Scope

- Add season model.
- Associate events/payments with a season where relevant.
- Add basic season selector/filter.
- Prepare schema for future results and standings.

### Out Of Scope

- League import.
- Results and stats.
- Public pages.

### Acceptance Criteria

- Admin can create/select an active season.
- New events can be associated with the active season.
- Team event list can filter by season.
- Existing events continue to work without a season.

### Validation

- Create season.
- Create event in season.
- Filter event list.

---

## P2: Club Onboarding Checklist

### Problem

New admins can create a club, but the product does not guide them toward the
first successful team workflow.

### User Story

As a new admin, I want a setup checklist, so I know how to get my club live.

### Scope

- Add checklist after club creation:
  - Create first team.
  - Invite players.
  - Create first event.
  - Create first payment request.
  - Share calendar/invite.
- Show progress on admin home until complete.

### Out Of Scope

- Billing onboarding.
- Imported roster.

### Acceptance Criteria

- New admin sees checklist.
- Checklist items complete automatically based on product state.
- Completed checklist can be dismissed.

### Validation

- Create a new test club.
- Complete each checklist action.

---

## P2: Calendar Subscription Polish

### Problem

Calendar sync exists, but loading and subscription management need clearer
feedback.

### User Story

As a player, I want calendar sync to be easy to understand, so I trust that my
fixtures will appear in my calendar app.

### Scope

- Improve loading state.
- Clarify private URL behavior.
- Add last-fetched or active state if available.
- Improve rotate-token explanation.

### Out Of Scope

- Two-way calendar sync.
- Google OAuth calendar write integration.

### Acceptance Criteria

- Calendar does not flash incorrect empty state.
- Subscription card explains privacy and rotation clearly.
- Existing copy/open/rotate actions still work.

### Validation

- Enable calendar URL.
- Copy/open URL.
- Rotate URL and verify old URL behavior if practical.
