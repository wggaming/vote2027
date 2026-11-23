"use strict";
/* « Et si mes cotisations avaient été placées ? » : capitalisation et modèles étrangers (test retraite).
   Tout est en euros de 2026, rendements réels (après inflation) et nets de frais.
   Pour changer une hypothèse : modifier les constantes ci-dessous, puis la section « Comment on calcule » de retraite.html. */

const CAPI_TAUX = [                 // rendements réels nets de frais, par an
  {k:"prudent", nom:"Prudent", r:.02, aide:"surtout des obligations, comme un fonds en euros"},
  {k:"equilibre", nom:"Équilibré", r:.035, aide:"moitié actions, comme un fonds de pension type 401(k)"}
];
const CAPI_PRELEV = .91;            // prélèvements sur une rente (ordre de grandeur, comme une pension)
/* Rente viagère indexée sur les prix : part du capital versée chaque année, selon l'âge de départ */
const capiConv = a => Math.max(.03, .04 + .0015*(a-65));
const FR_MOYEN = 42000;             // salaire brut moyen annuel en France (INSEE, ~2 735 € net par mois en équivalent temps plein)
const FR_MEDIAN = 33600;            // salaire brut médian annuel en France (~2 180 € net par mois)

/* Taux de cotisation retraite français (salarié + employeur) sur le salaire brut annuel */
function cotisFR(p, brut){
  if(p.sit==="fonct"){ const ti=brut*(1-p.primes); return .111*ti + .3065*ti + .10*brut*Math.min(p.primes,.2); } // pension civile 11,1 % + CNRACL employeur 30,65 % + RAFP 5+5 % sur primes
  if(p.sit==="indep") return .25*Math.min(brut,PASS) + .09*Math.max(0,Math.min(brut,4*PASS)-PASS);           // SSI base + complémentaire
  return .28*Math.min(brut,PASS) + .27*Math.max(0,Math.min(brut,8*PASS)-PASS);                             // CNAV + Agirc-Arrco (avec CEG/CET)
}
const brutAn = p => p.sit==="fonct" ? p.net*12/.83 : p.net*12/.78*p.evol;
const annees = (p,a) => Math.max(0, a - p.s - p.gaps);
/* Capital obtenu en plaçant c € par an pendant n années, versements en milieu d'année */
const capital = (c,n,r) => n<=0 ? 0 : c*((Math.pow(1+r,n)-1)/r)*Math.sqrt(1+r);
const rente = (K,a) => K*capiConv(a)*CAPI_PRELEV/12;

/* Allemagne : retraite par points (répartition), 18,6 % du salaire. Transposée à ton salaire relatif. */
const DE = {rentenwert:42.52, moyen:51944, plafond:101400, taux:.186, prelev:.11};
function modeleDE(p){
  const age = p.y>=1964 ? 67 : p.y===1963 ? 66+8/12 : 66.5;
  let a=age, n=annees(p,age);
  if(p.y>=1964 && annees(p,65)>=45){ a=65; n=annees(p,65); }   // 45 ans cotisés : départ à 65 ans sans décote
  const x=Math.min(brutAn(p)/FR_MOYEN, DE.plafond/DE.moyen);
  const enfants=p.kidsTrim/(p.sit==="fonct"?2:8)*3;              // 3 points par enfant pour le parent qui l'élève
  const mois=(n*x+enfants)*DE.rentenwert*(FR_MOYEN/DE.moyen)*(1-DE.prelev);
  return {k:"de", nom:"Allemagne", a, mois, cotis:"18,6 % du salaire", detail:"Retraite par points, comme en France : chaque année au salaire moyen donne un point ("+fmtPlain(DE.rentenwert)+" par mois en 2026). Départ à 67 ans, ou 65 ans après 45 ans de cotisation."};
}
/* États-Unis : Social Security (répartition, 12,4 %) + 401(k) facultatif (capitalisation, ~10 % en moyenne) */
const US = {b1:1286/5820.55, b2:7749/5820.55, plafond:184500/69846.57, medicare:.035, k401:.10};
function modeleUS(p){
  const a=67, n=annees(p,a), x=Math.min(brutAn(p)/FR_MOYEN, US.plafond)*Math.min(n,35)/35;
  const pia=.9*Math.min(x,US.b1)+.32*Math.max(0,Math.min(x,US.b2)-US.b1)+.15*Math.max(0,x-US.b2);
  const ss=Math.max(0,(pia-US.medicare)*FR_MOYEN/12*(n>=10?1:0));
  const k=capital(US.k401*brutAn(p), n, CAPI_TAUX[1].r), plus=rente(k,a);
  return {k:"us", nom:"États-Unis", a, mois:ss+plus, part:{repartition:ss, capi:plus}, cotis:"12,4 % + 10 % placés", detail:"Social Security (répartition, plus généreuse pour les petits salaires) : "+eur0(ss)+" par mois. Un 401(k) placé à 3,5 % (seule la moitié des salariés en a un) : "+eur0(plus)+" par mois. Départ à 67 ans."};
}
/* Royaume-Uni : pension d'État forfaitaire (£241,30 par semaine en 2026, 35 ans requis) + épargne d'entreprise obligatoire de 8 % */
const UK = {forfaitRel:241.30*52/39039, bas:6240/39039, haut:50270/39039, taux:.08};
function modeleUK(p){
  const a=p.y>=1978?68:67, n=annees(p,a);
  const etat=n<10?0:UK.forfaitRel*FR_MEDIAN/12*Math.min(1,n/35);
  const b=brutAn(p), assiette=Math.max(0,Math.min(b,UK.haut*FR_MEDIAN)-UK.bas*FR_MEDIAN);
  const plus=rente(capital(UK.taux*assiette, n, CAPI_TAUX[1].r), a);
  return {k:"uk", nom:"Royaume-Uni", a, mois:etat+plus, part:{repartition:etat, capi:plus}, cotis:"8 % placés + cotisations sociales", detail:"Pension d'État forfaitaire, la même pour tous après 35 ans : "+eur0(etat)+" par mois. Épargne d'entreprise obligatoire de 8 %, placée à 3,5 % : "+eur0(plus)+" par mois. Départ à "+a+" ans."};
}
const eur0 = n => fmtPlain(Math.round(n/10)*10);

function simulerCapi(p, actuel){
  const a=actuel.a, n=annees(p,a), c=cotisFR(p,brutAn(p));
  const scen=CAPI_TAUX.map(t=>{const K=capital(c,n,t.r); return Object.assign({K, mois:rente(K,a)}, t);});
  return {a, n, cotisAn:c, scen, pays:[modeleDE(p), modeleUK(p), modeleUS(p)]};
}

/* ---------- Affichage ---------- */
(function(){ const s=document.createElement("style"); s.textContent=`
#capi h3{margin-bottom:4px}
#capi .ctiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}
#capi .ct{border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:4px}
#capi .ct.fr{border-top:5px solid var(--ink)} #capi .ct.cap{border-top:5px solid var(--gain)} #capi .ct.pays{border-top:5px solid var(--muted)}
#capi .ct .n{font-family:var(--f-display);font-weight:700;font-size:15px}
#capi .ct .big{font:600 22px var(--f-num);font-variant-numeric:tabular-nums}
#capi .ct .per{font-size:13px;color:var(--muted)}
#capi .ct .per b{color:var(--ink);font-family:var(--f-num)}
#capi .warn{font-size:13px;color:var(--muted);border-left:3px solid var(--warn);padding:2px 0 2px 10px;margin:12px 0 0}
@media (max-width:560px){#capi .ctiles{grid-template-columns:1fr}}`; document.head.appendChild(s); })();

function renderCapi(p,res){
  const el=document.getElementById("capi"); if(!el) return;
  const cur=res.actuel, C=simulerCapi(p,cur); window.lastCapi=C;
  const tFR=`<div class="ct fr"><span class="n">Aujourd'hui, en France</span><span class="big">${fmtAge(cur.a)}</span><span class="per"><b>${eur0(cur.mois)}</b> par mois, à vie</span><span class="per">Répartition : tes cotisations paient les retraites d'aujourd'hui.</span></div>`;
  const tCap=C.scen.map(s=>`<div class="ct cap"><span class="n">Tout placé · ${s.nom} (${(s.r*100).toLocaleString("fr-FR")} % par an)</span><span class="big">${fmtAge(cur.a)}</span><span class="per"><b>${eur0(s.mois)}</b> par mois, à vie</span><span class="per">Capital de ${eur0(s.K)} à ton départ, ${s.aide}.</span></div>`).join("");
  const tPays=C.pays.map(m=>`<div class="ct pays"><span class="n">Modèle ${m.nom==="États-Unis"?"américain":m.nom==="Royaume-Uni"?"britannique":"allemand"}</span><span class="big">${fmtAge(m.a)}</span><span class="per"><b>${eur0(m.mois)}</b> par mois · cotisation ${m.cotis}</span><span class="per">${m.detail}</span></div>`).join("");
  el.innerHTML=`<span class="eyebrow">Et ailleurs ?</span><h3>Et si tes cotisations avaient été placées ?</h3>
    <p class="qhelp">Toi et ton employeur versez environ <b>${eur0(C.cotisAn/12)} par mois</b> pour ta retraite. Placés pendant tes ${Math.round(C.n)} années de travail jusqu'à ${fmtAge(cur.a)}, puis transformés en rente à vie, voilà ce que ça donnerait, comparé aux modèles de trois pays transposés à ton salaire.</p>
    <div class="ctiles">${tFR}${tCap}</div>
    <h3 style="font-size:16px">Avec les règles d'un autre pays</h3>
    <div class="ctiles">${tPays}</div>
    <p class="warn">À lire avant de conclure : ces chiffres supposent des marchés réguliers pendant 40 ans. Un krach juste avant le départ (−40 % en 2008) peut couper la rente d'un tiers, la rente ne protège pas toujours de l'inflation, et il n'y a pas de pension de réversion. Surtout, la France ne peut pas basculer d'un coup : tes cotisations d'aujourd'hui paient les pensions des retraités actuels, il faudrait payer deux fois pendant une génération.</p>`;
}
function capiA4(){
  const C=window.lastCapi; if(!C) return "";
  return `<div class="prof"><b>Si mes cotisations avaient été placées</b> (départ au même âge, rente à vie) : ${C.scen.map(s=>eur0(s.mois)+" par mois au rendement "+s.nom.toLowerCase()+" de "+(s.r*100).toLocaleString("fr-FR")+" %").join(", ")}. <b>Ailleurs :</b> ${C.pays.map(m=>m.nom+" "+fmtAge(m.a)+", "+eur0(m.mois)+" par mois").join(" ; ")}.</div>`;
}
