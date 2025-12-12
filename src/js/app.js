// Main Application Controller
class FinanceApp {
    constructor() {
        this.currentUser = null;
        this.trendChart = null;
        this.transactions = [];
        this.incomeCategories = [];
        this.expenseCategories = [];
        this.budgets = [];
        this.goals = [];
        
        this.init();
    }

    // Initialize application
    init() {
        this.loadTheme();
        this.checkAuth();
        this.setupEventListeners();
        this.initializeDates();
    }

    // Theme management
    loadTheme() {
        let savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            savedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            document.getElementById('themeToggle').classList.add('active');
        }
    }

    toggleTheme() {
        const body = document.body;
        const loginScreen = document.getElementById('loginScreen');
        const themeToggle = document.getElementById('themeToggle');
        const loginThemeToggle = document.getElementById('loginThemeToggle');

        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            loginScreen.classList.remove('dark-theme');
            if (themeToggle) themeToggle.classList.remove('active');
            if (loginThemeToggle) loginThemeToggle.classList.remove('active');
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.add('dark-theme');
            loginScreen.classList.add('dark-theme');
            if (themeToggle) themeToggle.classList.add('active');
            if (loginThemeToggle) loginThemeToggle.classList.add('active');
            localStorage.setItem('theme', 'dark');
        }
        
        this.updateChartTheme();
    }

    updateChartTheme() {
        if (this.trendChart) {
            const isDarkTheme = document.body.classList.contains('dark-theme');
            this.trendChart.options.plugins.legend.labels.color = isDarkTheme ? '#f9fafb' : '#1f2937';
            this.trendChart.options.scales.x.grid.color = isDarkTheme ? '#374151' : '#e5e7eb';
            this.trendChart.options.scales.x.ticks.color = isDarkTheme ? '#d1d5db' : '#6b7280';
            this.trendChart.options.scales.y.grid.color = isDarkTheme ? '#374151' : '#e5e7eb';
            this.trendChart.options.scales.y.ticks.color = isDarkTheme ? '#d1d5db' : '#6b7280';
            
            // Update point colors
            this.trendChart.data.datasets[0].pointBorderColor = isDarkTheme ? '#1f2937' : 'white';
            this.trendChart.data.datasets[1].pointBorderColor = isDarkTheme ? '#1f2937' : 'white';
            
            this.trendChart.update();
        }
    }

    // Authentication management
    checkAuth() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showAppScreen();
            this.loadUserData();
        } else {
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('appScreen').style.display = 'none';
    }

    showAppScreen() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('appScreen').style.display = 'block';
        document.getElementById('userGreeting').textContent = `Привет, ${this.currentUser.name}! 👋`;
    }

    // Setup event listeners
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        const loginThemeToggle = document.getElementById('loginThemeToggle');
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        if (loginThemeToggle) {
            loginThemeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Login form
        const loginForm = document.querySelector('.login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.querySelector('[onclick="handleLogout()"]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    // Initialize dates
    initializeDates() {
        const transDate = document.getElementById('transDate');
        if (transDate) {
            transDate.valueAsDate = new Date();
        }
    }

    // Login handling
    showPasswordField() {
        const email = document.getElementById('loginEmail').value;
        if (!email) {
            alert('Введите email или телефон');
            return;
        }

        document.getElementById('loginPassword').style.display = 'block';
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('loginPassword').focus();
    }

    handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!password) {
            alert('Введите пароль');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.resetLoginForm();
            this.showAppScreen();
            this.loadUserData();
        } else {
            alert('❌ Неверный email или пароль!');
        }
    }

    resetLoginForm() {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').style.display = 'none';
        document.getElementById('nextBtn').style.display = 'block';
        document.getElementById('loginBtn').style.display = 'none';
    }

    handleLogout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            this.currentUser = null;
            localStorage.removeItem('currentUser');
            this.showLoginScreen();
            this.resetLoginForm();
        }
    }

    // Load user data
    loadUserData() {
        const userKey = `user_${this.currentUser.id}`;
        const userData = JSON.parse(localStorage.getItem(userKey)) || {};
        
        this.transactions = userData.transactions || [];
        this.incomeCategories = userData.incomeCategories || ['Зарплата', 'Фриланс', 'Инвестиции', 'Бонусы', 'Подарки'];
        this.expenseCategories = userData.expenseCategories || ['Продукты', 'Транспорт', 'Развлечения', 'ЖКХ', 'Здоровье', 'Образование', 'Прочее'];
        this.budgets = userData.budgets || [];
        this.goals = userData.goals || [];

        this.updateDashboard();
        this.updateTransactionsList();
        this.updateCategoryOptions();
    }

    // Save user data
    saveUserData() {
        const userKey = `user_${this.currentUser.id}`;
        const userData = {
            transactions: this.transactions,
            incomeCategories: this.incomeCategories,
            expenseCategories: this.expenseCategories,
            budgets: this.budgets,
            goals: this.goals
        };
        localStorage.setItem(userKey, JSON.stringify(userData));
    }

    // Dashboard update
    updateDashboard() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = income - expense;
        const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;

        document.getElementById('totalIncome').textContent = income.toLocaleString('ru-RU') + ' ₽';
        document.getElementById('totalExpense').textContent = expense.toLocaleString('ru-RU') + ' ₽';
        document.getElementById('netBalance').textContent = balance.toLocaleString('ru-RU') + ' ₽';
        document.getElementById('savingsRate').textContent = savingsRate + '%';
    }

    // Transaction management
    updateCategoryOptions() {
        const type = document.getElementById('transType').value;
        const categorySelect = document.getElementById('transCategory');
        const categories = type === 'income' ? this.incomeCategories : this.expenseCategories;

        categorySelect.innerHTML = categories.map(cat => 
            `<option value="${cat.toLowerCase().replace(/\s+/g, '-')}">${cat}</option>`
        ).join('');
    }

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

        // Reset form
        document.getElementById('transAmount').value = '';
        document.getElementById('transDescription').value = '';
        document.getElementById('transDate').valueAsDate = new Date();

        this.updateTransactionsList();
        this.updateDashboard();
        alert('Операция добавлена!');
    }

    updateTransactionsList() {
        const filterType = document.getElementById('filterType').value;
        const filterPeriod = document.getElementById('filterPeriod').value;
        const filterSort = document.getElementById('filterSort').value;

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

        // Sort
        filtered.sort((a, b) => {
            if (filterSort === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (filterSort === 'date-asc') return new Date(a.date) - new Date(b.date);
            if (filterSort === 'amount-desc') return b.amount - a.amount;
            if (filterSort === 'amount-asc') return a.amount - b.amount;
        });

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

        document.getElementById('transactionsList').innerHTML = html;
    }

    deleteTransaction(id) {
        if (confirm('Удалить операцию?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveUserData();
            this.updateTransactionsList();
            this.updateDashboard();
        }
    }

    getCategoryLabel(categoryKey) {
        const allCats = [...this.incomeCategories, ...this.expenseCategories];
        return allCats.find(cat => cat.toLowerCase().replace(/\s+/g, '-') === categoryKey) || categoryKey;
    }

    // Tab switching
    switchTab(tabName) {
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => tab.classList.remove('active'));

        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(btn => btn.classList.remove('active'));

        document.getElementById(tabName).classList.add('active');
        event.target.classList.add('active');

        if (tabName === 'analytics') {
            this.updateAnalytics();
            setTimeout(() => this.renderTrendChart(), 100);
        }
    }

    // Analytics
    updateAnalytics() {
        const income = this.transactions.filter(t => t.type === 'income');
        const expense = this.transactions.filter(t => t.type === 'expense');

        const totalIncome = income.reduce((s, t) => s + t.amount, 0);
        const totalExpense = expense.reduce((s, t) => s + t.amount, 0);

        // Income by category
        const incomeByCategory = {};
        income.forEach(t => {
            const cat = this.getCategoryLabel(t.category);
            incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount;
        });

        // Expense by category
        const expenseByCategory = {};
        expense.forEach(t => {
            const cat = this.getCategoryLabel(t.category);
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
        });

        // Update tables
        const incomeTableHTML = Object.entries(incomeByCategory)
            .map(([cat, amount]) => `
                <tr>
                    <td>${cat}</td>
                    <td>${amount.toLocaleString('ru-RU')} ₽</td>
                    <td>${((amount / totalIncome) * 100).toFixed(1)}%</td>
                </tr>
            `).join('');

        const expenseTableHTML = Object.entries(expenseByCategory)
            .map(([cat, amount]) => `
                <tr>
                    <td>${cat}</td>
                    <td>${amount.toLocaleString('ru-RU')} ₽</td>
                    <td>${((amount / totalExpense) * 100).toFixed(1)}%</td>
                </tr>
            `).join('');

        document.getElementById('incomeChartTable').innerHTML = incomeTableHTML || '<tr><td colspan="3">Нет данных</td></tr>';
        document.getElementById('expenseChartTable').innerHTML = expenseTableHTML || '<tr><td colspan="3">Нет данных</td></tr>';

        // Update metrics
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;
        const incomeRatio = totalExpense > 0 ? (totalIncome / totalExpense).toFixed(2) : '∞';
        const dailyAvg = (totalExpense / 30).toFixed(0);

        document.getElementById('savingsCoeff').textContent = savingsRate + '%';
        document.getElementById('incomRatio').textContent = incomeRatio;
        document.getElementById('dailyAvg').textContent = dailyAvg + ' ₽';
    }

    renderTrendChart() {
        const canvas = document.getElementById('trendChartCanvas');
        if (!canvas) return;

        // Group by months for last 6 months
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FinanceApp();
    
    // Make functions globally available for inline event handlers
    window.toggleTheme = () => window.app.toggleTheme();
    window.showPasswordField = () => window.app.showPasswordField();
    window.handleLogin = (e) => window.app.handleLogin(e);
    window.handleLogout = () => window.app.handleLogout();
    window.switchTab = (tabName) => window.app.switchTab(tabName);
    window.addTransaction = () => window.app.addTransaction();
    window.deleteTransaction = (id) => window.app.deleteTransaction(id);
    window.updateTransactionsList = () => window.app.updateTransactionsList();
    window.updateCategoryOptions = () => window.app.updateCategoryOptions();
});