// netlify/functions/vinted-sync.js
// API pour recevoir les données de l'extension H24

console.log('🚀 API Vinted Sync - Fonction Netlify');

// Base de données en mémoire pour stocker les données utilisateurs
// En production, tu utiliseras une vraie DB (MongoDB, PostgreSQL, etc.)
let vintedDatabase = {};

exports.handler = async (event, context) => {
    console.log('📡 API appelée:', event.httpMethod, event.path);
    
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Gestion CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const path = event.path;
        
        // Router selon le path
        if (event.httpMethod === 'POST') {
            if (path.includes('/vinted-sync')) {
                return await handleVintedSync(event, headers);
            } else if (path.includes('/get-user-data')) {
                return await handleGetUserData(event, headers);
            }
        } else if (event.httpMethod === 'GET') {
            if (path.includes('/test')) {
                return handleApiTest(headers);
            }
        }
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint non trouvé' })
        };

    } catch (error) {
        console.error('❌ Erreur API globale:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erreur serveur',
                details: error.message 
            })
        };
    }
};

// ENDPOINT PRINCIPAL - Recevoir les données Vinted
async function handleVintedSync(event, headers) {
    try {
        console.log('📊 Traitement sync Vinted...');
        
        const { type, data, userEmail } = JSON.parse(event.body || '{}');
        
        // Validation des données
        if (!userEmail || !data || !type) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Données manquantes',
                    required: ['userEmail', 'data', 'type']
                })
            };
        }
        
        console.log(`📥 Données reçues pour ${userEmail}:`, {
            type,
            itemsCount: data.items?.length || 0,
            salesCount: data.sales?.length || 0,
            messagesCount: data.messages?.length || 0,
            profileData: !!data.profile?.username
        });
        
        // Initialiser l'utilisateur s'il n'existe pas
        if (!vintedDatabase[userEmail]) {
            vintedDatabase[userEmail] = {
                email: userEmail,
                profile: {},
                items: [],
                sales: [],
                messages: [],
                statistics: {},
                lastSync: null,
                createdAt: new Date().toISOString()
            };
        }
        
        const userData = vintedDatabase[userEmail];
        
        // Traiter selon le type de sync
        switch (type) {
            case 'full_sync':
                await processFullSync(userData, data);
                break;
                
            case 'profile_sync':
                await processProfileSync(userData, data);
                break;
                
            case 'items_sync':
                await processItemsSync(userData, data);
                break;
                
            case 'sales_sync':
                await processSalesSync(userData, data);
                break;
                
            default:
                console.log('⚠️ Type de sync inconnu:', type);
        }
        
        // Mettre à jour la dernière sync
        userData.lastSync = new Date().toISOString();
        userData.lastSyncType = type;
        
        // Calculer les statistiques
        updateUserStatistics(userData);
        
        console.log('✅ Sync terminée pour:', userEmail);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Sync ${type} réussie`,
                timestamp: userData.lastSync,
                stats: {
                    totalItems: userData.items.length,
                    totalSales: userData.sales.length,
                    totalMessages: userData.messages.length,
                    profileComplete: !!userData.profile.username
                }
            })
        };
        
    } catch (error) {
        console.error('❌ Erreur handleVintedSync:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erreur traitement sync',
                details: error.message 
            })
        };
    }
}

// ENDPOINT - Récupérer les données utilisateur
async function handleGetUserData(event, headers) {
    try {
        const { userEmail } = JSON.parse(event.body || '{}');
        
        if (!userEmail) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email utilisateur requis' })
            };
        }
        
        const userData = vintedDatabase[userEmail];
        
        if (!userData) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'Utilisateur non trouvé',
                    userEmail: userEmail
                })
            };
        }
        
        // Retourner les données (sans les données sensibles)
        const responseData = {
            email: userData.email,
            profile: userData.profile,
            items: userData.items.slice(-100), // Les 100 derniers
            sales: userData.sales.slice(-50),   // Les 50 dernières
            messages: userData.messages.slice(-30), // Les 30 derniers
            statistics: userData.statistics,
            lastSync: userData.lastSync,
            isActive: true,
            vintedConnected: true
        };
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: responseData,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Erreur handleGetUserData:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erreur récupération données',
                details: error.message 
            })
        };
    }
}

// ENDPOINT TEST
function handleApiTest(headers) {
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'API Hermès Tool opérationnelle',
            timestamp: new Date().toISOString(),
            endpoints: [
                'POST /vinted-sync - Recevoir données extension',
                'POST /get-user-data - Récupérer données utilisateur',
                'GET /test - Test de l\'API'
            ],
            version: '2.0.0'
        })
    };
}

// FONCTIONS DE TRAITEMENT DES DONNÉES

async function processFullSync(userData, data) {
    console.log('🔄 Full sync en cours...');
    
    // Profil
    if (data.profile) {
        userData.profile = { ...userData.profile, ...data.profile };
    }
    
    // Items - Fusionner sans doublons
    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(newItem => {
            if (!userData.items.find(existing => existing.hash === newItem.hash)) {
                userData.items.push(newItem);
            }
        });
        
        // Limiter à 1000 items max
        if (userData.items.length > 1000) {
            userData.items = userData.items.slice(-1000);
        }
    }
    
    // Ventes - Fusionner sans doublons
    if (data.sales && Array.isArray(data.sales)) {
        data.sales.forEach(newSale => {
            if (!userData.sales.find(existing => existing.hash === newSale.hash)) {
                userData.sales.push(newSale);
            }
        });
        
        // Limiter à 500 ventes max
        if (userData.sales.length > 500) {
            userData.sales = userData.sales.slice(-500);
        }
    }
    
    // Messages - Fusionner sans doublons
    if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach(newMessage => {
            if (!userData.messages.find(existing => existing.hash === newMessage.hash)) {
                userData.messages.push(newMessage);
            }
        });
        
        // Limiter à 200 messages max
        if (userData.messages.length > 200) {
            userData.messages = userData.messages.slice(-200);
        }
    }
    
    // Statistiques
    if (data.statistics) {
        userData.statistics = { ...userData.statistics, ...data.statistics };
    }
    
    console.log('✅ Full sync terminée');
}

async function processProfileSync(userData, data) {
    console.log('👤 Profile sync...');
    if (data.profile) {
        userData.profile = { ...userData.profile, ...data.profile };
    }
}

async function processItemsSync(userData, data) {
    console.log('📦 Items sync...');
    if (data.items && Array.isArray(data.items)) {
        let newItems = 0;
        data.items.forEach(item => {
            if (!userData.items.find(existing => existing.hash === item.hash)) {
                userData.items.push(item);
                newItems++;
            }
        });
        console.log(`📦 ${newItems} nouveaux items ajoutés`);
    }
}

async function processSalesSync(userData, data) {
    console.log('💰 Sales sync...');
    if (data.sales && Array.isArray(data.sales)) {
        let newSales = 0;
        data.sales.forEach(sale => {
            if (!userData.sales.find(existing => existing.hash === sale.hash)) {
                userData.sales.push(sale);
                newSales++;
            }
        });
        console.log(`💰 ${newSales} nouvelles ventes ajoutées`);
    }
}

function updateUserStatistics(userData) {
    const stats = userData.statistics || {};
    
    // Calculer les revenus
    const totalRevenue = userData.sales.reduce((sum, sale) => {
        const amount = parseFloat(sale.price?.replace(/[€\s]/g, '').replace(',', '.')) || 0;
        return sum + amount;
    }, 0);
    
    // Calculer les stats générales
    stats.totalItems = userData.items.length;
    stats.totalSales = userData.sales.length;
    stats.totalMessages = userData.messages.length;
    stats.totalRevenue = totalRevenue;
    stats.averageSalePrice = userData.sales.length > 0 ? totalRevenue / userData.sales.length : 0;
    stats.lastCalculated = new Date().toISOString();
    
    // Calculer les tendances (items par jour, etc.)
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    stats.itemsLast7Days = userData.items.filter(item => 
        new Date(item.scrapedAt) > last7Days
    ).length;
    
    stats.salesLast7Days = userData.sales.filter(sale => 
        new Date(sale.scrapedAt || sale.saleDate) > last7Days
    ).length;
    
    userData.statistics = stats;
    
    console.log('📊 Statistiques calculées:', {
        totalItems: stats.totalItems,
        totalSales: stats.totalSales,
        totalRevenue: stats.totalRevenue,
        averagePrice: stats.averageSalePrice.toFixed(2)
    });
}