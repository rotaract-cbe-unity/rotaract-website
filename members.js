/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - MEMBERS MANAGEMENT
   Complete - Zero Bugs - All CRUD functions working
   File: members.js
   ============================================================ */

'use strict';

// ============================================================
// LOAD ADMIN MEMBERS
// ============================================================
async function loadAdminMembers() {
    if (!AppState.currentAdmin || !supabase) return;

    try {
        var tf = document.getElementById('memberTypeFilter');
        var tv = tf ? tf.value : 'all';

        var q = supabase.from('members').select('*')
            .order('is_board_member', { ascending: false })
            .order('full_name', { ascending: true });

        if (tv && tv !== 'all') q = q.eq('membership_type', tv);

        var r = await q;
        if (r.error) throw r.error;

        AppState.members = r.data || [];
        renderAdminMembersTable(AppState.members);

    } catch (err) {
        console.error('loadAdminMembers error:', err);
        showToast('error', 'Error', 'Failed to load members');
    }
}

// ============================================================
// RENDER ADMIN MEMBERS TABLE
// ============================================================
function renderAdminMembersTable(members) {
    var tbody = document.getElementById('membersTableBody');
    if (!tbody) return;

    if (!members || !members.length) {
        tbody.innerHTML = [
            '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-tertiary);">',
            '<i data-lucide="users" style="display:block;margin:0 auto 8px;width:30px;height:30px;opacity:0.5;"></i>',
            'No members found',
            '</td></tr>'
        ].join('');
        refreshIcons();
        return;
    }

    tbody.innerHTML = members.map(function(m) {
        var photoSrc = m.photo_url && m.photo_url.startsWith('http') ? m.photo_url : getDefaultAvatar(m.full_name);

        return [
            '<tr>',
            '<td>',
            '<img src="' + escapeHtml(photoSrc) + '" class="table-photo" alt="' + escapeHtml(m.full_name) + '" ',
            'onerror="this.src=\'' + getDefaultAvatar(m.full_name) + '\'">',
            '</td>',
            '<td>',
            '<div style="font-weight:600;">' + escapeHtml(m.full_name) + '</div>',
            m.is_board_member ? '<span class="badge badge-primary" style="font-size:0.6rem;">Board</span>' : '',
            !m.is_active ? '<span class="badge badge-danger" style="font-size:0.6rem;margin-left:4px;">Inactive</span>' : '',
            '</td>',
            '<td>',
            '<div style="font-weight:500;">' + escapeHtml(m.board_position || m.designation || 'Member') + '</div>',
            '<div style="font-size:0.72rem;color:var(--text-tertiary);">' + capitalizeFirst(m.membership_type || 'active') + '</div>',
            '</td>',
            '<td>' + escapeHtml(m.ri_id || '-') + '</td>',
            '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">',
            m.email ? '<a href="mailto:' + escapeHtml(m.email) + '" style="color:var(--primary);font-size:0.78rem;">' + escapeHtml(m.email) + '</a>' : '-',
            '</td>',
            '<td>',
            m.phone ? '<a href="tel:' + escapeHtml(m.phone) + '" style="color:var(--primary);font-size:0.82rem;">' + escapeHtml(m.phone) + '</a>' : '-',
            '</td>',
            '<td>',
            m.blood_group ? '<span class="badge badge-danger">' + escapeHtml(m.blood_group) + '</span>' : '-',
            '</td>',
            '<td>' + escapeHtml(m.area || '-') + '</td>',
            '<td>',
            '<div class="table-actions">',
            '<button class="btn-icon" onclick="openMemberForm(\'' + m.id + '\')" title="Edit"><i data-lucide="edit-2"></i></button>',
            '<button class="btn-icon" onclick="viewMemberFullDetail(\'' + m.id + '\')" title="View Profile"><i data-lucide="eye"></i></button>',
            '<button class="btn-icon" onclick="toggleMemberStatus(\'' + m.id + '\',' + m.is_active + ')" ',
            'title="' + (m.is_active ? 'Deactivate' : 'Activate') + '" ',
            'style="color:' + (m.is_active ? 'var(--warning)' : 'var(--success)') + ';">',
            '<i data-lucide="' + (m.is_active ? 'user-x' : 'user-check') + '"></i>',
            '</button>',
            (isSuperAdmin() || isPresident()) ? '<button class="btn-icon" onclick="deleteMember(\'' + m.id + '\')" title="Delete" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>' : '',
            '</div>',
            '</td>',
            '</tr>'
        ].join('');
    }).join('');

    refreshIcons();
}

// ============================================================
// SEARCH MEMBERS
// ============================================================
var searchMembers = debounce(function() {
    var term = document.getElementById('memberSearch');
    var search = term ? term.value.trim().toLowerCase() : '';

    if (!search) {
        renderAdminMembersTable(AppState.members);
        return;
    }

    var filtered = (AppState.members || []).filter(function(m) {
        return (
            (m.full_name        && m.full_name.toLowerCase().includes(search))    ||
            (m.email            && m.email.toLowerCase().includes(search))         ||
            (m.phone            && m.phone.includes(search))                       ||
            (m.ri_id            && m.ri_id.toLowerCase().includes(search))         ||
            (m.blood_group      && m.blood_group.toLowerCase().includes(search))   ||
            (m.area             && m.area.toLowerCase().includes(search))          ||
            (m.designation      && m.designation.toLowerCase().includes(search))   ||
            (m.board_position   && m.board_position.toLowerCase().includes(search))||
            (m.profession       && m.profession.toLowerCase().includes(search))
        );
    });

    renderAdminMembersTable(filtered);
}, 300);

// ============================================================
// VIEW MEMBER FULL DETAIL (Admin)
// ============================================================
function viewMemberFullDetail(memberId) {
    var m = (AppState.members || []).find(function(x) { return x.id === memberId; });
    if (!m) return;

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="user"></i>Member Profile: ' + escapeHtml(m.full_name);

    var hasPhoto = m.photo_url && m.photo_url.startsWith('http');
    var photoSrc = hasPhoto ? m.photo_url : getDefaultAvatar(m.full_name);

    var fields = [
        ['hash',          'RI ID',            m.ri_id],
        ['mail',          'Email',             m.email],
        ['phone',         'Phone',             m.phone],
        ['droplet',       'Blood Group',       m.blood_group],
        ['calendar',      'Date of Birth',     m.date_of_birth ? formatDate(m.date_of_birth) : null],
        ['map-pin',       'Area',              m.area],
        ['briefcase',     'Profession',        m.profession],
        ['building',      'Company',           m.company],
        ['folder',        'Portfolio',         m.portfolio],
        ['calendar-check','Join Date',         m.join_date ? formatDate(m.join_date) : null],
        ['clock',         'Year of Service',   m.year_of_service],
        ['shield',        'Board Position',    m.board_position],
        ['phone-call',    'Emergency Contact', m.emergency_contact],
        ['home',          'Address',           m.address],
        ['eye',           'Show on Website',   m.show_on_website ? 'Yes' : 'No'],
        ['bell',          'Email Notifications', m.email_notifications ? 'Enabled' : 'Disabled']
    ].filter(function(f) { return f[2] !== null && f[2] !== undefined && f[2] !== ''; });

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">',

            // Photo & basic info
            '<div style="text-align:center;flex-shrink:0;min-width:180px;">',
            '<div style="width:140px;height:140px;border-radius:50%;margin:0 auto 16px;overflow:hidden;',
            'border:4px solid var(--primary);background:var(--bg-tertiary);">',
            '<img src="' + escapeHtml(photoSrc) + '" alt="' + escapeHtml(m.full_name) + '" ',
            'style="width:100%;height:100%;object-fit:cover;" ',
            'onerror="this.src=\'' + getDefaultAvatar(m.full_name) + '\'">',
            '</div>',
            '<h3 style="font-size:1rem;font-weight:800;margin-bottom:4px;">' + escapeHtml(m.full_name) + '</h3>',
            '<p style="color:var(--primary);font-weight:600;font-size:0.88rem;">' + escapeHtml(m.board_position || m.designation || 'Member') + '</p>',
            '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px;">',
            m.is_board_member ? '<span class="badge badge-primary">Board Member</span>' : '',
            '<span class="badge ' + (m.is_active ? 'badge-success' : 'badge-danger') + '">' + (m.is_active ? 'Active' : 'Inactive') + '</span>',
            '<span class="badge badge-info">' + capitalizeFirst(m.membership_type || 'active') + '</span>',
            '</div></div>',

            // Details grid
            '<div style="flex:1;min-width:280px;">',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">',
            fields.map(function(f) {
                return '<div style="padding:9px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--border-light);">' +
                    '<div style="font-size:0.68rem;color:var(--text-tertiary);display:flex;align-items:center;gap:4px;margin-bottom:3px;">' +
                    '<i data-lucide="' + f[0] + '" style="width:11px;height:11px;"></i>' + f[1] + '</div>' +
                    '<div style="font-size:0.82rem;font-weight:600;word-break:break-word;">' + escapeHtml(String(f[2])) + '</div>' +
                    '</div>';
            }).join(''),
            '</div></div></div>',

            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:22px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Close</button>',
            '<button class="btn btn-primary" onclick="closeModal(\'formModal\');openMemberForm(\'' + m.id + '\')"><i data-lucide="edit-2"></i>Edit Member</button>',
            '</div>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();
}

// ============================================================
// OPEN MEMBER FORM (Create / Edit)
// ============================================================
function openMemberForm(memberId) {
    memberId = memberId || '';
    var m = memberId ? (AppState.members || []).find(function(x) { return x.id === memberId; }) : null;
    var isEdit = !!m;

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');

    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (isEdit ? 'edit-2' : 'user-plus') + '"></i>' + (isEdit ? 'Edit Member' : 'Add New Member');

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="saveMember(event,\'' + memberId + '\')">',

            // Personal Information
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="user" style="width:16px;height:16px;"></i>Personal Information</h4>',

            '<div class="form-group"><label><i data-lucide="user"></i>Full Name *</label>',
            '<input type="text" id="memName" required placeholder="Enter full name" value="' + (isEdit ? escapeHtml(m.full_name) : '') + '"></div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="mail"></i>Email</label>',
            '<input type="email" id="memEmail" placeholder="email@example.com" value="' + (isEdit && m.email ? escapeHtml(m.email) : '') + '" autocomplete="email"></div>',
            '<div class="form-group"><label><i data-lucide="phone"></i>Phone</label>',
            '<input type="tel" id="memPhone" placeholder="+91 XXXXX XXXXX" value="' + (isEdit && m.phone ? escapeHtml(m.phone) : '') + '" autocomplete="tel"></div>',
            '</div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="calendar"></i>Date of Birth</label>',
            '<input type="date" id="memDob" value="' + (isEdit && m.date_of_birth ? formatDateForInput(m.date_of_birth) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="droplet"></i>Blood Group</label>',
            '<select id="memBlood">',
            '<option value="">Select</option>',
            ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(function(bg) {
                return '<option value="' + bg + '"' + (isEdit && m.blood_group === bg ? ' selected' : '') + '>' + bg + '</option>';
            }).join(''),
            '</select></div>',
            '</div>',

            '<div class="separator"></div>',

            // Rotary Details
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="shield" style="width:16px;height:16px;"></i>Rotary Details</h4>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="hash"></i>RI ID</label>',
            '<input type="text" id="memRiId" placeholder="Rotary International ID" value="' + (isEdit && m.ri_id ? escapeHtml(m.ri_id) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="tag"></i>Designation</label>',
            '<input type="text" id="memDesignation" placeholder="e.g. Member, Director" value="' + (isEdit && m.designation ? escapeHtml(m.designation) : 'Member') + '"></div>',
            '</div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="crown"></i>Board Position</label>',
            '<select id="memBoardPosition">',
            '<option value="">None (Regular Member)</option>',
            [
                'President','Immediate Past President','Secretary','Joint Secretary','Treasurer',
                'Club Service Director','Community Service Director','Professional Service Director',
                'International Service Director','District Priority Director',
                'Sergeant at Arms','Public Relations Officer','Editor','Webmaster','Trainer'
            ].map(function(pos) {
                return '<option value="' + pos + '"' + (isEdit && m.board_position === pos ? ' selected' : '') + '>' + pos + '</option>';
            }).join(''),
            '</select></div>',
            '<div class="form-group"><label><i data-lucide="layers"></i>Membership Type</label>',
            '<select id="memType">',
            [['active','Active'],['associate','Associate'],['honorary','Honorary'],['alumni','Alumni'],['inactive','Inactive']].map(function(t) {
                return '<option value="' + t[0] + '"' + (isEdit && m.membership_type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
            }).join(''),
            '</select></div>',
            '</div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="folder"></i>Portfolio</label>',
            '<input type="text" id="memPortfolio" placeholder="e.g. Social Media, Events" value="' + (isEdit && m.portfolio ? escapeHtml(m.portfolio) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="clock"></i>Year of Service</label>',
            '<input type="text" id="memYearService" placeholder="e.g. 2023-24" value="' + (isEdit && m.year_of_service ? escapeHtml(m.year_of_service) : '') + '"></div>',
            '</div>',

            '<div class="separator"></div>',

            // Professional Details
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="briefcase" style="width:16px;height:16px;"></i>Professional Details</h4>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="briefcase"></i>Profession</label>',
            '<input type="text" id="memProfession" placeholder="Your profession" value="' + (isEdit && m.profession ? escapeHtml(m.profession) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="building"></i>Company / Organization</label>',
            '<input type="text" id="memCompany" placeholder="Company name" value="' + (isEdit && m.company ? escapeHtml(m.company) : '') + '"></div>',
            '</div>',

            '<div class="separator"></div>',

            // Location & Other
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="map-pin" style="width:16px;height:16px;"></i>Location and Other Details</h4>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="map-pin"></i>Area</label>',
            '<input type="text" id="memArea" placeholder="e.g. RS Puram, Gandhipuram" value="' + (isEdit && m.area ? escapeHtml(m.area) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="calendar-check"></i>Join Date</label>',
            '<input type="date" id="memJoinDate" value="' + (isEdit && m.join_date ? formatDateForInput(m.join_date) : new Date().toISOString().split('T')[0]) + '"></div>',
            '</div>',

            '<div class="form-group"><label><i data-lucide="home"></i>Address</label>',
            '<textarea id="memAddress" rows="2" placeholder="Full address">' + (isEdit && m.address ? escapeHtml(m.address) : '') + '</textarea></div>',

            '<div class="form-group"><label><i data-lucide="phone-call"></i>Emergency Contact</label>',
            '<input type="text" id="memEmergency" placeholder="Emergency contact name and number" value="' + (isEdit && m.emergency_contact ? escapeHtml(m.emergency_contact) : '') + '"></div>',

            '<div class="separator"></div>',

            // Photo
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="camera" style="width:16px;height:16px;"></i>Photo</h4>',

            '<div class="form-group"><label><i data-lucide="upload-cloud"></i>Member Photo</label>',
            '<div class="photo-upload-area" style="min-height:100px;">',
            '<input type="file" id="memPhotoFile" accept="image/*" onchange="previewMemberPhoto(this)">',
            '<div id="memPhotoPreviewContainer">',
            isEdit && m.photo_url && m.photo_url.startsWith('http') ?
                '<img src="' + escapeHtml(m.photo_url) + '" style="max-width:120px;max-height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);" onerror="this.style.display=\'none\'">' :
                '<div class="photo-placeholder"><i data-lucide="upload-cloud" style="width:32px;height:32px;"></i><span>Click or drag to upload</span><small>Max 5MB, JPG or PNG</small></div>',
            '</div></div></div>',

            '<div class="separator"></div>',

            // Settings
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="settings" style="width:16px;height:16px;"></i>Settings</h4>',

            '<div style="display:flex;gap:24px;flex-wrap:wrap;">',

            '<div style="display:flex;align-items:center;gap:10px;">',
            '<label class="toggle-switch"><input type="checkbox" id="memIsBoard" ' + (isEdit && m.is_board_member ? 'checked' : '') + '><span class="toggle-slider"></span></label>',
            '<span style="font-size:0.85rem;font-weight:500;">Board Member</span></div>',

            '<div style="display:flex;align-items:center;gap:10px;">',
            '<label class="toggle-switch"><input type="checkbox" id="memIsActive" ' + (!isEdit || m.is_active ? 'checked' : '') + '><span class="toggle-slider"></span></label>',
            '<span style="font-size:0.85rem;font-weight:500;">Active</span></div>',

            '<div style="display:flex;align-items:center;gap:10px;">',
            '<label class="toggle-switch"><input type="checkbox" id="memShowWebsite" ' + (!isEdit || m.show_on_website ? 'checked' : '') + '><span class="toggle-slider"></span></label>',
            '<span style="font-size:0.85rem;font-weight:500;">Show on Website</span></div>',

            '<div style="display:flex;align-items:center;gap:10px;">',
            '<label class="toggle-switch"><input type="checkbox" id="memEmailNotify" ' + (!isEdit || m.email_notifications !== false ? 'checked' : '') + '><span class="toggle-slider"></span></label>',
            '<span style="font-size:0.85rem;font-weight:500;">Email Notifications</span></div>',

            '</div>',

            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button>',
            '<button type="submit" class="btn btn-primary" id="saveMemberBtn"><i data-lucide="save"></i>' + (isEdit ? 'Update Member' : 'Add Member') + '</button>',
            '</div></form>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();
}

// ============================================================
// PREVIEW MEMBER PHOTO
// ============================================================
function previewMemberPhoto(input) {
    var container = document.getElementById('memPhotoPreviewContainer');
    if (!input || !input.files || !input.files[0] || !container) return;

    var file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Maximum photo size is 5MB');
        input.value = '';
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('error', 'Invalid File', 'Please select a JPG or PNG image');
        input.value = '';
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        container.innerHTML = '<img src="' + e.target.result + '" style="max-width:120px;max-height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);">';
    };
    reader.readAsDataURL(file);
}

// ============================================================
// SAVE MEMBER
// ============================================================
async function saveMember(formEvent, memberId) {
    formEvent.preventDefault();

    memberId = memberId || '';
    var isEdit = memberId.length > 5;
    var saveBtn = document.getElementById('saveMemberBtn');

    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    function gc(id) { var el = document.getElementById(id); return el ? el.checked : false; }

    var fullName = gv('memName');
    if (!fullName) { showToast('error', 'Required', 'Full name is required'); return; }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span style="display:inline-flex;gap:6px;align-items:center;"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;"></span>Saving...</span>';
    }

    try {
        if (!supabase) throw new Error('Database not connected');

        // Handle photo upload
        var photoFile = document.getElementById('memPhotoFile');
        var photoFileObj = photoFile && photoFile.files && photoFile.files[0] ? photoFile.files[0] : null;
        var photoUrl = isEdit ? ((AppState.members || []).find(function(x) { return x.id === memberId; }) || {}).photo_url || null : null;

        if (photoFileObj) {
            var filePath = generateFilePath('member-photos', photoFileObj.name);
            var uploaded = await uploadFile('members', filePath, photoFileObj);
            if (uploaded) photoUrl = uploaded;
            else showToast('warning', 'Photo', 'Photo upload failed, saving without new photo');
        }

        var boardPosition = gv('memBoardPosition') || null;
        var isBoard = gc('memIsBoard');

        var email = gv('memEmail') || null;

        // Check duplicate email (warn but allow)
        if (email && supabase) {
            var dup = await supabase.from('members').select('id').eq('email', email).neq('id', memberId || '00000000-0000-0000-0000-000000000000').single();
            if (dup.data) showToast('warning', 'Duplicate Email', 'Another member has this email. Proceeding anyway.');
        }

        var memberData = {
            full_name:          fullName,
            email:              email,
            phone:              gv('memPhone') || null,
            date_of_birth:      gv('memDob') || null,
            blood_group:        gv('memBlood') || null,
            ri_id:              gv('memRiId') || null,
            designation:        gv('memDesignation') || 'Member',
            board_position:     isBoard ? boardPosition : null,
            membership_type:    gv('memType') || 'active',
            portfolio:          gv('memPortfolio') || null,
            year_of_service:    gv('memYearService') || null,
            profession:         gv('memProfession') || null,
            company:            gv('memCompany') || null,
            area:               gv('memArea') || null,
            join_date:          gv('memJoinDate') || null,
            address:            gv('memAddress') || null,
            emergency_contact:  gv('memEmergency') || null,
            is_board_member:    isBoard,
            is_active:          gc('memIsActive'),
            show_on_website:    gc('memShowWebsite'),
            email_notifications:gc('memEmailNotify'),
            photo_url:          photoUrl,
            updated_at:         new Date().toISOString()
        };

        if (isEdit) {
            var upd = await supabase.from('members').update(memberData).eq('id', memberId);
            if (upd.error) throw upd.error;
        } else {
            memberData.created_at = new Date().toISOString();
            var ins = await supabase.from('members').insert(memberData);
            if (ins.error) throw ins.error;
        }

        await logActivity(isEdit ? 'update_member' : 'create_member', 'members', memberId || null, { name: fullName, board: isBoard });

        closeModal('formModal');
        showToast('success', 'Success', 'Member ' + (isEdit ? 'updated' : 'added') + ' successfully');
        await loadAdminMembers();
        await loadPublicMembers();

    } catch (err) {
        console.error('saveMember error:', err);
        showToast('error', 'Error', err.message || 'Failed to save member');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="save"></i>' + (memberId.length > 5 ? 'Update Member' : 'Add Member');
            refreshIcons();
        }
    }
}

// ============================================================
// TOGGLE MEMBER STATUS
// ============================================================
async function toggleMemberStatus(memberId, currentStatus) {
    var action = currentStatus ? 'deactivate' : 'activate';
    var confirmed = await confirmAction(
        capitalizeFirst(action) + ' Member?',
        'Are you sure you want to ' + action + ' this member?',
        'Yes, ' + capitalizeFirst(action)
    );
    if (!confirmed) return;

    try {
        if (!supabase) return;
        var r = await supabase.from('members').update({ is_active: !currentStatus, updated_at: new Date().toISOString() }).eq('id', memberId);
        if (r.error) throw r.error;
        await logActivity(action + '_member', 'members', memberId, {});
        showToast('success', 'Success', 'Member ' + action + 'd successfully');
        await loadAdminMembers();
        await loadPublicMembers();
    } catch (err) {
        console.error('toggleMemberStatus error:', err);
        showToast('error', 'Error', err.message);
    }
}

// ============================================================
// DELETE MEMBER
// ============================================================
async function deleteMember(memberId) {
    if (!isSuperAdmin() && !isPresident()) {
        showToast('error', 'Access Denied', 'Only Super Admin or President can delete members');
        return;
    }

    var confirmed = await confirmAction('Delete Member?', 'This will permanently remove the member. This action cannot be undone.', 'Yes, Delete');
    if (!confirmed) return;

    try {
        if (!supabase) return;
        var r = await supabase.from('members').delete().eq('id', memberId);
        if (r.error) throw r.error;
        await logActivity('delete_member', 'members', memberId, {});
        showToast('success', 'Deleted', 'Member deleted successfully');
        await loadAdminMembers();
        await loadPublicMembers();
    } catch (err) {
        console.error('deleteMember error:', err);
        showToast('error', 'Error', err.message);
    }
}

// ============================================================
// MEMBERSHIP APPLICATIONS MANAGEMENT
// ============================================================
async function loadAdminApplications() {
    if (!AppState.currentAdmin || !supabase) return;

    try {
        var sf = document.getElementById('appStatusFilter');
        var sv = sf ? sf.value : 'all';

        var q = supabase.from('membership_applications').select('*').order('created_at', { ascending: false });
        if (sv && sv !== 'all') q = q.eq('status', sv);

        var r = await q;
        if (r.error) throw r.error;

        AppState.applications = r.data || [];
        renderAdminApplicationsTable(AppState.applications);

        // Update badge
        var pending = (AppState.applications || []).filter(function(a) { return a.status === 'pending'; });
        var badge = document.getElementById('appBadge');
        if (badge) { badge.textContent = pending.length; badge.style.display = pending.length > 0 ? 'inline' : 'none'; }

    } catch (err) {
        console.error('loadAdminApplications error:', err);
        showToast('error', 'Error', 'Failed to load applications');
    }
}

// ============================================================
// RENDER APPLICATIONS TABLE
// ============================================================
function renderAdminApplicationsTable(applications) {
    var tbody = document.getElementById('applicationsTableBody');
    if (!tbody) return;

    if (!applications || !applications.length) {
        tbody.innerHTML = [
            '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-tertiary);">',
            '<i data-lucide="user-plus" style="display:block;margin:0 auto 8px;width:30px;height:30px;opacity:0.5;"></i>',
            'No applications found',
            '</td></tr>'
        ].join('');
        refreshIcons();
        return;
    }

    tbody.innerHTML = applications.map(function(app) {
        var photoSrc = app.photo_url && app.photo_url.startsWith('http') ? app.photo_url : getDefaultAvatar(app.full_name);
        var statusClass = app.status === 'pending' ? 'status-proposed' : app.status === 'approved' ? 'status-approved' : 'status-cancelled';

        return [
            '<tr>',
            '<td><img src="' + escapeHtml(photoSrc) + '" class="table-photo" alt="' + escapeHtml(app.full_name) + '" onerror="this.src=\'' + getDefaultAvatar(app.full_name) + '\'"></td>',
            '<td><strong>' + escapeHtml(app.full_name) + '</strong></td>',
            '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">',
            app.email ? '<a href="mailto:' + escapeHtml(app.email) + '" style="color:var(--primary);font-size:0.78rem;">' + escapeHtml(app.email) + '</a>' : '-',
            '</td>',
            '<td><a href="tel:' + escapeHtml(app.phone || '') + '" style="color:var(--primary);font-size:0.82rem;">' + escapeHtml(app.phone || '-') + '</a></td>',
            '<td>' + (app.date_of_birth ? formatDateShort(app.date_of_birth) : '-') + '</td>',
            '<td>' + (app.blood_group ? '<span class="badge badge-danger">' + escapeHtml(app.blood_group) + '</span>' : '-') + '</td>',
            '<td><span class="table-status ' + statusClass + '">' + capitalizeFirst(app.status) + '</span></td>',
            '<td style="font-size:0.78rem;">' + getRelativeTime(app.created_at) + '</td>',
            '<td><div class="table-actions">',
            '<button class="btn-icon" onclick="viewApplicationDetail(\'' + app.id + '\')" title="View Details"><i data-lucide="eye"></i></button>',
            app.status === 'pending' ? [
                '<button class="btn-icon" onclick="approveApplication(\'' + app.id + '\')" title="Approve" style="color:var(--success);"><i data-lucide="check-circle"></i></button>',
                '<button class="btn-icon" onclick="rejectApplication(\'' + app.id + '\')" title="Reject" style="color:var(--danger);"><i data-lucide="x-circle"></i></button>'
            ].join('') : '',
            app.status === 'approved' ? '<button class="btn-icon" onclick="convertApplicationToMember(\'' + app.id + '\')" title="Add as Member" style="color:var(--primary);"><i data-lucide="user-plus"></i></button>' : '',
            '</div></td></tr>'
        ].join('');
    }).join('');

    refreshIcons();
}

// ============================================================
// VIEW APPLICATION DETAIL
// ============================================================
async function viewApplicationDetail(appId) {
    var app = (AppState.applications || []).find(function(a) { return a.id === appId; });
    if (!app && supabase) {
        var r = await supabase.from('membership_applications').select('*').eq('id', appId).single();
        if (!r.error && r.data) app = r.data;
    }
    if (!app) { showToast('error', 'Error', 'Application not found'); return; }

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="user-plus"></i>Application: ' + escapeHtml(app.full_name);

    var hasPhoto = app.photo_url && app.photo_url.startsWith('http');
    var photoSrc = hasPhoto ? app.photo_url : getDefaultAvatar(app.full_name);

    var fields = [
        ['mail',         'Email',         app.email],
        ['phone',        'Phone',         app.phone],
        ['calendar',     'Date of Birth', app.date_of_birth ? formatDate(app.date_of_birth) : null],
        ['droplet',      'Blood Group',   app.blood_group],
        ['briefcase',    'Profession',    app.profession],
        ['map-pin',      'Area',          app.area],
        ['home',         'Address',       app.address],
        ['user-check',   'Reference',     app.reference],
        ['clock',        'Applied',       getRelativeTime(app.created_at)]
    ].filter(function(f) { return f[2]; });

    var statusClass = app.status === 'pending' ? 'status-proposed' : app.status === 'approved' ? 'status-approved' : 'status-cancelled';

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<div style="display:flex;gap:22px;flex-wrap:wrap;">',

            '<div style="text-align:center;flex-shrink:0;min-width:160px;">',
            '<div style="width:120px;height:120px;border-radius:50%;margin:0 auto 12px;overflow:hidden;border:3px solid var(--primary);background:var(--bg-tertiary);">',
            '<img src="' + escapeHtml(photoSrc) + '" style="width:100%;height:100%;object-fit:cover;" ',
            'onclick="openImageViewer([\'' + escapeHtml(app.photo_url || '') + '\'],0)" style="cursor:pointer;" ',
            'onerror="this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%\\\' ><i data-lucide=\\\'user\\\' style=\\\'width:48px;height:48px;color:var(--text-tertiary)\\\' ></i></div>\'">',
            '</div>',
            '<span class="table-status ' + statusClass + '">' + capitalizeFirst(app.status) + '</span>',
            '</div>',

            '<div style="flex:1;min-width:280px;">',
            '<h3 style="font-size:1.05rem;font-weight:800;margin-bottom:16px;">' + escapeHtml(app.full_name) + '</h3>',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">',
            fields.map(function(f) {
                return '<div style="padding:9px;background:var(--bg-card);border:1px solid var(--border-light);border-radius:var(--radius-sm);">' +
                    '<div style="font-size:0.68rem;color:var(--text-tertiary);display:flex;align-items:center;gap:4px;margin-bottom:3px;"><i data-lucide="' + f[0] + '" style="width:11px;height:11px;"></i>' + f[1] + '</div>' +
                    '<div style="font-size:0.82rem;font-weight:700;word-break:break-word;">' + escapeHtml(String(f[2])) + '</div>' +
                    '</div>';
            }).join(''),
            '</div>',

            app.reason_to_join ? [
                '<div style="margin-top:14px;padding:13px;background:rgba(0,87,183,0.06);border:1px solid rgba(0,87,183,0.12);border-radius:var(--radius-sm);">',
                '<div style="font-size:0.75rem;font-weight:700;color:var(--primary);margin-bottom:6px;">Reason to Join</div>',
                '<p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;">' + escapeHtml(app.reason_to_join) + '</p>',
                '</div>'
            ].join('') : '',

            app.review_notes ? [
                '<div style="margin-top:10px;padding:13px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:var(--radius-sm);">',
                '<div style="font-size:0.75rem;font-weight:700;color:var(--warning);margin-bottom:4px;">Review Notes</div>',
                '<p style="font-size:0.85rem;color:var(--text-secondary);">' + escapeHtml(app.review_notes) + '</p>',
                '</div>'
            ].join('') : '',

            '</div></div>',

            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:22px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Close</button>',
            app.status === 'pending' ? [
                '<button class="btn btn-danger" onclick="closeModal(\'formModal\');rejectApplication(\'' + app.id + '\')"><i data-lucide="x-circle"></i>Reject</button>',
                '<button class="btn btn-success" onclick="closeModal(\'formModal\');approveApplication(\'' + app.id + '\')"><i data-lucide="check-circle"></i>Approve</button>'
            ].join('') : '',
            app.status === 'approved' ? '<button class="btn btn-primary" onclick="closeModal(\'formModal\');convertApplicationToMember(\'' + app.id + '\')"><i data-lucide="user-plus"></i>Add as Member</button>' : '',
            '</div>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();
}

// ============================================================
// APPROVE APPLICATION
// ============================================================
async function approveApplication(appId) {
    var confirmed = await confirmAction('Approve Application?', 'The applicant will be notified of approval.', 'Yes, Approve');
    if (!confirmed) return;

    try {
        if (!supabase) return;
        var upd = await supabase.from('membership_applications').update({
            status: 'approved',
            reviewed_by: AppState.currentAdmin ? AppState.currentAdmin.id : null,
            reviewed_at: new Date().toISOString()
        }).eq('id', appId);
        if (upd.error) throw upd.error;

        // Send approval mail
        var appR = await supabase.from('membership_applications').select('*').eq('id', appId).single();
        if (!appR.error && appR.data && appR.data.email) {
            var app = appR.data;
            var subject = 'Welcome to Rotaract Club of Coimbatore Unity!';
            var body = [
                'Dear ' + app.full_name + ',',
                '',
                'We are delighted to inform you that your membership application to',
                'Rotaract Club of Coimbatore Unity has been APPROVED!',
                '',
                'Welcome to the family!',
                '',
                'CLUB DETAILS:',
                '============================================================',
                'Club Name : Rotaract Club of Coimbatore Unity',
                'Parent    : Rotary Club of Coimbatore East',
                'District  : Rotary International District 3206 (Coimbatore | Pallakkad)',
                'Club ID   : 91594',
                'Chartered : 21st April 2014',
                '============================================================',
                '',
                'NEXT STEPS:',
                '1. Attend the next club meeting',
                '2. Connect with your fellow Rotaractors',
                '3. Follow us on social media @rotaractunity',
                '4. Check our website for upcoming events',
                '',
                'Together, we serve!',
                '',
                'Regards,',
                'Rotaract Club of Coimbatore Unity',
                'Family of Rotary Club of Coimbatore East',
                'Rotary International District 3206 (Coimbatore | Pallakkad)',
                'Email: rc.cbeunity@gmail.com'
            ].join('\n');

            await supabase.from('notification_queue').insert({
                notification_type: 'membership_approved',
                recipient_type: 'individual',
                recipient_emails: [app.email],
                subject: subject,
                body: body,
                html_body: body.replace(/\n/g, '<br>'),
                status: 'queued',
                created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null
            });

            await supabase.from('mail_log').insert({
                mail_type: 'membership_approved',
                recipient: app.email,
                subject: subject,
                status: 'queued'
            });
        }

        await logActivity('approve_application', 'membership_applications', appId, {});
        showToast('success', 'Approved', 'Application approved. Welcome email queued.');
        await loadAdminApplications();

    } catch (err) {
        console.error('approveApplication error:', err);
        showToast('error', 'Error', err.message);
    }
}

// ============================================================
// REJECT APPLICATION
// ============================================================
async function rejectApplication(appId) {
    var result = window.Swal ? await Swal.fire({
        title: 'Reject Application?',
        input: 'textarea',
        inputLabel: 'Reason (optional)',
        inputPlaceholder: 'Enter reason for rejection...',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Reject',
        cancelButtonText: 'Cancel',
        background: AppState.theme === 'dark' ? '#1a1a36' : '#ffffff',
        color: AppState.theme === 'dark' ? '#f0f0f5' : '#1a1a2e'
    }) : { isConfirmed: true, value: '' };

    if (!result.isConfirmed) return;

    try {
        if (!supabase) return;
        var upd = await supabase.from('membership_applications').update({
            status: 'rejected',
            reviewed_by: AppState.currentAdmin ? AppState.currentAdmin.id : null,
            reviewed_at: new Date().toISOString(),
            review_notes: result.value || null
        }).eq('id', appId);
        if (upd.error) throw upd.error;

        await logActivity('reject_application', 'membership_applications', appId, { notes: result.value });
        showToast('info', 'Rejected', 'Application rejected');
        await loadAdminApplications();

    } catch (err) {
        console.error('rejectApplication error:', err);
        showToast('error', 'Error', err.message);
    }
}

// ============================================================
// CONVERT APPLICATION TO MEMBER
// ============================================================
async function convertApplicationToMember(appId) {
    var app = (AppState.applications || []).find(function(a) { return a.id === appId; });
    if (!app && supabase) {
        var r = await supabase.from('membership_applications').select('*').eq('id', appId).single();
        if (!r.error) app = r.data;
    }
    if (!app) { showToast('error', 'Error', 'Application not found'); return; }

    var confirmed = await confirmAction('Add as Member?', 'Create a member profile for ' + app.full_name + '?', 'Yes, Add Member');
    if (!confirmed) return;

    try {
        if (!supabase) return;

        // Check duplicate email
        if (app.email) {
            var dup = await supabase.from('members').select('id').eq('email', app.email).single();
            if (dup.data) { showToast('warning', 'Exists', 'A member with this email already exists'); return; }
        }

        var ins = await supabase.from('members').insert({
            full_name:           app.full_name,
            email:               app.email || null,
            phone:               app.phone || null,
            date_of_birth:       app.date_of_birth || null,
            blood_group:         app.blood_group || null,
            photo_url:           app.photo_url || null,
            profession:          app.profession || null,
            area:                app.area || null,
            address:             app.address || null,
            designation:         'Member',
            membership_type:     'active',
            is_active:           true,
            is_board_member:     false,
            show_on_website:     true,
            email_notifications: true,
            join_date:           new Date().toISOString().split('T')[0],
            created_at:          new Date().toISOString(),
            updated_at:          new Date().toISOString()
        });
        if (ins.error) throw ins.error;

        await supabase.from('membership_applications').update({ status: 'approved', review_notes: 'Converted to member' }).eq('id', appId);
        await logActivity('convert_to_member', 'membership_applications', appId, { name: app.full_name });

        showToast('success', 'Added', app.full_name + ' added as a member');
        await loadAdminApplications();
        await loadAdminMembers();
        await loadPublicMembers();

    } catch (err) {
        console.error('convertApplicationToMember error:', err);
        showToast('error', 'Error', err.message);
    }
}

// ============================================================
// EXPORT MEMBERS TO EXCEL
// ============================================================
function exportMembersToExcel() {
    if (!AppState.members || !AppState.members.length) {
        showToast('info', 'No Data', 'No members to export');
        return;
    }
    if (!window.XLSX) {
        showToast('error', 'Error', 'Excel library not loaded');
        return;
    }

    var data = AppState.members.map(function(m, i) {
        return {
            'S.No':            i + 1,
            'Full Name':       m.full_name || '',
            'RI ID':           m.ri_id || '',
            'Designation':     m.board_position || m.designation || 'Member',
            'Email':           m.email || '',
            'Phone':           m.phone || '',
            'Date of Birth':   m.date_of_birth ? formatDate(m.date_of_birth) : '',
            'Blood Group':     m.blood_group || '',
            'Area':            m.area || '',
            'Profession':      m.profession || '',
            'Company':         m.company || '',
            'Join Date':       m.join_date ? formatDate(m.join_date) : '',
            'Membership Type': capitalizeFirst(m.membership_type || 'active'),
            'Board Member':    m.is_board_member ? 'Yes' : 'No',
            'Status':          m.is_active ? 'Active' : 'Inactive'
        };
    });

    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();

    // Auto column widths
    var colWidths = Object.keys(data[0]).map(function(key) {
        return { wch: Math.max(key.length, Math.max.apply(null, data.map(function(row) { return String(row[key] || '').length; }))) + 2 };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, 'Rotaract_Unity_Members_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showToast('success', 'Exported', 'Members data exported to Excel');
}

// ============================================================
// BLOOD GROUP DIRECTORY EXPORT
// ============================================================
function exportBloodGroupDirectory() {
    if (!AppState.members || !AppState.members.length) {
        showToast('info', 'No Data', 'No members to export');
        return;
    }
    if (!window.XLSX) { showToast('error', 'Error', 'Excel library not loaded'); return; }

    var withBlood = (AppState.members || [])
        .filter(function(m) { return m.blood_group && m.is_active; })
        .sort(function(a, b) { return (a.blood_group || '').localeCompare(b.blood_group || ''); });

    var data = withBlood.map(function(m, i) {
        return { 'S.No': i + 1, 'Blood Group': m.blood_group, 'Full Name': m.full_name, 'Phone': m.phone || '-', 'Area': m.area || '-' };
    });

    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Blood Group Directory');
    XLSX.writeFile(wb, 'Rotaract_Unity_Blood_Directory_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showToast('success', 'Exported', 'Blood group directory exported');
}

// ============================================================
// BIRTHDAY LIST EXPORT
// ============================================================
function exportBirthdayList() {
    if (!AppState.members || !AppState.members.length) {
        showToast('info', 'No Data', 'No members to export');
        return;
    }
    if (!window.XLSX) { showToast('error', 'Error', 'Excel library not loaded'); return; }

    var withDob = (AppState.members || [])
        .filter(function(m) { return m.date_of_birth && m.is_active; })
        .sort(function(a, b) {
            var aD = new Date(a.date_of_birth), bD = new Date(b.date_of_birth);
            if (aD.getMonth() !== bD.getMonth()) return aD.getMonth() - bD.getMonth();
            return aD.getDate() - bD.getDate();
        });

    var data = withDob.map(function(m, i) {
        var d = new Date(m.date_of_birth);
        return {
            'S.No':       i + 1,
            'Full Name':  m.full_name,
            'DOB':        formatDate(m.date_of_birth),
            'Month':      d.toLocaleString('en-IN', { month: 'long' }),
            'Date':       d.getDate(),
            'Phone':      m.phone || '-',
            'Email':      m.email || '-'
        };
    });

    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Birthday List');
    XLSX.writeFile(wb, 'Rotaract_Unity_Birthday_List_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showToast('success', 'Exported', 'Birthday list exported');
}

// ============================================================
// MEMBER STATISTICS
// ============================================================
function getMemberStats() {
    var members = AppState.members || [];
    var bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
    var byBlood = {};
    bloodGroups.forEach(function(bg) {
        byBlood[bg] = members.filter(function(m) { return m.blood_group === bg && m.is_active; }).length;
    });
    return {
        total:     members.length,
        active:    members.filter(function(m) { return m.is_active; }).length,
        inactive:  members.filter(function(m) { return !m.is_active; }).length,
        board:     members.filter(function(m) { return m.is_board_member; }).length,
        withEmail: members.filter(function(m) { return m.email && m.is_active; }).length,
        withPhone: members.filter(function(m) { return m.phone && m.is_active; }).length,
        byBlood:   byBlood,
        byType: {
            active:    members.filter(function(m) { return m.membership_type === 'active'; }).length,
            associate: members.filter(function(m) { return m.membership_type === 'associate'; }).length,
            honorary:  members.filter(function(m) { return m.membership_type === 'honorary'; }).length,
            alumni:    members.filter(function(m) { return m.membership_type === 'alumni'; }).length
        }
    };
}

// ============================================================
// FIND MEMBER HELPERS
// ============================================================
function findMemberByEmail(email) {
    return (AppState.members || []).find(function(m) { return m.email && m.email.toLowerCase() === (email || '').toLowerCase(); });
}

function findMemberByRiId(riId) {
    return (AppState.members || []).find(function(m) { return m.ri_id === riId; });
}

function getMemberDisplayName(m) {
    if (!m) return 'Unknown';
    var role = m.board_position || m.designation || '';
    return role ? m.full_name + ' (' + role + ')' : m.full_name;
}

console.log('%c members.js loaded ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');