import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../server/data/db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let sql = `-- ================================================================
-- APEXSALES CRM: SUPABASE SCHEMA & DATA MIGRATION
-- ================================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  name TEXT,
  company TEXT,
  status TEXT DEFAULT 'New',
  value NUMERIC DEFAULT 0,
  email TEXT,
  phone TEXT,
  source TEXT,
  score TEXT,
  next_follow_up TEXT,
  won_date TEXT,
  notes TEXT,
  owner TEXT DEFAULT 'Harsh Goyal',
  deal_type TEXT,
  previous_stage TEXT,
  stage_updated_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT,
  display_name TEXT,
  username TEXT,
  pin TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  package_tier TEXT,
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'Medium',
  due_date TEXT,
  linked_lead_id TEXT,
  owner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS) with open public access policies
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access to leads" ON public.leads;
CREATE POLICY "Allow public full access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access to users" ON public.users;
CREATE POLICY "Allow public full access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access to tasks" ON public.tasks;
CREATE POLICY "Allow public full access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- 3. Clear existing initial data to prevent duplicates
DELETE FROM public.leads;
DELETE FROM public.users;
\n`;

// Insert users
for (const u of db.users) {
  const perm = JSON.stringify(u.permissions || {}).replace(/'/g, "''");
  sql += `INSERT INTO public.users (id, name, display_name, username, pin, role, email, phone, active, package_tier, permissions)
VALUES ('${u.id}', '${(u.name || '').replace(/'/g, "''")}', '${(u.displayName || '').replace(/'/g, "''")}', '${(u.username || '').replace(/'/g, "''")}', '${(u.pin || '').replace(/'/g, "''")}', '${(u.role || '').replace(/'/g, "''")}', '${(u.email || '').replace(/'/g, "''")}', '${(u.phone || '').replace(/'/g, "''")}', ${u.active !== false}, '${(u.packageTier || '').replace(/'/g, "''")}', '${perm}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, permissions = EXCLUDED.permissions;\n`;
}

// Insert leads
for (const l of db.leads) {
  const notes = (typeof l.notes === 'string' ? l.notes : JSON.stringify(l.notes || '')).replace(/'/g, "''");
  const rawData = JSON.stringify(l).replace(/'/g, "''");
  sql += `INSERT INTO public.leads (id, name, company, status, value, email, phone, source, score, next_follow_up, won_date, notes, owner, deal_type, previous_stage, raw_data)
VALUES ('${l.id}', '${(l.name || '').replace(/'/g, "''")}', '${(l.company || '').replace(/'/g, "''")}', '${(l.status || '').replace(/'/g, "''")}', ${Number(l.value) || 0}, '${(l.email || '').replace(/'/g, "''")}', '${(l.phone || '').replace(/'/g, "''")}', '${(l.source || '').replace(/'/g, "''")}', '${(l.score || '').replace(/'/g, "''")}', '${(l.next_follow_up || '').replace(/'/g, "''")}', '${(l.won_date || '').replace(/'/g, "''")}', '${notes}', '${(l.owner || 'Harsh Goyal').replace(/'/g, "''")}', '${(l.deal_type || '').replace(/'/g, "''")}', '${(l.previous_stage || '').replace(/'/g, "''")}', '${rawData}')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, value = EXCLUDED.value, next_follow_up = EXCLUDED.next_follow_up, won_date = EXCLUDED.won_date, owner = EXCLUDED.owner;\n`;
}

const outPath = path.join(__dirname, '../supabase-setup.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`✅ Successfully generated supabase-setup.sql with ${db.leads.length} leads and ${db.users.length} users!`);
