import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: Request) {
  try {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    twiml.say(
      { voice: 'alice', language: 'fr-FR' },
      "Bienvenue chez Serrurier Express Belgique. Nous allons vous aider. Veuillez indiquer votre nom, votre adresse complète et décrire votre problème après le bip. Un technicien interviendra immédiatement."
    );

    twiml.record({
      recordingStatusCallback: '/api/webhooks/twilio/recording',
      recordingStatusCallbackMethod: 'POST',
      recordingStatusCallbackEvent: ['completed'],
      playBeep: true,
      maxLength: 120,
    });

    twiml.say(
      { voice: 'alice', language: 'fr-FR' },
      "Nous n'avons pas reçu d'enregistrement. Au revoir."
    );

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error generating TwiML:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
