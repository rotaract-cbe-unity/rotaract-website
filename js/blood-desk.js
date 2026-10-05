// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// BLOOD DONATION DESK MODULE
// File: js/blood-desk.js | Version: 3.0.0
// Features: Emergency Alerts | Donor Coordination
// WhatsApp Broadcast | Fulfillment Tracking
// Real-time | Export | Audit Trail
// ============================================

(function () {
    'use strict';

    const BloodDesk = {
        // ==========================================
        // STATE
        // ==========================================
        allRequests: [],
        filtered: [],
        currentFilter: 'all',
        urgencyFilter: 'all',
        searchQuery: '',
        stats: { active: 0, emergency: 0, fulfilled: 0, cancelled: 0, total: 0 },

        // ==========================================
        // CONSTANTS
        // ==========================================
        BLOOD_GROUPS: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Bombay'],
        URGENCY_LEVELS: ['normal', 'urgent', 'emergency', 'critical'],
        URGENCY_CONFIG: {
            normal: { color: 'green', icon: 'fa-clock', label: 'Normal', border: 'border-slate-200 dark:border-slate-700', bg: '' },
            urgent: { color: 'yellow', icon: 'fa-bolt', label: 'Urgent', border: 'border-orange-400', bg: 'bg-orange-500/5' },
            emergency: { color: 'red', icon: 'fa-triangle-exclamation', label: 'Emergency', border: 'border-red-500', bg: 'bg-red-500/5' },
            critical: { color: 'red', icon: 'fa-skull-crossbones', label: 'Critical', border: 'border-red-600', bg: 'bg-red-500/8' }
        },
        STATUS_CONFIG: {
            active: { color: 'green', icon: 'fa-circle-pulse', label: 'Active' },
            fulfilled: { color: 'blue', icon: 'fa-circle-check', label: 'Fulfilled' },
            cancelled: { color: 'gray', icon: 'fa-circle-xmark', label: 'Cancelled' },
            expired: { color: 'gray', icon: 'fa-clock', label: 'Expired' }
        },

        // WhatsApp contacts for broadcast
        WHATSAPP_CONTACTS: [
            { name: 'Donor Desk Chair 1', number: '919789903206' },
            { name: 'Donor Desk Chair 2', number: '919789953206' }
        ],

        // ==========================================
        // MAIN RENDER
        // ==========================================
        async render(workspace) {
            workspace.innerHTML = window.AdminPanel.renderLoader();

            try {
                await this.loadData();
                this.computeStats();
                this.applyFilters();

                const activeEmergency = this.allRequests.filter(r =>
                    r.status === 'active' && ['emergency', 'critical'].includes(r.urgency)
                );

                workspace.innerHTML = `
                    <div class="p-6 lg:p-10">
                        <!-- Header -->
                        <div class="admin-page-header">
                            <div>
                                <div class="admin-breadcrumb">
                                    <i class="fa-solid fa-house text-brand-blue"></i>
                                    <span>/</span>
                                    <span>Blood Donation Desk</span>
                                </div>
                                <h1 class="admin-page-title">
                                    <i class="fa-solid fa-droplet text-red-500 mr-2"></i>Blood Donation Desk
                                </h1>
                                <p class="admin-page-subtitle">Monitor, coordinate, and fulfill emergency blood donor requests across the Unity network.</p>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <button class="btn-primary btn-sm" onclick="BloodDesk.openNewRequestForm()">
                                    <i class="fa-solid fa-plus mr-1"></i> New Request
                                </button>
                                <button class="btn-secondary btn-sm" onclick="BloodDesk.exportCSV()">
                                    <i class="fa-solid fa-file-csv"></i> Export
                                </button>
                                <button class="btn-secondary btn-sm" onclick="BloodDesk.render(AdminPanel.workspace)">
                                    <i class="fa-solid fa-rotate"></i> Refresh
                                </button>
                            </div>
                        </div>

                        <!-- Stats -->
                        <div class="admin-stats-grid stagger-list">
                            ${window.AdminPanel.statCard('red', 'fa-droplet', this.stats.active, 'Active Requests')}
                            ${window.AdminPanel.statCard('yellow', 'fa-triangle-exclamation', this.stats.emergency, 'Emergency / Critical')}
                            ${window.AdminPanel.statCard('green', 'fa-circle-check', this.stats.fulfilled, 'Fulfilled')}
                            ${window.AdminPanel.statCard('blue', 'fa-layer-group', this.stats.total, 'Total All-Time')}
                        </div>

                        <!-- Emergency Alert Panel -->
                        ${activeEmergency.length > 0 ? `
                            <div class="admin-panel mb-6" style="border-top: 3px solid #dc2626 !important; background: rgba(239, 68, 68, 0.03) !important;">
                                <div class="admin-panel-header">
                                    <h3 class="admin-panel-title" style="color: #dc2626;">
                                        <i class="fa-solid fa-triangle-exclamation animate-pulse"></i>
                                        Priority Emergency Incidents
                                    </h3>
                                    <div class="flex items-center gap-2">
                                        <span class="badge badge-red animate-pulse">${activeEmergency.length} CRITICAL</span>
                                        <button class="btn-danger btn-xs" onclick="BloodDesk.broadcastAllEmergency()">
                                            <i class="fa-brands fa-whatsapp mr-1"></i> Broadcast All
                                        </button>
                                    </div>
                                </div>
                                <div class="admin-panel-body">
                                    <div class="space-y-4">
                                        ${activeEmergency.map(r => this.renderCard(r, true)).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Filters Toolbar -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-body py-4">
                                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <!-- Status Filters -->
                                    <div class="flex gap-2 flex-wrap">
                                        ${this.filterTab('all', 'fa-list', 'All')}
                                        ${this.filterTab('active', 'fa-circle-pulse', 'Active')}
                                        ${this.filterTab('fulfilled', 'fa-circle-check', 'Fulfilled')}
                                        ${this.filterTab('cancelled', 'fa-circle-xmark', 'Cancelled')}
                                    </div>

                                    <!-- Search & Urgency -->
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <div class="relative min-w-[200px]">
                                            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                                            <input type="text" id="blood-search" class="admin-form-input pl-8 py-2 text-xs"
                                                placeholder="Search patient, hospital, contact..."
                                                value="${window.AdminPanel.esc(this.searchQuery)}"
                                                oninput="BloodDesk.onSearch(this.value)">
                                        </div>
                                        <select id="blood-urgency-filter" class="admin-form-input admin-form-select py-2 text-xs w-auto"
                                            onchange="BloodDesk.onUrgencyFilter(this.value)">
                                            <option value="all" ${this.urgencyFilter === 'all' ? 'selected' : ''}>All Urgency</option>
                                            <option value="critical" ${this.urgencyFilter === 'critical' ? 'selected' : ''}>🔴 Critical</option>
                                            <option value="emergency" ${this.urgencyFilter === 'emergency' ? 'selected' : ''}>🟠 Emergency</option>
                                            <option value="urgent" ${this.urgencyFilter === 'urgent' ? 'selected' : ''}>🟡 Urgent</option>
                                            <option value="normal" ${this.urgencyFilter === 'normal' ? 'selected' : ''}>🟢 Normal</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Results Count -->
                        <div class="flex items-center justify-between mb-4 px-1">
                            <p class="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Showing <span class="text-red-500">${this.filtered.length}</span> of ${this.allRequests.length} requests
                            </p>
                        </div>

                        <!-- Requests List -->
                        <div id="blood-requests-list">
                            ${this.renderList()}
                        </div>
                    </div>
                `;
            } catch (e) {
                console.error('BloodDesk render error:', e);
                workspace.innerHTML = window.AdminPanel.renderError(e.message);
            }
        },

        // ==========================================
        // DATA LOADING
        // ==========================================
        async loadData() {
            const { data, error } = await window.DB_ADMIN
                .from('blood_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.allRequests = data || [];
        },

        computeStats() {
            const active = this.allRequests.filter(r => r.status === 'active');
            this.stats = {
                active: active.length,
                emergency: active.filter(r => ['emergency', 'critical'].includes(r.urgency)).length,
                fulfilled: this.allRequests.filter(r => r.status === 'fulfilled').length,
                cancelled: this.allRequests.filter(r => r.status === 'cancelled' || r.status === 'expired').length,
                total: this.allRequests.length
            };
        },

        // ==========================================
        // FILTERING
        // ==========================================
        applyFilters() {
            let result = [...this.allRequests];

            // Status filter
            if (this.currentFilter !== 'all') {
                if (this.currentFilter === 'cancelled') {
                    result = result.filter(r => r.status === 'cancelled' || r.status === 'expired');
                } else {
                    result = result.filter(r => r.status === this.currentFilter);
                }
            }

            // Urgency filter
            if (this.urgencyFilter !== 'all') {
                result = result.filter(r => r.urgency === this.urgencyFilter);
            }

            // Search
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                result = result.filter(r =>
                    (r.patient_name || '').toLowerCase().includes(q) ||
                    (r.hospital_name || '').toLowerCase().includes(q) ||
                    (r.contact_person || '').toLowerCase().includes(q) ||
                    (r.contact_phone || '').includes(q) ||
                    (r.blood_group || '').toLowerCase().includes(q)
                );
            }

            // Sort: emergency first, then by date
            result.sort((a, b) => {
                const urgencyOrder = { critical: 0, emergency: 1, urgent: 2, normal: 3 };
                const statusOrder = { active: 0, fulfilled: 1, cancelled: 2, expired: 3 };
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
                    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
                }
                return new Date(b.created_at) - new Date(a.created_at);
            });

            this.filtered = result;
        },

        filterTab(filter, icon, label) {
            let count;
            if (filter === 'all') count = this.allRequests.length;
            else if (filter === 'cancelled') count = this.allRequests.filter(r => r.status === 'cancelled' || r.status === 'expired').length;
            else count = this.allRequests.filter(r => r.status === filter).length;

            const isActive = this.currentFilter === filter;
            return `
                <button class="${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm"
                    onclick="BloodDesk.setFilter('${filter}')">
                    <i class="fa-solid ${icon} mr-1"></i> ${label}
                    <span class="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${isActive ? 'bg-white/20' : 'bg-slate-200/50 dark:bg-slate-700/50'}">${count}</span>
                </button>
            `;
        },

        setFilter(filter) {
            this.currentFilter = filter;
            this.applyFilters();
            this.render(window.AdminPanel.workspace);
        },

        onSearch(query) {
            this.searchQuery = query;
            this.applyFilters();
            document.getElementById('blood-requests-list').innerHTML = this.renderList();
        },

        onUrgencyFilter(value) {
            this.urgencyFilter = value;
            this.applyFilters();
            document.getElementById('blood-requests-list').innerHTML = this.renderList();
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
                                <i class="fa-solid fa-droplet empty-state-icon text-red-300 dark:text-red-800"></i>
                                <h4 class="empty-state-title">No Blood Requests Found</h4>
                                <p class="empty-state-desc">
                                    ${this.searchQuery
                                        ? 'No requests match your search criteria.'
                                        : this.currentFilter !== 'all'
                                            ? `No ${this.currentFilter} requests at this time.`
                                            : 'No blood donation requests have been submitted yet.'
                                    }
                                </p>
                                <button class="btn-primary btn-sm mt-4" onclick="BloodDesk.openNewRequestForm()">
                                    <i class="fa-solid fa-plus mr-1"></i> Create Request
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            return `<div class="space-y-4">${this.filtered.map(r => this.renderCard(r, false)).join('')}</div>`;
        },

        renderCard(r, isEmergency) {
            const uConfig = this.URGENCY_CONFIG[r.urgency] || this.URGENCY_CONFIG.normal;
            const sConfig = this.STATUS_CONFIG[r.status] || this.STATUS_CONFIG.active;
            const hoursSince = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 3600000);
            const isStale = r.status === 'active' && hoursSince > 48;

            return `
                <div class="admin-panel ${isEmergency ? 'shadow-lg shadow-red-500/10' : ''}" 
                     style="border-left: 4px solid ${r.urgency === 'critical' ? '#dc2626' : r.urgency === 'emergency' ? '#ef4444' : r.urgency === 'urgent' ? '#f59e0b' : r.status === 'fulfilled' ? '#22c55e' : '#94a3b8'} !important;">
                    <div class="admin-panel-body p-5">
                        <div class="flex items-start gap-4 flex-wrap">
                            <!-- Blood Group Badge -->
                            <div class="flex flex-col items-center gap-1 flex-shrink-0">
                                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-red-500/20">
                                    ${r.blood_group}
                                </div>
                                <span class="text-[9px] font-bold text-slate-400 uppercase">${r.units_needed} unit${r.units_needed > 1 ? 's' : ''}</span>
                            </div>

                            <!-- Main Info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-2 flex-wrap mb-2">
                                    <div>
                                        <h4 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                                            ${window.AdminPanel.esc(r.patient_name)}
                                            ${r.patient_age ? `<span class="text-xs font-normal text-slate-400 ml-1">(Age: ${r.patient_age})</span>` : ''}
                                        </h4>
                                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                                            <span class="badge badge-${uConfig.color}">
                                                <i class="fa-solid ${uConfig.icon} mr-1"></i>${uConfig.label}
                                            </span>
                                            <span class="status-badge ${r.status}">${r.status}</span>
                                            ${isStale ? `<span class="badge badge-yellow"><i class="fa-solid fa-clock mr-1"></i>${hoursSince}h old</span>` : ''}
                                        </div>
                                    </div>
                                    <span class="text-[10px] text-slate-400 flex-shrink-0">${window.AdminPanel.ago(r.created_at)}</span>
                                </div>

                                <!-- Details Grid -->
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
                                    <p class="text-xs text-slate-600 dark:text-slate-300">
                                        <i class="fa-solid fa-hospital mr-1.5 text-slate-400 w-4 text-center"></i>
                                        <strong>${window.AdminPanel.esc(r.hospital_name)}</strong>
                                    </p>
                                    <p class="text-xs text-slate-600 dark:text-slate-300">
                                        <i class="fa-solid fa-user mr-1.5 text-slate-400 w-4 text-center"></i>
                                        ${window.AdminPanel.esc(r.contact_person)}
                                    </p>
                                    ${r.hospital_address ? `
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400 sm:col-span-2">
                                            <i class="fa-solid fa-location-dot mr-1.5 text-slate-400 w-4 text-center"></i>
                                            ${window.AdminPanel.esc(r.hospital_address)}
                                        </p>
                                    ` : ''}
                                    <p class="text-xs sm:col-span-2">
                                        <i class="fa-solid fa-phone mr-1.5 text-slate-400 w-4 text-center"></i>
                                        <a href="tel:${r.contact_phone}" class="text-brand-blue font-black hover:underline text-sm">${r.contact_phone}</a>
                                    </p>
                                </div>

                                ${r.additional_info ? `
                                    <div class="mt-3 p-2.5 rounded-lg bg-white/30 dark:bg-slate-800/20 border border-slate-200/30 dark:border-white/[0.04]">
                                        <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                            <i class="fa-solid fa-circle-info mr-1 text-slate-400"></i>
                                            ${window.AdminPanel.esc(r.additional_info)}
                                        </p>
                                    </div>
                                ` : ''}

                                ${r.fulfilled_at ? `
                                    <p class="text-[10px] text-green-600 dark:text-green-400 mt-2 font-bold">
                                        <i class="fa-solid fa-circle-check mr-1"></i>
                                        Fulfilled ${window.AdminPanel.ago(r.fulfilled_at)}
                                    </p>
                                ` : ''}
                            </div>

                            <!-- Actions -->
                            <div class="flex flex-col gap-2 flex-shrink-0 min-w-[120px]">
                                ${r.status === 'active' ? `
                                    <button class="btn-primary btn-xs w-full" onclick="BloodDesk.fulfill('${r.id}')">
                                        <i class="fa-solid fa-check mr-1"></i> Fulfilled
                                    </button>
                                    <button class="btn-secondary btn-xs w-full" onclick="BloodDesk.whatsapp('${r.id}')">
                                        <i class="fa-brands fa-whatsapp mr-1 text-green-500"></i> WhatsApp
                                    </button>
                                    <button class="btn-secondary btn-xs w-full" onclick="BloodDesk.viewDetail('${r.id}')">
                                        <i class="fa-solid fa-eye mr-1"></i> Details
                                    </button>
                                    <button class="btn-danger btn-xs w-full" onclick="BloodDesk.cancel('${r.id}')">
                                        <i class="fa-solid fa-xmark mr-1"></i> Cancel
                                    </button>
                                ` : `
                                    <button class="btn-secondary btn-xs w-full" onclick="BloodDesk.viewDetail('${r.id}')">
                                        <i class="fa-solid fa-eye mr-1"></i> View Details
                                    </button>
                                    ${r.status === 'cancelled' || r.status === 'expired' ? `
                                        <button class="btn-secondary btn-xs w-full" onclick="BloodDesk.reactivate('${r.id}')">
                                            <i class="fa-solid fa-rotate-left mr-1"></i> Reactivate
                                        </button>
                                    ` : ''}
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ==========================================
        // DETAIL MODAL
        // ==========================================
        async viewDetail(id) {
            const r = this.allRequests.find(x => x.id === id);
            if (!r) return;

            let auditTrail = [];
            try {
                const { data } = await window.DB_ADMIN
                    .from('activity_log')
                    .select('*')
                    .eq('entity_type', 'blood_request')
                    .eq('entity_id', id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                auditTrail = data || [];
            } catch (e) {}

            const uConfig = this.URGENCY_CONFIG[r.urgency] || this.URGENCY_CONFIG.normal;
            const hoursSince = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 3600000);

            window.AdminPanel.createModal({
                title: 'Blood Request Detail',
                size: 'medium',
                icon: 'droplet',
                body: `
                    <div class="space-y-5">
                        <!-- Header -->
                        <div class="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-red-500/5 to-red-600/5 border border-red-500/10">
                            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-red-500/20 flex-shrink-0">
                                ${r.blood_group}
                            </div>
                            <div class="flex-1">
                                <h3 class="text-lg font-black text-slate-800 dark:text-slate-100">${window.AdminPanel.esc(r.patient_name)}</h3>
                                <p class="text-xs text-slate-500 mt-1">${r.patient_age ? `Age: ${r.patient_age} &bull; ` : ''}${r.units_needed} unit(s) required</p>
                                <div class="flex gap-2 mt-2 flex-wrap">
                                    <span class="badge badge-${uConfig.color}"><i class="fa-solid ${uConfig.icon} mr-1"></i>${uConfig.label}</span>
                                    <span class="status-badge ${r.status}">${r.status}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Info Grid -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-hospital mr-1"></i>Hospital</p>
                                <p class="text-xs font-bold mt-1">${window.AdminPanel.esc(r.hospital_name)}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-clock mr-1"></i>Submitted</p>
                                <p class="text-xs font-bold mt-1">${window.AdminPanel.fmtDate(r.created_at)} (${hoursSince}h ago)</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-user mr-1"></i>Contact Person</p>
                                <p class="text-xs font-bold mt-1">${window.AdminPanel.esc(r.contact_person)}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-phone mr-1"></i>Phone</p>
                                <p class="text-xs font-bold mt-1"><a href="tel:${r.contact_phone}" class="text-brand-blue">${r.contact_phone}</a></p>
                            </div>
                        </div>

                        ${r.hospital_address ? `
                            <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-location-dot mr-1"></i>Hospital Address</p>
                                <p class="text-xs mt-1 leading-relaxed">${window.AdminPanel.esc(r.hospital_address)}</p>
                            </div>
                        ` : ''}

                        ${r.additional_info ? `
                            <div class="p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
                                <p class="text-[10px] text-slate-400 uppercase font-bold"><i class="fa-solid fa-circle-info mr-1"></i>Additional Information</p>
                                <p class="text-xs mt-1 leading-relaxed">${window.AdminPanel.esc(r.additional_info)}</p>
                            </div>
                        ` : ''}

                        ${r.fulfilled_at ? `
                            <div class="p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                                <p class="text-[10px] text-green-600 uppercase font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Fulfilled</p>
                                <p class="text-xs mt-1 text-green-700 dark:text-green-400 font-bold">${window.AdminPanel.fmtDate(r.fulfilled_at)} at ${new Date(r.fulfilled_at).toLocaleTimeString()}</p>
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
                                            <div class="flex items-center gap-3 p-3 px-4">
                                                <div class="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                                    <i class="fa-solid fa-droplet text-red-500 text-[9px]"></i>
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-[11px] font-bold">${window.AdminPanel.esc(log.user_name || 'System')} <span class="font-normal text-slate-400">— ${log.action}</span></p>
                                                </div>
                                                <span class="text-[10px] text-slate-400">${window.AdminPanel.ago(log.created_at)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `,
                footer: r.status === 'active' ? `
                    <button class="btn-secondary" onclick="AdminPanel.closeModal()">Close</button>
                    <button class="btn-secondary" onclick="BloodDesk.whatsapp('${r.id}')">
                        <i class="fa-brands fa-whatsapp mr-1 text-green-500"></i> WhatsApp
                    </button>
                    <button class="btn-primary" onclick="BloodDesk.fulfill('${r.id}'); AdminPanel.closeModal();">
                        <i class="fa-solid fa-check mr-1"></i> Mark Fulfilled
                    </button>
                ` : `
                    <button class="btn-secondary" onclick="AdminPanel.closeModal()">Close</button>
                `
            });
        },

        // ==========================================
        // NEW REQUEST FORM
        // ==========================================
        openNewRequestForm() {
            window.AdminPanel.createModal({
                title: 'Submit New Blood Request',
                size: 'medium',
                icon: 'droplet',
                body: `
                    <form id="new-blood-form" onsubmit="return false;" class="space-y-5">
                        <div class="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                            <p class="text-xs text-red-600 dark:text-red-400 font-bold leading-relaxed">
                                <i class="fa-solid fa-circle-info mr-1"></i>
                                This request will be visible to all admin users and can be broadcast via WhatsApp to donor desk coordinators.
                            </p>
                        </div>

                        <div class="admin-form-grid">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Patient Name <span class="required">*</span></label>
                                <input type="text" name="patient_name" required class="admin-form-input" placeholder="Full name of patient">
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label">Patient Age</label>
                                <input type="number" name="patient_age" min="1" max="120" class="admin-form-input" placeholder="Age">
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label">Blood Group <span class="required">*</span></label>
                                <select name="blood_group" required class="admin-form-input admin-form-select">
                                    <option value="">Select Blood Group</option>
                                    ${this.BLOOD_GROUPS.map(g => `<option value="${g}">${g}</option>`).join('')}
                                </select>
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label">Units Needed <span class="required">*</span></label>
                                <input type="number" name="units_needed" required min="1" max="20" value="1" class="admin-form-input">
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label">Urgency Level <span class="required">*</span></label>
                                <select name="urgency" required class="admin-form-input admin-form-select">
                                    <option value="normal">🟢 Normal</option>
                                    <option value="urgent">🟡 Urgent</option>
                                    <option value="emergency" selected>🟠 Emergency</option>
                                    <option value="critical">🔴 Critical</option>
                                </select>
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label">Contact Person <span class="required">*</span></label>
                                <input type="text" name="contact_person" required class="admin-form-input" placeholder="Name of contact">
                            </div>
                            <div class="admin-form-group full-width">
                                <label class="admin-form-label">Contact Phone <span class="required">*</span></label>
                                <input type="tel" name="contact_phone" required class="admin-form-input" placeholder="+91 XXXXX XXXXX">
                            </div>
                            <div class="admin-form-group full-width">
                                <label class="admin-form-label">Hospital Name <span class="required">*</span></label>
                                <input type="text" name="hospital_name" required class="admin-form-input" placeholder="Hospital / Medical Center name">
                            </div>
                            <div class="admin-form-group full-width">
                                <label class="admin-form-label">Hospital Address</label>
                                <input type="text" name="hospital_address" class="admin-form-input" placeholder="Area, City, State">
                            </div>
                            <div class="admin-form-group full-width">
                                <label class="admin-form-label">Additional Information</label>
                                <textarea name="additional_info" rows="3" class="admin-form-input admin-form-textarea" placeholder="Any special instructions, medical condition details, preferred time, etc."></textarea>
                            </div>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="AdminPanel.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="BloodDesk.submitNewRequest()">
                        <i class="fa-solid fa-paper-plane mr-1"></i> Submit Request
                    </button>
                `
            });
        },

        async submitNewRequest() {
            const form = document.getElementById('new-blood-form');
            if (!form) return;
            const fd = new FormData(form);

            const payload = {
                patient_name: fd.get('patient_name')?.trim(),
                patient_age: fd.get('patient_age') ? parseInt(fd.get('patient_age')) : null,
                blood_group: fd.get('blood_group'),
                units_needed: parseInt(fd.get('units_needed')) || 1,
                urgency: fd.get('urgency'),
                hospital_name: fd.get('hospital_name')?.trim(),
                hospital_address: fd.get('hospital_address')?.trim() || null,
                contact_person: fd.get('contact_person')?.trim(),
                contact_phone: fd.get('contact_phone')?.trim(),
                additional_info: fd.get('additional_info')?.trim() || null,
                status: 'active'
            };

            if (!payload.patient_name || !payload.blood_group || !payload.hospital_name || !payload.contact_person || !payload.contact_phone) {
                window.AppToast?.warning('Please fill all required fields.');
                return;
            }

            try {
                const { data, error } = await window.DB_ADMIN
                    .from('blood_requests')
                    .insert(payload)
                    .select()
                    .single();

                if (error) throw error;

                window.AppToast?.success('🩸 Blood request submitted successfully!');
                await window.AdminPanel.logActivity('CREATE', 'blood_request', data.id, {
                    patient: payload.patient_name,
                    blood_group: payload.blood_group,
                    urgency: payload.urgency
                });

                window.AdminPanel.closeModal();
                await this.render(window.AdminPanel.workspace);

                // Auto-broadcast if emergency/critical
                if (['emergency', 'critical'].includes(payload.urgency)) {
                    if (confirm('This is an emergency request. Broadcast via WhatsApp to donor desk coordinators now?')) {
                        this.whatsappDirect(data);
                    }
                }
            } catch (e) {
                window.AppToast?.error('Failed to submit: ' + e.message);
            }
        },

        // ==========================================
        // ACTIONS
        // ==========================================
        async fulfill(id) {
            const r = this.allRequests.find(x => x.id === id);
            if (!r) return;

            if (!confirm(`Mark blood request for "${r.patient_name}" (${r.blood_group}) as fulfilled?`)) return;

            try {
                await window.DB_ADMIN
                    .from('blood_requests')
                    .update({
                        status: 'fulfilled',
                        fulfilled_at: new Date().toISOString(),
                        fulfilled_by: window.AuthManager.currentUser.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                window.AppToast?.success(`✅ Request for ${r.patient_name} marked as fulfilled.`);
                await window.AdminPanel.logActivity('FULFILL', 'blood_request', id, {
                    patient: r.patient_name,
                    blood_group: r.blood_group
                });

                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                window.AppToast?.error('Failed: ' + e.message);
            }
        },

        async cancel(id) {
            const r = this.allRequests.find(x => x.id === id);
            if (!r) return;

            if (!confirm(`Cancel blood request for "${r.patient_name}"?`)) return;

            try {
                await window.DB_ADMIN
                    .from('blood_requests')
                    .update({
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                window.AppToast?.success('Request cancelled.');
                await window.AdminPanel.logActivity('CANCEL', 'blood_request', id, {
                    patient: r.patient_name
                });

                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                window.AppToast?.error('Failed: ' + e.message);
            }
        },

        async reactivate(id) {
            const r = this.allRequests.find(x => x.id === id);
            if (!r) return;

            if (!confirm(`Reactivate request for "${r.patient_name}"?`)) return;

            try {
                await window.DB_ADMIN
                    .from('blood_requests')
                    .update({
                        status: 'active',
                        fulfilled_at: null,
                        fulfilled_by: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                window.AppToast?.success('Request reactivated.');
                await window.AdminPanel.logActivity('REACTIVATE', 'blood_request', id, {
                    patient: r.patient_name
                });

                await this.render(window.AdminPanel.workspace);
            } catch (e) {
                window.AppToast?.error('Failed: ' + e.message);
            }
        },

        // ==========================================
        // WHATSAPP BROADCAST
        // ==========================================
        whatsapp(id) {
            const r = this.allRequests.find(x => x.id === id);
            if (!r) return;
            this.whatsappDirect(r);
        },

        whatsappDirect(r) {
            const urgencyEmoji = {
                normal: '🟢', urgent: '🟡', emergency: '🟠', critical: '🔴'
            };

            const msg = encodeURIComponent(
                `${urgencyEmoji[r.urgency] || '🔴'} *BLOOD EMERGENCY ALERT*\n` +
                `━━━━━━━━━━━━━━━━━━\n\n` +
                `*Patient:* ${r.patient_name}${r.patient_age ? ` (Age: ${r.patient_age})` : ''}\n` +
                `*Blood Group:* ${r.blood_group}\n` +
                `*Units Required:* ${r.units_needed}\n` +
                `*Urgency:* ${(r.urgency || 'normal').toUpperCase()}\n\n` +
                `*Hospital:* ${r.hospital_name}\n` +
                `${r.hospital_address ? `*Address:* ${r.hospital_address}\n` : ''}\n` +
                `*Contact:* ${r.contact_person}\n` +
                `*Phone:* ${r.contact_phone}\n\n` +
                `${r.additional_info ? `*Note:* ${r.additional_info}\n\n` : ''}` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `_Via Rotaract Unity Blood Desk_\n` +
                `_Please forward to potential donors._`
            );

            // Open WhatsApp for each configured contact
            this.WHATSAPP_CONTACTS.forEach((contact, i) => {
                setTimeout(() => {
                    window.open(`https://wa.me/${contact.number}?text=${msg}`, '_blank');
                }, i * 1500);
            });

            window.AppToast?.success(`📱 WhatsApp broadcast initiated to ${this.WHATSAPP_CONTACTS.length} contacts.`);
            window.AdminPanel.logActivity('WHATSAPP_BROADCAST', 'blood_request', r.id, {
                patient: r.patient_name,
                contacts: this.WHATSAPP_CONTACTS.length
            });
        },

        broadcastAllEmergency() {
            const emergencies = this.allRequests.filter(r =>
                r.status === 'active' && ['emergency', 'critical'].includes(r.urgency)
            );

            if (emergencies.length === 0) {
                window.AppToast?.warning('No emergency requests to broadcast.');
                return;
            }

            if (!confirm(`Broadcast ${emergencies.length} emergency request(s) via WhatsApp?`)) return;

            emergencies.forEach((r, i) => {
                setTimeout(() => this.whatsappDirect(r), i * 2000);
            });
        },

        // ==========================================
        // EXPORT
        // ==========================================
        exportCSV() {
            if (!this.allRequests.length) {
                window.AppToast?.warning('No data to export.');
                return;
            }

            const headers = ['Patient', 'Age', 'Blood Group', 'Units', 'Urgency', 'Hospital', 'Address', 'Contact Person', 'Phone', 'Status', 'Created', 'Fulfilled'];
            const rows = this.allRequests.map(r => [
                r.patient_name,
                r.patient_age || '',
                r.blood_group,
                r.units_needed,
                r.urgency,
                r.hospital_name,
                (r.hospital_address || '').replace(/,/g, ';'),
                r.contact_person,
                r.contact_phone,
                r.status,
                r.created_at,
                r.fulfilled_at || ''
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unity_blood_requests_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            window.AppToast?.success('Blood requests exported!');
        }
    };

    // Expose globally
    window.BloodDesk = BloodDesk;
})();