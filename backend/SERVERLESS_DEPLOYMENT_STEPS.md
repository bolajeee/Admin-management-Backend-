# Serverless Deployment Steps

## Current Status
Created a minimal serverless function that should work without errors.

## Step 1: Test Basic Function
The current `api/index.js` is minimal and should work. Test these endpoints:
- `GET /` - Should return API info
- `GET /health` - Should return health status
- `GET /favicon.ico` - Should return 204

## Step 2: Add Database Connection (Once Step 1 Works)
```javascript
import { connectDB } from '../src/lib/db.js';

// Add before handler function:
let isConnected = false;
const connectToDatabase = async () => {
    if (isConnected) return;
    try {
        await connectDB();
        isConnected = true;
    } catch (error) {
        console.error('DB connection failed:', error);
        throw error;
    }
};

// Update handler to be async:
export default async function handler(req, res) {
    try {
        await connectToDatabase();
        console.log(`${req.method} ${req.url}`);
        return app(req, res);
    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}
```

## Step 3: Add Routes One by One
Add routes gradually to identify which one causes issues:

```javascript
// Add one at a time:
import authRoute from '../src/routes/auth.route.js';
app.use("/api/auth", authRoute);

// Test, then add next:
import settingsRoute from '../src/routes/settings.route.js';
app.use("/api/settings", settingsRoute);
```

## Step 4: Add Middleware
Once routes work, add middleware:
- Error handlers
- Request logging
- Security headers

## Current Minimal Version
- ✅ Basic Express app
- ✅ CORS setup
- ✅ JSON parsing
- ✅ Basic routes (/, /health, favicon)
- ✅ 404 handler
- ❌ Database connection (add in step 2)
- ❌ API routes (add in step 3)
- ❌ Advanced middleware (add in step 4)

## Testing
1. Deploy current version
2. Test basic endpoints
3. If working, proceed to step 2
4. If not working, check Vercel function logs