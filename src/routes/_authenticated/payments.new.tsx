import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import {
  PAYMENT_CATEGORIES,
  type PaymentCategory,
  paymentCategoryLabel,
} from "@/features/payments/payment-options";

export const Route = createFileRoute("/_authenticated/payments/new")({
  validateSearch: (s: Record<string, unknown>) => ({ teamId: String(s.teamId ?? "") }),
  component: NewPaymentPage,
});

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  amount: z.number().min(0.01).max(100000),
  category: z.enum(["match_fee", "subs", "kit", "fine", "other"]),
  dueAt: z.string().optional(),
});

interface RecipientOption {
  user_id: string;
  full_name: string;
}

interface PaymentTemplate {
  id: string;
  title: string;
  category: PaymentCategory;
  amount_cents: number;
  currency: string;
  description: string | null;
}

function NewPaymentPage() {
  const { teamId } = useSearch({ from: "/_authenticated/payments/new" });
  const { user } = useAuth();
  const { data: ctx, loading: contextLoading } = useTeamContext(teamId, user?.id);
  const navigate = useNavigate();
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<PaymentCategory>("match_fee");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [dueAt, setDueAt] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [recipients, setRecipients] = React.useState<RecipientOption[]>([]);
  const [selectedRecipients, setSelectedRecipients] = React.useState<string[]>([]);
  const [templates, setTemplates] = React.useState<PaymentTemplate[]>([]);
  const [templateId, setTemplateId] = React.useState("");
  const [saveTemplate, setSaveTemplate] = React.useState(false);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!ctx?.isAdmin || !teamId) return;
    let active = true;
    (async () => {
      setLoadingOptions(true);
      const [{ data: members }, { data: templateRows }] = await Promise.all([
        supabase.from("team_members").select("user_id").eq("team_id", teamId),
        supabase
          .from("payment_templates")
          .select("id, title, category, amount_cents, currency, description")
          .eq("team_id", teamId)
          .order("created_at", { ascending: false }),
      ]);
      const ids = (members ?? []).map((member) => member.user_id);
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
      if (!active) return;
      const nextRecipients = ids.map((id) => ({ user_id: id, full_name: names[id] ?? "Member" }));
      setRecipients(nextRecipients);
      setSelectedRecipients(nextRecipients.map((recipient) => recipient.user_id));
      setTemplates((templateRows ?? []) as PaymentTemplate[]);
      setLoadingOptions(false);
    })();
    return () => {
      active = false;
    };
  }, [ctx?.isAdmin, teamId]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((row) => row.id === id);
    if (!template) return;
    setTitle(template.title);
    setCategory(template.category);
    setAmount((template.amount_cents / 100).toFixed(2));
    setCurrency(template.currency);
    setDescription(template.description ?? "");
  }

  function toggleRecipient(userId: string) {
    setSelectedRecipients((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  if (contextLoading) {
    return (
      <div className="px-5 pb-10">
        <PageHeader title="New payment request" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  if (!ctx?.isAdmin) {
    return (
      <div className="px-5 pb-10">
        <PageHeader title="New payment request" />
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Only admins can create payment requests.
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !teamId) return;
    const amountNum = Number(amount);
    const parsed = schema.safeParse({ title, amount: amountNum, category, dueAt });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    if (selectedRecipients.length === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    setSubmitting(true);
    const { data: req, error } = await supabase
      .from("payment_requests")
      .insert({
        team_id: teamId,
        title: parsed.data.title,
        category: parsed.data.category,
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
    const { error: assignmentError } = await supabase
      .from("payment_assignments")
      .insert(selectedRecipients.map((userId) => ({ request_id: req.id, user_id: userId })));
    if (assignmentError) {
      setSubmitting(false);
      toast.error(assignmentError.message);
      return;
    }
    if (saveTemplate) {
      const { error: templateError } = await supabase.from("payment_templates").insert({
        team_id: teamId,
        title: parsed.data.title,
        category: parsed.data.category,
        amount_cents: Math.round(amountNum * 100),
        currency,
        description: description || null,
        created_by: user.id,
      });
      if (templateError) {
        toast.error(`Request sent, but template was not saved: ${templateError.message}`);
      }
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
          <Label htmlFor="template">Template</Label>
          <select
            id="template"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            disabled={loadingOptions || templates.length === 0}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">
              {templates.length === 0 ? "No saved templates" : "Start without a template"}
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title} · {paymentCategoryLabel(template.category)}
              </option>
            ))}
          </select>
        </div>
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
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as PaymentCategory)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PAYMENT_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Recipients</Label>
            <button
              type="button"
              onClick={() =>
                setSelectedRecipients((current) =>
                  current.length === recipients.length
                    ? []
                    : recipients.map((recipient) => recipient.user_id),
                )
              }
              className="text-xs font-semibold text-primary"
            >
              {selectedRecipients.length === recipients.length ? "Clear all" : "Select all"}
            </button>
          </div>
          {loadingOptions ? (
            <div className="h-20 animate-pulse rounded-xl bg-secondary" />
          ) : recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members found.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {recipients.map((recipient) => (
                <label
                  key={recipient.user_id}
                  className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(recipient.user_id)}
                    onChange={() => toggleRecipient(recipient.user_id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="truncate font-medium">{recipient.full_name}</span>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {selectedRecipients.length} selected for this request.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={saveTemplate}
            onChange={(e) => setSaveTemplate(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Save as reusable template
        </label>
        <Button
          type="submit"
          disabled={submitting || loadingOptions}
          className="h-11 w-full rounded-full text-sm font-semibold"
        >
          {submitting ? "Sending…" : "Send request"}
        </Button>
      </form>
    </div>
  );
}
