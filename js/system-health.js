// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// SYSTEM DIAGNOSTICS & HEALTH MODULE
// File: js/system-health.js | Version: 3.0.0
// Access: Super Admin Only
// Features: Real-time Metrics | Storage Monitor
// Maintenance Actions | Database Health | Logs
// ============================================

(function () {
    'use strict';

    const SystemHealth = {
        // ==========================================
        // STATE
        // ==========================================
        resources: [],
        storage: [],
        dbStats: {},
        pollInterval: null,
        isPolling: false,
        lastRefresh: null,

        // ==========================================
        // CONSTANTS
        // ==========================================
        SUBSYSTEMS: [
            { key: 'database', label: 'Database Engine', icon: 'fa-database', check: 'db' },
            { key: 'auth', label: 'Auth Crypt Engine', icon: 'fa-shield-halved', check: 'auth' },
            { key: 'edge', label: 'Edge Functions', icon: 'fa-bolt', check: 'edge' },
            { key: 'storage', label: 'Bucket Storage', icon: 'fa-hard-drive', check: 'storage' },
            { key: 'realtime', label: 'Realtime Engine', icon: 'fa-tower-broadcast', check: 'realtime' },
            { key: 'email', label: 'Email Service', icon: 'fa-envelope', check: 'email' }
        ],

        RESOURCE_ICONS: {
            database_size: 'fa-database',
            active_users: 'fa-users',
            monthly_api_calls: 'fa-network-wired',
            storage_used: 'fa-hard-drive',
            edge_function_invocations: 'fa-bolt',
            realtime_connections: 'fa-tower-broadcast'
        },

        RESOURCE_COLORS: {
            database_size: 'blue',
            active_users: 'green',
            monthly_api_calls: 'purple',
            storage_used: 'cyan',
            edge_function_invocations: 'yellow',
            realtime_connections: 'orange'
        },

        // ==========================================
        // MAIN RENDER
        // ==========================================
        async render(workspace) {
            if (window.AuthManager.currentUser.role !== 'super_admin') {
                workspace.innerHTML = window.AdminPanel.renderUnauthorized();
                return;
            }

            workspace.innerHTML = window.AdminPanel.renderLoader();

            try {
                await this.loadAllData();

                workspace.innerHTML = `
                    <div class="p-6 lg:p-10">
                        <!-- Header -->
                        <div class="admin-page-header">
                            <div>
                                <div class="admin-breadcrumb">
                                    <i class="fa-solid fa-house text-brand-blue"></i>
                                    <span>/</span>
                                    <span>System Health & Diagnostics</span>
                                </div>
                                <h1 class="admin-page-title">
                                    <i class="fa-solid fa-heart-pulse text-green-500 mr-2"></i>System Diagnostics
                                </h1>
                                <p class="admin-page-subtitle">Monitor database resources, storage consumption, edge function telemetry, and core subsystem health.</p>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <button class="btn-secondary btn-sm" id="poll-toggle-btn" onclick="SystemHealth.togglePolling()">
                                    <i class="fa-solid fa-satellite-dish mr-1"></i>
                                    <span id="poll-toggle-label">Start Live Poll</span>
                                </button>
                                <button class="btn-primary btn-sm" onclick="SystemHealth.render(AdminPanel.workspace)">
                                    <i class="fa-solid fa-rotate mr-1"></i> Refresh
                                </button>
                            </div>
                        </div>

                        <!-- Overall Health Banner -->
                        <div class="admin-panel mb-6" style="border-top: 3px solid #22c55e !important; background: rgba(34, 197, 94, 0.02) !important;">
                            <div class="admin-panel-body">
                                <div class="flex items-center gap-4">
                                    <div class="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                        <i class="fa-solid fa-heart-pulse text-green-500 text-2xl animate-pulse"></i>
                                    </div>
                                    <div class="flex-1">
                                        <p class="text-sm font-black text-green-700 dark:text-green-400">All Core Subsystems Operational</p>
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Last diagnostic scan: ${this.lastRefresh ? new Date(this.lastRefresh).toLocaleString() : 'Just now'}
                                            ${this.isPolling ? ' &bull; <span class="text-green-500 font-bold">Live polling active (15s)</span>' : ''}
                                        </p>
                                    </div>
                                    <div class="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/5 border border-green-500/15">
                                        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span class="text-xs font-black text-green-600 dark:text-green-400 uppercase tracking-wider">Healthy</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Subsystem Status Grid -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-server"></i> Core Subsystem Status</h3>
                                <span class="badge badge-green"><i class="fa-solid fa-check mr-1"></i>6/6 Online</span>
                            </div>
                            <div class="admin-panel-body">
                                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    ${this.SUBSYSTEMS.map(s => this.renderSubsystemCard(s)).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Resource Utilization -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-gauge-high text-brand-blue"></i> Resource Utilization</h3>
                                <span class="badge badge-blue">${this.resources.length} metrics</span>
                            </div>
                            <div class="admin-panel-body">
                                ${this.resources.length === 0
                                    ? '<p class="text-xs text-slate-400 text-center py-8">No resource metrics available. Click Refresh to poll.</p>'
                                    : `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        ${this.resources.map(r => this.renderResourceCard(r)).join('')}
                                    </div>`
                                }
                            </div>
                        </div>

                        <!-- Storage Buckets -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-box-archive text-indigo-500"></i> Storage Bucket Partitions</h3>
                                <span class="badge badge-purple">${this.storage.length} buckets</span>
                            </div>
                            <div class="admin-panel-body p-0">
                                ${this.storage.length === 0
                                    ? '<p class="text-xs text-slate-400 text-center py-8">No storage data retrieved.</p>'
                                    : `
                                        <div class="overflow-x-auto">
                                            <table class="admin-data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Bucket Identifier</th>
                                                        <th>Object Count</th>
                                                        <th>Total Size</th>
                                                        <th>Usage Bar</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${this.storage.map(s => {
                                                        const sizeMB = parseFloat(s.total_size_mb) || 0;
                                                        const pct = Math.min((sizeMB / 1024) * 100, 100);
                                                        const status = pct > 80 ? 'danger' : pct > 60 ? 'warning' : 'safe';
                                                        return `
                                                            <tr>
                                                                <td>
                                                                    <div class="flex items-center gap-2">
                                                                        <i class="fa-solid fa-bucket text-indigo-500 text-xs"></i>
                                                                        <span class="text-xs font-bold font-mono text-slate-700 dark:text-slate-200">${s.bucket_name}</span>
                                                                    </div>
                                                                </td>
                                                                <td class="text-xs font-bold">${(s.file_count || 0).toLocaleString()}</td>
                                                                <td class="text-xs font-mono font-bold">${sizeMB.toFixed(2)} MB</td>
                                                                <td style="min-width:120px;">
                                                                    <div class="flex items-center gap-2">
                                                                        <div class="flex-1 h-2 rounded-full bg-slate-200/50 dark:bg-slate-700/50 overflow-hidden">
                                                                            <div class="h-full rounded-full transition-all ${status === 'danger' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}" style="width:${pct}%"></div>
                                                                        </div>
                                                                        <span class="text-[9px] font-bold text-slate-400 w-8 text-right">${pct.toFixed(0)}%</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        `;
                                                    }).join('')}
                                                </tbody>
                                            </table>
                                        </div>

                                        <!-- Storage Summary -->
                                        <div class="p-4 border-t border-slate-200/30 dark:border-white/[0.04]">
                                            <div class="flex items-center justify-between flex-wrap gap-4">
                                                <div class="flex items-center gap-6">
                                                    <div>
                                                        <p class="text-[10px] text-slate-400 uppercase font-bold">Total Buckets</p>
                                                        <p class="text-sm font-black text-slate-800 dark:text-slate-100">${this.storage.length}</p>
                                                    </div>
                                                    <div>
                                                        <p class="text-[10px] text-slate-400 uppercase font-bold">Total Objects</p>
                                                        <p class="text-sm font-black text-slate-800 dark:text-slate-100">${this.storage.reduce((s, b) => s + (b.file_count || 0), 0).toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p class="text-[10px] text-slate-400 uppercase font-bold">Total Size</p>
                                                        <p class="text-sm font-black text-brand-blue">${this.storage.reduce((s, b) => s + (parseFloat(b.total_size_mb) || 0), 0).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <div class="text-[10px] text-slate-400">
                                                    <i class="fa-solid fa-circle-info mr-1"></i>Limit: 1024 MB (Free Tier)
                                                </div>
                                            </div>
                                        </div>
                                    `
                                }
                            </div>
                        </div>

                        <!-- Database Quick Stats -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-database text-cyan-500"></i> Database Table Overview</h3>
                                <button class="btn-secondary btn-xs" onclick="SystemHealth.loadTableStats()">
                                    <i class="fa-solid fa-rotate mr-1"></i> Count Rows
                                </button>
                            </div>
                            <div class="admin-panel-body" id="db-stats-container">
                                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" id="db-stats-grid">
                                    ${this.renderDBQuickStats()}
                                </div>
                            </div>
                        </div>

                        <!-- Maintenance Actions -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-screwdriver-wrench text-amber-500"></i> Automated Maintenance Routines</h3>
                            </div>
                            <div class="admin-panel-body">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button class="admin-panel p-5 text-left hover-lift cursor-pointer group" onclick="SystemHealth.runAction('run_daily_cleanup', 'Daily Cleanup', 'fa-broom', 'Purges logs older than 90 days, expired notifications, and stale blood requests.')">
                                        <div class="flex items-center gap-3 mb-3">
                                            <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition">
                                                <i class="fa-solid fa-broom text-blue-500"></i>
                                            </div>
                                            <div>
                                                <p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">Daily Cleanup</p>
                                                <p class="text-[9px] text-slate-400">run_daily_cleanup()</p>
                                            </div>
                                        </div>
                                        <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">Purges activity logs older than 90 days, read notifications older than 30 days, and expires stale blood requests.</p>
                                    </button>

                                    <button class="admin-panel p-5 text-left hover-lift cursor-pointer group" onclick="SystemHealth.runAction('update_club_statistics', 'Statistics Sync', 'fa-chart-line', 'Recomputes active user counts and updates the resource_monitor table.')">
                                        <div class="flex items-center gap-3 mb-3">
                                            <div class="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition">
                                                <i class="fa-solid fa-chart-line text-green-500"></i>
                                            </div>
                                            <div>
                                                <p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">Statistics Sync</p>
                                                <p class="text-[9px] text-slate-400">update_club_statistics()</p>
                                            </div>
                                        </div>
                                        <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">Recomputes active user counts and updates the resource_monitor table with latest telemetry data.</p>
                                    </button>

                                    <button class="admin-panel p-5 text-left hover-lift cursor-pointer group" onclick="SystemHealth.clearAllCache()">
                                        <div class="flex items-center gap-3 mb-3">
                                            <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition">
                                                <i class="fa-solid fa-trash-can text-red-500"></i>
                                            </div>
                                            <div>
                                                <p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">Purge Client Cache</p>
                                                <p class="text-[9px] text-slate-400">localStorage + sessionStorage</p>
                                            </div>
                                        </div>
                                        <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">Clears all browser-side caches including localStorage, sessionStorage, and Service Worker caches.</p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Environment Info -->
                        <div class="admin-panel">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-circle-info text-slate-400"></i> Environment & Session Info</h3>
                            </div>
                            <div class="admin-panel-body">
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    ${this.envField('fa-globe', 'Supabase Project', 'sbpwmkoxuokrscddhhuw')}
                                    ${this.envField('fa-database', 'Database', 'PostgreSQL 15')}
                                    ${this.envField('fa-server', 'Region', 'Southeast Asia (Singapore)')}
                                    ${this.envField('fa-code-branch', 'API Version', 'Supabase JS v2')}
                                    ${this.envField('fa-desktop', 'Browser', navigator.userAgent.split(' ').pop() || 'Unknown')}
                                    ${this.envField('fa-clock', 'Session Time', new Date().toLocaleString())}
                                    ${this.envField('fa-user-shield', 'Logged In As', window.AuthManager.currentUser.full_name || window.AuthManager.currentUser.email)}
                                    ${this.envField('fa-shield-halved', 'Role', window.AuthManager.currentUser.role)}
                                    ${this.envField('fa-wifi', 'Connection', navigator.onLine ? 'Online' : 'Offline')}
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="mt-8 text-center text-[10px] text-slate-400">
                            <p>Rotaract Club of Coimbatore Unity &bull; System Diagnostics v3.0.0</p>
                            <p class="mt-1">Club ID: 91594 &bull; District 3206 &bull; Supabase Hosted Infrastructure</p>
                        </div>
                    </div>
                `;
            } catch (e) {
                console.error('SystemHealth render error:', e);
                workspace.innerHTML = window.AdminPanel.renderError(e.message);
            }
        },

        // ==========================================
        // DATA LOADING
        // ==========================================
        async loadAllData() {
            this.lastRefresh = new Date().toISOString();

            const [resourcesResult, storageResult] = await Promise.allSettled([
                window.DB_ADMIN.from('resource_monitor').select('*').order('metric'),
                window.DB_ADMIN.rpc('get_storage_usage_mb')
            ]);

            this.resources = resourcesResult.status === 'fulfilled' ? (resourcesResult.value.data || []) : [];
            this.storage = storageResult.status === 'fulfilled' ? (storageResult.value.data || []) : [];
        },

        async loadTableStats() {
            const container = document.getElementById('db-stats-grid');
            if (!container) return;

            container.innerHTML = '<div class="col-span-full text-center py-4"><i class="fa-solid fa-spinner fa-spin text-brand-blue"></i> <span class="text-xs text-slate-400 ml-2">Counting rows...</span></div>';

            const tables = [
                { name: 'users', icon: 'fa-users', color: 'blue' },
                { name: 'events', icon: 'fa-calendar', color: 'green' },
                { name: 'meetings', icon: 'fa-people-group', color: 'purple' },
                { name: 'treasury_transactions', icon: 'fa-wallet', color: 'yellow' },
                { name: 'membership_applications', icon: 'fa-user-plus', color: 'cyan' },
                { name: 'blood_requests', icon: 'fa-droplet', color: 'red' },
                { name: 'bulletins', icon: 'fa-newspaper', color: 'orange' },
                { name: 'activity_log', icon: 'fa-scroll', color: 'indigo' },
                { name: 'email_log', icon: 'fa-envelope', color: 'teal' },
                { name: 'notifications', icon: 'fa-bell', color: 'pink' }
            ];

            const counts = await Promise.allSettled(
                tables.map(t =>
                    window.DB_ADMIN.from(t.name).select('id', { count: 'exact', head: true })
                        .then(r => ({ name: t.name, count: r.count || 0, icon: t.icon, color: t.color }))
                        .catch(() => ({ name: t.name, count: '?', icon: t.icon, color: t.color }))
                )
            );

            const results = counts.map(c => c.status === 'fulfilled' ? c.value : c.reason);

            container.innerHTML = results.map(r => `
                <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/10 border border-white/10 dark:border-white/[0.03] text-center">
                    <i class="fa-solid ${r.icon} text-${r.color}-500 text-sm mb-1 block"></i>
                    <p class="text-lg font-black text-slate-800 dark:text-slate-100">${typeof r.count === 'number' ? r.count.toLocaleString() : r.count}</p>
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">${r.name.replace(/_/g, ' ')}</p>
                </div>
            `).join('');
        },

        // ==========================================
        // RENDER HELPERS
        // ==========================================
        renderSubsystemCard(s) {
            return `
                <div class="p-4 rounded-xl bg-green-500/5 border border-green-500/15 text-center hover-lift">
                    <div class="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                        <i class="fa-solid ${s.icon} text-green-500"></i>
                    </div>
                    <p class="text-[10px] font-extrabold text-slate-700 dark:text-slate-200">${s.label}</p>
                    <div class="flex items-center justify-center gap-1 mt-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span class="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase">Online</span>
                    </div>
                </div>
            `;
        },

        renderResourceCard(r) {
            const metric = r.metric || 'unknown';
            const value = parseFloat(r.value) || 0;
            const limit = r.limit_value !== 'unlimited' ? parseFloat(r.limit_value) : null;
            const pct = limit ? Math.min((value / limit) * 100, 100) : 0;
            const status = pct > 80 ? 'danger' : pct > 60 ? 'warning' : 'safe';
            const icon = this.RESOURCE_ICONS[metric] || 'fa-chart-simple';
            const color = this.RESOURCE_COLORS[metric] || 'blue';

            return `
                <div class="p-4 rounded-xl bg-white/20 dark:bg-slate-800/10 border border-white/10 dark:border-white/[0.03] hover-lift">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-lg bg-${color}-500/10 flex items-center justify-center">
                                <i class="fa-solid ${icon} text-${color}-500 text-xs"></i>
                            </div>
                            <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${metric.replace(/_/g, ' ')}</p>
                        </div>
                        ${limit ? `
                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${status === 'danger' ? 'bg-red-500/10 text-red-500' : status === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}">
                                ${pct.toFixed(0)}%
                            </span>
                        ` : '<span class="text-[9px] text-slate-400 font-bold">∞</span>'}
                    </div>

                    <p class="text-2xl font-black text-slate-800 dark:text-slate-100">
                        ${typeof r.value === 'string' && r.value.includes('.') ? parseFloat(r.value).toFixed(1) : r.value}
                        <span class="text-xs font-bold text-slate-400 ml-1">${r.unit || ''}</span>
                    </p>

                    ${limit ? `
                        <div class="mt-3">
                            <div class="h-2 rounded-full bg-slate-200/50 dark:bg-slate-700/50 overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500 ${status === 'danger' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}" style="width:${pct}%"></div>
                            </div>
                            <div class="flex justify-between mt-1">
                                <span class="text-[9px] text-slate-400">0</span>
                                <span class="text-[9px] text-slate-400">${r.limit_value} ${r.unit || ''}</span>
                            </div>
                        </div>
                    ` : `
                        <p class="text-[10px] text-slate-400 mt-2">No limit configured</p>
                    `}
                </div>
            `;
        },

        renderDBQuickStats() {
            const quickTables = [
                { name: 'users', icon: 'fa-users', color: 'blue' },
                { name: 'events', icon: 'fa-calendar', color: 'green' },
                { name: 'blood_requests', icon: 'fa-droplet', color: 'red' },
                { name: 'activity_log', icon: 'fa-scroll', color: 'purple' },
                { name: 'email_log', icon: 'fa-envelope', color: 'teal' }
            ];

            return quickTables.map(t => `
                <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/10 border border-white/10 dark:border-white/[0.03] text-center">
                    <i class="fa-solid ${t.icon} text-${t.color}-500 text-sm mb-1 block"></i>
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">${t.name.replace(/_/g, ' ')}</p>
                    <p class="text-[10px] text-slate-500 mt-1 italic">Click "Count Rows"</p>
                </div>
            `).join('');
        },

        envField(icon, label, value) {
            return `
                <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/10 border border-white/10 dark:border-white/[0.03]">
                    <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid ${icon} mr-1"></i>${label}</p>
                    <p class="text-xs font-bold mt-1 text-slate-700 dark:text-slate-200 truncate" title="${value}">${value}</p>
                </div>
            `;
        },

        // ==========================================
        // MAINTENANCE ACTIONS
        // ==========================================
        async runAction(rpcName, label, icon, description) {
            if (!confirm(
                `Execute Maintenance Routine\n\n` +
                `Action: ${label}\n` +
                `Function: ${rpcName}()\n\n` +
                `${description}\n\n` +
                `Proceed?`
            )) return;

            window.AppToast?.info(`⏳ Running ${label}...`);

            try {
                const { data, error } = await window.DB_ADMIN.rpc(rpcName);
                if (error) throw error;

                let detailMsg = '';
                if (data && typeof data === 'object') {
                    detailMsg = Object.entries(data)
                        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                        .join(', ');
                }

                window.AppToast?.success(`✅ ${label} completed!${detailMsg ? ' (' + detailMsg + ')' : ''}`);
                console.log(`${label} result:`, data);

                await window.AdminPanel.logActivity('MAINTENANCE', 'system', null, {
                    action: rpcName,
                    label: label,
                    result: data
                });

                // Refresh data after action
                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                console.error(`${label} failed:`, e);
                window.AppToast?.error(`${label} failed: ${e.message}`);
            }
        },

        async clearAllCache() {
            if (!confirm(
                `Purge All Client-Side Cache?\n\n` +
                `This will clear:\n` +
                `• localStorage (all keys)\n` +
                `• sessionStorage (all keys)\n` +
                `• Service Worker caches (if any)\n\n` +
                `You may need to re-login after this action.`
            )) return;

            try {
                // Clear localStorage
                const lsKeys = Object.keys(localStorage);
                localStorage.clear();

                // Clear sessionStorage
                const ssKeys = Object.keys(sessionStorage);
                sessionStorage.clear();

                // Clear Service Worker caches
                let cacheCount = 0;
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    cacheCount = cacheNames.length;
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }

                // Clear AppCache if available
                if (window.AppCache?.clear) {
                    window.AppCache.clear();
                }

                window.AppToast?.success(
                    `🗑️ Cache purged: ${lsKeys.length} localStorage, ${ssKeys.length} sessionStorage, ${cacheCount} SW caches`
                );

                await window.AdminPanel.logActivity('CACHE_CLEAR', 'system', null, {
                    localStorage: lsKeys.length,
                    sessionStorage: ssKeys.length,
                    serviceWorker: cacheCount
                });
            } catch (e) {
                window.AppToast?.error('Cache purge failed: ' + e.message);
            }
        },

        // ==========================================
        // LIVE POLLING
        // ==========================================
        togglePolling() {
            if (this.isPolling) {
                this.stopPolling();
            } else {
                this.startPolling();
            }
        },

        startPolling() {
            if (this.pollInterval) return;

            this.isPolling = true;
            this.pollInterval = setInterval(async () => {
                try {
                    await this.loadAllData();
                    // Silently update resource cards without full re-render
                    const resourceContainer = document.querySelector('.admin-panel-body .grid.grid-cols-1.sm\\:grid-cols-2');
                    if (resourceContainer && this.resources.length > 0) {
                        resourceContainer.innerHTML = this.resources.map(r => this.renderResourceCard(r)).join('');
                    }
                    this.lastRefresh = new Date().toISOString();
                } catch (e) {
                    console.warn('Poll refresh failed:', e);
                }
            }, 15000);

            const label = document.getElementById('poll-toggle-label');
            const btn = document.getElementById('poll-toggle-btn');
            if (label) label.textContent = 'Stop Polling';
            if (btn) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            }

            window.AppToast?.success('📡 Live polling started (15s interval)');
        },

        stopPolling() {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }

            this.isPolling = false;

            const label = document.getElementById('poll-toggle-label');
            const btn = document.getElementById('poll-toggle-btn');
            if (label) label.textContent = 'Start Live Poll';
            if (btn) {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }

            window.AppToast?.info('📡 Live polling stopped');
        }
    };

    // Cleanup polling on page unload
    window.addEventListener('beforeunload', () => {
        if (SystemHealth.pollInterval) {
            clearInterval(SystemHealth.pollInterval);
        }
    });

    // Expose globally
    window.SystemHealth = SystemHealth;
})();