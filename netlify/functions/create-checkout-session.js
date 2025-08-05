const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // 🚀 LOGS POUR DÉBUGGER
  console.log('=== FONCTION NETLIFY APPELÉE ===');
  console.log('📨 Méthode:', event.httpMethod);
  console.log('🌐 Path:', event.path);
  console.log('🔑 Stripe key présente:', !!process.env.STRIPE_SECRET_KEY);
  console.log('🌍 SITE_URL env:', process.env.SITE_URL);
  
  // Gérer CORS pour permettre les requêtes depuis ton site
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'  // ← AJOUTÉ pour être sûr
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Requête OPTIONS - CORS OK');
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    console.log('❌ Méthode non autorisée:', event.httpMethod);
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // 🔍 VÉRIFICATION STRIPE KEY
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY manquante !');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Configuration Stripe manquante' })
    };
  }

  try {
    console.log('📝 Body reçu:', event.body);
    
    // 🛡️ VÉRIFICATION BODY
    if (!event.body) {
      console.error('❌ Body vide');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Données manquantes' })
      };
    }

    const { priceId, customerEmail, customerName, plan, userData } = JSON.parse(event.body);
    
    console.log('📊 Données parsées:', { priceId, customerEmail, customerName, plan });

    // 🔍 VÉRIFICATION DONNÉES
    if (!priceId || !customerEmail || !plan) {
      console.error('❌ Données requises manquantes');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Données requises manquantes' })
      };
    }

    console.log('💳 Création session Stripe...');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      customer_email: customerEmail,
      success_url: `${process.env.SITE_URL || 'https://hermes-tool.com'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'https://hermes-tool.com'}/cancel.html`,
      metadata: {
        plan: plan,
        customerName: customerName,
        userData: JSON.stringify(userData)
      }
    });

    console.log('✅ Session Stripe créée avec succès:', session.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id: session.id })
    };

  } catch (error) {
    console.error('❌ ERREUR COMPLÈTE:', error);
    console.error('❌ Message:', error.message);
    console.error('❌ Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Voir les logs Netlify pour plus de détails'
      })
    };
  }
};const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  console.log('🚀 Fonction Netlify appelée');
  
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gestion CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  // Vérifier la clé Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Clé Stripe manquante' })
    };
  }

  try {
    const { priceId, customerEmail, customerName, plan, userData } = JSON.parse(event.body || '{}');
    
    console.log('📊 Données:', { priceId, customerEmail, plan });

    if (!priceId || !customerEmail || !plan) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Données manquantes' })
      };
    }

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      customer_email: customerEmail,
      success_url: `https://hermes-tool.com/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://hermes-tool.com/cancel.html`,
      metadata: {
        plan: plan,
        customerName: customerName,
        userData: JSON.stringify(userData)
      }
    });

    console.log('✅ Session créée:', session.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id: session.id })
    };

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};