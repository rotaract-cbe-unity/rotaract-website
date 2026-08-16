/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Email & Notifications - js/mail.js
   Version: 4.0 - Fixed duplicates, local attendance URL
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // CONFIG
    // ============================================================
    const EMAILJS_SERVICE_ID = 'service_9bgbmrv';
    const EMAILJS_TEMPLATE_ID = 'template_s46eqig';
    const EMAILJS_PUBLIC_KEY = '5DbN9WImU8rLoat8j';

    const SUPABASE_URL = 'https://dledwtepuvzzztfypbgn.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDk2NDMsImV4cCI6MjA5ODcyNTY0M30.9ZcngwUsfl5AkFaCDR9-ljoLLOYeGwwK0AKaHfeyGhY';
    const DB_HEADERS = {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    // ============================================================
    // STATE
    // ============================================================
    let ejsInitialized = false;
    let cachedSettings = null;

    // ============================================================
    // UTILITY
    // ============================================================
    function esc(t) {
        if (!t) return '';
        const d = document.createElement('div');
        d.textContent = String(t);
        return d.innerHTML;
    }

    function fDate(d) {
        if (!d) return '';
        try {
            const date = new Date(d.includes('T') ? d : d + 'T00:00:00');
            if (isNaN(date.getTime())) return d;
            return date.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
        } catch (e) { return d; }
    }

    function fTime(t) {
        if (!t) return '';
        try {
            const parts = t.split(':');
            const h = parseInt(parts[0]);
            const m = String(parseInt(parts[1])).padStart(2, '0');
            if (isNaN(h)) return t;
            return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
        } catch (e) { return t; }
    }

    function fAmount(n) {
        return parseFloat(n || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function todayStr() {
        return new Date().toISOString().split('T')[0];
    }

    // ============================================================
    // EMAILJS INIT
    // ============================================================
    function initEmailJS() {
        if (ejsInitialized) return true;
        if (window.emailjs) {
            try {
                window.emailjs.init(EMAILJS_PUBLIC_KEY);
                ejsInitialized = true;
                console.log('%c [UnityMail] EmailJS initialized ', 'color:#10b981;font-weight:700;');
                return true;
            } catch (e) {
                console.warn('[UnityMail] EmailJS init failed:', e);
                return false;
            }
        }
        return false;
    }

    // ============================================================
    // SETTINGS
    // ============================================================
    async function getSettings() {
        if (cachedSettings) return cachedSettings;
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=key,value`, {
                headers: DB_HEADERS
            });
            if (res.ok) {
                const data = await res.json();
                cachedSettings = {};
                data.forEach(s => { cachedSettings[s.key] = s.value; });
                return cachedSettings;
            }
        } catch (e) {
            console.warn('[UnityMail] Settings fetch failed:', e.message);
        }
        return {};
    }

    // ============================================================
    // LOG EMAIL
    // ============================================================
    async function logEmail(emailType, recipient, subject, status, errorMessage) {
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
                method: 'POST',
                headers: Object.assign({}, DB_HEADERS, { 'Prefer': 'return=minimal' }),
                body: JSON.stringify({
                    email_type: emailType || 'general',
                    recipient: recipient || '',
                    subject: subject || '',
                    status: status || 'sent',
                    error_message: errorMessage || null,
                    sent_at: new Date().toISOString()
                })
            });
        } catch (e) {
            // Non-critical
        }
    }

    // ============================================================
    // CHECK IF EMAIL ALREADY SENT TODAY
    // ============================================================
    async function alreadySentToday(emailType, recipient) {
        try {
            const today = todayStr();
            const url = `${SUPABASE_URL}/rest/v1/email_logs` +
                `?select=id` +
                `&email_type=eq.${encodeURIComponent(emailType)}` +
                `&recipient=eq.${encodeURIComponent(recipient)}` +
                `&status=eq.sent` +
                `&sent_at=gte.${today}T00:00:00.000Z` +
                `&sent_at=lte.${today}T23:59:59.999Z` +
                `&limit=1`;

            const res = await fetch(url, { headers: DB_HEADERS });
            if (res.ok) {
                const data = await res.json();
                return data && data.length > 0;
            }
        } catch (e) {
            // Non-critical
        }
        return false;
    }

    // ============================================================
    // SEND EMAIL VIA EMAILJS
    // ============================================================
    async function sendEmail(to, subject, htmlBody, emailType) {
        if (!initEmailJS()) {
            console.error('[UnityMail] EmailJS not available');
            await logEmail(emailType, to, subject, 'failed', 'EmailJS not loaded');
            return false;
        }

        if (!to || !subject || !htmlBody) {
            console.error('[UnityMail] Missing required params');
            return false;
        }

        try {
            const result = await window.emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    to_email: to,
                    subject: subject,
                    message: htmlBody,
                    reply_to: 'rc.cbeunity@gmail.com',
                    from_name: 'Rotaract Club of Coimbatore Unity'
                }
            );

            console.log(`[UnityMail] Sent to ${to} - Status: ${result.status}`);
            await logEmail(emailType || 'general', to, subject, 'sent');
            return true;

        } catch (err) {
            const errMsg = err.text || err.message || JSON.stringify(err);
            console.error('[UnityMail] Send failed:', errMsg);
            await logEmail(emailType || 'general', to, subject, 'failed', errMsg);
            return false;
        }
    }

    // ============================================================
    // SEND TO GROUP (All Members)
    // ============================================================
    async function sendToGroup(subject, htmlBody, emailType) {
        const s = await getSettings();
        const groupEmail = s.group_email || 'rotaractunity@googlegroups.com';
        return await sendEmail(groupEmail, subject, htmlBody, emailType || 'group');
    }

    // ============================================================
    // SEND TO BOARD (Board Members Only)
    // ============================================================
    async function sendToBoard(subject, htmlBody, emailType) {
        const s = await getSettings();
        const boardEmail = s.board_email || 'unitys-constellation-26-27@googlegroups.com';
        return await sendEmail(boardEmail, subject, htmlBody, emailType || 'board');
    }

    // ============================================================
    // EMAIL BASE TEMPLATE
    // ============================================================
    function emailBase(content, preheader) {
        const logoUrl = 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png';
        const preheaderHtml = preheader
            ? `<span style="display:none;font-size:1px;color:#f0f4ff;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}</span>`
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4ff;color:#1a1a2e;}
a{color:#1a56db;text-decoration:none;}
.wrap{max-width:620px;margin:0 auto;padding:20px 0;}
.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.10);margin:0 16px;}
.hdr{background:linear-gradient(135deg,#1a56db,#1e3a8a);padding:30px 24px;text-align:center;}
.hdr img{width:68px;height:68px;object-fit:contain;margin:0 auto 12px;display:block;}
.hdr h1{color:#fff;font-size:19px;font-weight:800;margin-bottom:4px;}
.hdr p{color:rgba(255,255,255,.75);font-size:12px;margin-bottom:2px;}
.hdr .meta{color:rgba(255,255,255,.45);font-size:10px;}
.body{padding:26px 28px 22px;}
.ftr{background:#f8faff;padding:18px 24px;text-align:center;border-top:1px solid #e2e8f0;}
.ftr .motto{font-size:13px;font-weight:700;color:#1a56db;margin-bottom:6px;}
.ftr p{font-size:11px;color:#94a3b8;line-height:1.7;margin-bottom:3px;}
.ftr a{color:#1a56db;font-size:11px;}
.ftr .copy{font-size:10px;color:#cbd5e1;margin-top:8px;}
.unsub{font-size:10px;color:#cbd5e1;text-align:center;padding:10px 24px;}
.btn{display:inline-block;padding:12px 26px;background:#1a56db;color:#fff;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;margin:6px 4px;}
.info-box{background:#f0f4ff;border-radius:10px;padding:14px 16px;margin:12px 0;font-size:13px;color:#4a5568;line-height:1.7;}
.info-box.success{background:#d1fae5;border-left:4px solid #10b981;}
.info-box.warning{background:#fef3c7;border-left:4px solid #f59e0b;}
.info-box.danger{background:#fee2e2;border-left:4px solid #ef4444;}
.info-box.primary{background:#dbeafe;border-left:4px solid #1a56db;}
.dtable{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;}
.dtable td{padding:8px 10px;vertical-align:top;}
.dtable td.lbl{font-weight:700;background:#f8faff;border-radius:6px;width:36%;color:#2d3748;}
.dtable td.val{color:#4a5568;}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#fff;}
.badge-blue{background:#1a56db;}.badge-green{background:#10b981;}.badge-red{background:#ef4444;}.badge-yellow{background:#f59e0b;color:#1a1a2e;}
h2{font-size:19px;font-weight:800;color:#1a1a2e;margin-bottom:8px;}
h3{font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:6px;}
p{font-size:13.5px;color:#4a5568;line-height:1.75;margin-bottom:10px;}
ul{padding-left:18px;margin:10px 0;}
li{font-size:13px;color:#4a5568;line-height:1.7;margin-bottom:4px;}
.highlight{color:#1a56db;font-weight:700;}
hr.div{border:none;border-top:1px solid #e2e8f0;margin:18px 0;}
@media(max-width:620px){.card{margin:0 8px;border-radius:12px;}.hdr{padding:22px 18px;}.body{padding:20px 16px;}.ftr{padding:14px 16px;}}
</style>
</head>
<body>
${preheaderHtml}
<div class="wrap">
  <div class="card">
    <div class="hdr">
      <img src="${logoUrl}" alt="Rotaract Club of Coimbatore Unity">
      <h1>Rotaract Club of Coimbatore Unity</h1>
      <p>Family of Rotary Club of Coimbatore East</p>
      <p class="meta">Club ID: 91594 &nbsp;|&nbsp; RI District 3206 (Coimbatore | Pallakkad)</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="ftr">
      <p class="motto">Service Above Self</p>
      <p><strong>Rotaract Club of Coimbatore Unity</strong></p>
      <p>Family of Rotary Club of Coimbatore East | RI District 3206</p>
      <a href="mailto:rc.cbeunity@gmail.com">rc.cbeunity@gmail.com</a>
      <p class="copy">&copy; Rotaract Club of Coimbatore Unity. All Rights Reserved.</p>
    </div>
  </div>
  <div class="unsub">
    You are receiving this because you are a member of Rotaract Club of Coimbatore Unity.
  </div>
</div>
</body>
</html>`;
    }

    // ============================================================
    // EMAIL TEMPLATE BUILDERS
    // ============================================================

    // --- EVENT APPROVAL ---
    async function buildEventApprovalHtml(ev) {
        if (!ev) return null;

        const avenues = {
            club_service: 'Club Service',
            community_service: 'Community Service',
            professional_service: 'Professional Service',
            international_service: 'International Service',
            district_priority_projects: 'District Priority Projects'
        };

        const avenueName = avenues[ev.avenue] || ev.avenue || '';
        const isDPP = ev.avenue === 'district_priority_projects';
        const badgeColors = {
            club_service: 'badge-blue',
            community_service: 'badge-green',
            professional_service: 'badge-yellow',
            international_service: 'badge-blue',
            district_priority_projects: 'badge-red'
        };

        const content = `
            <div class="info-box success">
                <h3 style="color:#059669;margin-bottom:4px;">New Event Announced!</h3>
                <p style="color:#065f46;margin:0;">A new event has been approved and is coming up soon!</p>
            </div>
            <h2>${esc(ev.title || '')}</h2>
            <span class="badge ${badgeColors[ev.avenue] || 'badge-blue'}">${esc(avenueName)}</span>
            ${isDPP && ev.dpp_project_number ? `<span class="badge badge-red" style="margin-left:6px;">DPP #${esc(ev.dpp_project_number)}</span>` : ''}
            <table class="dtable" style="margin-top:14px;">
                ${ev.event_date ? `<tr><td class="lbl">Date</td><td class="val">${esc(fDate(ev.event_date))}</td></tr>` : ''}
                ${ev.event_time ? `<tr><td class="lbl">Time</td><td class="val">${esc(fTime(ev.event_time))}${ev.end_time ? ' - ' + esc(fTime(ev.end_time)) : ''}</td></tr>` : ''}
                ${ev.venue ? `<tr><td class="lbl">Venue</td><td class="val">${esc(ev.venue)}</td></tr>` : ''}
                ${ev.event_chair ? `<tr><td class="lbl">Event Chair</td><td class="val">${esc(ev.event_chair)}</td></tr>` : ''}
                ${ev.event_secretary ? `<tr><td class="lbl">Event Secretary</td><td class="val">${esc(ev.event_secretary)}</td></tr>` : ''}
                ${ev.group_number ? `<tr><td class="lbl">Group</td><td class="val">Group ${esc(ev.group_number)}</td></tr>` : ''}
                ${ev.collaboration_type && ev.collaboration_type !== 'none' ? `<tr><td class="lbl">Collaboration</td><td class="val">${esc(ev.collaboration_type)}${ev.collaborator_name ? ' - ' + esc(ev.collaborator_name) : ''}</td></tr>` : ''}
                ${isDPP && ev.dpp_pillar ? `<tr><td class="lbl">DPP Pillar</td><td class="val">${esc(ev.dpp_pillar)}</td></tr>` : ''}
                ${isDPP && ev.dpp_category ? `<tr><td class="lbl">DPP Category</td><td class="val">${esc(ev.dpp_category)}</td></tr>` : ''}
            </table>
            ${ev.description ? `<div class="info-box primary"><p style="margin:0;color:#1e40af;">${esc(ev.description).replace(/\n/g, '<br>')}</p></div>` : ''}
            ${ev.poster_url ? `<div style="text-align:center;margin:16px 0;"><img src="${esc(ev.poster_url)}" alt="Event Poster" style="max-width:100%;border-radius:10px;border:1px solid #e2e8f0;"></div>` : ''}
            <hr class="div">
            <p style="text-align:center;">Mark your calendars and join us!</p>
            <p style="text-align:center;"><strong class="highlight">Service Above Self</strong></p>
        `;

        return {
            subject: `[Unity Event] ${ev.title} - ${fDate(ev.event_date)}`,
            html: emailBase(content, `New event: ${ev.title}`),
            isBoard: false
        };
    }

    // --- MEETING INVITE ---
    async function buildMeetingInviteHtml(meeting) {
        if (!meeting) return null;

        const isBoard = meeting.meeting_type === 'board';
        const typeLabel = isBoard ? 'Board Members Meeting' : 'General Body Meeting';

        // Use local attendance page - works on localhost AND production
        const attendanceUrl = `${window.location.origin}/attendance.html?meeting=${meeting.id}`;

        const agendaHtml = meeting.agenda && meeting.agenda.length > 0
            ? `<div style="margin:14px 0;">
                <h3>Meeting Agenda</h3>
                <ul style="margin-top:8px;">
                    ${meeting.agenda.map(item => `<li>${esc(item)}</li>`).join('')}
                </ul>
               </div>`
            : '';

        const content = `
            <div class="info-box primary">
                <h3 style="color:#1e40af;margin-bottom:4px;">Meeting Invitation</h3>
                <p style="color:#1e40af;margin:0;">You are invited to attend the following meeting.</p>
            </div>
            <h2>${esc(meeting.title || '')}</h2>
            <span class="badge badge-blue">${esc(typeLabel)}</span>
            <table class="dtable" style="margin-top:14px;">
                <tr><td class="lbl">Date</td><td class="val">${esc(fDate(meeting.meeting_date))}</td></tr>
                <tr><td class="lbl">Start Time</td><td class="val"><strong>${esc(fTime(meeting.start_time))}</strong></td></tr>
                ${meeting.end_time ? `<tr><td class="lbl">End Time</td><td class="val">${esc(fTime(meeting.end_time))}</td></tr>` : ''}
                <tr><td class="lbl">Venue</td><td class="val">${esc(meeting.venue || 'To be announced')}</td></tr>
                ${meeting.minutes_prepared_by ? `<tr><td class="lbl">Minutes By</td><td class="val">${esc(meeting.minutes_prepared_by)}</td></tr>` : ''}
                ${meeting.sergeant_at_arms ? `<tr><td class="lbl">Sergeant at Arms</td><td class="val">${esc(meeting.sergeant_at_arms)}</td></tr>` : ''}
            </table>
            ${agendaHtml}
            ${meeting.poster_url ? `<div style="text-align:center;margin:16px 0;"><img src="${esc(meeting.poster_url)}" alt="Meeting Poster" style="max-width:100%;border-radius:10px;border:1px solid #e2e8f0;"></div>` : ''}
            <hr class="div">
            <div style="text-align:center;padding:18px;background:#f0f4ff;border-radius:12px;margin:14px 0;">
                <p style="margin-bottom:12px;font-size:13px;color:#374151;">
                    Please mark your attendance at the start of the meeting.
                </p>
                <a href="${esc(attendanceUrl)}" class="btn">Mark My Attendance</a>
            </div>
            <p style="font-size:11px;color:#9ca3af;text-align:center;">
                Attendance form collects: Name, Designation, RI ID, In-Time, and Signature.
            </p>
        `;

        return {
            subject: `[Unity Meeting] ${meeting.title} - ${fDate(meeting.meeting_date)}`,
            html: emailBase(content, `Meeting: ${meeting.title}`),
            isBoard
        };
    }

    // --- MEETING ATTENDANCE FORM LINK ---
    async function buildAttendanceFormHtml(meeting) {
        if (!meeting) return null;

        const isBoard = meeting.meeting_type === 'board';

        // Use local attendance page
        const attendanceUrl = `${window.location.origin}/attendance.html?meeting=${meeting.id}`;

        const content = `
            <div class="info-box warning">
                <h3 style="color:#d97706;margin-bottom:4px;">Meeting Starting Now!</h3>
                <p style="color:#92400e;margin:0;">${esc(meeting.title)} is starting. Please mark your attendance!</p>
            </div>
            <h2>${esc(meeting.title || '')}</h2>
            <table class="dtable">
                <tr><td class="lbl">Date</td><td class="val">${esc(fDate(meeting.meeting_date))}</td></tr>
                <tr><td class="lbl">Start Time</td><td class="val"><strong>${esc(fTime(meeting.start_time))}</strong></td></tr>
                ${meeting.venue ? `<tr><td class="lbl">Venue</td><td class="val">${esc(meeting.venue)}</td></tr>` : ''}
            </table>
            <div style="text-align:center;padding:22px;background:#f0f4ff;border-radius:12px;margin:16px 0;">
                <p style="font-size:13px;color:#374151;margin-bottom:14px;">
                    Click the button below to mark your attendance now.
                </p>
                <a href="${esc(attendanceUrl)}" class="btn">Mark My Attendance</a>
            </div>
            <p style="font-size:11px;color:#9ca3af;text-align:center;">
                Please mark attendance as soon as the meeting begins.
            </p>
        `;

        return {
            subject: `[Unity Attendance] ${meeting.title} - Mark Now`,
            html: emailBase(content, 'Meeting starting now! Mark your attendance.'),
            isBoard
        };
    }

    // --- MEETING MINUTES ---
    async function buildMeetingMinutesHtml(meeting, attendanceCount) {
        if (!meeting) return null;

        const isBoard = meeting.meeting_type === 'board';

        let duration = '';
        if (meeting.start_time && meeting.actual_end_time) {
            const [sh, sm] = meeting.start_time.split(':').map(Number);
            const [eh, em] = meeting.actual_end_time.split(':').map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            if (mins > 0) duration = `${mins} minutes`;
        }

        const minutesHtml = meeting.minutes_content && meeting.minutes_content.length > 0
            ? `<div style="margin:14px 0;">
                <h3>Meeting Minutes</h3>
                <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;">
                    <thead>
                        <tr style="background:#1a56db;">
                            <th style="padding:8px 10px;text-align:left;color:#fff;width:15%;">Time</th>
                            <th style="padding:8px 10px;text-align:left;color:#fff;">Heading &amp; Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${meeting.minutes_content.map((row, i) => `
                            <tr style="background:${i % 2 === 0 ? '#f8faff' : '#ffffff'};">
                                <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#6b7280;vertical-align:top;">
                                    ${row.time ? esc(fTime(row.time)) : ''}
                                </td>
                                <td style="padding:8px 10px;border:1px solid #e2e8f0;vertical-align:top;">
                                    <strong>${esc(row.heading || '')}</strong>
                                    ${row.details ? `<br><span style="color:#6b7280;font-size:11px;">${esc(row.details).replace(/\n/g, '<br>')}</span>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${duration ? `<p style="margin-top:10px;font-weight:700;font-size:12px;color:#1a1a2e;">Duration of the Meeting: ${esc(duration)}</p>` : ''}
               </div>`
            : '';

        const content = `
            <div class="info-box success">
                <h3 style="color:#059669;margin-bottom:4px;">Meeting Minutes Published</h3>
                <p style="color:#065f46;margin:0;">The official minutes of our recent meeting are now available.</p>
            </div>
            <h2>${esc(meeting.title || '')}</h2>
            <table class="dtable">
                <tr><td class="lbl">Date</td><td class="val">${esc(fDate(meeting.meeting_date))}</td></tr>
                <tr><td class="lbl">Time</td><td class="val">${esc(fTime(meeting.start_time))}</td></tr>
                ${meeting.venue ? `<tr><td class="lbl">Venue</td><td class="val">${esc(meeting.venue)}</td></tr>` : ''}
                ${duration ? `<tr><td class="lbl">Duration</td><td class="val">${esc(duration)}</td></tr>` : ''}
                <tr><td class="lbl">Attendance</td><td class="val"><strong>${attendanceCount || 0} members</strong></td></tr>
            </table>
            ${minutesHtml}
            <hr class="div">
            <p style="font-size:12px;color:#9ca3af;">
                Please review the minutes and report any corrections to the Secretary Administration.
            </p>
        `;

        return {
            subject: `[Unity Minutes] ${meeting.title} - ${fDate(meeting.meeting_date)}`,
            html: emailBase(content, `Meeting minutes: ${meeting.title}`),
            isBoard
        };
    }

    // --- REPORT APPROVED ---
    async function buildReportApprovedHtml(ev, report) {
        if (!ev) return null;

        const avenues = {
            club_service: 'Club Service',
            community_service: 'Community Service',
            professional_service: 'Professional Service',
            international_service: 'International Service',
            district_priority_projects: 'District Priority Projects'
        };
        const avenueName = avenues[ev.avenue] || ev.avenue || '';

        const content = `
            <div class="info-box success">
                <h3 style="color:#059669;margin-bottom:4px;">Event Report Available</h3>
                <p style="color:#065f46;margin:0;">The report for a recently completed event has been published.</p>
            </div>
            <h2>${esc(ev.title || '')}</h2>
            <span class="badge badge-green">${esc(avenueName)}</span>
            <table class="dtable" style="margin-top:14px;">
                <tr><td class="lbl">Date</td><td class="val">${esc(fDate(ev.event_date))}</td></tr>
                ${ev.venue ? `<tr><td class="lbl">Venue</td><td class="val">${esc(ev.venue)}</td></tr>` : ''}
                ${ev.event_chair ? `<tr><td class="lbl">Event Chair</td><td class="val">${esc(ev.event_chair)}</td></tr>` : ''}
                ${report && report.attendance_count ? `<tr><td class="lbl">Attendance</td><td class="val"><strong>${esc(String(report.attendance_count))} members</strong></td></tr>` : ''}
                ${report && report.beneficiaries_count ? `<tr><td class="lbl">Beneficiaries</td><td class="val"><strong>${esc(String(report.beneficiaries_count))}</strong></td></tr>` : ''}
            </table>
            ${report && report.report_text ? `
            <div class="info-box">
                <h3 style="margin-bottom:6px;">Report Summary</h3>
                <p style="margin:0;color:#374151;">${esc(report.report_text.substring(0, 400)).replace(/\n/g, '<br>')}${report.report_text.length > 400 ? '...' : ''}</p>
            </div>` : ''}
            <hr class="div">
            <p style="text-align:center;">Thank you to everyone who participated!</p>
            <p style="text-align:center;"><strong class="highlight">Service Above Self</strong></p>
        `;

        return {
            subject: `[Unity Report] ${ev.title} - Event Report`,
            html: emailBase(content, `Event report: ${ev.title}`),
            isBoard: false
        };
    }

    // --- BIRTHDAY WISH ---
    function buildBirthdayHtml(member) {
        if (!member || !member.email) return null;

        const content = `
            <div style="text-align:center;padding:20px 0;">
                <div style="font-size:56px;margin-bottom:12px;">&#127874;</div>
                <h2 style="font-size:24px;color:#1a56db;margin-bottom:4px;">Happy Birthday!</h2>
                <h3 style="font-size:20px;color:#1a1a2e;margin-bottom:0;">${esc(member.name || '')}</h3>
            </div>
            <div class="info-box primary" style="margin-top:16px;">
                <p style="color:#1e40af;line-height:1.8;margin:0;">
                    On behalf of the entire family of
                    <strong>Rotaract Club of Coimbatore Unity</strong>,
                    we extend our warmest birthday wishes to you on this special day!
                    May this year be filled with joy, success, and all the wonderful things
                    that make life beautiful.
                </p>
            </div>
            <div class="info-box" style="margin-top:12px;text-align:center;">
                <p style="line-height:1.8;margin:0;">
                    Thank you for being a valued member of our club and for your dedication to
                    <strong class="highlight">Service Above Self</strong>.
                    May this year bring you continued success in all your endeavors!
                </p>
            </div>
            <div style="text-align:center;font-size:22px;letter-spacing:8px;margin:16px 0;">
                &#127881;&#127880;&#129395;&#127881;&#127880;
            </div>
            <div style="text-align:center;padding:16px;background:#f0f4ff;border-radius:12px;margin-top:14px;">
                <p style="font-weight:700;color:#1a56db;font-size:15px;margin:0;">
                    With warm wishes from the Unity Family!
                </p>
            </div>
        `;

        return {
            subject: `Happy Birthday, ${member.name}! - Rotaract Club of Coimbatore Unity`,
            html: emailBase(content, 'Wishing you a very happy birthday!'),
            recipientEmail: member.email
        };
    }

    // --- MONTHLY TREASURY ---
    async function buildTreasuryStatementHtml(transactions, summary, monthLabel) {
        const txRows = transactions.slice(0, 25).map((t, i) => `
            <tr style="background:${i % 2 === 0 ? '#f8faff' : '#ffffff'};">
                <td style="padding:7px 8px;border:1px solid #e2e8f0;font-size:11px;">${i + 1}</td>
                <td style="padding:7px 8px;border:1px solid #e2e8f0;font-size:11px;">${esc(t.date || '')}</td>
                <td style="padding:7px 8px;border:1px solid #e2e8f0;font-size:11px;">${esc(t.particular || '')}</td>
                <td style="padding:7px 8px;border:1px solid #e2e8f0;font-size:11px;text-align:right;color:${t.transaction_type === 'income' ? '#10b981' : ''};">
                    ${t.transaction_type === 'income' ? '&#8377;' + fAmount(t.amount) : ''}
                </td>
                <td style="padding:7px 8px;border:1px solid #e2e8f0;font-size:11px;text-align:right;color:${t.transaction_type === 'expense' ? '#ef4444' : ''};">
                    ${t.transaction_type === 'expense' ? '&#8377;' + fAmount(t.amount) : ''}
                </td>
            </tr>
        `).join('');

        const moreNote = transactions.length > 25
            ? `<p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:8px;">Showing first 25 of ${transactions.length} transactions.</p>`
            : '';

        const balColor = summary.netBalance >= 0 ? '#1a56db' : '#ef4444';

        const content = `
            <div class="info-box primary">
                <h3 style="color:#1e40af;margin-bottom:4px;">Monthly Treasury Statement</h3>
                <p style="color:#1e40af;margin:0;">${esc(monthLabel)}</p>
            </div>
            <div style="display:flex;gap:10px;margin:14px 0;flex-wrap:wrap;">
                <div style="flex:1;min-width:120px;padding:14px;background:#d1fae5;border-radius:12px;text-align:center;">
                    <div style="font-size:9px;color:#059669;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Income</div>
                    <div style="font-size:18px;font-weight:800;color:#10b981;">&#8377;${fAmount(summary.totalIncome)}</div>
                    <div style="font-size:10px;color:#6b7280;">${summary.incomeCount} entries</div>
                </div>
                <div style="flex:1;min-width:120px;padding:14px;background:#fee2e2;border-radius:12px;text-align:center;">
                    <div style="font-size:9px;color:#dc2626;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Expense</div>
                    <div style="font-size:18px;font-weight:800;color:#ef4444;">&#8377;${fAmount(summary.totalExpense)}</div>
                    <div style="font-size:10px;color:#6b7280;">${summary.expenseCount} entries</div>
                </div>
                <div style="flex:1;min-width:120px;padding:14px;background:#dbeafe;border-radius:12px;text-align:center;">
                    <div style="font-size:9px;color:#1d4ed8;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Balance</div>
                    <div style="font-size:18px;font-weight:800;color:${balColor};">&#8377;${fAmount(summary.netBalance)}</div>
                    <div style="font-size:10px;color:#6b7280;">${summary.netBalance >= 0 ? 'Surplus' : 'Deficit'}</div>
                </div>
            </div>
            <h3 style="margin-bottom:10px;">Transaction Details</h3>
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead>
                    <tr style="background:#1a56db;">
                        <th style="padding:8px;color:#fff;text-align:left;">#</th>
                        <th style="padding:8px;color:#fff;text-align:left;">Date</th>
                        <th style="padding:8px;color:#fff;text-align:left;">Particular</th>
                        <th style="padding:8px;color:#fff;text-align:right;">Income</th>
                        <th style="padding:8px;color:#fff;text-align:right;">Expense</th>
                    </tr>
                </thead>
                <tbody>
                    ${txRows}
                    <tr style="background:#f0f4ff;font-weight:800;">
                        <td colspan="3" style="padding:8px;border:1px solid #e2e8f0;text-align:right;">TOTAL</td>
                        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;color:#10b981;">&#8377;${fAmount(summary.totalIncome)}</td>
                        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;color:#ef4444;">&#8377;${fAmount(summary.totalExpense)}</td>
                    </tr>
                </tbody>
            </table>
            ${moreNote}
            <div class="info-box" style="margin-top:14px;">
                <p style="margin:0;font-size:12px;">
                    Monthly treasury statement for <strong>${esc(monthLabel)}</strong>.
                    Total: <strong>${summary.transactionCount} transactions</strong>.
                    Net balance: <strong style="color:${balColor};">&#8377;${fAmount(summary.netBalance)} (${summary.netBalance >= 0 ? 'Surplus' : 'Deficit'})</strong>.
                    For queries, contact the Treasurer.
                </p>
            </div>
        `;

        return {
            subject: `[Unity Treasury] Monthly Statement - ${monthLabel}`,
            html: emailBase(content, `Treasury statement for ${monthLabel}`)
        };
    }

    // --- APPLICATION CONFIRMATION ---
    function buildApplicationConfirmHtml(app) {
        if (!app || !app.email) return null;

        const content = `
            <div class="info-box success">
                <h3 style="color:#059669;margin-bottom:4px;">Application Received!</h3>
                <p style="color:#065f46;margin:0;">Your membership application has been successfully submitted.</p>
            </div>
            <h2>Thank you, ${esc(app.name || '')}!</h2>
            <p>
                We have received your membership application for
                <strong>Rotaract Club of Coimbatore Unity</strong>.
                Our membership committee will review your application and contact you within
                <strong>5 to 7 working days</strong>.
            </p>
            <table class="dtable">
                <tr><td class="lbl">Name</td><td class="val">${esc(app.name || '')}</td></tr>
                <tr><td class="lbl">Email</td><td class="val">${esc(app.email || '')}</td></tr>
                <tr><td class="lbl">Phone</td><td class="val">${esc(app.phone || '')}</td></tr>
                ${app.blood_group ? `<tr><td class="lbl">Blood Group</td><td class="val">${esc(app.blood_group)}</td></tr>` : ''}
                <tr><td class="lbl">Status</td><td class="val"><span class="badge badge-yellow">Pending Review</span></td></tr>
            </table>
            <div class="info-box">
                <h3 style="margin-bottom:8px;">What happens next?</h3>
                <ul>
                    <li>Our Membership Chair will review your application</li>
                    <li>You may be invited for an interview or induction</li>
                    <li>You will receive an email with the next steps</li>
                    <li>For queries: <a href="mailto:rc.cbeunity@gmail.com">rc.cbeunity@gmail.com</a></li>
                </ul>
            </div>
            <hr class="div">
            <p style="text-align:center;">We look forward to welcoming you to our family!</p>
            <p style="text-align:center;"><strong class="highlight">Service Above Self</strong></p>
        `;

        return {
            subject: 'Application Received - Rotaract Club of Coimbatore Unity',
            html: emailBase(content, 'Your membership application has been received.'),
            recipientEmail: app.email
        };
    }

    // ============================================================
    // ADMIN MAIL MODULE
    // ============================================================
    const AdminMail = {

        // Send event approval
        async sendEventApproval(eventId) {
            try {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${eventId}&select=*`, { headers: DB_HEADERS });
                if (!res.ok) return false;
                const data = await res.json();
                const ev = data[0];
                if (!ev) return false;
                const emailData = await buildEventApprovalHtml(ev);
                if (!emailData) return false;
                return await sendToGroup(emailData.subject, emailData.html, 'event_approval');
            } catch (e) {
                console.error('[AdminMail] sendEventApproval:', e.message);
                return false;
            }
        },

        // Send meeting invite
        async sendMeetingInvite(meeting) {
            try {
                let meetingData = meeting;
                if (typeof meeting === 'string') {
                    const res = await fetch(`${SUPABASE_URL}/rest/v1/meetings?id=eq.${meeting}&select=*`, { headers: DB_HEADERS });
                    if (!res.ok) return false;
                    const data = await res.json();
                    meetingData = data[0];
                }
                if (!meetingData) return false;
                const emailData = await buildMeetingInviteHtml(meetingData);
                if (!emailData) return false;
                const sendFn = emailData.isBoard ? sendToBoard : sendToGroup;
                return await sendFn(emailData.subject, emailData.html, 'meeting_invite');
            } catch (e) {
                console.error('[AdminMail] sendMeetingInvite:', e.message);
                return false;
            }
        },

        // Send meeting minutes
        async sendMeetingMinutes(meetingId) {
            try {
                const [meetRes, attRes] = await Promise.all([
                    fetch(`${SUPABASE_URL}/rest/v1/meetings?id=eq.${meetingId}&select=*`, { headers: DB_HEADERS }),
                    fetch(`${SUPABASE_URL}/rest/v1/meeting_attendance?meeting_id=eq.${meetingId}&select=id`, { headers: DB_HEADERS })
                ]);
                if (!meetRes.ok) return false;
                const meetData = await meetRes.json();
                const meeting = meetData[0];
                if (!meeting) return false;
                const attData = attRes.ok ? await attRes.json() : [];
                const emailData = await buildMeetingMinutesHtml(meeting, attData.length);
                if (!emailData) return false;
                const sendFn = emailData.isBoard ? sendToBoard : sendToGroup;
                return await sendFn(emailData.subject, emailData.html, 'meeting_minutes');
            } catch (e) {
                console.error('[AdminMail] sendMeetingMinutes:', e.message);
                return false;
            }
        },

        // Send attendance form link
        async sendAttendanceForm(meetingId) {
            try {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/meetings?id=eq.${meetingId}&select=*`, { headers: DB_HEADERS });
                if (!res.ok) return false;
                const data = await res.json();
                const meeting = data[0];
                if (!meeting) return false;
                const emailData = await buildAttendanceFormHtml(meeting);
                if (!emailData) return false;
                const sendFn = emailData.isBoard ? sendToBoard : sendToGroup;
                return await sendFn(emailData.subject, emailData.html, 'meeting_attendance');
            } catch (e) {
                console.error('[AdminMail] sendAttendanceForm:', e.message);
                return false;
            }
        },

        // Send report approved
        async sendReportApproved(eventId) {
            try {
                const [evRes, repRes] = await Promise.all([
                    fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${eventId}&select=*`, { headers: DB_HEADERS }),
                    fetch(`${SUPABASE_URL}/rest/v1/project_reports?project_id=eq.${eventId}&select=*`, { headers: DB_HEADERS })
                ]);
                if (!evRes.ok) return false;
                const evData = await evRes.json();
                const ev = evData[0];
                if (!ev) return false;
                const repData = repRes.ok ? await repRes.json() : [];
                const report = repData[0];
                const emailData = await buildReportApprovedHtml(ev, report);
                if (!emailData) return false;
                return await sendToGroup(emailData.subject, emailData.html, 'report_approved');
            } catch (e) {
                console.error('[AdminMail] sendReportApproved:', e.message);
                return false;
            }
        },

        // Send birthday wishes - WITH DUPLICATE PREVENTION
        async checkAndSendBirthdays() {
            try {
                const today = new Date();
                const todayMonth = today.getMonth() + 1;
                const todayDay = today.getDate();
                const todayDate = todayStr();

                // Layer 1: localStorage check (fastest - prevents on same device)
                const localKey = 'unity_birthday_sent_' + todayDate;
                if (localStorage.getItem(localKey)) {
                    console.log('[AdminMail] Birthdays already sent today (localStorage) - skipping');
                    return 0;
                }

                // Layer 2: Check database for any birthday wish sent today
                try {
                    const logCheck = await fetch(
                        `${SUPABASE_URL}/rest/v1/email_logs?select=id&email_type=eq.birthday_wish&status=eq.sent&sent_at=gte.${todayDate}T00:00:00.000Z&sent_at=lte.${todayDate}T23:59:59.999Z&limit=1`,
                        { headers: DB_HEADERS }
                    );
                    if (logCheck.ok) {
                        const logs = await logCheck.json();
                        if (logs && logs.length > 0) {
                            console.log('[AdminMail] Birthdays already sent today (database) - skipping');
                            localStorage.setItem(localKey, '1');
                            return 0;
                        }
                    }
                } catch (e) {
                    // Non-critical - continue
                }

                // Fetch all active members with birthdays
                const res = await fetch(
                    `${SUPABASE_URL}/rest/v1/members?select=*&is_active=eq.true&date_of_birth=not.is.null`,
                    { headers: DB_HEADERS }
                );
                if (!res.ok) return 0;
                const members = await res.json();

                let sent = 0;

                for (const member of members) {
                    try {
                        if (!member.date_of_birth || !member.email) continue;

                        const dob = new Date(member.date_of_birth);
                        if (dob.getMonth() + 1 !== todayMonth || dob.getDate() !== todayDay) continue;

                        // Layer 3: Per-member database check
                        const memberAlreadySent = await alreadySentToday('birthday_wish', member.email);
                        if (memberAlreadySent) {
                            console.log(`[AdminMail] Already sent to ${member.name} today - skipping`);
                            continue;
                        }

                        const emailData = buildBirthdayHtml(member);
                        if (!emailData) continue;

                        const ok = await sendEmail(
                            emailData.recipientEmail,
                            emailData.subject,
                            emailData.html,
                            'birthday_wish'
                        );

                        if (ok) {
                            sent++;
                            console.log(`[AdminMail] Birthday wish sent to ${member.name}`);
                        }

                        // Rate limiting - 1.5s between emails
                        await new Promise(r => setTimeout(r, 1500));

                    } catch (e) {
                        console.warn('[AdminMail] Birthday wish failed for:', member.name, e.message);
                    }
                }

                // Mark as done for today in localStorage
                localStorage.setItem(localKey, '1');

                console.log(`[AdminMail] Birthday wishes complete: ${sent} sent`);
                return sent;

            } catch (e) {
                console.error('[AdminMail] checkAndSendBirthdays:', e.message);
                return 0;
            }
        },

        // Send monthly treasury statement
        async sendMonthlyTreasuryStatement() {
            try {
                const now = new Date();
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                const fromDate = lastMonth.toISOString().split('T')[0];
                const toDate = lastMonthEnd.toISOString().split('T')[0];
                const monthLabel = lastMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

                // Check if already sent this month
                const monthKey = 'unity_treasury_sent_' + fromDate.substring(0, 7);
                if (localStorage.getItem(monthKey)) {
                    console.log('[AdminMail] Treasury statement already sent this month');
                    return false;
                }

                const res = await fetch(
                    `${SUPABASE_URL}/rest/v1/treasury_transactions?is_approved=eq.true&date=gte.${fromDate}&date=lte.${toDate}&order=date.asc,created_at.asc&select=*`,
                    { headers: DB_HEADERS }
                );
                if (!res.ok) return false;
                const transactions = await res.json();
                if (!transactions || !transactions.length) return false;

                let totalIncome = 0, totalExpense = 0, incomeCount = 0, expenseCount = 0;
                transactions.forEach(t => {
                    const amt = parseFloat(t.amount) || 0;
                    if (t.transaction_type === 'income') { totalIncome += amt; incomeCount++; }
                    else { totalExpense += amt; expenseCount++; }
                });

                const summary = {
                    totalIncome, totalExpense,
                    netBalance: totalIncome - totalExpense,
                    transactionCount: transactions.length,
                    incomeCount, expenseCount
                };

                const emailData = await buildTreasuryStatementHtml(transactions, summary, monthLabel);
                if (!emailData) return false;

                const ok = await sendToGroup(emailData.subject, emailData.html, 'monthly_treasury');
                if (ok) {
                    localStorage.setItem(monthKey, '1');
                }
                return ok;
            } catch (e) {
                console.error('[AdminMail] sendMonthlyTreasuryStatement:', e.message);
                return false;
            }
        },

        // Send application confirmation
        async sendApplicationConfirmation(applicationId) {
            try {
                const res = await fetch(
                    `${SUPABASE_URL}/rest/v1/membership_applications?id=eq.${applicationId}&select=*`,
                    { headers: DB_HEADERS }
                );
                if (!res.ok) return false;
                const data = await res.json();
                const app = data[0];
                if (!app || !app.email) return false;
                const emailData = buildApplicationConfirmHtml(app);
                if (!emailData) return false;
                return await sendEmail(
                    emailData.recipientEmail,
                    emailData.subject,
                    emailData.html,
                    'application_confirmation'
                );
            } catch (e) {
                console.error('[AdminMail] sendApplicationConfirmation:', e.message);
                return false;
            }
        },

        // Send custom email
        async sendCustomEmail(to, subject, messageHtml, isBoard) {
            try {
                const content = `<h2>${esc(subject)}</h2><div style="font-size:13.5px;color:#374151;line-height:1.75;">${messageHtml}</div>`;
                const html = emailBase(content, subject);
                if (isBoard) return await sendToBoard(subject, html, 'custom');
                return await sendToGroup(subject, html, 'custom');
            } catch (e) {
                console.error('[AdminMail] sendCustomEmail:', e.message);
                return false;
            }
        }
    };

    // ============================================================
    // SCHEDULE MEETING ATTENDANCE FORM
    // ============================================================
    async function scheduleMeetingAttendance() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/meetings?meeting_date=eq.${today}&status=eq.scheduled&select=*`,
                { headers: DB_HEADERS }
            );
            if (!res.ok) return;
            const meetings = await res.json();
            if (!meetings || !meetings.length) return;

            const now = new Date();

            meetings.forEach(meeting => {
                try {
                    if (!meeting.start_time) return;
                    const [h, m] = meeting.start_time.split(':').map(Number);
                    const meetingTime = new Date();
                    meetingTime.setHours(h, m, 0, 0);
                    const msUntil = meetingTime.getTime() - now.getTime();

                    // Schedule if meeting starts within next 2 hours
                    if (msUntil > 0 && msUntil < 2 * 60 * 60 * 1000) {
                        const scheduledKey = 'unity_att_scheduled_' + meeting.id + '_' + todayStr();
                        if (localStorage.getItem(scheduledKey)) return;

                        console.log(`[UnityMail] Scheduling attendance form for "${meeting.title}" in ${Math.round(msUntil / 60000)} minutes`);

                        setTimeout(async () => {
                            const ok = await AdminMail.sendAttendanceForm(meeting.id);
                            if (ok) {
                                localStorage.setItem(scheduledKey, '1');
                                console.log(`[UnityMail] Attendance form sent for: ${meeting.title}`);
                            }
                        }, msUntil);
                    }
                } catch (e) {
                    console.warn('[UnityMail] Schedule error:', e.message);
                }
            });
        } catch (e) {
            console.error('[UnityMail] scheduleMeetingAttendance:', e.message);
        }
    }

    // ============================================================
    // CLEAN UP OLD LOCALSTORAGE FLAGS
    // ============================================================
    function cleanOldFlags() {
        try {
            const today = todayStr();
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                // Remove birthday flags older than today
                if (key.startsWith('unity_birthday_sent_') && !key.includes(today)) {
                    keysToRemove.push(key);
                }
                // Remove attendance scheduled flags older than today
                if (key.startsWith('unity_att_scheduled_') && !key.includes(today)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            if (keysToRemove.length > 0) {
                console.log(`[UnityMail] Cleaned ${keysToRemove.length} old flags`);
            }
        } catch (e) {
            // Non-critical
        }
    }

    // ============================================================
    // INITIALIZE
    // ============================================================
    function init() {
        // Clean old localStorage flags
        cleanOldFlags();

        // Initialize EmailJS
        if (window.emailjs) {
            initEmailJS();
        } else {
            const checkInterval = setInterval(() => {
                if (window.emailjs) {
                    clearInterval(checkInterval);
                    initEmailJS();
                }
            }, 500);
            setTimeout(() => clearInterval(checkInterval), 10000);
        }

        // Admin panel only features
        if (document.getElementById('admin-panel')) {
            const today = todayStr();
            const birthdayKey = 'unity_birthday_sent_' + today;

            // Birthday wishes - ONCE per day, checked via localStorage first
            if (!localStorage.getItem(birthdayKey)) {
                setTimeout(() => {
                    AdminMail.checkAndSendBirthdays().then(count => {
                        if (count > 0) {
                            console.log(`[UnityMail] Birthday wishes sent to ${count} member(s)`);
                        }
                    });
                }, 5000); // Wait 5 seconds after page load
            } else {
                console.log('[UnityMail] Birthday wishes already handled today');
            }

            // Schedule meeting attendance forms
            setTimeout(() => {
                scheduleMeetingAttendance();
            }, 7000);

            // Monthly treasury - only on 1st of month
            const todayDate = new Date();
            if (todayDate.getDate() === 1) {
                const treasuryKey = 'unity_treasury_sent_' + today.substring(0, 7);
                if (!localStorage.getItem(treasuryKey)) {
                    setTimeout(() => {
                        AdminMail.sendMonthlyTreasuryStatement().then(ok => {
                            if (ok) {
                                console.log('[UnityMail] Monthly treasury statement sent');
                            }
                        });
                    }, 10000);
                }
            }
        }
    }

    // ============================================================
    // EXPOSE GLOBALLY
    // ============================================================
    window.AdminMail = AdminMail;

    window.UnityMail = {
        init: initEmailJS,
        send: sendEmail,
        sendToGroup,
        sendToBoard,
        getSettings,
        logEmail,
        emailBase,
        AdminMail
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }

    console.log('%c [UnityMail] v4.0 loaded ', 'background:#1a56db;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

})();