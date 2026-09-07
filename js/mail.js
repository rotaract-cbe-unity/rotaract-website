/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - MAIL MODULE
   Strict Payload Guard | Anti-413 Protection | Lightweight
   ============================================================ */

var Mail = {
    config: {
        serviceId: 'service_9bgbmrv',
        templates: {
            general: 'template_s46eqig',
            birthday: 'template_birthday',
            blood: 'template_s46eqig'
        },
        publicKey: '5DbN9WImU8rLoat8j',
        privateKey: 'j1ly0M3EOARoh3ELKvOMg',
        membersEmail: 'rotaractunity@googlegroups.com',
        boardEmail: 'eternals26-27@googlegroups.com',
        clubEmail: 'rc.cbeunity@gmail.com',
        clubName: 'Rotaract Club of Coimbatore Unity',
        parentClub: 'Family of Rotary Club of Coimbatore East',
        clubId: '91594',
        district: 'Rotary International District 3206'
    },

    initialized: false,
    emailJsReady: false,
    sending: false,

    init: function() {
        if (this.initialized) return;
        this.initialized = true;
        this.ensureTemplatesExist();
        var self = this;
        this.loadConfig().then(function() {
            self.ensureTemplatesExist();
            self.initEmailJS();
            console.log('Mail module initialized');
            self.processQueue();
        }).catch(function() {
            self.ensureTemplatesExist();
            self.initEmailJS();
            self.processQueue();
        });
    },

    ensureTemplatesExist: function() {
        if (!this.config) this.config = {};
        if (!this.config.templates) this.config.templates = { general: 'template_s46eqig', birthday: 'template_birthday', blood: 'template_s46eqig' };
        if (!this.config.templates.general) this.config.templates.general = 'template_s46eqig';
        if (!this.config.templates.birthday) this.config.templates.birthday = 'template_birthday';
        if (!this.config.templates.blood) this.config.templates.blood = this.config.templates.general;
    },

    loadConfig: function() {
        var self = this;
        return new Promise(function(resolve) {
            self.ensureTemplatesExist();
            if (typeof supabaseAdmin === 'undefined') { resolve(); return; }

            supabaseAdmin.from('email_config').select('*').then(function(result) {
                if (result.data) {
                    result.data.forEach(function(c) {
                        if (c.config_key === 'members_group_email') self.config.membersEmail = c.config_value;
                        if (c.config_key === 'board_group_email') self.config.boardEmail = c.config_value;
                        if (c.config_key === 'club_email') self.config.clubEmail = c.config_value;
                        if (c.config_key === 'emailjs_service_id') self.config.serviceId = c.config_value;
                        if (c.config_key === 'emailjs_template_id') self.config.templates.general = c.config_value;
                        if (c.config_key === 'emailjs_public_key') self.config.publicKey = c.config_value;
                    });
                }
                if (typeof App !== 'undefined' && App.settings) {
                    var s = App.settings;
                    if (s.group_mail) self.config.membersEmail = s.group_mail;
                    if (s.board_mail) self.config.boardEmail = s.board_mail;
                    if (s.club_email) self.config.clubEmail = s.club_email;
                    if (s.club_name) self.config.clubName = s.club_name;
                }
                self.ensureTemplatesExist();
                resolve();
            }).catch(function() { self.ensureTemplatesExist(); resolve(); });
        });
    },

    initEmailJS: function() {
        try {
            if (typeof emailjs !== 'undefined' && this.config.publicKey) {
                emailjs.init({ publicKey: this.config.publicKey });
                this.emailJsReady = true;
            }
        } catch (err) {}
    },

    getTemplateId: function(type) {
        this.ensureTemplatesExist();
        if (type === 'birthday_wish') return this.config.templates.birthday;
        return this.config.templates.general;
    },

    /**
     * Rejects Base64 strings strictly to prevent EmailJS 413 Payload Too Large
     */
    sanitizeUrl: function(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.indexOf('data:') === 0) return '';
        if (url.length > 2048) return '';
        return url;
    },

    stripBase64FromText: function(text) {
        if (!text || typeof text !== 'string') return '';
        return text.replace(/data:image\/[^;]+;base64,[^\s"']+/g, '[Image Attached]');
    },

    // ============================================================
    // CORE SEND FUNCTIONS
    // ============================================================
    queueMail: function(payload) {
        if (typeof supabaseAdmin === 'undefined') return Promise.resolve(null);
        var cleanBody = this.stripBase64FromText(payload.body || '');
        var cleanAttachments = (payload.attachments || []).map(function(a) { return Mail.sanitizeUrl(a); }).filter(function(a) { return a; });

        return supabaseAdmin.from('mail_queue').insert({
            mail_type: payload.type || 'custom',
            recipients: payload.to || '',
            subject: payload.subject || '',
            body: cleanBody.substring(0, 5000),
            attachments: cleanAttachments,
            status: 'pending',
            scheduled_at: new Date().toISOString()
        }).select().single().then(function(r) { return r.data || null; }).catch(function() { return null; });
    },

    updateMailStatus: function(mailId, status, errorMsg) {
        if (!mailId || typeof supabaseAdmin === 'undefined') return Promise.resolve();
        var update = { status: status };
        if (status === 'sent') update.sent_at = new Date().toISOString();
        if (errorMsg) update.error = String(errorMsg).substring(0, 500);
        return supabaseAdmin.from('mail_queue').update(update).eq('id', mailId).then(function() {}).catch(function() {});
    },

    sendViaEmailJS: function(mailType, params) {
        var self = this;
        return new Promise(function(resolve) {
            if (typeof emailjs === 'undefined' || !self.emailJsReady) {
                self.initEmailJS();
                if (!self.emailJsReady) { resolve({ success: false, error: 'EmailJS not ready' }); return; }
            }

            var templateId = self.getTemplateId(mailType);
            var cleanPoster = self.sanitizeUrl(params.poster_url);
            var cleanAttachment = self.sanitizeUrl(params.attachment_url) || cleanPoster;

            // Poster URL text is NOT appended to body - only passed through poster_url template variable
            var rawMsg = self.stripBase64FromText(params.message || params.body || '');

            var templateParams = {
                to_email: params.to_email || self.config.membersEmail,
                to_name: params.to_name || 'Members',
                from_name: self.config.clubName,
                reply_to: self.config.clubEmail,
                subject: params.subject || 'Notification',
                message: rawMsg.substring(0, 4000),
                body: rawMsg.substring(0, 4000),
                event_name: params.event_name || '',
                poster_url: cleanPoster,
                attachment_url: cleanAttachment,
                club_name: self.config.clubName,
                club_email: self.config.clubEmail,
                district: self.config.district
            };

            emailjs.send(self.config.serviceId, templateId, templateParams).then(function(result) {
                resolve({ success: result.status === 200 });
            }).catch(function(err) {
                console.error('EmailJS send failure details:', err);
                resolve({ success: false, error: err.text || err.message || String(err) });
            });
        });
    },

    queueAndSend: function(mailType, queuePayload, emailParams) {
        var self = this;
        return this.queueMail(queuePayload).then(function(queued) {
            var mailId = queued ? queued.id : null;
            return self.sendViaEmailJS(mailType, emailParams).then(function(result) {
                if (mailId) self.updateMailStatus(mailId, result.success ? 'sent' : 'failed', result.error);
                return result;
            });
        }).catch(function() {
            return self.sendViaEmailJS(mailType, emailParams);
        });
    },

    async processQueue() {
        if (this.sending || typeof supabaseAdmin === 'undefined') return;
        this.sending = true;
        try {
            var result = await supabaseAdmin.from('mail_queue').select('*').eq('status', 'pending').order('created_at').limit(3);
            var pending = result.data || [];
            for (var i = 0; i < pending.length; i++) {
                var mail = pending[i];

                // Guard against corrupt queue records with huge base64 bodies
                if (mail.body && mail.body.length > 8000) {
                    await this.updateMailStatus(mail.id, 'failed', 'Body exceeded 8KB size limit');
                    continue;
                }

                var sendResult = await this.sendViaEmailJS(mail.mail_type, {
                    to_email: mail.recipients, 
                    subject: mail.subject, 
                    message: mail.body, 
                    body: mail.body,
                    poster_url: (mail.attachments && mail.attachments[0]) || ''
                });
                await this.updateMailStatus(mail.id, sendResult.success ? 'sent' : 'failed', sendResult.error);
                await this.delay(1500);
            }
        } catch (err) {}
        finally { this.sending = false; }
        setTimeout(function() { Mail.processQueue(); }, 120000);
    },

    // ============================================================
    // EVENT NOTIFICATION - Poster via template variable only
    // ============================================================
    sendEventNotification: function(event) {
        if (!event) return Promise.resolve({ success: false });
        var cleanPoster = this.sanitizeUrl(event.poster_url);

        var subject = 'New Project: ' + event.event_name;
        var body = 'We are excited to announce a new project!\n\n' +
            'PROJECT DETAILS\n━━━━━━━━━━━━━━━━━━━━━━━\n' +
            'Project: ' + event.event_name + '\n' +
            'Date: ' + (event.event_date || 'TBA') + '\n' +
            'Time: ' + this.formatTime(event.event_time) + '\n' +
            'Venue: ' + (event.venue || 'TBA') + '\n' +
            'Chair: ' + (event.event_chair || 'TBA') + '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            (event.description || '') +
            '\n\nBest regards,\n' + this.config.clubName;

        return this.queueAndSend('event_notification',
            { type: 'event_notification', to: this.config.membersEmail, subject: subject, body: body, attachments: cleanPoster ? [cleanPoster] : [] },
            { to_email: this.config.membersEmail, to_name: 'Members', subject: subject, message: body, body: body, event_name: event.event_name, poster_url: cleanPoster }
        );
    },

    // ============================================================
    // PROJECT REPORT - With Action Photographs List
    // ============================================================
    sendProjectReportNotification: function(event, photos) {
        if (!event) return Promise.resolve({ success: false });

        var cleanPoster = this.sanitizeUrl(event.poster_url);
        var firstPhotoUrl = cleanPoster;
        if (!firstPhotoUrl && photos && photos.length > 0) {
            var url = typeof photos[0] === 'string' ? photos[0] : (photos[0].photo_url || '');
            firstPhotoUrl = this.sanitizeUrl(url);
        }

        // Build action photographs section
        var photoLines = '';
        if (photos && photos.length > 0) {
            photoLines = '\n\nACTION PHOTOGRAPHS\n━━━━━━━━━━━━━━━━━━━━━━━\n';
            photos.forEach(function(p, i) {
                var url = typeof p === 'string' ? p : (p.photo_url || '');
                var clean = Mail.sanitizeUrl(url);
                if (clean) photoLines += 'Photo ' + (i + 1) + ': ' + clean + '\n';
            });
            photoLines += '━━━━━━━━━━━━━━━━━━━━━━━';
        }

        var subject = 'Project Report: ' + event.event_name;
        var body = 'The project report has been submitted!\n\n' +
            'PROJECT DETAILS\n━━━━━━━━━━━━━━━━━━━━━━━\n' +
            'Project: ' + event.event_name + '\n' +
            'Date: ' + (event.event_date || 'TBA') + '\n' +
            'Venue: ' + (event.venue || 'TBA') + '\n' +
            'Avenue: ' + this.avenueLabel(event.avenue) + '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            'REPORT\n' + (event.report_text || 'No report.') +
            photoLines +
            '\n\nBest regards,\n' + this.config.clubName;

        return this.queueAndSend('project_report',
            { type: 'project_report', to: this.config.membersEmail, subject: subject, body: body, attachments: [] },
            { to_email: this.config.membersEmail, to_name: 'Members', subject: subject, message: body, body: body, event_name: event.event_name, poster_url: firstPhotoUrl }
        );
    },

    // ============================================================
    // MEETING INVITATION - Poster via template variable only
    // ============================================================
    sendMeetingInvitation: function(meeting) {
        if (!meeting) return Promise.resolve({ success: false });
        var isBoard = meeting.meeting_type === 'board';
        var to = isBoard ? this.config.boardEmail : this.config.membersEmail;

        var agendaText = (meeting.agenda_items && meeting.agenda_items.length > 0)
            ? meeting.agenda_items.map(function(item, i) { return (i + 1) + '. ' + item; }).join('\n')
            : 'To be announced';

        var cleanPoster = this.sanitizeUrl(meeting.poster_url);

        var subject = 'Meeting Invitation: ' + meeting.meeting_name;
        var body = 'You are cordially invited:\n\n' +
            'MEETING DETAILS\n━━━━━━━━━━━━━━━━━━━━━━━\n' +
            'Meeting: ' + meeting.meeting_name + '\n' +
            'Type: ' + (isBoard ? 'Board Members Meeting' : 'General Body Meeting') + '\n' +
            'Date: ' + (meeting.meeting_date || 'TBA') + '\n' +
            'Time: ' + this.formatTime(meeting.start_time) + (meeting.end_time ? ' - ' + this.formatTime(meeting.end_time) : '') + '\n' +
            'Venue: ' + (meeting.venue || 'TBA') + '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            'AGENDA\n' + agendaText +
            '\n\nPlease attend on time.\n\nBest regards,\n' + this.config.clubName;

        return this.queueAndSend('meeting_invitation',
            { type: 'meeting_invitation', to: to, subject: subject, body: body, attachments: cleanPoster ? [cleanPoster] : [] },
            { to_email: to, to_name: isBoard ? 'Board Members' : 'Members', subject: subject, message: body, body: body, event_name: meeting.meeting_name, poster_url: cleanPoster }
        );
    },

    // ============================================================
    // MEETING ATTENDANCE
    // ============================================================
    sendMeetingAttendanceEmail: function(meeting, attendanceUrl) {
        if (!meeting || !attendanceUrl) return Promise.resolve({ success: false });
        var isBoard = meeting.meeting_type === 'board';
        var to = isBoard ? this.config.boardEmail : this.config.membersEmail;
        var cleanPoster = this.sanitizeUrl(meeting.poster_url);

        var subject = 'Attendance Required: ' + meeting.meeting_name;
        var body = 'Meeting has started. Fill attendance NOW!\n\n' +
            'Meeting: ' + meeting.meeting_name + '\n' +
            'Date: ' + (meeting.meeting_date || '') + '\n' +
            'Time: ' + this.formatTime(meeting.start_time) + '\n\n' +
            'CLICK HERE TO FILL ATTENDANCE:\n' + attendanceUrl +
            '\n\nBest regards,\n' + this.config.clubName;

        return this.queueAndSend('attendance_form',
            { type: 'attendance_form', to: to, subject: subject, body: body, attachments: [] },
            { to_email: to, to_name: isBoard ? 'Board Members' : 'Members', subject: subject, message: body, body: body, event_name: meeting.meeting_name, poster_url: cleanPoster, attachment_url: attendanceUrl }
        );
    },

    // ============================================================
    // MEETING MINUTES - With Meeting Photographs & Download URL
    // ============================================================
    sendMinutesToMembers: function(meeting, minutesDocUrl, meetingPhotos) {
        if (!meeting) return Promise.resolve({ success: false });
        var isBoard = meeting.meeting_type === 'board';
        var to = isBoard ? this.config.boardEmail : this.config.membersEmail;

        var minutesContent = '';
        if (meeting.minutes_items && meeting.minutes_items.length > 0) {
            minutesContent = '\n\nMEETING MINUTES\n━━━━━━━━━━━━━━━━━━━━━━━\n';
            meeting.minutes_items.forEach(function(item) {
                if (item.time) minutesContent += '\n[' + item.time + '] ';
                if (item.heading) minutesContent += item.heading + '\n';
                if (item.details) minutesContent += item.details + '\n';
                minutesContent += '---\n';
            });
            minutesContent += '━━━━━━━━━━━━━━━━━━━━━━━\n';
        }

        // Build meeting photographs section
        var photoLines = '';
        if (meetingPhotos && meetingPhotos.length > 0) {
            photoLines = '\n\nMEETING PHOTOGRAPHS\n━━━━━━━━━━━━━━━━━━━━━━━\n';
            meetingPhotos.forEach(function(p, i) {
                var url = typeof p === 'string' ? p : (p.photo_url || '');
                var clean = Mail.sanitizeUrl(url);
                if (clean) photoLines += 'Photo ' + (i + 1) + ': ' + clean + '\n';
            });
            photoLines += '━━━━━━━━━━━━━━━━━━━━━━━';
        }

        // Build download document link
        var cleanDocUrl = this.sanitizeUrl(minutesDocUrl);
        var downloadLine = cleanDocUrl ? '\n\nDownload Full Document: ' + cleanDocUrl : '';

        var subject = 'Meeting Minutes: ' + meeting.meeting_name;
        var body = 'Dear ' + (isBoard ? 'Board Members' : 'Members') + ',\n\n' +
            'The minutes of the following meeting are now available:\n\n' +
            'MEETING DETAILS\n━━━━━━━━━━━━━━━━━━━━━━━\n' +
            'Meeting: ' + meeting.meeting_name + '\n' +
            'Date: ' + (meeting.meeting_date || '') + '\n' +
            'Time: ' + this.formatTime(meeting.start_time) + (meeting.end_time ? ' - ' + this.formatTime(meeting.end_time) : '') + '\n' +
            'Venue: ' + (meeting.venue || 'N/A') + '\n' +
            'Duration: ' + (meeting.duration_minutes || 'N/A') + ' minutes\n' +
            'Prepared By: ' + (meeting.minutes_prepared_by || 'Secretary') + '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━' +
            minutesContent +
            downloadLine +
            photoLines +
            '\n\nKindly review the minutes. For clarifications, contact the Secretary.\n\n' +
            'Best regards,\n' + this.config.clubName + '\n' + this.config.parentClub;

        var firstPhotoUrl = '';
        if (meetingPhotos && meetingPhotos.length > 0) {
            var url = typeof meetingPhotos[0] === 'string' ? meetingPhotos[0] : (meetingPhotos[0].photo_url || '');
            firstPhotoUrl = this.sanitizeUrl(url);
        }

        return this.queueAndSend('meeting_minutes',
            { type: 'meeting_minutes', to: to, subject: subject, body: body, attachments: cleanDocUrl ? [cleanDocUrl] : [] },
            { to_email: to, to_name: isBoard ? 'Board Members' : 'Members', subject: subject, message: body, body: body, event_name: meeting.meeting_name, poster_url: firstPhotoUrl, attachment_url: cleanDocUrl || firstPhotoUrl }
        );
    },

    // ============================================================
    // OTHER EMAIL FUNCTIONS
    // ============================================================
    sendBirthdayWish: function(member) {
        if (!member || !member.email) return Promise.resolve({ success: false });
        var subject = 'Happy Birthday ' + member.full_name + '!';
        var body = 'Dear ' + member.full_name + ',\n\nOn behalf of the entire ' + this.config.clubName + ' family, we wish you a very Happy Birthday!\n\nMay this special day bring you joy and success.\n\nWith warmest wishes,\n' + this.config.clubName;
        return this.queueAndSend('birthday_wish',
            { type: 'birthday_wish', to: member.email, subject: subject, body: body, attachments: [] },
            { to_email: member.email, to_name: member.full_name, subject: subject, message: body, body: body, event_name: 'Birthday' }
        );
    },

    sendBloodRequestNotification: function(request) {
        if (!request) return Promise.resolve({ success: false });
        var subject = 'URGENT: Blood Required - ' + request.blood_group;
        var body = 'EMERGENCY BLOOD REQUEST\n\n━━━━━━━━━━━━━━━━━━━━━━━\nPatient: ' + request.patient_name + '\nBlood Group: ' + request.blood_group + '\nUnits: ' + request.units_needed + '\nHospital: ' + request.hospital + '\n' + (request.location ? 'Location: ' + request.location + '\n' : '') + '━━━━━━━━━━━━━━━━━━━━━━━\n\nContact: ' + request.contact_name + ' - ' + request.contact_phone + '\n\nPlease help if you can!\n\n- ' + this.config.clubName;
        return this.queueAndSend('blood_request',
            { type: 'blood_request', to: this.config.membersEmail, subject: subject, body: body, attachments: [] },
            { to_email: this.config.membersEmail, to_name: 'Members', subject: subject, message: body, body: body, event_name: 'Blood ' + request.blood_group }
        );
    },

    sendMembershipNotification: function(applicant) {
        if (!applicant) return Promise.resolve({ success: false });
        var subject = 'New Application: ' + applicant.name;
        var body = 'New membership application received!\n\nName: ' + applicant.name + '\nEmail: ' + applicant.email + '\n\nPlease review in admin panel.\n\n' + this.config.clubName;
        return this.queueAndSend('membership_notification',
            { type: 'membership_notification', to: this.config.clubEmail, subject: subject, body: body, attachments: [] },
            { to_email: this.config.clubEmail, to_name: 'Admin', subject: subject, message: body, body: body, event_name: 'Application' }
        );
    },

    sendMembershipApprovedNotification: function(applicant) {
        if (!applicant || !applicant.email) return Promise.resolve({ success: false });
        var subject = 'Welcome to ' + this.config.clubName + '!';
        var body = 'Dear ' + applicant.name + ',\n\nYour membership is APPROVED!\n\nWelcome!\n\n' + this.config.clubName;
        return this.queueAndSend('membership_approved',
            { type: 'membership_approved', to: applicant.email, subject: subject, body: body, attachments: [] },
            { to_email: applicant.email, to_name: applicant.name, subject: subject, message: body, body: body, event_name: 'Welcome' }
        );
    },

    sendCustomMail: function(options) {
        var to = (options.recipients === 'board') ? this.config.boardEmail : this.config.membersEmail;
        var clean = (options.attachments || []).map(function(a) { return Mail.sanitizeUrl(a); }).filter(function(a) { return a; });
        return this.queueAndSend('custom',
            { type: 'custom', to: to, subject: options.subject || '', body: options.body || '', attachments: clean },
            { to_email: to, to_name: options.recipients === 'board' ? 'Board Members' : 'Members', subject: options.subject || '', message: options.body || '', body: options.body || '', poster_url: clean[0] || '' }
        );
    },

    // ============================================================
    // MONTHLY REPORT - With Link
    // ============================================================
    sendMonthlyReportEmail: function(monthDisplay, filename, reportUrl) {
        var cleanUrl = this.sanitizeUrl(reportUrl);
        var linkLine = cleanUrl ? '\n\nLink: ' + cleanUrl : '';
        var body = 'Monthly report for ' + monthDisplay + ' is available.' + linkLine + '\n\n' + this.config.clubName;
        return this.queueAndSend('monthly_report',
            { type: 'monthly_report', to: this.config.membersEmail, subject: 'Monthly Report - ' + monthDisplay, body: body, attachments: cleanUrl ? [cleanUrl] : [] },
            { to_email: this.config.membersEmail, to_name: 'Members', subject: 'Monthly Report - ' + monthDisplay, message: body, body: body, attachment_url: cleanUrl }
        );
    },

    // ============================================================
    // TREASURY STATEMENT - With Link
    // ============================================================
    sendTreasuryStatement: function(monthDisplay, url) {
        var cleanUrl = this.sanitizeUrl(url);
        var linkLine = cleanUrl ? '\n\nLink: ' + cleanUrl : '';
        var body = 'Treasury statement for ' + monthDisplay + ' is available.' + linkLine + '\n\n' + this.config.clubName;
        return this.queueAndSend('treasury_statement',
            { type: 'treasury_statement', to: this.config.boardEmail, subject: 'Treasury - ' + monthDisplay, body: body, attachments: cleanUrl ? [cleanUrl] : [] },
            { to_email: this.config.boardEmail, to_name: 'Board Members', subject: 'Treasury - ' + monthDisplay, message: body, body: body, attachment_url: cleanUrl }
        );
    },

    // ============================================================
    // BULLETIN NOTIFICATION - With Read URL
    // ============================================================
    sendBulletinNotification: function(bulletin) {
        if (!bulletin) return Promise.resolve({ success: false });
        var cleanCover = this.sanitizeUrl(bulletin.cover_image_url);
        var cleanDriveLink = this.sanitizeUrl(bulletin.drive_link);
        var readLine = cleanDriveLink ? '\n\nRead: ' + cleanDriveLink : '';
        var body = 'New bulletin published!\n\n' + bulletin.bulletin_name + '\n' + (bulletin.edition ? 'Edition: ' + bulletin.edition + '\n' : '') + (bulletin.description ? '\n' + bulletin.description + '\n' : '') + readLine + '\n\n' + this.config.clubName;
        return this.queueAndSend('bulletin_notification',
            { type: 'bulletin_notification', to: this.config.membersEmail, subject: 'New Bulletin: ' + bulletin.bulletin_name, body: body, attachments: cleanCover ? [cleanCover] : [] },
            { to_email: this.config.membersEmail, to_name: 'Members', subject: 'New Bulletin: ' + bulletin.bulletin_name, message: body, body: body, poster_url: cleanCover, attachment_url: cleanDriveLink }
        );
    },

    sendTestEmail: function(toEmail) {
        if (!toEmail) return Promise.resolve({ success: false });
        var body = 'Hello!\n\nTest email works!\n\n' + this.config.clubName;
        return this.queueAndSend('test',
            { type: 'test', to: toEmail, subject: 'Test from Rotaract Unity', body: body, attachments: [] },
            { to_email: toEmail, to_name: 'Test User', subject: 'Test from Rotaract Unity', message: body, body: body }
        );
    },

    retryFailed: function() {
        var self = this;
        if (typeof supabaseAdmin === 'undefined') return Promise.resolve({ success: false });
        return supabaseAdmin.from('mail_queue').select('*').eq('status', 'failed').limit(5).then(function(result) {
            var failed = result.data || [];
            if (!failed.length) return { success: true, retried: 0 };
            var retried = 0;
            var chain = Promise.resolve();
            failed.forEach(function(mail) {
                chain = chain.then(function() {
                    return self.sendViaEmailJS(mail.mail_type, { to_email: mail.recipients, subject: mail.subject, message: mail.body, body: mail.body, poster_url: (mail.attachments && mail.attachments[0]) || '' }).then(function(r) {
                        if (r.success) { retried++; return self.updateMailStatus(mail.id, 'sent'); }
                    }).then(function() { return self.delay(1000); });
                });
            });
            return chain.then(function() { return { success: true, retried: retried }; });
        }).catch(function(err) { return { success: false, error: err.message }; });
    },

    getStats: function() {
        if (typeof supabaseAdmin === 'undefined') return Promise.resolve({ total: 0, sent: 0, pending: 0, failed: 0 });
        return supabaseAdmin.from('mail_queue').select('status').then(function(r) {
            var d = r.data || [];
            return { total: d.length, sent: d.filter(function(m){return m.status==='sent';}).length, pending: d.filter(function(m){return m.status==='pending';}).length, failed: d.filter(function(m){return m.status==='failed';}).length };
        }).catch(function() { return { total: 0, sent: 0, pending: 0, failed: 0 }; });
    },

    getAllMemberEmails: function() {
        if (typeof supabaseAdmin === 'undefined') return Promise.resolve([]);
        return supabaseAdmin.from('club_members').select('full_name, email').eq('is_active', true).not('email', 'is', null).then(function(r) { return r.data || []; }).catch(function() { return []; });
    },

    getBoardEmails: function() {
        if (typeof supabaseAdmin === 'undefined') return Promise.resolve([]);
        return supabaseAdmin.from('users').select('full_name, email').eq('is_active', true).eq('is_board_member', true).not('email', 'is', null).then(function(r) { return r.data || []; }).catch(function() { return []; });
    },

    avenueLabel: function(av) {
        return { club_service: 'Club Service', community_service: 'Community Service', professional_service: 'Professional Service', international_service: 'International Service', dpp: 'District Priority Projects' }[av] || av || 'General';
    },

    formatTime: function(t) {
        if (!t) return 'TBA';
        try { var p = t.split(':'); var h = parseInt(p[0]); if (isNaN(h)) return t; return (h % 12 || 12) + ':' + p[1] + ' ' + (h >= 12 ? 'PM' : 'AM'); } catch(e) { return t; }
    },

    delay: function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() { if (typeof Mail !== 'undefined' && !Mail.initialized) Mail.init(); }, 1500);
});
window.addEventListener('load', function() { if (typeof Mail !== 'undefined' && !Mail.initialized) Mail.init(); });
window.Mail = Mail;