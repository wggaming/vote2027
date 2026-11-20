# Ce que coûte mon vote

Simulateur de l'impact des programmes économiques (RN, LFI, PS, Renaissance) sur le budget personnel. Site statique pour GitHub Pages.

- `index.html` : page d'accueil à partager (aperçu `og.png`).
- `simulateur.html` : le test et le résultat (PDF A4). Première simulation gratuite, puis code payant pour modifier ses réponses.
- `acheter.html` : formulaire (Web3Forms) puis redirection vers le paiement Mollie.
- `legal.html` : mentions légales, CGV, confidentialité.
- `stats.js` : statistiques GoatCounter sans cookie.

Réglages : `PAYMENT_URL` (lien Mollie à 1 €) dans `simulateur.html` et `acheter.html`.

## Ce que me coûtent mes frais (`frais/`)

Second simulateur, servi à https://vote.wagramconseil.fr/frais/ : additionne sur 20 ans les frais de banque, d'assurance-vie et de PEA, intérêts perdus compris. Total gratuit, détail à 1 € (codes `FR-XXXXX-XXXXX`, empreintes dans `frais/codes.js`, sel `codes-v2:frais`). Réglage : `PAYMENT_URL` dans `frais/acheter.html` (lien Mollie réutilisable qui redirige vers `frais/merci.html?t=…`). Hypothèses et sources en tête du script de `frais/simulateur.html` et sur `frais/index.html#methode`. Le PDF réutilise `vendor/`.
