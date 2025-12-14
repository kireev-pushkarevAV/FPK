/**
 * UI Manager Module - Управление пользовательским интерфейсом
 * Отвечает за темы, анимации, уведомления, модальные окна и другие UI компоненты
 * 
 * @version 1.0.0
 * @author Financial Assistant Team
 */

/**
 * Класс для управления пользовательским интерфейсом
 * @class UIManager
 */
class UIManager {
    /**
     * Приватное поле для хранения экземпляра (Singleton)
     * @type {UIManager|null}
     * @private
     */
    static #instance = null;

    /**
     * Конфигурация UI менеджера
     * @type {Object}
     * @private
     */
    #config = {
        enableAnimations: true,
        enableTooltips: true,
        enableNotifications: true,
        defaultTheme: 'light',
        notificationDuration: 3000,
        animationDuration: 300,
        breakpoints: {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        }
    };

    /**
     * Текущая тема
     * @type {string}
     * @private
     */
    #currentTheme = 'light';

    /**
     * Активные уведомления
     * @type {Array}
     * @private
     */
    #activeNotifications = [];

    /**
     * Активные модальные окна
     * @type {Array}
     * @private
     */
    #activeModals = [];

    /**
     * Состояние загрузчиков
     * @type {Map}
     * @private
     */
    #loaders = new Map();

    /**
     * Приватный конструктор для реализации Singleton
     * @param {Object} config - Конфигурация
     * @private
     */
    constructor(config = {}) {
        if (UIManager.#instance) {
            throw new Error('UIManager - это Singleton. Используйте UIManager.getInstance()');
        }

        this.#config = { ...this.#config, ...config };
        this.#initializeUI();
        this.#bindEvents();
    }

    /**
     * Получение экземпляра Singleton
     * @param {Object} config - Конфигурация (только при первом вызове)
     * @returns {UIManager} Экземпляр UI менеджера
     */
    static getInstance(config = {}) {
        if (!UIManager.#instance) {
            UIManager.#instance = new UIManager(config);
        }
        return UIManager.#instance;
    }

    /**
     * Инициализация UI компонентов
     * @private
     */
    #initializeUI() {
        // Инициализация темы
        this.#initializeTheme();

        // Создание контейнеров для уведомлений и модальных окон
        this.#createUIContainers();

        // Инициализация тултипов
        if (this.#config.enableTooltips) {
            this.#initializeTooltips();
        }

        // Инициализация анимаций
        if (this.#config.enableAnimations) {
            this.#initializeAnimations();
        }
    }

    /**
     * Инициализация темы
     * @private
     */
    #initializeTheme() {
        // Загрузка сохраненной темы
        const savedTheme = localStorage.getItem('app-theme') || this.#config.defaultTheme;
        this.#currentTheme = savedTheme;
        this.#applyTheme(savedTheme);

        // Отслеживание системных предпочтений
        if (savedTheme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addListener((e) => {
                if (this.#currentTheme === 'auto') {
                    this.#applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * Применение темы
     * @param {string} theme - Тема ('light', 'dark', 'auto')
     * @private
     */
    #applyTheme(theme) {
        const actualTheme = theme === 'auto' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;

        document.documentElement.setAttribute('data-theme', actualTheme);
        
        // Обновление meta тега для color-scheme
        const metaTheme = document.querySelector('meta[name="color-scheme"]');
        if (metaTheme) {
            metaTheme.content = actualTheme;
        }
    }

    /**
     * Создание контейнеров для UI элементов
     * @private
     */
    #createUIContainers() {
        // Контейнер для уведомлений
        if (!document.getElementById('notifications-container')) {
            const notificationsContainer = document.createElement('div');
            notificationsContainer.id = 'notifications-container';
            notificationsContainer.className = 'notifications-container';
            notificationsContainer.setAttribute('aria-live', 'polite');
            document.body.appendChild(notificationsContainer);
        }

        // Контейнер для модальных окон
        if (!document.getElementById('modals-container')) {
            const modalsContainer = document.createElement('div');
            modalsContainer.id = 'modals-container';
            modalsContainer.className = 'modals-container';
            document.body.appendChild(modalsContainer);
        }
    }

    /**
     * Инициализация тултипов
     * @private
     */
    #initializeTooltips() {
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.#showTooltip(target);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.#hideTooltip(target);
            }
        });
    }

    /**
     * Показ тултипа
     * @param {HTMLElement} element - Элемент с тултипом
     * @private
     */
    #showTooltip(element) {
        const text = element.getAttribute('data-tooltip');
        const position = element.getAttribute('data-tooltip-position') || 'top';

        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = text;
        tooltip.id = `tooltip-${Date.now()}`;

        document.body.appendChild(tooltip);

        // Позиционирование
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        switch (position) {
            case 'top':
                tooltip.style.left = rect.left + (rect.width / 2) - (tooltipRect.width / 2) + 'px';
                tooltip.style.top = rect.top - tooltipRect.height - 5 + 'px';
                break;
            case 'bottom':
                tooltip.style.left = rect.left + (rect.width / 2) - (tooltipRect.width / 2) + 'px';
                tooltip.style.top = rect.bottom + 5 + 'px';
                break;
            case 'left':
                tooltip.style.left = rect.left - tooltipRect.width - 5 + 'px';
                tooltip.style.top = rect.top + (rect.height / 2) - (tooltipRect.height / 2) + 'px';
                break;
            case 'right':
                tooltip.style.left = rect.right + 5 + 'px';
                tooltip.style.top = rect.top + (rect.height / 2) - (tooltipRect.height / 2) + 'px';
                break;
        }

        // Анимация появления
        requestAnimationFrame(() => {
            tooltip.classList.add('tooltip-visible');
        });

        element.setAttribute('aria-describedby', tooltip.id);
    }

    /**
     * Скрытие тултипа
     * @param {HTMLElement} element - Элемент с тултипом
     * @private
     */
    #hideTooltip(element) {
        const tooltipId = element.getAttribute('aria-describedby');
        if (tooltipId) {
            const tooltip = document.getElementById(tooltipId);
            if (tooltip) {
                tooltip.classList.remove('tooltip-visible');
                setTimeout(() => {
                    tooltip.remove();
                }, 200);
            }
            element.removeAttribute('aria-describedby');
        }
    }

    /**
     * Инициализация анимаций
     * @private
     */
    #initializeAnimations() {
        // Определение prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (prefersReducedMotion.matches) {
            document.documentElement.classList.add('reduce-motion');
        }

        prefersReducedMotion.addListener((e) => {
            if (e.matches) {
                document.documentElement.classList.add('reduce-motion');
            } else {
                document.documentElement.classList.remove('reduce-motion');
            }
        });
    }

    /**
     * Привязка событий
     * @private
     */
    #bindEvents() {
        // Обработка изменения размера окна
        window.addEventListener('resize', this.#debounce(() => {
            this.#handleResize();
        }, 250));

        // Обработка клавиатурных сокращений
        document.addEventListener('keydown', (e) => {
            this.#handleKeyboardShortcuts(e);
        });

        // Обработка фокуса для доступности
        document.addEventListener('focusin', (e) => {
            this.#handleFocusIn(e);
        });

        document.addEventListener('focusout', (e) => {
            this.#handleFocusOut(e);
        });
    }

    /**
     * Обработка изменения размера окна
     * @private
     */
    #handleResize() {
        const width = window.innerWidth;
        let breakpoint = 'mobile';

        if (width >= this.#config.breakpoints.desktop) {
            breakpoint = 'desktop';
        } else if (width >= this.#config.breakpoints.tablet) {
            breakpoint = 'tablet';
        }

        document.documentElement.setAttribute('data-breakpoint', breakpoint);

        // Эмитирование события изменения размера
        if (window.appCore) {
            window.appCore.emit('ui:resize', { width, height: window.innerHeight, breakpoint });
        }
    }

    /**
     * Обработка клавиатурных сокращений
     * @param {KeyboardEvent} e - Событие клавиатуры
     * @private
     */
    #handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K для поиска
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (window.appCore) {
                window.appCore.emit('ui:open-search');
            }
        }

        // Escape для закрытия модальных окон
        if (e.key === 'Escape' && this.#activeModals.length > 0) {
            this.#closeTopModal();
        }

        // Ctrl/Cmd + / для помощи
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            if (window.appCore) {
                window.appCore.emit('ui:show-help');
            }
        }
    }

    /**
     * Обработка получения фокуса
     * @param {FocusEvent} e - Событие фокуса
     * @private
     */
    #handleFocusIn(e) {
        const element = e.target;
        element.classList.add('focused');
        
        // Добавление индикатора фокуса для улучшения доступности
        if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.tagName === 'INPUT') {
            element.setAttribute('data-focused', 'true');
        }
    }

    /**
     * Обработка потери фокуса
     * @param {FocusEvent} e - Событие фокуса
     * @private
     */
    #handleFocusOut(e) {
        const element = e.target;
        element.classList.remove('focused');
        element.removeAttribute('data-focused');
    }

    /**
     * Закрытие верхнего модального окна
     * @private
     */
    #closeTopModal() {
        if (this.#activeModals.length > 0) {
            const topModal = this.#activeModals[this.#activeModals.length - 1];
            this.closeModal(topModal.id);
        }
    }

    /**
     * Показ уведомления
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления ('success', 'error', 'warning', 'info')
     * @param {Object} options - Дополнительные опции
     * @returns {string} ID уведомления
     */
    showNotification(message, type = 'info', options = {}) {
        if (!this.#config.enableNotifications) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return null;
        }

        const {
            duration = this.#config.notificationDuration,
            position = 'top-right',
            closable = true,
            actions = []
        } = options;

        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type} notification-${position}`;
        notification.id = notificationId;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');

        // Иконка типа
        const icon = this.#getNotificationIcon(type);
        
        // HTML уведомления
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-message">${message}</div>
                ${closable ? '<button class="notification-close" aria-label="Закрыть уведомление">×</button>' : ''}
            </div>
            ${actions.length > 0 ? `
                <div class="notification-actions">
                    ${actions.map(action => `
                        <button class="notification-action" data-action="${action.id}">${action.text}</button>
                    `).join('')}
                </div>
            ` : ''}
        `;

        // Добавление в контейнер
        const container = document.getElementById('notifications-container');
        container.appendChild(notification);

        // Анимация появления
        requestAnimationFrame(() => {
            notification.classList.add('notification-visible');
        });

        // Обработка закрытия
        const closeNotification = () => {
            this.hideNotification(notificationId);
        };

        if (closable) {
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', closeNotification);
        }

        // Обработка действий
        if (actions.length > 0) {
            const actionButtons = notification.querySelectorAll('.notification-action');
            actionButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const actionId = e.target.getAttribute('data-action');
                    const action = actions.find(a => a.id === actionId);
                    if (action && action.handler) {
                        action.handler();
                    }
                    closeNotification();
                });
            });
        }

        // Автоматическое скрытие
        if (duration > 0) {
            setTimeout(closeNotification, duration);
        }

        // Сохранение в активных уведомлениях
        this.#activeNotifications.push({
            id: notificationId,
            element: notification,
            type,
            message
        });

        // Эмитирование события
        if (window.appCore) {
            window.appCore.emit('ui:notification-shown', { 
                id: notificationId, 
                type, 
                message 
            });
        }

        return notificationId;
    }

    /**
     * Получение иконки для уведомления
     * @param {string} type - Тип уведомления
     * @returns {string} SVG иконка
     * @private
     */
    #getNotificationIcon(type) {
        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
        };
        return icons[type] || icons.info;
    }

    /**
     * Скрытие уведомления
     * @param {string} notificationId - ID уведомления
     */
    hideNotification(notificationId) {
        const notificationIndex = this.#activeNotifications.findIndex(n => n.id === notificationId);
        if (notificationIndex === -1) return;

        const notification = this.#activeNotifications[notificationIndex];
        
        // Анимация скрытия
        notification.element.classList.remove('notification-visible');
        
        setTimeout(() => {
            notification.element.remove();
            this.#activeNotifications.splice(notificationIndex, 1);
            
            // Эмитирование события
            if (window.appCore) {
                window.appCore.emit('ui:notification-hidden', { 
                    id: notificationId 
                });
            }
        }, 300);
    }

    /**
     * Показ модального окна
     * @param {string|HTMLElement} content - Содержимое модального окна
     * @param {Object} options - Опции модального окна
     * @returns {Promise} Promise с результатом закрытия
     */
    showModal(content, options = {}) {
        return new Promise((resolve) => {
            const {
                title = '',
                size = 'medium',
                closable = true,
                backdrop = true,
                buttons = [],
                className = ''
            } = options;

            const modalId = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const modal = document.createElement('div');
            modal.className = `modal modal-${size} ${className}`;
            modal.id = modalId;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', title ? `${modalId}-title` : null);

            // Фон модального окна
            const backdropElement = document.createElement('div');
            backdropElement.className = 'modal-backdrop';
            if (backdrop) {
                backdropElement.addEventListener('click', () => {
                    if (closable) {
                        this.closeModal(modalId, 'backdrop');
                    }
                });
            }

            // Содержимое модального окна
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';

            let contentHtml = '';
            
            if (title) {
                contentHtml += `
                    <div class="modal-header">
                        <h2 class="modal-title" id="${modalId}-title">${title}</h2>
                        ${closable ? '<button class="modal-close" aria-label="Закрыть">×</button>' : ''}
                    </div>
                `;
            }

            contentHtml += `
                <div class="modal-body">
                    ${typeof content === 'string' ? content : ''}
                </div>
            `;

            if (buttons.length > 0) {
                contentHtml += `
                    <div class="modal-footer">
                        ${buttons.map(btn => `
                            <button class="modal-button ${btn.className || ''}" data-action="${btn.id}">
                                ${btn.text}
                            </button>
                        `).join('')}
                    </div>
                `;
            }

            modalContent.innerHTML = contentHtml;

            // Сборка модального окна
            modal.appendChild(backdropElement);
            modal.appendChild(modalContent);

            // Добавление в контейнер
            const container = document.getElementById('modals-container');
            container.appendChild(modal);

            // Если content - HTMLElement, добавляем его в body
            if (typeof content !== 'string') {
                const body = modal.querySelector('.modal-body');
                body.innerHTML = '';
                body.appendChild(content);
            }

            // Обработка закрытия
            const closeModalHandler = (result = null) => {
                this.closeModal(modalId, result);
                resolve(result);
            };

            if (closable) {
                const closeBtn = modal.querySelector('.modal-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => closeModalHandler());
                }
            }

            // Обработка кнопок
            if (buttons.length > 0) {
                const buttonElements = modal.querySelectorAll('.modal-button');
                buttonElements.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const actionId = e.target.getAttribute('data-action');
                        const button = buttons.find(b => b.id === actionId);
                        if (button) {
                            if (button.handler) {
                                const result = button.handler();
                                if (result !== false) {
                                    closeModalHandler(result);
                                }
                            } else {
                                closeModalHandler(actionId);
                            }
                        }
                    });
                });
            }

            // Фокусировка на первом интерактивном элементе
            requestAnimationFrame(() => {
                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length > 0) {
                    focusableElements[0].focus();
                }
            });

            // Блокировка прокрутки body
            document.body.style.overflow = 'hidden';

            // Анимация появления
            requestAnimationFrame(() => {
                modal.classList.add('modal-visible');
            });

            // Сохранение в активных модальных окнах
            this.#activeModals.push({
                id: modalId,
                element: modal,
                resolve
            });

            // Эмитирование события
            if (window.appCore) {
                window.appCore.emit('ui:modal-shown', { 
                    id: modalId, 
                    title, 
                    size 
                });
            }
        });
    }

    /**
     * Закрытие модального окна
     * @param {string} modalId - ID модального окна
     * @param {*} result - Результат закрытия
     */
    closeModal(modalId, result = null) {
        const modalIndex = this.#activeModals.findIndex(m => m.id === modalId);
        if (modalIndex === -1) return;

        const modal = this.#activeModals[modalIndex];
        
        // Анимация скрытия
        modal.element.classList.remove('modal-visible');
        
        setTimeout(() => {
            modal.element.remove();
            this.#activeModals.splice(modalIndex, 1);
            
            // Восстановление прокрутки если нет других модальных окон
            if (this.#activeModals.length === 0) {
                document.body.style.overflow = '';
            }

            // Вызов resolve для Promise
            if (modal.resolve) {
                modal.resolve(result);
            }
            
            // Эмитирование события
            if (window.appCore) {
                window.appCore.emit('ui:modal-closed', { 
                    id: modalId, 
                    result 
                });
            }
        }, 300);
    }

    /**
     * Показ индикатора загрузки
     * @param {Object} options - Опции загрузчика
     * @returns {Function} Функция для скрытия загрузчика
     */
    showLoader(options = {}) {
        const {
            text = 'Загрузка...',
            overlay = false,
            target = null,
            size = 'medium'
        } = options;

        const loaderId = `loader-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const loader = document.createElement('div');
        loader.className = `loader loader-${size}`;
        loader.id = loaderId;

        if (overlay) {
            loader.classList.add('loader-overlay');
        }

        loader.innerHTML = `
            <div class="loader-spinner" aria-hidden="true"></div>
            ${text ? `<div class="loader-text">${text}</div>` : ''}
        `;

        // Определение цели для загрузчика
        let container;
        if (target) {
            container = typeof target === 'string' 
                ? document.querySelector(target) 
                : target;
        } else {
            container = document.body;
        }

        if (!container) {
            console.warn('UIManager: Контейнер для загрузчика не найден');
            return () => {};
        }

        container.appendChild(loader);

        // Анимация появления
        requestAnimationFrame(() => {
            loader.classList.add('loader-visible');
        });

        // Сохранение загрузчика
        this.#loaders.set(loaderId, {
            element: loader,
            container
        });

        // Возврат функции для скрытия
        return () => this.hideLoader(loaderId);
    }

    /**
     * Скрытие индикатора загрузки
     * @param {string} loaderId - ID загрузчика
     */
    hideLoader(loaderId) {
        const loader = this.#loaders.get(loaderId);
        if (!loader) return;

        loader.element.classList.remove('loader-visible');
        
        setTimeout(() => {
            loader.element.remove();
            this.#loaders.delete(loaderId);
        }, 300);
    }

    /**
     * Установка темы
     * @param {string} theme - Тема ('light', 'dark', 'auto')
     */
    setTheme(theme) {
        if (!['light', 'dark', 'auto'].includes(theme)) {
            console.warn('UIManager: Неверная тема. Допустимые значения: light, dark, auto');
            return;
        }

        this.#currentTheme = theme;
        localStorage.setItem('app-theme', theme);
        this.#applyTheme(theme);

        // Эмитирование события
        if (window.appCore) {
            window.appCore.emit('ui:theme-changed', { theme });
        }
    }

    /**
     * Получение текущей темы
     * @returns {string} Текущая тема
     */
    getTheme() {
        return this.#currentTheme;
    }

    /**
     * Анимация элемента
     * @param {HTMLElement} element - Элемент для анимации
     * @param {string} animation - Тип анимации
     * @param {Object} options - Опции анимации
     * @returns {Promise} Promise завершения анимации
     */
    animate(element, animation, options = {}) {
        if (!this.#config.enableAnimations) {
            return Promise.resolve();
        }

        const {
            duration = this.#config.animationDuration,
            easing = 'ease-in-out',
            delay = 0
        } = options;

        return new Promise((resolve) => {
            // Проверка prefers-reduced-motion
            if (document.documentElement.classList.contains('reduce-motion')) {
                resolve();
                return;
            }

            // Добавление класса анимации
            element.classList.add(`animate-${animation}`);
            
            // Установка CSS переменных для анимации
            element.style.setProperty('--animation-duration', `${duration}ms`);
            element.style.setProperty('--animation-easing', easing);
            element.style.setProperty('--animation-delay', `${delay}ms`);

            // Обработка завершения анимации
            const handleAnimationEnd = () => {
                element.removeEventListener('animationend', handleAnimationEnd);
                element.classList.remove(`animate-${animation}`);
                element.style.removeProperty('--animation-duration');
                element.style.removeProperty('--animation-easing');
                element.style.removeProperty('--animation-delay');
                resolve();
            };

            element.addEventListener('animationend', handleAnimationEnd);
        });
    }

    /**
     * Показ confirm диалога
     * @param {string} message - Сообщение
     * @param {string} title - Заголовок
     * @param {Object} options - Дополнительные опции
     * @returns {Promise<boolean} Promise с результатом (true/false)
     */
    confirm(message, title = 'Подтверждение', options = {}) {
        return this.showModal(`
            <div class="confirm-message">${message}</div>
        `, {
            title,
            size: 'small',
            buttons: [
                {
                    id: 'cancel',
                    text: options.cancelText || 'Отмена',
                    className: 'btn-secondary'
                },
                {
                    id: 'confirm',
                    text: options.confirmText || 'Подтвердить',
                    className: 'btn-primary'
                }
            ]
        }).then(result => result === 'confirm');
    }

    /**
     * Показ alert диалога
     * @param {string} message - Сообщение
     * @param {string} title - Заголовок
     * @param {Object} options - Дополнительные опции
     * @returns {Promise} Promise завершения диалога
     */
    alert(message, title = 'Информация', options = {}) {
        return this.showModal(`
            <div class="alert-message">${message}</div>
        `, {
            title,
            size: 'small',
            buttons: [
                {
                    id: 'ok',
                    text: options.okText || 'ОК',
                    className: 'btn-primary'
                }
            ]
        });
    }

    /**
     * Показ prompt диалога
     * @param {string} message - Сообщение
     * @param {string} defaultValue - Значение по умолчанию
     * @param {string} title - Заголовок
     * @param {Object} options - Дополнительные опции
     * @returns {Promise<string|null>} Promise с введенным значением или null
     */
    prompt(message, defaultValue = '', title = 'Ввод', options = {}) {
        const inputId = `prompt-input-${Date.now()}`;
        
        return this.showModal(`
            <div class="prompt-message">${message}</div>
            <input type="${options.type || 'text'}" 
                   id="${inputId}" 
                   class="prompt-input" 
                   value="${defaultValue}" 
                   placeholder="${options.placeholder || ''}"
                   ${options.required ? 'required' : ''}>
        `, {
            title,
            size: 'small',
            buttons: [
                {
                    id: 'cancel',
                    text: options.cancelText || 'Отмена',
                    className: 'btn-secondary'
                },
                {
                    id: 'ok',
                    text: options.okText || 'ОК',
                    className: 'btn-primary'
                }
            ]
        }).then(result => {
            if (result === 'ok') {
                const input = document.getElementById(inputId);
                return input ? input.value : null;
            }
            return null;
        });
    }

    /**
     * Получение текущего брейкпоинта
     * @returns {string} Текущий брейкпоинт ('mobile', 'tablet', 'desktop')
     */
    getCurrentBreakpoint() {
        return document.documentElement.getAttribute('data-breakpoint') || 'mobile';
    }

    /**
     * Проверка мобильного устройства
     * @returns {boolean} true если мобильное устройство
     */
    isMobile() {
        return this.getCurrentBreakpoint() === 'mobile';
    }

    /**
     * Проверка планшетного устройства
     * @returns {boolean} true если планшетное устройство
     */
    isTablet() {
        return this.getCurrentBreakpoint() === 'tablet';
    }

    /**
     * Проверка десктопного устройства
     * @returns {boolean} true если десктопное устройство
     */
    isDesktop() {
        return this.getCurrentBreakpoint() === 'desktop';
    }

    /**
     * Дебаунсинг функции
     * @param {Function} func - Функция для дебаунсинга
     * @param {number} wait - Время ожидания
     * @returns {Function} Дебаунсированная функция
     * @private
     */
    #debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Уничтожение UI менеджера
     */
    destroy() {
        // Закрытие всех модальных окон
        this.#activeModals.forEach(modal => {
            this.closeModal(modal.id);
        });

        // Скрытие всех уведомлений
        this.#activeNotifications.forEach(notification => {
            this.hideNotification(notification.id);
        });

        // Скрытие всех загрузчиков
        this.#loaders.forEach((loader, id) => {
            this.hideLoader(id);
        });

        // Удаление контейнеров
        const notificationsContainer = document.getElementById('notifications-container');
        const modalsContainer = document.getElementById('modals-container');
        
        if (notificationsContainer) notificationsContainer.remove();
        if (modalsContainer) modalsContainer.remove();

        // Сброс экземпляра
        UIManager.#instance = null;
    }
}

// Экспорт модуля
window.UIManager = UIManager;

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация только если есть appCore
    if (window.appCore) {
        const uiManager = UIManager.getInstance();
        window.appCore.registerModule('uiManager', uiManager);
    }
});

// Экспорт для Node.js (если используется)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}