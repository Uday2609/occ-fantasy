import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

const COLORS = {
  purple: "#6B4EAA",
  purpleDark: "#3D2870",
  purpleLight: "#8B6FCC",
  purpleMid: "#543D8A",
  gold: "#F0C040",
  goldDark: "#C89B1A",
  goldLight: "#F7D96A",
  white: "#FFFFFF",
  gray: "#9A90A8",
  danger: "#E05555",
  success: "#3DBF7A",
};

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
  { title: "Marquee cap", desc: "Maximum 3 marquee players (priced $100+) per squad. Choose wisely." },
  { title: "Transfers", desc: "4 transfers allowed per gameweek. Your opening squad is everything." },
  { title: "Deadlines", desc: "Squads update Thursday. Transfer deadline is Friday night." },
  { title: "Scoring", desc: "Every player in your 15 scores — runs, wickets, catches, run outs all count." },
  { title: "PlayCricket", desc: "Scores pulled from PlayCricket after each round, updated by Sunday." },
];

const ROLE_LABELS = { BAT: "Batter", BOWL: "Bowler", AR: "All-rounder", WK: "Keeper" };
const ROLE_COLORS = { BAT: "#8B6FCC", BOWL: "#C89B1A", AR: "#1D9E75", WK: "#D85A30" };
const BUDGET = 1000;
const ROLE_LIMITS = { BAT: 5, BOWL: 5, AR: 4, WK: 3 };
const SQUAD_SIZE = 15;
const TRANSFERS_PER_GW = 4;
const MARQUEE_PRICE = 100;
const MAX_MARQUEE = 3;

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Sora',sans-serif;background:#241650;color:#F5F0FF;min-height:100vh}
  ::-webkit-scrollbar{width:6px}
  ::-webkit-scrollbar-track{background:#3D2870}
  ::-webkit-scrollbar-thumb{background:#8B6FCC;border-radius:3px}
  input::placeholder{color:#9A90A8}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
`;

function Spinner({ label = "Loading..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: `3px solid ${COLORS.purpleMid}`,
        borderTop: `3px solid ${COLORS.gold}`,
        animation: "spin 0.8s linear infinite",
      }} />
      <div style={{ fontSize: 13, color: COLORS.gray }}>{label}</div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 6, fontWeight: 500 }}>{label}</div>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          width: "100%", background: COLORS.purpleMid,
          border: `1px solid ${error ? COLORS.danger : COLORS.purpleLight}40`,
          color: COLORS.white, borderRadius: 8, padding: "10px 14px",
          fontSize: 14, outline: "none",
        }}
      />
      {error && <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ─── AUTH PAGES ────────────────────────────────────────────────────────────────

function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "24px",
      background: "#241650",
    }}>
      <div style={{ animation: "fadeIn 0.4s ease", width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
          }}>🏏</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: COLORS.gold }}>OCC Fantasy</div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4, letterSpacing: 1 }}>OAKLEIGH CRICKET CLUB</div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex", background: COLORS.purpleDark, borderRadius: 10,
          padding: 4, marginBottom: 24, border: `1px solid ${COLORS.purpleMid}`,
        }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "9px", borderRadius: 7, border: "none", cursor: "pointer",
              background: mode === m ? COLORS.purpleMid : "transparent",
              color: mode === m ? COLORS.white : COLORS.gray,
              fontSize: 13, fontWeight: 600, transition: "all 0.15s",
            }}>{m === "login" ? "Log in" : "Sign up"}</button>
          ))}
        </div>

        {mode === "login" ? <LoginForm onAuth={onAuth} /> : <SignupForm onAuth={onAuth} />}
      </div>
    </div>
  );
}

function LoginForm({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Incorrect email or password. Try again.");
    } else {
      onAuth();
    }
    setLoading(false);
  };

  return (
    <div style={{ background: COLORS.purpleDark, borderRadius: 14, padding: "24px", border: `1px solid ${COLORS.purpleMid}` }}>
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
      {error && <div style={{ fontSize: 12, color: COLORS.danger, marginBottom: 14, padding: "8px 12px", background: COLORS.danger + "15", borderRadius: 6 }}>{error}</div>}
      <button onClick={handleLogin} disabled={loading} style={{
        width: "100%", padding: "12px", borderRadius: 8, border: "none",
        background: loading ? COLORS.purpleMid : `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
        color: loading ? COLORS.gray : COLORS.purpleDark,
        fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", transition: "all 0.15s",
      }}>{loading ? "Logging in..." : "Log in"}</button>
    </div>
  );
}

function SignupForm({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    if (!email || !password || !confirm) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      // Update team name in profiles if provided
      if (teamName && data.user) {
        await supabase.from("profiles").update({ team_name: teamName, username: email }).eq("id", data.user.id);
      }
      onAuth();
    }
    setLoading(false);
  };

  return (
    <div style={{ background: COLORS.purpleDark, borderRadius: 14, padding: "24px", border: `1px solid ${COLORS.purpleMid}` }}>
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      <Input label="Team name (optional)" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Howes XI" />
      <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
      <Input label="Confirm password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" />
      {error && <div style={{ fontSize: 12, color: COLORS.danger, marginBottom: 14, padding: "8px 12px", background: COLORS.danger + "15", borderRadius: 6 }}>{error}</div>}
      <button onClick={handleSignup} disabled={loading} style={{
        width: "100%", padding: "12px", borderRadius: 8, border: "none",
        background: loading ? COLORS.purpleMid : `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
        color: loading ? COLORS.gray : COLORS.purpleDark,
        fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", transition: "all 0.15s",
      }}>{loading ? "Creating account..." : "Create account"}</button>
    </div>
  );
}

// ─── NAV ───────────────────────────────────────────────────────────────────────

function Nav({ page, setPage, user, profile, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const tabs = [
    { id: "squad", label: "My Squad" },
    { id: "players", label: "Players" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "howtoplay", label: "How to Play" },
  ];
  return (
    <nav style={{
      background: COLORS.purpleDark, borderBottom: `2px solid ${COLORS.gold}35`,
      position: "sticky", top: 0, zIndex: 100,
      display: "flex", alignItems: "center", padding: "0 24px",
      boxShadow: "0 4px 20px #0005",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 32, padding: "12px 0" }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>🏏</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.gold, lineHeight: 1.1 }}>OCC Fantasy</div>
          <div style={{ fontSize: 10, color: COLORS.gray, letterSpacing: 1 }}>OAKLEIGH CC</div>
        </div>
      </div>

      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "18px 15px", fontSize: 13, fontWeight: 500,
          color: page === t.id ? COLORS.gold : COLORS.gray,
          borderBottom: page === t.id ? `2px solid ${COLORS.gold}` : "2px solid transparent",
          marginBottom: -2, transition: "color 0.15s",
        }}>{t.label}</button>
      ))}

      {/* User menu */}
      <div style={{ marginLeft: "auto", position: "relative" }}>
        <button onClick={() => setShowMenu(m => !m)} style={{
          display: "flex", alignItems: "center", gap: 8,
          background: COLORS.purpleMid, border: `1px solid ${COLORS.purpleLight}40`,
          borderRadius: 8, padding: "7px 12px", cursor: "pointer",
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: COLORS.gold + "30", border: `1px solid ${COLORS.gold}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: COLORS.gold,
          }}>
            {(profile?.team_name || user?.email || "?")[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 12, color: COLORS.white, fontWeight: 500, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile?.team_name || user?.email}
          </span>
          <span style={{ fontSize: 10, color: COLORS.gray }}>▾</span>
        </button>

        {showMenu && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)",
            background: COLORS.purpleDark, border: `1px solid ${COLORS.purpleMid}`,
            borderRadius: 10, padding: "8px", minWidth: 160,
            boxShadow: "0 8px 24px #0006", zIndex: 300,
          }}>
            <div style={{ padding: "6px 10px", fontSize: 11, color: COLORS.gray, borderBottom: `1px solid ${COLORS.purpleMid}`, marginBottom: 6 }}>
              {user?.email}
            </div>
            <button onClick={() => { setShowMenu(false); onLogout(); }} style={{
              width: "100%", padding: "8px 10px", borderRadius: 6, border: "none",
              background: "transparent", color: COLORS.danger,
              cursor: "pointer", fontSize: 13, fontWeight: 500, textAlign: "left",
            }}>Log out</button>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── HEADER ────────────────────────────────────────────────────────────────────

function Header({ title, sub }) {
  return (
    <div style={{ padding: "36px 32px 20px", background: `linear-gradient(180deg, ${COLORS.purpleDark} 0%, transparent 100%)` }}>
      <div style={{ fontSize: 10, color: COLORS.gold, letterSpacing: 3, fontWeight: 600, marginBottom: 6 }}>OAKLEIGH CRICKET CLUB</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: COLORS.white, lineHeight: 1.15 }}>{title}</h1>
      {sub && <p style={{ color: COLORS.gray, marginTop: 6, fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

function StatPill({ label, value, accent }) {
  return (
    <div style={{
      background: COLORS.purpleMid, borderRadius: 10, padding: "12px 16px",
      border: `1px solid ${(accent || COLORS.gold)}28`, textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || COLORS.gold }}>{value}</div>
      <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role];
  return (
    <span style={{
      background: c + "25", color: c, border: `1px solid ${c}50`,
      borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600,
    }}>{ROLE_LABELS[role]}</span>
  );
}

// ─── SQUAD PAGE ────────────────────────────────────────────────────────────────

function SquadPage({ players }) {
  const [squad, setSquad] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");

  const spent = squad.reduce((s, p) => s + p.price, 0);
  const remaining = BUDGET - spent;
  const roleCounts = squad.reduce((acc, p) => ({ ...acc, [p.role]: (acc[p.role] || 0) + 1 }), {});
  const marqueeCount = squad.filter(p => p.is_marquee).length;

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

  const pickerList = players.filter(p =>
    (filterRole === "ALL" || p.role === filterRole) &&
    (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = { BAT: [], BOWL: [], AR: [], WK: [] };
  squad.forEach(p => grouped[p.role].push(p));

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="My Squad" sub="Gameweek 1 · Deadline: Friday 11:59 PM" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatPill label="Budget remaining" value={`$${remaining}`} accent={remaining < 80 ? COLORS.danger : COLORS.gold} />
        <StatPill label="Players selected" value={`${squad.length} / ${SQUAD_SIZE}`} />
        <StatPill label="Marquee players" value={`${marqueeCount} / ${MAX_MARQUEE}`} accent={marqueeCount >= MAX_MARQUEE ? COLORS.danger : COLORS.success} />
        <StatPill label="Transfers left" value={`${TRANSFERS_PER_GW} / ${TRANSFERS_PER_GW}`} accent={COLORS.success} />
      </div>

      {Object.entries(grouped).map(([role, players]) => (
        <div key={role} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ height: 1, flex: 1, background: COLORS.purpleMid }} />
            <span style={{ fontSize: 10, color: ROLE_COLORS[role], fontWeight: 700, letterSpacing: 2 }}>
              {ROLE_LABELS[role].toUpperCase()}S · {players.length}/{ROLE_LIMITS[role]}
            </span>
            <div style={{ height: 1, flex: 1, background: COLORS.purpleMid }} />
          </div>
          {players.length === 0 && (
            <div style={{ textAlign: "center", color: COLORS.gray, fontSize: 13, padding: "10px 0", opacity: 0.5 }}>
              No {ROLE_LABELS[role].toLowerCase()}s added yet
            </div>
          )}
          {players.map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              background: COLORS.purpleMid, borderRadius: 10, marginBottom: 6,
              border: captain === p.id ? `1px solid ${COLORS.gold}` : viceCaptain === p.id ? `1px solid ${COLORS.goldLight}60` : "1px solid transparent",
              transition: "border-color 0.15s",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.white, display: "flex", alignItems: "center", gap: 6 }}>
                  {p.name}
                  {captain === p.id && <span style={{ background: COLORS.gold, color: COLORS.purpleDark, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>C</span>}
                  {viceCaptain === p.id && <span style={{ background: COLORS.goldLight + "50", color: COLORS.gold, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>VC</span>}
                </div>
                <div style={{ marginTop: 4 }}><RoleBadge role={p.role} /></div>
              </div>
              <div style={{ textAlign: "right", marginRight: 4 }}>
                <div style={{ fontSize: 13, color: COLORS.gold, fontWeight: 600 }}>${p.price}</div>
                <div style={{ fontSize: 11, color: COLORS.gray }}>{p.pts > 0 ? `${p.pts} pts` : "New"}</div>
              </div>
              <button onClick={() => toggleCaptain(p.id)} style={{
                background: captain === p.id ? COLORS.gold : "transparent",
                color: captain === p.id ? COLORS.purpleDark : COLORS.gray,
                border: `1px solid ${COLORS.gold}50`, borderRadius: 6,
                padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700,
              }}>C</button>
              <button onClick={() => toggleVC(p.id)} style={{
                background: viceCaptain === p.id ? COLORS.goldLight + "30" : "transparent",
                color: viceCaptain === p.id ? COLORS.gold : COLORS.gray,
                border: `1px solid ${COLORS.gold}30`, borderRadius: 6,
                padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700,
              }}>VC</button>
              <button onClick={() => removePlayer(p.id)} style={{
                background: COLORS.danger + "20", color: COLORS.danger,
                border: `1px solid ${COLORS.danger}40`, borderRadius: 6,
                padding: "4px 10px", cursor: "pointer", fontSize: 15, lineHeight: 1,
              }}>×</button>
            </div>
          ))}
        </div>
      ))}

      <button onClick={() => setShowPicker(true)} style={{
        display: "block", width: "100%", marginTop: 14, padding: "14px",
        background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
        color: COLORS.purpleDark, border: "none", borderRadius: 10,
        cursor: "pointer", fontSize: 14, fontWeight: 700,
      }}>+ Add Players</button>

      {showPicker && (
        <div style={{
          position: "fixed", inset: 0, background: "#000A", zIndex: 200,
          display: "flex", alignItems: "stretch", justifyContent: "center",
        }} onClick={() => setShowPicker(false)}>
          <div style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            background: COLORS.purpleDark, border: `1px solid ${COLORS.gold}50`,
            borderRadius: 40, padding: "8px 20px",
            display: "flex", alignItems: "center", gap: 18, zIndex: 210,
            boxShadow: "0 4px 24px #0008",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: COLORS.gray, letterSpacing: 0.5 }}>BUDGET LEFT</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: remaining < 80 ? COLORS.danger : COLORS.gold, lineHeight: 1.1 }}>${remaining}</div>
            </div>
            <div style={{ width: 1, height: 32, background: COLORS.purpleMid }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: COLORS.gray, letterSpacing: 0.5 }}>PLAYERS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.white, lineHeight: 1.1 }}>{squad.length}<span style={{ fontSize: 12, color: COLORS.gray, fontWeight: 400 }}>/{SQUAD_SIZE}</span></div>
            </div>
            <div style={{ width: 1, height: 32, background: COLORS.purpleMid }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: COLORS.gray, letterSpacing: 0.5 }}>MARQUEE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: marqueeCount >= MAX_MARQUEE ? COLORS.danger : COLORS.success, lineHeight: 1.1 }}>{marqueeCount}<span style={{ fontSize: 12, color: COLORS.gray, fontWeight: 400 }}>/{MAX_MARQUEE}</span></div>
            </div>
          </div>

          <div style={{ display: "flex", width: "100%", maxWidth: 900, marginTop: 64, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            {/* Sidebar */}
            <div style={{ width: 240, background: COLORS.purpleDark, borderRight: `1px solid ${COLORS.purpleMid}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${COLORS.purpleMid}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold, letterSpacing: 1 }}>YOUR SQUAD</div>
                <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{squad.length} of {SQUAD_SIZE} selected</div>
              </div>
              <div style={{ overflowY: "auto", flex: 1, padding: "8px 10px 16px" }}>
                {squad.length === 0 && (
                  <div style={{ textAlign: "center", color: COLORS.gray, fontSize: 12, padding: "24px 8px", lineHeight: 1.6, opacity: 0.7 }}>Add players from the list to build your squad</div>
                )}
                {Object.entries({ BAT: [], BOWL: [], AR: [], WK: [] }).map(([role]) => {
                  const rPlayers = squad.filter(p => p.role === role);
                  if (rPlayers.length === 0) return null;
                  return (
                    <div key={role} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: ROLE_COLORS[role], letterSpacing: 1.5, marginBottom: 4, paddingLeft: 4 }}>{ROLE_LABELS[role].toUpperCase()}S</div>
                      {rPlayers.map(p => (
                        <div key={p.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "7px 8px", borderRadius: 7, marginBottom: 3,
                          background: COLORS.purpleMid,
                          border: `1px solid ${p.is_marquee ? COLORS.gold + "40" : "transparent"}`,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: COLORS.gold }}>${p.price}</div>
                          </div>
                          <button onClick={() => removePlayer(p.id)} style={{
                            background: COLORS.danger + "20", color: COLORS.danger,
                            border: `1px solid ${COLORS.danger}40`, borderRadius: 5,
                            padding: "2px 7px", cursor: "pointer", fontSize: 13, lineHeight: 1, flexShrink: 0, marginLeft: 6,
                          }}>×</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "10px 12px", borderTop: `1px solid ${COLORS.purpleMid}` }}>
                <button onClick={() => setShowPicker(false)} style={{
                  width: "100%", padding: "10px", borderRadius: 8,
                  background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                  color: COLORS.purpleDark, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                }}>Done</button>
              </div>
            </div>

            {/* Player list */}
            <div style={{ flex: 1, background: COLORS.purpleDark, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${COLORS.purpleMid}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Add Players</span>
                  <button onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", color: COLORS.gray, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{
                  width: "100%", background: COLORS.purpleMid, border: `1px solid ${COLORS.purpleLight}40`,
                  color: COLORS.white, borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none", marginBottom: 10,
                }} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["ALL", "BAT", "BOWL", "AR", "WK"].map(r => (
                    <button key={r} onClick={() => setFilterRole(r)} style={{
                      padding: "5px 11px", borderRadius: 6,
                      border: `1px solid ${filterRole === r ? COLORS.gold : COLORS.purpleMid}`,
                      background: filterRole === r ? COLORS.gold + "20" : "transparent",
                      color: filterRole === r ? COLORS.gold : COLORS.gray,
                      cursor: "pointer", fontSize: 12, fontWeight: 500,
                    }}>{r === "ALL" ? "All" : ROLE_LABELS[r]}</button>
                  ))}
                </div>
              </div>
              <div style={{ overflowY: "auto", padding: "6px 12px 20px" }}>
                {pickerList.map(p => {
                  const inSquad = !!squad.find(x => x.id === p.id);
                  const addable = canAdd(p);
                  return (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                      borderRadius: 8, marginBottom: 4,
                      opacity: !inSquad && !addable ? 0.35 : 1,
                      background: inSquad ? COLORS.success + "12" : "transparent",
                      border: `1px solid ${inSquad ? COLORS.success + "40" : "transparent"}`,
                      transition: "opacity 0.15s",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.white, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {p.name}
                          {p.is_marquee && (
                            <span style={{ background: COLORS.gold + "25", color: COLORS.gold, border: `1px solid ${COLORS.gold}50`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>MARQUEE</span>
                          )}
                        </div>
                        <div style={{ marginTop: 3 }}><RoleBadge role={p.role} /></div>
                      </div>
                      <div style={{ textAlign: "right", marginRight: 4, flexShrink: 0 }}>
                        <div style={{ fontSize: 13, color: COLORS.gold, fontWeight: 600 }}>${p.price}</div>
                        <div style={{ fontSize: 11, color: COLORS.gray }}>{p.pts > 0 ? `${p.pts} pts` : "New"}</div>
                      </div>
                      {inSquad ? (
                        <button onClick={() => removePlayer(p.id)} style={{
                          padding: "6px 12px", borderRadius: 6, flexShrink: 0,
                          border: `1px solid ${COLORS.danger}50`,
                          background: COLORS.danger + "20", color: COLORS.danger,
                          cursor: "pointer", fontSize: 12, fontWeight: 600,
                        }}>Remove</button>
                      ) : (
                        <button onClick={() => addable && setSquad(s => [...s, p])} disabled={!addable} style={{
                          padding: "6px 12px", borderRadius: 6, flexShrink: 0,
                          border: `1px solid ${addable ? COLORS.gold + "55" : COLORS.purpleMid}`,
                          background: addable ? COLORS.gold + "20" : "transparent",
                          color: addable ? COLORS.gold : COLORS.gray,
                          cursor: addable ? "pointer" : "default", fontSize: 12, fontWeight: 600,
                        }}>Add</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLAYERS PAGE ──────────────────────────────────────────────────────────────

function PlayersPage({ players }) {
  const [sort, setSort] = useState("price");
  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => players
    .filter(p =>
      (filterRole === "ALL" || p.role === filterRole) &&
      (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => b[sort] - a[sort]),
    [players, sort, filterRole, search]
  );

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Player Database" sub={`${players.length} players · Season 2025–26`} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{
          background: COLORS.purpleMid, border: `1px solid ${COLORS.purpleLight}40`,
          color: COLORS.white, borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none", minWidth: 180,
        }} />
        {["ALL", "BAT", "BOWL", "AR", "WK"].map(r => (
          <button key={r} onClick={() => setFilterRole(r)} style={{
            padding: "7px 13px", borderRadius: 7,
            border: `1px solid ${filterRole === r ? COLORS.gold : COLORS.purpleMid}`,
            background: filterRole === r ? COLORS.gold + "20" : "transparent",
            color: filterRole === r ? COLORS.gold : COLORS.gray,
            cursor: "pointer", fontSize: 12, fontWeight: 500,
          }}>{r === "ALL" ? "All Roles" : ROLE_LABELS[r]}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[["price","Price"],["pts","Points"],["mp","Matches"]].map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} style={{
              padding: "7px 12px", borderRadius: 7,
              border: `1px solid ${sort === k ? COLORS.gold : COLORS.purpleMid}`,
              background: sort === k ? COLORS.gold + "20" : "transparent",
              color: sort === k ? COLORS.gold : COLORS.gray,
              cursor: "pointer", fontSize: 12, fontWeight: 500,
            }}>Sort: {l}</button>
          ))}
        </div>
      </div>
      <div style={{ background: COLORS.purpleMid, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.gold}18` }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 80px 100px 60px",
          padding: "10px 16px", borderBottom: `1px solid ${COLORS.purpleDark}`,
          fontSize: 11, color: COLORS.gray, fontWeight: 600, letterSpacing: 0.8,
        }}>
          <span>PLAYER</span><span>PRICE</span><span>SEASON PTS</span><span>MP</span>
        </div>
        {filtered.map((p, i) => (
          <div key={p.id} style={{
            display: "grid", gridTemplateColumns: "1fr 80px 100px 60px",
            padding: "11px 16px",
            borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.purpleDark}` : "none",
            alignItems: "center", transition: "background 0.12s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = COLORS.purpleDark + "90"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.white, display: "flex", alignItems: "center", gap: 6 }}>
                {p.name}
                {p.is_marquee && (
                  <span style={{ background: COLORS.gold + "25", color: COLORS.gold, border: `1px solid ${COLORS.gold}50`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>MARQUEE</span>
                )}
              </div>
              <div style={{ marginTop: 3 }}><RoleBadge role={p.role} /></div>
            </div>
            <span style={{ fontSize: 14, color: COLORS.gold, fontWeight: 600 }}>${p.price}</span>
            <span style={{ fontSize: 14, color: COLORS.goldLight, fontWeight: 500 }}>{p.pts > 0 ? p.pts : "—"}</span>
            <span style={{ fontSize: 13, color: COLORS.gray }}>{p.mp > 0 ? p.mp : "—"}</span>
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
        .select("id, team_name, username, total_pts")
        .order("total_pts", { ascending: false })
        .limit(20);
      if (data) setEntries(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Leaderboard" sub="Season 2025–26" />

      {loading ? <Spinner label="Loading leaderboard..." /> : entries.length === 0 ? (
        <div style={{ textAlign: "center", color: COLORS.gray, padding: "60px 0", fontSize: 14 }}>
          No entries yet — season starts soon!
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            {entries.slice(0, 3).map((p, i) => (
              <div key={p.id} style={{
                background: i === 0 ? COLORS.gold + "18" : COLORS.purpleMid,
                borderRadius: 14, padding: "20px 16px",
                border: `1px solid ${i === 0 ? COLORS.gold + "55" : "transparent"}`,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{medals[i]}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.white }}>{p.team_name || p.username}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: i === 0 ? COLORS.gold : COLORS.goldLight, marginTop: 10 }}>{p.total_pts}</div>
                <div style={{ fontSize: 11, color: COLORS.gray }}>total points</div>
              </div>
            ))}
          </div>

          <div style={{ background: COLORS.purpleMid, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.gold}18` }}>
            <div style={{
              display: "grid", gridTemplateColumns: "44px 1fr 100px",
              padding: "10px 16px", borderBottom: `1px solid ${COLORS.purpleDark}`,
              fontSize: 11, color: COLORS.gray, fontWeight: 600, letterSpacing: 0.8,
            }}>
              <span>#</span><span>TEAM</span><span>TOTAL PTS</span>
            </div>
            {entries.map((p, i) => (
              <div key={p.id} style={{
                display: "grid", gridTemplateColumns: "44px 1fr 100px",
                padding: "12px 16px",
                borderBottom: i < entries.length - 1 ? `1px solid ${COLORS.purpleDark}` : "none",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? COLORS.gold : COLORS.gray }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.white }}>{p.team_name || "Unnamed Team"}</div>
                  <div style={{ fontSize: 12, color: COLORS.gray }}>{p.username}</div>
                </div>
                <span style={{ fontSize: 15, color: COLORS.gold, fontWeight: 700 }}>{p.total_pts}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── HOW TO PLAY PAGE ──────────────────────────────────────────────────────────

function HowToPlayPage() {
  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="How to Play" sub="Everything you need to know about OCC Fantasy" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {RULES.map((r, i) => (
          <div key={i} style={{
            background: COLORS.purpleMid, borderRadius: 12, padding: "16px 18px",
            border: `1px solid ${COLORS.gold}18`, display: "flex", gap: 12,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: COLORS.gold + "28",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: COLORS.gold,
            }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.gold, marginBottom: 3 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: COLORS.gray, lineHeight: 1.6 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: COLORS.purpleMid, borderRadius: 14, padding: "22px", border: `1px solid ${COLORS.gold}28` }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.gold, marginBottom: 16 }}>Scoring System</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {SCORING.map((s, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px",
              background: i % 2 === 0 ? COLORS.purpleDark + "80" : "transparent",
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 13, color: COLORS.gray }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.goldLight }}>{s.value}</span>
            </div>
          ))}
        </div>
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
    // Check for existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadAppData(session.user.id);
      else setLoading(false);
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadAppData(session.user.id);
      else { setPlayers([]); setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAppData = async (userId) => {
    setLoading(true);
    const [{ data: playerData }, { data: profileData }] = await Promise.all([
      supabase.from("players").select("*").order("price", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", userId).single(),
    ]);
    if (playerData) setPlayers(playerData);
    if (profileData) setProfile(profileData);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#241650" }}>
        <style>{globalStyles}</style>
        <Spinner label="Loading OCC Fantasy..." />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <style>{globalStyles}</style>
        <AuthPage onAuth={() => {}} />
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#241650" }}>
      <style>{globalStyles}</style>
      <Nav page={page} setPage={setPage} user={session.user} profile={profile} onLogout={handleLogout} />
      {page === "squad" && <SquadPage players={players} />}
      {page === "players" && <PlayersPage players={players} />}
      {page === "leaderboard" && <LeaderboardPage />}
      {page === "howtoplay" && <HowToPlayPage />}
    </div>
  );
}