import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchVisibleTeamsForUser } from "@/features/teams/visible-teams";

export interface UpcomingEvent {
  id: string;
  team_id: string;
  team_name: string;
  title: string;
  starts_at: string;
  home_away: "home" | "away" | null;
  going: number;
  maybe: number;
  declined: number;
  my_status: "going" | "maybe" | "declined" | null;
}

export interface OutstandingPayment {
  request_id: string;
  title: string;
  amount_cents: number;
  currency: string;
  due_at: string | null;
  team_id: string;
  team_name: string;
  requested_by_name: string;
}

export interface AdminCommandAction {
  id: string;
  type: "event" | "payment";
  title: string;
  body: string;
  team_name: string;
  event_id?: string;
  payment_id?: string;
  tone: "warning" | "danger";
}

export interface HomeSummary {
  name: string;
  events: UpcomingEvent[];
  payments: OutstandingPayment[];
  adminActions: AdminCommandAction[];
}

function createInitialSummary(fallbackName?: string): HomeSummary {
  return {
    name: fallbackName ?? "Player",
    events: [],
    payments: [],
    adminActions: [],
  };
}

async function fetchAdminCommandActions(userId: string): Promise<AdminCommandAction[]> {
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("club_id")
    .eq("user_id", userId)
    .eq("role", "admin");

  const clubIds = Array.from(new Set((adminRoles ?? []).map((role) => role.club_id)));
  if (clubIds.length === 0) return [];

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .in("club_id", clubIds);
  const teamIds = (teams ?? []).map((team) => team.id);
  if (teamIds.length === 0) return [];

  const teamNames: Record<string, string> = {};
  for (const team of teams ?? []) teamNames[team.id] = team.name;

  const { data: members } = await supabase
    .from("team_members")
    .select("team_id, user_id")
    .in("team_id", teamIds);
  const memberCounts: Record<string, number> = {};
  for (const member of members ?? []) {
    memberCounts[member.team_id] = (memberCounts[member.team_id] ?? 0) + 1;
  }

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 14);
  const { data: eventRows } = await supabase
    .from("events")
    .select("id, team_id, title, starts_at")
    .in("team_id", teamIds)
    .eq("is_cancelled", false)
    .gte("starts_at", now.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true })
    .limit(12);

  const eventIds = (eventRows ?? []).map((event) => event.id);
  const eventCounts: Record<string, { going: number; responded: number }> = {};
  if (eventIds.length > 0) {
    const { data: responses } = await supabase
      .from("event_responses")
      .select("event_id, status")
      .in("event_id", eventIds);
    for (const response of responses ?? []) {
      eventCounts[response.event_id] ??= { going: 0, responded: 0 };
      eventCounts[response.event_id].responded += 1;
      if (response.status === "going") eventCounts[response.event_id].going += 1;
    }
  }

  const actions: AdminCommandAction[] = [];
  for (const event of eventRows ?? []) {
    const counts = eventCounts[event.id] ?? { going: 0, responded: 0 };
    const membersTotal = memberCounts[event.team_id] ?? 0;
    const unanswered = Math.max(membersTotal - counts.responded, 0);
    const lowConfirmed = counts.going < Math.min(11, membersTotal || 11);
    if (unanswered === 0 && !lowConfirmed) continue;

    const parts = [];
    if (unanswered > 0) parts.push(`${unanswered} unanswered RSVP${unanswered === 1 ? "" : "s"}`);
    if (lowConfirmed) parts.push(`${counts.going} confirmed`);
    actions.push({
      id: `event-${event.id}`,
      type: "event",
      title: event.title,
      body: parts.join(" · "),
      team_name: teamNames[event.team_id] ?? "Team",
      event_id: event.id,
      tone: unanswered > 0 ? "warning" : "danger",
    });
  }

  const { data: requestRows } = await supabase
    .from("payment_requests")
    .select("id, team_id, title, due_at")
    .in("team_id", teamIds)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(20);

  const requestIds = (requestRows ?? []).map((request) => request.id);
  const paymentCounts: Record<string, { unpaid: number; pending: number; overdue: number }> = {};
  if (requestIds.length > 0) {
    const { data: assignments } = await supabase
      .from("payment_assignments")
      .select("request_id, status")
      .in("request_id", requestIds);
    const dueByRequest: Record<string, string | null> = {};
    for (const request of requestRows ?? []) dueByRequest[request.id] = request.due_at;

    for (const assignment of assignments ?? []) {
      paymentCounts[assignment.request_id] ??= { unpaid: 0, pending: 0, overdue: 0 };
      if (assignment.status === "marked_paid") {
        paymentCounts[assignment.request_id].pending += 1;
      }
      if (assignment.status === "unpaid" || assignment.status === "rejected") {
        paymentCounts[assignment.request_id].unpaid += 1;
        const dueAt = dueByRequest[assignment.request_id];
        if (dueAt && new Date(dueAt).getTime() < Date.now()) {
          paymentCounts[assignment.request_id].overdue += 1;
        }
      }
    }
  }

  for (const request of requestRows ?? []) {
    const counts = paymentCounts[request.id] ?? { unpaid: 0, pending: 0, overdue: 0 };
    if (counts.pending === 0 && counts.unpaid === 0) continue;
    const parts = [];
    if (counts.pending > 0) {
      parts.push(`${counts.pending} pending confirmation${counts.pending === 1 ? "" : "s"}`);
    }
    if (counts.overdue > 0) {
      parts.push(`${counts.overdue} overdue`);
    } else if (counts.unpaid > 0) {
      parts.push(`${counts.unpaid} unpaid`);
    }
    actions.push({
      id: `payment-${request.id}`,
      type: "payment",
      title: request.title,
      body: parts.join(" · "),
      team_name: teamNames[request.team_id] ?? "Team",
      payment_id: request.id,
      tone: counts.overdue > 0 ? "danger" : "warning",
    });
  }

  return actions.slice(0, 8);
}

async function fetchHomeSummary(userId: string, fallbackName?: string): Promise<HomeSummary> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const visibleTeams = await fetchVisibleTeamsForUser(userId);
  const teamIds = visibleTeams.map((team) => team.id);
  const teamNames: Record<string, string> = {};
  for (const team of visibleTeams) {
    teamNames[team.id] = team.name;
  }

  let events: UpcomingEvent[] = [];
  if (teamIds.length > 0) {
    const now = new Date().toISOString();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const { data: eventRows } = await supabase
      .from("events")
      .select("id, team_id, title, starts_at, home_away")
      .in("team_id", teamIds)
      .eq("is_cancelled", false)
      .gte("starts_at", now)
      .lt("starts_at", nextWeek.toISOString())
      .order("starts_at", { ascending: true })
      .limit(20);

    const eventIds = (eventRows ?? []).map((event) => event.id);
    const counts: Record<string, { going: number; maybe: number; declined: number }> = {};
    const myStatus: Record<string, "going" | "maybe" | "declined"> = {};
    if (eventIds.length > 0) {
      const { data: responses } = await supabase
        .from("event_responses")
        .select("event_id, user_id, status")
        .in("event_id", eventIds);
      for (const response of responses ?? []) {
        counts[response.event_id] ??= { going: 0, maybe: 0, declined: 0 };
        counts[response.event_id][response.status] += 1;
        if (response.user_id === userId) myStatus[response.event_id] = response.status;
      }
    }

    events = (eventRows ?? []).map((event) => ({
      ...event,
      team_name: teamNames[event.team_id] ?? "Team",
      going: counts[event.id]?.going ?? 0,
      maybe: counts[event.id]?.maybe ?? 0,
      declined: counts[event.id]?.declined ?? 0,
      my_status: myStatus[event.id] ?? null,
    }));
  }

  const { data: assignmentRows } = await supabase
    .from("payment_assignments")
    .select("request_id, status")
    .eq("user_id", userId)
    .in("status", ["unpaid", "rejected"]);

  const requestIds = (assignmentRows ?? []).map((assignment) => assignment.request_id);
  let payments: OutstandingPayment[] = [];
  if (requestIds.length > 0) {
    const { data: requestRows } = await supabase
      .from("payment_requests")
      .select("id, title, amount_cents, currency, due_at, team_id, created_by")
      .in("id", requestIds)
      .order("due_at", { ascending: true, nullsFirst: false });

    const requesterIds = Array.from(
      new Set((requestRows ?? []).map((request) => request.created_by)),
    );
    const paymentTeamIds = Array.from(
      new Set((requestRows ?? []).map((request) => request.team_id)),
    );

    const requesterNames: Record<string, string> = {};
    if (requesterIds.length > 0) {
      const { data: requesters } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", requesterIds);
      for (const requester of requesters ?? []) {
        requesterNames[requester.id] = requester.full_name;
      }
    }

    const paymentTeamNames: Record<string, string> = {};
    if (paymentTeamIds.length > 0) {
      const { data: paymentTeams } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", paymentTeamIds);
      for (const team of paymentTeams ?? []) {
        paymentTeamNames[team.id] = team.name;
      }
    }

    payments = (requestRows ?? []).map((request) => ({
      request_id: request.id,
      title: request.title,
      amount_cents: request.amount_cents,
      currency: request.currency,
      due_at: request.due_at,
      team_id: request.team_id,
      team_name: paymentTeamNames[request.team_id] ?? "Team",
      requested_by_name: requesterNames[request.created_by] ?? "Club admin",
    }));
  }

  return {
    name: profile?.full_name ?? fallbackName ?? "Player",
    events,
    payments,
    adminActions: await fetchAdminCommandActions(userId),
  };
}

export function useHomeSummary(userId: string | undefined, fallbackName?: string) {
  const [summary, setSummary] = React.useState<HomeSummary>(() =>
    createInitialSummary(fallbackName),
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setSummary((current) => {
      const nextName = fallbackName ?? "Player";
      return current.name === nextName ? current : { ...current, name: nextName };
    });
  }, [fallbackName]);

  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      setSummary(createInitialSummary(fallbackName));
      return;
    }

    let active = true;
    void (async () => {
      setLoading(true);
      const nextSummary = await fetchHomeSummary(userId, fallbackName);
      if (!active) return;
      setSummary(nextSummary);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [fallbackName, userId]);

  return { ...summary, loading };
}
