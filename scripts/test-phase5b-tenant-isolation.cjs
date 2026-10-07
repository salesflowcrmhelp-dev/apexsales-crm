const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function runTenantSecuritySuite() {
  console.log('========================================================================');
  console.log('🔒 PHASE 5B: CROSS-TENANT & RLS ATTACK MITIGATION SUITE');
  console.log('========================================================================\n');

  let allAttacksBlocked = true;

  // 1. Cross-Tenant Unauthorized Read Attacks (Simulating Attacker targeting specific companies)
  console.log('--- 1. TARGETED TENANT DATA EXTRACTION PROBES ---');
  const targetProbes = [
    { table: 'companies', filterCol: 'id', filterVal: 'c_abc', label: 'Company ABC Pvt Ltd' },
    { table: 'companies', filterCol: 'id', filterVal: 'c_sunrise', label: 'Company Sunrise Corp' },
    { table: 'company_plans', filterCol: 'company_id', filterVal: 'c_abc', label: 'ABC Pvt Ltd Subscription' },
    { table: 'company_plans', filterCol: 'company_id', filterVal: 'tenant_kashish', label: 'Kashish Subscription' },
    { table: 'client_licenses', filterCol: 'company_id', filterVal: 'tenant_kashish', label: 'Kashish B2B License' },
    { table: 'invoices', filterCol: 'id', filterVal: '#INV-001', label: 'Invoice #INV-001 (ABC)' },
    { table: 'invoices', filterCol: 'id', filterVal: '#INV-002', label: 'Invoice #INV-002 (Sunrise)' }
  ];

  for (const p of targetProbes) {
    const { data, error } = await anonClient.from(p.table).select('*').eq(p.filterCol, p.filterVal);
    const blocked = error !== null || (Array.isArray(data) && data.length === 0);
    console.log(`  - Extraction probe on ${p.label} (${p.table}): ${blocked ? '🛡️ BLOCKED (0 rows leak)' : '❌ LEAKED'}`);
    if (!blocked) allAttacksBlocked = false;
  }

  // 2. Cross-Tenant Forged INSERT Attacks
  console.log('\n--- 2. CROSS-TENANT FORGED INSERT ATTACKS ---');
  const forgedInserts = [
    { table: 'companies', payload: { id: 'c_forged_tenant', name: 'Forged Company' }, label: 'Forged Tenant Creation' },
    { table: 'company_plans', payload: { id: 'cp_forged', company_id: 'c_abc', plan_id: 'enterprise', plan_name: 'Hijacked Plan' }, label: 'Forged Plan on Company ABC' },
    { table: 'client_licenses', payload: { id: 'lic_forged', license_number: 'LIC-FORGED', company_id: 'c_abc', company_name: 'ABC', client_name: 'Hacker', client_email: 'h@h.com' }, label: 'Forged License on Company ABC' },
    { table: 'invoices', payload: { id: '#INV-FORGED-99', company: 'ABC Pvt Ltd', company_id: 'c_abc', amount: '₹0' }, label: 'Forged Zero-Dollar Invoice on ABC' }
  ];

  for (const f of forgedInserts) {
    const { data, error } = await anonClient.from(f.table).insert([f.payload]).select();
    const blocked = error !== null && (error.code === '42501' || error.message.includes('violates row-level security'));
    console.log(`  - ${f.label} (${f.table}): ${blocked ? '🛡️ BLOCKED (PostgreSQL Error 42501 RLS Denial)' : '❌ ALLOWED'}`);
    if (!blocked) allAttacksBlocked = false;
  }

  // 3. Cross-Tenant Tampering / UPDATE Attacks
  console.log('\n--- 3. CROSS-TENANT TAMPERING / UPDATE ATTACKS ---');
  const tamperingAttacks = [
    { table: 'companies', filterCol: 'id', filterVal: 'c_abc', patch: { name: 'Compromised Name' }, label: 'Tamper Company Profile' },
    { table: 'company_plans', filterCol: 'company_id', filterVal: 'c_abc', patch: { price: 0, plan_name: 'Free' }, label: 'Tamper Company Plan Price' },
    { table: 'client_licenses', filterCol: 'company_id', filterVal: 'tenant_kashish', patch: { status: 'revoked' }, label: 'Tamper License Status' },
    { table: 'invoices', filterCol: 'id', filterVal: '#INV-001', patch: { status: 'Compromised' }, label: 'Tamper Invoice Status' }
  ];

  for (const t of tamperingAttacks) {
    const { data, error } = await anonClient.from(t.table).update(t.patch).eq(t.filterCol, t.filterVal).select();
    const blocked = error !== null || (Array.isArray(data) && data.length === 0);
    console.log(`  - ${t.label} (${t.table}): ${blocked ? '🛡️ BLOCKED (0 rows modified)' : '❌ TAMPERED'}`);
    if (!blocked) allAttacksBlocked = false;
  }

  // 4. Cross-Tenant Sabotage / DELETE Attacks
  console.log('\n--- 4. CROSS-TENANT SABOTAGE / DELETE ATTACKS ---');
  const deleteAttacks = [
    { table: 'companies', filterCol: 'id', filterVal: 'c_abc', label: 'Delete Company ABC' },
    { table: 'company_plans', filterCol: 'company_id', filterVal: 'c_abc', label: 'Delete Plan for ABC' },
    { table: 'client_licenses', filterCol: 'company_id', filterVal: 'tenant_kashish', label: 'Delete License for Kashish' },
    { table: 'invoices', filterCol: 'id', filterVal: '#INV-001', label: 'Delete Invoice #INV-001' }
  ];

  for (const d of deleteAttacks) {
    const { data, error } = await anonClient.from(d.table).delete().eq(d.filterCol, d.filterVal).select();
    const blocked = error !== null || (Array.isArray(data) && data.length === 0);
    console.log(`  - ${d.label} (${d.table}): ${blocked ? '🛡️ BLOCKED (0 rows deleted)' : '❌ DELETED'}`);
    if (!blocked) allAttacksBlocked = false;
  }

  console.log('\n========================================================================');
  console.log(`All Cross-Tenant and Unauthorized Attacks Defeated: ${allAttacksBlocked ? '✅ YES' : '❌ NO'}`);
  console.log('========================================================================');
}

runTenantSecuritySuite().catch(err => console.error(err));
