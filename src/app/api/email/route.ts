import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { clientName, message, pdfBase64 } = await req.json();

    if (!clientName || !pdfBase64) {
      return NextResponse.json({ success: false, error: 'Paramètres manquants.' }, { status: 400 });
    }

    // Configuration de Nodemailer avec Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"MAP BELGIQUE" <${process.env.GMAIL_USER}>`,
      to: 'testbelgiqueserrure@gmail.com', // Adresse de réception
      subject: `MAP BELGIQUE - Devis d'intervention pour ${clientName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 8px;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">MAP BELGIQUE - Expertise & Sécurité Mobile</h2>
          <p style="color: #334155; font-size: 16px;">Bonjour <strong>${clientName}</strong>,</p>
          <p style="color: #334155; font-size: 16px;">${message}</p>
          <p style="color: #334155; font-size: 16px;">Vous trouverez votre devis complet en pièce jointe au format PDF.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">L'équipe MAP BELGIQUE</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 5px;">Serrurerie - Alarme - Contrôle d'accès | Bruxelles</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Devis_${clientName.replace(/\s+/g, '_')}.pdf`,
          content: pdfBase64,
          encoding: 'base64'
        },
      ],
    };

    // Envoi de l'e-mail
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email envoyé via Gmail à testbelgiqueserrure@gmail.com pour ${clientName} (ID: ${info.messageId})`);

    return NextResponse.json({ success: true, messageId: info.messageId }, { status: 200 });
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'e-mail avec Gmail :", error);
    return NextResponse.json({ success: false, error: error.message || "Échec de l'envoi de l'e-mail." }, { status: 500 });
  }
}


