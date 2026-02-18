-- ============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR (https://supabase.com/dashboard → SQL Editor)
-- ============================================================================

-- 1. Set your user to ADMIN
UPDATE public.profiles
SET role = 'ADMIN'
WHERE email = 'elharemayoub1@gmail.com';

-- 2. Allow admins to update ANY profile (needed for role changes)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- 3. Verify it worked
SELECT id, email, role FROM public.profiles WHERE email = 'elharemayoub1@gmail.com';
