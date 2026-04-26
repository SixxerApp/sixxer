# Sixxer Product Vision

## Positioning

Sixxer is the match-week command center for amateur cricket clubs.

It replaces the operational sprawl of WhatsApp chats, spreadsheets, missed RSVPs,
manual payment chasing, and scattered calendar invites with one mobile-first
workspace for captains, admins, treasurers, and players.

Sixxer should not become a generic sports team app. Its advantage is combining
cricket-specific workflows with fast, practical club operations.

## Product Promise

Every captain should know, before match day:

- Who is available.
- Who has not replied.
- Who is selected.
- Who has paid.
- Where and when the team needs to be.
- What still needs chasing.

Every player should know, without searching chat:

- What is coming up.
- Whether they are selected.
- What they owe.
- What action they need to take.
- Where team updates live.

## Primary Personas

### Club Admin / Captain

Runs weekly operations. Creates fixtures, chases availability, selects squads,
announces team news, and keeps members aligned.

Needs:

- A single action dashboard.
- Confidence that every player has seen key updates.
- Fast RSVP and payment follow-up.
- Cricket-specific squad and match-day tools.

### Player

Responds to availability, checks fixtures, pays fees, receives announcements,
and keeps their calendar current.

Needs:

- Fast mobile actions.
- Clear next-event context.
- Trust that app data is current.
- Minimal admin overhead.

### Treasurer

Tracks subs, match fees, kit payments, fines, reimbursements, and unpaid balances.

Needs:

- Payment status by player.
- Reminder tools.
- Exports and reconciliation.
- Eventually real payment collection.

### Coach / Selector

Chooses squads and roles based on availability, skills, balance, and history.

Needs:

- Player profiles.
- Availability history.
- Selection history.
- Match-specific squad planning.

### Parent / Guardian

Future persona for junior cricket.

Needs:

- Child schedule visibility.
- Guardian contact details.
- Payments and consent flows.
- Safe communication boundaries.

## Core Workflows

### Club Setup

An admin creates a club, adds one or more teams, invites players, and creates the
first event or payment request.

### Player Onboarding

A player joins from an invite link or code, lands in the correct team, updates
their profile, and can immediately see fixtures, payments, and posts.

### Match Scheduling

An admin creates a match with opponent, home/away, start time, meetup time,
location, map link, live scoring link, notes, and optional recurrence.

### Availability

Players RSVP with one tap. Admins see response counts, unanswered players, and
can send reminders.

### Squad Selection

Admins select a squad from available players, add reserves and roles, then
announce the selection.

### Payments

Admins create payment requests, players mark paid or pay online, and treasurers
track confirmed, pending, unpaid, and overdue balances.

### Calendar Sync

Players and admins can see upcoming events across teams and subscribe to a
private calendar feed.

### Team Communication

Posts, announcements, polls, and notifications keep team updates visible outside
of chat noise.

## Product Principles

### Mobile First

Most usage happens on phones, often around practice, travel, or match day.
Interactions should be thumb-friendly and glanceable.

### Admin Clarity Over Feature Breadth

The product should first make captains and admins more effective. New features
should reduce ambiguity, chasing, or duplicate work.

### Cricket Specificity

Use cricket language and workflows: squads, XI, reserves, wicketkeeper, captain,
opponents, grounds, nets, match fees, teas, scorer links, and season fixtures.

### One Source Of Operational Truth

Sixxer should become the trusted place for match-week facts. If the app and chat
disagree, the app should be the source of truth.

### Fast Defaults, Not Heavy Configuration

Grassroots admins are busy. Prefer sensible defaults, templates, and quick flows
over complex setup.

### Clear Role Boundaries

Admins, captains, treasurers, players, and parents should see the right tools and
the right data without confusion.

## Current Product Baseline

The app already supports:

- Authentication and profiles.
- Club and team creation.
- Invite-code joining.
- Admin/player roles.
- Team events and recurring event series.
- RSVP tracking.
- Admin reminders.
- Squad announcement basics.
- Payments and payment status tracking.
- Team posts.
- Polls and availability preset.
- In-app notifications.
- Personal calendar subscription URLs.
- PWA/native scaffolding.

## Key Dogfood Findings

### Strengths

- Player home is clear and action-oriented.
- RSVP is fast and satisfying.
- Event detail is strong for cricket match context.
- Admin event detail has promising command-center behaviors.
- Payment detail is useful for treasurer follow-up.
- Poll availability preset fits cricket team decision-making.
- Recurring event creation provides good feedback.

### Gaps

- Admin home and calendar visibility are inconsistent with team event tabs.
- Admin home is too passive for captain workflows.
- Some direct routes temporarily render as an empty shell or bottom nav only.
- Payment flows need templates, recipient selection, and exports.
- Squad selection is still basic.
- Player profiles lack cricket-specific data.
- Notifications are in-app only and need push/preferences.
- Event lifecycle management needs edit and clearer recurring controls.

## North Star

Sixxer should become the app a cricket captain opens every week to answer:

> Are we ready for this match?

The best version of Sixxer turns that question into an actionable dashboard:

- Enough players?
- Enough of the right roles?
- Who is still silent?
- Who is selected?
- Who owes money?
- What changed since yesterday?
- What needs chasing now?

## Success Metrics

Early product metrics:

- Clubs created.
- Teams created per club.
- Players invited and joined.
- First event created.
- RSVP response rate per event.
- Time to reach target squad count.
- Payment request completion rate.
- Admin weekly active usage.
- Player weekly active usage.
- Calendar subscription adoption.

Quality metrics:

- Event/home/calendar data consistency.
- Direct-route load success.
- Time from notification/open to RSVP.
- Payment status accuracy.
- E2E coverage of admin and player critical paths.

