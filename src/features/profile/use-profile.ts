import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface ProfileDraft {
  fullName: string;
  phone: string;
}

function fallbackProfile(user: User | undefined | null): ProfileDraft {
  const fullName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user?.email?.split("@")[0] ||
    "";

  return {
    fullName,
    phone: "",
  };
}

async function fetchProfile(user: User): Promise<ProfileDraft> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return {
    fullName: data?.full_name ?? fallbackProfile(user).fullName,
    phone: data?.phone ?? "",
  };
}

export async function saveProfile(userId: string, draft: ProfileDraft) {
  return supabase
    .from("profiles")
    .upsert({ id: userId, full_name: draft.fullName.trim(), phone: draft.phone.trim() || null });
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
