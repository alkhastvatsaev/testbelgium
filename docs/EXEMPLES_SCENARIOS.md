# Exemples de parcours — BelgMap (une fonctionnalité → un mini-scénario)

En **développement** (`npm run dev`), si Firebase n’est pas configuré ou sans projet joignable, un **mode démo** charge une société et des interventions fictives pour prévisualiser les écrans. Une bandeau « Mode démo » apparaît en haut du dashboard. Pour forcer l’ancien comportement (barrières login / données vides), définissez `NEXT_PUBLIC_DISABLE_DEV_UI_PREVIEW=true` dans `.env.local`.

Ce document donne **des exemples concrets** pour chaque zone majeure du dashboard (carrousel + carte). Les **liens logiques** entre pages sont indiqués quand un flux métier enchaîne naturellement plusieurs écrans.

**Convention** : *page humaine* = numéro tel qu’on le défile dans le carrousel (1 = carte plein écran, 2 = espace société, 3…8 = slots métier).

---

## Page 1 — Carte & couche « Galaxy »

**Exemple.** Un opérateur ouvre l’app : il voit la **carte Mapbox**, la recherche spotlight, l’horloge / mini-calendrier, le profil. Les **uploads audio** peuvent être traités en tâche de fond (`AutoProcessUploads`).  

**Lien logique.** Une transcription ou un fichier audio traité peut **créer ou pré-remplir une intervention** côté carte / Galaxy ; la même demande apparaîtra ensuite dans les listes **technicien** ou **back-office** si elle est enregistrée en Firestore avec le bon périmètre (`companyId`, droits).

---

## Page 2 — Espace entreprise (multi-sociétés)

**Exemple.** L’admin crée la société « Serrurerie Dupont », envoie une **invitation** à un collaborateur, vérifie que le **sélecteur de société active** et les **claims** (`bmTenants`) sont à jour après connexion.  

**Lien logique.** Tant qu’aucune société active n’est choisie, les formulaires **tenant** (page 3) ou le **back-office** (page 6) peuvent refuser l’envoi ou afficher une barrière. Les **interventions créées avec `companyId`** sont celles que le back-office et les alertes **doublons** voient pour cette société.

---

## Page 3 — Demande d’intervention « smart »

**Exemple.** Le client (ou l’opérateur) choisit un **modèle** (« Porte bloquée »), complète l’adresse, ajoute éventuellement des photos, envoie : une ligne **`pending`** est créée dans Firestore avec `createdByUid` et, si portail société, **`companyId`**.  

**Lien logique.** Si deux demandes très proches arrivent dans les 48 h (même adresse normalisée + texte du problème similaire), une **alerte doublon** peut être créée → visible **page 6** (bandeau) et **page 7** (liste).

---

## Page 4 — Authentification portail client

**Exemple.** Un utilisateur société ouvre la page : il suit la **connexion** (magic link / flux prévu par le panneau), récupère un profil portail client si applicable.  

**Lien logique.** Une fois authentifié et lié à une société, les actions suivantes (formulaire page 3, synchronisation des claims page 2) deviennent cohérentes pour un même utilisateur.

---

## Page 5 — Poste technicien (triptyque unique)

Une **seule page carrousel** regroupe tout le périmètre terrain :

| Zone | Contenu |
|------|---------|
| **Panneau gauche** | **Scan QR** dossier · **synchronisation hors ligne** |
| **Centre** | **Mes interventions** — filtres Aujourd’hui / Semaine / Toutes ; détail dossier ; QR du dossier ; planification (admin société) |
| **Panneau droit** | **Terminer l’intervention** (photos + signature) · **notifications push** · **facturation automatique** (règles / checklist) |

**Exemple.** **Thomas**, technicien connecté, lit ses missions au **centre**. Il ouvre un dossier → depuis le détail il peut **« Terminer l’intervention »** : le panneau droit fait défiler jusqu’au bloc clôture ; les photos et la signature y sont saisies.

**Exemple QR.** Thomas utilise le **panneau gauche** pour scanner un QR : il revient sur la **liste centrale** avec le dossier prêt à s’ouvrir (`pendingCaseId`).

**Exemple admin.** Connecté en **admin société** : même page ; blocs facture PDF et planification dans le **détail** au centre.

**Liens logiques.**

- Les créneaux posés depuis le détail apparaissent dans la vue **calendrier page 8** pour la même société.
- La **facturation auto** (panneau droit) s’appuie sur les statuts et pièces issues de la **clôture** (même page, colonne droite).
- Le **back-office** (page **6**) voit les statuts en temps réel sur les mêmes interventions.

---

## Page 6 — Back-office temps réel

**Exemple.** **Marie**, admin société, voit **toutes les interventions** de la société active avec **Firestore `onSnapshot`** ; elle filtre par date, technicien, statut. En haut : **résumé du jour**. Si un **doublon** est détecté à la création, un **bandeau ambre** propose **Fusionner** ou **Ignorer** (admin uniquement).  

**Exemple détail.** Elle clique une ligne : tiroir avec synthèse, **historique**, facture PDF si présente, bloc **planification** (même composant que sur le poste technicien pour les admins).  

**Liens logiques.**

- Les lignes viennent des **créations** page **3** (ou carte / audio) avec bon `companyId`.
- **Fusionner** un doublon supprime la **nouvelle** demande ; l’alerte se marque résolue → cohérent avec la liste page **7**.
- Créneaux posés ici alimentent la **page 8**.

---

## Page 7 — Alertes doublons

**Exemple.** Liste des alertes **ouvertes** pour la société ; mêmes actions **Fusionner / Ignorer** que dans la bannière page 6. Collaborateur : lecture seule des alertes, sans boutons d’action.  

**Lien logique.** Issue des **soumissions répétées** page **3** dans les **48 h** avec même adresse + problème ressemblant.

---

## Page 8 — Calendrier intégré

**Exemple.** Marie affiche le **mois** ou la **semaine** : seules les interventions avec **`scheduledDate` + `scheduledTime`** valides apparaissent.  

**Lien logique.** Les créneaux sont posés par un **admin** depuis le **détail** page **6** ou **5** ; les exports **Google / Outlook / `.ics`** utilisent ces champs.

---

## Tableau rapide « où faire quoi »

| Besoin | Page indicative |
|--------|------------------|
| Voir la carte / volumétrie globale | **1** |
| Gérer société, membres, claims | **2** |
| Créer une demande client rapide | **3** |
| Se connecter portail client | **4** |
| Technicien : missions, QR, hors-ligne, clôture, push, facturation auto | **5** (triptyque) |
| Piloter toutes les dossiers société | **6** |
| Traiter les doublons | **6** (bandeau) + **7** (liste) |
| Vue planning mensuelle / hebdo | **8** |

---

## Voir aussi

- **`STRATEGIE_EXECUTION.md`** — ordre des prompts et dépendances.
- **`LOGIQUE_LESS_IS_MORE.md`** — philosophie produit / technique du dépôt.
- **`CONTEXTE_ET_FEUILLE_DE_ROUTE.md`** — vision et backlog (si présent).

*À ajuster si tu renommes des pages ou ajoutes de nouveaux slots dans `page.tsx`.*
