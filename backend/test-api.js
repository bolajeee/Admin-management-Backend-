import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
    console.log('🧪 Testing Admin Management API...\n');

    try {
        // Test root endpoint
        console.log('1. Testing root endpoint...');
        const rootResponse = await axios.get(`${BASE_URL}/`);
        console.log('✅ Root endpoint:', rootResponse.data);
        console.log();

        // Test health endpoint
        console.log('2. Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health endpoint:', healthResponse.data);
        console.log();

        // Test API documentation
        console.log('3. Testing API documentation...');
        const docsResponse = await axios.get(`${BASE_URL}/api-docs`);
        console.log('✅ API documentation is accessible');
        console.log();

        // Test 404 handling
        console.log('4. Testing 404 error handling...');
        try {
            await axios.get(`${BASE_URL}/api/nonexistent`);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('✅ 404 error handling:', error.response.data);
            } else {
                console.log('❌ Unexpected error:', error.message);
            }
        }
        console.log();

        // Test validation error (login without credentials)
        console.log('5. Testing validation error handling...');
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, {});
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Validation error handling:', error.response.data);
            } else {
                console.log('❌ Unexpected error:', error.message);
            }
        }
        console.log();

        console.log('🎉 All tests completed!');
        console.log(`📚 Visit ${BASE_URL}/api-docs to explore the API documentation`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure the server is running with: npm run server');
        }
    }
}

testAPI();