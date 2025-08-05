// netlify/functions/validate-user.js
// Fonction Netlify pour valider les emails des utilisateurs depuis l'extension

console.log('🔍 Fonction validate-user initialisée');

// ===== BASE DE DONNÉES UTILISATEURS =====
// En synchronisation avec la base principale du site
const validUsers = {
    'admin@hermestool.com': {
        email: 'admin@hermestool.com',
        firstName: 'Admin',
        lastName: 'Hermès',
        plan: 'Archon',
        isActive: true,
        createdAt: '2024-01-01',
        extensionEnabled: true
    },
    'shinolegrandieu@gmail.com': {
        email: 'shinolegrandieu@gmail.com',
        firstName: 'Shino',
        lastName: 'Le Grandieu',
        plan: 'Archon',
        isActive: true,
        createdAt: '2025-08-05',
        extensionEnabled: true,
        realAccount: true
    },
    'collabwilly@gmail.com': {
        email: 'collabwilly@gmail.com',
        firstName: 'Willy',
        lastName: 'Collab',
        plan: 'Métrios',
        isActive: true,
        createdAt: '2025-08-05',
        extensionEnabled: true
    },
    'test@hermestool.com': {
        email: 'test@hermestool.com',
        firstName: 'Test',
        lastName: 'User',
        plan: 'Néophyte',
        isActive: true,
        createdAt: '2025-08-05',
        extensionEnabled: true
    }
};

// ===== FONCTION PRINCIPALE =====
exports.handler = async (event, context) => {
    console.log('📡 Validation user request:', event.httpMethod);
    
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Gestion CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS OK' })
        };
    }
    
    // Seules les requêtes POST sont acceptées
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                valid: false,
                error: 'Method not allowed' 
            })
        };
    }
    
    try {
        // Parser les données de la requête
        const { email, source } = JSON.parse(event.body);
        
        console.log('🔍 Validation demandée pour:', email, 'depuis:', source);
        
        // Validation de base
        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'Email requis'
                })
            };
        }
        
        if (!isValidEmail(email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'Format email invalide'
                })
            };
        }
        
        // Vérifier si l'utilisateur existe dans la base
        const user = validUsers[email.toLowerCase()];
        
        if (!user) {
            console.log('❌ Utilisateur non trouvé:', email);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'Utilisateur non trouvé',
                    message: 'Cet email n\'est pas associé à un compte Hermès Tool actif'
                })
            };
        }
        
        if (!user.isActive) {
            console.log('❌ Compte inactif:', email);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'Compte inactif',
                    message: 'Ce compte est désactivé'
                })
            };
        }
        
        if (!user.extensionEnabled) {
            console.log('❌ Extension non autorisée:', email);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'Extension non autorisée',
                    message: 'L\'extension n\'est pas activée pour ce compte'
                })
            };
        }
        
        // Validation réussie
        console.log('✅ Utilisateur validé:', email, '- Plan:', user.plan);
        
        // Logger l'activité
        logValidationActivity(email, source, true);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                valid: true,
                user: {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    plan: user.plan,
                    features: getPlanFeatures(user.plan)
                },
                message: 'Utilisateur validé avec succès'
            })
        };
        
    } catch (error) {
        console.error('❌ Erreur validation:', error);
        
        // Logger l'erreur
        logValidationActivity(null, 'unknown', false, error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                valid: false,
                error: 'Erreur serveur',
                message: 'Une erreur est survenue lors de la validation'
            })
        };
    }
};

// ===== FONCTIONS UTILITAIRES =====
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
            maxItems: -1, // Illimité
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

function logValidationActivity(email, source, success, error = null) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'user_validation',
        email: email || 'unknown',
        source: source || 'unknown',
        success: success,
        error: error,
        ip: getClientIP(),
        userAgent: getUserAgent()
    };
    
    console.log('📝 Validation Log:', JSON.stringify(logEntry));
    
    // En production, sauvegarder dans un système de logs
    // (CloudWatch, DataDog, LogFlare, etc.)
}

function getClientIP() {
    // En production, récupérer depuis les headers Netlify
    return 'unknown';
}

function getUserAgent() {
    // En production, récupérer depuis les headers
    return 'chrome-extension';
}

// ===== MONITORING =====
function trackValidationMetrics(email, plan, success) {
    // En production, envoyer des métriques vers un service de monitoring
    console.log('📊 Validation metrics:', {
        email: email,
        plan: plan,
        success: success,
        timestamp: new Date().toISOString()
    });
}

console.log('✅ Fonction validate-user prête - ' + Object.keys(validUsers).length + ' utilisateurs configurés');