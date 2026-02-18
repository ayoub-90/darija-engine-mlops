-- =====================================================================
-- JOIN REQUESTS TABLE + RLS
-- Run this in Supabase SQL Editor
-- =====================================================================

-- 1. Join requests table
CREATE TABLE IF NOT EXISTS public.join_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  decided_by UUID REFERENCES auth.users(id),
  decided_role TEXT CHECK (decided_role IN ('ADMIN', 'RESEARCHER', 'ANNOTATOR', 'VIEWER')),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_pending_email UNIQUE (email)
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can insert a join request
CREATE POLICY "Anyone can request to join"
ON public.join_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only super admin can view/update/delete join requests
CREATE POLICY "Super admin can manage join requests"
ON public.join_requests FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND email = 'elharemayoub1@gmail.com'
  )
);

-- 2. RPC function for anon users to submit a join request
CREATE OR REPLACE FUNCTION public.submit_join_request(req_email TEXT, req_ip TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  existing_status TEXT;
BEGIN
  -- Check if already a user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(req_email)) THEN
    RETURN 'already_exists';
  END IF;

  -- Check if already pending
  SELECT status INTO existing_status FROM public.join_requests WHERE lower(email) = lower(req_email);
  
  IF existing_status = 'pending' THEN
    RETURN 'already_pending';
  END IF;

  IF existing_status = 'denied' THEN
    -- Allow re-request after denial
    DELETE FROM public.join_requests WHERE lower(email) = lower(req_email);
  END IF;

  IF existing_status = 'accepted' THEN
    RETURN 'already_accepted';
  END IF;

  -- Insert new request
  INSERT INTO public.join_requests (email, ip_address, status)
  VALUES (lower(req_email), req_ip, 'pending');

  RETURN 'submitted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_join_request(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_join_request(TEXT, TEXT) TO authenticated;

-- 3. RPC function to get pending request count (for notification badge)
CREATE OR REPLACE FUNCTION public.get_pending_requests_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM public.join_requests WHERE status = 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_pending_requests_count() TO authenticated;

SELECT 'join_requests table and RPC functions created!' as result;
