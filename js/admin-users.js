// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// ADMIN USER PROVISIONING MODULE
// File: js/admin-users.js | Version: 3.0.0
// Access: Super Admin Only
// Features: Full CRUD | Password Management
// Role Assignment | Audit Trail | Security
// ============================================

(function () {
    'use strict';

    const AdminUsers = {
        // ==========================================
        // STATE
        // ==========================================
        allUsers: [],
        filtered: [],
        searchQuery: '',
        roleFilter: '',
        statusFilter: 'all',
        stats: { total: 0, active: 0, inactive: 0, superAdmins: 0 },

        // ==========================================
        // ROLE CONFIGURATION
        // ==========================================
        ROLES: [
            { value: 'super_admin', label: 'Super Admin', icon: 'fa-crown', color: 'red', description: 'Full system access, user management, settings' },
            { value: 'advisor', label: 'Advisor', icon: 'fa-user-tie', color: 'purple', description: 'Advisory access, reports, settings oversight' },
            { value: 'president', label: 'President', icon: 'fa-star', color: 'blue', description: 'Executive leadership, approvals, all modules' },
            { value: 'ipp', label: 'Immediate Past President', icon: 'fa-medal', color: 'indigo', description: 'Advisory executive, historical oversight' },
            { value: 'vice_president', label: 'Vice President', icon: 'fa-star-half-stroke', color: 'blue', description: 'Deputy executive, project oversight' },
            { value: 'secretary', label: 'Secretary', icon: 'fa-pen-fancy', color: 'green', description: 'Records, meetings, communications' },
            { value: 'secretary_admin', label: 'Admin Secretary', icon: 'fa-file-signature', color: 'teal', description: 'Administrative records, reports' },
            { value: 'secretary_comm', label: 'Communication Secretary', icon: 'fa-tower-broadcast', color: 'cyan', description: 'Email, bulletins, public relations' },
            { value: 'treasurer', label: 'Treasurer', icon: 'fa-wallet', color: 'yellow', description: 'Financial records, treasury management' },
            { value: 'avenue_director', label: 'Avenue Director', icon: 'fa-compass', color: 'orange', description: 'Avenue-level project management' },
            { value: 'avenue_chair', label: 'Avenue Chair', icon: 'fa-chair', color: 'amber', description: 'Avenue project coordination' },
            { value: 'dpp_chair', label: 'DPP Chair', icon: 'fa-star-of-life', color: 'rose', description: 'District Priority Project oversight' }
        ],

        ROLE_GROUPS: {
            'Executive Council': ['super_admin', 'advisor', 'president', 'ipp', 'vice_president'],
            'Secretariat': ['secretary', 'secretary_admin', 'secretary_comm'],
            'Finance': ['treasurer'],
            'Avenue Leadership': ['avenue_director', 'avenue_chair', 'dpp_chair']
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
                await this.loadData();
                this.computeStats();
                this.applyFilters();

                workspace.innerHTML = `
                    <div class="p-6 lg:p-10">
                        <!-- Header -->
                        <div class="admin-page-header">
                            <div>
                                <div class="admin-breadcrumb">
                                    <i class="fa-solid fa-house text-brand-blue"></i>
                                    <span>/</span>
                                    <span>Admin User Management</span>
                                </div>
                                <h1 class="admin-page-title">
                                    <i class="fa-solid fa-user-shield text-red-500 mr-2"></i>Credential Registry
                                </h1>
                                <p class="admin-page-subtitle">Provision, modify, and manage administrative portal accounts across the Unity executive hierarchy.</p>
                            </div>
                            <button class="btn-primary" onclick="AdminUsers.openForm()">
                                <i class="fa-solid fa-user-plus mr-1.5"></i> Provision New Admin
                            </button>
                        </div>

                        <!-- Security Banner -->
                        <div class="admin-panel mb-6" style="border-top: 3px solid #dc2626 !important; background: rgba(239, 68, 68, 0.02) !important;">
                            <div class="admin-panel-body">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                        <i class="fa-solid fa-shield-halved text-red-500 text-xl animate-pulse"></i>
                                    </div>
                                    <div class="flex-1">
                                        <p class="text-xs font-black text-red-600 dark:text-red-400 tracking-wide uppercase">Super Admin Restricted Zone</p>
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            Modifications in this registry directly control authentication, role-based permissions, and portal access for all administrative users.
                                            All changes are logged in the <a href="#" onclick="AdminPanel.navigateTo('activity'); return false;" class="text-brand-blue font-bold hover:underline">Activity Log</a>.
                                        </p>
                                    </div>
                                    <div class="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/15">
                                        <i class="fa-solid fa-fingerprint text-red-500"></i>
                                        <span class="text-[10px] font-bold text-red-600 dark:text-red-400">VERIFIED SESSION</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Stats -->
                        <div class="admin-stats-grid stagger-list">
                            ${window.AdminPanel.statCard('blue', 'fa-users-gear', this.stats.total, 'Total Admins')}
                            ${window.AdminPanel.statCard('green', 'fa-user-check', this.stats.active, 'Active')}
                            ${window.AdminPanel.statCard('gray', 'fa-user-slash', this.stats.inactive, 'Inactive')}
                            ${window.AdminPanel.statCard('red', 'fa-crown', this.stats.superAdmins, 'Super Admins')}
                        </div>

                        <!-- Filters Toolbar -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-body py-4">
                                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <!-- Search -->
                                    <div class="relative min-w-[260px] flex-1 max-w-md">
                                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                                        <input type="text" id="user-search" class="admin-form-input pl-8 py-2.5 text-xs"
                                            placeholder="Search name, email, role, portfolio..."
                                            value="${window.AdminPanel.esc(this.searchQuery)}"
                                            oninput="AdminUsers.onSearch(this.value)">
                                        ${this.searchQuery ? `
                                            <button class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500" onclick="AdminUsers.clearSearch()">
                                                <i class="fa-solid fa-xmark text-xs"></i>
                                            </button>
                                        ` : ''}
                                    </div>

                                    <!-- Filters -->
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <select id="user-role-filter" class="admin-form-input admin-form-select py-2 text-xs w-auto"
                                            onchange="AdminUsers.onRoleFilter(this.value)">
                                            <option value="">All Roles</option>
                                            ${Object.entries(this.ROLE_GROUPS).map(([group, roles]) => `
                                                <optgroup label="${group}">
                                                    ${roles.map(r => {
                                                        const config = this.ROLES.find(x => x.value === r);
                                                        return `<option value="${r}" ${this.roleFilter === r ? 'selected' : ''}>${config?.label || r}</option>`;
                                                    }).join('')}
                                                </optgroup>
                                            `).join('')}
                                        </select>

                                        <select id="user-status-filter" class="admin-form-input admin-form-select py-2 text-xs w-auto"
                                            onchange="AdminUsers.onStatusFilter(this.value)">
                                            <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Status</option>
                                            <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Active</option>
                                            <option value="inactive" ${this.statusFilter === 'inactive' ? 'selected' : ''}>Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Results Count -->
                        <div class="flex items-center justify-between mb-4 px-1">
                            <p class="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Showing <span class="text-brand-blue">${this.filtered.length}</span> of ${this.allUsers.length} admin accounts
                            </p>
                        </div>

                        <!-- Users Table -->
                        <div class="admin-panel">
                            <div class="admin-panel-body p-0">
                                <div class="overflow-x-auto">
                                    <table class="admin-data-table">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Portfolio</th>
                                                <th>Status</th>
                                                <th>Board</th>
                                                <th>Last Login</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${this.renderRows()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Role Reference -->
                        <div class="admin-panel mt-6">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-circle-info"></i> Role Hierarchy Reference</h3>
                            </div>
                            <div class="admin-panel-body">
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    ${this.ROLES.map(r => `
                                        <div class="flex items-center gap-3 p-3 rounded-xl bg-white/20 dark:bg-slate-800/10 border border-white/10 dark:border-white/[0.03]">
                                            <div class="w-8 h-8 rounded-lg bg-${r.color}-500/10 flex items-center justify-center flex-shrink-0">
                                                <i class="fa-solid ${r.icon} text-${r.color}-500 text-xs"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-[11px] font-bold text-slate-800 dark:text-slate-100">${r.label}</p>
                                                <p class="text-[9px] text-slate-400 truncate">${r.description}</p>
                                            </div>
                                            <span class="text-[9px] font-mono text-slate-400">${this.allUsers.filter(u => u.role === r.value).length}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (e) {
                console.error('AdminUsers render error:', e);
                workspace.innerHTML = window.AdminPanel.renderError(e.message);
            }
        },

        // ==========================================
        // DATA LOADING
        // ==========================================
        async loadData() {
            const roleValues = this.ROLES.map(r => r.value);

            const { data, error } = await window.DB_ADMIN
                .from('users')
                .select('*')
                .in('role', roleValues)
                .order('role', { ascending: true });

            if (error) throw error;
            this.allUsers = data || [];
        },

        computeStats() {
            this.stats = {
                total: this.allUsers.length,
                active: this.allUsers.filter(u => u.is_active).length,
                inactive: this.allUsers.filter(u => !u.is_active).length,
                superAdmins: this.allUsers.filter(u => u.role === 'super_admin').length
            };
        },

        // ==========================================
        // FILTERING
        // ==========================================
        applyFilters() {
            let result = [...this.allUsers];

            // Search
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                result = result.filter(u =>
                    (u.full_name || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q) ||
                    (u.role || '').toLowerCase().includes(q) ||
                    (u.portfolio || '').toLowerCase().includes(q) ||
                    (u.phone || '').includes(q)
                );
            }

            // Role filter
            if (this.roleFilter) {
                result = result.filter(u => u.role === this.roleFilter);
            }

            // Status filter
            if (this.statusFilter === 'active') {
                result = result.filter(u => u.is_active);
            } else if (this.statusFilter === 'inactive') {
                result = result.filter(u => !u.is_active);
            }

            // Sort: super_admin first, then by role, then by name
            const roleOrder = {};
            this.ROLES.forEach((r, i) => { roleOrder[r.value] = i; });

            result.sort((a, b) => {
                const roleA = roleOrder[a.role] ?? 99;
                const roleB = roleOrder[b.role] ?? 99;
                if (roleA !== roleB) return roleA - roleB;
                return (a.full_name || '').localeCompare(b.full_name || '');
            });

            this.filtered = result;
        },

        onSearch(query) {
            this.searchQuery = query;
            this.applyFilters();
            this.updateTable();
        },

        clearSearch() {
            this.searchQuery = '';
            const input = document.getElementById('user-search');
            if (input) input.value = '';
            this.applyFilters();
            this.updateTable();
        },

        onRoleFilter(value) {
            this.roleFilter = value;
            this.applyFilters();
            this.updateTable();
        },

        onStatusFilter(value) {
            this.statusFilter = value;
            this.applyFilters();
            this.updateTable();
        },

        updateTable() {
            const tbody = document.querySelector('.admin-data-table tbody');
            if (tbody) tbody.innerHTML = this.renderRows();
        },

        // ==========================================
        // TABLE RENDERING
        // ==========================================
        renderRows() {
            if (!this.filtered.length) {
                return `
                    <tr>
                        <td colspan="8" class="text-center py-16 text-slate-400">
                            <i class="fa-solid fa-user-slash text-3xl mb-3 block opacity-30"></i>
                            <p class="text-xs font-bold">No admin users match your criteria</p>
                        </td>
                    </tr>
                `;
            }

            const currentUser = window.AuthManager.currentUser;

            return this.filtered.map(u => {
                const roleConfig = this.ROLES.find(r => r.value === u.role) || { icon: 'fa-user', color: 'gray', label: u.role };
                const isSelf = u.id === currentUser.id;
                const isSuperAdmin = u.role === 'super_admin';
                const daysSinceLogin = u.last_login_at
                    ? Math.floor((Date.now() - new Date(u.last_login_at).getTime()) / 86400000)
                    : null;
                const isStale = daysSinceLogin !== null && daysSinceLogin > 30;

                return `
                    <tr class="${!u.is_active ? 'opacity-50' : ''} ${isSelf ? 'bg-brand-blue/3' : ''}">
                        <!-- User -->
                        <td>
                            <div class="flex items-center gap-3">
                                <div class="relative flex-shrink-0">
                                    ${u.photo_url
                                        ? `<img src="${u.photo_url}" class="w-9 h-9 rounded-xl object-cover border border-white/20 dark:border-white/5">`
                                        : `<div class="w-9 h-9 rounded-xl bg-gradient-to-br from-${roleConfig.color}-500/20 to-${roleConfig.color}-600/10 flex items-center justify-center border border-${roleConfig.color}-500/20">
                                            <span class="text-sm font-black text-${roleConfig.color}-600 dark:text-${roleConfig.color}-400">${(u.full_name || '?').charAt(0).toUpperCase()}</span>
                                        </div>`
                                    }
                                    ${isSelf ? `<span class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-brand-blue border-2 border-white dark:border-slate-900" title="You"></span>` : ''}
                                </div>
                                <div class="min-w-0">
                                    <p class="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                                        ${window.AdminPanel.esc(u.full_name)}
                                        ${isSelf ? '<span class="text-[9px] text-brand-blue font-normal ml-1">(You)</span>' : ''}
                                    </p>
                                    ${u.phone ? `<p class="text-[10px] text-slate-400 truncate">${u.phone}</p>` : ''}
                                </div>
                            </div>
                        </td>

                        <!-- Email -->
                        <td>
                            <p class="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[180px]" title="${window.AdminPanel.esc(u.email)}">${window.AdminPanel.esc(u.email)}</p>
                        </td>

                        <!-- Role -->
                        <td>
                            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-${roleConfig.color}-500/10 text-${roleConfig.color}-600 dark:text-${roleConfig.color}-400 text-[10px] font-bold">
                                <i class="fa-solid ${roleConfig.icon} text-[8px]"></i>
                                ${roleConfig.label}
                            </span>
                        </td>

                        <!-- Portfolio -->
                        <td>
                            <p class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                ${u.portfolio ? window.AdminPanel.esc(u.portfolio) : '<span class="text-slate-400 font-normal">Unassigned</span>'}
                            </p>
                        </td>

                        <!-- Status -->
                        <td>
                            <span class="status-badge ${u.is_active ? 'active' : 'inactive'}">
                                ${u.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </td>

                        <!-- Board -->
                        <td>
                            ${(u.is_board_member && !isSuperAdmin)
                                ? '<i class="fa-solid fa-circle-check text-green-500 text-xs"></i>'
                                : '<i class="fa-solid fa-circle-xmark text-slate-300 dark:text-slate-600 text-xs"></i>'
                            }
                        </td>

                        <!-- Last Login -->
                        <td>
                            ${u.last_login_at
                                ? `<div>
                                    <p class="text-[11px] text-slate-600 dark:text-slate-300">${window.AdminPanel.ago(u.last_login_at)}</p>
                                    ${isStale ? `<p class="text-[9px] text-yellow-500 font-bold mt-0.5"><i class="fa-solid fa-clock mr-0.5"></i>${daysSinceLogin}d ago</p>` : ''}
                                </div>`
                                : '<span class="text-[10px] text-slate-400 italic">Never</span>'
                            }
                        </td>

                        <!-- Actions -->
                        <td>
                            <div class="flex gap-1 flex-wrap">
                                <button class="btn-secondary btn-xs" onclick="AdminUsers.openForm('${u.id}')" title="Edit Profile" data-tooltip="Edit">
                                    <i class="fa-solid fa-pen text-[9px]"></i>
                                </button>
                                <button class="btn-secondary btn-xs" onclick="AdminUsers.viewDetail('${u.id}')" title="View Details">
                                    <i class="fa-solid fa-eye text-[9px]"></i>
                                </button>
                                <button class="btn-secondary btn-xs" onclick="AdminUsers.resetPassword('${u.id}')" title="Reset Password">
                                    <i class="fa-solid fa-key text-[9px]"></i>
                                </button>
                                ${!isSelf ? `
                                    <button class="btn-secondary btn-xs" onclick="AdminUsers.toggleActive('${u.id}', ${!u.is_active})" 
                                        title="${u.is_active ? 'Deactivate' : 'Activate'}">
                                        <i class="fa-solid ${u.is_active ? 'fa-user-slash text-yellow-500' : 'fa-user-check text-green-500'} text-[9px]"></i>
                                    </button>
                                    ${!isSuperAdmin ? `
                                        <button class="btn-danger btn-xs" onclick="AdminUsers.deleteUser('${u.id}')" title="Delete Permanently">
                                            <i class="fa-solid fa-trash-can text-[9px]"></i>
                                        </button>
                                    ` : ''}
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        // ==========================================
        // DETAIL MODAL
        // ==========================================
        async viewDetail(id) {
            const u = this.allUsers.find(x => x.id === id);
            if (!u) return;

            const roleConfig = this.ROLES.find(r => r.value === u.role) || { icon: 'fa-user', color: 'gray', label: u.role };

            let auditTrail = [];
            try {
                const { data } = await window.DB_ADMIN
                    .from('activity_log')
                    .select('*')
                    .or(`entity_id.eq.${id},user_id.eq.${id}`)
                    .order('created_at', { ascending: false })
                    .limit(15);
                auditTrail = data || [];
            } catch (e) {}

            window.AdminPanel.createModal({
                title: 'Admin Profile Detail',
                size: 'medium',
                icon: 'user-shield',
                body: `
                    <div class="space-y-5">
                        <!-- Profile Header -->
                        <div class="flex items-center gap-5 p-5 rounded-2xl bg-gradient-to-r from-${roleConfig.color}-500/5 to-${roleConfig.color}-600/5 border border-${roleConfig.color}-500/10">
                            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-${roleConfig.color}-500 to-${roleConfig.color}-600 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
                                ${u.photo_url
                                    ? `<img src="${u.photo_url}" class="w-20 h-20 object-cover">`
                                    : `<span class="text-3xl font-black text-white">${(u.full_name || '?').charAt(0).toUpperCase()}</span>`
                                }
                            </div>
                            <div class="flex-1">
                                <h3 class="text-xl font-black text-slate-800 dark:text-slate-100">${window.AdminPanel.esc(u.full_name)}</h3>
                                <p class="text-xs text-slate-500 mt-1">${window.AdminPanel.esc(u.email)}</p>
                                <div class="flex gap-2 mt-2 flex-wrap">
                                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-${roleConfig.color}-500/10 text-${roleConfig.color}-600 text-[10px] font-bold">
                                        <i class="fa-solid ${roleConfig.icon} text-[8px]"></i> ${roleConfig.label}
                                    </span>
                                    <span class="status-badge ${u.is_active ? 'active' : 'inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span>
                                    ${u.role === 'super_admin' ? '<span class="badge badge-purple">System account - not a club member</span>' : (u.is_board_member ? '<span class="badge badge-blue">Board</span>' : '')}
                                </div>
                            </div>
                        </div>

                        <!-- Info Grid -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-phone mr-1"></i>Phone</p>
                                <p class="text-xs font-bold mt-1">${u.phone || 'Not provided'}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-briefcase mr-1"></i>Portfolio</p>
                                <p class="text-xs font-bold mt-1">${u.portfolio || 'Unassigned'}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-calendar mr-1"></i>Created</p>
                                <p class="text-xs font-bold mt-1">${window.AdminPanel.fmtDate(u.created_at)}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-clock mr-1"></i>Last Login</p>
                                <p class="text-xs font-bold mt-1">${u.last_login_at ? window.AdminPanel.ago(u.last_login_at) : 'Never'}</p>
                            </div>
                        </div>

                        <!-- User ID -->
                        <div class="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-white/[0.03]">
                            <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-fingerprint mr-1"></i>User UUID</p>
                            <p class="text-[10px] font-mono mt-1 text-slate-500 break-all">${u.id}</p>
                        </div>

                        <!-- Audit Trail -->
                        ${auditTrail.length > 0 ? `
                            <div class="admin-panel">
                                <div class="admin-panel-header">
                                    <h3 class="admin-panel-title"><i class="fa-solid fa-clock-rotate-left"></i> Recent Activity</h3>
                                    <span class="badge badge-blue">${auditTrail.length} events</span>
                                </div>
                                <div class="admin-panel-body p-0" style="max-height:250px;overflow-y:auto;">
                                    <div class="divide-y divide-slate-200/30 dark:divide-white/[0.03]">
                                        ${auditTrail.map(log => {
                                            const ac = AdminUsers.ACTION_CONFIG?.[log.action] || { icon: 'fa-circle-dot', color: 'gray' };
                                            return `
                                                <div class="flex items-center gap-3 p-3 px-4">
                                                    <div class="w-7 h-7 rounded-lg bg-${ac.color || 'blue'}-500/10 flex items-center justify-center flex-shrink-0">
                                                        <i class="fa-solid ${ac.icon || 'fa-circle-dot'} text-${ac.color || 'blue'}-500 text-[9px]"></i>
                                                    </div>
                                                    <div class="flex-1 min-w-0">
                                                        <p class="text-[11px] font-bold truncate">
                                                            ${window.AdminPanel.esc(log.user_name || 'System')}
                                                            <span class="font-normal text-slate-400">— ${log.action}</span>
                                                        </p>
                                                    </div>
                                                    <span class="text-[10px] text-slate-400 flex-shrink-0">${window.AdminPanel.ago(log.created_at)}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `,
                footer: `
                    <button class="btn-secondary" onclick="AdminPanel.closeModal()">Close</button>
                    <button class="btn-primary" onclick="AdminUsers.openForm('${u.id}'); AdminPanel.closeModal();">
                        <i class="fa-solid fa-pen mr-1"></i> Edit Profile
                    </button>
                `
            });
        },

        // ==========================================
        // CREATE / EDIT FORM
        // ==========================================
        async openForm(id) {
            let existing = null;
            if (id) {
                existing = this.allUsers.find(u => u.id === id);
                if (!existing) {
                    const { data } = await window.DB_ADMIN.from('users').select('*').eq('id', id).single();
                    existing = data;
                }
            }

            const isEdit = !!existing;
            const isSelf = existing?.id === window.AuthManager.currentUser.id;

            window.AdminPanel.createModal({
                title: isEdit ? 'Modify Admin Identity' : 'Provision New Admin Account',
                size: 'medium',
                icon: isEdit ? 'user-pen' : 'user-plus',
                body: `
                    <form id="admin-user-form" onsubmit="return false;" class="space-y-5">
                        ${!isEdit ? `
                            <div class="p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/15">
                                <p class="text-xs text-brand-blue font-bold leading-relaxed">
                                    <i class="fa-solid fa-circle-info mr-1"></i>
                                    A new admin account will be created with the specified role. The user will use the provided password for their first login.
                                </p>
                            </div>
                        ` : ''}

                        <div class="admin-form-grid">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Full Name <span class="required">*</span></label>
                                <input type="text" name="full_name" required class="admin-form-input"
                                    value="${window.AdminPanel.esc(existing?.full_name || '')}"
                                    placeholder="e.g. John Doe">
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label">Email Address <span class="required">*</span></label>
                                <input type="email" name="email" required class="admin-form-input"
                                    value="${existing?.email || ''}"
                                    ${isEdit ? 'readonly style="opacity:0.7;cursor:not-allowed;"' : ''}
                                    placeholder="admin@unity.org">
                                ${isEdit ? '<span class="admin-form-hint">Email cannot be changed after creation</span>' : ''}
                            </div>
                        </div>

                        <!-- Role Selection -->
                        <div class="admin-form-group">
                            <label class="admin-form-label">Executive Role <span class="required">*</span></label>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                ${Object.entries(this.ROLE_GROUPS).map(([group, roles]) => `
                                    <div class="col-span-full mt-2 first:mt-0">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">${group}</p>
                                        <div class="grid grid-cols-1 sm:grid-cols-${roles.length <= 3 ? roles.length : 3} gap-2">
                                            ${roles.map(r => {
                                                const config = this.ROLES.find(x => x.value === r);
                                                const isSelected = existing?.role === r;
                                                const isDisabled = isSelf && r !== existing?.role;
                                                return `
                                                    <label class="flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all
                                                        ${isSelected ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue/30'}
                                                        ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}"
                                                        data-role-label="${config?.label}">
                                                        <input type="radio" name="role" value="${r}" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}
                                                            class="accent-brand-blue w-3.5 h-3.5" required>
                                                        <i class="fa-solid ${config?.icon} text-${config?.color}-500 text-xs"></i>
                                                        <span class="text-[10px] font-bold">${config?.label}</span>
                                                    </label>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="admin-form-grid">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Portfolio Designation</label>
                                <input type="text" name="portfolio" class="admin-form-input"
                                    value="${window.AdminPanel.esc(existing?.portfolio || '')}"
                                    placeholder="e.g. President 2026-27">
                                <span class="admin-form-hint">Year-specific title or designation</span>
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label">Phone Contact</label>
                                <input type="tel" name="phone" class="admin-form-input"
                                    value="${existing?.phone || ''}"
                                    placeholder="+91 XXXXX XXXXX">
                            </div>
                        </div>

                        ${!isEdit ? `
                            <div class="admin-form-group">
                                <label class="admin-form-label">Initial Password <span class="required">*</span></label>
                                <div class="relative">
                                    <input type="password" name="password" required minlength="6" class="admin-form-input pr-10"
                                        placeholder="Minimum 6 characters" id="new-admin-password">
                                    <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-blue"
                                        onclick="AdminUsers.togglePasswordVisibility()">
                                        <i class="fa-solid fa-eye-slash text-xs" id="password-toggle-icon"></i>
                                    </button>
                                </div>
                                <div class="flex items-center gap-2 mt-2">
                                    <button type="button" class="btn-secondary btn-xs" onclick="AdminUsers.generatePassword()">
                                        <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Auto-Generate
                                    </button>
                                    <span class="text-[10px] text-slate-400" id="password-strength"></span>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Toggles -->
                        <div class="flex gap-6 pt-4 border-t border-slate-200/30 dark:border-white/[0.06] flex-wrap">
                            <label class="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="is_board_member" class="w-4 h-4 accent-brand-blue"
                                    ${!existing || existing.is_board_member ? 'checked' : ''}>
                                <div>
                                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Board Seat</span>
                                    <p class="text-[10px] text-slate-400">Grant board-level access (not applicable to Super Admin)</p>
                                </div>
                            </label>
                            <label class="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="is_active" class="w-4 h-4 accent-green-500"
                                    ${!existing || existing.is_active ? 'checked' : ''}>
                                <div>
                                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Active Account</span>
                                    <p class="text-[10px] text-slate-400">Allow portal login</p>
                                </div>
                            </label>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="AdminPanel.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="AdminUsers.save('${id || ''}')" id="admin-user-save-btn">
                        <i class="fa-solid fa-floppy-disk mr-1.5"></i> ${isEdit ? 'Commit Changes' : 'Create Account'}
                    </button>
                `
            });

            // Bind password strength checker
            setTimeout(() => {
                const pwInput = document.getElementById('new-admin-password');
                if (pwInput) {
                    pwInput.addEventListener('input', () => this.checkPasswordStrength(pwInput.value));
                }
            }, 100);
        },

        // ==========================================
        // PASSWORD HELPERS
        // ==========================================
        togglePasswordVisibility() {
            const input = document.getElementById('new-admin-password');
            const icon = document.getElementById('password-toggle-icon');
            if (!input || !icon) return;

            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fa-solid fa-eye text-xs';
            } else {
                input.type = 'password';
                icon.className = 'fa-solid fa-eye-slash text-xs';
            }
        },

        generatePassword() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
            let pw = '';
            for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
            const input = document.getElementById('new-admin-password');
            if (input) {
                input.value = pw;
                input.type = 'text';
                const icon = document.getElementById('password-toggle-icon');
                if (icon) icon.className = 'fa-solid fa-eye text-xs';
                this.checkPasswordStrength(pw);
            }
        },

        checkPasswordStrength(pw) {
            const el = document.getElementById('password-strength');
            if (!el) return;

            if (!pw) { el.textContent = ''; return; }

            let score = 0;
            if (pw.length >= 6) score++;
            if (pw.length >= 10) score++;
            if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
            if (/\d/.test(pw)) score++;
            if (/[^a-zA-Z0-9]/.test(pw)) score++;

            const levels = [
                { label: 'Very Weak', color: 'text-red-500' },
                { label: 'Weak', color: 'text-red-400' },
                { label: 'Fair', color: 'text-yellow-500' },
                { label: 'Good', color: 'text-green-500' },
                { label: 'Strong', color: 'text-green-600' },
                { label: 'Excellent', color: 'text-green-700' }
            ];

            const level = levels[score];
            el.innerHTML = `<span class="${level.color} font-bold">${level.label}</span>`;
        },

        // ==========================================
        // SAVE (CREATE / UPDATE)
        // ==========================================
        async save(id) {
            const form = document.getElementById('admin-user-form');
            if (!form) return;
            const fd = new FormData(form);

            const fullName = fd.get('full_name')?.trim();
            const email = fd.get('email')?.trim();
            const role = fd.get('role');

            if (!fullName || !email || !role) {
                window.AppToast?.warning('Name, email, and role are required.');
                return;
            }

            const saveBtn = document.getElementById('admin-user-save-btn');
            const originalHTML = saveBtn?.innerHTML;
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Processing...';
            }

            try {
                if (id) {
                    // UPDATE
                    const updates = {
                        full_name: fullName,
                        role: role,
                        portfolio: fd.get('portfolio')?.trim() || null,
                        phone: fd.get('phone')?.trim() || null,
                        is_board_member: role === 'super_admin' ? false : fd.get('is_board_member') === 'on',
                        is_active: fd.get('is_active') === 'on',
                        updated_at: new Date().toISOString()
                    };

                    const { error } = await window.DB_ADMIN
                        .from('users')
                        .update(updates)
                        .eq('id', id);

                    if (error) throw error;

                    window.AppToast?.success(`✅ Admin profile for ${fullName} updated.`);
                    await window.AdminPanel.logActivity('UPDATE', 'admin_user', id, {
                        name: fullName,
                        role: role
                    });
                } else {
                    // CREATE
                    const password = fd.get('password');
                    if (!password || password.length < 6) {
                        window.AppToast?.warning('Password must be at least 6 characters.');
                        return;
                    }

                    const { data, error } = await window.DB_ADMIN.rpc('create_admin_user', {
                        p_email: email,
                        p_password: password,
                        p_name: fullName,
                        p_role: role,
                        p_portfolio: fd.get('portfolio')?.trim() || null,
                        p_avenue: null,
                        p_is_board: role === 'super_admin' ? false : fd.get('is_board_member') === 'on'
                    });

                    if (error) throw error;

                    // Update phone if provided
                    if (data && fd.get('phone')?.trim()) {
                        await window.DB_ADMIN
                            .from('users')
                            .update({ phone: fd.get('phone').trim() })
                            .eq('id', data);
                    }

                    window.AppToast?.success(`✅ Admin account created for ${fullName}!`);
                    await window.AdminPanel.logActivity('CREATE', 'admin_user', data, {
                        name: fullName,
                        role: role,
                        email: email
                    });
                }

                window.AdminPanel.closeModal();
                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                console.error('Save failed:', e);
                window.AppToast?.error('Operation failed: ' + e.message);
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalHTML;
                }
            }
        },

        // ==========================================
        // PASSWORD RESET
        // ==========================================
        async resetPassword(id) {
            const user = this.allUsers.find(u => u.id === id);
            if (!user) return;

            const newPw = prompt(
                `Reset password for "${user.full_name}" (${user.email})?\n\n` +
                `Enter new password (minimum 6 characters):`
            );

            if (!newPw) return;
            if (newPw.length < 6) {
                window.AppToast?.warning('Password must be at least 6 characters.');
                return;
            }

            if (!confirm(`Confirm password reset for ${user.full_name}?\n\nThey will need to use the new password on next login.`)) return;

            try {
                const { error } = await window.DB_ADMIN.rpc('reset_user_password', {
                    p_user_id: id,
                    p_new_password: newPw
                });

                if (error) throw error;

                window.AppToast?.success(`🔑 Password reset for ${user.full_name}.`);
                await window.AdminPanel.logActivity('RESET_PASSWORD', 'admin_user', id, {
                    name: user.full_name,
                    email: user.email
                });
            } catch (e) {
                window.AppToast?.error('Password reset failed: ' + e.message);
            }
        },

        // ==========================================
        // TOGGLE ACTIVE STATUS
        // ==========================================
        async toggleActive(id, newState) {
            const user = this.allUsers.find(u => u.id === id);
            if (!user) return;

            const action = newState ? 'activate' : 'deactivate';
            if (!confirm(`${newState ? 'Activate' : 'Deactivate'} account for "${user.full_name}"?\n\n${newState ? 'They will regain portal access.' : 'They will be locked out of the portal immediately.'}`)) return;

            try {
                await window.DB_ADMIN
                    .from('users')
                    .update({
                        is_active: newState,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                window.AppToast?.success(`Account ${action}d for ${user.full_name}.`);
                await window.AdminPanel.logActivity(newState ? 'ACTIVATE' : 'DEACTIVATE', 'admin_user', id, {
                    name: user.full_name,
                    new_status: newState ? 'active' : 'inactive'
                });

                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                window.AppToast?.error('Status toggle failed: ' + e.message);
            }
        },

        // ==========================================
        // DELETE USER
        // ==========================================
        async deleteUser(id) {
            const user = this.allUsers.find(u => u.id === id);
            if (!user) return;

            if (user.role === 'super_admin') {
                window.AppToast?.warning('Cannot delete a Super Admin account. Demote first.');
                return;
            }

            if (user.id === window.AuthManager.currentUser.id) {
                window.AppToast?.warning('Cannot delete your own account.');
                return;
            }

            const confirmText = prompt(
                `⚠️ PERMANENTLY DELETE admin account?\n\n` +
                `User: ${user.full_name}\n` +
                `Email: ${user.email}\n` +
                `Role: ${user.role}\n\n` +
                `Type "DELETE" to confirm:`
            );

            if (confirmText !== 'DELETE') {
                window.AppToast?.info('Deletion cancelled.');
                return;
            }

            try {
                const { error } = await window.DB_ADMIN
                    .from('users')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                window.AppToast?.success(`🗑️ Admin account for ${user.full_name} permanently purged.`);
                await window.AdminPanel.logActivity('DELETE', 'admin_user', id, {
                    name: user.full_name,
                    email: user.email,
                    role: user.role
                });

                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                window.AppToast?.error('Deletion failed: ' + e.message);
            }
        }
    };

    // Action config reference for audit trail display
    AdminUsers.ACTION_CONFIG = {
        CREATE: { icon: 'fa-plus-circle', color: 'green' },
        UPDATE: { icon: 'fa-pen-to-square', color: 'blue' },
        DELETE: { icon: 'fa-trash-can', color: 'red' },
        RESET_PASSWORD: { icon: 'fa-key', color: 'yellow' },
        ACTIVATE: { icon: 'fa-user-check', color: 'green' },
        DEACTIVATE: { icon: 'fa-user-slash', color: 'red' },
        LOGIN: { icon: 'fa-right-to-bracket', color: 'blue' },
        LOGOUT: { icon: 'fa-right-from-bracket', color: 'gray' },
        PORTAL_ACCESS: { icon: 'fa-door-open', color: 'purple' },
        PROVISION: { icon: 'fa-user-shield', color: 'red' }
    };

    // Expose globally
    window.AdminUsers = AdminUsers;
})();