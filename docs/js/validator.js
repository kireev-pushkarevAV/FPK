/**
 * Модуль валидации данных для Финансового Помощника
 * Обеспечивает комплексную проверку пользовательских данных
 */

class Validator {
    constructor() {
        this.rules = {
            // Правила для текстовых полей
            text: {
                required: true,
                minLength: 1,
                maxLength: 255,
                pattern: null,
                sanitize: true
            },
            
            // Правила для email
            email: {
                required: true,
                pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                maxLength: 254,
                sanitize: true
            },
            
            // Правила для имени
            name: {
                required: true,
                minLength: 2,
                maxLength: 50,
                pattern: /^[a-zA-Zа-яА-ЯёЁ\s-]+$/,
                sanitize: true
            },
            
            // Правила для пароля
            password: {
                required: true,
                minLength: 8,
                maxLength: 128,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                sanitize: false
            },
            
            // Правила для суммы
            amount: {
                required: true,
                min: 0,
                max: 999999999.99,
                pattern: /^\d+(\.\d{1,2})?$/,
                sanitize: false
            },
            
            // Правила для даты
            date: {
                required: true,
                pattern: /^\d{4}-\d{2}-\d{2}$/,
                sanitize: false
            },
            
            // Правила для описания
            description: {
                required: false,
                minLength: 0,
                maxLength: 500,
                sanitize: true
            },
            
            // Правила для категории
            category: {
                required: true,
                minLength: 2,
                maxLength: 50,
                pattern: /^[a-zA-Zа-яА-ЯёЁ0-9\s-]+$/,
                sanitize: true
            }
        };
        
        this.errorMessages = {
            required: 'Это поле обязательно для заполнения',
            minLength: 'Минимальная длина: {min} символов',
            maxLength: 'Максимальная длина: {max} символов',
            pattern: 'Некорректный формат',
            min: 'Минимальное значение: {min}',
            max: 'Максимальное значение: {max}',
            email: 'Введите корректный email адрес',
            password: 'Пароль должен содержать заглавные/строчные буквы, цифры и специальные символы',
            name: 'Имя может содержать только буквы, пробелы и дефисы',
            amount: 'Введите корректную сумму',
            date: 'Введите корректную дату в формате ГГГГ-ММ-ДД',
            category: 'Категория может содержать только буквы, цифры, пробелы и дефисы'
        };
    }

    /**
     * Валидация одного поля
     * @param {string} fieldName - имя поля
     * @param {any} value - значение для валидации
     * @param {Object} customRules - пользовательские правила
     * @returns {Object} результат валидации
     */
    validateField(fieldName, value, customRules = null) {
        const rules = { ...this.rules[fieldName], ...customRules };
        const result = {
            isValid: true,
            errors: [],
            sanitizedValue: value
        };

        // Если поле не требуется и значение пустое
        if (!rules.required && this.isEmpty(value)) {
            return result;
        }

        // Проверка на обязательность
        if (rules.required && this.isEmpty(value)) {
            result.isValid = false;
            result.errors.push(this.errorMessages.required);
            return result;
        }

        // Преобразуем значение к строке для текстовых полей
        const stringValue = this.isEmpty(value) ? '' : String(value);

        // Санитизация
        if (rules.sanitize) {
            result.sanitizedValue = this.sanitize(stringValue);
        }

        // Проверка длины
        if (rules.minLength && stringValue.length < rules.minLength) {
            result.isValid = false;
            result.errors.push(
                this.errorMessages.minLength.replace('{min}', rules.minLength)
            );
        }

        if (rules.maxLength && stringValue.length > rules.maxLength) {
            result.isValid = false;
            result.errors.push(
                this.errorMessages.maxLength.replace('{max}', rules.maxLength)
            );
        }

        // Проверка числовых значений
        if (rules.min !== undefined || rules.max !== undefined) {
            const numValue = parseFloat(stringValue);
            if (!isNaN(numValue)) {
                if (rules.min !== undefined && numValue < rules.min) {
                    result.isValid = false;
                    result.errors.push(
                        this.errorMessages.min.replace('{min}', rules.min)
                    );
                }
                if (rules.max !== undefined && numValue > rules.max) {
                    result.isValid = false;
                    result.errors.push(
                        this.errorMessages.max.replace('{max}', rules.max)
                    );
                }
            }
        }

        // Проверка по паттерну
        if (rules.pattern && !rules.pattern.test(stringValue)) {
            result.isValid = false;
            result.errors.push(this.errorMessages[fieldName] || this.errorMessages.pattern);
        }

        // Дополнительные проверки для специфических полей
        if (fieldName === 'email') {
            const emailValidation = this.validateEmail(stringValue);
            if (!emailValidation.isValid) {
                result.isValid = false;
                result.errors.push(...emailValidation.errors);
            }
        }

        if (fieldName === 'password') {
            const passwordValidation = this.validatePassword(stringValue);
            if (!passwordValidation.isValid) {
                result.isValid = false;
                result.errors.push(...passwordValidation.errors);
            }
        }

        if (fieldName === 'date') {
            const dateValidation = this.validateDate(stringValue);
            if (!dateValidation.isValid) {
                result.isValid = false;
                result.errors.push(...dateValidation.errors);
            }
        }

        return result;
    }

    /**
     * Валидация формы (множества полей)
     * @param {Object} data - объект с данными формы
     * @param {Object} fieldRules - правила для полей
     * @returns {Object} результат валидации
     */
    validateForm(data, fieldRules) {
        const result = {
            isValid: true,
            errors: {},
            sanitizedData: {}
        };

        for (const [fieldName, rules] of Object.entries(fieldRules)) {
            const fieldValue = data[fieldName];
            const validation = this.validateField(fieldName, fieldValue, rules);

            if (!validation.isValid) {
                result.isValid = false;
                result.errors[fieldName] = validation.errors;
            }

            result.sanitizedData[fieldName] = validation.sanitizedValue;
        }

        return result;
    }

    /**
     * Валидация email
     * @param {string} email - email для проверки
     * @returns {Object} результат валидации
     */
    validateEmail(email) {
        const result = {
            isValid: true,
            errors: []
        };

        if (!email || typeof email !== 'string') {
            result.isValid = false;
            result.errors.push('Email обязателен');
            return result;
        }

        // Базовая проверка формата
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            result.isValid = false;
            result.errors.push('Некорректный формат email');
        }

        // Дополнительные проверки
        if (email.length > 254) {
            result.isValid = false;
            result.errors.push('Email слишком длинный (максимум 254 символа)');
        }

        const [localPart, domain] = email.split('@');
        if (localPart.length > 64) {
            result.isValid = false;
            result.errors.push('Локальная часть email слишком длинная');
        }

        if (domain.length > 253) {
            result.isValid = false;
            result.errors.push('Домен email слишком длинный');
        }

        return result;
    }

    /**
     * Валидация пароля
     * @param {string} password - пароль для проверки
     * @returns {Object} результат валидации
     */
    validatePassword(password) {
        const result = {
            isValid: true,
            errors: [],
            strength: 0,
            suggestions: []
        };

        if (!password || typeof password !== 'string') {
            result.isValid = false;
            result.errors.push('Пароль обязателен');
            return result;
        }

        // Длина
        if (password.length < 8) {
            result.isValid = false;
            result.errors.push('Минимум 8 символов');
        } else if (password.length >= 12) {
            result.strength += 1;
        }

        // Сложность
        if (/[a-z]/.test(password)) {
            result.strength += 1;
        } else {
            result.suggestions.push('Добавьте строчные буквы');
        }

        if (/[A-Z]/.test(password)) {
            result.strength += 1;
        } else {
            result.suggestions.push('Добавьте заглавные буквы');
        }

        if (/\d/.test(password)) {
            result.strength += 1;
        } else {
            result.suggestions.push('Добавьте цифры');
        }

        if (/[^a-zA-Z\d]/.test(password)) {
            result.strength += 1;
        } else {
            result.suggestions.push('Добавьте специальные символы');
        }

        // Проверка на простые пароли
        const commonPasswords = [
            'password', '123456', 'qwerty', 'admin', 'letmein',
            'welcome', 'monkey', 'dragon', 'master', 'sunshine'
        ];
        
        if (commonPasswords.includes(password.toLowerCase())) {
            result.isValid = false;
            result.errors.push('Слишком простой пароль');
        }

        // Проверка на последовательности
        if (this.hasSequentialChars(password)) {
            result.suggestions.push('Избегайте последовательных символов');
        }

        return result;
    }

    /**
     * Валидация даты
     * @param {string} dateString - дата в формате ГГГГ-ММ-ДД
     * @returns {Object} результат валидации
     */
    validateDate(dateString) {
        const result = {
            isValid: true,
            errors: [],
            parsedDate: null
        };

        if (!dateString) {
            result.isValid = false;
            result.errors.push('Дата обязательна');
            return result;
        }

        // Проверка формата
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) {
            result.isValid = false;
            result.errors.push('Некорректный формат даты (ГГГГ-ММ-ДД)');
            return result;
        }

        const date = new Date(dateString);
        result.parsedDate = date;

        // Проверка валидности даты
        if (isNaN(date.getTime())) {
            result.isValid = false;
            result.errors.push('Некорректная дата');
            return result;
        }

        // Проверка на дату в будущем (для большинства полей)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date > today) {
            result.errors.push('Дата не может быть в будущем');
        }

        // Проверка на слишком старую дату
        const minDate = new Date('1900-01-01');
        if (date < minDate) {
            result.errors.push('Дата не может быть ранее 1900 года');
        }

        if (result.errors.length > 0) {
            result.isValid = false;
        }

        return result;
    }

    /**
     * Валидация суммы транзакции
     * @param {number|string} amount - сумма
     * @returns {Object} результат валидации
     */
    validateAmount(amount) {
        const result = {
            isValid: true,
            errors: [],
            parsedAmount: null
        };

        if (amount === null || amount === undefined || amount === '') {
            result.isValid = false;
            result.errors.push('Сумма обязательна');
            return result;
        }

        const numAmount = parseFloat(String(amount).replace(',', '.'));
        result.parsedAmount = numAmount;

        if (isNaN(numAmount)) {
            result.isValid = false;
            result.errors.push('Некорректный формат суммы');
            return result;
        }

        if (numAmount < 0) {
            result.isValid = false;
            result.errors.push('Сумма не может быть отрицательной');
        }

        if (numAmount > 999999999.99) {
            result.isValid = false;
            result.errors.push('Сумма слишком велика');
        }

        // Проверка на количество десятичных знаков
        const decimalPart = String(numAmount).split('.')[1];
        if (decimalPart && decimalPart.length > 2) {
            result.isValid = false;
            result.errors.push('Максимум 2 десятичных знака');
        }

        return result;
    }

    /**
     * Проверка на пустое значение
     * @param {any} value - значение для проверки
     * @returns {boolean} результат проверки
     */
    isEmpty(value) {
        return value === null || 
               value === undefined || 
               value === '' || 
               (Array.isArray(value) && value.length === 0);
    }

    /**
     * Санитизация строки
     * @param {string} input - входная строка
     * @returns {string} санитизированная строка
     */
    sanitize(input) {
        if (typeof input !== 'string') {
            return input;
        }

        return input
            .trim()
            .replace(/\s+/g, ' ') // Заменяем множественные пробелы
            .replace(/[<>]/g, '') // Удаляем потенциально опасные символы
            .substring(0, 1000); // Ограничиваем длину
    }

    /**
     * Проверка на последовательные символы
     * @param {string} str - строка для проверки
     * @returns {boolean} результат проверки
     */
    hasSequentialChars(str) {
        // Проверка на числовые последовательности (123, 234, etc.)
        for (let i = 0; i < str.length - 2; i++) {
            const char1 = str.charCodeAt(i);
            const char2 = str.charCodeAt(i + 1);
            const char3 = str.charCodeAt(i + 2);
            
            if (char2 === char1 + 1 && char3 === char2 + 1) {
                return true;
            }
        }
        return false;
    }

    /**
     * Валидация транзакции
     * @param {Object} transaction - объект транзакции
     * @returns {Object} результат валидации
     */
    validateTransaction(transaction) {
        const fieldRules = {
            type: { required: true, pattern: /^(income|expense)$/ },
            category: this.rules.category,
            amount: this.rules.amount,
            date: this.rules.date,
            description: this.rules.description
        };

        return this.validateForm(transaction, fieldRules);
    }

    /**
     * Валидация данных пользователя
     * @param {Object} userData - объект с данными пользователя
     * @returns {Object} результат валидации
     */
    validateUserRegistration(userData) {
        const fieldRules = {
            name: this.rules.name,
            email: this.rules.email,
            password: this.rules.password,
            passwordConfirm: {
                required: true,
                custom: (value) => {
                    if (value !== userData.password) {
                        return { isValid: false, message: 'Пароли не совпадают' };
                    }
                    return { isValid: true };
                }
            }
        };

        return this.validateForm(userData, fieldRules);
    }

    /**
     * Валидация цели накопления
     * @param {Object} goal - объект цели
     * @returns {Object} результат валидации
     */
    validateGoal(goal) {
        const fieldRules = {
            name: this.rules.category,
            target: this.rules.amount,
            saved: { ...this.rules.amount, required: false },
            deadline: { ...this.rules.date, required: false }
        };

        const result = this.validateForm(goal, fieldRules);

        // Дополнительная проверка: накопленная сумма не может превышать цель
        if (result.sanitizedData.target && result.sanitizedData.saved) {
            if (result.sanitizedData.saved > result.sanitizedData.target) {
                result.isValid = false;
                result.errors.saved = ['Накопленная сумма не может превышать цель'];
            }
        }

        // Проверка даты дедлайна
        if (result.sanitizedData.deadline) {
            const deadlineDate = new Date(result.sanitizedData.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (deadlineDate <= today) {
                result.isValid = false;
                result.errors.deadline = ['Дата дедлайна должна быть в будущем'];
            }
        }

        return result;
    }

    /**
     * Валидация бюджета
     * @param {Object} budget - объект бюджета
     * @returns {Object} результат валидации
     */
    validateBudget(budget) {
        const fieldRules = {
            category: this.rules.category,
            limit: this.rules.amount
        };

        return this.validateForm(budget, fieldRules);
    }
}

// Экспорт модуля валидации
window.Validator = Validator;