# 📘 Documentation Fonctionnelle - Bike Fitting Booking

Ce document décrit l'ensemble des fonctionnalités de l'application de réservation d'études posturales et d'atelier vélo.

---

## 👥 1. Espace Client (Front-Office)

L'interface client est conçue pour être simple, rapide et accessible sur mobile ("Mobile First").

### 📍 1.1 Recherche et Sélection de Magasin

- **Géolocalisation** : Le client peut se géolocaliser pour trouver les magasins les plus proches.
- **Recherche** : Recherche par nom de ville ou code postal.
- **Liste des magasins** : Affichage des magasins avec leur adresse, horaires d'ouverture et distance.
- **Sélection** : Le choix d'un magasin redirige vers son portail de réservation dédié.

### 📅 1.2 Prise de Rendez-vous

Le parcours de réservation se déroule en 4 étapes :

1.  **Choix du Service** :

    - Affichage des prestations (Étude posturale, Atelier mécanique, etc.).
    - Détail du prix et de la durée.
    - Filtrage par catégorie (Route, VTT, Triathlon).

2.  **Sélection du Créneau** :

    - Vue calendrier interactive.
    - Affichage des disponibilités en temps réel.
    - Les créneaux grisés sont indisponibles (déjà réservés, magasin fermé ou technicien absent).
    - _Note : Un créneau sélectionné est "verrouillé" temporairement pour éviter les doubles réservations._

3.  **Informations Client** :

    - Formulaire de contact (Nom, Prénom, Email, Téléphone).
    - Questionnaire spécifique au service (ex: Taille, Poids, Type de vélo, Douleurs éventuelles pour une étude posturale).

4.  **Confirmation** :
    - Récapitulatif de la demande.
    - Envoi immédiat d'un **email de réception de demande** (statut "En attente").

### 📧 1.3 Notifications et Suivi

Le client est informé par email à chaque étape :

- **Demande reçue** : Confirmation que la demande est bien enregistrée.
- **Réservation Confirmée** : Envoyé une fois que le magasin a validé le RDV. Contient un fichier `.ics` pour l'agenda.
- **Rappel de RDV** : Envoyé automatiquement 48h et 24h avant le rendez-vous.
- **Modification/Annulation** : Liens sécurisés présents dans les emails pour gérer sa réservation en autonomie.

---

## 🛠️ 2. Espace Administrateur (Back-Office)

L'interface d'administration permet aux gérants de magasin et techniciens de piloter l'activité.

### 📊 2.1 Tableau de Bord (Dashboard)

Vue synthétique de l'activité du magasin :

- **KPIs** : Nombre de RDV, Chiffre d'Affaires, Taux de remplissage.
- **Aujourd'hui** : Liste des rendez-vous de la journée avec statut (Confirmé, En cours, Terminé).
- **Alertes** : Demandes en attente de validation.

### 🗓️ 2.2 Gestion du Planning

- **Vue Agenda** : Calendrier hebdomadaire ou mensuel des réservations.
- **Disponibilités** :
  - Gestion des horaires d'ouverture du magasin.
  - Gestion des plannings des techniciens.
- **Blocages** : Possibilité de bloquer des créneaux manuellement (Absences, Réunions, Fermetures exceptionnelles).

### 📝 2.3 Gestion des Réservations

Pour chaque réservation, l'administrateur peut :

- **Voir les détails** : Informations client, coordonnées et réponses au questionnaire technique.
- **Changer le statut** :
  - _Valider_ : Déclenche l'email de confirmation.
  - _Refuser_ : Déclenche un email d'annulation avec motif.
  - _Terminer_ : Marque la prestation comme réalisée.
  - _No-Show_ : Client ne s'est pas présenté.
- **Modifier** : Changer l'heure, la date ou le technicien assigné.
- **Envoyer un rapport d'état des lieux** (réception) :
  - Saisie d'un compte rendu d'intervention (travaux effectués, pièces, recommandations, coûts).
  - Envoi d'un email dédié au client avec le récapitulatif détaillé.

### ⚙️ 2.4 Configuration du Magasin & des Prestations

- **Services globaux** : Catalogue centralisé de prestations (nom, prix, durée, type `workshop` / `fitting`).
- **Services par magasin** : Activation/désactivation des prestations par magasin à partir du catalogue global.
- **Techniciens** : Gestion de l'équipe (création, désactivation, assignation de compétences).
- **Paramètres** :
  - Gestion des informations générales (adresse, contact).
  - **Activation des services** : Choix des prestations proposées (Atelier et/ou Étude posturale).
  - **Capacité Atelier** : Configuration du nombre de créneaux simultanés (nombre de techniciens).
  - **Horaires** : Gestion des heures d'ouverture et fermeture.

### 📇 2.5 Annuaire Clients

- Recherche par nom, prénom, email ou téléphone.
- Accès à l'historique des rendez-vous d'un client.
- Consultation rapide des coordonnées et informations pertinentes.

### 👤 2.6 Gestion des Administrateurs & Rôles

- Rôles supportés :
  - `super_admin` : accès global à l'ensemble des magasins, gestion des administrateurs et des paramètres globaux.
  - `store_admin` : accès limité à un magasin (planning, prestations locales, clients associés).
- Création et mise à jour des comptes administrateurs (email, nom, rôle, magasin associé).
- Activation/désactivation d'un compte admin.
- **Réinitialisation de mot de passe** :
  - Fonctionnalité "mot de passe oublié" pour les admins.
  - Envoi d'un email sécurisé contenant un lien de réinitialisation.

---

## 🔄 3. Règles de Gestion Automatisées

- **Délai de réservation** : Impossible de réserver moins de 48h à l'avance (configurable).
- **Fenêtre de réservation** : Ouverture des créneaux sur 3 mois glissants.
- **Tampon** : Ajout automatique d'un temps de pause (buffer) de 15 min entre deux RDV.
- **Nettoyage** : Les demandes non finalisées (abandons) libèrent automatiquement les créneaux après 10 minutes.
