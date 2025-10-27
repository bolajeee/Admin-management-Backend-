// Simple test to verify serverless function works
import handler from './api/index.js';

// Mock request and response objects
const mockReq = {
    method: 'GET',
    url: '/',
    headers: {},
    ip: '127.0.0.1',
    get: (header) => 'test-agent'
};

const mockRes = {
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        console.log('Response:', data);
        return this;
    },
    setHeader: function (name, value) {
        console.log(`Header set: ${name} = ${value}`);
    },
    end: function () {
        console.log('Response ended');
    }
};

console.log('Testing serverless function...');
handler(mockReq, mockRes).catch(console.error);