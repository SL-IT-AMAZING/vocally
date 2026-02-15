-- Members table (replaces Firebase members collection)
CREATE TABLE public.members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'user' CHECK (type = 'user'),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  words_today INTEGER NOT NULL DEFAULT 0,
  words_this_month INTEGER NOT NULL DEFAULT 0,
  words_total INTEGER NOT NULL DEFAULT 0,
  tokens_today INTEGER NOT NULL DEFAULT 0,
  tokens_this_month INTEGER NOT NULL DEFAULT 0,
  tokens_total INTEGER NOT NULL DEFAULT 0,
  today_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  this_month_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_on_trial BOOLEAN DEFAULT TRUE,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  toss_customer_id TEXT,
  price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select_own" ON public.members FOR SELECT USING (auth.uid() = id);
CREATE POLICY "members_update_own" ON public.members FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "members_insert_own" ON public.members FOR INSERT WITH CHECK (auth.uid() = id);

-- Profiles table (replaces Firebase users collection)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  bio TEXT,
  company TEXT,
  title TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  onboarded_at TIMESTAMPTZ,
  timezone TEXT,
  preferred_language TEXT,
  preferred_microphone TEXT,
  play_interaction_chime BOOLEAN NOT NULL DEFAULT TRUE,
  has_finished_tutorial BOOLEAN NOT NULL DEFAULT FALSE,
  words_this_month INTEGER NOT NULL DEFAULT 0,
  words_this_month_month TEXT,
  words_total INTEGER NOT NULL DEFAULT 0,
  cohort TEXT,
  should_show_upgrade_dialog BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.increment_member_usage(
  p_member_id UUID,
  p_words INTEGER DEFAULT 0,
  p_tokens INTEGER DEFAULT 0
) RETURNS void AS $$
BEGIN
  -- Reset daily counters if last reset was a different day
  UPDATE public.members SET
    words_today = 0,
    tokens_today = 0,
    today_reset_at = NOW()
  WHERE id = p_member_id
    AND DATE(today_reset_at AT TIME ZONE 'UTC') < DATE(NOW() AT TIME ZONE 'UTC');

  -- Reset monthly counters if last reset was a different month
  UPDATE public.members SET
    words_this_month = 0,
    tokens_this_month = 0,
    this_month_reset_at = NOW()
  WHERE id = p_member_id
    AND (
      EXTRACT(YEAR FROM this_month_reset_at AT TIME ZONE 'UTC') < EXTRACT(YEAR FROM NOW() AT TIME ZONE 'UTC')
      OR EXTRACT(MONTH FROM this_month_reset_at AT TIME ZONE 'UTC') < EXTRACT(MONTH FROM NOW() AT TIME ZONE 'UTC')
    );

  -- Now increment
  UPDATE public.members SET
    words_today = words_today + p_words,
    words_this_month = words_this_month + p_words,
    words_total = words_total + p_words,
    tokens_today = tokens_today + p_tokens,
    tokens_this_month = tokens_this_month + p_tokens,
    tokens_total = tokens_total + p_tokens,
    updated_at = NOW()
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
