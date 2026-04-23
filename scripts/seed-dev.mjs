#!/usr/bin/env node
// Manual-testing seed for Sixxer.
//
// Creates a disposable club with 2 teams, 1 admin + 9 player accounts, a mix of
// upcoming events (including a recurring series on Team A), and one open payment
// request per team. Idempotent: if it finds existing users with the test emails
// it deletes them first so repeated runs always land in the same state.
//
// Usage:
//   SUPABASE_URL=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/seed-dev.mjs
//
// SUPABASE_SERVICE_ROLE_KEY is required — the script uses the admin API to
// create confirmed users without email verification. Never commit it.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the seed.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CLUB_NAME = "Sixxer Test CC";
const TEAMS = [
  { name: "Test CC 1st XI", color: "pink" },
  { name: "Test CC 2nd XI", color: "teal" },
];
const ADMIN = { email: "admin@sixxer.test", name: "Alex Admin" };
const PLAYERS = [
  { email: "player1@sixxer.test", name: "Priya Patel" },
  { email: "player2@sixxer.test", name: "Rahul Singh" },
  { email: "player3@sixxer.test", name: "Marcus Johnson" },
  { email: "player4@sixxer.test", name: "Sofia Martinez" },
  { email: "player5@sixxer.test", name: "Ethan Kumar" },
  { email: "player6@sixxer.test", name: "Olivia Chen" },
  { email: "player7@sixxer.test", name: "Liam O'Brien" },
  { email: "player8@sixxer.test", name: "Ava Williams" },
  { email: "player9@sixxer.test", name: "Noah Brown" },
];
const PASSWORD = "SixxerTest!234";

async function ensureUser(email, fullName) {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = list?.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await supabase.auth.admin.deleteUser(existing.id);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data?.user) {
    throw error ?? new Error(`Could not create ${email}`);
  }
  return data.user;
}

async function main() {
  console.log("Seeding Sixxer test data…");
  const adminUser = await ensureUser(ADMIN.email, ADMIN.name);
  console.log(`  Admin: ${ADMIN.email}`);

  const playerUsers = [];
  for (const player of PLAYERS) {
    const user = await ensureUser(player.email, player.name);
    playerUsers.push(user);
    console.log(`  Player: ${player.email}`);
  }

  // Upsert profiles defensively in case the auth trigger hasn't landed or
  // we're seeding against a fresh local stack.
  const allProfileRows = [adminUser, ...playerUsers].map((user, index) => ({
    id: user.id,
    full_name: user.user_metadata?.full_name ?? `Member ${index}`,
  }));
  await supabase.from("profiles").upsert(allProfileRows, { onConflict: "id" });

  // Wipe any previous Sixxer Test CC before re-seeding to keep runs idempotent.
  const { data: existingClubs } = await supabase.from("clubs").select("id").eq("name", CLUB_NAME);
  for (const club of existingClubs ?? []) {
    await supabase.from("clubs").delete().eq("id", club.id);
  }

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert({ name: CLUB_NAME, created_by: adminUser.id, primary_color: "pink" })
    .select("id")
    .single();
  if (clubError || !club) throw clubError ?? new Error("Could not create club");
  console.log(`  Club: ${CLUB_NAME} (${club.id})`);

  await supabase
    .from("user_roles")
    .insert({ user_id: adminUser.id, club_id: club.id, role: "admin" });
  for (const player of playerUsers) {
    await supabase
      .from("user_roles")
      .insert({ user_id: player.id, club_id: club.id, role: "player" });
  }

  const teamRows = [];
  for (const team of TEAMS) {
    const { data, error } = await supabase
      .from("teams")
      .insert({ club_id: club.id, name: team.name, banner_color: team.color })
      .select("id, name")
      .single();
    if (error || !data) throw error ?? new Error(`Could not create team ${team.name}`);
    teamRows.push(data);
    console.log(`  Team: ${data.name}`);
  }

  // 5 players in Team A, 4 in Team B. Admin does not need to be a team member.
  const teamAPlayers = playerUsers.slice(0, 5);
  const teamBPlayers = playerUsers.slice(5);

  const memberRows = [
    ...teamAPlayers.map((user) => ({ team_id: teamRows[0].id, user_id: user.id })),
    ...teamBPlayers.map((user) => ({ team_id: teamRows[1].id, user_id: user.id })),
  ];
  await supabase.from("team_members").insert(memberRows);

  await supabase.from("invites").insert({
    club_id: club.id,
    code: "TESTCC-JOIN",
    created_by: adminUser.id,
  });

  // --- Events on Team A: 1 one-off match + a weekly 6-week training series ---
  const nextSaturday = startOfNext("Saturday", 13, 0);
  const { data: matchEvent } = await supabase
    .from("events")
    .insert({
      team_id: teamRows[0].id,
      type: "match",
      title: "vs Hawks CC",
      opponent: "Hawks CC",
      home_away: "home",
      starts_at: nextSaturday.toISOString(),
      meetup_at: new Date(nextSaturday.getTime() - 30 * 60_000).toISOString(),
      ends_at: new Date(nextSaturday.getTime() + 4 * 60 * 60_000).toISOString(),
      location: "Regents Park, Pitch 2",
      description: "Season opener. Whites required. Tea provided.",
      created_by: adminUser.id,
    })
    .select("id")
    .single();

  const seriesStart = startOfNext("Tuesday", 19, 0);
  const { data: series } = await supabase
    .from("event_series")
    .insert({
      team_id: teamRows[0].id,
      title: "Nets — Tuesday evening",
      type: "event",
      location: "Regents Park Nets",
      duration_minutes: 120,
      meetup_offset_minutes: null,
      rrule: "FREQ=WEEKLY;INTERVAL=1;COUNT=6",
      starts_at: seriesStart.toISOString(),
      created_by: adminUser.id,
    })
    .select("id")
    .single();

  if (series) {
    const seriesRows = Array.from({ length: 6 }).map((_, i) => {
      const occurrence = new Date(seriesStart);
      occurrence.setDate(occurrence.getDate() + 7 * i);
      return {
        team_id: teamRows[0].id,
        series_id: series.id,
        type: "event",
        title: "Nets — Tuesday evening",
        starts_at: occurrence.toISOString(),
        ends_at: new Date(occurrence.getTime() + 120 * 60_000).toISOString(),
        location: "Regents Park Nets",
        created_by: adminUser.id,
      };
    });
    await supabase.from("events").insert(seriesRows);
  }

  // Team B gets one event so both teams have something to see.
  await supabase.from("events").insert({
    team_id: teamRows[1].id,
    type: "match",
    title: "@ Falcons CC",
    opponent: "Falcons CC",
    home_away: "away",
    starts_at: startOfNext("Sunday", 11, 0).toISOString(),
    location: "Falcons Ground, North Lane",
    description: "Away game. Meet at clubhouse for carpool.",
    created_by: adminUser.id,
  });

  // --- A payment request per team, auto-assigned to team members ---
  if (matchEvent) {
    const { data: paymentRequest } = await supabase
      .from("payment_requests")
      .insert({
        team_id: teamRows[0].id,
        event_id: matchEvent.id,
        title: "Match fee — Hawks CC",
        amount_cents: 1000,
        currency: "GBP",
        due_at: new Date(nextSaturday.getTime() - 24 * 60 * 60_000).toISOString(),
        description: "£10 match fee. Cash to captain or bank transfer.",
        created_by: adminUser.id,
      })
      .select("id")
      .single();

    if (paymentRequest) {
      await supabase
        .from("payment_assignments")
        .insert(teamAPlayers.map((user) => ({ request_id: paymentRequest.id, user_id: user.id })));
    }
  }

  console.log("\nDone.");
  console.log(`  Sign in as any of these users with password: ${PASSWORD}`);
  console.log(`    Admin: ${ADMIN.email}`);
  for (const player of PLAYERS) console.log(`    Player: ${player.email}`);
  console.log(`  Invite code: TESTCC-JOIN`);
}

// Returns a Date at the next occurrence of `weekday` strictly after `now`.
function startOfNext(weekday, hours, minutes) {
  const map = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const target = map[weekday];
  const now = new Date();
  const d = new Date(now);
  d.setHours(hours, minutes, 0, 0);
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
