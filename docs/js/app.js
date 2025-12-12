// Финансовый Помощник ФПК - Основной JavaScript файл
class FinanceApp {
    constructor() {
        this.currentUser = null;
        this.transactions = [];
        this.incomeCategories = [];
        this.expenseCategories = [];
        this.budgets = [];
        this.goals = [];
        this.trendChart = null;
        this.init();
    }

    // Инициализация приложения
    init() {
        this.loadTheme();
        this.checkAuthStatus();
        this.initDates();
        this.initEventListeners();
    }

    // Загрузка темы
    loadTheme() {
        let savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            // Автоматическое определение темы по системным настройкам
            savedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            const themeToggle = document.getElementById('themeToggle');
            const loginThemeToggle = document.getElementById('loginThemeToggle');
            if (themeToggle) themeToggle.classList.add('active');
            if (loginThemeToggle) loginThemeToggle.classList.add('active');
        }
    }

    // Инициализация обработчиков событий
    initEventListeners() {
        // Отложим добавление обработчиков, чтобы DOM успел загрузиться
        setTimeout(() => {
            this.addThemeToggleListeners();
        }, 100);
    }

    // Добавление обработчиков для кнопок темы
    addThemeToggleListeners() {
        console.log('Adding theme toggle listeners...');
        
        // Переключение темы
        const themeToggle = document.getElementById('themeToggle');
        const loginThemeToggle = document.getElementById('loginThemeToggle');
        
        console.log('Theme toggle element:', themeToggle);
        console.log('Login theme toggle element:', loginThemeToggle);
        
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                console.log('Theme toggle clicked!');
                e.preventDefault();
                this.toggleTheme();
            });
            console.log('Theme toggle listener added');
        } else {
            console.log('Theme toggle element not found');
        }
        
        if (loginThemeToggle) {
            loginThemeToggle.addEventListener('click', (e) => {
                console.log('Login theme toggle clicked!');
                e.preventDefault();
                this.toggleTheme();
            });
            console.log('Login theme toggle listener added');
        } else {
            console.log('Login theme toggle element not found');
        }

        // Форма входа
        const loginForm = document.querySelector('.login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Кнопка "Далее" на форме входа
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.showPasswordField());
        }

        // Кнопка переключения формы регистрации
        const registerToggleBtn = document.querySelector('.login-secondary-btn');
        if (registerToggleBtn) {
            registerToggleBtn.addEventListener('click', () => this.toggleRegister());
        }

        // Форма регистрации
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Кнопка выхода
        const logoutBtn = document.querySelector('button[onclick="handleLogout()"]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Переключение вкладок
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('onclick').match(/switchTab\('(.+?)'\)/)[1];
                this.switchTab(tabName);
            });
        });

        // Изменение типа операции
        const transType = document.getElementById('transType');
        if (transType) {
            transType.addEventListener('change', () => this.updateCategoryOptions());
        }

        // Фильтры операций
        const filterType = document.getElementById('filterType');
        const filterPeriod = document.getElementById('filterPeriod');
        const filterSort = document.getElementById('filterSort');
        
        if (filterType) filterType.addEventListener('change', () => this.updateTransactionsList());
        if (filterPeriod) filterPeriod.addEventListener('change', () => this.updateTransactionsList());
        if (filterSort) filterSort.addEventListener('change', () => this.updateTransactionsList());
    }

    // Переключение темы
    toggleTheme() {
        const body = document.body;
        const loginScreen = document.getElementById('loginScreen');
        const themeToggle = document.getElementById('themeToggle');
        const loginThemeToggle = document.getElementById('loginThemeToggle');

        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            if (loginScreen) loginScreen.classList.remove('dark-theme');
            if (themeToggle) themeToggle.classList.remove('active');
            if (loginThemeToggle) loginThemeToggle.classList.remove('active');
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.add('dark-theme');
            if (loginScreen) loginScreen.classList.add('dark-theme');
            if (themeToggle) themeToggle.classList.add('active');
            if (loginThemeToggle) loginThemeToggle.classList.add('active');
            localStorage.setItem('theme', 'dark');
        }
        
        // Обновляем цвета графика при смене темы
        if (this.trendChart) {
            const isDarkTheme = body.classList.contains('dark-theme');
            this.trendChart.options.plugins.legend.labels.color = isDarkTheme ? '#f9fafb' : '#1f2937';
            this.trendChart.options.scales.x.grid.color = isDarkTheme ? '#374151' : '#e5e7eb';
            this.trendChart.options.scales.x.ticks.color = isDarkTheme ? '#d1d5db' : '#6b7280';
            this.trendChart.options.scales.y.grid.color = isDarkTheme ? '#374151' : '#e5e7eb';
            this.trendChart.options.scales.y.ticks.color = isDarkTheme ? '#d1d5db' : '#6b7280';
            
            // Обновляем цвета точек
            this.trendChart.data.datasets[0].pointBorderColor = isDarkTheme ? '#1f2937' : 'white';
            this.trendChart.data.datasets[1].pointBorderColor = isDarkTheme ? '#1f2937' : 'white';
            
            this.trendChart.update();
        }
    }

    // Функция показа поля пароля
    showPasswordField() {
        const email = document.getElementById('loginEmail').value;
        if (!email) {
            alert('Введите email или телефон');
            return;
        }

        const passwordField = document.getElementById('loginPassword');
        const nextBtn = document.getElementById('nextBtn');
        const loginBtn = document.getElementById('loginBtn');

        if (passwordField) passwordField.style.display = 'block';
        if (nextBtn) nextBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
        
        if (passwordField) passwordField.focus();
    }

    // Проверка статуса авторизации
    checkAuthStatus() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showAppScreen();
            this.loadUserData();
        } else {
            this.showLoginScreen();
        }
    }

    // Переключение между экранами
    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const appScreen = document.getElementById('appScreen');
        
        if (loginScreen) loginScreen.classList.add('active');
        if (appScreen) appScreen.style.display = 'none';
    }

    showAppScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const appScreen = document.getElementById('appScreen');
        const userGreeting = document.getElementById('userGreeting');
        
        if (loginScreen) loginScreen.classList.remove('active');
        if (appScreen) appScreen.style.display = 'block';
        if (userGreeting && this.currentUser) {
            userGreeting.textContent = `Привет, ${this.currentUser.name}! 👋`;
        }
    }

    // Обработка входа
    async handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!password) {
            alert('Введите пароль');
            return;
        }

        try {
            // Проверяем локальное хранилище
            const users = JSON.parse(localStorage.getItem('users')) || [];
            let user = users.find(u => u.email === email && u.password === password);

            // Если не найдено локально, пробуем сервер
            if (!user) {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        user = data.user;
                    }
                }
            }

            if (user) {
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // Очистка формы
                const emailField = document.getElementById('loginEmail');
                const passwordField = document.getElementById('loginPassword');
                if (emailField) emailField.value = '';
                if (passwordField) passwordField.value = '';
                
                // Сброс формы
                this.resetLoginForm();
                
                this.showAppScreen();
                this.loadUserData();
            } else {
                alert('❌ Неверный email или пароль!');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('❌ Ошибка при входе. Попробуйте позже.');
        }
    }

    // Сброс формы входа
    resetLoginForm() {
        const passwordField = document.getElementById('loginPassword');
        const nextBtn = document.getElementById('nextBtn');
        const loginBtn = document.getElementById('loginBtn');
        
        if (passwordField) passwordField.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
    }

    // Обработка регистрации
    async handleRegister(event) {
        event.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const password2 = document.getElementById('regPassword2').value;

        if (password !== password2) {
            alert('❌ Пароли не совпадают!');
            return;
        }

        if (password.length < 6) {
            alert('❌ Пароль должен содержать минимум 6 символов!');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    alert('✅ Аккаунт создан! Теперь вы можете войти.');
                    this.toggleRegister();
                    const emailField = document.getElementById('loginEmail');
                    if (emailField) emailField.value = email;
                    
                    // Очистка формы регистрации
                    this.clearRegisterForm();
                } else {
                    alert('❌ ' + data.message);
                }
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            // Если сервер недоступен, пробуем локальную регистрацию
            this.registerUserLocally(name, email, password);
        }
    }

    // Локальная регистрация (резервный вариант)
    registerUserLocally(name, email, password) {
        const users = JSON.parse(localStorage.getItem('users')) || [];

        if (users.find(u => u.email === email)) {
            alert('❌ Пользователь с такой почтой уже существует!');
            return;
        }

        const newUser = {
            id: Date.now(),
            name,
            email,
            password,
            created: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        alert('✅ Аккаунт создан! Теперь вы можете войти.');
        this.toggleRegister();
        
        const emailField = document.getElementById('loginEmail');
        if (emailField) emailField.value = email;
        
        this.clearRegisterForm();
    }

    // Очистка формы регистрации
    clearRegisterForm() {
        const nameField = document.getElementById('regName');
        const emailField = document.getElementById('regEmail');
        const passwordField = document.getElementById('regPassword');
        const password2Field = document.getElementById('regPassword2');
        
        if (nameField) nameField.value = '';
        if (emailField) emailField.value = '';
        if (passwordField) passwordField.value = '';
        if (password2Field) password2Field.value = '';
    }

    // Переключение формы регистрации - ИСПРАВЛЕНО!
    toggleRegister() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authToggleText = document.getElementById('authToggleText');
        
        if (loginForm && registerForm && authToggleText) {
            const isRegisterVisible = registerForm.style.display !== 'none';
            
            if (isRegisterVisible) {
                // Показываем форму входа
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                authToggleText.textContent = 'Нет аккаунта? Зарегистрироваться';
                
                // Сбрасываем форму входа
                this.resetLoginForm();
            } else {
                // Показываем форму регистрации
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                authToggleText.textContent = 'Есть аккаунт? Войти';
                
                // Очищаем форму регистрации
                this.clearRegisterForm();
            }
        }
    }

    // Обработка выхода
    handleLogout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            this.currentUser = null;
            localStorage.removeItem('currentUser');
            this.showLoginScreen();
            
            const emailField = document.getElementById('loginEmail');
            const passwordField = document.getElementById('loginPassword');
            if (emailField) emailField.value = '';
            if (passwordField) passwordField.value = '';
            
            this.resetLoginForm();
        }
    }

    // Загрузка данных пользователя
    async loadUserData() {
        if (!this.currentUser) return;

        const userKey = `user_${this.currentUser.id}`;
        
        try {
            // Сначала пробуем загрузить с сервера
            const response = await fetch(`/api/user/${this.currentUser.id}/data`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.transactions = data.transactions || [];
                    this.incomeCategories = data.incomeCategories || ['Зарплата', 'Фриланс', 'Инвестиции', 'Бонусы', 'Подарки'];
                    this.expenseCategories = data.expenseCategories || ['Продукты', 'Транспорт', 'Развлечения', 'ЖКХ', 'Здоровье', 'Образование', 'Прочее'];
                    this.budgets = data.budgets || [];
                    this.goals = data.goals || [];
                    
                    // Сохраняем в локальное хранилище как резерв
                    this.saveUserDataLocally();
                } else {
                    throw new Error('Server data unavailable');
                }
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            // Загружаем из локального хранилища
            this.loadUserDataLocally(userKey);
        }

        this.updateDashboard();
        this.updateTransactionsList();
        this.renderCategories();
        this.updateBudgetCategoryOptions();
        this.renderBudgets();
        this.updateBudgetStats();
        this.renderGoals();
        this.updateGoalStats();
    }

    // Загрузка данных из локального хранилища
    loadUserDataLocally(userKey) {
        const userData = JSON.parse(localStorage.getItem(userKey)) || {};
        this.transactions = userData.transactions || [];
        this.incomeCategories = userData.incomeCategories || ['Зарплата', 'Фриланс', 'Инвестиции', 'Бонусы', 'Подарки'];
        this.expenseCategories = userData.expenseCategories || ['Продукты', 'Транспорт', 'Развлечения', 'ЖКХ', 'Здоровье', 'Образование', 'Прочее'];
        this.budgets = userData.budgets || [];
        this.goals = userData.goals || [];
    }

    // Сохранение данных пользователя
    async saveUserData() {
        if (!this.currentUser) return;

        const userData = {
            transactions: this.transactions,
            incomeCategories: this.incomeCategories,
            expenseCategories: this.expenseCategories,
            budgets: this.budgets,
            goals: this.goals
        };

        // Сохраняем локально как резерв
        this.saveUserDataLocally(userData);

        try {
            // Пробуем сохранить на сервере
            const response = await fetch(`/api/user/${this.currentUser.id}/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                throw new Error('Server error');
            }
        } catch (error) {
            console.error('Error saving user data:', error);
            // Данные уже сохранены локально, так что продолжаем работу
        }
    }

    // Сохранение данных в локальное хранилище
    saveUserDataLocally(userData = null) {
        const userKey = `user_${this.currentUser.id}`;
        const dataToSave = userData || {
            transactions: this.transactions,
            incomeCategories: this.incomeCategories,
            expenseCategories: this.expenseCategories,
            budgets: this.budgets,
            goals: this.goals
        };
        localStorage.setItem(userKey, JSON.stringify(dataToSave));
    }

    // Инициализация дат
    initDates() {
        const transDate = document.getElementById('transDate');
        if (transDate) {
            transDate.valueAsDate = new Date();
        }
    }

    // Переключение вкладок
    switchTab(tabName) {
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => tab.classList.remove('active'));

        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(btn => btn.classList.remove('active'));

        const targetTab = document.getElementById(tabName);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Находим соответствующую кнопку и делаем её активной
        buttons.forEach(btn => {
            if (btn.textContent.includes(this.getTabTitle(tabName))) {
                btn.classList.add('active');
            }
        });

        if (tabName === 'analytics') {
            this.updateAnalytics();
            setTimeout(() => this.renderTrendChart(), 100);
        }
        if (tabName === 'strategies') this.updateStrategies();
        if (tabName === 'budget') {
            this.updateBudgetCategoryOptions();
            this.renderBudgets();
            this.updateBudgetStats();
        }
        if (tabName === 'achievements') this.renderAchievements();
        if (tabName === 'piggybank') {
            this.renderGoals();
            this.updateGoalStats();
        }
    }

    // Получение заголовка вкладки
    getTabTitle(tabName) {
        const titles = {
            'transactions': 'Операции',
            'categories': 'Категории',
            'analytics': 'Аналитика',
            'strategies': 'Стратегии',
            'budget': 'Бюджет',
            'achievements': 'Достижения',
            'piggybank': 'Копилка',
            'sync': 'Синхронизация'
        };
        return titles[tabName] || tabName;
    }

    // Обновление опций категорий
    updateCategoryOptions() {
        const type = document.getElementById('transType').value;
        const categorySelect = document.getElementById('transCategory');
        if (!categorySelect) return;

        const categories = type === 'income' ? this.incomeCategories : this.expenseCategories;

        categorySelect.innerHTML = categories.map(cat => 
            `<option value="${cat.toLowerCase().replace(/\s+/g, '-')}">${cat}</option>`
        ).join('');
    }

    // Добавление операции
    addTransaction() {
        const type = document.getElementById('transType').value;
        const category = document.getElementById('transCategory').value;
        const amount = parseFloat(document.getElementById('transAmount').value);
        const date = document.getElementById('transDate').value;
        const description = document.getElementById('transDescription').value;

        if (!amount || !date) {
            alert('Заполните сумму и дату');
            return;
        }

        const transaction = {
            id: Date.now(),
            type,
            category,
            amount,
            date,
            description,
            created: new Date().toISOString()
        };

        this.transactions.push(transaction);
        this.saveUserData();

        // Очистка формы
        const amountField = document.getElementById('transAmount');
        const descriptionField = document.getElementById('transDescription');
        const dateField = document.getElementById('transDate');
        
        if (amountField) amountField.value = '';
        if (descriptionField) descriptionField.value = '';
        if (dateField) dateField.valueAsDate = new Date();

        this.updateTransactionsList();
        this.updateDashboard();
        alert('Операция добавлена!');
    }

    // Получение категории для отображения
    getCategoryLabel(categoryKey) {
        const allCats = [...this.incomeCategories, ...this.expenseCategories];
        return allCats.find(cat => cat.toLowerCase().replace(/\s+/g, '-') === categoryKey) || categoryKey;
    }

    // Получение класса категории
    getCategoryClass(categoryKey) {
        const classMap = {
            'продукты': 'food',
            'транспорт': 'transport',
            'развлечения': 'entertainment',
            'жкх': 'utilities',
            'здоровье': 'healthcare',
            'образование': 'education',
            'зарплата': 'salary',
            'фриланс': 'freelance',
            'инвестиции': 'investment',
            'прочее': 'other'
        };

        for (let key in classMap) {
            if (categoryKey.includes(key)) return classMap[key];
        }
        return 'other';
    }

    // Обновление списка операций
    updateTransactionsList() {
        const filterType = document.getElementById('filterType')?.value;
        const filterPeriod = document.getElementById('filterPeriod')?.value;
        const filterSort = document.getElementById('filterSort')?.value;
        const transactionsList = document.getElementById('transactionsList');
        
        if (!transactionsList) return;

        let filtered = this.transactions.filter(t => {
            if (filterType && t.type !== filterType) return false;

            const tDate = new Date(t.date);
            const now = new Date();
            const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
            const quarterAgo = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            const yearAgo = new Date(now.getFullYear(), 0, 1);

            if (filterPeriod === 'month' && tDate < monthAgo) return false;
            if (filterPeriod === 'quarter' && tDate < quarterAgo) return false;
            if (filterPeriod === 'year' && tDate < yearAgo) return false;

            return true;
        });

        // Сортировка
        if (filterSort) {
            filtered.sort((a, b) => {
                if (filterSort === 'date-desc') return new Date(b.date) - new Date(a.date);
                if (filterSort === 'date-asc') return new Date(a.date) - new Date(b.date);
                if (filterSort === 'amount-desc') return b.amount - a.amount;
                if (filterSort === 'amount-asc') return a.amount - b.amount;
            });
        }

        const html = filtered.length === 0 
            ? '<div class="empty-state"><p>Операций не найдено</p></div>'
            : filtered.map(t => `
                <div class="transaction-item ${t.type}">
                    <div class="transaction-info">
                        <h4>${this.getCategoryLabel(t.category)}</h4>
                        <p>${t.description || 'Без описания'} • ${new Date(t.date).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div class="transaction-amount amount-${t.type}">
                            ${t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('ru-RU')} ₽
                        </div>
                        <button class="btn btn-danger btn-small" onclick="app.deleteTransaction(${t.id})">✕</button>
                    </div>
                </div>
            `).join('');

        transactionsList.innerHTML = html;
    }

    // Удаление операции
    deleteTransaction(id) {
        if (confirm('Удалить операцию?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveUserData();
            this.updateTransactionsList();
            this.updateDashboard();
        }
    }

    // Обновление Dashboard
    updateDashboard() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = income - expense;
        const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;

        const totalIncomeEl = document.getElementById('totalIncome');
        const totalExpenseEl = document.getElementById('totalExpense');
        const netBalanceEl = document.getElementById('netBalance');
        const savingsRateEl = document.getElementById('savingsRate');

        if (totalIncomeEl) totalIncomeEl.textContent = income.toLocaleString('ru-RU') + ' ₽';
        if (totalExpenseEl) totalExpenseEl.textContent = expense.toLocaleString('ru-RU') + ' ₽';
        if (netBalanceEl) netBalanceEl.textContent = balance.toLocaleString('ru-RU') + ' ₽';
        if (savingsRateEl) savingsRateEl.textContent = savingsRate + '%';

        // Обновление уведомлений и прогноза
        this.updateNotifications();
        this.updateForecast();
    }

    // Добавление категории доходов
    addIncomeCategory() {
        const input = document.getElementById('newIncomeCategory');
        if (!input) return;
        
        const cat = input.value.trim();
        if (cat && !this.incomeCategories.includes(cat)) {
            this.incomeCategories.push(cat);
            this.saveUserData();
            input.value = '';
            this.renderCategories();
            this.updateCategoryOptions();
        }
    }

    // Добавление категории расходов
    addExpenseCategory() {
        const input = document.getElementById('newExpenseCategory');
        if (!input) return;
        
        const cat = input.value.trim();
        if (cat && !this.expenseCategories.includes(cat)) {
            this.expenseCategories.push(cat);
            this.saveUserData();
            input.value = '';
            this.renderCategories();
        }
    }

    // Отрисовка категорий
    renderCategories() {
        const incomeCategoriesEl = document.getElementById('incomeCategories');
        const expenseCategoriesEl = document.getElementById('expenseCategories');

        if (incomeCategoriesEl) {
            const incomeHTML = this.incomeCategories.map(cat => 
                `<div class="category-badge salary">${cat} <button onclick="app.removeCategory('income', '${cat}')" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: 5px;">✕</button></div>`
            ).join('');
            incomeCategoriesEl.innerHTML = incomeHTML || 'Нет категорий';
        }

        if (expenseCategoriesEl) {
            const expenseHTML = this.expenseCategories.map(cat => 
                `<div class="category-badge other">${cat} <button onclick="app.removeCategory('expense', '${cat}')" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: 5px;">✕</button></div>`
            ).join('');
            expenseCategoriesEl.innerHTML = expenseHTML || 'Нет категорий';
        }
    }

    // Удаление категории
    removeCategory(type, cat) {
        if (type === 'income') {
            this.incomeCategories = this.incomeCategories.filter(c => c !== cat);
        } else {
            this.expenseCategories = this.expenseCategories.filter(c => c !== cat);
        }
        this.saveUserData();
        this.renderCategories();
        this.updateCategoryOptions();
    }

    // Обновление аналитики
    updateAnalytics() {
        const income = this.transactions.filter(t => t.type === 'income');
        const expense = this.transactions.filter(t => t.type === 'expense');

        const totalIncome = income.reduce((s, t) => s + t.amount, 0);
        const totalExpense = expense.reduce((s, t) => s + t.amount, 0);

        // Доходы по категориям
        const incomeByCategory = {};
        income.forEach(t => {
            const cat = this.getCategoryLabel(t.category);
            incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount;
        });

        // Расходы по категориям
        const expenseByCategory = {};
        expense.forEach(t => {
            const cat = this.getCategoryLabel(t.category);
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
        });

        // Таблицы
        const incomeChartTableEl = document.getElementById('incomeChartTable');
        const expenseChartTableEl = document.getElementById('expenseChartTable');

        if (incomeChartTableEl) {
            const incomeTableHTML = Object.entries(incomeByCategory)
                .map(([cat, amount]) => `
                    <tr>
                        <td>${cat}</td>
                        <td>${amount.toLocaleString('ru-RU')} ₽</td>
                        <td>${((amount / totalIncome) * 100).toFixed(1)}%</td>
                    </tr>
                `).join('');
            incomeChartTableEl.innerHTML = incomeTableHTML || '<tr><td colspan="3">Нет данных</td></tr>';
        }

        if (expenseChartTableEl) {
            const expenseTableHTML = Object.entries(expenseByCategory)
                .map(([cat, amount]) => `
                    <tr>
                        <td>${cat}</td>
                        <td>${amount.toLocaleString('ru-RU')} ₽</td>
                        <td>${((amount / totalExpense) * 100).toFixed(1)}%</td>
                    </tr>
                `).join('');
            expenseChartTableEl.innerHTML = expenseTableHTML || '<tr><td colspan="3">Нет данных</td></tr>';
        }

        // Метрики
        const savingsCoeffEl = document.getElementById('savingsCoeff');
        const incomRatioEl = document.getElementById('incomRatio');
        const dailyAvgEl = document.getElementById('dailyAvg');

        if (savingsCoeffEl || incomRatioEl || dailyAvgEl) {
            const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;
            const incomeRatio = totalExpense > 0 ? (totalIncome / totalExpense).toFixed(2) : '∞';
            const dailyAvg = (totalExpense / 30).toFixed(0);

            if (savingsCoeffEl) savingsCoeffEl.textContent = savingsRate + '%';
            if (incomRatioEl) incomRatioEl.textContent = incomeRatio;
            if (dailyAvgEl) dailyAvgEl.textContent = dailyAvg + ' ₽';
        }
    }

    // Рендеринг графика трендов
    renderTrendChart() {
        const canvas = document.getElementById('trendChartCanvas');
        if (!canvas) return;

        // Проверяем, доступен ли Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js не загружен');
            return;
        }

        // Группировка по месяцам за последние 6 месяцев
        const months = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = date.getMonth();

            const monthIncome = this.transactions
                .filter(t => t.type === 'income' && new Date(t.date).getFullYear() === year && new Date(t.date).getMonth() === month)
                .reduce((sum, t) => sum + t.amount, 0);

            const monthExpense = this.transactions
                .filter(t => t.type === 'expense' && new Date(t.date).getFullYear() === year && new Date(t.date).getMonth() === month)
                .reduce((sum, t) => sum + t.amount, 0);

            const monthName = date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
            months.push(monthName);
            incomeData.push(monthIncome);
            expenseData.push(monthExpense);
        }

        if (this.trendChart) {
            this.trendChart.data.labels = months;
            this.trendChart.data.datasets[0].data = incomeData;
            this.trendChart.data.datasets[1].data = expenseData;
            this.trendChart.update();
        } else {
            const isDarkTheme = document.body.classList.contains('dark-theme');
            this.trendChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Доходы',
                            data: incomeData,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#10b981',
                            pointBorderColor: isDarkTheme ? '#1f2937' : 'white',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8
                        },
                        {
                            label: 'Расходы',
                            data: expenseData,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#ef4444',
                            pointBorderColor: isDarkTheme ? '#1f2937' : 'white',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: isDarkTheme ? '#f9fafb' : '#1f2937',
                                font: {
                                    size: 12
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: isDarkTheme ? '#374151' : '#e5e7eb',
                                drawBorder: false
                            },
                            ticks: {
                                color: isDarkTheme ? '#d1d5db' : '#6b7280'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: isDarkTheme ? '#374151' : '#e5e7eb',
                                drawBorder: false
                            },
                            ticks: {
                                color: isDarkTheme ? '#d1d5db' : '#6b7280'
                            }
                        }
                    }
                }
            });
        }
    }

    // Прогноз расходов
    updateForecast() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Средние расходы за последние 3 месяца
        const last3MonthsExpense = [];
        for (let i = 0; i < 3; i++) {
            const checkDate = new Date();
            checkDate.setMonth(currentMonth - i);
            const monthExpense = this.transactions
                .filter(t => {
                    const tDate = new Date(t.date);
                    return t.type === 'expense' && tDate.getMonth() === checkDate.getMonth() && tDate.getFullYear() === checkDate.getFullYear();
                })
                .reduce((sum, t) => sum + t.amount, 0);
            if (monthExpense > 0) last3MonthsExpense.push(monthExpense);
        }

        const avgMonthlyExpense = last3MonthsExpense.length > 0 
            ? Math.round(last3MonthsExpense.reduce((a, b) => a + b) / last3MonthsExpense.length)
            : 0;

        const currentMonthExpense = this.transactions
            .filter(t => {
                const tDate = new Date(t.date);
                return t.type === 'expense' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const daysLeft = new Date(currentYear, currentMonth + 1, 0).getDate() - now.getDate();
        const avgDailyExpense = currentMonthExpense / (now.getDate() || 1);
        const projectedMonthlyExpense = currentMonthExpense + (avgDailyExpense * daysLeft);

        const monthlyForecast = projectedMonthlyExpense > 0 ? Math.round(projectedMonthlyExpense) : avgMonthlyExpense;
        const dailyLimit = daysLeft > 0 ? Math.round((avgMonthlyExpense - currentMonthExpense) / daysLeft) : 0;

        const currentIncome = this.transactions
            .filter(t => {
                const tDate = new Date(t.date);
                return t.type === 'income' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const projectedBalance = currentIncome - monthlyForecast;

        const monthlyForecastEl = document.getElementById('monthlyForecast');
        const dailyLimitEl = document.getElementById('dailyLimit');
        const projectedBalanceEl = document.getElementById('projectedBalance');

        if (monthlyForecastEl) monthlyForecastEl.textContent = monthlyForecast.toLocaleString('ru-RU');
        if (dailyLimitEl) dailyLimitEl.textContent = Math.max(0, dailyLimit).toLocaleString('ru-RU');
        if (projectedBalanceEl) projectedBalanceEl.textContent = projectedBalance.toLocaleString('ru-RU');
    }

    // Система уведомлений
    updateNotifications() {
        const notifications = [];

        // Проверка приближения к лимиту бюджета
        this.budgets.forEach(budget => {
            const spent = this.transactions
                .filter(t => t.type === 'expense' && this.getCategoryLabel(t.category) === budget.category)
                .reduce((sum, t) => sum + t.amount, 0);

            const percent = (spent / budget.limit) * 100;

            if (spent > budget.limit) {
                notifications.push({
                    type: 'danger',
                    icon: '❌',
                    title: 'Превышен лимит',
                    message: `${budget.category}: превышено на ${(spent - budget.limit).toLocaleString('ru-RU')} ₽`,
                    priority: 10
                });
            } else if (percent > 80) {
                notifications.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: 'Близко к лимиту',
                    message: `${budget.category}: ${percent.toFixed(0)}% от лимита`,
                    priority: 8
                });
            }
        });

        // Проверка достижений
        this.checkAchievements().forEach(achievement => {
            if (achievement.unlocked && !achievement.notified) {
                notifications.push({
                    type: 'success',
                    icon: '🏆',
                    title: 'Новое достижение!',
                    message: `Разблокировано: ${achievement.name}`,
                    priority: 9
                });
            }
        });

        // Сортировка по приоритету
        notifications.sort((a, b) => b.priority - a.priority);

        const notificationsList = document.getElementById('notificationsList');
        const badge = document.getElementById('notificationBadge');

        if (notifications.length === 0) {
            if (notificationsList) notificationsList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light);">Нет новых уведомлений</div>';
            if (badge) badge.style.display = 'none';
        } else {
            if (notificationsList) {
                notificationsList.innerHTML = notifications.map((n, index) => `
                    <div style="padding: 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.3s ease;" onmouseover="this.style.background='var(--bg-light)'" onmouseout="this.style.background='white'" onclick="app.dismissNotification(this)">
                        <div style="display: flex; gap: 12px; align-items: flex-start;">
                            <div style="font-size: 1.3em;">${n.icon}</div>
                            <div style="flex: 1;">
                                <strong style="display: block; margin-bottom: 4px;">${n.title}</strong>
                                <p style="margin: 0; color: var(--text-light); font-size: 0.9em;">${n.message}</p>
                            </div>
                            <button style="background: none; border: none; color: var(--text-light); cursor: pointer; font-size: 1.2em; padding: 0;" onclick="event.stopPropagation(); app.dismissNotification(this.closest('div'))">✕</button>
                        </div>
                    </div>
                `).join('');
            }

            if (badge) {
                badge.textContent = Math.min(notifications.length, 9);
                badge.style.display = 'flex';
               
                // Проверяем, открыта ли панель
                const panel = document.getElementById('notificationsPanel');
                if (panel && panel.style.display === 'block') {
                    badge.style.display = 'none';
                }
            }
        }

        // Переключение панели уведомлений
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            notificationBell.onclick = (e) => {
                e.stopPropagation();
                const panel = document.getElementById('notificationsPanel');
                const badge = document.getElementById('notificationBadge');
               
                if (panel && panel.style.display === 'none') {
                    panel.style.display = 'block';
                    if (badge) badge.style.display = 'none';
                } else if (panel) {
                    panel.style.display = 'none';
                }
            };
        }

        // Закрытие при клике вне панели
        document.onclick = (e) => {
            const bell = document.getElementById('notificationBell');
            const panel = document.getElementById('notificationsPanel');
            const badge = document.getElementById('notificationBadge');
           
            if (bell && panel && !bell.contains(e.target) && !panel.contains(e.target)) {
                panel.style.display = 'none';
                if (badge) badge.style.display = 'none';
            }
        };
    }

    // Функция закрытия уведомлений
    closeNotifications() {
        const panel = document.getElementById('notificationsPanel');
        const badge = document.getElementById('notificationBadge');
        
        if (panel) panel.style.display = 'none';
        if (badge) badge.style.display = 'none';
    }

    // Функция удаления уведомления
    dismissNotification(element) {
        element.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            element.remove();
            // Обновляем счётчик бейджа
            const remaining = document.querySelectorAll('#notificationsList > div:not([style*="animation"])').length;
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                if (remaining === 0) {
                    badge.style.display = 'none';
                } else {
                    badge.textContent = Math.min(remaining, 9);
                }
            }
        }, 300);
    }

    // Проверка достижений
    checkAchievements() {
        const achievements = [
            {
                id: 'first-transaction',
                name: '🎯 Стартер',
                description: 'Добавьте первую операцию',
                points: 10,
                unlocked: this.transactions.length > 0
            },
            {
                id: 'savings-10',
                name: '💰 Экономист',
                description: 'Экономьте 10%+ дохода 1 месяц',
                points: 25,
                unlocked: this.checkMonthlySavings(0.1)
            },
            {
                id: 'budget-keeper',
                name: '⚡ Дисциплина',
                description: 'Не превышайте бюджет 3 месяца подряд',
                points: 50,
                unlocked: this.checkBudgetDiscipline(3)
            },
            {
                id: 'analytics-user',
                name: '📊 Аналитик',
                description: 'Используйте аналитику 5 раз',
                points: 20,
                unlocked: (localStorage.getItem('analyticsViews') || 0) >= 5
            },
            {
                id: 'goals-creator',
                name: '🏦 Мечтатель',
                description: 'Создайте 3 цели накопления',
                points: 30,
                unlocked: this.goals.length >= 3
            },
            {
                id: 'millionaire',
                name: '🎊 Миллионер',
                description: 'Накопите 1 млн ₽ во всех целях',
                points: 100,
                unlocked: this.goals.reduce((sum, g) => sum + (g.saved || 0), 0) >= 1000000
            }
        ];

        return achievements;
    }

    // Проверка месячной экономии
    checkMonthlySavings(targetPercent) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthIncome = this.transactions
            .filter(t => {
                const tDate = new Date(t.date);
                return t.type === 'income' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const monthExpense = this.transactions
            .filter(t => {
                const tDate = new Date(t.date);
                return t.type === 'expense' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        if (monthIncome === 0) return false;
        const savings = (monthIncome - monthExpense) / monthIncome;
        return savings >= targetPercent;
    }

    // Проверка дисциплины бюджета
    checkBudgetDiscipline(months) {
        let disciplineMonths = 0;
        for (let i = 0; i < months; i++) {
            const checkDate = new Date();
            checkDate.setMonth(checkDate.getMonth() - i);
            const budgetRespected = this.budgets.every(budget => {
                const spent = this.transactions
                    .filter(t => {
                        const tDate = new Date(t.date);
                        return t.type === 'expense' && this.getCategoryLabel(t.category) === budget.category &&
                               tDate.getMonth() === checkDate.getMonth() && tDate.getFullYear() === checkDate.getFullYear();
                    })
                    .reduce((sum, t) => sum + t.amount, 0);
                return spent <= budget.limit;
            });

            if (budgetRespected) disciplineMonths++;
            else break;
        }
        return disciplineMonths >= months;
    }

    // Рендеринг достижений
    renderAchievements() {
        const achievements = this.checkAchievements();
        const unlockedAchievements = achievements.filter(a => a.unlocked);
        const lockedAchievements = achievements.filter(a => !a.unlocked);

        const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);
        const level = Math.floor(totalPoints / 100) + 1;

        const activeAchievementsEl = document.getElementById('activeAchievements');
        const lockedAchievementsEl = document.getElementById('lockedAchievements');
        const unlockedCountEl = document.getElementById('unlockedCount');
        const totalCountEl = document.getElementById('totalCount');
        const totalPointsEl = document.getElementById('totalPoints');
        const userLevelEl = document.getElementById('userLevel');

        if (activeAchievementsEl) {
            const activeHTML = unlockedAchievements.map(a => `
                <div style="background: linear-gradient(135deg, var(--success) 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: transform 0.3s ease; display: flex; flex-direction: column; justify-content: center; min-height: 200px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="font-size: 1.8em; margin-bottom: 8px; line-height: 1.3;">${a.name}</div>
                    <p style="margin: 0; font-size: 0.8em; opacity: 0.9; line-height: 1.4;">${a.description}</p>
                    <p style="margin: 10px 0 0 0; font-weight: 700; font-size: 0.8em;">+${a.points} очков</p>
                </div>
            `).join('');
            activeAchievementsEl.innerHTML = activeHTML || '<div class="empty-state"><p>Начните добавлять операции для получения достижений!</p></div>';
        }

        if (lockedAchievementsEl) {
            const lockedHTML = lockedAchievements.map(a => `
                <div style="background: var(--bg-light); color: var(--text-light); padding: 20px; border-radius: 12px; text-align: center; opacity: 0.6; border: 2px dashed var(--border); display: flex; flex-direction: column; justify-content: center; min-height: 200px;">
                    <div style="font-size: 1.8em; margin-bottom: 8px; filter: grayscale(100%); line-height: 1.3;">${a.name}</div>
                    <p style="margin: 0; font-size: 0.8em; line-height: 1.4;">${a.description}</p>
                    <p style="margin: 10px 0 0 0; font-weight: 700; font-size: 0.8em;">+${a.points} очков</p>
                </div>
            `).join('');
            lockedAchievementsEl.innerHTML = lockedHTML;
        }

        if (unlockedCountEl) unlockedCountEl.textContent = unlockedAchievements.length;
        if (totalCountEl) totalCountEl.textContent = achievements.length;
        if (totalPointsEl) totalPointsEl.textContent = totalPoints;
        if (userLevelEl) userLevelEl.textContent = this.getLevelName(level);
    }

    // Получение имени уровня
    getLevelName(level) {
        const levels = ['Новичок', 'Любитель', 'Энтузиаст', 'Профессионал', 'Мастер', 'Легенда'];
        return levels[Math.min(level - 1, levels.length - 1)] + ` (⭐ ${level})`;
    }

    // Обновление стратегий
    updateStrategies() {
        const income = this.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = this.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const balance = income - expense;

        let incomeStrategiesHTML = '';
        let expenseStrategiesHTML = '';
        let optimizationHTML = '';

        // Стратегии увеличения доходов
        if (income < 150000) {
            incomeStrategiesHTML += `
                <div class="strategy-item income-strategy">
                    <h4>💼 Развитие фриланса</h4>
                    <p>Ваш доход составляет менее 150k. Рассмотрите увеличение часов на фрилансе или поиск дополнительных источников дохода.</p>
                    <p style="margin-top: 10px;"><strong>Потенциал:</strong> +20-30% от текущего дохода</p>
                </div>
            `;
        }

        if (this.transactions.filter(t => t.type === 'income' && t.category.includes('инвестиции')).length === 0) {
            incomeStrategiesHTML += `
                <div class="strategy-item income-strategy">
                    <h4>📈 Пассивный доход</h4>
                    <p>У вас нет инвестиционного дохода. Рассмотрите открытие инвестиционного счета или депозита.</p>
                    <p style="margin-top: 10px;"><strong>Потенциал:</strong> 5-10% годовых</p>
                </div>
            `;
        }

        // Стратегии снижения расходов
        const expenseByCategory = {};
        this.transactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = this.getCategoryLabel(t.category).toLowerCase();
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
        });

        if ((expenseByCategory['развлечения'] || 0) > expense * 0.15) {
            expenseStrategiesHTML += `
                <div class="strategy-item expense-strategy">
                    <h4>🎬 Сокращение развлечений</h4>
                    <p>Ваши расходы на развлечения выше нормы (${((expenseByCategory['развлечения'] / expense) * 100).toFixed(0)}% от бюджета)</p>
                    <p style="margin-top: 10px;"><strong>Экономия:</strong> ${(expenseByCategory['развлечения'] * 0.2).toLocaleString('ru-RU')} ₽/месяц</p>
                </div>
            `;
        }

        if ((expenseByCategory['транспорт'] || 0) > expense * 0.15) {
            expenseStrategiesHTML += `
                <div class="strategy-item expense-strategy">
                    <h4>🚕 Оптимизация транспорта</h4>
                    <p>Рассмотрите общественный транспорт или карпулинг вместо личного автомобиля</p>
                    <p style="margin-top: 10px;"><strong>Экономия:</strong> ${(expenseByCategory['транспорт'] * 0.3).toLocaleString('ru-RU')} ₽/месяц</p>
                </div>
            `;
        }

        if ((expenseByCategory['продукты'] || 0) > expense * 0.25) {
            expenseStrategiesHTML += `
                <div class="strategy-item expense-strategy">
                    <h4>🛒 Оптимизация продуктов</h4>
                    <p>Планируйте покупки, используйте скидки и акции, покупайте больше в супермаркетах</p>
                    <p style="margin-top: 10px;"><strong>Экономия:</strong> ${(expenseByCategory['продукты'] * 0.15).toLocaleString('ru-RU')} ₽/месяц</p>
                </div>
            `;
        }

        // Оптимизация
        if (balance > 0) {
            optimizationHTML += `
                <div class="strategy-item optimization-strategy">
                    <h4>🎯 Правило 50/30/20</h4>
                    <p>Распределяйте доход: 50% на нужды, 30% на желания, 20% на сбережения</p>
                    <p style="margin-top: 10px;"><strong>Ваше распределение:</strong> Необходимо ${Math.max(0, (income * 0.5 - (expenseByCategory['жкх'] || 0) - (expenseByCategory['продукты'] || 0))).toLocaleString('ru-RU')} ₽ на нужды</p>
                </div>
            `;
        } else {
            optimizationHTML += `
                <div class="strategy-item optimization-strategy">
                    <h4>⚠️ Критическая ситуация</h4>
                    <p>Ваши расходы превышают доходы. Срочно сократите расходы или увеличьте доход</p>
                    <p style="margin-top: 10px;"><strong>Дефицит:</strong> ${Math.abs(balance).toLocaleString('ru-RU')} ₽/месяц</p>
                </div>
            `;
        }

        if (!incomeStrategiesHTML) {
            incomeStrategiesHTML = '<div class="empty-state"><p>Отличная работа! Рекомендаций нет.</p></div>';
        }

        if (!expenseStrategiesHTML) {
            expenseStrategiesHTML = '<div class="empty-state"><p>Ваши расходы в норме!</p></div>';
        }

        const incomeStrategiesEl = document.getElementById('incomeStrategies');
        const expenseStrategiesEl = document.getElementById('expenseStrategies');
        const optimizationStrategiesEl = document.getElementById('optimizationStrategies');

        if (incomeStrategiesEl) incomeStrategiesEl.innerHTML = incomeStrategiesHTML;
        if (expenseStrategiesEl) expenseStrategiesEl.innerHTML = expenseStrategiesHTML;
        if (optimizationStrategiesEl) optimizationStrategiesEl.innerHTML = optimizationHTML;
    }

    // Обновление опций бюджета
    updateBudgetCategoryOptions() {
        const categorySelect = document.getElementById('budgetCategory');
        if (!categorySelect) return;
        
        const categories = [...this.expenseCategories];
        
        categorySelect.innerHTML = '<option value="">Выберите категорию</option>' + 
            categories.map(cat => 
                `<option value="${cat}">${cat}</option>`
            ).join('');
    }

    // Добавление бюджета
    addBudget() {
        const category = document.getElementById('budgetCategory').value;
        const limit = parseFloat(document.getElementById('budgetLimit').value);

        if (!category || !limit) {
            alert('Заполните категорию и лимит');
            return;
        }

        const existingBudget = this.budgets.find(b => b.category === category);
        if (existingBudget) {
            existingBudget.limit = limit;
        } else {
            this.budgets.push({
                id: Date.now(),
                category,
                limit
            });
        }

        this.saveUserData();
        
        const limitField = document.getElementById('budgetLimit');
        const categoryField = document.getElementById('budgetCategory');
        
        if (limitField) limitField.value = '';
        if (categoryField) categoryField.value = '';
        
        this.renderBudgets();
        this.updateBudgetStats();
    }

    // Отрисовка бюджетов
    renderBudgets() {
        const budgetItemsEl = document.getElementById('budgetItems');
        if (!budgetItemsEl) return;

        const html = this.budgets.length === 0
            ? '<div class="empty-state"><p>Бюджеты не установлены</p></div>'
            : this.budgets.map(b => {
                const spent = this.transactions
                    .filter(t => t.type === 'expense' && this.getCategoryLabel(t.category) === b.category)
                    .reduce((sum, t) => sum + t.amount, 0);
                 
                const percent = ((spent / b.limit) * 100).toFixed(0);
                const status = spent > b.limit ? 'expense' : spent > b.limit * 0.8 ? 'warning' : 'income';
                 
                return `
                    <div class="transaction-item ${status}">
                        <div class="transaction-info">
                            <h4>${b.category}</h4>
                            <p>Лимит: ${b.limit.toLocaleString('ru-RU')} ₽ • Использовано: ${spent.toLocaleString('ru-RU')} ₽</p>
                            <div style="margin-top: 8px; background: var(--bg-light); border-radius: 8px; height: 8px; overflow: hidden;">
                                <div style="background: ${spent > b.limit ? 'var(--danger)' : spent > b.limit * 0.8 ? 'var(--warning)' : 'var(--success)'}; height: 100%; width: ${Math.min(percent, 100)}%;"></div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <div style="text-align: right;">
                                <div style="font-weight: 700; color: ${spent > b.limit ? 'var(--danger)' : 'var(--text)'};">${percent}%</div>
                                <div style="font-size: 0.85em; color: var(--text-light);">${Math.max(0, b.limit - spent).toLocaleString('ru-RU')} ₽</div>
                            </div>
                            <button class="btn btn-danger btn-small" onclick="app.removeBudget(${b.id})">✕</button>
                        </div>
                    </div>
                `;
            }).join('');

        budgetItemsEl.innerHTML = html;
    }

    // Удаление бюджета
    removeBudget(id) {
        this.budgets = this.budgets.filter(b => b.id !== id);
        this.saveUserData();
        this.renderBudgets();
        this.updateBudgetStats();
    }

    // Обновление статистики бюджета
    updateBudgetStats() {
        const totalLimit = this.budgets.reduce((sum, b) => sum + b.limit, 0);
        const totalSpent = this.budgets.reduce((sum, b) => {
            return sum + this.transactions
                .filter(t => t.type === 'expense' && this.getCategoryLabel(t.category) === b.category)
                .reduce((s, t) => s + t.amount, 0);
        }, 0);
        const remain = totalLimit - totalSpent;
        const percent = totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(1) : 0;

        const totalBudgetLimitEl = document.getElementById('totalBudgetLimit');
        const totalBudgetSpentEl = document.getElementById('totalBudgetSpent');
        const totalBudgetRemainEl = document.getElementById('totalBudgetRemain');
        const budgetUsagePercentEl = document.getElementById('budgetUsagePercent');

        if (totalBudgetLimitEl) totalBudgetLimitEl.textContent = totalLimit.toLocaleString('ru-RU') + ' ₽';
        if (totalBudgetSpentEl) totalBudgetSpentEl.textContent = totalSpent.toLocaleString('ru-RU') + ' ₽';
        if (totalBudgetRemainEl) totalBudgetRemainEl.textContent = remain.toLocaleString('ru-RU') + ' ₽';
        if (budgetUsagePercentEl) budgetUsagePercentEl.textContent = percent + '%';
    }

    // Добавление цели накопления
    addGoal() {
        const name = document.getElementById('goalName').value;
        const target = parseFloat(document.getElementById('goalTarget').value);
        const saved = parseFloat(document.getElementById('goalSaved').value) || 0;
        const deadline = document.getElementById('goalDeadline').value;

        if (!name || !target) {
            alert('Заполните название и целевую сумму');
            return;
        }

        const goal = {
            id: Date.now(),
            name,
            target,
            saved,
            deadline,
            created: new Date().toISOString()
        };

        this.goals.push(goal);
        this.saveUserData();

        // Очистка формы
        const nameField = document.getElementById('goalName');
        const targetField = document.getElementById('goalTarget');
        const savedField = document.getElementById('goalSaved');
        const deadlineField = document.getElementById('goalDeadline');
        
        if (nameField) nameField.value = '';
        if (targetField) targetField.value = '';
        if (savedField) savedField.value = '';
        if (deadlineField) deadlineField.value = '';

        this.renderGoals();
        this.updateGoalStats();
    }

    // Отрисовка целей
    renderGoals() {
        const piggybankItemsEl = document.getElementById('piggybankItems');
        if (!piggybankItemsEl) return;

        const html = this.goals.length === 0
            ? '<div class="empty-state"><p>Целей не добавлено</p></div>'
            : this.goals.map(g => {
                // Загружаем план и рассчитываем ожидаемую сумму
                const planKey = `goal_plan_${g.id}`;
                const plan = JSON.parse(localStorage.getItem(planKey)) || {};
                const checkedDays = Object.values(plan).filter(v => v).length;
                const daysTotal = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 30;
                const dailyAmount = Math.ceil((g.target - (g.saved || 0)) / Math.max(1, daysTotal));
                const expectedSaved = (g.saved || 0) + (checkedDays * dailyAmount);
                const percent = ((expectedSaved / g.target) * 100).toFixed(0);
                const remain = g.target - expectedSaved;
                const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                const isCompleted = expectedSaved >= g.target;

                return `
                    <div class="card" data-goal-id="${g.id}" style="background: ${isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-white)'};  border-left: 4px solid ${isCompleted ? 'var(--success)' : 'var(--primary)'}; margin-bottom:16px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <h4>${g.name} ${isCompleted ? '✅' : ''}</h4>
                                <p style="color: var(--text-light); margin: 8px 0;">
                                    Накоплено: <strong>${(g.saved || 0).toLocaleString('ru-RU')} ₽</strong> из ${g.target.toLocaleString('ru-RU')} ₽
                                    ${daysLeft ? ` • Осталось ${daysLeft} дней` : ''}
                                </p>
                                <div style="background: var(--border); border-radius: 8px; height: 12px; overflow: hidden; margin-top: 12px;">
                                    <div style="background: ${isCompleted ? 'var(--success)' : 'var(--primary)'}; height: 100%; width: ${Math.min(percent, 100)}%;"></div>
                                </div>
                                <p style="color: var(--text-light); font-size: 0.9em; margin-top: 8px;">${percent}% • Ожидается: ${expectedSaved.toLocaleString('ru-RU')} ₽ из ${g.target.toLocaleString('ru-RU')} ₽</p>
                            </div>
                            <div style="display: flex; gap: 8px; margin-left: 16px;">
                                <button class="btn btn-primary btn-small" onclick="app.openGoalPlan(${g.id})">📅</button>
                                <button class="btn btn-primary btn-small" onclick="app.addToGoal(${g.id})">+</button>
                                <button class="btn btn-danger btn-small" onclick="app.removeGoal(${g.id})">✕</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        piggybankItemsEl.innerHTML = html;
    }

    // Добавление денег в цель
    addToGoal(id) {
        const goal = this.goals.find(g => g.id === id);
        if (!goal) return;

        const amount = prompt(`Добавить в "${goal.name}" (максимум ${(goal.target - (goal.saved || 0)).toLocaleString('ru-RU')} ₽):`);
        if (amount && !isNaN(amount)) {
            const add = Math.min(parseFloat(amount), goal.target - (goal.saved || 0));
            if (add > 0) {
                goal.saved = (goal.saved || 0) + add;
                this.saveUserData();
                this.renderGoals();
                this.updateGoalStats();
                alert(`✅ Добавлено ${add.toLocaleString('ru-RU')} ₽`);
            }
        }
    }

    // Удаление цели
    removeGoal(id) {
        if (confirm('Удалить цель?')) {
            this.goals = this.goals.filter(g => g.id !== id);
            this.saveUserData();
            this.renderGoals();
            this.updateGoalStats();
        }
    }

    // Обновление статистики целей
    updateGoalStats() {
        const totalGoals = this.goals.length;
        const completedGoals = this.goals.filter(g => {
            const planKey = `goal_plan_${g.id}`;
            const plan = JSON.parse(localStorage.getItem(planKey)) || {};
            const checkedDays = Object.values(plan).filter(v => v).length;
            const daysTotal = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 30;
            const dailyAmount = Math.ceil((g.target - (g.saved || 0)) / Math.max(1, daysTotal));
            const expectedSaved = (g.saved || 0) + (checkedDays * dailyAmount);
            return expectedSaved >= g.target;
        }).length;
        const totalSaved = this.goals.reduce((sum, g) => {
            const planKey = `goal_plan_${g.id}`;
            const plan = JSON.parse(localStorage.getItem(planKey)) || {};
            const checkedDays = Object.values(plan).filter(v => v).length;
            const daysTotal = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 30;
            const dailyAmount = Math.ceil((g.target - (g.saved || 0)) / Math.max(1, daysTotal));
            return sum + ((g.saved || 0) + (checkedDays * dailyAmount));
        }, 0);
        const totalTarget = this.goals.reduce((sum, g) => sum + g.target, 0);
        const overallPercent = totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0;

        const totalGoalsEl = document.getElementById('totalGoals');
        const completedGoalsEl = document.getElementById('completedGoals');
        const totalSavedAmountEl = document.getElementById('totalSavedAmount');
        const totalGoalAmountEl = document.getElementById('totalGoalAmount');
        const overallProgressEl = document.getElementById('overallProgress');

        if (totalGoalsEl) totalGoalsEl.textContent = totalGoals;
        if (completedGoalsEl) completedGoalsEl.textContent = completedGoals;
        if (totalSavedAmountEl) totalSavedAmountEl.textContent = totalSaved.toLocaleString('ru-RU') + ' ₽';
        if (totalGoalAmountEl) totalGoalAmountEl.textContent = totalTarget.toLocaleString('ru-RU') + ' ₽';
        if (overallProgressEl) overallProgressEl.textContent = overallPercent + '%';
    }

    // Открытие плана графика цели
    openGoalPlan(id) {
        const goal = this.goals.find(g => g.id === id);
        if (!goal) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        const isCompleted = (goal.saved || 0) >= goal.target;
        const remain = goal.target - (goal.saved || 0);
        const daysTotal = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 30;
        const dailyAmount = Math.ceil(remain / Math.max(1, daysTotal));

        let html = `
            <div style="background: white; border-radius: 16px; padding: 32px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="margin: 0;">📅 График накопления: ${goal.name}</h2>
                    <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✕</button>
                </div>

                <div style="background: var(--bg-light); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                    <p style="margin: 0;"><strong>Целевая сумма:</strong> ${goal.target.toLocaleString('ru-RU')} ₽</p>
                    <p style="margin: 8px 0 0 0;"><strong>Уже накоплено:</strong> ${(goal.saved || 0).toLocaleString('ru-RU')} ₽</p>
                    <p style="margin: 8px 0 0 0;"><strong>Осталось:</strong> ${remain.toLocaleString('ru-RU')} ₽</p>
                    <p style="margin: 8px 0 0 0;"><strong>Рекомендуемая сумма в день:</strong> ${dailyAmount.toLocaleString('ru-RU')} ₽</p>
                    <p style="margin: 8px 0 0 0;"><strong>Дней осталось:</strong> ${daysTotal}</p>
                </div>

                <h3 style="margin-bottom: 16px;">Календарь внесений</h3>
                <div id="goalCalendar_${goal.id}" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 24px;"></div> 
                <div style="text-align: center;">
                    <button class="btn btn-primary" onclick="app.closeGoalPlanModal(${goal.id})">Закрыть</button>
                </div>
            </div>
        `;

        modal.innerHTML = html;
        document.body.appendChild(modal);

        // Инициализация календаря
        const today = new Date();
        const calendarContainer = document.getElementById(`goalCalendar_${goal.id}`);
        const planKey = `goal_plan_${goal.id}`;
        const plan = JSON.parse(localStorage.getItem(planKey)) || {};

        for (let i = 0; i < daysTotal; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const isChecked = plan[dateStr] || false;

            const dayElement = document.createElement('div');
            dayElement.style.cssText = `
                padding: 12px;
                border-radius: 8px;
                background: ${isChecked ? 'var(--success)' : 'var(--bg-white)'};
                border: 2px solid ${isChecked ? 'var(--success)' : 'var(--border)'};
                cursor: pointer;
                text-align: center;
                transition: all 0.3s ease;
                user-select: none;
                color: ${isChecked ? 'white' : 'var(--text)'};
            `;

            dayElement.innerHTML = `
                <div style="font-weight: 700; font-size: 0.9em;">${date.getDate()}</div>
                <div style="font-size: 0.75em; opacity: 0.8;">${['пн','вт','ср','чт','пт','сб','вс'][date.getDay()]}</div>
                <div style="font-size: 0.8em; margin-top: 4px; font-weight: 600;">${isChecked ? '✓' : dailyAmount.toLocaleString('ru-RU')} ₽</div>
            `;

            dayElement.onmouseover = () => {
                dayElement.style.transform = 'scale(1.05)';
                dayElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            };

            dayElement.onmouseout = () => {
                dayElement.style.transform = 'scale(1)';
                dayElement.style.boxShadow = 'none';
            };

            dayElement.onclick = () => {
                plan[dateStr] = !plan[dateStr];
                localStorage.setItem(planKey, JSON.stringify(plan));

                dayElement.style.background = plan[dateStr] ? 'var(--success)' : 'var(--bg-white)';
                dayElement.style.borderColor = plan[dateStr] ? 'var(--success)' : 'var(--border)';
                dayElement.style.color = plan[dateStr] ? 'white' : 'var(--text)';
                dayElement.innerHTML = `
                    <div style="font-weight: 700; font-size: 0.9em;">${date.getDate()}</div>
                    <div style="font-size: 0.75em; opacity: 0.8;">${['пн','вт','ср','чт','пт','сб','вс'][date.getDay()]}</div>
                    <div style="font-size: 0.8em; margin-top: 4px; font-weight: 600;">${plan[dateStr] ? '✓' : dailyAmount.toLocaleString('ru-RU')} ₽</div>
                `;

                // Пересчет и обновление прогресс-бара
                const checkedDays = Object.values(plan).filter(v => v).length;
                const calculatedAmount = (goal.saved || 0) + (checkedDays * dailyAmount);
                const newPercent = Math.min((calculatedAmount / goal.target) * 100, 100).toFixed(1);
                
                // Обновляем шкалу накопления
                const progressBar = calendarContainer.parentElement.querySelector('[style*="background: var(--border)"]');
                if (progressBar && progressBar.nextElementSibling) {
                    const progressFill = progressBar.firstElementChild;
                    progressFill.style.width = newPercent + '%';
                    
                    // Обновляем текст процента
                    const percentText = progressBar.nextElementSibling;
                    percentText.innerHTML = `<strong>${newPercent}%</strong> • Ожидается: ${calculatedAmount.toLocaleString('ru-RU')} ₽ из ${goal.target.toLocaleString('ru-RU')} ₽`;
                }
            };

            calendarContainer.appendChild(dayElement);
        }

        // Закрытие модального окна с обновлением списка целей
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // Обновляем основную цель на основе плана
                const planKey = `goal_plan_${goal.id}`;
                const plan = JSON.parse(localStorage.getItem(planKey)) || {};
                const checkedDays = Object.values(plan).filter(v => v).length;
                const daysTotal = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 30;
                const dailyAmount = Math.ceil((goal.target - (goal.saved || 0)) / Math.max(1, daysTotal));
                
                // Обновляем сумму накопленной в основной цели
                goal.saved = (goal.saved || 0) + (checkedDays * dailyAmount);
                
                // Сохраняем обновленные данные
                this.saveUserData();
                
                modal.remove();
                this.renderGoals();
                this.updateGoalStats();
            }
        });
    }

    // Закрытие модального окна цели с сохранением
    closeGoalPlanModal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        // Обновляем основную цель на основе плана
        const planKey = `goal_plan_${goalId}`;
        const plan = JSON.parse(localStorage.getItem(planKey)) || {};
        const checkedDays = Object.values(plan).filter(v => v).length;
        const daysTotal = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 30;
        const dailyAmount = Math.ceil((goal.target - (goal.saved || 0)) / Math.max(1, daysTotal));
        
        // Обновляем сумму накопленной в основной цели
        goal.saved = (goal.saved || 0) + (checkedDays * dailyAmount);
        
        // Сохраняем обновленные данные
        this.saveUserData();
        
        // Закрываем модальное окно
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
            this.renderGoals();
            this.updateGoalStats();
        }
    }
}

// Глобальные функции для обратной совместимости с HTML onclick
let app;

function toggleTheme() {
    if (app) app.toggleTheme();
}

function showPasswordField() {
    if (app) app.showPasswordField();
}

function handleLogin(event) {
    if (app) app.handleLogin(event);
}

function handleRegister(event) {
    if (app) app.handleRegister(event);
}

function toggleRegister() {
    if (app) app.toggleRegister();
}

function handleLogout() {
    if (app) app.handleLogout();
}

function switchTab(tabName) {
    if (app) app.switchTab(tabName);
}

function addTransaction() {
    if (app) app.addTransaction();
}

function deleteTransaction(id) {
    if (app) app.deleteTransaction(id);
}

function addIncomeCategory() {
    if (app) app.addIncomeCategory();
}

function addExpenseCategory() {
    if (app) app.addExpenseCategory();
}

function removeCategory(type, cat) {
    if (app) app.removeCategory(type, cat);
}

function addBudget() {
    if (app) app.addBudget();
}

function removeBudget(id) {
    if (app) app.removeBudget(id);
}

function addGoal() {
    if (app) app.addGoal();
}

function addToGoal(id) {
    if (app) app.addToGoal(id);
}

function removeGoal(id) {
    if (app) app.removeGoal(id);
}

function openGoalPlan(id) {
    if (app) app.openGoalPlan(id);
}

function closeNotifications() {
    if (app) app.closeNotifications();
}

function dismissNotification(element) {
    if (app) app.dismissNotification(element);
}

function closeGoalPlanModal(goalId) {
    if (app) app.closeGoalPlanModal(goalId);
}

// Отслеживание просмотров аналитики
function trackAnalyticsView() {
    const views = parseInt(localStorage.getItem('analyticsViews') || '0');
    localStorage.setItem('analyticsViews', views + 1);
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    app = new FinanceApp();
    
    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideOut {
            to {
                opacity: 0;
                transform: translateX(400px);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Обработчики для кнопок темы уже добавлены в методе addThemeToggleListeners()
    console.log('App initialized and theme toggle listeners should be ready');
});

// Загрузка данных при переходе в аналитику
document.addEventListener('DOMContentLoaded', () => {
    const originalSwitchTab = switchTab;
    switchTab = function(tabName) {
        if (tabName === 'analytics') {
            trackAnalyticsView();
        }
        if (originalSwitchTab) {
            originalSwitchTab(tabName);
        }
    };
});
