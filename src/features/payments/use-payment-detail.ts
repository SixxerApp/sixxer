import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentRequestRow {
  id: string;
  team_id: string;
  title: string;
  amount_cents: number;
  currency: string;
  due_at: string | null;
  description: string | null;
  created_by: string;
  team_name: string;
  requested_by_name: string;
}

export interface AssignmentRow {
  id: string;
  user_id: string;
  status: "unpaid" | "marked_paid" | "confirmed" | "rejected";
  note: string | null;
  full_name: string;
}

async function fetchPaymentDetail(paymentId: string, userId: string | undefined) {
  const { data: request } = await supabase
    .from("payment_requests")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (!request) {
    return {
      request: null,
      assignments: [] as AssignmentRow[],
      isAdmin: false,
      clubId: null as string | null,
    };
  }

  let isAdmin = false;
  let teamName = "Team";
  let clubId: string | null = null;
  if (userId) {
    const { data: team } = await supabase
      .from("teams")
      .select("club_id, name")
      .eq("id", request.team_id)
      .maybeSingle();
    if (team) {
      teamName = team.name;
      clubId = team.club_id;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("club_id", team.club_id)
        .eq("role", "admin");
      isAdmin = (roles ?? []).length > 0;
    }
  }

  let requestedByName = "Club admin";
  const { data: requester } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", request.created_by)
    .maybeSingle();
  if (requester?.full_name) {
    requestedByName = requester.full_name;
  }

  const { data: assignmentRows } = await supabase
    .from("payment_assignments")
    .select("id, user_id, status, note")
    .eq("request_id", paymentId);

  const ids = (assignmentRows ?? []).map((row) => row.user_id);
  const names: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const profile of profiles ?? []) {
      names[profile.id] = profile.full_name;
    }
  }

  return {
    request: {
      ...request,
      team_name: teamName,
      requested_by_name: requestedByName,
    } satisfies PaymentRequestRow,
    assignments: (assignmentRows ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      status: row.status,
      note: row.note,
      full_name: names[row.user_id] ?? "Member",
    })),
    isAdmin,
    clubId,
  };
}

export function isPaymentOverdue(
  dueAt: string | null,
  myStatus: AssignmentRow["status"] | undefined,
): boolean {
  if (!dueAt) return false;
  if (myStatus === "confirmed" || myStatus === "marked_paid") return false;
  return new Date(dueAt).getTime() < Date.now();
}

// Nudge everyone still on "unpaid" or "rejected" with an in-app notification.
// Rejected == admin bounced their self-mark; they still owe. Mirrors the
// event-reminder pattern on purpose so the notifications UI treats them the
// same way.
async function insertPaymentReminders(params: {
  clubId: string;
  userIds: string[];
  title: string;
  amount: string;
  paymentId: string;
}) {
  if (params.userIds.length === 0) return { error: null };
  return supabase.from("notifications").insert(
    params.userIds.map((userId) => ({
      user_id: userId,
      club_id: params.clubId,
      type: "payment_reminder",
      title: `Payment due: ${params.title}`,
      body: `${params.amount} — open to mark as paid.`,
      link: `/payments/${params.paymentId}`,
    })),
  );
}

export async function markPaymentAsPaid(paymentId: string, userId: string, note: string | null) {
  return supabase
    .from("payment_assignments")
    .update({
      status: "marked_paid",
      note,
      marked_paid_at: new Date().toISOString(),
    })
    .eq("request_id", paymentId)
    .eq("user_id", userId);
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: "confirmed" | "rejected" | "unpaid",
) {
  return supabase
    .from("payment_assignments")
    .update({
      status,
      confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
    })
    .eq("id", assignmentId);
}

export function usePaymentDetail(paymentId: string, userId: string | undefined) {
  const [request, setRequest] = React.useState<PaymentRequestRow | null>(null);
  const [assignments, setAssignments] = React.useState<AssignmentRow[]>([]);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [clubId, setClubId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const detail = await fetchPaymentDetail(paymentId, userId);
    setRequest(detail.request);
    setAssignments(detail.assignments);
    setIsAdmin(detail.isAdmin);
    setClubId(detail.clubId);
    setLoading(false);
  }, [paymentId, userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const markPaid = React.useCallback(
    async (note: string | null) => {
      if (!userId) return { error: new Error("Missing user") };
      setBusy(true);
      const result = await markPaymentAsPaid(paymentId, userId, note);
      setBusy(false);
      if (!result.error) {
        await load();
      }
      return result;
    },
    [load, paymentId, userId],
  );

  const updateStatus = React.useCallback(
    async (assignmentId: string, status: "confirmed" | "rejected" | "unpaid") => {
      setBusy(true);
      const result = await updateAssignmentStatus(assignmentId, status);
      setBusy(false);
      if (!result.error) {
        await load();
      }
      return result;
    },
    [load],
  );

  // Confirm every assignment currently in marked_paid state in a single write.
  // Preserves the admin's audit trail by stamping confirmed_at on each row.
  const bulkConfirmPending = React.useCallback(async () => {
    const pending = assignments.filter((a) => a.status === "marked_paid");
    if (pending.length === 0) return { error: null, confirmed: 0 };
    setBusy(true);
    const result = await supabase
      .from("payment_assignments")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .in(
        "id",
        pending.map((a) => a.id),
      );
    setBusy(false);
    if (!result.error) {
      await load();
    }
    return { error: result.error, confirmed: pending.length };
  }, [assignments, load]);

  const remindUnpaid = React.useCallback(async () => {
    if (!clubId || !request) {
      return { error: new Error("Missing payment context"), remindedCount: 0 };
    }
    const targets = assignments
      .filter((a) => a.status === "unpaid" || a.status === "rejected")
      .map((a) => a.user_id);
    if (targets.length === 0) return { error: null, remindedCount: 0 };
    setBusy(true);
    const amount = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: request.currency,
    }).format(request.amount_cents / 100);
    const result = await insertPaymentReminders({
      clubId,
      userIds: targets,
      title: request.title,
      amount,
      paymentId,
    });
    setBusy(false);
    return { error: result.error, remindedCount: targets.length };
  }, [assignments, clubId, paymentId, request]);

  return {
    request,
    assignments,
    isAdmin,
    clubId,
    loading,
    busy,
    markPaid,
    updateStatus,
    bulkConfirmPending,
    remindUnpaid,
  };
}
