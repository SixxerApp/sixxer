import { createFileRoute, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { InitialAvatar } from "@/components/Avatar";
import { formatMoney, formatRelativeDay } from "@/lib/format";
import { usePaymentDetail } from "@/features/payments/use-payment-detail";
import { usePlatform } from "@/platform";
import { StatusChip } from "./groups.$teamId.payments";

export const Route = createFileRoute("/_authenticated/payments/$paymentId")({
  component: PaymentDetail,
});

function PaymentDetail() {
  const { paymentId } = useParams({ from: "/_authenticated/payments/$paymentId" });
  const { user } = useAuth();
  const platform = usePlatform();
  const {
    request: req,
    isAdmin,
    assignments,
    loading,
    busy,
    markPaid: submitMarkPaid,
    updateStatus,
  } = usePaymentDetail(paymentId, user?.id);

  async function handleMarkPaid() {
    if (!user) return;
    const note = await platform.dialogs.prompt(
      "Add a note (e.g. 'paid cash to captain') — optional",
      "",
    );
    const { error } = await submitMarkPaid(note || null);
    if (error) toast.error(error.message);
    else toast.success("Marked as paid");
  }

  async function adminUpdate(assignmentId: string, status: "confirmed" | "rejected" | "unpaid") {
    const { error } = await updateStatus(assignmentId, status);
    if (error) toast.error(error.message);
  }

  if (loading) {
    return (
      <div className="px-5">
        <PageHeader title="Payment" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }
  if (!req) {
    return (
      <div className="px-5">
        <PageHeader title="Payment" />
        <p className="mt-4 text-sm text-muted-foreground">Not found.</p>
      </div>
    );
  }

  const me = assignments.find((a) => a.user_id === user?.id);
  const totals = {
    total: assignments.length,
    confirmed: assignments.filter((a) => a.status === "confirmed").length,
    pending: assignments.filter((a) => a.status === "marked_paid").length,
    unpaid: assignments.filter((a) => a.status === "unpaid").length,
  };

  return (
    <div className="px-5 pb-8">
      <PageHeader title="Payment request" />
      <div className="mt-2 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {req.due_at ? `Due ${formatRelativeDay(req.due_at)}` : "No due date"}
        </p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight">{req.title}</h1>
        <p className="mt-3 text-3xl font-extrabold text-primary">
          {formatMoney(req.amount_cents, req.currency)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAdmin ? "Requested by" : "Pay to"} {req.requested_by_name} · {req.team_name}
        </p>
        {req.description && <p className="mt-3 text-sm text-muted-foreground">{req.description}</p>}
      </div>

      {!isAdmin && me && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Your status</span>
            <StatusChip status={me.status} />
          </div>
          {me.status === "unpaid" && (
            <button
              onClick={handleMarkPaid}
              disabled={busy}
              className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              I&apos;ve paid
            </button>
          )}
          {me.status === "marked_paid" && (
            <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
              Waiting for admin to confirm. {me.note && <>Note: &ldquo;{me.note}&rdquo;</>}
            </p>
          )}
          {me.status === "confirmed" && (
            <p className="rounded-2xl border border-success/30 bg-success/10 p-3 text-xs text-success">
              Confirmed. You&apos;re all set 🎉
            </p>
          )}
          {me.status === "rejected" && (
            <button
              onClick={handleMarkPaid}
              disabled={busy}
              className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              Resubmit
            </button>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Confirmed" value={`${totals.confirmed}/${totals.total}`} tone="success" />
          <Stat label="Pending" value={String(totals.pending)} tone="warning" />
          <Stat label="Unpaid" value={String(totals.unpaid)} tone="destructive" />
        </div>
      )}

      <h2 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {isAdmin ? "Members" : "Squad"}
      </h2>
      <ul className="mt-2 space-y-2">
        {assignments.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <InitialAvatar name={a.full_name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{a.full_name}</p>
              {a.note && (
                <p className="truncate text-[11px] text-muted-foreground">&ldquo;{a.note}&rdquo;</p>
              )}
            </div>
            <StatusChip status={a.status} />
            {isAdmin && a.status === "marked_paid" && (
              <div className="ml-1 flex flex-col gap-1">
                <button
                  onClick={() => adminUpdate(a.id, "confirmed")}
                  disabled={busy}
                  className="rounded-full bg-success px-3 py-1 text-[10px] font-bold text-success-foreground"
                >
                  Confirm
                </button>
                <button
                  onClick={() => adminUpdate(a.id, "rejected")}
                  disabled={busy}
                  className="rounded-full border border-destructive/40 px-3 py-1 text-[10px] font-bold text-destructive"
                >
                  Reject
                </button>
              </div>
            )}
            {isAdmin && a.status === "confirmed" && (
              <button
                onClick={() => adminUpdate(a.id, "unpaid")}
                disabled={busy}
                className="ml-1 text-[10px] font-bold text-muted-foreground hover:underline"
              >
                Undo
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "destructive";
}) {
  const map = {
    success: "text-success",
    warning: "text-warning-foreground",
    destructive: "text-destructive",
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className={"text-base font-extrabold " + map[tone]}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
