"use strict";
/* Paiement en deux écrans : la case des conditions de vente est dans l'encart, le bouton mène directement à Mollie.
   La page merci débloque l'accès au retour et demande le mail ensuite (pour envoyer le code, utile sur un autre appareil).
   acheter.html reste en place pour ceux qui préfèrent laisser leur mail avant de payer. */
(function(){
  var pay=document.getElementById("pay"); if(!pay||!PAYMENT_URL) return;
  var box=document.createElement("label"); box.className="cgvcheck";
  box.innerHTML='<input type="checkbox" id="cgv"> <span>J\'ai lu les <a href="legal.html#cgv" target="_blank" rel="noopener">conditions de vente</a>. Je demande l\'accès immédiat et je renonce à mon droit de rétractation de 14 jours.</span>';
  pay.parentNode.insertBefore(box,pay);
  var msg=document.createElement("p"); msg.className="codemsg"; msg.setAttribute("role","status"); msg.style.margin="0";
  pay.parentNode.insertBefore(msg,pay.nextSibling);
  var alt=document.createElement("p"); alt.className="qhelp"; alt.style.margin="0";
  alt.innerHTML='Tu paies sur la page sécurisée de Mollie, ton accès s\'active dès ton retour ici. Ton code personnel t\'est ensuite envoyé par mail. <a href="acheter.html">Je préfère laisser mon mail avant de payer</a>';
  pay.parentNode.insertBefore(alt,msg.nextSibling);
  pay.addEventListener("click",function(e){
    pay.href=PAYMENT_URL;
    if(!document.getElementById("cgv").checked){ e.preventDefault(); e.stopImmediatePropagation(); msg.textContent="Coche la case des conditions de vente pour continuer."; return; }
    msg.textContent="";
    try{ localStorage.setItem("vo-cgv",JSON.stringify(new Date().toISOString())); }catch(err){}
    if(window.track) track("paiement-direct-"+(location.pathname.indexOf("retraite")>=0?"retraite":"vote"));
  },true);
})();
