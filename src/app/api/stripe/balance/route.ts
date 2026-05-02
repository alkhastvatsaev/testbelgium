import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET() {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecret) {
      console.error('Clé Stripe manquante dans .env.local');
      return NextResponse.json({ error: 'Erreur de configuration serveur' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2026-04-22.dahlia', // Version de l'API par défaut
    });

    const balance = await stripe.balance.retrieve();

    // Stripe renvoie les montants dans la plus petite unité (ex: centimes pour l'euro)
    // Nous devons diviser par 100 pour avoir le montant en euros.
    
    // Le solde disponible immédiatement
    const available = balance.available.reduce((acc, curr) => acc + curr.amount, 0) / 100;
    
    // Le solde en cours de traitement (les paiements des dernières 48h)
    const pending = balance.pending.reduce((acc, curr) => acc + curr.amount, 0) / 100;

    // Chiffre d'affaires total réel (Disponible + En attente)
    const totalRevenue = available + pending;

    return NextResponse.json({ 
      success: true, 
      revenue: totalRevenue,
      available: available,
      pending: pending
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Erreur Stripe:', error);
    return NextResponse.json({ error: error.message || 'Impossible de récupérer le solde' }, { status: 500 });
  }
}
