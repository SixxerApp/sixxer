CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  event_reminders BOOLEAN NOT NULL DEFAULT true,
  squad_announcements BOOLEAN NOT NULL DEFAULT true,
  payment_reminders BOOLEAN NOT NULL DEFAULT true,
  posts_polls BOOLEAN NOT NULL DEFAULT true,
  club_updates BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their notification preferences"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notification_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.notification_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX notification_push_tokens_user_idx
  ON public.notification_push_tokens (user_id, last_seen_at DESC);

CREATE POLICY "Users manage their push tokens"
  ON public.notification_push_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
