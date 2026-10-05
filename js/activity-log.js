// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// SYSTEM ACTIVITY LOG MODULE
// File: js/activity-log.js | Version: 3.0.0
// Features: Real-time Stream | Advanced Filters
// Audit Trail | Export | Analytics | Search
// ============================================

(function () {
    'use strict';

    const ActivityLog = {
        // ==========================================
        // STATE
        // ==========================================
        allLogs: [],
        filtered: [],
        searchQuery: '',
        actionFilter: '',
        userFilter: '',
        dateRange: 'all',
        sortBy: 'created_at',
        sortOrder: 'desc',
        currentPage: 1,
        pageSize: 50,
        stats: {},
        uniqueUsers: [],
        uniqueActions: [],

        // ==========================================
        // ACTION CONFIGURATION
        // ==========================================
        ACTION_CONFIG: {
            CREATE: { icon: 'fa-plus-circle', color: 'green', label: 'Created' },
            UPDATE: { icon: 'fa-pen-to-square', color: 'blue', label: 'Updated' },
            DELETE: { icon: 'fa-trash-can', color: 'red', label: 'Deleted' },
            APPROVE: { icon: 'fa-circle-check', color: 'green', label: 'Approved' },
            REJECT: { icon: 'fa-circle-xmark', color: 'red', label: 'Rejected' },
            RECONSIDER: { icon: 'fa-rotate-left', color: 'yellow', label: 'Reconsidered' },
            LOGIN: { icon: 'fa-right-to-bracket', color: 'blue', label: 'Login' },
            LOGOUT: { icon: 'fa-right-from-bracket', color: 'gray', label: 'Logout' },
            PORTAL_ACCESS: { icon: 'fa-door-open', color: 'purple', label: 'Portal Access' },
            RESET_PASSWORD: { icon: 'fa-key', color: 'yellow', label: 'Password Reset' },
            FULFILL: { icon: 'fa-check-double', color: 'green', label: 'Fulfilled' },
            CANCEL: { icon: 'fa-ban', color: 'red', label: 'Cancelled' },
            REACTIVATE: { icon: 'fa-rotate', color: 'blue', label: 'Reactivated' },
            WHATSAPP_BROADCAST: { icon: 'fa-brands fa-whatsapp', color: 'green', label: 'WhatsApp Sent' },
            EMAIL_BROADCAST: { icon: 'fa-paper-plane', color: 'blue', label: 'Email Sent' },
            EXPORT: { icon: 'fa-file-export', color: 'purple', label: 'Exported' },
            PROVISION: { icon: 'fa-user-shield', color: 'red', label: 'Provisioned' },
            SUBMIT: { icon: 'fa-paper-plane', color: 'blue', label: 'Submitted' },
            PUBLISH: { icon: 'fa-globe', color: 'green', label: 'Published' },
            UNPUBLISH: { icon: 'fa-eye-slash', color: 'gray', label: 'Unpublished' }
        },

        ENTITY_CONFIG: {
            membership_application: { icon: 'fa-user-plus', label: 'Application', color: 'cyan' },
            blood_request: { icon: 'fa-droplet', label: 'Blood Request', color: 'red' },
            event: { icon: 'fa-calendar', label: 'Event', color: 'blue' },
            meeting: { icon: 'fa-people-group', label: 'Meeting', color: 'purple' },
            user: { icon: 'fa-user', label: 'User', color: 'green' },
            admin_user: { icon: 'fa-user-shield', label: 'Admin User', color: 'red' },
            report: { icon: 'fa-file-lines', label: 'Report', color: 'indigo' },
            email_log: { icon: 'fa-envelope', label: 'Email', color: 'teal' },
            treasury_transaction: { icon: 'fa-wallet', label: 'Transaction', color: 'yellow' },
            bulletin: { icon: 'fa-newspaper', label: 'Bulletin', color: 'orange' },
            session: { icon: 'fa-terminal', label: 'Session', color: 'slate' },
            settings: { icon: 'fa-gears', label: 'Settings', color: 'gray' }
        },

        // ==========================================
        // MAIN RENDER
        // ==========================================
        async render(workspace) {
            if (!window.AdminPanel.isExecutive(window.AuthManager.currentUser.role)) {
                workspace.innerHTML = window.AdminPanel.renderUnauthorized();
                return;
            }

            workspace.innerHTML = window.AdminPanel.renderLoader();

            try {
                await this.loadData();
                this.computeAnalytics();
                this.applyFilters();

                workspace.innerHTML = `
                    <div class="p-6 lg:p-10">
                        <!-- Header -->
                        <div class="admin-page-header">
                            <div>
                                <div class="admin-breadcrumb">
                                    <i class="fa-solid fa-house text-brand-blue"></i>
                                    <span>/</span>
                                    <span>System Activity Log</span>
                                </div>
                                <h1 class="admin-page-title">
                                    <i class="fa-solid fa-terminal text-brand-blue mr-2"></i>Activity Log
                                </h1>
                                <p class="admin-page-subtitle">Comprehensive audit trail of all user actions, system events, and administrative operations.</p>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <button class="btn-secondary btn-sm" onclick="ActivityLog.exportCSV()">
                                    <i class="fa-solid fa-file-csv mr-1"></i> Export CSV
                                </button>
                                <button class="btn-secondary btn-sm" onclick="ActivityLog.render(AdminPanel.workspace)">
                                    <i class="fa-solid fa-rotate mr-1"></i> Refresh
                                </button>
                            </div>
                        </div>

                        <!-- Analytics Stats -->
                        <div class="admin-stats-grid stagger-list">
                            ${window.AdminPanel.statCard('blue', 'fa-database', this.allLogs.length, 'Total Events')}
                            ${window.AdminPanel.statCard('green', 'fa-user-check', this.stats.todayCount, 'Today')}
                            ${window.AdminPanel.statCard('purple', 'fa-users', this.uniqueUsers.length, 'Active Users')}
                            ${window.AdminPanel.statCard('yellow', 'fa-bolt', this.stats.topActionCount, `Top: ${this.stats.topAction || 'N/A'}`)}
                        </div>

                        <!-- Action Breakdown -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-chart-bar"></i> Action Breakdown (Last 30 Days)</h3>
                            </div>
                            <div class="admin-panel-body">
                                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    ${this.renderActionBreakdown()}
                                </div>
                            </div>
                        </div>

                        <!-- Filters Toolbar -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-body py-4">
                                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                                    <!-- Search -->
                                    <div class="relative min-w-[280px] flex-1 max-w-md">
                                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                                        <input type="text" id="log-search" class="admin-form-input pl-8 py-2.5 text-xs"
                                            placeholder="Search user, action, entity, ID..."
                                            value="${window.AdminPanel.esc(this.searchQuery)}"
                                            oninput="ActivityLog.onSearch(this.value)">
                                        ${this.searchQuery ? `
                                            <button class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500" onclick="ActivityLog.clearSearch()">
                                                <i class="fa-solid fa-xmark text-xs"></i>
                                            </button>
                                        ` : ''}
                                    </div>

                                    <!-- Filter Dropdowns -->
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <select id="log-action-filter" class="admin-form-input admin-form-select py-2 text-xs w-auto"
                                            onchange="ActivityLog.onActionFilter(this.value)">
                                            <option value="">All Actions</option>
                                            ${this.uniqueActions.map(a => `
                                                <option value="${a}" ${this.actionFilter === a ? 'selected' : ''}>
                                                    ${this.ACTION_CONFIG[a]?.label || a} (${this.stats.actionCounts[a] || 0})
                                                </option>
                                            `).join('')}
                                        </select>

                                        <select id="log-user-filter" class="admin-form-input admin-form-select py-2 text-xs w-auto"
                                            onchange="ActivityLog.onUserFilter(this.value)">
                                            <option value="">All Users</option>
                                            ${this.uniqueUsers.map(u => `
                                                <option value="${u}" ${this.userFilter === u ? 'selected' : ''}>${u}</option>
                                            `).join('')}
                                        </select>

                                        <select id="log-date-filter" class="admin-form-input admin-form-select py-2 text-xs w-auto"
                                            onchange="ActivityLog.onDateFilter(this.value)">
                                            <option value="all" ${this.dateRange === 'all' ? 'selected' : ''}>All Time</option>
                                            <option value="today" ${this.dateRange === 'today' ? 'selected' : ''}>Today</option>
                                            <option value="yesterday" ${this.dateRange === 'yesterday' ? 'selected' : ''}>Yesterday</option>
                                            <option value="7d" ${this.dateRange === '7d' ? 'selected' : ''}>Last 7 Days</option>
                                            <option value="30d" ${this.dateRange === '30d' ? 'selected' : ''}>Last 30 Days</option>
                                            <option value="90d" ${this.dateRange === '90d' ? 'selected' : ''}>Last 90 Days</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Active Filters Indicator -->
                                ${(this.searchQuery || this.actionFilter || this.userFilter || this.dateRange !== 'all') ? `
                                    <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/30 dark:border-white/[0.04] flex-wrap">
                                        <span class="text-[10px] font-bold text-slate-400 uppercase">Active Filters:</span>
                                        ${this.searchQuery ? `<span class="badge badge-blue"><i class="fa-solid fa-magnifying-glass mr-1"></i>"${this.searchQuery}" <button onclick="ActivityLog.clearSearch()" class="ml-1 hover:text-red-500">&times;</button></span>` : ''}
                                        ${this.actionFilter ? `<span class="badge badge-green">${this.actionFilter} <button onclick="ActivityLog.onActionFilter('')" class="ml-1 hover:text-red-500">&times;</button></span>` : ''}
                                        ${this.userFilter ? `<span class="badge badge-purple">${this.userFilter} <button onclick="ActivityLog.onUserFilter('')" class="ml-1 hover:text-red-500">&times;</button></span>` : ''}
                                        ${this.dateRange !== 'all' ? `<span class="badge badge-yellow">${this.dateRange} <button onclick="ActivityLog.onDateFilter('all')" class="ml-1 hover:text-red-500">&times;</button></span>` : ''}
                                        <button class="text-[10px] text-red-500 font-bold hover:underline ml-2" onclick="ActivityLog.clearAllFilters()">Clear All</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Results Info -->
                        <div class="flex items-center justify-between mb-4 px-1">
                            <p class="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Showing <span class="text-brand-blue">${this.filtered.length}</span> of ${this.allLogs.length} events
                                ${this.filtered.length > this.pageSize ? ` &bull; Page ${this.currentPage} of ${Math.ceil(this.filtered.length / this.pageSize)}` : ''}
                            </p>
                            <div class="flex items-center gap-2">
                                <select class="admin-form-input admin-form-select py-1.5 text-[10px] w-auto" onchange="ActivityLog.setPageSize(parseInt(this.value))">
                                    <option value="25" ${this.pageSize === 25 ? 'selected' : ''}>25 per page</option>
                                    <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50 per page</option>
                                    <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100 per page</option>
                                    <option value="200" ${this.pageSize === 200 ? 'selected' : ''}>200 per page</option>
                                </select>
                            </div>
                        </div>

                        <!-- Log Table -->
                        <div class="admin-panel">
                            <div class="admin-panel-body p-0">
                                <div class="overflow-x-auto" style="max-height:600px;overflow-y:auto;">
                                    <table class="admin-data-table">
                                        <thead>
                                            <tr>
                                                <th style="width:160px;">Timestamp</th>
                                                <th style="width:140px;">User</th>
                                                <th style="width:100px;">Role</th>
                                                <th style="width:130px;">Action</th>
                                                <th style="width:130px;">Entity</th>
                                                <th>Entity ID</th>
                                                <th style="width:60px;">Detail</th>
                                            </tr>
                                        </thead>
                                        <tbody id="log-tbody">
                                            ${this.renderRows()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Pagination -->
                            ${this.filtered.length > this.pageSize ? `
                                <div class="admin-panel-body py-3 border-t border-slate-200/30 dark:border-white/[0.04]">
                                    <div class="flex items-center justify-between">
                                        <p class="text-[10px] text-slate-400">
                                            ${((this.currentPage - 1) * this.pageSize) + 1}–${Math.min(this.currentPage * this.pageSize, this.filtered.length)} of ${this.filtered.length}
                                        </p>
                                        <div class="flex items-center gap-1">
                                            <button class="btn-secondary btn-xs" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="ActivityLog.goToPage(1)">
                                                <i class="fa-solid fa-angles-left"></i>
                                            </button>
                                            <button class="btn-secondary btn-xs" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="ActivityLog.goToPage(${this.currentPage - 1})">
                                                <i class="fa-solid fa-chevron-left"></i>
                                            </button>
                                            <span class="px-3 py-1 text-xs font-bold text-brand-blue">${this.currentPage}</span>
                                            <button class="btn-secondary btn-xs" ${this.currentPage >= Math.ceil(this.filtered.length / this.pageSize) ? 'disabled' : ''} onclick="ActivityLog.goToPage(${this.currentPage + 1})">
                                                <i class="fa-solid fa-chevron-right"></i>
                                            </button>
                                            <button class="btn-secondary btn-xs" ${this.currentPage >= Math.ceil(this.filtered.length / this.pageSize) ? 'disabled' : ''} onclick="ActivityLog.goToPage(${Math.ceil(this.filtered.length / this.pageSize)})">
                                                <i class="fa-solid fa-angles-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Keyboard Shortcut Hint -->
                        <div class="mt-6 flex items-center justify-center gap-4 text-[10px] text-slate-400 flex-wrap">
                            <span><span class="kbd">Ctrl+R</span> Refresh Log</span>
                            <span><span class="kbd">Ctrl+K</span> Command Palette</span>
                        </div>
                    </div>
                `;
            } catch (e) {
                console.error('ActivityLog render error:', e);
                workspace.innerHTML = window.AdminPanel.renderError(e.message);
            }
        },

        // ==========================================
        // DATA LOADING
        // ==========================================
        async loadData() {
            const { data, error } = await window.DB_ADMIN
                .from('activity_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;
            this.allLogs = data || [];
        },

        // ==========================================
        // ANALYTICS
        // ==========================================
        computeAnalytics() {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

            // Action counts
            const actionCounts = {};
            this.allLogs.forEach(l => {
                const action = l.action || 'UNKNOWN';
                actionCounts[action] = (actionCounts[action] || 0) + 1;
            });

            // Top action
            const sortedActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]);
            const topAction = sortedActions[0]?.[0] || 'N/A';
            const topActionCount = sortedActions[0]?.[1] || 0;

            // Today count
            const todayCount = this.allLogs.filter(l => l.created_at >= todayStart).length;

            // Unique users
            const userSet = new Set();
            this.allLogs.forEach(l => {
                if (l.user_name && l.user_name !== 'System') userSet.add(l.user_name);
            });

            // Unique actions
            const actionSet = new Set(this.allLogs.map(l => l.action).filter(Boolean));

            this.stats = { actionCounts, topAction, topActionCount, todayCount };
            this.uniqueUsers = Array.from(userSet).sort();
            this.uniqueActions = Array.from(actionSet).sort();
        },

        renderActionBreakdown() {
            const sorted = Object.entries(this.stats.actionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12);

            if (sorted.length === 0) {
                return '<p class="col-span-full text-xs text-slate-400 text-center py-4">No activity data available</p>';
            }

            const maxCount = sorted[0][1];

            return sorted.map(([action, count]) => {
                const config = this.ACTION_CONFIG[action] || { icon: 'fa-circle', color: 'gray', label: action };
                const pct = Math.round((count / maxCount) * 100);

                return `
                    <button class="p-3 rounded-xl border border-white/20 dark:border-white/[0.04] bg-white/20 dark:bg-slate-800/10 text-left hover:border-${config.color}-500/30 transition-all hover-lift"
                        onclick="ActivityLog.onActionFilter('${action}')">
                        <div class="flex items-center justify-between mb-2">
                            <i class="fa-solid ${config.icon} text-${config.color}-500 text-sm"></i>
                            <span class="text-sm font-black text-slate-800 dark:text-slate-100">${count}</span>
                        </div>
                        <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">${config.label}</p>
                        <div class="h-1 rounded-full bg-slate-200/50 dark:bg-slate-700/50 mt-2 overflow-hidden">
                            <div class="h-full rounded-full bg-${config.color}-500 transition-all" style="width:${pct}%"></div>
                        </div>
                    </button>
                `;
            }).join('');
        },

        // ==========================================
        // FILTERING
        // ==========================================
        applyFilters() {
            let result = [...this.allLogs];

            // Search
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                result = result.filter(l =>
                    (l.user_name || '').toLowerCase().includes(q) ||
                    (l.action || '').toLowerCase().includes(q) ||
                    (l.entity_type || '').toLowerCase().includes(q) ||
                    (l.entity_id || '').toLowerCase().includes(q) ||
                    (l.user_role || '').toLowerCase().includes(q) ||
                    (l.description || '').toLowerCase().includes(q)
                );
            }

            // Action filter
            if (this.actionFilter) {
                result = result.filter(l => l.action === this.actionFilter);
            }

            // User filter
            if (this.userFilter) {
                result = result.filter(l => l.user_name === this.userFilter);
            }

            // Date range
            if (this.dateRange !== 'all') {
                const now = new Date();
                let cutoff;
                switch (this.dateRange) {
                    case 'today':
                        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                    case 'yesterday':
                        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                        break;
                    case '7d':
                        cutoff = new Date(now.getTime() - 7 * 86400000);
                        break;
                    case '30d':
                        cutoff = new Date(now.getTime() - 30 * 86400000);
                        break;
                    case '90d':
                        cutoff = new Date(now.getTime() - 90 * 86400000);
                        break;
                }
                if (cutoff) {
                    const cutoffISO = cutoff.toISOString();
                    result = result.filter(l => l.created_at >= cutoffISO);
                }
            }

            // Sort
            result.sort((a, b) => {
                let valA = a[this.sortBy] || '';
                let valB = b[this.sortBy] || '';
                if (this.sortBy === 'created_at') {
                    valA = new Date(valA).getTime();
                    valB = new Date(valB).getTime();
                }
                if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            this.filtered = result;
            this.currentPage = 1;
        },

        // ==========================================
        // FILTER HANDLERS
        // ==========================================
        onSearch(query) {
            this.searchQuery = query;
            this.applyFilters();
            this.updateTable();
        },

        clearSearch() {
            this.searchQuery = '';
            const input = document.getElementById('log-search');
            if (input) input.value = '';
            this.applyFilters();
            this.updateTable();
        },

        onActionFilter(value) {
            this.actionFilter = value;
            this.applyFilters();
            this.updateTable();
        },

        onUserFilter(value) {
            this.userFilter = value;
            this.applyFilters();
            this.updateTable();
        },

        onDateFilter(value) {
            this.dateRange = value;
            this.applyFilters();
            this.updateTable();
        },

        clearAllFilters() {
            this.searchQuery = '';
            this.actionFilter = '';
            this.userFilter = '';
            this.dateRange = 'all';
            this.applyFilters();
            this.render(window.AdminPanel.workspace);
        },

        setPageSize(size) {
            this.pageSize = size;
            this.currentPage = 1;
            this.updateTable();
        },

        goToPage(page) {
            const maxPage = Math.ceil(this.filtered.length / this.pageSize);
            this.currentPage = Math.max(1, Math.min(page, maxPage));
            this.updateTable();
        },

        updateTable() {
            const tbody = document.getElementById('log-tbody');
            if (tbody) {
                tbody.innerHTML = this.renderRows();
            }
            // Update count display
            const countEl = document.querySelector('.text-brand-blue');
            if (countEl) countEl.textContent = this.filtered.length;
        },

        // ==========================================
        // TABLE RENDERING
        // ==========================================
        renderRows() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            const pageData = this.filtered.slice(start, end);

            if (!pageData.length) {
                return `
                    <tr>
                        <td colspan="7" class="text-center py-16 text-slate-400">
                            <i class="fa-solid fa-ghost text-3xl mb-3 block opacity-30"></i>
                            <p class="text-xs font-bold">No activity logs match your filters</p>
                            <p class="text-[10px] mt-1">Try adjusting your search or filter criteria</p>
                        </td>
                    </tr>
                `;
            }

            return pageData.map(l => {
                const actionConfig = this.ACTION_CONFIG[l.action] || { icon: 'fa-circle-dot', color: 'gray', label: l.action || 'Unknown' };
                const entityConfig = this.ENTITY_CONFIG[l.entity_type] || { icon: 'fa-cube', label: l.entity_type || '-', color: 'slate' };
                const isSystem = !l.user_name || l.user_name === 'System';
                const isRecent = (Date.now() - new Date(l.created_at).getTime()) < 300000; // 5 min

                return `
                    <tr class="activity-row ${isRecent ? 'bg-green-500/3' : ''}" 
                        data-search="${(l.user_name || '').toLowerCase()} ${(l.action || '').toLowerCase()} ${(l.entity_type || '').toLowerCase()}">
                        <td class="text-xs whitespace-nowrap">
                            <div class="flex items-center gap-2">
                                ${isRecent ? '<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0"></span>' : ''}
                                <div>
                                    <p class="font-bold text-slate-700 dark:text-slate-200">${window.AdminPanel.fmtDate(l.created_at)}</p>
                                    <p class="text-[10px] text-slate-400">${new Date(l.created_at).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="flex items-center gap-2">
                                <div class="w-7 h-7 rounded-lg ${isSystem ? 'bg-slate-200 dark:bg-slate-700' : 'bg-brand-blue/10'} flex items-center justify-center flex-shrink-0">
                                    <i class="fa-solid ${isSystem ? 'fa-server' : 'fa-user'} ${isSystem ? 'text-slate-400' : 'text-brand-blue'} text-[9px]"></i>
                                </div>
                                <span class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[100px]">
                                    ${window.AdminPanel.esc(l.user_name || 'System')}
                                </span>
                            </div>
                        </td>
                        <td>
                            <span class="badge badge-gray text-[8px]">${(l.user_role || 'system').replace(/_/g, ' ')}</span>
                        </td>
                        <td>
                            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-${actionConfig.color}-500/10 text-${actionConfig.color}-600 dark:text-${actionConfig.color}-400 text-[10px] font-bold">
                                <i class="fa-solid ${actionConfig.icon} text-[8px]"></i>
                                ${actionConfig.label}
                            </span>
                        </td>
                        <td>
                            ${l.entity_type ? `
                                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-${entityConfig.color}-600 dark:text-${entityConfig.color}-400">
                                    <i class="fa-solid ${entityConfig.icon} text-[9px]"></i>
                                    ${entityConfig.label}
                                </span>
                            ` : '<span class="text-[10px] text-slate-400">—</span>'}
                        </td>
                        <td class="text-[10px] text-slate-400 font-mono">
                            ${l.entity_id ? `<span title="${l.entity_id}">${l.entity_id.substring(0, 8)}…</span>` : '—'}
                        </td>
                        <td>
                            <button class="btn-secondary btn-xs px-2" onclick="ActivityLog.viewDetail('${l.id}')" title="View Details">
                                <i class="fa-solid fa-eye text-[9px]"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        // ==========================================
        // DETAIL MODAL
        // ==========================================
        async viewDetail(logId) {
            const log = this.allLogs.find(l => l.id === logId);
            if (!log) { window.AppToast?.warning('Log entry not found.'); return; }

            const actionConfig = this.ACTION_CONFIG[log.action] || { icon: 'fa-circle-dot', color: 'gray', label: log.action };
            const entityConfig = this.ENTITY_CONFIG[log.entity_type] || { icon: 'fa-cube', label: log.entity_type || 'Unknown', color: 'slate' };

            let metadataHTML = '';
            if (log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0) {
                metadataHTML = `
                    <div class="admin-panel">
                        <div class="admin-panel-header">
                            <h3 class="admin-panel-title"><i class="fa-solid fa-code"></i> Metadata Payload</h3>
                        </div>
                        <div class="admin-panel-body p-0">
                            <pre class="p-4 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/30 rounded-b-2xl">${JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                    </div>
                `;
            }

            window.AdminPanel.createModal({
                title: 'Activity Log Detail',
                size: 'medium',
                icon: 'scroll',
                body: `
                    <div class="space-y-5">
                        <!-- Header -->
                        <div class="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-brand-blue/5 to-brand-purple/5 border border-white/20 dark:border-white/[0.04]">
                            <div class="w-14 h-14 rounded-2xl bg-${actionConfig.color}-500/10 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid ${actionConfig.icon} text-${actionConfig.color}-500 text-xl"></i>
                            </div>
                            <div class="flex-1">
                                <h3 class="text-lg font-black text-slate-800 dark:text-slate-100">${actionConfig.label}</h3>
                                <p class="text-xs text-slate-500 mt-0.5">
                                    by <strong>${window.AdminPanel.esc(log.user_name || 'System')}</strong>
                                    &bull; ${window.AdminPanel.fmtDate(log.created_at)} at ${new Date(log.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>

                        <!-- Details Grid -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-user mr-1"></i>Operator</p>
                                <p class="text-xs font-bold mt-1">${window.AdminPanel.esc(log.user_name || 'System')}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-shield mr-1"></i>Role</p>
                                <p class="text-xs font-bold mt-1">${(log.user_role || 'system').replace(/_/g, ' ')}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-bolt mr-1"></i>Action</p>
                                <p class="text-xs font-bold mt-1 text-${actionConfig.color}-600">${actionConfig.label}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-cube mr-1"></i>Entity Type</p>
                                <p class="text-xs font-bold mt-1">${entityConfig.label}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03] col-span-2">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-fingerprint mr-1"></i>Entity ID</p>
                                <p class="text-xs font-mono font-bold mt-1 text-slate-600 dark:text-slate-300 break-all">${log.entity_id || 'N/A'}</p>
                            </div>
                        </div>

                        ${log.entity_name ? `
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-tag mr-1"></i>Entity Name</p>
                                <p class="text-xs font-bold mt-1">${window.AdminPanel.esc(log.entity_name)}</p>
                            </div>
                        ` : ''}

                        ${log.description ? `
                            <div class="p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-align-left mr-1"></i>Description</p>
                                <p class="text-xs mt-1 leading-relaxed text-slate-700 dark:text-slate-300">${window.AdminPanel.esc(log.description)}</p>
                            </div>
                        ` : ''}

                        ${log.ip_address ? `
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-globe mr-1"></i>IP Address</p>
                                <p class="text-xs font-mono font-bold mt-1">${log.ip_address}</p>
                            </div>
                        ` : ''}

                        ${log.user_agent ? `
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-desktop mr-1"></i>User Agent</p>
                                <p class="text-[10px] font-mono mt-1 text-slate-500 break-all leading-relaxed">${window.AdminPanel.esc(log.user_agent)}</p>
                            </div>
                        ` : ''}

                        <!-- Log ID -->
                        <div class="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-white/[0.03]">
                            <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-hashtag mr-1"></i>Log Entry ID</p>
                            <p class="text-[10px] font-mono mt-1 text-slate-500 break-all">${log.id}</p>
                        </div>

                        ${metadataHTML}
                    </div>
                `
            });
        },

        // ==========================================
        // EXPORT
        // ==========================================
        exportCSV() {
            const dataToExport = this.filtered.length > 0 ? this.filtered : this.allLogs;

            if (!dataToExport.length) {
                window.AppToast?.warning('No log data to export.');
                return;
            }

            const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Entity Name', 'Description', 'IP Address'];
            const rows = dataToExport.map(l => [
                l.created_at,
                l.user_name || 'System',
                l.user_role || 'system',
                l.action || '',
                l.entity_type || '',
                l.entity_id || '',
                (l.entity_name || '').replace(/,/g, ';'),
                (l.description || '').replace(/,/g, ';').replace(/\n/g, ' '),
                l.ip_address || ''
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unity_activity_log_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            window.AppToast?.success(`Exported ${dataToExport.length} log entries!`);
        }
    };

    // Expose globally
    window.ActivityLog = ActivityLog;
})();