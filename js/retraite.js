"use strict";
/* Fonctionnement de la page retraite.html : questionnaire, accès payant (le même que le simulateur de vote :
   un seul paiement débloque les deux tests), résultat et page A4 en PDF.
   Les règles et le calcul sont dans js/retraite-regles.js, les noms et couleurs des partis dans js/programmes.js. */
function ld(k,d){try{var v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
var unlocked = ld('vo-unlock', false) === true;
var done = ld('re-done', false) === true;
const A = ld('re-answers', {}) || {};
function save(){ sv('re-answers', A); }
const NOM = Object.fromEntries(PARTIES.map(p=>[p.k,p]));
const ANNEE = new Date().getFullYear();

const RQ=[
 {id:"y", t:"Ton année de naissance", help:"Les règles de départ changent selon la génération.", type:"num", min:1962, max:2006, step:1, unit:"", def:1980},
 {id:"s", t:"À quel âge as-tu commencé à travailler ?", help:"Premier emploi déclaré, apprentissage et jobs d'été compris s'ils ont donné des trimestres. Sert pour les carrières longues.", type:"num", min:14, max:30, step:1, unit:"ans", def:21},
 {id:"sit", t:"Tu travailles…", type:"choice", opts:[["prive","Dans le privé"],["fonct","Dans la fonction publique"],["indep","À ton compte"]]},
 {id:"net", t:"Ton salaire net par mois, avant impôt", help:"Indépendant : ton revenu net mensuel moyen. On s'en sert comme salaire moyen de carrière, en euros d'aujourd'hui.", type:"num", min:0, max:15000, step:50, unit:"€ / mois", def:2500},
 {id:"gaps", fine:true, pitch:"Tes années sans trimestres (études longues, pause, temps très partiel), qui repoussent ton départ", t:"Combien d'années sans trimestres dans ta carrière ?", help:"Années où tu n'as rien validé : pause, expatriation, chômage non indemnisé. Le chômage indemnisé, la maladie et la maternité donnent des trimestres. Ton relevé de carrière est sur info-retraite.fr.", type:"num", min:0, max:20, step:1, unit:"ans", def:0},
 {id:"kids", fine:true, pitch:"Tes enfants : trimestres en plus et majoration de 10 % à partir de 3 enfants", t:"Combien d'enfants as-tu eus ou élevés ?", type:"choice", opts:[["0","Aucun"],["1","1"],["2","2"],["3","3 ou plus"]]},
 {id:"kt", fine:true, t:"Qui a reçu les trimestres pour enfants ?", help:"Dans le privé, la mère reçoit en général 8 trimestres par enfant (4 pour la maternité, 4 pour l'éducation, partageables). Dans la fonction publique, c'est 2 à 4 trimestres par enfant né depuis 2004.", type:"choice", opts:[["moi","Moi"],["autre","L'autre parent"],["partage","Partagés"]], when:a=>+a.kids>0},
 {id:"evol", fine:true, pitch:"L'évolution de ton salaire, pour une pension plus juste", t:"Comment ton salaire a-t-il évolué ?", help:"La pension du privé dépend de tes 25 meilleures années, pas de ton salaire d'aujourd'hui.", type:"choice", opts:[["1","Stable depuis le début"],[".85","Progression normale"],[".7","Forte progression (cadre, promotions)"]], when:a=>a.sit!=="fonct"},
 {id:"primes", fine:true, pitch:"Ta part de primes, qui ne compte presque pas pour ta pension", t:"Quelle part de ton salaire viennent des primes ?", help:"La pension de la fonction publique se calcule sur le traitement indiciaire, sans les primes (sauf une petite retraite additionnelle).", type:"choice", opts:[["0.1","Moins de 15 %"],["0.2","Environ 20 %"],["0.3","Environ 30 %"],["0.4","40 % ou plus"]], when:a=>a.sit==="fonct"},
 {id:"tot", fine:true, pitch:"Partir le plus tôt possible, même avec une décote : à quel prix avec chaque programme", t:"Quand voudrais-tu partir ?", type:"choice", opts:[["non","Dès que j'ai le taux plein"],["oui","Le plus tôt possible, même avec une décote"]]}
];
const visible=()=>RQ.filter(q=>(!q.fine||unlocked)&&(!q.when||q.when(A)));
function profil(){
  const kids=+(unlocked?A.kids||0:0), kt=unlocked?A.kt||"moi":"autre";
  const perKid=A.sit==="fonct"?2:8, kidsTrim=kids?Math.min(kids,3)*perKid*(kt==="moi"?1:kt==="partage"?.5:0):0;
  return {y:+A.y||1980, s:+A.s||21, sit:A.sit||"prive", net:+A.net||0, gaps:unlocked?+A.gaps||0:0, kids, kidsTrim,
    evol:unlocked&&A.evol?+A.evol:.85, primes:unlocked&&A.primes?+A.primes:.2, tot:unlocked&&A.tot==="oui"};
}

/* ---------- Questionnaire ---------- */
let step=0;
function renderQ(){
  const vs=visible(); if(step>=vs.length) step=vs.length-1;
  const q=vs[step];
  document.getElementById("qnum").textContent=(step+1)+" / "+vs.length;
  document.getElementById("pbar").style.width=((step+1)/vs.length*100)+"%";
  const box=document.getElementById("qbox"); box.innerHTML="";
  if(q.fine){const e=document.createElement("span");e.className="eyebrow";e.textContent="Affinage";box.appendChild(e);}
  const h=document.createElement("h2"); h.textContent=q.t; box.appendChild(h);
  if(q.help){const p=document.createElement("p");p.className="qhelp";p.textContent=q.help;box.appendChild(p);}
  if(q.type==="choice"){
    const o=document.createElement("div");o.className="options";
    q.opts.forEach(([v,l])=>{const b=document.createElement("button");b.type="button";b.className="opt";b.textContent=l;
      b.setAttribute("aria-pressed",String(String(A[q.id])===v));
      b.onclick=()=>{A[q.id]=v;save();renderQ();setTimeout(next,140);};o.appendChild(b);});
    box.appendChild(o);
  } else {
    if(A[q.id]==null||A[q.id]===""){A[q.id]=q.def;save();}
    const r=document.createElement("div");r.className="numrow";
    const rg=document.createElement("input");rg.type="range";rg.min=q.min;rg.max=q.max;rg.step=q.step;rg.value=A[q.id];rg.setAttribute("aria-label",q.t);
    const nb=document.createElement("label");nb.className="numbox";
    const ni=document.createElement("input");ni.type="number";ni.min=q.min;ni.max=q.id==="net"?50000:q.max;ni.step=q.step;ni.value=A[q.id];ni.inputMode="numeric";ni.setAttribute("aria-label",q.t);
    const u=document.createElement("span");u.textContent=q.unit;nb.append(ni,u);
    const hint=document.createElement("p");hint.className="qhelp";
    const upd=()=>{ if(q.id==="y"){const y=+A.y; hint.textContent=y<1964?"Si tu es déjà parti, ce test ne change rien pour toi : les programmes ne touchent pas l'âge des retraités actuels.":"Âge légal actuel pour ta génération : "+fmtAge(ageLegalActuel(y))+", avec "+dureeActuelle(y)+" trimestres pour le taux plein.";} else hint.textContent=""; };
    const clamp=v=>q.id==="net"?Math.max(0,v):Math.min(q.max,Math.max(q.min,v));
    rg.oninput=()=>{A[q.id]=+rg.value;ni.value=rg.value;save();upd();};
    ni.oninput=()=>{if(ni.value==="")return;A[q.id]=clamp(+ni.value);rg.value=Math.min(A[q.id],q.max);save();upd();};
    ni.onchange=()=>{ni.value=A[q.id];};
    ni.onkeydown=e=>{if(e.key==="Enter")next();};
    r.append(rg,nb);box.appendChild(r);box.appendChild(hint);upd();
  }
  document.getElementById("prev").disabled=step===0;
  document.getElementById("next").textContent=step===vs.length-1?"Voir mon résultat":"Suivant";
}
let started=false;
function next(){ const vs=visible(), q=vs[step];
  if(q.type==="choice"&&A[q.id]==null) return;
  if(!started&&step===0){started=true;if(window.track)track("retraite-debut-test");}
  if(step<vs.length-1){step++;renderQ();} else showResults(); }
document.getElementById("next").onclick=next;
document.getElementById("prev").onclick=()=>{if(step>0){step--;renderQ();}};

/* ---------- Accès payant (commun avec le simulateur de vote) ---------- */
function fillUpsell(){ const ul=document.getElementById("upsell"); ul.innerHTML="";
  RQ.filter(q=>q.fine&&q.pitch&&(!q.when||q.when(A))).map(q=>q.pitch).concat(["Le même accès débloque le simulateur « Ce que coûte mon vote » (impôts, SMIC, IFI…)","Refaire le test autant de fois que tu veux"]).forEach(t=>{const li=document.createElement("li");li.textContent=t;ul.appendChild(li);}); }
function showLock(src){ fillUpsell(); const l=document.getElementById("lock"); l.hidden=false; if(window.track)track("retraite-demande-"+src); l.scrollIntoView({behavior:"smooth",block:"center"}); }
function openQuiz(fine){document.getElementById("lock").hidden=true;document.getElementById("results").hidden=true;document.getElementById("quiz").hidden=false;step=0;
  if(fine===true){const i=visible().findIndex(q=>q.fine); step=i>=0?i:0;}
  renderQ();document.getElementById("quiz").scrollIntoView({behavior:"smooth"});}
document.getElementById("refine").onclick=()=>{ if(!unlocked){showLock("affinage");return;} openQuiz(true); };
document.getElementById("teaserbtn").onclick=()=>showLock("encart");
document.getElementById("restart").onclick=()=>{ if(unlocked||!done){openQuiz();return;} showLock("modif"); };
document.getElementById("pay").addEventListener("click",()=>{sv("vo-from","retraite");if(window.track)track("retraite-clic-achat");});
function tryUnlock(raw,via){ return window.checkCode(raw).then(ok=>{ if(ok){unlocked=true;sv("vo-unlock",true);refreshAccess();if(window.track)track("retraite-code-"+(window.lastCodeId||"inconnu")+"-"+(via||"champ"));} return ok; }); }
function refreshAccess(){
  document.getElementById("restart").textContent=unlocked||!done?"Modifier mes réponses":"Modifier mes réponses ("+PRICE_LABEL+")";
  document.getElementById("refine").textContent=unlocked?"Affiner mon résultat":"Affiner mon résultat ("+PRICE_LABEL+")";
  if(unlocked) document.getElementById("lock").hidden=true;
  const pay=document.getElementById("pay");
  if(PAYMENT_URL){pay.href="acheter.html";pay.textContent="Débloquer pour "+PRICE_LABEL;}
  else{pay.href="mailto:"+CONTACT_EMAIL+"?subject="+encodeURIComponent("Ma retraite selon les candidats - demande de code");pay.textContent="Demander mon code";}
  document.querySelectorAll(".js-price").forEach(e=>e.textContent=PRICE_LABEL);
}
document.getElementById("codeOk").onclick=()=>{ const m=document.getElementById("codemsg"); m.style.color="";m.textContent="Vérification…"; tryUnlock(document.getElementById("code").value).then(ok=>{ if(ok){m.style.color="var(--gain)";m.textContent="Accès illimité activé. Tu peux affiner ta simulation.";setTimeout(()=>openQuiz(true),900);} else {m.style.color="";m.textContent="Ce code ne fonctionne pas. Vérifie-le et réessaie.";} }); };
document.getElementById("code").addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("codeOk").click();});
document.getElementById("share").onclick=async()=>{
  const url="https://vote.wagramconseil.fr/retraite.html", text="J'ai fait le test : voilà à quel âge je partirais à la retraite, et avec combien, selon chaque candidat à la présidentielle. Et toi ?";
  if(window.track)track("retraite-partage");
  try{ if(navigator.share){await navigator.share({title:"Ma retraite selon les candidats",text,url});return;} await navigator.clipboard.writeText(text+" "+url); document.getElementById("dlstatus").textContent="Lien copié, tu peux le coller où tu veux."; }catch(e){}
};

/* ---------- Résultat ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const chipT=t=>t===1?'<span class="chip t1">Tenable</span>':t===.5?'<span class="chip t05">Incertain</span>':'<span class="chip t0">Non tenable</span>';
const eur=n=>fmtPlain(Math.round(n/10)*10);
let last=null;
/* écart en mois → « −2,5 ans », « +3 mois », « = » */
const court=d=>{const m=Math.round(d); if(!m) return "="; const n=Math.abs(m), sg=m<0?"−":"+"; return sg+(n<12?n+" mois":(n/12).toLocaleString("fr-FR",{maximumFractionDigits:2})+" an"+(n>=24?"s":""));};
function chartHTML(res){
  const cur=res.actuel.a, max=Math.max(12,...RE_PARTIS.map(P=>Math.abs(res[P.k].a-cur)*12)), nice=Math.ceil(max/12)*12;
  let h="";
  for(const P of RE_PARTIS){ const p=NOM[P.k], d=(res[P.k].a-cur)*12, w=Math.abs(d)/nice*50, left=d<=0?50-w:50;
    const inside=w>22, far=w>14, valPos=inside?(d<0?`left:calc(${50-w}% + 6px);color:#fff`:`right:calc(${50-w}% + 6px);color:#fff`):far?(d<=0?`left:calc(50% + 6px)`:`right:calc(50% + 6px)`):d<=0?`right:calc(${50+w}% + 6px)`:`left:calc(${50+w}% + 6px)`;
    h+=`<div class="crow" style="--pc:var(${p.c})"><span class="lbl">${p.short}</span><div class="track"><span class="mid"></span><span class="fill" style="left:${left}%;width:${w}%"></span><span class="val" style="${valPos}">${court(d)}</span></div></div>`; }
  h+=`<div class="axis"><span>← plus tôt</span><span>${fmtAge(cur)} aujourd'hui</span><span>plus tard →</span></div>`;
  return h;
}
function showResults(fromLoad){
  const p=profil(), res=simulerRetraite(p); last={res,p};
  if(!fromLoad&&window.track) track(done?"retraite-simulation-payante":"retraite-simulation-gratuite");
  done=true; sv("re-done",true); refreshAccess();
  document.getElementById("quiz").hidden=true; const R=document.getElementById("results"); R.hidden=false;
  const c=res.actuel;
  document.getElementById("now").innerHTML=`<span class="eyebrow">Avec les règles actuelles</span><div class="nowrow"><div><span class="big">${fmtAge(c.a)}</span><span class="per">âge de départ ${p.tot?"au plus tôt":"au taux plein"}</span></div><div><span class="big">${eur(c.mois)}</span><span class="per">de pension nette par mois${c.dec>0?" (décote de "+Math.round(c.dec*100)+" %)":""}</span></div><div><span class="big">${eur(c.total)}</span><span class="per">touchés jusqu'à ${RE_HORIZON} ans</span></div></div>`;
  document.getElementById("tiles").innerHTML=RE_PARTIS.map(P=>{const p2=NOM[P.k], r=res[P.k], dt=r.total-c.total;
    return `<div class="tile" style="--pc:var(${p2.c})"><span class="pname">${p2.name}</span><span class="big">${fmtAge(r.a)}</span><span class="per">${fmtMois(r.a-c.a)} · ${eur(r.mois)} / mois</span><span class="per ${cls(dt)}"><b>${fmt(dt)}</b> jusqu'à ${RE_HORIZON} ans</span></div>`}).join("");
  document.getElementById("chart").innerHTML=`<h3>Ton âge de départ, comparé à aujourd'hui</h3>`+chartHTML(res);
  document.getElementById("parties").innerHTML=RE_PARTIS.map(P=>{const p2=NOM[P.k], r=res[P.k], dt=r.total-c.total;
    const barre=P.t===0?`<div class="line excluded"><span class="m">Promesse : départ à ${fmtAge(r.annonce.a)}, ${eur(r.annonce.mois)} par mois</span><span class="amt zero">${fmtMois(r.annonce.a-c.a)}</span><span class="note">${esc(P.tnote)}</span></div>`:"";
    const notes=r.notes.map(n=>`<div class="line${n.k===1?"":" info"}"><span class="m">${esc(n.m)}</span><span class="amt ${n.v?cls(n.v):"zero"}">${n.v?fmt(n.v):"non compté"}</span><span class="note">${esc(n.n)}</span></div>`).join("");
    const det=r.effet?" Tu pars avant 2028 : la réforme ne changerait rien ou presque pour toi.":"";
    return `<article class="card party" style="--pc:var(${p2.c})"><div class="phead"><h3>${p2.name}${chipT(P.t)}</h3><span class="tot ${cls(dt)}">${fmt(dt)}</span></div>
      <p class="qhelp">${esc(P.resume)}</p>
      <dl class="facts"><dt>Ton départ</dt><dd><b>${fmtAge(r.a)}</b> (${fmtMois(r.a-c.a)})${r.dec>0?", décote de "+Math.round(r.dec*100)+" %":""}</dd>
      <dt>Ta pension nette</dt><dd><b>${eur(r.mois)} par mois</b> (${fmt(r.mois-c.mois)} par rapport à aujourd'hui)</dd>
      <dt>Trimestres</dt><dd>${Math.min(r.T,r.D)} sur ${r.D} requis${r.cl!=null&&r.a>=r.cl&&r.a<(r.legal||0)?", départ anticipé carrière longue":""}</dd>
      <dt>Total jusqu'à ${RE_HORIZON} ans</dt><dd>${eur(r.total)} (${fmt(dt)})</dd></dl>
      <div class="lines">${barre}${notes}</div>${P.t!==0?`<p class="qhelp">${esc(P.tnote)}${det}</p>`:det?`<p class="qhelp">${det.trim()}</p>`:""}</article>`}).join("");
  const best=RE_PARTIS.slice().sort((x,y)=>res[y.k].total-res[x.k].total)[0];
  document.getElementById("headline").textContent=Math.abs(res[best.k].total-c.total)<50?"Pour ton profil, aucun programme ne change grand-chose.":"Écart entre les programmes pour toi : jusqu'à "+eur(Math.max(...RE_PARTIS.map(P=>res[P.k].total))-Math.min(...RE_PARTIS.map(P=>res[P.k].total)))+" de pension sur ta retraite.";
  const T=document.getElementById("teaser"); T.hidden=unlocked;
  document.getElementById("dlstatus").textContent="";
  if(!fromLoad) R.scrollIntoView({behavior:"smooth",block:"start"});
  loadPdfLibs().catch(()=>{});
}

/* ---------- Page A4 ---------- */
function buildA4(res,p){
  const c=res.actuel, d=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
  const prof=`Né(e) en ${p.y}, premier emploi à ${p.s} ans, ${{prive:"salarié du privé",fonct:"fonctionnaire",indep:"indépendant"}[p.sit]}, ${fmtPlain(p.net)} net par mois.${p.gaps?" "+p.gaps+" an"+(p.gaps>1?"s":"")+" sans trimestres.":""}${p.kids?" "+p.kids+(p.kids>=3?"+":"")+" enfant"+(p.kids>1?"s":"")+".":""}${p.tot?" Départ le plus tôt possible.":" Départ au taux plein."}`;
  const boxes=RE_PARTIS.map(P=>{const p2=NOM[P.k], r=res[P.k], dt=r.total-c.total;
    return `<div class="pbox" style="--pc:var(${p2.c})"><span class="n">${p2.name}</span><span class="v">${fmtAge(r.a)}</span><span class="mo">${fmtMois(r.a-c.a)}</span><ul><li><span>Pension nette</span><b>${eur(r.mois)}/mois</b></li><li><span>Jusqu'à ${RE_HORIZON} ans</span><b class="${cls(dt)}">${fmt(dt)}</b></li></ul><div class="ret">${P.t===0?"Promesse non tenable (départ à "+fmtAge(r.annonce.a)+"), version retenue":P.t===.5?"Financement incertain":"Tenable"}</div></div>`}).join("");
  document.getElementById("a4").innerHTML=`
   <div class="a4top"><div><div class="eyebrow" style="color:#5b6577">Présidentielle 2027 · simulation personnelle</div><h1>Ma retraite selon les candidats</h1></div><div class="sub">Édité le ${d}</div></div>
   <div class="prof"><b>Mon profil :</b> ${esc(prof)}</div>
   <div class="prof"><b>Aujourd'hui :</b> départ à ${fmtAge(c.a)}, ${eur(c.mois)} net par mois, ${eur(c.total)} jusqu'à ${RE_HORIZON} ans.</div>
   <div><div style="font:700 15px var(--f-display);margin-bottom:8px">Mon âge de départ, comparé à aujourd'hui</div><div class="chart chartA4">${chartHTML(res)}</div></div>
   <div class="grid">${boxes}</div>
   <div class="foot"><b style="color:#18202e;font-size:12px">Et toi, à quel âge pars-tu ? Test gratuit sur <span style="color:#2b4bd6">vote.wagramconseil.fr/retraite.html</span></b><br>Estimation indicative en euros de 2026, à salaire constant, régime de base et complémentaire, hors minimum contributif et minimum vieillesse. Règles actuelles : suspension de la réforme de 2023 (LFSS 2026). Réformes supposées appliquées aux départs à partir de 2028. Une promesse non tenable est remplacée par sa version réaliste. Programmes consultés en novembre 2026. Simulation non partisane, sans valeur de relevé officiel : ton estimation officielle est sur info-retraite.fr.</div>`;
}
const INAPP=/FBAN|FBAV|FB_IAB|Instagram|Messenger|LinkedInApp|Line\/|Snapchat|TikTok|musical_ly|Twitter/i.test(navigator.userAgent||"");
let pdfLibs=null;
function loadPdfLibs(){
  if(window.html2canvas&&window.jspdf) return Promise.resolve();
  if(!pdfLibs) pdfLibs=["vendor/html2canvas.min.js","vendor/jspdf.umd.min.js"].reduce((pr,src)=>pr.then(()=>new Promise((ok,ko)=>{
    const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s);})),Promise.resolve()).catch(e=>{pdfLibs=null;throw e;});
  return pdfLibs;
}
async function download(){
  const st=document.getElementById("dlstatus"), b=document.getElementById("dl");
  if(!last) return;
  if(window.track) track("retraite-clic-pdf"+(INAPP?"-inapp":""));
  b.disabled=true; st.textContent="Préparation de ta page A4…";
  try{
    await loadPdfLibs();
    buildA4(last.res,last.p); if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const canvas=await html2canvas(document.getElementById("a4"),{scale:2,backgroundColor:"#ffffff",width:794,height:1123,windowWidth:794,x:0,y:0,scrollX:0,scrollY:0,onclone:doc=>{doc.getElementById("a4").style.left="0";}});
    const pdf=new window.jspdf.jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    pdf.addImage(canvas.toDataURL("image/jpeg",.92),"JPEG",0,0,210,297);
    pdf.save("ma-retraite-selon-les-candidats.pdf");
    if(window.track) track("retraite-pdf");
    st.textContent=INAPP?"PDF créé. S'il n'apparaît pas, ouvre la page dans Safari ou Chrome.":"PDF téléchargé.";
  }catch(e){ st.textContent=INAPP?"Le PDF n'a pas pu être créé ici : ouvre la page dans Safari ou Chrome.":"Le PDF n'a pas pu être créé. Réessaie."; if(window.track)track("retraite-pdf-erreur"); }
  finally{b.disabled=false;}
}
document.getElementById("dl").onclick=download;
(function(){const m=location.search.match(/[?&]code=([^&]+)/); if(m){tryUnlock(decodeURIComponent(m[1]),"lien"); history.replaceState(null,"",location.pathname);}})();
/* Venu de la question d'accueil (index.html) : l'année de naissance est déjà répondue, on enchaîne sur la question 2. */
if(/[?&]suite=1/.test(location.search)&&!done&&A.y){ step=1; started=true; if(window.track) track("retraite-debut-test"); history.replaceState(null,"",location.pathname); }
refreshAccess();
if(done&&A.sit) showResults(true);
renderQ();
