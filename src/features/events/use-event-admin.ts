import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  filterUsersByNotificationPreference,
  type NotificationPreferenceKey,
} from "@/features/notifications/use-notification-center";

export interface EventAdminMember {
  user_id: string;
  full_name: string;
  response_status: "going" | "maybe" | "declined" | null;
  selection_status: "selected" | "reserve" | null;
  is_captain: boolean;
  is_wicketkeeper: boolean;
  role_note: string;
}

interface EventAdminState {
  isAdmin: boolean;
  clubId: string | null;
  members: EventAdminMember[];
  unansweredCount: number;
  announcementMessage: string;
  announcedAt: string | null;
  captainUserId: string | null;
  wicketkeeperUserId: string | null;
}

interface AnnounceSquadInput {
  selectedUserIds: string[];
  reserveUserIds: string[];
  captainUserId: string | null;
  wicketkeeperUserId: string | null;
  roleNotes: Record<string, string>;
  message: string | null;
}

const emptyAdminState: EventAdminState = {
  isAdmin: false,
  clubId: null,
  members: [],
  unansweredCount: 0,
  announcementMessage: "",
  announcedAt: null,
  captainUserId: null,
  wicketkeeperUserId: null,
};

function jsonArrayToStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function jsonObjectToNotes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, note]) => [key, typeof note === "string" ? note.trim() : ""])
      .filter(([, note]) => note),
  );
}

async function fetchEventAdminState(
  eventId: string,
  userId: string | undefined,
): Promise<EventAdminState> {
  if (!userId) {
    return emptyAdminState;
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, team_id, title")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return emptyAdminState;
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

  const squadResult = await supabase
    .from("event_squads")
    .select(
      "selected_user_ids, reserve_user_ids, captain_user_id, wicketkeeper_user_id, role_notes, announcement_message, announced_at",
    )
    .eq("event_id", eventId)
    .maybeSingle();
  const { data: fallbackSquad } =
    squadResult.error?.code === "42703" || squadResult.error?.code === "PGRST200"
      ? await supabase
          .from("event_squads")
          .select("selected_user_ids, announcement_message, announced_at")
          .eq("event_id", eventId)
          .maybeSingle()
      : { data: null };
  const squad = squadResult.data ?? fallbackSquad;

  const selectedIds = jsonArrayToStrings(squad?.selected_user_ids);
  const reserveIds = jsonArrayToStrings(squad?.reserve_user_ids);
  const roleNotes = jsonObjectToNotes(squad?.role_notes);

  const members = memberIds
    .map((memberId) => ({
      user_id: memberId,
      full_name: names[memberId] ?? "Member",
      response_status: responseMap[memberId] ?? null,
      selection_status: selectedIds.includes(memberId)
        ? ("selected" as const)
        : reserveIds.includes(memberId)
          ? ("reserve" as const)
          : null,
      is_captain: squad?.captain_user_id === memberId,
      is_wicketkeeper: squad?.wicketkeeper_user_id === memberId,
      role_note: roleNotes[memberId] ?? "",
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name));

  return {
    isAdmin,
    clubId,
    members,
    unansweredCount: members.filter((member) => !member.response_status).length,
    announcementMessage: squad?.announcement_message ?? "",
    announcedAt: squad?.announced_at ?? null,
    captainUserId: squad?.captain_user_id ?? null,
    wicketkeeperUserId: squad?.wicketkeeper_user_id ?? null,
  };
}

async function insertNotifications(payload: {
  clubId: string;
  userIds: string[];
  preferenceKey: NotificationPreferenceKey;
  type: string;
  title: string;
  body: string;
  link: string;
}) {
  const userIds = await filterUsersByNotificationPreference(payload.userIds, payload.preferenceKey);
  if (userIds.length === 0) {
    return { error: null };
  }

  return supabase.from("notifications").insert(
    userIds.map((userId) => ({
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
  const [state, setState] = React.useState<EventAdminState>(emptyAdminState);
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
        preferenceKey: "event_reminders",
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
    async (input: AnnounceSquadInput, eventTitle: string) => {
      if (!userId || !state.clubId) return { error: new Error("Missing announcement context") };

      setBusy(true);
      const roleNotes = Object.fromEntries(
        Object.entries(input.roleNotes)
          .map(([memberId, note]) => [memberId, note.trim()])
          .filter(([, note]) => note),
      );
      const upsertResult = await supabase.from("event_squads").upsert(
        {
          event_id: eventId,
          selected_user_ids: input.selectedUserIds,
          reserve_user_ids: input.reserveUserIds,
          captain_user_id: input.captainUserId,
          wicketkeeper_user_id: input.wicketkeeperUserId,
          role_notes: roleNotes,
          announcement_message: input.message,
          announced_by: userId,
          announced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" },
      );

      if (upsertResult.error) {
        if (upsertResult.error.code === "PGRST204") {
          const fallbackResult = await supabase.from("event_squads").upsert(
            {
              event_id: eventId,
              selected_user_ids: input.selectedUserIds,
              announcement_message: input.message,
              announced_by: userId,
              announced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "event_id" },
          );
          if (fallbackResult.error) {
            setBusy(false);
            return fallbackResult;
          }

          const fallbackNotification = await insertNotifications({
            clubId: state.clubId,
            userIds: input.selectedUserIds,
            preferenceKey: "squad_announcements",
            type: "team_announcement",
            title: `Team announced: ${eventTitle}`,
            body:
              input.message?.trim() ||
              "You've been selected in the match squad. Open the event for details.",
            link: `/events/${eventId}`,
          });
          if (!fallbackNotification.error) {
            await load();
          }

          setBusy(false);
          return fallbackNotification;
        }
        setBusy(false);
        return upsertResult;
      }

      const selectedNotification = await insertNotifications({
        clubId: state.clubId,
        userIds: input.selectedUserIds,
        preferenceKey: "squad_announcements",
        type: "team_announcement",
        title: `Team announced: ${eventTitle}`,
        body:
          input.message?.trim() ||
          "You've been selected in the match squad. Open the event for details.",
        link: `/events/${eventId}`,
      });
      if (selectedNotification.error) {
        setBusy(false);
        return selectedNotification;
      }

      const reserveNotification = await insertNotifications({
        clubId: state.clubId,
        userIds: input.reserveUserIds,
        preferenceKey: "squad_announcements",
        type: "team_announcement",
        title: `Team announced: ${eventTitle}`,
        body:
          input.message?.trim() ||
          "You've been named as a reserve for this match. Open the event for details.",
        link: `/events/${eventId}`,
      });

      setBusy(false);
      if (!reserveNotification.error) {
        await load();
      }
      return reserveNotification;
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
