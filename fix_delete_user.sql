-- =====================================================================
-- FULL USER DELETION + OPEN SIGNUP
-- Run this in Supabase SQL Editor
-- =====================================================================

-- 1. Function to fully delete a user from Supabase Auth (admin only)
-- This deletes from auth.users which cascades to profiles, user_ips, etc.
CREATE OR REPLACE FUNCTION public.delete_user_fully(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Only allow the super admin (elharemayoub1@gmail.com) to delete users
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND email = 'elharemayoub1@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only the super admin can delete users';
  END IF;

  -- Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Prevent deleting other admins
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = target_user_id AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Cannot delete another admin';
  END IF;

  -- Clean up profile data first
  DELETE FROM public.user_ips WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Delete from auth.users (fully removes from Supabase Auth)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users (function checks admin internally)
GRANT EXECUTE ON FUNCTION public.delete_user_fully(UUID) TO authenticated;

-- 2. Ensure email confirmation is disabled for immediate signup
-- (This must also be done in Dashboard: Authentication → Providers → Email → Disable "Confirm email")

-- 3. Admin RLS policies for profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" 
ON public.profiles FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- 4. Admin RLS for user_ips (allow admin to delete any)
DROP POLICY IF EXISTS "Admins can manage user_ips" ON public.user_ips;
CREATE POLICY "Admins can manage user_ips" 
ON public.user_ips FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

SELECT 'Done! Admins can now fully delete users from Supabase Auth.' as result;
