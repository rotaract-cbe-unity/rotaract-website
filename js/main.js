/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Main Website - js/main.js
   Version 4.0 - Uses Direct REST (proven working)
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // CONFIG - Direct REST API (no SDK needed)
    // ============================================================
    const API = 'https://dledwtepuvzzztfypbgn.supabase.co/rest/v1';
    const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDk2NDMsImV4cCI6MjA5ODcyNTY0M30.9ZcngwUsfl5AkFaCDR9-ljoLLOYeGwwK0AKaHfeyGhY';
    const HEADERS = {
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    // ============================================================
    // DIRECT REST QUERY
    // ============================================================
    async function dbQuery(table, params) {
        try {
            const url = params ? `${API}/${table}?${params}` : `${API}/${table}`;
            const res = await fetch(url, { headers: HEADERS });
            if (!res.ok) {
                console.warn(`[DB] ${table} returned ${res.status}`);
                return [];
            }
            return await res.json();
        } catch (e) {
            console.warn(`[DB] ${table} error:`, e.message);
            return [];
        }
    }

    async function dbInsert(table, data) {
        const res = await fetch(`${API}/${table}`, {
            method: 'POST',
            headers: { ...HEADERS, 'Prefer': 'return=representation' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    }

    // ============================================================
    // STATE
    // ============================================================
    const S = {
        settings: {},
        stats: [],
        events: [],
        completed: [],
        leaders: [],
        trainers: [],
        members: [],
        bulletins: [],
        avenueFilter: 'all',
        leaderFilter: 'presidents',
        eventsOffset: 0,
        eventsLimit: 9,
        allLoaded: false,
        theme: localStorage.getItem('unity_theme') || 'light'
    };

    // ============================================================
    // UTILS
    // ============================================================
    function esc(t) {
        if (t === null || t === undefined) return '';
        const d = document.createElement('div');
        d.textContent = String(t);
        return d.innerHTML;
    }

    function fDate(d) {
        if (!d) return '';
        try {
            const dt = new Date(d.includes('T') ? d : d + 'T00:00:00');
            if (isNaN(dt)) return d;
            return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) { return d; }
    }

    function fTime(t) {
        if (!t) return '';
        try {
            const [h, m] = t.split(':').map(Number);
            if (isNaN(h)) return t;
            return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
        } catch (e) { return t; }
    }

    function debounce(fn, ms) {
        let t;
        return function () {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, arguments), ms);
        };
    }

    function showToast(msg, type) {
        const c = document.getElementById('toast-container');
        if (!c) return;
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
        const el = document.createElement('div');
        el.className = 'toast ' + (type || 'info');
        el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${esc(msg)}</span>`;
        c.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; setTimeout(() => el.remove(), 400); }, 4000);
    }
    window.showToast = showToast;

    const AVENUES = {
        club_service: 'Club Service',
        community_service: 'Community Service',
        professional_service: 'Professional Service',
        international_service: 'International Service',
        district_priority_projects: 'District Priority Projects'
    };

    // ============================================================
    // INIT
    // ============================================================
    document.addEventListener('DOMContentLoaded', async function () {
        console.log('%c Unity Portal Loading... ', 'background:#1a56db;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

        initTheme();
        initNav();
        initBackToTop();

        const yearEl = document.getElementById('footer-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        // Load all data
        try {
            await loadSettings();
            await Promise.all([
                loadStats(),
                loadUpcoming(),
                loadCompleted(true),
                loadLeaders(),
                loadTrainers(),
                loadMembers(),
                loadBulletins()
            ]);
        } catch (e) {
            console.error('Data load error:', e);
        }

        // Init interactive features
        initHeroCounters();
        initAvenueFilters();
        initLeaderToggle();
        initMemberSearch();
        initBulletinSwiper();
        initEventModal();
        initJoinForm();
        initBloodForm();
        initAvenueLinks();
        initScrollSpy();
        initChatbot();

        // Hide loading screen
        hideLoading();

        console.log('%c Unity Portal Ready ', 'background:#10b981;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');
    });

    // ============================================================
    // LOADING SCREEN
    // ============================================================
    function hideLoading() {
        const el = document.getElementById('loading-screen');
        if (!el) return;
        el.classList.add('loaded');
        setTimeout(() => { if (el.parentNode) el.remove(); }, 700);
    }

    // Force hide after 5 seconds no matter what
    setTimeout(hideLoading, 5000);

    // ============================================================
    // THEME
    // ============================================================
    function initTheme() {
        applyTheme(S.theme);
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.addEventListener('click', () => {
            S.theme = S.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('unity_theme', S.theme);
            applyTheme(S.theme);
        });
    }

    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        const i = document.getElementById('theme-icon');
        if (i) i.className = t === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

        const colourLogo = S.settings.colour_logo_url || 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png';
        const whiteLogo = S.settings.white_logo_url || 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png';

        const navLogo = document.getElementById('nav-logo');
        if (navLogo) navLogo.src = t === 'dark' ? whiteLogo : colourLogo;
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    function initNav() {
        const navbar = document.getElementById('navbar');
        const hamburger = document.getElementById('nav-hamburger');
        const links = document.getElementById('nav-links');
        const overlay = document.getElementById('nav-overlay');

        window.addEventListener('scroll', () => {
            if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 80);
        }, { passive: true });

        function closeMenu() {
            hamburger && hamburger.classList.remove('active');
            links && links.classList.remove('active');
            overlay && overlay.classList.remove('active');
        }

        if (hamburger) hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            links && links.classList.toggle('active');
            overlay && overlay.classList.toggle('active');
        });

        if (overlay) overlay.addEventListener('click', closeMenu);

        document.querySelectorAll('.nav-link, .dropdown-menu a').forEach(a => {
            a.addEventListener('click', closeMenu);
        });

        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (!href || href === '#') return;
                const target = document.querySelector(href);
                if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
            });
        });
    }

    // ============================================================
    // SETTINGS
    // ============================================================
    async function loadSettings() {
        const data = await dbQuery('site_settings', 'select=key,value');
        data.forEach(s => { S.settings[s.key] = s.value; });

        // Apply
        const addr = document.getElementById('contact-address');
        if (addr && S.settings.address) addr.textContent = S.settings.address;

        const email = document.getElementById('contact-email');
        if (email && S.settings.club_email) { email.textContent = S.settings.club_email; email.href = 'mailto:' + S.settings.club_email; }

        const map = document.getElementById('map-iframe');
        if (map && S.settings.map_embed_url) map.src = S.settings.map_embed_url;

        ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube'].forEach(p => {
            const url = S.settings[p + '_url'];
            if (!url) return;
            ['social-' + p, 'footer-' + p].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.href = url;
            });
        });

        if (S.settings.chatbot_enabled === 'false') {
            const cb = document.getElementById('chatbot-container');
            if (cb) cb.style.display = 'none';
        }

        applyTheme(S.theme);
    }

    // ============================================================
    // STATISTICS
    // ============================================================
    async function loadStats() {
        const data = await dbQuery('club_statistics', 'select=*&is_visible=eq.true&order=display_order.asc');
        S.stats = data;
        const grid = document.getElementById('stats-grid');
        if (!grid || !data.length) return;

        const icons = { calendar: 'fa-calendar-alt', users: 'fa-users', 'check-circle': 'fa-check-circle', heart: 'fa-heart', award: 'fa-award', globe: 'fa-globe', star: 'fa-star', handshake: 'fa-handshake' };

        grid.innerHTML = data.map((s, i) => `
            <div class="stat-card" data-aos="fade-up" data-aos-delay="${i * 80}">
                <div class="stat-icon"><i class="fas ${icons[s.stat_icon] || 'fa-chart-bar'}"></i></div>
                <div class="stat-value">${esc(s.stat_value)}</div>
                <div class="stat-label">${esc(s.stat_label)}</div>
            </div>
        `).join('');

        if (window.AOS) AOS.refresh();
    }

    // ============================================================
    // HERO COUNTERS
    // ============================================================
    function initHeroCounters() {
        document.querySelectorAll('.hero-stat-num[data-target]').forEach(el => {
            const obs = new IntersectionObserver(entries => {
                if (!entries[0].isIntersecting) return;
                obs.unobserve(el);
                const target = parseInt(el.dataset.target);
                if (isNaN(target)) return;
                const start = performance.now();
                const dur = 2000;
                (function step(now) {
                    const p = Math.min((now - start) / dur, 1);
                    el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
                    if (p < 1) requestAnimationFrame(step);
                    else el.textContent = target.toLocaleString();
                })(start);
            }, { threshold: 0.5 });
            obs.observe(el);
        });
    }

    // ============================================================
    // UPCOMING EVENTS
    // ============================================================
    async function loadUpcoming() {
        const today = new Date().toISOString().split('T')[0];
        const next7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        const data = await dbQuery('projects', `select=*&status=eq.approved&event_date=gte.${today}&event_date=lte.${next7}&order=event_date.asc`);
        S.events = data;

        const grid = document.getElementById('upcoming-events-grid');
        if (!grid) return;

        if (!data.length) {
            grid.innerHTML = '<div class="no-events-placeholder"><i class="fas fa-calendar-times"></i><h3>No Upcoming Events</h3><p>Check back soon for upcoming events!</p></div>';
            return;
        }

        grid.innerHTML = data.map((ev, i) => eventCard(ev, true, i)).join('');
        bindEventButtons(grid);
        updateTicker();
        if (window.AOS) AOS.refresh();
    }

    // ============================================================
    // COMPLETED EVENTS
    // ============================================================
    async function loadCompleted(reset) {
        const grid = document.getElementById('completed-events-grid');
        if (!grid) return;

        if (reset) { S.eventsOffset = 0; S.allLoaded = false; }

        let params = `select=*&status=eq.completed&order=event_date.desc&limit=${S.eventsLimit}&offset=${S.eventsOffset}`;
        if (S.avenueFilter !== 'all') params += `&avenue=eq.${S.avenueFilter}`;

        const data = await dbQuery('projects', params);
        if (reset) S.completed = data; else S.completed = S.completed.concat(data);
        if (data.length < S.eventsLimit) S.allLoaded = true;

        const btn = document.getElementById('load-more-events');
        if (btn) btn.style.display = S.allLoaded ? 'none' : '';

        if (!S.completed.length) {
            grid.innerHTML = '<div class="no-events-placeholder"><i class="fas fa-folder-open"></i><h3>No Completed Projects</h3><p>Projects will appear here after completion.</p></div>';
            return;
        }

        if (reset) {
            grid.innerHTML = S.completed.map((ev, i) => eventCard(ev, false, i)).join('');
        } else {
            grid.insertAdjacentHTML('beforeend', data.map((ev, i) => eventCard(ev, false, S.eventsOffset + i)).join(''));
        }

        bindEventButtons(grid);
        S.eventsOffset += data.length;
        if (window.AOS) AOS.refresh();
    }

    // ============================================================
    // EVENT CARD HTML
    // ============================================================
    function eventCard(ev, isUpcoming, idx) {
        const av = AVENUES[ev.avenue] || ev.avenue;
        const isDPP = ev.avenue === 'district_priority_projects';

        const poster = ev.poster_url
            ? `<img src="${esc(ev.poster_url)}" alt="${esc(ev.title)}" class="event-poster" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;flex-direction:column;gap:6px;background:var(--bg-alt);">
                   <i class="fas fa-calendar-alt" style="font-size:2rem;color:var(--primary-light);"></i>
                   <span style="font-size:0.72rem;color:var(--text-muted);">${esc(av)}</span>
               </div>`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;background:linear-gradient(135deg,rgba(26,86,219,0.06),rgba(96,165,250,0.03));">
                   <i class="fas fa-calendar-alt" style="font-size:2rem;color:var(--primary-light);"></i>
                   <span style="font-size:0.72rem;color:var(--text-muted);">${esc(av)}</span>
               </div>`;

        return `
        <div class="event-card" data-aos="fade-up" data-aos-delay="${(idx % 6) * 80}">
            <div class="event-poster-wrap">
                ${poster}
                <span class="event-avenue-badge ${ev.avenue}">${esc(av)}</span>
                <span class="event-status-badge ${isUpcoming ? 'upcoming' : 'completed'}">
                    <i class="fas fa-${isUpcoming ? 'clock' : 'check-circle'}"></i>
                    ${isUpcoming ? 'Upcoming' : 'Completed'}
                </span>
                ${isDPP && ev.dpp_project_number ? `<span style="position:absolute;bottom:10px;left:10px;padding:3px 10px;background:rgba(239,68,68,0.85);color:#fff;border-radius:20px;font-size:0.68rem;font-weight:700;">DPP #${esc(ev.dpp_project_number)}</span>` : ''}
            </div>
            <div class="event-card-body">
                <h3 class="event-card-title">${esc(ev.title)}</h3>
                <div class="event-meta-row">
                    <span class="event-meta-item"><i class="fas fa-calendar"></i>${fDate(ev.event_date)}</span>
                    ${ev.event_time ? `<span class="event-meta-item"><i class="fas fa-clock"></i>${fTime(ev.event_time)}</span>` : ''}
                    ${ev.venue ? `<span class="event-meta-item"><i class="fas fa-map-marker-alt"></i>${esc(ev.venue)}</span>` : ''}
                    ${ev.event_chair ? `<span class="event-meta-item"><i class="fas fa-user-tie"></i>${esc(ev.event_chair)}</span>` : ''}
                </div>
                ${ev.description ? `<p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.6;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(ev.description)}</p>` : ''}
                <div class="event-card-footer">
                    <button class="event-detail-btn" data-id="${ev.id}"><i class="fas fa-info-circle"></i>More Details</button>
                    ${isUpcoming ? `<button class="event-calendar-btn" data-id="${ev.id}"><i class="fas fa-calendar-plus"></i>Calendar</button>` : ''}
                </div>
            </div>
        </div>`;
    }

    function bindEventButtons(container) {
        if (!container) return;
        container.querySelectorAll('.event-detail-btn').forEach(b => b.onclick = () => openEventModal(b.dataset.id));
        container.querySelectorAll('.event-calendar-btn').forEach(b => b.onclick = () => addToCalendar(b.dataset.id));
    }

    // ============================================================
    // TICKER
    // ============================================================
    function updateTicker() {
        const track = document.getElementById('ticker-track');
        if (!track) return;

        const items = [];
        S.events.forEach(ev => {
            items.push(`<span><i class="fas fa-calendar-alt" style="color:var(--accent);margin-right:6px;"></i><strong>${esc(ev.title)}</strong> &mdash; ${fDate(ev.event_date)}</span>`);
        });
        items.push(
            `<span><i class="fas fa-award" style="color:var(--accent);margin-right:6px;"></i>Rotaract Club of Coimbatore Unity</span>`,
            `<span><i class="fas fa-id-card" style="color:var(--accent);margin-right:6px;"></i>Club ID: 91594 | Charter: 21.04.2014</span>`,
            `<span><i class="fas fa-globe" style="color:var(--accent);margin-right:6px;"></i>RI District 3206 (Coimbatore | Pallakkad)</span>`,
            `<span><i class="fas fa-handshake" style="color:var(--accent);margin-right:6px;"></i>Service Above Self</span>`
        );

        const sep = ' &nbsp;<i class="fas fa-circle" style="font-size:0.25rem;color:rgba(0,0,0,0.15);vertical-align:middle;"></i>&nbsp; ';
        track.innerHTML = [...items, ...items].join(sep);
    }

    // ============================================================
    // AVENUE FILTERS
    // ============================================================
    function initAvenueFilters() {
        document.querySelectorAll('.avenue-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.avenue-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                S.avenueFilter = tab.dataset.avenue;
                loadCompleted(true);
            });
        });

        const btn = document.getElementById('load-more-events');
        if (btn) btn.addEventListener('click', () => { if (!S.allLoaded) loadCompleted(false); });
    }

    function initAvenueLinks() {
        document.querySelectorAll('[data-avenue]').forEach(link => {
            if (link.classList.contains('avenue-tab')) return;
            link.addEventListener('click', e => {
                const av = link.dataset.avenue;
                if (!av) return;
                e.preventDefault();
                const sec = document.getElementById('events');
                if (sec) sec.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    const tab = document.querySelector(`.avenue-tab[data-avenue="${av}"]`);
                    if (tab) tab.click();
                }, 500);
            });
        });
    }

    // ============================================================
    // EVENT MODAL
    // ============================================================
    function initEventModal() {
        const overlay = document.getElementById('event-modal-overlay');
        const close = document.getElementById('event-modal-close');
        if (close) close.onclick = closeModal;
        if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    }

    function closeModal() {
        const o = document.getElementById('event-modal-overlay');
        if (o) o.classList.remove('active');
        document.body.style.overflow = '';
    }
    window.closeEventModal = closeModal;

    async function openEventModal(id) {
        const overlay = document.getElementById('event-modal-overlay');
        const content = document.getElementById('event-modal-content');
        if (!overlay || !content) return;

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        content.innerHTML = '<div style="padding:60px;text-align:center;"><div class="line-loader" style="width:120px;margin:0 auto 16px;"><div class="line-loader-bar"></div></div><p style="color:var(--text-muted);font-size:0.85rem;">Loading...</p></div>';

        try {
            const [evArr, photosArr, reportsArr] = await Promise.all([
                dbQuery('projects', `select=*&id=eq.${id}`),
                dbQuery('event_photos', `select=*&project_id=eq.${id}&photo_type=eq.action`),
                dbQuery('project_reports', `select=*&project_id=eq.${id}`)
            ]);

            const ev = evArr[0];
            if (!ev) throw new Error('Not found');

            const report = reportsArr[0];
            const photos = photosArr || [];
            const av = AVENUES[ev.avenue] || ev.avenue;
            const isDPP = ev.avenue === 'district_priority_projects';

            const detailHtml = (label, val, icon) => val ? `<div class="event-detail-item"><i class="fas ${icon}"></i><div><span class="detail-label">${label}</span><span class="detail-value">${esc(val)}</span></div></div>` : '';

            content.innerHTML = `
                ${ev.poster_url ? `<img src="${esc(ev.poster_url)}" class="event-modal-poster" onerror="this.style.display='none';">` : ''}
                <div class="event-modal-body">
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
                        <span class="event-avenue-badge ${ev.avenue}" style="position:static;">${esc(av)}</span>
                        <span class="event-status-badge ${ev.status}" style="position:static;">${ev.status}</span>
                        ${isDPP && ev.dpp_project_number ? '<span class="badge badge-danger">DPP #' + esc(ev.dpp_project_number) + '</span>' : ''}
                    </div>
                    <h2 class="event-modal-title">${esc(ev.title)}</h2>
                    <div class="event-modal-details">
                        ${detailHtml('Date', fDate(ev.event_date), 'fa-calendar-alt')}
                        ${detailHtml('Time', ev.event_time ? fTime(ev.event_time) + (ev.end_time ? ' - ' + fTime(ev.end_time) : '') : null, 'fa-clock')}
                        ${detailHtml('Venue', ev.venue, 'fa-map-marker-alt')}
                        ${detailHtml('Event Chair', ev.event_chair, 'fa-user-tie')}
                        ${detailHtml('Event Secretary', ev.event_secretary, 'fa-pen-nib')}
                        ${detailHtml('Group', ev.group_number ? 'Group ' + ev.group_number : null, 'fa-layer-group')}
                        ${ev.collaboration_type && ev.collaboration_type !== 'none' ? detailHtml('Collaboration', ev.collaboration_type + (ev.collaborator_name ? ' - ' + ev.collaborator_name : ''), 'fa-handshake') : ''}
                        ${isDPP ? detailHtml('DPP Pillar', ev.dpp_pillar, 'fa-columns') : ''}
                        ${isDPP ? detailHtml('DPP Category', ev.dpp_category, 'fa-tag') : ''}
                        ${report && report.attendance_count ? detailHtml('Attendance', report.attendance_count + ' members', 'fa-users') : ''}
                    </div>
                    ${ev.description ? '<p class="event-modal-description">' + esc(ev.description) + '</p>' : ''}
                    ${report && report.report_text ? '<div style="margin-bottom:20px;"><h4 style="font-size:0.9rem;font-weight:700;margin-bottom:8px;color:var(--text);"><i class="fas fa-file-alt" style="color:var(--primary-light);margin-right:6px;"></i>Event Report</h4><div style="background:var(--bg-alt);padding:14px;border-radius:var(--radius-sm);font-size:0.84rem;color:var(--text-secondary);line-height:1.7;">' + esc(report.report_text) + '</div></div>' : ''}
                    ${photos.length ? '<div style="margin-bottom:20px;"><h4 style="font-size:0.9rem;font-weight:700;margin-bottom:10px;color:var(--text);"><i class="fas fa-images" style="color:var(--primary-light);margin-right:6px;"></i>Photos (' + photos.length + ')</h4><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">' + photos.map(p => '<img src="' + esc(p.photo_url) + '" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer;" onclick="window.open(\'' + esc(p.photo_url) + '\',\'_blank\')" onerror="this.style.display=\'none\'">').join('') + '</div></div>' : ''}
                    <div class="event-modal-actions">
                        ${ev.status === 'approved' ? '<button class="btn btn-primary" onclick="addToCalendar(\'' + ev.id + '\')"><i class="fas fa-calendar-plus"></i>Add to Calendar</button>' : ''}
                        <button class="btn btn-outline" onclick="closeEventModal()"><i class="fas fa-times"></i>Close</button>
                    </div>
                </div>`;
        } catch (e) {
            content.innerHTML = '<div style="padding:60px;text-align:center;"><i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--warning);display:block;margin-bottom:12px;"></i><h3>Could not load event</h3><button class="btn btn-outline" onclick="closeEventModal()" style="margin-top:16px;">Close</button></div>';
        }
    }

    async function addToCalendar(id) {
        const data = await dbQuery('projects', `select=*&id=eq.${id}`);
        const ev = data[0];
        if (!ev) return;
        const d = ev.event_date.replace(/-/g, '');
        const t = ev.event_time ? ev.event_time.replace(/:/g, '').slice(0, 4) + '00' : '090000';
        const e = ev.end_time ? ev.end_time.replace(/:/g, '').slice(0, 4) + '00' : String(parseInt(t.slice(0, 2)) + 1).padStart(2, '0') + t.slice(2);
        window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${d}T${t}/${d}T${e}&details=${encodeURIComponent(ev.description || '')}&location=${encodeURIComponent(ev.venue || 'Coimbatore')}`, '_blank');
        showToast('Opening Google Calendar...', 'info');
    }
    window.addToCalendar = addToCalendar;

    // ============================================================
    // PAST LEADERS
    // ============================================================
    async function loadLeaders() {
        S.leaders = await dbQuery('past_leaders', 'select=*&order=display_order.asc');
        renderLeaders();
    }

    function renderLeaders() {
        const c = document.getElementById('leaders-timeline');
        if (!c) return;
        const role = S.leaderFilter === 'presidents' ? 'president' : 'secretary';
        const list = S.leaders.filter(l => l.role === role);
        if (!list.length) { c.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-users" style="font-size:2.5rem;display:block;margin-bottom:10px;color:var(--border);"></i><p>No data yet</p></div>'; return; }

        c.innerHTML = list.map((l, i) => `
            <div class="timeline-item" data-aos="fade-up" data-aos-delay="${(i % 4) * 80}">
                <div class="timeline-dot"></div>
                <div class="timeline-card">
                    ${l.photo_url ? `<img src="${esc(l.photo_url)}" class="timeline-photo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="timeline-photo" style="display:none;background:rgba(26,86,219,0.1);align-items:center;justify-content:center;"><i class="fas fa-user" style="color:var(--primary);font-size:1.5rem;"></i></div>` : `<div class="timeline-photo" style="display:flex;background:rgba(26,86,219,0.1);align-items:center;justify-content:center;"><i class="fas fa-user" style="color:var(--primary);font-size:1.5rem;"></i></div>`}
                    <div class="timeline-info">
                        <h4>${esc(l.name)}</h4>
                        <div class="timeline-year"><i class="fas fa-calendar-alt"></i>${esc(l.year)}</div>
                        <div class="timeline-role">${role === 'president' ? '<i class="fas fa-crown"></i> President' : '<i class="fas fa-pen-nib"></i> Secretary'}</div>
                    </div>
                </div>
            </div>`).join('');

        if (window.AOS) AOS.refresh();
    }

    function initLeaderToggle() {
        document.querySelectorAll('.toggle-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('.toggle-btn').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
                b.classList.add('active');
                b.setAttribute('aria-selected', 'true');
                S.leaderFilter = b.dataset.leaders;
                renderLeaders();
            });
        });
    }

    // ============================================================
    // TRAINERS
    // ============================================================
    async function loadTrainers() {
        S.trainers = await dbQuery('trainers', 'select=*&is_active=eq.true&order=display_order.asc');
        const g = document.getElementById('trainers-grid');
        if (!g) return;
        if (!S.trainers.length) { g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted);"><i class="fas fa-chalkboard-teacher" style="font-size:3rem;display:block;margin-bottom:14px;color:var(--border);"></i><p>Trainer info coming soon</p></div>'; return; }

        g.innerHTML = S.trainers.map((t, i) => `
            <div class="trainer-card" data-aos="fade-up" data-aos-delay="${(i % 3) * 100}">
                ${t.photo_url ? `<img src="${esc(t.photo_url)}" class="trainer-photo" onerror="this.outerHTML='<div class=\\'trainer-photo\\' style=\\'display:flex;align-items:center;justify-content:center;background:rgba(26,86,219,0.1)\\'><i class=\\'fas fa-user\\' style=\\'font-size:2rem;color:var(--primary)\\'></i></div>';">` : `<div class="trainer-photo" style="display:flex;align-items:center;justify-content:center;background:rgba(26,86,219,0.1);"><i class="fas fa-user" style="font-size:2rem;color:var(--primary);"></i></div>`}
                <h3 class="trainer-name">${esc(t.name)}</h3>
                ${t.area_of_expertise ? `<p class="trainer-expertise">${esc(t.area_of_expertise)}</p>` : ''}
                <div class="trainer-details">
                    ${t.ri_id ? `<div class="trainer-detail"><i class="fas fa-id-badge"></i><span>RI ID: ${esc(t.ri_id)}</span></div>` : ''}
                    ${t.email ? `<div class="trainer-detail"><i class="fas fa-envelope"></i><a href="mailto:${esc(t.email)}" style="color:var(--text-muted);font-size:0.75rem;">${esc(t.email)}</a></div>` : ''}
                    ${t.certified_year ? `<div class="trainer-detail"><i class="fas fa-certificate"></i><span>Certified: ${esc(t.certified_year)}</span></div>` : ''}
                </div>
            </div>`).join('');
        if (window.AOS) AOS.refresh();
    }

    // ============================================================
    // MEMBERS
    // ============================================================
    async function loadMembers() {
        S.members = await dbQuery('members', 'select=*&is_active=eq.true&order=name.asc');
        renderMembers(S.members);
    }

    function renderMembers(list) {
        const g = document.getElementById('members-grid');
        if (!g) return;
        if (!list.length) { g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted);"><i class="fas fa-users" style="font-size:3rem;display:block;margin-bottom:14px;color:var(--border);"></i><p>Members coming soon</p></div>'; return; }

        g.innerHTML = list.map(m => `
            <div class="member-card">
                <div class="member-photo-wrap">
                    ${m.photo_url ? `<img src="${esc(m.photo_url)}" alt="${esc(m.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="member-photo-placeholder" style="display:none;"><i class="fas fa-user"></i></div>` : `<div class="member-photo-placeholder"><i class="fas fa-user"></i></div>`}
                </div>
                <div class="member-info">
                    <h4>${esc(m.name)}</h4>
                    ${m.portfolio ? `<div class="member-portfolio">${esc(m.portfolio)}</div>` : ''}
                    <div class="member-meta">
                        ${m.blood_group ? `<span class="member-blood-badge"><i class="fas fa-tint"></i>${esc(m.blood_group)}</span>` : ''}
                        ${m.ri_id ? `<span class="member-meta-item"><i class="fas fa-id-badge"></i>${esc(m.ri_id)}</span>` : ''}
                        ${m.area ? `<span class="member-meta-item"><i class="fas fa-map-marker-alt"></i>${esc(m.area)}</span>` : ''}
                    </div>
                </div>
            </div>`).join('');
    }

    function initMemberSearch() {
        const input = document.getElementById('member-search');
        const blood = document.getElementById('member-blood-filter');
        function filter() {
            const q = (input?.value || '').toLowerCase();
            const b = blood?.value || '';
            renderMembers(S.members.filter(m => {
                const mq = !q || [m.name, m.portfolio, m.area, m.ri_id, m.email].some(f => (f || '').toLowerCase().includes(q));
                const mb = !b || m.blood_group === b;
                return mq && mb;
            }));
        }
        input?.addEventListener('input', debounce(filter, 300));
        blood?.addEventListener('change', filter);
    }

    // ============================================================
    // BULLETINS
    // ============================================================
    async function loadBulletins() {
        S.bulletins = await dbQuery('bulletins', 'select=*&is_published=eq.true&order=published_date.desc&limit=10');
        const w = document.getElementById('bulletins-swiper-wrapper');
        if (!w) return;
        if (!S.bulletins.length) {
            w.innerHTML = '<div class="swiper-slide"><div class="bulletin-slide"><div class="bulletin-cover" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(26,86,219,0.08),rgba(96,165,250,0.04));"><i class="fas fa-newspaper" style="font-size:3rem;color:var(--primary-light);"></i></div><div class="bulletin-info"><h3 class="bulletin-name">Unity Speaks</h3><p class="bulletin-desc">Monthly bulletin coming soon!</p></div></div></div>';
            return;
        }
        w.innerHTML = S.bulletins.map(b => `
            <div class="swiper-slide"><div class="bulletin-slide">
                ${b.cover_image_url ? `<img src="${esc(b.cover_image_url)}" class="bulletin-cover" onerror="this.style.display='none';">` : `<div class="bulletin-cover" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(26,86,219,0.08),rgba(96,165,250,0.04));"><i class="fas fa-newspaper" style="font-size:3rem;color:var(--primary-light);"></i></div>`}
                <div class="bulletin-info">
                    <h3 class="bulletin-name">${esc(b.bulletin_name)}</h3>
                    ${b.edition ? `<div class="bulletin-edition"><i class="fas fa-book-open"></i>${esc(b.edition)}</div>` : ''}
                    ${b.description ? `<p class="bulletin-desc">${esc(b.description)}</p>` : ''}
                    ${b.published_date ? `<p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:14px;"><i class="fas fa-calendar"></i> ${fDate(b.published_date)}</p>` : ''}
                    ${b.drive_link ? `<a href="${esc(b.drive_link)}" target="_blank" rel="noopener" class="bulletin-link"><i class="fas fa-external-link-alt"></i>View Bulletin</a>` : ''}
                </div>
            </div></div>`).join('');
    }

    function initBulletinSwiper() {
        if (!window.Swiper) return;
        try {
            new Swiper('.bulletins-swiper', {
                slidesPerView: 1, spaceBetween: 20, loop: S.bulletins.length > 1,
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { prevEl: '.bulletin-prev', nextEl: '.bulletin-next' },
                autoplay: { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true },
                grabCursor: true
            });
        } catch (e) { console.warn('Swiper init failed:', e); }
    }

    // ============================================================
    // JOIN FORM
    // ============================================================
    function initJoinForm() {
        const form = document.getElementById('join-form');
        const photoInput = document.getElementById('join-photo-input');
        const preview = document.getElementById('join-photo-preview');

        if (photoInput) photoInput.addEventListener('change', e => {
            const f = e.target.files[0];
            if (!f) return;
            if (f.size > 5 * 1024 * 1024) { showToast('Photo must be under 5MB', 'warning'); photoInput.value = ''; return; }
            const r = new FileReader();
            r.onload = ev => { if (preview) preview.innerHTML = `<img src="${ev.target.result}" style="max-width:100px;max-height:100px;border-radius:var(--radius);object-fit:cover;border:3px solid var(--primary-lighter);margin:8px auto;display:block;">`; };
            r.readAsDataURL(f);
        });

        if (!form) return;
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const btn = document.getElementById('join-submit-btn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }
            try {
                const fd = new FormData(form);
                await dbInsert('membership_applications', {
                    name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
                    date_of_birth: fd.get('date_of_birth') || null, blood_group: fd.get('blood_group') || null, status: 'pending'
                });
                form.reset();
                if (preview) preview.innerHTML = '';
                showToast('Application submitted! We will contact you within 5-7 days.', 'success');
            } catch (err) { showToast('Failed to submit. Please try again.', 'error'); }
            finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application'; } }
        });
    }

    // ============================================================
    // BLOOD FORM
    // ============================================================
    function initBloodForm() {
        const form = document.getElementById('blood-request-form');
        if (!form) return;
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const btn = document.getElementById('blood-submit-btn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }
            const fd = new FormData(form);
            const payload = {
                requester_name: fd.get('requester_name')?.trim(),
                requester_phone: fd.get('requester_phone')?.trim(),
                patient_name: fd.get('patient_name')?.trim() || null,
                blood_group: fd.get('blood_group'),
                units_required: parseInt(fd.get('units_required')) || 1,
                hospital_name: fd.get('hospital_name')?.trim() || null,
                hospital_address: fd.get('hospital_address')?.trim() || null,
                required_by: fd.get('required_by') || null,
                urgency: fd.get('urgency') || 'normal',
                status: 'active'
            };
            if (!payload.requester_name || !payload.requester_phone || !payload.blood_group) {
                showToast('Please fill required fields', 'warning');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Blood Request'; }
                return;
            }
            try {
                await dbInsert('blood_requests', payload);
                const wa1 = S.settings.whatsapp_emergency_1 || '9789903206';
                const wa2 = S.settings.whatsapp_emergency_2 || '9789953206';
                const msg = encodeURIComponent(`BLOOD REQUEST\nBlood Group: ${payload.blood_group}\nUnits: ${payload.units_required}\nHospital: ${payload.hospital_name || 'N/A'}\nContact: ${payload.requester_name} - ${payload.requester_phone}\nUrgency: ${payload.urgency.toUpperCase()}`);
                window.open(`https://wa.me/91${wa1}?text=${msg}`, '_blank');
                setTimeout(() => window.open(`https://wa.me/91${wa2}?text=${msg}`, '_blank'), 1000);
                form.reset();
                showToast('Blood request submitted! Alert sent to coordinators.', 'success');
            } catch (err) { showToast('Failed to submit', 'error'); }
            finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Blood Request'; } }
        });
    }

    // ============================================================
    // BACK TO TOP
    // ============================================================
    function initBackToTop() {
        const btn = document.getElementById('back-to-top');
        if (!btn) return;
        window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // ============================================================
    // SCROLL SPY
    // ============================================================
    function initScrollSpy() {
        const sections = document.querySelectorAll('section[id]');
        const links = document.querySelectorAll('.nav-link[href^="#"]');
        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
                }
            });
        }, { threshold: 0.2, rootMargin: '-80px 0px 0px 0px' });
        sections.forEach(s => obs.observe(s));
    }

    // ============================================================
    // HERO PARTICLES
    // ============================================================
    (function () {
        const c = document.getElementById('hero-particles');
        if (!c) return;
        const n = window.innerWidth < 768 ? 18 : 40;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < n; i++) {
            const p = document.createElement('div');
            p.style.cssText = `position:absolute;width:${Math.random()*3+1}px;height:${Math.random()*3+1}px;background:rgba(255,255,255,${Math.random()*0.2+0.05});border-radius:50%;left:${Math.random()*100}%;top:${Math.random()*100}%;animation:pFloat ${Math.random()*12+8}s ease-in-out ${Math.random()*5}s infinite;pointer-events:none;`;
            frag.appendChild(p);
        }
        c.appendChild(frag);
        if (!document.getElementById('pf-style')) {
            const s = document.createElement('style');
            s.id = 'pf-style';
            s.textContent = '@keyframes pFloat{0%,100%{transform:translate(0,0);opacity:.3}33%{transform:translate(12px,-20px);opacity:.5}66%{transform:translate(-8px,12px);opacity:.15}}';
            document.head.appendChild(s);
        }
    })();

    // ============================================================
    // AOS INIT
    // ============================================================
    if (window.AOS) {
        AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
    }

    // ============================================================
    // CHATBOT
    // ============================================================
    function initChatbot() {
        const toggle = document.getElementById('chatbot-toggle');
        const widget = document.getElementById('chatbot-widget');
        const minimize = document.getElementById('chatbot-minimize');
        const send = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');
        const messages = document.getElementById('chatbot-messages');
        const badge = document.getElementById('chatbot-badge');
        const icon = document.getElementById('chatbot-toggle-icon');

        if (!toggle || !widget) return;

        let history = [{ role: 'system', content: 'You are the Unity Assistant for Rotaract Club of Coimbatore Unity (Club ID: 91594, Charter: 21 April 2014, Family of Rotary Club of Coimbatore East, RI District 3206 - Coimbatore | Pallakkad). Expert on Rotary, Rotaract, RI District 3206, RSAM, End Polio Now, Four-Way Test, Rotary Foundation, and general knowledge. Be friendly, concise, professional.' }];

        toggle.addEventListener('click', () => {
            const open = widget.classList.toggle('active');
            if (open) { badge && (badge.style.display = 'none'); icon && (icon.className = 'fas fa-times'); input?.focus(); }
            else { icon && (icon.className = 'fas fa-robot'); }
        });

        minimize?.addEventListener('click', () => { widget.classList.remove('active'); icon && (icon.className = 'fas fa-robot'); });

        document.querySelectorAll('.quick-btn').forEach(b => {
            b.addEventListener('click', () => { if (input) input.value = b.dataset.query || ''; doSend(); });
        });

        send?.addEventListener('click', doSend);
        input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
        input?.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 80) + 'px'; });

        async function doSend() {
            const text = input?.value.trim();
            if (!text) return;
            input.value = '';
            input.style.height = 'auto';
            addMsg(text, 'user');
            history.push({ role: 'user', content: text });
            const tid = showTyping();
            try {
                const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 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' },
                    body: JSON.stringify({ model: S.settings.chatbot_model || 'openai/gpt-4o', messages: history, max_tokens: 800, temperature: 0.7 })
                });
                rmTyping(tid);
                if (!r.ok) throw new Error();
                const data = await r.json();
                const reply = data.choices?.[0]?.message?.content || 'Please try again.';
                history.push({ role: 'assistant', content: reply });
                if (history.length > 21) history = [history[0], ...history.slice(-20)];
                addMsg(reply, 'bot');
            } catch (e) { rmTyping(tid); addMsg('Connection issue. Please try again.', 'bot'); }
        }

        function addMsg(text, who) {
            if (!messages) return;
            const d = document.createElement('div');
            d.className = 'chat-message ' + (who === 'user' ? 'user-message' : 'bot-message');
            d.innerHTML = `<div class="chat-avatar"><i class="fas ${who === 'user' ? 'fa-user' : 'fa-robot'}"></i></div><div class="chat-bubble"><p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p></div>`;
            messages.appendChild(d);
            messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
        }

        function showTyping() {
            if (!messages) return null;
            const id = 'typ' + Date.now();
            const d = document.createElement('div');
            d.className = 'chat-message bot-message';
            d.id = id;
            d.innerHTML = '<div class="chat-avatar"><i class="fas fa-robot"></i></div><div class="chat-bubble"><div style="display:flex;gap:4px;padding:4px 0;"><div style="width:7px;height:7px;border-radius:50%;background:var(--primary-light);animation:td 1s ease infinite;"></div><div style="width:7px;height:7px;border-radius:50%;background:var(--primary-light);animation:td 1s ease .2s infinite;"></div><div style="width:7px;height:7px;border-radius:50%;background:var(--primary-light);animation:td 1s ease .4s infinite;"></div></div></div>';
            messages.appendChild(d);
            messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
            if (!document.getElementById('td-s')) { const s = document.createElement('style'); s.id = 'td-s'; s.textContent = '@keyframes td{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}'; document.head.appendChild(s); }
            return id;
        }

        function rmTyping(id) { if (id) document.getElementById(id)?.remove(); }
    }

})();