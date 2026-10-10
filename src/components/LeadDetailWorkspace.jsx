import React, { useState, useEffect, useCallback } from "react";
import {
  X, Phone, Mail, MapPin, Building2, User, Calendar, DollarSign,
  Clock, ChevronRight, Plus, Send, MessageSquare, FileText,
  PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Video, Users, MapPinned, Target, TrendingUp, CheckCircle2,
  AlertCircle, Tag, Star, Edit3, Save, XCircle, Loader2,
  ArrowUpRight, ArrowDownLeft, CalendarDays, CalendarClock,
  CreditCard, Banknote, IndianRupee, Receipt, Filter,
  RefreshCw, MoreHorizontal, CircleDot, Bookmark, Hash
} from "lucide-react";

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';

const STAGE_COLORS = {
  'New': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  'Contacted': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  'Qualified': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'Demo Scheduled': { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  'Demo Done': { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  'Proposal Sent': { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
  'Negotiation': { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  'Payment Follow-up': { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  'Won': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  'Lost': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  'Junk': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

const PRIORITY_COLORS = {
  'Hot': { bg: '#fef2f2', text: '#dc2626' },
  'High': { bg: '#fff7ed', text: '#ea580c' },
  'Medium': { bg: '#fefce8', text: '#ca8a04' },
  'Low': { bg: '#f0fdf4', text: '#16a34a' },
};

const CALL_OUTCOMES = ['Connected', 'No Answer', 'Busy', 'Callback Requested', 'Interested', 'Not Interested', 'Qualified', 'Other'];
const NOTE_CATEGORIES = ['General', 'Important', 'Follow-up', 'Internal'];
const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Payment', 'Demo', 'Other'];
const MEETING_TYPES = ['Call', 'Online Demo', 'Offline Demo', 'Visit', 'Other'];

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function formatDateTime(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

function formatCurrency(v) {
  const n = Number(v) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// Activity type icon and color
function getActivityIcon(type) {
  switch (type) {
    case 'call': case 'call_logged': return { icon: PhoneCall, color: '#2563eb', bg: '#dbeafe' };
    case 'call_incoming': return { icon: PhoneIncoming, color: '#16a34a', bg: '#dcfce7' };
    case 'call_outgoing': return { icon: PhoneOutgoing, color: '#2563eb', bg: '#dbeafe' };
    case 'call_missed': return { icon: PhoneMissed, color: '#dc2626', bg: '#fee2e2' };
    case 'note': case 'note_added': return { icon: FileText, color: '#7c3aed', bg: '#ede9fe' };
    case 'email': return { icon: Mail, color: '#0891b2', bg: '#cffafe' };
    case 'meeting_scheduled': return { icon: Calendar, color: '#db2777', bg: '#fce7f3' };
    case 'meeting_completed': return { icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' };
    case 'stage_change': return { icon: ArrowUpRight, color: '#ea580c', bg: '#ffedd5' };
    case 'payment': case 'payment_received': return { icon: IndianRupee, color: '#16a34a', bg: '#dcfce7' };
    case 'followup': case 'followup_created': return { icon: CalendarClock, color: '#ca8a04', bg: '#fef9c3' };
    case 'assignment': return { icon: Users, color: '#6366f1', bg: '#e0e7ff' };
    default: return { icon: CircleDot, color: '#64748b', bg: '#f1f5f9' };
  }
}

// ─────────────────────────────────────────
//  OVERVIEW TAB
// ─────────────────────────────────────────
function OverviewTab({ lead, currentUser, allUsers, onUpdateLead }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const stageStyle = STAGE_COLORS[lead.status] || STAGE_COLORS['New'];
  const priorityStyle = PRIORITY_COLORS[lead.score] || PRIORITY_COLORS['Medium'];
  const dealValue = Number(lead.value) || 0;
  const paidAmount = Number(lead.paidAmount) || 0;
  const pendingAmount = Math.max(0, dealValue - paidAmount);
  const paymentPercent = dealValue > 0 ? Math.min(100, (paidAmount / dealValue) * 100) : 0;

  const startEdit = () => {
    setEditData({
      name: lead.name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city: lead.city || '',
      source: lead.source || '',
      value: lead.value || '',
      score: lead.score || 'Medium',
      probability: lead.probability || '',
      expectedCloseDate: lead.expectedCloseDate || '',
      owner: lead.owner || '',
    });
    setIsEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await onUpdateLead(lead.id, editData);
      setIsEditing(false);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  const InfoRow = ({ icon: Icon, label, value, href, editable, field, type }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
      <Icon size={15} color="#94a3b8" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', minWidth: '90px' }}>{label}</span>
      {isEditing && editable ? (
        <input
          type={type || 'text'}
          value={editData[field] || ''}
          onChange={e => setEditData(p => ({ ...p, [field]: e.target.value }))}
          style={{ flex: 1, fontSize: '13px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontFamily: 'inherit' }}
        />
      ) : (
        href ? (
          <a href={href} style={{ flex: 1, fontSize: '13px', color: '#2563eb', fontWeight: '500', textDecoration: 'none' }}>{value || '—'}</a>
        ) : (
          <span style={{ flex: 1, fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>{value || '—'}</span>
        )
      )}
    </div>
  );

  return (
    <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
      {/* Header Card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: '800', flexShrink: 0 }}>
          {getInitials(lead.name)}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{lead.name || 'Unknown Lead'}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            {lead.company && <span style={{ fontSize: '12px', color: '#64748b' }}>{lead.company}</span>}
            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', backgroundColor: stageStyle.bg, color: stageStyle.text, border: `1px solid ${stageStyle.border}` }}>{lead.status || 'New'}</span>
            {lead.score && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: priorityStyle.bg, color: priorityStyle.text }}>{lead.score}</span>}
          </div>
        </div>
        <button
          onClick={isEditing ? saveEdit : startEdit}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: isEditing ? '#2563eb' : '#fff', color: isEditing ? '#fff' : '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
        >
          {saving ? <Loader2 size={14} className="spin" /> : isEditing ? <><Save size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
        </button>
        {isEditing && (
          <button onClick={() => setIsEditing(false)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>
            <XCircle size={14} />
          </button>
        )}
      </div>

      {/* Financial Ledger */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Ledger</span>
          <span style={{
            fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px',
            backgroundColor: paymentPercent >= 100 ? '#dcfce7' : paidAmount > 0 ? '#fef3c7' : '#fee2e2',
            color: paymentPercent >= 100 ? '#166534' : paidAmount > 0 ? '#92400e' : '#991b1b'
          }}>
            {paymentPercent >= 100 ? 'PAID IN FULL' : paidAmount > 0 ? 'PARTIALLY PAID' : 'UNPAID'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
          <div style={{ textAlign: 'center', backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Deal Value</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{formatCurrency(dealValue)}</div>
          </div>
          <div style={{ textAlign: 'center', backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '500' }}>Paid</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>{formatCurrency(paidAmount)}</div>
          </div>
          <div style={{ textAlign: 'center', backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '500' }}>Pending</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#dc2626' }}>{formatCurrency(pendingAmount)}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${paymentPercent}%`, backgroundColor: paymentPercent >= 100 ? '#16a34a' : '#f59e0b', borderRadius: '3px', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>{paymentPercent.toFixed(0)}% collected</div>
      </div>

      {/* Contact Info */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Information</h4>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 14px' }}>
          <InfoRow icon={Phone} label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : null} editable field="phone" />
          <InfoRow icon={Mail} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : null} editable field="email" />
          <InfoRow icon={MapPin} label="City" value={lead.city} editable field="city" />
          <InfoRow icon={Building2} label="Company" value={lead.company} editable field="company" />
          <InfoRow icon={Tag} label="Source" value={lead.source} editable field="source" />
        </div>
      </div>

      {/* Sales Info */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sales Information</h4>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 14px' }}>
          <InfoRow icon={DollarSign} label="Deal Value" value={formatCurrency(dealValue)} editable field="value" type="number" />
          <InfoRow icon={Target} label="Probability" value={lead.probability ? `${lead.probability}%` : '—'} editable field="probability" type="number" />
          <InfoRow icon={CalendarDays} label="Expected Close" value={formatDate(lead.expectedCloseDate)} editable field="expectedCloseDate" type="date" />
          <InfoRow icon={Star} label="Priority" value={lead.score} />
          <InfoRow icon={User} label="Assigned To" value={lead.owner} />
          <InfoRow icon={Calendar} label="Created" value={formatDate(lead.createdAt)} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  ACTIVITY & TIMELINE TAB
// ─────────────────────────────────────────
function ActivityTab({ lead, currentUser }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCallForm, setShowCallForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Call form state
  const [callData, setCallData] = useState({ callType: 'Outgoing', outcome: 'Connected', duration: '', notes: '', nextFollowup: '' });
  // Note form state
  const [noteData, setNoteData] = useState({ text: '', category: 'General' });

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/activities?lead_id=${lead.id}`, { credentials: 'include' });
      const data = await res.json();
      // Merge with lead's embedded activities array
      const embeddedActs = Array.isArray(lead.activities) ? lead.activities.map(a => ({
        ...a,
        id: a.id || `emb_${Math.random().toString(36).substr(2,8)}`,
        activity_type: a.type || a.activity_type || 'note',
        title: a.title || a.type || 'Activity',
        description: a.note || a.description || a.notes || '',
        user_name: a.user || a.user_name || 'System',
        created_at: a.date || a.timestamp || a.created_at || lead.createdAt,
      })) : [];
      const apiActs = Array.isArray(data.activities) ? data.activities : [];
      const allActs = [...apiActs, ...embeddedActs];
      // Deduplicate by id
      const seen = new Set();
      const unique = allActs.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
      unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setActivities(unique);
    } catch (e) {
      console.error('Error fetching activities:', e);
      // Fallback to lead's embedded activities
      const embeddedActs = Array.isArray(lead.activities) ? lead.activities.map(a => ({
        ...a,
        id: a.id || `emb_${Math.random().toString(36).substr(2,8)}`,
        activity_type: a.type || a.activity_type || 'note',
        title: a.title || a.type || 'Activity',
        description: a.note || a.description || '',
        user_name: a.user || a.user_name || 'System',
        created_at: a.date || a.timestamp || a.created_at || lead.createdAt,
      })) : [];
      setActivities(embeddedActs);
    }
    setLoading(false);
  }, [lead.id, lead.activities]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const handleLogCall = async () => {
    if (!callData.outcome) return;
    setSubmitting(true);
    try {
      const actType = callData.callType === 'Incoming' ? 'call_incoming' : callData.callType === 'Missed' ? 'call_missed' : 'call_outgoing';
      await fetch(`${API_BASE}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lead_id: lead.id,
          user_id: currentUser?.id,
          user_name: currentUser?.name || 'User',
          activity_type: actType,
          title: `${callData.callType} Call — ${callData.outcome}`,
          description: callData.notes || '',
          metadata: { call_type: callData.callType, outcome: callData.outcome, duration: callData.duration },
          outcome: callData.outcome,
          duration: callData.duration ? parseInt(callData.duration) : null,
          next_followup_date: callData.nextFollowup || null,
        })
      });
      setCallData({ callType: 'Outgoing', outcome: 'Connected', duration: '', notes: '', nextFollowup: '' });
      setShowCallForm(false);
      fetchActivities();
    } catch (e) { console.error('Log call error:', e); }
    setSubmitting(false);
  };

  const handleAddNote = async () => {
    if (!noteData.text.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lead_id: lead.id,
          user_id: currentUser?.id,
          user_name: currentUser?.name || 'User',
          activity_type: 'note_added',
          title: `${noteData.category} Note`,
          description: noteData.text,
          metadata: { category: noteData.category },
        })
      });
      setNoteData({ text: '', category: 'General' });
      setShowNoteForm(false);
      fetchActivities();
    } catch (e) { console.error('Add note error:', e); }
    setSubmitting(false);
  };

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'call', label: 'Calls' },
    { key: 'note', label: 'Notes' },
    { key: 'meeting', label: 'Meetings' },
    { key: 'payment', label: 'Payments' },
    { key: 'stage', label: 'Stage Changes' },
  ];

  const filtered = filter === 'all' ? activities : activities.filter(a => {
    const t = a.activity_type || '';
    if (filter === 'call') return t.includes('call');
    if (filter === 'note') return t.includes('note');
    if (filter === 'meeting') return t.includes('meeting');
    if (filter === 'payment') return t.includes('payment');
    if (filter === 'stage') return t.includes('stage');
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Action Buttons + Filters */}
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button onClick={() => { setShowCallForm(!showCallForm); setShowNoteForm(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: showCallForm ? '#2563eb' : '#fff', color: showCallForm ? '#fff' : '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            <PhoneCall size={14} /> Log Call
          </button>
          <button onClick={() => { setShowNoteForm(!showNoteForm); setShowCallForm(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: showNoteForm ? '#7c3aed' : '#fff', color: showNoteForm ? '#fff' : '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            <FileText size={14} /> Add Note
          </button>
          <button onClick={fetchActivities} title="Refresh" style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', cursor: 'pointer' }}>
            <RefreshCw size={14} />
          </button>
        </div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '3px 10px', borderRadius: '14px', border: '1px solid ' + (filter === f.key ? '#2563eb' : '#e2e8f0'), backgroundColor: filter === f.key ? '#eff6ff' : '#fff', color: filter === f.key ? '#2563eb' : '#64748b', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log Call Form */}
      {showCallForm && (
        <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Log Call</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Call Type</label>
              <select value={callData.callType} onChange={e => setCallData(p => ({ ...p, callType: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit' }}>
                <option>Outgoing</option>
                <option>Incoming</option>
                <option>Missed</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Outcome *</label>
              <select value={callData.outcome} onChange={e => setCallData(p => ({ ...p, outcome: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit' }}>
                {CALL_OUTCOMES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Duration (min)</label>
              <input type="number" value={callData.duration} onChange={e => setCallData(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 15" style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Next Follow-up</label>
              <input type="datetime-local" value={callData.nextFollowup} onChange={e => setCallData(p => ({ ...p, nextFollowup: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Notes</label>
            <textarea value={callData.notes} onChange={e => setCallData(p => ({ ...p, notes: e.target.value }))} placeholder="Call summary..." rows={2} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleLogCall} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
              {submitting ? <Loader2 size={14} /> : <Save size={14} />} Save Call
            </button>
            <button onClick={() => setShowCallForm(false)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add Note Form */}
      {showNoteForm && (
        <div style={{ padding: '14px 20px', backgroundColor: '#faf5ff', borderBottom: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Add Note</h4>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Category</label>
            <select value={noteData.category} onChange={e => setNoteData(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit' }}>
              {NOTE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Note *</label>
            <textarea value={noteData.text} onChange={e => setNoteData(p => ({ ...p, text: e.target.value }))} placeholder="Write your note..." rows={3} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleAddNote} disabled={submitting || !noteData.text.trim()} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#7c3aed', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', opacity: noteData.text.trim() ? 1 : 0.5 }}>
              {submitting ? <Loader2 size={14} /> : <Save size={14} />} Save Note
            </button>
            <button onClick={() => setShowNoteForm(false)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={24} color="#94a3b8" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CircleDot size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No activities yet. Log a call or add a note to get started.</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: '15px', top: '8px', bottom: '8px', width: '2px', backgroundColor: '#e2e8f0' }} />
            {filtered.map((act, i) => {
              const ai = getActivityIcon(act.activity_type);
              const IconComp = ai.icon;
              return (
                <div key={act.id || i} style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: ai.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, border: '2px solid #fff' }}>
                    <IconComp size={15} color={ai.color} />
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{act.title || act.activity_type}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{timeAgo(act.created_at)}</span>
                    </div>
                    {act.description && <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 4px', lineHeight: 1.4 }}>{act.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>by {act.user_name || 'System'}</span>
                      {act.outcome && <span style={{ fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569' }}>{act.outcome}</span>}
                      {act.duration && <span style={{ fontSize: '10px', color: '#94a3b8' }}>{act.duration} min</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  FOLLOW-UPS & TASKS TAB
// ─────────────────────────────────────────
function FollowupsTab({ lead, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ date: '', time: '', type: 'Call', purpose: '', notes: '' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tasks?lead_id=${lead.id}`, { credentials: 'include' });
      const data = await res.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks.filter(t => t.leadId === lead.id || t.lead_id === lead.id) : []);
    } catch (e) { console.error('Error fetching tasks:', e); setTasks([]); }
    setLoading(false);
  }, [lead.id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const today = new Date().toISOString().split('T')[0];

  const categorize = (task) => {
    if (task.status === 'completed' || task.completed) return 'completed';
    const due = task.dueDate || task.due_date || task.date;
    if (!due) return 'upcoming';
    const d = due.split('T')[0];
    if (d < today) return 'overdue';
    if (d === today) return 'today';
    return 'upcoming';
  };

  const overdue = tasks.filter(t => categorize(t) === 'overdue');
  const dueToday = tasks.filter(t => categorize(t) === 'today');
  const upcoming = tasks.filter(t => categorize(t) === 'upcoming');
  const completed = tasks.filter(t => categorize(t) === 'completed');

  const handleCreate = async () => {
    if (!formData.date || !formData.purpose) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leadId: lead.id,
          lead_id: lead.id,
          leadName: lead.name,
          type: formData.type,
          title: `${formData.type}: ${formData.purpose}`,
          description: formData.notes,
          dueDate: formData.date + (formData.time ? `T${formData.time}` : ''),
          assignedTo: currentUser?.name || '',
          status: 'pending',
        })
      });
      setFormData({ date: '', time: '', type: 'Call', purpose: '', notes: '' });
      setShowForm(false);
      fetchTasks();
    } catch (e) { console.error('Error creating follow-up:', e); }
    setSubmitting(false);
  };

  const handleComplete = async (task) => {
    try {
      await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed', completed: true, completedAt: new Date().toISOString() })
      });
      fetchTasks();
    } catch (e) { console.error('Error completing task:', e); }
  };

  const handleReschedule = async (task, days) => {
    const current = new Date(task.dueDate || task.due_date || Date.now());
    current.setDate(current.getDate() + days);
    try {
      await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dueDate: current.toISOString() })
      });
      fetchTasks();
    } catch (e) { console.error('Error rescheduling:', e); }
  };

  const catColors = { overdue: '#dc2626', today: '#f59e0b', upcoming: '#2563eb', completed: '#16a34a' };

  const TaskItem = ({ task, cat }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', marginBottom: '6px', borderLeft: `3px solid ${catColors[cat]}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{task.title || task.type}</div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
          {formatDate(task.dueDate || task.due_date)} {task.assignedTo && `· ${task.assignedTo}`}
        </div>
      </div>
      {cat !== 'completed' && (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {[{ d: 1, l: '+1d' }, { d: 3, l: '+3d' }, { d: 7, l: '+1w' }].map(r => (
            <button key={r.d} onClick={() => handleReschedule(task, r.d)} style={{ padding: '2px 7px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>{r.l}</button>
          ))}
          <button onClick={() => handleComplete(task)} title="Complete" style={{ padding: '3px 8px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
            <CheckCircle2 size={12} />
          </button>
        </div>
      )}
    </div>
  );

  const Section = ({ title, items, cat, color }) => items.length > 0 && (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ fontSize: '12px', fontWeight: '700', color, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} /> {title} ({items.length})
      </h4>
      {items.map(t => <TaskItem key={t.id} task={t} cat={cat} />)}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Follow-ups & Tasks</span>
        <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: showForm ? '#2563eb' : '#fff', color: showForm ? '#fff' : '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
          <Plus size={14} /> Add Follow-up
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Date *</label>
              <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Time</label>
              <input type="time" value={formData.time} onChange={e => setFormData(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Type *</label>
              <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit' }}>
                {FOLLOWUP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Purpose *</label>
            <input type="text" value={formData.purpose} onChange={e => setFormData(p => ({ ...p, purpose: e.target.value }))} placeholder="e.g. Follow up on proposal" style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional context..." style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCreate} disabled={submitting || !formData.date || !formData.purpose} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', opacity: (formData.date && formData.purpose) ? 1 : 0.5 }}>
              {submitting ? <Loader2 size={14} /> : 'Create Follow-up'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={24} color="#94a3b8" /></div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CalendarClock size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No follow-ups yet. Schedule one to stay on track.</p>
          </div>
        ) : (
          <>
            <Section title="Overdue" items={overdue} cat="overdue" color="#dc2626" />
            <Section title="Due Today" items={dueToday} cat="today" color="#f59e0b" />
            <Section title="Upcoming" items={upcoming} cat="upcoming" color="#2563eb" />
            <Section title="Completed" items={completed} cat="completed" color="#16a34a" />
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  MEETINGS TAB
// ─────────────────────────────────────────
function MeetingsTab({ lead, currentUser }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ date: '', startTime: '', endTime: '', type: 'Call', participants: '', location: '', agenda: '', notes: '' });

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/meetings?lead_id=${lead.id}`, { credentials: 'include' });
      const data = await res.json();
      setMeetings(Array.isArray(data.meetings) ? data.meetings : []);
    } catch (e) { console.error('Error fetching meetings:', e); setMeetings([]); }
    setLoading(false);
  }, [lead.id]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const handleCreate = async () => {
    if (!formData.date) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lead_id: lead.id,
          user_id: currentUser?.id,
          user_name: currentUser?.name || 'User',
          meeting_date: formData.date,
          start_time: formData.startTime,
          end_time: formData.endTime,
          meeting_type: formData.type,
          participants: formData.participants,
          location: formData.location,
          agenda: formData.agenda,
          notes: formData.notes,
          status: 'Scheduled',
        })
      });
      setFormData({ date: '', startTime: '', endTime: '', type: 'Call', participants: '', location: '', agenda: '', notes: '' });
      setShowForm(false);
      fetchMeetings();
    } catch (e) { console.error('Error creating meeting:', e); }
    setSubmitting(false);
  };

  const handleUpdateStatus = async (mtg, status, outcome) => {
    try {
      await fetch(`${API_BASE}/api/meetings/${mtg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, outcome: outcome || null })
      });
      fetchMeetings();
    } catch (e) { console.error('Error updating meeting:', e); }
  };

  const statusColors = {
    'Scheduled': { bg: '#dbeafe', text: '#1e40af' },
    'Completed': { bg: '#dcfce7', text: '#166534' },
    'Cancelled': { bg: '#fee2e2', text: '#991b1b' },
    'No Show': { bg: '#fef3c7', text: '#92400e' },
    'Rescheduled': { bg: '#e0e7ff', text: '#3730a3' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Meetings & Demos</span>
        <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: showForm ? '#db2777' : '#fff', color: showForm ? '#fff' : '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
          <Plus size={14} /> Schedule Meeting
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '14px 20px', backgroundColor: '#fdf2f8', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Date *</label>
              <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Start Time</label>
              <input type="time" value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>End Time</label>
              <input type="time" value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Type</label>
              <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit' }}>
                {MEETING_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Location / Link</label>
              <input type="text" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="Zoom link or address" style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Participants</label>
            <input type="text" value={formData.participants} onChange={e => setFormData(p => ({ ...p, participants: e.target.value }))} placeholder="Names separated by comma" style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Agenda / Notes</label>
            <textarea value={formData.agenda} onChange={e => setFormData(p => ({ ...p, agenda: e.target.value }))} rows={2} placeholder="Meeting agenda..." style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCreate} disabled={submitting || !formData.date} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#db2777', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', opacity: formData.date ? 1 : 0.5 }}>
              {submitting ? <Loader2 size={14} /> : 'Schedule Meeting'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={24} color="#94a3b8" /></div>
        ) : meetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Video size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No meetings scheduled. Schedule one to connect with this lead.</p>
          </div>
        ) : (
          meetings.map(mtg => {
            const sc = statusColors[mtg.status] || statusColors['Scheduled'];
            return (
              <div key={mtg.id} style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} color="#db2777" />
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{mtg.meeting_type || 'Meeting'}</span>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', backgroundColor: sc.bg, color: sc.text }}>{mtg.status}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                  {formatDate(mtg.meeting_date)} {mtg.start_time && `· ${mtg.start_time}`}{mtg.end_time && ` — ${mtg.end_time}`}
                </div>
                {mtg.participants && <div style={{ fontSize: '11px', color: '#64748b' }}>Participants: {mtg.participants}</div>}
                {mtg.location && <div style={{ fontSize: '11px', color: '#64748b' }}>Location: {mtg.location}</div>}
                {mtg.agenda && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{mtg.agenda}</div>}
                {mtg.status === 'Scheduled' && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button onClick={() => handleUpdateStatus(mtg, 'Completed')} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Complete</button>
                    <button onClick={() => handleUpdateStatus(mtg, 'No Show')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>No Show</button>
                    <button onClick={() => handleUpdateStatus(mtg, 'Cancelled')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fee2e2', backgroundColor: '#fff', color: '#dc2626', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  PAYMENTS TAB
// ─────────────────────────────────────────
function PaymentsTab({ lead }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/payments?lead_id=${lead.id}`, { credentials: 'include' });
        const data = await res.json();
        setPayments(Array.isArray(data.payments) ? data.payments.filter(p => p.leadId === lead.id || p.lead_id === lead.id) : []);
      } catch (e) { console.error('Error fetching payments:', e); setPayments([]); }
      setLoading(false);
    })();
  }, [lead.id]);

  const dealValue = Number(lead.value) || 0;
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pending = Math.max(0, dealValue - totalPaid);
  const pct = dealValue > 0 ? Math.min(100, (totalPaid / dealValue) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
          <div style={{ textAlign: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Deal Value</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{formatCurrency(dealValue)}</div>
          </div>
          <div style={{ textAlign: 'center', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '500' }}>Total Paid</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>{formatCurrency(totalPaid)}</div>
          </div>
          <div style={{ textAlign: 'center', backgroundColor: pending > 0 ? '#fef2f2' : '#f0fdf4', padding: '10px', borderRadius: '8px', border: `1px solid ${pending > 0 ? '#fee2e2' : '#dcfce7'}` }}>
            <div style={{ fontSize: '11px', color: pending > 0 ? '#dc2626' : '#16a34a', fontWeight: '500' }}>Pending</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: pending > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(pending)}</div>
          </div>
        </div>
        <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct >= 100 ? '#16a34a' : '#f59e0b', borderRadius: '4px', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>{pct.toFixed(0)}% collected ({payments.length} payment{payments.length !== 1 ? 's' : ''})</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={24} color="#94a3b8" /></div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CreditCard size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No payments recorded yet.</p>
          </div>
        ) : (
          payments.map((p, i) => (
            <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IndianRupee size={16} color="#16a34a" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#16a34a' }}>{formatCurrency(p.amount)}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDate(p.paymentDate || p.payment_date || p.date || p.created_at)}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {p.method || p.paymentMethod || 'N/A'} {p.reference && `· Ref: ${p.reference}`} {p.recordedBy && `· by ${p.recordedBy}`}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  MAIN LEAD DETAIL WORKSPACE
// ─────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'activity', label: 'Activity', icon: Clock },
  { key: 'followups', label: 'Follow-ups', icon: CalendarClock },
  { key: 'meetings', label: 'Meetings', icon: Video },
  { key: 'payments', label: 'Payments', icon: IndianRupee },
];

export function LeadDetailWorkspace({ lead, onClose, onUpdateLead, currentUser, allUsers, leads }) {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("leadTab");
      if (t) return t;
    }
    return lead?.initialTab || 'overview';
  });

  if (!lead) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '680px', maxWidth: '96vw', height: '100vh',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Lead Workspace</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc', flexShrink: 0 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  padding: '10px 6px', border: 'none', cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: isActive ? '#2563eb' : '#64748b',
                  fontSize: '12px', fontWeight: isActive ? '700' : '500',
                  borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <TabIcon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 'overview' && <OverviewTab lead={lead} currentUser={currentUser} allUsers={allUsers} onUpdateLead={onUpdateLead} />}
          {activeTab === 'activity' && <ActivityTab lead={lead} currentUser={currentUser} />}
          {activeTab === 'followups' && <FollowupsTab lead={lead} currentUser={currentUser} />}
          {activeTab === 'meetings' && <MeetingsTab lead={lead} currentUser={currentUser} />}
          {activeTab === 'payments' && <PaymentsTab lead={lead} />}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
