// netlify/functions/auth-extension.js
// Authentification unifiée pour l'extension

const { MongoClient } = require('mongodb'); // ou autre BDD

// En dev, on utilise un objet simple (sera remplacé par MongoDB en prod)
let usersDatabase = {};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        const { action, email, password, token } = JSON.parse(event.body);
        
        switch(action) {
            case 'login':
                return await handleLogin(email, password, headers);
                
            case 'verify-token':
                return await verifyToken(token, headers);
                
            case 'register':
                return await handleRegister(email, password, headers);
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Action invalide' })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function handleLogin(email, password, headers) {
    // Ici, connecter à la vraie BDD
    // Pour l'instant, on simule avec les users de base
    const validUsers = {
        'admin@hermestool.com': {
            password: 'admin123',
            plan: 'Archon',
            firstName: 'Admin'
        },
        'shinolegrandieu@gmail.com': {
            password: 'Micromania1@',
            plan: 'Archon',
            firstName: 'Shino'
        }
    };
    
    const user = validUsers[email?.toLowerCase()];
    
    if (!user || user.password !== password) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Email ou mot de passe incorrect' 
            })
        };
    }
    
    // Générer un token qui dure longtemps
    const token = generateLongLivedToken(email);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            token: token,
            user: {
                email: email,
                firstName: user.firstName,
                plan: user.plan,
                features: getPlanFeatures(user.plan)
            }
        })
    };
}

async function verifyToken(token, headers) {
    // Vérifier si le token est valide
    const decoded = decodeToken(token);
    
    if (!decoded || !decoded.email) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Token invalide' 
            })
        };
    }
    
    // Récupérer les infos user depuis la BDD
    // Pour l'instant on simule
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            user: {
                email: decoded.email,
                plan: 'Archon', // À récupérer de la BDD
                firstName: 'User' // À récupérer de la BDD
            }
        })
    };
}

function generateLongLivedToken(email) {
    // Token qui dure 30 jours
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
    const data = `${email}:${expiresAt}:${Math.random().toString(36).substr(2)}`;
    return Buffer.from(data).toString('base64');
}

function decodeToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [email, expiresAt] = decoded.split(':');
        
        if (Date.now() > parseInt(expiresAt)) {
            return null; // Token expiré
        }
        
        return { email };
    } catch {
        return null;
    }
}

function getPlanFeatures(plan) {
    // Mêmes features que dans validate-user.js
    return {
        'Archon': {
            unlimited: true,
            aiMessages: true,
            multiAccounts: true
        }
        // etc...
    }[plan];
}