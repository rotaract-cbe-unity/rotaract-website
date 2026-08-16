/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Authentication & Admin Panel - js/auth.js
   Version: 3.0 - Complete, Error-Free, Works on file:// & hosted
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // AUTH STATE
    // ============================================================
    const AUTH = {
        currentUser: null,
        userRole: null,
        userPermissions: null,
        SESSION_KEY: 'unity_admin_session',
        SESSION_TIMEOUT: 8 * 60 * 60 * 1000 // 8 hours
    };

    // ============================================================
    // SESSION MANAGEMENT
    // ============================================================
    function saveSession(user) {
        const session = {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avenue: user.avenue || null,
                portfolio: user.portfolio || null,
                ri_id: user.ri_id || null,
                phone: user.phone || null
            },
            timestamp: Date.now()
        };
        try {
            localStorage.setItem(AUTH.SESSION_KEY, JSON.stringify(session));
        } catch (e) {
            console.warn('Session save failed:', e);
        }
        AUTH.currentUser = session.user;
        AUTH.userRole = session.user.role;
        AUTH.userPermissions = getPermissionsForRole(session.user.role);
    }

    function loadSession() {
        try {
            const raw = localStorage.getItem(AUTH.SESSION_KEY);
            if (!raw) return null;

            const session = JSON.parse(raw);
            if (!session || !session.user || !session.timestamp) {
                clearSession();
                return null;
            }

            if (Date.now() - session.timestamp > AUTH.SESSION_TIMEOUT) {
                clearSession();
                return null;
            }

            AUTH.currentUser = session.user;
            AUTH.userRole = session.user.role;
            AUTH.userPermissions = getPermissionsForRole(session.user.role);
            return session.user;

        } catch (e) {
            clearSession();
            return null;
        }
    }

    function clearSession() {
        try {
            localStorage.removeItem(AUTH.SESSION_KEY);
        } catch (e) { }
        AUTH.currentUser = null;
        AUTH.userRole = null;
        AUTH.userPermissions = null;
    }

    function refreshSessionTimestamp() {
        try {
            const raw = localStorage.getItem(AUTH.SESSION_KEY);
            if (!raw) return;
            const session = JSON.parse(raw);
            if (session) {
                session.timestamp = Date.now();
                localStorage.setItem(AUTH.SESSION_KEY, JSON.stringify(session));
            }
        } catch (e) { }
    }

    function getPermissionsForRole(role) {
        if (!role) return {};
        if (window.UnityConfig && window.UnityConfig.roles && window.UnityConfig.roles[role]) {
            return window.UnityConfig.roles[role];
        }
        return {};
    }

    // ============================================================
    // SIGN IN - Direct REST fetch (works on file:// AND hosted)
    // ============================================================
    async function signIn(email, password) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPassword = (password || '').trim();

        if (!cleanEmail) throw new Error('Please enter your email address.');
        if (!cleanPassword) throw new Error('Please enter your password.');

        // Wait for config to be ready (max 5 seconds)
        let configAttempts = 0;
        while (!window.UnityConfig && configAttempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            configAttempts++;
        }

        if (!window.UnityConfig) {
            throw new Error('Connection failed. Please refresh the page and try again.');
        }

        const SUPABASE_URL = window.UnityConfig.supabase.url;
        const ANON_KEY = window.UnityConfig.supabase.anonKey;

        try {
            // Direct REST API call - bypasses SDK issues on file://
            const queryUrl = `${SUPABASE_URL}/rest/v1/admin_users` +
                `?select=id,email,name,role,avenue,portfolio,ri_id,phone,is_active,password_text` +
                `&email=eq.${encodeURIComponent(cleanEmail)}` +
                `&is_active=eq.true` +
                `&limit=1`;

            const response = await fetch(queryUrl, {
                method: 'GET',
                headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            // Handle HTTP errors
            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                console.error('Auth query failed:', response.status, errText);

                if (response.status === 401) {
                    throw new Error('Authentication error (401). Please run the SQL fix in Supabase dashboard.');
                }
                if (response.status === 403) {
                    throw new Error('Permission denied (403). Please run the SQL fix to grant anon permissions.');
                }
                if (response.status === 404) {
                    throw new Error('Database table not found. Please check your SQL setup.');
                }
                throw new Error(`Server error (${response.status}). Please try again.`);
            }

            const data = await response.json();

            // Check if user exists
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error('No active account found with this email address.');
            }

            const user = data[0];

            // Verify password
            if (!user.password_text) {
                throw new Error('Account configuration error. Please contact the administrator.');
            }

            if (user.password_text !== cleanPassword) {
                throw new Error('Incorrect password. Please try again.');
            }

            // Update last login (fire and forget - non-blocking)
            fetch(`${SUPABASE_URL}/rest/v1/admin_users?id=eq.${user.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ last_login: new Date().toISOString() })
            }).catch(() => { /* non-critical */ });

            // Log login (fire and forget)
            fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
                method: 'POST',
                headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    email_type: 'admin_login',
                    recipient: cleanEmail,
                    subject: `Admin Login - ${user.name}`,
                    status: 'info',
                    sent_at: new Date().toISOString()
                })
            }).catch(() => { /* non-critical */ });

            saveSession(user);
            return user;

        } catch (err) {
            // Re-throw known user-facing errors
            const knownPhrases = [
                'No active account',
                'Incorrect password',
                'Please enter',
                'Authentication error',
                'Permission denied',
                'Database table',
                'Server error',
                'Connection failed',
                'Account configuration'
            ];
            if (knownPhrases.some(phrase => err.message.includes(phrase))) {
                throw err;
            }

            // Generic unexpected error
            console.error('Unexpected login error:', err);
            throw new Error('Login failed. Please check your internet connection and try again.');
        }
    }

    // ============================================================
    // SIGN OUT
    // ============================================================
    function signOut() {
        clearSession();
        window.location.href = 'admin.html';
    }

    // ============================================================
    // PERMISSION HELPERS
    // ============================================================
    function getCurrentUser() {
        return AUTH.currentUser;
    }

    function getUserRole() {
        return AUTH.userRole;
    }

    function getPermissions() {
        if (AUTH.userPermissions && Object.keys(AUTH.userPermissions).length > 0) {
            return AUTH.userPermissions;
        }
        AUTH.userPermissions = getPermissionsForRole(AUTH.userRole);
        return AUTH.userPermissions || {};
    }

    function hasPermission(permission) {
        return getPermissions()[permission] === true;
    }

    function canAccessAvenue(avenue) {
        const perms = getPermissions();
        if (!perms || !perms.avenues) return false;
        if (perms.avenues.includes('all')) return true;
        return perms.avenues.includes(avenue);
    }

    function canAccessPage(page) {
        const perms = getPermissions();
        if (!perms || !perms.canAccess) return false;
        if (perms.canAccess.includes('all')) return true;
        return perms.canAccess.includes(page);
    }

    function isHighLevel() {
        const perms = getPermissions();
        return perms && perms.level >= 7;
    }

    function isSuperAdmin() {
        return AUTH.userRole === 'super_admin';
    }

    function isAdvisor() {
        return AUTH.userRole === 'advisor';
    }

    function isPresident() {
        return AUTH.userRole === 'president';
    }

    function isSecretary() {
        return AUTH.userRole === 'secretary' ||
            AUTH.userRole === 'secretary_administration' ||
            AUTH.userRole === 'secretary_communication';
    }

    function isTreasurer() {
        return AUTH.userRole === 'treasurer';
    }

    function canApproveProjects() {
        return hasPermission('canApprove');
    }

    // ============================================================
    // PASSWORD CHANGE
    // ============================================================
    async function changePassword(userId, newPassword) {
        if (!newPassword || newPassword.trim().length < 6) {
            throw new Error('Password must be at least 6 characters.');
        }

        const SUPABASE_URL = window.UnityConfig?.supabase?.url;
        const ANON_KEY = window.UnityConfig?.supabase?.anonKey;

        if (!SUPABASE_URL || !ANON_KEY) throw new Error('Database not available.');

        const response = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ password_text: newPassword.trim() })
        });

        if (!response.ok) {
            throw new Error('Failed to update password. Please try again.');
        }
        return true;
    }

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    function escHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            const [y, m, d] = dateOnly.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    function formatTime(timeStr) {
        if (!timeStr) return '';
        try {
            const parts = String(timeStr).split(':');
            if (parts.length < 2) return timeStr;
            const h = parseInt(parts[0]);
            const m = String(parts[1]).padStart(2, '0');
            if (isNaN(h)) return timeStr;
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${m} ${ampm}`;
        } catch (e) {
            return timeStr;
        }
    }

    function formatTimeAgo(dateStr) {
        if (!dateStr) return '';
        try {
            const now = new Date();
            const past = new Date(dateStr);
            if (isNaN(past.getTime())) return '';
            const diffMs = now - past;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return past.toLocaleDateString('en-IN');
        } catch (e) {
            return '';
        }
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ============================================================
    // TOAST NOTIFICATIONS
    // ============================================================
    function showAdminToast(message, type = 'info') {
        const container = document.getElementById('admin-toast-container');
        if (!container) {
            console.log(`[Toast - ${type}]: ${message}`);
            return;
        }

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <span>${escHtml(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 400);
        }, 4500);
    }

    // ============================================================
    // MODAL SYSTEM
    // ============================================================
    function openModal(title, bodyHTML, onSave, options = {}) {
        const overlay = document.getElementById('admin-modal-overlay');
        const modal = document.getElementById('admin-modal');

        if (!overlay || !modal) {
            console.warn('Modal elements not found');
            return null;
        }

        // Set content
        const titleEl = document.getElementById('admin-modal-title');
        const bodyEl = document.getElementById('admin-modal-body');
        if (titleEl) titleEl.innerHTML = title;
        if (bodyEl) bodyEl.innerHTML = bodyHTML;

        // Set size
        modal.classList.remove('wide', 'narrow');
        if (options.wide) modal.classList.add('wide');
        if (options.narrow) modal.classList.add('narrow');

        // Save button
        const saveBtn = document.getElementById('admin-modal-save');
        if (saveBtn) {
            saveBtn.style.display = options.hideSave ? 'none' : '';
            saveBtn.innerHTML = options.saveLabel || '<i class="fas fa-save"></i> Save';
        }

        // Show modal
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Close function
        const close = () => {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
            modal.classList.remove('wide', 'narrow');
            document.removeEventListener('keydown', escHandler);
        };

        // Wire up buttons using onclick (replaces old listeners)
        const closeBtn = document.getElementById('admin-modal-close');
        const cancelBtn = document.getElementById('admin-modal-cancel');
        const freshSave = document.getElementById('admin-modal-save');

        if (closeBtn) closeBtn.onclick = close;
        if (cancelBtn) cancelBtn.onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        if (freshSave && typeof onSave === 'function') {
            freshSave.onclick = () => onSave(close);
        }

        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('keydown', escHandler);

        return close;
    }

    function openConfirm(title, message, onConfirm, type = 'danger') {
        const overlay = document.getElementById('confirm-modal-overlay');
        if (!overlay) {
            if (confirm(`${title}\n\n${message}`)) {
                if (typeof onConfirm === 'function') onConfirm();
            }
            return;
        }

        const titleEl = document.getElementById('confirm-modal-title');
        const msgEl = document.getElementById('confirm-modal-message');
        const iconEl = document.getElementById('confirm-modal-icon');
        const closeBtn = document.getElementById('confirm-modal-close');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const okBtn = document.getElementById('confirm-modal-ok');

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;

        const iconMap = {
            danger: { icon: 'fa-exclamation-triangle', cls: 'danger' },
            success: { icon: 'fa-check-circle', cls: 'success' },
            warning: { icon: 'fa-question-circle', cls: 'warning' }
        };
        const iconInfo = iconMap[type] || iconMap.danger;

        if (iconEl) {
            iconEl.className = `confirm-icon ${iconInfo.cls}`;
            iconEl.innerHTML = `<i class="fas ${iconInfo.icon}"></i>`;
        }

        if (okBtn) {
            okBtn.className = `btn btn-${type === 'success' ? 'success' : 'danger'}`;
        }

        overlay.style.display = 'flex';

        const close = () => { overlay.style.display = 'none'; };

        if (closeBtn) closeBtn.onclick = close;
        if (cancelBtn) cancelBtn.onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        if (okBtn) {
            okBtn.onclick = () => {
                close();
                if (typeof onConfirm === 'function') onConfirm();
            };
        }
    }

    // ============================================================
    // PAGE NAVIGATION
    // ============================================================
    function navigateToPage(pageId) {
        // Deactivate all pages and nav items
        document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        // Activate target page
        const page = document.getElementById(pageId);
        if (page) page.classList.add('active');

        // Activate nav item
        const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (navItem) navItem.classList.add('active');

        // Update breadcrumb
        const breadcrumb = document.getElementById('topbar-breadcrumb');
        if (breadcrumb && navItem) {
            const label = navItem.querySelector('span')?.textContent || '';
            const iconEl = navItem.querySelector('i');
            const iconClass = iconEl ? iconEl.className : 'fas fa-circle';
            breadcrumb.innerHTML = `<i class="${iconClass}"></i> ${escHtml(label)}`;
        }

        // Load page content
        loadPageContent(pageId);

        // Scroll to top
        const content = document.getElementById('admin-content');
        if (content) content.scrollTop = 0;
    }

    function loadPageContent(pageId) {
        const loaders = {
            'page-dashboard': () => window.AdminDashboard?.load(),
            'page-events': () => window.AdminEvents?.load(),
            'page-reports': () => window.AdminReports?.load(),
            'page-meetings': () => window.AdminMeetings?.load(),
            'page-treasury': () => window.AdminTreasury?.load(),
            'page-members': () => window.AdminMembers?.load(),
            'page-past-leaders': () => window.AdminMembers?.loadPastLeaders(),
            'page-trainers': () => window.AdminMembers?.loadTrainers(),
            'page-bulletins': () => window.AdminBulletins?.load(),
            'page-applications': () => window.AdminApplications?.load(),
            'page-blood': () => window.AdminBlood?.load(),
            'page-admin-users': () => window.AdminUsers?.load(),
            'page-settings': () => window.AdminSettings?.load(),
            'page-email-logs': () => window.AdminEmailLogs?.load(),
            'page-profile': () => loadProfilePage()
        };

        if (loaders[pageId]) {
            try {
                loaders[pageId]();
            } catch (e) {
                console.error(`Error loading page ${pageId}:`, e);
            }
        }
    }

    // ============================================================
    // BUILD SIDEBAR NAV
    // ============================================================
    function buildSidebarNav() {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;

        const perms = getPermissions();
        const high = isHighLevel();
        const superOrAdvisor = isSuperAdmin() || isAdvisor();

        const sections = [
            {
                label: 'Main',
                items: [
                    {
                        id: 'page-dashboard',
                        icon: 'fa-tachometer-alt',
                        label: 'Dashboard',
                        show: true
                    }
                ]
            },
            {
                label: 'Events & Projects',
                items: [
                    {
                        id: 'page-events',
                        icon: 'fa-calendar-alt',
                        label: 'Events & Projects',
                        show: true
                    },
                    {
                        id: 'page-reports',
                        icon: 'fa-file-alt',
                        label: 'Reports',
                        show: high || !!perms.canViewReports
                    },
                    {
                        id: 'page-meetings',
                        icon: 'fa-users-cog',
                        label: 'Meetings',
                        show: high || !!perms.canViewMeetings
                    }
                ]
            },
            {
                label: 'Finance',
                items: [
                    {
                        id: 'page-treasury',
                        icon: 'fa-rupee-sign',
                        label: 'Treasury',
                        show: high || !!perms.canViewTreasury
                    }
                ]
            },
            {
                label: 'Members & Club',
                items: [
                    {
                        id: 'page-members',
                        icon: 'fa-users',
                        label: 'Members',
                        show: high || !!perms.canViewMembers
                    },
                    {
                        id: 'page-applications',
                        icon: 'fa-user-clock',
                        label: 'Applications',
                        show: high || !!perms.canEditMembers
                    },
                    {
                        id: 'page-past-leaders',
                        icon: 'fa-crown',
                        label: 'Past Leaders',
                        show: high
                    },
                    {
                        id: 'page-trainers',
                        icon: 'fa-chalkboard-teacher',
                        label: 'Trainers',
                        show: high
                    },
                    {
                        id: 'page-bulletins',
                        icon: 'fa-newspaper',
                        label: 'Bulletins',
                        show: true
                    },
                    {
                        id: 'page-blood',
                        icon: 'fa-tint',
                        label: 'Blood Requests',
                        show: true
                    }
                ]
            },
            {
                label: 'Administration',
                items: [
                    {
                        id: 'page-admin-users',
                        icon: 'fa-user-shield',
                        label: 'Admin Users',
                        show: superOrAdvisor
                    },
                    {
                        id: 'page-settings',
                        icon: 'fa-cog',
                        label: 'Site Settings',
                        show: superOrAdvisor
                    },
                    {
                        id: 'page-email-logs',
                        icon: 'fa-envelope-open-text',
                        label: 'Email Logs',
                        show: high || !!perms.canSendMail
                    },
                    {
                        id: 'page-profile',
                        icon: 'fa-user-circle',
                        label: 'My Profile',
                        show: true
                    }
                ]
            }
        ];

        let html = '';
        sections.forEach(section => {
            const visibleItems = section.items.filter(item => item.show);
            if (!visibleItems.length) return;

            html += `<div class="nav-section-label">${section.label}</div>`;
            visibleItems.forEach(item => {
                html += `
                    <div class="nav-item" data-page="${item.id}" title="${item.label}">
                        <i class="fas ${item.icon}"></i>
                        <span>${item.label}</span>
                    </div>
                `;
            });
            html += `<div class="nav-divider"></div>`;
        });

        nav.innerHTML = html;

        // Attach click listeners
        nav.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                navigateToPage(item.dataset.page);
                // Close mobile sidebar
                if (window.innerWidth <= 1024) {
                    document.getElementById('admin-sidebar')?.classList.remove('mobile-open');
                    document.querySelector('.sidebar-overlay')?.classList.remove('active');
                }
            });
        });
    }

    // ============================================================
    // THEME
    // ============================================================
    function initTheme() {
        const saved = localStorage.getItem('unity_theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);

        const icon = document.getElementById('admin-theme-icon');
        if (icon) icon.className = saved === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

        const btn = document.getElementById('admin-theme-toggle');
        if (btn) {
            btn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('unity_theme', next);
                const ic = document.getElementById('admin-theme-icon');
                if (ic) ic.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            });
        }
    }

    // ============================================================
    // SIDEBAR TOGGLE (Mobile + Desktop)
    // ============================================================
    function initSidebarToggle() {
        const sidebar = document.getElementById('admin-sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle-btn');
        const closeBtn = document.getElementById('sidebar-close');
        const main = document.getElementById('admin-main');

        // Create mobile overlay if not exists
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        overlay.addEventListener('click', () => {
            sidebar?.classList.remove('mobile-open');
            overlay.classList.remove('active');
        });

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (window.innerWidth <= 1024) {
                    sidebar?.classList.toggle('mobile-open');
                    overlay.classList.toggle('active');
                } else {
                    sidebar?.classList.toggle('collapsed');
                    main?.classList.toggle('expanded');
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                sidebar?.classList.remove('mobile-open');
                overlay.classList.remove('active');
            });
        }

        // Notification panel toggle
        const notifBtn = document.getElementById('topbar-notif-btn');
        const notifPanel = document.getElementById('notif-panel');
        const notifClose = document.getElementById('notif-panel-close');

        if (notifBtn && notifPanel) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hidden = notifPanel.style.display === 'none' || !notifPanel.style.display;
                notifPanel.style.display = hidden ? 'flex' : 'none';
            });

            if (notifClose) {
                notifClose.addEventListener('click', () => {
                    notifPanel.style.display = 'none';
                });
            }

            document.addEventListener('click', (e) => {
                if (notifPanel.style.display !== 'none' &&
                    !notifPanel.contains(e.target) &&
                    !notifBtn.contains(e.target)) {
                    notifPanel.style.display = 'none';
                }
            });
        }
    }

    // ============================================================
    // NOTIFICATIONS LOADER
    // ============================================================
    async function loadNotifications() {
        const SUPABASE_URL = window.UnityConfig?.supabase?.url;
        const ANON_KEY = window.UnityConfig?.supabase?.anonKey;
        if (!SUPABASE_URL || !ANON_KEY) return;

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/notifications?select=*&is_read=eq.false&order=created_at.desc&limit=10`,
                {
                    headers: {
                        'apikey': ANON_KEY,
                        'Authorization': `Bearer ${ANON_KEY}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) return;
            const data = await response.json();
            if (!data || !data.length) return;

            const badge = document.getElementById('notif-badge');
            if (badge) {
                badge.textContent = data.length;
                badge.style.display = '';
            }

            const list = document.getElementById('notif-list');
            if (!list) return;

            const typeIcons = {
                info: 'fa-info-circle',
                success: 'fa-check-circle',
                warning: 'fa-exclamation-triangle',
                error: 'fa-times-circle',
                birthday: 'fa-birthday-cake',
                event: 'fa-calendar-alt',
                meeting: 'fa-users-cog',
                treasury: 'fa-rupee-sign'
            };

            list.innerHTML = data.map(n => `
                <div class="notif-item" data-id="${escHtml(n.id)}">
                    <div class="notif-icon ${escHtml(n.type)}">
                        <i class="fas ${typeIcons[n.type] || 'fa-bell'}"></i>
                    </div>
                    <div class="notif-text">
                        <h5>${escHtml(n.title)}</h5>
                        ${n.message ? `<p>${escHtml(n.message)}</p>` : ''}
                        <div class="notif-time">${formatTimeAgo(n.created_at)}</div>
                    </div>
                </div>
            `).join('');

            list.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.id;
                    item.style.opacity = '0.5';
                    fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${id}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': ANON_KEY,
                            'Authorization': `Bearer ${ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ is_read: true })
                    }).catch(() => { });
                });
            });

        } catch (e) {
            console.warn('Notifications load failed:', e.message);
        }
    }

    // ============================================================
    // PROFILE PAGE
    // ============================================================
    function loadProfilePage() {
        const user = getCurrentUser();
        if (!user) return;

        const card = document.getElementById('profile-card');
        if (!card) return;

        const roleLabel = getPermissionsForRole(user.role)?.label || user.role || '';

        card.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar-wrap">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="profile-header-info">
                    <h2>${escHtml(user.name)}</h2>
                    <p>${escHtml(roleLabel)}</p>
                </div>
            </div>
            <div class="profile-body">
                <div class="profile-field-group">
                    <div class="profile-field">
                        <label>Email Address</label>
                        <span>${escHtml(user.email)}</span>
                    </div>
                    <div class="profile-field">
                        <label>Role</label>
                        <span>${escHtml(roleLabel)}</span>
                    </div>
                    ${user.portfolio ? `
                    <div class="profile-field">
                        <label>Portfolio</label>
                        <span>${escHtml(user.portfolio)}</span>
                    </div>` : ''}
                    ${user.ri_id ? `
                    <div class="profile-field">
                        <label>RI ID</label>
                        <span>${escHtml(user.ri_id)}</span>
                    </div>` : ''}
                    ${user.phone ? `
                    <div class="profile-field">
                        <label>Phone</label>
                        <span>${escHtml(user.phone)}</span>
                    </div>` : ''}
                    ${user.avenue ? `
                    <div class="profile-field">
                        <label>Avenue</label>
                        <span>${escHtml(window.UnityConfig?.avenues?.[user.avenue] || user.avenue)}</span>
                    </div>` : ''}
                </div>

                <div class="profile-password-section">
                    <h4>
                        <i class="fas fa-lock" style="color:var(--a-primary);margin-right:8px;"></i>
                        Change Password
                    </h4>
                    <form id="change-password-form" autocomplete="off">
                        <div class="modal-form-grid cols-1">
                            <div class="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    id="new-password"
                                    placeholder="Minimum 6 characters"
                                    minlength="6"
                                    autocomplete="new-password">
                            </div>
                            <div class="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirm-password"
                                    placeholder="Re-enter new password"
                                    autocomplete="new-password">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary btn-sm" style="margin-top:14px;">
                            <i class="fas fa-save"></i> Update Password
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPw = document.getElementById('new-password')?.value?.trim();
            const confirmPw = document.getElementById('confirm-password')?.value?.trim();

            if (!newPw || newPw.length < 6) {
                showAdminToast('Password must be at least 6 characters', 'warning');
                return;
            }
            if (newPw !== confirmPw) {
                showAdminToast('Passwords do not match', 'error');
                return;
            }

            try {
                await changePassword(user.id, newPw);
                showAdminToast('Password updated successfully!', 'success');
                document.getElementById('change-password-form')?.reset();
            } catch (err) {
                showAdminToast(err.message || 'Failed to update password', 'error');
            }
        });
    }

    // ============================================================
    // SETUP ADMIN PANEL (after successful login)
    // ============================================================
    function setupAdminPanel() {
        const user = getCurrentUser();
        if (!user) {
            signOut();
            return;
        }

        const roleLabel = getPermissionsForRole(user.role)?.label || user.role;

        // Set sidebar user info
        const sidebarName = document.getElementById('sidebar-user-name');
        const sidebarRole = document.getElementById('sidebar-user-role');
        const topbarName = document.getElementById('topbar-user-name');

        if (sidebarName) sidebarName.textContent = user.name;
        if (sidebarRole) sidebarRole.textContent = roleLabel;
        if (topbarName) topbarName.textContent = user.name;

        // Build navigation
        buildSidebarNav();

        // Init theme
        initTheme();

        // Init sidebar toggle
        initSidebarToggle();

        // Logout button
        const logoutBtn = document.getElementById('sidebar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                openConfirm(
                    'Sign Out',
                    'Are you sure you want to sign out?',
                    signOut,
                    'warning'
                );
            });
        }

        // Image preview modal close
        const imgClose = document.getElementById('image-preview-close');
        const imgOverlay = document.getElementById('image-preview-overlay');
        if (imgClose) imgClose.onclick = () => { if (imgOverlay) imgOverlay.style.display = 'none'; };
        if (imgOverlay) {
            imgOverlay.onclick = (e) => {
                if (e.target === imgOverlay) imgOverlay.style.display = 'none';
            };
        }

        // Load notifications
        loadNotifications();

        // Auto-refresh session every 30 minutes
        setInterval(refreshSessionTimestamp, 30 * 60 * 1000);

        // Navigate to dashboard
        navigateToPage('page-dashboard');
    }

    // ============================================================
    // LOGIN FORM
    // ============================================================
    function initLoginForm() {
        const form = document.getElementById('login-form');
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const errorDiv = document.getElementById('login-error');
        const loginBtn = document.getElementById('login-btn');
        const loginBtnText = document.getElementById('login-btn-text');
        const loginBtnLoader = document.getElementById('login-btn-loader');
        const pwToggle = document.getElementById('pw-toggle');

        // Password visibility toggle
        if (pwToggle && passwordInput) {
            pwToggle.addEventListener('click', () => {
                const isPass = passwordInput.type === 'password';
                passwordInput.type = isPass ? 'text' : 'password';
                const ic = pwToggle.querySelector('i');
                if (ic) ic.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        }

        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput?.value?.trim() || '';
            const password = passwordInput?.value || '';

            if (!email || !password) {
                showLoginError('Please enter your email and password.');
                return;
            }

            // Show loading
            if (loginBtn) loginBtn.disabled = true;
            if (loginBtnText) loginBtnText.style.display = 'none';
            if (loginBtnLoader) loginBtnLoader.style.display = '';
            if (errorDiv) errorDiv.style.display = 'none';

            try {
                const user = await signIn(email, password);

                // Success
                if (loginBtn) {
                    loginBtn.style.background = '#10b981';
                    loginBtn.innerHTML = `<i class="fas fa-check"></i> Welcome, ${escHtml(user.name)}!`;
                }

                setTimeout(() => {
                    const loginPage = document.getElementById('login-page');
                    const adminPanel = document.getElementById('admin-panel');
                    if (loginPage) loginPage.style.display = 'none';
                    if (adminPanel) adminPanel.style.display = 'flex';
                    setupAdminPanel();
                }, 900);

            } catch (err) {
                showLoginError(err.message || 'Login failed. Please try again.');

                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.style.background = '';
                    loginBtn.innerHTML = '';
                }
                if (loginBtnText) loginBtnText.style.display = '';
                if (loginBtnLoader) loginBtnLoader.style.display = 'none';

                // Shake animation
                const card = document.querySelector('.login-card');
                if (card) {
                    card.style.animation = 'none';
                    void card.offsetHeight; // force reflow
                    card.style.animation = 'loginShake 0.5s ease';
                }
            }
        });

        // Tab between fields
        emailInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') passwordInput?.focus();
        });

        // Add shake style
        if (!document.getElementById('login-shake-style')) {
            const style = document.createElement('style');
            style.id = 'login-shake-style';
            style.textContent = `
                @keyframes loginShake {
                    0%,100%{transform:translateX(0)}
                    20%{transform:translateX(-12px)}
                    40%{transform:translateX(12px)}
                    60%{transform:translateX(-8px)}
                    80%{transform:translateX(8px)}
                }
            `;
            document.head.appendChild(style);
        }

        // Focus email field
        setTimeout(() => emailInput?.focus(), 400);
    }

    function showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${escHtml(message)}`;
            errorDiv.style.display = 'flex';
        }
    }

    // ============================================================
    // INIT ADMIN PANEL - Main Entry Point
    // ============================================================
    async function initAdminPanel() {
        const loadingEl = document.getElementById('admin-loading');
        const loginPage = document.getElementById('login-page');
        const adminPanel = document.getElementById('admin-panel');

        // Wait for UnityConfig (supabase-client.js must load first)
        let attempts = 0;
        while (!window.UnityConfig && attempts < 100) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (!window.UnityConfig) {
            console.error('UnityConfig not available. Check supabase-client.js is loaded.');
        }

        // Hide loading screen
        setTimeout(() => {
            if (loadingEl) {
                loadingEl.classList.add('loaded');
                setTimeout(() => {
                    if (loadingEl.parentNode) loadingEl.remove();
                }, 600);
            }
        }, 1200);

        // Check existing session
        const user = loadSession();

        if (!user) {
            // Show login
            if (loginPage) loginPage.style.display = '';
            if (adminPanel) adminPanel.style.display = 'none';
            initLoginForm();
        } else {
            // Show admin panel
            if (loginPage) loginPage.style.display = 'none';
            if (adminPanel) adminPanel.style.display = 'flex';
            setupAdminPanel();
        }
    }

    // ============================================================
    // EXPOSE PUBLIC API
    // ============================================================
    window.UnityAuth = {
        // Core auth
        init: initAdminPanel,
        signIn,
        signOut,
        getCurrentUser,
        getUserRole,
        getPermissions,

        // Permission checks
        hasPermission,
        canAccessAvenue,
        canAccessPage,
        isHighLevel,
        isSuperAdmin,
        isAdvisor,
        isPresident,
        isSecretary,
        isTreasurer,
        canApproveProjects,

        // Account
        changePassword,
        refreshSession: refreshSessionTimestamp,

        // Navigation
        navigateToPage,
        loadPageContent,

        // UI helpers
        openModal,
        openConfirm,
        showAdminToast,
        loadProfilePage,

        // Utilities
        escHtml,
        formatDate,
        formatTime,
        formatTimeAgo,
        debounce
    };

    // ============================================================
    // AUTO-INITIALIZE
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('admin-panel') !== null) {
                initAdminPanel();
            }
        });
    } else {
        if (document.getElementById('admin-panel') !== null) {
            initAdminPanel();
        }
    }

})();