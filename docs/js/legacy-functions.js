/**
 * Legacy Functions Compatibility Layer
 * Provides temporary implementations for functions called from HTML
 * before the main application loads
 * 
 * @version 1.0.0
 */

// Temporary functions to prevent errors during loading
window.handleLogin = function(event) {
    if (event) event.preventDefault();
    console.warn('handleLogin called before app initialization');
    return false;
};

window.handleRegister = function(event) {
    if (event) event.preventDefault();
    console.warn('handleRegister called before app initialization');
    return false;
};

window.handleLogout = function() {
    console.warn('handleLogout called before app initialization');
    return false;
};

window.showPasswordField = function() {
    console.warn('showPasswordField called before app initialization');
    return false;
};

window.toggleRegister = function() {
    console.warn('toggleRegister called before app initialization');
    return false;
};

// Theme toggle functions
window.toggleTheme = function() {
    console.warn('toggleTheme called before app initialization');
    return false;
};

// Password strength checker
window.checkPasswordStrength = function(password) {
    console.warn('checkPasswordStrength called before app initialization');
    return { score: 0, text: 'Checking...' };
};

// Form validation helpers
window.validateEmail = function(email) {
    console.warn('validateEmail called before app initialization');
    return false;
};

window.validatePassword = function(password) {
    console.warn('validatePassword called before app initialization');
    return false;
};

// UI helpers
window.showNotification = function(message, type = 'info') {
    console.warn('showNotification called before app initialization:', message, type);
    // Fallback to alert if app not loaded
    if (typeof alert !== 'undefined') {
        alert(`${type.toUpperCase()}: ${message}`);
    }
};

window.showModal = function(content, options = {}) {
    console.warn('showModal called before app initialization');
    return Promise.resolve(null);
};

window.confirm = function(message) {
    console.warn('confirm called before app initialization');
    return Promise.resolve(window.confirm(message));
};

// Loading states
window.showLoader = function(options = {}) {
    console.warn('showLoader called before app initialization');
    return () => {};
};

window.hideLoader = function() {
    console.warn('hideLoader called before app initialization');
};

// Navigation helpers
window.navigateTo = function(page) {
    console.warn('navigateTo called before app initialization:', page);
};

window.goBack = function() {
    console.warn('goBack called before app initialization');
};

// Data helpers
window.saveData = function(key, data) {
    console.warn('saveData called before app initialization');
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save data:', error);
    }
};

window.loadData = function(key) {
    console.warn('loadData called before app initialization');
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to load data:', error);
        return null;
    }
};

window.removeData = function(key) {
    console.warn('removeData called before app initialization');
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to remove data:', error);
    }
};

// Error handling
window.handleError = function(error, context = '') {
    console.error('Error in', context, ':', error);
    if (window.app && window.app.showNotification) {
        window.app.showNotification('Произошла ошибка', 'error');
    } else {
        window.showNotification('Произошла ошибка', 'error');
    }
};

// Performance monitoring
window.logPerformance = function(action, startTime) {
    if (window.performance && window.performance.now) {
        const duration = window.performance.now() - startTime;
        console.log(`Performance: ${action} took ${duration.toFixed(2)}ms`);
    }
};

// Analytics
window.trackEvent = function(category, action, label = '') {
    console.log('Analytics:', category, action, label);
    // Integration with Google Analytics or other analytics can be added here
};

// Utility functions
window.formatCurrency = function(amount, currency = 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

window.formatDate = function(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Intl.DateTimeFormat('ru-RU', { ...defaultOptions, ...options }).format(new Date(date));
};

window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

window.throttle = function(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// DOM helpers
window.waitForElement = function(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
};

// App initialization check
window.isAppInitialized = function() {
    return !!(window.app && window.app.getState && window.app.getState().initialized);
};

// Wait for app initialization
window.waitForApp = function(timeout = 10000) {
    return new Promise((resolve, reject) => {
        if (window.isAppInitialized()) {
            resolve(window.app);
            return;
        }

        const checkInterval = setInterval(() => {
            if (window.isAppInitialized()) {
                clearInterval(checkInterval);
                resolve(window.app);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('App initialization timeout'));
        }, timeout);
    });
};

// Override functions when app loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to initialize and then override these functions
    window.waitForApp().then(app => {
        console.log('App initialized, overriding legacy functions');
        
        // Override functions with real implementations
        window.handleLogin = function(event) {
            if (event) event.preventDefault();
            return app.login({
                email: document.getElementById('loginEmail')?.value,
                password: document.getElementById('loginPassword')?.value
            });
        };
        
        window.handleRegister = function(event) {
            if (event) event.preventDefault();
            return app.register({
                name: document.getElementById('regName')?.value,
                email: document.getElementById('regEmail')?.value,
                password: document.getElementById('regPassword')?.value,
                confirmPassword: document.getElementById('regPassword2')?.value
            });
        };
        
        window.handleLogout = function() {
            return app.logout();
        };
        
        window.showPasswordField = function() {
            const passwordGroup = document.getElementById('passwordGroup');
            const nextBtn = document.getElementById('nextBtn');
            const loginBtn = document.getElementById('loginBtn');
            
            if (passwordGroup && nextBtn && loginBtn) {
                passwordGroup.style.display = 'block';
                nextBtn.style.display = 'none';
                loginBtn.style.display = 'block';
                document.getElementById('loginPassword')?.focus();
            }
        };
        
        window.toggleRegister = function() {
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            const authToggleText = document.getElementById('authToggleText');
            
            if (loginForm && registerForm && authToggleText) {
                const isRegisterVisible = registerForm.style.display !== 'none';
                loginForm.style.display = isRegisterVisible ? 'block' : 'none';
                registerForm.style.display = isRegisterVisible ? 'none' : 'block';
                authToggleText.textContent = isRegisterVisible ? 
                    'Нет аккаунта? Зарегистрироваться' : 
                    'Уже есть аккаунт? Войти';
            }
        };
        
        window.toggleTheme = function() {
            const currentTheme = app.getTheme();
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            app.setTheme(newTheme);
        };
        
        window.showNotification = function(message, type = 'info', options = {}) {
            return app.showNotification(message, type, options);
        };
        
        window.showModal = function(content, options = {}) {
            return app.showModal(content, options);
        };
        
        window.showLoader = function(options = {}) {
            const uiManager = app.getModule ? app.getModule('uiManager') : window.uiManager;
            if (uiManager) {
                return uiManager.showLoader(options);
            }
            return () => {};
        };
        
        window.hideLoader = function(loaderId) {
            const uiManager = app.getModule ? app.getModule('uiManager') : window.uiManager;
            if (uiManager && loaderId) {
                uiManager.hideLoader(loaderId);
            }
        };
        
        console.log('Legacy functions overridden with app implementations');
        
    }).catch(error => {
        console.error('Failed to wait for app initialization:', error);
    });
});

console.log('Legacy functions compatibility layer loaded');
