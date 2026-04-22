import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Moon, Sun } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { PageHeader } from "@/components/PageHeader";
import { InitialAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Pitchside" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
      }
    })();
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  async function onSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="px-5 pb-10">
      <PageHeader title="Profile" back="/home" />

      <div className="mt-4 flex items-center gap-3 rounded-3xl border border-border bg-card p-4">
        <InitialAvatar name={fullName || "You"} size={56} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{fullName || "Player"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={save} className="mt-4 space-y-3 rounded-3xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={32}
          />
        </div>
        <Button type="submit" disabled={saving} className="rounded-full">
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>

      <button
        onClick={toggle}
        className="mt-4 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left"
      >
        <span className="flex items-center gap-3 text-sm font-semibold">
          {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          Theme
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {theme}
        </span>
      </button>

      <button
        onClick={onSignOut}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
