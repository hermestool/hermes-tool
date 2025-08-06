// netlify/functions/auth-extension.js
// Authentification unifiée pour l'extension

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
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        const { action, email, password, token } = JSON.parse(event.body);
        
        switch(action) {
            case 'login':
                return await handleLogin(email, password, headers);
                
            case 'verify-token':
                return await verifyToken(token, headers);
                
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
    // Base de données temporaire (même que validate-user.js)
    const validUsers = {
        'admin@hermestool.com': {
            password: 'admin123',
            plan: 'Archon',
            firstName: 'Admin',
            lastName: 'Hermès'
        },
        'shinolegrandieu@gmail.com': {
            password: 'Micromania1@',
            plan: 'Archon',
            firstName: 'Shino',
            lastName: 'Le Grandieu'
        },
        'collabwilly@gmail.com': {
            password: 'willy123',
            plan: 'Métrios',
            firstName: 'Willy',
            lastName: 'Collab'
        },
        'test@hermestool.com': {
            password: 'test123',
            plan: 'Néophyte',
            firstName: 'Test',
            lastName: 'User'
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
    
    // Générer un token qui dure 30 jours
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
                lastName: user.lastName,
                plan: user.plan,
                features: getPlanFeatures(user.plan)
            }
        })
    };
}

async function verifyToken(token, headers) {
    if (!token) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Token manquant' 
            })
        };
    }
    
    const decoded = decodeToken(token);
    
    if (!decoded || !decoded.email) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Token invalide ou expiré' 
            })
        };
    }
    
    // Pour l'instant on retourne des données statiques
    // En prod : récupérer depuis la BDD
    const userData = {
        'admin@hermestool.com': { plan: 'Archon', firstName: 'Admin' },
        'shinolegrandieu@gmail.com': { plan: 'Archon', firstName: 'Shino' },
        'collabwilly@gmail.com': { plan: 'Métrios', firstName: 'Willy' },
        'test@hermestool.com': { plan: 'Néophyte', firstName: 'Test' }
    };
    
    const user = userData[decoded.email];
    
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Utilisateur non trouvé' 
            })
        };
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            user: {
                email: decoded.email,
                firstName: user.firstName,
                plan: user.plan,
                features: getPlanFeatures(user.plan)
            }
        })
    };
}

function generateLongLivedToken(email) {
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 jours
    const random = Math.random().toString(36).substr(2, 9);
    const data = `${email}:${expiresAt}:${random}`;
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
    const features = {
        'Néophyte': {
            maxItems: 100,
            autoRepost: true,
            basicAnalytics: true,
            emailSupport: true,
            aiMessages: false,
            multiAccounts: false,
            prioritySupport: false
        },
        'Métrios': {
            maxItems: 500,
            autoRepost: true,
            basicAnalytics: true,
            advancedAnalytics: true,
            emailSupport: true,
            aiMessages: true,
            imageGeneration: true,
            multiAccounts: false,
            prioritySupport: true
        },
        'Archon': {
            maxItems: -1,
            autoRepost: true,
            basicAnalytics: true,
            advancedAnalytics: true,
            emailSupport: true,
            aiMessages: true,
            imageGeneration: true,
            multiAccounts: true,
            prioritySupport: true,
            apiAccess: true,
            customAutomation: true
        }
    };
    
    return features[plan] || features['Néophyte'];
}