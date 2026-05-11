import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: Request) {
  try {
    // Récupération des données envoyées depuis le frontend
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Paramètres manquants (to, message)' }, { status: 400 });
    }

    // Récupération des clés secrètes depuis .env.local
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      console.error('Clés Twilio manquantes dans .env.local');
      return NextResponse.json({ error: 'Erreur de configuration serveur' }, { status: 500 });
    }

    // Initialisation du client Twilio
    const client = twilio(accountSid, authToken);

    // Envoi du SMS réel via l'API Twilio
    const twilioResponse = await client.messages.create({
      body: message,
      from: fromPhone,
      to: to
    });

    console.log(`✅ SMS envoyé avec succès! SID: ${twilioResponse.sid}`);
    return NextResponse.json({ success: true, messageId: twilioResponse.sid }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Erreur Twilio:', error);
    return NextResponse.json({ error: error.message || 'Échec de l\'envoi du SMS' }, { status: 500 });
  }
}
