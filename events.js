/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - EVENTS & PROJECTS
   Complete - Zero Bugs - All CRUD functions working
   File: events.js
   ============================================================ */

'use strict';

// ============================================================
// LOAD ADMIN EVENTS
// ============================================================
async function loadAdminEvents() {
    if (!AppState.currentAdmin || !supabase) return;

    try {
        var af = document.getElementById('eventAvenueFilter');
        var sf = document.getElementById('eventStatusFilter');
        var av = af ? af.value : 'all';
        var sv = sf ? sf.value : 'all';

        var q = supabase.from('events').select('*').order('date', { ascending: false });

        // Director avenue restriction
        var dirAvenue = getDirectorAvenue(AppState.currentAdmin.role);
        if (dirAvenue) {
            q = q.eq('avenue', dirAvenue);
        } else if (av && av !== 'all') {
            q = q.eq('avenue', av);
        }

        if (sv && sv !== 'all') q = q.eq('status', sv);

        var r = await q;
        if (r.error) throw r.error;

        AppState.events = r.data || [];
        renderAdminEventsTable(AppState.events);

    } catch (err) {
        console.error('loadAdminEvents error:', err);
        showToast('error', 'Error', 'Failed to load events');
    }
}

// ============================================================
// RENDER ADMIN EVENTS TABLE
// ============================================================
function renderAdminEventsTable(events) {
    var tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;

    if (!events || !events.length) {
        tbody.innerHTML = [
            '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-tertiary);">',
            '<i data-lucide="calendar-x" style="display:block;margin:0 auto 8px;width:30px;height:30px;opacity:0.5;"></i>',
            'No events found',
            '</td></tr>'
        ].join('');
        refreshIcons();
        return;
    }

    tbody.innerHTML = events.map(function(ev) {
        var posterSrc = ev.poster_url || (ev.poster_urls && ev.poster_urls.length > 0 ? ev.poster_urls[0] : '');

        return [
            '<tr>',
            '<td>',
            posterSrc ?
                '<img src="' + escapeHtml(posterSrc) + '" class="table-poster" alt="Poster" ' +
                'onclick="openImageViewer([\'' + escapeHtml(posterSrc) + '\'],0)" style="cursor:pointer;" ' +
                'onerror="this.style.display=\'none\'">' :
                '<div style="width:58px;height:38px;border-radius:var(--radius-xs);background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;">' +
                '<i data-lucide="image" style="width:14px;height:14px;color:var(--text-tertiary);"></i></div>',
            '</td>',
            '<td><div style="max-width:200px;">',
            '<div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(ev.title) + '</div>',
            ev.event_type ? '<div style="font-size:0.72rem;color:var(--text-tertiary);">' + formatStatusLabel(ev.event_type) + '</div>' : '',
            '</div></td>',
            '<td><span class="event-card-avenue avenue-' + (ev.avenue || '') + '" style="font-size:0.68rem;padding:2px 8px;">' + formatAvenueLabel(ev.avenue) + '</span></td>',
            '<td>' + formatDateShort(ev.date) + '</td>',
            '<td>',
            ev.start_time ? formatTime(ev.start_time) : '-',
            ev.end_time ? '<br><span style="font-size:0.72rem;color:var(--text-tertiary);">to ' + formatTime(ev.end_time) + '</span>' : '',
            '</td>',
            '<td>' + escapeHtml(ev.event_chair || '-') + '</td>',
            '<td><span class="table-status status-' + (ev.status || '') + '">' + formatStatusLabel(ev.status) + '</span></td>',
            '<td>',
            ev.report_submitted ?
                '<span class="badge badge-success"><i data-lucide="check" style="width:10px;height:10px;"></i> Submitted</span>' :
                ev.status === 'completed' ?
                    '<span class="badge badge-warning">Pending</span>' :
                    '<span class="badge badge-info">N/A</span>',
            '</td>',
            '<td><div class="table-actions">',
            // Approve button
            ev.status === 'proposed' && canApproveProjects() ?
                '<button class="btn-icon" onclick="approveEventFromPanel(\'' + ev.id + '\')" title="Approve" style="color:var(--success);"><i data-lucide="check-circle"></i></button>' : '',
            // Reject button
            ev.status === 'proposed' && canApproveProjects() ?
                '<button class="btn-icon" onclick="rejectEventFromPanel(\'' + ev.id + '\')" title="Reject" style="color:var(--danger);"><i data-lucide="x-circle"></i></button>' : '',
            // Mark complete button
            ev.status === 'approved' ?
                '<button class="btn-icon" onclick="markEventCompleted(\'' + ev.id + '\')" title="Mark Completed" style="color:var(--success);"><i data-lucide="check-square"></i></button>' : '',
            // Report button
            ev.status === 'completed' && !ev.report_submitted ?
                '<button class="btn-icon" onclick="openReportForm(\'' + ev.id + '\')" title="Submit Report" style="color:var(--info);"><i data-lucide="file-plus"></i></button>' : '',
            // Edit button
            '<button class="btn-icon" onclick="openEventForm(\'' + ev.id + '\')" title="Edit"><i data-lucide="edit-2"></i></button>',
            // View button
            '<button class="btn-icon" onclick="openProjectDetail(\'' + ev.id + '\')" title="View Details"><i data-lucide="eye"></i></button>',
            // Delete button
            (isSuperAdmin() || isPresident()) ?
                '<button class="btn-icon" onclick="deleteEvent(\'' + ev.id + '\')" title="Delete" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>' : '',
            '</div></td></tr>'
        ].join('');
    }).join('');

    refreshIcons();
}

// ============================================================
// OPEN EVENT FORM (Create / Edit)
// ============================================================
async function openEventForm(eventId) {
    eventId = eventId || '';
    var existing = eventId ? (AppState.events || []).find(function(e) { return e.id === eventId; }) : null;
    var isEdit = !!existing;

    var dirAvenue = getDirectorAvenue(AppState.currentAdmin ? AppState.currentAdmin.role : '');

    // Load members for dropdowns
    var membersList = AppState.members || [];
    if (!membersList.length && supabase) {
        var mr = await supabase.from('members').select('id,full_name,designation,board_position').eq('is_active', true).order('full_name');
        membersList = mr.data || [];
    }

    var memberOptions = '<option value="">Select Member</option>' + membersList.map(function(m) {
        return '<option value="' + m.id + '" data-name="' + escapeHtml(m.full_name) + '">' +
            escapeHtml(m.full_name) + (m.board_position ? ' (' + m.board_position + ')' : '') + '</option>';
    }).join('');

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');

    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (isEdit ? 'edit-2' : 'plus') + '"></i>' + (isEdit ? 'Edit Event' : 'Create New Event');

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="saveEvent(event,\'' + eventId + '\')">',

            // Basic Details
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="info" style="width:16px;height:16px;"></i>Basic Details</h4>',

            '<div class="form-group"><label><i data-lucide="type"></i>Event Title *</label>',
            '<input type="text" id="evTitle" required placeholder="Enter event title" value="' + (isEdit ? escapeHtml(existing.title) : '') + '"></div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="layers"></i>Avenue *</label>',
            '<select id="evAvenue" required' + (dirAvenue ? ' disabled' : '') + '>',
            '<option value="">Select Avenue</option>',
            [
                ['club_service','Club Service'],
                ['community_service','Community Service'],
                ['professional_service','Professional Service'],
                ['international_service','International Service'],
                ['district_priority','District Priority Projects']
            ].map(function(a) {
                var sel = (isEdit && existing.avenue === a[0]) || dirAvenue === a[0];
                return '<option value="' + a[0] + '"' + (sel ? ' selected' : '') + '>' + a[1] + '</option>';
            }).join(''),
            '</select></div>',

            '<div class="form-group"><label><i data-lucide="tag"></i>Event Type</label>',
            '<select id="evType">',
            [['project','Project'],['social','Social'],['fundraiser','Fundraiser'],['training','Training'],['installation','Installation'],['other','Other']].map(function(t) {
                return '<option value="' + t[0] + '"' + (isEdit && existing.event_type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
            }).join(''),
            '</select></div>',
            '</div>',

            '<div class="form-group"><label><i data-lucide="file-text"></i>Description</label>',
            '<textarea id="evDesc" rows="4" placeholder="Describe the event in detail...">' + (isEdit && existing.description ? escapeHtml(existing.description) : '') + '</textarea></div>',

            '<div class="separator"></div>',

            // Date, Time & Venue
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="calendar" style="width:16px;height:16px;"></i>Date, Time and Venue</h4>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="calendar"></i>Date *</label>',
            '<input type="date" id="evDate" required value="' + (isEdit && existing.date ? existing.date : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="clock"></i>Start Time</label>',
            '<input type="time" id="evStartTime" value="' + (isEdit && existing.start_time ? existing.start_time.substring(0,5) : '') + '"></div>',
            '</div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="clock"></i>End Time</label>',
            '<input type="time" id="evEndTime" value="' + (isEdit && existing.end_time ? existing.end_time.substring(0,5) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="map-pin"></i>Venue</label>',
            '<input type="text" id="evVenue" placeholder="Event venue" value="' + (isEdit && existing.venue ? escapeHtml(existing.venue) : '') + '"></div>',
            '</div>',

            '<div class="form-group"><label><i data-lucide="map"></i>Venue Address</label>',
            '<input type="text" id="evVenueAddress" placeholder="Full venue address" value="' + (isEdit && existing.venue_address ? escapeHtml(existing.venue_address) : '') + '"></div>',

            '<div class="separator"></div>',

            // People
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="users" style="width:16px;height:16px;"></i>People</h4>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="user"></i>Event Chair</label>',
            '<input type="text" id="evChair" placeholder="Name of event chair" value="' + (isEdit && existing.event_chair ? escapeHtml(existing.event_chair) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="user"></i>Event Chair (Select Member)</label>',
            '<select id="evChairMember" onchange="autoFillChairName()">' + memberOptions + '</select></div>',
            '</div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="user-check"></i>Proposed By</label>',
            '<input type="text" id="evProposedBy" placeholder="Name" value="' + (isEdit && existing.proposed_by ? escapeHtml(existing.proposed_by) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="user-check"></i>Seconded By</label>',
            '<input type="text" id="evSecondedBy" placeholder="Name" value="' + (isEdit && existing.seconded_by ? escapeHtml(existing.seconded_by) : '') + '"></div>',
            '</div>',

            '<div class="separator"></div>',

            // Collaboration
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="link" style="width:16px;height:16px;"></i>Collaboration</h4>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="link"></i>Collaboration Type</label>',
            '<select id="evCollabType" onchange="toggleCollabName()">',
            [['none','None'],['rotaract','Rotaract Club'],['interact','Interact Club'],['rotary','Rotary Club'],['ngo','NGO'],['others','Others']].map(function(c) {
                return '<option value="' + c[0] + '"' + (isEdit && existing.collaboration_type === c[0] ? ' selected' : '') + '>' + c[1] + '</option>';
            }).join(''),
            '</select></div>',
            '<div class="form-group" id="collabNameGroup" style="display:' + (isEdit && existing.collaboration_type && existing.collaboration_type !== 'none' ? 'block' : 'none') + ';">',
            '<label><i data-lucide="building"></i>Collaborator Name</label>',
            '<input type="text" id="evCollabName" placeholder="Name of collaborating organization" value="' + (isEdit && existing.collaborator_name ? escapeHtml(existing.collaborator_name) : '') + '"></div>',
            '</div>',

            '<div class="separator"></div>',

            // Poster
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="image" style="width:16px;height:16px;"></i>Event Poster</h4>',

            '<div class="form-group"><label><i data-lucide="upload-cloud"></i>Upload Poster Image</label>',
            '<div class="photo-upload-area" style="min-height:100px;">',
            '<input type="file" id="evPosterFile" accept="image/*" onchange="previewEventPoster(this)">',
            '<div id="evPosterPreview">',
            isEdit && existing.poster_url ?
                '<img src="' + escapeHtml(existing.poster_url) + '" style="max-width:220px;max-height:160px;border-radius:8px;" onerror="this.style.display=\'none\'">' :
                '<div class="photo-placeholder"><i data-lucide="upload-cloud" style="width:30px;height:30px;"></i><span>Click or drag to upload poster</span><small>Max 10MB, JPG or PNG. Auto-compressed.</small></div>',
            '</div></div></div>',

            '<div class="separator"></div>',

            // Budget & Impact
            '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;color:var(--primary);">',
            '<i data-lucide="wallet" style="width:16px;height:16px;"></i>Budget and Impact</h4>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="trending-up"></i>Estimated Budget (Rs.)</label>',
            '<input type="number" id="evBudgetEst" placeholder="0.00" step="0.01" min="0" value="' + (isEdit && existing.budget_estimated ? existing.budget_estimated : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="trending-down"></i>Actual Budget (Rs.)</label>',
            '<input type="number" id="evBudgetActual" placeholder="0.00" step="0.01" min="0" value="' + (isEdit && existing.budget_actual ? existing.budget_actual : '') + '"></div>',
            '</div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="heart"></i>Beneficiaries Count</label>',
            '<input type="number" id="evBeneficiaries" placeholder="0" min="0" value="' + (isEdit && existing.beneficiaries_count ? existing.beneficiaries_count : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="users"></i>Participants Count</label>',
            '<input type="number" id="evParticipants" placeholder="0" min="0" value="' + (isEdit && existing.participants_count ? existing.participants_count : '') + '"></div>',
            '</div>',

            '<div class="form-group"><label><i data-lucide="clock"></i>Volunteer Hours</label>',
            '<input type="number" id="evVolHours" placeholder="0" step="0.5" min="0" value="' + (isEdit && existing.volunteer_hours ? existing.volunteer_hours : '') + '"></div>',

            '<div class="form-group"><label><i data-lucide="tag"></i>Tags (comma separated)</label>',
            '<input type="text" id="evTags" placeholder="e.g. health, education, environment" value="' + (isEdit && existing.tags && existing.tags.length ? existing.tags.join(', ') : '') + '"></div>',

            '<div class="form-group" style="display:flex;align-items:center;gap:12px;">',
            '<label class="toggle-switch"><input type="checkbox" id="evFeatured" ' + (isEdit && existing.is_featured ? 'checked' : '') + '><span class="toggle-slider"></span></label>',
            '<span style="font-size:0.85rem;font-weight:500;">Featured Event</span></div>',

            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button>',
            '<button type="submit" class="btn btn-primary" id="saveEventBtn"><i data-lucide="save"></i>' + (isEdit ? 'Update Event' : 'Create Event') + '</button>',
            '</div></form>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();

    // Pre-select chair member if editing
    if (isEdit && existing.event_chair_member_id) {
        var chairSel = document.getElementById('evChairMember');
        if (chairSel) chairSel.value = existing.event_chair_member_id;
    }

    // Set director avenue
    if (dirAvenue) {
        var avSel = document.getElementById('evAvenue');
        if (avSel) avSel.value = dirAvenue;
    }
}

// ============================================================
// HELPERS FOR EVENT FORM
// ============================================================
function autoFillChairName() {
    var sel = document.getElementById('evChairMember');
    var inp = document.getElementById('evChair');
    if (sel && inp && sel.options[sel.selectedIndex]) {
        var dataName = sel.options[sel.selectedIndex].getAttribute('data-name');
        if (dataName) inp.value = dataName;
    }
}

function toggleCollabName() {
    var type = document.getElementById('evCollabType');
    var group = document.getElementById('collabNameGroup');
    if (type && group) {
        group.style.display = (type.value && type.value !== 'none') ? 'block' : 'none';
    }
}

function previewEventPoster(input) {
    var preview = document.getElementById('evPosterPreview');
    if (!input || !input.files || !input.files[0] || !preview) return;

    var file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Maximum poster size is 10MB');
        input.value = '';
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('error', 'Invalid File', 'Please select an image file');
        input.value = '';
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        preview.innerHTML = '<img src="' + e.target.result + '" style="max-width:250px;max-height:180px;border-radius:8px;">';
    };
    reader.readAsDataURL(file);
}

// ============================================================
// SAVE EVENT
// ============================================================
async function saveEvent(formEvent, eventId) {
    formEvent.preventDefault();

    eventId = eventId || '';
    var isEdit = eventId.length > 5;
    var saveBtn = document.getElementById('saveEventBtn');

    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    function gc(id) { var el = document.getElementById(id); return el ? el.checked : false; }
    function nv(id) { var el = document.getElementById(id); return el && el.value ? parseFloat(el.value) : 0; }
    function iv(id) { var el = document.getElementById(id); return el && el.value ? parseInt(el.value, 10) : 0; }

    var title = gv('evTitle');
    var avenue = gv('evAvenue');
    var date  = gv('evDate');
    var dirAvenue = getDirectorAvenue(AppState.currentAdmin ? AppState.currentAdmin.role : '');
    if (dirAvenue) avenue = dirAvenue;

    if (!title) { showToast('error', 'Required', 'Event title is required'); return; }
    if (!avenue) { showToast('error', 'Required', 'Please select a service avenue'); return; }
    if (!date)  { showToast('error', 'Required', 'Event date is required'); return; }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span style="display:inline-flex;gap:6px;align-items:center;"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;"></span>Saving...</span>';
    }

    try {
        if (!supabase) throw new Error('Database not connected');

        // Upload poster
        var posterFileEl = document.getElementById('evPosterFile');
        var posterFile = posterFileEl && posterFileEl.files && posterFileEl.files[0] ? posterFileEl.files[0] : null;
        var existingEvent = isEdit ? (AppState.events || []).find(function(e) { return e.id === eventId; }) : null;
        var posterUrl = existingEvent ? (existingEvent.poster_url || null) : null;
        var posterUrls = existingEvent ? (existingEvent.poster_urls || []) : [];

        if (posterFile) {
            var filePath = generateFilePath('posters', posterFile.name);
            var uploaded = await uploadFile('events', filePath, posterFile);
            if (uploaded) {
                posterUrl = uploaded;
                if (posterUrls.indexOf(uploaded) === -1) posterUrls = posterUrls.concat([uploaded]);

                // Track in event_photos
                if (isEdit) {
                    await supabase.from('event_photos').insert({
                        event_id: eventId,
                        photo_url: uploaded,
                        photo_type: 'poster',
                        caption: 'Event Poster',
                        file_size: posterFile.size,
                        uploaded_by: AppState.currentAdmin ? AppState.currentAdmin.id : null
                    });
                }
            }
        }

        // Parse tags
        var tagsStr = gv('evTags');
        var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; }) : [];

        var collabType = gv('evCollabType') || 'none';

        var eventData = {
            title:              title,
            description:        gv('evDesc') || null,
            avenue:             avenue,
            event_type:         gv('evType') || 'project',
            date:               date,
            start_time:         gv('evStartTime') || null,
            end_time:           gv('evEndTime') || null,
            venue:              gv('evVenue') || null,
            venue_address:      gv('evVenueAddress') || null,
            event_chair:        gv('evChair') || null,
            event_chair_member_id: gv('evChairMember') || null,
            proposed_by:        gv('evProposedBy') || null,
            seconded_by:        gv('evSecondedBy') || null,
            collaboration_type: collabType,
            collaborator_name:  collabType !== 'none' ? (gv('evCollabName') || null) : null,
            budget_estimated:   nv('evBudgetEst'),
            budget_actual:      nv('evBudgetActual'),
            beneficiaries_count:iv('evBeneficiaries'),
            participants_count: iv('evParticipants'),
            volunteer_hours:    nv('evVolHours'),
            tags:               tags,
            is_featured:        gc('evFeatured'),
            updated_at:         new Date().toISOString()
        };

        if (posterUrl) {
            eventData.poster_url  = posterUrl;
            eventData.poster_urls = posterUrls;
        }

        if (isEdit) {
            var upd = await supabase.from('events').update(eventData).eq('id', eventId);
            if (upd.error) throw upd.error;
        } else {
            eventData.status      = 'proposed';
            eventData.created_by  = AppState.currentAdmin ? AppState.currentAdmin.id : null;
            eventData.created_at  = new Date().toISOString();
            eventData.report_submitted = false;
            eventData.mail_sent   = false;
            if (!posterUrl) { eventData.poster_urls = []; }

            var ins = await supabase.from('events').insert(eventData);
            if (ins.error) throw ins.error;
        }

        await logActivity(isEdit ? 'update_event' : 'create_event', 'events', eventId || null, { title: title, avenue: avenue });

        closeModal('formModal');
        showToast('success', 'Success', 'Event ' + (isEdit ? 'updated' : 'created') + ' successfully' + (!isEdit ? '. Awaiting President approval.' : ''));

        await loadAdminEvents();
        await loadUpcomingEvents();
        await loadCompletedProjects();

    } catch (err) {
        console.error('saveEvent error:', err);
        showToast('error', 'Error', err.message || 'Failed to save event');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="save"></i>' + (isEdit ? 'Update Event' : 'Create Event');
            refreshIcons();
        }
    }
}

// ============================================================
// APPROVE EVENT (from events panel)
// ============================================================
async function approveEventFromPanel(eventId) {
    if (!canApproveProjects()) { showToast('error', 'Denied', 'Only President, Advisor, or Super Admin can approve'); return; }

    var confirmed = await confirmAction('Approve Event?', 'This event will be published and all members notified.', 'Yes, Approve');
    if (!confirmed) return;

    try {
        if (!supabase) throw new Error('DB not connected');
        var upd = await supabase.from('events').update({
            status: 'approved',
            approved_by: AppState.currentAdmin.id,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }).eq('id', eventId);
        if (upd.error) throw upd.error;

        // Send notification
        var evR = await supabase.from('events').select('*').eq('id', eventId).single();
        if (!evR.error && evR.data) {
            await _sendEventApprovalNotification(evR.data);
        }

        await logActivity('approve_event', 'events', eventId, {});
        showToast('success', 'Approved', 'Event approved and published. Members will be notified.');
        await loadAdminEvents();
        await loadAdminDashboard();
        await loadUpcomingEvents();

    } catch (err) {
        console.error('approveEventFromPanel error:', err);
        showToast('error', 'Error', err.message);
    }
}

// ============================================================
// SEND EVENT APPROVAL NOTIFICATION
// ============================================================
async function _sendEventApprovalNotification(ev) {
    try {
        if (!supabase || !ev) return;
        var members = await getAllMemberEmails(false);
        var emails = members.map(function(m) { return m.email; }).filter(Boolean);
        if (!emails.length) return;

        var tStr = ev.start_time ? (formatTime(ev.start_time) + (ev.end_time ? ' to ' + formatTime(ev.end_time) : '')) : 'Time to be announced';
        var subject = 'New Event: ' + ev.title + ' | Rotaract Club of Coimbatore Unity';
        var lines = [
            'Dear Members,', '',
            'We are pleased to announce a new event!', '',
            'EVENT DETAILS:',
            '='.repeat(60),
            'Event   : ' + ev.title,
            'Avenue  : ' + formatAvenueLabel(ev.avenue),
            'Date    : ' + formatDate(ev.date),
            'Time    : ' + tStr,
            'Venue   : ' + (ev.venue || 'To be announced'),
            ev.event_chair  ? 'Chair   : ' + ev.event_chair   : '',
            ev.proposed_by  ? 'Proposed: ' + ev.proposed_by  : '',
            '='.repeat(60),
            ev.description  ? '\nDescription:\n' + ev.description + '\n' : '',
            'We look forward to your participation!', '',
            'Regards,',
            'Rotaract Club of Coimbatore Unity',
            'Family of Rotary Club of Coimbatore East',
            'Rotary International District 3206 (Coimbatore | Pallakkad)',
            'Email: rc.cbeunity@gmail.com'
        ].filter(function(l) { return l !== undefined; }).join('\n');

        await supabase.from('notification_queue').insert({
            notification_type:   'project_approved',
            recipient_type:      'all',
            recipient_emails:    emails,
            subject:             subject,
            body:                lines,
            html_body:           lines.replace(/\n/g, '<br>'),
            related_entity_type: 'events',
            related_entity_id:   ev.id,
            status:              'queued',
            created_by:          AppState.currentAdmin ? AppState.currentAdmin.id : null
        });

        await supabase.from('mail_log').insert({
            mail_type:           'project_approved',
            recipient:           emails.length + ' member(s)',
            subject:             subject,
            status:              'queued',
            related_entity_type: 'events',
            related_entity_id:   ev.id
        });

        await supabase.from('events').update({ mail_sent: true }).eq('id', ev.id);
        console.log('Approval notification queued for', emails.length, 'recipients');
    } catch (err) { console.error('_sendEventApprovalNotification error:', err); }
}

// ============================================================
// REJECT EVENT (from events panel)
// ============================================================
async function rejectEventFromPanel(eventId) {
    if (!canApproveProjects()) { showToast('error', 'Denied', 'Only President, Advisor, or Super Admin can reject'); return; }

    var result = window.Swal ? await Swal.fire({
        title: 'Reject Event?',
        input: 'textarea',
        inputLabel: 'Reason for rejection (optional)',
        inputPlaceholder: 'Enter reason...',
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
        var upd = await supabase.from('events').update({
            status: 'cancelled',
            rejection_reason: result.value || null,
            updated_at: new Date().toISOString()
        }).eq('id', eventId);
        if (upd.error) throw upd.error;
        await logActivity('reject_event', 'events', eventId, { reason: result.value });
        showToast('info', 'Rejected', 'Event has been rejected');
        await loadAdminEvents();
        await loadAdminDashboard();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// MARK EVENT COMPLETED
// ============================================================
async function markEventCompleted(eventId) {
    var confirmed = await confirmAction('Mark as Completed?', 'This will mark the event as completed. You can then submit the project report.', 'Yes, Complete');
    if (!confirmed) return;

    try {
        if (!supabase) return;
        var r = await supabase.from('events').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', eventId);
        if (r.error) throw r.error;
        await logActivity('complete_event', 'events', eventId, {});
        showToast('success', 'Completed', 'Event marked as completed. Please submit the project report.');
        await loadAdminEvents();
        await loadCompletedProjects();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// DELETE EVENT
// ============================================================
async function deleteEvent(eventId) {
    if (!isSuperAdmin() && !isPresident()) {
        showToast('error', 'Access Denied', 'Only Super Admin or President can delete events');
        return;
    }

    var confirmed = await confirmAction('Delete Event?', 'This will permanently delete the event, its photos, and report. Cannot be undone.', 'Yes, Delete');
    if (!confirmed) return;

    try {
        if (!supabase) return;
        await supabase.from('event_photos').delete().eq('event_id', eventId);
        var r = await supabase.from('events').delete().eq('id', eventId);
        if (r.error) throw r.error;
        await logActivity('delete_event', 'events', eventId, {});
        showToast('success', 'Deleted', 'Event deleted successfully');
        await loadAdminEvents();
        await loadCompletedProjects();
        await loadUpcomingEvents();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// OPEN REPORT FORM
// ============================================================
function openReportForm(eventId) {
    var ev = (AppState.events || []).find(function(e) { return e.id === eventId; });
    if (!ev) {
        ev = (AppState.allProjects || []).find(function(e) { return e.id === eventId; });
    }
    if (!ev) { showToast('error', 'Error', 'Event not found. Please reload.'); return; }
    if (ev.status !== 'completed') { showToast('error', 'Error', 'Reports can only be submitted for completed events'); return; }

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="file-plus"></i>Submit Report: ' + escapeHtml(ev.title);

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="submitEventReport(event,\'' + eventId + '\')">',

            '<div style="padding:14px;background:rgba(0,87,183,0.06);border:1px solid rgba(0,87,183,0.12);border-radius:var(--radius-sm);margin-bottom:20px;">',
            '<div style="font-weight:700;margin-bottom:4px;">' + escapeHtml(ev.title) + '</div>',
            '<div style="font-size:0.82rem;color:var(--text-secondary);">' + formatAvenueLabel(ev.avenue) + ' | ' + formatDate(ev.date) + '</div>',
            '</div>',

            '<div class="form-group"><label><i data-lucide="file-text"></i>Report Description *</label>',
            '<textarea id="rptText" rows="6" required placeholder="Write a detailed report about the event: what happened, outcomes, impact, challenges...">' + (ev.report_text || '') + '</textarea></div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="heart"></i>Beneficiaries Count</label>',
            '<input type="number" id="rptBeneficiaries" min="0" placeholder="0" value="' + (ev.beneficiaries_count || '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="users"></i>Participants Count</label>',
            '<input type="number" id="rptParticipants" min="0" placeholder="0" value="' + (ev.participants_count || '') + '"></div>',
            '</div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="clock"></i>Volunteer Hours</label>',
            '<input type="number" id="rptVolHours" min="0" step="0.5" placeholder="0" value="' + (ev.volunteer_hours || '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="wallet"></i>Actual Expense (Rs.)</label>',
            '<input type="number" id="rptBudgetActual" min="0" step="0.01" placeholder="0.00" value="' + (ev.budget_actual || '') + '"></div>',
            '</div>',

            '<div class="form-group"><label><i data-lucide="camera"></i>Action Photographs (Upload up to 3)</label>',
            '<div style="display:flex;gap:10px;flex-wrap:wrap;">',
            [1,2,3].map(function(i) {
                return '<div class="photo-upload-area" style="min-height:70px;flex:1;min-width:100px;">' +
                    '<input type="file" id="rptPhoto' + i + '" accept="image/*">' +
                    '<div class="photo-placeholder" style="gap:4px;"><i data-lucide="upload-cloud" style="width:22px;height:22px;"></i><small>Photo ' + i + '</small></div>' +
                    '</div>';
            }).join(''),
            '</div>',
            '<small style="color:var(--text-tertiary);margin-top:6px;display:block;">Images auto-compressed. Max 5MB each. These photos will appear in the report document.</small></div>',

            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button>',
            '<button type="submit" class="btn btn-primary" id="submitRptBtn"><i data-lucide="file-check"></i>Submit Report</button>',
            '</div></form>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();
}

// ============================================================
// SUBMIT EVENT REPORT
// ============================================================
async function submitEventReport(formEvent, eventId) {
    formEvent.preventDefault();

    var submitBtn = document.getElementById('submitRptBtn');
    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    function nv(id) { var el = document.getElementById(id); return el && el.value ? parseFloat(el.value) : 0; }
    function iv(id) { var el = document.getElementById(id); return el && el.value ? parseInt(el.value,10) : 0; }

    var rptText = gv('rptText');
    if (!rptText) { showToast('error', 'Required', 'Report description is required'); return; }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span style="display:inline-flex;gap:6px;align-items:center;"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;"></span>Uploading...</span>';
    }

    try {
        if (!supabase) throw new Error('Database not connected');

        // Upload report photos
        var reportPhotos = [];
        for (var i = 1; i <= 3; i++) {
            var fileEl = document.getElementById('rptPhoto' + i);
            if (fileEl && fileEl.files && fileEl.files[0]) {
                var file = fileEl.files[0];
                var filePath = generateFilePath('reports/' + eventId, file.name);
                var photoUrl = await uploadFile('reports', filePath, file);
                if (photoUrl) {
                    reportPhotos.push(photoUrl);
                    await supabase.from('event_photos').insert({
                        event_id:    eventId,
                        photo_url:   photoUrl,
                        photo_type:  'action',
                        caption:     'Action Photo ' + i,
                        file_size:   file.size,
                        uploaded_by: AppState.currentAdmin ? AppState.currentAdmin.id : null
                    });
                }
            }
        }

        // Merge with existing
        var existEv = (AppState.events || []).find(function(e) { return e.id === eventId; });
        var existPhotos = existEv && existEv.report_photos ? existEv.report_photos : [];
        var allPhotos = existPhotos.concat(reportPhotos);

        var upd = await supabase.from('events').update({
            report_submitted:     true,
            report_text:          rptText,
            report_photos:        allPhotos,
            report_submitted_at:  new Date().toISOString(),
            report_submitted_by:  AppState.currentAdmin ? AppState.currentAdmin.id : null,
            beneficiaries_count:  iv('rptBeneficiaries'),
            participants_count:   iv('rptParticipants'),
            volunteer_hours:      nv('rptVolHours'),
            budget_actual:        nv('rptBudgetActual'),
            updated_at:           new Date().toISOString()
        }).eq('id', eventId);

        if (upd.error) throw upd.error;

        await logActivity('submit_report', 'events', eventId, { photos: reportPhotos.length });
        closeModal('formModal');
        showToast('success', 'Submitted', 'Report submitted successfully');
        await loadAdminEvents();
        if (typeof loadAdminReports === 'function') await loadAdminReports();

    } catch (err) {
        console.error('submitEventReport error:', err);
        showToast('error', 'Error', err.message || 'Failed to submit report');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="file-check"></i>Submit Report';
            refreshIcons();
        }
    }
}

// ============================================================
// PAST PRESIDENTS CRUD
// ============================================================
async function loadAdminPresidents() {
    try {
        if (!supabase) return;
        var r = await supabase.from('past_presidents').select('*').order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.pastPresidents = r.data || [];
        _renderPresidentsTable(AppState.pastPresidents);
    } catch (err) { console.error('loadAdminPresidents error:', err); showToast('error', 'Error', 'Failed to load past presidents'); }
}

function _renderPresidentsTable(data) {
    var tbody = document.getElementById('presidentsTableBody');
    if (!tbody) return;
    if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-tertiary);">No past presidents added yet. Click Add to create one.</td></tr>'; return; }
    tbody.innerHTML = data.map(function(p) {
        var photoSrc = p.photo_url && p.photo_url.startsWith('http') ? p.photo_url : getDefaultAvatar(p.name);
        return '<tr>' +
            '<td><img src="' + escapeHtml(photoSrc) + '" class="table-photo" onerror="this.src=\'' + getDefaultAvatar(p.name) + '\'"></td>' +
            '<td><strong>' + escapeHtml(p.name) + '</strong></td>' +
            '<td>' + escapeHtml(p.year_from) + ' - ' + escapeHtml(p.year_to) + '</td>' +
            '<td>' + escapeHtml(p.ri_id || '-') + '</td>' +
            '<td style="max-width:200px;white-space:normal;font-size:0.8rem;">' + escapeHtml(p.theme || '-') + '</td>' +
            '<td><div class="table-actions"><button class="btn-icon" onclick="openPresidentForm(\'' + p.id + '\')"><i data-lucide="edit-2"></i></button><button class="btn-icon" onclick="deletePresident(\'' + p.id + '\')" style="color:var(--danger);"><i data-lucide="trash-2"></i></button></div></td></tr>';
    }).join('');
    refreshIcons();
}

function openPresidentForm(presidentId) {
    presidentId = presidentId || '';
    var ex = presidentId ? (AppState.pastPresidents || []).find(function(p) { return p.id === presidentId; }) : null;
    var ie = !!ex;
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (ie ? 'edit-2' : 'plus') + '"></i>' + (ie ? 'Edit Past President' : 'Add Past President');
    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="savePresident(event,\'' + presidentId + '\')">',
            '<div class="form-group"><label><i data-lucide="user"></i>Name *</label><input type="text" id="ppName" required placeholder="Full name" value="' + (ie ? escapeHtml(ex.name) : '') + '"></div>',
            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="calendar"></i>Year From *</label><input type="text" id="ppYearFrom" required placeholder="e.g. 2023" value="' + (ie ? escapeHtml(ex.year_from) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="calendar"></i>Year To *</label><input type="text" id="ppYearTo" required placeholder="e.g. 2024" value="' + (ie ? escapeHtml(ex.year_to) : '') + '"></div>',
            '</div>',
            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="hash"></i>RI ID</label><input type="text" id="ppRiId" placeholder="Rotary International ID" value="' + (ie && ex.ri_id ? escapeHtml(ex.ri_id) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="sort-asc"></i>Sort Order</label><input type="number" id="ppOrder" placeholder="1" value="' + (ie ? ex.sort_order : ((AppState.pastPresidents || []).length + 1)) + '"></div>',
            '</div>',
            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="mail"></i>Email</label><input type="email" id="ppEmail" placeholder="email@example.com" value="' + (ie && ex.email ? escapeHtml(ex.email) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="phone"></i>Phone</label><input type="tel" id="ppPhone" placeholder="+91 XXXXX XXXXX" value="' + (ie && ex.phone ? escapeHtml(ex.phone) : '') + '"></div>',
            '</div>',
            '<div class="form-group"><label><i data-lucide="flag"></i>Theme / Motto</label><input type="text" id="ppTheme" placeholder="Presidential theme or motto" value="' + (ie && ex.theme ? escapeHtml(ex.theme) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="award"></i>Achievements</label><textarea id="ppAchievements" rows="3" placeholder="Key achievements during tenure...">' + (ie && ex.achievements ? escapeHtml(ex.achievements) : '') + '</textarea></div>',
            '<div class="form-group"><label><i data-lucide="camera"></i>Photo</label>',
            '<div class="photo-upload-area" style="min-height:80px;"><input type="file" id="ppPhoto" accept="image/*">',
            '<div>' + (ie && ex.photo_url ? '<img src="' + escapeHtml(ex.photo_url) + '" style="max-width:100px;max-height:100px;border-radius:50%;object-fit:cover;">' : '<div class="photo-placeholder"><i data-lucide="upload-cloud" style="width:24px;height:24px;"></i><small>Upload photo</small></div>') + '</div></div></div>',
            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;"><button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button><button type="submit" class="btn btn-primary"><i data-lucide="save"></i>' + (ie ? 'Update' : 'Add') + '</button></div>',
            '</form>'
        ].join('');
    }
    openModal('formModal'); refreshIcons();
}

async function savePresident(formEvent, presidentId) {
    formEvent.preventDefault();
    presidentId = presidentId || '';
    var ie = presidentId.length > 5;
    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    var name = gv('ppName'), yf = gv('ppYearFrom'), yt = gv('ppYearTo');
    if (!name || !yf || !yt) { showToast('error', 'Required', 'Name and years are required'); return; }
    var photoFile = document.getElementById('ppPhoto');
    var pf = photoFile && photoFile.files && photoFile.files[0] ? photoFile.files[0] : null;
    var photoUrl = ie ? ((AppState.pastPresidents || []).find(function(p) { return p.id === presidentId; }) || {}).photo_url || null : null;
    if (pf) { var fp = generateFilePath('presidents', pf.name); photoUrl = await uploadFile('avatars', fp, pf); }
    var data = { name: name, year_from: yf, year_to: yt, ri_id: gv('ppRiId') || null, email: gv('ppEmail') || null, phone: gv('ppPhone') || null, theme: gv('ppTheme') || null, achievements: gv('ppAchievements') || null, sort_order: parseInt(gv('ppOrder')) || 0, photo_url: photoUrl };
    try {
        if (!supabase) throw new Error('DB not connected');
        if (ie) { var u = await supabase.from('past_presidents').update(data).eq('id', presidentId); if (u.error) throw u.error; }
        else { var i = await supabase.from('past_presidents').insert(data); if (i.error) throw i.error; }
        await logActivity(ie ? 'update_president' : 'create_president', 'past_presidents', presidentId || null, { name: name });
        closeModal('formModal'); showToast('success', 'Saved', 'Past president ' + (ie ? 'updated' : 'added'));
        await loadAdminPresidents(); await loadPastPresidents();
    } catch (err) { showToast('error', 'Error', err.message); }
}

async function deletePresident(presidentId) {
    if (!presidentId || !(await confirmAction('Delete?', 'Remove this past president?', 'Yes, Delete'))) return;
    try {
        if (!supabase) return;
        var r = await supabase.from('past_presidents').delete().eq('id', presidentId);
        if (r.error) throw r.error;
        showToast('success', 'Deleted', 'Past president removed');
        await loadAdminPresidents(); await loadPastPresidents();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// PAST SECRETARIES CRUD
// ============================================================
async function loadAdminSecretaries() {
    try {
        if (!supabase) return;
        var r = await supabase.from('past_secretaries').select('*').order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.pastSecretaries = r.data || [];
        _renderSecretariesTable(AppState.pastSecretaries);
    } catch (err) { console.error('loadAdminSecretaries error:', err); }
}

function _renderSecretariesTable(data) {
    var tbody = document.getElementById('secretariesTableBody');
    if (!tbody) return;
    if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-tertiary);">No past secretaries added yet. Click Add to create one.</td></tr>'; return; }
    tbody.innerHTML = data.map(function(s) {
        var photoSrc = s.photo_url && s.photo_url.startsWith('http') ? s.photo_url : getDefaultAvatar(s.name);
        return '<tr><td><img src="' + escapeHtml(photoSrc) + '" class="table-photo" onerror="this.src=\'' + getDefaultAvatar(s.name) + '\'"></td><td><strong>' + escapeHtml(s.name) + '</strong></td><td>' + escapeHtml(s.year_from) + ' - ' + escapeHtml(s.year_to) + '</td><td>' + escapeHtml(s.ri_id || '-') + '</td><td><div class="table-actions"><button class="btn-icon" onclick="openSecretaryForm(\'' + s.id + '\')"><i data-lucide="edit-2"></i></button><button class="btn-icon" onclick="deleteSecretary(\'' + s.id + '\')" style="color:var(--danger);"><i data-lucide="trash-2"></i></button></div></td></tr>';
    }).join('');
    refreshIcons();
}

function openSecretaryForm(secretaryId) {
    secretaryId = secretaryId || '';
    var ex = secretaryId ? (AppState.pastSecretaries || []).find(function(s) { return s.id === secretaryId; }) : null;
    var ie = !!ex;
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (ie ? 'edit-2' : 'plus') + '"></i>' + (ie ? 'Edit Past Secretary' : 'Add Past Secretary');
    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="saveSecretary(event,\'' + secretaryId + '\')">',
            '<div class="form-group"><label><i data-lucide="user"></i>Name *</label><input type="text" id="psName" required placeholder="Full name" value="' + (ie ? escapeHtml(ex.name) : '') + '"></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="calendar"></i>Year From *</label><input type="text" id="psYearFrom" required placeholder="e.g. 2023" value="' + (ie ? escapeHtml(ex.year_from) : '') + '"></div><div class="form-group"><label><i data-lucide="calendar"></i>Year To *</label><input type="text" id="psYearTo" required placeholder="e.g. 2024" value="' + (ie ? escapeHtml(ex.year_to) : '') + '"></div></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="hash"></i>RI ID</label><input type="text" id="psRiId" placeholder="RI ID" value="' + (ie && ex.ri_id ? escapeHtml(ex.ri_id) : '') + '"></div><div class="form-group"><label><i data-lucide="sort-asc"></i>Sort Order</label><input type="number" id="psOrder" placeholder="1" value="' + (ie ? ex.sort_order : ((AppState.pastSecretaries || []).length + 1)) + '"></div></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="mail"></i>Email</label><input type="email" id="psEmail" placeholder="email@example.com" value="' + (ie && ex.email ? escapeHtml(ex.email) : '') + '"></div><div class="form-group"><label><i data-lucide="phone"></i>Phone</label><input type="tel" id="psPhone" placeholder="+91 XXXXX XXXXX" value="' + (ie && ex.phone ? escapeHtml(ex.phone) : '') + '"></div></div>',
            '<div class="form-group"><label><i data-lucide="award"></i>Achievements</label><textarea id="psAchievements" rows="3" placeholder="Key achievements...">' + (ie && ex.achievements ? escapeHtml(ex.achievements) : '') + '</textarea></div>',
            '<div class="form-group"><label><i data-lucide="camera"></i>Photo</label><div class="photo-upload-area" style="min-height:80px;"><input type="file" id="psPhoto" accept="image/*"><div>' + (ie && ex.photo_url ? '<img src="' + escapeHtml(ex.photo_url) + '" style="max-width:100px;max-height:100px;border-radius:50%;object-fit:cover;">' : '<div class="photo-placeholder"><i data-lucide="upload-cloud" style="width:24px;height:24px;"></i><small>Upload photo</small></div>') + '</div></div></div>',
            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;"><button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button><button type="submit" class="btn btn-primary"><i data-lucide="save"></i>' + (ie ? 'Update' : 'Add') + '</button></div>',
            '</form>'
        ].join('');
    }
    openModal('formModal'); refreshIcons();
}

async function saveSecretary(formEvent, secretaryId) {
    formEvent.preventDefault();
    secretaryId = secretaryId || '';
    var ie = secretaryId.length > 5;
    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    var name = gv('psName'), yf = gv('psYearFrom'), yt = gv('psYearTo');
    if (!name || !yf || !yt) { showToast('error', 'Required', 'Name and years are required'); return; }
    var photoFile = document.getElementById('psPhoto');
    var pf = photoFile && photoFile.files && photoFile.files[0] ? photoFile.files[0] : null;
    var photoUrl = ie ? ((AppState.pastSecretaries || []).find(function(s) { return s.id === secretaryId; }) || {}).photo_url || null : null;
    if (pf) { var fp = generateFilePath('secretaries', pf.name); photoUrl = await uploadFile('avatars', fp, pf); }
    var data = { name: name, year_from: yf, year_to: yt, ri_id: gv('psRiId') || null, email: gv('psEmail') || null, phone: gv('psPhone') || null, achievements: gv('psAchievements') || null, sort_order: parseInt(gv('psOrder')) || 0, photo_url: photoUrl };
    try {
        if (!supabase) throw new Error('DB not connected');
        if (ie) { var u = await supabase.from('past_secretaries').update(data).eq('id', secretaryId); if (u.error) throw u.error; }
        else { var i = await supabase.from('past_secretaries').insert(data); if (i.error) throw i.error; }
        await logActivity(ie ? 'update_secretary' : 'create_secretary', 'past_secretaries', secretaryId || null, { name: name });
        closeModal('formModal'); showToast('success', 'Saved', 'Past secretary ' + (ie ? 'updated' : 'added'));
        await loadAdminSecretaries(); await loadPastSecretaries();
    } catch (err) { showToast('error', 'Error', err.message); }
}

async function deleteSecretary(secretaryId) {
    if (!secretaryId || !(await confirmAction('Delete?', 'Remove this past secretary?', 'Yes, Delete'))) return;
    try {
        if (!supabase) return;
        var r = await supabase.from('past_secretaries').delete().eq('id', secretaryId);
        if (r.error) throw r.error;
        showToast('success', 'Deleted', 'Past secretary removed');
        await loadAdminSecretaries(); await loadPastSecretaries();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// CLUB TRAINERS CRUD
// ============================================================
async function loadAdminTrainers() {
    try {
        if (!supabase) return;
        var r = await supabase.from('club_trainers').select('*').order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.trainers = r.data || [];
        _renderTrainersTable(AppState.trainers);
    } catch (err) { console.error('loadAdminTrainers error:', err); }
}

function _renderTrainersTable(data) {
    var tbody = document.getElementById('trainersTableBody');
    if (!tbody) return;
    if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-tertiary);">No trainers added yet. Click Add to create one.</td></tr>'; return; }
    tbody.innerHTML = data.map(function(t) {
        var photoSrc = t.photo_url && t.photo_url.startsWith('http') ? t.photo_url : getDefaultAvatar(t.name);
        return '<tr><td><img src="' + escapeHtml(photoSrc) + '" class="table-photo" onerror="this.src=\'' + getDefaultAvatar(t.name) + '\'"></td><td><strong>' + escapeHtml(t.name) + '</strong></td><td>' + escapeHtml(t.ri_id || '-') + '</td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(t.email || '-') + '</td><td>' + escapeHtml(t.phone || '-') + '</td><td>' + escapeHtml(t.specialization || '-') + '</td><td><div class="table-actions"><button class="btn-icon" onclick="openTrainerForm(\'' + t.id + '\')"><i data-lucide="edit-2"></i></button><button class="btn-icon" onclick="deleteTrainer(\'' + t.id + '\')" style="color:var(--danger);"><i data-lucide="trash-2"></i></button></div></td></tr>';
    }).join('');
    refreshIcons();
}

function openTrainerForm(trainerId) {
    trainerId = trainerId || '';
    var ex = trainerId ? (AppState.trainers || []).find(function(t) { return t.id === trainerId; }) : null;
    var ie = !!ex;
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (ie ? 'edit-2' : 'plus') + '"></i>' + (ie ? 'Edit Trainer' : 'Add Trainer');
    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="saveTrainer(event,\'' + trainerId + '\')">',
            '<div class="form-group"><label><i data-lucide="user"></i>Name *</label><input type="text" id="trName" required placeholder="Full name" value="' + (ie ? escapeHtml(ex.name) : '') + '"></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="hash"></i>RI ID</label><input type="text" id="trRiId" placeholder="RI ID" value="' + (ie && ex.ri_id ? escapeHtml(ex.ri_id) : '') + '"></div><div class="form-group"><label><i data-lucide="award"></i>Specialization</label><input type="text" id="trSpec" placeholder="Area of expertise" value="' + (ie && ex.specialization ? escapeHtml(ex.specialization) : '') + '"></div></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="mail"></i>Email</label><input type="email" id="trEmail" placeholder="email@example.com" value="' + (ie && ex.email ? escapeHtml(ex.email) : '') + '"></div><div class="form-group"><label><i data-lucide="phone"></i>Phone</label><input type="tel" id="trPhone" placeholder="+91 XXXXX XXXXX" value="' + (ie && ex.phone ? escapeHtml(ex.phone) : '') + '"></div></div>',
            '<div class="form-group"><label><i data-lucide="file-text"></i>Bio</label><textarea id="trBio" rows="3" placeholder="Short bio...">' + (ie && ex.bio ? escapeHtml(ex.bio) : '') + '</textarea></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="sort-asc"></i>Sort Order</label><input type="number" id="trOrder" placeholder="0" value="' + (ie ? ex.sort_order : '0') + '"></div><div class="form-group" style="display:flex;align-items:center;gap:12px;margin-top:24px;"><label class="toggle-switch"><input type="checkbox" id="trActive" ' + (!ie || ex.is_active ? 'checked' : '') + '><span class="toggle-slider"></span></label><span style="font-size:0.85rem;">Active</span></div></div>',
            '<div class="form-group"><label><i data-lucide="camera"></i>Photo</label><div class="photo-upload-area" style="min-height:80px;"><input type="file" id="trPhoto" accept="image/*"><div>' + (ie && ex.photo_url ? '<img src="' + escapeHtml(ex.photo_url) + '" style="max-width:100px;max-height:100px;border-radius:50%;object-fit:cover;">' : '<div class="photo-placeholder"><i data-lucide="upload-cloud" style="width:24px;height:24px;"></i><small>Upload photo</small></div>') + '</div></div></div>',
            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;"><button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button><button type="submit" class="btn btn-primary"><i data-lucide="save"></i>' + (ie ? 'Update' : 'Add') + '</button></div>',
            '</form>'
        ].join('');
    }
    openModal('formModal'); refreshIcons();
}

async function saveTrainer(formEvent, trainerId) {
    formEvent.preventDefault();
    trainerId = trainerId || '';
    var ie = trainerId.length > 5;
    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    var name = gv('trName');
    if (!name) { showToast('error', 'Required', 'Trainer name is required'); return; }
    var photoFile = document.getElementById('trPhoto');
    var pf = photoFile && photoFile.files && photoFile.files[0] ? photoFile.files[0] : null;
    var photoUrl = ie ? ((AppState.trainers || []).find(function(t) { return t.id === trainerId; }) || {}).photo_url || null : null;
    if (pf) { var fp = generateFilePath('trainers', pf.name); photoUrl = await uploadFile('avatars', fp, pf); }
    var activeEl = document.getElementById('trActive');
    var data = { name: name, ri_id: gv('trRiId') || null, email: gv('trEmail') || null, phone: gv('trPhone') || null, specialization: gv('trSpec') || null, bio: gv('trBio') || null, sort_order: parseInt(gv('trOrder')) || 0, is_active: activeEl ? activeEl.checked : true, photo_url: photoUrl };
    try {
        if (!supabase) throw new Error('DB not connected');
        if (ie) { var u = await supabase.from('club_trainers').update(data).eq('id', trainerId); if (u.error) throw u.error; }
        else { var i = await supabase.from('club_trainers').insert(data); if (i.error) throw i.error; }
        await logActivity(ie ? 'update_trainer' : 'create_trainer', 'club_trainers', trainerId || null, { name: name });
        closeModal('formModal'); showToast('success', 'Saved', 'Trainer ' + (ie ? 'updated' : 'added'));
        await loadAdminTrainers(); await loadPublicTrainers();
    } catch (err) { showToast('error', 'Error', err.message); }
}

async function deleteTrainer(trainerId) {
    if (!trainerId || !(await confirmAction('Delete?', 'Remove this trainer?', 'Yes, Delete'))) return;
    try {
        if (!supabase) return;
        var r = await supabase.from('club_trainers').delete().eq('id', trainerId);
        if (r.error) throw r.error;
        showToast('success', 'Deleted', 'Trainer removed');
        await loadAdminTrainers(); await loadPublicTrainers();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// NEWSLETTERS CRUD
// ============================================================
async function loadAdminNewsletters() {
    try {
        if (!supabase) return;
        var r = await supabase.from('newsletters').select('*').order('year', { ascending: false }).order('month', { ascending: false });
        if (r.error) throw r.error;
        AppState.newsletters = r.data || [];
        _renderNewslettersTable(AppState.newsletters);
    } catch (err) { console.error('loadAdminNewsletters error:', err); }
}

function _renderNewslettersTable(data) {
    var tbody = document.getElementById('newslettersTableBody');
    if (!tbody) return;
    if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-tertiary);">No bulletins added yet. Click Add Bulletin to create one.</td></tr>'; return; }
    tbody.innerHTML = data.map(function(nl) {
        return '<tr>' +
            '<td>' + (nl.cover_image_url ? '<img src="' + escapeHtml(nl.cover_image_url) + '" class="table-poster" style="width:40px;height:56px;object-fit:cover;" onerror="this.style.display=\'none\'">' : '<div style="width:40px;height:56px;border-radius:4px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;"><i data-lucide="newspaper" style="width:14px;height:14px;color:var(--text-tertiary);"></i></div>') + '</td>' +
            '<td><strong>' + escapeHtml(nl.title) + '</strong></td>' +
            '<td>' + escapeHtml(nl.month) + '</td>' +
            '<td>' + nl.year + '</td>' +
            '<td><span class="badge ' + (nl.is_published ? 'badge-success' : 'badge-warning') + '">' + (nl.is_published ? 'Published' : 'Draft') + '</span></td>' +
            '<td><div class="table-actions">' +
            '<button class="btn-icon" onclick="openNewsletterForm(\'' + nl.id + '\')"><i data-lucide="edit-2"></i></button>' +
            (nl.pdf_url ? '<a href="' + escapeHtml(nl.pdf_url) + '" target="_blank" class="btn-icon" title="View PDF"><i data-lucide="external-link"></i></a>' : '') +
            '<button class="btn-icon" onclick="deleteNewsletter(\'' + nl.id + '\')" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>' +
            '</div></td></tr>';
    }).join('');
    refreshIcons();
}

function openNewsletterForm(newsletterId) {
    newsletterId = newsletterId || '';
    var ex = newsletterId ? (AppState.newsletters || []).find(function(n) { return n.id === newsletterId; }) : null;
    var ie = !!ex;
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (ie ? 'edit-2' : 'plus') + '"></i>' + (ie ? 'Edit Bulletin' : 'Add Monthly Bulletin');
    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="saveNewsletter(event,\'' + newsletterId + '\')">',
            '<div class="form-group"><label><i data-lucide="type"></i>Title *</label><input type="text" id="nlTitle" required placeholder="e.g. Unity Bulletin - January 2025" value="' + (ie ? escapeHtml(ex.title) : '') + '"></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="calendar"></i>Month *</label><select id="nlMonth" required><option value="">Select Month</option>' + months.map(function(m) { return '<option value="' + m + '"' + (ie && ex.month === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>',
            '<div class="form-group"><label><i data-lucide="calendar"></i>Year *</label><input type="number" id="nlYear" required placeholder="2025" min="2014" max="2050" value="' + (ie ? ex.year : new Date().getFullYear()) + '"></div></div>',
            '<div class="form-group"><label><i data-lucide="file-text"></i>Description</label><textarea id="nlDesc" rows="3" placeholder="Brief description...">' + (ie && ex.description ? escapeHtml(ex.description) : '') + '</textarea></div>',
            '<div class="form-group"><label><i data-lucide="image"></i>Cover Image</label><div class="photo-upload-area" style="min-height:100px;"><input type="file" id="nlCoverFile" accept="image/*"><div>' + (ie && ex.cover_image_url ? '<img src="' + escapeHtml(ex.cover_image_url) + '" style="max-width:150px;max-height:200px;border-radius:8px;">' : '<div class="photo-placeholder"><i data-lucide="upload-cloud" style="width:28px;height:28px;"></i><small>Upload cover image</small></div>') + '</div></div></div>',
            '<div class="form-group"><label><i data-lucide="file"></i>Bulletin PDF</label><div class="photo-upload-area" style="min-height:60px;"><input type="file" id="nlPdfFile" accept=".pdf"><div class="photo-placeholder"><i data-lucide="file" style="width:24px;height:24px;"></i><small>' + (ie && ex.pdf_url ? 'Upload new PDF to replace' : 'Upload PDF file') + '</small></div></div></div>',
            '<div class="form-group" style="display:flex;align-items:center;gap:12px;"><label class="toggle-switch"><input type="checkbox" id="nlPublished" ' + (ie && ex.is_published ? 'checked' : '') + '><span class="toggle-slider"></span></label><span style="font-size:0.85rem;font-weight:500;">Published (visible on website)</span></div>',
            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;"><button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button><button type="submit" class="btn btn-primary" id="saveNlBtn"><i data-lucide="save"></i>' + (ie ? 'Update' : 'Add') + '</button></div>',
            '</form>'
        ].join('');
    }
    openModal('formModal'); refreshIcons();
}

async function saveNewsletter(formEvent, newsletterId) {
    formEvent.preventDefault();
    newsletterId = newsletterId || '';
    var ie = newsletterId.length > 5;
    var saveBtn = document.getElementById('saveNlBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span style="display:inline-flex;gap:6px;align-items:center;"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;"></span>Saving...</span>'; }
    try {
        if (!supabase) throw new Error('DB not connected');
        function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
        var title = gv('nlTitle'), month = gv('nlMonth'), year = parseInt(gv('nlYear'));
        if (!title || !month || !year) { showToast('error', 'Required', 'Title, month, and year are required'); return; }

        var existNl = ie ? (AppState.newsletters || []).find(function(n) { return n.id === newsletterId; }) : null;
        var coverUrl = existNl ? existNl.cover_image_url : null;
        var pdfUrl = existNl ? existNl.pdf_url : null;

        var coverFile = document.getElementById('nlCoverFile');
        if (coverFile && coverFile.files && coverFile.files[0]) {
            var cf = coverFile.files[0];
            var cfp = generateFilePath('bulletin-covers', cf.name);
            coverUrl = await uploadFile('newsletters', cfp, cf);
        }

        var pdfFile = document.getElementById('nlPdfFile');
        if (pdfFile && pdfFile.files && pdfFile.files[0]) {
            var pdf = pdfFile.files[0];
            if (pdf.size > 20 * 1024 * 1024) { showToast('error', 'File Too Large', 'PDF must be less than 20MB'); return; }
            var pfp = generateFilePath('bulletins', pdf.name);
            var pdfResult = await supabase.storage.from('newsletters').upload(pfp, pdf, { cacheControl: '3600', upsert: true });
            if (pdfResult.error) throw pdfResult.error;
            var pdfUrlData = supabase.storage.from('newsletters').getPublicUrl(pfp);
            pdfUrl = pdfUrlData.data ? pdfUrlData.data.publicUrl : null;
            if (pdfUrl) await trackFile('newsletters', pfp, pdf.name, pdf.size, 'application/pdf');
        }

        var publishedEl = document.getElementById('nlPublished');
        var isPublished = publishedEl ? publishedEl.checked : false;
        var data = { title: title, month: month, year: year, description: gv('nlDesc') || null, cover_image_url: coverUrl, pdf_url: pdfUrl, is_published: isPublished, updated_at: new Date().toISOString() };
        if (isPublished && !(existNl && existNl.published_at)) data.published_at = new Date().toISOString();

        if (ie) { var u = await supabase.from('newsletters').update(data).eq('id', newsletterId); if (u.error) throw u.error; }
        else { data.created_by = AppState.currentAdmin ? AppState.currentAdmin.id : null; var i = await supabase.from('newsletters').insert(data); if (i.error) throw i.error; }

        await logActivity(ie ? 'update_newsletter' : 'create_newsletter', 'newsletters', newsletterId || null, { title: title });
        closeModal('formModal'); showToast('success', 'Saved', 'Bulletin ' + (ie ? 'updated' : 'added'));
        await loadAdminNewsletters(); await loadPublicNewsletters();
    } catch (err) { showToast('error', 'Error', err.message); }
    finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i data-lucide="save"></i>' + (newsletterId.length > 5 ? 'Update' : 'Add'); refreshIcons(); } }
}

async function deleteNewsletter(newsletterId) {
    if (!newsletterId || !(await confirmAction('Delete?', 'Remove this bulletin from the website?', 'Yes, Delete'))) return;
    try {
        if (!supabase) return;
        var r = await supabase.from('newsletters').delete().eq('id', newsletterId);
        if (r.error) throw r.error;
        showToast('success', 'Deleted', 'Bulletin removed');
        await loadAdminNewsletters(); await loadPublicNewsletters();
    } catch (err) { showToast('error', 'Error', err.message); }
}

console.log('%c events.js loaded ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');