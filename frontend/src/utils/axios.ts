import axios from 'axios';

const api = axios.create({
    // baseURL: 'http://localhost:3000/api',
    baseURL: 'https://api.zentexpay.in/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Get token from localStorage
        const token = localStorage.getItem('token');

        // If token exists, add it to the headers
        if (token) {
            config.headers.Authorization = `${token}`;
        }

        // Log the request
        console.log('🚀 [Request] ===========================================');
        console.log(`Method: ${config.method?.toUpperCase()}`);
        console.log(`URL: ${config.baseURL}${config.url}`);
        console.log('Headers:', config.headers);
        console.log('Data:', config.data);
        console.log('===================================================');
        return config;
    },
    (error) => {
        console.error('❌ [Request Error] ===========================================');
        console.error('Error:', error);
        console.error('===================================================');
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // Log the response
        console.log('✅ [Response] ===========================================');
        console.log(`Status: ${response.status}`);
        console.log(`Method: ${response.config.method?.toUpperCase()}`);
        console.log(`URL: ${response.config.url}`);
        console.log('Data:', response.data);
        console.log('===================================================');
        return response;
    },
    (error) => {
        // Log the error
        // console.error('❌ [Response Error] ===========================================');
        // console.error('Status:', error.response?.status);
        // console.error('Method:', error.config?.method?.toUpperCase());
        // console.error('URL:', error.config?.url);
        // console.error('Error Data:', error.response?.data);
        // console.error('Error Message:', error.message);
        // console.error('===================================================');

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
            // Clear localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Only redirect if not already on login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api; 