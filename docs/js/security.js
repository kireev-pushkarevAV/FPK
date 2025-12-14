/**
 * Модуль безопасности для Финансового Помощника
 * Обеспечивает безопасную обработку данных, валидацию и защиту от атак
 */

class SecurityModule {
    constructor() {
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 минут
        this.sanitizationPatterns = {
            xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
            html: /<[^>]*>/g,
            specialChars: /[<>\"'&]/g
        };
        this.loginAttempts = this.getLoginAttempts();
    }

    /**
     * Генерация криптографически безопасной случайной строки
     * @param {number} length - длина строки
     * @returns {string} случайная строка
     */
    async generateSecureRandom(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Безопасное хеширование пароля с солью
     * @param {string} password - пароль
     * @param {string} salt - соль
     * @returns {Promise<string>} хеш пароля
     */
    async hashPassword(password, salt) {
        if (!password || !salt) {
            throw new Error('Пароль и соль обязательны для хеширования');
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Генерация соли для пароля
     * @param {number} length - длина соли
     * @returns {Promise<string>} сгенерированная соль
     */
    async generateSalt(length = 16) {
        return this.generateSecureRandom(length);
    }

    /**
     * Валидация email адреса
     * @param {string} email - email для проверки
     * @returns {boolean} результат валидации
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    /**
     * Валидация силы пароля
     * @param {string} password - пароль для проверки
     * @returns {Object} объект с результатом проверки
     */
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return {
                isValid: false,
                errors: ['Пароль обязателен'],
                score: 0
            };
        }

        const errors = [];
        let score = 0;

        // Длина
        if (password.length < 8) {
            errors.push('Минимум 8 символов');
        } else {
            score += 1;
            if (password.length >= 12) score += 1;
        }

        // Сложность
        if (/[a-z]/.test(password)) score += 1;
        else errors.push('Добавьте строчные буквы');

        if (/[A-Z]/.test(password)) score += 1;
        else errors.push('Добавьте заглавные буквы');

        if (/\d/.test(password)) score += 1;
        else errors.push('Добавьте цифры');

        if (/[^a-zA-Z\d]/.test(password)) score += 1;
        else errors.push('Добавьте специальные символы');

        // Запрещенные простые пароли
        const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Слишком простой пароль');
            score = 0;
        }

        return {
            isValid: errors.length === 0 && score >= 4,
            errors,
            score: Math.min(score, 5),
            strength: this.getPasswordStrengthText(score)
        };
    }

    /**
     * Получение текстового описания силы пароля
     * @param {number} score - оценка силы пароля
     * @returns {string} текстовое описание
     */
    getPasswordStrengthText(score) {
        const strengthLevels = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Сильный', 'Очень сильный'];
        return strengthLevels[Math.min(score, 5)];
    }

    /**
     * Санитизация пользовательского ввода
     * @param {string} input - пользовательский ввод
     * @param {string} type - тип санитизации (xss, sql, html, all)
     * @returns {string} санитизированная строка
     */
    sanitizeInput(input, type = 'all') {
        if (!input || typeof input !== 'string') {
            return '';
        }

        let sanitized = input.trim();

        switch (type) {
            case 'xss':
                sanitized = sanitized.replace(this.sanitizationPatterns.xss, '');
                break;
            case 'sql':
                sanitized = sanitized.replace(this.sanitizationPatterns.sql, '');
                break;
            case 'html':
                sanitized = sanitized.replace(this.sanitizationPatterns.html, '');
                break;
            case 'all':
            default:
                // Применяем все паттерны санитизации
                Object.values(this.sanitizationPatterns).forEach(pattern => {
                    sanitized = sanitized.replace(pattern, '');
                });
                break;
        }

        // Дополнительная проверка на потенциально опасный контент
        if (this.containsMaliciousContent(sanitized)) {
            console.warn('Обнаружен потенциально опасный контент:', input);
            return '';
        }

        return sanitized;
    }

    /**
     * Проверка на вредоносный контент
     * @param {string} input - строка для проверки
     * @returns {boolean} результат проверки
     */
    containsMaliciousContent(input) {
        const maliciousPatterns = [
            /javascript:/gi,
            /data:text\/html/gi,
            /vbscript:/gi,
            /onload=/gi,
            /onerror=/gi,
            /onclick=/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi
        ];

        return maliciousPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Проверка попыток входа
     * @param {string} email - email пользователя
     * @returns {Object} результат проверки
     */
    checkLoginAttempts(email) {
        const now = Date.now();
        const attempts = this.loginAttempts[email] || [];

        // Удаляем старые попытки (старше lockoutDuration)
        const recentAttempts = attempts.filter(timestamp => 
            now - timestamp < this.lockoutDuration
        );

        this.loginAttempts[email] = recentAttempts;

        if (recentAttempts.length >= this.maxLoginAttempts) {
            const oldestAttempt = Math.min(...recentAttempts);
            const timeRemaining = this.lockoutDuration - (now - oldestAttempt);
            
            return {
                blocked: true,
                timeRemaining,
                message: `Слишком много попыток входа. Попробуйте снова через ${Math.ceil(timeRemaining / 60000)} минут.`
            };
        }

        return {
            blocked: false,
            attemptsRemaining: this.maxLoginAttempts - recentAttempts.length
        };
    }

    /**
     * Регистрация неудачной попытки входа
     * @param {string} email - email пользователя
     */
    recordFailedLogin(email) {
        if (!this.loginAttempts[email]) {
            this.loginAttempts[email] = [];
        }
        this.loginAttempts[email].push(Date.now());
        this.saveLoginAttempts();
    }

    /**
     * Очистка попыток входа после успешной аутентификации
     * @param {string} email - email пользователя
     */
    clearLoginAttempts(email) {
        delete this.loginAttempts[email];
        this.saveLoginAttempts();
    }

    /**
     * Сохранение попыток входа в localStorage
     */
    saveLoginAttempts() {
        try {
            localStorage.setItem('loginAttempts', JSON.stringify(this.loginAttempts));
        } catch (error) {
            console.error('Ошибка сохранения попыток входа:', error);
        }
    }

    /**
     * Загрузка попыток входа из localStorage
     * @returns {Object} объект с попытками входа
     */
    getLoginAttempts() {
        try {
            const saved = localStorage.getItem('loginAttempts');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Ошибка загрузки попыток входа:', error);
            return {};
        }
    }

    /**
     * Генерация CSRF токена
     * @returns {Promise<string>} CSRF токен
     */
    async generateCSRFToken() {
        const token = await this.generateSecureRandom(32);
        const timestamp = Date.now();
        const payload = `${token}:${timestamp}`;
        
        // Сохраняем токен в sessionStorage (более безопасно, чем localStorage)
        try {
            sessionStorage.setItem('csrfToken', token);
            sessionStorage.setItem('csrfTimestamp', timestamp.toString());
        } catch (error) {
            console.error('Ошибка сохранения CSRF токена:', error);
        }
        
        return token;
    }

    /**
     * Проверка CSRF токена
     * @param {string} token - токен для проверки
     * @returns {boolean} результат проверки
     */
    validateCSRFToken(token) {
        try {
            const storedToken = sessionStorage.getItem('csrfToken');
            const storedTimestamp = sessionStorage.getItem('csrfTimestamp');
            
            if (!storedToken || !storedTimestamp || token !== storedToken) {
                return false;
            }

            // Проверяем срок действия токена (1 час)
            const age = Date.now() - parseInt(storedTimestamp);
            return age < 3600000; // 1 час в миллисекундах
        } catch (error) {
            console.error('Ошибка валидации CSRF токена:', error);
            return false;
        }
    }

    /**
     * Безопасное получение данных из localStorage
     * @param {string} key - ключ
     * @param {any} defaultValue - значение по умолчанию
     * @returns {any} полученные данные
     */
    secureLocalStorageGet(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            
            // Пытаемся распарсить JSON
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error(`Ошибка получения данных из localStorage (${key}):`, error);
            return defaultValue;
        }
    }

    /**
     * Безопасное сохранение данных в localStorage
     * @param {string} key - ключ
     * @param {any} value - значение
     * @returns {boolean} результат операции
     */
    secureLocalStorageSet(key, value) {
        try {
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
            return true;
        } catch (error) {
            console.error(`Ошибка сохранения данных в localStorage (${key}):`, error);
            return false;
        }
    }

    /**
     * Безопасное удаление данных из localStorage
     * @param {string} key - ключ
     */
    secureLocalStorageRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Ошибка удаления данных из localStorage (${key}):`, error);
        }
    }

    /**
     * Логирование событий безопасности
     * @param {string} event - тип события
     * @param {Object} details - детали события
     */
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            details,
            userAgent: navigator.userAgent,
            ip: details.ip || 'unknown'
        };

        try {
            const logs = this.secureLocalStorageGet('securityLogs', []);
            logs.push(logEntry);
            
            // Храним только последние 100 записей
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            this.secureLocalStorageSet('securityLogs', logs);
            
            // Для критических событий выводим в консоль
            if (['LOGIN_FAILED', 'SECURITY_VIOLATION', 'BLOCKED_LOGIN'].includes(event)) {
                console.warn('Security Event:', logEntry);
            }
        } catch (error) {
            console.error('Ошибка логирования события безопасности:', error);
        }
    }

    /**
     * Получение логов безопасности
     * @param {number} limit - ограничение количества записей
     * @returns {Array} массив логов
     */
    getSecurityLogs(limit = 50) {
        try {
            const logs = this.secureLocalStorageGet('securityLogs', []);
            return logs.slice(-limit);
        } catch (error) {
            console.error('Ошибка получения логов безопасности:', error);
            return [];
        }
    }
}

// Экспорт модуля безопасности
window.SecurityModule = SecurityModule;