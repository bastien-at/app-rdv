# Configuration de Brevo (Sendinblue) pour l'envoi d'emails

## 📧 Qu'est-ce que Brevo ?

Brevo (anciennement Sendinblue) est une plateforme d'email marketing et transactionnel qui permet d'envoyer des emails de manière fiable et professionnelle.

## 🚀 Étapes de configuration

### 1. Créer un compte Brevo

1. Allez sur [https://www.brevo.com/](https://www.brevo.com/)
2. Cliquez sur "S'inscrire gratuitement"
3. Remplissez le formulaire d'inscription
4. Vérifiez votre email

### 2. Obtenir votre clé API

1. Connectez-vous à votre compte Brevo
2. Allez dans **Paramètres** (icône d'engrenage en haut à droite)
3. Cliquez sur **Clés API SMTP & API**
4. Cliquez sur **Créer une nouvelle clé API**
5. Donnez un nom à votre clé (ex: "Bike Fitting Production")
6. Copiez la clé API générée (vous ne pourrez plus la voir après)

### 3. Configurer l'adresse d'expéditeur

1. Dans Brevo, allez dans **Expéditeurs & IP**
2. Cliquez sur **Ajouter un expéditeur**
3. Entrez votre email (ex: `noreply@alltricks.com`)
4. Vérifiez l'email en cliquant sur le lien reçu

### 4. Configurer les variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
BREVO_API_KEY=votre_cle_api_brevo
EMAIL_FROM=noreply@alltricks.com
FRONTEND_URL=http://localhost:5173
```

### 5. Tester la configuration

Lancez le serveur et créez une réservation de test. Vous devriez recevoir un email de confirmation.

## 📊 Plan gratuit Brevo

Le plan gratuit de Brevo inclut :

- ✅ **300 emails/jour**
- ✅ API transactionnelle
- ✅ Templates d'emails
- ✅ Statistiques de base

Parfait pour le développement et les petits volumes !

## 🎨 Types d'emails envoyés

### 1. Email de confirmation

- Envoyé après la création d'une réservation
- Contient les détails du RDV
- Inclut un fichier .ics pour ajouter au calendrier
- Boutons "Modifier" et "Annuler"

### 2. Email d'annulation

- Envoyé après l'annulation d'une réservation
- Contient les détails de la réservation annulée
- Bouton "Prendre un nouveau rendez-vous"

### 3. Email de rappel (optionnel)

- Peut être envoyé 2 jours et 1 jour avant le RDV
- Rappelle les détails et ce qu'il faut apporter

## 🔧 Personnalisation des templates

Les templates HTML sont dans `src/utils/email.ts`. Vous pouvez les personnaliser :

- **Couleurs** : Modifiez les couleurs dans les styles CSS inline
- **Logo** : Ajoutez votre logo en haut des emails
- **Contenu** : Adaptez les textes selon vos besoins

## 🐛 Dépannage

### Erreur "Invalid API key"

- Vérifiez que `BREVO_API_KEY` est bien définie dans `.env`
- Vérifiez que la clé API est correcte (pas d'espaces)

### Emails non reçus

- Vérifiez les spams
- Vérifiez que l'adresse d'expéditeur est vérifiée dans Brevo
- Consultez les logs dans le dashboard Brevo

### Limite de 300 emails/jour dépassée

- Passez à un plan payant Brevo
- Ou attendez le lendemain (reset à minuit UTC)

## 📚 Documentation

- [Documentation Brevo API](https://developers.brevo.com/)
- [SDK Node.js Brevo](https://github.com/getbrevo/brevo-node)

## 💡 Conseils

1. **Testez en local** : Utilisez votre email personnel pour tester
2. **Surveillez les quotas** : Consultez régulièrement votre dashboard Brevo
3. **Logs** : Les erreurs d'envoi sont loggées dans la console du serveur
4. **Production** : Utilisez un domaine professionnel pour l'expéditeur
