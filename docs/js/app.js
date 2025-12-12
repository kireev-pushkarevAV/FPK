<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ФПК - Финансовый Помощник</title>
    <link rel="icon" type="image/x-icon" href="favicon.ico">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/dark-theme.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/responsive.css">
</head>
<body>
    <!-- LOGIN SCREEN -->
    <div id="loginScreen" class="login-screen active">
        <div class="login-page">
            <div class="login-left">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div class="login-logo">ФПК</div>
                    <div class="theme-toggle" id="loginThemeToggle" title="Переключить тему">
                        <div class="theme-toggle-slider"></div>
                    </div>
                </div>
                <h1>Вход или регистрация</h1>
                <p class="login-subtitle">
                    Используйте email или телефон, чтобы войти в ваш Финансовый помощник
                </p>

                <div id="loginForm">
                    <form class="login-form" onsubmit="handleLogin(event)">
                        <label class="login-label">Почта или телефон</label>
                        <input type="email" id="loginEmail" class="login-input"
                               placeholder="Введите эл. почту или телефон" required>

                        <input type="password" id="loginPassword" class="login-input"
                               placeholder="Пароль" style="display: none;">
                        <div id="loginSecurityInfo" style="font-size: 0.8em; color: var(--text-light); margin-top: 5px; display: none;">
                            Ваши данные защищены с помощью шифрования
                        </div>

                        <button type="button" id="nextBtn" class="login-primary-btn" onclick="showPasswordField()">Далее</button>
                        <button type="submit" id="loginBtn" class="login-primary-btn" style="display: none;">Войти</button>
                    </form>
                </div>

                <div id="registerForm" style="display: none;">
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.2em;">🔐</span>
                            <div>
                                <strong style="color: var(--success);">Защищенная регистрация</strong>
                                <p style="margin: 4px 0 0 0; font-size: 0.85em; color: var(--text-light);">
                                    Ваши данные надежно защищены с помощью современного шифрования с использованием соли
                                </p>
                            </div>
                        </div>
                    </div>
                    <form class="login-form" onsubmit="handleRegister(event)">
                        <label class="login-label">Имя</label>
                        <input type="text" id="regName" class="login-input"
                               placeholder="Введите ваше имя" required>

                        <label class="login-label">Почта</label>
                        <input type="email" id="regEmail" class="login-input"
                               placeholder="Введите эл. почту" required>

                        <label class="login-label">Пароль</label>
                        <input type="password" id="regPassword" class="login-input"
                               placeholder="Придумайте пароль" required>
                        <div style="font-size: 0.8em; color: var(--text-light); margin-top: 5px;">
                            Минимум 8 символов, включая заглавные/строчные буквы и цифры
                        </div>
                        <div style="font-size: 0.75em; color: var(--text-light); margin-top: 8px; padding: 8px; background: var(--bg-light); border-radius: 6px;">
                            <strong>🔒 Безопасность:</strong> Ваш пароль хешируется с использованием современной криптографии и никогда не сохраняется в открытом виде.
                        </div>
                        <div id="passwordStrength"></div>

                        <label class="login-label">Подтвердите пароль</label>
                        <input type="password" id="regPassword2" class="login-input"
                               placeholder="Повторите пароль" required>
                        <div id="passwordMatch"></div>

                        <button type="submit" class="login-primary-btn">Зарегистрироваться</button>
                    </form>
                </div>

                <button class="login-secondary-btn" onclick="toggleRegister()">
                    <span id="authToggleText">Нет аккаунта? Зарегистрироваться</span>
                </button>
            </div>

            <div class="login-right">
                <!-- можешь вставить сюда свою SVG/PNG‑картинку -->
                <div class="login-illustration"></div>
            </div>
        </div>
    </div>

    <!-- APP SCREEN -->
    <div id="appScreen" class="app-screen">
        <header>
            <div class="container">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h1>💰 ФПК</h1>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span id="userGreeting" style="color: var(--text-light); font-size: 0.95em;"></span>
                        <div class="theme-toggle" id="themeToggle" title="Переключить тему">
                            <div class="theme-toggle-slider"></div>
                        </div>
                        <button class="btn btn-danger btn-small" onclick="handleLogout()">Выход</button>
                    </div>
                </div>
            </div>
        </header>

        <div class="container">
            <!-- DASHBOARD -->
            <div class="dashboard-grid">
                <div class="stat-card income">
                    <div class="stat-label">Доходы за месяц</div>
                    <div class="stat-value" id="totalIncome">0 ₽</div>
                </div>
                <div class="stat-card expense">
                    <div class="stat-label">Расходы за месяц</div>
                    <div class="stat-value" id="totalExpense">0 ₽</div>
                </div>
                <div class="stat-card balance">
                    <div class="stat-label">Чистый остаток</div>
                    <div class="stat-value" id="netBalance">0 ₽</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">% Экономии</div>
                    <div class="stat-value" id="savingsRate">0%</div>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center;">
                <div id="notificationBell" style="position: relative; cursor: pointer; font-size: 1.5em; transition: transform 0.3s ease;" title="Нажмите для просмотра уведомлений">
                    🔔
                    <span id="notificationBadge" style="position: absolute; top: -8px; right: -8px; background: var(--danger); color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 0.75em; font-weight: 700; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);">0</span>
                </div>
                <div id="notificationsPanel" style="position: fixed; top: 80px; right: 20px; background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); width: 350px; max-height: 400px; overflow-y: auto; z-index: 999; display: none; border: 1px solid var(--border);">
                    <div style="padding: 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 1.1em;">Уведомления</h3>
                        <button onclick="closeNotifications()" style="background: none; border: none; font-size: 1.2em; cursor: pointer; color: var(--text-light);">✕</button>
                    </div>
                    <div id="notificationsList" style="padding: 0;"></div>
                </div>
            </div>

            <div class="tabs">
                <button class="tab-btn active" onclick="switchTab('transactions')">💸 Операции</button>
                <button class="tab-btn" onclick="switchTab('categories')">🏷️ Категории</button>
                <button class="tab-btn" onclick="switchTab('analytics')">📊 Аналитика</button>
                <button class="tab-btn" onclick="switchTab('strategies')">🎯 Стратегии</button>
                <button class="tab-btn" onclick="switchTab('budget')">📋 Бюджет</button>
                <button class="tab-btn" onclick="switchTab('achievements')">🏆 Достижения</button>
                <button class="tab-btn" onclick="switchTab('piggybank')">🏦 Копилка</button>
                <button class="tab-btn" onclick="switchTab('sync')">☁️ Синхронизация</button>
            </div>

            <!-- ОПЕРАЦИИ -->
            <div id="transactions" class="tab-content active">
                <div class="card">
                    <h2>Добавить операцию</h2>
                    <div class="grid-2">
                        <div class="form-group">
                            <label for="transType">Тип операции:</label>
                            <select id="transType" onchange="updateCategoryOptions()">
                                <option value="income">💵 Доход</option>
                                <option value="expense">💸 Расход</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="transCategory">Категория:</label>
                            <select id="transCategory">
                                <option value="salary">Зарплата</option>
                                <option value="freelance">Фриланс</option>
                                <option value="investment">Инвестиции</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="transAmount">Сумма (РУБ):</label>
                            <input type="number" id="transAmount" placeholder="0" min="0" step="100">
                        </div>
                        <div class="form-group">
                            <label for="transDate">Дата:</label>
                            <input type="date" id="transDate">
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label for="transDescription">Описание:</label>
                            <textarea id="transDescription" rows="2" placeholder="Дополнительная информация..."></textarea>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="addTransaction()">Добавить операцию</button>
                </div>

                <div class="card">
                    <h2>История операций</h2>
                    <div class="filter-section">
                        <div class="filter-row">
                            <div class="form-group">
                                <label>Фильтр по типу:</label>
                                <select id="filterType" onchange="updateTransactionsList()">
                                    <option value="">Все операции</option>
                                    <option value="income">Только доходы</option>
                                    <option value="expense">Только расходы</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Период:</label>
                                <select id="filterPeriod" onchange="updateTransactionsList()">
                                    <option value="month">Текущий месяц</option>
                                    <option value="quarter">Текущий квартал</option>
                                    <option value="year">Текущий год</option>
                                    <option value="all">Все время</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Сортировка:</label>
                                <select id="filterSort" onchange="updateTransactionsList()">
                                    <option value="date-desc">По дате (новые сначала)</option>
                                    <option value="date-asc">По дате (старые сначала)</option>
                                    <option value="amount-desc">По сумме (большие сначала)</option>
                                    <option value="amount-asc">По сумме (малые сначала)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div id="transactionsList"></div>
                </div>
            </div>

            <!-- КАТЕГОРИИ -->
            <div id="categories" class="tab-content">
                <div class="card">
                    <h2>Управление категориями</h2>
                    <div class="info-box">
                        ℹ️ Настройте свои категории доходов и расходов для более точного анализа
                    </div>

                    <div class="grid-2">
                        <div>
                            <h3>📥 Категории доходов</h3>
                            <div id="incomeCategories" style="margin-top: 15px;"></div>
                            <div class="form-group" style="margin-top: 20px;">
                                <input type="text" id="newIncomeCategory" placeholder="Новая категория дохода">
                                <button class="btn btn-primary" onclick="addIncomeCategory()" style="width: 100%; margin-top: 10px;">Добавить</button>
                            </div>
                        </div>
                        <div>
                            <h3>📤 Категории расходов</h3>
                            <div id="expenseCategories" style="margin-top: 15px;"></div>
                            <div class="form-group" style="margin-top: 20px;">
                                <input type="text" id="newExpenseCategory" placeholder="Новая категория расхода">
                                <button class="btn btn-primary" onclick="addExpenseCategory()" style="width: 100%; margin-top: 10px;">Добавить</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- АНАЛИТИКА -->
            <div id="analytics" class="tab-content">
                <div class="card">
                    <h2>Финансовая аналитика</h2>
                    
                    <div class="grid-2">
                        <div class="chart-container">
                            <h3>Распределение доходов</h3>
                            <div id="incomeChart"></div>
                            <table class="table" style="margin-top: 15px;">
                                <thead>
                                    <tr>
                                        <th>Категория</th>
                                        <th>Сумма</th>
                                        <th>%</th>
                                    </tr>
                                </thead>
                                <tbody id="incomeChartTable"></tbody>
                            </table>
                        </div>
                        <div class="chart-container">
                            <h3>Распределение расходов</h3>
                            <div id="expenseChart"></div>
                            <table class="table" style="margin-top: 15px;">
                                <thead>
                                    <tr>
                                        <th>Категория</th>
                                        <th>Сумма</th>
                                        <th>%</th>
                                    </tr>
                                </thead>
                                <tbody id="expenseChartTable"></tbody>
                            </table>
                        </div>
                    </div>

                    <div style="margin-top: 30px;">
                        <h3>Тренды за последние месяцы</h3>
                        <div class="chart-container" style="padding: 20px;">
                            <canvas id="trendChartCanvas" style="max-height: 300px;"></canvas>
                            <div id="trendChartData" style="margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;"></div>
                        </div>
                    </div>

                    <div style="margin-top: 30px;">
                        <h3>Прогноз расходов на месяц</h3>
                        <div class="card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%); border: 1px solid rgba(59, 130, 246, 0.3); padding: 20px; border-radius: 12px;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                <div>
                                    <p style="color: var(--text-light); margin-bottom: 8px;"><strong>Прогноз на месяц:</strong></p>
                                    <p style="font-size: 1.5em; font-weight: 700; color: var(--primary); margin: 0;"><span id="monthlyForecast">0</span> ₽</p>
                                </div>
                                <div>
                                    <p style="color: var(--text-light); margin-bottom: 8px;"><strong>Рекомендуемый дневной лимит:</strong></p>
                                    <p style="font-size: 1.5em; font-weight: 700; color: var(--info); margin: 0;"><span id="dailyLimit">0</span> ₽</p>
                                </div>
                                <div>
                                    <p style="color: var(--text-light); margin-bottom: 8px;"><strong>Прогнозируемый остаток:</strong></p>
                                    <p style="font-size: 1.5em; font-weight: 700; color: var(--success); margin: 0;"><span id="projectedBalance">0</span> ₽</p>
                                </div>
                            </div>
                            <p style="margin-top: 16px; color: var(--text-light); font-size: 0.9em;">
                                Прогноз основан на средних расходах за последние 3 месяца. Фактические цифры могут отличаться.
                            </p>
                        </div>
                    </div>

                    <div class="success-box" style="margin-top: 20px;">
                        <h4>📈 Финансовое здоровье</h4>
                        <p>
                            <strong>Коэффициент экономии:</strong> <span id="savingsCoeff">0%</span> (рекомендуется 20-30%)<br>
                            <strong>Соотношение доход/расход:</strong> <span id="incomRatio">0</span> (выше 1 = хорошо)<br>
                            <strong>Средний ежедневный расход:</strong> <span id="dailyAvg">0 ₽</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- СТРАТЕГИИ -->
            <div id="strategies" class="tab-content">
                <div class="card">
                    <h2>🎯 Стратегии оптимизации финансов</h2>
                    <div class="info-box">
                        ℹ️ Система анализирует ваши операции и предлагает способы увеличить доходы и снизить расходы
                    </div>

                    <h3 style="margin-top: 30px; margin-bottom: 15px;">💵 Стратегии увеличения доходов</h3>
                    <div id="incomeStrategies"></div>

                    <h3 style="margin-top: 30px; margin-bottom: 15px;">💸 Стратегии снижения расходов</h3>
                    <div id="expenseStrategies"></div>

                    <h3 style="margin-top: 30px; margin-bottom: 15px;">🔧 Возможности оптимизации</h3>
                    <div id="optimizationStrategies"></div>

                    <div class="warning-box" style="margin-top: 30px;">
                        ⚠️ Все рекомендации основаны на анализе ваших операций. Корректируйте рекомендации в соответствии с вашей ситуацией.
                    </div>
                </div>
            </div>

            <!-- БЮДЖЕТ -->
            <div id="budget" class="tab-content">
                <div class="card">
                    <h2>📋 План бюджета и расходов</h2>
                    <div class="info-box">
                        ℹ️ Установите месячные лимиты на категории расходов и отслеживайте соответствие плану
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h3>Месячные лимиты по категориям</h3>
                        <div id="budgetItems" style="margin-top: 20px;"></div>
                    </div>

                    <div class="card" style="background: var(--bg-light); margin-top: 20px;">
                        <h3>Добавить новый бюджет</h3>
                        <div class="grid-2">
                            <div class="form-group">
                                <label for="budgetCategory">Категория:</label>
                                <select id="budgetCategory">
                                    <option value="">Выберите категорию</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="budgetLimit">Лимит (РУБ):</label>
                                <input type="number" id="budgetLimit" placeholder="0" min="0" step="100">
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="addBudget()">Добавить бюджет</button>
                    </div>

                    <div class="warning-box" style="margin-top: 30px;">
                        <h4>📊 Статистика бюджета</h4>
                        <p>
                            <strong>Общий лимит:</strong> <span id="totalBudgetLimit">0 ₽</span><br>
                            <strong>Потрачено:</strong> <span id="totalBudgetSpent">0 ₽</span><br>
                            <strong>Остаток:</strong> <span id="totalBudgetRemain">0 ₽</span><br>
                            <strong>Использовано:</strong> <span id="budgetUsagePercent">0%</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- ДОСТИЖЕНИЯ -->
            <div id="achievements" class="tab-content">
                <div class="card">
                    <h2>🏆 Достижения и награды</h2>
                    <div class="info-box">
                        ℹ️ Получайте бейджи и награды за финансовые миль­стоуны и хорошие привычки
                    </div>

                    <div style="margin-top: 30px;">
                        <h3>Активные достижения</h3>
                        <div id="activeAchievements" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; margin-top: 20px;"></div>
                    </div>

                    <div style="margin-top: 30px;">
                        <h3>Недостигнутые достижения</h3>
                        <div id="lockedAchievements" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; margin-top: 20px;"></div>
                    </div>

                    <div class="success-box" style="margin-top: 30px;">
                        <h4>📈 Статистика достижений</h4>
                        <p style="margin: 0;">
                            <strong>Разблокировано:</strong> <span id="unlockedCount">0</span> из <span id="totalCount">0</span><br>
                            <strong>Всего очков:</strong> <span id="totalPoints">0</span> очков<br>
                            <strong>Уровень:</strong> <span id="userLevel">Новичок</span> ⭐
                        </p>
                    </div>

                    <div style="margin-top: 20px; background: var(--bg-light); padding: 20px; border-radius: 12px;">
                        <h3 style="margin-top: 0;">Описание достижений</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                            <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid var(--success);">
                                <strong>🎯 Стартер</strong><br>
                                <small>Добавьте первую операцию</small>
                            </div>
                            <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid var(--success);">
                                <strong>💰 Экономист</strong><br>
                                <small>Экономьте 10%+ дохода 1 месяц</small>
                            </div>
                            <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid var(--success);">
                                <strong>📊 Аналитик</strong><br>
                                <small>Используйте аналитику 5 раз</small>
                            </div>
                            <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid var(--success);">
                                <strong>🏦 Мечтатель</strong><br>
                                <small>Создайте 3 цели накопления</small>
                            </div>
                            <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid var(--success);">
                                <strong>⚡ Дисциплина</strong><br>
                                <small>Не превышайте бюджет 3 месяца подряд</small>
                            </div>
                            <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid var(--success);">
                                <strong>🎊 Миллионер</strong><br>
                                <small>Накопите 1 млн ₽ во всех целях</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- КОПИЛКА -->
            <div id="piggybank" class="tab-content">
                <div class="card">
                    <h2>🏦 Копилка и накопления</h2>
                    <div class="info-box">
                        ℹ️ Создавайте цели накопления и отслеживайте прогресс достижения финансовых целей
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h3>Ваши цели накопления</h3>
                        <div id="piggybankItems" style="margin-top: 20px;"></div>
                    </div>

                    <div class="card" style="background: var(--bg-light); margin-top: 20px;">
                        <h3>Создать новую цель</h3>
                        <div class="grid-2">
                            <div class="form-group">
                                <label for="goalName">Название цели:</label>
                                <input type="text" id="goalName" placeholder="Например: Отпуск, Новый ноутбук">
                            </div>
                            <div class="form-group">
                                <label for="goalTarget">Целевая сумма (РУБ):</label>
                                <input type="number" id="goalTarget" placeholder="0" min="0" step="100">
                            </div>
                            <div class="form-group">
                                <label for="goalSaved">Уже накоплено (РУБ):</label>
                                <input type="number" id="goalSaved" placeholder="0" min="0" step="100">
                            </div>
                            <div class="form-group">
                                <label for="goalDeadline">Дата достижения:</label>
                                <input type="date" id="goalDeadline">
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="addGoal()">Создать цель</button>
                    </div>

                    <div class="success-box" style="margin-top: 30px;">
                        <h4>💰 Общий прогресс</h4>
                        <p>
                            <strong>Всего целей:</strong> <span id="totalGoals">0</span><br>
                            <strong>Завершено:</strong> <span id="completedGoals">0</span><br>
                            <strong>Общая накоплено:</strong> <span id="totalSavedAmount">0 ₽</span><br>
                            <strong>Общая цель:</strong> <span id="totalGoalAmount">0 ₽</span><br>
                            <strong>Прогресс:</strong> <span id="overallProgress">0%</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- СИНХРОНИЗАЦИЯ -->
            <div id="sync" class="tab-content">
                <div class="card">
                    <h2>☁️ Синхронизация с устройствами</h2>
                    <div class="info-box">
                        ℹ️ Синхронизируйте свои финансовые данные между веб-сайтом, мобильным приложением и Телеграм ботом
                    </div>

                    <div class="grid-2">
                        <div style="background: var(--bg-light); padding: 20px; border-radius: 8px;">
                            <h3>📱 Мобильное приложение</h3>
                            <p style="color: #7f8c8d; margin: 15px 0;">Приложение для iOS и Android для быстрого ввода операций в любое время</p>
                            <div style="margin-top: 15px;">
                                <p><strong>Статус:</strong> <span style="color: var(--warning); font-weight: 600;">🔜 В разработке</span></p>
                                <p style="color: #7f8c8d; font-size: 0.9em; margin-top: 10px;">Синхронизация с облаком • Оффлайн режим • Push-уведомления</p>
                            </div>
                        </div>

                        <div style="background: var(--bg-light); padding: 20px; border-radius: 8px;">
                            <h3>🤖 Телеграм бот</h3>
                            <p style="color: #7f8c8d; margin: 15px 0;">Управляйте финансами прямо в Телеграме с помощью удобного бота</p>
                            <div style="margin-top: 15px;">
                                <p><strong>Статус:</strong> <span style="color: var(--warning); font-weight: 600;">🔜 В разработке</span></p>
                                <p style="color: #7f8c8d; font-size: 0.9em; margin-top: 10px;">Добавление операций • Статистика • Напоминания • Рекомендации</p>
                            </div>
                        </div>
                    </div>

                    <div style="background: var(--bg-light); padding: 20px; border-radius: 8px; margin-top: 20px;">
                        <h3>🔐 API для разработчиков</h3>
                        <p style="color: #7f8c8d; margin: 15px 0;">Интегрируйте финансовые данные в ваши сервисы через API</p>
                        <button class="btn btn-primary" style="margin-top: 15px;">Документация API</button>
                    </div>

                    <div class="success-box" style="margin-top: 20px;">
                        <h4>✅ Синхронизация данных</h4>
                        <p>
                            Ваши данные безопасно хранятся в облаке и автоматически синхронизируются между всеми устройствами.
                            Все операции кодируются и защищены. <strong>Последняя синхронизация: сейчас</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer-note">
            <strong>Важно:</strong> Это приложение предоставляет информационный анализ ваших финансов.
            Финальные решения принимайте самостоятельно. Данные сохраняются локально в браузере.
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
