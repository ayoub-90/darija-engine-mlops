-- =====================================================================
-- FIX: New user profile creation + IP recording
-- Run this in Supabase SQL Editor
-- =====================================================================

-- 1. Fix the handle_new_user trigger to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  -- Check whitelist for pre-assigned role
  SELECT role INTO assigned_role 
  FROM public.allowed_users 
  WHERE lower(email) = lower(new.email);
  
  -- Default to VIEWER if not whitelisted (NOT admin!)
  IF assigned_role IS NULL THEN
    assigned_role := 'VIEWER';
  END IF;

  -- Insert profile with all available data
  INSERT INTO public.profiles (id, email, full_name, role, is_active, last_seen_at)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    assigned_role,
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE 
      WHEN public.profiles.role IS NULL THEN EXCLUDED.role 
      ELSE public.profiles.role  -- Don't overwrite existing role
    END,
    full_name = CASE
      WHEN public.profiles.full_name IS NULL THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    last_seen_at = now();

  -- Log the signup
  INSERT INTO public.audit_logs (user_id, user_email, action, resource)
  VALUES (new.id, new.email, 'USER_SIGNED_UP', 'Auth System');

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Never fail silently — log the error but don't block signup
  RAISE WARNING 'handle_new_user failed for %: %', new.email, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Fix RLS: Allow the trigger (SECURITY DEFINER) to insert profiles
--    The trigger runs as the function owner, but we still need policies
--    for the client-side backfill to work:

-- Allow authenticated users to upsert their OWN profile (for backfill)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their OWN profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Admin can update ANY profile (for role changes)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- 4. Fix user_ips RLS to allow upsert
DROP POLICY IF EXISTS "Users save their own IP" ON public.user_ips;
CREATE POLICY "Users save their own IP" 
ON public.user_ips FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Allow all authenticated users to read allowed_users (needed for role check)
DROP POLICY IF EXISTS "Everything readable by authenticated users" ON public.allowed_users;
CREATE POLICY "Everything readable by authenticated users"
ON public.allowed_users FOR SELECT
TO authenticated
USING (true);

-- 6. Fix any existing profiles that are missing their role
UPDATE public.profiles 
SET role = COALESCE(
  (SELECT au.role FROM public.allowed_users au WHERE lower(au.email) = lower(profiles.email)),
  'VIEWER'
)
WHERE role IS NULL;

-- 7. Fix any existing profiles with missing full_name
UPDATE public.profiles 
SET full_name = split_part(email, '@', 1)
WHERE full_name IS NULL AND email IS NOT NULL;

SELECT 'Done! New users will now get correct roles from allowed_users.' as result;
