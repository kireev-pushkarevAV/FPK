/**
 * Ядро приложения Финансовый Помощник
 * Предоставляет основную архитектуру и управление состоянием
 */

class FinanceAppCore {
    constructor() {
        this.modules = {};
        this.state = {
            user: null,
            isAuthenticated: false,
            currentTheme: 'light',
            isLoading: false,
            error: null
        };
        this.subscribers = {};
        this.initialized = false;
        
        // Инициализация
        this.init();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
            logger.info('Инициализация приложения');
            
            // Загрузка модулей
            await this.loadModules();
            
            // Восстановление состояния
            await this.restoreState();
            
            // Инициализация модулей
            await this.initializeModules();
            
            // Настройка обработчиков событий
            this.setupEventListeners();
            
            this.initialized = true;
            this.emit('app:initialized');
            
            logger.info('Приложение успешно инициализировано');
        } catch (error) {
            logger.error('Ошибка инициализации приложения', error);
            this.state.error = error;
            this.emit('app:error', error);
        }
    }

    /**
     * Загрузка модулей приложения
     */
    async loadModules() {
        const moduleConfigs = [
            { name: 'security', class: SecurityModule, required: true },
            { name: 'validator', class: Validator, required: true },
            { name: 'auth', class: AuthModule, required: true },
            { name: 'data', class: DataManager, required: true },
            { name: 'ui', class: UIManager, required: true },
            { name: 'analytics', class: AnalyticsModule, required: false },
            { name: 'notifications', class: NotificationModule, required: false }
        ];

        for (const config of moduleConfigs) {
            try {
                if (window[config.class]) {
                    this.modules[config.name] = new window[config.class]();
                    logger.debug(`Модуль ${config.name} загружен`);
                } else if (config.required) {
                    throw new Error(`Обязательный модуль ${config.name} не найден`);
                }
            } catch (error) {
                if (config.required) {
                    throw error;
                } else {
                    logger.warn(`Опциональный модуль ${config.name} не загружен`, error);
                }
            }
        }
    }

    /**
     * Инициализация загруженных модулей
     */
    async initializeModules() {
        for (const [name, module] of Object.entries(this.modules)) {
            if (typeof module.init === 'function') {
                try {
                    await module.init(this);
                    logger.debug(`Модуль ${name} инициализирован`);
                } catch (error) {
                    logger.error(`Ошибка инициализации модуля ${name}`, error);
                    throw error;
                }
            }
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработка ошибок
        window.addEventListener('error', (event) => {
            logger.error('Глобальная ошибка', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Обработка Promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            logger.error('Необработанный Promise rejection', {
                reason: event.reason
            });
        });

        // Обработка изменения состояния онлайн/офлайн
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.emit('app:online');
            logger.info('Приложение перешло в онлайн режим');
        });

        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.emit('app:offline');
            logger.info('Приложение перешло в офлайн режим');
        });

        // Обработка изменения размера окна
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.emit('app:resize', {
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }, 250);
        });

        // Обработка закрытия страницы
        window.addEventListener('beforeunload', (event) => {
            this.emit('app:beforeunload');
            this.saveState();
        });
    }

    /**
     * Восстановление состояния приложения
     */
    async restoreState() {
        try {
            const savedState = localStorage.getItem('appState');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Восстановление безопасных полей
                this.state.currentTheme = state.currentTheme || 'light';
                this.state.user = state.user || null;
                this.state.isAuthenticated = !!state.user;
                
                logger.debug('Состояние приложения восстановлено');
            }
        } catch (error) {
            logger.error('Ошибка восстановления состояния', error);
        }
    }

    /**
     * Сохранение состояния приложения
     */
    saveState() {
        try {
            const stateToSave = {
                currentTheme: this.state.currentTheme,
                user: this.state.user,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('appState', JSON.stringify(stateToSave));
            logger.debug('Состояние приложения сохранено');
        } catch (error) {
            logger.error('Ошибка сохранения состояния', error);
        }
    }

    /**
     * Обновление состояния приложения
     * @param {Object} newState - новое состояние
     */
    setState(newState) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // Сохраняем важные изменения
        if (newState.user !== undefined || newState.currentTheme !== undefined) {
            this.saveState();
        }
        
        this.emit('state:changed', { prevState, newState });
        logger.debug('Состояние обновлено', { prevState, newState });
    }

    /**
     * Получение текущего состояния
     * @param {string} path - путь к свойству состояния
     * @returns {any} значение состояния
     */
    getState(path = null) {
        if (!path) {
            return this.state;
        }
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    /**
     * Подписка на события
     * @param {string} event - имя события
     * @param {Function} callback - обработчик
     * @returns {Function} функция отписки
     */
    on(event, callback) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        
        this.subscribers[event].push(callback);
        
        // Возвращаем функцию отписки
        return () => {
            this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
        };
    }

    /**
     * Однократная подписка на событие
     * @param {string} event - имя события
     * @param {Function} callback - обработчик
     * @returns {Function} функция отписки
     */
    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        
        return this.on(event, onceCallback);
    }

    /**
     * Отписка от события
     * @param {string} event - имя события
     * @param {Function} callback - обработчик
     */
    off(event, callback) {
        if (this.subscribers[event]) {
            this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Генерация события
     * @param {string} event - имя события
     * @param {any} data - данные события
     */
    emit(event, data = null) {
        if (this.subscribers[event]) {
            this.subscribers[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    logger.error(`Ошибка в обработчике события ${event}`, error);
                }
            });
        }
        
        logger.trace(`Событие: ${event}`, data);
    }

    /**
     * Получение модуля по имени
     * @param {string} moduleName - имя модуля
     * @returns {Object|null} модуль
     */
    getModule(moduleName) {
        return this.modules[moduleName] || null;
    }

    /**
     * Проверка, инициализировано ли приложение
     * @returns {boolean} флаг инициализации
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Проверка, авторизован ли пользователь
     * @returns {boolean} флаг авторизации
     */
    isAuthenticated() {
        return this.state.isAuthenticated && !!this.state.user;
    }

    /**
     * Получение текущего пользователя
     * @returns {Object|null} данные пользователя
     */
    getCurrentUser() {
        return this.state.user;
    }

    /**
     * Установка текущего пользователя
     * @param {Object} user - данные пользователя
     */
    setCurrentUser(user) {
        this.setState({
            user,
            isAuthenticated: !!user
        });
        
        if (user) {
            this.emit('user:login', user);
            logger.info(`Пользователь вошел: ${user.email}`);
        } else {
            this.emit('user:logout');
            logger.info('Пользователь вышел');
        }
    }

    /**
     * Переключение темы
     * @param {string} theme - тема (light/dark)
     */
    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.setState({ currentTheme: theme });
            document.body.classList.toggle('dark-theme', theme === 'dark');
            this.emit('theme:changed', theme);
            logger.info(`Тема изменена на: ${theme}`);
        }
    }

    /**
     * Получение текущей темы
     * @returns {string} текущая тема
     */
    getTheme() {
        return this.state.currentTheme;
    }

    /**
     * Показ/скрытие индикатора загрузки
     * @param {boolean} show - флаг отображения
     */
    setLoading(show) {
        this.setState({ isLoading: show });
        this.emit('loading:changed', show);
        
        // Управление индикатором загрузки
        const loader = document.getElementById('appLoader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Установка ошибки приложения
     * @param {Error|string} error - ошибка
     */
    setError(error) {
        this.setState({ error });
        this.emit('app:error', error);
        logger.error('Ошибка приложения', error);
    }

    /**
     * Очистка ошибки приложения
     */
    clearError() {
        this.setState({ error: null });
        this.emit('app:error-cleared');
    }

    /**
     * Перезагрузка приложения
     */
    reload() {
        logger.info('Перезагрузка приложения');
        window.location.reload();
    }

    /**
     * Получение информации о браузере
     * @returns {Object} информация о браузере
     */
    getBrowserInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            window: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }

    /**
     * Получение информации о приложении
     * @returns {Object} информация о приложении
     */
    getAppInfo() {
        return {
            name: 'Финансовый Помощник',
            version: '2.0.0',
            buildDate: '2024-12-14',
            environment: window.location.hostname === 'localhost' ? 'development' : 'production',
            modules: Object.keys(this.modules),
            initialized: this.initialized
        };
    }
}

// Создаем глобальный экземпляр приложения
window.appCore = new FinanceAppCore();

// Экспорт класса
window.FinanceAppCore = FinanceAppCore;