"use strict";
/* Règles fiscales et sociales en vigueur (fin 2026), qui servent de point de comparaison.
   À mettre à jour chaque année : SMIC, barème de l'impôt, droits de succession, IFI, taux de prélèvement à la source. */
const SMIC = 1478; // SMIC net mensuel temps plein, 2026
const fmt = n => (n>0?"+":n<0?"−":"") + Math.abs(Math.round(n/10)*10).toLocaleString("fr-FR") + " €";
const fmtPlain = n => Math.round(n).toLocaleString("fr-FR") + " €";
const cls = n => n>5?"pos":n<-5?"neg":"zero";

const BAREME=[[11600,0],[29579,.11],[84577,.30],[181917,.41],[Infinity,.45]];
function taxPerPart(q){let t=0,prev=0;for(const [lim,r] of BAREME){if(q>prev)t+=(Math.min(q,lim)-prev)*r;prev=lim;}return t;}
function tmi(R,parts){const q=R/parts;let prev=0;for(const [lim,r] of BAREME){if(q<=lim)return r;prev=lim;}return .45;}
function IR(R,parts,couple,noCap){
  const base=couple?2:1; const tBase=taxPerPart(R/base)*base; let t=taxPerPart(R/parts)*parts;
  const maxAdv=1807*Math.round((parts-base)*2); if(!noCap&&tBase-t>maxAdv) t=tBase-maxAdv;
  const seuil=couple?3277:1982, dec=couple?1483:897; if(t<seuil) t=Math.max(0,t-(dec-.4525*t));
  return Math.max(0,t);
}
function kidParts(n,full2){ if(n<=0)return 0; if(n===1)return .5; if(n===2)return full2?1.5:1; return (full2?1.5:1)+(n-2); }
const SUCC=[[8072,.05],[12109,.10],[15932,.15],[552324,.20],[902838,.30],[1805677,.40],[Infinity,.45]];
function droits(H,abatt){const b=Math.max(0,H-abatt);let t=0,prev=0;for(const [lim,r] of SUCC){if(b>prev)t+=(Math.min(b,lim)-prev)*r;prev=lim;}return t;}
const ISFB=[[800000,0],[1300000,.005],[2570000,.007],[5000000,.01],[10000000,.0125],[Infinity,.015]];
function isf(P){if(P<1300000)return 0;let t=0,prev=0;for(const [lim,r] of ISFB){if(P>prev)t+=(Math.min(P,lim)-prev)*r;prev=lim;}return t;}
const RATIO={prive:.78,fonct:.82,indep:.75,chom:.93,retr:.91,etud:.78,sal:.78,autre:.78};
const PAS=[[1620,0],[1683,.005],[1791,.013],[1911,.021],[2042,.029],[2151,.035],[2294,.041],[2714,.053],[3107,.075],[3539,.099],[3983,.119],[4648,.138],[5574,.158],[6974,.179],[8711,.20],[12091,.24],[16376,.28],[25706,.33],[55062,.38],[Infinity,.43]];
function pasRate(y){for(const [l,r] of PAS) if(y<l) return r; return .43;}
function beforeTax(x){ if(x<=0) return 0; let lo=0; for(const [l,r] of PAS){const c=x/(1-r); if(c<lo) return Math.round(lo); if(c<l) return Math.round(c); lo=l;} return Math.round(x/(1-.43)); }
function loanCalc(a){ const P=+a.loanP||0, R=(+a.loanR||0)/1200, n=Math.round((+a.loanD||20)*12), year=new Date().getFullYear(), k0=Math.max(0,(year-(+a.loanY||year))*12);
  if(P<=0||n<=0) return {int:0,pay:0,left:0,year,done:P<=0?false:true};
  const pay=R>0?P*R/(1-Math.pow(1+R,-n)):P/n, bal=k=>R>0?P*Math.pow(1+R,k)-pay*(Math.pow(1+R,k)-1)/R:P-pay*k;
  if(k0>=n) return {int:0,pay:Math.round(pay),left:0,year,done:true};
  let it=0; for(let k=k0;k<Math.min(k0+12,n);k++) it+=bal(k)*R;
  return {int:Math.round(it),pay:Math.round(pay),left:Math.round(bal(k0)),year,done:false}; }
function pubKids(a,nk){ const e=a.ecole; return e==="priv"||e==="none"?0:e==="mix"?Math.max(1,Math.floor(nk/2)):nk; }
function netOf(a,id){ let md=a[id+"M"]||"net"; if(md==="res"){ if(id==="rev"&&a.sit==="indep") return Math.round((+a.revR||0)/12); md="net"; } if(md==="apres") return beforeTax(+a[id+"A"]||0); if(md!=="brut") return +a[id]||0; const sit=id==="rev"?a.sit:(a.sitc||"sal"); return Math.round((+a[id+"B"]||0)*(RATIO[sit]||.78)/12); }
function wealth(a){ let rp,im,fi,de,pro=0; if(unlocked&&a.patFine&&+a.pat>=1300000){rp=+a.rp||0;im=+a.im||0;fi=+a.fi||0;de=+a.de||0;pro=Math.min(fi,+a.pro||0);} else {const P=+a.pat;rp=P*.25;im=P*.25;fi=P*.5;de=0;}
  const net=rp+im+fi-de; return {rp,im,fi,de,pro,net,ifiBase:Math.max(0,rp*.7+im-de),isfBase:Math.max(0,rp*.7+im+fi-pro-de),iffBase:Math.max(0,fi-pro),fine:unlocked&&!!a.patFine}; }
function ndvOf(a){const me=netOf(a,"rev"),cj=a.couple==="oui"?netOf(a,"revc"):0;return (me+cj)/(1+(a.couple==="oui"?.5:0)+.3*(+a.enf));}
const F=(a,k)=>unlocked&&a[k]!=null&&a[k]!==""?+a[k]:null;
function primeAct(me,cj,couple,nk,log){ // estimation mensuelle de la prime d'activité actuelle
  const S=SMIC; let base=633*(1+(couple?.5:0)+(nk>=1?.3:0)+(nk>=2?.3:0)+Math.max(0,nk-2)*.4);
  const bon=x=>x<.5*S?0:184*Math.min(1,(x-.5*S)/(.5*S));
  const pers=(couple?2:1)+nk, fl=(log==="apl"||log==="prop")?(pers===1?76:pers===2?152:188):0;
  const v=base+.61*(me+cj)+bon(me)+bon(cj)-(me+cj)-fl; return v>=15?v:0; }
function allocFam(nk,R){ if(nk<2) return 0; let a=151+(nk>2?194*(nk-2):0); const lim1=76000+5500*(nk-2), lim2=101000+5500*(nk-2); if(R>lim2)a/=4; else if(R>lim1)a/=2; return a; }
/* âge du taux plein aujourd'hui selon l'âge de début de carrière */
/* Âge de départ à taux plein aujourd'hui, réforme de 2023 suspendue (LFSS 2026), selon l'âge de début s et l'année de naissance y.
   Mêmes règles que le test retraite (js/retraite-regles.js : ageLegalActuel, dureeActuelle, clActuel). */
function departActuel(s,y){ y=y||1986;
  const legal=y<=1960?62:y===1961?62.25:y===1962?62.5:y<=1964?62.75:y===1965?63:y===1966?63.25:y===1967?63.5:y===1968?63.75:64;
  const D=y<=1960?167:y<=1962?169:y<=1964?170:y===1965?171:172;
  const cl=s<16?58:s<18?60:s<20?(y<=1963?60:y===1964?60.5:y<=1966?60.75:y===1967?61:y===1968?61.25:y===1969?61.5:y===1970?61.75:62):s<21?63:null;
  const tp=Math.min(67,Math.max(legal,s+D/4)); return cl!=null?Math.min(cl,tp):tp; }
/* Année de naissance supposée d'après la tranche d'âge (milieu de tranche) */
function anneeNaissance(a){ return {u30:2001,a30:1986,a50:1970,a62:1960}[a.age]||1986; }
function smicGain(s,target){ // gain mensuel
  if(s<=0)return 0; if(s<SMIC) return s*(target/SMIC-1);
  if(s<target) return target-s;
  const band=.3*target; if(s<target+band) return (target-SMIC)*.3*(1-(s-target)/band);
  return 0;
}
function csgPS(s){ // gain mensuel CSG progressive (chiffrage PS)
  if(s<=0)return 0; if(s<=SMIC) return 130*s/SMIC;
  if(s<=2000) return 130-(13*(s-SMIC)/(2000-SMIC));
  if(s<=2700) return 117*(1-(s-2000)/700);
  return 0;
}
function attal(s){ if(s<=0)return 0; if(s<=2200) return 250*s/2200; if(s<4400) return 250*(1-(s-2200)/2200); return 0; }
