/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - ADMIN PANEL LOGIC
   Complete CRUD | Super Admin Powers | Bug-Free
   ============================================================ */

const AdminPanel = {
    editingId: null,
    currentPhotos: [],
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindAllEvents();
    },

    bindAllEvents() {
        this.bindEventForm();
        this.bindReportForm();
        this.bindMemberForm();
        this.bindTrainerForm();
        this.bindLeaderForm();
        this.bindGenericForms();
        this.bindComposeMail();
        this.bindAdminUserForm();
    },

    // ============================================================
    // EVENTS MANAGEMENT
    // ============================================================
    async loadEvents() {
        const tbody = document.getElementById('eventsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7"><div class="inline-loader">Loading projects...</div></td></tr>';

        try {
            const { data, error } = await supabaseAdmin.from('events').select('*').order('event_date', { ascending: false });
            if (error) throw error;

            const userPerms = Auth.userPermissions;
            let filteredData = data || [];

            if (userPerms.avenue && !userPerms.all && Auth.accessLevel < 75) {
                filteredData = filteredData.filter(e => e.avenue === userPerms.avenue);
            }

            if (filteredData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="empty-table"><i data-feather="calendar"></i><p>No projects yet</p></div></td></tr>';
                this.refreshIcons();
                return;
            }

            tbody.innerHTML = filteredData.map(e => `
                <tr>
                    <td><strong>${App.esc(e.event_name)}</strong>${e.is_dpp ? '<br><small style="color: var(--warning);">DPP</small>' : ''}</td>
                    <td><span class="avenue-badge avenue-${e.avenue}">${App.avenueLabel(e.avenue)}</span></td>
                    <td>${App.formatDate(e.event_date)}</td>
                    <td>${App.formatTime(e.event_time)}</td>
                    <td><span class="status-badge ${e.is_approved ? 'status-approved' : 'status-pending'}">${e.is_approved ? 'Approved' : 'Pending'}</span></td>
                    <td>${e.report_submitted ? '<span class="status-badge status-completed">Submitted</span>' : '<span class="status-badge status-pending">Pending</span>'}</td>
                    <td><div class="table-actions">
                        <button class="table-action-btn view" onclick="AdminPanel.viewEvent('${e.id}')" title="View"><i data-feather="eye"></i></button>
                        <button class="table-action-btn edit" onclick="AdminPanel.editEvent('${e.id}')" title="Edit"><i data-feather="edit-2"></i></button>
                        ${!e.is_approved && Auth.canApproveProjects() ? `<button class="table-action-btn approve" onclick="AdminPanel.approveEvent('${e.id}')" title="Approve"><i data-feather="check"></i></button>` : ''}
                        ${!e.report_submitted && new Date(e.event_date) <= new Date() ? `<button class="table-action-btn download" onclick="AdminPanel.openReportForm('${e.id}')" title="Report"><i data-feather="file-text"></i></button>` : ''}
                        ${e.report_submitted ? `<button class="table-action-btn download" onclick="Reports.downloadEventReport('${e.id}')" title="Download"><i data-feather="download"></i></button>` : ''}
                        <button class="table-action-btn delete" onclick="AdminPanel.deleteEvent('${e.id}')" title="Delete"><i data-feather="trash-2"></i></button>
                    </div></td>
                </tr>
            `).join('');
            this.refreshIcons();
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-table"><p>Error loading</p></div></td></tr>';
        }
    },

    bindEventForm() {
        this.bindBtn('addEventBtn', () => this.openEventForm());
        this.bindClose('eventFormClose', 'eventFormModal');
        this.bindForm('eventForm', (e) => this.saveEvent(e));

        const avenueSelect = document.getElementById('eventAvenueSelect');
        if (avenueSelect) {
            avenueSelect.addEventListener('change', () => {
                const dpp = document.getElementById('dppFields');
                if (dpp) dpp.classList.toggle('hidden', avenueSelect.value !== 'dpp');
            });
        }

        this.bindFilePreview('eventPosterInput', 'eventPosterPreview');

        const filterAvenue = document.getElementById('eventFilterAvenue');
        const filterStatus = document.getElementById('eventFilterStatus');
        const search = document.getElementById('eventSearch');
        if (filterAvenue) filterAvenue.addEventListener('change', () => this.filterEvents());
        if (filterStatus) filterStatus.addEventListener('change', () => this.filterEvents());
        if (search) search.addEventListener('input', App.debounce(() => this.filterEvents(), 300));
    },

    filterEvents() {
        const avenue = document.getElementById('eventFilterAvenue')?.value;
        const status = document.getElementById('eventFilterStatus')?.value;
        const search = document.getElementById('eventSearch')?.value.toLowerCase();

        document.querySelectorAll('#eventsTableBody tr').forEach(row => {
            const text = row.textContent.toLowerCase();
            const matchSearch = !search || text.includes(search);
            const matchAvenue = !avenue || row.innerHTML.includes(`avenue-${avenue}`);
            let matchStatus = true;
            if (status === 'approved') matchStatus = row.innerHTML.includes('status-approved');
            else if (status === 'pending') matchStatus = row.innerHTML.includes('status-pending');
            row.style.display = (matchSearch && matchAvenue && matchStatus) ? '' : 'none';
        });
    },

    openEventForm(data = null) {
        const modal = document.getElementById('eventFormModal');
        const form = document.getElementById('eventForm');
        const preview = document.getElementById('eventPosterPreview');
        if (!modal || !form) return;

        form.reset();
        if (preview) preview.classList.add('hidden');
        this.editingId = null;

        if (data) {
            this.editingId = data.id;
            document.getElementById('eventFormTitle').textContent = 'Edit Project';
            document.getElementById('eventFormId').value = data.id;
            this.populateForm(form, data);
            if (data.poster_url && preview) {
                preview.src = data.poster_url;
                preview.classList.remove('hidden');
            }
            const dpp = document.getElementById('dppFields');
            if (dpp) dpp.classList.toggle('hidden', data.avenue !== 'dpp');
        } else {
            document.getElementById('eventFormTitle').textContent = 'Add Project';
        }

        this.showModal(modal);
    },

    async editEvent(id) {
        const { data } = await supabaseAdmin.from('events').select('*').eq('id', id).single();
        if (data) this.openEventForm(data);
    },

    async saveEvent(e) {
        e.preventDefault();
        const form = e.target;
        const btn = this.disableSubmit(form);

        try {
            const fd = new FormData(form);
            const poster = fd.get('poster');

            const payload = {
                event_name: fd.get('event_name'),
                description: fd.get('description'),
                avenue: fd.get('avenue'),
                event_date: fd.get('event_date'),
                event_time: fd.get('event_time'),
                end_time: fd.get('end_time') || null,
                venue: fd.get('venue'),
                event_chair: fd.get('event_chair'),
                event_secretary: fd.get('event_secretary'),
                group_number: fd.get('group_number'),
                collaboration_type: fd.get('collaboration_type') || null,
                collaborator_name: fd.get('collaborator_name'),
                proposed_by: fd.get('proposed_by'),
                seconded_by: fd.get('seconded_by'),
                is_dpp: fd.get('avenue') === 'dpp',
                dpp_project_number: fd.get('dpp_project_number'),
                dpp_pillar: fd.get('dpp_pillar'),
                dpp_category: fd.get('dpp_category'),
                created_by: Auth.currentUser?.id
            };

            if (poster && poster.size > 0) {
                const upload = await App.uploadToCloudinary(poster, 'events');
                payload.poster_url = upload.secure_url;
                payload.poster_public_id = upload.public_id;
            }

            if (this.editingId) {
                await supabaseAdmin.from('events').update(payload).eq('id', this.editingId);
            } else {
                await supabaseAdmin.from('events').insert(payload);
            }

            App.toast(this.editingId ? 'Project updated' : 'Project created', 'success');
            this.hideModal('eventFormModal');
            this.loadEvents();
        } catch (err) {
            App.toast('Failed: ' + err.message, 'error');
        } finally {
            this.enableSubmit(form, btn);
        }
    },

    async approveEvent(id) {
        App.confirm('Approve this project? Members will be notified via email with the poster.', async () => {
            try {
                const { data: event } = await supabaseAdmin.from('events').select('*').eq('id', id).single();
                await supabaseAdmin.from('events').update({
                    is_approved: true,
                    approved_by: Auth.currentUser.id,
                    approved_at: new Date().toISOString(),
                    status: 'approved'
                }).eq('id', id);

                App.toast('Project approved', 'success');
                this.loadEvents();

                if (typeof Mail !== 'undefined' && Mail.sendEventNotification) {
                    Mail.sendEventNotification(event);
                    App.toast('Notification sent to members', 'info');
                }
            } catch { App.toast('Failed', 'error'); }
        });
    },

    async deleteEvent(id) {
        App.confirm('Delete this project?', async () => {
            await supabaseAdmin.from('event_photos').delete().eq('event_id', id);
            await supabaseAdmin.from('events').delete().eq('id', id);
            App.toast('Deleted', 'success');
            this.loadEvents();
        });
    },

    viewEvent(id) { App.showEventDetails(id); },

    // ============================================================
    // REPORT FORM
    // ============================================================
    bindReportForm() {
        this.bindClose('reportFormClose', 'reportFormModal');
        this.bindForm('reportForm', (e) => this.saveReport(e));

        const photosInput = document.getElementById('reportPhotosInput');
        if (photosInput) photosInput.addEventListener('change', (e) => this.previewMultiPhotos(e, 'reportPhotosPreview', 3));

        this.bindBtn('downloadMonthlyReport', () => this.openMonthlyReportModal());
        this.bindClose('monthlyReportClose', 'monthlyReportModal');

        const monthlyForm = document.getElementById('monthlyReportForm');
        if (monthlyForm) {
            monthlyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const month = document.getElementById('monthlyReportMonth').value;
                const type = document.getElementById('monthlyReportType').value;
                if (typeof Reports !== 'undefined') Reports.downloadMonthlyReport(month, type);
                document.getElementById('monthlyReportModal').classList.add('hidden');
            });
        }

        this.bindBtn('downloadDPPReport', () => {
            this.openMonthlyReportModal();
            const s = document.getElementById('monthlyReportType');
            if (s) s.value = 'dpp';
        });
    },

    openMonthlyReportModal() {
        const modal = document.getElementById('monthlyReportModal');
        if (modal) {
            const now = new Date();
            const input = document.getElementById('monthlyReportMonth');
            if (input) input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            modal.classList.remove('hidden');
        }
    },

    previewMultiPhotos(e, previewId, max = 5) {
        const files = Array.from(e.target.files).slice(0, max);
        const preview = document.getElementById(previewId);
        if (!preview) return;
        this.currentPhotos = files;
        preview.innerHTML = '';

        files.forEach((file, idx) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const div = document.createElement('div');
                div.className = 'photo-preview-item';
                div.innerHTML = `<img src="${ev.target.result}" alt="Preview"><button type="button" class="photo-preview-remove" onclick="AdminPanel.removePhotoPreview(${idx}, '${previewId}')"><i data-feather="x"></i></button>`;
                preview.appendChild(div);
                this.refreshIcons();
            };
            reader.readAsDataURL(file);
        });
    },

    removePhotoPreview(idx, previewId) {
        this.currentPhotos.splice(idx, 1);
        const items = document.querySelectorAll(`#${previewId} .photo-preview-item`);
        if (items[idx]) items[idx].remove();
    },

    async openReportForm(eventId) {
        try {
            const { data: event } = await supabaseAdmin.from('events').select('*').eq('id', eventId).single();
            if (!event) return;

            const form = document.getElementById('reportForm');
            form.reset();
            this.currentPhotos = [];
            document.getElementById('reportEventId').value = eventId;
            document.getElementById('reportPhotosPreview').innerHTML = '';

            const info = document.getElementById('reportEventInfo');
            if (info) {
                info.innerHTML = `<h4>${App.esc(event.event_name)}</h4>
                <div class="report-event-info-grid">
                    <div class="report-event-info-item"><strong>Date</strong><span>${App.formatDate(event.event_date)}</span></div>
                    <div class="report-event-info-item"><strong>Time</strong><span>${App.formatTime(event.event_time)}</span></div>
                    <div class="report-event-info-item"><strong>Venue</strong><span>${App.esc(event.venue || 'N/A')}</span></div>
                    <div class="report-event-info-item"><strong>Avenue</strong><span>${App.avenueLabel(event.avenue)}</span></div>
                </div>`;
            }

            this.showModal(document.getElementById('reportFormModal'));
        } catch { App.toast('Failed', 'error'); }
    },

    async saveReport(e) {
        e.preventDefault();
        const form = e.target;
        const btn = this.disableSubmit(form);

        try {
            const fd = new FormData(form);
            const eventId = fd.get('event_id');

            await supabaseAdmin.from('events').update({
                report_submitted: true,
                report_text: fd.get('report_text'),
                report_submitted_by: Auth.currentUser.id,
                report_submitted_at: new Date().toISOString(),
                status: 'completed'
            }).eq('id', eventId);

            for (const photo of this.currentPhotos) {
                try {
                    const upload = await App.uploadToCloudinary(photo, 'reports');
                    await supabaseAdmin.from('event_photos').insert({
                        event_id: eventId,
                        photo_url: upload.secure_url,
                        cloudinary_public_id: upload.public_id,
                        photo_type: 'action'
                    });
                } catch (upErr) { console.error(upErr); }
            }

            App.toast('Report submitted', 'success');
            this.hideModal('reportFormModal');
            this.loadEvents();
        } catch (err) {
            App.toast('Failed: ' + err.message, 'error');
        } finally {
            this.enableSubmit(form, btn);
        }
    },

    async loadReports() {
        const tbody = document.getElementById('reportsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6"><div class="inline-loader">Loading...</div></td></tr>';

        try {
            const { data } = await supabaseAdmin.from('events').select('*')
                .lte('event_date', new Date().toISOString().split('T')[0])
                .order('event_date', { ascending: false });

            if (!data || !data.length) {
                tbody.innerHTML = '<tr><td colspan="6"><div class="empty-table"><i data-feather="file-text"></i><p>No reports</p></div></td></tr>';
                this.refreshIcons(); return;
            }

            tbody.innerHTML = data.map(e => `<tr>
                <td><strong>${App.esc(e.event_name)}</strong></td>
                <td><span class="avenue-badge avenue-${e.avenue}">${App.avenueLabel(e.avenue)}</span></td>
                <td>${App.formatDate(e.event_date)}</td>
                <td><span class="status-badge ${e.report_submitted ? 'status-completed' : 'status-pending'}">${e.report_submitted ? 'Submitted' : 'Pending'}</span></td>
                <td><span class="status-badge ${e.is_approved ? 'status-approved' : 'status-pending'}">${e.is_approved ? 'Approved' : 'Pending'}</span></td>
                <td><div class="table-actions">
                    ${!e.report_submitted ? `<button class="table-action-btn edit" onclick="AdminPanel.openReportForm('${e.id}')"><i data-feather="edit"></i></button>` :
                    `<button class="table-action-btn download" onclick="Reports.downloadEventReport('${e.id}')"><i data-feather="download"></i></button>`}
                </div></td>
            </tr>`).join('');
            this.refreshIcons();
        } catch { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-table"><p>Error</p></div></td></tr>'; }
    },

    // ============================================================
    // CLUB MEMBERS - Public display members (NOT admin users)
    // ============================================================
    async loadMembersAdmin() {
        const tbody = document.getElementById('membersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="9"><div class="inline-loader">Loading club members...</div></td></tr>';

        try {
            const { data, error } = await supabaseAdmin.from('club_members').select('*')
                .order('is_board_member', { ascending: false })
                .order('sort_order')
                .order('full_name');

            if (error) {
                console.error(error);
                tbody.innerHTML = `<tr><td colspan="9"><div class="empty-table"><p>Error: ${error.message}</p></div></td></tr>`;
                return;
            }

            if (!data || !data.length) {
                tbody.innerHTML = '<tr><td colspan="9"><div class="empty-table"><i data-feather="users"></i><p>No club members yet. Click "Add Member" to add.</p></div></td></tr>';
                this.refreshIcons();
                return;
            }

            tbody.innerHTML = data.map(m => `
                <tr>
                    <td>${m.photo_url
                        ? `<img src="${m.photo_url}" class="table-photo" alt="${App.esc(m.full_name)}">`
                        : `<div class="table-photo" style="background: linear-gradient(135deg,#1a56db,#06b6d4); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">${m.full_name.charAt(0)}</div>`
                    }</td>
                    <td><strong>${App.esc(m.full_name)}</strong>${m.is_board_member ? '<br><small style="color: var(--primary); font-weight: 600;">Board</small>' : ''}</td>
                    <td>${App.esc(m.portfolio || 'Member')}</td>
                    <td>${App.esc(m.ri_id || '-')}</td>
                    <td><span style="font-size: 0.82rem;">${App.esc(m.email || '-')}</span></td>
                    <td>${App.esc(m.phone || '-')}</td>
                    <td>${m.blood_group ? `<span class="status-badge" style="background: var(--gradient-danger); color: white; border: none;">${m.blood_group}</span>` : '-'}</td>
                    <td><span class="status-badge status-${m.is_active ? 'active' : 'inactive'}">${m.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td><div class="table-actions">
                        <button class="table-action-btn edit" onclick="AdminPanel.editMember('${m.id}')" title="Edit"><i data-feather="edit-2"></i></button>
                        <button class="table-action-btn delete" onclick="AdminPanel.deleteMember('${m.id}')" title="Delete"><i data-feather="trash-2"></i></button>
                    </div></td>
                </tr>
            `).join('');
            this.refreshIcons();
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="9"><div class="empty-table"><p>Error loading</p></div></td></tr>';
        }
    },

    bindMemberForm() {
        this.bindBtn('addMemberBtn', () => this.openMemberForm());
        this.bindClose('memberFormClose', 'memberFormModal');
        this.bindForm('memberForm', (e) => this.saveMember(e));
        this.bindFilePreview('memberPhotoInputAdmin', 'memberPhotoPreviewAdmin');
    },

    openMemberForm(data = null) {
        const form = document.getElementById('memberForm');
        const preview = document.getElementById('memberPhotoPreviewAdmin');
        form.reset();
        if (preview) preview.classList.add('hidden');
        this.editingId = null;

        // Hide password and role fields for club members (not needed)
        const passwordField = form.querySelector('[name="password"]');
        if (passwordField && passwordField.closest('.form-group')) {
            passwordField.closest('.form-group').style.display = 'none';
        }
        const roleField = document.getElementById('memberRoleSelect');
        if (roleField && roleField.closest('.form-group')) {
            roleField.closest('.form-group').style.display = 'none';
        }

        if (data) {
            this.editingId = data.id;
            document.getElementById('memberFormTitle').textContent = 'Edit Club Member';
            document.getElementById('memberFormId').value = data.id;
            this.populateForm(form, data, ['password']);
            if (data.photo_url && preview) {
                preview.src = data.photo_url;
                preview.classList.remove('hidden');
            }
        } else {
            document.getElementById('memberFormTitle').textContent = 'Add Club Member';
        }

        this.showModal(document.getElementById('memberFormModal'));
    },

    async editMember(id) {
        try {
            const { data } = await supabaseAdmin.from('club_members').select('*').eq('id', id).single();
            if (data) this.openMemberForm(data);
        } catch { App.toast('Failed to load', 'error'); }
    },

    async saveMember(e) {
        e.preventDefault();
        const form = e.target;
        const btn = this.disableSubmit(form);

        try {
            const fd = new FormData(form);
            const photo = fd.get('photo');

            const payload = {
                full_name: fd.get('full_name'),
                email: fd.get('email') || null,
                phone: fd.get('phone') || null,
                portfolio: fd.get('portfolio') || 'Member',
                ri_id: fd.get('ri_id') || null,
                blood_group: fd.get('blood_group') || null,
                date_of_birth: fd.get('date_of_birth') || null,
                is_board_member: fd.get('is_board_member') === 'true',
                is_active: true
            };

            if (photo && photo.size > 0) {
                const upload = await App.uploadToCloudinary(photo, 'members');
                payload.photo_url = upload.secure_url;
                payload.photo_public_id = upload.public_id;
            }

            if (this.editingId) {
                await supabaseAdmin.from('club_members').update(payload).eq('id', this.editingId);
            } else {
                await supabaseAdmin.from('club_members').insert(payload);
            }

            App.toast(this.editingId ? 'Member updated' : 'Member added', 'success');
            this.hideModal('memberFormModal');
            this.loadMembersAdmin();
            if (App.loadMembers) App.loadMembers();
        } catch (err) {
            App.toast('Failed: ' + err.message, 'error');
        } finally {
            this.enableSubmit(form, btn);
        }
    },

    async deleteMember(id) {
        App.confirm('Delete this club member?', async () => {
            await supabaseAdmin.from('club_members').delete().eq('id', id);
            App.toast('Deleted', 'success');
            this.loadMembersAdmin();
            if (App.loadMembers) App.loadMembers();
        });
    },

    // ============================================================
    // ROLES & ADMIN USERS - SUPER ADMIN ONLY
    // ============================================================
    async loadRoles() {
        const isSuperAdmin = Auth.currentUser?.role === 'super_admin' || Auth.currentUser?.role === 'advisor';

        const tbody = document.getElementById('rolesTableBody');
        const userTbody = document.getElementById('userAccessTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5"><div class="inline-loader">Loading roles...</div></td></tr>';

        try {
            const { data: roles, error } = await supabaseAdmin.from('roles_config').select('*').order('access_level', { ascending: false });
            if (error) throw error;

            if (!roles || !roles.length) {
                tbody.innerHTML = '<tr><td colspan="5"><div class="empty-table"><p>No roles configured</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = roles.map(r => `<tr>
                <td><code style="padding:2px 8px;background:rgba(26,86,219,0.08);border-radius:4px;font-size:0.8rem;">${App.esc(r.role_name)}</code></td>
                <td><strong>${App.esc(r.display_name)}</strong></td>
                <td><span class="status-badge status-scheduled">${r.access_level}</span></td>
                <td style="text-align:center;">${r.is_board ? '<span style="color:var(--success);font-weight:700;">Yes</span>' : '<span style="color:var(--text-muted);">No</span>'}</td>
                <td><div class="permissions-list">${Object.keys(r.permissions || {}).slice(0, 4).map(p => `<span class="permission-tag">${App.esc(p)}</span>`).join('')}</div></td>
            </tr>`).join('');

            if (userTbody) {
                userTbody.innerHTML = '<tr><td colspan="6"><div class="inline-loader">Loading admin users...</div></td></tr>';

                const { data: users } = await supabaseAdmin.from('users').select('*').order('role').order('full_name');

                const addBtn = document.getElementById('addAdminUserBtn');
                if (addBtn) addBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';

                if (!users || !users.length) {
                    userTbody.innerHTML = `<tr><td colspan="6"><div class="empty-table">
                        <i data-feather="users"></i>
                        <p>No admin users yet.</p>
                        ${isSuperAdmin ? '<p style="font-size:0.85rem;margin-top:0.5rem;">Click "Add Admin User" button to create the first admin user.</p>' : '<p style="font-size:0.85rem;margin-top:0.5rem;">Only Super Admin can add admin users.</p>'}
                    </div></td></tr>`;
                    this.refreshIcons();
                    return;
                }

                // Group users by category
                const superAdmins = users.filter(u => u.role === 'super_admin' || u.role === 'advisor');
                const leadership = users.filter(u => ['president', 'ipp', 'vice_president'].includes(u.role));
                const secretaries = users.filter(u => ['secretary_admin', 'secretary_comm', 'secretary'].includes(u.role));
                const treasurer = users.filter(u => u.role === 'treasurer');
                const chairs = users.filter(u => ['dpp_chair', 'blood_donor_chair', 'membership_chair', 'trf_chair', 'public_image', 'club_editor'].includes(u.role));
                const directors = users.filter(u => u.role.includes('_dir'));
                const contacts = users.filter(u => ['young_leaders', 'rotaract_rotary_corps_advisor'].includes(u.role));
                const others = users.filter(u => !['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary_admin', 'secretary_comm', 'secretary', 'treasurer', 'dpp_chair', 'blood_donor_chair', 'membership_chair', 'trf_chair', 'public_image', 'club_editor', 'young_leaders', 'rotaract_rotary_corps_advisor'].includes(u.role) && !u.role.includes('_dir'));

                const groups = [
                    { label: 'Super Admins', icon: 'shield', users: superAdmins, color: '#dc2626' },
                    { label: 'Leadership', icon: 'star', users: leadership, color: '#f59e0b' },
                    { label: 'Secretaries', icon: 'edit-3', users: secretaries, color: '#0891b2' },
                    { label: 'Treasurer', icon: 'dollar-sign', users: treasurer, color: '#16a34a' },
                    { label: 'Chairs', icon: 'award', users: chairs, color: '#7c3aed' },
                    { label: 'Avenue Directors', icon: 'compass', users: directors, color: '#2563eb' },
                    { label: 'Advisors & Contacts', icon: 'user-check', users: contacts, color: '#0f172a' },
                    { label: 'Others', icon: 'users', users: others, color: '#64748b' }
                ];

                let html = '';
                groups.forEach(group => {
                    if (group.users.length === 0) return;
                    html += `<tr style="background:${group.color}15;"><td colspan="6" style="padding:0.85rem 1rem;font-weight:700;color:${group.color};font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${group.color}30;">${group.label} (${group.users.length})</td></tr>`;

                    group.users.forEach(u => {
                        const roleObj = roles.find(r => r.role_name === u.role);
                        const canEdit = isSuperAdmin;
                        const isCurrentUser = u.id === Auth.currentUser?.id;

                        html += `<tr>
                            <td>
                                <div style="display:flex;align-items:center;gap:0.75rem;">
                                    <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1a56db,#06b6d4);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0;">${u.full_name.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <strong>${App.esc(u.full_name)}</strong>
                                        ${isCurrentUser ? '<br><small style="color:var(--primary);font-weight:600;">You</small>' : ''}
                                        ${u.portfolio ? `<br><small style="color:var(--text-muted);">${App.esc(u.portfolio)}</small>` : ''}
                                    </div>
                                </div>
                            </td>
                            <td><span style="font-size:0.82rem;">${App.esc(u.email)}</span></td>
                            <td><span class="permission-tag">${App.esc(roleObj?.display_name || u.role)}</span></td>
                            <td>
                                ${canEdit ? `
                                    <select class="inline-role-select" data-user-id="${u.id}" ${isCurrentUser && u.role === 'super_admin' ? 'disabled title="Cannot change own super admin role"' : ''}>
                                        ${roles.map(r => `<option value="${r.role_name}" ${r.role_name === u.role ? 'selected' : ''}>${r.display_name}</option>`).join('')}
                                    </select>
                                ` : `<span style="font-size:0.85rem;color:var(--text-muted);">Level ${roleObj?.access_level || 0}</span>`}
                            </td>
                            <td>
                                ${canEdit && !isCurrentUser ? `
                                    <label class="toggle-switch">
                                        <input type="checkbox" ${u.is_active ? 'checked' : ''} onchange="AdminPanel.toggleUserActive('${u.id}', this.checked)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                ` : `<span class="status-badge status-${u.is_active ? 'active' : 'inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span>`}
                            </td>
                            <td>
                                ${canEdit ? `
                                    <div class="table-actions">
                                        ${!isCurrentUser || u.role !== 'super_admin' ? `<button class="table-action-btn approve" onclick="AdminPanel.saveUserRole('${u.id}')" title="Save Role"><i data-feather="save"></i></button>` : ''}
                                        <button class="table-action-btn edit" onclick="AdminPanel.editAdminUser('${u.id}')" title="Edit"><i data-feather="edit-2"></i></button>
                                        ${!isCurrentUser ? `<button class="table-action-btn delete" onclick="AdminPanel.deleteAdminUser('${u.id}')" title="Delete"><i data-feather="trash-2"></i></button>` : ''}
                                    </div>
                                ` : `<span style="color:var(--text-muted);font-size:0.8rem;">Read Only</span>`}
                            </td>
                        </tr>`;
                    });
                });

                userTbody.innerHTML = html;
            }

            this.refreshIcons();
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="5"><div class="empty-table"><p>Error: ' + err.message + '</p></div></td></tr>';
        }
    },

    // ============================================================
    // ADMIN USER FORM
    // ============================================================
    bindAdminUserForm() {
        const addBtn = document.getElementById('addAdminUserBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (Auth.currentUser?.role !== 'super_admin' && Auth.currentUser?.role !== 'advisor') {
                    App.toast('Only Super Admin can add admin users', 'warning');
                    return;
                }
                this.openAdminUserForm();
            });
        }
    },

    async openAdminUserForm(data = null) {
        if (Auth.currentUser?.role !== 'super_admin' && Auth.currentUser?.role !== 'advisor') {
            App.toast('Only Super Admin can manage admin users', 'error');
            return;
        }

        if (!document.getElementById('adminUserFormModal')) {
            this.createAdminUserModal();
        }

        const roleSelect = document.getElementById('adminUserRoleSelect');
        if (roleSelect) {
            const { data: roles } = await supabaseAdmin.from('roles_config').select('*').order('access_level', { ascending: false });

            const groupedRoles = {
                'Super Admin Level (100)': roles.filter(r => r.access_level === 100),
                'Leadership (85-95)': roles.filter(r => r.access_level >= 85 && r.access_level < 100),
                'Secretaries (80)': roles.filter(r => r.access_level === 80),
                'Treasurer (75)': roles.filter(r => r.access_level === 75),
                'DPP Chair (65)': roles.filter(r => r.access_level === 65),
                'Avenue Directors (60)': roles.filter(r => r.access_level === 60),
                'Chairs (55)': roles.filter(r => r.access_level === 55),
                'Contacts & Advisors (50)': roles.filter(r => r.access_level === 50),
                'Board & Member': roles.filter(r => r.access_level < 50)
            };

            let optionsHtml = '';
            Object.keys(groupedRoles).forEach(group => {
                if (groupedRoles[group].length > 0) {
                    optionsHtml += `<optgroup label="${group}">`;
                    groupedRoles[group].forEach(r => {
                        optionsHtml += `<option value="${r.role_name}">${r.display_name}</option>`;
                    });
                    optionsHtml += `</optgroup>`;
                }
            });

            roleSelect.innerHTML = optionsHtml;
        }

        const form = document.getElementById('adminUserForm');
        form.reset();
        this.editingId = null;

        if (data) {
            this.editingId = data.id;
            document.getElementById('adminUserFormTitle').innerHTML = '<i data-feather="edit-2"></i> Edit Admin User';
            document.getElementById('adminUserFormId').value = data.id;
            this.populateForm(form, data, ['password']);
            const pwField = form.querySelector('[name="password"]');
            if (pwField) {
                pwField.placeholder = 'Leave blank to keep current password';
                pwField.required = false;
            }
        } else {
            document.getElementById('adminUserFormTitle').innerHTML = '<i data-feather="user-plus"></i> Add New Admin User';
            const pwField = form.querySelector('[name="password"]');
            if (pwField) {
                pwField.placeholder = 'Required - Minimum 6 characters';
                pwField.required = true;
            }
        }

        this.showModal(document.getElementById('adminUserFormModal'));
    },

    createAdminUserModal() {
        const modal = document.createElement('div');
        modal.id = 'adminUserFormModal';
        modal.className = 'admin-modal hidden';
        modal.setAttribute('role', 'dialog');
        modal.innerHTML = `
            <div class="admin-modal-content glass-card">
                <div class="admin-modal-header">
                    <h3 id="adminUserFormTitle"><i data-feather="user-plus"></i> Add New Admin User</h3>
                    <button class="modal-close" onclick="AdminPanel.hideModal('adminUserFormModal')"><i data-feather="x"></i></button>
                </div>
                <form id="adminUserForm" class="form-modern" novalidate>
                    <input type="hidden" name="id" id="adminUserFormId">

                    <div style="padding:1rem;background:linear-gradient(135deg,rgba(26,86,219,0.08),rgba(6,182,212,0.08));border:1px solid rgba(26,86,219,0.2);border-radius:12px;margin-bottom:1rem;">
                        <p style="font-size:0.85rem;color:var(--text-primary);margin:0;display:flex;align-items:center;gap:0.5rem;">
                            <i data-feather="shield" style="color:var(--primary);"></i>
                            <span><strong>Super Admin Only:</strong> This user will have admin panel access based on assigned role.</span>
                        </p>
                    </div>

                    <div class="form-group">
                        <label>Full Name <span style="color:var(--danger);">*</span></label>
                        <input type="text" name="full_name" required placeholder="Enter full name">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Email <span style="color:var(--danger);">*</span></label>
                            <input type="email" name="email" required placeholder="user@example.com">
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" name="phone" placeholder="Phone number">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Password <span style="color:var(--danger);">*</span></label>
                        <input type="password" name="password" placeholder="Required for new users">
                        <small style="color:var(--text-muted);font-size:0.75rem;">User will login with email and this password</small>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Portfolio / Designation</label>
                            <input type="text" name="portfolio" placeholder="e.g., President, Treasurer">
                        </div>
                        <div class="form-group">
                            <label>RI ID</label>
                            <input type="text" name="ri_id" placeholder="Rotary International ID">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Role & Access Level <span style="color:var(--danger);">*</span></label>
                        <select id="adminUserRoleSelect" name="role" required></select>
                        <small style="color:var(--text-muted);font-size:0.75rem;">Higher access level = more permissions</small>
                    </div>

                    <div style="padding:0.85rem;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;">
                        <p style="font-size:0.82rem;color:var(--text-primary);margin:0;display:flex;align-items:flex-start;gap:0.5rem;">
                            <i data-feather="alert-triangle" style="color:var(--warning);flex-shrink:0;margin-top:2px;"></i>
                            <span><strong>Note:</strong> This creates an admin panel access account. For public member display, use "Members Management" instead.</span>
                        </p>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block">
                        <i data-feather="save"></i>Save Admin User
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        const form = document.getElementById('adminUserForm');
        form.addEventListener('submit', (e) => this.saveAdminUser(e));

        this.refreshIcons();
    },

    async saveAdminUser(e) {
        e.preventDefault();

        if (Auth.currentUser?.role !== 'super_admin' && Auth.currentUser?.role !== 'advisor') {
            App.toast('Only Super Admin can save admin users', 'error');
            return;
        }

        const form = e.target;
        const btn = this.disableSubmit(form);

        try {
            const fd = new FormData(form);
            const password = fd.get('password');

            const payload = {
                full_name: fd.get('full_name'),
                email: fd.get('email'),
                phone: fd.get('phone') || null,
                portfolio: fd.get('portfolio') || 'Member',
                ri_id: fd.get('ri_id') || null,
                role: fd.get('role')
            };

            if (this.editingId) {
                if (password && password.length > 0) {
                    if (password.length < 6) {
                        App.toast('Password must be at least 6 characters', 'warning');
                        this.enableSubmit(form, btn);
                        return;
                    }
                    try {
                        await supabaseAdmin.rpc('update_user_password', {
                            p_user_id: this.editingId,
                            p_password: password
                        });
                    } catch (pwErr) { console.error(pwErr); }
                }

                await supabaseAdmin.from('users').update({
                    full_name: payload.full_name,
                    email: payload.email,
                    phone: payload.phone,
                    portfolio: payload.portfolio,
                    ri_id: payload.ri_id,
                    role: payload.role,
                    is_board_member: true,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }).eq('id', this.editingId);

                App.toast('Admin user updated successfully', 'success');
                App.logActivity('admin_user_updated', { user_id: this.editingId, role: payload.role });
            } else {
                if (!password || password.length < 6) {
                    App.toast('Password is required (minimum 6 characters)', 'warning');
                    this.enableSubmit(form, btn);
                    return;
                }

                let created = false;
                try {
                    const { data, error } = await supabaseAdmin.rpc('create_admin_user', {
                        p_email: payload.email,
                        p_password: password,
                        p_full_name: payload.full_name,
                        p_portfolio: payload.portfolio,
                        p_role: payload.role,
                        p_phone: payload.phone,
                        p_ri_id: payload.ri_id
                    });

                    if (error) throw error;

                    if (data && data[0]) {
                        if (!data[0].success) throw new Error(data[0].message);
                        created = true;
                    }
                } catch (rpcErr) {
                    console.warn('RPC failed, trying fallback:', rpcErr);
                    try {
                        await supabaseAdmin.rpc('create_user_with_password', {
                            p_email: payload.email,
                            p_password: password,
                            p_full_name: payload.full_name,
                            p_portfolio: payload.portfolio,
                            p_role: payload.role,
                            p_phone: payload.phone,
                            p_ri_id: payload.ri_id,
                            p_blood_group: null,
                            p_date_of_birth: null,
                            p_photo_url: null,
                            p_is_board_member: true
                        });
                        created = true;
                    } catch (fbErr) {
                        throw new Error('Failed to create user: ' + (rpcErr.message || fbErr.message));
                    }
                }

                if (created) {
                    App.toast('Admin user created successfully! They can now login.', 'success');
                    App.logActivity('admin_user_created', { email: payload.email, role: payload.role });
                }
            }

            this.hideModal('adminUserFormModal');
            form.reset();
            this.loadRoles();
        } catch (err) {
            console.error(err);
            App.toast('Failed: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            this.enableSubmit(form, btn);
        }
    },

    async editAdminUser(id) {
        if (Auth.currentUser?.role !== 'super_admin' && Auth.currentUser?.role !== 'advisor') {
            App.toast('Only Super Admin can edit admin users', 'error');
            return;
        }

        try {
            const { data } = await supabaseAdmin.from('users').select('*').eq('id', id).single();
            if (data) this.openAdminUserForm(data);
        } catch { App.toast('Failed to load user', 'error'); }
    },

    async deleteAdminUser(id) {
        if (Auth.currentUser?.role !== 'super_admin' && Auth.currentUser?.role !== 'advisor') {
            App.toast('Only Super Admin can delete admin users', 'error');
            return;
        }

        if (id === Auth.currentUser?.id) {
            App.toast('You cannot delete your own account', 'warning');
            return;
        }

        try {
            const { data: user } = await supabaseAdmin.from('users').select('full_name, email, role').eq('id', id).single();

            App.confirm(
                `Delete admin user "${user?.full_name || 'this user'}"? They will lose all access. This cannot be undone.`,
                async () => {
                    try {
                        await supabaseAdmin.from('users').delete().eq('id', id);
                        App.toast('Admin user deleted', 'success');
                        App.logActivity('admin_user_deleted', { user_id: id, email: user?.email });
                        this.loadRoles();
                    } catch (err) {
                        App.toast('Failed: ' + err.message, 'error');
                    }
                }
            );
        } catch { App.toast('Failed', 'error'); }
    },

    async saveUserRole(userId) {
        if (Auth.currentUser?.role !== 'super_admin' && Auth.currentUser?.role !== 'advisor') {
            App.toast('Only Super Admin can change roles', 'error');
            return;
        }

        const select = document.querySelector(`.inline-role-select[data-user-id="${userId}"]`);
        if (!select) return;

        try {
            await supabaseAdmin.from('users').update({
                role: select.value,
                updated_at: new Date().toISOString()
            }).eq('id', userId);
            App.toast('Role updated successfully', 'success');
            App.logActivity('role_changed', { user_id: userId, new_role: select.value });
            setTimeout(() => this.loadRoles(), 500);
        } catch { App.toast('Failed', 'error'); }
    },

    async toggleUserActive(userId, isActive) {
        if (Auth.currentUser?.role !== 'super_admin' && Auth.currentUser?.role !== 'advisor') {
            App.toast('Only Super Admin can toggle user status', 'error');
            return;
        }

        try {
            await supabaseAdmin.from('users').update({
                is_active: isActive,
                updated_at: new Date().toISOString()
            }).eq('id', userId);
            App.toast(`User ${isActive ? 'activated' : 'deactivated'}`, 'success');
        } catch { App.toast('Failed', 'error'); }
    },

    // ============================================================
    // TRAINERS
    // ============================================================
    async loadTrainersAdmin() {
        const tbody = document.getElementById('trainersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7"><div class="inline-loader">Loading...</div></td></tr>';
        try {
            const { data } = await supabaseAdmin.from('club_trainers').select('*').order('full_name');
            if (!data || !data.length) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="empty-table"><i data-feather="award"></i><p>No trainers</p></div></td></tr>';
                this.refreshIcons(); return;
            }
            tbody.innerHTML = data.map(t => `<tr>
                <td>${t.photo_url ? `<img src="${t.photo_url}" class="table-photo">` : `<div class="table-photo" style="background:var(--gradient-blue);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;">${t.full_name.charAt(0)}</div>`}</td>
                <td><strong>${App.esc(t.full_name)}</strong></td>
                <td>${App.esc(t.ri_id || '-')}</td>
                <td>${App.esc(t.email || '-')}</td>
                <td>${App.esc(t.area_of_expertise || '-')}</td>
                <td>${App.esc(t.certified_year || '-')}</td>
                <td><div class="table-actions">
                    <button class="table-action-btn edit" onclick="AdminPanel.editTrainer('${t.id}')"><i data-feather="edit-2"></i></button>
                    <button class="table-action-btn delete" onclick="AdminPanel.deleteTrainer('${t.id}')"><i data-feather="trash-2"></i></button>
                </div></td>
            </tr>`).join('');
            this.refreshIcons();
        } catch { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-table"><p>Error</p></div></td></tr>'; }
    },

    bindTrainerForm() {
        this.bindBtn('addTrainerBtn', () => this.openTrainerForm());
        this.bindClose('trainerFormClose', 'trainerFormModal');
        this.bindForm('trainerForm', (e) => this.saveTrainer(e));
        this.bindFilePreview('trainerPhotoInput', 'trainerPhotoPreview');
    },

    openTrainerForm(data = null) {
        const form = document.getElementById('trainerForm');
        const preview = document.getElementById('trainerPhotoPreview');
        form.reset();
        if (preview) preview.classList.add('hidden');
        this.editingId = null;
        if (data) {
            this.editingId = data.id;
            document.getElementById('trainerFormTitle').textContent = 'Edit Trainer';
            document.getElementById('trainerFormId').value = data.id;
            this.populateForm(form, data);
            if (data.photo_url && preview) { preview.src = data.photo_url; preview.classList.remove('hidden'); }
        } else { document.getElementById('trainerFormTitle').textContent = 'Add Trainer'; }
        this.showModal(document.getElementById('trainerFormModal'));
    },

    async editTrainer(id) {
        const { data } = await supabaseAdmin.from('club_trainers').select('*').eq('id', id).single();
        if (data) this.openTrainerForm(data);
    },

    async saveTrainer(e) {
        e.preventDefault();
        const form = e.target;
        const btn = this.disableSubmit(form);
        try {
            const fd = new FormData(form);
            const photo = fd.get('photo');
            const payload = { full_name: fd.get('full_name'), ri_id: fd.get('ri_id'), email: fd.get('email'), area_of_expertise: fd.get('area_of_expertise'), certified_year: fd.get('certified_year'), is_active: true };
            if (photo && photo.size > 0) payload.photo_url = (await App.uploadToCloudinary(photo, 'trainers')).secure_url;
            if (this.editingId) await supabaseAdmin.from('club_trainers').update(payload).eq('id', this.editingId);
            else await supabaseAdmin.from('club_trainers').insert(payload);
            App.toast('Saved', 'success');
            this.hideModal('trainerFormModal');
            this.loadTrainersAdmin();
        } catch { App.toast('Failed', 'error'); }
        finally { this.enableSubmit(form, btn); }
    },

    deleteTrainer(id) {
        App.confirm('Delete this trainer?', async () => {
            await supabaseAdmin.from('club_trainers').delete().eq('id', id);
            App.toast('Deleted', 'success');
            this.loadTrainersAdmin();
        });
    },

    // ============================================================
    // PAST LEADERS
    // ============================================================
    async loadLeadersAdmin() {
        const tbody = document.getElementById('leadersTableBody');
        if (!tbody) return;
        try {
            const { data } = await supabaseAdmin.from('past_leaders').select('*').order('year_range', { ascending: false }).order('position');
            if (!data || !data.length) {
                tbody.innerHTML = '<tr><td colspan="5"><div class="empty-table"><i data-feather="star"></i><p>No past leaders</p></div></td></tr>';
                this.refreshIcons(); return;
            }
            tbody.innerHTML = data.map(l => `<tr>
                <td>${l.photo_url ? `<img src="${l.photo_url}" class="table-photo" style="border:2px solid var(--primary);">` : `<div class="table-photo" style="background:linear-gradient(135deg,#1a56db,#06b6d4);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid var(--primary);">${l.full_name.charAt(0)}</div>`}</td>
                <td><strong>${App.esc(l.full_name)}</strong></td>
                <td><span class="permission-tag">${App.esc(l.position)}</span></td>
                <td>${App.esc(l.year_range)}</td>
                <td><div class="table-actions">
                    <button class="table-action-btn edit" onclick="AdminPanel.editLeader('${l.id}')"><i data-feather="edit-2"></i></button>
                    <button class="table-action-btn delete" onclick="AdminPanel.deleteLeader('${l.id}')"><i data-feather="trash-2"></i></button>
                </div></td>
            </tr>`).join('');
            this.refreshIcons();
        } catch { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-table"><p>Error</p></div></td></tr>'; }
    },

    bindLeaderForm() {
        this.bindBtn('addLeaderBtn', () => this.openLeaderForm());
        this.bindClose('leaderFormClose', 'leaderFormModal');
        this.bindForm('leaderForm', (e) => this.saveLeader(e));
        this.bindFilePreview('leaderPhotoInput', 'leaderPhotoPreview');
    },

    openLeaderForm(data = null) {
        const form = document.getElementById('leaderForm');
        const preview = document.getElementById('leaderPhotoPreview');
        form.reset();
        if (preview) preview.classList.add('hidden');
        this.editingId = null;

        if (data) {
            this.editingId = data.id;
            document.getElementById('leaderFormTitle').textContent = 'Edit Leader';
            document.getElementById('leaderFormId').value = data.id;
            this.populateForm(form, data);
            if (data.photo_url && preview) { preview.src = data.photo_url; preview.classList.remove('hidden'); }
        } else {
            document.getElementById('leaderFormTitle').textContent = 'Add Past Leader';
        }

        this.showModal(document.getElementById('leaderFormModal'));
    },

    async editLeader(id) {
        const { data } = await supabaseAdmin.from('past_leaders').select('*').eq('id', id).single();
        if (data) this.openLeaderForm(data);
    },

    async saveLeader(e) {
        e.preventDefault();
        const form = e.target;
        const btn = this.disableSubmit(form);
        try {
            const fd = new FormData(form);
            const photo = fd.get('photo');
            const payload = {
                full_name: fd.get('full_name'),
                position: fd.get('position'),
                year_range: fd.get('year_range'),
                ri_id: fd.get('ri_id'),
                sort_order: parseInt(fd.get('sort_order')) || 0
            };
            if (photo && photo.size > 0) payload.photo_url = (await App.uploadToCloudinary(photo, 'leaders')).secure_url;
            if (this.editingId) await supabaseAdmin.from('past_leaders').update(payload).eq('id', this.editingId);
            else await supabaseAdmin.from('past_leaders').insert(payload);
            App.toast('Saved', 'success');
            this.hideModal('leaderFormModal');
            this.loadLeadersAdmin();
        } catch { App.toast('Failed', 'error'); }
        finally { this.enableSubmit(form, btn); }
    },

    deleteLeader(id) {
        App.confirm('Delete?', async () => {
            await supabaseAdmin.from('past_leaders').delete().eq('id', id);
            App.toast('Deleted', 'success');
            this.loadLeadersAdmin();
        });
    },

    // ============================================================
    // MEMBERSHIP APPLICATIONS
    // ============================================================
    async loadApplications() {
        const tbody = document.getElementById('applicationsTableBody');
        if (!tbody) return;
        try {
            const { data } = await supabaseAdmin.from('membership_applications').select('*').order('created_at', { ascending: false });
            if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-table"><i data-feather="user-plus"></i><p>No applications</p></div></td></tr>'; this.refreshIcons(); return; }
            tbody.innerHTML = data.map(a => `<tr>
                <td>${a.photo_url ? `<img src="${a.photo_url}" class="table-photo">` : '<div class="table-photo"></div>'}</td>
                <td><strong>${App.esc(a.full_name)}</strong></td>
                <td>${App.esc(a.email)}</td><td>${App.esc(a.phone)}</td><td>${App.esc(a.blood_group || '-')}</td>
                <td>${App.formatDate(a.created_at)}</td>
                <td><span class="status-badge status-${a.status}">${a.status}</span></td>
                <td><div class="table-actions">
                    ${a.status === 'pending' ? `<button class="table-action-btn approve" onclick="AdminPanel.approveApplication('${a.id}')"><i data-feather="check"></i></button><button class="table-action-btn delete" onclick="AdminPanel.rejectApplication('${a.id}')"><i data-feather="x"></i></button>` : ''}
                    <button class="table-action-btn delete" onclick="AdminPanel.deleteApplication('${a.id}')"><i data-feather="trash-2"></i></button>
                </div></td>
            </tr>`).join('');
            this.refreshIcons();
        } catch { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-table"><p>Error</p></div></td></tr>'; }
    },

    approveApplication(id) { App.confirm('Approve?', async () => { await supabaseAdmin.from('membership_applications').update({ status: 'approved', reviewed_by: Auth.currentUser.id, reviewed_at: new Date().toISOString() }).eq('id', id); App.toast('Approved', 'success'); this.loadApplications(); }); },
    rejectApplication(id) { App.confirm('Reject?', async () => { await supabaseAdmin.from('membership_applications').update({ status: 'rejected', reviewed_by: Auth.currentUser.id, reviewed_at: new Date().toISOString() }).eq('id', id); App.toast('Rejected', 'info'); this.loadApplications(); }); },
    deleteApplication(id) { App.confirm('Delete?', async () => { await supabaseAdmin.from('membership_applications').delete().eq('id', id); App.toast('Deleted', 'success'); this.loadApplications(); }); },

    // ============================================================
    // MAIL QUEUE
    // ============================================================
    async loadMailQueue() {
        const tbody = document.getElementById('mailTableBody');
        if (!tbody) return;
        try {
            const { data } = await supabaseAdmin.from('mail_queue').select('*').order('created_at', { ascending: false }).limit(50);
            if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-table"><i data-feather="send"></i><p>No mail history</p></div></td></tr>'; this.refreshIcons(); return; }
            tbody.innerHTML = data.map(m => `<tr>
                <td><span class="permission-tag">${App.esc(m.mail_type)}</span></td>
                <td>${App.esc(m.subject)}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${App.esc(m.recipients)}</td>
                <td><span class="status-badge status-${m.status}">${m.status}</span></td>
                <td>${m.scheduled_at ? App.formatDate(m.scheduled_at) : '-'}</td>
                <td>${m.sent_at ? App.formatDate(m.sent_at) : '-'}</td>
            </tr>`).join('');
            this.refreshIcons();
        } catch { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-table"><p>Error</p></div></td></tr>'; }
    },

    bindComposeMail() {
        this.bindBtn('composeMail', () => this.showModal(document.getElementById('composeMailModal')));
        this.bindClose('composeMailClose', 'composeMailModal');
        const form = document.getElementById('composeMailForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(form);
                if (typeof Mail !== 'undefined') Mail.sendCustomMail({ recipients: fd.get('recipients'), subject: fd.get('subject'), body: fd.get('body') });
                App.toast('Mail queued for sending', 'success');
                this.hideModal('composeMailModal');
                form.reset();
                this.loadMailQueue();
            });
        }
    },

    // ============================================================
    // SITE SETTINGS
    // ============================================================
    async loadSettings() {
        const grid = document.getElementById('settingsGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="inline-loader">Loading settings...</div>';

        try {
            const { data, error } = await supabaseAdmin.from('site_settings').select('*').order('category').order('setting_key');
            if (error) throw error;
            if (!data || !data.length) { grid.innerHTML = '<p style="padding:2rem;text-align:center;">No settings found. Please run the SQL setup.</p>'; return; }

            const grouped = {};
            data.forEach(s => { if (!grouped[s.category]) grouped[s.category] = []; grouped[s.category].push(s); });

            const categoryIcons = { 'general': 'settings', 'contact': 'mail', 'branding': 'image', 'api': 'key', 'blood': 'droplet' };

            grid.innerHTML = Object.keys(grouped).map(cat => `
                <div class="settings-category">
                    <h4><i data-feather="${categoryIcons[cat] || 'settings'}" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;"></i>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h4>
                    ${grouped[cat].map(s => `
                        <div class="setting-item">
                            <label>${s.setting_key.replace(/_/g, ' ')}</label>
                            ${s.setting_type === 'url' || (s.setting_value && s.setting_value.length > 80)
                                ? `<textarea data-key="${s.setting_key}" rows="3" style="font-size:0.82rem;">${App.esc(s.setting_value || '')}</textarea>`
                                : `<input type="${s.setting_type === 'number' ? 'number' : 'text'}" data-key="${s.setting_key}" value="${App.esc(s.setting_value || '')}" step="${s.setting_type === 'number' ? '0.01' : ''}">`
                            }
                            <small style="color:var(--text-muted);font-size:0.7rem;">${s.setting_key}</small>
                        </div>
                    `).join('')}
                </div>
            `).join('');

            try {
                const { data: emailData } = await supabaseAdmin.from('email_config').select('*').order('config_key');
                if (emailData && emailData.length > 0) {
                    const emailHtml = `<div class="settings-category">
                        <h4><i data-feather="mail" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;"></i>Email Configuration</h4>
                        ${emailData.map(e => `
                            <div class="setting-item">
                                <label>${e.config_key.replace(/_/g, ' ')}</label>
                                <input type="text" data-email-key="${e.config_key}" value="${App.esc(e.config_value || '')}">
                                ${e.description ? `<small style="color:var(--text-muted);font-size:0.7rem;">${App.esc(e.description)}</small>` : ''}
                            </div>
                        `).join('')}
                    </div>`;
                    grid.innerHTML += emailHtml;
                }
            } catch (emailErr) { console.warn('Email config not available:', emailErr); }

            this.refreshIcons();

            const saveBtn = document.getElementById('saveAllSettings');
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<i data-feather="loader"></i>Saving...';
                    this.refreshIcons();
                    try {
                        const inputs = grid.querySelectorAll('[data-key]');
                        for (const inp of inputs) {
                            await supabaseAdmin.from('site_settings').update({
                                setting_value: inp.value,
                                updated_at: new Date().toISOString(),
                                updated_by: Auth.currentUser.id
                            }).eq('setting_key', inp.dataset.key);
                        }

                        const emailInputs = grid.querySelectorAll('[data-email-key]');
                        for (const inp of emailInputs) {
                            try {
                                await supabaseAdmin.from('email_config').update({
                                    config_value: inp.value,
                                    updated_at: new Date().toISOString()
                                }).eq('config_key', inp.dataset.emailKey);
                            } catch (e) { console.warn(e); }
                        }

                        App.toast('All settings saved. Refreshing...', 'success');
                        await App.loadSettings();
                        App.applySettings();
                        if (typeof Mail !== 'undefined' && Mail.loadConfig) await Mail.loadConfig();
                    } catch (err) { App.toast('Failed: ' + err.message, 'error'); }
                    finally {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '<i data-feather="save"></i>Save All';
                        this.refreshIcons();
                    }
                };
            }
        } catch (err) { grid.innerHTML = '<p style="padding:2rem;text-align:center;">Error: ' + err.message + '</p>'; }
    },

    // ============================================================
    // STATISTICS
    // ============================================================
    async loadStatisticsAdmin() {
        const tbody = document.getElementById('statisticsTableBody');
        if (!tbody) return;
        await this.autoCalculateStats();
        const { data } = await supabaseAdmin.from('club_statistics').select('*').order('sort_order');
        if (!data || !data.length) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="empty-table"><i data-feather="bar-chart"></i><p>No statistics. Click Add to create.</p></div></td></tr>';
            this.refreshIcons();
            return;
        }
        tbody.innerHTML = data.map(s => `<tr>
            <td><code style="padding:2px 8px;background:rgba(26,86,219,0.08);border-radius:4px;font-size:0.8rem;">${App.esc(s.stat_key)}</code></td>
            <td>${App.esc(s.stat_label)}</td>
            <td><input type="text" value="${App.esc(s.stat_value)}" data-stat-id="${s.id}" style="width:100px;padding:6px 10px;border:1px solid var(--border-color);border-radius:6px;font-weight:700;text-align:center;"></td>
            <td><i data-feather="${s.stat_icon || 'star'}"></i></td>
            <td><div class="table-actions">
                <button class="table-action-btn approve" onclick="AdminPanel.saveStatValue('${s.id}')" title="Save"><i data-feather="save"></i></button>
                <button class="table-action-btn edit" onclick="AdminPanel.editStat('${s.id}')"><i data-feather="edit-2"></i></button>
                <button class="table-action-btn delete" onclick="AdminPanel.deleteStat('${s.id}')"><i data-feather="trash-2"></i></button>
            </div></td>
        </tr>`).join('');
        this.refreshIcons();

        const addBtn = document.getElementById('addStatBtn');
        if (addBtn) addBtn.onclick = () => this.editStat(null);

        const autoBtn = document.getElementById('autoCalculateStatsBtn');
        if (autoBtn) autoBtn.onclick = async () => {
            await this.autoCalculateStats();
            App.toast('Statistics auto-calculated', 'success');
            this.loadStatisticsAdmin();
        };
    },

    async saveStatValue(id) {
        const input = document.querySelector(`input[data-stat-id="${id}"]`);
        if (!input) return;
        try {
            await supabaseAdmin.from('club_statistics').update({ stat_value: input.value, updated_at: new Date().toISOString() }).eq('id', id);
            App.toast('Value saved', 'success');
        } catch { App.toast('Failed', 'error'); }
    },

    async autoCalculateStats() {
        try {
            const { count: evCount } = await supabaseAdmin.from('events').select('*', { count: 'exact', head: true }).eq('is_approved', true);
            const { count: memCount } = await supabaseAdmin.from('club_members').select('*', { count: 'exact', head: true }).eq('is_active', true);

            const stats = [
                { stat_key: 'projects_completed', stat_value: String(evCount || 0) },
                { stat_key: 'total_members', stat_value: String(memCount || 0) },
                { stat_key: 'community_hours', stat_value: String((evCount || 0) * 4) }
            ];

            for (const stat of stats) {
                await supabaseAdmin.from('club_statistics').update({
                    stat_value: stat.stat_value,
                    updated_at: new Date().toISOString()
                }).eq('stat_key', stat.stat_key);
            }
        } catch (err) { console.warn('Auto-calc error:', err); }
    },

    editStat(id) {
        this.openGenericForm({
            title: id ? 'Edit Statistic' : 'Add Statistic',
            table: 'club_statistics',
            id,
            fields: [
                { name: 'stat_key', label: 'Key (unique)', type: 'text', required: true },
                { name: 'stat_label', label: 'Display Label', type: 'text', required: true },
                { name: 'stat_value', label: 'Value', type: 'text', required: true },
                { name: 'stat_icon', label: 'Icon (feather name)', type: 'text' },
                { name: 'sort_order', label: 'Sort Order', type: 'number' }
            ],
            onSave: () => this.loadStatisticsAdmin()
        });
    },

    deleteStat(id) {
        App.confirm('Delete?', async () => {
            await supabaseAdmin.from('club_statistics').delete().eq('id', id);
            this.loadStatisticsAdmin();
            App.toast('Deleted', 'success');
        });
    },

    // ============================================================
    // BENEFITS
    // ============================================================
    async loadBenefitsAdmin() {
        const tbody = document.getElementById('benefitsTableBody');
        if (!tbody) return;
        const { data } = await supabaseAdmin.from('joining_benefits').select('*').order('sort_order');
        if (!data || !data.length) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="empty-table"><i data-feather="gift"></i><p>No benefits. Click Add.</p></div></td></tr>';
            this.refreshIcons();
            return;
        }
        tbody.innerHTML = data.map(b => `<tr>
            <td><strong>${App.esc(b.title)}</strong></td>
            <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${App.esc(b.description)}</td>
            <td><i data-feather="${b.icon || 'star'}"></i></td>
            <td>${b.sort_order}</td>
            <td><div class="table-actions">
                <button class="table-action-btn edit" onclick="AdminPanel.editBenefit('${b.id}')"><i data-feather="edit-2"></i></button>
                <button class="table-action-btn delete" onclick="AdminPanel.deleteBenefit('${b.id}')"><i data-feather="trash-2"></i></button>
            </div></td>
        </tr>`).join('');
        this.refreshIcons();
        const addBtn = document.getElementById('addBenefitBtn');
        if (addBtn) addBtn.onclick = () => this.editBenefit(null);
    },

    editBenefit(id) {
        this.openGenericForm({
            title: id ? 'Edit Benefit' : 'Add Benefit',
            table: 'joining_benefits',
            id,
            fields: [
                { name: 'title', label: 'Title', type: 'text', required: true },
                { name: 'description', label: 'Description', type: 'textarea', required: true },
                { name: 'icon', label: 'Icon (feather name)', type: 'text' },
                { name: 'sort_order', label: 'Sort Order', type: 'number' }
            ],
            onSave: () => { this.loadBenefitsAdmin(); if (App.loadBenefits) App.loadBenefits(); }
        });
    },

    deleteBenefit(id) {
        App.confirm('Delete?', async () => {
            await supabaseAdmin.from('joining_benefits').delete().eq('id', id);
            this.loadBenefitsAdmin();
            if (App.loadBenefits) App.loadBenefits();
        });
    },

    // ============================================================
    // CHATBOT
    // ============================================================
    async loadChatbotData() {
        const tbody = document.getElementById('chatbotTableBody');
        if (!tbody) return;
        const { data } = await supabaseAdmin.from('chatbot_context').select('*').order('category').order('topic');
        if (!data || !data.length) {
            tbody.innerHTML = '<tr><td colspan="4"><div class="empty-table"><i data-feather="message-circle"></i><p>No knowledge. Click Add.</p></div></td></tr>';
            this.refreshIcons(); return;
        }
        tbody.innerHTML = data.map(c => `<tr>
            <td><strong>${App.esc(c.topic)}</strong></td>
            <td><span class="permission-tag">${App.esc(c.category)}</span></td>
            <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${App.esc(c.content)}</td>
            <td><div class="table-actions">
                <button class="table-action-btn edit" onclick="AdminPanel.editChatbot('${c.id}')"><i data-feather="edit-2"></i></button>
                <button class="table-action-btn delete" onclick="AdminPanel.deleteChatbot('${c.id}')"><i data-feather="trash-2"></i></button>
            </div></td>
        </tr>`).join('');
        this.refreshIcons();
        const addBtn = document.getElementById('addChatbotData');
        if (addBtn) addBtn.onclick = () => this.editChatbot(null);
    },

    editChatbot(id) {
        this.openGenericForm({ title: id ? 'Edit' : 'Add', table: 'chatbot_context', id,
            fields: [
                { name: 'topic', label: 'Topic', type: 'text', required: true },
                { name: 'category', label: 'Category', type: 'text' },
                { name: 'content', label: 'Content', type: 'textarea', required: true }
            ],
            onSave: () => this.loadChatbotData()
        });
    },

    deleteChatbot(id) {
        App.confirm('Delete?', async () => {
            await supabaseAdmin.from('chatbot_context').delete().eq('id', id);
            this.loadChatbotData();
        });
    },

    // ============================================================
    // ACTIVITY LOG
    // ============================================================
    async loadActivityLog() {
        const tbody = document.getElementById('activityTableBody');
        if (!tbody) return;
        try {
            const { data } = await supabaseAdmin.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100);
            if (!data || !data.length) {
                tbody.innerHTML = '<tr><td colspan="3"><div class="empty-table"><i data-feather="activity"></i><p>No activity</p></div></td></tr>';
                this.refreshIcons(); return;
            }
            tbody.innerHTML = data.map(a => `<tr>
                <td style="white-space:nowrap;">${new Date(a.created_at).toLocaleString('en-IN')}</td>
                <td><span class="permission-tag">${App.esc(a.action)}</span></td>
                <td><code style="font-size:0.78rem;word-break:break-all;">${App.esc(JSON.stringify(a.details))}</code></td>
            </tr>`).join('');
        } catch { tbody.innerHTML = '<tr><td colspan="3"><div class="empty-table"><p>Error</p></div></td></tr>'; }
    },

    // ============================================================
    // GENERIC FORM
    // ============================================================
    bindGenericForms() {
        this.bindClose('genericFormClose', 'genericFormModal');
    },

    async openGenericForm({ title, table, id, fields, onSave }) {
        const modal = document.getElementById('genericFormModal');
        const form = document.getElementById('genericForm');
        const titleEl = document.getElementById('genericFormTitle');
        const container = document.getElementById('genericFormFields');

        titleEl.textContent = title;
        this.editingId = id;

        let existing = {};
        if (id) {
            const { data } = await supabaseAdmin.from(table).select('*').eq('id', id).single();
            existing = data || {};
        }

        container.innerHTML = fields.map(f => {
            const val = existing[f.name] || '';
            if (f.type === 'textarea') {
                return `<div class="form-group"><label>${f.label}</label><textarea name="${f.name}" rows="4" ${f.required ? 'required' : ''}>${App.esc(val)}</textarea></div>`;
            }
            return `<div class="form-group"><label>${f.label}</label><input type="${f.type}" name="${f.name}" value="${App.esc(val)}" ${f.required ? 'required' : ''}></div>`;
        }).join('');

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                const fd = new FormData(form);
                const payload = {};
                fields.forEach(f => {
                    let val = fd.get(f.name);
                    if (f.type === 'number') val = val ? parseInt(val) : null;
                    payload[f.name] = val;
                });
                if (id) await supabaseAdmin.from(table).update(payload).eq('id', id);
                else await supabaseAdmin.from(table).insert(payload);
                App.toast('Saved', 'success');
                this.hideModal('genericFormModal');
                if (onSave) onSave();
            } catch (err) { App.toast('Failed: ' + err.message, 'error'); }
            finally { btn.disabled = false; }
        };

        this.showModal(modal);
    },

    // ============================================================
    // HELPERS
    // ============================================================
    showModal(modal) {
        if (!modal) return;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        this.refreshIcons();
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.editingId = null;
    },

    bindBtn(id, handler) {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', handler);
    },

    bindClose(closeId, modalId) {
        const btn = document.getElementById(closeId);
        if (btn) btn.addEventListener('click', () => this.hideModal(modalId));
    },

    bindForm(formId, handler) {
        const form = document.getElementById(formId);
        if (form) form.addEventListener('submit', handler);
    },

    bindFilePreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', (e) => {
                const preview = document.getElementById(previewId);
                if (e.target.files[0]) App.previewImage(e.target.files[0], preview);
            });
        }
    },

    populateForm(form, data, excludeKeys = []) {
        Object.keys(data).forEach(key => {
            if (excludeKeys.includes(key)) return;
            const field = form.querySelector(`[name="${key}"]`);
            if (field && data[key] !== null) field.value = data[key];
        });
    },

    disableSubmit(form) {
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            const original = btn.innerHTML;
            btn.innerHTML = '<i data-feather="loader"></i>Saving...';
            this.refreshIcons();
            return original;
        }
        return '';
    },

    enableSubmit(form, originalHTML) {
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            this.refreshIcons();
        }
    },

    refreshIcons() {
        if (typeof feather !== 'undefined') feather.replace();
        setTimeout(() => {
            if (typeof Auth !== 'undefined' && Auth.fixAdminIconSizes) Auth.fixAdminIconSizes();
        }, 100);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => AdminPanel.init(), 500);
});

window.AdminPanel = AdminPanel;