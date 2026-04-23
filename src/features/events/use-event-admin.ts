import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EventAdminMember {
  user_id: string;
  full_name: string;
  response_status: "going" | "maybe" | "declined" | null;
  selected: boolean;
}

interface EventAdminState {
  isAdmin: boolean;
  clubId: string | null;
  members: EventAdminMember[];
  unansweredCount: number;
  announcementMessage: string;
  announcedAt: string | null;
}

async function fetchEventAdminState(
  eventId: string,
  userId: string | undefined,
): Promise<EventAdminState> {
  if (!userId) {
    return {
      isAdmin: false,
      clubId: null,
      members: [],
      unansweredCount: 0,
      announcementMessage: "",
      announcedAt: null,
    };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, team_id, title")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return {
      isAdmin: false,
      clubId: null,
      members: [],
      unansweredCount: 0,
      announcementMessage: "",
      announcedAt: null,
    };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("club_id")
    .eq("id", event.team_id)
    .maybeSingle();

  const clubId = team?.club_id ?? null;
  let isAdmin = false;
  if (clubId) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("club_id", clubId)
      .eq("role", "admin");
    isAdmin = (roles ?? []).length > 0;
  }

  const { data: memberships } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", event.team_id);
  const memberIds = (memberships ?? []).map((membership) => membership.user_id);

  const names: Record<string, string> = {};
  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", memberIds);
    for (const profile of profiles ?? []) {
      names[profile.id] = profile.full_name;
    }
  }

  const responseMap: Record<string, "going" | "maybe" | "declined"> = {};
  if (memberIds.length > 0) {
    const { data: responses } = await supabase
      .from("event_responses")
      .select("user_id, status")
      .eq("event_id", eventId);
    for (const response of responses ?? []) {
      responseMap[response.user_id] = response.status;
    }
  }

  const { data: squad } = await supabase
    .from("event_squads")
    .select("selected_user_ids, announcement_message, announced_at")
    .eq("event_id", eventId)
    .maybeSingle();

  const selectedIds = Array.isArray(squad?.selected_user_ids)
    ? squad.selected_user_ids.map(String)
    : [];

  const members = memberIds
    .map((memberId) => ({
      user_id: memberId,
      full_name: names[memberId] ?? "Member",
      response_status: responseMap[memberId] ?? null,
      selected: selectedIds.includes(memberId),
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name));

  return {
    isAdmin,
    clubId,
    members,
    unansweredCount: members.filter((member) => !member.response_status).length,
    announcementMessage: squad?.announcement_message ?? "",
    announcedAt: squad?.announced_at ?? null,
  };
}

async function insertNotifications(payload: {
  clubId: string;
  userIds: string[];
  type: string;
  title: string;
  body: string;
  link: string;
}) {
  if (payload.userIds.length === 0) {
    return { error: null };
  }

  return supabase.from("notifications").insert(
    payload.userIds.map((userId) => ({
      user_id: userId,
      club_id: payload.clubId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link,
    })),
  );
}

export function useEventAdmin(eventId: string, userId: string | undefined) {
  const [state, setState] = React.useState<EventAdminState>({
    isAdmin: false,
    clubId: null,
    members: [],
    unansweredCount: 0,
    announcementMessage: "",
    announcedAt: null,
  });
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setState(await fetchEventAdminState(eventId, userId));
    setLoading(false);
  }, [eventId, userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const sendReminders = React.useCallback(
    async (eventTitle: string) => {
      if (!state.clubId) return { error: new Error("Missing club context") };
      const targets = state.members
        .filter((member) => !member.response_status)
        .map((member) => member.user_id);

      setBusy(true);
      const result = await insertNotifications({
        clubId: state.clubId,
        userIds: targets,
        type: "event_reminder",
        title: `RSVP reminder: ${eventTitle}`,
        body: "Please open the event and update your availability.",
        link: `/events/${eventId}`,
      });
      setBusy(false);

      return result;
    },
    [eventId, state.clubId, state.members],
  );

  const announceSquad = React.useCallback(
    async (selectedUserIds: string[], message: string | null, eventTitle: string) => {
      if (!userId || !state.clubId) return { error: new Error("Missing announcement context") };

      setBusy(true);
      const upsertResult = await supabase.from("event_squads").upsert(
        {
          event_id: eventId,
          selected_user_ids: selectedUserIds,
          announcement_message: message,
          announced_by: userId,
          announced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" },
      );

      if (upsertResult.error) {
        setBusy(false);
        return upsertResult;
      }

      const notificationResult = await insertNotifications({
        clubId: state.clubId,
        userIds: selectedUserIds,
        type: "team_announcement",
        title: `Team announced: ${eventTitle}`,
        body: message?.trim() || "You've been named in the squad. Open the event for details.",
        link: `/events/${eventId}`,
      });

      setBusy(false);
      if (!notificationResult.error) {
        await load();
      }
      return notificationResult;
    },
    [eventId, load, state.clubId, userId],
  );

  return {
    ...state,
    loading,
    busy,
    reload: load,
    sendReminders,
    announceSquad,
  };
}
