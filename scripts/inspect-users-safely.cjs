const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectUsers() {
  const { data: users, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('=== USERS AUDIT SUMMARY ===');
  console.log('Total users:', users.length);
  
  const activeUsers = users.filter(u => u.active !== false);
  const inactiveUsers = users.filter(u => u.active === false);
  console.log('Active users:', activeUsers.length);
  console.log('Inactive users:', inactiveUsers.length);

  const rolesCount = {};
  users.forEach(u => {
    const r = (u.role || 'unassigned').toLowerCase();
    rolesCount[r] = (rolesCount[r] || 0) + 1;
  });
  console.log('Roles breakdown:', rolesCount);

  const usersWithEmail = users.filter(u => u.email && u.email.trim() !== '');
  const usersWithoutEmail = users.filter(u => !u.email || u.email.trim() === '');
  console.log('Users with email:', usersWithEmail.length);
  console.log('Users without email:', usersWithoutEmail.length);

  const superAdmins = users.filter(u => ['admin', 'super_admin', 'owner', 'company_owner'].includes((u.role || '').toLowerCase()) || ['usr_admin', 'usr_harsh', 'admin'].includes(u.id));
  const companyAdmins = users.filter(u => ['company_owner', 'owner'].includes((u.role || '').toLowerCase()) && !['usr_admin', 'usr_harsh', 'admin'].includes(u.id));
  const managers = users.filter(u => ['manager', 'team_leader'].includes((u.role || '').toLowerCase()));
  const employees = users.filter(u => ['sales_rep', 'sales_executive'].includes((u.role || '').toLowerCase()));

  console.log('Super Admins count:', superAdmins.length);
  console.log('Company Admins count:', companyAdmins.length);
  console.log('Managers/Team Leaders count:', managers.length);
  console.log('Sales Employees count:', employees.length);

  console.log('\n--- User Records (Redacted / Safe) ---');
  users.forEach(u => {
    console.log({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email ? u.email : '[NO EMAIL]',
      role: u.role,
      active: u.active,
      companyId: u.permissions?.companyId || u.companyId || '[NO COMPANY ID]',
      companyName: u.permissions?.companyName || u.companyName || '[NO COMPANY NAME]',
      hasPin: Boolean(u.pin),
      pinLength: u.pin ? u.pin.length : 0
    });
  });
}

inspectUsers();
