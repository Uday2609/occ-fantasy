import { useState, useMemo } from "react";

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

const PLAYERS = [
  { id: 1,  name: "Anthony Howes",           role: "AR",   price: 175, pts: 318, mp: 17 },
  { id: 2,  name: "Matt Stamps",             role: "BOWL", price: 175, pts: 304, mp: 17 },
  { id: 3,  name: "Alex Jones",              role: "BOWL", price: 105, pts: 289, mp: 12 },
  { id: 4,  name: "Kamesh Nirmal",           role: "WK",   price: 100, pts: 312, mp: 15 },
  { id: 5,  name: "Zayaan Arbab",            role: "BAT",  price: 85,  pts: 342, mp: 12 },
  { id: 6,  name: "Niyam Shah",              role: "BAT",  price: 75,  pts: 232, mp: 14 },
  { id: 7,  name: "Aayush Pathania",         role: "AR",   price: 105, pts: 271, mp: 15 },
  { id: 8,  name: "Jaegar Sagoo",            role: "BAT",  price: 80,  pts: 287, mp: 18 },
  { id: 9,  name: "Matt Tyson",              role: "BOWL", price: 80,  pts: 278, mp: 18 },
  { id: 10, name: "Kumbu Jayasundera",       role: "BOWL", price: 70,  pts: 261, mp: 15 },
  { id: 11, name: "Ben Perry",               role: "BAT",  price: 70,  pts: 254, mp: 11 },
  { id: 12, name: "Bhanuka Samarakkody",     role: "WK",   price: 70,  pts: 263, mp: 17 },
  { id: 13, name: "Brendan Grace",           role: "BAT",  price: 70,  pts: 249, mp: 16 },
  { id: 14, name: "Nikhil Singh",            role: "BAT",  price: 65,  pts: 228, mp: 11 },
  { id: 15, name: "Archer Johnson",          role: "BAT",  price: 65,  pts: 221, mp: 15 },
  { id: 16, name: "Matt Grace",              role: "BOWL", price: 65,  pts: 243, mp: 16 },
  { id: 17, name: "Matt Farthing",           role: "BAT",  price: 60,  pts: 198, mp: 16 },
  { id: 18, name: "Craig Johnson",           role: "AR",   price: 60,  pts: 211, mp: 14 },
  { id: 19, name: "Sam Briggs",              role: "BOWL", price: 60,  pts: 207, mp: 18 },
  { id: 20, name: "Hemanth Condapatti-Ravi", role: "BAT",  price: 60,  pts: 194, mp: 15 },
  { id: 21, name: "Aiden Boby",              role: "AR",   price: 60,  pts: 0,   mp: 0  },
  { id: 22, name: "Sagar Sareen",            role: "WK",   price: 60,  pts: 187, mp: 13 },
  { id: 23, name: "Manish Kingar",           role: "AR",   price: 60,  pts: 201, mp: 16 },
  { id: 24, name: "Max Getley",              role: "BOWL", price: 60,  pts: 178, mp: 15 },
  { id: 25, name: "Raf Parton",              role: "BAT",  price: 50,  pts: 171, mp: 16 },
  { id: 26, name: "Aksh Sammi",              role: "BAT",  price: 50,  pts: 163, mp: 11 },
  { id: 27, name: "Cameron Chapple",         role: "BAT",  price: 50,  pts: 158, mp: 11 },
  { id: 28, name: "Rithvik Rao",             role: "BAT",  price: 50,  pts: 167, mp: 14 },
  { id: 29, name: "James Benn",              role: "BAT",  price: 50,  pts: 152, mp: 17 },
  { id: 30, name: "Matt Girolami",           role: "WK",   price: 50,  pts: 148, mp: 14 },
  { id: 31, name: "Josh Kerr",               role: "BOWL", price: 45,  pts: 143, mp: 15 },
  { id: 32, name: "Tom Ison",                role: "AR",   price: 45,  pts: 156, mp: 14 },
  { id: 33, name: "Harry Cashman",           role: "AR",   price: 45,  pts: 149, mp: 13 },
  { id: 34, name: "Samuel Duckett",          role: "BOWL", price: 45,  pts: 131, mp: 14 },
  { id: 35, name: "Ryan Chapple",            role: "BAT",  price: 45,  pts: 138, mp: 13 },
  { id: 36, name: "Jack Allan",              role: "BOWL", price: 40,  pts: 122, mp: 10 },
  { id: 37, name: "Uday Joshi",              role: "BAT",  price: 40,  pts: 118, mp: 10 },
  { id: 38, name: "Noah O Neill",            role: "BOWL", price: 40,  pts: 119, mp: 9  },
  { id: 39, name: "Udit Rawal",              role: "BOWL", price: 40,  pts: 124, mp: 11 },
  { id: 40, name: "Ben Salmon",              role: "AR",   price: 40,  pts: 127, mp: 8  },
  { id: 41, name: "Geoff Latham",            role: "AR",   price: 30,  pts: 109, mp: 16 },
  { id: 42, name: "Thomas Miles",            role: "AR",   price: 30,  pts: 98,  mp: 9  },
  { id: 43, name: "Brodie Grace",            role: "BOWL", price: 30,  pts: 94,  mp: 15 },
  { id: 44, name: "Michael Splatt",          role: "BOWL", price: 30,  pts: 0,   mp: 0  },
  { id: 45, name: "James Duckett",           role: "AR",   price: 35,  pts: 101, mp: 4  },
  { id: 46, name: "Inderjot Singh",          role: "BAT",  price: 35,  pts: 112, mp: 13 },
  { id: 47, name: "Kanan Budhiraja",         role: "BOWL", price: 35,  pts: 107, mp: 8  },
  { id: 48, name: "Nema Dimdung",            role: "BAT",  price: 35,  pts: 0,   mp: 0  },
  { id: 49, name: "Zach Van Der Nest",       role: "BOWL", price: 30,  pts: 91,  mp: 12 },
  { id: 50, name: "Ashwin Ravindran",        role: "WK",   price: 25,  pts: 83,  mp: 13 },
  { id: 51, name: "Pierce Kidson-Purry",     role: "BAT",  price: 20,  pts: 72,  mp: 9  },
  { id: 52, name: "Harry D'Rozario",         role: "AR",   price: 20,  pts: 61,  mp: 12 },
];

const LEADERBOARD = [
  { rank: 1,  name: "Kamesh N.",   pts: 1842, gw: 124, team: "Nirmal's Eleven"  },
  { rank: 2,  name: "Anthony H.",  pts: 1791, gw: 118, team: "Howes XI"          },
  { rank: 3,  name: "Zayaan A.",   pts: 1754, gw: 131, team: "Arbab's Army"      },
  { rank: 4,  name: "Matt S.",     pts: 1698, gw: 109, team: "Stamps & Co."      },
  { rank: 5,  name: "Aayush P.",   pts: 1643, gw: 97,  team: "Pathania's Pick"   },
  { rank: 6,  name: "Jaegar S.",   pts: 1601, gw: 112, team: "Sagoo Selecta"     },
  { rank: 7,  name: "Bhanuka S.",  pts: 1589, gw: 103, team: "Samarakkody XI"    },
  { rank: 8,  name: "Ben P.",      pts: 1542, gw: 88,  team: "Perry's Finest"    },
  { rank: 9,  name: "Niyam S.",    pts: 1498, gw: 95,  team: "Shah's XI"         },
  { rank: 10, name: "Uday J.",     pts: 1467, gw: 91,  team: "Joshi's Gems"      },
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
`;

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role];
  return (
    <span style={{
      background: c + "25", color: c, border: `1px solid ${c}50`,
      borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600,
    }}>{ROLE_LABELS[role]}</span>
  );
}

function Nav({ page, setPage }) {
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
    </nav>
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

function SquadPage() {
  const [squad, setSquad] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");

  const spent = squad.reduce((s, p) => s + p.price, 0);
  const remaining = BUDGET - spent;
  const roleCounts = squad.reduce((acc, p) => ({ ...acc, [p.role]: (acc[p.role] || 0) + 1 }), {});
  const marqueeCount = squad.filter(p => p.price >= MARQUEE_PRICE).length;

  const canAdd = (p) => {
    if (squad.find(x => x.id === p.id)) return false;
    if (squad.length >= SQUAD_SIZE) return false;
    if (remaining < p.price) return false;
    if ((roleCounts[p.role] || 0) >= ROLE_LIMITS[p.role]) return false;
    if (p.price >= MARQUEE_PRICE && marqueeCount >= MAX_MARQUEE) return false;
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

  const pickerList = PLAYERS.filter(p =>
    (filterRole === "ALL" || p.role === filterRole) &&
    (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = { BAT: [], BOWL: [], AR: [], WK: [] };
  squad.forEach(p => grouped[p.role].push(p));

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="My Squad" sub="Gameweek 14 · Deadline: Friday 11:59 PM" />

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
              border: captain === p.id
                ? `1px solid ${COLORS.gold}`
                : viceCaptain === p.id
                  ? `1px solid ${COLORS.goldLight}60`
                  : "1px solid transparent",
              transition: "border-color 0.15s",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.white, display: "flex", alignItems: "center", gap: 6 }}>
                  {p.name}
                  {captain === p.id && (
                    <span style={{ background: COLORS.gold, color: COLORS.purpleDark, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>C</span>
                  )}
                  {viceCaptain === p.id && (
                    <span style={{ background: COLORS.goldLight + "50", color: COLORS.gold, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>VC</span>
                  )}
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

          {/* Floating budget widget */}
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

          {/* Main picker container */}
          <div style={{
            display: "flex", width: "100%", maxWidth: 900,
            marginTop: 64, overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>

            {/* LEFT SIDEBAR — selected squad */}
            <div style={{
              width: 240, background: COLORS.purpleDark,
              borderRight: `1px solid ${COLORS.purpleMid}`,
              display: "flex", flexDirection: "column", flexShrink: 0,
            }}>
              <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${COLORS.purpleMid}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold, letterSpacing: 1 }}>YOUR SQUAD</div>
                <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{squad.length} of {SQUAD_SIZE} selected</div>
              </div>
              <div style={{ overflowY: "auto", flex: 1, padding: "8px 10px 16px" }}>
                {squad.length === 0 && (
                  <div style={{ textAlign: "center", color: COLORS.gray, fontSize: 12, padding: "24px 8px", lineHeight: 1.6, opacity: 0.7 }}>
                    Add players from the list to build your squad
                  </div>
                )}
                {Object.entries({ BAT: [], BOWL: [], AR: [], WK: [] }).map(([role]) => {
                  const rPlayers = squad.filter(p => p.role === role);
                  if (rPlayers.length === 0) return null;
                  return (
                    <div key={role} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: ROLE_COLORS[role], letterSpacing: 1.5, marginBottom: 4, paddingLeft: 4 }}>
                        {ROLE_LABELS[role].toUpperCase()}S
                      </div>
                      {rPlayers.map(p => (
                        <div key={p.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "7px 8px", borderRadius: 7, marginBottom: 3,
                          background: COLORS.purpleMid,
                          border: `1px solid ${p.price >= MARQUEE_PRICE ? COLORS.gold + "40" : "transparent"}`,
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
                  color: COLORS.purpleDark, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700,
                }}>Done</button>
              </div>
            </div>

            {/* RIGHT PANEL — player list */}
            <div style={{
              flex: 1, background: COLORS.purpleDark,
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${COLORS.purpleMid}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Add Players</span>
                  <button onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", color: COLORS.gray, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search player..."
                  style={{
                    width: "100%", background: COLORS.purpleMid, border: `1px solid ${COLORS.purpleLight}40`,
                    color: COLORS.white, borderRadius: 8, padding: "7px 12px",
                    fontSize: 13, outline: "none", marginBottom: 10,
                  }}
                />
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
                          {p.price >= MARQUEE_PRICE && (
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

function PlayersPage() {
  const [sort, setSort] = useState("price");
  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => PLAYERS
    .filter(p =>
      (filterRole === "ALL" || p.role === filterRole) &&
      (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => b[sort] - a[sort]),
    [sort, filterRole, search]
  );

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Player Database" sub={`${PLAYERS.length} players · Season 2024–25`} />

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
                {p.price >= MARQUEE_PRICE && (
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

function LeaderboardPage() {
  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Leaderboard" sub="Gameweek 14 · Season 2024–25" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {LEADERBOARD.slice(0, 3).map((p, i) => (
          <div key={p.rank} style={{
            background: i === 0 ? COLORS.gold + "18" : COLORS.purpleMid,
            borderRadius: 14, padding: "20px 16px",
            border: `1px solid ${i === 0 ? COLORS.gold + "55" : "transparent"}`,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{["🥇","🥈","🥉"][i]}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.white }}>{p.name}</div>
            <div style={{ fontSize: 11, color: COLORS.gray, marginBottom: 10 }}>{p.team}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: i === 0 ? COLORS.gold : COLORS.goldLight }}>{p.pts}</div>
            <div style={{ fontSize: 11, color: COLORS.gray }}>total points</div>
            <div style={{ fontSize: 12, color: COLORS.success, marginTop: 6 }}>GW14: +{p.gw}</div>
          </div>
        ))}
      </div>

      <div style={{ background: COLORS.purpleMid, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.gold}18` }}>
        <div style={{
          display: "grid", gridTemplateColumns: "44px 1fr 100px 100px",
          padding: "10px 16px", borderBottom: `1px solid ${COLORS.purpleDark}`,
          fontSize: 11, color: COLORS.gray, fontWeight: 600, letterSpacing: 0.8,
        }}>
          <span>#</span><span>MANAGER</span><span>GW PTS</span><span>TOTAL</span>
        </div>
        {LEADERBOARD.map((p, i) => (
          <div key={p.rank} style={{
            display: "grid", gridTemplateColumns: "44px 1fr 100px 100px",
            padding: "12px 16px",
            borderBottom: i < LEADERBOARD.length - 1 ? `1px solid ${COLORS.purpleDark}` : "none",
            alignItems: "center",
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: p.rank <= 3 ? COLORS.gold : COLORS.gray }}>{p.rank}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.white }}>{p.name}</div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>{p.team}</div>
            </div>
            <span style={{ fontSize: 14, color: COLORS.success, fontWeight: 600 }}>+{p.gw}</span>
            <span style={{ fontSize: 15, color: COLORS.gold, fontWeight: 700 }}>{p.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

export default function App() {
  const [page, setPage] = useState("squad");
  return (
    <div style={{ minHeight: "100vh", background: "#241650" }}>
      <style>{globalStyles}</style>
      <Nav page={page} setPage={setPage} />
      {page === "squad" && <SquadPage />}
      {page === "players" && <PlayersPage />}
      {page === "leaderboard" && <LeaderboardPage />}
      {page === "howtoplay" && <HowToPlayPage />}
    </div>
  );
}
