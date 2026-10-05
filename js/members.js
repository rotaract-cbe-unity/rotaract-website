// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Advanced Members Management System
// File: js/members.js | Version: 6.0.0
// Multi-Portfolio Support | No Password Mgmt
// Full CRUD | Role Management | Analytics
// ============================================

(function () {
    'use strict';

    const AdminMembers = {
        // State
        currentView: 'directory',
        currentPage: 1,
        pageSize: 20,
        searchQuery: '',
        roleFilter: 'all',
        statusFilter: 'all',
        bloodFilter: 'all',
        avenueFilter: 'all',
        sortBy: 'role',
        sortDir: 'asc',
        selectedMembers: [],
        allMembers: [],
        canManage: false,
        formPortfolios: [], // Multi-portfolio array for form

        // Role sort weights (controls directory ordering)
        ROLE_WEIGHTS: {
            super_admin: 1, president: 2, ipp: 3, vice_president: 4,
            secretary: 5, secretary_admin: 6, secretary_comm: 7,
            treasurer: 8, advisor: 9,
            avenue_director: 10, avenue_chair: 11,
            dpp_chair: 12, blood_donor_chair: 13, club_editor: 14,
            young_leaders_contact: 15, public_image_chair: 16,
            membership_chair: 17, trf_chair: 18,
            board_member: 19, member: 20
        },

        // Complete portfolio catalog (matches attendance.html)
        PORTFOLIO_CATALOG: {
            'Executive Board': [
                'President',
                'Vice President',
                'Immediate Past President'
            ],
            'Secretariat': [
                'Secretary',
                'Secretary - Administration',
                'Secretary - Communication',
                'Joint Secretary'
            ],
            'Finance': [
                'Treasurer'
            ],
            'Avenue Directors': [
                'Director - Club Service',
                'Director - Community Service',
                'Director - Professional Service',
                'Director - International Service'
            ],
            'Chairpersons': [
                'DPP Chair',
                'Club Service Chair',
                'Community Service Chair',
                'Professional Service Chair',
                'International Service Chair',
                'Public Image Chair',
                'Blood Donor Cell Chair',
                'Club Foundation Chair',
                'Club Membership Growth Chair',
                'Social Media Chair'
            ],
            'Appointed Roles': [
                'Sergeant At Arms',
                'Club Editor',
                'Club Advisor',
                'Club Mentor',
                "President's Special Aide",
                'Rotaract Learning Facilitator',
                'Rotary Community Corps Advisor',
                'Young Leaders Contact'
            ],
            'General': [
                'Member'
            ]
        },

        // ==========================================
        // 1. MAIN RENDER
        // ==========================================
        async render(workspace) {
            if (!workspace) return;

            if (!window.AuthManager?.hasAccess?.('manage_members') && !window.AuthManager?.hasAccess?.('members_view')) {
                workspace.innerHTML = this.renderUnauthorized();
                return;
            }

            this.canManage = window.AuthManager?.hasAccess?.('manage_members');

            workspace.innerHTML = `
                <div class="admin-page-header">
                    <div>
                        <div class="admin-breadcrumb">
                            <i class="fa-solid fa-house"></i>
                            <span>/</span>
                            <span>Members Desk</span>
                        </div>
                        <h1 class="admin-page-title">Members Command Center</h1>
                        <p class="admin-page-subtitle">Complete member directory with multi-portfolio management, applications review, and analytics.</p>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        ${this.canManage ? `
                            <button class="btn-primary" onclick="AdminMembers.openMemberForm()">
                                <i class="fa-solid fa-user-plus"></i> Add Member
                            </button>
                            <button class="btn-secondary btn-sm" onclick="AdminMembers.showBulkActionsMenu()" id="bulk-actions-btn" ${this.selectedMembers.length === 0 ? 'disabled' : ''}>
                                <i class="fa-solid fa-check-double"></i> Bulk Actions (<span id="bulk-count">0</span>)
                            </button>
                            <button class="btn-secondary btn-sm" onclick="AdminMembers.showExportMenu()">
                                <i class="fa-solid fa-download"></i> Export
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- View Tabs -->
                <div class="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
                    <button class="member-tab-btn active" data-view="directory" onclick="AdminMembers.switchView('directory')">
                        <i class="fa-solid fa-address-book mr-1.5"></i>Directory
                    </button>
                    <button class="member-tab-btn" data-view="analytics" onclick="AdminMembers.switchView('analytics')">
                        <i class="fa-solid fa-chart-pie mr-1.5"></i>Analytics
                    </button>
                    <button class="member-tab-btn" data-view="birthdays" onclick="AdminMembers.switchView('birthdays')">
                        <i class="fa-solid fa-cake-candles mr-1.5"></i>Birthdays
                    </button>
                    <button class="member-tab-btn" data-view="blood_donors" onclick="AdminMembers.switchView('blood_donors')">
                        <i class="fa-solid fa-droplet mr-1.5"></i>Blood Donors
                    </button>
                    <button class="member-tab-btn" data-view="past_leaders" onclick="AdminMembers.switchView('past_leaders')">
                        <i class="fa-solid fa-timeline mr-1.5"></i>Past Leaders
                    </button>
                    <button class="member-tab-btn" data-view="trainers" onclick="AdminMembers.switchView('trainers')">
                        <i class="fa-solid fa-chalkboard-user mr-1.5"></i>Trainers
                    </button>
                </div>

                <div id="members-view-container"></div>
            `;

            this.injectStyles();
            await this.switchView('directory');
        },

        injectStyles() {
            if (document.getElementById('members-styles')) return;
            const style = document.createElement('style');
            style.id = 'members-styles';
            style.textContent = `
                .member-tab-btn {
                    padding: 10px 18px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    transition: all 180ms;
                    white-space: nowrap;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                }
                .member-tab-btn:hover {
                    border-color: var(--border-brand);
                    color: var(--blue);
                }
                .member-tab-btn.active {
                    background: linear-gradient(135deg, var(--blue), var(--purple));
                    color: white;
                    border-color: transparent;
                    box-shadow: 0 4px 16px rgba(26,115,232,0.25);
                }
                .member-grid-card {
                    position: relative;
                    padding: 20px;
                    border-radius: var(--radius-2xl);
                    background: var(--bg-card);
                    backdrop-filter: blur(12px);
                    border: 1px solid var(--border);
                    transition: all 180ms;
                    overflow: hidden;
                }
                .member-grid-card::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, var(--blue), var(--purple));
                    opacity: 0;
                    transition: opacity 180ms;
                }
                .member-grid-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                    border-color: var(--border-brand);
                }
                .member-grid-card:hover::after { opacity: 1; }
                .member-grid-card.selected {
                    border-color: var(--blue);
                    box-shadow: 0 0 0 2px rgba(26,115,232,0.2);
                }
                .member-grid-card.selected::after { opacity: 1; }
                .member-avatar-photo {
                    width: 72px;
                    height: 72px;
                    border-radius: var(--radius-lg);
                    object-fit: cover;
                    border: 2px solid var(--border);
                    transition: all 300ms;
                }
                .member-grid-card:hover .member-avatar-photo {
                    border-color: var(--blue);
                    border-radius: 50%;
                }
                .blood-group-tag {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: var(--radius-sm);
                    font-size: 10px;
                    font-weight: 800;
                    background: rgba(239,68,68,0.08);
                    color: var(--red);
                    flex-shrink: 0;
                }
                .portfolio-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 8px;
                    border-radius: 100px;
                    font-size: 9px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    margin: 2px;
                    white-space: nowrap;
                }
                .portfolio-pill.executive {
                    background: linear-gradient(135deg, rgba(26,115,232,0.15), rgba(124,58,237,0.15));
                    color: var(--blue);
                    border: 1px solid rgba(26,115,232,0.3);
                }
                .portfolio-pill.board {
                    background: rgba(234,179,8,0.1);
                    color: var(--yellow-dark);
                    border: 1px solid rgba(234,179,8,0.25);
                }
                .portfolio-pill.member {
                    background: rgba(100,116,139,0.08);
                    color: var(--text-tertiary);
                    border: 1px solid rgba(100,116,139,0.15);
                }
                .form-portfolio-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 12px;
                    border-radius: 100px;
                    font-size: 11px;
                    font-weight: 700;
                    background: rgba(26,115,232,0.08);
                    color: var(--blue);
                    border: 1px solid rgba(26,115,232,0.2);
                }
                .form-portfolio-tag .remove-tag {
                    cursor: pointer;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                    width: 16px;
                    height: 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: rgba(26,115,232,0.15);
                }
                .form-portfolio-tag .remove-tag:hover {
                    opacity: 1;
                    background: rgba(239,68,68,0.2);
                    color: var(--red);
                }
                .status-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 6px;
                }
                .status-dot.active { background: var(--green); box-shadow: 0 0 8px rgba(34,197,94,0.4); }
                .status-dot.inactive { background: var(--text-tertiary); }
                .checkbox-wrapper {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    z-index: 2;
                    opacity: 0;
                    transition: opacity 180ms;
                }
                .member-grid-card:hover .checkbox-wrapper,
                .member-grid-card.selected .checkbox-wrapper {
                    opacity: 1;
                }
                .birthday-highlight {
                    animation: birthdayPulse 2s ease-in-out infinite;
                }
                @keyframes birthdayPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(236,72,153,0.4); }
                    50% { box-shadow: 0 0 0 10px rgba(236,72,153,0); }
                }
            `;
            document.head.appendChild(style);
        },

        async switchView(view) {
            this.currentView = view;
            document.querySelectorAll('.member-tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-view') === view);
            });

            const container = document.getElementById('members-view-container');
            if (!container) return;
            container.innerHTML = '<div class="skeleton-line w-full" style="height:300px;"></div>';

            try {
                switch (view) {
                    case 'directory': await this.renderDirectory(container); break;
                    case 'analytics': await this.renderAnalytics(container); break;
                    case 'birthdays': await this.renderBirthdays(container); break;
                    case 'blood_donors': await this.renderBloodDonors(container); break;
                    case 'past_leaders': await this.renderPastLeaders(container); break;
                    case 'trainers': await this.renderTrainers(container); break;
                }
            } catch (e) {
                container.innerHTML = `<div class="empty-state py-16"><i class="fa-solid fa-triangle-exclamation empty-state-icon text-red-500"></i><p class="empty-state-desc">Error: ${e.message}</p></div>`;
            }
        },

        // ==========================================
        // 2. DIRECTORY VIEW
        // ==========================================
        async renderDirectory(container) {
            container.innerHTML = `
                <div class="admin-panel mb-5">
                    <div class="admin-panel-header flex-wrap gap-3">
                        <div class="flex items-center gap-2 flex-wrap flex-1">
                            <div class="relative flex-1 min-w-[220px] max-w-md">
                                <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] pointer-events-none"></i>
                                <input type="text" id="member-search" placeholder="Search by name, email, phone, RI ID, portfolio..." value="${this.searchQuery}"
                                    class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-blue/50"
                                    oninput="AdminMembers.onSearchChange(this.value)">
                            </div>
                            <select onchange="AdminMembers.onRoleFilter(this.value)" class="px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer">
                                <option value="all">All Roles</option>
                                <optgroup label="Executive">
                                    <option value="president">President</option>
                                    <option value="ipp">Immediate Past President</option>
                                    <option value="vice_president">Vice President</option>
                                    <option value="secretary">Secretary</option>
                                    <option value="secretary_admin">Secretary - Admin</option>
                                    <option value="secretary_comm">Secretary - Comm</option>
                                    <option value="treasurer">Treasurer</option>
                                </optgroup>
                                <optgroup label="Board">
                                    <option value="avenue_director">Avenue Director</option>
                                    <option value="avenue_chair">Avenue Chair</option>
                                    <option value="dpp_chair">DPP Chair</option>
                                    <option value="board_member">Board Member</option>
                                </optgroup>
                                <option value="member">Member</option>
                            </select>
                            <select onchange="AdminMembers.onBloodFilter(this.value)" class="px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer">
                                <option value="all">All Blood Groups</option>
                                <option value="A+">A+</option><option value="A-">A-</option>
                                <option value="B+">B+</option><option value="B-">B-</option>
                                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                <option value="O+">O+</option><option value="O-">O-</option>
                            </select>
                            <select onchange="AdminMembers.onStatusFilter(this.value)" class="px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer">
                                <option value="all">All Status</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                            <button onclick="AdminMembers.clearFilters()" class="px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors" title="Clear">
                                <i class="fa-solid fa-filter-circle-xmark"></i>
                            </button>
                        </div>
                    </div>
                    <div id="members-summary-bar" class="px-6 py-3 border-b border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.02]"></div>
                </div>

                <div id="members-grid-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
                <div id="members-pagination-container" class="mt-6"></div>
            `;

            await this.loadMembersData();
        },

        async loadMembersData() {
            const container = document.getElementById('members-grid-container');
            if (!container) return;

            try {
                // Super Admin is a system account, not a club member: it is never listed
                // here for anyone (manage it from Admin Users).
                let query = window.DB_ADMIN.from('users').select('*', { count: 'exact' }).neq('role', 'super_admin');

                if (this.searchQuery) {
                    const q = `%${this.searchQuery}%`;
                    query = query.or(`full_name.ilike.${q},email.ilike.${q},phone.ilike.${q},ri_id.ilike.${q},portfolio.ilike.${q}`);
                }
                if (this.roleFilter !== 'all') query = query.eq('role', this.roleFilter);
                if (this.bloodFilter !== 'all') query = query.eq('blood_group', this.bloodFilter);
                if (this.statusFilter === 'active') query = query.eq('is_active', true);
                else if (this.statusFilter === 'inactive') query = query.eq('is_active', false);

                const offset = (this.currentPage - 1) * this.pageSize;
                query = query.range(offset, offset + this.pageSize - 1);

                const { data, count, error } = await query;
                if (error) throw error;

                // Sort by role weight
                const sorted = (data || []).sort((a, b) => {
                    const wA = this.ROLE_WEIGHTS[a.role] || 99;
                    const wB = this.ROLE_WEIGHTS[b.role] || 99;
                    if (wA !== wB) return wA - wB;
                    return (a.full_name || '').localeCompare(b.full_name || '');
                });

                this.allMembers = sorted;
                this.renderMembersGrid(sorted, count || 0);
                this.renderSummaryBar(sorted, count || 0);
            } catch (e) {
                container.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-red-500">${e.message}</div>`;
            }
        },

        renderSummaryBar(members, totalCount) {
            const container = document.getElementById('members-summary-bar');
            if (!container) return;
            const active = members.filter(m => m.is_active).length;
            const executive = members.filter(m => this.isExecutive(m.role)).length;
            const board = members.filter(m => this.isBoardOnly(m.role) || m.is_board_member).length;

            container.innerHTML = `
                <div class="flex items-center justify-between text-xs flex-wrap gap-3">
                    <div class="flex items-center gap-4 flex-wrap">
                        <span><strong class="text-slate-500">Showing:</strong> ${members.length} of ${totalCount}</span>
                        <span><strong class="text-green-500">Active:</strong> ${active}</span>
                        <span><strong class="text-brand-blue">Executive:</strong> ${executive}</span>
                        <span><strong class="text-yellow-500">Board:</strong> ${board}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        ${this.selectedMembers.length > 0 ? `
                            <button onclick="AdminMembers.clearSelection()" class="text-[10px] font-bold text-red-500 hover:underline">
                                <i class="fa-solid fa-xmark"></i> Deselect All (${this.selectedMembers.length})
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        },

        renderMembersGrid(members, totalCount) {
            const container = document.getElementById('members-grid-container');
            if (!container) return;

            if (members.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full empty-state py-16">
                        <i class="fa-solid fa-users empty-state-icon"></i>
                        <h4 class="empty-state-title">No Members Found</h4>
                        <p class="empty-state-desc">${this.canManage ? 'Add your first member to get started.' : 'Try adjusting filters.'}</p>
                        ${this.canManage ? '<button class="btn-primary mt-4" onclick="AdminMembers.openMemberForm()"><i class="fa-solid fa-user-plus"></i> Add Member</button>' : ''}
                    </div>
                `;
                document.getElementById('members-pagination-container').innerHTML = '';
                return;
            }

            container.innerHTML = members.map(m => this.renderMemberCard(m)).join('');
            this.renderPagination(totalCount);
        },

        renderMemberCard(m) {
            const photo = m.photo_url ? (window.Uploader?.getThumbnailUrl?.(m.photo_url, m.photo_provider || 'cloudinary', 200) || m.photo_url) : '';
            const isSelected = this.selectedMembers.includes(m.id);
            const roleTier = this.getRoleTier(m.role);

            // Parse portfolios (comma-separated)
            const portfolios = (m.portfolio || '').split(',').map(p => p.trim()).filter(Boolean);

            return `
                <div class="member-grid-card ${isSelected ? 'selected' : ''}" data-id="${m.id}">
                    ${this.canManage ? `
                        <div class="checkbox-wrapper">
                            <input type="checkbox" ${isSelected ? 'checked' : ''}
                                class="w-5 h-5 accent-brand-blue cursor-pointer"
                                onchange="AdminMembers.toggleSelection('${m.id}', this.checked)"
                                onclick="event.stopPropagation();">
                        </div>
                    ` : ''}

                    <div class="flex items-start gap-3 mb-3">
                        ${photo
                            ? `<img src="${photo}" alt="${window.escapeHtml(m.full_name)}" class="member-avatar-photo" loading="lazy">`
                            : `<div class="member-avatar-photo bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-user text-xl text-brand-blue"></i></div>`
                        }
                        <div class="flex-1 min-w-0">
                            <h4 class="text-sm font-bold truncate" title="${window.escapeHtml(m.full_name)}">${window.escapeHtml(m.full_name)}</h4>
                            ${m.ri_id ? `<p class="text-[9px] text-slate-400 mt-1 font-mono">RI: ${window.escapeHtml(m.ri_id)}</p>` : ''}
                            ${m.email ? `<p class="text-[9px] text-slate-400 truncate" title="${window.escapeHtml(m.email)}">${window.escapeHtml(m.email)}</p>` : ''}
                        </div>
                        ${m.blood_group ? `<span class="blood-group-tag" title="Blood Group">${m.blood_group}</span>` : ''}
                    </div>

                    <!-- Portfolio Pills -->
                    <div class="flex flex-wrap gap-1 mb-3 min-h-[22px]">
                        ${portfolios.length > 0
                            ? portfolios.map(p => `<span class="portfolio-pill ${roleTier}" title="${window.escapeHtml(p)}">${window.escapeHtml(p)}</span>`).join('')
                            : `<span class="portfolio-pill member">Member</span>`
                        }
                        ${m.is_board_member && !this.isExecutive(m.role) ? '<span class="portfolio-pill board"><i class="fa-solid fa-shield-halved mr-0.5"></i>Board</span>' : ''}
                    </div>

                    <div class="pt-3 border-t border-slate-100/60 dark:border-white/[0.05] space-y-1.5">
                        ${m.phone ? `<p class="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-2"><i class="fa-solid fa-phone text-[9px] text-slate-400 w-3"></i>${window.escapeHtml(m.phone)}</p>` : ''}
                        ${m.profession ? `<p class="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-2"><i class="fa-solid fa-briefcase text-[9px] text-slate-400 w-3"></i>${window.escapeHtml(m.profession)}</p>` : ''}
                    </div>

                    <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/60 dark:border-white/[0.05]">
                        <div class="flex items-center gap-1">
                            <span class="status-dot ${m.is_active ? 'active' : 'inactive'}"></span>
                            <span class="text-[9px] font-bold uppercase tracking-wider ${m.is_active ? 'text-green-600' : 'text-slate-400'}">${m.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="AdminMembers.viewMember('${m.id}')" class="w-7 h-7 rounded-lg hover:bg-brand-blue/10 text-slate-400 hover:text-brand-blue transition-colors" title="View Profile">
                                <i class="fa-solid fa-eye text-[11px]"></i>
                            </button>
                            ${this.canManage ? `
                                <button onclick="AdminMembers.openMemberForm('${m.id}')" class="w-7 h-7 rounded-lg hover:bg-brand-blue/10 text-slate-400 hover:text-brand-blue transition-colors" title="Edit">
                                    <i class="fa-solid fa-pen text-[11px]"></i>
                                </button>
                                <button onclick="AdminMembers.showMoreActions('${m.id}')" class="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" title="More Actions">
                                    <i class="fa-solid fa-ellipsis-vertical text-[11px]"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        },

        renderPagination(totalCount) {
            const pagEl = document.getElementById('members-pagination-container');
            if (!pagEl) return;
            const totalPages = Math.ceil(totalCount / this.pageSize);
            if (totalPages <= 1) {
                pagEl.innerHTML = '';
                return;
            }
            let btns = '';
            for (let i = Math.max(1, this.currentPage - 2); i <= Math.min(totalPages, this.currentPage + 2); i++) {
                btns += `<button class="admin-pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="AdminMembers.goToPage(${i})">${i}</button>`;
            }
            pagEl.innerHTML = `
                <div class="flex items-center justify-center gap-1">
                    <button class="admin-pagination-btn" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="AdminMembers.goToPage(${this.currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>
                    ${btns}
                    <button class="admin-pagination-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="AdminMembers.goToPage(${this.currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            `;
        },

        // ==========================================
        // 3. MEMBER FORM (Multi-Portfolio, No Password)
        // ==========================================
        async openMemberForm(memberId) {
            if (!this.canManage) {
                window.AppToast?.error('Permission denied');
                return;
            }

            let existing = null;
            if (memberId) {
                const { data } = await window.DB_ADMIN.from('users').select('*').eq('id', memberId).single();
                existing = data;
                // Parse portfolios from comma-separated string
                this.formPortfolios = (existing?.portfolio || '').split(',').map(p => p.trim()).filter(Boolean);
            } else {
                this.formPortfolios = [];
            }

            window.AdminPanel.createModal({
                title: existing ? 'Edit Member Profile' : 'Add New Member',
                size: 'wide',
                icon: 'user',
                body: `
                    <form id="member-form" onsubmit="return false;" class="space-y-5">
                        <!-- Info Banner -->
                        <div class="p-4 rounded-xl bg-blue-500/[0.04] border border-blue-500/15">
                            <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                <i class="fa-solid fa-circle-info mr-1"></i>
                                This form manages member profiles and board membership. For admin user accounts (with login access), use the <strong>Admin Users</strong> module.
                            </p>
                        </div>

                        <!-- Personal Info -->
                        <div class="admin-form-section">
                            <div class="admin-form-section-title"><i class="fa-solid fa-user"></i> Personal Information</div>
                            <div class="admin-form-grid">
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Full Name <span class="required">*</span></label>
                                    <input type="text" name="full_name" required class="admin-form-input" value="${window.escapeHtml(existing?.full_name || '')}" placeholder="Rtr. First Last">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Email Address <span class="required">*</span></label>
                                    <input type="email" name="email" required class="admin-form-input" value="${window.escapeHtml(existing?.email || '')}" placeholder="email@example.com">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Phone Number</label>
                                    <input type="tel" name="phone" class="admin-form-input" value="${window.escapeHtml(existing?.phone || '')}" placeholder="+91 XXXXX XXXXX">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Date of Birth</label>
                                    <input type="date" name="date_of_birth" class="admin-form-input" value="${existing?.date_of_birth || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Blood Group</label>
                                    <select name="blood_group" class="admin-form-input admin-form-select">
                                        <option value="">Select</option>
                                        ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => `<option value="${bg}" ${existing?.blood_group === bg ? 'selected' : ''}>${bg}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Profession</label>
                                    <input type="text" name="profession" class="admin-form-input" value="${window.escapeHtml(existing?.profession || '')}" placeholder="Student / Engineer / Entrepreneur">
                                </div>
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Address</label>
                                    <textarea name="address" rows="2" class="admin-form-input admin-form-textarea" placeholder="Full address">${window.escapeHtml(existing?.address || '')}</textarea>
                                </div>
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Profile Photo</label>
                                    <div class="admin-upload-zone" id="photo-upload-zone">
                                        <input type="file" id="photo-upload-input" accept="image/*">
                                        <i class="fa-solid fa-cloud-arrow-up admin-upload-icon"></i>
                                        <p class="admin-upload-text">Upload profile photo</p>
                                        <p class="admin-upload-hint">Auto-compressed to ~50KB</p>
                                    </div>
                                    <div id="photo-preview-area" class="mt-3">
                                        ${existing?.photo_url ? `
                                            <div class="flex items-center gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                                <img src="${existing.photo_url}" class="w-14 h-14 rounded-full object-cover border-2 border-green-500">
                                                <div class="flex-1"><p class="text-xs font-bold text-green-600">Photo attached</p></div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Rotaract Info -->
                        <div class="admin-form-section">
                            <div class="admin-form-section-title"><i class="fa-solid fa-id-card"></i> Rotaract Information</div>
                            <div class="admin-form-grid">
                                <div class="admin-form-group">
                                    <label class="admin-form-label">RI Member ID</label>
                                    <input type="text" name="ri_id" class="admin-form-input font-mono" value="${window.escapeHtml(existing?.ri_id || '')}" placeholder="Rotary International ID">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Joined Date</label>
                                    <input type="date" name="joined_date" class="admin-form-input" value="${existing?.joined_date || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Rotary Year</label>
                                    <input type="text" name="rotary_year" class="admin-form-input" value="${existing?.rotary_year || (window.getRotaryYear ? window.getRotaryYear() : '2026-27')}" placeholder="2026-27">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Primary Role Tag <span class="text-slate-400 font-normal">(for ordering)</span></label>
                                    <select name="role" class="admin-form-input admin-form-select">
                                        <option value="member" ${!existing || existing.role === 'member' ? 'selected' : ''}>Member</option>
                                        <option value="board_member" ${existing?.role === 'board_member' ? 'selected' : ''}>Board Member</option>
                                        <option value="president" ${existing?.role === 'president' ? 'selected' : ''}>President</option>
                                        <option value="vice_president" ${existing?.role === 'vice_president' ? 'selected' : ''}>Vice President</option>
                                        <option value="ipp" ${existing?.role === 'ipp' ? 'selected' : ''}>Immediate Past President</option>
                                        <option value="secretary" ${existing?.role === 'secretary' ? 'selected' : ''}>Secretary</option>
                                        <option value="secretary_admin" ${existing?.role === 'secretary_admin' ? 'selected' : ''}>Secretary - Administration</option>
                                        <option value="secretary_comm" ${existing?.role === 'secretary_comm' ? 'selected' : ''}>Secretary - Communication</option>
                                        <option value="treasurer" ${existing?.role === 'treasurer' ? 'selected' : ''}>Treasurer</option>
                                        <option value="avenue_director" ${existing?.role === 'avenue_director' ? 'selected' : ''}>Avenue Director</option>
                                        <option value="avenue_chair" ${existing?.role === 'avenue_chair' ? 'selected' : ''}>Avenue Chair</option>
                                        <option value="dpp_chair" ${existing?.role === 'dpp_chair' ? 'selected' : ''}>DPP Chair</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- MULTI-PORTFOLIO SELECTOR -->
                        <div class="admin-form-section">
                            <div class="admin-form-section-title">
                                <i class="fa-solid fa-briefcase"></i> Portfolios Held
                                <span class="ml-auto text-[10px] font-normal text-slate-400">Member can hold multiple portfolios</span>
                            </div>

                            <div class="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 mb-4">
                                <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                    <i class="fa-solid fa-lightbulb mr-1"></i>
                                    Select all portfolios this member currently holds. Multiple selections are allowed.
                                </p>
                            </div>

                            <!-- Selected Portfolio Tags -->
                            <div id="form-selected-portfolios" class="flex flex-wrap gap-2 mb-3 min-h-[36px] p-2 rounded-lg border border-dashed border-slate-200 dark:border-white/[0.08]"></div>

                            <!-- Portfolio Selector Dropdown -->
                            <select id="portfolio-selector-dropdown" class="admin-form-input admin-form-select cursor-pointer" onchange="AdminMembers.addFormPortfolio(this.value); this.value='';">
                                <option value="">+ Add a portfolio...</option>
                                ${Object.entries(this.PORTFOLIO_CATALOG).map(([group, items]) => `
                                    <optgroup label="${group}">
                                        ${items.map(p => `<option value="${window.escapeHtml(p)}">${window.escapeHtml(p)}</option>`).join('')}
                                    </optgroup>
                                `).join('')}
                            </select>

                            <!-- Hidden input to collect portfolios -->
                            <input type="hidden" name="portfolio" id="portfolio-hidden" value="${window.escapeHtml(existing?.portfolio || '')}">
                            
                            <p class="text-[10px] text-slate-400 mt-2">
                                <i class="fa-solid fa-circle-info"></i> Selected portfolios will be shown on the website and used in meeting attendance records.
                            </p>
                        </div>

                        <!-- Status Toggles -->
                        <div class="admin-form-section">
                            <div class="admin-form-section-title"><i class="fa-solid fa-toggle-on"></i> Member Status</div>
                            <div class="space-y-3">
                                <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue transition-all">
                                    <input type="checkbox" name="is_board_member" class="w-4 h-4 accent-brand-blue" ${existing?.is_board_member ? 'checked' : ''}>
                                    <div>
                                        <p class="text-xs font-bold">Board Member</p>
                                        <p class="text-[10px] text-slate-400">Receives board meeting invitations and attends board meetings</p>
                                    </div>
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-green-500 transition-all">
                                    <input type="checkbox" name="is_active" class="w-4 h-4 accent-green-500" ${!existing || existing?.is_active !== false ? 'checked' : ''}>
                                    <div>
                                        <p class="text-xs font-bold">Active Member</p>
                                        <p class="text-[10px] text-slate-400">Visible on public website and receives all member communications</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="AdminMembers.submitMember('${memberId || ''}')">
                        <i class="fa-solid fa-save"></i> ${existing ? 'Update' : 'Create'} Member
                    </button>
                `
            });

            setTimeout(() => {
                this.bindPhotoUpload();
                this.renderFormPortfolios();
            }, 100);

            window._uploadedPhotoUrl = existing?.photo_url || '';
            window._uploadedPhotoProvider = existing?.photo_provider || '';
        },

        // ==========================================
        // MULTI-PORTFOLIO MANAGEMENT
        // ==========================================
        addFormPortfolio(value) {
            if (!value) return;
            if (this.formPortfolios.includes(value)) {
                window.AppToast?.warning('This portfolio is already selected');
                return;
            }
            this.formPortfolios.push(value);
            this.renderFormPortfolios();
        },

        removeFormPortfolio(index) {
            this.formPortfolios.splice(index, 1);
            this.renderFormPortfolios();
        },

        renderFormPortfolios() {
            const container = document.getElementById('form-selected-portfolios');
            const hidden = document.getElementById('portfolio-hidden');
            if (!container) return;

            if (this.formPortfolios.length === 0) {
                container.innerHTML = '<p class="text-[11px] text-slate-400 italic">No portfolios selected. Choose one from the dropdown below.</p>';
            } else {
                container.innerHTML = this.formPortfolios.map((p, i) => `
                    <span class="form-portfolio-tag">
                        ${window.escapeHtml(p)}
                        <span class="remove-tag" onclick="AdminMembers.removeFormPortfolio(${i})" title="Remove">
                            <i class="fa-solid fa-xmark text-[9px]"></i>
                        </span>
                    </span>
                `).join('');
            }

            if (hidden) hidden.value = this.formPortfolios.join(', ');
        },

        bindPhotoUpload() {
            const input = document.getElementById('photo-upload-input');
            if (!input) return;
            input.addEventListener('change', async (e) => {
                if (!e.target.files?.[0]) return;
                const preview = document.getElementById('photo-preview-area');
                preview.innerHTML = '<p class="text-xs text-slate-500 mt-2"><i class="fa-solid fa-spinner fa-spin"></i> Uploading...</p>';
                try {
                    const result = await window.Uploader.upload(e.target.files[0], { type: 'profile', folder: 'members' });
                    window._uploadedPhotoUrl = result.url;
                    window._uploadedPhotoProvider = result.provider;
                    preview.innerHTML = `
                        <div class="flex items-center gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                            <img src="${result.url}" class="w-14 h-14 rounded-full object-cover border-2 border-green-500">
                            <div class="flex-1"><p class="text-xs font-bold text-green-600">Uploaded via ${result.provider}</p></div>
                            <button type="button" onclick="AdminMembers.removePhoto()" class="w-8 h-8 rounded-lg hover:bg-red-500/10 text-red-500"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `;
                    window.AppToast?.success('Photo uploaded!');
                } catch (err) {
                    preview.innerHTML = `<p class="text-xs text-red-500">Upload failed: ${err.message}</p>`;
                }
            });
        },

        removePhoto() {
            window._uploadedPhotoUrl = '';
            window._uploadedPhotoProvider = '';
            const preview = document.getElementById('photo-preview-area');
            if (preview) preview.innerHTML = '';
        },

        async submitMember(memberId) {
            const form = document.getElementById('member-form');
            if (!form) return;
            const fd = new FormData(form);

            if (!fd.get('full_name') || !fd.get('email')) {
                window.AppToast?.warning('Full name and email are required');
                return;
            }

            // Collect portfolios from the multi-select
            const portfolioString = this.formPortfolios.join(', ');

            const payload = {
                full_name: fd.get('full_name'),
                email: fd.get('email'),
                phone: fd.get('phone') || null,
                date_of_birth: fd.get('date_of_birth') || null,
                blood_group: fd.get('blood_group') || null,
                profession: fd.get('profession') || null,
                address: fd.get('address') || null,
                ri_id: fd.get('ri_id') || null,
                joined_date: fd.get('joined_date') || null,
                rotary_year: fd.get('rotary_year') || null,
                portfolio: portfolioString || null,
                role: fd.get('role') || 'member',
                is_board_member: fd.get('is_board_member') === 'on',
                is_active: fd.get('is_active') === 'on',
                photo_url: window._uploadedPhotoUrl || null,
                photo_provider: window._uploadedPhotoProvider || null
            };

            try {
                if (memberId) {
                    // Update existing
                    await window.DB_ADMIN.from('users').update(payload).eq('id', memberId);
                    window.AppToast?.success('Member profile updated!');
                } else {
                    // Create new (without auth account - just member record)
                    payload.created_at = new Date().toISOString();
                    const { error } = await window.DB_ADMIN.from('users').insert(payload);
                    if (error) throw error;
                    window.AppToast?.success('Member added successfully!');
                }

                // Invalidate caches
                if (window.AppCache) {
                    window.AppCache.remove('office_bearers');
                    window.AppCache.remove('members_list');
                }

                if (window.AuthManager?.logActivity) {
                    window.AuthManager.logActivity(window.AuthManager.currentUser.id, memberId ? 'UPDATE' : 'CREATE', 'user', memberId);
                }

                window.AdminPanel.closeModal();
                await this.loadMembersData();
            } catch (e) {
                window.AppToast?.error('Save failed: ' + e.message);
            }
        },

        // ==========================================
        // 4. VIEW MEMBER
        // ==========================================
        async viewMember(id) {
            try {
                const { data: m } = await window.DB_ADMIN.from('users').select('*').eq('id', id).single();
                if (!m) return;

                const photo = m.photo_url ? (window.Uploader?.getThumbnailUrl?.(m.photo_url, 'cloudinary', 400) || m.photo_url) : '';
                const roleTier = this.getRoleTier(m.role);
                const age = m.date_of_birth ? this.calculateAge(m.date_of_birth) : null;
                const tenure = m.joined_date ? this.calculateTenure(m.joined_date) : null;
                const portfolios = (m.portfolio || '').split(',').map(p => p.trim()).filter(Boolean);

                window.AdminPanel.createModal({
                    title: m.full_name,
                    size: 'wide',
                    icon: 'user',
                    body: `
                        <div class="flex flex-col md:flex-row gap-6 mb-6">
                            <div class="flex-shrink-0 text-center">
                                ${photo
                                    ? `<img src="${photo}" class="w-32 h-32 rounded-2xl object-cover mx-auto border-4 border-brand-blue/20" alt="">`
                                    : `<div class="w-32 h-32 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center mx-auto"><i class="fa-solid fa-user text-5xl text-white/60"></i></div>`
                                }
                                <div class="mt-3 flex flex-col items-center gap-1">
                                    <div class="flex items-center gap-1">
                                        <span class="status-dot ${m.is_active ? 'active' : 'inactive'}"></span>
                                        <span class="text-[9px] font-bold uppercase ${m.is_active ? 'text-green-600' : 'text-slate-400'}">${m.is_active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    ${m.is_board_member ? '<span class="portfolio-pill board mt-1"><i class="fa-solid fa-shield-halved mr-0.5"></i>Board Member</span>' : ''}
                                </div>
                            </div>
                            <div class="flex-1 space-y-3">
                                <h3 class="text-xl font-black">${window.escapeHtml(m.full_name)}</h3>
                                
                                <!-- Portfolios Display -->
                                ${portfolios.length > 0 ? `
                                    <div>
                                        <p class="text-[9px] text-slate-400 uppercase font-bold mb-2">Portfolios Held</p>
                                        <div class="flex flex-wrap gap-1.5">
                                            ${portfolios.map(p => `<span class="portfolio-pill ${roleTier}">${window.escapeHtml(p)}</span>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <div class="grid grid-cols-2 gap-3 pt-3">
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold">Email</p><p class="text-xs font-bold">${window.escapeHtml(m.email || 'N/A')}</p></div>
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold">Phone</p><p class="text-xs font-bold">${window.escapeHtml(m.phone || 'N/A')}</p></div>
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold">Blood Group</p><p class="text-xs font-bold">${m.blood_group ? `<span class="blood-group-tag mr-2">${m.blood_group}</span>` : 'N/A'}</p></div>
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold">RI ID</p><p class="text-xs font-bold font-mono">${window.escapeHtml(m.ri_id || 'N/A')}</p></div>
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold">Date of Birth</p><p class="text-xs font-bold">${m.date_of_birth ? window.formatDate(m.date_of_birth) : 'N/A'} ${age ? `(${age}y)` : ''}</p></div>
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold">Joined</p><p class="text-xs font-bold">${m.joined_date ? window.formatDate(m.joined_date) : 'N/A'} ${tenure ? `(${tenure})` : ''}</p></div>
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold">Profession</p><p class="text-xs font-bold">${window.escapeHtml(m.profession || 'N/A')}</p></div>
                                    <div><p class="text-[9px] text-slate-400 uppercase font-bold">Rotary Year</p><p class="text-xs font-bold">${window.escapeHtml(m.rotary_year || 'N/A')}</p></div>
                                </div>
                                ${m.address ? `<div class="pt-3 border-t border-slate-100 dark:border-white/[0.06]"><p class="text-[9px] text-slate-400 uppercase font-bold">Address</p><p class="text-xs">${window.escapeHtml(m.address)}</p></div>` : ''}
                            </div>
                        </div>
                    `,
                    footer: `
                        <button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Close</button>
                        ${this.canManage ? `<button class="btn-primary" onclick="window.AdminPanel.closeModal();AdminMembers.openMemberForm('${id}');"><i class="fa-solid fa-pen"></i> Edit Profile</button>` : ''}
                    `
                });
            } catch (e) {
                window.AppToast?.error('Failed to load profile');
            }
        },

        // ==========================================
        // 5. MORE ACTIONS MENU (No Password Reset)
        // ==========================================
        async showMoreActions(id) {
            const { data: m } = await window.DB_ADMIN.from('users').select('*').eq('id', id).single();
            if (!m) return;

            window.AdminPanel.createModal({
                title: 'Actions — ' + m.full_name,
                size: 'narrow',
                icon: 'ellipsis-vertical',
                body: `
                    <div class="space-y-2">
                        <button class="w-full p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left flex items-center gap-3" onclick="AdminMembers.sendBirthdayWish('${id}');window.AdminPanel.closeModal();">
                            <div class="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center"><i class="fa-solid fa-cake-candles text-pink-500"></i></div>
                            <div><p class="text-xs font-bold">Send Birthday Wish</p><p class="text-[10px] text-slate-400">Trigger email</p></div>
                        </button>
                        <button class="w-full p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-${m.is_active ? 'red' : 'green'}-500 hover:bg-${m.is_active ? 'red' : 'green'}-500/5 transition-all text-left flex items-center gap-3" onclick="AdminMembers.toggleActive('${id}', ${!m.is_active});window.AdminPanel.closeModal();">
                            <div class="w-9 h-9 rounded-lg bg-${m.is_active ? 'red' : 'green'}-500/10 flex items-center justify-center"><i class="fa-solid fa-${m.is_active ? 'user-slash' : 'user-check'} text-${m.is_active ? 'red' : 'green'}-500"></i></div>
                            <div><p class="text-xs font-bold">${m.is_active ? 'Deactivate' : 'Activate'} Member</p><p class="text-[10px] text-slate-400">${m.is_active ? 'Remove from active list' : 'Restore to active'}</p></div>
                        </button>
                        ${m.role !== 'super_admin' ? `
                            <button class="w-full p-3 rounded-xl border border-red-500/30 hover:border-red-500 hover:bg-red-500/5 transition-all text-left flex items-center gap-3" onclick="AdminMembers.deleteMember('${id}', '${window.escapeHtml(m.full_name)}');window.AdminPanel.closeModal();">
                                <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center"><i class="fa-solid fa-trash text-red-500"></i></div>
                                <div><p class="text-xs font-bold text-red-500">Delete Permanently</p><p class="text-[10px] text-slate-400">Cannot be undone</p></div>
                            </button>
                        ` : ''}
                    </div>
                `
            });
        },

        async sendBirthdayWish(id) {
            try {
                const { data: m } = await window.DB_ADMIN.from('users').select('*').eq('id', id).single();
                const gasUrl = window.SiteSettings?.get?.('google_apps_script_url');
                if (!gasUrl) { window.AppToast?.warning('GAS URL not configured'); return; }

                await fetch(gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'birthday_wish',
                        member: { full_name: m.full_name, email: m.email, photo_url: m.photo_url }
                    })
                });

                window.AppToast?.success('Birthday wish sent!');
            } catch (e) {
                window.AppToast?.error('Failed: ' + e.message);
            }
        },

        async toggleActive(id, newState) {
            try {
                await window.DB_ADMIN.from('users').update({ is_active: newState }).eq('id', id);
                window.AppToast?.success('Member ' + (newState ? 'activated' : 'deactivated'));
                await this.loadMembersData();
            } catch (e) {
                window.AppToast?.error('Update failed: ' + e.message);
            }
        },

        async deleteMember(id, name) {
            if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
            try {
                await window.DB_ADMIN.from('users').delete().eq('id', id);
                window.AppToast?.success('Member deleted');
                await this.loadMembersData();
            } catch (e) {
                window.AppToast?.error('Delete failed: ' + e.message);
            }
        },

        // ==========================================
        // 6. ANALYTICS VIEW
        // ==========================================
        async renderAnalytics(container) {
            const { data: all } = await window.DB_ADMIN.from('users').select('*').neq('role', 'super_admin');
            const members = all || [];

            const total = members.length;
            const active = members.filter(m => m.is_active).length;
            const executive = members.filter(m => this.isExecutive(m.role)).length;
            const board = members.filter(m => m.is_board_member).length;

            // Blood group distribution
            const bloodDist = {};
            members.forEach(m => {
                if (m.blood_group) bloodDist[m.blood_group] = (bloodDist[m.blood_group] || 0) + 1;
            });

            // Portfolio distribution
            const portfolioDist = {};
            members.forEach(m => {
                const portfolios = (m.portfolio || '').split(',').map(p => p.trim()).filter(Boolean);
                portfolios.forEach(p => {
                    portfolioDist[p] = (portfolioDist[p] || 0) + 1;
                });
            });

            // Birthday month distribution
            const monthDist = Array(12).fill(0);
            members.forEach(m => {
                if (m.date_of_birth) {
                    const month = new Date(m.date_of_birth).getMonth();
                    monthDist[month]++;
                }
            });

            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                    <div class="admin-stat-card blue"><div class="admin-stat-icon blue"><i class="fa-solid fa-users"></i></div><div class="admin-stat-value">${total}</div><div class="admin-stat-label">Total Members</div></div>
                    <div class="admin-stat-card green"><div class="admin-stat-icon green"><i class="fa-solid fa-user-check"></i></div><div class="admin-stat-value">${active}</div><div class="admin-stat-label">Active</div></div>
                    <div class="admin-stat-card purple"><div class="admin-stat-icon purple"><i class="fa-solid fa-user-tie"></i></div><div class="admin-stat-value">${executive}</div><div class="admin-stat-label">Executive</div></div>
                    <div class="admin-stat-card yellow"><div class="admin-stat-icon yellow"><i class="fa-solid fa-user-shield"></i></div><div class="admin-stat-value">${board}</div><div class="admin-stat-label">Board Members</div></div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                    <div class="admin-panel">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-droplet"></i> Blood Group Distribution</h3></div>
                        <div class="admin-panel-body">
                            ${Object.keys(bloodDist).length === 0 ? '<p class="text-center text-xs text-slate-400 py-8">No blood group data</p>' :
                                Object.entries(bloodDist).sort((a, b) => b[1] - a[1]).map(([bg, count]) => {
                                    const pct = (count / total * 100).toFixed(1);
                                    return `<div class="mb-3"><div class="flex items-center justify-between mb-1"><span class="text-xs font-bold">${bg}</span><span class="text-xs font-black text-red-500">${count}</span></div><div class="w-full h-2 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden"><div style="width:${pct}%;height:100%;background:var(--red);"></div></div></div>`;
                                }).join('')}
                        </div>
                    </div>

                    <div class="admin-panel">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-cake-candles"></i> Birthdays by Month</h3></div>
                        <div class="admin-panel-body">
                            ${monthDist.map((count, i) => {
                                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                const pct = total > 0 ? (count / Math.max(...monthDist, 1) * 100) : 0;
                                return `<div class="mb-2"><div class="flex items-center justify-between mb-0.5"><span class="text-[10px] font-bold">${months[i]}</span><span class="text-[10px] font-black text-pink-500">${count}</span></div><div class="w-full h-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#ec4899,#f472b6);"></div></div></div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Portfolio Distribution -->
                <div class="admin-panel">
                    <div class="admin-panel-header">
                        <h3 class="admin-panel-title"><i class="fa-solid fa-briefcase"></i> Portfolio Distribution</h3>
                        <span class="badge badge-blue">${Object.keys(portfolioDist).length} unique portfolios</span>
                    </div>
                    <div class="admin-panel-body">
                        ${Object.keys(portfolioDist).length === 0 ? '<p class="text-center text-xs text-slate-400 py-8">No portfolio data</p>' : `
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                ${Object.entries(portfolioDist).sort((a, b) => b[1] - a[1]).map(([portfolio, count]) => `
                                    <div class="flex items-center justify-between p-3 rounded-lg bg-white/40 dark:bg-slate-800/30 border border-slate-200/60 dark:border-white/[0.05]">
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">${window.escapeHtml(portfolio)}</span>
                                        <span class="px-2.5 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-[10px] font-black">${count}</span>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;
        },

        // ==========================================
        // 7. BIRTHDAYS VIEW
        // ==========================================
        async renderBirthdays(container) {
            const { data } = await window.DB_ADMIN.from('users').select('*').eq('is_active', true).neq('role', 'super_admin').not('date_of_birth', 'is', null);
            const members = data || [];

            const today = new Date();
            const todayMonth = today.getMonth();
            const todayDay = today.getDate();

            const todayBdays = members.filter(m => {
                const d = new Date(m.date_of_birth);
                return d.getMonth() === todayMonth && d.getDate() === todayDay;
            });

            const thisMonthBdays = members.filter(m => {
                const d = new Date(m.date_of_birth);
                return d.getMonth() === todayMonth && d.getDate() !== todayDay;
            }).sort((a, b) => new Date(a.date_of_birth).getDate() - new Date(b.date_of_birth).getDate());

            container.innerHTML = `
                ${todayBdays.length > 0 ? `
                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header">
                            <h3 class="admin-panel-title"><i class="fa-solid fa-cake-candles text-pink-500"></i> Today's Birthdays</h3>
                            <span class="badge badge-pink">${todayBdays.length}</span>
                        </div>
                        <div class="admin-panel-body">
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                ${todayBdays.map(m => `
                                    <div class="member-grid-card birthday-highlight">
                                        <div class="flex items-center gap-3 mb-3">
                                            ${m.photo_url ? `<img src="${m.photo_url}" class="member-avatar-photo">` : `<div class="member-avatar-photo bg-pink-500/10 flex items-center justify-center"><i class="fa-solid fa-cake-candles text-pink-500"></i></div>`}
                                            <div class="flex-1"><h4 class="text-sm font-bold">${window.escapeHtml(m.full_name)}</h4><p class="text-[10px] text-pink-500 font-bold">Happy Birthday!</p></div>
                                        </div>
                                        <button onclick="AdminMembers.sendBirthdayWish('${m.id}')" class="w-full py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg text-xs font-bold hover:scale-[1.02] transition-all">
                                            <i class="fa-solid fa-paper-plane mr-1"></i>Send Wish
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

                <div class="admin-panel">
                    <div class="admin-panel-header">
                        <h3 class="admin-panel-title"><i class="fa-solid fa-calendar"></i> This Month's Birthdays</h3>
                        <span class="badge badge-blue">${thisMonthBdays.length}</span>
                    </div>
                    <div class="admin-panel-body">
                        ${thisMonthBdays.length === 0 ? '<div class="empty-state py-12"><i class="fa-solid fa-cake-candles empty-state-icon"></i><p class="empty-state-desc">No more birthdays this month</p></div>' : `
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                ${thisMonthBdays.map(m => {
                                    const d = new Date(m.date_of_birth);
                                    const portfolios = (m.portfolio || '').split(',').map(p => p.trim()).filter(Boolean);
                                    const primaryPortfolio = portfolios[0] || 'Member';
                                    return `
                                        <div class="member-grid-card">
                                            <div class="flex items-center gap-3 mb-3">
                                                ${m.photo_url ? `<img src="${m.photo_url}" class="member-avatar-photo">` : `<div class="member-avatar-photo bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-user text-brand-blue"></i></div>`}
                                                <div class="flex-1 min-w-0"><h4 class="text-sm font-bold truncate">${window.escapeHtml(m.full_name)}</h4><p class="text-[10px] text-brand-blue font-semibold truncate">${window.escapeHtml(primaryPortfolio)}</p></div>
                                            </div>
                                            <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                                                <span class="text-xs font-black text-pink-500"><i class="fa-solid fa-cake-candles mr-1"></i>${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                <span class="text-[9px] text-slate-400">Day ${d.getDate()}</span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;
        },

        // ==========================================
        // 8. BLOOD DONORS VIEW
        // ==========================================
        async renderBloodDonors(container) {
            const { data } = await window.DB_ADMIN.from('users').select('*').eq('is_active', true).neq('role', 'super_admin').not('blood_group', 'is', null).order('blood_group');
            const donors = data || [];

            const grouped = {};
            donors.forEach(d => {
                if (!grouped[d.blood_group]) grouped[d.blood_group] = [];
                grouped[d.blood_group].push(d);
            });

            const bloodOrder = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
            const sortedKeys = bloodOrder.filter(bg => grouped[bg]);

            container.innerHTML = `
                <div class="admin-panel">
                    <div class="admin-panel-header">
                        <h3 class="admin-panel-title"><i class="fa-solid fa-droplet text-red-500"></i> Blood Donor Registry</h3>
                        <span class="badge badge-red">${donors.length} Donors</span>
                    </div>
                    <div class="admin-panel-body">
                        ${sortedKeys.length === 0 ? '<div class="empty-state py-12"><i class="fa-solid fa-droplet empty-state-icon"></i><p class="empty-state-desc">No blood group data</p></div>' :
                            sortedKeys.map(bg => `
                                <div class="mb-6">
                                    <div class="flex items-center gap-3 mb-3">
                                        <span class="blood-group-tag text-base w-10 h-10">${bg}</span>
                                        <h4 class="text-sm font-black">${bg} Donors</h4>
                                        <span class="text-xs text-slate-400">(${grouped[bg].length})</span>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        ${grouped[bg].map(m => `
                                            <div class="member-grid-card">
                                                <div class="flex items-center gap-3">
                                                    ${m.photo_url ? `<img src="${m.photo_url}" class="w-12 h-12 rounded-xl object-cover">` : `<div class="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-user text-brand-blue"></i></div>`}
                                                    <div class="flex-1 min-w-0">
                                                        <h4 class="text-xs font-bold truncate">${window.escapeHtml(m.full_name)}</h4>
                                                        ${m.phone ? `<a href="tel:${m.phone}" class="text-[10px] text-brand-blue font-bold">${m.phone}</a>` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                    </div>
                </div>
            `;
        },

        // ==========================================
        // 9. PAST LEADERS VIEW
        // ==========================================
        async renderPastLeaders(container) {
            const [{ data: presidents }, { data: secretaries }] = await Promise.all([
                window.DB_ADMIN.from('past_presidents').select('*').order('rotary_year', { ascending: false }),
                window.DB_ADMIN.from('past_secretaries').select('*').order('rotary_year', { ascending: false })
            ]);

            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div class="admin-panel">
                        <div class="admin-panel-header">
                            <h3 class="admin-panel-title"><i class="fa-solid fa-crown"></i> Past Presidents</h3>
                            ${this.canManage ? `<button onclick="AdminMembers.openLeaderForm('president')" class="btn-primary btn-xs"><i class="fa-solid fa-plus"></i> Add</button>` : ''}
                        </div>
                        <div class="admin-panel-body">
                            ${(presidents || []).length === 0 ? '<p class="text-center text-xs text-slate-400 py-6">No past presidents added</p>' :
                                presidents.map(p => `
                                    <div class="flex items-center gap-3 p-3 border-b border-slate-100 dark:border-white/[0.05] last:border-0">
                                        ${p.photo_url ? `<img src="${p.photo_url}" class="w-10 h-10 rounded-full object-cover">` : `<div class="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-user text-brand-blue text-xs"></i></div>`}
                                        <div class="flex-1 min-w-0">
                                            <p class="text-xs font-bold truncate">${window.escapeHtml(p.full_name)}</p>
                                            <p class="text-[10px] text-brand-blue font-bold">${p.rotary_year}</p>
                                        </div>
                                        ${this.canManage ? `
                                            <button onclick="AdminMembers.openLeaderForm('president', '${p.id}')" class="cell-action-btn" title="Edit"><i class="fa-solid fa-pen text-[10px]"></i></button>
                                            <button onclick="AdminMembers.deleteLeader('president', '${p.id}')" class="cell-action-btn danger" title="Delete"><i class="fa-solid fa-trash text-[10px]"></i></button>
                                        ` : ''}
                                    </div>
                                `).join('')}
                        </div>
                    </div>

                    <div class="admin-panel">
                        <div class="admin-panel-header">
                            <h3 class="admin-panel-title"><i class="fa-solid fa-feather"></i> Past Secretaries</h3>
                            ${this.canManage ? `<button onclick="AdminMembers.openLeaderForm('secretary')" class="btn-primary btn-xs"><i class="fa-solid fa-plus"></i> Add</button>` : ''}
                        </div>
                        <div class="admin-panel-body">
                            ${(secretaries || []).length === 0 ? '<p class="text-center text-xs text-slate-400 py-6">No past secretaries added</p>' :
                                secretaries.map(s => `
                                    <div class="flex items-center gap-3 p-3 border-b border-slate-100 dark:border-white/[0.05] last:border-0">
                                        ${s.photo_url ? `<img src="${s.photo_url}" class="w-10 h-10 rounded-full object-cover">` : `<div class="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center"><i class="fa-solid fa-user text-purple-500 text-xs"></i></div>`}
                                        <div class="flex-1 min-w-0">
                                            <p class="text-xs font-bold truncate">${window.escapeHtml(s.full_name)}</p>
                                            <p class="text-[10px] text-purple-500 font-bold">${s.rotary_year} ${s.secretary_type ? '- ' + s.secretary_type : ''}</p>
                                        </div>
                                        ${this.canManage ? `
                                            <button onclick="AdminMembers.openLeaderForm('secretary', '${s.id}')" class="cell-action-btn" title="Edit"><i class="fa-solid fa-pen text-[10px]"></i></button>
                                            <button onclick="AdminMembers.deleteLeader('secretary', '${s.id}')" class="cell-action-btn danger" title="Delete"><i class="fa-solid fa-trash text-[10px]"></i></button>
                                        ` : ''}
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                </div>
            `;
        },

        async openLeaderForm(type, id) {
            const table = type === 'president' ? 'past_presidents' : 'past_secretaries';
            let existing = null;
            if (id) {
                const { data } = await window.DB_ADMIN.from(table).select('*').eq('id', id).single();
                existing = data;
            }

            window.AdminPanel.createModal({
                title: `${existing ? 'Edit' : 'Add'} Past ${type === 'president' ? 'President' : 'Secretary'}`,
                size: 'medium',
                body: `
                    <form id="leader-form" onsubmit="return false;" class="space-y-4">
                        <div class="admin-form-group">
                            <label class="admin-form-label">Full Name <span class="required">*</span></label>
                            <input type="text" name="full_name" required class="admin-form-input" value="${window.escapeHtml(existing?.full_name || '')}">
                        </div>
                        <div class="admin-form-group">
                            <label class="admin-form-label">Rotary Year <span class="required">*</span></label>
                            <input type="text" name="rotary_year" required class="admin-form-input" value="${existing?.rotary_year || ''}" placeholder="e.g., 2024-25">
                        </div>
                        ${type === 'secretary' ? `
                            <div class="admin-form-group">
                                <label class="admin-form-label">Secretary Type</label>
                                <select name="secretary_type" class="admin-form-input admin-form-select">
                                    <option value="secretary" ${existing?.secretary_type === 'secretary' ? 'selected' : ''}>Secretary (Single)</option>
                                    <option value="administration" ${existing?.secretary_type === 'administration' ? 'selected' : ''}>Administration</option>
                                    <option value="communication" ${existing?.secretary_type === 'communication' ? 'selected' : ''}>Communication</option>
                                </select>
                            </div>
                        ` : ''}
                        <div class="admin-form-group">
                            <label class="admin-form-label">RI ID</label>
                            <input type="text" name="ri_id" class="admin-form-input font-mono" value="${window.escapeHtml(existing?.ri_id || '')}">
                        </div>
                        <div class="admin-form-group">
                            <label class="admin-form-label">Email</label>
                            <input type="email" name="email" class="admin-form-input" value="${window.escapeHtml(existing?.email || '')}">
                        </div>
                        <div class="admin-form-group">
                            <label class="admin-form-label">Photo</label>
                            <div class="admin-upload-zone" id="leader-photo-zone">
                                <input type="file" id="leader-photo-input" accept="image/*">
                                <i class="fa-solid fa-cloud-arrow-up admin-upload-icon"></i>
                                <p class="admin-upload-text">Upload photo</p>
                            </div>
                            <div id="leader-photo-preview" class="mt-3">${existing?.photo_url ? `<img src="${existing.photo_url}" class="w-16 h-16 rounded-full object-cover">` : ''}</div>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="AdminMembers.saveLeader('${type}', '${id || ''}')">
                        <i class="fa-solid fa-save"></i> Save
                    </button>
                `
            });

            setTimeout(() => {
                const input = document.getElementById('leader-photo-input');
                if (input) {
                    input.addEventListener('change', async (e) => {
                        if (!e.target.files?.[0]) return;
                        try {
                            const result = await window.Uploader.upload(e.target.files[0], { type: 'profile', folder: 'leaders' });
                            window._leaderPhotoUrl = result.url;
                            window._leaderPhotoProvider = result.provider;
                            document.getElementById('leader-photo-preview').innerHTML = `<img src="${result.url}" class="w-16 h-16 rounded-full object-cover">`;
                            window.AppToast?.success('Uploaded!');
                        } catch (err) {
                            window.AppToast?.error('Upload failed');
                        }
                    });
                }
            }, 100);

            window._leaderPhotoUrl = existing?.photo_url || '';
            window._leaderPhotoProvider = existing?.photo_provider || '';
        },

        async saveLeader(type, id) {
            const form = document.getElementById('leader-form');
            if (!form) return;
            const fd = new FormData(form);
            const table = type === 'president' ? 'past_presidents' : 'past_secretaries';

            const payload = {
                full_name: fd.get('full_name'),
                rotary_year: fd.get('rotary_year'),
                ri_id: fd.get('ri_id') || null,
                email: fd.get('email') || null,
                photo_url: window._leaderPhotoUrl || null,
                photo_provider: window._leaderPhotoProvider || null
            };
            if (type === 'secretary') payload.secretary_type = fd.get('secretary_type') || 'secretary';

            try {
                if (id) {
                    await window.DB_ADMIN.from(table).update(payload).eq('id', id);
                } else {
                    await window.DB_ADMIN.from(table).insert(payload);
                }
                window.AppToast?.success('Saved!');
                window.AdminPanel.closeModal();
                await this.renderPastLeaders(document.getElementById('members-view-container'));
            } catch (e) {
                window.AppToast?.error('Save failed: ' + e.message);
            }
        },

        async deleteLeader(type, id) {
            if (!confirm('Delete this entry?')) return;
            const table = type === 'president' ? 'past_presidents' : 'past_secretaries';
            try {
                await window.DB_ADMIN.from(table).delete().eq('id', id);
                window.AppToast?.success('Deleted');
                await this.renderPastLeaders(document.getElementById('members-view-container'));
            } catch (e) {
                window.AppToast?.error('Delete failed');
            }
        },

        // ==========================================
        // 10. TRAINERS VIEW
        // ==========================================
        async renderTrainers(container) {
            const { data } = await window.DB_ADMIN.from('club_trainers').select('*').order('sort_order');
            const trainers = data || [];

            container.innerHTML = `
                <div class="admin-panel">
                    <div class="admin-panel-header">
                        <h3 class="admin-panel-title"><i class="fa-solid fa-chalkboard-user"></i> Club Trainers</h3>
                        ${this.canManage ? `<button onclick="AdminMembers.openTrainerForm()" class="btn-primary btn-sm"><i class="fa-solid fa-plus"></i> Add Trainer</button>` : ''}
                    </div>
                    <div class="admin-panel-body">
                        ${trainers.length === 0 ? '<div class="empty-state py-12"><i class="fa-solid fa-chalkboard-user empty-state-icon"></i><p class="empty-state-desc">No trainers added</p></div>' : `
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                ${trainers.map(t => `
                                    <div class="member-grid-card">
                                        <div class="text-center mb-3">
                                            ${t.photo_url ? `<img src="${t.photo_url}" class="w-20 h-20 rounded-full object-cover mx-auto border-2 border-brand-blue">` : `<div class="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto"><i class="fa-solid fa-chalkboard-user text-2xl text-brand-blue"></i></div>`}
                                            <h4 class="text-sm font-bold mt-2">${window.escapeHtml(t.full_name)}</h4>
                                            ${t.area_of_expertise ? `<p class="text-[10px] text-brand-blue font-bold">${window.escapeHtml(t.area_of_expertise)}</p>` : ''}
                                            ${t.certified_year ? `<p class="text-[9px] text-slate-400">Certified: ${t.certified_year}</p>` : ''}
                                        </div>
                                        ${this.canManage ? `
                                            <div class="flex gap-2">
                                                <button onclick="AdminMembers.openTrainerForm('${t.id}')" class="flex-1 py-2 border border-brand-blue/30 text-brand-blue rounded-lg text-xs font-bold hover:bg-brand-blue/5">Edit</button>
                                                <button onclick="AdminMembers.deleteTrainer('${t.id}')" class="py-2 px-3 border border-red-500/30 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/5"><i class="fa-solid fa-trash"></i></button>
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;
        },

        async openTrainerForm(id) {
            let existing = null;
            if (id) {
                const { data } = await window.DB_ADMIN.from('club_trainers').select('*').eq('id', id).single();
                existing = data;
            }

            window.AdminPanel.createModal({
                title: `${existing ? 'Edit' : 'Add'} Trainer`,
                size: 'medium',
                body: `
                    <form id="trainer-form" onsubmit="return false;" class="space-y-4">
                        <div class="admin-form-group"><label class="admin-form-label">Full Name <span class="required">*</span></label><input type="text" name="full_name" required class="admin-form-input" value="${window.escapeHtml(existing?.full_name || '')}"></div>
                        <div class="admin-form-group"><label class="admin-form-label">RI ID</label><input type="text" name="ri_id" class="admin-form-input font-mono" value="${window.escapeHtml(existing?.ri_id || '')}"></div>
                        <div class="admin-form-group"><label class="admin-form-label">Email</label><input type="email" name="email" class="admin-form-input" value="${window.escapeHtml(existing?.email || '')}"></div>
                        <div class="admin-form-group"><label class="admin-form-label">Area of Expertise</label><input type="text" name="area_of_expertise" class="admin-form-input" value="${window.escapeHtml(existing?.area_of_expertise || '')}" placeholder="e.g., Leadership, Public Speaking"></div>
                        <div class="admin-form-group"><label class="admin-form-label">Certified Year</label><input type="text" name="certified_year" class="admin-form-input" value="${existing?.certified_year || ''}"></div>
                        <div class="admin-form-group">
                            <label class="admin-form-label">Photo</label>
                            <div class="admin-upload-zone" id="trainer-photo-zone">
                                <input type="file" id="trainer-photo-input" accept="image/*">
                                <i class="fa-solid fa-cloud-arrow-up admin-upload-icon"></i>
                                <p class="admin-upload-text">Upload photo</p>
                            </div>
                            <div id="trainer-photo-preview" class="mt-3">${existing?.photo_url ? `<img src="${existing.photo_url}" class="w-16 h-16 rounded-full object-cover">` : ''}</div>
                        </div>
                    </form>
                `,
                footer: `<button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Cancel</button><button class="btn-primary" onclick="AdminMembers.saveTrainer('${id || ''}')"><i class="fa-solid fa-save"></i> Save</button>`
            });

            setTimeout(() => {
                const input = document.getElementById('trainer-photo-input');
                if (input) {
                    input.addEventListener('change', async (e) => {
                        if (!e.target.files?.[0]) return;
                        try {
                            const result = await window.Uploader.upload(e.target.files[0], { type: 'profile', folder: 'trainers' });
                            window._trainerPhotoUrl = result.url;
                            window._trainerPhotoProvider = result.provider;
                            document.getElementById('trainer-photo-preview').innerHTML = `<img src="${result.url}" class="w-16 h-16 rounded-full object-cover">`;
                        } catch (err) { window.AppToast?.error('Upload failed'); }
                    });
                }
            }, 100);
            window._trainerPhotoUrl = existing?.photo_url || '';
            window._trainerPhotoProvider = existing?.photo_provider || '';
        },

        async saveTrainer(id) {
            const form = document.getElementById('trainer-form');
            const fd = new FormData(form);
            const payload = {
                full_name: fd.get('full_name'),
                ri_id: fd.get('ri_id') || null,
                email: fd.get('email') || null,
                area_of_expertise: fd.get('area_of_expertise') || null,
                certified_year: fd.get('certified_year') || null,
                photo_url: window._trainerPhotoUrl || null,
                photo_provider: window._trainerPhotoProvider || null,
                is_active: true
            };
            try {
                if (id) {
                    await window.DB_ADMIN.from('club_trainers').update(payload).eq('id', id);
                } else {
                    await window.DB_ADMIN.from('club_trainers').insert(payload);
                }
                window.AppToast?.success('Saved!');
                window.AdminPanel.closeModal();
                await this.renderTrainers(document.getElementById('members-view-container'));
            } catch (e) {
                window.AppToast?.error('Save failed: ' + e.message);
            }
        },

        async deleteTrainer(id) {
            if (!confirm('Delete this trainer?')) return;
            try {
                await window.DB_ADMIN.from('club_trainers').delete().eq('id', id);
                window.AppToast?.success('Deleted');
                await this.renderTrainers(document.getElementById('members-view-container'));
            } catch (e) { window.AppToast?.error('Failed'); }
        },

        // ==========================================
        // 11. BULK OPERATIONS
        // ==========================================
        toggleSelection(id, checked) {
            if (checked) {
                if (!this.selectedMembers.includes(id)) this.selectedMembers.push(id);
            } else {
                this.selectedMembers = this.selectedMembers.filter(s => s !== id);
            }
            const btn = document.getElementById('bulk-actions-btn');
            const count = document.getElementById('bulk-count');
            if (btn) btn.disabled = this.selectedMembers.length === 0;
            if (count) count.textContent = this.selectedMembers.length;
            const card = document.querySelector(`.member-grid-card[data-id="${id}"]`);
            if (card) card.classList.toggle('selected', checked);
        },

        clearSelection() {
            this.selectedMembers = [];
            document.querySelectorAll('.member-grid-card.selected').forEach(c => c.classList.remove('selected'));
            document.querySelectorAll('.member-grid-card input[type="checkbox"]').forEach(cb => cb.checked = false);
            const btn = document.getElementById('bulk-actions-btn');
            if (btn) btn.disabled = true;
            const count = document.getElementById('bulk-count');
            if (count) count.textContent = '0';
        },

        showBulkActionsMenu() {
            if (this.selectedMembers.length === 0) return;
            window.AdminPanel.createModal({
                title: `Bulk Actions (${this.selectedMembers.length} selected)`,
                size: 'narrow',
                body: `
                    <div class="space-y-2">
                        <button class="w-full p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-green-500 hover:bg-green-500/5 text-left flex items-center gap-3" onclick="AdminMembers.bulkActivate(true);">
                            <div class="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center"><i class="fa-solid fa-user-check text-green-500"></i></div>
                            <div><p class="text-xs font-bold">Mark as Active</p><p class="text-[10px] text-slate-400">Set all selected to active</p></div>
                        </button>
                        <button class="w-full p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-yellow-500 hover:bg-yellow-500/5 text-left flex items-center gap-3" onclick="AdminMembers.bulkActivate(false);">
                            <div class="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center"><i class="fa-solid fa-user-slash text-yellow-500"></i></div>
                            <div><p class="text-xs font-bold">Mark as Inactive</p><p class="text-[10px] text-slate-400">Deactivate all selected</p></div>
                        </button>
                        <button class="w-full p-3 rounded-xl border border-red-500/30 hover:border-red-500 hover:bg-red-500/5 text-left flex items-center gap-3" onclick="AdminMembers.bulkDelete();">
                            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center"><i class="fa-solid fa-trash text-red-500"></i></div>
                            <div><p class="text-xs font-bold text-red-500">Delete Selected</p><p class="text-[10px] text-slate-400">Cannot be undone</p></div>
                        </button>
                    </div>
                `
            });
        },

        async bulkActivate(state) {
            try {
                await window.DB_ADMIN.from('users').update({ is_active: state }).in('id', this.selectedMembers);
                window.AppToast?.success(`${this.selectedMembers.length} members ${state ? 'activated' : 'deactivated'}`);
                this.clearSelection();
                window.AdminPanel.closeModal();
                await this.loadMembersData();
            } catch (e) { window.AppToast?.error('Failed: ' + e.message); }
        },

        async bulkDelete() {
            if (!confirm(`Permanently delete ${this.selectedMembers.length} members? Cannot be undone.`)) return;
            try {
                await window.DB_ADMIN.from('users').delete().in('id', this.selectedMembers);
                window.AppToast?.success(`${this.selectedMembers.length} members deleted`);
                this.clearSelection();
                window.AdminPanel.closeModal();
                await this.loadMembersData();
            } catch (e) { window.AppToast?.error('Failed: ' + e.message); }
        },

        // ==========================================
        // 12. EXPORT
        // ==========================================
        showExportMenu() {
            window.AdminPanel.createModal({
                title: 'Export Members',
                size: 'narrow',
                body: `
                    <div class="space-y-2">
                        <button class="w-full p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-green-500 hover:bg-green-500/5 text-left flex items-center gap-3" onclick="AdminMembers.exportToExcel();window.AdminPanel.closeModal();">
                            <div class="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center"><i class="fa-solid fa-file-excel text-green-600"></i></div>
                            <div><p class="text-xs font-bold">Excel File</p><p class="text-[10px] text-slate-400">All members data</p></div>
                        </button>
                        <button class="w-full p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue hover:bg-brand-blue/5 text-left flex items-center gap-3" onclick="AdminMembers.exportToCSV();window.AdminPanel.closeModal();">
                            <div class="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-file-csv text-brand-blue"></i></div>
                            <div><p class="text-xs font-bold">CSV File</p><p class="text-[10px] text-slate-400">Universal format</p></div>
                        </button>
                    </div>
                `
            });
        },

        async exportToExcel() {
            if (typeof XLSX === 'undefined') { window.AppToast?.error('Excel library not loaded'); return; }
            try {
                const { data } = await window.DB_ADMIN.from('users').select('*').neq('role', 'super_admin');
                const rows = (data || []).map((m, i) => ({
                    'S.No': i + 1,
                    'Name': m.full_name,
                    'Email': m.email,
                    'Phone': m.phone || '',
                    'Portfolios': m.portfolio || '',
                    'RI ID': m.ri_id || '',
                    'Blood Group': m.blood_group || '',
                    'DOB': m.date_of_birth || '',
                    'Profession': m.profession || '',
                    'Address': m.address || '',
                    'Joined': m.joined_date || '',
                    'Status': m.is_active ? 'Active' : 'Inactive',
                    'Board Member': m.is_board_member ? 'Yes' : 'No'
                }));
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, 'Members');
                XLSX.writeFile(wb, `Members_${new Date().toISOString().split('T')[0]}.xlsx`);
                window.AppToast?.success('Excel downloaded!');
            } catch (e) { window.AppToast?.error('Export failed'); }
        },

        async exportToCSV() {
            try {
                const { data } = await window.DB_ADMIN.from('users').select('*').neq('role', 'super_admin');
                const headers = ['Name', 'Email', 'Phone', 'Portfolios', 'RI ID', 'Blood', 'DOB', 'Profession', 'Status'];
                const rows = (data || []).map(m => [
                    `"${(m.full_name || '').replace(/"/g, '""')}"`,
                    m.email || '',
                    m.phone || '',
                    `"${(m.portfolio || '').replace(/"/g, '""')}"`,
                    m.ri_id || '',
                    m.blood_group || '',
                    m.date_of_birth || '',
                    `"${(m.profession || '').replace(/"/g, '""')}"`,
                    m.is_active ? 'Active' : 'Inactive'
                ]);
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Members_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                window.AppToast?.success('CSV downloaded!');
            } catch (e) { window.AppToast?.error('Export failed'); }
        },

        // ==========================================
        // 13. FILTER HANDLERS
        // ==========================================
        onSearchChange: window.debounce ? window.debounce(function (v) { AdminMembers.searchQuery = v; AdminMembers.currentPage = 1; AdminMembers.loadMembersData(); }, 400) : function (v) { AdminMembers.searchQuery = v; AdminMembers.currentPage = 1; setTimeout(() => AdminMembers.loadMembersData(), 300); },
        onRoleFilter(v) { this.roleFilter = v; this.currentPage = 1; this.loadMembersData(); },
        onBloodFilter(v) { this.bloodFilter = v; this.currentPage = 1; this.loadMembersData(); },
        onStatusFilter(v) { this.statusFilter = v; this.currentPage = 1; this.loadMembersData(); },
        clearFilters() {
            this.searchQuery = ''; this.roleFilter = 'all'; this.bloodFilter = 'all'; this.statusFilter = 'all'; this.currentPage = 1;
            const s = document.getElementById('member-search'); if (s) s.value = '';
            this.loadMembersData();
        },
        goToPage(p) { if (p < 1) return; this.currentPage = p; this.loadMembersData(); },

        // ==========================================
        // 14. UTILITIES
        // ==========================================
        isExecutive(role) { return ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm', 'treasurer'].includes(role); },
        isBoardOnly(role) { return !this.isExecutive(role) && ['avenue_director', 'avenue_chair', 'dpp_chair', 'blood_donor_chair', 'club_editor', 'young_leaders_contact', 'public_image_chair', 'membership_chair', 'trf_chair', 'board_member'].includes(role); },
        getRoleTier(role) {
            if (this.isExecutive(role)) return 'executive';
            if (this.isBoardOnly(role)) return 'board';
            return 'member';
        },
        calculateAge(dob) {
            if (!dob) return null;
            const birth = new Date(dob);
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
            return age;
        },
        calculateTenure(joined) {
            if (!joined) return null;
            const start = new Date(joined);
            const now = new Date();
            const years = now.getFullYear() - start.getFullYear();
            const months = now.getMonth() - start.getMonth();
            if (years > 0) return years + 'y';
            if (months > 0) return months + 'mo';
            return 'New';
        },
        renderUnauthorized() {
            return `<div class="empty-state py-20"><i class="fa-solid fa-lock empty-state-icon text-red-500"></i><h4 class="empty-state-title">Access Restricted</h4><p class="empty-state-desc">You do not have permission to manage members.</p></div>`;
        }
    };

    window.AdminMembers = AdminMembers;

})();