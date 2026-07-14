/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - UTILITIES
   Complete - Zero Bugs - All functions defined
   File: utils.js
   ============================================================ */

'use strict';

// ============================================================
// SUPABASE INITIALIZATION
// ============================================================
var SUPABASE_URL = 'https://dledwtepuvzzztfypbgn.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDk2NDMsImV4cCI6MjA5ODcyNTY0M30.9ZcngwUsfl5AkFaCDR9-ljoLLOYeGwwK0AKaHfeyGhY';

var supabase;
(function initSupabase() {
    try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: false }
            });
            console.log('%c Supabase connected ', 'background:#10b981;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;');
        } else {
            console.error('Supabase CDN not loaded');
        }
    } catch (e) {
        console.error('Supabase init error:', e);
    }
})();

// ============================================================
// GLOBAL APPLICATION STATE
// ============================================================
var AppState = {
    currentAdmin:       null,
    settings:           {},
    settingsCache:      {},
    members:            [],
    events:             [],
    meetings:           [],
    treasury:           [],
    newsletters:        [],
    pastPresidents:     [],
    pastSecretaries:    [],
    trainers:           [],
    statistics:         [],
    benefits:           [],
    applications:       [],
    adminUsers:         [],
    currentAdminPage:   'dashboard',
    currentAvenue:      'all',
    projectsPage:       0,
    projectsPerPage:    9,
    allProjects:        [],
    currentProjectImages: [],
    currentImageIndex:  0,
    chatSessionId:      '',
    theme:              'dark',
    isLoading:          true,
    mobileMenuOpen:     false,
    chatbotOpen:        false,
    adminSidebarOpen:   false,
    treasuryChart:      null,
    treasuryCategoryChart: null,
    treasuryMonthlyChart:  null,
    meetingTimers:      {},
    birthdayCheckDone:  false,
    currentDetailEvent: null
};

// Init after state created
AppState.chatSessionId = generateUUID();
AppState.theme = localStorage.getItem('rcu_theme') || 'dark';

// ============================================================
// UUID GENERATOR
// ============================================================
function generateUUID() {
    try {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================
function setLocal(key, value) {
    try { localStorage.setItem('rcu_' + key, JSON.stringify(value)); } catch (e) {}
}

function getLocal(key, fallback) {
    try {
        var val = localStorage.getItem('rcu_' + key);
        return val !== null ? JSON.parse(val) : (fallback !== undefined ? fallback : null);
    } catch (e) {
        return fallback !== undefined ? fallback : null;
    }
}

function removeLocal(key) {
    try { localStorage.removeItem('rcu_' + key); } catch (e) {}
}

// ============================================================
// SETTINGS HELPERS
// ============================================================
async function loadSettings() {
    try {
        if (!supabase) return {};
        var r = await supabase.from('club_settings').select('*');
        if (r.error) throw r.error;
        if (r.data) {
            r.data.forEach(function(s) {
                AppState.settings[s.setting_key] = s.setting_value;
                AppState.settingsCache[s.setting_key] = s;
            });
        }
        return AppState.settings;
    } catch (err) {
        console.error('loadSettings error:', err);
        return {};
    }
}

function getSetting(key, fallback) {
    var val = AppState.settings[key];
    if (val === undefined || val === null || val === '') {
        return fallback !== undefined ? fallback : '';
    }
    return val;
}

async function updateSetting(key, value) {
    try {
        if (!supabase) return false;
        var r = await supabase.from('club_settings').update({
            setting_value: value,
            updated_at: new Date().toISOString(),
            updated_by: AppState.currentAdmin ? AppState.currentAdmin.id : null
        }).eq('setting_key', key);
        if (r.error) throw r.error;
        AppState.settings[key] = value;
        if (AppState.settingsCache[key]) {
            AppState.settingsCache[key].setting_value = value;
        }
        return true;
    } catch (err) {
        console.error('updateSetting error:', err);
        return false;
    }
}

// ============================================================
// THEME MANAGEMENT
// ============================================================
function initTheme() {
    var saved = localStorage.getItem('rcu_theme') || 'dark';
    AppState.theme = saved;
    document.documentElement.setAttribute('data-theme', saved);
    updateLogoForTheme(saved);
}

function toggleTheme() {
    var next = AppState.theme === 'dark' ? 'light' : 'dark';
    AppState.theme = next;
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('rcu_theme', next);
    updateLogoForTheme(next);
    refreshIcons();
}

function updateLogoForTheme(theme) {
    var el = document.getElementById('headerLogo');
    if (!el) return;
    if (theme === 'dark') {
        el.src = getSetting('white_logo', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png');
    } else {
        el.src = getSetting('color_logo', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png');
    }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
var _toastCount = 0;

function showToast(type, title, message, duration) {
    if (duration === undefined) duration = 5000;
    var container = document.getElementById('toastContainer');
    if (!container) return null;

    _toastCount++;
    var id = 'toast-' + _toastCount;
    var icons = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };
    var icon = icons[type] || 'info';

    var el = document.createElement('div');
    el.id = id;
    el.className = 'toast toast-' + type;
    el.innerHTML = [
        '<i data-lucide="' + icon + '" class="toast-icon"></i>',
        '<div class="toast-content">',
        '<div class="toast-title">' + escapeHtml(title) + '</div>',
        message ? '<div class="toast-message">' + escapeHtml(message) + '</div>' : '',
        '</div>',
        '<button class="toast-close" onclick="removeToast(\'' + id + '\')"><i data-lucide="x"></i></button>'
    ].join('');

    container.appendChild(el);
    refreshIcons();

    if (duration > 0) setTimeout(function() { removeToast(id); }, duration);
    return id;
}

function removeToast(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('toast-exit');
    setTimeout(function() { if (el && el.parentNode) el.parentNode.removeChild(el); }, 300);
}

// ============================================================
// LOADING SCREEN
// ============================================================
function hideLoadingScreen() {
    var el = document.getElementById('loadingScreen');
    if (!el) return;
    setTimeout(function() {
        el.classList.add('hidden');
        setTimeout(function() { if (el) el.style.display = 'none'; }, 600);
    }, 400);
}

function showLoadingScreen() {
    var el = document.getElementById('loadingScreen');
    if (el) { el.style.display = 'flex'; el.classList.remove('hidden'); }
}

function markAppReady() {
    AppState.isLoading = false;
    hideLoadingScreen();
    document.body.classList.add('app-ready');
    console.log('%c Rotaract Club of Coimbatore Unity Portal Ready ', 'background:#0057b7;color:#fff;font-size:13px;padding:5px 10px;border-radius:4px;font-family:Poppins,sans-serif;');
    console.log('%c Family of Rotary Club of Coimbatore East | Club ID: 91594 | District 3206 ', 'background:#1a1a2e;color:#00b4d8;font-size:10px;padding:3px 8px;');
}

// ============================================================
// LUCIDE ICONS
// ============================================================
function refreshIcons() {
    try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    } catch (e) {}
}

// ============================================================
// HEADER SCROLL
// ============================================================
function initHeaderScroll() {
    var header = document.getElementById('mainHeader');
    if (!header) return;
    var ticking = false;

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                var scroll = window.pageYOffset || document.documentElement.scrollTop;
                header.classList.toggle('scrolled', scroll > 50);

                var btn = document.getElementById('scrollTopBtn');
                if (btn) btn.classList.toggle('visible', scroll > 400);

                updateActiveNavLink();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

function updateActiveNavLink() {
    var sections = document.querySelectorAll('main .section[id]');
    var links = document.querySelectorAll('.nav-link[data-section]');
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var current = '';

    sections.forEach(function(s) {
        if (scrollY >= s.offsetTop - 120) current = s.getAttribute('id');
    });

    links.forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('data-section') === current);
    });
}

// ============================================================
// SCROLL FUNCTIONS
// ============================================================
function scrollToSection(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var top = el.offsetTop - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 70);
    window.scrollTo({ top: top, behavior: 'smooth' });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// MOBILE MENU
// ============================================================
function toggleMobileMenu() {
    var menu = document.getElementById('mobileMenu');
    var btn = document.getElementById('mobileMenuBtn');
    if (!menu || !btn) return;
    AppState.mobileMenuOpen = !AppState.mobileMenuOpen;
    menu.classList.toggle('active', AppState.mobileMenuOpen);
    btn.classList.toggle('active', AppState.mobileMenuOpen);
    document.body.style.overflow = AppState.mobileMenuOpen ? 'hidden' : '';
}

function mobileNavClick(section) {
    closeMobileMenu();
    setTimeout(function() { scrollToSection(section); }, 150);
}

function closeMobileMenu() {
    var menu = document.getElementById('mobileMenu');
    var btn = document.getElementById('mobileMenuBtn');
    if (menu) menu.classList.remove('active');
    if (btn) btn.classList.remove('active');
    AppState.mobileMenuOpen = false;
    document.body.style.overflow = '';
}

// ============================================================
// SCROLL REVEAL
// ============================================================
function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.reveal').forEach(function(el) { el.classList.add('revealed'); });
        return;
    }
    var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
            if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(function(el) { obs.observe(el); });
}

function addRevealClasses() {
    var selectors = ['.stat-card','.benefit-card','.event-card','.member-card','.trainer-card','.timeline-item','.newsletter-card','.about-card','.contact-card'];
    selectors.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el, i) {
            if (!el.classList.contains('reveal')) {
                el.classList.add('reveal');
                if (i < 5) el.classList.add('reveal-delay-' + i);
            }
        });
    });
    initScrollReveal();
}

// ============================================================
// HERO PARTICLES
// ============================================================
function initHeroParticles() {
    var container = document.getElementById('heroParticles');
    if (!container) return;
    var count = window.innerWidth < 768 ? 15 : 28;
    for (var i = 0; i < count; i++) {
        var p = document.createElement('div');
        var size = (Math.random() * 3 + 1).toFixed(1);
        p.style.cssText = [
            'position:absolute',
            'width:' + size + 'px',
            'height:' + size + 'px',
            'background:rgba(0,87,183,' + (Math.random() * 0.25 + 0.05).toFixed(2) + ')',
            'border-radius:50%',
            'left:' + (Math.random() * 100).toFixed(1) + '%',
            'top:' + (Math.random() * 100).toFixed(1) + '%',
            'animation:particleFloat ' + (Math.random() * 12 + 10).toFixed(1) + 's linear ' + (Math.random() * 6).toFixed(1) + 's infinite',
            'will-change:transform'
        ].join(';');
        container.appendChild(p);
    }
    if (!document.getElementById('particleKF')) {
        var style = document.createElement('style');
        style.id = 'particleKF';
        style.textContent = '@keyframes particleFloat{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:0.8}100%{transform:translateY(-100vh);opacity:0}}';
        document.head.appendChild(style);
    }
}

// ============================================================
// ANNOUNCEMENT BAR
// ============================================================
function initAnnouncementBar() {
    var active = getSetting('announcement_active', 'false');
    var text = getSetting('announcement_bar', '');
    if (active === 'true' && text && text.trim()) {
        var bar = document.getElementById('announcementBar');
        var textEl = document.getElementById('announcementText');
        if (bar && textEl) { textEl.textContent = text; bar.style.display = 'block'; }
    }
}

function closeAnnouncement() {
    var bar = document.getElementById('announcementBar');
    if (bar) bar.style.display = 'none';
}

// ============================================================
// MODAL MANAGEMENT
// ============================================================
function openModal(modalId) {
    var el = document.getElementById(modalId);
    if (!el) return;
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    refreshIcons();
}

function closeModal(modalId) {
    var el = document.getElementById(modalId);
    if (!el) return;
    el.style.display = 'none';
    document.body.style.overflow = '';
}

function closeModalOutside(event, modalId) {
    if (event.target === event.currentTarget) closeModal(modalId);
}

// Global escape key
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var viewer = document.getElementById('imageViewer');
    if (viewer && viewer.style.display === 'flex') { closeImageViewer(); return; }
    document.querySelectorAll('.modal-overlay').forEach(function(m) {
        if (m.style.display === 'flex') { m.style.display = 'none'; document.body.style.overflow = ''; }
    });
    closeMobileMenu();
});

// ============================================================
// IMAGE VIEWER
// ============================================================
function openImageViewer(images, startIndex) {
    if (!images || !images.length) return;
    AppState.currentProjectImages = Array.isArray(images) ? images : [images];
    AppState.currentImageIndex = typeof startIndex === 'number' ? startIndex : 0;
    var viewer = document.getElementById('imageViewer');
    var img = document.getElementById('imageViewerImg');
    if (viewer && img) {
        var src = AppState.currentProjectImages[AppState.currentImageIndex];
        if (src) { img.src = src; viewer.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    }
}

function closeImageViewer() {
    var viewer = document.getElementById('imageViewer');
    if (viewer) { viewer.style.display = 'none'; document.body.style.overflow = ''; }
    AppState.currentProjectImages = [];
    AppState.currentImageIndex = 0;
}

function prevImage() {
    var imgs = AppState.currentProjectImages;
    if (!imgs.length) return;
    AppState.currentImageIndex = (AppState.currentImageIndex - 1 + imgs.length) % imgs.length;
    var img = document.getElementById('imageViewerImg');
    if (img) img.src = imgs[AppState.currentImageIndex];
}

function nextImage() {
    var imgs = AppState.currentProjectImages;
    if (!imgs.length) return;
    AppState.currentImageIndex = (AppState.currentImageIndex + 1) % imgs.length;
    var img = document.getElementById('imageViewerImg');
    if (img) img.src = imgs[AppState.currentImageIndex];
}

document.addEventListener('keydown', function(e) {
    var viewer = document.getElementById('imageViewer');
    if (!viewer || viewer.style.display !== 'flex') return;
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
});

// ============================================================
// DATE & TIME FORMATTING
// ============================================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        var s = String(dateStr);
        var d = new Date(s.length === 10 ? s + 'T00:00:00' : s);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return String(dateStr); }
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    try {
        var s = String(dateStr);
        var d = new Date(s.length === 10 ? s + 'T00:00:00' : s);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return String(dateStr); }
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    try {
        var parts = String(timeStr).split(':');
        if (parts.length < 2) return timeStr;
        var h = parseInt(parts[0], 10);
        var m = parts[1].substring(0, 2);
        var ampm = h >= 12 ? 'PM' : 'AM';
        var h12 = h % 12 || 12;
        return h12 + ':' + m + ' ' + ampm;
    } catch (e) { return String(timeStr); }
}

function formatDateTime(dateStr, timeStr) {
    var d = formatDate(dateStr);
    var t = formatTime(timeStr);
    return t ? d + ' at ' + t : d;
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    try {
        var s = String(dateStr);
        var d = new Date(s.length === 10 ? s + 'T00:00:00' : s);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch (e) { return ''; }
}

function formatTimestamp(ts) {
    if (!ts) return '';
    try {
        var d = new Date(ts);
        if (isNaN(d.getTime())) return String(ts);
        return d.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(ts); }
}

function getRelativeTime(ts) {
    if (!ts) return '';
    try {
        var diff = Date.now() - new Date(ts).getTime();
        var s = Math.floor(diff / 1000);
        var m = Math.floor(s / 60);
        var h = Math.floor(m / 60);
        var d = Math.floor(h / 24);
        if (s < 60) return 'Just now';
        if (m < 60) return m + (m === 1 ? ' minute' : ' minutes') + ' ago';
        if (h < 24) return h + (h === 1 ? ' hour' : ' hours') + ' ago';
        if (d < 7)  return d + (d === 1 ? ' day' : ' days') + ' ago';
        return formatDateShort(ts);
    } catch (e) { return ''; }
}

function isFutureDate(dateStr) {
    if (!dateStr) return false;
    try {
        var today = new Date(); today.setHours(0,0,0,0);
        return new Date(dateStr + 'T00:00:00') >= today;
    } catch (e) { return false; }
}

function isPastDate(dateStr) {
    if (!dateStr) return false;
    try {
        var today = new Date(); today.setHours(0,0,0,0);
        return new Date(dateStr + 'T00:00:00') < today;
    } catch (e) { return false; }
}

function getDaysUntil(dateStr) {
    if (!dateStr) return 0;
    try {
        var today = new Date(); today.setHours(0,0,0,0);
        var d = new Date(dateStr + 'T00:00:00'); d.setHours(0,0,0,0);
        return Math.ceil((d - today) / 86400000);
    } catch (e) { return 0; }
}

function isToday(dateStr) {
    if (!dateStr) return false;
    try { return new Date().toDateString() === new Date(dateStr).toDateString(); }
    catch (e) { return false; }
}

function getCurrentYear() { return new Date().getFullYear(); }
function getCurrentMonth() { return new Date().toLocaleString('en-IN', { month: 'long' }); }

function getMonthYear(dateStr) {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleString('en-IN', { month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
}

// ============================================================
// NUMBER FORMATTING
// ============================================================
function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '') return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    var n = parseInt(num, 10);
    if (isNaN(n)) return '0';
    if (n >= 10000000) return (n / 10000000).toFixed(1) + ' Cr';
    if (n >= 100000)   return (n / 100000).toFixed(1) + ' L';
    if (n >= 1000)     return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('en-IN');
}

function formatNumberFull(num) {
    if (num === null || num === undefined) return '0';
    return parseInt(num, 10).toLocaleString('en-IN');
}

// ============================================================
// STRING HELPERS
// ============================================================
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    var div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function truncateText(text, maxLen) {
    if (!text) return '';
    text = String(text);
    return text.length <= maxLen ? text : text.substring(0, maxLen) + '...';
}

function capitalizeFirst(str) {
    if (!str) return '';
    str = String(str);
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function slugify(text) {
    if (!text) return '';
    return String(text).toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ============================================================
// LABEL FORMATTERS
// ============================================================
function formatAvenueLabel(avenue) {
    if (!avenue) return '';
    var labels = {
        'club_service':         'Club Service',
        'community_service':    'Community Service',
        'professional_service': 'Professional Service',
        'international_service':'International Service',
        'district_priority':    'District Priority Projects'
    };
    return labels[avenue] || String(avenue).replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
}

function formatRoleLabel(role) {
    if (!role) return '';
    var labels = {
        'super_admin':                  'Super Admin',
        'president':                    'President',
        'immediate_past_president':     'Immediate Past President',
        'secretary':                    'Secretary',
        'joint_secretary':              'Joint Secretary',
        'treasurer':                    'Treasurer',
        'club_service_director':        'Club Service Director',
        'community_service_director':   'Community Service Director',
        'professional_service_director':'Professional Service Director',
        'international_service_director':'International Service Director',
        'district_priority_director':   'District Priority Director',
        'advisor':                      'Advisor',
        'board_member':                 'Board Member'
    };
    return labels[role] || String(role).replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
}

function formatStatusLabel(status) {
    if (!status) return '';
    return String(status).replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
}

function formatCategoryLabel(cat) {
    if (!cat) return '';
    return String(cat).replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
}

function formatMeetingTypeLabel(type) {
    if (!type) return '';
    var labels = { 'board_meeting': 'Board Meeting', 'general_body_meeting': 'General Body Meeting' };
    return labels[type] || String(type).replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
}

function formatCollaborationType(type) {
    if (!type || type === 'none') return '';
    var labels = { 'rotaract': 'Rotaract Club', 'interact': 'Interact Club', 'rotary': 'Rotary Club', 'ngo': 'NGO', 'others': 'Others' };
    return labels[type] || String(type);
}

function formatPaymentMode(mode) {
    if (!mode) return '-';
    var labels = { 'cash': 'Cash', 'upi': 'UPI', 'bank_transfer': 'Bank Transfer', 'cheque': 'Cheque', 'card': 'Card', 'online': 'Online', 'other': 'Other' };
    return labels[mode] || String(mode);
}

// ============================================================
// FILE UPLOAD HELPERS
// ============================================================
async function uploadFile(bucket, filePath, file) {
    try {
        if (!supabase || !file) throw new Error('Missing supabase or file');

        var processedFile = file;
        if (file.type && file.type.startsWith('image/') && file.size > 500000) {
            try { processedFile = await compressImage(file, 0.75, 1200); }
            catch (ce) { console.warn('Compression failed, using original:', ce); }
        }

        var r = await supabase.storage.from(bucket).upload(filePath, processedFile, { cacheControl: '3600', upsert: true });
        if (r.error) throw r.error;

        var urlData = supabase.storage.from(bucket).getPublicUrl(filePath);
        var publicUrl = urlData.data ? urlData.data.publicUrl : null;

        if (publicUrl) await trackFile(bucket, filePath, file.name, processedFile.size, file.type);
        return publicUrl;
    } catch (err) {
        console.error('uploadFile error:', err);
        showToast('error', 'Upload Failed', err.message || 'File upload failed');
        return null;
    }
}

async function deleteFile(bucket, filePath) {
    try {
        if (!supabase) return false;
        var r = await supabase.storage.from(bucket).remove([filePath]);
        if (r.error) throw r.error;
        await supabase.from('file_tracker').delete().eq('bucket_name', bucket).eq('file_path', filePath);
        return true;
    } catch (err) { console.error('deleteFile error:', err); return false; }
}

async function trackFile(bucket, filePath, fileName, fileSize, mimeType) {
    try {
        if (!supabase) return;
        await supabase.from('file_tracker').insert({
            bucket_name: bucket, file_path: filePath, file_name: fileName || 'unnamed',
            file_size: fileSize || 0, mime_type: mimeType || '',
            uploaded_by: AppState.currentAdmin ? AppState.currentAdmin.id : null
        });
    } catch (e) { console.warn('trackFile error (non-critical):', e); }
}

function compressImage(file, quality, maxWidth) {
    return new Promise(function(resolve, reject) {
        if (!file) { reject(new Error('No file')); return; }
        var reader = new FileReader();
        reader.onerror = function() { reject(new Error('FileReader error')); };
        reader.onload = function(e) {
            var img = new Image();
            img.onerror = function() { reject(new Error('Image load error')); };
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var w = img.width, h = img.height;
                if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                if (h > maxWidth) { w = Math.round(w * maxWidth / h); h = maxWidth; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(function(blob) {
                    if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    else reject(new Error('toBlob failed'));
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function generateFilePath(prefix, fileName) {
    if (!fileName) fileName = 'file.jpg';
    var ext = fileName.split('.').pop().toLowerCase();
    var allowed = ['jpg','jpeg','png','gif','webp','pdf','docx','xlsx'];
    if (!allowed.includes(ext)) ext = 'jpg';
    return prefix + '/' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
}

// ============================================================
// PHOTO PREVIEW
// ============================================================
function previewPhoto(input) {
    var preview = document.getElementById('photoPreview');
    var placeholder = document.getElementById('photoPlaceholder');
    if (!input || !input.files || !input.files[0]) return;
    var file = input.files[0];
    if (file.size > 5 * 1024 * 1024) { showToast('error', 'Too Large', 'Maximum file size is 5MB'); input.value = ''; return; }
    if (!file.type.startsWith('image/')) { showToast('error', 'Invalid', 'Please select an image file'); input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function(e) {
        if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
        if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// ============================================================
// PASSWORD VISIBILITY
// ============================================================
function togglePasswordVisibility(inputId, btn) {
    var input = document.getElementById(inputId);
    if (!input || !btn) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i data-lucide="eye-off"></i>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<i data-lucide="eye"></i>';
    }
    refreshIcons();
}

// ============================================================
// ACTIVITY LOG
// ============================================================
async function logActivity(action, entityType, entityId, details) {
    try {
        if (!supabase || !action) return;
        var entry = { action: String(action), entity_type: entityType || null, entity_id: entityId || null, details: details || null };
        if (AppState.currentAdmin && AppState.currentAdmin.id) entry.admin_id = AppState.currentAdmin.id;
        await supabase.from('activity_log').insert(entry);
    } catch (e) { console.warn('logActivity error (non-critical):', e); }
}

// ============================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================
function hasFullAccess() {
    if (!AppState.currentAdmin) return false;
    return ['super_admin','advisor','president','immediate_past_president'].indexOf(AppState.currentAdmin.role) !== -1;
}

function isSuperAdmin() {
    return !!(AppState.currentAdmin && AppState.currentAdmin.role === 'super_admin');
}

function isAdvisor() {
    return !!(AppState.currentAdmin && AppState.currentAdmin.role === 'advisor');
}

function isPresident() {
    return !!(AppState.currentAdmin && ['president','super_admin','advisor'].indexOf(AppState.currentAdmin.role) !== -1);
}

function isIPP() {
    return !!(AppState.currentAdmin && ['immediate_past_president','president','super_admin','advisor'].indexOf(AppState.currentAdmin.role) !== -1);
}

function isSecretary() {
    return !!(AppState.currentAdmin && ['secretary','joint_secretary','president','super_admin','advisor'].indexOf(AppState.currentAdmin.role) !== -1);
}

function isTreasurer() {
    return !!(AppState.currentAdmin && ['treasurer','president','secretary','super_admin','advisor'].indexOf(AppState.currentAdmin.role) !== -1);
}

function canApproveProjects() {
    return !!(AppState.currentAdmin && ['president','super_admin','advisor'].indexOf(AppState.currentAdmin.role) !== -1);
}

function canDownloadReports() {
    return !!(AppState.currentAdmin && ['secretary','joint_secretary','president','immediate_past_president','super_admin','advisor'].indexOf(AppState.currentAdmin.role) !== -1);
}

function canDownloadAttendance() {
    return !!(AppState.currentAdmin && ['president','secretary','joint_secretary','immediate_past_president','super_admin','advisor'].indexOf(AppState.currentAdmin.role) !== -1);
}

function getDirectorAvenue(role) {
    var map = {
        'club_service_director':         'club_service',
        'community_service_director':    'community_service',
        'professional_service_director': 'professional_service',
        'international_service_director':'international_service',
        'district_priority_director':    'district_priority'
    };
    return map[role] || null;
}

function canAccessPage(page) {
    if (!AppState.currentAdmin) return false;
    if (hasFullAccess()) return true;
    var role = AppState.currentAdmin.role;
    var pageAccess = {
        'dashboard':    ['secretary','joint_secretary','treasurer','club_service_director','community_service_director','professional_service_director','international_service_director','district_priority_director','board_member'],
        'events':       ['secretary','joint_secretary','club_service_director','community_service_director','professional_service_director','international_service_director','district_priority_director'],
        'meetings':     ['secretary','joint_secretary'],
        'reports':      ['secretary','joint_secretary','club_service_director','community_service_director','professional_service_director','international_service_director','district_priority_director'],
        'treasury':     ['treasurer','secretary'],
        'members':      ['secretary','joint_secretary'],
        'applications': ['secretary','joint_secretary'],
        'presidents':   ['secretary'],
        'secretaries':  ['secretary'],
        'trainers':     ['secretary'],
        'newsletters':  ['secretary','joint_secretary'],
        'settings':     [],
        'statistics':   [],
        'benefits':     [],
        'admins':       [],
        'mails':        ['secretary'],
        'activitylog':  ['secretary'],
        'storage':      []
    };
    return ((pageAccess[page] || []).indexOf(role) !== -1);
}

function updateAdminSidebarVisibility() {
    if (!AppState.currentAdmin) return;
    document.querySelectorAll('.admin-nav-link[data-page]').forEach(function(link) {
        var page = link.getAttribute('data-page');
        link.style.display = (canAccessPage(page) || hasFullAccess()) ? '' : 'none';
    });
}

// ============================================================
// SOCIAL LINKS
// ============================================================
function initSocialLinks() {
    var map = {
        'socialInsta': 'instagram_url', 'socialFb': 'facebook_url',
        'socialLi': 'linkedin_url', 'socialTw': 'twitter_url', 'socialYt': 'youtube_url',
        'mobInsta': 'instagram_url', 'mobFb': 'facebook_url',
        'mobLi': 'linkedin_url', 'mobYt': 'youtube_url',
        'ftInsta': 'instagram_url', 'ftFb': 'facebook_url',
        'ftLi': 'linkedin_url', 'ftYt': 'youtube_url'
    };
    Object.keys(map).forEach(function(elId) {
        var el = document.getElementById(elId);
        if (el) el.href = getSetting(map[elId], '#') || '#';
    });
}

// ============================================================
// CALENDAR HELPERS (Safe - no Invalid time value)
// ============================================================
function buildSafeDateTime(dateStr, timeStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    var t = (timeStr && /^\d{2}:\d{2}/.test(timeStr)) ? timeStr.substring(0, 5) : '09:00';
    try {
        var d = new Date(dateStr + 'T' + t + ':00');
        return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
}

function generateGoogleCalendarLink(ev) {
    if (!ev || !ev.date) return '#';
    try {
        var s = buildSafeDateTime(ev.date, ev.start_time);
        if (!s) return '#';
        var e = buildSafeDateTime(ev.date, ev.end_time);
        if (!e || e <= s) e = new Date(s.getTime() + 7200000);
        function fmt(d) {
            return d.getUTCFullYear() +
                String(d.getUTCMonth() + 1).padStart(2, '0') +
                String(d.getUTCDate()).padStart(2, '0') + 'T' +
                String(d.getUTCHours()).padStart(2, '0') +
                String(d.getUTCMinutes()).padStart(2, '0') + '00Z';
        }
        return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
            action: 'TEMPLATE', text: ev.title || 'Event',
            dates: fmt(s) + '/' + fmt(e),
            details: ev.description || '',
            location: ev.venue || 'Coimbatore, Tamil Nadu'
        }).toString();
    } catch (e) { return '#'; }
}

function generateICSFile(ev) {
    if (!ev || !ev.date) return '';
    try {
        var s = buildSafeDateTime(ev.date, ev.start_time);
        if (!s) return '';
        var e = buildSafeDateTime(ev.date, ev.end_time);
        if (!e || e <= s) e = new Date(s.getTime() + 7200000);
        function fmt(d) {
            return d.getUTCFullYear() +
                String(d.getUTCMonth() + 1).padStart(2, '0') +
                String(d.getUTCDate()).padStart(2, '0') + 'T' +
                String(d.getUTCHours()).padStart(2, '0') +
                String(d.getUTCMinutes()).padStart(2, '0') +
                String(d.getUTCSeconds()).padStart(2, '0') + 'Z';
        }
        return [
            'BEGIN:VCALENDAR', 'VERSION:2.0',
            'PRODID:-//Rotaract Club of Coimbatore Unity//Events//EN',
            'BEGIN:VEVENT',
            'DTSTART:' + fmt(s), 'DTEND:' + fmt(e),
            'SUMMARY:' + (ev.title || 'Event'),
            'DESCRIPTION:' + ((ev.description || '').replace(/\n/g, '\\n')),
            'LOCATION:' + (ev.venue || 'Coimbatore, Tamil Nadu'),
            'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n');
    } catch (e) { return ''; }
}

function downloadICSFile(ev) {
    var ics = generateICSFile(ev);
    if (!ics) { showToast('error', 'Error', 'Could not generate calendar file'); return; }
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var fn = (typeof slugify === 'function' ? slugify(ev.title || 'event') : 'event') + '.ics';
    if (window.saveAs) { saveAs(blob, fn); showToast('success', 'Downloaded', 'Calendar file ready'); }
}

// ============================================================
// DEBOUNCE & THROTTLE
// ============================================================
function debounce(func, wait) {
    var timeout;
    return function() {
        var ctx = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() { func.apply(ctx, args); }, wait);
    };
}

function throttle(func, limit) {
    var last = 0;
    return function() {
        var now = Date.now();
        if (now - last >= limit) { last = now; return func.apply(this, arguments); }
    };
}

// ============================================================
// COUNTER ANIMATION
// ============================================================
function animateCounter(el, target, duration) {
    if (!el) return;
    if (!duration) duration = 2000;
    var start = null, targetNum = parseInt(target, 10) || 0;
    function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatNumber(Math.floor(eased * targetNum));
        if (progress < 1) window.requestAnimationFrame(step);
        else el.textContent = formatNumber(targetNum);
    }
    window.requestAnimationFrame(step);
}

// ============================================================
// SWEETALERT HELPERS
// ============================================================
async function confirmAction(title, text, confirmText) {
    if (!window.Swal) return window.confirm((title || '') + '\n\n' + (text || ''));
    var r = await Swal.fire({
        title: title || 'Confirm',
        text: text || 'Are you sure?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0057b7',
        cancelButtonColor: '#6b7280',
        confirmButtonText: confirmText || 'Yes, proceed',
        cancelButtonText: 'Cancel',
        background: AppState.theme === 'dark' ? '#1a1a36' : '#ffffff',
        color: AppState.theme === 'dark' ? '#f0f0f5' : '#1a1a2e',
        fontFamily: 'Poppins, sans-serif'
    });
    return r.isConfirmed;
}

async function showAlert(title, text, icon) {
    if (!window.Swal) { alert((title || '') + ': ' + (text || '')); return; }
    await Swal.fire({
        title: title || 'Notice',
        text: text || '',
        icon: icon || 'info',
        confirmButtonColor: '#0057b7',
        background: AppState.theme === 'dark' ? '#1a1a36' : '#ffffff',
        color: AppState.theme === 'dark' ? '#f0f0f5' : '#1a1a2e',
        fontFamily: 'Poppins, sans-serif'
    });
}

// ============================================================
// VALIDATION
// ============================================================
function validateEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function validatePhone(phone) {
    if (!phone) return false;
    return /^[\+]?[\d\s\-\(\)]{7,15}$/.test(String(phone).replace(/\s/g, ''));
}

function validatePasswordStrength(pw) {
    if (!pw || pw.length < 8) return false;
    return /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw);
}

function getPasswordStrength(pw) {
    if (!pw) return { strength: 0, label: 'None', color: '#6b7280' };
    var score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    var levels = [
        { strength:0, label:'Very Weak',  color:'#ef4444' },
        { strength:1, label:'Weak',       color:'#ef4444' },
        { strength:2, label:'Fair',       color:'#f59e0b' },
        { strength:3, label:'Good',       color:'#f59e0b' },
        { strength:4, label:'Strong',     color:'#10b981' },
        { strength:5, label:'Very Strong',color:'#10b981' },
        { strength:6, label:'Excellent',  color:'#0057b7' }
    ];
    return levels[Math.min(score, 6)];
}

// ============================================================
// DATA FETCH WRAPPER
// ============================================================
async function fetchData(table, options) {
    options = options || {};
    try {
        if (!supabase) throw new Error('Supabase not initialized');
        var q = supabase.from(table).select(options.select || '*');
        if (options.eq)    Object.keys(options.eq).forEach(function(c) { q = q.eq(c, options.eq[c]); });
        if (options.neq)   Object.keys(options.neq).forEach(function(c) { q = q.neq(c, options.neq[c]); });
        if (options.in)    Object.keys(options.in).forEach(function(c) { q = q.in(c, options.in[c]); });
        if (options.gte)   Object.keys(options.gte).forEach(function(c) { q = q.gte(c, options.gte[c]); });
        if (options.lte)   Object.keys(options.lte).forEach(function(c) { q = q.lte(c, options.lte[c]); });
        if (options.like)  Object.keys(options.like).forEach(function(c) { q = q.ilike(c, '%' + options.like[c] + '%'); });
        if (options.order) q = q.order(options.order[0], { ascending: options.order[1] === 'asc' });
        if (options.limit) q = q.limit(options.limit);
        var r = await q;
        if (r.error) throw r.error;
        return r.data || [];
    } catch (err) {
        console.error('fetchData error [' + table + ']:', err);
        return [];
    }
}

async function insertData(table, data) {
    try {
        if (!supabase) throw new Error('Supabase not initialized');
        var r = await supabase.from(table).insert(data).select();
        if (r.error) throw r.error;
        return r.data;
    } catch (err) {
        console.error('insertData error [' + table + ']:', err);
        showToast('error', 'Save Failed', err.message || 'Could not save data');
        return null;
    }
}

async function updateData(table, id, data) {
    try {
        if (!supabase) throw new Error('Supabase not initialized');
        var r = await supabase.from(table).update(data).eq('id', id).select();
        if (r.error) throw r.error;
        return r.data;
    } catch (err) {
        console.error('updateData error [' + table + ']:', err);
        showToast('error', 'Update Failed', err.message || 'Could not update data');
        return null;
    }
}

async function deleteData(table, id) {
    try {
        if (!supabase) throw new Error('Supabase not initialized');
        var r = await supabase.from(table).delete().eq('id', id);
        if (r.error) throw r.error;
        return true;
    } catch (err) {
        console.error('deleteData error [' + table + ']:', err);
        showToast('error', 'Delete Failed', err.message || 'Could not delete record');
        return false;
    }
}

// ============================================================
// IMAGE / AVATAR HELPERS
// ============================================================
function getDefaultAvatar(name) {
    var initials = String(name || '?').split(' ').map(function(w) { return w[0] || ''; }).join('').substring(0, 2).toUpperCase();
    return 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
        '<rect fill="#0057b7" width="100" height="100" rx="50"/>' +
        '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" ' +
        'font-family="Poppins,Arial,sans-serif" font-size="36" font-weight="600">' + initials + '</text>' +
        '</svg>'
    );
}

function getMemberPhotoOrDefault(member) {
    if (!member) return getDefaultAvatar('?');
    if (member.photo_url && String(member.photo_url).startsWith('http')) return member.photo_url;
    return getDefaultAvatar(member.full_name || member.name || '?');
}

// ============================================================
// CLIPBOARD
// ============================================================
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        showToast('success', 'Copied', 'Text copied to clipboard');
    } catch (e) { showToast('error', 'Copy Failed', 'Could not copy to clipboard'); }
}

// ============================================================
// PRINT HELPER
// ============================================================
function printElement(elementId) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var w = window.open('', '_blank', 'width=800,height=600');
    if (!w) { showToast('error', 'Print Failed', 'Popup blocked. Please allow popups.'); return; }
    w.document.write([
        '<!DOCTYPE html><html><head>',
        '<title>Rotaract Club of Coimbatore Unity</title>',
        '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">',
        '<style>body{font-family:Poppins,sans-serif;padding:24px;color:#1a1a2e;}',
        'table{width:100%;border-collapse:collapse;}th,td{padding:8px 12px;border:1px solid #ddd;text-align:left;font-size:12px;}',
        'th{background:#f0f2fa;font-weight:600;}h1,h2,h3{color:#0057b7;}</style>',
        '</head><body>',
        '<h2>Rotaract Club of Coimbatore Unity</h2>',
        '<p style="font-size:12px;color:#666;margin-bottom:16px;">Family of Rotary Club of Coimbatore East | Rotary International District 3206</p>',
        el.innerHTML,
        '</body></html>'
    ].join(''));
    w.document.close();
    setTimeout(function() { w.print(); }, 500);
}

// ============================================================
// URL HELPERS
// ============================================================
function getUrlParam(param) {
    try { return new URLSearchParams(window.location.search).get(param); }
    catch (e) { return null; }
}

function setUrlParam(param, value) {
    try {
        var url = new URL(window.location.href);
        url.searchParams.set(param, value);
        window.history.replaceState({}, '', url.toString());
    } catch (e) {}
}

// ============================================================
// BIRTHDAY HELPERS
// ============================================================
function isBirthdayToday(dob) {
    if (!dob) return false;
    try {
        var today = new Date();
        var b = new Date(dob);
        return today.getMonth() === b.getMonth() && today.getDate() === b.getDate();
    } catch (e) { return false; }
}

function getUpcomingBirthdays(members, days) {
    if (!days) days = 30;
    if (!members || !members.length) return [];
    var today = new Date(); today.setHours(0,0,0,0);
    return members
        .filter(function(m) { return m.date_of_birth && m.is_active; })
        .map(function(m) {
            try {
                var dob = new Date(m.date_of_birth);
                var next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
                if (next < today) next.setFullYear(today.getFullYear() + 1);
                var daysUntil = Math.ceil((next - today) / 86400000);
                return Object.assign({}, m, { nextBirthday: next, daysUntil: daysUntil });
            } catch (e) { return null; }
        })
        .filter(function(m) { return m && m.daysUntil >= 0 && m.daysUntil <= days; })
        .sort(function(a, b) { return a.daysUntil - b.daysUntil; });
}

// ============================================================
// MEMBER EMAIL HELPERS (used by meetings.js, treasury.js, mail.js)
// ============================================================
async function getAllMemberEmails(boardOnly) {
    try {
        if (!supabase) return [];
        var q = supabase.from('members').select('email, full_name').eq('is_active', true);
        if (boardOnly === true) q = q.eq('is_board_member', true);
        var r = await q;
        if (r.error) throw r.error;
        return (r.data || []).filter(function(m) { return m.email && validateEmail(m.email); });
    } catch (err) { console.error('getAllMemberEmails error:', err); return []; }
}

async function getBoardMemberEmails() {
    return getAllMemberEmails(true);
}

// ============================================================
// CSV EXPORT
// ============================================================
function exportToCSV(data, fileName) {
    if (!data || !data.length) { showToast('info', 'No Data', 'Nothing to export'); return; }
    var headers = Object.keys(data[0]);
    var rows = [headers.join(',')];
    data.forEach(function(row) {
        rows.push(headers.map(function(h) {
            var val = String(row[h] !== null && row[h] !== undefined ? row[h] : '');
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                val = '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
        }).join(','));
    });
    var blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    if (window.saveAs) saveAs(blob, fileName || 'export.csv');
}

// ============================================================
// ERROR BOUNDARY
// ============================================================
window.addEventListener('error', function(e) {
    console.error('Global JS Error:', { message: e.message, source: e.filename, line: e.lineno, col: e.colno });
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
});

// ============================================================
// AUTO-INITIALIZE
// ============================================================
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initTheme();
            refreshIcons();
        });
    } else {
        initTheme();
        refreshIcons();
    }
})();

console.log('%c utils.js loaded ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');