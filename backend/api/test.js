// Minimal test serverless function
export default function handler(req, res) {
    res.status(200).json({
        success: true,
        message: 'Test serverless function working',
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
    });
}