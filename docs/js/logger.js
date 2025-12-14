/**
 * Модуль логирования для Финансового Помощника
 * Предоставляет централизованное логирование с разными уровнями
 */

class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
        
        this.currentLogLevel = this.getLogLevel();
        this.maxLogEntries = 1000;
        this.logStorageKey = 'financeAppLogs';
        this.logs = this.loadLogs();
        
        // Инициализация обработчика ошибок
        this.initErrorHandling();
    }

    /**
     * Получение уровня логирования из настроек
     * @returns {number} уровень логирования
     */
    getLogLevel() {
        const savedLevel = localStorage.getItem('logLevel');
        if (savedLevel) {
            return parseInt(savedLevel);
        }
        
        // По умолчанию INFO в продакшене, DEBUG в разработке
        return window.location.hostname === 'localhost' ? 
            this.logLevels.DEBUG : this.logLevels.INFO;
    }

    /**
     * Установка уровня логирования
     * @param {number} level - уровень логирования
     */
    setLogLevel(level) {
        this.currentLogLevel = level;
        localStorage.setItem('logLevel', level.toString());
    }

    /**
     * Форматирование временной метки
     * @returns {string} отформатированное время
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Форматирование сообщения лога
     * @param {string} level - уровень лога
     * @param {string} message - сообщение
     * @param {any} data - дополнительные данные
     * @returns {Object} объект лога
     */
    formatLog(level, message, data = null) {
        return {
            timestamp: this.getTimestamp(),
            level,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : null,
            url: window.location.href,
            userAgent: navigator.userAgent,
            stack: level === 'ERROR' ? new Error().stack : null
        };
    }

    /**
     * Запись лога
     * @param {number} level - уровень лога
     * @param {string} message - сообщение
     * @param {any} data - дополнительные данные
     */
    log(level, message, data = null) {
        if (level > this.currentLogLevel) {
            return;
        }

        const logEntry = this.formatLog(
            Object.keys(this.logLevels).find(key => this.logLevels[key] === level),
            message,
            data
        );

        // Добавляем в массив логов
        this.logs.push(logEntry);

        // Ограничиваем количество логов
        if (this.logs.length > this.maxLogEntries) {
            this.logs = this.logs.slice(-this.maxLogEntries);
        }

        // Сохраняем в localStorage
        this.saveLogs();

        // Выводим в консоль
        this.outputToConsole(logEntry);
    }

    /**
     * Вывод лога в консоль
     * @param {Object} logEntry - запись лога
     */
    outputToConsole(logEntry) {
        const { timestamp, level, message, data, stack } = logEntry;
        const prefix = `[${timestamp}] [${level}]`;
        
        switch (level) {
            case 'ERROR':
                console.error(prefix, message, data);
                if (stack) console.error(stack);
                break;
            case 'WARN':
                console.warn(prefix, message, data);
                break;
            case 'INFO':
                console.info(prefix, message, data);
                break;
            case 'DEBUG':
                console.debug(prefix, message, data);
                break;
            case 'TRACE':
                console.log(prefix, message, data);
                break;
            default:
                console.log(prefix, message, data);
        }
    }

    /**
     * Уровень ERROR
     * @param {string} message - сообщение
     * @param {any} data - дополнительные данные
     */
    error(message, data = null) {
        this.log(this.logLevels.ERROR, message, data);
    }

    /**
     * Уровень WARN
     * @param {string} message - сообщение
     * @param {any} data - дополнительные данные
     */
    warn(message, data = null) {
        this.log(this.logLevels.WARN, message, data);
    }

    /**
     * Уровень INFO
     * @param {string} message - сообщение
     * @param {any} data - дополнительные данные
     */
    info(message, data = null) {
        this.log(this.logLevels.INFO, message, data);
    }

    /**
     * Уровень DEBUG
     * @param {string} message - сообщение
     * @param {any} data - дополнительные данные
     */
    debug(message, data = null) {
        this.log(this.logLevels.DEBUG, message, data);
    }

    /**
     * Уровень TRACE
     * @param {string} message - сообщение
     * @param {any} data - дополнительные данные
     */
    trace(message, data = null) {
        this.log(this.logLevels.TRACE, message, data);
    }

    /**
     * Сохранение логов в localStorage
     */
    saveLogs() {
        try {
            localStorage.setItem(this.logStorageKey, JSON.stringify(this.logs));
        } catch (error) {
            console.error('Ошибка сохранения логов:', error);
        }
    }

    /**
     * Загрузка логов из localStorage
     * @returns {Array} массив логов
     */
    loadLogs() {
        try {
            const saved = localStorage.getItem(this.logStorageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Ошибка загрузки логов:', error);
            return [];
        }
    }

    /**
     * Получение логов с фильтрацией
     * @param {Object} filters - фильтры
     * @returns {Array} отфильтрованные логи
     */
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];

        if (filters.level) {
            const levelNum = this.logLevels[filters.level.toUpperCase()];
            if (levelNum !== undefined) {
                filteredLogs = filteredLogs.filter(log => 
                    this.logLevels[log.level] <= levelNum
                );
            }
        }

        if (filters.since) {
            const sinceDate = new Date(filters.since);
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) >= sinceDate
            );
        }

        if (filters.until) {
            const untilDate = new Date(filters.until);
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) <= untilDate
            );
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchTerm)
            );
        }

        return filteredLogs.reverse(); // Новые логи сначала
    }

    /**
     * Очистка логов
     */
    clearLogs() {
        this.logs = [];
        this.saveLogs();
        this.info('Логи очищены');
    }

    /**
     * Экспорт логов в файл
     * @param {Object} filters - фильтры для экспорта
     */
    exportLogs(filters = {}) {
        const logs = this.getLogs(filters);
        const exportData = {
            exportTime: new Date().toISOString(),
            totalLogs: logs.length,
            filters,
            logs
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-app-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.info(`Экспортировано ${logs.length} записей лога`);
    }

    /**
     * Инициализация обработки ошибок
     */
    initErrorHandling() {
        // Обработка необработанных ошибок
        window.addEventListener('error', (event) => {
            this.error('Необработанная ошибка', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error?.stack
            });
        });

        // Обработка необработанных Promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Необработанный Promise rejection', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });

        // Обработка ошибок загрузки ресурсов
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.warn('Ошибка загрузки ресурса', {
                    element: event.target.tagName,
                    source: event.target.src || event.target.href,
                    type: event.target.type
                });
            }
        }, true);
    }

    /**
     * Создание отчета об ошибках
     * @returns {Object} отчет об ошибках
     */
    generateErrorReport() {
        const errorLogs = this.getLogs({ level: 'ERROR' });
        const recentErrors = errorLogs.filter(log => 
            new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        return {
            totalErrors: errorLogs.length,
            recentErrors: recentErrors.length,
            errorTypes: this.getErrorTypes(errorLogs),
            mostFrequentErrors: this.getMostFrequentErrors(errorLogs),
            errorsByHour: this.getErrorsByHour(errorLogs)
        };
    }

    /**
     * Получение типов ошибок
     * @param {Array} errors - массив ошибок
     * @returns {Object} типы ошибок
     */
    getErrorTypes(errors) {
        const types = {};
        errors.forEach(error => {
            const type = error.data?.type || 'Unknown';
            types[type] = (types[type] || 0) + 1;
        });
        return types;
    }

    /**
     * Получение самых частых ошибок
     * @param {Array} errors - массив ошибок
     * @returns {Array} самые частые ошибки
     */
    getMostFrequentErrors(errors) {
        const frequency = {};
        errors.forEach(error => {
            const key = error.message;
            frequency[key] = (frequency[key] || 0) + 1;
        });

        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([message, count]) => ({ message, count }));
    }

    /**
     * Получение ошибок по часам
     * @param {Array} errors - массив ошибок
     * @returns {Object} ошибки по часам
     */
    getErrorsByHour(errors) {
        const byHour = {};
        errors.forEach(error => {
            const hour = new Date(error.timestamp).getHours();
            byHour[hour] = (byHour[hour] || 0) + 1;
        });
        return byHour;
    }

    /**
     * Производительность: измерение времени выполнения
     * @param {string} label - метка измерения
     * @returns {Function} функция для окончания измерения
     */
    time(label) {
        const startTime = performance.now();
        this.debug(`Начато измерение: ${label}`);
        
        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            this.debug(`Завершено измерение: ${label}`, {
                duration: `${duration.toFixed(2)}ms`
            });
            return duration;
        };
    }

    /**
     * Создание контекста логирования с предустановленными данными
     * @param {Object} context - контекст
     * @returns {Object} контекст логировщика
     */
    createContext(context) {
        return {
            error: (message, data) => this.error(message, { ...context, ...data }),
            warn: (message, data) => this.warn(message, { ...context, ...data }),
            info: (message, data) => this.info(message, { ...context, ...data }),
            debug: (message, data) => this.debug(message, { ...context, ...data }),
            trace: (message, data) => this.trace(message, { ...context, ...data })
        };
    }
}

// Создаем глобальный экземпляр логгера
window.logger = new Logger();

// Экспорт класса для возможного создания дополнительных экземпляров
window.Logger = Logger;