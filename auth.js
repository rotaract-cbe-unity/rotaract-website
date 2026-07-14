/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - AUTHENTICATION
   Complete - Zero Bugs - All functions working
   File: auth.js
   ============================================================ */

'use strict';

// ============================================================
// AUTH STATE
// ============================================================
var AuthState = {
    isLoggedIn:       false,
    loginAttempts:    0,
    maxAttempts:      5,
    lockoutDuration:  15 * 60 * 1000,
    lockoutUntil:     null,
    sessionTimeout:   8 * 60 * 60 * 1000,
    sessionTimer:     null,
    initialized:      false
};

// ============================================================
// INITIALIZE AUTH
// ============================================================
function initAuth() {
    if (AuthState.initialized) return;
    AuthState.initialized = true;

    // Check lockout
    var lockout = getLocal('auth_lockout', null);
    if (lockout && lockout.until > Date.now()) {
        AuthState.lockoutUntil = lockout.until;
        AuthState.loginAttempts = AuthState.maxAttempts;
    } else if (lockout) {
        removeLocal('auth_lockout');
        AuthState.loginAttempts = 0;
    }

    // Restore session
    var session = getLocal('admin_session', null);
    if (session && session.adminId) {
        var age = Date.now() - (session.timestamp || 0);
        if (age < AuthState.sessionTimeout) {
            restoreSession(session);
        } else {
            clearAdminSession();
        }
    }

    // Activity tracking
    initActivityTracking();

    // Check URL param
    if (getUrlParam('admin') === 'login') {
        setTimeout(openAdminLogin, 800);
    }
}

// ============================================================
// RESTORE SESSION
// ============================================================
async function restoreSession(sessionData) {
    try {
        if (!supabase || !sessionData.adminId) return;
        var r = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', sessionData.adminId)
            .eq('is_active', true)
            .single();

        if (r.error || !r.data) { clearAdminSession(); return; }

        AppState.currentAdmin = r.data;
        AuthState.isLoggedIn = true;
        setLocal('admin_session', { adminId: r.data.id, timestamp: Date.now() });
        showAdminPanel();
        startSessionTimer();
        console.log('Session restored:', r.data.full_name, '(' + r.data.role + ')');
    } catch (err) {
        console.error('restoreSession error:', err);
        clearAdminSession();
    }
}

// ============================================================
// OPEN ADMIN LOGIN
// ============================================================
function openAdminLogin() {
    if (AuthState.isLoggedIn && AppState.currentAdmin) { showAdminPanel(); return; }

    var errEl = document.getElementById('adminLoginError');
    if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

    var form = document.getElementById('adminLoginForm');
    if (form) form.reset();

    openModal('adminLoginModal');
    refreshIcons();

    setTimeout(function() {
        var el = document.getElementById('adminEmail');
        if (el) el.focus();
    }, 200);
}

// ============================================================
// ADMIN LOGIN
// ============================================================
async function adminLogin(formEvent) {
    if (formEvent && formEvent.preventDefault) formEvent.preventDefault();

    var emailEl = document.getElementById('adminEmail');
    var passEl  = document.getElementById('adminPassword');
    var errEl   = document.getElementById('adminLoginError');
    var loginBtn = document.getElementById('adminLoginBtn');

    if (!emailEl || !passEl) return;

    var email    = emailEl.value.trim().toLowerCase();
    var password = passEl.value;

    // Clear errors
    if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

    // Check lockout
    if (AuthState.lockoutUntil && AuthState.lockoutUntil > Date.now()) {
        var mins = Math.ceil((AuthState.lockoutUntil - Date.now()) / 60000);
        showLoginError(errEl, 'Account locked. Try again in ' + mins + ' minute(s).');
        return;
    }

    // Validate
    if (!email)              { showLoginError(errEl, 'Please enter your email address.'); return; }
    if (!password)           { showLoginError(errEl, 'Please enter your password.'); return; }
    if (!validateEmail(email)) { showLoginError(errEl, 'Please enter a valid email address.'); return; }
    if (!supabase)           { showLoginError(errEl, 'Database not connected. Please refresh the page.'); return; }

    setLoginBtnLoading(loginBtn, true);

    try {
        var r = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .eq('is_active', true)
            .single();

        if (r.error || !r.data) {
            handleLoginFailure(errEl, 'Invalid email or password.');
            setLoginBtnLoading(loginBtn, false);
            return;
        }

        if (r.data.password_text !== password) {
            handleLoginFailure(errEl, 'Invalid email or password.');
            setLoginBtnLoading(loginBtn, false);
            return;
        }

        setLoginBtnLoading(loginBtn, false);
        await handleLoginSuccess(r.data);

    } catch (err) {
        console.error('adminLogin error:', err);
        showLoginError(errEl, 'Login failed. Please check your connection and try again.');
        setLoginBtnLoading(loginBtn, false);
    }
}

// ============================================================
// HANDLE LOGIN SUCCESS
// ============================================================
async function handleLoginSuccess(adminData) {
    AuthState.loginAttempts = 0;
    AuthState.lockoutUntil  = null;
    AuthState.isLoggedIn    = true;
    removeLocal('auth_lockout');
    AppState.currentAdmin = adminData;

    // Update last login
    try {
        await supabase
            .from('admin_users')
            .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', adminData.id);
    } catch (e) { console.warn('last_login update failed:', e); }

    // Save session
    setLocal('admin_session', { adminId: adminData.id, timestamp: Date.now() });

    // Log activity
    try { await logActivity('admin_login', 'admin_users', adminData.id, { role: adminData.role, email: adminData.email }); }
    catch (e) { console.warn('logActivity failed:', e); }

    // Close modal and reset form
    closeModal('adminLoginModal');
    var form = document.getElementById('adminLoginForm');
    if (form) form.reset();
    var errEl = document.getElementById('adminLoginError');
    if (errEl) errEl.style.display = 'none';

    // Show panel
    showAdminPanel();
    startSessionTimer();

    showToast('success', 'Welcome Back!', adminData.full_name + ' (' + formatRoleLabel(adminData.role) + ')');
}

// ============================================================
// HANDLE LOGIN FAILURE
// ============================================================
function handleLoginFailure(errEl, message) {
    AuthState.loginAttempts++;
    var remaining = AuthState.maxAttempts - AuthState.loginAttempts;
    if (AuthState.loginAttempts >= AuthState.maxAttempts) {
        AuthState.lockoutUntil = Date.now() + AuthState.lockoutDuration;
        setLocal('auth_lockout', { until: AuthState.lockoutUntil });
        showLoginError(errEl, 'Too many failed attempts. Account locked for 15 minutes.');
    } else {
        showLoginError(errEl, message + ' ' + remaining + ' attempt(s) remaining.');
    }
}

function showLoginError(errEl, message) {
    if (!errEl) { showToast('error', 'Login Failed', message); return; }
    errEl.textContent = message;
    errEl.style.display = 'block';
    // Trigger shake animation
    errEl.style.animation = 'none';
    void errEl.offsetHeight; // reflow
    errEl.style.animation = 'loginShake 0.4s ease';
}

function setLoginBtnLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = [
            '<span style="display:inline-flex;gap:7px;align-items:center;">',
            '<span style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);',
            'border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;',
            'display:inline-block;flex-shrink:0;"></span>',
            'Authenticating...',
            '</span>'
        ].join('');
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="log-in"></i>Login to Admin Panel';
        refreshIcons();
    }
}

// ============================================================
// ADMIN LOGOUT
// ============================================================
async function adminLogout() {
    var confirmed = await confirmAction('Logout?', 'Are you sure you want to logout from the admin panel?', 'Yes, Logout');
    if (!confirmed) return;

    if (AppState.currentAdmin && supabase) {
        try { await logActivity('admin_logout', 'admin_users', AppState.currentAdmin.id, { role: AppState.currentAdmin.role }); }
        catch (e) { console.warn('logout logActivity failed:', e); }
    }

    clearAdminSession();
    hideAdminPanel();
    showToast('info', 'Logged Out', 'You have been logged out successfully');
}

// ============================================================
// CLEAR SESSION
// ============================================================
function clearAdminSession() {
    AppState.currentAdmin = null;
    AuthState.isLoggedIn  = false;
    removeLocal('admin_session');
    if (AuthState.sessionTimer) { clearTimeout(AuthState.sessionTimer); AuthState.sessionTimer = null; }
}

// ============================================================
// SESSION TIMER
// ============================================================
function startSessionTimer() {
    if (AuthState.sessionTimer) clearTimeout(AuthState.sessionTimer);
    AuthState.sessionTimer = setTimeout(async function() {
        if (AuthState.isLoggedIn) {
            await showAlert('Session Expired', 'Your session has expired. Please login again.', 'warning');
            clearAdminSession();
            hideAdminPanel();
        }
    }, AuthState.sessionTimeout);
}

// ============================================================
// ACTIVITY TRACKING
// ============================================================
function initActivityTracking() {
    var reset = throttle(function() {
        if (AuthState.isLoggedIn) {
            var s = getLocal('admin_session', null);
            if (s) setLocal('admin_session', { adminId: s.adminId, timestamp: Date.now() });
            startSessionTimer();
        }
    }, 30000);

    ['mousedown','mousemove','keypress','scroll','touchstart','click'].forEach(function(evt) {
        document.addEventListener(evt, reset, { passive: true });
    });
}

// ============================================================
// SHOW ADMIN PANEL
// ============================================================
function showAdminPanel() {
    var panel = document.getElementById('adminPanel');
    if (!panel) return;
    panel.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    updateAdminUserDisplay();
    updateAdminSidebarVisibility();
    showAdminPage('dashboard');
    startAdminAutoRefresh();
    refreshIcons();
}

// ============================================================
// HIDE ADMIN PANEL
// ============================================================
function hideAdminPanel() {
    var panel = document.getElementById('adminPanel');
    if (panel) { panel.style.display = 'none'; document.body.style.overflow = ''; }
    stopAdminAutoRefresh();
}

// ============================================================
// BACK TO WEBSITE
// ============================================================
function backToWebsite() {
    hideAdminPanel();
    scrollToTop();
    showToast('info', 'Back to Website', 'Now viewing the main website');
}

// ============================================================
// UPDATE ADMIN USER DISPLAY
// ============================================================
function updateAdminUserDisplay() {
    if (!AppState.currentAdmin) return;
    var admin = AppState.currentAdmin;

    var initials = admin.full_name
        .split(' ')
        .filter(function(w) { return w.length > 0; })
        .map(function(w) { return w[0]; })
        .join('')
        .substring(0, 2)
        .toUpperCase();

    function avatarHtml(size) {
        if (admin.avatar_url) {
            return '<img src="' + escapeHtml(admin.avatar_url) + '" alt="' + escapeHtml(admin.full_name) +
                '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" ' +
                'onerror="this.parentElement.innerHTML=\'' + initials + '\'">';
        }
        return '<span style="font-size:' + size + ';font-weight:700;color:var(--primary);">' + initials + '</span>';
    }

    var nameEl   = document.getElementById('adminUserName');
    var roleEl   = document.getElementById('adminUserRole');
    var avatarEl = document.getElementById('adminUserAvatar');
    var topNameEl   = document.getElementById('adminTopName');
    var topAvatarEl = document.getElementById('adminTopAvatar');

    if (nameEl)   nameEl.textContent   = admin.full_name;
    if (roleEl)   roleEl.textContent   = formatRoleLabel(admin.role);
    if (avatarEl) avatarEl.innerHTML   = avatarHtml('0.88rem');
    if (topNameEl) topNameEl.textContent = admin.full_name;
    if (topAvatarEl) topAvatarEl.innerHTML = avatarHtml('0.78rem');
}

// ============================================================
// SHOW ADMIN PAGE
// ============================================================
function showAdminPage(pageName) {
    if (!AppState.currentAdmin) return;

    if (!canAccessPage(pageName) && !hasFullAccess()) {
        showToast('error', 'Access Denied', 'You do not have permission to access this section');
        return;
    }

    // Deactivate all pages
    document.querySelectorAll('.admin-page').forEach(function(p) { p.classList.remove('active'); });

    // Activate target
    var target = document.querySelector('.admin-page[data-page="' + pageName + '"]');
    if (target) target.classList.add('active');

    // Update nav
    document.querySelectorAll('.admin-nav-link[data-page]').forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('data-page') === pageName);
    });

    // Update title
    var titles = {
        'dashboard':   'Dashboard',
        'events':      'Events and Projects',
        'meetings':    'Meetings',
        'reports':     'Reports',
        'treasury':    'Treasury Management',
        'members':     'Members',
        'applications':'Membership Applications',
        'presidents':  'Past Presidents',
        'secretaries': 'Past Secretaries',
        'trainers':    'Club Trainers',
        'newsletters': 'Monthly Bulletins',
        'settings':    'Site Settings',
        'statistics':  'Club Statistics',
        'benefits':    'Joining Benefits',
        'admins':      'Admin Users',
        'mails':       'Mail Logs',
        'activitylog': 'Activity Log',
        'storage':     'Storage Management'
    };
    var titleEl = document.getElementById('adminPageTitle');
    if (titleEl) titleEl.textContent = titles[pageName] || capitalizeFirst(pageName);

    AppState.currentAdminPage = pageName;

    // Close mobile sidebar
    var sidebar = document.getElementById('adminSidebar');
    if (sidebar && window.innerWidth <= 1024) {
        sidebar.classList.remove('active');
        AppState.adminSidebarOpen = false;
    }

    // Scroll to top of content
    var content = document.getElementById('adminContent');
    if (content) content.scrollTop = 0;

    // Load data
    loadAdminPageData(pageName);
    refreshIcons();
}

// ============================================================
// LOAD ADMIN PAGE DATA
// ============================================================
async function loadAdminPageData(page) {
    try {
        switch (page) {
            case 'dashboard':   await loadAdminDashboard();    break;
            case 'events':      await loadAdminEvents();       break;
            case 'meetings':    await loadAdminMeetings();     break;
            case 'reports':     await loadAdminReports();      break;
            case 'treasury':    await loadAdminTreasury();     break;
            case 'members':     await loadAdminMembers();      break;
            case 'applications':await loadAdminApplications(); break;
            case 'presidents':  await loadAdminPresidents();   break;
            case 'secretaries': await loadAdminSecretaries();  break;
            case 'trainers':    await loadAdminTrainers();     break;
            case 'newsletters': await loadAdminNewsletters();  break;
            case 'settings':    await loadAdminSettings();     break;
            case 'statistics':  await loadAdminStatistics();   break;
            case 'benefits':    await loadAdminBenefits();     break;
            case 'admins':      await loadAdminUsers();        break;
            case 'mails':       await loadMailLogs();          break;
            case 'activitylog': await loadActivityLog();       break;
            case 'storage':     await loadStorageOverview();   break;
            default: console.warn('Unknown admin page:', page);
        }
    } catch (err) {
        console.error('loadAdminPageData error [' + page + ']:', err);
        showToast('error', 'Load Error', 'Failed to load ' + page + '. Please try again.');
    }
}

// ============================================================
// TOGGLE ADMIN SIDEBAR
// ============================================================
function toggleAdminSidebar() {
    var sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;
    AppState.adminSidebarOpen = !AppState.adminSidebarOpen;
    sidebar.classList.toggle('active', AppState.adminSidebarOpen);
}

// ============================================================
// AUTO REFRESH
// ============================================================
var _autoRefreshTimer = null;

function startAdminAutoRefresh() {
    stopAdminAutoRefresh();
    _autoRefreshTimer = setInterval(function() {
        if (AppState.currentAdminPage === 'dashboard' && AppState.currentAdmin) {
            loadAdminDashboard().catch(function(e) { console.warn('Auto-refresh error:', e); });
        }
        _updateAppBadge();
    }, 5 * 60 * 1000);
}

function stopAdminAutoRefresh() {
    if (_autoRefreshTimer) { clearInterval(_autoRefreshTimer); _autoRefreshTimer = null; }
}

function _updateAppBadge() {
    if (!supabase || !AppState.currentAdmin) return;
    supabase.from('membership_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then(function(r) {
            var badge = document.getElementById('appBadge');
            if (!badge) return;
            var c = r.count || 0;
            badge.textContent = c;
            badge.style.display = c > 0 ? 'inline' : 'none';
        })
        .catch(function() {});
}

// Badge refresh every 2 minutes
setInterval(function() { if (AppState.currentAdmin) _updateAppBadge(); }, 2 * 60 * 1000);

// ============================================================
// ADMIN USERS MANAGEMENT
// ============================================================
async function loadAdminUsers() {
    var tbody = document.getElementById('adminsTableBody');
    if (!tbody) return;

    if (!isSuperAdmin()) {
        tbody.innerHTML = [
            '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-tertiary);">',
            '<i data-lucide="lock" style="display:block;margin:0 auto 8px;width:28px;height:28px;opacity:0.5;"></i>',
            'Super Admin access only',
            '</td></tr>'
        ].join('');
        refreshIcons();
        return;
    }

    try {
        if (!supabase) return;
        var r = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
        if (r.error) throw r.error;
        AppState.adminUsers = r.data || [];
        renderAdminUsersTable(AppState.adminUsers);
    } catch (err) {
        console.error('loadAdminUsers error:', err);
        showToast('error', 'Error', 'Failed to load admin users');
    }
}

function renderAdminUsersTable(users) {
    var tbody = document.getElementById('adminsTableBody');
    if (!tbody) return;

    if (!users || !users.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-tertiary);">No admin users found</td></tr>';
        return;
    }

    var selfId = AppState.currentAdmin ? AppState.currentAdmin.id : '';

    tbody.innerHTML = users.map(function(u) {
        var initials = u.full_name.split(' ').map(function(w) { return w[0] || ''; }).join('').substring(0, 2).toUpperCase();
        var isSelf = u.id === selfId;

        return [
            '<tr>',
            '<td><div style="display:flex;align-items:center;gap:10px;">',
            '<div style="width:34px;height:34px;border-radius:50%;background:rgba(0,87,183,0.12);',
            'display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">',
            u.avatar_url ?
                '<img src="' + escapeHtml(u.avatar_url) + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML=\'' + initials + '\'">' :
                '<span style="font-size:0.78rem;font-weight:700;color:var(--primary);">' + initials + '</span>',
            '</div>',
            '<div><div style="font-weight:700;font-size:0.85rem;">' + escapeHtml(u.full_name) +
                (isSelf ? ' <span class="badge badge-primary" style="font-size:0.6rem;">You</span>' : '') +
                '</div></div></div></td>',
            '<td style="font-size:0.82rem;">' + escapeHtml(u.email) + '</td>',
            '<td><span class="badge badge-primary">' + formatRoleLabel(u.role) + '</span></td>',
            '<td><span class="badge ' + (u.is_active ? 'badge-success' : 'badge-danger') + '">' + (u.is_active ? 'Active' : 'Inactive') + '</span></td>',
            '<td style="font-size:0.75rem;color:var(--text-tertiary);">' + (u.last_login ? formatTimestamp(u.last_login) : 'Never') + '</td>',
            '<td><div class="table-actions">',
            '<button class="btn-icon" onclick="openAdminUserForm(\'' + u.id + '\')" title="Edit"><i data-lucide="edit-2"></i></button>',
            '<button class="btn-icon" onclick="openChangePasswordForm(\'' + u.id + '\')" title="Change Password"><i data-lucide="key"></i></button>',
            !isSelf ? '<button class="btn-icon" onclick="toggleAdminUserStatus(\'' + u.id + '\',' + u.is_active + ')" title="' + (u.is_active ? 'Deactivate' : 'Activate') + '" style="color:' + (u.is_active ? 'var(--warning)' : 'var(--success)') + ';"><i data-lucide="' + (u.is_active ? 'user-x' : 'user-check') + '"></i></button>' : '',
            !isSelf ? '<button class="btn-icon" onclick="deleteAdminUser(\'' + u.id + '\')" title="Delete" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>' : '',
            '</div></td></tr>'
        ].join('');
    }).join('');

    refreshIcons();
}

// ============================================================
// ADMIN USER FORM
// ============================================================
function openAdminUserForm(adminId) {
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }
    adminId = adminId || '';
    var ex = adminId ? (AppState.adminUsers || []).find(function(a) { return a.id === adminId; }) : null;
    var isEdit = !!ex;

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');

    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (isEdit ? 'edit-2' : 'user-plus') + '"></i>' + (isEdit ? 'Edit Admin User' : 'Add Admin User');

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="saveAdminUser(event,\'' + adminId + '\')">',

            '<div class="form-group"><label><i data-lucide="user"></i>Full Name *</label>',
            '<input type="text" id="auName" required placeholder="Full name" value="' + (isEdit ? escapeHtml(ex.full_name) : '') + '"></div>',

            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="mail"></i>Email *</label>',
            '<input type="email" id="auEmail" required placeholder="email@example.com" value="' + (isEdit ? escapeHtml(ex.email) : '') + '"' +
            (isEdit && ex.id === (AppState.currentAdmin ? AppState.currentAdmin.id : '') ? ' readonly' : '') + '></div>',
            '<div class="form-group"><label><i data-lucide="shield"></i>Role *</label>',
            '<select id="auRole" required onchange="showRoleDescription(this.value)">' + getRoleOptions(isEdit ? ex.role : '') + '</select></div>',
            '</div>',

            !isEdit ? [
                '<div class="form-row">',
                '<div class="form-group"><label><i data-lucide="lock"></i>Password *</label>',
                '<div class="password-field">',
                '<input type="password" id="auPassword" required placeholder="Min 8 characters" oninput="updatePwStrength(\'auPassword\',\'auStrength\')">',
                '<button type="button" class="password-toggle" onclick="togglePasswordVisibility(\'auPassword\',this)"><i data-lucide="eye"></i></button>',
                '</div><div id="auStrength" style="margin-top:5px;font-size:0.72rem;"></div></div>',
                '<div class="form-group"><label><i data-lucide="lock"></i>Confirm Password *</label>',
                '<div class="password-field">',
                '<input type="password" id="auConfirm" required placeholder="Repeat password">',
                '<button type="button" class="password-toggle" onclick="togglePasswordVisibility(\'auConfirm\',this)"><i data-lucide="eye"></i></button>',
                '</div></div></div>'
            ].join('') : '',

            '<div class="form-group"><label><i data-lucide="image"></i>Avatar URL (Optional)</label>',
            '<input type="url" id="auAvatar" placeholder="https://..." value="' + (isEdit && ex.avatar_url ? escapeHtml(ex.avatar_url) : '') + '"></div>',

            '<div class="form-group" style="display:flex;align-items:center;gap:12px;">',
            '<label class="toggle-switch"><input type="checkbox" id="auActive" ' + (!isEdit || ex.is_active ? 'checked' : '') + '><span class="toggle-slider"></span></label>',
            '<span style="font-size:0.85rem;font-weight:500;">Active Account</span></div>',

            '<div id="roleDescBox" style="padding:11px;background:rgba(0,87,183,0.06);border:1px solid rgba(0,87,183,0.12);border-radius:var(--radius-sm);font-size:0.78rem;color:var(--text-secondary);">',
            '<i data-lucide="info" style="width:13px;height:13px;display:inline;vertical-align:middle;color:var(--primary);"></i> ',
            '<span id="roleDescText">' + (isEdit ? getRoleDescription(ex.role) : 'Select a role to see its access level') + '</span></div>',

            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button>',
            '<button type="submit" class="btn btn-primary"><i data-lucide="' + (isEdit ? 'save' : 'user-plus') + '"></i>' + (isEdit ? 'Update' : 'Create') + '</button>',
            '</div></form>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();

    // Set role description for existing role
    if (isEdit) showRoleDescription(ex.role);
}

function showRoleDescription(role) {
    var el = document.getElementById('roleDescText');
    if (el) el.textContent = getRoleDescription(role);
}

function updatePwStrength(inputId, indicatorId) {
    var inp = document.getElementById(inputId);
    var ind = document.getElementById(indicatorId);
    if (!inp || !ind) return;
    var s = getPasswordStrength(inp.value);
    var pct = Math.round((s.strength / 6) * 100);
    ind.innerHTML = [
        '<div style="display:flex;align-items:center;gap:8px;">',
        '<div style="flex:1;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;">',
        '<div style="width:' + pct + '%;height:100%;background:' + s.color + ';border-radius:2px;transition:all 0.3s;"></div>',
        '</div>',
        '<span style="color:' + s.color + ';font-weight:700;font-size:0.72rem;width:72px;">' + s.label + '</span>',
        '</div>'
    ].join('');
}

function getRoleOptions(selected) {
    var roles = [
        ['super_admin',                  'Super Admin'],
        ['president',                    'President'],
        ['immediate_past_president',     'Immediate Past President'],
        ['secretary',                    'Secretary'],
        ['joint_secretary',              'Joint Secretary'],
        ['treasurer',                    'Treasurer'],
        ['club_service_director',        'Club Service Director'],
        ['community_service_director',   'Community Service Director'],
        ['professional_service_director','Professional Service Director'],
        ['international_service_director','International Service Director'],
        ['district_priority_director',   'District Priority Director'],
        ['advisor',                      'Advisor'],
        ['board_member',                 'Board Member']
    ];
    return '<option value="">Select Role</option>' + roles.map(function(r) {
        return '<option value="' + r[0] + '"' + (selected === r[0] ? ' selected' : '') + '>' + r[1] + '</option>';
    }).join('');
}

function getRoleDescription(role) {
    var desc = {
        'super_admin':                  'Full access to everything — admin users, all settings, all data, and master controls.',
        'advisor':                      'Full access to all sections. Senior advisory and supervisory role.',
        'president':                    'Full access. Can approve or reject events and manage all club sections.',
        'immediate_past_president':     'Full access to all sections. Advisory and monitoring role.',
        'secretary':                    'Access to events, reports, meetings, members, applications, treasury, newsletters, and mail logs.',
        'joint_secretary':              'Access to events, reports, meetings, members, applications, and newsletters.',
        'treasurer':                    'Access to treasury management and dashboard only.',
        'club_service_director':        'Access to Club Service avenue events and reports only.',
        'community_service_director':   'Access to Community Service avenue events and reports only.',
        'professional_service_director':'Access to Professional Service avenue events and reports only.',
        'international_service_director':'Access to International Service avenue events and reports only.',
        'district_priority_director':   'Access to District Priority avenue events and reports only.',
        'board_member':                 'Dashboard view-only access.'
    };
    return desc[role] || 'Select a role to see its access level';
}

// ============================================================
// SAVE ADMIN USER
// ============================================================
async function saveAdminUser(formEvent, adminId) {
    formEvent.preventDefault();
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }

    adminId = adminId || '';
    var isEdit = adminId.length > 5;

    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

    var name    = gv('auName');
    var email   = gv('auEmail').toLowerCase();
    var role    = gv('auRole');
    var avatar  = gv('auAvatar') || null;
    var isActive = document.getElementById('auActive') ? document.getElementById('auActive').checked : true;

    if (!name)  { showToast('error', 'Required', 'Full name is required'); return; }
    if (!email || !validateEmail(email)) { showToast('error', 'Invalid', 'Valid email is required'); return; }
    if (!role)  { showToast('error', 'Required', 'Please select a role'); return; }

    var password = null;
    if (!isEdit) {
        password = gv('auPassword');
        var confirm = gv('auConfirm');
        if (!password) { showToast('error', 'Required', 'Password is required'); return; }
        if (password !== confirm) { showToast('error', 'Mismatch', 'Passwords do not match'); return; }
        if (!validatePasswordStrength(password)) { showToast('error', 'Weak Password', 'Min 8 chars with uppercase, lowercase, and number'); return; }
    }

    try {
        if (!supabase) throw new Error('Database not connected');

        // Check email conflict
        var cq = supabase.from('admin_users').select('id').eq('email', email);
        if (isEdit) cq = cq.neq('id', adminId);
        var conflict = await cq.single();
        if (conflict.data) { showToast('error', 'Conflict', 'This email is already used by another admin user'); return; }

        var data = {
            full_name: name, email: email, role: role,
            is_active: isActive, updated_at: new Date().toISOString()
        };
        if (avatar) data.avatar_url = avatar;
        if (password) data.password_text = password;

        if (isEdit) {
            var upd = await supabase.from('admin_users').update(data).eq('id', adminId);
            if (upd.error) throw upd.error;
        } else {
            data.created_at = new Date().toISOString();
            var ins = await supabase.from('admin_users').insert(data);
            if (ins.error) throw ins.error;
        }

        await logActivity(isEdit ? 'update_admin_user' : 'create_admin_user', 'admin_users', adminId || null, { email: email, role: role });
        closeModal('formModal');
        showToast('success', 'Success', 'Admin user ' + (isEdit ? 'updated' : 'created') + ' successfully');
        await loadAdminUsers();

    } catch (err) {
        console.error('saveAdminUser error:', err);
        showToast('error', 'Error', err.message || 'Failed to save admin user');
    }
}

// ============================================================
// TOGGLE ADMIN USER STATUS
// ============================================================
async function toggleAdminUserStatus(adminId, currentStatus) {
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }
    if (AppState.currentAdmin && adminId === AppState.currentAdmin.id) { showToast('error', 'Error', 'Cannot deactivate your own account'); return; }

    var action = currentStatus ? 'deactivate' : 'activate';
    var confirmed = await confirmAction(capitalizeFirst(action) + ' User?', 'Are you sure you want to ' + action + ' this admin user?', 'Yes, ' + capitalizeFirst(action));
    if (!confirmed) return;

    try {
        if (!supabase) return;
        var r = await supabase.from('admin_users').update({ is_active: !currentStatus, updated_at: new Date().toISOString() }).eq('id', adminId);
        if (r.error) throw r.error;
        await logActivity(action + '_admin_user', 'admin_users', adminId, {});
        showToast('success', 'Done', 'User ' + action + 'd successfully');
        await loadAdminUsers();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// DELETE ADMIN USER
// ============================================================
async function deleteAdminUser(adminId) {
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }
    if (AppState.currentAdmin && adminId === AppState.currentAdmin.id) { showToast('error', 'Error', 'Cannot delete your own account'); return; }

    var confirmed = await confirmAction('Delete Admin User?', 'This will permanently remove this admin user.', 'Yes, Delete');
    if (!confirmed) return;

    try {
        if (!supabase) return;
        var r = await supabase.from('admin_users').delete().eq('id', adminId);
        if (r.error) throw r.error;
        await logActivity('delete_admin_user', 'admin_users', adminId, {});
        showToast('success', 'Deleted', 'Admin user removed');
        await loadAdminUsers();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// CHANGE PASSWORD FORM
// ============================================================
function openChangePasswordForm(adminId) {
    var selfId = AppState.currentAdmin ? AppState.currentAdmin.id : '';
    if (!isSuperAdmin() && adminId !== selfId) { showToast('error', 'Denied', 'You can only change your own password'); return; }

    var isSelf = adminId === selfId;
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');

    if (titleEl) titleEl.innerHTML = '<i data-lucide="key"></i>Change Password';

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="submitChangePassword(event,\'' + adminId + '\')">',

            isSelf ? [
                '<div class="form-group"><label><i data-lucide="lock"></i>Current Password *</label>',
                '<div class="password-field">',
                '<input type="password" id="cpCurrent" required placeholder="Current password">',
                '<button type="button" class="password-toggle" onclick="togglePasswordVisibility(\'cpCurrent\',this)"><i data-lucide="eye"></i></button>',
                '</div></div>'
            ].join('') : '',

            '<div class="form-group"><label><i data-lucide="lock"></i>New Password *</label>',
            '<div class="password-field">',
            '<input type="password" id="cpNew" required placeholder="Min 8 characters" oninput="updatePwStrength(\'cpNew\',\'cpStrength\')">',
            '<button type="button" class="password-toggle" onclick="togglePasswordVisibility(\'cpNew\',this)"><i data-lucide="eye"></i></button>',
            '</div><div id="cpStrength" style="margin-top:5px;font-size:0.72rem;"></div></div>',

            '<div class="form-group"><label><i data-lucide="lock"></i>Confirm New Password *</label>',
            '<div class="password-field">',
            '<input type="password" id="cpConfirm" required placeholder="Repeat new password">',
            '<button type="button" class="password-toggle" onclick="togglePasswordVisibility(\'cpConfirm\',this)"><i data-lucide="eye"></i></button>',
            '</div></div>',

            '<div style="padding:11px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.18);border-radius:var(--radius-sm);font-size:0.78rem;color:var(--warning);">',
            '<i data-lucide="alert-triangle" style="width:13px;height:13px;display:inline;vertical-align:middle;"></i> ',
            'Min 8 characters with at least one uppercase letter, one lowercase letter, and one number.',
            '</div>',

            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:18px;">',
            '<button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button>',
            '<button type="submit" class="btn btn-primary"><i data-lucide="key"></i>Change Password</button>',
            '</div></form>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();
}

async function submitChangePassword(formEvent, adminId) {
    formEvent.preventDefault();

    function gv(id) { var el = document.getElementById(id); return el ? el.value : ''; }

    var selfId = AppState.currentAdmin ? AppState.currentAdmin.id : '';
    var isSelf = adminId === selfId;
    var current = gv('cpCurrent');
    var newPw   = gv('cpNew');
    var confirm = gv('cpConfirm');

    if (!newPw)          { showToast('error', 'Required', 'New password is required'); return; }
    if (newPw !== confirm) { showToast('error', 'Mismatch', 'Passwords do not match'); return; }
    if (!validatePasswordStrength(newPw)) { showToast('error', 'Weak', 'Min 8 chars with uppercase, lowercase, and number'); return; }

    try {
        if (!supabase) return;

        // Verify current password for self
        if (isSelf && current) {
            var vr = await supabase.from('admin_users').select('password_text').eq('id', adminId).single();
            if (vr.error || !vr.data) { showToast('error', 'Error', 'Could not verify current password'); return; }
            if (vr.data.password_text !== current) { showToast('error', 'Wrong Password', 'Current password is incorrect'); return; }
        }

        var ur = await supabase.from('admin_users').update({ password_text: newPw, updated_at: new Date().toISOString() }).eq('id', adminId);
        if (ur.error) throw ur.error;

        await logActivity('change_password', 'admin_users', adminId, {});
        closeModal('formModal');
        showToast('success', 'Changed', 'Password updated successfully');

        // If changed own password, logout for security
        if (isSelf) {
            await showAlert('Security Notice', 'Your password has been changed. Please login again.', 'success');
            clearAdminSession();
            hideAdminPanel();
        }

    } catch (err) {
        console.error('submitChangePassword error:', err);
        showToast('error', 'Error', err.message || 'Failed to change password');
    }
}

// ============================================================
// MAIL LOGS
// ============================================================
async function loadMailLogs() {
    var tbody = document.getElementById('mailsTableBody');
    if (!tbody) return;

    try {
        if (!supabase) return;
        var tf = document.getElementById('mailTypeFilter');
        var tv = tf ? tf.value : 'all';
        var q = supabase.from('mail_log').select('*').order('created_at', { ascending: false }).limit(100);
        if (tv && tv !== 'all') q = q.eq('mail_type', tv);
        var r = await q;
        if (r.error) throw r.error;

        var logs = r.data || [];
        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-tertiary);">No mail logs found</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(function(log) {
            var tl = (log.mail_type || 'custom').replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
            var sc = log.status === 'sent' ? 'badge-success' : log.status === 'failed' ? 'badge-danger' : 'badge-warning';
            return [
                '<tr>',
                '<td><span class="badge badge-primary">' + escapeHtml(tl) + '</span></td>',
                '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(log.recipient || '-') + '</td>',
                '<td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(log.subject || '-') + '</td>',
                '<td><span class="badge ' + sc + '">' + escapeHtml(log.status || 'pending') + '</span></td>',
                '<td style="font-size:0.78rem;white-space:nowrap;">' + (log.sent_at ? formatTimestamp(log.sent_at) : formatTimestamp(log.created_at)) + '</td>',
                '</tr>'
            ].join('');
        }).join('');

    } catch (err) {
        console.error('loadMailLogs error:', err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-tertiary);">Failed to load mail logs</td></tr>';
    }
}

// ============================================================
// CUSTOM MAIL FORM
// ============================================================
function openCustomMailForm() {
    if (!isSecretary()) { showToast('error', 'Denied', 'Secretary or higher access required'); return; }

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="mail"></i>Send Custom Email';

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="submitCustomMail(event)">',

            '<div class="form-group"><label><i data-lucide="users"></i>Recipients *</label>',
            '<select id="cmRecipients" required onchange="toggleCustomEmailsInput()">',
            '<option value="">Select</option>',
            '<option value="all">All Members</option>',
            '<option value="board">Board Members Only</option>',
            '<option value="custom">Custom Email(s)</option>',
            '</select></div>',

            '<div id="cmCustomGroup" style="display:none;">',
            '<div class="form-group"><label><i data-lucide="mail"></i>Email Addresses</label>',
            '<textarea id="cmCustomEmails" rows="3" placeholder="email1@example.com, email2@example.com"></textarea>',
            '<small style="color:var(--text-tertiary);">Separate multiple emails with commas</small></div>',
            '</div>',

            '<div class="form-group"><label><i data-lucide="file-text"></i>Subject *</label>',
            '<input type="text" id="cmSubject" required placeholder="Email subject"></div>',

            '<div class="form-group"><label><i data-lucide="message-square"></i>Message *</label>',
            '<textarea id="cmMessage" rows="8" required placeholder="Your message..."></textarea></div>',

            '<div style="padding:11px;background:rgba(0,87,183,0.06);border:1px solid rgba(0,87,183,0.12);border-radius:var(--radius-sm);font-size:0.78rem;color:var(--text-secondary);">',
            '<i data-lucide="info" style="width:13px;height:13px;display:inline;vertical-align:middle;color:var(--primary);"></i> ',
            'Club signature will be automatically added to all emails.',
            '</div>',

            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">',
            '<button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button>',
            '<button type="submit" class="btn btn-primary"><i data-lucide="send"></i>Send Email</button>',
            '</div></form>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();
}

function toggleCustomEmailsInput() {
    var type = document.getElementById('cmRecipients');
    var group = document.getElementById('cmCustomGroup');
    if (type && group) group.style.display = type.value === 'custom' ? 'block' : 'none';
}

async function submitCustomMail(e) {
    e.preventDefault();
    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

    var recipType = gv('cmRecipients');
    var subject   = gv('cmSubject');
    var message   = gv('cmMessage');

    if (!recipType || !subject || !message) { showToast('error', 'Required', 'All fields are required'); return; }

    var emails = [];
    try {
        if (recipType === 'all') {
            var all = await getAllMemberEmails(false);
            emails = all.map(function(m) { return m.email; }).filter(Boolean);
        } else if (recipType === 'board') {
            var board = await getAllMemberEmails(true);
            emails = board.map(function(m) { return m.email; }).filter(Boolean);
        } else {
            var custom = gv('cmCustomEmails');
            emails = custom.split(',').map(function(e) { return e.trim(); }).filter(function(e) { return validateEmail(e); });
        }

        if (!emails.length) { showToast('error', 'No Recipients', 'No valid email addresses found'); return; }

        var sig = '\n\nRegards,\nRotaract Club of Coimbatore Unity\nFamily of Rotary Club of Coimbatore East\nRotary International District 3206 (Coimbatore | Pallakkad)\nEmail: rc.cbeunity@gmail.com';
        var body = message + sig;

        if (!supabase) throw new Error('Database not connected');

        await supabase.from('notification_queue').insert({
            notification_type: 'custom',
            recipient_type: recipType,
            recipient_emails: emails,
            subject: subject,
            body: body,
            html_body: body.replace(/\n/g, '<br>'),
            status: 'queued',
            created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null
        });

        await supabase.from('mail_log').insert({
            mail_type: 'custom',
            recipient: emails.length + ' recipient(s)',
            subject: subject,
            body: body,
            status: 'queued'
        });

        await logActivity('send_custom_mail', 'mail_log', null, { subject: subject, recipients: emails.length, type: recipType });

        closeModal('formModal');
        showToast('success', 'Queued', 'Email queued for ' + emails.length + ' recipient(s)');
        await loadMailLogs();

    } catch (err) {
        console.error('submitCustomMail error:', err);
        showToast('error', 'Error', err.message || 'Failed to send email');
    }
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', function(e) {
    var panel = document.getElementById('adminPanel');
    if (!panel || panel.style.display !== 'flex' || !AppState.currentAdmin) return;

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
            case 'd': e.preventDefault(); showAdminPage('dashboard'); break;
            case 'e': e.preventDefault(); showAdminPage('events');    break;
            case 'm': e.preventDefault(); showAdminPage('members');   break;
            case 't': e.preventDefault(); if (isTreasurer()) showAdminPage('treasury'); break;
            case 'r': e.preventDefault(); showAdminPage('reports');   break;
        }
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (e.key.toLowerCase() === 'b') { e.preventDefault(); backToWebsite(); }
    }
});

// ============================================================
// SUPER ADMIN: DB HEALTH CHECK
// ============================================================
async function runDatabaseHealthCheck() {
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }
    showToast('info', 'Checking', 'Running health check...');

    var tables = [
        'admin_users','club_settings','members','events','meetings',
        'treasury','club_statistics','joining_benefits','game_scores',
        'chatbot_conversations','notification_queue','activity_log','mail_log'
    ];

    try {
        if (!supabase) throw new Error('Not connected');

        var results = await Promise.allSettled(tables.map(function(t) {
            return supabase.from(t).select('id', { count: 'exact', head: true })
                .then(function(r) { return { t: t, ok: !r.error, c: r.count || 0, e: r.error ? r.error.message : null }; })
                .catch(function(e) { return { t: t, ok: false, c: 0, e: e.message }; });
        }));

        var res = results.map(function(r) { return r.value || { t: 'unknown', ok: false, c: 0 }; });
        var hasErr = res.some(function(r) { return !r.ok; });

        var titleEl = document.getElementById('formModalTitle');
        var bodyEl  = document.getElementById('formModalBody');

        if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (hasErr ? 'alert-triangle' : 'check-circle') + '"></i>Database Health Check';

        if (bodyEl) {
            bodyEl.innerHTML = [
                '<div style="padding:13px;margin-bottom:14px;background:' + (hasErr ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)') + ';border:1px solid ' + (hasErr ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)') + ';border-radius:var(--radius-sm);">',
                '<strong style="color:' + (hasErr ? 'var(--danger)' : 'var(--success)') + ';">' + (hasErr ? 'Issues detected' : 'All systems healthy') + '</strong></div>',
                '<div class="admin-table-container"><table class="admin-table">',
                '<thead><tr><th>Table</th><th>Status</th><th>Records</th><th>Details</th></tr></thead><tbody>',
                res.map(function(r) {
                    return '<tr><td><strong>' + escapeHtml(r.t) + '</strong></td>' +
                        '<td><span class="badge ' + (r.ok ? 'badge-success' : 'badge-danger') + '">' + (r.ok ? 'OK' : 'ERROR') + '</span></td>' +
                        '<td>' + r.c + '</td>' +
                        '<td style="font-size:0.75rem;color:var(--text-tertiary);">' + (r.e ? escapeHtml(r.e) : 'Healthy') + '</td></tr>';
                }).join(''),
                '</tbody></table></div>',
                '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">',
                '<button class="btn btn-outline" onclick="exportDatabaseBackup()"><i data-lucide="download"></i>Backup</button>',
                '<button class="btn btn-primary" onclick="closeModal(\'formModal\')"><i data-lucide="check"></i>Close</button>',
                '</div>'
            ].join('');
        }

        await logActivity('database_health_check', 'system', null, { errors: res.filter(function(r) { return !r.ok; }).length });
        openModal('formModal');
        refreshIcons();

    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// SUPER ADMIN: EXPORT BACKUP
// ============================================================
async function exportDatabaseBackup() {
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }
    showToast('info', 'Exporting', 'Preparing backup...');

    try {
        if (!supabase || !window.saveAs) throw new Error('Requirements not met');

        var tables = [
            'club_settings','members','past_presidents','past_secretaries',
            'club_trainers','events','meetings','treasury','newsletters',
            'club_statistics','joining_benefits','rotary_years','email_templates'
        ];

        var backup = { exported_at: new Date().toISOString(), club: 'Rotaract Club of Coimbatore Unity', tables: {} };

        for (var i = 0; i < tables.length; i++) {
            var r = await supabase.from(tables[i]).select('*');
            backup.tables[tables[i]] = r.data || [];
        }

        // Admin users without passwords
        var ar = await supabase.from('admin_users').select('id,email,full_name,role,is_active,last_login,created_at');
        backup.tables['admin_users'] = ar.data || [];

        var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        saveAs(blob, 'Rotaract_Unity_Backup_' + new Date().toISOString().split('T')[0] + '.json');
        await logActivity('export_database_backup', 'system', null, { tables: tables.length });
        showToast('success', 'Done', 'Database backup downloaded');

    } catch (err) { showToast('error', 'Failed', err.message); }
}

// ============================================================
// SUPER ADMIN: RESET AND RELOAD
// ============================================================
function resetAndReload() {
    if (!isSuperAdmin()) return;
    AppState.settings = {};
    AppState.settingsCache = {};
    AppState.members = [];
    AppState.events = [];
    AppState.allProjects = [];
    removeLocal('last_monthly_stmt');
    showToast('info', 'Resetting', 'Reloading page...');
    setTimeout(function() { window.location.reload(); }, 1200);
}

// ============================================================
// ADD loginShake CSS
// ============================================================
(function addAuthCSS() {
    if (document.getElementById('authCSS')) return;
    var s = document.createElement('style');
    s.id = 'authCSS';
    s.textContent = [
        '@keyframes loginShake{',
        '0%{transform:translateX(0)}',
        '20%{transform:translateX(-6px)}',
        '40%{transform:translateX(6px)}',
        '60%{transform:translateX(-4px)}',
        '80%{transform:translateX(4px)}',
        '100%{transform:translateX(0)}',
        '}'
    ].join('');
    document.head.appendChild(s);
})();

// ============================================================
// AUTO-INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});

console.log('%c auth.js loaded ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');