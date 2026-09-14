# Sécurité du portfolio

## Protections implémentées

- SQL paramétré sur toutes les routes ; validation des types, longueurs, tableaux (30 éléments
  maximum), dates, catégories, identifiants et liens HTTP(S) sans identifiants intégrés.
  Le contenu technique des writeups peut mentionner SQL/XSS : il est traité comme une donnée.
- Écritures réservées au propriétaire GitHub : origine exacte obligatoire, session JWT HS256,
  émetteur/destinataire fixés, expiration après 8 h, secret d'au moins 32 octets. OAuth vérifie
  le state en temps constant et borne les appels sortants. Pas de mot de passe local à deviner.
- CORS sans wildcard ; corps JSON uniquement pour les formulaires ; limite 64 Kio pour les
  données courantes, 3 Mio pour une requête de certification, 1 Mio par pièce jointe.
- Rate limiting partagé et atomique dans Postgres : quotas détaillés dans README §9.
  `429` + `Retry-After`, `503` si le compteur partagé est indisponible. Nettoyage des compteurs
  expirés par lots, déclenché probabilistiquement par le trafic. Pas de stockage d'IP en clair.
- Erreurs échappées avant insertion HTML, URLs contrôlées, Markdown nettoyé avec DOMPurify
  3.4.15 et profil HTML restreint. Bibliothèques navigateur locales avec empreintes SRI.
  CSP sans scripts inline ni CDN et connexions limitées au backend configuré.
- Réponses API non mises en cache, `nosniff`, `DENY`, HSTS et Permissions-Policy.
  Connexion Postgres avec vérification du certificat TLS, requêtes et pool bornés.
- Dépendances backend verrouillées dans package-lock.json ; installation sans scripts possible.

## Activation en production

1. Exécuter `backend/migrations/002_security_rate_limits.sql` avant le backend.
   La migration des certifications `001_education.sql` reste nécessaire si elle n'a pas encore
   été appliquée ; ses INSERT ne doivent être exécutés qu'une fois.
2. Configurer `DATABASE_URL`, un `JWT_SECRET` aléatoire de 32 octets minimum, les variables OAuth,
   `BACKEND_URL` et `FRONTEND_URL`. Ne pas désactiver TLS en production. Les paramètres SSL de l’URL sont retirés afin de ne pas écraser la vérification TLS imposée par le code.
3. Déployer backend puis frontend. Se reconnecter (les anciens JWT sont invalidés).
4. Dans Vercel → Firewall, configurer les protections edge. Proposition initiale à ajuster aux
   journaux : quota `/api/*` de 120/minute par IP ; `/api/auth/*` de 20/15 minutes ; refus des
   chemins de sondage sans usage sur ce projet (`/.env`, `/.git/*`, `/wp-admin/*`, `/xmlrpc.php`).
   Vérifier d'abord les règles en journalisation et les exclusions nécessaires au flux OAuth.
   L'accès et la facturation des options dépendent du plan Vercel.

Les règles WAF ne sont **pas activées** par le code et aucun test offensif n'a été exécuté sur
le site en production. Un site public reste scannable ; les quotas par IP ne suffisent pas
contre un botnet ou une attaque volumétrique. Le WAF protège avant les fonctions et la base.
Le frontend GitHub Pages dépend des protections de son hébergeur : les en-têtes du backend
ne protègent pas les pages statiques. Le meta CSP protège les scripts, mais l'anti-iframe et
HSTS des pages nécessitent des en-têtes configurés par l'hébergeur/proxy. L'obscurité de
l'URL admin n'est pas une protection d'accès. La validation des fichiers n'est pas un antivirus.

Documentation de référence :
- https://vercel.com/docs/headers/request-headers
- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- https://github.com/cure53/DOMPurify/releases/tag/3.4.15

## Vérifications reproductibles

```sh
cd backend
npm ci --ignore-scripts
npm test
npm audit --omit=dev
```

Test d'intégration : utiliser exclusivement une base isolée dont le nom se termine par
`_security_test`. Le script vide les tables de cette base de test. Exemple :

```sh
TEST_DATABASE_URL=postgresql://localhost/portfolio_security_test npm run test:integration
```

Le test vérifie trois processus concurrents, l'expiration des compteurs, le `429` réel,
les mutations SQL avec charges d'injection et le CRUD complet des certificats. Il désactive
TLS uniquement pour cette base de test locale. Ne jamais utiliser une base contenant des données.
Les tests navigateur de la session ont aussi vérifié les flux CRUD sur mobile ; les vérifications
XSS du rendu Markdown utilisent des réponses API simulées.
