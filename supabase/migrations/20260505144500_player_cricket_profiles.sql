ALTER TABLE public.profiles
  ADD COLUMN primary_role TEXT,
  ADD COLUMN batting_style TEXT,
  ADD COLUMN bowling_style TEXT,
  ADD COLUMN is_wicketkeeper BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN availability_notes TEXT;
