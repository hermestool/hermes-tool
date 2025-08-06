// netlify/functions/hello.js
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: "Hello from Hermès Tool!",
            timestamp: new Date().toISOString()
        })
    };
};