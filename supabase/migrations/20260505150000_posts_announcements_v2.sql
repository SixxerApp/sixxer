CREATE TYPE public.post_type AS ENUM ('post', 'announcement');

ALTER TABLE public.posts
  ADD COLUMN post_type public.post_type NOT NULL DEFAULT 'post',
  ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN link_url TEXT,
  ADD COLUMN link_label TEXT,
  ADD CONSTRAINT posts_body_length CHECK (char_length(body) BETWEEN 1 AND 2000),
  ADD CONSTRAINT posts_link_url_http CHECK (
    link_url IS NULL OR link_url ~* '^https?://'
  ),
  ADD CONSTRAINT posts_link_label_length CHECK (
    link_label IS NULL OR char_length(link_label) BETWEEN 1 AND 120
  );

CREATE INDEX posts_team_pinned_created_idx
  ON public.posts (team_id, is_pinned DESC, created_at DESC);

DROP POLICY IF EXISTS "Club members can create posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.posts;

CREATE POLICY "Club members can create posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    public.is_club_member(auth.uid(), public.team_club_id(team_id)) AND
    (
      (
        post_type = 'post'::public.post_type AND
        is_pinned = false
      ) OR
      public.has_role(auth.uid(), public.team_club_id(team_id), 'admin')
    )
  );

CREATE POLICY "Authors can update their own posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (
    auth.uid() = author_id OR
    public.has_role(auth.uid(), public.team_club_id(team_id), 'admin')
  )
  WITH CHECK (
    public.is_club_member(auth.uid(), public.team_club_id(team_id)) AND
    (
      (
        auth.uid() = author_id AND
        post_type = 'post'::public.post_type AND
        is_pinned = false
      ) OR
      public.has_role(auth.uid(), public.team_club_id(team_id), 'admin')
    )
  );

CREATE TABLE public.post_read_receipts (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE INDEX post_read_receipts_user_read_idx
  ON public.post_read_receipts (user_id, read_at DESC);

CREATE POLICY "Members can view relevant post read receipts"
  ON public.post_read_receipts FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_role(
      auth.uid(),
      public.team_club_id((SELECT p.team_id FROM public.posts p WHERE p.id = post_id)),
      'admin'
    )
  );

CREATE POLICY "Members can mark their own post reads"
  ON public.post_read_receipts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    public.is_club_member(
      auth.uid(),
      public.team_club_id((SELECT p.team_id FROM public.posts p WHERE p.id = post_id))
    )
  );

CREATE POLICY "Members can refresh their own post reads"
  ON public.post_read_receipts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    public.is_club_member(
      auth.uid(),
      public.team_club_id((SELECT p.team_id FROM public.posts p WHERE p.id = post_id))
    )
  );
