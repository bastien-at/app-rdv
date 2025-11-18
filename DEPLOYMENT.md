# 🚀 Guide de Déploiement - Application de Réservation Vélo

## 📋 Pré-requis

- Compte Vercel (frontend)
- Compte Railway / Render / Heroku (backend + PostgreSQL)
- Git configuré
- Node.js 18+

---

## 🎯 Architecture de Déploiement

```
Frontend (Vercel)
  ↓ API calls
Backend (Railway/Render)
  ↓ Database
PostgreSQL (Railway/Render)
```

---

## 1️⃣ Déploiement de la Base de Données

### Option A : Railway (Recommandé)

1. **Créer un compte** sur [railway.app](https://railway.app)

2. **Nouveau projet** → PostgreSQL

3. **Récupérer les credentials** :

   - `DATABASE_URL` : copier l'URL complète

4. **Exécuter les migrations** :

   ```bash
   # Depuis votre machine locale
   cd backend

   # Installer psql si nécessaire
   # Puis exécuter les scripts SQL
   psql "YOUR_DATABASE_URL" < src/db/schema.sql
   psql "YOUR_DATABASE_URL" < src/db/add-inspection-tables.sql
   ```

### Option B : Render

1. **Créer un compte** sur [render.com](https://render.com)
2. **New** → **PostgreSQL**
3. Suivre les mêmes étapes que Railway

---

## 2️⃣ Déploiement du Backend

### Sur Railway

1. **New Service** → **GitHub Repo**

2. **Sélectionner** votre repo

3. **Root Directory** : `backend`

4. **Build Command** :

   ```bash
   npm install && npm run build
   ```

5. **Start Command** :

   ```bash
   npm start
   ```

6. **Variables d'environnement** :

   ```env
   DATABASE_URL=postgresql://...
   PORT=3000
   NODE_ENV=production
   FRONTEND_URL=https://votre-app.vercel.app
   ADMIN_TOKEN=votre-token-secret-admin
   BREVO_API_KEY=votre-cle-brevo
   BREVO_SENDER_EMAIL=noreply@votredomaine.com
   BREVO_SENDER_NAME=Votre Entreprise
   ```

7. **Générer le domaine** : Railway vous donnera une URL type `https://xxx.railway.app`

### Sur Render

1. **New** → **Web Service**
2. **Connect Repository**
3. **Root Directory** : `backend`
4. **Build Command** : `npm install && npm run build`
5. **Start Command** : `npm start`
6. Ajouter les mêmes variables d'environnement

---

## 3️⃣ Déploiement du Frontend

### Sur Vercel (Recommandé)

1. **Installer Vercel CLI** :

   ```bash
   npm install -g vercel
   ```

2. **Se connecter** :

   ```bash
   vercel login
   ```

3. **Déployer** :

   ```bash
   cd frontend
   vercel
   ```

4. **Configuration** :

   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Variables d'environnement** :

   ```env
   VITE_API_URL=https://votre-backend.railway.app/api
   ```

6. **Déployer en production** :
   ```bash
   vercel --prod
   ```

### Configuration Vercel (vercel.json)

Créer `frontend/vercel.json` :

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 4️⃣ Configuration DNS (Optionnel)

### Pour un domaine personnalisé

1. **Vercel** :

   - Settings → Domains
   - Ajouter votre domaine
   - Configurer les DNS chez votre registrar

2. **Backend** :
   - Railway/Render permet aussi des domaines personnalisés
   - Exemple : `api.votredomaine.com`

---

## 5️⃣ Checklist Avant Déploiement

### Backend

- [ ] Toutes les variables d'environnement sont configurées
- [ ] Les migrations SQL sont exécutées
- [ ] Le CORS est configuré avec l'URL du frontend
- [ ] Les emails Brevo sont configurés (ou commentés)
- [ ] Le serveur démarre sans erreur localement

### Frontend

- [ ] `VITE_API_URL` pointe vers le backend de production
- [ ] Le build fonctionne : `npm run build`
- [ ] Pas d'erreurs dans la console
- [ ] Les routes fonctionnent (slugs de magasins)

### Base de Données

- [ ] Les 3 magasins sont créés (Lyon, Paris, Marseille)
- [ ] Les services sont configurés
- [ ] Les techniciens sont ajoutés
- [ ] Un admin est créé

---

## 6️⃣ Tests Post-Déploiement

### Tests Fonctionnels

1. **Page d'accueil** : `https://votre-app.vercel.app`

   - ✅ Affichage correct
   - ✅ Boutons fonctionnels

2. **Liste des magasins** : `/stores`

   - ✅ 3 magasins affichés
   - ✅ Clic redirige vers `/stores/lyon`

3. **Sélection service** : `/stores/lyon`

   - ✅ Chargement du magasin
   - ✅ Deux services affichés

4. **Réservation** : `/stores/lyon/booking?type=fitting`

   - ✅ Chargement des créneaux
   - ✅ Formulaire fonctionnel
   - ✅ Email de confirmation envoyé

5. **Admin** : `/admin/login`
   - ✅ Connexion fonctionnelle
   - ✅ Dashboard accessible
   - ✅ État des lieux et PV fonctionnels

---

## 7️⃣ Monitoring et Logs

### Railway

- **Logs** : Onglet "Deployments" → Logs en temps réel
- **Metrics** : CPU, RAM, Requests

### Vercel

- **Analytics** : Vercel Analytics (gratuit)
- **Logs** : Onglet "Deployments" → Function Logs

### Erreurs Courantes

1. **CORS Error** :

   - Vérifier `FRONTEND_URL` dans le backend
   - Vérifier que le frontend appelle la bonne URL

2. **Database Connection Failed** :

   - Vérifier `DATABASE_URL`
   - Vérifier que la DB est accessible

3. **404 sur les routes** :
   - Vérifier `vercel.json` (rewrites)
   - Vérifier que le routing React fonctionne

---

## 8️⃣ Commandes Utiles

### Déploiement Rapide

```bash
# Backend (depuis /backend)
git add .
git commit -m "Update backend"
git push origin main
# Railway/Render redéploie automatiquement

# Frontend (depuis /frontend)
vercel --prod
```

### Rollback

```bash
# Vercel
vercel rollback

# Railway
# Via l'interface web : Deployments → Rollback
```

### Logs en Direct

```bash
# Vercel
vercel logs --follow

# Railway
# Via l'interface web
```

---

## 9️⃣ Coûts Estimés

### Gratuit (Hobby)

- **Vercel** : Gratuit (100 GB bandwidth/mois)
- **Railway** : $5/mois de crédit gratuit
- **Render** : Gratuit (avec limitations)

### Production (Recommandé)

- **Vercel Pro** : $20/mois
- **Railway** : ~$10-20/mois (selon usage)
- **Total** : ~$30-40/mois

---

## 🔐 Sécurité

### À Faire

- [ ] Changer `ADMIN_TOKEN` en production
- [ ] Utiliser HTTPS partout
- [ ] Configurer rate limiting
- [ ] Activer les logs d'audit
- [ ] Sauvegardes automatiques de la DB

### Variables Sensibles

- Ne JAMAIS commit les `.env`
- Utiliser les secrets des plateformes
- Rotation régulière des tokens

---

## 📞 Support

En cas de problème :

1. Vérifier les logs (Railway/Vercel)
2. Tester les endpoints API directement
3. Vérifier les variables d'environnement
4. Consulter la documentation des plateformes

---

## ✅ Checklist Finale

- [ ] Backend déployé et accessible
- [ ] Frontend déployé et accessible
- [ ] Base de données migrée
- [ ] Variables d'environnement configurées
- [ ] Tests fonctionnels passés
- [ ] Emails fonctionnels (ou désactivés)
- [ ] Monitoring activé
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] Backups configurés

**Félicitations ! Votre application est en production ! 🎉**
