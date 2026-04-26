// Shared constants for Playwright E2E tests. Mirrors scripts/seed-dev.mjs so
// tests stay in sync with whatever the seed produces. If you change accounts
// or the club name in the seed, update here too.

export const SEED = {
  password: "SixxerTest!234",
  club: "Sixxer Test CC",
  admin: { email: "admin@sixxer.test", name: "Alex Admin" },
  teamA: {
    name: "Test CC 1st XI",
    // Priya Patel is the first player on Team A and owns the seeded
    // payment assignment. Every player-side test signs in as her.
    player: { email: "player1@sixxer.test", name: "Priya Patel" },
  },
  teamB: { name: "Test CC 2nd XI" },
  seededMatchOpponent: "Hawks CC",
  seededTeamBOpponent: "Falcons CC",
  seededPaymentTitle: "Match fee — Hawks CC",
} as const;
