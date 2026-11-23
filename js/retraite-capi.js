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
  if(p.sit==="lib") return .20*Math.min(brut,3*PASS);                                                     // CNAVPL + complémentaire, ordre de grandeur
  if(p.sit==="indep") return .25*Math.min(brut,PASS) + .09*Math.max(0,Math.min(brut,4*PASS)-PASS);           // SSI base + complémentaire
  return .28*Math.min(brut,PASS) + .27*Math.max(0,Math.min(brut,8*PASS)-PASS);                             // CNAV + Agirc-Arrco (avec CEG/CET)
}
const brutAn = p => p.sit==="fonct" ? p.net*12/.83 : p.net*12/.78*p.evol;
const annees = (p,a) => Math.max(0, a - p.s - p.gaps);
/* Capital obtenu en plaçant c € par an pendant n années, versements en milieu d'année */
const capital = (c,n,r) => n<=0 ? 0 : c*((Math.pow(1+r,n)-1)/r)*Math.sqrt(1+r);
const rente = (K,a) => K*capiConv(a)*CAPI_PRELEV/12;
/* Autre usage du capital : le garder placé au rendement r et le vider progressivement jusqu'à RE_HORIZON ans */
const retrait = (K,a,r) => { const n=Math.max(1,RE_HORIZON-a); return K*r/(1-Math.pow(1+r,-n))*CAPI_PRELEV/12; };

/* ETF monde (MSCI World) : rendement réel en euros, année par année, de 1976 à 2025, après inflation française et 0,5 % par an
   de frais d'ETF et de retenues sur dividendes. Calculé à partir du MSCI World dividendes réinvestis en dollars (MSCI),
   du cours du dollar en francs puis en euros en fin d'année (Banque de France, BCE) et de l'inflation annuelle (INSEE).
   Moyenne 1976-2025 : 7,1 % par an ; 2000-2025 : 4,0 %. Après 2025 : ETF_FUTUR par an (moyenne des 25 dernières années). */
const ETF_DEBUT = 1976;
const ETF_REEL = [15.4,-9.5,-4.3,-2.7,25.9,8.0,16.0,39.1,12.6,5.1,18.3,-6.9,36.5,7.6,-29.0,15.9,-1.5,28.6,-6.4,8.7,19.0,31.4,15.2,44.1,-8.7,-13.0,-34.1,8.3,4.2,24.4,5.8,-3.9,-39.1,25.7,18.8,-4.4,11.5,20.3,18.7,10.7,11.0,6.6,-6.0,28.9,5.6,30.0,-17.5,14.0,23.8,6.4];
const ETF_FUTUR = .04;
const etfR = t => { const i=t-ETF_DEBUT; return i>=0&&i<ETF_REEL.length ? ETF_REEL[i]/100 : ETF_FUTUR; };
/* Capital d'un ETF monde : c € par an (en euros d'aujourd'hui) versés de l'année t0 à l'année t1 exclue */
function capitalETF(c,t0,t1){ let K=0; for(let t=t0;t<t1;t++){ const r=etfR(t); K=K*(1+r)+c*Math.sqrt(1+r); } return K; }
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
  const scen=CAPI_TAUX.map(t=>{const K=capital(c,n,t.r); return Object.assign({K, mois:rente(K,a), retrait:retrait(K,a,t.r), verse:c*n}, t);});
  /* ETF monde : les années de travail sont placées à la suite, en commençant après les années sans trimestres */
  const t1=Math.round(p.y+a), t0=t1-Math.round(n), Ke=capitalETF(c,t0,t1), hist=Math.max(0,Math.min(t1,ETF_DEBUT+ETF_REEL.length)-Math.max(t0,ETF_DEBUT));
  scen.push({k:"etf", nom:"ETF monde", r:null, K:Ke, mois:rente(Ke,a), retrait:retrait(Ke,a,ETF_FUTUR), verse:c*Math.round(n),
    aide:hist>0?"100 % actions des pays développés (MSCI World). Rendements réels de "+Math.max(t0,ETF_DEBUT)+" à "+Math.min(t1-1,2025)+(t1>2026?", puis 4 % par an estimés":"")+(t0<ETF_DEBUT?" ; avant 1976, 4 % par an":""):"100 % actions des pays développés (MSCI World), 4 % par an estimés, la moyenne des 25 dernières années"});
  /* Âge le plus jeune où le capital placé donne au moins la pension actuelle, en rente à vie (par année entière).
     On cherche dès la première année de travail, sans âge minimum. */
  const t0e=Math.round(p.y+a)-Math.round(n);
  for(const s of scen){ s.ageEq=null;
    for(let A=Math.ceil(p.s+p.gaps+1); A<=Math.ceil(a+6); A++){
      const nA=annees(p,A), K=s.k==="etf"?capitalETF(c,t0e,t0e+Math.round(nA)):capital(c,nA,s.r);
      if(rente(K,A)>=actuel.mois){ s.ageEq=A; break; } } }
  return {a, n, cotisAn:c, scen, pays:[modeleDE(p), modeleUK(p), modeleUS(p)]};
}

/* ---------- Affichage ---------- */
(function(){ const s=document.createElement("style"); s.textContent=`
#capi h3{margin-bottom:4px}
#capi .ctiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}
#capi .ctiles.c4{grid-template-columns:repeat(4,1fr)}
@media (max-width:900px){#capi .ctiles.c4{grid-template-columns:repeat(2,1fr)}}
#capi .ct{border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:4px}
#capi .ct.fr{border-top:5px solid var(--ink)} #capi .ct.cap{border-top:5px solid var(--gain)} #capi .ct.pays{border-top:5px solid var(--muted)}
#capi .ct .n{font-family:var(--f-display);font-weight:700;font-size:15px}
#capi .ct .big{font:600 22px var(--f-num);font-variant-numeric:tabular-nums}
#capi .ct .per{font-size:13px;color:var(--muted)}
#capi .ct .per b{color:var(--ink);font-family:var(--f-num)}
#capi .ct .per.eq{color:var(--ink);font-size:14px;background:color-mix(in srgb,var(--gain) 12%,transparent);border-radius:6px;padding:4px 8px}
#capi .warn{font-size:13px;color:var(--muted);border-left:3px solid var(--warn);padding:2px 0 2px 10px;margin:12px 0 0}
@media (max-width:560px){#capi .ctiles{grid-template-columns:1fr}}`; document.head.appendChild(s); })();

function renderCapi(p,res){
  const el=document.getElementById("capi"); if(!el) return;
  const cur=res.actuel, C=simulerCapi(p,cur); window.lastCapi=C;
  const tFR=`<div class="ct fr"><span class="n">Aujourd'hui, en France</span><span class="big">${eur0(cur.mois)} / mois</span><span class="per">à vie, départ à ${fmtAge(cur.a)}</span><span class="per">Pas de capital : en répartition, tes cotisations paient les retraites d'aujourd'hui.</span></div>`;
  const tCap=C.scen.map(s=>`<div class="ct cap"><span class="n">Tout placé · ${s.r==null?s.nom:s.nom+" ("+(s.r*100).toLocaleString("fr-FR")+" % par an)"}</span><span class="big">${eur0(s.K)}</span><span class="per">de capital à ton départ à ${fmtAge(cur.a)}, pour ${eur0(s.verse)} versés</span><span class="per eq">${s.ageEq==null?"Même pension qu'aujourd'hui : pas avant "+Math.ceil(cur.a+6)+" ans":s.ageEq<cur.a?"Même pension qu'aujourd'hui ("+eur0(cur.mois)+") dès <b>"+s.ageEq+" ans"+"</b>, soit "+fmtMois(s.ageEq-cur.a).replace(" plus tôt","")+" plus tôt":"Même pension qu'aujourd'hui à <b>"+s.ageEq+" ans</b>"}</span><span class="per"><b>${eur0(s.mois)}</b> par mois à vie en partant à ${fmtAge(cur.a)}</span><span class="per">ou <b>${eur0(s.retrait)}</b> par mois en puisant dans le capital jusqu'à ${RE_HORIZON} ans (plus rien ensuite)</span><span class="per">${s.aide.charAt(0).toUpperCase()+s.aide.slice(1)}.</span></div>`).join("");
  const tPays=C.pays.map(m=>`<div class="ct pays"><span class="n">Modèle ${m.nom==="États-Unis"?"américain":m.nom==="Royaume-Uni"?"britannique":"allemand"}</span><span class="big">${fmtAge(m.a)}</span><span class="per"><b>${eur0(m.mois)}</b> par mois · cotisation ${m.cotis}</span><span class="per">${m.detail}</span></div>`).join("");
  el.innerHTML=`<span class="eyebrow">Et ailleurs ?</span><h3>Et si tes cotisations avaient été placées ?</h3>
    <p class="qhelp">Toi et ton employeur versez environ <b>${eur0(C.cotisAn/12)} par mois</b> pour ta retraite. Placés pendant tes ${Math.round(C.n)} années de travail jusqu'à ${fmtAge(cur.a)}, voilà le capital que tu aurais au départ, et ce qu'il verserait chaque mois, comparé aux modèles de trois pays transposés à ton salaire.</p>
    <div class="ctiles c4">${tFR}${tCap}</div>
    <h3 style="font-size:16px">Avec les règles d'un autre pays</h3>
    <div class="ctiles">${tPays}</div>
    <p class="warn">À lire avant de conclure : ces chiffres supposent des marchés réguliers pendant 40 ans. Un krach juste avant le départ (−40 % en 2008) peut couper la rente d'un tiers, la rente ne protège pas toujours de l'inflation, et il n'y a pas de pension de réversion. Surtout, la France ne peut pas basculer d'un coup : tes cotisations d'aujourd'hui paient les pensions des retraités actuels, il faudrait payer deux fois pendant une génération.</p>`;
}
function capiA4(){
  const C=window.lastCapi; if(!C) return "";
  return `<div class="prof"><b>Si mes cotisations avaient été placées</b> (départ au même âge, rente à vie) : ${C.scen.map(s=>(s.r==null?"en ETF monde":"à "+(s.r*100).toLocaleString("fr-FR")+" % par an")+", capital de "+eur0(s.K)+", soit "+eur0(s.mois)+" par mois à vie"+(s.ageEq!=null&&s.ageEq<C.a?" (même pension qu'aujourd'hui dès "+s.ageEq+" ans"+")":"")).join(" ; ")}. <b>Ailleurs :</b> ${C.pays.map(m=>m.nom+" "+fmtAge(m.a)+", "+eur0(m.mois)+" par mois").join(" ; ")}.</div>`;
}
