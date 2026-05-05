import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileDraft {
  fullName: string;
  phone: string;
  primaryRole: string;
  battingStyle: string;
  bowlingStyle: string;
  isWicketkeeper: boolean;
  availabilityNotes: string;
}

function fallbackProfile(user: User | undefined | null): ProfileDraft {
  const fullName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user?.email?.split("@")[0] ||
    "";

  return {
    fullName,
    phone: "",
    primaryRole: "",
    battingStyle: "",
    bowlingStyle: "",
    isWicketkeeper: false,
    availabilityNotes: "",
  };
}

async function fetchProfile(user: User): Promise<ProfileDraft> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "full_name, phone, primary_role, batting_style, bowling_style, is_wicketkeeper, availability_notes",
    )
    .eq("id", user.id)
    .maybeSingle();

  return {
    fullName: data?.full_name ?? fallbackProfile(user).fullName,
    phone: data?.phone ?? "",
    primaryRole: data?.primary_role ?? "",
    battingStyle: data?.batting_style ?? "",
    bowlingStyle: data?.bowling_style ?? "",
    isWicketkeeper: data?.is_wicketkeeper ?? false,
    availabilityNotes: data?.availability_notes ?? "",
  };
}

export async function saveProfile(userId: string, draft: ProfileDraft) {
  return supabase.from("profiles").upsert({
    id: userId,
    full_name: draft.fullName.trim(),
    phone: draft.phone.trim() || null,
    primary_role: draft.primaryRole.trim() || null,
    batting_style: draft.battingStyle.trim() || null,
    bowling_style: draft.bowlingStyle.trim() || null,
    is_wicketkeeper: draft.isWicketkeeper,
    availability_notes: draft.availabilityNotes.trim() || null,
  });
}

export function useProfile(user: User | null | undefined) {
  const [profile, setProfile] = React.useState<ProfileDraft>(fallbackProfile(user));
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    let active = true;
    void (async () => {
      setLoading(true);
      const nextProfile = await fetchProfile(user);
      if (!active) return;
      setProfile(nextProfile);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  return { profile, setProfile, loading };
}
