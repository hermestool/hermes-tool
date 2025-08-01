const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  console.log('🚀 Fonction appelée - Method:', event.httpMethod);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY manquante');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Configuration Stripe manquante' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { priceId, customerEmail, customerName, plan, userData } = data;
    
    console.log('📊 Données:', { priceId, customerEmail, plan });

    if (!priceId || !customerEmail || !plan) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Données manquantes' })
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
