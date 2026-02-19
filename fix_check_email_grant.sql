-- Fix: Grant EXECUTE on check_email_allowed to anon role
-- This allows unauthenticated users (on the login page) to check if their email was whitelisted
GRANT EXECUTE ON FUNCTION public.check_email_allowed(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_allowed(TEXT) TO authenticated;
