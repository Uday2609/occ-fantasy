import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

const ADMIN_ID = "b41a3909-5ebe-430a-bce2-9bcefeed1af2";
const ACTIVE_GW = 1;

const C = {
  bg:         "#1C2131",
  bgDeep:     "#141926",
  bgCard:     "#242C3E",
  bgCardHov:  "#2C3550",
  crimson:    "#E24343",
  crimsonLt:  "#FF6B6B",
  crimsonDim: "#E2434320",
  gold:       "#F0C040",
  goldDim:    "#F0C04018",
  white:      "#F1F5F9",
  whiteD:     "#CBD5E1",
  gray:       "#64748B",
  grayLt:     "#94A3B8",
  success:    "#3DBF7A",
  danger:     "#E24343",
  border:     "#FFFFFF10",
  borderHov:  "#FFFFFF20",
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
  { label: "Run scored", value: "1 pt" },
  { label: "Boundary (4)", value: "+4 bonus" },
  { label: "Six (6)", value: "+6 bonus" },
  { label: "Half-century (50)", value: "+20 pts" },
  { label: "Century (100)", value: "+35 pts" },
  { label: "Duck", value: "-5 pts" },
  { label: "Wicket taken", value: "10 pts" },
  { label: "3-wicket haul", value: "+20 pts" },
  { label: "5-wicket haul", value: "+35 pts" },
  { label: "Catch", value: "15 pts" },
  { label: "Run out", value: "15 pts" },
  { label: "No ball bowled", value: "-1 pt" },
  { label: "3 wides bowled", value: "-1 pt" },
  { label: "Captain", value: "2× points" },
  { label: "Vice Captain", value: "1.5× points" },
];

const RULES = [
  { title: "Squad size", desc: "Select 15 players. All 15 score points every gameweek — no bench." },
  { title: "Budget", desc: "You have $1,000 credits to build your squad. Spend wisely." },
  { title: "Role limits", desc: "Max 5 Batters · Max 5 Bowlers · Max 4 All-rounders · Max 3 Keepers." },
  { title: "Captain & VC", desc: "Pick a captain (2× points) and vice captain (1.5×) each gameweek." },
  { title: "Marquee cap", desc: "Maximum 3 marquee players (priced $100+) per squad." },
  { title: "Transfers", desc: "4 transfers per gameweek. Transfer window opens after squad selection Thursday." },
  { title: "Deadlines", desc: "Transfer deadline is Friday night. Late transfers are not accepted." },
  { title: "Scoring", desc: "Every player in your 15 scores — runs, wickets, catches, run outs all count." },
  { title: "PlayCricket", desc: "Scores pulled from PlayCricket after each round, updated by Sunday." },
];

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Sora',sans-serif;background:#141926;color:#F1F5F9;min-height:100vh}
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-track{background:#1C2131}
  ::-webkit-scrollbar-thumb{background:#374151;border-radius:3px}
  input::placeholder{color:#64748B}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
`;

// ─── POINTS CALCULATOR ─────────────────────────────────────────────────────────

function calcPoints(s) {
  let pts = 0;
  pts += (s.runs || 0);
  pts += (s.fours || 0) * 4;
  pts += (s.sixes || 0) * 6;
  if ((s.runs || 0) >= 100) pts += 35;
  else if ((s.runs || 0) >= 50) pts += 20;
  if (s.was_dismissed && (s.runs || 0) === 0 && s.did_bat) pts -= 5;
  pts += (s.wickets || 0) * 10;
  if (s.five_fer) pts += 35;
  else if (s.three_fer) pts += 20;
  pts += (s.catches || 0) * 15;
  pts += (s.run_outs || 0) * 15;
  pts += (s.stumpings || 0) * 15;
  pts -= (s.no_balls || 0);
  pts -= Math.floor((s.wides || 0) / 3);
  return Math.max(pts, 0);
}

// ─── SHARED COMPONENTS ─────────────────────────────────────────────────────────

function Spinner({ label = "Loading..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${C.bgCard}`, borderTop: `2px solid ${C.crimson}`, animation: "spin 0.7s linear infinite" }} />
      <div style={{ fontSize: 13, color: C.gray }}>{label}</div>
    </div>
  );
}

function Inp({ label, type = "text", value, onChange, placeholder, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, color: C.gray, marginBottom: 5, fontWeight: 500 }}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width: "100%", background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none" }} />
      {error && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role];
  return <span style={{ background: c + "20", color: c, border: `1px solid ${c}40`, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>{ROLE_LABELS[role]}</span>;
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: C.bgCard, borderRadius: 10, padding: "12px 14px", border: `1px solid ${(accent || C.crimson)}20`, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent || C.white }}>{value}</div>
      <div style={{ fontSize: 10, color: C.gray, marginTop: 2, letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

function Header({ title, sub }) {
  return (
    <div style={{ padding: "32px 32px 18px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 10, color: C.crimson, letterSpacing: 3, fontWeight: 600, marginBottom: 5 }}>OAKLEIGH CRICKET CLUB</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: C.white, lineHeight: 1.2 }}>{title}</h1>
      {sub && <p style={{ color: C.gray, marginTop: 5, fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

// ─── COUNTDOWN TIMER ───────────────────────────────────────────────────────────

function Countdown({ deadline }) {
  const [time, setTime] = useState({});

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) { setTime({ expired: true }); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({ d, h, m, s });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (time.expired) return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.danger + "20", border: `1px solid ${C.danger}40`, borderRadius: 8, padding: "6px 14px" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.danger, animation: "pulse 1s infinite" }} />
      <span style={{ fontSize: 12, color: C.danger, fontWeight: 600 }}>Deadline passed</span>
    </div>
  );

  const seg = (val, lbl) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.white, lineHeight: 1 }}>{String(val).padStart(2,"0")}</div>
      <div style={{ fontSize: 9, color: C.gray, marginTop: 2 }}>{lbl}</div>
    </div>
  );

  const sep = <div style={{ fontSize: 16, fontWeight: 700, color: C.crimson, marginBottom: 8 }}>:</div>;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, animation: "pulse 2s infinite", flexShrink: 0 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {seg(time.d, "days")}{sep}{seg(time.h, "hrs")}{sep}{seg(time.m, "min")}{sep}{seg(time.s, "sec")}
      </div>
    </div>
  );
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────

function AuthPage() {
  const [mode, setMode] = useState("login");
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: C.bgDeep }}>
      <div style={{ animation: "fadeUp 0.4s ease", width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px", background: C.crimson + "20", border: `1px solid ${C.crimson}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🏏</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: C.white }}>OCC Fantasy</div>
          <div style={{ fontSize: 11, color: C.gray, marginTop: 3, letterSpacing: 1 }}>OAKLEIGH CRICKET CLUB · 2026–27</div>
        </div>
        <div style={{ display: "flex", background: C.bgCard, borderRadius: 10, padding: 3, marginBottom: 20, border: `1px solid ${C.border}` }}>
          {["login","signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", background: mode === m ? C.bg : "transparent", color: mode === m ? C.white : C.gray, fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
        {mode === "login" ? <LoginForm /> : <SignupForm />}
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handle = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Incorrect email or password.");
    setLoading(false);
  };
  return (
    <div style={{ background: C.bgCard, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
      <Inp label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      <Inp label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
      {error && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12, padding: "8px 12px", background: C.danger + "15", borderRadius: 6 }}>{error}</div>}
      <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: loading ? C.bgCard : C.crimson, color: C.white, fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer", transition: "all 0.15s" }}>
        {loading ? "Logging in..." : "Log in"}
      </button>
    </div>
  );
}

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: loading ? C.bgCard : C.crimson, color: C.white, fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>
        {loading ? "Creating account..." : "Create account"}
      </button>
    </div>
  );
}

// ─── NAV ───────────────────────────────────────────────────────────────────────

function Nav({ page, setPage, user, profile, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const isAdmin = user?.id === ADMIN_ID;
  const tabs = [
    { id: "squad", label: "My Squad" },
    { id: "players", label: "Players" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "howtoplay", label: "How to Play" },
    ...(isAdmin ? [{ id: "admin", label: "⚙ Admin" }] : []),
  ];
  return (
    <nav style={{ background: C.bgDeep, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", padding: "0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 28, padding: "13px 0" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.crimson + "20", border: `1px solid ${C.crimson}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏏</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.white, lineHeight: 1.1 }}>OCC Fantasy</div>
          <div style={{ fontSize: 9, color: C.gray, letterSpacing: 1 }}>2026–27</div>
        </div>
      </div>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "17px 13px", fontSize: 12, fontWeight: 500, color: page === t.id ? C.crimson : C.gray, borderBottom: page === t.id ? `2px solid ${C.crimson}` : "2px solid transparent", marginBottom: -1, transition: "color 0.15s" }}>{t.label}</button>
      ))}
      <div style={{ marginLeft: "auto", position: "relative" }}>
        <button onClick={() => setShowMenu(m => !m)} style={{ display: "flex", alignItems: "center", gap: 7, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.crimson + "25", border: `1px solid ${C.crimson}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.crimson }}>
            {(profile?.team_name || user?.email || "?")[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 12, color: C.white, fontWeight: 500, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.team_name || user?.email}</span>
          <span style={{ fontSize: 9, color: C.gray }}>▾</span>
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

// ─── ACCOUNT PAGE ──────────────────────────────────────────────────────────────

function AccountPage({ user, profile, onLogout }) {
  const [teamName, setTeamName] = useState(profile?.team_name || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const saveTeamName = async () => {
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.from("profiles").update({ team_name: teamName }).eq("id", user.id);
    setSaveMsg(error ? "Failed to save." : "Team name updated!");
    setSaving(false);
  };

  const deleteAccount = async () => {
    if (confirmDelete !== user.email) { setDeleteMsg("Email doesn't match."); return; }
    setDeleting(true);
    await supabase.from("squads").delete().eq("user_id", user.id);
    await supabase.from("fantasy_points").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    const { error } = await supabase.rpc("delete_user");
    if (error) {
      setDeleteMsg("Could not fully delete — contact admin to remove your account.");
    } else {
      await supabase.auth.signOut();
      onLogout();
    }
    setDeleting(false);
  };

  return (
    <div style={{ padding: "0 32px 48px", maxWidth: 560 }}>
      <Header title="Account Settings" sub={user.email} />

      <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Team name */}
        <div style={{ background: C.bgCard, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 14 }}>Team name</div>
          <Inp value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Howes XI" />
          <button onClick={saveTeamName} disabled={saving} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: saving ? C.bg : C.crimson, color: C.white, fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Saving..." : "Save"}
          </button>
          {saveMsg && <div style={{ marginTop: 10, fontSize: 12, color: saveMsg.includes("!") ? C.success : C.danger }}>{saveMsg}</div>}
        </div>

        {/* Delete account */}
        <div style={{ background: C.bgCard, borderRadius: 12, padding: 20, border: `1px solid ${C.danger}30` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.danger, marginBottom: 6 }}>Delete account</div>
          <div style={{ fontSize: 12, color: C.gray, marginBottom: 14, lineHeight: 1.6 }}>This permanently deletes your account, squad, and all points history. This cannot be undone.</div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.danger}50`, background: C.danger + "15", color: C.danger, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete my account</button>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: C.grayLt, marginBottom: 8 }}>Type your email address to confirm: <span style={{ color: C.white }}>{user.email}</span></div>
              <Inp value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder={user.email} />
              {deleteMsg && <div style={{ fontSize: 12, color: C.danger, marginBottom: 8 }}>{deleteMsg}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={deleteAccount} disabled={deleting} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: C.danger, color: C.white, fontSize: 13, fontWeight: 700, cursor: deleting ? "default" : "pointer" }}>
                  {deleting ? "Deleting..." : "Confirm delete"}
                </button>
                <button onClick={() => { setShowDeleteConfirm(false); setConfirmDelete(""); setDeleteMsg(""); }} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.gray, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MEMBERS PAGE ──────────────────────────────────────────────────────────────

function MembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("id, team_name, username, total_pts").order("created_at", { ascending: true });
      if (data) setMembers(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = members.filter(m =>
    search === "" ||
    (m.team_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Members" sub={`${members.length} managers registered for 2026–27`} />
      <div style={{ padding: "20px 0" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by team or name..." style={{ width: "100%", maxWidth: 320, background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 8, padding: "8px 14px", fontSize: 13, outline: "none", marginBottom: 16 }} />
        {loading ? <Spinner label="Loading members..." /> : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: C.gray, padding: "40px 0", fontSize: 13 }}>No members found.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {filtered.map((m, i) => (
              <div key={m.id} style={{ background: C.bgCard, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, animation: "fadeUp 0.3s ease" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.crimson + "20", border: `1px solid ${C.crimson}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.crimson, flexShrink: 0 }}>
                  {(m.team_name || m.username || "?")[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.team_name || "Unnamed Team"}</div>
                  <div style={{ fontSize: 11, color: C.gray, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.username || m.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SQUAD PAGE ────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    const loadAll = async () => {
      const [squadRes, gwRes] = await Promise.all([
        supabase.from("squads").select("player_id, is_captain, is_vice_captain").eq("user_id", userId).eq("gameweek_id", ACTIVE_GW),
        supabase.from("gameweeks").select("deadline, transfers_open").eq("number", ACTIVE_GW).single(),
      ]);
      if (squadRes.data && squadRes.data.length > 0) {
        const saved = players.filter(p => squadRes.data.map(r => r.player_id).includes(p.id));
        setSquad(saved);
        const cap = squadRes.data.find(r => r.is_captain);
        const vc = squadRes.data.find(r => r.is_vice_captain);
        if (cap) setCaptain(cap.player_id);
        if (vc) setViceCaptain(vc.player_id);
      }
      if (gwRes.data) {
        setTransfersOpen(gwRes.data.transfers_open);
        setDeadline(gwRes.data.deadline);
      }
      setLoadingSquad(false);
    };
    if (players.length > 0) loadAll();
  }, [players, userId]);

  const spent = squad.reduce((s, p) => s + p.price, 0);
  const remaining = BUDGET - spent;
  const roleCounts = squad.reduce((acc, p) => ({ ...acc, [p.role]: (acc[p.role] || 0) + 1 }), {});
  const marqueeCount = squad.filter(p => p.is_marquee).length;
  const hasSquad = squad.length > 0;

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
    if (viceCaptain === id) setViceCaptain(null);
    setCaptain(id);
  };
  const toggleVC = (id) => {
    if (viceCaptain === id) { setViceCaptain(null); return; }
    if (captain === id) setCaptain(null);
    setViceCaptain(id);
  };

  const saveSquad = async () => {
    if (squad.length !== SQUAD_SIZE) { setSaveMsg(`Need ${SQUAD_SIZE} players. You have ${squad.length}.`); return; }
    if (!captain) { setSaveMsg("Please assign a captain."); return; }
    if (!viceCaptain) { setSaveMsg("Please assign a vice captain."); return; }
    setSaving(true); setSaveMsg("");
    await supabase.from("squads").delete().eq("user_id", userId).eq("gameweek_id", ACTIVE_GW);
    const { error } = await supabase.from("squads").insert(squad.map(p => ({ user_id: userId, player_id: p.id, gameweek_id: ACTIVE_GW, is_captain: p.id === captain, is_vice_captain: p.id === viceCaptain })));
    setSaveMsg(error ? "Error saving squad. Try again." : "Squad saved!");
    setSaving(false);
  };

  const pickerList = players.filter(p => (filterRole === "ALL" || p.role === filterRole) && (search === "" || p.name.toLowerCase().includes(search.toLowerCase())));
  const grouped = { BAT: [], BOWL: [], AR: [], WK: [] };
  squad.forEach(p => grouped[p.role].push(p));

  if (loadingSquad) return <Spinner label="Loading your squad..." />;

  return (
    <div style={{ padding: "0 0 48px" }}>
      {/* Header */}
      <div style={{ padding: "32px 32px 18px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.crimson, letterSpacing: 3, fontWeight: 600, marginBottom: 5 }}>OAKLEIGH CRICKET CLUB</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.white, lineHeight: 1.2, marginBottom: 10 }}>My Squad</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {deadline && <Countdown deadline={deadline} />}
          {!transfersOpen && hasSquad && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.gold + "15", border: `1px solid ${C.gold}40`, borderRadius: 8, padding: "6px 14px" }}>
              <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>Transfer window closed</span>
            </div>
          )}
          {transfersOpen && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.success + "15", border: `1px solid ${C.success}40`, borderRadius: 8, padding: "6px 14px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>Transfer window open</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, padding: "16px 32px" }}>
        <StatCard label="BUDGET LEFT" value={`$${remaining}`} accent={remaining < 80 ? C.danger : C.white} />
        <StatCard label="PLAYERS" value={`${squad.length}/${SQUAD_SIZE}`} />
        <StatCard label="MARQUEE" value={`${marqueeCount}/${MAX_MARQUEE}`} accent={marqueeCount >= MAX_MARQUEE ? C.danger : C.success} />
        <StatCard label="TRANSFERS" value={`${TRANSFERS_PER_GW}/${TRANSFERS_PER_GW}`} accent={transfersOpen ? C.success : C.gray} />
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 0, padding: "0 32px" }}>

        {/* LEFT — squad list */}
        <div style={{ paddingRight: 24, borderRight: `1px solid ${C.border}` }}>
          {Object.entries(grouped).map(([role, rPlayers]) => (
            <div key={role} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ height: 1, flex: 1, background: C.border }} />
                <span style={{ fontSize: 9, color: ROLE_COLORS[role], fontWeight: 700, letterSpacing: 2 }}>{ROLE_LABELS[role].toUpperCase()}S · {rPlayers.length}/{ROLE_LIMITS[role]}</span>
                <div style={{ height: 1, flex: 1, background: C.border }} />
              </div>
              {rPlayers.length === 0 && <div style={{ textAlign: "center", color: C.gray, fontSize: 12, padding: "8px 0", opacity: 0.5 }}>No {ROLE_LABELS[role].toLowerCase()}s added yet</div>}
              {rPlayers.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.bgCard, borderRadius: 10, marginBottom: 5, border: captain === p.id ? `1px solid ${C.crimson}` : viceCaptain === p.id ? `1px solid ${C.crimson}50` : `1px solid ${C.border}`, transition: "border-color 0.15s" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white, display: "flex", alignItems: "center", gap: 6 }}>
                      {p.name}
                      {captain === p.id && <span style={{ background: C.crimson, color: C.white, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>C</span>}
                      {viceCaptain === p.id && <span style={{ background: C.crimson + "40", color: C.crimsonLt, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>VC</span>}
                    </div>
                    <div style={{ marginTop: 3 }}><RoleBadge role={p.role} /></div>
                  </div>
                  <div style={{ textAlign: "right", marginRight: 4 }}>
                    <div style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>${p.price}</div>
                    <div style={{ fontSize: 10, color: C.gray }}>{p.pts > 0 ? `${p.pts} pts` : "New"}</div>
                  </div>
                  <button onClick={() => toggleCaptain(p.id)} style={{ background: captain === p.id ? C.crimson : "transparent", color: captain === p.id ? C.white : C.gray, border: `1px solid ${C.crimson}50`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>C</button>
                  <button onClick={() => toggleVC(p.id)} style={{ background: viceCaptain === p.id ? C.crimson + "30" : "transparent", color: viceCaptain === p.id ? C.crimsonLt : C.gray, border: `1px solid ${C.crimson}30`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>VC</button>
                  <button onClick={() => removePlayer(p.id)} style={{ background: C.danger + "15", color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          ))}

          {/* Buttons */}
          <div style={{ marginTop: 8 }}>
            {hasSquad && !transfersOpen ? (
              <div style={{ padding: "11px 16px", background: C.gold + "10", border: `1px solid ${C.gold}25`, borderRadius: 10, fontSize: 12, color: C.gold, textAlign: "center" }}>
                Transfer window closed — check back after Thursday selection
              </div>
            ) : (
              <>
                <button onClick={() => setShowPicker(true)} style={{ display: "block", width: "100%", padding: "12px", background: C.crimson, color: C.white, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 7 }}>+ Add Players</button>
                <button onClick={saveSquad} disabled={saving} style={{ display: "block", width: "100%", padding: "12px", background: saving ? C.bgCard : C.success + "CC", color: C.white, border: "none", borderRadius: 10, cursor: saving ? "default" : "pointer", fontSize: 13, fontWeight: 700 }}>{saving ? "Saving..." : "Save Squad"}</button>
              </>
            )}
            {saveMsg && <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, fontSize: 12, background: saveMsg.includes("!") ? C.success + "15" : C.danger + "15", color: saveMsg.includes("!") ? C.success : C.danger, border: `1px solid ${saveMsg.includes("!") ? C.success : C.danger}30` }}>{saveMsg}</div>}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ paddingLeft: 24, paddingTop: 16 }}>
          {/* Squad value */}
          <div style={{ background: C.bgCard, borderRadius: 10, padding: "16px", border: `1px solid ${C.border}`, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, fontWeight: 600, marginBottom: 10 }}>SQUAD SUMMARY</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.grayLt }}>Total squad value</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>${spent}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.grayLt }}>Remaining budget</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: remaining < 80 ? C.danger : C.white }}>${remaining}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.grayLt }}>Players selected</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{squad.length} / {SQUAD_SIZE}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.grayLt }}>Marquee players</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: marqueeCount >= MAX_MARQUEE ? C.danger : C.white }}>{marqueeCount} / {MAX_MARQUEE}</span>
            </div>
          </div>

          {/* Role breakdown */}
          <div style={{ background: C.bgCard, borderRadius: 10, padding: "16px", border: `1px solid ${C.border}`, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, fontWeight: 600, marginBottom: 10 }}>ROLE BREAKDOWN</div>
            {Object.entries(ROLE_LIMITS).map(([role, limit]) => {
              const count = roleCounts[role] || 0;
              const pct = (count / limit) * 100;
              return (
                <div key={role} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: ROLE_COLORS[role], fontWeight: 600 }}>{ROLE_LABELS[role]}s</span>
                    <span style={{ fontSize: 11, color: C.gray }}>{count}/{limit}</span>
                  </div>
                  <div style={{ height: 4, background: C.bgDeep, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: ROLE_COLORS[role], borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Captain / VC summary */}
          <div style={{ background: C.bgCard, borderRadius: 10, padding: "16px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, fontWeight: 600, marginBottom: 10 }}>LEADERSHIP</div>
            {[["Captain (2×)", captain], ["Vice Captain (1.5×)", viceCaptain]].map(([label, id]) => {
              const p = squad.find(x => x.id === id);
              return (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: C.gray }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: p ? C.white : C.gray }}>{p ? p.name : "Not set"}</span>
                </div>
              );
            })}
            {(!captain || !viceCaptain) && (
              <div style={{ marginTop: 8, fontSize: 11, color: C.gold, padding: "6px 10px", background: C.gold + "10", borderRadius: 6 }}>
                Set both before saving your squad
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 200, display: "flex", alignItems: "stretch", justifyContent: "center" }} onClick={() => setShowPicker(false)}>
          {/* Floating widget */}
          <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", background: C.bgDeep, border: `1px solid ${C.crimson}40`, borderRadius: 40, padding: "7px 18px", display: "flex", alignItems: "center", gap: 16, zIndex: 210 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: C.gray }}>BUDGET</div><div style={{ fontSize: 16, fontWeight: 700, color: remaining < 80 ? C.danger : C.white }}>${remaining}</div></div>
            <div style={{ width: 1, height: 28, background: C.border }} />
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: C.gray }}>PLAYERS</div><div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{squad.length}<span style={{ fontSize: 11, color: C.gray }}>/{SQUAD_SIZE}</span></div></div>
            <div style={{ width: 1, height: 28, background: C.border }} />
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: C.gray }}>MARQUEE</div><div style={{ fontSize: 16, fontWeight: 700, color: marqueeCount >= MAX_MARQUEE ? C.danger : C.success }}>{marqueeCount}<span style={{ fontSize: 11, color: C.gray }}>/{MAX_MARQUEE}</span></div></div>
          </div>

          <div style={{ display: "flex", width: "100%", maxWidth: 860, marginTop: 58, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            {/* Sidebar */}
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
                          <button onClick={() => removePlayer(p.id)} style={{ background: C.danger + "15", color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12, lineHeight: 1, flexShrink: 0, marginLeft: 4 }}>×</button>
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

            {/* Player list */}
            <div style={{ flex: 1, background: C.bgDeep, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Add Players</span>
                  <button onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", color: C.gray, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ width: "100%", background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 7, padding: "7px 11px", fontSize: 12, outline: "none", marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {["ALL","BAT","BOWL","AR","WK"].map(r => (
                    <button key={r} onClick={() => setFilterRole(r)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${filterRole === r ? C.crimson : C.border}`, background: filterRole === r ? C.crimson + "20" : "transparent", color: filterRole === r ? C.crimson : C.gray, cursor: "pointer", fontSize: 11, fontWeight: 500 }}>{r === "ALL" ? "All" : ROLE_LABELS[r]}</button>
                  ))}
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
                        <div style={{ fontSize: 10, color: C.gray }}>{p.pts > 0 ? `${p.pts} pts` : "New"}</div>
                      </div>
                      {inSquad ? (
                        <button onClick={() => removePlayer(p.id)} style={{ padding: "5px 10px", borderRadius: 5, border: `1px solid ${C.danger}40`, background: C.danger + "15", color: C.danger, cursor: "pointer", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Remove</button>
                      ) : (
                        <button onClick={() => addable && setSquad(s => [...s, p])} disabled={!addable} style={{ padding: "5px 10px", borderRadius: 5, border: `1px solid ${addable ? C.crimson + "50" : C.border}`, background: addable ? C.crimson + "15" : "transparent", color: addable ? C.crimson : C.gray, cursor: addable ? "pointer" : "default", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Add</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>{/* end two-column grid */}
    </div>
  );
}

// ─── PLAYERS PAGE ──────────────────────────────────────────────────────────────

function PlayersPage({ players }) {
  const [sort, setSort] = useState("price");
  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => players.filter(p => (filterRole === "ALL" || p.role === filterRole) && (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => b[sort] - a[sort]), [players, sort, filterRole, search]);
  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Player Database" sub={`${players.length} players · Season 2026–27`} />
      <div style={{ display: "flex", gap: 8, padding: "16px 0 14px", flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 8, padding: "7px 12px", fontSize: 12, outline: "none", minWidth: 180 }} />
        {["ALL","BAT","BOWL","AR","WK"].map(r => (
          <button key={r} onClick={() => setFilterRole(r)} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${filterRole === r ? C.crimson : C.border}`, background: filterRole === r ? C.crimson + "15" : "transparent", color: filterRole === r ? C.crimson : C.gray, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{r === "ALL" ? "All Roles" : ROLE_LABELS[r]}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {[["price","Price"],["pts","Points"],["mp","Matches"]].map(([k,l]) => (
            <button key={k} onClick={() => setSort(k)} style={{ padding: "6px 11px", borderRadius: 7, border: `1px solid ${sort === k ? C.crimson : C.border}`, background: sort === k ? C.crimson + "15" : "transparent", color: sort === k ? C.crimson : C.gray, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Sort: {l}</button>
          ))}
        </div>
      </div>
      <div style={{ background: C.bgCard, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 60px", padding: "9px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.gray, fontWeight: 600, letterSpacing: 0.8 }}>
          <span>PLAYER</span><span>PRICE</span><span>SEASON PTS</span><span>MP</span>
        </div>
        {filtered.map((p, i) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 60px", padding: "10px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = C.bgCardHov} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.white, display: "flex", alignItems: "center", gap: 6 }}>
                {p.name}
                {p.is_marquee && <span style={{ background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>MARQUEE</span>}
              </div>
              <div style={{ marginTop: 3 }}><RoleBadge role={p.role} /></div>
            </div>
            <span style={{ fontSize: 13, color: C.gold, fontWeight: 600 }}>${p.price}</span>
            <span style={{ fontSize: 13, color: C.whiteD, fontWeight: 500 }}>{p.pts > 0 ? p.pts : "—"}</span>
            <span style={{ fontSize: 12, color: C.gray }}>{p.mp > 0 ? p.mp : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LEADERBOARD PAGE ──────────────────────────────────────────────────────────

function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, team_name, username, total_pts, created_at")
        .order("total_pts", { ascending: false });
      if (data) setEntries(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const hasPoints = entries.some(e => e.total_pts > 0);

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Leaderboard" sub="Season 2026–27" />
      {loading ? <Spinner label="Loading..." /> : (
        <div style={{ paddingTop: 20 }}>

          {/* Podium — only show when points exist */}
          {hasPoints && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
              {entries.slice(0, 3).map((p, i) => (
                <div key={p.id} style={{ background: i === 0 ? C.crimson + "15" : C.bgCard, borderRadius: 12, padding: "18px 14px", border: `1px solid ${i === 0 ? C.crimson + "40" : C.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 5 }}>{["🥇","🥈","🥉"][i]}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{p.team_name || p.username}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: i === 0 ? C.crimson : C.whiteD, marginTop: 8 }}>{p.total_pts}</div>
                  <div style={{ fontSize: 10, color: C.gray }}>total points</div>
                </div>
              ))}
            </div>
          )}

          {/* Full table — everyone, sorted by points when available otherwise registration order */}
          <div style={{ background: C.bgCard, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px", padding: "9px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.gray, fontWeight: 600, letterSpacing: 0.8 }}>
              <span>#</span>
              <span>MANAGER</span>
              <span style={{ textAlign: "right" }}>{hasPoints ? "TOTAL PTS" : "REGISTERED"}</span>
            </div>
            {entries.length === 0 ? (
              <div style={{ textAlign: "center", color: C.gray, padding: "40px 0", fontSize: 13 }}>No members yet — be the first to sign up!</div>
            ) : entries.map((p, i) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px", padding: "11px 16px", borderBottom: i < entries.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = C.bgCardHov} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 13, fontWeight: 700, color: hasPoints && i < 3 ? C.crimson : C.gray }}>{i + 1}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.crimson + "20", border: `1px solid ${C.crimson}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.crimson, flexShrink: 0 }}>
                    {(p.team_name || p.username || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{p.team_name || "Unnamed Team"}</div>
                    <div style={{ fontSize: 11, color: C.gray }}>{p.username}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {hasPoints ? (
                    <span style={{ fontSize: 14, color: hasPoints && i < 3 ? C.crimson : C.whiteD, fontWeight: 700 }}>{p.total_pts}</span>
                  ) : (
                    <span style={{ fontSize: 11, color: C.gray }}>Joined</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!hasPoints && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.gray, textAlign: "center" }}>
              Points will appear here once the first gameweek is calculated
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HOW TO PLAY ───────────────────────────────────────────────────────────────

function HowToPlayPage() {
  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="How to Play" sub="Everything you need to know about OCC Fantasy" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "20px 0 20px" }}>
        {RULES.map((r, i) => (
          <div key={i} style={{ background: C.bgCard, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: C.crimson + "20", border: `1px solid ${C.crimson}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.crimson }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.white, marginBottom: 3 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: C.gray, lineHeight: 1.6 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: C.bgCard, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 14 }}>Scoring System</div>
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
  );
}

// ─── ADMIN PAGE ────────────────────────────────────────────────────────────────

function AdminPage({ players }) {
  const [gw, setGw] = useState(ACTIVE_GW);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("success");
  const [search, setSearch] = useState("");
  const [existingScores, setExistingScores] = useState({});
  const [transfersOpen, setTransfersOpen] = useState(false);
  const [togglingWindow, setTogglingWindow] = useState(false);

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

  const toggleTransferWindow = async () => {
    setTogglingWindow(true);
    const newVal = !transfersOpen;
    const { error } = await supabase.from("gameweeks").update({ transfers_open: newVal }).eq("number", gw);
    if (!error) { setTransfersOpen(newVal); setMsg(`Transfer window ${newVal ? "opened" : "closed"} for GW${gw}.`); setMsgType("success"); }
    else { setMsg("Failed to update transfer window."); setMsgType("danger"); }
    setTogglingWindow(false);
  };

  const getVal = (pid, field) => {
    if (scores[pid]?.[field] !== undefined) return scores[pid][field];
    if (existingScores[pid]?.[field] !== undefined) return existingScores[pid][field];
    return field.startsWith("did_") || field.startsWith("was_") || field.startsWith("five_") || field.startsWith("three_") ? false : 0;
  };
  const setVal = (pid, field, value) => setScores(s => ({ ...s, [pid]: { ...(s[pid] || {}), [field]: value } }));
  const preview = (pid) => calcPoints({ runs: getVal(pid,"runs"), fours: getVal(pid,"fours"), sixes: getVal(pid,"sixes"), wickets: getVal(pid,"wickets"), catches: getVal(pid,"catches"), run_outs: getVal(pid,"run_outs"), stumpings: getVal(pid,"stumpings"), no_balls: getVal(pid,"no_balls"), wides: getVal(pid,"wides"), did_bat: getVal(pid,"did_bat"), was_dismissed: getVal(pid,"was_dismissed"), five_fer: getVal(pid,"five_fer"), three_fer: getVal(pid,"three_fer") });

  const saveScores = async () => {
    setSaving(true); setMsg("");
    const rows = players.map(p => {
      const s = { runs: getVal(p.id,"runs"), fours: getVal(p.id,"fours"), sixes: getVal(p.id,"sixes"), wickets: getVal(p.id,"wickets"), catches: getVal(p.id,"catches"), run_outs: getVal(p.id,"run_outs"), stumpings: getVal(p.id,"stumpings"), no_balls: getVal(p.id,"no_balls"), wides: getVal(p.id,"wides"), did_bat: getVal(p.id,"did_bat"), was_dismissed: getVal(p.id,"was_dismissed"), five_fer: getVal(p.id,"five_fer"), three_fer: getVal(p.id,"three_fer") };
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
    if (!squadData || squadData.length === 0) { setMsg("No squads found for this gameweek."); setMsgType("danger"); setCalculating(false); return; }
    const { data: scoreData } = await supabase.from("gameweek_scores").select("player_id, calculated_pts").eq("gameweek_id", gw);
    const scoreMap = {};
    if (scoreData) scoreData.forEach(s => { scoreMap[s.player_id] = s.calculated_pts || 0; });
    const userSquads = {};
    squadData.forEach(row => { if (!userSquads[row.user_id]) userSquads[row.user_id] = []; userSquads[row.user_id].push(row); });
    const pointsRows = Object.entries(userSquads).map(([userId, squad]) => {
      let total = 0;
      squad.forEach(entry => { let pts = scoreMap[entry.player_id] || 0; if (entry.is_captain) pts *= 2; else if (entry.is_vice_captain) pts *= 1.5; total += pts; });
      return { user_id: userId, gameweek_id: gw, raw_pts: total, total_pts: total };
    });
    const { error: fpError } = await supabase.from("fantasy_points").upsert(pointsRows, { onConflict: "user_id,gameweek_id" });
    if (fpError) { setMsg("Error calculating: " + fpError.message); setMsgType("danger"); setCalculating(false); return; }
    for (const { user_id } of pointsRows) {
      const { data: allPts } = await supabase.from("fantasy_points").select("total_pts").eq("user_id", user_id);
      const grand = allPts ? allPts.reduce((s, r) => s + (r.total_pts || 0), 0) : 0;
      await supabase.from("profiles").update({ total_pts: grand }).eq("id", user_id);
    }
    setMsg(`Points calculated for ${pointsRows.length} managers!`); setMsgType("success");
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
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Admin Panel" sub="Score entry · Points calculation · Transfer window" />

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0 12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 12, color: C.gray }}>Gameweek</span>
          <input type="number" min="1" value={gw} onChange={e => setGw(parseInt(e.target.value) || 1)} style={{ width: 56, background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 7, padding: "6px 9px", fontSize: 13, outline: "none", textAlign: "center" }} />
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.white, borderRadius: 7, padding: "6px 11px", fontSize: 12, outline: "none", minWidth: 170 }} />
        <button onClick={saveScores} disabled={saving} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: saving ? C.bgCard : C.gold, color: C.bgDeep, fontWeight: 700, fontSize: 12, cursor: saving ? "default" : "pointer" }}>{saving ? "Saving..." : "Save Scores"}</button>
        <button onClick={calculatePoints} disabled={calculating} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: calculating ? C.bgCard : C.success, color: C.white, fontWeight: 700, fontSize: 12, cursor: calculating ? "default" : "pointer" }}>{calculating ? "Calculating..." : "Calculate Points"}</button>
        {/* Transfer window toggle */}
        <button onClick={toggleTransferWindow} disabled={togglingWindow} style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${transfersOpen ? C.success : C.crimson}50`, background: transfersOpen ? C.success + "15" : C.crimson + "15", color: transfersOpen ? C.success : C.crimson, fontWeight: 700, fontSize: 12, cursor: togglingWindow ? "default" : "pointer" }}>
          {togglingWindow ? "Updating..." : transfersOpen ? "Close Transfer Window" : "Open Transfer Window"}
        </button>
      </div>

      {msg && <div style={{ marginBottom: 14, padding: "9px 14px", borderRadius: 7, fontSize: 12, background: C[msgType] + "15", color: C[msgType], border: `1px solid ${C[msgType]}30` }}>{msg}</div>}

      {/* Score entry rows */}
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
                <div style={{ fontSize: 9, color: "#818CF8", fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>BATTING</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  {numField(p.id,"runs","Runs",68)}{numField(p.id,"fours","4s",52)}{numField(p.id,"sixes","6s",52)}{boolField(p.id,"did_bat","Batted")}{boolField(p.id,"was_dismissed","Out")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>BOWLING</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  {numField(p.id,"wickets","Wkts",60)}{numField(p.id,"no_balls","NB",52)}{numField(p.id,"wides","Wides",60)}{boolField(p.id,"three_fer","3W")}{boolField(p.id,"five_fer","5W")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.success, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>FIELDING</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  {numField(p.id,"catches","Catches",68)}{numField(p.id,"run_outs","Run Outs",68)}{numField(p.id,"stumpings","Stmpgs",68)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("squad");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadAppData(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadAppData(session.user.id);
      else { setPlayers([]); setProfile(null); setLoading(false); }
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

  return (
    <div style={{ minHeight: "100vh", background: C.bgDeep }}>
      <style>{globalStyles}</style>
      <Nav page={page} setPage={setPage} user={session.user} profile={profile} onLogout={handleLogout} />
      {page === "squad" && <SquadPage players={players} userId={session.user.id} />}
      {page === "players" && <PlayersPage players={players} />}
      {page === "leaderboard" && <LeaderboardPage />}
      {page === "howtoplay" && <HowToPlayPage />}
      {page === "account" && <AccountPage user={session.user} profile={profile} onLogout={handleLogout} />}
      {page === "admin" && session.user.id === ADMIN_ID && <AdminPage players={players} />}
    </div>
  );
}