import React, { useState, useMemo } from 'react';
import {
  TrendingUp, Award, Users, Target, BarChart2, DollarSign,
  ArrowUpRight, ArrowDownRight, ChevronRight, Calendar, Bell,
  Shield, CheckCircle2, Clock, AlertTriangle, Download, Plus,
  FileText, Send, Settings, Sparkles, MessageSquare, Bot,
  ExternalLink, Layers, Search, Filter, RefreshCw, ArrowRight
} from 'lucide-react';

export default function SalesHeadDashboard({
  currentUser,
  leads = [],
  ownerScopedLeads = [],
  allUsersList = [],
  tasks = [],
  simulatedRole,
  onNavigate,
  onOpenReport,
  onAddLead,
  showToast = () => {}
}) {
  const [trendRange, setTrendRange] = useState("6m");
  const [aiQuery, setAiQuery] = useState("");

  // Base leads list (respects leads from props)
  const activeLeadsList = useMemo(() => {
    if (Array.isArray(leads) && leads.length > 0) return leads;
    if (Array.isArray(ownerScopedLeads) && ownerScopedLeads.length > 0) return ownerScopedLeads;
    return [];
  }, [leads, ownerScopedLeads]);

  // Lead status classification helpers
  const isWonStatus = (status) => {
    const s = (status || "").trim().toLowerCase();
    return s === "won" || s === "closed won" || s === "renewal won" || s === "renewed";
  };

  const isLostStatus = (status) => {
    const s = (status || "").trim().toLowerCase();
    return s === "lost" || s === "junk" || s === "closed lost" || s === "deal lost" || s === "dropped" || s === "disqualified" || s.includes("lost");
  };

  const isActiveStatus = (status) => {
    const s = (status || "").trim().toLowerCase();
    return s !== "" && !isWonStatus(status) && !isLostStatus(status);
  };

  const getStatusBadgeStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("won")) return { bg: "#dcfce7", color: "#15803d" };
    if (s.includes("lost") || s.includes("junk")) return { bg: "#f1f5f9", color: "#64748b" };
    if (s.includes("proposal")) return { bg: "#fff7ed", color: "#c2410c" };
    if (s.includes("qualified") || s.includes("demo")) return { bg: "#fef3c7", color: "#b45309" };
    if (s.includes("contacted")) return { bg: "#f0fdf4", color: "#16a34a" };
    return { bg: "#eff6ff", color: "#2563eb" };
  };

  // Top 6 Metrics
  const totalLeadsCount = activeLeadsList.length;
  const wonLeads = useMemo(() => activeLeadsList.filter(l => isWonStatus(l.status)), [activeLeadsList]);
  const wonCount = wonLeads.length;
  const totalRevenue = useMemo(() => wonLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0), [wonLeads]);
  const activeLeads = useMemo(() => activeLeadsList.filter(l => isActiveStatus(l.status)), [activeLeadsList]);
  const activeCount = activeLeads.length;
  const activePipelineValue = useMemo(() => activeLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0), [activeLeads]);
  const conversionRate = totalLeadsCount > 0 ? ((wonCount / totalLeadsCount) * 100).toFixed(1) : "0.0";
  const avgDealValue = wonCount > 0 ? Math.round(totalRevenue / wonCount) : (totalLeadsCount > 0 ? Math.round(activeLeadsList.reduce((acc, l) => acc + (Number(l.value) || 0), 0) / totalLeadsCount) : 0);
  const quotaAttainment = Math.min(100, Math.round((totalRevenue / 1000000) * 100));

  // Top performing team members (strictly dynamic from allUsersList and real lead owners)
  const topMembers = useMemo(() => {
    const memberMap = new Map();
    (allUsersList || []).forEach(u => {
      const name = (u.name || u.displayName || u.username || "").trim();
      if (name && !memberMap.has(name.toLowerCase())) {
        memberMap.set(name.toLowerCase(), {
          name,
          role: u.role,
          leads: 0,
          won: 0,
          revenue: 0
        });
      }
    });

    activeLeadsList.forEach(l => {
      const owner = (l.owner || "").trim();
      if (owner && owner.toLowerCase() !== "unassigned" && owner.toLowerCase() !== "none") {
        if (!memberMap.has(owner.toLowerCase())) {
          memberMap.set(owner.toLowerCase(), {
            name: owner,
            role: "sales_rep",
            leads: 0,
            won: 0,
            revenue: 0
          });
        }
      }
    });

    activeLeadsList.forEach(l => {
      const owner = (l.owner || "").trim().toLowerCase();
      if (memberMap.has(owner)) {
        const m = memberMap.get(owner);
        m.leads += 1;
        if (isWonStatus(l.status)) {
          m.won += 1;
          m.revenue += (Number(l.value) || 0);
        }
      }
    });

    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
    return Array.from(memberMap.values())
      .sort((a, b) => b.won - a.won || b.revenue - a.revenue || b.leads - a.leads)
      .slice(0, 5)
      .map((m, idx) => ({
        ...m,
        rank: idx + 1,
        conv: m.leads > 0 ? `${Math.round((m.won / m.leads) * 100)}%` : "0%",
        initial: (m.name.charAt(0) || "U").toUpperCase(),
        color: colors[idx % colors.length]
      }));
  }, [allUsersList, activeLeadsList]);

  // Lead Source Distribution
  const leadSources = useMemo(() => {
    const counts = {};
    activeLeadsList.forEach(l => {
      const s = (l.source || "Website").trim();
      counts[s] = (counts[s] || 0) + 1;
    });
    const colors = ["#2563eb", "#0284c7", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444", "#64748b"];
    const total = activeLeadsList.length;
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], idx) => ({
        name,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        color: colors[idx % colors.length]
      }));
    return sorted.length > 0 ? sorted : [{ name: "Direct", count: 0, pct: 0, color: "#2563eb" }];
  }, [activeLeadsList]);

  // Last 6 months trend
  const trendMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString("en-IN", { month: "short" });

      const monthWon = activeLeadsList.filter(l => {
        if (!isWonStatus(l.status)) return false;
        const dStr = l.won_date || l.createdAt || "";
        return dStr.startsWith(key);
      });

      const rev = monthWon.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
      const deals = monthWon.length;

      months.push({ key, label, rev, deals });
    }
    return months;
  }, [activeLeadsList]);

  // Dynamic SVG Points for 6-Month Trend
  const maxTrendRev = Math.max(...trendMonths.map(m => m.rev), totalRevenue > 0 ? totalRevenue : 100000);
  const maxTrendDeals = Math.max(...trendMonths.map(m => m.deals), wonCount > 0 ? wonCount : 10);

  const revenuePoints = trendMonths.map((m, i) => {
    const x = 15 + i * (270 / 5);
    const y = 105 - Math.round(((m.rev || 0) / maxTrendRev) * 80);
    return { x, y };
  });

  const dealsPoints = trendMonths.map((m, i) => {
    const x = 15 + i * (270 / 5);
    const y = 105 - Math.round(((m.deals || 0) / maxTrendDeals) * 65);
    return { x, y };
  });

  const revenuePolyline = revenuePoints.map(p => `${p.x},${p.y}`).join(" ");
  const dealsPolyline = dealsPoints.map(p => `${p.x},${p.y}`).join(" ");

  // Recent Leads Table
  const recentLeads = useMemo(() => {
    return [...activeLeadsList]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [activeLeadsList]);

  // Upcoming Follow-ups
  const upcomingFollowups = useMemo(() => {
    const list = activeLeadsList
      .filter(l => isActiveStatus(l.status))
      .slice(0, 5)
      .map(l => {
        const prio = l.score === "Hot" ? "High" : l.score === "Warm" ? "Medium" : "Low";
        let dateStr = "Upcoming";
        if (l.next_follow_up) {
          try {
            dateStr = new Date(l.next_follow_up).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' });
          } catch(e) {
            dateStr = l.next_follow_up;
          }
        }
        return {
          lead: l.company || l.name,
          date: dateStr,
          rep: l.owner || "Unassigned",
          prio,
          prioBg: prio === "High" ? "#fee2e2" : prio === "Medium" ? "#ffedd5" : "#f1f5f9",
          prioColor: prio === "High" ? "#dc2626" : prio === "Medium" ? "#ea580c" : "#64748b"
        };
      });
    return list;
  }, [activeLeadsList]);

  // Today's Tasks
  const todaysTasks = useMemo(() => {
    if (Array.isArray(tasks) && tasks.length > 0) {
      const pending = tasks.filter(t => !t.completed && !t.isDone).slice(0, 5);
      if (pending.length > 0) {
        return pending.map(t => {
          const prio = t.priority || "Medium";
          return {
            task: t.title || "Sales Follow-up",
            due: t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "Today",
            prio,
            prioBg: prio === "High" ? "#fee2e2" : prio === "Medium" ? "#ffedd5" : "#f1f5f9",
            prioColor: prio === "High" ? "#dc2626" : prio === "Medium" ? "#ea580c" : "#64748b"
          };
        });
      }
    }
    return activeLeadsList
      .filter(l => isActiveStatus(l.status))
      .slice(0, 5)
      .map(l => {
        const prio = l.score === "Hot" ? "High" : l.score === "Warm" ? "Medium" : "Low";
        return {
          task: `Follow up with ${l.name} (${l.company || 'Prospect'})`,
          due: l.next_follow_up ? new Date(l.next_follow_up).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "Today",
          prio,
          prioBg: prio === "High" ? "#fee2e2" : prio === "Medium" ? "#ffedd5" : "#f1f5f9",
          prioColor: prio === "High" ? "#dc2626" : prio === "Medium" ? "#ea580c" : "#64748b"
        };
      });
  }, [tasks, activeLeadsList]);

  // Recent Activities
  const recentActivities = useMemo(() => {
    const acts = [];
    wonLeads.slice(0, 2).forEach(l => {
      acts.push({
        title: `Closed Won Deal: ${l.name}`,
        subtitle: `₹${(Number(l.value) || 0).toLocaleString("en-IN")} • ${l.owner || 'Sales Team'}`,
        color: "#16a34a"
      });
    });
    activeLeadsList.slice(0, 3).forEach(l => {
      if (acts.length < 3) {
        acts.push({
          title: `Active Lead: ${l.name} (${l.company || l.source || 'Pipeline'})`,
          subtitle: `Assigned to ${l.owner || 'Unassigned'} • ${l.status || 'New'}`,
          color: "#0f172a"
        });
      }
    });
    return acts;
  }, [wonLeads, activeLeadsList]);

  // Recent Payments
  const recentPayments = useMemo(() => {
    return wonLeads.slice(0, 5).map(l => ({
      lead: l.company || l.name,
      amt: `₹${(Number(l.value) || 0).toLocaleString("en-IN")}`,
      date: l.won_date ? new Date(l.won_date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "Recently",
      rep: l.owner || "Sales Team"
    }));
  }, [wonLeads]);

  // AI Assistant State
  const topPerformer = topMembers.length > 0 ? topMembers[0] : null;
  const [aiMessages, setAiMessages] = useState([
    {
      from: "ai",
      text: `Hi ${currentUser?.displayName || currentUser?.name || "Harsh"}! Pipeline is active with ${totalLeadsCount} total leads and ₹${totalRevenue.toLocaleString("en-IN")} closed revenue.`
    }
  ]);

  const handleAiSend = (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    const q = aiQuery.trim();
    setAiMessages(prev => [
      ...prev,
      { from: "user", text: q },
      {
        from: "ai",
        text: `Analyzing "${q}"... Your current department pipeline conversion is ${conversionRate}% with ₹${totalRevenue.toLocaleString("en-IN")} revenue. ${topPerformer && topPerformer.won > 0 ? `${topPerformer.name} is leading with ${topPerformer.won} won deals.` : 'All active leads are synced in real-time.'}`
      }
    ]);
    setAiQuery("");
  };

  const hr = new Date().getHours();
  const greetingText = hr < 12 ? "Good Morning" : hr < 17 ? "Good Afternoon" : "Good Evening";
  const userGreetingName = currentUser?.displayName || currentUser?.name || "Harsh Goyal";

  return (
    <div style={{ padding: "0 0 30px 0", color: "#0f172a", fontFamily: "'Inter', sans-serif" }}>
      
      {/* 1. Header Banner */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "16px",
        backgroundColor: "#ffffff",
        padding: "12px 16px",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "5px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "800",
            letterSpacing: "0.4px"
          }}>
            Sales Head Dashboard
          </div>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
            Complete control. Better visibility. Drive bigger results.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "5px 10px",
            borderRadius: "6px",
            fontWeight: "600",
            color: "#475569"
          }}>
            <Calendar size={13} color="#64748b" />
            <span>{new Date().toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenReport ? onOpenReport() : showToast("Generating Executive Revenue Deck...", "info")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <Download size={13} />
            Export Deck
          </button>
        </div>
      </div>

      {/* Greeting Subtitle */}
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0", letterSpacing: "-0.02em", lineHeight: "1.25" }}>
          {greetingText}, {userGreetingName} (Sales Head)!
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0, fontWeight: "400", lineHeight: "1.5" }}>
          Here's your company's live sales performance across all {totalLeadsCount} active leads.
        </p>
      </div>

      {/* Full-Width Dashboard Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
          
          {/* TOP 6 KPI CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}>
            
            {/* KPI 1: Total Revenue */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <DollarSign size={13} color="#ea580c" />
                <span>Total Revenue</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                ₹{totalRevenue.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>↑ {wonCount} deals won</span>
              </div>
            </div>

            {/* KPI 2: Total Deals Won */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <Award size={13} color="#2563eb" />
                <span>Total Deals Won</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                {wonCount}
              </div>
              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>{conversionRate}% conversion</span>
              </div>
            </div>

            {/* KPI 3: Active Leads */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <Users size={13} color="#059669" />
                <span>Active Leads</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                {activeCount}
              </div>
              <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>of {totalLeadsCount} total leads</span>
              </div>
            </div>

            {/* KPI 4: Conversion Rate */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <Target size={13} color="#d97706" />
                <span>Conversion Rate</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                {conversionRate}%
              </div>
              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>Won vs Total</span>
              </div>
            </div>

            {/* KPI 5: Team Performance */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <BarChart2 size={13} color="#7c3aed" />
                <span>Team Performance</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                {quotaAttainment}%
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>Target ₹10L Quota</span>
              </div>
            </div>

            {/* KPI 6: Avg Deal Value */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <TrendingUp size={13} color="#2563eb" />
                <span>Avg. Deal Value</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                ₹{avgDealValue.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>per closed deal</span>
              </div>
            </div>

          </div>

          {/* ROW 2: ANALYTICS & TRENDS (3 COLUMNS) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.1fr", gap: "12px" }}>
            
            {/* 1. Revenue & Sales Trend */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Revenue & Sales Trend</div>
                <div style={{ fontSize: "11px", color: "#64748b", border: "1px solid #cbd5e1", padding: "1px 6px", borderRadius: "4px" }}>
                  Last 6 Months
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#64748b", marginBottom: "10px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2563eb" }} /> Revenue (₹)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f97316" }} /> Deals Won
                </span>
              </div>

              {/* Clean SVG Trend Chart */}
              <div style={{ height: "130px", width: "100%", position: "relative" }}>
                <svg viewBox="0 0 300 120" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="110" x2="300" y2="110" stroke="#e2e8f0" />
                  
                  {/* Revenue Curve (Blue) */}
                  <polyline
                    points={revenuePolyline}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Deals Won Curve (Orange) */}
                  <polyline
                    points={dealsPolyline}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Revenue Points */}
                  {revenuePoints.map((p, i) => (
                    <circle key={`rev-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                  ))}
                  {/* Deals Points */}
                  {dealsPoints.map((p, i) => (
                    <circle key={`deal-${i}`} cx={p.x} cy={p.y} r="2.5" fill="#f97316" stroke="#ffffff" strokeWidth="1" />
                  ))}
                </svg>

                {/* X-Axis Labels */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                  {trendMonths.map((m, idx) => (
                    <span key={idx}>{m.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Lead Source Distribution */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
                Lead Source Distribution
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "auto 0" }}>
                {/* Donut SVG */}
                <div style={{ position: "relative", width: "95px", height: "95px", flexShrink: 0 }}>
                  <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                    {(() => {
                      let accumulatedPct = 0;
                      return leadSources.map((src, i) => {
                        const dashArray = `${src.pct} ${100 - src.pct}`;
                        const offset = -accumulatedPct;
                        accumulatedPct += src.pct;
                        return (
                          <circle
                            key={i}
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke={src.color}
                            strokeWidth="3.5"
                            strokeDasharray={dashArray}
                            strokeDashoffset={offset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", lineHeight: 1 }}>{totalLeadsCount}</div>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "600" }}>Total Leads</div>
                  </div>
                </div>

                {/* Legend list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", flex: 1, maxHeight: "140px", overflowY: "auto" }}>
                  {leadSources.slice(0, 6).map((src, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "95px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: src.color, flexShrink: 0 }} />
                        {src.name}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "10px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
                        <span>{src.count}</span> <strong style={{ color: "#0f172a" }}>{src.pct}%</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Top Performing Team Members */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Top Performing Team Members</div>
                <span onClick={() => onNavigate && onNavigate("team")} style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", cursor: "pointer" }}>
                  View All <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '3px' }} />
                </span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ color: "#64748b", borderBottom: "1px solid #f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "4px 2px", fontWeight: "600" }}>#</th>
                    <th style={{ padding: "4px 4px", fontWeight: "600" }}>Name</th>
                    <th style={{ padding: "4px 4px", fontWeight: "600", textAlign: "center" }}>Leads</th>
                    <th style={{ padding: "4px 4px", fontWeight: "600", textAlign: "center" }}>Won</th>
                    <th style={{ padding: "4px 2px", fontWeight: "600", textAlign: "right" }}>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {topMembers.map((row) => (
                    <tr key={row.rank} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "6px 2px", fontWeight: "700", color: "#94a3b8" }}>{row.rank}</td>
                      <td style={{ padding: "6px 4px", fontWeight: "700", color: "#0f172a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: `${row.color}15`, color: row.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800" }}>
                            {row.initial}
                          </span>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }}>{row.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "6px 4px", textAlign: "center", color: "#475569" }}>{row.leads}</td>
                      <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: "600", color: "#0f172a" }}>{row.won}</td>
                      <td style={{ padding: "6px 2px", textAlign: "right" }}>
                        <span style={{ backgroundColor: "#dcfce7", color: "#15803d", fontWeight: "600", padding: "1px 5px", borderRadius: "4px", fontSize: "10px" }}>
                          {row.conv}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {topMembers.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "12px", color: "#94a3b8" }}>
                        No team members registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* ROW 3: RECENT LEADS, UPCOMING FOLLOW-UPS, TODAY'S TASKS (3 COLUMNS) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px" }}>
            
            {/* Recent Leads */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                  <Search size={14} color="#64748b" />
                  <span>Recent Leads</span>
                </div>
                <span onClick={() => onNavigate && onNavigate("sheet")} style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", cursor: "pointer" }}>
                  View All <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '3px' }} />
                </span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ color: "#64748b", borderBottom: "1px solid #f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "4px 2px", fontWeight: "600" }}>Name</th>
                    <th style={{ padding: "4px 4px", fontWeight: "600" }}>Company</th>
                    <th style={{ padding: "4px 4px", fontWeight: "600" }}>Status</th>
                    <th style={{ padding: "4px 2px", fontWeight: "600", textAlign: "right" }}>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((row, i) => {
                    const badge = getStatusBadgeStyle(row.status);
                    return (
                      <tr key={row.id || i} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "6px 2px", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }}>{row.name}</td>
                        <td style={{ padding: "6px 4px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }}>{row.company || "—"}</td>
                        <td style={{ padding: "6px 4px" }}>
                          <span style={{ backgroundColor: badge.bg, color: badge.color, fontWeight: "700", padding: "1px 5px", borderRadius: "4px", fontSize: "10px" }}>
                            {row.status || "New"}
                          </span>
                        </td>
                        <td style={{ padding: "6px 2px", textAlign: "right", color: "#475569", fontSize: "10px", whiteSpace: "nowrap" }}>
                          {row.owner || "Unassigned"}
                        </td>
                      </tr>
                    );
                  })}
                  {recentLeads.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "12px", color: "#94a3b8" }}>
                        No leads in pipeline yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Upcoming Follow-ups */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                  <Clock size={14} color="#64748b" />
                  <span>Upcoming Follow-ups</span>
                </div>
                <span onClick={() => onNavigate && onNavigate("followups")} style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", cursor: "pointer" }}>
                  View All <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '3px' }} />
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {upcomingFollowups.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 6px", backgroundColor: "#f8fafc", borderRadius: "6px", fontSize: "11px" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{item.lead}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>{item.date} • {item.rep}</div>
                    </div>
                    <span style={{ backgroundColor: item.prioBg, color: item.prioColor, fontWeight: "600", padding: "1px 6px", borderRadius: "4px", fontSize: "10px" }}>
                      {item.prio}
                    </span>
                  </div>
                ))}
                {upcomingFollowups.length === 0 && (
                  <div style={{ textAlign: "center", padding: "12px", color: "#94a3b8", fontSize: "11px" }}>
                    No upcoming follow-ups scheduled.
                  </div>
                )}
              </div>
            </div>

            {/* Today's Tasks */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                  <CheckCircle2 size={14} color="#64748b" />
                  <span>Today's Tasks</span>
                </div>
                <span onClick={() => onNavigate && onNavigate("tasks")} style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", cursor: "pointer" }}>
                  View All <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '3px' }} />
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {todaysTasks.map((t, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 6px", backgroundColor: "#f8fafc", borderRadius: "6px", fontSize: "11px" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{t.task}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>Due: {t.due}</div>
                    </div>
                    <span style={{ backgroundColor: t.prioBg, color: t.prioColor, fontWeight: "600", padding: "1px 6px", borderRadius: "4px", fontSize: "10px" }}>
                      {t.prio}
                    </span>
                  </div>
                ))}
                {todaysTasks.length === 0 && (
                  <div style={{ textAlign: "center", padding: "12px", color: "#94a3b8", fontSize: "11px" }}>
                    No pending tasks for today.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ROW 4: PAYMENTS, ACTIONS & AI ASSISTANT (4 BLOCKS) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr 1fr 1.2fr", gap: "12px" }}>
            
            {/* 1. Recent Activity */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>Recent Activity ({recentActivities.length})</span>
                <span onClick={() => onNavigate && onNavigate("sheet")} style={{ fontSize: "10px", color: "#2563eb", fontWeight: "700", cursor: "pointer" }}>View All <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '3px' }} /></span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px" }}>
                {recentActivities.map((act, i) => (
                  <div key={i}>
                    <div style={{ fontWeight: "700", color: act.color }}>{act.title}</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>{act.subtitle}</div>
                  </div>
                ))}
                {recentActivities.length === 0 && (
                  <div style={{ color: "#94a3b8", fontSize: "10px", textAlign: "center", padding: "8px 0" }}>
                    No recent activity recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* 2. Recent Payments */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>Recent Payments ({recentPayments.length})</span>
                <span onClick={() => onNavigate && onNavigate("deals")} style={{ fontSize: "10px", color: "#2563eb", fontWeight: "700", cursor: "pointer" }}>View All <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '3px' }} /></span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11px" }}>
                {recentPayments.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < recentPayments.length - 1 ? "1px solid #f8fafc" : "none", paddingBottom: "3px" }}>
                    <div>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>{p.lead}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{p.date} • {p.rep}</div>
                    </div>
                    <span style={{ fontWeight: "800", color: "#16a34a" }}>{p.amt}</span>
                  </div>
                ))}
                {recentPayments.length === 0 && (
                  <div style={{ color: "#94a3b8", fontSize: "10px", textAlign: "center", padding: "8px 0" }}>
                    No won payments recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* 3. Quick Actions */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", display: "block", marginBottom: "8px" }}>
                Quick Actions
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => onAddLead ? onAddLead() : showToast("Opening Add Lead modal...", "info")}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px 4px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "10px", fontWeight: "700", color: "#1e293b", cursor: "pointer" }}
                >
                  <Plus size={14} color="#2563eb" />
                  <span>Add Lead</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate("tasks") : showToast("Navigating to Task Manager...", "info")}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px 4px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "10px", fontWeight: "700", color: "#1e293b", cursor: "pointer" }}
                >
                  <CheckCircle2 size={14} color="#16a34a" />
                  <span>Create Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Opening Proposal Generator...", "info")}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px 4px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "10px", fontWeight: "700", color: "#1e293b", cursor: "pointer" }}
                >
                  <Send size={14} color="#7c3aed" />
                  <span>Send Proposal</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate("reports") : showToast("Opening Reports & Analytics...", "info")}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px 4px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "10px", fontWeight: "700", color: "#1e293b", cursor: "pointer" }}
                >
                  <BarChart2 size={14} color="#d97706" />
                  <span>View Reports</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate("team") : showToast("Navigating to Team & Roles...", "info")}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px 4px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "10px", fontWeight: "700", color: "#1e293b", cursor: "pointer" }}
                >
                  <Users size={14} color="#059669" />
                  <span>Manage Team</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate("settings") : showToast("Opening Settings...", "info")}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px 4px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "10px", fontWeight: "700", color: "#1e293b", cursor: "pointer" }}
                >
                  <Settings size={14} color="#64748b" />
                  <span>Settings</span>
                </button>
              </div>
            </div>

            {/* 4. SalesFlow AI Assistant */}
            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#16a34a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bot size={12} />
                  </div>
                  <strong style={{ fontSize: "12px", color: "#15803d" }}>SalesFlow AI Assistant</strong>
                  <span style={{ fontSize: "9px", backgroundColor: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: "9999px", fontWeight: "700" }}>Online</span>
                </div>

                <div style={{ backgroundColor: "#ffffff", border: "1px solid #dcfce7", borderRadius: "6px", padding: "8px", fontSize: "11px", color: "#334155", lineHeight: "1.4", maxHeight: "85px", overflowY: "auto" }}>
                  {aiMessages.map((m, i) => (
                    <div key={i} style={{ marginBottom: "4px", color: m.from === "ai" ? "#15803d" : "#0f172a" }}>
                      <strong>{m.from === "ai" ? "AI: " : "You: "}</strong>{m.text}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAiSend} style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  style={{ flex: 1, padding: "5px 8px", fontSize: "11px", border: "1px solid #cbd5e1", borderRadius: "4px", outline: "none", backgroundColor: "#ffffff" }}
                />
                <button
                  type="submit"
                  style={{ padding: "5px 10px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Send size={11} />
                </button>
              </form>
            </div>

          </div>

      </div>

    </div>
  );
}
