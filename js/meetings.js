// ================================================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Advanced Meetings Management System
// File: js/meetings.js | Version: 10.2.0
// Features: Authenticated Edge Pipelines (DOCX + PDF)
// Inline Agenda Builder | Dynamic Email Dispatches | Compact Minutes UI
// Mail via Apps Script: invitation (+poster, +agenda PDF) | attendance form | minutes (+PDFs, +photos)
// ================================================================

(function () {
    'use strict';

    const EDGE_DOCX_URL = 'https://sbpwmkoxuokrscddhhuw.supabase.co/functions/v1/generate-docx';
    const EDGE_PDF_URL = 'https://sbpwmkoxuokrscddhhuw.supabase.co/functions/v1/generate-pdf';

    // Resolve public Supabase anon key for Edge Function gateway authentication
    function resolveAnonKey() {
        return (
            window.SUPABASE_ANON_KEY ||
            window.DB_ADMIN?.supabaseKey ||
            window.supabase?.supabaseKey ||
            window.DB?.supabaseKey ||
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicHdta294dW9rcnNjZGRoaHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MDIwMzUsImV4cCI6MjA1NDA3ODAzNX0.a-xJcZ3v3k6q5p_j_uHk5V5GfPqH3L9k2l1m4n7o8r0'
        );
    }

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
        catch (e) {
            console.error('Mail service raw reply (HTTP ' + resp.status + '):', text.slice(0, 500));
            throw new Error('Mail service gave an unexpected reply (HTTP ' + resp.status + '). In Apps Script open Executions to see the real error, and make sure the deployment is the latest version, Execute as: Me, Who has access: Anyone.');
        }
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

    const AdminMeetings = {
        currentView: 'list',
        currentPage: 1,
        pageSize: 20,
        searchQuery: '',
        typeFilter: 'all',
        statusFilter: 'all',
        currentMeetingId: null,
        agendaItems: [],
        minutesItems: [],
        attendanceEntries: [],
        meetingPhotos: [],
        canManage: false,
        formAgendaItems: [],

        // ==========================================
        // CLUB BRANDING CONSTANTS
        // ==========================================
        CLUB_INFO: {
            name: 'ROTARACT CLUB OF COIMBATORE UNITY',
            parent: 'Family of Rotary Club of Coimbatore East',
            clubId: '91594',
            district: 'RI District 3206',
            region: 'Coimbatore | Palakkad',
            rotaractLogo: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png',
            email: 'rotaractcoimbatoreunity@gmail.com',
            primaryColor: '#1a73e8',
            secondaryColor: '#7c3aed'
        },

        // ==========================================
        // 1. MAIN RENDER
        // ==========================================
        async render(workspace) {
            if (!workspace) return;
            const currentUser = window.AuthManager?.currentUser;
            if (!currentUser) { 
                workspace.innerHTML = this.renderUnauthorized(); 
                return; 
            }

            const role = currentUser.role;
            const isExecOrBoard = ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm', 'treasurer'].includes(role) ||
                currentUser.is_board_member || currentUser.isBoardMember;
            this.canManage = isExecOrBoard;

            if (!this.canManage) { 
                workspace.innerHTML = this.renderUnauthorized(); 
                return; 
            }

            workspace.innerHTML = `
                <div class="p-6 lg:p-10">
                    <div class="admin-page-header">
                        <div>
                            <div class="admin-breadcrumb">
                                <i class="fa-solid fa-house text-brand-blue"></i>
                                <span>/</span>
                                <span>Meetings Desk</span>
                            </div>
                            <h1 class="admin-page-title">Meetings Command Center</h1>
                            <p class="admin-page-subtitle">Schedule assembly sessions, build agenda points, dispatch email invitations, log minutes, and manage attendance registries.</p>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            ${this.canManage ? `
                                <button class="btn-primary" onclick="AdminMeetings.openMeetingForm()">
                                    <i class="fa-solid fa-plus"></i> Schedule Meeting
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- View Switcher Tabs -->
                    <div class="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
                        <button class="meeting-tab-btn active" data-view="list" onclick="AdminMeetings.switchView('list')"><i class="fa-solid fa-list mr-1.5"></i>All Meetings</button>
                        <button class="meeting-tab-btn" data-view="upcoming" onclick="AdminMeetings.switchView('upcoming')"><i class="fa-solid fa-calendar-check mr-1.5"></i>Upcoming</button>
                        <button class="meeting-tab-btn" data-view="past" onclick="AdminMeetings.switchView('past')"><i class="fa-solid fa-clock-rotate-left mr-1.5"></i>Past Archive</button>
                        <button class="meeting-tab-btn" data-view="attendance" onclick="AdminMeetings.switchView('attendance')"><i class="fa-solid fa-signature mr-1.5"></i>Attendance Ledger</button>
                    </div>

                    <!-- Filter Control Panel -->
                    <div class="admin-panel mb-6">
                        <div class="admin-panel-header flex-wrap gap-3">
                            <div class="flex items-center gap-3 flex-wrap flex-1">
                                <div class="relative flex-1 min-w-[240px] max-w-md">
                                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] pointer-events-none"></i>
                                    <input type="text" placeholder="Search meetings by name or venue..." value="${this.searchQuery}"
                                        class="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-blue/50"
                                        oninput="AdminMeetings.onSearchChange(this.value)">
                                </div>
                                <select onchange="AdminMeetings.onTypeFilter(this.value)" class="px-4 py-2.5 text-xs rounded-xl border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 cursor-pointer">
                                    <option value="all">All Classifications</option>
                                    <option value="general_body">General Body Meeting</option>
                                    <option value="board_meeting">Board Meeting</option>
                                </select>
                                <select onchange="AdminMeetings.onStatusFilter(this.value)" class="px-4 py-2.5 text-xs rounded-xl border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 cursor-pointer">
                                    <option value="all">All Statuses</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                        <div class="admin-panel-body p-0" id="meetings-table-wrapper">
                            <div class="skeleton-line w-full" style="height:200px;"></div>
                        </div>
                        <div class="admin-panel-footer" id="meetings-pagination"></div>
                    </div>
                </div>
            `;
            this.injectStyles();
            await this.switchView('list');
        },

        injectStyles() {
            if (document.getElementById('meeting-styles')) return;
            const style = document.createElement('style');
            style.id = 'meeting-styles';
            style.textContent = `
                .meeting-tab-btn { padding: 10px 18px; border-radius: 12px; font-size: 11px; font-weight: 700; color: var(--text-secondary); background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.3); transition: all 200ms; white-space: nowrap; cursor: pointer; backdrop-filter: blur(8px); }
                .dark .meeting-tab-btn { background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05); }
                .meeting-tab-btn:hover { border-color: rgba(26,115,232,0.4); color: #1a73e8; }
                .meeting-tab-btn.active { background: linear-gradient(135deg, #1a73e8, #7c3aed) !important; color: white !important; border-color: transparent !important; box-shadow: 0 4px 16px rgba(26,115,232,0.25); }
                .meeting-row-general { border-left: 4px solid #1a73e8 !important; }
                .meeting-row-board { border-left: 4px solid #7c3aed !important; }
                .agenda-item { display: flex; gap: 12px; padding: 14px; background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.4); border-radius: 14px; transition: all 200ms; }
                .dark .agenda-item { background: rgba(15,23,42,0.3); border: 1px solid rgba(255,255,255,0.05); }
                .agenda-item:hover { border-color: rgba(26,115,232,0.3); }
                
                .minutes-item { display: flex; flex-direction: column; gap: 10px; padding: 14px; background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5); border-radius: 14px; transition: all 200ms; width: 100%; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
                .dark .minutes-item { background: rgba(15,23,42,0.3); border: 1px solid rgba(255,255,255,0.06); }
                .minutes-item:hover { border-color: rgba(124,58,237,0.3); }
                
                .inline-agenda-item { display: flex; gap: 8px; padding: 10px; background: rgba(255,255,255,0.4); border: 1px solid rgba(0,0,0,0.05); border-radius: 10px; margin-bottom: 6px; align-items: center; }
                .dark .inline-agenda-item { background: rgba(15,23,42,0.3); border: 1px solid rgba(255,255,255,0.05); }
                .signature-preview { width: 100%; height: 60px; object-fit: contain; background: white; border-radius: 10px; border: 1px solid rgba(0,0,0,0.08); padding: 6px; }
                .attendance-row { display: grid; grid-template-columns: 40px 1.5fr 1.8fr 1fr 100px 120px 50px; gap: 12px; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.4); border-radius: 14px; margin-bottom: 8px; }
                .dark .attendance-row { background: rgba(15,23,42,0.3); border: 1px solid rgba(255,255,255,0.05); }
                @media (max-width: 1024px) { .attendance-row { grid-template-columns: 1fr; gap: 8px; } }
                .portfolio-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 100px; font-size: 9px; font-weight: 700; background: rgba(26,115,232,0.1); color: #1a73e8; border: 1px solid rgba(26,115,232,0.15); margin: 2px; }
                .dark .portfolio-chip { background: rgba(96,165,250,0.15); color: #93c5fd; border-color: rgba(96,165,250,0.2); }
            `;
            document.head.appendChild(style);
        },

        async switchView(view) {
            this.currentView = view;
            document.querySelectorAll('.meeting-tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-view') === view);
            });
            if (view === 'attendance') await this.renderAttendanceRecords();
            else await this.loadMeetingsData();
        },

        async loadMeetingsData() {
            const wrapper = document.getElementById('meetings-table-wrapper');
            if (!wrapper) return;
            try {
                let query = window.DB_ADMIN.from('meetings').select('*', { count: 'exact' });
                if (this.searchQuery) query = query.or(`meeting_name.ilike.%${this.searchQuery}%,venue.ilike.%${this.searchQuery}%`);
                if (this.typeFilter !== 'all') query = query.eq('meeting_type', this.typeFilter);
                if (this.statusFilter !== 'all') query = query.eq('status', this.statusFilter);

                const today = new Date().toISOString().split('T')[0];
                if (this.currentView === 'upcoming') query = query.gte('date', today);
                else if (this.currentView === 'past') query = query.lt('date', today);

                const offset = (this.currentPage - 1) * this.pageSize;
                query = query.order('date', { ascending: false }).order('start_time', { ascending: false }).range(offset, offset + this.pageSize - 1);

                const { data, count, error } = await query;
                if (error) throw error;
                this.renderMeetingsTable(data || [], count || 0);
            } catch (e) {
                wrapper.innerHTML = `<div class="p-8 text-center text-xs text-red-500">${e.message}</div>`;
            }
        },

        renderMeetingsTable(meetings, totalCount) {
            const wrapper = document.getElementById('meetings-table-wrapper');
            if (!wrapper) return;

            if (meetings.length === 0) {
                wrapper.innerHTML = `
                    <div class="empty-state py-16">
                        <i class="fa-solid fa-people-group empty-state-icon text-slate-300 dark:text-slate-600"></i>
                        <h4 class="empty-state-title">No Meetings Found</h4>
                        <p class="empty-state-desc">${this.canManage ? 'Schedule your first meeting.' : 'No meetings match your filters.'}</p>
                        ${this.canManage ? '<button class="btn-primary mt-4" onclick="AdminMeetings.openMeetingForm()"><i class="fa-solid fa-plus mr-1.5"></i> Schedule Meeting</button>' : ''}
                    </div>`;
                document.getElementById('meetings-pagination').innerHTML = '';
                return;
            }

            wrapper.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="admin-data-table">
                        <thead><tr><th>Meeting</th><th>Type</th><th>Date & Time</th><th>Venue</th><th>Status</th><th>Overview</th><th>Operations Panel</th></tr></thead>
                        <tbody>${meetings.map(m => this.renderMeetingRow(m)).join('')}</tbody>
                    </table>
                </div>`;

            const totalPages = Math.ceil(totalCount / this.pageSize);
            const pagEl = document.getElementById('meetings-pagination');
            if (totalPages > 1) {
                let btns = '';
                for (let i = Math.max(1, this.currentPage - 2); i <= Math.min(totalPages, this.currentPage + 2); i++) {
                    btns += `<button class="admin-pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="AdminMeetings.goToPage(${i})">${i}</button>`;
                }
                pagEl.innerHTML = `<div class="flex items-center justify-between flex-wrap gap-3"><span class="text-[10px] text-slate-400">Showing ${((this.currentPage - 1) * this.pageSize) + 1}-${Math.min(this.currentPage * this.pageSize, totalCount)} of ${totalCount}</span><div class="flex items-center gap-1"><button class="admin-pagination-btn" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="AdminMeetings.goToPage(${this.currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>${btns}<button class="admin-pagination-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="AdminMeetings.goToPage(${this.currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button></div></div>`;
            } else {
                pagEl.innerHTML = `<span class="text-[10px] text-slate-400">${totalCount} meeting${totalCount !== 1 ? 's' : ''}</span>`;
            }
        },

        renderMeetingRow(m) {
            const typeClass = m.meeting_type === 'board_meeting' ? 'meeting-row-board' : 'meeting-row-general';
            const typeLabel = m.meeting_type === 'board_meeting' ? 'Board' : 'General Body';
            const typeBadge = m.meeting_type === 'board_meeting' ? 'badge-purple' : 'badge-blue';
            const statusClass = { scheduled: 'badge-blue', in_progress: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red' }[m.status] || 'badge-gray';
            const statusLabel = (m.status || 'scheduled').replace('_', ' ');
            const agendaCount = (m.agenda_items || []).length;
            const minutesCount = (m.minutes_items || []).length;
            const hasPoster = !!m.poster_url;

            return `
                <tr class="${typeClass}">
                    <td>
                        <div class="flex items-center gap-3">
                            ${hasPoster ? `<img src="${window.Uploader?.getThumbnailUrl?.(m.poster_url, m.poster_provider || 'cloudinary', 80) || m.poster_url}" class="w-10 h-10 rounded-lg object-cover border border-white/20 shadow-sm" alt="">` : `<div class="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-people-group text-brand-blue text-xs"></i></div>`}
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">${window.AdminPanel.esc(m.meeting_name || 'Untitled')}</p>
                                ${m.group_number ? `<p class="text-[10px] text-slate-400 font-bold">Group ${m.group_number}</p>` : ''}
                            </div>
                        </div>
                    </td>
                    <td><span class="badge ${typeBadge}">${typeLabel}</span></td>
                    <td class="text-xs">
                        <p class="font-bold text-slate-700 dark:text-slate-300">${window.AdminPanel.fmtDate(m.date)}</p>
                        <p class="text-[10px] text-slate-400 font-semibold">${window.AdminPanel.fmtTime(m.start_time)}${m.end_time ? ' - ' + window.AdminPanel.fmtTime(m.end_time) : ''}</p>
                    </td>
                    <td class="text-xs truncate max-w-[180px] text-slate-500" title="${window.AdminPanel.esc(m.venue || '')}">${window.AdminPanel.esc(m.venue || 'TBA')}</td>
                    <td><span class="badge ${statusClass}" style="text-transform:capitalize;">${statusLabel}</span></td>
                    <td>
                        <div class="flex items-center gap-2">
                            <span title="Agenda Points: ${agendaCount}" class="${agendaCount > 0 ? 'text-green-500 font-bold' : 'text-slate-400'} text-xs flex items-center gap-1">
                                <i class="fa-solid fa-list-check text-[11px]"></i> ${agendaCount}
                            </span>
                            <span title="Minutes Logged: ${minutesCount}" class="${minutesCount > 0 ? 'text-green-500 font-bold' : 'text-slate-400'} text-xs flex items-center gap-1 ml-1">
                                <i class="fa-solid fa-file-pen text-[11px]"></i> ${minutesCount}
                            </span>
                            ${m.invitation_sent ? '<span title="Invitation dispatched" class="text-green-500 text-xs ml-1"><i class="fa-solid fa-envelope-circle-check text-[11px]"></i></span>' : ''}
                        </div>
                    </td>
                    <td>
                        <div class="flex items-center gap-1 flex-wrap">
                            <button onclick="AdminMeetings.viewMeeting('${m.id}')" class="btn-secondary btn-xs" title="View Details & Agenda"><i class="fa-solid fa-eye"></i></button>
                            ${this.canManage ? `
                                <button onclick="AdminMeetings.openMeetingForm('${m.id}')" class="btn-secondary btn-xs" title="Edit Meeting Details & Agenda"><i class="fa-solid fa-pen"></i></button>
                                <button onclick="AdminMeetings.openMinutesEditor('${m.id}')" class="btn-secondary btn-xs text-brand-purple" title="Log Proceedings Minutes"><i class="fa-solid fa-file-pen"></i></button>
                                <button onclick="AdminMeetings.openAttendanceEditor('${m.id}')" class="btn-secondary btn-xs text-green-500" title="Attendance Ledger"><i class="fa-solid fa-signature"></i></button>
                                <button onclick="AdminMeetings.sendAttendanceForm('${m.id}')" class="btn-secondary btn-xs text-cyan-500" title="Email Attendance Form"><i class="fa-solid fa-paper-plane"></i></button>
                                <button onclick="AdminMeetings.sendMinutesEmail('${m.id}')" class="btn-secondary btn-xs text-purple-500" title="Email Minutes (PDF + attendance + photos)"><i class="fa-solid fa-envelope-open-text"></i></button>
                                <button onclick="AdminMeetings.showDownloadMenu('${m.id}')" class="btn-secondary btn-xs text-amber-500" title="Download Documents"><i class="fa-solid fa-download"></i></button>
                                <button onclick="AdminMeetings.deleteMeeting('${m.id}')" class="btn-danger btn-xs" title="Purge Record"><i class="fa-solid fa-trash"></i></button>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
        },

        // ==========================================
        // 2. MEETING FORM (WITH AGENDA PLACED ABOVE INVITATION)
        // ==========================================
        async openMeetingForm(meetingId) {
            if (!this.canManage) { window.AppToast?.error('Access restricted.'); return; }

            let existing = null;
            if (meetingId) {
                const { data } = await window.DB_ADMIN.from('meetings').select('*').eq('id', meetingId).single();
                existing = data;
                this.currentMeetingId = meetingId;
                this.formAgendaItems = Array.isArray(existing?.agenda_items)
                    ? existing.agenda_items.map(item => typeof item === 'string' ? { point: item } : { point: item.point || '' })
                    : [];
            } else {
                this.currentMeetingId = null;
                this.formAgendaItems = [];
            }

            const today = new Date().toISOString().split('T')[0];

            window.AdminPanel.createModal({
                title: existing ? 'Edit Meeting & Agenda' : 'Schedule Assembly & Draft Agenda',
                size: 'wide',
                icon: 'people-group',
                body: `
                    <form id="meeting-form" onsubmit="return false;" class="space-y-5">
                        <div class="grid grid-cols-2 gap-4">
                            <label class="relative cursor-pointer">
                                <input type="radio" name="meeting_type" value="general_body" class="peer sr-only" ${!existing || existing.meeting_type === 'general_body' ? 'checked' : ''}>
                                <div class="p-5 rounded-2xl border-2 border-slate-200/60 dark:border-white/[0.08] peer-checked:border-brand-blue peer-checked:bg-brand-blue/5 transition-all">
                                    <div class="flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-xl bg-brand-blue/15 flex items-center justify-center"><i class="fa-solid fa-users text-brand-blue text-lg"></i></div>
                                        <div><p class="text-sm font-bold">General Body Assembly</p><p class="text-[10px] text-slate-400">All registered club members</p></div>
                                    </div>
                                </div>
                            </label>
                            <label class="relative cursor-pointer">
                                <input type="radio" name="meeting_type" value="board_meeting" class="peer sr-only" ${existing?.meeting_type === 'board_meeting' ? 'checked' : ''}>
                                <div class="p-5 rounded-2xl border-2 border-slate-200/60 dark:border-white/[0.08] peer-checked:border-brand-purple peer-checked:bg-brand-purple/5 transition-all">
                                    <div class="flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-xl bg-brand-purple/15 flex items-center justify-center"><i class="fa-solid fa-user-tie text-brand-purple text-lg"></i></div>
                                        <div><p class="text-sm font-bold">Board of Directors</p><p class="text-[10px] text-slate-400">Board members only</p></div>
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-circle-info"></i> Meeting Details</h3></div>
                            <div class="admin-panel-body">
                                <div class="admin-form-grid">
                                    <div class="admin-form-group full-width">
                                        <label class="admin-form-label">Meeting Name / Title <span class="required">*</span></label>
                                        <input type="text" name="meeting_name" required class="admin-form-input" value="${existing?.meeting_name || ''}" placeholder="e.g., Monthly General Assembly — October 2026">
                                    </div>
                                    <div class="admin-form-group">
                                        <label class="admin-form-label">Schedule Date <span class="required">*</span></label>
                                        <input type="date" name="date" required class="admin-form-input" value="${existing?.date || today}">
                                    </div>
                                    <div class="admin-form-group">
                                        <label class="admin-form-label">Organizing Group Designation</label>
                                        <select name="group_number" class="admin-form-input admin-form-select">
                                            <option value="">Select Group</option>
                                            ${[1, 2, 3, 4, 5, 6].map(g => `<option value="${g}" ${existing?.group_number == g ? 'selected' : ''}>Group ${g}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="admin-form-group">
                                        <label class="admin-form-label">Start Time <span class="required">*</span></label>
                                        <input type="time" name="start_time" required class="admin-form-input" value="${existing?.start_time || ''}">
                                    </div>
                                    <div class="admin-form-group">
                                        <label class="admin-form-label">End Time</label>
                                        <input type="time" name="end_time" class="admin-form-input" value="${existing?.end_time || ''}">
                                    </div>
                                    <div class="admin-form-group full-width">
                                        <label class="admin-form-label">Physical Venue / Platform Link <span class="required">*</span></label>
                                        <input type="text" name="venue" required class="admin-form-input" value="${existing?.venue || ''}" placeholder="Full physical address or virtual meeting URL">
                                    </div>
                                    <div class="admin-form-group">
                                        <label class="admin-form-label">Minutes Prepared By</label>
                                        <input type="text" name="minutes_prepared_by" class="admin-form-input" value="${existing?.minutes_prepared_by || ''}" placeholder="Secretary on record">
                                    </div>
                                    <div class="admin-form-group">
                                        <label class="admin-form-label">Sergeant At Arms</label>
                                        <input type="text" name="sergeant_at_arms" class="admin-form-input" value="${existing?.sergeant_at_arms || ''}" placeholder="Sergeant name">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Inline Agenda Builder -->
                        <div class="admin-panel" style="border-left: 4px solid #1a73e8 !important;">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-list-check text-brand-blue"></i> Meeting Agenda Points</h3>
                                <span class="badge badge-blue" id="form-agenda-counter">${this.formAgendaItems.length} points</span>
                            </div>
                            <div class="admin-panel-body">
                                <div class="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 mb-4">
                                    <p class="text-xs text-blue-700 dark:text-blue-400 leading-relaxed font-semibold">
                                        <i class="fa-solid fa-circle-info mr-1"></i>
                                        These agenda items will be included directly in the meeting invitation email sent to members.
                                    </p>
                                </div>
                                <div id="form-agenda-items-container" class="space-y-2 mb-3"></div>
                                <button type="button" onclick="AdminMeetings.addFormAgendaItem()" class="w-full py-3 border-2 border-dashed border-slate-200/80 dark:border-white/[0.08] rounded-xl text-xs font-bold text-slate-500 hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue/5 transition-all">
                                    <i class="fa-solid fa-plus mr-1.5"></i> Add Agenda Point
                                </button>
                            </div>
                        </div>

                        <!-- Poster Upload -->
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-image"></i> Session Poster</h3></div>
                            <div class="admin-panel-body">
                                <div class="admin-upload-zone" id="poster-upload-zone">
                                    <input type="file" id="poster-upload-input" accept="image/*">
                                    <i class="fa-solid fa-cloud-arrow-up admin-upload-icon"></i>
                                    <p class="admin-upload-text">Upload meeting poster</p>
                                    <p class="admin-upload-hint">Auto-compressed JPG, PNG, WebP.</p>
                                </div>
                                <div id="poster-preview" class="mt-3">
                                    ${existing?.poster_url ? `
                                        <div class="flex items-center gap-3 p-3 bg-green-500/5 rounded-xl border border-green-500/20">
                                            <img src="${existing.poster_url}" class="w-16 h-16 rounded-lg object-cover">
                                            <div><p class="text-xs font-bold text-green-600">Poster connected</p><p class="text-[10px] text-slate-400">Upload new to replace</p></div>
                                        </div>` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Dispatch Options -->
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-envelope text-indigo-500"></i> Dispatch Options</h3></div>
                            <div class="admin-panel-body space-y-3">
                                <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-800/20 bg-indigo-500/[0.02] hover:border-indigo-500 transition-all">
                                    <input type="checkbox" name="send_invitation" class="w-4 h-4 accent-indigo-500" ${!existing ? 'checked' : ''}>
                                    <div>
                                        <p class="text-xs font-bold text-indigo-700 dark:text-indigo-400">📧 Send Invitation with Poster & Agenda</p>
                                        <p class="text-[10px] text-slate-400">Dispatches meeting announcement email containing poster, date, venue, and full numbered agenda</p>
                                    </div>
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-cyan-200/60 dark:border-cyan-800/20 bg-cyan-500/[0.02] hover:border-cyan-500 transition-all">
                                    <input type="checkbox" name="send_attendance_form" class="w-4 h-4 accent-cyan-500">
                                    <div>
                                        <p class="text-xs font-bold text-cyan-700 dark:text-cyan-400">✍️ Also Send Attendance Submission Link</p>
                                        <p class="text-[10px] text-slate-400">Members receive a link to submit attendance (Name, RI ID, In-Time, Portfolios, and Signature)</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="AdminMeetings.submitMeeting('${meetingId || ''}')">
                        <i class="fa-solid fa-floppy-disk mr-1"></i> ${existing ? 'Commit Changes' : 'Schedule & Dispatch'}
                    </button>
                `
            });

            setTimeout(() => {
                this.bindPosterUpload(existing);
                this.renderFormAgendaList();
            }, 100);

            window._uploadedPosterUrl = existing?.poster_url || '';
            window._uploadedPosterProvider = existing?.poster_provider || '';
            window._uploadedPosterPublicId = existing?.poster_public_id || '';
        },

        addFormAgendaItem() { this.formAgendaItems.push({ point: '' }); this.renderFormAgendaList(); },
        updateFormAgendaItem(i, v) { if (this.formAgendaItems[i]) this.formAgendaItems[i].point = v; },
        moveFormAgendaItem(i, d) {
            const ni = i + d;
            if (ni < 0 || ni >= this.formAgendaItems.length) return;
            [this.formAgendaItems[i], this.formAgendaItems[ni]] = [this.formAgendaItems[ni], this.formAgendaItems[i]];
            this.renderFormAgendaList();
        },
        removeFormAgendaItem(i) { this.formAgendaItems.splice(i, 1); this.renderFormAgendaList(); },

        renderFormAgendaList() {
            const container = document.getElementById('form-agenda-items-container');
            const counter = document.getElementById('form-agenda-counter');
            if (!container) return;
            if (counter) counter.textContent = `${this.formAgendaItems.length} point${this.formAgendaItems.length !== 1 ? 's' : ''}`;

            if (this.formAgendaItems.length === 0) {
                container.innerHTML = '<p class="text-center text-xs text-slate-400 py-6">No agenda points drafted yet. Click below to add.</p>';
                return;
            }

            container.innerHTML = this.formAgendaItems.map((item, i) => `
                <div class="inline-agenda-item">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-blue to-brand-purple text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">${i + 1}</div>
                    <input type="text" value="${window.AdminPanel.esc(item.point || '')}" placeholder="Draft agenda target description..." class="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-blue/50" onchange="AdminMeetings.updateFormAgendaItem(${i}, this.value)">
                    <div class="flex items-center gap-1 flex-shrink-0">
                        ${i > 0 ? `<button type="button" onclick="AdminMeetings.moveFormAgendaItem(${i}, -1)" class="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-brand-blue"><i class="fa-solid fa-arrow-up text-[9px]"></i></button>` : ''}
                        ${i < this.formAgendaItems.length - 1 ? `<button type="button" onclick="AdminMeetings.moveFormAgendaItem(${i}, 1)" class="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-brand-blue"><i class="fa-solid fa-arrow-down text-[9px]"></i></button>` : ''}
                        <button type="button" onclick="AdminMeetings.removeFormAgendaItem(${i})" class="w-6 h-6 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash text-[9px]"></i></button>
                    </div>
                </div>
            `).join('');
        },

        bindPosterUpload(existing) {
            const input = document.getElementById('poster-upload-input');
            if (!input) return;
            input.addEventListener('change', async (e) => {
                if (!e.target.files?.[0]) return;
                const preview = document.getElementById('poster-preview');
                preview.innerHTML = '<p class="text-xs text-slate-500 mt-2"><i class="fa-solid fa-spinner fa-spin"></i> Uploading...</p>';
                try {
                    const result = await window.Uploader.upload(e.target.files[0], { type: 'meeting_poster', folder: 'meetings' });
                    window._uploadedPosterUrl = result.url;
                    window._uploadedPosterProvider = result.provider;
                    window._uploadedPosterPublicId = result.publicId || '';
                    preview.innerHTML = `
                        <div class="flex items-center gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                            <img src="${result.url}" class="w-16 h-16 rounded-lg object-cover">
                            <div class="flex-1"><p class="text-xs font-bold text-green-600">Uploaded via ${result.provider}</p></div>
                        </div>`;
                    window.AppToast?.success('Poster attached!');
                } catch (err) {
                    preview.innerHTML = `<p class="text-xs text-red-500 mt-2">Upload failed: ${err.message}</p>`;
                }
            });
        },

        async submitMeeting(meetingId) {
            const form = document.getElementById('meeting-form');
            if (!form) return;
            const fd = new FormData(form);

            if (!fd.get('meeting_name') || !fd.get('date') || !fd.get('start_time') || !fd.get('venue')) {
                window.AppToast?.warning('Please fill all mandatory fields.');
                return;
            }

            const cleanedAgenda = this.formAgendaItems.map(i => (i.point || '').trim()).filter(Boolean);

            const payload = {
                meeting_name: fd.get('meeting_name'),
                meeting_type: fd.get('meeting_type'),
                date: fd.get('date'),
                start_time: fd.get('start_time'),
                end_time: fd.get('end_time') || null,
                venue: fd.get('venue'),
                group_number: fd.get('group_number') || null,
                minutes_prepared_by: fd.get('minutes_prepared_by') || null,
                sergeant_at_arms: fd.get('sergeant_at_arms') || null,
                poster_url: window._uploadedPosterUrl || null,
                agenda_items: cleanedAgenda,
                status: 'scheduled'
            };
            if (window._uploadedPosterUrl) {
                payload.poster_provider = window._uploadedPosterProvider || 'cloudinary';
                if (window._uploadedPosterPublicId) payload.poster_public_id = window._uploadedPosterPublicId;
            }
            if (meetingId) delete payload.status;

            try {
                let savedId = meetingId;
                if (meetingId) {
                    await window.DB_ADMIN.from('meetings').update(payload).eq('id', meetingId);
                    window.AppToast?.success('Assembly details updated.');
                } else {
                    const uid = window.AuthManager?.currentUser?.id;
                    if (/^[0-9a-f-]{36}$/i.test(uid || '')) payload.created_by = uid;
                    payload.status = 'scheduled';
                    const { data } = await window.DB_ADMIN.from('meetings').insert(payload).select('id').single();
                    savedId = data?.id;
                    window.AppToast?.success('Assembly session scheduled.');
                }

                if (fd.get('send_invitation') === 'on' && savedId) await this.sendInvitationEmail(savedId);
                if (fd.get('send_attendance_form') === 'on' && savedId) await this.sendAttendanceForm(savedId, true);

                window.AdminPanel.logActivity(meetingId ? 'UPDATE' : 'CREATE', 'meeting', savedId);
                window.AdminPanel.closeModal();
                await this.loadMeetingsData();
            } catch (e) {
                window.AppToast?.error('Save failed: ' + e.message);
            }
        },

        // ==========================================
        // 3. EMAIL INVITATION SYSTEM
        // ==========================================
        async sendInvitationManual(meetingId) {
            if (!confirm('Resend invitation email with poster and agenda points to members?')) return;
            await this.sendInvitationEmail(meetingId);
        },

        async sendInvitationEmail(meetingId) {
            try {
                const { data: meeting } = await window.DB_ADMIN.from('meetings').select('*').eq('id', meetingId).single();
                if (!meeting) { window.AppToast?.error('Meeting not found.'); return; }

                window.AppToast?.info('Preparing and sending meeting invitations...');

                const recipientType = meeting.meeting_type === 'board_meeting' ? 'board' : 'all_members';
                let recipients = [];

                try {
                    if (window.getEmailRecipients) {
                        recipients = await window.getEmailRecipients(recipientType);
                    } else {
                        let query = window.DB_ADMIN.from('users').select('email, full_name').eq('is_active', true).neq('role', 'super_admin').not('email', 'is', null);
                        if (recipientType === 'board') query = query.eq('is_board_member', true);
                        const { data } = await query;
                        recipients = (data || []).map(u => u.email).filter(e => e && e.includes('@'));
                    }
                } catch (e) { console.warn('Recipient fetch failed:', e); }

                if (recipients.length === 0) { window.AppToast?.warning('No recipients found.'); return; }

                const emailBody = this.buildInvitationEmailHTML(meeting);
                const sender = window.AuthManager.currentUser;

                const { data: logEntry } = await window.DB_ADMIN.from('email_log').insert({
                    email_type: 'meeting_invitation',
                    subject: `📅 Meeting Invitation: ${meeting.meeting_name}`,
                    html_body: emailBody,
                    sender_id: sender.id,
                    sender_name: sender.full_name || sender.name,
                    sender_role: sender.role,
                    recipient_emails: recipients,
                    recipient_count: recipients.length,
                    status: 'sending'
                }).select().single();

                try {
                    // Agenda PDF (only when agenda points exist) + poster are attached to the mail
                    const files = [];
                    if ((meeting.agenda_items || []).length > 0) {
                        const agendaFile = await this.fetchDocFile('meeting_agenda', meetingId, `Agenda_${this.safeFileName(meeting.meeting_name)}.pdf`);
                        if (agendaFile) files.push(agendaFile);
                    }

                    const result = await postToScript({
                        type: 'meeting_invitation',
                        meeting_id: meetingId,
                        recipients,
                        subject: `📅 Meeting Invitation: ${meeting.meeting_name}`,
                        html_body: emailBody,
                        attachment_urls: /^https?:\/\//i.test(meeting.poster_url || '') ? [meeting.poster_url] : [],
                        files,
                        sender: { role: sender.role, name: sender.full_name || sender.name, email: sender.email }
                    });
                    if (result.success) {
                        if (logEntry) await window.DB_ADMIN.from('email_log').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', logEntry.id);
                        await window.DB_ADMIN.from('meetings').update({ invitation_sent: true, invitation_sent_at: new Date().toISOString() }).eq('id', meetingId);
                        window.AppToast?.success(`✅ Invitation sent to ${recipients.length} recipients.`);
                    } else { throw new Error(result.error || 'Send failed'); }
                } catch (sendErr) {
                    if (logEntry) await window.DB_ADMIN.from('email_log').update({ status: 'failed', error_message: sendErr.message }).eq('id', logEntry.id);
                    throw sendErr;
                }

                await window.AdminPanel.logActivity('EMAIL_BROADCAST', 'meeting', meetingId, {
                    type: 'invitation', recipients: recipients.length,
                    has_poster: !!meeting.poster_url, agenda_items: (meeting.agenda_items || []).length
                });
            } catch (e) {
                console.error('Invitation send failed:', e);
                window.AppToast?.error('Failed to send invitation: ' + e.message);
            }
        },

        buildInvitationEmailHTML(meeting) {
            const date = window.AdminPanel.fmtDate(meeting.date);
            const dayName = new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'long' });
            const time = window.AdminPanel.fmtTime(meeting.start_time);
            const endTime = meeting.end_time ? window.AdminPanel.fmtTime(meeting.end_time) : '';
            const meetingTypeLabel = meeting.meeting_type === 'board_meeting' ? 'Board of Directors Meeting' : 'General Body Assembly';
            const CI = this.CLUB_INFO;

            let agendaHTML = '';
            const agenda = meeting.agenda_items || [];
            if (agenda.length > 0) {
                agendaHTML = `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                        <tr><td style="padding:24px;background:linear-gradient(135deg,#eff6ff 0%,#faf5ff 100%);border-left:5px solid ${CI.primaryColor};border-radius:0 16px 16px 0;">
                            <h3 style="color:${CI.primaryColor};margin:0 0 18px;font-size:17px;font-weight:800;font-family:'Segoe UI',Arial,sans-serif;">
                                📋 MEETING AGENDA
                            </h3>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                ${agenda.map((item, i) => {
                                    const text = typeof item === 'string' ? item : (item.point || '');
                                    return `
                                        <tr>
                                            <td style="padding:8px 0;vertical-align:top;width:36px;">
                                                <div style="display:inline-block;width:26px;height:26px;background:linear-gradient(135deg,${CI.primaryColor},${CI.secondaryColor});color:white;border-radius:50%;text-align:center;line-height:26px;font-weight:bold;font-size:11px;">${i + 1}</div>
                                            </td>
                                            <td style="padding:8px 0 8px 10px;color:#334155;font-size:13px;line-height:1.7;vertical-align:middle;">
                                                ${window.AdminPanel.esc(text)}
                                            </td>
                                        </tr>`;
                                }).join('')}
                            </table>
                        </td></tr>
                    </table>`;
            }

            let posterHTML = '';
            if (meeting.poster_url) {
                posterHTML = `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                        <tr><td align="center">
                            <img src="${meeting.poster_url}" alt="Meeting Poster" style="max-width:100%;height:auto;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.15);">
                        </td></tr>
                    </table>`;
            }

            return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Meeting Invitation</title></head>
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.1);">
        <tr><td style="background:linear-gradient(135deg,${CI.primaryColor},${CI.secondaryColor});padding:40px 30px;text-align:center;">
            <h1 style="color:white;margin:0 0 8px;font-size:26px;font-weight:900;">📅 Meeting Invitation</h1>
            <p style="color:rgba(255,255,255,0.95);margin:0;font-size:13px;font-weight:700;letter-spacing:1px;">${CI.name}</p>
        </td></tr>
        <tr><td style="padding:36px 30px;">
            <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0 0 24px;font-weight:600;">Dear Fellow Rotaractor,</p>
            <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 24px;">You are cordially invited to attend the following meeting:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr><td style="background:linear-gradient(135deg,${CI.primaryColor},${CI.secondaryColor});padding:24px;border-radius:16px;text-align:center;">
                    <p style="color:rgba(255,255,255,0.8);margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${meetingTypeLabel}</p>
                    <h2 style="color:white;margin:0;font-size:22px;font-weight:900;line-height:1.3;">${window.AdminPanel.esc(meeting.meeting_name)}</h2>
                </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                    <td style="padding:12px 16px;background:#f0f9ff;border-radius:12px 0 0 12px;border-right:2px solid white;width:50%;">
                        <p style="margin:0;color:#0891b2;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">📅 Date</p>
                        <p style="margin:4px 0 0;color:#1e293b;font-size:14px;font-weight:700;">${dayName}, ${date}</p>
                    </td>
                    <td style="padding:12px 16px;background:#f0f9ff;border-radius:0 12px 12px 0;width:50%;">
                        <p style="margin:0;color:#0891b2;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">🕐 Time</p>
                        <p style="margin:4px 0 0;color:#1e293b;font-size:14px;font-weight:700;">${time}${endTime ? ' - ' + endTime : ''}</p>
                    </td>
                </tr>
            </table>
            <div style="padding:14px 18px;background:#fef3c7;border-radius:12px;margin:16px 0;">
                <p style="margin:0;color:#92400e;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">📍 Venue</p>
                <p style="margin:6px 0 0;color:#1e293b;font-size:14px;font-weight:700;">${window.AdminPanel.esc(meeting.venue)}</p>
            </div>
            ${meeting.group_number ? `
                <div style="padding:14px 18px;background:#f0fdf4;border-radius:12px;margin:16px 0;">
                    <p style="margin:0;color:#166534;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">👥 Group</p>
                    <p style="margin:6px 0 0;color:#1e293b;font-size:14px;font-weight:700;">Group ${meeting.group_number}</p>
                </div>` : ''}
            ${posterHTML}
            ${agendaHTML}
            <p style="color:#334155;font-size:14px;line-height:1.7;margin:28px 0 0;">Looking forward to your active participation.</p>
            <p style="color:#334155;font-size:14px;line-height:1.7;margin:16px 0 0;">
                Yours in Rotaract,<br>
                <strong style="color:${CI.primaryColor};">${CI.name}</strong>
            </p>
        </td></tr>
        <tr><td style="background:#1e293b;padding:24px 30px;text-align:center;">
            <p style="color:white;margin:0 0 8px;font-size:14px;font-weight:800;">${CI.name}</p>
            <p style="color:#94a3b8;margin:0 0 4px;font-size:11px;">${CI.parent}</p>
            <p style="color:#64748b;margin:0;font-size:10px;">Club ID: ${CI.clubId} | ${CI.district} (${CI.region})</p>
        </td></tr>
    </table>
</body>
</html>`;
        },

        // ==========================================
        // 4. SEND ATTENDANCE FORM EMAIL
        // ==========================================
        async sendAttendanceForm(meetingId, silent) {
            try {
                const { data: meeting } = await window.DB_ADMIN.from('meetings').select('*').eq('id', meetingId).single();
                if (!meeting) { window.AppToast?.error('Meeting not found.'); return; }

                if (!silent) {
                    const confirmed = window.confirm(`Send attendance submission form for "${meeting.meeting_name}"?\n\nMembers receive a link to submit:\n• Full Name\n• RI ID\n• Portfolios (multiple)\n• In-Time\n• E-Signature upload`);
                    if (!confirmed) return;
                }

                window.AppToast?.info('Preparing attendance emails...');

                const recipientType = meeting.meeting_type === 'board_meeting' ? 'board' : 'all_members';
                let recipients = [];

                try {
                    if (window.getEmailRecipients) {
                        recipients = await window.getEmailRecipients(recipientType);
                    } else {
                        let query = window.DB_ADMIN.from('users').select('email').eq('is_active', true).neq('role', 'super_admin').not('email', 'is', null);
                        if (recipientType === 'board') query = query.eq('is_board_member', true);
                        const { data } = await query;
                        recipients = (data || []).map(u => u.email).filter(e => e && e.includes('@'));
                    }
                } catch (e) { console.warn('Recipient fetch failed:', e); }

                if (recipients.length === 0) { window.AppToast?.warning('No recipients found.'); return; }

                const attendanceFormUrl = `${window.location.origin}/attendance.html?meeting=${meetingId}`;
                const emailBody = this.buildAttendanceFormEmailHTML(meeting, attendanceFormUrl);
                const sender = window.AuthManager.currentUser;

                const { data: logEntry } = await window.DB_ADMIN.from('email_log').insert({
                    email_type: 'attendance_form',
                    subject: `✍️ Attendance Form: ${meeting.meeting_name}`,
                    html_body: emailBody,
                    sender_id: sender.id,
                    sender_name: sender.full_name || sender.name,
                    sender_role: sender.role,
                    recipient_emails: recipients,
                    recipient_count: recipients.length,
                    status: 'sending'
                }).select().single();

                try {
                    const result = await postToScript({
                        type: 'attendance_form',
                        meeting_id: meetingId,
                        recipients,
                        subject: `✍️ Attendance Required: ${meeting.meeting_name}`,
                        html_body: emailBody,
                        sender: { role: sender.role, name: sender.full_name || sender.name, email: sender.email }
                    });
                    if (result.success) {
                        if (logEntry) await window.DB_ADMIN.from('email_log').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', logEntry.id);
                        await window.DB_ADMIN.from('meetings').update({ attendance_form_sent: true }).eq('id', meetingId);
                        window.AppToast?.success(`✅ Attendance form sent to ${recipients.length} members!`);
                    } else { throw new Error(result.error || 'Send failed'); }
                } catch (sendErr) {
                    if (logEntry) await window.DB_ADMIN.from('email_log').update({ status: 'failed', error_message: sendErr.message }).eq('id', logEntry.id);
                    throw sendErr;
                }

                await window.AdminPanel.logActivity('EMAIL_BROADCAST', 'meeting', meetingId, { type: 'attendance_form', recipients: recipients.length });
            } catch (e) {
                console.error('Attendance form send failed:', e);
                window.AppToast?.error('Failed: ' + e.message);
            }
        },

        buildAttendanceFormEmailHTML(meeting, formUrl) {
            const date = window.AdminPanel.fmtDate(meeting.date);
            const time = window.AdminPanel.fmtTime(meeting.start_time);
            const CI = this.CLUB_INFO;

            return `
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><title>Attendance Submission</title></head>
                <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Poppins','Segoe UI',Arial,sans-serif;">
                    <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.1);">
                        <div style="background:linear-gradient(135deg,#06b6d4,#0891b2);padding:36px 30px;text-align:center;">
                            <div style="width:70px;height:70px;background:white;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                                <span style="font-size:36px;">✍️</span>
                            </div>
                            <h1 style="color:white;margin:0 0 8px;font-size:24px;font-weight:900;">Attendance Submission</h1>
                            <p style="color:rgba(255,255,255,0.9);margin:0;font-size:13px;">${CI.name}</p>
                        </div>
                        <div style="padding:36px 30px;">
                            <h2 style="color:#0891b2;margin:0 0 16px;font-size:18px;">Dear Rotaractor,</h2>
                            <p style="color:#334155;font-size:14px;line-height:1.7;">
                                Please confirm your presence for the following meeting by submitting your attendance details and uploading your signature image.
                            </p>
                            <div style="background:linear-gradient(135deg,#ecfeff,#f0f9ff);border-left:4px solid #06b6d4;padding:20px;border-radius:0 12px 12px 0;margin:24px 0;">
                                <h3 style="color:#0891b2;margin:0 0 10px;font-size:15px;">${window.AdminPanel.esc(meeting.meeting_name)}</h3>
                                <p style="margin:6px 0;color:#334155;font-size:13px;"><strong>📅 Date:</strong> ${date}</p>
                                <p style="margin:6px 0;color:#334155;font-size:13px;"><strong>🕐 Time:</strong> ${time}${meeting.end_time ? ' - ' + window.AdminPanel.fmtTime(meeting.end_time) : ''}</p>
                                <p style="margin:6px 0;color:#334155;font-size:13px;"><strong>📍 Venue:</strong> ${window.AdminPanel.esc(meeting.venue)}</p>
                            </div>
                            <div style="text-align:center;margin:36px 0;">
                                <a href="${formUrl}" style="display:inline-block;padding:16px 44px;background:linear-gradient(135deg,#06b6d4,#0891b2);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px;box-shadow:0 10px 30px rgba(6,182,212,0.35);">
                                    ✍️ Submit My Attendance
                                </a>
                            </div>
                            <p style="color:#64748b;font-size:11px;text-align:center;margin:16px 0 0;">
                                Direct Link: <a href="${formUrl}" style="color:#06b6d4;word-break:break-all;">${formUrl}</a>
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        },

        // ==========================================
        // 5. MINUTES EDITOR
        // ==========================================
        async openMinutesEditor(meetingId) {
            this.currentMeetingId = meetingId;
            const { data: meeting } = await window.DB_ADMIN.from('meetings').select('*').eq('id', meetingId).single();
            if (!meeting) return;

            this.minutesItems = Array.isArray(meeting.minutes_items) ? [...meeting.minutes_items] : [];
            this.meetingPhotos = Array.isArray(meeting.meeting_photos) ? [...meeting.meeting_photos] : [];

            window.AdminPanel.createModal({
                title: 'Record Minutes — ' + meeting.meeting_name,
                size: 'wide',
                icon: 'file-pen',
                body: `
                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-clock"></i> Session Timings</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-grid">
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Actual Start Time</label>
                                    <input type="time" id="minutes-actual-start" class="admin-form-input" value="${meeting.actual_start_time || meeting.start_time || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Actual End Time</label>
                                    <input type="time" id="minutes-actual-end" class="admin-form-input" value="${meeting.actual_end_time || meeting.end_time || ''}">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-file-pen"></i> Minutes Proceedings Log</h3></div>
                        <div class="admin-panel-body">
                            <div id="minutes-items-container" class="space-y-4 mb-4"></div>
                            <button type="button" onclick="AdminMeetings.addMinutesItem()" class="w-full py-3 border-2 border-dashed border-slate-200/80 dark:border-white/[0.08] rounded-xl text-xs font-bold text-slate-500 hover:border-brand-purple hover:text-brand-purple hover:bg-brand-purple/5 transition-all">
                                <i class="fa-solid fa-plus mr-1.5"></i> Add Minutes Entry
                            </button>
                        </div>
                    </div>
                    <div class="admin-panel">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-shield-check"></i> Sign-off State</h3></div>
                        <div class="admin-panel-body">
                            <label class="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" id="minutes-approved" class="w-4 h-4 accent-green-500" ${meeting.minutes_approved ? 'checked' : ''}>
                                <div><p class="text-xs font-bold">Approve proceedings minutes</p></div>
                            </label>
                        </div>
                    </div>
                `,
                footer: `
                    <button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="AdminMeetings.saveMinutes()"><i class="fa-solid fa-floppy-disk mr-1.5"></i> Save Minutes</button>
                `
            });

            setTimeout(() => this.renderMinutesList(), 100);
        },

        renderMinutesList() {
            const container = document.getElementById('minutes-items-container');
            if (!container) return;
            if (this.minutesItems.length === 0) {
                container.innerHTML = '<p class="text-center text-xs text-slate-400 py-8">Zero proceedings logged. Add entries below.</p>';
                return;
            }
            container.innerHTML = this.minutesItems.map((item, i) => `
                <div class="minutes-item">
                    <div class="flex items-center gap-3 w-full">
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                            <i class="fa-solid fa-clock text-slate-400 text-xs"></i>
                            <input type="time" value="${item.time || ''}" 
                                class="w-24 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] font-mono font-bold text-center focus:outline-none focus:border-brand-purple/50" 
                                onchange="AdminMeetings.updateMinutesItem(${i}, 'time', this.value)">
                        </div>
                        <div class="flex-1 min-w-0">
                            <input type="text" value="${window.AdminPanel.esc(item.heading || '')}" 
                                placeholder="Proceedings Heading (e.g., Call to Order, President Address)..." 
                                class="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-purple/50" 
                                onchange="AdminMeetings.updateMinutesItem(${i}, 'heading', this.value)">
                        </div>
                        <button onclick="AdminMeetings.removeMinutesItem(${i})" 
                            class="w-8 h-8 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 flex items-center justify-center flex-shrink-0 transition-colors"
                            title="Delete Entry">
                            <i class="fa-solid fa-trash text-[10px]"></i>
                        </button>
                    </div>
                    <div class="w-full">
                        <textarea rows="3" 
                            placeholder="Chronology details, decisions, resolve targets..." 
                            class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 resize-y focus:outline-none focus:border-brand-purple/50" 
                            onchange="AdminMeetings.updateMinutesItem(${i}, 'details', this.value)">${window.AdminPanel.esc(item.details || '')}</textarea>
                    </div>
                </div>
            `).join('');
        },

        addMinutesItem() { this.minutesItems.push({ time: '', heading: '', details: '' }); this.renderMinutesList(); },
        updateMinutesItem(i, f, v) { if (this.minutesItems[i]) this.minutesItems[i][f] = v; },
        removeMinutesItem(i) { this.minutesItems.splice(i, 1); this.renderMinutesList(); },

        safeFileName(str) {
            return String(str || 'Meeting').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        },

        // Generates an official PDF through the edge function and returns it as a mail attachment object
        async fetchDocFile(type, meetingId, filename) {
            try {
                const anonKey = resolveAnonKey();
                const sessionToken =
                    window.AuthManager?.session?.access_token ||
                    (await window.DB_ADMIN?.auth?.getSession?.())?.data?.session?.access_token ||
                    anonKey;
                const response = await fetch(EDGE_PDF_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': `Bearer ${sessionToken}` },
                    body: JSON.stringify({ type, meetingId })
                });
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const blob = await response.blob();
                if (!blob || blob.size === 0) throw new Error('empty document');
                return { name: filename, mime: 'application/pdf', base64: await blobToBase64(blob) };
            } catch (e) {
                console.warn(`Could not attach ${filename}:`, e);
                window.AppToast?.warning(`Could not generate ${filename}; the email will go without it.`);
                return null;
            }
        },

        // ==========================================
        // EMAIL MINUTES (minutes PDF + attendance PDF + photos)
        // ==========================================
        async sendMinutesEmail(meetingId, silent) {
            try {
                const { data: meeting } = await window.DB_ADMIN.from('meetings').select('*').eq('id', meetingId).single();
                if (!meeting) { window.AppToast?.error('Meeting not found.'); return; }

                const items = (meeting.minutes_items || []).filter(i => (i.heading || '').trim() || (i.details || '').trim());
                if (items.length === 0) { window.AppToast?.warning('Log the minutes first, then email them.'); return; }

                if (!silent && !window.confirm(`Email the minutes of "${meeting.meeting_name}" to members?\n\nIncluded: Minutes PDF, Attendance sheet PDF (if recorded) and meeting photos (if any).`)) return;

                window.AppToast?.info('Preparing minutes email...');

                const recipientType = meeting.meeting_type === 'board_meeting' ? 'board' : 'all_members';
                let recipients = [];
                try {
                    if (window.getEmailRecipients) {
                        recipients = await window.getEmailRecipients(recipientType);
                    } else {
                        let query = window.DB_ADMIN.from('users').select('email').eq('is_active', true).neq('role', 'super_admin').not('email', 'is', null);
                        if (recipientType === 'board') query = query.eq('is_board_member', true);
                        const { data } = await query;
                        recipients = (data || []).map(u => u.email).filter(e => e && e.includes('@'));
                    }
                } catch (e) { console.warn('Recipient fetch failed:', e); }
                if (recipients.length === 0) { window.AppToast?.warning('No recipients found.'); return; }

                const base = this.safeFileName(meeting.meeting_name);
                const files = [];
                const minutesFile = await this.fetchDocFile('meeting_minutes', meetingId, `Minutes_${base}.pdf`);
                if (minutesFile) files.push(minutesFile);

                const { count: attCount } = await window.DB_ADMIN.from('meeting_attendance').select('id', { count: 'exact', head: true }).eq('meeting_id', meetingId);
                if ((attCount || 0) > 0) {
                    const attFile = await this.fetchDocFile('meeting_attendance', meetingId, `Attendance_${base}.pdf`);
                    if (attFile) files.push(attFile);
                }

                const photos = (Array.isArray(meeting.meeting_photos) ? meeting.meeting_photos : [])
                    .map(p => (typeof p === 'string' ? { url: p } : { url: p?.url || p?.photo_url, caption: p?.caption || '' }))
                    .filter(p => /^https?:\/\//i.test(p.url || ''));

                const sender = window.AuthManager.currentUser;
                const subject = `Minutes: ${meeting.meeting_name}`;

                const { data: logEntry } = await window.DB_ADMIN.from('email_log').insert({
                    email_type: 'meeting_minutes',
                    subject: `[Rotaract Unity] ${subject}`,
                    html_body: `Minutes of ${meeting.meeting_name} (${files.length} document(s), ${photos.length} photo(s))`,
                    sender_id: sender.id,
                    sender_name: sender.full_name || sender.name,
                    sender_role: sender.role,
                    recipient_emails: recipients,
                    recipient_count: recipients.length,
                    status: 'sending'
                }).select().single();

                try {
                    const result = await postToScript({
                        type: 'meeting_minutes',
                        recipients,
                        meeting: {
                            meeting_name: meeting.meeting_name,
                            date: meeting.date,
                            venue: meeting.venue,
                            duration_minutes: meeting.duration_minutes,
                            minutes_prepared_by: meeting.minutes_prepared_by,
                            minutes_items: items
                        },
                        photos,
                        files,
                        sender: { role: sender.role, name: sender.full_name || sender.name, email: sender.email }
                    });
                    if (logEntry) await window.DB_ADMIN.from('email_log').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', logEntry.id);
                    window.AppToast?.success(`✅ Minutes emailed to ${result.recipients_count || recipients.length} recipients.`);
                } catch (sendErr) {
                    if (logEntry) await window.DB_ADMIN.from('email_log').update({ status: 'failed', error_message: sendErr.message }).eq('id', logEntry.id);
                    throw sendErr;
                }

                await window.AdminPanel.logActivity('EMAIL_BROADCAST', 'meeting', meetingId, { type: 'minutes', recipients: recipients.length, documents: files.length, photos: photos.length });
            } catch (e) {
                console.error('Minutes email failed:', e);
                window.AppToast?.error('Failed to email minutes: ' + e.message);
            }
        },

        async saveMinutes() {
            try {
                const startT = document.getElementById('minutes-actual-start')?.value || null;
                const endT = document.getElementById('minutes-actual-end')?.value || null;
                const mins = t => { const [h, m] = (t || '').split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null; };
                const dur = startT && endT && mins(endT) >= mins(startT) ? mins(endT) - mins(startT) : null;
                const approved = !!document.getElementById('minutes-approved')?.checked;
                const { data: prev } = await window.DB_ADMIN.from('meetings').select('minutes_approved').eq('id', this.currentMeetingId).single();
                const payload = {
                    minutes_items: this.minutesItems.filter(i => (i.heading || '').trim() || (i.details || '').trim()),
                    meeting_photos: this.meetingPhotos,
                    actual_start_time: startT,
                    actual_end_time: endT,
                    duration_minutes: dur,
                    minutes_approved: approved,
                    status: 'completed'
                };
                if (approved && !prev?.minutes_approved) {
                    const uid = window.AuthManager?.currentUser?.id;
                    payload.minutes_approved_by = /^[0-9a-f-]{36}$/i.test(uid || '') ? uid : null;
                    payload.minutes_approved_at = new Date().toISOString();
                } else if (!approved) {
                    payload.minutes_approved_by = null;
                    payload.minutes_approved_at = null;
                }
                const { error: minutesErr } = await window.DB_ADMIN.from('meetings').update(payload).eq('id', this.currentMeetingId);
                if (minutesErr) throw new Error(minutesErr.message);
                window.AppToast?.success('Minutes committed successfully.');
                const mailMeetingId = this.currentMeetingId;
                window.AdminPanel.closeModal();
                await this.loadMeetingsData();
                if (approved && !prev?.minutes_approved && payload.minutes_items.length > 0 &&
                    window.confirm('Minutes approved. Email the minutes PDF (with attendance sheet and photos) to members now?')) {
                    await this.sendMinutesEmail(mailMeetingId, true);
                }
            } catch (e) {
                window.AppToast?.error('Save failed: ' + e.message);
            }
        },

        // ==========================================
        // 6. ATTENDANCE EDITOR (MULTI-PORTFOLIO)
        // ==========================================
        async openAttendanceEditor(meetingId) {
            this.currentMeetingId = meetingId;
            const { data: meeting } = await window.DB_ADMIN.from('meetings').select('*').eq('id', meetingId).single();
            if (!meeting) return;
            const { data: existing } = await window.DB_ADMIN.from('meeting_attendance').select('*').eq('meeting_id', meetingId).order('created_at');
            this.attendanceEntries = existing || [];

            window.AdminPanel.createModal({
                title: 'Attendance Ledger — ' + meeting.meeting_name,
                size: 'wide',
                icon: 'signature',
                body: `
                    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h4 class="text-sm font-bold">Ledger Records (${this.attendanceEntries.length})</h4>
                        <div class="flex items-center gap-2">
                            <button onclick="AdminMeetings.sendAttendanceForm('${meetingId}')" class="btn-primary btn-xs" style="background:linear-gradient(135deg,#06b6d4,#0891b2);">
                                <i class="fa-solid fa-paper-plane mr-1"></i> Email Attendance Form
                            </button>
                            <button onclick="AdminMeetings.bulkAddFromMembers('${meetingId}')" class="btn-secondary btn-xs">
                                <i class="fa-solid fa-users mr-1"></i> Sync Active Directory
                            </button>
                        </div>
                    </div>
                    <div id="attendance-list-container" class="space-y-2 mb-5" style="max-height:500px;overflow-y:auto;"></div>
                    <button type="button" onclick="AdminMeetings.addAttendanceEntry()" class="w-full py-3 border-2 border-dashed border-slate-200/80 dark:border-white/[0.08] rounded-xl text-xs font-bold text-slate-500 hover:border-green-500 hover:text-green-500 hover:bg-green-500/5 transition-all">
                        <i class="fa-solid fa-user-plus mr-1.5"></i> Insert Registry Entry
                    </button>
                `,
                footer: `
                    <button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="AdminMeetings.saveAttendance()"><i class="fa-solid fa-floppy-disk mr-1.5"></i> Commit Ledger</button>
                `
            });
            setTimeout(() => this.renderAttendanceList(), 100);
        },

        renderAttendanceList() {
            const container = document.getElementById('attendance-list-container');
            if (!container) return;
            if (this.attendanceEntries.length === 0) {
                container.innerHTML = '<p class="text-center text-xs text-slate-400 py-8">Ledger empty. Click "Email Attendance Form" to collect from members.</p>';
                return;
            }
            container.innerHTML = this.attendanceEntries.map((entry, i) => {
                const portfolios = (entry.designation || '').split(',').map(p => p.trim()).filter(Boolean);
                const portfolioChips = portfolios.map(p => `<span class="portfolio-chip">${window.AdminPanel.esc(p)}</span>`).join('');

                return `
                    <div class="attendance-row">
                        <div class="text-center text-[11px] font-mono font-bold text-slate-400">${i + 1}</div>
                        <div>
                            <input type="text" value="${window.AdminPanel.esc(entry.member_name || '')}" placeholder="Member Name" class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] mb-1" onchange="AdminMeetings.updateAttendanceField(${i}, 'member_name', this.value)">
                            <input type="text" value="${window.AdminPanel.esc(entry.ri_id || '')}" placeholder="RI Member ID" class="w-full px-3 py-1.5 text-[10px] rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] font-mono" onchange="AdminMeetings.updateAttendanceField(${i}, 'ri_id', this.value)">
                        </div>
                        <div>
                            <div class="min-h-[32px] max-h-[60px] overflow-y-auto p-2 rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] mb-1">
                                ${portfolioChips || '<span class="text-[10px] text-slate-400">No portfolios assigned</span>'}
                            </div>
                            <input type="text" value="${window.AdminPanel.esc(entry.designation || '')}" placeholder="Portfolios (comma-separated)" class="w-full px-3 py-1.5 text-[10px] rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03]" onchange="AdminMeetings.updateAttendanceField(${i}, 'designation', this.value); AdminMeetings.renderAttendanceList();">
                        </div>
                        <input type="time" value="${entry.in_time || ''}" class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] font-mono" onchange="AdminMeetings.updateAttendanceField(${i}, 'in_time', this.value)">
                        <div class="relative">
                            ${entry.signature_url ? `<img src="${entry.signature_url}" class="signature-preview">` : `<label class="w-full h-[60px] rounded-lg border border-dashed border-slate-300 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.03] flex items-center justify-center cursor-pointer hover:border-green-500"><div class="text-center"><i class="fa-solid fa-signature text-sm text-slate-400"></i><p class="text-[9px] text-slate-400 font-bold">Upload</p></div><input type="file" accept="image/*" class="hidden" onchange="AdminMeetings.uploadSignature(${i}, this.files[0])"></label>`}
                        </div>
                        <button onclick="AdminMeetings.removeAttendanceEntry(${i})" class="w-7 h-7 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 mx-auto"><i class="fa-solid fa-trash text-[10px]"></i></button>
                    </div>
                `;
            }).join('');
        },

        addAttendanceEntry() {
            this.attendanceEntries.push({ id: null, member_name: '', designation: '', ri_id: '', in_time: new Date().toTimeString().substring(0, 5), signature_url: '', signature_provider: '', signature_public_id: '' });
            this.renderAttendanceList();
        },

        updateAttendanceField(i, f, v) { if (this.attendanceEntries[i]) this.attendanceEntries[i][f] = v; },
        removeAttendanceEntry(i) { this.attendanceEntries.splice(i, 1); this.renderAttendanceList(); },

        async uploadSignature(i, file) {
            if (!file) return;
            try {
                const result = await window.Uploader.upload(file, { type: 'signature', folder: 'signatures' });
                this.attendanceEntries[i].signature_url = result.url;
                this.attendanceEntries[i].signature_provider = result.provider;
                this.attendanceEntries[i].signature_public_id = result.publicId || '';
                window.AppToast?.success('Signature registered.');
                this.renderAttendanceList();
            } catch (err) { window.AppToast?.error('Upload failure: ' + err.message); }
        },

        async bulkAddFromMembers() {
            try {
                const { data: users } = await window.DB_ADMIN.from('users').select('*').eq('is_active', true).neq('role', 'super_admin');
                (users || []).forEach(u => {
                    if (!this.attendanceEntries.find(e => e.ri_id === u.ri_id && u.ri_id)) {
                        this.attendanceEntries.push({
                            id: null, member_name: u.full_name,
                            designation: u.portfolio || (u.role || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            ri_id: u.ri_id || '', in_time: '',
                            signature_url: '', signature_provider: '', signature_public_id: ''
                        });
                    }
                });
                this.renderAttendanceList();
                window.AppToast?.success(`Synchronized ${users?.length || 0} active directory entries.`);
            } catch (e) { window.AppToast?.error('Synchronization failed.'); }
        },

        async saveAttendance() {
            try {
                const valid = this.attendanceEntries.filter(e => (e.member_name || '').trim());
                const { data: old } = await window.DB_ADMIN.from('meeting_attendance').select('id').eq('meeting_id', this.currentMeetingId);
                if (valid.length > 0) {
                    await window.DB_ADMIN.from('meeting_attendance').insert(valid.map(e => ({
                        meeting_id: this.currentMeetingId,
                        member_name: e.member_name.trim(),
                        designation: e.designation || null,
                        ri_id: e.ri_id || null,
                        in_time: e.in_time || null,
                        signature_url: e.signature_url || null,
                        signature_public_id: e.signature_public_id || null,
                        signature_provider: e.signature_provider || 'supabase'
                    })));
                }
                const oldIds = (old || []).map(r => r.id);
                if (oldIds.length) await window.DB_ADMIN.from('meeting_attendance').delete().in('id', oldIds);
                window.AppToast?.success(`Ledger compiled with ${valid.length} entries.`);
                window.AdminPanel.closeModal();
                await this.loadMeetingsData();
            } catch (e) { window.AppToast?.error('Save failed: ' + e.message); }
        },

        async renderAttendanceRecords() {
            const wrapper = document.getElementById('meetings-table-wrapper');
            if (!wrapper) return;
            try {
                const { data: meetings } = await window.DB_ADMIN.from('meetings').select('*, meeting_attendance(count)').order('date', { ascending: false }).limit(50);
                if (!meetings || meetings.length === 0) {
                    wrapper.innerHTML = '<div class="empty-state py-16"><i class="fa-solid fa-signature empty-state-icon"></i><p class="empty-state-desc">No attendance records found.</p></div>';
                    return;
                }
                wrapper.innerHTML = `
                    <div class="overflow-x-auto">
                        <table class="admin-data-table">
                            <thead><tr><th>Meeting Name</th><th>Date</th><th>Type</th><th class="text-center">Attendees</th><th>Operations</th></tr></thead>
                            <tbody>${meetings.map(m => `
                                <tr>
                                    <td class="text-xs font-bold">${window.AdminPanel.esc(m.meeting_name)}</td>
                                    <td class="text-xs">${window.AdminPanel.fmtDate(m.date)}</td>
                                    <td><span class="badge ${m.meeting_type === 'board_meeting' ? 'badge-purple' : 'badge-blue'}">${m.meeting_type === 'board_meeting' ? 'Board' : 'General'}</span></td>
                                    <td class="text-center font-black text-brand-blue">${m.meeting_attendance?.[0]?.count || 0}</td>
                                    <td>
                                        <div class="flex items-center gap-1.5">
                                            <button onclick="AdminMeetings.openAttendanceEditor('${m.id}')" class="btn-secondary btn-xs"><i class="fa-solid fa-pen"></i></button>
                                            <button onclick="AdminMeetings.sendAttendanceForm('${m.id}')" class="btn-secondary btn-xs text-cyan-500" title="Email Attendance Form"><i class="fa-solid fa-paper-plane"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}</tbody>
                        </table>
                    </div>`;
            } catch (e) { wrapper.innerHTML = `<div class="p-8 text-center text-xs text-red-500">${e.message}</div>`; }
        },

        // ==========================================
        // 7. AUTHENTICATED DOCUMENT GENERATION SYSTEM
        // ==========================================
        showDownloadMenu(meetingId) {
            window.AdminPanel.createModal({
                title: 'Download Official Documentation',
                size: 'wide',
                icon: 'download',
                body: `
                    <p class="text-xs text-slate-500 mb-4">Export high-fidelity branding, layouts, and signatures as official records.</p>
                    <div class="space-y-4">
                        <!-- Agenda -->
                        <div class="p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08] flex items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600"><i class="fa-solid fa-list-check"></i></div>
                                <div><p class="text-sm font-bold">Meeting Agenda</p><p class="text-[11px] text-slate-500">Official numbered agenda indexes</p></div>
                            </div>
                            <div class="flex gap-2">
                                <button class="btn-secondary btn-xs py-1.5 px-3" onclick="AdminMeetings.downloadDoc('meeting_agenda', '${meetingId}', 'docx');"><i class="fa-solid fa-file-word mr-1 text-blue-600"></i> DOCX</button>
                                <button class="btn-secondary btn-xs py-1.5 px-3" onclick="AdminMeetings.downloadDoc('meeting_agenda', '${meetingId}', 'pdf');"><i class="fa-solid fa-file-pdf mr-1 text-red-500"></i> PDF</button>
                            </div>
                        </div>

                        <!-- Minutes -->
                        <div class="p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08] flex items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600"><i class="fa-solid fa-file-pen"></i></div>
                                <div><p class="text-sm font-bold">Proceedings Minutes</p><p class="text-[11px] text-slate-500">Timestamped discussions, resolutions, and notes</p></div>
                            </div>
                            <div class="flex gap-2">
                                <button class="btn-secondary btn-xs py-1.5 px-3" onclick="AdminMeetings.downloadDoc('meeting_minutes', '${meetingId}', 'docx');"><i class="fa-solid fa-file-word mr-1 text-blue-600"></i> DOCX</button>
                                <button class="btn-secondary btn-xs py-1.5 px-3" onclick="AdminMeetings.downloadDoc('meeting_minutes', '${meetingId}', 'pdf');"><i class="fa-solid fa-file-pdf mr-1 text-red-500"></i> PDF</button>
                            </div>
                        </div>

                        <!-- Attendance -->
                        <div class="p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08] flex items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600"><i class="fa-solid fa-signature"></i></div>
                                <div><p class="text-sm font-bold">Attendance Sheet</p><p class="text-[11px] text-slate-500">Ledger with member portfolios and signatures</p></div>
                            </div>
                            <div class="flex gap-2">
                                <button class="btn-secondary btn-xs py-1.5 px-3" onclick="AdminMeetings.downloadDoc('meeting_attendance', '${meetingId}', 'docx');"><i class="fa-solid fa-file-word mr-1 text-blue-600"></i> DOCX</button>
                                <button class="btn-secondary btn-xs py-1.5 px-3" onclick="AdminMeetings.downloadDoc('meeting_attendance', '${meetingId}', 'pdf');"><i class="fa-solid fa-file-pdf mr-1 text-red-500"></i> PDF</button>
                            </div>
                        </div>

                        <!-- Combined -->
                        <div class="p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08] bg-cyan-500/[0.02] flex items-center justify-between gap-4" style="border-left: 4px solid #06b6d4 !important;">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600"><i class="fa-solid fa-file-zipper"></i></div>
                                <div><p class="text-sm font-bold text-cyan-900 dark:text-cyan-400">Complete Assembly Package</p><p class="text-[11px] text-slate-500">Agenda + Attendance Ledger + Minutes with proper page breaks</p></div>
                            </div>
                            <div class="flex gap-2">
                                <button class="btn-secondary btn-xs py-1.5 px-3" onclick="AdminMeetings.downloadDoc('meeting_combined', '${meetingId}', 'docx');"><i class="fa-solid fa-file-word mr-1 text-blue-600"></i> DOCX</button>
                                <button class="btn-secondary btn-xs py-1.5 px-3" onclick="AdminMeetings.downloadDoc('meeting_combined', '${meetingId}', 'pdf');"><i class="fa-solid fa-file-pdf mr-1 text-red-500"></i> PDF</button>
                            </div>
                        </div>
                    </div>
                `
            });
        },

        async downloadDoc(type, meetingId, format) {
            const endpoint = format === 'pdf' ? EDGE_PDF_URL : EDGE_DOCX_URL;
            window.AppToast?.info(`Generating official ${format.toUpperCase()} record...`);
            try {
                // Resolve authentication parameters
                const anonKey = resolveAnonKey();
                const sessionToken =
                    window.AuthManager?.session?.access_token ||
                    (await window.DB_ADMIN?.auth?.getSession?.())?.data?.session?.access_token ||
                    anonKey;

                const headers = {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${sessionToken}`
                };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        type: type,
                        meetingId: meetingId
                    })
                });

                if (!response.ok) {
                    let errorMsg = `Server responded with status ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.error || errorData.message || errorMsg;
                    } catch (_) {}
                    throw new Error(errorMsg);
                }

                const blob = await response.blob();
                if (!blob || blob.size === 0) {
                    throw new Error('Received empty document from server.');
                }

                // Resolve filename from Content-Disposition header
                let filename = `${type}_${meetingId}.${format}`;
                const disposition = response.headers.get('Content-Disposition');
                if (disposition && disposition.includes('filename=')) {
                    const match = disposition.match(/filename="?([^";]+)"?/);
                    if (match && match[1]) filename = match[1];
                }

                // Trigger browser download
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 300);

                window.AppToast?.success(`✅ ${format.toUpperCase()} downloaded successfully.`);
            } catch (err) {
                console.error(`Edge ${format.toUpperCase()} Generation Error:`, err);
                window.AppToast?.error(`Export failed: ` + err.message);
            }
        },

        // ==========================================
        // 8. VIEW MEETING DETAILS MODAL
        // ==========================================
        async viewMeeting(id) {
            const { data: m } = await window.DB_ADMIN.from('meetings').select('*').eq('id', id).single();
            if (!m) return;
            const { data: attendance } = await window.DB_ADMIN.from('meeting_attendance').select('*').eq('meeting_id', id);

            const agenda = m.agenda_items || [];
            const agendaHTML = agenda.length > 0
                ? `<div class="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
                    <p class="text-xs font-bold text-brand-blue mb-2"><i class="fa-solid fa-list-check mr-1.5"></i> Meeting Agenda</p>
                    <ol class="space-y-1.5 pl-1">
                        ${agenda.map((item, i) => {
                            const text = typeof item === 'string' ? item : (item.point || '');
                            return `<li class="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                <span class="font-bold text-brand-blue">${i + 1}.</span> <span>${window.AdminPanel.esc(text)}</span>
                            </li>`;
                        }).join('')}
                    </ol>
                   </div>`
                : '<p class="text-xs text-slate-400 italic mt-3">No agenda points drafted for this session.</p>';

            window.AdminPanel.createModal({
                title: m.meeting_name,
                size: 'wide',
                body: `
                    ${m.poster_url ? `<img src="${m.poster_url}" class="w-full rounded-2xl mb-5 border border-slate-200 dark:border-white/[0.08]" alt="">` : ''}
                    <div class="grid grid-cols-2 gap-4 mb-5 text-slate-800 dark:text-slate-100">
                        <div><p class="text-[10px] text-slate-400 uppercase font-bold">Classification</p><p class="text-sm font-bold">${m.meeting_type === 'board_meeting' ? 'Board of Directors' : 'General Body Assembly'}</p></div>
                        <div><p class="text-[10px] text-slate-400 uppercase font-bold">Schedule Date</p><p class="text-sm font-bold">${window.AdminPanel.fmtDate(m.date)}</p></div>
                        <div><p class="text-[10px] text-slate-400 uppercase font-bold">Start & End Time</p><p class="text-sm font-bold">${window.AdminPanel.fmtTime(m.start_time)}${m.end_time ? ' - ' + window.AdminPanel.fmtTime(m.end_time) : ''}</p></div>
                        <div><p class="text-[10px] text-slate-400 uppercase font-bold">Current Status</p><p class="text-sm font-bold capitalize">${(m.status || '').replace('_', ' ')}</p></div>
                        <div class="col-span-2"><p class="text-[10px] text-slate-400 uppercase font-bold">Physical Location / Link</p><p class="text-sm font-bold">${window.AdminPanel.esc(m.venue)}</p></div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <div class="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-center"><p class="text-[9px] text-blue-500 font-bold uppercase">Agenda Point Index</p><p class="text-lg font-black text-blue-600">${agenda.length}</p></div>
                        <div class="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15 text-center"><p class="text-[9px] text-purple-500 font-bold uppercase">Chronicle Entries</p><p class="text-lg font-black text-purple-600">${(m.minutes_items||[]).length}</p></div>
                        <div class="p-3 rounded-xl bg-green-500/5 border border-green-500/15 text-center"><p class="text-[9px] text-green-500 font-bold uppercase">Attendees Present</p><p class="text-lg font-black text-green-600">${(attendance||[]).length}</p></div>
                    </div>

                    ${agendaHTML}
                `,
                footer: `
                    <button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Close</button>
                    <button class="btn-primary" onclick="window.AdminPanel.closeModal();AdminMeetings.showDownloadMenu('${id}');"><i class="fa-solid fa-download"></i> All Documents</button>
                `
            });
        },

        async deleteMeeting(id) {
            if (!confirm('Permanently delete this meeting session and all associated attendance records?')) return;
            try {
                await window.DB_ADMIN.from('meeting_attendance').delete().eq('meeting_id', id);
                await window.DB_ADMIN.from('meetings').delete().eq('id', id);
                window.AppToast?.success('Meeting session deleted.');
                await this.loadMeetingsData();
            } catch (e) { window.AppToast?.error('Delete failed: ' + e.message); }
        },

        onSearchChange(v) { this.searchQuery = v; this.currentPage = 1; clearTimeout(this._st); this._st = setTimeout(() => this.loadMeetingsData(), 400); },
        onTypeFilter(v) { this.typeFilter = v; this.currentPage = 1; this.loadMeetingsData(); },
        onStatusFilter(v) { this.statusFilter = v; this.currentPage = 1; this.loadMeetingsData(); },
        goToPage(p) { if (p < 1) return; this.currentPage = p; this.loadMeetingsData(); },

        renderUnauthorized() {
            return `<div class="p-6"><div class="admin-panel"><div class="admin-panel-body"><div class="empty-state py-20"><i class="fa-solid fa-lock empty-state-icon text-red-500"></i><h4 class="empty-state-title">Access Restricted</h4><p class="empty-state-desc">You do not have permission to view meetings.</p></div></div></div></div>`;
        }
    };

    window.AdminMeetings = AdminMeetings;
})();
