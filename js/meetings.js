/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - MEETINGS MODULE
   General & Board Meetings | Draft Minutes | Fixed Email Send
   Auto Attendance 5 Min Before | Manual Attendance Trigger
   ============================================================ */

var Meetings = {
    initialized: false,
    editingId: null,
    currentPhotos: [],
    minutesItems: [],
    edgeFunctionUrl: 'https://dledwtepuvzzztfypbgn.supabase.co/functions/v1/generate-docx',

    init: function() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindEvents();
        this.checkForMeetingTriggers();
    },

    bindEvents: function() {
        var addBtn = document.getElementById('addMeetingBtn');
        if (addBtn) addBtn.addEventListener('click', function() { Meetings.openMeetingForm(); });

        var closeBtn = document.getElementById('meetingFormClose');
        if (closeBtn) closeBtn.addEventListener('click', function() { Meetings.closeMeetingForm(); });

        var form = document.getElementById('meetingForm');
        if (form) form.addEventListener('submit', function(e) { Meetings.saveMeeting(e); });

        var posterInput = document.getElementById('meetingPosterInput');
        if (posterInput) {
            posterInput.addEventListener('change', function(e) {
                var preview = document.getElementById('meetingPosterPreview');
                if (typeof App !== 'undefined') App.previewImage(e.target.files[0], preview);
            });
        }

        var filterType = document.getElementById('meetingFilterType');
        var filterStatus = document.getElementById('meetingFilterStatus');
        if (filterType) filterType.addEventListener('change', function() { Meetings.loadMeetings(); });
        if (filterStatus) filterStatus.addEventListener('change', function() { Meetings.loadMeetings(); });

        var minutesClose = document.getElementById('minutesFormClose');
        if (minutesClose) minutesClose.addEventListener('click', function() { Meetings.closeMinutesForm(); });

        var minutesForm = document.getElementById('minutesForm');
        if (minutesForm) minutesForm.addEventListener('submit', function(e) { Meetings.saveMinutes(e, false); });

        var addMinuteBtn = document.getElementById('addMinuteItem');
        if (addMinuteBtn) addMinuteBtn.addEventListener('click', function() { Meetings.addMinuteItem(); });

        var photosInput = document.getElementById('meetingPhotosInput');
        if (photosInput) {
            photosInput.addEventListener('change', function(e) { Meetings.previewMeetingPhotos(e); });
        }

        var attendanceClose = document.getElementById('attendanceModalClose');
        if (attendanceClose) attendanceClose.addEventListener('click', function() { Meetings.closeAttendanceModal(); });

        var attendanceForm = document.getElementById('attendanceForm');
        if (attendanceForm) attendanceForm.addEventListener('submit', function(e) { Meetings.submitAttendance(e); });

        var signatureInput = document.getElementById('signatureInput');
        if (signatureInput) {
            signatureInput.addEventListener('change', function(e) {
                var preview = document.getElementById('signaturePreview');
                if (typeof App !== 'undefined') App.previewImage(e.target.files[0], preview);
            });
        }

        this.checkAttendanceURLParam();
    },

    checkAttendanceURLParam: function() {
        try {
            var urlParams = new URLSearchParams(window.location.search);
            var meetingId = urlParams.get('attendance');
            if (meetingId) {
                setTimeout(function() { Meetings.openAttendanceModal(meetingId); }, 1000);
            }
        } catch (err) {}
    },

    // ============================================================
    // AUTOMATIC MEETING TRIGGER (5 Minutes Before Start)
    // ============================================================
    checkForMeetingTriggers: function() {
        if (typeof supabaseAdmin === 'undefined') return;

        var now = new Date();
        var todayStr = now.toISOString().split('T')[0];

        supabaseAdmin
            .from('meetings')
            .select('*')
            .eq('status', 'scheduled')
            .eq('meeting_date', todayStr)
            .then(function(result) {
                var meetings = result.data || [];
                meetings.forEach(function(meeting) {
                    var meetingStart = new Date(meeting.meeting_date + 'T' + meeting.start_time);
                    var diffMins = (meetingStart - now) / (1000 * 60);

                    // Trigger precisely within 0-5 minutes before the meeting starts
                    if (diffMins > 0 && diffMins <= 5 && !meeting.attendance_form_url) {
                        Meetings.triggerAttendanceEmail(meeting);
                    }
                });
            }).catch(function(err) {
                console.error('Trigger check error:', err);
            });
    },

    triggerAttendanceEmail: function(meeting) {
        var attendanceUrl = window.location.origin + window.location.pathname + '?attendance=' + meeting.id;

        supabaseAdmin
            .from('meetings')
            .update({
                attendance_form_url: attendanceUrl,
                status: 'in_progress'
            })
            .eq('id', meeting.id)
            .then(function() {
                if (typeof Mail !== 'undefined' && Mail.sendMeetingAttendanceEmail) {
                    Mail.sendMeetingAttendanceEmail(meeting, attendanceUrl);
                }

                Meetings.loadMeetings();
                console.log('Auto attendance triggered for:', meeting.meeting_name);
            }).catch(function(err) {
                console.error('Auto trigger error:', err);
            });
    },

    // ============================================================
    // MANUAL ATTENDANCE TRIGGER
    // ============================================================
    manualTriggerAttendance: function(meetingId) {
        if (typeof App === 'undefined' || !App.confirm) return;

        App.confirm('Send the Attendance Form link to members now?', function() {
            supabaseAdmin.from('meetings').select('*').eq('id', meetingId).single().then(function(result) {
                var meeting = result.data;
                if (!meeting) { App.toast('Meeting not found', 'error'); return; }

                var attendanceUrl = window.location.origin + window.location.pathname + '?attendance=' + meeting.id;

                supabaseAdmin
                    .from('meetings')
                    .update({
                        attendance_form_url: attendanceUrl,
                        status: 'in_progress'
                    })
                    .eq('id', meetingId)
                    .then(function() {
                        if (typeof Mail !== 'undefined' && Mail.sendMeetingAttendanceEmail) {
                            Mail.sendMeetingAttendanceEmail(meeting, attendanceUrl);
                        }

                        App.toast('Attendance form link sent to members!', 'success');
                        Meetings.loadMeetings();
                    }).catch(function(err) {
                        App.toast('Failed: ' + err.message, 'error');
                    });
            });
        });
    },

    // ============================================================
    // LOAD MEETINGS TABLE
    // ============================================================
    loadMeetings: function() {
        var tbody = document.getElementById('meetingsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7"><div class="inline-loader">Loading meetings...</div></td></tr>';

        var filterType = document.getElementById('meetingFilterType');
        var filterStatus = document.getElementById('meetingFilterStatus');
        var typeVal = filterType ? filterType.value : '';
        var statusVal = filterStatus ? filterStatus.value : '';

        var query = supabaseAdmin
            .from('meetings')
            .select('*')
            .order('meeting_date', { ascending: false })
            .order('start_time', { ascending: false });

        if (typeVal) query = query.eq('meeting_type', typeVal);
        if (statusVal) query = query.eq('status', statusVal);

        query.then(function(result) {
            if (result.error) throw result.error;
            var data = result.data || [];

            if (!data.length) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="empty-table"><i data-feather="video"></i><p>No meetings found</p></div></td></tr>';
                if (typeof feather !== 'undefined') feather.replace();
                return;
            }

            tbody.innerHTML = data.map(function(m) { return Meetings.renderMeetingRow(m); }).join('');
            if (typeof feather !== 'undefined') feather.replace();
            if (typeof Auth !== 'undefined' && Auth.fixAdminIconSizes) setTimeout(function() { Auth.fixAdminIconSizes(); }, 100);

            data.forEach(function(m) { Meetings.loadAttendanceCount(m.id); });
        }).catch(function(err) {
            console.error('Load meetings error:', err);
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-table"><p>Error loading</p></div></td></tr>';
        });
    },

    renderMeetingRow: function(m) {
        var isPast = new Date(m.meeting_date + 'T' + (m.end_time || m.start_time)) < new Date();
        var hasMinutes = m.minutes_items && m.minutes_items.length > 0;
        var isDraft = m.status === 'minutes_draft';

        return '<tr>' +
            '<td><strong>' + this.esc(m.meeting_name) + '</strong>' +
            (m.venue ? '<br><small style="color:var(--text-muted);">' + this.esc(m.venue) + '</small>' : '') +
            (isDraft ? '<br><small style="color:var(--warning);font-weight:600;">Draft Minutes</small>' : '') +
            '</td>' +
            '<td><span class="status-badge ' + (m.meeting_type === 'board' ? 'status-approved' : 'status-scheduled') + '">' + (m.meeting_type === 'board' ? 'Board' : 'General Body') + '</span></td>' +
            '<td>' + this.formatDate(m.meeting_date) + '</td>' +
            '<td>' + this.formatTime(m.start_time) + (m.end_time ? ' - ' + this.formatTime(m.end_time) : '') + '</td>' +
            '<td><span class="status-badge status-' + (m.status || 'scheduled') + '">' + this.capitalize(m.status || 'scheduled') + '</span></td>' +
            '<td><span id="attendance-count-' + m.id + '" class="permission-tag">...</span></td>' +
            '<td><div class="table-actions">' +
                '<button class="table-action-btn view" onclick="Meetings.viewMeetingDetails(\'' + m.id + '\')" title="View"><i data-feather="eye"></i></button>' +
                '<button class="table-action-btn download" onclick="Meetings.downloadAgenda(\'' + m.id + '\')" title="Agenda"><i data-feather="file-text"></i></button>' +
                '<button class="table-action-btn download" onclick="Meetings.downloadAttendance(\'' + m.id + '\')" title="Attendance"><i data-feather="users"></i></button>' +
                (!m.attendance_form_url ? '<button class="table-action-btn approve" onclick="Meetings.manualTriggerAttendance(\'' + m.id + '\')" title="Send Attendance"><i data-feather="send"></i></button>' : '') +
                (isPast || isDraft ? '<button class="table-action-btn edit" onclick="Meetings.openMinutesForm(\'' + m.id + '\')" title="' + (isDraft ? 'Edit Draft' : 'Add Minutes') + '"><i data-feather="edit-3"></i></button>' : '') +
                (hasMinutes ? '<button class="table-action-btn download" onclick="Meetings.downloadMinutes(\'' + m.id + '\')" title="Download Minutes"><i data-feather="download"></i></button>' : '') +
                (hasMinutes && !m.is_minutes_approved ? '<button class="table-action-btn approve" onclick="Meetings.approveAndSendMinutes(\'' + m.id + '\')" title="Approve & Send"><i data-feather="check-circle"></i></button>' : '') +
                '<button class="table-action-btn edit" onclick="Meetings.editMeeting(\'' + m.id + '\')" title="Edit"><i data-feather="edit-2"></i></button>' +
                '<button class="table-action-btn delete" onclick="Meetings.deleteMeeting(\'' + m.id + '\')" title="Delete"><i data-feather="trash-2"></i></button>' +
            '</div></td></tr>';
    },

    loadAttendanceCount: function(meetingId) {
        supabaseAdmin.from('meeting_attendance').select('*', { count: 'exact', head: true }).eq('meeting_id', meetingId).then(function(result) {
            var el = document.getElementById('attendance-count-' + meetingId);
            if (el) {
                el.innerHTML = '<i data-feather="users" style="width:12px;height:12px;"></i> ' + (result.count || 0);
                if (typeof feather !== 'undefined') feather.replace();
            }
        });
    },

    // ============================================================
    // MEETING FORM
    // ============================================================
    openMeetingForm: function(meetingData) {
        var modal = document.getElementById('meetingFormModal');
        var form = document.getElementById('meetingForm');
        var title = document.getElementById('meetingFormTitle');
        var preview = document.getElementById('meetingPosterPreview');

        if (!modal || !form) return;
        form.reset();
        if (preview) preview.classList.add('hidden');
        this.editingId = null;

        if (meetingData) {
            this.editingId = meetingData.id;
            if (title) title.textContent = 'Edit Meeting';
            document.getElementById('meetingFormId').value = meetingData.id;

            Object.keys(meetingData).forEach(function(key) {
                var field = form.querySelector('[name="' + key + '"]');
                if (field && meetingData[key] !== null && key !== 'agenda_items' && key !== 'minutes_items') {
                    field.value = meetingData[key];
                }
            });

            if (meetingData.agenda_items && Array.isArray(meetingData.agenda_items)) {
                var agendaField = form.querySelector('[name="agenda_text"]');
                if (agendaField) agendaField.value = meetingData.agenda_items.join('\n');
            }

            if (meetingData.poster_url && preview) {
                preview.src = meetingData.poster_url;
                preview.classList.remove('hidden');
            }
        } else {
            if (title) title.textContent = 'Schedule Meeting';
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (typeof feather !== 'undefined') feather.replace();
    },

    closeMeetingForm: function() {
        var modal = document.getElementById('meetingFormModal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.editingId = null;
    },

    editMeeting: function(id) {
        supabaseAdmin.from('meetings').select('*').eq('id', id).single().then(function(result) {
            if (result.data) Meetings.openMeetingForm(result.data);
        }).catch(function() {
            Meetings.toast('Failed to load', 'error');
        });
    },

    saveMeeting: function(e) {
        e.preventDefault();
        var form = e.target;
        var submitBtn = form.querySelector('button[type="submit"]');
        var originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-feather="loader"></i>Saving...';
        if (typeof feather !== 'undefined') feather.replace();

        var formData = new FormData(form);
        var posterFile = formData.get('poster');

        var agendaText = formData.get('agenda_text') || '';
        var agendaItems = agendaText.split('\n').map(function(item) { return item.trim(); }).filter(function(item) { return item.length > 0; });

        var payload = {
            meeting_name: formData.get('meeting_name'),
            meeting_type: formData.get('meeting_type'),
            meeting_date: formData.get('meeting_date'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time') || null,
            venue: formData.get('venue'),
            minutes_prepared_by: formData.get('minutes_prepared_by'),
            sergeant_at_arms: formData.get('sergeant_at_arms'),
            group_number: formData.get('group_number') || '1',
            agenda_items: agendaItems,
            status: 'scheduled'
        };

        var self = this;
        var isNew = !this.editingId;
        var editId = this.editingId;

        var savePromise;

        if (posterFile && posterFile.size > 0) {
            savePromise = App.uploadToCloudinary(posterFile, 'meetings').then(function(upload) {
                payload.poster_url = upload.secure_url;
                payload.poster_public_id = upload.public_id;
                return payload;
            });
        } else {
            savePromise = Promise.resolve(payload);
        }

        savePromise.then(function(finalPayload) {
            if (editId) {
                return supabaseAdmin.from('meetings').update(finalPayload).eq('id', editId).select().single();
            } else {
                finalPayload.created_by = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.id : null;
                return supabaseAdmin.from('meetings').insert(finalPayload).select().single();
            }
        }).then(function(result) {
            if (result.error) throw result.error;
            var savedMeeting = result.data;

            self.toast(editId ? 'Meeting updated' : 'Meeting scheduled', 'success');
            self.closeMeetingForm();
            self.loadMeetings();

            // Send invitation email (NOT attendance) for new meetings
            if (isNew && typeof Mail !== 'undefined' && Mail.sendMeetingInvitation) {
                setTimeout(function() {
                    Mail.sendMeetingInvitation(savedMeeting);
                    self.toast('Invitation with poster sent to members', 'info');
                }, 500);
            }
        }).catch(function(err) {
            self.toast('Failed: ' + (err.message || ''), 'error');
        }).finally(function() {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
            if (typeof feather !== 'undefined') feather.replace();
        });
    },

    deleteMeeting: function(id) {
        if (typeof App === 'undefined' || !App.confirm) return;
        App.confirm('Delete this meeting?', function() {
            supabaseAdmin.from('meeting_photos').delete().eq('meeting_id', id).then(function() {
                return supabaseAdmin.from('meeting_attendance').delete().eq('meeting_id', id);
            }).then(function() {
                return supabaseAdmin.from('meetings').delete().eq('id', id);
            }).then(function() {
                Meetings.toast('Deleted', 'success');
                Meetings.loadMeetings();
            }).catch(function() {
                Meetings.toast('Failed', 'error');
            });
        });
    },

    // ============================================================
    // MINUTES FORM WITH DRAFT SAVE
    // ============================================================
    openMinutesForm: function(meetingId) {
        supabaseAdmin.from('meetings').select('*').eq('id', meetingId).single().then(function(result) {
            var meeting = result.data;
            if (!meeting) return;

            var modal = document.getElementById('minutesFormModal');
            var form = document.getElementById('minutesForm');
            if (!modal || !form) return;

            form.reset();
            Meetings.currentPhotos = [];
            Meetings.minutesItems = meeting.minutes_items || [];

            document.getElementById('minutesMeetingId').value = meetingId;
            document.getElementById('meetingPhotosPreview').innerHTML = '';

            var infoDiv = document.getElementById('minutesMeetingInfo');
            if (infoDiv) {
                infoDiv.innerHTML = '<h4>' + Meetings.esc(meeting.meeting_name) + '</h4>' +
                    '<div class="report-event-info-grid">' +
                    '<div class="report-event-info-item"><strong>Type</strong><span>' + (meeting.meeting_type === 'board' ? 'Board' : 'General Body') + '</span></div>' +
                    '<div class="report-event-info-item"><strong>Date</strong><span>' + Meetings.formatDate(meeting.meeting_date) + '</span></div>' +
                    '<div class="report-event-info-item"><strong>Time</strong><span>' + Meetings.formatTime(meeting.start_time) + (meeting.end_time ? ' - ' + Meetings.formatTime(meeting.end_time) : '') + '</span></div>' +
                    '<div class="report-event-info-item"><strong>Venue</strong><span>' + Meetings.esc(meeting.venue || 'N/A') + '</span></div>' +
                    '</div>';
            }

            // Add Draft Save button dynamically
            var existingDraftBtn = document.getElementById('saveDraftBtn');
            if (existingDraftBtn) existingDraftBtn.remove();

            var submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                var draftBtn = document.createElement('button');
                draftBtn.type = 'button';
                draftBtn.id = 'saveDraftBtn';
                draftBtn.className = 'btn btn-outline btn-block';
                draftBtn.style.marginBottom = '0.75rem';
                draftBtn.innerHTML = '<i data-feather="save"></i>Save as Draft';
                draftBtn.onclick = function() { Meetings.saveMinutes(null, true); };
                submitBtn.parentNode.insertBefore(draftBtn, submitBtn);

                // Rename submit button
                submitBtn.innerHTML = '<i data-feather="check-circle"></i>Save & Mark Complete';
            }

            Meetings.renderMinutesItems();

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (typeof feather !== 'undefined') feather.replace();
        });
    },

    closeMinutesForm: function() {
        var modal = document.getElementById('minutesFormModal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.currentPhotos = [];
        this.minutesItems = [];
    },

    addMinuteItem: function() {
        this.minutesItems.push({ time: '', heading: '', details: '' });
        this.renderMinutesItems();
    },

    removeMinuteItem: function(idx) {
        this.minutesItems.splice(idx, 1);
        this.renderMinutesItems();
    },

    renderMinutesItems: function() {
        var list = document.getElementById('minutesItemsList');
        if (!list) return;

        if (this.minutesItems.length === 0) {
            list.innerHTML = '<p style="color:var(--text-muted);padding:1rem;text-align:center;">No items yet. Click "Add Item".</p>';
            return;
        }

        list.innerHTML = this.minutesItems.map(function(item, idx) {
            return '<div class="minute-item">' +
                '<div class="minute-item-header">' +
                '<input type="time" value="' + (item.time || '') + '" onchange="Meetings.updateMinuteItem(' + idx + ', \'time\', this.value)">' +
                '<input type="text" value="' + Meetings.esc(item.heading || '') + '" onchange="Meetings.updateMinuteItem(' + idx + ', \'heading\', this.value)" placeholder="Heading">' +
                '<button type="button" class="minute-item-remove" onclick="Meetings.removeMinuteItem(' + idx + ')"><i data-feather="x"></i></button>' +
                '</div>' +
                '<textarea placeholder="Details..." onchange="Meetings.updateMinuteItem(' + idx + ', \'details\', this.value)">' + Meetings.esc(item.details || '') + '</textarea>' +
                '</div>';
        }).join('');

        if (typeof feather !== 'undefined') feather.replace();
    },

    updateMinuteItem: function(idx, field, value) {
        if (this.minutesItems[idx]) {
            this.minutesItems[idx][field] = value;
        }
    },

    previewMeetingPhotos: function(e) {
        var files = Array.from(e.target.files).slice(0, 10);
        var preview = document.getElementById('meetingPhotosPreview');
        if (!preview) return;

        this.currentPhotos = files;
        preview.innerHTML = '';

        files.forEach(function(file, idx) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                var div = document.createElement('div');
                div.className = 'photo-preview-item';
                div.innerHTML = '<img src="' + ev.target.result + '" alt="Preview"><button type="button" class="photo-preview-remove" onclick="Meetings.removePhotoPreview(' + idx + ')"><i data-feather="x"></i></button>';
                preview.appendChild(div);
                if (typeof feather !== 'undefined') feather.replace();
            };
            reader.readAsDataURL(file);
        });
    },

    removePhotoPreview: function(idx) {
        this.currentPhotos.splice(idx, 1);
        var preview = document.getElementById('meetingPhotosPreview');
        if (preview) {
            var items = preview.querySelectorAll('.photo-preview-item');
            if (items[idx]) items[idx].remove();
        }
    },

    /**
     * SAVE MINUTES - With Draft Support
     * @param {Event|null} e - Form submit event (null if draft save)
     * @param {boolean} isDraft - If true, saves as draft without completing
     */
    saveMinutes: function(e, isDraft) {
        if (e) e.preventDefault();

        var meetingId = document.getElementById('minutesMeetingId').value;
        if (!meetingId) return;

        var validItems = this.minutesItems.filter(function(item) {
            return item.time || item.heading || item.details;
        });

        var newStatus = isDraft ? 'minutes_draft' : 'completed';

        var updateData = {
            minutes_items: validItems,
            status: newStatus
        };

        if (!isDraft) {
            updateData.is_minutes_approved = false;
        }

        this.toast(isDraft ? 'Saving draft...' : 'Saving minutes...', 'info', 2000);

        var self = this;

        supabaseAdmin.from('meetings').update(updateData).eq('id', meetingId).then(function() {
            // Upload photos
            var uploadChain = Promise.resolve();
            self.currentPhotos.forEach(function(photo) {
                uploadChain = uploadChain.then(function() {
                    return App.uploadToCloudinary(photo, 'meetings').then(function(upload) {
                        return supabaseAdmin.from('meeting_photos').insert({
                            meeting_id: meetingId,
                            photo_url: upload.secure_url,
                            cloudinary_public_id: upload.public_id
                        });
                    }).catch(function(err) { console.error('Photo upload error:', err); });
                });
            });

            return uploadChain;
        }).then(function() {
            if (isDraft) {
                self.toast('Minutes saved as DRAFT. You can edit later.', 'success');
            } else {
                self.toast('Minutes saved and marked as complete!', 'success');
            }

            self.closeMinutesForm();
            self.loadMeetings();

            if (typeof App !== 'undefined') {
                App.logActivity(isDraft ? 'minutes_draft_saved' : 'minutes_completed', { meeting_id: meetingId });
            }
        }).catch(function(err) {
            self.toast('Failed: ' + err.message, 'error');
        });
    },

    // ============================================================
    // APPROVE & SEND MINUTES VIA EMAIL
    // ============================================================
    approveAndSendMinutes: function(meetingId) {
        if (typeof App === 'undefined' || !App.confirm) return;

        App.confirm('Approve minutes and send to members via email?', function() {
            supabaseAdmin.from('meetings').select('*').eq('id', meetingId).single().then(function(result) {
                var meeting = result.data;
                if (!meeting) { App.toast('Meeting not found', 'error'); return; }

                // Mark as approved
                return supabaseAdmin.from('meetings').update({
                    is_minutes_approved: true,
                    status: 'completed'
                }).eq('id', meetingId).then(function() {
                    // Get meeting photos
                    return supabaseAdmin.from('meeting_photos').select('*').eq('meeting_id', meetingId);
                }).then(function(photosResult) {
                    var photos = photosResult.data || [];

                    // Calculate duration
                    var duration = null;
                    if (meeting.start_time && meeting.end_time) {
                        var start = new Date('2000-01-01T' + meeting.start_time);
                        var end = new Date('2000-01-01T' + meeting.end_time);
                        duration = Math.round((end - start) / (1000 * 60));
                    }

                    meeting.duration_minutes = duration;

                    // Send email with photos
                    if (typeof Mail !== 'undefined' && Mail.sendMinutesToMembers) {
                        Mail.sendMinutesToMembers(meeting, '', photos);
                    }

                    App.toast('Minutes approved and sent to members!', 'success');
                    Meetings.loadMeetings();
                });
            }).catch(function(err) {
                App.toast('Failed: ' + err.message, 'error');
            });
        });
    },

    // ============================================================
    // VIEW MEETING DETAILS
    // ============================================================
    viewMeetingDetails: function(id) {
        supabaseAdmin.from('meetings').select('*').eq('id', id).single().then(function(result) {
            var meeting = result.data;
            if (!meeting) return;

            return supabaseAdmin.from('meeting_attendance').select('*').eq('meeting_id', id).order('in_time').then(function(attResult) {
                return supabaseAdmin.from('meeting_photos').select('*').eq('meeting_id', id).then(function(photoResult) {
                    Meetings.showMeetingDetailsModal(meeting, attResult.data || [], photoResult.data || []);
                });
            });
        }).catch(function() {
            Meetings.toast('Failed', 'error');
        });
    },

    showMeetingDetailsModal: function(meeting, attendance, photos) {
        var existing = document.getElementById('meetingDetailsModal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'meetingDetailsModal';
        modal.className = 'admin-modal';
        modal.innerHTML = '<div class="admin-modal-content glass-card large-modal">' +
            '<div class="admin-modal-header"><h3>' + this.esc(meeting.meeting_name) + '</h3><button class="modal-close" onclick="document.getElementById(\'meetingDetailsModal\').remove()"><i data-feather="x"></i></button></div>' +
            '<div style="padding:1.75rem;">' +
            '<div class="report-event-info"><div class="report-event-info-grid">' +
            '<div class="report-event-info-item"><strong>Type</strong><span>' + (meeting.meeting_type === 'board' ? 'Board' : 'General Body') + '</span></div>' +
            '<div class="report-event-info-item"><strong>Date</strong><span>' + this.formatDate(meeting.meeting_date) + '</span></div>' +
            '<div class="report-event-info-item"><strong>Time</strong><span>' + this.formatTime(meeting.start_time) + '</span></div>' +
            '<div class="report-event-info-item"><strong>Venue</strong><span>' + this.esc(meeting.venue || 'N/A') + '</span></div>' +
            '<div class="report-event-info-item"><strong>Status</strong><span>' + this.capitalize(meeting.status) + '</span></div>' +
            '</div></div>' +

            (meeting.agenda_items && meeting.agenda_items.length > 0 ? '<h4 style="margin-top:1.5rem;color:var(--primary);">Agenda</h4><ul style="padding-left:1.5rem;">' + meeting.agenda_items.map(function(item) { return '<li>' + Meetings.esc(item) + '</li>'; }).join('') + '</ul>' : '') +

            '<h4 style="margin-top:1.5rem;color:var(--primary);">Attendance (' + attendance.length + ')</h4>' +
            (attendance.length > 0 ?
                '<table class="admin-table"><thead><tr><th>S.No</th><th>Name</th><th>Designation</th><th>RI ID</th><th>In Time</th></tr></thead><tbody>' +
                attendance.map(function(a, idx) { return '<tr><td>' + (idx + 1) + '</td><td>' + Meetings.esc(a.member_name) + '</td><td>' + Meetings.esc(a.designation || '-') + '</td><td>' + Meetings.esc(a.ri_id || '-') + '</td><td>' + Meetings.formatTime(a.in_time) + '</td></tr>'; }).join('') +
                '</tbody></table>'
                : '<p style="color:var(--text-muted);padding:1rem;">No attendance</p>') +

            '<div style="display:flex;gap:0.75rem;margin-top:1.5rem;flex-wrap:wrap;">' +
            '<button class="btn btn-outline" onclick="Meetings.downloadAgenda(\'' + meeting.id + '\')"><i data-feather="file-text"></i>Agenda</button>' +
            '<button class="btn btn-outline" onclick="Meetings.downloadAttendance(\'' + meeting.id + '\')"><i data-feather="users"></i>Attendance</button>' +
            (meeting.minutes_items && meeting.minutes_items.length > 0 ? '<button class="btn btn-primary" onclick="Meetings.downloadMinutes(\'' + meeting.id + '\')"><i data-feather="download"></i>Minutes</button>' : '') +
            '</div></div></div>';

        document.body.appendChild(modal);
        if (typeof feather !== 'undefined') feather.replace();
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
    },

    // ============================================================
    // DOCUMENT DOWNLOADS
    // ============================================================
    downloadAgenda: function(meetingId) {
        var self = this;
        supabaseAdmin.from('meetings').select('*').eq('id', meetingId).single().then(function(result) {
            var meeting = result.data;
            self.getSettings().then(function(settings) {
                self.callEdgeFunction({ type: 'meeting_agenda', meeting: meeting, settings: settings }).then(function(blob) {
                    self.downloadBlob(blob, 'Agenda_' + self.sanitizeFilename(meeting.meeting_name) + '.docx');
                    self.toast('Agenda downloaded', 'success');
                });
            });
        });
    },

    downloadAttendance: function(meetingId) {
        var self = this;
        supabaseAdmin.from('meetings').select('*').eq('id', meetingId).single().then(function(result) {
            var meeting = result.data;
            supabaseAdmin.from('meeting_attendance').select('*').eq('meeting_id', meetingId).order('in_time').then(function(attResult) {
                self.getSettings().then(function(settings) {
                    self.callEdgeFunction({ type: 'meeting_attendance', meeting: meeting, attendance: attResult.data || [], settings: settings }).then(function(blob) {
                        self.downloadBlob(blob, 'Attendance_' + self.sanitizeFilename(meeting.meeting_name) + '.docx');
                        self.toast('Attendance downloaded', 'success');
                    });
                });
            });
        });
    },

    downloadMinutes: function(meetingId) {
        var self = this;
        supabaseAdmin.from('meetings').select('*').eq('id', meetingId).single().then(function(result) {
            var meeting = result.data;
            supabaseAdmin.from('meeting_attendance').select('*').eq('meeting_id', meetingId).order('in_time').then(function(attResult) {
                supabaseAdmin.from('meeting_photos').select('*').eq('meeting_id', meetingId).then(function(photoResult) {
                    self.getMonthlyReportLeadership().then(function(leadership) {
                        self.getSettings().then(function(settings) {
                            var duration = null;
                            if (meeting.start_time && meeting.end_time) {
                                var start = new Date('2000-01-01T' + meeting.start_time);
                                var end = new Date('2000-01-01T' + meeting.end_time);
                                duration = Math.round((end - start) / (1000 * 60));
                            }
                            self.callEdgeFunction({
                                type: 'meeting_minutes',
                                meeting: Object.assign({}, meeting, { duration_minutes: duration }),
                                attendance: attResult.data || [],
                                photos: photoResult.data || [],
                                leadership: leadership,
                                settings: settings
                            }).then(function(blob) {
                                self.downloadBlob(blob, 'Minutes_' + self.sanitizeFilename(meeting.meeting_name) + '.docx');
                                self.toast('Minutes downloaded', 'success');
                            });
                        });
                    });
                });
            });
        });
    },

    // ============================================================
    // ATTENDANCE MODAL (Public)
    // ============================================================
    openAttendanceModal: function(meetingId) {
        supabaseClient.from('meetings').select('meeting_name, meeting_date, start_time, venue, meeting_type').eq('id', meetingId).single().then(function(result) {
            var meeting = result.data;
            if (!meeting) { Meetings.toast('Not found', 'error'); return; }

            var modal = document.getElementById('attendanceModal');
            var form = document.getElementById('attendanceForm');
            var nameEl = document.getElementById('attendanceMeetingName');
            var idInput = document.getElementById('attendanceMeetingId');
            var timeInput = document.querySelector('#attendanceForm [name="in_time"]');

            if (!modal || !form) return;
            form.reset();
            if (nameEl) nameEl.innerHTML = '<strong>' + Meetings.esc(meeting.meeting_name) + '</strong><br>' + Meetings.formatDate(meeting.meeting_date) + ' at ' + Meetings.formatTime(meeting.start_time) + (meeting.venue ? '<br>' + Meetings.esc(meeting.venue) : '');
            if (idInput) idInput.value = meetingId;
            if (timeInput) {
                var now = new Date();
                timeInput.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            }
            var preview = document.getElementById('signaturePreview');
            if (preview) preview.classList.add('hidden');

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    },

    closeAttendanceModal: function() {
        var modal = document.getElementById('attendanceModal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        try {
            var url = new URL(window.location.href);
            url.searchParams.delete('attendance');
            window.history.replaceState({}, '', url);
        } catch (err) {}
    },

    submitAttendance: function(e) {
        e.preventDefault();
        var form = e.target;
        var submitBtn = form.querySelector('button[type="submit"]');
        var originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-feather="loader"></i>Submitting...';
        if (typeof feather !== 'undefined') feather.replace();

        var formData = new FormData(form);
        var signatureFile = formData.get('signature');

        var signaturePromise;
        if (signatureFile && signatureFile.size > 0) {
            signaturePromise = App.uploadToCloudinary(signatureFile, 'signatures');
        } else {
            signaturePromise = Promise.resolve(null);
        }

        signaturePromise.then(function(upload) {
            return supabaseAdmin.from('meeting_attendance').insert({
                meeting_id: formData.get('meeting_id'),
                member_name: formData.get('member_name'),
                designation: formData.get('designation'),
                ri_id: formData.get('ri_id'),
                in_time: formData.get('in_time'),
                signature_url: upload ? upload.secure_url : null,
                signature_public_id: upload ? upload.public_id : null
            });
        }).then(function(result) {
            if (result.error) throw result.error;
            Meetings.toast('Attendance submitted!', 'success');
            Meetings.closeAttendanceModal();
        }).catch(function(err) {
            Meetings.toast('Failed: ' + err.message, 'error');
        }).finally(function() {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
            if (typeof feather !== 'undefined') feather.replace();
        });
    },

    // ============================================================
    // EDGE FUNCTION & HELPERS
    // ============================================================
    callEdgeFunction: function(payload) {
        return fetch(this.edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(payload)
        }).then(function(response) {
            if (!response.ok) throw new Error('Server error');
            var contentType = response.headers.get('content-type') || '';
            if (contentType.includes('openxmlformats') || contentType.includes('octet-stream') || contentType.includes('msword')) {
                return response.blob();
            }
            return response.blob();
        }).catch(function() {
            return Meetings.generateFallbackDoc(payload);
        });
    },

    generateFallbackDoc: function(payload) {
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title></head><body>' +
            '<h1 style="text-align:center;">' + Meetings.esc((payload.meeting || {}).meeting_name || 'Meeting') + '</h1>' +
            '<p>Document type: ' + Meetings.esc(payload.type) + '</p>' +
            '<p>Generated: ' + new Date().toLocaleString() + '</p>' +
            '</body></html>';
        return new Blob([html], { type: 'application/msword' });
    },

    downloadBlob: function(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    },

    getSettings: function() {
        if (typeof Reports !== 'undefined' && Reports.getSettings) return Reports.getSettings();
        return Promise.resolve({
            club_name: 'Rotaract Club of Coimbatore Unity',
            parent_club: 'Family of Rotary Club of Coimbatore East',
            club_id: '91594',
            district: 'Rotary International District 3206',
            report_logo_strip: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png',
            report_logo_strip_height: 0.43,
            report_logo_strip_width: 4.63
        });
    },

    getMonthlyReportLeadership: function() {
        if (typeof Reports !== 'undefined' && Reports.getMonthlyReportLeadership) return Reports.getMonthlyReportLeadership();
        return Promise.resolve({});
    },

    esc: function(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    },

    formatTime: function(timeStr) {
        if (!timeStr) return '';
        try {
            var parts = timeStr.split(':');
            var hour = parseInt(parts[0]);
            if (isNaN(hour)) return timeStr;
            var ampm = hour >= 12 ? 'PM' : 'AM';
            var displayHour = hour % 12 || 12;
            return displayHour + ':' + parts[1] + ' ' + ampm;
        } catch(e) { return timeStr; }
    },

    formatDate: function(dateStr) {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch(e) { return dateStr; }
    },

    capitalize: function(str) {
        if (!str) return '';
        return String(str).replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    },

    sanitizeFilename: function(name) {
        if (!name) return 'Meeting';
        return String(name).replace(/[^a-z0-9]/gi, '_').substring(0, 80);
    },

    toast: function(msg, type, duration) {
        if (typeof App !== 'undefined' && App.toast) App.toast(msg, type || 'info', duration || 3000);
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() { if (typeof Meetings !== 'undefined') Meetings.init(); }, 500);
    setInterval(function() { if (typeof Meetings !== 'undefined') Meetings.checkForMeetingTriggers(); }, 60000);
});

window.Meetings = Meetings;