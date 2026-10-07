const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRLSPolicies() {
  console.log('=== TESTING INSERT WITH VALID ROW (ANON) ===');
  
  // 1. Companies
  const cRes = await supabase.from('companies').insert({
    id: 'test_rls_comp_' + Date.now(),
    name: 'RLS Probe Co',
    domain: 'rlsprobe.com',
    plan: 'Pro',
    status: 'Active',
    users: 5
  });
  console.log('Companies INSERT:', cRes.error ? `BLOCKED (${cRes.error.code}: ${cRes.error.message})` : 'ALLOWED (RLS NOT BLOCKING ANON WRITE!)');
  if (!cRes.error) await supabase.from('companies').delete().eq('name', 'RLS Probe Co');

  // 2. Invoices
  const invRes = await supabase.from('invoices').insert({
    id: 'test_rls_inv_' + Date.now(),
    company: 'RLS Probe Co',
    amount: '₹10,000',
    status: 'Paid',
    due_date: '2026-10-15'
  });
  console.log('Invoices INSERT:', invRes.error ? `BLOCKED (${invRes.error.code}: ${invRes.error.message})` : 'ALLOWED (RLS NOT BLOCKING ANON WRITE!)');
  if (!invRes.error) await supabase.from('invoices').delete().eq('company', 'RLS Probe Co');

  // 3. Support Tickets
  const tRes = await supabase.from('support_tickets').insert({
    id: 'test_rls_ticket_' + Date.now(),
    ticket_id: 'TK-TEST',
    subject: 'RLS Probe Ticket',
    company: 'RLS Probe Co',
    priority: 'Low',
    status: 'Open'
  });
  console.log('Support Tickets INSERT:', tRes.error ? `BLOCKED (${tRes.error.code}: ${tRes.error.message})` : 'ALLOWED (RLS NOT BLOCKING ANON WRITE!)');
  if (!tRes.error) await supabase.from('support_tickets').delete().eq('subject', 'RLS Probe Ticket');

  // 4. Audit Logs
  const aRes = await supabase.from('audit_logs').insert({
    id: 'test_rls_audit_' + Date.now(),
    date_time: new Date().toISOString(),
    user_name: 'Probe',
    action: 'Test',
    module: 'Audit',
    details: 'Probe RLS'
  });
  console.log('Audit Logs INSERT:', aRes.error ? `BLOCKED (${aRes.error.code}: ${aRes.error.message})` : 'ALLOWED (RLS NOT BLOCKING ANON WRITE!)');
  if (!aRes.error) await supabase.from('audit_logs').delete().eq('user_name', 'Probe');

  // 5. System Settings
  const sRes = await supabase.from('system_settings').update({
    value: { probe: true }
  }).eq('key', 'general');
  console.log('System Settings UPDATE:', sRes.error ? `BLOCKED (${sRes.error.code}: ${sRes.error.message})` : 'ALLOWED (RLS NOT BLOCKING ANON WRITE!)');

  // 6. Users (from Step 3 we know users has RLS enabled)
  const uRes = await supabase.from('users').insert({
    id: 'test_rls_user_' + Date.now(),
    name: 'Probe User',
    email: 'probe@test.com'
  });
  console.log('Users INSERT (Step 3 target):', uRes.error ? `BLOCKED (${uRes.error.code}: ${uRes.error.message})` : 'ALLOWED');
}

checkRLSPolicies();
