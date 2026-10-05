// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// COMPLETE ADVANCED ADMIN PORTAL SYSTEM
// File: js/admin.js | Version: 15.1.0 (fixed: notify/ymd helpers, unified icons, table names)
// All Sessions Built-In | Full CRUD | Reports Engine
// ULTRA-POWERFUL SITE SETTINGS CONTROL
// ============================================

(function () {
    'use strict';

    const AdminPanel = {
        currentPage: 'dashboard',
        initialized: false,
        workspace: null,
        activeModal: null,
        realtimeSubscriptions: [],
        pageHistory: [],

        async init() {
            if (!window.AuthManager?.isLoggedIn()) {
                window.AppToast?.error('Access credentials rejected.', 'Security Core');
                return;
            }
            this.workspace = document.getElementById('admin-workspace');
            if (!this.workspace) return;
            this.applyGlassStyles();
            if (!this.initialized) {
                this.injectSidebar();
                this.bindMenuEvents();
                this.bindKeyboardShortcuts();
                this.bindGlobalActionEvents();
                this.initRealtimeSync();
                this.initialized = true;
            }
            this.filterMenuByRole();
            await this.updateHeaderBadges();
            await this.loadPage(this.currentPage || 'dashboard');
            this.logActivity('PORTAL_ACCESS', 'session', null, { timestamp: new Date().toISOString() });
        },

        normalizePageId(id) {
            if (!id) return 'dashboard';
            let p = id.toLowerCase().trim();
            if (p.startsWith('admin-')) p = p.substring(6);
            if (p === 'adminusers') p = 'users';
            if (p === 'projects') p = 'events';
            return p;
        },

        applyGlassStyles() { /* styles now live in css/admin.css (single source of truth) */ },

        injectSidebar() {
            const sidebar = document.querySelector('#admin-portal-modal aside');
            if (!sidebar || sidebar.hasAttribute('data-injected')) return;
            sidebar.setAttribute('data-injected', 'true');
            const menuTree = [
                { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', shortcut: '1' },
                { id: 'events', icon: 'fa-calendar-days', label: 'Projects', shortcut: '2' },
                { id: 'meetings', icon: 'fa-people-group', label: 'Meetings', shortcut: '3' },
                { id: 'treasury', icon: 'fa-wallet', label: 'Treasury', shortcut: '4' },
                { id: 'members', icon: 'fa-users', label: 'Members', shortcut: '5' },
                { id: 'applications', icon: 'fa-user-plus', label: 'Applications', shortcut: '6', badge: 'applications' },
                { id: 'reports', icon: 'fa-file-lines', label: 'Reports', shortcut: '7' },
                { id: 'emails', icon: 'fa-envelope', label: 'Email Hub', shortcut: '8' },
                { id: 'bulletins', icon: 'fa-newspaper', label: 'Bulletins', shortcut: '9' },
                { id: 'blood', icon: 'fa-droplet', label: 'Blood Desk', badge: 'blood' },
                { id: 'activity', icon: 'fa-clock-rotate-left', label: 'Activity' },
                { id: 'users', icon: 'fa-user-shield', label: 'Admin Users', superOnly: true },
                { id: 'settings', icon: 'fa-sliders', label: 'Site Settings', superOnly: true },
                { id: 'system', icon: 'fa-heart-pulse', label: 'System Health', superOnly: true }
            ];
            sidebar.innerHTML = menuTree.map((it, i) => `
                <button class="admin-menu-btn ${i === 0 ? 'active' : ''} w-full py-2.5 px-3 rounded-xl text-[11px] font-semibold flex items-center gap-2.5 relative"
                    data-target="${it.id}" ${it.superOnly ? 'data-super-admin-only="true"' : ''} ${it.badge ? `data-badge-key="${it.badge}"` : ''} title="${it.label}${it.shortcut ? ` (Ctrl+${it.shortcut})` : ''}">
                    <span class="ap-ico"><i class="fa-solid ${it.icon}"></i></span>
                    <span class="ap-menu-label">${it.label}</span>
                    ${it.badge ? `<span class="notification-badge hidden" data-badge="${it.badge}">0</span>` : ''}
                </button>
            `).join('');
        },

        filterMenuByRole() {
            const user = window.AuthManager?.currentUser;
            if (!user) return;
            const role = user.role;
            document.querySelectorAll('.admin-menu-btn').forEach(btn => {
                const target = this.normalizePageId(btn.getAttribute('data-target'));
                const superOnly = btn.getAttribute('data-super-admin-only') === 'true';
                let visible = true;
                if (superOnly && role !== 'super_admin') visible = false;
                else {
                    const accessMap = {
                        dashboard: true, events: this.isExecutive(role) || ['avenue_director', 'avenue_chair', 'dpp_chair'].includes(role),
                        meetings: this.isExecutive(role) || user.isBoardMember || user.is_board_member,
                        treasury: ['super_admin', 'advisor', 'president', 'treasurer'].includes(role),
                        members: this.isExecutive(role), applications: this.isExecutive(role), reports: this.isExecutive(role),
                        emails: this.isExecutive(role), bulletins: this.isExecutive(role) || role === 'avenue_director',
                        blood: this.isExecutive(role) || role === 'avenue_chair', activity: this.isExecutive(role),
                        settings: ['super_admin', 'advisor'].includes(role)
                    };
                    visible = accessMap[target] !== undefined ? accessMap[target] : true;
                }
                btn.style.display = visible ? '' : 'none';
            });
        },

        isExecutive(role) {
            return ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm', 'treasurer'].includes(role);
        },

        bindMenuEvents() {
            document.querySelectorAll('.admin-menu-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const rawTarget = btn.getAttribute('data-target');
                    if (!rawTarget) return;
                    document.querySelectorAll('.admin-menu-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.loadPage(rawTarget);
                });
            });
        },

        bindKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                const portal = document.getElementById('admin-portal-modal');
                if (!portal || portal.classList.contains('hidden')) return;
                if (e.key === 'Escape' && this.activeModal) { this.closeModal(); return; }
                if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
                    e.preventDefault();
                    const btns = Array.from(document.querySelectorAll('.admin-menu-btn')).filter(b => b.style.display !== 'none');
                    const idx = parseInt(e.key) - 1;
                    if (btns[idx]) btns[idx].click();
                }
                if (e.ctrlKey && e.key === 'r' && !e.shiftKey) { e.preventDefault(); this.loadPage(this.currentPage); }
            });
        },

        bindGlobalActionEvents() {
            document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
                if (confirm('End your active portal session?')) { await this.logActivity('LOGOUT', 'session', null, {}); window.AuthManager?.logout(); }
            });
            document.getElementById('admin-portal-close')?.addEventListener('click', () => {
                document.getElementById('admin-portal-modal')?.classList.add('hidden');
            });
        },

        initRealtimeSync() {
            if (!window.DB_ADMIN?.channel) return;
            try {
                this.realtimeSubscriptions.push(
                    window.DB_ADMIN.channel('realtime-apps').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'membership_applications' }, () => { this.updateHeaderBadges(); window.AppToast?.info('New membership application received.'); }).subscribe(),
                    window.DB_ADMIN.channel('realtime-blood').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blood_requests' }, (p) => { this.updateHeaderBadges(); window.AppToast?.warning('New blood request received.'); }).subscribe(),
                    window.DB_ADMIN.channel('realtime-settings').on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => { if (this.currentPage === 'settings') { window.AppToast?.info('Settings synced from another session.'); } }).subscribe()
                );
            } catch (e) {}
        },

        async updateHeaderBadges() {
            try {
                const [apps, blood] = await Promise.all([this.dbCount('membership_applications', { status: 'pending' }), this.dbCount('blood_requests', { status: 'active' })]);
                this.updateBadge('applications', apps);
                this.updateBadge('blood', blood);
            } catch (e) {}
        },

        updateBadge(key, count) {
            document.querySelectorAll(`[data-badge="${key}"]`).forEach(badge => {
                if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.classList.remove('hidden'); }
                else badge.classList.add('hidden');
            });
        },

        async loadPage(pageId) {
            const cleanId = this.normalizePageId(pageId);
            this.pageHistory.push(this.currentPage);
            if (this.pageHistory.length > 20) this.pageHistory.shift();
            this.currentPage = cleanId;
            this.workspace.innerHTML = this.renderLoader();

            try {
                const externalMap = {
                    events: 'AdminEvents', meetings: 'AdminMeetings', treasury: 'AdminTreasury',
                    members: 'AdminMembers', applications: 'Applications', emails: 'EmailHub',
                    blood: 'BloodDesk', activity: 'ActivityLog', users: 'AdminUsers', system: 'SystemHealth'
                };

                if (cleanId === 'dashboard') { await this.renderDashboard(); }
                else if (cleanId === 'reports') { if (window.Reports?.render) await window.Reports.render(this.workspace); else await this.modules.reports.render(this.workspace); }
                else if (cleanId === 'bulletins') { await this.modules.bulletins.render(this.workspace); }
                else if (cleanId === 'settings') { await this.modules.settings.render(this.workspace); }
                else {
                    const extName = externalMap[cleanId];
                    if (extName && window[extName]?.render) {
                        await window[extName].render(this.workspace);
                    } else if (this.modules[cleanId]?.render) {
                        await this.modules[cleanId].render(this.workspace);
                    } else {
                        this.workspace.innerHTML = this.renderError(`Module "${cleanId}" is not available. Check that the corresponding JS file is included in your HTML.`);
                    }
                }
                this.workspace.scrollTop = 0;
            } catch (e) {
                console.error('Router error:', e);
                this.workspace.innerHTML = this.renderError(e.message);
            }
        },

        navigateTo(page) {
            const cleanId = this.normalizePageId(page);
            const btn = document.querySelector(`.admin-menu-btn[data-target="${cleanId}"]`);
            if (btn) btn.click();
            else this.loadPage(cleanId);
        },

        async renderDashboard() {
            const user = window.AuthManager?.currentUser || { full_name: 'Admin', role: 'admin' };
            const now = new Date();
            const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
            const firstName = (user.name || user.full_name || 'Admin').split(' ')[0];

            const [members, upcoming, pending, month, treasury, activity, birthdays, apps, blood, meetings] = await Promise.all([
                this.getClubMemberCount(), this.getUpcomingEventsCount(), this.dbCount('events', { status: 'pending_approval' }),
                this.getMonthProjectCount(), this.getTreasurySummary(), this.getRecentActivity(8), this.getTodayBirthdays(),
                this.dbCount('membership_applications', { status: 'pending' }), this.dbCount('blood_requests', { status: 'active' }), this.getUpcomingMeetings(3)
            ]);

            this.workspace.innerHTML = `
                <div class="p-6 lg:p-10">
                    <div class="admin-page-header">
                        <div>
                            <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>Executive Dashboard</span></div>
                            <h1 class="admin-page-title">${greeting}, ${firstName}</h1>
                            <p class="admin-page-subtitle">Unity Core Portal &bull; Synced ${now.toLocaleTimeString()}</p>
                        </div>
                        <div class="flex items-center gap-3 flex-wrap">
                            <span class="live-indicator"><span class="live-dot"></span>LIVE</span>
                            <button class="btn-primary btn-sm" onclick="AdminPanel.loadPage('dashboard')"><i class="fa-solid fa-rotate"></i> Refresh</button>
                        </div>
                    </div>

                    <div class="admin-stats-grid stagger-list">
                        ${this.statCard('blue', 'fa-users', members, 'Active Members')}
                        ${this.statCard('blue', 'fa-calendar-check', upcoming, 'Events Next 7 Days')}
                        ${this.statCard('blue', 'fa-hourglass-half', pending, 'Pending Approvals')}
                        ${this.statCard('blue', 'fa-folder-tree', month, 'Projects This Month')}
                    </div>

                    <div class="admin-panel mb-8">
                        <div class="admin-panel-header">
                            <h3 class="admin-panel-title"><i class="fa-solid fa-bolt-lightning"></i> Quick Actions</h3>
                        </div>
                        <div class="admin-panel-body">
                            <div class="quick-actions-grid">
                                ${this.isExecutive(user.role) ? `
                                    ${this.quickAction('fa-plus-circle', 'New Project', 'events')}
                                    ${this.quickAction('fa-people-group', 'Schedule Meeting', 'meetings')}
                                    ${this.quickAction('fa-paper-plane', 'Broadcast Mail', 'emails')}
                                    ${this.quickAction('fa-file-lines', 'Report Center', 'reports')}
                                    ${this.quickAction('fa-user-plus', 'Applications', 'applications')}
                                    ${this.quickAction('fa-wallet', 'Treasury', 'treasury')}
                                    ${this.quickAction('fa-newspaper', 'Bulletins', 'bulletins')}
                                    ${user.role === 'super_admin' ? this.quickAction('fa-sliders', 'Site Settings', 'settings') : this.quickAction('fa-droplet', 'Blood Desk', 'blood')}
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="admin-dashboard-grid">
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-wave-pulse"></i> Activity</h3><button class="btn-secondary btn-xs" onclick="AdminPanel.navigateTo('activity')">View All</button></div>
                            <div class="admin-panel-body" style="max-height:380px;overflow-y:auto;">${this.renderActivityFeed(activity)}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-chart-pie"></i> Treasury</h3><span class="badge badge-green">This Month</span></div>
                            <div class="admin-panel-body">${this.renderTreasuryWidget(treasury)}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-calendar-day"></i> Upcoming Meetings</h3></div>
                            <div class="admin-panel-body">${this.renderUpcomingMeetings(meetings)}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-cake-candles"></i> Birthdays</h3><span class="badge badge-purple">${birthdays.length}</span></div>
                            <div class="admin-panel-body">${this.renderBirthdaysList(birthdays)}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-user-plus"></i> Applications</h3>${apps > 0 ? `<span class="badge badge-yellow">${apps}</span>` : ''}</div>
                            <div class="admin-panel-body">${apps > 0 ? `<p class="text-xs text-slate-500 mb-4">${apps} pending.</p><button class="btn-primary btn-sm w-full" onclick="AdminPanel.navigateTo('applications')"><i class="fa-solid fa-eye mr-1"></i> Review</button>` : this.emptyMini('fa-circle-check', 'All reviewed')}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-droplet"></i> Blood Desk</h3>${blood > 0 ? `<span class="badge badge-red">${blood}</span>` : ''}</div>
                            <div class="admin-panel-body">${blood > 0 ? `<p class="text-xs text-slate-500 mb-4">${blood} active.</p><button class="btn-primary btn-sm w-full" onclick="AdminPanel.navigateTo('blood')"><i class="fa-solid fa-eye mr-1"></i> View</button>` : this.emptyMini('fa-circle-check', 'No active requests')}</div>
                        </div>
                    </div>
                </div>
            `;
        },

        statCard(c, i, v, l) { return `<div class="admin-stat-card ${c}"><div class="admin-stat-icon ${c}"><i class="fa-solid ${i}"></i></div><div class="admin-stat-value">${v}</div><div class="admin-stat-label">${l}</div></div>`; },
        quickAction(i, l, t) { return `<button class="quick-action-btn" onclick="AdminPanel.navigateTo('${t}')"><i class="fa-solid ${i}"></i><span>${l}</span></button>`; },
        renderActivityFeed(a) { if (!a?.length) return this.emptyMini('fa-wave-pulse', 'No activity'); return `<div class="space-y-2">${a.map(x => `<div class="flex items-start gap-3 p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10"><div class="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0"><i class="fa-solid ${this.getActionIcon(x.action)} text-brand-blue text-[10px]"></i></div><div class="flex-1 min-w-0"><p class="text-xs font-bold truncate">${this.esc(x.user_name || 'System')}</p><p class="text-[11px] text-slate-500 truncate">${x.action} ${x.entity_type || ''}</p><p class="text-[10px] text-slate-400">${this.ago(x.created_at)}</p></div></div>`).join('')}</div>`; },
        getActionIcon(a) { return ({ CREATE: 'fa-plus-circle', UPDATE: 'fa-pen-to-square', DELETE: 'fa-trash-can', APPROVE: 'fa-check-circle', PORTAL_ACCESS: 'fa-door-open', SETTINGS_UPDATE: 'fa-sliders' })[a] || 'fa-circle-dot'; },
        renderTreasuryWidget(t) { return `<div class="space-y-3"><div class="flex justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10"><span class="text-xs font-bold text-green-600"><i class="fa-solid fa-arrow-down mr-1"></i>Income</span><span class="text-sm font-black text-green-600">INR ${(t.income||0).toLocaleString()}</span></div><div class="flex justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10"><span class="text-xs font-bold text-red-600"><i class="fa-solid fa-arrow-up mr-1"></i>Expenses</span><span class="text-sm font-black text-red-600">INR ${(t.expense||0).toLocaleString()}</span></div><div class="flex justify-between p-4 rounded-xl bg-brand-blue/5 border-2 border-brand-blue/20"><span class="text-xs font-black text-brand-blue"><i class="fa-solid fa-scale-balanced mr-1"></i>Balance</span><span class="text-lg font-black text-brand-blue">INR ${(t.balance||0).toLocaleString()}</span></div></div>`; },
        renderUpcomingMeetings(m) { if (!m?.length) return this.emptyMini('fa-calendar-check', 'None scheduled'); return `<div class="space-y-2">${m.map(x => `<div class="flex items-center gap-3 p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/10"><div class="w-10 h-10 rounded-lg bg-brand-blue text-white flex items-center justify-center flex-shrink-0 flex-col"><span class="text-[8px] font-bold">${new Date(x.date).toLocaleDateString('en',{month:'short'})}</span><span class="text-sm font-black">${new Date(x.date).getDate()}</span></div><div class="flex-1 min-w-0"><p class="text-xs font-bold truncate">${this.esc(x.meeting_name)}</p><p class="text-[10px] text-slate-400">${x.start_time||'TBD'}</p></div></div>`).join('')}</div>`; },
        renderBirthdaysList(b) { if (!b?.length) return this.emptyMini('fa-cake-candles', 'None today'); return `<div class="space-y-2">${b.map(x => `<div class="flex items-center gap-3 p-2.5 rounded-xl bg-brand-blue/5 border border-brand-blue/10">${x.photo_url ? `<img src="${x.photo_url}" class="w-10 h-10 rounded-full object-cover">` : `<div class="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-cake-candles text-brand-blue"></i></div>`}<div class="flex-1 min-w-0"><p class="text-xs font-bold truncate">${this.esc(x.full_name)}</p><p class="text-[10px] text-slate-400">Birthday Today</p></div></div>`).join('')}</div>`; },
        emptyMini(i, t, c='') { return `<div class="text-center py-6"><i class="fa-solid ${i} text-2xl ${c || 'text-slate-300 dark:text-slate-600'} mb-2 block"></i><p class="text-[11px] text-slate-400">${t}</p></div>`; },

        // Super Admin is a system account, not a club member, so it is never counted.
        async getClubMemberCount() { try { const { count } = await window.DB_ADMIN.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'super_admin'); return count || 0; } catch (e) { return 0; } },
        async dbCount(table, filters = {}) { try { let q = window.DB_ADMIN.from(table).select('id', { count: 'exact', head: true }); Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); }); const { count } = await q; return count || 0; } catch (e) { return 0; } },
        async getUpcomingEventsCount() { try { const today = new Date().toISOString().split('T')[0]; const week = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]; const { count } = await window.DB_ADMIN.from('events').select('id', { count: 'exact', head: true }).gte('date', today).lte('date', week).eq('status', 'approved'); return count || 0; } catch (e) { return 0; } },
        async getMonthProjectCount() { try { const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]; const { count } = await window.DB_ADMIN.from('events').select('id', { count: 'exact', head: true }).gte('date', first); return count || 0; } catch (e) { return 0; } },
        async getTreasurySummary() { try { const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]; const { data } = await window.DB_ADMIN.from('treasury').select('income, expense').gte('transaction_date', first); const income = (data || []).reduce((s, t) => s + parseFloat(t.income || 0), 0); const expense = (data || []).reduce((s, t) => s + parseFloat(t.expense || 0), 0); return { income, expense, balance: income - expense }; } catch (e) { return { income: 0, expense: 0, balance: 0 }; } },
        async getRecentActivity(limit = 10) { try { const { data } = await window.DB_ADMIN.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit); return data || []; } catch (e) { return []; } },
        async getTodayBirthdays() { try { const today = new Date(); const m = today.getMonth() + 1, d = today.getDate(); const { data } = await window.DB_ADMIN.from('users').select('full_name, date_of_birth, photo_url').eq('is_active', true).neq('role', 'super_admin').not('date_of_birth', 'is', null); return (data || []).filter(u => { const dob = new Date(u.date_of_birth); return dob.getMonth() + 1 === m && dob.getDate() === d; }); } catch (e) { return []; } },
        async getUpcomingMeetings(limit = 3) { try { const today = new Date().toISOString().split('T')[0]; const { data } = await window.DB_ADMIN.from('meetings').select('id, meeting_name, date, start_time, venue').gte('date', today).order('date', { ascending: true }).limit(limit); return data || []; } catch (e) { return []; } },
        async logActivity(action, entityType, entityId, metadata = {}) { const u = window.AuthManager?.currentUser; if (!u || !window.AuthManager.logActivity) return; await window.AuthManager.logActivity(u.id, action, entityType, entityId, metadata); },

        createModal({ title, body, footer, size = 'medium', icon = 'window-maximize' }) {
            this.closeModal();
            const sizes = { small: 'max-w-md', medium: 'max-w-2xl', wide: 'max-w-4xl', full: 'max-w-6xl' };
            const modal = document.createElement('div');
            modal.id = 'admin-dynamic-modal';
            modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="absolute inset-0 bg-black/40 backdrop-blur-md" onclick="AdminPanel.closeModal()"></div>
                <div class="relative ${sizes[size]} w-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/30 dark:border-white/10">
                    <div class="flex items-center justify-between p-5 border-b border-slate-200/20 dark:border-white/[0.06]">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-${icon} text-brand-blue"></i></div>
                            <h3 class="text-base font-extrabold text-slate-800 dark:text-slate-100">${title}</h3>
                        </div>
                        <button onclick="AdminPanel.closeModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-5">${body}</div>
                    ${footer ? `<div class="flex items-center justify-end gap-2 p-5 border-t border-slate-200/20 dark:border-white/[0.06] flex-wrap">${footer}</div>` : ''}
                </div>
            `;
            document.body.appendChild(modal);
            this.activeModal = modal;
        },

        closeModal() {
            if (this.activeModal) { this.activeModal.remove(); this.activeModal = null; }
            document.getElementById('admin-dynamic-modal')?.remove();
        },

        renderLoader() { return `<div class="p-6"><div class="flex items-center justify-center py-20"><div class="text-center"><div class="h-[3px] w-56 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mx-auto"><div class="h-full bg-gradient-to-r from-brand-blue via-brand-purple to-cyan-500 rounded-full animate-pulse" style="width:60%"></div></div><p class="text-xs text-slate-400 mt-4">Loading...</p></div></div></div>`; },
        renderError(msg) { return `<div class="p-6"><div class="admin-panel"><div class="admin-panel-body"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation empty-state-icon text-red-500"></i><h4 class="empty-state-title">Error</h4><p class="empty-state-desc">${this.esc(msg)}</p><button class="btn-primary btn-sm mt-4" onclick="AdminPanel.loadPage('${this.currentPage}')"><i class="fa-solid fa-rotate"></i> Retry</button></div></div></div></div>`; },
        renderUnauthorized() { return `<div class="p-6"><div class="admin-panel"><div class="admin-panel-body"><div class="empty-state"><i class="fa-solid fa-lock empty-state-icon text-red-500"></i><h4 class="empty-state-title">Access Denied</h4><p class="empty-state-desc">You do not have permission to view this.</p></div></div></div></div>`; },

        esc(str) { if (window.escapeHtml) return window.escapeHtml(str); return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); },
        ago(dt) { if (!dt) return ''; if (window.timeAgo) return window.timeAgo(dt); const diff = Date.now() - new Date(dt).getTime(); const mins = Math.floor(diff / 60000); if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return new Date(dt).toLocaleDateString(); },
        fmtDate(dt) { if (!dt) return 'N/A'; if (window.formatDate) return window.formatDate(dt); return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); },
        fmtTime(dt) { if (!dt) return 'N/A'; if (window.formatTime) return window.formatTime(dt); return dt; },

        // ---- Helpers that events.js / treasury.js / reports.js call but were never defined ----
        // Local-time YYYY-MM-DD (toISOString() would shift the date for IST users late at night)
        ymd(d) {
            const x = d ? new Date(d) : new Date();
            return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        },
        notify(type, msg, title) {
            const t = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
            if (window.AppToast && typeof window.AppToast[t] === 'function') window.AppToast[t](msg, title);
            else console[t === 'error' ? 'error' : 'log'](`[${t}] ${msg}`);
        }
    };

    // =========================================================================
    // BUILT-IN MODULES
    // =========================================================================
    AdminPanel.modules = {
        // ==========================================
        // PROJECTS / EVENTS MODULE
        // ==========================================
        events: {
            async render(workspace) {
                try {
                    const { data: events } = await window.DB_ADMIN.from('events').select('*').order('date', { ascending: false }).limit(50);
                    workspace.innerHTML = `
                        <div class="p-6 lg:p-10">
                            <div class="admin-page-header">
                                <div>
                                    <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Projects</span></div>
                                    <h1 class="admin-page-title">Projects Registry</h1>
                                    <p class="admin-page-subtitle">Create, manage, and generate reports for all club projects.</p>
                                </div>
                                <button class="btn-primary" onclick="AdminPanel.modules.events.openForm()">
                                    <i class="fa-solid fa-plus mr-1.5"></i> Add New Project
                                </button>
                            </div>
                            <div class="admin-panel">
                                <div class="admin-panel-body p-0">
                                    <div class="overflow-x-auto">
                                        <table class="admin-data-table">
                                            <thead><tr><th>Project Name</th><th>Date</th><th>Avenue</th><th>Type</th><th>Status</th><th>Report</th><th>Actions</th></tr></thead>
                                            <tbody>
                                                ${(!events || events.length === 0) ? '<tr><td colspan="7" class="text-center py-12 text-slate-400">No projects found. Click "Add New Project" to create one.</td></tr>' : events.map(e => `
                                                    <tr>
                                                        <td class="text-xs font-bold">${AdminPanel.esc(e.event_name)}</td>
                                                        <td class="text-xs">${AdminPanel.fmtDate(e.date)}</td>
                                                        <td class="text-xs capitalize">${(e.avenue_slug || '').replace(/_/g, ' ')}</td>
                                                        <td>${e.is_dpp ? '<span class="badge badge-yellow">DPP</span>' : '<span class="badge badge-blue">Avenue</span>'}</td>
                                                        <td><span class="status-badge ${e.status}">${e.status}</span></td>
                                                        <td>${e.report_submitted ? '<span class="text-green-500 text-xs font-bold"><i class="fa-solid fa-check mr-1"></i>Submitted</span>' : '<span class="text-slate-400 text-xs">Draft</span>'}</td>
                                                        <td>
                                                            <div class="flex gap-1">
                                                                <button class="btn-secondary btn-xs" onclick="AdminPanel.modules.events.openForm('${e.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                                                                <button class="btn-primary btn-xs" onclick="window.Reports?.openReportForm ? window.Reports.openReportForm('${e.id}') : window.AppToast?.info('Load reports.js for full report wizard')" title="Report"><i class="fa-solid fa-file-pen"></i></button>
                                                                <button class="btn-danger btn-xs" onclick="AdminPanel.modules.events.deleteEvent('${e.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } catch (err) {
                    workspace.innerHTML = AdminPanel.renderError(err.message);
                }
            },

            async openForm(id) {
                let existing = null;
                if (id) {
                    const { data } = await window.DB_ADMIN.from('events').select('*').eq('id', id).single();
                    existing = data;
                }
                const today = AdminPanel.ymd();

                // Load group options from settings
                let groupOptions = ['Group 1','Group 2','Group 3','Group 4','Group 5','Group 6'];
                try {
                    const { data: gSetting } = await window.DB_ADMIN.from('system_settings').select('value').eq('key', 'group_id_options').single();
                    if (gSetting?.value) groupOptions = gSetting.value.split(',').map(s => s.trim());
                } catch (e) {}

                AdminPanel.createModal({
                    title: existing ? 'Edit Project' : 'Add New Project',
                    size: 'wide',
                    icon: 'calendar-days',
                    body: `
                        <form id="event-form" onsubmit="return false;" class="space-y-5">
                            <div class="admin-form-grid">
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Project Name <span class="required">*</span></label>
                                    <input type="text" name="event_name" required class="admin-form-input" value="${existing?.event_name || ''}" placeholder="e.g., Tree Plantation Drive">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Date <span class="required">*</span></label>
                                    <input type="date" name="date" required class="admin-form-input" value="${existing?.date || today}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Avenue <span class="required">*</span></label>
                                    <select name="avenue_slug" required class="admin-form-input admin-form-select">
                                        <option value="">Select Avenue</option>
                                        <option value="club_service" ${existing?.avenue_slug === 'club_service' ? 'selected' : ''}>Club Service</option>
                                        <option value="community_service" ${existing?.avenue_slug === 'community_service' ? 'selected' : ''}>Community Service</option>
                                        <option value="professional_service" ${existing?.avenue_slug === 'professional_service' ? 'selected' : ''}>Professional Service</option>
                                        <option value="international_service" ${existing?.avenue_slug === 'international_service' ? 'selected' : ''}>International Service</option>
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Group</label>
                                    <select name="group_number" class="admin-form-input admin-form-select">
                                        ${groupOptions.map(g => `<option value="${g}" ${existing?.group_number === g ? 'selected' : ''}>${g}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Start Time</label>
                                    <input type="time" name="start_time" class="admin-form-input" value="${existing?.start_time || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">End Time</label>
                                    <input type="time" name="end_time" class="admin-form-input" value="${existing?.end_time || ''}">
                                </div>
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Venue</label>
                                    <input type="text" name="venue" class="admin-form-input" value="${existing?.venue || ''}" placeholder="Project location">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Project Chair</label>
                                    <input type="text" name="event_chair" class="admin-form-input" value="${existing?.event_chair || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Event Secretary</label>
                                    <input type="text" name="event_secretary" class="admin-form-input" value="${existing?.event_secretary || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Proposed By</label>
                                    <input type="text" name="event_proposed_by" class="admin-form-input" value="${existing?.event_proposed_by || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Seconded By</label>
                                    <input type="text" name="event_seconded_by" class="admin-form-input" value="${existing?.event_seconded_by || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Collaboration Type</label>
                                    <select name="collaboration_type" class="admin-form-input admin-form-select">
                                        <option value="none" ${existing?.collaboration_type === 'none' ? 'selected' : ''}>None</option>
                                        <option value="rotaract" ${existing?.collaboration_type === 'rotaract' ? 'selected' : ''}>Rotaract</option>
                                        <option value="interact" ${existing?.collaboration_type === 'interact' ? 'selected' : ''}>Interact</option>
                                        <option value="rotary" ${existing?.collaboration_type === 'rotary' ? 'selected' : ''}>Rotary</option>
                                        <option value="ngo" ${existing?.collaboration_type === 'ngo' ? 'selected' : ''}>NGO</option>
                                        <option value="others" ${existing?.collaboration_type === 'others' ? 'selected' : ''}>Others</option>
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Collaborator Name</label>
                                    <input type="text" name="collaborator_name" class="admin-form-input" value="${existing?.collaborator_name || ''}">
                                </div>
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Description</label>
                                    <textarea name="description" rows="3" class="admin-form-input admin-form-textarea" placeholder="Brief description of the project">${existing?.description || ''}</textarea>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Status</label>
                                    <select name="status" class="admin-form-input admin-form-select">
                                        <option value="draft" ${existing?.status === 'draft' ? 'selected' : ''}>Draft</option>
                                        <option value="pending_approval" ${existing?.status === 'pending_approval' ? 'selected' : ''}>Pending Approval</option>
                                        <option value="approved" ${(!existing || existing?.status === 'approved') ? 'selected' : ''}>Approved</option>
                                        <option value="completed" ${existing?.status === 'completed' ? 'selected' : ''}>Completed</option>
                                        <option value="cancelled" ${existing?.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="flex items-center gap-3 cursor-pointer mt-2">
                                        <input type="checkbox" name="is_dpp" class="w-4 h-4 accent-yellow-500" ${existing?.is_dpp ? 'checked' : ''}>
                                        <span class="text-xs font-bold">District Priority Project (DPP)</span>
                                    </label>
                                </div>
                            </div>
                        </form>
                    `,
                    footer: `
                        <button class="btn-secondary" onclick="AdminPanel.closeModal()">Cancel</button>
                        <button class="btn-primary" onclick="AdminPanel.modules.events.saveEvent('${id || ''}')">
                            <i class="fa-solid fa-save mr-1"></i> ${existing ? 'Update Project' : 'Create Project'}
                        </button>
                    `
                });
            },

            async saveEvent(id) {
                const form = document.getElementById('event-form');
                if (!form) return;
                const fd = new FormData(form);
                const payload = {
                    event_name: fd.get('event_name'),
                    date: fd.get('date'),
                    avenue_slug: fd.get('avenue_slug'),
                    group_number: fd.get('group_number') || null,
                    start_time: fd.get('start_time') || null,
                    end_time: fd.get('end_time') || null,
                    venue: fd.get('venue') || null,
                    event_chair: fd.get('event_chair') || null,
                    event_secretary: fd.get('event_secretary') || null,
                    event_proposed_by: fd.get('event_proposed_by') || null,
                    event_seconded_by: fd.get('event_seconded_by') || null,
                    collaboration_type: fd.get('collaboration_type') || 'none',
                    collaborator_name: fd.get('collaborator_name') || null,
                    description: fd.get('description') || null,
                    status: fd.get('status') || 'approved',
                    is_dpp: fd.get('is_dpp') === 'on'
                };

                if (!payload.event_name || !payload.date || !payload.avenue_slug) {
                    window.AppToast?.warning('Project name, date, and avenue are required.');
                    return;
                }

                try {
                    if (id) {
                        await window.DB_ADMIN.from('events').update(payload).eq('id', id);
                        window.AppToast?.success('Project updated!');
                    } else {
                        payload.created_by = window.AuthManager?.currentUser?.id;
                        await window.DB_ADMIN.from('events').insert(payload);
                        window.AppToast?.success('Project created!');
                    }
                    AdminPanel.closeModal();
                    await this.render(AdminPanel.workspace);
                } catch (e) {
                    window.AppToast?.error('Save failed: ' + e.message);
                }
            },

            async deleteEvent(id) {
                if (!confirm('Permanently delete this project? This cannot be undone.')) return;
                try {
                    await window.DB_ADMIN.from('events').delete().eq('id', id);
                    window.AppToast?.success('Project deleted.');
                    await this.render(AdminPanel.workspace);
                } catch (e) {
                    window.AppToast?.error('Delete failed: ' + e.message);
                }
            }
        },

        // ==========================================
        // REPORTS CENTER (unchanged — keeping yours)
        // ==========================================
        reports: {
            async render(workspace) {
                if (!AdminPanel.isExecutive(window.AuthManager?.currentUser?.role)) {
                    workspace.innerHTML = AdminPanel.renderUnauthorized();
                    return;
                }
                const { data: events } = await window.DB_ADMIN.from('events').select('id, event_name, date, avenue_slug, is_dpp, status, report_submitted').order('date', { ascending: false }).limit(50);

                workspace.innerHTML = `
                    <div class="p-6 lg:p-10">
                        <div class="admin-page-header">
                            <div>
                                <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Reports Center</span></div>
                                <h1 class="admin-page-title">Report Generation Center</h1>
                                <p class="admin-page-subtitle">Select a project, generate its report, and download as DOCX.</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                            <div class="admin-panel cursor-pointer hover-lift" onclick="AdminPanel.modules.reports.showProjectList('avenue')">
                                <div class="admin-panel-body text-center py-8">
                                    <div class="w-16 h-16 rounded-2xl ap-ico-tile mx-auto mb-4"><i class="fa-solid fa-rocket text-2xl"></i></div>
                                    <h4 class="text-sm font-black mb-1">Avenue Project Report</h4>
                                    <p class="text-[11px] text-slate-500 mb-4">Generate report for a specific avenue project</p>
                                    <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-file-pdf mr-1"></i> Select Project</button>
                                </div>
                            </div>
                            <div class="admin-panel cursor-pointer hover-lift" onclick="AdminPanel.modules.reports.showProjectList('dpp')">
                                <div class="admin-panel-body text-center py-8">
                                    <div class="w-16 h-16 rounded-2xl ap-ico-tile mx-auto mb-4"><i class="fa-solid fa-star text-2xl"></i></div>
                                    <h4 class="text-sm font-black mb-1">DPP Report</h4>
                                    <p class="text-[11px] text-slate-500 mb-4">Generate District Priority Project report</p>
                                    <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-star mr-1"></i> Select DPP</button>
                                </div>
                            </div>
                            <div class="admin-panel cursor-pointer hover-lift" onclick="AdminPanel.navigateTo('meetings')">
                                <div class="admin-panel-body text-center py-8">
                                    <div class="w-16 h-16 rounded-2xl ap-ico-tile mx-auto mb-4"><i class="fa-solid fa-file-pen text-2xl"></i></div>
                                    <h4 class="text-sm font-black mb-1">Meeting Minutes</h4>
                                    <p class="text-[11px] text-slate-500 mb-4">Generate minutes and attendance sheets</p>
                                    <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-arrow-right mr-1"></i> Go to Meetings</button>
                                </div>
                            </div>
                        </div>

                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-list-check"></i> All Projects — Report Status</h3></div>
                            <div class="admin-panel-body p-0">
                                <div class="overflow-x-auto">
                                    <table class="admin-data-table">
                                        <thead><tr><th>Project</th><th>Date</th><th>Avenue</th><th>Type</th><th>Report Status</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            ${(!events || events.length === 0) ? '<tr><td colspan="6" class="text-center py-10 text-slate-400">No projects found.</td></tr>' : events.map(e => `
                                                <tr>
                                                    <td class="text-xs font-bold">${AdminPanel.esc(e.event_name)}</td>
                                                    <td class="text-xs">${AdminPanel.fmtDate(e.date)}</td>
                                                    <td class="text-xs capitalize">${(e.avenue_slug || '').replace(/_/g, ' ')}</td>
                                                    <td>${e.is_dpp ? '<span class="badge badge-yellow">DPP</span>' : '<span class="badge badge-blue">Avenue</span>'}</td>
                                                    <td>${e.report_submitted ? '<span class="text-green-500 text-xs font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Submitted</span>' : '<span class="text-slate-400 text-xs"><i class="fa-regular fa-circle mr-1"></i>Not Started</span>'}</td>
                                                    <td>
                                                        <button class="btn-primary btn-xs" onclick="window.Reports?.openReportForm ? window.Reports.openReportForm('${e.id}') : window.AppToast?.info('Load reports.js for full wizard')">
                                                            <i class="fa-solid fa-file-pen mr-1"></i> Write Report
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },

            async showProjectList(type) {
                const { data } = await window.DB_ADMIN.from('events').select('id, event_name, date, is_dpp, avenue_slug').order('date', { ascending: false }).limit(30);
                const filtered = type === 'dpp' ? (data || []).filter(e => e.is_dpp) : (data || []).filter(e => !e.is_dpp);
                AdminPanel.createModal({
                    title: type === 'dpp' ? 'Select DPP Project' : 'Select Avenue Project',
                    size: 'medium',
                    icon: type === 'dpp' ? 'star' : 'rocket',
                    body: `
                        <div class="space-y-2 max-h-96 overflow-y-auto">
                            ${filtered.length === 0 ? '<p class="text-xs text-slate-400 text-center py-6">No projects found for this category.</p>' : filtered.map(e => `
                                <button class="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue hover:bg-brand-blue/5 transition text-left" onclick="AdminPanel.closeModal(); window.Reports?.openReportForm ? window.Reports.openReportForm('${e.id}') : window.AppToast?.info('Load reports.js for full wizard');">
                                    <div class="w-10 h-10 rounded-xl ap-ico-tile flex-shrink-0">
                                        <i class="fa-solid ${e.is_dpp ? 'fa-star' : 'fa-rocket'}"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm font-bold truncate">${AdminPanel.esc(e.event_name)}</p>
                                        <p class="text-[11px] text-slate-400">${AdminPanel.fmtDate(e.date)} &bull; ${(e.avenue_slug || '').replace(/_/g, ' ')}</p>
                                    </div>
                                    <i class="fa-solid fa-arrow-right text-brand-blue"></i>
                                </button>
                            `).join('')}
                        </div>
                    `
                });
            }
        },

        // ==========================================
        // BULLETINS MODULE
        // ==========================================
        bulletins: {
            async render(workspace) {
                try {
                    const { data: bulletins } = await window.DB_ADMIN.from('bulletins').select('*').order('created_at', { ascending: false });
                    workspace.innerHTML = `
                        <div class="p-6 lg:p-10">
                            <div class="admin-page-header">
                                <div>
                                    <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Bulletins</span></div>
                                    <h1 class="admin-page-title">Club Bulletin Publications</h1>
                                </div>
                                <button class="btn-primary" onclick="AdminPanel.modules.bulletins.openForm()"><i class="fa-solid fa-plus mr-1.5"></i> New Bulletin</button>
                            </div>
                            <div class="admin-panel">
                                <div class="admin-panel-body">
                                    ${(!bulletins || bulletins.length === 0) ? '<div class="empty-state py-12"><i class="fa-solid fa-newspaper empty-state-icon"></i><p class="empty-state-desc">No bulletins yet.</p></div>' : `
                                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                            ${bulletins.map(b => `
                                                <div class="admin-panel overflow-hidden flex flex-col justify-between">
                                                    <div class="h-44 bg-slate-900"><img src="${b.cover_image_url || 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png'}" class="w-full h-full object-cover"></div>
                                                    <div class="p-5 space-y-2">
                                                        <span class="text-[9px] font-black uppercase text-brand-blue">${b.edition || 'Edition'}</span>
                                                        <h4 class="text-sm font-bold truncate">${AdminPanel.esc(b.bulletin_name)}</h4>
                                                        <div class="flex gap-2 pt-2">
                                                            <button class="btn-secondary btn-xs flex-1" onclick="AdminPanel.modules.bulletins.openForm('${b.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                                                            <button class="btn-danger btn-xs" onclick="AdminPanel.modules.bulletins.deleteBulletin('${b.id}')"><i class="fa-solid fa-trash"></i></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;
                } catch (e) { workspace.innerHTML = AdminPanel.renderError(e.message); }
            },

            async openForm(id) {
                let existing = null;
                if (id) { const { data } = await window.DB_ADMIN.from('bulletins').select('*').eq('id', id).single(); existing = data; }
                AdminPanel.createModal({
                    title: existing ? 'Edit Bulletin' : 'New Bulletin', size: 'medium', icon: 'newspaper',
                    body: `<form id="bulletin-form" onsubmit="return false;" class="space-y-4">
                        <div class="admin-form-group"><label class="admin-form-label">Title <span class="required">*</span></label><input type="text" name="bulletin_name" required class="admin-form-input" value="${existing?.bulletin_name || ''}"></div>
                        <div class="admin-form-grid">
                            <div class="admin-form-group"><label class="admin-form-label">Edition</label><input type="text" name="edition" class="admin-form-input" value="${existing?.edition || ''}"></div>
                            <div class="admin-form-group"><label class="admin-form-label">Month</label><input type="text" name="month" class="admin-form-input" value="${existing?.month || ''}"></div>
                        </div>
                        <div class="admin-form-group"><label class="admin-form-label">Description</label><textarea name="description" rows="2" class="admin-form-input admin-form-textarea">${existing?.description || ''}</textarea></div>
                        <div class="admin-form-group"><label class="admin-form-label">Drive Link</label><input type="url" name="drive_link" class="admin-form-input" value="${existing?.drive_link || ''}"></div>
                        <div class="admin-form-group"><label class="admin-form-label">Cover Image URL</label><input type="url" name="cover_image_url" class="admin-form-input" value="${existing?.cover_image_url || ''}"></div>
                    </form>`,
                    footer: `<button class="btn-secondary" onclick="AdminPanel.closeModal()">Cancel</button><button class="btn-primary" onclick="AdminPanel.modules.bulletins.save('${id || ''}')"><i class="fa-solid fa-save mr-1"></i> Save</button>`
                });
            },

            async save(id) {
                const form = document.getElementById('bulletin-form'); if (!form) return;
                const fd = new FormData(form);
                const payload = { bulletin_name: fd.get('bulletin_name'), edition: fd.get('edition'), month: fd.get('month'), description: fd.get('description'), drive_link: fd.get('drive_link'), cover_image_url: fd.get('cover_image_url') };
                try {
                    if (id) await window.DB_ADMIN.from('bulletins').update(payload).eq('id', id);
                    else await window.DB_ADMIN.from('bulletins').insert(payload);
                    window.AppToast?.success('Saved!'); AdminPanel.closeModal(); await this.render(AdminPanel.workspace);
                } catch (e) { window.AppToast?.error('Failed: ' + e.message); }
            },

            async deleteBulletin(id) {
                if (!confirm('Delete?')) return;
                try { await window.DB_ADMIN.from('bulletins').delete().eq('id', id); window.AppToast?.success('Deleted'); await this.render(AdminPanel.workspace); }
                catch (e) { window.AppToast?.error('Failed'); }
            }
        },

        // ==========================================
        // ULTRA-POWERFUL SITE SETTINGS MODULE
        // Comprehensive Super Admin Control Panel
        // Every single aspect of the website editable
        // ==========================================
        settings: {
            activeTab: 'identity',
            settingsCache: {},

            async render(workspace) {
                const userRole = window.AuthManager?.currentUser?.role;
                if (userRole !== 'super_admin' && userRole !== 'advisor') {
                    workspace.innerHTML = AdminPanel.renderUnauthorized();
                    return;
                }

                try {
                    const { data } = await window.DB_ADMIN.from('system_settings').select('*');
                    const settings = {};
                    (data || []).forEach(s => { settings[s.key] = s.value; });
                    this.settingsCache = settings;

                    workspace.innerHTML = `
                        <div class="p-6 lg:p-10">
                            <div class="admin-page-header">
                                <div>
                                    <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Site Settings</span></div>
                                    <h1 class="admin-page-title">Site Control Center</h1>
                                    <p class="admin-page-subtitle">Super Admin exclusive — manage every single aspect of the website.</p>
                                </div>
                                <div class="flex gap-2">
                                    <button class="btn-secondary btn-sm" onclick="AdminPanel.modules.settings.exportSettings()"><i class="fa-solid fa-download mr-1"></i> Export</button>
                                    <button class="btn-primary btn-sm" onclick="AdminPanel.modules.settings.importSettings()"><i class="fa-solid fa-upload mr-1"></i> Import</button>
                                </div>
                            </div>

                            <!-- Settings Tabs -->
                            <div class="settings-tabs" role="tablist">
                                ${this.renderTabButton('identity', 'fa-id-card', 'Club Identity')}
                                ${this.renderTabButton('stats', 'fa-chart-line', 'Live Impact Stats')}
                                ${this.renderTabButton('branding', 'fa-palette', 'Branding & Logos')}
                                ${this.renderTabButton('reports', 'fa-file-contract', 'Report Templates')}
                                ${this.renderTabButton('contact', 'fa-address-book', 'Contact & Social')}
                                ${this.renderTabButton('automation', 'fa-robot', 'Email & Automation')}
                                ${this.renderTabButton('access', 'fa-key', 'Access & Roles')}
                                ${this.renderTabButton('officers', 'fa-user-tie', 'Officer Signatures')}
                                ${this.renderTabButton('website', 'fa-globe', 'Website Content')}
                                ${this.renderTabButton('integrations', 'fa-plug', 'Integrations & APIs')}
                                ${this.renderTabButton('advanced', 'fa-code', 'Advanced / Raw')}
                            </div>

                            <div id="settings-tab-content"></div>
                        </div>
                    `;

                    await this.renderActiveTab();
                } catch (e) {
                    workspace.innerHTML = AdminPanel.renderError(e.message);
                }
            },

            renderTabButton(id, icon, label) {
                const active = this.activeTab === id;
                return `<button class="settings-tab-btn ${active ? 'active' : ''}" role="tab" data-tab="${id}" onclick="AdminPanel.modules.settings.switchTab('${id}')"><i class="fa-solid ${icon}"></i>${label}</button>`;
            },

            async switchTab(tabId) {
                this.activeTab = tabId;
                document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
                await this.renderActiveTab();
            },

            async renderActiveTab() {
                const container = document.getElementById('settings-tab-content');
                if (!container) return;
                const tabs = {
                    identity: () => this.renderIdentityTab(),
                    stats: () => this.renderStatsTab(),
                    branding: () => this.renderBrandingTab(),
                    reports: () => this.renderReportsTab(),
                    contact: () => this.renderContactTab(),
                    automation: () => this.renderAutomationTab(),
                    access: () => this.renderAccessTab(),
                    officers: () => this.renderOfficersTab(),
                    website: () => this.renderWebsiteTab(),
                    integrations: () => this.renderIntegrationsTab(),
                    advanced: () => this.renderAdvancedTab()
                };
                const tabId = this.activeTab;
                let html = tabs[tabId] ? tabs[tabId]() : '<p class="text-xs text-slate-400">Loading...</p>';
                if (html && typeof html.then === 'function') html = await html;   // async tabs (Advanced)
                if (this.activeTab !== tabId) return;                              // user switched tab meanwhile
                container.innerHTML = html;
                if (tabId === 'stats') this.refreshStatsPreview();
            },

            getValue(key, def = '') {
                return this.settingsCache[key] !== undefined ? this.settingsCache[key] : def;
            },

            // =========================================
            // TAB 1: CLUB IDENTITY
            // =========================================
            renderIdentityTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-id-card text-brand-blue mr-2"></i>Club Identity</h3><p class="text-[11px] text-slate-500 mt-1">Legally registered club identification details</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('identity', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="settings-form-identity">
                            ${this.inputField('club_name', 'Club Name', this.getValue('club_name', 'Rotaract Club of Coimbatore Unity'), 'Full official name', 'text', true)}
                            ${this.inputField('sponsor_club', 'Sponsor Club Name', this.getValue('sponsor_club', 'Family of Rotary Club of Coimbatore East'), 'Family of Rotary Club...', 'text', true)}
                            ${this.inputField('club_id', 'Club ID', this.getValue('club_id', '91594'), 'RI assigned Club ID', 'text')}
                            ${this.inputField('ri_district', 'RI District', this.getValue('ri_district', '3206'), 'District number only', 'text')}
                            ${this.inputField('district_region', 'District Coverage Region', this.getValue('district_region', 'Coimbatore | Palakkad'), 'City scope')}
                            ${this.inputField('charter_date', 'Charter Date', this.getValue('charter_date', '21.4.2014'), 'DD.MM.YYYY format', 'text')}
                            ${this.inputField('rotary_year', 'Current Rotary Year', this.getValue('rotary_year', '2026-27'), 'YYYY-YY')}
                            ${this.inputField('group_id_options', 'Group ID Options (comma separated)', this.getValue('group_id_options', 'Group 1,Group 2,Group 3,Group 4,Group 5,Group 6'), 'Used in event dropdowns', 'text')}
                            ${this.textareaField('club_tagline', 'Club Tagline / Motto', this.getValue('club_tagline', 'Service Above Self'), 'Short motto', 2)}
                            ${this.textareaField('club_description', 'Club Description', this.getValue('club_description', ''), 'Short description used across the website', 3)}
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 2: BRANDING & LOGOS
            // =========================================
            renderBrandingTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-palette text-brand-blue mr-2"></i>Branding & Logos</h3><p class="text-[11px] text-slate-500 mt-1">Logo URLs, dimensions and brand colors</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('branding', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>

                        <div class="mb-6">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-image text-brand-blue mr-1"></i>Primary Website Logos</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-5" id="settings-form-branding">
                                <div>
                                    <label class="settings-label">Colour Logo URL</label>
                                    <input type="url" class="settings-input" name="logo_colour" value="${this.getValue('logo_colour', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png')}">
                                    <div class="logo-preview-box mt-2"><img src="${this.getValue('logo_colour', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png')}" onerror="this.style.display='none'"></div>
                                </div>
                                <div>
                                    <label class="settings-label">White Logo URL</label>
                                    <input type="url" class="settings-input" name="logo_white" value="${this.getValue('logo_white', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png')}">
                                    <div class="logo-preview-box mt-2" style="background:#1a1a1a"><img src="${this.getValue('logo_white', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png')}" onerror="this.style.display='none'"></div>
                                </div>
                                <div>
                                    <label class="settings-label">Black Logo URL</label>
                                    <input type="url" class="settings-input" name="logo_black" value="${this.getValue('logo_black', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_black_jwjihq.png')}">
                                    <div class="logo-preview-box mt-2"><img src="${this.getValue('logo_black', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_black_jwjihq.png')}" onerror="this.style.display='none'"></div>
                                </div>
                            </div>
                        </div>

                        <div class="mb-6 p-4 rounded-xl ap-tint-box">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-file-image text-brand-blue mr-1"></i>Avenue Report Logo Strip (used in Reports, Minutes, Agenda, Attendance)</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div class="md:col-span-3">
                                    <label class="settings-label">Avenue Logo Strip URL</label>
                                    <input type="url" class="settings-input" name="logo_strip_avenue" value="${this.getValue('logo_strip_avenue', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png')}">
                                    <div class="logo-preview-box mt-2"><img src="${this.getValue('logo_strip_avenue', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png')}" onerror="this.style.display='none'"></div>
                                </div>
                                <div><label class="settings-label">Width (inches)</label><input type="text" class="settings-input" name="logo_strip_avenue_width" value="${this.getValue('logo_strip_avenue_width', '4.63in')}"><p class="settings-hint">Default: 4.63in</p></div>
                                <div><label class="settings-label">Height (inches)</label><input type="text" class="settings-input" name="logo_strip_avenue_height" value="${this.getValue('logo_strip_avenue_height', '0.43in')}"><p class="settings-hint">Default: 0.43in</p></div>
                                <div><label class="settings-label">Alignment</label><select class="settings-input" name="logo_strip_avenue_align"><option value="center" ${this.getValue('logo_strip_avenue_align', 'center') === 'center' ? 'selected' : ''}>Center</option><option value="left" ${this.getValue('logo_strip_avenue_align') === 'left' ? 'selected' : ''}>Left</option><option value="right" ${this.getValue('logo_strip_avenue_align') === 'right' ? 'selected' : ''}>Right</option></select></div>
                            </div>
                        </div>

                        <div class="mb-6 p-4 rounded-xl ap-tint-box">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-star text-brand-blue mr-1"></i>DPP Report Logo Strip</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div class="md:col-span-3">
                                    <label class="settings-label">DPP Logo Strip URL</label>
                                    <input type="url" class="settings-input" name="logo_strip_dpp" value="${this.getValue('logo_strip_dpp', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1787012147/Unity_DPP_ColourAsset_9_2x-8_q0qi81.png')}">
                                    <div class="logo-preview-box mt-2"><img src="${this.getValue('logo_strip_dpp', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1787012147/Unity_DPP_ColourAsset_9_2x-8_q0qi81.png')}" onerror="this.style.display='none'"></div>
                                </div>
                                <div><label class="settings-label">Width (inches)</label><input type="text" class="settings-input" name="logo_strip_dpp_width" value="${this.getValue('logo_strip_dpp_width', '5.55in')}"><p class="settings-hint">Default: 5.55in</p></div>
                                <div><label class="settings-label">Height (inches)</label><input type="text" class="settings-input" name="logo_strip_dpp_height" value="${this.getValue('logo_strip_dpp_height', '0.42in')}"><p class="settings-hint">Default: 0.42in</p></div>
                                <div><label class="settings-label">Alignment</label><select class="settings-input" name="logo_strip_dpp_align"><option value="center" ${this.getValue('logo_strip_dpp_align', 'center') === 'center' ? 'selected' : ''}>Center</option><option value="left" ${this.getValue('logo_strip_dpp_align') === 'left' ? 'selected' : ''}>Left</option><option value="right" ${this.getValue('logo_strip_dpp_align') === 'right' ? 'selected' : ''}>Right</option></select></div>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-swatchbook text-brand-blue mr-1"></i>Brand Color Palette</h4>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                ${this.colorField('color_primary', 'Primary (Blue)', this.getValue('color_primary', '#1a73e8'))}
                                ${this.colorField('color_secondary', 'Secondary (Purple)', this.getValue('color_secondary', '#7c3aed'))}
                                ${this.colorField('color_accent', 'Accent (Cyan)', this.getValue('color_accent', '#06b6d4'))}
                                ${this.colorField('color_dark', 'Dark Mode BG', this.getValue('color_dark', '#050a18'))}
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 3: REPORT TEMPLATES
            // =========================================
            renderReportsTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-file-contract text-brand-blue mr-2"></i>Report & Document Templates</h3><p class="text-[11px] text-slate-500 mt-1">Font sizes, headings, labels used in generated DOCX reports</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('reports', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="settings-form-reports">
                            ${this.inputField('report_club_name_fontsize', 'Club Name Font Size (pt)', this.getValue('report_club_name_fontsize', '20'), 'Default: 20pt', 'number')}
                            ${this.inputField('report_sponsor_fontsize', 'Sponsor Club Font Size (pt)', this.getValue('report_sponsor_fontsize', '14'), 'Default: 14pt', 'number')}
                            ${this.inputField('report_meta_fontsize', 'Metadata Font Size (pt)', this.getValue('report_meta_fontsize', '12'), 'Club ID line, Default: 12pt', 'number')}
                            ${this.inputField('report_body_fontsize', 'Body Content Font Size (pt)', this.getValue('report_body_fontsize', '11'), 'Default: 11pt', 'number')}
                            ${this.inputField('report_font_family', 'Report Font Family', this.getValue('report_font_family', 'Poppins'), 'Font used in DOCX')}
                            ${this.inputField('report_page_size', 'Page Size', this.getValue('report_page_size', 'A4'), 'A4 / Letter')}
                            ${this.inputField('report_page_margin', 'Page Margin (inches)', this.getValue('report_page_margin', '1.0'), 'Default: 1.0in', 'text')}
                            ${this.inputField('monthly_report_heading', 'Monthly Report Front Page Heading Pattern', this.getValue('monthly_report_heading', 'Monthly Report of {MONTH}'), 'Use {MONTH} placeholder')}
                            ${this.textareaField('report_footer_text', 'Report Footer Text', this.getValue('report_footer_text', ''), 'Optional footer added to every report', 3)}
                        </div>

                        <div class="mt-6 p-4 rounded-xl ap-tint-box">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-clock text-brand-blue mr-1"></i>Meeting Minutes Templates</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${this.inputField('minutes_time_column_width', 'Minutes Time Column Width (%)', this.getValue('minutes_time_column_width', '25'), 'Default: 25%', 'number')}
                                ${this.inputField('minutes_heading_column_width', 'Minutes Heading Column Width (%)', this.getValue('minutes_heading_column_width', '75'), 'Default: 75%', 'number')}
                                ${this.textareaField('attendance_form_description', 'Attendance Form Description Template', this.getValue('attendance_form_description', 'Attendance for {MEETING_NAME} held on {DATE} at {VENUE}'), 'Use {MEETING_NAME}, {DATE}, {VENUE}', 3)}
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 4: CONTACT & SOCIAL
            // =========================================
            renderContactTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-address-book text-brand-blue mr-2"></i>Contact & Social Media</h3><p class="text-[11px] text-slate-500 mt-1">Public contact info, addresses, maps and social links</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('contact', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="settings-form-contact">
                            ${this.inputField('contact_email', 'Primary Club Email', this.getValue('contact_email', 'rc.cbeunity@gmail.com'), 'Shown publicly', 'email')}
                            ${this.inputField('contact_phone', 'Primary Contact Phone', this.getValue('contact_phone', ''), 'Optional, publicly shown', 'tel')}
                            ${this.inputField('contact_address', 'Address (City, State)', this.getValue('contact_address', 'Coimbatore, Tamil Nadu'), 'Shown in footer')}
                            ${this.inputField('contact_country', 'Country', this.getValue('contact_country', 'India'), '')}
                            ${this.textareaField('map_embed_url', 'Google Map Embed URL', this.getValue('map_embed_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15665.467472061262!2d76.95357835!3d11.0120227!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba859af2f973901%3A0xa7df13d55d172206!2sCoimbatore%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1700000000000'), 'Google Maps iframe src URL', 3)}
                            ${this.inputField('social_instagram', 'Instagram Handle', this.getValue('social_instagram', 'rotaractunity'), 'Without @ sign')}
                            ${this.inputField('social_facebook', 'Facebook Handle', this.getValue('social_facebook', ''), 'Page name/handle')}
                            ${this.inputField('social_linkedin', 'LinkedIn Handle', this.getValue('social_linkedin', ''), 'Company page handle')}
                            ${this.inputField('social_youtube', 'YouTube Channel', this.getValue('social_youtube', ''), 'Channel URL')}
                            ${this.inputField('social_twitter', 'X / Twitter Handle', this.getValue('social_twitter', ''), 'Without @ sign')}
                        </div>

                        <div class="mt-6 p-4 rounded-xl ap-tint-box">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-droplet text-brand-blue mr-1"></i>Blood Desk Emergency Contacts</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${this.inputField('blood_desk_phone_1', 'Primary Emergency WhatsApp Number', this.getValue('blood_desk_phone_1', '9789903206'), '10 digits only, no +91', 'tel')}
                                ${this.inputField('blood_desk_phone_2', 'Secondary Emergency WhatsApp Number', this.getValue('blood_desk_phone_2', '9789953206'), '10 digits only, no +91', 'tel')}
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 5: EMAIL & AUTOMATION
            // =========================================
            renderAutomationTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-robot text-brand-blue mr-2"></i>Email & Automation</h3><p class="text-[11px] text-slate-500 mt-1">Mail groups, auto-trigger settings, and notification preferences</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('automation', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="space-y-5" id="settings-form-automation">
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-envelope text-brand-blue mr-1"></i>Mailing Groups (hidden from public view)</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.inputField('mail_group_members', 'All Members Group Email', this.getValue('mail_group_members', 'rotaractunity@googlegroups.com'), 'Hidden; used by system to send mails', 'email')}
                                    ${this.inputField('mail_group_board', 'Board Members Group Email', this.getValue('mail_group_board', 'eternals26-27@googlegroups.com'), 'Hidden; used for board communications', 'email')}
                                    ${this.inputField('mail_sender_name', 'Sender Display Name', this.getValue('mail_sender_name', 'Rotaract Club of Coimbatore Unity'), 'Name shown in emails')}
                                    ${this.inputField('mail_sender_address', 'From Email Address', this.getValue('mail_sender_address', 'rc.cbeunity@gmail.com'), 'From address', 'email')}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-wand-magic-sparkles text-brand-blue mr-1"></i>Automation Triggers</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.toggleField('auto_birthday_wishes', 'Birthday Wishes Auto-Trigger', this.getValue('auto_birthday_wishes', 'true'))}
                                    ${this.toggleField('auto_project_approval_mail', 'Project Approval Member Alert', this.getValue('auto_project_approval_mail', 'true'))}
                                    ${this.toggleField('auto_meeting_invite', 'Meeting Invitation Auto-Send', this.getValue('auto_meeting_invite', 'true'))}
                                    ${this.toggleField('auto_meeting_attendance', 'Meeting Attendance Form Auto-Send', this.getValue('auto_meeting_attendance', 'true'))}
                                    ${this.toggleField('auto_monthly_treasury', 'Monthly Treasury Statement Auto-Send', this.getValue('auto_monthly_treasury', 'true'))}
                                    ${this.toggleField('auto_minutes_distribution', 'Minutes Auto-Distribute After Approval', this.getValue('auto_minutes_distribution', 'true'))}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-message text-brand-blue mr-1"></i>Default Message Templates</h4>
                                <div class="grid grid-cols-1 gap-4">
                                    ${this.textareaField('template_birthday', 'Birthday Wish Template', this.getValue('template_birthday', 'Dear {NAME}, wishing you a happy birthday from Rotaract Club of Coimbatore Unity!'), 'Use {NAME} placeholder', 2)}
                                    ${this.textareaField('template_meeting_invite', 'Meeting Invite Template', this.getValue('template_meeting_invite', 'You are cordially invited to {MEETING_NAME} on {DATE} at {TIME}, Venue: {VENUE}.'), 'Use {MEETING_NAME}, {DATE}, {TIME}, {VENUE}', 3)}
                                    ${this.textareaField('template_project_announce', 'Project Announcement Template', this.getValue('template_project_announce', 'A new project has been approved: {PROJECT_NAME} on {DATE} at {VENUE}. All members are requested to actively participate.'), 'Use {PROJECT_NAME}, {DATE}, {VENUE}', 3)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 6: ACCESS & ROLES
            // =========================================
            renderAccessTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-key text-brand-blue mr-2"></i>Access Levels & Role Permissions</h3><p class="text-[11px] text-slate-500 mt-1">Define what each role can do (used across the admin panel)</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.navigateTo('users')"><i class="fa-solid fa-user-shield mr-1"></i>Manage Admin Users</button>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-xs">
                                <thead>
                                    <tr class="border-b border-slate-200/40 dark:border-white/[0.08]">
                                        <th class="py-3 px-3 text-left font-black uppercase tracking-wider text-slate-500">Role Name</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Projects</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Meetings</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Treasury</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Members</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Reports</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Approve</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Settings</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-200/30 dark:divide-white/[0.04]">
                                    ${this.rolePermRow('Super Admin', ['full', 'full', 'full', 'full', 'full', 'yes', 'full'])}
                                    ${this.rolePermRow('Advisor', ['full', 'full', 'full', 'full', 'full', 'yes', 'full'])}
                                    ${this.rolePermRow('President', ['full', 'full', 'view', 'full', 'full', 'yes', 'limited'])}
                                    ${this.rolePermRow('Immediate Past President', ['full', 'full', 'view', 'full', 'full', 'yes', 'none'])}
                                    ${this.rolePermRow('Vice President', ['edit', 'edit', 'view', 'view', 'full', 'yes', 'none'])}
                                    ${this.rolePermRow('Secretary (Admin)', ['full', 'full', 'view', 'full', 'full', 'yes', 'none'])}
                                    ${this.rolePermRow('Secretary (Comm)', ['full', 'full', 'view', 'full', 'full', 'yes', 'none'])}
                                    ${this.rolePermRow('Treasurer', ['view', 'view', 'full', 'view', 'view', 'no', 'none'])}
                                    ${this.rolePermRow('Avenue Director', ['own-avenue', 'view', 'none', 'view', 'own-avenue', 'no', 'none'])}
                                    ${this.rolePermRow('Avenue Chair', ['own-avenue', 'view', 'none', 'view', 'own-avenue', 'no', 'none'])}
                                    ${this.rolePermRow('DPP Chair', ['dpp-only', 'view', 'none', 'view', 'dpp-only', 'no', 'none'])}
                                    ${this.rolePermRow('Member', ['view', 'view', 'none', 'view', 'view', 'no', 'none'])}
                                </tbody>
                            </table>
                        </div>

                        <div class="mt-6 p-4 rounded-xl ap-tint-box">
                            <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                <i class="fa-solid fa-circle-info text-amber-500 mr-1"></i>
                                These permissions govern what each role sees in the admin panel. To add or remove individual admin users, use the <strong>Admin Users</strong> section. Role definitions themselves (which role a user is assigned) are managed per-user in Admin Users.
                            </p>
                        </div>
                    </div>
                `;
            },

            rolePermRow(name, perms) {
                const map = { full: '<i class="fa-solid fa-circle-check text-green-500"></i>', edit: '<span class="text-[9px] font-bold text-blue-500">EDIT</span>', view: '<span class="text-[9px] font-bold text-slate-400">VIEW</span>', 'own-avenue': '<span class="text-[9px] font-bold text-purple-500">AVENUE</span>', 'dpp-only': '<span class="text-[9px] font-bold text-yellow-500">DPP</span>', yes: '<i class="fa-solid fa-circle-check text-green-500"></i>', no: '<i class="fa-solid fa-circle-xmark text-red-400"></i>', limited: '<span class="text-[9px] font-bold text-orange-500">LIMIT</span>', none: '<i class="fa-solid fa-minus text-slate-300"></i>' };
                return `<tr><td class="py-2.5 px-3 text-xs font-bold">${name}</td>${perms.map(p => `<td class="py-2.5 px-3 text-center">${map[p] || p}</td>`).join('')}</tr>`;
            },

            // =========================================
            // TAB 7: OFFICER SIGNATURES
            // =========================================
            renderOfficersTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-user-tie text-brand-blue mr-2"></i>Officer Signature Block (Reports & Minutes)</h3><p class="text-[11px] text-slate-500 mt-1">Names shown in signature lines of generated documents</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('officers', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-5" id="settings-form-officers">
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-[11px] font-black uppercase text-blue-600 mb-3">Left Signature</h4>
                                ${this.inputField('officer_sec_admin_name', 'Name', this.getValue('officer_sec_admin_name', ''), 'e.g., Rtr. John Doe')}
                                ${this.inputField('officer_sec_admin_portfolio', 'Portfolio', this.getValue('officer_sec_admin_portfolio', 'Secretary (Administration)'), '')}
                            </div>
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-[11px] font-black uppercase text-purple-600 mb-3">Center Signature</h4>
                                ${this.inputField('officer_president_name', 'Name', this.getValue('officer_president_name', ''), 'e.g., Rtr. Jane Smith')}
                                ${this.inputField('officer_president_portfolio', 'Portfolio', this.getValue('officer_president_portfolio', 'President'), '')}
                            </div>
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-[11px] font-black uppercase text-cyan-600 mb-3">Right Signature</h4>
                                ${this.inputField('officer_sec_comm_name', 'Name', this.getValue('officer_sec_comm_name', ''), 'e.g., Rtr. Bob Lee')}
                                ${this.inputField('officer_sec_comm_portfolio', 'Portfolio', this.getValue('officer_sec_comm_portfolio', 'Secretary (Communication)'), '')}
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 8: WEBSITE CONTENT
            // =========================================
            renderWebsiteTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-globe text-brand-blue mr-2"></i>Website Content & Messaging</h3><p class="text-[11px] text-slate-500 mt-1">Hero text, taglines, section headings</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('website', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="settings-form-website">
                            ${this.textareaField('hero_heading', 'Hero Heading', this.getValue('hero_heading', 'Rotaract Club of Coimbatore Unity'), '', 2)}
                            ${this.textareaField('hero_tagline', 'Hero Tagline / Subheading', this.getValue('hero_tagline', 'Building transformative youth leadership, sustainable community impact, and meaningful professional connections.'), '', 3)}
                            ${this.inputField('cta_primary_label', 'Primary CTA Button Label', this.getValue('cta_primary_label', 'Join Our Movement'))}
                            ${this.inputField('cta_secondary_label', 'Secondary CTA Button Label', this.getValue('cta_secondary_label', 'Explore Projects'))}
                            ${this.textareaField('about_section_text', 'About / Benefits Section Intro', this.getValue('about_section_text', 'Rotaract empowers youth to build professional capabilities, grow dynamic leadership networks, support humanitarian activities, and make lifelong connections.'), '', 3)}
                            ${this.inputField('footer_copyright', 'Footer Copyright Line', this.getValue('footer_copyright', '2026-27 Rotaract Club of Coimbatore Unity. All rights reserved.'))}
                            ${this.toggleField('show_games_section', 'Show Games Portal in Navigation', this.getValue('show_games_section', 'true'))}
                            ${this.toggleField('show_blood_section', 'Show Blood Desk Section', this.getValue('show_blood_section', 'true'))}
                            ${this.toggleField('show_chatbot', 'Show AI Chatbot Floating Button', this.getValue('show_chatbot', 'true'))}
                            ${this.toggleField('enable_membership_apps', 'Accept New Membership Applications', this.getValue('enable_membership_apps', 'true'))}
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB: LIVE IMPACT STATS (landing page hero card)
            // Each number is auto-calculated from live data. The admin can add an
            // adjustment (e.g. work done before the portal existed) or switch a
            // number to a fixed manual value. Super Admin is never counted as a member.
            // =========================================
            _statsAuto: {},

            statDefs() {
                return (window.UnityStats && window.UnityStats.defs) || [
                    { key: 'total_members', label: 'Active Members' },
                    { key: 'projects_completed', label: 'Projects Done' },
                    { key: 'service_hours', label: 'Service Hours' },
                    { key: 'beneficiaries', label: 'Lives Impacted' }
                ];
            },

            renderStatsTab() {
                const meta = {
                    total_members:      { icon: 'fa-users',       tint: 'text-brand-blue',   hint: 'Auto = active club members. The Super Admin is a system account and is never counted.' },
                    projects_completed: { icon: 'fa-folder-open', tint: 'text-brand-purple', hint: 'Auto = projects whose status is "completed".' },
                    service_hours:      { icon: 'fa-clock',       tint: 'text-green-500',    hint: 'Auto = total Service Hours entered in the reports of completed projects.' },
                    beneficiaries:      { icon: 'fa-heart',       tint: 'text-red-500',      hint: 'Auto = total Beneficiaries entered in the reports of completed projects.' }
                };
                const cards = this.statDefs().map(d => {
                    const k = d.key;
                    const m = meta[k] || { icon: 'fa-chart-line', tint: 'text-brand-blue', hint: '' };
                    const mode = this.getValue('stat_' + k + '_mode', 'auto') === 'manual' ? 'manual' : 'auto';
                    return `
                        <div class="p-4 rounded-xl ap-tint-box">
                            <div class="flex items-center justify-between mb-3 gap-3">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider"><i class="fa-solid ${m.icon} ${m.tint} mr-1"></i>${d.label}</h4>
                                <div class="text-right">
                                    <p class="text-[9px] uppercase font-bold text-slate-400">Shown on site</p>
                                    <p class="text-lg font-black" data-stat-final="${k}">...</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label class="settings-label">Mode</label>
                                    <select name="stat_${k}_mode" class="settings-input" onchange="AdminPanel.modules.settings.updateStatsPreview()">
                                        <option value="auto" ${mode === 'auto' ? 'selected' : ''}>Auto-calculate</option>
                                        <option value="manual" ${mode === 'manual' ? 'selected' : ''}>Manual value</option>
                                    </select>
                                    <p class="settings-hint">Calculated now: <strong data-stat-auto="${k}">...</strong></p>
                                </div>
                                <div>
                                    <label class="settings-label">Add to calculated</label>
                                    <input type="number" step="1" name="stat_${k}_offset" class="settings-input" value="${AdminPanel.esc(this.getValue('stat_' + k + '_offset', '0'))}" oninput="AdminPanel.modules.settings.updateStatsPreview()">
                                    <p class="settings-hint">Auto mode only. For work done before the portal. Can be negative.</p>
                                </div>
                                <div>
                                    <label class="settings-label">Manual value</label>
                                    <input type="number" min="0" step="1" name="stat_${k}_manual" class="settings-input" value="${AdminPanel.esc(this.getValue('stat_' + k + '_manual', ''))}" oninput="AdminPanel.modules.settings.updateStatsPreview()">
                                    <p class="settings-hint">Manual mode only. Replaces the calculated number.</p>
                                </div>
                            </div>
                            <p class="settings-hint mt-3">${m.hint}</p>
                        </div>`;
                }).join('');

                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div>
                                <h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-chart-line text-brand-blue mr-2"></i>Live Impact Stats</h3>
                                <p class="text-[11px] text-slate-500 mt-1">Numbers in the "Live Impact" card on the landing page. <span id="stats-calc-note"></span></p>
                            </div>
                            <div class="flex gap-2">
                                <button class="btn-secondary btn-sm" onclick="AdminPanel.modules.settings.refreshStatsPreview()"><i class="fa-solid fa-rotate mr-1"></i>Recalculate</button>
                                <button class="btn-secondary btn-sm" onclick="AdminPanel.modules.settings.resetStatsForm()"><i class="fa-solid fa-rotate-left mr-1"></i>Reset to Auto</button>
                                <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('stats', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                            </div>
                        </div>
                        <div class="space-y-4" id="settings-form-stats">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${cards}</div>
                            <div class="p-4 rounded-xl ap-tint-box">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="settings-label">Text after each number</label>
                                        <input type="text" name="stats_suffix" maxlength="4" class="settings-input" value="${AdminPanel.esc(this.getValue('stats_suffix', '+'))}" oninput="AdminPanel.modules.settings.updateStatsPreview()">
                                        <p class="settings-hint">Default "+". Leave empty to show plain numbers.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },

            async refreshStatsPreview() {
                const note = document.getElementById('stats-calc-note');
                if (!window.UnityStats) {
                    if (note) note.textContent = 'Statistics engine (app.js) is not loaded.';
                    return;
                }
                if (note) note.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Calculating...';
                try {
                    const { values, failed } = await window.UnityStats.calculate();
                    this._statsAuto = values;
                    if (note) note.textContent = failed.length
                        ? 'Could not calculate: ' + failed.join(', ') + '. Check table permissions.'
                        : 'Calculated just now from live data.';
                } catch (e) {
                    if (note) note.textContent = 'Calculation failed: ' + e.message;
                }
                this.updateStatsPreview();
            },

            updateStatsPreview() {
                const scope = document.getElementById('settings-form-stats');
                if (!scope || !window.UnityStats) return;
                const cfg = {};
                scope.querySelectorAll('[name]').forEach(i => { cfg[i.getAttribute('name')] = i.value; });
                const suffix = cfg.stats_suffix !== undefined ? cfg.stats_suffix : '+';
                const finals = window.UnityStats.resolve(this._statsAuto || {}, cfg);
                this.statDefs().forEach(d => {
                    const k = d.key;
                    const a = scope.querySelector('[data-stat-auto="' + k + '"]');
                    const f = scope.querySelector('[data-stat-final="' + k + '"]');
                    const hasAuto = this._statsAuto && this._statsAuto[k] !== undefined;
                    if (a) a.textContent = hasAuto ? Number(this._statsAuto[k]).toLocaleString() : '-';
                    if (f) f.textContent = Number(finals[k]).toLocaleString() + suffix;
                    const manual = cfg['stat_' + k + '_mode'] === 'manual';
                    const off = scope.querySelector('[name="stat_' + k + '_offset"]');
                    const man = scope.querySelector('[name="stat_' + k + '_manual"]');
                    if (off) { off.disabled = manual; off.style.opacity = manual ? '0.5' : ''; }
                    if (man) { man.disabled = !manual; man.style.opacity = manual ? '' : '0.5'; }
                });
            },

            resetStatsForm() {
                const scope = document.getElementById('settings-form-stats');
                if (!scope) return;
                scope.querySelectorAll('select[name$="_mode"]').forEach(s => { s.value = 'auto'; });
                scope.querySelectorAll('input[name$="_offset"]').forEach(i => { i.value = '0'; });
                scope.querySelectorAll('input[name$="_manual"]').forEach(i => { i.value = ''; });
                this.updateStatsPreview();
                window.AppToast?.info('Reset in the form. Click Save All to apply.');
            },

            // =========================================
            // TAB 9: INTEGRATIONS & APIs
            // =========================================
            renderIntegrationsTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-plug text-brand-blue mr-2"></i>Third-Party Integrations</h3><p class="text-[11px] text-slate-500 mt-1">API keys and external service configurations</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('integrations', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>

                        <div class="space-y-4" id="settings-form-integrations">
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-image text-brand-blue mr-1"></i>Cloudinary (Image Hosting)</h4>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    ${this.inputField('cloudinary_cloud_name', 'Cloud Name', this.getValue('cloudinary_cloud_name', 'duoy1cje9'), 'Public cloud identifier')}
                                    ${this.inputField('cloudinary_api_key', 'API Key', this.getValue('cloudinary_api_key', ''), 'Keep secure')}
                                    ${this.inputField('cloudinary_upload_preset', 'Upload Preset', this.getValue('cloudinary_upload_preset', ''), 'Unsigned upload preset')}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-robot text-brand-blue mr-1"></i>AI Chatbot (OpenRouter)</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.inputField('openrouter_api_key', 'OpenRouter API Key', this.getValue('openrouter_api_key', ''), 'Keep highly secure', 'password')}
                                    ${this.inputField('openrouter_model', 'Preferred Model', this.getValue('openrouter_model', 'openai/gpt-4o'), 'e.g., openai/gpt-4o')}
                                    ${this.textareaField('chatbot_system_prompt', 'Chatbot System Prompt', this.getValue('chatbot_system_prompt', 'You are the AI Assistant for Rotaract Club of Coimbatore Unity. You know about Rotary, Rotaract, District 3206, RSAMDIO, End Polio, and general knowledge. Reply concisely and professionally without emojis.'), '', 4)}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-database text-brand-blue mr-1"></i>Supabase Backend</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.inputField('supabase_url', 'Supabase Project URL', this.getValue('supabase_url', ''), 'Read-only; configure in config file')}
                                    ${this.inputField('supabase_bucket_events', 'Events/Posters Bucket Name', this.getValue('supabase_bucket_events', 'events'), 'Default: events (50MB limit)')}
                                    ${this.inputField('supabase_bucket_reports', 'Reports Bucket Name', this.getValue('supabase_bucket_reports', 'reports'), 'Default: reports (50MB limit)')}
                                    ${this.inputField('supabase_bucket_bulletins', 'Bulletins Bucket Name', this.getValue('supabase_bucket_bulletins', 'bulletins'), 'Default: bulletins')}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-brands fa-whatsapp text-rose-500 mr-1"></i>WhatsApp Blood Desk Alerts</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.inputField('whatsapp_country_code', 'Country Code', this.getValue('whatsapp_country_code', '+91'), 'Prefix for all WhatsApp sends')}
                                    ${this.toggleField('whatsapp_enabled', 'Enable WhatsApp Trigger', this.getValue('whatsapp_enabled', 'true'))}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 10: ADVANCED / RAW SETTINGS
            // =========================================
            async renderAdvancedTab() {
                // Load full raw dump
                try {
                    const { data } = await window.DB_ADMIN.from('system_settings').select('*').order('key');
                    const rows = (data || []).map(s => `
                        <tr>
                            <td class="py-2 px-3 text-[11px] font-mono font-bold text-brand-blue">${AdminPanel.esc(s.key)}</td>
                            <td class="py-2 px-3"><input type="text" class="settings-input text-[11px]" value="${AdminPanel.esc(s.value || '')}" onchange="AdminPanel.modules.settings.saveSingleKey('${s.key}', this.value)"></td>
                            <td class="py-2 px-3 text-[10px] text-slate-500">${AdminPanel.esc(s.description || '')}</td>
                            <td class="py-2 px-3 text-center"><button class="btn-danger btn-xs" onclick="AdminPanel.modules.settings.deleteKey('${s.key}')"><i class="fa-solid fa-trash"></i></button></td>
                        </tr>
                    `).join('');

                    return `
                        <div class="settings-section-card">
                            <div class="section-sticky-header">
                                <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-code text-brand-blue mr-2"></i>Advanced — Raw Database Keys</h3><p class="text-[11px] text-slate-500 mt-1">Direct database access to every setting (use with caution)</p></div>
                                <button class="btn-primary btn-sm" onclick="AdminPanel.modules.settings.addNewKey()"><i class="fa-solid fa-plus mr-1"></i>Add New Key</button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead><tr class="border-b border-slate-200/40 dark:border-white/[0.08]"><th class="py-3 px-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Key</th><th class="py-3 px-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Value</th><th class="py-3 px-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Description</th><th class="py-3 px-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Action</th></tr></thead>
                                    <tbody class="divide-y divide-slate-200/30 dark:divide-white/[0.04]">${rows || '<tr><td colspan="4" class="py-6 text-center text-xs text-slate-400">No settings in database.</td></tr>'}</tbody>
                                </table>
                            </div>
                        </div>
                    `;
                } catch (e) {
                    return `<div class="settings-section-card text-xs text-red-500">Load failed: ${AdminPanel.esc(e.message)}</div>`;
                }
            },

            // =========================================
            // HELPER FIELD RENDERERS
            // =========================================
            inputField(name, label, value, hint = '', type = 'text', required = false) {
                return `
                    <div>
                        <label class="settings-label">${label} ${required ? '<span class="text-red-500">*</span>' : ''}</label>
                        <input type="${type}" name="${name}" class="settings-input" value="${AdminPanel.esc(value)}" ${required ? 'required' : ''}>
                        ${hint ? `<p class="settings-hint">${hint}</p>` : ''}
                    </div>
                `;
            },

            textareaField(name, label, value, hint = '', rows = 3) {
                return `
                    <div class="md:col-span-2">
                        <label class="settings-label">${label}</label>
                        <textarea name="${name}" rows="${rows}" class="settings-input" style="resize:vertical;">${AdminPanel.esc(value)}</textarea>
                        ${hint ? `<p class="settings-hint">${hint}</p>` : ''}
                    </div>
                `;
            },

            colorField(name, label, value) {
                const v = AdminPanel.esc(value);
                return `
                    <div>
                        <label class="settings-label">${label}</label>
                        <div class="flex items-center gap-2">
                            <input type="color" name="${name}" value="${v}" class="color-swatch" style="background:${v}" oninput="this.style.background=this.value;this.nextElementSibling.value=this.value">
                            <input type="text" name="${name}__hex" class="settings-input text-[11px] font-mono" value="${v}" oninput="if(/^#[0-9a-fA-F]{6}$/.test(this.value)){this.previousElementSibling.value=this.value;this.previousElementSibling.style.background=this.value;}">
                        </div>
                    </div>
                `;
            },

            toggleField(name, label, value) {
                const checked = (value === 'true' || value === true);
                return `
                    <div class="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-slate-800/30 border border-slate-200/40 dark:border-white/[0.06]">
                        <label class="text-xs font-bold">${label}</label>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="${name}" ${checked ? 'checked' : ''} class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                        </label>
                    </div>
                `;
            },

            // =========================================
            // SAVE OPERATIONS
            // =========================================
            // system_settings.category is NOT NULL, so every upsert must carry it.
            // Existing rows keep their category/data_type; new keys get the tab name.
            async buildRows(items, defaultCategory) {
                const { data: existing, error } = await window.DB_ADMIN
                    .from('system_settings').select('key, category, data_type');
                if (error) throw error;
                const have = new Map((existing || []).map(r => [r.key, r]));
                const now = new Date().toISOString();
                return items.map(it => {
                    const prev = have.get(it.key);
                    return {
                        key: it.key,
                        value: it.value,
                        category: (prev && prev.category) || it.category || defaultCategory || 'general',
                        data_type: (prev && prev.data_type) || it.data_type || 'text',
                        updated_at: now
                    };
                });
            },

            async saveTab(tabId, btn) {
                // Guaranteed feedback - never rely on AppToast being present.
                const say = (type, msg) => {
                    const t = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
                    if (window.AppToast && typeof window.AppToast[t] === 'function') { window.AppToast[t](msg); return; }
                    console[t === 'error' ? 'error' : 'log']('[settings:' + t + '] ' + msg);
                    let host = document.getElementById('settings-toast-host');
                    if (!host) {
                        host = document.createElement('div');
                        host.id = 'settings-toast-host';
                        host.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:100000;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
                        document.body.appendChild(host);
                    }
                    const box = document.createElement('div');
                    const color = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#2563eb' }[t];
                    box.style.cssText = 'background:' + color + ';color:#fff;padding:10px 14px;border-radius:10px;font-size:12px;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,.25);max-width:340px;';
                    box.textContent = msg;
                    host.appendChild(box);
                    setTimeout(() => box.remove(), 3400);
                };

                if (this._saving) return;                       // ignore double-clicks
                const scope = document.getElementById('settings-tab-content') || document.getElementById('settings-form-' + tabId);
                if (!scope) { say('warning', 'Settings form not found.'); return; }
                if (!window.DB_ADMIN) { say('error', 'Database client (DB_ADMIN) is not available.'); return; }

                // Collect every field in the active tab.
                const map = new Map();
                const boolKeys = new Set();
                scope.querySelectorAll('input[name], textarea[name], select[name]').forEach(input => {
                    const name = input.getAttribute('name');
                    if (!name) return;
                    if (name.endsWith('__hex')) {               // colour helper twin: feed the swatch key
                        const base = name.slice(0, -5);
                        const swatch = scope.querySelector('input[type="color"][name="' + base + '"]');
                        if (swatch) {
                            const hex = String(input.value).trim();
                            map.set(base, /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : swatch.value);
                        }
                        return;
                    }
                    if (input.type === 'checkbox') { map.set(name, input.checked ? 'true' : 'false'); boolKeys.add(name); return; }
                    if (input.type === 'radio') { if (input.checked) map.set(name, input.value); return; }
                    if (!map.has(name)) map.set(name, String(input.value));
                });

                const payload = [...map.entries()].map(([key, value]) => ({ key, value, data_type: boolKeys.has(key) ? 'boolean' : 'text' }));
                if (!payload.length) { say('warning', 'Nothing to save in this tab.'); return; }

                if (tabId === 'stats') {
                    const bad = this.statDefs().find(d => map.get('stat_' + d.key + '_mode') === 'manual' && !(parseFloat(map.get('stat_' + d.key + '_manual')) >= 0));
                    if (bad) { say('warning', 'Enter a manual value for "' + bad.label + '" or switch it back to Auto-calculate.'); return; }
                }

                // Loading state on the clicked button.
                this._saving = true;
                const originalHtml = btn ? btn.innerHTML : '';
                if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Saving...'; }

                try {
                    // One batched upsert; .select() lets us confirm rows were really written
                    // (row-level-security can otherwise fail silently).
                    const rows = await this.buildRows(payload, tabId);
                    const { data: written, error } = await window.DB_ADMIN
                        .from('system_settings')
                        .upsert(rows, { onConflict: 'key' })
                        .select('key');
                    if (error) throw error;
                    if (!written || written.length === 0) {
                        throw new Error('Database accepted the request but saved 0 rows. Check the table permissions for system_settings.');
                    }

                    // Refresh local cache from the database.
                    const { data } = await window.DB_ADMIN.from('system_settings').select('*');
                    this.settingsCache = {};
                    (data || []).forEach(s => { this.settingsCache[s.key] = s.value; });

                    say('success', written.length + ' settings saved.');
                    try { window.UnityStats?.invalidate?.(); window.AppCache?.remove?.('site_settings'); } catch (e) {}
                    if (tabId === 'stats') this.updateStatsPreview();
                    try { AdminPanel.logActivity('SETTINGS_UPDATE', 'settings', null, { tab: tabId, count: written.length }); } catch (e) {}
                    if (['identity', 'branding', 'website', 'contact', 'stats'].includes(tabId)) say('info', 'Reload the public site to see changes.');
                } catch (e) {
                    console.error('[settings] save failed:', e);
                    say('error', 'Save failed: ' + (e && e.message ? e.message : e));
                } finally {
                    this._saving = false;
                    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
                }
            },

            async saveSingleKey(key, value) {
                try {
                    const rows = await this.buildRows([{ key, value: String(value) }], 'general');
                    const { error } = await window.DB_ADMIN.from('system_settings').upsert(rows, { onConflict: 'key' });
                    if (error) throw error;
                    window.AppToast?.success(`${key} saved.`);
                    AdminPanel.logActivity('SETTINGS_UPDATE', 'settings', null, { key });
                } catch (e) {
                    window.AppToast?.error('Save failed: ' + e.message);
                }
            },

            async deleteKey(key) {
                if (!confirm(`Delete the setting "${key}"? This may break site functionality.`)) return;
                try {
                    const { error: delErr } = await window.DB_ADMIN.from('system_settings').delete().eq('key', key);
                    if (delErr) throw delErr;
                    window.AppToast?.success('Deleted.');
                    await this.render(AdminPanel.workspace);
                } catch (e) { window.AppToast?.error('Delete failed'); }
            },

            addNewKey() {
                AdminPanel.createModal({
                    title: 'Add New Setting Key',
                    size: 'small',
                    icon: 'plus',
                    body: `
                        <form id="new-key-form" onsubmit="return false;" class="space-y-4">
                            <div><label class="settings-label">Key Name <span class="text-red-500">*</span></label><input type="text" name="key" required class="settings-input" placeholder="e.g., my_custom_key"><p class="settings-hint">Use snake_case, lowercase. No spaces.</p></div>
                            <div><label class="settings-label">Value</label><textarea name="value" rows="3" class="settings-input"></textarea></div>
                            <div><label class="settings-label">Description</label><input type="text" name="description" class="settings-input" placeholder="What is this setting for?"></div>
                        </form>
                    `,
                    footer: `
                        <button class="btn-secondary" onclick="AdminPanel.closeModal()">Cancel</button>
                        <button class="btn-primary" onclick="AdminPanel.modules.settings.saveNewKey()"><i class="fa-solid fa-save mr-1"></i>Create</button>
                    `
                });
            },

            async saveNewKey() {
                const form = document.getElementById('new-key-form');
                if (!form) return;
                const fd = new FormData(form);
                const key = fd.get('key')?.trim();
                if (!key) { window.AppToast?.warning('Key required'); return; }
                try {
                    const { error: insErr } = await window.DB_ADMIN.from('system_settings').insert({ key, value: fd.get('value') || '', description: fd.get('description') || '', category: 'custom', data_type: 'text' });
                    if (insErr) throw insErr;
                    window.AppToast?.success('Setting created.');
                    AdminPanel.closeModal();
                    await this.render(AdminPanel.workspace);
                } catch (e) { window.AppToast?.error('Failed: ' + e.message); }
            },

            // =========================================
            // IMPORT / EXPORT
            // =========================================
            async exportSettings() {
                try {
                    const { data } = await window.DB_ADMIN.from('system_settings').select('*').order('key');
                    const json = JSON.stringify(data, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `unity_settings_backup_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    window.AppToast?.success('Settings exported.');
                } catch (e) { window.AppToast?.error('Export failed'); }
            },

            importSettings() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (!confirm(`Import "${file.name}"? This will overwrite existing settings with matching keys.`)) return;
                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        if (!Array.isArray(data)) throw new Error('Invalid format');
                        for (const item of data) {
                            if (!item.key) continue;
                            const rows = await this.buildRows([{ key: item.key, value: item.value || '', category: item.category, data_type: item.data_type }], 'general');
                            if (item.description) rows[0].description = item.description;
                            const { error: impErr } = await window.DB_ADMIN.from('system_settings').upsert(rows, { onConflict: 'key' });
                            if (impErr) throw impErr;
                        }
                        window.AppToast?.success(`${data.length} settings imported.`);
                        await this.render(AdminPanel.workspace);
                    } catch (e) { window.AppToast?.error('Import failed: ' + e.message); }
                };
                input.click();
            }
        },

        // ==========================================
        // TREASURY MODULE
        // ==========================================
        treasury: {
            async render(workspace) {
                try {
                    const { data: txs } = await window.DB_ADMIN.from('treasury').select('*').order('transaction_date', { ascending: false }).limit(50);
                    workspace.innerHTML = `
                        <div class="p-6 lg:p-10">
                            <div class="admin-page-header">
                                <div>
                                    <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Treasury</span></div>
                                    <h1 class="admin-page-title">Financial Ledger</h1>
                                </div>
                            </div>
                            <div class="admin-panel">
                                <div class="admin-panel-body p-0">
                                    <div class="overflow-x-auto">
                                        <table class="admin-data-table">
                                            <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Category</th></tr></thead>
                                            <tbody>
                                                ${(!txs || txs.length === 0) ? '<tr><td colspan="5" class="text-center py-8 text-slate-400">No transactions.</td></tr>' : txs.map(t => `
                                                    <tr>
                                                        <td class="text-xs">${AdminPanel.fmtDate(t.transaction_date)}</td>
                                                        <td class="text-xs font-bold">${AdminPanel.esc(t.particular || t.description || '')}</td>
                                                        <td><span class="badge ${parseFloat(t.income) > 0 ? 'badge-green' : 'badge-red'}">${parseFloat(t.income) > 0 ? 'income' : 'expense'}</span></td>
                                                        <td class="text-xs font-black font-mono ${parseFloat(t.income) > 0 ? 'text-green-600' : 'text-red-600'}">INR ${parseFloat(parseFloat(t.income) > 0 ? t.income : t.expense || 0).toLocaleString()}</td>
                                                        <td class="text-xs text-slate-500">${AdminPanel.esc(t.category || 'General')}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } catch (e) { workspace.innerHTML = AdminPanel.renderError(e.message); }
            }
        }
    };

    window.AdminPanel = AdminPanel;

    window.addEventListener('beforeunload', () => {
        AdminPanel.realtimeSubscriptions.forEach(sub => { try { window.DB_ADMIN?.removeChannel(sub); } catch (e) {} });
    });
})();