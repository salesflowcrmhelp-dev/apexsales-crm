import { supabase } from './supabase.js';

/**
 * 🛡️ Supabase Central Leads & Users Service for ApexSales CRM
 * Connects directly to PostgreSQL cloud database with zero cold start.
 */

export const getAuthToken = async () => {
  if (typeof window !== 'undefined') {
    let token = sessionStorage.getItem('crm_auth_token') || localStorage.getItem('crm_auth_token');
    if (token) return token;
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'demo' || params.get('demo') === 'true') {
      try {
        const res = await fetch('/api/auth/demo?role=admin');
        const data = await res.json();
        if (data && data.token) {
          sessionStorage.setItem('crm_auth_token', data.token);
          localStorage.setItem('crm_auth_token', data.token);
          if (data.user) {
            sessionStorage.setItem('crm_auth_user', JSON.stringify(data.user));
            localStorage.setItem('crm_auth_user', JSON.stringify(data.user));
          }
          return data.token;
        }
      } catch (e) {}
    }
  }
  return null;
};

export const getAuthHeaders = async () => {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {}
  return headers;
};

export const getActiveAdminCallerId = (explicitAdminId) => {
  if (explicitAdminId) return explicitAdminId;
  try {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('crm_auth_user') || localStorage.getItem('crm_auth_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.id) return u.id;
      }
    }
  } catch (e) {}
  return 'usr_admin';
};

export const callSuperAdminManageEntity = async (entity, action, payload, callerAdminId) => {
  try {
    const headers = await getAuthHeaders();
    const routeMap = {
      lead: '/api/leads',
      company: '/api/companies',
      invoice: '/api/invoices',
      ticket: '/api/support-tickets',
      notification: '/api/notifications',
      integration: '/api/integrations',
      company_plan: '/api/company-plans',
      deal_package: '/api/deal-packages',
      client_license: '/api/client-licenses',
      system_settings: '/api/system-settings'
    };
    const endpoint = routeMap[entity];
    if (endpoint) {
      if (action === 'delete') {
        const id = payload?.id || payload?.company_id;
        const res = await fetch(`${endpoint}/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers
        });
        if (res.ok) return await res.json();
      } else if (action === 'toggle' && entity === 'integration') {
        const res = await fetch(`${endpoint}/${encodeURIComponent(payload?.id)}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
        if (res.ok) return await res.json();
      } else {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        if (res.ok) return await res.json();
      }
    }
  } catch (err) {
    console.warn('Backend callSuperAdminManageEntity error:', err);
  }

  const adminId = getActiveAdminCallerId(callerAdminId);
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('superadmin_manage_entity', {
      p_admin_id: adminId,
      p_entity: entity,
      p_action: action,
      p_payload: payload
    });
    if (!rpcErr && rpcRes) {
      return rpcRes;
    }
  } catch (e) {}
  return null;
};

// ==========================================
// 1. LEADS SERVICES
// ==========================================

export const fetchLeadsFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/leads', { headers });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.leads || data.data || []);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ Supabase fetchLeads error:', error.message);
      return null;
    }

    if (Array.isArray(data) && data.length > 0) {
      return data.map(row => {
        const base = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
        return {
          ...base,
          id: row.id,
          name: row.name || base.name || '',
          company: row.company || base.company || '',
          status: row.status || base.status || 'New',
          value: Number(row.value) || Number(base.value) || 0,
          email: row.email || base.email || '',
          phone: row.phone || base.phone || '',
          source: row.source || base.source || 'Manual',
          score: row.score || base.score || 'Warm',
          next_follow_up: row.next_follow_up || base.next_follow_up || '',
          won_date: row.won_date || base.won_date || '',
          notes: row.notes || base.notes || '',
          owner: row.owner || base.owner || 'Harsh Goyal',
          deal_type: row.deal_type || base.deal_type || '',
          previous_stage: row.previous_stage || base.previous_stage || '',
          created_at: row.created_at || base.created_at || base.createdAt || '',
          updated_at: row.updated_at || base.updated_at || base.updatedAt || row.created_at || ''
        };
      });
    }
    return [];
  } catch (err) {
    console.warn('⚠️ fetchLeadsFromSupabase exception:', err);
    return null;
  }
};

export const upsertLeadToSupabase = async (lead) => {
  if (!lead || !lead.id) return { success: false, error: 'Missing lead or ID' };
  try {
    const payload = {
      id: lead.id,
      name: lead.name || '',
      company: lead.company || '',
      status: lead.status || 'New',
      value: Number(lead.value) || 0,
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || 'Manual',
      score: lead.score || 'Warm',
      next_follow_up: lead.next_follow_up || '',
      won_date: lead.won_date || '',
      notes: typeof lead.notes === 'string' ? lead.notes : JSON.stringify(lead.notes || ''),
      owner: lead.owner || lead.assignedTo || 'Harsh Goyal',
      deal_type: lead.deal_type || '',
      previous_stage: lead.previous_stage || '',
      updated_at: new Date().toISOString(),
      raw_data: lead
    };

    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('lead', 'upsert', payload);
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, ...payload, data: payload, error: null };
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase
      .from('leads')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('⚠️ Supabase upsertLead error:', error.message);
      return { success: false, error: error.message };
    }

    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Save Lead',
      module: 'Lead Management',
      details: `Saved lead "${payload.name}" for "${payload.company}" (₹${payload.value}) stage: ${payload.status}`
    });

    return { success: true, ...payload, data: data ? data[0] : payload, error: null };
  } catch (err) {
    console.warn('⚠️ upsertLeadToSupabase exception:', err);
    return { success: false, error: err.message };
  }
};

export const deleteLeadFromSupabase = async (leadId) => {
  if (!leadId) return { success: false, error: 'Missing lead ID' };
  try {
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('lead', 'delete', { id: leadId });
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, data: [{ id: leadId }], error: null };
    }

    // 2. Direct table delete fallback
    const { data, error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .select();

    if (error) {
      console.warn('⚠️ Supabase deleteLead error:', error.message);
      return { success: false, error: error.message };
    }

    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Delete Lead',
      module: 'Lead Management',
      details: `Deleted lead ID: ${leadId}`
    });

    return { success: true, data, error: null };
  } catch (err) {
    console.warn('⚠️ deleteLeadFromSupabase exception:', err);
    return { success: false, error: err.message };
  }
};

export const batchSyncLeadsToSupabase = async (leadsList) => {
  if (!Array.isArray(leadsList) || leadsList.length === 0) return null;
  try {
    const rows = leadsList.map(lead => ({
      id: lead.id,
      name: lead.name || '',
      company: lead.company || '',
      status: lead.status || 'New',
      value: Number(lead.value) || 0,
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || 'Manual',
      score: lead.score || 'Warm',
      next_follow_up: lead.next_follow_up || '',
      won_date: lead.won_date || '',
      notes: typeof lead.notes === 'string' ? lead.notes : JSON.stringify(lead.notes || ''),
      owner: lead.owner || 'Harsh Goyal',
      deal_type: lead.deal_type || '',
      previous_stage: lead.previous_stage || '',
      updated_at: new Date().toISOString(),
      raw_data: lead
    }));

    const { data, error } = await supabase
      .from('leads')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('⚠️ Supabase batchSyncLeads error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('⚠️ batchSyncLeadsToSupabase exception:', err);
    return null;
  }
};

// ==========================================
// 2. USERS & RBAC PERMISSIONS SERVICES
// ==========================================

export const fetchUsersFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/users', { headers });
    if (res.ok) {
      const data = await res.json();
      const userList = Array.isArray(data) ? data : (data.users || data.data || []);
      if (Array.isArray(userList) && userList.length > 0) {
        return userList.map(u => ({
          ...u,
          displayName: u.displayName || u.display_name || u.name,
          packageTier: u.packageTier || u.package_tier || 'starter',
          permissions: u.permissions || {},
          reportsTo: u.permissions?.reportsTo || u.reportsTo || '',
          managerId: u.permissions?.managerId || u.managerId || '',
          companyId: u.permissions?.companyId || u.company_id || u.companyId || '',
          companyName: u.permissions?.companyName || u.company_name || u.companyName || '',
          created_at: u.created_at || u.createdAt || '',
          updated_at: u.updated_at || u.updatedAt || ''
        }));
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, display_name, username, role, email, phone, active, package_tier, permissions, created_at')
      .order('name');

    if (error) {
      console.warn('⚠️ Supabase fetchUsers error:', error.message);
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(u => ({
        ...u,
        displayName: u.display_name || u.name,
        packageTier: u.package_tier || u.packageTier || 'starter',
        permissions: u.permissions || {},
        reportsTo: u.permissions?.reportsTo || u.reportsTo || '',
        managerId: u.permissions?.managerId || u.managerId || '',
        companyId: u.permissions?.companyId || u.company_id || u.companyId || '',
        companyName: u.permissions?.companyName || u.company_name || u.companyName || '',
        created_at: u.created_at || '',
        updated_at: u.updated_at || ''
      }));
    }
    return [];
  } catch (err) {
    console.warn('⚠️ fetchUsersFromSupabase exception:', err);
    return null;
  }
};

/**
 * 🔐 Lookup user profile by email or username to inspect native Auth linking (auth_user_id)
 * Safe lookup for frontend dual-auth routing.
 */
export const lookupUserAuthProfile = async (loginIdentifier) => {
  if (!loginIdentifier) return null;
  try {
    const cleanId = loginIdentifier.trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('id, name, display_name, username, role, email, active, auth_user_id')
      .or(`email.ilike.${cleanId},username.ilike.${cleanId}`)
      .eq('active', true)
      .limit(1);

    if (error || !Array.isArray(data) || data.length === 0) {
      return null;
    }
    return data[0];
  } catch (e) {
    console.warn('⚠️ lookupUserAuthProfile error:', e);
    return null;
  }
};

/**
 * 🔐 Resolves the CRM business user profile from public.users using Supabase Auth identity
 * @param {string} [explicitAuthUserId] - Optional auth.users UUID. If omitted, gets from current Supabase session.
 * @returns {Promise<{ success: boolean, user?: object, error?: string, code?: string }>}
 */
export const getCurrentSupabaseUserProfile = async (explicitAuthUserId = null) => {
  try {
    let authUid = explicitAuthUserId;
    if (!authUid) {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        return { success: false, error: 'No active Supabase session found', code: 'NO_SESSION' };
      }
      authUid = sessionData.session.user.id;
    }

    if (!authUid) {
      return { success: false, error: 'Unauthenticated caller', code: 'UNAUTHENTICATED' };
    }

    // Query public.users where auth_user_id = authUid and active = true
    const { data, error } = await supabase
      .from('users')
      .select('id, name, display_name, username, role, email, phone, active, package_tier, permissions, created_at, auth_user_id')
      .eq('auth_user_id', authUid)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.warn('⚠️ Supabase getCurrentSupabaseUserProfile error:', error.message);
      return { success: false, error: 'Failed to retrieve user profile', code: 'DB_ERROR' };
    }

    if (!data) {
      return { success: false, error: 'No active CRM profile associated with this authenticated account', code: 'PROFILE_NOT_FOUND' };
    }

    const crmUser = {
      ...data,
      displayName: data.display_name || data.name,
      packageTier: data.package_tier || 'starter',
      permissions: data.permissions || {},
      reportsTo: data.permissions?.reportsTo || '',
      managerId: data.permissions?.managerId || '',
      companyId: data.permissions?.companyId || data.company_id || '',
      companyName: data.permissions?.companyName || data.company_name || '',
      created_at: data.created_at || '',
      auth_user_id: data.auth_user_id
    };

    return { success: true, user: crmUser };
  } catch (err) {
    console.warn('⚠️ getCurrentSupabaseUserProfile exception:', err);
    return { success: false, error: 'Authentication service unavailable', code: 'NETWORK_ERROR' };
  }
};

/**
 * 🛡️ Verifies whether the currently authenticated Supabase session has Super Admin privileges.
 * Calls public.is_super_admin() RPC without passing any client-supplied admin ID.
 * @returns {Promise<boolean>}
 */
export const verifyCurrentSessionIsSuperAdmin = async () => {
  try {
    const { data, error } = await supabase.rpc('is_super_admin');
    if (error) {
      console.warn('⚠️ verifyCurrentSessionIsSuperAdmin error:', error.message);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    return false;
  }
};

export const authenticateUserWithSupabase = async (loginIdentifier, inputPin) => {
  if (!loginIdentifier || !inputPin) return { success: false, message: "Missing credentials" };
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginIdentifier,
        pin: inputPin
      })
    });
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      if (typeof window !== 'undefined' && data.token) {
        sessionStorage.setItem('crm_auth_token', data.token);
        sessionStorage.setItem('crm_auth_user', JSON.stringify(data.user));
        localStorage.setItem('crm_auth_token', data.token);
        localStorage.setItem('crm_auth_user', JSON.stringify(data.user));
      }
      return {
        success: true,
        user: data.user,
        token: data.token
      };
    }
    return {
      success: false,
      message: data.message || "Invalid Password or PIN. Please try again."
    };
  } catch (err) {
    console.warn('⚠️ authenticateUserWithSupabase error:', err);
    return { success: false, message: "Authentication service error." };
  }
};

export const upsertUserToSupabase = async (userData, callerAdminId = null) => {
  if (!userData) return { success: false, error: 'Missing user data' };
  try {
    const id = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const reportsTo = userData.reportsTo || '';
    const managerId = userData.managerId || '';
    const companyId = userData.companyId || userData.company_id || '';
    const companyName = userData.companyName || userData.company_name || userData.company || 'ABC Pvt Ltd';
    const permissions = {
      ...(userData.permissions || {}),
      reportsTo,
      managerId,
      companyId,
      companyName
    };

    const action = userData.id ? 'update' : 'create';
    const adminId = callerAdminId || (() => {
      try {
        if (typeof window !== 'undefined') {
          const saved = sessionStorage.getItem('crm_auth_user') || localStorage.getItem('crm_auth_user');
          if (saved) {
            const u = JSON.parse(saved);
            if (u.id) return u.id;
          }
        }
      } catch (e) {}
      return 'usr_admin';
    })();

    const payload = {
      id,
      name: userData.name || '',
      display_name: userData.displayName || userData.name || '',
      username: userData.username || (userData.name || '').toLowerCase().replace(/\s+/g, '_'),
      ...(userData.pin && String(userData.pin).trim() ? { pin: String(userData.pin).trim() } : {}),
      role: userData.role || 'sales_rep',
      email: userData.email || '',
      phone: userData.phone || '',
      active: userData.active !== false && userData.status !== 'Inactive',
      package_tier: userData.packageTier || userData.package_tier || 'starter',
      company: companyName,
      companyName: companyName,
      companyId: companyId,
      permissions
    };

    // 0. Try authenticated backend API first
    try {
      const headers = await getAuthHeaders();
      const endpoint = userData.id ? `/api/users/${encodeURIComponent(userData.id)}` : '/api/users';
      const method = userData.id ? 'PUT' : 'POST';
      const beRes = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(payload)
      });
      if (beRes.ok) {
        const beData = await beRes.json();
        if (beData.success) {
          const userObj = {
            ...payload,
            displayName: payload.display_name,
            packageTier: payload.package_tier,
            reportsTo,
            managerId,
            companyId,
            companyName,
            status: payload.active ? 'Active' : 'Inactive'
          };
          return {
            success: true,
            ...userObj,
            data: beData.user || userObj,
            error: null
          };
        }
      }
    } catch (beErr) {}

    // 1. Try PostgreSQL RPC superadmin_manage_user first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('superadmin_manage_user', {
        p_admin_id: adminId,
        p_action: action,
        p_user: payload
      });

      if (!rpcErr && rpcRes) {
        if (rpcRes.success === false) {
          return { success: false, error: rpcRes.error || 'Operation forbidden by server security policy.' };
        }
        const userObj = {
          ...payload,
          displayName: payload.display_name,
          packageTier: payload.package_tier,
          reportsTo,
          managerId,
          companyId,
          companyName,
          status: payload.active ? 'Active' : 'Inactive'
        };
        return {
          success: true,
          ...userObj,
          data: rpcRes.user || userObj,
          error: null
        };
      }
    } catch (rpcExc) {
      // RPC error, fallback to direct query
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: payload.id,
        name: payload.name,
        display_name: payload.display_name,
        username: payload.username,
        pin: payload.pin,
        role: payload.role,
        email: payload.email,
        phone: payload.phone,
        active: payload.active,
        package_tier: payload.package_tier,
        permissions: payload.permissions
      }, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('⚠️ Supabase upsertUser error:', error.message);
      return { success: false, error: error.message };
    }

    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: userData.id ? 'Save User' : 'Create User',
      module: 'User Management',
      details: `Saved user account "${payload.name}" (${payload.role}) in company "${companyName}"`
    });

    const userObj = {
      ...payload,
      displayName: payload.display_name,
      packageTier: payload.package_tier,
      reportsTo,
      managerId,
      companyId,
      companyName,
      status: payload.active ? 'Active' : 'Inactive'
    };

    return {
      success: true,
      ...userObj,
      data: data ? data[0] : userObj,
      error: null
    };
  } catch (err) {
    console.warn('⚠️ upsertUserToSupabase exception:', err);
    return { success: false, error: err.message };
  }
};

export const deleteUserFromSupabase = async (userId, callerAdminId = null) => {
  if (!userId) return { success: false, error: 'Missing user ID' };
  try {
    const adminId = callerAdminId || (() => {
      try {
        if (typeof window !== 'undefined') {
          const saved = sessionStorage.getItem('crm_auth_user') || localStorage.getItem('crm_auth_user');
          if (saved) {
            const u = JSON.parse(saved);
            if (u.id) return u.id;
          }
        }
      } catch (e) {}
      return 'usr_admin';
    })();

    // 0. Try authenticated backend API first
    try {
      const headers = await getAuthHeaders();
      const beRes = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers
      });
      if (beRes.ok) {
        const beData = await beRes.json();
        if (beData.success) {
          return { success: true, message: beData.message || 'User deleted.', error: null };
        }
      }
    } catch (beErr) {}

    // 1. Try PostgreSQL RPC superadmin_manage_user first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('superadmin_manage_user', {
        p_admin_id: adminId,
        p_action: 'delete',
        p_user: { id: userId }
      });

      if (!rpcErr && rpcRes) {
        if (rpcRes.success === false) {
          return { success: false, error: rpcRes.error || 'Delete forbidden by server security policy.' };
        }
        return { success: true, message: rpcRes.message || 'User deleted.', error: null };
      }
    } catch (rpcExc) {
      // RPC error, fallback to direct query
    }

    // 2. Direct table delete fallback
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select();

    if (error) {
      console.warn('⚠️ Supabase deleteUser error:', error.message);
      return { success: false, error: error.message };
    }

    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Delete User',
      module: 'User Management',
      details: `Deleted user account ID: ${userId}`
    });

    return { success: true, data, error: null };
  } catch (err) {
    console.warn('⚠️ deleteUserFromSupabase exception:', err);
    return { success: false, error: err.message };
  }
};

// ==========================================
// 3. SUPER ADMIN SAAS DATABASE SERVICES
// ==========================================

// --- Companies ---
export const fetchCompaniesFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/companies', { headers });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.companies)) return json.companies;
      if (Array.isArray(json.data)) return json.data;
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('⚠️ fetchCompanies warning:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('⚠️ fetchCompanies exception:', err);
    return null;
  }
};

export const upsertCompanyToSupabase = async (company) => {
  if (!company || !company.id) return { success: false, error: 'Missing company or ID' };
  try {
    const payload = {
      id: company.id,
      name: company.name,
      domain: company.domain || '',
      plan: company.plan || 'Pro',
      status: company.status || 'Active',
      users: Number(company.users) || 5,
      revenue: company.revenue || '₹25,000',
      start_date: company.startDate || company.start_date || '01 Jan 2026',
      end_date: company.endDate || company.end_date || '01 Jan 2027',
      icon: company.icon || 'building',
      color: company.color || '#2563eb',
      bg: company.bg || '#eff6ff',
      updated_at: new Date().toISOString()
    };
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('company', 'upsert', payload);
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, ...payload, data: payload, error: null };
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase.from('companies').upsert(payload, { onConflict: 'id' }).select();
    if (error) {
      console.warn('⚠️ upsertCompany error:', error.message);
      return { success: false, error: error.message };
    }
    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Save Company',
      module: 'Company Management',
      details: `Saved company profile for "${payload.name}" (${payload.plan} Plan)`
    });
    return { success: true, ...payload, data: data ? data[0] : payload, error: null };
  } catch (err) {
    console.warn('⚠️ upsertCompany exception:', err);
    return { success: false, error: err.message };
  }
};

export const deleteCompanyFromSupabase = async (companyId) => {
  if (!companyId) return { success: false, error: 'Missing company ID' };
  try {
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('company', 'delete', { id: companyId });
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, data: [{ id: companyId }], error: null };
    }

    // 2. Direct table delete fallback
    const { data, error } = await supabase.from('companies').delete().eq('id', companyId).select();
    if (error) {
      console.warn('⚠️ deleteCompany error:', error.message);
      return { success: false, error: error.message };
    }
    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Delete Company',
      module: 'Company Management',
      details: `Deleted company ID: ${companyId}`
    });
    return { success: true, data, error: null };
  } catch (err) {
    console.warn('⚠️ deleteCompany exception:', err);
    return { success: false, error: err.message };
  }
};

// --- Invoices ---
export const fetchInvoicesFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/invoices', { headers });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.invoices || json.data || []);
      if (Array.isArray(list) && list.length > 0) {
        return list.map(inv => ({
          ...inv,
          company: inv.company || inv.company_name,
          dueDate: inv.due_date || inv.dueDate
        }));
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('⚠️ fetchInvoices warning:', error.message);
      return null;
    }
    return data.map(inv => ({
      ...inv,
      company: inv.company || inv.company_name,
      dueDate: inv.due_date || inv.dueDate
    }));
  } catch (err) {
    console.warn('⚠️ fetchInvoices exception:', err);
    return null;
  }
};

export const upsertInvoiceToSupabase = async (invoice) => {
  if (!invoice || !invoice.id) return { success: false, error: 'Missing invoice ID' };
  try {
    const numAmount = Number(invoice.numeric_amount) || Number(String(invoice.amount || '').replace(/[^0-9.]/g, '')) || 0;
    const payload = {
      id: invoice.id,
      company: invoice.company,
      company_id: invoice.company_id || null,
      plan: invoice.plan || 'Pro Plan',
      amount: invoice.amount || `₹${numAmount.toLocaleString('en-IN')}`,
      numeric_amount: numAmount,
      status: invoice.status || 'Paid',
      due_date: invoice.dueDate || invoice.due_date || '15 Oct 2026',
      updated_at: new Date().toISOString()
    };
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('invoice', 'upsert', payload);
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, data: payload };
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase.from('invoices').upsert(payload, { onConflict: 'id' }).select();
    if (error) {
      console.warn('⚠️ upsertInvoice error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data: data ? data[0] : payload };
  } catch (err) {
    console.warn('⚠️ upsertInvoice exception:', err);
    return { success: false, error: err.message };
  }
};

export const deleteInvoiceFromSupabase = async (invoiceId) => {
  if (!invoiceId) return { success: false, error: 'Missing invoice ID' };
  try {
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('invoice', 'delete', { id: invoiceId });
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true };
    }

    // 2. Direct table delete fallback
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (error) {
      console.warn('⚠️ deleteInvoice error:', error.message);
      return { success: false, error: error.message };
    }
    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Delete Invoice',
      module: 'Billing',
      details: `Deleted invoice: ${invoiceId}`
    });
    return { success: true };
  } catch (err) {
    console.warn('⚠️ deleteInvoice exception:', err);
    return { success: false, error: err.message };
  }
};

export const pingSupabaseDatabase = async () => {
  const startTime = performance.now();
  try {
    const { data, error, status } = await supabase.from('system_settings').select('key').limit(1);
    const elapsedMs = Math.round(performance.now() - startTime);
    if (error) {
      return { success: false, latency: elapsedMs, error: error.message || `HTTP ${status}` };
    }
    return { success: true, latency: elapsedMs, status: status || 200 };
  } catch (err) {
    const elapsedMs = Math.round(performance.now() - startTime);
    return { success: false, latency: elapsedMs, error: err.message };
  }
};

// --- Support Tickets ---
export const fetchTicketsFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/support-tickets', { headers });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.tickets || json.data || []);
      if (Array.isArray(list) && list.length > 0) {
        return list.map(t => ({
          ...t,
          createdAt: t.createdAt || t.created_at_text || '28 Sep 2026'
        }));
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('⚠️ fetchTickets warning:', error.message);
      return null;
    }
    return data.map(t => ({
      ...t,
      createdAt: t.created_at_text || '28 Sep 2026'
    }));
  } catch (err) {
    console.warn('⚠️ fetchTickets exception:', err);
    return null;
  }
};

export const upsertTicketToSupabase = async (ticket) => {
  if (!ticket || !ticket.id) return { success: false, error: 'Missing ticket ID' };
  try {
    const payload = {
      id: ticket.id,
      ticket_id: ticket.ticket_id || ticket.id,
      subject: ticket.subject || 'Support Ticket',
      customer: ticket.customer || 'Rahul Sharma',
      company: ticket.company || 'ABC Pvt Ltd',
      priority: ticket.priority || 'Medium',
      status: ticket.status || 'Open',
      created_at_text: ticket.createdAt || ticket.created_at_text || '28 Sep 2026',
      updated_at: new Date().toISOString()
    };
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('ticket', 'upsert', payload);
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, ...payload, data: payload, error: null };
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase.from('support_tickets').upsert(payload, { onConflict: 'id' }).select();
    if (error) {
      console.warn('⚠️ upsertTicket error:', error.message);
      return { success: false, error: error.message };
    }
    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Save Ticket',
      module: 'Support Tickets',
      details: `Saved ticket ${payload.id}: "${payload.subject}" (${payload.status})`
    });
    return { success: true, ...payload, data: data ? data[0] : payload, error: null };
  } catch (err) {
    console.warn('⚠️ upsertTicket exception:', err);
    return { success: false, error: err.message };
  }
};

export const deleteTicketFromSupabase = async (ticketId) => {
  if (!ticketId) return { success: false, error: 'Missing ticket ID' };
  try {
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('ticket', 'delete', { id: ticketId });
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, data: [{ id: ticketId }], error: null };
    }

    // 2. Direct table delete fallback
    const { data, error } = await supabase
      .from('support_tickets')
      .delete()
      .or(`id.eq.${ticketId},ticket_id.eq.${ticketId}`)
      .select();

    if (error) {
      console.warn('⚠️ Supabase deleteTicket error:', error.message);
      return { success: false, error: error.message };
    }
    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Delete Ticket',
      module: 'Support Tickets',
      details: `Deleted support ticket: ${ticketId}`
    });
    return { success: true, data, error: null };
  } catch (err) {
    console.warn('⚠️ deleteTicketFromSupabase exception:', err);
    return { success: false, error: err.message };
  }
};

// --- Audit Logs ---
export const fetchAuditLogsFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/audit-logs', { headers });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.logs || json.data || []);
      if (Array.isArray(list) && list.length > 0) {
        return list.map(log => ({
          id: log.id,
          dateTime: log.date_time || log.dateTime || log.created_at,
          date_time: log.date_time || log.dateTime || log.created_at,
          created_at: log.created_at || log.dateTime,
          user: log.user_name || log.user || 'Super Admin',
          user_name: log.user_name || log.user || 'Super Admin',
          action: log.action,
          module: log.module,
          details: log.details
        }));
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('⚠️ fetchAuditLogs warning:', error.message);
      return null;
    }
    return data.map(log => ({
      id: log.id,
      dateTime: log.date_time || log.created_at,
      date_time: log.date_time,
      created_at: log.created_at,
      user: log.user_name,
      user_name: log.user_name,
      action: log.action,
      module: log.module,
      details: log.details
    }));
  } catch (err) {
    console.warn('⚠️ fetchAuditLogs exception:', err);
    return null;
  }
};

export const insertAuditLogToSupabase = async (log, callerAdminId) => {
  if (!log) return null;
  try {
    const action = log.action || 'Update';
    const module = log.module || 'System';
    const details = log.details || (typeof log === 'string' ? log : '');

    // Invoke the secure SECURITY DEFINER RPC (Phase 5C)
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('log_system_event', {
      p_action: action,
      p_module: module,
      p_details: details
    });

    if (rpcErr) {
      console.warn('⚠️ log_system_event RPC error:', rpcErr.message);
      return null;
    }

    return rpcRes ? [rpcRes] : null;
  } catch (err) {
    console.warn('⚠️ insertAuditLog exception:', err);
    return null;
  }
};

// --- Notifications ---
export const fetchNotificationsFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/notifications', { headers });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.notifications || json.data || []);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('⚠️ fetchNotifications warning:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('⚠️ fetchNotifications exception:', err);
    return null;
  }
};

export const upsertNotificationToSupabase = async (notif) => {
  if (!notif || !notif.id) return null;
  try {
    const payload = {
      id: String(notif.id),
      title: notif.title,
      detail: notif.detail,
      type: notif.type || 'system',
      unread: notif.unread !== false,
      time: notif.time || 'Just now'
    };
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('notification', 'upsert', payload);
    if (rpcRes && rpcRes.success) {
      return [payload];
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase.from('notifications').upsert(payload, { onConflict: 'id' }).select();
    if (error) {
      console.warn('⚠️ upsertNotification error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('⚠️ upsertNotification exception:', err);
    return null;
  }
};

// --- Integrations ---
export const fetchIntegrationsFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/integrations', { headers });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.integrations || json.data || []);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase.from('integrations').select('*').order('name');
    if (error) {
      console.warn('⚠️ fetchIntegrations warning:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('⚠️ fetchIntegrations exception:', err);
    return null;
  }
};

export const toggleIntegrationInSupabase = async (appId, connected) => {
  try {
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('integration', 'toggle', { id: appId, connected });
    if (rpcRes && rpcRes.success) {
      return [{ id: appId, connected }];
    }

    // 2. Direct table update fallback
    const { data, error } = await supabase
      .from('integrations')
      .update({ connected, updated_at: new Date().toISOString() })
      .eq('id', appId)
      .select();
    if (error) {
      console.warn('⚠️ toggleIntegration error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('⚠️ toggleIntegration exception:', err);
    return null;
  }
};

// ==========================================
// 4. STEP 2: SUPER ADMIN FOUNDATION SERVICES
// ==========================================

// --- 4.1 Company Subscription Plans (public.company_plans) ---

export const fetchCompanyPlansFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/company-plans', { headers });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.plans || json.data || []);
      if (Array.isArray(list) && list.length > 0) {
        const map = {};
        list.forEach(item => {
          if (item.company_id && item.plan_id) {
            map[item.company_id] = item.plan_id;
          }
        });
        return { success: true, data: list, map, error: null };
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase
      .from('company_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, data: null, map: null, error: error.message };
    }

    const map = {};
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.company_id && item.plan_id) {
          map[item.company_id] = item.plan_id;
        }
      });
    }

    return { success: true, data: data || [], map, error: null };
  } catch (err) {
    return { success: false, data: null, map: null, error: err.message };
  }
};

export const upsertCompanyPlanToSupabase = async (planData) => {
  if (!planData || !planData.company_id) {
    return { success: false, error: 'Missing company_id for company plan' };
  }

  try {
    const payload = {
      id: planData.id || `cplan_${planData.company_id}`,
      company_id: planData.company_id,
      company_name: planData.company_name || planData.companyName || planData.company_id,
      plan_id: planData.plan_id || planData.planId || 'growth',
      plan_name: planData.plan_name || planData.planName || (planData.plan_id === 'starter' ? 'Starter Plan' : (planData.plan_id === 'enterprise' ? 'Enterprise Elite' : (planData.plan_id === 'super_admin' ? 'Apex Global Platform HQ' : 'Growth Company Plan'))),
      price: Number(planData.price) || 0,
      billing_cycle: planData.billing_cycle || planData.billingCycle || 'monthly',
      status: planData.status || 'active',
      max_seats: Number(planData.max_seats || planData.maxSeats) || 15,
      lead_quota: Number(planData.lead_quota || planData.leadQuota) || 2500,
      start_date: planData.start_date || planData.startDate || '01 Jan 2026',
      end_date: planData.end_date || planData.endDate || '01 Jan 2027',
      updated_at: new Date().toISOString()
    };

    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('company_plan', 'upsert', payload);
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, data: payload, error: null };
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase
      .from('company_plans')
      .upsert(payload, { onConflict: 'company_id' })
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    // Insert security audit trail
    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Update Plan',
      module: 'Company Subscriptions',
      details: `Updated subscription for company "${payload.company_name}" to ${payload.plan_name}`
    });

    return { success: true, data: data ? data[0] : payload, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const deleteCompanyPlanFromSupabase = async (companyId) => {
  if (!companyId) return { success: false, error: 'Missing company ID' };
  try {
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('company_plan', 'delete', { company_id: companyId });
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, error: null };
    }

    // 2. Direct table delete fallback
    const { error } = await supabase
      .from('company_plans')
      .delete()
      .eq('company_id', companyId);

    if (error) {
      return { success: false, error: error.message };
    }

    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Remove Plan',
      module: 'Company Subscriptions',
      details: `Removed subscription assignment for company ID: ${companyId}`
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// --- 4.2 Client Deal Packages (public.deal_packages) ---

export const fetchDealPackagesFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/deal-packages', { headers });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.packages || json.data || []);
      if (Array.isArray(list) && list.length > 0) {
        const mapped = list.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          price: Number(pkg.price) || 0,
          duration: pkg.duration || '1 Month',
          quota: pkg.quota || '500 Leads',
          color: pkg.color || '#2563eb',
          bg: pkg.bg || '#eff6ff',
          border: pkg.border || '#bfdbfe',
          features: Array.isArray(pkg.features) ? pkg.features : (typeof pkg.features === 'string' ? JSON.parse(pkg.features || '[]') : []),
          status: pkg.status || 'active'
        }));
        return { success: true, data: mapped, error: null };
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase
      .from('deal_packages')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    const mapped = (data || []).map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      price: Number(pkg.price) || 0,
      duration: pkg.duration || '1 Month',
      quota: pkg.quota || '500 Leads',
      color: pkg.color || '#2563eb',
      bg: pkg.bg || '#eff6ff',
      border: pkg.border || '#bfdbfe',
      features: Array.isArray(pkg.features) ? pkg.features : (typeof pkg.features === 'string' ? JSON.parse(pkg.features || '[]') : []),
      status: pkg.status || 'active'
    }));

    return { success: true, data: mapped, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
};

export const upsertDealPackageToSupabase = async (pkg) => {
  if (!pkg || !pkg.name) {
    return { success: false, error: 'Missing package name' };
  }

  try {
    const id = pkg.id || `pkg_${Date.now()}`;
    const parsedFeatures = Array.isArray(pkg.features)
      ? pkg.features
      : (typeof pkg.features === 'string' ? pkg.features.split('\n').map(f => f.trim()).filter(Boolean) : []);

    const payload = {
      id,
      name: pkg.name,
      price: Number(pkg.price) || 0,
      duration: pkg.duration || '1 Month',
      quota: pkg.quota || '500 Leads',
      color: pkg.color || '#2563eb',
      bg: pkg.bg || '#eff6ff',
      border: pkg.border || '#bfdbfe',
      features: parsedFeatures,
      status: pkg.status || 'active',
      updated_at: new Date().toISOString()
    };

    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('deal_package', 'upsert', payload);
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, data: payload, error: null };
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase
      .from('deal_packages')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    // Insert security audit trail
    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Save Package',
      module: 'Deal Packages',
      details: `Saved package rate for "${payload.name}" at ₹${payload.price.toLocaleString('en-IN')}`
    });

    return { success: true, data: data ? data[0] : payload, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const deleteDealPackageFromSupabase = async (pkgId) => {
  if (!pkgId) return { success: false, error: 'Missing package ID' };
  try {
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('deal_package', 'delete', { id: pkgId });
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, error: null };
    }

    // 2. Direct table delete fallback
    const { error } = await supabase
      .from('deal_packages')
      .delete()
      .eq('id', pkgId);

    if (error) {
      return { success: false, error: error.message };
    }

    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Delete Package',
      module: 'Deal Packages',
      details: `Deleted package ID: ${pkgId}`
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// --- 4.3 B2B Client Licensing (public.client_licenses) ---

export const fetchClientLicensesFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/client-licenses', { headers });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.licenses || json.data || []);
      if (Array.isArray(list) && list.length > 0) {
        const mapped = list.map(row => ({
          id: row.id,
          licenseNumber: row.licenseNumber || row.license_number,
          invoiceNumber: row.invoiceNumber || row.invoice_number,
          companyId: row.companyId || row.company_id,
          companyName: row.companyName || row.company_name,
          clientName: row.clientName || row.client_name,
          clientEmail: row.clientEmail || row.client_email,
          clientPhone: row.clientPhone || row.client_phone || '',
          clientAddress: row.clientAddress || row.client_address || '',
          clientGst: row.clientGst || row.client_gst || '',
          planId: row.planId || row.plan_id || 'growth',
          planName: row.planName || row.plan_name || 'Growth Company Plan',
          billingCycle: row.billingCycle || row.billing_cycle || 'monthly',
          basePrice: Number(row.basePrice || row.base_price) || 4999,
          defaultSeats: Number(row.defaultSeats || row.default_seats) || 15,
          customSeats: Number(row.customSeats || row.custom_seats) || 15,
          leadQuota: Number(row.leadQuota || row.lead_quota) || 2500,
          extraSeatsCount: Number(row.extraSeatsCount || row.extra_seats_count) || 0,
          extraSeatPricePerUnit: Number(row.extraSeatPricePerUnit || row.extra_seat_price_per_unit) || 250,
          discountType: row.discountType || row.discount_type || 'flat',
          discountValue: Number(row.discountValue || row.discount_value) || 0,
          discountAmount: Number(row.discountAmount || row.discount_amount) || 0,
          subtotal: Number(row.subtotal) || 4999,
          taxRate: Number(row.taxRate || row.tax_rate) || 0,
          taxAmount: Number(row.taxAmount || row.tax_amount) || 0,
          finalAmount: Number(row.finalAmount || row.final_amount) || 4999,
          paymentStatus: row.paymentStatus || row.payment_status || 'paid',
          paymentMode: row.paymentMode || row.payment_mode || 'UPI / Bank Transfer',
          transactionId: row.transactionId || row.transaction_id || '',
          issueDate: row.issueDate || row.issue_date || '',
          validFrom: row.validFrom || row.valid_from || '',
          validUntil: row.validUntil || row.valid_until || '',
          status: row.status || 'active',
          notes: row.notes || ''
        }));
        return { success: true, data: mapped, error: null };
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase
      .from('client_licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    const mapped = (data || []).map(row => ({
      id: row.id,
      licenseNumber: row.license_number,
      invoiceNumber: row.invoice_number,
      companyId: row.company_id,
      companyName: row.company_name,
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone || '',
      clientAddress: row.client_address || '',
      clientGst: row.client_gst || '',
      planId: row.plan_id || 'growth',
      planName: row.plan_name || 'Growth Company Plan',
      billingCycle: row.billing_cycle || 'monthly',
      basePrice: Number(row.base_price) || 4999,
      defaultSeats: Number(row.default_seats) || 15,
      customSeats: Number(row.custom_seats) || 15,
      leadQuota: Number(row.lead_quota) || 2500,
      extraSeatsCount: Number(row.extra_seats_count) || 0,
      extraSeatPricePerUnit: Number(row.extra_seat_price_per_unit) || 250,
      discountType: row.discount_type || 'flat',
      discountValue: Number(row.discount_value) || 0,
      discountAmount: Number(row.discount_amount) || 0,
      subtotal: Number(row.subtotal) || 4999,
      taxRate: Number(row.tax_rate) || 0,
      taxAmount: Number(row.tax_amount) || 0,
      finalAmount: Number(row.final_amount) || 4999,
      paymentStatus: row.payment_status || 'paid',
      paymentMode: row.payment_mode || 'UPI / Bank Transfer',
      transactionId: row.transaction_id || '',
      issueDate: row.issue_date || '',
      validFrom: row.valid_from || '',
      validUntil: row.valid_until || '',
      status: row.status || 'active',
      notes: row.notes || ''
    }));

    return { success: true, data: mapped, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
};

export const upsertClientLicenseToSupabase = async (lic) => {
  if (!lic || !lic.licenseNumber || !lic.companyName || !lic.clientEmail) {
    return { success: false, error: 'Missing required license fields (licenseNumber, companyName, clientEmail)' };
  }

  try {
    const payload = {
      id: lic.id || `lic_${lic.companyId || 'comp'}_${Date.now()}`,
      license_number: lic.licenseNumber,
      invoice_number: lic.invoiceNumber || `INV-${new Date().getFullYear()}-001`,
      company_id: lic.companyId || `tenant_${lic.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      company_name: lic.companyName,
      client_name: lic.clientName || `${lic.companyName} Admin`,
      client_email: lic.clientEmail.trim().toLowerCase(),
      client_phone: lic.clientPhone || '',
      client_address: lic.clientAddress || '',
      client_gst: lic.clientGst || '',
      plan_id: lic.planId || 'growth',
      plan_name: lic.planName || 'Growth Company Plan',
      billing_cycle: lic.billingCycle || 'monthly',
      base_price: Number(lic.basePrice) || 4999,
      default_seats: Number(lic.defaultSeats) || 15,
      custom_seats: Number(lic.customSeats) || 15,
      lead_quota: Number(lic.leadQuota) || 2500,
      extra_seats_count: Number(lic.extraSeatsCount) || 0,
      extra_seat_price_per_unit: Number(lic.extraSeatPricePerUnit) || 250,
      discount_type: lic.discountType || 'flat',
      discount_value: Number(lic.discountValue) || 0,
      discount_amount: Number(lic.discountAmount) || 0,
      subtotal: Number(lic.subtotal) || 4999,
      tax_rate: Number(lic.taxRate) || 0,
      tax_amount: Number(lic.taxAmount) || 0,
      final_amount: Number(lic.finalAmount) || 4999,
      payment_status: lic.paymentStatus || 'paid',
      payment_mode: lic.paymentMode || 'UPI / Bank Transfer',
      transaction_id: lic.transactionId || '',
      issue_date: lic.issueDate || new Date().toISOString().split('T')[0],
      valid_from: lic.validFrom || new Date().toISOString().split('T')[0],
      valid_until: lic.validUntil || '',
      status: lic.status || 'active',
      notes: lic.notes || '',
      updated_at: new Date().toISOString()
    };

    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('client_license', 'upsert', payload);
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, data: payload, error: null };
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase
      .from('client_licenses')
      .upsert(payload, { onConflict: 'license_number' })
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    // Insert security audit trail
    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Issue License',
      module: 'Client Licensing',
      details: `Issued B2B license #${payload.license_number} to ${payload.company_name} (${payload.client_email}) for ₹${payload.final_amount.toLocaleString('en-IN')}`
    });

    return { success: true, data: data ? data[0] : payload, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const deleteClientLicenseFromSupabase = async (licId) => {
  if (!licId) return { success: false, error: 'Missing license ID' };
  try {
    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('client_license', 'delete', { id: licId });
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, error: null };
    }

    // 2. Direct table delete fallback
    const { error } = await supabase
      .from('client_licenses')
      .delete()
      .or(`id.eq.${licId},license_number.eq.${licId}`);

    if (error) {
      return { success: false, error: error.message };
    }

    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Revoke License',
      module: 'Client Licensing',
      details: `Revoked and deleted client license ID: ${licId}`
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// --- 4.4 System Settings (public.system_settings) ---

export const fetchSystemSettingsFromSupabase = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/system-settings', { headers });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.settings || json.data || []);
      if (Array.isArray(list) && list.length > 0) {
        const map = {};
        list.forEach(item => {
          if (item.key) map[item.key] = item.value;
        });
        return { success: true, data: list, map, error: null };
      }
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');

    if (error) {
      return { success: false, data: null, map: null, error: error.message };
    }

    const map = {};
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.key) map[item.key] = item.value;
      });
    }

    return { success: true, data: data || [], map, error: null };
  } catch (err) {
    return { success: false, data: null, map: null, error: err.message };
  }
};

export const updateSystemSettingInSupabase = async (key, value, description) => {
  if (!key) return { success: false, error: 'Missing setting key' };
  try {
    const payload = {
      key,
      value: value || {},
      description: description || `System configuration for ${key}`,
      updated_at: new Date().toISOString()
    };

    // 1. Try secure RPC first
    const rpcRes = await callSuperAdminManageEntity('system_settings', 'upsert', payload);
    if (rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, error: rpcRes.error || 'Access denied by server security policy.' };
      }
      return { success: true, data: payload, error: null };
    }

    // 2. Direct table upsert fallback
    const { data, error } = await supabase
      .from('system_settings')
      .upsert(payload, { onConflict: 'key' })
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    await insertAuditLogToSupabase({
      user: 'Super Admin',
      action: 'Update Configuration',
      module: 'System Settings',
      details: `Updated system configuration key: "${key}"`
    });

    return { success: true, data: data ? data[0] : payload, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// --- 4.5 Safe Cloud Migration & Idempotent Bootstrap ---

export const migrateSuperAdminDataToSupabase = async ({
  localCompanyPlansMap = {},
  localDealPackages = [],
  localLicenses = []
}) => {
  const summary = {
    plansMigrated: 0,
    packagesMigrated: 0,
    licensesMigrated: 0,
    errors: []
  };

  try {
    // 1. Migrate Company Plans
    if (localCompanyPlansMap && typeof localCompanyPlansMap === 'object') {
      for (const [companyId, planId] of Object.entries(localCompanyPlansMap)) {
        const res = await upsertCompanyPlanToSupabase({
          company_id: companyId,
          plan_id: planId
        });
        if (res.success) {
          summary.plansMigrated += 1;
        } else if (res.error && !res.error.includes('PGRST205')) {
          summary.errors.push(`Plan ${companyId}: ${res.error}`);
        }
      }
    }

    // 2. Migrate Deal Packages
    if (Array.isArray(localDealPackages) && localDealPackages.length > 0) {
      for (const pkg of localDealPackages) {
        const res = await upsertDealPackageToSupabase(pkg);
        if (res.success) {
          summary.packagesMigrated += 1;
        } else if (res.error && !res.error.includes('PGRST205')) {
          summary.errors.push(`Package ${pkg.name}: ${res.error}`);
        }
      }
    }

    // 3. Migrate Client Licenses
    if (Array.isArray(localLicenses) && localLicenses.length > 0) {
      for (const lic of localLicenses) {
        const res = await upsertClientLicenseToSupabase(lic);
        if (res.success) {
          summary.licensesMigrated += 1;
        } else if (res.error && !res.error.includes('PGRST205')) {
          summary.errors.push(`License ${lic.licenseNumber}: ${res.error}`);
        }
      }
    }
  } catch (err) {
    summary.errors.push(`Migration exception: ${err.message}`);
  }

  return summary;
};

// ==========================================
// 8. SUPER ADMIN LIVE ANALYTICS & REPORTS ARCHITECTURE
// ==========================================

export const filterByDateRange = (items, dateField, dateRange = 'all', customStart = null, customEnd = null) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (!dateRange || dateRange === 'all' || dateRange === 'All Time') return items;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return items.filter(item => {
    const rawVal = item[dateField] || item.created_at || item.createdAt || item.date_time || item.issue_date || item.due_date;
    if (!rawVal) return true;
    const d = new Date(rawVal);
    if (isNaN(d.getTime())) return true;

    switch (String(dateRange).toLowerCase()) {
      case 'today':
        return d >= startOfToday;
      case '7days':
      case 'last 7 days':
        return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30days':
      case 'last 30 days':
        return d >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'this_month':
      case 'this month':
        return d >= new Date(now.getFullYear(), now.getMonth(), 1);
      case 'last_month':
      case 'last month': {
        const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return d >= startLastMonth && d <= endLastMonth;
      }
      case 'custom':
        if (customStart && d < new Date(customStart)) return false;
        if (customEnd && d > new Date(customEnd)) return false;
        return true;
      default:
        return true;
    }
  });
};

export const getSuperAdminDashboardMetrics = async (params = {}) => {
  const {
    leads: providedLeads,
    companies: providedCompanies,
    users: providedUsers,
    invoices: providedInvoices,
    companyPlans: providedPlans,
    clientLicenses: providedLicenses,
    dateRange = 'all',
    customStart = null,
    customEnd = null
  } = params;

  const [leadsRes, companiesRes, usersRes, invoicesRes, plansRes, licensesRes] = await Promise.all([
    providedLeads || fetchLeadsFromSupabase().then(res => res || []),
    providedCompanies || fetchCompaniesFromSupabase().then(res => res || []),
    providedUsers || fetchUsersFromSupabase().then(res => res || []),
    providedInvoices || fetchInvoicesFromSupabase().then(res => res || []),
    providedPlans || fetchCompanyPlansFromSupabase().then(res => res || []),
    providedLicenses || fetchClientLicensesFromSupabase().then(res => res || [])
  ]);

  const leads = Array.isArray(leadsRes) ? leadsRes : [];
  const companies = Array.isArray(companiesRes) ? companiesRes : [];
  const users = Array.isArray(usersRes) ? usersRes : [];
  const invoices = Array.isArray(invoicesRes) ? invoicesRes : [];
  const plans = Array.isArray(plansRes) ? plansRes : (plansRes?.data || []);
  const licenses = Array.isArray(licensesRes) ? licensesRes : (licensesRes?.data || []);

  const filteredLeads = filterByDateRange(leads, 'updated_at', dateRange, customStart, customEnd);
  const filteredInvoices = filterByDateRange(invoices, 'due_date', dateRange, customStart, customEnd);

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => (c.status || '').toLowerCase() === 'active').length;
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active !== false).length;

  const totalLeads = filteredLeads.length;
  const newLeads = filteredLeads.filter(l => (l.status || '').toLowerCase() === 'new').length;
  const wonLeads = filteredLeads.filter(l => (l.status || '').toLowerCase().includes('won')).length;
  const lostLeads = filteredLeads.filter(l => (l.status || '').toLowerCase() === 'lost').length;

  const paidInvoices = filteredInvoices.filter(i => (i.status || '').toLowerCase() === 'paid');
  const paidInvoiceRevenue = paidInvoices.reduce((sum, i) => sum + (Number(i.numeric_amount) || 0), 0);
  const wonLeadRevenue = filteredLeads
    .filter(l => (l.status || '').toLowerCase().includes('won'))
    .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

  const totalRevenue = paidInvoiceRevenue > 0 ? paidInvoiceRevenue : wonLeadRevenue;
  const totalInvoiced = filteredInvoices.reduce((sum, i) => sum + (Number(i.numeric_amount) || 0), 0);
  const conversionRate = totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;
  const avgDealValue = wonLeads > 0 ? Math.round(wonLeadRevenue / wonLeads) : (totalLeads > 0 ? Math.round(wonLeadRevenue / totalLeads) : 0);

  const activeSubscriptions = licenses.filter(l => (l.status || '').toLowerCase() === 'active').length ||
                              plans.filter(p => (p.status || '').toLowerCase() === 'active').length;

  const now = new Date();
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSubscriptions = licenses.filter(l => {
    if (!l.valid_until && !l.validUntil) return false;
    const d = new Date(l.valid_until || l.validUntil);
    return d >= now && d <= next30Days;
  }).length;

  const saasMRR = licenses.reduce((sum, l) => sum + (Number(l.final_amount) || Number(l.finalAmount) || 0), 0);
  const saasARR = saasMRR * 12;
  const totalProvisionedSeats = licenses.reduce((sum, l) => sum + (Number(l.custom_seats) || Number(l.default_seats) || Number(l.customSeats) || 0), 0);

  return {
    totalCompanies,
    activeCompanies,
    totalUsers,
    activeUsers,
    totalLeads,
    newLeads,
    wonLeads,
    lostLeads,
    totalRevenue,
    paidInvoiceRevenue,
    totalInvoiced,
    wonLeadRevenue,
    conversionRate,
    avgDealValue,
    activeSubscriptions,
    expiringSubscriptions,
    saasMRR,
    saasARR,
    totalProvisionedSeats
  };
};

export const getRevenueAnalytics = async (params = {}) => {
  const { invoices: providedInvoices, dateRange = 'all', customStart = null, customEnd = null } = params;
  const invoices = providedInvoices || (await fetchInvoicesFromSupabase()) || [];
  const filtered = filterByDateRange(invoices, 'due_date', dateRange, customStart, customEnd);

  const totalInvoiced = filtered.reduce((sum, i) => sum + (Number(i.numeric_amount) || 0), 0);
  const paidInvoices = filtered.filter(i => (i.status || '').toLowerCase() === 'paid');
  const pendingInvoices = filtered.filter(i => (i.status || '').toLowerCase() !== 'paid');
  const totalPaidRevenue = paidInvoices.reduce((sum, i) => sum + (Number(i.numeric_amount) || 0), 0);
  const totalPendingRevenue = pendingInvoices.reduce((sum, i) => sum + (Number(i.numeric_amount) || 0), 0);

  const revenueByCompany = {};
  filtered.forEach(i => {
    const c = i.company || 'Unknown Company';
    revenueByCompany[c] = (revenueByCompany[c] || 0) + (Number(i.numeric_amount) || 0);
  });

  const statusDistribution = {
    Paid: paidInvoices.length,
    Pending: pendingInvoices.length
  };

  return {
    totalInvoiced,
    totalPaidRevenue,
    totalPendingRevenue,
    revenueByCompany,
    statusDistribution,
    invoicesCount: filtered.length,
    paidCount: paidInvoices.length
  };
};

export const getLeadAnalytics = async (params = {}) => {
  const { leads: providedLeads, dateRange = 'all', customStart = null, customEnd = null } = params;
  const leads = providedLeads || (await fetchLeadsFromSupabase()) || [];
  const filtered = filterByDateRange(leads, 'updated_at', dateRange, customStart, customEnd);

  const totalLeads = filtered.length;
  const newLeads = filtered.filter(l => (l.status || '').toLowerCase() === 'new').length;
  const wonLeads = filtered.filter(l => (l.status || '').toLowerCase().includes('won')).length;
  const lostLeads = filtered.filter(l => (l.status || '').toLowerCase() === 'lost').length;

  const stageDistribution = {};
  filtered.forEach(l => {
    const s = l.status || 'Other';
    stageDistribution[s] = (stageDistribution[s] || 0) + 1;
  });

  const sourceDistribution = {};
  filtered.forEach(l => {
    const s = l.source || 'Other';
    sourceDistribution[s] = (sourceDistribution[s] || 0) + 1;
  });

  const leadsByOwner = {};
  filtered.forEach(l => {
    const o = l.owner || 'Unassigned';
    leadsByOwner[o] = (leadsByOwner[o] || 0) + 1;
  });

  const leadsByCompany = {};
  filtered.forEach(l => {
    const c = l.company || 'Unknown';
    leadsByCompany[c] = (leadsByCompany[c] || 0) + 1;
  });

  const conversionRate = totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;
  const totalPipelineValue = filtered.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const wonValue = filtered
    .filter(l => (l.status || '').toLowerCase().includes('won'))
    .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

  return {
    totalLeads,
    newLeads,
    wonLeads,
    lostLeads,
    stageDistribution,
    sourceDistribution,
    leadsByOwner,
    leadsByCompany,
    conversionRate,
    totalPipelineValue,
    wonValue
  };
};

export const getCompanyAnalytics = async (params = {}) => {
  const { companies: providedCompanies } = params;
  const companies = providedCompanies || (await fetchCompaniesFromSupabase()) || [];

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => (c.status || '').toLowerCase() === 'active').length;
  const planDistribution = {};
  companies.forEach(c => {
    const p = c.plan || 'Standard';
    planDistribution[p] = (planDistribution[p] || 0) + 1;
  });

  return {
    totalCompanies,
    activeCompanies,
    planDistribution,
    companies
  };
};

export const getUserAnalytics = async (params = {}) => {
  const { users: providedUsers } = params;
  const users = providedUsers || (await fetchUsersFromSupabase()) || [];

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active !== false).length;
  const roleDistribution = {};
  users.forEach(u => {
    const r = u.role || 'employee';
    roleDistribution[r] = (roleDistribution[r] || 0) + 1;
  });

  return {
    totalUsers,
    activeUsers,
    roleDistribution,
    users
  };
};

export const getSubscriptionAnalytics = async (params = {}) => {
  const { companyPlans: providedPlans, clientLicenses: providedLicenses } = params;
  const [plansRes, licensesRes] = await Promise.all([
    providedPlans || fetchCompanyPlansFromSupabase().then(r => r || []),
    providedLicenses || fetchClientLicensesFromSupabase().then(r => r || [])
  ]);

  const plans = Array.isArray(plansRes) ? plansRes : (plansRes?.data || []);
  const licenses = Array.isArray(licensesRes) ? licensesRes : (licensesRes?.data || []);

  const activeSubscriptions = licenses.filter(l => (l.status || '').toLowerCase() === 'active').length ||
                              plans.filter(p => (p.status || '').toLowerCase() === 'active').length;
  const inactiveSubscriptions = (licenses.length + plans.length) - activeSubscriptions;

  const planDistribution = {};
  plans.forEach(p => {
    const name = p.plan_name || p.planId || 'Standard';
    planDistribution[name] = (planDistribution[name] || 0) + 1;
  });
  licenses.forEach(l => {
    const name = l.plan_name || l.planId || 'Client License';
    planDistribution[name] = (planDistribution[name] || 0) + 1;
  });

  const billingCycleDistribution = {};
  plans.forEach(p => {
    const cycle = p.billing_cycle || 'monthly';
    billingCycleDistribution[cycle] = (billingCycleDistribution[cycle] || 0) + 1;
  });
  licenses.forEach(l => {
    const cycle = l.billing_cycle || 'monthly';
    billingCycleDistribution[cycle] = (billingCycleDistribution[cycle] || 0) + 1;
  });

  const totalMRR = licenses.reduce((sum, l) => sum + (Number(l.final_amount) || Number(l.finalAmount) || 0), 0);
  const totalARR = totalMRR * 12;

  return {
    activeSubscriptions,
    inactiveSubscriptions,
    planDistribution,
    billingCycleDistribution,
    totalMRR,
    totalARR
  };
};

export const getCRMOverview = async (params = {}) => {
  const {
    leads: providedLeads,
    invoices: providedInvoices,
    auditLogs: providedLogs,
    dateRange = 'all',
    customStart = null,
    customEnd = null
  } = params;

  const [leads, invoices, auditLogs] = await Promise.all([
    providedLeads || fetchLeadsFromSupabase().then(r => r || []),
    providedInvoices || fetchInvoicesFromSupabase().then(r => r || []),
    providedLogs || fetchAuditLogsFromSupabase().then(r => r || [])
  ]);

  const filteredLeads = filterByDateRange(leads, 'updated_at', dateRange, customStart, customEnd);
  const filteredInvoices = filterByDateRange(invoices, 'due_date', dateRange, customStart, customEnd);

  const totalLeads = filteredLeads.length;
  const wonLeads = filteredLeads.filter(l => (l.status || '').toLowerCase().includes('won')).length;
  const conversionRate = totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;

  const paidRevenue = filteredInvoices
    .filter(i => (i.status || '').toLowerCase() === 'paid')
    .reduce((sum, i) => sum + (Number(i.numeric_amount) || 0), 0);
  const wonRevenue = filteredLeads
    .filter(l => (l.status || '').toLowerCase().includes('won'))
    .reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const revenue = paidRevenue > 0 ? paidRevenue : wonRevenue;

  const pipelineFunnel = [
    { stage: 'New', count: filteredLeads.filter(l => (l.status || '').toLowerCase() === 'new').length, color: '#2563eb' },
    { stage: 'Contacted', count: filteredLeads.filter(l => (l.status || '').toLowerCase() === 'contacted').length, color: '#3b82f6' },
    { stage: 'Qualified', count: filteredLeads.filter(l => (l.status || '').toLowerCase() === 'qualified').length, color: '#60a5fa' },
    { stage: 'Proposal', count: filteredLeads.filter(l => (l.status || '').toLowerCase().includes('proposal') || (l.status || '').toLowerCase().includes('demo')).length, color: '#0d9488' },
    { stage: 'Won', count: wonLeads, color: '#16a34a' }
  ];

  const recentActivity = (auditLogs || []).slice(0, 6).map(log => ({
    id: log.id,
    title: `${log.user_name || 'Super Admin'}: ${log.action} (${log.module})`,
    details: log.details,
    time: log.date_time || log.created_at,
    type: (log.action || '').toLowerCase().includes('delete') ? 'delete' :
          (log.action || '').toLowerCase().includes('create') ? 'create' : 'update'
  }));

  return {
    totalLeads,
    wonDeals: wonLeads,
    conversionRate,
    revenue,
    pipelineFunnel,
    recentActivity
  };
};

