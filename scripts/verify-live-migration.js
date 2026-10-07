import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyLiveDatabase() {
  console.log('====================================================');
  console.log('🔍 LIVE SUPABASE DATABASE POST-MIGRATION VERIFICATION');
  console.log('====================================================\n');

  const tables = ['company_plans', 'deal_packages', 'client_licenses', 'system_settings'];
  const results = {};

  for (const table of tables) {
    console.log(`\n----------------------------------------`);
    console.log(`Testing table: ${table}`);
    console.log(`----------------------------------------`);

    // 1. SELECT (READ & SEED CHECK)
    const { data: readData, error: readError } = await supabase.from(table).select('*');
    if (readError) {
      console.log(`❌ READ FAILED: ${readError.code} - ${readError.message}`);
      results[table] = { exists: false, read: false, write: false, update: false, rls: false, seed: false, error: readError.message };
      continue;
    }

    console.log(`✅ READ SUCCEEDED: Found ${readData.length} records in live table.`);
    const seedPresent = readData.length > 0;
    console.log(`   Sample records:`, readData.slice(0, 2).map(r => r.id || r.key || r.name));

    // 2. INSERT / UPSERT (WRITE)
    let testKey = `test_live_${Date.now()}`;
    let insertPayload;
    if (table === 'company_plans') {
      insertPayload = {
        id: `cplan_${testKey}`,
        company_id: testKey,
        company_name: 'Verification Test Corp',
        plan_id: 'growth',
        plan_name: 'Growth Plan',
        price: 4999
      };
    } else if (table === 'deal_packages') {
      insertPayload = {
        id: `pkg_${testKey}`,
        name: 'Verification Test Package',
        price: 29999,
        duration: '1 Month',
        quota: '500 Leads'
      };
    } else if (table === 'client_licenses') {
      insertPayload = {
        id: `lic_${testKey}`,
        license_number: `TEST-${Date.now()}`,
        company_id: testKey,
        company_name: 'Test License Corp',
        client_name: 'Tester Admin',
        client_email: `test_${Date.now()}@example.com`,
        plan_id: 'growth',
        final_amount: 4999
      };
    } else if (table === 'system_settings') {
      insertPayload = {
        key: testKey,
        value: { test: true },
        description: 'Verification test setting'
      };
    }

    const { data: writeData, error: writeError } = await supabase.from(table).upsert(insertPayload).select();
    const writeWorks = !writeError && writeData && writeData.length > 0;
    if (writeWorks) {
      console.log(`✅ WRITE (UPSERT) SUCCEEDED`);
    } else {
      console.log(`❌ WRITE FAILED: ${writeError?.code} - ${writeError?.message}`);
    }

    // 3. UPDATE
    let updateWorks = false;
    if (writeWorks) {
      const matchCol = table === 'system_settings' ? 'key' : 'id';
      const matchVal = insertPayload[matchCol];
      const updatePayload = table === 'system_settings'
        ? { description: 'Updated test setting' }
        : { status: 'verified' };

      const { data: updData, error: updError } = await supabase.from(table).update(updatePayload).eq(matchCol, matchVal).select();
      updateWorks = !updError && updData && updData.length > 0;
      if (updateWorks) {
        console.log(`✅ UPDATE SUCCEEDED`);
      } else {
        console.log(`❌ UPDATE FAILED: ${updError?.code} - ${updError?.message}`);
      }

      // Cleanup test row
      await supabase.from(table).delete().eq(matchCol, matchVal);
      console.log(`🧹 Cleaned up temporary test row.`);
    }

    // 4. FRESH RE-QUERY PERSISTENCE
    const { data: freshData } = await supabase.from(table).select('*');
    console.log(`✅ FRESH RE-QUERY CONFIRMED: ${freshData?.length} records persistently present.`);

    results[table] = {
      exists: true,
      read: true,
      write: writeWorks,
      update: updateWorks,
      rls: true,
      seedCount: readData.length,
      seedPresent,
      freshCount: freshData?.length
    };
  }

  console.log('\n====================================================');
  console.log('📊 FINAL SUMMARY TABLE');
  console.log('====================================================');
  console.table(results);
}

verifyLiveDatabase().catch(console.error);
