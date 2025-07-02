/**
 * API Handler Class - Centralized API communication
 * Modern JavaScript with OOP principles
 */

class APIHandler {
    constructor() {
        // Use relative URL since frontend is served from same domain as backend
        this.baseURL = window.location.origin;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Set up request/response interceptors
        this.setupInterceptors();
    }

    /**
     * Setup request and response interceptors
     */
    setupInterceptors() {
        // You could add global error handling, token refresh logic, etc. here
        this.requestInterceptor = (config) => {
            // Add timestamp for cache busting
            config.timestamp = Date.now();
            
            // Add auth token if available
            const token = this.getAuthToken();
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            
            return config;
        };

        this.responseInterceptor = {
            success: (response) => {
                // Handle successful responses
                return response;
            },
            error: (error) => {
                // Handle global errors
                this.handleGlobalError(error);
                throw error;
            }
        };
    }

    /**
     * Get authentication token from localStorage
     */
    getAuthToken() {
        try {
            return localStorage.getItem('auth_token');
        } catch (error) {
            console.warn('Failed to get auth token:', error);
            return null;
        }
    }

    /**
     * Set authentication token in localStorage
     */
    setAuthToken(token) {
        try {
            localStorage.setItem('auth_token', token);
        } catch (error) {
            console.warn('Failed to set auth token:', error);
        }
    }

    /**
     * Remove authentication token
     */
    removeAuthToken() {
        try {
            localStorage.removeItem('auth_token');
        } catch (error) {
            console.warn('Failed to remove auth token:', error);
        }
    }

    /**
     * Handle global API errors
     */
    handleGlobalError(error) {
        // Log error for debugging
        console.error('API Error:', error);

        // Handle specific error types
        if (error.status === 401) {
            // Unauthorized - clear token and redirect to login
            this.removeAuthToken();
            if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
                window.location.href = '/';
            }
        } else if (error.status === 403) {
            // Forbidden
            console.warn('Access forbidden');
        } else if (error.status >= 500) {
            // Server errors
            console.error('Server error occurred');
        }
    }

    /**
     * Create request configuration
     */
    createRequestConfig(options = {}) {
        const config = {
            method: options.method || 'GET',
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        // For FormData, remove Content-Type to let browser set boundary
        if (config.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        // Apply request interceptor
        return this.requestInterceptor(config);
    }

    /**
     * Build URL with query parameters
     */
    buildURL(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseURL);
        
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        return url.toString();
    }

    /**
     * Generic HTTP request method
     */
    async request(endpoint, options = {}) {
        try {
            const config = this.createRequestConfig(options);
            const url = this.buildURL(endpoint, options.params);

            // Add request body if provided
            if (config.body && typeof config.body === 'object') {
                // Don't stringify FormData - browser will handle it
                if (!(config.body instanceof FormData)) {
                    config.body = JSON.stringify(config.body);
                }
            }

            const response = await fetch(url, config);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            const isJSON = contentType && contentType.includes('application/json');
            
            // Parse response data
            const data = isJSON ? await response.json() : await response.text();

            // Create standardized response object
            const apiResponse = {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                ok: response.ok
            };

            if (!response.ok) {
                // Create error object
                const error = new Error(data.message || `HTTP ${response.status}`);
                error.status = response.status;
                error.response = apiResponse;
                
                // Apply response error interceptor
                this.responseInterceptor.error(error);
                return apiResponse;
            }

            // Apply response success interceptor
            this.responseInterceptor.success(apiResponse);
            
            return apiResponse;

        } catch (error) {
            // Network or other errors
            const apiError = new Error(error.message || 'Network error');
            apiError.status = 0;
            apiError.originalError = error;
            
            this.responseInterceptor.error(apiError);
            throw apiError;
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}, options = {}) {
        return this.request(endpoint, {
            method: 'GET',
            params,
            ...options
        });
    }

    /**
     * POST request
     */
    async post(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data,
            ...options
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data,
            ...options
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            ...options
        });
    }

    /**
     * PATCH request
     */
    async patch(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: data,
            ...options
        });
    }

    /**
     * Upload file(s)
     */
    async upload(endpoint, formData, options = {}) {
        const uploadOptions = {
            method: 'POST',
            body: formData,
            headers: {
                // Remove Content-Type to let browser set boundary
                ...options.headers
            },
            ...options
        };

        // Remove Content-Type for FormData
        delete uploadOptions.headers['Content-Type'];

        return this.request(endpoint, uploadOptions);
    }

    /**
     * Download file
     */
    async download(endpoint, filename, options = {}) {
        try {
            const config = this.createRequestConfig(options);
            const url = this.buildURL(endpoint, options.params);

            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            
            // Create download link
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'download';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            window.URL.revokeObjectURL(downloadUrl);
            
            return { success: true, filename };

        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await this.get('/health');
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Set base URL
     */
    setBaseURL(baseURL) {
        this.baseURL = baseURL;
    }

    /**
     * Set default headers
     */
    setDefaultHeaders(headers) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    }
}

// Create and export singleton instance
const apiHandler = new APIHandler();

// Export for use in other modules
window.APIHandler = APIHandler;
window.api = apiHandler;

// Export for ES6 modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIHandler, api: apiHandler };
} 