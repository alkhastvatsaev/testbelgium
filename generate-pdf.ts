import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';

// Initialize jsPDF
const doc = new jsPDF();

// Define colors and styles
const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
const textColor: [number, number, number] = [51, 65, 85]; // Slate 700
const accentColor: [number, number, number] = [139, 92, 246]; // Violet

// Add Title
doc.setFont('helvetica', 'bold');
doc.setFontSize(24);
doc.setTextColor(...primaryColor);
doc.text('Rapport de Projet : Dispatch IA', 105, 20, { align: 'center' });

// Add Subtitle
doc.setFont('helvetica', 'normal');
doc.setFontSize(12);
doc.setTextColor(...textColor);
doc.text('Résumé des fonctionnalités principales de l\'application de gestion d\'interventions', 105, 30, { align: 'center' });

// Line break
doc.setLineWidth(0.5);
doc.setDrawColor(200, 200, 200);
doc.line(20, 35, 190, 35);

// Add Features Data
const features = [
  ['Cartographie 3D Interactive', 'Intégration de Mapbox GL JS avec suivi en temps réel de la flotte.'],
  ['Assistant IA Vocal', 'Transcription asynchrone via OpenAI Whisper & animation Waveform.'],
  ['Paiement & Facturation', 'Interface Tap-to-Pay (Stripe) et génération de devis PDF.'],
  ['Scanner AR', 'Réalité Augmentée pour analyser les serrures via caméra.'],
  ['Synchronisation Cloud', 'Architecture Serverless avec Firebase Firestore & Auth.'],
  ['Automatisations', 'Notifications SMS Twilio et intégration MacroDroid.']
];

// Add Table
autoTable(doc, {
  startY: 45,
  head: [['Fonctionnalité', 'Description']],
  body: features,
  theme: 'striped',
  headStyles: {
    fillColor: accentColor,
    textColor: 255,
    fontStyle: 'bold'
  },
  bodyStyles: {
    textColor: textColor
  },
  alternateRowStyles: {
    fillColor: [248, 250, 252]
  },
  margin: { top: 40, right: 20, bottom: 20, left: 20 },
  styles: {
    font: 'helvetica',
    fontSize: 11,
    cellPadding: 8
  }
});

// Save PDF
const pdfData = doc.output('arraybuffer');
fs.writeFileSync('rapport-fonctionnalites.pdf', Buffer.from(pdfData));
console.log('PDF généré avec succès : rapport-fonctionnalites.pdf');
