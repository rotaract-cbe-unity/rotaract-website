// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// MEMBERSHIP APPLICATIONS MODULE
// File: js/applications.js | Version: 3.0.0
// Features: Full CRUD | Bulk Actions | Audit Trail
// Auto-Account Creation | Export | Real-time
// ============================================

(function () {
    'use strict';

    const Applications = {
        // ==========================================
        // STATE
        // ==========================================
        all: [],
        filtered: [],
        currentFilter: 'pending',
        searchQuery: '',
        sortBy: 'created_at',
        sortOrder: 'desc',
        selectedIds: new Set(),
        stats: { pending: 0, approved: 0, rejected: 0, under_review: 0, total: 0 },

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
                this.computeStats();
                this.applyFilters();

                workspace.innerHTML = `
                    <div class="p-6 lg:p-10">
                        <!-- Page Header -->
                        <div class="admin-page-header">
                            <div>
                                <div class="admin-breadcrumb">
                                    <i class="fa-solid fa-house text-brand-blue"></i>
                                    <span>/</span>
                                    <span>Membership Applications</span>
                                </div>
                                <h1 class="admin-page-title">Enrollment Applications</h1>
                                <p class="admin-page-subtitle">Review, verify, approve or reject membership enrollment requests submitted through the public portal.</p>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <button class="btn-secondary btn-sm" onclick="Applications.exportCSV()" title="Export Data">
                                    <i class="fa-solid fa-file-csv"></i> Export
                                </button>
                                <button class="btn-secondary btn-sm" onclick="Applications.render(AdminPanel.workspace)">
                                    <i class="fa-solid fa-rotate"></i> Refresh
                                </button>
                            </div>
                        </div>

                        <!-- Stats Grid -->
                        <div class="admin-stats-grid stagger-list">
                            ${window.AdminPanel.statCard('yellow', 'fa-hourglass-half', this.stats.pending, 'Pending Review')}
                            ${window.AdminPanel.statCard('green', 'fa-circle-check', this.stats.approved, 'Approved')}
                            ${window.AdminPanel.statCard('red', 'fa-circle-xmark', this.stats.rejected, 'Rejected')}
                            ${window.AdminPanel.statCard('blue', 'fa-layer-group', this.stats.total, 'Total Received')}
                        </div>

                        <!-- Toolbar -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-body py-4">
                                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <!-- Filter Tabs -->
                                    <div class="flex gap-2 flex-wrap">
                                        ${this.filterTab('pending', 'fa-hourglass-half', 'Pending')}
                                        ${this.filterTab('approved', 'fa-circle-check', 'Approved')}
                                        ${this.filterTab('rejected', 'fa-circle-xmark', 'Rejected')}
                                        ${this.filterTab('all', 'fa-list', 'All')}
                                    </div>

                                    <!-- Search & Sort -->
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <div class="relative min-w-[220px]">
                                            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                                            <input type="text" id="app-search" class="admin-form-input pl-8 py-2 text-xs"
                                                placeholder="Search name, email, phone..."
                                                value="${window.AdminPanel.esc(this.searchQuery)}"
                                                oninput="Applications.onSearch(this.value)">
                                        </div>
                                        <select id="app-sort" class="admin-form-input admin-form-select py-2 text-xs w-auto"
                                            onchange="Applications.onSort(this.value)">
                                            <option value="created_at_desc" ${this.sortBy === 'created_at' && this.sortOrder === 'desc' ? 'selected' : ''}>Newest First</option>
                                            <option value="created_at_asc" ${this.sortBy === 'created_at' && this.sortOrder === 'asc' ? 'selected' : ''}>Oldest First</option>
                                            <option value="full_name_asc" ${this.sortBy === 'full_name' ? 'selected' : ''}>Name A-Z</option>
                                            <option value="full_name_desc" ${this.sortBy === 'full_name' && this.sortOrder === 'desc' ? 'selected' : ''}>Name Z-A</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Bulk Actions Bar -->
                                <div id="bulk-actions-bar" class="hidden mt-4 p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/15 flex items-center justify-between gap-3 flex-wrap">
                                    <p class="text-xs font-bold text-brand-blue">
                                        <i class="fa-solid fa-check-double mr-1"></i>
                                        <span id="selected-count">0</span> application(s) selected
                                    </p>
                                    <div class="flex gap-2">
                                        <button class="btn-primary btn-xs" onclick="Applications.bulkApprove()">
                                            <i class="fa-solid fa-check"></i> Approve Selected
                                        </button>
                                        <button class="btn-danger btn-xs" onclick="Applications.bulkReject()">
                                            <i class="fa-solid fa-xmark"></i> Reject Selected
                                        </button>
                                        <button class="btn-secondary btn-xs" onclick="Applications.clearSelection()">
                                            <i class="fa-solid fa-xmark"></i> Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Results Count -->
                        <div class="flex items-center justify-between mb-4 px-1">
                            <p class="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Showing <span class="text-brand-blue">${this.filtered.length}</span> of ${this.all.length} applications
                            </p>
                            ${this.currentFilter === 'pending' && this.filtered.length > 0 ? `
                                <button class="btn-secondary btn-xs" onclick="Applications.selectAll()">
                                    <i class="fa-solid fa-check-double mr-1"></i> Select All
                                </button>
                            ` : ''}
                        </div>

                        <!-- Applications List -->
                        <div id="apps-list">
                            ${this.renderList()}
                        </div>
                    </div>
                `;

                this.bindEvents();
            } catch (e) {
                console.error('Applications render error:', e);
                workspace.innerHTML = window.AdminPanel.renderError(e.message);
            }
        },

        // ==========================================
        // DATA LOADING
        // ==========================================
        async loadData() {
            const { data, error } = await window.DB_ADMIN
                .from('membership_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.all = data || [];
        },

        computeStats() {
            this.stats = {
                pending: this.all.filter(a => a.status === 'pending').length,
                approved: this.all.filter(a => a.status === 'approved').length,
                rejected: this.all.filter(a => a.status === 'rejected').length,
                under_review: this.all.filter(a => a.status === 'under_review').length,
                total: this.all.length
            };
        },

        // ==========================================
        // FILTERING & SORTING
        // ==========================================
        applyFilters() {
            let result = [...this.all];

            // Status filter
            if (this.currentFilter !== 'all') {
                result = result.filter(a => a.status === this.currentFilter);
            }

            // Search filter
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                result = result.filter(a =>
                    (a.full_name || '').toLowerCase().includes(q) ||
                    (a.email || '').toLowerCase().includes(q) ||
                    (a.phone || '').toLowerCase().includes(q) ||
                    (a.profession || '').toLowerCase().includes(q) ||
                    (a.blood_group || '').toLowerCase().includes(q)
                );
            }

            // Sort
            result.sort((a, b) => {
                let valA = a[this.sortBy] || '';
                let valB = b[this.sortBy] || '';
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            this.filtered = result;
        },

        filterTab(filter, icon, label) {
            const count = filter === 'all' ? this.all.length : this.all.filter(a => a.status === filter).length;
            const isActive = this.currentFilter === filter;
            return `
                <button class="app-filter-btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm"
                    data-filter="${filter}" onclick="Applications.setFilter('${filter}')">
                    <i class="fa-solid ${icon} mr-1"></i> ${label}
                    <span class="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${isActive ? 'bg-white/20' : 'bg-slate-200/50 dark:bg-slate-700/50'}">${count}</span>
                </button>
            `;
        },

        setFilter(filter) {
            this.currentFilter = filter;
            this.selectedIds.clear();
            this.applyFilters();
            this.render(AdminPanel.workspace);
        },

        onSearch(query) {
            this.searchQuery = query;
            this.applyFilters();
            document.getElementById('apps-list').innerHTML = this.renderList();
            this.updateResultsCount();
        },

        onSort(value) {
            const [field, order] = value.split('_');
            this.sortBy = field === 'created' ? 'created_at' : field;
            this.sortOrder = order || 'desc';
            this.applyFilters();
            document.getElementById('apps-list').innerHTML = this.renderList();
        },

        updateResultsCount() {
            const countEl = document.querySelector('.text-brand-blue');
            if (countEl) countEl.textContent = this.filtered.length;
        },

        // ==========================================
        // SELECTION
        // ==========================================
        toggleSelect(id) {
            if (this.selectedIds.has(id)) {
                this.selectedIds.delete(id);
            } else {
                this.selectedIds.add(id);
            }
            this.updateSelectionUI();
        },

        selectAll() {
            this.filtered.forEach(a => {
                if (a.status === 'pending') this.selectedIds.add(a.id);
            });
            this.updateSelectionUI();
            this.renderListCheckboxes();
        },

        clearSelection() {
            this.selectedIds.clear();
            this.updateSelectionUI();
            this.renderListCheckboxes();
        },

        updateSelectionUI() {
            const bar = document.getElementById('bulk-actions-bar');
            const countEl = document.getElementById('selected-count');
            if (bar && countEl) {
                countEl.textContent = this.selectedIds.size;
                bar.classList.toggle('hidden', this.selectedIds.size === 0);
            }
        },

        renderListCheckboxes() {
            document.querySelectorAll('.app-checkbox').forEach(cb => {
                cb.checked = this.selectedIds.has(cb.value);
            });
        },

        // ==========================================
        // LIST RENDERING
        // ==========================================
        renderList() {
            if (!this.filtered?.length) {
                return `
                    <div class="admin-panel">
                        <div class="admin-panel-body">
                            <div class="empty-state py-16">
                                <i class="fa-solid fa-inbox empty-state-icon text-slate-300 dark:text-slate-600"></i>
                                <h4 class="empty-state-title">No Applications Found</h4>
                                <p class="empty-state-desc">
                                    ${this.searchQuery
                                        ? 'No applications match your search criteria. Try a different query.'
                                        : this.currentFilter !== 'all'
                                            ? `No ${this.currentFilter} applications at this time.`
                                            : 'No membership applications have been submitted yet.'
                                    }
                                </p>
                                ${this.searchQuery ? `
                                    <button class="btn-secondary btn-sm mt-4" onclick="Applications.clearSearch()">
                                        <i class="fa-solid fa-xmark mr-1"></i> Clear Search
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    ${this.filtered.map(a => this.renderCard(a)).join('')}
                </div>
            `;
        },

        renderCard(a) {
            const isSelected = this.selectedIds.has(a.id);
            const statusColors = {
                pending: 'badge-yellow',
                approved: 'badge-green',
                rejected: 'badge-red',
                under_review: 'badge-blue'
            };
            const urgencyBorder = a.status === 'pending'
                ? 'border-l-4 border-l-yellow-400'
                : a.status === 'approved'
                    ? 'border-l-4 border-l-green-400'
                    : a.status === 'rejected'
                        ? 'border-l-4 border-l-red-400'
                        : '';

            const daysSince = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000);
            const isNew = daysSince < 3;
            const isStale = daysSince > 14 && a.status === 'pending';

            return `
                <div class="admin-panel hover-lift ${urgencyBorder} ${isSelected ? 'ring-2 ring-brand-blue/40' : ''} transition-all">
                    <div class="admin-panel-body p-5">
                        <!-- Header Row -->
                        <div class="flex items-start gap-3 mb-4">
                            ${a.status === 'pending' ? `
                                <input type="checkbox" class="app-checkbox w-4 h-4 mt-1 accent-brand-blue rounded cursor-pointer flex-shrink-0"
                                    value="${a.id}" ${isSelected ? 'checked' : ''}
                                    onchange="Applications.toggleSelect('${a.id}')">
                            ` : '<div class="w-4 flex-shrink-0"></div>'}

                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue/10 to-brand-purple/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/20 dark:border-white/5 shadow-sm">
                                ${a.photo_url
                                    ? `<img src="${a.photo_url}" class="w-12 h-12 object-cover" alt="${window.AdminPanel.esc(a.full_name)}">`
                                    : `<span class="text-lg font-black text-brand-blue">${(a.full_name || '?').charAt(0).toUpperCase()}</span>`
                                }
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-2">
                                    <h4 class="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                                        ${window.AdminPanel.esc(a.full_name)}
                                        ${isNew ? '<span class="ml-1 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" title="New"></span>' : ''}
                                    </h4>
                                    <span class="badge ${statusColors[a.status] || 'badge-gray'} flex-shrink-0">${a.status}</span>
                                </div>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    <i class="fa-solid fa-envelope mr-1 text-[9px]"></i>${window.AdminPanel.esc(a.email)}
                                </p>
                            </div>
                        </div>

                        <!-- Details Grid -->
                        <div class="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-phone text-[9px] text-slate-400 w-3"></i>
                                <span class="text-[11px] text-slate-600 dark:text-slate-300 truncate">${a.phone || 'N/A'}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-droplet text-[9px] text-red-400 w-3"></i>
                                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">${a.blood_group || 'N/A'}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-briefcase text-[9px] text-slate-400 w-3"></i>
                                <span class="text-[11px] text-slate-600 dark:text-slate-300 truncate">${a.profession || 'N/A'}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-cake-candles text-[9px] text-purple-400 w-3"></i>
                                <span class="text-[11px] text-slate-600 dark:text-slate-300">${a.date_of_birth ? window.AdminPanel.fmtDate(a.date_of_birth) : 'N/A'}</span>
                            </div>
                        </div>

                        ${isStale ? `
                            <div class="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/15 mb-3">
                                <p class="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold">
                                    <i class="fa-solid fa-clock mr-1"></i> Pending for ${daysSince} days — needs attention
                                </p>
                            </div>
                        ` : ''}

                        <!-- Timestamp -->
                        <div class="flex items-center justify-between text-[10px] text-slate-400 mb-4">
                            <span><i class="fa-solid fa-clock mr-1"></i>Applied ${window.AdminPanel.ago(a.created_at)}</span>
                            ${a.reviewed_at ? `<span><i class="fa-solid fa-eye mr-1"></i>Reviewed ${window.AdminPanel.ago(a.reviewed_at)}</span>` : ''}
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex gap-2 flex-wrap border-t border-slate-200/30 dark:border-white/[0.04] pt-3">
                            <button class="btn-secondary btn-xs flex-1" onclick="Applications.viewDetail('${a.id}')">
                                <i class="fa-solid fa-eye mr-1"></i> View
                            </button>
                            ${a.status === 'pending' ? `
                                <button class="btn-primary btn-xs" onclick="Applications.approve('${a.id}')" title="Approve & Create Account">
                                    <i class="fa-solid fa-check"></i>
                                </button>
                                <button class="btn-danger btn-xs" onclick="Applications.reject('${a.id}')" title="Reject">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            ` : ''}
                            ${a.status === 'rejected' ? `
                                <button class="btn-secondary btn-xs" onclick="Applications.reconsider('${a.id}')" title="Move back to Pending">
                                    <i class="fa-solid fa-rotate-left"></i>
                                </button>
                            ` : ''}
                            <button class="btn-secondary btn-xs" onclick="Applications.deleteApp('${a.id}')" title="Delete Permanently">
                                <i class="fa-solid fa-trash-can text-slate-400"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        // ==========================================
        // DETAIL MODAL
        // ==========================================
        async viewDetail(id) {
            const a = this.all.find(x => x.id === id);
            if (!a) return;

            // Fetch audit trail
            let auditTrail = [];
            try {
                const { data } = await window.DB_ADMIN
                    .from('activity_log')
                    .select('*')
                    .eq('entity_type', 'membership_application')
                    .eq('entity_id', id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                auditTrail = data || [];
            } catch (e) {}

            const age = a.date_of_birth ? this.calculateAge(a.date_of_birth) : null;

            window.AdminPanel.createModal({
                title: 'Application Verification Detail',
                size: 'wide',
                icon: 'user-check',
                body: `
                    <div class="space-y-6">
                        <!-- Profile Header -->
                        <div class="flex items-center gap-5 p-5 rounded-2xl bg-gradient-to-r from-brand-blue/5 to-brand-purple/5 border border-white/20 dark:border-white/[0.04]">
                            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg">
                                ${a.photo_url
                                    ? `<img src="${a.photo_url}" class="w-20 h-20 object-cover">`
                                    : `<span class="text-3xl font-black text-white">${(a.full_name || '?').charAt(0).toUpperCase()}</span>`
                                }
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-xl font-black text-slate-800 dark:text-slate-100">${window.AdminPanel.esc(a.full_name)}</h3>
                                <p class="text-xs text-slate-500 mt-1">${window.AdminPanel.esc(a.email)}</p>
                                <div class="flex items-center gap-2 mt-2 flex-wrap">
                                    <span class="badge ${a.status === 'pending' ? 'badge-yellow' : a.status === 'approved' ? 'badge-green' : 'badge-red'}">${a.status}</span>
                                    ${a.blood_group ? `<span class="badge badge-red"><i class="fa-solid fa-droplet mr-1"></i>${a.blood_group}</span>` : ''}
                                    ${age ? `<span class="badge badge-blue">${age} years old</span>` : ''}
                                </div>
                            </div>
                            <div class="text-right hidden sm:block">
                                <p class="text-[10px] text-slate-400 uppercase font-bold">Application ID</p>
                                <p class="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 mt-1">${a.id.substring(0, 8)}...</p>
                                <p class="text-[10px] text-slate-400 mt-2">${window.AdminPanel.fmtDate(a.created_at)}</p>
                            </div>
                        </div>

                        <!-- Personal Information -->
                        <div class="admin-panel">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-id-card"></i> Personal Information</h3>
                            </div>
                            <div class="admin-panel-body">
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-5">
                                    ${this.detailField('fa-phone', 'Phone Number', a.phone)}
                                    ${this.detailField('fa-cake-candles', 'Date of Birth', a.date_of_birth ? window.AdminPanel.fmtDate(a.date_of_birth) : null)}
                                    ${this.detailField('fa-droplet', 'Blood Group', a.blood_group)}
                                    ${this.detailField('fa-briefcase', 'Profession', a.profession)}
                                    ${this.detailField('fa-calendar', 'Applied On', window.AdminPanel.fmtDate(a.created_at))}
                                    ${this.detailField('fa-clock', 'Time', new Date(a.created_at).toLocaleTimeString())}
                                </div>
                                ${a.address ? `
                                    <div class="mt-4 p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                        <p class="text-[10px] text-slate-400 uppercase font-bold mb-1"><i class="fa-solid fa-location-dot mr-1"></i>Address</p>
                                        <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">${window.AdminPanel.esc(a.address)}</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Motivation -->
                        ${a.why_join ? `
                            <div class="admin-panel">
                                <div class="admin-panel-header">
                                    <h3 class="admin-panel-title"><i class="fa-solid fa-heart"></i> Motivation to Join</h3>
                                </div>
                                <div class="admin-panel-body">
                                    <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">"${window.AdminPanel.esc(a.why_join)}"</p>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Referral -->
                        ${a.referral_source ? `
                            <div class="admin-panel">
                                <div class="admin-panel-header">
                                    <h3 class="admin-panel-title"><i class="fa-solid fa-share-nodes"></i> Referral Source</h3>
                                </div>
                                <div class="admin-panel-body">
                                    <p class="text-xs text-slate-700 dark:text-slate-300">${window.AdminPanel.esc(a.referral_source)}</p>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Rejection Reason -->
                        ${a.rejection_reason ? `
                            <div class="admin-panel" style="border-top: 3px solid #ef4444 !important;">
                                <div class="admin-panel-header">
                                    <h3 class="admin-panel-title" style="color: #ef4444;"><i class="fa-solid fa-circle-exclamation"></i> Rejection Reason</h3>
                                </div>
                                <div class="admin-panel-body">
                                    <p class="text-xs text-red-600 dark:text-red-400 leading-relaxed">${window.AdminPanel.esc(a.rejection_reason)}</p>
                                    ${a.reviewed_at ? `<p class="text-[10px] text-slate-400 mt-2">Reviewed ${window.AdminPanel.ago(a.reviewed_at)}</p>` : ''}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Audit Trail -->
                        ${auditTrail.length > 0 ? `
                            <div class="admin-panel">
                                <div class="admin-panel-header">
                                    <h3 class="admin-panel-title"><i class="fa-solid fa-clock-rotate-left"></i> Audit Trail</h3>
                                </div>
                                <div class="admin-panel-body p-0">
                                    <div class="divide-y divide-slate-200/30 dark:divide-white/[0.03]">
                                        ${auditTrail.map(log => `
                                            <div class="flex items-center gap-3 p-3 px-5">
                                                <div class="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                                                    <i class="fa-solid ${window.AdminPanel.getActionIcon?.(log.action) || 'fa-circle-dot'} text-brand-blue text-[9px]"></i>
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                        ${window.AdminPanel.esc(log.user_name || 'System')}
                                                        <span class="font-normal text-slate-400">— ${log.action}</span>
                                                    </p>
                                                </div>
                                                <span class="text-[10px] text-slate-400 flex-shrink-0">${window.AdminPanel.ago(log.created_at)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `,
                footer: a.status === 'pending' ? `
                    <button class="btn-secondary" onclick="AdminPanel.closeModal()">Close</button>
                    <button class="btn-danger" onclick="Applications.reject('${a.id}'); AdminPanel.closeModal();">
                        <i class="fa-solid fa-xmark mr-1"></i> Reject
                    </button>
                    <button class="btn-primary" onclick="Applications.approve('${a.id}'); AdminPanel.closeModal();">
                        <i class="fa-solid fa-user-plus mr-1"></i> Approve & Create Account
                    </button>
                ` : `
                    <button class="btn-secondary" onclick="AdminPanel.closeModal()">Close</button>
                    ${a.status === 'rejected' ? `
                        <button class="btn-primary" onclick="Applications.reconsider('${a.id}'); AdminPanel.closeModal();">
                            <i class="fa-solid fa-rotate-left mr-1"></i> Reconsider
                        </button>
                    ` : ''}
                `
            });
        },

        detailField(icon, label, value) {
            return `
                <div>
                    <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">
                        <i class="fa-solid ${icon} mr-1"></i>${label}
                    </p>
                    <p class="text-xs font-bold text-slate-700 dark:text-slate-200">${value ? window.AdminPanel.esc(value) : '<span class="text-slate-400 font-normal">Not provided</span>'}</p>
                </div>
            `;
        },

        calculateAge(dob) {
            const birth = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            return age;
        },

        // ==========================================
        // APPROVE
        // ==========================================
        async approve(id) {
            const app = this.all.find(a => a.id === id);
            if (!app) return;

            if (!confirm(
                `Approve enrollment for "${app.full_name}"?\n\n` +
                `This will:\n` +
                `• Create a new user account with role "member"\n` +
                `• Set default password: Welcome@Unity2026\n` +
                `• Mark this application as approved\n` +
                `• Log the action in the activity trail`
            )) return;

            try {
                const { data, error } = await window.DB_ADMIN.rpc('approve_membership_application', {
                    p_application_id: id,
                    p_default_password: 'Welcome@Unity2026'
                });

                if (error) throw error;

                window.AppToast?.success(`✅ ${app.full_name} has been enrolled successfully!`);
                await window.AdminPanel.logActivity('APPROVE', 'membership_application', id, {
                    applicant_name: app.full_name,
                    created_user_id: data
                });

                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                console.error('Approve failed:', e);
                window.AppToast?.error('Approval failed: ' + e.message);
            }
        },

        // ==========================================
        // REJECT
        // ==========================================
        async reject(id) {
            const app = this.all.find(a => a.id === id);
            if (!app) return;

            const reason = prompt(
                `Reject application for "${app.full_name}"?\n\n` +
                `Please provide a reason (this will be logged and visible to the applicant):`
            );
            if (reason === null) return;

            try {
                await window.DB_ADMIN
                    .from('membership_applications')
                    .update({
                        status: 'rejected',
                        rejection_reason: reason || 'No reason provided',
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: window.AuthManager.currentUser.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                window.AppToast?.success(`Application for ${app.full_name} has been rejected.`);
                await window.AdminPanel.logActivity('REJECT', 'membership_application', id, {
                    applicant_name: app.full_name,
                    reason: reason || 'No reason provided'
                });

                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                window.AppToast?.error('Rejection failed: ' + e.message);
            }
        },

        // ==========================================
        // RECONSIDER (Move back to Pending)
        // ==========================================
        async reconsider(id) {
            const app = this.all.find(a => a.id === id);
            if (!app) return;

            if (!confirm(`Move "${app.full_name}" back to pending for re-evaluation?`)) return;

            try {
                await window.DB_ADMIN
                    .from('membership_applications')
                    .update({
                        status: 'pending',
                        rejection_reason: null,
                        reviewed_at: null,
                        reviewed_by: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                window.AppToast?.success(`Application moved back to pending.`);
                await window.AdminPanel.logActivity('RECONSIDER', 'membership_application', id, {
                    applicant_name: app.full_name
                });

                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                window.AppToast?.error('Failed: ' + e.message);
            }
        },

        // ==========================================
        // DELETE
        // ==========================================
        async deleteApp(id) {
            const app = this.all.find(a => a.id === id);
            if (!app) return;

            if (!confirm(
                `⚠️ PERMANENTLY DELETE application for "${app.full_name}"?\n\n` +
                `This action cannot be undone. All associated data will be purged.`
            )) return;

            try {
                await window.DB_ADMIN
                    .from('membership_applications')
                    .delete()
                    .eq('id', id);

                window.AppToast?.success('Application permanently deleted.');
                await window.AdminPanel.logActivity('DELETE', 'membership_application', id, {
                    applicant_name: app.full_name
                });

                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                window.AppToast?.error('Delete failed: ' + e.message);
            }
        },

        // ==========================================
        // BULK ACTIONS
        // ==========================================
        async bulkApprove() {
            const ids = Array.from(this.selectedIds);
            if (ids.length === 0) return;

            if (!confirm(`Approve ${ids.length} application(s)?\n\nThis will create user accounts for all selected applicants.`)) return;

            let success = 0;
            let failed = 0;

            for (const id of ids) {
                try {
                    const { error } = await window.DB_ADMIN.rpc('approve_membership_application', {
                        p_application_id: id,
                        p_default_password: 'Welcome@Unity2026'
                    });
                    if (error) throw error;
                    success++;
                } catch (e) {
                    failed++;
                    console.error(`Bulk approve failed for ${id}:`, e);
                }
            }

            this.selectedIds.clear();
            window.AppToast?.success(`✅ ${success} approved${failed > 0 ? `, ${failed} failed` : ''}`);
            await this.render(window.AdminPanel.workspace);
        },

        async bulkReject() {
            const ids = Array.from(this.selectedIds);
            if (ids.length === 0) return;

            const reason = prompt(`Reject ${ids.length} application(s)?\n\nProvide a common rejection reason:`);
            if (reason === null) return;

            let success = 0;

            for (const id of ids) {
                try {
                    await window.DB_ADMIN
                        .from('membership_applications')
                        .update({
                            status: 'rejected',
                            rejection_reason: reason || 'Bulk rejection',
                            reviewed_at: new Date().toISOString(),
                            reviewed_by: window.AuthManager.currentUser.id,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id);
                    success++;
                } catch (e) {
                    console.error(`Bulk reject failed for ${id}:`, e);
                }
            }

            this.selectedIds.clear();
            window.AppToast?.success(`${success} application(s) rejected.`);
            await this.render(window.AdminPanel.workspace);
        },

        // ==========================================
        // EXPORT
        // ==========================================
        exportCSV() {
            if (!this.all.length) {
                window.AppToast?.warning('No data to export.');
                return;
            }

            const headers = ['Full Name', 'Email', 'Phone', 'DOB', 'Blood Group', 'Profession', 'Address', 'Status', 'Applied On', 'Reviewed On', 'Rejection Reason'];
            const rows = this.all.map(a => [
                a.full_name,
                a.email,
                a.phone,
                a.date_of_birth || '',
                a.blood_group || '',
                a.profession || '',
                (a.address || '').replace(/,/g, ';'),
                a.status,
                a.created_at,
                a.reviewed_at || '',
                (a.rejection_reason || '').replace(/,/g, ';')
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unity_applications_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            window.AppToast?.success('CSV exported successfully!');
            window.AdminPanel.logActivity('EXPORT', 'membership_applications', null, {
                count: this.all.length,
                format: 'csv'
            });
        },

        // ==========================================
        // UTILITIES
        // ==========================================
        clearSearch() {
            this.searchQuery = '';
            this.applyFilters();
            this.render(window.AdminPanel.workspace);
        },

        bindEvents() {
            // Re-bind search after render
            const searchInput = document.getElementById('app-search');
            if (searchInput) {
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        searchInput.value = '';
                        this.clearSearch();
                    }
                });
            }
        }
    };

    // Expose globally
    window.Applications = Applications;
})();