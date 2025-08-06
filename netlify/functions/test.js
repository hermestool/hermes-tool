// netlify/functions/test.js
exports.handler = async (event, context) => {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: "Fonction OK!",
            timestamp: new Date().toISOString()
        })
    };
};