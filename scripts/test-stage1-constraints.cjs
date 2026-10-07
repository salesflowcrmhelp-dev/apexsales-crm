const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyConstraintsAndTypes() {
  console.log('Testing auth_user_id data type and constraint validations...');

  // 1. Verify UUID data type by querying with a non-UUID format filter
  // If auth_user_id is UUID, filtering by 'not-a-uuid' will throw 22P02: invalid input syntax for type uuid
  const { data: uuidTest, error: uuidError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', 'not-a-uuid');

  console.log('UUID Type Validation:');
  if (uuidError && (uuidError.code === '22P02' || uuidError.message.includes('uuid'))) {
    console.log('  ✅ CONFIRMED: auth_user_id is data type UUID (PostgreSQL error: ' + uuidError.message + ')');
  } else {
    console.log('  Result:', { uuidTest, uuidError });
  }

  // 2. Query with a valid UUID format (should return empty array with 0 errors)
  const dummyUuid = '00000000-0000-0000-0000-000000000000';
  const { data: validUuidData, error: validUuidError } = await supabase
    .from('users')
    .select('id, auth_user_id')
    .eq('auth_user_id', dummyUuid);

  if (!validUuidError && Array.isArray(validUuidData)) {
    console.log(`  ✅ CONFIRMED: Valid UUID query succeeded with 0 errors, matched ${validUuidData.length} records.`);
  } else {
    console.log('  Valid UUID query result:', { validUuidData, validUuidError });
  }

  // 3. Verify public.users.id is TEXT by querying text prefix
  const { data: idTextData, error: idTextErr } = await supabase
    .from('users')
    .select('id')
    .like('id', 'usr_%');

  if (!idTextErr && idTextData.length === 4) {
    console.log('  ✅ CONFIRMED: public.users.id is TEXT (all 4 records match text pattern "usr_%")');
  } else {
    console.log('  ID Text test:', { idTextData, idTextErr });
  }

  // 4. Verify helper functions return values
  const { data: roleRes, error: roleErr } = await supabase.rpc('get_auth_role');
  const { data: compRes, error: compErr } = await supabase.rpc('get_auth_company_id');
  const { data: adminRes, error: adminErr } = await supabase.rpc('is_super_admin');

  console.log('\nHelper Functions Live Test (Unauthenticated / Anonymous Client):');
  console.log(`  - get_auth_role(): ${JSON.stringify(roleRes)} (Error: ${roleErr?.message || 'none'})`);
  console.log(`  - get_auth_company_id(): ${JSON.stringify(compRes)} (Error: ${compErr?.message || 'none'})`);
  console.log(`  - is_super_admin(): ${JSON.stringify(adminRes)} (Error: ${adminErr?.message || 'none'})`);
}

verifyConstraintsAndTypes();
