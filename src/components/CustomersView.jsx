import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Search, Filter, Calendar, Phone, Mail, Award, Clock, ArrowUpRight, DollarSign } from 'lucide-react';

export function CustomersView({ currentUser }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = sessionStorage.getItem('crm_auth_token') || localStorage.getItem('crm_auth_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/customers', { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Metrics
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + (Number(c.totalRevenue || c.dealValue) || 0), 0);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  const renewals30Days = customers.filter(c => {
    if (!c.renewalDate) return false;
    const rDate = new Date(c.renewalDate);
    return rDate >= now && rDate <= thirtyDaysFromNow;
  }).length;

  const renewals15Days = customers.filter(c => {
    if (!c.renewalDate) return false;
    const rDate = new Date(c.renewalDate);
    return rDate >= now && rDate <= fifteenDaysFromNow;
  }).length;

  // Filtered
  const filteredCustomers = customers.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'due_30') {
      if (!c.renewalDate) return false;
      const rDate = new Date(c.renewalDate);
      return rDate >= now && rDate <= thirtyDaysFromNow;
    }
    if (statusFilter === 'due_15') {
      if (!c.renewalDate) return false;
      const rDate = new Date(c.renewalDate);
      return rDate >= now && rDate <= fifteenDaysFromNow;
    }
    if (statusFilter === 'active') {
      return c.status === 'active';
    }

    return true;
  });

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100%', boxSizing: 'border-box' }}>
      {/* Top Banner */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Customer Directory & Renewals Hub
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Post-Won Account Management, Realized Revenue & Annual Renewal Pipeline
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '7px',
            color: '#334155',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Active Customers</span>
            <Users size={18} color="#2563eb" />
          </div>
          <strong style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{totalCustomers}</strong>
          <span style={{ fontSize: '11px', color: '#16a34a', display: 'block', marginTop: '4px', fontWeight: '600' }}>100% Won & Realized</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Realized Revenue</span>
            <DollarSign size={18} color="#10b981" />
          </div>
          <strong style={{ fontSize: '24px', fontWeight: '800', color: '#059669' }}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </strong>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>Fully Paid Commercial Value</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#9a3412', textTransform: 'uppercase' }}>Renewals (30 Days)</span>
            <Calendar size={18} color="#ea580c" />
          </div>
          <strong style={{ fontSize: '24px', fontWeight: '800', color: '#ea580c' }}>{renewals30Days}</strong>
          <span style={{ fontSize: '11px', color: '#c2410c', display: 'block', marginTop: '4px', fontWeight: '600' }}>Next 30 Days Pipeline</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' }}>Urgent (15 Days)</span>
            <Clock size={18} color="#dc2626" />
          </div>
          <strong style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626' }}>{renewals15Days}</strong>
          <span style={{ fontSize: '11px', color: '#b91c1c', display: 'block', marginTop: '4px', fontWeight: '600' }}>Immediate Outreach</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '14px 18px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '400px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, company, phone or email..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '7px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '7px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              outline: 'none',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Accounts</option>
            <option value="active">Active Accounts</option>
            <option value="due_30">Due in 30 Days</option>
            <option value="due_15">Due in 15 Days</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            Loading customer accounts...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#334155', margin: '0 0 6px 0' }}>No Customer Accounts Found</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'When leads are marked Won with 100% payment, they automatically convert to active customers here.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Customer & Company</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Contact</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Deal Value</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Won Date</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Renewal Date</th>
                <th style={{ padding: '12px 169px', fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Account Manager</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(cust => {
                const daysRemaining = cust.renewalDate ? Math.ceil((new Date(cust.renewalDate) - now) / (1000 * 60 * 60 * 24)) : null;

                return (
                  <tr key={cust.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ display: 'block', color: '#0f172a', fontWeight: '700' }}>{cust.name}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{cust.company || 'Direct Client'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {cust.phone && <div style={{ fontSize: '12px', color: '#334155' }}>📞 {cust.phone}</div>}
                      {cust.email && <div style={{ fontSize: '12px', color: '#64748b' }}>✉️ {cust.email}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: '#059669', fontWeight: '800' }}>
                        ₹{(Number(cust.totalRevenue || cust.dealValue) || 0).toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      {cust.wonDate || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{cust.renewalDate || '—'}</span>
                        {daysRemaining !== null && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            backgroundColor: daysRemaining <= 15 ? '#fee2e2' : daysRemaining <= 30 ? '#ffedd5' : '#ecfdf5',
                            color: daysRemaining <= 15 ? '#b91c1c' : daysRemaining <= 30 ? '#c2410c' : '#047857'
                          }}>
                            {daysRemaining <= 0 ? 'Overdue' : `${daysRemaining}d left`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155', fontWeight: '500' }}>
                      {cust.accountManager || 'Harsh Goyal'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #bbf7d0'
                      }}>
                        Active Account
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
