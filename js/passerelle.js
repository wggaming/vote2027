"use strict";
/* Passerelle entre les deux tests du site : « Ce que coûte mon vote » (simulateur.html, réponses vo-answers)
   et « Ma retraite selon les candidats » (retraite.html, réponses re-answers).
   Les réponses communes (statut, salaire, âge, âge du premier emploi) passent d'un test à l'autre,
   seulement si la personne n'y a pas déjà répondu dans le test d'arrivée et ne l'a pas encore terminé.
   Le paiement est déjà commun (clé vo-unlock). */
const PASSERELLE = {
  lire(k){ try{ return JSON.parse(localStorage.getItem(k)||"null"); }catch(e){ return null; } },
  tranche(y){ const a=new Date().getFullYear()-y; return a<30?"u30":a<50?"a30":a<62?"a50":"a62"; },
  /* Réponses du test retraite -> simulateur de vote */
  versVote(re){ const o={}; if(!re) return o;
    if(["prive","fonct","indep"].includes(re.sit)) o.sit=re.sit; else if(re.sit==="lib") o.sit="indep";
    if(+re.y) o.age=this.tranche(+re.y);
    if(+re.net>0){ o.rev=+re.net; o.revM="net"; }
    if(+re.s) o.start=+re.s;
    return o; },
  /* Réponses du simulateur de vote -> test retraite (pas pour un retraité, un étudiant ou un chômeur) */
  versRetraite(vo){ const o={}; if(!vo) return o;
    const actif=!vo.sit||["prive","fonct","indep"].includes(vo.sit);
    if(vo.sit&&actif) o.sit=vo.sit;
    if(actif&&["rev","revA","revB","revR"].some(k=>+vo[k]>0)&&typeof netOf==="function"){ const n=netOf(vo,"rev"); if(n>0) o.net=Math.round(n/50)*50; }
    if(+vo.start) o.s=+vo.start;
    return o; },
  /* Copie dans A ce qui n'est pas déjà dans les réponses enregistrées du test d'arrivée. Renvoie la liste des réponses reprises. */
  remplir(A, deja, src){ deja=deja||{}; const n=[];
    const revenu=["rev","revA","revB","revR","net"].some(k=>k in deja);
    for(const k in src){ if(k in deja) continue; if((k==="rev"||k==="revM"||k==="net")&&revenu) continue; A[k]=src[k]; if(k!=="revM") n.push(k); }
    return n; }
};
