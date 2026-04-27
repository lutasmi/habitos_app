import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_KPI_GROUPS = [
  {
    id: "medicacion", label: "Medicación", emoji: "💊", color: "#FF6B6B", openByDefault: true,
    fields: [
      { id: "ursochol", label: "Ursochol", type: "toggle", positive: true },
      { id: "imurel",   label: "Imurel",   type: "toggle", positive: true },
    ],
  },
  {
    id: "salud", label: "Salud", emoji: "❤️", color: "#FF9F43", openByDefault: true,
    fields: [
      { id: "actividad", label: "Actividad",              type: "toggle", positive: true },
      { id: "nocoke",    label: "Sin Coca-Cola",          type: "toggle", positive: true },
      { id: "posponer",  label: "Posponer gratificación", type: "toggle", positive: true },
    ],
  },
  {
    id: "alimentacion", label: "Alimentación", emoji: "🍎", color: "#A8E063", openByDefault: false,
    fields: [
      { id: "alimentacion_eq", label: "Alimentación equilibrada", type: "toggle", positive: true },
      { id: "fruta",           label: "Piezas de fruta",          type: "counter", max: 5, positive: true },
    ],
  },
  {
    id: "rutina", label: "Rutina", emoji: "🧴", color: "#C9B1FF", openByDefault: false,
    fields: [
      { id: "dientes",      label: "Dientes",           type: "counter", max: 3, positive: true },
      { id: "aparato",      label: "Aparato",           type: "toggle",  positive: true },
      { id: "pelo",         label: "Pelo",              type: "toggle",  positive: true },
      { id: "ojos",         label: "Gotas ojos",        type: "toggle",  positive: true },
      { id: "hidra_cara",   label: "Hidratante cara",   type: "toggle",  positive: true },
      { id: "hidra_cuerpo", label: "Hidratante cuerpo", type: "toggle",  positive: true },
    ],
  },
  {
    id: "metricas", label: "Métricas", emoji: "📏", color: "#4ECDC4", openByDefault: false,
    fields: [
      { id: "puntuacion", label: "Puntuación del día", type: "rating", max: 10, positive: true },
    ],
  },
];

const DEFAULT_HAB_GROUPS = [
  { id: "deporte",      label: "Deporte",               emoji: "⚽", color: "#4ECDC4", habitos: ["Entreno Cardio","Entreno Fuerza","Estirar","Pádel","Golf","Nadar","Caminata"] },
  { id: "alimentacion", label: "Alimentación",           emoji: "🍽️", color: "#A8E063", habitos: ["Cocinar","Meal prep","Sin ultraprocesados"] },
  { id: "desarrollo_p", label: "Desarrollo Personal",    emoji: "📚", color: "#C9B1FF", habitos: ["Lectura","Meditación","Journaling"] },
  { id: "desarrollo_f", label: "Desarrollo Profesional", emoji: "🚀", color: "#FFD93D", habitos: ["Exposición profesional","Networking","Formación","Deep work"] },
  { id: "familia",      label: "Familia & Amigos",       emoji: "❤️", color: "#FF6B6B", habitos: ["Llamar","Quedar","Mensaje especial","Chiamare amici"] },
  { id: "financieros",  label: "Financieros",            emoji: "💰", color: "#FF9F43", habitos: ["Revisar inversiones","Ahorro activo"] },
  { id: "ocio",         label: "Ocio & Cultura",         emoji: "🎭", color: "#4A9EFF", habitos: ["Películas","Teatro","Música","Escapadas"] },
  { id: "side",         label: "Side Projects",          emoji: "⚡", color: "#E8D5A3", habitos: ["Sesión de proyecto"] },
];

const PALETTE = [
  "#FF6B6B","#FF9F43","#FFD93D","#A8E063","#4ECDC4",
  "#4A9EFF","#C9B1FF","#FF6EC7","#E8D5A3","#80CBC4",
  "#F48FB1","#80DEEA","#B39DDB","#A5D6A7","#FFB74D",
];

const FIELD_TYPES = [
  { id: "toggle",  label: "Sí / No"    },
  { id: "counter", label: "Contador"   },
  { id: "decimal", label: "Número"     },
  { id: "rating",  label: "Puntuación" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const SK = {
  kpis: "kpis-v3", habitos: "hab-v3",
  kpiGroups: "cfg-kpi-v2", habGroups: "cfg-hab-v2",
  scriptUrl: "script-url-v1",
};

async function sGet(k) {
  try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function sSet(k, v) { try { await window.storage.set(k, JSON.stringify(v)); } catch {} }

// ═══════════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════════

const uid   = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];

const fmtDate  = d => new Date(d+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
const fmtShort = d => new Date(d+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"});
const fmtDay   = d => new Date(d+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short"});

function initDay(groups) {
  const v = {};
  groups.forEach(g => g.fields.forEach(f => { v[f.id] = f.type === "counter" ? 0 : null; }));
  return v;
}

function scoreDay(vals, groups) {
  const toggles = groups.flatMap(g => g.fields.filter(f => f.type === "toggle"));
  const done    = toggles.filter(f => {
    const v = vals[f.id];
    return f.positive !== false ? v === true : v === false; // positive: ✓ good; negative: ✕ good
  }).length;
  const pending = toggles.filter(f => vals[f.id] === null).length;
  return { pct: toggles.length ? Math.round((done / toggles.length) * 100) : 0, done, total: toggles.length, pending };
}

// Colors for toggle based on positive/negative
function toggleColors(field, value) {
  const GREEN = "#A8E063", RED = "#FF6B6B", GREY = "#444", GREY_BG = "transparent";
  const pos = field.positive !== false; // default positive

  // ✓ button
  const doneActive   = pos ? GREEN : RED;
  const doneInactive = GREY;

  // ✕ button
  const noActive   = pos ? RED : GREEN;
  const noInactive = GREY;

  return {
    done: {
      color:      value === true  ? doneActive : doneInactive,
      border:     `1.5px solid ${value === true  ? doneActive : "#222"}`,
      background: value === true  ? doneActive + "22" : GREY_BG,
    },
    no: {
      color:      value === false ? noActive : noInactive,
      border:     `1.5px solid ${value === false ? noActive : "#222"}`,
      background: value === false ? noActive + "22" : GREY_BG,
    },
  };
}

// Sync config + data to Apps Script
async function syncToSheet(scriptUrl, payload) {
  if (!scriptUrl) return;
  try {
    await fetch(scriptUrl, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

function Toggle({ label, value, onChange, field }) {
  const c = toggleColors(field, value);
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onChange(value === false ? null : false)} style={{ ...S.pill, ...c.no   }}>✕</button>
        <button onClick={() => onChange(value === true  ? null : true)}  style={{ ...S.pill, ...c.done }}>✓</button>
      </div>
    </div>
  );
}

function Counter({ label, value, onChange, color, max = 5 }) {
  const v = value ?? 0;
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => onChange(Math.max(0, v-1))} style={{ ...S.cBtn, opacity: v===0?.25:1 }}>−</button>
        <div style={{ ...S.cVal, color: v>0?color:"#333", borderColor: v>0?color:"#222", boxShadow: v>0?`0 0 10px ${color}33`:"none" }}>
          {v}<span style={{ fontSize: 9, color: "#333" }}>/{max}</span>
        </div>
        <button onClick={() => onChange(Math.min(max, v+1))} style={{ ...S.cBtn, opacity: v===max?.25:1 }}>+</button>
      </div>
    </div>
  );
}

function Decimal({ label, value, onChange, color, placeholder }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <input type="number" step="0.1" value={value??""} placeholder={placeholder||"—"}
        onChange={e => onChange(e.target.value===""?null:parseFloat(e.target.value))}
        style={{ ...S.numIn, borderColor: value!=null?color:"#222", color: value!=null?color:"#444" }} />
    </div>
  );
}

function Rating({ label, value, onChange, color, max=10 }) {
  return (
    <div style={{ ...S.row, flexDirection:"column", alignItems:"flex-start", gap:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%" }}>
        <span style={S.rowLabel}>{label}</span>
        {value!=null && <span style={{ fontSize:22, fontWeight:800, color, fontFamily:"monospace" }}>{value}</span>}
      </div>
      <div style={{ display:"flex", gap:4, width:"100%" }}>
        {Array.from({length:max},(_,i)=>i+1).map(n => (
          <button key={n} onClick={() => onChange(value===n?null:n)}
            style={{ flex:1, height:26, borderRadius:5, border:"none", cursor:"pointer",
              background: value!=null&&n<=value?color:"#1a1a1a",
              boxShadow: value!=null&&n<=value?`0 0 8px ${color}44`:"none",
              transition:"background .2s" }} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI GROUP CARD
// ═══════════════════════════════════════════════════════════════════════════════

function KpiGroup({ group, vals, onChange, open, onToggle }) {
  const toggles = group.fields.filter(f => f.type==="toggle");
  const done    = toggles.filter(f => {
    const v = vals[f.id];
    return f.positive !== false ? v === true : v === false;
  }).length;
  const pending = toggles.filter(f => vals[f.id]===null).length;
  const allDone = toggles.length>0 && done===toggles.length;
  const bc = pending>0?"#333":allDone?"#A8E063":"#FFD93D";
  const bt = pending>0?`${done}/${toggles.length}`:allDone?"✓":`${done}/${toggles.length}`;

  return (
    <div style={S.card}>
      <button onClick={onToggle} style={S.cardHdr}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>{group.emoji}</span>
          <span style={S.cardLabel}>{group.label}</span>
          {toggles.length>0 && (
            <span style={{ fontSize:10, padding:"2px 9px", borderRadius:20, fontFamily:"monospace", fontWeight:700,
              background:bc+"18", color:bc, border:`1px solid ${bc}44`, transition:"all .3s" }}>{bt}</span>
          )}
        </div>
        <span style={{ color:"#333", fontSize:14, transform:open?"rotate(180deg)":"none", transition:"transform .2s" }}>▾</span>
      </button>
      {open && (
        <div style={S.cardBody}>
          {group.fields.map(f => {
            const v  = vals[f.id];
            const ch = val => onChange(f.id, val);
            if (f.type==="toggle")  return <Toggle  key={f.id} label={f.label} value={v} onChange={ch} field={f} />;
            if (f.type==="counter") return <Counter key={f.id} label={f.label} value={v} onChange={ch} color={group.color} max={f.max} />;
            if (f.type==="decimal") return <Decimal key={f.id} label={f.label} value={v} onChange={ch} color={group.color} placeholder={f.placeholder} />;
            if (f.type==="rating")  return <Rating  key={f.id} label={f.label} value={v} onChange={ch} color={group.color} max={f.max} />;
            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE RING
// ═══════════════════════════════════════════════════════════════════════════════

function ScoreRing({ pct, pending, rating }) {
  const r=30, circ=2*Math.PI*r, dash=(pct/100)*circ;
  const color = pct>=80?"#A8E063":pct>=40?"#FFD93D":"#4ECDC4";
  return (
    <div style={{ textAlign:"center" }}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#1a1a1a" strokeWidth="6"/>
        <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 42 42)"
          style={{ transition:"stroke-dasharray .6s ease, stroke .4s ease" }}/>
        <text x="42" y="39" textAnchor="middle" style={{ fill:color, fontSize:15, fontWeight:800, fontFamily:"monospace" }}>{pct}%</text>
        {rating!=null && <text x="42" y="54" textAnchor="middle" style={{ fill:"#555", fontSize:10, fontFamily:"monospace" }}>★{rating}</text>}
      </svg>
      <p style={{ fontSize:9, color:"#333", margin:"2px 0 0" }}>
        {pending>0?`${pending} pendiente${pending>1?"s":""}`:"¡Completo!"}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY DOTS
// ═══════════════════════════════════════════════════════════════════════════════

function HistoryDots({ kpiData, kpiGroups, selected, onSelect }) {
  const days = Array.from({length:7},(_,i) => {
    const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().split("T")[0];
  });
  return (
    <div style={{ display:"flex", gap:4, marginBottom:14 }}>
      {days.map(d => {
        const vals = {...initDay(kpiGroups),...(kpiData[d]||{})};
        const {pct} = scoreDay(vals, kpiGroups);
        const color = pct>=80?"#A8E063":pct>=40?"#FFD93D":pct>0?"#4ECDC4":"#1e1e1e";
        const isSel = d===selected;
        return (
          <button key={d} onClick={() => onSelect(d)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"8px 4px", borderRadius:10, cursor:"pointer", background:isSel?"#1a1a1a":"transparent", border:`1.5px solid ${isSel?color:"transparent"}`, transition:"all .2s" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:color, boxShadow:pct>0?`0 0 8px ${color}`:"none" }}/>
            <span style={{ fontSize:10, color:pct>0?color:"#222", fontFamily:"monospace", fontWeight:700 }}>{pct>0?`${pct}%`:"·"}</span>
            <span style={{ fontSize:9, color:"#333", textTransform:"capitalize" }}>{fmtDay(d)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI TAB
// ═══════════════════════════════════════════════════════════════════════════════

function KpiTab({ kpiData, setKpiData, kpiGroups, scriptUrl }) {
  const [date,    setDate]    = useState(today());
  const [openG,   setOpenG]   = useState(() => Object.fromEntries(kpiGroups.map(g=>[g.id,g.openByDefault])));
  const [saved,   setSaved]   = useState(false);
  const [syncing, setSyncing] = useState(false);

  const dayVals = {...initDay(kpiGroups),...(kpiData[date]||{})};
  const {pct, pending} = scoreDay(dayVals, kpiGroups);

  const updateField = (fid, val) => {
    setSaved(false);
    setKpiData(prev => ({...prev,[date]:{...(prev[date]||initDay(kpiGroups)),[fid]:val}}));
  };

  const save = async () => {
    const next = {...kpiData,[date]:dayVals};
    setKpiData(next); await sSet(SK.kpis, next);
    setSaved(true); setTimeout(()=>setSaved(false),2500);
    setSyncing(true);
    await syncToSheet(scriptUrl, { type:"kpis", rows: Object.entries(next).map(([d,v])=>({date:d,...v})) });
    setSyncing(false);
  };

  const shift = n => {
    const d=new Date(date+"T12:00:00"); d.setDate(d.getDate()+n);
    const nd=d.toISOString().split("T")[0];
    if (nd<=today()) setDate(nd);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <p style={S.eyebrow}>KPIs Diarios</p>
          <p style={S.heading}>{fmtDate(date)}</p>
        </div>
        <ScoreRing pct={pct} pending={pending} rating={dayVals.puntuacion}/>
      </div>

      <HistoryDots kpiData={kpiData} kpiGroups={kpiGroups} selected={date} onSelect={setDate}/>

      <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center" }}>
        <button onClick={()=>shift(-1)} style={S.arrow}>‹</button>
        <input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)} style={S.dateIn}/>
        <button onClick={()=>shift(1)} style={{...S.arrow,opacity:date>=today()?.2:1}} disabled={date>=today()}>›</button>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <button onClick={()=>setOpenG(Object.fromEntries(kpiGroups.map(g=>[g.id,true])))}  style={S.microBtn}>↓ Todo</button>
        <button onClick={()=>setOpenG(Object.fromEntries(kpiGroups.map(g=>[g.id,false])))} style={S.microBtn}>↑ Colapsar</button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {kpiGroups.map(g => (
          <KpiGroup key={g.id} group={g} vals={dayVals} onChange={updateField}
            open={!!openG[g.id]} onToggle={()=>setOpenG(p=>({...p,[g.id]:!p[g.id]}))}/>
        ))}
      </div>

      <button onClick={save} style={{...S.saveBtn, marginTop:20, background:saved?"#A8E063":"#C9B1FF"}}>
        {syncing?"Sincronizando...":saved?"✓ Guardado":"Guardar día"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HÁBITOS
// ═══════════════════════════════════════════════════════════════════════════════

function HabitoForm({ initial, habGroups, onSave, onCancel }) {
  const [h, setH] = useState(initial||{id:uid(),date:today(),grupo:"",habito:"",comentario:"",veces:1,duracion:null,distancia:null});
  const u=(k,v)=>setH(p=>({...p,[k]:v}));
  const gObj=habGroups.find(g=>g.id===h.grupo);
  const habOpts=gObj?.habitos||[];
  const canSave=h.grupo&&h.habito;

  return (
    <div style={S.formWrap}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <p style={{ fontSize:17, fontWeight:700, margin:0, fontFamily:"var(--fd)" }}>{initial?"Editar actividad":"Nueva actividad"}</p>
        <button onClick={onCancel} style={{ background:"none", border:"none", color:"#444", fontSize:20, cursor:"pointer" }}>✕</button>
      </div>

      <label style={S.lbl}>Fecha</label>
      <input type="date" value={h.date} max={today()} onChange={e=>u("date",e.target.value)} style={{...S.dateIn,width:"100%",marginBottom:16}}/>

      <label style={S.lbl}>Categoría</label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
        {habGroups.map(g=>(
          <button key={g.id} onClick={()=>{u("grupo",g.id);u("habito","");}}
            style={{...S.chip, background:h.grupo===g.id?g.color+"20":"transparent", border:`1.5px solid ${h.grupo===g.id?g.color:"#222"}`, color:h.grupo===g.id?g.color:"#444"}}>
            {g.emoji} {g.label}
          </button>
        ))}
      </div>

      {h.grupo && (<>
        <label style={S.lbl}>Actividad</label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
          {habOpts.map(hb=>(
            <button key={hb} onClick={()=>u("habito",hb)}
              style={{...S.chip, background:h.habito===hb?(gObj?.color||"#888")+"20":"transparent", border:`1.5px solid ${h.habito===hb?gObj?.color||"#888":"#222"}`, color:h.habito===hb?gObj?.color||"#888":"#555"}}>
              {hb}
            </button>
          ))}
        </div>
        <input value={!habOpts.includes(h.habito)?h.habito:""} onChange={e=>u("habito",e.target.value)}
          placeholder="Otra actividad..." style={{...S.dateIn,width:"100%",marginBottom:16}}/>
      </>)}

      <label style={S.lbl}>Comentario (opcional)</label>
      <input value={h.comentario} onChange={e=>u("comentario",e.target.value)} placeholder="Notas..." style={{...S.dateIn,width:"100%",marginBottom:16}}/>

      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <div style={{ flex:1 }}>
          <label style={S.lbl}>Veces</label>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button onClick={()=>u("veces",Math.max(0,h.veces-1))} style={S.cBtn}>−</button>
            <div style={{...S.cVal,color:"#4ECDC4",borderColor:"#4ECDC4",fontSize:16}}>{h.veces}</div>
            <button onClick={()=>u("veces",h.veces+1)} style={S.cBtn}>+</button>
          </div>
        </div>
        <div style={{ flex:1 }}>
          <label style={S.lbl}>Duración (min)</label>
          <input type="number" step="1" value={h.duracion??""} placeholder="—"
            onChange={e=>u("duracion",e.target.value===""?null:parseInt(e.target.value))}
            style={{...S.numIn,width:"100%",borderColor:h.duracion?"#FFD93D":"#222",color:h.duracion?"#FFD93D":"#444"}}/>
        </div>
        <div style={{ flex:1 }}>
          <label style={S.lbl}>Distancia (km)</label>
          <input type="number" step="0.1" value={h.distancia??""} placeholder="—"
            onChange={e=>u("distancia",e.target.value===""?null:parseFloat(e.target.value))}
            style={{...S.numIn,width:"100%",borderColor:h.distancia?"#A8E063":"#222",color:h.distancia?"#A8E063":"#444"}}/>
        </div>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <button onClick={()=>canSave&&onSave(h)} style={{...S.saveBtn,flex:2,background:canSave?"#C9B1FF":"#1e1e1e",color:canSave?"#111":"#333"}}>Guardar</button>
        <button onClick={onCancel} style={{...S.saveBtn,flex:1,background:"#1a1a1a",color:"#555"}}>Cancelar</button>
      </div>
    </div>
  );
}

function HabitoItem({ h, color, grupoLabel, onEdit, onDelete }) {
  const [conf,setConf]=useState(false);
  return (
    <div style={S.habitCard}>
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <div style={{ width:3, borderRadius:4, background:color, alignSelf:"stretch", flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:11, color, fontFamily:"monospace", fontWeight:600 }}>{grupoLabel}</span>
            <span style={{ fontSize:10, color:"#333" }}>{fmtShort(h.date)}</span>
          </div>
          <p style={{ fontSize:15, fontWeight:700, margin:"0 0 4px", fontFamily:"var(--fd)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.habito}</p>
          {h.comentario && <p style={{ fontSize:11, color:"#555", margin:"0 0 6px", fontStyle:"italic" }}>{h.comentario}</p>}
          <div style={{ display:"flex", gap:10 }}>
            {h.veces>0     && <span style={{ fontSize:11, color:"#444", fontFamily:"monospace" }}>×{h.veces}</span>}
            {h.duracion>0  && <span style={{ fontSize:11, color:"#444", fontFamily:"monospace" }}>⏱ {h.duracion}min</span>}
            {h.distancia>0 && <span style={{ fontSize:11, color:"#444", fontFamily:"monospace" }}>📍 {h.distancia}km</span>}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
          <button onClick={()=>onEdit(h)} style={S.iconBtn}>✎</button>
          {conf
            ? <button onClick={()=>onDelete(h.id)} style={{...S.iconBtn,color:"#FF6B6B",fontSize:10,border:"1px solid #FF6B6B44",borderRadius:6,padding:"2px 8px"}}>¿Borrar?</button>
            : <button onClick={()=>{setConf(true);setTimeout(()=>setConf(false),3000);}} style={{...S.iconBtn,color:"#2a2a2a"}}>⋯</button>
          }
        </div>
      </div>
    </div>
  );
}

function HabitosTab({ habitosData, setHabitosData, habGroups, scriptUrl }) {
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState(null);
  const [filtro,setFiltro]=useState(null);

  const sorted   = [...habitosData].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const filtered = filtro?sorted.filter(h=>h.grupo===filtro):sorted;

  const save = async h => {
    const upd=editing?habitosData.map(x=>x.id===h.id?h:x):[h,...habitosData];
    setHabitosData(upd); await sSet(SK.habitos,upd);
    setShowForm(false); setEditing(null);
    await syncToSheet(scriptUrl,{type:"habitos",rows:upd});
  };
  const del = async id => {
    const upd=habitosData.filter(h=>h.id!==id);
    setHabitosData(upd); await sSet(SK.habitos,upd);
  };

  if (showForm||editing) return <HabitoForm initial={editing} habGroups={habGroups} onSave={save} onCancel={()=>{setShowForm(false);setEditing(null);}}/>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <p style={S.heading}>Actividades</p>
        <button onClick={()=>setShowForm(true)} style={{...S.chip,background:"#C9B1FF18",color:"#C9B1FF",border:"1.5px solid #C9B1FF44",padding:"8px 16px"}}>+ Nueva</button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
        <button onClick={()=>setFiltro(null)} style={{...S.chip,whiteSpace:"nowrap",background:!filtro?"#FFFFFF15":"transparent",border:`1.5px solid ${!filtro?"#666":"#222"}`,color:!filtro?"#ccc":"#444"}}>Todos</button>
        {habGroups.map(g=>(
          <button key={g.id} onClick={()=>setFiltro(filtro===g.id?null:g.id)}
            style={{...S.chip,whiteSpace:"nowrap",background:filtro===g.id?g.color+"18":"transparent",border:`1.5px solid ${filtro===g.id?g.color:"#222"}`,color:filtro===g.id?g.color:"#444"}}>
            {g.emoji} {g.label}
          </button>
        ))}
      </div>
      {filtered.length===0
        ?<p style={{ color:"#222", textAlign:"center", marginTop:60, fontSize:13 }}>Sin actividades registradas</p>
        :<div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(h=>{const g=habGroups.find(x=>x.id===h.grupo);return <HabitoItem key={h.id} h={h} color={g?.color||"#888"} grupoLabel={`${g?.emoji||""} ${g?.label||h.grupo}`} onEdit={setEditing} onDelete={del}/>;} )}
        </div>
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG — EDITORS
// ═══════════════════════════════════════════════════════════════════════════════

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
      {PALETTE.map(c=>(
        <button key={c} onClick={()=>onChange(c)} style={{ width:28, height:28, borderRadius:"50%", background:c, border:`2.5px solid ${value===c?"#fff":"transparent"}`, cursor:"pointer", boxShadow:value===c?`0 0 0 1px ${c}`:"none", transition:"border .15s" }}/>
      ))}
    </div>
  );
}

function ConfirmBtn({ onConfirm, label="✕", confirmLabel="¿Borrar?", style: extraStyle={} }) {
  const [conf, setConf] = useState(false);
  return conf
    ? <button onClick={()=>{onConfirm();setConf(false);}} style={{...S.iconBtn,color:"#FF6B6B",fontSize:10,border:"1px solid #FF6B6B44",borderRadius:6,padding:"2px 8px",...extraStyle}}>{confirmLabel}</button>
    : <button onClick={()=>{setConf(true);setTimeout(()=>setConf(false),3000);}} style={{...S.iconBtn,color:"#FF6B6B44",...extraStyle}}>{label}</button>;
}

function KpiFieldEditor({ field, onUpdate, onDelete, color }) {
  const [open,setOpen]=useState(false);
  const pos = field.positive !== false;

  return (
    <div style={{ background:"#0e0e0e", borderRadius:8, border:"1px solid #1a1a1a", marginBottom:6 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px" }}>
        {/* polarity indicator */}
        <span style={{ fontSize:12 }}>{pos?"✅":"⛔"}</span>
        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:color+"18", color, border:`1px solid ${color}33`, fontFamily:"monospace" }}>
          {FIELD_TYPES.find(t=>t.id===field.type)?.label||field.type}
        </span>
        <span style={{ flex:1, fontSize:13, color:"#bbb" }}>{field.label}</span>
        <button onClick={()=>setOpen(p=>!p)} style={{...S.iconBtn,fontSize:12}}>✎</button>
        <ConfirmBtn onConfirm={onDelete}/>
      </div>
      {open && (
        <div style={{ padding:"0 10px 10px", borderTop:"1px solid #1a1a1a" }}>
          <label style={{...S.lbl,marginTop:8}}>Nombre</label>
          <input value={field.label} onChange={e=>onUpdate({...field,label:e.target.value})} style={{...S.dateIn,width:"100%",marginBottom:10}}/>

          <label style={S.lbl}>Tipo</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            {FIELD_TYPES.map(t=>(
              <button key={t.id} onClick={()=>onUpdate({...field,type:t.id})}
                style={{...S.chip,fontSize:11,background:field.type===t.id?color+"20":"transparent",border:`1.5px solid ${field.type===t.id?color:"#222"}`,color:field.type===t.id?color:"#444"}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Positivo / Negativo — solo para toggle */}
          {field.type==="toggle" && (<>
            <label style={S.lbl}>Naturaleza</label>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <button onClick={()=>onUpdate({...field,positive:true})}
                style={{...S.chip,background:pos?"#A8E06320":"transparent",border:`1.5px solid ${pos?"#A8E063":"#222"}`,color:pos?"#A8E063":"#444"}}>
                ✅ Positivo — ✓ es bueno
              </button>
              <button onClick={()=>onUpdate({...field,positive:false})}
                style={{...S.chip,background:!pos?"#FF6B6B20":"transparent",border:`1.5px solid ${!pos?"#FF6B6B":"#222"}`,color:!pos?"#FF6B6B":"#444"}}>
                ⛔ Negativo — ✕ es bueno
              </button>
            </div>
          </>)}

          {(field.type==="counter"||field.type==="rating") && (<>
            <label style={S.lbl}>Máximo</label>
            <input type="number" value={field.max||5} min={1} max={20}
              onChange={e=>onUpdate({...field,max:parseInt(e.target.value)})}
              style={{...S.numIn,width:80}}/>
          </>)}
        </div>
      )}
    </div>
  );
}

function KpiGroupEditor({ group, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [open,setOpen]=useState(false);
  const [newFLbl,setNewFLbl]=useState("");
  const [newFTyp,setNewFTyp]=useState("toggle");

  const addField = () => {
    if (!newFLbl.trim()) return;
    const f={id:uid(),label:newFLbl.trim(),type:newFTyp,positive:true,...(newFTyp==="counter"?{max:5}:{}),...(newFTyp==="rating"?{max:10}:{})};
    onUpdate({...group,fields:[...group.fields,f]});
    setNewFLbl(""); setNewFTyp("toggle");
  };

  return (
    <div style={{...S.card,marginBottom:8}}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px" }}>
        <span style={{ fontSize:20 }}>{group.emoji}</span>
        <span style={{...S.cardLabel,flex:1}}>{group.label}</span>
        <div style={{ display:"flex", gap:4 }}>
          {!isFirst && <button onClick={onMoveUp}   style={{...S.iconBtn,fontSize:12}}>↑</button>}
          {!isLast  && <button onClick={onMoveDown}  style={{...S.iconBtn,fontSize:12}}>↓</button>}
          <button onClick={()=>setOpen(p=>!p)} style={{...S.iconBtn,color:"#C9B1FF"}}>✎</button>
          <ConfirmBtn onConfirm={onDelete}/>
        </div>
      </div>
      {open && (
        <div style={{ borderTop:"1px solid #191919", padding:"12px 14px" }}>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <div style={{ flex:"0 0 60px" }}>
              <label style={S.lbl}>Emoji</label>
              <input value={group.emoji} maxLength={2} onChange={e=>onUpdate({...group,emoji:e.target.value})} style={{...S.dateIn,textAlign:"center",fontSize:20,padding:"6px 4px"}}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={S.lbl}>Nombre</label>
              <input value={group.label} onChange={e=>onUpdate({...group,label:e.target.value})} style={{...S.dateIn,width:"100%"}}/>
            </div>
          </div>
          <label style={S.lbl}>Color</label>
          <ColorPicker value={group.color} onChange={c=>onUpdate({...group,color:c})}/>
          <div style={{...S.row,marginTop:12}}>
            <span style={S.rowLabel}>Expandido por defecto</span>
            <button onClick={()=>onUpdate({...group,openByDefault:!group.openByDefault})}
              style={{...S.pill,border:`1.5px solid ${group.openByDefault?group.color:"#222"}`,background:group.openByDefault?group.color+"20":"transparent",color:group.openByDefault?group.color:"#444"}}>
              {group.openByDefault?"Sí":"No"}
            </button>
          </div>
          <label style={{...S.lbl,marginTop:14}}>Campos ({group.fields.length})</label>
          {group.fields.map(f=>(
            <KpiFieldEditor key={f.id} field={f} color={group.color}
              onUpdate={upd=>onUpdate({...group,fields:group.fields.map(x=>x.id===f.id?upd:x)})}
              onDelete={()=>onUpdate({...group,fields:group.fields.filter(x=>x.id!==f.id)})}/>
          ))}
          <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
            <input value={newFLbl} onChange={e=>setNewFLbl(e.target.value)} placeholder="Nombre del campo..."
              onKeyDown={e=>e.key==="Enter"&&addField()} style={{...S.dateIn,flex:1,minWidth:120}}/>
            {FIELD_TYPES.map(t=>(
              <button key={t.id} onClick={()=>setNewFTyp(t.id)}
                style={{...S.chip,fontSize:10,background:newFTyp===t.id?group.color+"20":"transparent",border:`1.5px solid ${newFTyp===t.id?group.color:"#222"}`,color:newFTyp===t.id?group.color:"#444"}}>
                {t.label}
              </button>
            ))}
            <button onClick={addField} style={{...S.chip,background:"#A8E06318",color:"#A8E063",border:"1px solid #A8E06344"}}>+ Añadir</button>
          </div>
        </div>
      )}
    </div>
  );
}

function HabGroupEditor({ group, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [open,setOpen]=useState(false);
  const [newH,setNewH]=useState("");
  const [editIdx,setEditIdx]=useState(null);
  const [editVal,setEditVal]=useState("");

  return (
    <div style={{...S.card,marginBottom:8}}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px" }}>
        <span style={{ fontSize:20 }}>{group.emoji}</span>
        <span style={{...S.cardLabel,flex:1,color:group.color}}>{group.label}</span>
        <span style={{ fontSize:10, color:"#333", fontFamily:"monospace" }}>{group.habitos.length}</span>
        <div style={{ display:"flex", gap:4 }}>
          {!isFirst && <button onClick={onMoveUp}   style={{...S.iconBtn,fontSize:12}}>↑</button>}
          {!isLast  && <button onClick={onMoveDown}  style={{...S.iconBtn,fontSize:12}}>↓</button>}
          <button onClick={()=>setOpen(p=>!p)} style={{...S.iconBtn,color:"#C9B1FF"}}>✎</button>
          <ConfirmBtn onConfirm={onDelete}/>
        </div>
      </div>
      {open && (
        <div style={{ borderTop:"1px solid #191919", padding:"12px 14px" }}>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <div style={{ flex:"0 0 60px" }}>
              <label style={S.lbl}>Emoji</label>
              <input value={group.emoji} maxLength={2} onChange={e=>onUpdate({...group,emoji:e.target.value})} style={{...S.dateIn,textAlign:"center",fontSize:20,padding:"6px 4px"}}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={S.lbl}>Nombre</label>
              <input value={group.label} onChange={e=>onUpdate({...group,label:e.target.value})} style={{...S.dateIn,width:"100%"}}/>
            </div>
          </div>
          <label style={S.lbl}>Color</label>
          <ColorPicker value={group.color} onChange={c=>onUpdate({...group,color:c})}/>
          <label style={{...S.lbl,marginTop:14}}>Actividades</label>
          {group.habitos.map((h,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
              {editIdx===i
                ?<>
                  <input value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus
                    onKeyDown={e=>{if(e.key==="Enter"){onUpdate({...group,habitos:group.habitos.map((x,xi)=>xi===i?editVal:x)});setEditIdx(null);}}}
                    style={{...S.dateIn,flex:1}}/>
                  <button onClick={()=>{onUpdate({...group,habitos:group.habitos.map((x,xi)=>xi===i?editVal:x)});setEditIdx(null);}} style={{...S.chip,background:"#A8E06318",color:"#A8E063",border:"1px solid #A8E06344",fontSize:11}}>✓</button>
                  <button onClick={()=>setEditIdx(null)} style={S.iconBtn}>✕</button>
                </>
                :<>
                  <span style={{ flex:1, fontSize:12, color:"#aaa", padding:"6px 8px", background:"#0e0e0e", borderRadius:6 }}>{h}</span>
                  <button onClick={()=>{setEditIdx(i);setEditVal(h);}} style={S.iconBtn}>✎</button>
                  <ConfirmBtn onConfirm={()=>onUpdate({...group,habitos:group.habitos.filter((_,xi)=>xi!==i)})}/>
                </>
              }
            </div>
          ))}
          <div style={{ display:"flex", gap:6, marginTop:6 }}>
            <input value={newH} onChange={e=>setNewH(e.target.value)} placeholder="Nueva actividad..."
              onKeyDown={e=>{if(e.key==="Enter"&&newH.trim()){onUpdate({...group,habitos:[...group.habitos,newH.trim()]});setNewH("");}}}
              style={{...S.dateIn,flex:1}}/>
            <button onClick={()=>{if(newH.trim()){onUpdate({...group,habitos:[...group.habitos,newH.trim()]});setNewH("");}}}
              style={{...S.chip,background:"#A8E06318",color:"#A8E063",border:"1px solid #A8E06344"}}>+</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ConfigTab({ kpiGroups, setKpiGroups, habGroups, setHabGroups, scriptUrl, setScriptUrl }) {
  const [section,setSection]=useState("kpi");
  const [url,setUrl]=useState(scriptUrl||"");
  const [urlSaved,setUrlSaved]=useState(false);
  const [syncing,setSyncing]=useState(false);
  const [syncMsg,setSyncMsg]=useState("");

  const saveKpi = async upd => { setKpiGroups(upd); await sSet(SK.kpiGroups,upd); await pushConfig(upd, habGroups); };
  const saveHab = async upd => { setHabGroups(upd); await sSet(SK.habGroups,upd); await pushConfig(kpiGroups, upd); };

  const pushConfig = async (kg, hg) => {
    await syncToSheet(scriptUrl, { type:"config", kpiGroups:kg, habGroups:hg });
    await syncToSheet(scriptUrl, { type:"kpi_labels", groups:kg });
  };

  const moveKpi = (i,dir) => { const a=[...kpiGroups]; [a[i],a[i+dir]]=[a[i+dir],a[i]]; saveKpi(a); };
  const moveHab = (i,dir) => { const a=[...habGroups]; [a[i],a[i+dir]]=[a[i+dir],a[i]]; saveHab(a); };

  const saveUrl = async () => { setScriptUrl(url); await sSet(SK.scriptUrl,url); setUrlSaved(true); setTimeout(()=>setUrlSaved(false),2000); };

  const forceSyncConfig = async () => {
    setSyncing(true); setSyncMsg("");
    await pushConfig(kpiGroups, habGroups);
    setSyncing(false); setSyncMsg("✓ Configuración enviada a Sheets");
    setTimeout(()=>setSyncMsg(""),3000);
  };

  const SECTIONS=[{id:"kpi",label:"KPIs"},{id:"hab",label:"Hábitos"},{id:"sheet",label:"Sheets"}];

  return (
    <div>
      <p style={S.heading}>Configuración</p>
      <div style={{ display:"flex", gap:6, marginBottom:20, background:"#111", borderRadius:12, padding:4 }}>
        {SECTIONS.map(sec=>(
          <button key={sec.id} onClick={()=>setSection(sec.id)}
            style={{ flex:1, padding:"8px 0", borderRadius:9, border:"none", cursor:"pointer", fontFamily:"var(--fd)", fontSize:13, fontWeight:600, transition:"all .2s",
              background:section===sec.id?"#C9B1FF":"transparent", color:section===sec.id?"#111":"#444" }}>
            {sec.label}
          </button>
        ))}
      </div>

      {section==="kpi" && (
        <div>
          <p style={{ fontSize:11, color:"#444", marginBottom:14, lineHeight:1.6 }}>
            ✅ = campo positivo (✓ verde) · ⛔ = campo negativo (✕ verde)
          </p>
          {kpiGroups.map((g,i)=>(
            <KpiGroupEditor key={g.id} group={g} isFirst={i===0} isLast={i===kpiGroups.length-1}
              onUpdate={upd=>saveKpi(kpiGroups.map((x,xi)=>xi===i?upd:x))}
              onDelete={()=>saveKpi(kpiGroups.filter((_,xi)=>xi!==i))}
              onMoveUp={()=>moveKpi(i,-1)} onMoveDown={()=>moveKpi(i,1)}/>
          ))}
          <button onClick={()=>saveKpi([...kpiGroups,{id:uid(),label:"Nuevo grupo",emoji:"⭐",color:"#C9B1FF",openByDefault:false,fields:[]}])}
            style={{...S.saveBtn,background:"transparent",border:"1px dashed #333",color:"#444",marginTop:4}}>
            + Nuevo grupo KPI
          </button>
        </div>
      )}

      {section==="hab" && (
        <div>
          {habGroups.map((g,i)=>(
            <HabGroupEditor key={g.id} group={g} isFirst={i===0} isLast={i===habGroups.length-1}
              onUpdate={upd=>saveHab(habGroups.map((x,xi)=>xi===i?upd:x))}
              onDelete={()=>saveHab(habGroups.filter((_,xi)=>xi!==i))}
              onMoveUp={()=>moveHab(i,-1)} onMoveDown={()=>moveHab(i,1)}/>
          ))}
          <button onClick={()=>saveHab([...habGroups,{id:uid(),label:"Nueva categoría",emoji:"✨",color:"#FFD93D",habitos:[]}])}
            style={{...S.saveBtn,background:"transparent",border:"1px dashed #333",color:"#444",marginTop:4}}>
            + Nueva categoría
          </button>
        </div>
      )}

      {section==="sheet" && (
        <div>
          <div style={S.card}>
            <p style={{ fontSize:13, fontWeight:700, color:"#ccc", margin:"0 0 6px", fontFamily:"var(--fd)" }}>🔗 Google Sheets</p>
            <p style={{ fontSize:11, color:"#444", margin:"0 0 12px", lineHeight:1.6 }}>URL del Apps Script. Los datos y la configuración se sincronizan automáticamente.</p>
            <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..."
              style={{...S.dateIn,width:"100%",marginBottom:10,fontSize:12}}/>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={saveUrl} style={{...S.chip,background:urlSaved?"#A8E06318":"#C9B1FF18",color:urlSaved?"#A8E063":"#C9B1FF",border:`1px solid ${urlSaved?"#A8E06344":"#C9B1FF44"}`}}>
                {urlSaved?"✓ Guardada":"Guardar URL"}
              </button>
              <button onClick={forceSyncConfig} style={{...S.chip,background:"#FFD93D18",color:"#FFD93D",border:"1px solid #FFD93D44"}}>
                {syncing?"Enviando...":"↑ Sincronizar config"}
              </button>
            </div>
            {syncMsg && <p style={{ fontSize:12, color:"#A8E063", marginTop:8 }}>{syncMsg}</p>}
          </div>
          <div style={S.card}>
            <p style={{ fontSize:13, fontWeight:700, color:"#ccc", margin:"0 0 10px", fontFamily:"var(--fd)" }}>📋 Estructura de la Sheet</p>
            {["Hoja KPIs: Fila 1 = IDs técnicos (nunca cambian) · Fila 2 = Labels actuales · Fila 3+ = datos","Hoja Hábitos: una fila por actividad registrada","Hoja Configuración: volcado completo de grupos, campos, colores y propiedades","Los labels de fila 2 se actualizan automáticamente al guardar cambios en Config"].map((s,i)=>(
              <p key={i} style={{ fontSize:12, color:"#444", margin:"4px 0", lineHeight:1.7 }}>{s}</p>
            ))}
          </div>
          <div style={S.card}>
            <p style={{ fontSize:13, fontWeight:700, color:"#ccc", margin:"0 0 10px", fontFamily:"var(--fd)" }}>⚙️ Configurar Apps Script</p>
            {["1. Google Sheet → Extensiones → Apps Script","2. Pega el archivo Code.gs adjunto","3. Implementar → Nueva implementación → App web","4. Ejecutar como: Yo · Acceso: Cualquiera","5. Autoriza y copia la URL","6. Pégala arriba → Guardar URL → Sincronizar config","7. iPhone: Safari → Compartir → Añadir a pantalla de inicio"].map((s,i)=>(
              <p key={i} style={{ fontSize:12, color:"#444", margin:"4px 0", lineHeight:1.7 }}>{s}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAV + APP
// ═══════════════════════════════════════════════════════════════════════════════

function Nav({ tab, setTab }) {
  return (
    <nav style={S.nav}>
      {[{id:"kpis",icon:"◎",label:"KPIs"},{id:"habitos",icon:"◈",label:"Hábitos"},{id:"cfg",icon:"◌",label:"Config"}].map(it=>(
        <button key={it.id} onClick={()=>setTab(it.id)} style={{...S.navBtn,color:tab===it.id?"#C9B1FF":"#2a2a2a",borderTop:`2px solid ${tab===it.id?"#C9B1FF":"transparent"}`}}>
          <span style={{ fontSize:18 }}>{it.icon}</span>
          <span style={{ fontSize:10, letterSpacing:".06em", textTransform:"uppercase" }}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [tab,         setTab]         = useState("kpis");
  const [kpiData,     setKpiData]     = useState({});
  const [habitosData, setHabitosData] = useState([]);
  const [kpiGroups,   setKpiGroups]   = useState(DEFAULT_KPI_GROUPS);
  const [habGroups,   setHabGroups]   = useState(DEFAULT_HAB_GROUPS);
  const [scriptUrl,   setScriptUrl]   = useState("");
  const [loaded,      setLoaded]      = useState(false);

  useEffect(()=>{
    async function load(){
      const [k,h,kg,hg,u]=await Promise.all([sGet(SK.kpis),sGet(SK.habitos),sGet(SK.kpiGroups),sGet(SK.habGroups),sGet(SK.scriptUrl)]);
      if(k)setKpiData(k); if(h)setHabitosData(h);
      if(kg)setKpiGroups(kg); if(hg)setHabGroups(hg);
      if(u)setScriptUrl(u);
      setLoaded(true);
    }
    load();
  },[]);

  if(!loaded) return <div style={{minHeight:"100vh",background:"#0A0A0A",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#C9B1FF"}}/></div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        :root{--fd:'Playfair Display',serif;--fb:'DM Sans',sans-serif;}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0A0A0A;}
        input[type=number]::-webkit-inner-spin-button{opacity:0.3;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.3);}
        ::-webkit-scrollbar{width:0;height:0;}
      `}</style>
      <div style={S.root}>
        <div style={S.glow1}/><div style={S.glow2}/>
        <div style={S.content}>
          {tab==="kpis"    && <KpiTab     kpiData={kpiData}         setKpiData={setKpiData}         kpiGroups={kpiGroups} scriptUrl={scriptUrl}/>}
          {tab==="habitos" && <HabitosTab habitosData={habitosData} setHabitosData={setHabitosData} habGroups={habGroups} scriptUrl={scriptUrl}/>}
          {tab==="cfg"     && <ConfigTab  kpiGroups={kpiGroups}     setKpiGroups={setKpiGroups}     habGroups={habGroups} setHabGroups={setHabGroups} scriptUrl={scriptUrl} setScriptUrl={setScriptUrl}/>}
        </div>
        <Nav tab={tab} setTab={setTab}/>
      </div>
    </>
  );
}

const S={
  root:    {minHeight:"100vh",background:"#0A0A0A",color:"#E8E4DC",fontFamily:"var(--fb,'DM Sans',sans-serif)",position:"relative",overflow:"hidden"},
  glow1:   {position:"fixed",top:-120,left:-80,width:340,height:340,borderRadius:"50%",background:"radial-gradient(circle,#C9B1FF10,transparent 70%)",pointerEvents:"none",zIndex:0},
  glow2:   {position:"fixed",bottom:-100,right:-80,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,#4ECDC410,transparent 70%)",pointerEvents:"none",zIndex:0},
  content: {maxWidth:480,margin:"0 auto",padding:"28px 16px 96px",position:"relative",zIndex:1},
  eyebrow: {fontSize:10,letterSpacing:".18em",color:"#333",textTransform:"uppercase",margin:"0 0 6px"},
  heading: {fontSize:22,fontWeight:800,margin:"0 0 4px",fontFamily:"var(--fd)",color:"#E8E4DC",lineHeight:1.2,textTransform:"capitalize"},
  lbl:     {fontSize:10,color:"#333",letterSpacing:".1em",textTransform:"uppercase",display:"block",marginBottom:6},
  row:     {display:"flex",justifyContent:"space-between",alignItems:"center",gap:12},
  rowLabel:{fontSize:13,color:"#888",flex:1},
  card:    {background:"#111",borderRadius:14,border:"1px solid #191919",overflow:"hidden"},
  cardHdr: {width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"none",border:"none",cursor:"pointer",color:"#E8E4DC"},
  cardLabel:{fontSize:14,fontWeight:600,fontFamily:"var(--fd)",color:"#D8D4CC"},
  cardBody: {padding:"12px 16px 16px",display:"flex",flexDirection:"column",gap:14,borderTop:"1px solid #191919"},
  pill:    {fontSize:13,padding:"5px 14px",borderRadius:20,cursor:"pointer",fontWeight:700,fontFamily:"monospace",transition:"all .15s"},
  chip:    {fontSize:12,padding:"6px 12px",borderRadius:20,cursor:"pointer",fontFamily:"var(--fb)",transition:"all .15s"},
  cBtn:    {background:"#191919",border:"1px solid #252525",color:"#666",fontSize:18,width:32,height:32,borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  cVal:    {fontSize:18,fontFamily:"monospace",fontWeight:800,width:50,textAlign:"center",border:"1px solid",borderRadius:8,padding:"3px 0",transition:"color .2s,border-color .2s,box-shadow .2s"},
  numIn:   {background:"#111",border:"1.5px solid",borderRadius:8,fontSize:15,padding:"7px 10px",fontFamily:"monospace",fontWeight:700,outline:"none",textAlign:"right",transition:"border-color .2s,color .2s"},
  dateIn:  {background:"#111",border:"1px solid #252525",borderRadius:8,color:"#888",fontSize:13,padding:"8px 12px",fontFamily:"monospace",outline:"none",flex:1},
  arrow:   {background:"none",border:"1px solid #1e1e1e",color:"#555",fontSize:20,width:38,height:38,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  microBtn:{background:"none",border:"1px solid #1e1e1e",color:"#333",fontSize:11,padding:"5px 12px",borderRadius:20,cursor:"pointer"},
  saveBtn: {display:"block",width:"100%",border:"none",color:"#111",fontWeight:700,fontFamily:"var(--fd)",fontSize:15,padding:"15px",borderRadius:14,cursor:"pointer",transition:"background .3s"},
  formWrap:{background:"#111",borderRadius:16,border:"1px solid #1e1e1e",padding:18},
  habitCard:{background:"#111",border:"1px solid #191919",borderRadius:12,padding:"12px 14px"},
  iconBtn: {background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:14,padding:"3px 5px",transition:"color .2s"},
  nav:     {position:"fixed",bottom:0,left:0,right:0,background:"rgba(10,10,10,0.97)",borderTop:"1px solid #191919",display:"flex",zIndex:100,padding:"8px 0 14px",backdropFilter:"blur(20px)"},
  navBtn:  {flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",borderTop:"2px solid transparent",cursor:"pointer",padding:"6px 0",fontFamily:"var(--fb)",transition:"color .2s,border-color .2s"},
};