// netlify/functions/vinted-sync.js
// Fonction Netlify pour recevoir et traiter les données de l'extension Chrome

console.log('🚀 Fonction Netlify vinted-sync initialisée');

// ===== BASE DE DONNÉES SIMULÉE =====
// En production, utiliser une vraie base de données (MongoDB, PostgreSQL, etc.)
let usersDatabase = {
    'admin@hermestool.com': {
        email: 'admin@hermestool.com',
        firstName: 'Admin',
        lastName: 'Hermès',
        plan: 'Archon',
        isActive: true,
        createdAt: '2024-01-01',
        lastSync: null,
        vintedData: null
    },
    'shinolegrandieu@gmail.com': {
        email: 'shinolegrandieu@gmail.com',
        firstName: 'Shino',
        lastName: 'Le Grandieu',  
        plan: 'Archon',
        isActive: true,
        createdAt: '2025-08-05',
        lastSync: null,
        vintedData: null
    },
    'collabwilly@gmail.com': {
        email: 'collabwilly@gmail.com',
        firstName: 'Willy',
        lastName: 'Collab',
        plan: 'Métrios',
        isActive: true,
        createdAt: '2025-08-05',
        lastSync: null,
        vintedData: null
    }
};

// ===== FONCTION PRINCIPALE =====
exports.handler = async (event, context) => {
    console.log('📡 Requête reçue:', event.httpMethod, event.path);
    
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Gestion des requêtes OPTIONS (CORS preflight)
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
                error: 'Method not allowed',
                message: 'Seules les requêtes POST sont acceptées'
            })
        };
    }
    
    try {
        // Parser le body
        const requestData = JSON.parse(event.body);
        console.log('📊 Données reçues:', {
            userEmail: requestData.userEmail,
            source: requestData.source,
            timestamp: requestData.timestamp,
            dataTypes: requestData.data ? Object.keys(requestData.data) : []
        });
        
        // Déterminer le type de requête
        if (requestData.action === 'validate-user') {
            return await handleUserValidation(requestData, headers);
        } else if (requestData.userEmail && requestData.data) {
            return await handleDataSync(requestData, headers);
        } else if (requestData.userEmail && requestData.action === 'get-data') {
            return await handleGetUserData(requestData, headers);
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid request',
                    message: 'Format de requête invalide'
                })
            };
        }
        
    } catch (error) {
        console.error('❌ Erreur traitement requête:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// ===== VALIDATION UTILISATEUR =====
async function handleUserValidation(requestData, headers) {
    try {
        const { email } = requestData;
        console.log('🔍 Validation utilisateur:', email);
        
        if (!email || !isValidEmail(email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    valid: false,
                    error: 'Email invalide'
                })
            };
        }
        
        // Vérifier si l'utilisateur existe et est actif
        const user = usersDatabase[email.toLowerCase()];
        const isValid = user && user.isActive;
        
        console.log(isValid ? '✅ Utilisateur valide' : '❌ Utilisateur non trouvé');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                valid: isValid,
                user: isValid ? {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    plan: user.plan
                } : null
            })
        };
        
    } catch (error) {
        console.error('❌ Erreur validation utilisateur:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                valid: false,
                error: 'Erreur serveur'
            })
        };
    }
}

// ===== SYNCHRONISATION DONNÉES =====
async function handleDataSync(requestData, headers) {
    try {
        const { userEmail, data, timestamp, source } = requestData;
        console.log('🔄 Synchronisation données pour:', userEmail);
        
        // Validation des données
        if (!userEmail || !data) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Données manquantes'
                })
            };
        }
        
        // Vérifier que l'utilisateur existe
        const user = usersDatabase[userEmail.toLowerCase()];
        if (!user || !user.isActive) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Utilisateur non trouvé'
                })
            };
        }
        
        // Traiter et sauvegarder les données
        const processedData = await processVintedData(data, userEmail);
        
        // Mettre à jour la base de données utilisateur
        user.vintedData = processedData;
        user.lastSync = timestamp || new Date().toISOString();
        user.syncSource = source || 'extension';
        
        console.log('✅ Données synchronisées:', {
            email: userEmail,
            items: processedData.items?.length || 0,
            sales: processedData.sales?.length || 0,
            messages: processedData.messages?.length || 0
        });
        
        // Calculer les statistiques
        const statistics = calculateUserStatistics(processedData);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Données synchronisées avec succès',
                syncedAt: user.lastSync,
                statistics: statistics,
                data: {
                    itemsCount: processedData.items?.length || 0,
                    salesCount: processedData.sales?.length || 0,
                    messagesCount: processedData.messages?.length || 0
                }
            })
        };
        
    } catch (error) {
        console.error('❌ Erreur synchronisation:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Erreur lors de la synchronisation',
                details: error.message
            })
        };
    }
}

// ===== RÉCUPÉRATION DONNÉES UTILISATEUR =====
async function handleGetUserData(requestData, headers) {
    try {
        const { userEmail } = requestData;
        console.log('📊 Récupération données pour:', userEmail);
        
        const user = usersDatabase[userEmail.toLowerCase()];
        if (!user || !user.isActive) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Utilisateur non trouvé'
                })
            };
        }
        
        // Retourner les données Vinted de l'utilisateur
        const responseData = {
            success: true,
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                plan: user.plan,
                lastSync: user.lastSync
            },
            data: user.vintedData || {
                items: [],
                sales: [],
                messages: [],
                statistics: {}
            }
        };
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(responseData)
        };
        
    } catch (error) {
        console.error('❌ Erreur récupération données:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Erreur serveur'
            })
        };
    }
}

// ===== TRAITEMENT DES DONNÉES VINTED =====
async function processVintedData(rawData, userEmail) {
    console.log('🔧 Traitement données Vinted...');
    
    const processedData = {
        user: rawData.user || {},
        items: [],
        sales: [],
        messages: [],
        statistics: rawData.statistics || {},
        processedAt: new Date().toISOString(),
        userEmail: userEmail
    };
    
    // Traiter les articles
    if (rawData.items && Array.isArray(rawData.items)) {
        processedData.items = rawData.items.map(item => ({
            ...item,
            userEmail: userEmail,
            processedAt: new Date().toISOString(),
            // Nettoyage et validation des données
            id: item.id || generateId(),
            title: cleanText(item.title),
            price: parsePrice(item.price),
            views: parseInt(item.views) || 0,
            likes: parseInt(item.likes) || 0
        }));
    }
    
    // Traiter les ventes
    if (rawData.sales && Array.isArray(rawData.sales)) {
        processedData.sales = rawData.sales.map(sale => ({
            ...sale,
            userEmail: userEmail,
            processedAt: new Date().toISOString(),
            id: sale.id || generateId(),
            price: parsePrice(sale.price),
            saleDate: sale.saleDate || sale.collectedAt
        }));
    }
    
    // Traiter les messages
    if (rawData.messages && Array.isArray(rawData.messages)) {
        processedData.messages = rawData.messages.map(message => ({
            ...message,
            userEmail: userEmail,
            processedAt: new Date().toISOString(),
            id: message.id || generateId()
        }));
    }
    
    console.log('✅ Données traitées:', {
        items: processedData.items.length,
        sales: processedData.sales.length,
        messages: processedData.messages.length
    });
    
    return processedData;
}

// ===== CALCUL DES STATISTIQUES =====
function calculateUserStatistics(data) {
    const stats = {
        totalItems: data.items?.length || 0,
        totalSales: data.sales?.length || 0,
        totalMessages: data.messages?.length || 0,
        totalViews: 0,
        totalLikes: 0,
        totalRevenue: 0,
        averagePrice: 0,
        calculatedAt: new Date().toISOString()
    };
    
    // Calculer les vues et likes totaux
    if (data.items) {
        stats.totalViews = data.items.reduce((sum, item) => sum + (parseInt(item.views) || 0), 0);
        stats.totalLikes = data.items.reduce((sum, item) => sum + (parseInt(item.likes) || 0), 0);
    }
    
    // Calculer le chiffre d'affaires
    if (data.sales) {
        const validSales = data.sales.filter(sale => sale.price && !isNaN(parsePrice(sale.price)));
        stats.totalRevenue = validSales.reduce((sum, sale) => sum + parsePrice(sale.price), 0);
        stats.averagePrice = validSales.length > 0 ? stats.totalRevenue / validSales.length : 0;
    }
    
    return stats;
}

// ===== FONCTIONS UTILITAIRES =====
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function cleanText(text) {
    if (!text) return '';
    return text.toString().trim().replace(/\s+/g, ' ');
}

function parsePrice(priceStr) {
    if (!priceStr) return 0;
    
    // Extraire les chiffres et gérer les décimales
    const cleaned = priceStr.toString().replace(/[^\d,.-]/g, '');
    const number = parseFloat(cleaned.replace(',', '.'));
    
    return isNaN(number) ? 0 : Math.round(number * 100) / 100; // Arrondir à 2 décimales
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== LOGGING =====
function logActivity(action, userEmail, details = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        userEmail: userEmail,
        details: details
    };
    
    console.log('📝 Log:', JSON.stringify(logEntry));
    
    // En production, sauvegarder dans un système de logs persistant
    // (CloudWatch, LogFlare, etc.)
}

console.log('✅ Fonction vinted-sync prête');