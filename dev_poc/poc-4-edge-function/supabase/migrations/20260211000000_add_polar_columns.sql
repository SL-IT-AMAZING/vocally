-- Add Polar payment columns to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;

-- Index for looking up members by Polar subscription (used in webhook cancellation)
CREATE INDEX IF NOT EXISTS idx_members_polar_subscription_id ON public.members(polar_subscription_id) WHERE polar_subscription_id IS NOT NULL;
