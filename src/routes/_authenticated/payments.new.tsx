import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/payments/new")({
  validateSearch: (s: Record<string, unknown>) => ({ teamId: String(s.teamId ?? "") }),
  component: NewPaymentPage,
});

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  amount: z.number().min(0.01).max(100000),
  dueAt: z.string().optional(),
});

function NewPaymentPage() {
  const { teamId } = useSearch({ from: "/_authenticated/payments/new" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [dueAt, setDueAt] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !teamId) return;
    const amountNum = Number(amount);
    const parsed = schema.safeParse({ title, amount: amountNum, dueAt });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSubmitting(true);
    const { data: req, error } = await supabase
      .from("payment_requests")
      .insert({
        team_id: teamId,
        title: parsed.data.title,
        amount_cents: Math.round(amountNum * 100),
        currency,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        description: description || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !req) {
      setSubmitting(false);
      toast.error(error?.message ?? "Could not create");
      return;
    }
    // Auto-assign to all team members
    const { data: members } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId);
    if (members && members.length) {
      await supabase
        .from("payment_assignments")
        .insert(members.map((m) => ({ request_id: req.id, user_id: m.user_id })));
    }
    setSubmitting(false);
    toast.success("Payment request sent");
    navigate({ to: "/payments/$paymentId", params: { paymentId: req.id } });
  }

  return (
    <div className="px-5 pb-10">
      <PageHeader title="New payment request" />
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Match fee – Saturday vs Hawks"
            maxLength={120}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="15.00"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccy">Ccy</Label>
            <select
              id="ccy"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {["USD", "GBP", "EUR", "INR", "AUD", "CAD", "NZD", "ZAR"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due">Due by (optional)</Label>
          <Input
            id="due"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Notes</Label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Cash to captain or Venmo @club"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-full text-sm font-semibold"
        >
          {submitting ? "Sending…" : "Send request"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Will be sent to all current team members.
        </p>
      </form>
    </div>
  );
}
