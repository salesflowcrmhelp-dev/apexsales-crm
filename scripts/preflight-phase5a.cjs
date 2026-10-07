const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runPreflight() {
  console.log('========================================================================');
  console.log('🔍 PHASE 5A PREFLIGHT: INSPECTING PLATFORM METADATA TABLES');
  console.log('========================================================================\n');

  const targetTables = ['deal_packages', 'system_settings', 'integrations'];

  for (const t of targetTables) {
    console.log(`\n----------------------------------------`);
    console.log(`Table: public.${t}`);
    console.log(`----------------------------------------`);

    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      console.error(`❌ Error querying ${t}:`, error);
      continue;
    }

    console.log(`Total live rows: ${data.length}`);
    if (data.length > 0) {
      console.log('Columns:');
      const sample = data[0];
      Object.keys(sample).forEach(k => {
        console.log(`  - ${k}: typeof ${typeof sample[k]}`);
      });

      console.log('\nRow keys / summary:');
      if (t === 'system_settings') {
        data.forEach(r => {
          const valKeys = r.value && typeof r.value === 'object' ? Object.keys(r.value) : [];
          console.log(`  - key: "${r.key}" | description: "${r.description || ''}" | value structure keys: [${valKeys.join(', ')}]`);
        });
      } else if (t === 'deal_packages') {
        data.forEach(r => {
          console.log(`  - id: "${r.id}" | name: "${r.name}" | price: ${r.price} | status: "${r.status}"`);
        });
      } else if (t === 'integrations') {
        data.forEach(r => {
          const configKeys = r.config && typeof r.config === 'object' ? Object.keys(r.config) : [];
          console.log(`  - id: "${r.id}" | name: "${r.name}" | category: "${r.category}" | connected: ${r.connected} | config keys: [${configKeys.join(', ')}]`);
        });
      }
    }
  }

  console.log('\n========================================================================');
}

runPreflight();
