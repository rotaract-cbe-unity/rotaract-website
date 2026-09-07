/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - AUTHENTICATION MODULE
   Login, Logout, Session, Role-Based Access Control
   User Avatar with Initials | Icon Fixes | Bug-Free
   ============================================================ */

const Auth = {
    sessionKey: 'rotaract_unity_session',
    currentUser: null,
    userPermissions: {},
    accessLevel: 0,
    initialized: false,

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindEvents();
        this.checkSession();
    },

    bindEvents() {
        // Admin login button
        const loginBtn = document.getElementById('adminLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // Login modal close
        const loginClose = document.getElementById('adminLoginClose');
        if (loginClose) {
            loginClose.addEventListener('click', () => this.hideLoginModal());
        }

        // Login modal overlay click
        const loginModal = document.getElementById('adminLoginModal');
        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) this.hideLoginModal();
            });
        }

        // Login form submit
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Password toggle
        const pwToggle = document.getElementById('passwordToggle');
        if (pwToggle) {
            pwToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const pwInput = document.querySelector('#adminLoginForm input[name="password"]');
                if (!pwInput) return;

                const isPassword = pwInput.type === 'password';
                pwInput.type = isPassword ? 'text' : 'password';

                const newIcon = isPassword ? 'eye-off' : 'eye';
                pwToggle.innerHTML = '<i data-feather="' + newIcon + '"></i>';

                if (typeof feather !== 'undefined') {
                    feather.replace();
                }

                this.fixPasswordToggleIcon();
                setTimeout(() => this.fixPasswordToggleIcon(), 50);
                setTimeout(() => this.fixPasswordToggleIcon(), 150);

                pwInput.focus();
            });
        }

        // Admin panel controls
        const backToSite = document.getElementById('adminBackToSite');
        if (backToSite) {
            backToSite.addEventListener('click', () => this.hideAdminPanel());
        }

        const logoutBtn = document.getElementById('adminLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Admin sidebar toggle (mobile)
        const sidebarToggle = document.getElementById('adminSidebarToggle');
        const sidebar = document.getElementById('adminSidebar');
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }

        // Admin navigation
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const panel = link.dataset.panel;
                if (panel) this.switchAdminPanel(panel);
                if (sidebar && window.innerWidth <= 992) {
                    sidebar.classList.remove('active');
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideLoginModal();
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                if (this.currentUser) {
                    this.showAdminPanel();
                } else {
                    this.showLoginModal();
                }
            }
        });
    },

    // ============================================================
    // PASSWORD TOGGLE ICON FIX
    // ============================================================
    fixPasswordToggleIcon() {
        const pwToggle = document.getElementById('passwordToggle');
        if (!pwToggle) return;

        const svg = pwToggle.querySelector('svg');
        if (svg) {
            svg.setAttribute('width', '18');
            svg.setAttribute('height', '18');
            svg.style.width = '18px';
            svg.style.height = '18px';
            svg.style.minWidth = '18px';
            svg.style.minHeight = '18px';
            svg.style.maxWidth = '18px';
            svg.style.maxHeight = '18px';
            svg.style.display = 'block';
        }
    },

    // ============================================================
    // USER AVATAR INITIALS
    // ============================================================
    getInitials(name) {
        if (!name) return 'A';
        const parts = String(name).trim().split(/\s+/);
        if (parts.length === 0) return 'A';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },

    updateUserAvatar() {
        const initialEl = document.getElementById('adminUserInitial');
        if (initialEl && this.currentUser && this.currentUser.full_name) {
            initialEl.textContent = this.getInitials(this.currentUser.full_name);
        }
    },

    // ============================================================
    // SESSION MANAGEMENT
    // ============================================================
    checkSession() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) return;

            const session = JSON.parse(sessionData);
            const sessionAge = Date.now() - (session.timestamp || 0);
            const maxAge = 24 * 60 * 60 * 1000;

            if (sessionAge > maxAge) {
                this.clearSession();
                return;
            }

            this.validateSession(session);
        } catch (err) {
            console.error('Session check error:', err);
            this.clearSession();
        }
    },

    async validateSession(session) {
        try {
            const { data, error } = await supabaseAdmin
                .from('users')
                .select('id, email, full_name, portfolio, role, is_active, is_board_member')
                .eq('id', session.userId)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                this.clearSession();
                return;
            }

            const { data: roleData } = await supabaseAdmin
                .from('roles_config')
                .select('permissions, access_level')
                .eq('role_name', data.role)
                .single();

            this.currentUser = {
                id: data.id,
                email: data.email,
                full_name: data.full_name,
                portfolio: data.portfolio,
                role: data.role,
                is_board_member: data.is_board_member
            };

            this.userPermissions = roleData?.permissions || {};
            this.accessLevel = roleData?.access_level || this.getAccessLevel(data.role);

            if (typeof App !== 'undefined') {
                App.currentUser = this.currentUser;
            }

            this.updateAdminUI();
        } catch (err) {
            console.error('Validate session error:', err);
            this.clearSession();
        }
    },

    saveSession(userId) {
        try {
            localStorage.setItem(this.sessionKey, JSON.stringify({
                userId,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.warn('Save session error:', err);
        }
    },

    clearSession() {
        try {
            localStorage.removeItem(this.sessionKey);
        } catch (err) { /* silent */ }

        this.currentUser = null;
        this.userPermissions = {};
        this.accessLevel = 0;

        if (typeof App !== 'undefined') {
            App.currentUser = null;
        }

        const loginBtn = document.getElementById('adminLoginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = '<i data-feather="lock"></i>';
            loginBtn.title = 'Admin Login';
            loginBtn.onclick = () => this.showLoginModal();
            if (typeof feather !== 'undefined') feather.replace();
        }
    },

    // ============================================================
    // LOGIN
    // ============================================================
    showLoginModal() {
        const modal = document.getElementById('adminLoginModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                const emailInput = modal.querySelector('input[name="email"]');
                if (emailInput) emailInput.focus();
                if (typeof feather !== 'undefined') feather.replace();
                setTimeout(() => {
                    this.fixPasswordToggleIcon();
                    this.fixAdminIconSizes();
                }, 100);
            }, 100);
        }
    },

    hideLoginModal() {
        const modal = document.getElementById('adminLoginModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.classList.add('hidden');
            errorEl.textContent = '';
        }
    },

    async handleLogin(e) {
        e.preventDefault();

        const form = e.target;
        const email = form.querySelector('input[name="email"]').value.trim();
        const password = form.querySelector('input[name="password"]').value;
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!email || !password) {
            this.showLoginError('Please enter both email and password');
            return;
        }

        submitBtn.disabled = true;
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i data-feather="loader"></i>Authenticating...';
        if (typeof feather !== 'undefined') feather.replace();

        try {
            const { data, error } = await supabaseAdmin.rpc('authenticate_user', {
                p_email: email,
                p_password: password
            });

            if (error) {
                console.error('Auth RPC error:', error);
                this.showLoginError('Authentication failed. Please check your credentials.');
                return;
            }

            if (!data || data.length === 0) {
                this.showLoginError('Invalid email or password. Please try again.');
                return;
            }

            const user = data[0];

            this.currentUser = {
                id: user.user_id,
                email: user.user_email,
                full_name: user.user_name,
                portfolio: user.user_portfolio,
                role: user.user_role,
                is_board_member: true
            };

            this.userPermissions = user.user_permissions || {};
            this.accessLevel = this.getAccessLevel(user.user_role);

            if (typeof App !== 'undefined') {
                App.currentUser = this.currentUser;
            }

            this.saveSession(user.user_id);

            if (typeof App !== 'undefined') {
                App.logActivity('user_login', { email, role: user.user_role });
            }

            this.hideLoginModal();
            form.reset();

            if (typeof App !== 'undefined') {
                App.toast('Welcome back, ' + user.user_name + '!', 'success');
            }

            this.showAdminPanel();
        } catch (err) {
            console.error('Login error:', err);
            this.showLoginError('An unexpected error occurred. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
            if (typeof feather !== 'undefined') feather.replace();
        }
    },

    showLoginError(message) {
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    },

    // ============================================================
    // LOGOUT
    // ============================================================
    logout() {
        if (typeof App !== 'undefined') {
            App.logActivity('user_logout', { email: this.currentUser?.email });
            App.confirm('Are you sure you want to logout?', () => {
                this.clearSession();
                this.hideAdminPanel();
                App.toast('Logged out successfully', 'info');
            });
        } else {
            this.clearSession();
            this.hideAdminPanel();
        }
    },

    // ============================================================
    // ADMIN PANEL
    // ============================================================
    showAdminPanel() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }

        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            this.updateAdminUI();
            this.loadAdminDashboard();
            this.switchAdminPanel('dashboard');
            this.forceIconRefresh();
        }
    },

    hideAdminPanel() {
        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.classList.add('hidden');
            document.body.style.overflow = '';
        }
        const sidebar = document.getElementById('adminSidebar');
        if (sidebar) sidebar.classList.remove('active');
    },

    switchAdminPanel(panelName) {
        if (!this.hasPanelAccess(panelName)) {
            if (typeof App !== 'undefined') {
                App.toast('You do not have access to this section', 'warning');
            }
            return;
        }

        // Update nav
        document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector('.admin-nav-link[data-panel="' + panelName + '"]');
        if (activeLink) activeLink.classList.add('active');

        // Update content
        document.querySelectorAll('.admin-panel-content').forEach(p => p.classList.remove('active'));
        const activePanel = document.getElementById('panel-' + panelName);
        if (activePanel) activePanel.classList.add('active');

        // Update title
        const titleEl = document.getElementById('adminPanelTitle');
        if (titleEl) {
            const titles = {
                'dashboard': 'Dashboard',
                'events-manage': 'Projects Management',
                'meetings-manage': 'Meetings Management',
                'reports-manage': 'Reports Management',
                'members-manage': 'Members Management',
                'treasury-manage': 'Treasury Management',
                'newsletter-manage': 'Bulletin Management',
                'trainers-manage': 'Club Trainers',
                'leaders-manage': 'Past Presidents & Secretaries',
                'membership-apps': 'Membership Applications',
                'blood-manage': 'Blood Requests',
                'mail-manage': 'Mail Queue',
                'settings-manage': 'Site Settings',
                'roles-manage': 'Roles & Access Control',
                'statistics-manage': 'Club Statistics',
                'benefits-manage': 'Benefits of Joining',
                'chatbot-manage': 'Chatbot Knowledge Base',
                'activity-log': 'Activity Log'
            };
            titleEl.textContent = titles[panelName] || 'Admin Panel';
        }

        this.loadPanelData(panelName);
        this.forceIconRefresh();

        const content = document.getElementById('adminContent');
        if (content) content.scrollTop = 0;
    },

    // ============================================================
    // ICON REFRESH - BULLETPROOF
    // ============================================================
    forceIconRefresh() {
        const refresh = () => {
            if (typeof feather !== 'undefined') feather.replace();
            this.fixAdminIconSizes();
        };

        refresh();
        setTimeout(refresh, 100);
        setTimeout(refresh, 300);
        setTimeout(refresh, 600);
        setTimeout(refresh, 1200);
    },

    fixAdminIconSizes() {
        try {
            // Sidebar Navigation Icons (22x22)
            document.querySelectorAll('.admin-nav-link > svg, .admin-nav-link > i > svg').forEach(svg => {
                svg.setAttribute('width', '22');
                svg.setAttribute('height', '22');
                svg.style.cssText = 'width:22px!important;height:22px!important;min-width:22px;min-height:22px;max-width:22px;max-height:22px;flex-shrink:0;display:block;';
            });

            // Table Action Buttons (15x15)
            document.querySelectorAll('.table-action-btn svg').forEach(svg => {
                svg.setAttribute('width', '15');
                svg.setAttribute('height', '15');
                svg.style.cssText = 'width:15px!important;height:15px!important;min-width:15px;min-height:15px;display:block;';
            });

            // Dashboard Stat Icons (28x28)
            document.querySelectorAll('.dash-stat-icon svg').forEach(svg => {
                svg.setAttribute('width', '28');
                svg.setAttribute('height', '28');
                svg.style.cssText = 'width:28px!important;height:28px!important;display:block;';
            });

            // Dashboard Card Header Icons (22x22)
            document.querySelectorAll('.dashboard-card h3 svg').forEach(svg => {
                svg.setAttribute('width', '22');
                svg.setAttribute('height', '22');
                svg.style.cssText = 'width:22px!important;height:22px!important;display:block;';
            });

            // Treasury Card Icons (28x28)
            document.querySelectorAll('.treasury-sum-card > svg, .treasury-sum-card > i > svg').forEach(svg => {
                svg.setAttribute('width', '28');
                svg.setAttribute('height', '28');
                svg.style.cssText = 'width:28px!important;height:28px!important;display:block;';
            });

            // All Admin Buttons (16x16)
            document.querySelectorAll('.admin-panel .btn svg, .admin-modal .btn svg').forEach(svg => {
                svg.setAttribute('width', '16');
                svg.setAttribute('height', '16');
                svg.style.cssText = 'width:16px!important;height:16px!important;min-width:16px;min-height:16px;flex-shrink:0;display:block;';
            });

            // Sidebar Footer Buttons (16x16)
            document.querySelectorAll('.admin-sidebar-footer .btn svg').forEach(svg => {
                svg.setAttribute('width', '16');
                svg.setAttribute('height', '16');
                svg.style.cssText = 'width:16px!important;height:16px!important;display:block;';
            });

            // Panel Header Actions (14x14)
            document.querySelectorAll('.panel-header-actions .btn svg, .panel-filters .btn svg').forEach(svg => {
                svg.setAttribute('width', '14');
                svg.setAttribute('height', '14');
                svg.style.cssText = 'width:14px!important;height:14px!important;display:block;';
            });

            // Status Badges (12x12)
            document.querySelectorAll('.status-badge svg').forEach(svg => {
                svg.setAttribute('width', '12');
                svg.setAttribute('height', '12');
                svg.style.cssText = 'width:12px!important;height:12px!important;display:block;';
            });

            // Modal Close Buttons (18x18)
            document.querySelectorAll('.admin-modal .modal-close svg, .admin-modal-header .modal-close svg').forEach(svg => {
                svg.setAttribute('width', '18');
                svg.setAttribute('height', '18');
                svg.style.cssText = 'width:18px!important;height:18px!important;display:block;';
            });

            // Sidebar Toggle (20x20)
            document.querySelectorAll('.admin-sidebar-toggle svg').forEach(svg => {
                svg.setAttribute('width', '20');
                svg.setAttribute('height', '20');
                svg.style.cssText = 'width:20px!important;height:20px!important;display:block;';
            });

            // Admin Topbar Theme Toggle (18x18)
            document.querySelectorAll('.admin-topbar-actions .theme-toggle svg').forEach(svg => {
                svg.setAttribute('width', '18');
                svg.setAttribute('height', '18');
                svg.style.cssText = 'width:18px!important;height:18px!important;display:block;';
            });

            // Empty Table Icons (60x60)
            document.querySelectorAll('.empty-table svg').forEach(svg => {
                svg.setAttribute('width', '60');
                svg.setAttribute('height', '60');
                svg.style.cssText = 'width:60px!important;height:60px!important;display:block;';
            });

            // Minute Item Remove (14x14)
            document.querySelectorAll('.minute-item-remove svg').forEach(svg => {
                svg.setAttribute('width', '14');
                svg.setAttribute('height', '14');
                svg.style.cssText = 'width:14px!important;height:14px!important;display:block;';
            });

            // Photo Preview Remove (14x14)
            document.querySelectorAll('.photo-preview-remove svg').forEach(svg => {
                svg.setAttribute('width', '14');
                svg.setAttribute('height', '14');
                svg.style.cssText = 'width:14px!important;height:14px!important;display:block;';
            });

            // File Upload Icons (32x32)
            document.querySelectorAll('.file-upload-area > svg, .file-upload-area > i > svg').forEach(svg => {
                svg.setAttribute('width', '32');
                svg.setAttribute('height', '32');
                svg.style.cssText = 'width:32px!important;height:32px!important;display:block;';
            });

            // Confirm Dialog Icons (60x60)
            document.querySelectorAll('.confirm-dialog > svg, .confirm-dialog > i > svg').forEach(svg => {
                svg.setAttribute('width', '60');
                svg.setAttribute('height', '60');
                svg.style.cssText = 'width:60px!important;height:60px!important;display:block;';
            });

            // Password Toggle Icon
            this.fixPasswordToggleIcon();

            // Input Icon Wrap Icons (18x18)
            document.querySelectorAll('.input-icon-wrap > i > svg, .input-icon-wrap > svg').forEach(svg => {
                svg.setAttribute('width', '18');
                svg.setAttribute('height', '18');
                svg.style.cssText = 'width:18px!important;height:18px!important;min-width:18px;min-height:18px;display:block;';
            });

            // Inline Loader
            document.querySelectorAll('.inline-loader svg').forEach(svg => {
                svg.setAttribute('width', '16');
                svg.setAttribute('height', '16');
                svg.style.cssText = 'width:16px!important;height:16px!important;display:block;';
            });

        } catch (err) {
            console.warn('Fix admin icons error:', err);
        }
    },

    // ============================================================
    // ROLE-BASED ACCESS CONTROL
    // ============================================================
    getAccessLevel(role) {
        const levels = {
            'super_admin': 100,
            'president': 95,
            'ipp': 90,
            'vice_president': 85,
            'secretary_admin': 80,
            'secretary_comm': 80,
            'treasurer': 75,
            'dpp_chair': 65,
            'club_service_dir': 60,
            'community_service_dir': 60,
            'professional_service_dir': 60,
            'international_service_dir': 60,
            'blood_donor_chair': 55,
            'membership_chair': 55,
            'trf_chair': 55,
            'club_editor': 50,
            'young_leaders': 50,
            'public_image': 50,
            'board_member': 20,
            'member': 10
        };
        return levels[role] || 0;
    },

    hasPanelAccess(panelName) {
        if (!this.currentUser) return false;

        const role = this.currentUser.role;
        const perms = this.userPermissions;

        // Super admin, advisor, president, IPP have full access
        if (['super_admin', 'advisor', 'president', 'ipp'].includes(role)) return true;

        const accessMap = {
            'dashboard': () => this.accessLevel >= 20,
            'events-manage': () => perms.all || perms.events || this.accessLevel >= 50,
            'meetings-manage': () => perms.all || perms.meetings || this.accessLevel >= 75,
            'reports-manage': () => perms.all || perms.reports || perms.monitor || this.accessLevel >= 60,
            'members-manage': () => perms.all || perms.members || this.accessLevel >= 75,
            'treasury-manage': () => perms.all || perms.treasury || perms.treasury_full || this.accessLevel >= 75,
            'newsletter-manage': () => perms.all || perms.newsletter || this.accessLevel >= 50,
            'trainers-manage': () => this.accessLevel >= 75,
            'leaders-manage': () => this.accessLevel >= 75,
            'membership-apps': () => perms.all || perms.membership_apps || perms.members || this.accessLevel >= 55,
            'blood-manage': () => perms.all || perms.blood_requests || this.accessLevel >= 55,
            'mail-manage': () => this.accessLevel >= 80,
            'settings-manage': () => role === 'super_admin' || role === 'advisor',
            'roles-manage': () => role === 'super_admin' || role === 'advisor',  // Super admin only
            'statistics-manage': () => this.accessLevel >= 75,
            'benefits-manage': () => this.accessLevel >= 75,
            'chatbot-manage': () => this.accessLevel >= 75,
            'activity-log': () => this.accessLevel >= 80
        };

        const check = accessMap[panelName];
        return check ? check() : false;
    },

    canApproveProjects() {
        if (!this.currentUser) return false;
        return ['super_admin', 'president', 'ipp', 'vice_president', 'secretary_admin', 'secretary_comm'].includes(this.currentUser.role);
    },

    canApproveReports() {
        return this.canApproveProjects();
    },

    canEditTreasury() {
        if (!this.currentUser) return false;
        return ['super_admin', 'president', 'treasurer', 'secretary_admin', 'secretary_comm'].includes(this.currentUser.role);
    },

    canAccessAvenue(avenue) {
        if (!this.currentUser) return false;
        if (this.accessLevel >= 75) return true;
        const perms = this.userPermissions;
        if (perms.all) return true;
        if (perms.avenue) return perms.avenue === avenue;
        return false;
    },

    // ============================================================
    // UPDATE ADMIN UI - New Structure with User Avatar
    // ============================================================
    updateAdminUI() {
        if (!this.currentUser) return;

        const nameEl = document.getElementById('adminUserName');
        const roleEl = document.getElementById('adminUserRole');
        const initialEl = document.getElementById('adminUserInitial');

        // Update name
        if (nameEl) nameEl.textContent = this.currentUser.full_name;

        // Update avatar initials
        if (initialEl) {
            initialEl.textContent = this.getInitials(this.currentUser.full_name);
        }

        // Update role badge with shorter labels
        if (roleEl) {
            const roleLabels = {
                'super_admin': 'Super Admin',
                'president': 'President',
                'ipp': 'IPP',
                'vice_president': 'Vice President',
                'secretary_admin': 'Sec - Admin',
                'secretary_comm': 'Sec - Comm',
                'treasurer': 'Treasurer',
                'dpp_chair': 'DPP Chair',
                'club_service_dir': 'Club Service Dir',
                'community_service_dir': 'Community Dir',
                'professional_service_dir': 'Professional Dir',
                'international_service_dir': 'International Dir',
                'blood_donor_chair': 'Blood Donor Chair',
                'club_editor': 'Editor',
                'young_leaders': 'Young Leaders',
                'public_image': 'Public Image',
                'membership_chair': 'Membership Chair',
                'trf_chair': 'TRF Chair',
                'board_member': 'Board Member',
                'member': 'Member'
            };
            roleEl.textContent = roleLabels[this.currentUser.role] || this.currentUser.role;
        }

        // Show/hide nav items based on permissions
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            const panel = link.dataset.panel;
            if (panel) {
                link.style.display = this.hasPanelAccess(panel) ? 'flex' : 'none';
            }
        });

        // Update login button to show user icon
        const loginBtn = document.getElementById('adminLoginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = '<i data-feather="user"></i>';
            loginBtn.title = this.currentUser.full_name + ' - Admin Panel';
            loginBtn.onclick = () => this.showAdminPanel();
        }

        if (typeof feather !== 'undefined') feather.replace();
        setTimeout(() => this.fixAdminIconSizes(), 100);
    },

    // ============================================================
    // DASHBOARD
    // ============================================================
    async loadAdminDashboard() {
        if (!this.currentUser) return;

        try {
            const statsContainer = document.getElementById('dashboardStats');
            if (!statsContainer) return;

            statsContainer.innerHTML = '<div class="dash-stat-card glass-card"><div class="dash-stat-icon"><i data-feather="loader"></i></div><div class="dash-stat-content"><div class="dash-stat-value">...</div><div class="dash-stat-label">Loading</div></div></div>';

            const [eventsCount, membersCount, pendingApps, pendingApprovals, treasuryData, birthdays] = await Promise.all([
                this.getCount('events', 'is_approved', true),
                this.getCount('users', 'is_active', true),
                this.getCount('membership_applications', 'status', 'pending'),
                this.getCount('events', 'is_approved', false),
                this.getTreasurySummary(),
                this.getUpcomingBirthdays()
            ]);

            const currency = typeof App !== 'undefined' ? App.formatCurrency(treasuryData.balance) : '---';

            statsContainer.innerHTML =
                '<div class="dash-stat-card glass-card"><div class="dash-stat-icon"><i data-feather="calendar"></i></div><div class="dash-stat-content"><div class="dash-stat-value">' + eventsCount + '</div><div class="dash-stat-label">Total Projects</div></div></div>' +
                '<div class="dash-stat-card glass-card"><div class="dash-stat-icon"><i data-feather="users"></i></div><div class="dash-stat-content"><div class="dash-stat-value">' + membersCount + '</div><div class="dash-stat-label">Active Members</div></div></div>' +
                '<div class="dash-stat-card glass-card"><div class="dash-stat-icon"><i data-feather="user-plus"></i></div><div class="dash-stat-content"><div class="dash-stat-value">' + pendingApps + '</div><div class="dash-stat-label">Pending Applications</div></div></div>' +
                '<div class="dash-stat-card glass-card"><div class="dash-stat-icon"><i data-feather="clock"></i></div><div class="dash-stat-content"><div class="dash-stat-value">' + pendingApprovals + '</div><div class="dash-stat-label">Pending Approvals</div></div></div>' +
                '<div class="dash-stat-card glass-card"><div class="dash-stat-icon"><i data-feather="dollar-sign"></i></div><div class="dash-stat-content"><div class="dash-stat-value">' + currency + '</div><div class="dash-stat-label">Current Balance</div></div></div>' +
                '<div class="dash-stat-card glass-card"><div class="dash-stat-icon"><i data-feather="gift"></i></div><div class="dash-stat-content"><div class="dash-stat-value">' + birthdays.length + '</div><div class="dash-stat-label">Upcoming Birthdays</div></div></div>';

            this.loadDashRecentEvents();
            this.loadDashPendingApps();
            this.loadDashBirthdays(birthdays);
            this.loadDashPendingApprovals();

            if (typeof feather !== 'undefined') feather.replace();
            setTimeout(() => this.fixAdminIconSizes(), 100);
        } catch (err) {
            console.error('Dashboard load error:', err);
        }
    },

    async getCount(table, column, value) {
        try {
            const { count } = await supabaseAdmin
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq(column, value);
            return count || 0;
        } catch { return 0; }
    },

    async getTreasurySummary() {
        try {
            const { data } = await supabaseAdmin.from('treasury').select('income, expense');
            let income = 0, expense = 0;
            (data || []).forEach(t => {
                income += parseFloat(t.income) || 0;
                expense += parseFloat(t.expense) || 0;
            });
            return { income, expense, balance: income - expense };
        } catch { return { income: 0, expense: 0, balance: 0 }; }
    },

    async getUpcomingBirthdays() {
        try {
            const { data } = await supabaseAdmin
                .from('users')
                .select('id, full_name, date_of_birth, photo_url, portfolio')
                .eq('is_active', true)
                .not('date_of_birth', 'is', null);

            if (!data) return [];

            const today = new Date();
            const todayMD = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

            return data.filter(u => {
                if (!u.date_of_birth) return false;
                const dob = new Date(u.date_of_birth);
                const dobMD = String(dob.getMonth() + 1).padStart(2, '0') + '-' + String(dob.getDate()).padStart(2, '0');
                return dobMD === todayMD;
            }).slice(0, 5);
        } catch { return []; }
    },

    async loadDashRecentEvents() {
        const container = document.getElementById('dashRecentEvents');
        if (!container) return;
        try {
            const { data } = await supabaseAdmin
                .from('events')
                .select('id, event_name, event_date, avenue, is_approved')
                .order('event_date', { ascending: false })
                .limit(5);

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">No recent projects</p>';
                return;
            }

            const esc = typeof App !== 'undefined' ? App.esc.bind(App) : (s) => s;
            const fmt = typeof App !== 'undefined' ? App.formatDate.bind(App) : (s) => s;

            container.innerHTML = data.map(e =>
                '<div class="dash-list-item"><div class="dash-list-item-info"><div class="dash-list-item-title">' + esc(e.event_name) + '</div><div class="dash-list-item-meta">' + fmt(e.event_date) + '</div></div><span class="status-badge ' + (e.is_approved ? 'status-approved' : 'status-pending') + '">' + (e.is_approved ? 'Approved' : 'Pending') + '</span></div>'
            ).join('');

            setTimeout(() => this.fixAdminIconSizes(), 50);
        } catch (err) {
            container.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">Error loading</p>';
        }
    },

    async loadDashPendingApps() {
        const container = document.getElementById('dashPendingApps');
        if (!container) return;
        try {
            const { data } = await supabaseAdmin
                .from('membership_applications')
                .select('id, full_name, email, created_at')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(5);

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">No pending applications</p>';
                return;
            }

            const esc = typeof App !== 'undefined' ? App.esc.bind(App) : (s) => s;

            container.innerHTML = data.map(a =>
                '<div class="dash-list-item"><div class="dash-list-item-info"><div class="dash-list-item-title">' + esc(a.full_name) + '</div><div class="dash-list-item-meta">' + esc(a.email) + '</div></div><span class="dash-list-item-badge">New</span></div>'
            ).join('');
        } catch (err) {
            container.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">Error loading</p>';
        }
    },

    loadDashBirthdays(birthdays) {
        const container = document.getElementById('dashBirthdays');
        if (!container) return;

        if (!birthdays || birthdays.length === 0) {
            container.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">No birthdays today</p>';
            return;
        }

        const esc = typeof App !== 'undefined' ? App.esc.bind(App) : (s) => s;

        container.innerHTML = birthdays.map(b =>
            '<div class="dash-list-item"><div class="dash-list-item-info"><div class="dash-list-item-title">' + esc(b.full_name) + '</div><div class="dash-list-item-meta">' + esc(b.portfolio || 'Member') + '</div></div><span class="dash-list-item-badge" style="background:linear-gradient(135deg,rgba(220,38,38,0.15),rgba(244,63,94,0.15));color:#dc2626;border-color:rgba(220,38,38,0.3);">Today!</span></div>'
        ).join('');
    },

    async loadDashPendingApprovals() {
        const container = document.getElementById('dashPendingApprovals');
        if (!container) return;
        try {
            const { data } = await supabaseAdmin
                .from('events')
                .select('id, event_name, avenue, event_date')
                .eq('is_approved', false)
                .order('event_date', { ascending: false })
                .limit(5);

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">No pending approvals</p>';
                return;
            }

            const esc = typeof App !== 'undefined' ? App.esc.bind(App) : (s) => s;
            const label = typeof App !== 'undefined' ? App.avenueLabel.bind(App) : (s) => s;

            container.innerHTML = data.map(e =>
                '<div class="dash-list-item"><div class="dash-list-item-info"><div class="dash-list-item-title">' + esc(e.event_name) + '</div><div class="dash-list-item-meta">' + label(e.avenue) + '</div></div><span class="status-badge status-pending">Pending</span></div>'
            ).join('');

            setTimeout(() => this.fixAdminIconSizes(), 50);
        } catch (err) {
            container.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">Error loading</p>';
        }
    },

    // ============================================================
    // PANEL DATA DISPATCHER
    // ============================================================
    loadPanelData(panelName) {
        if (typeof AdminPanel === 'undefined') return;

        try {
            switch (panelName) {
                case 'dashboard':
                    this.loadAdminDashboard();
                    break;
                case 'events-manage':
                    if (AdminPanel.loadEvents) AdminPanel.loadEvents();
                    break;
                case 'meetings-manage':
                    if (typeof Meetings !== 'undefined' && Meetings.loadMeetings) {
                        Meetings.loadMeetings();
                    } else if (AdminPanel.loadMeetings) {
                        AdminPanel.loadMeetings();
                    }
                    break;
                case 'reports-manage':
                    if (AdminPanel.loadReports) AdminPanel.loadReports();
                    break;
                case 'members-manage':
                    if (AdminPanel.loadMembersAdmin) AdminPanel.loadMembersAdmin();
                    break;
                case 'treasury-manage':
                    if (typeof Treasury !== 'undefined' && Treasury.loadTreasury) {
                        Treasury.loadTreasury();
                    }
                    break;
                case 'newsletter-manage':
                    if (typeof Newsletter !== 'undefined' && Newsletter.loadNewslettersAdmin) {
                        Newsletter.loadNewslettersAdmin();
                    } else if (AdminPanel.loadNewslettersAdmin) {
                        AdminPanel.loadNewslettersAdmin();
                    }
                    break;
                case 'trainers-manage':
                    if (AdminPanel.loadTrainersAdmin) AdminPanel.loadTrainersAdmin();
                    break;
                case 'leaders-manage':
                    if (AdminPanel.loadLeadersAdmin) AdminPanel.loadLeadersAdmin();
                    break;
                case 'membership-apps':
                    if (AdminPanel.loadApplications) AdminPanel.loadApplications();
                    break;
                case 'blood-manage':
                    if (typeof Blood !== 'undefined' && Blood.loadBloodRequestsAdmin) {
                        Blood.loadBloodRequestsAdmin();
                    } else if (AdminPanel.loadBloodRequests) {
                        AdminPanel.loadBloodRequests();
                    }
                    break;
                case 'mail-manage':
                    if (AdminPanel.loadMailQueue) AdminPanel.loadMailQueue();
                    break;
                case 'settings-manage':
                    if (AdminPanel.loadSettings) AdminPanel.loadSettings();
                    break;
                case 'roles-manage':
                    if (AdminPanel.loadRoles) AdminPanel.loadRoles();
                    break;
                case 'statistics-manage':
                    if (AdminPanel.loadStatisticsAdmin) AdminPanel.loadStatisticsAdmin();
                    break;
                case 'benefits-manage':
                    if (AdminPanel.loadBenefitsAdmin) AdminPanel.loadBenefitsAdmin();
                    break;
                case 'chatbot-manage':
                    if (AdminPanel.loadChatbotData) AdminPanel.loadChatbotData();
                    break;
                case 'activity-log':
                    if (AdminPanel.loadActivityLog) AdminPanel.loadActivityLog();
                    break;
            }

            setTimeout(() => this.forceIconRefresh(), 200);
        } catch (err) {
            console.error('Load panel data error:', err);
        }
    }
};

// ============================================================
// GLOBAL EXPOSURE
// ============================================================
window.Auth = Auth;