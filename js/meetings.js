/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Meetings Management - js/meetings.js
   ============================================================ */

(function () {
    'use strict';

    const db = window.UnityAdminDB || window.UnityDB;
    const auth = window.UnityAuth;
    const cfg = window.UnityConfig;

    function esc(t) { return auth.escHtml(t); }
    function fDate(d) { return auth.formatDate(d); }
    function fTime(t) { return auth.formatTime(t); }
    function toast(m, t) { auth.showAdminToast(m, t); }

    function buildTableLoading(cols) {
        return `<tr><td colspan="${cols}" class="table-loading">
            <div class="line-placeholder"></div>
            <div class="line-placeholder w-3-4"></div>
        </td></tr>`;
    }

    function buildEmptyRow(cols, msg = 'No records found') {
        return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--a-text3);">
            <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;color:var(--a-border);"></i>${msg}
        </td></tr>`;
    }

    function statusBadge(status) {
        const map = {
            scheduled: ['primary', 'fa-calendar', 'Scheduled'],
            ongoing: ['warning', 'fa-play-circle', 'Ongoing'],
            completed: ['success', 'fa-check-circle', 'Completed'],
            cancelled: ['danger', 'fa-times-circle', 'Cancelled']
        };
        const [type, icon, label] = map[status] || ['gray', 'fa-circle', status];
        return `<span class="badge badge-${type}"><i class="fas ${icon}"></i>${label}</span>`;
    }

    // Agenda items store
    let currentAgenda = [];
    // Minutes rows store
    let currentMinutes = [];
    // Photos store for meeting
    let meetingPhotoFiles = [];

    // ============================================================
    // ADMIN MEETINGS MODULE
    // ============================================================
    window.AdminMeetings = {
        data: [],

        async load() {
            if (!auth.hasPermission('canViewMeetings') && !auth.isHighLevel()) {
                document.getElementById('meetings-table-body').innerHTML =
                    buildEmptyRow(8, 'You do not have access to meetings');
                return;
            }
            this.bindFilters();
            await this.fetchAndRender();
        },

        bindFilters() {
            ['meeting-filter-type', 'meeting-filter-month', 'meeting-filter-status'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => this.fetchAndRender());
            });
        },

        async fetchAndRender() {
            const tbody = document.getElementById('meetings-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(8);

            const type = document.getElementById('meeting-filter-type')?.value;
            const month = document.getElementById('meeting-filter-month')?.value;
            const status = document.getElementById('meeting-filter-status')?.value;

            try {
                let query = db.from('meetings')
                    .select('*, meeting_attendance(count)')
                    .order('meeting_date', { ascending: false });

                if (type) query = query.eq('meeting_type', type);
                if (status) query = query.eq('status', status);
                if (month) {
                    const [yr, mo] = month.split('-');
                    const from = `${yr}-${mo}-01`;
                    const to = new Date(yr, parseInt(mo), 0).toISOString().split('T')[0];
                    query = query.gte('meeting_date', from).lte('meeting_date', to);
                }

                const { data, error } = await query;
                if (error) throw error;
                this.data = data || [];
                this.render();
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(8, 'Could not load meetings');
                toast('Failed to load meetings', 'error');
            }
        },

        render() {
            const tbody = document.getElementById('meetings-table-body');
            if (!tbody) return;

            if (!this.data.length) {
                tbody.innerHTML = buildEmptyRow(8, 'No meetings found');
                return;
            }

            const user = auth.getCurrentUser();
            const canManage = auth.hasPermission('canManageMeetings');
            const canApprove = auth.isHighLevel() || auth.isSecretary() || auth.isPresident();

            tbody.innerHTML = this.data.map(m => {
                const now = new Date();
                const meetingDate = new Date(m.meeting_date + 'T' + m.start_time);
                const meetingEnd = m.end_time ? new Date(m.meeting_date + 'T' + m.end_time) : null;
                const isPast = meetingEnd ? now > meetingEnd : now > meetingDate;
                const canAddMinutes = isPast && m.status !== 'cancelled';

                return `
                <tr>
                    <td>
                        <div class="cell-name">${esc(m.title)}</div>
                        ${m.venue ? `<div class="cell-sub"><i class="fas fa-map-marker-alt" style="font-size:0.65rem;"></i> ${esc(m.venue)}</div>` : ''}
                    </td>
                    <td>
                        <span class="badge badge-${m.meeting_type === 'board' ? 'primary' : 'info'}">
                            ${m.meeting_type === 'board' ? 'Board Meeting' : 'General Body Meeting'}
                        </span>
                    </td>
                    <td>
                        <div style="font-size:0.82rem;font-weight:600;">${fDate(m.meeting_date)}</div>
                    </td>
                    <td>
                        <div style="font-size:0.82rem;">${fTime(m.start_time)}</div>
                        ${m.end_time ? `<div class="cell-sub">End: ${fTime(m.end_time)}</div>` : ''}
                    </td>
                    <td><small>${esc(m.venue || '—')}</small></td>
                    <td>${statusBadge(m.status)}</td>
                    <td>
                        ${m.minutes_content ? `
                            <span class="badge badge-${m.minutes_approved ? 'success' : 'warning'}">
                                <i class="fas fa-${m.minutes_approved ? 'check' : 'clock'}"></i>
                                ${m.minutes_approved ? 'Approved' : 'Submitted'}
                            </span>
                        ` : '<span class="badge badge-gray">Pending</span>'}
                    </td>
                    <td>
                        <div class="cell-actions">
                            <button class="action-btn view" title="View Details" onclick="AdminMeetings.viewDetails('${m.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${canManage ? `
                            <button class="action-btn edit" title="Edit" onclick="AdminMeetings.openEdit('${m.id}')">
                                <i class="fas fa-edit"></i>
                            </button>` : ''}
                            <button class="action-btn download" title="Download Agenda" onclick="AdminMeetings.downloadAgenda('${m.id}')">
                                <i class="fas fa-file-alt"></i>
                            </button>
                            ${canAddMinutes ? `
                            <button class="action-btn" title="${m.minutes_content ? 'Edit Minutes' : 'Add Minutes'}" style="color:var(--a-info);" onclick="AdminMeetings.openMinutesForm('${m.id}')">
                                <i class="fas fa-clipboard-list"></i>
                            </button>` : ''}
                            ${m.minutes_content && !m.minutes_approved && canApprove ? `
                            <button class="action-btn approve" title="Approve Minutes" onclick="AdminMeetings.approveMinutes('${m.id}')">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                            ${m.minutes_content ? `
                            <button class="action-btn download" title="Download Minutes" onclick="AdminMeetings.downloadMinutes('${m.id}')">
                                <i class="fas fa-file-download"></i>
                            </button>
                            <button class="action-btn" title="Download Attendance" style="color:var(--a-warning);" onclick="AdminMeetings.downloadAttendance('${m.id}')">
                                <i class="fas fa-users"></i>
                            </button>` : ''}
                            <button class="action-btn" title="Send Invite" style="color:var(--a-success);" onclick="AdminMeetings.sendInvite('${m.id}')">
                                <i class="fas fa-envelope"></i>
                            </button>
                            ${canManage ? `
                            <button class="action-btn delete" title="Delete" onclick="AdminMeetings.confirmDelete('${m.id}', '${esc(m.title)}')">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>`;
            }).join('');
        },

        // ============================================================
        // ADD MEETING FORM
        // ============================================================
        openAdd() {
            currentAgenda = [];
            meetingPhotoFiles = [];

            const groups = [1, 2, 3, 4, 5, 6].map(g =>
                `<option value="${g}">${g}</option>`
            ).join('');

            auth.openModal(
                '<i class="fas fa-plus"></i> Schedule Meeting',
                this.buildMeetingForm(null),
                async (close) => {
                    await this.saveMeeting(null, close);
                },
                { wide: true, saveLabel: '<i class="fas fa-calendar-plus"></i> Schedule Meeting' }
            );

            setTimeout(() => this.initMeetingFormListeners(), 200);
        },

        async openEdit(meetingId) {
            const m = this.data.find(x => x.id === meetingId);
            if (!m) return;
            currentAgenda = m.agenda || [];
            meetingPhotoFiles = [];

            auth.openModal(
                `<i class="fas fa-edit"></i> Edit Meeting - ${esc(m.title)}`,
                this.buildMeetingForm(m),
                async (close) => {
                    await this.saveMeeting(meetingId, close);
                },
                { wide: true, saveLabel: '<i class="fas fa-save"></i> Update Meeting' }
            );

            setTimeout(() => this.initMeetingFormListeners(m), 200);
        },

        buildMeetingForm(m) {
            const groups = [1, 2, 3, 4, 5, 6].map(g =>
                `<option value="${g}" ${m?.group_number == g ? 'selected' : ''}>${g}</option>`
            ).join('');

            const agendaHtml = currentAgenda.map((item, i) => `
                <div class="agenda-item" data-index="${i}">
                    <i class="fas fa-grip-vertical" style="color:var(--a-text3);cursor:grab;"></i>
                    <span>${esc(item)}</span>
                    <button class="agenda-remove" onclick="AdminMeetings.removeAgendaItem(${i})" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');

            return `
            <div class="modal-form-grid">
                <div class="form-group full-width">
                    <label><i class="fas fa-heading"></i> Meeting Title <span class="req">*</span></label>
                    <input type="text" id="mt-title" value="${esc(m?.title || '')}" placeholder="e.g. General Body Meeting - July 2026" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-users-cog"></i> Meeting Type <span class="req">*</span></label>
                    <select id="mt-type">
                        <option value="general_body" ${m?.meeting_type === 'general_body' ? 'selected' : ''}>General Body Meeting</option>
                        <option value="board" ${m?.meeting_type === 'board' ? 'selected' : ''}>Board Members Meeting</option>
                        <option value="special" ${m?.meeting_type === 'special' ? 'selected' : ''}>Special Meeting</option>
                    </select>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-layer-group"></i> Group Number</label>
                    <select id="mt-group">
                        <option value="">Select Group</option>
                        ${groups}
                    </select>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-calendar"></i> Meeting Date <span class="req">*</span></label>
                    <input type="date" id="mt-date" value="${m?.meeting_date || ''}" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-clock"></i> Start Time <span class="req">*</span></label>
                    <input type="time" id="mt-start-time" value="${m?.start_time || ''}" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-clock"></i> End Time</label>
                    <input type="time" id="mt-end-time" value="${m?.end_time || ''}">
                </div>
                <div class="form-group full-width">
                    <label><i class="fas fa-map-marker-alt"></i> Venue <span class="req">*</span></label>
                    <input type="text" id="mt-venue" value="${esc(m?.venue || '')}" placeholder="Meeting venue" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-user-shield"></i> Minutes Prepared By</label>
                    <input type="text" id="mt-minutes-by" value="${esc(m?.minutes_prepared_by || '')}" placeholder="Name of person preparing minutes">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-gavel"></i> Sergeant at Arms</label>
                    <input type="text" id="mt-saa" value="${esc(m?.sergeant_at_arms || '')}" placeholder="Sergeant at Arms name">
                </div>

                <!-- Agenda Section -->
                <div class="form-group full-width">
                    <label><i class="fas fa-list-ol"></i> Meeting Agenda</label>
                    <div class="agenda-list" id="agenda-list">${agendaHtml}</div>
                    <div class="agenda-add-row">
                        <input type="text" id="agenda-input" placeholder="Add agenda item and press Enter...">
                        <button type="button" class="btn btn-primary btn-sm" onclick="AdminMeetings.addAgendaItem()">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                </div>

                <!-- Poster Upload -->
                <div class="form-group full-width">
                    <label><i class="fas fa-image"></i> Meeting Poster</label>
                    ${m?.poster_url ? `<img src="${esc(m.poster_url)}" style="height:60px;border-radius:6px;margin-bottom:8px;border:1px solid var(--a-border);" onerror="this.style.display='none';">` : ''}
                    <div class="modal-file-upload">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Upload meeting poster/invitation image</p>
                        <span>JPG, PNG (Max 5MB)</span>
                        <input type="file" id="mt-poster-file" accept="image/*">
                    </div>
                    <div id="mt-poster-preview"></div>
                </div>
            </div>`;
        },

        initMeetingFormListeners(m) {
            // Agenda enter key
            document.getElementById('agenda-input')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); this.addAgendaItem(); }
            });

            // Poster preview
            document.getElementById('mt-poster-file')?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => {
                        const preview = document.getElementById('mt-poster-preview');
                        if (preview) preview.innerHTML = `<img src="${ev.target.result}" style="max-height:80px;margin-top:10px;border-radius:8px;">`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        },

        addAgendaItem() {
            const input = document.getElementById('agenda-input');
            const text = input?.value.trim();
            if (!text) return;

            currentAgenda.push(text);
            input.value = '';
            this.renderAgendaList();
        },

        removeAgendaItem(index) {
            currentAgenda.splice(index, 1);
            this.renderAgendaList();
        },

        renderAgendaList() {
            const list = document.getElementById('agenda-list');
            if (!list) return;

            list.innerHTML = currentAgenda.map((item, i) => `
                <div class="agenda-item" data-index="${i}">
                    <i class="fas fa-circle" style="color:var(--a-primary-light);font-size:0.5rem;"></i>
                    <span>${esc(item)}</span>
                    <button class="agenda-remove" onclick="AdminMeetings.removeAgendaItem(${i})" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        },

        async saveMeeting(meetingId, close) {
            const title = document.getElementById('mt-title')?.value.trim();
            const type = document.getElementById('mt-type')?.value;
            const date = document.getElementById('mt-date')?.value;
            const startTime = document.getElementById('mt-start-time')?.value;
            const venue = document.getElementById('mt-venue')?.value.trim();

            if (!title || !type || !date || !startTime || !venue) {
                toast('Title, type, date, start time and venue are required', 'warning');
                return;
            }

            const user = auth.getCurrentUser();

            // Upload poster
            let posterUrl = null;
            if (meetingId) {
                const existing = this.data.find(m => m.id === meetingId);
                posterUrl = existing?.poster_url || null;
            }

            const posterFile = document.getElementById('mt-poster-file')?.files[0];
            if (posterFile) {
                try {
                    window.UnityStorage.checkFileSize(posterFile);
                    const compressed = await window.UnityStorage.compressImage(posterFile, 1000, 0.75);
                    const path = `meeting_poster_${Date.now()}.jpg`;
                    posterUrl = await window.UnityStorage.uploadFile('meetings', compressed, path);
                } catch (e) {
                    toast('Poster upload failed: ' + e.message, 'warning');
                }
            }

            const payload = {
                title,
                meeting_type: type,
                meeting_date: date,
                start_time: startTime,
                end_time: document.getElementById('mt-end-time')?.value || null,
                venue,
                minutes_prepared_by: document.getElementById('mt-minutes-by')?.value.trim() || null,
                sergeant_at_arms: document.getElementById('mt-saa')?.value.trim() || null,
                agenda: currentAgenda,
                group_number: document.getElementById('mt-group')?.value || null,
                poster_url: posterUrl,
                status: 'scheduled'
            };

            try {
                if (meetingId) {
                    const { error } = await db.from('meetings').update(payload).eq('id', meetingId);
                    if (error) throw error;
                    toast('Meeting updated successfully!', 'success');
                } else {
                    payload.created_by = user?.id;
                    const { error } = await db.from('meetings').insert(payload);
                    if (error) throw error;

                    // Send meeting invite
                    if (window.AdminMail) {
                        await window.AdminMail.sendMeetingInvite(payload);
                    }

                    toast('Meeting scheduled! Invites sent to members.', 'success');
                }

                close();
                await this.fetchAndRender();
            } catch (e) {
                toast(e.message || 'Failed to save meeting', 'error');
            }
        },

        // ============================================================
        // MEETING MINUTES FORM
        // ============================================================
        async openMinutesForm(meetingId) {
            const m = this.data.find(x => x.id === meetingId);
            if (!m) return;

            currentMinutes = m.minutes_content || [];
            meetingPhotoFiles = [];

            const now = new Date();
            const meetingDate = new Date(m.meeting_date + 'T' + m.start_time);

            auth.openModal(
                `<i class="fas fa-clipboard-list"></i> Meeting Minutes - ${esc(m.title)}`,
                `<div class="modal-form-grid cols-1">
                    <div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);font-size:0.82rem;">
                        <strong>Meeting:</strong> ${esc(m.title)} |
                        <strong>Date:</strong> ${fDate(m.meeting_date)} |
                        <strong>Start:</strong> ${fTime(m.start_time)}
                    </div>

                    <div>
                        <div style="font-size:0.82rem;font-weight:700;margin-bottom:8px;color:var(--a-text);">
                            <i class="fas fa-clock" style="color:var(--a-primary);"></i> Meeting Start Time
                        </div>
                        <div style="padding:12px;background:rgba(26,86,219,0.06);border-radius:var(--a-radius-sm);text-align:center;font-size:1.1rem;font-weight:700;color:var(--a-primary);">
                            ${fTime(m.start_time)}
                        </div>
                    </div>

                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <div style="font-size:0.82rem;font-weight:700;color:var(--a-text);">
                                <i class="fas fa-list" style="color:var(--a-primary);"></i> Minutes Entries
                            </div>
                            <button class="btn btn-primary btn-sm" type="button" onclick="AdminMeetings.addMinutesRow()">
                                <i class="fas fa-plus"></i> Add Entry
                            </button>
                        </div>
                        <div class="minutes-section">
                            <div class="minutes-section-header">
                                <span>Time</span>
                                <span>Heading</span>
                                <span>Details</span>
                                <span>Actions</span>
                            </div>
                            <div class="minutes-rows" id="minutes-rows">
                                ${this.buildMinutesRows()}
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label><i class="fas fa-clock"></i> Actual End Time</label>
                        <input type="time" id="mt-actual-end" value="${m.actual_end_time || ''}">
                        <small>Duration will be auto-calculated from start to end time</small>
                    </div>

                    <div class="form-group">
                        <label><i class="fas fa-images"></i> Meeting Photographs</label>
                        <div class="modal-file-upload">
                            <i class="fas fa-camera"></i>
                            <p>Upload meeting action photographs</p>
                            <span>JPG, PNG (Max 5MB each)</span>
                            <input type="file" id="mt-photos" accept="image/*" multiple>
                        </div>
                        <div class="photos-upload-grid" id="mt-photos-preview"></div>
                    </div>
                </div>`,
                async (close) => {
                    await this.saveMinutes(meetingId, close);
                },
                { wide: true, saveLabel: '<i class="fas fa-save"></i> Save Minutes' }
            );

            setTimeout(() => {
                document.getElementById('mt-photos')?.addEventListener('change', (e) => {
                    this.previewMeetingPhotos(e.target.files);
                });
            }, 200);
        },

        buildMinutesRows() {
            if (!currentMinutes.length) {
                return `<div style="text-align:center;padding:24px;color:var(--a-text3);font-size:0.82rem;">
                    No minutes entries yet. Click "Add Entry" to start.
                </div>`;
            }
            return currentMinutes.map((row, i) => `
                <div class="minutes-row" data-index="${i}">
                    <input type="time" value="${row.time || ''}" placeholder="HH:MM" data-field="time">
                    <input type="text" value="${esc(row.heading || '')}" placeholder="Heading" data-field="heading">
                    <textarea placeholder="Details..." data-field="details" rows="2">${esc(row.details || '')}</textarea>
                    <button type="button" class="agenda-remove" onclick="AdminMeetings.removeMinutesRow(${i})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        },

        addMinutesRow() {
            currentMinutes.push({ time: '', heading: '', details: '' });
            this.refreshMinutesRows();
        },

        removeMinutesRow(index) {
            currentMinutes.splice(index, 1);
            this.refreshMinutesRows();
        },

        refreshMinutesRows() {
            const container = document.getElementById('minutes-rows');
            if (container) container.innerHTML = this.buildMinutesRows();
        },

        collectMinutesData() {
            const rows = document.querySelectorAll('#minutes-rows .minutes-row');
            return Array.from(rows).map(row => ({
                time: row.querySelector('[data-field="time"]')?.value || '',
                heading: row.querySelector('[data-field="heading"]')?.value.trim() || '',
                details: row.querySelector('[data-field="details"]')?.value.trim() || ''
            }));
        },

        previewMeetingPhotos(files) {
            meetingPhotoFiles = Array.from(files).slice(0, 10);
            const preview = document.getElementById('mt-photos-preview');
            if (!preview) return;
            preview.innerHTML = '';

            meetingPhotoFiles.forEach((file, i) => {
                const reader = new FileReader();
                reader.onload = ev => {
                    const item = document.createElement('div');
                    item.className = 'photo-upload-item';
                    item.innerHTML = `<img src="${ev.target.result}" alt="Photo ${i + 1}">`;
                    preview.appendChild(item);
                };
                reader.readAsDataURL(file);
            });
        },

        async saveMinutes(meetingId, close) {
            const minutesData = this.collectMinutesData();
            const actualEnd = document.getElementById('mt-actual-end')?.value;

            try {
                // Calculate duration
                const m = this.data.find(x => x.id === meetingId);
                let durationText = '';
                if (m && actualEnd) {
                    const [sh, sm] = m.start_time.split(':').map(Number);
                    const [eh, em] = actualEnd.split(':').map(Number);
                    const totalMins = (eh * 60 + em) - (sh * 60 + sm);
                    durationText = `Duration of the Meeting: ${totalMins} minutes`;
                }

                // Add duration as last entry if not present
                if (durationText && !minutesData.find(r => r.heading === 'Meeting Duration')) {
                    minutesData.push({ time: actualEnd, heading: 'Meeting Duration', details: durationText });
                }

                // Update meeting with minutes
                const user = auth.getCurrentUser();
                const { error } = await db.from('meetings').update({
                    minutes_content: minutesData,
                    actual_end_time: actualEnd || null,
                    minutes_approved: false
                }).eq('id', meetingId);

                if (error) throw error;

                // Upload photos
                if (meetingPhotoFiles.length > 0) {
                    const uploads = [];
                    for (let i = 0; i < meetingPhotoFiles.length; i++) {
                        try {
                            window.UnityStorage.checkFileSize(meetingPhotoFiles[i]);
                            const compressed = await window.UnityStorage.compressImage(meetingPhotoFiles[i], 1000, 0.7);
                            const path = `meeting_photo_${meetingId}_${Date.now()}_${i}.jpg`;
                            const url = await window.UnityStorage.uploadFile('meetings', compressed, path);
                            uploads.push({ meeting_id: meetingId, photo_url: url });
                        } catch (e) { console.warn('Photo upload failed:', e); }
                    }
                    if (uploads.length > 0) {
                        await db.from('meeting_photos').insert(uploads);
                    }
                }

                toast('Minutes saved successfully!', 'success');
                close();
                await this.fetchAndRender();
            } catch (e) {
                toast('Failed to save minutes: ' + e.message, 'error');
            }
        },

        async approveMinutes(meetingId) {
            auth.openConfirm('Approve Minutes', 'Approve these meeting minutes? They will be sent to members.', async () => {
                try {
                    const user = auth.getCurrentUser();
                    await db.from('meetings').update({
                        minutes_approved: true,
                        minutes_approved_by: user?.id,
                        minutes_approved_at: new Date().toISOString()
                    }).eq('id', meetingId);

                    // Send minutes to members
                    if (window.AdminMail) await window.AdminMail.sendMeetingMinutes(meetingId);

                    toast('Minutes approved and sent to members!', 'success');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Failed to approve minutes', 'error');
                }
            }, 'success');
        },

        async sendInvite(meetingId) {
            const m = this.data.find(x => x.id === meetingId);
            if (!m) return;

            auth.openConfirm('Send Meeting Invite', `Send meeting invite for "${m.title}" to ${m.meeting_type === 'board' ? 'board members' : 'all members'}?`, async () => {
                try {
                    if (window.AdminMail) {
                        await window.AdminMail.sendMeetingInvite(m);
                        toast('Meeting invite sent!', 'success');
                    } else {
                        toast('Mail system not available', 'error');
                    }
                } catch (e) {
                    toast('Failed to send invite', 'error');
                }
            }, 'success');
        },

        async viewDetails(meetingId) {
            const m = this.data.find(x => x.id === meetingId);
            if (!m) return;

            const { data: photos } = await db.from('meeting_photos').select('*').eq('meeting_id', meetingId);
            const { data: attendance } = await db.from('meeting_attendance').select('*').eq('meeting_id', meetingId);

            auth.openModal(
                `<i class="fas fa-users-cog"></i> ${esc(m.title)}`,
                `<div style="display:flex;flex-direction:column;gap:16px;">
                    ${m.poster_url ? `<img src="${esc(m.poster_url)}" style="width:100%;max-height:180px;object-fit:cover;border-radius:var(--a-radius);border:1px solid var(--a-border);" onerror="this.style.display='none';">` : ''}
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                        ${this.detailField('Type', m.meeting_type === 'board' ? 'Board Meeting' : 'General Body Meeting', 'fa-users-cog')}
                        ${this.detailField('Date', fDate(m.meeting_date), 'fa-calendar')}
                        ${this.detailField('Start Time', fTime(m.start_time), 'fa-clock')}
                        ${m.end_time ? this.detailField('End Time', fTime(m.end_time), 'fa-clock') : ''}
                        ${m.venue ? this.detailField('Venue', m.venue, 'fa-map-marker-alt') : ''}
                        ${m.group_number ? this.detailField('Group', 'Group ' + m.group_number, 'fa-layer-group') : ''}
                        ${m.minutes_prepared_by ? this.detailField('Minutes Prepared By', m.minutes_prepared_by, 'fa-user-shield') : ''}
                        ${m.sergeant_at_arms ? this.detailField('Sergeant at Arms', m.sergeant_at_arms, 'fa-gavel') : ''}
                    </div>
                    ${m.agenda && m.agenda.length ? `
                    <div>
                        <div style="font-size:0.75rem;font-weight:700;color:var(--a-text3);margin-bottom:8px;text-transform:uppercase;">Agenda</div>
                        <ol style="padding-left:20px;display:flex;flex-direction:column;gap:6px;">
                            ${m.agenda.map(item => `<li style="font-size:0.84rem;color:var(--a-text2);">${esc(item)}</li>`).join('')}
                        </ol>
                    </div>` : ''}
                    ${m.minutes_content && m.minutes_content.length ? `
                    <div>
                        <div style="font-size:0.75rem;font-weight:700;color:var(--a-text3);margin-bottom:8px;text-transform:uppercase;">
                            Minutes ${m.minutes_approved ? '<span class="badge badge-success" style="font-size:0.65rem;">Approved</span>' : '<span class="badge badge-warning" style="font-size:0.65rem;">Pending</span>'}
                        </div>
                        <div style="border:1px solid var(--a-border);border-radius:var(--a-radius-sm);overflow:hidden;">
                            ${m.minutes_content.map(row => `
                                <div style="display:grid;grid-template-columns:80px 1fr;gap:0;border-bottom:1px solid var(--a-border);">
                                    <div style="padding:8px 10px;background:var(--a-bg-alt);font-size:0.75rem;color:var(--a-text3);font-weight:600;">
                                        ${row.time ? fTime(row.time) : ''}
                                    </div>
                                    <div style="padding:8px 10px;">
                                        <div style="font-size:0.82rem;font-weight:700;color:var(--a-text);">${esc(row.heading)}</div>
                                        ${row.details ? `<div style="font-size:0.78rem;color:var(--a-text2);margin-top:3px;">${esc(row.details)}</div>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>` : ''}
                    ${attendance && attendance.length ? `
                    <div>
                        <div style="font-size:0.75rem;font-weight:700;color:var(--a-text3);margin-bottom:8px;text-transform:uppercase;">
                            Attendance (${attendance.length} members)
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${attendance.map(a => `
                                <span class="badge badge-success">${esc(a.member_name)}</span>
                            `).join('')}
                        </div>
                    </div>` : ''}
                    ${photos && photos.length ? `
                    <div>
                        <div style="font-size:0.75rem;font-weight:700;color:var(--a-text3);margin-bottom:8px;text-transform:uppercase;">Photographs</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;">
                            ${photos.map(p => `
                                <img src="${esc(p.photo_url)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;border:1px solid var(--a-border);cursor:pointer;"
                                     onclick="document.getElementById('image-preview-overlay').style.display='flex';document.getElementById('image-preview-img').src='${esc(p.photo_url)}';"
                                     onerror="this.style.display='none';">
                            `).join('')}
                        </div>
                    </div>` : ''}
                </div>`,
                null,
                { wide: true, hideSave: true }
            );
        },

        detailField(label, value, icon) {
            return `
                <div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                    <div style="font-size:0.65rem;color:var(--a-text3);font-weight:600;text-transform:uppercase;margin-bottom:3px;">
                        <i class="fas ${icon}" style="margin-right:4px;"></i>${label}
                    </div>
                    <div style="font-size:0.84rem;font-weight:600;color:var(--a-text);">${esc(value)}</div>
                </div>
            `;
        },

        async downloadAgenda(meetingId) {
            if (window.DocxGenerator) {
                await window.DocxGenerator.generateMeetingAgenda(meetingId);
            } else {
                toast('Document generator not available', 'error');
            }
        },

        async downloadMinutes(meetingId) {
            if (window.DocxGenerator) {
                await window.DocxGenerator.generateMeetingMinutes(meetingId);
            } else {
                toast('Document generator not available', 'error');
            }
        },

        async downloadAttendance(meetingId) {
            if (window.DocxGenerator) {
                await window.DocxGenerator.generateAttendanceSheet(meetingId);
            } else {
                toast('Document generator not available', 'error');
            }
        },

        async confirmDelete(meetingId, title) {
            auth.openConfirm('Delete Meeting', `Delete "${title}"? All minutes and attendance records will also be deleted.`, async () => {
                try {
                    await db.from('meeting_attendance').delete().eq('meeting_id', meetingId);
                    await db.from('meeting_photos').delete().eq('meeting_id', meetingId);
                    await db.from('meetings').delete().eq('id', meetingId);
                    toast('Meeting deleted', 'success');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Failed to delete meeting', 'error');
                }
            });
        }
    };

    // ============================================================
    // PUBLIC ATTENDANCE FORM (generates Google Form alternative)
    // ============================================================
    window.MeetingAttendance = {
        // This handles attendance form submissions from public URL
        async submitAttendance(meetingId, formData) {
            try {
                const { error } = await db.from('meeting_attendance').insert({
                    meeting_id: meetingId,
                    member_name: formData.name,
                    designation: formData.designation,
                    ri_id: formData.ri_id,
                    in_time: formData.in_time,
                    signature_url: formData.signature_url
                });

                if (error) throw error;
                return true;
            } catch (e) {
                console.error('Attendance submission failed:', e);
                return false;
            }
        }
    };

    // Button listeners
    document.getElementById('add-meeting-btn')?.addEventListener('click', () => AdminMeetings.openAdd());

    console.log('%c Meetings.js loaded ', 'background:#8b5cf6;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

})();