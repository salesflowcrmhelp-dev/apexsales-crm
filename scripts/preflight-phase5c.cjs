const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runPhase5cPreflight() {
  console.log('========================================================================');
  console.log('🔍 PHASE 5C PREFLIGHT: AUDIT LOGS & NOTIFICATIONS');
  console.log('========================================================================\n');

  const targetTables = ['audit_logs', 'notifications'];

  for (const t of targetTables) {
    console.log(`----------------------------------------`);
    console.log(`Table: public.${t}`);
    console.log(`----------------------------------------`);

    const { data, error, count } = await supabase.from(t).select('*', { count: 'exact' });
    if (error) {
      console.error(`❌ Error querying ${t}:`, error);
      continue;
    }

    console.log(`Total live rows: ${data.length} (exact count: ${count})`);
    if (data.length > 0) {
      console.log('Columns:');
      const sample = data[0];
      Object.keys(sample).forEach(k => {
        console.log(`  - ${k}: typeof ${typeof sample[k]} (sample value: ${JSON.stringify(sample[k])})`);
      });

      console.log('\nSample rows (first 3):');
      data.slice(0, 3).forEach((r, idx) => {
        console.log(`  [Row ${idx + 1}]:`, JSON.stringify(r));
      });
    }
    console.log('');
  }

  console.log('========================================================================');
}

runPhase5cPreflight().catch(err => console.error(err));
