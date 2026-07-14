/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - REPORTS MANAGEMENT
   Complete - Uses Supabase Edge Function for .docx generation
   No browser docx library needed - works from file:// too
   File: reports.js
   ============================================================ */

'use strict';

// ============================================================
// SUPABASE EDGE FUNCTION CONFIG
// ============================================================
var ReportConfig = {
    supabaseUrl:  'https://dledwtepuvzzztfypbgn.supabase.co',
    anonKey:      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDk2NDMsImV4cCI6MjA5ODcyNTY0M30.9ZcngwUsfl5AkFaCDR9-ljoLLOYeGwwK0AKaHfeyGhY',
    functionUrl:  'https://dledwtepuvzzztfypbgn.supabase.co/functions/v1/generate-report'
};

// ============================================================
// CALL EDGE FUNCTION — core helper
// ============================================================
async function _callReportEdgeFunction(payload) {
    var resp = await fetch(ReportConfig.functionUrl, {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + ReportConfig.anonKey,
            'apikey':        ReportConfig.anonKey
        },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        var errText = '';
        try { errText = (await resp.json()).error || resp.statusText; }
        catch (e) { errText = resp.statusText; }
        throw new Error('Edge function error (' + resp.status + '): ' + errText);
    }

    return resp; // caller handles blob or json
}

// ============================================================
// SAVE BLOB AS FILE — works from file:// and http://
// ============================================================
function _saveBlob(blob, fileName) {
    if (typeof saveAs === 'function') {
        saveAs(blob, fileName);
        return;
    }
    // Fallback if FileSaver.js not loaded
    var url = URL.createObjectURL(blob);
    var a   = document.createElement('a');
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
// LOAD ADMIN REPORTS TABLE
// ============================================================
async function loadAdminReports() {
    if (!AppState.currentAdmin || !supabase) return;

    try {
        var af = document.getElementById('reportAvenueFilter');
        var mf = document.getElementById('reportMonthFilter');
        var av = af ? af.value : 'all';
        var mv = mf ? mf.value : 'all';

        var q = supabase.from('events')
            .select('*')
            .eq('status', 'completed')
            .order('date', { ascending: false });

        var dirAvenue = getDirectorAvenue(AppState.currentAdmin.role);
        if (dirAvenue) {
            q = q.eq('avenue', dirAvenue);
        } else if (av && av !== 'all') {
            q = q.eq('avenue', av);
        }

        var r = await q;
        if (r.error) throw r.error;

        var allData = r.data || [];
        _populateMonthFilter(allData);

        var filtered = allData;
        if (mv && mv !== 'all') {
            filtered = allData.filter(function (e) {
                return e.date && e.date.substring(0, 7) === mv;
            });
        }

        renderAdminReportsTable(filtered);

    } catch (err) {
        console.error('loadAdminReports error:', err);
        showToast('error', 'Error', 'Failed to load reports');
    }
}

// ── Month filter dropdown ─────────────────────────────────────
function _populateMonthFilter(events) {
    var sel = document.getElementById('reportMonthFilter');
    if (!sel) return;

    var cur    = sel.value;
    var months = {};

    (events || []).forEach(function (e) {
        if (e.date) {
            var key   = e.date.substring(0, 7);
            var parts = e.date.split('-');
            var label = new Date(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1,
                1
            ).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
            months[key] = label;
        }
    });

    var sorted = Object.keys(months).sort().reverse();
    sel.innerHTML =
        '<option value="all">All Months</option>' +
        sorted.map(function (k) {
            return '<option value="' + k + '"' +
                (cur === k ? ' selected' : '') + '>' +
                months[k] + '</option>';
        }).join('');
}

// ============================================================
// RENDER ADMIN REPORTS TABLE
// ============================================================
function renderAdminReportsTable(events) {
    var tbody = document.getElementById('reportsTableBody');
    if (!tbody) return;

    if (!events || !events.length) {
        tbody.innerHTML = [
            '<tr><td colspan="7" style="text-align:center;padding:40px;',
            'color:var(--text-tertiary);">',
            '<i data-lucide="file-text" style="display:block;margin:0 auto 8px;',
            'width:30px;height:30px;opacity:0.5;"></i>',
            'No completed events found for reports',
            '</td></tr>'
        ].join('');
        refreshIcons();
        return;
    }

    tbody.innerHTML = events.map(function (ev) {
        var photoCount = (ev.report_photos || []).length;

        return [
            '<tr>',

            // Title + venue
            '<td><div style="max-width:220px;">',
            '<div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;',
            'white-space:nowrap;">' + escapeHtml(ev.title) + '</div>',
            ev.venue
                ? '<div style="font-size:0.72rem;color:var(--text-tertiary);">' +
                  escapeHtml(truncateText(ev.venue, 30)) + '</div>'
                : '',
            '</div></td>',

            // Avenue badge
            '<td><span class="event-card-avenue avenue-' + (ev.avenue || '') + '" ',
            'style="font-size:0.68rem;padding:2px 8px;">',
            formatAvenueLabel(ev.avenue), '</span></td>',

            // Date + time
            '<td>',
            '<div>' + formatDateShort(ev.date) + '</div>',
            '<div style="font-size:0.72rem;color:var(--text-tertiary);">',
            (ev.start_time ? formatTime(ev.start_time) : '') +
            (ev.end_time   ? ' - ' + formatTime(ev.end_time) : ''),
            '</div></td>',

            // Chair
            '<td>' + escapeHtml(ev.event_chair || '-') + '</td>',

            // Report status
            '<td>',
            ev.report_submitted
                ? '<span class="badge badge-success">' +
                  '<i data-lucide="check-circle" style="width:10px;height:10px;"></i>' +
                  ' Submitted</span>' +
                  (ev.report_submitted_at
                      ? '<div style="font-size:0.68rem;color:var(--text-tertiary);' +
                        'margin-top:2px;">' +
                        getRelativeTime(ev.report_submitted_at) + '</div>'
                      : '')
                : '<span class="badge badge-warning">' +
                  '<i data-lucide="clock" style="width:10px;height:10px;"></i>' +
                  ' Pending</span>',
            '</td>',

            // Photos
            '<td>',
            photoCount > 0
                ? '<span class="badge badge-info">' + photoCount + ' photo(s)</span>'
                : '<span style="color:var(--text-tertiary);font-size:0.78rem;">None</span>',
            '</td>',

            // Actions
            '<td><div class="table-actions">',

            // Submit button (not yet submitted)
            !ev.report_submitted
                ? '<button class="btn-icon" ' +
                  'onclick="openReportForm(\'' + ev.id + '\')" ' +
                  'title="Submit Report" style="color:var(--primary);">' +
                  '<i data-lucide="file-plus"></i></button>'
                : '',

            // View button
            ev.report_submitted
                ? '<button class="btn-icon" ' +
                  'onclick="viewReportDetail(\'' + ev.id + '\')" ' +
                  'title="View Report"><i data-lucide="eye"></i></button>'
                : '',

            // Edit button
            ev.report_submitted
                ? '<button class="btn-icon" ' +
                  'onclick="openReportForm(\'' + ev.id + '\')" ' +
                  'title="Edit Report"><i data-lucide="edit-2"></i></button>'
                : '',

            // Download button — always shown when submitted (no library check needed)
            ev.report_submitted && canDownloadReports()
                ? '<button class="btn-icon" ' +
                  'onclick="downloadSingleReport(\'' + ev.id + '\')" ' +
                  'title="Download .docx" style="color:var(--success);">' +
                  '<i data-lucide="download"></i></button>'
                : '',

            '</div></td></tr>'
        ].join('');
    }).join('');

    refreshIcons();
}

// ============================================================
// VIEW REPORT DETAIL
// ============================================================
async function viewReportDetail(eventId) {
    try {
        var ev = _findEventForReport(eventId);
        if (!ev && supabase) {
            var r = await supabase.from('events').select('*').eq('id', eventId).single();
            if (!r.error && r.data) ev = r.data;
        }
        if (!ev) { showToast('error', 'Error', 'Event not found'); return; }

        var photos = [];
        if (supabase) {
            var pr = await supabase.from('event_photos')
                .select('*').eq('event_id', eventId)
                .order('sort_order', { ascending: true });
            if (!pr.error && pr.data) photos = pr.data;
        }

        var allImgs = _collectEventImages(ev, photos);

        // Register images for viewer
        if (typeof _registerImages === 'function') {
            _registerImages(eventId, allImgs);
        }

        var titleEl = document.getElementById('formModalTitle');
        var bodyEl  = document.getElementById('formModalBody');

        if (titleEl) {
            titleEl.innerHTML =
                '<i data-lucide="file-text"></i>Report: ' + escapeHtml(ev.title);
        }

        if (bodyEl) {
            bodyEl.innerHTML = [
                // Header card
                '<div style="padding:16px;background:linear-gradient(135deg,',
                'rgba(0,87,183,0.08),rgba(0,180,216,0.04));',
                'border:1px solid rgba(0,87,183,0.12);',
                'border-radius:var(--radius-md);margin-bottom:20px;">',
                '<h3 style="font-size:1rem;font-weight:700;margin-bottom:8px;',
                'color:var(--primary);">' + escapeHtml(ev.title) + '</h3>',
                '<div style="display:grid;grid-template-columns:repeat(auto-fit,',
                'minmax(160px,1fr));gap:8px;font-size:0.82rem;">',
                '<div><strong>Avenue:</strong> ' + formatAvenueLabel(ev.avenue) + '</div>',
                '<div><strong>Date:</strong> '   + formatDate(ev.date)           + '</div>',
                '<div><strong>Time:</strong> '   +
                    (ev.start_time ? formatTime(ev.start_time) : 'N/A') +
                    (ev.end_time   ? ' - ' + formatTime(ev.end_time) : '') + '</div>',
                '<div><strong>Venue:</strong> '  + escapeHtml(ev.venue || 'N/A') + '</div>',
                ev.event_chair
                    ? '<div><strong>Chair:</strong> ' + escapeHtml(ev.event_chair) + '</div>'
                    : '',
                ev.proposed_by
                    ? '<div><strong>Proposed By:</strong> ' + escapeHtml(ev.proposed_by) + '</div>'
                    : '',
                '</div></div>',

                // Stat cards
                '<div style="display:grid;grid-template-columns:repeat(auto-fit,',
                'minmax(130px,1fr));gap:10px;margin-bottom:20px;">',
                _statCard('heart',  'Beneficiaries', ev.beneficiaries_count || 0),
                _statCard('users',  'Participants',  ev.participants_count  || 0),
                _statCard('clock',  'Volunteer Hrs', ev.volunteer_hours     || 0),
                _statCard('wallet', 'Budget Used',
                    'Rs. ' + formatCurrency(ev.budget_actual || 0), true),
                '</div>',

                // Report text
                ev.report_text ? [
                    '<div style="margin-bottom:20px;">',
                    '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:8px;',
                    'display:flex;align-items:center;gap:6px;">',
                    '<i data-lucide="file-text" style="width:16px;height:16px;',
                    'color:var(--primary);"></i>Report Description</h4>',
                    '<div style="padding:16px;background:var(--bg-card);',
                    'border:1px solid var(--border-light);border-radius:var(--radius-sm);',
                    'font-size:0.88rem;line-height:1.8;color:var(--text-secondary);">',
                    escapeHtml(ev.report_text).replace(/\n/g, '<br>'),
                    '</div></div>'
                ].join('') :
                '<div style="padding:20px;text-align:center;color:var(--text-tertiary);',
                'background:var(--bg-card);border-radius:var(--radius-sm);margin-bottom:20px;">',
                '<i data-lucide="file-x" style="width:24px;height:24px;display:block;',
                'margin:0 auto 8px;opacity:0.5;"></i>',
                '<p>No report description submitted yet</p></div>',

                // Photos
                allImgs.length > 0 ? [
                    '<div style="margin-bottom:20px;">',
                    '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;',
                    'display:flex;align-items:center;gap:6px;">',
                    '<i data-lucide="camera" style="width:16px;height:16px;',
                    'color:var(--primary);"></i>Event Photos (' + allImgs.length + ')</h4>',
                    '<div style="display:grid;',
                    'grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">',
                    allImgs.map(function (src, i) {
                        return '<div style="border-radius:var(--radius-sm);overflow:hidden;' +
                            'border:1px solid var(--border-color);cursor:pointer;' +
                            'aspect-ratio:4/3;background:var(--bg-tertiary);" ' +
                            'onclick="openImageViewerForEvent(\'' +
                            escapeHtml(eventId) + '\',' + i + ')">' +
                            '<img src="' + escapeHtml(src) + '" alt="Photo ' + (i + 1) + '" ' +
                            'style="width:100%;height:100%;object-fit:cover;" loading="lazy" ' +
                            'onerror="this.parentElement.style.display=\'none\'">' +
                            '</div>';
                    }).join(''),
                    '</div></div>'
                ].join('') : '',

                // Action buttons
                '<div style="display:flex;gap:12px;justify-content:flex-end;',
                'padding-top:16px;border-top:1px solid var(--border-color);">',
                canDownloadReports() && ev.report_submitted
                    ? '<button class="btn btn-outline" ' +
                      'onclick="closeModal(\'formModal\');downloadSingleReport(\'' +
                      ev.id + '\')"><i data-lucide="download"></i>Download .docx</button>'
                    : '',
                '<button class="btn btn-primary" onclick="closeModal(\'formModal\')">' +
                '<i data-lucide="check"></i>Close</button>',
                '</div>'
            ].join('');
        }

        openModal('formModal');
        refreshIcons();

    } catch (err) {
        console.error('viewReportDetail error:', err);
        showToast('error', 'Error', 'Failed to load report');
    }
}

// ── Stat card helper ──────────────────────────────────────────
function _statCard(icon, label, value, isText) {
    return [
        '<div style="padding:12px;background:var(--bg-card);',
        'border:1px solid var(--border-light);border-radius:var(--radius-sm);',
        'text-align:center;">',
        '<i data-lucide="' + icon + '" style="width:18px;height:18px;',
        'color:var(--primary);display:block;margin:0 auto 6px;"></i>',
        '<div style="font-size:1rem;font-weight:800;">',
        isText ? value : formatNumberFull(value),
        '</div>',
        '<div style="font-size:0.68rem;color:var(--text-tertiary);',
        'text-transform:uppercase;">' + label + '</div>',
        '</div>'
    ].join('');
}

// ============================================================
// COLLECT EVENT IMAGES
// ============================================================
function _collectEventImages(ev, photos) {
    var allImgs = [];

    function addIfNew(url) {
        if (url && typeof url === 'string' &&
            url.startsWith('http') && allImgs.indexOf(url) === -1) {
            allImgs.push(url);
        }
    }

    addIfNew(ev.poster_url);
    (ev.poster_urls   || []).forEach(addIfNew);
    (photos           || []).forEach(function (p) { addIfNew(p.photo_url); });
    (ev.report_photos || []).forEach(addIfNew);

    return allImgs;
}

// ============================================================
// FIND EVENT IN LOCAL STATE
// ============================================================
function _findEventForReport(eventId) {
    if (!eventId) return null;
    var ev = (AppState.events || []).find(function (e) { return e.id === eventId; });
    if (ev) return ev;
    return (AppState.allProjects || []).find(function (e) { return e.id === eventId; }) || null;
}

// ============================================================
// BUILD PLAIN TEXT REPORT (fallback if edge function fails)
// ============================================================
function _buildPlainReport(ev) {
    var lines = [
        'ROTARACT CLUB OF COIMBATORE UNITY',
        'Family of Rotary Club of Coimbatore East',
        'Rotary International District 3206 (Coimbatore | Pallakkad)',
        'Club ID: 91594 | Chartered: 21.4.2014',
        '',
        'PROJECT REPORT',
        '='.repeat(60),
        '',
        'Event Name      : ' + (ev.title           || 'N/A'),
        'Avenue          : ' + formatAvenueLabel(ev.avenue),
        'Date            : ' + formatDate(ev.date),
        'Time            : ' +
            (ev.start_time ? formatTime(ev.start_time) : 'N/A') +
            (ev.end_time   ? ' to ' + formatTime(ev.end_time) : ''),
        'Venue           : ' + (ev.venue            || 'N/A'),
        'Venue Address   : ' + (ev.venue_address    || 'N/A'),
        'Event Chair     : ' + (ev.event_chair      || 'N/A'),
        'Proposed By     : ' + (ev.proposed_by      || 'N/A'),
        'Seconded By     : ' + (ev.seconded_by      || 'N/A'),
        'Beneficiaries   : ' + (ev.beneficiaries_count || 0),
        'Participants    : ' + (ev.participants_count  || 0),
        'Volunteer Hours : ' + (ev.volunteer_hours     || 0),
        'Budget Estimated: Rs. ' + formatCurrency(ev.budget_estimated || 0),
        'Budget Actual   : Rs. ' + formatCurrency(ev.budget_actual    || 0),
        '',
        '='.repeat(60)
    ];

    if (ev.report_text) {
        lines.push('');
        lines.push('REPORT DESCRIPTION');
        lines.push('-'.repeat(60));
        lines.push(ev.report_text);
    }

    lines.push('');
    lines.push('Generated: ' + new Date().toLocaleString('en-IN'));
    lines.push('Rotaract Club of Coimbatore Unity | Club ID: 91594');

    return lines.join('\n');
}

// ============================================================
// DOWNLOAD SINGLE REPORT AS .DOCX via Edge Function
// ============================================================
async function downloadSingleReport(eventId) {
    if (!canDownloadReports()) {
        showToast('error', 'Denied', 'You do not have permission to download reports');
        return;
    }

    var toastId = showToast('info', 'Generating',
        'Building report on server...', 30000);

    try {
        // ── Get event ─────────────────────────────────────────
        var ev = _findEventForReport(eventId);
        if (!ev && supabase) {
            var r = await supabase.from('events').select('*').eq('id', eventId).single();
            if (!r.error && r.data) ev = r.data;
        }
        if (!ev) throw new Error('Event not found');

        // ── Get photos ────────────────────────────────────────
        var photos = [];
        if (supabase) {
            var pr = await supabase.from('event_photos')
                .select('*').eq('event_id', eventId)
                .order('sort_order', { ascending: true });
            if (!pr.error && pr.data) photos = pr.data;
        }

        // ── Collect image URLs ────────────────────────────────
        var allImgs  = _collectEventImages(ev, photos);
        var imgUrls  = allImgs.slice(0, 5);

        // ── Build payload ─────────────────────────────────────
        var payload = {
            type:   'single',
            event:  ev,
            photos: imgUrls,
            meta: {
                club_name:    'Rotaract Club of Coimbatore Unity',
                parent_club:  'Rotary Club of Coimbatore East',
                district:     'Rotary International District 3206 (Coimbatore | Pallakkad)',
                club_id:      '91594',
                charter_date: '21.4.2014',
                generated_on: new Date().toISOString()
            }
        };

        // ── Call edge function ────────────────────────────────
        var resp = await _callReportEdgeFunction(payload);

        // ── Save file ─────────────────────────────────────────
        var blob     = await resp.blob();
        var safeName = (typeof slugify === 'function')
            ? slugify(ev.title || 'event')
            : (ev.title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        var fileName = 'Report_' + safeName + '_' + ev.date + '.docx';

        _saveBlob(blob, fileName);

        removeToast(toastId);

        if (typeof logActivity === 'function') {
            await logActivity('download_report', 'events', eventId, { title: ev.title });
        }

        showToast('success', 'Downloaded',
            'Report saved as <strong>' + escapeHtml(fileName) + '</strong>');

    } catch (err) {
        removeToast(toastId);
        console.error('[report] downloadSingleReport error:', err);

        // Offer plain text fallback
        var ev2 = _findEventForReport(eventId);
        if (ev2) {
            showToast('warning', 'Server Error',
                err.message + '. Downloading as plain text instead.');
            setTimeout(function () {
                var txt      = _buildPlainReport(ev2);
                var blob     = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                var safeName = (typeof slugify === 'function')
                    ? slugify(ev2.title || 'event')
                    : 'event';
                _saveBlob(blob, 'Report_' + safeName + '_' + ev2.date + '.txt');
            }, 1000);
        } else {
            showToast('error', 'Error', err.message || 'Failed to generate report');
        }
    }
}

// ============================================================
// DOWNLOAD COMBINED REPORT — picker UI
// ============================================================
async function downloadCombinedReport() {
    if (!canDownloadReports()) {
        showToast('error', 'Denied', 'No permission to download reports');
        return;
    }

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');

    if (titleEl) {
        titleEl.innerHTML = '<i data-lucide="download"></i>Download Combined Report';
    }

    var curM = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<div style="margin-bottom:18px;padding:14px;',
            'background:rgba(0,87,183,0.06);',
            'border:1px solid rgba(0,87,183,0.12);',
            'border-radius:var(--radius-sm);font-size:0.85rem;',
            'color:var(--text-secondary);">',
            'Reports are generated as <strong>.docx</strong> files via server. ',
            'No browser library required.',
            '</div>',

            '<div style="display:grid;grid-template-columns:1fr 1fr;',
            'gap:12px;margin-bottom:18px;">',

            _rptBtn('month',       'calendar',       'Current Month',  curM),
            _rptBtn('pick_month',  'calendar-range', 'Select Month',   'Choose specific month'),
            _rptBtn('pick_avenue', 'layers',         'By Avenue',      'Filter by avenue'),
            _rptBtnPrimary('all', 'file-text',       'All Projects',   'Complete report'),

            '</div>',

            '<div id="rptMonthPicker" style="display:none;margin-bottom:14px;">',
            '<div class="form-group">',
            '<label><i data-lucide="calendar"></i>Select Month</label>',
            '<input type="month" id="rptMonthInput" ',
            'value="' + new Date().toISOString().substring(0, 7) + '">',
            '</div>',
            '<button class="btn btn-primary btn-block" ',
            'onclick="executeRpt(\'picked_month\')">',
            '<i data-lucide="download"></i>Generate Report</button>',
            '</div>',

            '<div id="rptAvenuePicker" style="display:none;margin-bottom:14px;">',
            '<div class="form-group">',
            '<label><i data-lucide="layers"></i>Select Avenue</label>',
            '<select id="rptAvenueInput">',
            '<option value="club_service">Club Service</option>',
            '<option value="community_service">Community Service</option>',
            '<option value="professional_service">Professional Service</option>',
            '<option value="international_service">International Service</option>',
            '<option value="district_priority">District Priority Projects</option>',
            '</select>',
            '</div>',
            '<button class="btn btn-primary btn-block" ',
            'onclick="executeRpt(\'picked_avenue\')">',
            '<i data-lucide="download"></i>Generate Report</button>',
            '</div>',

            '<button class="btn btn-outline btn-block" ',
            'onclick="closeModal(\'formModal\')" style="margin-top:6px;">',
            '<i data-lucide="x"></i>Cancel</button>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();
}

// ── Report type picker button helpers ─────────────────────────
function _rptBtn(type, icon, title, sub) {
    return '<button class="btn btn-outline" ' +
        'style="flex-direction:column;height:auto;padding:18px 14px;gap:8px;" ' +
        'onclick="selectRptType(\'' + type + '\')">' +
        '<i data-lucide="' + icon + '" ' +
        'style="width:26px;height:26px;color:var(--primary);"></i>' +
        '<strong style="font-size:0.85rem;">' + title + '</strong>' +
        '<span style="font-size:0.72rem;color:var(--text-tertiary);font-weight:400;">' +
        sub + '</span></button>';
}

function _rptBtnPrimary(type, icon, title, sub) {
    return '<button class="btn btn-primary" ' +
        'style="flex-direction:column;height:auto;padding:18px 14px;gap:8px;" ' +
        'onclick="selectRptType(\'' + type + '\')">' +
        '<i data-lucide="' + icon + '" style="width:26px;height:26px;"></i>' +
        '<strong style="font-size:0.85rem;">' + title + '</strong>' +
        '<span style="font-size:0.72rem;color:rgba(255,255,255,0.75);font-weight:400;">' +
        sub + '</span></button>';
}

function selectRptType(type) {
    var mp = document.getElementById('rptMonthPicker');
    var ap = document.getElementById('rptAvenuePicker');

    if (type === 'pick_month') {
        if (mp) mp.style.display = 'block';
        if (ap) ap.style.display = 'none';
        refreshIcons();
        return;
    }
    if (type === 'pick_avenue') {
        if (mp) mp.style.display = 'none';
        if (ap) ap.style.display = 'block';
        refreshIcons();
        return;
    }

    executeRpt(type);
}

// ============================================================
// EXECUTE COMBINED REPORT via Edge Function
// ============================================================
async function executeRpt(type) {
    if (!supabase) {
        showToast('error', 'Error', 'Database not connected');
        return;
    }

    // ── Fetch events from DB ──────────────────────────────────
    var events      = [];
    var reportTitle = '';

    try {
        if (type === 'month') {
            var n  = new Date();
            var mS = new Date(n.getFullYear(), n.getMonth(), 1)
                         .toISOString().split('T')[0];
            var mE = new Date(n.getFullYear(), n.getMonth() + 1, 0)
                         .toISOString().split('T')[0];
            var mN = n.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
            var r1 = await supabase.from('events').select('*')
                .eq('status', 'completed').eq('report_submitted', true)
                .gte('date', mS).lte('date', mE)
                .order('date', { ascending: true });
            events      = r1.data || [];
            reportTitle = 'Monthly Report - ' + mN;

        } else if (type === 'picked_month') {
            var smEl = document.getElementById('rptMonthInput');
            var sm   = smEl ? smEl.value : '';
            if (!sm) { showToast('error', 'Required', 'Please select a month'); return; }
            var sd   = new Date(sm + '-01');
            var sS   = sm + '-01';
            var sE   = new Date(sd.getFullYear(), sd.getMonth() + 1, 0)
                           .toISOString().split('T')[0];
            var sN   = sd.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
            var r2   = await supabase.from('events').select('*')
                .eq('status', 'completed').eq('report_submitted', true)
                .gte('date', sS).lte('date', sE)
                .order('date', { ascending: true });
            events      = r2.data || [];
            reportTitle = 'Monthly Report - ' + sN;

        } else if (type === 'picked_avenue') {
            var saEl = document.getElementById('rptAvenueInput');
            var sa   = saEl ? saEl.value : '';
            if (!sa) { showToast('error', 'Required', 'Please select an avenue'); return; }
            var r3   = await supabase.from('events').select('*')
                .eq('status', 'completed').eq('report_submitted', true)
                .eq('avenue', sa).order('date', { ascending: true });
            events      = r3.data || [];
            reportTitle = formatAvenueLabel(sa) + ' - Combined Report';

        } else {
            var r4 = await supabase.from('events').select('*')
                .eq('status', 'completed').eq('report_submitted', true)
                .order('date', { ascending: true });
            events      = r4.data || [];
            reportTitle = 'Complete Projects Report';
        }

    } catch (dbErr) {
        console.error('[report] DB error:', dbErr);
        showToast('error', 'Database Error', dbErr.message || 'Failed to fetch events');
        return;
    }

    if (!events.length) {
        showToast('info', 'No Reports',
            'No submitted reports found for the selected criteria');
        return;
    }

    closeModal('formModal');

    var toastId = showToast('info', 'Generating',
        'Building combined report for ' + events.length + ' project(s)...', 90000);

    try {
        // Collect photo URLs for each event (max 2 per event)
        var eventsWithPhotos = [];
        for (var i = 0; i < events.length; i++) {
            var ev     = events[i];
            var photos = [];
            if (supabase) {
                try {
                    var pr = await supabase.from('event_photos')
                        .select('photo_url')
                        .eq('event_id', ev.id)
                        .order('sort_order', { ascending: true })
                        .limit(2);
                    if (!pr.error && pr.data) photos = pr.data;
                } catch (e) { /* skip photos on error */ }
            }
            eventsWithPhotos.push({
                event:  ev,
                photos: _collectEventImages(ev, photos).slice(0, 2)
            });
        }

        // ── Call edge function ────────────────────────────────
        var payload = {
            type:   'combined',
            events: eventsWithPhotos,
            title:  reportTitle,
            meta: {
                club_name:    'Rotaract Club of Coimbatore Unity',
                parent_club:  'Rotary Club of Coimbatore East',
                district:     'Rotary International District 3206 (Coimbatore | Pallakkad)',
                club_id:      '91594',
                charter_date: '21.4.2014',
                generated_on: new Date().toISOString()
            }
        };

        var resp = await _callReportEdgeFunction(payload);
        var blob = await resp.blob();

        var safeName = (typeof slugify === 'function')
            ? slugify(reportTitle)
            : reportTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        var fileName = safeName + '_' + new Date().toISOString().split('T')[0] + '.docx';

        _saveBlob(blob, fileName);

        if (typeof logActivity === 'function') {
            await logActivity('download_combined_report', 'events', null, {
                type:  type,
                count: events.length,
                title: reportTitle
            });
        }

        removeToast(toastId);
        showToast('success', 'Downloaded',
            events.length + ' project report(s) saved as <strong>' +
            escapeHtml(fileName) + '</strong>');

    } catch (err) {
        removeToast(toastId);
        console.error('[report] executeRpt error:', err);
        showToast('error', 'Error', err.message || 'Failed to generate combined report');
    }
}

// ============================================================
// OPEN REPORT FORM (submit / edit report text + photos)
// ============================================================
async function openReportForm(eventId) {
    try {
        var ev = _findEventForReport(eventId);
        if (!ev && supabase) {
            var r = await supabase.from('events').select('*').eq('id', eventId).single();
            if (!r.error && r.data) ev = r.data;
        }
        if (!ev) { showToast('error', 'Error', 'Event not found'); return; }

        var titleEl = document.getElementById('formModalTitle');
        var bodyEl  = document.getElementById('formModalBody');

        if (titleEl) {
            titleEl.innerHTML = '<i data-lucide="file-plus"></i>' +
                (ev.report_submitted ? 'Edit Report' : 'Submit Report') +
                ': ' + escapeHtml(ev.title);
        }

        if (bodyEl) {
            bodyEl.innerHTML = [
                '<form onsubmit="saveReportForm(event,\'' + eventId + '\')">',

                '<div class="form-group">',
                '<label><i data-lucide="file-text"></i>Report Description *</label>',
                '<textarea id="rptText" rows="8" required ',
                'placeholder="Describe what happened, who participated, impact made...">' +
                escapeHtml(ev.report_text || '') + '</textarea>',
                '</div>',

                '<div class="form-row">',
                '<div class="form-group">',
                '<label><i data-lucide="heart"></i>Beneficiaries</label>',
                '<input type="number" id="rptBeneficiaries" min="0" ',
                'value="' + (ev.beneficiaries_count || 0) + '">',
                '</div>',
                '<div class="form-group">',
                '<label><i data-lucide="users"></i>Participants</label>',
                '<input type="number" id="rptParticipants" min="0" ',
                'value="' + (ev.participants_count || 0) + '">',
                '</div>',
                '</div>',

                '<div class="form-row">',
                '<div class="form-group">',
                '<label><i data-lucide="clock"></i>Volunteer Hours</label>',
                '<input type="number" id="rptVolunteerHours" min="0" step="0.5" ',
                'value="' + (ev.volunteer_hours || 0) + '">',
                '</div>',
                '<div class="form-group">',
                '<label><i data-lucide="wallet"></i>Actual Budget (Rs.)</label>',
                '<input type="number" id="rptBudgetActual" min="0" step="0.01" ',
                'value="' + (ev.budget_actual || 0) + '">',
                '</div>',
                '</div>',

                '<div style="display:flex;gap:12px;justify-content:flex-end;',
                'margin-top:20px;padding-top:16px;',
                'border-top:1px solid var(--border-color);">',
                '<button type="button" class="btn btn-outline" ',
                'onclick="closeModal(\'formModal\')">',
                '<i data-lucide="x"></i>Cancel</button>',
                '<button type="submit" class="btn btn-primary">',
                '<i data-lucide="save"></i>',
                (ev.report_submitted ? 'Update Report' : 'Submit Report'),
                '</button>',
                '</div>',

                '</form>'
            ].join('');
        }

        openModal('formModal');
        refreshIcons();

    } catch (err) {
        console.error('openReportForm error:', err);
        showToast('error', 'Error', 'Could not open report form');
    }
}

// ============================================================
// SAVE REPORT FORM
// ============================================================
async function saveReportForm(e, eventId) {
    e.preventDefault();

    function gv(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    var text = gv('rptText');
    if (!text) { showToast('error', 'Required', 'Report description is required'); return; }

    var btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        if (!supabase) throw new Error('Database not connected');

        var upd = await supabase.from('events').update({
            report_text:         text,
            beneficiaries_count: parseInt(gv('rptBeneficiaries'))  || 0,
            participants_count:  parseInt(gv('rptParticipants'))    || 0,
            volunteer_hours:     parseFloat(gv('rptVolunteerHours'))|| 0,
            budget_actual:       parseFloat(gv('rptBudgetActual'))  || 0,
            report_submitted:    true,
            report_submitted_at: new Date().toISOString(),
            updated_at:          new Date().toISOString()
        }).eq('id', eventId);

        if (upd.error) throw upd.error;

        if (typeof logActivity === 'function') {
            await logActivity('submit_report', 'events', eventId, {});
        }

        closeModal('formModal');
        showToast('success', 'Saved', 'Report submitted successfully');
        await loadAdminReports();

    } catch (err) {
        console.error('saveReportForm error:', err);
        showToast('error', 'Error', err.message || 'Failed to save report');
    } finally {
        if (btn) {
            btn.disabled    = false;
            btn.textContent = 'Submit Report';
        }
    }
}

console.log('%c reports.js loaded ',
    'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');