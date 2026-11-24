# Ce que coûte mon vote

Simulateur de l'impact des programmes économiques de la présidentielle 2027 sur le budget personnel. Site statique pour GitHub Pages, sans étape de construction : chaque fichier est servi tel quel.

## Où modifier quoi

| Je veux changer… | Fichier |
| --- | --- |
| Le prix affiché, le lien de paiement Mollie, l'adresse de contact, la clé du formulaire | `reglages.js` (vaut pour toutes les pages) |
| Une mesure d'un parti, ou ajouter un parti | `js/programmes.js` (un bloc par parti) |
| Le financement annoncé d'un parti (ligne « Financement », jamais comptée) | `js/programmes.js`, champ `fin` du bloc du parti |
| La date « Programme vérifié le… » affichée sur chaque fiche | `js/programmes.js`, `MAJ_PROGRAMMES` en haut du fichier |
| Le paiement direct depuis l'encart (case des CGV, bouton Mollie) | `js/paiement-direct.js` ; le mail est demandé après paiement sur `merci.html` |
| Une question, son texte d'aide ou sa phrase dans l'encart de paiement | `js/questions.js` |
| Le SMIC, le barème de l'impôt, l'IFI, les droits de succession (règles actuelles) | `js/fiscalite.js` |
| Une couleur (dont celle d'un parti) | `site.css` |
| Les textes de l'accueil, la liste des partis présentés, les sources | `index.html`, `simulateur.html` |
| Test retraite : l'âge légal, les trimestres actuels ou la règle d'un parti | `js/retraite-regles.js` (`REGLE_ACTUELLE`, un bloc par parti dans `RE_PARTIS`) |
| Test retraite : caisses des libéraux (CNBF, CARMF, CIPAV) et calcul des carrières mixtes | `js/retraite-regles.js` (`LIB`, `repartition`, `pension`) |
| Test retraite : une question ou le fonctionnement de la page | `js/retraite.js` |
| Test retraite : rendements, taux de cotisation ou paramètres des modèles allemand, britannique, américain (bloc « Et si tes cotisations avaient été placées ? ») | `js/retraite-capi.js` (constantes en haut du fichier et de chaque modèle) |
| La question posée dès l'accueil (revenu pour le simulateur, année de naissance pour la retraite) | `index.html` (blocs `qstart` et `rqstart`, avec leur petit script en bas de page) |
| Le résumé des programmes lisible par Google (page « Les programmes 2027 ») : à mettre à jour quand un programme change | `programmes.html` (texte, tableau retraite et questions ; les questions sont recopiées dans le bloc `application/ld+json` en haut) |
| Le tableau des âges et les questions fréquentes sous le test retraite | `retraite.html` (section `#ages` et bloc `application/ld+json`) |
| Ce que les moteurs de recherche et les assistants IA peuvent lire | `robots.txt`, `sitemap.xml` (date `lastmod` à changer quand une page change) |
| Les codes de déblocage acceptés | `codes.js` (empreintes produites par l'outil privé) |
| Les mentions légales, CGV, confidentialité | `legal.html` (bloc « Identité du vendeur » en bas) |

Pour ajouter un parti : copier un bloc dans `js/programmes.js` et lui donner un code (`k`), ajouter sa couleur `--code` dans `site.css` (mode clair et deux fois en mode sombre), puis le présenter sur `index.html` (liste des partis, exemple de résultat, description) et dans les sources de `simulateur.html`.

## Les fichiers

- `index.html` : page d'accueil à partager (aperçu `og.png`).
- `simulateur.html` : le test et le résultat (PDF A4). Première simulation gratuite, puis code payant pour modifier ses réponses.
  - `js/fiscalite.js`, `js/questions.js`, `js/programmes.js` : les données et les calculs.
  - `js/simulateur.js` : le fonctionnement de la page (questionnaire, accès payant, résultat, page A4).
  - `vendor/` : les deux librairies du PDF, chargées seulement une fois le résultat affiché.
- `retraite.html` : le test « Ma retraite selon les candidats » (âge de départ et pension par programme). Même accès payant que le simulateur (un achat débloque les deux).
  - `js/retraite-regles.js` : règles actuelles et règles de chaque parti, calcul de la pension. `js/retraite.js` : la page. `js/retraite-capi.js` : capitalisation et modèles étrangers.
- `acheter.html` : formulaire (Web3Forms) puis redirection vers le paiement Mollie. `merci.html` : retour après paiement. Mise en page commune : `paiement.css`.
- `legal.html` : mentions légales, CGV, confidentialité.
- `stats.js` : statistiques GoatCounter sans cookie. Événements ajoutés le 23/11 : `vote-partage-image` (et `-montants`, `-inapp`), `vote-demande-detail`, `vote-demande-pdf`, `paiement-direct-vote`, `paiement-direct-retraite`, `vote-merci-mail`, `retraite-capi-ouvert`. Réponses à la question d'accueil : événements `accueil-salaire-saisi` (simulateur) et `accueil-retraite-annee-saisie` (retraite).
