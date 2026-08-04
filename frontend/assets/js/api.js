const API_BASE_URL = 'https://charcaol-erp.onrender.com/api';

/**
 * Wrapper for fetch API to automatically handle JWT tokens.
 */
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const activeCompanyId = localStorage.getItem('active_company_id');
    if (activeCompanyId) {
        headers['X-Company-ID'] = activeCompanyId;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // Handle 401 Unauthorized (Token expired)
        if (response.status === 401) {
            console.warn("Unauthorized. Redirecting to login.");
            logoutUser();
            return null;
        }

        const data = await response.json().catch(() => null);
        
        if (!response.ok) {
            let errorMsg = 'API Request Failed';
            if (data) {
                if (data.detail) {
                    errorMsg = data.detail;
                } else if (typeof data === 'object') {
                    // Extract DRF field validation errors
                    const errors = [];
                    for (const key in data) {
                        if (Array.isArray(data[key])) {
                            errors.push(`${key.replace('_', ' ')}: ${data[key].join(', ')}`);
                        } else {
                            errors.push(`${key}: ${data[key]}`);
                        }
                    }
                    if (errors.length > 0) errorMsg = errors.join('\n');
                }
            }
            throw new Error(errorMsg);
        }

        return data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            return true;
        } else {
            throw new Error(data.detail || 'Login failed');
        }
    } catch (error) {
        throw error;
    }
}

function logoutUser() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = 'login.html';
}

function checkAuthGuard() {
    const isLoginPage = window.location.pathname.includes('login.html');
    const token = localStorage.getItem('access_token');
    
    if (!token && !isLoginPage) {
        window.location.href = 'login.html';
    } else if (token && isLoginPage) {
        window.location.href = 'dashboard.html';
    }
}
