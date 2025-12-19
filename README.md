# 🚴 Bike Fitting Booking System

Application web complète de réservation de créneaux d'étude posturale (bike fitting) en magasin.

## 🎯 Fonctionnalités

### Côté Client

- ✅ Sélection de magasin avec filtrage géographique
- ✅ Choix du service (étude posturale / atelier)
- ✅ Calendrier interactif avec créneaux disponibles en temps réel
- ✅ Formulaire de réservation avec informations client
- ✅ Confirmation par email avec pièce jointe iCal
- ✅ Rappels automatiques J-2 et J-1
- ✅ Modification/annulation sécurisée par lien unique

### Côté Admin

- ✅ Dashboard avec vue agenda
- ✅ Gestion du planning et des créneaux
- ✅ Gestion des réservations (validation, annulation, reprogrammation)
- ✅ Configuration des services globaux et par magasin
- ✅ Configuration avancée du magasin (services actifs, capacité atelier)
- ✅ Gestion des administrateurs (rôles `super_admin` / `store_admin`)
- ✅ Annuaire clients (historique et recherche)
- ✅ Réinitialisation de mot de passe admin (forgot/reset password)
- ✅ Reporting et statistiques

## 🛠️ Stack Technique

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Base de données**: PostgreSQL
- **Auth**: JWT
- **Email**: Brevo API (via fetch)
- **Calendar**: react-big-calendar + date-fns
- **ORM**: node-postgres (pg)

## 📋 Prérequis

- Node.js 18+
- PostgreSQL 14+ (local ou hébergé)
- npm ou yarn

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone https://github.com/bastien-at/app-rdv.git
cd app-rdv
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer la base de données

Créer une base de données PostgreSQL :

```bash
createdb bike_fitting_db
```

Exécuter les migrations :

```bash
cd backend
npm run migrate
```

### 4. Configurer les variables d'environnement

Copier le fichier `.env.example` vers `.env` et remplir les valeurs :

```bash
cp .env.example .env
```

Éditer `.env` avec vos configurations.

### 5. Charger les données de test (optionnel)

```bash
cd backend
npm run seed
```

Cela créera :

- 3 magasins fictifs (Paris, Lyon, Marseille)
- 3 services par magasin (Route, VTT, Triathlon)
- 2 techniciens par magasin
- Quelques réservations d'exemple

## 🏃 Lancement

### Mode développement

```bash
# Lancer frontend + backend simultanément
npm run dev
```

Ou séparément :

```bash
# Backend (port 3000)
npm run dev:backend

# Frontend (port 5173)
npm run dev:frontend
```

### Mode production

```bash
# Build
npm run build

# Start
npm run start
```

## 📁 Structure du projet

```
app-rdv/
├── frontend/                # Application React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages principales
│   │   ├── services/       # Services API
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # Types TypeScript
│   │   └── utils/          # Utilitaires
│   └── package.json
├── backend/                 # API Express + logique métier
│   ├── src/
│   │   ├── routes/         # Routes API
│   │   ├── controllers/    # Contrôleurs
│   │   ├── middleware/     # Middlewares
│   │   ├── utils/          # Utilitaires (email, auth, logger, etc.)
│   │   └── db/             # Migrations, seed et accès PostgreSQL
│   └── package.json
├── QUICKSTART.md            # Guide d'installation rapide
├── FUNCTIONAL_DOC.md        # Documentation fonctionnelle détaillée
├── DEPLOYMENT.md            # Notes de déploiement (Nixpacks, prod)
└── package.json             # Root package.json
```

## 🔌 API Endpoints

### Public

```
GET    /api/stores                                    - Liste des magasins
GET    /api/stores/:id/services                       - Services d'un magasin
GET    /api/stores/:id/availability                   - Créneaux disponibles
POST   /api/bookings                                  - Créer une réservation
GET    /api/bookings/:token                           - Détails réservation
PUT    /api/bookings/:token                           - Modifier réservation
DELETE /api/bookings/:token                           - Annuler réservation
```

### Admin (authentifié)

```
POST   /api/admin/login                               - Connexion admin
GET    /api/admin/stores/:id/bookings                 - Réservations d'un magasin
PUT    /api/admin/bookings/:id/status                 - Changer statut réservation
POST   /api/admin/availability-blocks                 - Bloquer une plage horaire
DELETE /api/admin/availability-blocks/:id             - Supprimer un blocage
GET    /api/admin/stores/:id/stats                    - Statistiques magasin
```

## 🗄️ Schéma de base de données

Voir `backend/src/db/schema.sql` pour le schéma complet.

Tables principales :

- `stores` - Magasins
- `services` - Services proposés
- `technicians` - Techniciens
- `bookings` - Réservations
- `availability_blocks` - Blocages de créneaux
- `email_logs` - Logs des emails envoyés

## 📧 Configuration Email (Brevo)

Le système utilise Brevo (anciennement Sendinblue) pour l'envoi d'emails transactionnels :

- emails de confirmation de réservation
- rappels automatiques
- envoi du rapport d'état des lieux

1.  Créer un compte sur [Brevo](https://www.brevo.com/)
2.  Générer une clé API v3
3.  Ajouter les variables dans `.env` :

```env
BREVO_API_KEY=xkeysib-votre-cle-api
EMAIL_FROM=noreply@votre-domaine.com
```

Voir `backend/BREVO_SETUP.md` pour plus de détails.

## 🧪 Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📦 Déploiement

Le projet est pensé pour être déployé sur un PaaS (Railway, Render, Fly.io, etc.) avec une base PostgreSQL managée.

- Le frontend est une application Vite/React (dossier `frontend/`).
- Le backend est une API Node/Express (dossier `backend/`).

Pour des instructions détaillées (Nixpacks, variables d'environnement, exemples de config), voir :

- `DEPLOYMENT.md`
- `QUICKSTART.md`

## 🔐 Sécurité

- ✅ JWT pour l'authentification admin
- ✅ Token unique par réservation
- ✅ Rate limiting sur les endpoints sensibles
- ✅ Validation stricte des inputs (côté client et serveur)
- ✅ Protection CSRF
- ✅ Sanitization des données
- ✅ HTTPS en production

## 📝 Règles métier

- Délai minimum de réservation : 48h
- Fenêtre de réservation : 3 mois maximum
- Buffer entre créneaux : 15 minutes
- Lock de créneau pendant sélection : 10 minutes
- Pas de double booking
- Rappels automatiques J-2 et J-1

## 🎨 Design

- Mobile-first responsive
- Tailwind CSS pour le styling
- Composants réutilisables
- Design system cohérent
- Accessibilité (WCAG 2.1)

## 📊 Reporting

Le dashboard admin inclut :

- Taux de remplissage
- Taux de no-show
- CA généré
- Export CSV des réservations

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT

## 👥 Support

Pour toute question : support@alltricks.com
