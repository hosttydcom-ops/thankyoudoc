-- Create memberships table for better data separation
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_type TEXT NOT NULL DEFAULT 'premium',
  amount INTEGER NOT NULL DEFAULT 3500,
  duration_months INTEGER NOT NULL DEFAULT 6,
  appointments_included INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  payment_reference TEXT,
  payment_method TEXT DEFAULT 'online',
  member_details JSONB,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_valid_until ON public.memberships(valid_until);

-- RLS Policies for memberships (Removed as per requirement)
-- ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Users can view their own memberships (Removed)
-- CREATE POLICY "Users can view their own memberships"
-- ON public.memberships
-- FOR SELECT
-- USING (auth.uid() = user_id);

-- Users can create their own memberships (Removed)
-- CREATE POLICY "Users can create their own memberships"
-- ON public.memberships
-- FOR INSERT
-- WITH CHECK (auth.uid() = user_id);

-- Users can update their own memberships (Removed)
-- CREATE POLICY "Users can update their own memberships"
-- ON public.memberships
-- FOR UPDATE
-- USING (auth.uid() = user_id);

-- Admins can view all memberships (Removed)
-- CREATE POLICY "Admins can view all memberships"
-- ON public.memberships
-- FOR SELECT
-- USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any membership (Removed)
-- CREATE POLICY "Admins can update any membership"
-- ON public.memberships
-- FOR UPDATE
-- USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
