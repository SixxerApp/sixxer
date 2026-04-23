import { createFileRoute, useParams } from "@tanstack/react-router";
import { BarChart3, Plus, Vote } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { formatRelativeDay } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { useTeamPolls } from "@/features/polls/use-team-polls";

export const Route = createFileRoute("/_authenticated/groups/$teamId/polls")({
  component: PollsTab,
});

function PollsTab() {
  const { teamId } = useParams({ from: "/_authenticated/groups/$teamId/polls" });
  const { user } = useAuth();
  const { data: ctx } = useTeamContext(teamId, user?.id);
  const { polls, loading, busy, createPoll, vote } = useTeamPolls(teamId, user?.id);
  const [question, setQuestion] = React.useState("");
  const [options, setOptions] = React.useState(["", ""]);
  const [showComposer, setShowComposer] = React.useState(false);

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, i) => (i === index ? value : option)));
  }

  function addOption() {
    setOptions((current) => (current.length >= 4 ? current : [...current, ""]));
  }

  async function handleCreatePoll(event: React.FormEvent) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((option) => option.trim()).filter(Boolean);

    if (trimmedQuestion.length < 6) {
      toast.error("Add a clearer poll question");
      return;
    }
    if (trimmedOptions.length < 2) {
      toast.error("Add at least two poll options");
      return;
    }

    const { error } = await createPoll(trimmedQuestion, trimmedOptions, null);
    if (error) {
      toast.error(error.message);
      return;
    }

    setQuestion("");
    setOptions(["", ""]);
    setShowComposer(false);
    toast.success("Poll created");
  }

  async function handleVote(pollId: string, optionIndex: number) {
    const { error } = await vote(pollId, optionIndex);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Vote saved");
  }

  return (
    <div>
      {ctx?.isMember && (
        <div className="mb-4">
          <button
            onClick={() => setShowComposer((current) => !current)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Create poll
          </button>
        </div>
      )}

      {ctx?.isMember && showComposer && (
        <form
          onSubmit={handleCreatePoll}
          className="mb-4 rounded-2xl border border-border bg-card p-4"
        >
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question
          </label>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Who is available for Friday nets?"
            maxLength={160}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
          />

          <div className="mt-4 space-y-2">
            {options.map((option, index) => (
              <input
                key={index}
                value={option}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={80}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={addOption}
              disabled={options.length >= 4}
              className="text-xs font-semibold text-primary disabled:text-muted-foreground"
            >
              Add option
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Publish poll
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : polls.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="No polls yet"
          body="Use polls to make quick team decisions without opening another chat thread."
        />
      ) : (
        <ul className="space-y-3">
          {polls.map((poll) => (
            <li key={poll.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{poll.question}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {poll.author_name} · {formatRelativeDay(poll.created_at)}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                  {poll.total_votes} vote{poll.total_votes === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {poll.options.map((option, index) => {
                  const percent =
                    poll.total_votes > 0 ? Math.round((option.votes / poll.total_votes) * 100) : 0;
                  return (
                    <button
                      key={`${poll.id}-${index}`}
                      onClick={() => handleVote(poll.id, index)}
                      disabled={busy || poll.is_closed}
                      className={
                        "block w-full rounded-2xl border p-3 text-left transition-colors " +
                        (option.selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-secondary")
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {option.votes} · {percent}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Vote className="h-3.5 w-3.5" />
                  {poll.my_vote === null ? "You have not voted yet" : "Your vote is counted"}
                </span>
                {poll.closes_at && <span>Closes {formatRelativeDay(poll.closes_at)}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
