"use strict";
/* Le fonctionnement de la page : questionnaire, accès payant, affichage du résultat, page A4 en PDF.
   Les réglages (prix, paiement, contact) sont dans reglages.js, les questions dans js/questions.js,
   les programmes dans js/programmes.js et les règles fiscales actuelles dans js/fiscalite.js. */
function ld(k,d){try{var v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
var unlocked = ld('vo-unlock', false) === true;
var done = ld('vo-done', false) === true;
/* Réponses déjà données dans le test retraite (statut, âge, salaire, premier emploi) : voir js/passerelle.js */
if(!done){ const ks=PASSERELLE.remplir(A, PASSERELLE.lire("vo-answers"), PASSERELLE.versVote(PASSERELLE.lire("re-answers"))), n=ks.filter(k=>k!=="start"||unlocked).length;
  if(ks.length) save();
  if(n){ const r=document.getElementById("repris"); r.textContent="Tes réponses du test retraite sont déjà remplies ("+n+" réponse"+(n>1?"s":"")+") : vérifie-les en passant."; r.hidden=false; if(window.track) setTimeout(()=>track("vote-reponses-reprises"),1500); } }

let step=0;
const visible=()=>Q.filter(q=>(!q.fine||unlocked)&&(!q.when||q.when(A)));
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
  } else if(q.type==="income"){
    const ind=q.id==="rev"&&A.sit==="indep";
    let mode=A[q.id+"M"]||(ind?"res":"net"); if(ind&&mode==="brut") mode="res"; if(!ind&&mode==="res") mode="net"; A[q.id+"M"]=mode;
    const o=document.createElement("div");o.className="options";o.style.gridTemplateColumns="repeat(auto-fit,minmax(160px,1fr))";
    (ind?[["res","Résultat net par an"],["net","Net par mois avant impôt"],["apres","Net versé (après impôt)"]]:[["net","Net par mois avant impôt"],["apres","Net versé (après impôt)"],["brut","Brut par an"]]).forEach(([v,l])=>{const b=document.createElement("button");b.type="button";b.className="opt";b.textContent=l;b.setAttribute("aria-pressed",String(mode===v));b.onclick=()=>{A[q.id+"M"]=v;save();renderQ();};o.appendChild(b);});
    box.appendChild(o);
    const key=mode==="brut"?q.id+"B":mode==="apres"?q.id+"A":mode==="res"?q.id+"R":q.id, mx=mode==="brut"?150000:mode==="res"?200000:12000, st=mode==="brut"?500:mode==="res"?1000:50;
    if(A[key]==null){const sv=A[q.id+"M"];A[q.id+"M"]="net";const n0=netOf(A,q.id);A[q.id+"M"]=sv; A[key]=mode==="apres"?Math.round(n0*(1-pasRate(n0))/50)*50:mode==="brut"?Math.round(n0*12/.78/500)*500:mode==="res"?Math.round(n0*12/1000)*1000:n0;}
    const r=document.createElement("div");r.className="numrow";
    const rg=document.createElement("input");rg.type="range";rg.min=0;rg.max=mx;rg.step=st;rg.value=A[key];rg.id="r_"+key;rg.setAttribute("aria-label",q.t);
    const nb=document.createElement("label");nb.className="numbox";
    const ni=document.createElement("input");ni.type="number";ni.min=0;ni.step=st;ni.value=A[key];ni.id="n_"+key;ni.inputMode="numeric";
    const u=document.createElement("span");u.textContent=mode==="brut"||mode==="res"?"€ / an":"€ / mois";nb.append(ni,u);
    const hint=document.createElement("p");hint.className="qhelp";
    const upd=()=>{ if(mode==="res"){hint.textContent="Ton bénéfice de l'année après cotisations sociales, celui que tu déclares aux impôts. En micro-entreprise : ton chiffre d'affaires moins l'abattement forfaitaire (71 %, 50 % ou 34 % selon l'activité). Soit environ "+fmtPlain(netOf(A,q.id))+" par mois.";} else if(mode==="apres"){hint.textContent="Le montant versé sur ton compte, après prélèvement à la source. Soit environ "+fmtPlain(netOf(A,q.id))+" net par mois avant impôt (estimé avec le taux neutre du prélèvement).";} else if(mode==="brut"){const b=+A[key]||0;hint.textContent="Soit environ "+fmtPlain(netOf(A,q.id))+" net par mois avant impôt sur le revenu."+(q.id==="rev"&&A.sit==="indep"?" Pour un indépendant, on retient environ 75 % du revenu brut.":"")+(b>0&&b<8000?" Attention : c'est un montant par an. Pour un salaire mensuel, choisis « Net par mois ».":"");} else {const v=+A[key]||0;hint.textContent=v>15000?"Attention : "+fmtPlain(v)+" par mois, soit "+fmtPlain(v*12)+" par an. Si tu as tapé un montant annuel, choisis « Brut par an » ou divise par 12.":"";} };
    rg.oninput=()=>{A[key]=+rg.value;ni.value=rg.value;save();upd();};
    ni.oninput=()=>{const v=Math.max(0,+ni.value||0);A[key]=v;rg.value=Math.min(v,mx);save();upd();};
    ni.onkeydown=e=>{if(e.key==="Enter")next();};
    r.append(rg,nb);box.appendChild(r);box.appendChild(hint);upd();
  } else if(q.type==="loan"){
    const mode=A.loanM||"calc";
    const o=document.createElement("div");o.className="options";o.style.gridTemplateColumns="repeat(auto-fit,minmax(160px,1fr))";
    [["calc","Calcule-les pour moi"],["direct","Je connais le montant"]].forEach(([v,l])=>{const b=document.createElement("button");b.type="button";b.className="opt";b.textContent=l;b.setAttribute("aria-pressed",String(mode===v));b.onclick=()=>{A.loanM=v;if(v==="calc")A.loanInt=loanCalc(A).int;save();renderQ();};o.appendChild(b);});
    box.appendChild(o);
    const rows=mode==="calc"?[["loanP","Montant emprunté","€",1000],["loanR","Taux du crédit (hors assurance)","%",.05],["loanY","Année de début du prêt","",1],["loanD","Durée du prêt","ans",1]]:[["loanInt","Intérêts payés cette année (tableau d'amortissement)","€ / an",100]];
    const DEF={loanP:200000,loanR:2,loanY:2020,loanD:20,loanInt:0};
    const g=document.createElement("div");g.className="assets";
    const tot=document.createElement("p");tot.className="qhelp";
    const sum=()=>{ if(mode!=="calc"){tot.textContent="Montant annuel des intérêts, hors assurance.";return;} const c=loanCalc(A); A.loanInt=c.int; save();
      tot.textContent=c.done?"Ton prêt est remboursé : pas d'intérêts cette année.":"Intérêts estimés en "+c.year+" : "+fmtPlain(c.int)+" (mensualité hors assurance d'environ "+fmtPlain(c.pay)+", capital restant dû d'environ "+fmtPlain(c.left)+"). Calcul à mensualités constantes, prêt supposé démarrer en janvier."; };
    rows.forEach(([k,l,un,st])=>{ if(A[k]==null||A[k]==="")A[k]=DEF[k];
      const lab=document.createElement("label");lab.className="arow";lab.htmlFor="n_"+k;const t=document.createElement("span");t.textContent=l;
      const nb=document.createElement("span");nb.className="numbox";const ni=document.createElement("input");ni.type="number";ni.min=0;ni.step=st;ni.value=A[k];ni.id="n_"+k;ni.inputMode=st<1?"decimal":"numeric";
      const u=document.createElement("span");u.textContent=un;nb.append(ni,u);
      ni.oninput=()=>{A[k]=Math.max(0,+String(ni.value).replace(",",".")||0);save();sum();};
      ni.onkeydown=e=>{if(e.key==="Enter")next();};
      lab.append(t,nb);g.appendChild(lab);});
    box.appendChild(g);box.appendChild(tot);sum();
  } else if(q.type==="assets"){
    if(!A.patFine){const P=+A.pat;A.rp=Math.round(P*.25);A.im=Math.round(P*.25);A.fi=Math.round(P*.5);A.de=0;A.pro=0;}
    const g=document.createElement("div");g.className="assets";
    [["rp","Résidence principale (valeur)"],["im","Autre immobilier (locatif, résidence secondaire, SCPI)"],["fi","Placements financiers (actions, assurance-vie, comptes, parts de société)"],["pro","Dont parts de ta propre entreprise (biens professionnels, exonérés d'ISF)"],["de","Crédits restant dus sur l'immobilier"]].forEach(([k,l])=>{
      const lab=document.createElement("label");lab.className="arow";lab.htmlFor="n_"+k;const t=document.createElement("span");t.textContent=l;
      const nb=document.createElement("span");nb.className="numbox";const ni=document.createElement("input");ni.type="number";ni.min=0;ni.step=10000;ni.value=A[k];ni.id="n_"+k;ni.inputMode="numeric";
      const u=document.createElement("span");u.textContent="€";nb.append(ni,u);
      ni.oninput=()=>{A[k]=Math.max(0,+ni.value||0);A.patFine=true;save();sum();};
      lab.append(t,nb);g.appendChild(lab);});
    const tot=document.createElement("p");tot.className="qhelp";
    const sum=()=>{const w=wealth(A);tot.textContent=(A.patFine?"Patrimoine net : ":"Estimation de départ (moitié immobilier, moitié financier) : ")+fmtPlain(w.net)+". IFI actuel estimé : "+fmtPlain(isf(w.ifiBase))+" par an.";};
    box.appendChild(g);box.appendChild(tot);sum();
  } else {
    if(A[q.id]==null||A[q.id]===""){A[q.id]=q.def?q.def(A):q.min;save();}
    const r=document.createElement("div");r.className="numrow";
    const rg=document.createElement("input");rg.type="range";rg.min=q.min;rg.max=q.max;rg.step=q.step;rg.value=A[q.id];rg.id="r_"+q.id;rg.setAttribute("aria-label",q.t);
    const nb=document.createElement("label");nb.className="numbox";
    const ni=document.createElement("input");ni.type="number";ni.min=q.min;ni.max=q.max*3;ni.step=q.step;ni.value=A[q.id];ni.id="n_"+q.id;ni.inputMode="numeric";
    const u=document.createElement("span");u.textContent=q.unit;nb.append(ni,u);
    rg.oninput=()=>{A[q.id]=+rg.value;ni.value=rg.value;save();};
    ni.oninput=()=>{const v=Math.max(0,+ni.value||0);A[q.id]=v;rg.value=Math.min(v,q.max);save();};
    ni.onkeydown=e=>{if(e.key==="Enter")next();};
    r.append(rg,nb);box.appendChild(r);
  }
  document.getElementById("prev").disabled=step===0;
  document.getElementById("next").textContent=step===vs.length-1?"Voir mon résultat":"Suivant";
}
let started=false;
function next(){if(!started&&step===0){started=true;if(window.track)track("vote-debut-test");} const vs=visible(); if(step<vs.length-1){step++;renderQ();} else showResults();}
document.getElementById("next").onclick=next;
document.getElementById("prev").onclick=()=>{if(step>0){step--;renderQ();}};
function fillUpsell(){
  const fq=Q.filter(q=>q.fine&&(!q.when||q.when(A)));
  const ul=document.getElementById("upsell"); ul.innerHTML="";
  fq.map(q=>q.pitch).filter(Boolean).concat(["Changer tes réponses autant de fois que tu veux : augmentation, naissance, déménagement, départ à la retraite…"]).forEach(t=>{const li=document.createElement("li");li.textContent=t;ul.appendChild(li);});
  if(last){const n=PARTIES.reduce((s,p)=>s+(last[p.k].hyp||0),0); document.getElementById("hypcount").textContent=n>0?"Dans ta simulation gratuite, "+n+" montant"+(n>1?"s reposent":" repose")+" sur des moyennes nationales ou des estimations, faute de connaître ta situation exacte.":"Ta simulation gratuite utilise des moyennes nationales quand elle ne connaît pas ta situation exacte.";}
}
function showLock(src){ fillUpsell(); const l=document.getElementById("lock"); l.hidden=false; if(window.track)track("vote-demande-"+src); l.scrollIntoView({behavior:"smooth",block:"center"}); }
document.getElementById("refine").onclick=()=>{ if(!unlocked){showLock("affinage");return;} openQuiz(true); };
function openQuiz(fine){document.getElementById("lock").hidden=true;document.getElementById("results").hidden=true;document.getElementById("quiz").hidden=false;step=0;
  if(fine===true){const vs=visible(); const i=vs.findIndex(q=>q.fine); step=i>=0?i:0;}
  renderQ();document.getElementById("quiz").scrollIntoView({behavior:"smooth"});}
document.getElementById("teaserbtn").onclick=()=>showLock("encart");
/* Passerelle vers le test retraite (js/passerelle.js) : texte selon ce que la personne a déjà fait, caché pour un retraité */
function majPasserelle(){
  const card=document.getElementById("versretraite"), t=document.getElementById("vr-txt"), b=document.getElementById("vr-btn");
  card.hidden=A.sit==="retr"||A.age==="a62";
  if(ld("re-done",false)===true){ b.textContent="Revoir ma retraite"; t.textContent="Ton résultat retraite est gardé dans ce navigateur. Si tu as changé ta situation ici, modifie-la aussi là-bas."; return; }
  const n=Object.keys(PASSERELLE.versRetraite(A)).length;
  t.textContent="Quatre questions, résultat gratuit."+(n?" Tes réponses déjà données ici ("+["sit","net","s"].filter(k=>k in PASSERELLE.versRetraite(A)).map(k=>({sit:"statut",net:"salaire",s:"âge du premier emploi"})[k]).join(", ")+") sont reprises : il te reste peu à remplir.":"");
}
document.getElementById("vr-btn").addEventListener("click",()=>{if(window.track)track("vote-vers-retraite");});
document.getElementById("navretraite").addEventListener("click",()=>{if(window.track)track("vote-nav-retraite");});
document.getElementById("versfrais").addEventListener("click",()=>{if(window.track)track("vote-vers-frais");});
document.getElementById("pay").addEventListener("click",()=>{sv("vo-from","vote");if(window.track)track("vote-clic-achat");});
document.getElementById("share").onclick=async()=>{
  const url="https://vote.wagramconseil.fr/", text="J'ai fait le test : voilà ce que les programmes de la présidentielle changeraient pour mon budget. Et toi, combien ça te coûte ?";
  if(window.track)track("vote-partage-resultat");
  try{ if(navigator.share){await navigator.share({title:"Ce que coûte mon vote",text,url});return;} await navigator.clipboard.writeText(text+" "+url); document.getElementById("dlstatus").textContent="Lien copié, tu peux le coller où tu veux."; }catch(e){}
};
document.getElementById("restart").onclick=()=>{ if(unlocked||!done){openQuiz();return;} showLock("modif"); };
function tryUnlock(raw,via){ return window.checkCode(raw).then(ok=>{ if(ok){unlocked=true;sv("vo-unlock",true);refreshAccess();if(window.track)track("vote-code-"+(window.lastCodeId||"inconnu")+"-"+(via||"champ"));} return ok; }); }
function refreshAccess(){
  document.getElementById("restart").textContent=unlocked||!done?"Modifier mes réponses":"Modifier mes réponses ("+PRICE_LABEL+")";
  document.getElementById("refine").textContent=unlocked?"Affiner mon résultat":"Affiner mon résultat ("+PRICE_LABEL+")";
  if(unlocked) document.getElementById("lock").hidden=true;
  const pay=document.getElementById("pay");
  if(PAYMENT_URL){pay.href="acheter.html";pay.textContent="Débloquer pour "+PRICE_LABEL;document.getElementById("mailline").textContent="Tu indiques ton nom et ton mail, tu paies, et ton code t'est envoyé par mail dès réception du paiement.";}
  else{pay.href="mailto:"+CONTACT_EMAIL+"?subject="+encodeURIComponent("Ce que coûte mon vote - demande de code");pay.textContent="Demander mon code";document.getElementById("mailline").textContent="Écris à "+CONTACT_EMAIL+" et je t'envoie un code.";}
  document.querySelectorAll(".js-price").forEach(e=>e.textContent=PRICE_LABEL);
  document.querySelectorAll(".js-mail").forEach(a=>{a.href="mailto:"+CONTACT_EMAIL;a.textContent=CONTACT_EMAIL;});
}
document.getElementById("codeOk").onclick=()=>{ const m=document.getElementById("codemsg"); m.style.color="";m.textContent="Vérification…"; tryUnlock(document.getElementById("code").value).then(ok=>{ if(ok){m.style.color="var(--gain)";m.textContent="Accès illimité activé. Tu peux modifier tes réponses.";if(window.track)track("vote-code-ok");setTimeout(()=>openQuiz(true),900);} else {m.style.color="";m.textContent="Ce code ne fonctionne pas. Vérifie-le et réessaie.";} }); };
document.getElementById("code").addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("codeOk").click();});

/* ---------- Affichage ---------- */
const chip=k=>k===1?'<span class="chip t1">Tenable</span>':k===.5?'<span class="chip t05">À moitié</span>':'<span class="chip t0">Non tenable</span>';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let last=null;
function chartHTML(res){
  const max=Math.max(200,...PARTIES.map(p=>Math.abs(res[p.k].total)));
  const nice=Math.ceil(max*1.3/500)*500;
  let h="";
  for(const p of PARTIES){const v=res[p.k].total, w=Math.abs(v)/nice*50;
    const left=v>=0?50:50-w;
    /* Barre longue : le montant passe de l'autre côté du zéro pour ne pas sortir du cadre sur mobile. */
    const far=w>25, valPos=v>=0?(far?`right:calc(50% + 6px)`:`left:calc(${50+w}% + 6px)`):(far?`left:calc(50% + 6px)`:`right:calc(${50+w}% + 6px)`);
    h+=`<div class="crow" style="--pc:var(${p.c})"><span class="lbl">${p.short}</span><div class="track"><span class="mid"></span><span class="fill" style="left:${left}%;width:${w}%"></span><span class="val" style="${valPos}">${fmt(v)}</span></div></div>`;}
  h+=`<div class="axis"><span>−${nice.toLocaleString("fr-FR")} €</span><span>0</span><span>+${nice.toLocaleString("fr-FR")} €</span></div>`;
  return h;
}
function showResults(fromLoad){
  const res=compute(A); last=res;
  if(!fromLoad&&window.track) track(done?"vote-simulation-payante":"vote-simulation-gratuite");
  done=true; sv("vo-done",true); refreshAccess(); majPasserelle();
  document.getElementById("quiz").hidden=true; const R=document.getElementById("results"); R.hidden=false;
  document.getElementById("tiles").innerHTML=PARTIES.map(p=>{const v=res[p.k].total;
    return `<div class="tile" style="--pc:var(${p.c})"><span class="pname">${p.name}</span><span class="big ${cls(v)}">${fmt(v)}</span><span class="per">soit ${fmt(v/12)} par mois</span></div>`}).join("");
  document.getElementById("chart").innerHTML=`<h3>Comparaison</h3>`+chartHTML(res);
  document.getElementById("parties").innerHTML=PARTIES.map(p=>{const r=res[p.k];
    const lines=r.lines.map(l=>`<div class="line${l.k===0?" excluded":""}"><span class="m">${esc(l.m)}${chip(l.k)}</span><span class="amt ${l.k?cls(l.v*l.k):"zero"}">${l.k===0?fmt(l.v):fmt(l.v*l.k)}</span><span class="note">${esc(l.n)}${l.k===.5?" Montant plein : "+fmt(l.v)+".":""}</span></div>`).join("");
    const her=r.herit?`<dt>Droits sur ton héritage</dt><dd>${fmtPlain(r.herit.then)} (aujourd'hui ${fmtPlain(r.herit.now)}). ${esc(r.herit.hyp)}</dd>`:"";
    return `<article class="card party" style="--pc:var(${p.c})"><div class="phead"><h3>${p.name}</h3><span class="tot ${cls(r.total)}">${fmt(r.total)} / an</span></div><div class="lines">${lines||'<p class="qhelp">Aucune mesure chiffrable ne te concerne directement.</p>'}</div><dl class="facts"><dt>Âge de départ à la retraite</dt><dd>${esc(r.retraite)}${r.perso?" <b>"+esc(r.perso)+"</b>":""}</dd>${r.remu?"<dt>Salaire ou dividendes ?</dt><dd><b>"+esc(r.remu)+"</b> "+esc(res.remuHyp||"")+"</dd>":""}${her}</dl></article>`}).join("");
  const nh=PARTIES.reduce((t,p)=>t+(res[p.k].hyp||0),0), T=document.getElementById("teaser");
  T.hidden=unlocked; if(!unlocked) document.getElementById("teasertxt").textContent=nh>0?nh+" montant"+(nh>1?"s":"")+" de ton résultat "+(nh>1?"reposent":"repose")+" sur des moyennes nationales ou des estimations.":"Ton résultat repose en partie sur des moyennes nationales.";
  document.getElementById("dlstatus").textContent="";
  if(!fromLoad) R.scrollIntoView({behavior:"smooth",block:"start"});
  loadPdfLibs().catch(()=>{});
}

/* ---------- Page A4 ---------- */
const LBL={sit:{prive:"salarié du privé",fonct:"fonctionnaire",indep:"indépendant",chom:"demandeur d'emploi",retr:"retraité",etud:"étudiant ou sans activité"},
  age:{u30:"moins de 30 ans",a30:"30-49 ans",a50:"50-61 ans",a62:"62 ans et plus"},log:{loc:"locataire",apl:"locataire avec APL",prop:"propriétaire"}};
function buildA4(res){
  const a=A, enf=+a.enf;
  const prof=`${LBL.sit[a.sit]}, ${LBL.age[a.age]}, ${fmtPlain(netOf(a,"rev"))} net/mois avant impôt${a.couple==="oui"?", en couple (conjoint : "+fmtPlain(netOf(a,"revc"))+")":", seul"}, ${enf?enf+(enf>=3?"+":"")+" enfant"+(enf>1?"s":""):"sans enfant"}${enf&&a.ecole?" ("+{pub:"école publique",priv:"école privée",mix:"public et privé",none:"non scolarisés"}[a.ecole]+")":""}, ${LBL.log[a.log]}. Énergie ${fmtPlain(+a.ener)}/mois, carburant ${fmtPlain(+a.carb)}/mois.${+a.pat>=1300000?" Patrimoine net "+fmtPlain(wealth(a).net)+".":""}`;
  const boxes=PARTIES.map(p=>{const r=res[p.k];
    const ls=r.lines.filter(l=>l.k>0&&Math.abs(l.v)>1).sort((x,y)=>Math.abs(y.v*y.k)-Math.abs(x.v*x.k)).slice(0,2)
      .map(l=>`<li><span>${esc(l.m)}${l.k===.5?" (½)":""}</span><b class="${cls(l.v*l.k)}">${fmt(l.v*l.k)}</b></li>`).join("")||`<li><span>Aucune mesure chiffrable pour ton profil</span><b class="zero">0 €</b></li>`;
    const her=r.herit?`<div class="ret">Héritage : ${fmtPlain(r.herit.then)} de droits (auj. ${fmtPlain(r.herit.now)})</div>`:"";
    return `<div class="pbox" style="--pc:var(${p.c})"><div class="h"><span class="n">${p.name}</span><span class="v ${cls(r.total)}">${fmt(r.total)}</span></div><span class="mo">par an, soit ${fmt(r.total/12)} par mois</span><ul>${ls}</ul><div class="ret">Retraite : ${esc(r.perso||r.retraite)}</div>${her}</div>`}).join("");
  const d=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
  document.getElementById("a4").innerHTML=`
   <div class="a4top"><div><div class="eyebrow" style="color:#5b6577">Présidentielle 2027 · simulation personnelle</div><h1>Ce que coûte mon vote</h1></div><div class="sub">Édité le ${d}</div></div>
   <div class="prof"><b>Mon profil :</b> ${esc(prof)}</div>
   <div><div style="font:700 15px var(--f-display);margin-bottom:8px">Impact net sur mon budget, par an</div><div class="chart chartA4">${chartHTML(res)}</div></div>
   <div class="grid">${boxes}</div>
   <div class="foot"><b style="color:#18202e;font-size:12px">Et toi, combien ça te coûte ? <span style="color:#2b4bd6">vote.wagramconseil.fr</span> · Et ta retraite ? <span style="color:#2b4bd6">vote.wagramconseil.fr/retraite.html</span></b><br>Comparaison avec les règles en vigueur fin 2026. Seules les promesses jugées tenables sont comptées : en entier (légales et finançables) ou pour moitié « ½ » (coûteuses ou juridiquement fragiles). Les promesses non tenables (contraires au droit européen, facultatives ou sans financement) sont exclues. Les effets indirects (inflation, emploi, dette, services publics) ne sont pas comptés. Programmes consultés en novembre 2026 (RN, LFI, PS, Renaissance, LR, Écologistes, Nouvelle Énergie, Horizons). Simulation indicative et non partisane.</div>`;
}
/* Navigateurs intégrés (Facebook, Instagram, Messenger…) : le téléchargement de fichiers y est souvent bloqué. */
const INAPP=/FBAN|FBAV|FB_IAB|Instagram|Messenger|LinkedInApp|Line\/|Snapchat|TikTok|musical_ly|Twitter/i.test(navigator.userAgent||"");
const INAPP_MSG="Tu es dans le navigateur d'une appli (Facebook, Instagram…), qui bloque souvent les téléchargements. Si le PDF n'apparaît pas, ouvre cette page dans Safari ou Chrome (menu ⋯ puis « Ouvrir dans le navigateur »). Tes réponses seront à refaire : elles restent enregistrées dans ce navigateur-ci.";
/* Les deux librairies du PDF (550 Ko) ne se chargent qu'une fois le résultat affiché, pas pendant le questionnaire. */
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
  if(window.track) track("vote-clic-pdf"+(INAPP?"-inapp":""));
  if(!window.html2canvas||!window.jspdf){b.disabled=true;st.textContent="Préparation de ta page A4…";try{await loadPdfLibs();}catch(e){}b.disabled=false;}
  if(!window.html2canvas||!window.jspdf){st.textContent="Le générateur de PDF n'a pas pu se charger. Recharge la page.";if(window.track)track("vote-pdf-erreur-chargement");return;}
  b.disabled=true; st.textContent="Préparation de ta page A4…";
  try{
    buildA4(last); if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const node=document.getElementById("a4");
    const canvas=await html2canvas(node,{scale:2,backgroundColor:"#ffffff",width:794,height:1123,windowWidth:794,x:0,y:0,scrollX:0,scrollY:0,
      onclone:doc=>{const n=doc.getElementById("a4");n.style.left="0";}});
    const pdf=new window.jspdf.jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    pdf.addImage(canvas.toDataURL("image/jpeg",.92),"JPEG",0,0,210,297);
    pdf.save("ce-que-coute-mon-vote.pdf");
    if(window.track) track("vote-pdf");
    st.textContent=INAPP?"PDF créé. S'il n'apparaît pas, lis la note ci-dessous.":"PDF téléchargé.";
  }catch(e){ st.textContent=INAPP?"Le PDF n'a pas pu être créé ici : lis la note ci-dessous.":"Le PDF n'a pas pu être créé. Réessaie."; if(window.track)track("vote-pdf-erreur"+(INAPP?"-inapp":"")); }
  finally{b.disabled=false;}
}
document.getElementById("dl").onclick=download;
if(INAPP){const n=document.getElementById("inapp");n.textContent=INAPP_MSG;n.hidden=false;}
(function(){const m=location.search.match(/[?&]code=([^&]+)/); if(m){tryUnlock(decodeURIComponent(m[1]),"lien"); history.replaceState(null,"",location.pathname);}})();
refreshAccess();
if(done){ showResults(true); }
renderQ();
