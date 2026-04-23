import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calendar, ChevronRight, LogOut } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { InitialAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile } from "@/features/profile/use-profile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Sixxer" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const fallbackName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user?.email?.split("@")[0] ||
    "Player";

  React.useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setFullName(fallbackName);
        setPhone("");
        setLoading(false);
        return;
      }

      setFullName(data?.full_name ?? fallbackName);
      setPhone(data?.phone ?? "");
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [fallbackName, user]);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    const { error } = await saveProfile(user.id, {
      fullName,
      phone,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Profile saved");
  }

  async function onSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  if (!user) {
    return (
      <div className="px-5 pb-10">
        <PageHeader title="Profile" back="/home" />
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          You are not signed in.
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-10">
      <PageHeader title="Profile" back="/home" />

      <div className="mt-4 flex items-center gap-3 rounded-3xl border border-border bg-card p-4">
        <InitialAvatar name={fullName || fallbackName} size={56} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{fullName || fallbackName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <form
        onSubmit={onSave}
        className="mt-4 space-y-3 rounded-3xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={80}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={32}
          />
        </div>

        <Button type="submit" disabled={saving || loading} className="rounded-full">
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>

      <Link
        to="/calendar"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-semibold"
      >
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Calendar className="h-4 w-4" />
        </span>
        <span className="flex-1">Calendar sync</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <button
        onClick={onSignOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
