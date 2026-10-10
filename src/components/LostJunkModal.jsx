import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Check, Building, FileText } from 'lucide-react';

export function MarkLostModal({ isOpen, onClose, lead, onConfirmLost }) {
  if (!isOpen || !lead) return null;

  const [lostReason, setLostReason] = useState('Price too high');
  const [competitorName, setCompetitorName] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [lostNotes, setLostNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    let finalReason = lostReason;
    if (lostReason === 'Competitor chosen') {
      if (!competitorName.trim()) {
        setError('Competitor name is required when competitor chosen is selected.');
        return;
      }
      finalReason = `Competitor chosen (${competitorName.trim()})`;
    } else if (lostReason === 'Other') {
      if (!otherReason.trim()) {
        setError('Please describe the specific lost reason.');
        return;
      }
      finalReason = `Other: ${otherReason.trim()}`;
    }

    if (!lostNotes.trim()) {
      setError('Detailed lost notes are required for pipeline audit.');
      return;
    }

    setIsSubmitting(true);
    if (onConfirmLost) {
      onConfirmLost(lead, {
        lost_reason: finalReason,
        lost_competitor: competitorName.trim(),
        lost_notes: lostNotes.trim(),
        lost_date: new Date().toISOString().split('T')[0]
      });
    }
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '16px'
    }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #fecaca',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#dc2626',
          color: '#ffffff',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Mark Deal as Lost</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Lead Snapshot */}
        <div style={{ padding: '12px 18px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
          <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600' }}>
            {lead.name} {lead.company ? `• ${lead.company}` : ''} (₹{(Number(lead.value) || 0).toLocaleString('en-IN')})
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '12px'
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
              Primary Lost Reason <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              <option value="Price too high">Price too high / Budget constraint</option>
              <option value="Competitor chosen">Competitor chosen</option>
              <option value="Feature mismatch">Product / Feature mismatch</option>
              <option value="Budget canceled / Not approved">Budget canceled / Project postponed indefinitely</option>
              <option value="Timing not right / Delayed">Timing not right / Follow-up next quarter</option>
              <option value="No requirement currently">No requirement currently</option>
              <option value="Authority objection">Decision maker rejected / Authority objection</option>
              <option value="Other">Other reason (specify)</option>
            </select>
          </div>

          {lostReason === 'Competitor chosen' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                Competitor Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="e.g. LeadSquared, Zoho, Salesforce"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {lostReason === 'Other' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                Specify Lost Reason <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Detailed reason why deal was lost"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
              Lost Remarks & Outcome Notes <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              rows={3}
              required
              value={lostNotes}
              onChange={(e) => setLostNotes(e.target.value)}
              placeholder="What did the client say? What was the final objection?"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {isSubmitting ? 'Saving...' : 'Confirm Mark Lost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MarkJunkModal({ isOpen, onClose, lead, onConfirmJunk }) {
  if (!isOpen || !lead) return null;

  const [junkReason, setJunkReason] = useState('Invalid contact / Wrong number');
  const [otherReason, setOtherReason] = useState('');
  const [junkNotes, setJunkNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    let finalReason = junkReason;
    if (junkReason === 'Other') {
      if (!otherReason.trim()) {
        setError('Please specify why this lead is junk.');
        return;
      }
      finalReason = `Other: ${otherReason.trim()}`;
    }

    setIsSubmitting(true);
    if (onConfirmJunk) {
      onConfirmJunk(lead, {
        junk_reason: finalReason,
        junk_notes: junkNotes.trim(),
        junk_date: new Date().toISOString().split('T')[0]
      });
    }
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '16px'
    }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#475569',
          color: '#ffffff',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={18} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Mark Lead as Junk</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Lead Snapshot */}
        <div style={{ padding: '12px 18px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#334155', fontWeight: '600' }}>
            {lead.name} {lead.company ? `• ${lead.company}` : ''}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '12px'
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
              Junk Reason <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={junkReason}
              onChange={(e) => setJunkReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              <option value="Invalid contact / Wrong number">Invalid contact / Wrong phone number / Dead line</option>
              <option value="Fake inquiry / Spam">Fake inquiry / Spam submission / Bot</option>
              <option value="Duplicate entry">Duplicate entry in database</option>
              <option value="Student / Job seeker / Non-buyer">Student / Job seeker / Not a business buyer</option>
              <option value="Competitor research">Competitor doing market research</option>
              <option value="Language barrier / Unreachable">Language barrier / Unreachable permanently</option>
              <option value="Other">Other junk reason</option>
            </select>
          </div>

          {junkReason === 'Other' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                Specify Reason <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Reason why this lead is junk"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
              Additional Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={junkNotes}
              onChange={(e) => setJunkNotes(e.target.value)}
              placeholder="e.g. Called 5 times, truecaller marked as spam"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#475569',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {isSubmitting ? 'Saving...' : 'Confirm Mark Junk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
