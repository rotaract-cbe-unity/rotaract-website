/**
 * ================================================================
 * ROTARACT CLUB OF COIMBATORE UNITY
 * Email Automation System - Google Apps Script
 * File: Code.gs | Version: 4.4.0 | Defensive Build
 * Features: RID 3206 Compliant | High-Fidelity Responsive HTML
 *
 * WHAT'S NEW IN 4.4.0
 *  - EMAIL DESIGN: rebuilt shared template blocks (header, details card, tiles,
 *    call-out, button, signature, footer) in the strict navy palette with
 *    aligned two-column detail rows, Outlook-safe solid colour fallbacks
 *    (bgcolor + VML-free bulletproof buttons) and a mobile media query so
 *    cards and tiles stack neatly on phones.
 *  - Attendance / stats tiles no longer use purple / green / orange accents.
 *
 * WHAT'S NEW IN 4.3.0
 *  - SENDER IDENTITY: mails now carry the name of the person who triggered
 *    them in the portal and Reply-To is that person's email, so replies reach
 *    them. If that address is a "Send mail as" alias of this Gmail account the
 *    mail is sent FROM that address itself (Gmail setting: Accounts > Send mail
 *    as). Gmail cannot send from an address that is not an alias.
 *  - MINUTES MAIL: carries only the files the portal sends (the single combined
 *    meeting PDF); photos stay inline in the mail and are never attached.
 *  - testMailGroups() now reports whether each group came from the portal
 *    settings or from the fallback; testSenderIdentity() checks the sender setup.
 *
 * WHAT'S NEW IN 4.2.2
 *  - Group mail IDs are read from the portal (Settings > Email & Automation:
 *    mail_group_members / mail_group_board) so every default recipient, the
 *    automatic monthly treasury statement included, uses the addresses you
 *    entered in the portal. CONFIG values below are only the fallback.
 *    Needs the Script Property SUPABASE_SERVICE_KEY (already used by the
 *    treasury job); without it the fallback addresses are used.
 *
 * WHAT'S NEW IN 4.2.1
 *  - Every recipient now receives their OWN message addressed directly
 *    to them (no more club address in "To" with everyone else in BCC).
 *    The result reports who was sent and who failed, so one bad address
 *    never hides behind "success".
 *
 * WHAT'S NEW IN 4.2.0
 *  - Monthly treasury statement runs by itself on the 1st of every month
 *    (8:00 AM IST) for the month that just ended. It reads the `treasury`
 *    table from Supabase, builds an Excel ledger and emails it.
 *    Setup: run setupMonthlyTreasuryTrigger() once and add the Script
 *    Property SUPABASE_SERVICE_KEY (see the section near the bottom).
 *
 * WHAT'S NEW IN 4.1.0
 *  - `files` payload: PDFs generated in the portal (agenda, minutes,
 *    attendance sheet, project report) arrive as base64 and are attached.
 *  - Photos: report + minutes mails show an inline photo gallery and
 *    attach the photos (kept under Gmail's 25 MB limit).
 *  - Minutes mail lists the minutes entries; report mail can say
 *    'submitted' instead of 'approved' (report_status).
 *
 * WHAT'S NEW IN 4.0.0
 *  - Report-approved email now carries the attendance block
 *    (Council / Trainers with names + portfolios, Rotarians,
 *    Interactors). That data is captured in the project REPORT,
 *    not in the event form.
 *  - Pre-built HTML payloads from the portal (Email Hub, meeting
 *    invitation, attendance form: anything that sends `html_body`)
 *    are now delivered as-is instead of being rebuilt blank.
 *  - Type aliases: attendance_form, broadcast, test, template names.
 *  - Daily-quota check before sending.
 *  - HTML escaping of all user supplied values.
 *  - Calendar link fixed (valid time stamps + Asia/Kolkata).
 *  - Date / money formatting no longer depends on toLocaleString.
 *  - Optional shared secret (Script Property API_SECRET).
 *
 * Deploy: script.google.com -> Deploy -> Manage deployments ->
 *         (pencil) -> Version: New version -> Deploy.
 *         Web App | Execute as: Me | Who has access: Anyone
 * ================================================================
 */

// ================================================================
// CONFIGURATION CONSTANTS
// ================================================================
var CONFIG = {
  VERSION: '4.4.0',
  TIMEZONE: 'Asia/Kolkata',
  CLUB_NAME: 'Rotaract Club of Coimbatore Unity',
  PARENT_CLUB: 'Family of Rotary Club of Coimbatore East',
  CLUB_ID: '91594',
  CHARTER_DATE: '21.04.2014',
  DISTRICT: 'Rotary International District 3206',
  DISTRICT_REGION: 'Coimbatore | Palakkad',
  CLUB_EMAIL: 'rc.cbeunity@gmail.com',
  MEMBER_GROUP: 'rotaractunity@googlegroups.com',
  BOARD_GROUP: 'eternals26-27@googlegroups.com',
  COLOUR_LOGO: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png',
  WHITE_LOGO: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png',
  BLACK_LOGO: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_black_jwjihq.png',
  REPORT_LOGO_STRIP: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png',
  DPP_LOGO_STRIP: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1787012147/Unity_DPP_ColourAsset_9_2x-8_q0qi81.png',

  // Premium Navy Color Palette
  PRIMARY_COLOR: '#0A1F44',   // Deep Navy
  SECONDARY_COLOR: '#17458F', // Royal Navy
  ACCENT_COLOR: '#3B5B8C',    // Steel Blue
  DARK_COLOR: '#0F172A',      // Charcoal Black
  LIGHT_BG: '#F8FAFC',        // Off-White
  BORDER_COLOR: '#E2E8F0',    // Soft Grey
  ALERT_COLOR: '#B91C1C',     // Urgent / critical blood requests

  WEBSITE_URL: 'https://rc-cbeunity.vercel.app',
  INSTAGRAM: 'https://instagram.com/rotaractunity',
  FACEBOOK: 'https://facebook.com/rotaractunity',

  // Total attachment budget per email (Gmail hard limit is 25 MB)
  MAX_ATTACHMENT_BYTES: 22 * 1024 * 1024,
  MAX_PHOTOS_INLINE: 8,

  SUPABASE_BASE_URL: 'https://sbpwmkoxuokrscddhhuw.supabase.co'
};

/** Public (anon) key, kept only as a fallback so existing setups keep working. Prefer Script Properties. */
var SUPABASE_FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicHdta294dW9rcnNjZGRoaHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNTI1MDksImV4cCI6MjEwNjYyODUwOX0.s6-r3bywFii-ZcMowwjZnI1WtrpluJ5MQ1_UJJFcDQU';

/** Person who triggered the current web request (from payload.sender). Reset on every doPost. */
// ================================================================
// SITE SETTINGS MAIL SWITCHES (admin panel > Settings > Auto mail triggers)
// A switch set to OFF stops that kind of mail. If the setting cannot be read the mail is sent.
// ================================================================
var MAIL_SWITCH_BY_TYPE = {
  birthday_wish: 'auto_birthday_wishes',
  event_notification: 'auto_project_approval_mail',
  project_notification: 'auto_project_approval_mail',
  report_approved: 'auto_report_mail',
  event_approved: 'auto_project_approval_mail',
  project_approved: 'auto_project_approval_mail',
  meeting_invitation: 'auto_meeting_invite',
  meeting_attendance_form: 'auto_meeting_attendance',
  attendance_form: 'auto_meeting_attendance',
  meeting_minutes: 'auto_minutes_distribution',
  monthly_treasury_statement: 'auto_monthly_treasury',
  monthly_treasury: 'auto_monthly_treasury'
};

function isMailSwitchOn(settingKey) {
  if (!settingKey) return true;
  try {
    var rows = supabaseGetAll('system_settings', 'select=key,value&key=eq.' + encodeURIComponent(settingKey));
    if (!rows || !rows.length) return true;
    var v = String(rows[0].value).trim().toLowerCase();
    return ['false', '0', 'off', 'no', 'disabled'].indexOf(v) === -1;
  } catch (err) {
    console.warn('[GAS Mail] Could not read mail switch ' + settingKey + ', sending anyway:', err);
    return true;
  }
}

// ================================================================
// SIGN-OFF BY DOCUMENT TYPE
// The mail is signed by the officer who owns that kind of document, not by whoever pressed Send:
//   projects and reports -> the avenue's Avenue Director      treasury -> Treasurer
//   meeting invites, attendance forms, minutes -> Secretary    announcements -> whoever triggers them
// Names come from the portal users table; Site Settings > Officer Signature Block overrides the name.
// If nobody can be found the original sender is kept, so a signature is never blank.
// ================================================================
var DIRECTOR_TYPES = ['event_notification', 'project_notification', 'event_approved', 'project_approved', 'report_approved'];
var SECRETARY_TYPES = ['meeting_invitation', 'meeting_attendance_form', 'attendance_form', 'meeting_minutes'];
var TREASURY_TYPES = ['monthly_treasury_statement', 'monthly_treasury'];

function slugKey_(v) {
  return String(v || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function userAsSender_(u, nameOverride, portfolioOverride) {
  var port = String(u && u.portfolio || '').split(',')[0].trim();
  return {
    name: nameOverride || (u && (u.full_name || u.name)) || '',
    role: u && u.role || '',
    portfolio: portfolioOverride || port || '',
    email: u && u.email || '',
    phone: u && (u.phone || u.mobile) || '',
    photo_url: u && (u.photo_url || u.avatar_url || u.profile_photo) || ''
  };
}

function resolveSignatory(type, payload) {
  var fallback = (payload && payload.sender && typeof payload.sender === 'object') ? payload.sender : null;
  var wantDirector = DIRECTOR_TYPES.indexOf(type) !== -1;
  var wantSecretary = SECRETARY_TYPES.indexOf(type) !== -1;
  var wantTreasurer = TREASURY_TYPES.indexOf(type) !== -1;
  if (!wantDirector && !wantSecretary && !wantTreasurer) return fallback;
  try {
    var users = supabaseGetAll('users', 'select=*').filter(function (u) {
      return u && u.is_active !== false && String(u.full_name || u.name || '').trim();
    });
    var settings = {};
    supabaseGetAll('system_settings', 'select=key,value&key=like.officer_*').forEach(function (r) { settings[r.key] = String(r.value || '').trim(); });
    var byRole = function (r) { return users.filter(function (u) { return String(u.role) === r; })[0]; };

    if (wantTreasurer) {
      var t = byRole('treasurer');
      if (t || settings.officer_treasurer_name) return userAsSender_(t, settings.officer_treasurer_name, settings.officer_treasurer_portfolio || 'Treasurer');
    } else if (wantSecretary) {
      var sec = byRole('secretary_admin') || byRole('secretary') || byRole('secretary_comm');
      if (sec || settings.officer_sec_admin_name) {
        var useSettings = settings.officer_sec_admin_name && (!sec || String(sec.role) !== 'secretary_comm');
        return userAsSender_(sec, useSettings ? settings.officer_sec_admin_name : '', useSettings ? (settings.officer_sec_admin_portfolio || 'Secretary') : '');
      }
    } else if (wantDirector) {
      var ev = (payload && (payload.event || payload.project)) || {};
      var wanted = [ev.avenue_slug, ev.avenue, ev.avenue_name, payload && payload.avenue_slug, payload && payload.avenue]
        .map(slugKey_).filter(Boolean);
      if (ev.is_dpp || (payload && payload.is_dpp)) wanted = ['dpp'];   // DPP projects and reports are always signed by the DPP Chair
      if (wanted.indexOf('dpp') !== -1) {
        var chair = byRole('dpp_chair');
        if (chair) return userAsSender_(chair, '', 'District Priority Projects Chair');
        return fallback;   // never sign a DPP mail with an avenue director
      }
      var directors = users.filter(function (u) { return String(u.role) === 'avenue_director'; });
      var pick = directors.filter(function (u) {
        return wanted.indexOf(slugKey_(u.avenue)) !== -1 || wanted.indexOf(slugKey_(u.avenue_slug)) !== -1 ||
               (ev.avenue_id && String(u.avenue_id) === String(ev.avenue_id));
      })[0] || directors.filter(function (u) {
        var p = slugKey_(u.portfolio);
        return wanted.some(function (w) { return p.indexOf(w) !== -1 || w.indexOf(p) !== -1 && p; });
      })[0];
      if (pick) return userAsSender_(pick, '', '');
    }
  } catch (err) {
    console.warn('[GAS Mail] Signatory lookup failed for ' + type + ', keeping the sender:', err);
  }
  return fallback;
}

var CURRENT_SENDER = null;

// ================================================================
// WEB APP POST/GET ENTRY POINTS (DEFENSIVE BUILD)
// ================================================================
function doPost(e) {
  CURRENT_SENDER = null;
  try {
    // 1. Check if 'e' is passed (prevents crash if run from editor)
    if (!e) {
      console.warn("[doPost] 'e' is undefined. If you clicked 'Run' in the Script Editor, run 'testEmailService' instead.");
      return jsonOut({
        success: false,
        error: "No event object provided. Do not click Run on doPost directly from the editor; select and run testEmailService() instead."
      });
    }

    // 2. Check and parse payload safely
    var payload = null;
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        console.error('[doPost] Malformed JSON payload:', e.postData.contents);
        return jsonOut({ success: false, error: 'Malformed JSON payload: ' + jsonErr.toString() });
      }
    } else if (e.parameter && Object.keys(e.parameter).length > 0) {
      payload = e.parameter;
    }

    if (!payload) {
      return jsonOut({ success: false, error: 'No postData or parameters received in request.' });
    }

    CURRENT_SENDER = (payload.sender && typeof payload.sender === 'object') ? payload.sender : null;

    // 3. Optional shared secret (set Script Property API_SECRET to enable)
    var secret = PropertiesService.getScriptProperties().getProperty('API_SECRET');
    if (secret && String(payload.api_key || payload.secret || '') !== secret) {
      return jsonOut({ success: false, error: 'Unauthorized request.' });
    }

    var type = String(payload.type || '').trim();
    var result = {};

    console.log('[API POST] Received request of type:', type || '(none)');

    // 3b. Project and report announcements may only be sent by the approver roles
    //     (Super Admin, President, Vice President, Secretary, Club Advisor). The portal already hides
    //     the buttons for everybody else; this is a second check on the mail service itself.
    var ANNOUNCE_TYPES = ['event_notification', 'project_notification', 'event_approved', 'project_approved', 'report_approved'];
    if (ANNOUNCE_TYPES.indexOf(type) !== -1 && CURRENT_SENDER && CURRENT_SENDER.role) {
      var APPROVER_ROLES = ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm'];
      if (APPROVER_ROLES.indexOf(String(CURRENT_SENDER.role)) === -1) {
        return jsonOut({ success: false, error: 'This project/report must be approved by the President, Vice President, Secretary, Club Advisor or Super Admin before it can be emailed.' });
      }
    }

    // 3c. Board and General Body meetings (invitation, attendance form, minutes) may only be sent by the senior roles.
    //     Anyone else may only send mail for an EMERGENCY meeting (which goes to the selected members only).
    var MEETING_TYPES = ['meeting_invitation', 'meeting_minutes', 'meeting_attendance_form', 'attendance_form'];
    if (MEETING_TYPES.indexOf(type) !== -1 && CURRENT_SENDER && CURRENT_SENDER.role) {
      var mType = payload.meeting_type || (payload.meeting && payload.meeting.meeting_type) || '';
      var MEETING_ROLES = ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm'];
      if (mType !== 'emergency' && MEETING_ROLES.indexOf(String(CURRENT_SENDER.role)) === -1) {
        return jsonOut({ success: false, error: 'Only the Super Admin, President, IPP, Vice President, Secretary or Club Advisor can send Board and General Body meeting mails. Other members can only send emergency meetings.' });
      }
    }

    // 3c2. Sign the mail as the officer who owns this kind of document (guards above used the real sender).
    var signatory = resolveSignatory(type, payload);
    if (signatory) { payload.sender = signatory; CURRENT_SENDER = signatory; }

    // 3d. Respect the Site Settings mail switches (OFF = do not send).
    var switchKey = MAIL_SWITCH_BY_TYPE[type];
    if (switchKey && !isMailSwitchOn(switchKey)) {
      console.log('[API POST] ' + type + ' not sent: ' + switchKey + ' is OFF in Site Settings.');
      return jsonOut({ success: false, skipped: true, error: 'This mail is switched off in Site Settings (' + switchKey + '). Turn it on there to send it.' });
    }

    // 4. Pre-built HTML from the portal (Email Hub, meeting invitation, attendance form...)
    if (typeof payload.html_body === 'string' && payload.html_body.replace(/\s/g, '').length > 0) {
      result = sendPrebuiltEmail(payload);
      return jsonOut(result);
    }

    // 5. Structured payloads
    switch (type) {
      // Handles both avenue/project naming from client integrations
      case 'event_notification':
      case 'project_notification':
        result = sendProjectNotification(payload);
        break;
      case 'event_approved':
      case 'project_approved':
        result = sendProjectApprovedNotification(payload);
        break;
      case 'meeting_invitation':
        result = sendMeetingInvitation(payload);
        break;
      case 'meeting_minutes':
        result = sendMeetingMinutes(payload);
        break;
      case 'meeting_attendance_form':
      case 'attendance_form':
        result = sendAttendanceForm(payload);
        break;
      case 'birthday_wish':
        result = sendBirthdayWish(payload);
        break;
      case 'monthly_treasury_statement':
      case 'monthly_treasury':
        result = sendTreasuryStatement(payload);
        break;
      case 'blood_request_alert':
        result = sendBloodRequestAlert(payload);
        break;
      case 'report_approved':
        result = sendReportApproved(payload);
        break;
      case 'bulletin_published':
        result = sendBulletinNotification(payload);
        break;
      case 'membership_approved':
        result = sendMembershipApproved(payload);
        break;
      case 'membership_received':
        result = sendMembershipReceivedConfirmation(payload);
        break;
      case 'generic':
      case 'broadcast':
      case 'test':
      case 'announcement':
      case 'reminder':
      case 'appreciation':
      case 'urgent':
      case 'meeting':
      case 'project':
        result = sendGenericEmail(payload);
        break;
      default:
        result = { success: false, error: 'Unknown email request classification type: ' + type };
        console.warn('[API POST] Warning:', result.error);
    }

    return jsonOut(result);

  } catch (err) {
    console.error('[API POST] Critical Execution Error:', err.toString());
    return jsonOut({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  return jsonOut({
    status: 'active',
    service: 'Rotaract Club of Coimbatore Unity - Google Apps Script Email Engine',
    district: CONFIG.DISTRICT,
    version: CONFIG.VERSION,
    remaining_daily_quota: safeQuota()
  });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// DYNAMIC SIGNATURE RESOLVER
// ================================================================
function getSignature(sender) {
  if (!sender || !sender.role) {
    return getDefaultClubSignature();
  }

  var role = sender.role;
  var name = esc(sender.name || '');
  var portfolio = sender.portfolio || '';
  var phone = esc(sender.phone || '');
  var email = esc(sender.email || '');
  var photoUrl = isHttpUrl(sender.photo_url) ? sender.photo_url : '';

  var portfolioLabel = portfolio;
  if (!portfolioLabel) {
    switch (role) {
      case 'president': portfolioLabel = 'President ' + getRotaryYear(); break;
      case 'ipp': portfolioLabel = 'Immediate Past President'; break;
      case 'vice_president': portfolioLabel = 'Vice President'; break;
      case 'secretary': portfolioLabel = 'Secretary'; break;
      case 'secretary_admin': portfolioLabel = 'Secretary - Administration'; break;
      case 'secretary_comm': portfolioLabel = 'Secretary - Communication'; break;
      case 'treasurer': portfolioLabel = 'Treasurer'; break;
      case 'advisor': portfolioLabel = 'Club Advisor'; break;
      default: portfolioLabel = formatRole(role);
    }
  }

  var regardLine = 'Yours in Rotaract,';
  if (role === 'president') regardLine = 'Yours in Rotaract Service,';
  else if (role === 'ipp') regardLine = 'Yours in Fellowship,';
  else if (role === 'secretary' || role === 'secretary_admin' || role === 'secretary_comm') regardLine = 'Yours Sincerely,';
  else if (role === 'treasurer') regardLine = 'Regards,';

  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">' +
      '<tr>' +
        '<td bgcolor="#F0F4FA" style="padding:22px 26px;background-color:#F0F4FA;border-left:4px solid ' + CONFIG.PRIMARY_COLOR + ';border-radius:8px;">' +
          '<p style="margin:0 0 14px;font-family:Poppins,Arial,sans-serif;font-size:13px;color:#475569;font-style:italic;">' + regardLine + '</p>' +
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0">' +
            '<tr>' +
              (photoUrl ? '<td width="70" valign="top" style="padding-right:16px;vertical-align:top;"><img src="' + esc(photoUrl) + '" width="56" height="56" style="border-radius:50%;border:2px solid ' + CONFIG.PRIMARY_COLOR + ';display:block;" alt="Signatory"></td>' : '') +
              '<td valign="top" style="vertical-align:top;">' +
                '<p style="margin:0;font-family:Poppins,Arial,sans-serif;font-size:15px;font-weight:700;color:' + CONFIG.DARK_COLOR + ';">' + name + '</p>' +
                '<p style="margin:3px 0 8px;font-family:Poppins,Arial,sans-serif;font-size:11px;font-weight:700;color:' + CONFIG.SECONDARY_COLOR + ';letter-spacing:1px;">' + esc(String(portfolioLabel).toUpperCase()) + '</p>' +
                '<p style="margin:0;font-family:Poppins,Arial,sans-serif;font-size:11px;color:#64748b;line-height:1.6;">' + CONFIG.CLUB_NAME + '<br>' + CONFIG.PARENT_CLUB + '<br>' + CONFIG.DISTRICT + '</p>' +
                (email || phone ?
                  '<p style="margin:10px 0 0;font-family:Poppins,Arial,sans-serif;font-size:11px;color:#475569;">' +
                    (email ? '<span style="color:' + CONFIG.SECONDARY_COLOR + ';font-weight:700;">Email:</span> ' + email : '') +
                    (email && phone ? '&nbsp;&nbsp;|&nbsp;&nbsp;' : '') +
                    (phone ? '<span style="color:' + CONFIG.SECONDARY_COLOR + ';font-weight:700;">Phone:</span> ' + phone : '') +
                  '</p>' : '') +
              '</td>' +
            '</tr>' +
          '</table>' +
        '</td>' +
      '</tr>' +
    '</table>'
  );
}

function getDefaultClubSignature() {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">' +
      '<tr>' +
        '<td bgcolor="#F0F4FA" style="padding:22px 26px;background-color:#F0F4FA;border-left:4px solid ' + CONFIG.PRIMARY_COLOR + ';border-radius:8px;">' +
          '<p style="margin:0 0 14px;font-family:Poppins,Arial,sans-serif;font-size:13px;color:#475569;font-style:italic;">Yours in Rotaract Service,</p>' +
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0">' +
            '<tr>' +
              '<td valign="top" style="padding-right:16px;vertical-align:top;">' +
                '<img src="' + CONFIG.COLOUR_LOGO + '" height="48" style="display:block;height:48px;width:auto;max-width:150px;" alt="Unity Logo">' +
              '</td>' +
              '<td valign="top" style="vertical-align:top;">' +
                '<p style="margin:0;font-family:Poppins,Arial,sans-serif;font-size:16px;font-weight:800;color:' + CONFIG.DARK_COLOR + ';">' + CONFIG.CLUB_NAME + '</p>' +
                '<p style="margin:4px 0;font-family:Poppins,Arial,sans-serif;font-size:12px;color:#475569;font-weight:500;">' + CONFIG.PARENT_CLUB + '</p>' +
                '<p style="margin:0;font-family:Poppins,Arial,sans-serif;font-size:11px;color:#64748b;">Club ID: ' + CONFIG.CLUB_ID + '&nbsp;&nbsp;|&nbsp;&nbsp;' + CONFIG.DISTRICT + '</p>' +
                '<p style="margin:8px 0 0;font-family:Poppins,Arial,sans-serif;font-size:11px;color:' + CONFIG.SECONDARY_COLOR + ';font-weight:700;">' + CONFIG.CLUB_EMAIL + '</p>' +
              '</td>' +
            '</tr>' +
          '</table>' +
        '</td>' +
      '</tr>' +
    '</table>'
  );
}

// ================================================================
// SMALL HTML BUILDING BLOCKS
// ================================================================
function labelStyle() {
  return 'margin:0;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;line-height:1.5;';
}

/**
 * One "label | value" row inside a details card (two aligned columns).
 * valueHtml must already be escaped. Callers wrap the rows in a <table>.
 */
function infoRow(label, valueHtml, isLast, big) {
  var border = isLast ? '' : 'border-bottom:1px solid #D6E0F0;';
  return (
    '<tr>' +
      '<td class="info-label" width="34%" valign="top" style="padding:12px 14px 12px 0;' + border + 'vertical-align:top;">' +
        '<p style="' + labelStyle() + '">' + label + '</p>' +
      '</td>' +
      '<td class="info-value" valign="top" style="padding:11px 0;' + border + 'vertical-align:top;">' +
        '<p style="margin:0;font-size:' + (big ? '15' : '13') + 'px;color:' + CONFIG.DARK_COLOR + ';font-weight:' + (big ? '700' : '600') + ';line-height:1.5;">' + valueHtml + '</p>' +
      '</td>' +
    '</tr>'
  );
}

/** Soft card with a navy title strip. innerHtml is trusted HTML. */
function detailsCard(title, innerHtml) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:26px 0;border:1px solid #D6E0F0;border-radius:12px;">' +
      '<tr><td bgcolor="' + CONFIG.PRIMARY_COLOR + '" style="padding:11px 22px;background-color:' + CONFIG.PRIMARY_COLOR + ';border-radius:11px 11px 0 0;">' +
        '<p style="margin:0;font-size:11px;color:#ffffff;font-weight:800;text-transform:uppercase;letter-spacing:2px;">' + title + '</p>' +
      '</td></tr>' +
      '<tr><td bgcolor="#F8FAFC" style="padding:8px 22px 20px;background-color:#F8FAFC;border-radius:0 0 11px 11px;">' +
        innerHtml +
      '</td></tr>' +
    '</table>'
  );
}

/** Navy left-border call-out box. innerHtml is trusted HTML. */
function callout(innerHtml, borderColor) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:26px 0;">' +
      '<tr><td bgcolor="#F0F4FA" style="padding:18px 22px;background-color:#F0F4FA;border-left:4px solid ' + (borderColor || CONFIG.PRIMARY_COLOR) + ';border-radius:8px;">' + innerHtml + '</td></tr>' +
    '</table>'
  );
}

/** Bulletproof button: the colour sits on the <td>, so it shows even where <a> padding is stripped. */
function ctaButton(href, label, color) {
  var c = color || CONFIG.PRIMARY_COLOR;
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>' +
      '<td align="center" bgcolor="' + c + '" style="background-color:' + c + ';border-radius:10px;">' +
        '<a href="' + esc(href) + '" style="display:inline-block;padding:15px 40px;font-family:Poppins,Arial,sans-serif;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;border-radius:10px;">' + esc(label) + '</a>' +
      '</td>' +
    '</tr></table>'
  );
}

function greeting(text) {
  return '<p style="margin:0 0 18px;font-size:16px;color:' + CONFIG.DARK_COLOR + ';font-weight:700;">' + esc(text) + '</p>';
}

function paragraph(html) {
  return '<p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.75;">' + html + '</p>';
}

function hl(text) {
  return '<strong style="color:' + CONFIG.SECONDARY_COLOR + ';">' + esc(text) + '</strong>';
}

function imageBlock(url, alt, maxWidth) {
  if (!isHttpUrl(url)) return '';
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">' +
      '<tr><td align="center" style="border:1px solid #D6E0F0;border-radius:12px;padding:6px;" bgcolor="#ffffff">' +
        '<img src="' + esc(url) + '" style="max-width:' + (maxWidth || '100%') + ';width:100%;height:auto;border-radius:8px;display:block;" alt="' + esc(alt) + '">' +
      '</td></tr>' +
    '</table>'
  );
}

// ================================================================
// EMAIL TEMPLATE ENGINE
// ================================================================
function buildEmailShell(options) {
  var title = esc(options.title || '');
  var preheader = esc(options.preheader || '');
  var headerBadge = esc(options.headerBadge || 'Official Announcement');
  var bodyContent = options.body || '';
  var signatureHtml = options.signature || getDefaultClubSignature();
  var ctaHtml = options.cta || '';
  var accentColor = options.accentColor || CONFIG.PRIMARY_COLOR;

  function footLink(href, label, bg) {
    return (
      '<td style="padding:0 4px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td bgcolor="' + bg + '" style="background-color:' + bg + ';border-radius:8px;">' +
            '<a href="' + href + '" style="display:inline-block;padding:9px 14px;font-family:Poppins,Arial,sans-serif;color:#ffffff;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:1px;">' + label + '</a>' +
          '</td>' +
        '</tr></table>' +
      '</td>'
    );
  }

  return (
    '<!DOCTYPE html>' +
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">' +
    '<head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
      '<meta name="color-scheme" content="light only">' +
      '<title>' + title + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">' +
      '<style>' +
        'body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}' +
        'table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}' +
        'img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}' +
        '@media only screen and (max-width:620px){' +
          '.container{width:100% !important;border-radius:0 !important;}' +
          '.outer{padding:0 !important;}' +
          '.px{padding-left:20px !important;padding-right:20px !important;}' +
          '.hero-title{font-size:21px !important;}' +
          '.info-label,.info-value{display:block !important;width:100% !important;padding-left:0 !important;padding-right:0 !important;}' +
          '.info-label{padding-bottom:0 !important;border-bottom:0 !important;}' +
          '.tile-cell{display:block !important;width:100% !important;padding:3px 0 !important;}' +
        '}' +
      '</style>' +
    '</head>' +
    '<body style="margin:0;padding:0;background-color:#EEF2F8;font-family:Poppins,-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;">' +
      '<div style="display:none;font-size:1px;color:#EEF2F8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">' + preheader + '</div>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#EEF2F8" style="background-color:#EEF2F8;">' +
        '<tr>' +
          '<td align="center" class="outer" style="padding:32px 12px;">' +
            '<table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="640" bgcolor="#ffffff" style="max-width:640px;width:100%;background-color:#ffffff;border:1px solid #D6E0F0;border-radius:16px;overflow:hidden;">' +
              // top rule
              '<tr><td height="6" style="height:6px;line-height:6px;font-size:0;background-color:' + CONFIG.PRIMARY_COLOR + ';" bgcolor="' + CONFIG.PRIMARY_COLOR + '">&nbsp;</td></tr>' +
              // hero
              '<tr>' +
                '<td class="px" align="center" bgcolor="' + CONFIG.PRIMARY_COLOR + '" style="background-color:' + CONFIG.PRIMARY_COLOR + ';background-image:linear-gradient(135deg,' + CONFIG.DARK_COLOR + ' 0%,' + accentColor + ' 100%);padding:38px 36px 36px;text-align:center;">' +
                  '<img src="' + CONFIG.WHITE_LOGO + '" height="56" style="display:block;margin:0 auto 22px;height:56px;width:auto;max-width:100%;" alt="Rotaract Club of Coimbatore Unity">' +
                  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>' +
                    '<td bgcolor="' + CONFIG.ACCENT_COLOR + '" style="background-color:' + CONFIG.ACCENT_COLOR + ';border-radius:20px;padding:6px 16px;">' +
                      '<p style="margin:0;color:#ffffff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;line-height:1.4;">' + headerBadge + '</p>' +
                    '</td>' +
                  '</tr></table>' +
                  '<h1 class="hero-title" style="margin:16px 0 0;color:#ffffff;font-size:25px;font-weight:800;letter-spacing:-0.3px;line-height:1.3;">' + title + '</h1>' +
                '</td>' +
              '</tr>' +
              '<tr><td height="4" style="height:4px;line-height:4px;font-size:0;background-color:' + CONFIG.SECONDARY_COLOR + ';background-image:linear-gradient(90deg,' + CONFIG.PRIMARY_COLOR + ' 0%,' + CONFIG.SECONDARY_COLOR + ' 50%,' + CONFIG.PRIMARY_COLOR + ' 100%);" bgcolor="' + CONFIG.SECONDARY_COLOR + '">&nbsp;</td></tr>' +
              // body
              '<tr>' +
                '<td class="px" bgcolor="#ffffff" style="padding:38px 36px 30px;color:#334155;font-size:14px;line-height:1.7;background-color:#ffffff;">' +
                  bodyContent +
                  (ctaHtml ? '<div style="text-align:center;margin:34px 0 6px;">' + ctaHtml + '</div>' : '') +
                  signatureHtml +
                '</td>' +
              '</tr>' +
              // footer
              '<tr>' +
                '<td class="px" align="center" bgcolor="#F0F4FA" style="background-color:#F0F4FA;padding:28px 36px;border-top:1px solid #D6E0F0;">' +
                  '<p style="margin:0 0 8px;font-family:Poppins,Arial,sans-serif;font-size:12px;font-weight:800;color:' + CONFIG.PRIMARY_COLOR + ';text-transform:uppercase;letter-spacing:2px;">Service Above Self</p>' +
                  '<p style="margin:0 0 4px;font-family:Poppins,Arial,sans-serif;font-size:11px;color:#64748b;">Charter Date: ' + CONFIG.CHARTER_DATE + '&nbsp;&nbsp;|&nbsp;&nbsp;Club ID: ' + CONFIG.CLUB_ID + '</p>' +
                  '<p style="margin:0 0 18px;font-family:Poppins,Arial,sans-serif;font-size:11px;color:#64748b;">' + CONFIG.DISTRICT + ' (' + CONFIG.DISTRICT_REGION + ')</p>' +
                  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>' +
                    footLink(CONFIG.WEBSITE_URL, 'WEBSITE', CONFIG.PRIMARY_COLOR) +
                    footLink(CONFIG.INSTAGRAM, 'INSTAGRAM', CONFIG.SECONDARY_COLOR) +
                    footLink(CONFIG.FACEBOOK, 'FACEBOOK', CONFIG.ACCENT_COLOR) +
                    footLink('mailto:' + CONFIG.CLUB_EMAIL, 'EMAIL', CONFIG.DARK_COLOR) +
                  '</tr></table>' +
                  '<p style="margin:18px 0 0;font-family:Poppins,Arial,sans-serif;font-size:10px;color:#94a3b8;line-height:1.6;">&copy; ' + new Date().getFullYear() + ' ' + CONFIG.CLUB_NAME + '. All Rights Reserved.<br>This is an automated communication from our official portal.</p>' +
                '</td>' +
              '</tr>' +
              '<tr><td height="6" style="height:6px;line-height:6px;font-size:0;background-color:' + CONFIG.PRIMARY_COLOR + ';" bgcolor="' + CONFIG.PRIMARY_COLOR + '">&nbsp;</td></tr>' +
            '</table>' +
          '</td>' +
        '</tr>' +
      '</table>' +
    '</body>' +
    '</html>'
  );
}

// ================================================================
// ATTENDANCE BLOCK (captured in the project REPORT)
// ================================================================
/**
 * Builds the "Dignitaries & Guest Attendance" card from an events row.
 * council_members_details / trainers_details may arrive as JSON text,
 * a real array (jsonb) or be missing entirely.
 * Returns '' when nothing was recorded.
 */
function buildAttendanceHtml(event) {
  event = event || {};
  var council = parsePeopleList(event.council_members_details);
  var trainers = parsePeopleList(event.trainers_details);
  var rotarians = parsePeopleList(event.rotarians_details);
  var interactors = parsePeopleList(event.interactors_details);
  var counts = {
    council: Math.max(toInt(event.council_members_count), council.length),
    trainers: Math.max(toInt(event.trainers_count), trainers.length),
    rotarians: Math.max(toInt(event.rotarians_count), rotarians.length),
    interactors: Math.max(toInt(event.interactors_count), interactors.length)
  };

  if (!counts.council && !counts.trainers && !counts.rotarians && !counts.interactors) return '';

  function tile(label, value, color) {
    return (
      '<td class="tile-cell" width="25%" style="padding:3px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border:1px solid #D6E0F0;border-top:3px solid ' + color + ';border-radius:10px;">' +
          '<tr><td align="center" style="padding:13px 6px;text-align:center;">' +
            '<p style="margin:0 0 4px;font-size:9px;color:' + color + ';font-weight:800;text-transform:uppercase;letter-spacing:0.8px;">' + label + '</p>' +
            '<p style="margin:0;font-size:22px;color:' + CONFIG.DARK_COLOR + ';font-weight:900;">' + value + '</p>' +
          '</td></tr>' +
        '</table>' +
      '</td>'
    );
  }

  function peopleList(title, list) {
    if (!list.length) return '';
    var html = '<p style="margin:16px 0 8px;font-size:11px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:800;text-transform:uppercase;letter-spacing:1px;">' + title + '</p>';
    for (var i = 0; i < list.length; i++) {
      html +=
        '<p style="margin:0 0 6px;font-size:13px;color:' + CONFIG.DARK_COLOR + ';line-height:1.5;">' +
          '<strong>' + esc(list[i].name) + '</strong>' +
          (list[i].portfolio ? ' <span style="color:#64748b;">(' + esc(list[i].portfolio) + ')</span>' : '') +
        '</p>';
    }
    return html;
  }

  var inner =
    '<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
      tile('Council', counts.council, CONFIG.PRIMARY_COLOR) +
      tile('Trainers', counts.trainers, CONFIG.SECONDARY_COLOR) +
      tile('Rotarians', counts.rotarians, CONFIG.ACCENT_COLOR) +
      tile('Interactors', counts.interactors, '#647DA0') +
    '</tr></table>' +
    peopleList('Council Members Present', council) +
    peopleList('Trainers Present', trainers) +
    peopleList('Rotarians Present', rotarians) +
    peopleList('Interactors Present', interactors);

  return detailsCard('Dignitaries &amp; Guest Attendance', inner);
}

/** Stats strip (beneficiaries / volunteers / hours) for report emails. Returns '' if all zero. */
function buildReportStatsHtml(event) {
  event = event || {};
  var b = toInt(event.beneficiaries_count);
  var v = toInt(event.volunteers_count);
  var h = parseFloat(event.service_hours) || 0;
  if (!b && !v && !h) return '';

  function tile(label, value) {
    return (
      '<td class="tile-cell" width="33%" style="padding:4px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0F4FA;border-radius:12px;border:1px solid #D6E0F0;border-top:3px solid ' + CONFIG.PRIMARY_COLOR + ';">' +
          '<tr><td align="center" style="padding:16px 8px;text-align:center;">' +
            '<p style="margin:0 0 6px;font-size:10px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:800;text-transform:uppercase;letter-spacing:1px;">' + label + '</p>' +
            '<p style="margin:0;font-size:20px;color:' + CONFIG.DARK_COLOR + ';font-weight:900;">' + value + '</p>' +
          '</td></tr>' +
        '</table>' +
      '</td>'
    );
  }

  return (
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 8px;"><tr>' +
      tile('Beneficiaries', b) + tile('Volunteers', v) + tile('Service Hours', h) +
    '</tr></table>'
  );
}

function parsePeopleList(value) {
  var v = value;
  try {
    if (typeof v === 'string' && v.replace(/\s/g, '')) v = JSON.parse(v);
    if (typeof v === 'string' && v.replace(/\s/g, '')) v = JSON.parse(v);
  } catch (err) {
    return [];
  }
  if (!Array.isArray(v)) return [];
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (v[i] && v[i].name) out.push({ name: String(v[i].name), portfolio: v[i].portfolio ? String(v[i].portfolio) : '' });
  }
  return out;
}

// ================================================================
// 0. PRE-BUILT HTML FROM THE PORTAL (Email Hub / meetings.js)
// ================================================================
/**
 * Payload shape (sent by email-hub.js and meetings.js through the edge function):
 *   { type, recipients[], subject, html_body, attachment_urls[], sender{...} }
 * Full HTML documents are delivered untouched. HTML fragments (the quick
 * templates) are wrapped in a neutral container so mail clients render them.
 */
function sendPrebuiltEmail(payload) {
  var html = String(payload.html_body || '');
  var subject = String(payload.subject || 'Message from Rotaract Unity');

  if (!/<html[\s>]/i.test(html) && !/<!doctype/i.test(html)) {
    html =
      '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
      '<body style="margin:0;padding:24px 12px;background:#f1f5f9;">' + html + '</body></html>';
  }

  var urls = [].concat(payload.attachment_urls || [], payload.attachments || []);

  var attachments = collectAttachments(urls, 'Attachment').concat(decodeFiles(payload.files));

  return dispatchEmail({
    recipients: payload.recipients || [],
    subject: subject,
    html: html,
    attachments: attachments
  });
}

// ================================================================
// 1. PROJECT / EVENT NOTIFICATION EMAIL
// (attendance is intentionally NOT here: it is recorded in the report)
// ================================================================
function sendProjectNotification(payload) {
  var event = payload.event || {};
  var recipients = payload.recipients || [memberGroup()];
  var sender = payload.sender;
  var posterUrl = isHttpUrl(event.poster_url) ? event.poster_url : '';

  var dateFormatted = formatDate(event.date);
  var timeFormatted = formatTime(event.start_time) + (event.end_time ? ' - ' + formatTime(event.end_time) : '');
  var avenueLabel = (event.is_dpp || event.avenue_slug === 'dpp') ? 'District Priority Projects' : formatAvenue(event.avenue_slug);

  var collaborationHtml = '';
  if (event.has_collaboration && event.collaborator_name) {
    collaborationHtml = infoRow('Collaboration', esc(event.collaborator_name) + (event.collaboration_type ? ' (' + esc(formatCollabType(event.collaboration_type)) + ')' : ''), true);
  }

  var dppHtml = '';
  if (event.is_dpp) {
    dppHtml =
      '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px;background:#F0F4FA;border-left:4px solid ' + CONFIG.PRIMARY_COLOR + ';border-radius:8px;">' +
        '<tr><td style="padding:16px;">' +
          '<p style="margin:0 0 8px;font-size:11px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:800;text-transform:uppercase;letter-spacing:1px;">District Priority Project (DPP)</p>' +
          '<p style="margin:0;font-size:12px;color:' + CONFIG.DARK_COLOR + ';line-height:1.6;">' +
            '<strong>Project No:</strong> ' + esc(event.dpp_project_number || 'N/A') + '<br>' +
            '<strong>Pillar:</strong> ' + esc(event.dpp_pillar || 'N/A') + '<br>' +
            '<strong>Category:</strong> ' + esc(formatDppCategory(event.dpp_category) || 'N/A') +
          '</p>' +
        '</td></tr>' +
      '</table>';
  }

  var calLink = buildCalendarLink(event);

  var detailRows =
    infoRow('Event Name', esc(event.event_name || ''), false, true) +
    infoRow('Date &amp; Time', esc(dateFormatted) + (timeFormatted ? ' | ' + esc(timeFormatted) : ''), false) +
    infoRow('Venue', esc(event.venue || 'TBA'), false) +
    infoRow('Avenue', esc(avenueLabel), false) +
    infoRow('Event Chair', esc(event.event_chair || 'TBA'), !collaborationHtml) +
    collaborationHtml;

  var body =
    imageBlock(posterUrl, 'Event Poster') +
    greeting('Dear Fellow Rotaractor,') +
    paragraph('We are delighted to announce the launch of our upcoming project, ' + hl(event.event_name || '') + '. Your enthusiastic participation will make this initiative impactful and memorable.') +
    detailsCard('Event Information', '<table cellpadding="0" cellspacing="0" border="0" width="100%">' + detailRows + '</table>' + dppHtml) +
    (event.description ?
      '<p style="margin:20px 0 10px;font-size:12px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:700;text-transform:uppercase;letter-spacing:1px;">About The Project</p>' +
      '<p style="margin:0 0 20px;font-size:13px;color:#475569;line-height:1.7;white-space:pre-wrap;">' + esc(event.description) + '</p>' : '') +
    '<p style="margin:24px 0 0;font-size:13px;color:#475569;line-height:1.7;">We look forward to your presence and active participation. Please mark your calendar and confirm your availability at the earliest.</p>';

  var cta =
    '<table cellpadding="0" cellspacing="0" border="0" align="center"><tr>' +
      '<td style="padding:0 6px;">' +
        '<a href="' + esc(calLink) + '" style="display:inline-block;padding:14px 28px;background:' + CONFIG.PRIMARY_COLOR + ';color:#ffffff;text-decoration:none;border-radius:10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 14px rgba(10,31,68,0.3);">Add to Calendar</a>' +
      '</td>' +
      '<td style="padding:0 6px;">' +
        '<a href="' + CONFIG.WEBSITE_URL + '" style="display:inline-block;padding:14px 28px;background:' + CONFIG.SECONDARY_COLOR + ';color:#ffffff;text-decoration:none;border-radius:10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">View Portal</a>' +
      '</td>' +
    '</tr></table>';

  var html = buildEmailShell({
    title: event.event_name || 'Project Announcement',
    preheader: 'New project announcement: ' + (event.event_name || ''),
    headerBadge: 'Project Announcement',
    body: body,
    signature: getSignature(sender),
    cta: cta
  });

  var attachments = posterUrl ? collectAttachments([posterUrl], 'Event_Poster_' + sanitizeFilename(event.event_name)) : [];
  attachments = attachments.concat(decodeFiles(payload.files));

  return dispatchEmail({
    recipients: recipients,
    subject: '[Rotaract Unity] New Project: ' + (event.event_name || ''),
    html: html,
    attachments: attachments
  });
}

// ================================================================
// 2. PROJECT APPROVED NOTIFICATION
// ================================================================
function sendProjectApprovedNotification(payload) {
  var event = payload.event || {};
  var recipients = payload.recipients && payload.recipients.length ? payload.recipients : [boardGroup()];
  var sender = payload.sender;

  var body =
    greeting('Greetings Team,') +
    paragraph('We are pleased to inform you that the project ' + hl(event.event_name || '') + ' has been formally approved and is now scheduled for execution.') +
    callout(
      '<p style="margin:0 0 8px;font-size:12px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:800;text-transform:uppercase;letter-spacing:1px;">Approval Confirmed</p>' +
      '<p style="margin:0;font-size:12px;color:' + CONFIG.DARK_COLOR + ';">Date: ' + esc(formatDate(event.date)) + '<br>Venue: ' + esc(event.venue || 'TBA') + '</p>'
    ) +
    '<p style="margin:0;font-size:13px;color:#475569;line-height:1.7;">All stakeholders are requested to prepare for successful execution. The project chair will coordinate further communications.</p>';

  var html = buildEmailShell({
    title: 'Project Approved',
    preheader: 'Project approval confirmation - ' + (event.event_name || ''),
    headerBadge: 'Approval Notification',
    body: body,
    signature: getSignature(sender),
    accentColor: CONFIG.SECONDARY_COLOR
  });

  return dispatchEmail({
    recipients: recipients,
    subject: '[Rotaract Unity] Approved: ' + (event.event_name || ''),
    html: html
  });
}

// ================================================================
// 3. MEETING INVITATION EMAIL
// ================================================================
function sendMeetingInvitation(payload) {
  var meeting = payload.meeting || {};
  var recipients = meetingDefaultRecipients(payload, meeting);
  var sender = payload.sender;
  var posterUrl = isHttpUrl(meeting.poster_url) ? meeting.poster_url : '';
  var agendaPdfUrl = payload.agenda_pdf_url || '';

  var isBoard = meeting.meeting_type === 'board_meeting';
  var isEmergency = meeting.meeting_type === 'emergency';
  var meetingTypeLabel = isBoard ? 'Board Members Meeting' : (isEmergency ? 'Emergency Meeting' : 'General Body Meeting');
  var dateFormatted = formatDate(meeting.date);
  var timeFormatted = formatTime(meeting.start_time);

  var agendaItems = meeting.agenda_items || [];
  var agendaHtml = '';
  if (agendaItems.length > 0) {
    agendaHtml =
      '<p style="margin:28px 0 12px;font-size:12px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:700;text-transform:uppercase;letter-spacing:1px;">Meeting Agenda</p>' +
      '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">' +
        '<tr><td style="padding:20px 24px;">';
    for (var i = 0; i < agendaItems.length; i++) {
      var pt = (typeof agendaItems[i] === 'string') ? agendaItems[i] : (agendaItems[i].point || '');
      agendaHtml +=
        '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:10px;">' +
          '<tr>' +
            '<td width="26" style="vertical-align:top;padding-top:4px;">' +
              '<div style="width:20px;height:20px;background:' + CONFIG.PRIMARY_COLOR + ';border-radius:50%;color:#ffffff;font-size:10px;font-weight:800;line-height:20px;text-align:center;">' + (i + 1) + '</div>' +
            '</td>' +
            '<td style="font-size:13px;color:' + CONFIG.DARK_COLOR + ';line-height:1.6;padding-left:10px;">' + esc(pt) + '</td>' +
          '</tr>' +
        '</table>';
    }
    agendaHtml += '</td></tr></table>';
  }

  var rows =
    infoRow('Meeting Type', esc(meetingTypeLabel), false, true) +
    infoRow('Date', esc(dateFormatted), false) +
    infoRow('Time', esc(timeFormatted + (meeting.end_time ? ' - ' + formatTime(meeting.end_time) : '')), false) +
    infoRow('Venue', esc(meeting.venue || 'TBA'), true) +
    (meeting.group_number ? infoRow('Group', 'Group ' + esc(meeting.group_number), false) : '');

  var body =
    (isEmergency ? '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;background:#FEF2F2;border-left:4px solid #DC2626;border-radius:8px;"><tr><td style="padding:12px 16px;font-size:12px;font-weight:700;color:#991B1B;line-height:1.6;">EMERGENCY MEETING &mdash; called for selected members only. Please treat this invitation as confidential.</td></tr></table>' : '') +
    imageBlock(posterUrl, 'Meeting Poster') +
    greeting('Dear ' + (isBoard ? 'Board Member' : (isEmergency ? 'Member' : 'Fellow Rotaractor')) + ',') +
    paragraph('You are cordially invited to attend the ' + hl(meeting.meeting_name || meetingTypeLabel) + '. Your valuable presence and contributions are essential for productive discussions.') +
    detailsCard('Meeting Details', '<table cellpadding="0" cellspacing="0" border="0" width="100%">' + rows + '</table>') +
    agendaHtml +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background:#F0F4FA;border-left:4px solid ' + CONFIG.SECONDARY_COLOR + ';border-radius:8px;">' +
      '<tr><td style="padding:16px 20px;">' +
        '<p style="margin:0;font-size:12px;color:' + CONFIG.DARK_COLOR + ';font-weight:600;line-height:1.6;">An attendance form will be shared at the start of the meeting. Kindly ensure to complete it to mark your presence officially.</p>' +
      '</td></tr>' +
    '</table>';

  var html = buildEmailShell({
    title: meeting.meeting_name || meetingTypeLabel,
    preheader: 'Meeting invitation - ' + (meeting.meeting_name || ''),
    headerBadge: isEmergency ? 'Emergency Meeting' : 'Meeting Invitation',
    body: body,
    signature: getSignature(sender)
  });

  var attachments = [];
  if (posterUrl) attachments = attachments.concat(collectAttachments([posterUrl], 'Meeting_Poster_' + sanitizeFilename(meeting.meeting_name)));
  if (agendaPdfUrl) attachments = attachments.concat(collectAttachments([agendaPdfUrl], 'Agenda_' + sanitizeFilename(meeting.meeting_name), '.pdf'));
  attachments = attachments.concat(decodeFiles(payload.files));

  return dispatchEmail({
    recipients: recipients,
    subject: '[Rotaract Unity] ' + (isEmergency ? 'EMERGENCY Meeting: ' : 'Meeting Invitation: ') + (meeting.meeting_name || meetingTypeLabel),
    html: html,
    attachments: attachments
  });
}

// ================================================================
// 4. MEETING MINUTES EMAIL
// ================================================================
function sendMeetingMinutes(payload) {
  var meeting = payload.meeting || {};
  var recipients = meetingDefaultRecipients(payload, meeting);
  var sender = payload.sender;
  var minutesPdfUrl = payload.minutes_pdf_url || '';
  var attendancePdfUrl = payload.attendance_pdf_url || '';
  var photos = photoListFrom(payload);
  var photoGallery = buildPhotoGalleryHtml(photos, 'Meeting Photographs', 3, 6);

  // Minutes entries [{ time, heading, details }] shown in the mail body
  var minutesHtml = '';
  var items = (meeting.minutes_items || []).map(function (x) {
    x = x || {};
    return { time: x.time, heading: x.heading || x.point || x.title || '', details: x.details || x.description || '' };
  }).filter(function (x) { return x.heading || x.details; });
  if (items.length > 0) {
    minutesHtml = '<p style="margin:28px 0 12px;font-size:12px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:700;text-transform:uppercase;letter-spacing:1px;">Proceedings</p>';
    for (var mi = 0; mi < Math.min(items.length, 30); mi++) {
      var it = items[mi] || {};
      minutesHtml +=
        '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:10px;background:#f8fafc;border-left:4px solid ' + CONFIG.SECONDARY_COLOR + ';border-radius:8px;">' +
          '<tr><td style="padding:12px 16px;">' +
            '<p style="margin:0;font-size:13px;color:' + CONFIG.DARK_COLOR + ';font-weight:700;">' +
              (it.time ? '<span style="color:#64748b;font-weight:600;">' + esc(it.time) + '</span> &nbsp;' : '') + esc(it.heading || '') +
            '</p>' +
            (it.details ? '<p style="margin:6px 0 0;font-size:12px;color:#475569;line-height:1.6;white-space:pre-wrap;">' + esc(String(it.details).substring(0, 800)) + '</p>' : '') +
          '</td></tr>' +
        '</table>';
    }
  }

  function sumRow(label, value) {
    return '<tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:40%;">' + label + '</td><td style="padding:6px 0;font-size:13px;color:' + CONFIG.DARK_COLOR + ';font-weight:600;">' + value + '</td></tr>';
  }

  var summary =
    '<table cellpadding="0" cellspacing="0" border="0" width="100%">' +
      sumRow('Meeting Name', esc(meeting.meeting_name || '')) +
      sumRow('Date', esc(formatDate(meeting.date))) +
      sumRow('Duration', esc(meeting.duration_minutes || 0) + ' minutes') +
      sumRow('Minutes Prepared By', esc(meeting.minutes_prepared_by || 'Secretary')) +
    '</table>';

  var body =
    greeting('Dear Fellow Rotaractor,') +
    paragraph('Please find enclosed the formal minutes of the ' + hl(meeting.meeting_name || 'recent meeting') + ' held on <strong>' + esc(formatDate(meeting.date)) + '</strong>. The minutes and the attendance sheet are attached for your records.') +
    detailsCard('Meeting Summary', summary) +
    minutesHtml +
    photoGallery +
    '<p style="margin:0;font-size:12px;color:#64748b;line-height:1.7;font-style:italic;">For any clarifications or corrections, please reach out to the office of the Secretary within 7 days.</p>';

  var html = buildEmailShell({
    title: 'Meeting Minutes',
    preheader: 'Formal minutes - ' + (meeting.meeting_name || ''),
    headerBadge: 'Meeting Minutes',
    body: body,
    signature: getSignature(sender)
  });

  var attachments = [];
  if (minutesPdfUrl) attachments = attachments.concat(collectAttachments([minutesPdfUrl], 'Minutes_' + sanitizeFilename(meeting.meeting_name), '.pdf'));
  if (attendancePdfUrl) attachments = attachments.concat(collectAttachments([attendancePdfUrl], 'Attendance_' + sanitizeFilename(meeting.meeting_name), '.pdf'));
  attachments = attachments.concat(decodeFiles(payload.files));
  // Photos stay inline in the mail body; the only attachment is the combined meeting document sent by the portal

  return dispatchEmail({
    recipients: recipients,
    subject: '[Rotaract Unity] Minutes: ' + (meeting.meeting_name || 'Meeting'),
    html: html,
    attachments: attachments
  });
}

// ================================================================
// 5. MEETING ATTENDANCE FORM EMAIL
// ================================================================
function sendAttendanceForm(payload) {
  var meeting = payload.meeting || {};
  var recipients = meetingDefaultRecipients(payload, meeting);
  var formUrl = payload.form_url || '';
  var sender = payload.sender;

  function sumRow(label, value) {
    return '<tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:40%;">' + label + '</td><td style="padding:6px 0;font-size:13px;color:' + CONFIG.DARK_COLOR + ';font-weight:600;">' + value + '</td></tr>';
  }

  var body =
    greeting('Dear Fellow Rotaractor,') +
    paragraph('The ' + hl(meeting.meeting_name || 'meeting') + ' is now in session. Please complete your attendance by submitting the form linked below.') +
    callout('<p style="margin:0;font-size:12px;color:' + CONFIG.DARK_COLOR + ';font-weight:600;line-height:1.6;">The attendance form requires: Name, Designation, Rotary International ID, In-Time, and your signature upload (as image).</p>', CONFIG.SECONDARY_COLOR) +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:16px 0 24px;">' +
      '<tr><td style="padding:18px 24px;">' +
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">' +
          sumRow('Meeting', esc(meeting.meeting_name || '')) +
          sumRow('Date', esc(formatDate(meeting.date))) +
          sumRow('Venue', esc(meeting.venue || '')) +
        '</table>' +
      '</td></tr>' +
    '</table>';

  var cta = isHttpUrl(formUrl) ? ctaButton(formUrl, 'Submit Attendance') : '';

  var html = buildEmailShell({
    title: 'Mark Your Attendance',
    preheader: 'Attendance form for ' + (meeting.meeting_name || 'meeting'),
    headerBadge: 'Attendance Required',
    body: body,
    cta: cta,
    signature: getSignature(sender)
  });

  return dispatchEmail({
    recipients: recipients,
    subject: '[Rotaract Unity] Attendance: ' + (meeting.meeting_name || 'Meeting'),
    html: html
  });
}

// ================================================================
// 6. BIRTHDAY WISH EMAIL
// ================================================================
function sendBirthdayWish(payload) {
  var member = payload.member || {};
  var recipients = [member.email];
  var photoUrl = isHttpUrl(member.photo_url) ? member.photo_url : '';

  var body =
    '<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">' +
      (photoUrl ?
        '<img src="' + esc(photoUrl) + '" width="120" height="120" style="border-radius:50%;border:5px solid ' + CONFIG.PRIMARY_COLOR + ';margin-bottom:20px;" alt="Member">' : '') +
      '<h2 style="margin:0;font-family:Poppins,Arial,sans-serif;font-size:32px;font-weight:900;color:' + CONFIG.PRIMARY_COLOR + ';">Happy Birthday!</h2>' +
      '<p style="margin:8px 0 0;font-size:16px;color:' + CONFIG.DARK_COLOR + ';font-weight:700;">' + esc(member.full_name || 'Dear Member') + '</p>' +
    '</td></tr></table>' +
    '<div style="height:30px;"></div>' +
    '<p style="margin:0 0 18px;font-size:14px;color:#475569;line-height:1.8;text-align:center;">On behalf of the entire <strong style="color:' + CONFIG.PRIMARY_COLOR + ';">Rotaract Club of Coimbatore Unity</strong> family, we extend our warmest birthday wishes to you.</p>' +
    '<p style="margin:0 0 18px;font-size:14px;color:#475569;line-height:1.8;text-align:center;">May this year bring you boundless joy, remarkable achievements, abundant health, and countless opportunities to continue your remarkable journey of service and leadership.</p>' +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#F0F4FA 0%,#f8fafc 100%);border-radius:16px;border:2px solid ' + CONFIG.PRIMARY_COLOR + ';margin:30px 0;">' +
      '<tr><td style="padding:28px 24px;text-align:center;">' +
        '<p style="margin:0 0 10px;font-size:11px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:800;text-transform:uppercase;letter-spacing:2px;">Our Blessing</p>' +
        '<p style="margin:0;font-size:16px;color:' + CONFIG.DARK_COLOR + ';font-style:italic;line-height:1.6;font-weight:500;">&ldquo;May your life be as remarkable as the service you render, and may each day bring you closer to your dreams.&rdquo;</p>' +
      '</td></tr>' +
    '</table>' +
    '<p style="margin:20px 0 0;font-size:13px;color:#475569;line-height:1.7;text-align:center;">Have a blessed and wonderful day ahead.</p>';

  var firstName = member.full_name ? String(member.full_name).replace(/^Rtr\.?\s*/i, '').split(' ')[0] : '';

  var html = buildEmailShell({
    title: 'Happy Birthday ' + firstName,
    preheader: 'Warm birthday wishes from Rotaract Unity',
    headerBadge: 'Birthday Celebration',
    body: body,
    accentColor: CONFIG.PRIMARY_COLOR,
    signature: getDefaultClubSignature()
  });

  return dispatchEmail({
    recipients: recipients,
    subject: 'Happy Birthday, ' + (member.full_name || 'Rotaractor') + '!',
    html: html
  });
}

// ================================================================
// 7. MONTHLY TREASURY STATEMENT
// ================================================================
function sendTreasuryStatement(payload) {
  var month = payload.month || '';
  var totalIncome = payload.total_income || 0;
  var totalExpense = payload.total_expense || 0;
  var netBalance = payload.net_balance || 0;
  var transactionCount = payload.transaction_count || 0;
  var excelUrl = payload.excel_url || '';
  var recipients = payload.recipients && payload.recipients.length ? payload.recipients : [memberGroup()];
  var sender = payload.sender;
  var hasBalances = payload.opening_balance !== undefined && payload.closing_balance !== undefined;
  var pendingCount = toInt(payload.pending_count);

  function kpi(label, amount, color, bg) {
    return (
      '<td width="33%" style="padding:4px;">' +
        '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:' + bg + ';border-radius:12px;border:1px solid ' + color + ';">' +
          '<tr><td style="padding:20px 16px;text-align:center;">' +
            '<p style="margin:0 0 6px;font-size:10px;color:' + color + ';font-weight:800;text-transform:uppercase;letter-spacing:1px;">' + label + '</p>' +
            '<p style="margin:0;font-size:20px;color:' + CONFIG.DARK_COLOR + ';font-weight:900;">Rs ' + esc(formatMoney(amount)) + '</p>' +
          '</td></tr>' +
        '</table>' +
      '</td>'
    );
  }

  var body =
    greeting('Dear Fellow Rotaractor,') +
    '<p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">Please find below the consolidated financial statement for ' + hl(month) + '. The complete transaction ledger is attached as an Excel spreadsheet for your detailed review.</p>' +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;"><tr>' +
      kpi('Income', totalIncome, CONFIG.PRIMARY_COLOR, '#F0F4FA') +
      kpi('Expense', totalExpense, CONFIG.SECONDARY_COLOR, '#f8fafc') +
      kpi('Balance', netBalance, CONFIG.ACCENT_COLOR, '#F0F4FA') +
    '</tr></table>' +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:16px 0;">' +
      '<tr><td style="padding:18px 24px;text-align:center;">' +
        '<p style="margin:0;font-size:12px;color:#64748b;">Total Transactions Recorded this Month</p>' +
        '<p style="margin:4px 0 0;font-size:22px;color:' + CONFIG.DARK_COLOR + ';font-weight:800;">' + esc(transactionCount) + '</p>' +
      '</td></tr>' +
    '</table>' +
    (hasBalances ?
      '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0F4FA;border-left:4px solid ' + CONFIG.PRIMARY_COLOR + ';border-radius:8px;margin:16px 0;">' +
        '<tr><td style="padding:16px 20px;font-size:13px;color:' + CONFIG.DARK_COLOR + ';line-height:1.8;">' +
          '<strong>Opening balance:</strong> Rs ' + esc(formatMoney(payload.opening_balance)) + '<br>' +
          '<strong>Closing balance:</strong> Rs ' + esc(formatMoney(payload.closing_balance)) +
        '</td></tr>' +
      '</table>' : '') +
    (pendingCount > 0 ?
      '<p style="margin:12px 0 0;font-size:12px;color:#92400e;line-height:1.7;">Note: ' + pendingCount + ' transaction(s) in this period are still pending approval and are not included in the figures above.</p>' : '') +
    '<p style="margin:24px 0 0;font-size:12px;color:#64748b;line-height:1.7;font-style:italic;">For any clarifications or discrepancies regarding this statement, please contact the Treasurer at the earliest convenience.</p>';

  var html = buildEmailShell({
    title: 'Treasury Statement - ' + month,
    preheader: 'Monthly financial statement for ' + month,
    headerBadge: 'Financial Report',
    body: body,
    signature: getSignature(sender)
  });

  var attachments = excelUrl ? collectAttachments([excelUrl], 'Treasury_Statement_' + sanitizeFilename(month), '.xlsx') : [];
  attachments = attachments.concat(payload._blobs || [], decodeFiles(payload.files));

  return dispatchEmail({
    recipients: recipients,
    subject: '[Rotaract Unity] Monthly Treasury Statement: ' + month,
    html: html,
    attachments: attachments
  });
}

// ================================================================
// 8. BLOOD REQUEST ALERT EMAIL
// ================================================================
function sendBloodRequestAlert(payload) {
  var request = payload.request || {};
  var recipients = payload.recipients || [memberGroup()];

  var urgency = String(request.urgency || 'normal').toLowerCase();
  var urgencyColor = (urgency === 'critical' || urgency === 'urgent' || urgency === 'emergency') ? CONFIG.ALERT_COLOR : CONFIG.PRIMARY_COLOR;
  var urgencyLabel = urgency.toUpperCase();
  var phone = String(request.contact_phone || '').replace(/[^0-9+]/g, '');

  function bRow(label, valueHtml, last, color) {
    return '<tr><td style="padding:8px 0;' + (last ? '' : 'border-bottom:1px solid ' + CONFIG.BORDER_COLOR + ';') + 'font-size:12px;color:#64748b;width:40%;">' + label + '</td>' +
           '<td style="padding:8px 0;' + (last ? '' : 'border-bottom:1px solid ' + CONFIG.BORDER_COLOR + ';') + 'font-size:13px;color:' + (color || CONFIG.DARK_COLOR) + ';font-weight:700;">' + valueHtml + '</td></tr>';
  }

  var body =
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:' + urgencyColor + ';border-radius:12px;margin-bottom:24px;">' +
      '<tr><td style="padding:20px;text-align:center;">' +
        '<p style="margin:0;color:#ffffff;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">' + esc(urgencyLabel) + ' BLOOD REQUEST</p>' +
      '</td></tr>' +
    '</table>' +
    greeting('Dear Fellow Rotaractor,') +
    '<p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">A blood donation request has been raised through the Unity portal. Your immediate response may help save a life. Please check availability and respond urgently.</p>' +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0F4FA;border:2px solid ' + urgencyColor + ';border-radius:12px;margin:24px 0;">' +
      '<tr><td style="padding:24px;">' +
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">' +
          '<tr><td align="center" style="padding-bottom:16px;">' +
            '<div style="display:inline-block;width:80px;height:80px;background:' + urgencyColor + ';border-radius:50%;color:#ffffff;font-size:28px;font-weight:900;line-height:80px;text-align:center;">' + esc(request.blood_group || '?') + '</div>' +
          '</td></tr>' +
          '<tr><td>' +
            '<table cellpadding="0" cellspacing="0" border="0" width="100%">' +
              bRow('Patient Name', esc(request.patient_name || ''), false) +
              bRow('Blood Group', esc(request.blood_group || ''), false, urgencyColor) +
              bRow('Units Required', esc(request.units_needed || 1), false) +
              bRow('Hospital', esc(request.hospital_name || ''), false) +
              bRow('Contact Person', esc(request.contact_person || ''), false) +
              bRow('Contact Number', esc(request.contact_phone || ''), true) +
            '</table>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +
    '</table>';

  var cta = phone ?
    '<a href="tel:' + esc(phone) + '" style="display:inline-block;padding:16px 44px;background:' + urgencyColor + ';color:#ffffff;text-decoration:none;border-radius:12px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;box-shadow:0 6px 20px rgba(10,31,68,0.3);">Call Contact Person</a>' : '';

  var html = buildEmailShell({
    title: urgencyLabel + ' Blood Request',
    preheader: 'Urgent blood donation request - ' + (request.blood_group || ''),
    headerBadge: 'Emergency Alert',
    body: body,
    cta: cta,
    accentColor: urgencyColor,
    signature: getDefaultClubSignature()
  });

  return dispatchEmail({
    recipients: recipients,
    subject: '[URGENT] Blood Request: ' + (request.blood_group || '') + ' - ' + (request.hospital_name || ''),
    html: html
  });
}

// ================================================================
// 9. REPORT APPROVED NOTIFICATION  (includes attendance block)
// ================================================================
function sendReportApproved(payload) {
  var event = payload.event || {};
  var photos = photoListFrom(payload);
  // 'submitted' (default from the portal) or 'approved'
  var isApproved = String(payload.report_status || 'approved').toLowerCase() === 'approved';
  var reportPdfUrl = payload.report_pdf_url || '';
  var reportDocxUrl = payload.report_docx_url || '';
  var recipients = payload.recipients || [memberGroup()];
  var sender = payload.sender;

  var summaryLines =
    esc(event.event_name || '') + '<br>' +
    'Avenue: ' + esc((event.is_dpp || event.avenue_slug === 'dpp') ? 'District Priority Projects' : formatAvenue(event.avenue_slug)) + '<br>' +
    'Date: ' + esc(formatDate(event.date)) +
    (event.venue ? '<br>Venue: ' + esc(event.venue) : '') +
    (event.is_dpp ? '<br>DPP: ' + esc([event.dpp_project_number, event.dpp_pillar, formatDppCategory(event.dpp_category)].filter(Boolean).join(' | ')) : '');

  var body =
    greeting('Dear Fellow Rotaractor,') +
    paragraph('The project report for ' + hl(event.event_name || '') + (isApproved ? ' has been reviewed and formally approved.' : ' has been submitted.') + ' Please find the complete report document' + (photos.length ? ' and photographs' : '') + ' attached for your records.') +
    callout(
      '<p style="margin:0 0 6px;font-size:11px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:800;text-transform:uppercase;letter-spacing:1px;">' + (isApproved ? 'Report Approved' : 'Report Submitted') + '</p>' +
      '<p style="margin:0;font-size:13px;color:' + CONFIG.DARK_COLOR + ';">' + summaryLines + '</p>'
    ) +
    buildReportStatsHtml(event) +
    buildAttendanceHtml(event) +
    buildPhotoGalleryHtml(photos, 'Project Photographs', 2, CONFIG.MAX_PHOTOS_INLINE);

  var html = buildEmailShell({
    title: isApproved ? 'Report Approved' : 'Project Report',
    preheader: (isApproved ? 'Report approved - ' : 'Project report - ') + (event.event_name || ''),
    headerBadge: isApproved ? 'Report Published' : 'Project Report',
    body: body,
    signature: getSignature(sender),
    accentColor: CONFIG.SECONDARY_COLOR
  });

  var attachments = [];
  if (reportPdfUrl) attachments = attachments.concat(collectAttachments([reportPdfUrl], 'Report_' + sanitizeFilename(event.event_name), '.pdf'));
  if (reportDocxUrl) attachments = attachments.concat(collectAttachments([reportDocxUrl], 'Report_' + sanitizeFilename(event.event_name), '.docx'));
  attachments = attachments.concat(decodeFiles(payload.files));
  // Photos go last so the report document always fits inside the size budget
  var photoResult = collectPhotoAttachments(photos, 'Photo_' + sanitizeFilename(event.event_name), blobsSize(attachments));
  attachments = attachments.concat(photoResult.blobs);

  return dispatchEmail({
    recipients: recipients,
    subject: '[Rotaract Unity] ' + (isApproved ? 'Report Approved: ' : 'Project Report: ') + (event.event_name || ''),
    html: html,
    attachments: attachments
  });
}

// ================================================================
// 10. BULLETIN PUBLICATION EMAIL
// ================================================================
function sendBulletinNotification(payload) {
  var bulletin = payload.bulletin || {};
  var recipients = payload.recipients || [memberGroup()];
  var sender = payload.sender;

  var body =
    imageBlock(bulletin.cover_image_url, 'Bulletin Cover', '400px') +
    greeting('Dear Fellow Rotaractor,') +
    paragraph('We are pleased to announce the release of our latest publication ' + hl(bulletin.bulletin_name || '') + (bulletin.edition ? ' - ' + esc(bulletin.edition) : '') + '. This edition chronicles our recent initiatives, project impact, and member achievements.') +
    (bulletin.description ?
      '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border-left:4px solid ' + CONFIG.PRIMARY_COLOR + ';border-radius:8px;margin:24px 0;">' +
        '<tr><td style="padding:18px 24px;">' +
          '<p style="margin:0;font-size:13px;color:#475569;line-height:1.7;font-style:italic;">' + esc(bulletin.description) + '</p>' +
        '</td></tr>' +
      '</table>' : '');

  var cta = isHttpUrl(bulletin.drive_link) ? ctaButton(bulletin.drive_link, 'Read Full Bulletin') : '';

  var html = buildEmailShell({
    title: bulletin.bulletin_name || 'New Bulletin Published',
    preheader: 'Latest edition of our club bulletin is now live',
    headerBadge: 'Publication Release',
    body: body,
    cta: cta,
    signature: getSignature(sender)
  });

  return dispatchEmail({
    recipients: recipients,
    subject: '[Rotaract Unity] New Edition: ' + (bulletin.bulletin_name || 'Bulletin'),
    html: html
  });
}

// ================================================================
// 11. MEMBERSHIP APPROVED EMAIL
// ================================================================
function sendMembershipApproved(payload) {
  var member = payload.member || {};
  var recipients = [member.email];

  var body =
    '<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">' +
      '<img src="' + CONFIG.COLOUR_LOGO + '" width="100" style="margin-bottom:20px;" alt="Unity Logo">' +
      '<h2 style="margin:0;font-family:Poppins,Arial,sans-serif;font-size:28px;font-weight:900;color:' + CONFIG.PRIMARY_COLOR + ';">Welcome to the Family!</h2>' +
    '</td></tr></table>' +
    '<div style="height:28px;"></div>' +
    greeting('Dear ' + (member.full_name || 'New Rotaractor') + ',') +
    paragraph('Congratulations! Your membership application to <strong style="color:' + CONFIG.PRIMARY_COLOR + ';">Rotaract Club of Coimbatore Unity</strong> has been formally approved. We are delighted to welcome you into our vibrant family of changemakers.') +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#F0F4FA,#f8fafc);border:2px solid ' + CONFIG.PRIMARY_COLOR + ';border-radius:16px;margin:28px 0;">' +
      '<tr><td style="padding:28px;">' +
        '<p style="margin:0 0 14px;font-size:11px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:800;text-transform:uppercase;letter-spacing:1.5px;text-align:center;">Your Journey Begins Now</p>' +
        '<p style="margin:0;font-size:13px;color:' + CONFIG.DARK_COLOR + ';line-height:1.8;text-align:center;">You now have access to professional development workshops, networking opportunities, community service initiatives, and a lifelong fellowship with inspiring individuals committed to service above self.</p>' +
      '</td></tr>' +
    '</table>' +
    '<p style="margin:20px 0 0;font-size:13px;color:#475569;line-height:1.7;">Our Membership Chair will connect with you shortly for induction formalities and orientation. In the meantime, feel free to explore our website and connect with fellow Rotaractors.</p>';

  var html = buildEmailShell({
    title: 'Membership Approved',
    preheader: 'Welcome to Rotaract Unity family',
    headerBadge: 'Welcome Note',
    body: body,
    cta: ctaButton(CONFIG.WEBSITE_URL, 'Explore Portal'),
    signature: getDefaultClubSignature()
  });

  return dispatchEmail({
    recipients: recipients,
    subject: 'Welcome to Rotaract Club of Coimbatore Unity, ' + (member.full_name || 'Rotaractor') + '!',
    html: html
  });
}

// ================================================================
// 12. MEMBERSHIP APPLICATION RECEIVED
// ================================================================
function sendMembershipReceivedConfirmation(payload) {
  var member = payload.member || {};
  var recipients = [member.email];

  var body =
    greeting('Dear ' + (member.full_name || 'Applicant') + ',') +
    paragraph('Thank you for your interest in joining <strong style="color:' + CONFIG.PRIMARY_COLOR + ';">Rotaract Club of Coimbatore Unity</strong>. We have successfully received your membership enrollment proposal.') +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border-left:4px solid ' + CONFIG.PRIMARY_COLOR + ';border-radius:8px;margin:24px 0;">' +
      '<tr><td style="padding:20px 24px;">' +
        '<p style="margin:0 0 8px;font-size:11px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:800;text-transform:uppercase;letter-spacing:1px;">Application Received</p>' +
        '<p style="margin:0;font-size:13px;color:#334155;line-height:1.7;">Your application is currently under review by our Membership Chair. You will hear back from us within 7 business days.</p>' +
      '</td></tr>' +
    '</table>' +
    '<p style="margin:20px 0 0;font-size:13px;color:#475569;line-height:1.7;">For any queries, please feel free to reach out to us at <strong style="color:' + CONFIG.PRIMARY_COLOR + ';">' + CONFIG.CLUB_EMAIL + '</strong>.</p>';

  var html = buildEmailShell({
    title: 'Application Received',
    preheader: 'Membership application confirmation',
    headerBadge: 'Confirmation',
    body: body,
    signature: getDefaultClubSignature()
  });

  return dispatchEmail({
    recipients: recipients,
    subject: 'Rotaract Unity - Membership Application Received',
    html: html
  });
}

// ================================================================
// 13. GENERIC EMAIL (Custom text / broadcast without html_body)
// ================================================================
function sendGenericEmail(payload) {
  var recipients = payload.recipients || [];
  var subject = payload.subject || 'Message from Rotaract Unity';
  var bodyContent = payload.body || payload.message || '';
  var sender = payload.sender;
  var attachmentUrls = payload.attachments || payload.attachment_urls || [];

  var body =
    greeting('Dear Fellow Rotaractor,') +
    '<div style="font-size:14px;color:#475569;line-height:1.7;">' + bodyContent + '</div>';

  var html = buildEmailShell({
    title: subject,
    preheader: subject,
    headerBadge: 'Official Message',
    body: body,
    signature: getSignature(sender)
  });

  // Already-prefixed subjects (e.g. "[TEST] ...") are left alone
  var finalSubject = /^\s*\[/.test(subject) ? subject : '[Rotaract Unity] ' + subject;

  return dispatchEmail({
    recipients: recipients,
    subject: finalSubject,
    html: html,
    attachments: collectAttachments(attachmentUrls, 'Attachment').concat(decodeFiles(payload.files))
  });
}

// ================================================================
// SENDER IDENTITY
// ================================================================
/** Name + email of the person who triggered the mail (payload.sender), validated. */
function resolveSender(options) {
  var s = (options && options.sender) || CURRENT_SENDER || null;
  var email = s && typeof s.email === 'string' ? s.email.trim() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) email = '';
  var name = s && s.name ? String(s.name).replace(/[\r\n<>"]/g, '').trim() : '';
  return { email: email, name: name };
}

var _aliasCache = null;
/**
 * True when `email` is a "Send mail as" alias of the account that owns this
 * script (Gmail > Settings > Accounts > Send mail as). Only then can Gmail
 * send FROM that address.
 */
function isSendAsAlias(email) {
  try {
    var key = String(email).toLowerCase();
    var owner = '';
    try { owner = Session.getEffectiveUser().getEmail().toLowerCase(); } catch (e0) {}
    if (key === owner) return false; // already the sending account
    if (_aliasCache === null) {
      _aliasCache = (GmailApp.getAliases() || []).map(function (a) { return String(a).toLowerCase(); });
    }
    return _aliasCache.indexOf(key) !== -1;
  } catch (e) {
    console.warn('[GAS Mail] Alias check unavailable (authorize Gmail by running testSenderIdentity):', e);
    return false;
  }
}

// ================================================================
// EMAIL DISPATCH HELPER
// ================================================================
/**
 * options: { recipients: string|string[], subject, html, attachments: Blob[], sender?: {name,email} }
 *
 * - Recipients: normally ONE group address (members or board group), so one
 *   message goes out. Several individual addresses each get their own message.
 * - Sender: display name = the person who triggered the mail; Reply-To = their
 *   email. If their address is a Send-mail-as alias of this account, the mail is
 *   sent FROM that address; otherwise it is sent from this account.
 * - The result lists who was sent and who failed.
 */
function dispatchEmail(options) {
  try {
    var subject = options.subject || '';
    var html = options.html || '';
    var attachments = options.attachments || [];

    var recipients = normalizeRecipients(options.recipients);

    if (recipients.length === 0) {
      return { success: false, error: 'No valid recipients specified' };
    }

    var remaining = safeQuota();
    if (remaining !== null && remaining < recipients.length) {
      return {
        success: false,
        error: 'Daily email quota too low: ' + remaining + ' remaining, ' + recipients.length + ' recipients requested.',
        remaining_daily_quota: remaining
      };
    }

    var plain = htmlToText(html);
    var who = resolveSender(options);
    var displayName = who.name ? who.name + ' | ' + CONFIG.CLUB_NAME : CONFIG.CLUB_NAME;
    var replyTo = who.email || CONFIG.CLUB_EMAIL;
    var fromAlias = who.email && isSendAsAlias(who.email) ? who.email : '';

    var base = {
      subject: subject,
      body: plain,
      htmlBody: html,
      name: displayName,
      replyTo: replyTo
    };
    if (attachments.length > 0) base.attachments = attachments;

    var sent = [];
    var failed = [];
    var startedAt = new Date().getTime();
    var TIME_BUDGET_MS = 5 * 60 * 1000; // Apps Script stops a run at 6 minutes

    function viaMailApp(to) {
      var msg = copyObject(base);
      msg.to = to;
      MailApp.sendEmail(msg);
    }

    for (var i = 0; i < recipients.length; i++) {
      if (new Date().getTime() - startedAt > TIME_BUDGET_MS) {
        for (var k = i; k < recipients.length; k++) {
          failed.push({ email: recipients[k], error: 'Not attempted: time limit reached' });
        }
        break;
      }
      try {
        if (fromAlias) {
          try {
            GmailApp.sendEmail(recipients[i], subject, plain, {
              htmlBody: html,
              name: displayName,
              replyTo: replyTo,
              from: fromAlias,
              attachments: attachments
            });
          } catch (aliasErr) {
            console.warn('[GAS Mail] Send-as failed, using the script account instead:', aliasErr);
            fromAlias = '';
            viaMailApp(recipients[i]);
          }
        } else {
          viaMailApp(recipients[i]);
        }
        sent.push(recipients[i]);
      } catch (sendErr) {
        console.error('[GAS Mail] Could not send to ' + recipients[i] + ':', sendErr);
        failed.push({ email: recipients[i], error: String(sendErr) });
      }
    }

    var sentAs = '';
    try { sentAs = fromAlias || Session.getEffectiveUser().getEmail(); } catch (e1) {}
    console.log('[GAS Mail] "' + subject + '" sent=' + sent.length + ' failed=' + failed.length + ' from=' + sentAs + ' replyTo=' + replyTo);

    if (sent.length === 0) {
      return {
        success: false,
        error: 'No email could be sent. First error: ' + (failed[0] ? failed[0].error : 'unknown'),
        failed_count: failed.length,
        failed: failed.slice(0, 20)
      };
    }

    return {
      success: true,
      recipients_count: sent.length,
      messages_sent: sent.length,
      failed_count: failed.length,
      failed: failed.slice(0, 20),
      sent_to: sent,
      sent_as: sentAs,
      reply_to: replyTo,
      subject: subject,
      sent_at: new Date().toISOString()
    };

  } catch (err) {
    console.error('[GAS Mail] dispatchEmail failed:', err);
    return { success: false, error: err.toString() };
  }
}

function normalizeRecipients(input) {
  var list = [];
  if (typeof input === 'string') list = input.split(/[,;\s]+/);
  else if (Array.isArray(input)) {
    for (var i = 0; i < input.length; i++) {
      var item = input[i];
      if (item && typeof item === 'object') item = item.email;
      if (typeof item === 'string') list = list.concat(item.split(/[,;\s]+/));
    }
  }
  var seen = {};
  var out = [];
  for (var j = 0; j < list.length; j++) {
    var addr = String(list[j] || '').trim();
    var key = addr.toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr) && !seen[key]) {
      seen[key] = true;
      out.push(addr);
    }
  }
  return out;
}

function safeQuota() {
  try { return MailApp.getRemainingDailyQuota(); } catch (e) { return null; }
}

function copyObject(o) {
  var c = {};
  for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) c[k] = o[k]; }
  return c;
}

// ================================================================
// FILES (base64 from the portal) + PHOTO HELPERS
// ================================================================
/**
 * payload.files = [{ name: 'Minutes.pdf', mime: 'application/pdf', base64: '...' }]
 * Used for documents the portal generates itself (agenda / minutes / report PDFs).
 */
function decodeFiles(files) {
  var out = [];
  if (!Array.isArray(files)) return out;
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!f || !f.base64) continue;
    try {
      var b64 = String(f.base64).replace(/^data:[^;]+;base64,/, '');
      var name = String(f.name || ('Attachment_' + (i + 1) + '.pdf')).replace(/[\\\/:*?"<>|]/g, '_');
      var mime = f.mime || 'application/octet-stream';
      out.push(Utilities.newBlob(Utilities.base64Decode(b64), mime, name));
    } catch (err) {
      console.warn('[GAS Mail] Could not decode file #' + (i + 1) + ':', err);
    }
  }
  return out;
}

function blobsSize(blobs) {
  var total = 0;
  for (var i = 0; i < (blobs || []).length; i++) {
    try { total += blobs[i].getBytes().length; } catch (e) {}
  }
  return total;
}

/** Normalises payload.photos ([{url,caption}] or strings) + payload.photo_urls into [{url, caption}] */
function photoListFrom(payload) {
  var raw = [].concat(payload.photos || [], payload.photo_urls || []);
  var out = [];
  var seen = {};
  for (var i = 0; i < raw.length; i++) {
    var it = raw[i];
    var url = (typeof it === 'string') ? it : (it && (it.url || it.photo_url));
    if (!isHttpUrl(url)) continue;
    url = String(url).trim();
    if (seen[url]) continue;
    seen[url] = true;
    out.push({ url: url, caption: (it && typeof it === 'object' && it.caption) ? String(it.caption) : '' });
  }
  return out;
}

/** Responsive-ish photo grid (table based, email safe). */
function buildPhotoGalleryHtml(photos, title, perRow, max) {
  photos = (photos || []).slice(0, max || CONFIG.MAX_PHOTOS_INLINE);
  if (!photos.length) return '';
  perRow = perRow || 2;
  var width = Math.floor(100 / perRow);
  var html =
    '<p style="margin:28px 0 12px;font-size:12px;color:' + CONFIG.PRIMARY_COLOR + ';font-weight:700;text-transform:uppercase;letter-spacing:1px;">' + esc(title || 'Photographs') + '</p>' +
    '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">';
  for (var i = 0; i < photos.length; i += perRow) {
    html += '<tr>';
    for (var j = 0; j < perRow; j++) {
      var ph = photos[i + j];
      if (ph) {
        html +=
          '<td width="' + width + '%" style="padding:4px;vertical-align:top;">' +
            '<img src="' + esc(ph.url) + '" width="100%" style="width:100%;height:auto;border-radius:8px;display:block;" alt="Photo ' + (i + j + 1) + '">' +
            (ph.caption ? '<p style="margin:4px 2px 0;font-size:10px;color:#64748b;line-height:1.4;">' + esc(ph.caption) + '</p>' : '') +
          '</td>';
      } else {
        html += '<td width="' + width + '%" style="padding:4px;"></td>';
      }
    }
    html += '</tr>';
  }
  return html + '</table>';
}

/**
 * Downloads photos as attachments while staying inside the byte budget.
 * Returns { blobs: Blob[], attached: n, skipped: n }.
 */
function collectPhotoAttachments(photos, baseName, usedBytes) {
  var res = { blobs: [], attached: 0, skipped: 0 };
  var budget = CONFIG.MAX_ATTACHMENT_BYTES - (usedBytes || 0);
  var list = (photos || []).slice(0, CONFIG.MAX_PHOTOS_INLINE);
  for (var i = 0; i < list.length; i++) {
    try {
      var resp = UrlFetchApp.fetch(list[i].url, { muteHttpExceptions: true, followRedirects: true });
      if (resp.getResponseCode() !== 200) { res.skipped++; continue; }
      var blob = resp.getBlob();
      var size = blob.getBytes().length;
      if (size > budget) { res.skipped++; continue; }
      budget -= size;
      blob.setName((baseName || 'Photo') + '_' + (i + 1) + guessExtension(blob.getContentType(), list[i].url));
      res.blobs.push(blob);
      res.attached++;
    } catch (err) {
      res.skipped++;
      console.warn('[GAS Mail] Photo attach error:', err);
    }
  }
  return res;
}

// ================================================================
// ATTACHMENT HELPERS
// ================================================================
/**
 * Downloads each http(s) URL into a Blob. Data URIs, bad URLs and failed
 * downloads are skipped (logged) so one broken file never blocks the email.
 * baseName: file name (extension optional); ext: forced extension (e.g. '.pdf').
 */
function collectAttachments(urls, baseName, ext) {
  var blobs = [];
  if (!urls) return blobs;
  if (!Array.isArray(urls)) urls = [urls];
  var n = 0;
  for (var i = 0; i < urls.length; i++) {
    var url = urls[i];
    if (!isHttpUrl(url)) continue;
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      if (resp.getResponseCode() !== 200) {
        console.warn('[GAS Mail] Attachment HTTP ' + resp.getResponseCode() + ' for ' + url);
        continue;
      }
      var blob = resp.getBlob();
      n++;
      var name = baseName || 'Attachment';
      if (urls.length > 1) name += '_' + n;
      var extension = ext || guessExtension(blob.getContentType(), url);
      if (!/\.[A-Za-z0-9]{2,5}$/.test(name)) name += extension;
      blob.setName(name);
      blobs.push(blob);
    } catch (err) {
      console.warn('[GAS Mail] Attachment download error:', err);
    }
  }
  return blobs;
}

function guessExtension(contentType, url) {
  var ct = String(contentType || '').toLowerCase();
  if (ct.indexOf('pdf') !== -1) return '.pdf';
  if (ct.indexOf('png') !== -1) return '.png';
  if (ct.indexOf('jpeg') !== -1 || ct.indexOf('jpg') !== -1) return '.jpg';
  if (ct.indexOf('webp') !== -1) return '.webp';
  if (ct.indexOf('spreadsheetml') !== -1) return '.xlsx';
  if (ct.indexOf('wordprocessingml') !== -1) return '.docx';
  var m = String(url || '').split('?')[0].match(/\.([A-Za-z0-9]{2,5})$/);
  return m ? '.' + m[1].toLowerCase() : '.jpg';
}

// ================================================================
// MAIL GROUPS (addresses entered in the portal)
// ================================================================
/**
 * Returns the group address saved in the portal (system_settings keys
 * mail_group_members / mail_group_board). Cached for 10 minutes.
 * kind: 'members' | 'board'. Falls back to CONFIG.MEMBER_GROUP / BOARD_GROUP.
 */
function getMailGroupInfo(kind) {
  var isBoard = kind === 'board';
  var fallback = isBoard ? CONFIG.BOARD_GROUP : CONFIG.MEMBER_GROUP;
  var key = isBoard ? 'mail_group_board' : 'mail_group_members';
  try {
    var cache = CacheService.getScriptCache();
    var hit = cache.get('grp_' + key);
    if (hit) return { address: hit, source: 'portal settings (cached)' };
    var rows = supabaseGetAll('system_settings', 'select=key,value&key=eq.' + key);
    var v = rows && rows[0] ? String(rows[0].value || '').trim() : '';
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      cache.put('grp_' + key, v, 600);
      return { address: v, source: 'portal settings' };
    }
  } catch (e) {
    console.warn('[GAS Mail] Mail group lookup failed, using fallback for ' + key + ':', e);
  }
  return { address: fallback, source: 'FALLBACK (CONFIG): portal value missing, invalid or unreadable' };
}

function getMailGroup(kind) { return getMailGroupInfo(kind).address; }

/**
 * Default recipients for meeting mails when the portal sent none:
 * Board meeting -> Board Members group, General Body -> All Members group.
 * An EMERGENCY meeting never falls back to a group (it goes only to the members selected for it).
 */
function meetingDefaultRecipients(payload, meeting) {
  if (payload.recipients && payload.recipients.length) return payload.recipients;
  var t = (payload.meeting_type || (meeting && meeting.meeting_type) || '');
  if (t === 'emergency') return [];
  return [t === 'board_meeting' ? boardGroup() : memberGroup()];
}

function memberGroup() { return getMailGroup('members'); }
function boardGroup() { return getMailGroup('board'); }

// ================================================================
// UTILITY HELPERS
// ================================================================
/** HTML-escape any value */
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isHttpUrl(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u.trim());
}

function toInt(v) {
  var n = parseInt(v, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 20000);
}

/** Accepts 'YYYY-MM-DD' (or ISO) and returns e.g. 'Monday, 5 October 2026' */
function formatDate(dateStr) {
  if (!dateStr) return 'TBA';
  try {
    var m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    var d = m
      ? new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)))
      : new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return Utilities.formatDate(d, m ? 'UTC' : CONFIG.TIMEZONE, 'EEEE, d MMMM yyyy');
  } catch (e) { return String(dateStr); }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    var parts = String(timeStr).split(':');
    var hours = parseInt(parts[0], 10);
    if (isNaN(hours)) return String(timeStr);
    var minutes = (parts[1] || '00').substring(0, 2);
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return hours + ':' + minutes + ' ' + ampm;
  } catch (e) { return String(timeStr); }
}

/** Indian digit grouping: 1234567.5 -> 12,34,567.50 */
function formatMoney(amount) {
  var num = parseFloat(amount) || 0;
  var neg = num < 0;
  num = Math.abs(num);
  var parts = num.toFixed(2).split('.');
  var intPart = parts[0];
  var last3 = intPart.slice(-3);
  var rest = intPart.slice(0, -3);
  if (rest) last3 = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  return (neg ? '-' : '') + last3 + '.' + parts[1];
}

function formatAvenue(slug) {
  var map = {
    'club_service': 'Club Service',
    'community_service': 'Community Service',
    'professional_service': 'Professional Service',
    'international_service': 'International Service',
    'dpp': 'District Priority Projects'
  };
  return map[slug] || String(slug || '').replace(/_/g, ' ');
}

function formatCollabType(type) {
  var map = {
    'rotaract': 'Rotaract Club',
    'interact': 'Interact Club',
    'rotary': 'Rotary Club',
    'ngo': 'NGO',
    'others': 'Partner Organization'
  };
  if (map[type]) return map[type];
  // Unknown value: tidy it up (co_hosted -> Co Hosted)
  return String(type || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

/** Report form saves 'A' / 'B' / 'C'; event form saves the full label. Show a clean label for both. */
function formatDppCategory(value) {
  if (!value) return '';
  var str = String(value).trim();
  var labels = {
    'A': 'Category A - Awareness & Education',
    'B': 'Category B - Hands-On Direct Service',
    'C': 'Category C - Sustainable Community Impact'
  };
  if (/^[ABC]$/i.test(str)) return labels[str.toUpperCase()];
  return str;
}

function formatRole(role) {
  var map = {
    'super_admin': 'Super Administrator',
    'president': 'President',
    'ipp': 'Immediate Past President',
    'vice_president': 'Vice President',
    'secretary': 'Secretary',
    'secretary_admin': 'Secretary - Administration',
    'secretary_comm': 'Secretary - Communication',
    'treasurer': 'Treasurer',
    'advisor': 'Advisor',
    'dpp_chair': 'District Priority Projects Chair',
    'blood_donor_chair': 'Blood Donor Chair',
    'club_editor': 'Club Editor',
    'public_image_chair': 'Public Image Chair',
    'membership_chair': 'Membership Chair',
    'trf_chair': 'The Rotary Foundation Chair',
    'avenue_director': 'Avenue Director',
    'avenue_chair': 'Avenue Chair',
    'young_leaders_contact': 'Young Leaders Contact'
  };
  return map[role] || String(role || '').replace(/_/g, ' ');
}

function getRotaryYear() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  if (month < 6) return (year - 1) + '-' + String(year).slice(2);
  return year + '-' + String(year + 1).slice(2);
}

function sanitizeFilename(str) {
  if (!str) return 'file';
  return String(str).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
}

/** Google Calendar "Add to Calendar" link with valid HHmmss time stamps (IST). */
function buildCalendarLink(event) {
  event = event || {};
  var dateDigits = String(event.date || '').replace(/-/g, '').substring(0, 8);
  var base = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(event.event_name || '') +
    '&details=' + encodeURIComponent((event.description || '') + ' - ' + CONFIG.CLUB_NAME) +
    '&location=' + encodeURIComponent(event.venue || '') +
    '&ctz=' + encodeURIComponent(CONFIG.TIMEZONE);

  if (dateDigits.length !== 8) return base;

  var start = toHms(event.start_time, '090000');
  var end = event.end_time ? toHms(event.end_time, '') : '';
  if (!end || end <= start) {
    var h = Math.min(parseInt(start.substring(0, 2), 10) + 2, 23);
    end = (h < 10 ? '0' + h : String(h)) + start.substring(2);
  }
  return base + '&dates=' + dateDigits + 'T' + start + '/' + dateDigits + 'T' + end;
}

function toHms(timeStr, fallback) {
  if (!timeStr) return fallback;
  var p = String(timeStr).split(':');
  var h = parseInt(p[0], 10);
  var m = parseInt(p[1], 10) || 0;
  var s = parseInt(p[2], 10) || 0;
  if (isNaN(h)) return fallback;
  function two(n) { return n < 10 ? '0' + n : String(n); }
  return two(h) + two(m) + two(s);
}

// ================================================================
// MONTHLY TREASURY STATEMENT (automatic, 1st of every month)
// ================================================================
/**
 * ONE-TIME SETUP
 *  1. Project Settings -> Script properties -> add
 *       SUPABASE_SERVICE_KEY = <Supabase service_role key>
 *     (needed because the treasury table is not readable with the public
 *      key; Script Properties are private to this project).
 *     Optional: TREASURY_RECIPIENTS = a@x.com,b@x.com  (default: member group)
 *  2. Run setupMonthlyTreasuryTrigger() once and accept the permission prompt
 *     (Sheets + Drive are used to build the Excel file).
 *  3. Run testMonthlyTreasury() to send the previous month's statement to yourself.
 */
function setupMonthlyTreasuryTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'monthlyTreasuryStatement') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('monthlyTreasuryStatement')
    .timeBased()
    .onMonthDay(1)
    .atHour(8)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
  console.log('[Trigger Setup] Monthly treasury statement scheduled: 1st of every month, ~8:00 AM IST');
}

/** Installs every scheduled job (birthdays + monthly treasury). */
function setupAllTriggers() {
  setupDailyBirthdayTrigger();
  setupMonthlyTreasuryTrigger();
}

/** Trigger entry point: statement for the month that just ended (IST). */
function monthlyTreasuryStatement() {
  if (!isMailSwitchOn('auto_monthly_treasury')) {
    console.log('[Treasury] Auto-send is OFF in Site Settings. Nothing sent.');
    return { success: true, skipped: true, reason: 'switched off' };
  }
  var ym = previousMonthYM(new Date());
  return sendTreasuryStatementForMonth(ym, false);
}

/** 'YYYY-MM' of the month before `now` (calendar of Asia/Kolkata). */
function previousMonthYM(now) {
  var y = parseInt(Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy'), 10);
  var m = parseInt(Utilities.formatDate(now, CONFIG.TIMEZONE, 'MM'), 10);
  m -= 1;
  if (m === 0) { m = 12; y -= 1; }
  return y + '-' + (m < 10 ? '0' + m : String(m));
}

/**
 * Builds and emails the statement for ym = 'YYYY-MM'.
 * force=true re-sends even if that month was already sent.
 * Throws on failure (Apps Script then shows the failure and can email you about it).
 */
function sendTreasuryStatementForMonth(ym, force, overrideRecipients) {
  var props = PropertiesService.getScriptProperties();
  if (!/^\d{4}-\d{2}$/.test(String(ym))) throw new Error('Month must look like 2026-09');

  if (!force && props.getProperty('LAST_TREASURY_SENT') === ym) {
    console.log('[Treasury] ' + ym + ' already sent. Skipping (use force to resend).');
    return { success: true, skipped: true, month: ym };
  }

  try {
    var y = parseInt(ym.substring(0, 4), 10);
    var m = parseInt(ym.substring(5, 7), 10);
    var start = ym + '-01';
    var nextY = m === 12 ? y + 1 : y;
    var nextM = m === 12 ? 1 : m + 1;
    var nextStart = nextY + '-' + (nextM < 10 ? '0' + nextM : nextM) + '-01';
    var monthLabel = Utilities.formatDate(new Date(Date.UTC(y, m - 1, 1)), 'UTC', 'MMMM yyyy');

    var haveServiceKey = !!props.getProperty('SUPABASE_SERVICE_KEY');

    // 1. This month's rows + everything before it (for the opening balance)
    // Opening balance set in the portal (Treasury > Opening Balance)
    var ob = getTreasuryOpeningConfig();
    var rowsFrom = (ob.date && ob.date > start) ? ob.date : start;
    var monthRows = supabaseGetAll('treasury',
      'select=transaction_date,particular,description,income,expense,category,approved,created_at' +
      '&transaction_date=gte.' + rowsFrom + '&transaction_date=lt.' + nextStart +
      '&order=transaction_date.asc,created_at.asc');
    var priorRows = supabaseGetAll('treasury',
      'select=income,expense&approved=eq.true&transaction_date=lt.' + start +
      (ob.date ? '&transaction_date=gte.' + ob.date : ''));

    if (!haveServiceKey && monthRows.length === 0 && priorRows.length === 0) {
      throw new Error('No treasury rows were returned. The table is probably protected: add the Script Property SUPABASE_SERVICE_KEY.');
    }

    var stats = computeTreasuryStats(monthRows, priorRows, ob.amount);

    // 2. Excel ledger
    var xlsx = buildTreasuryWorkbook(monthLabel, ym, monthRows, stats);

    // 3. Email
    var recipients = overrideRecipients;
    if (!recipients || !recipients.length) {
      var custom = props.getProperty('TREASURY_RECIPIENTS');
      recipients = custom ? custom.split(/[,;\s]+/) : [memberGroup()];
    }

    var autoSender = resolveSignatory('monthly_treasury_statement', {});
    if (autoSender) CURRENT_SENDER = autoSender;
    var result = sendTreasuryStatement({
      sender: autoSender,
      month: monthLabel,
      total_income: stats.income,
      total_expense: stats.expense,
      net_balance: stats.net,
      transaction_count: stats.approvedCount,
      pending_count: stats.pendingCount,
      opening_balance: stats.opening,
      closing_balance: stats.closing,
      recipients: recipients,
      _blobs: [xlsx]
    });

    if (!result.success) throw new Error(result.error || 'Email dispatch failed');

    if (!overrideRecipients) props.setProperty('LAST_TREASURY_SENT', ym);
    console.log('[Treasury] Sent ' + monthLabel + ' to ' + result.recipients_count + ' recipient(s).');
    result.month = ym;
    return result;

  } catch (err) {
    console.error('[Treasury] Statement for ' + ym + ' failed:', err);
    try {
      MailApp.sendEmail({
        to: CONFIG.CLUB_EMAIL,
        subject: '[Rotaract Unity] Treasury statement FAILED for ' + ym,
        body: 'The automatic monthly treasury statement for ' + ym + ' could not be sent.\n\nReason: ' + err + '\n\nFix the cause, then run sendTreasuryStatementForMonth("' + ym + '", true) from the Apps Script editor.'
      });
    } catch (mailErr) {}
    throw err;
  }
}

/** Opening balance saved from the portal (system_settings). Returns {amount, date}. */
function getTreasuryOpeningConfig() {
  var cfg = { amount: 0, date: '' };
  try {
    var rows = supabaseGetAll('system_settings',
      'select=key,value&key=in.(treasury_opening_balance,treasury_opening_date)');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].key === 'treasury_opening_balance') cfg.amount = parseFloat(rows[i].value) || 0;
      if (rows[i].key === 'treasury_opening_date') cfg.date = String(rows[i].value || '').substring(0, 10);
    }
  } catch (e) {
    console.warn('[Treasury] Opening balance not loaded: ' + e);
  }
  return cfg;
}

/** Only approved rows count, same rule as the portal's running balance. */
function computeTreasuryStats(monthRows, priorRows, openingBase) {
  var income = 0, expense = 0, approvedCount = 0, pendingCount = 0, opening = parseFloat(openingBase) || 0;
  var categories = {};

  for (var i = 0; i < priorRows.length; i++) {
    opening += (parseFloat(priorRows[i].income) || 0) - (parseFloat(priorRows[i].expense) || 0);
  }
  for (var j = 0; j < monthRows.length; j++) {
    var r = monthRows[j];
    if (!r.approved) { pendingCount++; continue; }
    var inc = parseFloat(r.income) || 0;
    var exp = parseFloat(r.expense) || 0;
    income += inc;
    expense += exp;
    approvedCount++;
    var cat = r.category || 'Uncategorised';
    if (!categories[cat]) categories[cat] = { income: 0, expense: 0 };
    categories[cat].income += inc;
    categories[cat].expense += exp;
  }
  return {
    income: income, expense: expense, net: income - expense,
    approvedCount: approvedCount, pendingCount: pendingCount,
    opening: opening, closing: opening + income - expense,
    categories: categories
  };
}

/** Reads every row of a Supabase table through the REST API (handles the 1000-row page limit). */
function supabaseGetAll(table, query) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('SUPABASE_SERVICE_KEY') || props.getProperty('SUPABASE_ANON_KEY') || SUPABASE_FALLBACK_KEY;
  var base = props.getProperty('SUPABASE_URL') || CONFIG.SUPABASE_BASE_URL;
  var out = [];
  var pageSize = 1000;
  for (var offset = 0; offset < 50000; offset += pageSize) {
    var url = base + '/rest/v1/' + table + '?' + query + '&limit=' + pageSize + '&offset=' + offset;
    var resp = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key },
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    if (code !== 200) throw new Error('Supabase ' + table + ' request failed (HTTP ' + code + '): ' + String(resp.getContentText()).substring(0, 200));
    var page = JSON.parse(resp.getContentText());
    out = out.concat(page);
    if (page.length < pageSize) break;
  }
  return out;
}

/** Creates a formatted workbook (Summary + Ledger) and returns it as an .xlsx Blob. */
function buildTreasuryWorkbook(monthLabel, ym, rows, stats) {
  var ss = SpreadsheetApp.create('Treasury ' + ym + ' (temporary)');
  var id = ss.getId();
  try {
    var NAVY = '#0A1F44', ROYAL = '#17458F', LIGHT = '#EEF3FB', ZEBRA = '#F8FAFD', LINE = '#D6E0F0';
    var INK = '#1F2937', MUTED = '#64748B', GREEN = '#15803D', RED = '#B91C1C', AMBER = '#B45309';
    var SOLID = SpreadsheetApp.BorderStyle.SOLID;

    // ---- Summary sheet
    var sum = ss.getSheets()[0];
    sum.setName('Summary');
    sum.setHiddenGridlines(true);
    var sumRows = [
      [CONFIG.CLUB_NAME, '', ''],
      ['Monthly Treasury Statement - ' + monthLabel, '', ''],
      [CONFIG.DISTRICT + '  |  Club ID ' + CONFIG.CLUB_ID, '', ''],
      ['', '', ''],
      ['Opening balance (Rs)', stats.opening, ''],
      ['Total income (Rs)', stats.income, ''],
      ['Total expense (Rs)', stats.expense, ''],
      ['Net for the month (Rs)', stats.net, ''],
      ['Closing balance (Rs)', stats.closing, ''],
      ['Approved transactions', stats.approvedCount, ''],
      ['Pending (excluded)', stats.pendingCount, ''],
      ['', '', ''],
      ['Category', 'Income (Rs)', 'Expense (Rs)']
    ];
    var cats = Object.keys(stats.categories).sort();
    for (var c = 0; c < cats.length; c++) {
      sumRows.push([cats[c], stats.categories[cats[c]].income, stats.categories[cats[c]].expense]);
    }
    if (cats.length) sumRows.push(['Total', stats.income, stats.expense]);
    var sumAll = sum.getRange(1, 1, sumRows.length, 3);
    sumAll.setValues(sumRows).setFontFamily('Calibri').setFontSize(11).setFontColor(INK).setVerticalAlignment('middle');

    // Banner
    sum.getRange(1, 1, 1, 3).merge().setBackground(NAVY).setFontColor('#ffffff').setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
    sum.getRange(2, 1, 1, 3).merge().setBackground(ROYAL).setFontColor('#ffffff').setFontSize(12).setFontWeight('bold').setHorizontalAlignment('center');
    sum.getRange(3, 1, 1, 3).merge().setBackground(LIGHT).setFontColor(MUTED).setFontSize(10).setFontStyle('italic').setHorizontalAlignment('center');
    sum.setRowHeight(1, 38); sum.setRowHeight(2, 28); sum.setRowHeight(3, 24); sum.setRowHeight(4, 10);

    // Key figures (rows 5-11): label left, value right, hairline between rows
    var kf = sum.getRange(5, 1, 7, 2);
    kf.setBorder(true, true, true, true, false, true, LINE, SOLID);
    sum.getRange(5, 1, 7, 1).setFontWeight('bold').setHorizontalAlignment('left');
    sum.getRange(5, 2, 5, 1).setNumberFormat('#,##0.00').setHorizontalAlignment('right');
    sum.getRange(10, 2, 2, 1).setNumberFormat('0').setHorizontalAlignment('right');
    sum.getRange(6, 2).setFontColor(GREEN).setFontWeight('bold');
    sum.getRange(7, 2).setFontColor(RED).setFontWeight('bold');
    sum.getRange(8, 2).setFontColor(stats.net >= 0 ? GREEN : RED).setFontWeight('bold');
    sum.getRange(9, 1, 1, 2).setBackground(LIGHT).setFontWeight('bold').setFontSize(12).setFontColor(NAVY);
    sum.getRange(9, 1, 1, 2).setBorder(true, null, true, null, null, null, ROYAL, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sum.getRange(10, 1, 2, 2).setFontColor(MUTED);
    for (var kr = 5; kr <= 11; kr++) sum.setRowHeight(kr, 24);
    sum.setRowHeight(12, 14);

    // Category table (header row 13)
    sum.getRange(13, 1, 1, 3).setBackground(NAVY).setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    sum.getRange(13, 1).setHorizontalAlignment('left');
    sum.setRowHeight(13, 26);
    if (cats.length) {
      var cLast = 13 + cats.length;           // last category row
      var catBody = sum.getRange(14, 1, cats.length, 3);
      var zebra = [];
      for (var z = 0; z < cats.length; z++) zebra.push(z % 2 ? [ZEBRA, ZEBRA, ZEBRA] : ['#ffffff', '#ffffff', '#ffffff']);
      catBody.setBackgrounds(zebra);
      sum.getRange(14, 1, cats.length, 1).setHorizontalAlignment('left');
      sum.getRange(14, 2, cats.length + 1, 2).setNumberFormat('#,##0.00').setHorizontalAlignment('right');
      sum.getRange(14, 2, cats.length, 1).setFontColor(GREEN);
      sum.getRange(14, 3, cats.length, 1).setFontColor(RED);
      var tot = sum.getRange(cLast + 1, 1, 1, 3);
      tot.setBackground(LIGHT).setFontWeight('bold').setFontColor(NAVY);
      sum.getRange(cLast + 1, 1).setHorizontalAlignment('left');
      sum.getRange(13, 1, cats.length + 2, 3).setBorder(true, true, true, true, false, true, LINE, SOLID);
      tot.setBorder(true, null, null, null, null, null, ROYAL, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      for (var cr = 14; cr <= cLast + 1; cr++) sum.setRowHeight(cr, 22);
    }
    sum.setColumnWidth(1, 270); sum.setColumnWidth(2, 150); sum.setColumnWidth(3, 150);

    // ---- Ledger sheet
    var led = ss.insertSheet('Ledger');
    led.setHiddenGridlines(true);
    var header = ['S.No', 'Date', 'Particular', 'Description', 'Category', 'Income (Rs)', 'Expense (Rs)', 'Balance (Rs)', 'Status'];
    var data = [header];
    var run = stats.opening;
    data.push(['', '', 'Opening balance', '', '', '', '', run, '']);
    var n = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var inc = parseFloat(r.income) || 0, exp = parseFloat(r.expense) || 0;
      if (r.approved) run += inc - exp;
      n++;
      data.push([n, formatDate(r.transaction_date), r.particular || '', r.description || '', r.category || '',
        inc || '', exp || '', r.approved ? run : '', r.approved ? 'Approved' : 'Pending']);
    }
    data.push(['', '', 'TOTAL (approved)', '', '', stats.income, stats.expense, stats.closing, '']);
    var rowsN = data.length, colsN = header.length;
    var all = led.getRange(1, 1, rowsN, colsN);
    all.setValues(data).setFontFamily('Calibri').setFontSize(10).setFontColor(INK).setVerticalAlignment('middle');
    all.setBorder(true, true, true, true, true, true, LINE, SOLID);

    // Header
    led.getRange(1, 1, 1, colsN).setBackground(NAVY).setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    led.setRowHeight(1, 28);

    // Body: zebra rows, text wrap, alignment
    var bgs = [], fcs = [];
    for (var b = 2; b <= rowsN; b++) {
      var bg = (b === 2 || b === rowsN) ? LIGHT : (b % 2 ? ZEBRA : '#ffffff');
      var bgRow = [], fcRow = [];
      for (var k = 0; k < colsN; k++) { bgRow.push(bg); fcRow.push(INK); }
      if (b > 2 && b < rowsN) {
        var rec = data[b - 1];
        if (rec[5] !== '') fcRow[5] = GREEN;
        if (rec[6] !== '') fcRow[6] = RED;
        fcRow[8] = rec[8] === 'Pending' ? AMBER : GREEN;
      }
      bgs.push(bgRow); fcs.push(fcRow);
    }
    var body = led.getRange(2, 1, rowsN - 1, colsN);
    body.setBackgrounds(bgs).setFontColors(fcs).setWrap(true);
    led.getRange(2, 1, rowsN - 1, 2).setHorizontalAlignment('center');      // S.No, Date
    led.getRange(2, 3, rowsN - 1, 3).setHorizontalAlignment('left');        // text columns
    led.getRange(2, 6, rowsN - 1, 3).setNumberFormat('#,##0.00').setHorizontalAlignment('right');
    led.getRange(2, 9, rowsN - 1, 1).setHorizontalAlignment('center').setFontWeight('bold');
    led.getRange(2, 1, 1, colsN).setFontStyle('italic');                      // opening balance
    var totRow = led.getRange(rowsN, 1, 1, colsN);
    totRow.setFontWeight('bold').setFontColor(NAVY);
    totRow.setBorder(true, null, null, null, null, null, ROYAL, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    led.getRange(rowsN, 6, 1, 1).setFontColor(GREEN);
    led.getRange(rowsN, 7, 1, 1).setFontColor(RED);

    led.setFrozenRows(1);
    if (rowsN > 3) led.getRange(1, 1, rowsN - 1, colsN).createFilter();
    led.setColumnWidth(1, 55); led.setColumnWidth(2, 105); led.setColumnWidth(3, 220);
    led.setColumnWidth(4, 280); led.setColumnWidth(5, 140); led.setColumnWidths(6, 3, 120); led.setColumnWidth(9, 95);

    SpreadsheetApp.flush();

    var resp = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx', {
      headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) throw new Error('Excel export failed (HTTP ' + resp.getResponseCode() + ')');
    var blob = resp.getBlob();
    blob.setName('Treasury_Statement_' + ym.replace('-', '_') + '.xlsx');
    return blob;
  } finally {
    try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
  }
}

// ================================================================
// SCHEDULED AUTOMATED TRIGGERS
// ================================================================
function setupDailyBirthdayTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyBirthdayCheck') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('dailyBirthdayCheck')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
  console.log('[Trigger Setup] Daily birthday execution scheduled for 8:00 AM IST');
}

/**
 * Calls the Supabase "birthday-check" edge function.
 * Tip: store the key in Project Settings -> Script properties as SUPABASE_ANON_KEY;
 * the value below is only a fallback so existing setups keep working.
 */
function dailyBirthdayCheck() {
  if (!isMailSwitchOn('auto_birthday_wishes')) {
    console.log('[Automated Check] Birthday wishes are OFF in Site Settings. Skipped.');
    return;
  }
  var props = PropertiesService.getScriptProperties();
  var SUPABASE_URL = props.getProperty('SUPABASE_BIRTHDAY_URL') || 'https://sbpwmkoxuokrscddhhuw.supabase.co/functions/v1/birthday-check';
  var SUPABASE_KEY = props.getProperty('SUPABASE_ANON_KEY') || SUPABASE_FALLBACK_KEY;

  try {
    var response = UrlFetchApp.fetch(SUPABASE_URL, {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });
    console.log('[Automated Check] Birthday cron HTTP ' + response.getResponseCode() + ':', response.getContentText());
  } catch (e) {
    console.error('[Automated Check] Birthday cron execution failed:', e.toString());
  }
}

// ================================================================
// TESTING FUNCTIONS (Run these from the editor)
// Test mails go to the account that owns this script.
// ================================================================
function getTestRecipient() {
  var email = '';
  try { email = Session.getEffectiveUser().getEmail(); } catch (e) {}
  if (!email) { try { email = Session.getActiveUser().getEmail(); } catch (e2) {} }
  return email || CONFIG.CLUB_EMAIL;
}

/** Sends a simple generic email. Select 'testEmailService' and click Run. */
function testEmailService() {
  console.log('[Test] Starting email service test...');
  var result = sendGenericEmail({
    recipients: [getTestRecipient()],
    subject: 'Test Email from Rotaract Unity',
    body: '<p>This is a test email to verify the email service is working correctly.</p><p>If you received this, everything is set up properly.</p>',
    sender: {
      role: 'president',
      name: 'Test President',
      portfolio: 'President 2026-27',
      email: 'president@test.com',
      phone: '9876543210'
    }
  });
  console.log('[Test] Email send result:', JSON.stringify(result));
  return result;
}

/** Project announcement (no attendance block: attendance belongs to the report). */
function testProjectNotification() {
  var result = sendProjectNotification({
    recipients: [getTestRecipient()],
    event: {
      event_name: 'Blood Donation Drive',
      date: '2026-11-15',
      start_time: '09:00',
      end_time: '13:00',
      venue: 'Codissia Trade Centre, Coimbatore',
      avenue_slug: 'community_service',
      event_chair: 'Rtr. Test Chairperson',
      description: 'Join us for our annual blood donation drive to save lives and support local hospitals.',
      has_collaboration: true,
      collaborator_name: 'Rotary Club of Coimbatore East',
      collaboration_type: 'rotary',
      is_dpp: false
    },
    sender: { role: 'president', name: 'Rtr. Test President', portfolio: 'President 2026-27' }
  });
  console.log('[Test] Result:', JSON.stringify(result));
  return result;
}

/** Report approved email WITH council / trainer names, to preview the attendance block. */
function testReportApprovedWithAttendance() {
  var result = sendReportApproved({
    recipients: [getTestRecipient()],
    event: {
      event_name: 'Blood Donation Drive',
      avenue_slug: 'community_service',
      date: '2026-11-15',
      venue: 'Codissia Trade Centre, Coimbatore',
      is_dpp: true,
      dpp_project_number: 'DPP-CBE-04',
      dpp_pillar: 'Disease Prevention and Treatment',
      dpp_category: 'B',
      beneficiaries_count: 120,
      volunteers_count: 18,
      service_hours: 36.5,
      council_members_count: 2,
      trainers_count: 1,
      rotarians_count: 6,
      interactors_count: 12,
      council_members_details: JSON.stringify([
        { name: 'Rtn. A. Sample', portfolio: 'District Council Member' },
        { name: 'Rtr. B. Sample', portfolio: 'DRR Office' }
      ]),
      trainers_details: JSON.stringify([{ name: 'Dr. C. Sample', portfolio: 'District Trainer' }])
    },
    sender: { role: 'secretary', name: 'Rtr. Test Secretary' }
  });
  console.log('[Test] Result:', JSON.stringify(result));
  return result;
}

/**
 * Builds last month's statement and emails it ONLY to you (does not mark the month as sent).
 * Needs SUPABASE_SERVICE_KEY in Script Properties.
 */
function testMonthlyTreasury() {
  var ym = previousMonthYM(new Date());
  var result = sendTreasuryStatementForMonth(ym, true, [getTestRecipient()]);
  console.log('[Test] Result:', JSON.stringify(result));
  return result;
}

/** Real send for a specific month, e.g. resendTreasuryStatement('2026-09'). Goes to the normal recipients. */
function resendTreasuryStatement(ym) {
  return sendTreasuryStatementForMonth(ym || previousMonthYM(new Date()), true);
}

/** Report mail with photo gallery + a tiny generated PDF in `files`. */
function testReportWithPhotos() {
  var tinyPdf = Utilities.base64Encode(Utilities.newBlob('%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').getBytes());
  var result = sendReportApproved({
    recipients: [getTestRecipient()],
    report_status: 'submitted',
    event: { event_name: 'Photo Test Project', avenue_slug: 'club_service', date: '2026-11-15', venue: 'Coimbatore', beneficiaries_count: 50, volunteers_count: 10, service_hours: 20 },
    photos: [
      { url: CONFIG.COLOUR_LOGO, caption: 'Sample photo one' },
      { url: CONFIG.WHITE_LOGO, caption: 'Sample photo two' }
    ],
    files: [{ name: 'Project_Report_Test.pdf', mime: 'application/pdf', base64: tinyPdf }],
    sender: { role: 'secretary', name: 'Rtr. Test Secretary' }
  });
  console.log('[Test] Result:', JSON.stringify(result));
  return result;
}

/** Minutes mail with entries + attachments. */
function testMinutesWithPhotos() {
  var tinyPdf = Utilities.base64Encode(Utilities.newBlob('%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').getBytes());
  var result = sendMeetingMinutes({
    recipients: [getTestRecipient()],
    meeting: {
      meeting_name: 'Test General Body Meeting', date: '2026-11-01', duration_minutes: 75, minutes_prepared_by: 'Rtr. Test Secretary',
      minutes_items: [{ time: '10:05', heading: 'Welcome', details: 'President welcomed members.' }, { time: '10:20', heading: 'Project review', details: 'Reports tabled and approved.' }]
    },
    photo_urls: [CONFIG.COLOUR_LOGO],
    files: [{ name: 'Minutes_Test.pdf', mime: 'application/pdf', base64: tinyPdf }],
    sender: { role: 'secretary', name: 'Rtr. Test Secretary' }
  });
  console.log('[Test] Result:', JSON.stringify(result));
  return result;
}

/** Simulates what email-hub.js / meetings.js send (pre-built html_body). */
function testPrebuiltPayload() {
  var fake = { postData: { contents: JSON.stringify({
    type: 'announcement',
    recipients: [getTestRecipient()],
    subject: '[TEST] Pre-built HTML payload',
    html_body: '<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;"><h2>Pre-built HTML works</h2><p>This body came in as html_body and was delivered untouched.</p></div>',
    sender: { role: 'president', name: 'Test President' }
  }) } };
  var out = doPost(fake).getContent();
  console.log('[Test] doPost result:', out);
  return out;
}

function testBirthdayEmail() {
  var result = sendBirthdayWish({
    member: { full_name: 'Rtr. Test Member', email: getTestRecipient(), photo_url: '' }
  });
  console.log('[Test] Result:', JSON.stringify(result));
  return result;
}

/**
 * Sends one test mail to several addresses to prove each person receives
 * their OWN message. Edit the list, then run testMultiRecipient.
 */
function testMultiRecipient() {
  var result = sendGenericEmail({
    recipients: [getTestRecipient(), 'second.person@example.com'],
    subject: 'Multi-recipient delivery test',
    body: '<p>If you received this, direct delivery to each recipient works.</p>'
  });
  console.log('[Test] Result:', JSON.stringify(result));
  return result;
}

/** Shows which group addresses the script will use and where each one came from. */
function testMailGroups() {
  CacheService.getScriptCache().removeAll(['grp_mail_group_members', 'grp_mail_group_board']);
  var out = { members: getMailGroupInfo('members'), board: getMailGroupInfo('board') };
  console.log('[Test] Mail groups:', JSON.stringify(out));
  return out;
}

/**
 * Checks the sender setup. Run once from the editor and accept the Gmail
 * permission prompt. Lists the Send-mail-as aliases of this account and sends
 * a test mail to you with a sample sender.
 */
function testSenderIdentity() {
  var aliases = [];
  try { aliases = GmailApp.getAliases() || []; } catch (e) { console.warn('Gmail not authorized yet:', e); }
  console.log('[Test] Send-mail-as aliases of this account: ' + JSON.stringify(aliases));
  var me = getTestRecipient();
  var result = sendGenericEmail({
    recipients: [me],
    subject: 'Sender identity test',
    body: '<p>Check the sender name and press Reply: the Reply-To should be the test sender address.</p>',
    sender: { role: 'secretary', name: 'Rtr. Test Sender', email: aliases.length ? aliases[0] : me }
  });
  console.log('[Test] Result:', JSON.stringify(result));
  return result;
}

/** Verify the deployment URL responds correctly (simulates doGet). */
function testGetEndpoint() {
  var result = doGet({});
  console.log('[Test] GET endpoint response:', result.getContent());
  return result.getContent();
}
