import React, { useState } from "react";
import { 
  Check, ArrowRight, Shield, Zap, Phone, MessageCircle, RotateCw, 
  Award, TrendingUp, X, ChevronDown, ChevronUp, Sparkles, Star, Lock, 
  Table, Users, BarChart3, Building2, CheckCircle2, ExternalLink,
  Moon, Sun
} from "lucide-react";
import { upsertLeadToSupabase } from "./lib/supabaseService";

export default function LandingPage({ onNavigateToCRM }) {
  // Theme state: "dark" (Option A: Dark Titanium Slate & Canary Yellow) | "light" (Option B: Light Slate Grey & Canary Yellow)
  const [theme, setTheme] = useState("dark");
  const isDark = theme === "dark";

  // Palette tokens
  const colors = isDark ? {
    bg: "#0b0f17",
    surface: "#111622",
    card: "#161c28",
    cardSubtle: "#1c2434",
    border: "#263248",
    borderSubtle: "#1e293b",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    accent: "#facc15",
    accentHover: "#eab308",
    accentDark: "#ca8a04",
    accentText: "#090d16",
    accentBgSubtle: "rgba(250, 204, 21, 0.12)",
    accentBorderSubtle: "rgba(250, 204, 21, 0.3)",
    navBg: "rgba(11, 15, 23, 0.92)",
    inputBg: "#0d121c",
    inputBorder: "#2a364d",
    shadowCard: "0 25px 60px -15px rgba(0, 0, 0, 0.55), 0 0 1px rgba(255, 255, 255, 0.08)",
    shadowCta: "0 4px 18px rgba(250, 204, 21, 0.32)",
  } : {
    bg: "#f8fafc",
    surface: "#f1f5f9",
    card: "#ffffff",
    cardSubtle: "#f8fafc",
    border: "#e2e8f0",
    borderSubtle: "#cbd5e1",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#64748b",
    accent: "#facc15",
    accentHover: "#eab308",
    accentDark: "#ca8a04",
    accentText: "#0f172a",
    accentBgSubtle: "#fef9c3",
    accentBorderSubtle: "#fde047",
    navBg: "rgba(255, 255, 255, 0.92)",
    inputBg: "#ffffff",
    inputBorder: "#cbd5e1",
    shadowCard: "0 25px 60px -15px rgba(15, 23, 42, 0.12), 0 0 1px rgba(15, 23, 42, 0.08)",
    shadowCta: "0 4px 14px rgba(234, 179, 8, 0.28)",
  };

  // Demo form state
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    plan: "Gold Growth Plan (₹35,000 / 3 Months)",
    teamSize: "3-5 Reps"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState(0);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setSubmitError("Please provide your Name and WhatsApp / Phone number.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const dealVal = formData.plan.includes("Enterprise") ? 65000 : formData.plan.includes("Gold") ? 35000 : 15000;
      const newLead = {
        id: `lead_web_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: formData.name.trim(),
        company: formData.company.trim() || "Website Inquiry",
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        value: dealVal,
        status: "New",
        source: "Website Demo Request",
        score: "Hot",
        notes: `Plan: ${formData.plan} | Team Size: ${formData.teamSize} | Inquired via ApexSales CRM Landing Page (Grey & Yellow Theme)`,
        owner: "Harsh Goyal",
        createdAt: new Date().toISOString()
      };

      await upsertLeadToSupabase(newLead);
      setIsSubmitted(true);
    } catch (err) {
      console.warn("Website lead capture error:", err);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      q: "Can I import our existing sales leads from Excel (.xlsx)?",
      a: "Yes! ApexSales CRM features a native 1-click Excel reader supporting both .xlsx, .xls, and .csv files. It automatically maps columns like Client Name, Phone, Value, Renewal Date, and Stage with zero manual reformatting."
    },
    {
      q: "How does 1-Click WhatsApp messaging work?",
      a: "You can click the WhatsApp icon next to any lead to immediately launch WhatsApp Web with a personalized template (e.g. quoting client name, deal value, or proposal link) without needing to save their phone number in your contacts."
    },
    {
      q: "How does the Anti-Theft Security guard protect client data?",
      a: "Sales representatives log in with individual 4-to-6 digit PINs. Administrators can lock client phone numbers (masking digits), restrict export permissions, and ensure reps only see leads assigned specifically to them."
    },
    {
      q: "How does the Renewal Deals tracking work?",
      a: "The CRM automatically categorizes recurring clients into the Renewal pipeline and triggers advance alerts 15 days before contract expiration, ensuring your team retains maximum annual customer value."
    }
  ];

  return (
    <div style={{ backgroundColor: colors.bg, color: colors.textPrimary, minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", transition: "background-color 0.25s ease, color 0.25s ease" }}>

      {/* 🧭 NAVIGATION BAR */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(16px)", backgroundColor: colors.navBg, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 28px", height: "72px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          
          {/* Brand Logo with Electric Yellow Apex Emblem */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 22H7L12 12L17 22H22L12 2Z" fill="#facc15" />
                <path d="M12 12L14.5 17H9.5L12 12Z" fill="#eab308" />
              </svg>
            </div>
            <span style={{ fontSize: "20px", fontWeight: "850", color: colors.textPrimary, letterSpacing: "-0.5px" }}>
              ApexSales
            </span>
            <span style={{ fontSize: "11px", fontWeight: "750", backgroundColor: colors.accentBgSubtle, color: isDark ? "#fde047" : "#854d0e", border: `1px solid ${colors.accentBorderSubtle}`, padding: "2px 8px", borderRadius: "6px" }}>
              CRM
            </span>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "30px" }} className="hidden md:flex">
            <a href="#features" style={{ fontSize: "13.5px", fontWeight: "600", color: colors.textSecondary, textDecoration: "none", transition: "color 0.15s" }} onMouseEnter={e => e.target.style.color=colors.accent} onMouseLeave={e => e.target.style.color=colors.textSecondary}>
              Features
            </a>
            <a href="#solutions" style={{ fontSize: "13.5px", fontWeight: "600", color: colors.textSecondary, textDecoration: "none", transition: "color 0.15s" }} onMouseEnter={e => e.target.style.color=colors.accent} onMouseLeave={e => e.target.style.color=colors.textSecondary}>
              Solutions
            </a>
            <a href="#pricing" style={{ fontSize: "13.5px", fontWeight: "600", color: colors.textSecondary, textDecoration: "none", transition: "color 0.15s" }} onMouseEnter={e => e.target.style.color=colors.accent} onMouseLeave={e => e.target.style.color=colors.textSecondary}>
              Pricing
            </a>
            <a href="#demo" style={{ fontSize: "13.5px", fontWeight: "600", color: colors.textSecondary, textDecoration: "none", transition: "color 0.15s" }} onMouseEnter={e => e.target.style.color=colors.accent} onMouseLeave={e => e.target.style.color=colors.textSecondary}>
              Book Demo
            </a>
            <a href="#faq" style={{ fontSize: "13.5px", fontWeight: "600", color: colors.textSecondary, textDecoration: "none", transition: "color 0.15s" }} onMouseEnter={e => e.target.style.color=colors.accent} onMouseLeave={e => e.target.style.color=colors.textSecondary}>
              FAQ
            </a>
          </nav>

          {/* Right Action Area: Live CTO Theme Toggle + Action CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            
            {/* 🎛️ Live CTO Theme Switcher (Dark vs Light Grey & Yellow) */}
            <div style={{ display: "flex", alignItems: "center", backgroundColor: isDark ? "#141a24" : "#e2e8f0", borderRadius: "999px", padding: "3px", border: `1px solid ${colors.border}` }} title="Toggle between Option A (Dark) and Option B (Light)">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "750",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isDark ? "#facc15" : "transparent",
                  color: isDark ? "#090d16" : colors.textSecondary,
                  transition: "all 0.15s ease"
                }}
              >
                <Moon size={12} />
                <span>Option A (Dark)</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "750",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: !isDark ? "#facc15" : "transparent",
                  color: !isDark ? "#090d16" : colors.textSecondary,
                  transition: "all 0.15s ease"
                }}
              >
                <Sun size={12} />
                <span>Option B (Light)</span>
              </button>
            </div>

            {/* Book a Demo - Canary Yellow Accent */}
            <a 
              href="#demo"
              style={{
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: "800",
                color: colors.accentText,
                backgroundColor: colors.accent,
                borderRadius: "8px",
                textDecoration: "none",
                boxShadow: colors.shadowCta,
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.accentHover}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.accent}
            >
              Book a Demo
            </a>

            {/* Sign In / Open CRM */}
            <button 
              type="button"
              onClick={onNavigateToCRM}
              style={{
                background: "none",
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "750",
                color: colors.textPrimary,
                cursor: "pointer",
                padding: "7px 14px",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = colors.accent;
                e.currentTarget.style.color = colors.accent;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.color = colors.textPrimary;
              }}
            >
              Sign In
            </button>
          </div>

        </div>
      </header>

      {/* 🌟 HERO SECTION */}
      <section style={{ paddingTop: "68px", paddingBottom: "70px", textAlign: "center", position: "relative" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
          
          {/* Executive Tag */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "999px", backgroundColor: colors.accentBgSubtle, border: `1px solid ${colors.accentBorderSubtle}`, fontSize: "12px", fontWeight: "750", color: isDark ? "#fde047" : "#854d0e", marginBottom: "24px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: colors.accent }}></span>
            <span>Enterprise Revenue Engine • Grey & Yellow Edition</span>
          </div>

          {/* Main Headline */}
          <h1 style={{ fontSize: "clamp(36px, 5.5vw, 66px)", fontWeight: "900", color: colors.textPrimary, letterSpacing: "-1.8px", lineHeight: "1.1", marginBottom: "20px" }}>
            Unleash Your Sales Potential with<br />
            <span style={{ color: colors.accent }}>ApexSales CRM</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: "clamp(16px, 1.8vw, 19px)", color: colors.textSecondary, maxWidth: "680px", margin: "0 auto 36px auto", lineHeight: "1.6", fontWeight: "450" }}>
            The ultra-clean platform built for dynamic teams to accelerate pipeline growth, eliminate lead leakage, and close high-ticket deals faster.
          </p>

          {/* Dual CTAs (Canary Yellow + Slate Graphite) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", flexWrap: "wrap", marginBottom: "52px" }}>
            <a 
              href="#demo"
              style={{
                padding: "14px 34px",
                fontSize: "14.5px",
                fontWeight: "850",
                color: colors.accentText,
                backgroundColor: colors.accent,
                borderRadius: "9px",
                textDecoration: "none",
                boxShadow: colors.shadowCta,
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.accentHover}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.accent}
            >
              Get Started Free
            </a>

            <button 
              type="button"
              onClick={onNavigateToCRM}
              style={{
                padding: "14px 30px",
                fontSize: "14.5px",
                fontWeight: "800",
                color: "#ffffff",
                backgroundColor: isDark ? "#1a2232" : "#0f172a",
                border: `1px solid ${colors.border}`,
                borderRadius: "9px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = colors.accent;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              <span>Launch Live CRM</span>
              <ArrowRight size={16} color={colors.accent} />
            </button>
          </div>

          {/* 💻 HIGH-TECH SALES PIPELINE DASHBOARD PREVIEW */}
          <div 
            style={{ 
              maxWidth: "1040px", 
              margin: "0 auto", 
              backgroundColor: colors.card, 
              borderRadius: "16px", 
              border: `1px solid ${colors.border}`, 
              boxShadow: colors.shadowCard,
              overflow: "hidden",
              textAlign: "left",
              cursor: "pointer",
              transition: "transform 0.2s ease, border-color 0.2s ease"
            }}
            onClick={onNavigateToCRM}
            title="Click to launch live ApexSales CRM Workspace"
            onMouseEnter={e => e.currentTarget.style.borderColor = colors.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
          >
            {/* Top Bar of Dashboard Mockup */}
            <div style={{ padding: "14px 22px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.cardSubtle }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "14px", fontWeight: "850", color: colors.textPrimary }}>Sales Pipeline</span>
                <span style={{ fontSize: "11px", padding: "3px 9px", backgroundColor: colors.accentBgSubtle, color: isDark ? "#fde047" : "#854d0e", borderRadius: "6px", fontWeight: "800", border: `1px solid ${colors.accentBorderSubtle}` }}>
                  Executive View
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", color: isDark ? "#86efac" : "#166534", fontWeight: "750", backgroundColor: isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7", padding: "3px 9px", borderRadius: "6px" }}>
                  ● Live Sync Active
                </span>
                <button 
                  type="button"
                  style={{ padding: "6px 14px", backgroundColor: colors.accent, color: colors.accentText, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "850", cursor: "pointer" }}
                >
                  + Add Lead
                </button>
              </div>
            </div>

            {/* Pipeline Metric Highlights in Canary Yellow */}
            <div style={{ padding: "14px 22px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", backgroundColor: isDark ? "#111622" : "#f1f5f9", borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ backgroundColor: colors.card, padding: "10px 14px", borderRadius: "8px", border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: "10.5px", color: colors.textMuted, fontWeight: "700", textTransform: "uppercase" }}>Pipeline Value</span>
                <div style={{ fontSize: "18px", fontWeight: "900", color: colors.accent, marginTop: "2px" }}>$4,250,000</div>
              </div>
              <div style={{ backgroundColor: colors.card, padding: "10px 14px", borderRadius: "8px", border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: "10.5px", color: colors.textMuted, fontWeight: "700", textTransform: "uppercase" }}>Deals in Progress</span>
                <div style={{ fontSize: "18px", fontWeight: "900", color: colors.textPrimary, marginTop: "2px" }}>34 Deals</div>
              </div>
              <div style={{ backgroundColor: colors.card, padding: "10px 14px", borderRadius: "8px", border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: "10.5px", color: colors.textMuted, fontWeight: "700", textTransform: "uppercase" }}>Win Rate</span>
                <div style={{ fontSize: "18px", fontWeight: "900", color: colors.accent, marginTop: "2px" }}>72.4%</div>
              </div>
              <div style={{ backgroundColor: colors.card, padding: "10px 14px", borderRadius: "8px", border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: "10.5px", color: colors.textMuted, fontWeight: "700", textTransform: "uppercase" }}>Rev Growth</span>
                <div style={{ fontSize: "18px", fontWeight: "900", color: "#22c55e", marginTop: "2px" }}>+48.6% MoM</div>
              </div>
            </div>

            {/* Pipeline Stage Columns Grid */}
            <div style={{ padding: "20px 22px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px", backgroundColor: colors.card }}>
              
              {/* Qualification */}
              <div style={{ backgroundColor: colors.cardSubtle, padding: "12px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "800", color: colors.textSecondary, marginBottom: "10px" }}>
                  <span>Qualification (3)</span>
                  <span style={{ color: colors.accent, fontWeight: "850" }}>$12,000</span>
                </div>
                <div style={{ backgroundColor: colors.card, padding: "12px", borderRadius: "8px", border: `1px solid ${colors.border}`, marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>Acme Corp</span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: colors.accentBgSubtle, color: colors.accent, fontWeight: "800" }}>Active</span>
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "4px" }}>Value: $3,200 • Rep: Rahul S.</div>
                </div>
              </div>

              {/* Proposal */}
              <div style={{ backgroundColor: colors.cardSubtle, padding: "12px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "800", color: colors.textSecondary, marginBottom: "10px" }}>
                  <span>Proposal Sent (5)</span>
                  <span style={{ color: colors.accent, fontWeight: "850" }}>$25,000</span>
                </div>
                <div style={{ backgroundColor: colors.card, padding: "12px", borderRadius: "8px", border: `1px solid ${colors.border}`, marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>Global Dynamics</span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: colors.accentBgSubtle, color: colors.accent, fontWeight: "800" }}>Quote Sent</span>
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "4px" }}>Value: $12,500 • Rep: Priya K.</div>
                </div>
              </div>

              {/* Negotiation */}
              <div style={{ backgroundColor: colors.cardSubtle, padding: "12px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "800", color: colors.textSecondary, marginBottom: "10px" }}>
                  <span>Negotiation (2)</span>
                  <span style={{ color: colors.accent, fontWeight: "850" }}>$40,000</span>
                </div>
                <div style={{ backgroundColor: colors.card, padding: "12px", borderRadius: "8px", border: `1px solid ${colors.border}`, marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>TechCorp Solutions</span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: colors.accentBgSubtle, color: colors.accent, fontWeight: "800" }}>Contract Ready</span>
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "4px" }}>Value: $28,000 • Rep: Harsh G.</div>
                </div>
              </div>

              {/* Closed Won */}
              <div style={{ backgroundColor: isDark ? "rgba(34, 197, 94, 0.08)" : "#f0fdf4", padding: "12px", borderRadius: "10px", border: `1px solid ${isDark ? "rgba(34, 197, 94, 0.25)" : "#bbf7d0"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "800", color: isDark ? "#86efac" : "#166534", marginBottom: "10px" }}>
                  <span>Closed Won 🏆</span>
                  <span style={{ color: isDark ? "#86efac" : "#166534", fontWeight: "900" }}>$75,000</span>
                </div>
                <div style={{ backgroundColor: colors.card, padding: "12px", borderRadius: "8px", border: `1px solid ${isDark ? "rgba(34, 197, 94, 0.25)" : "#bbf7d0"}`, marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>Synergize Media</span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "#dcfce7", color: isDark ? "#86efac" : "#16a34a", fontWeight: "800" }}>Paid Annual</span>
                  </div>
                  <div style={{ fontSize: "11px", color: isDark ? "#86efac" : "#16a34a", fontWeight: "700", marginTop: "4px" }}>✓ ₹35,000 GST Collected</div>
                </div>
              </div>

            </div>

            {/* Bottom Performance & Activity Split */}
            <div style={{ padding: "0 22px 22px 22px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
              <div style={{ backgroundColor: colors.cardSubtle, padding: "16px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: colors.textPrimary }}>Weekly Revenue Velocity</span>
                  <span style={{ fontSize: "11px", color: colors.accent, fontWeight: "800" }}>+48% vs Last Month</span>
                </div>
                <div style={{ height: "60px", display: "flex", alignItems: "flex-end", gap: "8px", paddingBottom: "4px" }}>
                  <div style={{ flex: 1, height: "30%", backgroundColor: isDark ? "#2a364d" : "#e2e8f0", borderRadius: "4px" }}></div>
                  <div style={{ flex: 1, height: "45%", backgroundColor: isDark ? "#334155" : "#cbd5e1", borderRadius: "4px" }}></div>
                  <div style={{ flex: 1, height: "40%", backgroundColor: isDark ? "#475569" : "#94a3b8", borderRadius: "4px" }}></div>
                  <div style={{ flex: 1, height: "65%", backgroundColor: colors.accentDark, borderRadius: "4px" }}></div>
                  <div style={{ flex: 1, height: "80%", backgroundColor: colors.accentHover, borderRadius: "4px" }}></div>
                  <div style={{ flex: 1, height: "100%", backgroundColor: colors.accent, borderRadius: "4px", boxShadow: `0 0 10px ${colors.accent}` }}></div>
                </div>
              </div>

              <div style={{ backgroundColor: colors.cardSubtle, padding: "16px", borderRadius: "10px", border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: colors.textPrimary, display: "block", marginBottom: "10px" }}>
                  Live Team Deal Feed
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11.5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: colors.textSecondary }}>
                    <span>Harsh moved <strong>TechCorp</strong> to Negotiation</span>
                    <span style={{ color: colors.accent }}>12m ago</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: colors.textSecondary }}>
                    <span>Murli closed <strong>Synergize Media</strong> (₹35k)</span>
                    <span style={{ color: colors.accent }}>45m ago</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 🏢 CORPORATE CLIENT TRUST STRIP */}
          <div style={{ marginTop: "56px", paddingTop: "32px", borderTop: `1px solid ${colors.border}` }}>
            <span style={{ fontSize: "11px", fontWeight: "850", textTransform: "uppercase", letterSpacing: "1.2px", color: colors.textMuted, display: "block", marginBottom: "20px" }}>
              TRUSTED BY HIGH-GROWTH SALES TEAMS & ENTERPRISES
            </span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "48px", flexWrap: "wrap", opacity: 0.85 }}>
              <div style={{ fontSize: "16px", fontWeight: "850", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "6px" }}>
                🏢 TechCorp
              </div>
              <div style={{ fontSize: "16px", fontWeight: "850", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "6px" }}>
                🌐 Global Dynamics
              </div>
              <div style={{ fontSize: "16px", fontWeight: "850", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "6px" }}>
                ⚡ Innovate Solutions
              </div>
              <div style={{ fontSize: "16px", fontWeight: "850", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "6px" }}>
                📊 DataPoint
              </div>
              <div style={{ fontSize: "16px", fontWeight: "850", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "6px" }}>
                🚀 FinLeap
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 🚀 4 PILLAR ENTERPRISE CAPABILITIES */}
      <section id="features" style={{ padding: "80px 24px", backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <span style={{ fontSize: "11px", fontWeight: "850", color: colors.accent, textTransform: "uppercase", letterSpacing: "1.2px" }}>
              Enterprise Architecture
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: "900", color: colors.textPrimary, marginTop: "6px" }}>
              Built for Speed, Governance & Revenue Velocity
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            
            <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, padding: "26px", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: colors.accentBgSubtle, color: colors.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Table size={22} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "850", color: colors.textPrimary, marginBottom: "8px" }}>Data Grid + Kanban Dual View</h3>
              <p style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.6" }}>
                Enter hundreds of leads at lightning speed with inline editing, then toggle into visual drag-and-drop Kanban cards for executive oversight.
              </p>
            </div>

            <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, padding: "26px", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: colors.accentBgSubtle, color: colors.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Zap size={22} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "850", color: colors.textPrimary, marginBottom: "8px" }}>Zoho-Style 360° Lead Profiles</h3>
              <p style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.6" }}>
                Comprehensive client intelligence with interactive audio call recordings, quotation uploads, note timelines, and status history.
              </p>
            </div>

            <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, padding: "26px", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: colors.accentBgSubtle, color: colors.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Shield size={22} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "850", color: colors.textPrimary, marginBottom: "8px" }}>Anti-Theft PIN Protection</h3>
              <p style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.6" }}>
                Prevent employee client database leaks. Reps only access assigned leads with masked contact numbers and export restrictions.
              </p>
            </div>

            <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, padding: "26px", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: colors.accentBgSubtle, color: colors.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <RotateCw size={22} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "850", color: colors.textPrimary, marginBottom: "8px" }}>Renewal Automation & Excel Sync</h3>
              <p style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.6" }}>
                Directly import your existing .xlsx Excel files. Track upcoming contract renewals and never let an existing client slip through.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 💳 TRANSPARENT ENTERPRISE PRICING */}
      <section id="pricing" style={{ padding: "80px 24px", maxWidth: "1150px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span style={{ fontSize: "11px", fontWeight: "850", color: colors.accent, textTransform: "uppercase", letterSpacing: "1.2px" }}>
            Transparent Pricing
          </span>
          <h2 style={{ fontSize: "32px", fontWeight: "900", color: colors.textPrimary, marginTop: "6px" }}>
            Predictable Pricing for Growing Sales Orgs
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "24px", alignItems: "stretch" }}>
          
          {/* Starter Plan */}
          <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: "14px", padding: "30px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>
                Starter Plan
              </span>
              <div style={{ fontSize: "28px", fontWeight: "900", color: colors.textPrimary, marginTop: "6px" }}>
                Free / Trial
              </div>
              <p style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "6px" }}>
                For solo founders testing pipeline speed.
              </p>
              <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: "24px", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px", color: colors.textSecondary }}>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>Up to 100 Active Leads</span></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>Kanban & Pipeline Table View</span></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>1 Sales Rep Account</span></div>
                <div style={{ display: "flex", gap: "8px", color: colors.textMuted }}><X size={16} /> <span>1-Click WhatsApp Templates</span></div>
              </div>
            </div>
            <a 
              href="#demo"
              style={{ display: "block", textAlign: "center", padding: "12px", marginTop: "28px", backgroundColor: colors.cardSubtle, border: `1px solid ${colors.border}`, color: colors.textPrimary, borderRadius: "8px", fontSize: "13px", fontWeight: "750", textDecoration: "none" }}
            >
              Get Started
            </a>
          </div>

          {/* Gold Growth Plan (Featured with Yellow Glow) */}
          <div style={{ backgroundColor: colors.card, border: `2px solid ${colors.accent}`, borderRadius: "14px", padding: "30px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", boxShadow: colors.shadowCta }}>
            <span style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", backgroundColor: colors.accent, color: colors.accentText, padding: "3px 14px", borderRadius: "999px", fontSize: "10.5px", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase" }}>
              MOST POPULAR ⭐
            </span>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "850", color: colors.accent, textTransform: "uppercase", letterSpacing: "1px" }}>
                Gold Growth Plan
              </span>
              <div style={{ fontSize: "32px", fontWeight: "900", color: colors.textPrimary, marginTop: "6px" }}>
                ₹35,000 <span style={{ fontSize: "13px", fontWeight: "500", color: colors.textSecondary }}>/ 3 Months</span>
              </div>
              <p style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "6px" }}>
                For high-velocity teams closing revenue daily.
              </p>
              <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: "24px", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px", color: colors.textPrimary }}>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <strong style={{ color: colors.textPrimary }}>Up to 1,000 Active Leads</strong></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <strong style={{ color: colors.textPrimary }}>Up to 5 Users / Sales Reps</strong></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>1-Click WhatsApp Integration</span></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>Excel (.xlsx) Renewal Bulk Import</span></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>360° Lead Profile Drawer</span></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>Anti-Theft PIN Protection</span></div>
              </div>
            </div>
            <a 
              href="#demo"
              style={{ display: "block", textAlign: "center", padding: "12px", marginTop: "28px", backgroundColor: colors.accent, color: colors.accentText, borderRadius: "8px", fontSize: "13px", fontWeight: "850", textDecoration: "none", boxShadow: colors.shadowCta }}
            >
              Book Gold Plan Demo &rarr;
            </a>
          </div>

          {/* Enterprise Plan */}
          <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: "14px", padding: "30px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>
                Enterprise Plan
              </span>
              <div style={{ fontSize: "28px", fontWeight: "900", color: colors.textPrimary, marginTop: "6px" }}>
                ₹65,000 <span style={{ fontSize: "13px", fontWeight: "500", color: colors.textSecondary }}>/ 6 Months</span>
              </div>
              <p style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "6px" }}>
                For multi-tier organizations requiring full hierarchy.
              </p>
              <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: "24px", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px", color: colors.textSecondary }}>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>Unlimited Leads & Deals</span></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>Up to 15 Reps + Multiple Managers</span></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>Dedicated Account Manager</span></div>
                <div style={{ display: "flex", gap: "8px" }}><Check size={16} color={colors.accent} /> <span>Priority 24/7 WhatsApp SLA</span></div>
              </div>
            </div>
            <a 
              href="#demo"
              style={{ display: "block", textAlign: "center", padding: "12px", marginTop: "28px", backgroundColor: colors.cardSubtle, border: `1px solid ${colors.border}`, color: colors.textPrimary, borderRadius: "8px", fontSize: "13px", fontWeight: "750", textDecoration: "none" }}
            >
              Contact Sales
            </a>
          </div>

        </div>
      </section>

      {/* ⚡ DIRECT "BOOK A DEMO" LEAD CAPTURE SECTION */}
      <section id="demo" style={{ padding: "80px 24px", backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "36px", boxShadow: colors.shadowCard }}>
          
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <span style={{ fontSize: "11px", fontWeight: "850", color: colors.accent, textTransform: "uppercase", letterSpacing: "1.2px" }}>
              Direct Cloud Sync
            </span>
            <h2 style={{ fontSize: "26px", fontWeight: "900", color: colors.textPrimary, marginTop: "4px" }}>
              Book Your 1-on-1 Product Walkthrough
            </h2>
            <p style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "4px" }}>
              Fill the details below. This inquiry will automatically generate a real-time lead in your CRM!
            </p>
          </div>

          {isSubmitted ? (
            <div style={{ backgroundColor: isDark ? "rgba(34, 197, 94, 0.1)" : "#f0fdf4", border: `1.5px solid ${isDark ? "rgba(34, 197, 94, 0.3)" : "#86efac"}`, borderRadius: "12px", padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "6px" }}>🎉</div>
              <h3 style={{ fontSize: "17px", fontWeight: "850", color: isDark ? "#86efac" : "#166534", margin: 0 }}>
                Demo Request Captured Successfully!
              </h3>
              <p style={{ fontSize: "13px", color: isDark ? "#bbf7d0" : "#166534", marginTop: "6px", lineHeight: "1.5" }}>
                Thank you, <strong>{formData.name}</strong>! Your inquiry is logged in ApexSales CRM. Our team will contact your WhatsApp (<span style={{ fontFamily: "monospace" }}>{formData.phone}</span>) shortly.
              </p>
              <button
                type="button"
                onClick={onNavigateToCRM}
                style={{ marginTop: "16px", padding: "10px 20px", backgroundColor: colors.accent, color: colors.accentText, border: "none", borderRadius: "8px", fontWeight: "850", fontSize: "13px", cursor: "pointer" }}
              >
                Open CRM to View this Live Lead &rarr;
              </button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              
              {submitError && (
                <div style={{ padding: "10px 14px", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", color: "#f87171", fontSize: "12px" }}>
                  ⚠️ {submitError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: colors.textSecondary, marginBottom: "4px" }}>
                    Your Name *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: "8px", color: colors.textPrimary, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: colors.textSecondary, marginBottom: "4px" }}>
                    Company Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. TechCorp Solutions"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: "8px", color: colors.textPrimary, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: colors.textSecondary, marginBottom: "4px" }}>
                    WhatsApp / Phone Number *
                  </label>
                  <input 
                    type="tel" 
                    required
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: "8px", color: colors.textPrimary, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: colors.textSecondary, marginBottom: "4px" }}>
                    Work Email *
                  </label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. rahul@techcorp.in"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", backgroundColor: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: "8px", color: colors.textPrimary, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: colors.textSecondary, marginBottom: "4px" }}>
                  Interested Package Tier
                </label>
                <select
                  value={formData.plan}
                  onChange={e => setFormData({ ...formData, plan: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: "8px", color: colors.textPrimary, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                >
                  <option value="Gold Growth Plan (₹35,000 / 3 Months)" style={{ backgroundColor: colors.card, color: colors.textPrimary }}>Gold Growth Plan (₹35,000 / 3 Months) - Most Popular ⭐</option>
                  <option value="Platinum Enterprise Plan (₹65,000 / 6 Months)" style={{ backgroundColor: colors.card, color: colors.textPrimary }}>Platinum Enterprise Plan (₹65,000 / 6 Months)</option>
                  <option value="Starter Plan (Trial)" style={{ backgroundColor: colors.card, color: colors.textPrimary }}>Starter Trial Plan</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{ padding: "14px", backgroundColor: colors.accent, color: colors.accentText, border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "850", cursor: isSubmitting ? "not-allowed" : "pointer", marginTop: "6px", boxShadow: colors.shadowCta }}
              >
                {isSubmitting ? "Syncing to CRM..." : "Schedule Walkthrough & Live Demo"}
              </button>

            </form>
          )}

        </div>
      </section>

      {/* ❓ FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" style={{ padding: "80px 24px", maxWidth: "850px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span style={{ fontSize: "11px", fontWeight: "850", color: colors.accent, textTransform: "uppercase", letterSpacing: "1.2px" }}>
            Got Questions?
          </span>
          <h2 style={{ fontSize: "30px", fontWeight: "900", color: colors.textPrimary, marginTop: "4px" }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: "10px", overflow: "hidden" }}
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                style={{ width: "100%", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", color: colors.textPrimary, fontSize: "14px", fontWeight: "750", textAlign: "left", cursor: "pointer" }}
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp size={18} color={colors.accent} /> : <ChevronDown size={18} color={colors.textSecondary} />}
              </button>
              {openFaq === idx && (
                <div style={{ padding: "0 20px 16px 20px", fontSize: "13px", color: colors.textSecondary, lineHeight: "1.6" }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 🦶 CORPORATE FOOTER */}
      <footer style={{ padding: "36px 24px", borderTop: `1px solid ${colors.border}`, backgroundColor: isDark ? "#070a10" : "#f1f5f9", fontSize: "12.5px", color: colors.textSecondary }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 22H7L12 12L17 22H22L12 2Z" fill="#facc15" />
              </svg>
            </div>
            <strong style={{ color: colors.textPrimary, fontSize: "13.5px" }}>ApexSales CRM</strong>
            <span>• Enterprise Revenue & Sales Pipeline Cloud</span>
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <span>Email: <a href="mailto:welcome@salesflowhub.cloud" style={{ color: colors.accent, textDecoration: "none" }}>welcome@salesflowhub.cloud</a></span>
            <button 
              type="button" 
              onClick={onNavigateToCRM}
              style={{ background: "none", border: "none", color: colors.accent, cursor: "pointer", fontWeight: "800", textDecoration: "underline" }}
            >
              Log In to CRM
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
