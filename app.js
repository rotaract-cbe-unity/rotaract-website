/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - MAIN APPLICATION
   Complete bug-fixed - Dashboard working, all functions defined
   File: app.js
   ============================================================ */

'use strict';

// ============================================================
// SAFE FUNCTION GUARD — prevents "not defined" crashes
// ============================================================
function guardFn(name, fallback) {
    if (typeof window[name] !== 'function') {
        window[name] = fallback || function() { return Promise.resolve(); };
    }
}

// ============================================================
// APP INITIALIZATION
// ============================================================
async function initApp() {
    try {
        initTheme();
        await loadSettings();
        applySettingsToPage();
        initHeaderScroll();
        initHeroParticles();
        initAnnouncementBar();
        initSocialLinks();
        checkAttendanceParam();

        await Promise.allSettled([
            loadPublicStatistics(),
            loadPublicBenefits(),
            loadUpcomingEvents(),
            loadCompletedProjects(),
            loadPublicMembers(),
            loadPublicTrainers(),
            loadPastPresidents(),
            loadPastSecretaries(),
            loadPublicNewsletters()
        ]);

        setTimeout(addRevealClasses, 200);
        startBirthdayAutoCheck();
        startMeetingTimerCheck();
        startMonthlyStatementCheck();
        markAppReady();

    } catch (err) {
        console.error('App init error:', err);
        markAppReady();
    }
}

// ============================================================
// APPLY SETTINGS TO PAGE
// ============================================================
function applySettingsToPage() {
    function st(id, val) { var el = document.getElementById(id); if (el) el.textContent = val || ''; }
    function sh(id, val) { var el = document.getElementById(id); if (el) el.innerHTML = val || ''; }

    st('heroTitle', getSetting('hero_title', 'Building Communities, Bridging Worlds'));
    st('heroSubtitle', getSetting('hero_subtitle', 'Join the movement of young leaders making a difference in Coimbatore and beyond'));
    sh('aboutText', getSetting('about_text', ''));
    st('missionText', getSetting('mission_text', ''));
    st('visionText', getSetting('vision_text', ''));
    st('rotaryYearDisplay', getSetting('rotary_year', '2024-25'));

    var emailEl = document.getElementById('contactEmail');
    if (emailEl) {
        var em = getSetting('club_email', 'rc.cbeunity@gmail.com');
        emailEl.textContent = em;
        emailEl.href = 'mailto:' + em;
    }
    st('contactAddress', getSetting('club_address', 'Coimbatore, Tamil Nadu'));

    var mapEl = document.getElementById('contactMap');
    if (mapEl) { var mu = getSetting('map_embed_url', ''); if (mu) mapEl.src = mu; }

    var footerEl = document.getElementById('footerText');
    if (footerEl) footerEl.innerHTML = '&copy; ' + new Date().getFullYear() + ' ' + getSetting('footer_text', 'Rotaract Club of Coimbatore Unity. All Rights Reserved.');

    updateLogoForTheme(AppState.theme);
    initSocialLinks();
}

// ============================================================
// STATISTICS
// ============================================================
async function loadPublicStatistics() {
    try {
        if (!supabase) return;
        var r = await supabase.from('club_statistics').select('*').eq('is_visible', true).order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.statistics = r.data || [];
        renderStatistics(AppState.statistics);
    } catch (err) { console.warn('Stats error:', err.message); }
}

function renderStatistics(stats) {
    var grid = document.getElementById('statsGrid');
    if (!grid || !stats || !stats.length) return;
    grid.innerHTML = stats.map(function(s) {
        return '<div class="stat-card">' +
            '<div class="stat-card-icon"><i data-lucide="' + escapeHtml(s.stat_icon || 'bar-chart') + '"></i></div>' +
            '<div class="stat-card-value" data-target="' + escapeHtml(s.stat_value) + '">' + formatNumber(parseInt(s.stat_value) || 0) + '</div>' +
            '<div class="stat-card-label">' + escapeHtml(s.stat_label) + '</div>' +
            '</div>';
    }).join('');
    refreshIcons();
    if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function(entries) {
            entries.forEach(function(e) {
                if (e.isIntersecting) {
                    var v = e.target.querySelector('.stat-card-value');
                    if (v && !v.dataset.done) { v.dataset.done = '1'; animateCounter(v, parseInt(v.getAttribute('data-target')) || 0, 2000); }
                }
            });
        }, { threshold: 0.3 });
        grid.querySelectorAll('.stat-card').forEach(function(c) { obs.observe(c); });
    }
}

// ============================================================
// BENEFITS
// ============================================================
async function loadPublicBenefits() {
    try {
        if (!supabase) return;
        var r = await supabase.from('joining_benefits').select('*').eq('is_visible', true).order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.benefits = r.data || [];
        var grid = document.getElementById('benefitsGrid');
        if (!grid) return;
        if (!AppState.benefits.length) { grid.innerHTML = ''; return; }
        grid.innerHTML = AppState.benefits.map(function(b) {
            return '<div class="benefit-card">' +
                '<div class="benefit-card-icon"><i data-lucide="' + escapeHtml(b.icon || 'star') + '"></i></div>' +
                '<h4>' + escapeHtml(b.title) + '</h4>' +
                '<p>' + escapeHtml(b.description) + '</p>' +
                '</div>';
        }).join('');
        refreshIcons();
    } catch (err) { console.warn('Benefits error:', err.message); }
}

// ============================================================
// UPCOMING EVENTS
// ============================================================
async function loadUpcomingEvents() {
    try {
        if (!supabase) return;
        var today = new Date().toISOString().split('T')[0];
        var nw = new Date(); nw.setDate(nw.getDate() + 7);
        var nwStr = nw.toISOString().split('T')[0];
        var r = await supabase.from('events').select('*').eq('status', 'approved').gte('date', today).lte('date', nwStr).order('date', { ascending: true });
        if (r.error) throw r.error;
        var grid = document.getElementById('upcomingGrid');
        var empty = document.getElementById('upcomingEmpty');
        if (!grid) return;
        var evs = r.data || [];
        if (!evs.length) {
            grid.innerHTML = '';
            if (empty) { empty.style.display = 'flex'; grid.appendChild(empty); }
        } else {
            if (empty) empty.style.display = 'none';
            grid.innerHTML = evs.map(function(ev) { return buildEventCard(ev, true); }).join('');
        }
        refreshIcons();
    } catch (err) { console.warn('Upcoming events error:', err.message); }
}

// ============================================================
// COMPLETED PROJECTS
// ============================================================
async function loadCompletedProjects() {
    try {
        if (!supabase) return;
        var r = await supabase.from('events').select('*').eq('status', 'completed').order('date', { ascending: false });
        if (r.error) throw r.error;
        AppState.allProjects = r.data || [];
        AppState.projectsPage = 0;
        renderProjects();
    } catch (err) { console.warn('Projects error:', err.message); }
}

function renderProjects() {
    var grid = document.getElementById('projectsGrid');
    var empty = document.getElementById('projectsEmpty');
    var btn = document.getElementById('loadMoreProjects');
    if (!grid) return;

    var filtered = (AppState.allProjects || []).filter(function(p) {
        return !AppState.currentAvenue || AppState.currentAvenue === 'all' || p.avenue === AppState.currentAvenue;
    });

    if (!filtered.length) {
        grid.innerHTML = '';
        if (empty) { empty.style.display = 'flex'; grid.appendChild(empty); }
        if (btn) btn.style.display = 'none';
        refreshIcons();
        return;
    }

    if (empty) empty.style.display = 'none';
    var perPage = AppState.projectsPerPage || 9;
    var end = (AppState.projectsPage + 1) * perPage;
    grid.innerHTML = filtered.slice(0, end).map(function(ev) { return buildEventCard(ev, false); }).join('');
    if (btn) btn.style.display = end < filtered.length ? 'block' : 'none';
    refreshIcons();
}

function loadMoreProjects() {
    AppState.projectsPage = (AppState.projectsPage || 0) + 1;
    renderProjects();
    setTimeout(addRevealClasses, 100);
}

function filterAvenue(avenue) {
    AppState.currentAvenue = avenue || 'all';
    AppState.projectsPage = 0;
    document.querySelectorAll('.avenue-tab').forEach(function(t) {
        t.classList.toggle('active', t.getAttribute('data-avenue') === AppState.currentAvenue);
    });
    renderProjects();
    setTimeout(function() { scrollToSection('projects'); }, 100);
}

// ============================================================
// BUILD EVENT CARD
// ============================================================
function buildEventCard(ev, isUpcoming) {
    if (!ev) return '';
    var poster = ev.poster_url || (ev.poster_urls && ev.poster_urls.length ? ev.poster_urls[0] : '');
    var days = getDaysUntil(ev.date);
    var timeStr = ev.start_time ? (formatTime(ev.start_time) + (ev.end_time ? ' - ' + formatTime(ev.end_time) : '')) : 'Time TBA';
    var dayBadge = (isUpcoming && days >= 0) ? ('<span class="badge badge-primary" style="margin-left:6px;">' + (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : 'In ' + days + ' days') + '</span>') : '';

    var posterHtml = poster ?
        '<div class="event-card-poster"><img src="' + escapeHtml(poster) + '" alt="' + escapeHtml(ev.title) + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=event-card-poster-placeholder><i data-lucide=image></i></div>\'"></div>' :
        '<div class="event-card-poster"><div class="event-card-poster-placeholder"><i data-lucide="calendar"></i><span>' + formatDateShort(ev.date) + '</span></div></div>';

    return [
        '<div class="event-card" onclick="openProjectDetail(\'' + ev.id + '\')">',
        posterHtml,
        '<div class="event-card-body">',
        '<div class="event-card-avenue avenue-' + (ev.avenue || '') + '"><i data-lucide="' + getAvenueIcon(ev.avenue) + '"></i>' + formatAvenueLabel(ev.avenue) + '</div>',
        '<h3 class="event-card-title">' + escapeHtml(ev.title) + '</h3>',
        '<div class="event-card-meta">',
        '<div class="event-meta-item"><i data-lucide="calendar"></i><span>' + formatDate(ev.date) + '</span>' + dayBadge + '</div>',
        '<div class="event-meta-item"><i data-lucide="clock"></i><span>' + timeStr + '</span></div>',
        ev.venue ? '<div class="event-meta-item"><i data-lucide="map-pin"></i><span>' + escapeHtml(truncateText(ev.venue, 35)) + '</span></div>' : '',
        ev.event_chair ? '<div class="event-meta-item"><i data-lucide="user"></i><span>Chair: ' + escapeHtml(ev.event_chair) + '</span></div>' : '',
        '</div>',
        '<div class="event-card-footer">',
        '<span class="event-card-status status-' + (ev.status || '') + '">' + formatStatusLabel(ev.status) + '</span>',
        '<div class="event-card-actions">',
        '<button class="event-detail-btn" onclick="event.stopPropagation();openProjectDetail(\'' + ev.id + '\')"><i data-lucide="eye"></i>Details</button>',
        isUpcoming ? '<button class="event-detail-btn" onclick="event.stopPropagation();calendarDownload(\'' + ev.id + '\')" title="Add to Calendar"><i data-lucide="calendar-plus"></i></button>' : '',
        '</div></div></div></div>'
    ].join('');
}

function getAvenueIcon(av) {
    return { 'club_service': 'users', 'community_service': 'heart', 'professional_service': 'briefcase', 'international_service': 'globe', 'district_priority': 'flag' }[av] || 'folder';
}

// ============================================================
// PROJECT DETAIL MODAL
// ============================================================
var currentDetailEvent = null;

async function openProjectDetail(eventId) {
    if (!eventId) return;
    try {
        var ev = findEventById(eventId);
        if (!ev && supabase) {
            var r = await supabase.from('events').select('*').eq('id', eventId).single();
            if (r.error || !r.data) { showToast('error', 'Not Found', 'Event details could not be loaded'); return; }
            ev = r.data;
        }
        if (!ev) { showToast('error', 'Error', 'Event not found'); return; }
        currentDetailEvent = ev;

        var photos = [];
        if (supabase) {
            var pr = await supabase.from('event_photos').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
            if (!pr.error && pr.data) photos = pr.data;
        }

        var allImgs = [];
        if (ev.poster_url) allImgs.push(ev.poster_url);
        (ev.poster_urls || []).forEach(function(u) { if (u && allImgs.indexOf(u) === -1) allImgs.push(u); });
        photos.forEach(function(p) { if (p.photo_url && allImgs.indexOf(p.photo_url) === -1) allImgs.push(p.photo_url); });
        (ev.report_photos || []).forEach(function(p) { if (p && allImgs.indexOf(p) === -1) allImgs.push(p); });

        var titleEl = document.getElementById('projectModalTitle');
        var bodyEl = document.getElementById('projectModalBody');
        var calBtn = document.getElementById('addToCalendarBtn');

        if (titleEl) titleEl.innerHTML = '<i data-lucide="folder-open"></i>' + escapeHtml(ev.title || '');
        if (calBtn) calBtn.style.display = isFutureDate(ev.date) ? 'inline-flex' : 'none';

        var html = '';

        if (allImgs.length > 0) {
            var imgsStr = JSON.stringify(allImgs);
            html += '<div style="margin-bottom:20px;">';
            html += '<img src="' + escapeHtml(allImgs[0]) + '" class="project-poster-large" onclick="openImageViewer(' + escapeHtml(imgsStr) + ', 0)" onerror="this.style.display=\'none\'">';
            if (allImgs.length > 1) {
                html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">';
                allImgs.slice(1, 7).forEach(function(img, i) {
                    html += '<img src="' + escapeHtml(img) + '" style="width:72px;height:54px;object-fit:cover;border-radius:8px;cursor:pointer;border:1px solid var(--border-color);" onclick="openImageViewer(' + escapeHtml(imgsStr) + ', ' + (i + 1) + ')" loading="lazy" onerror="this.style.display=\'none\'">';
                });
                if (allImgs.length > 7) html += '<div style="width:72px;height:54px;border-radius:8px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;color:var(--primary);border:1px solid var(--border-color);">+' + (allImgs.length - 7) + '</div>';
                html += '</div>';
            }
            html += '</div>';
        }

        html += '<div class="project-detail-grid">';
        html += '<div class="project-detail-item"><span class="project-detail-label">Avenue</span><span class="project-detail-value"><span class="event-card-avenue avenue-' + ev.avenue + '"><i data-lucide="' + getAvenueIcon(ev.avenue) + '"></i>' + formatAvenueLabel(ev.avenue) + '</span></span></div>';
        html += '<div class="project-detail-item"><span class="project-detail-label">Date</span><span class="project-detail-value">' + formatDate(ev.date) + '</span></div>';
        html += '<div class="project-detail-item"><span class="project-detail-label">Time</span><span class="project-detail-value">' + (ev.start_time ? (formatTime(ev.start_time) + (ev.end_time ? ' - ' + formatTime(ev.end_time) : '')) : 'Not specified') + '</span></div>';
        html += '<div class="project-detail-item"><span class="project-detail-label">Venue</span><span class="project-detail-value">' + escapeHtml(ev.venue || 'Not specified') + '</span></div>';
        if (ev.event_chair) html += '<div class="project-detail-item"><span class="project-detail-label">Event Chair</span><span class="project-detail-value">' + escapeHtml(ev.event_chair) + '</span></div>';
        if (ev.proposed_by) html += '<div class="project-detail-item"><span class="project-detail-label">Proposed By</span><span class="project-detail-value">' + escapeHtml(ev.proposed_by) + '</span></div>';
        if (ev.seconded_by) html += '<div class="project-detail-item"><span class="project-detail-label">Seconded By</span><span class="project-detail-value">' + escapeHtml(ev.seconded_by) + '</span></div>';
        if (ev.collaboration_type && ev.collaboration_type !== 'none') html += '<div class="project-detail-item"><span class="project-detail-label">Collaboration</span><span class="project-detail-value">' + formatCollaborationType(ev.collaboration_type) + (ev.collaborator_name ? ' - ' + escapeHtml(ev.collaborator_name) : '') + '</span></div>';
        html += '<div class="project-detail-item"><span class="project-detail-label">Status</span><span class="project-detail-value"><span class="event-card-status status-' + ev.status + '">' + formatStatusLabel(ev.status) + '</span></span></div>';
        if (ev.beneficiaries_count > 0) html += '<div class="project-detail-item"><span class="project-detail-label">Beneficiaries</span><span class="project-detail-value">' + formatNumberFull(ev.beneficiaries_count) + '</span></div>';
        if (ev.participants_count > 0) html += '<div class="project-detail-item"><span class="project-detail-label">Participants</span><span class="project-detail-value">' + formatNumberFull(ev.participants_count) + '</span></div>';
        if (ev.volunteer_hours > 0) html += '<div class="project-detail-item"><span class="project-detail-label">Volunteer Hours</span><span class="project-detail-value">' + ev.volunteer_hours + '</span></div>';
        html += '</div>';

        if (ev.description) {
            html += '<div style="margin-top:18px;"><h4 style="font-size:0.9rem;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><i data-lucide="file-text" style="width:16px;height:16px;color:var(--primary);"></i>Description</h4>';
            html += '<div class="project-description">' + escapeHtml(ev.description).replace(/\n/g, '<br>') + '</div></div>';
        }

        if (isFutureDate(ev.date)) {
            html += '<div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">';
            html += '<a href="' + generateSafeGoogleCalLink(ev) + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i data-lucide="calendar-plus"></i>Google Calendar</a>';
            html += '<button class="btn btn-outline btn-sm" onclick="safeDownloadICS(currentDetailEvent)"><i data-lucide="download"></i>Download .ics</button>';
            html += '</div>';
        }

        if (bodyEl) bodyEl.innerHTML = html;
        openModal('projectModal');
        refreshIcons();

    } catch (err) {
        console.error('Project detail error:', err);
        showToast('error', 'Error', 'Could not load project details. Please try again.');
    }
}

function showProjectDetail(id) { openProjectDetail(id); }
function viewEventDetail(id) { openProjectDetail(id); }

function findEventById(id) {
    if (!id) return null;
    var ev = (AppState.allProjects || []).find(function(e) { return e.id === id; });
    if (ev) return ev;
    return (AppState.events || []).find(function(e) { return e.id === id; }) || null;
}

// ============================================================
// SAFE CALENDAR HELPERS
// ============================================================
function buildSafeDateTime(dateStr, timeStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    var t = (timeStr && /^\d{2}:\d{2}/.test(timeStr)) ? timeStr.substring(0, 5) : '09:00';
    try { var d = new Date(dateStr + 'T' + t + ':00'); return isNaN(d.getTime()) ? null : d; } catch (e) { return null; }
}

function generateSafeGoogleCalLink(ev) {
    if (!ev || !ev.date) return '#';
    try {
        var s = buildSafeDateTime(ev.date, ev.start_time);
        if (!s) return '#';
        var e = buildSafeDateTime(ev.date, ev.end_time);
        if (!e || e <= s) e = new Date(s.getTime() + 7200000);
        function f(d) { return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0') + 'T' + String(d.getUTCHours()).padStart(2, '0') + String(d.getUTCMinutes()).padStart(2, '0') + '00Z'; }
        return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: ev.title || 'Event', dates: f(s) + '/' + f(e), details: ev.description || '', location: ev.venue || 'Coimbatore, Tamil Nadu' }).toString();
    } catch (e) { return '#'; }
}

function safeDownloadICS(ev) {
    if (!ev || !ev.date) { showToast('error', 'Error', 'Invalid event data'); return; }
    try {
        var s = buildSafeDateTime(ev.date, ev.start_time);
        if (!s) { showToast('error', 'Error', 'Invalid event date'); return; }
        var e = buildSafeDateTime(ev.date, ev.end_time);
        if (!e || e <= s) e = new Date(s.getTime() + 7200000);
        function f(d) { return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0') + 'T' + String(d.getUTCHours()).padStart(2, '0') + String(d.getUTCMinutes()).padStart(2, '0') + String(d.getUTCSeconds()).padStart(2, '0') + 'Z'; }
        var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rotaract Club of Coimbatore Unity//Events//EN', 'BEGIN:VEVENT', 'DTSTART:' + f(s), 'DTEND:' + f(e), 'SUMMARY:' + (ev.title || 'Event'), 'DESCRIPTION:' + ((ev.description || '').replace(/\n/g, '\\n')), 'LOCATION:' + (ev.venue || 'Coimbatore, Tamil Nadu'), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
        var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        if (window.saveAs) { saveAs(blob, (typeof slugify === 'function' ? slugify(ev.title || 'event') : 'event') + '.ics'); showToast('success', 'Downloaded', 'Calendar file ready'); }
    } catch (e) { showToast('error', 'Error', 'Could not generate calendar file'); }
}

function calendarDownload(eventId) {
    var ev = findEventById(eventId);
    if (ev) safeDownloadICS(ev);
}

function addToCalendar() {
    if (!currentDetailEvent) return;
    var url = generateSafeGoogleCalLink(currentDetailEvent);
    if (url && url !== '#') window.open(url, '_blank', 'noopener');
    else showToast('info', 'Calendar', 'Calendar link not available for this event');
}

// ============================================================
// MEMBERS
// ============================================================
async function loadPublicMembers() {
    try {
        if (!supabase) return;
        var r = await supabase.from('members').select('*').eq('is_active', true).eq('show_on_website', true).order('is_board_member', { ascending: false }).order('full_name', { ascending: true });
        if (r.error) throw r.error;
        AppState.members = r.data || [];
        renderPublicMembers(AppState.members);
    } catch (err) { console.warn('Members error:', err.message); }
}

function renderPublicMembers(members) {
    var bGrid = document.getElementById('boardMembersGrid');
    var mGrid = document.getElementById('membersGrid');
    if (!bGrid || !mGrid) return;
    var positions = ['President', 'Immediate Past President', 'Secretary', 'Joint Secretary', 'Treasurer', 'Club Service Director', 'Community Service Director', 'Professional Service Director', 'International Service Director', 'District Priority Director'];
    var board = (members || []).filter(function(m) { return m.is_board_member; });
    var regular = (members || []).filter(function(m) { return !m.is_board_member; });
    board.sort(function(a, b) {
        var ap = a.board_position || '', bp = b.board_position || '', ai = 999, bi = 999;
        positions.forEach(function(p, i) { if (ap.toLowerCase().indexOf(p.toLowerCase()) !== -1) ai = i; if (bp.toLowerCase().indexOf(p.toLowerCase()) !== -1) bi = i; });
        return ai - bi;
    });
    bGrid.innerHTML = board.length ? board.map(memberCard).join('') : '<p style="color:var(--text-tertiary);font-size:0.85rem;padding:20px 0;">Board members will appear here</p>';
    mGrid.innerHTML = regular.length ? regular.map(memberCard).join('') : '<p style="color:var(--text-tertiary);font-size:0.85rem;padding:20px 0;">Members will appear here</p>';
    refreshIcons();
}

function memberCard(m) {
    var hasPhoto = m.photo_url && m.photo_url.startsWith('http');
    return '<div class="member-card" onclick="showMemberDetail(\'' + m.id + '\')">' +
        '<div class="member-card-photo">' + (hasPhoto ? '<img src="' + escapeHtml(m.photo_url) + '" alt="' + escapeHtml(m.full_name) + '" loading="lazy" onerror="this.src=\'' + getDefaultAvatar(m.full_name) + '\'">' : '<div class="member-card-photo-placeholder"><i data-lucide="user"></i></div>') + '</div>' +
        '<div class="member-card-name">' + escapeHtml(m.full_name) + '</div>' +
        '<div class="member-card-designation">' + escapeHtml(m.board_position || m.designation || 'Member') + '</div>' +
        (m.ri_id ? '<div class="member-card-info">RI ID: ' + escapeHtml(m.ri_id) + '</div>' : '') + '</div>';
}

function showMemberDetail(memberId) {
    var m = (AppState.members || []).find(function(x) { return x.id === memberId; });
    if (!m) return;
    var body = document.getElementById('memberModalBody');
    if (!body) return;
    var hasPhoto = m.photo_url && m.photo_url.startsWith('http');
    var fields = [['hash', 'RI ID', m.ri_id], ['mail', 'Email', m.email], ['phone', 'Contact', m.phone], ['droplet', 'Blood Group', m.blood_group], ['calendar', 'Date of Birth', m.date_of_birth ? formatDate(m.date_of_birth) : ''], ['map-pin', 'Area', m.area], ['briefcase', 'Profession', m.profession], ['building', 'Company', m.company]].filter(function(f) { return f[2]; });
    body.innerHTML = '<div style="text-align:center;margin-bottom:20px;"><div style="width:110px;height:110px;border-radius:50%;margin:0 auto 14px;overflow:hidden;border:4px solid var(--primary);background:var(--bg-tertiary);">' + (hasPhoto ? '<img src="' + escapeHtml(m.photo_url) + '" style="width:100%;height:100%;object-fit:cover;">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i data-lucide="user" style="width:44px;height:44px;color:var(--text-tertiary);"></i></div>') + '</div><h3 style="font-size:1.12rem;font-weight:800;margin-bottom:4px;">' + escapeHtml(m.full_name) + '</h3><p style="color:var(--primary);font-weight:600;font-size:0.88rem;">' + escapeHtml(m.board_position || m.designation || 'Member') + '</p></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' + fields.map(function(f) { return '<div style="padding:9px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--border-light);"><div style="font-size:0.68rem;color:var(--text-tertiary);display:flex;align-items:center;gap:4px;margin-bottom:3px;"><i data-lucide="' + f[0] + '" style="width:11px;height:11px;"></i>' + f[1] + '</div><div style="font-size:0.82rem;font-weight:700;word-break:break-word;">' + escapeHtml(String(f[2])) + '</div></div>'; }).join('') + '</div>';
    openModal('memberModal');
    refreshIcons();
}

// ============================================================
// TRAINERS / PRESIDENTS / SECRETARIES / NEWSLETTERS
// ============================================================
async function loadPublicTrainers() {
    try {
        if (!supabase) return;
        var r = await supabase.from('club_trainers').select('*').eq('is_active', true).order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.trainers = r.data || [];
        var grid = document.getElementById('trainersGrid');
        if (!grid) return;
        if (!AppState.trainers.length) { grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i data-lucide="graduation-cap"></i><p>Club trainers will appear here</p></div>'; refreshIcons(); return; }
        grid.innerHTML = AppState.trainers.map(function(t) {
            var photo = (t.photo_url && t.photo_url.startsWith('http')) ? t.photo_url : getDefaultAvatar(t.name);
            return '<div class="trainer-card"><div class="trainer-photo"><img src="' + escapeHtml(photo) + '" alt="' + escapeHtml(t.name) + '" loading="lazy" onerror="this.src=\'' + getDefaultAvatar(t.name) + '\'"></div><div class="trainer-info"><h4>' + escapeHtml(t.name) + '</h4>' + (t.ri_id ? '<p><i data-lucide="hash"></i>RI ID: ' + escapeHtml(t.ri_id) + '</p>' : '') + (t.email ? '<p><i data-lucide="mail"></i><a href="mailto:' + escapeHtml(t.email) + '">' + escapeHtml(t.email) + '</a></p>' : '') + (t.phone ? '<p><i data-lucide="phone"></i><a href="tel:' + escapeHtml(t.phone) + '">' + escapeHtml(t.phone) + '</a></p>' : '') + (t.specialization ? '<p><i data-lucide="award"></i>' + escapeHtml(t.specialization) + '</p>' : '') + '</div></div>';
        }).join('');
        refreshIcons();
    } catch (err) { console.warn('Trainers error:', err.message); }
}

async function loadPastPresidents() {
    try {
        if (!supabase) return;
        var r = await supabase.from('past_presidents').select('*').order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.pastPresidents = r.data || [];
        renderTimeline('pastPresidentsTimeline', AppState.pastPresidents);
    } catch (err) { console.warn('Presidents error:', err.message); }
}

async function loadPastSecretaries() {
    try {
        if (!supabase) return;
        var r = await supabase.from('past_secretaries').select('*').order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.pastSecretaries = r.data || [];
        renderTimeline('pastSecretariesTimeline', AppState.pastSecretaries);
    } catch (err) { console.warn('Secretaries error:', err.message); }
}

function renderTimeline(cId, items) {
    var c = document.getElementById(cId);
    if (!c) return;
    if (!items || !items.length) { c.innerHTML = '<p style="color:var(--text-tertiary);font-size:0.83rem;padding:20px 0;">Will appear here once added</p>'; return; }
    c.innerHTML = items.map(function(item, i) {
        var hp = item.photo_url && item.photo_url.startsWith('http');
        return '<div class="timeline-item" style="animation-delay:' + (i * 0.08) + 's"><div class="timeline-item-content"><div class="timeline-photo">' + (hp ? '<img src="' + escapeHtml(item.photo_url) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">' : '<div class="timeline-photo-placeholder"><i data-lucide="user"></i></div>') + '</div><div class="timeline-details"><div class="timeline-name">' + escapeHtml(item.name) + '</div><div class="timeline-year">' + escapeHtml(item.year_from) + ' - ' + escapeHtml(item.year_to) + '</div>' + (item.theme ? '<div class="timeline-theme">' + escapeHtml(item.theme) + '</div>' : '') + '</div></div></div>';
    }).join('');
    refreshIcons();
}

async function loadPublicNewsletters() {
    try {
        if (!supabase) return;
        var r = await supabase.from('newsletters').select('*').eq('is_published', true).order('year', { ascending: false }).limit(12);
        if (r.error) throw r.error;
        AppState.newsletters = r.data || [];
        var grid = document.getElementById('newsletterGrid');
        var empty = document.getElementById('newsletterEmpty');
        if (!grid) return;
        if (!AppState.newsletters.length) { grid.innerHTML = ''; if (empty) { empty.style.display = 'flex'; grid.appendChild(empty); } refreshIcons(); return; }
        if (empty) empty.style.display = 'none';
        grid.style.display = 'flex';
        grid.innerHTML = AppState.newsletters.map(function(nl) {
            var hc = nl.cover_image_url && nl.cover_image_url.startsWith('http');
            return '<div class="newsletter-card"><div class="newsletter-cover">' + (hc ? '<img src="' + escapeHtml(nl.cover_image_url) + '" alt="' + escapeHtml(nl.title) + '" loading="lazy">' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);flex-direction:column;gap:8px;"><i data-lucide="newspaper" style="width:36px;height:36px;"></i><span style="font-size:0.82rem;">' + escapeHtml(nl.month) + ' ' + nl.year + '</span></div>') + '</div><div class="newsletter-info"><h4>' + escapeHtml(nl.title) + '</h4><p>' + escapeHtml(nl.month) + ' ' + nl.year + '</p>' + (nl.pdf_url ? '<a href="' + escapeHtml(nl.pdf_url) + '" target="_blank" rel="noopener" class="newsletter-download"><i data-lucide="download"></i>Download</a>' : '') + '</div></div>';
        }).join('');
        refreshIcons();
    } catch (err) { console.warn('Newsletters error:', err.message); }
}

// ============================================================
// MEMBERSHIP FORM
// ============================================================
async function submitMembership(e) {
    e.preventDefault();
    var btn = document.getElementById('submitMembershipBtn');
    if (!btn) return;
    if (getSetting('membership_open', 'true') !== 'true') { showToast('info', 'Closed', 'Applications currently closed'); return; }
    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    var name = gv('appName'), email = gv('appEmail').toLowerCase(), phone = gv('appPhone'), dob = gv('appDob'), blood = gv('appBlood');
    var photoInput = document.getElementById('appPhoto');
    var photoFile = photoInput && photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;
    if (!name || !email || !phone || !dob || !blood) { showToast('error', 'Required', 'Please fill all required fields'); return; }
    if (!validateEmail(email)) { showToast('error', 'Invalid', 'Please enter a valid email'); return; }
    if (!photoFile) { showToast('error', 'Photo', 'Please upload a photo'); return; }
    if (photoFile.size > 5 * 1024 * 1024) { showToast('error', 'Large', 'Photo must be under 5MB'); return; }
    if (supabase) { var dup = await supabase.from('membership_applications').select('id').eq('email', email).in('status', ['pending', 'reviewed']); if (dup.data && dup.data.length > 0) { showToast('info', 'Exists', 'Application with this email already under review'); return; } }
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-flex;gap:6px;align-items:center;"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;"></span>Submitting...</span>';
    try {
        var fp = generateFilePath('applications', photoFile.name);
        var photoUrl = await uploadFile('members', fp, photoFile);
        if (!photoUrl) throw new Error('Photo upload failed');
        var ins = await supabase.from('membership_applications').insert({ full_name: name, email: email, phone: phone, date_of_birth: dob, blood_group: blood, photo_url: photoUrl, profession: gv('appProfession') || null, area: gv('appArea') || null, reason_to_join: gv('appReason') || null, reference: gv('appReference') || null, status: 'pending' });
        if (ins.error) throw ins.error;
        document.getElementById('membershipForm').reset();
        var preview = document.getElementById('photoPreview'); if (preview) preview.style.display = 'none';
        var placeholder = document.getElementById('photoPlaceholder'); if (placeholder) placeholder.style.display = '';
        await showAlert('Submitted!', 'Thank you ' + name + '! Your application has been received and will be reviewed soon.', 'success');
    } catch (err) { showToast('error', 'Failed', err.message || 'Please try again'); }
    finally { btn.disabled = false; btn.innerHTML = '<i data-lucide="send"></i>Submit Application'; refreshIcons(); }
}

// ============================================================
// ADMIN DASHBOARD — COMPLETE FIXED
// ============================================================
async function loadAdminDashboard() {
    if (!AppState.currentAdmin) return;
    if (!supabase) { showToast('error', 'Error', 'Database not connected'); return; }

    try {
        // Stats
        var sr = await supabase.rpc('get_club_dashboard_stats');
        if (!sr.error && sr.data && sr.data[0]) renderDashboardStats(sr.data[0]);

        var today = new Date().toISOString().split('T')[0];

        // Upcoming events
        var ur = await supabase.from('events').select('id,title,avenue,date').gte('date', today).eq('status', 'approved').order('date', { ascending: true }).limit(5);
        renderDashboardList('dashUpcomingEvents', ur.error ? [] : (ur.data || []), function(e) {
            return '<div class="dashboard-list-item" style="cursor:pointer;" onclick="openProjectDetail(\'' + e.id + '\')">' +
                '<span class="event-card-avenue avenue-' + e.avenue + '" style="font-size:0.63rem;padding:2px 6px;flex-shrink:0;">' + formatAvenueLabel(e.avenue).substring(0, 4) + '</span>' +
                '<div style="flex:1;min-width:0;"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.8rem;">' + escapeHtml(e.title) + '</div><div style="font-size:0.7rem;color:var(--text-tertiary);">' + formatDateShort(e.date) + '</div></div>' +
                '<span class="badge badge-primary" style="flex-shrink:0;">' + (getDaysUntil(e.date) === 0 ? 'Today' : getDaysUntil(e.date) + 'd') + '</span></div>';
        });

        // Pending approvals
        var pr = await supabase.from('events').select('id,title,avenue').eq('status', 'proposed').order('created_at', { ascending: false }).limit(5);
        renderDashboardList('dashPendingApprovals', pr.error ? [] : (pr.data || []), function(e) {
            return '<div class="dashboard-list-item">' +
                '<span class="badge badge-warning" style="font-size:0.63rem;flex-shrink:0;">Pending</span>' +
                '<div style="flex:1;min-width:0;"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.8rem;">' + escapeHtml(e.title) + '</div><div style="font-size:0.7rem;color:var(--text-tertiary);">' + formatAvenueLabel(e.avenue) + '</div></div>' +
                (canApproveProjects() ? '<button class="btn btn-sm btn-success" onclick="quickApproveEvent(\'' + e.id + '\')" style="padding:4px 8px;font-size:0.68rem;flex-shrink:0;"><i data-lucide="check" style="width:11px;height:11px;"></i>Approve</button>' : '') + '</div>';
        });

        // Applications
        var ar = await supabase.from('membership_applications').select('id,full_name,photo_url,created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
        var appData = ar.error ? [] : (ar.data || []);
        var badge = document.getElementById('appBadge');
        if (badge) { badge.textContent = appData.length; badge.style.display = appData.length > 0 ? 'inline' : 'none'; }
        renderDashboardList('dashRecentApps', appData, function(a) {
            return '<div class="dashboard-list-item" style="cursor:pointer;" onclick="viewApplicationDetail(\'' + a.id + '\')">' +
                '<div style="width:30px;height:30px;border-radius:50%;overflow:hidden;border:2px solid var(--border-color);flex-shrink:0;background:var(--bg-tertiary);">' + (a.photo_url ? '<img src="' + escapeHtml(a.photo_url) + '" style="width:100%;height:100%;object-fit:cover;">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i data-lucide="user" style="width:13px;height:13px;"></i></div>') + '</div>' +
                '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.8rem;">' + escapeHtml(a.full_name) + '</div><div style="font-size:0.7rem;color:var(--text-tertiary);">' + getRelativeTime(a.created_at) + '</div></div>' +
                '<span class="badge badge-warning" style="flex-shrink:0;">Pending</span></div>';
        });

        // Birthdays
        if (!AppState.members || !AppState.members.length) {
            var mr = await supabase.from('members').select('id,full_name,date_of_birth,photo_url,is_active').eq('is_active', true);
            if (!mr.error) AppState.members = mr.data || [];
        }
        var bdays = getUpcomingBirthdays(AppState.members || [], 30);
        renderDashboardList('dashBirthdays', bdays, function(m) {
            return '<div class="dashboard-list-item">' +
                '<div style="width:30px;height:30px;border-radius:50%;overflow:hidden;border:2px solid var(--border-color);flex-shrink:0;background:var(--bg-tertiary);">' + (m.photo_url ? '<img src="' + escapeHtml(m.photo_url) + '" style="width:100%;height:100%;object-fit:cover;">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i data-lucide="user" style="width:13px;height:13px;"></i></div>') + '</div>' +
                '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.8rem;">' + escapeHtml(m.full_name) + '</div><div style="font-size:0.7rem;color:var(--text-tertiary);">' + formatDate(m.date_of_birth) + '</div></div>' +
                '<span class="badge ' + (m.daysUntil === 0 ? 'badge-success' : 'badge-primary') + '" style="flex-shrink:0;">' + (m.daysUntil === 0 ? 'Today!' : m.daysUntil + 'd') + '</span></div>';
        });

        // Activity (no FK join to avoid 400)
        var actLogs = await _loadActivityForDashboard();
        renderDashboardList('dashActivity', actLogs, function(a) {
            return '<div class="dashboard-list-item">' +
                '<span class="badge badge-info" style="font-size:0.63rem;flex-shrink:0;">' + escapeHtml((a.action || '').replace(/_/g, ' ').substring(0, 18)) + '</span>' +
                '<div style="flex:1;min-width:0;"><div style="font-weight:500;font-size:0.78rem;">' + escapeHtml(a.admin ? a.admin.full_name : 'System') + '</div></div>' +
                '<span style="font-size:0.68rem;color:var(--text-tertiary);flex-shrink:0;">' + getRelativeTime(a.created_at) + '</span></div>';
        });

        await loadDashboardTreasuryChart();
        refreshIcons();

    } catch (err) {
        console.error('Dashboard error:', err);
        showToast('error', 'Dashboard Error', 'Failed to load dashboard. Please try again.');
    }
}

async function _loadActivityForDashboard() {
    try {
        if (!supabase) return [];
        var lr = await supabase.from('activity_log').select('id,action,admin_id,created_at').order('created_at', { ascending: false }).limit(8);
        if (lr.error) return [];
        var logs = lr.data || [];
        var ids = []; logs.forEach(function(l) { if (l.admin_id && ids.indexOf(l.admin_id) === -1) ids.push(l.admin_id); });
        var map = {};
        if (ids.length > 0) { var ar = await supabase.from('admin_users').select('id,full_name').in('id', ids); if (!ar.error && ar.data) ar.data.forEach(function(a) { map[a.id] = a; }); }
        return logs.map(function(l) { return Object.assign({}, l, { admin: l.admin_id ? map[l.admin_id] : null }); });
    } catch (e) { return []; }
}

function renderDashboardStats(s) {
    var g = document.getElementById('dashboardStatsGrid');
    if (!g || !s) return;
    var cards = [
        { l: 'Active Members', v: s.active_members_count, i: 'users', c: 'blue' },
        { l: 'Total Events', v: s.total_events, i: 'calendar', c: 'purple' },
        { l: 'Completed', v: s.completed_events, i: 'check-circle', c: 'green' },
        { l: 'Upcoming', v: s.upcoming_events_count, i: 'calendar-clock', c: 'cyan' },
        { l: 'Pending Approvals', v: s.pending_approvals, i: 'clock', c: 'orange' },
        { l: 'Applications', v: s.pending_applications, i: 'user-plus', c: 'red' },
        { l: 'Balance', v: 'Rs. ' + formatCurrency(s.treasury_balance), i: 'wallet', c: 'green', t: true },
        { l: 'Vol. Hours', v: s.total_volunteer_hours, i: 'clock', c: 'blue' }
    ];
    g.innerHTML = cards.map(function(c) {
        return '<div class="dash-stat-card"><div class="dash-stat-icon ' + c.c + '"><i data-lucide="' + c.i + '"></i></div><div class="dash-stat-info"><div class="dash-stat-value">' + (c.t ? c.v : formatNumberFull(c.v || 0)) + '</div><div class="dash-stat-label">' + c.l + '</div></div></div>';
    }).join('');
    refreshIcons();
}

function renderDashboardList(id, items, fn) {
    var c = document.getElementById(id);
    if (!c) return;
    if (!items || !items.length) { c.innerHTML = '<div class="dashboard-list-empty"><i data-lucide="inbox"></i>No items</div>'; refreshIcons(); return; }
    try { c.innerHTML = items.map(fn).join(''); } catch (e) { c.innerHTML = '<div class="dashboard-list-empty">Error loading</div>'; }
    refreshIcons();
}

async function loadDashboardTreasuryChart() {
    try {
        if (!supabase || typeof Chart === 'undefined') return;
        var r = await supabase.from('treasury_monthly').select('*').order('month', { ascending: true }).limit(12);
        if (r.error) throw r.error;
        var canvas = document.getElementById('treasuryChart');
        if (!canvas) return;
        if (AppState.treasuryChart) { try { AppState.treasuryChart.destroy(); } catch (e) {} AppState.treasuryChart = null; }
        var old = canvas.parentElement.querySelector('.chart-empty-msg');
        if (old) old.remove();
        if (!r.data || !r.data.length) {
            var p = document.createElement('p'); p.className = 'chart-empty-msg'; p.style.cssText = 'text-align:center;color:var(--text-tertiary);font-size:0.82rem;margin-top:12px;'; p.textContent = 'No treasury data yet'; canvas.parentElement.appendChild(p); return;
        }
        var dk = AppState.theme === 'dark', tc = dk ? '#b0b0c8' : '#4a4a6a', gc = dk ? 'rgba(100,100,180,0.1)' : 'rgba(0,0,0,0.06)';
        AppState.treasuryChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: r.data.map(function(d) { return (d.month_label || '').trim().split(' ')[0].substring(0, 3); }),
                datasets: [
                    { label: 'Income', data: r.data.map(function(d) { return parseFloat(d.income) || 0; }), backgroundColor: 'rgba(16,185,129,0.6)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 },
                    { label: 'Expenses', data: r.data.map(function(d) { return parseFloat(d.expenses) || 0; }), backgroundColor: 'rgba(239,68,68,0.6)', borderColor: '#ef4444', borderWidth: 1, borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: tc, font: { family: 'Poppins', size: 11 }, usePointStyle: true } }, tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': Rs.' + formatCurrency(ctx.raw); } } } },
                scales: { x: { ticks: { color: tc, font: { family: 'Poppins', size: 10 } }, grid: { color: gc } }, y: { ticks: { color: tc, font: { family: 'Poppins', size: 10 }, callback: function(v) { return 'Rs.' + formatNumber(v); } }, grid: { color: gc } } }
            }
        });
    } catch (err) { console.warn('Chart error:', err.message); }
}

// ============================================================
// QUICK APPROVE EVENT
// ============================================================
async function quickApproveEvent(eventId) {
    if (!canApproveProjects()) { showToast('error', 'Denied', 'Only President, Advisor or Super Admin can approve'); return; }
    var confirmed = await confirmAction('Approve Event?', 'This event will be published and members notified.', 'Yes, Approve');
    if (!confirmed) return;
    try {
        if (!supabase) return;
        var upd = await supabase.from('events').update({ status: 'approved', approved_by: AppState.currentAdmin.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', eventId);
        if (upd.error) throw upd.error;

        var evR = await supabase.from('events').select('*').eq('id', eventId).single();
        if (!evR.error && evR.data) await _queueProjectApprovalMail(evR.data);

        await logActivity('approve_event', 'events', eventId, {});
        showToast('success', 'Approved', 'Event approved. Members will be notified.');
        await loadAdminDashboard();
        if (typeof loadAdminEvents === 'function' && AppState.currentAdminPage === 'events') await loadAdminEvents();
        await loadUpcomingEvents();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// approveEvent alias used throughout
async function approveEvent(eventId) { await quickApproveEvent(eventId); }

// ============================================================
// QUEUE PROJECT APPROVAL MAIL
// ============================================================
async function _queueProjectApprovalMail(ev) {
    try {
        if (!supabase || !ev) return;
        var members = await getAllMemberEmails(false);
        var emails = members.map(function(m) { return m.email; }).filter(Boolean);
        if (!emails.length) return;
        var tStr = ev.start_time ? (formatTime(ev.start_time) + (ev.end_time ? ' to ' + formatTime(ev.end_time) : '')) : 'Time to be announced';
        var subject = 'New Event: ' + ev.title + ' - Rotaract Club of Coimbatore Unity';
        var body = ['Dear Members,', '', 'We are pleased to announce a new event!', '', 'EVENT DETAILS:', '='.repeat(60), 'Event   : ' + ev.title, 'Avenue  : ' + formatAvenueLabel(ev.avenue), 'Date    : ' + formatDate(ev.date), 'Time    : ' + tStr, 'Venue   : ' + (ev.venue || 'To be announced'), ev.event_chair ? 'Chair   : ' + ev.event_chair : '', '='.repeat(60), ev.description ? '\nDescription:\n' + ev.description + '\n' : '', 'We look forward to your participation!', '', 'Regards,', 'Rotaract Club of Coimbatore Unity', 'Family of Rotary Club of Coimbatore East', 'Rotary International District 3206 (Coimbatore | Pallakkad)', 'Email: rc.cbeunity@gmail.com'].filter(function(l) { return l !== undefined; }).join('\n');
        await supabase.from('notification_queue').insert({ notification_type: 'project_approved', recipient_type: 'all', recipient_emails: emails, subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), related_entity_type: 'events', related_entity_id: ev.id, status: 'queued', created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null });
        await supabase.from('mail_log').insert({ mail_type: 'project_approved', recipient: emails.length + ' member(s)', subject: subject, status: 'queued', related_entity_type: 'events', related_entity_id: ev.id });
        await supabase.from('events').update({ mail_sent: true }).eq('id', ev.id);
        console.log('Approval mail queued for', emails.length, 'recipients');
    } catch (err) { console.error('Queue approval mail error:', err); }
}

// Also expose for admin.js compatibility
var queueProjectApprovalMail = _queueProjectApprovalMail;

// ============================================================
// BIRTHDAY AUTO CHECK
// ============================================================
function startBirthdayAutoCheck() {
    setTimeout(runBirthdayCheck, 20000);
    setInterval(runBirthdayCheck, 3600000);
}

async function runBirthdayCheck() {
    if (AppState.birthdayCheckDone) return;
    if (getSetting('auto_birthday_wish', 'true') !== 'true') return;
    try {
        if (!supabase) return;
        var r = await supabase.rpc('get_todays_birthdays');
        if (r.error || !r.data || !r.data.length) return;
        var yr = new Date().getFullYear();
        for (var i = 0; i < r.data.length; i++) {
            var m = r.data[i], mid = m.member_id || m.id;
            var chk = await supabase.from('birthday_wishes_log').select('id').eq('member_id', mid).eq('wish_year', yr);
            if (chk.data && chk.data.length) continue;
            if (m.email) {
                var subj = 'Happy Birthday ' + m.full_name + '! - Rotaract Club of Coimbatore Unity';
                var body = ['Dear ' + m.full_name + ',', '', 'Wishing you a very Happy Birthday from the entire family of Rotaract Club of Coimbatore Unity!', '', 'May this year bring you immense joy, success, and more opportunities to serve the community.', '', 'Service Above Self!', '', 'Warm Regards,', 'Rotaract Club of Coimbatore Unity', 'Family of Rotary Club of Coimbatore East', 'Rotary International District 3206 (Coimbatore | Pallakkad)'].join('\n');
                await supabase.from('notification_queue').insert({ notification_type: 'birthday_wish', recipient_type: 'individual', recipient_emails: [m.email], subject: subj, body: body, status: 'queued' });
                await supabase.from('mail_log').insert({ mail_type: 'birthday_wish', recipient: m.email, subject: 'Happy Birthday ' + m.full_name + '!', status: 'queued' });
            }
            await supabase.from('birthday_wishes_log').insert({ member_id: mid, member_name: m.full_name, wish_year: yr });
            console.log('Birthday wish queued:', m.full_name);
        }
        AppState.birthdayCheckDone = true;
    } catch (err) { console.error('Birthday check error:', err); }
}

// ============================================================
// MEETING TIMER CHECK
// ============================================================
function startMeetingTimerCheck() {
    setTimeout(checkMeetingTimers, 30000);
    setInterval(checkMeetingTimers, 60000);
}

async function checkMeetingTimers() {
    try {
        if (!supabase) return;
        var today = new Date().toISOString().split('T')[0];
        var now = new Date().toTimeString().substring(0, 5);
        var r = await supabase.from('meetings').select('*').eq('date', today).eq('status', 'scheduled').eq('attendance_mail_sent', false);
        if (r.error || !r.data || !r.data.length) return;
        for (var i = 0; i < r.data.length; i++) {
            var mt = r.data[i];
            if (mt.start_time && mt.start_time.substring(0, 5) <= now) {
                await _sendAttendanceTrigger(mt);
            }
        }
    } catch (err) { console.error('Meeting timer error:', err); }
}

async function _sendAttendanceTrigger(meeting) {
    try {
        if (!supabase || !meeting) return;
        var attendanceUrl = window.location.origin + (window.location.pathname || '/') + '?attendance=' + meeting.id;
        var q = supabase.from('members').select('email,full_name').eq('is_active', true);
        if (meeting.meeting_type === 'board_meeting') q = q.eq('is_board_member', true);
        var mr = await q;
        var emails = ((mr.data || []).filter(function(m) { return m.email; })).map(function(m) { return m.email; });
        if (!emails.length) return;
        var subject = 'Meeting Attendance: ' + meeting.title + ' - Rotaract Club of Coimbatore Unity';
        var body = ['Dear Members,', '', 'ATTENDANCE SHEET', '='.repeat(60), 'Meeting  : ' + meeting.title, 'Type     : ' + formatMeetingTypeLabel(meeting.meeting_type), 'Date     : ' + formatDate(meeting.date), 'Time     : ' + formatTime(meeting.start_time) + (meeting.end_time ? ' to ' + formatTime(meeting.end_time) : ''), 'Venue    : ' + (meeting.venue || 'To be announced'), '='.repeat(60), '', 'Mark your attendance here:', attendanceUrl, '', 'Please submit before the meeting ends.', '', 'Regards,', 'Rotaract Club of Coimbatore Unity', 'Family of Rotary Club of Coimbatore East', 'Rotary International District 3206 (Coimbatore | Pallakkad)'].join('\n');
        await supabase.from('notification_queue').insert({ notification_type: 'meeting_attendance', recipient_type: meeting.meeting_type === 'board_meeting' ? 'board' : 'all', recipient_emails: emails, subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), related_entity_type: 'meetings', related_entity_id: meeting.id, status: 'queued', created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null });
        await supabase.from('meetings').update({ attendance_mail_sent: true, attendance_mail_sent_at: new Date().toISOString(), attendance_form_url: attendanceUrl, status: 'ongoing' }).eq('id', meeting.id);
        await supabase.from('mail_log').insert({ mail_type: 'meeting_attendance', recipient: emails.length + ' member(s)', subject: subject, status: 'queued', related_entity_type: 'meetings', related_entity_id: meeting.id });
        console.log('Attendance trigger queued:', meeting.title, '->', emails.length, 'recipients');
    } catch (err) { console.error('Attendance trigger error:', err); }
}

// ============================================================
// MONTHLY STATEMENT AUTO CHECK
// ============================================================
function startMonthlyStatementCheck() {
    setTimeout(_checkMonthlyStatement, 60000);
    setInterval(_checkMonthlyStatement, 3600000);
}

async function _checkMonthlyStatement() {
    if (getSetting('auto_monthly_statement', 'true') !== 'true') return;
    var now = new Date();
    if (now.getDate() !== 1) return;
    var key = now.getFullYear() + '-' + now.getMonth();
    if (getLocal('last_monthly_stmt', null) === key) return;
    try {
        if (!supabase) return;
        var lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        var mS = lastM.toISOString().split('T')[0];
        var mE = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        var mN = lastM.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        var tr = await supabase.from('treasury').select('*').gte('date', mS).lte('date', mE).order('date', { ascending: true });
        var txns = tr.data || [];
        var income = txns.reduce(function(s, t) { return s + (t.transaction_type === 'income' ? parseFloat(t.amount) : 0); }, 0);
        var expense = txns.reduce(function(s, t) { return s + (t.transaction_type === 'expense' ? parseFloat(t.amount) : 0); }, 0);
        var allT = await supabase.from('treasury').select('transaction_type,amount');
        var overall = (allT.data || []).reduce(function(s, t) { return s + (t.transaction_type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)); }, 0);
        var lines = ['Dear Members,', '', 'Monthly Treasury Statement for ' + mN + ':', '', '='.repeat(50), 'TREASURY STATEMENT - ' + mN.toUpperCase(), 'Rotaract Club of Coimbatore Unity', '='.repeat(50), ''];
        if (txns.length) { lines.push('TRANSACTIONS:'); lines.push('-'.repeat(50)); txns.forEach(function(t, i) { lines.push((i + 1) + '. [' + formatDateShort(t.date) + '] ' + t.particular + ' - ' + capitalizeFirst(t.transaction_type) + ': Rs. ' + formatCurrency(t.amount)); }); lines.push('-'.repeat(50)); } else { lines.push('No transactions this month.'); }
        lines.push('', 'SUMMARY:', 'Total Income    : Rs. ' + formatCurrency(income), 'Total Expenses  : Rs. ' + formatCurrency(expense), 'Net This Month  : Rs. ' + formatCurrency(income - expense), 'Overall Balance : Rs. ' + formatCurrency(overall), '', '='.repeat(50), '', 'Auto-generated statement.', '', 'Regards,', 'Treasurer', 'Rotaract Club of Coimbatore Unity', 'Family of Rotary Club of Coimbatore East', 'Rotary International District 3206 (Coimbatore | Pallakkad)');
        var body = lines.join('\n');
        var members = await getAllMemberEmails(false);
        var emails = members.map(function(m) { return m.email; }).filter(Boolean);
        if (!emails.length) return;
        var subject = 'Treasury Statement - ' + mN + ' - Rotaract Club of Coimbatore Unity';
        await supabase.from('notification_queue').insert({ notification_type: 'monthly_statement', recipient_type: 'all', recipient_emails: emails, subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), status: 'queued' });
        await supabase.from('mail_log').insert({ mail_type: 'monthly_statement', recipient: emails.length + ' member(s)', subject: subject, status: 'queued' });
        setLocal('last_monthly_stmt', key);
        console.log('Auto monthly statement queued for', mN, '->', emails.length, 'recipients');
    } catch (err) { console.error('Monthly statement error:', err); }
}

// ============================================================
// ATTENDANCE FORM
// ============================================================
function checkAttendanceParam() {
    var mid = getUrlParam('attendance');
    if (mid) setTimeout(function() { openAttendanceForm(mid); }, 1000);
}

async function openAttendanceForm(meetingId) {
    try {
        if (!supabase) return;
        var r = await supabase.from('meetings').select('*').eq('id', meetingId).single();
        if (r.error || !r.data) { showToast('error', 'Error', 'Meeting not found'); return; }
        var mt = r.data;
        var body = document.getElementById('attendanceModalBody');
        if (!body) return;
        body.innerHTML = [
            '<div style="text-align:center;margin-bottom:18px;"><h3 style="font-size:1.05rem;font-weight:700;">Attendance Sheet</h3><h4 style="font-size:0.92rem;font-weight:600;color:var(--primary);margin-top:7px;">' + escapeHtml(mt.title) + '</h4><p style="font-size:0.83rem;color:var(--text-secondary);margin-top:4px;">' + formatDate(mt.date) + ' | ' + formatTime(mt.start_time) + (mt.end_time ? ' - ' + formatTime(mt.end_time) : '') + '</p></div>',
            '<form onsubmit="submitAttendance(event,\'' + meetingId + '\')">',
            '<div class="form-group"><label><i data-lucide="user"></i>Full Name *</label><input type="text" id="attName" required placeholder="Your full name"></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="briefcase"></i>Designation</label><input type="text" id="attDesignation" placeholder="Your designation"></div><div class="form-group"><label><i data-lucide="hash"></i>RI ID</label><input type="text" id="attRiId" placeholder="Your RI ID"></div></div>',
            '<div class="form-group"><label><i data-lucide="clock"></i>In Time</label><input type="time" id="attInTime" value="' + new Date().toTimeString().substring(0, 5) + '"></div>',
            '<div class="form-group"><label><i data-lucide="pen-tool"></i>E-Signature (Photo) *</label><div class="photo-upload-area" style="min-height:70px;"><input type="file" id="attESign" accept="image/*" required><div class="photo-placeholder"><i data-lucide="upload-cloud"></i><span>Upload signature or photo</span></div></div></div>',
            '<button type="submit" class="btn btn-primary btn-block" id="submitAttBtn"><i data-lucide="check-circle"></i>Submit Attendance</button>',
            '</form>'
        ].join('');
        openModal('attendanceModal');
        refreshIcons();
    } catch (err) { showToast('error', 'Error', 'Could not load attendance form'); }
}

async function submitAttendance(e, meetingId) {
    e.preventDefault();
    var btn = document.getElementById('submitAttBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
    try {
        function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
        var name = gv('attName');
        if (!name) { showToast('error', 'Required', 'Name is required'); return; }
        var signInput = document.getElementById('attESign');
        var signFile = signInput && signInput.files && signInput.files[0] ? signInput.files[0] : null;
        var signUrl = null;
        if (signFile && supabase) signUrl = await uploadFile('esigns', generateFilePath('att', signFile.name), signFile);
        if (supabase) {
            var ins = await supabase.from('meeting_attendance').insert({ meeting_id: meetingId, member_name: name, designation: gv('attDesignation') || null, ri_id: gv('attRiId') || null, in_time: gv('attInTime') || null, e_sign_url: signUrl, is_present: true });
            if (ins.error) throw ins.error;
        }
        closeModal('attendanceModal');
        await showAlert('Submitted!', 'Thank you ' + name + ', your attendance has been recorded.', 'success');
    } catch (err) { showToast('error', 'Error', err.message); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="check-circle"></i>Submit Attendance'; refreshIcons(); } }
}

// ============================================================
// ADMIN SETTINGS (only used if admin.js hasn't defined them)
// ============================================================
if (typeof loadAdminSettings !== 'function') {
    window.loadAdminSettings = async function() {
        var c = document.getElementById('settingsFormContainer');
        if (c) c.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-tertiary);">Settings loading...</p>';
    };
}

if (typeof showSettingsGroup !== 'function') {
    window.showSettingsGroup = function() {};
}

if (typeof saveSetting !== 'function') {
    window.saveSetting = async function() {};
}

// ============================================================
// SAFE STUBS — Only define if admin.js hasn't already
// ============================================================
if (typeof hasFullAccess !== 'function') {
    window.hasFullAccess = function() {
        if (!AppState.currentAdmin) return false;
        return ['super_admin', 'advisor', 'president', 'immediate_past_president'].indexOf(AppState.currentAdmin.role) !== -1;
    };
}

if (typeof startAdminAutoRefresh !== 'function') {
    window.startAdminAutoRefresh = function() {};
}

if (typeof stopAdminAutoRefresh !== 'function') {
    window.stopAdminAutoRefresh = function() {};
}

// Stubs for admin functions — will be overridden by admin.js if present
var _adminFunctionStubs = [
    'loadAdminEvents', 'openEventForm', 'loadAdminMeetings', 'openMeetingForm',
    'loadAdminTreasury', 'openTreasuryForm', 'downloadTreasuryExcel',
    'loadAdminMembers', 'openMemberForm', 'searchMembers',
    'loadAdminApplications', 'viewApplicationDetail', 'approveApplication', 'rejectApplication', 'convertApplicationToMember',
    'loadAdminPresidents', 'openPresidentForm', 'loadAdminSecretaries', 'openSecretaryForm',
    'loadAdminTrainers', 'openTrainerForm', 'loadAdminNewsletters', 'openNewsletterForm',
    'loadAdminReports', 'openReportForm', 'downloadSingleReport', 'downloadCombinedReport',
    'loadAdminStatistics', 'openStatForm', 'saveStat', 'deleteStat',
    'loadAdminBenefits', 'openBenefitForm', 'saveBenefit', 'deleteBenefit',
    'loadAdminUsers', 'openAdminUserForm', 'saveAdminUser', 'deleteAdminUser', 'toggleAdminUserStatus', 'openChangePasswordForm',
    'loadMailLogs', 'openCustomMailForm', 'loadActivityLog', 'loadStorageOverview',
    'sendMeetingIntimation', 'triggerAttendanceMail', 'viewMeetingAttendance', 'downloadMeetingAttendance', 'copyAttendanceLink',
    'sendMonthlyStatement', 'runDatabaseHealthCheck', 'exportDatabaseBackup', 'resetAndReload', 'forceRefreshPublicData'
];

_adminFunctionStubs.forEach(function(name) {
    if (typeof window[name] !== 'function') {
        window[name] = function() {
            console.warn(name + ' not yet available. Ensure admin.js is loaded.');
            return Promise.resolve();
        };
    }
});

// ============================================================
// FORM HELPERS
// ============================================================
function getFormVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function getFormChecked(id) { var el = document.getElementById(id); return el ? el.checked : false; }

console.log('%c app.js loaded ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');