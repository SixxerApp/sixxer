import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { EmptyState } from "@/components/EmptyState";
import { formatMoney, formatRelativeDay } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/groups/$teamId/payments")({
  component: PaymentsTab,
});

interface RequestRow {
  id: string;
  title: string;
  amount_cents: number;
  currency: string;
  due_at: string | null;
  totals: { total: number; paid: number; confirmed: number };
  myStatus?: "unpaid" | "marked_paid" | "confirmed" | "rejected";
}

function PaymentsTab() {
  const { teamId } = useParams({ from: "/_authenticated/groups/$teamId/payments" });
  const { user } = useAuth();
  const { data: ctx } = useTeamContext(teamId, user?.id);
  const [rows, setRows] = React.useState<RequestRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: reqs } = await supabase
        .from("payment_requests")
        .select("id, title, amount_cents, currency, due_at")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });
      const ids = (reqs ?? []).map((r) => r.id);
      const totalsMap: Record<string, RequestRow["totals"]> = {};
      const myMap: Record<string, RequestRow["myStatus"]> = {};
      if (ids.length) {
        const { data: assigns } = await supabase
          .from("payment_assignments")
          .select("request_id, user_id, status")
          .in("request_id", ids);
        for (const a of assigns ?? []) {
          totalsMap[a.request_id] ??= { total: 0, paid: 0, confirmed: 0 };
          totalsMap[a.request_id].total += 1;
          if (a.status === "marked_paid") totalsMap[a.request_id].paid += 1;
          if (a.status === "confirmed") totalsMap[a.request_id].confirmed += 1;
          if (a.user_id === user.id) myMap[a.request_id] = a.status;
        }
      }
      if (!active) return;
      setRows(
        (reqs ?? []).map((r) => ({
          ...r,
          totals: totalsMap[r.id] ?? { total: 0, paid: 0, confirmed: 0 },
          myStatus: myMap[r.id],
        })),
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [teamId, user]);

  return (
    <div>
      {ctx?.isAdmin && (
        <Link
          to="/payments/new"
          search={{ teamId }}
          className="mb-4 inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          + New payment request
        </Link>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="No payment requests"
          body={
            ctx?.isAdmin
              ? "Create a request to start collecting match fees and subs."
              : "Nothing to pay right now."
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                to="/payments/$paymentId"
                params={{ paymentId: r.id }}
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    {r.due_at && (
                      <p className="text-xs text-muted-foreground">
                        Due {formatRelativeDay(r.due_at)}
                      </p>
                    )}
                  </div>
                  <span className="text-base font-extrabold">
                    {formatMoney(r.amount_cents, r.currency)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {ctx?.isAdmin ? (
                    <span className="text-muted-foreground">
                      {r.totals.confirmed}/{r.totals.total} confirmed
                      {r.totals.paid > 0 && ` · ${r.totals.paid} pending`}
                    </span>
                  ) : r.myStatus ? (
                    <StatusChip status={r.myStatus} />
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StatusChip({ status }: { status: "unpaid" | "marked_paid" | "confirmed" | "rejected" }) {
  const map = {
    unpaid: { label: "Unpaid", cls: "bg-destructive/15 text-destructive" },
    marked_paid: { label: "Pending", cls: "bg-warning/15 text-warning-foreground" },
    confirmed: { label: "Confirmed", cls: "bg-success/15 text-success" },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive" },
  } as const;
  const m = map[status];
  return (
    <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " + m.cls}>
      {m.label}
    </span>
  );
}
