/**
 * Модуль аутентификации для Финансового Помощника
 * Обеспечивает безопасную регистрацию и вход пользователей
 */

class AuthModule {
    constructor() {
        this.app = null;
        this.security = null;
        this.validator = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30 минут
        this.sessionTimer = null;
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 минут
    }

    /**
     * Инициализация модуля аутентификации
     * @param {Object} app - экземпляр приложения
     */
    async init(app) {
        this.app = app;
        this.security = app.getModule('security');
        this.validator = app.getModule('validator');

        // Проверка текущей сессии
        await this.checkCurrentSession();

        // Настройка обработчиков событий
        this.setupEventListeners();

        logger.info('Модуль аутентификации инициализирован');
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Отслеживание активности пользователя
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const resetSessionTimer = () => this.resetSessionTimer();

        activityEvents.forEach(event => {
            document.addEventListener(event, resetSessionTimer, true);
        });

        // Отслеживание видимости вкладки
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseSessionTimer();
            } else {
                this.resumeSessionTimer();
            }
        });

        // Отслеживание онлайн/офлайн статуса
        window.addEventListener('online', () => {
            this.app.emit('auth:online');
        });

        window.addEventListener('offline', () => {
            this.app.emit('auth:offline');
        });
    }

    /**
     * Проверка текущей сессии
     */
    async checkCurrentSession() {
        const currentUser = this.app.getCurrentUser();
        if (currentUser) {
            try {
                // Проверяем валидность сессии
                const sessionValid = await this.validateSession(currentUser);
                if (sessionValid) {
                    this.startSessionTimer();
                    this.app.emit('auth:session-validated', currentUser);
                } else {
                    // Сессия недействительна, выполняем выход
                    await this.logout();
                    this.app.emit('auth:session-expired');
                }
            } catch (error) {
                logger.error('Ошибка проверки сессии', error);
                await this.logout();
            }
        }
    }

    /**
     * Валидация сессии
     * @param {Object} user - данные пользователя
     * @returns {boolean} валидность сессии
     */
    async validateSession(user) {
        // Проверяем наличие необходимых полей
        if (!user || !user.id || !user.email) {
            return false;
        }

        // Проверяем время последней активности
        const lastActivity = user.lastActivity ? new Date(user.lastActivity) : new Date(0);
        const now = new Date();
        const timeDiff = now - lastActivity;

        if (timeDiff > this.sessionTimeout) {
            return false;
        }

        return true;
    }

    /**
     * Регистрация нового пользователя
     * @param {Object} registrationData - данные регистрации
     * @returns {Object} результат регистрации
     */
    async register(registrationData) {
        try {
            logger.info('Начало регистрации пользователя', { email: registrationData.email });

            // Валидация данных
            const validation = this.validator.validateUserRegistration(registrationData);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Ошибка валидации данных',
                    errors: validation.errors
                };
            }

            // Проверка блокировки по IP
            const ipCheck = this.security.checkLoginAttempts(registrationData.email);
            if (ipCheck.blocked) {
                return {
                    success: false,
                    message: ipCheck.message
                };
            }

            // Генерация соли и хеширование пароля
            const salt = await this.security.generateSalt();
            const hashedPassword = await this.security.hashPassword(registrationData.password, salt);

            // Подготовка данных пользователя
            const userData = {
                name: validation.sanitizedData.name,
                email: validation.sanitizedData.email.toLowerCase(),
                password: hashedPassword,
                salt: salt,
                created: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                isActive: true,
                emailVerified: false
            };

            // Отправка на сервер
            const response = await this.sendRegistrationRequest(userData);

            if (response.success) {
                // Логирование успешной регистрации
                this.security.logSecurityEvent('USER_REGISTERED', {
                    email: userData.email,
                    ip: await this.getClientIP()
                });

                this.app.emit('auth:registered', response.user);
                logger.info('Пользователь успешно зарегистрирован', { email: userData.email });

                return {
                    success: true,
                    message: 'Регистрация успешна',
                    user: response.user
                };
            } else {
                // Логирование неудачной регистрации
                this.security.logSecurityEvent('REGISTRATION_FAILED', {
                    email: userData.email,
                    reason: response.message
                });

                return {
                    success: false,
                    message: response.message || 'Ошибка регистрации'
                };
            }

        } catch (error) {
            logger.error('Ошибка регистрации', error);
            this.security.logSecurityEvent('REGISTRATION_ERROR', {
                email: registrationData.email,
                error: error.message
            });

            return {
                success: false,
                message: 'Внутренняя ошибка сервера'
            };
        }
    }

    /**
     * Вход пользователя
     * @param {Object} loginData - данные входа
     * @returns {Object} результат входа
     */
    async login(loginData) {
        try {
            logger.info('Попытка входа пользователя', { email: loginData.email });

            // Валидация данных
            const validation = this.validator.validateForm(loginData, {
                email: this.validator.rules.email,
                password: this.validator.rules.password
            });

            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Ошибка валидации данных',
                    errors: validation.errors
                };
            }

            // Проверка блокировки
            const loginCheck = this.security.checkLoginAttempts(loginData.email);
            if (loginCheck.blocked) {
                this.security.logSecurityEvent('LOGIN_BLOCKED', {
                    email: loginData.email,
                    reason: 'Too many attempts'
                });

                return {
                    success: false,
                    message: loginCheck.message
                };
            }

            // Аутентификация на сервере
            const authResult = await this.authenticateUser(loginData);

            if (authResult.success) {
                // Успешный вход
                const user = {
                    ...authResult.user,
                    lastActivity: new Date().toISOString(),
                    sessionId: await this.generateSessionId()
                };

                // Сохранение пользователя
                this.app.setCurrentUser(user);

                // Очистка попыток входа
                this.security.clearLoginAttempts(loginData.email);

                // Запуск таймера сессии
                this.startSessionTimer();

                // Логирование успешного входа
                this.security.logSecurityEvent('LOGIN_SUCCESS', {
                    email: loginData.email,
                    userId: user.id
                });

                this.app.emit('auth:login', user);
                logger.info('Пользователь успешно вошел', { email: loginData.email, userId: user.id });

                return {
                    success: true,
                    message: 'Вход выполнен успешно',
                    user
                };
            } else {
                // Неудачный вход
                this.security.recordFailedLogin(loginData.email);

                this.security.logSecurityEvent('LOGIN_FAILED', {
                    email: loginData.email,
                    reason: authResult.message
                });

                this.app.emit('auth:login-failed', { email: loginData.email });
                logger.warn('Неудачная попытка входа', { email: loginData.email });

                return {
                    success: false,
                    message: authResult.message || 'Неверный email или пароль',
                    attemptsRemaining: loginCheck.attemptsRemaining
                };
            }

        } catch (error) {
            logger.error('Ошибка входа', error);
            this.security.logSecurityEvent('LOGIN_ERROR', {
                email: loginData.email,
                error: error.message
            });

            return {
                success: false,
                message: 'Внутренняя ошибка сервера'
            };
        }
    }

    /**
     * Выход пользователя
     * @param {boolean} force - принудительный выход
     */
    async logout(force = false) {
        try {
            const currentUser = this.app.getCurrentUser();
            if (currentUser) {
                // Логирование выхода
                this.security.logSecurityEvent('USER_LOGOUT', {
                    email: currentUser.email,
                    userId: currentUser.id,
                    force
                });

                // Остановка таймера сессии
                this.stopSessionTimer();

                // Очистка данных пользователя
                this.app.setCurrentUser(null);

                // Очистка сессионных данных
                this.clearSessionData();

                this.app.emit('auth:logout', { force });
                logger.info('Пользователь вышел', { email: currentUser.email });
            }
        } catch (error) {
            logger.error('Ошибка выхода', error);
        }
    }

    /**
     * Отправка запроса регистрации
     * @param {Object} userData - данные пользователя
     * @returns {Object} результат регистрации
     */
    async sendRegistrationRequest(userData) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': await this.security.generateCSRFToken()
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            return result;
        } catch (error) {
            logger.error('Ошибка отправки запроса регистрации', error);
            throw error;
        }
    }

    /**
     * Аутентификация пользователя
     * @param {Object} loginData - данные входа
     * @returns {Object} результат аутентификации
     */
    async authenticateUser(loginData) {
        try {
            // Сначала пробуем локальную аутентификацию
            const localAuth = await this.authenticateLocally(loginData);
            if (localAuth.success) {
                return localAuth;
            }

            // Если локальная не удалась, пробуем серверную
            return await this.authenticateOnServer(loginData);
        } catch (error) {
            logger.error('Ошибка аутентификации', error);
            throw error;
        }
    }

    /**
     * Локальная аутентификация
     * @param {Object} loginData - данные входа
     * @returns {Object} результат аутентификации
     */
    async authenticateLocally(loginData) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === loginData.email.toLowerCase());

            if (!user) {
                return { success: false, message: 'Пользователь не найден' };
            }

            // Проверка пароля
            const hashedPassword = await this.security.hashPassword(loginData.password, user.salt || '');
            if (hashedPassword !== user.password) {
                return { success: false, message: 'Неверный пароль' };
            }

            return { success: true, user };
        } catch (error) {
            logger.error('Ошибка локальной аутентификации', error);
            return { success: false, message: 'Ошибка аутентификации' };
        }
    }

    /**
     * Серверная аутентификация
     * @param {Object} loginData - данные входа
     * @returns {Object} результат аутентификации
     */
    async authenticateOnServer(loginData) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': await this.security.generateCSRFToken()
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();
            return result;
        } catch (error) {
            logger.error('Ошибка серверной аутентификации', error);
            return { success: false, message: 'Ошибка соединения с сервером' };
        }
    }

    /**
     * Генерация ID сессии
     * @returns {string} ID сессии
     */
    async generateSessionId() {
        return await this.security.generateSecureRandom(32);
    }

    /**
     * Запуск таймера сессии
     */
    startSessionTimer() {
        this.stopSessionTimer();
        this.sessionTimer = setTimeout(() => {
            this.sessionExpired();
        }, this.sessionTimeout);
    }

    /**
     * Остановка таймера сессии
     */
    stopSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    /**
     * Сброс таймера сессии
     */
    resetSessionTimer() {
        if (this.app.isAuthenticated()) {
            this.startSessionTimer();
            
            // Обновляем время последней активности
            const currentUser = this.app.getCurrentUser();
            if (currentUser) {
                currentUser.lastActivity = new Date().toISOString();
                this.app.setCurrentUser(currentUser);
            }
        }
    }

    /**
     * Пауза таймера сессии
     */
    pauseSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    /**
     * Возобновление таймера сессии
     */
    resumeSessionTimer() {
        if (this.app.isAuthenticated()) {
            this.startSessionTimer();
        }
    }

    /**
     * Истечение сессии
     */
    async sessionExpired() {
        logger.warn('Сессия истекла');
        
        this.security.logSecurityEvent('SESSION_EXPIRED', {
            userId: this.app.getCurrentUser()?.id
        });

        await this.logout(true);
        this.app.emit('auth:session-expired');
    }

    /**
     * Очистка сессионных данных
     */
    clearSessionData() {
        try {
            // Удаляем сессионные данные
            sessionStorage.removeItem('csrfToken');
            sessionStorage.removeItem('csrfTimestamp');
            
            // Очищаем временные данные
            localStorage.removeItem('tempUserData');
            
            logger.debug('Сессионные данные очищены');
        } catch (error) {
            logger.error('Ошибка очистки сессионных данных', error);
        }
    }

    /**
     * Получение IP адреса клиента
     * @returns {string} IP адрес
     */
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            logger.warn('Не удалось получить IP адрес', error);
            return 'unknown';
        }
    }

    /**
     * Проверка силы пароля
     * @param {string} password - пароль для проверки
     * @returns {Object} результат проверки
     */
    checkPasswordStrength(password) {
        return this.security.validatePassword(password);
    }

    /**
     * Проверка валидности email
     * @param {string} email - email для проверки
     * @returns {boolean} результат проверки
     */
    validateEmail(email) {
        return this.security.validateEmail(email);
    }

    /**
     * Получение информации о текущей сессии
     * @returns {Object} информация о сессии
     */
    getSessionInfo() {
        const currentUser = this.app.getCurrentUser();
        if (!currentUser) {
            return {
                authenticated: false,
                remainingTime: 0
            };
        }

        const lastActivity = new Date(currentUser.lastActivity || 0);
        const now = new Date();
        const elapsed = now - lastActivity;
        const remaining = Math.max(0, this.sessionTimeout - elapsed);

        return {
            authenticated: true,
            userId: currentUser.id,
            email: currentUser.email,
            lastActivity: currentUser.lastActivity,
            sessionId: currentUser.sessionId,
            remainingTime: remaining,
            expiresAt: new Date(now.getTime() + remaining).toISOString()
        };
    }

    /**
     * Продление сессии
     * @returns {boolean} результат продления
     */
    async extendSession() {
        if (!this.app.isAuthenticated()) {
            return false;
        }

        try {
            const currentUser = this.app.getCurrentUser();
            currentUser.lastActivity = new Date().toISOString();
            
            this.app.setCurrentUser(currentUser);
            this.startSessionTimer();

            this.app.emit('auth:session-extended', currentUser);
            logger.info('Сессия продлена', { userId: currentUser.id });

            return true;
        } catch (error) {
            logger.error('Ошибка продления сессии', error);
            return false;
        }
    }

    /**
     * Проверка безопасности пароля
     * @param {string} password - пароль
     * @param {Object} userData - данные пользователя
     * @returns {Object} результат проверки
     */
    async validatePasswordSecurity(password, userData = {}) {
        const result = {
            isSecure: true,
            warnings: [],
            score: 0
        };

        // Проверка длины
        if (password.length < 12) {
            result.warnings.push('Рекомендуется использовать пароль длиной не менее 12 символов');
            result.isSecure = false;
        }

        // Проверка на использование данных пользователя
        if (userData.name && password.toLowerCase().includes(userData.name.toLowerCase())) {
            result.warnings.push('Пароль не должен содержать ваше имя');
            result.isSecure = false;
        }

        if (userData.email && password.toLowerCase().includes(userData.email.toLowerCase().split('@')[0])) {
            result.warnings.push('Пароль не должен содержать часть вашего email');
            result.isSecure = false;
        }

        // Проверка на простые паттерны
        const commonPatterns = [
            /123456/,
            /password/i,
            /qwerty/i,
            /admin/i,
            /letmein/i
        ];

        commonPatterns.forEach(pattern => {
            if (pattern.test(password)) {
                result.warnings.push('Пароль содержит слишком простой паттерн');
                result.isSecure = false;
            }
        });

        // Расчет оценки
        result.score = this.security.validatePassword(password).score;

        return result;
    }
}

// Экспорт модуля
window.AuthModule = AuthModule;