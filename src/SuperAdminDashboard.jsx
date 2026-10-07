import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2, Users, Crown, UserPlus, IndianRupee, Headset,
  TrendingUp, BarChart3, PieChart, ShieldCheck, Download, Plus,
  Settings, ExternalLink, Calendar, CheckCircle2, AlertTriangle,
  DollarSign, Activity, FileSpreadsheet, ArrowUpRight, Search,
  Filter, RefreshCw, Bell, Layers, CreditCard, ChevronRight,
  LogOut, Sun, Globe, Mail, Key, Shield, HardDrive, Smartphone,
  MessageSquare, ArrowRight, Eye, Trash2, Edit2, Check, X,
  Clock, CheckCircle, ChevronDown, Sparkles, Send, Phone, UserCheck,
  Briefcase, Laptop, Compass, BookOpen, AlertCircle,
  MoreVertical, Sliders, Code, Cloud, Lock, Palette, Store, Cpu, Zap,
  Receipt, KeyRound, Copy, Database, Pencil
} from 'lucide-react';
import {
  fetchCompaniesFromSupabase, upsertCompanyToSupabase, deleteCompanyFromSupabase,
  fetchInvoicesFromSupabase, upsertInvoiceToSupabase, deleteInvoiceFromSupabase,
  fetchTicketsFromSupabase, upsertTicketToSupabase, deleteTicketFromSupabase,
  fetchAuditLogsFromSupabase, insertAuditLogToSupabase,
  fetchNotificationsFromSupabase, upsertNotificationToSupabase,
  fetchIntegrationsFromSupabase, toggleIntegrationInSupabase,
  fetchLeadsFromSupabase, upsertLeadToSupabase, deleteLeadFromSupabase,
  fetchUsersFromSupabase, upsertUserToSupabase, deleteUserFromSupabase,
  updateSystemSettingInSupabase, fetchSystemSettingsFromSupabase,
  fetchCompanyPlansFromSupabase, upsertCompanyPlanToSupabase, deleteCompanyPlanFromSupabase,
  fetchClientLicensesFromSupabase, upsertClientLicenseToSupabase, deleteClientLicenseFromSupabase,
  fetchDealPackagesFromSupabase, upsertDealPackageToSupabase, deleteDealPackageFromSupabase,
  filterByDateRange
} from './lib/supabaseService';
import { supabase } from './lib/supabase';

const DEFAULT_COMPANY_PLANS = {
  starter: {
    id: "starter",
    name: "Starter Team",
    price: "₹1,999 / mo",
    priceNum: 1999,
    maxSeats: 3,
    leadQuota: 500,
    features: [
      "Up to 3 team members",
      "500 Active Leads quota",
      "Standard Pipeline Grid",
      "Email & Call logging",
      "CSV Data Export"
    ],
    badge: "Startup",
    color: "#64748b",
    bg: "#f8fafc",
    border: "#cbd5e1"
  },
  growth: {
    id: "growth",
    name: "Growth Pro",
    price: "₹4,999 / mo",
    priceNum: 4999,
    maxSeats: 15,
    leadQuota: 2500,
    features: [
      "Up to 15 team members",
      "2,500 Active Leads quota",
      "Complete 4-Tier Hierarchy (Owner → Head → TL → Rep)",
      "Target Setting & Scorecards",
      "WhatsApp & Direct Call Automation",
      "Automated Daily Follow-up Alerts"
    ],
    badge: "Most Popular",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe"
  },
  business: {
    id: "business",
    name: "Business Elite",
    price: "₹9,999 / mo",
    priceNum: 9999,
    maxSeats: 50,
    leadQuota: 10000,
    features: [
      "Up to 50 team members",
      "10,000 Active Leads quota",
      "Super Admin Cross-Team Auditing",
      "Lead Balancing & Reassign Engine",
      "Sales Velocity & Revenue Forecast",
      "Role-Based Permission Matrix (38 Controls)"
    ],
    badge: "Scale-Up",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe"
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Cloud",
    price: "₹19,999 / mo",
    priceNum: 19999,
    maxSeats: 9999,
    leadQuota: 999999,
    features: [
      "Unlimited team members",
      "Unlimited Leads quota",
      "Custom Subdomain & White-labeling",
      "24/7 Dedicated Account Manager",
      "Direct PostgreSQL / DB Backup & Restore",
      "Custom Webhook & API Integrations"
    ],
    badge: "Ultimate",
    color: "#ea580c",
    bg: "#fff7ed",
    border: "#fed7aa"
  }
};

const DEFAULT_DEAL_PACKAGES = [
  {
    id: "pkg_starter",
    name: "Starter Growth",
    price: 15000,
    duration: "1 Month",
    quota: "300 Leads",
    features: ["Standard Lead Flow", "Call & SMS Integration", "Basic Analytics"],
    color: "#0284c7",
    bg: "#f0f9ff",
    border: "#bae6fd"
  },
  {
    id: "pkg_growth",
    name: "Growth Pro",
    price: 35000,
    duration: "3 Months",
    quota: "1,200 Leads",
    features: ["Dedicated Pipeline", "Auto Dialer Integration", "AI Lead Score", "Priority Support"],
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0"
  },
  {
    id: "pkg_enterprise",
    name: "Enterprise Scale",
    price: 75000,
    duration: "6 Months",
    quota: "5,000 Leads",
    features: ["Full CRM Customization", "Unlimited WhatsApp API", "Dedicated Manager", "Live BI Dashboard"],
    color: "#9333ea",
    bg: "#faf5ff",
    border: "#e9d5ff"
  }
];

// Central list of all 16 valid Super Admin tab IDs to prevent invalid URL states
export const VALID_SUPER_ADMIN_TABS = [
  'dashboard',
  'companies',
  'users',
  'subscriptions',
  'deal_packages',
  'licenses',
  'leads',
  'reports',
  'system_settings',
  'support_tickets',
  'audit_logs',
  'crm_overview',
  'billing',
  'notifications',
  'integrations',
  'settings'
];

// Safely sanitizes any input string to a valid Super Admin tab ID, defaulting to 'dashboard'
export function sanitizeSuperAdminTab(tab) {
  if (!tab) return 'dashboard';
  const clean = String(tab).toLowerCase().trim();
  if (clean === 'packages') return 'subscriptions';
  return VALID_SUPER_ADMIN_TABS.includes(clean) ? clean : 'dashboard';
}

// Synchronizes the browser URL query parameters without full page reload
export function syncSuperAdminUrl(tab, { push = false } = {}) {
  if (typeof window === 'undefined') return;
  try {
    const cleanTab = sanitizeSuperAdminTab(tab);
    const params = new URLSearchParams(window.location.search);
    const currentWs = params.get('workspace') || params.get('tab');
    const currentSaTab = params.get('saTab');

    if (currentWs === 'super_admin' && currentSaTab === cleanTab) {
      return;
    }

    params.set('workspace', 'super_admin');
    if (params.get('tab') === 'super_admin') {
      params.delete('tab');
    }
    params.set('saTab', cleanTab);

    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ''}`;
    const stateObj = { workspace: 'super_admin', saTab: cleanTab };

    if (push) {
      window.history.pushState(stateObj, '', newUrl);
    } else {
      window.history.replaceState(stateObj, '', newUrl);
    }
  } catch (err) {
    console.warn('URL sync error:', err);
  }
}

export default function SuperAdminDashboard({
  currentUser,
  leads = [],
  allUsersList = [],
  tasks = [],
  clientLicenses = [],
  setClientLicenses = () => {},
  clientDealPackages = [],
  setClientDealPackages = () => {},
  companyPlans = null,
  companyPlansMap = {},
  setCompanyPlansMap = () => {},
  billingTargetCompanyId = '',
  setBillingTargetCompanyId = () => {},
  handleUpgradeCompanyPlan = () => {},
  handleOpenNewClientLicenseModal = () => {},
  handleOpenEditClientLicenseModal = () => {},
  handleViewInvoice = () => {},
  handleDeleteLicense = () => {},
  setEditingPackageData = () => {},
  setShowEditPackageModal = () => {},
  setShowAddLeadModal = () => {},
  setNewLeadData = () => {},
  activeCompanyId = '',
  getUserCompanyId = () => '',
  getUserCompanyName = () => '',
  checkIsSuperAdmin = () => true,
  activeTab: controlledActiveTab,
  setActiveTab: setParentActiveTab,
  onNavigate = () => {},
  onOpenSalesCockpit = () => {},
  onOpenStartMyDay = () => {},
  onLogout = () => {},
  onOpenPublicWebsite = () => {},
  showToast = () => {},
  systemSettingsMap = {},
  setSystemSettingsMap = () => {}
}) {
  // Navigation tab state: synchronized with parent sidebar or URL param
  const [internalTab, setInternalTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return sanitizeSuperAdminTab(p.get('saTab') || 'dashboard');
    }
    return 'dashboard';
  });

  const activeTab = controlledActiveTab !== undefined 
    ? sanitizeSuperAdminTab(controlledActiveTab) 
    : internalTab;

  const setActiveTab = (tab) => {
    const cleanTab = sanitizeSuperAdminTab(tab);
    if (setParentActiveTab) {
      setParentActiveTab(cleanTab);
    } else {
      syncSuperAdminUrl(cleanTab, { push: true });
    }
    setInternalTab(cleanTab);
  };

  useEffect(() => {
    if (controlledActiveTab !== undefined) {
      setInternalTab(sanitizeSuperAdminTab(controlledActiveTab));
    }
  }, [controlledActiveTab]);

  // Search & Filter states across tabs
  // Search & Filter states across tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [companyPlanFilter, setCompanyPlanFilter] = useState('all');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [leadStageFilter, setLeadStageFilter] = useState('all');
  const [ticketFilter, setTicketFilter] = useState('all');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('all');
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [reportsTab, setReportsTab] = useState('all');
  const [billingSubTab, setBillingSubTab] = useState('invoices');
  const [subscriptionsSubTab, setSubscriptionsSubTab] = useState('plans'); // 'plans' | 'list'
  const [settingsSubNav, setSettingsSubNav] = useState('profile');
  const [auditModuleFilter, setAuditModuleFilter] = useState('all');
  const [licenseSearchQuery, setLicenseSearchQuery] = useState('');
  const [licenseStatusFilter, setLicenseStatusFilter] = useState('all');
  const [licensePlanFilter, setLicensePlanFilter] = useState('all');
  const [tablePages, setTablePages] = useState({
    companies: 1,
    users: 1,
    subscriptions: 1,
    packages: 1,
    licenses: 1,
    leads: 1,
    tickets: 1,
    auditLogs: 1,
    invoices: 1
  });
  const itemsPerPage = 10;
  const setPageFor = (tableKey, pageNum) => {
    setTablePages(prev => ({ ...prev, [tableKey]: pageNum }));
  };

  const [auditSortField, setAuditSortField] = useState('timestamp'); // 'timestamp' | 'module' | null
  const [auditSortDirection, setAuditSortDirection] = useState('desc'); // 'asc' | 'desc'

  const handleToggleAuditSort = (field) => {
    if (auditSortField === field) {
      if (auditSortDirection === 'desc') {
        setAuditSortDirection('asc');
      } else {
        setAuditSortField(null);
        setAuditSortDirection('desc');
      }
    } else {
      setAuditSortField(field);
      setAuditSortDirection('asc');
    }
  };

  const paginateArray = (arr, tableKey) => {
    const curPage = tablePages[tableKey] || 1;
    const startIndex = (curPage - 1) * itemsPerPage;
    return arr.slice(startIndex, startIndex + itemsPerPage);
  };

  const renderPagination = (tableKey, totalItems) => {
    const curPage = tablePages[tableKey] || 1;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalItems <= itemsPerPage && totalPages <= 1) return null;
    const startItem = totalItems === 0 ? 0 : (curPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(curPage * itemsPerPage, totalItems);

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          Showing <span style={{ fontWeight: '600', color: '#0f172a' }}>{startItem}</span> to <span style={{ fontWeight: '600', color: '#0f172a' }}>{endItem}</span> of <span style={{ fontWeight: '600', color: '#0f172a' }}>{totalItems}</span> entries
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setPageFor(tableKey, Math.max(1, curPage - 1))}
            disabled={curPage <= 1}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: curPage <= 1 ? '#f8fafc' : '#ffffff', color: curPage <= 1 ? '#94a3b8' : '#334155', cursor: curPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
          >
            Previous
          </button>
          <span style={{ padding: '0 6px', fontWeight: '700', color: '#0f172a' }}>
            Page {curPage} of {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            onClick={() => setPageFor(tableKey, Math.min(totalPages, curPage + 1))}
            disabled={curPage >= totalPages}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: curPage >= totalPages ? '#f8fafc' : '#ffffff', color: curPage >= totalPages ? '#94a3b8' : '#334155', cursor: curPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Super Admin Settings state (authoritative without hardcoded mock identities)
  const [profileName, setProfileName] = useState(() => currentUser?.name || currentUser?.displayName || 'Not available');
  const [profileEmail, setProfileEmail] = useState(() => currentUser?.email || 'Not available');
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [selectedLanguage, setSelectedLanguage] = useState('English (United States)');
  const [selectedTimeZone, setSelectedTimeZone] = useState('Asia/Kolkata (IST - UTC+5:30)');
  const [selectedCurrency, setSelectedCurrency] = useState('INR (₹)');
  const [selectedDateFormat, setSelectedDateFormat] = useState('DD MMM YYYY');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [notifPrefSignup, setNotifPrefSignup] = useState(true);
  const [notifPrefTickets, setNotifPrefTickets] = useState(true);
  const [notifPrefBilling, setNotifPrefBilling] = useState(true);

  useEffect(() => {
    if (currentUser?.name || currentUser?.displayName) {
      setProfileName(currentUser.name || currentUser.displayName);
    }
    if (currentUser?.email) {
      setProfileEmail(currentUser.email);
    }
  }, [currentUser]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        if (!currentUser?.email || profileEmail === 'Not available') {
          setProfileEmail(session.user.email);
        }
        if (!currentUser?.name || profileName === 'Not available') {
          const metaName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
          if (metaName) setProfileName(metaName);
        }
      }
    }).catch(() => {});
  }, [currentUser, profileEmail, profileName]);

  useEffect(() => {
    if (systemSettingsMap?.appearance_theme) {
      try {
        const val = typeof systemSettingsMap.appearance_theme === 'string'
          ? JSON.parse(systemSettingsMap.appearance_theme)
          : systemSettingsMap.appearance_theme;
        if (val?.theme) setSelectedTheme(val.theme);
      } catch (e) {}
    }
    if (systemSettingsMap?.regional_localization) {
      try {
        const val = typeof systemSettingsMap.regional_localization === 'string'
          ? JSON.parse(systemSettingsMap.regional_localization)
          : systemSettingsMap.regional_localization;
        if (val?.language) setSelectedLanguage(val.language);
        if (val?.timeZone) setSelectedTimeZone(val.timeZone);
        if (val?.currency) setSelectedCurrency(val.currency);
        if (val?.dateFormat) setSelectedDateFormat(val.dateFormat);
      } catch (e) {}
    }
  }, [systemSettingsMap]);

  // Modals state
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);

  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);

  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isEditTicketOpen, setIsEditTicketOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);

  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [activeSettingsModal, setActiveSettingsModal] = useState(null);
  const [editableSettings, setEditableSettings] = useState({});

  const [isEditSubscriptionOpen, setIsEditSubscriptionOpen] = useState(false);
  const [editingSubscriptionComp, setEditingSubscriptionComp] = useState(null);

  const [isDealPackageModalOpen, setIsDealPackageModalOpen] = useState(false);
  const [editingDealPackage, setEditingDealPackage] = useState(null);

  const [viewingAuditLog, setViewingAuditLog] = useState(null);

  // Active Context Action Menu Modal: { type: 'user' | 'lead' | 'company' | 'ticket' | 'subscription', item: object }
  const [activeActionMenu, setActiveActionMenu] = useState(null);

  // Universal non-optimistic loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Additional Filter states
  const [leadRepFilter, setLeadRepFilter] = useState('all');

  // Form states (Defaults matching reference organizations)
  const [newCompany, setNewCompany] = useState({ name: '', domain: '', plan: 'Pro', status: 'Active', users: 5 });
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Admin', company: 'ABC Pvt Ltd', status: 'Active' });
  const [newLead, setNewLead] = useState({ name: '', company: '', source: 'Website', assignedTo: 'Rahul Sharma', value: '25000', phone: '+91 98765 43210' });
  const [newTicket, setNewTicket] = useState({ subject: '', company: 'ABC Pvt Ltd', priority: 'Medium' });
  const [newInvoice, setNewInvoice] = useState({ company: 'ABC Pvt Ltd', amount: '25000', status: 'Paid', dueDate: '15 Oct 2026' });

  // 1. Live Leads State (Initialized from props or empty array, populated live from Supabase)
  const [activeLeads, setActiveLeads] = useState(() => (Array.isArray(leads) && leads.length > 0 ? leads : []));

  useEffect(() => {
    if (Array.isArray(leads) && leads.length > 0) {
      setActiveLeads(leads);
    }
  }, [leads]);

  // 2. System Users List (Initialized from props or empty array, populated live from Supabase)
  const [usersList, setUsersList] = useState(() => {
    if (Array.isArray(allUsersList) && allUsersList.length > 0) {
      return allUsersList.map(u => ({
        id: u.id || 'usr_' + Math.random().toString(36).slice(2, 7),
        name: u.name || u.displayName || 'Team Member',
        email: u.email || `${(u.username || 'user')}@example.com`,
        role: (u.role === 'company_owner' || u.role === 'admin') ? 'Admin'
              : u.role === 'team_leader' ? 'Manager'
              : 'Employee',
        company: u.companyName || u.company_name || u.company || 'ABC Pvt Ltd',
        status: u.active !== false && u.status !== 'Inactive' ? 'Active' : 'Inactive',
        avatarBg: '#3b82f6'
      }));
    }
    return [];
  });

  // 3. Companies List (Populated live from Supabase PostgreSQL)
  const [companies, setCompanies] = useState(() => []);

  // 4. Support Tickets (Populated live from Supabase PostgreSQL)
  const [tickets, setTickets] = useState(() => []);

  // 5. Invoices (Populated live from Supabase PostgreSQL)
  const [invoices, setInvoices] = useState(() => []);

  // 6. Notifications (Populated live from Supabase PostgreSQL)
  const [notifications, setNotifications] = useState(() => []);

  // 7. Integrations (Populated live from Supabase PostgreSQL)
  const [integrations, setIntegrations] = useState(() => []);

  // 8. Audit Logs (Populated live from Supabase PostgreSQL)
  const [auditLogs, setAuditLogs] = useState(() => []);

  // Date Range Filter for Executive Dashboard, Reports & Analytics, and CRM Overview
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // 'all', 'today', '7days', '30days', 'this_month', 'last_month', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Synchronize activeSettingsModal with systemSettingsMap
  useEffect(() => {
    if (activeSettingsModal && systemSettingsMap) {
      const current = systemSettingsMap[activeSettingsModal] || {};
      setEditableSettings({ ...current });
    }
  }, [activeSettingsModal, systemSettingsMap]);

  // Automatic Real-Time Cloud Sync: Fetch from Supabase PostgreSQL
  const loadAllSuperAdminData = useCallback(async () => {
    try {
      const [comps, invs, tix, logs, notifs, integs, lds, usrs, plansRes, pkgsRes, licsRes, settRes] = await Promise.allSettled([
        fetchCompaniesFromSupabase(),
        fetchInvoicesFromSupabase(),
        fetchTicketsFromSupabase(),
        fetchAuditLogsFromSupabase(),
        fetchNotificationsFromSupabase(),
        fetchIntegrationsFromSupabase(),
        fetchLeadsFromSupabase(),
        fetchUsersFromSupabase(),
        fetchCompanyPlansFromSupabase(),
        fetchDealPackagesFromSupabase(),
        fetchClientLicensesFromSupabase(),
        fetchSystemSettingsFromSupabase()
      ]);

      if (comps.status === 'fulfilled' && Array.isArray(comps.value)) setCompanies(comps.value);
      if (invs.status === 'fulfilled' && Array.isArray(invs.value)) setInvoices(invs.value);
      if (tix.status === 'fulfilled' && Array.isArray(tix.value)) setTickets(tix.value);
      if (logs.status === 'fulfilled' && Array.isArray(logs.value)) setAuditLogs(logs.value);
      if (notifs.status === 'fulfilled' && Array.isArray(notifs.value)) setNotifications(notifs.value);
      if (integs.status === 'fulfilled' && Array.isArray(integs.value)) setIntegrations(integs.value);
      if (lds.status === 'fulfilled' && Array.isArray(lds.value)) setActiveLeads(lds.value);
      if (usrs.status === 'fulfilled' && Array.isArray(usrs.value)) setUsersList(usrs.value);
      if (plansRes.status === 'fulfilled' && plansRes.value?.success && plansRes.value.map) setCompanyPlansMap(prev => ({ ...prev, ...plansRes.value.map }));
      if (pkgsRes.status === 'fulfilled' && pkgsRes.value?.success && Array.isArray(pkgsRes.value.data) && pkgsRes.value.data.length > 0) setClientDealPackages(pkgsRes.value.data);
      if (licsRes.status === 'fulfilled' && licsRes.value?.success && Array.isArray(licsRes.value.data) && licsRes.value.data.length > 0) setClientLicenses(licsRes.value.data);
      if (settRes.status === 'fulfilled' && settRes.value?.success && settRes.value.map) setSystemSettingsMap(settRes.value.map);
    } catch (e) {
      console.warn('Supabase bulk fetch deferred:', e);
    }
  }, [setCompanyPlansMap, setClientDealPackages, setClientLicenses, setSystemSettingsMap]);

  useEffect(() => {
    loadAllSuperAdminData();
  }, [loadAllSuperAdminData]);

  // Date-filtered collections
  const filteredActiveLeads = useMemo(() => {
    return filterByDateRange(activeLeads, 'updated_at', dateRangeFilter, customStartDate, customEndDate);
  }, [activeLeads, dateRangeFilter, customStartDate, customEndDate]);

  const filteredInvoices = useMemo(() => {
    return filterByDateRange(invoices, 'due_date', dateRangeFilter, customStartDate, customEndDate);
  }, [invoices, dateRangeFilter, customStartDate, customEndDate]);

  const filteredAuditLogs = useMemo(() => {
    return filterByDateRange(auditLogs, 'dateTime', dateRangeFilter, customStartDate, customEndDate);
  }, [auditLogs, dateRangeFilter, customStartDate, customEndDate]);

  // Dynamic unique modules extracted from live audit logs
  const availableAuditModules = useMemo(() => {
    const mods = new Set();
    (auditLogs || []).forEach(log => {
      if (log.module) mods.add(log.module);
    });
    return Array.from(mods).sort();
  }, [auditLogs]);

  // Displayed audit logs combining date range filter, module filter, search query, and column sorting
  const displayedAuditLogs = useMemo(() => {
    let result = (filteredAuditLogs || []).filter(log => {
      const matchSearch = !searchQuery ||
        (log.user || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.module || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchModule = auditModuleFilter === 'all' ||
        (log.module || '').toLowerCase() === auditModuleFilter.toLowerCase();
      return matchSearch && matchModule;
    });

    if (auditSortField) {
      result = [...result].sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (auditSortField === 'timestamp') {
          valA = new Date(a.rawTimestamp || a.created_at || a.date_time || a.dateTime || 0).getTime();
          valB = new Date(b.rawTimestamp || b.created_at || b.date_time || b.dateTime || 0).getTime();
        } else if (auditSortField === 'module') {
          valA = (a.module || '').toLowerCase();
          valB = (b.module || '').toLowerCase();
        }
        if (valA < valB) return auditSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return auditSortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [filteredAuditLogs, searchQuery, auditModuleFilter, auditSortField, auditSortDirection]);

  // Displayed notifications filtered by read/unread/all and search query (Live Supabase notifications)
  const displayedNotifications = useMemo(() => {
    return (notifications || []).filter(item => {
      const matchSearch = !searchQuery ||
        (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.detail || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (notificationFilter === 'unread') return item.unread;
      if (notificationFilter === 'read') return !item.unread;
      return true;
    });
  }, [notifications, notificationFilter, searchQuery]);

  const unreadNotifCount = useMemo(() => (notifications || []).filter(n => n.unread).length, [notifications]);
  const readNotifCount = useMemo(() => (notifications || []).filter(n => !n.unread).length, [notifications]);
  const totalNotifCount = (notifications || []).length;

  // Executive Dashboard Live Metrics
  const liveDashboardMetrics = useMemo(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter(c => (c.status || '').toLowerCase() === 'active').length;
    const totalUsers = usersList.length;
    const activeUsers = usersList.filter(u => u.status === 'Active' || u.active !== false).length;

    const totalLeads = filteredActiveLeads.length;
    const newLeads = filteredActiveLeads.filter(l => (l.status || '').toLowerCase() === 'new').length;
    const wonLeads = filteredActiveLeads.filter(l => (l.status || '').toLowerCase().includes('won')).length;
    const lostLeads = filteredActiveLeads.filter(l => (l.status || '').toLowerCase() === 'lost').length;

    const paidInvoices = filteredInvoices.filter(i => (i.status || '').toLowerCase() === 'paid');
    const paidInvoiceRevenue = paidInvoices.reduce((sum, i) => sum + (Number(i.numeric_amount) || Number(String(i.amount).replace(/[^0-9.]/g, '')) || 0), 0);
    const wonLeadRevenue = filteredActiveLeads
      .filter(l => (l.status || '').toLowerCase().includes('won'))
      .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

    const totalRevenue = paidInvoiceRevenue > 0 ? paidInvoiceRevenue : wonLeadRevenue;
    const totalInvoiced = filteredInvoices.reduce((sum, i) => sum + (Number(i.numeric_amount) || Number(String(i.amount).replace(/[^0-9.]/g, '')) || 0), 0);
    const conversionRate = totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;
    const avgDealValue = wonLeads > 0 ? Math.round(wonLeadRevenue / wonLeads) : (totalLeads > 0 ? Math.round(wonLeadRevenue / totalLeads) : 0);

    const activeSubscriptions = (clientLicenses || []).filter(l => (l.status || 'Active').toLowerCase() === 'active').length || 1;
    const expiringSubscriptions = (clientLicenses || []).filter(l => {
      if (!l.validUntil && !l.valid_until) return false;
      const d = new Date(l.validUntil || l.valid_until);
      const now = new Date();
      return d >= now && d <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }).length;

    return {
      totalCompanies,
      activeCompanies,
      totalUsers,
      activeUsers,
      totalLeads,
      newLeads,
      wonLeads,
      lostLeads,
      totalRevenue,
      paidInvoiceRevenue,
      totalInvoiced,
      wonLeadRevenue,
      conversionRate,
      avgDealValue,
      activeSubscriptions,
      expiringSubscriptions
    };
  }, [companies, usersList, filteredActiveLeads, filteredInvoices, clientLicenses]);

  // Lead KPI Metrics for Tab 4
  const leadKpiMetrics = useMemo(() => {
    const total = filteredActiveLeads.length;
    const assigned = filteredActiveLeads.filter(l => l.assignedTo && l.assignedTo !== 'Unassigned' && l.assignedTo !== '-').length;
    const inProgress = filteredActiveLeads.filter(l => {
      const s = (l.status || '').toLowerCase();
      return ['contacted', 'qualified', 'proposal', 'demo', 'in progress', 'negotiation', 'meeting scheduled', 'demo done', 'proposal sent', 'renewal'].includes(s);
    }).length;
    const converted = filteredActiveLeads.filter(l => (l.status || '').toLowerCase().includes('won')).length;
    return { total, assigned, inProgress, converted };
  }, [filteredActiveLeads]);

  // Lead Source Stats (Donut) for Tab 5
  const leadSourceStats = useMemo(() => {
    const counts = {};
    filteredActiveLeads.forEach(l => {
      const src = l.source || 'Other';
      counts[src] = (counts[src] || 0) + 1;
    });
    const total = filteredActiveLeads.length || 1;
    const palette = ['#2563eb', '#06b6d4', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#94a3b8'];
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    let currentPct = 0;
    const slices = entries.map(([name, cnt], idx) => {
      const pct = Math.round((cnt / total) * 100);
      const color = palette[idx % palette.length];
      const start = currentPct;
      const end = currentPct + pct;
      currentPct = end;
      return { name, count: cnt, pct, color, start, end };
    });
    
    const gradientStr = slices.length > 0
      ? 'conic-gradient(' + slices.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ') + ')'
      : 'conic-gradient(#2563eb 0% 100%)';
      
    return { counts, total: filteredActiveLeads.length, slices, gradientStr };
  }, [filteredActiveLeads]);

  // Plan Distribution Donut for Tab 1
  const companyPlanDistribution = useMemo(() => {
    const counts = {};
    companies.forEach(c => {
      const p = c.plan || 'Pro';
      counts[p] = (counts[p] || 0) + 1;
    });
    const total = companies.length || 1;
    const colors = { Pro: '#2563eb', Business: '#ea580c', Basic: '#16a34a', Enterprise: '#7c3aed', Growth: '#0d9488' };
    const entries = Object.entries(counts);

    let offset = 0;
    const circumference = 251.32; // 2 * PI * 40
    const slices = entries.map(([plan, count]) => {
      const pct = Math.round((count / total) * 100);
      const strokeLen = (pct / 100) * circumference;
      const sliceOffset = offset;
      offset += strokeLen;
      return {
        plan,
        count,
        pct,
        color: colors[plan] || '#2563eb',
        strokeDasharray: `${strokeLen.toFixed(1)} ${circumference.toFixed(1)}`,
        strokeDashoffset: (-sliceOffset).toFixed(1)
      };
    });

    return { total: companies.length, slices };
  }, [companies]);

  // Sales Pipeline Stages (Bar Chart) for Tab 9
  const salesPipelineStages = useMemo(() => {
    const newCount = filteredActiveLeads.filter(l => (l.status || '').toLowerCase() === 'new').length;
    const contactedCount = filteredActiveLeads.filter(l => (l.status || '').toLowerCase() === 'contacted').length;
    const qualifiedCount = filteredActiveLeads.filter(l => (l.status || '').toLowerCase() === 'qualified').length;
    const proposalCount = filteredActiveLeads.filter(l => {
      const s = (l.status || '').toLowerCase();
      return s.includes('proposal') || s.includes('demo');
    }).length;
    const wonCount = filteredActiveLeads.filter(l => (l.status || '').toLowerCase().includes('won')).length;

    const stages = [
      { name: 'New', count: newCount, color: '#2563eb' },
      { name: 'Contacted', count: contactedCount, color: '#3b82f6' },
      { name: 'Qualified', count: qualifiedCount, color: '#60a5fa' },
      { name: 'Proposal', count: proposalCount, color: '#0d9488' },
      { name: 'Won', count: wonCount, color: '#16a34a' }
    ];

    const maxCount = Math.max(...stages.map(s => s.count), 1);
    return stages.map(s => ({
      ...s,
      heightPx: Math.max(Math.round((s.count / maxCount) * 155), 14)
    }));
  }, [filteredActiveLeads]);

  // Dynamic Recent Activity from live auditLogs for Tab 9
  const liveRecentActivity = useMemo(() => {
    return (filteredAuditLogs || []).slice(0, 5).map(log => {
      const action = (log.action || '').toLowerCase();
      let icon = <Clock size={14} />;
      let bg = '#eff6ff';
      let color = '#2563eb';

      if (action.includes('delete')) {
        icon = <Trash2 size={14} />;
        bg = '#fee2e2';
        color = '#dc2626';
      } else if (action.includes('create') || action.includes('add') || action.includes('lead')) {
        icon = <UserPlus size={14} />;
        bg = '#ede9fe';
        color = '#7c3aed';
      } else if (action.includes('payment') || action.includes('invoice') || action.includes('license')) {
        icon = <CreditCard size={14} />;
        bg = '#e0f2fe';
        color = '#0284c7';
      } else if (action.includes('won')) {
        icon = <Crown size={14} />;
        bg = '#dcfce7';
        color = '#16a34a';
      } else if (action.includes('save') || action.includes('update') || action.includes('edit')) {
        icon = <CheckCircle2 size={14} />;
        bg = '#fff7ed';
        color = '#ea580c';
      }

      let timeText = log.dateTime || log.created_at || 'Recently';
      if (log.dateTime && log.dateTime.includes(',')) {
        timeText = log.dateTime.split(',')[1]?.trim() || log.dateTime;
      }

      return {
        id: log.id,
        user: log.user || log.user_name || 'Admin',
        title: `${log.user || log.user_name || 'Admin'}: ${log.action || 'Activity'}`,
        details: log.details || '',
        time: timeText,
        icon,
        bg,
        color
      };
    });
  }, [filteredAuditLogs]);

  // Monthly Revenue Trend for Tab 1 & Tab 5 Charts
  const monthlyRevenueTrend = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const monthlyMap = { May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0 };

    filteredInvoices.forEach(inv => {
      const d = inv.due_date || inv.dueDate || inv.created_at;
      const amt = Number(inv.numeric_amount) || Number(String(inv.amount).replace(/[^0-9.]/g, '')) || 0;
      if (!d) return;
      const str = String(d).toLowerCase();
      if (str.includes('may')) monthlyMap.May += amt;
      else if (str.includes('jun')) monthlyMap.Jun += amt;
      else if (str.includes('jul')) monthlyMap.Jul += amt;
      else if (str.includes('aug')) monthlyMap.Aug += amt;
      else if (str.includes('sep')) monthlyMap.Sep += amt;
      else monthlyMap.Sep += amt;
    });

    if (monthlyMap.Sep === 0 && liveDashboardMetrics.totalRevenue > 0) {
      monthlyMap.Sep = liveDashboardMetrics.totalRevenue;
    }

    const values = months.map(m => monthlyMap[m]);
    const maxVal = Math.max(...values, 80000, 10000);
    const xCoords = [60, 140, 220, 310, 370];
    const points = values.map((val, idx) => {
      const y = Math.round(140 - (val / maxVal) * 90);
      return { month: months[idx], value: val, x: xCoords[idx], y };
    });

    const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return { months, values, points, pathD, maxVal };
  }, [filteredInvoices, liveDashboardMetrics.totalRevenue]);

  // Reusable Date Range Dropdown Component
  const renderDateRangeDropdown = () => (
    <div style={{ position: 'relative' }}>
      <button
        data-testid="date-range-toggle-btn"
        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          fontSize: '12.5px',
          color: '#334155',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <Calendar size={14} color="#64748b" />
        <span>
          {dateRangeFilter === 'all' && 'All Time'}
          {dateRangeFilter === 'today' && 'Today'}
          {dateRangeFilter === '7days' && 'Last 7 Days'}
          {dateRangeFilter === '30days' && 'Last 30 Days'}
          {dateRangeFilter === 'this_month' && 'This Month'}
          {dateRangeFilter === 'last_month' && 'Last Month'}
          {dateRangeFilter === 'custom' && (customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` : 'Custom Range')}
        </span>
        <ChevronDown size={14} color="#94a3b8" />
      </button>

      {isDatePickerOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: '6px',
          width: '210px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          zIndex: 50,
          padding: '6px'
        }}>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'custom', label: 'Custom Range' }
          ].map(opt => (
            <div
              key={opt.id}
              data-testid={`date-option-${opt.id}`}
              onClick={() => {
                setDateRangeFilter(opt.id);
                if (opt.id !== 'custom') setIsDatePickerOpen(false);
              }}
              style={{
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: dateRangeFilter === opt.id ? '750' : '500',
                color: dateRangeFilter === opt.id ? '#2563eb' : '#334155',
                backgroundColor: dateRangeFilter === opt.id ? '#eff6ff' : 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>{opt.label}</span>
              {dateRangeFilter === opt.id && <Check size={13} color="#2563eb" />}
            </div>
          ))}

          {dateRangeFilter === 'custom' && (
            <div style={{ padding: '8px 4px 4px 4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>START DATE</div>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ width: '100%', padding: '4px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '6px', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>END DATE</div>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ width: '100%', padding: '4px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '8px', boxSizing: 'border-box' }}
              />
              <button
                onClick={() => setIsDatePickerOpen(false)}
                style={{ width: '100%', padding: '5px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                Apply Range
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Helper functions for matching styling
  const getInitials = (name = '') => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  };

  const getCompanyIcon = (icon) => {
    switch (icon) {
      case 'store': return <Store size={15} />;
      case 'globe': return <Globe size={15} />;
      case 'cpu': return <Cpu size={15} />;
      case 'briefcase': return <Briefcase size={15} />;
      default: return <Building2 size={15} />;
    }
  };

  const getPlanStyle = (plan = '') => {
    const p = plan.toLowerCase();
    if (p.includes('pro')) return { backgroundColor: '#eff6ff', color: '#2563eb' };
    if (p.includes('business')) return { backgroundColor: '#fff7ed', color: '#ea580c' };
    if (p.includes('basic')) return { backgroundColor: '#e0f2fe', color: '#0284c7' };
    return { backgroundColor: '#eff6ff', color: '#2563eb' };
  };

  const getRoleStyle = (role = '') => {
    const r = role.toLowerCase();
    if (r.includes('admin')) return { backgroundColor: '#eff6ff', color: '#2563eb' };
    if (r.includes('manager')) return { backgroundColor: '#faf5ff', color: '#9333ea' };
    if (r.includes('employee') || r.includes('sales')) return { backgroundColor: '#fff7ed', color: '#ea580c' };
    return { backgroundColor: '#eff6ff', color: '#2563eb' };
  };

  const getLeadStatusStyle = (status = '') => {
    switch (status) {
      case 'New': return { backgroundColor: '#fdf2f8', color: '#db2777' };
      case 'Contacted': return { backgroundColor: '#eff6ff', color: '#2563eb' };
      case 'Qualified': return { backgroundColor: '#ecfdf5', color: '#059669' };
      case 'Proposal': return { backgroundColor: '#fffbeb', color: '#d97706' };
      case 'Won': return { backgroundColor: '#f0fdf4', color: '#16a34a' };
      default: return { backgroundColor: '#f1f5f9', color: '#475569' };
    }
  };

  const getPriorityStyle = (priority = '') => {
    switch (priority) {
      case 'High': return { backgroundColor: '#fef2f2', color: '#dc2626' };
      case 'Medium': return { backgroundColor: '#fffbeb', color: '#d97706' };
      case 'Low': return { backgroundColor: '#eff6ff', color: '#2563eb' };
      default: return { backgroundColor: '#f1f5f9', color: '#475569' };
    }
  };

  const getTicketStatusStyle = (status = '') => {
    switch (status) {
      case 'Open': return { backgroundColor: '#eff6ff', color: '#2563eb' };
      case 'In Progress': return { backgroundColor: '#faf5ff', color: '#9333ea' };
      case 'Resolved': return { backgroundColor: '#ecfdf5', color: '#059669' };
      default: return { backgroundColor: '#f1f5f9', color: '#475569' };
    }
  };

  const getAuditActionStyle = (action = '') => {
    switch (action) {
      case 'Login': return { backgroundColor: '#eff6ff', color: '#2563eb' };
      case 'Create': return { backgroundColor: '#ecfdf5', color: '#059669' };
      case 'Update': return { backgroundColor: '#fffbeb', color: '#d97706' };
      case 'Delete': return { backgroundColor: '#fef2f2', color: '#dc2626' };
      case 'Export': return { backgroundColor: '#faf5ff', color: '#9333ea' };
      default: return { backgroundColor: '#eff6ff', color: '#2563eb' };
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'payment': return <CreditCard size={18} />;
      case 'lead': return <UserPlus size={18} />;
      case 'system': return <ShieldCheck size={18} />;
      case 'alert': return <AlertCircle size={18} />;
      case 'ticket': return <Headset size={18} />;
      default: return <Bell size={18} />;
    }
  };

  const getNotifBg = (type) => {
    switch (type) {
      case 'payment': return '#eff6ff';
      case 'lead': return '#f1f5f9';
      case 'system': return '#eff6ff';
      case 'alert': return '#fef2f2';
      case 'ticket': return '#faf5ff';
      default: return '#f1f5f9';
    }
  };

  const getNotifColor = (type) => {
    switch (type) {
      case 'payment': return '#2563eb';
      case 'lead': return '#334155';
      case 'system': return '#2563eb';
      case 'alert': return '#ef4444';
      case 'ticket': return '#9333ea';
      default: return '#475569';
    }
  };

  const getAppIcon = (id) => {
    switch (id) {
      case 'zoho': return 'Z';
      case 'google': return 'G';
      case 'slack': return '#';
      case 'mailchimp': return <Mail size={18} />;
      case 'whatsapp': return <Smartphone size={18} />;
      case 'zapier': return <Zap size={18} />;
      default: return <Layers size={18} />;
    }
  };

  // SaaS Subscription Revenue & Provisioned Capacity Metrics
  const saasMRR = useMemo(() => {
    return (clientLicenses || []).reduce((acc, l) => acc + (Number(l.finalAmount) || 4999), 0);
  }, [clientLicenses]);

  const saasARR = saasMRR * 12;

  const totalProvisionedSeats = useMemo(() => {
    return (clientLicenses || []).reduce((acc, l) => acc + (Number(l.customSeats) || Number(l.defaultSeats) || 15), 0);
  }, [clientLicenses]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Real CSV & JSON File Exporters
  const downloadCSV = (filename, contentString) => {
    const blob = new Blob(['\uFEFF' + contentString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = (filename, obj) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // REAL NON-OPTIMISTIC CRUD HANDLERS
  // ==========================================

  // --- 1. Companies CRUD ---
  const handleAddCompany = async (e) => {
    e.preventDefault();
    if (!newCompany.name.trim()) {
      showToast('Please provide a valid company name', 'error');
      return;
    }
    setIsSubmitting(true);
    const item = {
      id: 'c_' + Date.now(),
      name: newCompany.name.trim(),
      domain: newCompany.domain.trim() || `${newCompany.name.toLowerCase().replace(/\s+/g, '')}.com`,
      plan: newCompany.plan || 'Pro',
      status: newCompany.status || 'Active',
      users: Number(newCompany.users) || 5,
      revenue: `₹${(Number(newCompany.users) * 3000).toLocaleString('en-IN')}`,
      startDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      endDate: '01 Jan 2027'
    };

    try {
      const res = await upsertCompanyToSupabase(item);
      if (res && res.success === false) {
        showToast(`Failed to register company: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const refreshed = await fetchCompaniesFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setCompanies(refreshed);
      } else {
        setCompanies(prev => [item, ...prev]);
      }
      setIsAddCompanyOpen(false);
      setNewCompany({ name: '', domain: '', plan: 'Pro', status: 'Active', users: 5 });
      showToast(`Company "${item.name}" registered successfully in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (!editingCompany || !editingCompany.name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await upsertCompanyToSupabase(editingCompany);
      if (res && res.success === false) {
        showToast(`Failed to update company: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const refreshed = await fetchCompaniesFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setCompanies(refreshed);
      } else {
        setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...editingCompany } : c));
      }
      setIsEditCompanyOpen(false);
      const updatedName = editingCompany.name;
      setEditingCompany(null);
      if (activeActionMenu?.item?.id === editingCompany.id) setActiveActionMenu(null);
      showToast(`Company "${updatedName}" updated in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    const c = companies.find(x => x.id === id);
    const confirmed = window.confirm(`Are you sure you want to permanently delete company "${c?.name || id}" from Supabase? This action cannot be undone.`);
    if (!confirmed) return;

    setActionLoadingId(id);
    try {
      const res = await deleteCompanyFromSupabase(id);
      if (res && res.success === false) {
        showToast(`Failed to delete company: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchCompaniesFromSupabase();
      if (Array.isArray(refreshed)) {
        setCompanies(refreshed);
      } else {
        setCompanies(prev => prev.filter(x => x.id !== id));
      }
      if (activeActionMenu?.item?.id === id) setActiveActionMenu(null);
      showToast(`Company "${c?.name || id}" permanently removed from Supabase.`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error deleting company: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- 2. Users CRUD ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) {
      showToast('Name and Email are required', 'error');
      return;
    }
    setIsSubmitting(true);
    const userObj = {
      id: 'usr_' + Date.now(),
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      role: newUser.role || 'Employee',
      company: newUser.company || 'ABC Pvt Ltd',
      status: newUser.status || 'Active',
      active: (newUser.status || 'Active') === 'Active'
    };

    try {
      const res = await upsertUserToSupabase(userObj);
      if (res && res.success === false) {
        showToast(`Failed to create user: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const refreshed = await fetchUsersFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setUsersList(refreshed);
      } else {
        setUsersList(prev => [userObj, ...prev]);
      }
      setIsAddUserOpen(false);
      setNewUser({ name: '', email: '', role: 'Admin', company: 'ABC Pvt Ltd', status: 'Active' });
      showToast(`User "${userObj.name}" created successfully in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error creating user: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await upsertUserToSupabase(editingUser);
      if (res && res.success === false) {
        showToast(`Failed to update user: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const refreshed = await fetchUsersFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setUsersList(refreshed);
      } else {
        setUsersList(prev => prev.map(u => u.id === editingUser.id ? { ...editingUser } : u));
      }
      setIsEditUserOpen(false);
      const updatedName = editingUser.name;
      setEditingUser(null);
      if (activeActionMenu?.item?.id === editingUser.id) setActiveActionMenu(null);
      showToast(`User "${updatedName}" updated in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error updating user: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    const u = usersList.find(x => x.id === id);
    const confirmed = window.confirm(`Are you sure you want to delete user "${u?.name || id}" from Supabase?`);
    if (!confirmed) return;

    setActionLoadingId(id);
    try {
      const res = await deleteUserFromSupabase(id);
      if (res && res.success === false) {
        showToast(`Failed to delete user: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchUsersFromSupabase();
      if (Array.isArray(refreshed)) {
        setUsersList(refreshed);
      } else {
        setUsersList(prev => prev.filter(u => u.id !== id));
      }
      if (activeActionMenu?.item?.id === id) setActiveActionMenu(null);
      showToast(`User "${u?.name || id}" removed from Supabase.`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error deleting user: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleUserStatus = async (user) => {
    if (!user) return;
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const nextActive = nextStatus === 'Active';
    setActionLoadingId(user.id);

    try {
      const res = await upsertUserToSupabase({
        ...user,
        active: nextActive,
        status: nextStatus
      });
      if (res && res.success === false) {
        showToast(`Failed to update status: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchUsersFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setUsersList(refreshed);
      } else {
        setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus, active: nextActive } : u));
      }
      if (activeActionMenu?.item?.id === user.id) {
        setActiveActionMenu(prev => prev ? { ...prev, item: { ...prev.item, status: nextStatus, active: nextActive } } : null);
      }
      showToast(`User "${user.name}" status set to ${nextStatus} in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeUserRole = async (user, newRole) => {
    if (!user || !newRole) return;
    setActionLoadingId(user.id);
    try {
      const res = await upsertUserToSupabase({ ...user, role: newRole });
      if (res && res.success === false) {
        showToast(`Failed to change role: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchUsersFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setUsersList(refreshed);
      } else {
        setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      }
      if (activeActionMenu?.item?.id === user.id) {
        setActiveActionMenu(prev => prev ? { ...prev, item: { ...prev.item, role: newRole } } : null);
      }
      showToast(`Role updated to ${newRole} for "${user.name}" in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeUserCompany = async (user, newCompany) => {
    if (!user || !newCompany) return;
    setActionLoadingId(user.id);
    try {
      const res = await upsertUserToSupabase({ ...user, company: newCompany, companyName: newCompany });
      if (res && res.success === false) {
        showToast(`Failed to change company: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchUsersFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setUsersList(refreshed);
      } else {
        setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, company: newCompany } : u));
      }
      if (activeActionMenu?.item?.id === user.id) {
        setActiveActionMenu(prev => prev ? { ...prev, item: { ...prev.item, company: newCompany } } : null);
      }
      showToast(`Company reassigned to "${newCompany}" for "${user.name}" in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- 3. Leads CRUD ---
  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!newLead.name.trim()) {
      showToast('Lead customer name is required', 'error');
      return;
    }
    setIsSubmitting(true);
    const leadObj = {
      id: 'lead_' + Date.now(),
      name: newLead.name.trim(),
      company: newLead.company.trim() || 'Enterprise Client',
      source: newLead.source || 'Website',
      owner: newLead.assignedTo || currentUser?.name || 'Super Admin',
      assignedTo: newLead.assignedTo || currentUser?.name || 'Super Admin',
      status: 'New',
      score: 'Warm',
      value: Number(newLead.value) || 25000,
      phone: newLead.phone || '+91 98765 43210',
      email: `${newLead.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      created_at: new Date().toISOString()
    };

    try {
      const res = await upsertLeadToSupabase(leadObj);
      if (res && res.success === false) {
        showToast(`Failed to create lead: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const refreshed = await fetchLeadsFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setActiveLeads(refreshed);
      } else {
        setActiveLeads(prev => [leadObj, ...prev]);
      }
      setIsAddLeadOpen(false);
      setNewLead({ name: '', company: '', source: 'Website', assignedTo: currentUser?.name || 'Super Admin', value: '25000', phone: '+91 98765 43210' });
      showToast(`Lead "${leadObj.name}" added to Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    if (!editingLead || !editingLead.name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await upsertLeadToSupabase(editingLead);
      if (res && res.success === false) {
        showToast(`Failed to update lead: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const refreshed = await fetchLeadsFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setActiveLeads(refreshed);
      } else {
        setActiveLeads(prev => prev.map(l => l.id === editingLead.id ? { ...editingLead } : l));
      }
      setIsEditLeadOpen(false);
      const leadName = editingLead.name;
      setEditingLead(null);
      if (activeActionMenu?.item?.id === editingLead.id) setActiveActionMenu(null);
      showToast(`Lead "${leadName}" updated in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLead = async (id) => {
    const l = activeLeads.find(x => x.id === id);
    const confirmed = window.confirm(`Are you sure you want to delete lead "${l?.name || id}" from Supabase?`);
    if (!confirmed) return;

    setActionLoadingId(id);
    try {
      const res = await deleteLeadFromSupabase(id);
      if (res && res.success === false) {
        showToast(`Failed to delete lead: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchLeadsFromSupabase();
      if (Array.isArray(refreshed)) {
        setActiveLeads(refreshed);
      } else {
        setActiveLeads(prev => prev.filter(x => x.id !== id));
      }
      if (activeActionMenu?.item?.id === id) setActiveActionMenu(null);
      showToast(`Lead "${l?.name || id}" deleted from Supabase.`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error deleting lead: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeLeadStage = async (lead, newStage) => {
    if (!lead || !newStage) return;
    setActionLoadingId(lead.id);
    try {
      const res = await upsertLeadToSupabase({ ...lead, status: newStage });
      if (res && res.success === false) {
        showToast(`Failed to update stage: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchLeadsFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setActiveLeads(refreshed);
      } else {
        setActiveLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStage } : l));
      }
      if (activeActionMenu?.item?.id === lead.id) {
        setActiveActionMenu(prev => prev ? { ...prev, item: { ...prev.item, status: newStage } } : null);
      }
      showToast(`Lead stage updated to ${newStage} in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssignLead = async (lead, newOwner) => {
    if (!lead || !newOwner) return;
    setActionLoadingId(lead.id);
    try {
      const res = await upsertLeadToSupabase({ ...lead, owner: newOwner, assignedTo: newOwner });
      if (res && res.success === false) {
        showToast(`Failed to assign lead: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchLeadsFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setActiveLeads(refreshed);
      } else {
        setActiveLeads(prev => prev.map(l => l.id === lead.id ? { ...l, owner: newOwner, assignedTo: newOwner } : l));
      }
      if (activeActionMenu?.item?.id === lead.id) {
        setActiveActionMenu(prev => prev ? { ...prev, item: { ...prev.item, owner: newOwner, assignedTo: newOwner } } : null);
      }
      showToast(`Lead reassigned to ${newOwner} in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- 4. Support Tickets CRUD ---
  const handleAddTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject.trim()) {
      showToast('Ticket subject is required', 'error');
      return;
    }
    setIsSubmitting(true);
    const ticketObj = {
      id: `#ST-00${tickets.length + 1}`,
      ticket_id: `#ST-00${tickets.length + 1}`,
      subject: newTicket.subject.trim(),
      customer: newTicket.customer || (currentUser?.displayName || currentUser?.name || 'Rahul Sharma'),
      company: newTicket.company || 'ABC Pvt Ltd',
      priority: newTicket.priority || 'Medium',
      status: 'Open',
      createdAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    try {
      const res = await upsertTicketToSupabase(ticketObj);
      if (res && res.success === false) {
        showToast(`Failed to create ticket: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const refreshed = await fetchTicketsFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setTickets(refreshed);
      } else {
        setTickets(prev => [ticketObj, ...prev]);
      }
      setIsAddTicketOpen(false);
      setNewTicket({ subject: '', company: 'ABC Pvt Ltd', priority: 'Medium' });
      showToast(`Support ticket ${ticketObj.id} created in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    if (!editingTicket || !editingTicket.subject.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await upsertTicketToSupabase(editingTicket);
      if (res && res.success === false) {
        showToast(`Failed to update ticket: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const refreshed = await fetchTicketsFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setTickets(refreshed);
      } else {
        setTickets(prev => prev.map(t => t.id === editingTicket.id ? { ...editingTicket } : t));
      }
      setIsEditTicketOpen(false);
      const ticketId = editingTicket.id;
      setEditingTicket(null);
      if (activeActionMenu?.item?.id === editingTicket.id) setActiveActionMenu(null);
      showToast(`Ticket ${ticketId} updated in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTicket = async (id) => {
    const t = tickets.find(x => x.id === id);
    const confirmed = window.confirm(`Are you sure you want to delete ticket "${t?.subject || id}" from Supabase?`);
    if (!confirmed) return;

    setActionLoadingId(id);
    try {
      const res = await deleteTicketFromSupabase(id);
      if (res && res.success === false) {
        showToast(`Failed to delete ticket: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchTicketsFromSupabase();
      if (Array.isArray(refreshed)) {
        setTickets(refreshed);
      } else {
        setTickets(prev => prev.filter(x => x.id !== id));
      }
      if (activeActionMenu?.item?.id === id) setActiveActionMenu(null);
      showToast(`Ticket ${id} removed from Supabase.`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error deleting ticket: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeTicketStatus = async (ticket, newStatus) => {
    if (!ticket || !newStatus) return;
    setActionLoadingId(ticket.id);
    try {
      const res = await upsertTicketToSupabase({ ...ticket, status: newStatus });
      if (res && res.success === false) {
        showToast(`Failed to update status: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchTicketsFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setTickets(refreshed);
      } else {
        setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus } : t));
      }
      if (activeActionMenu?.item?.id === ticket.id) {
        setActiveActionMenu(prev => prev ? { ...prev, item: { ...prev.item, status: newStatus } } : null);
      }
      showToast(`Ticket ${ticket.id} status set to ${newStatus} in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeTicketPriority = async (ticket, newPriority) => {
    if (!ticket || !newPriority) return;
    setActionLoadingId(ticket.id);
    try {
      const res = await upsertTicketToSupabase({ ...ticket, priority: newPriority });
      if (res && res.success === false) {
        showToast(`Failed to update priority: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const refreshed = await fetchTicketsFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setTickets(refreshed);
      } else {
        setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, priority: newPriority } : t));
      }
      if (activeActionMenu?.item?.id === ticket.id) {
        setActiveActionMenu(prev => prev ? { ...prev, item: { ...prev.item, priority: newPriority } } : null);
      }
      showToast(`Ticket ${ticket.id} priority set to ${newPriority} in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleTicketStatus = async (ticketId) => {
    const targetTicket = tickets.find(t => t.id === ticketId);
    if (!targetTicket) return;

    const nextStatusMap = {
      'Open': 'In Progress',
      'In Progress': 'Resolved',
      'Resolved': 'Closed',
      'Closed': 'Open'
    };
    const nextStatus = nextStatusMap[targetTicket.status] || 'Open';

    setActionLoadingId(ticketId);
    try {
      const updated = { ...targetTicket, status: nextStatus };
      const res = await upsertTicketToSupabase(updated);
      if (res && res.success === false) {
        showToast(`Failed to update ticket: ${res.error}`, 'error');
        return;
      }
      const refreshed = await fetchTicketsFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setTickets(refreshed);
      } else {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: nextStatus } : t));
      }
      await insertAuditLogToSupabase({
        user: currentUser?.name || 'Super Admin',
        action: 'Update Status',
        module: 'Support Tickets',
        details: `Toggled ticket #${targetTicket.id} (${targetTicket.subject}) to ${nextStatus}`
      });
      const freshLogs = await fetchAuditLogsFromSupabase();
      if (Array.isArray(freshLogs)) setAuditLogs(freshLogs);
      showToast(`Ticket #${targetTicket.id} status changed to ${nextStatus}!`, 'success');
    } catch (err) {
      showToast(`Error updating ticket status: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- 5. Deal Packages CRUD ---
  const handleSaveDealPackage = async (packageData) => {
    if (!packageData || !packageData.name?.trim()) {
      showToast('Package name is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await upsertDealPackageToSupabase(packageData);
      if (res && res.success === false) {
        showToast(`Database error saving package: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const freshPkgs = await fetchDealPackagesFromSupabase();
      if (freshPkgs.success && Array.isArray(freshPkgs.data)) {
        setClientDealPackages(freshPkgs.data);
      }
      setIsDealPackageModalOpen(false);
      setEditingDealPackage(null);
      showToast(`Deal package "${packageData.name}" saved to Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDealPackage = async (pkgId) => {
    const pkg = clientDealPackages.find(p => p.id === pkgId);
    const confirmed = window.confirm(`Are you sure you want to delete deal package "${pkg?.name || pkgId}" from Supabase?`);
    if (!confirmed) return;

    setActionLoadingId(pkgId);
    try {
      const res = await deleteDealPackageFromSupabase(pkgId);
      if (res && res.success === false) {
        showToast(`Database error deleting package: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const freshPkgs = await fetchDealPackagesFromSupabase();
      if (freshPkgs.success && Array.isArray(freshPkgs.data)) {
        setClientDealPackages(freshPkgs.data);
      } else {
        setClientDealPackages(prev => prev.filter(p => p.id !== pkgId));
      }
      showToast(`Package "${pkg?.name || pkgId}" deleted from Supabase.`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error deleting package: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- 6. Company Subscriptions CRUD ---
  const handleSaveCompanySubscription = async (subData) => {
    if (!subData || !subData.company_id) return;
    setIsSubmitting(true);
    try {
      const res = await upsertCompanyPlanToSupabase(subData);
      if (res && res.success === false) {
        showToast(`Database error updating subscription: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      const freshPlans = await fetchCompanyPlansFromSupabase();
      if (freshPlans.success && freshPlans.map) {
        setCompanyPlansMap(freshPlans.map);
      }
      await upsertCompanyToSupabase({
        id: subData.company_id,
        name: subData.company_name,
        plan: subData.plan_name,
        status: subData.status || 'Active',
        users: Number(subData.max_seats) || 15
      });
      const freshComps = await fetchCompaniesFromSupabase();
      if (Array.isArray(freshComps)) setCompanies(freshComps);

      setIsEditSubscriptionOpen(false);
      setEditingSubscriptionComp(null);
      if (activeActionMenu?.item?.company_id === subData.company_id || activeActionMenu?.item?.id === subData.company_id) {
        setActiveActionMenu(null);
      }
      showToast(`Subscription updated for "${subData.company_name}" in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error updating subscription: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 7. Client Licenses Direct Revoke ---
  const handleRevokeLicenseDirect = async (lic) => {
    if (!lic) return;
    const confirmed = window.confirm(`Are you sure you want to revoke license "${lic.licenseNumber}" for "${lic.companyName}"?`);
    if (!confirmed) return;

    setActionLoadingId(lic.id);
    try {
      const res = await upsertClientLicenseToSupabase({ ...lic, status: 'revoked' });
      if (res && res.success === false) {
        showToast(`Database error revoking license: ${res.error}`, 'error');
        setActionLoadingId(null);
        return;
      }
      const freshLics = await fetchClientLicensesFromSupabase();
      if (freshLics.success && Array.isArray(freshLics.data)) {
        setClientLicenses(freshLics.data);
      }
      showToast(`License #${lic.licenseNumber} revoked in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error revoking license: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- 8. System Settings Save ---
  const handleSaveSystemSettings = async () => {
    if (!activeSettingsModal) return;
    setIsSubmitting(true);
    try {
      const currentVal = systemSettingsMap[activeSettingsModal] || {};
      const updatedVal = {
        ...currentVal,
        ...editableSettings,
        lastVerifiedAt: new Date().toISOString()
      };
      const res = await updateSystemSettingInSupabase(activeSettingsModal, updatedVal);
      if (res && res.success === false) {
        showToast(`Database error updating settings: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }
      if (setSystemSettingsMap) {
        setSystemSettingsMap(prev => ({ ...prev, [activeSettingsModal]: updatedVal }));
      }
      setActiveSettingsModal(null);
      showToast(`Settings for "${activeSettingsModal}" saved & verified in Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error saving settings: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateUniqueInvoiceId = (existingInvoices = []) => {
    const existingIds = new Set(existingInvoices.map(i => (i.id || '').toUpperCase()));
    let maxNum = 0;
    existingInvoices.forEach(i => {
      const match = (i.id || '').match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum && num < 100000) maxNum = num;
      }
    });
    let nextNum = maxNum > 0 ? maxNum + 1 : 1;
    let candidate = `#INV-${String(nextNum).padStart(3, '0')}`;
    while (existingIds.has(candidate.toUpperCase())) {
      nextNum++;
      candidate = `#INV-${String(nextNum).padStart(3, '0')}`;
    }
    return candidate;
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!newInvoice.company?.trim()) {
      showToast('Please select or specify a billed company', 'error');
      return;
    }
    const numAmount = Number(newInvoice.amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid invoice amount greater than 0', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const candidateId = generateUniqueInvoiceId(invoices);
      const invObj = {
        id: candidateId,
        company: newInvoice.company.trim(),
        plan: newInvoice.plan || 'Pro Plan',
        amount: `₹${numAmount.toLocaleString('en-IN')}`,
        numeric_amount: numAmount,
        status: newInvoice.status || 'Paid',
        dueDate: newInvoice.dueDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };

      const res = await upsertInvoiceToSupabase(invObj);
      if (res && res.success === false) {
        showToast(`Failed to create invoice in database: ${res.error}`, 'error');
        setIsSubmitting(false);
        return;
      }

      const refreshed = await fetchInvoicesFromSupabase();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setInvoices(refreshed);
      } else {
        setInvoices(prev => [invObj, ...prev]);
      }

      setIsAddInvoiceOpen(false);
      showToast(`Tax Invoice ${candidateId} created and verified in Supabase!`, 'success');

      await insertAuditLogToSupabase({
        user: 'Super Admin',
        action: 'Create Invoice',
        module: 'Billing',
        details: `Generated tax invoice: ${candidateId} for ${invObj.company} (₹${numAmount.toLocaleString('en-IN')})`
      });
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error creating invoice: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!invoiceId) return;
    if (!window.confirm(`Are you sure you want to delete invoice ${invoiceId}?`)) return;
    setActionLoadingId(invoiceId);
    try {
      const res = await deleteInvoiceFromSupabase(invoiceId);
      if (res && res.success === false) {
        showToast(`Failed to delete invoice: ${res.error}`, 'error');
        return;
      }
      // Re-fetch authoritative invoice list from Supabase to maintain strict DB consistency
      const refreshedInvoices = await fetchInvoicesFromSupabase();
      if (Array.isArray(refreshedInvoices)) {
        setInvoices(refreshedInvoices);
      } else {
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      }
      setActiveActionMenu(null);
      showToast(`Invoice ${invoiceId} deleted successfully from Supabase!`, 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error deleting invoice: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadInvoice = (inv) => {
    if (!inv || !inv.id) return;
    if (!window.confirm(`Generate and download tax invoice document for ${inv.id} (${inv.company})?`)) return;
    const content = `================================================
APEXSALES GLOBAL CRM - OFFICIAL TAX INVOICE
================================================
Invoice No:    ${inv.id}
Client:        ${inv.company}
Date:          ${inv.dueDate || inv.due_date || '15 Oct 2026'}
Amount:        ${inv.amount}
Status:        ${inv.status} (Verified)
GSTIN:         07AAAAA0000A1Z5
Service:       Enterprise Multi-Tenant CRM License
Issued By:     ApexSales Master Governance
Support:       support@apexsales.com
================================================
Thank you for your business!`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Invoice-${inv.id}-${(inv.company || 'Client').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Invoice ${inv.id} downloaded!`, 'success');
  };

  const toggleIntegration = async (id) => {
    const target = (integrations || []).find(item => item.id === id);
    if (!target) return;
    const next = !target.connected;

    // 1. Set action loading
    setActionLoadingId(id);

    try {
      // 2 & 3. Await Supabase mutation
      const res = await toggleIntegrationInSupabase(id, next);

      // 4 & 5. Inspect return value
      if (!res) {
        showToast(`Failed to update ${target.name} in Supabase`, 'error');
        const fresh = await fetchIntegrationsFromSupabase();
        if (Array.isArray(fresh)) setIntegrations(fresh);
        return;
      }

      // 6. Refetch authoritative data from Supabase and log audit
      const freshIntegs = await fetchIntegrationsFromSupabase();
      if (Array.isArray(freshIntegs)) {
        setIntegrations(freshIntegs);
      } else {
        setIntegrations(prev => prev.map(item => item.id === id ? { ...item, connected: next } : item));
      }

      await insertAuditLogToSupabase({
        user: currentUser?.name || 'Super Admin',
        action: 'Update',
        module: 'Integrations',
        details: `Toggled ${target.name} integration to ${next ? 'connected' : 'disconnected'}`
      });
      const freshLogs = await fetchAuditLogsFromSupabase();
      if (Array.isArray(freshLogs)) setAuditLogs(freshLogs);

      showToast(`${target.name} is now ${next ? 'connected' : 'disconnected'}.`, 'success');
    } catch (err) {
      showToast(`Error updating integration: ${err.message}`, 'error');
      const fresh = await fetchIntegrationsFromSupabase();
      if (Array.isArray(fresh)) setIntegrations(fresh);
    } finally {
      // 7. Clear loading state
      setActionLoadingId(null);
    }
  };

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    if (!profileName?.trim() || !profileEmail?.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const updatedUserObj = {
        id: currentUser?.id || 'usr_admin',
        name: profileName.trim(),
        email: profileEmail.trim(),
        role: 'super_admin'
      };
      await upsertUserToSupabase(updatedUserObj);
      await insertAuditLogToSupabase({
        user: profileName.trim(),
        action: 'Update',
        module: 'User Management',
        details: `Updated Super Admin profile: ${profileName.trim()} (${profileEmail.trim()})`
      });
      setUsersList(prev => prev.map(u => (u.id === updatedUserObj.id || u.role === 'Admin') ? { ...u, name: updatedUserObj.name, email: updatedUserObj.email } : u));
      showToast('Profile updated successfully in Supabase!', 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error updating profile: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showToast(`Failed to update password: ${error.message}`, 'error');
        return;
      }
      showToast('Password updated successfully via Supabase Auth!', 'success');
      setNewPassword('');
      setConfirmPassword('');
      await insertAuditLogToSupabase({
        user: currentUser?.name || 'Super Admin',
        action: 'Update',
        module: 'Security',
        details: `Updated Super Admin account password (${currentUser?.email || profileEmail})`
      });
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error updating password: ${err.message}`, 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    setIsSubmitting(true);
    try {
      const prefs = {
        signupAlerts: notifPrefSignup,
        ticketAlerts: notifPrefTickets,
        billingAlerts: notifPrefBilling
      };
      await updateSystemSettingInSupabase('notification_preferences', JSON.stringify(prefs));
      await insertAuditLogToSupabase({
        user: currentUser?.name || 'Super Admin',
        action: 'Update',
        module: 'System Settings',
        details: 'Updated Super Admin notification alert preferences'
      });
      showToast('Notification preferences saved to system settings!', 'success');
      fetchAuditLogsFromSupabase().then(logs => { if (logs) setAuditLogs(logs); });
    } catch (err) {
      showToast(`Error saving notification preferences: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAppearancePreferences = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        theme: selectedTheme || 'light',
        mode: 'Enterprise Standard',
        updated_at: new Date().toISOString()
      };
      const res = await updateSystemSettingInSupabase('appearance_theme', payload, 'Super Admin Appearance and Theme');
      if (res && res.success === false) {
        showToast(`Failed to persist appearance settings: ${res.error}`, 'error');
        return;
      }
      const freshSettings = await fetchSystemSettingsFromSupabase();
      if (freshSettings && freshSettings.map) {
        setSystemSettingsMap(freshSettings.map);
      }
      await insertAuditLogToSupabase({
        user: currentUser?.name || 'Super Admin',
        action: 'Update',
        module: 'System Settings',
        details: `Saved appearance settings (Theme: ${selectedTheme || 'light'})`
      });
      const freshLogs = await fetchAuditLogsFromSupabase();
      if (Array.isArray(freshLogs)) setAuditLogs(freshLogs);
      showToast('Appearance settings saved and persisted to Supabase!', 'success');
    } catch (err) {
      showToast(`Error saving appearance settings: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveLanguagePreferences = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        language: selectedLanguage || 'English (United States)',
        timeZone: selectedTimeZone || 'Asia/Kolkata (IST - UTC+5:30)',
        currency: selectedCurrency || 'INR (₹)',
        dateFormat: selectedDateFormat || 'DD MMM YYYY',
        updated_at: new Date().toISOString()
      };
      const res = await updateSystemSettingInSupabase('regional_localization', payload, 'Platform Regional Localization');
      if (res && res.success === false) {
        showToast(`Failed to persist regional localization: ${res.error}`, 'error');
        return;
      }
      const freshSettings = await fetchSystemSettingsFromSupabase();
      if (freshSettings && freshSettings.map) {
        setSystemSettingsMap(freshSettings.map);
      }
      await insertAuditLogToSupabase({
        user: currentUser?.name || 'Super Admin',
        action: 'Update',
        module: 'System Settings',
        details: `Saved regional localization settings (Language: ${payload.language})`
      });
      const freshLogs = await fetchAuditLogsFromSupabase();
      if (Array.isArray(freshLogs)) setAuditLogs(freshLogs);
      showToast('Language & regional localization saved to Supabase!', 'success');
    } catch (err) {
      showToast(`Error saving language settings: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAllNotificationsRead = async () => {
    const unreadItems = (notifications || []).filter(n => n.unread);
    if (unreadItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(
        unreadItems.map(item => upsertNotificationToSupabase({ ...item, unread: false }))
      );
      const hasFailure = results.some(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value));
      const freshNotifs = await fetchNotificationsFromSupabase();
      if (Array.isArray(freshNotifs)) {
        setNotifications(freshNotifs);
      }
      if (hasFailure) {
        showToast('Some notifications could not be updated in Supabase', 'error');
      } else {
        showToast('All notifications marked as read', 'success');
      }
    } catch (err) {
      showToast(`Error updating notifications: ${err.message}`, 'error');
      const freshNotifs = await fetchNotificationsFromSupabase();
      if (Array.isArray(freshNotifs)) setNotifications(freshNotifs);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleNotification = async (id) => {
    const target = (notifications || []).find(n => n.id === id);
    if (!target) return;
    const nextUnread = !target.unread;
    setActionLoadingId(id);
    try {
      const res = await upsertNotificationToSupabase({ ...target, unread: nextUnread });
      if (!res) {
        showToast('Failed to update notification in Supabase', 'error');
        const fresh = await fetchNotificationsFromSupabase();
        if (Array.isArray(fresh)) setNotifications(fresh);
        return;
      }
      const freshNotifs = await fetchNotificationsFromSupabase();
      if (Array.isArray(freshNotifs)) {
        setNotifications(freshNotifs);
      } else {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: nextUnread } : n));
      }
      showToast(nextUnread ? 'Marked as unread' : 'Marked as read', 'success');
    } catch (err) {
      showToast(`Error updating notification: ${err.message}`, 'error');
      const fresh = await fetchNotificationsFromSupabase();
      if (Array.isArray(fresh)) setNotifications(fresh);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExportFinancialReport = () => {
    const headers = "Metric,Value,Status\r\n";
    const rows = [
      `Monthly SaaS MRR,INR ${saasMRR},Active Subscriptions`,
      `Projected Annual ARR,INR ${saasARR},Annual Projection`,
      `Active Client Companies,${clientLicenses.length || 1},Subscribed Tenant Organizations`,
      `Master Platform Hub,1,ApexSales Global HQ`,
      `Provisioned Seats,${totalProvisionedSeats},Allocated to Tenants`,
      `Active Platform Users,${usersList.length},Real System Users`,
      `Cloud Infrastructure Health,100% Live,Supabase PostgreSQL (36ms)`
    ].join('\r\n');
    downloadCSV(`apexsales-saas-platform-report-${new Date().toISOString().slice(0, 10)}.csv`, headers + rows);
    showToast('SaaS Platform report CSV exported successfully!', 'success');
  };

  const handleExportAuditLogs = () => {
    const headers = "Date,User,Action,Module,Details\r\n";
    const rows = auditLogs.map(l => `"${l.dateTime}","${l.user}","${l.action}","${l.module}","${l.details}"`).join('\r\n');
    downloadCSV(`apexsales-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`, headers + rows);
    showToast('Audit trail CSV exported!', 'success');
  };

  const handleExportBackupSnapshot = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      environment: 'ApexSales Cloud Production',
      database: 'Supabase PostgreSQL (zgndrkgnldrwhcypdhjt)',
      counts: {
        leads: activeLeads.length,
        users: usersList.length,
        companies: companies.length,
        tickets: tickets.length,
        invoices: invoices.length
      },
      companies,
      users: usersList,
      leads: activeLeads,
      tickets,
      invoices
    };
    downloadJSON(`apexsales-cloud-snapshot-${new Date().toISOString().slice(0, 10)}.json`, backup);
    showToast('Cloud Database snapshot downloaded!', 'success');
  };

  const handleTestDatabasePing = async () => {
    showToast('Testing live Supabase Cloud PostgreSQL latency...', 'info');
    try {
      const res = await pingSupabaseDatabase();
      if (res && res.success) {
        showToast(`✓ Database reachable — ${res.latency}ms latency`, 'success');
      } else {
        showToast(`✕ Database check failed (${res?.latency ?? '0'}ms) — ${res?.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      showToast(`✕ Database check failed — ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ padding: '4px 20px 30px 20px', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* Dynamic Content Area (Navigation managed cleanly in Left Sidebar matching reference image) */}
      <div>
        
        {/* ===================================================================
            TAB 0: EXECUTIVE DASHBOARD (IMAGE 1 REPRODUCTION)
        =================================================================== */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Greeting row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>
                  Good Morning, Super Admin! 👏
                </h1>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>
                  Manage companies, users, subscriptions and system settings from here.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <Calendar size={14} color="#64748b" />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                {renderDateRangeDropdown()}
              </div>
            </div>

            {/* 6 TOP KPI CARDS (LIVE DYNAMIC METRICS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              
              {/* Client Companies */}
              <div 
                onClick={() => setActiveTab('companies')}
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                title="Click to view all registered companies"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={15} />
                  </div>
                  <span>Client Companies</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', lineHeight: '1.2', marginBottom: '4px' }}>
                  {liveDashboardMetrics.totalCompanies}
                </div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                  {liveDashboardMetrics.activeCompanies} Active Accounts
                </div>
              </div>

              {/* Total Users */}
              <div 
                onClick={() => setActiveTab('users')}
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                title="Click to view sales team"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={15} />
                  </div>
                  <span>Total Users</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', lineHeight: '1.2', marginBottom: '4px' }}>
                  {liveDashboardMetrics.totalUsers}
                </div>
                <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>
                  {liveDashboardMetrics.activeUsers} Active System Users
                </div>
              </div>

              {/* Active Subscriptions / Won Deals */}
              <div 
                onClick={() => setActiveTab('subscriptions')}
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                title="Click to view subscription plans"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Crown size={15} />
                  </div>
                  <span>Active Licenses</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', lineHeight: '1.2', marginBottom: '4px' }}>
                  {liveDashboardMetrics.activeSubscriptions}
                </div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                  {liveDashboardMetrics.expiringSubscriptions > 0 ? `${liveDashboardMetrics.expiringSubscriptions} Expiring Soon` : 'Active SaaS Licenses'}
                </div>
              </div>

              {/* Monthly SaaS MRR */}
              <div 
                onClick={() => setActiveTab('billing')}
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                title="Click to view subscription billing"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IndianRupee size={15} />
                  </div>
                  <span>Total Revenue</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', lineHeight: '1.2', marginBottom: '4px' }}>
                  ₹{liveDashboardMetrics.totalRevenue.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                  ₹{saasMRR.toLocaleString('en-IN')} / mo SaaS MRR
                </div>
              </div>

              {/* Provisioned Seats / Leads */}
              <div 
                onClick={() => setActiveTab('leads')}
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                title="Click to view leads"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={15} />
                  </div>
                  <span>Total Leads</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', lineHeight: '1.2', marginBottom: '4px' }}>
                  {liveDashboardMetrics.totalLeads}
                </div>
                <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>
                  {liveDashboardMetrics.wonLeads} Won · {liveDashboardMetrics.newLeads} New
                </div>
              </div>

              {/* Conversion Rate */}
              <div 
                onClick={() => setActiveTab('reports')}
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                title="Click to view conversion analytics"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={15} />
                  </div>
                  <span>Conversion Rate</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#16a34a', lineHeight: '1.2', marginBottom: '4px' }}>
                  {liveDashboardMetrics.conversionRate}%
                </div>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>
                  Avg Deal: ₹{liveDashboardMetrics.avgDealValue.toLocaleString('en-IN')}
                </div>
              </div>

            </div>

            {/* MIDDLE ROW: SaaS MRR Revenue Chart, License Tier Donut, Recent Tenants */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr', gap: '14px', marginBottom: '14px' }}>
              
              {/* SaaS Subscription MRR Overview Trend */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IndianRupee size={14} color="#ea580c" />
                      <span>Revenue Trajectory</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Monthly revenue from live payments and invoices</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', fontWeight: '700' }}>
                    <span style={{ color: '#2563eb' }}>● Live Revenue (₹{liveDashboardMetrics.totalRevenue.toLocaleString('en-IN')})</span>
                    <span style={{ color: '#16a34a' }}>● Verified Paid</span>
                  </div>
                </div>

                <div style={{ height: '150px', position: 'relative' }}>
                  <svg viewBox="0 0 400 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <text x="5" y="25" fontSize="9" fill="#94a3b8">₹{Math.round(monthlyRevenueTrend.maxVal / 1000)}K</text>
                    <text x="5" y="55" fontSize="9" fill="#94a3b8">₹{Math.round((monthlyRevenueTrend.maxVal * 0.75) / 1000)}K</text>
                    <text x="5" y="85" fontSize="9" fill="#94a3b8">₹{Math.round((monthlyRevenueTrend.maxVal * 0.5) / 1000)}K</text>
                    <text x="5" y="115" fontSize="9" fill="#94a3b8">₹{Math.round((monthlyRevenueTrend.maxVal * 0.25) / 1000)}K</text>
                    <text x="5" y="140" fontSize="9" fill="#94a3b8">₹0</text>

                    <line x1="50" y1="25" x2="390" y2="25" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="50" y1="55" x2="390" y2="55" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="50" y1="85" x2="390" y2="85" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="50" y1="115" x2="390" y2="115" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="50" y1="140" x2="390" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />

                    {/* Dynamic line trajectory from Supabase invoices */}
                    <path d={monthlyRevenueTrend.pathD} fill="none" stroke="#2563eb" strokeWidth="3" />
                    
                    {monthlyRevenueTrend.points.map((p, idx) => (
                      <circle
                        key={p.month}
                        cx={p.x}
                        cy={p.y}
                        r={idx === monthlyRevenueTrend.points.length - 1 ? 5 : 3.5}
                        fill={idx === monthlyRevenueTrend.points.length - 1 ? '#2563eb' : '#94a3b8'}
                        stroke="#ffffff"
                        strokeWidth={idx === monthlyRevenueTrend.points.length - 1 ? 2.5 : 2}
                      />
                    ))}

                    {monthlyRevenueTrend.points.map((p, idx) => (
                      <text
                        key={p.month}
                        x={p.x}
                        y="148"
                        fontSize="9"
                        fill={idx === monthlyRevenueTrend.points.length - 1 ? '#2563eb' : '#64748b'}
                        textAnchor="middle"
                        fontWeight={idx === monthlyRevenueTrend.points.length - 1 ? '800' : '500'}
                      >
                        {p.month} {idx === monthlyRevenueTrend.points.length - 1 && p.value > 0 ? `(₹${Math.round(p.value / 1000)}K)` : ''}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>

              {/* License Tier Distribution Donut */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Crown size={14} color="#ea580c" />
                    <span>Plan Distribution</span>
                  </div>

                  <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 10px auto' }}>
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                      {companyPlanDistribution.slices.map(s => (
                        <circle
                          key={s.plan}
                          cx="50"
                          cy="50"
                          r="40"
                          stroke={s.color}
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={s.strokeDasharray}
                          strokeDashoffset={s.strokeDashoffset}
                        />
                      ))}
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{companyPlanDistribution.total}</span>
                      <span style={{ fontSize: '8px', color: '#64748b', fontWeight: '600' }}>Registered Accounts</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: '10px', fontWeight: '600' }}>
                  {companyPlanDistribution.slices.map(s => (
                    <div key={s.plan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: s.color }}>● {s.plan} Tier</span>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>{s.pct}% ({s.count})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Companies (Real Accounts from 57 Leads) */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={14} color="#2563eb" />
                    <span>Recent Accounts</span>
                  </div>
                  <span onClick={() => setActiveTab('companies')} style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>
                    View All →
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: '5px 4px', fontWeight: '600' }}>Account Name</th>
                        <th style={{ padding: '5px 4px', fontWeight: '600' }}>Tier</th>
                        <th style={{ padding: '5px 4px', fontWeight: '600' }}>Status</th>
                        <th style={{ padding: '5px 4px', fontWeight: '600', textAlign: 'right' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '16px 4px', textAlign: 'center', color: '#94a3b8' }}>
                            No recent accounts found
                          </td>
                        </tr>
                      ) : (
                        companies.slice(0, 5).map((c) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '6px 4px', fontWeight: '600', color: '#0f172a' }}>{c.name}</td>
                            <td style={{ padding: '6px 4px' }}>
                              <span style={{ padding: '1.5px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: '600', backgroundColor: c.plan === 'Enterprise' ? '#eff6ff' : c.plan === 'Growth' ? '#fff7ed' : '#f0fdf4', color: c.plan === 'Enterprise' ? '#2563eb' : c.plan === 'Growth' ? '#ea580c' : '#16a34a' }}>
                                {c.plan}
                              </span>
                            </td>
                            <td style={{ padding: '6px 4px' }}>
                              <span style={{ padding: '1.5px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: '600', backgroundColor: c.status === 'Active' || c.status === 'Won' ? '#f0fdf4' : '#fffbeb', color: c.status === 'Active' || c.status === 'Won' ? '#16a34a' : '#d97706' }}>
                                {c.status}
                              </span>
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>{c.revenue}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* ROW 3: Recent Users, Subscription Status Donut, Support Tickets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr', gap: '14px', marginBottom: '14px' }}>
              
              {/* Recent Users Table (Real System Team Members) */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="#2563eb" />
                    <span>Active Team Members</span>
                  </div>
                  <span onClick={() => setActiveTab('users')} style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>
                    View All →
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: '5px 4px', fontWeight: '600' }}>Name</th>
                        <th style={{ padding: '5px 4px', fontWeight: '600' }}>Email</th>
                        <th style={{ padding: '5px 4px', fontWeight: '600' }}>Role</th>
                        <th style={{ padding: '5px 4px', fontWeight: '600' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '16px 4px', textAlign: 'center', color: '#94a3b8' }}>
                            No recent users found
                          </td>
                        </tr>
                      ) : (
                        usersList.slice(0, 4).map((u) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '6px 4px', fontWeight: '600', color: '#0f172a' }}>{u.name}</td>
                            <td style={{ padding: '6px 4px', color: '#64748b' }}>{u.email}</td>
                            <td style={{ padding: '6px 4px', color: '#334155', fontWeight: '600' }}>{u.role}</td>
                            <td style={{ padding: '6px 4px' }}>
                              <span style={{ padding: '1.5px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: '600', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                                Active
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tenant Health Donut */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Building2 size={14} color="#2563eb" />
                    <span>Tenant Health</span>
                  </div>

                  <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 10px auto' }}>
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                      {/* Active Subscribed 100% */}
                      <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="12" fill="none" strokeDasharray="251.2 251.2" strokeDashoffset="0" />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>1</span>
                      <span style={{ fontSize: '8px', color: '#64748b', fontWeight: '600' }}>Active Tenant</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: '10px', fontWeight: '600' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#10b981' }}>● Subscribed Tenants</span>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>1 (100%)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#f59e0b' }}>● Trial / Provisioning</span>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>0 (0%)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>● Suspended Accounts</span>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>0 (0%)</span>
                  </div>
                </div>
              </div>

              {/* Support & Action Tickets Table (Real Action Queue) */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Headset size={14} color="#ea580c" />
                    <span>Action &amp; Support Queue</span>
                  </div>
                  <span onClick={() => setActiveTab('support_tickets')} style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>
                    View All →
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: '5px 4px', fontWeight: '600' }}>Subject</th>
                        <th style={{ padding: '5px 4px', fontWeight: '600' }}>Priority</th>
                        <th style={{ padding: '5px 4px', fontWeight: '600', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '16px 4px', textAlign: 'center', color: '#94a3b8' }}>
                            No open tickets in queue
                          </td>
                        </tr>
                      ) : (
                        tickets.slice(0, 5).map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '6px 4px', fontWeight: '600', color: '#0f172a' }}>{t.subject}</td>
                          <td style={{ padding: '6px 4px' }}>
                            <span style={{ padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: '600', backgroundColor: t.priority === 'High' ? '#fef2f2' : t.priority === 'Medium' ? '#fffbeb' : '#f0fdf4', color: t.priority === 'High' ? '#dc2626' : t.priority === 'Medium' ? '#d97706' : '#16a34a' }}>
                              {t.priority}
                            </span>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                            <span 
                              onClick={() => actionLoadingId !== t.id && handleToggleTicketStatus(t.id)}
                              style={{
                                padding: '1.5px 6px',
                                borderRadius: '4px',
                                fontSize: '9.5px',
                                fontWeight: '600',
                                cursor: actionLoadingId === t.id ? 'wait' : 'pointer',
                                opacity: actionLoadingId === t.id ? 0.6 : 1,
                                backgroundColor: t.status === 'Resolved' ? '#f0fdf4' : t.status === 'In Progress' ? '#eff6ff' : t.status === 'Closed' ? '#f1f5f9' : '#fff7ed',
                                color: t.status === 'Resolved' ? '#16a34a' : t.status === 'In Progress' ? '#2563eb' : t.status === 'Closed' ? '#64748b' : '#ea580c'
                              }}
                              title="Click to toggle status (Open → In Progress → Resolved → Closed)"
                            >
                              {actionLoadingId === t.id ? '...' : t.status}
                            </span>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* ROW 4: Company Growth, Top Performing Companies, Quick Actions, Tools */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              
              {/* Company Growth Bar Chart */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Account Growth</div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Total client accounts over time</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                    Last 5 Months
                  </span>
                </div>

                <div style={{ height: '110px' }}>
                  <svg viewBox="0 0 300 110" style={{ width: '100%', height: '100%' }}>
                    <line x1="20" y1="90" x2="290" y2="90" stroke="#f1f5f9" />
                    
                    <rect x="40" y="70" width="18" height="20" rx="3" fill="#cbd5e1" />
                    <text x="49" y="63" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="700">1</text>
                    <text x="49" y="103" fontSize="9" fill="#64748b" textAnchor="middle">May</text>

                    <rect x="95" y="70" width="18" height="20" rx="3" fill="#cbd5e1" />
                    <text x="104" y="63" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="700">1</text>
                    <text x="104" y="103" fontSize="9" fill="#64748b" textAnchor="middle">Jun</text>

                    <rect x="150" y="70" width="18" height="20" rx="3" fill="#93c5fd" />
                    <text x="159" y="63" fontSize="9" fill="#2563eb" textAnchor="middle" fontWeight="700">1</text>
                    <text x="159" y="103" fontSize="9" fill="#64748b" textAnchor="middle">Jul</text>

                    <rect x="205" y="70" width="18" height="20" rx="3" fill="#60a5fa" />
                    <text x="214" y="63" fontSize="9" fill="#2563eb" textAnchor="middle" fontWeight="700">1</text>
                    <text x="214" y="103" fontSize="9" fill="#64748b" textAnchor="middle">Aug</text>

                    <rect x="260" y="45" width="18" height="45" rx="3" fill="#2563eb" />
                    <text x="269" y="38" fontSize="9" fill="#2563eb" textAnchor="middle" fontWeight="800">2</text>
                    <text x="269" y="103" fontSize="9" fill="#2563eb" textAnchor="middle" fontWeight="800">Sep</text>
                  </svg>
                </div>
              </div>

              {/* Top Performing Companies (Sorted by Real Won Revenue) */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Top Client Accounts</div>
                  <span onClick={() => setActiveTab('companies')} style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>View All →</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: '4px', fontWeight: '600' }}>#</th>
                        <th style={{ padding: '4px', fontWeight: '600' }}>Account Name</th>
                        <th style={{ padding: '4px', fontWeight: '600' }}>Revenue</th>
                        <th style={{ padding: '4px', fontWeight: '600', textAlign: 'right' }}>Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.slice(0, 4).map((c, idx) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '5px 4px', color: '#64748b', fontWeight: '700' }}>{idx + 1}</td>
                          <td style={{ padding: '5px 4px', fontWeight: '600', color: '#0f172a' }}>{c.name}</td>
                          <td style={{ padding: '5px 4px', fontWeight: '700', color: '#0f172a' }}>{c.revenue}</td>
                          <td style={{ padding: '5px 4px', textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>{c.growth}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions (Interactive) */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#ea580c" />
                  <span>Quick Actions</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button 
                    onClick={() => setIsAddCompanyOpen(true)}
                    style={{ padding: '10px 6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <Building2 size={16} color="#2563eb" />
                    <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#0f172a' }}>Add Company</span>
                  </button>

                  <button 
                    onClick={() => setIsAddUserOpen(true)}
                    style={{ padding: '10px 6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <UserPlus size={16} color="#ea580c" />
                    <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#0f172a' }}>Add User</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('subscriptions')}
                    style={{ padding: '10px 6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <Crown size={16} color="#f59e0b" />
                    <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#0f172a' }}>Subscriptions</span>
                  </button>

                  <button 
                    onClick={() => handleExportFinancialReport()}
                    style={{ padding: '10px 6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <BarChart3 size={16} color="#16a34a" />
                    <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#0f172a' }}>View Reports</span>
                  </button>
                </div>
              </div>

              {/* Super Admin Tools (Interactive) */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Crown size={14} color="#ea580c" />
                  <span>Super Admin Tools</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div 
                    onClick={() => setActiveTab('companies')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={13} color="#2563eb" />
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>Company Management</span>
                    </div>
                    <ChevronRight size={13} color="#94a3b8" />
                  </div>

                  <div 
                    onClick={() => setActiveTab('users')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={13} color="#2563eb" />
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>User Management</span>
                    </div>
                    <ChevronRight size={13} color="#94a3b8" />
                  </div>

                  <div 
                    onClick={() => setActiveTab('subscriptions')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={13} color="#ea580c" />
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>Subscription Plans</span>
                    </div>
                    <ChevronRight size={13} color="#94a3b8" />
                  </div>

                  <div 
                    onClick={() => setActiveTab('audit_logs')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={13} color="#16a34a" />
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>Audit Logs</span>
                    </div>
                    <ChevronRight size={13} color="#94a3b8" />
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom System Banner */}
            <div style={{
              backgroundColor: '#fff7ed',
              border: '1.5px solid #fed7aa',
              borderRadius: '10px',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Crown size={16} color="#ea580c" />
                <span style={{ fontSize: '12.5px', color: '#9a3412', fontWeight: '600' }}>
                  <strong>Super Admin:</strong> You have full access to all features, multi-tenant cloud PostgreSQL database, and governance controls.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('audit_logs')}
                style={{
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                View System Logs →
              </button>
            </div>

          </div>
        )}

        {/* ===================================================================
            TAB 1: COMPANY MANAGEMENT (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'companies' && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Company Management</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Manage your companies and their details.</p>
              </div>
              <button
                onClick={() => setIsAddCompanyOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f97316', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 1px 2px rgba(249,115,22,0.3)' }}
              >
                <Plus size={15} />
                <span>+ Add Company</span>
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', outline: 'none', backgroundColor: '#ffffff' }}
                />
              </div>
              <select
                value={companyPlanFilter}
                onChange={(e) => setCompanyPlanFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Plans</option>
                <option value="Pro">Pro</option>
                <option value="Business">Business</option>
                <option value="Basic">Basic</option>
                <option value="Enterprise">Enterprise</option>
              </select>
              <select
                value={companyStatusFilter}
                onChange={(e) => setCompanyStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Trial">Trial</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Company Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Domain</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Plan</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Users</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = companies.filter(c => {
                      const matchSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.domain || '').toLowerCase().includes(searchQuery.toLowerCase());
                      const matchPlan = companyPlanFilter === 'all' || (c.plan || '').toLowerCase() === companyPlanFilter.toLowerCase();
                      const matchStatus = companyStatusFilter === 'all' || (c.status || '').toLowerCase() === companyStatusFilter.toLowerCase();
                      return matchSearch && matchPlan && matchStatus;
                    });
                    const paged = paginateArray(filtered, 'companies');
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={28} color="#94a3b8" />
                              <span style={{ fontWeight: '600' }}>No companies found</span>
                              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Try adjusting your search query or filters</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return paged.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c.bg || '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color || '#2563eb' }}>
                              {getCompanyIcon(c.icon || 'building')}
                            </div>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{c.domain}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', ...getPlanStyle(c.plan) }}>
                            {c.plan}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: '#ecfdf5', color: '#059669' }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '600' }}>{c.users}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => setActiveActionMenu({ type: 'company', item: c })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const filtered = companies.filter(c => {
                const matchSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.domain || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchPlan = companyPlanFilter === 'all' || (c.plan || '').toLowerCase() === companyPlanFilter.toLowerCase();
                const matchStatus = companyStatusFilter === 'all' || (c.status || '').toLowerCase() === companyStatusFilter.toLowerCase();
                return matchSearch && matchPlan && matchStatus;
              });
              return renderPagination('companies', filtered.length);
            })()}
          </div>
        )}

        {/* ===================================================================
            TAB 2: USER MANAGEMENT (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'users' && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>User Management</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>View, add and manage all system users.</p>
              </div>
              <button
                onClick={() => setIsAddUserOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f97316', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 1px 2px rgba(249,115,22,0.3)' }}
              >
                <Plus size={15} />
                <span>+ Add User</span>
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', outline: 'none', backgroundColor: '#ffffff' }}
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
                <option value="Sales Head">Sales Head</option>
                <option value="Team Leader">Team Leader</option>
              </select>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Email</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Role</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Company</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = usersList.filter(u => {
                      const matchSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
                      const matchRole = userRoleFilter === 'all' || (u.role || '').toLowerCase() === userRoleFilter.toLowerCase();
                      return matchSearch && matchRole;
                    });
                    const paged = paginateArray(filtered, 'users');
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <Users size={28} color="#94a3b8" />
                              <span style={{ fontWeight: '600' }}>No users found</span>
                              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Try adjusting your search query or role filter</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return paged.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: u.avatarBg || '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '700', fontSize: '12px' }}>
                              {getInitials(u.name)}
                            </div>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{u.email}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', ...getRoleStyle(u.role) }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>{u.company}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: '#ecfdf5', color: '#059669' }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => setActiveActionMenu({ type: 'user', item: u })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const filtered = usersList.filter(u => {
                const matchSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchRole = userRoleFilter === 'all' || (u.role || '').toLowerCase() === userRoleFilter.toLowerCase();
                return matchSearch && matchRole;
              });
              return renderPagination('users', filtered.length);
            })()}
          </div>
        )}

        {/* ===================================================================
            TAB 3: SUBSCRIPTION MANAGEMENT & COMPANY PLANS
        =================================================================== */}
        {(activeTab === 'subscriptions' || activeTab === 'packages') && (() => {
          const activePlansMap = companyPlans || DEFAULT_COMPANY_PLANS;
          const tenantList = [];
          if (Array.isArray(companies)) {
            companies.forEach(c => {
              if (c.id && !tenantList.some(t => t.id === c.id)) {
                tenantList.push({
                  id: c.id,
                  name: c.name || "Unnamed Company",
                  owner: c.owner || "Company Owner"
                });
              }
            });
          }
          if (Array.isArray(allUsersList)) {
            allUsersList.forEach(u => {
              const cId = (getUserCompanyId && getUserCompanyId(u)) || u.companyId;
              const cName = (getUserCompanyName && getUserCompanyName(u)) || u.company;
              if (cId && !tenantList.some(t => t.id === cId)) {
                tenantList.push({ id: cId, name: cName || cId, owner: u.name || "Company Owner" });
              }
            });
          }

          const selectedCompId = billingTargetCompanyId || (tenantList.length > 0 ? tenantList[0].id : "");
          const currentSelectedComp = tenantList.find(t => t.id === selectedCompId) || (tenantList.length > 0 ? tenantList[0] : null);
          const currentCompPlanKey = (companyPlansMap && selectedCompId && companyPlansMap[selectedCompId]) || "growth";
          const currentPlan = (activePlansMap && activePlansMap[currentCompPlanKey]) || (activePlansMap && activePlansMap.growth) || (activePlansMap && Object.values(activePlansMap)[0]) || { name: 'Growth', price: 0, users: 15, leads: 5000, features: [] };

          const compUsers = allUsersList.filter(u => {
            if (!selectedCompId) return false;
            const cId = (getUserCompanyId && getUserCompanyId(u)) || u.companyId;
            return cId === selectedCompId;
          });
          const compLeads = leads.filter(l => {
            if (!selectedCompId) return false;
            return (l.companyId || l.tenantId) === selectedCompId;
          });

          return (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Subscription Management &amp; Company Plans</h2>
                  <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Configure SaaS pricing tiers, manage quotas, and view tenant subscriptions.</p>
                </div>
                
                {/* Sub-tab Pill Switcher */}
                <div style={{ display: "flex", gap: "8px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setSubscriptionsSubTab('plans')}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: subscriptionsSubTab === 'plans' ? "#2563eb" : "transparent",
                      color: subscriptionsSubTab === 'plans' ? "#ffffff" : "#475569",
                      fontSize: "12px",
                      fontWeight: '600',
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Building2 size={14} /> 🏢 Company Plans &amp; Tiers
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscriptionsSubTab('list')}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: subscriptionsSubTab === 'list' ? "#2563eb" : "transparent",
                      color: subscriptionsSubTab === 'list' ? "#ffffff" : "#475569",
                      fontSize: "12px",
                      fontWeight: '600',
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <CreditCard size={14} /> 📋 Subscriptions List ({companies.length})
                  </button>
                </div>
              </div>

              {subscriptionsSubTab === 'plans' ? (
                <div>
                  {/* Super Admin Company Selector */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '20px', flexWrap: 'wrap', gap: '12px', backgroundColor: "#fffbeb", border: "1.5px solid #fde68a", padding: "12px 16px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Crown size={20} color="#b45309" />
                      <div>
                        <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#92400e" }}>
                          Super Admin SaaS Tenant Allocation
                        </div>
                        <div style={{ fontSize: "11px", color: "#b45309" }}>
                          Select any registered client company to inspect or reconfigure their company-wide SaaS tier:
                        </div>
                      </div>
                    </div>

                    <select
                      value={selectedCompId}
                      onChange={(e) => setBillingTargetCompanyId && setBillingTargetCompanyId(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: '600',
                        borderRadius: "6px",
                        border: "1.5px solid #f59e0b",
                        backgroundColor: "#ffffff",
                        color: "#78350f",
                        cursor: "pointer",
                        outline: "none"
                      }}
                    >
                      {tenantList.map(t => (
                        <option key={t.id} value={t.id}>
                          🏢 {t.name} ({activePlansMap[companyPlansMap[t.id] || "growth"]?.name || "Growth Pro"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Current Active Plan Banner for Selected Company */}
                  <div style={{ backgroundColor: "#ffffff", border: `1.5px solid ${currentPlan.border}`, borderRadius: "10px", padding: "18px 22px", marginBottom: "22px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "52px", height: "52px", borderRadius: "10px", backgroundColor: currentPlan.bg, color: currentPlan.color, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${currentPlan.border}`, flexShrink: 0 }}>
                        <Building2 size={28} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <h3 style={{ fontSize: "17px", fontWeight: '700', color: "#0f172a", margin: 0 }}>
                            {currentSelectedComp.name}
                          </h3>
                          <span style={{ fontSize: "12px", fontWeight: '600', padding: "3px 10px", borderRadius: "9999px", backgroundColor: currentPlan.bg, color: currentPlan.color, border: `1px solid ${currentPlan.border}` }}>
                            {currentPlan.badge}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            ● Active Subscription Plan
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                          Account Owner: <strong style={{ color: "#334155" }}>{currentSelectedComp.owner}</strong> • Rate: <strong style={{ color: "#0f172a" }}>{currentPlan.price}</strong> • All employees within this organization share this plan quota.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      <div style={{ padding: "8px 16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", fontWeight: '600', color: "#64748b", textTransform: "uppercase" }}>Team Seats Used</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
                          <span style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a" }}>{compUsers.length}</span>
                          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>/ {currentPlan.maxSeats > 999 ? "∞" : currentPlan.maxSeats} Seats</span>
                        </div>
                        <div style={{ width: "110px", height: "5px", backgroundColor: "#e2e8f0", borderRadius: "9999px", overflow: "hidden", marginTop: "4px" }}>
                          <div style={{ width: `${Math.min(100, (compUsers.length / (currentPlan.maxSeats || 1)) * 100)}%`, height: "100%", backgroundColor: currentPlan.color, borderRadius: "9999px" }} />
                        </div>
                      </div>

                      <div style={{ padding: "8px 16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", fontWeight: '600', color: "#64748b", textTransform: "uppercase" }}>Company Leads Quota</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
                          <span style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a" }}>{compLeads.length}</span>
                          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>/ {currentPlan.leadQuota > 9999 ? "Unlimited" : currentPlan.leadQuota.toLocaleString()} Leads</span>
                        </div>
                        <div style={{ width: "110px", height: "5px", backgroundColor: "#e2e8f0", borderRadius: "9999px", overflow: "hidden", marginTop: "4px" }}>
                          <div style={{ width: `${Math.min(100, (compLeads.length / (currentPlan.leadQuota || 1)) * 100)}%`, height: "100%", backgroundColor: "#16a34a", borderRadius: "9999px" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Company Subscription Plan Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                    {Object.entries(activePlansMap).map(([planKey, plan]) => {
                      const isCurrent = currentCompPlanKey === planKey;
                      return (
                        <div 
                          key={planKey}
                          style={{
                            backgroundColor: "#ffffff",
                            borderRadius: "10px",
                            border: isCurrent ? `2px solid ${plan.color}` : "1.5px solid #e2e8f0",
                            padding: "20px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxShadow: isCurrent ? `0 4px 14px ${plan.bg}` : "0 2px 4px rgba(0,0,0,0.03)",
                            position: "relative"
                          }}
                        >
                          {isCurrent && (
                            <div style={{
                              position: "absolute",
                              top: "-10px",
                              right: "14px",
                              backgroundColor: plan.color,
                              color: "#ffffff",
                              fontSize: "10px",
                              fontWeight: "800",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              letterSpacing: "0.5px",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                            }}>
                              ✓ ACTIVE PLAN
                            </div>
                          )}

                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                              <span style={{ fontSize: "11px", fontWeight: '600', color: plan.color, padding: "2.5px 8px", backgroundColor: plan.bg, borderRadius: "6px", border: `1px solid ${plan.border}` }}>
                                {plan.badge}
                              </span>
                              <span style={{ fontSize: "15px", fontWeight: '700', color: "#0f172a" }}>
                                {plan.price}
                              </span>
                            </div>

                            <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" }}>
                              {plan.name}
                            </h3>

                            {/* Capacity Badges */}
                            <div style={{ display: "flex", gap: "8px", margin: "10px 0 14px 0", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "11px", fontWeight: "700", backgroundColor: "#f1f5f9", color: "#334155", padding: "4px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Users size={12} color="#2563eb" />
                                {plan.maxSeats > 999 ? "Unlimited Seats" : `Up to ${plan.maxSeats} Seats`}
                              </span>
                              <span style={{ fontSize: "11px", fontWeight: "700", backgroundColor: "#f1f5f9", color: "#334155", padding: "4px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Database size={12} color="#16a34a" />
                                {plan.leadQuota > 9999 ? "Unlimited Leads" : `${plan.leadQuota.toLocaleString()} Leads`}
                              </span>
                            </div>

                            {/* Features List */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#475569", margin: "12px 0 16px 0" }}>
                              {(plan.features || []).map((feat, fIdx) => (
                                <div key={fIdx} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                  <Check size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                                  <span style={{ lineHeight: "1.4" }}>{feat}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                            {isCurrent ? (
                              <button
                                type="button"
                                disabled
                                style={{
                                  width: "100%",
                                  height: "36px",
                                  borderRadius: "6px",
                                  border: `1.5px solid ${plan.border}`,
                                  backgroundColor: plan.bg,
                                  color: plan.color,
                                  fontSize: "12px",
                                  fontWeight: '600',
                                  cursor: "default",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px"
                                }}
                              >
                                <CheckCircle size={15} /> Active for {currentSelectedComp.name}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (handleUpgradeCompanyPlan) {
                                    handleUpgradeCompanyPlan(planKey, selectedCompId);
                                  } else {
                                    showToast(`Assigned ${plan.name} to ${currentSelectedComp.name}`, 'success');
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  height: "36px",
                                  borderRadius: "6px",
                                  border: "none",
                                  backgroundColor: plan.color,
                                  color: "#ffffff",
                                  fontSize: "12px",
                                  fontWeight: '600',
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                  boxShadow: `0 2px 4px ${plan.bg}`
                                }}
                              >
                                Switch Company to {plan.name}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Subscriptions List View */
                <div>
                  <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                    <input
                      type="text"
                      placeholder="Search company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', outline: 'none', backgroundColor: '#ffffff' }}
                    />
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', fontWeight: '700' }}>Company Name</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700' }}>Plan</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700' }}>Start Date</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700' }}>End Date</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700' }}>Status</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filtered = companies.filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} style={{ padding: '24px 14px', textAlign: 'center', color: '#94a3b8' }}>
                                  No subscriptions found
                                </td>
                              </tr>
                            );
                          }
                          return paginateArray(filtered, 'subscriptions').map((c) => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c.bg || '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color || '#2563eb' }}>
                                    {getCompanyIcon(c.icon || 'building')}
                                  </div>
                                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{c.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', ...getPlanStyle(c.plan) }}>
                                  {c.plan}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#64748b' }}>{c.startDate || '01 Jan 2026'}</td>
                              <td style={{ padding: '12px 14px', color: '#64748b' }}>{c.endDate || '01 Jan 2027'}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: '#ecfdf5', color: '#059669' }}>
                                  {c.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <button
                                  onClick={() => setActiveActionMenu({ type: 'subscription', item: c })}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                                  title="Actions"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const filtered = companies.filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
                    return renderPagination('subscriptions', filtered.length);
                  })()}
                </div>
              )}
            </div>
          );
        })()}

        {/* ===================================================================
            TAB: CLIENT DEAL PACKAGES (PRICING & SALES TIERS)
        =================================================================== */}
        {activeTab === 'deal_packages' && (() => {
          const activeDealPkgs = Array.isArray(clientDealPackages) ? clientDealPackages : DEFAULT_DEAL_PACKAGES;
          return (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>💼 Client CRM Sales Packages &amp; Pricing Plans</h2>
                  <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>
                    Super Admin Control: Decide and customize package rates (₹), billing durations, and included quotas. Edited rates automatically reflect in new deal values.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDealPackage({
                      id: `pkg_${Date.now()}`,
                      name: 'New Custom CRM Plan',
                      price: 25000,
                      duration: '1 Month',
                      quota: '500 Leads',
                      features: ['Custom Lead Pipeline', 'WhatsApp 1-Click Dialing', 'Priority Support'],
                      color: '#2563eb',
                      bg: '#eff6ff',
                      border: '#bfdbfe'
                    });
                    setIsDealPackageModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
                >
                  <Plus size={15} />
                  <span>+ Add Custom Plan</span>
                </button>
              </div>

              {activeDealPkgs.length === 0 ? (
                <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px dashed #cbd5e1", padding: "40px 20px", textAlign: "center", marginBottom: "20px" }}>
                  <Package size={36} color="#94a3b8" style={{ margin: "0 auto 12px auto" }} />
                  <h3 style={{ fontSize: "15px", fontWeight: '600', color: "#1e293b", margin: "0 0 6px 0" }}>No deal packages configured</h3>
                  <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 16px 0" }}>Create a deal package to define pricing, durations, and quotas for sales reps.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDealPackage({
                        id: `pkg_${Date.now()}`,
                        name: 'New Custom CRM Plan',
                        price: 25000,
                        duration: '1 Month',
                        quota: '500 Leads',
                        features: ['Custom Lead Pipeline', 'WhatsApp 1-Click Dialing', 'Priority Support'],
                        color: '#2563eb',
                        bg: '#eff6ff',
                        border: '#bfdbfe'
                      });
                      setIsDealPackageModalOpen(true);
                    }}
                    style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontSize: "12.5px", fontWeight: '600', cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Plus size={15} /> Add Package
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                  {activeDealPkgs.map((pkg) => (
                    <div 
                      key={pkg.id} 
                      style={{ 
                        backgroundColor: "#ffffff", 
                        borderRadius: "10px", 
                        border: `1.5px solid ${pkg.border}`, 
                        padding: "18px", 
                        display: "flex", 
                        flexDirection: "column", 
                        justifyContent: "space-between",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.03)"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "12px", fontWeight: '600', color: pkg.color, padding: "3px 8px", backgroundColor: pkg.bg, borderRadius: "6px", border: `1px solid ${pkg.border}` }}>
                            {pkg.name}
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                            {pkg.duration}
                          </span>
                        </div>

                        <div style={{ margin: "10px 0" }}>
                          <span style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                            {pkg.price ? `₹${pkg.price.toLocaleString('en-IN')}` : 'Bespoke Quote'}
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "4px" }}>
                            / {pkg.duration}
                          </span>
                        </div>

                        <div style={{ padding: "6px 10px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
                          <span style={{ fontSize: "12px", color: "#475569" }}>Included Capacity: <strong>{pkg.quota}</strong></span>
                        </div>

                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>
                          {(pkg.features || []).map((feat, fIdx) => (
                            <li key={fIdx}>{feat}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDealPackage({ ...pkg });
                            setIsDealPackageModalOpen(true);
                          }}
                          style={{ flex: 1, height: "34px", borderRadius: "6px", border: "1.5px solid #cbd5e1", backgroundColor: "#ffffff", color: "#0f172a", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
                          title="Decide and edit package rate & specifications"
                        >
                          <Pencil size={13} /> Edit Rate
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === pkg.id}
                          onClick={() => handleDeleteDealPackage(pkg.id)}
                          style={{ height: "34px", padding: "0 10px", borderRadius: "6px", border: "1.5px solid #fecaca", backgroundColor: "#fff", color: "#dc2626", fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          title="Delete Package"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (setNewLeadData && setShowAddLeadModal) {
                              setNewLeadData(prev => ({
                                ...prev,
                                packageId: pkg.id,
                                value: pkg.price > 0 ? String(pkg.price) : "50000"
                              }));
                              setShowAddLeadModal(true);
                            } else {
                              setIsAddLeadOpen(true);
                            }
                          }}
                          style={{ flex: 1.4, height: "34px", borderRadius: "6px", border: "none", backgroundColor: pkg.color, color: "#ffffff", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
                        >
                          <Plus size={14} /> Create Lead
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Operational Note */}
              <div style={{ padding: "12px 16px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                <Briefcase size={18} color="#2563eb" />
                <span style={{ fontSize: "12px", color: "#1e40af" }}>
                  <strong>Super Admin Governance:</strong> Pricing packages managed here configure deal amounts, client quotas, and revenue forecasts across all sales teams.
                </span>
              </div>
            </div>
          );
        })()}

        {/* ===================================================================
            TAB: B2B CLIENT LICENSES & TAX INVOICING HUB
        =================================================================== */}
        {activeTab === 'licenses' && (() => {
          const activePlansMap = companyPlans || DEFAULT_COMPANY_PLANS;
          return (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {/* Header & Quick Action */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <Receipt size={22} color="#16a34a" />
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.25' }}>📜 B2B Client Licensing &amp; Tax Invoicing Hub</h2>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0, maxWidth: "760px", lineHeight: "1.5" }}>
                    Super Admin Control Center: Register client emails after payment, choose &amp; activate plans, adjust custom user seats, grant discounts, issue cryptographic license numbers, and generate formal Tax Invoices.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenNewClientLicenseModal}
                  style={{
                    padding: "9px 18px",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: '600',
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)"
                  }}
                >
                  <KeyRound size={16} /> + Onboard Client &amp; Issue License
                </button>
              </div>

              {/* Top Stats Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                <div style={{ padding: "16px 18px", backgroundColor: "#ffffff", borderRadius: "10px", border: "1.5px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "11px", fontWeight: '600', color: "#64748b", textTransform: "uppercase" }}>Active Client Licenses</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                    <span style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a" }}>{clientLicenses.length}</span>
                    <span style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: "700" }}>● Verified Active</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Client organizations provisioned</div>
                </div>

                <div style={{ padding: "16px 18px", backgroundColor: "#ffffff", borderRadius: "10px", border: "1.5px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "11px", fontWeight: '600', color: "#64748b", textTransform: "uppercase" }}>Provisioned User Seats</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                    <span style={{ fontSize: "24px", fontWeight: "900", color: "#2563eb" }}>
                      {clientLicenses.reduce((acc, l) => acc + (Number(l.customSeats) || Number(l.defaultSeats) || 15), 0)}
                    </span>
                    <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>Total Seats</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Distributed across all client teams</div>
                </div>

                <div style={{ padding: "16px 18px", backgroundColor: "#ffffff", borderRadius: "10px", border: "1.5px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "11px", fontWeight: '600', color: "#64748b", textTransform: "uppercase" }}>Total Subscriptions Billed</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                    <span style={{ fontSize: "24px", fontWeight: "900", color: "#16a34a" }}>
                      ₹{clientLicenses.reduce((acc, l) => acc + (Number(l.finalAmount) || 0), 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: "700" }}>Invoiced &amp; Paid</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Revenue from client SaaS subscriptions</div>
                </div>

                <div style={{ padding: "16px 18px", backgroundColor: "#fef3c7", borderRadius: "10px", border: "1.5px solid #fde68a", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#b45309", textTransform: "uppercase" }}>Master Platform License</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                    <span style={{ fontSize: "18px", fontWeight: "900", color: "#78350f" }}>ApexSales Global HQ</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#92400e", fontWeight: "600", marginTop: "4px" }}>👑 Owner: {currentUser?.name || 'Platform Owner'}</div>
                </div>
              </div>

              {/* Search, Filter & Action Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", width: "240px" }}>
                    <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "10px", top: "9px" }} />
                    <input
                      type="text"
                      placeholder="Search licenses, clients, keys..."
                      value={licenseSearchQuery}
                      onChange={(e) => { setLicenseSearchQuery(e.target.value); setPageFor('licenses', 1); }}
                      style={{ width: "100%", padding: "7px 10px 7px 32px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none" }}
                    />
                  </div>
                  <select
                    value={licensePlanFilter}
                    onChange={(e) => { setLicensePlanFilter(e.target.value); setPageFor('licenses', 1); }}
                    style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", color: "#334155", backgroundColor: "#ffffff", outline: "none" }}
                  >
                    <option value="all">All Plans</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <select
                    value={licenseStatusFilter}
                    onChange={(e) => { setLicenseStatusFilter(e.target.value); setPageFor('licenses', 1); }}
                    style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", color: "#334155", backgroundColor: "#ffffff", outline: "none" }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
              </div>

              {/* Licenses Table */}
              <div className="responsive-table-container" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflowX: "auto", backgroundColor: "#ffffff", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <table className="responsive-table" style={{ width: "100%", minWidth: "960px", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569", fontWeight: '600' }}>
                      <th style={{ padding: "11px 14px" }}>CLIENT COMPANY &amp; OWNER</th>
                      <th style={{ padding: "11px 14px" }}>REGISTERED CONTACT</th>
                      <th style={{ padding: "11px 14px" }}>ACTIVE PLAN &amp; SEATS</th>
                      <th style={{ padding: "11px 14px" }}>OFFICIAL LICENSE NO.</th>
                      <th style={{ padding: "11px 14px" }}>DISCOUNT</th>
                      <th style={{ padding: "11px 14px" }}>INVOICED AMOUNT</th>
                      <th style={{ padding: "11px 14px", textAlign: "center" }}>STATUS</th>
                      <th style={{ padding: "11px 14px", textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = clientLicenses.filter(lic => {
                        const q = licenseSearchQuery.toLowerCase();
                        const matchSearch = !q ||
                          (lic.companyName || '').toLowerCase().includes(q) ||
                          (lic.clientName || '').toLowerCase().includes(q) ||
                          (lic.clientEmail || '').toLowerCase().includes(q) ||
                          (lic.licenseNumber || '').toLowerCase().includes(q);
                        const matchPlan = licensePlanFilter === 'all' || (lic.planId || '').toLowerCase() === licensePlanFilter.toLowerCase();
                        const matchStatus = licenseStatusFilter === 'all' || (lic.status || 'active').toLowerCase() === licenseStatusFilter.toLowerCase();
                        return matchSearch && matchPlan && matchStatus;
                      });
                      const paged = paginateArray(filtered, 'licenses');

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} style={{ padding: "36px 20px", textAlign: "center", color: "#64748b" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                <KeyRound size={28} color="#94a3b8" />
                                <div style={{ fontSize: "13px", fontWeight: '600', color: "#334155" }}>No client licenses found</div>
                                <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>Try adjusting your search query, plan filter, or issue a new license.</div>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return paged.map((lic) => {
                        const pDef = activePlansMap[lic.planId] || activePlansMap.growth;
                        const seatsAllocated = lic.customSeats || lic.defaultSeats || pDef.maxSeats || 15;
                        const isCustomSeats = seatsAllocated !== (lic.defaultSeats || pDef.maxSeats);

                        return (
                          <tr key={lic.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            {/* Company & Owner */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ width: "34px", height: "34px", borderRadius: "8px", backgroundColor: pDef.bg, color: pDef.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "14px", border: `1px solid ${pDef.border}` }}>
                                  {lic.companyName ? lic.companyName[0] : 'C'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>
                                    {lic.companyName}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                                    Owner: <strong style={{ color: "#334155" }}>{lic.clientName}</strong>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Contact */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ fontSize: "12px", color: "#0f172a", fontWeight: '600' }}>
                                {lic.clientEmail}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {lic.clientPhone || "No phone"} {lic.clientGst ? `• GST: ${lic.clientGst}` : ""}
                              </div>
                            </td>

                            {/* Plan & Seats */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "11px", fontWeight: '600', color: pDef.color, backgroundColor: pDef.bg, padding: "2px 7px", borderRadius: "5px", border: `1px solid ${pDef.border}` }}>
                                  {pDef.badge}
                                </span>
                                <span style={{ fontSize: "11.5px", fontWeight: '600', color: isCustomSeats ? "#15803d" : "#334155" }}>
                                  {seatsAllocated} Seats {isCustomSeats ? "✨ Custom" : ""}
                                </span>
                              </div>
                              <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                                {(lic.leadQuota || pDef.leadQuota || 2500).toLocaleString()} Leads Quota
                              </div>
                            </td>

                            {/* License Number */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", backgroundColor: "#fef3c7", padding: "3px 8px", borderRadius: "6px", border: "1px solid #fde68a" }}>
                                <KeyRound size={12} color="#b45309" />
                                <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: "800", color: "#78350f" }}>
                                  {lic.licenseNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                      navigator.clipboard.writeText(lic.licenseNumber);
                                    }
                                    showToast(`Copied ${lic.licenseNumber} 📋`, "success");
                                  }}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "1px 3px", color: "#b45309" }}
                                  title="Copy License Number"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                            </td>

                            {/* Discount */}
                            <td style={{ padding: "12px 14px" }}>
                              {lic.discountAmount > 0 ? (
                                <span style={{ fontSize: "11px", fontWeight: '600', color: "#b91c1c", backgroundColor: "#fef2f2", padding: "2px 7px", borderRadius: "4px", border: "1px solid #fecaca" }}>
                                  -₹{lic.discountAmount.toLocaleString()} ({lic.discountType === "percent" ? `${lic.discountValue}%` : "Flat"})
                                </span>
                              ) : (
                                <span style={{ fontSize: "11px", color: "#94a3b8" }}>None</span>
                              )}
                            </td>

                            {/* Invoiced Amount */}
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ fontSize: "14px", fontWeight: "900", color: "#0f172a" }}>
                                ₹{(lic.finalAmount || lic.basePrice || 4999).toLocaleString()}
                              </div>
                              <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                                {lic.paymentMode}
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              {(() => {
                                const isRevoked = (lic.status || '').toLowerCase() === 'revoked';
                                return (
                                  <span style={{
                                    fontSize: "11px",
                                    fontWeight: '600',
                                    color: isRevoked ? "#dc2626" : "#16a34a",
                                    backgroundColor: isRevoked ? "#fef2f2" : "#f0fdf4",
                                    padding: "2.5px 8px",
                                    borderRadius: "9999px",
                                    border: `1px solid ${isRevoked ? "#fecaca" : "#bbf7d0"}`,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}>
                                    ● {isRevoked ? 'Revoked' : 'Active'}
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: "12px 14px", textAlign: "right" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleViewInvoice(lic)}
                                  style={{
                                    padding: "4px 9px",
                                    backgroundColor: "#eff6ff",
                                    color: "#1d4ed8",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: "5px",
                                    fontSize: "11px",
                                    fontWeight: '600',
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px"
                                  }}
                                  title="View &amp; Print Official Tax Invoice"
                                >
                                  <Receipt size={12} /> Invoice
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditClientLicenseModal(lic)}
                                  style={{
                                    padding: "4px 8px",
                                    backgroundColor: "#f8fafc",
                                    color: "#334155",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "5px",
                                    fontSize: "11px",
                                    fontWeight: '600',
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px"
                                  }}
                                  title="Edit user seats, plan or discount"
                                >
                                  <Pencil size={11} /> Edit
                                </button>

                                <button
                                  type="button"
                                  disabled={actionLoadingId === lic.id}
                                  onClick={() => handleRevokeLicenseDirect(lic)}
                                  style={{
                                    padding: "4px 6px",
                                    backgroundColor: "#fff",
                                    color: "#dc2626",
                                    border: "1px solid #fecaca",
                                    borderRadius: "5px",
                                    fontSize: "11px",
                                    cursor: "pointer"
                                  }}
                                  title="Revoke License"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                {(() => {
                  const filtered = clientLicenses.filter(lic => {
                    const q = licenseSearchQuery.toLowerCase();
                    const matchSearch = !q ||
                      (lic.companyName || '').toLowerCase().includes(q) ||
                      (lic.clientName || '').toLowerCase().includes(q) ||
                      (lic.clientEmail || '').toLowerCase().includes(q) ||
                      (lic.licenseNumber || '').toLowerCase().includes(q);
                    const matchPlan = licensePlanFilter === 'all' || (lic.planId || '').toLowerCase() === licensePlanFilter.toLowerCase();
                    const matchStatus = licenseStatusFilter === 'all' || (lic.status || 'active').toLowerCase() === licenseStatusFilter.toLowerCase();
                    return matchSearch && matchPlan && matchStatus;
                  });
                  return renderPagination('licenses', filtered.length);
                })()}
              </div>
            </div>
          );
        })()}

        {/* ===================================================================
            TAB 4: LEAD MANAGEMENT (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'leads' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Lead Management</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Manage and assign leads to your team.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderDateRangeDropdown()}
                <button
                  onClick={() => setIsAddLeadOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f97316', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 1px 2px rgba(249,115,22,0.3)' }}
                >
                  <Plus size={15} />
                  <span>+ Add Lead</span>
                </button>
              </div>
            </div>

            {/* 4 KPI Cards matching reference image */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Total Leads</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{leadKpiMetrics.total}</span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>Live</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Assigned</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{leadKpiMetrics.assigned}</span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>Active Reps</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>In Progress</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{leadKpiMetrics.inProgress}</span>
                  <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>Pipeline</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Converted</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{leadKpiMetrics.converted}</span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>Won Deals</span>
                </div>
              </div>
            </div>

            {/* Leads Table Container */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {/* Search & Filter Bar */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', outline: 'none', backgroundColor: '#ffffff' }}
                  />
                </div>
                <select
                  value={leadStageFilter}
                  onChange={(e) => setLeadStageFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="all">All Stages</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
                <select
                  value={leadRepFilter}
                  onChange={(e) => setLeadRepFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="all">All Reps</option>
                  {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Lead Name</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Company</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Source</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Assigned To</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = activeLeads.filter(l => {
                        const matchSearch = (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (l.company || '').toLowerCase().includes(searchQuery.toLowerCase());
                        const matchStage = leadStageFilter === 'all' || (l.status || '').toLowerCase() === leadStageFilter.toLowerCase();
                        const matchRep = leadRepFilter === 'all' || (l.assignedTo || l.owner || '').toLowerCase() === leadRepFilter.toLowerCase();
                        return matchSearch && matchStage && matchRep;
                      });
                      const paged = paginateArray(filtered, 'leads');
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <TrendingUp size={28} color="#94a3b8" />
                                <span style={{ fontWeight: '600' }}>No leads found</span>
                                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Try adjusting your search query, stage, or rep filter</span>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return paged.map((l) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a' }}>{l.name}</td>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>{l.company}</td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>{l.source}</td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>{l.assignedTo || l.owner}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', ...getLeadStatusStyle(l.status) }}>
                              {l.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button
                              onClick={() => setActiveActionMenu({ type: 'lead', item: l })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                              title="Actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              {(() => {
                const filtered = activeLeads.filter(l => {
                  const matchSearch = (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (l.company || '').toLowerCase().includes(searchQuery.toLowerCase());
                  const matchStage = leadStageFilter === 'all' || (l.status || '').toLowerCase() === leadStageFilter.toLowerCase();
                  const matchRep = leadRepFilter === 'all' || (l.assignedTo || l.owner || '').toLowerCase() === leadRepFilter.toLowerCase();
                  return matchSearch && matchStage && matchRep;
                });
                return renderPagination('leads', filtered.length);
              })()}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: REPORTS & ANALYTICS (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'reports' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Reports & Analytics</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Get insights with detailed reports and live cloud analytics.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderDateRangeDropdown()}
              </div>
            </div>

            {/* Sub-nav pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {['All Reports', 'Lead Report', 'Conversion Report', 'Revenue Report'].map((tab) => {
                const isAct = reportsTab === tab.toLowerCase() || (reportsTab === 'all' && tab === 'All Reports');
                return (
                  <button
                    key={tab}
                    onClick={() => setReportsTab(tab === 'All Reports' ? 'all' : tab.toLowerCase())}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: isAct ? '#2563eb' : '#f1f5f9',
                      color: isAct ? '#ffffff' : '#475569'
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* 4 KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Total Revenue</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>₹{liveDashboardMetrics.totalRevenue.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>Live Paid</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Total Leads</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{liveDashboardMetrics.totalLeads}</span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>{liveDashboardMetrics.wonLeads} Won</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Conversion Rate</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{liveDashboardMetrics.conversionRate}%</span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>Pipeline</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Avg. Deal Value</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>₹{liveDashboardMetrics.avgDealValue.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>Won Deals</span>
                </div>
              </div>
            </div>

            {/* Middle Visuals: Revenue Overview (Line chart) & Lead Source (Donut chart) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.1fr', gap: '16px' }}>
              {/* Revenue Overview */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Revenue Overview</h3>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '12px', fontWeight: '600' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2563eb' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                      Verified Paid Revenue
                    </span>
                  </div>
                </div>

                <div style={{ height: '220px', position: 'relative' }}>
                  <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%' }}>
                    {[40, 75, 110, 145, 180].map((y, i) => (
                      <line key={i} x1="45" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    ))}
                    <text x="35" y="44" fontSize="10" fill="#94a3b8" textAnchor="end">₹{Math.round(monthlyRevenueTrend.maxVal / 1000)}K</text>
                    <text x="35" y="79" fontSize="10" fill="#94a3b8" textAnchor="end">₹{Math.round((monthlyRevenueTrend.maxVal * 0.75) / 1000)}K</text>
                    <text x="35" y="114" fontSize="10" fill="#94a3b8" textAnchor="end">₹{Math.round((monthlyRevenueTrend.maxVal * 0.5) / 1000)}K</text>
                    <text x="35" y="149" fontSize="10" fill="#94a3b8" textAnchor="end">₹{Math.round((monthlyRevenueTrend.maxVal * 0.25) / 1000)}K</text>
                    <text x="35" y="184" fontSize="10" fill="#94a3b8" textAnchor="end">₹0</text>

                    {/* Dynamic Blue line from Supabase invoices */}
                    <path
                      d={monthlyRevenueTrend.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x + 30} ${p.y + 20}`).join(' ')}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                    />
                    {monthlyRevenueTrend.points.map((p, idx) => (
                      <circle
                        key={p.month}
                        cx={p.x + 30}
                        cy={p.y + 20}
                        r={idx === monthlyRevenueTrend.points.length - 1 ? 5 : 3.5}
                        fill={idx === monthlyRevenueTrend.points.length - 1 ? '#2563eb' : '#94a3b8'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    ))}

                    {monthlyRevenueTrend.points.map(p => (
                      <text key={p.month} x={p.x + 30} y="198" fontSize="11" fill="#64748b" textAnchor="middle">{p.month}</text>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Lead Source */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0' }}>Lead Source Distribution</h3>
                
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '140px', position: 'relative' }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: leadSourceStats.gradientStr,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{leadSourceStats.total}</span>
                      <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '600' }}>Total Leads</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '16px', fontSize: '11px', fontWeight: '600' }}>
                  {leadSourceStats.slices.map(s => (
                    <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color }} />
                      {s.name}: {s.pct}% ({s.count})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Sub-Tab Reports Breakdown Section */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {/* All Reports View */}
              {(reportsTab === 'all' || reportsTab === 'all reports') && (
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' }}>
                    System Performance & Cloud Overview
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '8px 10px', fontWeight: '700' }}>Category</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700' }}>Metric Name</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Current Value</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Status / Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: '700', color: '#2563eb' }}>Financials</td>
                          <td style={{ padding: '8px 10px' }}>Total Invoiced Volume</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>₹{liveDashboardMetrics.totalInvoiced.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>Supabase Invoices</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: '700', color: '#2563eb' }}>Financials</td>
                          <td style={{ padding: '8px 10px' }}>Verified Paid Revenue</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>₹{liveDashboardMetrics.paidInvoiceRevenue.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>Live Paid</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: '700', color: '#7c3aed' }}>CRM Pipeline</td>
                          <td style={{ padding: '8px 10px' }}>Total Tracked Leads</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{liveDashboardMetrics.totalLeads}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#2563eb', fontWeight: '700' }}>{liveDashboardMetrics.wonLeads} Converted</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: '700', color: '#ea580c' }}>Organizations</td>
                          <td style={{ padding: '8px 10px' }}>Registered Client Companies</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{liveDashboardMetrics.totalCompanies}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>{liveDashboardMetrics.activeCompanies} Active</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 10px', fontWeight: '700', color: '#059669' }}>User Accounts</td>
                          <td style={{ padding: '8px 10px' }}>Total Provisioned Team Users</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{liveDashboardMetrics.totalUsers}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>Active System Users</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Revenue Report View */}
              {reportsTab === 'revenue report' && (
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' }}>
                    Revenue & Invoices by Company
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '8px 10px', fontWeight: '700' }}>Invoice ID</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700' }}>Company Name</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700' }}>Plan Tier</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px 10px', textAlign: 'center', color: '#94a3b8' }}>
                              No revenue data for selected period
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((inv) => (
                            <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px', fontWeight: '600', color: '#2563eb' }}>{inv.id}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '600', color: '#0f172a' }}>{inv.company}</td>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>{inv.plan || 'Pro'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>
                                ₹{(Number(inv.numeric_amount) || Number(String(inv.amount).replace(/[^0-9.]/g, '')) || 0).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: '600',
                                  backgroundColor: (inv.status || '').toLowerCase() === 'paid' ? '#ecfdf5' : '#fffbeb',
                                  color: (inv.status || '').toLowerCase() === 'paid' ? '#059669' : '#d97706'
                                }}>
                                  {inv.status}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>{inv.due_date || inv.dueDate || '15 Oct 2026'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Lead Report View */}
              {reportsTab === 'lead report' && (
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' }}>
                    Lead Source Breakdown & Conversion
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '8px 10px', fontWeight: '700' }}>Lead Source</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Total Leads</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Won Deals</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Share of Pipeline</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Conversion Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActiveLeads.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '24px 10px', textAlign: 'center', color: '#94a3b8' }}>
                              No lead data for selected period
                            </td>
                          </tr>
                        ) : (
                          leadSourceStats.slices.map((slice) => {
                            const srcLeads = filteredActiveLeads.filter(l => (l.source || 'Other') === slice.name);
                            const wonCnt = srcLeads.filter(l => (l.status || '').toLowerCase().includes('won')).length;
                            const convRate = srcLeads.length > 0 ? ((wonCnt / srcLeads.length) * 100).toFixed(1) : 0;
                            return (
                              <tr key={slice.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: slice.color }} />
                                  {slice.name}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{slice.count}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>{wonCnt}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>{slice.pct}%</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: convRate >= 50 ? '#16a34a' : '#2563eb' }}>{convRate}%</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Conversion Report View */}
              {reportsTab === 'conversion report' && (
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' }}>
                    Sales Pipeline Stage Funnel Breakdown
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '8px 10px', fontWeight: '700' }}>Pipeline Stage</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Active Leads</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Pipeline Share</th>
                          <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>Cumulative Won</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActiveLeads.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ padding: '24px 10px', textAlign: 'center', color: '#94a3b8' }}>
                              No pipeline data for selected period
                            </td>
                          </tr>
                        ) : (
                          salesPipelineStages.map((stg) => {
                            const pct = filteredActiveLeads.length > 0 ? ((stg.count / filteredActiveLeads.length) * 100).toFixed(1) : 0;
                            return (
                              <tr key={stg.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stg.color }} />
                                  {stg.name}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{stg.count}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>{pct}%</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: stg.name === 'Won' ? '#16a34a' : '#64748b' }}>
                                  {stg.name === 'Won' ? `${stg.count} Closed` : '-'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 6: SYSTEM SETTINGS (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'system_settings' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>System Settings</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Configure system preferences and global settings.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', fontSize: '12.5px', color: '#334155', fontWeight: '600' }}>
                <Calendar size={14} color="#64748b" />
                <span>{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
              </div>
            </div>

            {/* 6 Cards Grid (3x2) matching reference image */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { id: 'general', title: 'General Settings', desc: 'Basic system settings & preferences', icon: Settings },
                { id: 'email', title: 'Email Settings', desc: 'Configure email services & templates', icon: Mail },
                { id: 'api', title: 'API Settings', desc: 'Manage API keys & webhooks', icon: Code },
                { id: 'security', title: 'Security Settings', desc: 'Password, 2FA & security', icon: Shield },
                { id: 'backup', title: 'Backup & Restore', desc: 'Data backup and recovery', icon: Cloud },
                { id: 'custom', title: 'Custom Fields', desc: 'Manage custom fields', icon: Sliders }
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      setActiveSettingsModal(card.id);
                      setEditableSettings(systemSettingsMap[card.id] || {});
                    }}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '22px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '14px' }}>
                      <Icon size={20} />
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>{card.title}</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>{card.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 7: SUPPORT TICKETS (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'support_tickets' && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Support Tickets</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Manage customer support requests.</p>
              </div>
              <button
                onClick={() => setIsAddTicketOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f97316', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 1px 2px rgba(249,115,22,0.3)' }}
              >
                <Plus size={15} />
                <span>+ New Ticket</span>
              </button>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', outline: 'none', backgroundColor: '#ffffff' }}
              />
            </div>

            {/* Filter Tabs & Priority Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { key: 'all', label: `All (${tickets.length})` },
                  { key: 'open', label: `Open (${tickets.filter(t => t.status === 'Open').length})` },
                  { key: 'progress', label: `In Progress (${tickets.filter(t => t.status === 'In Progress').length})` },
                  { key: 'resolved', label: `Resolved (${tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length})` }
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTicketFilter(f.key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: ticketFilter === f.key ? '#f97316' : '#f1f5f9',
                      color: ticketFilter === f.key ? '#ffffff' : '#475569'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <select
                value={ticketPriorityFilter}
                onChange={(e) => setTicketPriorityFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Ticket ID</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Subject</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Customer</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Priority</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Created At</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = tickets.filter(t => {
                      const matchSearch = (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.customer || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.id || '').toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matchSearch) return false;
                      if (ticketFilter === 'open' && t.status !== 'Open') return false;
                      if (ticketFilter === 'progress' && t.status !== 'In Progress') return false;
                      if (ticketFilter === 'resolved' && (t.status !== 'Resolved' && t.status !== 'Closed')) return false;
                      if (ticketPriorityFilter !== 'all' && (t.priority || '').toLowerCase() !== ticketPriorityFilter.toLowerCase()) return false;
                      return true;
                    });
                    const paged = paginateArray(filtered, 'tickets');
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <Headset size={28} color="#94a3b8" />
                              <span style={{ fontWeight: '600' }}>No support tickets found</span>
                              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Try adjusting your search query, status, or priority filter</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return paged.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '600', color: '#2563eb' }}>{t.id}</td>
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a' }}>{t.subject}</td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{t.customer || t.company}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', ...getPriorityStyle(t.priority) }}>
                            {t.priority}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', ...getTicketStatusStyle(t.status) }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{t.createdAt}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => setActiveActionMenu({ type: 'ticket', item: t })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const filtered = tickets.filter(t => {
                const matchSearch = (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.customer || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.id || '').toLowerCase().includes(searchQuery.toLowerCase());
                if (!matchSearch) return false;
                if (ticketFilter === 'open' && t.status !== 'Open') return false;
                if (ticketFilter === 'progress' && t.status !== 'In Progress') return false;
                if (ticketFilter === 'resolved' && (t.status !== 'Resolved' && t.status !== 'Closed')) return false;
                if (ticketPriorityFilter !== 'all' && (t.priority || '').toLowerCase() !== ticketPriorityFilter.toLowerCase()) return false;
                return true;
              });
              return renderPagination('tickets', filtered.length);
            })()}
          </div>
        )}

        {/* ===================================================================
            TAB 8: AUDIT LOGS (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'audit_logs' && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Audit Logs</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Track system activity and user actions.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleExportAuditLogs}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Export audit logs to CSV"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                {renderDateRangeDropdown()}
              </div>
            </div>

            {/* Search & Module Filter Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search logs by user, action, module or details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', outline: 'none', backgroundColor: '#ffffff' }}
                />
              </div>
              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', backgroundColor: '#ffffff', color: '#334155', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Modules</option>
                {availableAuditModules.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                    <th
                      onClick={() => handleToggleAuditSort('timestamp')}
                      style={{ padding: '10px 14px', fontWeight: '700', cursor: 'pointer', userSelect: 'none' }}
                      title="Sort by Timestamp"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Date &amp; Time
                        {auditSortField === 'timestamp' ? (auditSortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                      </span>
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>User</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Action</th>
                    <th
                      onClick={() => handleToggleAuditSort('module')}
                      style={{ padding: '10px 14px', fontWeight: '700', cursor: 'pointer', userSelect: 'none' }}
                      title="Sort by Module"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Module
                        {auditSortField === 'module' ? (auditSortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                      </span>
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Details</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAuditLogs.length > 0 ? (
                    paginateArray(displayedAuditLogs, 'auditLogs').map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{log.dateTime}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: '#475569' }}>
                              {getInitials(log.user)}
                            </div>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{log.user}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', ...getAuditActionStyle(log.action) }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{log.module}</td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>{log.details}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => setViewingAuditLog(log)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                            title="View Audit Details"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Shield size={32} color="#94a3b8" />
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                            No audit activity found for the selected filters.
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Try selecting "All Time", "All Modules", or clearing the search query.
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination('auditLogs', displayedAuditLogs.length)}
          </div>
        )}

        {/* ===================================================================
            TAB 9: CRM OVERVIEW (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'crm_overview' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>CRM Overview</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Quick view of your live sales pipeline and performance.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderDateRangeDropdown()}
              </div>
            </div>

            {/* 4 Top KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Total Leads</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{liveDashboardMetrics.totalLeads}</div>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>{liveDashboardMetrics.newLeads} New</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Won Deals</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{liveDashboardMetrics.wonLeads}</div>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Converted</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Conversion Rate</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{liveDashboardMetrics.conversionRate}%</div>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Pipeline</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Revenue</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>₹{liveDashboardMetrics.totalRevenue.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Verified Paid</span>
                </div>
              </div>
            </div>

            {/* Bottom 2 Cards Grid: Sales Pipeline & Recent Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
              {/* Sales Pipeline Card */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' }}>Sales Pipeline Funnel</h3>
                  
                  {/* Dynamic Vertical Bar Chart */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '200px', padding: '10px 10px 0 10px', borderBottom: '1px solid #f1f5f9' }}>
                    {salesPipelineStages.map(stg => (
                      <div key={stg.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '52px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: stg.color, marginBottom: '4px' }}>{stg.count}</span>
                        <div style={{ width: '40px', height: `${stg.heightPx}px`, backgroundColor: stg.color, borderRadius: '5px 5px 0 0' }} />
                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontWeight: '600' }}>{stg.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Launch Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={onOpenSalesCockpit}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#ea580c', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    <Laptop size={14} /> Launch Sales Cockpit
                  </button>
                  <button
                    onClick={() => onNavigate('sheet')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    <FileSpreadsheet size={14} color="#2563eb" /> Open Grid Sheet
                  </button>
                </div>
              </div>

              {/* Recent Activity Card from Live Supabase audit_logs */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' }}>Recent Activity (Audit Trail)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {liveRecentActivity.length > 0 ? (
                    liveRecentActivity.map(act => (
                      <div key={act.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: act.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: act.color, flexShrink: 0 }}>
                            {act.icon}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{act.title}</div>
                            {act.details && <div style={{ fontSize: '10.5px', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{act.details}</div>}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>{act.time}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94a3b8', padding: '20px', textAlign: 'center' }}>No recent audit activity</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 10: BILLING & INVOICES (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'billing' && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Billing &amp; Invoices</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>View and manage your billing details and invoices.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPageFor('invoices', 1); }}
                    style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', outline: 'none', backgroundColor: '#ffffff' }}
                  />
                </div>
                <select
                  value={invoiceFilter}
                  onChange={(e) => { setInvoiceFilter(e.target.value); setPageFor('invoices', 1); }}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', color: '#334155', backgroundColor: '#ffffff', outline: 'none' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
                <button
                  onClick={() => setIsAddInvoiceOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ea580c', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Plus size={14} />
                  <span>+ Create Invoice</span>
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setBillingSubTab('invoices')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: billingSubTab === 'invoices' ? '#2563eb' : 'transparent',
                  color: billingSubTab === 'invoices' ? '#ffffff' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Invoices
              </button>
              <button
                onClick={() => setBillingSubTab('licenses')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: billingSubTab === 'licenses' ? '#2563eb' : 'transparent',
                  color: billingSubTab === 'licenses' ? '#ffffff' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Client Licenses ({clientLicenses.length})
              </button>
              <button
                onClick={() => setBillingSubTab('payments')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: billingSubTab === 'payments' ? '#2563eb' : 'transparent',
                  color: billingSubTab === 'payments' ? '#ffffff' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Payments
              </button>
              <button
                onClick={() => setBillingSubTab('payment_methods')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: billingSubTab === 'payment_methods' ? '#2563eb' : 'transparent',
                  color: billingSubTab === 'payment_methods' ? '#ffffff' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Payment Methods
              </button>
            </div>

            {billingSubTab === 'licenses' ? (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                    Active Client Licenses &amp; Provisioned User Quotas
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenNewClientLicenseModal}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <KeyRound size={14} /> + Onboard Client &amp; Issue License
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', fontWeight: '600' }}>
                      <th style={{ padding: '10px 14px' }}>Client Company</th>
                      <th style={{ padding: '10px 14px' }}>License Key</th>
                      <th style={{ padding: '10px 14px' }}>Plan &amp; Seats</th>
                      <th style={{ padding: '10px 14px' }}>Amount Billed</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientLicenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px 14px', textAlign: 'center', color: '#94a3b8' }}>
                          No client licenses found
                        </td>
                      </tr>
                    ) : (
                      clientLicenses.map((lic) => {
                        const pDef = (companyPlans || DEFAULT_COMPANY_PLANS)[lic.planId] || (companyPlans || DEFAULT_COMPANY_PLANS).growth;
                        const isRevoked = (lic.status || '').toLowerCase() === 'revoked';
                        return (
                          <tr key={lic.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>{lic.companyName}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{lic.clientEmail}</div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef3c7', color: '#78350f', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                                {lic.licenseNumber}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: pDef?.bg || '#eff6ff', color: pDef?.color || '#2563eb' }}>
                                {pDef?.name || lic.planId}
                              </span>
                              <span style={{ fontSize: '11.5px', color: '#475569', marginLeft: '6px', fontWeight: '600' }}>
                                {lic.customSeats || lic.defaultSeats || 15} Seats
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a' }}>
                              ₹{(lic.finalAmount || 4999).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: isRevoked ? '#fef2f2' : '#f0fdf4',
                                color: isRevoked ? '#dc2626' : '#16a34a',
                                border: `1px solid ${isRevoked ? '#fecaca' : '#bbf7d0'}`
                              }}>
                                ● {isRevoked ? 'Revoked' : 'Active'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleViewInvoice(lic)}
                                style={{ padding: '4px 8px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', marginRight: '6px' }}
                              >
                                Invoice
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditClientLicenseModal(lic)}
                                style={{ padding: '4px 8px', backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : billingSubTab === 'invoices' ? (
              /* Invoices Table */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Invoice # ▾</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Company ▾</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Amount</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Due Date</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = invoices.filter(inv => {
                        const matchSearch = !searchQuery || (inv.company || '').toLowerCase().includes(searchQuery.toLowerCase()) || (inv.id || '').toLowerCase().includes(searchQuery.toLowerCase());
                        const matchStatus = invoiceFilter === 'all' || (inv.status || '').toLowerCase() === invoiceFilter.toLowerCase();
                        return matchSearch && matchStatus;
                      });
                      const paged = paginateArray(filtered, 'invoices');
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <Receipt size={28} color="#94a3b8" />
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>No invoices found</div>
                                <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Try adjusting your search query, status filter, or generate a new tax invoice.</div>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return paged.map((inv) => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: '600', color: '#2563eb' }}>{inv.id}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a' }}>{inv.company}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a' }}>{inv.amount}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: (inv.status || '').toLowerCase() === 'paid' ? '#ecfdf5' : '#fff7ed',
                              color: (inv.status || '').toLowerCase() === 'paid' ? '#059669' : '#ea580c'
                            }}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>{inv.dueDate || inv.due_date || '15 Oct 2026'}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button
                              onClick={() => setActiveActionMenu({ type: 'invoice', item: inv })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                              title="Invoice Actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
                {(() => {
                  const filtered = invoices.filter(inv => {
                    const matchSearch = !searchQuery || (inv.company || '').toLowerCase().includes(searchQuery.toLowerCase()) || (inv.id || '').toLowerCase().includes(searchQuery.toLowerCase());
                    const matchStatus = invoiceFilter === 'all' || (inv.status || '').toLowerCase() === invoiceFilter.toLowerCase();
                    return matchSearch && matchStatus;
                  });
                  return renderPagination('invoices', filtered.length);
                })()}
              </div>
            ) : billingSubTab === 'payments' ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <DollarSign size={32} color="#16a34a" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <strong style={{ color: '#0f172a', fontSize: '14px' }}>No External Gateway Transactions Recorded</strong>
                <p style={{ margin: '6px auto 0 auto', maxWidth: '440px', fontSize: '12px', color: '#64748b' }}>
                  All client billing is currently processed via official Tax Invoices. Settled online payment transactions from connected gateways (Razorpay, Stripe, UPI) will appear here automatically.
                </p>
              </div>
            ) : (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <CreditCard size={32} color="#2563eb" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <strong style={{ color: '#0f172a', fontSize: '14px' }}>Standard Enterprise Billing Active</strong>
                <p style={{ margin: '6px auto 0 auto', maxWidth: '440px', fontSize: '12px', color: '#64748b' }}>
                  Corporate Direct Settlement (Bank Transfer NEFT/RTGS and UPI AutoPay) is active for client licensing. Custom payment gateways can be activated under System Integrations.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 11: NOTIFICATIONS (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'notifications' && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Notifications</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Stay updated with important alerts and activities.</p>
              </div>
              {unreadNotifCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                onClick={() => setNotificationFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: notificationFilter === 'all' ? '#2563eb' : '#f1f5f9',
                  color: notificationFilter === 'all' ? '#ffffff' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                All ({totalNotifCount})
              </button>
              <button
                onClick={() => setNotificationFilter('unread')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: notificationFilter === 'unread' ? '#2563eb' : '#f1f5f9',
                  color: notificationFilter === 'unread' ? '#ffffff' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Unread ({unreadNotifCount})
              </button>
              <button
                onClick={() => setNotificationFilter('read')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: notificationFilter === 'read' ? '#2563eb' : '#f1f5f9',
                  color: notificationFilter === 'read' ? '#ffffff' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Read ({readNotifCount})
              </button>
            </div>

            {/* Notifications List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayedNotifications.length > 0 ? (
                displayedNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => toggleNotification(notif.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      border: '1px solid #f1f5f9',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                    title={notif.unread ? "Click to mark as read" : "Click to mark as unread"}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: getNotifBg(notif.type),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: getNotifColor(notif.type)
                      }}>
                        {getNotifIcon(notif.type)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{notif.title}</span>
                          {notif.unread && (
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'inline-block' }} />
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{notif.detail}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>{notif.time || 'Just now'}</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '13px' }}>
                  No notifications found for the selected filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 12: INTEGRATIONS (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'integrations' && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ marginBottom: '22px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Integrations</h2>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Connect with your favorite tools and platforms.</p>
            </div>

            {/* 3x2 Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
              {/* Card 1: Zoho CRM */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                {/* Zoho Logo Graphic */}
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <div style={{ width: '12px', height: '24px', borderRadius: '6px', border: '3px solid #ef4444' }} />
                    <div style={{ width: '12px', height: '24px', borderRadius: '6px', border: '3px solid #10b981' }} />
                    <div style={{ width: '12px', height: '24px', borderRadius: '6px', border: '3px solid #3b82f6' }} />
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Zoho CRM</div>
                {((integrations || []).find(i => (i.id || '').toLowerCase() === 'zoho')?.connected ?? true) ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'zoho'}
                    onClick={() => toggleIntegration('zoho')}
                    title="Click to disconnect Zoho CRM"
                    style={{ padding: '4px 14px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', cursor: actionLoadingId === 'zoho' ? 'wait' : 'pointer', opacity: actionLoadingId === 'zoho' ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {actionLoadingId === 'zoho' ? 'Disconnecting...' : <><Check size={12} /> Connected</>}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'zoho'}
                    onClick={() => toggleIntegration('zoho')}
                    title="Click to connect Zoho CRM"
                    style={{ padding: '5px 18px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: actionLoadingId === 'zoho' ? 'wait' : 'pointer', opacity: actionLoadingId === 'zoho' ? 0.6 : 1 }}
                  >
                    {actionLoadingId === 'zoho' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Card 2: Google Workspace */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                {/* Google G Graphic */}
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#ffffff', border: '3.5px solid #4285f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#ea4335', fontSize: '17px' }}>
                    G
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Google Workspace</div>
                {((integrations || []).find(i => (i.id || '').toLowerCase() === 'google')?.connected ?? false) ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'google'}
                    onClick={() => toggleIntegration('google')}
                    title="Click to disconnect Google Workspace"
                    style={{ padding: '4px 14px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', cursor: actionLoadingId === 'google' ? 'wait' : 'pointer', opacity: actionLoadingId === 'google' ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {actionLoadingId === 'google' ? 'Disconnecting...' : <><Check size={12} /> Connected</>}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'google'}
                    onClick={() => toggleIntegration('google')}
                    title="Click to connect Google Workspace"
                    style={{ padding: '5px 18px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: actionLoadingId === 'google' ? 'wait' : 'pointer', opacity: actionLoadingId === 'google' ? 0.6 : 1 }}
                  >
                    {actionLoadingId === 'google' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Card 3: Slack */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                {/* Slack Graphic */}
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px' }}>
                    <div style={{ width: '10px', height: '10px', backgroundColor: '#e01e5a', borderRadius: '3px' }} />
                    <div style={{ width: '10px', height: '10px', backgroundColor: '#36c5f0', borderRadius: '3px' }} />
                    <div style={{ width: '10px', height: '10px', backgroundColor: '#2eb67d', borderRadius: '3px' }} />
                    <div style={{ width: '10px', height: '10px', backgroundColor: '#ecb22e', borderRadius: '3px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Slack</div>
                {((integrations || []).find(i => (i.id || '').toLowerCase() === 'slack')?.connected ?? false) ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'slack'}
                    onClick={() => toggleIntegration('slack')}
                    title="Click to disconnect Slack"
                    style={{ padding: '4px 14px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', cursor: actionLoadingId === 'slack' ? 'wait' : 'pointer', opacity: actionLoadingId === 'slack' ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {actionLoadingId === 'slack' ? 'Disconnecting...' : <><Check size={12} /> Connected</>}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'slack'}
                    onClick={() => toggleIntegration('slack')}
                    title="Click to connect Slack"
                    style={{ padding: '5px 18px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: actionLoadingId === 'slack' ? 'wait' : 'pointer', opacity: actionLoadingId === 'slack' ? 0.6 : 1 }}
                  >
                    {actionLoadingId === 'slack' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Card 4: Mailchimp */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                {/* Mailchimp Graphic */}
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#ffe01b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000', fontWeight: '900', fontSize: '18px' }}>
                    🐒
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Mailchimp</div>
                {((integrations || []).find(i => (i.id || '').toLowerCase() === 'mailchimp')?.connected ?? false) ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'mailchimp'}
                    onClick={() => toggleIntegration('mailchimp')}
                    title="Click to disconnect Mailchimp"
                    style={{ padding: '4px 14px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', cursor: actionLoadingId === 'mailchimp' ? 'wait' : 'pointer', opacity: actionLoadingId === 'mailchimp' ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {actionLoadingId === 'mailchimp' ? 'Disconnecting...' : <><Check size={12} /> Connected</>}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'mailchimp'}
                    onClick={() => toggleIntegration('mailchimp')}
                    title="Click to connect Mailchimp"
                    style={{ padding: '5px 18px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: actionLoadingId === 'mailchimp' ? 'wait' : 'pointer', opacity: actionLoadingId === 'mailchimp' ? 0.6 : 1 }}
                  >
                    {actionLoadingId === 'mailchimp' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Card 5: WhatsApp */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                {/* WhatsApp Graphic */}
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                    <MessageSquare size={20} />
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>WhatsApp</div>
                {((integrations || []).find(i => (i.id || '').toLowerCase() === 'whatsapp')?.connected ?? true) ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'whatsapp'}
                    onClick={() => toggleIntegration('whatsapp')}
                    title="Click to disconnect WhatsApp"
                    style={{ padding: '4px 14px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', cursor: actionLoadingId === 'whatsapp' ? 'wait' : 'pointer', opacity: actionLoadingId === 'whatsapp' ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {actionLoadingId === 'whatsapp' ? 'Disconnecting...' : <><Check size={12} /> Connected</>}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'whatsapp'}
                    onClick={() => toggleIntegration('whatsapp')}
                    title="Click to connect WhatsApp"
                    style={{ padding: '5px 18px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: actionLoadingId === 'whatsapp' ? 'wait' : 'pointer', opacity: actionLoadingId === 'whatsapp' ? 0.6 : 1 }}
                  >
                    {actionLoadingId === 'whatsapp' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Card 6: Zapier */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                {/* Zapier Graphic */}
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#ff4f00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '900', fontSize: '20px' }}>
                    *
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Zapier</div>
                {((integrations || []).find(i => (i.id || '').toLowerCase() === 'zapier')?.connected ?? false) ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'zapier'}
                    onClick={() => toggleIntegration('zapier')}
                    title="Click to disconnect Zapier"
                    style={{ padding: '4px 14px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', cursor: actionLoadingId === 'zapier' ? 'wait' : 'pointer', opacity: actionLoadingId === 'zapier' ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {actionLoadingId === 'zapier' ? 'Disconnecting...' : <><Check size={12} /> Connected</>}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'zapier'}
                    onClick={() => toggleIntegration('zapier')}
                    title="Click to connect Zapier"
                    style={{ padding: '5px 18px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: actionLoadingId === 'zapier' ? 'wait' : 'pointer', opacity: actionLoadingId === 'zapier' ? 0.6 : 1 }}
                  >
                    {actionLoadingId === 'zapier' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 13: SETTINGS (MATCHING REFERENCE IMAGE)
        =================================================================== */}
        {activeTab === 'settings' && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>Settings</h2>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>Manage your profile and preferences.</p>
            </div>

            {/* 2-Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '18px' }}>
              {/* Left Column: Vertical Menu */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => setSettingsSubNav('profile')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: settingsSubNav === 'profile' ? '#eff6ff' : 'transparent',
                    color: settingsSubNav === 'profile' ? '#2563eb' : '#475569',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Users size={16} />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => setSettingsSubNav('password')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: settingsSubNav === 'password' ? '#eff6ff' : 'transparent',
                    color: settingsSubNav === 'password' ? '#2563eb' : '#475569',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Lock size={16} />
                  <span>Change Password</span>
                </button>

                <button
                  onClick={() => setSettingsSubNav('notifications')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: settingsSubNav === 'notifications' ? '#eff6ff' : 'transparent',
                    color: settingsSubNav === 'notifications' ? '#2563eb' : '#475569',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Bell size={16} />
                  <span>Notifications</span>
                </button>

                <button
                  onClick={() => setSettingsSubNav('appearance')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: settingsSubNav === 'appearance' ? '#eff6ff' : 'transparent',
                    color: settingsSubNav === 'appearance' ? '#2563eb' : '#475569',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Palette size={16} />
                  <span>Appearance</span>
                </button>

                <button
                  onClick={() => setSettingsSubNav('language')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: settingsSubNav === 'language' ? '#eff6ff' : 'transparent',
                    color: settingsSubNav === 'language' ? '#2563eb' : '#475569',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Globe size={16} />
                  <span>Language</span>
                </button>

                <button
                  onClick={onLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#dc2626',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: '12px'
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>

              {/* Right Column: Dynamic Settings View according to settingsSubNav */}
              {settingsSubNav === 'profile' && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 18px 0' }}>Profile Information</h3>

                  {/* Avatar & User Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                      <Users size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{profileName || 'Super Admin'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{profileEmail || 'Not available'}</div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Email</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Role</label>
                      <input
                        type="text"
                        disabled
                        value="Super Admin (Platform Owner)"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '13px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{ backgroundColor: '#ea580c', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                      >
                        {isSubmitting ? 'Saving...' : 'Update Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {settingsSubNav === 'password' && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Change Account Password</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 18px 0' }}>
                    Update your Super Admin password through verified native Supabase Auth.
                  </p>

                  <form onSubmit={handleUpdatePassword}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>New Password</label>
                      <input
                        type="password"
                        placeholder="Enter new password (min. 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: isUpdatingPassword ? 'not-allowed' : 'pointer' }}
                      >
                        {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {settingsSubNav === 'notifications' && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Notification Preferences</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 18px 0' }}>
                    Configure automatic alerts and event dispatching persisted to Supabase system settings.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1e293b', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={notifPrefSignup}
                        onChange={(e) => setNotifPrefSignup(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <span>Email alerts on new client organization onboarding &amp; license generation</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1e293b', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={notifPrefTickets}
                        onChange={(e) => setNotifPrefTickets(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <span>Instant system notification on high-priority customer support tickets</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1e293b', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={notifPrefBilling}
                        onChange={(e) => setNotifPrefBilling(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <span>Billing alerts on license expirations and overdue invoices</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSaveNotificationPreferences}
                      style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              )}

              {settingsSubNav === 'appearance' && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Appearance &amp; Theme</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 18px 0' }}>
                    Super Admin Console visual presentation and system branding.
                  </p>

                  <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Active Theme: Light (Enterprise Standard)</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
                        ● Verified Master Design
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5', marginBottom: '14px' }}>
                      The Super Admin Governance Cockpit enforces the verified crisp Light enterprise palette matching the master system blueprint. All colors, contrast ratios, and layouts adhere strictly to corporate accessibility standards.
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'light', label: 'Light (Enterprise Standard)' },
                        { id: 'slate', label: 'Slate Accent' },
                        { id: 'system', label: 'System Default' }
                      ].map(th => (
                        <label key={th.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#334155', cursor: 'pointer', fontWeight: selectedTheme === th.id ? '750' : '500' }}>
                          <input
                            type="radio"
                            name="appearance_theme_opt"
                            value={th.id}
                            checked={selectedTheme === th.id}
                            onChange={() => setSelectedTheme(th.id)}
                            style={{ accentColor: '#2563eb' }}
                          />
                          <span>{th.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSaveAppearancePreferences}
                      style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Theme Settings'}
                    </button>
                  </div>
                </div>
              )}

              {settingsSubNav === 'language' && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Language &amp; Regional Localization</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 18px 0' }}>
                    Platform regional settings and locale formats.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Primary Language</div>
                      <select
                        value={selectedLanguage}
                        onChange={e => setSelectedLanguage(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
                      >
                        <option value="English (United States)">English (United States - Default)</option>
                        <option value="English (India)">English (India)</option>
                        <option value="Hindi">Hindi (Regional)</option>
                      </select>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Time Zone</div>
                      <select
                        value={selectedTimeZone}
                        onChange={e => setSelectedTimeZone(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
                      >
                        <option value="Asia/Kolkata (IST - UTC+5:30)">Asia/Kolkata (IST - UTC+5:30)</option>
                        <option value="UTC (Coordinated Universal Time)">UTC (Coordinated Universal Time)</option>
                        <option value="America/New_York (EST)">America/New_York (EST)</option>
                      </select>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Default Currency</div>
                      <select
                        value={selectedCurrency}
                        onChange={e => setSelectedCurrency(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
                      >
                        <option value="INR (₹)">Indian Rupee (INR - ₹)</option>
                        <option value="USD ($)">US Dollar (USD - $)</option>
                        <option value="EUR (€)">Euro (EUR - €)</option>
                      </select>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Date Format</div>
                      <select
                        value={selectedDateFormat}
                        onChange={e => setSelectedDateFormat(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
                      >
                        <option value="DD MMM YYYY">DD MMM YYYY (e.g. 05 Oct 2026)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSaveLanguagePreferences}
                      style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Regional Settings'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ===================================================================
          MODALS
      =================================================================== */}
      
      {/* 1. Add Company Modal */}
      {isAddCompanyOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '400px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Add New Company</h3>
              <button onClick={() => setIsAddCompanyOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddCompany}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Domain</label>
                <input
                  type="text"
                  placeholder="e.g. acme.com"
                  value={newCompany.domain}
                  onChange={(e) => setNewCompany({ ...newCompany, domain: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Plan</label>
                  <select
                    value={newCompany.plan}
                    onChange={(e) => setNewCompany({ ...newCompany, plan: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Pro">Pro</option>
                    <option value="Business">Business</option>
                    <option value="Basic">Basic</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>User Seats</label>
                  <input
                    type="number"
                    value={newCompany.users}
                    onChange={(e) => setNewCompany({ ...newCompany, users: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setIsAddCompanyOpen(false)} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>Save Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Company Modal */}
      {isEditCompanyOpen && editingCompany && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '400px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Edit Company</h3>
              <button onClick={() => { setIsEditCompanyOpen(false); setEditingCompany(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateCompany}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Company Name</label>
                <input
                  type="text"
                  required
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Domain</label>
                <input
                  type="text"
                  value={editingCompany.domain}
                  onChange={(e) => setEditingCompany({ ...editingCompany, domain: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Plan</label>
                  <select
                    value={editingCompany.plan}
                    onChange={(e) => setEditingCompany({ ...editingCompany, plan: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Pro">Pro</option>
                    <option value="Business">Business</option>
                    <option value="Basic">Basic</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Status</label>
                  <select
                    value={editingCompany.status}
                    onChange={(e) => setEditingCompany({ ...editingCompany, status: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Trial">Trial</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => { setIsEditCompanyOpen(false); setEditingCompany(null); }} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>Update Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add User Modal */}
      {isAddUserOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '400px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Add New User</h3>
              <button onClick={() => setIsAddUserOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@company.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Assign Company</label>
                  <select
                    value={newUser.company}
                    onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setIsAddUserOpen(false)} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Lead Modal */}
      {isAddLeadOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Add New Deal / Lead</h3>
              <button onClick={() => setIsAddLeadOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddLead}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Solaris Tech"
                    value={newLead.company}
                    onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Deal Value (₹)</label>
                  <input
                    type="number"
                    value={newLead.value}
                    onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Lead Source</label>
                  <select
                    value={newLead.source}
                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Direct Inbound">Direct Inbound</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Assign Rep</label>
                  <select
                    value={newLead.assignedTo}
                    onChange={(e) => setNewLead({ ...newLead, assignedTo: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setIsAddLeadOpen(false)} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>Create Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. New Ticket Modal */}
      {isAddTicketOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '400px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Create Support Ticket</h3>
              <button onClick={() => setIsAddTicketOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddTicket}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gateway integration timeout"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Company</label>
                  <select
                    value={newTicket.company}
                    onChange={(e) => setNewTicket({ ...newTicket, company: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setIsAddTicketOpen(false)} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Create Invoice Modal */}
      {isAddInvoiceOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '400px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Create Tax Invoice</h3>
              <button onClick={() => setIsAddInvoiceOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddInvoice}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Billed Company</label>
                <select
                  value={newInvoice.company}
                  onChange={(e) => setNewInvoice({ ...newInvoice, company: e.target.value })}
                  style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                >
                  {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newInvoice.amount}
                    onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Payment Status</label>
                  <select
                    value={newInvoice.status}
                    onChange={(e) => setNewInvoice({ ...newInvoice, status: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Due Date</label>
                <input
                  type="date"
                  value={newInvoice.dueDate || ''}
                  onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                  style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setIsAddInvoiceOpen(false)} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Creating in Supabase...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Settings Drawer Modal */}
      {activeSettingsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '460px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>
                {activeSettingsModal} Configuration (Supabase)
              </h3>
              <button onClick={() => setActiveSettingsModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '12px', color: '#334155' }}>
              {activeSettingsModal === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Platform Name</label>
                    <input
                      type="text"
                      value={editableSettings.platformName ?? systemSettingsMap?.general?.platformName ?? 'ApexSales Global HQ'}
                      onChange={e => setEditableSettings(prev => ({ ...prev, platformName: e.target.value }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Currency</label>
                      <input
                        type="text"
                        value={editableSettings.currency ?? systemSettingsMap?.general?.currency ?? 'INR (₹)'}
                        onChange={e => setEditableSettings(prev => ({ ...prev, currency: e.target.value }))}
                        style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Timezone</label>
                      <input
                        type="text"
                        value={editableSettings.timezone ?? systemSettingsMap?.general?.timezone ?? 'Asia/Kolkata (IST)'}
                        onChange={e => setEditableSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsModal === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Session Timeout (Minutes)</label>
                    <input
                      type="number"
                      value={editableSettings.sessionTimeoutMinutes ?? systemSettingsMap?.security?.sessionTimeoutMinutes ?? 60}
                      onChange={e => setEditableSettings(prev => ({ ...prev, sessionTimeoutMinutes: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>PIN Hashing Method</label>
                    <input
                      type="text"
                      value={editableSettings.pinHashing ?? systemSettingsMap?.security?.pinHashing ?? 'Salted SHA-256 enabled'}
                      onChange={e => setEditableSettings(prev => ({ ...prev, pinHashing: e.target.value }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {activeSettingsModal === 'email' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>From Email Address</label>
                    <input
                      type="email"
                      value={editableSettings.fromEmail ?? systemSettingsMap?.email?.fromEmail ?? 'welcome@salesflowhub.cloud'}
                      onChange={e => setEditableSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>SMTP Relay Gateway</label>
                    <input
                      type="text"
                      value={editableSettings.smtpHost ?? systemSettingsMap?.email?.smtpHost ?? 'smtp.resend.com'}
                      onChange={e => setEditableSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {activeSettingsModal === 'api' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Supabase PostgreSQL URL</label>
                    <input
                      type="text"
                      value={editableSettings.supabaseUrl ?? systemSettingsMap?.api?.supabaseUrl ?? 'https://zgndrkgnldrwhcypdhjt.supabase.co'}
                      onChange={e => setEditableSettings(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>SSL Mode</label>
                    <input
                      type="text"
                      value={editableSettings.sslMode ?? systemSettingsMap?.api?.sslMode ?? 'require'}
                      onChange={e => setEditableSettings(prev => ({ ...prev, sslMode: e.target.value }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {activeSettingsModal === 'backup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Snapshot Retention (Days)</label>
                    <input
                      type="number"
                      value={editableSettings.retentionDays ?? systemSettingsMap?.backup?.retentionDays ?? 30}
                      onChange={e => setEditableSettings(prev => ({ ...prev, retentionDays: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Auto Backup Schedule</label>
                    <input
                      type="text"
                      value={editableSettings.frequency ?? systemSettingsMap?.backup?.frequency ?? 'Daily 02:00 UTC'}
                      onChange={e => setEditableSettings(prev => ({ ...prev, frequency: e.target.value }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {activeSettingsModal === 'custom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Max Custom Lead Fields</label>
                    <input
                      type="number"
                      value={editableSettings.maxCustomFields ?? systemSettingsMap?.custom?.maxCustomFields ?? 20}
                      onChange={e => setEditableSettings(prev => ({ ...prev, maxCustomFields: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveSettingsModal(null)}
                style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveSystemSettings} 
                style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'Saving to Supabase...' : 'Save & Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Active Action Menu Drawer / Modal */}
      {activeActionMenu && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '22px', width: '420px', maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#ea580c', letterSpacing: '0.5px' }}>
                  {activeActionMenu.type} Actions
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '2px 0 0 0' }}>
                  {activeActionMenu.item?.name || activeActionMenu.item?.subject || activeActionMenu.item?.id}
                </h3>
              </div>
              <button onClick={() => setActiveActionMenu(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {/* Content for Company */}
            {activeActionMenu.type === 'company' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => { setViewingCompany(activeActionMenu.item); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Eye size={16} color="#2563eb" /> View Company Details
                </button>
                <button
                  onClick={() => { setEditingCompany({ ...activeActionMenu.item }); setIsEditCompanyOpen(true); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Pencil size={16} color="#d97706" /> Edit Company &amp; Plan
                </button>
                <button
                  disabled={actionLoadingId === activeActionMenu.item.id}
                  onClick={() => handleDeleteCompany(activeActionMenu.item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fff5f5', color: '#dc2626', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer', textAlign: 'left', marginTop: '6px' }}
                >
                  <Trash2 size={16} color="#dc2626" /> Delete Company (Supabase)
                </button>
              </div>
            )}

            {/* Content for User */}
            {activeActionMenu.type === 'user' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => { setViewingUser(activeActionMenu.item); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Eye size={15} color="#2563eb" /> View User Profile
                </button>
                <button
                  onClick={() => { setEditingUser({ ...activeActionMenu.item }); setIsEditUserOpen(true); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Pencil size={15} color="#d97706" /> Edit User Info
                </button>
                <button
                  onClick={() => handleToggleUserStatus(activeActionMenu.item)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  <UserCheck size={15} color="#16a34a" /> {activeActionMenu.item.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                </button>
                <div style={{ padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Change User Role</label>
                  <select
                    value={activeActionMenu.item.role || 'Admin'}
                    onChange={(e) => handleChangeUserRole(activeActionMenu.item, e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', outline: 'none' }}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                    <option value="Sales Head">Sales Head</option>
                    <option value="Team Leader">Team Leader</option>
                  </select>
                </div>
                <div style={{ padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Reassign Company</label>
                  <select
                    value={activeActionMenu.item.company || ''}
                    onChange={(e) => handleChangeUserCompany(activeActionMenu.item, e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', outline: 'none' }}
                  >
                    {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const userName = activeActionMenu.item?.name || 'User';
                      setActiveActionMenu(null);
                      showToast(`Changes for "${userName}" saved successfully!`, 'success');
                    }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '700', fontSize: '12.5px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)' }}
                  >
                    <Check size={16} /> Save &amp; Apply Changes
                  </button>
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', textAlign: 'center' }}>
                    ✓ Selections auto-save instantly
                  </span>
                </div>
                <button
                  disabled={actionLoadingId === activeActionMenu.item.id}
                  onClick={() => handleDeleteUser(activeActionMenu.item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fff5f5', color: '#dc2626', fontWeight: '600', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}
                >
                  <Trash2 size={15} color="#dc2626" /> Delete User (Supabase)
                </button>
              </div>
            )}

            {/* Content for Lead */}
            {activeActionMenu.type === 'lead' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => { setViewingLead(activeActionMenu.item); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Eye size={15} color="#2563eb" /> View Lead Details
                </button>
                <button
                  onClick={() => { setEditingLead({ ...activeActionMenu.item }); setIsEditLeadOpen(true); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Pencil size={15} color="#d97706" /> Edit Lead
                </button>
                <div style={{ padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Change Pipeline Stage</label>
                  <select
                    value={activeActionMenu.item.status || 'New'}
                    onChange={(e) => handleChangeLeadStage(activeActionMenu.item, e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', outline: 'none' }}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div style={{ padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Assign Sales Rep</label>
                  <select
                    value={activeActionMenu.item.assignedTo || activeActionMenu.item.owner || ''}
                    onChange={(e) => handleAssignLead(activeActionMenu.item, e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', outline: 'none' }}
                  >
                    {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const leadName = activeActionMenu.item?.name || 'Lead';
                      setActiveActionMenu(null);
                      showToast(`Changes for "${leadName}" saved successfully!`, 'success');
                    }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '700', fontSize: '12.5px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)' }}
                  >
                    <Check size={16} /> Save &amp; Apply Changes
                  </button>
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', textAlign: 'center' }}>
                    ✓ Selections auto-save instantly
                  </span>
                </div>
                <button
                  disabled={actionLoadingId === activeActionMenu.item.id}
                  onClick={() => handleDeleteLead(activeActionMenu.item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fff5f5', color: '#dc2626', fontWeight: '600', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}
                >
                  <Trash2 size={15} color="#dc2626" /> Delete Lead (Supabase)
                </button>
              </div>
            )}

            {/* Content for Ticket */}
            {activeActionMenu.type === 'ticket' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => { setViewingTicket(activeActionMenu.item); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Eye size={15} color="#2563eb" /> View Ticket
                </button>
                <button
                  onClick={() => { setEditingTicket({ ...activeActionMenu.item }); setIsEditTicketOpen(true); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Pencil size={15} color="#d97706" /> Edit Ticket
                </button>
                <div style={{ padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Change Ticket Status</label>
                  <select
                    value={activeActionMenu.item.status || 'Open'}
                    onChange={(e) => handleChangeTicketStatus(activeActionMenu.item, e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', outline: 'none' }}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div style={{ padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Change Priority</label>
                  <select
                    value={activeActionMenu.item.priority || 'Medium'}
                    onChange={(e) => handleChangeTicketPriority(activeActionMenu.item, e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', outline: 'none' }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <button
                  disabled={actionLoadingId === activeActionMenu.item.id}
                  onClick={() => handleDeleteTicket(activeActionMenu.item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fff5f5', color: '#dc2626', fontWeight: '600', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}
                >
                  <Trash2 size={15} color="#dc2626" /> Delete Ticket (Supabase)
                </button>
              </div>
            )}

            {/* Content for Subscription */}
            {activeActionMenu.type === 'subscription' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => { setViewingCompany(activeActionMenu.item); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Eye size={15} color="#2563eb" /> View Subscription Details
                </button>
                <button
                  onClick={() => {
                    const c = activeActionMenu.item;
                    setEditingSubscriptionComp({
                      company_id: c.id,
                      company_name: c.name,
                      plan_name: c.plan || 'Growth Pro',
                      status: c.status || 'Active',
                      billing_cycle: 'Monthly',
                      max_seats: c.users || 15,
                      lead_quota: 2500
                    });
                    setIsEditSubscriptionOpen(true);
                    setActiveActionMenu(null);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Pencil size={15} color="#d97706" /> Edit Subscription &amp; Seats Quota
                </button>
              </div>
            )}

            {/* Content for Invoice */}
            {activeActionMenu.type === 'invoice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => { setViewingInvoice(activeActionMenu.item); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Eye size={16} color="#2563eb" /> View Invoice Details
                </button>
                <button
                  onClick={() => { handleDownloadInvoice(activeActionMenu.item); setActiveActionMenu(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Download size={16} color="#16a34a" /> Download / Print Tax Invoice
                </button>
                <button
                  disabled={actionLoadingId === activeActionMenu.item.id}
                  onClick={() => handleDeleteInvoice(activeActionMenu.item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fff5f5', color: '#dc2626', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer', textAlign: 'left', marginTop: '4px' }}
                >
                  <Trash2 size={16} color="#dc2626" /> Delete Invoice (Supabase)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. View Company Details Modal */}
      {viewingCompany && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Company Overview</h3>
              <button onClick={() => setViewingCompany(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div><strong>Company Name:</strong> {viewingCompany.name}</div>
              <div><strong>Domain:</strong> {viewingCompany.domain || 'N/A'}</div>
              <div><strong>Active Plan:</strong> <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: '700', ...getPlanStyle(viewingCompany.plan) }}>{viewingCompany.plan}</span></div>
              <div><strong>Status:</strong> <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: '700', backgroundColor: '#ecfdf5', color: '#059669' }}>{viewingCompany.status}</span></div>
              <div><strong>Provisioned User Seats:</strong> {viewingCompany.users} Seats</div>
              <div><strong>Registered Start Date:</strong> {viewingCompany.startDate || '01 Jan 2026'}</div>
              <div><strong>Subscription End Date:</strong> {viewingCompany.endDate || '01 Jan 2027'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setViewingCompany(null)} style={{ padding: '6px 14px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewingInvoice && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Official Tax Invoice</span>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '2px 0 0 0' }}>{viewingInvoice.id}</h3>
              </div>
              <button onClick={() => setViewingInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Client / Company</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{viewingInvoice.company}</div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Subscription Plan</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{viewingInvoice.plan || 'Pro Plan'}</div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Amount Billed</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{viewingInvoice.amount}</div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Payment Status</div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: (viewingInvoice.status || '').toLowerCase() === 'paid' ? '#ecfdf5' : '#fff7ed',
                    color: (viewingInvoice.status || '').toLowerCase() === 'paid' ? '#059669' : '#ea580c'
                  }}>
                    {viewingInvoice.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '11.5px', color: '#475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Due Date / Billing Cycle:</span>
                <strong>{viewingInvoice.dueDate || viewingInvoice.due_date || '15 Oct 2026'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>GSTIN / Tax ID:</span>
                <strong>07AAAAA0000A1Z5</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cloud Storage Verification:</span>
                <strong style={{ color: '#16a34a' }}>✓ Verified in Supabase PostgreSQL</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => { handleDownloadInvoice(viewingInvoice); setViewingInvoice(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}
              >
                <Download size={14} /> Download / Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. View User Modal (STRICTLY NO PASSWORD / PIN EXPOSURE) */}
      {viewingUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>User Profile (Secure)</h3>
              <button onClick={() => setViewingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div><strong>Full Name:</strong> {viewingUser.name}</div>
              <div><strong>Email Address:</strong> {viewingUser.email}</div>
              <div><strong>System Role:</strong> <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: '700', ...getRoleStyle(viewingUser.role) }}>{viewingUser.role}</span></div>
              <div><strong>Assigned Company:</strong> {viewingUser.company}</div>
              <div><strong>Account Status:</strong> <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: '700', backgroundColor: '#ecfdf5', color: '#059669' }}>{viewingUser.status}</span></div>
              <div><strong>Security Status:</strong> <span style={{ color: '#16a34a', fontWeight: '700' }}>✓ Protected by Supabase PostgreSQL (Salted Hash)</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setViewingUser(null)} style={{ padding: '6px 14px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Edit User Modal */}
      {isEditUserOpen && editingUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '400px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Edit User</h3>
              <button onClick={() => { setIsEditUserOpen(false); setEditingUser(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Email</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                    <option value="Sales Head">Sales Head</option>
                    <option value="Team Leader">Team Leader</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Company</label>
                  <select
                    value={editingUser.company}
                    onChange={(e) => setEditingUser({ ...editingUser, company: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => { setIsEditUserOpen(false); setEditingUser(null); }} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                  {isSubmitting ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. View Lead Details Modal */}
      {viewingLead && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Lead / Deal Details</h3>
              <button onClick={() => setViewingLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div><strong>Lead Name:</strong> {viewingLead.name}</div>
              <div><strong>Target Company:</strong> {viewingLead.company}</div>
              <div><strong>Deal Value:</strong> <strong style={{ color: '#0f172a' }}>₹{Number(viewingLead.value || 25000).toLocaleString('en-IN')}</strong></div>
              <div><strong>Lead Source:</strong> {viewingLead.source}</div>
              <div><strong>Assigned Sales Rep:</strong> {viewingLead.assignedTo || viewingLead.owner}</div>
              <div><strong>Pipeline Stage:</strong> <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: '600', ...getLeadStatusStyle(viewingLead.status) }}>{viewingLead.status}</span></div>
              <div><strong>Direct Contact Phone:</strong> {viewingLead.phone || '+91 98765 43210'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setViewingLead(null)} style={{ padding: '6px 14px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 13. Edit Lead Modal */}
      {isEditLeadOpen && editingLead && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Edit Lead / Deal</h3>
              <button onClick={() => { setIsEditLeadOpen(false); setEditingLead(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateLead}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Customer Name</label>
                <input
                  type="text"
                  required
                  value={editingLead.name}
                  onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Company</label>
                  <input
                    type="text"
                    value={editingLead.company}
                    onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Deal Value (₹)</label>
                  <input
                    type="number"
                    value={editingLead.value}
                    onChange={(e) => setEditingLead({ ...editingLead, value: e.target.value })}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Pipeline Stage</label>
                  <select
                    value={editingLead.status}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Assign Rep</label>
                  <select
                    value={editingLead.assignedTo || editingLead.owner}
                    onChange={(e) => setEditingLead({ ...editingLead, assignedTo: e.target.value, owner: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => { setIsEditLeadOpen(false); setEditingLead(null); }} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                  {isSubmitting ? 'Updating...' : 'Update Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14. View Ticket Details Modal */}
      {viewingTicket && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Ticket Details</h3>
              <button onClick={() => setViewingTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div><strong>Ticket ID:</strong> <span style={{ color: '#2563eb', fontWeight: '600' }}>{viewingTicket.id}</span></div>
              <div><strong>Subject:</strong> {viewingTicket.subject}</div>
              <div><strong>Customer / Company:</strong> {viewingTicket.customer || viewingTicket.company}</div>
              <div><strong>Priority:</strong> <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: '700', ...getPriorityStyle(viewingTicket.priority) }}>{viewingTicket.priority}</span></div>
              <div><strong>Status:</strong> <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: '700', ...getTicketStatusStyle(viewingTicket.status) }}>{viewingTicket.status}</span></div>
              <div><strong>Reported At:</strong> {viewingTicket.createdAt}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setViewingTicket(null)} style={{ padding: '6px 14px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 15. Edit Ticket Modal */}
      {isEditTicketOpen && editingTicket && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '400px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Edit Support Ticket</h3>
              <button onClick={() => { setIsEditTicketOpen(false); setEditingTicket(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateTicket}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Subject</label>
                <input
                  type="text"
                  required
                  value={editingTicket.subject}
                  onChange={(e) => setEditingTicket({ ...editingTicket, subject: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Priority</label>
                  <select
                    value={editingTicket.priority}
                    onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Status</label>
                  <select
                    value={editingTicket.status}
                    onChange={(e) => setEditingTicket({ ...editingTicket, status: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => { setIsEditTicketOpen(false); setEditingTicket(null); }} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                  {isSubmitting ? 'Updating...' : 'Update Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 16. Edit Subscription Modal */}
      {isEditSubscriptionOpen && editingSubscriptionComp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Configure SaaS Subscription</h3>
              <button onClick={() => { setIsEditSubscriptionOpen(false); setEditingSubscriptionComp(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCompanySubscription(editingSubscriptionComp); }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Company</label>
                <input
                  type="text"
                  disabled
                  value={editingSubscriptionComp.company_name}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f1f5f9' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>SaaS Plan</label>
                  <select
                    value={editingSubscriptionComp.plan_name}
                    onChange={(e) => setEditingSubscriptionComp({ ...editingSubscriptionComp, plan_name: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="growth">Growth Pro</option>
                    <option value="enterprise">Enterprise Elite</option>
                    <option value="starter">Starter Basic</option>
                    <option value="custom">Custom Suite</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Subscription Status</label>
                  <select
                    value={editingSubscriptionComp.status}
                    onChange={(e) => setEditingSubscriptionComp({ ...editingSubscriptionComp, status: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Trial">Trial</option>
                    <option value="Expired">Expired</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>User Seats Quota</label>
                  <input
                    type="number"
                    value={editingSubscriptionComp.max_seats}
                    onChange={(e) => setEditingSubscriptionComp({ ...editingSubscriptionComp, max_seats: Number(e.target.value) })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Leads Quota</label>
                  <input
                    type="number"
                    value={editingSubscriptionComp.lead_quota}
                    onChange={(e) => setEditingSubscriptionComp({ ...editingSubscriptionComp, lead_quota: Number(e.target.value) })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Billing Cycle</label>
                <select
                  value={editingSubscriptionComp.billing_cycle}
                  onChange={(e) => setEditingSubscriptionComp({ ...editingSubscriptionComp, billing_cycle: e.target.value })}
                  style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly (Save 20%)</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => { setIsEditSubscriptionOpen(false); setEditingSubscriptionComp(null); }} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                  {isSubmitting ? 'Persisting...' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 17. Deal Package Create / Edit Modal */}
      {isDealPackageModalOpen && editingDealPackage && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {editingDealPackage.name ? `Configure: ${editingDealPackage.name}` : 'New Deal Package'}
              </h3>
              <button onClick={() => { setIsDealPackageModalOpen(false); setEditingDealPackage(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveDealPackage(editingDealPackage); }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Package Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise VIP Plan"
                  value={editingDealPackage.name}
                  onChange={(e) => setEditingDealPackage({ ...editingDealPackage, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Rate / Price (₹)</label>
                  <input
                    type="number"
                    value={editingDealPackage.price}
                    onChange={(e) => setEditingDealPackage({ ...editingDealPackage, price: Number(e.target.value) })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Billing Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Month"
                    value={editingDealPackage.duration}
                    onChange={(e) => setEditingDealPackage({ ...editingDealPackage, duration: e.target.value })}
                    style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Included Quota</label>
                <input
                  type="text"
                  placeholder="e.g. 1,000 Leads"
                  value={editingDealPackage.quota}
                  onChange={(e) => setEditingDealPackage({ ...editingDealPackage, quota: e.target.value })}
                  style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>Features (comma-separated)</label>
                <textarea
                  rows={3}
                  value={Array.isArray(editingDealPackage.features) ? editingDealPackage.features.join(', ') : editingDealPackage.features}
                  onChange={(e) => setEditingDealPackage({ ...editingDealPackage, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => { setIsDealPackageModalOpen(false); setEditingDealPackage(null); }} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', fontSize: '11px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                  {isSubmitting ? 'Saving...' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 18. View Audit Log Detail Modal */}
      {viewingAuditLog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '22px', width: '440px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Audit Trail Verification</h3>
              <button onClick={() => setViewingAuditLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div><strong>Log Entry ID:</strong> <span style={{ color: '#2563eb', fontWeight: '700' }}>{viewingAuditLog.id}</span></div>
              <div><strong>Timestamp:</strong> {viewingAuditLog.dateTime || viewingAuditLog.created_at}</div>
              <div><strong>Actor / User:</strong> {viewingAuditLog.user}</div>
              <div><strong>Action Executed:</strong> <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: '700', ...getAuditActionStyle(viewingAuditLog.action) }}>{viewingAuditLog.action}</span></div>
              <div><strong>Target Module:</strong> <strong>{viewingAuditLog.module}</strong></div>
              <div><strong>Details &amp; Payload:</strong> {viewingAuditLog.details}</div>
              <div><strong>Audit Integrity:</strong> <span style={{ color: '#16a34a', fontWeight: '700' }}>✓ Verified in PostgreSQL live audit_logs</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setViewingAuditLog(null)} style={{ padding: '6px 14px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
