# Portfolio — Windows 95

Le frontend est publié par GitHub Pages depuis la racine de ce dépôt.
Le backend serverless se trouve dans `backend/` et utilise Postgres et GitHub OAuth.

## Vercel

Relier ce dépôt au projet backend existant, puis vérifier :

- **Root Directory : `backend`**
- **Framework Preset : Other**
- Installation : `npm ci` (ou détection automatique).
- Branche de production : `main`.
- Variables : `DATABASE_URL`, `JWT_SECRET` (32 octets aléatoires minimum),
  `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OWNER_USERNAME`,
  `BACKEND_URL`, `FRONTEND_URL`.
- `FRONTEND_URL` : `https://yahyabennani.github.io`.
- `BACKEND_URL` doit correspondre à l'URL du projet et à celle de `js/config.js`.

## Base de données : avant le déploiement backend

Pour une base existante :

1. Exécuter `backend/migrations/001_education.sql` uniquement si la migration des
   certifications n'a jamais été appliquée (ses INSERT ne sont pas réexécutables).
2. Exécuter `backend/migrations/002_security_rate_limits.sql` (réexécutable).

Sans la table de rate limiting, le backend renvoie `503` par sécurité.
Pour une base neuve, exécuter `backend/schema.sql` ; les certifications peuvent ensuite
être créées dans le panneau admin.

## Tests et sécurité

```sh
cd backend
npm ci --ignore-scripts
npm test
```

Voir [SECURITY.md](SECURITY.md) pour les quotas, les protections et les règles WAF à
configurer dans Vercel. Le push GitHub ne configure pas les variables d'environnement,
les migrations SQL ni le pare-feu.
