# MAP BELGIQUE - Dashboard Intelligent de Gestion d'Interventions

Ce projet est une application Next.js premium dédiée à la gestion d'interventions techniques (serrurerie, etc.) à Bruxelles. Elle propose une interface fluide sous forme de carrousel permettant de basculer entre la vue cartographique, le hub société et le hub technicien.

## 🚀 Fonctionnalités Clés

- **Carte Interactive (Mapbox)** : Visualisation en temps réel des interventions, filtrage par date et accès rapide aux dossiers.
- **Hub Société** : Formulaire intelligent avec dictée vocale, géocodage inverse et portail client pour le suivi en direct.
- **Hub Technicien** : Gestion des missions assignées, capture de photos avant/après et signature électronique.
- **Mode Hors-ligne (PWA)** : Synchronisation automatique des données lors du retour de la connexion.
- **Multilingue** : Support complet du Français, Néerlandais et Anglais.

## 🛠 Tech Stack

- **Framework** : Next.js 14+ (App Router)
- **Langage** : TypeScript
- **Backend** : Firebase (Firestore, Auth, Storage, Functions)
- **Styling** : Tailwind CSS & Framer Motion (Animations Premium)
- **Cartographie** : Mapbox GL JS
- **State Management** : React Context & TanStack Query

## 📦 Installation

1. Cloner le dépôt.
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Configurer les variables d'environnement dans un fichier `.env.local` (voir `.env.example`).
4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```

## 🧪 Tests

Le projet suit une architecture de tests stricte (Jest + RTL) :
```bash
npm run test
```

## 🏗 Structure du Projet

- `src/features` : Modules fonctionnels isolés (map, backoffice, interventions, auth).
- `src/core` : Configuration de base, i18n, services partagés.
- `src/context` : Fournisseurs d'états globaux.
- `src/utils` : Utilitaires et helpers transverses.

---
Projet optimisé et nettoyé pour la production.
