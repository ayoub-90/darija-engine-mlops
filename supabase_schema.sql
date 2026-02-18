-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. PROFILES Table (Extends Auth) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('ADMIN', 'RESEARCHER', 'ANNOTATOR', 'VIEWER')),
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ─── 2. ALLOWED_USERS Table (Whitelist) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.allowed_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'ANNOTATOR',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage allowed_users" 
ON public.allowed_users FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

CREATE POLICY "Everything readable by authenticated users"
ON public.allowed_users FOR SELECT
TO authenticated
USING (true);

-- ─── 3. INVITATIONS Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'RESEARCHER', 'ANNOTATOR', 'VIEWER')),
  token TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" 
ON public.invitations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

CREATE POLICY "Public read for token validation" 
ON public.invitations FOR SELECT 
USING (true);

-- ─── 4. ROLE_PERMISSIONS Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read permissions" 
ON public.role_permissions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only Admins can update permissions" 
ON public.role_permissions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- Seed Permissions
INSERT INTO public.role_permissions (role, permission, enabled) VALUES
('RESEARCHER', 'Manage Models', true),
('RESEARCHER', 'Training Access', true),
('RESEARCHER', 'Dataset Labeling', true),
('RESEARCHER', 'API Keys', false),
('RESEARCHER', 'User Mgmt', false),
('RESEARCHER', 'Deployment', false),

('ANNOTATOR', 'Manage Models', false),
('ANNOTATOR', 'Training Access', false),
('ANNOTATOR', 'Dataset Labeling', true),
('ANNOTATOR', 'API Keys', false),
('ANNOTATOR', 'User Mgmt', false),
('ANNOTATOR', 'Deployment', false)
ON CONFLICT (role, permission) DO NOTHING;

-- ─── 5. AUDIT_LOGS Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read audit logs" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Everyone can insert audit logs" 
ON public.audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- ─── 6. USER_IPS Table (for Presence) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_ips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  ip_address TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users save their own IP" 
ON public.user_ips FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can view IPs" 
ON public.user_ips FOR SELECT 
TO authenticated 
USING (true);

-- ─── 7. TRIGGERS (Auto-create Profile) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  -- Check whitelist/invitations for role
  SELECT role INTO assigned_role FROM public.allowed_users WHERE email = new.email;
  
  IF assigned_role IS NULL THEN
    assigned_role := 'ANNOTATOR'; -- Default role
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    assigned_role
  );

  INSERT INTO public.audit_logs (user_id, user_email, action, resource)
  VALUES (new.id, new.email, 'USER_SIGNED_UP', 'Auth System');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── 8. SECURE INVITATION ACCEPTANCE RPC ──────────────────────────────────
-- Allows authenticated users to accept an invitation matching the token
CREATE OR REPLACE FUNCTION public.accept_invitation_secure(token_str TEXT)
RETURNS JSONB AS $$
DECLARE
  inv_row public.invitations%ROWTYPE;
  current_user_email TEXT;
BEGIN
  -- 1. Find the invitation
  SELECT * INTO inv_row FROM public.invitations WHERE token = token_str LIMIT 1;

  IF inv_row IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or invalid token.';
  END IF;

  -- 2. Validations
  IF inv_row.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted.';
  END IF;

  IF inv_row.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired.';
  END IF;

  -- 3. Verify the current user is the intended recipient (optional strictness)
  SELECT email INTO current_user_email FROM auth.users WHERE id = auth.uid();
  -- If you want to enforce that the logged-in email matches the invite email:
  -- IF lower(current_user_email) <> lower(inv_row.email) THEN
  --   RAISE EXCEPTION 'You are logged in as % but the invitation is for %', current_user_email, inv_row.email;
  -- END IF;

  -- 4. Mark accepted
  UPDATE public.invitations 
  SET accepted_at = now() 
  WHERE id = inv_row.id;

  -- 5. Update user role
  UPDATE public.profiles
  SET role = inv_row.role
  WHERE id = auth.uid();

  -- 6. Log it
  INSERT INTO public.audit_logs (user_id, user_email, action, resource, details)
  VALUES (
    auth.uid(), 
    current_user_email,
    'INVITATION_ACCEPTED', 
    inv_row.email,
    jsonb_build_object('role', inv_row.role)
  );

  RETURN to_jsonb(inv_row);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to auth users
GRANT EXECUTE ON FUNCTION public.accept_invitation_secure(TEXT) TO authenticated;

-- Helper for logging audits from client
CREATE OR REPLACE FUNCTION log_audit_event(p_action TEXT, p_resource TEXT DEFAULT NULL, p_details JSONB DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, user_email, action, resource, details)
  VALUES (
    auth.uid(), 
    (SELECT email FROM auth.users WHERE id = auth.uid()), 
    p_action, 
    p_resource, 
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
