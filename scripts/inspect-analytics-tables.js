import { supabase } from '../src/lib/supabase.js';

async function inspectData() {
  console.log('--- Inspecting live Supabase tables for Analytics ---\n');

  // 1. Leads
  const { data: leads, count: leadCount, error: leadErr } = await supabase.from('leads').select('*', { count: 'exact' });
  console.log('1. LEADS:', {
    count: leads?.length || 0,
    statuses: [...new Set(leads?.map(l => l.status) || [])],
    dealTypes: [...new Set(leads?.map(l => l.deal_type) || [])],
    sources: [...new Set(leads?.map(l => l.source) || [])],
    sampleValue: leads?.[0]?.value,
    totalValue: leads?.reduce((acc, l) => acc + (Number(l.value) || 0), 0)
  });

  // 2. Companies
  const { data: companies } = await supabase.from('companies').select('*');
  console.log('2. COMPANIES:', {
    count: companies?.length || 0,
    statuses: [...new Set(companies?.map(c => c.status) || [])],
    plans: [...new Set(companies?.map(c => c.plan) || [])],
    sample: companies?.[0]
  });

  // 3. Users
  const { data: users } = await supabase.from('users').select('*');
  console.log('3. USERS:', {
    count: users?.length || 0,
    roles: [...new Set(users?.map(u => u.role) || [])],
    activeCount: users?.filter(u => u.active).length
  });

  // 4. Company Plans
  const { data: plans } = await supabase.from('company_plans').select('*');
  console.log('4. COMPANY PLANS:', {
    count: plans?.length || 0,
    names: plans?.map(p => p.name)
  });

  // 5. Client Licenses
  const { data: licenses } = await supabase.from('client_licenses').select('*');
  console.log('5. CLIENT LICENSES:', {
    count: licenses?.length || 0,
    sample: licenses?.[0]
  });

  // 6. Invoices / Payments
  const { data: invs, error: invErr } = await supabase.from('invoices').select('*');
  console.log('6. INVOICES:', invErr ? `Not found/restricted (${invErr.message})` : { count: invs?.length || 0, sample: invs?.[0] });

  // 7. Audit Logs
  const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('7. AUDIT LOGS:', {
    count: logs?.length || 0,
    latestActions: logs?.map(l => `${l.action} by ${l.user_name} (${l.date_time})`)
  });
}

inspectData().catch(console.error);
