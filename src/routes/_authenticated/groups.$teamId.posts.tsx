import { createFileRoute, useParams } from "@tanstack/react-router";
import { ExternalLink, LinkIcon, Megaphone, MessageSquare, Pin, Send } from "lucide-react";
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
  post_type: "post" | "announcement";
  is_pinned: boolean;
  link_url: string | null;
  link_label: string | null;
  my_read_at: string | null;
}

function normalizeHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "invalid";
    return url.toString();
  } catch {
    return "invalid";
  }
}

function linkText(post: PostRow) {
  if (post.link_label?.trim()) return post.link_label.trim();
  if (!post.link_url) return "Open link";

  try {
    return new URL(post.link_url).hostname.replace(/^www\./, "");
  } catch {
    return "Open link";
  }
}

function PostsTab() {
  const { teamId } = useParams({ from: "/_authenticated/groups/$teamId/posts" });
  const { user } = useAuth();
  const { data: ctx } = useTeamContext(teamId, user?.id);
  const [posts, setPosts] = React.useState<PostRow[]>([]);
  const [body, setBody] = React.useState("");
  const [postType, setPostType] = React.useState<"post" | "announcement">("post");
  const [isPinned, setIsPinned] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkLabel, setLinkLabel] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("posts")
      .select("id, body, created_at, author_id, post_type, is_pinned, link_url, link_label")
      .eq("team_id", teamId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    const authorIds = Array.from(new Set((rows ?? []).map((r) => r.author_id)));
    const postIds = (rows ?? []).map((r) => r.id);
    const names: Record<string, string> = {};
    const reads: Record<string, string> = {};

    if (authorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      for (const p of profs ?? []) names[p.id] = p.full_name;
    }

    if (user?.id && postIds.length) {
      const { data: receipts } = await supabase
        .from("post_read_receipts")
        .select("post_id, read_at")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      for (const receipt of receipts ?? []) reads[receipt.post_id] = receipt.read_at;
    }

    setPosts(
      (rows ?? []).map((r) => ({
        ...r,
        author_name: names[r.author_id] ?? "Member",
        my_read_at: reads[r.id] ?? null,
      })),
    );
    setLoading(false);
  }, [teamId, user?.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!user?.id || !posts.length) return;

    const unreadAnnouncementIds = posts
      .filter((post) => post.post_type === "announcement" && !post.my_read_at)
      .map((post) => post.id);

    if (!unreadAnnouncementIds.length) return;

    const readAt = new Date().toISOString();
    void (async () => {
      const { error } = await supabase.from("post_read_receipts").upsert(
        unreadAnnouncementIds.map((postId) => ({
          post_id: postId,
          user_id: user.id,
          read_at: readAt,
        })),
        { onConflict: "post_id,user_id", ignoreDuplicates: true },
      );
      if (error) return;
      setPosts((current) =>
        current.map((post) =>
          unreadAnnouncementIds.includes(post.id) ? { ...post, my_read_at: readAt } : post,
        ),
      );
    })();
  }, [posts, user?.id]);

  async function onPost(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = body.trim();
    if (trimmed.length < 1 || trimmed.length > 2000) {
      toast.error("Posts must be 1-2000 characters");
      return;
    }

    const normalizedLinkUrl = normalizeHttpUrl(linkUrl);
    if (normalizedLinkUrl === "invalid") {
      toast.error("Link must start with http:// or https://");
      return;
    }

    const trimmedLinkLabel = linkLabel.trim();
    if (trimmedLinkLabel && !normalizedLinkUrl) {
      toast.error("Add a link URL before naming it");
      return;
    }
    if (trimmedLinkLabel.length > 120) {
      toast.error("Link label must be 120 characters or fewer");
      return;
    }

    const nextPostType = ctx?.isAdmin ? postType : "post";
    const nextPinned = ctx?.isAdmin ? isPinned : false;

    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      team_id: teamId,
      author_id: user.id,
      body: trimmed,
      post_type: nextPostType,
      is_pinned: nextPinned,
      link_url: normalizedLinkUrl,
      link_label: trimmedLinkLabel || null,
    });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    setPostType("post");
    setIsPinned(false);
    setLinkUrl("");
    setLinkLabel("");
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
          {ctx?.isAdmin && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="rounded-xl border border-border bg-background px-3 py-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Type
                </span>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as "post" | "announcement")}
                  className="mt-1 h-8 w-full bg-transparent text-sm font-semibold outline-none"
                >
                  <option value="post">Team post</option>
                  <option value="announcement">Announcement</option>
                </select>
              </label>
              <label className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="inline-flex items-center gap-2">
                  <Pin className="h-4 w-4" />
                  Pin above other posts
                </span>
              </label>
            </div>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_12rem]">
            <label className="rounded-xl border border-border bg-background px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                <LinkIcon className="h-3.5 w-3.5" />
                Link
              </span>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                inputMode="url"
                className="mt-1 h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="rounded-xl border border-border bg-background px-3 py-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Label
              </span>
              <input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Open link"
                maxLength={120}
                className="mt-1 h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
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
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialAvatar name={p.author_name} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.author_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatRelativeDay(p.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {p.is_pinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </span>
                  )}
                  {p.post_type === "announcement" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                      <Megaphone className="h-3 w-3" />
                      Announcement
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
              {p.link_url && (
                <a
                  href={p.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-semibold text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {linkText(p)}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
