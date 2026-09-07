/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - MAIN APPLICATION
   Core Logic | Supabase | UI | Self-Healing Modules
   Cloudinary + Supabase Storage Fallback | Anti-413 Payload | Bug-Free
   ============================================================ */

// ============================================================
// SUPABASE CONFIGURATION - Single Instance Only
// ============================================================
var SUPABASE_URL = 'https://dledwtepuvzzztfypbgn.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDk2NDMsImV4cCI6MjA5ODcyNTY0M30.9ZcngwUsfl5AkFaCDR9-ljoLLOYeGwwK0AKaHfeyGhY';
var SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzE0OTY0MywiZXhwIjoyMDk4NzI1NjQzfQ.FxvK5rV-Qyxod4mPJ8iW69P48wbwaC_guR_h0o75z1U';
var CLOUDINARY_CLOUD_NAME = 'duoy1cje9';
var CLOUDINARY_UPLOAD_PRESET = 'unity_upload';

// Distinct storageKey declarations silence "Multiple GoTrueClient instances" warning
var supabaseClient = window.supabaseClient || supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { 
        autoRefreshToken: false, 
        persistSession: false, 
        detectSessionInUrl: false,
        storageKey: 'sb-unity-anon-storage'
    }
});
window.supabaseClient = supabaseClient;

var supabaseAdmin = window.supabaseAdmin || supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { 
        autoRefreshToken: false, 
        persistSession: false, 
        detectSessionInUrl: false,
        storageKey: 'sb-unity-admin-storage'
    }
});
window.supabaseAdmin = supabaseAdmin;

// ============================================================
// SELF-HEALING FAILSAFE MODULES
// ============================================================
(function() {
    // Guarantee Mail config structure
    if (!window.Mail) window.Mail = {};
    if (!window.Mail.config) window.Mail.config = {};
    if (!window.Mail.config.templates) {
        window.Mail.config.templates = {
            general: 'template_s46eqig',
            birthday: 'template_birthday',
            blood: 'template_s46eqig'
        };
    }

    // Guarantee Blood module
    if (typeof window.Blood === 'undefined') {
        window.Blood = {
            initialized: false,
            emergencyPhones: ['9789903206', '9789953206'],
            compatibility: {
                'A+': { canReceiveFrom: ['A+', 'A-', 'O+', 'O-'], canDonateTo: ['A+', 'AB+'] },
                'A-': { canReceiveFrom: ['A-', 'O-'], canDonateTo: ['A+', 'A-', 'AB+', 'AB-'] },
                'B+': { canReceiveFrom: ['B+', 'B-', 'O+', 'O-'], canDonateTo: ['B+', 'AB+'] },
                'B-': { canReceiveFrom: ['B-', 'O-'], canDonateTo: ['B+', 'B-', 'AB+', 'AB-'] },
                'AB+': { canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], canDonateTo: ['AB+'] },
                'AB-': { canReceiveFrom: ['A-', 'B-', 'AB-', 'O-'], canDonateTo: ['AB+', 'AB-'] },
                'O+': { canReceiveFrom: ['O+', 'O-'], canDonateTo: ['A+', 'B+', 'AB+', 'O+'] },
                'O-': { canReceiveFrom: ['O-'], canDonateTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }
            },
            init: function() {
                if (this.initialized) return;
                this.initialized = true;
                try {
                    if (typeof App !== 'undefined' && App.settings) {
                        if (App.settings.whatsapp_emergency_1) this.emergencyPhones[0] = App.settings.whatsapp_emergency_1;
                        if (App.settings.whatsapp_emergency_2) this.emergencyPhones[1] = App.settings.whatsapp_emergency_2;
                    }
                } catch(e) {}
                var form = document.getElementById('bloodRequestForm');
                if (form) form.addEventListener('submit', function(e) { Blood.submitRequest(e); });
            },
            submitRequest: function(e) {
                e.preventDefault();
                var form = e.target;
                var btn = form.querySelector('button[type="submit"]');
                var orig = btn.innerHTML;
                btn.disabled = true;
                btn.textContent = 'Submitting...';
                var fd = new FormData(form);
                var payload = {
                    patient_name: fd.get('patient_name') || '',
                    blood_group: fd.get('blood_group') || '',
                    units_needed: parseInt(fd.get('units_needed')) || 1,
                    hospital: fd.get('hospital') || '',
                    location: fd.get('location') || '',
                    contact_name: fd.get('contact_name') || '',
                    contact_phone: fd.get('contact_phone') || '',
                    urgency: fd.get('urgency') || 'urgent',
                    additional_notes: fd.get('additional_notes') || '',
                    status: 'active'
                };
                supabaseAdmin.from('blood_requests').insert(payload).then(function(r) {
                    if (r.error) {
                        if (typeof App !== 'undefined') App.toast('Failed: ' + r.error.message, 'error');
                    } else {
                        Blood.triggerWhatsAppAlert(payload);
                        if (typeof Mail !== 'undefined' && Mail.sendBloodRequestNotification) Mail.sendBloodRequestNotification(payload);
                        if (typeof App !== 'undefined') App.toast('Blood request submitted! Alerts sent.', 'success', 5000);
                        form.reset();
                    }
                    btn.disabled = false;
                    btn.innerHTML = orig;
                    if (typeof feather !== 'undefined') feather.replace();
                });
            },
            triggerWhatsAppAlert: function(req) {
                try {
                    var c = this.compatibility[req.blood_group];
                    var g = c ? c.canReceiveFrom.join(', ') : req.blood_group;
                    var msg = encodeURIComponent('URGENT BLOOD REQUEST\n\nPatient: ' + req.patient_name + '\nBlood: ' + req.blood_group + ' (Accepts: ' + g + ')\nUnits: ' + req.units_needed + '\nHospital: ' + req.hospital + '\nContact: ' + req.contact_name + ' - ' + req.contact_phone + '\n\n- Rotaract Club of Coimbatore Unity');
                    window.open('https://wa.me/91' + this.emergencyPhones[0] + '?text=' + msg, '_blank');
                    var self = this;
                    setTimeout(function() { window.open('https://wa.me/91' + self.emergencyPhones[1] + '?text=' + msg, '_blank'); }, 1500);
                } catch(e) {}
            },
            loadBloodRequestsAdmin: function() {
                var tbody = document.getElementById('bloodTableBody');
                if (!tbody) return;
                tbody.innerHTML = '<tr><td colspan="8"><div class="inline-loader">Loading...</div></td></tr>';
                supabaseAdmin.from('blood_requests').select('*').order('created_at', { ascending: false }).then(function(r) {
                    var data = r.data || [];
                    if (!data.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-table"><p>No requests</p></div></td></tr>'; return; }
                    var esc = typeof App !== 'undefined' ? App.esc.bind(App) : function(s) { return s || ''; };
                    tbody.innerHTML = data.map(function(r) {
                        return '<tr><td><strong>' + esc(r.patient_name) + '</strong></td><td><span style="padding:0.35rem 0.75rem;background:linear-gradient(135deg,#dc2626,#f43f5e);color:white;border-radius:8px;font-weight:800;">' + esc(r.blood_group) + '</span></td><td>' + r.units_needed + '</td><td>' + esc(r.hospital) + '</td><td>' + esc(r.contact_name) + '<br><small>' + esc(r.contact_phone) + '</small></td><td>' + Blood.formatUrgency(r.urgency) + '</td><td><span class="status-badge status-' + (r.status === 'active' ? 'approved' : 'inactive') + '">' + esc(r.status) + '</span></td><td><div class="table-actions"><button class="table-action-btn approve" onclick="Blood.callContact(\'' + esc(r.contact_phone) + '\')"><i data-feather="phone"></i></button><button class="table-action-btn download" onclick="Blood.whatsappContact(\'' + esc(r.contact_phone) + '\',\'' + esc(r.contact_name) + '\')"><i data-feather="message-circle"></i></button>' + (r.status === 'active' ? '<button class="table-action-btn approve" onclick="Blood.markResolved(\'' + r.id + '\')"><i data-feather="check"></i></button>' : '') + '<button class="table-action-btn delete" onclick="Blood.deleteRequest(\'' + r.id + '\')"><i data-feather="trash-2"></i></button></div></td></tr>';
                    }).join('');
                    if (typeof feather !== 'undefined') feather.replace();
                });
            },
            callContact: function(p) { if (p) window.location.href = 'tel:' + p; },
            whatsappContact: function(p, n) { if (!p) return; var c = String(p).replace(/\D/g, ''); if (c.length === 10) c = '91' + c; window.open('https://wa.me/' + c + '?text=' + encodeURIComponent('Hello ' + (n||'') + ', regarding blood request...'), '_blank'); },
            markResolved: function(id) { if (typeof App !== 'undefined' && App.confirm) App.confirm('Mark resolved?', function() { supabaseAdmin.from('blood_requests').update({ status: 'resolved' }).eq('id', id).then(function() { App.toast('Resolved', 'success'); Blood.loadBloodRequestsAdmin(); }); }); },
            deleteRequest: function(id) { if (typeof App !== 'undefined' && App.confirm) App.confirm('Delete?', function() { supabaseAdmin.from('blood_requests').delete().eq('id', id).then(function() { App.toast('Deleted', 'success'); Blood.loadBloodRequestsAdmin(); }); }); },
            findDonors: function(bg) { var c = this.compatibility[bg]; if (!c) return Promise.resolve([]); return supabaseAdmin.from('club_members').select('full_name,phone,email,blood_group').in('blood_group', c.canReceiveFrom).eq('is_active', true).then(function(r) { return r.data || []; }).catch(function() { return []; }); },
            getStats: function() { return supabaseAdmin.from('blood_requests').select('*').then(function(r) { var d = r.data || []; return { total: d.length, active: d.filter(function(x){return x.status==='active';}).length, resolved: d.filter(function(x){return x.status==='resolved';}).length }; }).catch(function() { return { total: 0, active: 0, resolved: 0 }; }); },
            formatUrgency: function(u) { return { urgent: 'URGENT', within_24hrs: 'Within 24 Hours', within_48hrs: 'Within 48 Hours', scheduled: 'Scheduled' }[u] || u || ''; }
        };
    }
})();

// ============================================================
// MAIN APP OBJECT
// ============================================================
var App = {
    settings: {},
    currentUser: null,
    activeSection: 'hero',
    initialized: false,
    iconObserver: null,

    init: async function() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            await this.loadSettings();

            this.initNavigation();
            this.initScrollEffects();
            this.initBackToTop();
            this.setFooterYear();
            this.initFileUploads();
            this.setupIconObserver();

            if (window.Blood && typeof window.Blood.init === 'function') window.Blood.init();
            if (typeof Auth !== 'undefined') Auth.init();

            await Promise.allSettled([
                this.loadStatistics(),
                this.loadUpcomingEvents(),
                this.loadCompletedEvents('all'),
                this.loadPastLeaders(),
                this.loadMembers(),
                this.loadTrainers(),
                this.loadNewsletters(),
                this.loadBenefits()
            ]);

            this.initEventListeners();
            this.initMap();

            if (typeof Chatbot !== 'undefined') Chatbot.init();
            if (typeof Mail !== 'undefined' && Mail.init) Mail.init();

            setTimeout(function() {
                var loader = document.getElementById('loadingScreen');
                if (loader) loader.classList.add('hidden');
            }, 800);

            this.fixIconSizes();
            var self = this;
            [200, 500, 1000, 2000].forEach(function(delay) {
                setTimeout(function() {
                    if (typeof feather !== 'undefined') feather.replace();
                    self.fixIconSizes();
                }, delay);
            });
        } catch (err) {
            console.error('App init error:', err);
            setTimeout(function() {
                var loader = document.getElementById('loadingScreen');
                if (loader) loader.classList.add('hidden');
            }, 1000);
        }
    },

    // ============================================================
    // SETTINGS
    // ============================================================
    loadSettings: async function() {
        try {
            var result = await supabaseClient.from('site_settings').select('*');
            if (result.error) { console.error('Settings error:', result.error); return; }
            this.settings = {};
            (result.data || []).forEach(function(s) { App.settings[s.setting_key] = s.setting_value; });
            this.applySettings();
        } catch (err) { console.error('Settings exception:', err); }
    },

    applySettings: function() {
        var s = this.settings;
        if (typeof Theme !== 'undefined' && Theme.updateLogosFromSettings) Theme.updateLogosFromSettings();
        this.setText('heroTitle', s.club_name);
        this.setText('heroSubtitle', s.parent_club);
        this.setText('heroClubId', 'Club ID: ' + (s.club_id || '91594'));
        this.setText('heroCharterDate', 'Charter Date: ' + (s.charter_date || '21.4.2014'));
        this.setText('heroDistrict', s.district ? s.district + (s.district_region ? ' (' + s.district_region + ')' : '') : 'Rotary International District 3206');
        this.setText('infoClubId', s.club_id);
        this.setText('infoCharter', s.charter_date);
        this.setText('infoDistrict', s.district);
        this.setText('infoRegion', s.district_region);
        this.setText('contactAddress', s.address);
        var emailEl = document.getElementById('contactEmail');
        if (emailEl && s.club_email) { emailEl.href = 'mailto:' + s.club_email; emailEl.textContent = s.club_email; }
    },

    setText: function(id, value) { var el = document.getElementById(id); if (el && value) el.textContent = value; },

    // ============================================================
    // ICON FIXES
    // ============================================================
    fixIconSizes: function() {
        try {
            var self = this;
            var fix = function(sel, size) { document.querySelectorAll(sel).forEach(function(svg) { self.forceSvgSize(svg, size); }); };
            fix('.nav-link svg', 20);
            fix('.theme-toggle svg, .btn-admin-login svg', 18);
            fix('.about-icon svg, .stat-icon svg, .benefit-icon svg', 28);
            fix('.info-chip > svg, .info-chip > i > svg', 24);
            fix('.event-avenue-badge svg, .event-meta-item svg', 14);
            fix('.avenue-tab svg', 16);
            fix('.member-detail svg, .trainer-info-item svg, .contact-item svg', 20);
            fix('.filter-btn svg', 16);
            fix('.social-link svg', 18);
            fix('.chatbot-toggle svg', 26);
            fix('.chatbot-send svg, .chatbot-minimize svg', 18);
            fix('.back-to-top svg', 22);
            fix('.toast svg', 20);
            fix('.empty-state > svg, .empty-state > i > svg', 60);
            fix('.modal-close svg', 18);
            fix('.password-toggle svg', 18);
            fix('.input-icon-wrap > svg, .input-icon-wrap > i > svg', 18);
            fix('.hero-scroll-indicator svg', 32);
            fix('.footer-links-group a svg', 14);
            fix('.file-upload-area > svg, .file-upload-area > i > svg', 32);
            fix('.photo-preview-remove svg', 14);

            document.querySelectorAll('.btn svg').forEach(function(svg) {
                if (svg.closest('.btn-lg')) self.forceSvgSize(svg, 18);
                else if (svg.closest('.btn-sm')) self.forceSvgSize(svg, 14);
                else self.forceSvgSize(svg, 16);
            });

            if (typeof Auth !== 'undefined' && Auth.fixAdminIconSizes) Auth.fixAdminIconSizes();
        } catch (err) {}
    },

    forceSvgSize: function(svg, size) {
        if (!svg || svg.tagName !== 'svg') return;
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.style.width = size + 'px';
        svg.style.height = size + 'px';
        svg.style.minWidth = size + 'px';
        svg.style.minHeight = size + 'px';
        svg.style.flexShrink = '0';
    },

    setupIconObserver: function() {
        if (typeof MutationObserver === 'undefined') return;
        try {
            if (this.iconObserver) this.iconObserver.disconnect();
            var debounceTimer = null;
            var self = this;
            this.iconObserver = new MutationObserver(function(mutations) {
                var shouldFix = false;
                for (var i = 0; i < mutations.length; i++) {
                    if (mutations[i].addedNodes.length > 0) {
                        for (var j = 0; j < mutations[i].addedNodes.length; j++) {
                            var node = mutations[i].addedNodes[j];
                            if (node.nodeType === 1 && (node.tagName === 'SVG' || node.tagName === 'I' || (node.querySelector && (node.querySelector('svg') || node.querySelector('i'))))) {
                                shouldFix = true;
                                break;
                            }
                        }
                    }
                    if (shouldFix) break;
                }
                if (shouldFix) {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(function() { self.fixIconSizes(); }, 150);
                }
            });
            this.iconObserver.observe(document.body, { childList: true, subtree: true });
        } catch (err) {}
    },

    // ============================================================
    // NAVIGATION
    // ============================================================
    initNavigation: function() {
        var navToggle = document.getElementById('navToggle');
        var navLinks = document.getElementById('navLinks');
        if (navToggle) {
            navToggle.addEventListener('click', function() {
                var isOpen = navToggle.classList.toggle('active');
                if (navLinks) navLinks.classList.toggle('active');
                navToggle.setAttribute('aria-expanded', String(isOpen));
            });
        }
        var self = this;
        document.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', function() {
                var href = link.getAttribute('href');
                if (href && href.indexOf('#') === 0) {
                    if (navToggle) { navToggle.classList.remove('active'); navToggle.setAttribute('aria-expanded', 'false'); }
                    if (navLinks) navLinks.classList.remove('active');
                    self.updateActiveNav(link.dataset.section);
                }
            });
        });
    },

    updateActiveNav: function(section) {
        if (!section) return;
        document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
        var activeLink = document.querySelector('.nav-link[data-section="' + section + '"]');
        if (activeLink) activeLink.classList.add('active');
        this.activeSection = section;
    },

    initScrollEffects: function() {
        var nav = document.getElementById('mainNav');
        var backTop = document.getElementById('backToTop');
        var self = this;
        var scrollHandler = function() {
            var scrolled = window.scrollY > 50;
            if (nav) nav.classList.toggle('scrolled', scrolled);
            if (backTop) backTop.classList.toggle('hidden', window.scrollY < 400);
            var sections = document.querySelectorAll('section[id]');
            var currentSection = 'hero';
            var scrollPos = window.scrollY + 150;
            sections.forEach(function(section) { if (scrollPos >= section.offsetTop) currentSection = section.id; });
            if (currentSection !== self.activeSection) self.updateActiveNav(currentSection);
        };
        window.addEventListener('scroll', this.throttle(scrollHandler, 100));
    },

    initBackToTop: function() {
        var btn = document.getElementById('backToTop');
        if (btn) btn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    },

    setFooterYear: function() {
        var el = document.getElementById('footerYear');
        if (el) el.textContent = new Date().getFullYear();
    },

    // ============================================================
    // MAP
    // ============================================================
    initMap: function() {
        var mapEl = document.getElementById('contactMap');
        if (!mapEl || typeof L === 'undefined') return;
        try {
            var lat = 11.0168, lng = 76.9558;
            var map = L.map(mapEl, { center: [lat, lng], zoom: 12, scrollWheelZoom: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 18 }).addTo(map);
            var marker = L.marker([lat, lng]).addTo(map);
            marker.bindPopup('<b>' + this.esc(this.settings.club_name || 'Rotaract Club of Coimbatore Unity') + '</b><br>' + this.esc(this.settings.address || 'Coimbatore, Tamil Nadu')).openPopup();
            map.on('click', function() { map.scrollWheelZoom.enable(); });
            setTimeout(function() { map.invalidateSize(); }, 500);
        } catch (err) { console.error('Map error:', err); }
    },

    // ============================================================
    // DATA LOADERS
    // ============================================================
    loadStatistics: async function() {
        try {
            var result = await supabaseClient.from('club_statistics').select('*').order('sort_order');
            if (result.error) return;
            var grid = document.getElementById('statsGrid');
            if (!grid) return;
            var data = result.data || [];
            if (!data.length) { grid.innerHTML = ''; return; }
            grid.innerHTML = data.map(function(stat) {
                return '<div class="stat-card"><div class="stat-icon"><i data-feather="' + App.esc(stat.stat_icon || 'star') + '"></i></div><div class="stat-value" data-target="' + (parseInt(stat.stat_value) || 0) + '">' + App.esc(stat.stat_value) + '+</div><div class="stat-label">' + App.esc(stat.stat_label) + '</div></div>';
            }).join('');
            if (typeof feather !== 'undefined') feather.replace();
            setTimeout(function() { App.fixIconSizes(); }, 100);
            this.animateCounters();
        } catch (err) {}
    },

    animateCounters: function() {
        var counters = document.querySelectorAll('.stat-value[data-target]');
        if (!counters.length) return;
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var el = entry.target;
                    var target = parseInt(el.dataset.target) || 0;
                    if (target === 0) return;
                    var step = target / 93.75;
                    var current = 0;
                    var update = function() {
                        current += step;
                        if (current < target) { el.textContent = Math.floor(current).toLocaleString() + '+'; requestAnimationFrame(update); }
                        else { el.textContent = target.toLocaleString() + '+'; }
                    };
                    update();
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.3 });
        counters.forEach(function(c) { observer.observe(c); });
    },

    loadUpcomingEvents: async function() {
        try {
            var today = new Date().toISOString().split('T')[0];
            var nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            var nextWeekStr = nextWeek.toISOString().split('T')[0];

            var result = await supabaseClient.from('events').select('*').gte('event_date', today).lte('event_date', nextWeekStr).eq('is_approved', true).order('event_date').order('event_time');
            if (result.error) return;

            var grid = document.getElementById('upcomingEventsGrid');
            if (!grid) return;
            var data = result.data || [];
            if (!data.length) {
                grid.innerHTML = '<div class="empty-state glass-card"><i data-feather="calendar"></i><p>No upcoming projects in the next 7 days</p></div>';
            } else {
                grid.innerHTML = data.map(function(e) { return App.renderEventCard(e, true); }).join('');
            }
            if (typeof feather !== 'undefined') feather.replace();
            setTimeout(function() { App.fixIconSizes(); }, 100);
        } catch (err) {}
    },

    loadCompletedEvents: async function(avenue) {
        try {
            var today = new Date().toISOString().split('T')[0];
            var query = supabaseClient.from('events').select('*').lt('event_date', today).eq('is_approved', true).order('event_date', { ascending: false });
            if (avenue && avenue !== 'all') query = query.eq('avenue', avenue);
            var result = await query;
            if (result.error) return;

            var grid = document.getElementById('completedEventsGrid');
            if (!grid) return;
            var data = result.data || [];
            if (!data.length) {
                grid.innerHTML = '<div class="empty-state glass-card"><i data-feather="inbox"></i><p>No completed projects</p></div>';
            } else {
                grid.innerHTML = data.slice(0, 12).map(function(e) { return App.renderEventCard(e, false); }).join('');
            }
            if (typeof feather !== 'undefined') feather.replace();
            setTimeout(function() { App.fixIconSizes(); }, 100);
        } catch (err) {}
    },

    renderEventCard: function(event, upcoming) {
        var dateObj = new Date(event.event_date + 'T' + (event.event_time || '00:00:00'));
        var dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        var timeStr = this.formatTime(event.event_time);

        return '<div class="event-card glass-card" onclick="App.showEventDetails(\'' + event.id + '\')" role="button" tabindex="0">' +
            (event.poster_url ? '<img src="' + this.esc(event.poster_url) + '" alt="' + this.esc(event.event_name) + '" class="event-poster" loading="lazy">' : '<div class="event-poster-placeholder"><i data-feather="image"></i></div>') +
            '<div class="event-info">' +
            '<span class="event-avenue-badge"><i data-feather="tag"></i>' + this.esc(this.avenueLabel(event.avenue)) + '</span>' +
            '<h3 class="event-title">' + this.esc(event.event_name) + '</h3>' +
            '<div class="event-meta">' +
            '<div class="event-meta-item"><i data-feather="calendar"></i><span>' + dateStr + '</span></div>' +
            '<div class="event-meta-item"><i data-feather="clock"></i><span>' + timeStr + '</span></div>' +
            (event.venue ? '<div class="event-meta-item"><i data-feather="map-pin"></i><span>' + this.esc(event.venue) + '</span></div>' : '') +
            '</div>' +
            (event.description ? '<p class="event-description">' + this.esc(event.description) + '</p>' : '') +
            '<div class="event-actions">' +
            '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); App.showEventDetails(\'' + event.id + '\')"><i data-feather="eye"></i>Details</button>' +
            (upcoming ? '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); App.addToCalendar(\'' + event.id + '\')"><i data-feather="plus"></i>Calendar</button>' : '') +
            '</div></div></div>';
    },

    showEventDetails: async function(eventId) {
        try {
            if (typeof Events !== 'undefined' && Events.showEventDetails) return Events.showEventDetails(eventId);

            var result = await supabaseClient.from('events').select('*').eq('id', eventId).single();
            if (result.error || !result.data) { this.toast('Failed', 'error'); return; }
            var event = result.data;
            var photosResult = await supabaseClient.from('event_photos').select('*').eq('event_id', eventId).order('sort_order');
            var photos = photosResult.data || [];

            var modal = document.getElementById('eventModal');
            var body = document.getElementById('eventModalBody');
            if (!modal || !body) return;

            var dateStr = new Date(event.event_date + 'T' + (event.event_time || '00:00:00')).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            body.innerHTML = (event.poster_url ? '<img src="' + this.esc(event.poster_url) + '" alt="' + this.esc(event.event_name) + '" class="event-modal-poster">' : '') +
                '<span class="event-avenue-badge"><i data-feather="tag"></i>' + this.esc(this.avenueLabel(event.avenue)) + '</span>' +
                '<h2 class="event-modal-title">' + this.esc(event.event_name) + '</h2>' +
                '<div class="event-modal-meta">' +
                '<div class="event-modal-meta-item"><i data-feather="calendar"></i><div><strong>Date</strong><span>' + dateStr + '</span></div></div>' +
                '<div class="event-modal-meta-item"><i data-feather="clock"></i><div><strong>Time</strong><span>' + this.formatTime(event.event_time) + (event.end_time ? ' - ' + this.formatTime(event.end_time) : '') + '</span></div></div>' +
                (event.venue ? '<div class="event-modal-meta-item"><i data-feather="map-pin"></i><div><strong>Venue</strong><span>' + this.esc(event.venue) + '</span></div></div>' : '') +
                '</div>' +
                (event.description ? '<p class="event-modal-description">' + this.esc(event.description) + '</p>' : '') +
                '<div class="event-modal-actions"><button class="btn btn-primary" onclick="App.addToCalendar(\'' + event.id + '\')"><i data-feather="calendar"></i>Calendar</button><button class="btn btn-outline" onclick="App.shareEvent(\'' + event.id + '\')"><i data-feather="share-2"></i>Share</button></div>' +
                (photos.length > 0 ? '<h4 style="margin-top:2rem;margin-bottom:1rem;">Photographs</h4><div class="event-modal-photos">' + photos.map(function(p) { return '<img src="' + App.esc(p.photo_url) + '" alt="Photo" onclick="window.open(\'' + App.esc(p.photo_url) + '\',\'_blank\')">'; }).join('') + '</div>' : '');

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (typeof feather !== 'undefined') feather.replace();
            setTimeout(function() { App.fixIconSizes(); }, 100);
        } catch (err) { this.toast('Failed', 'error'); }
    },

    addToCalendar: async function(eventId) {
        if (typeof Events !== 'undefined' && Events.addToCalendar) return Events.addToCalendar(eventId);
        try {
            var result = await supabaseClient.from('events').select('*').eq('id', eventId).single();
            if (!result.data) return;
            var event = result.data;
            var startDate = new Date(event.event_date + 'T' + (event.event_time || '00:00:00'));
            var endDate = event.end_time ? new Date(event.event_date + 'T' + event.end_time) : new Date(startDate.getTime() + 7200000);
            var fmt = function(d) { return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; };
            var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:' + event.id + '@rotaractunity\r\nDTSTAMP:' + fmt(new Date()) + '\r\nDTSTART:' + fmt(startDate) + '\r\nDTEND:' + fmt(endDate) + '\r\nSUMMARY:' + event.event_name + '\r\nLOCATION:' + (event.venue || '') + '\r\nEND:VEVENT\r\nEND:VCALENDAR';
            var blob = new Blob([ics], { type: 'text/calendar' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = event.event_name.replace(/[^a-z0-9]/gi, '_') + '.ics';
            a.click();
            URL.revokeObjectURL(url);
            this.toast('Calendar downloaded', 'success');
        } catch (err) { this.toast('Failed', 'error'); }
    },

    shareEvent: async function(eventId) {
        try {
            var result = await supabaseClient.from('events').select('*').eq('id', eventId).single();
            if (!result.data) return;
            var event = result.data;
            var text = 'Check out: ' + event.event_name + ' by Rotaract Club of Coimbatore Unity';
            if (navigator.share) { try { await navigator.share({ title: event.event_name, text: text, url: window.location.href }); } catch(e) {} }
            else if (navigator.clipboard) { await navigator.clipboard.writeText(text + ' ' + window.location.href); this.toast('Copied', 'success'); }
        } catch (err) {}
    },

    loadPastLeaders: async function() {
        try {
            var result = await supabaseClient.from('past_leaders').select('*').order('year_range', { ascending: false }).order('sort_order');
            if (result.error) return;
            var container = document.getElementById('pastLeadersTimeline');
            if (!container) return;
            var data = result.data || [];
            if (!data.length) { container.innerHTML = '<div class="empty-state glass-card"><i data-feather="users"></i><p>Past leaders will appear here</p></div>'; if (typeof feather !== 'undefined') feather.replace(); return; }

            var grouped = {};
            data.forEach(function(l) { if (!grouped[l.year_range]) grouped[l.year_range] = []; grouped[l.year_range].push(l); });
            var html = '';
            Object.keys(grouped).forEach(function(year) {
                html += '<div class="timeline-year-group"><div class="timeline-year-label">' + App.esc(year) + '</div>';
                grouped[year].forEach(function(leader, idx) {
                    var side = idx % 2 === 0 ? 'left' : 'right';
                    html += '<div class="timeline-item ' + side + ' glass-card">' +
                        (leader.photo_url ? '<img src="' + App.esc(leader.photo_url) + '" alt="' + App.esc(leader.full_name) + '" class="timeline-photo">' : '<div class="timeline-photo" style="background:var(--gradient-blue);display:flex;align-items:center;justify-content:center;color:white;font-size:2rem;font-weight:800;">' + App.esc(leader.full_name.charAt(0)) + '</div>') +
                        '<div class="timeline-name">' + App.esc(leader.full_name) + '</div>' +
                        '<div class="timeline-position">' + App.esc(leader.position) + '</div>' +
                        '<div class="timeline-year">' + App.esc(leader.year_range) + '</div>' +
                        (leader.ri_id ? '<div class="timeline-year">RI ID: ' + App.esc(leader.ri_id) + '</div>' : '') +
                        '</div>';
                });
                html += '</div>';
            });
            container.innerHTML = html;
            if (typeof feather !== 'undefined') feather.replace();
        } catch (err) {}
    },

    loadMembers: async function(filter) {
        // Delegate to Members module if available
        if (typeof Members !== 'undefined' && Members.loadMembers) {
            return Members.loadMembers(filter);
        }

        // Fallback: Read directly from club_members (NOT users)
        try {
            var query = supabaseClient
                .from('club_members')
                .select('*')
                .eq('is_active', true)
                .order('is_board_member', { ascending: false })
                .order('sort_order')
                .order('full_name');

            if (filter === 'board') {
                query = query.eq('is_board_member', true);
            }

            var result = await query;
            if (result.error) return;
            var grid = document.getElementById('membersGrid');
            if (!grid) return;
            var data = result.data || [];
            if (!data.length) { 
                grid.innerHTML = '<div class="empty-state glass-card"><i data-feather="users"></i><p>Members will appear here</p></div>'; 
            } else {
                grid.innerHTML = data.map(function(m) {
                    return '<div class="member-card glass-card">' +
                        (m.photo_url ? '<img src="' + App.esc(m.photo_url) + '" alt="' + App.esc(m.full_name) + '" class="member-photo">' : '<div class="member-photo" style="background:var(--gradient-blue);display:flex;align-items:center;justify-content:center;color:white;font-size:3rem;font-weight:800;">' + App.esc(m.full_name.charAt(0)) + '</div>') +
                        '<div class="member-name">' + App.esc(m.full_name) + '</div>' +
                        '<div class="member-portfolio">' + App.esc(m.portfolio || 'Member') + '</div>' +
                        '<div class="member-details">' +
                        (m.ri_id ? '<div class="member-detail"><i data-feather="hash"></i>' + App.esc(m.ri_id) + '</div>' : '') +
                        (m.email ? '<div class="member-detail"><i data-feather="mail"></i>' + App.esc(m.email) + '</div>' : '') +
                        (m.phone ? '<div class="member-detail"><i data-feather="phone"></i>' + App.esc(m.phone) + '</div>' : '') +
                        (m.blood_group ? '<div class="member-blood-badge">' + App.esc(m.blood_group) + '</div>' : '') +
                        '</div></div>';
                }).join('');
            }
            if (typeof feather !== 'undefined') feather.replace();
            setTimeout(function() { App.fixIconSizes(); }, 100);
        } catch (err) {
            console.error('Fallback loadMembers error:', err);
        }
    },

    loadTrainers: async function() {
        try {
            var result = await supabaseClient.from('club_trainers').select('*').eq('is_active', true).order('full_name');
            if (result.error) return;
            var grid = document.getElementById('trainersGrid');
            if (!grid) return;
            var data = result.data || [];
            if (!data.length) { grid.innerHTML = '<div class="empty-state glass-card"><i data-feather="award"></i><p>Trainers will appear here</p></div>'; }
            else {
                grid.innerHTML = data.map(function(t) {
                    return '<div class="trainer-card glass-card">' +
                        (t.photo_url ? '<img src="' + App.esc(t.photo_url) + '" alt="' + App.esc(t.full_name) + '" class="trainer-photo">' : '<div class="trainer-photo" style="background:var(--gradient-blue);display:flex;align-items:center;justify-content:center;color:white;font-size:3rem;font-weight:800;">' + App.esc(t.full_name.charAt(0)) + '</div>') +
                        '<div class="trainer-name">' + App.esc(t.full_name) + '</div>' +
                        '<div class="trainer-expertise">' + App.esc(t.area_of_expertise || 'Trainer') + '</div>' +
                        '<div class="trainer-info">' +
                        (t.ri_id ? '<div class="trainer-info-item"><i data-feather="hash"></i>RI ID: ' + App.esc(t.ri_id) + '</div>' : '') +
                        (t.email ? '<div class="trainer-info-item"><i data-feather="mail"></i>' + App.esc(t.email) + '</div>' : '') +
                        (t.certified_year ? '<div class="trainer-info-item"><i data-feather="award"></i>Certified: ' + App.esc(t.certified_year) + '</div>' : '') +
                        '</div></div>';
                }).join('');
            }
            if (typeof feather !== 'undefined') feather.replace();
            setTimeout(function() { App.fixIconSizes(); }, 100);
        } catch (err) {}
    },

    loadNewsletters: async function() {
        try {
            var result = await supabaseClient.from('newsletters').select('*').eq('is_published', true).order('published_date', { ascending: false });
            if (result.error) return;
            var grid = document.getElementById('newsletterGrid');
            if (!grid) return;
            var data = result.data || [];
            if (!data.length) { grid.innerHTML = '<div class="empty-state glass-card"><i data-feather="book-open"></i><p>Bulletins will appear here</p></div>'; }
            else {
                grid.innerHTML = data.map(function(n) {
                    return '<div class="newsletter-card glass-card">' +
                        (n.cover_image_url ? '<img src="' + App.esc(n.cover_image_url) + '" alt="' + App.esc(n.bulletin_name) + '" class="newsletter-cover">' : '<div class="newsletter-cover" style="background:var(--gradient-blue);display:flex;align-items:center;justify-content:center;color:white;"><i data-feather="book-open" style="width:60px;height:60px;"></i></div>') +
                        '<div class="newsletter-body">' +
                        '<div class="newsletter-title">' + App.esc(n.bulletin_name) + '</div>' +
                        (n.edition ? '<div class="newsletter-edition">' + App.esc(n.edition) + '</div>' : '') +
                        (n.published_date ? '<div class="newsletter-date">' + new Date(n.published_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' : '') +
                        (n.description ? '<p class="newsletter-description">' + App.esc(n.description) + '</p>' : '') +
                        (n.drive_link ? '<a href="' + App.esc(n.drive_link) + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm btn-block"><i data-feather="external-link"></i>Read Bulletin</a>' : '') +
                        '</div></div>';
                }).join('');
            }
            if (typeof feather !== 'undefined') feather.replace();
            setTimeout(function() { App.fixIconSizes(); }, 100);
        } catch (err) {}
    },

    loadBenefits: async function() {
        try {
            var result = await supabaseClient.from('joining_benefits').select('*').order('sort_order');
            if (result.error) return;
            var grid = document.getElementById('benefitsGrid');
            if (!grid) return;
            var data = result.data || [];
            if (!data.length) { grid.innerHTML = ''; return; }
            grid.innerHTML = data.map(function(b) {
                return '<div class="benefit-card glass-card"><div class="benefit-icon"><i data-feather="' + App.esc(b.icon || 'star') + '"></i></div><h3 class="benefit-title">' + App.esc(b.title) + '</h3><p class="benefit-description">' + App.esc(b.description) + '</p></div>';
            }).join('');
            if (typeof feather !== 'undefined') feather.replace();
            setTimeout(function() { App.fixIconSizes(); }, 100);
        } catch (err) {}
    },

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    initEventListeners: function() {
        var self = this;
        document.querySelectorAll('.avenue-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.avenue-tab').forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                self.loadCompletedEvents(tab.dataset.avenue);
            });
        });

        document.querySelectorAll('.filter-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                self.loadMembers(btn.dataset.filter);
            });
        });

        var eventModal = document.getElementById('eventModal');
        var eventModalClose = document.getElementById('eventModalClose');
        if (eventModalClose) eventModalClose.addEventListener('click', function() { eventModal.classList.add('hidden'); document.body.style.overflow = ''; });
        if (eventModal) eventModal.addEventListener('click', function(e) { if (e.target === eventModal) { eventModal.classList.add('hidden'); document.body.style.overflow = ''; } });

        var memberForm = document.getElementById('membershipForm');
        if (memberForm) memberForm.addEventListener('submit', function(e) { self.handleMembershipApp(e); });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                var em = document.getElementById('eventModal');
                if (em && !em.classList.contains('hidden')) { em.classList.add('hidden'); document.body.style.overflow = ''; }
            }
        });
    },

    // ============================================================
    // FILE UPLOAD & CLOUDINARY / SUPABASE STORAGE FALLBACK
    // ============================================================
    initFileUploads: function() {
        var memberPhotoInput = document.getElementById('memberPhotoInput');
        var memberPhotoPreview = document.getElementById('memberPhotoPreview');
        if (memberPhotoInput) memberPhotoInput.addEventListener('change', function(e) { App.previewImage(e.target.files[0], memberPhotoPreview); });
    },

    previewImage: function(file, preview) {
        if (!file || !preview) return;
        var reader = new FileReader();
        reader.onload = function(e) { preview.src = e.target.result; preview.classList.remove('hidden'); };
        reader.readAsDataURL(file);
    },

    /**
     * Uploads a file with 3-tier fallback:
     * 1. Cloudinary Unsigned Preset
     * 2. Supabase Storage (creates bucket if missing)
     * 3. Base64 fallback (last resort)
     */
    uploadToCloudinary: async function(file, folder) {
        if (!file || file.size > 50 * 1024 * 1024) throw new Error('File too large or missing');

        // TIER 1: Try Cloudinary Unsigned Upload
        try {
            var formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            var response = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload', { method: 'POST', body: formData });
            var data = await response.json();

            if (data && data.secure_url) {
                console.log('Cloudinary upload successful');
                return data;
            }
            console.warn('Cloudinary preset upload failed, switching to Supabase Storage:', data.error ? data.error.message : 'Unknown error');
        } catch (cErr) {
            console.warn('Cloudinary network error, switching to Supabase Storage:', cErr.message);
        }

        // TIER 2: Guaranteed Fallback: Upload to Supabase Storage Bucket
        return await this.uploadToSupabaseStorage(file, folder);
    },

    uploadToSupabaseStorage: async function(file, folder) {
        try {
            var bucketName = 'club-assets';
            var fileExt = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
            var cleanFileName = (folder || 'uploads') + '/' + Date.now() + '_' + Math.random().toString(36).substring(2, 9) + '.' + fileExt;

            var uploadResult = await supabaseAdmin.storage.from(bucketName).upload(cleanFileName, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type || 'image/jpeg'
            });

            // If bucket doesn't exist, create it as public and retry
            if (uploadResult.error && (
                uploadResult.error.message.toLowerCase().includes('not found') || 
                uploadResult.error.message.toLowerCase().includes('bucket')
            )) {
                console.log('Bucket not found, creating "club-assets" as public bucket');
                await supabaseAdmin.storage.createBucket(bucketName, { 
                    public: true,
                    fileSizeLimit: 52428800 // 50MB
                });
                uploadResult = await supabaseAdmin.storage.from(bucketName).upload(cleanFileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: file.type || 'image/jpeg'
                });
            }

            if (uploadResult.error) throw uploadResult.error;

            var publicData = supabaseAdmin.storage.from(bucketName).getPublicUrl(cleanFileName);
            console.log('Supabase Storage upload successful:', publicData.data.publicUrl);
            
            return {
                secure_url: publicData.data.publicUrl,
                public_id: cleanFileName
            };
        } catch (err) {
            console.error('Supabase storage fallback error:', err);
            // TIER 3: Last resort: Base64 (works only for tiny previews, breaks email)
            return await this.fileToBase64Upload(file);
        }
    },

    fileToBase64Upload: function(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() { resolve({ secure_url: reader.result, public_id: 'fallback_' + Date.now() }); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // ============================================================
    // MEMBERSHIP APPLICATION
    // ============================================================
    handleMembershipApp: async function(e) {
        e.preventDefault();
        var form = e.target;
        var submitBtn = form.querySelector('button[type="submit"]');
        var originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-feather="loader"></i>Submitting...';

        try {
            var formData = new FormData(form);
            var photoUrl = null;
            var photoPublicId = null;

            var photoFile = formData.get('photo');
            if (photoFile && photoFile.size > 0) {
                var upload = await this.uploadToCloudinary(photoFile, 'members');
                photoUrl = upload.secure_url;
                photoPublicId = upload.public_id;
            }

            var result = await supabaseAdmin.from('membership_applications').insert({
                full_name: formData.get('full_name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                date_of_birth: formData.get('date_of_birth'),
                blood_group: formData.get('blood_group'),
                photo_url: photoUrl,
                photo_public_id: photoPublicId,
                status: 'pending'
            });

            if (result.error) throw result.error;

            if (typeof Mail !== 'undefined' && Mail.sendMembershipNotification) {
                Mail.sendMembershipNotification({ name: formData.get('full_name'), email: formData.get('email') });
            }

            this.toast('Application submitted! We will contact you soon.', 'success');
            form.reset();
            var preview = document.getElementById('memberPhotoPreview');
            if (preview) preview.classList.add('hidden');
        } catch (err) {
            this.toast('Failed: ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
            if (typeof feather !== 'undefined') feather.replace();
        }
    },

    // ============================================================
    // UTILITIES
    // ============================================================
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
        try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch(e) { return dateStr; }
    },

    formatDateTime: function(d, t) { return this.formatDate(d) + ' at ' + this.formatTime(t); },

    formatCurrency: function(amount) {
        var num = parseFloat(amount) || 0;
        return '\u20B9 ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    avenueLabel: function(avenue) {
        return { club_service: 'Club Service', community_service: 'Community Service', professional_service: 'Professional Service', international_service: 'International Service', dpp: 'District Priority Projects' }[avenue] || avenue;
    },

    throttle: function(fn, delay) {
        var lastCall = 0;
        return function() {
            var now = Date.now();
            if (now - lastCall >= delay) { lastCall = now; fn.apply(this, arguments); }
        };
    },

    debounce: function(fn, delay) {
        var timer;
        return function() {
            var args = arguments;
            var context = this;
            clearTimeout(timer);
            timer = setTimeout(function() { fn.apply(context, args); }, delay);
        };
    },

    capitalize: function(str) {
        if (!str) return '';
        return String(str).charAt(0).toUpperCase() + String(str).slice(1);
    },

    toast: function(message, type, duration) {
        var container = document.getElementById('toastContainer');
        if (!container) return;
        var icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
        var toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        toast.innerHTML = '<i data-feather="' + (icons[type] || 'info') + '"></i><span>' + this.esc(message) + '</span>';
        container.appendChild(toast);
        if (typeof feather !== 'undefined') feather.replace();
        var self = this;
        setTimeout(function() { self.fixIconSizes(); }, 50);
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(function() { toast.remove(); }, 300);
        }, duration || 4000);
    },

    confirm: function(message, onConfirm, onCancel) {
        var modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = '<div class="admin-modal-content modal-sm glass-card"><div class="confirm-dialog"><i data-feather="alert-triangle"></i><h3>Confirm</h3><p>' + this.esc(message) + '</p><div class="confirm-actions"><button class="btn btn-outline" id="confirmCancel">Cancel</button><button class="btn btn-danger" id="confirmOk">Confirm</button></div></div></div>';
        document.body.appendChild(modal);
        if (typeof feather !== 'undefined') feather.replace();
        var self = this;
        setTimeout(function() { self.fixIconSizes(); }, 50);
        var close = function() { modal.remove(); };
        modal.querySelector('#confirmCancel').addEventListener('click', function() { close(); if (onCancel) onCancel(); });
        modal.querySelector('#confirmOk').addEventListener('click', function() { close(); if (onConfirm) onConfirm(); });
        modal.addEventListener('click', function(e) { if (e.target === modal) close(); });
    },

    logActivity: async function(action, details) {
        try {
            await supabaseAdmin.from('activity_log').insert({
                user_id: this.currentUser ? this.currentUser.id : null,
                action: action,
                details: details || {}
            });
        } catch (err) {}
    }
};

window.App = App;