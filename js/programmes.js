"use strict";
/* Les programmes comparés : un bloc par parti, dans l'ordre d'affichage.
   Pour modifier une mesure, changer le bloc du parti. Pour ajouter un parti : copier un bloc,
   lui donner un code (k), ajouter sa couleur --code dans site.css, et le présenter sur index.html.

   Chaque mesure s'écrit L(libellé, montant par an, tenabilité, note) :
   - montant : en euros par an, positif si tu y gagnes, négatif si ça te coûte
   - tenabilité : 1 tenable (compté en entier), .5 à moitié, .25 simple objectif (« jusqu'à… »), 0 non tenable (affiché barré, non compté)
   - note : la justification affichée sous la ligne. Une note qui contient « Hypothèse », « estimé »,
     « déduite » ou « moyenne » est comptée comme une hypothèse (encart d'affinage).
   fin : comment le parti dit se financer (md = milliards d'économies ou de recettes, null si non chiffré ; sens "rec" = recettes).
     Affiché à côté du total, jamais compté : on ne sait pas quels ménages paieront.
   depart(s,cur) : âge de départ à taux plein selon l'âge de début de carrière s (cur = règle actuelle).
   divBareme : le parti impose les dividendes au barème (arbitrage salaire ou dividendes des dirigeants).

   Les variables partagées (revenus, impôt actuel, patrimoine…) sont calculées une fois dans contexte(). */
/* Date de la dernière vérification des programmes, affichée sur chaque fiche : à changer à chaque mise à jour d'un programme. */
const MAJ_PROGRAMMES="23 novembre 2026";
const L=(m,v,k,n)=>({m,v,k,n});
/* 60,5 → « 60 ans et 6 mois » */
const ans=a=>{const y=Math.floor(a),m=Math.round((a-y)*12);return y+" ans"+(m?" et "+m+" mois":"");};

/* Situation du foyer et impôts actuels, calculés une fois pour tous les partis */
function contexte(a){
  const me=netOf(a,"rev"), couple=a.couple==="oui", cj=couple?netOf(a,"revc"):0, cjw=couple&&a.sitc!=="retr"&&a.sitc!=="autre"?cj:0, nk=+a.enf, sit=a.sit;
  const actif=["prive","fonct","indep"].includes(sit), worker=actif;
  const pa=F(a,"pa")||0, veuf=unlocked&&a.veuf==="oui"&&!couple;
  const R=(me+cj+pa)*12*.9, parts=(couple?2:1)+kidParts(nk,false);
  const ir=IR(R,parts,couple), t=tmi(R,parts);
  const persons=(couple?2:1)+nk, uc=1+(couple?.5:0)+.3*nk, ndv=(me+cj)/uc;
  const cap=F(a,"capX")??+a.cap, W=wealth(a), P=W.net, H=F(a,"herX")??+a.her, ifiNow=isf(W.ifiBase);
  const capHyp=F(a,"capX")!=null?"":" Montant estimé à partir de ta tranche.";
  const remu=unlocked&&sit==="indep"?a.remu:null, div=(remu==="div"||remu==="mix")?(F(a,"divX")||0):0, capD=cap+div, divHyp=div>0?" Dont "+fmtPlain(div)+" de dividendes de ta société.":"";
  const capNow=capD>0?Math.min(.30*capD,IR(R+.6*capD,parts,couple)-ir+.172*capD):0, capNew=capD>0?IR(R+capD,parts,couple)-ir+.172*capD:0, capTxt=capD>0?"Environ "+Math.round(capNew/capD*100)+" % d'impôt et de prélèvements sociaux, contre "+Math.round(capNow/capD*100)+" % aujourd'hui (flat tax de 30 %, ou barème avec abattement de 40 % s'il est plus avantageux).":"";
  const wHyp=W.fine?"Selon le détail de ton patrimoine.":"Hypothèse : moitié immobilier (dont la moitié en résidence principale), moitié financier. Affinable avec l'accès illimité.";
  return {a,me,couple,cj,cjw,nk,sit,actif,worker,pa,veuf,R,parts,ir,t,persons,uc,ndv,cap,W,P,H,ifiNow,capHyp,remu,div,capD,divHyp,capNow,capNew,capTxt,wHyp};
}

const PARTIES=[
 /* RN */
 {k:"rn",name:"Rassemblement national",short:"RN",c:"--rn",
  fin:{md:null,txt:"Chiffrage global non publié par le RN à ce jour. Seul son plan retraite est chiffré : 18,6 Md€ par an en 2032 selon le RN, financés en partie par les excédents de l'assurance chômage."},
  /* plan du 17/11/2026 : départ de 60 à 62 ans par paliers de 6 mois selon l'âge de début, 40 à 42 annuités, carrières longues conservées si plus avantageuses */
  depart:(s,cur)=>{const lg=s<20?60:s<21?60.5:s<22?61:s<23?61.5:62, d=s<20?40:s<21?40.5:s<22?41:s<23?41.5:42; return Math.min(cur,Math.min(67,Math.max(lg,s+d)));},
  mesures(x){ const {a,me,couple,cj,nk,sit,actif,veuf,R,parts,ir,persons,W,H,ifiNow,wHyp}=x;
    const rn=[];
    if(a.ener>0) rn.push(L("TVA à 5,5 % sur l'électricité et le gaz",a.ener*12*(1-1.055/1.2),1,"Autorisé par la directive TVA européenne de 2022."));
    if(a.carb>0) rn.push(L("TVA à 5,5 % sur les carburants",a.carb*12*(1-1.055/1.2),0,"Le droit européen interdit un taux réduit sur l'essence et le gazole. Non retenue."));
    {const fd=F(a,"food"); rn.push(L("TVA à 0 % sur les produits de première nécessité",fd!=null?fd*12*.4*(1-1/1.055):persons*45,.5,"Liste non publiée. "+(fd!=null?"Hypothèse : 40 % de tes courses concernées, aujourd'hui à 5,5 %.":"Hypothèse : 45 € par personne et par an.")+" Coûteux pour l'État."));}
    if(a.age==="u30"&&actif&&ir>0) rn.push(L("Pas d'impôt sur le revenu avant 30 ans",ir*(me/((me+cj)||1)),.5,"Risque de censure pour rupture d'égalité devant l'impôt."));
    if(veuf){const g=ir-IR(R,parts+.5,false); if(g>1) rn.push(L("Demi-part fiscale pour les veufs et veuves",g,1,"Simple modification du quotient familial."));}
    if(nk>=2){const g=ir-IR(R,(couple?2:1)+kidParts(nk,true),couple); if(g>1) rn.push(L("Une part fiscale entière dès le 2e enfant",g,1,"Simple modification du quotient familial."));}
    {const iff=isf(W.iffBase); if(iff>0||ifiNow>0) rn.push(L("IFI remplacé par un impôt sur la fortune financière",ifiNow-iff,1,"L'immobilier n'est plus taxé, les placements financiers le sont. Barème non publié : hypothèse du barème de l'IFI au-delà de 1,3 M€ ("+fmtPlain(iff)+" contre "+fmtPlain(ifiNow)+" d'IFI aujourd'hui). "+wHyp));}
    if(sit==="prive"&&me<=3*SMIC) rn.push(L("Hausse de 10 % des salaires exonérée de cotisations",me*.10*12,0,"Facultative pour l'employeur : rien n'est garanti. Non retenue."));
    return {lines:rn,retraite:"Abrogation de la réforme de 2023 : départ entre 60 et 62 ans selon l'âge de début de carrière, avec 40 à 42 annuités (plan du 17 novembre 2026). Financement contesté.",
      herit:H>0?{now:droits(H,100000),then:H<=300000?0:droits(H,100000),hyp:"Hypothèse : exonération jusqu'à 300 000 € par enfant (« classes moyennes »)."}:null};
  }},

 /* LFI */
 {k:"lfi",name:"La France insoumise",short:"LFI",c:"--lfi",
  fin:{md:106.4,sens:"rec",txt:"106,4 Md€ de recettes nouvelles (ISF climatique, fin de la flat tax, taxe sur les très hauts patrimoines, héritages, niches fiscales) pour 81,7 Md€ de dépenses nouvelles, selon le document de travail présenté le 14 octobre 2026. Chiffrage complet annoncé début 2027."},
  depart:(s,cur)=>Math.min(cur,Math.min(67,Math.max(60,s+40))),
  divBareme:true,
  mesures(x){ const {a,me,couple,cj,cjw,nk,sit,R,parts,ir,persons,ndv,cap,W,P,H,ifiNow,capHyp,div,capD,divHyp,capNow,capNew,capTxt,wHyp}=x;
    const lfi=[];
    const sm=(sit==="prive"?smicGain(me,1700):0)+smicGain(cjw,1700);
    if(sm>1) lfi.push(L("SMIC à 1 700 € net",sm*12,.5,"Faisable par décret, mais +15 % d'un coup pèse sur l'emploi dans les petites entreprises."));
    {const fsal=(sit==="fonct"?me:0)+(a.sitc==="fonct"&&couple?cj:0); if(fsal>0) lfi.push(L("Point d'indice +10 %",fsal*.10*.8*12,.5,"Environ 80 % du salaire indexé. Coût de l'ordre de 20 Md€ par an."));}
    let base=ir;
    if(couple){const sp=1+kidParts(nk,false)/2; const sep=IR(me*12*.9,sp,false)+IR(cj*12*.9,sp,false); const d=ir-sep; base=sep;
      if(Math.abs(d)>1) lfi.push(L("Fin du quotient conjugal (imposition individuelle)",d,1,"Chaque conjoint déclare seul. Pénalise les couples aux revenus inégaux."));}
    const qx=R/parts, q4=4000*12*.9, q8=8000*12*.9, gx=taxPerPart(qx);
    const f=gx>0?(-.10*taxPerPart(Math.min(qx,q4))+.15*(taxPerPart(Math.min(qx,q8))-taxPerPart(Math.min(qx,q4)))+.40*(gx-taxPerPart(Math.min(qx,q8))))/gx:0;
    if(base>0) lfi.push(L("Impôt sur le revenu à 14 tranches",-base*f,1,"Barème non publié. Hypothèse, tranche par tranche : −10 % sur l'impôt dû pour la part du revenu sous 4 000 € net par mois et par part, +15 % entre 4 000 et 8 000 €, +40 % au-delà."));
    if(capD>0&&capNow-capNew<-1) lfi.push(L("Fin de la flat tax : placements"+(div>0?" et dividendes":"")+" imposés au barème",capNow-capNew,1,capTxt+(cap>0?capHyp:"")+divHyp));
    {const isfV=isf(W.isfBase); if(isfV>0||ifiNow>0) lfi.push(L("Retour de l'ISF (à la place de l'IFI)",-(isfV-ifiNow),1,"Ancien barème de l'ISF sur tout le patrimoine net (abattement de 30 % sur la résidence principale, dettes déduites) : "+fmtPlain(isfV)+", contre "+fmtPlain(ifiNow)+" d'IFI aujourd'hui. "+wHyp));
      if(P>100000000) lfi.push(L("Taxe Zucman (2 % au-delà de 100 M€)",-Math.max(0,.02*P-isfV),.5,"Risque constitutionnel et d'exil fiscal."));}
    if(ndv>2750){const th=F(a,"thX"); lfi.push(L("Retour d'une taxe d'habitation pour les 20 % les plus aisés",-(th?th:800),1,(th?"Sur la base de ta dernière taxe d'habitation.":"Hypothèse : 800 € par an en moyenne.")+" 80 % des ménages exonérés."));}
    if(a.log==="apl"){const ap=F(a,"aplM"); lfi.push(L("APL +10 %",(ap!=null?ap:250)*.1*12,1,ap!=null?"Sur tes APL actuelles.":"Sur une APL moyenne d'environ 250 € par mois."));}
    if(sit==="etud"&&me<1337) lfi.push(L("Garantie d'autonomie à 1 337 € par mois",(1337-me)*12,0,"Très coûteuse, financement non détaillé. Non retenue."));
    if(sit==="retr"&&me<1700) lfi.push(L("Pension minimale au niveau du SMIC",(1700-me)*12,0,"Pour une carrière complète. Coût très élevé. Non retenue."));
    lfi.push(L("Fin des franchises médicales et participations forfaitaires",persons*50,1,"Hypothèse : 50 € par personne et par an en moyenne (plafond actuel 100 €)."));
    if(nk>0){const pk=pubKids(a,nk), fk=F(a,"kidsCant"), kc=fk!=null?Math.min(fk,a.ecole==="mix"?nk:pk):pk; if(kc>0) lfi.push(L("Cantine scolaire gratuite (école publique)",kc*500,.5,"Hypothèse : 3,50 € par repas, 140 repas par an. Réservée à l'école publique. Coût élevé pour les communes."+(fk==null?(a.ecole==="mix"?" "+kc+" enfant"+(kc>1?"s":"")+" sur "+nk+" compté"+(kc>1?"s":"")+" au public.":" Tous tes enfants au public comptés comme déjeunant à la cantine."):"")));}
    {const nl=F(a,"herLog"); if(nl!=null&&nl>5&&H>0) lfi.push(L("Héritage limité à 5 logements, au-delà réquisition par l'État",-Math.round(H*(nl-5)/nl),0,"Programme officiel (L'Avenir en commun, édition 2027) : "+(nl-5)+" logement"+(nl-5>1?"s":"")+" sur "+nl+" seraient réquisitionnés, valeur estimée au prorata de ton héritage. Aucune indemnisation prévue : une telle privation de propriété est contraire à l'article 17 de la Déclaration de 1789. Non retenue."));}
    lfi.push(L("« 100 % Sécu » : fin des mutuelles",(couple?2:1)*600,0,"Hypothèse : 600 € de mutuelle par adulte. Financement par des cotisations non détaillé. Non retenue."));
    return {lines:lfi,retraite:"Retour à 60 ans avec 40 annuités (peu tenable). Un retour à 62 ans est plus réaliste.",
      herit:H>0?{now:droits(H,100000),then:H<150000?0:droits(H,100000),hyp:"Exonération sous 150 000 €. Au-delà, barème non publié : hypothèse du barème actuel (plafond à 12 M€)."}:null};
  }},

 /* PS */
 {k:"ps",name:"Parti socialiste",short:"PS",c:"--ps",
  fin:{md:null,txt:"Chiffrage global non publié par le PS à ce jour. Ses hausses d'impôts (fin de la flat tax, grandes successions) sont comptées plus haut si elles te touchent."},
  depart:(s,cur)=>Math.min(cur,Math.min(67,Math.max(62,s+43))),
  divBareme:true,
  mesures(x){ const {a,me,couple,cj,cjw,sit,pa,R,parts,ir,persons,cap,P,H,ifiNow,capHyp,div,capD,divHyp,capNow,capNew,capTxt}=x;
    const ps=[];
    const csgMe=["prive","fonct","indep"].includes(sit)?csgPS(me):0, csgCj=csgPS(cjw);
    if(csgMe+csgCj>1) ps.push(L("CSG progressive jusqu'à 2 700 € net",(csgMe+csgCj)*12,1,"Chiffrage du PS : environ 130 € par mois au SMIC, 0 € au-delà de 2 700 €."));
    const smps=(sit==="prive"?Math.max(0,smicGain(me+csgMe,1690)):0)+Math.max(0,(cjw?smicGain(cjw+csgCj,1690):0));
    if(smps>1) ps.push(L("SMIC à 1 690 € net (en plus de la CSG)",smps*12,.5,"Faisable par décret, mais hausse rapide du coût du travail."));
    {const cat=unlocked?a.cat:null; const okMe=sit==="fonct"&&(cat?cat!=="A":me<2700); const okCj=couple&&a.sitc==="fonct"&&cj<2700; const fs=(okMe?me:0)+(okCj?cj:0);
     if(fs>0) ps.push(L("Point d'indice revalorisé (catégories B et C)",fs*.03*.8*12,1,"Montant non publié. Hypothèse : +3 %."+(sit==="fonct"&&!cat?" Catégorie déduite de ton salaire.":"")));}
    if(capD>0&&capNow-capNew<-1) ps.push(L("Fin de la flat tax : revenus financiers"+(div>0?" et dividendes":"")+" à l'impôt",capNow-capNew,1,capTxt+(cap>0?capHyp:"")+divHyp));
    if(P>100000000) ps.push(L("Taxe Zucman (2 % au-delà de 100 M€)",-Math.max(0,.015*P-ifiNow),.5,"Hypothèse : 0,5 % déjà payé en impôts. Risque constitutionnel et d'exil fiscal."));
    ps.push(L("Mutuelle publique « Grande Sécu »",persons*50,.5,"Chiffrage du PS : 50 € rendus par an à chaque assuré."));
    if(pa>0) ps.push(L("Pension alimentaire sortie du revenu imposable",ir-IR(R-pa*12*.9,parts,couple),1,"Mesure simple à voter."));
    return {lines:ps,retraite:"Retour à 62 ans avec 43 annuités, pénibilité élargie.",
      herit:H>0?{now:droits(H,100000),then:droits(H,200000),hyp:"Abattement unique de 200 000 € sur la vie. Au-delà, hypothèse du barème actuel."}:null};
  }},

 /* Renaissance */
 {k:"ctr",name:"Renaissance (centre)",short:"Renaissance",c:"--ctr",
  fin:{md:150,txt:"150 Md€ d'économies annoncées, non détaillées."},
  depart:(s,cur)=>cur,
  mesures(x){ const {me,couple,cjw,sit,pa,R,parts,ir,H}=x;
    const ctr=[];
    const at=(["prive","fonct"].includes(sit)?attal(me):0)+attal(cjw);
    if(at>1) ctr.push(L("+250 € net par mois au salaire médian (baisse de cotisations)",at*12,.5,"Coûteux, à financer par 150 Md€ d'économies non détaillées. Hypothèse : gain dégressif au-delà de 2 200 €, nul à partir de 4 400 € net."));
    if(sit==="chom") ctr.push(L("Nouvelle réforme de l'assurance chômage",-me*.12*12,1,"5 Md€ d'économies visées, soit environ 12 % des allocations."));
    if(pa>0) ctr.push(L("Pension alimentaire sortie du revenu imposable",ir-IR(R-pa*12*.9,parts,couple),1,"Mesure simple à voter."));
    ctr.push(L("Aucune hausse d'impôt pendant le quinquennat",0,1,"Pas de changement direct. Les 150 Md€ d'économies peuvent toucher les services publics."));
    return {lines:ctr,retraite:"64 ans maintenu, vers un système universel avec une part de capitalisation.",
      herit:H>0?{now:droits(H,100000),then:droits(H,100000),hyp:"Pas de hausse des droits de succession."}:null};
  }},

 /* Les Républicains */
 {k:"lr",name:"Les Républicains",short:"LR",c:"--lr",
  fin:{md:200,txt:"Près de 200 Md€ d'économies annoncées, surtout sur les prestations sociales et la fonction publique."},
  depart:(s,cur)=>s<20?cur:Math.min(67,Math.max(65,s+43)),
  mesures(x){ const {a,me,couple,cjw,nk,sit,R,t,H}=x;
    const lr=[];
    const pAct=["prive","fonct","indep"].includes(sit)?primeAct(me,cjw,couple,nk,a.log):0;
    if(pAct>0) lr.push(L("Prime d'activité fusionnée dans le RIA",-pAct*12,1,"Le RIA est réservé aux adultes sans revenu : la prime d'activité disparaît. Montant actuel estimé à "+fmtPlain(pAct)+" par mois. Plafond de toutes les aides à 70 % du SMIC."));
    if(unlocked&&a.rsa==="oui") lr.push(L("RSA remplacé par le RIA (300 € + 250 € si 15 h d'insertion)",-(646-550)*12,1,"RSA actuel d'une personne seule : environ 646 €. Hypothèse : tu suis les 15 h d'insertion, sinon la perte est de 346 € par mois."));
    if(nk>0){const now=allocFam(nk,R), neu=240*Math.min(nk,2)+(nk>=3?480*(nk-2):0); lr.push(L("Revenu familial de 240 € par mois et par enfant",(neu-now)*12,.5,"Remplace 12 aides (allocations familiales, PAJE, ARS…), doublé dès le 3e enfant. Comparé à tes allocations familiales estimées ("+fmtPlain(now)+"/mois). Les autres aides perdues ne sont pas déduites."));}
    {const li=F(a,"loanInt"); if(li&&nk>0){const share=nk>=3?1:nk===2?.75:.5; lr.push(L("Intérêts d'emprunt déductibles (résidence principale)",li*share*t,.5,"Déduits du revenu imposable à "+Math.round(share*100)+" % selon le nombre d'enfants, gain au taux marginal de "+Math.round(t*100)+" %."));}}
    if(sit==="prive"){const sk=F(a,"sick"); const n=sk!=null?sk:.5; if(n>0) lr.push(L("Jour de carence non remboursable par l'employeur",-n*me/21.7,1,sk!=null?"Selon ton nombre d'arrêts.":"Hypothèse : un arrêt tous les deux ans."));}
    if(sit==="fonct"&&unlocked&&a.teach&&a.teach!=="non") lr.push(L("Revalorisation des enseignants",(a.teach==="debut"?135:250)*12,1,"Sur le traitement, pas sur les primes."));
    if(sit==="chom") lr.push(L("Assurance chômage alignée sur « les standards européens »",-me*.15*12,1,"Règles non détaillées (30 Md€ d'économies avec le plafond des aides). Hypothèse : −15 % d'indemnisation."+(me>3000?" Dégressivité plus rapide au-delà de 3 000 € net.":"")));
    lr.push(L("Stabilité fiscale pendant le quinquennat",0,1,"Pas de hausse d'impôt pour les ménages. Les 200 Md€ d'économies touchent surtout prestations et fonction publique."));
    return {lines:lr,retraite:"Taux plein à 65 ans, départ possible dès 63 ans avec décote, part de capitalisation.",
      herit:H>0?{now:droits(H,100000),then:droits(H,100000),hyp:"Pas de changement pour les particuliers (paiement différé seulement pour les entreprises)."}:null};
  }},

 /* Les Écologistes */
 {k:"eco",name:"Les Écologistes",short:"Écologistes",c:"--eco",
  fin:{md:null,txt:"Chiffrage global non publié par les Écologistes à ce jour. Leurs hausses d'impôts (ISF climatique, droits de succession) sont comptées plus haut si elles te touchent."},
  depart:(s,cur)=>s<20?Math.min(cur,Math.max(60,s+43)):Math.min(cur,Math.min(67,Math.max(62,s+43))),
  mesures(x){ const {a,me,couple,cj,cjw,nk,sit,R,W,H,ifiNow,wHyp}=x;
    const eco=[];
    const SMIC_ECO=Math.round(2000*.792);
    const sme=(sit==="prive"?smicGain(me,SMIC_ECO):0)+smicGain(cjw,SMIC_ECO);
    if(sme>1) eco.push(L("SMIC à 2 000 € brut (environ "+SMIC_ECO+" € net)",sme*12,.5,"Faisable par décret, mais hausse rapide du coût du travail."));
    {const fsal=(sit==="fonct"?me:0)+(a.sitc==="fonct"&&couple?cj:0); if(fsal>0) eco.push(L("Point d'indice indexé sur l'inflation",fsal*.015*.8*12,1,"Hypothèse : inflation de 1,5 % par an, point gelé aujourd'hui."));}
    if(sit==="fonct"&&unlocked&&a.teach&&a.teach!=="non") eco.push(L("Enseignants : +15 % de salaire en 5 ans",me*.15*.8*12,.5,"Montant au bout de 5 ans, sur le traitement indiciaire. Coût élevé."));
    if(nk===1) eco.push(L("Allocations familiales dès le 1er enfant",(R>101000?19:R>76000?38:75)*12,1,"Hypothèse : moitié du montant pour deux enfants, soit environ 75 € par mois."));
    if(a.log==="apl"){const ap=F(a,"aplM"); eco.push(L("APL +10 %",(ap!=null?ap:250)*.1*12,1,(ap!=null?"Sur tes APL actuelles.":"Sur une APL moyenne d'environ 250 € par mois.")+" Avec un mécanisme anti-hausse des loyers."));}
    {const isfV=isf(W.isfBase); if(isfV>0||ifiNow>0) eco.push(L("ISF climatique (à la place de l'IFI)",-(isfV-ifiNow),1,"Seuil et taux non publiés : hypothèse de l'ancien barème de l'ISF, plus lourd pour l'immobilier énergivore et les actions polluantes. "+wHyp));}
    eco.push(L("TVA verte modulée selon l'impact écologique",0,1,"Taux non publiés : effet sur ton budget impossible à chiffrer."));
    return {lines:eco,retraite:"Retour à 62 ans, objectif 60 ans pour les carrières longues ou pénibles.",
      herit:H>0?{now:droits(H,100000),then:droits(H,100000)+.1*Math.max(0,H-4e6)+.1*Math.max(0,H-13e6),hyp:"+10 % au-delà de 4 M€ et encore +10 % au-delà de 13 M€. Barème actuel en dessous."}:null};
  }},

 /* Nouvelle Énergie (David Lisnard) */
 {k:"ne",name:"Nouvelle Énergie (David Lisnard)",short:"Lisnard",c:"--ne",
  fin:{md:200,txt:"200 Md€ d'économies publiques d'ici 2032, non détaillées."},
  depart:(s,cur)=>cur,
  mesures(x){ const {a,me,couple,cj,nk,sit,R,parts,ir,t,H,ifiNow,wHyp}=x;
    const ne=[];
    {const g=x=>Math.min(400,.2*x); const sal=(sit==="prive"?g(me):0)+(couple&&a.sitc==="sal"?g(cj):0);
     if(sal>1) ne.push(L("Jusqu'à +400 € net par mois par la baisse des cotisations",sal*12,.25,"Objectif « jusqu'à » affiché pour 2032, compté pour un quart, financé par 200 Md€ d'économies non détaillées. Hypothèse : gain plafonné à 20 % du salaire net."));}
    if(ir>0){const g=Math.min(ir,t*.03*(me+cj)*12); if(g>1) ne.push(L("CSG et CRDS entièrement déductibles de l'impôt",g,1,"Hypothèse : environ 3 % de ton revenu net devient déductible, gain au taux marginal de "+Math.round(t*100)+" %."));}
    if(nk>0){const g=ir-IR(R,parts,couple,true); if(g>1) ne.push(L("Quotient familial déplafonné",g,1,"Simple modification du quotient familial."));}
    if(ifiNow>0) ne.push(L("IFI supprimé, remplacé par une fiscalité foncière",ifiNow,.5,"Taux de la nouvelle fiscalité foncière non publié : gain compté pour moitié. "+wHyp));
    {const nr=(sit==="retr"&&me>2200?me:0)+(couple&&a.sitc==="retr"&&cj>2200?cj:0); if(nr>0) ne.push(L("Pensions au-dessus de 2 200 € non revalorisées",-nr*.015*12,1,"Piste donnée par David Lisnard le 27 octobre 2026 (CNews, Europe 1). Hypothèse : inflation de 1,5 % par an, perte de la première année."));}
    if(sit==="fonct"&&unlocked&&a.teach&&a.teach!=="non") ne.push(L("Enseignants : +20 % de salaire en 5 ans",me*.20*.8*12,.5,"Montant au bout de 5 ans, sur le traitement indiciaire, en contrepartie d'une réorganisation."));
    ne.push(L("200 Md€ d'économies publiques d'ici 2032",0,1,"Effet sur les services publics et les prestations non chiffré."));
    return {lines:ne,retraite:"Âge légal porté à 65 ans (programme de Nouvelle Énergie), socle minimal par répartition, environ 40 % des retraites en capitalisation.",
      herit:H>0?{now:droits(H,100000),then:0,hyp:"Suppression des droits de succession en ligne directe (tribune d'avril 2026)."}:null};
  }},

 /* Horizons (Édouard Philippe), programme publié le 18/11/2026 */
 {k:"hor",name:"Horizons (Édouard Philippe)",short:"Philippe",c:"--hor",
  fin:{md:150,txt:"150 Md€ d'économies, dont la moitié sur les dépenses sociales et 250 000 postes de fonctionnaires en moins."},
  depart:(s,cur)=>s<21?cur:Math.min(67,Math.max(65,s+45)),
  mesures(x){ const {a,me,couple,cj,nk,sit,R,H}=x;
    const hor=[];
    {const w=(sit==="prive"?me:0)+(couple&&a.sitc==="sal"?cj:0); if(w>0) hor.push(L("Heures au-delà de 35 h sans impôt ni cotisations salariales",w*(2*52/12)/151.67*12,0,"Selon le programme, plus de 1 000 € par an au SMIC pour 2 heures de plus par semaine. Mais il faut que l'entreprise allonge le temps de travail par accord : rien n'est garanti. Non retenue."));}
    if(nk>0){const now=allocFam(nk,R), neu=R>101000?87.5:R>76000?175:350; hor.push(L("Allocation familiale unique de 350 € par mois dès le 1er enfant",(neu-now)*12,.5,"Montant par famille, dégressif avec le revenu : seuils non publiés, hypothèse des seuils actuels des allocations familiales (moitié puis quart). Comparé à tes allocations familiales estimées ("+fmtPlain(now)+"/mois). Les autres aides remplacées ne sont pas déduites. Coût non chiffré."));
      hor.push(L("Pas d'impôt sur le revenu les 3 premières années d'un enfant",0,1,"Pour les classes moyennes, et 3 000 € de réduction d'impôt par an pour les familles plus aisées. Dépend de l'âge de tes enfants : non compté ici."));}
    if(sit==="fonct"){const sk=F(a,"sick"); const n=sk!=null?sk:.5; if(n>0) hor.push(L("Trois jours de carence dans la fonction publique (un aujourd'hui)",-n*2*me/21.7,1,sk!=null?"Selon ton nombre d'arrêts.":"Hypothèse : un arrêt tous les deux ans."));}
    if(sit==="fonct"&&unlocked&&a.teach&&a.teach!=="non") hor.push(L("Enseignants : +20 % de salaire en moyenne sur le quinquennat",me*.20*.8*12,.5,"Montant au bout de 5 ans, sur le traitement indiciaire. Coût non chiffré."));
    if(sit==="chom"&&(a.age==="u30"||a.age==="a30")) hor.push(L("Chômage indemnisé 12 mois maximum avant 50 ans (18 aujourd'hui)",-me*2,1,"Hypothèse : une chance sur deux de rester au chômage plus de 12 mois, soit 6 mois d'allocation perdus, ramenés à l'année."));
    if(a.age==="u30"&&a.log!=="prop") hor.push(L("Frais de notaire supprimés pour un 1er achat avant 35 ans",0,1,"Gain ponctuel, environ 7 000 € pour un logement de 100 000 € : non compté dans le total annuel."));
    hor.push(L("Aucun nouvel impôt, 150 Md€ d'économies",0,1,"Moitié sur les dépenses sociales, 250 000 postes de fonctionnaires en moins : effet sur les services publics et les prestations non chiffré."));
    return {lines:hor,retraite:"65 ans et 45 annuités en moins de 10 ans, carrières longues maintenues, part de capitalisation collective.",
      herit:H>0?{now:droits(H,100000),then:droits(H,200000),hyp:"Plafonds de donation doublés pendant les 3 premières années du quinquennat : moins de droits si la donation est faite à ce moment-là. Pas de changement pour les successions."}:null};
  }}
];

function compute(a){
  const x=contexte(a), {R,parts,t,remu,div}=x;
  const res={};
  for(const p of PARTIES) res[p.k]=p.mesures(x);
  const st=F(a,"start"); if(st!=null&&a.sit!=="retr"&&a.age!=="a62"){const cur=departActuel(st,anneeNaissance(a)); for(const p of PARTIES) res[p.k].perso="Toi : départ à taux plein vers "+ans(p.depart(st,cur))+" (aujourd'hui "+ans(cur)+").";}
  if(remu&&remu!=="ei"){const is=div>42500?.25:.15, t2=tmi(R+div,parts), sal=Math.round(56*(1-.9*t)), salB=Math.round(56*(1-.9*t2)), dNow=Math.round(100*(1-is)*(1-Math.min(.30,.172+.6*t))), dBar=Math.round(100*(1-is)*(1-t2-.172));
    for(const p of PARTIES){const k=p.k, bar=!!p.divBareme, dv=bar?dBar:dNow, sl=bar?salB:sal, best=sl>dv+2?"Mieux vaut te payer en salaire.":dv>sl+2?"Mieux vaut te payer en dividendes.":"Les deux se valent à peu près.";
      res[k].remu="Sur 100 € de bénéfice de ta société, il te reste environ "+sl+" € en salaire et "+dv+" € en dividendes"+(bar?" (dividendes au barème)":" (règles actuelles)")+". "+best;}
    res.remuHyp="Hypothèses : dirigeant de SAS ou SASU (environ 56 € net pour 100 € de coût salarial), impôt sur les sociétés à "+Math.round(is*100)+" %, ta tranche d'impôt à "+Math.round(t*100)+" %"+(t2>t?" ("+Math.round(t2*100)+" % avec LFI et le PS, qui ajoutent les dividendes à ton revenu imposable)":"")+". En SARL ou EURL, les charges et les dividendes au-delà de 10 % du capital sont traités autrement. Le salaire ouvre aussi des droits à la retraite et au chômage, pas les dividendes.";}
  for(const p of PARTIES){const r=res[p.k]; r.total=r.lines.reduce((s,l)=>s+l.v*l.k,0); r.hyp=r.lines.filter(l=>/Hypoth|estimé|déduite|moyenne/.test(l.n)).length;}
  return res;
}
