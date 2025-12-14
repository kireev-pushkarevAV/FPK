/**
 * Основной файл приложения Финансовый Помощник
 * Интегрирует все модули и управляет жизненным циклом приложения
 * 
 * @version 2.0.0
 * @author Financial Assistant Team
 */

/**
 * Главный класс приложения
 * @class FinancialAssistantApp
 */
class FinancialAssistantApp {
    /**
     * Экземпляр приложения (Singleton)
     * @type {FinancialAssistantApp|null}
     * @private
     */
    static #instance = null;

    /**
     * Конфигурация приложения
     * @type {Object}
     * @private
     */
    #config = {
        // API настройки
        api: {
            baseURL: '/api',
            timeout: 30000,
            retries: 3,
            endpoints: {
                auth: '/auth',
                transactions: '/transactions',
                categories: '/categories',
                budgets: '/budgets',
                goals: '/goals',
                reports: '/reports'
            }
        },
        
        // Безопасность
        security: {
            sessionTimeout: 30 * 60 * 1000, // 30 минут
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000, // 15 минут
            enableCSRF: true,
            pepper: 'financial-assistant-pepper-2024'
        },
        
        // Производительность
        performance: {
            enableCaching: true,
            cacheTimeout: 5 * 60 * 1000, // 5 минут
            enableLazyLoading: true,
            enableVirtualScroll: true,
            pageSize: 50
        },
        
        // UI настройки
        ui: {
            defaultTheme: 'light',
            enableAnimations: true,
            enableNotifications: true,
            notificationDuration: 3000,
            enableTooltips: true
        },
        
        // Логирование
        logging: {
            level: 'INFO',
            enableConsole: true,
            enableFile: false, // В браузере отключено
            maxFileSize: 10 * 1024 * 1024
        },
        
        // Функциональность
        features: {
            enableOffline: true,
            enableExport: true,
            enableCharts: true,
            enableGoals: true,
            enableBudgets: true,
            enableReports: true
        }
    };

    /**
     * Состояние приложения
     * @type {Object}
     * @private
     */
    #state = {
        initialized: false,
        authenticated: false,
        currentUser: null,
        theme: 'light',
        breakpoint: 'mobile',
        loading: false,
        error: null
    };

    /**
     * Модули приложения
     * @type {Object}
     * @private
     */
    #modules = {};

    /**
     * Приватный конструктор
     * @param {Object} config - Конфигурация приложения
     * @private
     */
    constructor(config = {}) {
        if (FinancialAssistantApp.#instance) {
            throw new Error('FinancialAssistantApp - это Singleton. Используйте FinancialAssistantApp.getInstance()');
        }

        this.#config = this.#mergeConfig(this.#config, config);
        this.#initializeModules();
    }

    /**
     * Получение экземпляра Singleton
     * @param {Object} config - Конфигурация (только при первом вызове)
     * @returns {FinancialAssistantApp} Экземпляр приложения
     */
    static getInstance(config = {}) {
        if (!FinancialAssistantApp.#instance) {
            FinancialAssistantApp.#instance = new FinancialAssistantApp(config);
        }
        return FinancialAssistantApp.#instance;
    }

    /**
     * Инициализация приложения
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            this.#setState({ loading: true });

            // Инициализация ядра приложения
            await this.#initializeCore();

            // Инициализация модулей
            await this.#initializeAllModules();

            // Настройка обработчиков событий
            this.#setupEventHandlers();

            // Восстановление сессии
            await this.#restoreSession();

            // Инициализация UI
            await this.#initializeUI();

            this.#setState({ 
                initialized: true, 
                loading: false 
            });

            this.#getModule('logger').info('Приложение успешно инициализировано');

            // Эмитирование события готовности
            this.emit('app:ready');

        } catch (error) {
            this.#setState({ 
                error: error.message, 
                loading: false 
            });
            
            this.#getModule('logger').error('Ошибка инициализации приложения', error);
            this.emit('app:error', { error });
        }
    }

    /**
     * Инициализация ядра приложения
     * @private
     */
    async #initializeCore() {
        // Инициализация AppCore
        const appCore = AppCore.getInstance({
            modules: ['auth', 'dataManager', 'security', 'logger', 'validator', 'uiManager'],
            enableEventBus: true,
            enableStateManager: true
        });

        await appCore.initialize();
        this.#modules.appCore = appCore;

        // Глобальный доступ для отладки
        window.appCore = appCore;
        window.app = this;
    }

    /**
     * Инициализация модулей
     * @private
     */
    #initializeModules() {
        // Модуль безопасности
        const security = SecurityModule.getInstance(this.#config.security);
        this.#modules.security = security;

        // Модуль логирования
        const logger = Logger.getInstance(this.#config.logging);
        this.#modules.logger = logger;

        // Модуль валидации
        const validator = Validator.getInstance({
            language: 'ru',
            strictMode: true
        });
        this.#modules.validator = validator;

        // Модуль аутентификации
        const auth = AuthModule.getInstance({
            apiEndpoint: this.#config.api.baseURL + this.#config.api.endpoints.auth,
            sessionTimeout: this.#config.security.sessionTimeout,
            enableRememberMe: true
        });
        this.#modules.auth = auth;

        // Модуль управления данными
        const dataManager = DataManager.getInstance({
            apiEndpoint: this.#config.api.baseURL,
            cacheTimeout: this.#config.performance.cacheTimeout,
            enableOffline: this.#config.features.enableOffline,
            syncInterval: 30 * 1000
        });
        this.#modules.dataManager = dataManager;

        // UI менеджер
        const uiManager = UIManager.getInstance(this.#config.ui);
        this.#modules.uiManager = uiManager;
    }

    /**
     * Инициализация всех модулей
     * @private
     */
    async #initializeAllModules() {
        const appCore = this.#modules.appCore;

        // Регистрация модулей в ядре
        Object.entries(this.#modules).forEach(([name, module]) => {
            if (name !== 'appCore') {
                appCore.registerModule(name, module);
            }
        });

        // Инициализация модулей через ядро
        await appCore.initializeModules();
    }

    /**
     * Настройка обработчиков событий
     * @private
     */
    #setupEventHandlers() {
        const appCore = this.#modules.appCore;

        // События аутентификации
        appCore.on('auth:login', (data) => {
            this.#setState({ 
                authenticated: true, 
                currentUser: data.user 
            });
        });

        appCore.on('auth:logout', () => {
            this.#setState({ 
                authenticated: false, 
                currentUser: null 
            });
        });

        // События UI
        appCore.on('ui:theme-changed', (data) => {
            this.#setState({ theme: data.theme });
        });

        appCore.on('ui:resize', (data) => {
            this.#setState({ breakpoint: data.breakpoint });
        });

        // События ошибок
        appCore.on('error', (data) => {
            this.#handleError(data.error);
        });

        // События сети
        window.addEventListener('online', () => {
            appCore.emit('app:online');
            this.#getModule('logger').info('Соединение восстановлено');
        });

        window.addEventListener('offline', () => {
            appCore.emit('app:offline');
            this.#getModule('logger').warn('Потеря соединения');
        });

        // События жизненного цикла страницы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                appCore.emit('app:hidden');
            } else {
                appCore.emit('app:visible');
            }
        });

        window.addEventListener('beforeunload', (e) => {
            if (this.#hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'Есть несохраненные изменения. Вы уверены, что хотите уйти?';
            }
        });
    }

    /**
     * Восстановление сессии
     * @private
     */
    async #restoreSession() {
        try {
            const auth = this.#modules.auth;
            const currentUser = await auth.getCurrentUser();
            
            if (currentUser) {
                this.#setState({ 
                    authenticated: true, 
                    currentUser 
                });
                
                this.emit('app:session-restored', { user: currentUser });
            }
        } catch (error) {
            this.#getModule('logger').warn('Не удалось восстановить сессию', error);
        }
    }

    /**
     * Инициализация UI
     * @private
     */
    async #initializeUI() {
        const uiManager = this.#modules.uiManager;
        
        // Установка темы
        const savedTheme = localStorage.getItem('app-theme') || this.#config.ui.defaultTheme;
        uiManager.setTheme(savedTheme);
        this.#setState({ theme: savedTheme });

        // Показ приветственного сообщения
        if (this.#state.authenticated) {
            uiManager.showNotification(
                `Добро пожаловать, ${this.#state.currentUser.name}!`, 
                'success'
            );
        }
    }

    /**
     * Обработка ошибок
     * @param {Error} error - Ошибка
     * @private
     */
    #handleError(error) {
        const logger = this.#getModule('logger');
        const uiManager = this.#getModule('uiManager');

        logger.error('Ошибка приложения', error);

        // Показ уведомления пользователю
        if (uiManager && this.#state.initialized) {
            const message = error.userMessage || error.message || 'Произошла ошибка';
            uiManager.showNotification(message, 'error');
        }

        // Эмитирование события ошибки
        this.emit('app:error', { error });
    }

    /**
     * Проверка наличия несохраненных изменений
     * @returns {boolean} true если есть несохраненные изменения
     * @private
     */
    #hasUnsavedChanges() {
        // TODO: Реализовать проверку несохраненных изменений
        return false;
    }

    /**
     * Получение модуля по имени
     * @param {string} name - Имя модуля
     * @returns {Object|null} Модуль или null
     * @private
     */
    #getModule(name) {
        return this.#modules[name] || this.#modules.appCore?.getModule(name) || null;
    }

    /**
     * Установка состояния
     * @param {Object} newState - Новое состояние
     * @private
     */
    #setState(newState) {
        const prevState = { ...this.#state };
        this.#state = { ...this.#state, ...newState };
        
        // Эмитирование события изменения состояния
        this.emit('app:state-changed', { 
            prevState, 
            currentState: this.#state, 
            changes: newState 
        });
    }

    /**
     * Слияние конфигураций
     * @param {Object} defaultConfig - Конфигурация по умолчанию
     * @param {Object} userConfig - Пользовательская конфигурация
     * @returns {Object} Слитая конфигурация
     * @private
     */
    #mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };
        
        for (const key in userConfig) {
            if (userConfig.hasOwnProperty(key)) {
                if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                    merged[key] = this.#mergeConfig(merged[key] || {}, userConfig[key]);
                } else {
                    merged[key] = userConfig[key];
                }
            }
        }
        
        return merged;
    }

    /**
     * Публичные методы API
     */

    /**
     * Вход пользователя
     * @param {Object} credentials - Учетные данные
     * @returns {Promise<Object>} Результат входа
     */
    async login(credentials) {
        try {
            const auth = this.#modules.auth;
            const result = await auth.login(credentials);
            
            if (result.success) {
                this.#setState({ 
                    authenticated: true, 
                    currentUser: result.user 
                });
            }
            
            return result;
        } catch (error) {
            this.#handleError(error);
            throw error;
        }
    }

    /**
     * Выход пользователя
     * @returns {Promise<boolean>} Результат выхода
     */
    async logout() {
        try {
            const auth = this.#modules.auth;
            const result = await auth.logout();
            
            this.#setState({ 
                authenticated: false, 
                currentUser: null 
            });
            
            return result;
        } catch (error) {
            this.#handleError(error);
            throw error;
        }
    }

    /**
     * Регистрация пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} Результат регистрации
     */
    async register(userData) {
        try {
            const auth = this.#modules.auth;
            return await auth.register(userData);
        } catch (error) {
            this.#handleError(error);
            throw error;
        }
    }

    /**
     * Получение транзакций
     * @param {Object} options - Опции загрузки
     * @returns {Promise<Object>} Транзакции и метаданные
     */
    async getTransactions(options = {}) {
        try {
            const dataManager = this.#modules.dataManager;
            return await dataManager.loadTransactions(options);
        } catch (error) {
            this.#handleError(error);
            throw error;
        }
    }

    /**
     * Добавление транзакции
     * @param {Object} transactionData - Данные транзакции
     * @returns {Promise<Object>} Созданная транзакция
     */
    async addTransaction(transactionData) {
        try {
            const validator = this.#modules.validator;
            const dataManager = this.#modules.dataManager;
            
            // Валидация данных
            const validation = validator.validateTransaction(transactionData);
            if (!validation.valid) {
                throw new Error('Ошибка валидации: ' + validation.errors.join(', '));
            }
            
            // Очистка данных
            const security = this.#modules.security;
            transactionData.description = security.sanitizeInput(transactionData.description);
            
            // Сохранение
            const transaction = await dataManager.addTransaction(transactionData);
            
            // Уведомление
            this.#modules.uiManager.showNotification('Транзакция успешно добавлена', 'success');
            
            // Эмитирование события
            this.emit('transaction:added', transaction);
            
            return transaction;
        } catch (error) {
            this.#handleError(error);
            throw error;
        }
    }

    /**
     * Получение финансовой сводки
     * @param {string} period - Период ('week', 'month', 'quarter', 'year')
     * @returns {Promise<Object>} Финансовая сводка
     */
    async getFinancialSummary(period = 'month') {
        try {
            const dataManager = this.#modules.dataManager;
            return await dataManager.getFinancialSummary(period);
        } catch (error) {
            this.#handleError(error);
            throw error;
        }
    }

    /**
     * Экспорт данных
     * @param {string} format - Формат ('csv', 'json', 'pdf')
     * @param {Object} options - Опции экспорта
     * @returns {Promise<Blob>} Файл для скачивания
     */
    async exportData(format, options = {}) {
        try {
            const dataManager = this.#modules.dataManager;
            return await dataManager.exportData(format, options);
        } catch (error) {
            this.#handleError(error);
            throw error;
        }
    }

    /**
     * Показ уведомления
     * @param {string} message - Сообщение
     * @param {string} type - Тип ('success', 'error', 'warning', 'info')
     * @param {Object} options - Опции
     */
    showNotification(message, type = 'info', options = {}) {
        const uiManager = this.#modules.uiManager;
        if (uiManager) {
            return uiManager.showNotification(message, type, options);
        }
    }

    /**
     * Показ модального окна
     * @param {string|HTMLElement} content - Содержимое
     * @param {Object} options - Опции
     * @returns {Promise} Результат закрытия
     */
    showModal(content, options = {}) {
        const uiManager = this.#modules.uiManager;
        if (uiManager) {
            return uiManager.showModal(content, options);
        }
        return Promise.resolve();
    }

    /**
     * Установка темы
     * @param {string} theme - Тема ('light', 'dark', 'auto')
     */
    setTheme(theme) {
        const uiManager = this.#modules.uiManager;
        if (uiManager) {
            uiManager.setTheme(theme);
        }
    }

    /**
     * Получение состояния приложения
     * @returns {Object} Текущее состояние
     */
    getState() {
        return { ...this.#state };
    }

    /**
     * Получение конфигурации
     * @returns {Object} Конфигурация приложения
     */
    getConfig() {
        return { ...this.#config };
    }

    /**
     * Проверка аутентификации
     * @returns {boolean} true если пользователь аутентифицирован
     */
    isAuthenticated() {
        return this.#state.authenticated;
    }

    /**
     * Получение текущего пользователя
     * @returns {Object|null} Данные пользователя
     */
    getCurrentUser() {
        return this.#state.currentUser;
    }

    /**
     * Получение текущего брейкпоинта
     * @returns {string} Брейкпоинт ('mobile', 'tablet', 'desktop')
     */
    getCurrentBreakpoint() {
        return this.#state.breakpoint;
    }

    /**
     * Эмитирование события
     * @param {string} event - Название события
     * @param {Object} data - Данные события
     */
    emit(event, data = {}) {
        const appCore = this.#modules.appCore;
        if (appCore) {
            appCore.emit(event, data);
        }
    }

    /**
     * Подписка на событие
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик
     */
    on(event, callback) {
        const appCore = this.#modules.appCore;
        if (appCore) {
            appCore.on(event, callback);
        }
    }

    /**
     * Отписка от события
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик
     */
    off(event, callback) {
        const appCore = this.#modules.appCore;
        if (appCore) {
            appCore.off(event, callback);
        }
    }

    /**
     * Уничтожение приложения
     */
    destroy() {
        // Уничтожение модулей
        Object.values(this.#modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });

        // Очистка состояния
        this.#state = {
            initialized: false,
            authenticated: false,
            currentUser: null,
            theme: 'light',
            breakpoint: 'mobile',
            loading: false,
            error: null
        };

        // Сброс экземпляра
        FinancialAssistantApp.#instance = null;

        // Очистка глобальных переменных
        delete window.app;
        delete window.appCore;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Проверка наличия всех необходимых модулей
        const requiredModules = [
            'AppCore', 'SecurityModule', 'Logger', 
            'Validator', 'AuthModule', 'DataManager', 'UIManager'
        ];

        const missingModules = requiredModules.filter(name => !window[name]);
        
        if (missingModules.length > 0) {
            throw new Error(`Отсутствуют модули: ${missingModules.join(', ')}`);
        }

        // Создание и инициализация приложения
        const app = FinancialAssistantApp.getInstance();
        await app.initialize();

        // Глобальный доступ для отладки
        window.FinancialAssistantApp = FinancialAssistantApp;

    } catch (error) {
        console.error('Критическая ошибка при инициализации приложения:', error);
        
        // Показ критической ошибки
        document.body.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f8f9fa;
                margin: 0;
                padding: 20px;
            ">
                <div style="
                    text-align: center;
                    background: white;
                    padding: 40px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    max-width: 500px;
                ">
                    <h1 style="color: #dc3545; margin-bottom: 20px;">
                        Ошибка инициализации
                    </h1>
                    <p style="color: #6c757d; margin-bottom: 20px;">
                        Не удалось загрузить Финансовый Помощник. Пожалуйста, обновите страницу.
                    </p>
                    <button onclick="window.location.reload()" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                    ">
                        Обновить страницу
                    </button>
                    <details style="margin-top: 20px; text-align: left;">
                        <summary style="cursor: pointer; color: #6c757d;">
                            Техническая информация
                        </summary>
                        <pre style="
                            background: #f8f9fa;
                            padding: 10px;
                            border-radius: 4px;
                            overflow: auto;
                            font-size: 12px;
                            margin-top: 10px;
                        ">${error.stack || error.message}</pre>
                    </details>
                </div>
            </div>
        `;
    }
});

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinancialAssistantApp;
}