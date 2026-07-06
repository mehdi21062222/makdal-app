import { useState, useRef, useEffect } from "react";

const C = {
  bg:"#FFF5F7", white:"#FFFFFF", magenta:"#E91E8C", magentaLight:"#F06AAD",
  magentaPale:"#FCE4F1", magentaDark:"#B5166E", black:"#1A1A2E", blackSoft:"#2D2D44",
  gray:"#6B6B80", grayLight:"#F0EEF5", border:"#F0D6E8", green:"#10B981",
  red:"#F43F5E", yellow:"#FBBF24", purple:"#8B5CF6",
};

const RESTAURANTS = [
  { id:"oujda",  label:"Oujda",  emoji:"🏙️", color:C.magenta },
  { id:"saidia", label:"Saïdia", emoji:"🏖️", color:"#0EA5E9" },
];

const CAT_COLORS = {
  "Fournisseurs alimentaires":C.magenta,
  "Gaz / Énergie":C.yellow,
  "Emballages / Consommables":C.purple,
  "Loyer / Charges fixes":C.green,
  "Autre":C.gray,
};
const CATS = Object.keys(CAT_COLORS);
const ROLES = ["Caissier","Cuisine","Livraison","Service","Manager"];
const ROLE_ICON = { Caissier:"💳", Cuisine:"👨‍🍳", Livraison:"🛵", Service:"🙋", Manager:"⭐" };

const WEEK_CA = [
  {j:"Lun",ca:4200},{j:"Mar",ca:5100},{j:"Mer",ca:4750},
  {j:"Jeu",ca:6300},{j:"Ven",ca:7800},{j:"Sam",ca:9200},{j:"Dim",ca:3500},
];

function getTodayStr() {
  const d = new Date();
  if (d.getHours() < 10) d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
function getRestaurantDay() {
  const now = new Date();
  if (now.getHours() < 10) now.setDate(now.getDate()-1);
  const idx = (now.getDay()+6)%7;
  const noms = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  const nomsLongs = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
  return { idx, nom:noms[idx], nomLong:nomsLongs[idx] };
}
const TODAY = getRestaurantDay();
const TODAY_IDX = TODAY.idx;

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.35)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:C.white,borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:17,color:C.black}}>{title}</div>
          <button onClick={onClose} style={{background:C.grayLight,border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:C.gray}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({label,children}) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:C.gray,marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
}

const initRestaurantData = () => ({
  employees: [],
  avances: [],
  historique: {},
});

export default function MakDal() {
  const [activeResto, setActiveResto] = useState("oujda");
  const [restoData, setRestoData] = useState(() => {
    try {
      const saved = localStorage.getItem('makdal_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(k => { delete parsed[k].caJour; delete parsed[k].depenses; });
        return parsed;
      }
    } catch(e) {}
    return { oujda: initRestaurantData(), saidia: initRestaurantData() };
  });

  const [page, setPage] = useState("dashboard");
  const [caInput, setCaInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [notif, setNotif] = useState(null);
  const [activeTeam, setActiveTeam] = useState("A");
  const [activePeriod, setActivePeriod] = useState("Semaine");
  const [activePersoTab, setActivePersoTab] = useState("equipes");
  const [activeRapportTab, setActiveRapportTab] = useState("stats");
  const [calMonth, setCalMonth] = useState(()=>{const d=new Date();return{year:d.getFullYear(),month:d.getMonth()};});
  const [calSelectedDay, setCalSelectedDay] = useState(null);
  const [calCaInput, setCalCaInput] = useState("");

  const [empModal, setEmpModal] = useState(null);
  const [depModal, setDepModal] = useState(null);
  const [avanceModal, setAvanceModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const fileRef = useRef();

  useEffect(() => {
    try {
      localStorage.setItem('makdal_data', JSON.stringify(restoData));
    } catch(e) {}
  }, [restoData]);

  const todayStr = getTodayStr();

  const emptyEmp = {name:"",role:"Caissier",team:"A",salaire:""};
  const emptyDep = {fournisseur:"",montant:"",categorie:"Fournisseurs alimentaires",produits:"",date:todayStr};
  const emptyAvance = {empId:"",montant:"",date:todayStr,note:"",rembourse:false};
  const [empForm, setEmpForm] = useState(emptyEmp);
  const [depForm, setDepForm] = useState(emptyDep);
  const [avanceForm, setAvanceForm] = useState(emptyAvance);

  const rd = restoData[activeResto];
  const setRd = (updater) => setRestoData(prev => ({
    ...prev,
    [activeResto]: typeof updater === "function" ? updater(prev[activeResto]) : updater
  }));

  const { employees, avances, historique } = rd;

  const todayEntry = historique[todayStr] || { ca: 0, depenses: [] };
  const caJour = todayEntry.ca || 0;
  const depenses = todayEntry.depenses || [];

  const caVal = Number(caJour)||0;
  const totalDep = depenses.reduce((s,d)=>s+Number(d.montant),0);
  const benefice = caVal - totalDep;
  const teamA = employees.filter(e=>e.team==="A");
  const teamB = employees.filter(e=>e.team==="B");
  const presentsA = teamA.filter(e=>e.present).length;
  const presentsB = teamB.filter(e=>e.present).length;
  const resto = RESTAURANTS.find(r=>r.id===activeResto);

  const notify = (msg) => { setNotif(msg); setTimeout(()=>setNotif(null),2800); };

  const setCAForDate = (date, value) => {
    setRd(p => {
      const day = p.historique[date] || { ca: 0, depenses: [] };
      return { ...p, historique: { ...p.historique, [date]: { ...day, ca: value } } };
    });
  };

  const updateCA = () => {
    const v = parseFloat(caInput);
    if (!isNaN(v)&&v>=0) {
      setCAForDate(todayStr, v);
      setCaInput(""); notify("CA mis à jour ✓");
    }
  };

  const saveCalCA = () => {
    const v = parseFloat(calCaInput);
    if (!isNaN(v) && v>=0 && calSelectedDay) {
      setCAForDate(calSelectedDay, v);
      setCalCaInput("");
      notify(`CA du ${calSelectedDay} mis à jour ✓`);
    }
  };

  const handleScan = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    setScanning(true); setScanResult(null);
    const base64 = await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.readAsDataURL(file);});
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:file.type,data:base64}},
            {type:"text",text:`Analyse cette facture en détail. Réponds UNIQUEMENT avec un JSON valide sans markdown:\n{"fournisseur":"...","date":"YYYY-MM-DD","montant_total":0,"categorie":"Fournisseurs alimentaires|Gaz / Énergie|Emballages / Consommables|Loyer / Charges fixes|Autre","produits":[{"nom":"...","quantite":"...","prix_unitaire":0,"prix_total":0}]}\nExtrait chaque produit avec son nom, quantité, prix unitaire et prix total. Le montant_total doit être la somme de tous les produits.`}
          ]}]
        })
      });
      const data = await resp.json();
      const txt = data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(txt);
      const produitsStr = (parsed.produits||[]).map(p=>`${p.nom}${p.quantite?" x"+p.quantite:""} — ${p.prix_total||p.prix_unitaire||0} DH`).join(", ");
      setDepForm({fournisseur:parsed.fournisseur||"",montant:String(parsed.montant_total||""),categorie:parsed.categorie||"Autre",produits:produitsStr,date:parsed.date||todayStr});
      setScanResult(parsed);
      setDepModal("add");
    } catch {
      notify("Impossible de lire la facture");
    }
    setScanning(false); e.target.value="";
  };

  const saveEmp = () => {
    if (!empForm.name.trim()) return;
    if (empModal==="add") setRd(p=>({...p,employees:[...p.employees,{...empForm,id:Date.now(),present:true}]}));
    else setRd(p=>({...p,employees:p.employees.map(e=>e.id===empModal.id?{...empForm,id:empModal.id}:e)}));
    notify(empModal==="add"?"Employé ajouté ✓":"Modifié ✓"); setEmpModal(null);
  };
  const deleteEmp = (id) => { setRd(p=>({...p,employees:p.employees.filter(e=>e.id!==id)})); setEmpModal(null); notify("Supprimé"); };
  const togglePresence = (id) => setRd(p=>({...p,employees:p.employees.map(e=>e.id===id?{...e,present:!e.present}:e)}));

  const saveDep = () => {
    if (!depForm.fournisseur.trim()||!depForm.montant) return;
    const targetDate = depForm.date || todayStr;
    const entry = {...depForm, date: targetDate, montant:Number(depForm.montant),produits:depForm.produits.split(",").map(s=>s.trim()).filter(Boolean)};
    setRd(p => {
      const newHist = { ...p.historique };
      if (depModal !== "add") {
        const oldDate = depModal.date;
        const oldDay = newHist[oldDate];
        if (oldDay) {
          newHist[oldDate] = { ...oldDay, depenses: oldDay.depenses.filter(d => d.id !== depModal.id) };
        }
      }
      const id = depModal === "add" ? Date.now() : depModal.id;
      const day = newHist[targetDate] || { ca: 0, depenses: [] };
      newHist[targetDate] = { ...day, depenses: [...day.depenses, { ...entry, id }] };
      return { ...p, historique: newHist };
    });
    notify(depModal==="add"?"Dépense ajoutée ✓":"Modifiée ✓"); setDepModal(null);
  };
  const deleteDep = (date, id) => {
    setRd(p => {
      const day = p.historique[date] || { ca: 0, depenses: [] };
      return { ...p, historique: { ...p.historique, [date]: { ...day, depenses: day.depenses.filter(d=>d.id!==id) } } };
    });
    setDepModal(null); notify("Supprimé");
  };

  const saveAvance = () => {
    if (!avanceForm.empId||!avanceForm.montant) return;
    const entry = {...avanceForm,montant:Number(avanceForm.montant),rembourse:false};
    if (avanceModal==="add") setRd(p=>({...p,avances:[...p.avances,{...entry,id:Date.now()}]}));
    else setRd(p=>({...p,avances:p.avances.map(a=>a.id===avanceModal.id?{...avanceForm,id:avanceModal.id,montant:Number(avanceForm.montant)}:a)}));
    notify(avanceModal==="add"?"Avance enregistrée ✓":"Modifiée ✓"); setAvanceModal(null);
  };
  const deleteAvance = (id) => { setRd(p=>({...p,avances:p.avances.filter(a=>a.id!==id)})); setAvanceModal(null); notify("Supprimé"); };
  const toggleRembourse = (id) => setRd(p=>({...p,avances:p.avances.map(a=>a.id===id?{...a,rembourse:!a.rembourse}:a)}));

  const nav = [
    {id:"dashboard",icon:"⊞",label:"Board"},
    {id:"depenses",icon:"🧾",label:"Dépenses"},
    {id:"personnel",icon:"👥",label:"Équipes"},
    {id:"rapports",icon:"📈",label:"Rapports"},
  ];

  const inpStyle = {background:C.grayLight,border:`1.5px solid ${C.border}`,color:C.black,borderRadius:12,padding:"12px 14px",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,width:"100%",outline:"none"};
  const selEl = (val,onChange,opts) => (
    <select value={val} onChange={e=>onChange(e.target.value)} style={inpStyle}>
      {opts.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.black,fontFamily:"'Plus Jakarta Sans',sans-serif",paddingBottom:90}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .card{background:${C.white};border:1.5px solid ${C.border};border-radius:20px;padding:18px;}
        .btn{background:${C.magenta};color:white;border:none;border-radius:12px;padding:12px 18px;font-family:inherit;font-weight:700;cursor:pointer;font-size:14px;transition:all .2s;}
        .btn:hover{filter:brightness(.9);}
        .btn-outline{background:white;color:${C.magenta};border:2px solid ${C.magenta};border-radius:12px;padding:10px 16px;font-family:inherit;font-weight:700;cursor:pointer;font-size:13px;}
        .btn-red{background:${C.red}18;color:${C.red};border:none;border-radius:10px;padding:10px 14px;font-family:inherit;font-weight:700;cursor:pointer;font-size:13px;}
        .btn-ghost{background:${C.grayLight};color:${C.gray};border:none;border-radius:10px;padding:9px 14px;font-family:inherit;cursor:pointer;font-size:12px;font-weight:600;}
        .fade{animation:fadeUp .3s ease;} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .tag{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        select{appearance:none;}
      `}</style>

      {notif && <div className="fade" style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:999,background:resto.color,color:"white",padding:"11px 22px",borderRadius:40,fontWeight:700,fontSize:13,boxShadow:`0 6px 24px ${resto.color}55`,whiteSpace:"nowrap"}}>{notif}</div>}

      <div style={{background:C.white,borderBottom:`1.5px solid ${C.border}`,padding:"12px 16px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${resto.color},${C.magentaDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🍔</div>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color:resto.color,letterSpacing:1}}>MAK'DAL</div>
              <div style={{fontSize:10,color:C.gray,marginTop:-2}}>{TODAY.nomLong} — Journée en cours</div>
            </div>
          </div>
        </div>

        <div style={{display:"flex",background:C.grayLight,borderRadius:12,padding:3,gap:3}}>
          {RESTAURANTS.map(r=>(
            <button key={r.id} onClick={()=>setActiveResto(r.id)}
              style={{flex:1,padding:"8px 10px",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,transition:"all .2s",
                background:activeResto===r.id?r.color:"transparent",
                color:activeResto===r.id?"white":C.gray}}>
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"16px 16px",maxWidth:500,margin:"0 auto"}}>

        {page==="dashboard" && <div className="fade">
          <div style={{background:`linear-gradient(135deg,${resto.color},${C.magentaDark})`,borderRadius:20,padding:20,marginBottom:16,position:"relative",overflow:"hidden",color:"white"}}>
            <div style={{position:"absolute",right:-20,top:-20,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,.08)"}}/>
            <div style={{fontSize:12,opacity:.85,marginBottom:4}}>💰 CA du jour — {resto.emoji} {resto.label}</div>
            <div style={{fontSize:38,fontWeight:800,fontFamily:"'Syne',sans-serif",letterSpacing:-1}}>
              {caVal>0?caVal.toLocaleString():"—"} <span style={{fontSize:16,opacity:.8}}>DH</span>
            </div>
            <div style={{display:"flex",gap:16,marginTop:10,fontSize:13}}>
              <span style={{opacity:.85}}>📤 <b>{totalDep.toLocaleString()} DH</b></span>
              <span style={{opacity:.85}}>✅ <b style={{color:benefice>=0?"#A7F3D0":"#FCA5A5"}}>{caVal>0?benefice.toLocaleString():"—"} DH</b></span>
            </div>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Mettre à jour le CA — {resto.emoji} {resto.label}</div>
            <div style={{fontSize:11,color:C.gray,marginBottom:8}}>S'applique à aujourd'hui ({todayStr}). Pour une autre date, utilise le Calendrier dans Rapports.</div>
            <div style={{display:"flex",gap:8}}>
              <input type="number" placeholder="Ex: 5500" value={caInput} onChange={e=>setCaInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&updateCA()} style={{...inpStyle,flex:1}}/>
              <button className="btn" onClick={updateCA} style={{background:resto.color,padding:"12px 18px"}}>OK</button>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div className="card" style={{borderLeft:`4px solid ${C.green}`}}>
              <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Bénéfice net</div>
              <div style={{fontSize:20,fontWeight:800,color:benefice>=0?C.green:C.red}}>{caVal>0?benefice.toLocaleString():"—"} <span style={{fontSize:12}}>DH</span></div>
            </div>
            <div className="card" style={{borderLeft:`4px solid ${C.purple}`}}>
              <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Équipes</div>
              <div style={{fontSize:20,fontWeight:800,color:C.purple}}>{presentsA+presentsB}<span style={{fontSize:13,color:C.gray,fontWeight:500}}>/{employees.length}</span></div>
              <div style={{fontSize:10,color:C.gray}}>présents</div>
            </div>
          </div>

          {caVal>0 && (()=>{
            const ratio = Math.round(totalDep*100/caVal);
            const color = ratio<=30?C.green:ratio<=50?C.yellow:C.red;
            const label = ratio<=30?"✅ Bien maîtrisées":ratio<=50?"⚠️ À surveiller":"🔴 Trop élevées";
            return (
              <div className="card" style={{marginBottom:16,borderLeft:`4px solid ${color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:11,color:C.gray,marginBottom:2}}>Ratio dépenses / CA</div>
                    <div style={{fontSize:11,fontWeight:700,color}}>{label}</div>
                  </div>
                  <div style={{fontSize:32,fontWeight:800,color}}>{ratio}<span style={{fontSize:16}}>%</span></div>
                </div>
                <div style={{background:C.grayLight,borderRadius:8,height:10,overflow:"hidden"}}>
                  <div style={{width:`${Math.min(ratio,100)}%`,height:"100%",background:color,borderRadius:8,transition:"width .8s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.gray,marginTop:5}}>
                  <span>0%</span><span style={{color:C.green,fontWeight:700}}>Idéal &lt; 40%</span><span>100%</span>
                </div>
              </div>
            );
          })()}

          <div className="card" style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>📅 CA cette semaine — {resto.emoji} {resto.label}</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:6,height:90}}>
              {WEEK_CA.map((d,i)=>{
                const max=Math.max(...WEEK_CA.map(x=>x.ca));
                const h=(d.ca/max)*74;
                const isToday=i===TODAY_IDX;
                return (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{fontSize:9,color:C.gray,fontWeight:600}}>{d.ca>=1000?`${(d.ca/1000).toFixed(1)}k`:d.ca}</div>
                    <div style={{width:"100%",height:h,background:isToday?`linear-gradient(180deg,${resto.color}99,${resto.color})`:C.magentaPale,borderRadius:"6px 6px 4px 4px"}}/>
                    <div style={{fontSize:10,color:isToday?resto.color:C.gray,fontWeight:isToday?800:500}}>{d.j}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700}}>🧾 Dernières dépenses — aujourd'hui</div>
              <button className="btn-ghost" onClick={()=>setPage("depenses")}>Tout voir</button>
            </div>
            {depenses.length===0
              ? <div style={{textAlign:"center",color:C.gray,fontSize:13,padding:"16px 0"}}>Aucune dépense</div>
              : depenses.slice(-3).map((d,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<Math.min(depenses.length,3)-1?`1px solid ${C.border}`:"none"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{d.fournisseur}</div>
                    <span className="tag" style={{background:CAT_COLORS[d.categorie]+"18",color:CAT_COLORS[d.categorie],marginTop:3}}>{d.categorie}</span>
                  </div>
                  <div style={{color:C.red,fontWeight:800,fontSize:15}}>-{Number(d.montant).toLocaleString()} DH</div>
                </div>
              ))
            }
          </div>
        </div>}

        {page==="depenses" && <div className="fade">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{fontSize:20,fontWeight:800}}>Dépenses {resto.emoji}</h2>
            <div style={{display:"flex",gap:8}}>
              <button className="btn-ghost" style={{fontSize:12}} onClick={()=>fileRef.current.click()}>{scanning?"⏳":"📷"} Scanner</button>
              <button className="btn" onClick={()=>{setDepForm({...emptyDep,date:todayStr});setScanResult(null);setDepModal("add");}} style={{fontSize:13,padding:"10px 14px",background:resto.color}}>+ Ajouter</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleScan}/>
          </div>

          {scanning && <div className="card" style={{textAlign:"center",padding:28,marginBottom:16}}>
            <div style={{fontSize:30,marginBottom:10}}>🔍</div>
            <div style={{fontWeight:700}}>Analyse de la facture…</div>
            <div style={{fontSize:12,color:C.gray,marginTop:4}}>Extraction produits, prix, fournisseur</div>
          </div>}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",background:C.white,borderRadius:14,marginBottom:16,border:`1.5px solid ${C.border}`}}>
            <span style={{color:C.gray,fontSize:13,fontWeight:600}}>Total aujourd'hui ({todayStr})</span>
            <span style={{color:C.red,fontWeight:800,fontSize:20}}>{totalDep.toLocaleString()} DH</span>
          </div>

          {depenses.length===0 && <div className="card" style={{textAlign:"center",padding:"40px 20px",color:C.gray}}>
            <div style={{fontSize:36,marginBottom:12}}>🧾</div>
            <div style={{fontWeight:700,marginBottom:6}}>Aucune dépense aujourd'hui</div>
            <div style={{fontSize:13}}>+ Ajouter ou scanner une facture</div>
          </div>}

          {depenses.map((d,i)=>(
            <div key={i} className="card" style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14}}>{d.fournisseur}</div>
                  <div style={{fontSize:11,color:C.gray,marginTop:2}}>{d.date}</div>
                  <span className="tag" style={{background:CAT_COLORS[d.categorie]+"18",color:CAT_COLORS[d.categorie],marginTop:5}}>{d.categorie}</span>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:C.red,fontWeight:800,fontSize:16,marginBottom:6}}>-{Number(d.montant).toLocaleString()} DH</div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn-ghost" style={{padding:"5px 10px",fontSize:12}} onClick={()=>{setDepForm({...d,produits:Array.isArray(d.produits)?d.produits.join(", "):d.produits});setDepModal(d);}}>✏️</button>
                    <button className="btn-red" style={{padding:"5px 10px",fontSize:12}} onClick={()=>setConfirmDel({type:"dep",id:d.id,date:d.date})}>🗑</button>
                  </div>
                </div>
              </div>
              {d.produits?.length>0 && <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8}}>
                {(Array.isArray(d.produits)?d.produits:[d.produits]).map((p,j)=>(
                  <div key={j} style={{fontSize:12,color:C.gray,padding:"2px 0"}}>• {p}</div>
                ))}
              </div>}
            </div>
          ))}
        </div>}

        {page==="personnel" && <div className="fade">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{fontSize:20,fontWeight:800}}>Équipes {resto.emoji}</h2>
            {activePersoTab==="equipes"
              ? <button className="btn" onClick={()=>{setEmpForm(emptyEmp);setEmpModal("add");}} style={{fontSize:13,padding:"10px 14px",background:resto.color}}>+ Employé</button>
              : <button className="btn" onClick={()=>{setAvanceForm(emptyAvance);setAvanceModal("add");}} style={{fontSize:13,padding:"10px 14px",background:resto.color}}>+ Avance</button>
            }
          </div>

          <div style={{display:"flex",background:C.grayLight,borderRadius:12,padding:4,marginBottom:16}}>
            {[{id:"equipes",label:"👥 Équipes"},{id:"avances",label:"💸 Avances"}].map(tab=>(
              <button key={tab.id} onClick={()=>setActivePersoTab(tab.id)} style={{flex:1,padding:"9px",border:"none",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,background:activePersoTab===tab.id?resto.color:"transparent",color:activePersoTab===tab.id?"white":C.gray}}>
                {tab.label}
              </button>
            ))}
          </div>

          {activePersoTab==="equipes" && <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {[{team:"A",label:"Équipe A",hours:"10h–20h",presents:presentsA,total:teamA.length},{team:"B",label:"Équipe B",hours:"20h–2h",presents:presentsB,total:teamB.length}].map(t=>(
                <div key={t.team} className="card" style={{borderTop:`4px solid ${t.team==="A"?resto.color:C.purple}`,cursor:"pointer",outline:activeTeam===t.team?`2px solid ${t.team==="A"?resto.color:C.purple}`:"none"}} onClick={()=>setActiveTeam(t.team)}>
                  <div style={{fontWeight:800,fontSize:14,color:t.team==="A"?resto.color:C.purple}}>{t.label}</div>
                  <div style={{fontSize:11,color:C.gray,marginBottom:8}}>{t.hours}</div>
                  <div style={{fontSize:24,fontWeight:800}}>{t.presents}<span style={{fontSize:12,color:C.gray,fontWeight:500}}>/{t.total}</span></div>
                  <div style={{fontSize:10,color:C.gray,marginBottom:8}}>présents</div>
                  <div style={{background:C.grayLight,borderRadius:6,height:5}}>
                    <div style={{width:t.total>0?`${(t.presents/t.total)*100}%`:"0%",height:"100%",background:t.team==="A"?resto.color:C.purple,borderRadius:6}}/>
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",background:C.grayLight,borderRadius:12,padding:4,marginBottom:14}}>
              {["A","B"].map(t=>(
                <button key={t} onClick={()=>setActiveTeam(t)} style={{flex:1,padding:"9px",border:"none",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,background:activeTeam===t?resto.color:"transparent",color:activeTeam===t?"white":C.gray}}>
                  Équipe {t}
                </button>
              ))}
            </div>

            {employees.filter(e=>e.team===activeTeam).length===0 && <div className="card" style={{textAlign:"center",padding:"40px 20px",color:C.gray}}>
              <div style={{fontSize:36,marginBottom:12}}>👥</div>
              <div style={{fontWeight:700,marginBottom:6}}>Aucun employé</div>
              <div style={{fontSize:13}}>Appuie sur + Employé</div>
            </div>}

            {employees.filter(e=>e.team===activeTeam).map(emp=>{
              const avEmp = avances.filter(a=>a.empId===String(emp.id)&&!a.rembourse);
              const totalAv = avEmp.reduce((s,a)=>s+Number(a.montant),0);
              return (
                <div key={emp.id} className="card" style={{marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:44,height:44,borderRadius:12,background:emp.present?C.magentaPale:C.grayLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:`2px solid ${emp.present?resto.color:C.border}`,flexShrink:0}}>
                      {ROLE_ICON[emp.role]||"👤"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14}}>{emp.name}</div>
                      <div style={{fontSize:12,color:C.gray}}>{emp.role}</div>
                      <div style={{display:"flex",gap:8,marginTop:2,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,color:resto.color,fontWeight:600}}>{Number(emp.salaire).toLocaleString()} DH</span>
                        {totalAv>0 && <span style={{fontSize:11,color:C.red,fontWeight:600}}>- {totalAv.toLocaleString()} avance</span>}
                        {totalAv>0 && <span style={{fontSize:11,color:C.green,fontWeight:700}}>= {(Number(emp.salaire)-totalAv).toLocaleString()} net</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                      <button onClick={()=>{togglePresence(emp.id);notify(`${emp.name} → ${!emp.present?"présent":"absent"}`);}}
                        style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"inherit",background:emp.present?`${C.green}18`:C.grayLight,color:emp.present?C.green:C.gray}}>
                        {emp.present?"✓ Présent":"Absent"}
                      </button>
                      <div style={{display:"flex",gap:4}}>
                        <button className="btn-ghost" style={{padding:"4px 8px",fontSize:11}} onClick={()=>{setEmpForm({...emp});setEmpModal(emp);}}>✏️</button>
                        <button className="btn-red" style={{padding:"4px 8px",fontSize:11}} onClick={()=>setConfirmDel({type:"emp",id:emp.id})}>🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {employees.length>0 && <div className="card" style={{marginTop:8,background:C.magentaPale,border:`1.5px solid ${resto.color}44`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.magentaDark,marginBottom:6}}>💼 Masse salariale — {resto.emoji} {resto.label}</div>
              <div style={{fontSize:26,fontWeight:800,color:resto.color}}>{employees.reduce((s,e)=>s+Number(e.salaire),0).toLocaleString()} <span style={{fontSize:13}}>DH</span></div>
              <div style={{fontSize:11,color:C.magentaDark,marginTop:2}}>Avances : <b style={{color:C.red}}>{avances.filter(a=>!a.rembourse).reduce((s,a)=>s+Number(a.montant),0).toLocaleString()} DH</b></div>
              <div style={{fontSize:11,color:C.magentaDark,marginTop:2}}>{employees.length} employés • 2 équipes</div>
            </div>}
          </>}

          {activePersoTab==="avances" && <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div className="card" style={{borderLeft:`4px solid ${C.red}`}}>
                <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Total avances</div>
                <div style={{fontSize:20,fontWeight:800,color:C.red}}>{avances.filter(a=>!a.rembourse).reduce((s,a)=>s+Number(a.montant),0).toLocaleString()} <span style={{fontSize:12}}>DH</span></div>
                <div style={{fontSize:10,color:C.gray}}>non remboursées</div>
              </div>
              <div className="card" style={{borderLeft:`4px solid ${C.green}`}}>
                <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Remboursées</div>
                <div style={{fontSize:20,fontWeight:800,color:C.green}}>{avances.filter(a=>a.rembourse).reduce((s,a)=>s+Number(a.montant),0).toLocaleString()} <span style={{fontSize:12}}>DH</span></div>
              </div>
            </div>

            {avances.length===0 && <div className="card" style={{textAlign:"center",padding:"40px 20px",color:C.gray}}>
              <div style={{fontSize:36,marginBottom:12}}>💸</div>
              <div style={{fontWeight:700,marginBottom:6}}>Aucune avance</div>
              <div style={{fontSize:13}}>Appuie sur + Avance</div>
            </div>}

            {avances.map((av,i)=>{
              const emp = employees.find(e=>String(e.id)===String(av.empId));
              return (
                <div key={i} className="card" style={{marginBottom:10,opacity:av.rembourse?.6:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontWeight:700,fontSize:14}}>{emp?emp.name:"Inconnu"}</span>
                        {av.rembourse && <span style={{background:`${C.green}18`,color:C.green,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>✓ Remboursé</span>}
                      </div>
                      <div style={{fontSize:12,color:C.gray}}>{av.date}{av.note?` • ${av.note}`:""}</div>
                      {emp && !av.rembourse && <div style={{fontSize:11,color:C.gray,marginTop:3}}>Net : <b style={{color:resto.color}}>{(Number(emp.salaire)-Number(av.montant)).toLocaleString()} DH</b></div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:av.rembourse?C.gray:C.red,fontWeight:800,fontSize:16,marginBottom:6,textDecoration:av.rembourse?"line-through":"none"}}>-{Number(av.montant).toLocaleString()} DH</div>
                      <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                        <button onClick={()=>{toggleRembourse(av.id);notify(av.rembourse?"Réactivée":"Remboursée ✓");}}
                          style={{padding:"4px 8px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:10,fontFamily:"inherit",background:av.rembourse?C.grayLight:`${C.green}18`,color:av.rembourse?C.gray:C.green}}>
                          {av.rembourse?"↩️":"✓"}
                        </button>
                        <button className="btn-ghost" style={{padding:"4px 8px",fontSize:11}} onClick={()=>{setAvanceForm({...av});setAvanceModal(av);}}>✏️</button>
                        <button className="btn-red" style={{padding:"4px 8px",fontSize:11}} onClick={()=>deleteAvance(av.id)}>🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>}
        </div>}

        {page==="rapports" && <div className="fade">
          <h2 style={{fontSize:20,fontWeight:800,marginBottom:16}}>Rapports {resto.emoji} {resto.label}</h2>

          <div style={{display:"flex",background:C.grayLight,borderRadius:12,padding:4,marginBottom:16}}>
            {[{id:"stats",label:"📊 Stats"},{id:"calendrier",label:"📅 Calendrier"}].map(tab=>(
              <button key={tab.id} onClick={()=>setActiveRapportTab(tab.id)} style={{flex:1,padding:"9px",border:"none",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,background:activeRapportTab===tab.id?resto.color:"transparent",color:activeRapportTab===tab.id?"white":C.gray}}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeRapportTab==="calendrier" && (()=>{
            const {year,month} = calMonth;
            const moisNoms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
            const firstDayFR = (new Date(year,month,1).getDay()+6)%7;
            const daysInMonth = new Date(year,month+1,0).getDate();
            const pad = n=>String(n).padStart(2,"0");
            const selectedData = calSelectedDay ? (historique[calSelectedDay] || { ca:0, depenses:[] }) : null;
            const selDepTotal = selectedData ? selectedData.depenses.reduce((s,d)=>s+Number(d.montant),0) : 0;
            return <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month-1,1);return{year:d.getFullYear(),month:d.getMonth()};})}
                  style={{background:C.grayLight,border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:18,color:C.gray}}>‹</button>
                <div style={{fontWeight:800,fontSize:16}}>{moisNoms[month]} {year}</div>
                <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month+1,1);return{year:d.getFullYear(),month:d.getMonth()};})}
                  style={{background:C.grayLight,border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:18,color:C.gray}}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6}}>
                {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.gray,padding:"4px 0"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:16}}>
                {Array.from({length:firstDayFR}).map((_,i)=><div key={"e"+i}/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const day=i+1;
                  const dateStr=`${year}-${pad(month+1)}-${pad(day)}`;
                  const hasData=!!historique[dateStr];
                  const isToday=dateStr===todayStr;
                  const isSelected=dateStr===calSelectedDay;
                  return (
                    <div key={day} onClick={()=>{
                        const next = isSelected ? null : dateStr;
                        setCalSelectedDay(next);
                        setCalCaInput(next && historique[next]?.ca ? String(historique[next].ca) : "");
                      }}
                      style={{aspectRatio:"1",borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",
                        background:isSelected?resto.color:isToday?C.magentaPale:hasData?"#FFF0F7":C.white,
                        border:`1.5px solid ${isSelected?resto.color:isToday?resto.color:hasData?C.magentaLight:C.border}`}}>
                      <div style={{fontSize:13,fontWeight:isToday||isSelected?800:500,color:isSelected?"white":isToday?resto.color:C.black}}>{day}</div>
                      {hasData && <div style={{width:5,height:5,borderRadius:"50%",background:isSelected?"white":resto.color,marginTop:1}}/>}
                    </div>
                  );
                })}
              </div>
              {calSelectedDay && (
                <div className="card fade" style={{borderColor:resto.color,borderWidth:2}}>
                  <div style={{fontWeight:800,fontSize:15,color:resto.color,marginBottom:12}}>
                    📅 {new Date(calSelectedDay+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                  </div>

                  <div style={{display:"flex",gap:8,marginBottom:16}}>
                    <input type="number" placeholder="CA de ce jour (DH)" value={calCaInput} onChange={e=>setCalCaInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveCalCA()} style={{...inpStyle,flex:1}}/>
                    <button className="btn" style={{background:resto.color}} onClick={saveCalCA}>Enregistrer</button>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                    {[["CA",selectedData.ca||0,C.magenta,"💰"],["Dépenses",selDepTotal,C.red,"📤"],["Bénéfice",(selectedData.ca||0)-selDepTotal,C.green,"✅"]].map(([label,val,color,icon])=>(
                      <div key={label} style={{background:C.grayLight,borderRadius:12,padding:10,textAlign:"center"}}>
                        <div style={{fontSize:14}}>{icon}</div>
                        <div style={{fontSize:14,fontWeight:800,color}}>{Number(val).toLocaleString()}</div>
                        <div style={{fontSize:10,color:C.gray}}>DH • {label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:700}}>Dépenses de ce jour :</div>
                    <button className="btn-ghost" style={{fontSize:11}} onClick={()=>{setDepForm({...emptyDep,date:calSelectedDay});setScanResult(null);setDepModal("add");}}>+ Ajouter</button>
                  </div>
                  {selectedData.depenses.length===0
                    ? <div style={{textAlign:"center",color:C.gray,fontSize:12.5,padding:"12px 0"}}>Aucune dépense ce jour-là</div>
                    : selectedData.depenses.map((d,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<selectedData.depenses.length-1?`1px solid ${C.border}`:"none",fontSize:13}}>
                        <div><div style={{fontWeight:600}}>{d.fournisseur}</div><div style={{fontSize:11,color:C.gray}}>{d.categorie}</div></div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{color:C.red,fontWeight:700}}>{Number(d.montant).toLocaleString()} DH</span>
                          <button className="btn-ghost" style={{padding:"4px 8px",fontSize:11}} onClick={()=>{setDepForm({...d,produits:Array.isArray(d.produits)?d.produits.join(", "):d.produits});setDepModal(d);}}>✏️</button>
                          <button className="btn-red" style={{padding:"4px 8px",fontSize:11}} onClick={()=>setConfirmDel({type:"dep",id:d.id,date:d.date})}>🗑</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </>;
          })()}

          {activeRapportTab==="stats" && <>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {["Semaine","Mois","Année"].map(p=>(
                <button key={p} onClick={()=>setActivePeriod(p)} style={{padding:"8px 16px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",background:activePeriod===p?resto.color:C.white,color:activePeriod===p?"white":C.gray,border:activePeriod===p?"none":`1.5px solid ${C.border}`}}>{p}</button>
              ))}
            </div>

            <div style={{background:`linear-gradient(135deg,${resto.color},${C.magentaDark})`,borderRadius:20,padding:20,marginBottom:16,color:"white"}}>
              <div style={{fontSize:12,opacity:.8,marginBottom:8}}>📊 {activePeriod==="Semaine"?"Cette semaine":activePeriod==="Mois"?"Ce mois":"Cette année"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {(()=>{
                  const wCA=WEEK_CA.reduce((s,d)=>s+d.ca,0)+(caVal>0?caVal-WEEK_CA[TODAY_IDX].ca:0);
                  const mCA=wCA*4; const yCA=mCA*12;
                  const [caS,depS]=activePeriod==="Semaine"?[wCA,totalDep]:activePeriod==="Mois"?[mCA,totalDep*20]:[yCA,totalDep*240];
                  const ben=caS-depS;
                  const marge=caS>0?Math.round(ben/caS*100):0;
                  return [["CA total",caS>=1000?`${(caS/1000).toFixed(0)}k DH`:`${caS} DH`],["Dépenses",depS>=1000?`${(depS/1000).toFixed(0)}k DH`:`${depS} DH`],["Bénéfice",ben>=1000?`${(ben/1000).toFixed(0)}k DH`:`${ben} DH`],["Marge",`${marge}%`]].map(([k,v])=>(
                    <div key={k} style={{background:"rgba(255,255,255,.15)",borderRadius:12,padding:12}}>
                      <div style={{fontSize:10,opacity:.8,marginBottom:3}}>{k}</div>
                      <div style={{fontSize:15,fontWeight:800}}>{v}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="card" style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>🏆 Meilleurs jours</div>
              {[...WEEK_CA].map((d,i)=>({...d,isToday:i===TODAY_IDX})).sort((a,b)=>b.ca-a.ca).slice(0,3).map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<2?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:18}}>{"🥇🥈🥉"[i]}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:600}}>{d.j}{d.isToday?" (aujourd'hui)":""}</span>
                  <span style={{fontWeight:800,color:resto.color}}>{d.ca.toLocaleString()} DH</span>
                </div>
              ))}
            </div>

            <div className="card" style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>📦 Dépenses par catégorie — aujourd'hui</div>
              {depenses.length===0
                ? <div style={{textAlign:"center",color:C.gray,fontSize:13,padding:"12px 0"}}>Aucune dépense</div>
                : (()=>{
                    const totals={};
                    depenses.forEach(d=>{totals[d.categorie]=(totals[d.categorie]||0)+Number(d.montant);});
                    const total=Object.values(totals).reduce((a,b)=>a+b,0)||1;
                    return Object.entries(totals).map(([cat,mt])=>(
                      <div key={cat} style={{marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                          <span style={{fontWeight:600}}>{cat}</span>
                          <span style={{color:C.gray}}>{mt.toLocaleString()} DH · {Math.round(mt/total*100)}%</span>
                        </div>
                        <div style={{background:C.grayLight,borderRadius:6,height:8}}>
                          <div style={{width:`${mt/total*100}%`,height:"100%",background:CAT_COLORS[cat]||resto.color,borderRadius:6}}/>
                        </div>
                      </div>
                    ));
                  })()
              }
            </div>

            <div className="card">
              <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>👥 Présence du personnel</div>
              {[{label:"Équipe A (10h–20h)",presents:presentsA,total:teamA.length},{label:"Équipe B (20h–2h)",presents:presentsB,total:teamB.length}].map((t,i)=>(
                <div key={i} style={{marginBottom:i===0?14:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                    <span style={{fontWeight:600}}>{t.label}</span>
                    <span style={{color:resto.color,fontWeight:700}}>{t.presents}/{t.total}</span>
                  </div>
                  <div style={{background:C.grayLight,borderRadius:6,height:8}}>
                    <div style={{width:t.total>0?`${(t.presents/t.total)*100}%`:"0%",height:"100%",background:resto.color,borderRadius:6}}/>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div>}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.white,borderTop:`1.5px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"10px 0 18px"}}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 12px",position:"relative"}}>
            <span style={{fontSize:20}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:page===n.id?resto.color:C.gray,fontFamily:"inherit"}}>{n.label}</span>
            {page===n.id && <div style={{position:"absolute",bottom:-8,width:24,height:3,borderRadius:2,background:resto.color}}/>}
          </button>
        ))}
      </div>

      {empModal && <Modal title={empModal==="add"?"Nouvel employé":"Modifier"} onClose={()=>setEmpModal(null)}>
        <Field label="Prénom / Nom"><input type="text" placeholder="Ex: Amine" value={empForm.name} onChange={e=>setEmpForm(p=>({...p,name:e.target.value}))} style={inpStyle}/></Field>
        <Field label="Poste">{selEl(empForm.role,v=>setEmpForm(p=>({...p,role:v})),ROLES)}</Field>
        <Field label="Équipe">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {["A","B"].map(t=>(
              <button key={t} onClick={()=>setEmpForm(p=>({...p,team:t}))} style={{padding:"12px",border:`2px solid ${empForm.team===t?resto.color:C.border}`,borderRadius:12,background:empForm.team===t?C.magentaPale:C.white,fontFamily:"inherit",fontWeight:700,cursor:"pointer",color:empForm.team===t?resto.color:C.gray}}>
                Équipe {t}<br/><span style={{fontSize:11,fontWeight:500}}>{t==="A"?"10h–20h":"20h–2h"}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Salaire mensuel (DH)"><input type="number" placeholder="Ex: 3000" value={empForm.salaire} onChange={e=>setEmpForm(p=>({...p,salaire:e.target.value}))} style={inpStyle}/></Field>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button className="btn" style={{flex:1,background:resto.color}} onClick={saveEmp}>Enregistrer</button>
          {empModal!=="add" && <button className="btn-red" onClick={()=>deleteEmp(empModal.id)}>Supprimer</button>}
        </div>
      </Modal>}

      {depModal && <Modal title={depModal==="add"?"Nouvelle dépense":"Modifier"} onClose={()=>setDepModal(null)}>
        {scanResult && depModal==="add" && <div style={{background:C.magentaPale,borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.magentaDark,fontWeight:600}}>✅ Facture scannée — vérifie ci-dessous</div>}
        <Field label="Fournisseur"><input type="text" placeholder="Ex: Metro Cash" value={depForm.fournisseur} onChange={e=>setDepForm(p=>({...p,fournisseur:e.target.value}))} style={inpStyle}/></Field>
        <Field label="Montant total (DH)"><input type="number" placeholder="Ex: 850" value={depForm.montant} onChange={e=>setDepForm(p=>({...p,montant:e.target.value}))} style={inpStyle}/></Field>
        <Field label="Catégorie">{selEl(depForm.categorie,v=>setDepForm(p=>({...p,categorie:v})),CATS)}</Field>
        <Field label="Date">
          <input type="date" value={depForm.date} onChange={e=>setDepForm(p=>({...p,date:e.target.value}))} style={inpStyle}/>
        </Field>
        <div style={{fontSize:11,color:C.gray,marginTop:-8,marginBottom:14}}>Cette dépense sera comptabilisée sur la date choisie ci-dessus.</div>
        <Field label="Produits (séparés par virgules)"><input type="text" placeholder="Pain burger x100, Fromage 4kg..." value={depForm.produits} onChange={e=>setDepForm(p=>({...p,produits:e.target.value}))} style={inpStyle}/></Field>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button className="btn" style={{flex:1,background:resto.color}} onClick={saveDep}>Enregistrer</button>
          {depModal!=="add" && <button className="btn-red" onClick={()=>deleteDep(depModal.date, depModal.id)}>Supprimer</button>}
        </div>
      </Modal>}

      {avanceModal && <Modal title={avanceModal==="add"?"Nouvelle avance":"Modifier"} onClose={()=>setAvanceModal(null)}>
        <Field label="Employé">
          <select value={avanceForm.empId} onChange={e=>setAvanceForm(p=>({...p,empId:e.target.value}))} style={inpStyle}>
            <option value="">-- Choisir un employé --</option>
            {employees.map(e=><option key={e.id} value={String(e.id)}>{e.name} (Éq. {e.team})</option>)}
          </select>
        </Field>
        <Field label="Montant (DH)"><input type="number" placeholder="Ex: 500" value={avanceForm.montant} onChange={e=>setAvanceForm(p=>({...p,montant:e.target.value}))} style={inpStyle}/></Field>
        {avanceForm.empId && avanceForm.montant && (()=>{
          const emp=employees.find(e=>String(e.id)===String(avanceForm.empId));
          if (!emp) return null;
          const net=Number(emp.salaire)-Number(avanceForm.montant);
          return <div style={{background:C.magentaPale,borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13}}>
            Salaire net après avance : <b style={{color:net>=0?resto.color:C.red}}>{net.toLocaleString()} DH</b>
          </div>;
        })()}
        <Field label="Date"><input type="date" value={avanceForm.date} onChange={e=>setAvanceForm(p=>({...p,date:e.target.value}))} style={inpStyle}/></Field>
        <Field label="Note (optionnel)"><input type="text" placeholder="Ex: urgence médicale" value={avanceForm.note} onChange={e=>setAvanceForm(p=>({...p,note:e.target.value}))} style={inpStyle}/></Field>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button className="btn" style={{flex:1,background:resto.color}} onClick={saveAvance}>Enregistrer</button>
          {avanceModal!=="add" && <button className="btn-red" onClick={()=>deleteAvance(avanceModal.id)}>Supprimer</button>}
        </div>
      </Modal>}

      {confirmDel && <Modal title="Confirmer la suppression" onClose={()=>setConfirmDel(null)}>
        <div style={{fontSize:14,color:C.gray,marginBottom:20}}>Es-tu sûr ? Cette action est irréversible.</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn-red" style={{flex:1,padding:"13px"}} onClick={()=>{
            if(confirmDel.type==="emp") deleteEmp(confirmDel.id);
            else if(confirmDel.type==="dep") deleteDep(confirmDel.date, confirmDel.id);
            setConfirmDel(null);
          }}>Supprimer</button>
          <button className="btn-ghost" style={{flex:1,padding:"13px"}} onClick={()=>setConfirmDel(null)}>Annuler</button>
        </div>
      </Modal>}
    </div>
  );
}
                      {ROLE_ICON[emp.role]||"👤"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14}}>{emp.name}</div>
                      <div style={{fontSize:12,color:C.gray}}>{emp.role}</div>
                      <div style={{display:"flex",gap:8,marginTop:2,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontSize:11,color:resto.color,fontWeight:600}}>{Number(emp.salaire).toLocaleString()} DH</span>
                        {totalAv>0 && <span style={{fontSize:11,color:C.red,fontWeight:600}}>- {totalAv.toLocaleString()} avance</span>}
                        {totalAv>0 && <span style={{fontSize:11,color:C.green,fontWeight:700}}>= {(Number(emp.salaire)-totalAv).toLocaleString()} net</span>}
                        {allAvEmp.length>0 && (
                          <button onClick={()=>setExpandedEmpId(isExpanded?null:emp.id)} style={{background:"none",border:"none",color:C.magentaDark,fontSize:11,fontWeight:700,cursor:"pointer",textDecoration:"underline",padding:0}}>
                            {isExpanded?"Masquer":"Voir"} le détail ({allAvEmp.length})
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                      <button onClick={()=>{togglePresence(emp.id);notify(`${emp.name} → ${!emp.present?"présent":"absent"}`);}}
                        style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"inherit",background:emp.present?`${C.green}18`:C.grayLight,color:emp.present?C.green:C.gray}}>
                        {emp.present?"✓ Présent":"Absent"}
                      </button>
                      <div style={{display:"flex",gap:4}}>
                        <button className="btn-ghost" style={{padding:"4px 8px",fontSize:11}} onClick={()=>{setEmpForm({...emp});setEmpModal(emp);}}>✏️</button>
                        <button className="btn-red" style={{padding:"4px 8px",fontSize:11}} onClick={()=>setConfirmDel({type:"emp",id:emp.id})}>🗑</button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                      {allAvEmp.map(av=>(
                        <div key={av.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",fontSize:12}}>
                          <div>
                            <span style={{fontWeight:600}}>{av.date}</span>
                            {av.note && <span style={{color:C.gray}}> • {av.note}</span>}
                            {av.rembourse && <span style={{color:C.green,fontWeight:700}}> ✓ remboursée</span>}
                          </div>
                          <span style={{fontWeight:700,color:av.rembourse?C.gray:C.red,textDecoration:av.rembourse?"line-through":"none"}}>{Number(av.montant).toLocaleString()} DH</span>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,marginTop:6,paddingTop:6,borderTop:`1px dashed ${C.border}`}}>
                        <span>Total non remboursé</span>
                        <span style={{color:C.red}}>{totalAv.toLocaleString()} DH</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {employees.length>0 && <div className="card" style={{marginTop:8,background:C.magentaPale,border:`1.5px solid ${resto.color}44`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.magentaDark,marginBottom:6}}>💼 Masse salariale — {resto.emoji} {resto.label}</div>
              <div style={{fontSize:26,fontWeight:800,color:resto.color}}>{employees.reduce((s,e)=>s+Number(e.salaire),0).toLocaleString()} <span style={{fontSize:13}}>DH</span></div>
              <div style={{fontSize:11,color:C.magentaDark,marginTop:2}}>Avances : <b style={{color:C.red}}>{avances.filter(a=>!a.rembourse).reduce((s,a)=>s+Number(a.montant),0).toLocaleString()} DH</b></div>
              <div style={{fontSize:11,color:C.magentaDark,marginTop:2}}>{employees.length} employés • 2 équipes</div>
            </div>}
          </>}

          {activePersoTab==="avances" && <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div className="card" style={{borderLeft:`4px solid ${C.red}`}}>
                <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Total avances</div>
                <div style={{fontSize:20,fontWeight:800,color:C.red}}>{avances.filter(a=>!a.rembourse).reduce((s,a)=>s+Number(a.montant),0).toLocaleString()} <span style={{fontSize:12}}>DH</span></div>
                <div style={{fontSize:10,color:C.gray}}>non remboursées</div>
              </div>
              <div className="card" style={{borderLeft:`4px solid ${C.green}`}}>
                <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Remboursées</div>
                <div style={{fontSize:20,fontWeight:800,color:C.green}}>{avances.filter(a=>a.rembourse).reduce((s,a)=>s+Number(a.montant),0).toLocaleString()} <span style={{fontSize:12}}>DH</span></div>
              </div>
            </div>

            {avances.length===0 && <div className="card" style={{textAlign:"center",padding:"40px 20px",color:C.gray}}>
              <div style={{fontSize:36,marginBottom:12}}>💸</div>
              <div style={{fontWeight:700,marginBottom:6}}>Aucune avance</div>
              <div style={{fontSize:13}}>Appuie sur + Avance</div>
            </div>}

            {avances.map((av,i)=>{
              const emp = employees.find(e=>String(e.id)===String(av.empId));
              return (
                <div key={i} className="card" style={{marginBottom:10,opacity:av.rembourse?.6:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontWeight:700,fontSize:14}}>{emp?emp.name:"Inconnu"}</span>
                        {av.rembourse && <span style={{background:`${C.green}18`,color:C.green,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>✓ Remboursé</span>}
                      </div>
                      <div style={{fontSize:12,color:C.gray}}>{av.date}{av.note?` • ${av.note}`:""}</div>
                      {emp && !av.rembourse && <div style={{fontSize:11,color:C.gray,marginTop:3}}>Net : <b style={{color:resto.color}}>{(Number(emp.salaire)-Number(av.montant)).toLocaleString()} DH</b></div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:av.rembourse?C.gray:C.red,fontWeight:800,fontSize:16,marginBottom:6,textDecoration:av.rembourse?"line-through":"none"}}>-{Number(av.montant).toLocaleString()} DH</div>
                      <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                        <button onClick={()=>{toggleRembourse(av.id);notify(av.rembourse?"Réactivée":"Remboursée ✓");}}
                          style={{padding:"4px 8px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:10,fontFamily:"inherit",background:av.rembourse?C.grayLight:`${C.green}18`,color:av.rembourse?C.gray:C.green}}>
                          {av.rembourse?"↩️":"✓"}
                        </button>
                        <button className="btn-ghost" style={{padding:"4px 8px",fontSize:11}} onClick={()=>{setAvanceForm({...av});setAvanceModal(av);}}>✏️</button>
                        <button className="btn-red" style={{padding:"4px 8px",fontSize:11}} onClick={()=>deleteAvance(av.id)}>🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>}
        </div>}

        {page==="rapports" && <div className="fade">
          <h2 style={{fontSize:20,fontWeight:800,marginBottom:16}}>Rapports {resto.emoji} {resto.label}</h2>

          <div style={{display:"flex",background:C.grayLight,borderRadius:12,padding:4,marginBottom:16}}>
            {[{id:"stats",label:"📊 Stats"},{id:"calendrier",label:"📅 Calendrier"}].map(tab=>(
              <button key={tab.id} onClick={()=>setActiveRapportTab(tab.id)} style={{flex:1,padding:"9px",border:"none",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,background:activeRapportTab===tab.id?resto.color:"transparent",color:activeRapportTab===tab.id?"white":C.gray}}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeRapportTab==="calendrier" && (()=>{
            const {year,month} = calMonth;
            const moisNoms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
            const firstDayFR = (new Date(year,month,1).getDay()+6)%7;
            const daysInMonth = new Date(year,month+1,0).getDate();
            const pad = n=>String(n).padStart(2,"0");
            const selectedData = calSelectedDay ? (historique[calSelectedDay] || { ca:0, depenses:[] }) : null;
            const selDepTotal = selectedData ? selectedData.depenses.reduce((s,d)=>s+Number(d.montant),0) : 0;
            return <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month-1,1);return{year:d.getFullYear(),month:d.getMonth()};})}
                  style={{background:C.grayLight,border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:18,color:C.gray}}>‹</button>
                <div style={{fontWeight:800,fontSize:16}}>{moisNoms[month]} {year}</div>
                <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month+1,1);return{year:d.getFullYear(),month:d.getMonth()};})}
                  style={{background:C.grayLight,border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:18,color:C.gray}}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6}}>
                {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.gray,padding:"4px 0"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:16}}>
                {Array.from({length:firstDayFR}).map((_,i)=><div key={"e"+i}/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const day=i+1;
                  const dateStr=`${year}-${pad(month+1)}-${pad(day)}`;
                  const hasData=!!historique[dateStr];
                  const isToday=dateStr===todayStr;
                  const isSelected=dateStr===calSelectedDay;
                  return (
                    <div key={day} onClick={()=>{
                        const next = isSelected ? null : dateStr;
                        setCalSelectedDay(next);
                        setCalCaInput(next && historique[next]?.ca ? String(historique[next].ca) : "");
                      }}
                      style={{aspectRatio:"1",borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",
                        background:isSelected?resto.color:isToday?C.magentaPale:hasData?"#FFF0F7":C.white,
                        border:`1.5px solid ${isSelected?resto.color:isToday?resto.color:hasData?C.magentaLight:C.border}`}}>
                      <div style={{fontSize:13,fontWeight:isToday||isSelected?800:500,color:isSelected?"white":isToday?resto.color:C.black}}>{day}</div>
                      {hasData && <div style={{width:5,height:5,borderRadius:"50%",background:isSelected?"white":resto.color,marginTop:1}}/>}
                    </div>
                  );
                })}
              </div>
              {calSelectedDay && (
                <div className="card fade" style={{borderColor:resto.color,borderWidth:2}}>
                  <div style={{fontWeight:800,fontSize:15,color:resto.color,marginBottom:12}}>
                    📅 {new Date(calSelectedDay+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                  </div>

                  <div style={{display:"flex",gap:8,marginBottom:16}}>
                    <input type="number" placeholder="CA de ce jour (DH)" value={calCaInput} onChange={e=>setCalCaInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveCalCA()} style={{...inpStyle,flex:1}}/>
                    <button className="btn" style={{background:resto.color}} onClick={saveCalCA}>Enregistrer</button>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                    {[["CA",selectedData.ca||0,C.magenta,"💰"],["Dépenses",selDepTotal,C.red,"📤"],["Bénéfice",(selectedData.ca||0)-selDepTotal,C.green,"✅"]].map(([label,val,color,icon])=>(
                      <div key={label} style={{background:C.grayLight,borderRadius:12,padding:10,textAlign:"center"}}>
                        <div style={{fontSize:14}}>{icon}</div>
                        <div style={{fontSize:14,fontWeight:800,color}}>{Number(val).toLocaleString()}</div>
                        <div style={{fontSize:10,color:C.gray}}>DH • {label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:700}}>Dépenses de ce jour :</div>
                    <button className="btn-ghost" style={{fontSize:11}} onClick={()=>{setDepForm({...emptyDep,date:calSelectedDay});setScanResult(null);setDepModal("add");}}>+ Ajouter</button>
                  </div>
                  {selectedData.depenses.length===0
                    ? <div style={{textAlign:"center",color:C.gray,fontSize:12.5,padding:"12px 0"}}>Aucune dépense ce jour-là</div>
                    : selectedData.depenses.map((d,i)=>(
                      <div key={i} style={{padding:"8px 0",borderBottom:i<selectedData.depenses.length-1?`1px solid ${C.border}`:"none",fontSize:13}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div><div style={{fontWeight:600}}>{d.fournisseur}</div><div style={{fontSize:11,color:C.gray}}>{d.categorie}</div></div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{color:C.red,fontWeight:700}}>{Number(d.montant).toLocaleString()} DH</span>
                            <button className="btn-ghost" style={{padding:"4px 8px",fontSize:11}} onClick={()=>{setDepForm({...d,produits:Array.isArray(d.produits)?d.produits.join(", "):d.produits});setDepModal(d);}}>✏️</button>
                            <button className="btn-red" style={{padding:"4px 8px",fontSize:11}} onClick={()=>setConfirmDel({type:"dep",id:d.id,date:d.date})}>🗑</button>
                          </div>
                        </div>
                        {d.produits?.length>0 && (
                          <div style={{marginTop:6,paddingLeft:2}}>
                            {(Array.isArray(d.produits)?d.produits:[d.produits]).map((p,j)=>(
                              <div key={j} style={{fontSize:11.5,color:C.gray,padding:"1px 0"}}>• {p}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  }

                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18,marginBottom:8,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
                    <div style={{fontSize:12,fontWeight:700}}>💸 Avances de ce jour :</div>
                    <button className="btn-ghost" style={{fontSize:11}} onClick={()=>{setAvanceForm({...emptyAvance,date:calSelectedDay});setAvanceModal("add");}}>+ Ajouter</button>
                  </div>
                  {(()=>{
                    const selAvances = avances.filter(a=>a.date===calSelectedDay);
                    if (selAvances.length===0) return <div style={{textAlign:"center",color:C.gray,fontSize:12.5,padding:"12px 0"}}>Aucune avance ce jour-là</div>;
                    return selAvances.map((av,i)=>{
                      const emp = employees.find(e=>String(e.id)===String(av.empId));
                      return (
                        <div key={av.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<selAvances.length-1?`1px solid ${C.border}`:"none",fontSize:13}}>
                          <div>
                            <div style={{fontWeight:600}}>{emp?emp.name:"Inconnu"}</div>
                            {av.note && <div style={{fontSize:11,color:C.gray}}>{av.note}</div>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{color:av.rembourse?C.gray:C.red,fontWeight:700,textDecoration:av.rembourse?"line-through":"none"}}>{Number(av.montant).toLocaleString()} DH</span>
                            <button className="btn-ghost" style={{padding:"4px 8px",fontSize:11}} onClick={()=>{setAvanceForm({...av});setAvanceModal(av);}}>✏️</button>
                            <button className="btn-red" style={{padding:"4px 8px",fontSize:11}} onClick={()=>deleteAvance(av.id)}>🗑</button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </>;
          })()}

          {activeRapportTab==="stats" && <>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {["Semaine","Mois","Année"].map(p=>(
                <button key={p} onClick={()=>setActivePeriod(p)} style={{padding:"8px 16px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",background:activePeriod===p?resto.color:C.white,color:activePeriod===p?"white":C.gray,border:activePeriod===p?"none":`1.5px solid ${C.border}`}}>{p}</button>
              ))}
            </div>

            <div style={{background:`linear-gradient(135deg,${resto.color},${C.magentaDark})`,borderRadius:20,padding:20,marginBottom:16,color:"white"}}>
              <div style={{fontSize:12,opacity:.8,marginBottom:8}}>📊 {activePeriod==="Semaine"?"Cette semaine":activePeriod==="Mois"?"Ce mois":"Cette année"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {(()=>{
                  const wCA=WEEK_CA.reduce((s,d)=>s+d.ca,0)+(caVal>0?caVal-WEEK_CA[TODAY_IDX].ca:0);
                  const mCA=wCA*4; const yCA=mCA*12;
                  const [caS,depS]=activePeriod==="Semaine"?[wCA,totalDep]:activePeriod==="Mois"?[mCA,totalDep*20]:[yCA,totalDep*240];
                  const ben=caS-depS;
                  const marge=caS>0?Math.round(ben/caS*100):0;
                  return [["CA total",caS>=1000?`${(caS/1000).toFixed(0)}k DH`:`${caS} DH`],["Dépenses",depS>=1000?`${(depS/1000).toFixed(0)}k DH`:`${depS} DH`],["Bénéfice",ben>=1000?`${(ben/1000).toFixed(0)}k DH`:`${ben} DH`],["Marge",`${marge}%`]].map(([k,v])=>(
                    <div key={k} style={{background:"rgba(255,255,255,.15)",borderRadius:12,padding:12}}>
                      <div style={{fontSize:10,opacity:.8,marginBottom:3}}>{k}</div>
                      <div style={{fontSize:15,fontWeight:800}}>{v}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="card" style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>🏆 Meilleurs jours</div>
              {[...WEEK_CA].map((d,i)=>({...d,isToday:i===TODAY_IDX})).sort((a,b)=>b.ca-a.ca).slice(0,3).map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<2?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:18}}>{"🥇🥈🥉"[i]}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:600}}>{d.j}{d.isToday?" (aujourd'hui)":""}</span>
                  <span style={{fontWeight:800,color:resto.color}}>{d.ca.toLocaleString()} DH</span>
                </div>
              ))}
            </div>

            <div className="card" style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>📦 Dépenses par catégorie — aujourd'hui</div>
              {depenses.length===0
                ? <div style={{textAlign:"center",color:C.gray,fontSize:13,padding:"12px 0"}}>Aucune dépense</div>
                : (()=>{
                    const totals={};
                    depenses.forEach(d=>{totals[d.categorie]=(totals[d.categorie]||0)+Number(d.montant);});
                    const total=Object.values(totals).reduce((a,b)=>a+b,0)||1;
                    return Object.entries(totals).map(([cat,mt])=>(
                      <div key={cat} style={{marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                          <span style={{fontWeight:600}}>{cat}</span>
                          <span style={{color:C.gray}}>{mt.toLocaleString()} DH · {Math.round(mt/total*100)}%</span>
                        </div>
                        <div style={{background:C.grayLight,borderRadius:6,height:8}}>
                          <div style={{width:`${mt/total*100}%`,height:"100%",background:CAT_COLORS[cat]||resto.color,borderRadius:6}}/>
                        </div>
                      </div>
                    ));
                  })()
              }
            </div>

            <div className="card">
              <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>👥 Présence du personnel</div>
              {[{label:"Équipe A (10h–20h)",presents:presentsA,total:teamA.length},{label:"Équipe B (20h–2h)",presents:presentsB,total:teamB.length}].map((t,i)=>(
                <div key={i} style={{marginBottom:i===0?14:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                    <span style={{fontWeight:600}}>{t.label}</span>
                    <span style={{color:resto.color,fontWeight:700}}>{t.presents}/{t.total}</span>
                  </div>
                  <div style={{background:C.grayLight,borderRadius:6,height:8}}>
                    <div style={{width:t.total>0?`${(t.presents/t.total)*100}%`:"0%",height:"100%",background:resto.color,borderRadius:6}}/>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div>}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.white,borderTop:`1.5px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"10px 0 18px"}}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 12px",position:"relative"}}>
            <span style={{fontSize:20}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:page===n.id?resto.color:C.gray,fontFamily:"inherit"}}>{n.label}</span>
            {page===n.id && <div style={{position:"absolute",bottom:-8,width:24,height:3,borderRadius:2,background:resto.color}}/>}
          </button>
        ))}
      </div>

      {empModal && <Modal title={empModal==="add"?"Nouvel employé":"Modifier"} onClose={()=>setEmpModal(null)}>
        <Field label="Prénom / Nom"><input type="text" placeholder="Ex: Amine" value={empForm.name} onChange={e=>setEmpForm(p=>({...p,name:e.target.value}))} style={inpStyle}/></Field>
        <Field label="Poste">{selEl(empForm.role,v=>setEmpForm(p=>({...p,role:v})),ROLES)}</Field>
        <Field label="Équipe">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {["A","B"].map(t=>(
              <button key={t} onClick={()=>setEmpForm(p=>({...p,team:t}))} style={{padding:"12px",border:`2px solid ${empForm.team===t?resto.color:C.border}`,borderRadius:12,background:empForm.team===t?C.magentaPale:C.white,fontFamily:"inherit",fontWeight:700,cursor:"pointer",color:empForm.team===t?resto.color:C.gray}}>
                Équipe {t}<br/><span style={{fontSize:11,fontWeight:500}}>{t==="A"?"10h–20h":"20h–2h"}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Salaire mensuel (DH)"><input type="number" placeholder="Ex: 3000" value={empForm.salaire} onChange={e=>setEmpForm(p=>({...p,salaire:e.target.value}))} style={inpStyle}/></Field>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button className="btn" style={{flex:1,background:resto.color}} onClick={saveEmp}>Enregistrer</button>
          {empModal!=="add" && <button className="btn-red" onClick={()=>deleteEmp(empModal.id)}>Supprimer</button>}
        </div>
      </Modal>}

      {depModal && <Modal title={depModal==="add"?"Nouvelle dépense":"Modifier"} onClose={()=>setDepModal(null)}>
        {scanResult && depModal==="add" && <div style={{background:C.magentaPale,borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.magentaDark,fontWeight:600}}>✅ Facture scannée — vérifie ci-dessous</div>}
        <Field label="Fournisseur"><input type="text" placeholder="Ex: Metro Cash" value={depForm.fournisseur} onChange={e=>setDepForm(p=>({...p,fournisseur:e.target.value}))} style={inpStyle}/></Field>
        <Field label="Montant total (DH)"><input type="number" placeholder="Ex: 850" value={depForm.montant} onChange={e=>setDepForm(p=>({...p,montant:e.target.value}))} style={inpStyle}/></Field>
        <Field label="Catégorie">{selEl(depForm.categorie,v=>setDepForm(p=>({...p,categorie:v})),CATS)}</Field>
        <Field label="Date">
          <input type="date" value={depForm.date} onChange={e=>setDepForm(p=>({...p,date:e.target.value}))} style={inpStyle}/>
        </Field>
        <div style={{fontSize:11,color:C.gray,marginTop:-8,marginBottom:14}}>Cette dépense sera comptabilisée sur la date choisie ci-dessus.</div>
        <Field label="Produits (séparés par virgules)"><input type="text" placeholder="Pain burger x100, Fromage 4kg..." value={depForm.produits} onChange={e=>setDepForm(p=>({...p,produits:e.target.value}))} style={inpStyle}/></Field>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button className="btn" style={{flex:1,background:resto.color}} onClick={saveDep}>Enregistrer</button>
          {depModal!=="add" && <button className="btn-red" onClick={()=>deleteDep(depModal.date, depModal.id)}>Supprimer</button>}
        </div>
      </Modal>}

      {avanceModal && <Modal title={avanceModal==="add"?"Nouvelle avance":"Modifier"} onClose={()=>setAvanceModal(null)}>
        <Field label="Employé">
          <select value={avanceForm.empId} onChange={e=>setAvanceForm(p=>({...p,empId:e.target.value}))} style={inpStyle}>
            <option value="">-- Choisir un employé --</option>
            {employees.map(e=><option key={e.id} value={String(e.id)}>{e.name} (Éq. {e.team})</option>)}
          </select>
        </Field>
        <Field label="Montant (DH)"><input type="number" placeholder="Ex: 500" value={avanceForm.montant} onChange={e=>setAvanceForm(p=>({...p,montant:e.target.value}))} style={inpStyle}/></Field>
        {avanceForm.empId && avanceForm.montant && (()=>{
          const emp=employees.find(e=>String(e.id)===String(avanceForm.empId));
          if (!emp) return null;
          const net=Number(emp.salaire)-Number(avanceForm.montant);
          return <div style={{background:C.magentaPale,borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13}}>
            Salaire net après avance : <b style={{color:net>=0?resto.color:C.red}}>{net.toLocaleString()} DH</b>
          </div>;
        })()}
        <Field label="Date"><input type="date" value={avanceForm.date} onChange={e=>setAvanceForm(p=>({...p,date:e.target.value}))} style={inpStyle}/></Field>
        <Field label="Note (optionnel)"><input type="text" placeholder="Ex: urgence médicale" value={avanceForm.note} onChange={e=>setAvanceForm(p=>({...p,note:e.target.value}))} style={inpStyle}/></Field>
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button className="btn" style={{flex:1,background:resto.color}} onClick={saveAvance}>Enregistrer</button>
          {avanceModal!=="add" && <button className="btn-red" onClick={()=>deleteAvance(avanceModal.id)}>Supprimer</button>}
        </div>
      </Modal>}

      {confirmDel && <Modal title="Confirmer la suppression" onClose={()=>setConfirmDel(null)}>
        <div style={{fontSize:14,color:C.gray,marginBottom:20}}>Es-tu sûr ? Cette action est irréversible.</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn-red" style={{flex:1,padding:"13px"}} onClick={()=>{
            if(confirmDel.type==="emp") deleteEmp(confirmDel.id);
            else if(confirmDel.type==="dep") deleteDep(confirmDel.date, confirmDel.id);
            setConfirmDel(null);
          }}>Supprimer</button>
          <button className="btn-ghost" style={{flex:1,padding:"13px"}} onClick={()=>setConfirmDel(null)}>Annuler</button>
        </div>
      </Modal>}
    </div>
  );
}

