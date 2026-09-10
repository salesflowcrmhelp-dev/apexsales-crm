import React, { Component, StrictMode } from 'react'
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

  handleReset = () => {
    try {
      localStorage.removeItem("salesflow_standalone_leads");
    } catch(e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif", padding: "20px" }}>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "32px", maxWidth: "480px", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.08)" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", fontSize: "24px" }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 8px 0" }}>
              Workspace State Auto-Recovered
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 12px 0", lineHeight: "1.5" }}>
              A browser execution exception occurred:
            </p>
            <div style={{ backgroundColor: "#f1f5f9", padding: "10px 12px", borderRadius: "8px", color: "#dc2626", fontSize: "11px", fontFamily: "monospace", textAlign: "left", marginBottom: "16px", maxHeight: "150px", overflowY: "auto", whiteSpace: "pre-wrap" }}>
              {this.state.error ? this.state.error.toString() + "\n" + (this.state.error.stack || "") : "Unknown Error"}
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ padding: "10px 18px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
              >
                🔄 Refresh Page
              </button>
              <button 
                onClick={this.handleReset}
                style={{ padding: "10px 18px", backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                ⚡ Reset & Fix
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <RootApp />
    </ErrorBoundary>
  </StrictMode>,
)
