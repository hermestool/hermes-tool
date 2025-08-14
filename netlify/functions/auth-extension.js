// netlify/functions/auth-extension.js
// Authentification unifiée pour l'extension Chrome

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
        
        console.log('🔐 Auth request:', action, email ? '✓' : '✗');
        
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
        console.error('❌ Erreur auth:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function handleLogin(email, password, headers) {
    // Base de données temporaire unifiée
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
        console.log('❌ Auth failed for:', email);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Email ou mot de passe incorrect' 
            })
        };
    }
    
    // Générer un token unique
    const token = generateToken(email);
    
    console.log('✅ Auth success for:', email);
    
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
                userId: Buffer.from(email).toString('base64'),
                tokenCreatedAt: new Date().toISOString(),
                features: getPlanFeatures(user.plan)
            }
        })
    };
}

async function verifyToken(token, headers) {
    if (!token) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Token manquant' 
            })
        };
    }
    
    try {
        const decoded = decodeToken(token);
        
        if (!decoded || !decoded.email || decoded.expired) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Token invalide ou expiré' 
                })
            };
        }
        
        console.log('✅ Token valid for:', decoded.email);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                email: decoded.email
            })
        };
        
    } catch (error) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Token invalide' 
            })
        };
    }
}

function generateToken(email) {
    const timestamp = Date.now();
    const expiry = timestamp + (30 * 24 * 60 * 60 * 1000); // 30 jours
    const random = Math.random().toString(36).substr(2, 15);
    const data = `${email}|${timestamp}|${expiry}|${random}`;
    return Buffer.from(data).toString('base64');
}

function decodeToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [email, timestamp, expiry] = decoded.split('|');
        
        const now = Date.now();
        const expired = now > parseInt(expiry);
        
        return { email, timestamp, expiry, expired };
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
            emailSupport: true
        },
        'Métrios': {
            maxItems: 500,
            autoRepost: true,
            advancedAnalytics: true,
            aiMessages: true,
            prioritySupport: true
        },
        'Archon': {
            maxItems: -1,
            autoRepost: true,
            advancedAnalytics: true,
            aiMessages: true,
            multiAccounts: true,
            apiAccess: true,
            prioritySupport: true
        }
    };
    
    return features[plan] || features['Néophyte'];
}