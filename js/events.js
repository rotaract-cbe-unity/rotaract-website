/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Events & Projects Management - js/events.js
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

    function avenueBadge(avenue) {
        return `<span class="avenue-tag ${avenue}">${cfg.avenues[avenue] || avenue}</span>`;
    }

    function statusBadge(status) {
        const map = {
            pending: ['warning', 'fa-clock', 'Pending'],
            approved: ['success', 'fa-check-circle', 'Approved'],
            completed: ['info', 'fa-flag-checkered', 'Completed'],
            rejected: ['danger', 'fa-times-circle', 'Rejected']
        };
        const [type, icon, label] = map[status] || ['gray', 'fa-circle', status];
        return `<span class="badge badge-${type}"><i class="fas ${icon}"></i>${label}</span>`;
    }

    // ============================================================
    // ADMIN EVENTS MODULE
    // ============================================================
    window.AdminEvents = {
        data: [],
        currentPage: 0,
        perPage: 20,

        async load() {
            this.bindFilters();
            await this.fetchAndRender();
        },

        bindFilters() {
            ['event-filter-avenue', 'event-filter-status', 'event-filter-month'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => this.fetchAndRender());
            });
            document.getElementById('event-filter-reset')?.addEventListener('click', () => {
                document.getElementById('event-filter-avenue').value = '';
                document.getElementById('event-filter-status').value = '';
                document.getElementById('event-filter-month').value = '';
                this.fetchAndRender();
            });
        },

        async fetchAndRender() {
            const tbody = document.getElementById('events-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(8);

            const avenue = document.getElementById('event-filter-avenue')?.value;
            const status = document.getElementById('event-filter-status')?.value;
            const month = document.getElementById('event-filter-month')?.value;

            const user = auth.getCurrentUser();
            const perms = auth.getPermissions();

            try {
                let query = db.from('projects')
                    .select('*, project_reports(id, report_approved)')
                    .order('event_date', { ascending: false });

                // Avenue directors only see their avenue
                if (!auth.isHighLevel() && perms.avenues && !perms.avenues.includes('all')) {
                    query = query.in('avenue', perms.avenues);
                }

                if (avenue) query = query.eq('avenue', avenue);
                if (status) query = query.eq('status', status);
                if (month) {
                    const [yr, mo] = month.split('-');
                    const from = `${yr}-${mo}-01`;
                    const to = new Date(yr, parseInt(mo), 0).toISOString().split('T')[0];
                    query = query.gte('event_date', from).lte('event_date', to);
                }

                const { data, error } = await query;
                if (error) throw error;
                this.data = data || [];
                this.render();
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(8, 'Could not load events');
                toast('Failed to load events', 'error');
            }
        },

        render() {
            const tbody = document.getElementById('events-table-body');
            if (!tbody) return;

            if (!this.data.length) {
                tbody.innerHTML = buildEmptyRow(8, 'No events found. Add your first event!');
                return;
            }

            tbody.innerHTML = this.data.map(ev => {
                const reportSubmitted = ev.project_reports && ev.project_reports.length > 0;
                const reportApproved = reportSubmitted && ev.project_reports[0]?.report_approved;
                const canApprove = auth.canApproveProjects();
                const isDPP = ev.avenue === 'district_priority_projects';

                return `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                            ${ev.poster_url ? `<img src="${esc(ev.poster_url)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid var(--a-border);" onerror="this.style.display='none';">` : ''}
                            <div>
                                <div class="cell-name">${esc(ev.title)}</div>
                                ${isDPP && ev.dpp_project_number ? `<div class="cell-sub">DPP #${esc(ev.dpp_project_number)}</div>` : ''}
                                ${ev.event_chair ? `<div class="cell-sub"><i class="fas fa-user-tie" style="font-size:0.65rem;"></i> ${esc(ev.event_chair)}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>${avenueBadge(ev.avenue)}</td>
                    <td>
                        <div style="font-size:0.82rem;font-weight:600;">${fDate(ev.event_date)}</div>
                        ${ev.event_time ? `<div class="cell-sub">${fTime(ev.event_time)}</div>` : ''}
                    </td>
                    <td><small>${esc(ev.venue || '—')}</small></td>
                    <td><small>${esc(ev.event_chair || '—')}</small></td>
                    <td>${statusBadge(ev.status)}</td>
                    <td>
                        ${ev.status === 'completed' ? `
                            <span class="badge badge-${reportApproved ? 'success' : reportSubmitted ? 'warning' : 'danger'}">
                                <i class="fas fa-${reportApproved ? 'check' : reportSubmitted ? 'clock' : 'times'}"></i>
                                ${reportApproved ? 'Approved' : reportSubmitted ? 'Submitted' : 'Pending'}
                            </span>
                        ` : '<span class="badge badge-gray">N/A</span>'}
                    </td>
                    <td>
                        <div class="cell-actions">
                            <button class="action-btn view" title="View Details" onclick="AdminEvents.viewDetails('${ev.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" title="Edit" onclick="AdminEvents.openEdit('${ev.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${canApprove && ev.status === 'pending' ? `
                            <button class="action-btn approve" title="Approve" onclick="AdminEvents.approveEvent('${ev.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn reject" title="Reject" onclick="AdminEvents.rejectEvent('${ev.id}')">
                                <i class="fas fa-times"></i>
                            </button>` : ''}
                            ${ev.status === 'approved' ? `
                            <button class="action-btn" title="Mark Completed" style="color:var(--a-info);" onclick="AdminEvents.markCompleted('${ev.id}')">
                                <i class="fas fa-flag-checkered"></i>
                            </button>` : ''}
                            ${ev.status === 'completed' && !reportSubmitted ? `
                            <button class="action-btn" title="Submit Report" style="color:var(--a-primary);" onclick="AdminEvents.openReportForm('${ev.id}')">
                                <i class="fas fa-file-alt"></i>
                            </button>` : ''}
                            ${reportSubmitted && !reportApproved && canApprove ? `
                            <button class="action-btn approve" title="Approve Report" onclick="AdminEvents.approveReport('${ev.id}')">
                                <i class="fas fa-file-check"></i>
                            </button>` : ''}
                            ${reportSubmitted ? `
                            <button class="action-btn download" title="Download Report" onclick="AdminEvents.downloadReport('${ev.id}')">
                                <i class="fas fa-file-download"></i>
                            </button>` : ''}
                            <button class="action-btn delete" title="Delete" onclick="AdminEvents.confirmDelete('${ev.id}', '${esc(ev.title)}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        },

        // ============================================================
        // ADD EVENT FORM
        // ============================================================
        openAdd() {
            const user = auth.getCurrentUser();
            const perms = auth.getPermissions();
            const isHighLevel = auth.isHighLevel();

            // Build avenue options based on role
            let avenueOptions = '';
            if (isHighLevel || (perms.avenues && perms.avenues.includes('all'))) {
                avenueOptions = Object.entries(cfg.avenues).map(([k, v]) =>
                    `<option value="${k}">${v}</option>`
                ).join('');
            } else {
                avenueOptions = (perms.avenues || []).map(a =>
                    `<option value="${a}">${cfg.avenues[a] || a}</option>`
                ).join('');
            }

            auth.openModal(
                '<i class="fas fa-plus"></i> Add New Event',
                this.buildEventForm(null, avenueOptions),
                async (close) => {
                    await this.saveEvent(null, close);
                },
                { wide: true, saveLabel: '<i class="fas fa-save"></i> Save Event' }
            );

            setTimeout(() => this.initEventFormListeners(), 200);
        },

        async openEdit(eventId) {
            const ev = this.data.find(e => e.id === eventId);
            if (!ev) return;

            const avenueOptions = Object.entries(cfg.avenues).map(([k, v]) =>
                `<option value="${k}" ${k === ev.avenue ? 'selected' : ''}>${v}</option>`
            ).join('');

            auth.openModal(
                `<i class="fas fa-edit"></i> Edit Event - ${esc(ev.title)}`,
                this.buildEventForm(ev, avenueOptions),
                async (close) => {
                    await this.saveEvent(eventId, close);
                },
                { wide: true, saveLabel: '<i class="fas fa-save"></i> Update Event' }
            );

            setTimeout(() => this.initEventFormListeners(ev), 200);
        },

        buildEventForm(ev, avenueOptions) {
            const isDPP = ev?.avenue === 'district_priority_projects';
            const groups = [1, 2, 3, 4, 5, 6].map(g =>
                `<option value="${g}" ${ev?.group_number == g ? 'selected' : ''}>${g}</option>`
            ).join('');

            return `
            <div class="modal-form-grid">
                <div class="form-group full-width">
                    <label><i class="fas fa-heading"></i> Event Title <span class="req">*</span></label>
                    <input type="text" id="ev-title" value="${esc(ev?.title || '')}" placeholder="Event title" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-road"></i> Avenue <span class="req">*</span></label>
                    <select id="ev-avenue" onchange="AdminEvents.onAvenueChange(this)">
                        <option value="">Select Avenue</option>
                        ${avenueOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-layer-group"></i> Group Number</label>
                    <select id="ev-group">
                        <option value="">Select Group</option>
                        ${groups}
                    </select>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-calendar"></i> Event Date <span class="req">*</span></label>
                    <input type="date" id="ev-date" value="${ev?.event_date || ''}" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-clock"></i> Start Time</label>
                    <input type="time" id="ev-time" value="${ev?.event_time || ''}">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-clock"></i> End Time</label>
                    <input type="time" id="ev-end-time" value="${ev?.end_time || ''}">
                </div>
                <div class="form-group full-width">
                    <label><i class="fas fa-map-marker-alt"></i> Venue</label>
                    <input type="text" id="ev-venue" value="${esc(ev?.venue || '')}" placeholder="Event venue">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-user-tie"></i> Event Chair</label>
                    <input type="text" id="ev-chair" value="${esc(ev?.event_chair || '')}" placeholder="Event chair name">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-pen-nib"></i> Event Secretary</label>
                    <input type="text" id="ev-secretary" value="${esc(ev?.event_secretary || '')}" placeholder="Event secretary name (if any)">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-lightbulb"></i> Proposed By</label>
                    <input type="text" id="ev-proposed" value="${esc(ev?.event_proposed_by || '')}" placeholder="Proposed by">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-thumbs-up"></i> Seconded By</label>
                    <input type="text" id="ev-seconded" value="${esc(ev?.event_seconded_by || '')}" placeholder="Seconded by">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-handshake"></i> Collaboration Type</label>
                    <select id="ev-collab">
                        <option value="none" ${ev?.collaboration_type === 'none' ? 'selected' : ''}>No Collaboration</option>
                        <option value="rotaract" ${ev?.collaboration_type === 'rotaract' ? 'selected' : ''}>Rotaract</option>
                        <option value="interact" ${ev?.collaboration_type === 'interact' ? 'selected' : ''}>Interact</option>
                        <option value="rotary" ${ev?.collaboration_type === 'rotary' ? 'selected' : ''}>Rotary</option>
                        <option value="ngo" ${ev?.collaboration_type === 'ngo' ? 'selected' : ''}>NGO</option>
                        <option value="others" ${ev?.collaboration_type === 'others' ? 'selected' : ''}>Others</option>
                    </select>
                </div>
                <div class="form-group" id="ev-collab-name-group" style="${ev?.collaboration_type && ev.collaboration_type !== 'none' ? '' : 'display:none;'}">
                    <label><i class="fas fa-building"></i> Collaborator Name</label>
                    <input type="text" id="ev-collab-name" value="${esc(ev?.collaborator_name || '')}" placeholder="Collaborating organization name">
                </div>
                <div class="form-group full-width">
                    <label><i class="fas fa-align-left"></i> Description</label>
                    <textarea id="ev-desc" rows="4" placeholder="Event description...">${esc(ev?.description || '')}</textarea>
                </div>

                <!-- DPP Fields -->
                <div id="ev-dpp-fields" class="dpp-fields full-width" style="${isDPP ? '' : 'display:none;'}">
                    <div class="dpp-fields-header">
                        <i class="fas fa-star"></i> District Priority Project Details
                    </div>
                    <div class="modal-form-grid">
                        <div class="form-group">
                            <label>DPP Project Number</label>
                            <input type="text" id="ev-dpp-num" value="${esc(ev?.dpp_project_number || '')}" placeholder="e.g. DPP-001">
                        </div>
                        <div class="form-group">
                            <label>DPP Pillar</label>
                            <input type="text" id="ev-dpp-pillar" value="${esc(ev?.dpp_pillar || '')}" placeholder="e.g. Education">
                        </div>
                        <div class="form-group full-width">
                            <label>DPP Category</label>
                            <input type="text" id="ev-dpp-cat" value="${esc(ev?.dpp_category || '')}" placeholder="DPP category">
                        </div>
                    </div>
                </div>

                <!-- Poster Upload -->
                <div class="form-group full-width">
                    <label><i class="fas fa-image"></i> Event Poster</label>
                    ${ev?.poster_url ? `
                    <div style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">
                        <img src="${esc(ev.poster_url)}" style="height:60px;border-radius:6px;border:1px solid var(--a-border);" onerror="this.style.display='none';">
                        <small style="color:var(--a-text3);">Current poster · Upload new to replace</small>
                    </div>` : ''}
                    <div class="modal-file-upload">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Click to upload event poster</p>
                        <span>JPG, PNG, WebP (Max 5MB)</span>
                        <input type="file" id="ev-poster-file" accept="image/*">
                    </div>
                    <div id="ev-poster-preview"></div>
                </div>
            </div>`;
        },

        initEventFormListeners(ev) {
            // Collaboration type toggle
            document.getElementById('ev-collab')?.addEventListener('change', (e) => {
                const nameGroup = document.getElementById('ev-collab-name-group');
                if (nameGroup) nameGroup.style.display = e.target.value !== 'none' ? '' : 'none';
            });

            // Poster preview
            document.getElementById('ev-poster-file')?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => {
                        const preview = document.getElementById('ev-poster-preview');
                        if (preview) preview.innerHTML = `<img src="${ev.target.result}" style="max-height:100px;margin-top:10px;border-radius:8px;border:1px solid var(--a-border);">`;
                    };
                    reader.readAsDataURL(file);
                }
            });

            // Set avenue from existing event
            if (ev?.avenue) {
                const sel = document.getElementById('ev-avenue');
                if (sel) sel.value = ev.avenue;
                this.onAvenueChange(sel);
            }
        },

        onAvenueChange(select) {
            const dppFields = document.getElementById('ev-dpp-fields');
            if (dppFields) {
                dppFields.style.display = select?.value === 'district_priority_projects' ? '' : 'none';
            }
        },

        async saveEvent(eventId, close) {
            const title = document.getElementById('ev-title')?.value.trim();
            const avenue = document.getElementById('ev-avenue')?.value;
            const date = document.getElementById('ev-date')?.value;

            if (!title || !avenue || !date) {
                toast('Title, avenue and date are required', 'warning');
                return;
            }

            const user = auth.getCurrentUser();

            // Upload poster if selected
            let posterUrl = null;
            if (eventId) {
                const existing = this.data.find(e => e.id === eventId);
                posterUrl = existing?.poster_url || null;
            }

            const posterFile = document.getElementById('ev-poster-file')?.files[0];
            if (posterFile) {
                try {
                    window.UnityStorage.checkFileSize(posterFile);
                    const compressed = await window.UnityStorage.compressImage(posterFile, 1000, 0.75);
                    const path = `poster_${Date.now()}.jpg`;
                    posterUrl = await window.UnityStorage.uploadFile('events', compressed, path);
                } catch (e) {
                    toast('Poster upload failed: ' + e.message, 'warning');
                }
            }

            const payload = {
                title,
                avenue,
                event_date: date,
                event_time: document.getElementById('ev-time')?.value || null,
                end_time: document.getElementById('ev-end-time')?.value || null,
                venue: document.getElementById('ev-venue')?.value.trim() || null,
                event_chair: document.getElementById('ev-chair')?.value.trim() || null,
                event_secretary: document.getElementById('ev-secretary')?.value.trim() || null,
                event_proposed_by: document.getElementById('ev-proposed')?.value.trim() || null,
                event_seconded_by: document.getElementById('ev-seconded')?.value.trim() || null,
                collaboration_type: document.getElementById('ev-collab')?.value || 'none',
                collaborator_name: document.getElementById('ev-collab-name')?.value.trim() || null,
                description: document.getElementById('ev-desc')?.value.trim() || null,
                group_number: document.getElementById('ev-group')?.value || null,
                poster_url: posterUrl,
                dpp_project_number: avenue === 'district_priority_projects' ? document.getElementById('ev-dpp-num')?.value.trim() : null,
                dpp_pillar: avenue === 'district_priority_projects' ? document.getElementById('ev-dpp-pillar')?.value.trim() : null,
                dpp_category: avenue === 'district_priority_projects' ? document.getElementById('ev-dpp-cat')?.value.trim() : null
            };

            try {
                if (eventId) {
                    const { error } = await db.from('projects').update(payload).eq('id', eventId);
                    if (error) throw error;
                    toast('Event updated successfully!', 'success');
                } else {
                    payload.status = 'pending';
                    payload.uploaded_by = user?.id;
                    const { error } = await db.from('projects').insert(payload);
                    if (error) throw error;
                    toast('Event added! Pending approval.', 'success');
                }

                close();
                await this.fetchAndRender();
            } catch (e) {
                toast(e.message || 'Failed to save event', 'error');
            }
        },

        async approveEvent(eventId) {
            auth.openConfirm('Approve Event', 'Approve this event? It will be visible on the website and members will be notified.', async () => {
                try {
                    const user = auth.getCurrentUser();
                    await db.from('projects').update({
                        status: 'approved',
                        approved_by: user?.id,
                        approved_at: new Date().toISOString()
                    }).eq('id', eventId);

                    // Send notification mail
                    if (window.AdminMail) await window.AdminMail.sendEventApproval(eventId);

                    toast('Event approved! Members will be notified.', 'success');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Approval failed', 'error');
                }
            }, 'success');
        },

        async rejectEvent(eventId) {
            auth.openConfirm('Reject Event', 'Reject this event? The avenue director will be notified.', async () => {
                try {
                    await db.from('projects').update({ status: 'rejected' }).eq('id', eventId);
                    toast('Event rejected', 'warning');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Failed to reject event', 'error');
                }
            });
        },

        async markCompleted(eventId) {
            auth.openConfirm('Mark as Completed', 'Mark this event as completed? A report will need to be submitted.', async () => {
                try {
                    await db.from('projects').update({ status: 'completed' }).eq('id', eventId);
                    toast('Event marked as completed!', 'success');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Failed to update status', 'error');
                }
            }, 'success');
        },

        // ============================================================
        // REPORT SUBMISSION FORM
        // ============================================================
        openReportForm(eventId) {
            const ev = this.data.find(e => e.id === eventId);
            if (!ev) return;

            auth.openModal(
                `<i class="fas fa-file-alt"></i> Submit Report - ${esc(ev.title)}`,
                `<div class="modal-form-grid cols-1">
                    <div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);font-size:0.82rem;color:var(--a-text2);">
                        <strong><i class="fas fa-info-circle" style="color:var(--a-primary);"></i> Event:</strong> ${esc(ev.title)}<br>
                        <strong>Date:</strong> ${fDate(ev.event_date)} | <strong>Avenue:</strong> ${cfg.avenues[ev.avenue]}
                    </div>
                    <div class="form-group">
                        <label>Report Narrative <span class="req">*</span></label>
                        <textarea id="rpt-text" rows="6" placeholder="Describe what happened at the event, outcomes, impact, etc..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Attendance Count</label>
                        <input type="number" id="rpt-attendance" min="0" placeholder="Number of attendees">
                    </div>
                    <div class="form-group">
                        <label>Beneficiaries Count</label>
                        <input type="number" id="rpt-beneficiaries" min="0" placeholder="Number of beneficiaries">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-images"></i> Action Photographs (up to 10, max 5MB each)</label>
                        <div class="modal-file-upload">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click to upload action photos</p>
                            <span>JPG, PNG (Max 5MB each)</span>
                            <input type="file" id="rpt-photos" accept="image/*" multiple>
                        </div>
                        <div class="photos-upload-grid" id="rpt-photos-preview"></div>
                    </div>
                </div>`,
                async (close) => {
                    await this.submitReport(eventId, close);
                },
                { wide: true, saveLabel: '<i class="fas fa-paper-plane"></i> Submit Report' }
            );

            setTimeout(() => {
                document.getElementById('rpt-photos')?.addEventListener('change', (e) => {
                    this.previewReportPhotos(e.target.files);
                });
            }, 200);
        },

        previewReportPhotos(files) {
            const preview = document.getElementById('rpt-photos-preview');
            if (!preview) return;
            preview.innerHTML = '';

            Array.from(files).slice(0, 10).forEach((file, i) => {
                const reader = new FileReader();
                reader.onload = ev => {
                    const item = document.createElement('div');
                    item.className = 'photo-upload-item';
                    item.innerHTML = `
                        <img src="${ev.target.result}" alt="Photo ${i + 1}">
                        <button class="photo-remove-btn" data-index="${i}" type="button">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    preview.appendChild(item);
                };
                reader.readAsDataURL(file);
            });
        },

        async submitReport(eventId, close) {
            const text = document.getElementById('rpt-text')?.value.trim();
            if (!text) { toast('Report narrative is required', 'warning'); return; }

            const user = auth.getCurrentUser();
            const attendance = parseInt(document.getElementById('rpt-attendance')?.value) || null;
            const beneficiaries = parseInt(document.getElementById('rpt-beneficiaries')?.value) || null;

            try {
                // Insert report
                const { data: report, error: repErr } = await db.from('project_reports').insert({
                    project_id: eventId,
                    report_text: text,
                    attendance_count: attendance,
                    beneficiaries_count: beneficiaries,
                    submitted_by: user?.id,
                    report_approved: false
                }).select().single();

                if (repErr) throw repErr;

                // Upload photos
                const photoFiles = document.getElementById('rpt-photos')?.files;
                if (photoFiles && photoFiles.length > 0) {
                    const uploads = [];
                    for (let i = 0; i < Math.min(photoFiles.length, 10); i++) {
                        const file = photoFiles[i];
                        try {
                            window.UnityStorage.checkFileSize(file);
                            const compressed = await window.UnityStorage.compressImage(file, 1000, 0.7);
                            const path = `report_${eventId}_${Date.now()}_${i}.jpg`;
                            const url = await window.UnityStorage.uploadFile('reports', compressed, path);
                            uploads.push({
                                project_id: eventId,
                                report_id: report.id,
                                photo_url: url,
                                photo_type: 'action'
                            });
                        } catch (photoErr) {
                            console.warn('Photo upload failed:', photoErr);
                        }
                    }

                    if (uploads.length > 0) {
                        await db.from('event_photos').insert(uploads);
                    }
                }

                // Update project report_submitted flag
                await db.from('projects').update({
                    report_submitted: true,
                    report_submitted_at: new Date().toISOString(),
                    report_submitted_by: user?.id
                }).eq('id', eventId);

                toast('Report submitted successfully! Awaiting approval.', 'success');
                close();
                await this.fetchAndRender();
            } catch (e) {
                toast('Failed to submit report: ' + e.message, 'error');
            }
        },

        async approveReport(eventId) {
            auth.openConfirm('Approve Report', 'Approve this event report? Approved reports will be sent to members.', async () => {
                try {
                    const user = auth.getCurrentUser();
                    await db.from('project_reports').update({
                        report_approved: true,
                        approved_by: user?.id,
                        approved_at: new Date().toISOString()
                    }).eq('project_id', eventId);

                    // Notify members
                    if (window.AdminMail) await window.AdminMail.sendReportApproved(eventId);

                    toast('Report approved! Members will receive the report.', 'success');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Failed to approve report', 'error');
                }
            }, 'success');
        },

        async downloadReport(eventId) {
            if (window.DocxGenerator) {
                await window.DocxGenerator.generateEventReport(eventId);
            } else {
                toast('Report generator not available', 'error');
            }
        },

        async viewDetails(eventId) {
            try {
                const { data: ev } = await db.from('projects')
                    .select('*, project_reports(*), event_photos(*)')
                    .eq('id', eventId)
                    .single();

                if (!ev) { toast('Event not found', 'error'); return; }

                const isDPP = ev.avenue === 'district_priority_projects';
                const report = ev.project_reports?.[0];
                const photos = ev.event_photos || [];
                const actionPhotos = photos.filter(p => p.photo_type === 'action');

                auth.openModal(
                    `<i class="fas fa-calendar-alt"></i> ${esc(ev.title)}`,
                    `<div style="display:flex;flex-direction:column;gap:16px;">
                        ${ev.poster_url ? `<img src="${esc(ev.poster_url)}" style="width:100%;max-height:200px;object-fit:cover;border-radius:var(--a-radius);border:1px solid var(--a-border);" onerror="this.style.display='none';">` : ''}
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                            ${this.detailField('Avenue', cfg.avenues[ev.avenue] || ev.avenue, 'fa-road')}
                            ${this.detailField('Status', ev.status, 'fa-circle')}
                            ${this.detailField('Date', fDate(ev.event_date), 'fa-calendar')}
                            ${ev.event_time ? this.detailField('Time', fTime(ev.event_time) + (ev.end_time ? ' - ' + fTime(ev.end_time) : ''), 'fa-clock') : ''}
                            ${ev.venue ? this.detailField('Venue', ev.venue, 'fa-map-marker-alt') : ''}
                            ${ev.event_chair ? this.detailField('Event Chair', ev.event_chair, 'fa-user-tie') : ''}
                            ${ev.event_secretary ? this.detailField('Event Secretary', ev.event_secretary, 'fa-pen-nib') : ''}
                            ${ev.group_number ? this.detailField('Group', 'Group ' + ev.group_number, 'fa-layer-group') : ''}
                            ${ev.event_proposed_by ? this.detailField('Proposed By', ev.event_proposed_by, 'fa-lightbulb') : ''}
                            ${ev.event_seconded_by ? this.detailField('Seconded By', ev.event_seconded_by, 'fa-thumbs-up') : ''}
                            ${ev.collaboration_type && ev.collaboration_type !== 'none' ? this.detailField('Collaboration', ev.collaboration_type + (ev.collaborator_name ? ' - ' + ev.collaborator_name : ''), 'fa-handshake') : ''}
                            ${isDPP && ev.dpp_project_number ? this.detailField('DPP Number', ev.dpp_project_number, 'fa-hashtag') : ''}
                            ${isDPP && ev.dpp_pillar ? this.detailField('DPP Pillar', ev.dpp_pillar, 'fa-columns') : ''}
                            ${isDPP && ev.dpp_category ? this.detailField('DPP Category', ev.dpp_category, 'fa-tag') : ''}
                        </div>
                        ${ev.description ? `
                        <div>
                            <div style="font-size:0.75rem;font-weight:700;color:var(--a-text3);margin-bottom:6px;text-transform:uppercase;">Description</div>
                            <p style="font-size:0.84rem;color:var(--a-text2);line-height:1.7;background:var(--a-bg-alt);padding:12px;border-radius:var(--a-radius-sm);">${esc(ev.description)}</p>
                        </div>` : ''}
                        ${report ? `
                        <div>
                            <div style="font-size:0.75rem;font-weight:700;color:var(--a-text3);margin-bottom:6px;text-transform:uppercase;">Report</div>
                            <div style="background:var(--a-bg-alt);padding:12px;border-radius:var(--a-radius-sm);">
                                <p style="font-size:0.84rem;color:var(--a-text2);line-height:1.7;">${esc(report.report_text)}</p>
                                <div style="margin-top:10px;display:flex;gap:14px;font-size:0.78rem;color:var(--a-text3);">
                                    ${report.attendance_count ? `<span><i class="fas fa-users"></i> ${report.attendance_count} attendees</span>` : ''}
                                    ${report.beneficiaries_count ? `<span><i class="fas fa-heart"></i> ${report.beneficiaries_count} beneficiaries</span>` : ''}
                                    <span class="badge badge-${report.report_approved ? 'success' : 'warning'}">${report.report_approved ? 'Approved' : 'Pending'}</span>
                                </div>
                            </div>
                        </div>` : ''}
                        ${actionPhotos.length ? `
                        <div>
                            <div style="font-size:0.75rem;font-weight:700;color:var(--a-text3);margin-bottom:8px;text-transform:uppercase;">Action Photographs (${actionPhotos.length})</div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;">
                                ${actionPhotos.map(p => `
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
            } catch (e) {
                toast('Could not load event details', 'error');
            }
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

        async confirmDelete(eventId, title) {
            auth.openConfirm('Delete Event', `Permanently delete "${title}"? All associated reports and photos will also be deleted.`, async () => {
                try {
                    // Delete photos first
                    await db.from('event_photos').delete().eq('project_id', eventId);
                    await db.from('project_reports').delete().eq('project_id', eventId);
                    await db.from('projects').delete().eq('id', eventId);
                    toast('Event deleted successfully', 'success');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Failed to delete event', 'error');
                }
            });
        }
    };

    // Button listeners
    document.getElementById('add-event-btn')?.addEventListener('click', () => AdminEvents.openAdd());

    console.log('%c Events.js loaded ', 'background:#3b82f6;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

})();