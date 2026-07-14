/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - MEETINGS MANAGEMENT
   Complete - Bug Free - All CRUD + Mail triggers working
   Uses Supabase Edge Function for .docx attendance generation
   File: meetings.js
   ============================================================ */

'use strict';

// ============================================================
// LOAD ADMIN MEETINGS
// ============================================================
async function loadAdminMeetings() {
    if (!AppState.currentAdmin || !supabase) return;

    try {
        const tf = document.getElementById('meetingTypeFilter');
        const tv = tf ? tf.value : 'all';

        let q = supabase
            .from('meetings')
            .select('*')
            .order('date',       { ascending: false })
            .order('start_time', { ascending: false });

        if (tv && tv !== 'all') {
            q = q.eq('meeting_type', tv);
        }

        const { data, error } = await q;
        if (error) throw error;

        AppState.meetings = data || [];
        renderAdminMeetingsTable(AppState.meetings);

    } catch (err) {
        console.error('[meetings] loadAdminMeetings error:', err);
        showToast('error', 'Error', 'Failed to load meetings');
    }
}

// ============================================================
// RENDER ADMIN MEETINGS TABLE  (9 columns — matches index.html)
// ============================================================
function renderAdminMeetingsTable(meetings) {
    const tbody = document.getElementById('meetingsTableBody');
    if (!tbody) return;

    if (!meetings || !meetings.length) {
        tbody.innerHTML = [
            '<tr>',
            '<td colspan="9" style="text-align:center;padding:40px;',
            'color:var(--text-tertiary);">',
            '<i data-lucide="video" style="display:block;margin:0 auto 8px;',
            'width:30px;height:30px;opacity:0.5;"></i>',
            'No meetings found. Click Schedule Meeting to create one.',
            '</td>',
            '</tr>',
        ].join('');
        refreshIcons();
        return;
    }

    tbody.innerHTML = meetings.map(function (mt) {
        const isPast        = _isPastMeeting(mt);
        const canUploadMins = isPast || mt.status === 'completed';

        return [
            '<tr>',

            // ── Col 1: Title + agenda preview ─────────────────
            '<td>',
            '<div style="max-width:180px;">',
            '<div style="font-weight:600;overflow:hidden;',
            'text-overflow:ellipsis;white-space:nowrap;" ',
            'title="' + escapeHtml(mt.title || '') + '">',
            escapeHtml(mt.title || ''),
            '</div>',
            mt.agenda
                ? '<div style="font-size:0.7rem;color:var(--text-tertiary);' +
                  'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" ' +
                  'title="' + escapeHtml(mt.agenda) + '">' +
                  escapeHtml(truncateText(mt.agenda, 35)) +
                  '</div>'
                : '',
            '</div>',
            '</td>',

            // ── Col 2: Meeting type badge ─────────────────────
            '<td>',
            '<span class="badge ' +
                (mt.meeting_type === 'board_meeting'
                    ? 'badge-warning' : 'badge-primary') + '" ' +
            'style="white-space:nowrap;font-size:0.68rem;">',
            escapeHtml(formatMeetingTypeLabel(mt.meeting_type)),
            '</span>',
            '</td>',

            // ── Col 3: Date ───────────────────────────────────
            '<td style="white-space:nowrap;">',
            escapeHtml(formatDateShort(mt.date)),
            '</td>',

            // ── Col 4: Time ───────────────────────────────────
            '<td style="white-space:nowrap;">',
            escapeHtml(formatTime(mt.start_time)),
            mt.end_time
                ? '<br><span style="font-size:0.7rem;color:var(--text-tertiary);">' +
                  'to ' + escapeHtml(formatTime(mt.end_time)) + '</span>'
                : '',
            '</td>',

            // ── Col 5: Venue ──────────────────────────────────
            '<td style="max-width:110px;overflow:hidden;',
            'text-overflow:ellipsis;white-space:nowrap;" ',
            'title="' + escapeHtml(mt.venue || '') + '">',
            escapeHtml(mt.venue || '-'),
            '</td>',

            // ── Col 6: Status ─────────────────────────────────
            '<td>',
            '<span class="table-status status-' +
                escapeHtml(mt.status || 'scheduled') + '">',
            escapeHtml(formatStatusLabel(mt.status || 'scheduled')),
            '</span>',
            '</td>',

            // ── Col 7: Intimation ─────────────────────────────
            '<td>',
            mt.intimation_sent
                ? '<span class="badge badge-success" ' +
                  'style="white-space:nowrap;">' +
                  '<i data-lucide="check" ' +
                  'style="width:10px;height:10px;"></i> Sent</span>' +
                  (mt.intimation_sent_at && typeof getRelativeTime === 'function'
                      ? '<div style="font-size:0.65rem;color:var(--text-tertiary);' +
                        'margin-top:2px;">' +
                        escapeHtml(getRelativeTime(mt.intimation_sent_at)) +
                        '</div>'
                      : '')
                : '<button class="btn btn-sm btn-outline" ' +
                  'data-action="send-intimation" ' +
                  'data-id="' + escapeHtml(mt.id) + '" ' +
                  'style="font-size:0.7rem;padding:3px 8px;white-space:nowrap;">' +
                  '<i data-lucide="send" ' +
                  'style="width:11px;height:11px;"></i> Send</button>',
            '</td>',

            // ── Col 8: Minutes ────────────────────────────────
            '<td>',
            mt.minutes_pdf_url
                ? '<a href="' + escapeHtml(mt.minutes_pdf_url) + '" ' +
                  'target="_blank" rel="noopener noreferrer" ' +
                  'class="badge badge-success" ' +
                  'style="text-decoration:none;white-space:nowrap;">' +
                  '<i data-lucide="file-text" ' +
                  'style="width:10px;height:10px;"></i> View</a>'
                : canUploadMins
                    ? '<button class="btn btn-sm btn-outline" ' +
                      'data-action="upload-minutes" ' +
                      'data-id="' + escapeHtml(mt.id) + '" ' +
                      'style="font-size:0.7rem;padding:3px 8px;white-space:nowrap;">' +
                      '<i data-lucide="upload" ' +
                      'style="width:11px;height:11px;"></i> Upload</button>'
                    : '<span class="badge badge-info" ' +
                      'style="white-space:nowrap;">After Mtg</span>',
            '</td>',

            // ── Col 9: Actions ────────────────────────────────
            '<td>',
            '<div class="table-actions">',

            // Edit
            '<button class="btn-icon" ',
            'data-action="edit-meeting" ',
            'data-id="' + escapeHtml(mt.id) + '" ',
            'title="Edit Meeting">',
            '<i data-lucide="edit-2"></i>',
            '</button>',

            // Mark completed
            (mt.status === 'scheduled' || mt.status === 'ongoing')
                ? '<button class="btn-icon" ' +
                  'data-action="complete-meeting" ' +
                  'data-id="' + escapeHtml(mt.id) + '" ' +
                  'title="Mark Completed" style="color:var(--success);">' +
                  '<i data-lucide="check-square"></i>' +
                  '</button>'
                : '',

            // View attendance
            (mt.attendance_form_url || mt.attendance_mail_sent)
                ? '<button class="btn-icon" ' +
                  'data-action="view-attendance" ' +
                  'data-id="' + escapeHtml(mt.id) + '" ' +
                  'title="View Attendance">' +
                  '<i data-lucide="clipboard-list"></i>' +
                  '</button>'
                : '',

            // Send attendance form (only after start time, not yet sent)
            (!mt.attendance_mail_sent && _isMeetingStartTimePassed(mt))
                ? '<button class="btn-icon" ' +
                  'data-action="trigger-attendance" ' +
                  'data-id="' + escapeHtml(mt.id) + '" ' +
                  'title="Send Attendance Form" style="color:var(--info);">' +
                  '<i data-lucide="send"></i>' +
                  '</button>'
                : '',

            // Download attendance
            canDownloadAttendance()
                ? '<button class="btn-icon" ' +
                  'data-action="download-attendance" ' +
                  'data-id="' + escapeHtml(mt.id) + '" ' +
                  'title="Download Attendance (.docx)">' +
                  '<i data-lucide="download"></i>' +
                  '</button>'
                : '',

            // Delete (super admin / president only)
            (isSuperAdmin() || isPresident())
                ? '<button class="btn-icon" ' +
                  'data-action="delete-meeting" ' +
                  'data-id="' + escapeHtml(mt.id) + '" ' +
                  'title="Delete Meeting" style="color:var(--danger);">' +
                  '<i data-lucide="trash-2"></i>' +
                  '</button>'
                : '',

            '</div>',
            '</td>',

            '</tr>',
        ].join('');
    }).join('');

    refreshIcons();
}

// ============================================================
// DELEGATED CLICK HANDLER
// Scoped strictly to #meetingsTableBody — will NOT intercept
// clicks from events, reports, or any other table.
// ============================================================
(function _attachMeetingTableListener() {
    'use strict';

    const MEETING_ACTIONS = new Set([
        'send-intimation',
        'upload-minutes',
        'edit-meeting',
        'complete-meeting',
        'trigger-attendance',
        'view-attendance',
        'download-attendance',
        'delete-meeting',
    ]);

    document.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        if (!MEETING_ACTIONS.has(action)) return;

        // Only handle buttons that live inside the meetings table body
        const tbody = document.getElementById('meetingsTableBody');
        if (!tbody || !tbody.contains(btn)) return;

        const id = btn.dataset.id;
        if (!id) return;

        e.preventDefault();
        e.stopPropagation();

        switch (action) {
            case 'send-intimation':     sendMeetingIntimation(id);    break;
            case 'upload-minutes':      openMinutesUpload(id);         break;
            case 'edit-meeting':        openMeetingForm(id);           break;
            case 'complete-meeting':    markMeetingCompleted(id);      break;
            case 'trigger-attendance':  triggerAttendanceMail(id);     break;
            case 'view-attendance':     viewMeetingAttendance(id);     break;
            case 'download-attendance': downloadMeetingAttendance(id); break;
            case 'delete-meeting':      deleteMeeting(id);             break;
        }
    });
}());

// ============================================================
// MEETING TIME HELPERS
// ============================================================
function _isPastMeeting(mt) {
    if (!mt || !mt.date) return false;
    try {
        if (mt.end_time) {
            const end = new Date(
                mt.date + 'T' + String(mt.end_time).substring(0, 5) + ':00'
            );
            return new Date() > end;
        }
        return typeof isPastDate === 'function'
            ? isPastDate(mt.date)
            : new Date() > new Date(mt.date + 'T23:59:59');
    } catch (e) {
        return false;
    }
}

function _isMeetingOngoing(mt) {
    if (!mt || !mt.date || !mt.start_time) return false;
    try {
        const now   = new Date();
        const start = new Date(
            mt.date + 'T' + String(mt.start_time).substring(0, 5) + ':00'
        );
        const end   = mt.end_time
            ? new Date(mt.date + 'T' + String(mt.end_time).substring(0, 5) + ':00')
            : new Date(start.getTime() + 2 * 60 * 60 * 1000);
        return now >= start && now <= end;
    } catch (e) {
        return false;
    }
}

function _isMeetingStartTimePassed(mt) {
    if (!mt || !mt.date || !mt.start_time) return false;
    try {
        const start = new Date(
            mt.date + 'T' + String(mt.start_time).substring(0, 5) + ':00'
        );
        return new Date() >= start;
    } catch (e) {
        return false;
    }
}

// Returns "HH:MM" or "HH:MM to HH:MM"
function _timeStr(startTime, endTime) {
    if (!startTime) return 'Not specified';
    const s = String(startTime).substring(0, 5);
    return endTime ? s + ' to ' + String(endTime).substring(0, 5) : s;
}

// ============================================================
// FIND MEETING IN LOCAL STATE
// ============================================================
function _findMeeting(meetingId) {
    if (!meetingId) return null;
    return (AppState.meetings || []).find(function (m) {
        return m.id === meetingId;
    }) || null;
}

// ============================================================
// INFO ROW HELPER  (used in form panels)
// ============================================================
function _infoRow(icon, text) {
    return [
        '<div style="display:flex;align-items:flex-start;gap:8px;">',
        '<i data-lucide="' + icon + '" ',
        'style="width:14px;height:14px;flex-shrink:0;',
        'margin-top:2px;color:var(--primary);"></i>',
        '<span>' + text + '</span>',
        '</div>',
    ].join('');
}

// ============================================================
// OPEN MEETING FORM  (Create / Edit)
// ============================================================
function openMeetingForm(meetingId) {
    meetingId    = (meetingId && String(meetingId).trim())
        ? String(meetingId).trim() : '';
    const isEdit = meetingId !== '';
    const ex     = isEdit ? _findMeeting(meetingId) : null;

    const titleEl = document.getElementById('formModalTitle');
    const bodyEl  = document.getElementById('formModalBody');

    if (!bodyEl) {
        console.error('[meetings] formModalBody not found');
        return;
    }

    if (titleEl) {
        titleEl.innerHTML =
            '<i data-lucide="' + (isEdit ? 'edit-2' : 'plus') + '"></i>' +
            (isEdit ? 'Edit Meeting' : 'Schedule New Meeting');
    }

    // Safe escaped value from existing record
    function sv(field) {
        if (!ex || ex[field] === null || ex[field] === undefined) return '';
        return escapeHtml(String(ex[field]));
    }

    // Safe HH:MM from existing record
    function st(field) {
        if (!ex || !ex[field]) return '';
        return escapeHtml(String(ex[field]).substring(0, 5));
    }

    const statusOptions = [
        ['scheduled', 'Scheduled'],
        ['ongoing',   'Ongoing'],
        ['completed', 'Completed'],
        ['cancelled', 'Cancelled'],
        ['postponed', 'Postponed'],
    ];

    bodyEl.innerHTML = [
        '<form id="meetingForm" novalidate>',

        // Meeting type
        '<div class="form-group">',
        '<label><i data-lucide="layers"></i>Meeting Type *</label>',
        '<select id="mtType" required>',
        '<option value="">Select Meeting Type</option>',
        '<option value="board_meeting"' +
            (ex && ex.meeting_type === 'board_meeting' ? ' selected' : '') +
            '>Board Meeting</option>',
        '<option value="general_body_meeting"' +
            (ex && ex.meeting_type === 'general_body_meeting' ? ' selected' : '') +
            '>General Body Meeting</option>',
        '</select>',
        '<small style="color:var(--text-tertiary);margin-top:4px;display:block;">',
        '<i data-lucide="info" style="width:12px;height:12px;',
        'display:inline;vertical-align:middle;"></i> ',
        'Board Meeting: invites sent to board members and admins only. ',
        'General Body Meeting: invites sent to all members.',
        '</small>',
        '</div>',

        // Title
        '<div class="form-group">',
        '<label><i data-lucide="type"></i>Meeting Title *</label>',
        '<input type="text" id="mtTitle" required ',
        'placeholder="e.g. Monthly Board Meeting - January 2025" ',
        'value="' + sv('title') + '">',
        '</div>',

        // Date + Start time
        '<div class="form-row">',
        '<div class="form-group">',
        '<label><i data-lucide="calendar"></i>Date *</label>',
        '<input type="date" id="mtDate" required value="' + sv('date') + '">',
        '</div>',
        '<div class="form-group">',
        '<label><i data-lucide="clock"></i>Start Time *</label>',
        '<input type="time" id="mtStartTime" required value="' + st('start_time') + '">',
        '</div>',
        '</div>',

        // End time + Venue
        '<div class="form-row">',
        '<div class="form-group">',
        '<label><i data-lucide="clock"></i>End Time</label>',
        '<input type="time" id="mtEndTime" value="' + st('end_time') + '">',
        '</div>',
        '<div class="form-group">',
        '<label><i data-lucide="map-pin"></i>Venue</label>',
        '<input type="text" id="mtVenue" placeholder="Meeting venue" ',
        'value="' + sv('venue') + '">',
        '</div>',
        '</div>',

        // Venue address
        '<div class="form-group">',
        '<label><i data-lucide="map"></i>Venue Address</label>',
        '<input type="text" id="mtVenueAddress" ',
        'placeholder="Full venue address or online meeting link" ',
        'value="' + sv('venue_address') + '">',
        '</div>',

        // Agenda
        '<div class="form-group">',
        '<label><i data-lucide="list"></i>Agenda</label>',
        '<textarea id="mtAgenda" rows="4" ',
        'placeholder="List the meeting agenda items...">' +
            (ex && ex.agenda ? escapeHtml(ex.agenda) : '') +
        '</textarea>',
        '</div>',

        // Description
        '<div class="form-group">',
        '<label><i data-lucide="file-text"></i>Description / Notes</label>',
        '<textarea id="mtDescription" rows="3" ',
        'placeholder="Additional meeting description or notes...">' +
            (ex && ex.description ? escapeHtml(ex.description) : '') +
        '</textarea>',
        '</div>',

        // Status (edit only)
        isEdit ? [
            '<div class="form-group">',
            '<label><i data-lucide="flag"></i>Status</label>',
            '<select id="mtStatus">',
            statusOptions.map(function (s) {
                return '<option value="' + s[0] + '"' +
                    (ex && ex.status === s[0] ? ' selected' : '') +
                    '>' + s[1] + '</option>';
            }).join(''),
            '</select>',
            '</div>',
        ].join('') : '',

        // Info panel
        '<div style="padding:14px;background:rgba(0,87,183,0.06);',
        'border:1px solid rgba(0,87,183,0.12);',
        'border-radius:var(--radius-sm);margin-top:8px;">',
        '<div style="font-size:0.82rem;display:flex;flex-direction:column;',
        'gap:6px;color:var(--text-secondary);">',
        _infoRow('info',
            'Meeting intimation email can be sent after creating the meeting.'),
        _infoRow('clock',
            'Attendance form email is sent at the meeting start time.'),
        _infoRow('file-text',
            'Meeting minutes (PDF) can be uploaded after the meeting ends.'),
        '</div>',
        '</div>',

        // Buttons
        '<div style="display:flex;gap:12px;justify-content:flex-end;',
        'margin-top:20px;padding-top:16px;',
        'border-top:1px solid var(--border-color);">',
        '<button type="button" class="btn btn-outline" ',
        'onclick="closeModal(\'formModal\')">',
        '<i data-lucide="x"></i>Cancel',
        '</button>',
        '<button type="submit" class="btn btn-primary" id="saveMeetingBtn">',
        '<i data-lucide="save"></i>',
        isEdit ? 'Update Meeting' : 'Schedule Meeting',
        '</button>',
        '</div>',

        '</form>',
    ].join('');

    // Attach submit listener AFTER innerHTML is written
    requestAnimationFrame(function () {
        const form = document.getElementById('meetingForm');
        if (!form) {
            console.error('[meetings] meetingForm element not found after render');
            return;
        }
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            e.stopPropagation();
            saveMeeting(meetingId, isEdit);
        });
    });

    openModal('formModal');
    refreshIcons();
}

// ============================================================
// SAVE MEETING
// ============================================================
async function saveMeeting(meetingId, isEdit) {
    const saveBtn = document.getElementById('saveMeetingBtn');

    function gv(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    const meetingType  = gv('mtType');
    const title        = gv('mtTitle');
    const date         = gv('mtDate');
    const startTime    = gv('mtStartTime');
    const endTime      = gv('mtEndTime');
    const venue        = gv('mtVenue');
    const venueAddress = gv('mtVenueAddress');
    const agenda       = gv('mtAgenda');
    const description  = gv('mtDescription');

    // Validation
    if (!meetingType) {
        showToast('error', 'Required', 'Please select a meeting type');
        return;
    }
    if (!title) {
        showToast('error', 'Required', 'Meeting title is required');
        return;
    }
    if (!date) {
        showToast('error', 'Required', 'Meeting date is required');
        return;
    }
    if (!startTime) {
        showToast('error', 'Required', 'Start time is required');
        return;
    }
    if (startTime && endTime && endTime <= startTime) {
        showToast('error', 'Invalid Time', 'End time must be after start time');
        return;
    }

    const originalLabel = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled  = true;
        saveBtn.innerHTML =
            '<span style="display:inline-flex;gap:6px;align-items:center;">' +
            '<span style="width:14px;height:14px;border:2px solid ' +
            'rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;' +
            'animation:spin 0.8s linear infinite;display:inline-block;"></span>' +
            'Saving...</span>';
    }

    try {
        if (!supabase) throw new Error('Database not connected');

        const now = new Date().toISOString();

        const meetingData = {
            meeting_type:  meetingType,
            title:         title,
            date:          date,
            start_time:    startTime,
            end_time:      endTime      || null,
            venue:         venue        || null,
            venue_address: venueAddress || null,
            agenda:        agenda       || null,
            description:   description  || null,
            updated_at:    now,
        };

        let savedId = meetingId;

        if (isEdit) {
            const statusEl = document.getElementById('mtStatus');
            if (statusEl && statusEl.value) {
                meetingData.status = statusEl.value;
            }

            const { error } = await supabase
                .from('meetings')
                .update(meetingData)
                .eq('id', meetingId);
            if (error) throw error;

        } else {
            meetingData.status               = 'scheduled';
            meetingData.intimation_sent      = false;
            meetingData.attendance_mail_sent = false;
            meetingData.minutes_mail_sent    = false;
            meetingData.created_at           = now;
            meetingData.created_by           = AppState.currentAdmin
                ? AppState.currentAdmin.id : null;

            const { data: inserted, error } = await supabase
                .from('meetings')
                .insert(meetingData)
                .select()
                .single();
            if (error) throw error;

            savedId = inserted ? inserted.id : null;
        }

        // Fire-and-forget activity log
        if (typeof logActivity === 'function') {
            logActivity(
                isEdit ? 'update_meeting' : 'create_meeting',
                'meetings',
                savedId || null,
                { title, type: meetingType, date }
            ).catch(function (e) {
                console.warn('[meetings] logActivity failed:', e);
            });
        }

        closeModal('formModal');
        showToast('success', 'Success',
            'Meeting ' + (isEdit ? 'updated' : 'scheduled') + ' successfully');
        await loadAdminMeetings();

    } catch (err) {
        console.error('[meetings] saveMeeting error:', err);
        showToast('error', 'Error', err.message || 'Failed to save meeting');

    } finally {
        if (saveBtn) {
            saveBtn.disabled  = false;
            saveBtn.innerHTML = originalLabel;
            refreshIcons();
        }
    }
}

// ============================================================
// SEND MEETING INTIMATION
// ============================================================
async function sendMeetingIntimation(meetingId) {
    const mt = _findMeeting(meetingId);
    if (!mt) { showToast('error', 'Error', 'Meeting not found'); return; }

    const typeLabel = formatMeetingTypeLabel(mt.meeting_type);
    const recipDesc = mt.meeting_type === 'board_meeting'
        ? 'board members and admins' : 'all members';

    const confirmed = await confirmAction(
        'Send Intimation?',
        'Send meeting invitation to ' + recipDesc + '?',
        'Yes, Send'
    );
    if (!confirmed) return;

    try {
        if (!supabase) throw new Error('Database not connected');

        // Collect recipients
        let members = [];
        if (mt.meeting_type === 'board_meeting') {
            if (typeof getBoardMemberEmails === 'function') {
                members = await getBoardMemberEmails();
            }
            const { data: admins, error: admErr } = await supabase
                .from('admin_users')
                .select('email')
                .eq('is_active', true);
            if (!admErr && admins) {
                admins.forEach(function (a) {
                    if (a.email && !members.find(function (m) {
                        return m.email === a.email;
                    })) {
                        members.push({ email: a.email, full_name: 'Admin' });
                    }
                });
            }
        } else {
            if (typeof getAllMemberEmails === 'function') {
                members = await getAllMemberEmails(false);
            } else {
                const { data: allM } = await supabase
                    .from('members')
                    .select('email, full_name')
                    .eq('is_active', true);
                members = allM || [];
            }
        }

        const emails = members
            .filter(function (m) { return m.email; })
            .map(function (m) { return m.email; });

        if (!emails.length) {
            showToast('warning', 'No Recipients', 'No valid email addresses found');
            return;
        }

        const subject =
            'Meeting Intimation: ' + mt.title + ' | ' +
            formatDateShort(mt.date) +
            ' | Rotaract Club of Coimbatore Unity';

        const bodyLines = [
            'Dear Members,', '',
            'You are cordially invited to attend the upcoming ' + typeLabel + '.', '',
            'MEETING DETAILS:',
            '='.repeat(60),
            'Title   : ' + mt.title,
            'Type    : ' + typeLabel,
            'Date    : ' + formatDate(mt.date),
            'Time    : ' + _timeStr(mt.start_time, mt.end_time),
            'Venue   : ' + (mt.venue || 'To be announced'),
            mt.venue_address ? 'Address : ' + mt.venue_address : null,
            '='.repeat(60),
            mt.agenda      ? '\nAgenda:\n' + mt.agenda      : null,
            mt.description ? '\nNote:\n'   + mt.description : null,
            '',
            'Your presence is highly appreciated.',
            'An attendance form will be shared at the meeting start time.', '',
            'Regards,',
            'Rotaract Club of Coimbatore Unity',
            'Family of Rotary Club of Coimbatore East',
            'Rotary International District 3206 (Coimbatore | Pallakkad)',
            'Email: rc.cbeunity@gmail.com',
        ].filter(function (l) { return l !== null; }).join('\n');

        const { error: nqErr } = await supabase
            .from('notification_queue')
            .insert({
                notification_type:   'meeting_intimation',
                recipient_type:      mt.meeting_type === 'board_meeting'
                    ? 'board' : 'all',
                recipient_emails:    emails,
                subject:             subject,
                body:                bodyLines,
                html_body:           bodyLines.replace(/\n/g, '<br>'),
                related_entity_type: 'meetings',
                related_entity_id:   mt.id,
                status:              'queued',
                created_by:          AppState.currentAdmin
                    ? AppState.currentAdmin.id : null,
            });
        if (nqErr) throw nqErr;

        await supabase.from('meetings').update({
            intimation_sent:             true,
            intimation_sent_at:          new Date().toISOString(),
            intimation_recipients_count: emails.length,
        }).eq('id', meetingId);

        await supabase.from('mail_log').insert({
            mail_type:           'meeting_intimation',
            recipient:           emails.length + ' ' + recipDesc,
            subject:             subject,
            body:                bodyLines,
            status:              'queued',
            related_entity_type: 'meetings',
            related_entity_id:   meetingId,
        });

        if (typeof logActivity === 'function') {
            logActivity('send_meeting_intimation', 'meetings', meetingId, {
                recipients: emails.length,
                type:       mt.meeting_type,
            }).catch(function (e) {
                console.warn('[meetings] logActivity failed:', e);
            });
        }

        showToast('success', 'Sent',
            'Meeting invitation queued for ' + emails.length + ' recipient(s)');
        await loadAdminMeetings();

    } catch (err) {
        console.error('[meetings] sendMeetingIntimation error:', err);
        showToast('error', 'Error', err.message || 'Failed to send intimation');
    }
}

// ============================================================
// TRIGGER ATTENDANCE FORM MAIL  (Manual)
// ============================================================
async function triggerAttendanceMail(meetingId) {
    const mt = _findMeeting(meetingId);
    if (!mt) { showToast('error', 'Error', 'Meeting not found'); return; }

    const confirmed = await confirmAction(
        'Send Attendance Form?',
        'Send attendance form link to members now?',
        'Yes, Send'
    );
    if (!confirmed) return;

    try {
        if (!supabase) throw new Error('Database not connected');

        const attendanceUrl =
            window.location.origin +
            (window.location.pathname || '/') +
            '?attendance=' + encodeURIComponent(mt.id);

        const typeLabel = formatMeetingTypeLabel(mt.meeting_type);

        let q = supabase
            .from('members')
            .select('email, full_name')
            .eq('is_active', true);
        if (mt.meeting_type === 'board_meeting') {
            q = q.eq('is_board_member', true);
        }
        const { data: members, error: mErr } = await q;
        if (mErr) throw mErr;

        const emails = (members || [])
            .filter(function (m) { return m.email; })
            .map(function (m) { return m.email; });

        if (!emails.length) {
            showToast('warning', 'No Recipients', 'No emails found');
            return;
        }

        const subject =
            'Meeting Attendance: ' + mt.title +
            ' | Rotaract Club of Coimbatore Unity';

        const bodyLines = [
            'Dear Members,', '',
            'ATTENDANCE SHEET',
            '='.repeat(60),
            'Meeting  : ' + mt.title,
            'Type     : ' + typeLabel,
            'Date     : ' + formatDate(mt.date),
            'Time     : ' + _timeStr(mt.start_time, mt.end_time),
            'Venue    : ' + (mt.venue || 'To be announced'),
            '='.repeat(60), '',
            'Mark your attendance here:',
            attendanceUrl, '',
            'The form collects your name, designation, RI ID, ' +
                'in-time, and e-signature.',
            'Please submit before the meeting ends.', '',
            'Regards,',
            'Rotaract Club of Coimbatore Unity',
            'Family of Rotary Club of Coimbatore East',
            'Rotary International District 3206 (Coimbatore | Pallakkad)',
        ].join('\n');

        const { error: nqErr } = await supabase
            .from('notification_queue')
            .insert({
                notification_type:   'meeting_attendance',
                recipient_type:      mt.meeting_type === 'board_meeting'
                    ? 'board' : 'all',
                recipient_emails:    emails,
                subject:             subject,
                body:                bodyLines,
                html_body:           bodyLines.replace(/\n/g, '<br>'),
                related_entity_type: 'meetings',
                related_entity_id:   mt.id,
                status:              'queued',
                created_by:          AppState.currentAdmin
                    ? AppState.currentAdmin.id : null,
            });
        if (nqErr) throw nqErr;

        await supabase.from('meetings').update({
            attendance_mail_sent:        true,
            attendance_mail_sent_at:     new Date().toISOString(),
            attendance_form_url:         attendanceUrl,
            attendance_recipients_count: emails.length,
            status:                      'ongoing',
        }).eq('id', meetingId);

        await supabase.from('mail_log').insert({
            mail_type:           'meeting_attendance',
            recipient:           emails.length + ' member(s)',
            subject:             subject,
            status:              'queued',
            related_entity_type: 'meetings',
            related_entity_id:   meetingId,
        });

        if (typeof logActivity === 'function') {
            logActivity('send_attendance_form', 'meetings', meetingId, {
                recipients: emails.length,
            }).catch(function (e) {
                console.warn('[meetings] logActivity failed:', e);
            });
        }

        showToast('success', 'Sent',
            'Attendance form queued for ' + emails.length + ' member(s)');
        await loadAdminMeetings();

    } catch (err) {
        console.error('[meetings] triggerAttendanceMail error:', err);
        showToast('error', 'Error', err.message || 'Failed to send attendance form');
    }
}

// ============================================================
// MARK MEETING COMPLETED
// ============================================================
async function markMeetingCompleted(meetingId) {
    const confirmed = await confirmAction(
        'Mark as Completed?',
        'You can then upload the meeting minutes.',
        'Yes, Complete'
    );
    if (!confirmed) return;

    try {
        if (!supabase) throw new Error('Database not connected');

        const { error } = await supabase
            .from('meetings')
            .update({
                status:     'completed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', meetingId);
        if (error) throw error;

        if (typeof logActivity === 'function') {
            logActivity('complete_meeting', 'meetings', meetingId, {}).catch(
                function (e) { console.warn('[meetings] logActivity failed:', e); }
            );
        }

        showToast('success', 'Completed',
            'Meeting marked as completed. You can now upload minutes.');
        await loadAdminMeetings();

    } catch (err) {
        console.error('[meetings] markMeetingCompleted error:', err);
        showToast('error', 'Error', err.message || 'Failed to update meeting');
    }
}

// ============================================================
// OPEN MINUTES UPLOAD FORM
// ============================================================
function openMinutesUpload(meetingId) {
    const mt = _findMeeting(meetingId);
    if (!mt) { showToast('error', 'Error', 'Meeting not found'); return; }

    if (!_isPastMeeting(mt) && mt.status !== 'completed') {
        showToast('info', 'Not Yet',
            'Minutes can only be uploaded after the meeting ends');
        return;
    }

    const titleEl = document.getElementById('formModalTitle');
    const bodyEl  = document.getElementById('formModalBody');

    if (titleEl) {
        titleEl.innerHTML =
            '<i data-lucide="upload"></i>Upload Meeting Minutes';
    }

    if (!bodyEl) { openModal('formModal'); refreshIcons(); return; }

    bodyEl.innerHTML = [
        '<form id="minutesForm" novalidate>',

        // Meeting info card
        '<div style="padding:14px;background:rgba(0,87,183,0.06);',
        'border:1px solid rgba(0,87,183,0.12);',
        'border-radius:var(--radius-sm);margin-bottom:20px;">',
        '<div style="font-weight:700;margin-bottom:4px;">',
        escapeHtml(mt.title || ''),
        '</div>',
        '<div style="font-size:0.82rem;color:var(--text-secondary);">',
        escapeHtml(formatMeetingTypeLabel(mt.meeting_type)) + ' | ' +
            escapeHtml(formatDate(mt.date)) + ' | ' +
            escapeHtml(formatTime(mt.start_time)),
        '</div>',
        '</div>',

        // Already uploaded notice
        mt.minutes_pdf_url ? [
            '<div style="padding:12px;background:rgba(16,185,129,0.06);',
            'border:1px solid rgba(16,185,129,0.15);',
            'border-radius:var(--radius-sm);margin-bottom:16px;',
            'display:flex;align-items:center;gap:10px;">',
            '<i data-lucide="file-text" ',
            'style="width:18px;height:18px;color:var(--success);flex-shrink:0;">',
            '</i>',
            '<div>',
            '<div style="font-size:0.82rem;font-weight:600;">',
            'Minutes already uploaded</div>',
            '<a href="' + escapeHtml(mt.minutes_pdf_url) + '" ',
            'target="_blank" rel="noopener noreferrer" ',
            'style="font-size:0.78rem;color:var(--primary);">',
            'View current minutes</a>',
            '</div>',
            '</div>',
        ].join('') : '',

        // File picker
        '<div class="form-group">',
        '<label><i data-lucide="file"></i>Meeting Minutes PDF *</label>',
        '<div class="photo-upload-area" style="min-height:100px;">',
        '<input type="file" id="minutesPdf" accept=".pdf" required>',
        '<div class="photo-placeholder">',
        '<i data-lucide="file" style="width:36px;height:36px;"></i>',
        '<span>',
        mt.minutes_pdf_url
            ? 'Upload new PDF to replace existing'
            : 'Click to select PDF file',
        '</span>',
        '<small>Accepts PDF format only. Maximum 20 MB.</small>',
        '</div>',
        '</div>',
        '</div>',

        // Send mail toggle
        '<div class="form-group" ',
        'style="display:flex;align-items:center;gap:12px;">',
        '<label class="toggle-switch">',
        '<input type="checkbox" id="minutesSendMail" checked>',
        '<span class="toggle-slider"></span>',
        '</label>',
        '<span style="font-size:0.85rem;font-weight:500;">Send minutes to ',
        mt.meeting_type === 'board_meeting' ? 'board members' : 'all members',
        ' via email</span>',
        '</div>',

        // Buttons
        '<div style="display:flex;gap:12px;justify-content:flex-end;',
        'margin-top:16px;">',
        '<button type="button" class="btn btn-outline" ',
        'onclick="closeModal(\'formModal\')">',
        '<i data-lucide="x"></i>Cancel</button>',
        '<button type="submit" class="btn btn-primary" id="saveMinutesBtn">',
        '<i data-lucide="upload"></i>Upload Minutes</button>',
        '</div>',

        '</form>',
    ].join('');

    requestAnimationFrame(function () {
        const form = document.getElementById('minutesForm');
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            e.stopPropagation();
            saveMinutes(meetingId);
        });
    });

    openModal('formModal');
    refreshIcons();
}

// ============================================================
// SAVE MINUTES
// ============================================================
async function saveMinutes(meetingId) {
    const saveBtn    = document.getElementById('saveMinutesBtn');
    const pdfInput   = document.getElementById('minutesPdf');
    const sendMailEl = document.getElementById('minutesSendMail');
    const shouldSend = sendMailEl ? sendMailEl.checked : false;

    if (!pdfInput || !pdfInput.files || !pdfInput.files[0]) {
        showToast('error', 'Required', 'Please select a PDF file');
        return;
    }

    const pdf = pdfInput.files[0];

    if (pdf.type && !pdf.type.includes('pdf')) {
        showToast('error', 'Invalid', 'Only PDF files are accepted');
        return;
    }
    if (pdf.size > 20 * 1024 * 1024) {
        showToast('error', 'Too Large', 'Maximum file size is 20 MB');
        return;
    }

    const originalLabel = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled  = true;
        saveBtn.innerHTML =
            '<span style="display:inline-flex;gap:6px;align-items:center;">' +
            '<span style="width:14px;height:14px;border:2px solid ' +
            'rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;' +
            'animation:spin 0.8s linear infinite;display:inline-block;"></span>' +
            'Uploading...</span>';
    }

    try {
        if (!supabase) throw new Error('Database not connected');

        // Upload to Supabase Storage
        const filePath = typeof generateFilePath === 'function'
            ? generateFilePath('minutes', pdf.name)
            : 'minutes/' + Date.now() + '_' +
              pdf.name.replace(/[^a-zA-Z0-9._-]/g, '_');

        const { error: upErr } = await supabase.storage
            .from('minutes')
            .upload(filePath, pdf, { cacheControl: '3600', upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage
            .from('minutes')
            .getPublicUrl(filePath);
        const pdfUrl = urlData && urlData.publicUrl ? urlData.publicUrl : null;
        if (!pdfUrl) throw new Error('Could not get PDF public URL');

        if (typeof trackFile === 'function') {
            await trackFile(
                'minutes', filePath, pdf.name, pdf.size, 'application/pdf'
            );
        }

        const { error: updErr } = await supabase
            .from('meetings')
            .update({
                minutes_pdf_url:     pdfUrl,
                minutes_uploaded_at: new Date().toISOString(),
                minutes_uploaded_by: AppState.currentAdmin
                    ? AppState.currentAdmin.id : null,
                status:              'completed',
                updated_at:          new Date().toISOString(),
            })
            .eq('id', meetingId);
        if (updErr) throw updErr;

        if (shouldSend) {
            const mt = _findMeeting(meetingId);
            if (mt) await _sendMinutesMail(mt, pdfUrl);
        }

        if (typeof logActivity === 'function') {
            logActivity('upload_minutes', 'meetings', meetingId, {
                fileName: pdf.name,
            }).catch(function (e) {
                console.warn('[meetings] logActivity failed:', e);
            });
        }

        closeModal('formModal');
        showToast('success', 'Uploaded', 'Meeting minutes uploaded successfully');
        await loadAdminMeetings();

    } catch (err) {
        console.error('[meetings] saveMinutes error:', err);
        showToast('error', 'Error', err.message || 'Failed to upload minutes');
    } finally {
        if (saveBtn) {
            saveBtn.disabled  = false;
            saveBtn.innerHTML = originalLabel;
            refreshIcons();
        }
    }
}

// ============================================================
// SEND MINUTES MAIL  (Internal — non-fatal)
// ============================================================
async function _sendMinutesMail(mt, pdfUrl) {
    try {
        if (!supabase || !mt || !pdfUrl) return;

        let q = supabase
            .from('members')
            .select('email')
            .eq('is_active', true);
        if (mt.meeting_type === 'board_meeting') {
            q = q.eq('is_board_member', true);
        }
        const { data: members } = await q;
        let emails = (members || [])
            .map(function (m) { return m.email; })
            .filter(Boolean);

        if (mt.meeting_type === 'board_meeting') {
            const { data: admins } = await supabase
                .from('admin_users')
                .select('email')
                .eq('is_active', true);
            (admins || []).forEach(function (a) {
                if (a.email && emails.indexOf(a.email) === -1) {
                    emails.push(a.email);
                }
            });
        }

        if (!emails.length) return;

        const subject =
            'Meeting Minutes: ' + mt.title +
            ' | Rotaract Club of Coimbatore Unity';

        const bodyLines = [
            'Dear Members,', '',
            'The minutes of the ' +
                formatMeetingTypeLabel(mt.meeting_type) +
                ' have been published.', '',
            'Meeting : ' + mt.title,
            'Date    : ' + formatDate(mt.date),
            'Time    : ' + _timeStr(mt.start_time, mt.end_time), '',
            'View Meeting Minutes:',
            pdfUrl, '',
            'Regards,',
            'Rotaract Club of Coimbatore Unity',
            'Family of Rotary Club of Coimbatore East',
            'Rotary International District 3206 (Coimbatore | Pallakkad)',
        ].join('\n');

        await supabase.from('notification_queue').insert({
            notification_type:   'meeting_minutes',
            recipient_type:      mt.meeting_type === 'board_meeting'
                ? 'board' : 'all',
            recipient_emails:    emails,
            subject:             subject,
            body:                bodyLines,
            html_body:           bodyLines.replace(/\n/g, '<br>'),
            related_entity_type: 'meetings',
            related_entity_id:   mt.id,
            status:              'queued',
            created_by:          AppState.currentAdmin
                ? AppState.currentAdmin.id : null,
        });

        await supabase.from('meetings').update({
            minutes_mail_sent:    true,
            minutes_mail_sent_at: new Date().toISOString(),
        }).eq('id', mt.id);

        await supabase.from('mail_log').insert({
            mail_type:           'meeting_minutes',
            recipient:           emails.length + ' member(s)',
            subject:             subject,
            status:              'queued',
            related_entity_type: 'meetings',
            related_entity_id:   mt.id,
        });

        console.log('[meetings] Minutes mail queued for',
            emails.length, 'recipients');

    } catch (err) {
        console.error('[meetings] _sendMinutesMail error:', err);
        // Non-fatal — do not rethrow
    }
}

// ============================================================
// VIEW MEETING ATTENDANCE
// ============================================================
async function viewMeetingAttendance(meetingId) {
    try {
        const mt = _findMeeting(meetingId);
        if (!mt) { showToast('error', 'Error', 'Meeting not found'); return; }
        if (!supabase) { showToast('error', 'Error', 'Database not connected'); return; }

        const { data: att, error } = await supabase
            .from('meeting_attendance')
            .select('*')
            .eq('meeting_id', meetingId)
            .order('submitted_at', { ascending: true });
        if (error) throw error;

        const records = att || [];
        const titleEl = document.getElementById('formModalTitle');
        const bodyEl  = document.getElementById('formModalBody');

        if (titleEl) {
            titleEl.innerHTML =
                '<i data-lucide="clipboard-list"></i>Attendance: ' +
                escapeHtml(mt.title || '');
        }

        if (!bodyEl) { openModal('formModal'); refreshIcons(); return; }

        bodyEl.innerHTML = [
            // Meeting info card
            '<div style="padding:14px;background:rgba(0,87,183,0.06);',
            'border:1px solid rgba(0,87,183,0.12);',
            'border-radius:var(--radius-sm);margin-bottom:18px;">',
            '<div style="font-weight:700;margin-bottom:4px;">',
            escapeHtml(mt.title || ''),
            '</div>',
            '<div style="font-size:0.82rem;color:var(--text-secondary);">',
            escapeHtml(formatMeetingTypeLabel(mt.meeting_type)) + ' | ' +
                escapeHtml(formatDate(mt.date)) + ' | ' +
                escapeHtml(formatTime(mt.start_time)),
            '</div>',
            '<div style="font-size:0.82rem;color:var(--primary);',
            'font-weight:700;margin-top:4px;">',
            'Total Present: ' + records.length,
            '</div>',
            '</div>',

            // Attendance table or empty state
            records.length > 0 ? [
                '<div class="admin-table-container" style="margin-bottom:16px;">',
                '<table class="admin-table">',
                '<thead><tr>',
                '<th>S.No</th><th>Name</th><th>Designation</th>',
                '<th>RI ID</th><th>In Time</th><th>E-Sign</th><th>Submitted</th>',
                '</tr></thead>',
                '<tbody>',
                records.map(function (a, i) {
                    return [
                        '<tr>',
                        '<td>' + (i + 1) + '</td>',
                        '<td><strong>' +
                            escapeHtml(a.member_name || '-') +
                            '</strong></td>',
                        '<td>' + escapeHtml(a.designation || '-') + '</td>',
                        '<td>' + escapeHtml(a.ri_id || '-') + '</td>',
                        '<td>' + (a.in_time
                            ? escapeHtml(formatTime(a.in_time)) : '-') +
                        '</td>',
                        '<td>',
                        a.e_sign_url
                            ? '<img src="' + escapeHtml(a.e_sign_url) + '" ' +
                              'alt="E-Signature" ' +
                              'style="width:40px;height:30px;object-fit:contain;' +
                              'border-radius:4px;cursor:pointer;' +
                              'border:1px solid var(--border-color);" ' +
                              'onerror="this.style.display=\'none\'" ' +
                              'onclick="openImageViewer([\'' +
                              escapeHtml(a.e_sign_url) + '\'],0)">'
                            : '-',
                        '</td>',
                        '<td style="font-size:0.75rem;white-space:nowrap;">' +
                            escapeHtml(_formatTimestamp(a.submitted_at)) +
                        '</td>',
                        '</tr>',
                    ].join('');
                }).join(''),
                '</tbody>',
                '</table>',
                '</div>',
            ].join('') : [
                '<div style="text-align:center;padding:40px;',
                'color:var(--text-tertiary);">',
                '<i data-lucide="clipboard" style="width:32px;height:32px;',
                'display:block;margin:0 auto 8px;opacity:0.5;"></i>',
                '<p>No attendance records yet.</p>',
                '<p style="font-size:0.82rem;">',
                'Records appear once members submit the form.</p>',
                '</div>',
            ].join(''),

            // Action buttons
            '<div style="display:flex;gap:10px;justify-content:flex-end;',
            'flex-wrap:wrap;',
            'padding-top:16px;border-top:1px solid var(--border-color);">',

            '<button class="btn btn-outline" ',
            'onclick="copyAttendanceLink(\'' + escapeHtml(meetingId) + '\')">',
            '<i data-lucide="copy"></i>Copy Link</button>',

            !mt.attendance_mail_sent
                ? '<button class="btn btn-outline" ' +
                  'onclick="closeModal(\'formModal\');' +
                  'triggerAttendanceMail(\'' + escapeHtml(meetingId) + '\')">' +
                  '<i data-lucide="send"></i>Send Form</button>'
                : '',

            records.length > 0 && canDownloadAttendance()
                ? '<button class="btn btn-outline" ' +
                  'onclick="closeModal(\'formModal\');' +
                  'downloadMeetingAttendance(\'' + escapeHtml(meetingId) + '\')">' +
                  '<i data-lucide="download"></i>Download .docx</button>'
                : '',

            '<button class="btn btn-primary" ',
            'onclick="closeModal(\'formModal\')">',
            '<i data-lucide="check"></i>Close</button>',
            '</div>',
        ].join('');

        openModal('formModal');
        refreshIcons();

    } catch (err) {
        console.error('[meetings] viewMeetingAttendance error:', err);
        showToast('error', 'Error', 'Failed to load attendance');
    }
}

// ============================================================
// COPY ATTENDANCE LINK
// ============================================================
function copyAttendanceLink(meetingId) {
    const link =
        window.location.origin +
        (window.location.pathname || '/') +
        '?attendance=' + encodeURIComponent(meetingId);

    if (typeof copyToClipboard === 'function') {
        copyToClipboard(link);
        return;
    }
    navigator.clipboard.writeText(link)
        .then(function () {
            showToast('success', 'Copied', 'Attendance link copied to clipboard');
        })
        .catch(function () {
            showToast('error', 'Error', 'Could not copy link');
        });
}

// ============================================================
// DOWNLOAD MEETING ATTENDANCE AS .DOCX  (via Edge Function)
// ============================================================
async function downloadMeetingAttendance(meetingId) {
    if (!canDownloadAttendance()) {
        showToast('error', 'Denied', 'No permission to download attendance');
        return;
    }

    // Resolve meeting — try local state first, then DB
    let mt = _findMeeting(meetingId);
    if (!mt) {
        if (!supabase) {
            showToast('error', 'Error', 'Database not connected');
            return;
        }
        const { data, error } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', meetingId)
            .single();
        if (error || !data) {
            showToast('error', 'Error', 'Meeting not found');
            return;
        }
        mt = data;
    }

    if (!supabase) {
        showToast('error', 'Error', 'Database not connected');
        return;
    }

    const { data: att, error: attErr } = await supabase
        .from('meeting_attendance')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('submitted_at', { ascending: true });

    if (attErr) {
        showToast('error', 'Error', 'Failed to fetch attendance records');
        return;
    }
    if (!att || att.length === 0) {
        showToast('info', 'No Data', 'No attendance records to download');
        return;
    }

    const toastId = showToast(
        'info', 'Generating',
        'Building attendance sheet for ' + att.length + ' record(s)...',
        30000
    );

    try {
        const payload = {
            type:       'attendance',
            meeting:    mt,
            attendance: att,
        };

        if (typeof _callReportEdgeFunction !== 'function') {
            throw new Error(
                '_callReportEdgeFunction is not defined. ' +
                'Ensure reports.js is loaded before meetings.js.'
            );
        }

        const resp = await _callReportEdgeFunction(payload);

        const ct = resp.headers.get('Content-Type') || '';
        if (!ct.startsWith('application/vnd.openxmlformats')) {
            let errBody = '';
            try { errBody = JSON.stringify(await resp.json()); } catch { /* ignore */ }
            throw new Error(
                'Unexpected response type: ' + ct +
                (errBody ? '. ' + errBody : '')
            );
        }

        const blob     = await resp.blob();
        const safeName = (typeof slugify === 'function')
            ? slugify(mt.title || 'meeting')
            : (mt.title || 'meeting')
                .replace(/[^a-z0-9]/gi, '_')
                .toLowerCase();
        const fileName =
            'Attendance_' + safeName + '_' + (mt.date || '') + '.docx';

        _saveMeetingBlob(blob, fileName);

        removeToast(toastId);

        if (typeof logActivity === 'function') {
            logActivity('download_attendance', 'meetings', meetingId, {
                count: att.length,
                title: mt.title,
            }).catch(function (e) {
                console.warn('[meetings] logActivity failed:', e);
            });
        }

        showToast('success', 'Downloaded',
            'Attendance sheet saved as <strong>' +
            escapeHtml(fileName) + '</strong>');

    } catch (err) {
        removeToast(toastId);
        console.error('[meetings] downloadMeetingAttendance error:', err);
        showToast('error', 'Error',
            err.message || 'Failed to generate attendance document');
    }
}

// ============================================================
// SAVE BLOB HELPER  (works from file:// and http://)
// ============================================================
function _saveMeetingBlob(blob, fileName) {
    if (typeof saveAs === 'function') {
        saveAs(blob, fileName);
        return;
    }
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 1000);
}

// ============================================================
// TIMESTAMP FORMATTER  (local fallback)
// ============================================================
function _formatTimestamp(iso) {
    if (!iso) return '-';
    // Use global if available and it is not this very function
    if (typeof formatTimestamp === 'function' &&
        formatTimestamp !== _formatTimestamp) {
        return formatTimestamp(iso);
    }
    try {
        return new Date(iso).toLocaleString('en-IN', {
            day:    '2-digit',
            month:  'short',
            year:   'numeric',
            hour:   '2-digit',
            minute: '2-digit',
        });
    } catch (e) {
        return String(iso);
    }
}

// ============================================================
// DELETE MEETING
// ============================================================
async function deleteMeeting(meetingId) {
    if (!isSuperAdmin() && !isPresident()) {
        showToast('error', 'Access Denied',
            'Only Super Admin or President can delete meetings');
        return;
    }

    const confirmed = await confirmAction(
        'Delete Meeting?',
        'This will permanently delete the meeting and all its attendance ' +
        'records. This action cannot be undone.',
        'Yes, Delete'
    );
    if (!confirmed) return;

    try {
        if (!supabase) throw new Error('Database not connected');

        // Delete child records first (FK constraint)
        await supabase
            .from('meeting_attendance')
            .delete()
            .eq('meeting_id', meetingId);

        const { error } = await supabase
            .from('meetings')
            .delete()
            .eq('id', meetingId);
        if (error) throw error;

        if (typeof logActivity === 'function') {
            logActivity('delete_meeting', 'meetings', meetingId, {}).catch(
                function (e) { console.warn('[meetings] logActivity failed:', e); }
            );
        }

        showToast('success', 'Deleted', 'Meeting deleted successfully');
        await loadAdminMeetings();

    } catch (err) {
        console.error('[meetings] deleteMeeting error:', err);
        showToast('error', 'Error', err.message || 'Failed to delete meeting');
    }
}

// ============================================================
// MEETING STATISTICS
// ============================================================
function getMeetingStats() {
    const meetings = AppState.meetings || [];
    return {
        total:           meetings.length,
        board:           meetings.filter(function (m) {
            return m.meeting_type === 'board_meeting';
        }).length,
        general:         meetings.filter(function (m) {
            return m.meeting_type === 'general_body_meeting';
        }).length,
        scheduled:       meetings.filter(function (m) {
            return m.status === 'scheduled';
        }).length,
        completed:       meetings.filter(function (m) {
            return m.status === 'completed';
        }).length,
        cancelled:       meetings.filter(function (m) {
            return m.status === 'cancelled';
        }).length,
        withMinutes:     meetings.filter(function (m) {
            return !!m.minutes_pdf_url;
        }).length,
        intimationsSent: meetings.filter(function (m) {
            return !!m.intimation_sent;
        }).length,
    };
}

// ============================================================
// EXPORT MEETING TO CALENDAR
// ============================================================
function exportMeetingToCalendar(meetingId) {
    const mt = _findMeeting(meetingId);
    if (!mt) { showToast('error', 'Error', 'Meeting not found'); return; }

    const evData = {
        title:       mt.title       || '',
        date:        mt.date        || '',
        start_time:  mt.start_time  || '',
        end_time:    mt.end_time    || '',
        venue:       mt.venue       || '',
        description: formatMeetingTypeLabel(mt.meeting_type) +
            '\n\n' + (mt.agenda      || '') +
            '\n\n' + (mt.description || ''),
    };

    if (typeof safeDownloadICS === 'function') {
        safeDownloadICS(evData);
    } else if (typeof downloadICSFile === 'function') {
        downloadICSFile(evData);
    } else {
        showToast('error', 'Error', 'Calendar export is not available');
    }
}

console.log('%c meetings.js loaded ',
    'background:#0057b7;color:#fff;padding:2px 8px;' +
    'border-radius:3px;font-size:11px;');