import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, CheckCircle2, X, DollarSign, Calendar, Clock, FileText, ArrowRight } from 'lucide-react';

export function RecordPaymentModal({ isOpen, onClose, lead, onPaymentRecorded }) {
  if (!isOpen || !lead) return null;

  const dealValue = Number(lead.value) || 0;
  const alreadyPaid = Number(lead.paidAmount) || 0;
  const pendingBalance = Math.max(0, dealValue - alreadyPaid);

  const [amount, setAmount] = useState(pendingBalance > 0 ? String(pendingBalance) : '');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentTime, setPaymentTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  });
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [reference, setReference] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isElectronic = ['UPI', 'Bank Transfer', 'Credit / Debit Card', 'Payment Gateway'].includes(paymentMethod);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    if (numAmount > pendingBalance && pendingBalance > 0) {
      // Allow overpayment if user confirms, but show warning
      const confirmOverpay = window.confirm(`Entered amount (₹${numAmount.toLocaleString('en-IN')}) exceeds remaining balance (₹${pendingBalance.toLocaleString('en-IN')}). Proceed anyway?`);
      if (!confirmOverpay) return;
    }

    if (isElectronic && !reference.trim()) {
      setErrorMessage(`Transaction / UTR / Reference ID is required for ${paymentMethod}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = sessionStorage.getItem('crm_auth_token') || localStorage.getItem('crm_auth_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leadId: lead.id,
          amount: numAmount,
          paymentDate,
          paymentTime,
          paymentMethod,
          reference: reference.trim(),
          invoiceNumber: invoiceNumber.trim(),
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to record payment');
      }

      if (onPaymentRecorded) {
        onPaymentRecorded(data.lead, data.payment);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Error recording payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        maxWidth: '540px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderTopLeftRadius: '11px',
          borderTopRightRadius: '11px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CreditCard size={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>Record Payment</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{lead.name} {lead.company ? `• ${lead.company}` : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Financial Summary Card */}
        <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '600' }}>DEAL VALUE</span>
              <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: '800' }}>
                ₹{dealValue.toLocaleString('en-IN')}
              </strong>
            </div>
            <div style={{ backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <span style={{ fontSize: '11px', color: '#065f46', display: 'block', fontWeight: '600' }}>ALREADY PAID</span>
              <strong style={{ fontSize: '15px', color: '#059669', fontWeight: '800' }}>
                ₹{alreadyPaid.toLocaleString('en-IN')}
              </strong>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
              <span style={{ fontSize: '11px', color: '#9a3412', display: 'block', fontWeight: '600' }}>PENDING BALANCE</span>
              <strong style={{ fontSize: '15px', color: '#ea580c', fontWeight: '800' }}>
                ₹{pendingBalance.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMessage && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Payment Amount Received (₹) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: '700', fontSize: '14px' }}>₹</span>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount received"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 28px',
                  borderRadius: '7px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {pendingBalance > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setAmount(String(pendingBalance))}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Pay Full Balance (₹{pendingBalance.toLocaleString('en-IN')})
                </button>
                {pendingBalance > 5000 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.round(pendingBalance / 2)))}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Pay 50% (₹{Math.round(pendingBalance / 2).toLocaleString('en-IN')})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Date & Time Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Payment Date <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Payment Time
              </label>
              <input
                type="time"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Payment Method & Reference Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Payment Mode <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Bank Transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Payment Gateway">Payment Gateway / Razorpay / Stripe</option>
                <option value="Cheque">Cheque / Demand Draft</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other Mode</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Ref / UTR / Txn ID {isElectronic && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={isElectronic ? 'Required for verification' : 'Optional reference'}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Invoice Number */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Invoice / Receipt # (Optional)
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-089"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '7px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Payment Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received advance 50%, balance on deployment"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '7px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 16px',
                borderRadius: '7px',
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
                padding: '9px 20px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Recording...' : 'Confirm & Save Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FullPaymentRequiredModal({ isOpen, onClose, lead, onOpenRecordPayment }) {
  if (!isOpen || !lead) return null;

  const dealValue = Number(lead.value) || 0;
  const alreadyPaid = Number(lead.paidAmount) || 0;
  const pendingBalance = Math.max(0, dealValue - alreadyPaid);

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
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        border: '1px solid #fed7aa',
        overflow: 'hidden'
      }}>
        {/* Warning Banner */}
        <div style={{
          backgroundColor: '#fff7ed',
          borderBottom: '1px solid #fed7aa',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#ffedd5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertCircle size={24} color="#ea580c" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#9a3412' }}>
              Full Payment Required to Mark Won
            </h3>
            <span style={{ fontSize: '11px', color: '#c2410c', fontWeight: '500' }}>
              Apex Sales Revenue Realization Policy (Blueprint §21)
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
            Full payment is required before <strong>{lead.name}</strong> can be marked <strong>Won</strong>.
            A deal with a pending balance must remain in <strong>Payment Follow-up</strong> stage until the full amount is collected.
          </p>

          {/* Balance breakdown */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
              <span>Total Deal Value:</span>
              <strong style={{ color: '#0f172a' }}>₹{dealValue.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
              <span>Payment Collected:</span>
              <strong style={{ color: '#16a34a' }}>₹{alreadyPaid.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              fontWeight: '800',
              paddingTop: '6px',
              borderTop: '1px dashed #cbd5e1',
              color: '#dc2626'
            }}>
              <span>Remaining Balance Due:</span>
              <span>₹{pendingBalance.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Keep in Current Stage
            </button>
            <button
              onClick={() => {
                onClose();
                if (onOpenRecordPayment) onOpenRecordPayment(lead);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)'
              }}
            >
              <CreditCard size={15} />
              <span>Record Remaining Payment (₹{pendingBalance.toLocaleString('en-IN')})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
