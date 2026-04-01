import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const ADMIN_ID = "b41a3909-5ebe-430a-bce2-9bcefeed1af2";
const ACTIVE_GW = 1;

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

// ─── POINTS CALCULATOR ─────────────────────────────────────────────────────────

function calcPoints(s) {
  let pts = 0;
  // Batting
  pts += (s.runs || 0);
  pts += (s.fours || 0) * 4;
  pts += (s.sixes || 0) * 6;
  if ((s.runs || 0) >= 100) pts += 35;
  else if ((s.runs || 0) >= 50) pts += 20;
  if (s.was_dismissed && (s.runs || 0) === 0 && s.did_bat) pts -= 5;
  // Bowling
  pts += (s.wickets || 0) * 10;
  if (s.five_fer) pts += 35;
  else if (s.three_fer) pts += 20;
  // Fielding
  pts += (s.catches || 0) * 15;
  pts += (s.run_outs || 0) * 15;
  pts += (s.stumpings || 0) * 15;
  // Penalties
  pts -= (s.no_balls || 0);
  pts -= Math.floor((s.wides || 0) / 3);
  return Math.max(pts, 0);
}

// ─── SHARED COMPONENTS ─────────────────────────────────────────────────────────

function Spinner({ label = "Loading..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${COLORS.purpleMid}`, borderTop: `3px solid ${COLORS.gold}`, animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 13, color: COLORS.gray }}>{label}</div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 6, fontWeight: 500 }}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width: "100%", background: COLORS.purpleMid, border: `1px solid ${error ? COLORS.danger : COLORS.purpleLight}40`, color: COLORS.white, borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none" }} />
      {error && <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role];
  return <span style={{ background: c + "25", color: c, border: `1px solid ${c}50`, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>{ROLE_LABELS[role]}</span>;
}

function StatPill({ label, value, accent }) {
  return (
    <div style={{ background: COLORS.purpleMid, borderRadius: 10, padding: "12px 16px", border: `1px solid ${(accent || COLORS.gold)}28`, textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || COLORS.gold }}>{value}</div>
      <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Header({ title, sub }) {
  return (
    <div style={{ padding: "36px 32px 20px", background: `linear-gradient(180deg, ${COLORS.purpleDark} 0%, transparent 100%)` }}>
      <div style={{ fontSize: 10, color: COLORS.gold, letterSpacing: 3, fontWeight: 600, marginBottom: 6 }}>OAKLEIGH CRICKET CLUB</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: COLORS.white, lineHeight: 1.15 }}>{title}</h1>
      {sub && <p style={{ color: COLORS.gray, marginTop: 6, fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────

function AuthPage() {
  const [mode, setMode] = useState("login");
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: "#241650" }}>
      <div style={{ animation: "fadeIn 0.4s ease", width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>🏏</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: COLORS.gold }}>OCC Fantasy</div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4, letterSpacing: 1 }}>OAKLEIGH CRICKET CLUB</div>
        </div>
        <div style={{ display: "flex", background: COLORS.purpleDark, borderRadius: 10, padding: 4, marginBottom: 24, border: `1px solid ${COLORS.purpleMid}` }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "9px", borderRadius: 7, border: "none", cursor: "pointer", background: mode === m ? COLORS.purpleMid : "transparent", color: mode === m ? COLORS.white : COLORS.gray, fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>{m === "login" ? "Log in" : "Sign up"}</button>
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
    <div style={{ background: COLORS.purpleDark, borderRadius: 14, padding: "24px", border: `1px solid ${COLORS.purpleMid}` }}>
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
      {error && <div style={{ fontSize: 12, color: COLORS.danger, marginBottom: 14, padding: "8px 12px", background: COLORS.danger + "15", borderRadius: 6 }}>{error}</div>}
      <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: loading ? COLORS.purpleMid : `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, color: loading ? COLORS.gray : COLORS.purpleDark, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>
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
    <div style={{ background: COLORS.purpleDark, borderRadius: 14, padding: "24px", border: `1px solid ${COLORS.purpleMid}` }}>
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      <Input label="Team name (optional)" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Howes XI" />
      <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
      <Input label="Confirm password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" />
      {error && <div style={{ fontSize: 12, color: COLORS.danger, marginBottom: 14, padding: "8px 12px", background: COLORS.danger + "15", borderRadius: 6 }}>{error}</div>}
      <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: loading ? COLORS.purpleMid : `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, color: loading ? COLORS.gray : COLORS.purpleDark, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>
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
    <nav style={{ background: COLORS.purpleDark, borderBottom: `2px solid ${COLORS.gold}35`, position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", padding: "0 24px", boxShadow: "0 4px 20px #0005" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 32, padding: "12px 0" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏏</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.gold, lineHeight: 1.1 }}>OCC Fantasy</div>
          <div style={{ fontSize: 10, color: COLORS.gray, letterSpacing: 1 }}>OAKLEIGH CC</div>
        </div>
      </div>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "18px 15px", fontSize: 13, fontWeight: 500, color: page === t.id ? COLORS.gold : t.id === "admin" ? COLORS.goldLight : COLORS.gray, borderBottom: page === t.id ? `2px solid ${COLORS.gold}` : "2px solid transparent", marginBottom: -2, transition: "color 0.15s" }}>{t.label}</button>
      ))}
      <div style={{ marginLeft: "auto", position: "relative" }}>
        <button onClick={() => setShowMenu(m => !m)} style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.purpleMid, border: `1px solid ${COLORS.purpleLight}40`, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: COLORS.gold + "30", border: `1px solid ${COLORS.gold}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: COLORS.gold }}>
            {(profile?.team_name || user?.email || "?")[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 12, color: COLORS.white, fontWeight: 500, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.team_name || user?.email}</span>
          <span style={{ fontSize: 10, color: COLORS.gray }}>▾</span>
        </button>
        {showMenu && (
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: COLORS.purpleDark, border: `1px solid ${COLORS.purpleMid}`, borderRadius: 10, padding: "8px", minWidth: 160, boxShadow: "0 8px 24px #0006", zIndex: 300 }}>
            <div style={{ padding: "6px 10px", fontSize: 11, color: COLORS.gray, borderBottom: `1px solid ${COLORS.purpleMid}`, marginBottom: 6 }}>{user?.email}</div>
            <button onClick={() => { setShowMenu(false); onLogout(); }} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "none", background: "transparent", color: COLORS.danger, cursor: "pointer", fontSize: 13, fontWeight: 500, textAlign: "left" }}>Log out</button>
          </div>
        )}
      </div>
    </nav>
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

  const filtered = players.filter(p => search === "" || p.name.toLowerCase().includes(search.toLowerCase()));

  // Load existing scores for selected gameweek
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("gameweek_scores").select("*").eq("gameweek_id", gw);
      if (data) {
        const map = {};
        data.forEach(r => { map[r.player_id] = r; });
        setExistingScores(map);
        setScores({});
      }
    };
    load();
  }, [gw]);

  const getVal = (playerId, field) => {
    if (scores[playerId]?.[field] !== undefined) return scores[playerId][field];
    if (existingScores[playerId]?.[field] !== undefined) return existingScores[playerId][field];
    return field.startsWith("did_") || field.startsWith("was_") || field.startsWith("five_") || field.startsWith("three_") ? false : 0;
  };

  const setVal = (playerId, field, value) => {
    setScores(s => ({ ...s, [playerId]: { ...(s[playerId] || {}), [field]: value } }));
  };

  const preview = (playerId) => {
    const s = {
      runs: getVal(playerId, "runs"),
      fours: getVal(playerId, "fours"),
      sixes: getVal(playerId, "sixes"),
      wickets: getVal(playerId, "wickets"),
      catches: getVal(playerId, "catches"),
      run_outs: getVal(playerId, "run_outs"),
      stumpings: getVal(playerId, "stumpings"),
      no_balls: getVal(playerId, "no_balls"),
      wides: getVal(playerId, "wides"),
      did_bat: getVal(playerId, "did_bat"),
      was_dismissed: getVal(playerId, "was_dismissed"),
      five_fer: getVal(playerId, "five_fer"),
      three_fer: getVal(playerId, "three_fer"),
    };
    return calcPoints(s);
  };

  const saveScores = async () => {
    setSaving(true); setMsg("");
    const rows = players.map(p => ({
      player_id: p.id,
      gameweek_id: gw,
      runs: getVal(p.id, "runs"),
      fours: getVal(p.id, "fours"),
      sixes: getVal(p.id, "sixes"),
      wickets: getVal(p.id, "wickets"),
      catches: getVal(p.id, "catches"),
      run_outs: getVal(p.id, "run_outs"),
      stumpings: getVal(p.id, "stumpings"),
      no_balls: getVal(p.id, "no_balls"),
      wides: getVal(p.id, "wides"),
      did_bat: getVal(p.id, "did_bat"),
      was_dismissed: getVal(p.id, "was_dismissed"),
      five_fer: getVal(p.id, "five_fer"),
      three_fer: getVal(p.id, "three_fer"),
      calculated_pts: calcPoints({
        runs: getVal(p.id, "runs"), fours: getVal(p.id, "fours"), sixes: getVal(p.id, "sixes"),
        wickets: getVal(p.id, "wickets"), catches: getVal(p.id, "catches"), run_outs: getVal(p.id, "run_outs"),
        stumpings: getVal(p.id, "stumpings"), no_balls: getVal(p.id, "no_balls"), wides: getVal(p.id, "wides"),
        did_bat: getVal(p.id, "did_bat"), was_dismissed: getVal(p.id, "was_dismissed"),
        five_fer: getVal(p.id, "five_fer"), three_fer: getVal(p.id, "three_fer"),
      }),
    }));

    // Upsert — update if exists, insert if not
    const { error } = await supabase.from("gameweek_scores").upsert(rows, { onConflict: "player_id,gameweek_id" });
    if (error) {
      setMsg("Error saving scores: " + error.message); setMsgType("danger");
    } else {
      setMsg("Scores saved. Now click Calculate Points to update the leaderboard."); setMsgType("success");
      const map = {};
      rows.forEach(r => { map[r.player_id] = r; });
      setExistingScores(map);
      setScores({});
    }
    setSaving(false);
  };

  const calculatePoints = async () => {
    setCalculating(true); setMsg("");

    // Get all squads for this gameweek
    const { data: squadData } = await supabase.from("squads").select("user_id, player_id, is_captain, is_vice_captain").eq("gameweek_id", gw);
    if (!squadData || squadData.length === 0) {
      setMsg("No squads found for this gameweek."); setMsgType("danger");
      setCalculating(false); return;
    }

    // Get all scores for this gameweek
    const { data: scoreData } = await supabase.from("gameweek_scores").select("player_id, calculated_pts").eq("gameweek_id", gw);
    const scoreMap = {};
    if (scoreData) scoreData.forEach(s => { scoreMap[s.player_id] = s.calculated_pts || 0; });

    // Group squad entries by user
    const userSquads = {};
    squadData.forEach(row => {
      if (!userSquads[row.user_id]) userSquads[row.user_id] = [];
      userSquads[row.user_id].push(row);
    });

    // Calculate total points per user
    const pointsRows = Object.entries(userSquads).map(([userId, squad]) => {
      let total = 0;
      squad.forEach(entry => {
        let pts = scoreMap[entry.player_id] || 0;
        if (entry.is_captain) pts = pts * 2;
        else if (entry.is_vice_captain) pts = pts * 1.5;
        total += pts;
      });
      return { user_id: userId, gameweek_id: gw, raw_pts: total, total_pts: total };
    });

    // Upsert fantasy points
    const { error: fpError } = await supabase.from("fantasy_points").upsert(pointsRows, { onConflict: "user_id,gameweek_id" });
    if (fpError) {
      setMsg("Error calculating points: " + fpError.message); setMsgType("danger");
      setCalculating(false); return;
    }

    // Update total_pts on profiles — sum across all gameweeks
    for (const { user_id } of pointsRows) {
      const { data: allPts } = await supabase.from("fantasy_points").select("total_pts").eq("user_id", user_id);
      const grand = allPts ? allPts.reduce((s, r) => s + (r.total_pts || 0), 0) : 0;
      await supabase.from("profiles").update({ total_pts: grand }).eq("id", user_id);
    }

    setMsg(`Points calculated for ${pointsRows.length} managers. Leaderboard updated!`); setMsgType("success");
    setCalculating(false);
  };

  const numField = (playerId, field, label, width = 64) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{ fontSize: 9, color: COLORS.gray, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <input
        type="number" min="0"
        value={getVal(playerId, field)}
        onChange={e => setVal(playerId, field, parseInt(e.target.value) || 0)}
        style={{ width, background: COLORS.purpleDark, border: `1px solid ${COLORS.purpleLight}40`, color: COLORS.white, borderRadius: 6, padding: "5px 8px", fontSize: 13, outline: "none", textAlign: "center" }}
      />
    </div>
  );

  const boolField = (playerId, field, label) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{ fontSize: 9, color: COLORS.gray, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <button
        onClick={() => setVal(playerId, field, !getVal(playerId, field))}
        style={{ width: 40, height: 28, borderRadius: 6, border: `1px solid ${getVal(playerId, field) ? COLORS.success : COLORS.purpleLight}40`, background: getVal(playerId, field) ? COLORS.success + "30" : COLORS.purpleDark, color: getVal(playerId, field) ? COLORS.success : COLORS.gray, fontSize: 12, cursor: "pointer", fontWeight: 700 }}
      >{getVal(playerId, field) ? "Y" : "N"}</button>
    </div>
  );

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Admin Panel" sub="Enter match scores · Calculate gameweek points" />

      {/* Gameweek selector + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: COLORS.gray }}>Gameweek</span>
          <input type="number" min="1" value={gw} onChange={e => setGw(parseInt(e.target.value) || 1)} style={{ width: 64, background: COLORS.purpleMid, border: `1px solid ${COLORS.purpleLight}40`, color: COLORS.white, borderRadius: 8, padding: "7px 10px", fontSize: 14, outline: "none", textAlign: "center" }} />
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ background: COLORS.purpleMid, border: `1px solid ${COLORS.purpleLight}40`, color: COLORS.white, borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none", minWidth: 180 }} />
        <button onClick={saveScores} disabled={saving} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: saving ? COLORS.purpleMid : COLORS.gold, color: COLORS.purpleDark, fontWeight: 700, fontSize: 13, cursor: saving ? "default" : "pointer" }}>{saving ? "Saving..." : "Save Scores"}</button>
        <button onClick={calculatePoints} disabled={calculating} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: calculating ? COLORS.purpleMid : COLORS.success, color: COLORS.white, fontWeight: 700, fontSize: 13, cursor: calculating ? "default" : "pointer" }}>{calculating ? "Calculating..." : "Calculate Points"}</button>
      </div>

      {msg && (
        <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8, fontSize: 13, background: COLORS[msgType] + "20", color: COLORS[msgType], border: `1px solid ${COLORS[msgType]}40` }}>{msg}</div>
      )}

      {/* Score entry guide */}
      <div style={{ background: COLORS.purpleMid, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: COLORS.gray, lineHeight: 1.8 }}>
        <span style={{ color: COLORS.gold, fontWeight: 600 }}>How to use: </span>
        Enter each player's stats from PlayCricket. Tick <span style={{ color: COLORS.success }}>Did Bat</span> if they batted, <span style={{ color: COLORS.success }}>Out</span> if dismissed, <span style={{ color: COLORS.gold }}>3W</span> / <span style={{ color: COLORS.gold }}>5W</span> for hauls. Hit <span style={{ color: COLORS.gold, fontWeight: 600 }}>Save Scores</span> first, then <span style={{ color: COLORS.success, fontWeight: 600 }}>Calculate Points</span> to update the leaderboard.
      </div>

      {/* Player score rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background: COLORS.purpleMid, borderRadius: 10, padding: "12px 16px", border: `1px solid ${existingScores[p.id] ? COLORS.success + "30" : "transparent"}` }}>
            {/* Player name row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.white }}>{p.name}</div>
                <div style={{ marginTop: 2 }}><RoleBadge role={p.role} /></div>
              </div>
              <div style={{ background: COLORS.gold + "20", border: `1px solid ${COLORS.gold}40`, borderRadius: 8, padding: "4px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: COLORS.gray }}>PREVIEW</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.gold }}>{preview(p.id)} pts</div>
              </div>
              {existingScores[p.id] && <div style={{ fontSize: 10, color: COLORS.success, fontWeight: 600 }}>SAVED</div>}
            </div>

            {/* Batting stats */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: COLORS.purpleLight, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>BATTING</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                {numField(p.id, "runs", "Runs", 72)}
                {numField(p.id, "fours", "4s", 56)}
                {numField(p.id, "sixes", "6s", 56)}
                {boolField(p.id, "did_bat", "Batted")}
                {boolField(p.id, "was_dismissed", "Out")}
              </div>
            </div>

            {/* Bowling stats */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: COLORS.goldLight, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>BOWLING</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                {numField(p.id, "wickets", "Wkts", 64)}
                {numField(p.id, "no_balls", "NB", 56)}
                {numField(p.id, "wides", "Wides", 64)}
                {boolField(p.id, "three_fer", "3W")}
                {boolField(p.id, "five_fer", "5W")}
              </div>
            </div>

            {/* Fielding stats */}
            <div>
              <div style={{ fontSize: 10, color: COLORS.success, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>FIELDING</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                {numField(p.id, "catches", "Catches", 72)}
                {numField(p.id, "run_outs", "Run Outs", 72)}
                {numField(p.id, "stumpings", "Stmpgs", 72)}
              </div>
            </div>
          </div>
        ))}
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

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("squads").select("player_id, is_captain, is_vice_captain").eq("user_id", userId).eq("gameweek_id", ACTIVE_GW);
      if (data && data.length > 0) {
        const saved = players.filter(p => data.map(r => r.player_id).includes(p.id));
        setSquad(saved);
        const cap = data.find(r => r.is_captain);
        const vc = data.find(r => r.is_vice_captain);
        if (cap) setCaptain(cap.player_id);
        if (vc) setViceCaptain(vc.player_id);
      }
      setLoadingSquad(false);
    };
    if (players.length > 0) load();
  }, [players, userId]);

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

  const saveSquad = async () => {
    if (squad.length !== SQUAD_SIZE) { setSaveMsg(`You need ${SQUAD_SIZE} players. Currently have ${squad.length}.`); return; }
    if (!captain) { setSaveMsg("Please pick a captain before saving."); return; }
    if (!viceCaptain) { setSaveMsg("Please pick a vice captain before saving."); return; }
    setSaving(true); setSaveMsg("");
    await supabase.from("squads").delete().eq("user_id", userId).eq("gameweek_id", ACTIVE_GW);
    const rows = squad.map(p => ({ user_id: userId, player_id: p.id, gameweek_id: ACTIVE_GW, is_captain: p.id === captain, is_vice_captain: p.id === viceCaptain }));
    const { error } = await supabase.from("squads").insert(rows);
    setSaveMsg(error ? "Something went wrong. Try again." : "Squad saved successfully!");
    setSaving(false);
  };

  const pickerList = players.filter(p => (filterRole === "ALL" || p.role === filterRole) && (search === "" || p.name.toLowerCase().includes(search.toLowerCase())));
  const grouped = { BAT: [], BOWL: [], AR: [], WK: [] };
  squad.forEach(p => grouped[p.role].push(p));

  if (loadingSquad) return <Spinner label="Loading your squad..." />;

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="My Squad" sub={`Gameweek ${ACTIVE_GW} · Deadline: Friday 11:59 PM`} />
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
            <span style={{ fontSize: 10, color: ROLE_COLORS[role], fontWeight: 700, letterSpacing: 2 }}>{ROLE_LABELS[role].toUpperCase()}S · {players.length}/{ROLE_LIMITS[role]}</span>
            <div style={{ height: 1, flex: 1, background: COLORS.purpleMid }} />
          </div>
          {players.length === 0 && <div style={{ textAlign: "center", color: COLORS.gray, fontSize: 13, padding: "10px 0", opacity: 0.5 }}>No {ROLE_LABELS[role].toLowerCase()}s added yet</div>}
          {players.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: COLORS.purpleMid, borderRadius: 10, marginBottom: 6, border: captain === p.id ? `1px solid ${COLORS.gold}` : viceCaptain === p.id ? `1px solid ${COLORS.goldLight}60` : "1px solid transparent", transition: "border-color 0.15s" }}>
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
              <button onClick={() => toggleCaptain(p.id)} style={{ background: captain === p.id ? COLORS.gold : "transparent", color: captain === p.id ? COLORS.purpleDark : COLORS.gray, border: `1px solid ${COLORS.gold}50`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>C</button>
              <button onClick={() => toggleVC(p.id)} style={{ background: viceCaptain === p.id ? COLORS.goldLight + "30" : "transparent", color: viceCaptain === p.id ? COLORS.gold : COLORS.gray, border: `1px solid ${COLORS.gold}30`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>VC</button>
              <button onClick={() => removePlayer(p.id)} style={{ background: COLORS.danger + "20", color: COLORS.danger, border: `1px solid ${COLORS.danger}40`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      ))}

      <button onClick={() => setShowPicker(true)} style={{ display: "block", width: "100%", marginTop: 14, padding: "14px", background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, color: COLORS.purpleDark, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+ Add Players</button>
      <button onClick={saveSquad} disabled={saving} style={{ display: "block", width: "100%", marginTop: 10, padding: "14px", background: saving ? COLORS.purpleMid : COLORS.success + "DD", color: COLORS.white, border: "none", borderRadius: 10, cursor: saving ? "default" : "pointer", fontSize: 14, fontWeight: 700 }}>{saving ? "Saving..." : "Save Squad"}</button>
      {saveMsg && <div style={{ marginTop: 10, padding: "10px 16px", borderRadius: 8, fontSize: 13, background: saveMsg.includes("successfully") ? COLORS.success + "20" : COLORS.danger + "20", color: saveMsg.includes("successfully") ? COLORS.success : COLORS.danger, border: `1px solid ${saveMsg.includes("successfully") ? COLORS.success : COLORS.danger}40` }}>{saveMsg}</div>}

      {showPicker && (
        <div style={{ position: "fixed", inset: 0, background: "#000A", zIndex: 200, display: "flex", alignItems: "stretch", justifyContent: "center" }} onClick={() => setShowPicker(false)}>
          <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: COLORS.purpleDark, border: `1px solid ${COLORS.gold}50`, borderRadius: 40, padding: "8px 20px", display: "flex", alignItems: "center", gap: 18, zIndex: 210, boxShadow: "0 4px 24px #0008" }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: COLORS.gray }}>BUDGET LEFT</div><div style={{ fontSize: 18, fontWeight: 700, color: remaining < 80 ? COLORS.danger : COLORS.gold }}>${remaining}</div></div>
            <div style={{ width: 1, height: 32, background: COLORS.purpleMid }} />
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: COLORS.gray }}>PLAYERS</div><div style={{ fontSize: 18, fontWeight: 700, color: COLORS.white }}>{squad.length}<span style={{ fontSize: 12, color: COLORS.gray }}>/{SQUAD_SIZE}</span></div></div>
            <div style={{ width: 1, height: 32, background: COLORS.purpleMid }} />
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: COLORS.gray }}>MARQUEE</div><div style={{ fontSize: 18, fontWeight: 700, color: marqueeCount >= MAX_MARQUEE ? COLORS.danger : COLORS.success }}>{marqueeCount}<span style={{ fontSize: 12, color: COLORS.gray }}>/{MAX_MARQUEE}</span></div></div>
          </div>

          <div style={{ display: "flex", width: "100%", maxWidth: 900, marginTop: 64, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 240, background: COLORS.purpleDark, borderRight: `1px solid ${COLORS.purpleMid}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${COLORS.purpleMid}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold, letterSpacing: 1 }}>YOUR SQUAD</div>
                <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{squad.length} of {SQUAD_SIZE} selected</div>
              </div>
              <div style={{ overflowY: "auto", flex: 1, padding: "8px 10px 16px" }}>
                {squad.length === 0 && <div style={{ textAlign: "center", color: COLORS.gray, fontSize: 12, padding: "24px 8px", lineHeight: 1.6, opacity: 0.7 }}>Add players from the list</div>}
                {Object.entries({ BAT: [], BOWL: [], AR: [], WK: [] }).map(([role]) => {
                  const rp = squad.filter(p => p.role === role);
                  if (rp.length === 0) return null;
                  return (
                    <div key={role} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: ROLE_COLORS[role], letterSpacing: 1.5, marginBottom: 4, paddingLeft: 4 }}>{ROLE_LABELS[role].toUpperCase()}S</div>
                      {rp.map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 8px", borderRadius: 7, marginBottom: 3, background: COLORS.purpleMid, border: `1px solid ${p.is_marquee ? COLORS.gold + "40" : "transparent"}` }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: COLORS.gold }}>${p.price}</div>
                          </div>
                          <button onClick={() => removePlayer(p.id)} style={{ background: COLORS.danger + "20", color: COLORS.danger, border: `1px solid ${COLORS.danger}40`, borderRadius: 5, padding: "2px 7px", cursor: "pointer", fontSize: 13, lineHeight: 1, flexShrink: 0, marginLeft: 6 }}>×</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "10px 12px", borderTop: `1px solid ${COLORS.purpleMid}` }}>
                <button onClick={() => setShowPicker(false)} style={{ width: "100%", padding: "10px", borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, color: COLORS.purpleDark, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Done</button>
              </div>
            </div>

            <div style={{ flex: 1, background: COLORS.purpleDark, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${COLORS.purpleMid}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Add Players</span>
                  <button onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", color: COLORS.gray, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ width: "100%", background: COLORS.purpleMid, border: `1px solid ${COLORS.purpleLight}40`, color: COLORS.white, borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none", marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["ALL", "BAT", "BOWL", "AR", "WK"].map(r => (
                    <button key={r} onClick={() => setFilterRole(r)} style={{ padding: "5px 11px", borderRadius: 6, border: `1px solid ${filterRole === r ? COLORS.gold : COLORS.purpleMid}`, background: filterRole === r ? COLORS.gold + "20" : "transparent", color: filterRole === r ? COLORS.gold : COLORS.gray, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{r === "ALL" ? "All" : ROLE_LABELS[r]}</button>
                  ))}
                </div>
              </div>
              <div style={{ overflowY: "auto", padding: "6px 12px 20px" }}>
                {pickerList.map(p => {
                  const inSquad = !!squad.find(x => x.id === p.id);
                  const addable = canAdd(p);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 4, opacity: !inSquad && !addable ? 0.35 : 1, background: inSquad ? COLORS.success + "12" : "transparent", border: `1px solid ${inSquad ? COLORS.success + "40" : "transparent"}`, transition: "opacity 0.15s" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.white, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {p.name}
                          {p.is_marquee && <span style={{ background: COLORS.gold + "25", color: COLORS.gold, border: `1px solid ${COLORS.gold}50`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>MARQUEE</span>}
                        </div>
                        <div style={{ marginTop: 3 }}><RoleBadge role={p.role} /></div>
                      </div>
                      <div style={{ textAlign: "right", marginRight: 4, flexShrink: 0 }}>
                        <div style={{ fontSize: 13, color: COLORS.gold, fontWeight: 600 }}>${p.price}</div>
                        <div style={{ fontSize: 11, color: COLORS.gray }}>{p.pts > 0 ? `${p.pts} pts` : "New"}</div>
                      </div>
                      {inSquad ? (
                        <button onClick={() => removePlayer(p.id)} style={{ padding: "6px 12px", borderRadius: 6, flexShrink: 0, border: `1px solid ${COLORS.danger}50`, background: COLORS.danger + "20", color: COLORS.danger, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Remove</button>
                      ) : (
                        <button onClick={() => addable && setSquad(s => [...s, p])} disabled={!addable} style={{ padding: "6px 12px", borderRadius: 6, flexShrink: 0, border: `1px solid ${addable ? COLORS.gold + "55" : COLORS.purpleMid}`, background: addable ? COLORS.gold + "20" : "transparent", color: addable ? COLORS.gold : COLORS.gray, cursor: addable ? "pointer" : "default", fontSize: 12, fontWeight: 600 }}>Add</button>
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
  const filtered = useMemo(() => players.filter(p => (filterRole === "ALL" || p.role === filterRole) && (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => b[sort] - a[sort]), [players, sort, filterRole, search]);
  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Player Database" sub={`${players.length} players · Season 2025–26`} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ background: COLORS.purpleMid, border: `1px solid ${COLORS.purpleLight}40`, color: COLORS.white, borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none", minWidth: 180 }} />
        {["ALL", "BAT", "BOWL", "AR", "WK"].map(r => (
          <button key={r} onClick={() => setFilterRole(r)} style={{ padding: "7px 13px", borderRadius: 7, border: `1px solid ${filterRole === r ? COLORS.gold : COLORS.purpleMid}`, background: filterRole === r ? COLORS.gold + "20" : "transparent", color: filterRole === r ? COLORS.gold : COLORS.gray, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{r === "ALL" ? "All Roles" : ROLE_LABELS[r]}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[["price","Price"],["pts","Points"],["mp","Matches"]].map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${sort === k ? COLORS.gold : COLORS.purpleMid}`, background: sort === k ? COLORS.gold + "20" : "transparent", color: sort === k ? COLORS.gold : COLORS.gray, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Sort: {l}</button>
          ))}
        </div>
      </div>
      <div style={{ background: COLORS.purpleMid, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.gold}18` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 60px", padding: "10px 16px", borderBottom: `1px solid ${COLORS.purpleDark}`, fontSize: 11, color: COLORS.gray, fontWeight: 600, letterSpacing: 0.8 }}>
          <span>PLAYER</span><span>PRICE</span><span>SEASON PTS</span><span>MP</span>
        </div>
        {filtered.map((p, i) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 60px", padding: "11px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.purpleDark}` : "none", alignItems: "center", transition: "background 0.12s" }} onMouseEnter={e => e.currentTarget.style.background = COLORS.purpleDark + "90"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.white, display: "flex", alignItems: "center", gap: 6 }}>
                {p.name}
                {p.is_marquee && <span style={{ background: COLORS.gold + "25", color: COLORS.gold, border: `1px solid ${COLORS.gold}50`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>MARQUEE</span>}
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
      const { data } = await supabase.from("profiles").select("id, team_name, username, total_pts").order("total_pts", { ascending: false }).limit(20);
      if (data) setEntries(data);
      setLoading(false);
    };
    fetch();
  }, []);
  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Leaderboard" sub="Season 2025–26" />
      {loading ? <Spinner label="Loading leaderboard..." /> : entries.length === 0 ? (
        <div style={{ textAlign: "center", color: COLORS.gray, padding: "60px 0", fontSize: 14 }}>No entries yet — season starts soon!</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            {entries.slice(0, 3).map((p, i) => (
              <div key={p.id} style={{ background: i === 0 ? COLORS.gold + "18" : COLORS.purpleMid, borderRadius: 14, padding: "20px 16px", border: `1px solid ${i === 0 ? COLORS.gold + "55" : "transparent"}`, textAlign: "center" }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{["🥇","🥈","🥉"][i]}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.white }}>{p.team_name || p.username}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: i === 0 ? COLORS.gold : COLORS.goldLight, marginTop: 10 }}>{p.total_pts}</div>
                <div style={{ fontSize: 11, color: COLORS.gray }}>total points</div>
              </div>
            ))}
          </div>
          <div style={{ background: COLORS.purpleMid, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.gold}18` }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 100px", padding: "10px 16px", borderBottom: `1px solid ${COLORS.purpleDark}`, fontSize: 11, color: COLORS.gray, fontWeight: 600, letterSpacing: 0.8 }}>
              <span>#</span><span>TEAM</span><span>TOTAL PTS</span>
            </div>
            {entries.map((p, i) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "44px 1fr 100px", padding: "12px 16px", borderBottom: i < entries.length - 1 ? `1px solid ${COLORS.purpleDark}` : "none", alignItems: "center" }}>
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

// ─── HOW TO PLAY ───────────────────────────────────────────────────────────────

function HowToPlayPage() {
  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="How to Play" sub="Everything you need to know about OCC Fantasy" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {RULES.map((r, i) => (
          <div key={i} style={{ background: COLORS.purpleMid, borderRadius: 12, padding: "16px 18px", border: `1px solid ${COLORS.gold}18`, display: "flex", gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: COLORS.gold + "28", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: COLORS.gold }}>{i + 1}</div>
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
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: i % 2 === 0 ? COLORS.purpleDark + "80" : "transparent", borderRadius: 6 }}>
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
    setSession(null); setProfile(null); setPlayers([]);
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#241650" }}><style>{globalStyles}</style><Spinner label="Loading OCC Fantasy..." /></div>;
  if (!session) return <><style>{globalStyles}</style><AuthPage /></>;

  return (
    <div style={{ minHeight: "100vh", background: "#241650" }}>
      <style>{globalStyles}</style>
      <Nav page={page} setPage={setPage} user={session.user} profile={profile} onLogout={handleLogout} />
      {page === "squad" && <SquadPage players={players} userId={session.user.id} />}
      {page === "players" && <PlayersPage players={players} />}
      {page === "leaderboard" && <LeaderboardPage />}
      {page === "howtoplay" && <HowToPlayPage />}
      {page === "admin" && session.user.id === ADMIN_ID && <AdminPage players={players} />}
    </div>
  );
}