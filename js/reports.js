/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Reports Management - js/reports.js
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

    // ============================================================
    // ADMIN REPORTS MODULE
    // ============================================================
    window.AdminReports = {
        data: [],

        async load() {
            if (!auth.hasPermission('canViewReports') && !auth.isHighLevel()) {
                document.getElementById('reports-table-body').innerHTML =
                    buildEmptyRow(6, 'You do not have access to reports');
                return;
            }
            this.bindFilters();
            await this.fetchAndRender();
        },

        bindFilters() {
            ['report-filter-avenue', 'report-filter-month', 'report-filter-status'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => this.fetchAndRender());
            });
        },

        async fetchAndRender() {
            const tbody = document.getElementById('reports-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(6);

            const avenue = document.getElementById('report-filter-avenue')?.value;
            const month = document.getElementById('report-filter-month')?.value;
            const reportStatus = document.getElementById('report-filter-status')?.value;

            const user = auth.getCurrentUser();
            const perms = auth.getPermissions();

            try {
                let query = db.from('projects')
                    .select('*, project_reports(id, report_text, report_approved, attendance_count, beneficiaries_count, submitted_by, created_at, approved_at)')
                    .eq('status', 'completed')
                    .order('event_date', { ascending: false });

                // Filter by avenue for avenue directors
                if (!auth.isHighLevel() && perms.avenues && !perms.avenues.includes('all')) {
                    query = query.in('avenue', perms.avenues);
                }

                if (avenue) query = query.eq('avenue', avenue);
                if (month) {
                    const [yr, mo] = month.split('-');
                    const from = `${yr}-${mo}-01`;
                    const to = new Date(yr, parseInt(mo), 0).toISOString().split('T')[0];
                    query = query.gte('event_date', from).lte('event_date', to);
                }

                if (reportStatus === 'true') {
                    query = query.eq('report_submitted', true);
                } else if (reportStatus === 'false') {
                    query = query.eq('report_submitted', false);
                }

                const { data, error } = await query;
                if (error) throw error;
                this.data = data || [];
                this.render();
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(6, 'Could not load reports');
                toast('Failed to load reports', 'error');
            }
        },

        render() {
            const tbody = document.getElementById('reports-table-body');
            if (!tbody) return;

            if (!this.data.length) {
                tbody.innerHTML = buildEmptyRow(6, 'No completed events found');
                return;
            }

            const canApprove = auth.hasPermission('canApproveReports');
            const canDownload = auth.hasPermission('canDownloadMonthly');
            const canDownloadDPP = auth.hasPermission('canDownloadDPP');

            tbody.innerHTML = this.data.map(ev => {
                const report = ev.project_reports?.[0];
                const hasReport = !!report;
                const isApproved = report?.report_approved;
                const isDPP = ev.avenue === 'district_priority_projects';

                return `
                <tr>
                    <td>
                        <div class="cell-name">${esc(ev.title)}</div>
                        ${isDPP && ev.dpp_project_number ? `<div class="cell-sub">DPP #${esc(ev.dpp_project_number)}</div>` : ''}
                        <div class="cell-sub">${fDate(ev.event_date)}</div>
                    </td>
                    <td>${avenueBadge(ev.avenue)}</td>
                    <td>
                        <div style="font-size:0.82rem;font-weight:600;">${fDate(ev.event_date)}</div>
                        ${ev.event_time ? `<div class="cell-sub">${fTime(ev.event_time)}</div>` : ''}
                    </td>
                    <td>
                        <span class="badge badge-${hasReport ? 'success' : 'danger'}">
                            <i class="fas fa-${hasReport ? 'check' : 'times'}"></i>
                            ${hasReport ? 'Submitted' : 'Pending'}
                        </span>
                        ${hasReport && report.attendance_count ? `<div class="cell-sub"><i class="fas fa-users" style="font-size:0.65rem;"></i> ${report.attendance_count} attendees</div>` : ''}
                    </td>
                    <td>
                        ${hasReport ? `
                        <span class="badge badge-${isApproved ? 'success' : 'warning'}">
                            <i class="fas fa-${isApproved ? 'check-circle' : 'clock'}"></i>
                            ${isApproved ? 'Approved' : 'Pending'}
                        </span>
                        ` : '<span class="badge badge-gray">N/A</span>'}
                    </td>
                    <td>
                        <div class="cell-actions">
                            ${!hasReport ? `
                            <button class="action-btn" title="Submit Report" style="color:var(--a-primary);" onclick="AdminReports.openReportForm('${ev.id}')">
                                <i class="fas fa-file-plus"></i>
                            </button>` : ''}
                            ${hasReport ? `
                            <button class="action-btn view" title="View Report" onclick="AdminReports.viewReport('${ev.id}')">
                                <i class="fas fa-eye"></i>
                            </button>` : ''}
                            ${hasReport && !isApproved && canApprove ? `
                            <button class="action-btn approve" title="Approve Report" onclick="AdminReports.approveReport('${ev.id}')">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                            ${hasReport && (canDownload || (isDPP && canDownloadDPP)) ? `
                            <button class="action-btn download" title="Download Report (.docx)" onclick="AdminReports.downloadEventReport('${ev.id}')">
                                <i class="fas fa-file-word"></i>
                            </button>` : ''}
                            ${hasReport ? `
                            <button class="action-btn edit" title="Edit Report" onclick="AdminReports.openReportForm('${ev.id}', true)">
                                <i class="fas fa-edit"></i>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>`;
            }).join('');
        },

        // ============================================================
        // REPORT FORM (Submit / Edit)
        // ============================================================
        async openReportForm(eventId, isEdit = false) {
            const ev = this.data.find(e => e.id === eventId);
            if (!ev) return;

            const existingReport = ev.project_reports?.[0];

            // Load existing photos if editing
            let existingPhotos = [];
            if (isEdit && existingReport) {
                const { data: photos } = await db.from('event_photos')
                    .select('*')
                    .eq('project_id', eventId)
                    .eq('photo_type', 'action');
                existingPhotos = photos || [];
            }

            auth.openModal(
                `<i class="fas fa-file-alt"></i> ${isEdit ? 'Edit' : 'Submit'} Report - ${esc(ev.title)}`,
                `<div class="modal-form-grid cols-1">
                    <div style="padding:12px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);font-size:0.82rem;">
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                            <div><strong>Event:</strong> ${esc(ev.title)}</div>
                            <div><strong>Avenue:</strong> ${cfg.avenues[ev.avenue]}</div>
                            <div><strong>Date:</strong> ${fDate(ev.event_date)}</div>
                            ${ev.venue ? `<div><strong>Venue:</strong> ${esc(ev.venue)}</div>` : ''}
                            ${ev.event_chair ? `<div><strong>Event Chair:</strong> ${esc(ev.event_chair)}</div>` : ''}
                            ${ev.event_secretary ? `<div><strong>Event Secretary:</strong> ${esc(ev.event_secretary)}</div>` : ''}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Report Narrative <span class="req">*</span></label>
                        <textarea id="rpt-text" rows="6" placeholder="Describe the event in detail - what happened, outcomes, impact...">${esc(existingReport?.report_text || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Number of Attendees</label>
                        <input type="number" id="rpt-attendance" min="0" value="${existingReport?.attendance_count || ''}" placeholder="Total attendance">
                    </div>
                    <div class="form-group">
                        <label>Number of Beneficiaries</label>
                        <input type="number" id="rpt-beneficiaries" min="0" value="${existingReport?.beneficiaries_count || ''}" placeholder="Lives impacted">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-images"></i> Action Photographs</label>
                        ${existingPhotos.length ? `
                        <div style="margin-bottom:10px;">
                            <div style="font-size:0.75rem;color:var(--a-text3);margin-bottom:6px;">Existing Photos (${existingPhotos.length})</div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;">
                                ${existingPhotos.map(p => `
                                    <img src="${esc(p.photo_url)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;border:1px solid var(--a-border);">
                                `).join('')}
                            </div>
                        </div>` : ''}
                        <div class="modal-file-upload">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Upload action photographs (up to 10)</p>
                            <span>JPG, PNG (Max 5MB each)</span>
                            <input type="file" id="rpt-new-photos" accept="image/*" multiple>
                        </div>
                        <div class="photos-upload-grid" id="rpt-new-photos-preview"></div>
                    </div>
                </div>`,
                async (close) => {
                    await this.saveReport(eventId, isEdit, existingReport?.id, close);
                },
                { wide: true, saveLabel: `<i class="fas fa-paper-plane"></i> ${isEdit ? 'Update' : 'Submit'} Report` }
            );

            setTimeout(() => {
                document.getElementById('rpt-new-photos')?.addEventListener('change', (e) => {
                    this.previewPhotos(e.target.files, 'rpt-new-photos-preview');
                });
            }, 200);
        },

        previewPhotos(files, previewId) {
            const preview = document.getElementById(previewId);
            if (!preview) return;
            preview.innerHTML = '';

            Array.from(files).slice(0, 10).forEach((file, i) => {
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

        async saveReport(eventId, isEdit, existingReportId, close) {
            const text = document.getElementById('rpt-text')?.value.trim();
            if (!text) { toast('Report narrative is required', 'warning'); return; }

            const user = auth.getCurrentUser();
            const attendance = parseInt(document.getElementById('rpt-attendance')?.value) || null;
            const beneficiaries = parseInt(document.getElementById('rpt-beneficiaries')?.value) || null;

            try {
                let reportId = existingReportId;

                if (isEdit && existingReportId) {
                    await db.from('project_reports').update({
                        report_text: text,
                        attendance_count: attendance,
                        beneficiaries_count: beneficiaries
                    }).eq('id', existingReportId);
                } else {
                    const { data: newReport, error } = await db.from('project_reports').insert({
                        project_id: eventId,
                        report_text: text,
                        attendance_count: attendance,
                        beneficiaries_count: beneficiaries,
                        submitted_by: user?.id,
                        report_approved: false
                    }).select().single();

                    if (error) throw error;
                    reportId = newReport.id;

                    await db.from('projects').update({
                        report_submitted: true,
                        report_submitted_at: new Date().toISOString(),
                        report_submitted_by: user?.id
                    }).eq('id', eventId);
                }

                // Upload new photos
                const photoFiles = document.getElementById('rpt-new-photos')?.files;
                if (photoFiles && photoFiles.length > 0) {
                    const uploads = [];
                    for (let i = 0; i < Math.min(photoFiles.length, 10); i++) {
                        try {
                            window.UnityStorage.checkFileSize(photoFiles[i]);
                            const compressed = await window.UnityStorage.compressImage(photoFiles[i], 1000, 0.7);
                            const path = `report_${eventId}_${Date.now()}_${i}.jpg`;
                            const url = await window.UnityStorage.uploadFile('reports', compressed, path);
                            uploads.push({
                                project_id: eventId,
                                report_id: reportId,
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

                toast(`Report ${isEdit ? 'updated' : 'submitted'} successfully!`, 'success');
                close();
                await this.fetchAndRender();
            } catch (e) {
                toast('Failed to save report: ' + e.message, 'error');
            }
        },

        async viewReport(eventId) {
            try {
                const { data: ev } = await db.from('projects')
                    .select('*, project_reports(*), event_photos(*)')
                    .eq('id', eventId)
                    .single();

                if (!ev) return;
                const report = ev.project_reports?.[0];
                const photos = (ev.event_photos || []).filter(p => p.photo_type === 'action');

                auth.openModal(
                    `<i class="fas fa-file-alt"></i> Report - ${esc(ev.title)}`,
                    `<div style="display:flex;flex-direction:column;gap:14px;">
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:0.82rem;">
                            <div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                                <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Event</div>
                                <div style="font-weight:600;">${esc(ev.title)}</div>
                            </div>
                            <div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                                <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Avenue</div>
                                <div style="font-weight:600;">${cfg.avenues[ev.avenue]}</div>
                            </div>
                            <div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                                <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Date</div>
                                <div style="font-weight:600;">${fDate(ev.event_date)}</div>
                            </div>
                            ${ev.venue ? `
                            <div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                                <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Venue</div>
                                <div style="font-weight:600;">${esc(ev.venue)}</div>
                            </div>` : ''}
                            ${ev.event_chair ? `
                            <div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                                <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Event Chair</div>
                                <div style="font-weight:600;">${esc(ev.event_chair)}</div>
                            </div>` : ''}
                            ${report?.attendance_count ? `
                            <div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                                <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Attendance</div>
                                <div style="font-weight:600;">${report.attendance_count}</div>
                            </div>` : ''}
                            ${report?.beneficiaries_count ? `
                            <div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);">
                                <div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Beneficiaries</div>
                                <div style="font-weight:600;">${report.beneficiaries_count}</div>
                            </div>` : ''}
                        </div>
                        ${report?.report_text ? `
                        <div>
                            <div style="font-size:0.75rem;font-weight:700;color:var(--a-text3);margin-bottom:6px;text-transform:uppercase;">Report Narrative</div>
                            <div style="padding:14px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);font-size:0.84rem;color:var(--a-text2);line-height:1.8;">
                                ${esc(report.report_text)}
                            </div>
                        </div>` : ''}
                        ${photos.length ? `
                        <div>
                            <div style="font-size:0.75rem;font-weight:700;color:var(--a-text3);margin-bottom:8px;text-transform:uppercase;">
                                Action Photographs (${photos.length})
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;">
                                ${photos.map(p => `
                                    <img src="${esc(p.photo_url)}"
                                         style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;border:1px solid var(--a-border);cursor:pointer;"
                                         onclick="document.getElementById('image-preview-overlay').style.display='flex';document.getElementById('image-preview-img').src='${esc(p.photo_url)}';"
                                         onerror="this.style.display='none';">
                                `).join('')}
                            </div>
                        </div>` : ''}
                        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--a-border);">
                            <span class="badge badge-${report?.report_approved ? 'success' : 'warning'}">
                                ${report?.report_approved ? 'Report Approved' : 'Awaiting Approval'}
                            </span>
                            ${report?.created_at ? `<small style="color:var(--a-text3);">Submitted: ${auth.formatTimeAgo(report.created_at)}</small>` : ''}
                        </div>
                    </div>`,
                    null,
                    { wide: true, hideSave: true }
                );
            } catch (e) {
                toast('Could not load report', 'error');
            }
        },

        async approveReport(eventId) {
            auth.openConfirm('Approve Report', 'Approve this event report? Members will be notified with the report.', async () => {
                try {
                    const user = auth.getCurrentUser();
                    await db.from('project_reports').update({
                        report_approved: true,
                        approved_by: user?.id,
                        approved_at: new Date().toISOString()
                    }).eq('project_id', eventId);

                    if (window.AdminMail) await window.AdminMail.sendReportApproved(eventId);

                    toast('Report approved and sent to members!', 'success');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Failed to approve report', 'error');
                }
            }, 'success');
        },

        async downloadEventReport(eventId) {
            if (window.DocxGenerator) {
                toast('Generating report...', 'info');
                await window.DocxGenerator.generateEventReport(eventId);
            } else {
                toast('Document generator not available', 'error');
            }
        },

        // ============================================================
        // MONTHLY REPORT GENERATOR
        // ============================================================
        async generateMonthlyReport() {
            const monthInput = document.getElementById('report-filter-month')?.value;
            if (!monthInput) {
                toast('Please select a month first using the month filter', 'warning');
                return;
            }

            if (window.DocxGenerator) {
                toast('Generating monthly report...', 'info');
                await window.DocxGenerator.generateMonthlyReport(monthInput);
            } else {
                toast('Document generator not available', 'error');
            }
        },

        // ============================================================
        // DPP MONTHLY REPORT
        // ============================================================
        async generateDPPReport() {
            const monthInput = document.getElementById('report-filter-month')?.value;
            if (!monthInput) {
                toast('Please select a month first', 'warning');
                return;
            }

            if (!auth.hasPermission('canDownloadDPP') && !auth.isHighLevel()) {
                toast('You do not have access to DPP reports', 'error');
                return;
            }

            if (window.DocxGenerator) {
                toast('Generating DPP report...', 'info');
                await window.DocxGenerator.generateDPPMonthlyReport(monthInput);
            } else {
                toast('Document generator not available', 'error');
            }
        }
    };

    // Button listeners
    document.getElementById('gen-monthly-report-btn')?.addEventListener('click', () => {
        AdminReports.generateMonthlyReport();
    });

    document.getElementById('gen-dpp-report-btn')?.addEventListener('click', () => {
        AdminReports.generateDPPReport();
    });

    console.log('%c Reports.js loaded ', 'background:#10b981;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

})();