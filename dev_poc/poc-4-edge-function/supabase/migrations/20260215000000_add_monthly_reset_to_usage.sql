-- Replace increment_member_usage to auto-reset daily/monthly counters
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
