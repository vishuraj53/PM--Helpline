import { useState, useEffect, useRef } from "react";

const API = "http://127.0.0.1:8000";

// ─── helpers ──────────────────────────────────────────────────────────────────
const getToken = ()  => localStorage.getItem("pm_token");
const getUser  = ()  => JSON.parse(localStorage.getItem("pm_user") || "null");
const saveSession = (token, user) => {
  localStorage.setItem("pm_token", token);
  localStorage.setItem("pm_user", JSON.stringify(user));
};
const clearSession = () => {
  localStorage.removeItem("pm_token");
  localStorage.removeItem("pm_user");
};

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.json) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.json);
    delete options.json;
  }
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  navy: "#0B1F35", navyMid: "#152E4D", saffron: "#F97316",
  saffronL: "#FFF3E8", green: "#15803D", greenL: "#F0FDF4",
  white: "#FFFFFF", bg: "#F1F5F9", border: "#E2E8F0",
  muted: "#94A3B8", text: "#1E293B", textSub: "#64748B",
  danger: "#DC2626", dangerL: "#FEF2F2",
};

const S = {
  page:  { minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI',system-ui,sans-serif", display: "flex", flexDirection: "column" },
  card:  { background: C.white, borderRadius: 16, padding: "2rem", boxShadow: "0 4px 24px rgba(11,31,53,0.10)", border: `1px solid ${C.border}` },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: 5 },
  input: { width: "100%", height: 44, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "0 14px", fontSize: 14, color: C.text, fontFamily: "inherit", background: C.white, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" },
  textarea: { width: "100%", minHeight: 100, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.text, fontFamily: "inherit", background: C.white, outline: "none", resize: "vertical", boxSizing: "border-box" },
  btnNavy: { width: "100%", height: 48, background: C.navy, color: C.white, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  btnSaffron: { height: 44, padding: "0 24px", background: C.saffron, color: C.white, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" },
};

// ─── small components ─────────────────────────────────────────────────────────
function Tricolor() {
  return <div style={{ height: 4, display: "flex" }}>
    <div style={{ flex:1, background:"#F97316" }} />
    <div style={{ flex:1, background:"#fff" }} />
    <div style={{ flex:1, background:"#15803D" }} />
  </div>;
}

function Header({ user, onLogout }) {
  return <>
    <header style={{ background: C.navy, padding: "0 2rem", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width:40, height:40, borderRadius:"50%", background:C.saffron, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:"#fff" }}>PM</div>
        <div>
          <div style={{ color:"#fff", fontWeight:600, fontSize:15 }}>PM Helpline</div>
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>Citizen Grievance Portal</div>
        </div>
      </div>
      {user && (
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:"#fff", fontSize:13, fontWeight:500 }}>{user.full_name}</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>{user.email}</div>
          </div>
          <div style={{ width:36, height:36, borderRadius:"50%", background:C.saffron, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:"#fff" }}>
            {user.full_name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", borderRadius:8, padding:"6px 14px", fontSize:12, fontFamily:"inherit", cursor:"pointer" }}>
            Sign Out
          </button>
        </div>
      )}
    </header>
    <Tricolor />
  </>;
}

function Alert({ msg, type }) {
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{ padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:"1rem", lineHeight:1.5, background: isErr ? C.dangerL : C.greenL, color: isErr ? C.danger : C.green, borderLeft: `3px solid ${isErr ? C.danger : C.green}` }}>
      {msg}
    </div>
  );
}

function Badge({ label }) {
  const map = {
    Critical:{ bg:"#FEE2E2", color:"#991B1B" }, High:{ bg:"#FEF3C7", color:"#92400E" },
    Medium:  { bg:"#DBEAFE", color:"#1E40AF" }, Low: { bg:"#DCFCE7", color:"#14532D" },
    Valid:   { bg:"#DCFCE7", color:"#14532D" }, Invalid:{ bg:"#FEE2E2", color:"#991B1B" },
    Positive:{ bg:"#DCFCE7", color:"#14532D" }, Negative:{ bg:"#FEE2E2", color:"#991B1B" },
    Neutral: { bg:"#F1F5F9", color:"#475569" }, Pending:{ bg:"#F1F5F9", color:"#475569" },
  };
  const s = map[label] || { bg:"#F1F5F9", color:"#475569" };
  return <span style={{ background:s.bg, color:s.color, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{label}</span>;
}

function Stat({ num, label, color }) {
  return (
    <div style={{ background:C.white, borderRadius:12, padding:"1rem 1.25rem", textAlign:"center", boxShadow:"0 2px 12px rgba(11,31,53,0.07)", border:`1px solid ${C.border}` }}>
      <div style={{ fontSize:28, fontWeight:800, color: color||C.navy }}>{num}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{label}</div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />;
}

// ═══════════════════════════════════════════════════════════════
// AUTH SCREENS  (Login + Register as two tabs)
// ═══════════════════════════════════════════════════════════════
const STATES = ["Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];

function AuthScreen({ onAuth }) {
  const [tab, setTab]     = useState("login");
  const [loading, setL]   = useState(false);
  const [alert, setAlert] = useState({ msg:"", type:"" });

  // login fields
  const [lemail, setLemail] = useState("");
  const [lpw,    setLpw]    = useState("");
  const [lshow,  setLshow]  = useState(false);

  // register fields
  const [rname,    setRname]    = useState("");
  const [rphone,   setRphone]   = useState("");
  const [remail,   setRemail]   = useState("");
  const [rstate,   setRstate]   = useState("");
  const [raadhaar, setRaadhaar] = useState("");
  const [rpw,      setRpw]      = useState("");
  const [rshow,    setRshow]    = useState(false);
  const [strength, setStrength] = useState(0);

  const showAlert = (msg, type="error") => { setAlert({ msg, type }); setTimeout(() => setAlert({ msg:"", type:"" }), 5000); };

  const checkStrength = (pw) => {
    let s = 0;
    if (pw.length>=8) s++; if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
    setStrength(s);
    return s;
  };

  const doLogin = async () => {
    if (!lemail || !lpw) { showAlert("Please fill in all fields."); return; }
    setL(true);
    try {
      const data = await apiFetch("/auth/login", { method:"POST", json:{ email:lemail, password:lpw } });
      saveSession(data.token, data.user);
      onAuth(data.user);
    } catch(e) { showAlert(e.message); }
    finally    { setL(false); }
  };

  const doRegister = async () => {
    if (!rname||!rphone||!remail||!rstate||!raadhaar||!rpw) { showAlert("Please fill in all fields."); return; }
    if (raadhaar.length !== 12) { showAlert("Aadhaar must be 12 digits."); return; }
    if (!/^[6-9]\d{9}$/.test(rphone)) { showAlert("Enter a valid 10-digit mobile number."); return; }
    if (checkStrength(rpw) < 2) { showAlert("Password is too weak. Use 8+ chars with uppercase and numbers."); return; }
    setL(true);
    try {
      const data = await apiFetch("/auth/register", { method:"POST", json:{ full_name:rname, email:remail, phone:rphone, state:rstate, aadhaar:raadhaar, password:rpw } });
      saveSession(data.token, data.user);
      onAuth(data.user);
    } catch(e) { showAlert(e.message); }
    finally    { setL(false); }
  };

  const strColors = ["#E2E8F0","#DC2626","#F59E0B","#3B82F6","#15803D"];

  return (
    <div style={S.page}>
      <Header />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"3rem 1rem" }}>
        <div style={{ width:"100%", maxWidth:460 }}>

          {/* top brand bar */}
          <div style={{ background:C.navy, borderRadius:"16px 16px 0 0", padding:"2rem", textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:C.saffron, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1rem", fontSize:22, fontWeight:800, color:"#fff" }}>PM</div>
            <div style={{ color:"#fff", fontSize:20, fontWeight:700, marginBottom:4 }}>Citizen Portal</div>
            <div style={{ color:"rgba(255,255,255,0.45)", fontSize:13 }}>Government of India — PM Helpline</div>
          </div>

          {/* tab bar */}
          <div style={{ display:"flex", background:C.white, borderBottom:`1.5px solid ${C.border}` }}>
            {[["login","Sign In"],["register","Register"]].map(([id,label]) => (
              <button key={id} onClick={() => { setTab(id); setAlert({ msg:"", type:"" }); }} style={{ flex:1, padding:"1rem", fontFamily:"inherit", fontSize:14, fontWeight:600, background:"none", border:"none", cursor:"pointer", color: tab===id ? C.saffron : C.textSub, boxShadow: tab===id ? `inset 0 -2.5px 0 ${C.saffron}` : "none", background: tab===id ? C.saffronL : "transparent", transition:"all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>

          {/* form body */}
          <div style={{ ...S.card, borderRadius:"0 0 16px 16px", borderTop:"none" }}>
            <Alert msg={alert.msg} type={alert.type} />

            {/* ── LOGIN ── */}
            {tab === "login" && <>
              <div style={{ fontSize:20, fontWeight:700, color:C.navy, marginBottom:4 }}>Welcome back</div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:"1.5rem" }}>Sign in to file and track your grievances.</div>
              <div style={{ marginBottom:14 }}>
                <label style={S.label}>Email Address</label>
                <input style={S.input} type="email" placeholder="yourname@email.com" value={lemail} onChange={e=>setLemail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} onFocus={e=>e.target.style.borderColor=C.saffron} onBlur={e=>e.target.style.borderColor=C.border} />
              </div>
              <div style={{ marginBottom:"1.5rem" }}>
                <label style={S.label}>Password</label>
                <div style={{ position:"relative" }}>
                  <input style={{ ...S.input, paddingRight:60 }} type={lshow?"text":"password"} placeholder="Enter your password" value={lpw} onChange={e=>setLpw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} onFocus={e=>e.target.style.borderColor=C.saffron} onBlur={e=>e.target.style.borderColor=C.border} />
                  <button onClick={()=>setLshow(!lshow)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:C.bg, border:"none", borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:700, color:C.textSub, cursor:"pointer", fontFamily:"inherit" }}>{lshow?"HIDE":"SHOW"}</button>
                </div>
              </div>
              <button style={S.btnNavy} onClick={doLogin} disabled={loading}>
                {loading ? <><Spinner /> Signing in…</> : "Sign In →"}
              </button>
              <p style={{ textAlign:"center", fontSize:13, color:C.muted, marginTop:"1rem" }}>
                No account? <span onClick={()=>setTab("register")} style={{ color:C.saffron, fontWeight:600, cursor:"pointer" }}>Register here</span>
              </p>
            </>}

            {/* ── REGISTER ── */}
            {tab === "register" && <>
              <div style={{ fontSize:20, fontWeight:700, color:C.navy, marginBottom:4 }}>Create account</div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:"1.5rem" }}>Register as a citizen to submit grievances securely.</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <label style={S.label}>Full Name</label>
                  <input style={S.input} placeholder="Rahul Sharma" value={rname} onChange={e=>setRname(e.target.value)} onFocus={e=>e.target.style.borderColor=C.saffron} onBlur={e=>e.target.style.borderColor=C.border} />
                </div>
                <div>
                  <label style={S.label}>Phone Number</label>
                  <input style={S.input} placeholder="9876543210" maxLength={10} value={rphone} onChange={e=>setRphone(e.target.value.replace(/\D/g,""))} onFocus={e=>e.target.style.borderColor=C.saffron} onBlur={e=>e.target.style.borderColor=C.border} />
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Email Address</label>
                <input style={S.input} type="email" placeholder="rahul@email.com" value={remail} onChange={e=>setRemail(e.target.value)} onFocus={e=>e.target.style.borderColor=C.saffron} onBlur={e=>e.target.style.borderColor=C.border} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <label style={S.label}>State</label>
                  <select style={{ ...S.input, appearance:"none" }} value={rstate} onChange={e=>setRstate(e.target.value)} onFocus={e=>e.target.style.borderColor=C.saffron} onBlur={e=>e.target.style.borderColor=C.border}>
                    <option value="">Select state</option>
                    {STATES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Aadhaar Number</label>
                  <input style={S.input} placeholder="123456789012" maxLength={12} value={raadhaar} onChange={e=>setRaadhaar(e.target.value.replace(/\D/g,""))} onFocus={e=>e.target.style.borderColor=C.saffron} onBlur={e=>e.target.style.borderColor=C.border} />
                </div>
              </div>
              <div style={{ marginBottom:"1.5rem" }}>
                <label style={S.label}>Password</label>
                <div style={{ position:"relative" }}>
                  <input style={{ ...S.input, paddingRight:60 }} type={rshow?"text":"password"} placeholder="Min. 8 characters" value={rpw} onChange={e=>{ setRpw(e.target.value); checkStrength(e.target.value); }} onFocus={e=>e.target.style.borderColor=C.saffron} onBlur={e=>e.target.style.borderColor=C.border} />
                  <button onClick={()=>setRshow(!rshow)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:C.bg, border:"none", borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:700, color:C.textSub, cursor:"pointer", fontFamily:"inherit" }}>{rshow?"HIDE":"SHOW"}</button>
                </div>
                <div style={{ height:3, borderRadius:2, background:C.border, marginTop:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${strength*25}%`, background:strColors[strength], borderRadius:2, transition:"all 0.3s" }} />
                </div>
              </div>
              <button style={S.btnNavy} onClick={doRegister} disabled={loading}>
                {loading ? <><Spinner /> Creating account…</> : "Create Account →"}
              </button>
              <p style={{ textAlign:"center", fontSize:13, color:C.muted, marginTop:"1rem" }}>
                Already registered? <span onClick={()=>setTab("login")} style={{ color:C.saffron, fontWeight:600, cursor:"pointer" }}>Sign in</span>
              </p>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({ user, onLogout }) {
  const [tab, setTab]         = useState("submit");
  const [complaints, setC]    = useState([]);
  const [text, setText]       = useState("");
  const [file, setFile]       = useState(null);
  const [submitting, setSub]  = useState(false);
  const [alert, setAlert]     = useState({ msg:"", type:"" });
  const fileRef = useRef();

  const showAlert = (msg, type="error") => { setAlert({ msg, type }); setTimeout(() => setAlert({ msg:"", type:"" }), 5000); };

  const loadComplaints = async () => {
    try {
      const data = await apiFetch("/my-complaints");
      setC(data);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { loadComplaints(); }, []);

  const handleSubmit = async () => {
    if (!text.trim()) { showAlert("Please describe your grievance."); return; }
    setSub(true);
    try {
      const form = new FormData();
      form.append("text", text);
      if (file) form.append("file", file);
      await apiFetch("/submit", { method:"POST", body:form });
      showAlert("Complaint submitted successfully!", "success");
      setText(""); setFile(null);
      await loadComplaints();
      setTab("list");
    } catch(e) { showAlert(e.message); }
    finally    { setSub(false); }
  };

  const critical = complaints.filter(c=>c.priority==="Critical").length;
  const valid    = complaints.filter(c=>c.validity ==="Valid").length;

  const priorityBorder = { Critical:"#DC2626", High:"#F59E0B", Medium:"#3B82F6", Low:"#22C55E" };

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Header user={user} onLogout={onLogout} />
      <div style={{ flex:1, padding:"2rem 1rem", maxWidth:860, margin:"0 auto", width:"100%" }}>

        {/* welcome */}
        <div style={{ background:`linear-gradient(135deg,${C.navy} 0%,#1E3A5F 100%)`, borderRadius:16, padding:"1.75rem 2rem", color:"#fff", marginBottom:"1.5rem" }}>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Welcome, {user.full_name.split(" ")[0]} 👋</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)" }}>File grievances or track existing complaints through the PM Helpline Portal.</div>
        </div>

        {/* stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:"1.5rem" }}>
          <Stat num={complaints.length} label="Total Complaints" />
          <Stat num={critical}          label="Critical"          color={C.danger} />
          <Stat num={valid}             label="Valid"             color={C.green} />
        </div>

        {/* tabs */}
        <div style={{ display:"flex", background:C.white, borderRadius:12, padding:4, marginBottom:"1.25rem", border:`1px solid ${C.border}`, boxShadow:"0 2px 8px rgba(11,31,53,0.06)" }}>
          {[["submit","File Complaint"],["list",`My Complaints (${complaints.length})`]].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ flex:1, height:40, border:"none", borderRadius:9, fontFamily:"inherit", fontSize:14, fontWeight:600, cursor:"pointer", transition:"all 0.2s", background:tab===id ? C.navy : "transparent", color:tab===id ? "#fff" : C.textSub }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Submit tab ── */}
        {tab === "submit" && (
          <div style={S.card}>
            <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:"1.25rem" }}>File a New Complaint</div>
            <Alert msg={alert.msg} type={alert.type} />
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Complaint Details *</label>
              <textarea style={S.textarea} placeholder="Describe your grievance — e.g. water shortage, electricity outage, corruption, unemployment…" value={text} onChange={e=>setText(e.target.value)} onFocus={e=>e.target.style.borderColor=C.saffron} onBlur={e=>e.target.style.borderColor=C.border} />
            </div>
            <div style={{ marginBottom:"1.5rem" }}>
              <label style={S.label}>Supporting Document (optional)</label>
              <div onClick={()=>fileRef.current?.click()} style={{ border:`2px dashed ${file?C.saffron:C.border}`, borderRadius:10, padding:"1rem", textAlign:"center", cursor:"pointer", background:file?C.saffronL:C.bg, transition:"all 0.2s" }}>
                <input ref={fileRef} type="file" style={{ display:"none" }} onChange={e=>setFile(e.target.files[0])} />
                {file ? (
                  <div style={{ fontSize:13, color:C.saffron, fontWeight:600 }}>
                    📎 {file.name}
                    <span onClick={e=>{e.stopPropagation();setFile(null);}} style={{ marginLeft:8, color:C.muted, cursor:"pointer" }}>✕</span>
                  </div>
                ) : (
                  <div style={{ fontSize:13, color:C.muted }}>Click to upload a file</div>
                )}
              </div>
            </div>
            <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:12, color:C.textSub, marginBottom:"1.25rem" }}>
              ℹ️ Your complaint will be automatically analysed for <strong>sentiment</strong>, <strong>importance</strong>, and <strong>priority</strong> using AI.
            </div>
            <button style={{ ...S.btnNavy, background:C.saffron }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Spinner /> Submitting…</> : "Submit Complaint →"}
            </button>
          </div>
        )}

        {/* ── List tab ── */}
        {tab === "list" && (
          <div style={S.card}>
            <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:"1.25rem" }}>All My Complaints ({complaints.length})</div>
            {complaints.length === 0 ? (
              <div style={{ textAlign:"center", padding:"2.5rem", color:C.muted, fontSize:14 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
                No complaints submitted yet.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[...complaints].reverse().map((d, i) => (
                  <div key={i} style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", background:C.bg, borderLeft:`4px solid ${priorityBorder[d.priority]||"#22C55E"}` }}>
                    <div style={{ fontSize:13, color:C.text, lineHeight:1.55, marginBottom:10 }}>
                      {d.text?.length > 160 ? d.text.slice(0,160)+"…" : d.text}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <Badge label={d.priority} />
                      <Badge label={d.sentiment} />
                      <Badge label={d.validity} />
                      <span style={{ fontSize:11, color:C.muted, marginLeft:"auto" }}>
                        {d.submitted_at ? new Date(d.submitted_at).toLocaleDateString("en-IN") : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(() => getUser());

  // restore session on reload
  useEffect(() => {
    if (getToken() && !user) {
      apiFetch("/auth/me")
        .then(u => setUser(u))
        .catch(() => { clearSession(); setUser(null); });
    }
  }, []);

  const handleAuth   = (u) => setUser(u);
  const handleLogout = () => { clearSession(); setUser(null); };

  if (!user) return <AuthScreen onAuth={handleAuth} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
