export const debugLog = (label, data) => {
    console.log(`\n[DEBUG] ${label}:`, JSON.stringify(data, null, 2), '\n');
};

export const handleServerError = (res, error, message = 'Internal server error') => {
    console.error('\n[ERROR] Server error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
    });
    
    // Only send safe error details in production
    if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({
            message,
            error: error.message,
            stack: error.stack
        });
    }
    
    return res.status(500).json({ message });
};

