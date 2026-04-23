import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PollOptionResult {
  label: string;
  votes: number;
  selected: boolean;
}

export interface TeamPoll {
  id: string;
  question: string;
  author_name: string;
  created_at: string;
  closes_at: string | null;
  total_votes: number;
  my_vote: number | null;
  is_closed: boolean;
  options: PollOptionResult[];
}

interface RawPollRow {
  id: string;
  author_id: string;
  question: string;
  options: string[];
  closes_at: string | null;
  created_at: string;
}

async function fetchTeamPolls(teamId: string, userId: string | undefined) {
  const { data: pollRows } = await supabase
    .from("polls")
    .select("id, author_id, question, options, closes_at, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  const rows = (pollRows ?? []).map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? row.options.map(String) : [],
  })) as RawPollRow[];

  const authorIds = Array.from(new Set(rows.map((row) => row.author_id)));
  const authorNames: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    for (const profile of profiles ?? []) {
      authorNames[profile.id] = profile.full_name;
    }
  }

  const pollIds = rows.map((row) => row.id);
  const voteMap: Record<string, number[]> = {};
  const myVoteMap: Record<string, number> = {};
  if (pollIds.length > 0) {
    const { data: votes } = await supabase
      .from("poll_votes")
      .select("poll_id, user_id, option_index")
      .in("poll_id", pollIds);

    for (const vote of votes ?? []) {
      voteMap[vote.poll_id] ??= [];
      voteMap[vote.poll_id].push(vote.option_index);
      if (userId && vote.user_id === userId) {
        myVoteMap[vote.poll_id] = vote.option_index;
      }
    }
  }

  return rows.map((row) => {
    const votes = voteMap[row.id] ?? [];
    const myVote = myVoteMap[row.id] ?? null;
    const closesAt = row.closes_at ? new Date(row.closes_at) : null;
    const isClosed = !!closesAt && closesAt.getTime() < Date.now();

    return {
      id: row.id,
      question: row.question,
      author_name: authorNames[row.author_id] ?? "Member",
      created_at: row.created_at,
      closes_at: row.closes_at,
      total_votes: votes.length,
      my_vote: myVote,
      is_closed: isClosed,
      options: row.options.map((label, index) => ({
        label,
        votes: votes.filter((vote) => vote === index).length,
        selected: myVote === index,
      })),
    } satisfies TeamPoll;
  });
}

export async function createTeamPoll(input: {
  teamId: string;
  userId: string;
  question: string;
  options: string[];
  closesAt: string | null;
}) {
  return supabase.from("polls").insert({
    team_id: input.teamId,
    author_id: input.userId,
    question: input.question,
    options: input.options,
    closes_at: input.closesAt,
  });
}

export async function voteOnTeamPoll(pollId: string, userId: string, optionIndex: number) {
  return supabase.from("poll_votes").upsert(
    {
      poll_id: pollId,
      user_id: userId,
      option_index: optionIndex,
    },
    { onConflict: "poll_id,user_id" },
  );
}

export function useTeamPolls(teamId: string, userId: string | undefined) {
  const [polls, setPolls] = React.useState<TeamPoll[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setPolls(await fetchTeamPolls(teamId, userId));
    setLoading(false);
  }, [teamId, userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createPoll = React.useCallback(
    async (question: string, options: string[], closesAt: string | null) => {
      if (!userId) return { error: new Error("Missing user") };
      setBusy(true);
      const result = await createTeamPoll({ teamId, userId, question, options, closesAt });
      setBusy(false);
      if (!result.error) {
        await load();
      }
      return result;
    },
    [load, teamId, userId],
  );

  const vote = React.useCallback(
    async (pollId: string, optionIndex: number) => {
      if (!userId) return { error: new Error("Missing user") };
      setBusy(true);
      const result = await voteOnTeamPoll(pollId, userId, optionIndex);
      setBusy(false);
      if (!result.error) {
        await load();
      }
      return result;
    },
    [load, userId],
  );

  return { polls, loading, busy, createPoll, vote, reload: load };
}
