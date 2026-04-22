import { createFileRoute, useParams } from "@tanstack/react-router";
import { MessageSquare, Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { InitialAvatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { formatRelativeDay } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/groups/$teamId/posts")({
  component: PostsTab,
});

interface PostRow {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
}

function PostsTab() {
  const { teamId } = useParams({ from: "/_authenticated/groups/$teamId/posts" });
  const { user } = useAuth();
  const { data: ctx } = useTeamContext(teamId, user?.id);
  const [posts, setPosts] = React.useState<PostRow[]>([]);
  const [body, setBody] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("posts")
      .select("id, body, created_at, author_id")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });
    const authorIds = Array.from(new Set((rows ?? []).map((r) => r.author_id)));
    const names: Record<string, string> = {};
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      for (const p of profs ?? []) names[p.id] = p.full_name;
    }
    setPosts(
      (rows ?? []).map((r) => ({ ...r, author_name: names[r.author_id] ?? "Member" })),
    );
    setLoading(false);
  }, [teamId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function onPost(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = body.trim();
    if (trimmed.length < 1 || trimmed.length > 2000) {
      toast.error("Posts must be 1-2000 characters");
      return;
    }
    setPosting(true);
    const { error } = await supabase
      .from("posts")
      .insert({ team_id: teamId, author_id: user.id, body: trimmed });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    void load();
  }

  return (
    <div>
      {ctx?.isMember && (
        <form onSubmit={onPost} className="mb-4 rounded-2xl border border-border bg-card p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share an update with the team…"
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-xl bg-transparent p-2 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-muted-foreground">{body.length}/2000</span>
            <button
              type="submit"
              disabled={posting || body.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Post
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" />}
          title="No posts yet"
          body="Be the first to share an update with the team."
        />
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <InitialAvatar name={p.author_name} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.author_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatRelativeDay(p.created_at)}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
