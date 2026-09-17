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

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch(e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#0b0f19", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif", padding: "20px", color: "#ffffff" }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", padding: "32px", maxWidth: "440px", width: "100%", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "14px", backgroundColor: "rgba(239,68,68,0.2)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", fontSize: "26px" }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: "19px", fontWeight: "800", color: "#ffffff", margin: "0 0 8px 0" }}>
              Workspace State Auto-Recovered
            </h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 16px 0", lineHeight: "1.5" }}>
              A browser execution exception occurred:
            </p>
            <div style={{ backgroundColor: "#0f172a", padding: "12px 14px", borderRadius: "10px", color: "#f87171", fontSize: "11.5px", fontFamily: "monospace", textAlign: "left", marginBottom: "20px", maxHeight: "150px", overflowY: "auto", whiteSpace: "pre-wrap", border: "1px solid rgba(239,68,68,0.3)" }}>
              {this.state.error ? this.state.error.toString() + "\n" + (this.state.error.stack || "") : "Unknown Error"}
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ padding: "11px 20px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
              >
                🔄 Refresh Page
              </button>
              <button 
                onClick={this.handleReset}
                style={{ padding: "11px 20px", backgroundColor: "#334155", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
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
