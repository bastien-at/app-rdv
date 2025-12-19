# 🚀 Guide de démarrage rapide - Bike Fitting Booking

## ⚡ Installation rapide

### 1. Installer les dépendances

```bash
# À la racine du projet
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configurer PostgreSQL

```bash
# Créer une base de données locale (exemple avec PostgreSQL installé en local)
createdb bike_fitting_db

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos paramètres PostgreSQL
# Exemple :
# DATABASE_URL=postgresql://postgres:motdepasse@localhost:5432/bike_fitting_db
```

### 3. Migrer et peupler la base de données

```bash
cd backend

# Exécuter les migrations (créer les tables)
npm run migrate

# Charger les données de test
npm run seed
```

**Note** : Vous pouvez aussi exécuter le SQL directement dans un outil type `psql` ou un client graphique en important le contenu de `backend/src/db/schema.sql`.

### 4. Lancer l'application

```bash
# À la racine du projet (lance backend + frontend)
npm run dev

# Ou séparément :
# Backend (port 3000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

## 🔑 Comptes de test

Après le seeding, vous pouvez vous connecter avec :

- **Super Admin** : `admin@alltricks.com` / `admin123`
- **Admin Paris** : `admin.paris@alltricks.com` / `admin123`
- **Admin Lyon** : `admin.lyon@alltricks.com` / `admin123`
- **Admin Marseille** : `admin.marseille@alltricks.com` / `admin123`

## 📱 URLs de l'application

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:3000/api
- **Admin Dashboard** : http://localhost:5173/admin/login

## 🧪 Tester l'API

### Récupérer les magasins

```bash
curl http://localhost:3000/api/stores
```

### Récupérer les services d'un magasin

```bash
curl http://localhost:3000/api/stores/{STORE_ID}/services
```

### Vérifier la disponibilité

```bash
curl "http://localhost:3000/api/stores/{STORE_ID}/availability?date=2024-12-20&service_id={SERVICE_ID}"
```

### Créer une réservation

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "...",
    "service_id": "...",
    "start_datetime": "2024-12-20T14:00:00Z",
    "customer_firstname": "Jean",
    "customer_lastname": "Dupont",
    "customer_email": "jean.dupont@example.com",
    "customer_phone": "0612345678",
    "customer_data": {
      "height": 180,
      "weight": 75,
      "shoe_size": 43,
      "practice_frequency": "3-4 fois/semaine",
      "bike_info": "Vélo route"
    }
  }'
```

## 📧 Configuration Email (Brevo)

Pour activer l'envoi d'emails transactionnels :

1.  Créer un compte sur [Brevo](https://www.brevo.com/)
2.  Récupérer une clé API v3
3.  Configurer dans `.env` :

```env
BREVO_API_KEY=xkeysib-votre-cle-api
EMAIL_FROM=noreply@alltricks.com
```

Voir `backend/BREVO_SETUP.md` pour les détails.

## 🏗️ Structure du projet

```
app-rdv/
├── backend/              # API Express + TypeScript
│   ├── src/
│   │   ├── controllers/  # Logique des routes
│   │   ├── routes/       # Définition des routes
│   │   ├── middleware/   # Auth, validation
│   │   ├── utils/        # Email, auth, availability
│   │   ├── db/           # Config DB, migrations, seeds
│   │   └── types/        # Types TypeScript
│   └── package.json
├── frontend/             # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/        # Pages principales
│   │   ├── components/   # Composants réutilisables
│   │   ├── services/     # Appels API
│   │   └── types/        # Types TypeScript
│   └── package.json
└── package.json          # Root workspace
```

## 🔧 Scripts disponibles

### Root

- `npm run dev` - Lance backend + frontend
- `npm run build` - Build complet
- `npm run start` - Lance en production

### Backend

- `npm run dev` - Mode développement avec hot reload
- `npm run build` - Compile TypeScript
- `npm run start` - Lance le serveur compilé
- `npm run migrate` - Exécute les migrations DB
- `npm run seed` - Charge les données de test

### Frontend

- `npm run dev` - Serveur de développement Vite
- `npm run build` - Build pour production
- `npm run preview` - Prévisualise le build

## 🐛 Dépannage

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est démarré
pg_isready

# Vérifier les credentials dans .env
cat .env | grep DATABASE_URL
```

### Port déjà utilisé

```bash
# Changer le port dans backend/src/server.ts
const PORT = process.env.PORT || 3001;

# Ou dans .env
PORT=3001
```

### Erreurs TypeScript

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

## 📚 Fonctionnalités implémentées

### ✅ Phase 1 (MVP)

- [x] Affichage des magasins et services
- [x] Calendrier avec créneaux disponibles
- [x] Formulaire de réservation complet
- [x] Email de confirmation avec iCal
- [x] Dashboard admin (planning, listes de RDV)
- [x] Authentification JWT pour l'admin
- [x] Validation des données
- [x] Gestion des conflits de réservation

### ✅ Phase 2 (en grande partie livrée)

- [x] Rappels automatiques J-2 et J-1
- [x] Gestion des blocages de disponibilité (availability_blocks)
- [x] Interface admin complète (services globaux/magasins, paramètres magasin)
- [x] Annuaire clients
- [x] Réinitialisation de mot de passe admin
- [ ] Reporting avancé et export CSV

### 💡 Phase 3 (Futur)

- [ ] File d'attente
- [ ] Notifications SMS
- [ ] Analytics avancées
- [ ] Multi-langue

## 🚀 Déploiement

### Backend sur Railway

1. Créer un compte sur [Railway](https://railway.app)
2. Créer un nouveau projet
3. Ajouter PostgreSQL depuis les services
4. Déployer depuis GitHub
5. Configurer les variables d'environnement

### Frontend sur Vercel

1. Créer un compte sur [Vercel](https://vercel.com)
2. Importer le projet depuis GitHub
3. Configurer le root directory : `frontend`
4. Ajouter la variable `VITE_API_URL` pointant vers Railway

## 📞 Support

Pour toute question ou problème :

- Ouvrir une issue sur GitHub
- Email : support@alltricks.com

## 📄 Licence

MIT
