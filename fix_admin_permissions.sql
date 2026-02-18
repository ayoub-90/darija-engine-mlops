-- 1. FORCE ADMIN ROLE
-- Update your user to be an ADMIN so you can bypass RLS policies.
-- Replace 'YOUR_EMAIL' below or just run the subquery to pick the most recent user.
UPDATE public.profiles
SET role = 'ADMIN'
WHERE id = auth.uid() OR email = (SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 1);

-- 2. ENSURE PROFILES EXIST
-- In case the trigger didn't run for existing users
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, raw_user_meta_data->>'full_name', 'ADMIN'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- 3. VERIFY RLS POLICIES (Safety Check)
-- Drop and recreate ensuring everything checks out
DROP POLICY IF EXISTS "Admins can manage allowed_users" ON public.allowed_users;
CREATE POLICY "Admins can manage allowed_users" 
ON public.allowed_users FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations" 
ON public.invitations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);
