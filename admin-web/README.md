# PMU'B Admin Web

Dashboard d'administration autonome pour Le Journal Hippique PMU'B.

## Stack
- Vite + React 18 + TypeScript
- TailwindCSS (thème sombre type Linear/Notion)
- React Router
- Axios + JWT

## Développement local

```bash
cd admin-web
npm install
cp .env.example .env
# Éditer .env si besoin (VITE_API_URL pointant vers votre backend FastAPI)
npm run dev
```

L'app sera disponible sur http://localhost:5173.

## Build production

```bash
npm run build
```

Le dossier `dist/` peut être déployé tel quel sur Vercel, Netlify, S3, ou tout serveur statique.

### Pour un déploiement autonome

```bash
VITE_BASE=/ VITE_API_URL=https://api.votredomaine.com npm run build
```

### Pour servir via FastAPI (preview locale)

Le backend FastAPI monte automatiquement le dossier `dist/` sur `/api/admin-ui/`.

```bash
npm run build
# Recharger le backend pour exposer /api/admin-ui/
sudo supervisorctl restart backend
```

Accès : `https://votre-domaine/api/admin-ui/`

## Identifiants par défaut
- Email : `enockmoonne.admin@pmub.app`
- Mot de passe : `@Unlimited86`
