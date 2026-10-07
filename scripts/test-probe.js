import { supabase } from '../src/lib/supabase.js';

async function testRpc() {
  const { data, error } = await supabase.rpc('version');
  console.log('rpc version result:', error ? error.message : data);
}

testRpc();
