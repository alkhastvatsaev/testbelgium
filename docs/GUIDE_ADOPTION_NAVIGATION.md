# Mise en service — faire comprendre et utiliser BelgMap

Les narratifs (`STRATEGIE_EXECUTION.md`) décrivent **la valeur** ; ce fichier décrit **comment éviter** que personne ne s’en serve faute de repères. Le problème actuel : **un carrousel sans carte lisible** + des fonctionnalités **réparties sur 13 pages** sans parcours guidé.

---

## 1. Constats (pourquoi « ce n’est pas au point »)

| Facteur | Effet |
|--------|--------|
| Navigation quasi invisible | Seules les **flèches** bas gauche / droite changent de page ; pas de menu, pas de titres tant que l’UI ne les affiche pas. |
| Rôle utilisateur flou | Même shell pour tout le monde : **admin**, **technicien**, **client** voient le même carrousel sans **parcours par défaut**. |
| États techniques peu parlants | Messages du type `companyId`, Firestore, mode démo — compréhensibles aux devs, pas aux utilisateurs finaux. |
| Fonctions à moitié branchées | Certaines capacités sont **documentées** ou **partiellement codées** mais sans **checklist de complétude** visible pour le métier. |

---

## 2. Trois niveaux à mettre en parallèle

### A. Produit (compréhension immédiate)

1. **Titres de page** visibles en permanence (repère « où je suis » + « à quoi sert cet écran »).
2. **Hub ou sélection de rôle** après connexion : « Je suis technicien / admin bureau / client » → **saut** vers la bonne page du carrousel (sans interdire le reste).
3. **Liens « Étapes suivantes »** dans les panneaux clés (ex. page société → « Créer une demande » vers page 3 ; technicien → « Terminer une intervention » vers page 7).

### B. Guidage (première semaine d’usage)

4. **Tour léger** (une fois par utilisateur, stockage `localStorage`) : 4–5 étapes qui montrent flèches, page société, demande, technicien, back-office.
5. **États vides explicites** : au-delà de « aucune intervention », une phrase **métier** + bouton **« Aller à … »** qui appelle `setPageIndex`.
6. **Guide utilisateur court** (PDF ou page `/aide`) dérivé de **`EXEMPLES_SCENARIOS.md`**, sans jargon Firebase.

### C. Déploiement & formation

7. **Script de démo** de 10 minutes par persona (admin / tech / opérateur carte).
8. **Critères de « prêt à montrer »** par flux : ex. « Back-office utilisable » = tenant + au moins une intervention réelle + facturation derrière checklist documentée.
9. **Release notes** internes quand une page passe de placeholder à production-ready.

---

## 3. Ordre de mise en œuvre recommandé

| Priorité | Action | Effort |
|----------|--------|--------|
| **P0** | **Navigation** : bouton central **grille** (« Aller à… ») ouvrant la liste des **13 pages** avec saut direct (`setPageIndex`) — **sans** bandeau permanent sur la carte. | Faible |
| **P0** | Rédiger **1 paragraphe d’intro** en haut de chaque panneau métier important (société, demande, tech, back-office) — « À faire ici : … ». | Faible à moyen |
| **P1** | **Hub rôle** ou **raccourcis** persistés (dernière page utile par profil). | Moyen |
| **P1** | Export ou **page `/aide`** synthétisant `EXEMPLES_SCENARIOS.md` pour les humains non-devs. | Faible |
| **P2** | Tour guidé (lib type driver.js ou composant maison + `localStorage`). | Moyen |
| **P2** | Vidéos Loom / formations synchrones pour les premiers clients pilotes. | Hors code |

---

## 4. Lien avec la documentation existante

- **`EXEMPLES_SCENARIOS.md`** — source de vérité pour **parcours par numéro de page** ; à recycler en langage utilisateur.
- **`STRATEGIE_EXECUTION.md`** — ordre des prompts ; sert à dire « cette partie du narratif n’est pas encore livrée ».
- **`LOGIQUE_LESS_IS_MORE.md`** — garde-fous techniques ; ne remplace pas une **couche pédagogique** dans l’UI.

---

## 5. Critère de succès simple

Un nouvel utilisateur **sans accès au repo** doit pouvoir, en **moins de 5 minutes** :

1. Dire **sur quel écran** il se trouve et **à quoi il sert**.
2. Enchaîner **une** boucle métier documentée (ex. créer une demande → la voir au back-office), avec **un seul** appui formation si besoin.

*Tant que ce test échoue, les fonctionnalités « ajoutées » restent des capacités techniques, pas un produit au service des gens.*
