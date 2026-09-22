import React, { Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RootApp } from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CRM App ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoToSheet = () => {
    try {
      sessionStorage.setItem("activeWorkspace", "pipeline");
      sessionStorage.setItem("pipelineView", "sheet");
    } catch(e) {}
    window.location.href = window.location.origin;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif", padding: "20px", boxSizing: "border-box" }}>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "36px 30px", maxWidth: "460px", width: "100%", textAlign: "center", boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.08)", boxSizing: "border-box" }}>
            
            {/* ApexSales CRM Brand Header */}
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: "linear-gradient(135deg, #f59e0b, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: "900", fontSize: "13px", boxShadow: "0 2px 4px rgba(37,99,235,0.2)" }}>
                A
              </div>
              <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.2px" }}>
                ApexSales CRM
              </span>
            </div>

            {/* Soft Cloud Shield Illustration */}
            <div style={{ width: "58px", height: "58px", borderRadius: "18px", backgroundColor: "#fffbeb", border: "1px solid #fef3c7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", fontSize: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              🛡️
            </div>

            {/* Reassuring Heading */}
            <h2 style={{ fontSize: "19px", fontWeight: "800", color: "#0f172a", margin: "0 0 8px 0", lineHeight: "1.3" }}>
              Something went wrong, but your data is safe
            </h2>

            {/* Polite Subtext */}
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 22px 0", lineHeight: "1.5" }}>
              Don't worry — all your leads, deals, and team metrics are securely stored in the cloud. Let's get you back to work.
            </p>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "16px" }}>
              <button 
                type="button"
                onClick={this.handleReload}
                style={{ width: "100%", height: "42px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "9px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", boxShadow: "0 2px 5px rgba(37,99,235,0.2)", transition: "all 0.15s ease" }}
              >
                🔄 Reload Workspace
              </button>

              <button 
                type="button"
                onClick={this.handleGoToSheet}
                style={{ width: "100%", height: "40px", backgroundColor: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "9px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", transition: "all 0.15s ease" }}
              >
                📊 Return to Pipeline Spreadsheet
              </button>
            </div>

            {/* Assistance Link */}
            <div style={{ fontSize: "11.5px", color: "#94a3b8", marginBottom: "12px" }}>
              Need assistance? <a href="mailto:support@apexsales.com" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>Contact support</a>
            </div>

            {/* Discrete Collapsible Technical Details for IT */}
            <details style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", textAlign: "left" }}>
              <summary style={{ cursor: "pointer", fontSize: "11px", color: "#94a3b8", fontWeight: "600", outline: "none", userSelect: "none" }}>
                ▸ View technical details (for IT support)
              </summary>
              <div style={{ backgroundColor: "#0f172a", padding: "10px 12px", borderRadius: "8px", color: "#f87171", fontSize: "10.5px", fontFamily: "monospace", textAlign: "left", marginTop: "8px", maxHeight: "110px", overflowY: "auto", whiteSpace: "pre-wrap", border: "1px solid rgba(239,68,68,0.2)" }}>
                {this.state.error ? this.state.error.toString() + "\n" + (this.state.error.stack || "") : "Unknown Error"}
              </div>
            </details>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function mountApp() {
  const container = document.getElementById('root');
  if (container) {
    createRoot(container).render(
      <ErrorBoundary>
        <RootApp />
      </ErrorBoundary>
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
