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

export interface HomeSummary {
  name: string;
  events: UpcomingEvent[];
  payments: OutstandingPayment[];
}

function createInitialSummary(fallbackName?: string): HomeSummary {
  return {
    name: fallbackName ?? "Player",
    events: [],
    payments: [],
  };
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
