import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const dbPath = path.join(__dirname, '../server/data/db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

export async function seed() {
  console.log('🌱 Checking Supabase connection and seeding...');
  
  // Users
  const userRows = db.users.map(u => ({
    id: u.id,
    name: u.name || '',
    display_name: u.displayName || '',
    username: u.username || '',
    pin: u.pin || '',
    role: u.role || '',
    email: u.email || '',
    phone: u.phone || '',
    active: u.active !== false,
    package_tier: u.packageTier || '',
    permissions: u.permissions || {}
  }));

  const { error: uErr } = await supabase.from('users').upsert(userRows, { onConflict: 'id' });
  if (uErr) {
    console.warn('⚠️ Users table error (table may not exist yet):', uErr.message);
  } else {
    console.log(`✅ Upserted ${userRows.length} users to Supabase!`);
  }

  // Leads
  const leadRows = db.leads.map(l => ({
    id: l.id,
    name: l.name || '',
    company: l.company || '',
    status: l.status || 'New',
    value: Number(l.value) || 0,
    email: l.email || '',
    phone: l.phone || '',
    source: l.source || 'Manual',
    score: l.score || 'Warm',
    next_follow_up: l.next_follow_up || '',
    won_date: l.won_date || '',
    notes: typeof l.notes === 'string' ? l.notes : JSON.stringify(l.notes || ''),
    owner: l.owner || 'Harsh Goyal',
    deal_type: l.deal_type || '',
    previous_stage: l.previous_stage || '',
    raw_data: l
  }));

  const { error: lErr } = await supabase.from('leads').upsert(leadRows, { onConflict: 'id' });
  if (lErr) {
    console.warn('⚠️ Leads table error (table may not exist yet):', lErr.message);
  } else {
    console.log(`✅ Upserted ${leadRows.length} leads to Supabase!`);
  }
}

seed();
