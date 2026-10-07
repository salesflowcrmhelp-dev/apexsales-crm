import React, { useState, useMemo } from 'react';
import {
  Users, Award, AlertTriangle, Target, DollarSign, CheckCircle2,
  Calendar, Sun, Download, FileText, Shuffle, UserPlus, PhoneCall,
  Clock, Shield, BarChart3, ChevronRight, Layers, MessageSquare,
  Sparkles, Bell, Radio, ArrowUpRight
} from 'lucide-react';

export default function TeamLeaderDashboard({
  currentUser,
  leads = [],
  ownerScopedLeads = [],
  allUsersList = [],
  tasks = [],
  simulatedRole,
  onNavigate,
  onOpenReport,
  onAssignLeads,
  onStartMyDay,
  showToast = () => {}
}) {
  const [activeLeadTab, setActiveLeadTab] = useState("all");
  const [timeFilter, setTimeFilter] = useState("week");

  // Determine Team Leader Identity
  const tlUser = useMemo(() => {
    if (simulatedRole === "team_leader") {
      return (
        allUsersList.find(u => (u.role || '').toLowerCase().includes("leader")) ||
        currentUser ||
        { name: "Vikram Malhotra", displayName: "Vikram Malhotra" }
      );
    }
    return currentUser || { name: "Vikram Malhotra", displayName: "Vikram Malhotra" };
  }, [simulatedRole, allUsersList, currentUser]);

  const tlName = (tlUser?.displayName || tlUser?.name || "Vikram Malhotra").trim();

  // Status helpers
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

  // Direct reporting employees from allUsersList
  const directReports = useMemo(() => {
    const tlLower = tlName.toLowerCase();
    const direct = (allUsersList || []).filter(u => {
      const repTo = (u.reportsTo || u.manager || '').trim().toLowerCase();
      return repTo === tlLower || (tlLower.includes("vikram") && (repTo.includes("vikram") || repTo.includes("malhotra")));
    });
    if (direct.length > 0) return direct;
    // Show sales executives/reps in squad
    return (allUsersList || []).filter(u => {
      const r = (u.role || '').toLowerCase();
      return r.includes("executive") || r.includes("rep") || r.includes("sales");
    });
  }, [allUsersList, tlName]);

  const squadMemberNames = useMemo(() => {
    return new Set([
      tlName.toLowerCase(),
      ...directReports.map(u => (u.name || u.displayName || '').toLowerCase())
    ]);
  }, [tlName, directReports]);

  // Squad leads list
  const squadLeads = useMemo(() => {
    if (Array.isArray(ownerScopedLeads) && ownerScopedLeads.length > 0) {
      return ownerScopedLeads;
    }
    const base = Array.isArray(leads) && leads.length > 0 ? leads : [];
    const filtered = base.filter(l => {
      const o = (l.owner || "").trim().toLowerCase();
      return squadMemberNames.has(o) || o === "" || o === "unassigned" || o === "none" || (tlName.toLowerCase().includes("vikram") && (o.includes("vikram") || o.includes("rohan")));
    });
    return filtered.length > 0 ? filtered : base;
  }, [ownerScopedLeads, leads, squadMemberNames, tlName]);

  // Squad KPIs
  const teamLeadsCount = squadLeads.length;
  const squadWonLeads = useMemo(() => squadLeads.filter(l => isWonStatus(l.status)), [squadLeads]);
  const teamWonCount = squadWonLeads.length;
  const pendingFollowUps = useMemo(() => squadLeads.filter(l => isActiveStatus(l.status) && (l.next_follow_up || l.score === "Hot")), [squadLeads]);
  const pendingFollowUpsCount = pendingFollowUps.length;
  const conversionRate = teamLeadsCount > 0 ? ((teamWonCount / teamLeadsCount) * 100).toFixed(1) : "0.0";
  const teamRevenue = useMemo(() => squadWonLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0), [squadWonLeads]);

  const squadPendingTasksCount = useMemo(() => {
    if (Array.isArray(tasks) && tasks.length > 0) {
      return tasks.filter(t => !t.completed && !t.isDone).length;
    }
    return pendingFollowUpsCount;
  }, [tasks, pendingFollowUpsCount]);

  // Squad Performance comparison
  const squadPerformance = useMemo(() => {
    const memberMap = new Map();
    // TL
    memberMap.set(tlName.toLowerCase(), { name: tlName, leads: 0, won: 0 });
    // Direct reports
    directReports.forEach(u => {
      const n = (u.name || u.displayName || "").trim();
      if (n) memberMap.set(n.toLowerCase(), { name: n, leads: 0, won: 0 });
    });
    // Distinct lead owners
    squadLeads.forEach(l => {
      const o = (l.owner || "").trim();
      if (o && o.toLowerCase() !== "unassigned") {
        if (!memberMap.has(o.toLowerCase())) {
          memberMap.set(o.toLowerCase(), { name: o, leads: 0, won: 0 });
        }
      }
    });

    squadLeads.forEach(l => {
      const o = (l.owner || "").trim().toLowerCase();
      if (memberMap.has(o)) {
        const item = memberMap.get(o);
        item.leads += 1;
        if (isWonStatus(l.status)) item.won += 1;
      }
    });

    return Array.from(memberMap.values()).slice(0, 5);
  }, [tlName, directReports, squadLeads]);

  const topSquadPerformer = useMemo(() => {
    if (squadPerformance.length === 0) return null;
    return [...squadPerformance].sort((a, b) => b.won - a.won || b.leads - a.leads)[0];
  }, [squadPerformance]);

  const maxSquadVal = Math.max(1, ...squadPerformance.map(m => Math.max(m.leads, m.won)));

  // Stage filtered leads
  const stageCounts = useMemo(() => ({
    all: squadLeads.length,
    new: squadLeads.filter(l => /^(new|new lead)$/i.test((l.status || '').trim())).length,
    contacted: squadLeads.filter(l => /contacted/i.test(l.status || '')).length,
    qualified: squadLeads.filter(l => /qualified/i.test(l.status || '')).length,
    proposal: squadLeads.filter(l => /proposal/i.test(l.status || '')).length,
    won: squadWonLeads.length
  }), [squadLeads, squadWonLeads]);

  const filteredLeads = useMemo(() => {
    if (activeLeadTab === "all") return squadLeads;
    if (activeLeadTab === "new") return squadLeads.filter(l => /^(new|new lead)$/i.test((l.status || '').trim()));
    if (activeLeadTab === "contacted") return squadLeads.filter(l => /contacted/i.test(l.status || ''));
    if (activeLeadTab === "qualified") return squadLeads.filter(l => /qualified/i.test(l.status || ''));
    if (activeLeadTab === "proposal") return squadLeads.filter(l => /proposal/i.test(l.status || ''));
    if (activeLeadTab === "won") return squadLeads.filter(l => isWonStatus(l.status));
    return squadLeads;
  }, [activeLeadTab, squadLeads]);

  // Squad Tasks
  const todaysTasks = useMemo(() => {
    if (Array.isArray(tasks) && tasks.length > 0) {
      const pending = tasks.filter(t => !t.completed && !t.isDone).slice(0, 5);
      if (pending.length > 0) {
        return pending.map(t => {
          const prio = t.priority || "Medium";
          return {
            task: t.title || "Team Follow-up",
            due: t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "Today",
            prio,
            prioBg: prio === "High" ? "#fee2e2" : prio === "Medium" ? "#ffedd5" : "#f1f5f9",
            prioColor: prio === "High" ? "#dc2626" : prio === "Medium" ? "#ea580c" : "#64748b"
          };
        });
      }
    }
    return squadLeads
      .filter(l => isActiveStatus(l.status))
      .slice(0, 5)
      .map(l => {
        const prio = l.score === "Hot" ? "High" : l.score === "Warm" ? "Medium" : "Low";
        return {
          task: `Follow up with ${l.name} (${l.company || 'Pipeline'})`,
          due: l.next_follow_up ? new Date(l.next_follow_up).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "Today",
          prio,
          prioBg: prio === "High" ? "#fee2e2" : prio === "Medium" ? "#ffedd5" : "#f1f5f9",
          prioColor: prio === "High" ? "#dc2626" : prio === "Medium" ? "#ea580c" : "#64748b"
        };
      });
  }, [tasks, squadLeads]);

  const hr = new Date().getHours();
  const greetingText = hr < 12 ? "Good Morning" : hr < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div style={{ padding: "0 0 30px 0", color: "#0f172a", fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      
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
            Team Leader Dashboard
          </div>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
            Track your team. Manage your leads. Drive results.
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
            onClick={() => onStartMyDay ? onStartMyDay() : showToast("Opening Start My Day workflow...", "info")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#f59e0b",
              color: "#ffffff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <Sun size={13} />
            Start My Day
          </button>
        </div>
      </div>

      {/* Greeting Subtitle */}
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0", letterSpacing: "-0.02em", lineHeight: "1.25" }}>
          {greetingText}, {tlName} (Team Leader)! 👏
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0, fontWeight: "400", lineHeight: "1.5" }}>
          Here's your squad's performance and live leads requiring attention.
        </p>
      </div>

      {/* Full-Width Dashboard Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
          
          {/* TOP 6 SQUAD KPIS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}>
            
            {/* KPI 1: My Team Leads */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <Users size={13} color="#2563eb" />
                <span>My Team Leads</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                {teamLeadsCount}
              </div>
              <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>Squad Pipeline</span>
              </div>
            </div>

            {/* KPI 2: My Team Won */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <Award size={13} color="#2563eb" />
                <span>My Team Won</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                {teamWonCount}
              </div>
              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>Closed Deals</span>
              </div>
            </div>

            {/* KPI 3: Pending Follow-ups */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #fed7aa", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ea580c", fontSize: "11px", fontWeight: "700" }}>
                <AlertTriangle size={13} color="#dc2626" />
                <span>Pending Follow-ups</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: pendingFollowUpsCount > 0 ? "#dc2626" : "#0f172a", margin: "6px 0 3px 0" }}>
                {pendingFollowUpsCount}
              </div>
              <div style={{ fontSize: "11px", color: "#ea580c", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>Action needed</span>
              </div>
            </div>

            {/* KPI 4: Conversion Rate */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <Target size={13} color="#059669" />
                <span>Conversion Rate</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                {conversionRate}%
              </div>
              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>Won vs Squad</span>
              </div>
            </div>

            {/* KPI 5: Team Revenue */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <DollarSign size={13} color="#2563eb" />
                <span>Team Revenue</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                ₹{teamRevenue.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
                <span>Total Closed</span>
              </div>
            </div>

            {/* KPI 6: My Pending Tasks */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontWeight: "700" }}>
                <CheckCircle2 size={13} color="#7c3aed" />
                <span>My Pending Tasks</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0" }}>
                {squadPendingTasksCount}
              </div>
              <div
                onClick={() => onNavigate && onNavigate("tasks")}
                style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", cursor: "pointer" }}
              >
                View Tasks →
              </div>
            </div>

          </div>

          {/* ROW 2: TEAM PERFORMANCE BAR CHART + MY LEADS TABLE (2 COLUMNS) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: "12px" }}>
            
            {/* 1. Team Performance Bar Chart */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Squad Performance</div>
                <div style={{ fontSize: "11px", color: "#64748b", border: "1px solid #cbd5e1", padding: "1px 6px", borderRadius: "4px" }}>
                  Active Team
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "#2563eb" }} /> Leads
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "#f97316" }} /> Deals Won
                </span>
              </div>

              {/* Bar Chart */}
              <div style={{ height: "140px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", paddingBottom: "22px", borderBottom: "1px solid #e2e8f0", position: "relative" }}>
                {squadPerformance.map((item, i) => {
                  const leadsHeight = maxSquadVal > 0 ? (item.leads / maxSquadVal) * 100 : 0;
                  const wonHeight = maxSquadVal > 0 ? (item.won / maxSquadVal) * 100 : 0;

                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", width: "100%", justifyContent: "center" }}>
                        {/* Leads bar */}
                        <div
                          title={`${item.name} Leads: ${item.leads}`}
                          style={{
                            width: "14px",
                            height: `${Math.max(leadsHeight, 4)}%`,
                            backgroundColor: "#2563eb",
                            borderRadius: "3px 3px 0 0",
                            transition: "height 0.3s ease"
                          }}
                        />
                        {/* Won bar */}
                        <div
                          title={`${item.name} Deals Won: ${item.won}`}
                          style={{
                            width: "14px",
                            height: `${Math.max(wonHeight, 4)}%`,
                            backgroundColor: "#f97316",
                            borderRadius: "3px 3px 0 0",
                            transition: "height 0.3s ease"
                          }}
                        />
                      </div>
                      <span style={{
                        position: "absolute",
                        bottom: "2px",
                        fontSize: "9px",
                        color: "#64748b",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "70px",
                        textAlign: "center"
                      }}>
                        {item.name.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
                {squadPerformance.length === 0 && (
                  <div style={{ width: "100%", textAlign: "center", color: "#94a3b8", fontSize: "11px", margin: "auto" }}>
                    No squad activity yet.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "11px", color: "#64748b" }}>
                <span>
                  Top performer: <strong>{topSquadPerformer ? `${topSquadPerformer.name} (${topSquadPerformer.won} won)` : "All reps active"}</strong>
                </span>
                <span onClick={() => onNavigate && onNavigate("team")} style={{ color: "#2563eb", fontWeight: "700", cursor: "pointer" }}>Manage Team →</span>
              </div>
            </div>

            {/* 2. My Leads Table with Stage Tabs */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                  <Users size={14} color="#64748b" />
                  <span>My Leads</span>
                </div>
                <span onClick={() => onNavigate && onNavigate("sheet")} style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", cursor: "pointer" }}>
                  View All →
                </span>
              </div>

              {/* Stage Filter Tabs */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "10px", overflowX: "auto", paddingBottom: "2px" }}>
                {[
                  { key: "all", label: `All (${stageCounts.all})` },
                  { key: "new", label: `New (${stageCounts.new})` },
                  { key: "contacted", label: `Contacted (${stageCounts.contacted})` },
                  { key: "qualified", label: `Qualified (${stageCounts.qualified})` },
                  { key: "proposal", label: `Proposal (${stageCounts.proposal})` },
                  { key: "won", label: `Won (${stageCounts.won})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveLeadTab(tab.key)}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "5px",
                      fontSize: "10px",
                      fontWeight: activeLeadTab === tab.key ? "800" : "600",
                      backgroundColor: activeLeadTab === tab.key ? "#0f172a" : "#f1f5f9",
                      color: activeLeadTab === tab.key ? "#ffffff" : "#475569",
                      border: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Leads Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ color: "#64748b", borderBottom: "1px solid #f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "4px 2px", fontWeight: "600" }}>Name</th>
                    <th style={{ padding: "4px 4px", fontWeight: "600" }}>Company</th>
                    <th style={{ padding: "4px 4px", fontWeight: "600" }}>Status</th>
                    <th style={{ padding: "4px 4px", fontWeight: "600" }}>Assigned To</th>
                    <th style={{ padding: "4px 2px", fontWeight: "600", textAlign: "right" }}>Follow Up</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.slice(0, 5).map((row, i) => {
                    const badge = getStatusBadgeStyle(row.status);
                    return (
                      <tr key={row.id || i} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "6px 2px", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80px" }}>{row.name}</td>
                        <td style={{ padding: "6px 4px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80px" }}>{row.company || "—"}</td>
                        <td style={{ padding: "6px 4px" }}>
                          <span style={{ backgroundColor: badge.bg, color: badge.color, fontWeight: "700", padding: "1px 5px", borderRadius: "4px", fontSize: "10px" }}>
                            {row.status || "New"}
                          </span>
                        </td>
                        <td style={{ padding: "6px 4px", color: "#475569", fontSize: "10px", whiteSpace: "nowrap" }}>{row.owner || "Unassigned"}</td>
                        <td style={{ padding: "6px 2px", textAlign: "right", color: row.next_follow_up ? "#2563eb" : "#64748b", fontWeight: "700" }}>
                          {row.next_follow_up ? new Date(row.next_follow_up).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "Follow Up"}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "12px", color: "#94a3b8" }}>
                        No leads in this stage.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* ROW 3: MY TASKS + TEAM LEADER QUICK ACTIONS (2 COLUMNS) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
            
            {/* 1. My Tasks */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                  <CheckCircle2 size={14} color="#64748b" />
                  <span>My Tasks</span>
                </div>
                <span onClick={() => onNavigate && onNavigate("tasks")} style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", cursor: "pointer" }}>
                  View All →
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {todaysTasks.map((t, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", backgroundColor: "#f8fafc", borderRadius: "6px", fontSize: "11px" }}>
                    <div>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>{t.task}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>Due Date: {t.due}</div>
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

            {/* 2. Team Leader Quick Actions */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "10px" }}>
                Team Leader Quick Actions
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("team")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#1e293b",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <BarChart3 size={14} color="#2563eb" />
                  <span>View Team Performance</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("deals")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#1e293b",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <Target size={14} color="#059669" />
                  <span>Track Leads & Conversions</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("sheet")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#1e293b",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <Users size={14} color="#7c3aed" />
                  <span>Manage Leads</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAssignLeads ? onAssignLeads() : onNavigate ? onNavigate("unassigned") : showToast("Opening Lead Assignment Queue...", "info")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#1e293b",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <Shuffle size={14} color="#ea580c" />
                  <span>Assign Tasks & Leads</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenReport ? onOpenReport() : onNavigate ? onNavigate("reports") : showToast("Opening Reports...", "info")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#1e293b",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <FileText size={14} color="#0284c7" />
                  <span>View Reports (PDF/Excel)</span>
                </button>
              </div>
            </div>

          </div>

      </div>

    </div>
  );
}
