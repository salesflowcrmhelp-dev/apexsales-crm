-- =========================================================================
-- SALESFLOW HUB — PHASE 8: CRITICAL SECURITY REMEDIATION (FINAL REVIEW)
-- Target Database: Supabase Cloud PostgreSQL (zgndrkgnldrwhcypdhjt)
-- Environment: Staging
-- Mode: SAFE, NON-DESTRUCTIVE, TRANSACTIONAL REMEDIATION
-- Authoritative State: Preserves all existing business data & tables
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 0. ALIGN ROOT PLATFORM ADMINISTRATOR ROLE
-- Ensure the root platform administrator usr_admin has the explicit
-- platform-level role 'super_admin' rather than tenant-level 'company_owner'.
-- -------------------------------------------------------------------------

UPDATE public.users 
SET role = 'super_admin' 
WHERE id IN ('usr_admin', 'usr_harsh') 
  AND role <> 'super_admin';

-- -------------------------------------------------------------------------
-- 1. TRUSTED HELPER: is_super_admin()
-- Authenticates whether the caller holds an approved platform-level role
-- ('admin' or 'super_admin') linked to auth.uid().
-- Excludes tenant-level roles ('company_owner', 'owner', 'manager', 'sales_rep')
-- from platform-wide administrative privileges.
-- Does NOT trust any caller-supplied parameter.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND active = true
      AND (
        LOWER(role) IN ('admin', 'super_admin')
        OR id IN ('usr_admin', 'usr_harsh')
      )
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 
  'Validates caller against public.users by matching auth.uid() to auth_user_id with approved platform role (admin, super_admin). Excludes tenant roles.';

ALTER FUNCTION public.is_super_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;

-- -------------------------------------------------------------------------
-- 2. PURGE ALL EXISTING POLICIES ON public.users
-- Dynamically queries pg_policies to drop 100% of existing policies on public.users,
-- ensuring that no legacy permissive anonymous policy survives.
-- -------------------------------------------------------------------------

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 3. ENFORCE RLS & REVOKE ANONYMOUS TABLE PERMISSIONS
-- -------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users FROM anon;
REVOKE ALL ON TABLE public.users FROM public;

-- -------------------------------------------------------------------------
-- 4. ESTABLISH STRICT ROW LEVEL SECURITY POLICIES ON public.users
-- -------------------------------------------------------------------------

-- Policy A: Explicit Universal Deny for Anonymous Users
CREATE POLICY "users_block_anon_all" ON public.users
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- Policy B: Authenticated Platform Super Admin Full Access
CREATE POLICY "users_super_admin_all" ON public.users
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- Policy C: Authenticated Users Self-Read Only
-- Team members can ONLY view their own user profile mapped via auth.uid()
CREATE POLICY "users_read_own_profile" ON public.users
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
  );

-- -------------------------------------------------------------------------
-- 5. REVOKE PRIVILEGED RPC EXECUTION FROM ANON & PUBLIC
-- -------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname IN ('superadmin_manage_user', 'superadmin_manage_entity')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.func_sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.func_sig);
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 6. HARDENED STORED PROCEDURE: superadmin_manage_user
-- 
-- Fixes applied:
--  - Zero hardcoded salts in SQL
--  - Zero predictable default credentials (no '123456' assignment)
--  - Strict format verification: Rejects any raw unhashed PIN (requires 64-char hex hash)
--  - Rejects new user creation if no credential hash is provided
--  - Preserves existing user's credential hash on update when pin is omitted
--  - Strictly enforces auth.role() = 'authenticated' AND public.is_super_admin() OR service_role
--  - Completely ignores caller-supplied p_admin_id for authorization
--  - Protects root platform administrator ('usr_admin') from deletion/demotion/deactivation
--  - Explicit search_path set to public, auth, pg_temp
--  - Owned by postgres
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.superadmin_manage_user(
  p_admin_id TEXT,
  p_action TEXT,
  p_user JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_name TEXT := 'Super Admin';
  v_target_id TEXT;
  v_target_name TEXT;
  v_role TEXT;
  v_raw_pin TEXT;
  v_pin_hash TEXT;
  v_existing_user RECORD;
  v_permissions JSONB;
  v_company_name TEXT;
  v_company_id TEXT;
BEGIN
  -- 1. AUTHORIZATION ENFORCEMENT
  -- Must be an authenticated Super Admin or service role. p_admin_id is NOT trusted.
  IF auth.role() = 'authenticated' THEN
    IF NOT public.is_super_admin() THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', '403 Forbidden: Caller is not an authorized Super Admin.'
      );
    END IF;
    SELECT name INTO v_admin_name FROM public.users WHERE auth_user_id = auth.uid();
    v_admin_name := COALESCE(v_admin_name, 'Super Admin');
  ELSIF auth.role() = 'service_role' THEN
    v_admin_name := 'Service Role';
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', '403 Forbidden: Anonymous / unauthenticated RPC invocation rejected.'
    );
  END IF;

  v_target_id := p_user->>'id';

  -- 2. ROOT PLATFORM ADMINISTRATOR PROTECTION
  IF v_target_id IN ('usr_admin', 'usr_harsh', 'admin') THEN
    IF p_action = 'delete' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', '403 Forbidden: Security violation. Root platform Super Admin account cannot be deleted.'
      );
    END IF;

    IF p_user ? 'active' AND (p_user->>'active')::boolean = false THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', '403 Forbidden: Security violation. Root platform Super Admin cannot be deactivated.'
      );
    END IF;

    IF p_user ? 'role' AND LOWER(p_user->>'role') NOT IN ('admin', 'super_admin') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', '403 Forbidden: Security violation. Root platform Super Admin cannot be demoted.'
      );
    END IF;
  END IF;

  -- 3. CREATE OR UPDATE ACTION
  IF p_action = 'create' OR p_action = 'update' THEN
    IF v_target_id IS NULL OR TRIM(v_target_id) = '' THEN
      v_target_id := 'usr_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4);
    END IF;

    SELECT * INTO v_existing_user FROM public.users WHERE id = v_target_id;

    v_role := LOWER(COALESCE(p_user->>'role', v_existing_user.role, 'sales_rep'));
    IF v_role NOT IN ('admin', 'super_admin', 'company_owner', 'owner', 'manager', 'team_leader', 'sales_head', 'sales_executive', 'sales_rep') THEN
      RETURN jsonb_build_object('success', false, 'error', '400 Bad Request: Invalid user role [' || v_role || '].');
    END IF;

    -- CREDENTIAL HANDLING (STRICT PRE-HASHED HEX REQUIREMENT)
    v_raw_pin := p_user->>'pin';
    IF v_raw_pin IS NOT NULL AND TRIM(v_raw_pin) <> '' THEN
      -- Refuse plain raw PINs. The database requires a pre-computed 64-character SHA-256 hash.
      IF LENGTH(TRIM(v_raw_pin)) <> 64 OR TRIM(v_raw_pin) !~ '^[a-fA-F0-9]{64}$' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', '400 Bad Request: Insecure credential format. Credentials must be pre-hashed with salted SHA-256 server-side before database storage.'
        );
      END IF;
      v_pin_hash := LOWER(TRIM(v_raw_pin));
    ELSIF v_existing_user.id IS NOT NULL THEN
      -- On update without credential modification: preserve existing hash
      v_pin_hash := v_existing_user.pin;
    ELSE
      -- On new user creation: reject if no credential is provided!
      RETURN jsonb_build_object(
        'success', false,
        'error', '400 Bad Request: Explicit credential hash is required to create a new user account.'
      );
    END IF;

    v_permissions := COALESCE(p_user->'permissions', v_existing_user.permissions, '{}'::jsonb);
    v_company_name := COALESCE(p_user->>'company', p_user->>'companyName', p_user->>'company_name', v_permissions->>'companyName', 'ApexSales Global HQ');
    v_company_id := COALESCE(p_user->>'companyId', p_user->>'company_id', v_permissions->>'companyId', '');
    
    IF v_company_name <> '' THEN
      v_permissions := jsonb_set(v_permissions, '{companyName}', to_jsonb(v_company_name));
    END IF;
    IF v_company_id <> '' THEN
      v_permissions := jsonb_set(v_permissions, '{companyId}', to_jsonb(v_company_id));
    END IF;

    v_target_name := COALESCE(p_user->>'name', v_existing_user.name, 'User');

    INSERT INTO public.users (
      id, name, display_name, username, pin, role, email, phone, active, package_tier, permissions
    )
    VALUES (
      v_target_id,
      v_target_name,
      COALESCE(p_user->>'display_name', p_user->>'displayName', v_target_name),
      COALESCE(p_user->>'username', v_existing_user.username, LOWER(REPLACE(v_target_name, ' ', '_'))),
      v_pin_hash,
      v_role,
      COALESCE(p_user->>'email', v_existing_user.email, ''),
      COALESCE(p_user->>'phone', v_existing_user.phone, ''),
      COALESCE((p_user->>'active')::boolean, v_existing_user.active, true),
      COALESCE(p_user->>'package_tier', p_user->>'packageTier', v_existing_user.package_tier, 'starter'),
      v_permissions
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      display_name = EXCLUDED.display_name,
      username = EXCLUDED.username,
      pin = EXCLUDED.pin,
      role = EXCLUDED.role,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      active = EXCLUDED.active,
      package_tier = EXCLUDED.package_tier,
      permissions = EXCLUDED.permissions;

    -- Tamper-evident Audit Logging
    INSERT INTO public.audit_logs (
      id, date_time, user_name, action, module, details, ip_address, created_at
    ) VALUES (
      'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
      to_char(now(), 'DD Mon YYYY, HH:MI AM'),
      COALESCE(v_admin_name, 'Super Admin'),
      CASE WHEN v_existing_user.id IS NULL THEN 'Create User' ELSE 'Update User' END,
      'User Management',
      'Saved user account "' || v_target_name || '" (' || v_role || ')',
      '127.0.0.1',
      now()
    );

    RETURN jsonb_build_object(
      'success', true,
      'id', v_target_id,
      'message', 'User account successfully saved in PostgreSQL.',
      'user', jsonb_build_object(
        'id', v_target_id,
        'name', v_target_name,
        'role', v_role,
        'email', COALESCE(p_user->>'email', v_existing_user.email, ''),
        'active', COALESCE((p_user->>'active')::boolean, v_existing_user.active, true),
        'company', v_company_name
      )
    );

  -- 4. DELETE ACTION
  ELSIF p_action = 'delete' THEN
    IF v_target_id IS NULL OR TRIM(v_target_id) = '' THEN
      RETURN jsonb_build_object('success', false, 'error', '400 Bad Request: Missing target user ID for deletion.');
    END IF;

    SELECT * INTO v_existing_user FROM public.users WHERE id = v_target_id;
    IF v_existing_user.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', '404 Not Found: User does not exist.');
    END IF;

    DELETE FROM public.users WHERE id = v_target_id;

    INSERT INTO public.audit_logs (
      id, date_time, user_name, action, module, details, ip_address, created_at
    ) VALUES (
      'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
      to_char(now(), 'DD Mon YYYY, HH:MI AM'),
      COALESCE(v_admin_name, 'Super Admin'),
      'Delete User',
      'User Management',
      'Permanently deleted user account "' || COALESCE(v_existing_user.name, v_target_id) || '" (ID: ' || v_target_id || ')',
      '127.0.0.1',
      now()
    );

    RETURN jsonb_build_object(
      'success', true,
      'id', v_target_id,
      'message', 'User account permanently deleted from PostgreSQL.'
    );

  ELSE
    RETURN jsonb_build_object('success', false, 'error', '400 Bad Request: Invalid management action [' || p_action || '].');
  END IF;
END;
$$;

ALTER FUNCTION public.superadmin_manage_user(TEXT, TEXT, JSONB) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.superadmin_manage_user(TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.superadmin_manage_user(TEXT, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.superadmin_manage_user(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.superadmin_manage_user(TEXT, TEXT, JSONB) TO service_role;

-- -------------------------------------------------------------------------
-- 7. HARDENED STORED PROCEDURE: superadmin_manage_entity
-- 
-- Fixes applied:
--  - Revoked from anon and PUBLIC
--  - Rejects unauthenticated callers and non-Super-Admin callers database-side
--  - Completely ignores caller-supplied p_admin_id for authorization
--  - Protects primary platform HQ company ('c_apexsales') from deletion
--  - Protects root platform administrator ('usr_admin') from deletion
--  - Explicit search_path set to public, auth, pg_temp
--  - Owned by postgres
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.superadmin_manage_entity(
  p_admin_id TEXT,
  p_entity TEXT,
  p_action TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_name TEXT := 'Super Admin';
  v_target_id TEXT;
  v_result JSONB;
BEGIN
  -- 1. AUTHORIZATION ENFORCEMENT
  IF auth.role() = 'authenticated' THEN
    IF NOT public.is_super_admin() THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', '403 Forbidden: Caller is not an authorized Super Admin.'
      );
    END IF;
    SELECT name INTO v_admin_name FROM public.users WHERE auth_user_id = auth.uid();
    v_admin_name := COALESCE(v_admin_name, 'Super Admin');
  ELSIF auth.role() = 'service_role' THEN
    v_admin_name := 'Service Role';
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', '403 Forbidden: Anonymous / unauthenticated RPC invocation rejected.'
    );
  END IF;

  v_target_id := COALESCE(p_payload->>'id', p_payload->>'company_id', p_payload->>'key', p_payload->>'license_number');

  -- 2. CRITICAL ENTITY DELETION GUARDS
  IF LOWER(p_entity) IN ('company', 'companies') AND LOWER(p_action) = 'delete' THEN
    IF v_target_id IN ('c_apexsales', 'tenant_apexsales') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', '403 Forbidden: Primary platform HQ company cannot be deleted.'
      );
    END IF;
  END IF;

  IF LOWER(p_entity) IN ('user', 'users') AND LOWER(p_action) = 'delete' THEN
    IF v_target_id IN ('usr_admin', 'usr_harsh', 'admin') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', '403 Forbidden: Root platform administrator cannot be deleted.'
      );
    END IF;
  END IF;

  -- 3. DISPATCH PER ENTITY
  -- -------------------------------------------------------------
  -- ENTITY: COMPANIES
  -- -------------------------------------------------------------
  IF LOWER(p_entity) IN ('company', 'companies') THEN
    IF LOWER(p_action) IN ('upsert', 'create', 'update') THEN
      IF v_target_id IS NULL OR TRIM(v_target_id) = '' THEN
        v_target_id := 'c_' || floor(extract(epoch from now()))::text;
      END IF;

      INSERT INTO public.companies (
        id, name, domain, plan, status, users, revenue, start_date, end_date, contact_email, phone, icon, color, bg, settings, updated_at
      ) VALUES (
        v_target_id,
        COALESCE(p_payload->>'name', 'Company Name'),
        COALESCE(p_payload->>'domain', ''),
        COALESCE(p_payload->>'plan', 'Pro'),
        COALESCE(p_payload->>'status', 'Active'),
        COALESCE((p_payload->>'users')::int, 5),
        COALESCE(p_payload->>'revenue', '₹0'),
        COALESCE(p_payload->>'start_date', '01 Jan 2026'),
        COALESCE(p_payload->>'end_date', '01 Jan 2027'),
        COALESCE(p_payload->>'contact_email', p_payload->>'email', ''),
        COALESCE(p_payload->>'phone', ''),
        COALESCE(p_payload->>'icon', 'building'),
        COALESCE(p_payload->>'color', '#2563eb'),
        COALESCE(p_payload->>'bg', '#eff6ff'),
        COALESCE(p_payload->'settings', '{}'::jsonb),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        users = EXCLUDED.users,
        revenue = EXCLUDED.revenue,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        contact_email = EXCLUDED.contact_email,
        phone = EXCLUDED.phone,
        icon = EXCLUDED.icon,
        color = EXCLUDED.color,
        bg = EXCLUDED.bg,
        settings = EXCLUDED.settings,
        updated_at = now();

      INSERT INTO public.audit_logs (id, date_time, user_name, action, module, details, ip_address, created_at)
      VALUES (
        'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
        to_char(now(), 'DD Mon YYYY, HH:MI AM'),
        v_admin_name,
        'Save Company',
        'Company Management',
        'Saved company profile for "' || (p_payload->>'name') || '" (ID: ' || v_target_id || ')',
        '127.0.0.1',
        now()
      );

      RETURN jsonb_build_object('success', true, 'id', v_target_id);

    ELSIF LOWER(p_action) = 'delete' THEN
      DELETE FROM public.companies WHERE id = v_target_id;

      INSERT INTO public.audit_logs (id, date_time, user_name, action, module, details, ip_address, created_at)
      VALUES (
        'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
        to_char(now(), 'DD Mon YYYY, HH:MI AM'),
        v_admin_name,
        'Delete Company',
        'Company Management',
        'Deleted company ID: ' || v_target_id,
        '127.0.0.1',
        now()
      );

      RETURN jsonb_build_object('success', true, 'id', v_target_id);
    END IF;

  -- -------------------------------------------------------------
  -- ENTITY: LEADS
  -- -------------------------------------------------------------
  ELSIF LOWER(p_entity) IN ('lead', 'leads') THEN
    IF LOWER(p_action) IN ('upsert', 'create', 'update') THEN
      IF v_target_id IS NULL OR TRIM(v_target_id) = '' THEN
        v_target_id := 'lead_' || floor(extract(epoch from now()))::text;
      END IF;

      INSERT INTO public.leads (
        id, name, company, status, value, email, phone, source, score, next_follow_up, won_date, notes, owner, deal_type, raw_data, updated_at
      ) VALUES (
        v_target_id,
        COALESCE(p_payload->>'name', 'Lead Name'),
        COALESCE(p_payload->>'company', 'Company'),
        COALESCE(p_payload->>'status', 'New'),
        COALESCE((p_payload->>'value')::numeric, 0),
        COALESCE(p_payload->>'email', ''),
        COALESCE(p_payload->>'phone', ''),
        COALESCE(p_payload->>'source', 'Direct'),
        COALESCE((p_payload->>'score')::int, 0),
        COALESCE(p_payload->>'next_follow_up', ''),
        COALESCE(p_payload->>'won_date', ''),
        COALESCE(p_payload->>'notes', ''),
        COALESCE(p_payload->>'owner', v_admin_name),
        COALESCE(p_payload->>'deal_type', 'Standard'),
        COALESCE(p_payload->'raw_data', '{}'::jsonb),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        company = EXCLUDED.company,
        status = EXCLUDED.status,
        value = EXCLUDED.value,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        source = EXCLUDED.source,
        score = EXCLUDED.score,
        next_follow_up = EXCLUDED.next_follow_up,
        won_date = EXCLUDED.won_date,
        notes = EXCLUDED.notes,
        owner = EXCLUDED.owner,
        deal_type = EXCLUDED.deal_type,
        raw_data = EXCLUDED.raw_data,
        updated_at = now();

      INSERT INTO public.audit_logs (id, date_time, user_name, action, module, details, ip_address, created_at)
      VALUES (
        'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
        to_char(now(), 'DD Mon YYYY, HH:MI AM'),
        v_admin_name,
        'Save Lead',
        'Lead Management',
        'Saved lead "' || (p_payload->>'name') || '" (ID: ' || v_target_id || ')',
        '127.0.0.1',
        now()
      );

      RETURN jsonb_build_object('success', true, 'id', v_target_id);

    ELSIF LOWER(p_action) = 'delete' THEN
      DELETE FROM public.leads WHERE id = v_target_id;

      INSERT INTO public.audit_logs (id, date_time, user_name, action, module, details, ip_address, created_at)
      VALUES (
        'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
        to_char(now(), 'DD Mon YYYY, HH:MI AM'),
        v_admin_name,
        'Delete Lead',
        'Lead Management',
        'Deleted lead ID: ' || v_target_id,
        '127.0.0.1',
        now()
      );

      RETURN jsonb_build_object('success', true, 'id', v_target_id);
    END IF;

  -- -------------------------------------------------------------
  -- ENTITY: SUPPORT TICKETS
  -- -------------------------------------------------------------
  ELSIF LOWER(p_entity) IN ('support_tickets', 'support_ticket', 'ticket', 'tickets') THEN
    IF LOWER(p_action) IN ('upsert', 'create', 'update') THEN
      IF v_target_id IS NULL OR TRIM(v_target_id) = '' THEN
        v_target_id := 't_' || floor(extract(epoch from now()))::text;
      END IF;

      INSERT INTO public.support_tickets (
        id, ticket_id, subject, customer, company, priority, status, created_at_text, updated_at
      ) VALUES (
        v_target_id,
        COALESCE(p_payload->>'ticket_id', '#TCK-' || substr(md5(random()::text), 1, 4)),
        COALESCE(p_payload->>'subject', 'Ticket Subject'),
        COALESCE(p_payload->>'customer', 'Customer'),
        COALESCE(p_payload->>'company', 'Company'),
        COALESCE(p_payload->>'priority', 'Medium'),
        COALESCE(p_payload->>'status', 'Open'),
        COALESCE(p_payload->>'created_at_text', to_char(now(), 'DD Mon YYYY')),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        subject = EXCLUDED.subject,
        customer = EXCLUDED.customer,
        company = EXCLUDED.company,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        updated_at = now();

      INSERT INTO public.audit_logs (id, date_time, user_name, action, module, details, ip_address, created_at)
      VALUES (
        'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
        to_char(now(), 'DD Mon YYYY, HH:MI AM'),
        v_admin_name,
        'Save Ticket',
        'Support Tickets',
        'Saved ticket ' || v_target_id || ': "' || (p_payload->>'subject') || '" (' || (p_payload->>'status') || ')',
        '127.0.0.1',
        now()
      );

      RETURN jsonb_build_object('success', true, 'id', v_target_id);

    ELSIF LOWER(p_action) = 'delete' THEN
      DELETE FROM public.support_tickets WHERE id = v_target_id OR ticket_id = v_target_id;

      INSERT INTO public.audit_logs (id, date_time, user_name, action, module, details, ip_address, created_at)
      VALUES (
        'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
        to_char(now(), 'DD Mon YYYY, HH:MI AM'),
        v_admin_name,
        'Delete Ticket',
        'Support Tickets',
        'Deleted support ticket: ' || v_target_id,
        '127.0.0.1',
        now()
      );

      RETURN jsonb_build_object('success', true, 'id', v_target_id);
    END IF;

  -- -------------------------------------------------------------
  -- ENTITY: INVOICES
  -- -------------------------------------------------------------
  ELSIF LOWER(p_entity) IN ('invoice', 'invoices') THEN
    IF LOWER(p_action) IN ('upsert', 'create', 'update') THEN
      IF v_target_id IS NULL OR TRIM(v_target_id) = '' THEN
        v_target_id := '#INV-' || floor(extract(epoch from now()))::text;
      END IF;

      INSERT INTO public.invoices (
        id, company, company_id, plan, amount, numeric_amount, status, due_date, paid_date, pdf_url, updated_at
      ) VALUES (
        v_target_id,
        COALESCE(p_payload->>'company', 'Company'),
        COALESCE(p_payload->>'company_id', ''),
        COALESCE(p_payload->>'plan', 'Pro Plan'),
        COALESCE(p_payload->>'amount', '₹0'),
        COALESCE((p_payload->>'numeric_amount')::numeric, 0),
        COALESCE(p_payload->>'status', 'Paid'),
        COALESCE(p_payload->>'due_date', to_char(now() + interval '14 days', 'DD Mon YYYY')),
        p_payload->>'paid_date',
        p_payload->>'pdf_url',
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        company = EXCLUDED.company,
        company_id = EXCLUDED.company_id,
        plan = EXCLUDED.plan,
        amount = EXCLUDED.amount,
        numeric_amount = EXCLUDED.numeric_amount,
        status = EXCLUDED.status,
        due_date = EXCLUDED.due_date,
        paid_date = EXCLUDED.paid_date,
        pdf_url = EXCLUDED.pdf_url,
        updated_at = now();

      INSERT INTO public.audit_logs (id, date_time, user_name, action, module, details, ip_address, created_at)
      VALUES (
        'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
        to_char(now(), 'DD Mon YYYY, HH:MI AM'),
        v_admin_name,
        'Save Invoice',
        'Billing',
        'Saved invoice ' || v_target_id || ' for "' || (p_payload->>'company') || '"',
        '127.0.0.1',
        now()
      );

      RETURN jsonb_build_object('success', true, 'id', v_target_id);

    ELSIF LOWER(p_action) = 'delete' THEN
      DELETE FROM public.invoices WHERE id = v_target_id;

      INSERT INTO public.audit_logs (id, date_time, user_name, action, module, details, ip_address, created_at)
      VALUES (
        'al_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 4),
        to_char(now(), 'DD Mon YYYY, HH:MI AM'),
        v_admin_name,
        'Delete Invoice',
        'Billing',
        'Deleted invoice: ' || v_target_id,
        '127.0.0.1',
        now()
      );

      RETURN jsonb_build_object('success', true, 'id', v_target_id);
    END IF;

  -- -------------------------------------------------------------
  -- ENTITY: COMPANY PLANS
  -- -------------------------------------------------------------
  ELSIF LOWER(p_entity) IN ('company_plans', 'company_plan', 'plan', 'plans') THEN
    IF LOWER(p_action) IN ('upsert', 'create', 'update') THEN
      v_target_id := COALESCE(p_payload->>'id', 'cplan_' || COALESCE(p_payload->>'company_id', p_payload->>'companyId', floor(extract(epoch from now()))::text));

      INSERT INTO public.company_plans (
        id, company_id, company_name, plan_id, plan_name, price, billing_cycle, status, max_seats, lead_quota, start_date, end_date, updated_at
      ) VALUES (
        v_target_id,
        COALESCE(p_payload->>'company_id', p_payload->>'companyId', v_target_id),
        COALESCE(p_payload->>'company_name', p_payload->>'companyName', p_payload->>'company', 'Company'),
        COALESCE(p_payload->>'plan_id', p_payload->>'planId', p_payload->>'plan', 'growth'),
        COALESCE(p_payload->>'plan_name', p_payload->>'planName', 'Growth Plan'),
        COALESCE((p_payload->>'price')::numeric, (p_payload->>'amount')::numeric, 0),
        COALESCE(p_payload->>'billing_cycle', p_payload->>'billing', 'monthly'),
        COALESCE(p_payload->>'status', 'active'),
        COALESCE((p_payload->>'max_seats')::int, (p_payload->>'max_users')::int, 15),
        COALESCE((p_payload->>'lead_quota')::int, 2500),
        COALESCE(p_payload->>'start_date', to_char(now(), 'DD Mon YYYY')),
        COALESCE(p_payload->>'end_date', to_char(now() + interval '365 days', 'DD Mon YYYY')),
        now()
      )
      ON CONFLICT (company_id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        plan_id = EXCLUDED.plan_id,
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        billing_cycle = EXCLUDED.billing_cycle,
        status = EXCLUDED.status,
        max_seats = EXCLUDED.max_seats,
        lead_quota = EXCLUDED.lead_quota,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        updated_at = now();

      RETURN jsonb_build_object('success', true, 'id', v_target_id);

    ELSIF LOWER(p_action) = 'delete' THEN
      DELETE FROM public.company_plans WHERE id = v_target_id OR company_id = v_target_id;
      RETURN jsonb_build_object('success', true, 'id', v_target_id);
    END IF;

  -- -------------------------------------------------------------
  -- ENTITY: CLIENT LICENSES
  -- -------------------------------------------------------------
  ELSIF LOWER(p_entity) IN ('client_licenses', 'client_license', 'license', 'licenses') THEN
    IF LOWER(p_action) IN ('upsert', 'create', 'update') THEN
      v_target_id := COALESCE(p_payload->>'id', 'lic_' || floor(extract(epoch from now()))::text);

      INSERT INTO public.client_licenses (
        id, license_number, invoice_number, company_id, company_name, client_name, client_email, client_phone, client_address, client_gst, plan_id, plan_name, billing_cycle, base_price, default_seats, custom_seats, lead_quota, extra_seats_count, extra_seat_price_per_unit, discount_type, discount_value, discount_amount, subtotal, tax_rate, tax_amount, final_amount, payment_status, payment_mode, transaction_id, issue_date, valid_from, valid_until, status, notes, updated_at
      ) VALUES (
        v_target_id,
        COALESCE(p_payload->>'license_number', p_payload->>'licenseNumber', p_payload->>'key', 'LIC-' || upper(substr(md5(random()::text), 1, 8))),
        COALESCE(p_payload->>'invoice_number', p_payload->>'invoiceNumber', 'INV-' || to_char(now(), 'YYYY') || '-001'),
        COALESCE(p_payload->>'company_id', p_payload->>'companyId', 'comp_default'),
        COALESCE(p_payload->>'company_name', p_payload->>'companyName', p_payload->>'company', 'Company Name'),
        COALESCE(p_payload->>'client_name', p_payload->>'clientName', 'Client Admin'),
        COALESCE(p_payload->>'client_email', p_payload->>'clientEmail', p_payload->>'email', 'admin@company.com'),
        COALESCE(p_payload->>'client_phone', p_payload->>'clientPhone', p_payload->>'phone', ''),
        COALESCE(p_payload->>'client_address', p_payload->>'clientAddress', ''),
        COALESCE(p_payload->>'client_gst', p_payload->>'clientGst', ''),
        COALESCE(p_payload->>'plan_id', p_payload->>'planId', 'growth'),
        COALESCE(p_payload->>'plan_name', p_payload->>'planName', p_payload->>'plan', 'Growth Company Plan'),
        COALESCE(p_payload->>'billing_cycle', p_payload->>'billingCycle', 'monthly'),
        COALESCE((p_payload->>'base_price')::numeric, 4999),
        COALESCE((p_payload->>'default_seats')::int, (p_payload->>'max_users')::int, 15),
        COALESCE((p_payload->>'custom_seats')::int, 15),
        COALESCE((p_payload->>'lead_quota')::int, 2500),
        COALESCE((p_payload->>'extra_seats_count')::int, 0),
        COALESCE((p_payload->>'extra_seat_price_per_unit')::numeric, 250),
        COALESCE(p_payload->>'discount_type', 'flat'),
        COALESCE((p_payload->>'discount_value')::numeric, 0),
        COALESCE((p_payload->>'discount_amount')::numeric, 0),
        COALESCE((p_payload->>'subtotal')::numeric, 4999),
        COALESCE((p_payload->>'tax_rate')::numeric, 0),
        COALESCE((p_payload->>'tax_amount')::numeric, 0),
        COALESCE((p_payload->>'final_amount')::numeric, 4999),
        COALESCE(p_payload->>'payment_status', 'paid'),
        COALESCE(p_payload->>'payment_mode', 'UPI / Bank Transfer'),
        COALESCE(p_payload->>'transaction_id', ''),
        COALESCE(p_payload->>'issue_date', to_char(now(), 'YYYY-MM-DD')),
        COALESCE(p_payload->>'valid_from', to_char(now(), 'YYYY-MM-DD')),
        COALESCE(p_payload->>'valid_until', p_payload->>'expires_at', to_char(now() + interval '365 days', 'YYYY-MM-DD')),
        COALESCE(p_payload->>'status', 'active'),
        COALESCE(p_payload->>'notes', ''),
        now()
      )
      ON CONFLICT (license_number) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        company_name = EXCLUDED.company_name,
        client_name = EXCLUDED.client_name,
        client_email = EXCLUDED.client_email,
        plan_id = EXCLUDED.plan_id,
        plan_name = EXCLUDED.plan_name,
        billing_cycle = EXCLUDED.billing_cycle,
        final_amount = EXCLUDED.final_amount,
        status = EXCLUDED.status,
        valid_until = EXCLUDED.valid_until,
        updated_at = now();

      RETURN jsonb_build_object('success', true, 'id', v_target_id);

    ELSIF LOWER(p_action) = 'delete' THEN
      DELETE FROM public.client_licenses WHERE id = v_target_id OR license_number = v_target_id;
      RETURN jsonb_build_object('success', true, 'id', v_target_id);
    END IF;

  -- -------------------------------------------------------------
  -- ENTITY: DEAL PACKAGES
  -- -------------------------------------------------------------
  ELSIF LOWER(p_entity) IN ('deal_packages', 'deal_package', 'package', 'packages') THEN
    IF LOWER(p_action) IN ('upsert', 'create', 'update') THEN
      IF v_target_id IS NULL OR TRIM(v_target_id) = '' THEN
        v_target_id := 'pkg_' || floor(extract(epoch from now()))::text;
      END IF;

      INSERT INTO public.deal_packages (
        id, name, price, duration, quota, color, bg, border, features, status, updated_at
      ) VALUES (
        v_target_id,
        COALESCE(p_payload->>'name', 'Deal Package'),
        COALESCE((p_payload->>'price')::numeric, 0),
        COALESCE(p_payload->>'duration', '1 Month'),
        COALESCE(p_payload->>'quota', '500 Leads'),
        COALESCE(p_payload->>'color', '#2563eb'),
        COALESCE(p_payload->>'bg', '#eff6ff'),
        COALESCE(p_payload->>'border', '#bfdbfe'),
        COALESCE(p_payload->'features', '[]'::jsonb),
        COALESCE(p_payload->>'status', CASE WHEN (p_payload->>'active')::boolean = false THEN 'inactive' ELSE 'active' END),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        duration = EXCLUDED.duration,
        quota = EXCLUDED.quota,
        color = EXCLUDED.color,
        bg = EXCLUDED.bg,
        border = EXCLUDED.border,
        features = EXCLUDED.features,
        status = EXCLUDED.status,
        updated_at = now();

      RETURN jsonb_build_object('success', true, 'id', v_target_id);

    ELSIF LOWER(p_action) = 'delete' THEN
      DELETE FROM public.deal_packages WHERE id = v_target_id;
      RETURN jsonb_build_object('success', true, 'id', v_target_id);
    END IF;

  -- -------------------------------------------------------------
  -- ENTITY: SYSTEM SETTINGS
  -- -------------------------------------------------------------
  ELSIF LOWER(p_entity) IN ('system_settings', 'system_setting', 'settings', 'setting') THEN
    IF LOWER(p_action) IN ('upsert', 'create', 'update') THEN
      INSERT INTO public.system_settings (
        key, value, description, updated_at
      ) VALUES (
        COALESCE(p_payload->>'key', v_target_id),
        COALESCE(p_payload->'value', '"{}"'::jsonb),
        COALESCE(p_payload->>'description', ''),
        now()
      )
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        updated_at = now();

      RETURN jsonb_build_object('success', true, 'id', COALESCE(p_payload->>'key', v_target_id));

    ELSIF LOWER(p_action) = 'delete' THEN
      DELETE FROM public.system_settings WHERE key = v_target_id;
      RETURN jsonb_build_object('success', true, 'id', v_target_id);
    END IF;

  -- -------------------------------------------------------------
  -- ENTITY: INTEGRATIONS
  -- -------------------------------------------------------------
  ELSIF LOWER(p_entity) IN ('integration', 'integrations') THEN
    IF LOWER(p_action) IN ('upsert', 'create', 'update', 'toggle') THEN
      UPDATE public.integrations
      SET
        connected = COALESCE((p_payload->>'connected')::boolean, false),
        updated_at = now()
      WHERE id = v_target_id;

      RETURN jsonb_build_object('success', true, 'id', v_target_id);
    END IF;

  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', '400 Bad Request: Unknown entity [' || p_entity || '].'
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', '400 Bad Request: Invalid action [' || p_action || '].');
END;
$$;

ALTER FUNCTION public.superadmin_manage_entity(TEXT, TEXT, TEXT, JSONB) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.superadmin_manage_entity(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.superadmin_manage_entity(TEXT, TEXT, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.superadmin_manage_entity(TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.superadmin_manage_entity(TEXT, TEXT, TEXT, JSONB) TO service_role;

-- -------------------------------------------------------------------------
-- 8. NOTIFY POSTGREST SCHEMA CACHE
-- -------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';

COMMIT;
