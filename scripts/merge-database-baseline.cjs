const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'server', 'data', 'db.json');
let db = {};
if (fs.existsSync(dbPath)) {
  try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {
    db = {};
  }
}

const PIN_SALT = 'apexsales_crm_salt_2026_x7k9';
function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin).trim() + PIN_SALT).digest('hex');
}

// 1. Authoritative Users (5 Users)
const authoritativeUsers = [
  {
    id: "usr_admin",
    name: "Harsh Goyal",
    displayName: "Harsh Goyal (Super Admin)",
    username: "admin",
    pin: db.users?.find(u => u.id === 'usr_admin')?.pin || hashPin("123456"),
    role: "company_owner",
    email: "harsh.accomation@gmail.com",
    phone: "9876543210",
    active: true,
    packageTier: "super_admin",
    companyId: "tenant_apexsales",
    companyName: "ApexSales Global HQ",
    permissions: {
      companyId: "tenant_apexsales",
      companyName: "ApexSales Global HQ",
      canAccessPipeline: true,
      canAccessTasks: true,
      canAccessCalendar: true
    }
  },
  {
    id: "usr_vikram",
    name: "Vikram Malhotra",
    displayName: "Vikram Malhotra",
    username: "vikram",
    pin: hashPin("123456"),
    role: "team_leader",
    email: "vikram@apexsales.com",
    phone: "9876543211",
    active: true,
    packageTier: "growth",
    reportsTo: "Harsh Goyal",
    companyId: "tenant_apexsales",
    companyName: "ApexSales Global HQ",
    permissions: {
      companyId: "tenant_apexsales",
      companyName: "ApexSales Global HQ",
      reportsTo: "Harsh Goyal",
      canAccessPipeline: true,
      canAccessTasks: true,
      canAccessCalendar: true
    }
  },
  {
    id: "usr_rohan",
    name: "Rohan Sharma",
    displayName: "Rohan Sharma",
    username: "rohan",
    pin: hashPin("123456"),
    role: "sales_executive",
    email: "rohan@apexsales.com",
    phone: "9876543212",
    active: true,
    packageTier: "growth",
    reportsTo: "Kashish",
    companyId: "tenant_kashish",
    companyName: "Kashish Enterprises",
    permissions: {
      companyId: "tenant_kashish",
      companyName: "Kashish Enterprises",
      reportsTo: "Kashish",
      managerId: "usr_1789033985345_n62j",
      canAccessPipeline: true,
      canAccessTasks: true
    }
  },
  {
    id: "usr_1789033985345_n62j",
    name: "Kashish",
    displayName: "Kashish (Owner)",
    username: "kashish",
    pin: db.users?.find(u => u.id === 'usr_1789033985345_n62j')?.pin || hashPin("123456"),
    role: "company_owner",
    email: "kashish@apexsales.com",
    phone: "9876543213",
    active: true,
    packageTier: "growth",
    companyId: "tenant_kashish",
    companyName: "Kashish Enterprises",
    permissions: {
      companyId: "tenant_kashish",
      companyName: "Kashish Enterprises",
      canAccessPipeline: true,
      canAccessTasks: true,
      canAccessCalendar: true
    }
  },
  {
    id: "usr_1791191649630",
    name: "QA User 1791191648682",
    displayName: "QA User",
    username: "qa_user_1791191648682",
    pin: hashPin("123456"),
    role: "admin",
    email: "qa_user_1791191648682@apexsales.com",
    phone: "9876543214",
    active: true,
    packageTier: "super_admin",
    companyId: "tenant_apexsales",
    companyName: "ApexSales Global HQ",
    permissions: {}
  }
];

// 2. Companies (5 Companies)
const companies = [
  {
    id: "c_apexsales",
    name: "ApexSales Global HQ",
    domain: "apexsales.com",
    plan: "Enterprise",
    status: "Active",
    users: 15,
    revenue: "₹99,999",
    start_date: "01 Jan 2026",
    end_date: "01 Jan 2030",
    icon: "building",
    color: "#2563eb",
    bg: "#eff6ff",
    contact_email: "harsh@apexsales.com",
    phone: "+91 98765 43210",
    settings: { customFieldsEnabled: true }
  },
  {
    id: "c_kashish",
    name: "Kashish Enterprises",
    domain: "kashishenterprises.com",
    plan: "Growth",
    status: "Active",
    users: 15,
    revenue: "₹4,999",
    start_date: "01 Sep 2026",
    end_date: "01 Oct 2026",
    icon: "store",
    color: "#0d9488",
    bg: "#ccfbf1",
    contact_email: "kashish@kashishenterprises.com",
    phone: "+91 72407 05579",
    settings: {}
  },
  {
    id: "c_abc",
    name: "ABC Pvt Ltd",
    domain: "abcpvt.com",
    plan: "Pro",
    status: "Active",
    users: 12,
    revenue: "₹36,000",
    start_date: "01 Jan 2026",
    end_date: "01 Jan 2027",
    icon: "building",
    color: "#2563eb",
    bg: "#eff6ff",
    contact_email: "info@abcpvt.com",
    phone: "+91 98111 22334",
    settings: {}
  },
  {
    id: "c_sunrise",
    name: "Sunrise Corp",
    domain: "sunrisecorp.com",
    plan: "Business",
    status: "Active",
    users: 8,
    revenue: "₹24,000",
    start_date: "15 Feb 2026",
    end_date: "15 Feb 2027",
    icon: "store",
    color: "#0d9488",
    bg: "#ccfbf1",
    contact_email: "contact@sunrisecorp.com",
    phone: "+91 98222 33445",
    settings: {}
  },
  {
    id: "c_global",
    name: "Global Systems",
    domain: "globalsystems.com",
    plan: "Basic",
    status: "Active",
    users: 15,
    revenue: "₹30,000",
    start_date: "10 Mar 2026",
    end_date: "10 Mar 2027",
    icon: "globe",
    color: "#d97706",
    bg: "#fef3c7",
    contact_email: "support@globalsystems.com",
    phone: "+91 98333 44556",
    settings: {}
  }
];

// 3. Deal Packages (4 Deal Packages)
const dealPackages = [
  {
    id: "pkg_silver",
    name: "Silver Starter Plan",
    price: 15000,
    duration: "1 Month",
    quota: "250 Leads",
    color: "#64748b",
    bg: "#f1f5f9",
    border: "#cbd5e1",
    features: ["Single User Account", "Lead Pipeline Sheet", "WhatsApp 1-Click Chat", "Standard Daily Alarms"],
    status: "active"
  },
  {
    id: "pkg_gold",
    name: "Gold Professional Plan",
    price: 35000,
    duration: "3 Months",
    quota: "1,000 Leads",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    features: ["Up to 5 Users / Reps", "AI Sales Pitch Assistant", "Bulk CSV Import", "Priority WhatsApp Integration"],
    status: "active"
  },
  {
    id: "pkg_platinum",
    name: "Platinum Enterprise Plan",
    price: 75000,
    duration: "12 Months",
    quota: "Unlimited Leads",
    color: "#166534",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    features: ["Unlimited Team Seats", "Dedicated Supabase PostgreSQL Database", "Automated Data Vault Backups", "Custom Fields Support"],
    status: "active"
  },
  {
    id: "pkg_custom",
    name: "Custom Bespoke Plan",
    price: 0,
    duration: "Custom",
    quota: "Bespoke",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    features: ["Tailored Workflow Architecture", "Custom SLA & API Webhooks", "Dedicated Account Manager"],
    status: "active"
  }
];

// 4. Client Licenses (1 License)
const clientLicenses = [
  {
    id: "lic_kashish_enterprises",
    license_number: "2026-89421",
    invoice_number: "INV-2026-001",
    company_id: "tenant_kashish",
    company_name: "Kashish Enterprises",
    client_name: "Kashish Sharma",
    client_email: "kashish@kashishenterprises.com",
    client_phone: "7240705579",
    client_address: "Corporate Plaza, MI Road, Jaipur, Rajasthan - 302001",
    client_gst: "08AABCK1234F1Z9",
    plan_id: "growth",
    plan_name: "Growth Company Plan",
    billing_cycle: "monthly",
    base_price: 4999,
    default_seats: 15,
    custom_seats: 15,
    lead_quota: 2500,
    extra_seats_count: 0,
    extra_seat_price_per_unit: 250,
    discount_type: "flat",
    discount_value: 0,
    discount_amount: 0,
    subtotal: 4999,
    tax_rate: 0,
    tax_amount: 0,
    final_amount: 4999,
    payment_status: "paid",
    payment_mode: "UPI / Bank Transfer",
    transaction_id: "UPI/2026/894218",
    issue_date: "2026-09-01",
    valid_from: "2026-09-01",
    valid_until: "2026-10-01",
    status: "active",
    notes: "Verified client subscription license for Kashish Enterprises"
  }
];

// 5. Company Plans (5 Plans)
const companyPlans = [
  {
    id: "cplan_tenant_apexsales",
    company_id: "tenant_apexsales",
    company_name: "ApexSales Global HQ",
    plan_id: "super_admin",
    plan_name: "Apex Global Platform HQ",
    price: 0,
    billing_cycle: "lifetime",
    status: "active",
    max_seats: 999,
    lead_quota: 999999,
    start_date: "01 Jan 2026",
    end_date: "01 Jan 2030"
  },
  {
    id: "cplan_tenant_kashish",
    company_id: "tenant_kashish",
    company_name: "Kashish Enterprises",
    plan_id: "growth",
    plan_name: "Growth Company Plan",
    price: 4999,
    billing_cycle: "monthly",
    status: "active",
    max_seats: 15,
    lead_quota: 2500,
    start_date: "01 Sep 2026",
    end_date: "01 Oct 2026"
  },
  {
    id: "cplan_c_abc",
    company_id: "c_abc",
    company_name: "ABC Pvt Ltd",
    plan_id: "enterprise",
    plan_name: "Enterprise Elite",
    price: 9999,
    billing_cycle: "yearly",
    status: "active",
    max_seats: 50,
    lead_quota: 10000,
    start_date: "01 Jan 2026",
    end_date: "01 Jan 2027"
  },
  {
    id: "cplan_c_sunrise",
    company_id: "c_sunrise",
    company_name: "Sunrise Corp",
    plan_id: "growth",
    plan_name: "Growth Pro",
    price: 4999,
    billing_cycle: "yearly",
    status: "active",
    max_seats: 15,
    lead_quota: 2500,
    start_date: "15 Feb 2026",
    end_date: "15 Feb 2027"
  },
  {
    id: "cplan_c_global",
    company_id: "c_global",
    company_name: "Global Systems",
    plan_id: "starter",
    plan_name: "Starter Plan",
    price: 1999,
    billing_cycle: "yearly",
    status: "active",
    max_seats: 5,
    lead_quota: 500,
    start_date: "10 Mar 2026",
    end_date: "10 Mar 2027"
  }
];

// 6. Invoices (5 Invoices)
const invoices = [
  {
    id: "#INV-001",
    company: "ABC Pvt Ltd",
    company_id: "c_abc",
    plan: "Pro Plan",
    amount: "₹25,000",
    numeric_amount: 25000,
    status: "Paid",
    due_date: "01 Sep 2026",
    paid_date: "01 Sep 2026",
    created_at: "2026-09-01T10:00:00Z"
  },
  {
    id: "#INV-002",
    company: "Sunrise Traders",
    company_id: "c_sunrise",
    plan: "Business Plan",
    amount: "₹18,000",
    numeric_amount: 18000,
    status: "Paid",
    due_date: "28 Aug 2026",
    paid_date: "28 Aug 2026",
    created_at: "2026-08-28T10:00:00Z"
  },
  {
    id: "#INV-003",
    company: "Global Systems",
    company_id: "c_global",
    plan: "Basic Plan",
    amount: "₹42,000",
    numeric_amount: 42000,
    status: "Pending",
    due_date: "25 Aug 2026",
    paid_date: null,
    created_at: "2026-08-25T10:00:00Z"
  },
  {
    id: "#INV-004",
    company: "Bright Tech",
    company_id: "c_bright",
    plan: "Pro Plan",
    amount: "₹15,000",
    numeric_amount: 15000,
    status: "Paid",
    due_date: "20 Aug 2026",
    paid_date: "20 Aug 2026",
    created_at: "2026-08-20T10:00:00Z"
  },
  {
    id: "#INV-005",
    company: "Metro Solutions",
    company_id: "c_metro",
    plan: "Business Plan",
    amount: "₹22,000",
    numeric_amount: 22000,
    status: "Paid",
    due_date: "18 Aug 2026",
    paid_date: "18 Aug 2026",
    created_at: "2026-08-18T10:00:00Z"
  }
];

// 7. Support Tickets (5 Tickets)
const supportTickets = [
  {
    id: "t_1",
    ticket_id: "#ST-001",
    subject: "Login issue with team account",
    customer: "Rahul Sharma",
    company: "ABC Pvt Ltd",
    priority: "High",
    status: "Open",
    created_at_text: "28 Sep 2026",
    created_at: "2026-09-28T10:00:00Z"
  },
  {
    id: "t_2",
    ticket_id: "#ST-002",
    subject: "Billing cycle discrepancy",
    customer: "Priya Patel",
    company: "Sunrise Corp",
    priority: "Medium",
    status: "In Progress",
    created_at_text: "27 Sep 2026",
    created_at: "2026-09-27T10:00:00Z"
  },
  {
    id: "t_3",
    ticket_id: "#ST-003",
    subject: "Lead export not working",
    customer: "Amit Verma",
    company: "Global Systems",
    priority: "High",
    status: "Open",
    created_at_text: "27 Sep 2026",
    created_at: "2026-09-27T14:00:00Z"
  },
  {
    id: "t_4",
    ticket_id: "#ST-004",
    subject: "Add more user licenses",
    customer: "Sneha Reddy",
    company: "Bright Tech",
    priority: "Low",
    status: "Resolved",
    created_at_text: "26 Sep 2026",
    created_at: "2026-09-26T10:00:00Z"
  },
  {
    id: "t_5",
    ticket_id: "#ST-005",
    subject: "Webhook integration failure",
    customer: "Vikram Singh",
    company: "Metro Solutions",
    priority: "Medium",
    status: "In Progress",
    created_at_text: "25 Sep 2026",
    created_at: "2026-09-25T10:00:00Z"
  }
];

// 8. Audit Logs (59 Logs)
const auditLogs = [];
const sampleActions = ['Login', 'Create Lead', 'Update Lead', 'Export Report', 'Update Settings', 'Create User'];
const sampleUsers = ['Harsh Goyal', 'Vikram Malhotra', 'Rohan Sharma', 'Kashish', 'System Engine'];
const sampleModules = ['Authentication', 'Lead Management', 'Reports', 'Settings', 'User Management'];

for (let i = 1; i <= 59; i++) {
  const day = (30 - Math.floor(i / 2)).toString().padStart(2, '0');
  auditLogs.push({
    id: `al_${i}`,
    date_time: `${day} Sep 2026, 10:${(i * 3) % 60} AM`,
    dateTime: `${day} Sep 2026, 10:${(i * 3) % 60} AM`,
    user_name: sampleUsers[i % sampleUsers.length],
    userName: sampleUsers[i % sampleUsers.length],
    action: sampleActions[i % sampleActions.length],
    module: sampleModules[i % sampleModules.length],
    details: `Security audit event ${i}: ${sampleActions[i % sampleActions.length]} executed in module ${sampleModules[i % sampleModules.length]}`,
    ip_address: "127.0.0.1",
    created_at: new Date(Date.now() - i * 3600000 * 4).toISOString()
  });
}

// 9. Notifications (5 Notifications)
const notifications = [
  { id: "notif_1", title: "Payment received", detail: "₹25,000 from ABC Pvt Ltd", type: "payment", unread: true, time: "10m ago" },
  { id: "notif_2", title: "New lead assigned", detail: "Rahul Sharma assigned to you", type: "lead", unread: true, time: "1h ago" },
  { id: "notif_3", title: "System update", detail: "Monthly report is ready", type: "system", unread: false, time: "3h ago" },
  { id: "notif_4", title: "Follow-up overdue", detail: "3 leads need follow-up", type: "alert", unread: false, time: "5h ago" },
  { id: "notif_5", title: "New support ticket", detail: "#ST-002: Payment failed", type: "ticket", unread: false, time: "1d ago" }
];

// 10. Integrations (6 Integrations)
const integrations = [
  { id: "zoho", name: "Zoho CRM", category: "CRM", description: "Sync customer accounts and contacts automatically", connected: true },
  { id: "google", name: "Google Workspace", category: "Productivity", description: "Google Calendar and Gmail synchronization", connected: false },
  { id: "slack", name: "Slack", category: "Communication", description: "Send real-time alerts and team notifications", connected: false },
  { id: "mailchimp", name: "Mailchimp", category: "Marketing", description: "Automate email campaigns and marketing workflows", connected: false },
  { id: "whatsapp", name: "WhatsApp", category: "Messaging", description: "Send automated messages and lead updates", connected: true },
  { id: "zapier", name: "Zapier", category: "Automation", description: "Connect with 5,000+ apps and automate workflows", connected: false }
];

// 11. System Settings (6 Settings)
const systemSettings = {
  general: { currency: "INR", timezone: "Asia/Kolkata", platformName: "ApexSales Global HQ" },
  security: { minPasswordLength: 8, twoFactorRequired: true, sessionTimeoutMinutes: 60, pinHashing: "Salted SHA-256" },
  backup: { retentionDays: 30, autoDailyBackup: true },
  email: { provider: "resend", fromEmail: "ApexSales CRM <welcome@salesflowhub.cloud>", invitationsEnabled: true },
  api: { supabaseUrl: "https://zgndrkgnldrwhcypdhjt.supabase.co", sslMode: "require" },
  custom: { customFieldsEnabled: true, maxCustomFields: 20 }
};

// 12. Leads: Merge any missing leads to ensure all 69 leads are present
let currentLeads = Array.isArray(db.leads) ? db.leads : [];
console.log(`Current leads in db.json: ${currentLeads.length}`);

// Load INITIAL_LEADS from src/App.jsx if available
try {
  const appContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
  const start = appContent.indexOf('const INITIAL_LEADS = [');
  const end = appContent.indexOf('];', start);
  if (start !== -1 && end !== -1) {
    const rawLeads = eval(appContent.slice(start + 'const INITIAL_LEADS = '.length, end + 1));
    rawLeads.forEach(lead => {
      if (!currentLeads.some(l => l.id === lead.id || (l.name === lead.name && l.phone === lead.phone))) {
        currentLeads.push(lead);
      }
    });
  }
} catch (e) {
  console.warn('Warning loading App.jsx INITIAL_LEADS:', e.message);
}

// Add extra leads by Kashish and Priya Patel to reach exactly 69 leads
const extraLeads = [
  { id: "lead_kashish_1", name: "Anita Desai", company: "Direct Individual", status: "Qualified", value: 18000, email: "anita.desai@gmail.com", phone: "9876500001", source: "Website", score: "Hot", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-20T10:00:00Z" },
  { id: "lead_kashish_2", name: "Kunal Shah", company: "Direct Individual", status: "Proposal Sent", value: 25000, email: "kunal.shah@gmail.com", phone: "9876500002", source: "LinkedIn", score: "Hot", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-21T10:00:00Z" },
  { id: "lead_kashish_3", name: "Sunil Narang", company: "Direct Individual", status: "Demo Booked", value: 15000, email: "sunil.narang@gmail.com", phone: "9876500003", source: "Referral", score: "Warm", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-22T10:00:00Z" },
  { id: "lead_kashish_4", name: "Pooja Hegde", company: "Direct Individual", status: "Contacted", value: 12000, email: "pooja.h@gmail.com", phone: "9876500004", source: "Google Ads", score: "Warm", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-23T10:00:00Z" },
  { id: "lead_kashish_5", name: "Rameshwar Rao", company: "Direct Individual", status: "Won", value: 35000, email: "r.rao@gmail.com", phone: "9876500005", source: "Cold Call", score: "Hot", won_date: "2026-09-25", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-24T10:00:00Z" },
  { id: "lead_kashish_6", name: "Deepak Mittal", company: "Direct Individual", status: "New", value: 10000, email: "deepak.m@gmail.com", phone: "9876500006", source: "Website", score: "Warm", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-25T10:00:00Z" },
  { id: "lead_kashish_7", name: "Tanvi Sheth", company: "Direct Individual", status: "Negotiation", value: 22000, email: "tanvi.s@gmail.com", phone: "9876500007", source: "Instagram", score: "Hot", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-26T10:00:00Z" },
  { id: "lead_kashish_8", name: "Vivek Oberoi", company: "Direct Individual", status: "Renewal", value: 15000, email: "vivek.o@gmail.com", phone: "9876500008", source: "Manual", score: "Warm", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-27T10:00:00Z" },
  { id: "lead_kashish_9", name: "Bhavna Patel", company: "Direct Individual", status: "Demo Done", value: 20000, email: "bhavna.p@gmail.com", phone: "9876500009", source: "Referral", score: "Warm", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-28T10:00:00Z" },
  { id: "lead_kashish_10", name: "Suresh Raina", company: "Direct Individual", status: "Contacted", value: 14000, email: "suresh.r@gmail.com", phone: "9876500010", source: "Website", score: "Cold", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-29T10:00:00Z" },
  { id: "lead_kashish_11", name: "Alok Nath", company: "Direct Individual", status: "Payment Follow Up", value: 30000, email: "alok.n@gmail.com", phone: "9876500011", source: "LinkedIn", score: "Hot", owner: "Kashish", deal_type: "Individual", created_at: "2026-09-30T10:00:00Z" },
  { id: "lead_kashish_12", name: "Meena Kumari", company: "Direct Individual", status: "Qualified", value: 16000, email: "meena.k@gmail.com", phone: "9876500012", source: "Cold Call", score: "Warm", owner: "Kashish", deal_type: "Individual", created_at: "2026-10-01T10:00:00Z" },
  { id: "lead_priya_1", name: "Priya Representative Lead", company: "Direct Individual", status: "New", value: 15000, email: "priya.rep@gmail.com", phone: "9876500013", source: "Website", score: "Warm", owner: "Priya Patel", deal_type: "Individual", created_at: "2026-10-02T10:00:00Z" }
];

extraLeads.forEach(el => {
  if (!currentLeads.some(l => l.id === el.id || l.name === el.name)) {
    currentLeads.push(el);
  }
});

// Trim or match to baseline
if (currentLeads.length > 69) {
  currentLeads = currentLeads.slice(0, 69);
}

// Assemble full authoritative database
const updatedDb = {
  users: authoritativeUsers,
  companies: companies,
  dealPackages: dealPackages,
  deal_packages: dealPackages,
  clientLicenses: clientLicenses,
  client_licenses: clientLicenses,
  companyPlans: companyPlans,
  company_plans: companyPlans,
  invoices: invoices,
  supportTickets: supportTickets,
  support_tickets: supportTickets,
  auditLogs: auditLogs,
  audit_logs: auditLogs,
  notifications: notifications,
  integrations: integrations,
  settings: systemSettings,
  system_settings: systemSettings,
  leads: currentLeads,
  tasks: db.tasks || []
};

fs.writeFileSync(dbPath, JSON.stringify(updatedDb, null, 2), 'utf8');
console.log('✅ Updated db.json successfully!');
console.log(`- Users: ${updatedDb.users.length}`);
console.log(`- Companies: ${updatedDb.companies.length}`);
console.log(`- Deal Packages: ${updatedDb.dealPackages.length}`);
console.log(`- Client Licenses: ${updatedDb.clientLicenses.length}`);
console.log(`- Company Plans: ${updatedDb.companyPlans.length}`);
console.log(`- Invoices: ${updatedDb.invoices.length}`);
console.log(`- Support Tickets: ${updatedDb.supportTickets.length}`);
console.log(`- Audit Logs: ${updatedDb.auditLogs.length}`);
console.log(`- Notifications: ${updatedDb.notifications.length}`);
console.log(`- Integrations: ${updatedDb.integrations.length}`);
console.log(`- Leads: ${updatedDb.leads.length}`);
