"use strict";
/* Test « Ma retraite selon les candidats » : règles de départ et calcul de la pension.
   Tout est en euros de 2026, à salaire constant. Les règles actuelles tiennent compte de la suspension
   de la réforme de 2023 (LFSS 2026, en vigueur depuis le 1er septembre 2026).
   Pour modifier un programme : changer son bloc dans RE_PARTIS. Les noms, codes et couleurs
   sont ceux de js/programmes.js (PARTIES). */

const PASS = 48060;               // plafond annuel de la Sécurité sociale 2026
const AA_ACHAT = 20.1877;         // prix d'achat du point Agirc-Arrco
const AA_VALEUR = 1.4386;         // valeur de service du point Agirc-Arrco
const RE_HORIZON = 85;            // âge jusqu'auquel on additionne les pensions (espérance de vie moyenne à 60 ans, arrondie)
const RE_EFFET = 2028;            // année d'entrée en vigueur supposée des réformes proposées

/* ---------- Règles actuelles, par génération ---------- */
function ageLegalActuel(y){ return y<=1960?62:y===1961?62.25:y===1962?62.5:y<=1964?62.75:y===1965?63:y===1966?63.25:y===1967?63.5:y===1968?63.75:64; }
function dureeActuelle(y){ return y<=1960?167:y<=1962?169:y<=1964?170:y===1965?171:172; }
/* Carrière longue : âge de départ anticipé selon l'âge de début (au moins 5 trimestres avant la fin de l'année des 16, 18, 20 ou 21 ans) */
function clActuel(s,y){
  if(s<16) return 58; if(s<18) return 60;
  if(s<20) return y<=1963?60:y===1964?60.5:y<=1966?60.75:y===1967?61:y===1968?61.25:y===1969?61.5:y===1970?61.75:62;
  if(s<21) return 63; return null;
}
const REGLE_ACTUELLE = y => ({legal:ageLegalActuel(y), D:dureeActuelle(y), auto:67, cl:s=>clActuel(s,y), dec:.0125, decMax:.25});

/* Montée progressive d'un âge ou d'une durée : +pas par génération à partir de la génération g0, jusqu'à la cible */
const monte=(base,cible,pas,y,g0)=>y<g0?base:Math.min(cible,base+pas*(y-g0+1));

/* ---------- Les programmes ----------
   regle(y) renvoie : legal (âge minimal), D (trimestres pour le taux plein), auto (taux plein sans condition),
   cl(s) (âge carrière longue ou null), dec (décote par trimestre manquant), decMax, tpAge (taux plein jamais avant cet âge).
   t : tenabilité de la règle d'âge (1 tenable, .5 incertaine, 0 non tenable). Une règle non tenable est affichée barrée
   et remplacée par la version « retenue » (regleRetenue), comme pour les promesses du simulateur de vote. */
const RE_PARTIS = [
 {k:"rn", t:.5, src:"Plan présenté par Marine Le Pen et Jordan Bardella le 17 novembre 2026",
  resume:"Abrogation de la réforme de 2023 au 1er janvier 2028. Départ entre 60 et 62 ans selon l'âge de début de carrière (paliers de 6 mois), avec 40 à 42 annuités. Décote portée à 5 % par trimestre manquant.",
  tnote:"Coût annoncé de 18,6 Md€ en 2032, financé en partie par les excédents de l'assurance chômage, contestés. Comptée comme incertaine.",
  regle:y=>{const c=REGLE_ACTUELLE(y); return {legal:62, legalS:s=>s<20?60:s<21?60.5:s<22?61:s<23?61.5:62, DS:s=>s<20?160:s<21?162:s<22?164:s<23?166:168, D:168, auto:67, cl:c.cl, clD:c.D, dec:.05, decMax:.5};},
  mesures:[["Décote portée à 5 % par trimestre manquant (plafond 50 %)","Ne joue que si tu pars avant d'avoir tous tes trimestres."],["Pilier de capitalisation obligatoire pour les actifs de moins de 52 ans","Mécanisme non détaillé, non compté."]]},
 {k:"lfi", t:0, src:"L'Avenir en commun, édition 2027",
  resume:"Abrogation de la réforme de 2023 et retour à 60 ans à taux plein avec 40 annuités.",
  tnote:"Coût de plusieurs dizaines de milliards par an sans financement détaillé. Non retenue : on compte le retour à 62 ans annoncé « dans un premier temps ».",
  regle:y=>({legal:60, D:160, auto:67, cl:()=>null, dec:.0125, decMax:.25}),
  regleRetenue:y=>{const c=REGLE_ACTUELLE(y); return {legal:62, D:172, auto:67, cl:c.cl, clD:172, dec:.0125, decMax:.25};},
  mesures:[["Pension d'une carrière complète au niveau du SMIC","Coût très élevé, non retenue."]]},
 {k:"ps", t:.5, src:"Programme du PS (Olivier Faure)",
  resume:"Abrogation de la réforme de 2023 et retour à 62 ans, avec 43 annuités. Pénibilité élargie.",
  tnote:"Coût de l'ordre de 10 Md€ par an à terme (Cour des comptes, 2025), financement à préciser. Comptée comme incertaine.",
  regle:y=>{const c=REGLE_ACTUELLE(y); return {legal:62, D:172, auto:67, cl:c.cl, clD:172, dec:.0125, decMax:.25};},
  mesures:[]},
 {k:"ctr", t:1, src:"Programme de Gabriel Attal",
  resume:"Pas de changement d'âge annoncé : la durée de cotisation devient la règle, avec décote et surcote, vers un système universel avec une part de capitalisation.",
  tnote:"Modalités du système universel non publiées : on garde les règles actuelles.",
  regle:REGLE_ACTUELLE,
  mesures:[["Plan d'épargne retraite de 1 000 € à la naissance de chaque enfant","Ne change pas ta pension, non compté."]]},
 {k:"lr", t:1, src:"Programme de Bruno Retailleau",
  resume:"Départ possible dès 63 ans avec une décote de 7 % par an, taux plein à 65 ans au lieu de 67. Part de capitalisation pour les nouveaux entrants.",
  tnote:"Mesure d'économie, finançable.",
  regle:y=>{const c=REGLE_ACTUELLE(y); return {legal:63, D:c.D, auto:65, tpAge:65, cl:c.cl, clD:c.D, dec:.0175, decMax:.35};},
  mesures:[["Capitalisation pour 25 à 30 % des retraites des nouveaux entrants","Ne concerne que les jeunes qui débutent, non compté."]]},
 {k:"eco", t:.5, src:"Programme des Écologistes (Marine Tondelier)",
  resume:"Abrogation de la réforme de 2023, retour immédiat à 62 ans, objectif de 60 ans pour les carrières longues et pénibles.",
  tnote:"Même coût que le retour à 62 ans du PS, plus l'élargissement des carrières longues. Comptée comme incertaine.",
  regle:y=>{const c=REGLE_ACTUELLE(y); return {legal:62, D:172, auto:67, cl:s=>s<20?Math.min(c.cl(s),60):c.cl(s), clD:172, dec:.0125, decMax:.25};},
  mesures:[]},
 {k:"ne", t:1, src:"Programme de David Lisnard",
  resume:"Âge légal de 65 ans comme norme, socle de pension minimale à 65 ans, agence de retraite unique, part de capitalisation.",
  tnote:"Rythme de passage à 65 ans non publié. Hypothèse : +3 mois par génération à partir de la génération 1969. Sa fiche fiscale évoque 64 ans maintenus.",
  regle:y=>{const c=REGLE_ACTUELLE(y); return {legal:monte(c.legal,65,.25,y,1969), D:c.D, auto:67, cl:c.cl, clD:c.D, dec:.0125, decMax:.25};},
  mesures:[["Pensions au-dessus de 2 000 € non revalorisées","Environ 1,5 % de pouvoir d'achat perdu par an sur les pensions concernées.", "nonReval"]]},
 {k:"hor", t:1, src:"Programme d'Édouard Philippe publié le 18 novembre 2026",
  resume:"Âge légal porté à 65 ans et durée à 45 annuités en moins de dix ans. Carrières longues, pénibilité et départs pour raison de santé maintenus. Fonds de capitalisation collectif.",
  tnote:"Mesure d'économie, finançable. Hypothèse de calendrier : +3 mois et +1 trimestre par génération à partir de la génération 1969.",
  regle:y=>{const c=REGLE_ACTUELLE(y); return {legal:monte(c.legal,65,.25,y,1969), D:monte(c.D,180,1,y,1969), auto:67, cl:c.cl, clD:monte(c.D,180,1,y,1969), dec:.0125, decMax:.25};},
  mesures:[["Plan d'épargne retraite avec 500 € de l'État au premier emploi","Ne change pas ta pension, non compté."]]}
];

/* ---------- Calcul pour une personne ----------
   p : {y: année de naissance, s: âge de début, sit: prive|fonct|indep, net: salaire net mensuel, gaps: années sans trimestre,
        kids: nombre d'enfants, kidsTrim: trimestres pour enfants, evol: coefficient salaire moyen / salaire actuel,
        primes: part des primes (fonctionnaires), tot: true pour partir le plus tôt possible même avec décote} */
function trim(p,a){ return Math.max(0,Math.round((a-p.s)*4)-p.gaps*4); }
function departs(R,p){
  const legal=R.legalS?R.legalS(p.s):R.legal, D=R.DS?R.DS(p.s):R.D;
  const cl=R.cl?R.cl(p.s):null, clD=R.clD||D;
  let tp=null, first=null;
  for(let a=55;a<=70;a+=.25){
    const T=trim(p,a)+p.kidsTrim, Tc=trim(p,a);
    const clOk=cl!=null&&a>=cl&&Tc>=clD;
    const can=a>=legal||clOk;
    if(can&&first==null) first=a;
    if(can&&(clOk||a>=R.auto||(T>=D&&a>=(R.tpAge||0)))){tp=a;break;}
  }
  return {legal,D,cl,tp,first:first==null?tp:first};
}
function pension(R,p,a,info){
  const T=trim(p,a)+p.kidsTrim, D=info.D, clOk=info.cl!=null&&a>=info.cl&&trim(p,a)>=(R.clD||D);
  const tpOk=clOk||a>=R.auto||(T>=D&&a>=(R.tpAge||0));
  let manque=0;
  if(!tpOk){
    const parAge=Math.ceil((R.auto-a)*4-1e-9);
    manque=T>=D&&R.tpAge?Math.ceil((R.tpAge-a)*4-1e-9):Math.min(D-T,parAge);
  }
  const dec=Math.min(R.decMax,manque*R.dec), prorata=Math.min(1,T/D), maj=p.kids>=3?1.10:1;
  if(p.sit==="fonct"){
    const brutAn=p.net*12/.83, ti=brutAn*(1-p.primes);
    const base=.75*ti*prorata*(1-dec);
    /* retraite additionnelle sur les primes (RAFP), ordre de grandeur : 0,45 % des primes par année cotisée */
    const rafp=.0045*brutAn*Math.min(p.primes,.2)*(trim(p,a)/4);
    return {mois:(base*maj*(1-.091)+rafp*(1-.101))/12,dec,manque,T,D};
  }
  const sal=p.net*12/.78*p.evol;
  const base=Math.min(sal,PASS)*.5*prorata*(1-dec);
  const pts=(Math.min(sal,PASS)*.062+Math.max(0,Math.min(sal,8*PASS)-PASS)*.17)/AA_ACHAT*(trim(p,a)/4);
  const compl=pts*AA_VALEUR*(1-Math.min(.30,dec*1.0));
  return {mois:(base*maj*(1-.091)+compl*maj*(1-.101))/12,dec,manque,T,D};
}
/* Résultat d'une règle pour la personne : âge de départ retenu, pension, total jusqu'à RE_HORIZON ans */
function resultat(R,p){
  const info=departs(R,p);
  let a=p.tot?info.first:info.tp;
  return Object.assign({a},info,pension(R,p,a,info));
}
function simulerRetraite(p){
  const cur=resultat(REGLE_ACTUELLE(p.y),p);
  cur.total=cur.mois*12*Math.max(0,RE_HORIZON-cur.a);
  const out={actuel:cur};
  for(const P of RE_PARTIS){
    const annonce=resultat(P.regle(p.y),p);
    let r=P.t===0&&P.regleRetenue?resultat(P.regleRetenue(p.y),p):annonce;
    /* Une réforme ne s'applique qu'aux départs à partir de RE_EFFET : on ne part pas avant, et jamais plus tard qu'aujourd'hui pour cette raison */
    if(p.y+r.a<RE_EFFET&&r.a<cur.a){ const a2=Math.min(cur.a,Math.ceil((RE_EFFET-p.y)*4)/4); const R=P.t===0&&P.regleRetenue?P.regleRetenue(p.y):P.regle(p.y); r=Object.assign({},r,{a:a2},pension(R,p,a2,departs(R,p))); r.effet=true; }
    if(p.y+cur.a<RE_EFFET&&r.a>cur.a){ r=Object.assign({},cur); r.effet=true; }
    r.total=r.mois*12*Math.max(0,RE_HORIZON-r.a);
    const notes=[];
    for(const [m,n,f] of P.mesures){
      if(f==="nonReval"){ const dep=p.y+r.a, k=Math.max(0,Math.min(5,2033-Math.max(dep,2028)));
        if(r.mois>2000&&k>0){ const ans=Math.max(0,RE_HORIZON-r.a), perte=r.mois*12*.015*k, cumul=perte*Math.max(0,ans-k/2);
          r.total-=cumul; notes.push({m,n:n+" Hypothèse : gel pendant le quinquennat (2028 à 2032), soit "+k+" revalorisation"+(k>1?"s":"")+" perdue"+(k>1?"s":"")+" pour toi : environ "+fmtPlain(perte/12)+" de moins par mois, "+fmtPlain(cumul)+" jusqu'à "+RE_HORIZON+" ans (compté).",v:-cumul,k:1}); }
        else notes.push({m,n:n+" Ne te concerne pas : "+(r.mois<=2000?"ta pension estimée est sous 2 000 €.":"tu pars après le quinquennat (hypothèse d'un gel de 2028 à 2032)."),k:null}); }
      else notes.push({m,n,k:null});
    }
    r.notes=notes; r.annonce=annonce;
    out[P.k]=r;
  }
  return out;
}
/* 63,25 → « 63 ans et 3 mois » */
function fmtAge(a){ const y=Math.floor(a+1e-9), m=Math.round((a-y)*12); return y+" ans"+(m?" et "+m+" mois":""); }
function fmtMois(d){ const m=Math.round(d*12); if(m===0) return "même âge"; const n=Math.abs(m), t=n>=12?(Math.floor(n/12)+" an"+(n>=24?"s":"")+(n%12?" et "+(n%12)+" mois":"")):n+" mois"; return t+(m<0?" plus tôt":" plus tard"); }
