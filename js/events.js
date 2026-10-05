// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Projects / Events Management
// File: js/events.js | Version: 7.2.0
// Fixed Wizard Navigation | DPP Text Search
// Attendance (council / trainers) now captured in Reports
// Project announcement email (with poster) via Apps Script
// Error-Free Build
// ============================================

(function () {
    'use strict';

    // ------------------------------------------------------------------
    // Mail service (Google Apps Script web app, Code.gs v4.1+)
    // POSTed as text/plain so the browser does not need a CORS preflight.
    // ------------------------------------------------------------------
    const GAS_EMAIL_URL = 'https://script.google.com/macros/s/AKfycbwiPZ3D7xPhbJ617w4xH2pCP_7EpIWH9HgEdJEEmVEuKD7tMcUMS1ei114jmE-fK8cPew/exec';

    async function postToScript(payload) {
        const resp = await fetch(GAS_EMAIL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        const text = await resp.text();
        let result;
        try { result = JSON.parse(text); }
        catch (e) { throw new Error('Mail service gave an unexpected reply. Check the Apps Script deployment is "Execute as: Me" and "Who has access: Anyone".'); }
        if (!result.success) throw new Error(result.error || 'Mail service reported a failure');
        return result;
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function getMemberRecipients() {
        try {
            if (window.getEmailRecipients) return (await window.getEmailRecipients('all_members')) || [];
            const db = window.DB_ADMIN || window.DB || window.supabaseClient;
            const { data } = await db.from('users').select('email').eq('is_active', true).neq('role', 'super_admin').not('email', 'is', null);
            return (data || []).map(u => u.email).filter(e => e && e.includes('@'));
        } catch (e) { console.warn('Recipient fetch failed:', e); return []; }
    }

    function currentSender() {
        const u = window.AuthManager?.currentUser || {};
        return { role: u.role, name: u.full_name || u.name, email: u.email };
    }

    // ------------------------------------------------------------------
    // Supabase table bridge
    // ------------------------------------------------------------------
    function createTableStore(table, columns, opts) {
        opts = opts || {};
        const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const uuidCols = opts.uuidColumns || [];
        const textCols = opts.textColumns || [];
        let snapshot = new Map();
        const client = () => window.DB_ADMIN || window.DB || window.supabaseClient;
        const need = () => { const c = client(); if (!c) throw new Error('Database client (DB_ADMIN) is not available.'); return c; };
        const pick = (row) => {
            const out = {};
            columns.forEach(c => {
                let v = row[c];
                if (v === undefined) return;
                if (uuidCols.includes(c) && !UUID.test(v || '')) v = null;
                if (textCols.includes(c) && v !== null) v = String(v);
                out[c] = v;
            });
            return out;
        };
        const sig = (row) => JSON.stringify(pick(row));
        const store = {
            isUuid: (v) => UUID.test(v || ''),
            async get() {
                const { data, error } = await need().from(table).select('*')
                    .order(opts.orderBy || 'created_at', { ascending: false }).limit(5000);
                if (error) throw new Error(error.message);
                snapshot = new Map((data || []).map(r => [r.id, sig(r)]));
                return data || [];
            },
            async set(rows) {
                const db = need();
                for (const row of rows) {
                    if (store.isUuid(row.id) && snapshot.has(row.id)) {
                        if (snapshot.get(row.id) === sig(row)) continue;
                        const { error } = await db.from(table).update(pick(row)).eq('id', row.id);
                        if (error) throw new Error(error.message);
                        snapshot.set(row.id, sig(row));
                    } else {
                        const { data, error } = await db.from(table).insert(pick(row)).select('id').single();
                        if (error) throw new Error(error.message);
                        row.id = data.id;
                        snapshot.set(row.id, sig(row));
                    }
                }
            },
            async remove(id) {
                const { error } = await need().from(table).delete().eq('id', id);
                if (error) throw new Error(error.message);
                snapshot.delete(id);
            }
        };
        return store;
    }

    const ProjectsStore = createTableStore('events', [
        'event_name','description','date','start_time','end_time','venue','avenue_id','avenue_slug',
        'event_chair','event_secretary','event_proposed_by','event_seconded_by','poster_url','poster_public_id',
        'has_collaboration','collaboration_type','collaborator_name','is_dpp','dpp_project_number','dpp_pillar',
        'dpp_category','group_number','status','approved_by','approved_at','report_text','report_submitted',
        'report_submitted_at','report_submitted_by','created_by','beneficiaries_count','volunteers_count',
        'service_hours','amount_spent','poster_provider','pillar_alignment_reason','dpp_sdg_goals',
        'dpp_target_group','dpp_impact_metric','dpp_sustainability_plan'
    ], { orderBy: 'date', uuidColumns: ['avenue_id','approved_by','report_submitted_by','created_by'], textColumns: ['group_number'] });

    const AVENUES = [
        { slug: 'club_service', label: 'Club Service', color: 'blue', icon: 'fa-handshake' },
        { slug: 'community_service', label: 'Community Service', color: 'green', icon: 'fa-hand-holding-heart' },
        { slug: 'professional_service', label: 'Professional Service', color: 'red', icon: 'fa-briefcase' },
        { slug: 'international_service', label: 'International Service', color: 'purple', icon: 'fa-earth-americas' }
    ];

    const DPP_PILLARS = [
        'Peace and Conflict Prevention',
        'Disease Prevention and Treatment',
        'Water and Sanitation',
        'Maternal and Child Health',
        'Basic Education and Literacy',
        'Economic and Community Development',
        'Environment',
        'Mental Health'
    ];

    const DPP_CATEGORIES = [
        'Category A - Awareness & Education',
        'Category B - Hands-On Direct Service',
        'Category C - Sustainable Community Impact'
    ];

    const AdminEvents = {
        currentFilter: 'all',
        currentStatusFilter: 'all',
        currentPage: 1,
        limit: 15,
        searchQuery: '',
        currentEventId: null,
        stepKeys: ['core', 'collab', 'final'],
        stepIndex: 0,
        posterFile: null,
        existingPoster: null,
        canManage: true,
        _searchTimer: null,

        // ==========================================
        // 1. MAIN RENDERER
        // ==========================================
        async render(workspace) {
            if (!workspace) return;
            const A = window.AdminPanel;
            const user = window.AuthManager?.currentUser;

            if (!user) {
                workspace.innerHTML = this.renderUnauthorized();
                return;
            }

            this.canManage = true;

            workspace.innerHTML = `
                <div class="p-6 lg:p-10">
                    <div class="admin-page-header">
                        <div>
                            <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Projects Desk</span></div>
                            <h1 class="admin-page-title">Projects & Events Command Center</h1>
                            <p class="admin-page-subtitle">Schedule projects, track approvals, and manage reports for every project.</p>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button type="button" class="btn-secondary" onclick="AdminPanel.navigateTo('reports')">
                                <i class="fa-solid fa-file-lines mr-1.5"></i> Reports Centre
                            </button>
                            <button type="button" class="btn-primary" id="add-project-btn" onclick="AdminEvents.openCreateForm()">
                                <i class="fa-solid fa-plus mr-1.5"></i> Add New Project
                            </button>
                        </div>
                    </div>

                    <div class="admin-panel mb-6">
                        <div class="admin-panel-header flex-wrap gap-3">
                            <div class="flex items-center gap-3 flex-wrap flex-1">
                                <div class="relative flex-1 min-w-[240px] max-w-md">
                                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] pointer-events-none"></i>
                                    <input type="text" id="event-search-input" placeholder="Search projects by name, chair, venue..." value="${A.esc(this.searchQuery)}"
                                        class="admin-form-input" style="padding-left:34px;" oninput="AdminEvents.onSearch(this.value)">
                                </div>
                                <select onchange="AdminEvents.onAvenueFilter(this.value)" class="admin-form-input" style="width:auto;min-width:190px;">
                                    <option value="all">All Avenues</option>
                                    ${AVENUES.map(a => `<option value="${a.slug}" ${this.currentFilter === a.slug ? 'selected' : ''}>${a.label}</option>`).join('')}
                                    <option value="dpp" ${this.currentFilter === 'dpp' ? 'selected' : ''}>District Priority Projects</option>
                                </select>
                                <select onchange="AdminEvents.onStatusFilter(this.value)" class="admin-form-input" style="width:auto;min-width:170px;">
                                    <option value="all">All Statuses</option>
                                    ${['draft', 'pending_approval', 'approved', 'completed', 'cancelled'].map(s => `<option value="${s}" ${this.currentStatusFilter === s ? 'selected' : ''}>${this.formatStatus(s)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="admin-panel-body p-0" id="events-table-container">
                            <div class="p-8 text-center text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading projects...</div>
                        </div>
                        <div class="p-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center flex-wrap gap-3" id="events-pagination"></div>
                    </div>
                </div>
            `;

            await this.loadEvents();
        },

        // ==========================================
        // 2. FILTERS
        // ==========================================
        onSearch(value) {
            clearTimeout(this._searchTimer);
            this._searchTimer = setTimeout(() => {
                this.searchQuery = (value || '').trim();
                this.currentPage = 1;
                this.loadEvents();
            }, 350);
        },

        onAvenueFilter(value) {
            this.currentFilter = value;
            this.currentPage = 1;
            this.loadEvents();
        },

        onStatusFilter(value) {
            this.currentStatusFilter = value;
            this.currentPage = 1;
            this.loadEvents();
        },

        goToPage(page) {
            if (page < 1) return;
            this.currentPage = page;
            this.loadEvents();
        },

        // ==========================================
        // 3. DATA LOADING & TABLE
        // ==========================================
        async loadEvents() {
            const container = document.getElementById('events-table-container');
            if (!container) return;
            const A = window.AdminPanel;

            try {
                let allProjects = await ProjectsStore.get();

                allProjects = allProjects.map(p => ({
                    ...p,
                    event_name: p.event_name || p.name || 'Untitled',
                    avenue_slug: p.avenue_slug || p.avenue || 'club_service',
                    is_dpp: !!(p.is_dpp),
                    status: p.status || 'draft',
                    event_chair: p.event_chair || p.chair || 'TBA',
                    venue: p.venue || 'TBD',
                    start_time: p.start_time || '10:00',
                    report_submitted: !!p.report_submitted,
                    poster_url: p.poster_url || p.poster
                }));

                if (this.currentFilter === 'dpp') {
                    allProjects = allProjects.filter(p => p.is_dpp);
                } else if (this.currentFilter !== 'all') {
                    allProjects = allProjects.filter(p => p.avenue_slug === this.currentFilter);
                }

                if (this.currentStatusFilter !== 'all') {
                    allProjects = allProjects.filter(p => p.status === this.currentStatusFilter);
                }

                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase();
                    allProjects = allProjects.filter(p =>
                        (p.event_name || '').toLowerCase().includes(q) ||
                        (p.event_chair || '').toLowerCase().includes(q) ||
                        (p.venue || '').toLowerCase().includes(q)
                    );
                }

                allProjects.sort((a, b) => new Date(b.date) - new Date(a.date));

                const totalCount = allProjects.length;
                const offset = (this.currentPage - 1) * this.limit;
                const paginatedData = allProjects.slice(offset, offset + this.limit);

                this.renderTable(paginatedData, totalCount);
            } catch (e) {
                console.error('Load events error:', e);
                container.innerHTML = `<div class="p-8 text-center text-xs text-red-500">${A.esc(e.message)}</div>`;
            }
        },

        renderTable(events, totalCount) {
            const container = document.getElementById('events-table-container');
            const pag = document.getElementById('events-pagination');
            if (!container) return;

            if (events.length === 0) {
                container.innerHTML = `
                    <div class="empty-state py-16">
                        <i class="fa-solid fa-folder-open empty-state-icon text-slate-300 dark:text-slate-600"></i>
                        <h4 class="empty-state-title">No Projects Found</h4>
                        <p class="empty-state-desc">No projects match your filters yet.</p>
                        <button type="button" class="btn-primary mt-4" onclick="AdminEvents.openCreateForm()">
                            <i class="fa-solid fa-plus mr-1.5"></i> Add New Project
                        </button>
                    </div>`;
                if (pag) pag.innerHTML = '';
                return;
            }

            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="admin-data-table">
                        <thead>
                            <tr>
                                <th>Project</th>
                                <th>Avenue</th>
                                <th>Date</th>
                                <th>Chair</th>
                                <th>Status</th>
                                <th>Report</th>
                                <th style="width:220px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>${events.map(e => this.renderTableRow(e)).join('')}</tbody>
                    </table>
                </div>
            `;

            if (!pag) return;
            const totalPages = Math.ceil(totalCount / this.limit);
            if (totalPages > 1) {
                let pagesHtml = '';
                const start = Math.max(1, this.currentPage - 2);
                const end = Math.min(totalPages, start + 4);
                for (let i = start; i <= end; i++) {
                    pagesHtml += `<button type="button" class="admin-pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="AdminEvents.goToPage(${i})">${i}</button>`;
                }
                pag.innerHTML = `
                    <span class="text-[10px] text-slate-400">Showing ${((this.currentPage - 1) * this.limit) + 1}-${Math.min(this.currentPage * this.limit, totalCount)} of ${totalCount}</span>
                    <div class="flex items-center gap-1">
                        <button type="button" class="admin-pagination-btn" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="AdminEvents.goToPage(${this.currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>
                        ${pagesHtml}
                        <button type="button" class="admin-pagination-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="AdminEvents.goToPage(${this.currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>`;
            } else {
                pag.innerHTML = `<span class="text-[10px] text-slate-400">${totalCount} project(s)</span><div></div>`;
            }
        },

        renderTableRow(event) {
            const A = window.AdminPanel;
            const avenueName = this.formatAvenue(event.avenue_slug);
            const colorMap = { club_service: 'blue', community_service: 'green', professional_service: 'red', international_service: 'purple' };
            const badgeColor = colorMap[event.avenue_slug] || 'blue';
            const statusClass = String(event.status || 'draft').replace(/_/g, '-');
            const id = A.esc(event.id);
            const reportCell = event.report_submitted
                ? '<span class="badge badge-green"><i class="fa-solid fa-check mr-1"></i>Submitted</span>'
                : '<span class="text-[10px] text-slate-400">Not submitted</span>';

            return `
                <tr>
                    <td>
                        <div class="flex items-center gap-3">
                            ${event.poster_url
                                ? `<img src="${A.esc(event.poster_url)}" class="w-10 h-10 rounded-lg object-cover border border-white/20 shadow-sm" alt="">`
                                : `<div class="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-image text-brand-blue text-xs"></i></div>`}
                            <div class="min-w-0">
                                <p class="text-xs font-bold truncate max-w-[220px]">${A.esc(event.event_name)}</p>
                                ${event.is_dpp ? '<span class="badge badge-yellow" style="font-size:7px;margin-top:2px;">DPP</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-${badgeColor}">${A.esc(avenueName)}</span></td>
                    <td class="text-xs">
                        <p class="font-bold">${A.fmtDate(event.date)}</p>
                        <p class="text-[10px] text-slate-400 font-semibold">${A.esc(A.fmtTime ? A.fmtTime(event.start_time) : event.start_time)}</p>
                    </td>
                    <td class="text-xs font-semibold">${A.esc(event.event_chair || 'TBA')}</td>
                    <td><span class="status-badge ${statusClass}">${this.formatStatus(event.status)}</span></td>
                    <td>${reportCell}</td>
                    <td>
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <button type="button" class="btn-secondary btn-xs" onclick="AdminEvents.viewEvent('${id}')" title="View"><i class="fa-solid fa-eye"></i></button>
                            <button type="button" class="btn-secondary btn-xs" onclick="AdminEvents.openCreateForm('${id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button type="button" class="btn-primary btn-xs" onclick="AdminEvents.openReportForm('${id}')" title="Report"><i class="fa-solid fa-file-pen"></i></button>
                            ${event.report_submitted ? `<button type="button" class="btn-secondary btn-xs" onclick="AdminEvents.downloadReport('${id}')" title="Download"><i class="fa-solid fa-download"></i></button>` : ''}
                            ${['approved', 'completed'].includes(event.status) ? `<button type="button" class="btn-secondary btn-xs" onclick="AdminEvents.emailProject('${id}')" title="Email announcement with poster"><i class="fa-solid fa-envelope"></i></button>` : ''}
                            <button type="button" class="btn-danger btn-xs" onclick="AdminEvents.deleteEvent('${id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        },

        // ==========================================
        // 4. WIZARD STEP MANAGEMENT
        // ==========================================
        computeStepKeys(isDPP) {
            return isDPP 
                ? ['core', 'collab', 'dpp', 'final'] 
                : ['core', 'collab', 'final'];
        },

        stepsBarHtml() {
            const meta = {
                core: { icon: 'fa-circle-info', label: 'Core Details' },
                collab: { icon: 'fa-handshake', label: 'Collab & Poster' },
                dpp: { icon: 'fa-star', label: 'DPP Specs' },
                final: { icon: 'fa-check-double', label: 'Submit' }
            };
            return this.stepKeys.map((key, i, arr) => {
                const state = i < this.stepIndex
                    ? 'bg-green-500 text-white shadow-lg'
                    : i === this.stepIndex
                        ? 'bg-brand-blue text-white shadow-lg'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400';
                return `
                    <div class="wizard-step flex items-center ${i < arr.length - 1 ? 'flex-1' : ''}" data-step="${i + 1}">
                        <div class="flex flex-col items-center gap-1.5">
                            <div class="wizard-circle-event w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${state}">
                                <i class="fa-solid ${meta[key].icon} text-xs"></i>
                            </div>
                            <span class="text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">${meta[key].label}</span>
                        </div>
                        ${i < arr.length - 1 ? `<div class="wizard-line-event flex-1 h-0.5 ${i < this.stepIndex ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'} mx-2 mt-5"></div>` : ''}
                    </div>`;
            }).join('');
        },

        // ==========================================
        // 5. OPEN CREATE / EDIT FORM
        // ==========================================
        async openCreateForm(editEventId) {
            const A = window.AdminPanel;
            if (!A || typeof A.createModal !== 'function') { 
                alert('Admin panel is not ready.'); 
                return; 
            }
            this.stepIndex = 0;
            this.posterFile = null;
            this.existingPoster = null;
            this.currentEventId = editEventId || null;

            let ev = null;
            if (editEventId) {
                const projects = await ProjectsStore.get();
                ev = projects.find(p => p.id === editEventId);
                if (!ev) { A.notify('error', 'Project not found.'); return; }
                ev.event_name = ev.event_name || ev.name;
                ev.avenue_slug = ev.avenue_slug || ev.avenue || 'club_service';
                ev.event_chair = ev.event_chair || ev.chair;
                ev.event_proposed_by = ev.event_proposed_by || ev.proposer;
                ev.event_seconded_by = ev.event_seconded_by || ev.seconder;
                ev.collaborator_name = ev.collaborator_name || ev.colab;
                ev.description = ev.description || ev.desc;
                if (ev.poster_url || ev.poster) {
                    this.existingPoster = { url: ev.poster_url || ev.poster };
                }
            }

            const isDPP = !!ev?.is_dpp;
            this.stepKeys = this.computeStepKeys(isDPP);
            const today = (A.ymd ? A.ymd() : new Date().toISOString().split('T')[0]);
            const v = (k, d = '') => A.esc(ev && ev[k] !== null && ev[k] !== undefined ? ev[k] : d);
            const sel = (k, val) => (ev && ev[k] === val ? 'selected' : '');
            const status = ev?.status || 'approved';

            A.createModal({
                title: ev ? 'Edit Project' : 'Add New Project',
                size: 'wide',
                icon: 'calendar-days',
                body: `
                    <div class="flex items-center justify-between mb-8 overflow-x-auto pb-2" id="event-wizard-steps">${this.stepsBarHtml()}</div>

                    <!-- Datalists for DPP text inputs -->
                    <datalist id="dpp-pillar-list">
                        ${DPP_PILLARS.map(p => `<option value="${A.esc(p)}">`).join('')}
                    </datalist>
                    <datalist id="dpp-category-list">
                        ${DPP_CATEGORIES.map(c => `<option value="${A.esc(c)}">`).join('')}
                    </datalist>

                    <form id="event-wizard-form" onsubmit="return false;" class="space-y-6" novalidate>

                        <!-- STEP 1: CORE DETAILS -->
                        <div class="wizard-page" id="wizard-page-core">
                            <div class="admin-panel mb-5">
                                <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-circle-info"></i> Base Project Identification</h3></div>
                                <div class="admin-panel-body">
                                    <div class="admin-form-grid">
                                        <div class="admin-form-group full-width">
                                            <label class="admin-form-label">Project Name / Title <span class="required">*</span></label>
                                            <input type="text" name="event_name" required class="admin-form-input" value="${v('event_name')}" placeholder="Concise, descriptive project title">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Execution Date <span class="required">*</span></label>
                                            <input type="date" name="date" required class="admin-form-input" value="${v('date', today)}">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Avenue Classification <span class="required">*</span></label>
                                            <select name="avenue_slug" required class="admin-form-input">
                                                <option value="">Select Avenue</option>
                                                ${AVENUES.map(a => `<option value="${a.slug}" ${sel('avenue_slug', a.slug)}>${a.label}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Start Time <span class="required">*</span></label>
                                            <input type="time" name="start_time" required class="admin-form-input" value="${v('start_time', '10:00')}">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">End Time</label>
                                            <input type="time" name="end_time" class="admin-form-input" value="${v('end_time')}">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Group Number <span class="required">*</span></label>
                                            <select name="group_number" required class="admin-form-input">
                                                <option value="">Select Group</option>
                                                ${[1, 2, 3, 4, 5, 6].map(g => `<option value="${g}" ${ev && Number(ev.group_number) === g ? 'selected' : (!ev && g === 1 ? 'selected' : '')}>Group ${g}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Project Classification</label>
                                            <label class="flex items-center gap-3 cursor-pointer mt-2.5">
                                                <input type="checkbox" name="is_dpp" id="is-dpp-toggle" class="w-4 h-4 accent-yellow-500" ${isDPP ? 'checked' : ''} onchange="AdminEvents.toggleFormDPP(this.checked)">
                                                <span class="text-xs font-bold"><i class="fa-solid fa-star text-yellow-500 mr-1"></i>District Priority Project (DPP)</span>
                                            </label>
                                        </div>
                                        <div class="admin-form-group full-width">
                                            <label class="admin-form-label">Execution Venue <span class="required">*</span></label>
                                            <input type="text" name="venue" required class="admin-form-input" value="${v('venue')}" placeholder="Physical address of project execution">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="admin-panel">
                                <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-users-gear"></i> Project Organizing Committee</h3></div>
                                <div class="admin-panel-body">
                                    <div class="admin-form-grid">
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Project Chair <span class="required">*</span></label>
                                            <input type="text" name="event_chair" required class="admin-form-input" value="${v('event_chair')}" placeholder="Chair name">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Event Secretary</label>
                                            <input type="text" name="event_secretary" class="admin-form-input" value="${v('event_secretary')}" placeholder="Secretary name">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Proposed By <span class="required">*</span></label>
                                            <input type="text" name="event_proposed_by" required class="admin-form-input" value="${v('event_proposed_by')}" placeholder="Proposer name">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Seconded By <span class="required">*</span></label>
                                            <input type="text" name="event_seconded_by" required class="admin-form-input" value="${v('event_seconded_by')}" placeholder="Seconder name">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- STEP 2: COLLAB & POSTER -->
                        <div class="wizard-page hidden" id="wizard-page-collab">
                            <div class="admin-panel mb-5">
                                <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-handshake"></i> Collaborations</h3></div>
                                <div class="admin-panel-body">
                                    <div class="admin-form-grid">
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Collaborating Entity Name</label>
                                            <input type="text" name="collaborator_name" class="admin-form-input" value="${v('collaborator_name')}" placeholder="e.g. Partner Club Name">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label">Collaboration Category</label>
                                            <select name="collaboration_type" class="admin-form-input">
                                                <option value="">Select Category</option>
                                                <option value="rotaract" ${sel('collaboration_type', 'rotaract')}>Rotaract Club</option>
                                                <option value="rotary" ${sel('collaboration_type', 'rotary')}>Rotary Club</option>
                                                <option value="ngo" ${sel('collaboration_type', 'ngo')}>NGO</option>
                                                <option value="others" ${sel('collaboration_type', 'others')}>Others</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="admin-panel mb-5">
                                <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-image"></i> Project Poster</h3></div>
                                <div class="admin-panel-body">
                                    <div class="admin-upload-zone" id="poster-upload-zone">
                                        <input type="file" id="poster-file-input" accept="image/*" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;">
                                        <i class="fa-solid fa-cloud-arrow-up admin-upload-icon"></i>
                                        <p class="admin-upload-text">Click or drop a poster image</p>
                                        <p class="admin-upload-hint">JPG, PNG or WebP.</p>
                                    </div>
                                    <div id="poster-preview" class="mt-3">
                                        ${ev?.poster_url || ev?.poster ? `
                                            <div class="flex items-center gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                                <img src="${A.esc(ev.poster_url || ev.poster)}" class="w-16 h-16 rounded-lg object-cover" alt="">
                                                <div>
                                                    <p class="text-xs font-bold text-green-600">Poster attached</p>
                                                    <p class="text-[10px] text-slate-400">Upload new to replace</p>
                                                </div>
                                            </div>` : ''}
                                    </div>
                                </div>
                            </div>

                            <div class="admin-panel">
                                <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-align-left"></i> Summary Description</h3></div>
                                <div class="admin-panel-body">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label">Brief Description <span class="required">*</span></label>
                                        <textarea name="description" required rows="4" class="admin-form-input" placeholder="Core objectives and expectations...">${v('description')}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- STEP 3 (DPP only): DPP SPECS (TEXT INPUTS WITH DATALIST) -->
                        <div class="wizard-page hidden" id="wizard-page-dpp">
                            <div class="admin-panel" style="border-top:3px solid #eab308 !important;">
                                <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-star text-yellow-500"></i> District Priority Project Specification</h3></div>
                                <div class="admin-panel-body">
                                    <div class="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/15 mb-5">
                                        <p class="text-xs font-bold text-yellow-700 mb-1"><i class="fa-solid fa-circle-info mr-1"></i> DPP Pillar & Category</p>
                                        <p class="text-[11px] text-slate-500 leading-relaxed">
                                            Start typing to search from Rotary's official Areas of Focus pillars. You can also type a custom pillar or category if needed.
                                        </p>
                                    </div>

                                    <div class="admin-form-grid">
                                        <div class="admin-form-group">
                                            <label class="admin-form-label text-yellow-700">DPP Project ID <span class="required">*</span></label>
                                            <input type="text" name="dpp_project_number" id="dpp-project-number" class="admin-form-input" value="${v('dpp_project_number')}" placeholder="e.g. DPP-CBE-04" style="border-color:rgba(234,179,8,0.4);">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label text-yellow-700">
                                                <i class="fa-solid fa-bullseye text-yellow-500 mr-1"></i> Area of Focus (Pillar) <span class="required">*</span>
                                            </label>
                                            <input type="text" name="dpp_pillar" id="dpp-pillar" class="admin-form-input" list="dpp-pillar-list"
                                                value="${v('dpp_pillar')}" placeholder="Type to search pillar..." style="border-color:rgba(234,179,8,0.4);"
                                                autocomplete="off">
                                        </div>
                                        <div class="admin-form-group full-width">
                                            <label class="admin-form-label text-yellow-700">
                                                <i class="fa-solid fa-layer-group text-yellow-500 mr-1"></i> Project Category <span class="required">*</span>
                                            </label>
                                            <input type="text" name="dpp_category" id="dpp-category" class="admin-form-input" list="dpp-category-list"
                                                value="${v('dpp_category')}" placeholder="Type to search category..." style="border-color:rgba(234,179,8,0.4);"
                                                autocomplete="off">
                                        </div>
                                        <div class="admin-form-group full-width">
                                            <label class="admin-form-label text-yellow-700">Reason for Pillar Alignment <span class="required">*</span></label>
                                            <textarea name="pillar_alignment_reason" id="dpp-reason" rows="3" class="admin-form-input" placeholder="Explain how this project aligns with the selected pillar..." style="border-color:rgba(234,179,8,0.4);">${v('pillar_alignment_reason')}</textarea>
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label text-yellow-700">SDGs this project supports</label>
                                            <input type="text" name="dpp_sdg_goals" id="dpp-sdg" class="admin-form-input" value="${v('dpp_sdg_goals')}" placeholder="e.g. SDG 3, SDG 4" style="border-color:rgba(234,179,8,0.4);">
                                        </div>
                                        <div class="admin-form-group">
                                            <label class="admin-form-label text-yellow-700">Target Group <span class="required">*</span></label>
                                            <input type="text" name="dpp_target_group" id="dpp-target-group" class="admin-form-input" value="${v('dpp_target_group')}" placeholder="e.g. School students Grades 6-8" style="border-color:rgba(234,179,8,0.4);">
                                        </div>
                                        <div class="admin-form-group full-width">
                                            <label class="admin-form-label text-yellow-700">Impact Measurement <span class="required">*</span></label>
                                            <textarea name="dpp_impact_metric" id="dpp-impact-metric" rows="2" class="admin-form-input" placeholder="e.g. 200 screened, 80% follow-up" style="border-color:rgba(234,179,8,0.4);">${v('dpp_impact_metric')}</textarea>
                                        </div>
                                        <div class="admin-form-group full-width">
                                            <label class="admin-form-label text-yellow-700">Sustainability Plan</label>
                                            <textarea name="dpp_sustainability_plan" id="dpp-sustain" rows="2" class="admin-form-input" placeholder="Follow-up visits, materials left behind..." style="border-color:rgba(234,179,8,0.4);">${v('dpp_sustainability_plan')}</textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- FINAL STEP: REVIEW & FINALISE -->
                        <div class="wizard-page hidden" id="wizard-page-final">
                            <div class="admin-panel mb-5">
                                <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-clipboard-check"></i> Project Verification Summary</h3></div>
                                <div class="admin-panel-body" id="review-container"></div>
                            </div>
                            <div class="admin-panel">
                                <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-paper-plane"></i> Finalization</h3></div>
                                <div class="admin-panel-body">
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <label class="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-blue cursor-pointer transition-all">
                                            <input type="radio" name="status" value="draft" ${status === 'draft' ? 'checked' : ''} class="accent-brand-blue">
                                            <div><p class="text-xs font-bold">Save as Draft</p><p class="text-[10px] text-slate-400 mt-1">Private.</p></div>
                                        </label>
                                        <label class="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-blue cursor-pointer transition-all">
                                            <input type="radio" name="status" value="pending_approval" ${status === 'pending_approval' ? 'checked' : ''} class="accent-brand-blue">
                                            <div><p class="text-xs font-bold">Request Approval</p><p class="text-[10px] text-slate-400 mt-1">Board review.</p></div>
                                        </label>
                                        <label class="flex items-center gap-3 p-4 rounded-xl border border-green-200 dark:border-green-800/30 bg-green-500/[0.02] hover:border-green-500 cursor-pointer transition-all">
                                            <input type="radio" name="status" value="approved" ${status === 'approved' || !status ? 'checked' : ''} class="accent-green-500">
                                            <div><p class="text-xs font-bold text-green-700 dark:text-green-400">Publish Directly</p><p class="text-[10px] text-slate-400 mt-1">Visible immediately.</p></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                `,
                footer: `
                    <button type="button" class="btn-secondary" onclick="AdminPanel.closeModal()">Discard</button>
                    <button type="button" class="btn-secondary" id="wizard-prev-btn" onclick="AdminEvents.wizardPrev()" style="display:none;"><i class="fa-solid fa-chevron-left mr-1"></i> Back</button>
                    <button type="button" class="btn-primary" id="wizard-next-btn" onclick="AdminEvents.wizardNext()">Continue <i class="fa-solid fa-chevron-right ml-1"></i></button>
                    <button type="button" class="btn-primary" id="wizard-submit-btn" onclick="AdminEvents.submitEvent()" style="display:none;background:linear-gradient(135deg,#10b981,#059669);"><i class="fa-solid fa-floppy-disk mr-1.5"></i> ${ev ? 'Update Project' : 'Save Project'}</button>
                `
            });

            this.bindPosterUpload();
            // Apply DPP required attributes AFTER DOM is ready
            setTimeout(() => this.applyDppRequired(isDPP), 50);
        },

        // ==========================================
        // 6. DPP TOGGLE HANDLERS
        // ==========================================
        applyDppRequired(isDPP) {
            const dppFieldIds = [
                'dpp-project-number', 
                'dpp-pillar', 
                'dpp-category', 
                'dpp-reason', 
                'dpp-target-group', 
                'dpp-impact-metric'
            ];
            dppFieldIds.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                if (isDPP) {
                    el.setAttribute('required', 'required');
                } else {
                    el.removeAttribute('required');
                    el.classList.remove('border-red-500');
                }
            });
        },

        toggleFormDPP(checked) {
            const currentKey = this.stepKeys[this.stepIndex];
            const wasAtDpp = currentKey === 'dpp';
            
            this.stepKeys = this.computeStepKeys(checked);
            
            // Clamp stepIndex if DPP step was removed
            if (this.stepIndex >= this.stepKeys.length) {
                this.stepIndex = this.stepKeys.length - 1;
            }
            // If we were ON the DPP step and it got removed, go to collab
            if (wasAtDpp && !checked) {
                const collabIdx = this.stepKeys.indexOf('collab');
                this.stepIndex = collabIdx !== -1 ? collabIdx : 0;
            }
            
            this.applyDppRequired(checked);
            this.updateWizardUI();
        },

        // ==========================================
        // 8. WIZARD NAVIGATION - FIXED
        // ==========================================
        validatePage(key) {
            const page = document.getElementById(`wizard-page-${key}`);
            if (!page) return true;
            let ok = true;
            page.querySelectorAll('[required]').forEach(input => {
                const bad = !String(input.value || '').trim();
                input.classList.toggle('border-red-500', bad);
                if (bad) ok = false;
            });
            return ok;
        },

        showPage(key) {
            // Include ALL possible wizard pages
            const allPages = ['core', 'collab', 'dpp', 'final'];
            allPages.forEach(k => {
                const page = document.getElementById(`wizard-page-${k}`);
                if (page) {
                    if (k === key) {
                        page.classList.remove('hidden');
                    } else {
                        page.classList.add('hidden');
                    }
                }
            });
        },

        wizardNext() {
            const key = this.stepKeys[this.stepIndex];
            console.log('[Wizard] Next clicked. Current step:', key, 'Index:', this.stepIndex, 'Total:', this.stepKeys.length);
            
            if (!this.validatePage(key)) {
                window.AdminPanel.notify('warning', 'Please fill all mandatory (*) fields.');
                return;
            }
            
            if (this.stepIndex >= this.stepKeys.length - 1) {
                console.log('[Wizard] Already at last step');
                return;
            }
            
            this.stepIndex++;
            console.log('[Wizard] Advancing to:', this.stepKeys[this.stepIndex]);
            this.updateWizardUI();
            
            if (this.stepKeys[this.stepIndex] === 'final') {
                this.generateReview();
            }
        },

        wizardPrev() {
            if (this.stepIndex <= 0) return;
            this.stepIndex--;
            this.updateWizardUI();
        },

        updateWizardUI() {
            const bar = document.getElementById('event-wizard-steps');
            if (bar) bar.innerHTML = this.stepsBarHtml();
            
            const currentKey = this.stepKeys[this.stepIndex];
            console.log('[Wizard] Showing page:', currentKey);
            this.showPage(currentKey);
            
            const isLast = this.stepIndex === this.stepKeys.length - 1;
            const isFirst = this.stepIndex === 0;

            const prevBtn = document.getElementById('wizard-prev-btn');
            const nextBtn = document.getElementById('wizard-next-btn');
            const submitBtn = document.getElementById('wizard-submit-btn');
            
            if (prevBtn) prevBtn.style.display = isFirst ? 'none' : '';
            if (nextBtn) nextBtn.style.display = isLast ? 'none' : '';
            if (submitBtn) submitBtn.style.display = isLast ? '' : 'none';
            
            // Scroll modal body to top
            const modalBody = document.getElementById('admin-modal-body');
            if (modalBody && modalBody.scrollTo) {
                modalBody.scrollTo({ top: 0, behavior: 'smooth' });
            }
        },

        generateReview() {
            const A = window.AdminPanel;
            const form = document.getElementById('event-wizard-form');
            const box = document.getElementById('review-container');
            if (!form || !box) return;
            const fd = new FormData(form);
            const isDPP = fd.get('is_dpp') === 'on';

            const row = (label, value) => `
                <div class="p-3 rounded-xl bg-white/20 border border-white/10">
                    <span class="text-[9px] text-slate-400 uppercase font-black block">${label}</span>
                    <span class="text-xs font-bold break-words">${A.esc(value || '---')}</span>
                </div>`;

            const time = fd.get('start_time') ? (A.fmtTime ? A.fmtTime(fd.get('start_time')) : fd.get('start_time')) + (fd.get('end_time') ? ' - ' + (A.fmtTime ? A.fmtTime(fd.get('end_time')) : fd.get('end_time')) : '') : '';

            box.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${row('Project', fd.get('event_name'))}
                    ${row('Avenue', this.formatAvenue(fd.get('avenue_slug')))}
                    ${row('Date', fd.get('date') ? A.fmtDate(fd.get('date')) : '')}
                    ${row('Time', time)}
                    ${row('Venue', fd.get('venue'))}
                    ${row('Group', fd.get('group_number') ? 'Group ' + fd.get('group_number') : '')}
                    ${row('Chair', fd.get('event_chair'))}
                    ${row('Proposed / Seconded', `${fd.get('event_proposed_by') || ''} / ${fd.get('event_seconded_by') || ''}`)}
                    ${row('Collaboration', fd.get('collaborator_name'))}
                    ${row('Poster', this.posterFile ? this.posterFile.name : (this.existingPoster ? 'Existing poster kept' : 'None'))}
                    ${isDPP ? row('DPP', `${fd.get('dpp_project_number') || ''} | ${fd.get('dpp_pillar') || ''} | ${fd.get('dpp_category') || ''}`) : ''}
                </div>`;
        },

        // ==========================================
        // 9. POSTER UPLOAD
        // ==========================================
        bindPosterUpload() {
            // Delay binding to ensure DOM is ready
            setTimeout(() => {
                const input = document.getElementById('poster-file-input');
                const preview = document.getElementById('poster-preview');
                const zone = document.getElementById('poster-upload-zone');
                if (!input || !preview || !zone) return;

                zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('bg-brand-blue/10'); });
                zone.addEventListener('dragleave', () => zone.classList.remove('bg-brand-blue/10'));
                zone.addEventListener('drop', e => {
                    e.preventDefault();
                    zone.classList.remove('bg-brand-blue/10');
                    if (e.dataTransfer?.files?.[0]) this.handlePosterFile(e.dataTransfer.files[0], preview);
                });
                input.addEventListener('change', e => {
                    if (e.target.files?.[0]) this.handlePosterFile(e.target.files[0], preview);
                });
            }, 100);
        },

        handlePosterFile(file, preview) {
            const A = window.AdminPanel;
            if (!file.type.startsWith('image/')) { A.notify('error', 'Only image files supported.'); return; }
            if (file.size > 10 * 1024 * 1024) { A.notify('error', 'File exceeds 10MB.'); return; }
            this.posterFile = file;
            const reader = new FileReader();
            reader.onload = e => {
                preview.innerHTML = `
                    <div class="flex items-center gap-3 p-3 bg-green-500/5 rounded-xl border border-green-500/20">
                        <img src="${e.target.result}" class="w-16 h-16 rounded-lg object-cover" alt="">
                        <div>
                            <p class="text-xs font-bold text-green-600">New poster selected</p>
                            <p class="text-[10px] text-slate-400">${A.esc(file.name)}</p>
                        </div>
                    </div>`;
            };
            reader.readAsDataURL(file);
        },

        // ==========================================
        // 10. SUBMIT EVENT
        // ==========================================
        async submitEvent() {
            const A = window.AdminPanel;
            const form = document.getElementById('event-wizard-form');
            if (!form) return;

            const fdCheck = new FormData(form);
            const isDPP = fdCheck.get('is_dpp') === 'on';
            
            // Validate ALL pages in current wizard flow (except 'final')
            const pagesToValidate = isDPP 
                ? ['core', 'collab', 'dpp']
                : ['core', 'collab'];

            for (let i = 0; i < pagesToValidate.length; i++) {
                const pageKey = pagesToValidate[i];
                if (!this.validatePage(pageKey)) {
                    const invalidIdx = this.stepKeys.indexOf(pageKey);
                    if (invalidIdx !== -1) {
                        this.stepIndex = invalidIdx;
                        this.updateWizardUI();
                    }
                    A.notify('warning', `Please fill all mandatory (*) fields in the ${pageKey} step.`);
                    return;
                }
            }

            const fd = new FormData(form);
            const submitBtn = document.getElementById('wizard-submit-btn');
            const originalHtml = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';
            }

            try {
                let posterUrl = this.existingPoster?.url || null;
                if (this.posterFile) {
                    if (window.Uploader?.upload) {
                        try {
                            const result = await window.Uploader.upload(this.posterFile, { type: 'poster', folder: 'events' });
                            posterUrl = result.url;
                        } catch (upErr) {
                            posterUrl = await this.fileToBase64(this.posterFile);
                        }
                    } else {
                        posterUrl = await this.fileToBase64(this.posterFile);
                    }
                }

                const val = k => {
                    const x = fd.get(k);
                    return x === null || String(x).trim() === '' ? null : String(x).trim();
                };

                const payload = {
                    event_name: val('event_name'),
                    description: val('description'),
                    date: val('date'),
                    start_time: val('start_time'),
                    end_time: val('end_time'),
                    venue: val('venue'),
                    avenue_slug: val('avenue_slug'),
                    event_chair: val('event_chair'),
                    event_secretary: val('event_secretary'),
                    event_proposed_by: val('event_proposed_by'),
                    event_seconded_by: val('event_seconded_by'),
                    group_number: parseInt(fd.get('group_number'), 10) || null,
                    poster_url: posterUrl,
                    has_collaboration: !!val('collaborator_name'),
                    collaboration_type: val('collaboration_type'),
                    collaborator_name: val('collaborator_name'),
                    is_dpp: isDPP,
                    dpp_project_number: isDPP ? val('dpp_project_number') : null,
                    dpp_pillar: isDPP ? val('dpp_pillar') : null,
                    dpp_category: isDPP ? val('dpp_category') : null,
                    pillar_alignment_reason: isDPP ? val('pillar_alignment_reason') : null,
                    dpp_sdg_goals: isDPP ? val('dpp_sdg_goals') : null,
                    dpp_target_group: isDPP ? val('dpp_target_group') : null,
                    dpp_impact_metric: isDPP ? val('dpp_impact_metric') : null,
                    dpp_sustainability_plan: isDPP ? val('dpp_sustainability_plan') : null,
                    status: fd.get('status') || 'approved'
                };

                const projects = await ProjectsStore.get();
                let prevStatus = null;

                if (this.currentEventId) {
                    const idx = projects.findIndex(p => p.id === this.currentEventId);
                    if (idx !== -1) {
                        prevStatus = projects[idx].status;
                        projects[idx] = { ...projects[idx], ...payload, updated_at: new Date().toISOString() };
                    }
                } else {
                    payload.id = 'new-' + Date.now();
                    payload.created_at = new Date().toISOString();
                    payload.created_by = window.AuthManager?.currentUser?.id || null;
                    projects.push(payload);
                }

                await ProjectsStore.set(projects);

                A.notify('success', this.currentEventId ? 'Project updated.' : 'Project created.');
                if (A.logActivity) {
                    A.logActivity(this.currentEventId ? 'EVENT_UPDATE' : 'EVENT_CREATE', 'event', this.currentEventId || payload.id, { name: payload.event_name });
                }
                A.closeModal();
                await this.loadEvents();

                if (typeof window.renderAllProjects === 'function') window.renderAllProjects();

                // Offer to announce the project by email when it has just been published
                const savedId = this.currentEventId || payload.id;
                if (payload.status === 'approved' && prevStatus !== 'approved' && ProjectsStore.isUuid(savedId) &&
                    confirm('Project published. Email the announcement (with poster) to all members now?')) {
                    await this.emailProject(savedId, true);
                }
            } catch (e) {
                console.error('Save event error:', e);
                A.notify('error', 'Save failed: ' + e.message);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalHtml;
                }
            }
        },

        async fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        // ==========================================
        // 11. VIEW / DELETE / REPORT
        // ==========================================
        async viewEvent(eventId) {
            const A = window.AdminPanel;
            try {
                const projects = await ProjectsStore.get();
                const event = projects.find(p => p.id === eventId);
                if (!event) throw new Error('Project not found');

                event.event_name = event.event_name || event.name;
                event.avenue_slug = event.avenue_slug || event.avenue || 'club_service';
                event.event_chair = event.event_chair || event.chair;
                event.event_proposed_by = event.event_proposed_by || event.proposer;
                event.event_seconded_by = event.event_seconded_by || event.seconder;
                event.collaborator_name = event.collaborator_name || event.colab;
                event.description = event.description || event.desc;
                event.poster_url = event.poster_url || event.poster;

                const councilDetails = this.parseJsonList(event.council_members_details);
                const trainerDetails = this.parseJsonList(event.trainers_details);
                const hasAttendance = !!(event.council_members_count || event.trainers_count || event.rotarians_count || event.interactors_count || councilDetails.length || trainerDetails.length);

                const statusClass = String(event.status || 'draft').replace(/_/g, '-');
                const cell = (label, html, span) => `
                    <div class="${span ? 'col-span-2' : ''}">
                        <p class="text-[10px] text-slate-400 uppercase font-bold">${label}</p>
                        <p class="text-sm font-bold break-words">${html}</p>
                    </div>`;

                A.createModal({
                    title: event.event_name,
                    size: 'wide',
                    icon: 'calendar-days',
                    body: `
                        <div class="flex flex-col md:flex-row gap-6">
                            <div class="flex-1">
                                ${event.poster_url ? `<img src="${A.esc(event.poster_url)}" class="w-full rounded-2xl mb-4 border border-white/20 shadow-lg" alt="">` : `<div class="w-full aspect-video rounded-2xl bg-brand-blue/10 flex items-center justify-center border border-brand-blue/10"><i class="fa-solid fa-image text-3xl text-brand-blue/40"></i></div>`}
                                <div class="flex items-center gap-2 mt-4 flex-wrap">
                                    <span class="badge badge-blue">${A.esc(this.formatAvenue(event.avenue_slug))}</span>
                                    <span class="status-badge ${statusClass}">${this.formatStatus(event.status)}</span>
                                    ${event.is_dpp ? '<span class="badge badge-yellow"><i class="fa-solid fa-star mr-1"></i>DPP</span>' : ''}
                                    ${event.report_submitted ? '<span class="badge badge-green"><i class="fa-solid fa-check mr-1"></i>Report submitted</span>' : ''}
                                </div>
                            </div>
                            <div class="flex-1 space-y-4">
                                <div class="grid grid-cols-2 gap-4">
                                    ${cell('Date', A.fmtDate(event.date))}
                                    ${cell('Time', A.esc((A.fmtTime ? A.fmtTime(event.start_time) : event.start_time) + (event.end_time ? ' - ' + (A.fmtTime ? A.fmtTime(event.end_time) : event.end_time) : '')) || '---')}
                                    ${cell('Venue', A.esc(event.venue || '---'), true)}
                                    ${cell('Project Chair', A.esc(event.event_chair || '---'))}
                                    ${cell('Group', event.group_number ? 'Group ' + A.esc(event.group_number) : '---')}
                                    ${cell('Proposed By', A.esc(event.event_proposed_by || '---'))}
                                    ${cell('Seconded By', A.esc(event.event_seconded_by || '---'))}
                                    ${event.collaborator_name ? cell('Collaboration', A.esc(event.collaborator_name), true) : ''}
                                    ${event.is_dpp ? cell('DPP', A.esc([event.dpp_project_number, event.dpp_pillar, event.dpp_category].filter(Boolean).join(' | ') || '---'), true) : ''}
                                </div>

                                <!-- Attendance Section (recorded through the project report) -->
                                ${hasAttendance ? `
                                <div class="pt-4 border-t border-slate-200/40 dark:border-white/[0.04]">
                                    <p class="text-[10px] text-slate-400 uppercase font-bold mb-2">Attendance (from report)</p>
                                    <div class="grid grid-cols-4 gap-2 text-xs">
                                        <div class="p-2 rounded-lg bg-blue-500/5 text-center">
                                            <p class="text-[9px] text-slate-500">Council</p>
                                            <p class="font-bold text-blue-600">${event.council_members_count || 0}</p>
                                        </div>
                                        <div class="p-2 rounded-lg bg-purple-500/5 text-center">
                                            <p class="text-[9px] text-slate-500">Trainers</p>
                                            <p class="font-bold text-purple-600">${event.trainers_count || 0}</p>
                                        </div>
                                        <div class="p-2 rounded-lg bg-green-500/5 text-center">
                                            <p class="text-[9px] text-slate-500">Rotarians</p>
                                            <p class="font-bold text-green-600">${event.rotarians_count || 0}</p>
                                        </div>
                                        <div class="p-2 rounded-lg bg-orange-500/5 text-center">
                                            <p class="text-[9px] text-slate-500">Interactors</p>
                                            <p class="font-bold text-orange-600">${event.interactors_count || 0}</p>
                                        </div>
                                    </div>
                                    ${councilDetails.length > 0 ? `
                                        <div class="mt-3">
                                            <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">Council Members</p>
                                            ${councilDetails.map(c => `<p class="text-xs"><strong>${A.esc(c.name)}</strong> <span class="text-slate-400">(${A.esc(c.portfolio || 'N/A')})</span></p>`).join('')}
                                        </div>
                                    ` : ''}
                                    ${trainerDetails.length > 0 ? `
                                        <div class="mt-3">
                                            <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">Trainers</p>
                                            ${trainerDetails.map(t => `<p class="text-xs"><strong>${A.esc(t.name)}</strong> <span class="text-slate-400">(${A.esc(t.portfolio || 'N/A')})</span></p>`).join('')}
                                        </div>
                                    ` : ''}
                                </div>` : ''}

                                <div class="pt-4 border-t border-slate-200/40 dark:border-white/[0.04]">
                                    <p class="text-[10px] text-slate-400 uppercase font-bold mb-1.5">Description</p>
                                    <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-line">${A.esc(event.description || '---')}</p>
                                </div>

                                ${event.report_submitted ? `
                                    <div class="pt-4 border-t border-slate-200/40 dark:border-white/[0.04]">
                                        <p class="text-[10px] text-slate-400 uppercase font-bold mb-1.5">Report Statistics</p>
                                        <div class="grid grid-cols-3 gap-2 text-xs">
                                            <div class="p-2 rounded-lg bg-blue-500/5 text-center">
                                                <p class="text-[9px] text-slate-500">Beneficiaries</p>
                                                <p class="font-bold text-blue-600">${event.beneficiaries_count || 0}</p>
                                            </div>
                                            <div class="p-2 rounded-lg bg-green-500/5 text-center">
                                                <p class="text-[9px] text-slate-500">Volunteers</p>
                                                <p class="font-bold text-green-600">${event.volunteers_count || 0}</p>
                                            </div>
                                            <div class="p-2 rounded-lg bg-purple-500/5 text-center">
                                                <p class="text-[9px] text-slate-500">Hours</p>
                                                <p class="font-bold text-purple-600">${event.service_hours || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>`,
                    footer: `
                        <button type="button" class="btn-secondary" onclick="AdminPanel.closeModal()">Close</button>
                        ${event.report_submitted ? `<button type="button" class="btn-secondary" onclick="AdminEvents.downloadReport('${A.esc(event.id)}')"><i class="fa-solid fa-download mr-1"></i> Download</button>` : ''}
                        <button type="button" class="btn-secondary" onclick="AdminPanel.closeModal(); AdminEvents.openReportForm('${A.esc(event.id)}')"><i class="fa-solid fa-file-pen mr-1"></i> Report</button>
                        <button type="button" class="btn-primary" onclick="AdminEvents.openCreateForm('${A.esc(event.id)}')"><i class="fa-solid fa-pen mr-1"></i> Edit</button>`
                });
            } catch (e) {
                A.notify('error', 'Failed: ' + (e?.message || e));
            }
        },

        async deleteEvent(eventId) {
            if (!confirm('Permanently delete this project?')) return;
            try {
                await ProjectsStore.remove(eventId);
                window.AdminPanel.notify('success', 'Project deleted.');
                await this.loadEvents();
                if (typeof window.renderAllProjects === 'function') window.renderAllProjects();
            } catch (e) {
                window.AdminPanel.notify('error', 'Delete failed: ' + e.message);
            }
        },

        async emailProject(eventId, silent) {
            const A = window.AdminPanel;
            try {
                const projects = await ProjectsStore.get();
                const ev = projects.find(p => p.id === eventId);
                if (!ev) { A.notify('error', 'Project not found.'); return; }

                if (!silent && !confirm(`Email the announcement for "${ev.event_name}" (with poster) to all active members?`)) return;

                window.AppToast?.info('Sending project announcement...');
                const recipients = await getMemberRecipients();
                if (recipients.length === 0) { A.notify('warning', 'No recipients found.'); return; }

                const result = await postToScript({
                    type: 'project_notification',
                    recipients,
                    event: {
                        event_name: ev.event_name, date: ev.date, start_time: ev.start_time, end_time: ev.end_time,
                        venue: ev.venue, avenue_slug: ev.avenue_slug, event_chair: ev.event_chair, description: ev.description,
                        poster_url: ev.poster_url, has_collaboration: ev.has_collaboration, collaborator_name: ev.collaborator_name,
                        collaboration_type: ev.collaboration_type, is_dpp: !!ev.is_dpp, dpp_project_number: ev.dpp_project_number,
                        dpp_pillar: ev.dpp_pillar, dpp_category: ev.dpp_category
                    },
                    sender: currentSender()
                });

                A.notify('success', `Announcement emailed to ${result.recipients_count || recipients.length} members.`);
                if (A.logActivity) A.logActivity('EVENT_EMAIL', 'event', eventId, { name: ev.event_name, recipients: recipients.length });
            } catch (err) {
                console.error('Project email failed:', err);
                A.notify('error', 'Email failed: ' + err.message);
            }
        },

        openReportForm(id) {
            if (window.Reports?.openReportForm) {
                window.Reports.openReportForm(id);
            } else {
                window.AdminPanel.notify('error', 'Reports module not loaded.');
            }
        },

        downloadReport(id) {
            if (window.Reports?.generateDocument) {
                window.Reports.generateDocument(id, 'pdf');
            } else {
                window.AdminPanel.notify('error', 'Reports module not loaded.');
            }
        },

        // ==========================================
        // 12. HELPERS
        // ==========================================
        // Safely read a stored JSON list (works for text or jsonb columns)
        parseJsonList(value) {
            let v = value;
            try {
                if (typeof v === 'string' && v.trim()) v = JSON.parse(v);
                if (typeof v === 'string' && v.trim()) v = JSON.parse(v);
            } catch (e) { return []; }
            return Array.isArray(v) ? v.filter(x => x && x.name) : [];
        },

        formatAvenue(slug) {
            const map = {
                club_service: 'Club Service',
                community_service: 'Community Service',
                professional_service: 'Professional Service',
                international_service: 'International Service',
                dpp: 'District Priority Projects'
            };
            return map[slug] || (slug ? String(slug).replace(/_/g, ' ') : '---');
        },

        formatStatus(status) {
            const map = { 
                draft: 'Draft', 
                pending_approval: 'Pending Approval', 
                approved: 'Approved', 
                completed: 'Completed', 
                cancelled: 'Cancelled' 
            };
            return map[status] || status || 'Draft';
        },

        renderUnauthorized() {
            return `
                <div class="p-6">
                    <div class="admin-panel">
                        <div class="admin-panel-body">
                            <div class="empty-state py-20">
                                <i class="fa-solid fa-lock empty-state-icon text-red-500"></i>
                                <h4 class="empty-state-title">Access Restricted</h4>
                                <p class="empty-state-desc">You do not have permission to view this section.</p>
                            </div>
                        </div>
                    </div>
                </div>`;
        }
    };

    window.AdminEvents = AdminEvents;
})();