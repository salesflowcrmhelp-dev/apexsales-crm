import { supabase } from '../src/lib/supabase.js';

async function testCalculations() {
  console.log('Testing Analytics Calculations with Live Supabase Data...\n');

  const [leadsRes, compRes, usersRes, invRes, plansRes, licRes, auditRes] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('companies').select('*'),
    supabase.from('users').select('*'),
    supabase.from('invoices').select('*'),
    supabase.from('company_plans').select('*'),
    supabase.from('client_licenses').select('*'),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10)
  ]);

  const leads = leadsRes.data || [];
  const companies = compRes.data || [];
  const users = usersRes.data || [];
  const invoices = invRes.data || [];
  const plans = plansRes.data || [];
  const licenses = licRes.data || [];
  const auditLogs = auditRes.data || [];

  console.log('Counts:', {
    leads: leads.length,
    companies: companies.length,
    users: users.length,
    invoices: invoices.length,
    plans: plans.length,
    licenses: licenses.length,
    auditLogs: auditLogs.length
  });

  // 1. Executive Dashboard Metrics
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => (c.status || '').toLowerCase() === 'active').length;
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active !== false).length;
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => (l.status || '').toLowerCase() === 'new').length;
  const wonLeads = leads.filter(l => (l.status || '').toLowerCase().includes('won')).length;
  const lostLeads = leads.filter(l => (l.status || '').toLowerCase() === 'lost').length;

  const paidInvoices = invoices.filter(i => (i.status || '').toLowerCase() === 'paid');
  const totalPaidRevenue = paidInvoices.reduce((sum, i) => sum + (Number(i.numeric_amount) || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.numeric_amount) || 0), 0);
  const wonLeadValue = leads
    .filter(l => (l.status || '').toLowerCase().includes('won'))
    .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

  const conversionRate = totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;
  const avgDealValue = wonLeads > 0 ? Math.round(wonLeadValue / wonLeads) : 0;
  const saasMRR = licenses.reduce((sum, l) => sum + (Number(l.final_amount) || 0), 0);
  const totalSeats = licenses.reduce((sum, l) => sum + (Number(l.custom_seats) || Number(l.default_seats) || 0), 0);

  console.log('\n--- Calculated Live Metrics ---');
  console.log({
    totalCompanies,
    activeCompanies,
    totalUsers,
    activeUsers,
    totalLeads,
    newLeads,
    wonLeads,
    lostLeads,
    totalPaidRevenue,
    wonLeadValue,
    conversionRate: `${conversionRate}%`,
    avgDealValue: `₹${avgDealValue.toLocaleString('en-IN')}`,
    saasMRR: `₹${saasMRR.toLocaleString('en-IN')}`,
    totalSeats
  });

  // 2. Sales Pipeline Stages
  const stages = {};
  leads.forEach(l => {
    const s = l.status || 'Other';
    stages[s] = (stages[s] || 0) + 1;
  });
  console.log('\n--- Lead Status Breakdown ---', stages);

  // 3. Lead Sources
  const sources = {};
  leads.forEach(l => {
    const s = l.source || 'Other';
    sources[s] = (sources[s] || 0) + 1;
  });
  console.log('\n--- Lead Source Breakdown ---', sources);

  // 4. Invoices by Company
  const invByCompany = {};
  invoices.forEach(i => {
    invByCompany[i.company] = (invByCompany[i.company] || 0) + (Number(i.numeric_amount) || 0);
  });
  console.log('\n--- Invoices by Company ---', invByCompany);
}

testCalculations();
