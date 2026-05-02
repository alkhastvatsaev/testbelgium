import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Génère un devis PDF minimaliste et élégant pour la serrurerie.
 * Design conçu pour s'intégrer dans l'écosystème premium de l'application.
 */
export const generateLocksmithQuote = (clientName: string, returnBase64: boolean = false): string | void => {
  const doc = new jsPDF();
  
  // Configuration des couleurs (Slate & Blue)
  const colors: { [key: string]: [number, number, number] } = {
    primary: [15, 23, 42],   // Slate 900
    secondary: [71, 85, 105], // Slate 600
    accent: [37, 99, 235],    // Blue 600
    light: [248, 250, 252],   // Slate 50
    border: [226, 232, 240]   // Slate 200
  };

  // --- HEADER ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("MAP BELGIQUE", 20, 25);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.text("EXPERTISE & SÉCURITÉ MOBILE", 20, 31);
  doc.text("Serrurerie - Alarme - Contrôle d'accès", 20, 35);

  // Numéro de devis et Date (Aligné à droite)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("DEVIS N° 2026-0042", 130, 25);
  
  // Badge IA Premium (Décalé à droite pour éviter l'overlap)
  doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.roundedRect(178, 20, 14, 6, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text("IA SMART", 179.5, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.text(`Émis le: ${new Date().toLocaleDateString('fr-FR')}`, 130, 31);
  doc.text("Validité: 30 jours", 130, 35);

  // Ligne de séparation
  doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
  doc.setLineWidth(0.5);
  doc.line(20, 45, 190, 45);

  // --- CLIENT & PRESTATION ---
  // Client (Gauche)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("DESTINATAIRE", 20, 55);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const splitName = doc.splitTextToSize(clientName, 80);
  doc.text(splitName, 20, 62);
  doc.setFontSize(9);
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  const nameHeight = (splitName.length * 5); // Estimation simple de la hauteur
  doc.text("Bruxelles, Belgique", 20, 62 + nameHeight);

  // Prestation (Droite)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("INTERVENTION", 110, 55);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Dépannage d'urgence - Serrurerie", 110, 62);
  doc.setFontSize(9);
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.text("Ouverture de porte & Sécurisation", 110, 67);

  // --- TABLEAU DES PRESTATIONS ---
  autoTable(doc, {
    startY: 85,
    head: [['Description des prestations', 'Qté', 'Prix Unit. HT', 'Total HT']],
    body: [
      ['Forfait Ouverture de porte (Porte claquée)', '1', '110.00 €', '110.00 €'],
      ['Déplacement urgent (Zone Bruxelles-Capitale)', '1', '45.00 €', '45.00 €'],
      ['Cylindre de sécurité européen (Standard)', '1', '65.00 €', '65.00 €'],
    ],
    headStyles: {
      fillColor: colors.primary,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      textColor: colors.secondary,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: 20, right: 20 },
    theme: 'striped',
    alternateRowStyles: {
      fillColor: [250, 251, 252]
    }
  });

  // --- TOTALS ---
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  const pageHeight = doc.internal.pageSize.height;
  
  // Vérification de l'espace disponible pour les totaux (besoin d'environ 50mm)
  if (finalY > pageHeight - 70) {
    doc.addPage();
    finalY = 35; // Recommencer plus haut sur la nouvelle page
  }

  const rightAlignX = 195;
  const labelX = 90; // Décalé encore plus à gauche pour garantir aucun overlap

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.text("Total Hors Taxes:", labelX, finalY);
  doc.text("220.00 €", rightAlignX, finalY, { align: "right" });
  
  doc.text("TVA (6%):", labelX, finalY + 8);
  doc.text("13.20 €", rightAlignX, finalY + 8, { align: "right" });

  // Ligne de total
  doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
  doc.setLineWidth(0.2);
  doc.line(labelX, finalY + 12, rightAlignX, finalY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.text("MONTANT TOTAL TTC:", labelX, finalY + 20);
  doc.text("233.20 €", rightAlignX, finalY + 20, { align: "right" });

  // --- FOOTER ---
  // Positionner le footer par rapport au bas de la page
  const footerY = pageHeight - 30;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.text("Notes: Devis gratuit réalisé via l'IA MAP Belgique.", 20, footerY + 5);
  doc.text("En cas d'acceptation, merci de signer et de renvoyer ce document.", 20, footerY + 10);
  
  // Petit Badge IA en filigrane discret
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(colors.border[0], colors.border[1], colors.border[2]);
  doc.text("DOCUMENT GÉNÉRÉ PAR L'INTELLIGENCE ARTIFICIELLE MAP BELGIQUE", 105, footerY + 15, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.text("MAP BELGIQUE - BE 0123.456.789 - www.mapbelgique.be", 105, footerY + 20, { align: "center" });

  if (returnBase64) {
    const dataUri = doc.output('datauristring');
    // datauristring looks like: data:application/pdf;filename=generated.pdf;base64,JVBERi0xLjMKJcTl8uXrp/Og...
    return dataUri.split(',')[1];
  } else {
    // Sauvegarde
    doc.save(`Devis_${clientName.replace(/\s+/g, '_')}.pdf`);
  }
};
