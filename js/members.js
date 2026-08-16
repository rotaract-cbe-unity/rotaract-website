/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Members, Past Leaders & Trainers Management - js/members.js
   ============================================================ */

(function () {
    'use strict';

    const db = window.UnityAdminDB || window.UnityDB;
    const auth = window.UnityAuth;
    const cfg = window.UnityConfig;

    function esc(t) { return auth.escHtml(t); }
    function fDate(d) { return auth.formatDate(d); }
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

    // ============================================================
    // MEMBERS MANAGEMENT
    // ============================================================
    window.AdminMembers = {
        data: [],

        async load() {
            if (!auth.hasPermission('canViewMembers') && !auth.isHighLevel()) {
                document.getElementById('members-table-body').innerHTML =
                    buildEmptyRow(10, 'You do not have access to members');
                return;
            }
            this.bindFilters();
            await this.fetchAndRender();
        },

        bindFilters() {
            const searchInput = document.getElementById('member-search-admin');
            const bloodFilter = document.getElementById('member-filter-blood');
            const statusFilter = document.getElementById('member-filter-status');

            const doFilter = auth.debounce(() => this.applyFilters(), 300);

            searchInput?.addEventListener('input', doFilter);
            bloodFilter?.addEventListener('change', () => this.applyFilters());
            statusFilter?.addEventListener('change', () => this.fetchWithFilter());
        },

        async fetchWithFilter() {
            await this.fetchAndRender();
        },

        async fetchAndRender() {
            const tbody = document.getElementById('members-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(10);

            const statusFilter = document.getElementById('member-filter-status')?.value;

            try {
                let query = db.from('members').select('*').order('name');

                if (statusFilter === 'true') query = query.eq('is_active', true);
                else if (statusFilter === 'false') query = query.eq('is_active', false);
                else if (statusFilter === 'board') query = query.eq('is_board_member', true);

                const { data, error } = await query;
                if (error) throw error;
                this.data = data || [];
                this.render(this.data);
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(10, 'Could not load members');
                toast('Failed to load members', 'error');
            }
        },

        applyFilters() {
            const search = document.getElementById('member-search-admin')?.value.toLowerCase() || '';
            const blood = document.getElementById('member-filter-blood')?.value || '';

            const filtered = this.data.filter(m => {
                const matchSearch = !search ||
                    m.name?.toLowerCase().includes(search) ||
                    m.email?.toLowerCase().includes(search) ||
                    m.portfolio?.toLowerCase().includes(search) ||
                    m.ri_id?.toLowerCase().includes(search) ||
                    m.area?.toLowerCase().includes(search) ||
                    m.phone?.includes(search);
                const matchBlood = !blood || m.blood_group === blood;
                return matchSearch && matchBlood;
            });

            this.render(filtered);
        },

        render(members) {
            const tbody = document.getElementById('members-table-body');
            if (!tbody) return;

            const canEdit = auth.hasPermission('canEditMembers');

            if (!members.length) {
                tbody.innerHTML = buildEmptyRow(10, 'No members found');
                return;
            }

            tbody.innerHTML = members.map(m => `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${m.photo_url
                    ? `<img src="${esc(m.photo_url)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid var(--a-border);cursor:pointer;"
                                   onclick="document.getElementById('image-preview-overlay').style.display='flex';document.getElementById('image-preview-img').src='${esc(m.photo_url)}';"
                                   onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                               <div class="cell-avatar-placeholder" style="display:none;"><i class="fas fa-user"></i></div>`
                    : `<div class="cell-avatar-placeholder"><i class="fas fa-user"></i></div>`}
                        </div>
                    </td>
                    <td>
                        <div class="cell-name">${esc(m.name)}</div>
                        ${m.is_board_member ? `<span class="badge badge-primary" style="font-size:0.6rem;">Board</span>` : ''}
                    </td>
                    <td><small>${esc(m.portfolio || '—')}</small></td>
                    <td><small>${esc(m.ri_id || '—')}</small></td>
                    <td>
                        ${m.email ? `<a href="mailto:${esc(m.email)}" style="color:var(--a-primary);font-size:0.78rem;">${esc(m.email)}</a>` : '—'}
                    </td>
                    <td>
                        ${m.phone ? `<a href="tel:${esc(m.phone)}" style="color:var(--a-primary);font-size:0.78rem;">${esc(m.phone)}</a>` : '—'}
                    </td>
                    <td>
                        ${m.blood_group ? `<span class="badge badge-danger"><i class="fas fa-tint"></i>${esc(m.blood_group)}</span>` : '—'}
                    </td>
                    <td><small>${esc(m.area || '—')}</small></td>
                    <td>
                        <span class="badge badge-${m.is_active ? 'success' : 'gray'}">
                            ${m.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <div class="cell-actions">
                            <button class="action-btn view" title="View Details" onclick="AdminMembers.viewMember('${m.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${canEdit ? `
                            <button class="action-btn edit" title="Edit" onclick="AdminMembers.openEdit('${m.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" title="${m.is_active ? 'Deactivate' : 'Activate'}"
                                style="${m.is_active ? 'color:var(--a-warning)' : 'color:var(--a-success)'}"
                                onclick="AdminMembers.toggleActive('${m.id}', ${m.is_active})">
                                <i class="fas fa-${m.is_active ? 'user-slash' : 'user-check'}"></i>
                            </button>
                            <button class="action-btn delete" title="Delete" onclick="AdminMembers.confirmDelete('${m.id}', '${esc(m.name)}')">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        openAdd() {
            auth.openModal(
                '<i class="fas fa-user-plus"></i> Add Member',
                this.buildMemberForm(null),
                async (close) => await this.saveMember(null, close),
                { wide: true, saveLabel: '<i class="fas fa-user-plus"></i> Add Member' }
            );
            setTimeout(() => this.initMemberFormListeners(), 200);
        },

        async openEdit(memberId) {
            const m = this.data.find(x => x.id === memberId);
            if (!m) return;

            auth.openModal(
                `<i class="fas fa-edit"></i> Edit Member - ${esc(m.name)}`,
                this.buildMemberForm(m),
                async (close) => await this.saveMember(memberId, close),
                { wide: true, saveLabel: '<i class="fas fa-save"></i> Save Changes' }
            );
            setTimeout(() => this.initMemberFormListeners(m), 200);
        },

        buildMemberForm(m) {
            const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

            return `
            <div class="modal-form-grid">
                <div class="form-group">
                    <label>Full Name <span class="req">*</span></label>
                    <input type="text" id="mb-name" value="${esc(m?.name || '')}" placeholder="Full name" required>
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="mb-email" value="${esc(m?.email || '')}" placeholder="Email address">
                </div>
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" id="mb-phone" value="${esc(m?.phone || '')}" placeholder="Phone number">
                </div>
                <div class="form-group">
                    <label>RI Member ID</label>
                    <input type="text" id="mb-ri-id" value="${esc(m?.ri_id || '')}" placeholder="RI Member ID">
                </div>
                <div class="form-group">
                    <label>Portfolio / Role</label>
                    <input type="text" id="mb-portfolio" value="${esc(m?.portfolio || '')}" placeholder="e.g. Director - Club Service">
                </div>
                <div class="form-group">
                    <label>Blood Group</label>
                    <select id="mb-blood">
                        <option value="">Select Blood Group</option>
                        ${bloodGroups.map(bg => `<option value="${bg}" ${m?.blood_group === bg ? 'selected' : ''}>${bg}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date of Birth</label>
                    <input type="date" id="mb-dob" value="${m?.date_of_birth || ''}">
                </div>
                <div class="form-group">
                    <label>Area / Location</label>
                    <input type="text" id="mb-area" value="${esc(m?.area || '')}" placeholder="Residential area">
                </div>
                <div class="form-group">
                    <label>Join Date</label>
                    <input type="date" id="mb-join-date" value="${m?.join_date || ''}">
                </div>
                <div class="form-group">
                    <label>Membership Type</label>
                    <select id="mb-type">
                        <option value="active" ${m?.membership_type === 'active' ? 'selected' : ''}>Active</option>
                        <option value="associate" ${m?.membership_type === 'associate' ? 'selected' : ''}>Associate</option>
                        <option value="honorary" ${m?.membership_type === 'honorary' ? 'selected' : ''}>Honorary</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Board Member</label>
                    <select id="mb-board">
                        <option value="false" ${!m?.is_board_member ? 'selected' : ''}>No</option>
                        <option value="true" ${m?.is_board_member ? 'selected' : ''}>Yes</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="mb-active">
                        <option value="true" ${m?.is_active !== false ? 'selected' : ''}>Active</option>
                        <option value="false" ${m?.is_active === false ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label><i class="fas fa-camera"></i> Profile Photo</label>
                    ${m?.photo_url ? `
                    <div style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">
                        <img src="${esc(m.photo_url)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid var(--a-border);" onerror="this.style.display='none';">
                        <small style="color:var(--a-text3);">Current photo · Upload new to replace</small>
                    </div>` : ''}
                    <div class="modal-file-upload">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Upload profile photo</p>
                        <span>JPG, PNG (Max 3MB)</span>
                        <input type="file" id="mb-photo-file" accept="image/*">
                    </div>
                    <div id="mb-photo-preview"></div>
                </div>
            </div>`;
        },

        initMemberFormListeners(m) {
            document.getElementById('mb-photo-file')?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => {
                        const p = document.getElementById('mb-photo-preview');
                        if (p) p.innerHTML = `<img src="${ev.target.result}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-top:8px;border:2px solid var(--a-primary);">`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        },

        async saveMember(memberId, close) {
            const name = document.getElementById('mb-name')?.value.trim();
            if (!name) { toast('Name is required', 'warning'); return; }

            const user = auth.getCurrentUser();

            // Upload photo
            let photoUrl = null;
            if (memberId) {
                const existing = this.data.find(m => m.id === memberId);
                photoUrl = existing?.photo_url || null;
            }

            const photoFile = document.getElementById('mb-photo-file')?.files[0];
            if (photoFile) {
                try {
                    if (photoFile.size > 3 * 1024 * 1024) throw new Error('Photo must be under 3MB');
                    const compressed = await window.UnityStorage.compressImage(photoFile, 800, 0.8);
                    const path = `member_${Date.now()}.jpg`;
                    photoUrl = await window.UnityStorage.uploadFile('members', compressed, path);
                } catch (e) {
                    toast('Photo upload failed: ' + e.message, 'warning');
                }
            }

            const payload = {
                name,
                email: document.getElementById('mb-email')?.value.trim() || null,
                phone: document.getElementById('mb-phone')?.value.trim() || null,
                ri_id: document.getElementById('mb-ri-id')?.value.trim() || null,
                portfolio: document.getElementById('mb-portfolio')?.value.trim() || null,
                blood_group: document.getElementById('mb-blood')?.value || null,
                date_of_birth: document.getElementById('mb-dob')?.value || null,
                area: document.getElementById('mb-area')?.value.trim() || null,
                join_date: document.getElementById('mb-join-date')?.value || null,
                membership_type: document.getElementById('mb-type')?.value || 'active',
                is_board_member: document.getElementById('mb-board')?.value === 'true',
                is_active: document.getElementById('mb-active')?.value === 'true',
                photo_url: photoUrl
            };

            try {
                if (memberId) {
                    const { error } = await db.from('members').update(payload).eq('id', memberId);
                    if (error) throw error;
                    toast('Member updated successfully!', 'success');
                } else {
                    const { error } = await db.from('members').insert(payload);
                    if (error) throw error;
                    toast('Member added successfully!', 'success');
                }

                close();
                await this.fetchAndRender();
            } catch (e) {
                toast(e.message || 'Failed to save member', 'error');
            }
        },

        async viewMember(memberId) {
            const m = this.data.find(x => x.id === memberId);
            if (!m) return;

            auth.openModal(
                `<i class="fas fa-user-circle"></i> ${esc(m.name)}`,
                `<div style="display:flex;flex-direction:column;gap:16px;align-items:center;text-align:center;">
                    ${m.photo_url ? `
                    <img src="${esc(m.photo_url)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:4px solid var(--a-primary-lighter);" onerror="this.style.display='none';">
                    ` : `
                    <div style="width:100px;height:100px;border-radius:50%;background:rgba(26,86,219,0.1);display:flex;align-items:center;justify-content:center;border:4px solid var(--a-border);">
                        <i class="fas fa-user" style="font-size:2.5rem;color:var(--a-primary);"></i>
                    </div>`}
                    <div>
                        <h3 style="font-size:1.2rem;font-weight:800;margin-bottom:4px;">${esc(m.name)}</h3>
                        ${m.portfolio ? `<p style="color:var(--a-primary);font-weight:600;font-size:0.9rem;">${esc(m.portfolio)}</p>` : ''}
                        ${m.is_board_member ? `<span class="badge badge-primary">Board Member</span>` : ''}
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:16px;">
                    ${m.ri_id ? `<div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);"><div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">RI ID</div><div style="font-weight:600;">${esc(m.ri_id)}</div></div>` : ''}
                    ${m.blood_group ? `<div style="padding:10px;background:var(--a-danger-bg);border-radius:var(--a-radius-sm);"><div style="font-size:0.65rem;color:var(--a-danger);font-weight:700;text-transform:uppercase;">Blood Group</div><div style="font-weight:800;font-size:1.1rem;color:var(--a-danger);">${esc(m.blood_group)}</div></div>` : ''}
                    ${m.email ? `<div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);"><div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Email</div><div style="font-size:0.78rem;"><a href="mailto:${esc(m.email)}" style="color:var(--a-primary);">${esc(m.email)}</a></div></div>` : ''}
                    ${m.phone ? `<div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);"><div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Phone</div><div><a href="tel:${esc(m.phone)}" style="color:var(--a-primary);font-weight:600;">${esc(m.phone)}</a></div></div>` : ''}
                    ${m.date_of_birth ? `<div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);"><div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Date of Birth</div><div style="font-weight:600;">${fDate(m.date_of_birth)}</div></div>` : ''}
                    ${m.area ? `<div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);"><div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Area</div><div style="font-weight:600;">${esc(m.area)}</div></div>` : ''}
                    ${m.join_date ? `<div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);"><div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Join Date</div><div style="font-weight:600;">${fDate(m.join_date)}</div></div>` : ''}
                    <div style="padding:10px;background:var(--a-bg-alt);border-radius:var(--a-radius-sm);"><div style="font-size:0.65rem;color:var(--a-text3);font-weight:700;text-transform:uppercase;">Status</div><div><span class="badge badge-${m.is_active ? 'success' : 'gray'}">${m.is_active ? 'Active' : 'Inactive'}</span></div></div>
                </div>`,
                null,
                { hideSave: true }
            );
        },

        async toggleActive(memberId, currentState) {
            try {
                await db.from('members').update({ is_active: !currentState }).eq('id', memberId);
                toast(`Member ${currentState ? 'deactivated' : 'activated'}`, 'success');
                await this.fetchAndRender();
            } catch (e) {
                toast('Failed to update member status', 'error');
            }
        },

        async confirmDelete(memberId, name) {
            auth.openConfirm('Delete Member', `Permanently delete "${name}"?`, async () => {
                try {
                    await db.from('members').delete().eq('id', memberId);
                    toast('Member deleted', 'success');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Failed to delete member', 'error');
                }
            });
        },

        async exportMembers() {
            if (!window.XLSX) { toast('Export library not available', 'error'); return; }

            const data = this.data.map((m, i) => ({
                'S.No': i + 1,
                'Name': m.name,
                'Portfolio': m.portfolio || '',
                'RI ID': m.ri_id || '',
                'Email': m.email || '',
                'Phone': m.phone || '',
                'Blood Group': m.blood_group || '',
                'Date of Birth': m.date_of_birth || '',
                'Area': m.area || '',
                'Join Date': m.join_date || '',
                'Board Member': m.is_board_member ? 'Yes' : 'No',
                'Status': m.is_active ? 'Active' : 'Inactive'
            }));

            const wb = window.XLSX.utils.book_new();
            const ws = window.XLSX.utils.json_to_sheet(data);
            ws['!cols'] = Array(12).fill({ wch: 18 });
            window.XLSX.utils.book_append_sheet(wb, ws, 'Members');
            window.XLSX.writeFile(wb, 'Unity_Members.xlsx');
            toast('Members exported!', 'success');
        },

        // ============================================================
        // PAST LEADERS
        // ============================================================
        async loadPastLeaders() {
            await this.fetchPastLeaders();
        },

        async fetchPastLeaders() {
            const tbody = document.getElementById('leaders-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(8);

            const role = document.getElementById('leader-filter-role')?.value;

            try {
                let query = db.from('past_leaders').select('*').order('display_order');
                if (role) query = query.eq('role', role);

                const { data, error } = await query;
                if (error) throw error;

                this.renderPastLeaders(data || []);
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(8, 'Could not load leaders');
            }
        },

        renderPastLeaders(leaders) {
            const tbody = document.getElementById('leaders-table-body');
            if (!tbody) return;

            if (!leaders.length) {
                tbody.innerHTML = buildEmptyRow(8, 'No past leaders found');
                return;
            }

            tbody.innerHTML = leaders.map(l => `
                <tr>
                    <td>
                        ${l.photo_url
                    ? `<img src="${esc(l.photo_url)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--a-border);" onerror="this.style.display='none';">`
                    : `<div class="cell-avatar-placeholder"><i class="fas fa-user"></i></div>`}
                    </td>
                    <td><div class="cell-name">${esc(l.name)}</div></td>
                    <td>
                        <span class="badge badge-${l.role === 'president' ? 'warning' : 'info'}">
                            <i class="fas fa-${l.role === 'president' ? 'crown' : 'pen-nib'}"></i>
                            ${l.role === 'president' ? 'President' : 'Secretary'}
                        </span>
                    </td>
                    <td><strong>${esc(l.year)}</strong></td>
                    <td><small>${esc(l.ri_id || '—')}</small></td>
                    <td><small>${esc(l.email || '—')}</small></td>
                    <td><small>${l.display_order}</small></td>
                    <td>
                        <div class="cell-actions">
                            <button class="action-btn edit" title="Edit" onclick="AdminMembers.editLeader('${l.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" title="Delete" onclick="AdminMembers.deleteLeader('${l.id}', '${esc(l.name)}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        openAddLeader() {
            auth.openModal(
                '<i class="fas fa-plus"></i> Add Past Leader',
                this.buildLeaderForm(null),
                async (close) => await this.saveLeader(null, close),
                { saveLabel: '<i class="fas fa-plus"></i> Add Leader' }
            );
            setTimeout(() => this.initLeaderFormListeners(), 200);
        },

        async editLeader(leaderId) {
            const { data: l } = await db.from('past_leaders').select('*').eq('id', leaderId).single();
            if (!l) return;

            auth.openModal(
                `<i class="fas fa-edit"></i> Edit Leader - ${esc(l.name)}`,
                this.buildLeaderForm(l),
                async (close) => await this.saveLeader(leaderId, close),
                { saveLabel: '<i class="fas fa-save"></i> Save Changes' }
            );
            setTimeout(() => this.initLeaderFormListeners(l), 200);
        },

        buildLeaderForm(l) {
            return `
            <div class="modal-form-grid">
                <div class="form-group">
                    <label>Full Name <span class="req">*</span></label>
                    <input type="text" id="ld-name" value="${esc(l?.name || '')}" placeholder="Full name" required>
                </div>
                <div class="form-group">
                    <label>Role <span class="req">*</span></label>
                    <select id="ld-role">
                        <option value="president" ${l?.role === 'president' ? 'selected' : ''}>President</option>
                        <option value="secretary" ${l?.role === 'secretary' ? 'selected' : ''}>Secretary</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Year <span class="req">*</span></label>
                    <input type="text" id="ld-year" value="${esc(l?.year || '')}" placeholder="e.g. 2023-24" required>
                </div>
                <div class="form-group">
                    <label>Display Order</label>
                    <input type="number" id="ld-order" value="${l?.display_order || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>RI ID</label>
                    <input type="text" id="ld-ri-id" value="${esc(l?.ri_id || '')}" placeholder="RI Member ID">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="ld-email" value="${esc(l?.email || '')}" placeholder="Email address">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" id="ld-phone" value="${esc(l?.phone || '')}" placeholder="Phone number">
                </div>
                <div class="form-group full-width">
                    <label>Profile Photo</label>
                    ${l?.photo_url ? `<img src="${esc(l.photo_url)}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;margin-bottom:8px;border:2px solid var(--a-border);" onerror="this.style.display='none';">` : ''}
                    <div class="modal-file-upload">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Upload profile photo</p>
                        <span>JPG, PNG (Max 3MB)</span>
                        <input type="file" id="ld-photo-file" accept="image/*">
                    </div>
                    <div id="ld-photo-preview"></div>
                </div>
            </div>`;
        },

        initLeaderFormListeners(l) {
            document.getElementById('ld-photo-file')?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => {
                        const p = document.getElementById('ld-photo-preview');
                        if (p) p.innerHTML = `<img src="${ev.target.result}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;margin-top:8px;">`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        },

        async saveLeader(leaderId, close) {
            const name = document.getElementById('ld-name')?.value.trim();
            const role = document.getElementById('ld-role')?.value;
            const year = document.getElementById('ld-year')?.value.trim();

            if (!name || !role || !year) {
                toast('Name, role and year are required', 'warning');
                return;
            }

            let photoUrl = null;
            if (leaderId) {
                const { data: existing } = await db.from('past_leaders').select('photo_url').eq('id', leaderId).single();
                photoUrl = existing?.photo_url || null;
            }

            const photoFile = document.getElementById('ld-photo-file')?.files[0];
            if (photoFile) {
                try {
                    const compressed = await window.UnityStorage.compressImage(photoFile, 600, 0.8);
                    const path = `leader_${Date.now()}.jpg`;
                    photoUrl = await window.UnityStorage.uploadFile('members', compressed, path);
                } catch (e) {
                    toast('Photo upload failed', 'warning');
                }
            }

            const payload = {
                name,
                role,
                year,
                display_order: parseInt(document.getElementById('ld-order')?.value) || 0,
                ri_id: document.getElementById('ld-ri-id')?.value.trim() || null,
                email: document.getElementById('ld-email')?.value.trim() || null,
                phone: document.getElementById('ld-phone')?.value.trim() || null,
                photo_url: photoUrl
            };

            try {
                if (leaderId) {
                    await db.from('past_leaders').update(payload).eq('id', leaderId);
                    toast('Leader updated!', 'success');
                } else {
                    await db.from('past_leaders').insert(payload);
                    toast('Leader added!', 'success');
                }
                close();
                await this.fetchPastLeaders();
            } catch (e) {
                toast('Failed to save leader', 'error');
            }
        },

        async deleteLeader(leaderId, name) {
            auth.openConfirm('Delete Leader', `Delete "${name}"?`, async () => {
                try {
                    await db.from('past_leaders').delete().eq('id', leaderId);
                    toast('Leader deleted', 'success');
                    await this.fetchPastLeaders();
                } catch (e) {
                    toast('Failed to delete', 'error');
                }
            });
        },

        // ============================================================
        // TRAINERS
        // ============================================================
        async loadTrainers() {
            await this.fetchTrainers();
        },

        async fetchTrainers() {
            const tbody = document.getElementById('trainers-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(8);

            try {
                const { data, error } = await db.from('trainers').select('*').order('display_order');
                if (error) throw error;
                this.renderTrainers(data || []);
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(8, 'Could not load trainers');
            }
        },

        renderTrainers(trainers) {
            const tbody = document.getElementById('trainers-table-body');
            if (!tbody) return;

            if (!trainers.length) {
                tbody.innerHTML = buildEmptyRow(8, 'No trainers found');
                return;
            }

            tbody.innerHTML = trainers.map(t => `
                <tr>
                    <td>
                        ${t.photo_url
                    ? `<img src="${esc(t.photo_url)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--a-border);" onerror="this.style.display='none';">`
                    : `<div class="cell-avatar-placeholder"><i class="fas fa-user"></i></div>`}
                    </td>
                    <td><div class="cell-name">${esc(t.name)}</div></td>
                    <td><small>${esc(t.ri_id || '—')}</small></td>
                    <td><small>${esc(t.email || '—')}</small></td>
                    <td><small>${esc(t.area_of_expertise || '—')}</small></td>
                    <td><small>${esc(t.certified_year || '—')}</small></td>
                    <td>
                        <span class="badge badge-${t.is_active ? 'success' : 'gray'}">
                            ${t.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <div class="cell-actions">
                            <button class="action-btn edit" title="Edit" onclick="AdminMembers.editTrainer('${t.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" title="Delete" onclick="AdminMembers.deleteTrainer('${t.id}', '${esc(t.name)}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        openAddTrainer() {
            auth.openModal(
                '<i class="fas fa-plus"></i> Add Trainer',
                this.buildTrainerForm(null),
                async (close) => await this.saveTrainer(null, close),
                { saveLabel: '<i class="fas fa-plus"></i> Add Trainer' }
            );
            setTimeout(() => this.initTrainerFormListeners(), 200);
        },

        async editTrainer(trainerId) {
            const { data: t } = await db.from('trainers').select('*').eq('id', trainerId).single();
            if (!t) return;

            auth.openModal(
                `<i class="fas fa-edit"></i> Edit Trainer - ${esc(t.name)}`,
                this.buildTrainerForm(t),
                async (close) => await this.saveTrainer(trainerId, close),
                { saveLabel: '<i class="fas fa-save"></i> Save Changes' }
            );
            setTimeout(() => this.initTrainerFormListeners(t), 200);
        },

        buildTrainerForm(t) {
            return `
            <div class="modal-form-grid">
                <div class="form-group">
                    <label>Full Name <span class="req">*</span></label>
                    <input type="text" id="tr-name" value="${esc(t?.name || '')}" placeholder="Trainer name" required>
                </div>
                <div class="form-group">
                    <label>RI ID</label>
                    <input type="text" id="tr-ri-id" value="${esc(t?.ri_id || '')}" placeholder="RI Member ID">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="tr-email" value="${esc(t?.email || '')}" placeholder="Email address">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" id="tr-phone" value="${esc(t?.phone || '')}" placeholder="Phone number">
                </div>
                <div class="form-group">
                    <label>Area of Expertise</label>
                    <input type="text" id="tr-expertise" value="${esc(t?.area_of_expertise || '')}" placeholder="e.g. Leadership Development">
                </div>
                <div class="form-group">
                    <label>Certified Year</label>
                    <input type="text" id="tr-cert-year" value="${esc(t?.certified_year || '')}" placeholder="e.g. 2022">
                </div>
                <div class="form-group">
                    <label>Display Order</label>
                    <input type="number" id="tr-order" value="${t?.display_order || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="tr-active">
                        <option value="true" ${t?.is_active !== false ? 'selected' : ''}>Active</option>
                        <option value="false" ${t?.is_active === false ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Bio</label>
                    <textarea id="tr-bio" rows="3" placeholder="Brief bio...">${esc(t?.bio || '')}</textarea>
                </div>
                <div class="form-group full-width">
                    <label>Profile Photo</label>
                    ${t?.photo_url ? `<img src="${esc(t.photo_url)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-bottom:8px;" onerror="this.style.display='none';">` : ''}
                    <div class="modal-file-upload">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Upload trainer photo</p>
                        <span>JPG, PNG (Max 3MB)</span>
                        <input type="file" id="tr-photo-file" accept="image/*">
                    </div>
                    <div id="tr-photo-preview"></div>
                </div>
            </div>`;
        },

        initTrainerFormListeners(t) {
            document.getElementById('tr-photo-file')?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => {
                        const p = document.getElementById('tr-photo-preview');
                        if (p) p.innerHTML = `<img src="${ev.target.result}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-top:8px;">`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        },

        async saveTrainer(trainerId, close) {
            const name = document.getElementById('tr-name')?.value.trim();
            if (!name) { toast('Name is required', 'warning'); return; }

            let photoUrl = null;
            if (trainerId) {
                const { data: existing } = await db.from('trainers').select('photo_url').eq('id', trainerId).single();
                photoUrl = existing?.photo_url || null;
            }

            const photoFile = document.getElementById('tr-photo-file')?.files[0];
            if (photoFile) {
                try {
                    const compressed = await window.UnityStorage.compressImage(photoFile, 600, 0.8);
                    const path = `trainer_${Date.now()}.jpg`;
                    photoUrl = await window.UnityStorage.uploadFile('trainers', compressed, path);
                } catch (e) {
                    toast('Photo upload failed', 'warning');
                }
            }

            const payload = {
                name,
                ri_id: document.getElementById('tr-ri-id')?.value.trim() || null,
                email: document.getElementById('tr-email')?.value.trim() || null,
                phone: document.getElementById('tr-phone')?.value.trim() || null,
                area_of_expertise: document.getElementById('tr-expertise')?.value.trim() || null,
                certified_year: document.getElementById('tr-cert-year')?.value.trim() || null,
                bio: document.getElementById('tr-bio')?.value.trim() || null,
                display_order: parseInt(document.getElementById('tr-order')?.value) || 0,
                is_active: document.getElementById('tr-active')?.value === 'true',
                photo_url: photoUrl
            };

            try {
                if (trainerId) {
                    await db.from('trainers').update(payload).eq('id', trainerId);
                    toast('Trainer updated!', 'success');
                } else {
                    await db.from('trainers').insert(payload);
                    toast('Trainer added!', 'success');
                }
                close();
                await this.fetchTrainers();
            } catch (e) {
                toast('Failed to save trainer', 'error');
            }
        },

        async deleteTrainer(trainerId, name) {
            auth.openConfirm('Delete Trainer', `Delete "${name}"?`, async () => {
                try {
                    await db.from('trainers').delete().eq('id', trainerId);
                    toast('Trainer deleted', 'success');
                    await this.fetchTrainers();
                } catch (e) {
                    toast('Failed to delete', 'error');
                }
            });
        }
    };

    // Button listeners
    document.getElementById('add-member-btn')?.addEventListener('click', () => AdminMembers.openAdd());
    document.getElementById('add-leader-btn')?.addEventListener('click', () => AdminMembers.openAddLeader());
    document.getElementById('add-trainer-btn')?.addEventListener('click', () => AdminMembers.openAddTrainer());
    document.getElementById('export-members-btn')?.addEventListener('click', () => AdminMembers.exportMembers());
    document.getElementById('leader-filter-role')?.addEventListener('change', () => AdminMembers.fetchPastLeaders());

    console.log('%c Members.js loaded ', 'background:#ec4899;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

})();