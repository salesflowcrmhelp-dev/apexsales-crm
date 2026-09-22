import { supabase } from './supabase';

/**
 * 🛡️ Supabase Central Leads Service for ApexSales CRM
 * Connects directly to PostgreSQL cloud database with zero cold start.
 */

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
      // Reconstitute lead objects from Supabase columns and raw_data
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
