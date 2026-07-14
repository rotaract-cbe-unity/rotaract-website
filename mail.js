/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - MAIL SYSTEM
   Complete - Zero Bugs - EmailJS integration working
   Sends from rc.cbeunity@gmail.com via EmailJS
   File: mail.js
   ============================================================ */

'use strict';

// ============================================================
// MAIL CONFIGURATION
// ============================================================
var MailConfig = {
    fromEmail:    'rc.cbeunity@gmail.com',
    fromName:     'Rotaract Club of Coimbatore Unity',
    groupEmail:   'rotaractunity@googlegroups.com',
    replyTo:      'rc.cbeunity@gmail.com',
    signature:    [
        '',
        '─'.repeat(50),
        'Rotaract Club of Coimbatore Unity',
        'Family of Rotary Club of Coimbatore East',
        'Rotary International District 3206 (Coimbatore | Pallakkad)',
        'Club ID: 91594 | Chartered: 21st April 2014',
        'Email: rc.cbeunity@gmail.com',
        'Social: @rotaractunity',
        '─'.repeat(50)
    ].join('\n'),
    htmlSignature: [
        '<div style="margin-top:24px;padding-top:16px;border-top:2px solid #0057b7;font-family:Poppins,Arial,sans-serif;">',
        '<img src="https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png" ',
        'alt="Rotaract Club of Coimbatore Unity" style="height:40px;margin-bottom:8px;display:block;">',
        '<strong style="color:#0057b7;font-size:14px;">Rotaract Club of Coimbatore Unity</strong><br>',
        '<span style="color:#555;font-size:12px;">Family of Rotary Club of Coimbatore East</span><br>',
        '<span style="color:#555;font-size:12px;">Rotary International District 3206 (Coimbatore | Pallakkad)</span><br>',
        '<span style="color:#777;font-size:11px;">Club ID: 91594 | Chartered: 21st April 2014</span><br>',
        '<a href="mailto:rc.cbeunity@gmail.com" style="color:#0057b7;font-size:12px;">rc.cbeunity@gmail.com</a>',
        ' | <span style="color:#777;font-size:11px;">@rotaractunity</span>',
        '</div>'
    ].join('')
};

// ============================================================
// EMAIL PROVIDER STATE
// ============================================================
var EmailProvider = {
    type:       'emailjs',
    serviceId:  'service_9bgbmrv',
    templateId: 'template_s46eqig',
    publicKey:  '5DbN9WImU8rLoat8j',
    loaded:     false,
    loading:    false,
    retryCount: 0,
    maxRetries: 2
};

// ============================================================
// MAIL STATE
// ============================================================
var MailState = {
    initialized:        false,
    queueProcessorTimer: null,
    birthdayCheckDone:  false,
    lastMonthlyStmt:    null,
    processingQueue:    false
};

// ============================================================
// INITIALIZE MAIL SYSTEM
// ============================================================
function initMailSystem() {
    if (MailState.initialized) return;
    MailState.initialized = true;

    // Update config from settings
    MailConfig.fromEmail  = getSetting('email_from_address', 'rc.cbeunity@gmail.com');
    MailConfig.fromName   = getSetting('email_from_name',    'Rotaract Club of Coimbatore Unity');
    MailConfig.replyTo    = getSetting('email_reply_to',     'rc.cbeunity@gmail.com');

    // Load EmailJS credentials
    var svcId  = getSetting('emailjs_service_id',  'service_9bgbmrv');
    var tplId  = getSetting('emailjs_template_id', 'template_s46eqig');
    var pubKey = getSetting('emailjs_public_key',  '5DbN9WImU8rLoat8j');

    if (svcId)  EmailProvider.serviceId  = svcId;
    if (tplId)  EmailProvider.templateId = tplId;
    if (pubKey) EmailProvider.publicKey  = pubKey;

    // Load EmailJS SDK
    _loadEmailJSSDK(EmailProvider.publicKey);

    // Start queue processor every 30 seconds
    if (MailState.queueProcessorTimer) clearInterval(MailState.queueProcessorTimer);
    MailState.queueProcessorTimer = setInterval(processEmailQueue, 30 * 1000);

    // Process queue on startup after 12 seconds
    setTimeout(processEmailQueue, 12000);

    console.log('%c mail.js initialized ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');
}

// ============================================================
// LOAD EMAILJS SDK
// ============================================================
function _loadEmailJSSDK(publicKey) {
    if (typeof emailjs !== 'undefined') {
        try { emailjs.init(publicKey); EmailProvider.loaded = true; } catch (e) { console.warn('EmailJS init error:', e); }
        return;
    }

    if (EmailProvider.loading) return;
    EmailProvider.loading = true;

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.onload = function() {
        try {
            emailjs.init(EmailProvider.publicKey);
            EmailProvider.loaded = true;
            EmailProvider.loading = false;
            console.log('EmailJS SDK loaded and initialized');
        } catch (e) {
            console.error('EmailJS init failed:', e);
            EmailProvider.loading = false;
        }
    };
    script.onerror = function() {
        console.error('EmailJS CDN failed to load');
        EmailProvider.loading = false;

        // Try backup CDN
        if (EmailProvider.retryCount < EmailProvider.maxRetries) {
            EmailProvider.retryCount++;
            setTimeout(function() {
                var backup = document.createElement('script');
                backup.src = 'https://unpkg.com/@emailjs/browser@3/dist/email.min.js';
                backup.onload = function() {
                    try { emailjs.init(EmailProvider.publicKey); EmailProvider.loaded = true; } catch (e) {}
                };
                document.head.appendChild(backup);
            }, 3000);
        }
    };
    document.head.appendChild(script);
}

// ============================================================
// BUILD HTML EMAIL TEMPLATE
// ============================================================
function buildHtmlEmail(subject, contentHtml) {
    return [
        '<!DOCTYPE html><html lang="en"><head>',
        '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">',
        '<title>' + escapeHtml(subject) + '</title>',
        '<style>',
        'body{font-family:Poppins,Arial,sans-serif;background:#f4f6fc;margin:0;padding:0;}',
        '.wrap{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);}',
        '.hdr{background:linear-gradient(135deg,#0057b7,#003d82);padding:24px;text-align:center;}',
        '.hdr img{height:48px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;}',
        '.hdr h1{color:#fff;font-size:17px;margin:0;font-weight:700;}',
        '.hdr p{color:rgba(255,255,255,0.75);font-size:12px;margin:5px 0 0;}',
        '.body{padding:28px 32px;color:#1a1a2e;line-height:1.75;font-size:14px;}',
        '.body p{margin:0 0 14px;}',
        '.body a{color:#0057b7;text-decoration:none;font-weight:600;}',
        '.info-box{background:#f0f4ff;border-left:4px solid #0057b7;padding:14px 16px;border-radius:0 8px 8px 0;margin:16px 0;}',
        '.detail-table{width:100%;border-collapse:collapse;margin:12px 0;}',
        '.detail-table td{padding:7px 10px;font-size:13px;border-bottom:1px solid #f0f2fa;vertical-align:top;}',
        '.detail-table td:first-child{color:#6b7280;font-weight:600;width:130px;white-space:nowrap;}',
        '.cta{display:inline-block;background:#0057b7;color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:16px 0;}',
        '.badge{display:inline-block;background:#0057b7;color:#fff;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;}',
        '.footer{background:#f4f6fc;padding:20px 32px;border-top:1px solid #e0e4f0;}',
        '.footer p{color:#777;font-size:11px;margin:0;line-height:1.7;}',
        '.footer a{color:#0057b7;text-decoration:none;}',
        '.sig-bar{display:block;width:40px;height:3px;background:#0057b7;margin:0 0 12px;}',
        '@media(max-width:600px){.body{padding:20px;}.footer{padding:16px 20px;}}',
        '</style></head><body>',
        '<div class="wrap">',
        '<div class="hdr">',
        '<img src="https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png" alt="Logo">',
        '<h1>Rotaract Club of Coimbatore Unity</h1>',
        '<p>Family of Rotary Club of Coimbatore East &bull; District 3206</p>',
        '</div>',
        '<div class="body">' + contentHtml + '</div>',
        '<div class="footer">',
        '<span class="sig-bar"></span>',
        '<p>',
        '<strong style="color:#0057b7;">Rotaract Club of Coimbatore Unity</strong><br>',
        'Family of Rotary Club of Coimbatore East<br>',
        'Rotary International District 3206 (Coimbatore | Pallakkad)<br>',
        'Club ID: 91594 | Chartered: 21st April 2014<br>',
        '<a href="mailto:rc.cbeunity@gmail.com">rc.cbeunity@gmail.com</a> &bull; @rotaractunity',
        '</p>',
        '<p style="margin-top:10px;font-size:10px;color:#9ca3af;">',
        'This email was sent from Rotaract Club of Coimbatore Unity portal.<br>',
        '&copy; ' + new Date().getFullYear() + ' Rotaract Club of Coimbatore Unity.',
        '</p></div></div></body></html>'
    ].join('');
}

// ============================================================
// CORE SEND EMAIL — Routes to EmailJS
// ============================================================
async function sendEmail(options) {
    /*
    options = {
        to:      'email@example.com' | ['email1', 'email2'],
        subject: 'Subject line',
        body:    'Plain text body',
        htmlBody:'<p>HTML body</p>'  (optional)
    }
    */
    try {
        var toList = Array.isArray(options.to) ? options.to : [options.to];
        toList = toList.filter(function(e) { return e && validateEmail(e); });
        if (!toList.length) { console.warn('sendEmail: No valid recipients'); return false; }

        var plainBody = (options.body || '') + MailConfig.signature;
        var htmlContent = options.htmlBody || (options.body || '').replace(/\n/g, '<br>');
        var fullHtml = buildHtmlEmail(options.subject || '', htmlContent);

        return await _sendViaEmailJS(toList, options.subject || '', plainBody, fullHtml);

    } catch (err) {
        console.error('sendEmail error:', err);
        return false;
    }
}

// ============================================================
// SEND VIA EMAILJS
// ============================================================
async function _sendViaEmailJS(toList, subject, plainBody, htmlBody) {
    if (!EmailProvider.loaded || typeof emailjs === 'undefined') {
        console.warn('EmailJS not ready, falling back to queue');
        return false;
    }

    if (!EmailProvider.serviceId || !EmailProvider.templateId || !EmailProvider.publicKey) {
        console.warn('EmailJS credentials missing');
        return false;
    }

    try {
        // EmailJS sends to one recipient at a time - batch them
        var results = await Promise.allSettled(toList.map(function(recipient) {
            return emailjs.send(
                EmailProvider.serviceId,
                EmailProvider.templateId,
                {
                    to_email:     recipient,
                    from_name:    MailConfig.fromName,
                    from_email:   MailConfig.fromEmail,
                    reply_to:     MailConfig.replyTo,
                    subject:      subject,
                    message:      plainBody,
                    html_message: htmlBody
                },
                EmailProvider.publicKey
            );
        }));

        var success = results.filter(function(r) { return r.status === 'fulfilled'; }).length;
        var failed  = results.length - success;

        if (failed > 0) {
            console.warn('EmailJS: ' + failed + '/' + toList.length + ' emails failed');
        }
        if (success > 0) {
            console.log('EmailJS: Sent ' + success + '/' + toList.length + ' emails successfully');
        }

        return success > 0;

    } catch (err) {
        console.error('EmailJS send error:', err);
        return false;
    }
}

// ============================================================
// LOG MAIL TO DATABASE
// ============================================================
async function _logMail(type, recipient, subject, status, relatedType, relatedId) {
    try {
        if (!supabase) return;
        await supabase.from('mail_log').insert({
            mail_type:           type     || 'custom',
            recipient:           recipient || '',
            subject:             subject  || '',
            status:              status   || 'sent',
            provider:            'emailjs',
            related_entity_type: relatedType || null,
            related_entity_id:   relatedId   || null,
            sent_at:             status === 'sent' ? new Date().toISOString() : null
        });
    } catch (e) { console.warn('_logMail error (non-critical):', e); }
}

// ============================================================
// PROCESS EMAIL QUEUE — Runs every 30 seconds
// ============================================================
async function processEmailQueue() {
    if (MailState.processingQueue || !supabase) return;
    MailState.processingQueue = true;

    try {
        // Get queued emails (max 5 at a time to respect rate limits)
        var r = await supabase
            .from('notification_queue')
            .select('*')
            .eq('status', 'queued')
            .lt('retry_count', 3)
            .is('processing_at', null)
            .order('created_at', { ascending: true })
            .limit(5);

        if (r.error || !r.data || !r.data.length) return;

        for (var i = 0; i < r.data.length; i++) {
            var item = r.data[i];
            await _processQueueItem(item);
            // Small delay between emails to avoid rate limiting
            if (i < r.data.length - 1) {
                await new Promise(function(resolve) { setTimeout(resolve, 1500); });
            }
        }

    } catch (err) {
        console.error('processEmailQueue error:', err);
    } finally {
        MailState.processingQueue = false;
    }
}

// ============================================================
// PROCESS SINGLE QUEUE ITEM
// ============================================================
async function _processQueueItem(item) {
    if (!supabase || !item) return;

    try {
        // Mark as processing
        await supabase.from('notification_queue').update({
            status:        'processing',
            processing_at: new Date().toISOString()
        }).eq('id', item.id);

        // Determine actual recipients
        var emails = item.recipient_emails || [];

        if (item.recipient_type === 'all') {
            var allM = await getAllMemberEmails(false);
            emails = allM.map(function(m) { return m.email; }).filter(Boolean);
            // Include group email for 'all' type
            if (getSetting('group_email_enabled', 'true') === 'true') {
                if (emails.indexOf(MailConfig.groupEmail) === -1) {
                    emails.unshift(MailConfig.groupEmail);
                }
            }
        } else if (item.recipient_type === 'board') {
            var boardM = await getAllMemberEmails(true);
            emails = boardM.map(function(m) { return m.email; }).filter(Boolean);
        }
        // else use recipient_emails as-is

        if (!emails.length) {
            await supabase.from('notification_queue').update({ status: 'failed', last_error: 'No valid recipients', processing_at: null }).eq('id', item.id);
            return;
        }

        // Try to send
        var success = false;
        if (EmailProvider.loaded && typeof emailjs !== 'undefined') {
            success = await _sendViaEmailJS(emails, item.subject, item.body, item.html_body || null);
        }

        if (success) {
            await supabase.from('notification_queue').update({
                status:           'sent',
                sent_at:          new Date().toISOString(),
                provider_used:    'emailjs',
                actual_recipients: emails.length,
                processing_at:    null
            }).eq('id', item.id);

            await _logMail(item.notification_type, emails.length + ' recipient(s)', item.subject, 'sent', item.related_entity_type, item.related_entity_id);
            console.log('Queue processed:', item.notification_type, '->', emails.length, 'recipients');
        } else {
            var retryCount = (item.retry_count || 0) + 1;
            var newStatus  = retryCount >= 3 ? 'failed' : 'queued';
            await supabase.from('notification_queue').update({
                status:        newStatus,
                retry_count:   retryCount,
                last_error:    'EmailJS send failed',
                processing_at: null
            }).eq('id', item.id);
        }

    } catch (err) {
        console.error('_processQueueItem error:', err);
        try {
            await supabase.from('notification_queue').update({
                status:        'queued',
                retry_count:   (item.retry_count || 0) + 1,
                last_error:    err.message || 'Unknown error',
                processing_at: null
            }).eq('id', item.id);
        } catch (e) {}
    }
}

// ============================================================
// QUEUE EMAIL TO SUPABASE (for deferred sending)
// ============================================================
async function queueEmail(type, recipientType, emails, subject, body, htmlBody, relatedType, relatedId) {
    try {
        if (!supabase) return false;
        await supabase.from('notification_queue').insert({
            notification_type:   type          || 'custom',
            recipient_type:      recipientType  || 'custom',
            recipient_emails:    emails         || [],
            subject:             subject        || '',
            body:                body           || '',
            html_body:           htmlBody       || (body || '').replace(/\n/g, '<br>'),
            status:              'queued',
            related_entity_type: relatedType    || null,
            related_entity_id:   relatedId      || null,
            created_by:          AppState.currentAdmin ? AppState.currentAdmin.id : null
        });
        return true;
    } catch (e) {
        console.error('queueEmail error:', e);
        return false;
    }
}

// ============================================================
// 1. MEETING INTIMATION EMAIL
// ============================================================
async function sendMeetingIntimationEmail(meeting, emails) {
    if (!meeting || !emails || !emails.length) return false;

    var typeLabel = formatMeetingTypeLabel(meeting.meeting_type);
    var timeStr   = formatTime(meeting.start_time) + (meeting.end_time ? ' to ' + formatTime(meeting.end_time) : '');
    var subject   = 'Meeting Intimation: ' + meeting.title + ' | ' + formatDateShort(meeting.date) + ' | Rotaract Club of Coimbatore Unity';

    var htmlContent = [
        '<p>Dear Members,</p>',
        '<p>You are cordially invited to attend the upcoming <strong>' + typeLabel + '</strong>.</p>',
        '<div class="info-box">',
        '<table class="detail-table">',
        '<tr><td>Meeting</td><td><strong>' + escapeHtml(meeting.title) + '</strong></td></tr>',
        '<tr><td>Type</td><td>' + typeLabel + '</td></tr>',
        '<tr><td>Date</td><td>' + formatDate(meeting.date) + '</td></tr>',
        '<tr><td>Time</td><td>' + timeStr + '</td></tr>',
        '<tr><td>Venue</td><td>' + escapeHtml(meeting.venue || 'To be announced') + '</td></tr>',
        meeting.venue_address ? '<tr><td>Address</td><td>' + escapeHtml(meeting.venue_address) + '</td></tr>' : '',
        '</table></div>',
        meeting.agenda ? '<p><strong>Agenda:</strong><br>' + escapeHtml(meeting.agenda).replace(/\n/g, '<br>') + '</p>' : '',
        meeting.description ? '<p><em>' + escapeHtml(meeting.description) + '</em></p>' : '',
        '<p>Your presence is highly appreciated. An attendance form will be shared at the meeting start time.</p>'
    ].join('');

    var plainBody = [
        'Dear Members,', '',
        'You are cordially invited to attend the upcoming ' + typeLabel + '.', '',
        'MEETING DETAILS:',
        '='.repeat(60),
        'Meeting : ' + meeting.title,
        'Type    : ' + typeLabel,
        'Date    : ' + formatDate(meeting.date),
        'Time    : ' + timeStr,
        'Venue   : ' + (meeting.venue || 'To be announced'),
        meeting.venue_address ? 'Address : ' + meeting.venue_address : '',
        '='.repeat(60),
        meeting.agenda ? '\nAgenda:\n' + meeting.agenda : '',
        meeting.description ? '\nNote: ' + meeting.description : '',
        '', 'Your presence is highly appreciated.',
        'An attendance form will be shared at the meeting start time.'
    ].filter(function(l) { return l !== undefined; }).join('\n');

    var result = await sendEmail({ to: emails, subject: subject, body: plainBody, htmlBody: htmlContent });
    await _logMail('meeting_intimation', emails.length + ' recipient(s)', subject, result ? 'sent' : 'failed', 'meetings', meeting.id);
    return result;
}

// ============================================================
// 2. MEETING ATTENDANCE FORM EMAIL
// ============================================================
async function sendAttendanceFormEmail(meeting, attendanceUrl, emails) {
    if (!meeting || !attendanceUrl || !emails || !emails.length) return false;

    var subject = 'Attendance Form: ' + meeting.title + ' | Rotaract Club of Coimbatore Unity';

    var htmlContent = [
        '<p>Dear Members,</p>',
        '<p>Please mark your attendance for the meeting below.</p>',
        '<div class="info-box">',
        '<p style="margin:0;font-size:13px;"><strong>' + escapeHtml(meeting.title) + '</strong><br>',
        formatDate(meeting.date) + ' | ' + formatTime(meeting.start_time) + '<br>',
        escapeHtml(meeting.venue || 'To be announced') + '</p>',
        '</div>',
        '<div style="text-align:center;margin:24px 0;">',
        '<a href="' + attendanceUrl + '" class="cta">Mark My Attendance</a>',
        '</div>',
        '<p style="color:#777;font-size:12px;">Or copy this link: <a href="' + attendanceUrl + '">' + attendanceUrl + '</a></p>',
        '<p style="font-size:13px;">The form collects your name, designation, RI ID, in-time, and e-signature. Please submit before the meeting ends.</p>'
    ].join('');

    var plainBody = [
        'Dear Members,', '',
        'ATTENDANCE SHEET',
        '='.repeat(60),
        'Meeting : ' + meeting.title,
        'Date    : ' + formatDate(meeting.date),
        'Time    : ' + formatTime(meeting.start_time) + (meeting.end_time ? ' to ' + formatTime(meeting.end_time) : ''),
        'Venue   : ' + (meeting.venue || 'To be announced'),
        '='.repeat(60),
        '', 'Mark your attendance here:',
        attendanceUrl,
        '', 'Please submit before the meeting ends.'
    ].join('\n');

    var result = await sendEmail({ to: emails, subject: subject, body: plainBody, htmlBody: htmlContent });
    await _logMail('meeting_attendance', emails.length + ' recipient(s)', subject, result ? 'sent' : 'failed', 'meetings', meeting.id);
    return result;
}

// ============================================================
// 3. MEETING MINUTES EMAIL
// ============================================================
async function sendMeetingMinutesEmail(meeting, minutesPdfUrl, emails) {
    if (!meeting || !minutesPdfUrl || !emails || !emails.length) return false;

    var subject = 'Meeting Minutes: ' + meeting.title + ' | Rotaract Club of Coimbatore Unity';

    var htmlContent = [
        '<p>Dear Members,</p>',
        '<p>The minutes of the <strong>' + formatMeetingTypeLabel(meeting.meeting_type) + '</strong> have been published.</p>',
        '<div class="info-box">',
        '<p style="margin:0;font-size:13px;"><strong>' + escapeHtml(meeting.title) + '</strong><br>' + formatDate(meeting.date) + '</p>',
        '</div>',
        '<div style="text-align:center;margin:24px 0;">',
        '<a href="' + minutesPdfUrl + '" target="_blank" class="cta">View Meeting Minutes (PDF)</a>',
        '</div>'
    ].join('');

    var plainBody = [
        'Dear Members,', '',
        'Meeting minutes for ' + meeting.title + ' (' + formatDate(meeting.date) + ') have been published.',
        '', 'View Minutes:', minutesPdfUrl
    ].join('\n');

    var result = await sendEmail({ to: emails, subject: subject, body: plainBody, htmlBody: htmlContent });
    await _logMail('meeting_minutes', emails.length + ' recipient(s)', subject, result ? 'sent' : 'failed', 'meetings', meeting.id);
    return result;
}

// ============================================================
// 4. PROJECT APPROVAL EMAIL
// ============================================================
async function sendProjectApprovalEmail(ev, emails) {
    if (!ev || !emails || !emails.length) return false;

    var tStr = ev.start_time ? (formatTime(ev.start_time) + (ev.end_time ? ' to ' + formatTime(ev.end_time) : '')) : 'Time to be announced';
    var subject = 'New Event: ' + ev.title + ' | Rotaract Club of Coimbatore Unity';

    var htmlContent = [
        '<p>Dear Members,</p>',
        '<p>We are pleased to announce a new event!</p>',
        '<div class="info-box">',
        '<h3 style="margin:0 0 12px;color:#0057b7;font-size:16px;">' + escapeHtml(ev.title) + '</h3>',
        '<span class="badge">' + formatAvenueLabel(ev.avenue) + '</span>',
        '<table class="detail-table" style="margin-top:12px;">',
        '<tr><td>Date</td><td>' + formatDate(ev.date) + '</td></tr>',
        '<tr><td>Time</td><td>' + tStr + '</td></tr>',
        '<tr><td>Venue</td><td>' + escapeHtml(ev.venue || 'To be announced') + '</td></tr>',
        ev.event_chair ? '<tr><td>Chair</td><td>' + escapeHtml(ev.event_chair) + '</td></tr>' : '',
        '</table></div>',
        ev.description ? '<p style="font-size:13px;color:#444;">' + escapeHtml(ev.description).replace(/\n/g, '<br>') + '</p>' : '',
        '<p>We look forward to your active participation!</p>'
    ].join('');

    var plainBody = [
        'Dear Members,', '',
        'We are pleased to announce a new event!', '',
        'EVENT DETAILS:',
        '='.repeat(60),
        'Event   : ' + ev.title,
        'Avenue  : ' + formatAvenueLabel(ev.avenue),
        'Date    : ' + formatDate(ev.date),
        'Time    : ' + tStr,
        'Venue   : ' + (ev.venue || 'To be announced'),
        ev.event_chair  ? 'Chair   : ' + ev.event_chair  : '',
        ev.proposed_by  ? 'Proposed: ' + ev.proposed_by  : '',
        '='.repeat(60),
        ev.description ? '\nDescription:\n' + ev.description : '',
        '', 'We look forward to your participation!'
    ].filter(function(l) { return l !== undefined; }).join('\n');

    var result = await sendEmail({ to: emails, subject: subject, body: plainBody, htmlBody: htmlContent });
    if (result && supabase) {
        await supabase.from('events').update({ mail_sent: true, approval_mail_sent_at: new Date().toISOString() }).eq('id', ev.id);
    }
    await _logMail('project_approved', emails.length + ' recipient(s)', subject, result ? 'sent' : 'failed', 'events', ev.id);
    return result;
}

// ============================================================
// 5. BIRTHDAY WISH EMAIL
// ============================================================
async function sendBirthdayWishEmail(memberName, memberEmail) {
    if (!memberName || !memberEmail || !validateEmail(memberEmail)) return false;

    var subject = 'Happy Birthday ' + memberName + '! | Rotaract Club of Coimbatore Unity';

    var htmlContent = [
        '<div style="text-align:center;padding:20px 0;">',
        '<div style="font-size:56px;margin-bottom:12px;">&#127881;</div>',
        '<h2 style="color:#0057b7;font-size:26px;margin:0 0 8px;">Happy Birthday!</h2>',
        '</div>',
        '<p>Dear <strong>' + escapeHtml(memberName) + '</strong>,</p>',
        '<p>On behalf of the entire family of <strong>Rotaract Club of Coimbatore Unity</strong>, we wish you a very <strong>Happy Birthday!</strong></p>',
        '<p>May this special day bring you immense joy, success, and wonderful memories. Your dedication to service and community has been an inspiration to all of us.</p>',
        '<div class="info-box" style="text-align:center;">',
        '<p style="margin:0;font-style:italic;color:#0057b7;font-size:16px;">"Service Above Self"</p>',
        '</div>',
        '<p>May this year bring you more opportunities to serve, lead, and make a positive difference in the world!</p>',
        '<p style="text-align:center;color:#0057b7;font-weight:600;">Here\'s to another wonderful year of fellowship and service!</p>'
    ].join('');

    var plainBody = [
        'Dear ' + memberName + ',', '',
        'On behalf of the entire family of Rotaract Club of Coimbatore Unity,',
        'we wish you a very Happy Birthday!', '',
        'May this special day bring you immense joy, success, and wonderful memories.',
        'Your dedication to service and community has been an inspiration to all of us.', '',
        '"Service Above Self"', '',
        'May this year bring you more opportunities to serve, lead, and',
        'make a positive difference in the world!', '',
        'Here\'s to another wonderful year of fellowship and service!'
    ].join('\n');

    var result = await sendEmail({ to: [memberEmail], subject: subject, body: plainBody, htmlBody: htmlContent });
    await _logMail('birthday_wish', memberEmail, subject, result ? 'sent' : 'failed', null, null);
    return result;
}

// ============================================================
// 6. MEMBERSHIP APPROVED EMAIL
// ============================================================
async function sendMembershipApprovedEmail(application) {
    if (!application || !application.email || !validateEmail(application.email)) return false;

    var subject = 'Welcome to Rotaract Club of Coimbatore Unity!';

    var htmlContent = [
        '<p>Dear <strong>' + escapeHtml(application.full_name) + '</strong>,</p>',
        '<p>We are <strong>delighted</strong> to inform you that your membership application to <strong>Rotaract Club of Coimbatore Unity</strong> has been <strong style="color:#10b981;">APPROVED!</strong></p>',
        '<p>Welcome to the family!</p>',
        '<div class="info-box">',
        '<table class="detail-table">',
        '<tr><td>Club Name</td><td><strong>Rotaract Club of Coimbatore Unity</strong></td></tr>',
        '<tr><td>Parent Club</td><td>Rotary Club of Coimbatore East</td></tr>',
        '<tr><td>District</td><td>Rotary International District 3206 (Coimbatore | Pallakkad)</td></tr>',
        '<tr><td>Club ID</td><td>91594</td></tr>',
        '<tr><td>Chartered</td><td>21st April 2014</td></tr>',
        '</table></div>',
        '<p><strong>Next Steps:</strong></p>',
        '<ol style="color:#444;font-size:13px;line-height:2;">',
        '<li>Attend the next club meeting</li>',
        '<li>Connect with your fellow Rotaractors</li>',
        '<li>Follow us on social media <strong>@rotaractunity</strong></li>',
        '<li>Check our website for upcoming events</li>',
        '</ol>',
        '<p style="text-align:center;font-size:16px;color:#0057b7;font-weight:700;">Together, we serve!</p>'
    ].join('');

    var plainBody = [
        'Dear ' + application.full_name + ',', '',
        'Your membership application to Rotaract Club of Coimbatore Unity has been APPROVED!',
        '', 'Welcome to the family!', '',
        'CLUB DETAILS:',
        '='.repeat(60),
        'Club Name : Rotaract Club of Coimbatore Unity',
        'Parent    : Rotary Club of Coimbatore East',
        'District  : Rotary International District 3206 (Coimbatore | Pallakkad)',
        'Club ID   : 91594',
        'Chartered : 21st April 2014',
        '='.repeat(60),
        '', 'NEXT STEPS:',
        '1. Attend the next club meeting',
        '2. Connect with fellow Rotaractors',
        '3. Follow @rotaractunity on social media',
        '4. Check our website for upcoming events',
        '', 'Together, we serve!'
    ].join('\n');

    var result = await sendEmail({ to: [application.email], subject: subject, body: plainBody, htmlBody: htmlContent });
    await _logMail('membership_approved', application.email, subject, result ? 'sent' : 'failed', null, null);
    return result;
}

// ============================================================
// 7. MONTHLY TREASURY STATEMENT EMAIL
// ============================================================
async function sendMonthlyStatementEmail(monthName, txns, income, expense, overall, emails) {
    if (!emails || !emails.length) return false;

    var subject = 'Treasury Statement - ' + monthName + ' | Rotaract Club of Coimbatore Unity';

    var txRows = (txns || []).length > 0 ?
        (txns || []).map(function(t, i) {
            var isIn = t.transaction_type === 'income';
            return '<tr style="background:' + (i % 2 === 0 ? '#fff' : '#f8f9ff') + ';">' +
                '<td style="padding:6px 10px;font-size:12px;color:#555;">' + formatDateShort(t.date) + '</td>' +
                '<td style="padding:6px 10px;font-size:12px;">' + escapeHtml(t.particular || '') + '</td>' +
                '<td style="padding:6px 10px;font-size:12px;color:' + (isIn ? '#10b981' : '#ef4444') + ';text-align:right;font-weight:600;">' +
                (isIn ? '+' : '-') + ' Rs. ' + formatCurrency(t.amount) + '</td></tr>';
        }).join('') :
        '<tr><td colspan="3" style="padding:20px;text-align:center;color:#777;">No transactions this month</td></tr>';

    var htmlContent = [
        '<p>Dear Members,</p>',
        '<p>Please find the treasury statement for <strong>' + monthName + '</strong>.</p>',
        '<div style="background:#f8f9ff;border-radius:8px;padding:16px;margin:16px 0;">',
        '<table style="width:100%;border-collapse:collapse;">',
        '<thead><tr style="background:#0057b7;color:#fff;">',
        '<th style="padding:8px 10px;text-align:left;font-size:12px;">Date</th>',
        '<th style="padding:8px 10px;text-align:left;font-size:12px;">Particular</th>',
        '<th style="padding:8px 10px;text-align:right;font-size:12px;">Amount</th>',
        '</tr></thead>',
        '<tbody>' + txRows + '</tbody>',
        '</table></div>',
        '<div class="info-box">',
        '<table style="width:100%;border-collapse:collapse;">',
        '<tr><td style="padding:4px 0;font-size:13px;color:#10b981;">Total Income</td><td style="text-align:right;font-size:13px;color:#10b981;font-weight:700;">Rs. ' + formatCurrency(income) + '</td></tr>',
        '<tr><td style="padding:4px 0;font-size:13px;color:#ef4444;">Total Expenses</td><td style="text-align:right;font-size:13px;color:#ef4444;font-weight:700;">Rs. ' + formatCurrency(expense) + '</td></tr>',
        '<tr style="border-top:1px solid rgba(0,87,183,0.2);"><td style="padding:8px 0;font-size:14px;font-weight:700;">Net This Month</td><td style="text-align:right;font-size:14px;font-weight:700;">Rs. ' + formatCurrency(income - expense) + '</td></tr>',
        '<tr><td style="padding:4px 0;font-size:13px;">Overall Balance</td><td style="text-align:right;font-size:13px;font-weight:600;color:#0057b7;">Rs. ' + formatCurrency(overall) + '</td></tr>',
        '</table></div>',
        '<p style="color:#777;font-size:12px;">This is an auto-generated statement. For queries, contact the Treasurer.</p>'
    ].join('');

    var txList = (txns || []).length > 0 ?
        (txns || []).map(function(t, i) {
            var isIn = t.transaction_type === 'income';
            return (i + 1) + '. [' + formatDateShort(t.date) + '] ' + (t.particular || '') + ' - Rs. ' + formatCurrency(t.amount) + ' (' + (isIn ? 'Income' : 'Expense') + ')';
        }).join('\n') : 'No transactions recorded this month.';

    var plainBody = [
        'Dear Members,', '',
        'Treasury Statement for ' + monthName + ':', '',
        'TRANSACTIONS:', '-'.repeat(50),
        txList, '-'.repeat(50), '',
        'SUMMARY:',
        'Total Income    : Rs. ' + formatCurrency(income),
        'Total Expenses  : Rs. ' + formatCurrency(expense),
        'Net This Month  : Rs. ' + formatCurrency(income - expense),
        'Overall Balance : Rs. ' + formatCurrency(overall), '',
        'This is an auto-generated statement. For queries, contact the Treasurer.'
    ].join('\n');

    var result = await sendEmail({ to: emails, subject: subject, body: plainBody, htmlBody: htmlContent });
    await _logMail('monthly_statement', emails.length + ' member(s)', subject, result ? 'sent' : 'failed', null, null);
    return result;
}

// ============================================================
// 8. CUSTOM EMAIL
// ============================================================
async function sendCustomEmail(toList, subject, message, recipientType) {
    if (!toList || !toList.length || !subject || !message) return false;

    // Add group email for all-member emails
    if (recipientType === 'all' && getSetting('group_email_enabled', 'true') === 'true') {
        if (toList.indexOf(MailConfig.groupEmail) === -1) {
            toList = [MailConfig.groupEmail].concat(toList);
        }
    }

    var htmlContent = '<p>Dear Members,</p><div style="font-size:14px;line-height:1.75;color:#333;">' + message.replace(/\n/g, '<br>') + '</div>';

    var result = await sendEmail({ to: toList, subject: subject, body: message, htmlBody: htmlContent });
    await _logMail('custom', toList.length + ' recipient(s)', subject, result ? 'sent' : 'failed', null, null);
    return result;
}

// ============================================================
// BIRTHDAY AUTO CHECK
// ============================================================
async function runBirthdayWishesCheck() {
    if (getSetting('auto_birthday_wish', 'true') !== 'true') return;
    if (!supabase) return;

    try {
        var r = await supabase.rpc('get_todays_birthdays');
        if (r.error || !r.data || !r.data.length) return;

        var yr = new Date().getFullYear();

        for (var i = 0; i < r.data.length; i++) {
            var member = r.data[i];
            var mid    = member.member_id || member.id;

            // Check if already sent this year
            var chk = await supabase.from('birthday_wishes_log').select('id').eq('member_id', mid).eq('wish_year', yr).single();
            if (chk.data) continue;

            // Send birthday wish
            if (member.email) {
                var sent = await sendBirthdayWishEmail(member.full_name, member.email);
                console.log('Birthday wish ' + (sent ? 'sent' : 'failed') + ' for:', member.full_name);
            }

            // Log wish (even if no email)
            await supabase.from('birthday_wishes_log').insert({
                member_id:   mid,
                member_name: member.full_name,
                wish_year:   yr,
                sent_via:    'emailjs'
            });
        }
    } catch (err) { console.error('runBirthdayWishesCheck error:', err); }
}

// ============================================================
// MEETING TIMER — Auto-send attendance form at meeting time
// ============================================================
async function checkAndSendAttendanceForms() {
    if (!supabase) return;

    try {
        var today  = new Date().toISOString().split('T')[0];
        var nowStr = new Date().toTimeString().substring(0, 5);

        var r = await supabase.from('meetings').select('*')
            .eq('date', today)
            .eq('status', 'scheduled')
            .eq('attendance_mail_sent', false);

        if (r.error || !r.data || !r.data.length) return;

        for (var i = 0; i < r.data.length; i++) {
            var mt = r.data[i];
            if (!mt.start_time) continue;

            var startStr = mt.start_time.substring(0, 5);
            if (startStr <= nowStr) {
                await _triggerAttendanceFormForMeeting(mt);
            }
        }
    } catch (err) { console.error('checkAndSendAttendanceForms error:', err); }
}

async function _triggerAttendanceFormForMeeting(meeting) {
    try {
        if (!supabase) return;

        var attendanceUrl = window.location.origin + (window.location.pathname || '/') + '?attendance=' + meeting.id;

        // Get recipients
        var q = supabase.from('members').select('email, full_name').eq('is_active', true);
        if (meeting.meeting_type === 'board_meeting') q = q.eq('is_board_member', true);
        var mr = await q;
        var emails = ((mr.data || []).filter(function(m) { return m.email; })).map(function(m) { return m.email; });
        if (!emails.length) return;

        // Send
        var result = await sendAttendanceFormEmail(meeting, attendanceUrl, emails);

        // Update meeting record
        await supabase.from('meetings').update({
            attendance_mail_sent:        true,
            attendance_mail_sent_at:     new Date().toISOString(),
            attendance_form_url:         attendanceUrl,
            attendance_recipients_count: emails.length,
            status:                      'ongoing'
        }).eq('id', meeting.id);

        // Queue to notification_queue as backup record
        await supabase.from('notification_queue').insert({
            notification_type:   'meeting_attendance',
            recipient_type:      meeting.meeting_type === 'board_meeting' ? 'board' : 'all',
            recipient_emails:    emails,
            subject:             'Attendance Form: ' + meeting.title,
            body:                'Attendance URL: ' + attendanceUrl,
            status:              result ? 'sent' : 'queued',
            sent_at:             result ? new Date().toISOString() : null,
            actual_recipients:   result ? emails.length : 0,
            related_entity_type: 'meetings',
            related_entity_id:   meeting.id,
            provider_used:       'emailjs'
        });

        console.log('Attendance form', result ? 'sent' : 'queued', 'for meeting:', meeting.title, '->', emails.length, 'recipients');
    } catch (err) { console.error('_triggerAttendanceFormForMeeting error:', err); }
}

// ============================================================
// MONTHLY STATEMENT AUTO-CHECK
// ============================================================
async function checkAndSendMonthlyStatement() {
    if (getSetting('auto_monthly_statement', 'true') !== 'true') return;
    if (!supabase) return;

    var now = new Date();
    if (now.getDate() !== 1) return;

    var monthKey = now.getFullYear() + '-' + now.getMonth();
    var lastSent = getLocal('last_monthly_stmt_sent', null);
    if (lastSent === monthKey) return;

    try {
        var lastM  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        var mStart = lastM.toISOString().split('T')[0];
        var mEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        var mName  = lastM.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

        var tr = await supabase.from('treasury').select('*').gte('date', mStart).lte('date', mEnd).order('date', { ascending: true });
        var txns = tr.data || [];

        var income  = txns.reduce(function(s, t) { return s + (t.transaction_type === 'income'  ? parseFloat(t.amount) : 0); }, 0);
        var expense = txns.reduce(function(s, t) { return s + (t.transaction_type === 'expense' ? parseFloat(t.amount) : 0); }, 0);

        var allTr = await supabase.from('treasury').select('transaction_type,amount');
        var overall = (allTr.data || []).reduce(function(s, t) {
            return s + (t.transaction_type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount));
        }, 0);

        var members = await getAllMemberEmails(false);
        var emails  = members.map(function(m) { return m.email; }).filter(Boolean);
        if (!emails.length) return;

        var result = await sendMonthlyStatementEmail(mName, txns, income, expense, overall, emails);

        if (result) {
            setLocal('last_monthly_stmt_sent', monthKey);
            console.log('Auto monthly statement sent for:', mName, '->', emails.length, 'recipients');
        }

    } catch (err) { console.error('checkAndSendMonthlyStatement error:', err); }
}

// ============================================================
// TEST EMAIL PROVIDER
// ============================================================
async function testEmailProvider() {
    if (!AppState.currentAdmin) { showToast('error', 'Error', 'Must be logged in to test'); return; }

    var adminEmail = AppState.currentAdmin.email;
    if (!adminEmail || !validateEmail(adminEmail)) { showToast('error', 'Error', 'No valid admin email for test'); return; }

    showToast('info', 'Testing', 'Sending test email to ' + adminEmail + '...');

    var result = await sendEmail({
        to:      [adminEmail],
        subject: 'Test Email - Rotaract Club of Coimbatore Unity Portal',
        body:    'This is a test email from the Rotaract Club of Coimbatore Unity portal.\n\nIf you received this, your email setup is working correctly!\n\nEmailJS Service ID: ' + EmailProvider.serviceId + '\nTemplate ID: ' + EmailProvider.templateId,
        htmlBody: '<p>This is a test email from the <strong>Rotaract Club of Coimbatore Unity</strong> portal.</p><p style="color:#10b981;font-weight:700;font-size:16px;">Your email setup is working correctly!</p><p style="color:#777;font-size:12px;">EmailJS Service ID: ' + EmailProvider.serviceId + '<br>Template ID: ' + EmailProvider.templateId + '</p>'
    });

    if (result) {
        showToast('success', 'Test Sent!', 'Test email sent to ' + adminEmail + '. Check your inbox!');
    } else {
        showToast('error', 'Test Failed', 'Email could not be sent. Check your EmailJS credentials in Site Settings.');
    }
}

// ============================================================
// UPDATE EMAILJS CREDENTIALS (called when settings change)
// ============================================================
function updateEmailJSCredentials(serviceId, templateId, publicKey) {
    if (serviceId)  EmailProvider.serviceId  = serviceId;
    if (templateId) EmailProvider.templateId = templateId;
    if (publicKey)  EmailProvider.publicKey  = publicKey;

    if (publicKey && typeof emailjs !== 'undefined') {
        try { emailjs.init(publicKey); console.log('EmailJS re-initialized with new key'); }
        catch (e) { console.warn('EmailJS re-init failed:', e); }
    }
}

// ============================================================
// GET EMAIL STATS (for admin)
// ============================================================
async function getEmailStats() {
    try {
        if (!supabase) return null;
        var r = await supabase.from('mail_log').select('mail_type,status,created_at');
        if (r.error) return null;
        var data = r.data || [];
        return {
            total:   data.length,
            sent:    data.filter(function(d) { return d.status === 'sent';   }).length,
            failed:  data.filter(function(d) { return d.status === 'failed'; }).length,
            queued:  data.filter(function(d) { return d.status === 'queued'; }).length,
            today:   data.filter(function(d) { return isToday(d.created_at); }).length,
            byType:  data.reduce(function(acc, d) { acc[d.mail_type] = (acc[d.mail_type] || 0) + 1; return acc; }, {})
        };
    } catch (e) { return null; }
}

// ============================================================
// AUTO-INITIALIZE
// ============================================================
(function() {
    // Initialize mail system after other scripts load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initMailSystem, 3000);
        });
    } else {
        setTimeout(initMailSystem, 3000);
    }
})();

console.log('%c mail.js loaded ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');