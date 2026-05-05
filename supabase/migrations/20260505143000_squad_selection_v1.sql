ALTER TABLE public.event_squads
  ADD COLUMN reserve_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN captain_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN wicketkeeper_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN role_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT event_squads_reserve_user_ids_is_array CHECK (jsonb_typeof(reserve_user_ids) = 'array'),
  ADD CONSTRAINT event_squads_role_notes_is_object CHECK (jsonb_typeof(role_notes) = 'object');
