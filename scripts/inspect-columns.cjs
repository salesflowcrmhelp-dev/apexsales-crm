const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES = [
  'companies',
  'leads',
  'support_tickets',
  'invoices',
  'notifications',
  'integrations',
  'audit_logs',
  'company_plans',
  'deal_packages',
  'client_licenses',
  'system_settings',
  'users'
];

async function inspectColumns() {
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t}: Error fetching row:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Table ${t}: Columns:`, Object.keys(data[0]));
    } else {
      console.log(`Table ${t}: Empty table or 0 rows returned.`);
    }
  }
}

inspectColumns();
