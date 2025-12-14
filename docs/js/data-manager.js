/**
 * Модуль управления данными для Финансового Помощника
 * Обеспечивает централизованную работу с данными пользователя
 */

class DataManager {
    constructor() {
        this.app = null;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
        this.syncInProgress = false;
        this.syncQueue = [];
        this.lastSyncTime = 0;
        this.offlineMode = false;
        
        // Ключи хранения
        this.storageKeys = {
            user: 'currentUser',
            transactions: 'transactions',
            categories: 'categories',
            budgets: 'budgets',
            goals: 'goals',
            settings: 'userSettings',
            lastSync: 'lastSyncTime'
        };
    }

    /**
     * Инициализация модуля данных
     * @param {Object} app - экземпляр приложения
     */
    async init(app) {
        this.app = app;
        
        // Проверка онлайн статуса
        this.offlineMode = !navigator.onLine;
        
        // Настройка обработчиков событий
        this.setupEventListeners();
        
        // Загрузка базовых данных
        await this.loadInitialData();
        
        // Попытка синхронизации
        if (!this.offlineMode) {
            await this.syncWithServer();
        }
        
        // Используем консоль до инициализации логгера
        console.info('Модуль управления данными инициализирован');
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Изменение онлайн статуса
        window.addEventListener('online', () => {
            this.offlineMode = false;
            this.syncQueue.forEach(operation => this.processSyncOperation(operation));
            this.syncQueue = [];
            this.syncWithServer();
        });

        window.addEventListener('offline', () => {
            this.offlineMode = true;
            console.warn('Приложение перешло в офлайн режим');
        });

        // Периодическая синхронизация
        setInterval(() => {
            if (!this.offlineMode && !this.syncInProgress) {
                this.syncWithServer();
            }
        }, 60000); // Каждую минуту
    }

    /**
     * Загрузка начальных данных
     */
    async loadInitialData() {
        try {
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                await this.loadUserData(currentUser.id);
            }
            
            console.debug('Начальные данные загружены');
        } catch (error) {
            logger.error('Ошибка загрузки начальных данных', error);
            throw error;
        }
    }

    /**
     * Получение текущего пользователя
     * @returns {Object|null} данные пользователя
     */
    getCurrentUser() {
        try {
            const userData = localStorage.getItem(this.storageKeys.user);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Ошибка получения текущего пользователя', error);
            return null;
        }
    }

    /**
     * Установка текущего пользователя
     * @param {Object} user - данные пользователя
     */
    setCurrentUser(user) {
        try {
            if (user) {
                localStorage.setItem(this.storageKeys.user, JSON.stringify(user));
                this.loadUserData(user.id);
            } else {
                localStorage.removeItem(this.storageKeys.user);
                this.clearCache();
            }
        } catch (error) {
            console.error('Ошибка установки пользователя', error);
        }
    }

    /**
     * Загрузка данных пользователя
     * @param {number} userId - ID пользователя
     */
    async loadUserData(userId) {
        const cacheKey = `userData_${userId}`;
        
        // Проверка кэша
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            let userData = null;
            
            // Сначала пробуем загрузить с сервера
            if (!this.offlineMode) {
                userData = await this.loadFromServer(userId);
            }
            
            // Если сервер недоступен, загружаем из localStorage
            if (!userData) {
                userData = this.loadFromLocalStorage(userId);
            }
            
            // Сохраняем в кэш
            this.cache.set(cacheKey, {
                data: userData,
                timestamp: Date.now()
            });
            
            console.debug(`Данные пользователя ${userId} загружены`);
            return userData;
            
        } catch (error) {
            console.error(`Ошибка загрузки данных пользователя ${userId}`, error);
            // Возвращаем данные из localStorage как резерв
            return this.loadFromLocalStorage(userId);
        }
    }

    /**
     * Загрузка данных с сервера
     * @param {number} userId - ID пользователя
     * @returns {Object|null} данные пользователя
     */
    async loadFromServer(userId) {
        try {
            const response = await fetch(`/api/user/${userId}/data`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.lastSyncTime = Date.now();
                    localStorage.setItem(this.storageKeys.lastSync, this.lastSyncTime.toString());
                    return data;
                }
            }
        } catch (error) {
            console.warn('Ошибка загрузки данных с сервера', error);
        }
        return null;
    }

    /**
     * Загрузка данных из localStorage
     * @param {number} userId - ID пользователя
     * @returns {Object} данные пользователя
     */
    loadFromLocalStorage(userId) {
        const userKey = `user_${userId}`;
        const savedData = localStorage.getItem(userKey);
        
        if (savedData) {
            try {
                return JSON.parse(savedData);
            } catch (error) {
                console.error('Ошибка парсинга данных из localStorage', error);
            }
        }
        
        // Возвращаем структуру по умолчанию
        return {
            transactions: [],
            incomeCategories: ['Зарплата', 'Фриланс', 'Инвестиции', 'Бонусы', 'Подарки'],
            expenseCategories: ['Продукты', 'Транспорт', 'Развлечения', 'ЖКХ', 'Здоровье', 'Образование', 'Прочее'],
            budgets: [],
            goals: []
        };
    }

    /**
     * Сохранение данных пользователя
     * @param {Object} data - данные для сохранения
     */
    async saveUserData(data) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            throw new Error('Пользователь не авторизован');
        }

        try {
            // Валидация данных
            const validation = this.app.getModule('validator').validateForm(data, {
                transactions: { required: true, type: 'array' },
                incomeCategories: { required: true, type: 'array' },
                expenseCategories: { required: true, type: 'array' },
                budgets: { required: true, type: 'array' },
                goals: { required: true, type: 'array' }
            });

            if (!validation.isValid) {
                throw new Error('Ошибка валидации данных');
            }

            // Сохранение в localStorage
            this.saveToLocalStorage(currentUser.id, data);
            
            // Обновление кэша
            const cacheKey = `userData_${currentUser.id}`;
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            // Синхронизация с сервером
            if (!this.offlineMode) {
                await this.syncToServer(currentUser.id, data);
            } else {
                // Добавляем в очередь синхронизации
                this.syncQueue.push({
                    type: 'save',
                    userId: currentUser.id,
                    data,
                    timestamp: Date.now()
                });
            }

            logger.debug('Данные пользователя сохранены');
            
        } catch (error) {
            console.error('Ошибка сохранения данных пользователя', error);
            throw error;
        }
    }

    /**
     * Сохранение данных в localStorage
     * @param {number} userId - ID пользователя
     * @param {Object} data - данные для сохранения
     */
    saveToLocalStorage(userId, data) {
        const userKey = `user_${userId}`;
        localStorage.setItem(userKey, JSON.stringify(data));
    }

    /**
     * Синхронизация с сервером
     * @param {number} userId - ID пользователя
     * @param {Object} data - данные для синхронизации
     */
    async syncToServer(userId, data) {
        if (this.syncInProgress) {
            return;
        }

        this.syncInProgress = true;

        try {
            const response = await fetch(`/api/user/${userId}/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.lastSyncTime = Date.now();
                    localStorage.setItem(this.storageKeys.lastSync, this.lastSyncTime.toString());
                    this.app.emit('data:synced', { userId, timestamp: this.lastSyncTime });
                }
            }
        } catch (error) {
            console.warn('Ошибка синхронизации с сервером', error);
            // Добавляем в очередь для повторной попытки
            this.syncQueue.push({
                type: 'save',
                userId,
                data,
                timestamp: Date.now()
            });
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Синхронизация с сервером
     */
    async syncWithServer() {
        const currentUser = this.getCurrentUser();
        if (!currentUser || this.offlineMode) {
            return;
        }

        try {
            const serverData = await this.loadFromServer(currentUser.id);
            if (serverData) {
                // Сравниваем с локальными данными
                const localData = await this.loadUserData(currentUser.id);
                
                if (this.hasDataChanges(localData, serverData)) {
                    // Есть изменения, нужно разрешить конфликты
                    const resolvedData = this.resolveDataConflicts(localData, serverData);
                    await this.saveUserData(resolvedData);
                    this.app.emit('data:conflicts-resolved', { localData, serverData, resolvedData });
                }
            }
        } catch (error) {
            console.warn('Ошибка синхронизации', error);
        }
    }

    /**
     * Проверка наличия изменений в данных
     * @param {Object} localData - локальные данные
     * @param {Object} serverData - серверные данные
     * @returns {boolean} наличие изменений
     */
    hasDataChanges(localData, serverData) {
        const localHash = this.hashData(localData);
        const serverHash = this.hashData(serverData);
        return localHash !== serverHash;
    }

    /**
     * Создание хэша данных
     * @param {Object} data - данные для хэширования
     * @returns {string} хэш данных
     */
    hashData(data) {
        return btoa(JSON.stringify(data)).slice(0, 16);
    }

    /**
     * Разрешение конфликтов данных
     * @param {Object} localData - локальные данные
     * @param {Object} serverData - серверные данные
     * @returns {Object} разрешенные данные
     */
    resolveDataConflicts(localData, serverData) {
        // Простая стратегия: объединяем данные, отдавая приоритет более новым
        const resolved = {
            transactions: this.mergeArrays(localData.transactions || [], serverData.transactions || []),
            incomeCategories: [...new Set([...(localData.incomeCategories || []), ...(serverData.incomeCategories || [])])],
            expenseCategories: [...new Set([...(localData.expenseCategories || []), ...(serverData.expenseCategories || [])])],
            budgets: this.mergeArrays(localData.budgets || [], serverData.budgets || []),
            goals: this.mergeArrays(localData.goals || [], serverData.goals || [])
        };

        return resolved;
    }

    /**
     * Объединение массивов с удалением дубликатов
     * @param {Array} localArray - локальный массив
     * @param {Array} serverArray - серверный массив
     * @returns {Array} объединенный массив
     */
    mergeArrays(localArray, serverArray) {
        const merged = [...localArray];
        const existingIds = new Set(localArray.map(item => item.id));

        serverArray.forEach(item => {
            if (!existingIds.has(item.id)) {
                merged.push(item);
            } else {
                // Обновляем существующий элемент, если серверный новее
                const localIndex = merged.findIndex(localItem => localItem.id === item.id);
                if (localIndex !== -1) {
                    const localUpdated = new Date(merged[localIndex].updated || 0);
                    const serverUpdated = new Date(item.updated || 0);
                    
                    if (serverUpdated > localUpdated) {
                        merged[localIndex] = item;
                    }
                }
            }
        });

        return merged;
    }

    /**
     * Получение транзакций
     * @param {Object} filters - фильтры
     * @returns {Array} отфильтрованные транзакции
     */
    async getTransactions(filters = {}) {
        const userData = await this.getCurrentUserData();
        let transactions = userData.transactions || [];

        // Применение фильтров
        if (filters.type) {
            transactions = transactions.filter(t => t.type === filters.type);
        }

        if (filters.category) {
            transactions = transactions.filter(t => t.category === filters.category);
        }

        if (filters.dateFrom) {
            transactions = transactions.filter(t => new Date(t.date) >= new Date(filters.dateFrom));
        }

        if (filters.dateTo) {
            transactions = transactions.filter(t => new Date(t.date) <= new Date(filters.dateTo));
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            transactions = transactions.filter(t => 
                t.description?.toLowerCase().includes(searchTerm) ||
                t.category?.toLowerCase().includes(searchTerm)
            );
        }

        // Сортировка
        if (filters.sort) {
            transactions.sort((a, b) => {
                switch (filters.sort) {
                    case 'date-desc':
                        return new Date(b.date) - new Date(a.date);
                    case 'date-asc':
                        return new Date(a.date) - new Date(b.date);
                    case 'amount-desc':
                        return b.amount - a.amount;
                    case 'amount-asc':
                        return a.amount - b.amount;
                    default:
                        return 0;
                }
            });
        }

        return transactions;
    }

    /**
     * Добавление транзакции
     * @param {Object} transaction - данные транзакции
     */
    async addTransaction(transaction) {
        const userData = await this.getCurrentUserData();
        
        // Валидация
        const validation = this.app.getModule('validator').validateTransaction(transaction);
        if (!validation.isValid) {
            throw new Error('Ошибка валидации транзакции: ' + validation.errors.join(', '));
        }

        // Добавление ID и временной метки
        const newTransaction = {
            ...transaction,
            id: Date.now(),
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        userData.transactions.push(newTransaction);
        await this.saveUserData(userData);

        this.app.emit('data:transaction-added', newTransaction);
        console.info('Транзакция добавлена', newTransaction);

        return newTransaction;
    }

    /**
     * Удаление транзакции
     * @param {number} transactionId - ID транзакции
     */
    async deleteTransaction(transactionId) {
        const userData = await this.getCurrentUserData();
        const initialLength = userData.transactions.length;

        userData.transactions = userData.transactions.filter(t => t.id !== transactionId);
        
        if (userData.transactions.length === initialLength) {
            throw new Error('Транзакция не найдена');
        }

        await this.saveUserData(userData);

        this.app.emit('data:transaction-deleted', transactionId);
        console.info('Транзакция удалена', { id: transactionId });
    }

    /**
     * Получение текущих данных пользователя
     * @returns {Object} данные пользователя
     */
    async getCurrentUserData() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            throw new Error('Пользователь не авторизован');
        }

        return await this.loadUserData(currentUser.id);
    }

    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
        console.debug('Кэш очищен');
    }

    /**
     * Экспорт данных
     * @param {Object} options - опции экспорта
     * @returns {Object} экспортированные данные
     */
    async exportData(options = {}) {
        const userData = await this.getCurrentUserData();
        const currentUser = this.getCurrentUser();

        const exportData = {
            user: {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email
            },
            exportDate: new Date().toISOString(),
            version: '2.0.0',
            data: {}
        };

        // Включаем только запрошенные данные
        if (options.includeTransactions !== false) {
            exportData.data.transactions = userData.transactions;
        }

        if (options.includeCategories !== false) {
            exportData.data.incomeCategories = userData.incomeCategories;
            exportData.data.expenseCategories = userData.expenseCategories;
        }

        if (options.includeBudgets !== false) {
            exportData.data.budgets = userData.budgets;
        }

        if (options.includeGoals !== false) {
            exportData.data.goals = userData.goals;
        }

        return exportData;
    }

    /**
     * Импорт данных
     * @param {Object} importData - данные для импорта
     * @param {Object} options - опции импорта
     */
    async importData(importData, options = {}) {
        try {
            // Валидация структуры импорта
            if (!importData.data) {
                throw new Error('Некорректная структура данных для импорта');
            }

            const userData = await this.getCurrentUserData();

            // Слияние данных в соответствии с опциями
            if (options.mergeTransactions !== false && importData.data.transactions) {
                userData.transactions = this.mergeArrays(
                    userData.transactions || [],
                    importData.data.transactions
                );
            }

            if (options.mergeCategories !== false && importData.data.incomeCategories) {
                userData.incomeCategories = [
                    ...new Set([...(userData.incomeCategories || []), ...importData.data.incomeCategories])
                ];
            }

            if (options.mergeCategories !== false && importData.data.expenseCategories) {
                userData.expenseCategories = [
                    ...new Set([...(userData.expenseCategories || []), ...importData.data.expenseCategories])
                ];
            }

            if (options.mergeBudgets !== false && importData.data.budgets) {
                userData.budgets = this.mergeArrays(
                    userData.budgets || [],
                    importData.data.budgets
                );
            }

            if (options.mergeGoals !== false && importData.data.goals) {
                userData.goals = this.mergeArrays(
                    userData.goals || [],
                    importData.data.goals
                );
            }

            await this.saveUserData(userData);

            this.app.emit('data:imported', { importData, options });
            console.info('Данные импортированы', { options });

        } catch (error) {
            console.error('Ошибка импорта данных', error);
            throw error;
        }
    }

    /**
     * Получение статистики синхронизации
     * @returns {Object} статистика
     */
    getSyncStats() {
        return {
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress,
            offlineMode: this.offlineMode,
            queueLength: this.syncQueue.length,
            cacheSize: this.cache.size
        };
    }
}

// Экспорт модуля
window.DataManager = DataManager;
