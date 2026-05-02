# 🚀 DÉPLOIEMENT PRODUCTION : Tutoriel de Configuration Firebase

Ce document explique étape par étape comment configurer un tout nouveau compte Firebase de A à Z lorsque vous vendez l'application à un client ou que vous passez en production.

---

## ÉTAPE 1 : Créer le Projet et Récupérer les Clés
1. Allez sur [Firebase Console](https://console.firebase.google.com/).
2. Cliquez sur **Ajouter un projet** (Add project) et donnez-lui le nom de l'entreprise du client.
3. Désactivez Google Analytics (pas nécessaire pour l'instant) et cliquez sur **Créer le projet**.
4. Sur la page d'accueil du projet, cliquez sur l'icône **`</>`** (Web) pour ajouter une application Web.
5. Donnez-lui un nom (ex: `Dashboard Prod`) et cliquez sur **Enregistrer l'application**.
6. Firebase vous affiche un bloc de code avec des clés (`apiKey`, `authDomain`, etc.). Copiez ces clés.
7. Ouvrez votre fichier **`.env.local`** sur l'ordinateur/serveur et collez ces clés (remplacez les anciennes).
   *Note : N'oubliez pas de redémarrer le serveur (`npm run dev` ou redémarrer Vercel) après avoir modifié ce fichier.*

---

## ÉTAPE 2 : Activer la Base de Données (Firestore)
1. Dans le menu de gauche, cliquez sur **Firestore Database**.
2. Cliquez sur **Créer une base de données**.
3. Choisissez **Mode Production** ou **Mode Test** (le mode n'a pas d'importance car nous allons changer les règles à l'étape suivante).
4. Choisissez un serveur proche de votre client (ex: `europe-west1` pour la Belgique/France) et validez.

---

## ÉTAPE 3 : Sécuriser la Base de Données (Les Règles)
Par défaut, Firestore est bloqué. Il faut autoriser les utilisateurs connectés par SMS à lire et écrire.
1. Toujours dans **Firestore Database**, cliquez sur l'onglet **Règles** (Rules).
2. Remplacez tout le code par ceci :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
3. Cliquez sur **Publier** (Publish).

---

## ÉTAPE 4 : Créer la "Liste Blanche" (Patrons & Techniciens)
Pour empêcher les inconnus de se connecter, la base de données doit connaître les numéros autorisés.
1. Dans **Firestore Database**, cliquez sur l'onglet **Données** (Data).
2. Cliquez sur **+ Commencer une collection**.
3. **ID de la collection** : Tapez très exactement `allowed_users` (puis Suivant).
4. **ID du document** : Effacez le texte généré automatiquement et tapez le numéro du patron au format international (ex: `+33767693804` ou `+324...`). **Zéro espace !**
5. **Champ** : Tapez `role`.
6. **Type** : `string`.
7. **Valeur** : Tapez `admin`.
8. Cliquez sur **Enregistrer**.
*(Répétez les points 2 à 8 pour chaque technicien à l'avenir, en cliquant sur "Ajouter un document").*

---

## ÉTAPE 5 : Configurer le Paiement pour les SMS (Plan Blaze)
Pour que Google autorise l'envoi de SMS, il faut prouver son identité.
1. Regardez tout en bas du menu de gauche de Firebase.
2. Cliquez sur **Mettre à niveau** (Upgrade) à côté de "Plan Spark".
3. Choisissez le plan **Blaze** (Paiement à l'usage).
4. Liez une carte bancaire. *(Rappel : les 10 000 premiers SMS sont gratuits par mois aux US/Canada/Inde, mais en Europe cela coûte environ 0.05€ par SMS).*

---

## ÉTAPE 6 : Activer les SMS de Connexion
1. Dans le menu de gauche, cliquez sur **Authentication**.
2. Cliquez sur **Commencer** (Get Started).
3. Allez dans l'onglet **Mode de connexion** (Sign-in method).
4. Cliquez sur **Téléphone** (Phone) et cochez **Activer** (Enable).
5. Cliquez sur **Enregistrer** (Save).

---

## ÉTAPE 7 (CRUCIALE) : Autoriser la Belgique et la France
Si vous ne faites pas cette étape, Firebase bloquera tous les SMS.
1. Toujours dans **Authentication**, allez dans l'onglet **Paramètres** (Settings).
2. Cliquez sur **Régions autorisées pour les SMS** (SMS region policy).
3. Laissez sur "Autoriser".
4. Dans la liste déroulante, cochez les pays concernés par l'entreprise (ex: **Belgique (+32)** et **France (+33)**).
5. Enregistrez.

*(Optionnel pour les serveurs de tests locaux)*
Toujours dans les **Paramètres**, allez dans **Domaines autorisés** et assurez-vous que `localhost` est bien dans la liste, sinon le captcha ne marchera pas sur l'ordinateur de développement.

---

### 🎉 C'EST PRÊT !
L'application est totalement configurée et sécurisée. Vous pouvez vous connecter via l'interface !
