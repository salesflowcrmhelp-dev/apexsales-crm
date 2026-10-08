import React from 'react';
import { Copy, AlertCircle, Eye, PlusCircle, X, User, Phone, Mail, Calendar } from 'lucide-react';

export function DuplicateLeadModal({ isOpen, onClose, duplicateLead, onProceedAnyway, onViewExisting }) {
  if (!isOpen || !duplicateLead) return null;

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
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #fde68a',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#d97706',
          color: '#ffffff',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={18} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Potential Duplicate Lead Detected</h3>
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

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
            A lead with identical contact information already exists in your CRM database. Please review the existing record before creating a duplicate.
          </p>

          {/* Existing Lead Card */}
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#92400e' }}>
                {duplicateLead.name}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a'
              }}>
                Stage: {duplicateLead.status || 'Contacted'}
              </span>
            </div>

            {duplicateLead.company && (
              <span style={{ fontSize: '12px', color: '#78350f', fontWeight: '500' }}>
                Company: <strong>{duplicateLead.company}</strong>
              </span>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
              {duplicateLead.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={13} color="#b45309" />
                  <span>{duplicateLead.phone}</span>
                </div>
              )}
              {duplicateLead.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Mail size={13} color="#b45309" />
                  <span>{duplicateLead.email}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={13} color="#b45309" />
                <span>Owner: {duplicateLead.owner || 'Unassigned'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={13} color="#b45309" />
                <span>Created: {(duplicateLead.createdAt || '').split('T')[0] || 'Earlier'}</span>
              </div>
            </div>
          </div>

          {/* Action Options */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 14px',
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
              onClick={() => {
                onClose();
                if (onViewExisting) onViewExisting(duplicateLead);
              }}
              style={{
                padding: '9px 16px',
                borderRadius: '7px',
                border: '1px solid #2563eb',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Eye size={15} />
              <span>View Existing Lead</span>
            </button>
            <button
              onClick={() => {
                onClose();
                if (onProceedAnyway) onProceedAnyway();
              }}
              style={{
                padding: '9px 16px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: '#d97706',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
              }}
            >
              <PlusCircle size={15} />
              <span>Create Anyway</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
