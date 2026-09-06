/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Admin Panel Core - js/admin.js
   Version: 5.1 - Complete, Secretary mode, all fixes, Settings Persistence Fix
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // WAIT FOR AUTH
    // ============================================================
    function waitForAuth(callback, attempts) {
        attempts = attempts || 0;
        if (window.UnityAuth && window.UnityDB) {
            callback();
        } else if (attempts < 100) {
            setTimeout(function () { waitForAuth(callback, attempts + 1); }, 100);
        } else {
            console.error('[Admin] Auth or DB not available after 10s');
        }
    }

    // ============================================================
    // SHORTCUTS
    // ============================================================
    function db() { return window.UnityAdminDB || window.UnityDB; }
    function auth() { return window.UnityAuth; }
    function esc(t) { return auth() ? auth().escHtml(t) : String(t || ''); }
    function fDate(d) { return auth() ? auth().formatDate(d) : d; }
    function fTime(t) { return auth() ? auth().formatTime(t) : t; }
    function toast(m, t) { if (auth()) auth().showAdminToast(m, t || 'info'); }

    const API = 'https://dledwtepuvzzztfypbgn.supabase.co/rest/v1';
    const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDk2NDMsImV4cCI6MjA5ODcyNTY0M30.9ZcngwUsfl5AkFaCDR9-ljoLLOYeGwwK0AKaHfeyGhY';
    const H = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' };

    async function qFetch(table, params) {
        try {
            const res = await fetch(`${API}/${table}${params ? '?' + params : ''}`, { headers: H });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch (e) { console.error('[Admin] qFetch', table, e.message); return []; }
    }

    // ============================================================
    // TABLE HELPERS
    // ============================================================
    function buildTableLoading(cols) {
        return `<tr><td colspan="${cols}" class="table-loading">
            <div class="line-placeholder"></div>
            <div class="line-placeholder w-3-4"></div>
        </td></tr>`;
    }

    function buildEmptyRow(cols, msg) {
        msg = msg || 'No records found';
        return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--a-text3);">
            <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;color:var(--a-border);"></i>${esc(msg)}
        </td></tr>`;
    }

    // ============================================================
    // BADGES & RENDERS
    // ============================================================
    function avenueBadge(avenue) {
        const labels = window.UnityConfig ? window.UnityConfig.avenues : {};
        return `<span class="avenue-tag ${avenue}">${labels[avenue] || avenue}</span>`;
    }

    function statusBadge(status) {
        const map = {
            pending: ['warning', 'fa-clock', 'Pending'],
            approved: ['success', 'fa-check-circle', 'Approved'],
            completed: ['info', 'fa-flag-checkered', 'Completed'],
            rejected: ['danger', 'fa-times-circle', 'Rejected'],
            active: ['success', 'fa-circle', 'Active'],
            fulfilled: ['info', 'fa-check', 'Fulfilled'],
            cancelled: ['gray', 'fa-ban', 'Cancelled'],
            scheduled: ['primary', 'fa-calendar', 'Scheduled'],
            ongoing: ['warning', 'fa-play-circle', 'Ongoing'],
            interview_scheduled: ['purple', 'fa-calendar-check', 'Interview Scheduled']
        };
        const arr = map[status] || ['gray', 'fa-circle', status];
        return `<span class="badge badge-${arr[0]}"><i class="fas ${arr[1]}"></i>${arr[2]}</span>`;
    }

    function urgencyBadge(urgency) {
        const map = {
            critical: ['danger', 'fa-exclamation-circle', 'Critical'],
            urgent: ['warning', 'fa-exclamation-triangle', 'Urgent'],
            normal: ['info', 'fa-info-circle', 'Normal']
        };
        const arr = map[urgency] || ['gray', 'fa-circle', urgency];
        return `<span class="badge badge-${arr[0]}"><i class="fas ${arr[1]}"></i>${arr[2]}</span>`;
    }

    function roleBadge(role) {
        const roles = window.UnityConfig ? window.UnityConfig.roles : {};
        const level = roles[role] ? roles[role].level : 1;
        const color = level >= 9 ? 'danger' : level >= 7 ? 'primary' : level >= 5 ? 'info' : 'gray';
        return `<span class="badge badge-${color}">${roles[role] ? roles[role].label : role}</span>`;
    }

    // ============================================================
    // SECRETARY MODE HELPER
    // ============================================================
    async function getSecretaryMode() {
        try {
            const data = await qFetch('site_settings',
                'select=key,value&key=in.(secretary_mode,secretary_name,secretary_admin_name,secretary_comm_name)'
            );
            const s = {};
            data.forEach(function (r) { s[r.key] = r.value; });
            return {
                mode: s.secretary_mode || 'dual',
                secretaryName: s.secretary_name || '',
                secAdminName: s.secretary_admin_name || '',
                secCommName: s.secretary_comm_name || ''
            };
        } catch (e) {
            return { mode: 'dual', secretaryName: '', secAdminName: '', secCommName: '' };
        }
    }

    function getSignatureLabels(secInfo) {
        if (secInfo.mode === 'single') {
            return {
                left: { name: secInfo.secretaryName || 'Secretary', role: 'Secretary' },
                center: { name: '', role: '' },
                right: { name: '', role: '' },
                isSingle: true
            };
        }
        return {
            left: { name: secInfo.secAdminName || 'Secretary Administration', role: 'Secretary Administration' },
            center: { name: '', role: '' },
            right: { name: secInfo.secCommName || 'Secretary Communication', role: 'Secretary Communication' },
            isSingle: false
        };
    }

    // ============================================================
    // DASHBOARD
    // ============================================================
    window.AdminDashboard = {
        async load() {
            await Promise.all([
                this.loadStats(),
                this.loadUpcomingEvents(),
                this.loadPendingApprovals(),
                this.loadTreasurySummary(),
                this.loadBirthdays(),
                this.loadUpcomingMeetings(),
                this.loadBloodRequests()
            ]);
        },

        async loadStats() {
            const row = document.getElementById('dashboard-stats-row');
            if (!row) return;
            try {
                const [members, events, completed, pending, applications, blood] = await Promise.all([
                    qFetch('members', 'select=id&is_active=eq.true'),
                    qFetch('projects', 'select=id'),
                    qFetch('projects', 'select=id&status=eq.completed'),
                    qFetch('projects', 'select=id&status=eq.pending'),
                    qFetch('membership_applications', 'select=id&status=eq.pending'),
                    qFetch('blood_requests', 'select=id&status=eq.active')
                ]);

                row.innerHTML = `
                    <div class="dash-stat-card primary">
                        <div class="dash-stat-icon"><i class="fas fa-users"></i></div>
                        <div class="dash-stat-info"><h3>${members.length}</h3><p>Active Members</p></div>
                    </div>
                    <div class="dash-stat-card success">
                        <div class="dash-stat-icon"><i class="fas fa-calendar-check"></i></div>
                        <div class="dash-stat-info"><h3>${completed.length}</h3><p>Completed Events</p></div>
                    </div>
                    <div class="dash-stat-card warning">
                        <div class="dash-stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="dash-stat-info"><h3>${pending.length}</h3><p>Pending Approval</p></div>
                    </div>
                    <div class="dash-stat-card info">
                        <div class="dash-stat-icon"><i class="fas fa-calendar-alt"></i></div>
                        <div class="dash-stat-info"><h3>${events.length}</h3><p>Total Events</p></div>
                    </div>
                    <div class="dash-stat-card purple">
                        <div class="dash-stat-icon"><i class="fas fa-user-clock"></i></div>
                        <div class="dash-stat-info"><h3>${applications.length}</h3><p>Pending Applications</p></div>
                    </div>
                    <div class="dash-stat-card danger">
                        <div class="dash-stat-icon"><i class="fas fa-tint"></i></div>
                        <div class="dash-stat-info"><h3>${blood.length}</h3><p>Blood Requests</p></div>
                    </div>
                `;
            } catch (e) {
                row.innerHTML = '<p style="color:var(--a-text3);padding:20px;">Could not load stats</p>';
            }
        },

        async loadUpcomingEvents() {
            const list = document.getElementById('dash-upcoming-list');
            if (!list) return;
            try {
                const today = new Date().toISOString().split('T')[0];
                const next7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
                const data = await qFetch('projects',
                    `select=id,title,event_date,event_time,venue,avenue&status=eq.approved&event_date=gte.${today}&event_date=lte.${next7}&order=event_date.asc&limit=5`
                );
                if (!data.length) {
                    list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;padding:8px 0;">No upcoming events in next 7 days</p>';
                    return;
                }
                list.innerHTML = data.map(ev => `
                    <div class="dash-list-item">
                        <div class="dash-list-icon" style="background:rgba(26,86,219,0.1);">
                            <i class="fas fa-calendar-alt" style="color:var(--a-primary);"></i>
                        </div>
                        <div>
                            <h4>${esc(ev.title)}</h4>
                            <p>${fDate(ev.event_date)}${ev.event_time ? ' at ' + fTime(ev.event_time) : ''}${ev.venue ? ' &middot; ' + esc(ev.venue) : ''}</p>
                        </div>
                        <button class="dash-list-action" style="background:rgba(26,86,219,0.1);color:var(--a-primary);"
                            onclick="window.UnityAuth.navigateToPage('page-events')">View</button>
                    </div>
                `).join('');
            } catch (e) {
                list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">Could not load events</p>';
            }
        },

        async loadPendingApprovals() {
            const list = document.getElementById('dash-pending-list');
            if (!list) return;
            if (!auth().canApproveProjects()) {
                list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">No approval access</p>';
                return;
            }
            try {
                const data = await qFetch('projects',
                    'select=id,title,avenue,event_date&status=eq.pending&order=created_at.desc&limit=5'
                );
                if (!data.length) {
                    list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;padding:8px 0;">No pending approvals</p>';
                    return;
                }
                const avenues = window.UnityConfig ? window.UnityConfig.avenues : {};
                list.innerHTML = data.map(ev => `
                    <div class="dash-list-item">
                        <div class="dash-list-icon" style="background:var(--a-warning-bg);">
                            <i class="fas fa-clock" style="color:var(--a-warning);"></i>
                        </div>
                        <div>
                            <h4>${esc(ev.title)}</h4>
                            <p>${avenues[ev.avenue] || ev.avenue} &middot; ${fDate(ev.event_date)}</p>
                        </div>
                        <button class="dash-list-action" style="background:var(--a-success-bg);color:var(--a-success);"
                            onclick="AdminDashboard.quickApprove('${ev.id}', this)">Approve</button>
                    </div>
                `).join('');
            } catch (e) {
                list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">Could not load</p>';
            }
        },

        async quickApprove(eventId, btn) {
            try {
                const user = auth().getCurrentUser();
                const res = await fetch(`${API}/projects?id=eq.${eventId}`, {
                    method: 'PATCH',
                    headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                    body: JSON.stringify({ status: 'approved', approved_by: user ? user.id : null, approved_at: new Date().toISOString() })
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const item = btn.closest('.dash-list-item');
                if (item) { item.style.opacity = '0.5'; btn.textContent = 'Approved!'; }
                if (window.AdminMail) window.AdminMail.sendEventApproval(eventId);
                toast('Event approved!', 'success');
            } catch (e) {
                toast('Approval failed: ' + e.message, 'error');
            }
        },

        async loadTreasurySummary() {
            const content = document.getElementById('dash-treasury-content');
            if (!content) return;
            if (!auth().hasPermission('canViewTreasury')) {
                content.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">No treasury access</p>';
                return;
            }
            try {
                const data = await qFetch('treasury_transactions', 'select=transaction_type,amount&is_approved=eq.true');
                let income = 0, expense = 0;
                data.forEach(function (t) {
                    const a = parseFloat(t.amount) || 0;
                    t.transaction_type === 'income' ? (income += a) : (expense += a);
                });
                const balance = income - expense;
                content.innerHTML = `
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                        <div style="text-align:center;padding:12px;background:var(--a-success-bg);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.68rem;color:var(--a-success);font-weight:700;margin-bottom:4px;">INCOME</div>
                            <div style="font-size:0.9rem;font-weight:800;color:var(--a-success);">&#8377;${income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div style="text-align:center;padding:12px;background:var(--a-danger-bg);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.68rem;color:var(--a-danger);font-weight:700;margin-bottom:4px;">EXPENSE</div>
                            <div style="font-size:0.9rem;font-weight:800;color:var(--a-danger);">&#8377;${expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div style="text-align:center;padding:12px;background:${balance >= 0 ? 'rgba(26,86,219,0.08)' : 'var(--a-danger-bg)'};border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.68rem;color:${balance >= 0 ? 'var(--a-primary)' : 'var(--a-danger)'};font-weight:700;margin-bottom:4px;">BALANCE</div>
                            <div style="font-size:0.9rem;font-weight:800;color:${balance >= 0 ? 'var(--a-primary)' : 'var(--a-danger)'};">&#8377;${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>`;
            } catch (e) {
                content.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">Could not load treasury</p>';
            }
        },

        async loadBirthdays() {
            const list = document.getElementById('dash-birthday-list');
            if (!list) return;
            try {
                const today = new Date();
                const todayMonth = today.getMonth() + 1;
                const todayDay = today.getDate();
                const members = await qFetch('members', 'select=name,date_of_birth,portfolio&is_active=eq.true&date_of_birth=not.is.null');
                const upcoming = members.filter(function (m) {
                    try {
                        const dob = new Date(m.date_of_birth);
                        const bm = dob.getMonth() + 1;
                        const bd = dob.getDate();
                        const diff = (bm - todayMonth) * 30 + (bd - todayDay);
                        return diff >= 0 && diff <= 7;
                    } catch (e) { return false; }
                }).sort(function (a, b) {
                    return new Date(a.date_of_birth).getDate() - new Date(b.date_of_birth).getDate();
                });

                if (!upcoming.length) {
                    list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">No birthdays in next 7 days</p>';
                    return;
                }

                list.innerHTML = upcoming.map(function (m) {
                    const dob = new Date(m.date_of_birth);
                    const isToday = dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
                    return `<div class="dash-list-item">
                        <div class="dash-list-icon" style="background:${isToday ? '#fdf2f8' : 'var(--a-bg-alt)'};">
                            <i class="fas fa-birthday-cake" style="color:${isToday ? '#ec4899' : 'var(--a-text3)'};"></i>
                        </div>
                        <div>
                            <h4>${esc(m.name)} ${isToday ? '<span class="badge badge-purple" style="font-size:0.6rem;">Today</span>' : ''}</h4>
                            <p>${m.portfolio || 'Member'} &middot; ${dob.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</p>
                        </div>
                    </div>`;
                }).join('');
            } catch (e) {
                list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">Could not load</p>';
            }
        },

        async loadUpcomingMeetings() {
            const list = document.getElementById('dash-meetings-list');
            if (!list) return;
            if (!auth().hasPermission('canViewMeetings') && !auth().isHighLevel()) {
                list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">No meetings access</p>';
                return;
            }
            try {
                const today = new Date().toISOString().split('T')[0];
                const data = await qFetch('meetings',
                    `select=id,title,meeting_date,start_time,meeting_type&meeting_date=gte.${today}&status=eq.scheduled&order=meeting_date.asc&limit=4`
                );
                if (!data.length) {
                    list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">No upcoming meetings</p>';
                    return;
                }
                list.innerHTML = data.map(function (m) {
                    return `<div class="dash-list-item">
                        <div class="dash-list-icon" style="background:rgba(26,86,219,0.1);">
                            <i class="fas fa-users-cog" style="color:var(--a-primary);"></i>
                        </div>
                        <div>
                            <h4>${esc(m.title)}</h4>
                            <p>${fDate(m.meeting_date)} at ${fTime(m.start_time)} &middot; ${m.meeting_type === 'board' ? 'Board Meeting' : 'General Body Meeting'}</p>
                        </div>
                    </div>`;
                }).join('');
            } catch (e) {
                list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">Could not load</p>';
            }
        },

        async loadBloodRequests() {
            const list = document.getElementById('dash-blood-list');
            if (!list) return;
            try {
                const data = await qFetch('blood_requests',
                    'select=id,requester_name,blood_group,hospital_name,urgency&status=eq.active&order=created_at.desc&limit=3'
                );
                if (!data.length) {
                    list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">No active blood requests</p>';
                    return;
                }
                list.innerHTML = data.map(function (r) {
                    return `<div class="dash-list-item">
                        <div class="dash-list-icon" style="background:var(--a-danger-bg);">
                            <strong style="color:var(--a-danger);font-size:0.75rem;">${esc(r.blood_group)}</strong>
                        </div>
                        <div>
                            <h4>${esc(r.requester_name)} &middot; ${esc(r.hospital_name || 'No hospital')}</h4>
                            <p>${urgencyBadge(r.urgency)}</p>
                        </div>
                    </div>`;
                }).join('');
            } catch (e) {
                list.innerHTML = '<p style="color:var(--a-text3);font-size:0.82rem;">Could not load</p>';
            }
        }
    };

    // ============================================================
    // ADMIN USERS MANAGEMENT
    // ============================================================
    window.AdminUsers = {
        data: [],

        async load() {
            if (!auth().isSuperAdmin() && !auth().isAdvisor()) {
                const tbody = document.getElementById('admin-users-table-body');
                if (tbody) tbody.innerHTML = buildEmptyRow(9, 'Access denied');
                return;
            }
            await this.fetchAndRender();
        },

        async fetchAndRender() {
            const tbody = document.getElementById('admin-users-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(9);
            try {
                const data = await qFetch('admin_users', 'select=*&order=role.asc,name.asc');
                this.data = data || [];
                this.render();
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(9, 'Could not load admin users');
            }
        },

        render() {
            const tbody = document.getElementById('admin-users-table-body');
            if (!tbody) return;
            if (!this.data.length) {
                tbody.innerHTML = buildEmptyRow(9, 'No admin users found');
                return;
            }
            const avenues = window.UnityConfig ? window.UnityConfig.avenues : {};
            tbody.innerHTML = this.data.map(u => `
                <tr>
                    <td>
                        <div class="cell-avatar">
                            <div class="cell-avatar-placeholder"><i class="fas fa-user"></i></div>
                            <div>
                                <div class="cell-name">${esc(u.name)}</div>
                                <div class="cell-sub">${esc(u.email)}</div>
                            </div>
                        </div>
                    </td>
                    <td><small>${esc(u.email)}</small></td>
                    <td>${roleBadge(u.role)}</td>
                    <td><small>${u.avenue ? esc(avenues[u.avenue] || u.avenue) : '&mdash;'}</small></td>
                    <td><small>${esc(u.portfolio || '&mdash;')}</small></td>
                    <td><small>${esc(u.ri_id || '&mdash;')}</small></td>
                    <td><span class="badge badge-${u.is_active ? 'success' : 'danger'}">
                        <i class="fas fa-${u.is_active ? 'check' : 'times'}"></i>
                        ${u.is_active ? 'Active' : 'Inactive'}
                    </span></td>
                    <td><small>${u.last_login ? auth().formatTimeAgo(u.last_login) : 'Never'}</small></td>
                    <td>
                        <div class="cell-actions">
                            <button class="action-btn edit" title="Edit" onclick="AdminUsers.openEdit('${u.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" title="${u.is_active ? 'Deactivate' : 'Activate'}"
                                style="${u.is_active ? 'color:var(--a-warning)' : 'color:var(--a-success)'}"
                                onclick="AdminUsers.toggleActive('${u.id}', ${u.is_active})">
                                <i class="fas fa-${u.is_active ? 'user-slash' : 'user-check'}"></i>
                            </button>
                            ${u.role !== 'super_admin' ? `
                            <button class="action-btn delete" title="Delete" onclick="AdminUsers.confirmDelete('${u.id}', '${esc(u.name)}')">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        openAdd() {
            const roles = window.UnityConfig ? Object.keys(window.UnityConfig.roles) : [];
            const avenues = window.UnityConfig ? window.UnityConfig.avenues : {};

            const roleOptions = roles.map(r => {
                const label = window.UnityConfig.roles[r] ? window.UnityConfig.roles[r].label : r;
                return `<option value="${r}">${esc(label)}</option>`;
            }).join('');

            const avenueOptions = Object.entries(avenues).map(function ([k, v]) {
                return `<option value="${k}">${esc(v)}</option>`;
            }).join('');

            auth().openModal(
                '<i class="fas fa-user-plus"></i> Add Admin User',
                `<div class="modal-form-grid">
                    <div class="form-group">
                        <label>Full Name <span class="req">*</span></label>
                        <input type="text" id="au-name" placeholder="Full name" required>
                    </div>
                    <div class="form-group">
                        <label>Email Address <span class="req">*</span></label>
                        <input type="email" id="au-email" placeholder="Email address" required>
                    </div>
                    <div class="form-group">
                        <label>Password <span class="req">*</span></label>
                        <input type="text" id="au-password" placeholder="Set password" required>
                    </div>
                    <div class="form-group">
                        <label>Role <span class="req">*</span></label>
                        <select id="au-role" onchange="AdminUsers.onRoleChange(this)">
                            ${roleOptions}
                        </select>
                    </div>
                    <div class="form-group" id="au-avenue-group" style="display:none;">
                        <label>Avenue</label>
                        <select id="au-avenue">
                            <option value="">Select Avenue</option>
                            ${avenueOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Portfolio</label>
                        <input type="text" id="au-portfolio" placeholder="e.g. Director - Club Service">
                    </div>
                    <div class="form-group">
                        <label>RI ID</label>
                        <input type="text" id="au-ri-id" placeholder="RI Member ID">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="au-phone" placeholder="Phone number">
                    </div>
                </div>`,
                async function (close) {
                    const name = (document.getElementById('au-name') || {}).value.trim();
                    const email = (document.getElementById('au-email') || {}).value.trim().toLowerCase();
                    const password = (document.getElementById('au-password') || {}).value.trim();
                    const role = (document.getElementById('au-role') || {}).value;
                    const avenue = (document.getElementById('au-avenue') || {}).value || null;
                    const portfolio = (document.getElementById('au-portfolio') || {}).value.trim();
                    const ri_id = (document.getElementById('au-ri-id') || {}).value.trim();
                    const phone = (document.getElementById('au-phone') || {}).value.trim();

                    if (!name || !email || !password || !role) {
                        toast('Please fill all required fields', 'warning');
                        return;
                    }

                    try {
                        const res = await fetch(`${API}/admin_users`, {
                            method: 'POST',
                            headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                            body: JSON.stringify({ name, email, password_text: password, role, avenue, portfolio, ri_id, phone, is_active: true })
                        });
                        if (!res.ok) {
                            const txt = await res.text();
                            if (txt.includes('duplicate') || txt.includes('unique')) {
                                throw new Error('Email already exists');
                            }
                            throw new Error('HTTP ' + res.status);
                        }
                        toast('Admin user added!', 'success');
                        close();
                        await this.fetchAndRender();
                    } catch (e) {
                        toast(e.message || 'Failed to add user', 'error');
                    }
                }.bind(this),
                { saveLabel: '<i class="fas fa-user-plus"></i> Add User' }
            );
        },

        onRoleChange(select) {
            const avenueRoles = ['avenue_director', 'club_service_director', 'community_service_director',
                'professional_service_director', 'international_service_director', 'district_priority_chair'];
            const grp = document.getElementById('au-avenue-group') || document.getElementById('eu-avenue-group');
            if (grp) grp.style.display = avenueRoles.includes(select.value) ? '' : 'none';
        },

        async openEdit(userId) {
            const u = this.data.find(function (x) { return x.id === userId; });
            if (!u) return;

            const roles = window.UnityConfig ? Object.keys(window.UnityConfig.roles) : [];
            const avenues = window.UnityConfig ? window.UnityConfig.avenues : {};

            const roleOptions = roles.map(function (r) {
                const label = window.UnityConfig.roles[r] ? window.UnityConfig.roles[r].label : r;
                return `<option value="${r}" ${r === u.role ? 'selected' : ''}>${esc(label)}</option>`;
            }).join('');

            const avenueOptions = Object.entries(avenues).map(function ([k, v]) {
                return `<option value="${k}" ${k === u.avenue ? 'selected' : ''}>${esc(v)}</option>`;
            }).join('');

            auth().openModal(
                `<i class="fas fa-edit"></i> Edit Admin - ${esc(u.name)}`,
                `<div class="modal-form-grid">
                    <div class="form-group">
                        <label>Full Name <span class="req">*</span></label>
                        <input type="text" id="eu-name" value="${esc(u.name)}" required>
                    </div>
                    <div class="form-group">
                        <label>Email Address <span class="req">*</span></label>
                        <input type="email" id="eu-email" value="${esc(u.email)}" required>
                    </div>
                    <div class="form-group">
                        <label>New Password (leave blank to keep)</label>
                        <input type="text" id="eu-password" placeholder="New password">
                    </div>
                    <div class="form-group">
                        <label>Role <span class="req">*</span></label>
                        <select id="eu-role" onchange="AdminUsers.onRoleChange(this)">${roleOptions}</select>
                    </div>
                    <div class="form-group" id="eu-avenue-group" style="${['avenue_director','club_service_director','community_service_director','professional_service_director','international_service_director','district_priority_chair'].includes(u.role) ? '' : 'display:none;'}">
                        <label>Avenue</label>
                        <select id="eu-avenue">
                            <option value="">None</option>
                            ${avenueOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Portfolio</label>
                        <input type="text" id="eu-portfolio" value="${esc(u.portfolio || '')}">
                    </div>
                    <div class="form-group">
                        <label>RI ID</label>
                        <input type="text" id="eu-ri-id" value="${esc(u.ri_id || '')}">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="eu-phone" value="${esc(u.phone || '')}">
                    </div>
                </div>`,
                async function (close) {
                    const updates = {
                        name: (document.getElementById('eu-name') || {}).value.trim(),
                        email: (document.getElementById('eu-email') || {}).value.trim().toLowerCase(),
                        role: (document.getElementById('eu-role') || {}).value,
                        avenue: (document.getElementById('eu-avenue') || {}).value || null,
                        portfolio: (document.getElementById('eu-portfolio') || {}).value.trim(),
                        ri_id: (document.getElementById('eu-ri-id') || {}).value.trim(),
                        phone: (document.getElementById('eu-phone') || {}).value.trim()
                    };
                    const newPw = (document.getElementById('eu-password') || {}).value.trim();
                    if (newPw) updates.password_text = newPw;

                    if (!updates.name || !updates.email || !updates.role) {
                        toast('Please fill all required fields', 'warning');
                        return;
                    }
                    try {
                        const res = await fetch(`${API}/admin_users?id=eq.${userId}`, {
                            method: 'PATCH',
                            headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                            body: JSON.stringify(updates)
                        });
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        toast('User updated!', 'success');
                        close();
                        await this.fetchAndRender();
                    } catch (e) {
                        toast(e.message || 'Failed to update', 'error');
                    }
                }.bind(this)
            );
        },

        async toggleActive(userId, currentState) {
            auth().openConfirm(
                currentState ? 'Deactivate User' : 'Activate User',
                `Are you sure you want to ${currentState ? 'deactivate' : 'activate'} this user?`,
                async function () {
                    try {
                        const res = await fetch(`${API}/admin_users?id=eq.${userId}`, {
                            method: 'PATCH',
                            headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                            body: JSON.stringify({ is_active: !currentState })
                        });
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        toast(`User ${currentState ? 'deactivated' : 'activated'}!`, 'success');
                        await AdminUsers.fetchAndRender();
                    } catch (e) {
                        toast('Failed: ' + e.message, 'error');
                    }
                },
                currentState ? 'danger' : 'success'
            );
        },

        async confirmDelete(userId, name) {
            auth().openConfirm(
                'Delete Admin User',
                `Permanently delete "${name}"? This cannot be undone.`,
                async function () {
                    try {
                        const res = await fetch(`${API}/admin_users?id=eq.${userId}`, {
                            method: 'DELETE', headers: H
                        });
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        toast('User deleted!', 'success');
                        await AdminUsers.fetchAndRender();
                    } catch (e) {
                        toast('Failed: ' + e.message, 'error');
                    }
                }
            );
        }
    };

    document.addEventListener('click', function (e) {
        if (e.target.id === 'add-admin-user-btn' || e.target.closest('#add-admin-user-btn')) {
            AdminUsers.openAdd();
        }
    });

    // ============================================================
    // SETTINGS MANAGEMENT - FIXED UPSERT PERSISTENCE
    // ============================================================
    window.AdminSettings = {
        data: {},

        async load() {
            if (!auth().isSuperAdmin() && !auth().isAdvisor()) return;
            await this.fetchSettings();
            this.initTabs();
            this.initColorInputs();
            this.initSecretaryMode();
        },

        async fetchSettings() {
            try {
                const data = await qFetch('site_settings', 'select=*');
                this.data = {};
                data.forEach(function (s) { AdminSettings.data[s.key] = s.value; });
                this.populateFields();
            } catch (e) {
                toast('Failed to load settings', 'error');
            }
        },

        populateFields() {
            const self = this;
            document.querySelectorAll('.settings-input[data-setting]').forEach(function (input) {
                if (input.type === 'color') return;
                const key = input.dataset.setting;
                const value = self.data[key] || '';
                input.value = value;
            });

            // Logo preview
            const colourLogoInput = document.querySelector('[data-setting="colour_logo_url"]');
            const preview = document.getElementById('preview-colour-logo');
            if (colourLogoInput && preview && colourLogoInput.value) {
                preview.src = colourLogoInput.value;
            }

            // Color pickers
            document.querySelectorAll('.settings-color-input[data-setting]').forEach(function (picker) {
                const key = picker.dataset.setting;
                if (self.data[key]) picker.value = self.data[key];
            });
        },

        // Dynamic interface toggles on radio clicks
        initSecretaryMode() {
            const mode = this.data.secretary_mode || 'dual';
            const radios = document.querySelectorAll('input[name="secretary_mode"]');
            
            radios.forEach(function (r) { 
                r.checked = r.value === mode; 
                // Add click listener so settings switch dynamically without refresh
                r.addEventListener('change', function() {
                    const singleFields = document.getElementById('sec-single-fields');
                    const dualFields = document.getElementById('sec-dual-fields');
                    if (singleFields) singleFields.style.display = this.value === 'single' ? '' : 'none';
                    if (dualFields) dualFields.style.display = this.value === 'dual' ? '' : 'none';
                });
            });

            const singleFields = document.getElementById('sec-single-fields');
            const dualFields = document.getElementById('sec-dual-fields');
            if (singleFields) singleFields.style.display = mode === 'single' ? '' : 'none';
            if (dualFields) dualFields.style.display = mode === 'dual' ? '' : 'none';

            // Secretary names for single / dual modes
            const secInput = document.getElementById('s-secretary');
            if (secInput) secInput.value = this.data.secretary_name || '';

            const secAdminInput = document.getElementById('s-sec-admin');
            if (secAdminInput) secAdminInput.value = this.data.secretary_admin_name || '';

            const secCommInput = document.getElementById('s-sec-comm');
            if (secCommInput) secCommInput.value = this.data.secretary_comm_name || '';
        },

        initTabs() {
            const self = this;
            document.querySelectorAll('.settings-tab').forEach(function (tab) {
                tab.addEventListener('click', function () {
                    document.querySelectorAll('.settings-tab').forEach(function (t) {
                        t.classList.remove('active');
                        t.setAttribute('aria-selected', 'false');
                    });
                    document.querySelectorAll('.settings-tab-content').forEach(function (c) {
                        c.classList.remove('active');
                    });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                    const targetId = 'settings-' + tab.dataset.settingsTab;
                    const target = document.getElementById(targetId);
                    if (target) target.classList.add('active');
                });
            });

            // Logo preview update
            const colourLogoInput = document.querySelector('[data-setting="colour_logo_url"]');
            const preview = document.getElementById('preview-colour-logo');
            if (colourLogoInput && preview) {
                colourLogoInput.addEventListener('input', function () {
                    if (this.value) preview.src = this.value;
                });
            }

            // Statistics tab
            this.loadStatisticsSettings();
        },

        initColorInputs() {
            document.querySelectorAll('.settings-color-input').forEach(function (colorInput) {
                const key = colorInput.dataset.setting;
                colorInput.addEventListener('input', function () {
                    const textInput = document.querySelector(`.settings-input.color-text[data-setting="${key}"]`);
                    if (textInput) textInput.value = colorInput.value;
                });
            });

            document.querySelectorAll('.settings-input.color-text').forEach(function (textInput) {
                const key = textInput.dataset.setting;
                textInput.addEventListener('input', function () {
                    const colorInput = document.querySelector(`.settings-color-input[data-setting="${key}"]`);
                    if (colorInput && /^#[0-9A-F]{6}$/i.test(textInput.value)) {
                        colorInput.value = textInput.value;
                    }
                });
            });
        },

        async saveAll() {
            const btn = document.getElementById('save-all-settings-btn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

            try {
                const updates = [];
                const seen = new Set();

                // Gather regular settings inputs
                document.querySelectorAll('.settings-input[data-setting]').forEach(function (input) {
                    if (input.type === 'color') return;
                    const key = input.dataset.setting;
                    if (!seen.has(key)) {
                        seen.add(key);
                        updates.push({ key: key, value: input.value });
                    }
                });

                // Gather color pickers
                document.querySelectorAll('.settings-color-input[data-setting]').forEach(function (picker) {
                    const key = picker.dataset.setting;
                    if (!seen.has(key)) {
                        seen.add(key);
                        updates.push({ key: key, value: picker.value });
                    }
                });

                // Secretary mode settings
                const secMode = document.querySelector('input[name="secretary_mode"]:checked');
                if (secMode) {
                    const modeKey = 'secretary_mode';
                    if (!seen.has(modeKey)) {
                        seen.add(modeKey);
                        updates.push({ key: modeKey, value: secMode.value });
                    }

                    // Secretary name for single mode
                    if (secMode.value === 'single') {
                        const secInput = document.getElementById('s-secretary');
                        if (secInput && !seen.has('secretary_name')) {
                            seen.add('secretary_name');
                            updates.push({ key: 'secretary_name', value: secInput.value.trim() });
                        }
                    } else if (secMode.value === 'dual') {
                        // Secretary Admin & Comm fields
                        const secAdminInput = document.getElementById('s-sec-admin');
                        const secCommInput = document.getElementById('s-sec-comm');
                        if (secAdminInput && !seen.has('secretary_admin_name')) {
                            seen.add('secretary_admin_name');
                            updates.push({ key: 'secretary_admin_name', value: secAdminInput.value.trim() });
                        }
                        if (secCommInput && !seen.has('secretary_comm_name')) {
                            seen.add('secretary_comm_name');
                            updates.push({ key: 'secretary_comm_name', value: secCommInput.value.trim() });
                        }
                    }
                }

                // POST TO API: Modified with `?on_conflict=key` and strict response checks to ensure Supabase upserts properly
                for (const update of updates) {
                    const res = await fetch(`${API}/site_settings?on_conflict=key`, {
                        method: 'POST',
                        headers: Object.assign({}, H, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
                        body: JSON.stringify({ key: update.key, value: update.value, updated_at: new Date().toISOString() })
                    });
                    
                    if (!res.ok) {
                        const errorMsg = await res.text();
                        throw new Error(`Failed to save ${update.key}: ${errorMsg || res.statusText}`);
                    }

                    // Locally persist into runtime object state
                    this.data[update.key] = update.value;
                }

                // Apply theme colors live
                const primaryColor = document.querySelector('.settings-input[data-setting="primary_color"]');
                if (primaryColor && primaryColor.value) {
                    document.documentElement.style.setProperty('--a-primary', primaryColor.value);
                }

                // Invalidate local runtime settings cache
                if (window.UnitySettings && typeof window.UnitySettings.clearCache === 'function') {
                    window.UnitySettings.clearCache();
                } else {
                    localStorage.removeItem('unity_settings_cache');
                }

                toast('All settings saved successfully!', 'success');

            } catch (e) {
                console.error('[Admin] Error saving settings:', e);
                toast('Failed to save settings: ' + e.message, 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save All Settings'; }
            }
        },

        async loadStatisticsSettings() {
            const list = document.getElementById('statistics-settings-list');
            if (!list) return;
            try {
                const data = await qFetch('club_statistics', 'select=*&order=display_order.asc');
                list.innerHTML = data.map(function (stat) {
                    return `<div class="stat-setting-item" data-stat-id="${stat.id}">
                        <input type="text" class="settings-input" value="${esc(stat.stat_label)}" placeholder="Label" data-field="label">
                        <input type="text" class="settings-input" value="${esc(stat.stat_value)}" placeholder="Value (e.g. 100+)" data-field="value">
                        <input type="text" class="settings-input" value="${esc(stat.stat_icon || '')}" placeholder="Icon (e.g. users)" data-field="icon">
                        <div style="display:flex;gap:6px;align-items:center;">
                            <button class="btn btn-success btn-sm" onclick="AdminSettings.saveStat('${stat.id}', this)">
                                <i class="fas fa-save"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="AdminSettings.deleteStat('${stat.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>`;
                }).join('');
            } catch (e) {
                if (list) list.innerHTML = '<p style="color:var(--a-text3);">Could not load statistics</p>';
            }
        },

        async saveStat(statId, btn) {
            const item = btn.closest('.stat-setting-item');
            const label = (item.querySelector('[data-field="label"]') || {}).value || '';
            const value = (item.querySelector('[data-field="value"]') || {}).value || '';
            const icon = (item.querySelector('[data-field="icon"]') || {}).value || '';
            try {
                const res = await fetch(`${API}/club_statistics?id=eq.${statId}`, {
                    method: 'PATCH',
                    headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                    body: JSON.stringify({ stat_label: label, stat_value: value, stat_icon: icon })
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                toast('Statistic updated!', 'success');
            } catch (e) {
                toast('Failed: ' + e.message, 'error');
            }
        },

        async deleteStat(statId) {
            auth().openConfirm('Delete Statistic', 'Delete this statistic?', async function () {
                try {
                    const res = await fetch(`${API}/club_statistics?id=eq.${statId}`, {
                        method: 'DELETE', headers: H
                    });
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    toast('Deleted!', 'success');
                    await AdminSettings.loadStatisticsSettings();
                } catch (e) {
                    toast('Failed: ' + e.message, 'error');
                }
            });
        },

        async addStat() {
            try {
                const res = await fetch(`${API}/club_statistics`, {
                    method: 'POST',
                    headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                    body: JSON.stringify({
                        stat_key: 'stat_' + Date.now(),
                        stat_label: 'New Statistic',
                        stat_value: '0',
                        stat_icon: 'star',
                        display_order: 99,
                        is_visible: true
                    })
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                toast('Statistic added!', 'success');
                await this.loadStatisticsSettings();
            } catch (e) {
                toast('Failed: ' + e.message, 'error');
            }
        }
    };

    document.getElementById('save-all-settings-btn') && document.getElementById('save-all-settings-btn').addEventListener('click', function () {
        AdminSettings.saveAll();
    });

    document.getElementById('add-stat-btn') && document.getElementById('add-stat-btn').addEventListener('click', function () {
        AdminSettings.addStat();
    });

    // ============================================================
    // BULLETINS MANAGEMENT
    // ============================================================
    window.AdminBulletins = {
        data: [],

        async load() { await this.fetchAndRender(); },

        async fetchAndRender() {
            const grid = document.getElementById('bulletins-admin-grid');
            if (!grid) return;
            grid.innerHTML = '<div class="dash-loading"><div class="line-placeholder"></div></div>';
            try {
                const data = await qFetch('bulletins', 'select=*&order=created_at.desc');
                this.data = data || [];
                this.render();
            } catch (e) {
                grid.innerHTML = '<p style="color:var(--a-text3);">Could not load bulletins</p>';
            }
        },

        render() {
            const grid = document.getElementById('bulletins-admin-grid');
            if (!grid) return;
            if (!this.data.length) {
                grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--a-text3);">
                    <i class="fas fa-newspaper" style="font-size:3rem;display:block;margin-bottom:12px;color:var(--a-border);"></i>
                    <p>No bulletins yet. Add your first bulletin!</p>
                </div>`;
                return;
            }
            grid.innerHTML = this.data.map(b => `
                <div class="bulletin-admin-card">
                    ${b.cover_image_url
                    ? `<img src="${esc(b.cover_image_url)}" class="bulletin-admin-cover" alt="${esc(b.bulletin_name)}" onerror="this.style.display='none';">`
                    : `<div class="bulletin-admin-cover" style="display:flex;align-items:center;justify-content:center;background:var(--a-bg-alt);">
                           <i class="fas fa-newspaper" style="font-size:2.5rem;color:var(--a-border);"></i>
                       </div>`}
                    <div class="bulletin-admin-info">
                        <h4>${esc(b.bulletin_name)}</h4>
                        ${b.edition ? `<p style="color:var(--a-primary);font-size:0.75rem;font-weight:600;">${esc(b.edition)}</p>` : ''}
                        ${b.description ? `<p>${esc(b.description)}</p>` : ''}
                        ${b.published_date ? `<p style="font-size:0.72rem;color:var(--a-text3);">${fDate(b.published_date)}</p>` : ''}
                        <div class="bulletin-admin-actions">
                            <button class="btn btn-outline btn-sm" onclick="AdminBulletins.openEdit('${b.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            ${b.drive_link ? `<a href="${esc(b.drive_link)}" target="_blank" class="btn btn-primary btn-sm">
                                <i class="fas fa-external-link-alt"></i> View
                            </a>` : ''}
                            <button class="btn btn-danger btn-sm" onclick="AdminBulletins.confirmDelete('${b.id}', '${esc(b.bulletin_name)}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        },

        openAdd() {
            auth().openModal(
                '<i class="fas fa-plus"></i> Add Bulletin',
                `<div class="modal-form-grid cols-1">
                    <div class="form-group">
                        <label>Bulletin Name <span class="req">*</span></label>
                        <input type="text" id="bl-name" placeholder="e.g. Unity Speaks" required>
                    </div>
                    <div class="form-group">
                        <label>Edition</label>
                        <input type="text" id="bl-edition" placeholder="e.g. Vol.1 Edition.3">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="bl-desc" placeholder="Brief description..." rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Google Drive Link</label>
                        <input type="url" id="bl-drive" placeholder="https://drive.google.com/...">
                    </div>
                    <div class="form-group">
                        <label>Cover Image</label>
                        <div class="modal-file-upload">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click to upload cover image</p>
                            <span>JPG, PNG (Max 5MB)</span>
                            <input type="file" id="bl-cover-file" accept="image/*">
                        </div>
                        <div id="bl-cover-preview"></div>
                    </div>
                    <div class="form-group">
                        <label>Published Date</label>
                        <input type="date" id="bl-date">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="bl-status">
                            <option value="true">Published</option>
                            <option value="false">Draft</option>
                        </select>
                    </div>
                </div>`,
                async function (close) {
                    const name = (document.getElementById('bl-name') || {}).value.trim();
                    if (!name) { toast('Bulletin name required', 'warning'); return; }

                    let coverUrl = null;
                    const coverFile = (document.getElementById('bl-cover-file') || {}).files;
                    if (coverFile && coverFile[0] && window.UnityStorage) {
                        try {
                            const compressed = await window.UnityStorage.compressImage(coverFile[0]);
                            const path = 'bulletin_' + Date.now() + '.jpg';
                            coverUrl = await window.UnityStorage.uploadFile('bulletins', compressed, path);
                        } catch (e) { toast('Cover upload failed', 'warning'); }
                    }

                    try {
                        const user = auth().getCurrentUser();
                        const res = await fetch(`${API}/bulletins`, {
                            method: 'POST',
                            headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                            body: JSON.stringify({
                                bulletin_name: name,
                                edition: (document.getElementById('bl-edition') || {}).value.trim() || null,
                                description: (document.getElementById('bl-desc') || {}).value.trim() || null,
                                drive_link: (document.getElementById('bl-drive') || {}).value.trim() || null,
                                cover_image_url: coverUrl,
                                published_date: (document.getElementById('bl-date') || {}).value || null,
                                is_published: (document.getElementById('bl-status') || {}).value === 'true',
                                uploaded_by: user ? user.id : null
                            })
                        });
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        toast('Bulletin added!', 'success');
                        close();
                        await AdminBulletins.fetchAndRender();
                    } catch (e) {
                        toast('Failed: ' + e.message, 'error');
                    }
                },
                { saveLabel: '<i class="fas fa-plus"></i> Add Bulletin' }
            );

            setTimeout(function () {
                const coverFile = document.getElementById('bl-cover-file');
                if (coverFile) {
                    coverFile.addEventListener('change', function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = function (ev) {
                                const preview = document.getElementById('bl-cover-preview');
                                if (preview) preview.innerHTML = `<img src="${ev.target.result}" style="max-height:100px;border-radius:6px;margin-top:8px;">`;
                            };
                            reader.readAsDataURL(file);
                        }
                    });
                }
            }, 200);
        },

        async openEdit(id) {
            const b = this.data.find(function (x) { return x.id === id; });
            if (!b) return;
            auth().openModal(
                '<i class="fas fa-edit"></i> Edit Bulletin',
                `<div class="modal-form-grid cols-1">
                    <div class="form-group">
                        <label>Bulletin Name <span class="req">*</span></label>
                        <input type="text" id="ebl-name" value="${esc(b.bulletin_name)}" required>
                    </div>
                    <div class="form-group">
                        <label>Edition</label>
                        <input type="text" id="ebl-edition" value="${esc(b.edition || '')}">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="ebl-desc" rows="3">${esc(b.description || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Google Drive Link</label>
                        <input type="url" id="ebl-drive" value="${esc(b.drive_link || '')}">
                    </div>
                    <div class="form-group">
                        <label>Cover Image URL (current)</label>
                        <input type="url" id="ebl-cover-url" value="${esc(b.cover_image_url || '')}">
                        ${b.cover_image_url ? `<img src="${esc(b.cover_image_url)}" style="max-height:80px;margin-top:8px;border-radius:6px;" onerror="this.style.display='none';">` : ''}
                    </div>
                    <div class="form-group">
                        <label>Published Date</label>
                        <input type="date" id="ebl-date" value="${b.published_date || ''}">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="ebl-status">
                            <option value="true" ${b.is_published ? 'selected' : ''}>Published</option>
                            <option value="false" ${!b.is_published ? 'selected' : ''}>Draft</option>
                        </select>
                    </div>
                </div>`,
                async function (close) {
                    const name = (document.getElementById('ebl-name') || {}).value.trim();
                    if (!name) { toast('Name required', 'warning'); return; }
                    try {
                        const res = await fetch(`${API}/bulletins?id=eq.${id}`, {
                            method: 'PATCH',
                            headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                            body: JSON.stringify({
                                bulletin_name: name,
                                edition: (document.getElementById('ebl-edition') || {}).value.trim() || null,
                                description: (document.getElementById('ebl-desc') || {}).value.trim() || null,
                                drive_link: (document.getElementById('ebl-drive') || {}).value.trim() || null,
                                cover_image_url: (document.getElementById('ebl-cover-url') || {}).value.trim() || null,
                                published_date: (document.getElementById('ebl-date') || {}).value || null,
                                is_published: (document.getElementById('ebl-status') || {}).value === 'true'
                            })
                        });
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        toast('Bulletin updated!', 'success');
                        close();
                        await AdminBulletins.fetchAndRender();
                    } catch (e) {
                        toast('Failed: ' + e.message, 'error');
                    }
                }
            );
        },

        async confirmDelete(id, name) {
            auth().openConfirm('Delete Bulletin', `Delete "${name}"?`, async function () {
                try {
                    const res = await fetch(`${API}/bulletins?id=eq.${id}`, { method: 'DELETE', headers: H });
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    toast('Deleted!', 'success');
                    await AdminBulletins.fetchAndRender();
                } catch (e) { toast('Failed: ' + e.message, 'error'); }
            });
        }
    };

    document.getElementById('add-bulletin-btn') && document.getElementById('add-bulletin-btn').addEventListener('click', function () {
        AdminBulletins.openAdd();
    });

    // ============================================================
    // MEMBERSHIP APPLICATIONS
    // ============================================================
    window.AdminApplications = {
        data: [],

        async load() { await this.fetchAndRender(); },

        async fetchAndRender(status) {
            const tbody = document.getElementById('applications-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(9);
            try {
                let params = 'select=*&order=created_at.desc';
                if (status) params += '&status=eq.' + status;
                const data = await qFetch('membership_applications', params);
                this.data = data || [];
                this.render();
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(9, 'Could not load applications');
            }
        },

        render() {
            const tbody = document.getElementById('applications-table-body');
            if (!tbody) return;
            if (!this.data.length) {
                tbody.innerHTML = buildEmptyRow(9, 'No applications found');
                return;
            }
            tbody.innerHTML = this.data.map(app => `
                <tr>
                    <td>
                        ${app.photo_url
                    ? `<img src="${esc(app.photo_url)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--a-border);cursor:pointer;"
                               onclick="document.getElementById('image-preview-overlay').style.display='flex';document.getElementById('image-preview-img').src='${esc(app.photo_url)}';"
                               onerror="this.style.display='none';">`
                    : `<div class="cell-avatar-placeholder"><i class="fas fa-user"></i></div>`}
                    </td>
                    <td><div class="cell-name">${esc(app.name)}</div></td>
                    <td><small>${esc(app.email)}</small></td>
                    <td><small>${esc(app.phone)}</small></td>
                    <td><small>${app.date_of_birth ? fDate(app.date_of_birth) : '&mdash;'}</small></td>
                    <td>${app.blood_group ? `<span class="badge badge-danger"><i class="fas fa-tint"></i>${esc(app.blood_group)}</span>` : '&mdash;'}</td>
                    <td><small>${fDate((app.created_at || '').split('T')[0])}</small></td>
                    <td>${statusBadge(app.status)}</td>
                    <td>
                        <div class="cell-actions">
                            ${app.status === 'pending' ? `
                            <button class="action-btn approve" title="Approve" onclick="AdminApplications.updateStatus('${app.id}', 'approved')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn" title="Interview" style="color:var(--a-warning);" onclick="AdminApplications.updateStatus('${app.id}', 'interview_scheduled')">
                                <i class="fas fa-calendar-check"></i>
                            </button>
                            <button class="action-btn reject" title="Reject" onclick="AdminApplications.updateStatus('${app.id}', 'rejected')">
                                <i class="fas fa-times"></i>
                            </button>` : ''}
                            <button class="action-btn delete" title="Delete" onclick="AdminApplications.confirmDelete('${app.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        async updateStatus(id, status) {
            try {
                const user = auth().getCurrentUser();
                const res = await fetch(`${API}/membership_applications?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                    body: JSON.stringify({ status: status, reviewed_by: user ? user.id : null, reviewed_at: new Date().toISOString() })
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);

                if (status === 'approved') {
                    const app = this.data.find(function (a) { return a.id === id; });
                    if (app) {
                        auth().openConfirm('Create Member Profile',
                            `Create member profile for ${app.name}?`,
                            async function () {
                                await fetch(`${API}/members`, {
                                    method: 'POST',
                                    headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                                    body: JSON.stringify({
                                        name: app.name, email: app.email, phone: app.phone,
                                        date_of_birth: app.date_of_birth, blood_group: app.blood_group,
                                        photo_url: app.photo_url, is_active: true,
                                        join_date: new Date().toISOString().split('T')[0]
                                    })
                                });
                                toast('Member profile created!', 'success');
                            }, 'success'
                        );
                    }
                }

                toast('Application ' + status.replace(/_/g, ' '), 'success');
                await this.fetchAndRender();
            } catch (e) {
                toast('Failed: ' + e.message, 'error');
            }
        },

        async confirmDelete(id) {
            auth().openConfirm('Delete Application', 'Delete this application?', async function () {
                try {
                    const res = await fetch(`${API}/membership_applications?id=eq.${id}`, { method: 'DELETE', headers: H });
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    toast('Deleted!', 'success');
                    await AdminApplications.fetchAndRender();
                } catch (e) { toast('Failed: ' + e.message, 'error'); }
            });
        }
    };

    document.getElementById('app-filter-status') && document.getElementById('app-filter-status').addEventListener('change', function (e) {
        AdminApplications.fetchAndRender(e.target.value);
    });

    // ============================================================
    // BLOOD REQUESTS MANAGEMENT
    // ============================================================
    window.AdminBlood = {
        data: [],

        async load() { await this.fetchAndRender(); },

        async fetchAndRender() {
            const tbody = document.getElementById('blood-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(9);
            try {
                let params = 'select=*&order=created_at.desc';
                const group = (document.getElementById('blood-filter-group') || {}).value;
                const urgency = (document.getElementById('blood-filter-urgency') || {}).value;
                const status = (document.getElementById('blood-filter-status') || {}).value;
                if (group) params += '&blood_group=eq.' + encodeURIComponent(group);
                if (urgency) params += '&urgency=eq.' + urgency;
                if (status) params += '&status=eq.' + status;
                const data = await qFetch('blood_requests', params);
                this.data = data || [];
                this.render();
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(9, 'Could not load blood requests');
            }
        },

        render() {
            const tbody = document.getElementById('blood-table-body');
            if (!tbody) return;
            if (!this.data.length) {
                tbody.innerHTML = buildEmptyRow(9, 'No blood requests found');
                return;
            }
            tbody.innerHTML = this.data.map(r => `
                <tr>
                    <td>
                        <div class="cell-name">${esc(r.requester_name)}</div>
                        ${r.patient_name ? `<div class="cell-sub">Patient: ${esc(r.patient_name)}</div>` : ''}
                    </td>
                    <td><a href="tel:${esc(r.requester_phone)}" style="color:var(--a-primary);">${esc(r.requester_phone)}</a></td>
                    <td><span class="badge badge-danger" style="font-size:0.85rem;font-weight:800;">${esc(r.blood_group)}</span></td>
                    <td><small>${esc(r.hospital_name || '&mdash;')}</small></td>
                    <td><strong>${r.units_required || 1}</strong></td>
                    <td>${urgencyBadge(r.urgency)}</td>
                    <td><small>${r.required_by ? fDate(r.required_by) : '&mdash;'}</small></td>
                    <td>${statusBadge(r.status)}</td>
                    <td>
                        <div class="cell-actions">
                            ${r.status === 'active' ? `
                            <button class="action-btn approve" title="Fulfilled" onclick="AdminBlood.updateStatus('${r.id}', 'fulfilled')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn" title="Cancel" style="color:var(--a-warning);" onclick="AdminBlood.updateStatus('${r.id}', 'cancelled')">
                                <i class="fas fa-ban"></i>
                            </button>` : ''}
                            <button class="action-btn view" title="View" onclick="AdminBlood.viewDetails('${r.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn delete" title="Delete" onclick="AdminBlood.confirmDelete('${r.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        async updateStatus(id, status) {
            try {
                const res = await fetch(`${API}/blood_requests?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                    body: JSON.stringify({ status: status, updated_at: new Date().toISOString() })
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                toast('Request marked as ' + status, 'success');
                await this.fetchAndRender();
            } catch (e) { toast('Failed: ' + e.message, 'error'); }
        },

        viewDetails(id) {
            const r = this.data.find(function (x) { return x.id === id; });
            if (!r) return;
            auth().openModal(
                '<i class="fas fa-tint" style="color:var(--a-danger);"></i> Blood Request Details',
                `<div style="display:grid;gap:12px;">
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                        <div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Requester</div>
                            <div style="font-weight:600;">${esc(r.requester_name)}</div>
                        </div>
                        <div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Phone</div>
                            <a href="tel:${esc(r.requester_phone)}" style="font-weight:600;color:var(--a-primary);">${esc(r.requester_phone)}</a>
                        </div>
                        ${r.patient_name ? `<div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Patient</div>
                            <div style="font-weight:600;">${esc(r.patient_name)}</div>
                        </div>` : ''}
                        <div style="padding:12px;background:var(--a-danger-bg);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-danger);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Blood Group</div>
                            <div style="font-weight:800;font-size:1.2rem;color:var(--a-danger);">${esc(r.blood_group)}</div>
                        </div>
                        <div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Units</div>
                            <div style="font-weight:600;">${r.units_required || 1}</div>
                        </div>
                        <div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Urgency</div>
                            <div>${urgencyBadge(r.urgency)}</div>
                        </div>
                        ${r.hospital_name ? `<div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Hospital</div>
                            <div style="font-weight:600;">${esc(r.hospital_name)}</div>
                        </div>` : ''}
                        ${r.hospital_address ? `<div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Address</div>
                            <div style="font-size:0.85rem;">${esc(r.hospital_address)}</div>
                        </div>` : ''}
                        ${r.required_by ? `<div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Required By</div>
                            <div style="font-weight:600;">${fDate(r.required_by)}</div>
                        </div>` : ''}
                        <div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                            <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Status</div>
                            <div>${statusBadge(r.status)}</div>
                        </div>
                    </div>
                    <div style="font-size:0.75rem;color:var(--a-text3);">
                        Submitted: ${auth().formatTimeAgo(r.created_at)}
                        ${r.whatsapp_sent ? ' &middot; WhatsApp alert sent' : ''}
                    </div>
                </div>`,
                null,
                { hideSave: true }
            );
        },

        async confirmDelete(id) {
            auth().openConfirm('Delete Request', 'Delete this blood request?', async function () {
                try {
                    const res = await fetch(`${API}/blood_requests?id=eq.${id}`, { method: 'DELETE', headers: H });
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    toast('Deleted!', 'success');
                    await AdminBlood.fetchAndRender();
                } catch (e) { toast('Failed: ' + e.message, 'error'); }
            });
        }
    };

    ['blood-filter-group', 'blood-filter-urgency', 'blood-filter-status'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', function () { AdminBlood.fetchAndRender(); });
    });

    // ============================================================
    // EMAIL LOGS
    // ============================================================
    window.AdminEmailLogs = {
        async load() {
            const tbody = document.getElementById('email-logs-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(5);
            try {
                const data = await qFetch('email_logs', 'select=*&order=sent_at.desc&limit=100');
                if (!data.length) {
                    tbody.innerHTML = buildEmptyRow(5, 'No email logs found');
                    return;
                }
                tbody.innerHTML = data.map(function (log) {
                    return `<tr>
                        <td><span class="badge badge-${log.status === 'sent' ? 'success' : log.status === 'failed' ? 'danger' : 'info'}">
                            ${esc((log.email_type || '').replace(/_/g, ' '))}
                        </span></td>
                        <td><small>${esc(log.recipient || '&mdash;')}</small></td>
                        <td><small>${esc(log.subject || '&mdash;')}</small></td>
                        <td><span class="badge badge-${log.status === 'sent' ? 'success' : log.status === 'failed' ? 'danger' : 'gray'}">
                            ${esc(log.status || '')}
                        </span></td>
                        <td><small>${auth().formatTimeAgo(log.sent_at)}</small></td>
                    </tr>`;
                }).join('');
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(5, 'Could not load email logs');
            }
        }
    };

    // ============================================================
    // IMAGE PREVIEW MODAL
    // ============================================================
    const imgClose = document.getElementById('image-preview-close');
    const imgOverlay = document.getElementById('image-preview-overlay');
    if (imgClose) {
        imgClose.onclick = function () { if (imgOverlay) imgOverlay.style.display = 'none'; };
    }
    if (imgOverlay) {
        imgOverlay.addEventListener('click', function (e) {
            if (e.target === imgOverlay) imgOverlay.style.display = 'none';
        });
    }

    // ============================================================
    // DASHBOARD CARD ACTION BUTTONS
    // ============================================================
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.dash-card-action[data-page]');
        if (btn) {
            auth().navigateToPage(btn.dataset.page);
        }
    });

    // ============================================================
    // EXPOSE SECRETARY HELPERS GLOBALLY
    // ============================================================
    window.AdminSecretaryHelper = {
        getMode: getSecretaryMode,
        getLabels: getSignatureLabels
    };

    // ============================================================
    // INIT
    // ============================================================
    waitForAuth(function () {
        console.log('%c [Admin.js] v5.1 loaded - Settings Persistence Patched ', 'background:#10b981;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');
    });

})();
