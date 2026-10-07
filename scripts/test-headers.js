import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

async function testHeader() {
  const clientWithHeader = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-user-role': 'admin',
        'x-user-id': 'usr_admin'
      }
    }
  });

  const { data, error } = await clientWithHeader.from('users').select('id, name, role').limit(2);
  console.log('Query with admin header:', error ? error.message : data);
}

testHeader();
