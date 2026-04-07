import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const ADMIN_ID = "b41a3909-5ebe-430a-bce2-9bcefeed1af2";
const ACTIVE_GW = 1;

const C = {
  bg: "#1C2131", bgDeep: "#141926", bgCard: "#242C3E", bgCardHov: "#2C3550",
  crimson: "#E24343", crimsonLt: "#FF6B6B", gold: "#F0C040", goldDim: "#F0C04018",
  white: "#F1F5F9", whiteD: "#CBD5E1", gray: "#64748B", grayLt: "#94A3B8",
  success: "#3DBF7A", danger: "#E24343", border: "#FFFFFF10", borderHov: "#FFFFFF20",
  indigo: "#818CF8", amber: "#FB923C",
};

const ROLE_LABELS = { BAT: "Batter", BOWL: "Bowler", AR: "All-rounder", WK: "Keeper" };
const ROLE_COLORS = { BAT: "#818CF8", BOWL: "#F0C040", AR: "#3DBF7A", WK: "#FB923C" };
const BUDGET = 1000;
const ROLE_LIMITS = { BAT: 5, BOWL: 5, AR: 4, WK: 3 };
const SQUAD_SIZE = 15;
const TRANSFERS_PER_GW = 4;
const MARQUEE_PRICE = 100;
const MAX_MARQUEE = 3;

const SCORING = [
  { label: "Run scored", value: "1 pt" }, { label: "Boundary (4)", value: "+4 bonus" },
  { label: "Six (6)", value: "+6 bonus" }, { label: "Half-century (50)", value: "+20 pts" },
  { label: "Century (100)", value: "+35 pts" }, { label: "Duck", value: "-5 pts" },
  { label: "Wicket taken", value: "10 pts" }, { label: "3-wicket haul", value: "+20 pts" },
  { label: "5-wicket haul", value: "+35 pts" }, { label: "Catch", value: "15 pts" },
  { label: "Run out", value: "15 pts" }, { label: "No ball bowled", value: "-1 pt" },
  { label: "3 wides bowled", value: "-1 pt" }, { label: "Captain", value: "2x points" },
  { label: "Vice Captain", value: "1.5x points" },
];

const RULES = [
  { title: "Squad size", desc: "Select 15 players. All 15 score points every gameweek — no bench." },
  { title: "Budget", desc: "You have $1,000 credits to build your squad. Spend wisely." },
  { title: "Role limits", desc: "Max 5 Batters, Max 5 Bowlers, Max 4 All-rounders, Max 3 Keepers." },
  { title: "Captain & VC", desc: "Pick a captain (2x points) and vice captain (1.5x) each gameweek." },
  { title: "Marquee cap", desc: "Maximum 3 marquee players (priced $100+) per squad." },
  { title: "Transfers", desc: "4 transfers per gameweek. Window opens after Thursday selection." },
  { title: "Deadlines", desc: "Transfer deadline is Friday night. Late transfers not accepted." },
  { title: "Scoring", desc: "Every player in your 15 scores — runs, wickets, catches, run outs all count." },
  { title: "View teams", desc: "Other managers' squads are visible only after the transfer window closes." },
  { title: "PlayCricket", desc: "Scores pulled from PlayCricket after each round, updated by Sunday." },
];

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Sora',sans-serif;background:#141926;color:#F1F5F9;min-height:100vh}
  ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#1C2131}
  ::-webkit-scrollbar-thumb{background:#374151;border-radius:3px}
  input::placeholder{color:#64748B}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
`;

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

function calcPoints(s) {
  let pts = 0;
  pts += (s.runs || 0); pts += (s.fours || 0) * 4; pts += (s.sixes || 0) * 6;
  if ((s.runs || 0) >= 100) pts += 35; else if ((s.runs || 0) >= 50) pts += 20;
  if (s.was_dismissed && (s.runs || 0) === 0 && s.did_bat) pts -= 5;
  pts += (s.wickets || 0) * 10;
  if (s.five_fer) pts += 35; else if (s.three_fer) pts += 20;
  pts += (s.catches || 0) * 15; pts += (s.run_outs || 0) * 15; pts += (s.stumpings || 0) * 15;
  pts -= (s.no_balls || 0); pts -= Math.floor((s.wides || 0) / 3);
  return Math.max(pts, 0);
}

// --- SHARED COMPONENTS ---

function Spinner({ label = "Loading..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${C.bgCard}`, borderTop: `2px solid ${C.crimson}`, animation: "spin 0.7s linear infinite" }} />
      <div style={{ fontSize: 13, color: C.gray }}>{label}</div>
    </div>
  );
}

function Inp({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, color: C.gray, marginBottom: 5, fontWeight: 500 }}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width: "100%", background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none" }} />
    </div>
  );
}

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role];
  return <span style={{ background: c + "20", color: c, border: `1px solid ${c}40`, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>{ROLE_LABELS[role]}</span>;
}

function StatCard({ label, value, accent, onClick, sub }) {
  return (
    <div onClick={onClick} style={{ background: C.bgCard, borderRadius: 10, padding: "12px 14px", border: `1px solid ${(accent || C.crimson)}20`, textAlign: "center", cursor: onClick ? "pointer" : "default", transition: "border-color 0.15s" }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = (accent || C.crimson) + "50")}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = (accent || C.crimson) + "20")}>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent || C.white }}>{value}</div>
      <div style={{ fontSize: 10, color: C.gray, marginTop: 2, letterSpacing: 0.3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: accent || C.crimson, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Header({ title, sub }) {
  return (
    <div style={{ padding: "24px clamp(16px,4vw,32px) 16px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 10, color: C.crimson, letterSpacing: 3, fontWeight: 600, marginBottom: 5 }}>OAKLEIGH CRICKET CLUB</div>
      <h1 style={{ fontSize: "clamp(20px,5vw,28px)", fontWeight: 700, color: C.white, lineHeight: 1.2 }}>{title}</h1>
      {sub && <p style={{ color: C.gray, marginTop: 5, fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: C.bgCard, borderRadius: 14, padding: 24, width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto", border: `1px solid ${C.border}`, animation: "fadeUp 0.25s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.gray, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Countdown({ deadline }) {
  const [time, setTime] = useState({});
  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) { setTime({ expired: true }); return; }
      setTime({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    calc(); const id = setInterval(calc, 1000); return () => clearInterval(id);
  }, [deadline]);
  if (time.expired) return <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.danger + "20", border: `1px solid ${C.danger}40`, borderRadius: 8, padding: "6px 14px" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: C.danger, animation: "pulse 1s infinite" }} /><span style={{ fontSize: 12, color: C.danger, fontWeight: 600 }}>Deadline passed</span></div>;
  const seg = (v, l) => <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: C.white, lineHeight: 1 }}>{String(v).padStart(2, "0")}</div><div style={{ fontSize: 9, color: C.gray, marginTop: 2 }}>{l}</div></div>;
  const sep = <div style={{ fontSize: 16, fontWeight: 700, color: C.crimson, marginBottom: 8 }}>:</div>;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, animation: "pulse 2s infinite", flexShrink: 0 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{seg(time.d, "days")}{sep}{seg(time.h, "hrs")}{sep}{seg(time.m, "min")}{sep}{seg(time.s, "sec")}</div>
    </div>
  );
}

// --- AUTH ---

function AuthPage() {
  const [mode, setMode] = useState("login");
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: C.bgDeep }}>
      <div style={{ animation: "fadeUp 0.4s ease", width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="https://static.wixstatic.com/media/c2192c_93a1860777ae4b16af6c3dc7bc071184~mv2.png" alt="OCC Logo" style={{ width: 72, height: 72, margin: "0 auto 14px", display: "block", objectFit: "contain" }} />
          <div style={{ fontWeight: 700, fontSize: 20, color: C.white }}>OCC Fantasy</div>
          <div style={{ fontSize: 11, color: C.gray, marginTop: 3, letterSpacing: 1 }}>OAKLEIGH CRICKET CLUB · 2026-27</div>
        </div>
        <div style={{ display: "flex", background: C.bgCard, borderRadius: 10, padding: 3, marginBottom: 20, border: `1px solid ${C.border}` }}>
          {["login", "signup"].map(m => <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", background: mode === m ? C.bg : "transparent", color: mode === m ? C.white : C.gray, fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>{m === "login" ? "Log in" : "Sign up"}</button>)}
        </div>
        {mode === "login" ? <LoginForm /> : <SignupForm />}
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const handle = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Incorrect email or password."); setLoading(false);
  };
  return (
    <div style={{ background: C.bgCard, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
      <Inp label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      <Inp label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
      {error && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12, padding: "8px 12px", background: C.danger + "15", borderRadius: 6 }}>{error}</div>}
      <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: loading ? C.bgCard : C.crimson, color: C.white, fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>{loading ? "Logging in..." : "Log in"}</button>
    </div>
  );
}

function SignupForm() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(""); const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const handle = async () => {
    if (!email || !password || !confirm) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (teamName && data.user) await supabase.from("profiles").update({ team_name: teamName, username: email }).eq("id", data.user.id);
    setLoading(false);
  };
  return (
    <div style={{ background: C.bgCard, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
      <Inp label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      <Inp label="Team name (optional)" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Howes XI" />
      <Inp label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
      <Inp label="Confirm password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" />
      {error && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12, padding: "8px 12px", background: C.danger + "15", borderRadius: 6 }}>{error}</div>}
      <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: loading ? C.bgCard : C.crimson, color: C.white, fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>{loading ? "Creating account..." : "Create account"}</button>
    </div>
  );
}

// --- NAV ---

const BOTTOM_TABS = [
  { id: "squad",       label: "Squad",      icon: "⬡" },
  { id: "players",     label: "Players",    icon: "☰" },
  { id: "leaderboard", label: "Standings",  icon: "◎" },
  { id: "howtoplay",   label: "Rules",      icon: "?" },
];

function Nav({ page, setPage, user, profile, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();
  const isAdmin = user?.id === ADMIN_ID;

  const allTabs = [
    { id: "squad", label: "My Squad" }, { id: "players", label: "Players" },
    { id: "leaderboard", label: "Leaderboard" }, { id: "teams", label: "View Teams" },
    { id: "history", label: "GW History" }, { id: "stats", label: "Season Stats" },
    { id: "howtoplay", label: "How to Play" },
    ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
  ];

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <nav style={{ background: C.bgDeep, borderBottom: `1px solid ${C.border}`, position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", padding: "0 16px", height: 52 }}>
          <img src="https://static.wixstatic.com/media/c2192c_93a1860777ae4b16af6c3dc7bc071184~mv2.png" alt="OCC" style={{ width: 30, height: 30, objectFit: "contain", marginRight: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 14, color: C.white, flex: 1 }}>OCC Fantasy</div>
          {/* More menu button */}
          <button onClick={() => setShowMobileMenu(m => !m)} style={{ background: "none", border: "none", color: C.gray, fontSize: 22, cursor: "pointer", padding: "0 4px", marginRight: 8, lineHeight: 1 }}>&#8801;</button>
          {/* Avatar */}
          <button onClick={() => setShowMenu(m => !m)} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.crimson, cursor: "pointer" }}>
            {(profile?.team_name || user?.email || "?")[0].toUpperCase()}
          </button>
          {/* Avatar dropdown */}
          {showMenu && (
            <div style={{ position: "absolute", right: 12, top: "calc(100% + 6px)", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 6, minWidth: 180, boxShadow: "0 8px 24px #00000080", zIndex: 300 }}>
              <div style={{ padding: "6px 10px", fontSize: 11, color: C.gray, borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>{user?.email}</div>
              <button onClick={() => { setShowMenu(false); setPage("account"); setShowMobileMenu(false); }} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "none", background: "transparent", color: C.whiteD, cursor: "pointer", fontSize: 13, textAlign: "left" }}>Account settings</button>
              <button onClick={() => { setShowMenu(false); onLogout(); }} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "none", background: "transparent", color: C.danger, cursor: "pointer", fontSize: 13, textAlign: "left" }}>Log out</button>
            </div>
          )}
        </nav>

        {/* Full-screen slide-down menu */}
        {showMobileMenu && (
          <div style={{ position: "fixed", top: 52, left: 0, right: 0, background: C.bgDeep, border: `1px solid ${C.border}`, borderTop: "none", zIndex: 99, padding: "8px 0 16px", boxShadow: "0 8px 24px #00000060", animation: "slideDown 0.2s ease" }}>
            {allTabs.map(t => (
              <button key={t.id} onClick={() => { setPage(t.id); setShowMobileMenu(false); }} style={{ display: "block", width: "100%", padding: "13px 20px", background: page === t.id ? C.crimson + "15" : "none", border: "none", color: page === t.id ? C.crimson : C.whiteD, cursor: "pointer", fontSize: 14, fontWeight: page === t.id ? 700 : 400, textAlign: "left", borderLeft: page === t.id ? `3px solid ${C.crimson}` : "3px solid transparent" }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Bottom tab bar */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.bgDeep, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {BOTTOM_TABS.map(t => (
            <button key={t.id} onClick={() => { setPage(t.id); setShowMobileMenu(false); }} style={{ flex: 1, padding: "10px 0 8px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ fontSize: 16, color: page === t.id ? C.crimson : C.gray }}>{t.icon}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: page === t.id ? C.crimson : C.gray, letterSpacing: 0.3 }}>{t.label}</div>
            </button>
          ))}
        </div>
      </>
    );
  }

  // Desktop nav
  return (
    <nav style={{ background: C.bgDeep, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", padding: "0 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 24, padding: "12px 0", flexShrink: 0 }}>
        <img src="https://static.wixstatic.com/media/c2192c_93a1860777ae4b16af6c3dc7bc071184~mv2.png" alt="OCC" style={{ width: 32, height: 32, objectFit: "contain" }} />
        <div><div style={{ fontWeight: 700, fontSize: 12, color: C.white, lineHeight: 1.1 }}>OCC Fantasy</div><div style={{ fontSize: 9, color: C.gray, letterSpacing: 1 }}>2026-27</div></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", overflowX: "auto", flex: 1 }}>
        {allTabs.map(t => <button key={t.id} onClick={() => setPage(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "17px 12px", fontSize: 12, fontWeight: 500, color: page === t.id ? C.crimson : C.gray, borderBottom: page === t.id ? `2px solid ${C.crimson}` : "2px solid transparent", marginBottom: -1, transition: "color 0.15s", flexShrink: 0 }}>{t.label}</button>)}
      </div>
      <div style={{ position: "relative", flexShrink: 0, paddingLeft: 12 }}>
        <button onClick={() => setShowMenu(m => !m)} style={{ display: "flex", alignItems: "center", gap: 7, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.crimson + "25", border: `1px solid ${C.crimson}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.crimson }}>{(profile?.team_name || user?.email || "?")[0].toUpperCase()}</div>
          <span style={{ fontSize: 12, color: C.white, fontWeight: 500, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.team_name || user?.email}</span>
          <span style={{ fontSize: 9, color: C.gray }}>v</span>
        </button>
        {showMenu && (
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 6, minWidth: 180, boxShadow: "0 8px 24px #00000060", zIndex: 300 }}>
            <div style={{ padding: "6px 10px", fontSize: 11, color: C.gray, borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>{user?.email}</div>
            <button onClick={() => { setShowMenu(false); setPage("account"); }} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "none", background: "transparent", color: C.whiteD, cursor: "pointer", fontSize: 12, fontWeight: 500, textAlign: "left" }}>Account settings</button>
            <button onClick={() => { setShowMenu(false); onLogout(); }} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "none", background: "transparent", color: C.danger, cursor: "pointer", fontSize: 12, fontWeight: 500, textAlign: "left" }}>Log out</button>
          </div>
        )}
      </div>
    </nav>
  );
}

// --- ACCOUNT PAGE ---

function AccountPage({ user, profile, onLogout }) {
  const [teamName, setTeamName] = useState(profile?.team_name || "");
  const [saving, setSaving] = useState(false); const [saveMsg, setSaveMsg] = useState("");
  const [deleting, setDeleting] = useState(false); const [confirmDelete, setConfirmDelete] = useState("");
  const [deleteMsg, setDeleteMsg] = useState(""); const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const saveTeamName = async () => {
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.from("profiles").update({ team_name: teamName }).eq("id", user.id);
    setSaveMsg(error ? "Failed to save." : "Team name updated!"); setSaving(false);
  };
  const deleteAccount = async () => {
    if (confirmDelete !== user.email) { setDeleteMsg("Email doesn't match."); return; }
    setDeleting(true);
    await supabase.from("squads").delete().eq("user_id", user.id);
    await supabase.from("fantasy_points").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    const { error } = await supabase.rpc("delete_user");
    if (error) { setDeleteMsg("Could not fully delete — contact admin."); } else { await supabase.auth.signOut(); onLogout(); }
    setDeleting(false);
  };
  return (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 0px) clamp(16px,4vw,32px) clamp(60px,8vw,48px)", maxWidth: 560 }}>
      <Header title="Account Settings" sub={user.email} />
      <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: C.bgCard, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 14 }}>Team name</div>
          <Inp value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Howes XI" />
          <button onClick={saveTeamName} disabled={saving} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: saving ? C.bg : C.crimson, color: C.white, fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>{saving ? "Saving..." : "Save"}</button>
          {saveMsg && <div style={{ marginTop: 10, fontSize: 12, color: saveMsg.includes("!") ? C.success : C.danger }}>{saveMsg}</div>}
        </div>
        <div style={{ background: C.bgCard, borderRadius: 12, padding: 20, border: `1px solid ${C.danger}30` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.danger, marginBottom: 6 }}>Delete account</div>
          <div style={{ fontSize: 12, color: C.gray, marginBottom: 14, lineHeight: 1.6 }}>Permanently deletes your account, squad, and all points history.</div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.danger}50`, background: C.danger + "15", color: C.danger, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete my account</button>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: C.grayLt, marginBottom: 8 }}>Type your email to confirm: <span style={{ color: C.white }}>{user.email}</span></div>
              <Inp value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder={user.email} />
              {deleteMsg && <div style={{ fontSize: 12, color: C.danger, marginBottom: 8 }}>{deleteMsg}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={deleteAccount} disabled={deleting} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: C.danger, color: C.white, fontSize: 13, fontWeight: 700, cursor: deleting ? "default" : "pointer" }}>{deleting ? "Deleting..." : "Confirm delete"}</button>
                <button onClick={() => { setShowDeleteConfirm(false); setConfirmDelete(""); setDeleteMsg(""); }} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.gray, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- PLAYER PROFILE MODAL ---

function PlayerProfileModal({ player, onClose }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("gameweek_scores").select("*").eq("player_id", player.id).order("gameweek_id", { ascending: true });
      if (data) setScores(data);
      setLoading(false);
    };
    fetch();
  }, [player.id]);
  const totalRuns = scores.reduce((s, r) => s + (r.runs || 0), 0);
  const totalWkts = scores.reduce((s, r) => s + (r.wickets || 0), 0);
  const totalCatches = scores.reduce((s, r) => s + (r.catches || 0), 0);
  const totalPts = scores.reduce((s, r) => s + (r.calculated_pts || 0), 0);
  return (
    <Modal title={player.name} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <RoleBadge role={player.role} />
        {player.is_marquee && <span style={{ background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>MARQUEE</span>}
        <span style={{ fontSize: 13, color: C.gold, fontWeight: 700, marginLeft: "auto" }}>${player.price}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 18 }}>
        {[["Pts", totalPts, C.crimson], ["Runs", totalRuns, C.indigo], ["Wickets", totalWkts, C.gold], ["Catches", totalCatches, C.success]].map(([l, v, a]) => (
          <div key={l} style={{ background: C.bgDeep, borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: a }}>{v}</div>
            <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      {loading ? <Spinner label="Loading stats..." /> : scores.length === 0 ? (
        <div style={{ textAlign: "center", color: C.gray, padding: "20px 0", fontSize: 13 }}>No gameweek data yet — season hasn't started.</div>
      ) : (
        <div>
          <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>GAMEWEEK BREAKDOWN</div>
          <div style={{ background: C.bgDeep, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 70px", padding: "7px 12px", fontSize: 10, color: C.gray, fontWeight: 600, letterSpacing: 0.5, borderBottom: `1px solid ${C.border}` }}>
              <span>GW</span><span>Batting</span><span>Bowling</span><span>Fielding</span><span style={{ textAlign: "right" }}>Pts</span>
            </div>
            {scores.map(s => (
              <div key={s.gameweek_id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 70px", padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
                <span style={{ color: C.crimson, fontWeight: 700 }}>GW{s.gameweek_id}</span>
                <span style={{ color: C.whiteD }}>{s.runs || 0} runs{s.fours ? `, ${s.fours}x4` : ""}{s.sixes ? `, ${s.sixes}x6` : ""}</span>
                <span style={{ color: C.whiteD }}>{s.wickets || 0} wkts</span>
                <span style={{ color: C.whiteD }}>{(s.catches || 0) + (s.run_outs || 0) + (s.stumpings || 0)} field</span>
                <span style={{ textAlign: "right", fontWeight: 700, color: C.crimson }}>{s.calculated_pts || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// --- SQUAD PAGE ---

function SquadPage({ players, userId }) {
  const [squad, setSquad] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loadingSquad, setLoadingSquad] = useState(true);
  const [transfersOpen, setTransfersOpen] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [squadSavedInDb, setSquadSavedInDb] = useState(false);
  const [gwPoints, setGwPoints] = useState(null);
  const [gwAvg, setGwAvg] = useState(null);
  const [gwHigh, setGwHigh] = useState(null);
  const [showGwBreakdown, setShowGwBreakdown] = useState(false);
  const [gwBreakdown, setGwBreakdown] = useState([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      const [squadRes, gwRes, myPtsRes, allPtsRes] = await Promise.all([
        supabase.from("squads").select("player_id, is_captain, is_vice_captain, purchase_price").eq("user_id", userId).eq("gameweek_id", ACTIVE_GW),
        supabase.from("gameweeks").select("deadline, transfers_open").eq("number", ACTIVE_GW).single(),
        supabase.from("fantasy_points").select("total_pts").eq("user_id", userId).eq("gameweek_id", ACTIVE_GW).single(),
        supabase.from("fantasy_points").select("total_pts").eq("gameweek_id", ACTIVE_GW),
      ]);
      if (squadRes.data && squadRes.data.length > 0) {
        // Merge purchase_price from squads table into each player object
        const purchaseMap = {};
        squadRes.data.forEach(r => { purchaseMap[r.player_id] = r.purchase_price || 0; });
        const saved = players
          .filter(p => squadRes.data.map(r => r.player_id).includes(p.id))
          .map(p => ({ ...p, purchase_price: purchaseMap[p.id] || p.price }));
        setSquad(saved); setSquadSavedInDb(true);
        const cap = squadRes.data.find(r => r.is_captain);
        const vc = squadRes.data.find(r => r.is_vice_captain);
        if (cap) setCaptain(cap.player_id);
        if (vc) setViceCaptain(vc.player_id);
      }
      if (gwRes.data) { setTransfersOpen(gwRes.data.transfers_open); setDeadline(gwRes.data.deadline); }
      if (myPtsRes.data) setGwPoints(myPtsRes.data.total_pts);
      if (allPtsRes.data && allPtsRes.data.length > 0) {
        const pts = allPtsRes.data.map(r => r.total_pts);
        setGwAvg(Math.round(pts.reduce((a, b) => a + b, 0) / pts.length));
        setGwHigh(Math.max(...pts));
      }
      setLoadingSquad(false);
    };
    if (players.length > 0) loadAll();
  }, [players, userId]);

  const loadGwBreakdown = async () => {
    setLoadingBreakdown(true);
    const { data: squadData } = await supabase.from("squads").select("player_id, is_captain, is_vice_captain").eq("user_id", userId).eq("gameweek_id", ACTIVE_GW);
    const { data: scoreData } = await supabase.from("gameweek_scores").select("player_id, calculated_pts").eq("gameweek_id", ACTIVE_GW);
    if (squadData && scoreData) {
      const scoreMap = {};
      scoreData.forEach(s => { scoreMap[s.player_id] = s.calculated_pts || 0; });
      const breakdown = squadData.map(entry => {
        const player = players.find(p => p.id === entry.player_id);
        let pts = scoreMap[entry.player_id] || 0;
        const multiplier = entry.is_captain ? 2 : entry.is_vice_captain ? 1.5 : 1;
        return { player, basePts: pts, finalPts: Math.round(pts * multiplier), isCaptain: entry.is_captain, isVC: entry.is_vice_captain };
      }).sort((a, b) => b.finalPts - a.finalPts);
      setGwBreakdown(breakdown);
    }
    setLoadingBreakdown(false); setShowGwBreakdown(true);
  };

  const spent = squad.reduce((s, p) => s + (p.purchase_price || p.price), 0);
  const squadValue = squad.reduce((s, p) => s + p.price, 0);
  const valueGain = squadValue - spent;
  // Budget remaining = what you had left at purchase time, plus any gains since
  // Spent $1000 → $0 left. Stamps +$15 → budget = $15. Remove Stamps → $15 + $175 purchase = $190 freed.
  const remaining = (BUDGET - spent) + valueGain;
  const roleCounts = squad.reduce((acc, p) => ({ ...acc, [p.role]: (acc[p.role] || 0) + 1 }), {});
  const marqueeCount = squad.filter(p => p.is_marquee).length;
  const hasSquad = squadSavedInDb;

  const canAdd = (p) => {
    if (squad.find(x => x.id === p.id)) return false;
    if (squad.length >= SQUAD_SIZE) return false;
    if (remaining < p.price) return false;
    if ((roleCounts[p.role] || 0) >= ROLE_LIMITS[p.role]) return false;
    if (p.is_marquee && marqueeCount >= MAX_MARQUEE) return false;
    return true;
  };

  const removePlayer = (id) => {
    setSquad(s => s.filter(x => x.id !== id));
    if (captain === id) setCaptain(null);
    if (viceCaptain === id) setViceCaptain(null);
  };

  const toggleCaptain = (id) => {
    if (captain === id) { setCaptain(null); return; }
    if (viceCaptain === id) setViceCaptain(null); setCaptain(id);
  };
  const toggleVC = (id) => {
    if (viceCaptain === id) { setViceCaptain(null); return; }
    if (captain === id) setCaptain(null); setViceCaptain(id);
  };

  const saveSquad = async () => {
    if (squad.length !== SQUAD_SIZE) { setSaveMsg(`Need ${SQUAD_SIZE} players. You have ${squad.length}.`); return; }
    if (!captain) { setSaveMsg("Please assign a captain."); return; }
    if (!viceCaptain) { setSaveMsg("Please assign a vice captain."); return; }
    setSaving(true); setSaveMsg("");
    await supabase.from("squads").delete().eq("user_id", userId).eq("gameweek_id", ACTIVE_GW);
    const { error } = await supabase.from("squads").insert(squad.map(p => ({
      user_id: userId,
      player_id: p.id,
      gameweek_id: ACTIVE_GW,
      is_captain: p.id === captain,
      is_vice_captain: p.id === viceCaptain,
      purchase_price: p.purchase_price || p.price, // preserve existing purchase price, or lock current price for new picks
    })));
    if (error) { setSaveMsg("Error saving squad. Try again."); } else { setSaveMsg("Squad saved!"); setSquadSavedInDb(true); }
    setSaving(false);
  };

  const pickerList = players.filter(p => (filterRole === "ALL" || p.role === filterRole) && (search === "" || p.name.toLowerCase().includes(search.toLowerCase())));
  const grouped = { BAT: [], BOWL: [], AR: [], WK: [] };
  squad.forEach(p => grouped[p.role].push(p));

  const [captainMenu, setCaptainMenu] = useState(null); // player id of open menu

  const pitchGroups = { WK: [], BAT: [], AR: [], BOWL: [] };
  squad.forEach(p => { if (pitchGroups[p.role]) pitchGroups[p.role].push(p); });

  const PitchCard = ({ p }) => {
    const isC = captain === p.id;
    const isVC = viceCaptain === p.id;
    const menuOpen = captainMenu === p.id;
    return (
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div
          style={{ background: C.bgCard, borderRadius: 8, padding: "10px 8px", textAlign: "center", border: `1px solid ${isC ? C.crimson : isVC ? C.crimsonLt + "70" : p.is_marquee ? C.gold + "40" : C.border}`, cursor: "pointer", transition: "border-color 0.15s" }}
          onClick={e => { e.stopPropagation(); setCaptainMenu(menuOpen ? null : p.id); }}
        >
          <div style={{ fontSize: 9, color: ROLE_COLORS[p.role], fontWeight: 700, letterSpacing: 0.5 }}>{({ BAT: "BAT", BOWL: "BOWL", AR: "AR", WK: "WK" })[p.role]}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.white, lineHeight: 1.3, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: isC ? C.crimson : isVC ? C.crimsonLt : C.gray, marginTop: 1 }}>{isC ? "C" : isVC ? "VC" : "\u00a0"}</div>
        </div>
        {menuOpen && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 4, zIndex: 50, minWidth: 130, boxShadow: "0 6px 20px #00000070", animation: "fadeUp 0.15s ease" }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setCaptain(isC ? null : p.id); if (viceCaptain === p.id) setViceCaptain(null); setCaptainMenu(null); }}
              style={{ display: "block", width: "100%", padding: "8px 10px", background: isC ? C.crimson + "20" : "transparent", border: "none", borderRadius: 5, color: isC ? C.crimson : C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
            >
              {isC ? "✓ " : ""} Captain (2x)
            </button>
            <button
              onClick={() => { setViceCaptain(isVC ? null : p.id); if (captain === p.id) setCaptain(null); setCaptainMenu(null); }}
              style={{ display: "block", width: "100%", padding: "8px 10px", background: isVC ? C.crimsonLt + "20" : "transparent", border: "none", borderRadius: 5, color: isVC ? C.crimsonLt : C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
            >
              {isVC ? "✓ " : ""} Vice Captain (1.5x)
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loadingSquad) return <Spinner label="Loading your squad..." />;

  const isMobile = window.innerWidth < 768;

  // ─── MOBILE LAYOUT ───────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ paddingTop: 52, paddingBottom: 60, minHeight: "100vh", background: C.bgDeep, display: "flex", flexDirection: "column" }}>

        {/* Score strip */}
        <div style={{ background: `linear-gradient(135deg,${C.crimson}22,${C.bgCard})`, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: C.gray, letterSpacing: 1 }}>GW{ACTIVE_GW}</div>
            {gwPoints !== null ? (
              <div onClick={loadGwBreakdown} style={{ fontSize: 28, fontWeight: 700, color: C.crimson, lineHeight: 1, cursor: "pointer" }}>{gwPoints} <span style={{ fontSize: 11, color: C.crimson }}>pts — tap</span></div>
            ) : (
              <div style={{ fontSize: 14, color: C.gray, marginTop: 2 }}>No points yet</div>
            )}
          </div>
          {gwPoints !== null && (
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>{gwAvg ?? "—"}</div><div style={{ fontSize: 9, color: C.gray }}>AVG</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: C.success }}>{gwHigh ?? "—"}</div><div style={{ fontSize: 9, color: C.gray }}>HIGH</div></div>
            </div>
          )}
          <div style={{ marginLeft: 12 }}>
            {!transfersOpen && hasSquad
              ? <div style={{ background: C.gold + "15", border: `1px solid ${C.gold}40`, borderRadius: 6, padding: "4px 8px", fontSize: 10, color: C.gold, fontWeight: 600 }}>Closed</div>
              : transfersOpen
                ? <div style={{ display: "flex", alignItems: "center", gap: 4, background: C.success + "15", border: `1px solid ${C.success}40`, borderRadius: 6, padding: "4px 8px" }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: C.success, animation: "pulse 1.5s infinite" }} /><span style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>Open</span></div>
                : null}
          </div>
        </div>

        {/* Pitch */}
        <div style={{ background: "#0c1a0c", flex: 1, padding: "10px 10px 6px", display: "flex", flexDirection: "column", gap: 0, position: "relative", overflow: "hidden" }} onClick={() => setCaptainMenu(null)}>
          <div style={{ position: "absolute", inset: 6, border: "1px solid #3DBF7A10", borderRadius: 8, pointerEvents: "none" }} />
          <div style={{ fontSize: 8, color: "#3DBF7A70", fontWeight: 700, letterSpacing: 1.5, textAlign: "center", marginBottom: 6 }}>TAP PLAYER TO SET C / VC</div>
          {squad.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: C.gray, fontSize: 13 }}>Add players to see your pitch</div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", gap: 6 }}>
              {pitchGroups.WK.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "0 15%" }}>
                  {pitchGroups.WK.map(p => <PitchCard key={p.id} p={p} />)}
                </div>
              )}
              {pitchGroups.BAT.length > 0 && <div style={{ display: "flex", gap: 5 }}>{pitchGroups.BAT.map(p => <PitchCard key={p.id} p={p} />)}</div>}
              {pitchGroups.AR.length > 0 && <div style={{ display: "flex", gap: 5 }}>{pitchGroups.AR.map(p => <PitchCard key={p.id} p={p} />)}</div>}
              {pitchGroups.BOWL.length > 0 && <div style={{ display: "flex", gap: 5 }}>{pitchGroups.BOWL.map(p => <PitchCard key={p.id} p={p} />)}</div>}
            </div>
          )}
          {/* Role counters */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, paddingTop: 6, borderTop: "1px solid #3DBF7A10", flexShrink: 0 }}>
            {Object.entries(ROLE_LIMITS).map(([role, limit]) => (
              <div key={role} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLORS[role] }}>{(pitchGroups[role]?.length || 0)}/{limit}</div>
                <div style={{ fontSize: 8, color: C.gray }}>{role}</div>
              </div>
            ))}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.white }}>{squad.length}/{SQUAD_SIZE}</div>
              <div style={{ fontSize: 8, color: C.gray }}>Total</div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{ background: C.bgCard, borderTop: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          {[
            ["Budget", `$${remaining}`, remaining < 50 ? C.danger : C.white],
            ["Value", `$${squadValue}`, valueGain > 0 ? C.success : C.white],
            ["Gain", valueGain >= 0 ? `+$${valueGain}` : `-$${Math.abs(valueGain)}`, valueGain > 0 ? C.success : valueGain < 0 ? C.danger : C.gray],
            ["Captain", squad.find(x => x.id === captain)?.name?.split(" ").pop() || "—", C.crimson],
            ["VC", squad.find(x => x.id === viceCaptain)?.name?.split(" ").pop() || "—", C.crimsonLt],
          ].map(([l, v, a]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: a }}>{v}</div>
              <div style={{ fontSize: 8, color: C.gray, marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ padding: "10px 16px 12px", background: C.bgDeep, flexShrink: 0 }}>
          {hasSquad && !transfersOpen ? (
            <div style={{ padding: "12px", background: C.gold + "10", border: `1px solid ${C.gold}25`, borderRadius: 10, fontSize: 13, color: C.gold, textAlign: "center" }}>Window closed — opens after Thursday</div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowPicker(true)} style={{ flex: 1, padding: "13px", background: C.crimson, color: C.white, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+ Add / Edit</button>
              <button onClick={saveSquad} disabled={saving} style={{ flex: 1, padding: "13px", background: saving ? C.bgCard : C.success + "CC", color: C.white, border: "none", borderRadius: 10, cursor: saving ? "default" : "pointer", fontSize: 14, fontWeight: 700 }}>{saving ? "Saving..." : "Save Squad"}</button>
            </div>
          )}
          {saveMsg && <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 7, fontSize: 12, background: saveMsg.includes("!") ? C.success + "15" : C.danger + "15", color: saveMsg.includes("!") ? C.success : C.danger, border: `1px solid ${saveMsg.includes("!") ? C.success : C.danger}30`, textAlign: "center" }}>{saveMsg}</div>}
        </div>

        {/* Picker modal (same as desktop) */}
        {showPicker && (
          <div style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 200, display: "flex", flexDirection: "column" }} onClick={() => setShowPicker(false)}>
            <div style={{ background: C.bgDeep, flex: 1, marginTop: 52, display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>Add Players</div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.gray }}>
                  <span style={{ color: remaining < 80 ? C.danger : C.white, fontWeight: 700 }}>${remaining}</span>
                  <span>{squad.length}/{SQUAD_SIZE}</span>
                </div>
                <button onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", color: C.gray, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>x</button>
              </div>
              <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ flex: 1, background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 7, padding: "7px 11px", fontSize: 13, outline: "none", minWidth: 120 }} />
                {["ALL","BAT","BOWL","AR","WK"].map(r => <button key={r} onClick={() => setFilterRole(r)} style={{ padding: "6px 10px", borderRadius: 5, border: `1px solid ${filterRole === r ? C.crimson : C.border}`, background: filterRole === r ? C.crimson + "20" : "transparent", color: filterRole === r ? C.crimson : C.gray, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{r}</button>)}
              </div>
              <div style={{ overflowY: "auto", flex: 1, padding: "6px 12px 80px" }}>
                {pickerList.map(p => {
                  const inSquad = !!squad.find(x => x.id === p.id);
                  const addable = canAdd(p);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: `1px solid ${C.border}`, opacity: !inSquad && !addable ? 0.3 : 1 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: C.white }}>{p.name} {p.is_marquee && <span style={{ fontSize: 9, color: C.gold, fontWeight: 700 }}>MQ</span>}</div>
                        <div style={{ marginTop: 2 }}><RoleBadge role={p.role} /></div>
                      </div>
                      <div style={{ textAlign: "right", marginRight: 4 }}>
                        <div style={{ fontSize: 13, color: C.gold, fontWeight: 600 }}>${p.price}</div>
                        <div style={{ fontSize: 11, color: C.gray }}>{p.pts} pts</div>
                      </div>
                      {inSquad
                        ? <button onClick={() => removePlayer(p.id)} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${C.danger}40`, background: C.danger + "15", color: C.danger, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Remove</button>
                        : <button onClick={() => addable && setSquad(s => [...s, { ...p, purchase_price: p.price }])} disabled={!addable} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${addable ? C.crimson + "50" : C.border}`, background: addable ? C.crimson + "15" : "transparent", color: addable ? C.crimson : C.gray, cursor: addable ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}>Add</button>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* GW breakdown modal */}
        {showGwBreakdown && (
          <Modal title={`GW${ACTIVE_GW} Breakdown`} onClose={() => setShowGwBreakdown(false)}>
            {loadingBreakdown ? <Spinner label="Loading..." /> : gwBreakdown.length === 0
              ? <div style={{ textAlign: "center", color: C.gray, padding: "20px 0" }}>No scores yet.</div>
              : (
                <div>
                  {gwBreakdown.map(({ player, basePts, finalPts, isCaptain, isVC }) => (
                    <div key={player?.id} style={{ display: "grid", gridTemplateColumns: "1fr 50px 60px", padding: "9px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.white, display: "flex", alignItems: "center", gap: 5 }}>
                          {player?.name}
                          {isCaptain && <span style={{ background: C.crimson, color: C.white, borderRadius: 3, padding: "1px 4px", fontSize: 9, fontWeight: 700 }}>C</span>}
                          {isVC && <span style={{ background: C.crimsonLt + "40", color: C.crimsonLt, borderRadius: 3, padding: "1px 4px", fontSize: 9, fontWeight: 700 }}>VC</span>}
                        </div>
                      </div>
                      <span style={{ textAlign: "right", fontSize: 13, color: C.gray }}>{basePts}</span>
                      <span style={{ textAlign: "right", fontSize: 14, fontWeight: 700, color: finalPts > 0 ? C.crimson : C.gray }}>{finalPts}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>Total</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.crimson }}>{gwBreakdown.reduce((s, r) => s + r.finalPts, 0)}</span>
                  </div>
                </div>
              )}
          </Modal>
        )}
      </div>
    );
  }

  // ─── DESKTOP LAYOUT ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "0 24px 0", height: "calc(100vh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 0 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 9, color: C.crimson, letterSpacing: 3, fontWeight: 600, marginBottom: 2 }}>OAKLEIGH CRICKET CLUB</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.white }}>My Squad — GW{ACTIVE_GW}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {deadline && <Countdown deadline={deadline} />}
          {!transfersOpen && hasSquad && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.gold + "15", border: `1px solid ${C.gold}40`, borderRadius: 7, padding: "5px 11px" }}><span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>Window closed</span></div>}
          {transfersOpen && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.success + "15", border: `1px solid ${C.success}40`, borderRadius: 7, padding: "5px 11px" }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: C.success, animation: "pulse 1.5s infinite" }} /><span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>Window open</span></div>}
        </div>
      </div>

      {/* Layout F: left panel | right pitch — fills remaining height */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, flex: 1, paddingTop: 12, paddingBottom: 12, overflow: "hidden" }}>

        {/* LEFT PANEL — stretches full height, children fill proportionally */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", overflow: "hidden" }}>

          {/* GW Score */}
          <div style={{ background: `linear-gradient(135deg,${C.crimson}22,${C.bgCard})`, border: `1px solid ${C.crimson}40`, borderRadius: 12, padding: "16px 18px", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, marginBottom: 4 }}>GW{ACTIVE_GW} SCORE</div>
            {gwPoints !== null ? (
              <>
                <div onClick={loadGwBreakdown} style={{ fontSize: 42, fontWeight: 700, color: C.crimson, lineHeight: 1, cursor: "pointer" }}>{gwPoints}</div>
                <div style={{ fontSize: 10, color: C.crimson, marginTop: 3, cursor: "pointer" }}>tap for breakdown</div>
                <div style={{ display: "flex", gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>{gwAvg ?? "—"}</div><div style={{ fontSize: 9, color: C.gray, marginTop: 2 }}>AVG</div></div>
                  <div style={{ width: 1, background: C.border }} />
                  <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: C.success }}>{gwHigh ?? "—"}</div><div style={{ fontSize: 9, color: C.gray, marginTop: 2 }}>HIGH</div></div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>No points yet this GW.</div>
            )}
          </div>

          {/* Squad status — flex: 1 to grow */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", flex: 1 }}>
            <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, fontWeight: 600, marginBottom: 14 }}>SQUAD STATUS</div>
            {[
              ["Budget remaining", `$${remaining}`, remaining < 50 ? C.danger : C.white],
              ["Squad value", `$${squadValue}`, valueGain > 0 ? C.success : C.white],
              ["Value gain", valueGain >= 0 ? `+$${valueGain}` : `-$${Math.abs(valueGain)}`, valueGain > 0 ? C.success : valueGain < 0 ? C.danger : C.gray],
              ["Players", `${squad.length} / ${SQUAD_SIZE}`, C.white],
              ["Marquee", `${marqueeCount} / ${MAX_MARQUEE}`, marqueeCount >= MAX_MARQUEE ? C.danger : C.success],
              ["Transfers", `${TRANSFERS_PER_GW} / ${TRANSFERS_PER_GW}`, transfersOpen ? C.success : C.gray],
            ].map(([l, v, a]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: C.gray }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: a }}>{v}</span>
              </div>
            ))}
            <div style={{ height: 4, background: C.bgDeep, borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
              <div style={{ height: "100%", width: `${((BUDGET - remaining) / BUDGET) * 100}%`, background: remaining < 80 ? C.danger : C.crimson, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
          </div>

          {/* Captain / VC — flex: 1 to grow */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", flex: 1 }}>
            <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, fontWeight: 600, marginBottom: 14 }}>LEADERSHIP</div>
            {[["Captain (2x)", captain, C.crimson], ["Vice Captain (1.5x)", viceCaptain, C.crimsonLt]].map(([label, id, accent]) => {
              const p = squad.find(x => x.id === id);
              return (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 13, color: C.gray }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: p ? accent : C.gray }}>{p ? p.name.split(" ").pop() : "Not set"}</span>
                </div>
              );
            })}
            {(!captain || !viceCaptain) && <div style={{ fontSize: 11, color: C.gold, padding: "7px 10px", background: C.gold + "10", borderRadius: 6, marginTop: 4 }}>Tap a player on the pitch to set C / VC</div>}
          </div>

          {/* Buttons — always at bottom */}
          <div style={{ flexShrink: 0 }}>
            {hasSquad && !transfersOpen ? (
              <div style={{ padding: "14px", background: C.gold + "10", border: `1px solid ${C.gold}25`, borderRadius: 10, fontSize: 13, color: C.gold, textAlign: "center" }}>Window closed — opens after Thursday</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => setShowPicker(true)} style={{ padding: "14px", background: C.crimson, color: C.white, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+ Add / Edit Players</button>
                <button onClick={saveSquad} disabled={saving} style={{ padding: "14px", background: saving ? C.bgCard : C.success + "CC", color: C.white, border: "none", borderRadius: 10, cursor: saving ? "default" : "pointer", fontSize: 14, fontWeight: 700 }}>{saving ? "Saving..." : "Save Squad"}</button>
              </div>
            )}
            {saveMsg && <div style={{ padding: "8px 12px", borderRadius: 7, fontSize: 12, marginTop: 8, background: saveMsg.includes("!") ? C.success + "15" : C.danger + "15", color: saveMsg.includes("!") ? C.success : C.danger, border: `1px solid ${saveMsg.includes("!") ? C.success : C.danger}30` }}>{saveMsg}</div>}
          </div>
        </div>

        {/* RIGHT: PITCH — fills full height, narrower */}
        <div style={{ background: "#0c1a0c", border: "1px solid #3DBF7A18", borderRadius: 14, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 0, position: "relative", overflow: "hidden", height: "100%" }} onClick={() => setCaptainMenu(null)}>
          <div style={{ position: "absolute", inset: 8, border: "1px solid #3DBF7A10", borderRadius: 10, pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: "50%", top: "45%", transform: "translate(-50%,-50%)", width: 60, height: 100, border: "1px solid #3DBF7A0A", borderRadius: 4, pointerEvents: "none" }} />

          <div style={{ fontSize: 9, color: "#3DBF7A80", fontWeight: 700, letterSpacing: 2, textAlign: "center", marginBottom: 10, flexShrink: 0 }}>YOUR PITCH — TAP TO SET C / VC</div>

          {squad.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: C.gray, fontSize: 13 }}>Add players to see your pitch</div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, justifyContent: "space-evenly" }}>
              {pitchGroups.WK.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "0 20%" }}>
                  {pitchGroups.WK.map(p => <PitchCard key={p.id} p={p} />)}
                </div>
              )}
              {pitchGroups.BAT.length > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  {pitchGroups.BAT.map(p => <PitchCard key={p.id} p={p} />)}
                </div>
              )}
              {pitchGroups.AR.length > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  {pitchGroups.AR.map(p => <PitchCard key={p.id} p={p} />)}
                </div>
              )}
              {pitchGroups.BOWL.length > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  {pitchGroups.BOWL.map(p => <PitchCard key={p.id} p={p} />)}
                </div>
              )}
            </div>
          )}

          {/* Slot counts */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, paddingTop: 10, marginTop: 8, borderTop: "1px solid #3DBF7A12", flexShrink: 0 }}>
            {Object.entries(ROLE_LIMITS).map(([role, limit]) => (
              <div key={role} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLORS[role] }}>{(pitchGroups[role]?.length || 0)}/{limit}</div>
                <div style={{ fontSize: 9, color: C.gray, marginTop: 1 }}>{ROLE_LABELS[role].slice(0, 3)}</div>
              </div>
            ))}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.white }}>{squad.length}/{SQUAD_SIZE}</div>
              <div style={{ fontSize: 9, color: C.gray, marginTop: 1 }}>Total</div>
            </div>
          </div>
        </div>
      </div>

      {showPicker && (
        <div style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 200, display: "flex", alignItems: "stretch", justifyContent: "center" }} onClick={() => setShowPicker(false)}>
          <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", background: C.bgDeep, border: `1px solid ${C.crimson}40`, borderRadius: 40, padding: "7px 18px", display: "flex", alignItems: "center", gap: 16, zIndex: 210 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: C.gray }}>BUDGET</div><div style={{ fontSize: 16, fontWeight: 700, color: remaining < 80 ? C.danger : C.white }}>${remaining}</div></div>
            <div style={{ width: 1, height: 28, background: C.border }} />
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: C.gray }}>PLAYERS</div><div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{squad.length}<span style={{ fontSize: 11, color: C.gray }}>/{SQUAD_SIZE}</span></div></div>
            <div style={{ width: 1, height: 28, background: C.border }} />
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: C.gray }}>MARQUEE</div><div style={{ fontSize: 16, fontWeight: 700, color: marqueeCount >= MAX_MARQUEE ? C.danger : C.success }}>{marqueeCount}<span style={{ fontSize: 11, color: C.gray }}>/{MAX_MARQUEE}</span></div></div>
          </div>
          <div style={{ display: "flex", width: "100%", maxWidth: 860, marginTop: 58, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 230, background: C.bgDeep, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "14px 12px 10px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.crimson, letterSpacing: 1 }}>YOUR SQUAD</div>
                <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>{squad.length} of {SQUAD_SIZE} selected</div>
              </div>
              <div style={{ overflowY: "auto", flex: 1, padding: "8px 8px 12px" }}>
                {squad.length === 0 && <div style={{ textAlign: "center", color: C.gray, fontSize: 11, padding: "20px 8px", opacity: 0.6 }}>Add players from the list</div>}
                {Object.entries({ BAT: [], BOWL: [], AR: [], WK: [] }).map(([role]) => {
                  const rp = squad.filter(p => p.role === role);
                  if (rp.length === 0) return null;
                  return (
                    <div key={role} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: ROLE_COLORS[role], letterSpacing: 1.5, marginBottom: 3, paddingLeft: 3 }}>{ROLE_LABELS[role].toUpperCase()}S</div>
                      {rp.map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: 6, marginBottom: 3, background: C.bgCard, border: `1px solid ${p.is_marquee ? C.gold + "30" : "transparent"}` }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: C.gold }}>${p.price}</div>
                          </div>
                          <button onClick={() => removePlayer(p.id)} style={{ background: C.danger + "15", color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12, lineHeight: 1, flexShrink: 0, marginLeft: 4 }}>x</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setShowPicker(false)} style={{ width: "100%", padding: "9px", borderRadius: 8, background: C.crimson, color: C.white, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Done</button>
              </div>
            </div>
            <div style={{ flex: 1, background: C.bgDeep, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Add Players</span>
                  <button onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", color: C.gray, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>x</button>
                </div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ width: "100%", background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 7, padding: "7px 11px", fontSize: 12, outline: "none", marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {["ALL", "BAT", "BOWL", "AR", "WK"].map(r => <button key={r} onClick={() => setFilterRole(r)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${filterRole === r ? C.crimson : C.border}`, background: filterRole === r ? C.crimson + "20" : "transparent", color: filterRole === r ? C.crimson : C.gray, cursor: "pointer", fontSize: 11, fontWeight: 500 }}>{r === "ALL" ? "All" : ROLE_LABELS[r]}</button>)}
                </div>
              </div>
              <div style={{ overflowY: "auto", padding: "5px 10px 16px" }}>
                {pickerList.map(p => {
                  const inSquad = !!squad.find(x => x.id === p.id);
                  const addable = canAdd(p);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 7, marginBottom: 3, opacity: !inSquad && !addable ? 0.3 : 1, background: inSquad ? C.success + "10" : "transparent", border: `1px solid ${inSquad ? C.success + "30" : "transparent"}`, transition: "opacity 0.15s" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.white, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          {p.name}
                          {p.is_marquee && <span style={{ background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>MARQUEE</span>}
                        </div>
                        <div style={{ marginTop: 2 }}><RoleBadge role={p.role} /></div>
                      </div>
                      <div style={{ textAlign: "right", marginRight: 3, flexShrink: 0 }}>
                        <div style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>${p.price}</div>
                        <div style={{ fontSize: 10, color: C.gray }}>{p.pts} pts</div>
                      </div>
                      {inSquad ? (
                        <button onClick={() => removePlayer(p.id)} style={{ padding: "5px 10px", borderRadius: 5, border: `1px solid ${C.danger}40`, background: C.danger + "15", color: C.danger, cursor: "pointer", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Remove</button>
                      ) : (
                        <button onClick={() => addable && setSquad(s => [...s, { ...p, purchase_price: p.price }])} disabled={!addable} style={{ padding: "5px 10px", borderRadius: 5, border: `1px solid ${addable ? C.crimson + "50" : C.border}`, background: addable ? C.crimson + "15" : "transparent", color: addable ? C.crimson : C.gray, cursor: addable ? "pointer" : "default", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Add</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showGwBreakdown && (
        <Modal title={`GW${ACTIVE_GW} Points Breakdown`} onClose={() => setShowGwBreakdown(false)}>
          {loadingBreakdown ? <Spinner label="Loading..." /> : (
            gwBreakdown.length === 0 ? <div style={{ textAlign: "center", color: C.gray, padding: "20px 0" }}>No scores calculated yet for this gameweek.</div> : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px", padding: "7px 10px", fontSize: 10, color: C.gray, fontWeight: 600, letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
                  <span>PLAYER</span><span style={{ textAlign: "right" }}>BASE</span><span style={{ textAlign: "right" }}>FINAL</span>
                </div>
                {gwBreakdown.map(({ player, basePts, finalPts, isCaptain, isVC }) => (
                  <div key={player?.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px", padding: "8px 10px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.white, display: "flex", alignItems: "center", gap: 6 }}>
                        {player?.name || "Unknown"}
                        {isCaptain && <span style={{ background: C.crimson, color: C.white, borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>C</span>}
                        {isVC && <span style={{ background: C.crimsonLt + "40", color: C.crimsonLt, borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>VC</span>}
                      </div>
                      {player && <div style={{ marginTop: 2 }}><RoleBadge role={player.role} /></div>}
                    </div>
                    <span style={{ textAlign: "right", fontSize: 13, color: C.gray }}>{basePts}</span>
                    <span style={{ textAlign: "right", fontSize: 14, fontWeight: 700, color: finalPts > 0 ? C.crimson : C.gray }}>{finalPts}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 10px 0", borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.crimson }}>{gwBreakdown.reduce((s, r) => s + r.finalPts, 0)}</span>
                </div>
              </div>
            )
          )}
        </Modal>
      )}
    </div>
  );
}

// --- PLAYERS PAGE ---

function PlayersPage({ players }) {
  const [sort, setSort] = useState("price");
  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const filtered = useMemo(() => players.filter(p => (filterRole === "ALL" || p.role === filterRole) && (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => b[sort] - a[sort]), [players, sort, filterRole, search]);
  return (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 0px) clamp(16px,4vw,32px) clamp(60px,8vw,48px)" }}>
      <Header title="Player Database" sub={`${players.length} players · Season 2026-27`} />
      <div style={{ display: "flex", gap: 8, padding: "16px 0 14px", flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 8, padding: "7px 12px", fontSize: 12, outline: "none", minWidth: 180 }} />
        {["ALL", "BAT", "BOWL", "AR", "WK"].map(r => <button key={r} onClick={() => setFilterRole(r)} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${filterRole === r ? C.crimson : C.border}`, background: filterRole === r ? C.crimson + "15" : "transparent", color: filterRole === r ? C.crimson : C.gray, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{r === "ALL" ? "All Roles" : ROLE_LABELS[r]}</button>)}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {[["price", "Price"], ["pts", "Points"], ["mp", "Matches"]].map(([k, l]) => <button key={k} onClick={() => setSort(k)} style={{ padding: "6px 11px", borderRadius: 7, border: `1px solid ${sort === k ? C.crimson : C.border}`, background: sort === k ? C.crimson + "15" : "transparent", color: sort === k ? C.crimson : C.gray, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Sort: {l}</button>)}
        </div>
      </div>
      <div style={{ background: C.bgCard, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 50px", padding: "9px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.gray, fontWeight: 600, letterSpacing: 0.8 }}>
          <span>PLAYER</span><span>PRICE</span><span>SEASON PTS</span><span>MP</span>
        </div>
        {filtered.map((p, i) => (
          <div key={p.id} onClick={() => setSelectedPlayer(p)} style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 50px", padding: "10px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", transition: "background 0.1s", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = C.bgCardHov} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.white, display: "flex", alignItems: "center", gap: 6 }}>
                {p.name}
                {p.is_marquee && <span style={{ background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>MARQUEE</span>}
              </div>
              <div style={{ marginTop: 3 }}><RoleBadge role={p.role} /></div>
            </div>
            <span style={{ fontSize: 13, color: C.gold, fontWeight: 600 }}>${p.price}</span>
            <span style={{ fontSize: 13, color: C.whiteD, fontWeight: 500 }}>{p.pts}</span>
            <span style={{ fontSize: 12, color: C.gray }}>{p.mp}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: C.gray, textAlign: "center" }}>Click any player to view their stats</div>
      {selectedPlayer && <PlayerProfileModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}

// --- VIEW TEAMS PAGE ---

function ViewTeamsPage({ players }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transfersOpen, setTransfersOpen] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: gwData } = await supabase.from("gameweeks").select("transfers_open").eq("number", ACTIVE_GW).single();
      if (gwData) setTransfersOpen(gwData.transfers_open);
      if (!gwData?.transfers_open) {
        const { data: profiles } = await supabase.from("profiles").select("id, team_name, username, total_pts");
        const { data: squads } = await supabase.from("squads").select("user_id, player_id, is_captain, is_vice_captain").eq("gameweek_id", ACTIVE_GW);
        if (profiles && squads) {
          const result = profiles.map(prof => {
            const squadEntries = squads.filter(s => s.user_id === prof.id);
            const squadPlayers = squadEntries.map(entry => ({
              ...players.find(p => p.id === entry.player_id),
              is_captain: entry.is_captain,
              is_vice_captain: entry.is_vice_captain,
            })).filter(Boolean);
            return { ...prof, squad: squadPlayers };
          }).filter(t => t.squad.length > 0);
          setTeams(result);
        }
      }
      setLoading(false);
    };
    if (players.length > 0) load();
  }, [players]);

  if (loading) return <Spinner label="Loading teams..." />;

  return (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 0px) clamp(16px,4vw,32px) clamp(60px,8vw,48px)" }}>
      <Header title="View Teams" sub={`Gameweek ${ACTIVE_GW} squads`} />
      {transfersOpen ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.gold + "20", border: `1px solid ${C.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>&#128274;</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 8 }}>Transfer window is open</div>
          <div style={{ fontSize: 13, color: C.gray }}>Other managers' squads are hidden until the window closes on Friday night.</div>
        </div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: "center", color: C.gray, padding: "60px 0", fontSize: 13 }}>No squads submitted yet.</div>
      ) : (
        <div style={{ paddingTop: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 24 }}>
            {teams.map(team => (
              <div key={team.id} onClick={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)} style={{ background: selectedTeam?.id === team.id ? C.crimson + "20" : C.bgCard, borderRadius: 12, padding: "16px", border: `1px solid ${selectedTeam?.id === team.id ? C.crimson + "60" : C.border}`, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = C.crimson + "40"} onMouseLeave={e => e.currentTarget.style.borderColor = selectedTeam?.id === team.id ? C.crimson + "60" : C.border}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.crimson + "20", border: `1px solid ${C.crimson}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.crimson, flexShrink: 0 }}>{(team.team_name || team.username || "?")[0].toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.team_name || "Unnamed Team"}</div>
                    <div style={{ fontSize: 11, color: C.gray }}>{team.username}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: C.gray }}>{team.squad.length} players</span>
                  <span style={{ color: C.gold, fontWeight: 600 }}>{team.total_pts} pts</span>
                </div>
              </div>
            ))}
          </div>
          {selectedTeam && (
            <div style={{ background: C.bgCard, borderRadius: 14, padding: "20px", border: `1px solid ${C.crimson}30`, animation: "slideIn 0.2s ease" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 4 }}>{selectedTeam.team_name || "Unnamed Team"}</div>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 16 }}>{selectedTeam.username} · {selectedTeam.squad.length} players</div>
              {Object.entries({ BAT: [], BOWL: [], AR: [], WK: [] }).map(([role]) => {
                const rp = selectedTeam.squad.filter(p => p.role === role);
                if (rp.length === 0) return null;
                return (
                  <div key={role} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, color: ROLE_COLORS[role], fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>{ROLE_LABELS[role].toUpperCase()}S</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
                      {rp.map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.bgDeep, borderRadius: 8, border: `1px solid ${p.is_captain ? C.crimson : p.is_vice_captain ? C.crimsonLt + "60" : C.border}` }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.white, display: "flex", alignItems: "center", gap: 5 }}>
                              {p.name}
                              {p.is_captain && <span style={{ background: C.crimson, color: C.white, borderRadius: 3, padding: "1px 4px", fontSize: 9, fontWeight: 700 }}>C</span>}
                              {p.is_vice_captain && <span style={{ background: C.crimsonLt + "40", color: C.crimsonLt, borderRadius: 3, padding: "1px 4px", fontSize: 9, fontWeight: 700 }}>VC</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: C.gold, fontWeight: 600, flexShrink: 0 }}>${p.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- LEADERBOARD PAGE ---

function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("id, team_name, username, total_pts").order("total_pts", { ascending: false });
      if (data) setEntries(data);
      setLoading(false);
    };
    fetch();
  }, []);
  const hasPoints = entries.some(e => e.total_pts > 0);
  return (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 0px) clamp(16px,4vw,32px) clamp(60px,8vw,48px)" }}>
      <Header title="Leaderboard" sub="Season 2026-27" />
      {loading ? <Spinner label="Loading..." /> : (
        <div style={{ paddingTop: 20 }}>
          {hasPoints && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
              {entries.slice(0, 3).map((p, i) => (
                <div key={p.id} style={{ background: i === 0 ? C.crimson + "15" : C.bgCard, borderRadius: 12, padding: "18px 14px", border: `1px solid ${i === 0 ? C.crimson + "40" : C.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 5 }}>{["1st", "2nd", "3rd"][i]}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{p.team_name || p.username}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: i === 0 ? C.crimson : C.whiteD, marginTop: 8 }}>{p.total_pts}</div>
                  <div style={{ fontSize: 10, color: C.gray }}>total points</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ background: C.bgCard, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px", padding: "9px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.gray, fontWeight: 600, letterSpacing: 0.8 }}>
              <span>#</span><span>MANAGER</span><span style={{ textAlign: "right" }}>TOTAL PTS</span>
            </div>
            {entries.length === 0 ? (
              <div style={{ textAlign: "center", color: C.gray, padding: "40px 0", fontSize: 13 }}>No members yet.</div>
            ) : entries.map((p, i) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px", padding: "11px 16px", borderBottom: i < entries.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = C.bgCardHov} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 13, fontWeight: 700, color: hasPoints && i < 3 ? C.crimson : C.gray }}>{i + 1}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.crimson + "20", border: `1px solid ${C.crimson}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.crimson, flexShrink: 0 }}>{(p.team_name || p.username || "?")[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{p.team_name || "Unnamed Team"}</div>
                    <div style={{ fontSize: 11, color: C.gray }}>{p.username}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 14, color: hasPoints && i < 3 ? C.crimson : C.whiteD, fontWeight: 700 }}>{p.total_pts}</span>
                </div>
              </div>
            ))}
          </div>
          {!hasPoints && <div style={{ marginTop: 12, padding: "10px 14px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.gray, textAlign: "center" }}>Points will appear here once the first gameweek is calculated</div>}
        </div>
      )}
    </div>
  );
}

// --- GAMEWEEK HISTORY PAGE ---

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGw, setExpandedGw] = useState(null);
  const [gwDetails, setGwDetails] = useState({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("fantasy_points").select("gameweek_id, total_pts, user_id, profiles(team_name, username)").order("gameweek_id", { ascending: false });
      if (data) {
        const grouped = {};
        data.forEach(row => {
          if (!grouped[row.gameweek_id]) grouped[row.gameweek_id] = [];
          grouped[row.gameweek_id].push(row);
        });
        const gws = Object.entries(grouped).map(([gw, entries]) => {
          const pts = entries.map(e => e.total_pts);
          return { gw: parseInt(gw), entries: entries.sort((a, b) => b.total_pts - a.total_pts), high: Math.max(...pts), avg: Math.round(pts.reduce((a, b) => a + b, 0) / pts.length) };
        });
        setHistory(gws);
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggleGw = (gw) => setExpandedGw(expandedGw === gw ? null : gw);

  return (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 0px) clamp(16px,4vw,32px) clamp(60px,8vw,48px)" }}>
      <Header title="Gameweek History" sub="All past gameweeks and scores" />
      {loading ? <Spinner label="Loading history..." /> : history.length === 0 ? (
        <div style={{ textAlign: "center", color: C.gray, padding: "60px 0", fontSize: 13 }}>No gameweeks completed yet — season starts soon!</div>
      ) : (
        <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {history.map(({ gw, entries, high, avg }) => (
            <div key={gw} style={{ background: C.bgCard, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <div onClick={() => toggleGw(gw)} style={{ display: "flex", alignItems: "center", padding: "14px 18px", cursor: "pointer", gap: 16 }} onMouseEnter={e => e.currentTarget.style.background = C.bgCardHov} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ background: C.crimson + "20", border: `1px solid ${C.crimson}40`, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: C.crimson, flexShrink: 0 }}>GW{gw}</div>
                <div style={{ flex: 1, display: "flex", gap: 24 }}>
                  <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 2 }}>HIGH SCORE</div><div style={{ fontSize: 16, fontWeight: 700, color: C.success }}>{high}</div></div>
                  <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 2 }}>AVERAGE</div><div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>{avg}</div></div>
                  <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 2 }}>MANAGERS</div><div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{entries.length}</div></div>
                </div>
                <div style={{ fontSize: 14, color: C.gray }}>{expandedGw === gw ? "^" : "v"}</div>
              </div>
              {expandedGw === gw && (
                <div style={{ borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 80px", padding: "8px 18px", fontSize: 10, color: C.gray, fontWeight: 600, letterSpacing: 0.5, borderBottom: `1px solid ${C.border}` }}>
                    <span>#</span><span>TEAM</span><span style={{ textAlign: "right" }}>PTS</span>
                  </div>
                  {entries.map((e, i) => (
                    <div key={e.user_id} style={{ display: "grid", gridTemplateColumns: "36px 1fr 80px", padding: "10px 18px", borderBottom: i < entries.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? C.crimson : C.gray }}>{i + 1}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.white }}>{e.profiles?.team_name || "Unnamed Team"}</div>
                        <div style={{ fontSize: 11, color: C.gray }}>{e.profiles?.username}</div>
                      </div>
                      <span style={{ textAlign: "right", fontSize: 14, fontWeight: 700, color: i === 0 ? C.crimson : C.whiteD }}>{e.total_pts}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- SEASON STATS PAGE ---

function StatsPage({ players }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [scoresRes, ptsRes, squadRes] = await Promise.all([
          supabase.from("gameweek_scores").select("player_id, runs, wickets, calculated_pts, gameweek_id"),
          supabase.from("fantasy_points").select("user_id, total_pts, gameweek_id, profiles(team_name, username)"),
          supabase.from("squads").select("player_id"),
        ]);

        const scores = scoresRes.data || [];
        const pts = ptsRes.data || [];
        const squadData = squadRes.data || [];

        const runsByPlayer = {};
        scores.forEach(s => { runsByPlayer[s.player_id] = (runsByPlayer[s.player_id] || 0) + (s.runs || 0); });
        const topScorerEntry = Object.entries(runsByPlayer).sort((a, b) => b[1] - a[1])[0];
        const topScorer = topScorerEntry
          ? { player: players.find(p => p.id === parseInt(topScorerEntry[0])) || null, runs: topScorerEntry[1] }
          : null;

        const wktsByPlayer = {};
        scores.forEach(s => { wktsByPlayer[s.player_id] = (wktsByPlayer[s.player_id] || 0) + (s.wickets || 0); });
        const topWktEntry = Object.entries(wktsByPlayer).sort((a, b) => b[1] - a[1])[0];
        const topWicketer = topWktEntry
          ? { player: players.find(p => p.id === parseInt(topWktEntry[0])) || null, wickets: topWktEntry[1] }
          : null;

        const userPts = {};
        pts.forEach(r => {
          if (!userPts[r.user_id] || r.total_pts > userPts[r.user_id].pts)
            userPts[r.user_id] = { pts: r.total_pts, profile: r.profiles };
        });
        const bestFantasy = Object.values(userPts).sort((a, b) => b.pts - a.pts)[0] || null;

        const pickCounts = {};
        squadData.forEach(s => { pickCounts[s.player_id] = (pickCounts[s.player_id] || 0) + 1; });
        const topPicked = Object.entries(pickCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([pid, count]) => ({ player: players.find(p => p.id === parseInt(pid)) || null, count }))
          .filter(x => x.player);

        setStats({ topScorer, topWicketer, bestFantasy, topPicked });
      } catch (e) {
        setError("Failed to load stats. Please try again.");
      }
      setLoading(false);
    };
    load();
  }, [players]);

  const noData = <div style={{ fontSize: 13, color: C.gray }}>No data yet — check back after gameweek 1.</div>;

  const StatBlock = ({ title, accent, children }) => (
    <div style={{ background: C.bgCard, borderRadius: 12, padding: "20px", border: `1px solid ${accent}30` }}>
      <div style={{ fontSize: 10, color: accent, letterSpacing: 2, fontWeight: 700, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 0px) clamp(16px,4vw,32px) clamp(60px,8vw,48px)" }}>
      <Header title="Season Stats" sub="2026-27 season at a glance" />
      {loading ? (
        <Spinner label="Loading season stats..." />
      ) : error ? (
        <div style={{ textAlign: "center", color: C.danger, padding: "60px 0", fontSize: 13 }}>{error}</div>
      ) : (
        <div style={{ paddingTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          <StatBlock title="TOP RUN SCORER" accent={C.indigo}>
            {!stats?.topScorer?.player ? noData : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{stats.topScorer.player.name}</div>
                  <div style={{ marginTop: 4 }}><RoleBadge role={stats.topScorer.player.role} /></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.indigo }}>{stats.topScorer.runs}</div>
                  <div style={{ fontSize: 10, color: C.gray }}>RUNS</div>
                </div>
              </div>
            )}
          </StatBlock>

          <StatBlock title="TOP WICKET TAKER" accent={C.gold}>
            {!stats?.topWicketer?.player ? noData : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{stats.topWicketer.player.name}</div>
                  <div style={{ marginTop: 4 }}><RoleBadge role={stats.topWicketer.player.role} /></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.gold }}>{stats.topWicketer.wickets}</div>
                  <div style={{ fontSize: 10, color: C.gray }}>WICKETS</div>
                </div>
              </div>
            )}
          </StatBlock>

          <StatBlock title="BEST FANTASY PERFORMER" accent={C.crimson}>
            {!stats?.bestFantasy ? noData : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.crimson + "20", border: `1px solid ${C.crimson}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: C.crimson, flexShrink: 0 }}>
                  {(stats.bestFantasy.profile?.team_name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{stats.bestFantasy.profile?.team_name || "Unnamed Team"}</div>
                  <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{stats.bestFantasy.profile?.username}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.crimson }}>{stats.bestFantasy.pts}</div>
                  <div style={{ fontSize: 10, color: C.gray }}>TOTAL PTS</div>
                </div>
              </div>
            )}
          </StatBlock>

          <StatBlock title="MOST PICKED PLAYERS" accent={C.success}>
            {!stats?.topPicked?.length ? noData : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.topPicked.map(({ player, count }, i) => (
                  <div key={player.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.success + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.success, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.white }}>{player.name}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ height: 4, width: 60, background: C.bgDeep, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(count / (stats.topPicked[0]?.count || 1)) * 100}%`, background: C.success, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 12, color: C.success, fontWeight: 600, minWidth: 24 }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </StatBlock>

        </div>
      )}
    </div>
  );
}

// --- HOW TO PLAY PAGE ---

function HowToPlayPage() {
  const [openRule, setOpenRule] = useState(null);
  return (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 0px) clamp(16px,4vw,32px) clamp(60px,8vw,48px)" }}>
      <Header title="How to Play" sub="Everything you need to know about OCC Fantasy" />
      <div style={{ paddingTop: 20 }}>
        {/* Quick scoring reminder */}
        <div style={{ background: C.crimson + "10", border: `1px solid ${C.crimson}30`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 10, color: C.crimson, fontWeight: 700, letterSpacing: 1 }}>QUICK SCORING GUIDE</div>
          {[["Run", "1pt"], ["4", "+4pt"], ["6", "+6pt"], ["50", "+20pt"], ["100", "+35pt"], ["Wkt", "10pt"], ["Catch", "15pt"]].map(([l, v]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{v}</div>
              <div style={{ fontSize: 10, color: C.gray }}>{l}</div>
            </div>
          ))}
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>2x</div><div style={{ fontSize: 10, color: C.gray }}>Capt.</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {RULES.map((r, i) => (
            <div key={i} onClick={() => setOpenRule(openRule === i ? null : i)} style={{ background: C.bgCard, borderRadius: 10, padding: "14px 16px", border: `1px solid ${openRule === i ? C.crimson + "50" : C.border}`, display: "flex", gap: 10, cursor: "pointer", transition: "border-color 0.15s" }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: C.crimson + "20", border: `1px solid ${C.crimson}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.crimson }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.white, marginBottom: openRule === i ? 6 : 0 }}>{r.title}</div>
                {openRule === i && <div style={{ fontSize: 12, color: C.gray, lineHeight: 1.6 }}>{r.desc}</div>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: C.bgCard, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 14 }}>Full Scoring System</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            {SCORING.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: i % 2 === 0 ? C.bgDeep : "transparent", borderRadius: 5 }}>
                <span style={{ fontSize: 12, color: C.gray }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ADMIN PAGE ---

function AdminPage({ players }) {
  const [gw, setGw] = useState(ACTIVE_GW);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false); const [calculating, setCalculating] = useState(false);
  const [msg, setMsg] = useState(""); const [msgType, setMsgType] = useState("success");
  const [search, setSearch] = useState(""); const [existingScores, setExistingScores] = useState({});
  const [transfersOpen, setTransfersOpen] = useState(false); const [togglingWindow, setTogglingWindow] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [scoreRes, gwRes] = await Promise.all([
        supabase.from("gameweek_scores").select("*").eq("gameweek_id", gw),
        supabase.from("gameweeks").select("transfers_open").eq("number", gw).single(),
      ]);
      if (scoreRes.data) { const map = {}; scoreRes.data.forEach(r => { map[r.player_id] = r; }); setExistingScores(map); setScores({}); }
      if (gwRes.data) setTransfersOpen(gwRes.data.transfers_open);
    };
    load();
  }, [gw]);

  const getVal = (pid, field) => {
    if (scores[pid]?.[field] !== undefined) return scores[pid][field];
    if (existingScores[pid]?.[field] !== undefined) return existingScores[pid][field];
    return field.startsWith("did_") || field.startsWith("was_") || field.startsWith("five_") || field.startsWith("three_") ? false : 0;
  };
  const setVal = (pid, field, value) => setScores(s => ({ ...s, [pid]: { ...(s[pid] || {}), [field]: value } }));
  const preview = (pid) => calcPoints({ runs: getVal(pid, "runs"), fours: getVal(pid, "fours"), sixes: getVal(pid, "sixes"), wickets: getVal(pid, "wickets"), catches: getVal(pid, "catches"), run_outs: getVal(pid, "run_outs"), stumpings: getVal(pid, "stumpings"), no_balls: getVal(pid, "no_balls"), wides: getVal(pid, "wides"), did_bat: getVal(pid, "did_bat"), was_dismissed: getVal(pid, "was_dismissed"), five_fer: getVal(pid, "five_fer"), three_fer: getVal(pid, "three_fer") });

  const toggleTransferWindow = async () => {
    setTogglingWindow(true);
    const newVal = !transfersOpen;
    const { error } = await supabase.from("gameweeks").update({ transfers_open: newVal }).eq("number", gw);
    if (!error) { setTransfersOpen(newVal); setMsg(`Transfer window ${newVal ? "opened" : "closed"} for GW${gw}.`); setMsgType("success"); }
    else { setMsg("Failed to update transfer window."); setMsgType("danger"); }
    setTogglingWindow(false);
  };

  const saveScores = async () => {
    setSaving(true); setMsg("");
    const rows = players.map(p => {
      const s = { runs: getVal(p.id, "runs"), fours: getVal(p.id, "fours"), sixes: getVal(p.id, "sixes"), wickets: getVal(p.id, "wickets"), catches: getVal(p.id, "catches"), run_outs: getVal(p.id, "run_outs"), stumpings: getVal(p.id, "stumpings"), no_balls: getVal(p.id, "no_balls"), wides: getVal(p.id, "wides"), did_bat: getVal(p.id, "did_bat"), was_dismissed: getVal(p.id, "was_dismissed"), five_fer: getVal(p.id, "five_fer"), three_fer: getVal(p.id, "three_fer") };
      return { player_id: p.id, gameweek_id: gw, ...s, calculated_pts: calcPoints(s) };
    });
    const { error } = await supabase.from("gameweek_scores").upsert(rows, { onConflict: "player_id,gameweek_id" });
    if (error) { setMsg("Error saving: " + error.message); setMsgType("danger"); }
    else { setMsg("Scores saved. Now click Calculate Points."); setMsgType("success"); const map = {}; rows.forEach(r => { map[r.player_id] = r; }); setExistingScores(map); setScores({}); }
    setSaving(false);
  };

  const calculatePoints = async () => {
    setCalculating(true); setMsg("");
    const { data: squadData } = await supabase.from("squads").select("user_id, player_id, is_captain, is_vice_captain").eq("gameweek_id", gw);
    if (!squadData || squadData.length === 0) { setMsg("No squads found."); setMsgType("danger"); setCalculating(false); return; }
    const { data: scoreData } = await supabase.from("gameweek_scores").select("player_id, calculated_pts").eq("gameweek_id", gw);
    const scoreMap = {};
    if (scoreData) scoreData.forEach(s => { scoreMap[s.player_id] = s.calculated_pts || 0; });
    const userSquads = {};
    squadData.forEach(row => { if (!userSquads[row.user_id]) userSquads[row.user_id] = []; userSquads[row.user_id].push(row); });
    const pointsRows = Object.entries(userSquads).map(([userId, squad]) => {
      let total = 0;
      squad.forEach(entry => { let pts = scoreMap[entry.player_id] || 0; if (entry.is_captain) pts *= 2; else if (entry.is_vice_captain) pts *= 1.5; total += pts; });
      return { user_id: userId, gameweek_id: gw, raw_pts: Math.round(total), total_pts: Math.round(total) };
    });
    await supabase.from("fantasy_points").upsert(pointsRows, { onConflict: "user_id,gameweek_id" });
    for (const { user_id } of pointsRows) {
      const { data: allPts } = await supabase.from("fantasy_points").select("total_pts").eq("user_id", user_id);
      const grand = allPts ? allPts.reduce((s, r) => s + (r.total_pts || 0), 0) : 0;
      await supabase.from("profiles").update({ total_pts: grand }).eq("id", user_id);
    }
    // Update player season pts and mp
    const { data: allGwScores } = await supabase.from("gameweek_scores").select("player_id, calculated_pts");
    const playerPts = {}; const playerMp = {};
    (allGwScores || []).forEach(s => { playerPts[s.player_id] = (playerPts[s.player_id] || 0) + (s.calculated_pts || 0); playerMp[s.player_id] = (playerMp[s.player_id] || 0) + 1; });
    for (const [pid, pts] of Object.entries(playerPts)) {
      await supabase.from("players").update({ pts, mp: playerMp[pid] || 0 }).eq("id", parseInt(pid));
    }
    setMsg(`Points calculated for ${pointsRows.length} managers! Player stats updated.`); setMsgType("success");
    setCalculating(false);
  };

  const numField = (pid, field, label, w = 60) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{ fontSize: 8, color: C.gray, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <input type="number" min="0" value={getVal(pid, field)} onChange={e => setVal(pid, field, parseInt(e.target.value) || 0)} style={{ width: w, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.white, borderRadius: 5, padding: "5px 7px", fontSize: 12, outline: "none", textAlign: "center" }} />
    </div>
  );

  const boolField = (pid, field, label) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{ fontSize: 8, color: C.gray, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <button onClick={() => setVal(pid, field, !getVal(pid, field))} style={{ width: 38, height: 26, borderRadius: 5, border: `1px solid ${getVal(pid, field) ? C.success : C.border}`, background: getVal(pid, field) ? C.success + "25" : C.bgDeep, color: getVal(pid, field) ? C.success : C.gray, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>{getVal(pid, field) ? "Y" : "N"}</button>
    </div>
  );

  const filtered = players.filter(p => search === "" || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 0px) clamp(16px,4vw,32px) clamp(60px,8vw,48px)" }}>
      <Header title="Admin Panel" sub="Score entry · Points calculation · Transfer window" />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0 12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 12, color: C.gray }}>Gameweek</span>
          <input type="number" min="1" value={gw} onChange={e => setGw(parseInt(e.target.value) || 1)} style={{ width: 56, background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 7, padding: "6px 9px", fontSize: 13, outline: "none", textAlign: "center" }} />
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 7, padding: "6px 11px", fontSize: 12, outline: "none", minWidth: 170 }} />
        <button onClick={saveScores} disabled={saving} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: saving ? C.bgCard : C.gold, color: C.bgDeep, fontWeight: 700, fontSize: 12, cursor: saving ? "default" : "pointer" }}>{saving ? "Saving..." : "Save Scores"}</button>
        <button onClick={calculatePoints} disabled={calculating} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: calculating ? C.bgCard : C.success, color: C.white, fontWeight: 700, fontSize: 12, cursor: calculating ? "default" : "pointer" }}>{calculating ? "Calculating..." : "Calculate Points"}</button>
        <button onClick={toggleTransferWindow} disabled={togglingWindow} style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${transfersOpen ? C.success : C.crimson}50`, background: transfersOpen ? C.success + "15" : C.crimson + "15", color: transfersOpen ? C.success : C.crimson, fontWeight: 700, fontSize: 12, cursor: togglingWindow ? "default" : "pointer" }}>{togglingWindow ? "Updating..." : transfersOpen ? "Close Transfer Window" : "Open Transfer Window"}</button>
      </div>
      {msg && <div style={{ marginBottom: 14, padding: "9px 14px", borderRadius: 7, fontSize: 12, background: C[msgType] + "15", color: C[msgType], border: `1px solid ${C[msgType]}30` }}>{msg}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background: C.bgCard, borderRadius: 10, padding: "12px 14px", border: `1px solid ${existingScores[p.id] ? C.success + "25" : C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{p.name}</div>
                <div style={{ marginTop: 2 }}><RoleBadge role={p.role} /></div>
              </div>
              <div style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.gray }}>PREVIEW</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{preview(p.id)} pts</div>
              </div>
              {existingScores[p.id] && <div style={{ fontSize: 9, color: C.success, fontWeight: 700, letterSpacing: 0.5 }}>SAVED</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: C.indigo, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>BATTING</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>{numField(p.id, "runs", "Runs", 68)}{numField(p.id, "fours", "4s", 52)}{numField(p.id, "sixes", "6s", 52)}{boolField(p.id, "did_bat", "Batted")}{boolField(p.id, "was_dismissed", "Out")}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>BOWLING</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>{numField(p.id, "wickets", "Wkts", 60)}{numField(p.id, "no_balls", "NB", 52)}{numField(p.id, "wides", "Wides", 60)}{boolField(p.id, "three_fer", "3W")}{boolField(p.id, "five_fer", "5W")}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.success, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>FIELDING</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>{numField(p.id, "catches", "Catches", 68)}{numField(p.id, "run_outs", "Run Outs", 68)}{numField(p.id, "stumpings", "Stmpgs", 68)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- APP ROOT ---

export default function App() {
  const [page, setPage] = useState("squad");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadAppData(session.user.id); else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadAppData(session.user.id); else { setPlayers([]); setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadAppData = async (userId) => {
    setLoading(true);
    const [{ data: pd }, { data: prof }] = await Promise.all([
      supabase.from("players").select("*").order("price", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", userId).single(),
    ]);
    if (pd) setPlayers(pd);
    if (prof) setProfile(prof);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setPlayers([]);
  };

  if (loading) return <div style={{ minHeight: "100vh", background: C.bgDeep }}><style>{globalStyles}</style><Spinner label="Loading OCC Fantasy..." /></div>;
  if (!session) return <><style>{globalStyles}</style><AuthPage /></>;

  const isMobile = window.innerWidth < 768;
  const pageNeedsMobilePad = isMobile && page !== "squad";

  return (
    <div style={{ minHeight: "100vh", background: C.bgDeep }}>
      <style>{globalStyles}</style>
      <Nav page={page} setPage={setPage} user={session.user} profile={profile} onLogout={handleLogout} />
      <div style={{ paddingTop: pageNeedsMobilePad ? 52 : 0, paddingBottom: pageNeedsMobilePad ? 60 : 0 }}>
        {page === "squad" && <SquadPage players={players} userId={session.user.id} />}
        {page === "players" && <PlayersPage players={players} />}
        {page === "leaderboard" && <LeaderboardPage />}
        {page === "teams" && <ViewTeamsPage players={players} />}
        {page === "history" && <HistoryPage />}
        {page === "stats" && <StatsPage players={players} />}
        {page === "howtoplay" && <HowToPlayPage />}
        {page === "account" && <AccountPage user={session.user} profile={profile} onLogout={handleLogout} />}
        {page === "admin" && session.user.id === ADMIN_ID && <AdminPage players={players} />}
      </div>
    </div>
  );
}