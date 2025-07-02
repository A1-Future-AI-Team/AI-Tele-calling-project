/**
 * Authentication Manager Class
 * Handles login/signup functionality with modern animations and validation
 */

class AuthManager {
    constructor() {
        this.isLoginMode = true;
        this.isLoading = false;
        this.api = window.api;
        
        // Initialize the authentication system
        this.init();
    }

    /**
     * Initialize authentication system
     */
    init() {
        this.bindEvents();
        this.setupFormValidation();
        this.checkAuthStatus();
        this.startAnimations();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Toggle between login and signup
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        
        loginBtn?.addEventListener('click', () => this.switchToLogin());
        signupBtn?.addEventListener('click', () => this.switchToSignup());

        // Form submission
        const authForm = document.getElementById('authForm');
        authForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Password toggle
        const passwordToggle = document.getElementById('passwordToggle');
        passwordToggle?.addEventListener('click', () => this.togglePasswordVisibility());

        // Social login buttons
        const googleBtn = document.querySelector('.google-btn');
        const microsoftBtn = document.querySelector('.microsoft-btn');
        
        googleBtn?.addEventListener('click', () => this.handleSocialLogin('google'));
        microsoftBtn?.addEventListener('click', () => this.handleSocialLogin('microsoft'));

        // Input focus animations
        this.setupInputAnimations();
    }

    /**
     * Setup input focus animations
     */
    setupInputAnimations() {
        const inputs = document.querySelectorAll('.input-wrapper input');
        
        inputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                const wrapper = e.target.closest('.input-wrapper');
                wrapper?.classList.add('focused');
            });

            input.addEventListener('blur', (e) => {
                const wrapper = e.target.closest('.input-wrapper');
                if (!e.target.value) {
                    wrapper?.classList.remove('focused');
                }
            });

            input.addEventListener('input', (e) => {
                this.validateField(e.target);
            });
        });
    }

    /**
     * Setup form validation
     */
    setupFormValidation() {
        this.validationRules = {
            name: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s]+$/,
                message: 'Please enter a valid name'
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            password: {
                required: true,
                minLength: 6,
                message: 'Password must be at least 6 characters'
            }
        };
    }

    /**
     * Check if user is already authenticated
     */
    checkAuthStatus() {
        const token = this.api.getAuthToken();
        if (token) {
            // Verify token is still valid
            this.verifyToken().then(isValid => {
                if (isValid && (window.location.pathname === '/' || window.location.pathname === '/login')) {
                    this.redirectToDashboard();
                } else if (!isValid) {
                    this.api.removeAuthToken();
                }
            });
        }
    }

    /**
     * Verify authentication token
     */
    async verifyToken() {
        try {
            const response = await this.api.get('/api/auth/verify');
            return response.ok;
        } catch (error) {
            console.warn('Token verification failed:', error);
            return false;
        }
    }

    /**
     * Switch to login mode
     */
    switchToLogin() {
        if (this.isLoginMode) return;
        
        this.isLoginMode = true;
        this.updateToggleButtons();
        this.updateFormFields();
        this.updateFormContent();
        this.animateFormTransition();
    }

    /**
     * Switch to signup mode
     */
    switchToSignup() {
        if (!this.isLoginMode) return;
        
        this.isLoginMode = false;
        this.updateToggleButtons();
        this.updateFormFields();
        this.updateFormContent();
        this.animateFormTransition();
    }

    /**
     * Update toggle button states
     */
    updateToggleButtons() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        
        if (this.isLoginMode) {
            loginBtn?.classList.add('active');
            signupBtn?.classList.remove('active');
        } else {
            loginBtn?.classList.remove('active');
            signupBtn?.classList.add('active');
        }
    }

    /**
     * Update form fields visibility
     */
    updateFormFields() {
        const nameGroup = document.getElementById('nameGroup');
        const loginOptions = document.getElementById('loginOptions');
        
        if (this.isLoginMode) {
            nameGroup.style.display = 'none';
            loginOptions.style.display = 'flex';
        } else {
            nameGroup.style.display = 'block';
            loginOptions.style.display = 'none';
        }
    }

    /**
     * Update form content (titles, button text)
     */
    updateFormContent() {
        const authTitle = document.getElementById('authTitle');
        const authSubtitle = document.getElementById('authSubtitle');
        const authSubmitBtn = document.getElementById('authSubmitBtn');
        const btnText = authSubmitBtn?.querySelector('.btn-text');
        
        if (this.isLoginMode) {
            authTitle.textContent = 'Welcome Back';
            authSubtitle.textContent = 'Sign in to your account to continue';
            btnText.textContent = 'Sign In';
        } else {
            authTitle.textContent = 'Create Account';
            authSubtitle.textContent = 'Join us and start your telecalling journey';
            btnText.textContent = 'Create Account';
        }
    }

    /**
     * Animate form transition
     */
    animateFormTransition() {
        const authCard = document.querySelector('.auth-card');
        
        authCard?.classList.add('animate-fade-in');
        
        setTimeout(() => {
            authCard?.classList.remove('animate-fade-in');
        }, 600);
    }

    /**
     * Handle form submission
     */
    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (this.isLoading) return;
        
        const formData = this.getFormData();
        const isValid = this.validateForm(formData);
        
        if (!isValid) {
            this.showValidationErrors();
            return;
        }

        try {
            this.setLoading(true);
            
            if (this.isLoginMode) {
                await this.handleLogin(formData);
            } else {
                await this.handleSignup(formData);
            }
            
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Get form data
     */
    getFormData() {
        const formData = {};
        const form = document.getElementById('authForm');
        const formDataObj = new FormData(form);
        
        for (let [key, value] of formDataObj.entries()) {
            formData[key] = value.trim();
        }
        
        return formData;
    }

    /**
     * Validate form data
     */
    validateForm(formData) {
        let isValid = true;
        
        // Validate each field
        for (const [fieldName, value] of Object.entries(formData)) {
            if (!this.validateFieldData(fieldName, value)) {
                isValid = false;
            }
        }
        
        // Check required fields based on mode
        if (!this.isLoginMode && !formData.name) {
            isValid = false;
        }
        
        return isValid;
    }

    /**
     * Validate individual field
     */
    validateField(input) {
        const fieldName = input.name;
        const value = input.value.trim();
        
        return this.validateFieldData(fieldName, value);
    }

    /**
     * Validate field data against rules
     */
    validateFieldData(fieldName, value) {
        const rules = this.validationRules[fieldName];
        if (!rules) return true;
        
        const input = document.querySelector(`input[name="${fieldName}"]`);
        const wrapper = input?.closest('.input-wrapper');
        
        // Remove existing error state
        wrapper?.classList.remove('error');
        this.removeFieldError(fieldName);
        
        // Skip validation for name field in login mode
        if (fieldName === 'name' && this.isLoginMode) {
            return true;
        }
        
        // Required validation
        if (rules.required && !value) {
            this.showFieldError(fieldName, `${this.capitalizeFirst(fieldName)} is required`);
            wrapper?.classList.add('error');
            return false;
        }
        
        // Skip other validations if field is empty and not required
        if (!value) return true;
        
        // Length validation
        if (rules.minLength && value.length < rules.minLength) {
            this.showFieldError(fieldName, rules.message);
            wrapper?.classList.add('error');
            return false;
        }
        
        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            this.showFieldError(fieldName, rules.message);
            wrapper?.classList.add('error');
            return false;
        }
        
        return true;
    }

    /**
     * Show field error
     */
    showFieldError(fieldName, message) {
        const input = document.querySelector(`input[name="${fieldName}"]`);
        const formGroup = input?.closest('.form-group');
        
        // Remove existing error
        this.removeFieldError(fieldName);
        
        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #f5576c;
            font-size: 0.75rem;
            margin-top: 0.25rem;
            animation: fadeIn 0.3s ease-out;
        `;
        
        formGroup?.appendChild(errorElement);
    }

    /**
     * Remove field error
     */
    removeFieldError(fieldName) {
        const input = document.querySelector(`input[name="${fieldName}"]`);
        const formGroup = input?.closest('.form-group');
        const existingError = formGroup?.querySelector('.field-error');
        
        existingError?.remove();
    }

    /**
     * Show validation errors
     */
    showValidationErrors() {
        // Add shake animation to form
        const authCard = document.querySelector('.auth-card');
        authCard?.classList.add('shake');
        
        setTimeout(() => {
            authCard?.classList.remove('shake');
        }, 500);
    }

    /**
     * Handle login
     */
    async handleLogin(formData) {
        const response = await this.api.post('/api/auth/login', {
            email: formData.email,
            password: formData.password
        });
        
        if (response.ok && response.data.success) {
            console.log('🔑 Login successful, response:', response.data);
            
            // Store auth token if provided
            if (response.data.token) {
                console.log('🔑 Setting auth token:', response.data.token.substring(0, 20) + '...');
                this.api.setAuthToken(response.data.token);
                
                // Verify token was set
                const savedToken = this.api.getAuthToken();
                console.log('🔑 Token saved successfully:', !!savedToken);
            } else {
                console.warn('⚠️ No token received in login response');
            }
            
            this.showSuccessMessage('Login successful! Redirecting...');
            
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1500); // Reduced delay slightly
        } else {
            throw new Error(response.data.message || 'Login failed');
        }
    }

    /**
     * Handle signup
     */
    async handleSignup(formData) {
        const response = await this.api.post('/api/auth/register', {
            name: formData.name,
            email: formData.email,
            password: formData.password
        });
        
        if (response.ok && response.data.success) {
            this.showSuccessMessage('Account created successfully! Please sign in.');
            
            setTimeout(() => {
                this.switchToLogin();
                this.clearForm();
            }, 2000);
        } else {
            throw new Error(response.data.message || 'Registration failed');
        }
    }

    /**
     * Handle social login
     */
    async handleSocialLogin(provider) {
        try {
            this.showNotification(`${this.capitalizeFirst(provider)} login coming soon!`, 'info');
        } catch (error) {
            this.handleAuthError(error);
        }
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        
        const submitBtn = document.getElementById('authSubmitBtn');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoader = submitBtn?.querySelector('.btn-loader');
        
        if (loading) {
            submitBtn?.setAttribute('disabled', 'true');
            btnText.style.display = 'none';
            btnLoader.style.display = 'flex';
        } else {
            submitBtn?.removeAttribute('disabled');
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        }
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        const authForm = document.querySelector('.auth-form');
        const successMessage = document.getElementById('successMessage');
        const successText = successMessage?.querySelector('p');
        
        if (successText) {
            successText.textContent = message;
        }
        
        authForm.style.display = 'none';
        successMessage.style.display = 'block';
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'error' ? '#f5576c' : type === 'success' ? '#4ecdc4' : '#667eea'};
            color: white;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    /**
     * Handle authentication errors
     */
    handleAuthError(error) {
        console.error('Auth error:', error);
        
        let message = 'An error occurred. Please try again.';
        
        if (error.message) {
            message = error.message;
        } else if (error.status === 400) {
            message = 'Invalid request. Please check your input.';
        } else if (error.status === 401) {
            message = 'Invalid credentials. Please try again.';
        } else if (error.status === 409) {
            message = 'User already exists. Please try logging in.';
        } else if (error.status >= 500) {
            message = 'Server error. Please try again later.';
        }
        
        this.showNotification(message, 'error');
    }

    /**
     * Clear form
     */
    clearForm() {
        const form = document.getElementById('authForm');
        form?.reset();
        
        // Remove error states
        const errorInputs = document.querySelectorAll('.input-wrapper.error');
        errorInputs.forEach(wrapper => wrapper.classList.remove('error'));
        
        const fieldErrors = document.querySelectorAll('.field-error');
        fieldErrors.forEach(error => error.remove());
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('#passwordToggle i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon?.classList.remove('fa-eye');
            toggleIcon?.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon?.classList.remove('fa-eye-slash');
            toggleIcon?.classList.add('fa-eye');
        }
    }

    /**
     * Start background animations
     */
    startAnimations() {
        // Animate floating elements
        const floatingElements = document.querySelectorAll('.float-element');
        floatingElements.forEach((element, index) => {
            element.style.animationDelay = `${index * 0.5}s`;
        });
        
        // Animate pulse elements
        const pulseElements = document.querySelectorAll('.pulse-element');
        pulseElements.forEach((element, index) => {
            element.style.animationDelay = `${index * 0.3}s`;
        });
    }

    /**
     * Redirect to dashboard
     */
    redirectToDashboard() {
        window.location.href = '/dashboard';
    }

    /**
     * Utility: Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    console.log('🔐 Authentication system initialized');
});

// Add CSS for shake animation
const shakeCSS = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .shake {
        animation: shake 0.5s ease-in-out;
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .input-wrapper.error input {
        border-color: #f5576c !important;
        box-shadow: 0 0 0 3px rgba(245, 87, 108, 0.1) !important;
    }
`;

// Inject styles
const style = document.createElement('style');
style.textContent = shakeCSS;
document.head.appendChild(style); 