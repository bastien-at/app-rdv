# 🗄️ Configuration Supabase

Ce guide vous explique comment configurer Supabase pour l'application Bike Fitting Booking.

## 📋 Prérequis

- Un compte Supabase (gratuit) : https://supabase.com

## 🚀 Étapes de configuration

### 1. Créer un projet Supabase

1. Connectez-vous sur https://supabase.com
2. Cliquez sur **"New Project"**
3. Remplissez les informations :
   - **Name** : `bike-fitting-booking`
   - **Database Password** : Choisissez un mot de passe fort (notez-le !)
   - **Region** : Choisissez la région la plus proche (ex: `West EU (Ireland)`)
4. Cliquez sur **"Create new project"**
5. Attendez ~2 minutes que le projet soit créé

### 2. Récupérer la DATABASE_URL

1. Dans votre projet Supabase, allez dans **Settings** (icône ⚙️)
2. Cliquez sur **Database** dans le menu latéral
3. Scrollez jusqu'à **Connection string**
4. Sélectionnez l'onglet **URI**
5. Copiez la chaîne de connexion (elle ressemble à ça) :
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. Remplacez `[YOUR-PASSWORD]` par le mot de passe que vous avez choisi à l'étape 1

### 3. Configurer le fichier .env

1. À la racine du projet, copiez `.env.example` vers `.env` :

   ```bash
   cp .env.example .env
   ```

2. Éditez le fichier `.env` et remplacez `DATABASE_URL` :
   ```env
   DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

### 4. Créer les tables (2 options)

#### Option A : Via le script de migration (recommandé)

```bash
cd backend
npm install
npm run migrate
```

#### Option B : Via l'éditeur SQL de Supabase

1. Dans Supabase, allez dans **SQL Editor** (icône 📝)
2. Cliquez sur **"New query"**
3. Copiez tout le contenu du fichier `backend/src/db/schema.sql`
4. Collez-le dans l'éditeur
5. Cliquez sur **"Run"** (ou Ctrl+Enter)

### 5. Charger les données de test

```bash
cd backend
npm run seed
```

Cela va créer :

- 3 magasins (Paris, Lyon, Marseille)
- 3 services par magasin (Route, VTT, Triathlon)
- 2 techniciens par magasin
- 4 comptes admin
- 1 réservation d'exemple

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. Dans Supabase, allez dans **Table Editor**
2. Vous devriez voir toutes les tables :

   - `stores`
   - `services`
   - `technicians`
   - `bookings`
   - `availability_blocks`
   - `booking_locks`
   - `email_logs`
   - `admins`

3. Cliquez sur `stores`, vous devriez voir 3 magasins

## 🔐 Sécurité (Important !)

### Row Level Security (RLS)

Par défaut, Supabase active le RLS. Pour cette application backend, nous utilisons des connexions directes via l'API Node.js, donc vous pouvez :

**Option 1 : Désactiver le RLS (développement)**

Pour chaque table, exécutez dans le SQL Editor :

```sql
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE technicians DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_locks DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
```

**Option 2 : Configurer des politiques RLS (production)**

Si vous voulez utiliser RLS, créez des politiques adaptées. Exemple pour la table `stores` :

```sql
-- Lecture publique des magasins
CREATE POLICY "Public stores are viewable by everyone"
ON stores FOR SELECT
USING (active = true);

-- Modification uniquement par service role
CREATE POLICY "Service role can do everything"
ON stores
USING (auth.role() = 'service_role');
```

## 🌐 Variables d'environnement Supabase (optionnel)

Si vous voulez utiliser les fonctionnalités client Supabase (Auth, Storage, etc.) :

```env
# Supabase (optionnel - pour features avancées)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Vous les trouvez dans : **Settings > API**

## 📊 Monitoring

Supabase offre des outils de monitoring gratuits :

- **Database** : Voir les connexions actives, la taille de la DB
- **Logs** : Voir les requêtes SQL exécutées
- **Reports** : Statistiques d'utilisation

## 🆘 Dépannage

### Erreur "connection refused"

- Vérifiez que votre DATABASE_URL est correcte
- Vérifiez que le mot de passe ne contient pas de caractères spéciaux non échappés
- Vérifiez que votre IP n'est pas bloquée (Supabase autorise toutes les IPs par défaut)

### Erreur "permission denied"

- Désactivez le RLS (voir section Sécurité ci-dessus)
- Ou configurez les bonnes politiques RLS

### Tables non créées

- Vérifiez les logs dans le SQL Editor
- Exécutez les requêtes une par une pour identifier l'erreur

## 🎯 Limites du plan gratuit

Le plan gratuit Supabase inclut :

- ✅ 500 MB de stockage database
- ✅ 2 GB de bande passante
- ✅ 50 000 utilisateurs actifs mensuels
- ✅ Projets illimités

Largement suffisant pour le développement et les petits projets !

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
