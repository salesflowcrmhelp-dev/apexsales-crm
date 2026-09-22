import { supabase } from './supabase';

/**
 * 🛡️ Supabase Central Leads & Users Service for ApexSales CRM
 * Connects directly to PostgreSQL cloud database with zero cold start.
 */

// ==========================================
// 1. LEADS SERVICES
// ==========================================

export const fetchLeadsFromSupabase = async () => {
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
          previous_stage: row.previous_stage || base.previous_stage || ''
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
  if (!lead || !lead.id) return null;
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
      owner: lead.owner || 'Harsh Goyal',
      deal_type: lead.deal_type || '',
      previous_stage: lead.previous_stage || '',
      updated_at: new Date().toISOString(),
      raw_data: lead
    };

    const { data, error } = await supabase
      .from('leads')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('⚠️ Supabase upsertLead error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('⚠️ upsertLeadToSupabase exception:', err);
    return null;
  }
};

export const deleteLeadFromSupabase = async (leadId) => {
  if (!leadId) return false;
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) {
      console.warn('⚠️ Supabase deleteLead error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('⚠️ deleteLeadFromSupabase exception:', err);
    return false;
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
    const { data, error } = await supabase
      .from('users')
      .select('*')
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
        permissions: u.permissions || {}
      }));
    }
    return [];
  } catch (err) {
    console.warn('⚠️ fetchUsersFromSupabase exception:', err);
    return null;
  }
};

export const authenticateUserWithSupabase = async (loginIdentifier, inputPin) => {
  if (!loginIdentifier || !inputPin) return { success: false, message: "Missing credentials" };
  try {
    const cleanId = loginIdentifier.trim().toLowerCase();
    const cleanPin = inputPin.trim();

    // Query by email or username
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.${cleanId},username.ilike.${cleanId},name.ilike.${cleanId}`);

    if (error || !Array.isArray(data) || data.length === 0) {
      return { success: false, message: "User account not found." };
    }

    const matchedUser = data.find(u => 
      (u.email && u.email.toLowerCase() === cleanId) || 
      (u.username && u.username.toLowerCase() === cleanId) ||
      (u.name && u.name.toLowerCase() === cleanId)
    ) || data[0];

    // Verify PIN / Password
    if (String(matchedUser.pin).trim() === cleanPin) {
      const userObj = {
        ...matchedUser,
        displayName: matchedUser.display_name || matchedUser.name,
        packageTier: matchedUser.package_tier || matchedUser.packageTier || 'starter',
        permissions: matchedUser.permissions || {}
      };
      return {
        success: true,
        user: userObj,
        token: `supa_jwt_${matchedUser.id}_${Date.now()}`
      };
    } else {
      return { success: false, message: "Invalid Password or PIN. Please try again." };
    }
  } catch (err) {
    console.warn('⚠️ authenticateUserWithSupabase error:', err);
    return { success: false, message: "Authentication service error." };
  }
};

export const upsertUserToSupabase = async (userData) => {
  if (!userData) return null;
  try {
    const id = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payload = {
      id,
      name: userData.name || '',
      display_name: userData.displayName || userData.name || '',
      username: userData.username || (userData.name || '').toLowerCase().replace(/\s+/g, '_'),
      pin: userData.pin || '123456',
      role: userData.role || 'sales_rep',
      email: userData.email || '',
      phone: userData.phone || '',
      active: userData.active !== false,
      package_tier: userData.packageTier || 'starter',
      permissions: userData.permissions || {}
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('⚠️ Supabase upsertUser error:', error.message);
      return null;
    }
    return {
      ...payload,
      displayName: payload.display_name,
      packageTier: payload.package_tier
    };
  } catch (err) {
    console.warn('⚠️ upsertUserToSupabase exception:', err);
    return null;
  }
};

export const deleteUserFromSupabase = async (userId) => {
  if (!userId) return false;
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.warn('⚠️ Supabase deleteUser error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('⚠️ deleteUserFromSupabase exception:', err);
    return false;
  }
};
