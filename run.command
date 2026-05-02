#!/bin/bash
# Aller dans le dossier du script
cd "$(dirname "$0")"

echo "Démarrage du serveur BelgMap..."

# Attendre 2 secondes que le serveur se lance, puis ouvrir le navigateur
(sleep 2 && open http://localhost:3000) &

# Lancer le serveur Next.js
npm run dev
